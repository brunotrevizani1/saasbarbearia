const API_URL = "https://saasbarbearia.up.railway.app";
const barbeariaId = localStorage.getItem("barbearia_id");

if (!barbeariaId) {
  window.location.href = "login.html";
}

let ultimoAgendamentosJSON = "";
let barbeiroSelecionado = "";
let barbeiroFiltroDashboard = "";
let dataFiltroAgendamentos = formatarDataInput(new Date());
let produtoEditandoId = null;
let produtosAdminCache = [];

function formatarData(dataString) {
  const dataLimpa = dataString.toString().slice(0, 10);
  const [ano, mes, dia] = dataLimpa.split("-");

  return `${dia}/${mes}/${ano}`;
}

function salvarProduto() {
  if (produtoEditandoId) {
    atualizarProduto();
  } else {
    criarProduto();
  }
}

function formatarDataInput(data) {
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, "0");
  const dia = String(data.getDate()).padStart(2, "0");

  return `${ano}-${mes}-${dia}`;
}

function atualizarTextoDataFiltro() {
  const texto = document.getElementById("dataFiltroTexto");

  if (!texto) return;

  const [ano, mes, dia] = dataFiltroAgendamentos.split("-");
  const data = new Date(Number(ano), Number(mes) - 1, Number(dia));

  texto.innerText = data.toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function mudarDiaAgendamentos(direcao) {
  const [ano, mes, dia] = dataFiltroAgendamentos.split("-");
  const data = new Date(Number(ano), Number(mes) - 1, Number(dia));

  data.setDate(data.getDate() + direcao);

  dataFiltroAgendamentos = formatarDataInput(data);
  ultimoAgendamentosJSON = "";

  atualizarTextoDataFiltro();
  carregarAgendamentos(true);
}

function irParaHojeAgendamentos() {
  dataFiltroAgendamentos = formatarDataInput(new Date());
  ultimoAgendamentosJSON = "";

  atualizarTextoDataFiltro();
  carregarAgendamentos(true);
}

function abrirSecao(secao) {
  const secoes = [
    "secaoDashboard",
    "secaoEquipe",
    "secaoServicos",
    "secaoProdutos",
    "secaoLocalizacao",
    "secaoRelatorios",
    "secaoConfiguracoes",
  ];

  const menus = [
    "menuDashboard",
    "menuEquipe",
    "menuServicos",
    "menuProdutos",
    "menuRelatorios",
    "menuLocalizacao",
    "menuConfiguracoes",
  ];

  secoes.forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.classList.remove("ativa");
  });

  menus.forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.classList.remove("ativo");
  });

  if (secao === "dashboard") {
    document.getElementById("secaoDashboard").classList.add("ativa");
    document.getElementById("menuDashboard").classList.add("ativo");
  }

  if (secao === "equipe") {
    document.getElementById("secaoEquipe").classList.add("ativa");
    document.getElementById("menuEquipe").classList.add("ativo");
  }

  if (secao === "servicos") {
    document.getElementById("secaoServicos").classList.add("ativa");
    document.getElementById("menuServicos").classList.add("ativo");
    carregarServicosAdmin();
  }

  if (secao === "produtos") {
    document.getElementById("secaoProdutos").classList.add("ativa");
    document.getElementById("menuProdutos").classList.add("ativo");
    carregarProdutosAdmin();
    carregarConfigProdutos();
  }

  if (secao === "relatorios") {
    document.getElementById("secaoRelatorios").classList.add("ativa");
    document.getElementById("menuRelatorios").classList.add("ativo");
    iniciarRelatorios();
  }

  if (secao === "localizacao") {
    document.getElementById("secaoLocalizacao").classList.add("ativa");
    document.getElementById("menuLocalizacao").classList.add("ativo");
  }

  if (secao === "configuracoes") {
    document.getElementById("secaoConfiguracoes").classList.add("ativa");
    document.getElementById("menuConfiguracoes").classList.add("ativo");
  }
}

function abrirAbaConfig(nome) {
  const abaBloqueio = document.getElementById("abaBloqueio");
  const abaHorario = document.getElementById("abaHorario");
  const abaExcecao = document.getElementById("abaExcecao");

  const abaBloqueioBtn = document.getElementById("abaBloqueioBtn");
  const abaHorarioBtn = document.getElementById("abaHorarioBtn");
  const abaExcecaoBtn = document.getElementById("abaExcecaoBtn");

  abaBloqueio.classList.remove("ativa");
  abaHorario.classList.remove("ativa");
  abaExcecao.classList.remove("ativa");

  abaBloqueioBtn.classList.remove("ativa");
  abaHorarioBtn.classList.remove("ativa");
  abaExcecaoBtn.classList.remove("ativa");

  if (nome === "bloqueio") {
    abaBloqueio.classList.add("ativa");
    abaBloqueioBtn.classList.add("ativa");
  }

  if (nome === "horario") {
    abaHorario.classList.add("ativa");
    abaHorarioBtn.classList.add("ativa");
  }

  if (nome === "excecao") {
    abaExcecao.classList.add("ativa");
    abaExcecaoBtn.classList.add("ativa");
    carregarExcecoesHorario();
  }
}

function mostrarCamposExcecao() {
  const tipo = document.getElementById("tipoExcecao").value;
  const campos = document.getElementById("camposHorarioExcecao");

  campos.style.display = tipo === "personalizado" ? "block" : "none";
}

function fecharModalProduto() {
  const modal = document.getElementById("modalProduto");
  if (modal) modal.classList.remove("ativo");
}

document.querySelectorAll(".input-foto-produto").forEach((input) => {
  input.addEventListener("change", () => {
    const arquivo = input.files[0];
    const box = input.closest(".upload-produto-box");
    const img = box.querySelector("img");

    if (!arquivo) return;

    img.src = URL.createObjectURL(arquivo);
    box.classList.add("com-imagem");
  });
});

async function carregarExcecoesHorario() {
  const lista = document.getElementById("listaExcecoesHorario");
  const semExcecoes = document.getElementById("semExcecoesHorario");

  if (!barbeiroSelecionado) {
    lista.innerHTML = "";
    semExcecoes.style.display = "block";
    semExcecoes.innerText = "Selecione um barbeiro.";
    return;
  }

  try {
    const resposta = await fetch(
      `${API_URL}/api/barbeiro/excecoes-horario?barbearia_id=${barbeariaId}&barbeiro_id=${barbeiroSelecionado}`,
    );

    const excecoes = await resposta.json();

    lista.innerHTML = "";

    if (!excecoes.length) {
      semExcecoes.style.display = "block";
      semExcecoes.innerText = "Nenhuma exceção cadastrada.";
      return;
    }

    semExcecoes.style.display = "none";

    excecoes.forEach((excecao) => {
      const card = document.createElement("div");
      card.className = "card-bloqueio";

      let textoTipo = "";

      if (excecao.tipo === "fechar_manha") {
        textoTipo = "Não abre de manhã";
      }

      if (excecao.tipo === "fechar_tarde") {
        textoTipo = "Não abre à tarde";
      }

      if (excecao.tipo === "personalizado") {
        textoTipo = `Horário personalizado removido: ${excecao.hora_inicio.slice(
          0,
          5,
        )} às ${excecao.hora_fim.slice(0, 5)}`;
      }

      card.innerHTML = `
        <div class="info-bloqueio">
          <strong>${formatarData(excecao.data)}</strong>
          <span>${textoTipo}</span>
          ${excecao.motivo ? `<small>${excecao.motivo}</small>` : ""}
        </div>

        <button class="btn-desbloquear" onclick="deletarExcecaoHorario(${excecao.id})">
          Remover
        </button>
      `;

      lista.appendChild(card);
    });
  } catch (error) {
    console.error("Erro ao carregar exceções:", error);
    semExcecoes.style.display = "block";
    semExcecoes.innerText = "Erro ao carregar exceções.";
  }
}

