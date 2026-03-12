import { get, set } from '../_api.js';

function generateToken() {
  return require('crypto').randomBytes(32).toString('hex');
}

async function parseBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', c => (raw += c));
    req.on('end', () => { try { resolve(JSON.parse(raw || '{}')); } catch { reject(new Error('Invalid JSON')); } });
    req.on('error', reject);
  });
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { username, passwordHash } = await parseBody(req);

    if (!username || !passwordHash)
      return res.status(400).json({ error: 'Username dan password wajib diisi' });

    const clean = String(username).trim().toLowerCase();
    const user  = await get(`user:${clean}`);

    if (!user) {
      await new Promise(r => setTimeout(r, 1000));
      return res.status(401).json({ error: 'Username atau password salah' });
    }

    const passwordOk = String(passwordHash).toLowerCase() === user.passwordHash;
    if (!passwordOk) {
      await new Promise(r => setTimeout(r, 1000));
      return res.status(401).json({ error: 'Username atau password salah' });
    }

    const token = generateToken();
    await set(`session:${token}`, clean, 60 * 60 * 24 * 7);

    return res.status(200).json({ ok: true, token, username: clean });

  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}