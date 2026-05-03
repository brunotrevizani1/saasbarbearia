const API_URL = "https://saasbarbearia.up.railway.app";

let mesAtual = new Date().getMonth();
let anoAtual = new Date().getFullYear();
let dataSelecionada = "";
let horaSelecionada = "";

const params = new URLSearchParams(window.location.search);
const barbeariaId = params.get("barbearia");

let barbeiroSelecionado = null;
let barbeiroSelecionadoNome = "";

if (!barbeariaId) {
  alert("Barbearia não informada.");
}

const hoje = new Date();
hoje.setHours(0, 0, 0, 0);

const mesAtualReal = hoje.getMonth();
const anoAtualReal = hoje.getFullYear();

function trocarTela(telaNovaId) {
  const telas = [
    "tela-barbeiro",
    "tela-data",
    "tela-horarios",
    "tela-confirmar",
    "tela-sucesso",
    "tela-localizacao",
    "tela-produtos",
    "tela-cancelar",
  ];

  telas.forEach((id) => {
    const tela = document.getElementById(id);
    if (tela) tela.classList.remove("tela-ativa");
  });

  document.getElementById(telaNovaId).classList.add("tela-ativa");

  const btnLocalizacao = document.querySelector(".btn-localizacao");
  const btnCancelar = document.querySelector(".btn-cancelar");
  const btnProdutos = document.querySelector(".btn-produtos");

  if (telaNovaId === "tela-barbeiro") {
    btnLocalizacao.style.display = "flex";
    btnCancelar.style.display = "flex";
    btnProdutos.style.display = "flex";
  } else {
    btnLocalizacao.style.display = "none";
    btnCancelar.style.display = "none";
    btnProdutos.style.display = "none";
  }

  const container = document.querySelector(".container");

  if (telaNovaId === "tela-produtos") {
    container.style.display = "none";
  } else {
    container.style.display = "block";
  }
}

function formatarDataLocal(data) {
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, "0");
  const dia = String(data.getDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
}

