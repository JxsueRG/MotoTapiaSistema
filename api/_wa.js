const V = process.env.WA_API_VERSION || "v21.0";
const BASE = `https://graph.facebook.com/${V}`;
const TOKEN = () => process.env.WHATSAPP_TOKEN;
const PHONE = () => process.env.PHONE_NUMBER_ID;
const LANG = "es_MX";

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
  });
  const data = await r.json().catch(() => ({}));
  return { ok: r.ok, data };
}

const texto = (to, body) =>
  post({ messaging_product: "whatsapp", to: numero(to), type: "text", text: { body, preview_url: true } });

const plantilla = (to, name, vars = []) =>
  post({ messaging_product: "whatsapp", to: numero(to), type: "template",
    template: { name, language: { code: LANG },
      components: vars.length ? [{ type: "body", parameters: params(vars) }] : [] } });

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
  post({ messaging_product: "whatsapp", to: numero(to), type: "template",
    template: { name, language: { code: LANG }, components: [
      { type: "header", parameters: [{ type: "document", document: { id: mediaId, filename } }] },
      ...(vars.length ? [{ type: "body", parameters: params(vars) }] : []),
    ] } });

module.exports = { numero, texto, plantilla, subirPdf, plantillaPdf };
