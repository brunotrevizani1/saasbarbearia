const API_URL = "https://saasbarbearia.up.railway.app";

async function fazerLogin() {
  const email = document.getElementById("email").value.trim();
  const senha = document.getElementById("senha").value.trim();
  const mensagem = document.getElementById("mensagemLogin");

  mensagem.innerText = "";

  if (!email || !senha) {
    mensagem.innerText = "Preencha e-mail e senha.";
    return;
  }

  try {
    const resposta = await fetch(`${API_URL}/api/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, senha }),
    });

    const resultado = await resposta.json();

    if (!resultado.sucesso) {
      mensagem.innerText = resultado.erro || "Erro ao fazer login.";
      return;
    }

    localStorage.setItem("barbearia_id", resultado.barbearia.id);
    localStorage.setItem("barbearia_nome", resultado.barbearia.nome);

    window.location.href = "barbeiro.html";
  } catch (error) {
    console.error("Erro no login:", error);
    mensagem.innerText = "Erro ao conectar com o servidor.";
  }
}

/* 👁️ MOSTRAR / ESCONDER SENHA */
function toggleSenha() {
  const input = document.getElementById("senha");
  const icone = document.getElementById("iconeOlho");

  if (input.type === "password") {
    input.type = "text";

    icone.innerHTML = `
  <path
    d="M2 2l20 20"
    stroke="currentColor"
    stroke-width="1.8"
    stroke-linecap="round"
  />
  <path
    d="M10.58 10.58a2 2 0 0 0 2.83 2.83"
    stroke="currentColor"
    stroke-width="1.8"
    stroke-linecap="round"
  />
  <path
    d="M9.9 4.24A10.94 10.94 0 0 1 12 4c7 0 11 8 11 8a21.86 21.86 0 0 1-5.17 5.94M6.1 6.1A21.87 21.87 0 0 0 1 12s4 8 11 8c1.61 0 3.13-.27 4.53-.77"
    stroke="currentColor"
    stroke-width="1.8"
    stroke-linecap="round"
    stroke-linejoin="round"
  />
`;
  } else {
    input.type = "password";

    icone.innerHTML = `
      <path
        d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12Z"
        stroke="currentColor"
        stroke-width="1.8"
      />
      <circle
        cx="12"
        cy="12"
        r="3"
        stroke="currentColor"
        stroke-width="1.8"
      />
    `;
  }
}
