const { sql, init, auth } = require("../_db");
module.exports = async (req, res) => {
  try {
    if (!auth(req, res)) return;
    await init();
    if (req.method === "GET") {
      const rows = await sql`select id,nombre,tel from mecanicos order by nombre asc`;
      return res.json(rows);
    }
    if (req.method === "POST") {
      const { nombre, tel } = req.body || {};
      if (!nombre || !tel) return res.status(400).json({ error: "Falta nombre o WhatsApp" });
      const r = await sql`insert into mecanicos(nombre,tel) values(${nombre},${tel}) returning id,nombre,tel`;
      return res.json(r[0]);
    }
    res.status(405).json({ error: "Método no permitido" });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Error de base de datos" });
  }
};
