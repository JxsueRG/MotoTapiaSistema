// Abre:  https://TU-PROYECTO.vercel.app/api/diagnostico?key=TU_VERIFY_TOKEN
// Revisa por qué el bot no contesta. No muestra tokens.
const wa = require("./_wa");
const { ultimos } = require("./_log");

const BASE = `https://graph.facebook.com/${process.env.WA_API_VERSION || "v21.0"}`;
const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const ok = t => `<span style="color:#15803d;font-weight:700">✔ ${t}</span>`;
const mal = t => `<span style="color:#b91c1c;font-weight:700">✘ ${t}</span>`;
const av = t => `<span style="color:#b45309;font-weight:700">⚠ ${t}</span>`;
async function g(method, ruta) {
  try {
    const r = await fetch(`${BASE}/${ruta}`, { method, headers: { Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}` } });
    return await r.json();
  } catch (e) { return { error: { message: String(e.message || e) } }; }
}

module.exports = async (req, res) => {
  const key = String(req.query.key || "");
  if (!process.env.VERIFY_TOKEN || key !== process.env.VERIFY_TOKEN) return res.status(403).send("403");
  const K = encodeURIComponent(key), out = [];
  const env = n => !!process.env[n];

  out.push("<h2>1. Variables en Vercel (entorno Production)</h2>");
  for (const n of ["WHATSAPP_TOKEN", "PHONE_NUMBER_ID", "VERIFY_TOKEN"]) out.push(`<div class="f">${env(n) ? ok(n + " configurada") : mal(n + " FALTA")}</div>`);
  out.push(`<div class="f">${env("WA_APP_SECRET") ? ok("WA_APP_SECRET configurada (" + process.env.WA_APP_SECRET.length + " caracteres)") : av("WA_APP_SECRET vacía: el bot funciona, pero no valida que los mensajes vengan de Meta")}</div>`);

  const tok = await g("GET", `debug_token?input_token=${encodeURIComponent(process.env.WHATSAPP_TOKEN || "")}`);
  const num = await g("GET", `${process.env.PHONE_NUMBER_ID}?fields=display_phone_number,verified_name,quality_rating,status,webhook_configuration`);
  out.push("<h2>2. Número y token</h2>");
  if (num.error) out.push(`<div class="f">${mal("El token o el PHONE_NUMBER_ID no funcionan: " + esc(num.error.message))}</div>`);
  else {
    out.push(`<div class="f">${ok("Token válido")} · Número: <b>${esc(num.display_phone_number)}</b> (${esc(num.verified_name)}) · Estado: <b>${esc(num.status)}</b> · Calidad: <b>${esc(num.quality_rating)}</b></div>`);
    const wc = num.webhook_configuration || {};
    const propio = wc.phone_number || wc.whatsapp_business_account;
    if (propio) out.push(`<div class="f">${av("Este número/cuenta tiene un webhook PROPIO y Meta usa ese:")}<br><small>${esc(propio)}</small></div>`);
    out.push(`<div class="f">Webhook de la app (el que se verificó): <small>${esc(wc.application || "(ninguno configurado)")}</small> ${wc.application ? "" : mal("Falta configurarlo en Meta")}</div>`);
  }
  const scopes = tok.data?.scopes || [];
  if (scopes.length) {
    out.push(`<div class="f">${scopes.includes("whatsapp_business_messaging") ? ok("Puede ENVIAR mensajes") : mal("Falta whatsapp_business_messaging")}</div>`);
    out.push(`<div class="f">${scopes.includes("whatsapp_business_management") ? ok("Puede ADMINISTRAR la cuenta") : mal("Falta whatsapp_business_management (no se podrá suscribir la app)")}</div>`);
  }

  // cuenta de WhatsApp Business (WABA)
  let wabas = [];
  for (const sc of tok.data?.granular_scopes || []) if (sc.scope === "whatsapp_business_management") wabas.push(...(sc.target_ids || []));
  const manual = String(req.query.waba || "").replace(/\D/g, "");
  if (manual) wabas.push(manual);
  wabas = [...new Set(wabas)];
  let msgAccion = "";
  const sus = String(req.query.suscribir || "").replace(/\D/g, "");
  if (sus) { const r = await g("POST", `${sus}/subscribed_apps`); msgAccion = r.success ? ok("Listo: la app quedó suscrita a tu cuenta de WhatsApp.") : mal("No se pudo: " + esc(r.error?.message || "error")); }

  out.push("<h2>3. ¿Tu cuenta de WhatsApp está suscrita a la app? <small>(causa muy común)</small></h2>");
  if (msgAccion) out.push(`<div class="f">${msgAccion}</div>`);
  if (!wabas.length) out.push(`<div class="f">${av("No pude detectar tu cuenta de WhatsApp Business.")}<br><small>Escribe su ID (Meta → WhatsApp → Configuración de la API, debajo del número: “Identificador de la cuenta de WhatsApp Business”) y recarga con <code>&amp;waba=ID</code> al final de la dirección.</small></div>`);
  for (const w of wabas) {
    const info = await g("GET", `${w}?fields=id,name`);
    const sub = await g("GET", `${w}/subscribed_apps`);
    const apps = sub.data || [];
    let linea;
    if (info.error) linea = mal("Meta no deja leer este ID con tu token: " + esc(info.error.message));
    else if (sub.error) linea = av("No se pudo leer la suscripción: " + esc(sub.error.message));
    else if (apps.length) linea = ok("tiene apps suscritas") + ` <small>${esc(apps.map(a => a.whatsapp_business_api_data?.name || a.name || "?").join(", "))}</small>`;
    else linea = mal("NO tiene ninguna app suscrita: por eso Meta no manda los mensajes") + `<br><a class="b" href="?key=${K}&waba=${w}&suscribir=${w}">Suscribir mi app a esta cuenta</a>`;
    out.push(`<div class="f">Cuenta <b>${esc(w)}</b> ${esc(info.name || "")}<br>${linea}</div>`);
  }

  out.push("<h2>4. Probar el aviso con botón</h2>");
  const probar = String(req.query.probar || "").replace(/\D/g, "");
  if (probar) {
    const r = await wa.avisoBot(probar);
    out.push(`<div class="f">${r.ok ? ok(r.boton ? "Enviado con botón" : "Enviado en texto (el botón falló: " + esc(r.errorBoton) + ")") : mal("Falló: " + esc(r.data?.error?.message))}</div>`);
  }
  out.push(`<div class="f"><small>Escríbele primero al número de la API desde tu celular y luego pon aquí tu número (10 dígitos):</small>
    <form method="get"><input type="hidden" name="key" value="${esc(key)}"><input name="probar" inputmode="numeric" placeholder="4521234567"> <button>Enviar prueba</button></form></div>`);

  out.push("<h2>5. Últimos eventos del bot</h2>");
  const lg = await ultimos(30);
  out.push(lg.length ? `<pre>${lg.map(l => esc(new Date(l.ts).toLocaleString("es-MX", { timeZone: "America/Mexico_City" }) + "  " + l.txt)).join("\n")}</pre>`
                     : `<div class="f">${av("Todavía no ha llegado NINGÚN evento de Meta a este webhook.")}<br><small>Escribe al número desde tu celular y recarga. Si sigue vacío: la cuenta no está suscrita (punto 3), el campo <b>messages</b> no está suscrito, o la URL del webhook en Meta no es esta.</small></div>`);

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.status(200).send(`<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Diagnóstico WhatsApp</title>
<style>body{font-family:system-ui,Arial,sans-serif;background:#f1f5f9;margin:0;padding:16px;color:#0f172a}.c{max-width:760px;margin:0 auto;background:#fff;border-radius:14px;padding:20px;box-shadow:0 4px 16px rgba(0,0,0,.08)}
h1{font-size:1.3rem;margin-top:0}h2{font-size:1.05rem;margin:22px 0 6px}.f{padding:7px 0;border-bottom:1px solid #eef2f7}pre{background:#0f172a;color:#e2e8f0;padding:12px;border-radius:10px;overflow:auto;font-size:12.5px;white-space:pre-wrap}
button,.b{background:#ff5a00;color:#fff;border:0;border-radius:10px;padding:9px 14px;font-weight:700;cursor:pointer;text-decoration:none;display:inline-block;margin-top:6px}input{padding:9px;border:1px solid #cbd5e1;border-radius:8px}small{color:#64748b}</style></head>
<body><div class="c"><h1>🔎 Diagnóstico del bot de WhatsApp · MOTO TAPIA</h1>${out.join("\n")}</div></body></html>`);
};
