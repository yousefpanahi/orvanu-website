# ORVANU website — one-time GitHub setup (no Git installation required)
#
# What this script does:
#   1. Creates the public repository "orvanu-website" on github.com/yousefpanahi
#   2. Pushes all project files (website + deployment workflow) as the initial commit
#
# What you need before running it:
#   A GitHub personal access token, entered securely at the prompt (it is never
#   shown, saved, or sent anywhere except github.com).
#
#   Recommended: a FINE-GRAINED token (https://github.com/settings/personal-access-tokens/new)
#     - Repository access: All repositories
#     - Permissions: Administration (Read and write), Contents (Read and write)
#   Classic tokens also work: scope "repo" + "workflow" is enough.
#
# Run from the project root:
#   powershell -ExecutionPolicy Bypass -File tools\setup-repo.ps1

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$owner = 'yousefpanahi'
$repo = 'orvanu-website'

Write-Host "ORVANU website - GitHub setup" -ForegroundColor Cyan
Write-Host "Repository: $owner/$repo" -ForegroundColor Cyan
Write-Host ""

if ($env:GITHUB_TOKEN) {
    $token = $env:GITHUB_TOKEN
    Write-Host "Using token from the GITHUB_TOKEN environment variable."
} else {
    $secure = Read-Host "Paste your GitHub personal access token (input is hidden)" -AsSecureString
    $token = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
        [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure))
}
if (-not $token) { throw "No token provided." }

$headers = @{
    Authorization = "Bearer $token"
    Accept = 'application/vnd.github+json'
    'X-GitHub-Api-Version' = '2022-11-28'
}
$token = $null  # keep only in memory for headers below

# --- 1. Create the repository (ignored if it already exists) ---
try {
    $body = @{ name = $repo; private = $false; auto_init = $false; description = 'ORVANU company website - Software & Product Engineering' } | ConvertTo-Json
    Invoke-RestMethod -Method Post -Uri "https://api.github.com/user/repos" -Headers $headers -Body $body -ContentType 'application/json' | Out-Null
    Write-Host "Repository $owner/$repo created."
} catch {
    if ($_.Exception.Response.StatusCode.value__ -eq 422) {
        Write-Host "Repository $owner/$repo already exists - will add a commit to it."
    } else { throw }
}

# --- 2b. Ensure the repository has an initial commit (required by the Git Data API) ---
$headSha = $null
try {
    $headSha = (Invoke-RestMethod -Uri "https://api.github.com/repos/$owner/$repo/git/ref/heads/main" -Headers $headers).object.sha
} catch { }
if (-not $headSha) {
    Write-Host "Repository is empty - creating the initial commit..."
    $seed = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes("# orvanu-website`n"))
    $seedBody = @{ message = 'Initialize repository'; content = $seed } | ConvertTo-Json
    Invoke-RestMethod -Method Put -Uri "https://api.github.com/repos/$owner/$repo/contents/README.md" -Headers $headers -Body $seedBody -ContentType 'application/json; charset=utf-8' | Out-Null
    $headSha = (Invoke-RestMethod -Uri "https://api.github.com/repos/$owner/$repo/git/ref/heads/main" -Headers $headers).object.sha
}

# --- 3. Collect files (respect .gitignore-style exclusions) ---
$binaryExts = @('.png', '.ico', '.jpg', '.jpeg', '.gif', '.webp', '.woff', '.woff2')
$excludeDirs = @('\.git\\', '_inspect\\', 'node_modules\\')
$files = Get-ChildItem -Path $root -Recurse -File | Where-Object {
    $rel = $_.FullName.Substring($root.Length + 1)
    -not ($excludeDirs | Where-Object { $rel -match $_ }) -and $rel -ne 'repos.json'
}
if (-not $files) { throw "No files found in $root" }
Write-Host "Uploading $($files.Count) files..."