function formatarDataBonita(dataString) {
  const [ano, mes, dia] = dataString.split("-");
  const data = new Date(Number(ano), Number(mes) - 1, Number(dia));

  return data.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function horarioParaMinutos(horario) {
  const [hora, minuto] = horario.split(":").map(Number);
  return hora * 60 + minuto;
}

function minutosParaHorario(minutos) {
  const hora = Math.floor(minutos / 60);
  const minuto = minutos % 60;

  return `${String(hora).padStart(2, "0")}:${String(minuto).padStart(2, "0")}`;
}

function gerarHorarios(
  horaInicio,
  horaFim,
  intervalo,
  almocoInicio = null,
  almocoFim = null,
) {
  const horarios = [];

  const inicioMin = horarioParaMinutos(horaInicio);
  const fimMin = horarioParaMinutos(horaFim);
  const intervaloMin = Number(intervalo);

  const almocoInicioMin = almocoInicio
    ? horarioParaMinutos(almocoInicio)
    : null;
  const almocoFimMin = almocoFim ? horarioParaMinutos(almocoFim) : null;

  function adicionarHorarios(inicio, fim) {
    let atual = inicio;

    while (atual < fim) {
      horarios.push(minutosParaHorario(atual));
      atual += intervaloMin;
    }
  }

  if (almocoInicioMin !== null && almocoFimMin !== null) {
    adicionarHorarios(inicioMin, almocoInicioMin);
    adicionarHorarios(almocoFimMin, fimMin);
  } else {
    adicionarHorarios(inicioMin, fimMin);
  }

  return horarios;
}

function filtrarHorariosPassados(horarios, dataSelecionadaTexto) {
  const hojeTexto = formatarDataLocal(new Date());

  if (dataSelecionadaTexto !== hojeTexto) return horarios;

  const agora = new Date();

  return horarios.filter((horario) => {
    const [hora, minuto] = horario.split(":").map(Number);

    const dataHorario = new Date();
    dataHorario.setHours(hora, minuto, 0, 0);

    return dataHorario > agora;
  });
}

/* BARBEIROS */
async function carregarBarbeirosCliente() {
  const lista = document.getElementById("listaBarbeirosCliente");
  const semBarbeiros = document.getElementById("semBarbeirosCliente");

  lista.innerHTML = "";
  semBarbeiros.style.display = "none";

  try {
    const resposta = await fetch(
      `${API_URL}/api/barbeiros?barbearia_id=${barbeariaId}`,
    );

    const barbeiros = await resposta.json();

    if (!barbeiros.length) {
      semBarbeiros.style.display = "block";
      return;
    }

    barbeiros.forEach((barbeiro) => {
      const card = document.createElement("div");
      card.className = "item-barbeiro-cliente";
      card.onclick = () => selecionarBarbeiro(barbeiro.id, barbeiro.nome);

      card.innerHTML = `
        <strong>${barbeiro.nome}</strong>
        <span>Ver horários disponíveis</span>
      `;

      lista.appendChild(card);
    });
  } catch (error) {
    console.error("Erro ao carregar barbeiros:", error);
    semBarbeiros.style.display = "block";
    semBarbeiros.innerText = "Erro ao carregar barbeiros.";
  }
}

function selecionarBarbeiro(id, nome) {
  barbeiroSelecionado = id;
  barbeiroSelecionadoNome = nome;
  dataSelecionada = "";
  horaSelecionada = "";

  const info = document.getElementById("barbeiroSelecionadoInfo");

  if (info) {
    info.innerHTML = `
      <span>Barbeiro selecionado:</span>
      <strong>${nome}</strong>
    `;
  }

  trocarTela("tela-data");
  gerarCalendario();
}

function voltarParaBarbeiros() {
  barbeiroSelecionado = null;
  barbeiroSelecionadoNome = "";
  dataSelecionada = "";
  horaSelecionada = "";
  trocarTela("tela-barbeiro");
}

/* FORMATA TELEFONE */
document.addEventListener("DOMContentLoaded", () => {
  const telefoneInput = document.getElementById("telefone");

  if (telefoneInput) {
    telefoneInput.addEventListener("input", () => {
      let valor = telefoneInput.value.replace(/\D/g, "");

      if (valor.length > 11) valor = valor.slice(0, 11);

      if (valor.length > 10) {
        valor = valor.replace(/^(\d{2})(\d{5})(\d{4}).*/, "($1) $2-$3");
      } else if (valor.length > 6) {
        valor = valor.replace(/^(\d{2})(\d{4})(\d{0,4}).*/, "($1) $2-$3");
      } else if (valor.length > 2) {
        valor = valor.replace(/^(\d{2})(\d{0,5})/, "($1) $2");
      } else {
        valor = valor.replace(/^(\d*)/, "($1");
      }

      telefoneInput.value = valor;
    });
  }
});

/* CALENDÁRIO */
async function gerarCalendario() {
  if (!barbeiroSelecionado) {
    trocarTela("tela-barbeiro");
    return;
  }

  const calendario = document.getElementById("calendario");
  const mesAno = document.getElementById("mesAno");

  calendario.innerHTML = "";

  const nomesMes = [
    "Janeiro",
    "Fevereiro",
    "Março",
    "Abril",
    "Maio",
    "Junho",
    "Julho",
    "Agosto",
    "Setembro",
    "Outubro",
    "Novembro",
    "Dezembro",
  ];

  mesAno.innerText = `${nomesMes[mesAtual]} ${anoAtual}`;

  const btnAnterior = document.querySelector(
    ".calendario-header button:first-child",
  );

  btnAnterior.disabled = mesAtual === mesAtualReal && anoAtual === anoAtualReal;

  const [resAg, resBl, resConf, resExc] = await Promise.all([
    fetch(
      `${API_URL}/api/agendamentos?barbearia_id=${barbeariaId}&barbeiro_id=${barbeiroSelecionado}`,
    ),
    fetch(
      `${API_URL}/api/barbeiro/dias-bloqueados?barbearia_id=${barbeariaId}&barbeiro_id=${barbeiroSelecionado}`,
    ),
    fetch(
      `${API_URL}/api/barbeiro/configuracao-agenda?barbearia_id=${barbeariaId}&barbeiro_id=${barbeiroSelecionado}`,
    ),
    fetch(
      `${API_URL}/api/barbeiro/excecoes-horario?barbearia_id=${barbeariaId}&barbeiro_id=${barbeiroSelecionado}`,
    ),
  ]);

  const agendamentos = await resAg.json();
  const diasBloqueados = await resBl.json();
  const config = await resConf.json();
  const excecoes = await resExc.json();

  let horariosPadrao = gerarHorarios(
    config.hora_inicio.slice(0, 5),
    config.hora_fim.slice(0, 5),
    config.intervalo,
    config.almoco_inicio ? config.almoco_inicio.slice(0, 5) : null,
    config.almoco_fim ? config.almoco_fim.slice(0, 5) : null,
  );

  const primeiroDia = new Date(anoAtual, mesAtual, 1).getDay();
  const diasNoMes = new Date(anoAtual, mesAtual + 1, 0).getDate();

  for (let i = 0; i < primeiroDia; i++) {
    const div = document.createElement("div");
    div.className = "dia vazio";
    calendario.appendChild(div);
  }

  for (let dia = 1; dia <= diasNoMes; dia++) {
    const data = new Date(anoAtual, mesAtual, dia);
    const dataStr = formatarDataLocal(data);

    const div = document.createElement("div");
    div.className = "dia";
    div.innerText = dia;

    if (data < hoje) {
      div.classList.add("passado");
    } else {
      const bloqueio = diasBloqueados.find(
        (b) => b.data.slice(0, 10) === dataStr,
      );

      const diaSemana = data.getDay();

      const bloqueioSemanal =
        (diaSemana === 1 && Number(config.bloquear_segunda) === 1) ||
        (diaSemana === 2 && Number(config.bloquear_terca) === 1) ||
        (diaSemana === 3 && Number(config.bloquear_quarta) === 1) ||
        (diaSemana === 4 && Number(config.bloquear_quinta) === 1) ||
        (diaSemana === 5 && Number(config.bloquear_sexta) === 1) ||
        (diaSemana === 6 && Number(config.bloquear_sabado) === 1) ||
        (diaSemana === 0 && Number(config.bloquear_domingo) === 1);

      const excecaoDia = excecoes.find((e) => e.data.slice(0, 10) === dataStr);

      let horariosValidosDia = [...horariosPadrao];

      if (excecaoDia) {
        horariosValidosDia = aplicarExcecaoHorario(
          horariosValidosDia,
          excecaoDia,
        );
      }

      horariosValidosDia = filtrarHorariosPassados(horariosValidosDia, dataStr);

      const agendados = agendamentos.filter(
        (a) => a.data.slice(0, 10) === dataStr && a.status === "agendado",
      );

      if (
        bloqueio ||
        bloqueioSemanal ||
        agendados.length >= horariosValidosDia.length
      ) {
        div.classList.add("lotado");
      }

      div.onclick = () => selecionarDia(data, bloqueio, bloqueioSemanal);
    }

    calendario.appendChild(div);
  }
}

function aplicarExcecaoHorario(horarios, excecao) {
  if (!excecao) return horarios;

  if (excecao.tipo === "fechar_manha") {
    return horarios.filter((h) => horarioParaMinutos(h) >= 12 * 60);
  }

  if (excecao.tipo === "fechar_tarde") {
    return horarios.filter((h) => horarioParaMinutos(h) < 12 * 60);
  }

  if (excecao.tipo === "personalizado") {
    const inicio = horarioParaMinutos(excecao.hora_inicio.slice(0, 5));
    const fim = horarioParaMinutos(excecao.hora_fim.slice(0, 5));

    return horarios.filter((h) => {
      const minutos = horarioParaMinutos(h);

      // remove apenas o período escolhido
      return minutos < inicio || minutos >= fim;
    });
  }

  return horarios;
}

function selecionarDia(data, bloqueio, bloqueioSemanal = false) {
  dataSelecionada = formatarDataLocal(data);

  if (bloqueio || bloqueioSemanal) {
    document.getElementById("listaHorarios").innerHTML = "";

    const aviso = document.getElementById("semHorarios");

    if (bloqueio) {
      aviso.innerText = bloqueio.motivo || "Dia indisponível pelo barbeiro.";
    } else {
      aviso.innerText = "O barbeiro escolhido não trabalhará neste dia.";
    }

    aviso.classList.add("mostrar");

    trocarTela("tela-horarios");
    return;
  }

  carregarHorarios();
}

/* HORÁRIOS */
async function carregarHorarios() {
  if (!barbeiroSelecionado) {
    trocarTela("tela-barbeiro");
    return;
  }

  const [resAg, resConf, resExc] = await Promise.all([
    fetch(
      `${API_URL}/api/agendamentos?barbearia_id=${barbeariaId}&barbeiro_id=${barbeiroSelecionado}`,
    ),
    fetch(
      `${API_URL}/api/barbeiro/configuracao-agenda?barbearia_id=${barbeariaId}&barbeiro_id=${barbeiroSelecionado}`,
    ),
    fetch(
      `${API_URL}/api/barbeiro/excecoes-horario?barbearia_id=${barbeariaId}&barbeiro_id=${barbeiroSelecionado}`,
    ),
  ]);

  const agendamentos = await resAg.json();
  const config = await resConf.json();
  const excecoes = await resExc.json();

  let horarios = gerarHorarios(
    config.hora_inicio.slice(0, 5),
    config.hora_fim.slice(0, 5),
    config.intervalo,
    config.almoco_inicio ? config.almoco_inicio.slice(0, 5) : null,
    config.almoco_fim ? config.almoco_fim.slice(0, 5) : null,
  );

  const excecaoDia = excecoes.find(
    (e) => e.data.slice(0, 10) === dataSelecionada,
  );

  if (excecaoDia) {
    horarios = aplicarExcecaoHorario(horarios, excecaoDia);
  }

  horarios = filtrarHorariosPassados(horarios, dataSelecionada);

  const lista = document.getElementById("listaHorarios");
  const aviso = document.getElementById("semHorarios");

  lista.innerHTML = "";
  lista.classList.remove("duas-colunas");

  aviso.classList.remove("mostrar");
  aviso.innerText = "Todos os horários para esse dia foram esgotados";

  let temHorarioLivre = false;

  if (horarios.length > 10) {
    lista.classList.add("duas-colunas");
  }

  horarios.forEach((h) => {
    const ocupado = agendamentos.some(
      (a) =>
        a.data.slice(0, 10) === dataSelecionada &&
        a.hora.slice(0, 5) === h &&
        a.status === "agendado",
    );

    const div = document.createElement("div");

    if (ocupado) {
      div.className = "horario horario-ocupado";
      div.innerHTML = `
        <strong>${h}</strong>
        <span>Já agendado</span>
      `;
    } else {
      temHorarioLivre = true;
      div.className = "horario";
      div.innerText = h;
      div.onclick = () => selecionarHorario(h);
    }

    lista.appendChild(div);
  });

  if (!temHorarioLivre) {
    aviso.classList.add("mostrar");
  }

  trocarTela("tela-horarios");
}

function selecionarHorario(h) {
  horaSelecionada = h;
  trocarTela("tela-confirmar");
}

/* CONFIRMAR */
async function confirmar() {
  const nome = document.getElementById("nome").value.trim();
  const telefone = document.getElementById("telefone").value.trim();
  const mensagem = document.getElementById("mensagem");

  mensagem.innerText = "";

  if (!barbeiroSelecionado) {
    mensagem.innerText = "Escolha um barbeiro.";
    return;
  }

  if (!nome || !telefone) {
    mensagem.innerText = "Preencha tudo.";
    return;
  }

  const res = await fetch(`${API_URL}/api/agendar`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      nome,
      telefone,
      data: dataSelecionada,
      hora: horaSelecionada,
      barbearia_id: barbeariaId,
      barbeiro_id: barbeiroSelecionado,
    }),
  });

  const r = await res.json();

  if (!r.sucesso) {
    mensagem.innerText = r.erro || "Erro ao agendar.";
    return;
  }

  document.getElementById("resumo").innerHTML = `
    <div class="item-resumo">
      <svg viewBox="0 0 24 24" fill="none">
        <path
          d="M20 21a8 8 0 0 0-16 0M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z"
          stroke="currentColor"
          stroke-width="1.8"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
      <span>${barbeiroSelecionadoNome}</span>
    </div>

    <div class="item-resumo">
      <svg viewBox="0 0 24 24" fill="none">
        <path
          d="M8 2v4M16 2v4M3 10h18M5 5h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z"
          stroke="currentColor"
          stroke-width="1.8"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
      <span>${formatarDataBonita(dataSelecionada)}</span>
    </div>

    <div class="item-resumo">
      <svg viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.8" />
        <path
          d="M12 7v5l3 2"
          stroke="currentColor"
          stroke-width="1.8"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
      <span>${horaSelecionada}</span>
    </div>

    <div class="item-resumo">
      <svg viewBox="0 0 24 24" fill="none">
        <path
          d="M20 21a8 8 0 0 0-16 0M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z"
          stroke="currentColor"
          stroke-width="1.8"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
      <span>${nome}</span>
    </div>

    <p class="texto-sucesso">Tudo certo! Te esperamos.</p>
  `;

  document.getElementById("codigoCancelamentoBox").innerHTML = `
    Seu código de cancelamento:
    <strong>${r.codigo}</strong>
  `;

  trocarTela("tela-sucesso");
}

