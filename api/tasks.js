import { get, set } from './_redis.js';

async function getUsername(req) {
  const token = (req.headers.authorization || '').replace('Bearer ', '').trim();
  if (!token) return null;
  return await get(`session:${token}`).catch(() => null);
}

async function parseBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', c => (raw += c));
    req.on('end', () => { try { resolve(JSON.parse(raw || '{}')); } catch { reject(new Error('Invalid JSON')); } });
    req.on('error', reject);
  });
}

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
}

export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();

  const username = await getUsername(req);
  if (!username) return res.status(401).json({ error: 'Unauthorized. Silakan login.' });

  const TASKS_KEY = `tasks:${username}`; // ← data dipisah per user!
  const url = req.url.replace(/\?.*$/, '');

  try {
    if (req.method === 'GET' && url === '/api/tasks') {
      const tasks = await get(TASKS_KEY) || [];
      return res.status(200).json(Array.isArray(tasks) ? tasks : []);
    }

    if (req.method === 'POST' && url === '/api/tasks') {
      const body = await parseBody(req);
      if (!body.name || !body.matkul)
        return res.status(400).json({ error: 'name dan matkul wajib diisi' });
      const tasks = await get(TASKS_KEY) || [];
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
      await set(TASKS_KEY, tasks);
      return res.status(201).json(task);
    }

    const putMatch = url.match(/^\/api\/tasks\/([^/]+)$/);
    if (req.method === 'PUT' && putMatch) {
      const id    = putMatch[1];
      const body  = await parseBody(req);
      const tasks = await get(TASKS_KEY) || [];
      const idx   = tasks.findIndex(t => String(t.id) === id);
      if (idx === -1) return res.status(404).json({ error: 'Task tidak ditemukan' });
      ['name','matkul','deadline','priority','done'].forEach(k => { if (k in body) tasks[idx][k] = body[k]; });
      tasks[idx].updatedAt = new Date().toISOString();
      await set(TASKS_KEY, tasks);
      return res.status(200).json(tasks[idx]);
    }

    if (req.method === 'DELETE' && url === '/api/tasks/done') {
      const tasks    = await get(TASKS_KEY) || [];
      const filtered = tasks.filter(t => !t.done);
      await set(TASKS_KEY, filtered);
      return res.status(200).json({ ok: true, deleted: tasks.length - filtered.length });
    }

    const delMatch = url.match(/^\/api\/tasks\/([^/]+)$/);
    if (req.method === 'DELETE' && delMatch) {
      const id       = delMatch[1];
      const tasks    = await get(TASKS_KEY) || [];
      const filtered = tasks.filter(t => String(t.id) !== id);
      if (filtered.length === tasks.length)
        return res.status(404).json({ error: 'Task tidak ditemukan' });
      await set(TASKS_KEY, filtered);
      return res.status(200).json({ ok: true });
    }

    return res.status(404).json({ error: 'Endpoint tidak ditemukan' });

  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}