async function salvarExcecaoHorario() {
  const data = document.getElementById("dataExcecao").value;
  const tipo = document.getElementById("tipoExcecao").value;
  const hora_inicio = document.getElementById("horaInicioExcecao").value;
  const hora_fim = document.getElementById("horaFimExcecao").value;
  const motivo = document.getElementById("motivoExcecao").value.trim();

  const mensagem = document.getElementById("mensagemExcecao");
  mensagem.innerText = "";

  if (!barbeiroSelecionado) {
    mensagem.innerText = "Selecione um barbeiro.";
    return;
  }

  if (!data || !tipo) {
    mensagem.innerText = "Informe a data e o tipo da exceção.";
    return;
  }

  if (tipo === "personalizado" && (!hora_inicio || !hora_fim)) {
    mensagem.innerText = "Informe o horário inicial e final.";
    return;
  }

  try {
    const resposta = await fetch(`${API_URL}/api/barbeiro/excecoes-horario`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        barbearia_id: barbeariaId,
        barbeiro_id: barbeiroSelecionado,
        data,
        tipo,
        hora_inicio,
        hora_fim,
        motivo,
      }),
    });

    const resultado = await resposta.json();

    if (resultado.sucesso) {
      mensagem.innerText = "Exceção salva com sucesso.";

      document.getElementById("dataExcecao").value = "";
      document.getElementById("tipoExcecao").value = "";
      document.getElementById("horaInicioExcecao").value = "";
      document.getElementById("horaFimExcecao").value = "";
      document.getElementById("motivoExcecao").value = "";
      mostrarCamposExcecao();

      await carregarExcecoesHorario();
    } else {
      mensagem.innerText = resultado.erro || "Erro ao salvar exceção.";
    }
  } catch (error) {
    console.error("Erro ao salvar exceção:", error);
    mensagem.innerText = "Erro ao conectar com o servidor.";
  }
}

async function deletarExcecaoHorario(id) {
  const confirmar = window.confirm("Deseja remover essa exceção?");

  if (!confirmar) return;

  try {
    const resposta = await fetch(
      `${API_URL}/api/barbeiro/excecoes-horario/${id}?barbearia_id=${barbeariaId}&barbeiro_id=${barbeiroSelecionado}`,
      {
        method: "DELETE",
      },
    );

    const resultado = await resposta.json();

    if (resultado.sucesso) {
      await carregarExcecoesHorario();
    } else {
      alert(resultado.erro || "Erro ao remover exceção.");
    }
  } catch (error) {
    console.error("Erro ao remover exceção:", error);
    alert("Erro ao conectar com o servidor.");
  }
}

function abrirModalBarbeiro() {
  document.getElementById("modalBarbeiro").classList.add("ativo");
  document.getElementById("novoBarbeiroNome").focus();
}

function fecharModalBarbeiro() {
  document.getElementById("modalBarbeiro").classList.remove("ativo");
  document.getElementById("novoBarbeiroNome").value = "";
}

function sair() {
  localStorage.removeItem("barbearia_id");
  localStorage.removeItem("barbearia_nome");
  window.location.href = "login.html";
}

async function salvarLogo() {
  const input = document.getElementById("inputLogo");
  const mensagem = document.getElementById("mensagemLogo");

  mensagem.innerText = "";

  if (!input.files.length) {
    mensagem.innerText = "Selecione uma imagem.";
    return;
  }

  const formData = new FormData();
  formData.append("logo", input.files[0]);
  formData.append("barbearia_id", barbeariaId);

  try {
    const resposta = await fetch(`${API_URL}/api/barbeiro/logo`, {
      method: "POST",
      body: formData,
    });

    const resultado = await resposta.json();

    if (resultado.sucesso) {
      mensagem.innerText = "Logo salva com sucesso.";
      input.value = ""; // 🔥 limpa input
      carregarLogoBarbearia();
    } else {
      mensagem.innerText = resultado.erro || "Erro ao salvar logo.";
    }
  } catch (error) {
    console.error("Erro ao enviar logo:", error);
    mensagem.innerText = "Erro ao conectar com o servidor.";
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const inputLogo = document.getElementById("inputLogo");
  const previewLogo = document.getElementById("previewLogo");
  const placeholderLogo = document.getElementById("placeholderLogo");

  if (!inputLogo || !previewLogo || !placeholderLogo) return;

  inputLogo.addEventListener("change", () => {
    const arquivo = inputLogo.files[0];

    if (!arquivo) return;

    previewLogo.src = URL.createObjectURL(arquivo);
    previewLogo.classList.add("ativo");
    placeholderLogo.style.display = "none";
  });
});

async function carregarLogoBarbearia() {
  try {
    const resposta = await fetch(
      `${API_URL}/api/barbeiro/logo?barbearia_id=${barbeariaId}`,
    );

    const data = await resposta.json();

    const preview = document.getElementById("previewLogo");
    const placeholder = document.getElementById("placeholderLogo");

    if (data.logo) {
      preview.src = `${API_URL}${data.logo}`;
      preview.classList.add("ativo");

      if (placeholder) {
        placeholder.style.display = "none";
      }
    } else {
      preview.src = "";
      preview.classList.remove("ativo");

      if (placeholder) {
        placeholder.style.display = "flex";
      }
    }
  } catch (error) {
    console.error("Erro ao carregar logo:", error);
  }
}

function togglePreviewCliente() {
  const box = document.getElementById("previewClienteBox");
  const iframe = document.getElementById("iframePreviewCliente");

  box.classList.toggle("ativo");

  if (box.classList.contains("ativo")) {
    iframe.src = `index.html?barbearia=${barbeariaId}`;
  }
}
/* =========================
   BARBEIROS
========================= */

async function carregarBarbeiros() {
  try {
    const resposta = await fetch(
      `${API_URL}/api/barbeiro/barbeiros?barbearia_id=${barbeariaId}`,
    );

    const barbeiros = await resposta.json();

    const listaBarbeiros = document.getElementById("listaBarbeiros");
    const selectConfig = document.getElementById("selectBarbeiroConfig");
    const filtroDashboard = document.getElementById(
      "filtroBarbeiroAgendamentos",
    );

    if (listaBarbeiros) listaBarbeiros.innerHTML = "";
    if (selectConfig) {
      selectConfig.innerHTML = `<option value="">Selecione um barbeiro</option>`;
    }
    if (filtroDashboard) {
      filtroDashboard.innerHTML = `<option value="">Todos os barbeiros</option>`;
    }

    barbeiros.forEach((barbeiro) => {
      if (listaBarbeiros) {
        const card = document.createElement("div");
        card.className = "card-bloqueio";

        card.innerHTML = `
          <div class="info-bloqueio">
            <strong>${barbeiro.nome}</strong>
            <span>${barbeiro.ativo ? "Ativo" : "Inativo"}</span>
          </div>

          <button class="btn-desbloquear" onclick="deletarBarbeiro(${barbeiro.id})">
            Remover
          </button>
        `;

        listaBarbeiros.appendChild(card);
      }

      if (selectConfig) {
        selectConfig.innerHTML += `
          <option value="${barbeiro.id}">${barbeiro.nome}</option>
        `;
      }

      if (filtroDashboard) {
        filtroDashboard.innerHTML += `
          <option value="${barbeiro.id}">${barbeiro.nome}</option>
        `;
      }
    });

    if (barbeiros.length > 0 && !barbeiroSelecionado) {
      barbeiroSelecionado = String(barbeiros[0].id);

      if (selectConfig) {
        selectConfig.value = barbeiroSelecionado;
      }

      await carregarConfiguracaoAgenda();
      await carregarDiasBloqueados();
    }
  } catch (error) {
    console.error("Erro ao carregar barbeiros:", error);
  }
}

