const fs = require("fs");
const path = require("path");
const multer = require("multer");
const db = require("../models/db");

const pastaProdutos = path.join(__dirname, "..", "uploads", "produtos");

if (!fs.existsSync(pastaProdutos)) {
  fs.mkdirSync(pastaProdutos, { recursive: true });
}

function pegarBarbeariaId(req) {
  return req.query?.barbearia_id || req.body?.barbearia_id;
}

const storage = multer.diskStorage({
  destination(req, file, cb) {
    cb(null, pastaProdutos);
  },
  filename(req, file, cb) {
    const nomeUnico =
      Date.now() +
      "-" +
      Math.round(Math.random() * 1e9) +
      path.extname(file.originalname);

    cb(null, nomeUnico);
  },
});

const upload = multer({
  storage,
  limits: {
    files: 3,
    fileSize: 5 * 1024 * 1024,
  },
});

const criarProduto = (req, res) => {
  upload.array("imagens", 3)(req, res, (err) => {
    if (err) {
      console.error("Erro no upload do produto:", err);

      return res.status(500).json({
        erro: "Erro ao enviar imagens.",
        detalhe: err.message,
        codigo: err.code,
      });
    }

    const barbearia_id = pegarBarbeariaId(req);
    const { titulo, descricao, valor, estoque } = req.body;

    if (!barbearia_id || !titulo || !valor) {
      return res
        .status(400)
        .json({ erro: "Preencha título, valor e barbearia." });
    }

    const imagens = req.files || [];

    const imagem_1 = imagens[0]
      ? `/uploads/produtos/${imagens[0].filename}`
      : null;
    const imagem_2 = imagens[1]
      ? `/uploads/produtos/${imagens[1].filename}`
      : null;
    const imagem_3 = imagens[2]
      ? `/uploads/produtos/${imagens[2].filename}`
      : null;

    const sql = `
      INSERT INTO produtos
      (barbearia_id, titulo, descricao, valor, estoque, imagem_1, imagem_2, imagem_3, ativo)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
    `;

    db.query(
      sql,
      [
        barbearia_id,
        titulo.trim(),
        descricao || null,
        valor,
        estoque || 0,
        imagem_1,
        imagem_2,
        imagem_3,
      ],
      (errDb) => {
        if (errDb) {
          console.error("Erro ao criar produto:", errDb);
          return res.status(500).json({ erro: "Erro ao criar produto." });
        }

        res.json({ sucesso: true });
      },
    );
  });
};

const listarProdutos = (req, res) => {
  const barbearia_id = pegarBarbeariaId(req);

  if (!barbearia_id) {
    return res.status(400).json({ erro: "Barbearia não informada." });
  }

  const sql = `
    SELECT *
    FROM produtos
    WHERE barbearia_id = ?
    AND ativo = 1
    ORDER BY id DESC
  `;

  db.query(sql, [barbearia_id], (err, result) => {
    if (err) {
      console.error("Erro ao listar produtos:", err);
      return res.status(500).json({ erro: "Erro ao listar produtos." });
    }

    res.json(result);
  });
};

const deletarProduto = (req, res) => {
  const { id } = req.params;
  const barbearia_id = pegarBarbeariaId(req);

  const sql = `
    UPDATE produtos
    SET ativo = 0
    WHERE id = ?
    AND barbearia_id = ?
  `;

  db.query(sql, [id, barbearia_id], (err) => {
    if (err) {
      console.error("Erro ao deletar produto:", err);
      return res.status(500).json({ erro: "Erro ao deletar produto." });
    }

    res.json({ sucesso: true });
  });
};

function gerarCodigoReserva() {
  const caracteres = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let codigo = "";

  for (let i = 0; i < 6; i++) {
    codigo += caracteres.charAt(Math.floor(Math.random() * caracteres.length));
  }

  return codigo;
}

