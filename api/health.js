// Teşhis ucu — hiçbir gizli değer döndürmez, sadece "tanımlı mı" bilgisini verir.
const { Pool } = require("pg");

// Neon/Vercel icin SSL sart; yerelde test ederken kapali olmali.
function sslOpt() {
  var u = String(process.env.DATABASE_URL || "");
  if (/@(localhost|127\.0\.0\.1)[:/]/.test(u)) return false;
  return { rejectUnauthorized: false };
}


module.exports = async (req, res) => {
  const out = {
    databaseUrlSet: !!process.env.DATABASE_URL,
    passwordSet: !!(process.env.PANEL_PASSWORD || "").trim(),
    passwordLength: String(process.env.PANEL_PASSWORD || "").trim().length,
    node: process.version,
    db: "denenmedi",
  };

  if (out.databaseUrlSet) {
    let pool;
    try {
      pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: sslOpt(),
        max: 1,
        connectionTimeoutMillis: 8000,
      });
      const c = await pool.connect();
      await c.query("select 1");
      c.release();
      out.db = "baglandi";
    } catch (e) {
      out.db = "hata: " + String((e && e.message) || e);
    } finally {
      if (pool) pool.end().catch(function () {});
    }
  }

  res.status(200).json(out);
};
