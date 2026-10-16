// POST /api/enviar
//  { tipo:"orden",    id, pdf:"<base64 del PDF>" }  → plantilla orden_recepcion_pdf al cliente
//  { tipo:"mecanico", id }                          → plantilla aviso_mecanico al mecánico asignado
// El número SIEMPRE sale de la base de datos (no se acepta un número arbitrario), para que nadie use tu API para spam.
const { sql, init, auth } = require("./_db");
const wa = require("./_wa");

const money = n => "$" + Number(n || 0).toLocaleString("es-MX", { minimumFractionDigits: 2 });
const fail = (res, out) => res.status(502).json({ error: out.data?.error?.message || "Meta rechazó el envío" });

module.exports = async (req, res) => {
  try {
    if (req.method !== "POST") return res.status(405).json({ error: "Método no permitido" });
    if (!auth(req, res)) return;
    await init();
    const { tipo, id, pdf } = req.body || {};
    const rows = await sql`select id,data from recepciones where id=${parseInt(id, 10) || 0}`;
    if (!rows.length) return res.status(404).json({ error: "No existe la orden" });
    const r = { ...rows[0].data, id: rows[0].id };
    const moto = `${r.marca || ""} ${r.modelo || ""}`.trim();

    if (tipo === "orden") {
      const tel = String(r.wa || r.tel || "").replace(/\D/g, "").slice(-10);
      if (tel.length !== 10) return res.status(400).json({ error: "La orden no tiene un WhatsApp válido" });
      if (!pdf) return res.status(400).json({ error: "Falta el PDF" });
      const archivo = `Orden_${r.id}_MotoTapia.pdf`;
      const mediaId = await wa.subirPdf(Buffer.from(pdf, "base64"), archivo);
      const out = await wa.plantillaPdf(tel, "orden_recepcion_pdf", mediaId, archivo,
        [r.nombre, r.id, moto, money((r.total || 0) - (r.anticipo || 0))]);
      return out.ok ? res.json({ ok: true }) : fail(res, out);
    }

    if (tipo === "mecanico") {
      const m = (await sql`select nombre,tel from mecanicos where id=${parseInt(r.mecanico, 10) || 0}`)[0];
      if (!m) return res.status(400).json({ error: "La orden no tiene mecánico asignado" });
      const out = await wa.plantilla(m.tel, "aviso_mecanico", [m.nombre, r.id, moto, r.falla || "Sin falla capturada"]);
      return out.ok ? res.json({ ok: true }) : fail(res, out);
    }
    res.status(400).json({ error: "tipo inválido" });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Error al enviar" });
  }
};
