import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { onRequestGet } from '../functions/api/status.js';

const root = fileURLToPath(new URL('..', import.meta.url));
const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8'
};

const server = createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  if (url.pathname === '/api/status') {
    const context = { waitUntil: () => {}, request: new Request('http://localhost/api/status') };
    const response = await onRequestGet(context);
    res.writeHead(response.status, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(await response.text());
    return;
  }

  const rel = url.pathname === '/' ? '/index.html' : url.pathname;
  const file = join(root, normalize(rel).replace(/^([/\\])+/, ''));
  if (!file.startsWith(root.endsWith(sep) ? root : root + sep)) {
    res.writeHead(403);
    res.end('forbidden');
    return;
  }

  try {
    const data = await readFile(file);
    res.writeHead(200, { 'Content-Type': types[extname(file)] || 'application/octet-stream' });
    res.end(data);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('not found');
  }
});

const port = Number(process.env.PORT || 8788);
server.listen(port, () => console.log(`http://localhost:${port}`));
