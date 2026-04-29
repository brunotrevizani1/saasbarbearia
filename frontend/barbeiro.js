const API_URL = "https://saasbarbearia.up.railway.app";
const barbeariaId = localStorage.getItem("barbearia_id");

if (!barbeariaId) {
  window.location.href = "login.html";
}

let ultimoAgendamentosJSON = "";
let barbeiroSelecionado = "";
let barbeiroFiltroDashboard = "";

function formatarData(dataString) {
  const dataLimpa = dataString.toString().slice(0, 10);
  const [ano, mes, dia] = dataLimpa.split("-");

  return `${dia}/${mes}/${ano}`;
}

function abrirSecao(secao) {
  const dashboard = document.getElementById("secaoDashboard");
  const configuracoes = document.getElementById("secaoConfiguracoes");
  const localizacao = document.getElementById("secaoLocalizacao");
  const equipe = document.getElementById("secaoEquipe");

  const menuDashboard = document.getElementById("menuDashboard");
  const menuConfiguracoes = document.getElementById("menuConfiguracoes");
  const menuLocalizacao = document.getElementById("menuLocalizacao");
  const menuEquipe = document.getElementById("menuEquipe");

  dashboard.classList.remove("ativa");
  configuracoes.classList.remove("ativa");
  localizacao.classList.remove("ativa");
  equipe.classList.remove("ativa");

  menuDashboard.classList.remove("ativo");
  menuConfiguracoes.classList.remove("ativo");
  menuLocalizacao.classList.remove("ativo");
  menuEquipe.classList.remove("ativo");

  if (secao === "dashboard") {
    dashboard.classList.add("ativa");
    menuDashboard.classList.add("ativo");
  }

  if (secao === "configuracoes") {
    configuracoes.classList.add("ativa");
    menuConfiguracoes.classList.add("ativo");
  }

  if (secao === "localizacao") {
    localizacao.classList.add("ativa");
    menuLocalizacao.classList.add("ativo");
  }

  if (secao === "equipe") {
    equipe.classList.add("ativa");
    menuEquipe.classList.add("ativo");
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
      carregarLogoBarbearia();
    } else {
      mensagem.innerText = resultado.erro || "Erro ao salvar logo.";
    }
  } catch (error) {
    console.error("Erro ao enviar logo:", error);
    mensagem.innerText = "Erro ao conectar com o servidor.";
  }
}

async function carregarLogoBarbearia() {
  try {
    const resposta = await fetch(
      `${API_URL}/api/barbeiro/logo?barbearia_id=${barbeariaId}`,
    );

    const data = await resposta.json();

    const preview = document.getElementById("previewLogo");

    if (data.logo) {
      preview.src = `${API_URL}${data.logo}`;
      preview.style.display = "block";
    } else {
      preview.style.display = "none";
    }
  } catch (error) {
    console.error("Erro ao carregar logo:", error);
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
              <strong>${agendamento.nome}</strong>
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
              <span>${agendamento.barbeiro_nome || "Barbeiro não informado"}</span>
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
                <path
                  d="M8 2v4M16 2v4M3 10h18M5 5h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z"
                  stroke="currentColor"
                  stroke-width="1.8"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
              <span>${formatarData(agendamento.data)}</span>
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

    const jsonAtual = JSON.stringify(agendamentos);

    if (!forcarRender && jsonAtual === ultimoAgendamentosJSON) {
      return;
    }

    ultimoAgendamentosJSON = jsonAtual;

    if (!agendamentos.length) {
      lista.innerHTML = "";
      semAgendamentos.style.display = "block";
      return;
    }

    semAgendamentos.style.display = "none";
    lista.innerHTML = montarHTMLAgendamentos(agendamentos);
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

carregarBarbeiros();
carregarAgendamentos(true);
carregarLocalizacaoBarbearia();
carregarLogoBarbearia();

setInterval(() => {
  carregarAgendamentos(false);
}, 5000);