async function carregarLogoCliente() {
  try {
    const resposta = await fetch(
      `${API_URL}/api/barbeiro/logo?barbearia_id=${barbeariaId}`,
    );

    const data = await resposta.json();

    const img = document.getElementById("logoBarbearia");

    if (data.logo) {
      img.src = `${API_URL}${data.logo}`;
      img.style.display = "block";
    }
  } catch (error) {
    console.error("Erro ao carregar logo cliente:", error);
  }
}

/* LOCALIZAÇÃO */

async function abrirTelaLocalizacao() {
  try {
    const res = await fetch(
      `${API_URL}/api/barbeiro/localizacao?barbearia_id=${barbeariaId}`,
    );

    const c = await res.json();

    if (!c.rua && !c.numero && !c.bairro && !c.cidade) {
      document.getElementById("textoLocalizacao").innerText =
        "Localização ainda não informada.";
    } else {
      document.getElementById("textoLocalizacao").innerText =
        `${c.rua || ""}, ${c.numero || ""} - ${c.bairro || ""} - ${c.cidade || ""}`;
    }

    trocarTela("tela-localizacao");
  } catch (error) {
    console.error("Erro ao buscar localização:", error);
    document.getElementById("textoLocalizacao").innerText =
      "Erro ao carregar localização.";
    trocarTela("tela-localizacao");
  }
}

