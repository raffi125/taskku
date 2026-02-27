/**
 * /api/auth.js — Login & logout
 *
 * POST /api/auth/login  → cek credentials, buat session token, simpan di KV
 * POST /api/auth/logout → hapus session dari KV
 * GET  /api/auth/check  → verifikasi token masih valid
 *
 * ENV di Vercel Dashboard (wajib diset manual):
 *   APP_USERNAME     → raffi25003
 *   APP_PASSWORD_HASH → (hash SHA-256 dari password kamu)
 *   SESSION_SECRET   → string random bebas, misal: "taskku-secret-xyz"
 *   KV_REST_API_URL
 *   KV_REST_API_TOKEN
 */

const KV_URL   = process.env.KV_REST_API_URL;
const KV_TOKEN = process.env.KV_REST_API_TOKEN;

// ── KV helpers ────────────────────────────────────────────

async function kvSet(key, value, exSeconds) {
  const body = { value };
  // EX = expire in seconds
  const url = exSeconds
    ? `${KV_URL}/set/${key}?EX=${exSeconds}`
    : `${KV_URL}/set/${key}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${KV_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ value }),
  });
  if (!res.ok) throw new Error(`KV SET error: ${res.status}`);
}

async function kvGet(key) {
  const res = await fetch(`${KV_URL}/get/${key}`, {
    headers: { Authorization: `Bearer ${KV_TOKEN}` },
  });
  if (!res.ok) throw new Error(`KV GET error: ${res.status}`);
  const { result } = await res.json();
  return result;
}

async function kvDel(key) {
  await fetch(`${KV_URL}/del/${key}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${KV_TOKEN}` },
  });
}

// ── SHA-256 hash (Node.js built-in crypto) ────────────────

function sha256(text) {
  const crypto = require('crypto');
  return crypto.createHash('sha256').update(text).digest('hex');
}

// ── Generate session token ────────────────────────────────

function generateToken() {
  const crypto = require('crypto');
  return crypto.randomBytes(32).toString('hex');
}

// ── CORS ──────────────────────────────────────────────────

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
}

function send(res, status, data) {
  res.status(status).json(data);
}

// ── Parse body ────────────────────────────────────────────

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

// ── Main handler ──────────────────────────────────────────

export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();

  const url = req.url.replace(/\?.*$/, '');

  // ── POST /api/auth/login ────────────────────────────────
  if (req.method === 'POST' && url === '/api/auth/login') {
    try {
      const { username, password } = await parseBody(req);

      const expectedUser = process.env.APP_USERNAME;
      const expectedHash = process.env.APP_PASSWORD_HASH;

      if (!expectedUser || !expectedHash) {
        return send(res, 500, { error: 'Credentials belum diset di env variables' });
      }

      const passwordHash = sha256(String(password || ''));
      const usernameOk   = String(username || '') === expectedUser;
      const passwordOk   = passwordHash === expectedHash;

      if (!usernameOk || !passwordOk) {
        // Delay 1 detik untuk anti brute force
        await new Promise(r => setTimeout(r, 1000));
        return send(res, 401, { error: 'Username atau password salah' });
      }

      // Buat session token, simpan di KV, expire 7 hari
      const token = generateToken();
      const SESSION_EXPIRE = 60 * 60 * 24 * 7; // 7 hari dalam detik
      await kvSet(`session:${token}`, username, SESSION_EXPIRE);

      return send(res, 200, {
        ok: true,
        token,
        username,
        expiresIn: SESSION_EXPIRE,
      });
    } catch (e) {
      return send(res, 500, { error: e.message });
    }
  }

  // ── POST /api/auth/logout ───────────────────────────────
  if (req.method === 'POST' && url === '/api/auth/logout') {
    const token = (req.headers.authorization || '').replace('Bearer ', '');
    if (token) await kvDel(`session:${token}`);
    return send(res, 200, { ok: true });
  }

  // ── GET /api/auth/check ─────────────────────────────────
  if (req.method === 'GET' && url === '/api/auth/check') {
    const token = (req.headers.authorization || '').replace('Bearer ', '');
    if (!token) return send(res, 401, { error: 'Token tidak ada' });
    const username = await kvGet(`session:${token}`);
    if (!username) return send(res, 401, { error: 'Session tidak valid atau sudah expired' });
    return send(res, 200, { ok: true, username });
  }

  return send(res, 404, { error: 'Endpoint tidak ditemukan' });
}