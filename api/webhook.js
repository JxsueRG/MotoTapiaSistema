// URL para Meta:  https://TU-PROYECTO.vercel.app/api/webhook
// Responde "soy un bot" + botón al chat de atención cada vez que un cliente escribe (máx. 1 por minuto por número).
// Todo queda registrado: míralo en /api/diagnostico?key=TU_VERIFY_TOKEN
const crypto = require("crypto");
const { sql } = require("./_db");
const wa = require("./_wa");
const { log } = require("./_log");

const ATENCION = "524521986831";
const ult4 = n => "***" + String(n || "").replace(/\D/g, "").slice(-4);

// Lee el cuerpo crudo (para validar la firma). Si Vercel ya lo consumió, devuelve null y se usa req.body.
const leerCrudo = req => new Promise(ok => {
  const c = []; let fin = false;
  const cerrar = v => { if (!fin) { fin = true; clearTimeout(t); ok(v); } };
  const t = setTimeout(() => cerrar(null), 2500);
  req.on("data", d => c.push(d));
  req.on("end", () => cerrar(Buffer.concat(c)));
  req.on("error", () => cerrar(null));
});

module.exports = async (req, res) => {
  // ---- 1) Verificación de Meta (GET) ----
  if (req.method === "GET") {
    const q = req.query || {};
    const modo = q["hub.mode"] || q.hub_mode, tok = q["hub.verify_token"] || q.hub_verify_token, reto = q["hub.challenge"] || q.hub_challenge;
    if (modo === "subscribe" && process.env.VERIFY_TOKEN && String(tok).trim() === String(process.env.VERIFY_TOKEN).trim()) {
      await log("VERIFICACION OK (Meta validó el webhook)");
      return res.status(200).send(reto);
    }
    await log("VERIFICACION RECHAZADA: el token que mandó Meta no coincide con VERIFY_TOKEN de Vercel (¿variable en Production + Redeploy?)");
    return res.status(403).send("Token invalido");
  }
  if (req.method !== "POST") return res.status(405).end();

  // ---- 2) Mensajes entrantes (POST) ----
  const raw = await leerCrudo(req);
  let datos = null;
  try {
    if (raw && raw.length) datos = JSON.parse(raw.toString("utf8"));
    else if (req.body) datos = typeof req.body === "string" ? JSON.parse(req.body) : Buffer.isBuffer(req.body) ? JSON.parse(req.body.toString("utf8")) : req.body;
  } catch (e) { /* queda null */ }

  const secreto = process.env.WA_APP_SECRET || "";
  if (secreto && raw && raw.length) {
    const esperada = "sha256=" + crypto.createHmac("sha256", secreto).update(raw).digest("hex");
    const firma = String(req.headers["x-hub-signature-256"] || "");
    if (firma.length !== esperada.length || !crypto.timingSafeEqual(Buffer.from(firma), Buffer.from(esperada))) {
      await log(`POST RECHAZADO: firma inválida. Revisa WA_APP_SECRET en Vercel (tiene ${secreto.length} caracteres; debe ser la "Clave secreta" de la app, sin espacios)`);
      return res.status(403).end();
    }
  } else if (!secreto) {
    await log("AVISO: WA_APP_SECRET está vacío, no se valida la firma");
  } else {
    await log("AVISO: no se pudo leer el cuerpo crudo, firma no verificada");
  }

  if (!datos || datos.object !== "whatsapp_business_account") {
    await log("POST ignorado: no es de whatsapp_business_account");
    return res.status(200).send("EVENT_RECEIVED");
  }
  await log("POST recibido de Meta");

  const seg = Number(process.env.WA_AUTOREPLY_SEGUNDOS ?? 60);
  try {
    await sql`create table if not exists wa_autoreply(tel text primary key, ultimo timestamptz not null)`;
    await sql`create table if not exists wa_msgs(id text primary key, ts timestamptz not null default now())`;
    for (const ent of datos.entry || []) for (const ch of ent.changes || []) {
      const v = ch.value || {};
      for (const st of v.statuses || []) {
        if (st.status === "failed") await log(`envío FALLÓ a ${ult4(st.recipient_id)}: ${st.errors?.[0]?.message || "?"}`);
      }
      for (const m of v.messages || []) {
        const de = String(m.from || "");
        if (!m.id || !de) continue;
        // evita duplicados cuando Meta reintenta el mismo mensaje
        const nuevo = await sql`insert into wa_msgs(id) values(${m.id}) on conflict (id) do nothing returning id`;
        if (!nuevo.length) continue;
        await sql`delete from wa_msgs where ts < now() - interval '3 days'`;
        if (de.replace(/\D/g, "") === ATENCION) { await log("mensaje de tu número de atención: no se contesta"); continue; }
        if (seg > 0) {
          const ok = await sql`insert into wa_autoreply(tel,ultimo) values(${de}, now())
            on conflict (tel) do update set ultimo = now()
            where wa_autoreply.ultimo < now() - (${seg} * interval '1 second') returning tel`;
          if (!ok.length) { await log(`mensaje de ${ult4(de)}: ya se le avisó hace menos de ${seg} s`); continue; }
        }
        const r = await wa.avisoBot(de);
        await log(`mensaje de ${ult4(de)} (${m.type || "?"}) -> ` + (r.ok ? (r.boton ? "RESPONDIDO con botón" : `RESPONDIDO en texto (el botón falló: ${r.errorBoton})`)
                                                                     : "FALLO: " + (r.data?.error?.message || "?")));
      }
    }
  } catch (e) { await log("ERROR interno: " + (e.message || e)); }
  res.status(200).send("EVENT_RECEIVED");
};
module.exports.config = { api: { bodyParser: false } };
