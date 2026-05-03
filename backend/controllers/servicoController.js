const db = require("../models/db");

function pegarBarbeariaId(req) {
  return req.query?.barbearia_id || req.body?.barbearia_id;
}

const criarServico = (req, res) => {
  const { barbearia_id, nome, descricao, preco, duracao_minutos } = req.body;

  if (!barbearia_id || !nome || !preco || !duracao_minutos) {
    return res.status(400).json({
      erro: "Preencha nome, preço e duração do serviço.",
    });
  }

  const sql = `
    INSERT INTO servicos
    (barbearia_id, nome, descricao, preco, duracao_minutos, ativo)
    VALUES (?, ?, ?, ?, ?, 1)
  `;

  db.query(
    sql,
    [barbearia_id, nome.trim(), descricao || null, preco, duracao_minutos],
    (err) => {
      if (err) {
        console.error("Erro ao criar serviço:", err);
        return res.status(500).json({ erro: "Erro ao criar serviço." });
      }

      res.json({ sucesso: true });
    },
  );
};

const listarServicos = (req, res) => {
  const barbearia_id = pegarBarbeariaId(req);

  if (!barbearia_id) {
    return res.status(400).json({ erro: "Barbearia não informada." });
  }

  const sql = `
    SELECT *
    FROM servicos
    WHERE barbearia_id = ?
    AND ativo = 1
    ORDER BY id DESC
  `;

  db.query(sql, [barbearia_id], (err, result) => {
    if (err) {
      console.error("Erro ao listar serviços:", err);
      return res.status(500).json({ erro: "Erro ao listar serviços." });
    }

    res.json(result);
  });
};

const editarServico = (req, res) => {
  const { id } = req.params;
  const { barbearia_id, nome, descricao, preco, duracao_minutos } = req.body;

  if (!id || !barbearia_id) {
    return res
      .status(400)
      .json({ erro: "Serviço ou barbearia não informado." });
  }

  if (!nome || !preco || !duracao_minutos) {
    return res.status(400).json({
      erro: "Preencha nome, preço e duração do serviço.",
    });
  }

  const sql = `
    UPDATE servicos
    SET nome = ?, descricao = ?, preco = ?, duracao_minutos = ?
    WHERE id = ?
    AND barbearia_id = ?
    AND ativo = 1
  `;

  db.query(
    sql,
    [nome.trim(), descricao || null, preco, duracao_minutos, id, barbearia_id],
    (err, result) => {
      if (err) {
        console.error("Erro ao editar serviço:", err);
        return res.status(500).json({ erro: "Erro ao editar serviço." });
      }

      if (result.affectedRows === 0) {
        return res.status(404).json({ erro: "Serviço não encontrado." });
      }

      res.json({ sucesso: true });
    },
  );
};

const deletarServico = (req, res) => {
  const { id } = req.params;
  const barbearia_id = pegarBarbeariaId(req);

  if (!id || !barbearia_id) {
    return res
      .status(400)
      .json({ erro: "Serviço ou barbearia não informado." });
  }

  const sql = `
    UPDATE servicos
    SET ativo = 0
    WHERE id = ?
    AND barbearia_id = ?
  `;

  db.query(sql, [id, barbearia_id], (err, result) => {
    if (err) {
      console.error("Erro ao remover serviço:", err);
      return res.status(500).json({ erro: "Erro ao remover serviço." });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({ erro: "Serviço não encontrado." });
    }

    res.json({ sucesso: true });
  });
};

module.exports = {
  criarServico,
  listarServicos,
  editarServico,
  deletarServico,
};
