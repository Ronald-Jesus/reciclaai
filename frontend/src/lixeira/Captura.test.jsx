import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import Captura from "./Captura.jsx";

function json(status, corpo) {
  return Promise.resolve(new Response(JSON.stringify(corpo), { status }));
}

// fetch falso: /api/status responde `status`; /predict usa a função `predict`.
function simularServidor({ status = { model_ready: true, classes: [] }, predict } = {}) {
  const fetchFalso = vi.fn((url, opcoes) => {
    if (url === "/api/status") return json(200, status);
    return predict(opcoes);
  });
  vi.stubGlobal("fetch", fetchFalso);
  return fetchFalso;
}

function escolherFoto(container, nome = "garrafa.jpg", tipo = "image/jpeg") {
  const entrada = container.querySelector('input[type="file"]');
  fireEvent.change(entrada, { target: { files: [new File(["x"], nome, { type: tipo })] } });
}

beforeEach(() => {
  URL.createObjectURL = vi.fn(() => "blob:foto");
  URL.revokeObjectURL = vi.fn();
});

afterEach(() => {
  vi.unstubAllGlobals();
  delete window.isSecureContext;
});

describe("Captura", () => {
  it("câmera negada mostra aviso e mantém o envio de arquivo", async () => {
    simularServidor();
    Object.defineProperty(window, "isSecureContext", { value: true, configurable: true });
    const erro = Object.assign(new Error("negado"), { name: "NotAllowedError" });
    vi.stubGlobal("navigator", { mediaDevices: { getUserMedia: vi.fn(() => Promise.reject(erro)) } });
    const { container } = render(<Captura onResultado={() => {}} />);

    fireEvent.click(screen.getByRole("button", { name: /usar câmera/i }));

    expect(await screen.findByText(/não liberou a câmera/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /escolher foto/i })).toBeEnabled();
    escolherFoto(container);
    expect(screen.getByRole("button", { name: /analisar foto/i })).toBeEnabled();
  });

  it("sem HTTPS avisa que a câmera não funciona e não chama getUserMedia", async () => {
    simularServidor();
    Object.defineProperty(window, "isSecureContext", { value: false, configurable: true });
    const getUserMedia = vi.fn();
    vi.stubGlobal("navigator", { mediaDevices: { getUserMedia } });
    render(<Captura onResultado={() => {}} />);

    fireEvent.click(screen.getByRole("button", { name: /usar câmera/i }));

    expect(await screen.findByText(/HTTPS/)).toBeInTheDocument();
    expect(getUserMedia).not.toHaveBeenCalled();
  });

  it("modelo não pronto mostra aviso", async () => {
    simularServidor({ status: { model_ready: false, classes: [] } });
    render(<Captura onResultado={() => {}} />);
    expect(await screen.findByText(/a IA ainda não está pronta/i)).toBeInTheDocument();
  });

  it("resposta 503 do /predict mostra o aviso de modelo não pronto", async () => {
    simularServidor({ predict: () => json(503, { error: "O modelo ainda não foi treinado." }) });
    const { container } = render(<Captura onResultado={() => {}} />);
    escolherFoto(container);
    fireEvent.click(screen.getByRole("button", { name: /analisar foto/i }));
    expect(await screen.findByText(/a IA ainda não está pronta/i)).toBeInTheDocument();
  });

  it("arquivo inválido mostra a mensagem e deixa Analisar inativo", () => {
    simularServidor();
    const { container } = render(<Captura onResultado={() => {}} />);
    escolherFoto(container, "foto.heic", "image/heic");
    expect(screen.getByRole("alert")).toHaveTextContent(/envie em JPG ou PNG/i);
    expect(screen.getByRole("button", { name: /analisar foto/i })).toBeDisabled();
  });

  it("colar uma imagem (Ctrl+V) vira a foto escolhida", () => {
    simularServidor();
    render(<Captura onResultado={() => {}} />);
    const foto = new File(["x"], "colada.png", { type: "image/png" });
    fireEvent.paste(document, { clipboardData: { files: [foto] } });
    expect(screen.getByRole("img", { name: /foto escolhida/i })).toBeInTheDocument();
  });

  it("cancelar interrompe a análise", async () => {
    let sinalRecebido;
    simularServidor({
      predict: (opcoes) =>
        new Promise((_, rejeitar) => {
          sinalRecebido = opcoes.signal;
          opcoes.signal.addEventListener("abort", () =>
            rejeitar(new DOMException("cancelado", "AbortError"))
          );
        }),
    });
    const onResultado = vi.fn();
    const { container } = render(<Captura onResultado={onResultado} />);
    escolherFoto(container);
    fireEvent.click(screen.getByRole("button", { name: /analisar foto/i }));

    expect(await screen.findByText("Analisando…")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /cancelar/i }));

    expect(sinalRecebido.aborted).toBe(true);
    expect(await screen.findByText(/análise cancelada/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /analisar foto/i })).toBeEnabled();
    expect(onResultado).not.toHaveBeenCalled();
  });

  it("ao terminar chama onResultado com a resposta e a foto", async () => {
    const corpo = { prediction: { class: "plastic", confidence: 91 }, nao_reconhecido: false };
    simularServidor({ predict: () => json(200, corpo) });
    const onResultado = vi.fn();
    const { container } = render(<Captura onResultado={onResultado} />);
    escolherFoto(container);
    fireEvent.click(screen.getByRole("button", { name: /analisar foto/i }));
    await waitFor(() => expect(onResultado).toHaveBeenCalledWith(corpo, "blob:foto"));
  });

  it("mensagens de 400 e 413 vêm do servidor; erro de rede tem texto próprio", async () => {
    for (const [predict, texto] of [
      [() => json(400, { error: "Não consegui ler essa imagem." }), "Não consegui ler essa imagem."],
      [() => json(413, { error: "A imagem passa de 5 MB." }), "A imagem passa de 5 MB."],
      [() => Promise.reject(new TypeError("Failed to fetch")), /não consegui falar com o servidor/i],
    ]) {
      simularServidor({ predict });
      const { container, unmount } = render(<Captura onResultado={() => {}} />);
      escolherFoto(container);
      fireEvent.click(screen.getByRole("button", { name: /analisar foto/i }));
      expect(await screen.findByText(texto)).toBeInTheDocument();
      unmount();
    }
  });

  it("soltar um arquivo na área vira a foto escolhida", () => {
    simularServidor();
    render(<Captura onResultado={() => {}} />);
    const foto = new File(["x"], "solta.webp", { type: "image/webp" });
    const area = screen.getByRole("button", { name: /arraste uma foto aqui/i }).parentElement;
    fireEvent.drop(area, { dataTransfer: { files: [foto] } });
    expect(screen.getByRole("img", { name: /foto escolhida: solta.webp/i })).toBeInTheDocument();
  });

  it("arquivo inválido depois de uma foto válida tira a foto e desativa Analisar", () => {
    simularServidor();
    const { container } = render(<Captura onResultado={() => {}} />);
    escolherFoto(container);
    escolherFoto(container, "notas.pdf", "application/pdf");
    expect(screen.queryByRole("img", { name: /foto escolhida/i })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /analisar foto/i })).toBeDisabled();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:foto");
  });

  it("remover a foto devolve o foco à área da foto", () => {
    simularServidor();
    const { container } = render(<Captura onResultado={() => {}} />);
    escolherFoto(container);
    fireEvent.click(screen.getByRole("button", { name: /remover foto/i }));
    expect(screen.getByRole("button", { name: /arraste uma foto aqui/i })).toHaveFocus();
  });

  it("dicas para uma boa foto aparecem na captura, num details fechado", () => {
    simularServidor();
    render(<Captura onResultado={() => {}} />);
    const dicas = screen.getByText("Dicas para uma boa foto").closest("details");
    expect(dicas).not.toHaveAttribute("open");
    expect(dicas.querySelectorAll("li")).toHaveLength(4);
    expect(dicas).toHaveTextContent(/Um item por foto/);
  });

  it("chip de exemplo carrega a foto como arquivo e manda para a IA", async () => {
    const corpo = { prediction: { class: "plastic", confidence: 99 }, nao_reconhecido: false };
    const fetchFalso = simularServidor({ predict: () => json(200, corpo) });
    const original = fetchFalso.getMockImplementation();
    fetchFalso.mockImplementation((url, opcoes) =>
      url === "/exemplos/garrafa.jpg"
        ? Promise.resolve(new Response(new Blob(["jpg"], { type: "image/jpeg" }), { status: 200 }))
        : original(url, opcoes)
    );
    const onResultado = vi.fn();
    render(<Captura onResultado={onResultado} />);
    expect(screen.getByRole("group", { name: /fotos de exemplo/i })).toBeInTheDocument();
    for (const nome of ["Garrafa", "Casca", "Foto tremida"]) expect(screen.getByRole("button", { name: nome })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Garrafa" }));
    expect(await screen.findByRole("img", { name: /foto escolhida: exemplo: garrafa/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /analisar foto/i })).toHaveFocus();

    fireEvent.click(screen.getByRole("button", { name: /analisar foto/i }));
    await waitFor(() => expect(onResultado).toHaveBeenCalledWith(corpo, "blob:foto"));
    const envio = fetchFalso.mock.calls.find(([url]) => url !== "/api/status" && !url.startsWith("/exemplos"));
    expect(envio[1].body.get("image").name).toBe("Exemplo: garrafa");
  });

  it("exemplo que não carrega mostra erro", async () => {
    const fetchFalso = simularServidor();
    const original = fetchFalso.getMockImplementation();
    fetchFalso.mockImplementation((url, opcoes) =>
      url.startsWith("/exemplos") ? json(404, {}) : original(url, opcoes)
    );
    render(<Captura onResultado={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: "Casca" }));
    expect(await screen.findByText(/não consegui abrir a foto de exemplo/i)).toBeInTheDocument();
  });

  it("analisando: textos se alternam, com mira e barra de progresso", async () => {
    simularServidor({ predict: () => new Promise(() => {}) }); // nunca responde
    const { container } = render(<Captura onResultado={() => {}} />);
    escolherFoto(container);
    fireEvent.click(screen.getByRole("button", { name: /analisar foto/i }));
    expect(await screen.findByText("Lendo a imagem…")).toBeInTheDocument();
    expect(screen.getByRole("progressbar", { name: /analisando a foto/i })).toHaveClass("rc-progress--indeterminate");
    expect(container.querySelector(".lx-varredura__cantos")).toBeInTheDocument();
    expect(await screen.findByText("Reconhecendo o material…", {}, { timeout: 1500 })).toBeInTheDocument();
  });

  it("analisando com menos animação: o texto fica parado", async () => {
    const original = window.matchMedia;
    window.matchMedia = vi.fn((q) => ({ matches: true, media: q, addEventListener: vi.fn(), removeEventListener: vi.fn() }));
    vi.useFakeTimers({ toFake: ["setInterval"] });
    try {
      simularServidor({ predict: () => new Promise(() => {}) });
      const { container } = render(<Captura onResultado={() => {}} />);
      escolherFoto(container);
      fireEvent.click(screen.getByRole("button", { name: /analisar foto/i }));
      expect(screen.getByText("Lendo a imagem…")).toBeInTheDocument();
      act(() => vi.advanceTimersByTime(3000));
      expect(screen.getByText("Lendo a imagem…")).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
      window.matchMedia = original;
    }
  });

  it("desmontar revoga a URL da foto", () => {
    simularServidor();
    const { container, unmount } = render(<Captura onResultado={() => {}} />);
    escolherFoto(container);
    unmount();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:foto");
  });
});