async function criarBarbeiro() {
  const input = document.getElementById("novoBarbeiroNome");
  const nome = input.value.trim();

  if (!nome) {
    alert("Digite o nome do barbeiro.");
    return;
  }

  try {
    const resposta = await fetch(`${API_URL}/api/barbeiro/barbeiros`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        nome,
        barbearia_id: barbeariaId,
      }),
    });

    const resultado = await resposta.json();

    if (resultado.sucesso) {
      input.value = "";

      fecharModalBarbeiro();
      await carregarBarbeiros();
      await carregarAgendamentos(true);
    } else {
      alert(resultado.erro || "Erro ao criar barbeiro.");
    }
  } catch (error) {
    console.error("Erro ao criar barbeiro:", error);
    alert("Erro ao conectar com o servidor.");
  }
}

async function deletarBarbeiro(id) {
  const confirmar = window.confirm("Deseja remover esse barbeiro?");

  if (!confirmar) return;

  try {
    const resposta = await fetch(
      `${API_URL}/api/barbeiro/barbeiros/${id}?barbearia_id=${barbeariaId}`,
      {
        method: "DELETE",
      },
    );

    const resultado = await resposta.json();

    if (resultado.sucesso) {
      if (String(id) === String(barbeiroSelecionado)) {
        barbeiroSelecionado = "";
      }

      await carregarBarbeiros();
      await carregarAgendamentos(true);
    } else {
      alert(resultado.erro || "Erro ao remover barbeiro.");
    }
  } catch (error) {
    console.error("Erro ao remover barbeiro:", error);
    alert("Erro ao conectar com o servidor.");
  }
}

function toggleSenha(inputId, iconeId) {
  const input = document.getElementById(inputId);
  const icone = document.getElementById(iconeId);

  if (input.type === "password") {
    input.type = "text";

    icone.innerHTML = `
      <path d="M2 2l20 20" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
      <path d="M10.58 10.58a2 2 0 0 0 2.83 2.83" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
      <path d="M9.9 4.24A10.94 10.94 0 0 1 12 4c7 0 11 8 11 8a21.86 21.86 0 0 1-5.17 5.94M6.1 6.1A21.87 21.87 0 0 0 1 12s4 8 11 8c1.61 0 3.13-.27 4.53-.77" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
    `;
  } else {
    input.type = "password";

    icone.innerHTML = `
      <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12Z" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
      <circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="1.8"/>
    `;
  }
}

function trocarBarbeiroConfiguracao() {
  barbeiroSelecionado = document.getElementById("selectBarbeiroConfig").value;

  if (!barbeiroSelecionado) {
    return;
  }

  carregarConfiguracaoAgenda();
  carregarDiasBloqueados();
  carregarExcecoesHorario();
}

function trocarBarbeiroDashboard() {
  barbeiroFiltroDashboard = document.getElementById(
    "filtroBarbeiroAgendamentos",
  ).value;
  ultimoAgendamentosJSON = "";
  carregarAgendamentos(true);
}

function abrirAbaConfiguracoes(nome) {
  const abaCadastrarBarbeiros = document.getElementById(
    "abaCadastrarBarbeiros",
  );
  const abaTrocarSenha = document.getElementById("abaTrocarSenha");
  const abaLogo = document.getElementById("abaLogo");

  const abaCadastrarBarbeirosBtn = document.getElementById(
    "abaCadastrarBarbeirosBtn",
  );
  const abaTrocarSenhaBtn = document.getElementById("abaTrocarSenhaBtn");
  const abaLogoBtn = document.getElementById("abaLogoBtn");

  abaCadastrarBarbeiros.classList.remove("ativa");
  abaTrocarSenha.classList.remove("ativa");
  abaLogo.classList.remove("ativa");

  abaCadastrarBarbeirosBtn.classList.remove("ativa");
  abaTrocarSenhaBtn.classList.remove("ativa");
  abaLogoBtn.classList.remove("ativa");

  if (nome === "barbeiros") {
    abaCadastrarBarbeiros.classList.add("ativa");
    abaCadastrarBarbeirosBtn.classList.add("ativa");
  }

  if (nome === "senha") {
    abaTrocarSenha.classList.add("ativa");
    abaTrocarSenhaBtn.classList.add("ativa");
  }

  if (nome === "logo") {
    abaLogo.classList.add("ativa");
    abaLogoBtn.classList.add("ativa");
    carregarLogoBarbearia(); // carrega preview
  }
}

async function alterarSenha() {
  const senha_atual = document.getElementById("senhaAtual").value.trim();
  const nova_senha = document.getElementById("novaSenha").value.trim();
  const confirmar_senha = document
    .getElementById("confirmarSenha")
    .value.trim();
  const mensagem = document.getElementById("mensagemSenha");

  mensagem.innerText = "";

  if (!senha_atual || !nova_senha || !confirmar_senha) {
    mensagem.innerText = "Preencha todos os campos.";
    return;
  }

  if (nova_senha !== confirmar_senha) {
    mensagem.innerText = "As novas senhas não conferem.";
    return;
  }

  try {
    const resposta = await fetch(`${API_URL}/api/alterar-senha`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        barbearia_id: barbeariaId,
        senha_atual,
        nova_senha,
        confirmar_senha,
      }),
    });

    const resultado = await resposta.json();

    if (resultado.sucesso) {
      mensagem.innerText = "Senha alterada com sucesso.";

      document.getElementById("senhaAtual").value = "";
      document.getElementById("novaSenha").value = "";
      document.getElementById("confirmarSenha").value = "";
    } else {
      mensagem.innerText = resultado.erro || "Erro ao alterar senha.";
    }
  } catch (error) {
    console.error("Erro ao alterar senha:", error);
    mensagem.innerText = "Erro ao conectar com o servidor.";
  }
}

/* =========================
   AGENDAMENTOS
========================= */

function montarHTMLAgendamentos(agendamentos) {
  return agendamentos
    .map((agendamento) => {
      const cancelado = agendamento.status === "cancelado";

      return `
        <div class="card-agendamento ${cancelado ? "cancelado" : ""}">
          <div class="info-agendamento">
            <div class="topo-agendamento">
              <strong>${agendamento.barbeiro_nome || "Barbeiro não informado"}</strong>
              ${cancelado ? `<span class="badge-cancelado">Cancelado</span>` : ""}
            </div>

            <div class="linha-info">
              <svg viewBox="0 0 24 24" fill="none">
                <path
                  d="M20 21a8 8 0 0 0-16 0M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z"
                  stroke="currentColor"
                  stroke-width="1.8"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
              <span>${agendamento.nome}</span>
            </div>

            <div class="linha-info">
              <svg viewBox="0 0 24 24" fill="none">
                <path
                  d="M22 16.9V20a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.3 19.3 0 0 1-6-6A19.8 19.8 0 0 1 2 4.2 2 2 0 0 1 4 2h3.1a2 2 0 0 1 2 1.7l.5 3.3a2 2 0 0 1-.6 1.8l-1.4 1.4a16 16 0 0 0 6.8 6.8l1.4-1.4a2 2 0 0 1 1.8-.6l3.3.5A2 2 0 0 1 22 16.9Z"
                  stroke="currentColor"
                  stroke-width="1.8"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
              <span>${agendamento.telefone}</span>
            </div>

            <div class="linha-info">
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
              <span>${agendamento.hora.toString().slice(0, 5)}</span>
            </div>
          </div>

          <div class="acoes">
            ${
              cancelado
                ? ""
                : `
                  <button class="btn-concluir" onclick="concluirAgendamento(${agendamento.id})">
                    Concluir
                  </button>
                `
            }

            <button class="btn-excluir" onclick="excluirAgendamento(${agendamento.id})">
              Excluir
            </button>
          </div>
        </div>
      `;
    })
    .join("");
}

