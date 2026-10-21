const V = process.env.WA_API_VERSION || "v21.0";
const BASE = `https://graph.facebook.com/${V}`;
const TOKEN = () => process.env.WHATSAPP_TOKEN;
const PHONE = () => process.env.PHONE_NUMBER_ID;
// Idioma de cada plantilla tal como está en Meta ("es" = Spanish). cita_mecanico quedó en inglés.
const LANGS = { cita_mecanico: "en", recordatorio_servicio: "en", cotizacion_pdf: "en" };
const lang = n => LANGS[n] || "es";
// Si Meta dice que la plantilla no existe en ese idioma (#132001), se prueba con los demás.
const IDIOMAS = ["es", "es_MX", "en", "en_US"];
const buenos = {}; // idioma que ya funcionó por plantilla (evita reintentos lentos)
async function enviarPlantilla(to, name, components) {
  const primero = buenos[name] || lang(name);
  const orden = [primero, ...IDIOMAS.filter(l => l !== primero)];
  let out;
  for (const code of orden) {
    out = await post({ messaging_product: "whatsapp", to: numero(to), type: "template",
      template: { name, language: { code }, ...(components.length ? { components } : {}) } });
    if (out.ok) { buenos[name] = code; return out; }
    if (out.data?.error?.code !== 132001) return out;
  }
  return out;
}

function numero(t) {
  let n = String(t || "").replace(/\D/g, "");
  if (n.length === 10) n = "52" + n;
  if (n.length === 13 && n.startsWith("521")) n = "52" + n.slice(3);
  return n;
}
const clean = v => (String(v ?? "").replace(/\s+/g, " ").trim().slice(0, 1000)) || "-";
const params = vars => vars.map(v => ({ type: "text", text: clean(v) }));

async function post(payload) {
  const r = await fetch(`${BASE}/${PHONE()}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${TOKEN()}`, "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(15000),
  });
  const data = await r.json().catch(() => ({}));
  return { ok: r.ok, data };
}

const texto = (to, body) =>
  post({ messaging_product: "whatsapp", to: numero(to), type: "text", text: { body, preview_url: true } });

const plantilla = (to, name, vars = []) =>
  enviarPlantilla(to, name, vars.length ? [{ type: "body", parameters: params(vars) }] : []);

// Mensaje interactivo con botón (solo dentro de las 24 h después de que el cliente escribió)
const textoBoton = (to, body, boton, url) =>
  post({ messaging_product: "whatsapp", to: numero(to), type: "interactive", interactive: {
    type: "cta_url", body: { text: body },
    action: { name: "cta_url", parameters: { display_text: String(boton).slice(0, 20), url } } } });

const CHAT_URL = "https://wa.me/524521986831";
const AVISO = "🤖 *Mensaje automático*\n\nHola 👋 Soy el asistente automático (bot) de *MOTO TAPIA SERVICE*. " +
  "Este número *no puede leer ni contestar mensajes*.\n\nPara hablar con una persona toca el botón de abajo o llama al *452 198 6831*.";

// Botón "Hablar con atención"; si Meta lo rechaza, manda el mismo aviso en texto simple con el enlace
async function avisoBot(to) {
  const r = await textoBoton(to, AVISO, "Hablar con atención", CHAT_URL);
  if (r.ok) return { ok: true, boton: true, data: r.data };
  const f = await texto(to, AVISO.replace("toca el botón de abajo", "escríbenos aquí") + "\n" + CHAT_URL);
  return { ok: f.ok, boton: false, data: f.data, errorBoton: r.data?.error?.message };
}

// Sube un PDF (Buffer) a Meta y devuelve el media id
async function subirPdf(buffer, filename) {
  const fd = new FormData();
  fd.append("messaging_product", "whatsapp");
  fd.append("type", "application/pdf");
  fd.append("file", new Blob([buffer], { type: "application/pdf" }), filename);
  const r = await fetch(`${BASE}/${PHONE()}/media`, { method: "POST", headers: { Authorization: `Bearer ${TOKEN()}` }, body: fd });
  const d = await r.json();
  if (!r.ok || !d.id) throw new Error("No se pudo subir el PDF: " + JSON.stringify(d));
  return d.id;
}

const plantillaPdf = (to, name, mediaId, filename, vars = []) =>
  enviarPlantilla(to, name, [
    { type: "header", parameters: [{ type: "document", document: { id: mediaId, filename } }] },
    ...(vars.length ? [{ type: "body", parameters: params(vars) }] : []),
  ]);

module.exports = { numero, texto, textoBoton, avisoBot, plantilla, subirPdf, plantillaPdf };
