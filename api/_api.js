const URL   = process.env.KV_REST_API_URL   || process.env.UPSTASH_REDIS_REST_URL;
const TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

async function redis(command, ...args) {
  if (!URL || !TOKEN) throw new Error(
    'Redis belum diset. Tambahkan KV_REST_API_URL + KV_REST_API_TOKEN di env variables'
  );
  const res = await fetch(`${URL}/${[command, ...args.map(a => encodeURIComponent(a))].join('/')}`, {
    headers: { Authorization: `Bearer ${TOKEN}` },
  });
  if (!res.ok) throw new Error(`Redis error: ${res.status}`);
  const { result } = await res.json();
  return result;
}

export async function get(key) {
  const result = await redis('get', key);
  if (!result) return null;
  try { return JSON.parse(result); } catch { return result; }
}

export async function set(key, value, exSeconds) {
  const val = typeof value === 'string' ? value : JSON.stringify(value);
  if (exSeconds) return redis('set', key, val, 'EX', String(exSeconds));
  return redis('set', key, val);
}

export async function del(key) {
  return redis('del', key);
}