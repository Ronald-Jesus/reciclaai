// Chamadas ao Flask. Erro HTTP vira Error com a mensagem do servidor e o código em `status`.
async function lerJson(resposta) {
  const dados = await resposta.json().catch(() => ({}));
  if (!resposta.ok) {
    const erro = new Error(dados.error || `O servidor respondeu com erro ${resposta.status}. Tente de novo.`);
    erro.status = resposta.status;
    throw erro;
  }
  return dados;
}

// Cancelar o `sinal` rejeita a promessa com AbortError.
export async function analisarFoto(blob, sinal) {
  const corpo = new FormData();
  corpo.append("image", blob, blob.name || "foto.jpg");
  return lerJson(await fetch("/predict", { method: "POST", body: corpo, signal: sinal }));
}

export async function statusModelo() {
  return lerJson(await fetch("/api/status"));
}

// Máquina (RVM): abre a sessão, insere uma foto por vez e encerra com o voucher.
const post = async (url, corpo, sinal) => lerJson(await fetch(url, { method: "POST", body: corpo, signal: sinal }));

export async function abrirSessao(sinal) {
  return (await post("/api/session", undefined, sinal)).session_id;
}

export async function inserirNaMaquina(sessao, blob, sinal) {
  const corpo = new FormData();
  corpo.append("image", blob, blob.name || "foto.jpg");
  return post(`/api/session/${sessao}/insert`, corpo, sinal);
}

export async function encerrarSessao(sessao, sinal) {
  return post(`/api/session/${sessao}/finish`, undefined, sinal);
}
