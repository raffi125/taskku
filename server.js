/**
 * TaskKu Server — pakai Node.js built-in saja, TIDAK perlu npm install apapun!
 * 
 * Cara pakai:
 *   node server.js
 * 
 * Lalu buka browser: http://localhost:3000
 * Data disimpan di: tasks.json (otomatis dibuat)
 */

const http = require('http');
const fs   = require('fs');
const path = require('path');

const PORT      = 3000;
const DB_FILE   = path.join(__dirname, 'tasks.json');
const PUB_DIR   = path.join(__dirname, 'public');

// ── Pastikan tasks.json ada ──────────────────────────────
if (!fs.existsSync(DB_FILE)) {
  fs.writeFileSync(DB_FILE, JSON.stringify([], null, 2), 'utf8');
  console.log('✅ tasks.json dibuat baru');
}

// ── Helper baca/tulis DB ─────────────────────────────────
function readDB() {
  try {
    return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
  } catch {
    return [];
  }
}

function writeDB(data) {
  // Tulis ke file sementara dulu, lalu rename → atomic write (anti korup)
  const tmp = DB_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf8');
  fs.renameSync(tmp, DB_FILE);
}

// ── Helper baca body request ─────────────────────────────
function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try { resolve(JSON.parse(body || '{}')); }
      catch { reject(new Error('Invalid JSON')); }
    });
    req.on('error', reject);
  });
}

// ── MIME types untuk static files ───────────────────────
const MIME = {
  '.html': 'text/html',
  '.js':   'application/javascript',
  '.css':  'text/css',
  '.json': 'application/json',
  '.ico':  'image/x-icon',
};

// ── Serve static file ────────────────────────────────────
function serveStatic(res, filePath) {
  const ext  = path.extname(filePath);
  const mime = MIME[ext] || 'text/plain';
  try {
    const data = fs.readFileSync(filePath);
    res.writeHead(200, { 'Content-Type': mime });
    res.end(data);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('404 Not Found');
  }
}

// ── Kirim JSON response ──────────────────────────────────
function json(res, status, data) {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  });
  res.end(JSON.stringify(data));
}

// ── HTTP Server ──────────────────────────────────────────
const server = http.createServer(async (req, res) => {
  const url    = req.url.split('?')[0];
  const method = req.method;

  // CORS preflight
  if (method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin':  '*',
      'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    });
    return res.end();
  }

  // ── API Routes ────────────────────────────────────────

  // GET /api/tasks → ambil semua tugas
  if (url === '/api/tasks' && method === 'GET') {
    return json(res, 200, readDB());
  }

  // POST /api/tasks → tambah tugas baru
  if (url === '/api/tasks' && method === 'POST') {
    try {
      const body = await readBody(req);
      if (!body.name || !body.matkul) {
        return json(res, 400, { error: 'name dan matkul wajib diisi' });
      }
      const tasks = readDB();
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
      writeDB(tasks);
      return json(res, 201, task);
    } catch (e) {
      return json(res, 400, { error: e.message });
    }
  }

  // PUT /api/tasks/:id → update tugas (toggle done, edit, dll)
  const putMatch = url.match(/^\/api\/tasks\/(\d+)$/);
  if (putMatch && method === 'PUT') {
    try {
      const id   = Number(putMatch[1]);
      const body = await readBody(req);
      const tasks = readDB();
      const idx  = tasks.findIndex(t => t.id === id);
      if (idx === -1) return json(res, 404, { error: 'Task tidak ditemukan' });
      // Merge fields yang boleh diubah
      const allowed = ['name', 'matkul', 'deadline', 'priority', 'done'];
      allowed.forEach(k => {
        if (k in body) tasks[idx][k] = body[k];
      });
      tasks[idx].updatedAt = new Date().toISOString();
      writeDB(tasks);
      return json(res, 200, tasks[idx]);
    } catch (e) {
      return json(res, 400, { error: e.message });
    }
  }

  // DELETE /api/tasks/:id → hapus tugas
  const delMatch = url.match(/^\/api\/tasks\/(\d+)$/);
  if (delMatch && method === 'DELETE') {
    const id    = Number(delMatch[1]);
    let tasks   = readDB();
    const before = tasks.length;
    tasks = tasks.filter(t => t.id !== id);
    if (tasks.length === before) return json(res, 404, { error: 'Task tidak ditemukan' });
    writeDB(tasks);
    return json(res, 200, { ok: true });
  }

  // DELETE /api/tasks/done → hapus semua yang sudah selesai
  if (url === '/api/tasks/done' && method === 'DELETE') {
    let tasks = readDB();
    tasks = tasks.filter(t => !t.done);
    writeDB(tasks);
    return json(res, 200, { ok: true });
  }

  // ── Static Files ──────────────────────────────────────
  if (method === 'GET') {
    if (url === '/' || url === '/index.html') {
      return serveStatic(res, path.join(PUB_DIR, 'index.html'));
    }
    const staticPath = path.join(PUB_DIR, url);
    // Keamanan: pastikan path ada di dalam PUB_DIR
    if (staticPath.startsWith(PUB_DIR) && fs.existsSync(staticPath)) {
      return serveStatic(res, staticPath);
    }
  }

  // 404 fallback
  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('404 Not Found');
});

server.listen(PORT, () => {
  console.log('');
  console.log('  ╔══════════════════════════════════════╗');
  console.log('  ║        🎓  TaskKu Server             ║');
  console.log('  ╠══════════════════════════════════════╣');
  console.log(`  ║  Buka browser: http://localhost:${PORT}  ║`);
  console.log(`  ║  Database    : tasks.json            ║`);
  console.log('  ║  Stop server : Ctrl + C              ║');
  console.log('  ╚══════════════════════════════════════╝');
  console.log('');
});

server.on('error', err => {
  if (err.code === 'EADDRINUSE') {
    console.error(`❌ Port ${PORT} sudah dipakai. Coba ganti PORT di baris atas.`);
  } else {
    console.error('❌ Server error:', err.message);
  }
  process.exit(1);
});
