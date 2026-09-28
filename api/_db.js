const { neon } = require("@neondatabase/serverless");
const sql = neon(process.env.DATABASE_URL || "postgres://x:x@localhost/x");
let ready;
function init() {
  return ready || (ready = sql`create table if not exists recepciones(
    id serial primary key, creado timestamptz not null default now(),
    nombre text, marca text, modelo text, placas text, data jsonb not null)`);
}
function auth(req, res) {
  if (!process.env.APP_PIN || !process.env.DATABASE_URL) {
    res.status(500).json({ error: "Falta configurar APP_PIN o DATABASE_URL en Vercel" });
    return false;
  }
  if (req.headers["x-pin"] !== process.env.APP_PIN) {
    res.status(401).json({ error: "PIN incorrecto" });
    return false;
  }
  return true;
}
module.exports = { sql, init, auth };
