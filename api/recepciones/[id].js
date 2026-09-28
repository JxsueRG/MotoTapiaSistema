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
