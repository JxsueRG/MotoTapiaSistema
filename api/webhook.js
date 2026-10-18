// URL para Meta:  https://TU-PROYECTO.vercel.app/api/webhook
const crypto = require("crypto");
const { sql } = require("./_db");
const wa = require("./_wa");

const AUTO_MSG =
  "Hola 👋 Este es un *mensaje automático*. Este número *no puede contestar mensajes*.\n\n" +
  "Para atención llama o escribe al *452 198 6831*:\nhttps://wa.me/524521986831\n\n— MOTO TAPIA SERVICE";

const AUTO_BODY =
  "Hola 👋 Soy el *asistente automático (bot)* de *MOTO TAPIA SERVICE*.\n\nEste número *no puede leer ni contestar mensajes*.\n\n" +
  "Para hablar con una persona toca el botón de abajo o llama al *452 198 6831*.";

const rawBody = req => new Promise((ok, fail) => {
  const c = []; req.on("data", d => c.push(d)); req.on("end", () => ok(Buffer.concat(c))); req.on("error", fail);
});

module.exports = async (req, res) => {
  if (req.method === "GET") {
    const q = req.query;
    if (q["hub.mode"] === "subscribe" && q["hub.verify_token"] === process.env.VERIFY_TOKEN)
      return res.status(200).send(q["hub.challenge"]);
    return res.status(403).end();
  }
  if (req.method !== "POST") return res.status(405).end();

  const raw = await rawBody(req);
  const esperada = "sha256=" + crypto.createHmac("sha256", process.env.WA_APP_SECRET || "").update(raw).digest("hex");
  const firma = req.headers["x-hub-signature-256"] || "";
  if (firma.length !== esperada.length || !crypto.timingSafeEqual(Buffer.from(firma), Buffer.from(esperada)))
    return res.status(403).end();

  try {
    const body = JSON.parse(raw.toString("utf8"));
    const msg = body?.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
    if (msg && msg.from !== "524521986831") {   // tu número de atención no recibe el aviso
      await sql`create table if not exists wa_autoreply(tel text primary key, ultimo timestamptz not null)`;
      // Responde cada vez que el cliente escribe (máx. 1 por minuto por número, atómico)
      const r = await sql`insert into wa_autoreply(tel,ultimo) values(${msg.from}, now())
        on conflict (tel) do update set ultimo = now()
        where wa_autoreply.ultimo < now() - interval '60 seconds' returning tel`;
      if (r.length) {
        const b = await wa.textoBoton(msg.from, AUTO_BODY, "Hablar con atención", "https://wa.me/524521986831");
        if (!b.ok) await wa.texto(msg.from, AUTO_MSG);   // respaldo en texto simple
      }
    }
  } catch (e) { console.error(e); }
  res.status(200).end();
};
module.exports.config = { api: { bodyParser: false } };
