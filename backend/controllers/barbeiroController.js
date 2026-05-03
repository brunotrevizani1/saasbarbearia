const fs = require("fs");
const path = require("path");
const db = require("../models/db");
const multer = require("multer");

const pastaLogos = path.join(__dirname, "..", "logos");

if (!fs.existsSync(pastaLogos)) {
  fs.mkdirSync(pastaLogos, { recursive: true });
}

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
  const { nome, barbearia_id, servicos } = req.body;

  if (!nome || !barbearia_id) {
    return res.status(400).json({ erro: "Nome e barbearia são obrigatórios." });
  }

  const servicosSelecionados = Array.isArray(servicos) ? servicos : [];

  db.getConnection((errConn, connection) => {
    if (errConn) {
      console.error("Erro ao conectar para criar barbeiro:", errConn);
      return res.status(500).json({ erro: "Erro ao criar barbeiro." });
    }

    connection.beginTransaction((errTransaction) => {
      if (errTransaction) {
        connection.release();
        return res.status(500).json({ erro: "Erro ao criar barbeiro." });
      }

      const sqlBarbeiro = `
        INSERT INTO barbeiros (nome, barbearia_id, ativo)
        VALUES (?, ?, 1)
      `;

      connection.query(
        sqlBarbeiro,
        [nome.trim(), barbearia_id],
        (errBarbeiro, resultBarbeiro) => {
          if (errBarbeiro) {
            return connection.rollback(() => {
              connection.release();
              console.error("Erro ao criar barbeiro:", errBarbeiro);
              res.status(500).json({ erro: "Erro ao criar barbeiro." });
            });
          }

          const barbeiro_id = resultBarbeiro.insertId;

          if (!servicosSelecionados.length) {
            return connection.commit((errCommit) => {
              connection.release();

              if (errCommit) {
                return res
                  .status(500)
                  .json({ erro: "Erro ao finalizar cadastro." });
              }

              res.json({ sucesso: true });
            });
          }

          const valores = servicosSelecionados.map((servico_id) => [
            barbearia_id,
            barbeiro_id,
            servico_id,
          ]);

          const sqlServicos = `
          INSERT INTO barbeiro_servicos
          (barbearia_id, barbeiro_id, servico_id)
          VALUES ?
        `;

          connection.query(sqlServicos, [valores], (errServicos) => {
            if (errServicos) {
              return connection.rollback(() => {
                connection.release();
                console.error("Erro ao vincular serviços:", errServicos);
                res.status(500).json({ erro: "Erro ao vincular serviços." });
              });
            }

            connection.commit((errCommit) => {
              connection.release();

              if (errCommit) {
                return res
                  .status(500)
                  .json({ erro: "Erro ao finalizar cadastro." });
              }

              res.json({ sucesso: true });
            });
          });
        },
      );
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

    const deleteServicosSql = `
      DELETE FROM barbeiro_servicos
      WHERE barbeiro_id = ?
      AND barbearia_id = ?
    `;

    db.query(deleteServicosSql, [id, barbearia_id], (errServicos) => {
      if (errServicos) {
        console.error("Erro ao remover serviços do barbeiro:", errServicos);
        return res.status(500).json({
          erro: "Erro ao remover serviços do barbeiro.",
        });
      }

      const deleteConfigSql = `
        DELETE FROM configuracoes_agenda
        WHERE barbeiro_id = ?
        AND barbearia_id = ?
      `;

      db.query(deleteConfigSql, [id, barbearia_id], (errConfig) => {
        if (errConfig) {
          console.error("Erro ao remover configuração:", errConfig);
          return res
            .status(500)
            .json({ erro: "Erro ao remover configuração." });
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
              return res
                .status(500)
                .json({ erro: "Erro ao deletar barbeiro." });
            }

            res.json({ sucesso: true });
          });
        });
      });
    });
  });
};

// CONFIGURAÇÃO MULTER (sempre antes de usar)
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, pastaLogos);
  },
  filename: function (req, file, cb) {
    const nomeUnico = Date.now() + path.extname(file.originalname);
    cb(null, nomeUnico);
  },
});

const upload = multer({ storage });

// BUSCAR LOGO
const buscarLogoBarbearia = (req, res) => {
  const barbearia_id = pegarBarbeariaId(req);

  if (!barbearia_id) {
    return res.status(400).json({ erro: "Barbearia não informada." });
  }

  const sql = `
    SELECT logo
    FROM barbearias
    WHERE id = ?
    LIMIT 1
  `;

  db.query(sql, [barbearia_id], (err, result) => {
    if (err) {
      console.error("Erro ao buscar logo:", err);
      return res.status(500).json({ erro: "Erro ao buscar logo." });
    }

    if (!result.length) {
      return res.json({ logo: null });
    }

    res.json({ logo: result[0].logo });
  });
};

