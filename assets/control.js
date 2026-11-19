const get = id => document.getElementById(id);
const login = get('control-login');
const panel = get('control-panel');
const feedback = get('control-feedback');
const projectForm = get('project-form');
const licenseForm = get('license-form');
const plans = { trial: 'تجريبية', annual: 'سنوية', permanent: 'دائمة' };
const states = { pending: 'بانتظار القرار', active: 'فعّال', rejected: 'مرفوض', revoked: 'ملغى', expired: 'منتهي' };
const errors = {
  unauthorized: 'مفتاح الإدارة غير صحيح أو تم تغييره.',
  not_configured: 'إعدادات قاعدة التراخيص ومفتاح الإدارة مطلوبة.',
  invalid_input: 'تحقق من الحقول ومعرّف المشروع.',
  conflict: 'تعذر تطبيق الإجراء. تحقق من حالة المشروع أو الترخيص وحدّث القائمة.',
  server_error: 'تعذر الاتصال بقاعدة التراخيص.'
};
let token = '';
let offset = 0;
let busy = false;
let issuedDesktop = null;

async function api(body) {
  const headers = { Authorization: `Bearer ${token}` };
  if (body) headers['Content-Type'] = 'application/json';
  const res = await fetch(`/api/control?offset=${offset}`, {
    method: body ? 'POST' : 'GET', headers, body: body ? JSON.stringify(body) : undefined,
    cache: 'no-store'
  });
  const data = await res.json();
  if (!res.ok) {
    if (res.status === 401) logout();
    throw new Error(errors[data.error] || `HTTP ${res.status}`);
  }
  return data;
}

function button(label, action) {
  const node = document.createElement('button');
  node.type = 'button';
  node.className = 'btn';
  node.textContent = label;
  node.addEventListener('click', action);
  return node;
}

function row(title, subtitle, ...actions) {
  const node = document.createElement('div');
  const text = document.createElement('div');
  const detail = document.createElement('div');
  node.className = 'row';
  text.className = 'grow';
  text.textContent = title;
  detail.className = 'sub';
  detail.textContent = subtitle;
  text.append(detail);
  node.append(text, ...actions);
  return node;
}

async function load() {
  const { projects, licenses } = await api();
  const projectNames = new Map(projects.map(p => [p.id, p.name]));
  const select = licenseForm.elements.projectId;
  const selected = select.value;
  select.replaceChildren(...projects.map(p => new Option(p.name, p.id)));
  if (projectNames.has(selected)) select.value = selected;

  get('control-projects').replaceChildren(...projects.map(p => row(
    p.name, `${p.id} · ${p.enabled ? 'التراخيص مفعّلة' : 'التراخيص معلّقة'}`,
    button(p.enabled ? 'تعليق التراخيص' : 'استئناف التراخيص', () => {
      if (p.enabled && !confirm(`تعليق التحقق من جميع تراخيص ${p.name}؟`)) return;
      mutate({ action: 'set-project', projectId: p.id, enabled: !p.enabled });
    })
  )));

  const rows = licenses.map(l => {
    const actions = [];
    if (l.state === 'pending') {
      actions.push(button('قبول وإصدار', () => mutate({ action: 'approve', id: l.id })));
      actions.push(button('رفض', () => {
        if (confirm('رفض طلب الترخيص؟')) mutate({ action: 'reject', id: l.id });
      }));
    }
    if (l.state === 'active') {
      actions.push(button('إلغاء الترخيص', () => {
        if (confirm('إلغاء الترخيص نهائيًا؟')) mutate({ action: 'revoke', id: l.id });
      }));
    }
    const expired = l.state === 'active' && l.expires_at && Date.parse(l.expires_at) <= Date.now();
    const details = [projectNames.get(l.project_id), plans[l.plan], states[expired ? 'expired' : l.state]];
    if (l.expires_at) details.push(new Date(l.expires_at).toLocaleDateString('ar-IQ'));
    if (l.last_seen_at) details.push('آخر تحقق: ' + new Date(l.last_seen_at).toLocaleString('ar-IQ'));
    return row(l.customer, details.join(' · '), ...actions);
  });
  get('licensesList').replaceChildren(...(rows.length ? rows : [row('لا توجد تراخيص في هذه الصفحة', '')]));
  get('control-prev').disabled = offset === 0;
  get('control-next').disabled = licenses.length < 50;
}

async function run(operation) {
  if (busy) return;
  busy = true;
  feedback.textContent = 'جارٍ التنفيذ…';
  try {
    await operation();
    feedback.textContent = '';
  } catch (error) {
    feedback.textContent = error.message;
  } finally {
    busy = false;
  }
}

function dismissKey() {
  issuedDesktop = null;
  get('control-export').hidden = true;
  get('control-key').value = '';
  get('control-issued').hidden = true;
}

function logout() {
  token = '';
  offset = 0;
  dismissKey();
  panel.hidden = true;
  login.hidden = false;
  feedback.textContent = '';
  login.reset();
  projectForm.reset();
  licenseForm.reset();
  get('control-projects').replaceChildren();
  get('licensesList').replaceChildren();
}

function mutate(body, form) {
  run(async () => {
    if (body.action === 'approve' && get('control-key').value) {
      throw new Error('انسخ المفتاح المعروض وأخفه قبل إصدار مفتاح جديد.');
    }
    const result = await api(body);
    if (result.key) {
      if (result.projectId === 'almahasib-offline') {
        issuedDesktop = { key: result.key, expiresAt: result.expiresAt, url: new URL('/api/control', location.origin).href };
        get('control-export').hidden = false;
      }
      get('control-key').value = result.key;
      get('control-issued').hidden = false;
      get('control-issued').scrollIntoView({ block: 'nearest' });
    }
    form?.reset();
    if (body.action === 'request-license') offset = 0;
    await load();
  });
}

login.addEventListener('submit', event => {
  event.preventDefault();
  run(async () => {
    token = login.elements.token.value.trim();
    login.reset();
    try {
      await load();
    } catch (error) {
      token = '';
      throw error;
    }
    login.hidden = true;
    panel.hidden = false;
  });
});

for (const [form, action] of [[projectForm, 'add-project'], [licenseForm, 'request-license']]) {
  form.addEventListener('submit', event => {
    event.preventDefault();
    mutate({ ...Object.fromEntries(new FormData(form)), action }, form);
  });
}

function page(step) {
  run(async () => {
    const previous = offset;
    offset += step;
    try { await load(); }
    catch (error) { if (token) offset = previous; throw error; }
  });
}

get('control-prev').addEventListener('click', () => page(-50));
get('control-next').addEventListener('click', () => page(50));
get('control-logout').addEventListener('click', () => { if (!busy) logout(); });
get('control-dismiss').addEventListener('click', dismissKey);
get('control-copy').addEventListener('click', () => run(async () => {
  await navigator.clipboard.writeText(get('control-key').value);
  get('control-key').select();
}));

get('control-export').addEventListener('click', () => {
  if (!issuedDesktop) return;
  const url = URL.createObjectURL(new Blob([JSON.stringify(issuedDesktop)], { type: 'application/json' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = 'almahasib-desktop-license-config.json';
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});