# --- 3. Create blobs ---
$treeEntries = @()
foreach ($f in $files) {
    $rel = $f.FullName.Substring($root.Length + 1) -replace '\\', '/'
    $bytes = [System.IO.File]::ReadAllBytes($f.FullName)
    $isBinary = $binaryExts -contains $f.Extension.ToLower()
    if ($isBinary) {
        $b64 = [Convert]::ToBase64String($bytes)
        $blobBody = @{ content = $b64; encoding = 'base64' } | ConvertTo-Json
    } else {
        $text = [System.Text.Encoding]::UTF8.GetString($bytes)
        $blobBody = (@{ content = $text; encoding = 'utf-8' } | ConvertTo-Json -Depth 5)
    }
    $blob = Invoke-RestMethod -Method Post -Uri "https://api.github.com/repos/$owner/$repo/git/blobs" -Headers $headers -Body $blobBody -ContentType 'application/json; charset=utf-8'
    $treeEntries += @{ path = $rel; mode = '100644'; type = 'blob'; sha = $blob.sha }
    Write-Host "  blob: $rel"
}

# --- 4. Create tree, commit, and the main branch ---
$treeBody = @{ tree = $treeEntries } | ConvertTo-Json -Depth 6
$tree = Invoke-RestMethod -Method Post -Uri "https://api.github.com/repos/$owner/$repo/git/trees" -Headers $headers -Body $treeBody -ContentType 'application/json; charset=utf-8'

$commitBody = @{
    message = 'Initial commit: ORVANU website source and Cloudflare Pages deployment workflow'
    tree = $tree.sha
    parents = @($headSha)
} | ConvertTo-Json
$commit = Invoke-RestMethod -Method Post -Uri "https://api.github.com/repos/$owner/$repo/git/commits" -Headers $headers -Body $commitBody -ContentType 'application/json; charset=utf-8'

try {
    $refBody = @{ ref = 'refs/heads/main'; sha = $commit.sha } | ConvertTo-Json
    Invoke-RestMethod -Method Post -Uri "https://api.github.com/repos/$owner/$repo/git/refs" -Headers $headers -Body $refBody -ContentType 'application/json' | Out-Null
} catch {
    if ($_.Exception.Response.StatusCode.value__ -eq 422) {
        # Branch exists: fast-forward main to the new commit
        $patchBody = @{ sha = $commit.sha; force = $false } | ConvertTo-Json
        Invoke-RestMethod -Method Patch -Uri "https://api.github.com/repos/$owner/$repo/git/refs/heads/main" -Headers $headers -Body $patchBody -ContentType 'application/json' | Out-Null
    } else { throw }
}

# --- 5. Make sure the default branch is main ---
Invoke-RestMethod -Method Patch -Uri "https://api.github.com/repos/$owner/$repo" -Headers $headers -Body (@{ default_branch = 'main' } | ConvertTo-Json) -ContentType 'application/json' | Out-Null

Write-Host ""
Write-Host "Done! Repository: https://github.com/$owner/$repo" -ForegroundColor Green
Write-Host ""
Write-Host "NEXT STEPS (one-time, ~10 minutes):" -ForegroundColor Yellow
Write-Host "  1. Create a Cloudflare API token:"
Write-Host "     - Open https://dash.cloudflare.com/profile/api-tokens (use VPN if the dashboard is blocked on your network)"
Write-Host "     - 'Create Token' -> template 'Edit Cloudflare Pages' -> Continue -> Create"
Write-Host "     - Copy the token (shown once)"
Write-Host "     - Find your Account ID: dashboard right-hand sidebar (also on any Pages project page)"
Write-Host "  2. Add the two secrets to GitHub:"
Write-Host "     - Open https://github.com/$owner/$repo/settings/secrets/actions"
Write-Host "     - 'New repository secret' -> name CLOUDFLARE_API_TOKEN, value = token"
Write-Host "     - 'New repository secret' -> name CLOUDFLARE_ACCOUNT_ID, value = account id"
Write-Host "  3. Confirm the Cloudflare Pages project name is 'orvanu' (dashboard -> Pages)."
Write-Host "     If it differs, update '--project-name=orvanu' in .github/workflows/deploy.yml."
Write-Host "  4. Trigger the first deploy: https://github.com/$owner/$repo/actions -> 'Deploy to Cloudflare Pages' -> 'Run workflow'"
Write-Host "  5. Check the workflow log ends with 'Deployment verified'."
