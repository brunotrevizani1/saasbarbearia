const db = require("../models/db");

// LISTAR agendamentos do painel do barbeiro
const listarAgendamentos = (req, res) => {
  const sql = `
    SELECT *
    FROM agendamentos
    WHERE status IN ('agendado', 'cancelado')
    ORDER BY
      CASE
        WHEN status = 'agendado' THEN 0
        WHEN status = 'cancelado' THEN 1
        ELSE 2
      END,
      data ASC,
      hora ASC
  `;

  db.query(sql, (err, result) => {
    if (err) {
      console.error("Erro ao buscar agendamentos:", err);
      return res.status(500).json({ erro: "Erro ao buscar agendamentos" });
    }

    res.json(result);
  });
};

// CONCLUIR agendamento
const concluirAgendamento = (req, res) => {
  const { id } = req.params;

  const sql = `
    UPDATE agendamentos
    SET status = 'concluido'
    WHERE id = ?
    AND status = 'agendado'
  `;

  db.query(sql, [id], (err, result) => {
    if (err) {
      console.error("Erro ao concluir:", err);
      return res.status(500).json({ erro: "Erro ao concluir agendamento" });
    }

    if (result.affectedRows === 0) {
      return res
        .status(400)
        .json({ erro: "Esse agendamento não pode ser concluído." });
    }

    res.json({ sucesso: true });
  });
};

// DELETAR agendamento
const deletarAgendamento = (req, res) => {
  const { id } = req.params;

  const sql = "DELETE FROM agendamentos WHERE id = ?";

  db.query(sql, [id], (err) => {
    if (err) {
      console.error("Erro ao deletar:", err);
      return res.status(500).json({ erro: "Erro ao deletar agendamento" });
    }

    res.json({ sucesso: true });
  });
};

// LISTAR dias bloqueados futuros
const listarDiasBloqueados = (req, res) => {
  const sql = `
    SELECT *
    FROM dias_bloqueados
    WHERE data >= CURDATE()
    ORDER BY data ASC
  `;

  db.query(sql, (err, result) => {
    if (err) {
      console.error("Erro ao buscar dias bloqueados:", err);
      return res.status(500).json({ erro: "Erro ao buscar dias bloqueados" });
    }

    res.json(result);
  });
};

// BLOQUEAR dia
const bloquearDia = (req, res) => {
  const { data, motivo } = req.body;

  if (!data) {
    return res.status(400).json({ erro: "Data obrigatória" });
  }

  const checkSql = "SELECT * FROM dias_bloqueados WHERE data = ?";

  db.query(checkSql, [data], (err, result) => {
    if (err) {
      console.error("Erro ao verificar dia bloqueado:", err);
      return res.status(500).json({ erro: "Erro ao verificar dia" });
    }

    if (result.length > 0) {
      return res.status(400).json({ erro: "Esse dia já está bloqueado" });
    }

    const insertSql = `
      INSERT INTO dias_bloqueados (data, motivo)
      VALUES (?, ?)
    `;

    db.query(insertSql, [data, motivo || null], (errInsert) => {
      if (errInsert) {
        console.error("Erro ao bloquear dia:", errInsert);
        return res.status(500).json({ erro: "Erro ao bloquear dia" });
      }

      res.json({ sucesso: true });
    });
  });
};

// DESBLOQUEAR dia
const desbloquearDia = (req, res) => {
  const { id } = req.params;

  const sql = "DELETE FROM dias_bloqueados WHERE id = ?";

  db.query(sql, [id], (err) => {
    if (err) {
      console.error("Erro ao desbloquear dia:", err);
      return res.status(500).json({ erro: "Erro ao desbloquear dia" });
    }

    res.json({ sucesso: true });
  });
};

// BUSCAR configuração da agenda
const buscarConfiguracaoAgenda = (req, res) => {
  const sql = `
    SELECT *
    FROM configuracoes_agenda
    ORDER BY id ASC
    LIMIT 1
  `;

  db.query(sql, (err, result) => {
    if (err) {
      console.error("Erro ao buscar configuração:", err);
      return res.status(500).json({ erro: "Erro ao buscar configuração" });
    }

    if (result.length === 0) {
      return res.status(404).json({ erro: "Configuração não encontrada" });
    }

    res.json(result[0]);
  });
};

// SALVAR configuração da agenda
const salvarConfiguracaoAgenda = (req, res) => {
  const {
    hora_inicio,
    hora_fim,
    intervalo,
    bloquear_sabado,
    bloquear_domingo,
    rua,
    numero,
    bairro,
    cidade,
  } = req.body;

  if (!hora_inicio || !hora_fim || !intervalo) {
    return res
      .status(400)
      .json({ erro: "Preencha todos os campos obrigatórios" });
  }

  const checkSql = "SELECT * FROM configuracoes_agenda ORDER BY id ASC LIMIT 1";

  db.query(checkSql, (err, result) => {
    if (err) {
      console.error("Erro ao verificar configuração:", err);
      return res.status(500).json({ erro: "Erro ao verificar configuração" });
    }

    if (result.length === 0) {
      const insertSql = `
        INSERT INTO configuracoes_agenda (
          hora_inicio,
          hora_fim,
          intervalo,
          bloquear_sabado,
          bloquear_domingo,
          rua,
          numero,
          bairro,
          cidade
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      db.query(
        insertSql,
        [
          hora_inicio,
          hora_fim,
          intervalo,
          bloquear_sabado ? 1 : 0,
          bloquear_domingo ? 1 : 0,
          rua || null,
          numero || null,
          bairro || null,
          cidade || null,
        ],
        (errInsert) => {
          if (errInsert) {
            console.error("Erro ao salvar configuração:", errInsert);
            return res
              .status(500)
              .json({ erro: "Erro ao salvar configuração" });
          }

          res.json({ sucesso: true });
        },
      );
    } else {
      const updateSql = `
        UPDATE configuracoes_agenda
        SET hora_inicio = ?,
            hora_fim = ?,
            intervalo = ?,
            bloquear_sabado = ?,
            bloquear_domingo = ?,
            rua = ?,
            numero = ?,
            bairro = ?,
            cidade = ?
        WHERE id = ?
      `;

      db.query(
        updateSql,
        [
          hora_inicio,
          hora_fim,
          intervalo,
          bloquear_sabado ? 1 : 0,
          bloquear_domingo ? 1 : 0,
          rua || null,
          numero || null,
          bairro || null,
          cidade || null,
          result[0].id,
        ],
        (errUpdate) => {
          if (errUpdate) {
            console.error("Erro ao atualizar configuração:", errUpdate);
            return res
              .status(500)
              .json({ erro: "Erro ao atualizar configuração" });
          }

          res.json({ sucesso: true });
        },
      );
    }
  });
};

module.exports = {
  listarAgendamentos,
  concluirAgendamento,
  deletarAgendamento,
  listarDiasBloqueados,
  bloquearDia,
  desbloquearDia,
  buscarConfiguracaoAgenda,
  salvarConfiguracaoAgenda,
};
