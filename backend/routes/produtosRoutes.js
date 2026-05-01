const express = require("express");
const router = express.Router();

const {
  criarProduto,
  listarProdutos,
} = require("../controllers/produtoController");

router.post("/produtos", criarProduto);
router.get("/produtos", listarProdutos);

module.exports = router;
