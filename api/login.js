const crypto = require("crypto");
const readBody = require("./_body");

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ ok: false, reason: "method" });
  }

  const pw = String(process.env.PANEL_PASSWORD || "").trim();
  if (!pw) return res.status(200).json({ ok: true, reason: "no_password_set" });

  const body = await readBody(req);
  const given = String(body.password == null ? "" : body.password).trim();

  if (!given) return res.status(400).json({ ok: false, reason: "empty" });
  if (given !== pw) return res.status(401).json({ ok: false, reason: "wrong" });

  const t = crypto
    .createHash("sha256")
    .update(pw + "|salon-panel")
    .digest("hex");

  res.setHeader(
    "Set-Cookie",
    `panel_auth=${t}; Path=/; HttpOnly; SameSite=Lax; Secure; Max-Age=7776000`
  );
  return res.status(200).json({ ok: true });
};