function voltarDaLocalizacao() {
  if (barbeiroSelecionado) {
    trocarTela("tela-data");
  } else {
    trocarTela("tela-barbeiro");
  }
}

/* CANCELAMENTO */
function abrirTelaCancelamento() {
  document.getElementById("cancelarCodigo").value = "";
  document.getElementById("mensagemCancelamento").innerText = "";
  document.getElementById("agendamentoCancelamentoInfo").innerHTML = "";
  trocarTela("tela-cancelar");
}

function voltarDaTelaCancelar() {
  document.getElementById("cancelarCodigo").value = "";
  document.getElementById("mensagemCancelamento").innerText = "";
  document.getElementById("agendamentoCancelamentoInfo").innerHTML = "";

  if (barbeiroSelecionado) {
    trocarTela("tela-data");
  } else {
    trocarTela("tela-barbeiro");
  }
}

async function buscarAgendamentoParaCancelar() {
  const codigo = document
    .getElementById("cancelarCodigo")
    .value.trim()
    .toUpperCase();

  const mensagem = document.getElementById("mensagemCancelamento");
  const info = document.getElementById("agendamentoCancelamentoInfo");

  mensagem.innerText = "";
  info.innerHTML = "";

  if (!codigo) {
    mensagem.innerText = "Digite seu código de cancelamento.";
    return;
  }

  try {
    const res = await fetch(`${API_URL}/api/cancelar/buscar`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ codigo, barbearia_id: barbeariaId }),
    });

    const r = await res.json();

    if (!r.sucesso) {
      mensagem.innerText = r.erro || "Agendamento não encontrado.";
      return;
    }

    const agendamento = r.agendamento;

    info.innerHTML = `
      <div class="card-cancelamento">
        <h3>Agendamento encontrado</h3>

        <div class="item-cancelamento">
          <span><strong>Nome:</strong> ${agendamento.nome}</span>
        </div>

        <div class="item-cancelamento">
          <span><strong>Barbeiro:</strong> ${
            agendamento.barbeiro_nome || "Não informado"
          }</span>
        </div>

        <div class="item-cancelamento">
          <span><strong>Telefone:</strong> ${agendamento.telefone}</span>
        </div>

        <div class="item-cancelamento">
          <span><strong>Data:</strong> ${formatarDataBonita(
            agendamento.data.slice(0, 10),
          )}</span>
        </div>

        <div class="item-cancelamento">
          <span><strong>Horário:</strong> ${agendamento.hora.slice(0, 5)}</span>
        </div>

        <button
          class="btn-confirmar-cancelamento"
          onclick="confirmarCancelamento('${agendamento.codigo}')"
        >
          Confirmar cancelamento
        </button>
      </div>
    `;
  } catch (error) {
    mensagem.innerText = "Erro ao conectar com o servidor.";
  }
}

