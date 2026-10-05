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
      const cur = await sql`select data from recepciones where id=${id}`;
      if (!cur.length) return res.status(404).json({ error: "No existe" });
      // Campos editables permitidos (el resto del body se ignora por seguridad)
      const allowed = ["nombre","domicilio","tel","wa","correo","marca","modelo","color",
        "placas","serie","motor","km","falla","total","anticipo","gar","gDesde","gHasta",
        "gExc","estatus","mecanico","dmgNota"];
      const merged = { ...cur[0].data };
      for (const k of allowed) if (k in body) merged[k] = body[k];
      if (merged.estatus && !["Recibida","En reparación","Lista","Entregada"].includes(merged.estatus))
        return res.status(400).json({ error: "Estatus inválido" });
      await sql`update recepciones set data=${JSON.stringify(merged)}::jsonb,
        nombre=${merged.nombre||""}, marca=${merged.marca||""}, modelo=${merged.modelo||""}, placas=${merged.placas||""}
        where id=${id}`;
      return res.json({ ok: true, data: merged });
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
