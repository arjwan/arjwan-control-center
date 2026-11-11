const state = { report: null, loading: false };

const STATUS_LABEL = { up: 'يعمل', down: 'متوقف', unpublished: 'غير منشور', unknown: 'غير معروف' };

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function fmtTime(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('ar-IQ', { dateStyle: 'short', timeStyle: 'short' });
}

function fmtAgo(iso) {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  if (Number.isNaN(diff)) return '';
  const m = Math.round(diff / 60000);
  if (m < 1) return 'الآن';
  if (m < 60) return `قبل ${m} دقيقة`;
  const h = Math.round(m / 60);
  if (h < 24) return `قبل ${h} ساعة`;
  return `قبل ${Math.round(h / 24)} يوم`;
}

function appRow(app) {
  const row = el('div', 'row');
  row.append(el('span', `dot ${app.status}`));

  const main = el('div', 'grow');
  main.append(el('div', 'title', app.name));
  const sub = el('div', 'sub', app.description || '');
  main.append(sub);
  row.append(main);

  const meta = el('div', 'meta');
  if (app.platform) meta.append(el('span', '', app.platform));
  if (app.httpStatus) meta.append(el('span', '', `HTTP ${app.httpStatus}`));
  if (app.latencyMs) meta.append(el('span', '', `${app.latencyMs} ms`));
  if (app.server) meta.append(el('span', '', app.server));
  row.append(meta);

  row.append(el('span', `pill ${app.status}`, STATUS_LABEL[app.status] || app.status));

  if (app.url) {
    const link = el('a', 'btn', 'فتح');
    link.href = app.url;
    link.target = '_blank';
    link.rel = 'noopener';
    row.append(link);
  }
  return row;
}

function serviceRow(svc) {
  const row = el('div', 'row');
  row.append(el('span', `dot ${svc.status}`));
  const main = el('div', 'grow');
  main.append(el('div', 'title', svc.name));
  main.append(el('div', 'sub', svc.url));
  row.append(main);
  const meta = el('div', 'meta');
  meta.append(el('span', '', `HTTP ${svc.httpStatus || '—'}`));
  meta.append(el('span', '', `${svc.latencyMs || 0} ms`));
  if (svc.error) meta.append(el('span', '', svc.error));
  row.append(meta);
  row.append(el('span', `pill ${svc.status}`, STATUS_LABEL[svc.status] || svc.status));
  return row;
}

function repoRow(repo) {
  const row = el('div', 'row');
  row.append(el('span', `dot ${repo.ok ? 'up' : 'down'}`));
  const main = el('div', 'grow');
  const title = el('div', 'title');
  title.append(el('a', '', repo.repo));
  title.querySelector('a').href = `https://github.com/${repo.repo}`;
  title.querySelector('a').target = '_blank';
  title.querySelector('a').rel = 'noopener';
  main.append(title);
  main.append(el('div', 'sub', repo.ok ? (repo.message || 'لا توجد commits') : 'تعذر قراءة المستودع'));
  row.append(main);
  const meta = el('div', 'meta');
  if (repo.sha) meta.append(el('span', '', repo.sha));
  if (repo.date) meta.append(el('span', '', `${fmtTime(repo.date)} (${fmtAgo(repo.date)})`));
  row.append(meta);
  return row;
}

function placeholderRow(name, detail) {
  const row = el('div', 'row');
  row.append(el('span', 'dot unpublished'));
  const main = el('div', 'grow');
  main.append(el('div', 'title', name));
  main.append(el('div', 'sub', detail));
  row.append(main);
  row.append(el('span', 'pill unpublished', 'غير مربوط'));
  return row;
}

function render() {
  const report = state.report;
  if (!report) return;

  const cards = document.getElementById('summaryCards');
  cards.replaceChildren();
  const items = [
    { num: report.summary.total, lbl: 'إجمالي التطبيقات' },
    { num: report.summary.up, lbl: 'يعمل' },
    { num: report.summary.down, lbl: 'متوقف' },
    { num: report.summary.unpublished, lbl: 'غير منشور على ويب' }
  ];
  for (const item of items) {
    const card = el('div', 'card');
    card.append(el('div', 'num', String(item.num)));
    card.append(el('div', 'lbl', item.lbl));
    cards.append(card);
  }

  const fill = (id, rows) => {
    const box = document.getElementById(id);
    box.replaceChildren();
    if (!rows.length) box.append(el('div', 'empty', 'لا توجد بيانات'));
    rows.forEach((r) => box.append(r));
  };

  fill('overviewApps', report.apps.map(appRow));
  fill('appsList', report.apps.map(appRow));
  fill('servicesList', report.services.map(serviceRow));
  fill('monitorList', [...report.apps.map(appRow), ...report.services.map(serviceRow)]);
  fill('updatesList', report.repos.map(repoRow));

  fill('databasesList', report.apps.map((a) => placeholderRow(a.name, `قاعدة البيانات: ${a.db || 'غير معروفة'}`)));
  fill('licensesList', report.apps.map((a) => placeholderRow(a.name, 'لا يوجد خادم تراخيص مربوط بعد')));

  document.getElementById('lastChecked').textContent = `آخر فحص: ${fmtTime(report.checkedAt)} (${fmtAgo(report.checkedAt)})`;
}

async function load(force) {
  if (state.loading) return;
  state.loading = true;
  const btn = document.getElementById('refresh');
  btn.disabled = true;
  btn.textContent = 'جارٍ الفحص…';
  try {
    const res = await fetch(`/api/status${force ? '?t=' + Date.now() : ''}`, { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    state.report = await res.json();
    render();
  } catch (err) {
    document.getElementById('lastChecked').textContent = `تعذر الفحص: ${err.message}`;
  } finally {
    state.loading = false;
    btn.disabled = false;
    btn.textContent = 'فحص الآن';
  }
}

document.getElementById('tabs').addEventListener('click', (e) => {
  const tab = e.target.closest('.tab');
  if (!tab) return;
  document.querySelectorAll('.tab').forEach((t) => t.classList.toggle('active', t === tab));
  document.querySelectorAll('.view').forEach((v) => v.classList.toggle('active', v.id === `view-${tab.dataset.view}`));
});

document.getElementById('refresh').addEventListener('click', () => load(true));

load(false);
setInterval(() => load(false), 60000);
