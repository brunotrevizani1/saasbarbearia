const express = require("express");
const router = express.Router();

const {
  criarServico,
  listarServicos,
  editarServico,
  deletarServico,
} = require("../controllers/servicoController");

router.post("/servicos", criarServico);
router.get("/servicos", listarServicos);
router.put("/servicos/:id", editarServico);
router.delete("/servicos/:id", deletarServico);

module.exports = router;
