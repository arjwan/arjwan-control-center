const plans = new Set(['trial', 'annual', 'permanent']);
const excludedProjects = new Set(['shino-mano', 'shinomino', 'shno-mano', 'shno-call', 'sumer-school']);
const projectIdPattern = /^[a-z0-9][a-z0-9-]{1,62}$/;
const secretPattern = /^[a-f0-9]{64}$/;

function reply(body, status = 200) {
  return Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
}

const encoder = new TextEncoder();
const hex = bytes => Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
const hash = async value => hex(new Uint8Array(await crypto.subtle.digest('SHA-256', encoder.encode(value))));

async function authorized(request, secret) {
  const supplied = request.headers.get('Authorization')?.match(/^Bearer ([a-f0-9]{64})$/)?.[1];
  if (!supplied) return false;
  const expected = await hash(secret);
  const actual = await hash(supplied);
  let difference = 0;
  for (let i = 0; i < expected.length; i++) difference |= expected.charCodeAt(i) ^ actual.charCodeAt(i);
  return difference === 0;
}

async function readBody(request) {
  if (!request.headers.get('Content-Type')?.match(/^application\/json(?:;|$)/i)) return null;
  const reader = request.body?.getReader();
  if (!reader) return null;
  const decoder = new TextDecoder();
  let raw = '';
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > 4096) {
      await reader.cancel();
      return null;
    }
    raw += decoder.decode(value, { stream: true });
  }
  try {
    const body = JSON.parse(raw + decoder.decode());
    return body && typeof body === 'object' && !Array.isArray(body) ? body : null;
  } catch {
    return null;
  }
}

function expiration(plan, now) {
  if (plan === 'permanent') return null;
  const end = new Date(now);
  if (plan === 'trial') end.setUTCDate(end.getUTCDate() + 30);
  else {
    const month = end.getUTCMonth();
    end.setUTCFullYear(end.getUTCFullYear() + 1);
    if (end.getUTCMonth() !== month) end.setUTCDate(0);
  }
  return end.toISOString();
}

export async function onRequest({ request, env }) {
  const db = env.CONTROL_DB;
  const secret = env.CONTROL_ADMIN_TOKEN;
  if (!db || !secretPattern.test(secret || '')) return reply({ error: 'not_configured' }, 503);

  const url = new URL(request.url);
  try {
    if (request.method === 'POST' && url.searchParams.get('action') === 'verify') {
      const input = await readBody(request);
      if (typeof input?.projectId !== 'string' || !projectIdPattern.test(input.projectId) ||
          typeof input.key !== 'string' || !secretPattern.test(input.key)) {
        return reply({ error: 'invalid_input' }, 400);
      }
      const keyHash = await hash(input.key);
      const now = new Date();
      const timestamp = now.toISOString();
      await db.prepare(`UPDATE control_licenses SET last_seen_at = ?
        WHERE project_id = ? AND key_hash = ? AND (last_seen_at IS NULL OR last_seen_at < ?)`)
        .bind(timestamp, input.projectId, keyHash, new Date(now.getTime() - 300000).toISOString()).run();
      const license = await db.prepare(`
        SELECT l.plan, l.expires_at FROM control_licenses l
        JOIN control_projects p ON p.id = l.project_id
        WHERE l.project_id = ? AND l.key_hash = ? AND l.state = 'active' AND p.enabled = 1
          AND (l.expires_at IS NULL OR l.expires_at > ?)
      `).bind(input.projectId, keyHash, timestamp).first();
      return reply(license ? { valid: true, plan: license.plan, expiresAt: license.expires_at } : { valid: false });
    }

    if (!await authorized(request, secret)) return reply({ error: 'unauthorized' }, 401);
    if (request.method === 'GET') {
      const results = await db.batch([
        db.prepare('SELECT id, name, enabled FROM control_projects ORDER BY name'),
        db.prepare(`SELECT id, project_id, customer, plan, state, created_at, decided_at, expires_at, last_seen_at
          FROM control_licenses ORDER BY created_at DESC, id DESC LIMIT 50 OFFSET ?`)
          .bind(Math.min(100000, Math.max(0, Number.parseInt(url.searchParams.get('offset'), 10) || 0)))
      ]);
      return reply({ projects: results[0].results, licenses: results[1].results });
    }
    if (request.method !== 'POST') return reply({ error: 'method_not_allowed' }, 405);
    const input = await readBody(request);
    if (!input) return reply({ error: 'invalid_input' }, 400);
    const projectId = typeof input.projectId === 'string' ? input.projectId.trim() : '';
    const name = typeof input.name === 'string' ? input.name.trim() : '';
    const customer = typeof input.customer === 'string' ? input.customer.trim() : '';
    const now = new Date().toISOString();
    let result;

    switch (input.action) {
      case 'add-project':
        if (!projectIdPattern.test(projectId) || excludedProjects.has(projectId) || !name || name.length > 100) {
          return reply({ error: 'invalid_input' }, 400);
        }
        result = await db.prepare('INSERT INTO control_projects (id, name) VALUES (?, ?) ON CONFLICT(id) DO NOTHING')
          .bind(projectId, name).run();
        break;
      case 'set-project':
        if (!projectIdPattern.test(projectId) || typeof input.enabled !== 'boolean') return reply({ error: 'invalid_input' }, 400);
        result = await db.prepare('UPDATE control_projects SET enabled = ? WHERE id = ?')
          .bind(Number(input.enabled), projectId).run();
        break;
      case 'request-license':
        if (!projectIdPattern.test(projectId) || !customer || customer.length > 150 || !plans.has(input.plan)) {
          return reply({ error: 'invalid_input' }, 400);
        }
        result = await db.prepare(`INSERT INTO control_licenses (id, project_id, customer, plan, created_at)
          SELECT ?, id, ?, ?, ? FROM control_projects WHERE id = ?`)
          .bind(crypto.randomUUID(), customer, input.plan, now, projectId).run();
        break;
      case 'approve': {
        const license = await db.prepare("SELECT plan, project_id FROM control_licenses WHERE id = ? AND state = 'pending'")
          .bind(typeof input.id === 'string' ? input.id : '').first();
        if (!license) return reply({ error: 'conflict' }, 409);
        const key = hex(crypto.getRandomValues(new Uint8Array(32)));
        const expiresAt = expiration(license.plan, now);
        result = await db.prepare(`UPDATE control_licenses SET state = 'active', key_hash = ?, decided_at = ?, expires_at = ?
          WHERE id = ? AND state = 'pending' AND EXISTS (
            SELECT 1 FROM control_projects p WHERE p.id = project_id AND p.enabled = 1
          )`).bind(await hash(key), now, expiresAt, input.id).run();
        return result.meta.changes ? reply({ ok: true, key, expiresAt, projectId: license.project_id }) : reply({ error: 'conflict' }, 409);
      }
      case 'reject':
      case 'revoke':
        result = await db.prepare('UPDATE control_licenses SET state = ?, decided_at = ? WHERE id = ? AND state = ?')
          .bind(input.action === 'reject' ? 'rejected' : 'revoked', now,
            typeof input.id === 'string' ? input.id : '', input.action === 'reject' ? 'pending' : 'active').run();
        break;
      default:
        return reply({ error: 'invalid_input' }, 400);
    }
    return result.meta.changes ? reply({ ok: true }) : reply({ error: 'conflict' }, 409);
  } catch (error) {
    console.error('Control Center database operation failed', error.name);
    return reply({ error: 'server_error' }, 500);
  }
}
