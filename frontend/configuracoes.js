function formatarData(dataString) {
  const [ano, mes, dia] = dataString.split("-");
  const data = new Date(Number(ano), Number(mes) - 1, Number(dia));

  return data.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function abrirAba(nome) {
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
          <strong>${formatarData(bloqueio.data.toString().slice(0, 10))}</strong>
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

carregarDiasBloqueados();
carregarConfiguracaoAgenda();
