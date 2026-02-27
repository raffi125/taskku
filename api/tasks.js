/**
 * /api/tasks.js — Tasks API dengan auth middleware
 * Setiap request harus kirim header: Authorization: Bearer <token>
 */

const KV_URL   = process.env.KV_REST_API_URL;
const KV_TOKEN = process.env.KV_REST_API_TOKEN;
const TASKS_KEY = 'tasks';

// ── KV helpers ────────────────────────────────────────────

async function kvGet(key) {
  const res = await fetch(`${KV_URL}/get/${key}`, {
    headers: { Authorization: `Bearer ${KV_TOKEN}` },
  });
  if (!res.ok) throw new Error(`KV GET error: ${res.status}`);
  const { result } = await res.json();
  if (!result) return null;
  return typeof result === 'string' ? JSON.parse(result) : result;
}

async function kvSet(key, value, exSeconds) {
  const url = exSeconds ? `${KV_URL}/set/${key}?EX=${exSeconds}` : `${KV_URL}/set/${key}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${KV_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ value }),
  });
  if (!res.ok) throw new Error(`KV SET error: ${res.status}`);
}

async function getTasks() {
  const data = await kvGet(TASKS_KEY);
  return Array.isArray(data) ? data : [];
}

async function setTasks(tasks) {
  await kvSet(TASKS_KEY, JSON.stringify(tasks));
}

// ── Auth middleware ───────────────────────────────────────

async function authenticate(req) {
  const token = (req.headers.authorization || '').replace('Bearer ', '').trim();
  if (!token) return false;
  const username = await kvGet(`session:${token}`);
  return !!username;
}

// ── Helpers ───────────────────────────────────────────────

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

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
}

function send(res, status, data) {
  res.status(status).json(data);
}

// ── Main handler ──────────────────────────────────────────

export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();

  if (!KV_URL || !KV_TOKEN) {
    return send(res, 500, { error: 'KV belum diset. Hubungkan Vercel KV di dashboard.' });
  }

  // Cek auth untuk semua request
  const authed = await authenticate(req);
  if (!authed) {
    return send(res, 401, { error: 'Unauthorized. Silakan login terlebih dahulu.' });
  }

  const url = req.url.replace(/\?.*$/, '');

  try {
    // ── GET /api/tasks ────────────────────────────────────
    if (req.method === 'GET' && url === '/api/tasks') {
      const tasks = await getTasks();
      return send(res, 200, tasks);
    }

    // ── POST /api/tasks ───────────────────────────────────
    if (req.method === 'POST' && url === '/api/tasks') {
      const body = await parseBody(req);
      if (!body.name || !body.matkul) {
        return send(res, 400, { error: 'name dan matkul wajib diisi' });
      }
      const tasks = await getTasks();
      const task = {
        id:        `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        name:      String(body.name).trim(),
        matkul:    String(body.matkul).trim(),
        deadline:  body.deadline || null,
        priority:  body.priority || 'normal',
        done:      false,
        createdAt: new Date().toISOString(),
      };
      tasks.unshift(task);
      await setTasks(tasks);
      return send(res, 201, task);
    }

    // ── PUT /api/tasks/:id ────────────────────────────────
    const putMatch = url.match(/^\/api\/tasks\/([^/]+)$/);
    if (req.method === 'PUT' && putMatch) {
      const id    = putMatch[1];
      const body  = await parseBody(req);
      const tasks = await getTasks();
      const idx   = tasks.findIndex(t => String(t.id) === id);
      if (idx === -1) return send(res, 404, { error: 'Task tidak ditemukan' });
      const allowed = ['name', 'matkul', 'deadline', 'priority', 'done'];
      allowed.forEach(k => { if (k in body) tasks[idx][k] = body[k]; });
      tasks[idx].updatedAt = new Date().toISOString();
      await setTasks(tasks);
      return send(res, 200, tasks[idx]);
    }

    // ── DELETE /api/tasks/done ────────────────────────────
    if (req.method === 'DELETE' && url === '/api/tasks/done') {
      const tasks    = await getTasks();
      const filtered = tasks.filter(t => !t.done);
      await setTasks(filtered);
      return send(res, 200, { ok: true, deleted: tasks.length - filtered.length });
    }

    // ── DELETE /api/tasks/:id ─────────────────────────────
    const delMatch = url.match(/^\/api\/tasks\/([^/]+)$/);
    if (req.method === 'DELETE' && delMatch) {
      const id       = delMatch[1];
      const tasks    = await getTasks();
      const filtered = tasks.filter(t => String(t.id) !== id);
      if (filtered.length === tasks.length) {
        return send(res, 404, { error: 'Task tidak ditemukan' });
      }
      await setTasks(filtered);
      return send(res, 200, { ok: true });
    }

    return send(res, 404, { error: 'Endpoint tidak ditemukan' });

  } catch (e) {
    console.error('[TaskKu Tasks Error]', e.message);
    return send(res, 500, { error: e.message });
  }
}