const reservarProduto = (req, res) => {
  const { produto_id, barbearia_id, nome_cliente, telefone_cliente } = req.body;

  if (!produto_id || !barbearia_id || !nome_cliente || !telefone_cliente) {
    return res.status(400).json({ erro: "Preencha todos os campos." });
  }

  const codigo = gerarCodigoReserva();

  const updateSql = `
    UPDATE produtos
    SET estoque = estoque - 1
    WHERE id = ?
    AND barbearia_id = ?
    AND estoque > 0
    AND ativo = 1
  `;

  db.query(updateSql, [produto_id, barbearia_id], (errUpdate, resultUpdate) => {
    if (errUpdate) {
      console.error("Erro ao atualizar estoque:", errUpdate);
      return res.status(500).json({ erro: "Erro ao reservar produto." });
    }

    if (resultUpdate.affectedRows === 0) {
      return res.status(400).json({ erro: "Produto sem estoque disponível." });
    }

    const insertSql = `
      INSERT INTO reservas_produtos
      (produto_id, barbearia_id, nome_cliente, telefone_cliente, quantidade, codigo, status)
      VALUES (?, ?, ?, ?, 1, ?, 'reservado')
    `;

    db.query(
      insertSql,
      [
        produto_id,
        barbearia_id,
        nome_cliente.trim(),
        telefone_cliente.trim(),
        codigo,
      ],
      (errInsert) => {
        if (errInsert) {
          console.error("Erro ao criar reserva:", errInsert);
          return res.status(500).json({ erro: "Erro ao criar reserva." });
        }

        res.json({
          sucesso: true,
          codigo,
          mensagem:
            "Produto reservado com sucesso. O pagamento será feito presencialmente na barbearia.",
        });
      },
    );
  });
};

const listarProdutosCliente = (req, res) => {
  const { barbearia_id } = req.query;

  const sql = `
    SELECT *
    FROM produtos
    WHERE barbearia_id = ?
    AND ativo = 1
  `;

  db.query(sql, [barbearia_id], (err, results) => {
    if (err) {
      console.error("Erro ao buscar produtos:", err);
      return res.status(500).json({ erro: "Erro ao buscar produtos." });
    }

    res.json(results);
  });
};

const buscarReservaProduto = (req, res) => {
  const { codigo } = req.params;
  const barbearia_id = pegarBarbeariaId(req);

  if (!codigo || !barbearia_id) {
    return res
      .status(400)
      .json({ erro: "Código e barbearia são obrigatórios." });
  }

  const sql = `
    SELECT
      rp.id AS reserva_id,
      rp.codigo,
      rp.nome_cliente,
      rp.telefone_cliente,
      rp.quantidade,
      rp.status,
      rp.criado_em,

      p.id AS produto_id,
      p.titulo,
      p.descricao,
      p.valor,
      p.estoque,
      p.imagem_1,
      p.imagem_2,
      p.imagem_3
    FROM reservas_produtos rp
    INNER JOIN produtos p ON p.id = rp.produto_id
    WHERE rp.codigo = ?
    AND rp.barbearia_id = ?
    LIMIT 1
  `;

  db.query(sql, [codigo.trim().toUpperCase(), barbearia_id], (err, result) => {
    if (err) {
      console.error("Erro ao buscar reserva:", err);
      return res.status(500).json({ erro: "Erro ao buscar reserva." });
    }

    if (result.length === 0) {
      return res.status(404).json({ erro: "Reserva não encontrada." });
    }

    res.json({
      sucesso: true,
      reserva: result[0],
    });
  });
};

const finalizarReservaProduto = (req, res) => {
  const { codigo } = req.params;
  const barbearia_id = pegarBarbeariaId(req);

  if (!codigo || !barbearia_id) {
    return res
      .status(400)
      .json({ erro: "Código e barbearia são obrigatórios." });
  }

  const sql = `
    UPDATE reservas_produtos
    SET status = 'retirado'
    WHERE codigo = ?
    AND barbearia_id = ?
    AND status = 'reservado'
  `;

  db.query(sql, [codigo.trim().toUpperCase(), barbearia_id], (err, result) => {
    if (err) {
      console.error("Erro ao finalizar reserva:", err);
      return res.status(500).json({ erro: "Erro ao finalizar reserva." });
    }

    if (result.affectedRows === 0) {
      return res.status(400).json({
        erro: "Essa reserva não pode ser finalizada. Ela pode já estar finalizada ou cancelada.",
      });
    }

    res.json({
      sucesso: true,
      mensagem: "Reserva finalizada com sucesso.",
    });
  });
};

