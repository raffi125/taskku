import { del } from '../_api.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();

  const token = (req.headers.authorization || '').replace('Bearer ', '').trim();
  if (token) await del(`session:${token}`).catch(() => {});

  return res.status(200).json({ ok: true });
}