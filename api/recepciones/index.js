const { sql, init, auth } = require("../_db");
module.exports = async (req, res) => {
  try {
    if (!auth(req, res)) return;
    await init();
    if (req.method === "GET") {
      const rows = await sql`select id,creado,nombre,marca,modelo,placas from recepciones order by id desc limit 300`;
      return res.json(rows);
    }
    if (req.method === "POST") {
      const d = req.body || {};
      delete d.id;
      const r = await sql`insert into recepciones(nombre,marca,modelo,placas,data)
        values(${d.nombre || ""},${d.marca || ""},${d.modelo || ""},${d.placas || ""},${JSON.stringify(d)}::jsonb)
        returning id,creado`;
      return res.json(r[0]);
    }
    res.status(405).json({ error: "Método no permitido" });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Error de base de datos" });
  }
};
