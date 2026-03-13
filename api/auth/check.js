const { get } = require("../_api.js");

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
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization");
  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }
  if (req.method !== "GET") {
    return res.status(405).json({
      error: "Method not allowed"
    });
  }

  try {
    const token = getToken(req);
    if (!token) {
      return res.status(401).json({
        error: "Token tidak ada"
      });
    }

    const username = await get(`session:${token}`);

    if (!username) {
      return res.status(401).json({
        error: "Session tidak valid"
      });
    }

    return res.status(200).json({
      ok: true,
      username
    });

  } catch (e) {
    return res.status(500).json({
      error: e.message || "Server error"
    });

  }
}

