let mesAtual = new Date().getMonth();
let anoAtual = new Date().getFullYear();
let dataSelecionada = "";
let horaSelecionada = "";

const hoje = new Date();
hoje.setHours(0, 0, 0, 0);

const mesAtualReal = hoje.getMonth();
const anoAtualReal = hoje.getFullYear();

function trocarTela(telaNovaId) {
  const telas = [
    "tela-data",
    "tela-horarios",
    "tela-confirmar",
    "tela-sucesso",
    "tela-localizacao",
    "tela-cancelar",
  ];

  telas.forEach((id) => {
    document.getElementById(id).classList.remove("tela-ativa");
  });

  document.getElementById(telaNovaId).classList.add("tela-ativa");

  const btnLocalizacao = document.querySelector(".btn-localizacao");
  const btnCancelar = document.querySelector(".btn-cancelar");

  if (telaNovaId === "tela-data") {
    btnLocalizacao.style.display = "flex";
    btnCancelar.style.display = "flex";
  } else {
    btnLocalizacao.style.display = "none";
    btnCancelar.style.display = "none";
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

function gerarHorarios(horaInicio, horaFim, intervalo) {
  const horarios = [];

  const [horaInicial, minutoInicial] = horaInicio.split(":").map(Number);
  const [horaFinal, minutoFinal] = horaFim.split(":").map(Number);

  const inicio = new Date();
  inicio.setHours(horaInicial, minutoInicial, 0, 0);

  const fim = new Date();
  fim.setHours(horaFinal, minutoFinal, 0, 0);

  while (inicio < fim) {
    const hora = String(inicio.getHours()).padStart(2, "0");
    const minuto = String(inicio.getMinutes()).padStart(2, "0");
    horarios.push(`${hora}:${minuto}`);

    inicio.setMinutes(inicio.getMinutes() + Number(intervalo));
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

  const [resAg, resBl, resConf] = await Promise.all([
    fetch("http://localhost:3000/api/agendamentos"),
    fetch("http://localhost:3000/api/barbeiro/dias-bloqueados"),
    fetch("http://localhost:3000/api/barbeiro/configuracao-agenda"),
  ]);

  const agendamentos = await resAg.json();
  const diasBloqueados = await resBl.json();
  const config = await resConf.json();

  let horariosPadrao = gerarHorarios(
    config.hora_inicio.slice(0, 5),
    config.hora_fim.slice(0, 5),
    config.intervalo,
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

      const agendados = agendamentos.filter(
        (a) => a.data.slice(0, 10) === dataStr && a.status === "agendado",
      );

      if (bloqueio || agendados.length >= horariosPadrao.length) {
        div.classList.add("lotado");
      }

      div.onclick = () => selecionarDia(data, bloqueio);
    }

    calendario.appendChild(div);
  }
}

function selecionarDia(data, bloqueio) {
  dataSelecionada = formatarDataLocal(data);

  if (bloqueio) {
    document.getElementById("listaHorarios").innerHTML = "";
    const aviso = document.getElementById("semHorarios");
    aviso.innerText = bloqueio.motivo || "Dia indisponível";
    aviso.classList.add("mostrar");

    trocarTela("tela-horarios");
    return;
  }

  carregarHorarios();
}

/* HORÁRIOS */
async function carregarHorarios() {
  const [resAg, resConf] = await Promise.all([
    fetch("http://localhost:3000/api/agendamentos"),
    fetch("http://localhost:3000/api/barbeiro/configuracao-agenda"),
  ]);

  const agendamentos = await resAg.json();
  const config = await resConf.json();

  let horarios = gerarHorarios(
    config.hora_inicio.slice(0, 5),
    config.hora_fim.slice(0, 5),
    config.intervalo,
  );

  horarios = filtrarHorariosPassados(horarios, dataSelecionada);

  const lista = document.getElementById("listaHorarios");
  const aviso = document.getElementById("semHorarios");

  lista.innerHTML = "";
  aviso.classList.remove("mostrar");
  aviso.innerText = "Todos os horários para esse dia foram esgotados";

  const livres = horarios.filter(
    (h) =>
      !agendamentos.some(
        (a) =>
          a.data.slice(0, 10) === dataSelecionada &&
          a.hora.slice(0, 5) === h &&
          a.status === "agendado",
      ),
  );

  if (livres.length > 10) {
    lista.classList.add("duas-colunas");
  } else {
    lista.classList.remove("duas-colunas");
  }

  if (livres.length === 0) {
    aviso.classList.add("mostrar");
  }

  livres.forEach((h) => {
    const div = document.createElement("div");
    div.className = "horario";
    div.innerText = h;
    div.onclick = () => selecionarHorario(h);
    lista.appendChild(div);
  });

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

  if (!nome || !telefone) {
    mensagem.innerText = "Preencha tudo.";
    return;
  }

  const res = await fetch("http://localhost:3000/api/agendar", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      nome,
      telefone,
      data: dataSelecionada,
      hora: horaSelecionada,
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

/* LOCALIZAÇÃO */
async function abrirTelaLocalizacao() {
  const res = await fetch(
    "http://localhost:3000/api/barbeiro/configuracao-agenda",
  );
  const c = await res.json();

  document.getElementById("textoLocalizacao").innerText =
    `${c.rua}, ${c.numero} - ${c.bairro} - ${c.cidade}`;

  trocarTela("tela-localizacao");
}

function voltarDaLocalizacao() {
  trocarTela("tela-data");
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
  trocarTela("tela-data");
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
    const res = await fetch("http://localhost:3000/api/cancelar/buscar", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ codigo }),
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
    const res = await fetch("http://localhost:3000/api/cancelar", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ codigo }),
    });

    const r = await res.json();

    if (!r.sucesso) {
      mensagem.innerText = r.erro || "Erro ao cancelar.";
      return;
    }

    mensagem.innerText = "Agendamento cancelado com sucesso.";
    info.innerHTML = "";
    document.getElementById("cancelarCodigo").value = "";

    await gerarCalendario();
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

  trocarTela("tela-data");
  gerarCalendario();
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

/* START */
gerarCalendario();
trocarTela("tela-data");
