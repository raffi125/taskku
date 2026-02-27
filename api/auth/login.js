/**
 * POST /api/auth/login
 */

const KV_URL   = process.env.KV_REST_API_URL;
const KV_TOKEN = process.env.KV_REST_API_TOKEN;

function sha256(text) {
  const crypto = require('crypto');
  return crypto.createHash('sha256').update(text).digest('hex');
}

function generateToken() {
  const crypto = require('crypto');
  return crypto.randomBytes(32).toString('hex');
}

async function kvSet(key, value, exSeconds) {
  const url = `${KV_URL}/set/${encodeURIComponent(key)}`;
  const params = exSeconds ? `?EX=${exSeconds}` : '';
  const res = await fetch(url + params, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${KV_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ value }),
  });
  if (!res.ok) throw new Error(`KV SET error: ${res.status}`);
}

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

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  if (!KV_URL || !KV_TOKEN) {
    return res.status(500).json({ error: 'KV belum diset' });
  }

  try {
    const { username, password } = await parseBody(req);

    const expectedUser = process.env.APP_USERNAME;
    const expectedHash = process.env.APP_PASSWORD_HASH;

    if (!expectedUser || !expectedHash) {
      return res.status(500).json({ error: 'APP_USERNAME / APP_PASSWORD_HASH belum diset di env variables' });
    }

    const passwordHash = sha256(String(password || ''));
    const usernameOk   = String(username || '').trim() === expectedUser;
    const passwordOk   = passwordHash === expectedHash;

    if (!usernameOk || !passwordOk) {
      await new Promise(r => setTimeout(r, 1000)); // anti brute force
      return res.status(401).json({ error: 'Username atau password salah' });
    }

    const token = generateToken();
    const SESSION_EXPIRE = 60 * 60 * 24 * 7; // 7 hari
    await kvSet(`session:${token}`, username, SESSION_EXPIRE);

    return res.status(200).json({ ok: true, token, username, expiresIn: SESSION_EXPIRE });

  } catch (e) {
    console.error('[Login Error]', e.message);
    return res.status(500).json({ error: e.message });
  }
}