const express = require("express");
const router = express.Router();

const {
  criarProduto,
  listarProdutos,
  deletarProduto,
  reservarProduto,
} = require("../controllers/produtoController");

router.post("/produtos", criarProduto);
router.get("/produtos", listarProdutos);
router.delete("/produtos/:id", deletarProduto);
router.post("/produtos/reservar", reservarProduto);

module.exports = router;
