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
