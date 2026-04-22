let ultimoAgendamentosJSON = "";

function formatarData(dataString) {
  const data = new Date(dataString);

  return data.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function abrirSecao(secao) {
  const dashboard = document.getElementById("secaoDashboard");
  const configuracoes = document.getElementById("secaoConfiguracoes");
  const localizacao = document.getElementById("secaoLocalizacao");

  const menuDashboard = document.getElementById("menuDashboard");
  const menuConfiguracoes = document.getElementById("menuConfiguracoes");
  const menuLocalizacao = document.getElementById("menuLocalizacao");

  dashboard.classList.remove("ativa");
  configuracoes.classList.remove("ativa");
  localizacao.classList.remove("ativa");

  menuDashboard.classList.remove("ativo");
  menuConfiguracoes.classList.remove("ativo");
  menuLocalizacao.classList.remove("ativo");

  if (secao === "dashboard") {
    dashboard.classList.add("ativa");
    menuDashboard.classList.add("ativo");
  } else if (secao === "configuracoes") {
    configuracoes.classList.add("ativa");
    menuConfiguracoes.classList.add("ativo");
  } else {
    localizacao.classList.add("ativa");
    menuLocalizacao.classList.add("ativo");
  }
}

function abrirAbaConfig(nome) {
  const abaBloqueio = document.getElementById("abaBloqueio");
  const abaHorario = document.getElementById("abaHorario");
  const abaBloqueioBtn = document.getElementById("abaBloqueioBtn");
  const abaHorarioBtn = document.getElementById("abaHorarioBtn");

  abaBloqueio.classList.remove("ativa");
  abaHorario.classList.remove("ativa");
  abaBloqueioBtn.classList.remove("ativa");
  abaHorarioBtn.classList.remove("ativa");

  if (nome === "bloqueio") {
    abaBloqueio.classList.add("ativa");
    abaBloqueioBtn.classList.add("ativa");
  } else {
    abaHorario.classList.add("ativa");
    abaHorarioBtn.classList.add("ativa");
  }
}

function montarHTMLAgendamentos(agendamentos) {
  return agendamentos
    .map(
      (agendamento) => `
        <div class="card-agendamento">
          <div class="info-agendamento">
            <strong>${agendamento.nome}</strong>

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
            <button class="btn-concluir" onclick="concluirAgendamento(${agendamento.id})">
              Concluir
            </button>

            <button class="btn-excluir" onclick="excluirAgendamento(${agendamento.id})">
              Excluir
            </button>
          </div>
        </div>
      `,
    )
    .join("");
}

async function carregarAgendamentos(forcarRender = false) {
  const lista = document.getElementById("listaAgendamentos");
  const semAgendamentos = document.getElementById("semAgendamentos");

  try {
    const resposta = await fetch(
      "http://localhost:3000/api/barbeiro/agendamentos",
    );
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

    lista.innerHTML = agendamentos
      .map((agendamento) => {
        const cancelado = agendamento.status === "cancelado";

        return `
          <div class="card-agendamento ${cancelado ? "cancelado" : ""}">
            <div class="info-agendamento">
              <div class="topo-agendamento">
                <strong>${agendamento.nome}</strong>
                ${
                  cancelado
                    ? `<span class="badge-cancelado">Cancelado</span>`
                    : ""
                }
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
      `http://localhost:3000/api/barbeiro/agendamentos/${id}/concluir`,
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
      `http://localhost:3000/api/barbeiro/agendamentos/${id}`,
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

async function carregarDiasBloqueados() {
  const lista = document.getElementById("listaBloqueios");
  const semBloqueios = document.getElementById("semBloqueios");

  lista.innerHTML = "";

  try {
    const resposta = await fetch(
      "http://localhost:3000/api/barbeiro/dias-bloqueados",
    );
    const bloqueios = await resposta.json();

    if (!bloqueios.length) {
      semBloqueios.style.display = "block";
      return;
    }

    semBloqueios.style.display = "none";

    bloqueios.forEach((bloqueio) => {
      const card = document.createElement("div");
      card.className = "card-bloqueio";

      card.innerHTML = `
        <div class="info-bloqueio">
          <strong>${bloqueio.data.toString().slice(8, 10)}/${bloqueio.data.toString().slice(5, 7)}/${bloqueio.data.toString().slice(0, 4)}</strong>
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

  if (!data) {
    mensagem.innerText = "Escolha uma data.";
    return;
  }

  try {
    const resposta = await fetch(
      "http://localhost:3000/api/barbeiro/dias-bloqueados",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ data, motivo }),
      },
    );

    const resultado = await resposta.json();

    if (resultado.sucesso) {
      mensagem.innerText = "Dia bloqueado com sucesso.";
      document.getElementById("dataBloqueio").value = "";
      document.getElementById("motivoBloqueio").value = "";
      carregarDiasBloqueados();
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

  try {
    const resposta = await fetch(
      `http://localhost:3000/api/barbeiro/dias-bloqueados/${id}`,
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

async function carregarConfiguracaoAgenda() {
  try {
    const resposta = await fetch(
      "http://localhost:3000/api/barbeiro/configuracao-agenda",
    );
    const config = await resposta.json();

    document.getElementById("horaInicio").value = config.hora_inicio
      .toString()
      .slice(0, 5);
    document.getElementById("horaFim").value = config.hora_fim
      .toString()
      .slice(0, 5);
    document.getElementById("intervalo").value = String(config.intervalo);
    document.getElementById("bloquearSabado").checked = Boolean(
      config.bloquear_sabado,
    );
    document.getElementById("bloquearDomingo").checked = Boolean(
      config.bloquear_domingo,
    );

    document.getElementById("ruaBarbearia").value = config.rua || "";
    document.getElementById("numeroBarbearia").value = config.numero || "";
    document.getElementById("bairroBarbearia").value = config.bairro || "";
    document.getElementById("cidadeBarbearia").value = config.cidade || "";
  } catch (error) {
    console.error("Erro ao carregar configuração:", error);
  }
}

async function salvarConfiguracaoAgenda() {
  const hora_inicio = document.getElementById("horaInicio").value;
  const hora_fim = document.getElementById("horaFim").value;
  const intervalo = document.getElementById("intervalo").value;
  const bloquear_sabado = document.getElementById("bloquearSabado").checked;
  const bloquear_domingo = document.getElementById("bloquearDomingo").checked;

  const rua = document.getElementById("ruaBarbearia").value.trim();
  const numero = document.getElementById("numeroBarbearia").value.trim();
  const bairro = document.getElementById("bairroBarbearia").value.trim();
  const cidade = document.getElementById("cidadeBarbearia").value.trim();

  const mensagemBloqueio = document.getElementById("mensagemConfiguracao");
  const mensagemHorario = document.getElementById(
    "mensagemConfiguracaoHorario",
  );

  if (mensagemBloqueio) mensagemBloqueio.innerText = "";
  if (mensagemHorario) mensagemHorario.innerText = "";

  if (!hora_inicio || !hora_fim || !intervalo) {
    if (mensagemHorario) {
      mensagemHorario.innerText = "Preencha os horários corretamente.";
    }
    return;
  }

  try {
    const resposta = await fetch(
      "http://localhost:3000/api/barbeiro/configuracao-agenda",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          hora_inicio,
          hora_fim,
          intervalo,
          bloquear_sabado,
          bloquear_domingo,
          rua,
          numero,
          bairro,
          cidade,
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
  const hora_inicio = document.getElementById("horaInicio").value;
  const hora_fim = document.getElementById("horaFim").value;
  const intervalo = document.getElementById("intervalo").value;
  const bloquear_sabado = document.getElementById("bloquearSabado").checked;
  const bloquear_domingo = document.getElementById("bloquearDomingo").checked;

  const rua = document.getElementById("ruaBarbearia").value.trim();
  const numero = document.getElementById("numeroBarbearia").value.trim();
  const bairro = document.getElementById("bairroBarbearia").value.trim();
  const cidade = document.getElementById("cidadeBarbearia").value.trim();

  const mensagem = document.getElementById("mensagemLocalizacao");

  mensagem.innerText = "";

  if (!hora_inicio || !hora_fim || !intervalo) {
    mensagem.innerText = "Preencha primeiro os horários da agenda.";
    return;
  }

  try {
    const resposta = await fetch(
      "http://localhost:3000/api/barbeiro/configuracao-agenda",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          hora_inicio,
          hora_fim,
          intervalo,
          bloquear_sabado,
          bloquear_domingo,
          rua,
          numero,
          bairro,
          cidade,
        }),
      },
    );

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

carregarAgendamentos(true);
carregarDiasBloqueados();
carregarConfiguracaoAgenda();

setInterval(() => {
  carregarAgendamentos(false);
}, 5000);
