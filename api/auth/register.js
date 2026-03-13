const { get, set } = require('../_api.js');
const bcrypt = require('bcryptjs');

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

module.exports = async function handler(req, res) {

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST')
    return res.status(405).json({ error: 'Method not allowed' });

  try {

    const { username, passwordHash } = await parseBody(req);

    if (!username || !passwordHash)
      return res.status(400).json({ error: 'Username dan password wajib diisi' });

    const clean = String(username).trim().toLowerCase();

    if (!/^[a-z0-9_]{3,20}$/.test(clean))
      return res.status(400).json({ error: 'Username tidak valid' });

    const existing = await get(`user:${clean}`);

    if (existing)
      return res.status(409).json({ error: 'Username sudah dipakai' });

    const hash = await bcrypt.hash(passwordHash, 10);

    await set(`user:${clean}`, {
      username: clean,
      passwordHash: hash,
      createdAt: new Date().toISOString()
    });

    res.status(201).json({
      ok: true,
      username: clean
    });

  } catch (e) {

    res.status(500).json({ error: e.message });

  }

};