// UPLOAD LOGO
const uploadLogoBarbearia = (req, res) => {
  upload.single("logo")(req, res, (err) => {
    if (err) {
      console.error("Erro no upload da logo:", err);

      return res.status(500).json({
        erro: "Erro ao fazer upload da imagem.",
        detalhe: err.message,
        codigo: err.code,
      });
    }

    const barbearia_id = pegarBarbeariaId(req);

    if (!barbearia_id) {
      return res.status(400).json({ erro: "Barbearia não informada." });
    }

    if (!req.file) {
      return res.status(400).json({ erro: "Nenhuma imagem enviada." });
    }

    const caminho = `/logos/${req.file.filename}`;

    const sql = `
      UPDATE barbearias
      SET logo = ?
      WHERE id = ?
    `;

    db.query(sql, [caminho, barbearia_id], (errDb) => {
      if (errDb) {
        console.error("Erro ao salvar logo no banco:", errDb);
        return res.status(500).json({ erro: "Erro ao salvar logo no banco." });
      }

      res.json({
        sucesso: true,
        logo: caminho,
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

const gerarRelatorioAgendamentos = (req, res) => {
  const {
    barbearia_id,
    barbeiro_id,
    data_inicio,
    data_fim,
    data_hoje,
    semana_inicio,
    semana_fim,
  } = req.query;

  if (!barbearia_id || !data_inicio || !data_fim) {
    return res.status(400).json({
      erro: "Barbearia, data inicial e data final são obrigatórios.",
    });
  }

  const usarFiltroBarbeiro = barbeiro_id && barbeiro_id !== "todos";

  let filtroBarbeiroSql = "";
  const paramsPeriodo = [data_inicio, data_fim, barbearia_id];

  if (usarFiltroBarbeiro) {
    filtroBarbeiroSql = " AND b.id = ? ";
    paramsPeriodo.push(barbeiro_id);
  }

  const sqlPeriodo = `
    SELECT
      b.id AS barbeiro_id,
      b.nome AS barbeiro_nome,

      COUNT(a.id) AS total,

      COALESCE(SUM(CASE WHEN a.status = 'agendado' THEN 1 ELSE 0 END), 0) AS agendados,
      COALESCE(SUM(CASE WHEN a.status = 'concluido' THEN 1 ELSE 0 END), 0) AS concluidos,
      COALESCE(SUM(CASE WHEN a.status = 'cancelado' THEN 1 ELSE 0 END), 0) AS cancelados

    FROM barbeiros b

    LEFT JOIN agendamentos a
      ON a.barbeiro_id = b.id
      AND a.barbearia_id = b.barbearia_id
      AND a.data BETWEEN ? AND ?

    WHERE b.barbearia_id = ?
    ${filtroBarbeiroSql}

    GROUP BY b.id, b.nome
    ORDER BY total DESC, b.nome ASC
  `;

  db.query(sqlPeriodo, paramsPeriodo, (errPeriodo, resultadoPeriodo) => {
    if (errPeriodo) {
      console.error("Erro ao gerar relatório por período:", errPeriodo);
      return res.status(500).json({ erro: "Erro ao gerar relatório." });
    }

    const paramsResumoHoje = [barbearia_id, data_hoje || data_inicio];
    const paramsResumoSemana = [
      barbearia_id,
      semana_inicio || data_inicio,
      semana_fim || data_fim,
    ];
    const paramsResumoPeriodo = [barbearia_id, data_inicio, data_fim];

    let filtroResumoBarbeiro = "";

    if (usarFiltroBarbeiro) {
      filtroResumoBarbeiro = " AND barbeiro_id = ? ";
      paramsResumoHoje.push(barbeiro_id);
      paramsResumoSemana.push(barbeiro_id);
      paramsResumoPeriodo.push(barbeiro_id);
    }

    const sqlResumoHoje = `
      SELECT COUNT(*) AS total
      FROM agendamentos
      WHERE barbearia_id = ?
      AND data = ?
      ${filtroResumoBarbeiro}
    `;

    const sqlResumoSemana = `
      SELECT COUNT(*) AS total
      FROM agendamentos
      WHERE barbearia_id = ?
      AND data BETWEEN ? AND ?
      ${filtroResumoBarbeiro}
    `;

    const sqlResumoPeriodo = `
      SELECT
        COUNT(*) AS total,
        COALESCE(SUM(CASE WHEN status = 'agendado' THEN 1 ELSE 0 END), 0) AS agendados,
        COALESCE(SUM(CASE WHEN status = 'concluido' THEN 1 ELSE 0 END), 0) AS concluidos,
        COALESCE(SUM(CASE WHEN status = 'cancelado' THEN 1 ELSE 0 END), 0) AS cancelados
      FROM agendamentos
      WHERE barbearia_id = ?
      AND data BETWEEN ? AND ?
      ${filtroResumoBarbeiro}
    `;

    db.query(sqlResumoHoje, paramsResumoHoje, (errHoje, resultadoHoje) => {
      if (errHoje) {
        console.error("Erro ao gerar resumo de hoje:", errHoje);
        return res.status(500).json({ erro: "Erro ao gerar resumo de hoje." });
      }

      db.query(
        sqlResumoSemana,
        paramsResumoSemana,
        (errSemana, resultadoSemana) => {
          if (errSemana) {
            console.error("Erro ao gerar resumo da semana:", errSemana);
            return res
              .status(500)
              .json({ erro: "Erro ao gerar resumo da semana." });
          }

          db.query(
            sqlResumoPeriodo,
            paramsResumoPeriodo,
            (errResumoPeriodo, resultadoResumoPeriodo) => {
              if (errResumoPeriodo) {
                console.error(
                  "Erro ao gerar resumo do período:",
                  errResumoPeriodo,
                );
                return res
                  .status(500)
                  .json({ erro: "Erro ao gerar resumo do período." });
              }

              res.json({
                sucesso: true,
                resumo: {
                  hoje: resultadoHoje[0]?.total || 0,
                  semana: resultadoSemana[0]?.total || 0,
                  periodo: resultadoResumoPeriodo[0]?.total || 0,
                  agendados: resultadoResumoPeriodo[0]?.agendados || 0,
                  concluidos: resultadoResumoPeriodo[0]?.concluidos || 0,
                  cancelados: resultadoResumoPeriodo[0]?.cancelados || 0,
                },
                barbeiros: resultadoPeriodo,
              });
            },
          );
        },
      );
    });
  });
};

const buscarServicosDoBarbeiro = (req, res) => {
  const { id } = req.params;
  const { barbearia_id } = req.query;

  if (!id || !barbearia_id) {
    return res
      .status(400)
      .json({ erro: "Barbeiro ou barbearia não informado." });
  }

  const sql = `
    SELECT servico_id
    FROM barbeiro_servicos
    WHERE barbeiro_id = ?
    AND barbearia_id = ?
  `;

  db.query(sql, [id, barbearia_id], (err, result) => {
    if (err) {
      console.error("Erro ao buscar serviços do barbeiro:", err);
      return res.status(500).json({ erro: "Erro ao buscar serviços." });
    }

    res.json(result.map((item) => item.servico_id));
  });
};

const editarBarbeiro = (req, res) => {
  const { id } = req.params;
  const { nome, barbearia_id, servicos } = req.body;

  if (!id || !nome || !barbearia_id) {
    return res.status(400).json({ erro: "Preencha o nome do barbeiro." });
  }

  const servicosSelecionados = Array.isArray(servicos) ? servicos : [];

  db.getConnection((errConn, connection) => {
    if (errConn) {
      console.error("Erro ao conectar para editar barbeiro:", errConn);
      return res.status(500).json({ erro: "Erro ao editar barbeiro." });
    }

    connection.beginTransaction((errTransaction) => {
      if (errTransaction) {
        connection.release();
        return res.status(500).json({ erro: "Erro ao editar barbeiro." });
      }

      const sqlUpdateBarbeiro = `
        UPDATE barbeiros
        SET nome = ?
        WHERE id = ?
        AND barbearia_id = ?
      `;

      connection.query(
        sqlUpdateBarbeiro,
        [nome.trim(), id, barbearia_id],
        (errUpdate) => {
          if (errUpdate) {
            return connection.rollback(() => {
              connection.release();
              console.error("Erro ao atualizar barbeiro:", errUpdate);
              res.status(500).json({ erro: "Erro ao atualizar barbeiro." });
            });
          }

          const sqlDeleteServicos = `
            DELETE FROM barbeiro_servicos
            WHERE barbeiro_id = ?
            AND barbearia_id = ?
          `;

          connection.query(
            sqlDeleteServicos,
            [id, barbearia_id],
            (errDelete) => {
              if (errDelete) {
                return connection.rollback(() => {
                  connection.release();
                  console.error("Erro ao limpar serviços:", errDelete);
                  res.status(500).json({ erro: "Erro ao atualizar serviços." });
                });
              }

              if (!servicosSelecionados.length) {
                return connection.commit((errCommit) => {
                  connection.release();

                  if (errCommit) {
                    return res
                      .status(500)
                      .json({ erro: "Erro ao finalizar edição." });
                  }

                  res.json({ sucesso: true });
                });
              }

              const valores = servicosSelecionados.map((servico_id) => [
                barbearia_id,
                id,
                servico_id,
              ]);

              const sqlInsertServicos = `
              INSERT INTO barbeiro_servicos
              (barbearia_id, barbeiro_id, servico_id)
              VALUES ?
            `;

              connection.query(sqlInsertServicos, [valores], (errInsert) => {
                if (errInsert) {
                  return connection.rollback(() => {
                    connection.release();
                    console.error("Erro ao salvar serviços:", errInsert);
                    res.status(500).json({ erro: "Erro ao salvar serviços." });
                  });
                }

                connection.commit((errCommit) => {
                  connection.release();

                  if (errCommit) {
                    return res
                      .status(500)
                      .json({ erro: "Erro ao finalizar edição." });
                  }

                  res.json({ sucesso: true });
                });
              });
            },
          );
        },
      );
    });
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

  buscarLogoBarbearia,
  uploadLogoBarbearia,

  gerarRelatorioAgendamentos,

  editarBarbeiro,
  buscarServicosDoBarbeiro,
};
