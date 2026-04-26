const db = require("../models/db");

function pegarBarbeariaId(req) {
  return req.query?.barbearia_id || req.body?.barbearia_id;
}

function pegarBarbeiroId(req) {
  return req.query?.barbeiro_id || req.body?.barbeiro_id;
}

/* =========================
   BARBEIROS
========================= */

// LISTAR barbeiros da barbearia
const listarBarbeiros = (req, res) => {
  const barbearia_id = pegarBarbeariaId(req);

  if (!barbearia_id) {
    return res.status(400).json({ erro: "Barbearia não informada." });
  }

  const sql = `
    SELECT *
    FROM barbeiros
    WHERE barbearia_id = ?
    ORDER BY nome ASC
  `;

  db.query(sql, [barbearia_id], (err, result) => {
    if (err) {
      console.error("Erro ao buscar barbeiros:", err);
      return res.status(500).json({ erro: "Erro ao buscar barbeiros." });
    }

    res.json(result);
  });
};

// CRIAR barbeiro
const criarBarbeiro = (req, res) => {
  const { nome } = req.body;
  const barbearia_id = pegarBarbeariaId(req);

  if (!barbearia_id) {
    return res.status(400).json({ erro: "Barbearia não informada." });
  }

  if (!nome || !nome.trim()) {
    return res.status(400).json({ erro: "Informe o nome do barbeiro." });
  }

  const sql = `
    INSERT INTO barbeiros (nome, barbearia_id, ativo)
    VALUES (?, ?, 1)
  `;

  db.query(sql, [nome.trim(), barbearia_id], (err, result) => {
    if (err) {
      console.error("Erro ao criar barbeiro:", err);
      return res.status(500).json({ erro: "Erro ao criar barbeiro." });
    }

    const barbeiro_id = result.insertId;

    const configSql = `
      INSERT INTO configuracoes_agenda (
        hora_inicio,
        hora_fim,
        intervalo,
        almoco_inicio,
        almoco_fim,
        bloquear_sabado,
        bloquear_domingo,
        barbearia_id,
        barbeiro_id
      )
      VALUES ('08:00', '18:00', 30, NULL, NULL, 0, 1, ?, ?)
    `;

    db.query(configSql, [barbearia_id, barbeiro_id], (errConfig) => {
      if (errConfig) {
        console.error("Erro ao criar configuração do barbeiro:", errConfig);
        return res.status(500).json({
          erro: "Barbeiro criado, mas erro ao criar configuração da agenda.",
        });
      }

      res.json({
        sucesso: true,
        barbeiro: {
          id: barbeiro_id,
          nome: nome.trim(),
          barbearia_id,
          ativo: 1,
        },
      });
    });
  });
};

// ATUALIZAR barbeiro
const atualizarBarbeiro = (req, res) => {
  const { id } = req.params;
  const { nome, ativo } = req.body;
  const barbearia_id = pegarBarbeariaId(req);

  if (!barbearia_id) {
    return res.status(400).json({ erro: "Barbearia não informada." });
  }

  if (!nome || !nome.trim()) {
    return res.status(400).json({ erro: "Informe o nome do barbeiro." });
  }

  const sql = `
    UPDATE barbeiros
    SET nome = ?,
        ativo = ?
    WHERE id = ?
    AND barbearia_id = ?
  `;

  db.query(
    sql,
    [nome.trim(), ativo ? 1 : 0, id, barbearia_id],
    (err, result) => {
      if (err) {
        console.error("Erro ao atualizar barbeiro:", err);
        return res.status(500).json({ erro: "Erro ao atualizar barbeiro." });
      }

      if (result.affectedRows === 0) {
        return res.status(404).json({ erro: "Barbeiro não encontrado." });
      }

      res.json({ sucesso: true });
    },
  );
};

