# Design: Simplify the public inquiry form

Date: 24 November 2026

## Intent

Remove four optional fields from the public project inquiry form: WhatsApp
number, company name, estimated project budget and project timeline. Keep the
form shorter while preserving every field still needed to start a conversation.

## In scope

- `public/index.html`: remove the four labelled controls from `#inquiry-form`
  and remove the WhatsApp sentence from the privacy note.
- `public/form.js`: remove phone validation, remove the four `payload.append`
  calls, and leave the remaining validation and submission flow unchanged.

## Out of scope / preserved

- `functions/api/inquiry.js`, `schema.sql`, `public/admin/` remain unchanged so
  older inquiries still render and the server still accepts historical fields.
- Keep full name, email address, service needed, project description and
  attachments.
- Keep the honeypot (`website`), Turnstile slot, submit button, success panel,
  status messages, required markers, field grid and responsive CSS unchanged.
- Do not touch the Approach section's `.timeline` steps or any portfolio copy.
- No new claims about clients, contributions or results.

## Outcome

A shorter public form with unchanged visual language and behaviour, verified
statically and in the browser, then deployed after the owner's explicit
`go on production` approval.
