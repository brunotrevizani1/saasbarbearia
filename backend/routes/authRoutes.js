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

router.put("/alterar-senha", (req, res) => {
  const { barbearia_id, senha_atual, nova_senha, confirmar_senha } = req.body;

  if (!barbearia_id || !senha_atual || !nova_senha || !confirmar_senha) {
    return res.status(400).json({ erro: "Preencha todos os campos." });
  }

  if (nova_senha !== confirmar_senha) {
    return res.status(400).json({ erro: "As novas senhas não conferem." });
  }

  const sqlCheck = `
    SELECT id
    FROM barbearias
    WHERE id = ?
    AND senha = ?
    LIMIT 1
  `;

  db.query(sqlCheck, [barbearia_id, senha_atual], (err, result) => {
    if (err) {
      console.error("Erro ao verificar senha:", err);
      return res.status(500).json({ erro: "Erro ao verificar senha." });
    }

    if (result.length === 0) {
      return res.status(401).json({ erro: "Senha atual incorreta." });
    }

    const sqlUpdate = `
      UPDATE barbearias
      SET senha = ?
      WHERE id = ?
    `;

    db.query(sqlUpdate, [nova_senha, barbearia_id], (errUpdate) => {
      if (errUpdate) {
        console.error("Erro ao alterar senha:", errUpdate);
        return res.status(500).json({ erro: "Erro ao alterar senha." });
      }

      res.json({ sucesso: true });
    });
  });
});

module.exports = router;
