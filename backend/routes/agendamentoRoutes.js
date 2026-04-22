const express = require("express");
const router = express.Router();

const db = require("../models/db");

function gerarCodigo() {
  const caracteres = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let codigo = "";

  for (let i = 0; i < 6; i++) {
    codigo += caracteres.charAt(Math.floor(Math.random() * caracteres.length));
  }

  return codigo;
}

function gerarCodigoUnico(callback) {
  const codigo = gerarCodigo();

  const sql = "SELECT id FROM agendamentos WHERE codigo = ? LIMIT 1";

  db.query(sql, [codigo], (err, result) => {
    if (err) {
      callback(err, null);
      return;
    }

    if (result.length > 0) {
      gerarCodigoUnico(callback);
      return;
    }

    callback(null, codigo);
  });
}

// CRIAR agendamento
router.post("/agendar", (req, res) => {
  const { nome, telefone, data, hora } = req.body;

  if (!nome || !telefone || !data || !hora) {
    return res.status(400).json({ erro: "Preencha todos os campos." });
  }

  const checkSql = `
    SELECT id FROM agendamentos
    WHERE data = ?
    AND hora = ?
    AND status = 'agendado'
    LIMIT 1
  `;

  db.query(checkSql, [data, hora], (err, result) => {
    if (err) {
      return res.status(500).json({ erro: "Erro ao verificar horário." });
    }

    if (result.length > 0) {
      return res.status(400).json({ erro: "Horário já agendado." });
    }

    gerarCodigoUnico((erroCodigo, codigo) => {
      if (erroCodigo) {
        return res.status(500).json({ erro: "Erro ao gerar código." });
      }

      const insertSql = `
        INSERT INTO agendamentos (nome, telefone, data, hora, codigo, status)
        VALUES (?, ?, ?, ?, ?, 'agendado')
      `;

      db.query(insertSql, [nome, telefone, data, hora, codigo], (errInsert) => {
        if (errInsert) {
          return res.status(500).json({ erro: "Erro ao salvar agendamento." });
        }

        res.json({
          sucesso: true,
          codigo,
        });
      });
    });
  });
});

// LISTAR agendamentos
router.get("/agendamentos", (req, res) => {
  db.query(
    "SELECT * FROM agendamentos ORDER BY data ASC, hora ASC",
    (err, result) => {
      if (err) {
        return res.status(500).json({ erro: "Erro ao buscar agendamentos." });
      }

      res.json(result);
    },
  );
});

// BUSCAR agendamento para cancelamento pelo código
router.post("/cancelar/buscar", (req, res) => {
  const { codigo } = req.body;

  if (!codigo) {
    return res.status(400).json({ erro: "Informe o código de cancelamento." });
  }

  const sql = `
    SELECT id, nome, telefone, data, hora, codigo, status
    FROM agendamentos
    WHERE codigo = ?
    AND status = 'agendado'
    LIMIT 1
  `;

  db.query(sql, [codigo.toUpperCase().trim()], (err, result) => {
    if (err) {
      return res.status(500).json({ erro: "Erro ao buscar agendamento." });
    }

    if (result.length === 0) {
      return res
        .status(404)
        .json({ erro: "Agendamento não encontrado ou já cancelado." });
    }

    res.json({
      sucesso: true,
      agendamento: result[0],
    });
  });
});

// CANCELAR agendamento
router.post("/cancelar", (req, res) => {
  const { codigo } = req.body;

  if (!codigo) {
    return res.status(400).json({ erro: "Informe o código de cancelamento." });
  }

  const sql = `
    UPDATE agendamentos
    SET status = 'cancelado'
    WHERE codigo = ?
    AND status = 'agendado'
  `;

  db.query(sql, [codigo.toUpperCase().trim()], (err, result) => {
    if (err) {
      return res.status(500).json({ erro: "Erro ao cancelar agendamento." });
    }

    if (result.affectedRows === 0) {
      return res
        .status(404)
        .json({ erro: "Agendamento não encontrado ou já cancelado." });
    }

    res.json({ sucesso: true });
  });
});

// DELETAR agendamento por ID
router.delete("/agendamentos/:id", (req, res) => {
  const { id } = req.params;

  const sql = "DELETE FROM agendamentos WHERE id = ?";

  db.query(sql, [id], (err) => {
    if (err) {
      return res.status(500).json({ erro: "Erro ao deletar." });
    }

    res.json({ sucesso: true });
  });
});

module.exports = router;
