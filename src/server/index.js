import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {
  ROOT,
  PROJECTS_DIR,
  ensureDirs,
  listProjects,
  loadProject,
  saveProject,
  createProject,
  saveAsset,
  projectDir,
  safeName,
} from './store.js';

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

const json = (res, code, data) => {
  const body = JSON.stringify(data);
  res.writeHead(code, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(body),
    'cache-control': 'no-store',
  });
  res.end(body);
};

function serveFile(res, filePath) {
  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    res.writeHead(404).end('Not found');
    return;
  }
  const ext = path.extname(filePath).toLowerCase();
  res.writeHead(200, {
    'content-type': MIME[ext] || 'application/octet-stream',
    'cache-control': 'no-store',
  });
  fs.createReadStream(filePath).pipe(res);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

// Resolve a URL path inside a root dir, blocking traversal.
function resolveWithin(rootDir, urlPath) {
  const decoded = decodeURIComponent(urlPath);
  const full = path.resolve(rootDir, '.' + (decoded.startsWith('/') ? decoded : '/' + decoded));
  const rel = path.relative(rootDir, full);
  if (rel.startsWith('..') || path.isAbsolute(rel)) return null;
  return full;
}

export function createServer({ renderProject } = {}) {
  ensureDirs();

  return http.createServer(async (req, res) => {
    const url = new URL(req.url, 'http://localhost');
    const p = url.pathname;

    try {
      // ---------- API ----------
      if (p.startsWith('/api/')) {
        if (p === '/api/projects' && req.method === 'GET') {
          return json(res, 200, listProjects());
        }
        if (p === '/api/projects' && req.method === 'POST') {
          const body = JSON.parse((await readBody(req)).toString() || '{}');
          const proj = createProject(body.name, body);
          return json(res, 201, proj);
        }

        const m = p.match(/^\/api\/project\/([^/]+)(\/.*)?$/);
        if (m) {
          const name = safeName(decodeURIComponent(m[1]));
          const sub = m[2] || '';

          if (!sub && req.method === 'GET') return json(res, 200, loadProject(name));
          if (!sub && req.method === 'PUT') {
            const body = JSON.parse((await readBody(req)).toString());
            saveProject(name, body);
            return json(res, 200, { ok: true });
          }
          if (sub === '/upload' && req.method === 'POST') {
            const filename = req.headers['x-filename'] || 'shot.png';
            const buf = await readBody(req);
            const rel = saveAsset(name, String(filename), buf);
            return json(res, 200, { path: rel });
          }
          if (sub === '/render' && req.method === 'POST') {
            if (!renderProject) return json(res, 501, { error: 'renderer unavailable' });
            const body = JSON.parse((await readBody(req)).toString() || '{}');
            const out = await renderProject(name, body);
            return json(res, 200, out);
          }
          if (sub === '/reveal' && req.method === 'POST') {
            const { execFile } = await import('node:child_process');
            execFile('open', [projectDir(name)]);
            return json(res, 200, { ok: true });
          }
        }
        return json(res, 404, { error: 'unknown endpoint' });
      }

      // ---------- static ----------
      if (p === '/' || p === '/index.html') {
        return serveFile(res, path.join(ROOT, 'src/editor/index.html'));
      }
      if (p.startsWith('/src/')) {
        const f = resolveWithin(ROOT, p);
        return f ? serveFile(res, f) : res.writeHead(403).end('Forbidden');
      }
      if (p.startsWith('/projects/')) {
        const f = resolveWithin(PROJECTS_DIR, p.slice('/projects'.length));
        return f ? serveFile(res, f) : res.writeHead(403).end('Forbidden');
      }
      if (p.startsWith('/out/')) {
        const f = resolveWithin(ROOT, p);
        return f ? serveFile(res, f) : res.writeHead(403).end('Forbidden');
      }
      res.writeHead(404).end('Not found');
    } catch (err) {
      json(res, 500, { error: String(err && err.message ? err.message : err) });
    }
  });
}

export function startServer(opts = {}) {
  const server = createServer(opts);
  return new Promise((resolve) => {
    server.listen(opts.port ?? 0, '127.0.0.1', () => {
      const { port } = server.address();
      resolve({ port, server, url: `http://127.0.0.1:${port}`, close: () => server.close() });
    });
  });
}