async function carregarAgendamentos(forcarRender = false) {
  const lista = document.getElementById("listaAgendamentos");
  const semAgendamentos = document.getElementById("semAgendamentos");

  try {
    let url = `${API_URL}/api/barbeiro/agendamentos?barbearia_id=${barbeariaId}`;

    if (barbeiroFiltroDashboard) {
      url += `&barbeiro_id=${barbeiroFiltroDashboard}`;
    }

    const resposta = await fetch(url);
    const agendamentos = await resposta.json();

    const agendamentosDoDia = agendamentos.filter(
      (agendamento) =>
        agendamento.data.toString().slice(0, 10) === dataFiltroAgendamentos,
    );

    const totalAgendamentosDia = document.getElementById(
      "totalAgendamentosDia",
    );

    if (totalAgendamentosDia) {
      totalAgendamentosDia.innerText = agendamentosDoDia.filter(
        (agendamento) => agendamento.status === "agendado",
      ).length;
    }

    const jsonAtual = JSON.stringify(agendamentosDoDia);

    if (!forcarRender && jsonAtual === ultimoAgendamentosJSON) {
      return;
    }

    ultimoAgendamentosJSON = jsonAtual;

    if (!agendamentosDoDia.length) {
      lista.innerHTML = "";
      semAgendamentos.style.display = "block";
      semAgendamentos.innerText = "Nenhum agendamento para esse dia.";
      return;
    }

    semAgendamentos.style.display = "none";
    lista.innerHTML = montarHTMLAgendamentos(agendamentosDoDia);
  } catch (error) {
    console.error("Erro ao carregar:", error);
    semAgendamentos.style.display = "block";
    semAgendamentos.innerText = "Erro ao carregar agendamentos.";
  }
}

async function concluirAgendamento(id) {
  const confirmar = window.confirm("Marcar como concluído?");

  if (!confirmar) return;

  try {
    const resposta = await fetch(
      `${API_URL}/api/barbeiro/agendamentos/${id}/concluir?barbearia_id=${barbeariaId}`,
      {
        method: "PUT",
      },
    );

    const resultado = await resposta.json();

    if (resultado.sucesso) {
      ultimoAgendamentosJSON = "";
      carregarAgendamentos(true);
    } else {
      alert(resultado.erro || "Erro ao concluir.");
    }
  } catch (error) {
    console.error("Erro ao concluir:", error);
    alert("Erro ao conectar com o servidor.");
  }
}

async function excluirAgendamento(id) {
  const confirmar = window.confirm("Deseja excluir?");

  if (!confirmar) return;

  try {
    const resposta = await fetch(
      `${API_URL}/api/barbeiro/agendamentos/${id}?barbearia_id=${barbeariaId}`,
      {
        method: "DELETE",
      },
    );

    const resultado = await resposta.json();

    if (resultado.sucesso) {
      ultimoAgendamentosJSON = "";
      carregarAgendamentos(true);
    } else {
      alert("Erro ao excluir.");
    }
  } catch (error) {
    alert("Erro ao conectar com o servidor.");
  }
}

/* =========================
   DIAS BLOQUEADOS
========================= */

async function carregarDiasBloqueados() {
  const lista = document.getElementById("listaBloqueios");
  const semBloqueios = document.getElementById("semBloqueios");

  if (!barbeiroSelecionado) {
    lista.innerHTML = "";
    semBloqueios.style.display = "block";
    semBloqueios.innerText = "Selecione um barbeiro.";
    return;
  }

  lista.innerHTML = "";

  try {
    const resposta = await fetch(
      `${API_URL}/api/barbeiro/dias-bloqueados?barbearia_id=${barbeariaId}&barbeiro_id=${barbeiroSelecionado}`,
    );
    const bloqueios = await resposta.json();

    if (!bloqueios.length) {
      semBloqueios.style.display = "block";
      semBloqueios.innerText = "Nenhum dia bloqueado.";
      return;
    }

    semBloqueios.style.display = "none";

    bloqueios.forEach((bloqueio) => {
      const card = document.createElement("div");
      card.className = "card-bloqueio";

      card.innerHTML = `
        <div class="info-bloqueio">
          <strong>${formatarData(bloqueio.data)}</strong>
          <span>${bloqueio.motivo || "Dia indisponível pelo barbeiro."}</span>
        </div>

        <button class="btn-desbloquear" onclick="desbloquearDia(${bloqueio.id})">
          Desbloquear
        </button>
      `;

      lista.appendChild(card);
    });
  } catch (error) {
    console.error("Erro ao carregar bloqueios:", error);
    semBloqueios.style.display = "block";
    semBloqueios.innerText = "Erro ao carregar dias bloqueados.";
  }
}

async function bloquearDia() {
  const data = document.getElementById("dataBloqueio").value;
  const motivo = document.getElementById("motivoBloqueio").value.trim();
  const mensagem = document.getElementById("mensagemBloqueio");

  mensagem.innerText = "";

  if (!barbeiroSelecionado) {
    mensagem.innerText = "Selecione um barbeiro.";
    return;
  }

  if (!data) {
    mensagem.innerText = "Escolha uma data.";
    return;
  }

  try {
    const resposta = await fetch(`${API_URL}/api/barbeiro/dias-bloqueados`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        data,
        motivo,
        barbearia_id: barbeariaId,
        barbeiro_id: barbeiroSelecionado,
      }),
    });

    const resultado = await resposta.json();

    if (resultado.sucesso) {
      mensagem.innerText = "Dia bloqueado com sucesso.";
      document.getElementById("dataBloqueio").value = "";
      document.getElementById("motivoBloqueio").value = "";
      await carregarDiasBloqueados();
    } else {
      mensagem.innerText = resultado.erro || "Erro ao bloquear dia.";
    }
  } catch (error) {
    console.error("Erro ao bloquear dia:", error);
    mensagem.innerText = "Erro ao conectar com o servidor.";
  }
}

async function desbloquearDia(id) {
  const confirmar = window.confirm("Deseja desbloquear esse dia?");

  if (!confirmar) return;

  if (!barbeiroSelecionado) {
    alert("Selecione um barbeiro.");
    return;
  }

  try {
    const resposta = await fetch(
      `${API_URL}/api/barbeiro/dias-bloqueados/${id}?barbearia_id=${barbeariaId}&barbeiro_id=${barbeiroSelecionado}`,
      {
        method: "DELETE",
      },
    );

    const resultado = await resposta.json();

    if (resultado.sucesso) {
      carregarDiasBloqueados();
    } else {
      alert(resultado.erro || "Erro ao desbloquear dia.");
    }
  } catch (error) {
    console.error("Erro ao desbloquear dia:", error);
    alert("Erro ao conectar com o servidor.");
  }
}

/* =========================
   CONFIGURAÇÕES / LOCALIZAÇÃO
========================= */

async function carregarConfiguracaoAgenda() {
  if (!barbeiroSelecionado) {
    return;
  }

  try {
    const resposta = await fetch(
      `${API_URL}/api/barbeiro/configuracao-agenda?barbearia_id=${barbeariaId}&barbeiro_id=${barbeiroSelecionado}`,
    );

    const config = await resposta.json();

    document.getElementById("horaInicio").value = config.hora_inicio
      .toString()
      .slice(0, 5);

    document.getElementById("horaFim").value = config.hora_fim
      .toString()
      .slice(0, 5);

    document.getElementById("intervalo").value = String(config.intervalo);

    document.getElementById("almocoInicio").value = config.almoco_inicio
      ? config.almoco_inicio.toString().slice(0, 5)
      : "";

    document.getElementById("almocoFim").value = config.almoco_fim
      ? config.almoco_fim.toString().slice(0, 5)
      : "";

    document.getElementById("bloquearSegunda").checked = Boolean(
      config.bloquear_segunda,
    );

    document.getElementById("bloquearTerca").checked = Boolean(
      config.bloquear_terca,
    );

    document.getElementById("bloquearQuarta").checked = Boolean(
      config.bloquear_quarta,
    );

    document.getElementById("bloquearQuinta").checked = Boolean(
      config.bloquear_quinta,
    );

    document.getElementById("bloquearSexta").checked = Boolean(
      config.bloquear_sexta,
    );

    document.getElementById("bloquearSabado").checked = Boolean(
      config.bloquear_sabado,
    );

    document.getElementById("bloquearDomingo").checked = Boolean(
      config.bloquear_domingo,
    );
  } catch (error) {
    console.error("Erro ao carregar configuração:", error);
  }
}

