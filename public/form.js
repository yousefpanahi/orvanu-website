(() => {
  'use strict';

  /* ------------------------------------------------------------------
     Project inquiry form.
     Front-end validation mirrors the server rules in functions/api/inquiry.js —
     the server is always the authority; this just gives fast, clear feedback.
     ------------------------------------------------------------------ */

  // Cloudflare Turnstile site key (public). Leave empty to render no widget;
  // the server requires a valid token whenever TURNSTILE_SECRET_KEY is set.
  const TURNSTILE_SITEKEY = '0x4AAAAAAGPeAoSwkEhoDlOT';
  // Turnstile is hostname-locked in the Cloudflare dashboard. Load the widget
  // only on authorized hosts; anywhere else (localhost, previews) it can only
  // render an error box. The Vercel mirror proxies /api/inquiry to the
  // Cloudflare backend, so the widget must render there too. Add future custom
  // domains here AND to the widget's hostname list in the Cloudflare dashboard.
  const TURNSTILE_HOSTS = ['orvanu.pages.dev', 'orvanu.vercel.app'];

  const form = document.querySelector('#inquiry-form');
  if (!form) return;

  const status = document.querySelector('#inquiry-status');
  const successPanel = document.querySelector('#inquiry-success');
  const successRef = document.querySelector('#inquiry-ref');
  const submitButton = document.querySelector('#inquiry-submit');
  const fileInput = document.querySelector('#f-files');
  const fileList = document.querySelector('#file-list');
  const dropZone = document.querySelector('#file-drop');

  const MAX_FILES = 3;
  const MAX_FILE_BYTES = 10 * 1024 * 1024;
  const ALLOWED_EXTENSIONS = ['pdf', 'docx', 'xlsx', 'png', 'jpg', 'jpeg'];

  /** @type {File[]} */
  let selectedFiles = [];

  const fields = ['name', 'email', 'description'];

  const showError = (name, message) => {
    const input = form.elements[name];
    const error = document.querySelector(`#f-${name}-error`);
    if (input) input.setAttribute('aria-invalid', 'true');
    if (error) {
      error.textContent = message;
      error.hidden = false;
    }
  };

  const clearError = (name) => {
    const input = form.elements[name];
    const error = document.querySelector(`#f-${name}-error`);
    if (input) input.removeAttribute('aria-invalid');
    if (error) {
      error.hidden = true;
      error.textContent = '';
    }
  };

  const setStatus = (message, isError) => {
    if (!status) return;
    status.textContent = message;
    status.hidden = !message;
    status.classList.toggle('is-error', Boolean(isError));
  };

  const isEmail = (value) =>
    /^[^\s@"(),:;<>[\\\]]+@[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?)+$/.test(value) &&
    value.length <= 254;

  const validateField = (name) => {
    const value = String(form.elements[name].value || '').trim();
    if (name === 'name') {
      if (value.length < 2) return 'Please tell us your name.';
      if (value.length > 120) return 'That name is too long — 120 characters max.';
    }
    if (name === 'email') {
      if (!value) return 'Please add an email address so we can reply.';
      if (!isEmail(value)) return 'That email address does not look valid.';
    }
    if (name === 'description') {
      if (value.length < 20) return 'Please describe your project in a little more detail (at least 20 characters).';
      if (value.length > 8000) return 'That description is very long — 8,000 characters max.';
    }
    return '';
  };

  const validateAll = () => {
    let firstInvalid = null;
    for (const name of fields) {
      const message = validateField(name);
      if (message) {
        showError(name, message);
        if (!firstInvalid) firstInvalid = form.elements[name];
      } else {
        clearError(name);
      }
    }
    return firstInvalid;
  };

  for (const name of fields) {
    const input = form.elements[name];
    if (!input) continue;
    input.addEventListener('blur', () => {
      const message = validateField(name);
      if (message) showError(name, message);
      else clearError(name);
    });
    input.addEventListener('input', () => {
      if (input.getAttribute('aria-invalid') === 'true' && !validateField(name)) clearError(name);
    });
  }

  /* ---------------- Attachments ---------------- */

  const formatSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const showFileError = (message) => {
    const error = document.querySelector('#f-files-error');
    if (error) {
      error.textContent = message;
      error.hidden = false;
    }
    if (dropZone) dropZone.classList.add('has-error');
  };

  const clearFileError = () => {
    const error = document.querySelector('#f-files-error');
    if (error) {
      error.hidden = true;
      error.textContent = '';
    }
    if (dropZone) dropZone.classList.remove('has-error');
  };

  const renderFiles = () => {
    if (!fileList) return;
    fileList.replaceChildren();
    selectedFiles.forEach((file, index) => {
      const item = document.createElement('li');

      const name = document.createElement('span');
      name.className = 'fname';
      name.textContent = file.name;

      const size = document.createElement('span');
      size.className = 'fsize';
      size.textContent = formatSize(file.size);

      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'file-remove';
      remove.setAttribute('aria-label', `Remove ${file.name}`);
      remove.textContent = '×';
      remove.addEventListener('click', () => {
        selectedFiles = selectedFiles.filter((_, i) => i !== index);
        renderFiles();
        clearFileError();
        fileInput?.focus();
      });

      item.append(name, size, remove);
      fileList.appendChild(item);
    });
  };

  const addFiles = (incoming) => {
    clearFileError();
    const accepted = [];
    for (const file of incoming) {
      const ext = (file.name.split('.').pop() || '').toLowerCase();
      if (!ALLOWED_EXTENSIONS.includes(ext)) {
        showFileError(`“${file.name}” is not an accepted file type. Use PDF, DOCX, XLSX, PNG or JPG.`);
        continue;
      }
      if (file.size > MAX_FILE_BYTES) {
        showFileError(`“${file.name}” is larger than 10 MB.`);
        continue;
      }
      const duplicate = selectedFiles.some((f) => f.name === file.name && f.size === file.size);
      if (duplicate) continue;
      accepted.push(file);
    }

    const combined = [...selectedFiles, ...accepted];
    if (combined.length > MAX_FILES) {
      showFileError(`Please attach at most ${MAX_FILES} files.`);
      selectedFiles = combined.slice(0, MAX_FILES);
    } else {
      selectedFiles = combined;
    }
    renderFiles();
  };

  fileInput?.addEventListener('change', () => {
    if (fileInput.files && fileInput.files.length) addFiles([...fileInput.files]);
    // Let the user pick the same file again after removing it.
    fileInput.value = '';
  });

  ['dragenter', 'dragover'].forEach((event) => {
    dropZone?.addEventListener(event, (e) => {
      e.preventDefault();
      dropZone.classList.add('is-dragover');
    });
  });
  ['dragleave', 'drop'].forEach((event) => {
    dropZone?.addEventListener(event, (e) => {
      e.preventDefault();
      dropZone.classList.remove('is-dragover');
    });
  });
  dropZone?.addEventListener('drop', (e) => {
    if (e.dataTransfer?.files?.length) addFiles([...e.dataTransfer.files]);
  });

  /* ---------------- Turnstile ---------------- */

  let turnstileWidget = null;

  if (TURNSTILE_SITEKEY && TURNSTILE_HOSTS.includes(location.hostname)) {
    const script = document.createElement('script');
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    script.async = true;
    script.defer = true;
    script.addEventListener('load', () => {
      const slot = document.querySelector('#turnstile-slot');
      if (slot && window.turnstile) {
        turnstileWidget = window.turnstile.render(slot, { sitekey: TURNSTILE_SITEKEY, theme: 'light' });
      }
    });
    document.head.appendChild(script);
  }

  /* ---------------- Submit ---------------- */

  const setLoading = (loading) => {
    if (!submitButton) return;
    submitButton.disabled = loading;
    submitButton.textContent = loading ? 'Sending…' : 'Schedule a Discovery Call';
  };

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    setStatus('');

    const firstInvalid = validateAll();
    if (firstInvalid) {
      firstInvalid.focus();
      setStatus('Please check the highlighted fields and try again.', true);
      return;
    }

    const payload = new FormData();
    payload.append('name', String(form.elements.name.value).trim());
    payload.append('email', String(form.elements.email.value).trim());
    payload.append('service', form.elements.service.value);
    payload.append('description', String(form.elements.description.value).trim());
    payload.append('website', String(form.elements.website.value || ''));
    selectedFiles.forEach((file) => payload.append('files', file, file.name));

    const token = document.querySelector('input[name="cf-turnstile-response"]');
    if (token && token.value) payload.append('cf-turnstile-response', token.value);

    setLoading(true);
    try {
      const response = await fetch(form.action, { method: 'POST', body: payload, headers: { accept: 'application/json' } });
      let result = {};
      try {
        result = await response.json();
      } catch {
        /* non-JSON error page */
      }

      if (!response.ok || !result.ok) {
        if (result && result.fields) {
          for (const [name, message] of Object.entries(result.fields)) showError(name, message);
          const first = Object.keys(result.fields)[0];
          if (first && form.elements[first]) form.elements[first].focus();
        }
        const fallback =
          response.status === 413
            ? 'That submission is too large. Please reduce the attachments.'
            : 'Something went wrong sending your inquiry. Please try again, or email orvanutech@gmail.com.';
        // A proxy or host can answer with an error object rather than a plain
        // message, which would render as "[object Object]". Only trust strings.
        setStatus(typeof result.error === 'string' && result.error ? result.error : fallback, true);
        if (window.turnstile && turnstileWidget !== null) window.turnstile.reset(turnstileWidget);
        return;
      }

      if (successRef && result.id) successRef.textContent = result.id;
      selectedFiles = [];
      renderFiles();
      clearFileError();
      [...form.querySelectorAll('.field-error')].forEach((error) => {
        error.hidden = true;
        error.textContent = '';
      });
      form.hidden = true;
      if (successPanel) {
        successPanel.hidden = false;
        successPanel.setAttribute('tabindex', '-1');
        successPanel.focus();
      }
    } catch {
      setStatus('We could not reach the server. Check your connection and try again, or email orvanutech@gmail.com.', true);
    } finally {
      setLoading(false);
    }
  });
})();
