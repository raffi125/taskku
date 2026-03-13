const { del } = require("../_api.js");

function getToken(req) {
  const auth = req.headers.authorization;
  if (!auth) return null;
  const parts = auth.split(" ");
  if (parts.length !== 2) return null;
  if (parts[0] !== "Bearer") return null;
  return parts[1];
}

module.exports = async function handler(req, res) {
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

    const token = getToken(req);

    if (!token) {
      return res.status(400).json({
        error: "Token tidak ada"
      });
    }

    // hapus session dari Redis
    await del(`session:${token}`);

    return res.status(200).json({
      ok: true
    });

  } catch (e) {
    return res.status(500).json({
      error: e.message || "Server error"
    });

  }
}