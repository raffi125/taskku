/**
 * /api/tasks.js — Vercel Serverless Function
 * 
 * Semua request ke /api/tasks diarahkan ke sini.
 * Data disimpan ke file tasks.json di GitHub repo kamu.
 * 
 * ENV yang dibutuhkan (set di Vercel Dashboard):
 *   GITHUB_TOKEN   → Personal Access Token (repo scope)
 *   GITHUB_OWNER   → username GitHub kamu
 *   GITHUB_REPO    → nama repo
 *   GITHUB_BRANCH  → branch (default: main)
 */

const GITHUB_TOKEN  = process.env.GITHUB_TOKEN;
const GITHUB_OWNER  = process.env.GITHUB_OWNER;
const GITHUB_REPO   = process.env.GITHUB_REPO;
const GITHUB_BRANCH = process.env.GITHUB_BRANCH || 'main';
const FILE_PATH     = 'tasks.json';

const GH_API = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${FILE_PATH}`;

// ── GitHub helpers ────────────────────────────────────────

async function ghGet() {
  const res = await fetch(`${GH_API}?ref=${GITHUB_BRANCH}`, {
    headers: {
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      Accept: 'application/vnd.github+json',
    },
  });

  if (res.status === 404) {
    // File belum ada, return kosong
    return { tasks: [], sha: null };
  }
  if (!res.ok) throw new Error(`GitHub GET error: ${res.status}`);

  const data = await res.json();
  const content = Buffer.from(data.content, 'base64').toString('utf8');
  return { tasks: JSON.parse(content), sha: data.sha };
}

async function ghPut(tasks, sha) {
  const content = Buffer.from(JSON.stringify(tasks, null, 2)).toString('base64');
  const body = {
    message: `chore: update tasks.json [${new Date().toISOString()}]`,
    content,
    branch: GITHUB_BRANCH,
    ...(sha ? { sha } : {}),
  };

  const res = await fetch(GH_API, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `GitHub PUT error: ${res.status}`);
  }
  return res.json();
}

// ── Body parser ───────────────────────────────────────────

async function parseBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', c => (raw += c));
    req.on('end', () => {
      try { resolve(JSON.parse(raw || '{}')); }
      catch { reject(new Error('Invalid JSON')); }
    });
    req.on('error', reject);
  });
}

// ── CORS headers ──────────────────────────────────────────

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function send(res, status, data) {
  res.status(status).json(data);
}

// ── Main handler ──────────────────────────────────────────

export default async function handler(req, res) {
  cors(res);

  if (req.method === 'OPTIONS') return res.status(204).end();

  // Cek env vars
  if (!GITHUB_TOKEN || !GITHUB_OWNER || !GITHUB_REPO) {
    return send(res, 500, {
      error: 'Environment variables belum diset. Lihat README.',
    });
  }

  const url = req.url.replace(/\?.*$/, '');

  try {
    // ── GET /api/tasks ───────────────────────────────────
    if (req.method === 'GET' && url === '/api/tasks') {
      const { tasks } = await ghGet();
      return send(res, 200, tasks);
    }

    // ── POST /api/tasks ──────────────────────────────────
    if (req.method === 'POST' && url === '/api/tasks') {
      const body = await parseBody(req);
      if (!body.name || !body.matkul) {
        return send(res, 400, { error: 'name dan matkul wajib diisi' });
      }

      const { tasks, sha } = await ghGet();
      const task = {
        id:        Date.now(),
        name:      String(body.name).trim(),
        matkul:    String(body.matkul).trim(),
        deadline:  body.deadline || null,
        priority:  body.priority || 'normal',
        done:      false,
        createdAt: new Date().toISOString(),
      };
      tasks.unshift(task);
      await ghPut(tasks, sha);
      return send(res, 201, task);
    }

    // ── PUT /api/tasks/:id ───────────────────────────────
    const putMatch = url.match(/^\/api\/tasks\/(\d+)$/);
    if (req.method === 'PUT' && putMatch) {
      const id   = Number(putMatch[1]);
      const body = await parseBody(req);
      const { tasks, sha } = await ghGet();
      const idx  = tasks.findIndex(t => t.id === id);
      if (idx === -1) return send(res, 404, { error: 'Task tidak ditemukan' });

      const allowed = ['name', 'matkul', 'deadline', 'priority', 'done'];
      allowed.forEach(k => { if (k in body) tasks[idx][k] = body[k]; });
      tasks[idx].updatedAt = new Date().toISOString();
      await ghPut(tasks, sha);
      return send(res, 200, tasks[idx]);
    }

    // ── DELETE /api/tasks/done ───────────────────────────
    if (req.method === 'DELETE' && url === '/api/tasks/done') {
      const { tasks, sha } = await ghGet();
      const filtered = tasks.filter(t => !t.done);
      await ghPut(filtered, sha);
      return send(res, 200, { ok: true, deleted: tasks.length - filtered.length });
    }

    // ── DELETE /api/tasks/:id ────────────────────────────
    const delMatch = url.match(/^\/api\/tasks\/(\d+)$/);
    if (req.method === 'DELETE' && delMatch) {
      const id = Number(delMatch[1]);
      const { tasks, sha } = await ghGet();
      const filtered = tasks.filter(t => t.id !== id);
      if (filtered.length === tasks.length) {
        return send(res, 404, { error: 'Task tidak ditemukan' });
      }
      await ghPut(filtered, sha);
      return send(res, 200, { ok: true });
    }

    return send(res, 404, { error: 'Endpoint tidak ditemukan' });

  } catch (e) {
    console.error('[TaskKu API Error]', e.message);
    return send(res, 500, { error: e.message });
  }
}