async function salvarConfiguracaoAgenda() {
  const hora_inicio = document.getElementById("horaInicio").value;
  const hora_fim = document.getElementById("horaFim").value;
  const intervalo = document.getElementById("intervalo").value;
  const almoco_inicio = document.getElementById("almocoInicio").value;
  const almoco_fim = document.getElementById("almocoFim").value;
  const bloquear_sabado = document.getElementById("bloquearSabado").checked;
  const bloquear_domingo = document.getElementById("bloquearDomingo").checked;
  const bloquear_segunda = document.getElementById("bloquearSegunda").checked;
  const bloquear_terca = document.getElementById("bloquearTerca").checked;
  const bloquear_quarta = document.getElementById("bloquearQuarta").checked;
  const bloquear_quinta = document.getElementById("bloquearQuinta").checked;
  const bloquear_sexta = document.getElementById("bloquearSexta").checked;

  const mensagemBloqueio = document.getElementById("mensagemConfiguracao");
  const mensagemHorario = document.getElementById(
    "mensagemConfiguracaoHorario",
  );

  if (mensagemBloqueio) mensagemBloqueio.innerText = "";
  if (mensagemHorario) mensagemHorario.innerText = "";

  if (!barbeiroSelecionado) {
    if (mensagemHorario) mensagemHorario.innerText = "Selecione um barbeiro.";
    if (mensagemBloqueio) mensagemBloqueio.innerText = "Selecione um barbeiro.";
    return;
  }

  if (!hora_inicio || !hora_fim || !intervalo) {
    if (mensagemHorario) {
      mensagemHorario.innerText = "Preencha os horários corretamente.";
    }
    return;
  }

  try {
    const resposta = await fetch(
      `${API_URL}/api/barbeiro/configuracao-agenda`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          hora_inicio,
          hora_fim,
          intervalo,
          almoco_inicio,
          almoco_fim,

          bloquear_segunda,
          bloquear_terca,
          bloquear_quarta,
          bloquear_quinta,
          bloquear_sexta,
          bloquear_sabado,
          bloquear_domingo,

          barbearia_id: barbeariaId,
          barbeiro_id: barbeiroSelecionado,
        }),
      },
    );

    const resultado = await resposta.json();

    if (resultado.sucesso) {
      if (mensagemBloqueio) {
        mensagemBloqueio.innerText = "Configurações salvas com sucesso.";
      }

      if (mensagemHorario) {
        mensagemHorario.innerText = "Horários salvos com sucesso.";
      }
    } else {
      if (mensagemBloqueio) {
        mensagemBloqueio.innerText =
          resultado.erro || "Erro ao salvar configurações.";
      }

      if (mensagemHorario) {
        mensagemHorario.innerText =
          resultado.erro || "Erro ao salvar horários.";
      }
    }
  } catch (error) {
    console.error("Erro ao salvar configuração:", error);

    if (mensagemBloqueio) {
      mensagemBloqueio.innerText = "Erro ao conectar com o servidor.";
    }

    if (mensagemHorario) {
      mensagemHorario.innerText = "Erro ao conectar com o servidor.";
    }
  }
}

async function salvarLocalizacao() {
  const rua = document.getElementById("ruaBarbearia").value.trim();
  const numero = document.getElementById("numeroBarbearia").value.trim();
  const bairro = document.getElementById("bairroBarbearia").value.trim();
  const cidade = document.getElementById("cidadeBarbearia").value.trim();

  const mensagem = document.getElementById("mensagemLocalizacao");
  mensagem.innerText = "";

  try {
    const resposta = await fetch(`${API_URL}/api/barbeiro/localizacao`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        barbearia_id: barbeariaId,
        rua,
        numero,
        bairro,
        cidade,
      }),
    });

    const resultado = await resposta.json();

    if (resultado.sucesso) {
      mensagem.innerText = "Localização salva com sucesso.";
    } else {
      mensagem.innerText = resultado.erro || "Erro ao salvar localização.";
    }
  } catch (error) {
    console.error("Erro ao salvar localização:", error);
    mensagem.innerText = "Erro ao conectar com o servidor.";
  }
}

async function carregarLocalizacaoBarbearia() {
  try {
    const resposta = await fetch(
      `${API_URL}/api/barbeiro/localizacao?barbearia_id=${barbeariaId}`,
    );

    const localizacao = await resposta.json();

    document.getElementById("ruaBarbearia").value = localizacao.rua || "";
    document.getElementById("numeroBarbearia").value = localizacao.numero || "";
    document.getElementById("bairroBarbearia").value = localizacao.bairro || "";
    document.getElementById("cidadeBarbearia").value = localizacao.cidade || "";
  } catch (error) {
    console.error("Erro ao carregar localização:", error);
  }
}

async function criarProduto() {
  const titulo = document.getElementById("produtoTitulo").value.trim();
  const descricao = document.getElementById("produtoDescricao").value.trim();
  const valor = document.getElementById("produtoValor").value;
  const estoque = document.getElementById("produtoEstoque").value;
  const inputsImagens = document.querySelectorAll(".input-foto-produto");
  const mensagem = document.getElementById("mensagemProduto");

  const imagens = [];

  inputsImagens.forEach((input) => {
    if (input.files[0]) {
      imagens.push(input.files[0]);
    }
  });

  mensagem.innerText = "";

  if (!titulo || !valor) {
    mensagem.innerText = "Preencha título e valor.";
    return;
  }

  if (imagens.length > 3) {
    mensagem.innerText = "Selecione no máximo 3 imagens.";
    return;
  }

  const formData = new FormData();

  formData.append("barbearia_id", barbeariaId);
  formData.append("titulo", titulo);
  formData.append("descricao", descricao);
  formData.append("valor", valor);
  formData.append("estoque", estoque || 0);

  imagens.forEach((imagem) => {
    formData.append("imagens", imagem);
  });

  try {
    const resposta = await fetch(`${API_URL}/api/produtos`, {
      method: "POST",
      body: formData,
    });

    const resultado = await resposta.json();

    if (resultado.sucesso) {
      await carregarProdutosAdmin();

      document.getElementById("produtoTitulo").value = "";
      document.getElementById("produtoDescricao").value = "";
      document.getElementById("produtoValor").value = "";
      document.getElementById("produtoEstoque").value = "";
      mensagem.innerText = "";

      inputsImagens.forEach((input) => {
        input.value = "";

        const box = input.closest(".upload-produto-box");
        const img = box.querySelector("img");

        if (img) {
          img.src = "";
        }

        if (box) {
          box.classList.remove("com-imagem");
        }
      });

      fecharModalProduto();
    } else {
      mensagem.innerText = resultado.erro || "Erro ao cadastrar produto.";
    }
  } catch (error) {
    console.error("Erro ao criar produto:", error);
    mensagem.innerText = "Erro ao conectar com o servidor.";
  }
}

