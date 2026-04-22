const express = require("express");
const router = express.Router();

const {
  listarAgendamentos,
  concluirAgendamento,
  deletarAgendamento,
  listarDiasBloqueados,
  bloquearDia,
  desbloquearDia,
  buscarConfiguracaoAgenda,
  salvarConfiguracaoAgenda,
} = require("../controllers/barbeiroController");

router.get("/agendamentos", listarAgendamentos);
router.put("/agendamentos/:id/concluir", concluirAgendamento);
router.delete("/agendamentos/:id", deletarAgendamento);

router.get("/dias-bloqueados", listarDiasBloqueados);
router.post("/dias-bloqueados", bloquearDia);
router.delete("/dias-bloqueados/:id", desbloquearDia);

router.get("/configuracao-agenda", buscarConfiguracaoAgenda);
router.post("/configuracao-agenda", salvarConfiguracaoAgenda);

module.exports = router;
