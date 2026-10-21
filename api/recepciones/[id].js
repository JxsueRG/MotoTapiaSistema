const { sql, init, auth } = require("../_db");
module.exports = async (req, res) => {
  try {
    if (!auth(req, res)) return;
    await init();
    const id = parseInt(req.query.id, 10);
    if (!id) return res.status(400).json({ error: "ID inválido" });
    if (req.method === "GET") {
      const r = await sql`select id,creado,data from recepciones where id=${id}`;
      if (!r.length) return res.status(404).json({ error: "No existe" });
      return res.json({ ...r[0].data, id: r[0].id, creado: r[0].creado });
    }
    if (req.method === "PUT") {
      const body = req.body || {};
      // Campos editables permitidos (el resto del body se ignora por seguridad)
      const allowed = ["nombre","domicilio","tel","wa","correo","marca","modelo","color",
        "placas","serie","motor","km","falla","total","anticipo","gar","gDesde","gHasta",
        "gExc","estatus","mecanico","dmgNota"];
      const patch = {};
      for (const k of allowed) if (k in body) patch[k] = body[k];
      if (patch.estatus && !["Recibida","En reparación","Lista","Entregada"].includes(patch.estatus))
        return res.status(400).json({ error: "Estatus inválido" });
      // Se actualiza SOLO lo que cambió dentro de la base (jsonb ||). Antes se descargaba y
      // volvía a subir toda la orden con fotos y firma (varios MB) en cada cambio: eso era lo lento.
      const n = k => (k in patch ? String(patch[k] ?? "") : null);
      const r = await sql`update recepciones set
          data = data || ${JSON.stringify(patch)}::jsonb,
          nombre = coalesce(${n("nombre")}::text, nombre),
          marca = coalesce(${n("marca")}::text, marca),
          modelo = coalesce(${n("modelo")}::text, modelo),
          placas = coalesce(${n("placas")}::text, placas)
        where id=${id} returning id`;
      if (!r.length) return res.status(404).json({ error: "No existe" });
      return res.json({ ok: true });
    }
    if (req.method === "DELETE") {
      await sql`delete from recepciones where id=${id}`;
      return res.json({ ok: true });
    }
    res.status(405).json({ error: "Método no permitido" });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Error de base de datos" });
  }
};