describe("Captura com câmera", () => {
  let liberar, trilha;
  beforeEach(() => {
    simularServidor();
    Object.defineProperty(window, "isSecureContext", { value: true, configurable: true });
    trilha = { stop: vi.fn() };
    vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue(); // o jsdom não toca vídeo
    const getUserMedia = vi.fn(
      () => new Promise((resolver) => (liberar = () => resolver({ getTracks: () => [trilha] })))
    );
    vi.stubGlobal("navigator", { mediaDevices: { getUserMedia } });
  });

  it("desmontar com a permissão pendente desliga a câmera", async () => {
    const { unmount } = render(<Captura onResultado={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: /usar câmera/i }));
    unmount();
    await act(async () => liberar());
    expect(trilha.stop).toHaveBeenCalled();
  });

  it("dois cliques rápidos pedem a câmera uma vez só", () => {
    render(<Captura onResultado={() => {}} />);
    const botao = screen.getByRole("button", { name: /usar câmera/i });
    fireEvent.click(botao);
    fireEvent.click(botao);
    expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledTimes(1);
  });

  it("abrir foca Tirar foto; fechar desliga e foca Usar câmera", async () => {
    render(<Captura onResultado={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: /usar câmera/i }));
    await act(async () => liberar());
    expect(screen.getByRole("button", { name: /tirar foto/i })).toHaveFocus();
    fireEvent.click(screen.getByRole("button", { name: /fechar câmera/i }));
    expect(trilha.stop).toHaveBeenCalled();
    expect(screen.getByRole("button", { name: /usar câmera/i })).toHaveFocus();
  });

  it("tirar foto antes do vídeo carregar pede para esperar", async () => {
    render(<Captura onResultado={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: /usar câmera/i }));
    await act(async () => liberar());
    fireEvent.click(screen.getByRole("button", { name: /tirar foto/i }));
    expect(screen.getByText("Espere a câmera abrir.")).toBeInTheDocument();
  });

  it("colar com a câmera aberta fecha a câmera e usa a foto colada", async () => {
    render(<Captura onResultado={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: /usar câmera/i }));
    await act(async () => liberar());
    fireEvent.paste(document, { clipboardData: { files: [new File(["x"], "c.png", { type: "image/png" })] } });
    expect(trilha.stop).toHaveBeenCalled();
    expect(screen.getByRole("img", { name: /foto escolhida/i })).toBeInTheDocument();
  });
});