const cancelarReservaProduto = (req, res) => {
  const { codigo } = req.params;
  const barbearia_id = pegarBarbeariaId(req);

  if (!codigo || !barbearia_id) {
    return res
      .status(400)
      .json({ erro: "Código e barbearia são obrigatórios." });
  }

  db.getConnection((errConn, connection) => {
    if (errConn) {
      console.error("Erro ao conectar para cancelar reserva:", errConn);
      return res.status(500).json({ erro: "Erro ao cancelar reserva." });
    }

    connection.beginTransaction((errTransaction) => {
      if (errTransaction) {
        connection.release();
        console.error("Erro ao iniciar transação:", errTransaction);
        return res.status(500).json({ erro: "Erro ao cancelar reserva." });
      }

      const sqlBusca = `
        SELECT produto_id
        FROM reservas_produtos
        WHERE codigo = ?
        AND barbearia_id = ?
        AND status = 'reservado'
        LIMIT 1
      `;

      connection.query(
        sqlBusca,
        [codigo.trim().toUpperCase(), barbearia_id],
        (errBusca, resultBusca) => {
          if (errBusca) {
            return connection.rollback(() => {
              connection.release();
              console.error("Erro ao buscar reserva para cancelar:", errBusca);
              res.status(500).json({ erro: "Erro ao cancelar reserva." });
            });
          }

          if (resultBusca.length === 0) {
            return connection.rollback(() => {
              connection.release();
              res.status(400).json({
                erro: "Essa reserva não pode ser cancelada. Ela pode já estar cancelada ou finalizada.",
              });
            });
          }

          const produto_id = resultBusca[0].produto_id;

          const sqlAtualizaReserva = `
            UPDATE reservas_produtos
            SET status = 'cancelado'
            WHERE codigo = ?
            AND barbearia_id = ?
            AND status = 'reservado'
          `;

          connection.query(
            sqlAtualizaReserva,
            [codigo.trim().toUpperCase(), barbearia_id],
            (errAtualizaReserva) => {
              if (errAtualizaReserva) {
                return connection.rollback(() => {
                  connection.release();
                  console.error(
                    "Erro ao atualizar reserva:",
                    errAtualizaReserva,
                  );
                  res.status(500).json({ erro: "Erro ao cancelar reserva." });
                });
              }

              const sqlDevolveEstoque = `
                UPDATE produtos
                SET estoque = estoque + 1
                WHERE id = ?
                AND barbearia_id = ?
              `;

              connection.query(
                sqlDevolveEstoque,
                [produto_id, barbearia_id],
                (errEstoque) => {
                  if (errEstoque) {
                    return connection.rollback(() => {
                      connection.release();
                      console.error("Erro ao devolver estoque:", errEstoque);
                      res
                        .status(500)
                        .json({ erro: "Erro ao devolver estoque." });
                    });
                  }

                  connection.commit((errCommit) => {
                    if (errCommit) {
                      return connection.rollback(() => {
                        connection.release();
                        console.error(
                          "Erro ao confirmar cancelamento:",
                          errCommit,
                        );
                        res
                          .status(500)
                          .json({ erro: "Erro ao cancelar reserva." });
                      });
                    }

                    connection.release();

                    res.json({
                      sucesso: true,
                      mensagem: "Reserva cancelada e estoque devolvido.",
                    });
                  });
                },
              );
            },
          );
        },
      );
    });
  });
};

module.exports = {
  criarProduto,
  listarProdutos,
  listarProdutosCliente,
  deletarProduto,
  reservarProduto,
  buscarReservaProduto,
  finalizarReservaProduto,
  cancelarReservaProduto,
};
