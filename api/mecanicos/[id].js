const { sql, init, auth } = require("../_db");
module.exports = async (req, res) => {
  try {
    if (!auth(req, res)) return;
    await init();
    const id = parseInt(req.query.id, 10);
    if (!id) return res.status(400).json({ error: "ID inválido" });
    if (req.method === "DELETE") {
      await sql`delete from mecanicos where id=${id}`;
      return res.json({ ok: true });
    }
    res.status(405).json({ error: "Método no permitido" });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Error de base de datos" });
  }
};
