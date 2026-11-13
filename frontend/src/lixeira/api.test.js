import { describe, it, expect, vi, afterEach } from "vitest";
import { analisarFoto, statusModelo } from "./api.js";

function resposta(status, corpo) {
  return Promise.resolve(new Response(JSON.stringify(corpo), { status }));
}

afterEach(() => vi.unstubAllGlobals());

describe("api", () => {
  it("analisarFoto envia a foto no campo image e devolve o JSON", async () => {
    const fetchFalso = vi.fn(() => resposta(200, { nao_reconhecido: false }));
    vi.stubGlobal("fetch", fetchFalso);
    const sinal = new AbortController().signal;
    const dados = await analisarFoto(new File(["x"], "a.jpg", { type: "image/jpeg" }), sinal);
    expect(dados).toEqual({ nao_reconhecido: false });
    const [url, opcoes] = fetchFalso.mock.calls[0];
    expect(url).toBe("/predict");
    expect(opcoes.method).toBe("POST");
    expect(opcoes.signal).toBe(sinal);
    expect(opcoes.body.get("image")).toBeInstanceOf(File);
  });

  it("erro HTTP vira Error com a mensagem do servidor", async () => {
    vi.stubGlobal("fetch", vi.fn(() => resposta(413, { error: "A imagem passa de 5 MB." })));
    await expect(analisarFoto(new Blob(["x"]))).rejects.toMatchObject({
      message: "A imagem passa de 5 MB.",
      status: 413,
    });
  });

  it("statusModelo lê /api/status", async () => {
    const fetchFalso = vi.fn(() => resposta(200, { model_ready: true, classes: [] }));
    vi.stubGlobal("fetch", fetchFalso);
    expect(await statusModelo()).toEqual({ model_ready: true, classes: [] });
    expect(fetchFalso.mock.calls[0][0]).toBe("/api/status");
  });
});
