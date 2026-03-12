import { get } from '../_redis.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const token = (req.headers.authorization || '').replace('Bearer ', '').trim();
  if (!token) return res.status(401).json({ error: 'Token tidak ada' });

  try {
    const username = await get(`session:${token}`);
    if (!username) return res.status(401).json({ error: 'Session tidak valid atau expired' });
    return res.status(200).json({ ok: true, username });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}