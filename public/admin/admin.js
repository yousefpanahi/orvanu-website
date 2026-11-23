/* ORVANU inquiry dashboard.
 *
 * Vanilla JS, no framework, no third-party requests. Every piece of text that
 * comes from the server is written with textContent — never innerHTML — so a
 * hostile inquiry (or a hostile name field) cannot inject markup.
 */
(() => {
  'use strict';

  const STATUSES = ['New', 'Contacted', 'In Discussion', 'Won', 'Lost'];
  const PILL_CLASS = { 'In Discussion': 'Discussion' };

  const state = {
    email: '',
    q: '',
    status: '',
    sort: 'newest',
    page: 1,
    pages: 1,
    selected: '',
  };

  const $ = (id) => document.getElementById(id);

  const el = (tag, className, textContent) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (textContent !== undefined) node.textContent = textContent;
    return node;
  };

  const loginView = $('login-view');
  const dashView = $('dash-view');
  const sessionBox = $('session-box');
  const sessionEmail = $('session-email');
  const loginStatus = $('login-status');
  const listStatus = $('list-status');

  const setStatus = (node, message, isError) => {
    if (!node) return;
    node.textContent = message || '';
    node.hidden = !message;
    node.classList.toggle('error', Boolean(isError));
  };

  /* ------------------------------- transport ------------------------------ */

  const api = async (path, options = {}) => {
    const headers = { accept: 'application/json', ...(options.headers || {}) };
    if (options.method && options.method !== 'GET') headers['x-orvanu-admin'] = '1';

    let response;
    try {
      response = await fetch(path, { ...options, headers });
    } catch {
      return { status: 0, data: { ok: false, error: 'Network error. Check your connection.' } };
    }

    let data = {};
    try {
      data = await response.json();
    } catch {
      /* non-JSON */
    }
    if (response.status === 401 && state.email) showLogin('Your session ended. Sign in again.');
    return { status: response.status, data, retryAfter: Number(response.headers.get('retry-after') || 0) };
  };

  /* --------------------------------- auth -------------------------------- */

  const showLogin = (message) => {
    state.email = '';
    dashView.hidden = true;
    sessionBox.hidden = true;
    loginView.hidden = false;
    $('email-form').hidden = false;
    $('code-form').hidden = true;
    $('code-form').reset();
    setStatus(loginStatus, message || '', Boolean(message));
    $('login-email').focus();
  };

  const showDash = (email) => {
    state.email = email;
    sessionEmail.textContent = email;
    sessionBox.hidden = false;
    loginView.hidden = true;
    dashView.hidden = false;
    setStatus(loginStatus, '');
    loadList();
  };

  const formatDate = (iso) => {
    if (!iso) return '—';
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return iso;
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(date);
  };

  $('email-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const email = $('login-email').value.trim();
    if (!email) return setStatus(loginStatus, 'Enter your email address.', true);

    const button = $('email-submit');
    button.disabled = true;
    button.textContent = 'Sending…';
    const { status, data, retryAfter } = await api('/api/admin/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    button.disabled = false;
    button.textContent = 'Send sign-in code';

    if (status === 200) {
      $('email-form').hidden = true;
      $('code-form').hidden = false;
      $('login-code').value = '';
      $('login-code').focus();
      setStatus(loginStatus, data.message || 'If that address is authorized, a code is on its way.');
    } else if (status === 429) {
      setStatus(loginStatus, data.error || `Too many attempts. Try again in ${Math.ceil(retryAfter / 60)} minutes.`, true);
    } else {
      setStatus(loginStatus, data.error || 'Something went wrong. Try again.', true);
    }
  });

  $('code-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const email = $('login-email').value.trim();
    const code = $('login-code').value.replace(/\D/g, '');
    if (code.length !== 6) return setStatus(loginStatus, 'Enter the six-digit code.', true);

    const button = $('code-submit');
    button.disabled = true;
    button.textContent = 'Verifying…';
    const { status, data } = await api('/api/admin/verify', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email, code }),
    });
    button.disabled = false;
    button.textContent = 'Sign in';

    if (status === 200) {
      $('email-form').reset();
      showDash(data.email || email);
    } else {
      setStatus(loginStatus, data.error || 'That code was not accepted.', true);
      $('login-code').select();
    }
  });

  $('code-resend').addEventListener('click', () => {
    $('code-form').hidden = true;
    $('email-form').hidden = false;
    setStatus(loginStatus, '');
    $('login-email').focus();
  });

  $('signout').addEventListener('click', async () => {
    await api('/api/admin/session', { method: 'POST' });
    showLogin('You are signed out.');
  });

  /* -------------------------------- tabs --------------------------------- */

  const renderTabs = (counts) => {
    const tabs = $('tabs');
    tabs.replaceChildren();

    const make = (label, value, count) => {
      const button = el('button', 'tab', label);
      button.type = 'button';
      button.setAttribute('aria-pressed', String(state.status === value));
      button.append(el('span', 'count', String(count ?? 0)));
      button.addEventListener('click', () => {
        state.status = value;
        state.page = 1;
        loadList();
      });
      return button;
    };

    tabs.append(make('All', '', counts.all));
    for (const status of STATUSES) tabs.append(make(status, status, counts[status]));
  };

  /* --------------------------------- list -------------------------------- */

  let searchTimer = null;
  $('search').addEventListener('input', (event) => {
    const value = event.target.value;
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      state.q = value.trim();
      state.page = 1;
      loadList();
    }, 300);
  });

  $('sort').addEventListener('change', (event) => {
    state.sort = event.target.value;
    state.page = 1;
    loadList();
  });

  $('refresh').addEventListener('click', () => loadList());

  $('prev').addEventListener('click', () => {
    if (state.page > 1) {
      state.page--;
      loadList();
    }
  });

  $('next').addEventListener('click', () => {
    if (state.page < state.pages) {
      state.page++;
      loadList();
    }
  });

  const renderList = (items) => {
    const list = $('list');
    list.replaceChildren();

    if (!items.length) {
      list.append(el('div', 'empty', state.q || state.status ? 'No inquiries match this view.' : 'No inquiries yet. Submissions from the website appear here.'));
      return;
    }

    for (const item of items) {
      const row = el('button', 'row');
      row.type = 'button';
      row.setAttribute('aria-current', String(state.selected === item.id));

      const top = el('div', 'row-top');
      top.append(el('span', 'row-name', item.name || 'Unnamed'));
      top.append(el('span', `pill ${PILL_CLASS[item.status] || item.status}`, item.status));

      const meta = el('div', 'row-meta', [item.company, item.email].filter(Boolean).join(' · '));
      const foot = el('div', 'row-foot');
      foot.append(el('span', '', formatDate(item.created_at)));
      if (item.service) foot.append(el('span', '', item.service));
      if (item.budget) foot.append(el('span', '', item.budget));
      if (item.attachment_count) {
        foot.append(el('span', '', `${item.attachment_count} file${item.attachment_count === 1 ? '' : 's'}`));
      }

      row.append(top, meta, foot);
      row.addEventListener('click', () => openInquiry(item.id));
      list.append(row);
    }
  };

  const loadList = async () => {
    setStatus(listStatus, 'Loading…');
    const params = new URLSearchParams({ sort: state.sort, page: String(state.page), per: '25' });
    if (state.q) params.set('q', state.q);
    if (state.status) params.set('status', state.status);

    const { status, data } = await api(`/api/admin/inquiries?${params}`);
    if (status !== 200) {
      setStatus(listStatus, data.error || 'Could not load inquiries.', true);
      return;
    }

    state.pages = data.pages;
    renderTabs(data.counts);
    renderList(data.items);

    $('pager').hidden = data.pages <= 1;
    $('page-label').textContent = `Page ${data.page} of ${data.pages} · ${data.total} inquiry${data.total === 1 ? '' : 'ies'}`;
    $('prev').disabled = data.page <= 1;
    $('next').disabled = data.page >= data.pages;

    setStatus(listStatus, data.total === 0 ? '' : '');
  };

  /* -------------------------------- detail ------------------------------- */

  const detailNode = $('detail');

  const openInquiry = async (id) => {
    state.selected = id;
    for (const row of document.querySelectorAll('.row')) row.setAttribute('aria-current', 'false');

    const { status, data } = await api(`/api/admin/inquiry?id=${encodeURIComponent(id)}`);
    if (status !== 200) {
      detailNode.hidden = false;
      detailNode.replaceChildren(el('p', 'status error', data.error || 'Could not load this inquiry.'));
      return;
    }
    renderDetail(data.inquiry, data.attachments);
  };

  const fieldNode = (label, value, wide) => {
    const wrapper = el('div', `field${wide ? ' wide' : ''}`);
    wrapper.append(el('dt', '', label));
    wrapper.append(el('dd', '', value || '—'));
    return wrapper;
  };

  const renderDetail = (inquiry, attachments) => {
    detailNode.replaceChildren();
    detailNode.hidden = false;

    const heading = el('div', 'detail-head');
    heading.append(el('h2', '', inquiry.name || 'Unnamed inquiry'));
    const pill = el('span', `pill ${PILL_CLASS[inquiry.status] || inquiry.status}`, inquiry.status);
    heading.append(pill);
    detailNode.append(heading);
    detailNode.append(el('p', 'ref', `${inquiry.id} · submitted ${formatDate(inquiry.created_at)}`));

    const grid = el('dl', 'grid');
    grid.append(
      fieldNode('Email', inquiry.email),
      fieldNode('WhatsApp', inquiry.phone),
      fieldNode('Company', inquiry.company),
      fieldNode('Service', inquiry.service),
      fieldNode('Budget', inquiry.budget),
      fieldNode('Timeline', inquiry.timeline),
    );
    detailNode.append(grid);

    detailNode.append(el('p', 'section-title', 'Project description'));
    detailNode.append(el('p', 'desc', inquiry.description || '—'));

    detailNode.append(el('p', 'section-title', `Attachments${attachments.length ? ` (${attachments.length})` : ''}`));
    if (attachments.length) {
      const list = el('ul', 'files');
      for (const file of attachments) {
        const item = el('li');
        item.append(el('span', 'fname', file.filename));
        const kb = file.size < 1024 * 1024 ? `${Math.round(file.size / 1024)} KB` : `${(file.size / 1048576).toFixed(1)} MB`;
        item.append(el('span', 'fsize', kb));
        const link = el('a', 'btn ghost small', 'Download');
        link.href = `/api/admin/file?id=${encodeURIComponent(file.id)}`;
        link.setAttribute('download', file.filename || '');
        item.append(link);
        list.append(item);
      }
      detailNode.append(list);
    } else {
      detailNode.append(el('p', 'detail-foot', 'No attachments were stored for this inquiry.'));
    }

    const actions = el('div', 'actions');
    const select = el('select');
    select.setAttribute('aria-label', 'Inquiry status');
    for (const status of STATUSES) {
      const option = el('option', '', status);
      option.value = status;
      if (status === inquiry.status) option.selected = true;
      select.append(option);
    }

    const save = el('button', 'btn', 'Update status');
    save.type = 'button';
    const remove = el('button', 'btn danger', 'Delete inquiry');
    remove.type = 'button';
    const feedback = el('p', 'detail-status');
    feedback.setAttribute('role', 'status');

    save.addEventListener('click', async () => {
      if (select.value === inquiry.status) return setStatus(feedback, 'That is already the current status.');
      save.disabled = true;
      const result = await api('/api/admin/inquiry', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ id: inquiry.id, status: select.value }),
      });
      save.disabled = false;

      if (result.status === 200) {
        inquiry.status = result.data.status;
        inquiry.status_changed_at = result.data.status_changed_at;
        pill.className = `pill ${PILL_CLASS[inquiry.status] || inquiry.status}`;
        pill.textContent = inquiry.status;
        setStatus(feedback, `Status updated to ${result.data.status}.`);
        loadList();
      } else {
        setStatus(feedback, result.data.error || 'Could not update the status.', true);
      }
    });

    remove.addEventListener('click', async () => {
      const typed = window.prompt(`This permanently deletes ${inquiry.id} and its attachments.\n\nType DELETE to confirm.`);
      if (typed !== 'DELETE') return;
      remove.disabled = true;
      const result = await api(`/api/admin/inquiry?id=${encodeURIComponent(inquiry.id)}`, { method: 'DELETE' });
      remove.disabled = false;

      if (result.status === 200) {
        detailNode.hidden = true;
        detailNode.replaceChildren();
        state.selected = '';
        loadList();
      } else {
        setStatus(feedback, result.data.error || 'Could not delete the inquiry.', true);
      }
    });

    actions.append(select, save, remove);
    detailNode.append(actions);
    detailNode.append(feedback);

    const delivery = inquiry.emailed_at
      ? `Notification email delivered ${formatDate(inquiry.emailed_at)}.`
      : inquiry.email_error
        ? `Notification email failed: ${inquiry.email_error}`
        : 'Notification email not recorded yet.';
    const deliveryNode = el('p', 'detail-foot', delivery);
    if (!inquiry.emailed_at && inquiry.email_error) deliveryNode.classList.add('error');
    detailNode.append(deliveryNode);

    if (inquiry.status_changed_at) {
      detailNode.append(el('p', 'detail-foot', `Status last changed ${formatDate(inquiry.status_changed_at)}.`));
    }
  };

  /* --------------------------------- boot -------------------------------- */

  const boot = async () => {
    const { status, data } = await api('/api/admin/session');
    if (status === 200 && data.authenticated) {
      showDash(data.email);
    } else {
      showLogin('');
    }
  };

  boot();
})();
