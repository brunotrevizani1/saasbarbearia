const express = require("express");
const router = express.Router();

const {
  listarBarbeiros,
  criarBarbeiro,
  atualizarBarbeiro,
  deletarBarbeiro,

  listarAgendamentos,
  concluirAgendamento,
  deletarAgendamento,

  listarDiasBloqueados,
  bloquearDia,
  desbloquearDia,

  listarExcecoesHorario,
  criarExcecaoHorario,
  deletarExcecaoHorario,

  buscarConfiguracaoAgenda,
  salvarConfiguracaoAgenda,

  buscarLocalizacaoBarbearia,
  salvarLocalizacaoBarbearia,

  uploadLogoBarbearia,
  buscarLogoBarbearia,
  gerarRelatorioAgendamentos,

  editarBarbeiro,
  buscarServicosDoBarbeiro,
} = require("../controllers/barbeiroController");

router.get("/barbeiros", listarBarbeiros);
router.post("/barbeiros", criarBarbeiro);
router.put("/barbeiros/:id", atualizarBarbeiro);
router.delete("/barbeiros/:id", deletarBarbeiro);

router.get("/agendamentos", listarAgendamentos);
router.put("/agendamentos/:id/concluir", concluirAgendamento);
router.delete("/agendamentos/:id", deletarAgendamento);

router.get("/dias-bloqueados", listarDiasBloqueados);
router.post("/dias-bloqueados", bloquearDia);
router.delete("/dias-bloqueados/:id", desbloquearDia);

router.get("/excecoes-horario", listarExcecoesHorario);
router.post("/excecoes-horario", criarExcecaoHorario);
router.delete("/excecoes-horario/:id", deletarExcecaoHorario);

router.get("/configuracao-agenda", buscarConfiguracaoAgenda);
router.post("/configuracao-agenda", salvarConfiguracaoAgenda);

router.get("/localizacao", buscarLocalizacaoBarbearia);
router.put("/localizacao", salvarLocalizacaoBarbearia);

router.post("/logo", uploadLogoBarbearia);
router.get("/logo", buscarLogoBarbearia);

router.get("/relatorios", gerarRelatorioAgendamentos);

router.get("/barbeiros/:id/servicos", buscarServicosDoBarbeiro);
router.put("/barbeiros/:id", editarBarbeiro);

module.exports = router;
