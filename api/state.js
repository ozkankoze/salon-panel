const { Pool } = require("pg");
const crypto = require("crypto");
const readBody = require("./_body");
const SEED = require("./_seed");

// Neon/Vercel icin SSL sart; yerelde test ederken kapali olmali.
function sslOpt() {
  var u = String(process.env.DATABASE_URL || "");
  if (/@(localhost|127\.0\.0\.1)[:/]/.test(u)) return false;
  return { rejectUnauthorized: false };
}


const ID = "main";
const VALUES = ["sent", "trial", "sale", "no"];

// Bir salon aynı anda birden çok işaret taşıyabilir (ör. "trial,sale").
// Gelen değeri temizler, sıraya sokar, tekrarları atar. Gecersizse null doner.
function normStatus(v) {
  const parts = String(v == null ? "" : v)
    .split(",")
    .map((s) => s.trim())
    .filter((s) => VALUES.includes(s));
  const out = VALUES.filter((k) => parts.includes(k));
  return out.length ? out.join(",") : null;
}

let pool;
function db() {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: sslOpt(),
      max: 1,
    });
  }
  return pool;
}

function token() {
  return crypto
    .createHash("sha256")
    .update(String(process.env.PANEL_PASSWORD || "") + "|salon-panel")
    .digest("hex");
}

function authed(req) {
  if (!process.env.PANEL_PASSWORD) return true; // şifre tanımlı değilse herkese açık
  const m = /(?:^|;\s*)panel_auth=([a-f0-9]{64})/.exec(req.headers.cookie || "");
  return !!m && m[1] === token();
}

async function ensure(c) {
  await c.query(
    `create table if not exists panel_state (
       id text primary key,
       data jsonb not null,
       updated_at timestamptz not null default now()
     )`
  );
  await c.query(
    `insert into panel_state (id, data)
     values ($1, '{"status":{},"tpl":null}'::jsonb)
     on conflict (id) do nothing`,
    [ID]
  );

  // Ilk kurulumda eldeki isaretleri ve mesaj kayitlarini bir kere yukle.
  // Zaten panelde olan bir isaret varsa o kazanir (seed altta kalir).
  // Mesaj kaydi zaten varsa hic dokunulmaz.
  await c.query(
    `update panel_state
     set data = jsonb_set(
           jsonb_set(
             jsonb_set(data, '{status}',
               $2::jsonb || coalesce(data->'status', '{}'::jsonb), true),
             '{log}',
             case when coalesce(jsonb_array_length(data->'log'), 0) > 0
                  then data->'log' else $3::jsonb end, true),
           '{seeded}', 'true'::jsonb, true),
         updated_at = now()
     where id = $1
       and coalesce(data->'seeded', 'false'::jsonb) <> 'true'::jsonb`,
    [ID, JSON.stringify(SEED.status || {}), JSON.stringify(SEED.log || [])]
  );
}

// 0501 589 46 11 / +90 501... / 501... hepsi 10 haneye iner.
function normTel(v) {
  let t = String(v == null ? "" : v).replace(/\D/g, "");
  if (t.length === 12 && t.slice(0, 2) === "90") t = t.slice(2);
  if (t.length === 11 && t.charAt(0) === "0") t = t.slice(1);
  return t.slice(0, 10);
}

const MAX_CUSTOM = 20000;

// Elle (Excel/CSV ile) eklenen salonlar panel_state.data.custom icinde durur.
// index.html icindeki hazir SALONS listesine hic dokunulmaz.
async function writeCustom(c, list) {
  await c.query(
    `update panel_state
     set data = jsonb_set(data, '{custom}', $2::jsonb, true), updated_at = now()
     where id = $1`,
    [ID, JSON.stringify(list.slice(0, MAX_CUSTOM))]
  );
}

function cleanText(v, n) {
  return String(v == null ? "" : v).replace(/\s+/g, " ").trim().slice(0, n);
}