async function confirmarCancelamento(codigo) {
  const mensagem = document.getElementById("mensagemCancelamento");
  const info = document.getElementById("agendamentoCancelamentoInfo");

  mensagem.innerText = "";

  try {
    const res = await fetch(`${API_URL}/api/cancelar`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ codigo, barbearia_id: barbeariaId }),
    });

    const r = await res.json();

    if (!r.sucesso) {
      mensagem.innerText = r.erro || "Erro ao cancelar.";
      return;
    }

    mensagem.innerText = "Agendamento cancelado com sucesso.";
    info.innerHTML = "";
    document.getElementById("cancelarCodigo").value = "";

    if (barbeiroSelecionado) {
      await gerarCalendario();
    }
  } catch (error) {
    mensagem.innerText = "Erro ao conectar com o servidor.";
  }
}

/* VOLTAR */
function voltarParaData() {
  trocarTela("tela-data");
}

function voltarParaHorarios() {
  trocarTela("tela-horarios");
}

function novoAgendamento() {
  document.getElementById("nome").value = "";
  document.getElementById("telefone").value = "";
  document.getElementById("mensagem").innerText = "";
  document.getElementById("codigoCancelamentoBox").innerHTML = "";
  document.getElementById("resumo").innerHTML = "";

  barbeiroSelecionado = null;
  barbeiroSelecionadoNome = "";
  dataSelecionada = "";
  horaSelecionada = "";

  trocarTela("tela-barbeiro");
  carregarBarbeirosCliente();
}