async function carregarProdutosAdmin() {
  const lista = document.getElementById("listaProdutosAdmin");
  const vazio = document.getElementById("semProdutosAdmin");

  if (!lista || !vazio) return;

  lista.innerHTML = "";
  vazio.style.display = "none";

  try {
    const resposta = await fetch(
      `${API_URL}/api/produtos?barbearia_id=${barbeariaId}`,
    );

    const produtos = await resposta.json();
    produtosAdminCache = produtos;

    if (!produtos.length) {
      vazio.style.display = "block";
      return;
    }

    vazio.style.display = "none";

    produtos.forEach((produto) => {
      const imagens = [
        produto.imagem_1,
        produto.imagem_2,
        produto.imagem_3,
      ].filter(Boolean);

      const card = document.createElement("div");
      card.className = "card-produto-admin";

      card.innerHTML = `
        ${
          imagens.length
            ? `
              <div class="galeria-produto-admin">
                <img
                  id="imagemProdutoAdmin${produto.id}"
                  src="${API_URL}${imagens[0]}"
                  alt="${produto.titulo}"
                  data-imagens='${JSON.stringify(imagens)}'
                  data-index="0"
                />

                ${
                  imagens.length > 1
                    ? `
                      <button
                        class="btn-galeria-admin esquerda"
                        onclick="mudarImagemProdutoAdmin(${produto.id}, -1)"
                      >
                        ‹
                      </button>

                      <button
                        class="btn-galeria-admin direita"
                        onclick="mudarImagemProdutoAdmin(${produto.id}, 1)"
                      >
                        ›
                      </button>
                    `
                    : ""
                }
              </div>
            `
            : `<div class="produto-admin-sem-imagem">Sem imagem</div>`
        }

        <div class="card-produto-admin-info">
          <h4>${produto.titulo}</h4>

          <p>${produto.descricao || "Sem descrição."}</p>

          <strong>R$ ${Number(produto.valor).toFixed(2).replace(".", ",")}</strong>

         <span class="${Number(produto.estoque) === 0 ? "estoque-produto zerado" : "estoque-produto"}">
  Estoque: ${produto.estoque}
</span>

          <div class="acoes-card-produto-admin">
  <button class="btn-editar-produto" onclick="abrirModalEditarProduto(${produto.id})">
    Editar
  </button>

  <button class="btn-remover-produto" onclick="deletarProduto(${produto.id})">
    Remover
  </button>
</div>
        </div>
      `;

      lista.appendChild(card);
    });
  } catch (error) {
    console.error("Erro ao carregar produtos:", error);
    vazio.style.display = "block";
    vazio.innerText = "Erro ao carregar produtos.";
  }
}

async function carregarConfigProdutos() {
  const toggle = document.getElementById("toggleMostrarProdutos");

  if (!toggle) return;

  try {
    const resposta = await fetch(
      `${API_URL}/api/produtos/config?barbearia_id=${barbeariaId}`,
    );

    const data = await resposta.json();

    if (!data.sucesso) return;

    toggle.checked = data.mostrar_produtos;
  } catch (error) {
    console.error("Erro ao carregar configuração de produtos:", error);
  }
}

async function salvarVisibilidadeProdutos() {
  const toggle = document.getElementById("toggleMostrarProdutos");

  if (!toggle) return;

  try {
    const resposta = await fetch(`${API_URL}/api/produtos/config`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        barbearia_id: barbeariaId,
        mostrar_produtos: toggle.checked,
      }),
    });

    const data = await resposta.json();

    if (!data.sucesso) {
      alert(data.erro || "Erro ao salvar configuração.");
    }
  } catch (error) {
    console.error("Erro ao salvar configuração de produtos:", error);
    alert("Erro ao conectar com o servidor.");
  }
}

function abrirModalConsultaReserva() {
  const modal = document.getElementById("modalConsultaReserva");
  const input = document.getElementById("inputCodigoReservaProduto");
  const mensagem = document.getElementById("mensagemConsultaReserva");
  const resultado = document.getElementById("resultadoReservaProduto");

  if (!modal) return;

  input.value = "";
  mensagem.innerText = "";
  resultado.innerHTML = "";

  modal.classList.add("ativo");

  setTimeout(() => {
    input.focus();
  }, 100);
}

function fecharModalConsultaReserva() {
  const modal = document.getElementById("modalConsultaReserva");

  if (modal) {
    modal.classList.remove("ativo");
  }
}

async function buscarReservaProduto() {
  const input = document.getElementById("inputCodigoReservaProduto");
  const mensagem = document.getElementById("mensagemConsultaReserva");
  const resultado = document.getElementById("resultadoReservaProduto");

  const codigo = input.value.trim().toUpperCase();

  mensagem.innerText = "";
  resultado.innerHTML = "";

  if (!codigo) {
    mensagem.innerText = "Digite o código da reserva.";
    return;
  }

  try {
    const resposta = await fetch(
      `${API_URL}/api/produtos/reservas/${codigo}?barbearia_id=${barbeariaId}`,
    );

    const data = await resposta.json();

    if (!data.sucesso) {
      mensagem.innerText = data.erro || "Reserva não encontrada.";
      return;
    }

    renderizarReservaProduto(data.reserva);
  } catch (error) {
    console.error("Erro ao buscar reserva:", error);
    mensagem.innerText = "Erro ao conectar com o servidor.";
  }
}

let relatoriosIniciados = false;

function formatarDataRelatorio(data) {
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, "0");
  const dia = String(data.getDate()).padStart(2, "0");

  return `${ano}-${mes}-${dia}`;
}

function pegarInicioSemanaRelatorio() {
  const hoje = new Date();
  const diaSemana = hoje.getDay();

  const diff = diaSemana === 0 ? 6 : diaSemana - 1;

  const inicio = new Date(hoje);
  inicio.setDate(hoje.getDate() - diff);

  return inicio;
}

function pegarFimSemanaRelatorio() {
  const inicio = pegarInicioSemanaRelatorio();

  const fim = new Date(inicio);
  fim.setDate(inicio.getDate() + 6);

  return fim;
}

async function iniciarRelatorios() {
  if (!relatoriosIniciados) {
    const hoje = new Date();
    const inicioSemana = pegarInicioSemanaRelatorio();

    document.getElementById("relatorioDataInicio").value =
      formatarDataRelatorio(inicioSemana);

    document.getElementById("relatorioDataFim").value =
      formatarDataRelatorio(hoje);

    await carregarBarbeirosRelatorio();

    relatoriosIniciados = true;
  }

  await buscarRelatorioAgendamentos();
}

async function carregarBarbeirosRelatorio() {
  const select = document.getElementById("filtroRelatorioBarbeiro");

  if (!select) return;

  select.innerHTML = `<option value="todos">Todos os barbeiros</option>`;

  try {
    const resposta = await fetch(
      `${API_URL}/api/barbeiros?barbearia_id=${barbeariaId}`,
    );

    const barbeiros = await resposta.json();

    barbeiros.forEach((barbeiro) => {
      const option = document.createElement("option");
      option.value = barbeiro.id;
      option.innerText = barbeiro.nome;

      select.appendChild(option);
    });
  } catch (error) {
    console.error("Erro ao carregar barbeiros do relatório:", error);
  }
}

async function buscarRelatorioAgendamentos() {
  const barbeiroId = document.getElementById("filtroRelatorioBarbeiro").value;
  const dataInicio = document.getElementById("relatorioDataInicio").value;
  const dataFim = document.getElementById("relatorioDataFim").value;

  if (!dataInicio || !dataFim) {
    alert("Informe a data inicial e final.");
    return;
  }

  const hoje = formatarDataRelatorio(new Date());
  const semanaInicio = formatarDataRelatorio(pegarInicioSemanaRelatorio());
  const semanaFim = formatarDataRelatorio(pegarFimSemanaRelatorio());

  try {
    const resposta = await fetch(
      `${API_URL}/api/barbeiro/relatorios?barbearia_id=${barbeariaId}&barbeiro_id=${barbeiroId}&data_inicio=${dataInicio}&data_fim=${dataFim}&data_hoje=${hoje}&semana_inicio=${semanaInicio}&semana_fim=${semanaFim}`,
    );

    const data = await resposta.json();

    if (!data.sucesso) {
      alert(data.erro || "Erro ao buscar relatório.");
      return;
    }

    renderizarRelatorioAgendamentos(data);
  } catch (error) {
    console.error("Erro ao buscar relatório:", error);
    alert("Erro ao conectar com o servidor.");
  }
}

function renderizarRelatorioAgendamentos(data) {
  const resumo = data.resumo;
  const barbeiros = data.barbeiros || [];

  document.getElementById("relatorioConcluidos").innerText =
    resumo.concluidos || 0;

  document.getElementById("relatorioCancelados").innerText =
    resumo.cancelados || 0;

  document.getElementById("relatorioTotalResumo").innerText =
    resumo.periodo || 0;

  renderizarGraficoRelatorio(barbeiros);
}

