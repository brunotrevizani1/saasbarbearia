const express = require("express");
const router = express.Router();

const db = require("../models/db");

router.post("/login", (req, res) => {
  const { email, senha } = req.body;

  if (!email || !senha) {
    return res.status(400).json({ erro: "Preencha e-mail e senha." });
  }

  const sql = `
    SELECT id, nome, email
    FROM barbearias
    WHERE email = ?
    AND senha = ?
    LIMIT 1
  `;

  db.query(sql, [email, senha], (err, result) => {
    if (err) {
      console.error("Erro ao fazer login:", err);
      return res.status(500).json({ erro: "Erro ao fazer login." });
    }

    if (result.length === 0) {
      return res.status(401).json({ erro: "E-mail ou senha incorretos." });
    }

    res.json({
      sucesso: true,
      barbearia: result[0],
    });
  });
});

module.exports = router;