/* MÊS */
function mesAnterior() {
  if (mesAtual === mesAtualReal && anoAtual === anoAtualReal) return;
  mesAtual--;

  if (mesAtual < 0) {
    mesAtual = 11;
    anoAtual--;
  }

  gerarCalendario();
}

function proximoMes() {
  mesAtual++;

  if (mesAtual > 11) {
    mesAtual = 0;
    anoAtual++;
  }

  gerarCalendario();
}

function abrirTelaProdutos() {
  trocarTela("tela-produtos");
  carregarProdutosCliente();
}

function voltarDaTelaProdutos() {
  trocarTela("tela-barbeiro");
}

function mudarImagemProdutoCliente(produtoId, direcao) {
  const img = document.getElementById(`imagemProdutoCliente${produtoId}`);
  const indicador = document.getElementById(
    `indicadorProdutoCliente${produtoId}`,
  );

  if (!img) return;

  const imagens = JSON.parse(img.dataset.imagens || "[]");

  if (!imagens.length) return;

  let indexAtual = Number(img.dataset.index || 0);
  let novoIndex = indexAtual + direcao;

  if (novoIndex < 0) {
    novoIndex = imagens.length - 1;
  }

  if (novoIndex >= imagens.length) {
    novoIndex = 0;
  }

  img.dataset.index = novoIndex;
  img.src = `${API_URL}${imagens[novoIndex]}`;

  if (indicador) {
    indicador.innerText = `${novoIndex + 1}/${imagens.length}`;
  }
}

