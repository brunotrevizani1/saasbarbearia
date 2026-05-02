const express = require("express");
const router = express.Router();

const {
  criarProduto,
  listarProdutos,
  listarProdutosCliente,
  deletarProduto,
  reservarProduto,
  buscarReservaProduto,
  finalizarReservaProduto,
  cancelarReservaProduto,
} = require("../controllers/produtoController");

router.post("/produtos", criarProduto);
router.get("/produtos", listarProdutos);
router.get("/produtos/cliente", listarProdutosCliente);

router.post("/produtos/reservar", reservarProduto);

router.get("/produtos/reservas/:codigo", buscarReservaProduto);
router.put("/produtos/reservas/:codigo/finalizar", finalizarReservaProduto);
router.put("/produtos/reservas/:codigo/cancelar", cancelarReservaProduto);

router.delete("/produtos/:id", deletarProduto);

module.exports = router;