// DELETAR barbeiro
const deletarBarbeiro = (req, res) => {
  const { id } = req.params;
  const barbearia_id = pegarBarbeariaId(req);

  if (!barbearia_id) {
    return res.status(400).json({ erro: "Barbearia não informada." });
  }

  const checkSql = `
    SELECT id
    FROM agendamentos
    WHERE barbeiro_id = ?
    AND barbearia_id = ?
    LIMIT 1
  `;

  db.query(checkSql, [id, barbearia_id], (errCheck, resultCheck) => {
    if (errCheck) {
      console.error("Erro ao verificar barbeiro:", errCheck);
      return res.status(500).json({ erro: "Erro ao verificar barbeiro." });
    }

    if (resultCheck.length > 0) {
      const updateSql = `
        UPDATE barbeiros
        SET ativo = 0
        WHERE id = ?
        AND barbearia_id = ?
      `;

      db.query(updateSql, [id, barbearia_id], (errUpdate) => {
        if (errUpdate) {
          console.error("Erro ao desativar barbeiro:", errUpdate);
          return res.status(500).json({ erro: "Erro ao desativar barbeiro." });
        }

        return res.json({
          sucesso: true,
          mensagem: "Barbeiro possui agendamentos e foi desativado.",
        });
      });

      return;
    }

    const deleteConfigSql = `
      DELETE FROM configuracoes_agenda
      WHERE barbeiro_id = ?
      AND barbearia_id = ?
    `;

    db.query(deleteConfigSql, [id, barbearia_id], (errConfig) => {
      if (errConfig) {
        console.error("Erro ao remover configuração:", errConfig);
        return res.status(500).json({ erro: "Erro ao remover configuração." });
      }

      const deleteBloqueiosSql = `
        DELETE FROM dias_bloqueados
        WHERE barbeiro_id = ?
        AND barbearia_id = ?
      `;

      db.query(deleteBloqueiosSql, [id, barbearia_id], (errBloqueios) => {
        if (errBloqueios) {
          console.error("Erro ao remover bloqueios:", errBloqueios);
          return res.status(500).json({ erro: "Erro ao remover bloqueios." });
        }

        const deleteSql = `
          DELETE FROM barbeiros
          WHERE id = ?
          AND barbearia_id = ?
        `;

        db.query(deleteSql, [id, barbearia_id], (errDelete) => {
          if (errDelete) {
            console.error("Erro ao deletar barbeiro:", errDelete);
            return res.status(500).json({ erro: "Erro ao deletar barbeiro." });
          }

          res.json({ sucesso: true });
        });
      });
    });
  });
};

/* =========================
   AGENDAMENTOS DO PAINEL
========================= */

// LISTAR agendamentos
const listarAgendamentos = (req, res) => {
  const barbearia_id = pegarBarbeariaId(req);
  const barbeiro_id = pegarBarbeiroId(req);

  if (!barbearia_id) {
    return res.status(400).json({ erro: "Barbearia não informada." });
  }

  let sql = `
    SELECT 
      agendamentos.*,
      barbeiros.nome AS barbeiro_nome
    FROM agendamentos
    LEFT JOIN barbeiros ON barbeiros.id = agendamentos.barbeiro_id
    WHERE agendamentos.barbearia_id = ?
    AND agendamentos.status IN ('agendado', 'cancelado')
  `;

  const params = [barbearia_id];

  if (barbeiro_id) {
    sql += ` AND agendamentos.barbeiro_id = ? `;
    params.push(barbeiro_id);
  }

  sql += `
    ORDER BY
      CASE
        WHEN agendamentos.status = 'agendado' THEN 0
        WHEN agendamentos.status = 'cancelado' THEN 1
        ELSE 2
      END,
      agendamentos.data ASC,
      agendamentos.hora ASC
  `;

  db.query(sql, params, (err, result) => {
    if (err) {
      console.error("Erro ao buscar agendamentos:", err);
      return res.status(500).json({ erro: "Erro ao buscar agendamentos." });
    }

    res.json(result);
  });
};

