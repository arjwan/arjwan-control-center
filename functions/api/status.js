import { APPS, SERVICES, REPOS } from '../../shared/apps.js';

const CACHE_TTL = 60;

async function probe(url, timeoutMs = 9000) {
  const started = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: 'GET',
      redirect: 'follow',
      signal: controller.signal,
      headers: { 'User-Agent': 'ArjwanControlCenter/1.0 (+status probe)' }
    });
    return {
      ok: true,
      httpStatus: res.status,
      latencyMs: Date.now() - started,
      server: res.headers.get('server') || '',
      cfRay: res.headers.get('cf-ray') || '',
      cfCache: res.headers.get('cf-cache-status') || ''
    };
  } catch (err) {
    return {
      ok: false,
      httpStatus: 0,
      latencyMs: Date.now() - started,
      error: err.name === 'AbortError' ? 'انتهت المهلة' : err.message
    };
  } finally {
    clearTimeout(timer);
  }
}

async function repoCommit(repo) {
  try {
    const res = await fetch(`https://api.github.com/repos/${repo}/commits?per_page=1`, {
      headers: {
        'User-Agent': 'ArjwanControlCenter/1.0',
        Accept: 'application/vnd.github+json'
      }
    });
    if (!res.ok) return { repo, ok: false, httpStatus: res.status };
    const data = await res.json();
    const c = Array.isArray(data) ? data[0] : null;
    if (!c) return { repo, ok: true, empty: true };
    return {
      repo,
      ok: true,
      sha: c.sha?.slice(0, 7) || '',
      message: (c.commit?.message || '').split('\n')[0].slice(0, 120),
      date: c.commit?.committer?.date || c.commit?.author?.date || '',
      url: c.html_url || ''
    };
  } catch (err) {
    return { repo, ok: false, error: err.message };
  }
}

function classify(app, result) {
  if (!app.url) return 'unpublished';
  if (!result.ok) return 'down';
  if (result.httpStatus >= 200 && result.httpStatus < 400) return 'up';
  if (result.httpStatus === 401 || result.httpStatus === 403) return 'up';
  return 'down';
}

async function buildReport() {
  const appResults = await Promise.all(
    APPS.map(async (app) => {
      if (!app.url) return { ...app, status: 'unpublished', httpStatus: 0 };
      const result = await probe(app.url);
      return { ...app, status: classify(app, result), ...result };
    })
  );

  const serviceResults = await Promise.all(
    SERVICES.map(async (svc) => {
      const result = await probe(svc.url);
      const accepted = result.ok && svc.expect.includes(result.httpStatus);
      return { ...svc, status: accepted ? 'up' : 'down', ...result };
    })
  );

  const repos = await Promise.all(REPOS.map(repoCommit));

  const summary = {
    total: appResults.length,
    up: appResults.filter((a) => a.status === 'up').length,
    down: appResults.filter((a) => a.status === 'down').length,
    unpublished: appResults.filter((a) => a.status === 'unpublished').length
  };

  return {
    checkedAt: new Date().toISOString(),
    summary,
    apps: appResults,
    services: serviceResults,
    repos
  };
}

export async function onRequestGet(context) {
  const cache = typeof caches !== 'undefined' ? caches.default : null;
  const cacheKey = new Request('https://control.internal/api/status', { method: 'GET' });

  if (cache) {
    const hit = await cache.match(cacheKey);
    if (hit) return hit;
  }

  const report = await buildReport();
  const response = new Response(JSON.stringify(report), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': `public, max-age=${CACHE_TTL}`,
      'Access-Control-Allow-Origin': '*'
    }
  });

  if (cache) {
    context.waitUntil(cache.put(cacheKey, response.clone()));
  }

  return response;
}

export async function onRequest(context) {
  if (context.request.method === 'GET') return onRequestGet(context);
  return new Response(JSON.stringify({ error: 'method_not_allowed' }), {
    status: 405,
    headers: { 'Content-Type': 'application/json; charset=utf-8' }
  });
}