async function carregarProdutosCliente() {
  const lista = document.getElementById("listaProdutosCliente");
  const vazio = document.getElementById("semProdutosCliente");

  lista.innerHTML = "";
  vazio.style.display = "none";

  try {
    const res = await fetch(
      `${API_URL}/api/produtos?barbearia_id=${barbeariaId}`,
    );

    const produtos = await res.json();

    if (!produtos.length) {
      vazio.style.display = "block";
      return;
    }

    produtos.forEach((p) => {
      const imagens = [p.imagem_1, p.imagem_2, p.imagem_3].filter(Boolean);

      const card = document.createElement("div");
      card.className = "card-produto-cliente";

      card.innerHTML = `
        ${
          imagens.length
            ? `
              <div class="galeria-produto-cliente">
                <img
                  id="imagemProdutoCliente${p.id}"
                  src="${API_URL}${imagens[0]}"
                  alt="${p.titulo}"
                  data-imagens='${JSON.stringify(imagens)}'
                  data-index="0"
                />

                ${
                  imagens.length > 1
                    ? `
                      <button
                        class="btn-galeria-produto esquerda"
                        onclick="mudarImagemProdutoCliente(${p.id}, -1)"
                      >
                        ‹
                      </button>

                      <button
                        class="btn-galeria-produto direita"
                        onclick="mudarImagemProdutoCliente(${p.id}, 1)"
                      >
                        ›
                      </button>

                      <span
                        id="indicadorProdutoCliente${p.id}"
                        class="indicador-galeria-produto"
                      >
                        1/${imagens.length}
                      </span>
                    `
                    : ""
                }
              </div>
            `
            : `<div class="produto-sem-imagem">Sem imagem</div>`
        }

        <div class="card-produto-info">
          <h3>${p.titulo}</h3>

          <p>${p.descricao || "Sem descrição."}</p>

          <strong>R$ ${Number(p.valor).toFixed(2).replace(".", ",")}</strong>

          <span class="produto-aviso-pagamento">
            Pagamento presencial na barbearia
          </span>

          ${
            Number(p.estoque) > 0
              ? `
      <span class="produto-estoque-cliente">
        Disponível: ${p.estoque}
      </span>

      <button class="btn-reservar-produto" onclick="abrirModalReservaProduto(${p.id})">
        Reservar produto
      </button>
    `
              : `
      <span class="produto-esgotado-cliente">
        Esgotado
      </span>

      <button class="btn-reservar-produto" disabled>
        Produto esgotado
      </button>
    `
          }
        </div>
      `;

      lista.appendChild(card);
    });
  } catch (e) {
    console.error(e);
    vazio.style.display = "block";
    vazio.innerText = "Erro ao carregar produtos.";
  }
}