// CONCLUIR agendamento
const concluirAgendamento = (req, res) => {
  const { id } = req.params;
  const barbearia_id = pegarBarbeariaId(req);

  if (!barbearia_id) {
    return res.status(400).json({ erro: "Barbearia não informada." });
  }

  const sql = `
    UPDATE agendamentos
    SET status = 'concluido'
    WHERE id = ?
    AND barbearia_id = ?
    AND status = 'agendado'
  `;

  db.query(sql, [id, barbearia_id], (err, result) => {
    if (err) {
      console.error("Erro ao concluir:", err);
      return res.status(500).json({ erro: "Erro ao concluir agendamento." });
    }

    if (result.affectedRows === 0) {
      return res.status(400).json({ erro: "Agendamento não encontrado." });
    }

    res.json({ sucesso: true });
  });
};

// DELETAR agendamento
const deletarAgendamento = (req, res) => {
  const { id } = req.params;
  const barbearia_id = pegarBarbeariaId(req);

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
      return res.status(500).json({ erro: "Erro ao deletar agendamento." });
    }

    res.json({ sucesso: true });
  });
};

/* =========================
   DIAS BLOQUEADOS
========================= */

// LISTAR dias bloqueados
const listarDiasBloqueados = (req, res) => {
  const barbearia_id = pegarBarbeariaId(req);
  const barbeiro_id = pegarBarbeiroId(req);

  if (!barbearia_id) {
    return res.status(400).json({ erro: "Barbearia não informada." });
  }

  if (!barbeiro_id) {
    return res.status(400).json({ erro: "Barbeiro não informado." });
  }

  const sql = `
    SELECT *
    FROM dias_bloqueados
    WHERE data >= CURDATE()
    AND barbearia_id = ?
    AND barbeiro_id = ?
    ORDER BY data ASC
  `;

  db.query(sql, [barbearia_id, barbeiro_id], (err, result) => {
    if (err) {
      console.error("Erro ao buscar dias bloqueados:", err);
      return res.status(500).json({ erro: "Erro ao buscar dias bloqueados." });
    }

    res.json(result);
  });
};

// BLOQUEAR dia
const bloquearDia = (req, res) => {
  const { data, motivo } = req.body;
  const barbearia_id = pegarBarbeariaId(req);
  const barbeiro_id = pegarBarbeiroId(req);

  if (!barbearia_id) {
    return res.status(400).json({ erro: "Barbearia não informada." });
  }

  if (!barbeiro_id) {
    return res.status(400).json({ erro: "Barbeiro não informado." });
  }

  if (!data) {
    return res.status(400).json({ erro: "Data obrigatória." });
  }

  const checkSql = `
    SELECT *
    FROM dias_bloqueados
    WHERE data = ?
    AND barbearia_id = ?
    AND barbeiro_id = ?
  `;

  db.query(checkSql, [data, barbearia_id, barbeiro_id], (err, result) => {
    if (err) {
      console.error("Erro ao verificar dia bloqueado:", err);
      return res.status(500).json({ erro: "Erro ao verificar dia." });
    }

    if (result.length > 0) {
      return res.status(400).json({ erro: "Esse dia já está bloqueado." });
    }

    const insertSql = `
      INSERT INTO dias_bloqueados (data, motivo, barbearia_id, barbeiro_id)
      VALUES (?, ?, ?, ?)
    `;

    db.query(
      insertSql,
      [data, motivo || null, barbearia_id, barbeiro_id],
      (errInsert) => {
        if (errInsert) {
          console.error("Erro ao bloquear dia:", errInsert);
          return res.status(500).json({ erro: "Erro ao bloquear dia." });
        }

        res.json({ sucesso: true });
      },
    );
  });
};

// DESBLOQUEAR dia
const desbloquearDia = (req, res) => {
  const { id } = req.params;
  const barbearia_id = pegarBarbeariaId(req);
  const barbeiro_id = pegarBarbeiroId(req);

  if (!barbearia_id) {
    return res.status(400).json({ erro: "Barbearia não informada." });
  }

  if (!barbeiro_id) {
    return res.status(400).json({ erro: "Barbeiro não informado." });
  }

  const sql = `
    DELETE FROM dias_bloqueados
    WHERE id = ?
    AND barbearia_id = ?
    AND barbeiro_id = ?
  `;

  db.query(sql, [id, barbearia_id, barbeiro_id], (err) => {
    if (err) {
      console.error("Erro ao desbloquear dia:", err);
      return res.status(500).json({ erro: "Erro ao desbloquear dia." });
    }

    res.json({ sucesso: true });
  });
};

