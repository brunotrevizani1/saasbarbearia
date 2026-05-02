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

module.exports = {
  criarProduto,
  listarProdutos,
  listarProdutosCliente,
  deletarProduto,
  reservarProduto,
};