function renderizarGraficoRelatorio(barbeiros) {
  const grafico = document.getElementById("graficoRelatorioBarbeiros");
  const vazio = document.getElementById("semDadosGraficoRelatorio");

  grafico.innerHTML = "";

  const maiorValor = Math.max(...barbeiros.map((b) => Number(b.total)), 0);

  if (!barbeiros.length || maiorValor === 0) {
    vazio.style.display = "block";
    return;
  }

  vazio.style.display = "none";

  barbeiros.forEach((barbeiro) => {
    const total = Number(barbeiro.total);
    const largura = maiorValor > 0 ? (total / maiorValor) * 100 : 0;

    const linha = document.createElement("div");
    linha.className = "linha-grafico-relatorio";

    linha.innerHTML = `
      <div class="nome-grafico-relatorio">
        ${barbeiro.barbeiro_nome}
      </div>

      <div class="barra-grafico-relatorio">
        <div style="width: ${largura}%"></div>
      </div>

      <strong>${total}</strong>
    `;

    grafico.appendChild(linha);
  });
}

function renderizarReservaProduto(reserva) {
  const resultado = document.getElementById("resultadoReservaProduto");

  const imagem = reserva.imagem_1 || reserva.imagem_2 || reserva.imagem_3 || "";

  const status = reserva.status || "reservado";
  const podeEditar = status === "reservado";

  const valorFormatado = Number(reserva.valor).toFixed(2).replace(".", ",");

  resultado.innerHTML = `
    <div class="card-reserva-encontrada">
      <div class="reserva-status-topo">
        <h4>${reserva.titulo}</h4>

        <span class="badge-reserva-status ${status}">
          ${status}
        </span>
      </div>

      <div class="reserva-conteudo">
        ${
          imagem
            ? `<img class="reserva-produto-img" src="${API_URL}${imagem}" alt="${reserva.titulo}" />`
            : `<div class="reserva-produto-sem-img">Sem imagem</div>`
        }

        <div>
          <div class="reserva-info-grid">
            <div class="info-reserva-item">
              <span>Cliente</span>
              <strong>${reserva.nome_cliente}</strong>
            </div>

            <div class="info-reserva-item">
              <span>Telefone</span>
              <strong>${reserva.telefone_cliente}</strong>
            </div>

            <div class="info-reserva-item preco">
              <span>Valor do produto</span>
              <strong>R$ ${valorFormatado}</strong>
            </div>

            <div class="info-reserva-item">
              <span>Quantidade</span>
              <strong>${reserva.quantidade}</strong>
            </div>

            <div class="info-reserva-item">
              <span>Estoque atual</span>
              <strong>${reserva.estoque}</strong>
            </div>

            <div class="info-reserva-item">
              <span>Status</span>
              <strong>${status}</strong>
            </div>
          </div>

          <div class="codigo-reserva-destaque">
            ${reserva.codigo}
          </div>
        </div>
      </div>

      <div class="reserva-acoes">
        <button
          class="btn-finalizar-reserva"
          onclick="finalizarReservaProduto('${reserva.codigo}')"
          ${podeEditar ? "" : "disabled"}
        >
          Confirmar retirada / pagamento
        </button>

        <button
          class="btn-cancelar-reserva"
          onclick="cancelarReservaProduto('${reserva.codigo}')"
          ${podeEditar ? "" : "disabled"}
        >
          Cancelar reserva e devolver estoque
        </button>
      </div>
    </div>
  `;
}

async function finalizarReservaProduto(codigo) {
  const confirmar = window.confirm(
    "Confirmar que o cliente retirou e pagou esse produto?",
  );

  if (!confirmar) return;

  try {
    const resposta = await fetch(
      `${API_URL}/api/produtos/reservas/${codigo}/finalizar`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          barbearia_id: barbeariaId,
        }),
      },
    );

    const data = await resposta.json();

    if (!data.sucesso) {
      alert(data.erro || "Erro ao finalizar reserva.");
      return;
    }

    await buscarReservaProduto();
    await carregarProdutosAdmin();
  } catch (error) {
    console.error("Erro ao finalizar reserva:", error);
    alert("Erro ao conectar com o servidor.");
  }
}

async function cancelarReservaProduto(codigo) {
  const confirmar = window.confirm(
    "Cancelar essa reserva? O estoque desse produto será devolvido.",
  );

  if (!confirmar) return;

  try {
    const resposta = await fetch(
      `${API_URL}/api/produtos/reservas/${codigo}/cancelar`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          barbearia_id: barbeariaId,
        }),
      },
    );

    const data = await resposta.json();

    if (!data.sucesso) {
      alert(data.erro || "Erro ao cancelar reserva.");
      return;
    }

    await buscarReservaProduto();
    await carregarProdutosAdmin();
  } catch (error) {
    console.error("Erro ao cancelar reserva:", error);
    alert("Erro ao conectar com o servidor.");
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const inputCodigoReserva = document.getElementById(
    "inputCodigoReservaProduto",
  );

  if (inputCodigoReserva) {
    inputCodigoReserva.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        buscarReservaProduto();
      }
    });
  }
});

function mudarImagemProdutoAdmin(produtoId, direcao) {
  const img = document.getElementById(`imagemProdutoAdmin${produtoId}`);

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
}

async function deletarProduto(id) {
  const confirmar = window.confirm("Deseja remover esse produto?");

  if (!confirmar) return;

  try {
    const resposta = await fetch(
      `${API_URL}/api/produtos/${id}?barbearia_id=${barbeariaId}`,
      {
        method: "DELETE",
      },
    );

    const resultado = await resposta.json();

    if (resultado.sucesso) {
      await carregarProdutosAdmin();
    } else {
      alert(resultado.erro || "Erro ao remover produto.");
    }
  } catch (error) {
    console.error("Erro ao remover produto:", error);
    alert("Erro ao conectar com o servidor.");
  }
}

function abrirModalEditarProduto(produtoId) {
  const produto = produtosAdminCache.find((item) => item.id === produtoId);

  if (!produto) {
    alert("Produto não encontrado.");
    return;
  }

  produtoEditandoId = produto.id;

  document.getElementById("tituloModalProduto").innerText = "Editar produto";
  document.getElementById("btnSalvarProduto").innerText = "Salvar alterações";

  document.getElementById("produtoTitulo").value = produto.titulo || "";
  document.getElementById("produtoDescricao").value = produto.descricao || "";
  document.getElementById("produtoValor").value = produto.valor || "";
  document.getElementById("produtoEstoque").value = produto.estoque || 0;
  document.getElementById("mensagemProduto").innerText = "";

  const areaFotos = document.getElementById("areaFotosProduto");
  if (areaFotos) {
    areaFotos.style.display = "none";
  }

  document.getElementById("modalProduto").classList.add("ativo");
}

