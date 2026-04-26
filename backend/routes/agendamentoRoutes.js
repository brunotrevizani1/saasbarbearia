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

// LISTAR barbeiros públicos da barbearia
router.get("/barbeiros", (req, res) => {
  const { barbearia_id } = req.query;

  if (!barbearia_id) {
    return res.status(400).json({ erro: "Barbearia não informada." });
  }

  const sql = `
    SELECT id, nome
    FROM barbeiros
    WHERE barbearia_id = ?
    AND ativo = 1
    ORDER BY nome ASC
  `;

  db.query(sql, [barbearia_id], (err, result) => {
    if (err) {
      console.error("Erro ao buscar barbeiros:", err);
      return res.status(500).json({ erro: "Erro ao buscar barbeiros." });
    }

    res.json(result);
  });
});

// CRIAR agendamento
router.post("/agendar", (req, res) => {
  const { nome, telefone, data, hora, barbearia_id, barbeiro_id } = req.body;

  if (!nome || !telefone || !data || !hora || !barbearia_id || !barbeiro_id) {
    return res.status(400).json({ erro: "Preencha todos os campos." });
  }

  const checkSql = `
    SELECT id
    FROM agendamentos
    WHERE data = ?
    AND hora = ?
    AND status = 'agendado'
    AND barbearia_id = ?
    AND barbeiro_id = ?
    LIMIT 1
  `;

  db.query(checkSql, [data, hora, barbearia_id, barbeiro_id], (err, result) => {
    if (err) {
      console.error("Erro ao verificar horário:", err);
      return res.status(500).json({ erro: "Erro ao verificar horário." });
    }

    if (result.length > 0) {
      return res.status(400).json({ erro: "Horário já agendado." });
    }

    gerarCodigoUnico((erroCodigo, codigo) => {
      if (erroCodigo) {
        console.error("Erro ao gerar código:", erroCodigo);
        return res.status(500).json({ erro: "Erro ao gerar código." });
      }

      const insertSql = `
        INSERT INTO agendamentos
        (nome, telefone, data, hora, codigo, status, barbearia_id, barbeiro_id)
        VALUES (?, ?, ?, ?, ?, 'agendado', ?, ?)
      `;

      db.query(
        insertSql,
        [nome, telefone, data, hora, codigo, barbearia_id, barbeiro_id],
        (errInsert) => {
          if (errInsert) {
            console.error("Erro ao salvar agendamento:", errInsert);
            return res
              .status(500)
              .json({ erro: "Erro ao salvar agendamento." });
          }

          res.json({
            sucesso: true,
            codigo,
          });
        },
      );
    });
  });
});

// LISTAR agendamentos da barbearia/barbeiro
router.get("/agendamentos", (req, res) => {
  const { barbearia_id, barbeiro_id } = req.query;

  if (!barbearia_id) {
    return res.status(400).json({ erro: "Barbearia não informada." });
  }

  let sql = `
    SELECT *
    FROM agendamentos
    WHERE barbearia_id = ?
  `;

  const params = [barbearia_id];

  if (barbeiro_id) {
    sql += ` AND barbeiro_id = ? `;
    params.push(barbeiro_id);
  }

  sql += ` ORDER BY data ASC, hora ASC `;

  db.query(sql, params, (err, result) => {
    if (err) {
      console.error("Erro ao buscar agendamentos:", err);
      return res.status(500).json({ erro: "Erro ao buscar agendamentos." });
    }

    res.json(result);
  });
});

// BUSCAR agendamento para cancelamento pelo código
router.post("/cancelar/buscar", (req, res) => {
  const { codigo, barbearia_id } = req.body;

  if (!codigo || !barbearia_id) {
    return res.status(400).json({ erro: "Informe o código de cancelamento." });
  }

  const sql = `
    SELECT 
      agendamentos.id,
      agendamentos.nome,
      agendamentos.telefone,
      agendamentos.data,
      agendamentos.hora,
      agendamentos.codigo,
      agendamentos.status,
      agendamentos.barbearia_id,
      agendamentos.barbeiro_id,
      barbeiros.nome AS barbeiro_nome
    FROM agendamentos
    LEFT JOIN barbeiros ON barbeiros.id = agendamentos.barbeiro_id
    WHERE agendamentos.codigo = ?
    AND agendamentos.barbearia_id = ?
    AND agendamentos.status = 'agendado'
    LIMIT 1
  `;

  db.query(sql, [codigo.toUpperCase().trim(), barbearia_id], (err, result) => {
    if (err) {
      console.error("Erro ao buscar agendamento:", err);
      return res.status(500).json({ erro: "Erro ao buscar agendamento." });
    }

    if (result.length === 0) {
      return res.status(404).json({
        erro: "Agendamento não encontrado ou já cancelado.",
      });
    }

    res.json({
      sucesso: true,
      agendamento: result[0],
    });
  });
});

// CANCELAR agendamento
router.post("/cancelar", (req, res) => {
  const { codigo, barbearia_id } = req.body;

  if (!codigo || !barbearia_id) {
    return res.status(400).json({ erro: "Informe o código de cancelamento." });
  }

  const sql = `
    UPDATE agendamentos
    SET status = 'cancelado'
    WHERE codigo = ?
    AND barbearia_id = ?
    AND status = 'agendado'
  `;

  db.query(sql, [codigo.toUpperCase().trim(), barbearia_id], (err, result) => {
    if (err) {
      console.error("Erro ao cancelar agendamento:", err);
      return res.status(500).json({ erro: "Erro ao cancelar agendamento." });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({
        erro: "Agendamento não encontrado ou já cancelado.",
      });
    }

    res.json({ sucesso: true });
  });
});

// DELETAR agendamento por ID
router.delete("/agendamentos/:id", (req, res) => {
  const { id } = req.params;
  const { barbearia_id } = req.query;

  if (!barbearia_id) {
    return res.status(400).json({ erro: "Barbearia não informada." });
  }

  const sql = `
    DELETE FROM agendamentos
    WHERE id = ?
    AND barbearia_id = ?
  `;

  db.query(sql, [id, barbearia_id], (err) => {
    if (err) {
      console.error("Erro ao deletar:", err);
      return res.status(500).json({ erro: "Erro ao deletar." });
    }

    res.json({ sucesso: true });
  });
});

module.exports = router;
