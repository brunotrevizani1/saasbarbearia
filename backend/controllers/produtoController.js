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
  destination: function (req, file, cb) {
    cb(null, pastaProdutos);
  },
  filename: function (req, file, cb) {
    const nomeUnico = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, nomeUnico + path.extname(file.originalname));
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
      return res.status(500).json({ erro: "Erro ao enviar imagens." });
    }

    const barbearia_id = pegarBarbeariaId(req);
    const { titulo, descricao, valor, estoque } = req.body;

    if (!barbearia_id || !titulo || !valor) {
      return res.status(400).json({ erro: "Preencha os campos obrigatórios." });
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

module.exports = {
  criarProduto,
  listarProdutos,
};