function copiarCodigoReservaCliente() {
  const codigo = document.getElementById("codigoReservaCliente")?.innerText;

  if (!codigo) return;

  navigator.clipboard.writeText(codigo).then(() => {
    const mensagem = document.getElementById("mensagemReservaProduto");

    const aviso = document.createElement("div");
    aviso.className = "aviso-codigo-copiado";
    aviso.innerText = "Código copiado!";

    mensagem.appendChild(aviso);

    setTimeout(() => {
      aviso.remove();
    }, 1800);
  });
}

async function carregarConfigProdutosCliente() {
  const btnProdutos = document.querySelector(".btn-produtos");

  if (!btnProdutos) return;

  try {
    const resposta = await fetch(
      `${API_URL}/api/produtos/config?barbearia_id=${barbeariaId}`,
    );

    const data = await resposta.json();

    if (!data.sucesso || !data.mostrar_produtos) {
      btnProdutos.style.display = "none";
      return;
    }

    btnProdutos.style.display = "flex";
  } catch (error) {
    console.error("Erro ao carregar configuração de produtos:", error);
    btnProdutos.style.display = "none";
  }
}

function abrirModalReservaProduto(produtoId) {
  document.getElementById("produtoReservaId").value = produtoId;
  document.getElementById("produtoReservaNome").value = "";
  document.getElementById("produtoReservaTelefone").value = "";
  document.getElementById("mensagemReservaProduto").innerText = "";

  document.getElementById("modalReservaProduto").classList.add("ativo");
}

function fecharModalReservaProduto() {
  document.getElementById("modalReservaProduto").classList.remove("ativo");
}

async function confirmarReservaProduto() {
  const produto_id = document.getElementById("produtoReservaId").value;
  const nome_cliente = document
    .getElementById("produtoReservaNome")
    .value.trim();
  const telefone_cliente = document
    .getElementById("produtoReservaTelefone")
    .value.trim();

  const mensagem = document.getElementById("mensagemReservaProduto");

  mensagem.innerText = "";

  if (!nome_cliente || !telefone_cliente) {
    mensagem.innerText = "Preencha nome e telefone.";
    return;
  }

  try {
    const resposta = await fetch(`${API_URL}/api/produtos/reservar`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        produto_id,
        barbearia_id: barbeariaId,
        nome_cliente,
        telefone_cliente,
      }),
    });

    const resultado = await resposta.json();

    if (!resultado.sucesso) {
      mensagem.innerText = resultado.erro || "Erro ao reservar produto.";
      return;
    }

    mensagem.innerHTML = `
  <div class="box-reserva-confirmada">
    <strong class="titulo-reserva-confirmada">
      Produto reservado com sucesso!
    </strong>

    <span>
      O pagamento será feito presencialmente na barbearia.
    </span>

    <span>
      Guarde este código e mostre para o barbeiro identificar seu pedido:
    </span>

    <div class="codigo-reserva-cliente-box">
      <strong id="codigoReservaCliente">${resultado.codigo}</strong>

      <button type="button" onclick="copiarCodigoReservaCliente()">
        Copiar
      </button>
    </div>
  </div>
`;

    await carregarProdutosCliente();
  } catch (error) {
    console.error("Erro ao reservar produto:", error);
    mensagem.innerText = "Erro ao conectar com o servidor.";
  }
}

carregarBarbeirosCliente();
trocarTela("tela-barbeiro");
carregarLogoCliente();
carregarConfigProdutosCliente();