async function atualizarProduto() {
  const titulo = document.getElementById("produtoTitulo").value.trim();
  const descricao = document.getElementById("produtoDescricao").value.trim();
  const valor = document.getElementById("produtoValor").value;
  const estoque = document.getElementById("produtoEstoque").value;
  const mensagem = document.getElementById("mensagemProduto");

  mensagem.innerText = "";

  if (!titulo || !valor) {
    mensagem.innerText = "Preencha título e valor.";
    return;
  }

  try {
    const resposta = await fetch(
      `${API_URL}/api/produtos/${produtoEditandoId}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          barbearia_id: barbeariaId,
          titulo,
          descricao,
          valor,
          estoque: estoque || 0,
        }),
      },
    );

    const resultado = await resposta.json();

    if (!resultado.sucesso) {
      mensagem.innerText = resultado.erro || "Erro ao editar produto.";
      return;
    }

    await carregarProdutosAdmin();

    fecharModalProduto();
  } catch (error) {
    console.error("Erro ao editar produto:", error);
    mensagem.innerText = "Erro ao conectar com o servidor.";
  }
}

function abrirModalProduto() {
  produtoEditandoId = null;

  document.getElementById("tituloModalProduto").innerText = "Novo produto";
  document.getElementById("btnSalvarProduto").innerText = "Salvar produto";

  document.getElementById("produtoTitulo").value = "";
  document.getElementById("produtoDescricao").value = "";
  document.getElementById("produtoValor").value = "";
  document.getElementById("produtoEstoque").value = "";
  document.getElementById("mensagemProduto").innerText = "";

  const areaFotos = document.getElementById("areaFotosProduto");
  if (areaFotos) {
    areaFotos.style.display = "block";
  }

  document.querySelectorAll(".input-foto-produto").forEach((input) => {
    input.value = "";

    const box = input.closest(".upload-produto-box");
    const img = box.querySelector("img");

    img.src = "";
    box.classList.remove("com-imagem");
  });

  document.getElementById("modalProduto").classList.add("ativo");
}

function fecharModalProduto() {
  document.getElementById("modalProduto").classList.remove("ativo");
  produtoEditandoId = null;
}

document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll(".input-foto-produto").forEach((input) => {
    input.addEventListener("change", () => {
      const arquivo = input.files[0];
      const box = input.closest(".upload-produto-box");
      const img = box.querySelector("img");

      if (!arquivo) return;

      img.src = URL.createObjectURL(arquivo);
      box.classList.add("com-imagem");
    });
  });
});

let servicoEditandoId = null;
let servicosAdminCache = [];

function abrirModalServico() {
  servicoEditandoId = null;

  document.getElementById("tituloModalServico").innerText = "Novo serviço";
  document.getElementById("btnSalvarServico").innerText = "Salvar serviço";

  document.getElementById("servicoNome").value = "";
  document.getElementById("servicoDescricao").value = "";
  document.getElementById("servicoPreco").value = "";
  document.getElementById("servicoDuracao").value = "";
  document.getElementById("mensagemServico").innerText = "";

  document.getElementById("modalServico").classList.add("ativo");
}

function fecharModalServico() {
  servicoEditandoId = null;

  document.getElementById("modalServico").classList.remove("ativo");
  document.getElementById("mensagemServico").innerText = "";
}

function salvarServico() {
  if (servicoEditandoId) {
    atualizarServico();
  } else {
    criarServico();
  }
}

async function criarServico() {
  const nome = document.getElementById("servicoNome").value.trim();
  const descricao = document.getElementById("servicoDescricao").value.trim();
  const preco = document.getElementById("servicoPreco").value;
  const duracao_minutos = document.getElementById("servicoDuracao").value;
  const mensagem = document.getElementById("mensagemServico");

  mensagem.innerText = "";

  if (!nome || !preco || !duracao_minutos) {
    mensagem.innerText = "Preencha nome, preço e duração.";
    return;
  }

  try {
    const resposta = await fetch(`${API_URL}/api/servicos`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        barbearia_id: barbeariaId,
        nome,
        descricao,
        preco,
        duracao_minutos,
      }),
    });

    const resultado = await resposta.json();

    if (!resultado.sucesso) {
      mensagem.innerText = resultado.erro || "Erro ao criar serviço.";
      return;
    }

    await carregarServicosAdmin();
    fecharModalServico();
  } catch (error) {
    console.error("Erro ao criar serviço:", error);
    mensagem.innerText = "Erro ao conectar com o servidor.";
  }
}

async function carregarServicosAdmin() {
  const lista = document.getElementById("listaServicosAdmin");
  const vazio = document.getElementById("semServicosAdmin");

  if (!lista || !vazio) return;

  lista.innerHTML = "";
  vazio.style.display = "none";

  try {
    const resposta = await fetch(
      `${API_URL}/api/servicos?barbearia_id=${barbeariaId}`,
    );

    const servicos = await resposta.json();

    servicosAdminCache = servicos;

    if (!servicos.length) {
      vazio.style.display = "block";
      return;
    }

    servicos.forEach((servico) => {
      const card = document.createElement("div");
      card.className = "card-servico-admin";

      card.innerHTML = `
        <div class="card-servico-topo">
          <div>
            <h4>${servico.nome}</h4>
            <p>${servico.descricao || "Sem descrição."}</p>
          </div>

          <span>${servico.duracao_minutos} min</span>
        </div>

        <div class="servico-preco">
          R$ ${Number(servico.preco).toFixed(2).replace(".", ",")}
        </div>

        <div class="acoes-card-servico">
          <button
            class="btn-editar-servico"
            onclick="abrirModalEditarServico(${servico.id})"
          >
            Editar
          </button>

          <button
            class="btn-remover-servico"
            onclick="deletarServico(${servico.id})"
          >
            Remover
          </button>
        </div>
      `;

      lista.appendChild(card);
    });
  } catch (error) {
    console.error("Erro ao carregar serviços:", error);
    vazio.style.display = "block";
    vazio.innerText = "Erro ao carregar serviços.";
  }
}

function abrirModalEditarServico(servicoId) {
  const servico = servicosAdminCache.find((item) => item.id === servicoId);

  if (!servico) {
    alert("Serviço não encontrado.");
    return;
  }

  servicoEditandoId = servico.id;

  document.getElementById("tituloModalServico").innerText = "Editar serviço";
  document.getElementById("btnSalvarServico").innerText = "Salvar alterações";

  document.getElementById("servicoNome").value = servico.nome || "";
  document.getElementById("servicoDescricao").value = servico.descricao || "";
  document.getElementById("servicoPreco").value = servico.preco || "";
  document.getElementById("servicoDuracao").value =
    servico.duracao_minutos || "";

  document.getElementById("mensagemServico").innerText = "";

  document.getElementById("modalServico").classList.add("ativo");
}

async function atualizarServico() {
  const nome = document.getElementById("servicoNome").value.trim();
  const descricao = document.getElementById("servicoDescricao").value.trim();
  const preco = document.getElementById("servicoPreco").value;
  const duracao_minutos = document.getElementById("servicoDuracao").value;
  const mensagem = document.getElementById("mensagemServico");

  mensagem.innerText = "";

  if (!nome || !preco || !duracao_minutos) {
    mensagem.innerText = "Preencha nome, preço e duração.";
    return;
  }

  try {
    const resposta = await fetch(
      `${API_URL}/api/servicos/${servicoEditandoId}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          barbearia_id: barbeariaId,
          nome,
          descricao,
          preco,
          duracao_minutos,
        }),
      },
    );

    const resultado = await resposta.json();

    if (!resultado.sucesso) {
      mensagem.innerText = resultado.erro || "Erro ao editar serviço.";
      return;
    }

    await carregarServicosAdmin();
    fecharModalServico();
  } catch (error) {
    console.error("Erro ao editar serviço:", error);
    mensagem.innerText = "Erro ao conectar com o servidor.";
  }
}

async function deletarServico(id) {
  const confirmar = window.confirm(
    "Tem certeza que deseja remover este serviço?",
  );

  if (!confirmar) return;

  try {
    const resposta = await fetch(
      `${API_URL}/api/servicos/${id}?barbearia_id=${barbeariaId}`,
      {
        method: "DELETE",
      },
    );

    const resultado = await resposta.json();

    if (!resultado.sucesso) {
      alert(resultado.erro || "Erro ao remover serviço.");
      return;
    }

    await carregarServicosAdmin();
  } catch (error) {
    console.error("Erro ao remover serviço:", error);
    alert("Erro ao conectar com o servidor.");
  }
}

carregarBarbeiros();
atualizarTextoDataFiltro();
carregarAgendamentos(true);
carregarLocalizacaoBarbearia();
carregarLogoBarbearia();
carregarProdutosAdmin();

setInterval(() => {
  carregarAgendamentos(false);
}, 5000);
