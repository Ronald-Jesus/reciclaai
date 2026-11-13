// Quadros WebP do vídeo da máquina, em public/maquina/frames/ (ainda não gerados).
export const TOTAL_QUADROS = 120;
export const PASTA_QUADROS = `${import.meta.env.BASE_URL}maquina/frames/`;

export function nomeDoQuadro(i) {
  return `frame_${String(i).padStart(4, "0")}.webp`;
}

// Confere se o primeiro quadro existe. Sem a pasta, o servidor devolve 404 ou o index.html
// (fallback de SPA), por isso o tipo precisa ser imagem. Falha de rede conta como "não existe".
export async function existemQuadros() {
  try {
    const resposta = await fetch(PASTA_QUADROS + nomeDoQuadro(1), { method: "HEAD" });
    return resposta.ok && (resposta.headers.get("content-type") || "").startsWith("image/");
  } catch {
    return false;
  }
}
