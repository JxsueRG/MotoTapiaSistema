// Registro de eventos del bot (se guarda en tu base Neon; lo lees en /api/diagnostico)
const { sql } = require("./_db");

async function log(txt) {
  console.log(txt);
  try {
    await sql`create table if not exists wa_log(id serial primary key, ts timestamptz not null default now(), txt text not null)`;
    await sql`insert into wa_log(txt) values(${String(txt).slice(0, 480)})`;
    await sql`delete from wa_log where ts < now() - interval '7 days'`;
  } catch (e) { /* el registro nunca debe romper el bot */ }
}
async function ultimos(n = 30) {
  try { return await sql`select ts, txt from wa_log order by id desc limit ${n}`; } catch (e) { return []; }
}
module.exports = { log, ultimos };