/* =========================
   CONFIGURAÇÃO DA AGENDA
========================= */

// BUSCAR configuração da agenda
const buscarConfiguracaoAgenda = (req, res) => {
  const barbearia_id = pegarBarbeariaId(req);
  const barbeiro_id = pegarBarbeiroId(req);

  if (!barbearia_id) {
    return res.status(400).json({ erro: "Barbearia não informada." });
  }

  if (!barbeiro_id) {
    return res.status(400).json({ erro: "Barbeiro não informado." });
  }

  const sql = `
    SELECT *
    FROM configuracoes_agenda
    WHERE barbearia_id = ?
    AND barbeiro_id = ?
    ORDER BY id ASC
    LIMIT 1
  `;

  db.query(sql, [barbearia_id, barbeiro_id], (err, result) => {
    if (err) {
      console.error("Erro ao buscar configuração:", err);
      return res.status(500).json({ erro: "Erro ao buscar configuração." });
    }

    if (result.length === 0) {
      const insertSql = `
        INSERT INTO configuracoes_agenda (
          hora_inicio,
          hora_fim,
          intervalo,
          almoco_inicio,
          almoco_fim,
          bloquear_sabado,
          bloquear_domingo,
          barbearia_id,
          barbeiro_id
        )
        VALUES ('08:00', '18:00', 30, NULL, NULL, 0, 1, ?, ?)
      `;

      db.query(insertSql, [barbearia_id, barbeiro_id], (errInsert) => {
        if (errInsert) {
          console.error("Erro ao criar configuração:", errInsert);
          return res.status(500).json({ erro: "Erro ao criar configuração." });
        }

        return res.json({
          id: null,
          hora_inicio: "08:00:00",
          hora_fim: "18:00:00",
          intervalo: 30,
          almoco_inicio: null,
          almoco_fim: null,
          bloquear_sabado: 0,
          bloquear_domingo: 1,
          barbearia_id,
          barbeiro_id,
        });
      });

      return;
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
    almoco_inicio,
    almoco_fim,
    bloquear_segunda,
    bloquear_terca,
    bloquear_quarta,
    bloquear_quinta,
    bloquear_sexta,
    bloquear_sabado,
    bloquear_domingo,
  } = req.body;

  const barbearia_id = pegarBarbeariaId(req);
  const barbeiro_id = pegarBarbeiroId(req);

  if (!barbearia_id) {
    return res.status(400).json({ erro: "Barbearia não informada." });
  }

  if (!barbeiro_id) {
    return res.status(400).json({ erro: "Barbeiro não informado." });
  }

  if (!hora_inicio || !hora_fim || !intervalo) {
    return res.status(400).json({ erro: "Preencha os horários obrigatórios." });
  }

  const checkSql = `
    SELECT *
    FROM configuracoes_agenda
    WHERE barbearia_id = ?
    AND barbeiro_id = ?
    ORDER BY id ASC
    LIMIT 1
  `;

  db.query(checkSql, [barbearia_id, barbeiro_id], (err, result) => {
    if (err) {
      console.error("Erro ao verificar configuração:", err);
      return res.status(500).json({ erro: "Erro ao verificar configuração." });
    }

    if (result.length === 0) {
      const insertSql = `
        INSERT INTO configuracoes_agenda (
          hora_inicio,
          hora_fim,
          intervalo,
          almoco_inicio,
          almoco_fim,
          bloquear_segunda,
          bloquear_terca,
          bloquear_quarta,
          bloquear_quinta,
          bloquear_sexta,
          bloquear_sabado,
          bloquear_domingo,
          barbearia_id,
          barbeiro_id
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      db.query(
        insertSql,
        [
          hora_inicio,
          hora_fim,
          intervalo,
          almoco_inicio || null,
          almoco_fim || null,
          bloquear_segunda ? 1 : 0,
          bloquear_terca ? 1 : 0,
          bloquear_quarta ? 1 : 0,
          bloquear_quinta ? 1 : 0,
          bloquear_sexta ? 1 : 0,
          bloquear_sabado ? 1 : 0,
          bloquear_domingo ? 1 : 0,
          barbearia_id,
          barbeiro_id,
        ],
        (errInsert) => {
          if (errInsert) {
            console.error("Erro ao salvar configuração:", errInsert);
            return res
              .status(500)
              .json({ erro: "Erro ao salvar configuração." });
          }

          res.json({ sucesso: true });
        },
      );

      return;
    }

    const updateSql = `
      UPDATE configuracoes_agenda
      SET hora_inicio = ?,
          hora_fim = ?,
          intervalo = ?,
          almoco_inicio = ?,
          almoco_fim = ?,
          bloquear_segunda = ?,
          bloquear_terca = ?,
          bloquear_quarta = ?,
          bloquear_quinta = ?,
          bloquear_sexta = ?,
          bloquear_sabado = ?,
          bloquear_domingo = ?
      WHERE id = ?
      AND barbearia_id = ?
      AND barbeiro_id = ?
    `;

    db.query(
      updateSql,
      [
        hora_inicio,
        hora_fim,
        intervalo,
        almoco_inicio || null,
        almoco_fim || null,
        bloquear_segunda ? 1 : 0,
        bloquear_terca ? 1 : 0,
        bloquear_quarta ? 1 : 0,
        bloquear_quinta ? 1 : 0,
        bloquear_sexta ? 1 : 0,
        bloquear_sabado ? 1 : 0,
        bloquear_domingo ? 1 : 0,
        result[0].id,
        barbearia_id,
        barbeiro_id,
      ],
      (errUpdate) => {
        if (errUpdate) {
          console.error("Erro ao atualizar configuração:", errUpdate);
          return res
            .status(500)
            .json({ erro: "Erro ao atualizar configuração." });
        }

        res.json({ sucesso: true });
      },
    );
  });
};

const buscarLocalizacaoBarbearia = (req, res) => {
  const barbearia_id = pegarBarbeariaId(req);

  if (!barbearia_id) {
    return res.status(400).json({ erro: "Barbearia não informada." });
  }

  const sql = `
    SELECT rua, numero, bairro, cidade
    FROM barbearias
    WHERE id = ?
    LIMIT 1
  `;

  db.query(sql, [barbearia_id], (err, result) => {
    if (err) {
      console.error("Erro ao buscar localização:", err);
      return res.status(500).json({ erro: "Erro ao buscar localização." });
    }

    if (result.length === 0) {
      return res.status(404).json({ erro: "Barbearia não encontrada." });
    }

    res.json(result[0]);
  });
};

const salvarLocalizacaoBarbearia = (req, res) => {
  const { rua, numero, bairro, cidade } = req.body;
  const barbearia_id = pegarBarbeariaId(req);

  if (!barbearia_id) {
    return res.status(400).json({ erro: "Barbearia não informada." });
  }

  const sql = `
    UPDATE barbearias
    SET rua = ?, numero = ?, bairro = ?, cidade = ?
    WHERE id = ?
  `;

  db.query(
    sql,
    [rua || null, numero || null, bairro || null, cidade || null, barbearia_id],
    (err) => {
      if (err) {
        console.error("Erro ao salvar localização:", err);
        return res.status(500).json({ erro: "Erro ao salvar localização." });
      }

      res.json({ sucesso: true });
    },
  );
};

const listarExcecoesHorario = (req, res) => {
  const barbearia_id = pegarBarbeariaId(req);
  const barbeiro_id = pegarBarbeiroId(req);

  if (!barbearia_id) {
    return res.status(400).json({ erro: "Barbearia não informada." });
  }

  if (!barbeiro_id) {
    return res.status(400).json({ erro: "Barbeiro não informado." });
  }

  const sql = `
    SELECT *
    FROM excecoes_horario
    WHERE barbearia_id = ?
    AND barbeiro_id = ?
    AND data >= CURDATE()
    ORDER BY data ASC
  `;

  db.query(sql, [barbearia_id, barbeiro_id], (err, result) => {
    if (err) {
      console.error("Erro ao buscar exceções:", err);
      return res.status(500).json({ erro: "Erro ao buscar exceções." });
    }

    res.json(result);
  });
};

const criarExcecaoHorario = (req, res) => {
  const { data, tipo, hora_inicio, hora_fim, motivo } = req.body;
  const barbearia_id = pegarBarbeariaId(req);
  const barbeiro_id = pegarBarbeiroId(req);

  if (!barbearia_id) {
    return res.status(400).json({ erro: "Barbearia não informada." });
  }

  if (!barbeiro_id) {
    return res.status(400).json({ erro: "Barbeiro não informado." });
  }

  if (!data || !tipo) {
    return res
      .status(400)
      .json({ erro: "Informe a data e o tipo da exceção." });
  }

  if (tipo === "personalizado" && (!hora_inicio || !hora_fim)) {
    return res.status(400).json({ erro: "Informe o horário inicial e final." });
  }

  const checkSql = `
    SELECT id
    FROM excecoes_horario
    WHERE barbearia_id = ?
    AND barbeiro_id = ?
    AND data = ?
    LIMIT 1
  `;

  db.query(
    checkSql,
    [barbearia_id, barbeiro_id, data],
    (errCheck, resultCheck) => {
      if (errCheck) {
        console.error("Erro ao verificar exceção:", errCheck);
        return res.status(500).json({ erro: "Erro ao verificar exceção." });
      }

      if (resultCheck.length > 0) {
        return res.status(400).json({
          erro: "Já existe uma exceção cadastrada para esse dia.",
        });
      }

      const sql = `
      INSERT INTO excecoes_horario (
        barbearia_id,
        barbeiro_id,
        data,
        tipo,
        hora_inicio,
        hora_fim,
        motivo
      )
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

      db.query(
        sql,
        [
          barbearia_id,
          barbeiro_id,
          data,
          tipo,
          tipo === "personalizado" ? hora_inicio : null,
          tipo === "personalizado" ? hora_fim : null,
          motivo || null,
        ],
        (err) => {
          if (err) {
            console.error("Erro ao criar exceção:", err);
            return res.status(500).json({ erro: "Erro ao criar exceção." });
          }

          res.json({ sucesso: true });
        },
      );
    },
  );
};

const deletarExcecaoHorario = (req, res) => {
  const { id } = req.params;
  const barbearia_id = pegarBarbeariaId(req);
  const barbeiro_id = pegarBarbeiroId(req);

  if (!barbearia_id) {
    return res.status(400).json({ erro: "Barbearia não informada." });
  }

  if (!barbeiro_id) {
    return res.status(400).json({ erro: "Barbeiro não informado." });
  }

  const sql = `
    DELETE FROM excecoes_horario
    WHERE id = ?
    AND barbearia_id = ?
    AND barbeiro_id = ?
  `;

  db.query(sql, [id, barbearia_id, barbeiro_id], (err) => {
    if (err) {
      console.error("Erro ao excluir exceção:", err);
      return res.status(500).json({ erro: "Erro ao excluir exceção." });
    }

    res.json({ sucesso: true });
  });
};

module.exports = {
  listarBarbeiros,
  criarBarbeiro,
  atualizarBarbeiro,
  deletarBarbeiro,

  listarAgendamentos,
  concluirAgendamento,
  deletarAgendamento,

  listarDiasBloqueados,
  bloquearDia,
  desbloquearDia,
  listarExcecoesHorario,
  criarExcecaoHorario,
  deletarExcecaoHorario,

  buscarConfiguracaoAgenda,
  salvarConfiguracaoAgenda,

  buscarLocalizacaoBarbearia,
  salvarLocalizacaoBarbearia,
};
