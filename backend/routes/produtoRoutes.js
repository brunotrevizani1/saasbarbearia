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
  editarProduto,
  buscarConfigProdutos,
  salvarConfigProdutos,
} = require("../controllers/produtoController");

router.post("/produtos", criarProduto);
router.get("/produtos", listarProdutos);
router.get("/produtos/cliente", listarProdutosCliente);

router.get("/produtos/config", buscarConfigProdutos);
router.put("/produtos/config", salvarConfigProdutos);

router.post("/produtos/reservar", reservarProduto);

router.get("/produtos/reservas/:codigo", buscarReservaProduto);
router.put("/produtos/reservas/:codigo/finalizar", finalizarReservaProduto);
router.put("/produtos/reservas/:codigo/cancelar", cancelarReservaProduto);

router.put("/produtos/:id", editarProduto);
router.delete("/produtos/:id", deletarProduto);

module.exports = router;
