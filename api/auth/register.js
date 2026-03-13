const bcrypt = require("bcryptjs");
const { get, set } = require("../_api.js");

async function parseBody(req) {
  return new Promise((resolve, reject) => {
    let raw = "";

    req.on("data", chunk => {
      raw += chunk;
    });

    req.on("end", () => {
      try {
        resolve(JSON.parse(raw || "{}"));
      } catch {
        reject(new Error("Invalid JSON"));
      }
    });

    req.on("error", reject);
  });
}

module.exports = async function handler(req, res) {

  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization");

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed"
    });
  }

  try {

    const { username, password } = await parseBody(req);

    if (!username || !password) {
      return res.status(400).json({
        error: "Username dan password wajib diisi"
      });
    }

    const clean = String(username).trim().toLowerCase();

    if (!/^[a-z0-9_]{3,20}$/.test(clean)) {
      return res.status(400).json({
        error: "Username hanya boleh huruf kecil, angka, underscore (3-20 karakter)"
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        error: "Password minimal 6 karakter"
      });
    }

    const existing = await get(`user:${clean}`);

    if (existing) {
      return res.status(409).json({
        error: "Username sudah dipakai"
      });
    }

    // hash password dengan bcrypt
    const passwordHash = await bcrypt.hash(password, 10);

    await set(`user:${clean}`, {
      username: clean,
      passwordHash,
      createdAt: new Date().toISOString()
    });

    return res.status(201).json({
      ok: true,
      username: clean
    });

  } catch (e) {
    return res.status(500).json({
      error: e.message || "Server error"
    });

  }
}