// @kullanici / instagram.com/kullanici / bos -> sade kullanici adi
function cleanUser(v) {
  let u = String(v == null ? "" : v).trim();
  u = u.replace(/^https?:\/\/(www\.)?instagram\.com\//i, "");
  u = u.replace(/[?/].*$/, "").replace(/^@+/, "");
  return u.replace(/[^A-Za-z0-9._]/g, "").slice(0, 60);
}

async function writeLog(c, log) {
  await c.query(
    `update panel_state
     set data = jsonb_set(data, '{log}', $2::jsonb, true), updated_at = now()
     where id = $1`,
    [ID, JSON.stringify(log.filter(Boolean).slice(-5000))]
  );
}

async function current(c) {
  const r = await c.query("select data, updated_at from panel_state where id=$1", [ID]);
  const row = r.rows[0];
  return {
    status: row.data.status || {},
    tpl: row.data.tpl,
    log: row.data.log || [],
    custom: row.data.custom || [],
    updatedAt: row.updated_at,
  };
}

module.exports = async (req, res) => {
  if (!process.env.DATABASE_URL) {
    return res.status(500).json({ error: "DATABASE_URL tanımlı değil" });
  }
  if (!authed(req)) return res.status(401).json({ error: "auth" });

  let c;
  try {
    c = await db().connect();
    await ensure(c);

    if (req.method === "GET") {
      return res.status(200).json(await current(c));
    }

    if (req.method === "POST") {
      const body = await readBody(req);

      if (body.op === "set") {
        const user = String(body.user || "").slice(0, 120);
        if (!user) return res.status(400).json({ error: "user" });

        if (body.value === null || body.value === undefined) {
          await c.query(
            `update panel_state
             set data = jsonb_set(data, '{status}', coalesce(data->'status','{}'::jsonb) - $2, true),
                 updated_at = now()
             where id = $1`,
            [ID, user]
          );
        } else {
          const value = normStatus(body.value);
          if (!value) return res.status(400).json({ error: "value" });
          await c.query(
            `update panel_state
             set data = jsonb_set(data, '{status}',
                   coalesce(data->'status','{}'::jsonb) || jsonb_build_object($2::text, $3::text), true),
                 updated_at = now()
             where id = $1`,
            [ID, user, value]
          );
        }
      } else if (body.op === "tpl") {
        await c.query(
          `update panel_state
           set data = jsonb_set(data, '{tpl}', to_jsonb($2::text), true),
               updated_at = now()
           where id = $1`,
          [ID, String(body.tpl == null ? "" : body.tpl).slice(0, 5000)]
        );
      } else if (body.op === "log_add") {
        const tel = normTel(body.tel);
        const date = String(body.date || "").slice(0, 10);
        const count = Math.round(Number(body.count));
        if (tel.length < 10) return res.status(400).json({ error: "tel" });
        if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return res.status(400).json({ error: "date" });
        if (!isFinite(count) || count < 1 || count > 100000)
          return res.status(400).json({ error: "count" });

        const log = (await current(c)).log.slice();
        let hit = -1;
        for (let i = 0; i < log.length; i++) {
          if (log[i] && log[i].tel === tel && log[i].date === date) hit = i;
        }
        // Ayni numara + ayni gun tekrar girilirse sayiyi ustune ekle.
        if (hit >= 0) {
          log[hit] = Object.assign({}, log[hit], {
            count: Math.min(100000, (Number(log[hit].count) || 0) + count),
          });
        } else {
          log.push({ id: crypto.randomBytes(8).toString("hex"), tel, date, count });
        }
        await writeLog(c, log);
      } else if (body.op === "log_set") {
        const lid = String(body.id || "");
        const count = Math.round(Number(body.count));
        if (!lid) return res.status(400).json({ error: "id" });
        if (!isFinite(count) || count < 0 || count > 100000)
          return res.status(400).json({ error: "count" });

        await writeLog(
          c,
          (await current(c)).log.map((e) =>
            e && e.id === lid ? Object.assign({}, e, { count }) : e
          )
        );
      } else if (body.op === "log_del") {
        const lid = String(body.id || "");
        if (!lid) return res.status(400).json({ error: "id" });
        await writeLog(c, (await current(c)).log.filter((e) => !e || e.id !== lid));
      } else if (body.op === "salon_add") {
        // Excel/CSV'den gelen satirlari ekler. Var olan hicbir kaydi degistirmez.
        const rows = Array.isArray(body.rows) ? body.rows.slice(0, 2000) : null;
        if (!rows) return res.status(400).json({ error: "rows" });

        const list = (await current(c)).custom.slice();
        const seenTel = new Set(list.map((r) => r.tel));
        const seenUser = new Set(list.map((r) => r.user).filter(Boolean));
        const added = [];
        const skipped = [];

        for (const r of rows) {
          const tel = normTel(r && r.tel);
          const name = cleanText(r && r.name, 160);
          if (!/^5\d{9}$/.test(tel)) { skipped.push({ name, tel, why: "tel" }); continue; }
          if (!name) { skipped.push({ name, tel, why: "isim" }); continue; }
          if (seenTel.has(tel)) { skipped.push({ name, tel, why: "tekrar" }); continue; }

          // kullanici adi yoksa telefondan sabit bir anahtar uret (isaretler buna baglanir)
          let user = cleanUser(r && r.user);
          if (!user) user = "tel-" + tel;
          if (seenUser.has(user)) user = user + "-" + tel.slice(-4);

          const rec = {
            name: name,
            user: user,
            tel: tel,
            ilce: cleanText(r && r.ilce, 80),
            izin: cleanText(r && r.izin, 80),
            izinTarihi: /^\d{4}-\d{2}-\d{2}$/.test(String(r && r.izinTarihi || "")) ? String(r.izinTarihi) : "",
            eklendi: new Date().toISOString().slice(0, 10),
            kaynak: "elle",
          };
          list.push(rec);
          seenTel.add(tel);
          seenUser.add(user);
          added.push(rec);
        }

        if (list.length > MAX_CUSTOM) return res.status(400).json({ error: "limit" });
        if (added.length) await writeCustom(c, list);

        const out = await current(c);
        out.eklenen = added.length;
        out.atlanan = skipped;
        return res.status(200).json(out);
      } else if (body.op === "salon_del") {
        // SADECE elle eklenen kayitlari kaldirir; hazir listeye erisemez.
        const tel = normTel(body.tel);
        if (!/^5\d{9}$/.test(tel)) return res.status(400).json({ error: "tel" });
        const list = (await current(c)).custom;
        const kalan = list.filter((r) => r.tel !== tel);
        if (kalan.length !== list.length) await writeCustom(c, kalan);
      } else if (body.op === "reset") {
        await c.query(
          `update panel_state
           set data = jsonb_set(data, '{status}', '{}'::jsonb, true), updated_at = now()
           where id = $1`,
          [ID]
        );
      } else {
        return res.status(400).json({ error: "op" });
      }

      return res.status(200).json(await current(c));
    }

    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ error: "method" });
  } catch (e) {
    return res.status(500).json({ error: String((e && e.message) || e) });
  } finally {
    if (c) c.release();
  }
};
