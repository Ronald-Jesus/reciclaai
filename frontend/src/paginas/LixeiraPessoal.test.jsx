import { render, screen, fireEvent, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import LixeiraPessoal from "./LixeiraPessoal.jsx";
import { futuroDoRouter } from "../rotas.js";

function servidorQueResponde(corpo) {
  vi.stubGlobal(
    "fetch",
    vi.fn((url) =>
      Promise.resolve(
        new Response(JSON.stringify(url === "/api/status" ? { model_ready: true } : corpo), { status: 200 })
      )
    )
  );
}

async function analisar(corpo) {
  servidorQueResponde(corpo);
  const { container } = render(
    <MemoryRouter future={futuroDoRouter}>
      <LixeiraPessoal />
    </MemoryRouter>
  );
  const entrada = container.querySelector('input[type="file"]');
  fireEvent.change(entrada, { target: { files: [new File(["x"], "a.jpg", { type: "image/jpeg" })] } });
  fireEvent.click(screen.getByRole("button", { name: /analisar foto/i }));
}

beforeEach(() => {
  URL.createObjectURL = vi.fn(() => "blob:foto");
  URL.revokeObjectURL = vi.fn();
});
afterEach(() => vi.unstubAllGlobals());

const PET = {
  prediction: { class: "plastic", label: "Plástico", bin: "vermelha", confidence: 94 },
  ranking: [
    { class: "plastic", confidence: 94 },
    { class: "glass", confidence: 4 },
    { class: "metal", confidence: 2 },
  ],
  machine: { accepted: true, value: 0.1, reason: "Plástico aceito." },
  nao_reconhecido: false,
  low_confidence: false,
};

function resultado(nome) {
  return screen.getByRole("region", { name: nome });
}

describe("LixeiraPessoal", () => {
  it("nao_reconhecido mostra a mensagem certa, sem material", async () => {
    await analisar({
      prediction: { class: "nao_residuo", confidence: 88 },
      nao_reconhecido: true,
      low_confidence: false,
    });
    expect(await screen.findByText("Não reconheci uma embalagem nesta foto.")).toBeInTheDocument();
    expect(screen.queryByRole("progressbar", { name: "Confiança da IA" })).not.toBeInTheDocument();
  });

  it("mostra o material e a confiança", async () => {
    await analisar({
      prediction: { class: "plastic", confidence: 91.5 },
      nao_reconhecido: false,
      low_confidence: false,
    });
    expect(await screen.findByRole("heading", { name: "Plástico · lixeira vermelha" })).toBeInTheDocument();
    const barra = screen.getByRole("progressbar", { name: "Confiança da IA" });
    expect(barra).toHaveAttribute("aria-valuenow", "91.5");
    expect(screen.getByText("91,5%")).toBeInTheDocument();
  });

  it("o foco vai para o resultado e depois volta para a área da foto", async () => {
    await analisar({
      prediction: { class: "glass", confidence: 80 },
      nao_reconhecido: false,
      low_confidence: false,
    });
    expect(await screen.findByRole("heading", { name: /^Vidro/ })).toHaveFocus();
    fireEvent.click(screen.getByRole("button", { name: /fotografar outra/i }));
    expect(screen.getByRole("button", { name: /arraste uma foto aqui/i })).toHaveFocus();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:foto");
  });

  it("legenda das lixeiras abre num popup pelo botão Legenda, antes de qualquer foto", () => {
    servidorQueResponde({});
    render(
      <MemoryRouter future={futuroDoRouter}>
        <LixeiraPessoal />
      </MemoryRouter>
    );
    const botao = screen.getByRole("button", { name: "Legenda" });
    fireEvent.click(botao);
    const legenda = screen.getByRole("dialog", { name: /cores das lixeiras/i });
    expect(legenda).toHaveAttribute("open");
    expect(legenda).toHaveFocus();
    for (const cor of ["azul", "verde", "amarela", "vermelha", "marrom", "cinza"]) {
      expect(within(legenda).getByText(new RegExp(`lixeira ${cor}`, "i"))).toBeInTheDocument();
    }

    // Fechar devolve o foco ao botão; Esc e clique fora também fecham.
    fireEvent.click(within(legenda).getByRole("button", { name: /fechar/i }));
    expect(legenda).not.toHaveAttribute("open");
    expect(botao).toHaveFocus();
    fireEvent.click(botao);
    fireEvent.keyDown(legenda, { key: "Escape" });
    expect(legenda).not.toHaveAttribute("open");
    expect(botao).toHaveFocus();
    fireEvent.click(botao);
    fireEvent.click(legenda); // o próprio <dialog> só recebe o clique no fundo, fora do cartão
    expect(legenda).not.toHaveAttribute("open");
  });

  it("aceito mostra lixeira, top 3, valor e dica", async () => {
    await analisar(PET);
    await screen.findByRole("heading", { name: "Plástico · lixeira vermelha · 94%" });
    const r = resultado(/^Plástico/);
    const tag = r.querySelector(".rc-tag.rc-tag--plastico");
    expect(tag).toHaveTextContent(/Plástico/);
    expect(tag).toHaveTextContent(/Lixeira vermelha/);
    expect(within(r).getByText(/Vale R\$\s0,10/)).toBeInTheDocument();
    expect(within(r).getByText(/na máquina/)).toBeInTheDocument();
    expect(within(r).getByRole("progressbar", { name: "Confiança da IA" })).toHaveAttribute("aria-valuenow", "94");
    // Top 3 dentro de "Por que a IA decidiu isso?"
    const porQue = within(r).getByText("Por que a IA decidiu isso?").closest("details");
    expect(within(porQue).getAllByRole("listitem")).toHaveLength(3);
    expect(within(r).getByText(/Esvazie e enxágue a garrafa/)).toBeInTheDocument();
  });

  it("recusado mostra o motivo e não deixa colocar na sacola", async () => {
    await analisar({
      ...PET,
      prediction: { class: "paper", confidence: 90 },
      machine: { accepted: false, value: 0, reason: "A máquina não aceita papel. Use a lixeira azul." },
    });
    await screen.findByRole("heading", { name: "Papel · lixeira azul" });
    const r = resultado(/^Papel/);
    expect(within(r).getByRole("heading", { name: "A máquina não aceita este item." })).toBeInTheDocument();
    expect(within(r).getByText(/Ela recebe só plástico \(PET\), lata e vidro\. A máquina não aceita papel/)).toBeInTheDocument();
    expect(within(r).queryByText(/R\$/)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /adicionar à sacola/i })).not.toBeInTheDocument();

    // "Ver legenda das lixeiras" abre o popup da legenda.
    fireEvent.click(within(r).getByRole("button", { name: /ver legenda das lixeiras/i }));
    expect(screen.getByRole("dialog", { name: /cores das lixeiras/i })).toHaveAttribute("open");
  });

  it("confiança baixa mostra dicas de foto", async () => {
    await analisar({
      ...PET,
      prediction: { class: "plastic", confidence: 52 },
      machine: { accepted: false, value: 0, reason: "Não reconheci uma embalagem nesta foto." },
      nao_reconhecido: true,
      low_confidence: true,
    });
    await screen.findByText("Não reconheci uma embalagem nesta foto.");
    const r = resultado(/não reconheci/i);
    expect(within(r).getByText(/dicas para uma boa foto/i)).toBeInTheDocument();
    expect(within(r).getByText(/chegue perto/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /adicionar à sacola/i })).not.toBeInTheDocument();
  });

  it('nao_reconhecido mostra "Não reconheci uma embalagem" sem material, valor nem lixeira', async () => {
    await analisar({
      prediction: { class: "nao_residuo", confidence: 88 },
      ranking: [{ class: "nao_residuo", confidence: 88 }],
      machine: { accepted: false, value: 0, reason: "Não reconheci uma embalagem nesta foto." },
      nao_reconhecido: true,
      low_confidence: false,
    });
    await screen.findByText("Não reconheci uma embalagem nesta foto.");
    const r = resultado(/não reconheci/i);
    expect(within(r).getByText(/chegue perto/i)).toBeInTheDocument();
    expect(within(r).queryByText(/lixeira/i)).not.toBeInTheDocument();
    expect(within(r).queryByText(/R\$/)).not.toBeInTheDocument();
    expect(within(r).queryByText(/não é resíduo|plástico/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /adicionar à sacola/i })).not.toBeInTheDocument();
  });

  it("sacola soma, remove com desfazer e guarda a foto", async () => {
    await analisar(PET);
    fireEvent.click(await screen.findByRole("button", { name: /adicionar à sacola/i }));
    const sacola = screen.getByRole("region", { name: /sua sacola/i });
    expect(within(sacola).getByRole("img", { name: "Plástico" })).toHaveAttribute("src", "blob:foto");
    expect(within(sacola).getByText(/total estimado/i).parentElement).toHaveTextContent(/R\$\s0,10/);
    expect(within(sacola).getByText(/só existe quando você deposita/i)).toBeInTheDocument();

    // A foto está na sacola: trocar de foto não pode liberar a URL.
    fireEvent.click(screen.getByRole("button", { name: /fotografar outra/i }));
    expect(URL.revokeObjectURL).not.toHaveBeenCalled();

    fireEvent.click(within(sacola).getByRole("button", { name: /remover plástico/i }));
    expect(within(sacola).queryByRole("img", { name: "Plástico" })).not.toBeInTheDocument();
    const desfazer = screen.getByRole("button", { name: /desfazer/i });
    expect(desfazer).toHaveFocus();
    fireEvent.click(desfazer);
    expect(within(sacola).getByRole("img", { name: "Plástico" })).toBeInTheDocument();

    // Esvaziar remove de vez: agora a URL é liberada.
    fireEvent.click(within(sacola).getByRole("button", { name: /esvaziar sacola/i }));
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:foto");
    expect(screen.getByRole("heading", { name: "Sua sacola" })).toHaveFocus();
  });

  it("unidades iguais viram uma linha com quantidade; − e + mudam a quantidade; a URL só é liberada quando nenhum item a usa", async () => {
    await analisar(PET);
    fireEvent.click(await screen.findByRole("button", { name: /adicionar à sacola/i }));
    fireEvent.click(screen.getByRole("button", { name: /adicionar mais um/i }));
    fireEvent.click(screen.getByRole("button", { name: /adicionar mais um/i }));
    const sacola = screen.getByRole("region", { name: /sua sacola/i });
    const linha = within(sacola).getByRole("listitem");
    expect(within(sacola).getAllByRole("listitem")).toHaveLength(1);
    expect(linha).toHaveTextContent("Plástico × 3");
    expect(within(linha).getByText(/R\$\s0,30/)).toBeInTheDocument();
    expect(within(sacola).getByText(/total estimado/i).parentElement).toHaveTextContent(/R\$\s0,30/);
    expect(screen.getByRole("link", { name: "Sacola, 3 itens" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /fotografar outra/i }));
    fireEvent.click(within(linha).getByRole("button", { name: /tirar uma unidade de plástico/i }));
    expect(linha).toHaveTextContent("Plástico × 2");
    expect(screen.getByRole("link", { name: "Sacola, 2 itens" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /desfazer/i }));
    expect(linha).toHaveTextContent("Plástico × 3");
    fireEvent.click(within(linha).getByRole("button", { name: /pôr mais uma unidade de plástico/i }));
    expect(linha).toHaveTextContent("Plástico × 4");
    expect(within(sacola).getByText(/total estimado/i).parentElement).toHaveTextContent(/R\$\s0,40/);
    fireEvent.click(within(linha).getByRole("button", { name: /tirar uma unidade de plástico/i }));
    expect(URL.revokeObjectURL).not.toHaveBeenCalled(); // as outras unidades ainda usam a foto
    fireEvent.click(within(sacola).getByRole("button", { name: /esvaziar sacola/i }));
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:foto");
  });

  it("ao adicionar mostra o snackbar; Ver sacola leva o foco à sacola", async () => {
    await analisar(PET);
    fireEvent.click(await screen.findByRole("button", { name: /adicionar à sacola/i }));
    expect(screen.getByText("Adicionada à sacola")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Ver sacola" }));
    expect(screen.getByRole("heading", { name: "Sua sacola" })).toHaveFocus();
  });

  it("sacola: item com tag e valor; vazia com ícone; Fotografar mais volta para a captura", async () => {
    await analisar(PET);
    const sacola = screen.getByRole("region", { name: /sua sacola/i });
    expect(within(sacola).getByText("Sua sacola está vazia.")).toBeInTheDocument();
    expect(within(sacola).getByText("shopping_bag")).toBeInTheDocument();
    expect(within(sacola).getByText("a receber na máquina", { selector: ".lx-total__sufixo" })).toBeInTheDocument();

    fireEvent.click(await screen.findByRole("button", { name: /adicionar à sacola/i }));
    const item = within(sacola).getByRole("listitem");
    expect(item.querySelector(".rc-tag--plastico")).toHaveTextContent(/Lixeira vermelha/);
    expect(item).toHaveTextContent("Plástico × 1");
    expect(within(item).getByText(/R\$\s0,10/)).toBeInTheDocument();

    fireEvent.click(within(sacola).getByRole("button", { name: /fotografar mais/i }));
    expect(screen.getByRole("button", { name: /arraste uma foto aqui/i })).toHaveFocus();
  });

  it("barra inferior do celular: Fotografar, Sacola (com contagem) e Mapa levam às seções", async () => {
    await analisar(PET);
    const barra = screen.getByRole("navigation", { name: "Seções da lixeira" });
    const links = within(barra).getAllByRole("link");
    expect(links.map((l) => l.getAttribute("href"))).toEqual(["#fotografar", "#sacola", "#mapa"]);
    for (const id of ["fotografar", "sacola", "mapa"]) expect(document.getElementById(id)).not.toBeNull();
    expect(within(barra).getByRole("link", { name: "Fotografar" })).toHaveAttribute("aria-current", "location");
    expect(within(barra).getByRole("link", { name: "Sacola, 0 itens" })).toBeInTheDocument();
    fireEvent.click(await screen.findByRole("button", { name: /adicionar à sacola/i }));
    const sacolaLink = within(barra).getByRole("link", { name: "Sacola, 1 item" });
    expect(sacolaLink).toHaveTextContent("1");
    expect(screen.queryByRole("button", { name: /sua sacola:/i })).not.toBeInTheDocument();
  });

  it("legenda diz quanto a máquina paga por lixeira", () => {
    servidorQueResponde({});
    render(
      <MemoryRouter future={futuroDoRouter}>
        <LixeiraPessoal />
      </MemoryRouter>
    );
    fireEvent.click(screen.getByRole("button", { name: "Legenda" }));
    const legenda = screen.getByRole("dialog", { name: /cores das lixeiras/i });
    const linha = (cor) => within(legenda).getByText(new RegExp(`lixeira ${cor}`, "i")).closest("li");
    expect(linha("vermelha")).toHaveTextContent(/Máquina paga · R\$\s0,10/);
    expect(linha("amarela")).toHaveTextContent(/Máquina paga · R\$\s0,15/);
    expect(linha("verde")).toHaveTextContent(/Máquina paga · R\$\s0,25/);
    for (const cor of ["azul", "marrom", "cinza"]) expect(linha(cor)).toHaveTextContent("Máquina não aceita");
    expect(within(legenda).getByText("A máquina aceita plástico, metal e vidro.")).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------- depósito na máquina (#47)
const ACEITO = { accepted: true, reason: "Embalagem aceita!", value: 0.1, balance: 0.1, nao_reconhecido: false, prediction: { class: "plastic" } };
const RECUSADO = { accepted: false, reason: "Não reconheci uma embalagem nesta foto.", value: 0, balance: 0.1, nao_reconhecido: true, prediction: { class: "nao_residuo" } };

// Servidor falso: /predict devolve PET; a sessão responde na ordem de `insercoes`.
function servidorDaMaquina({ insercoes = [], fim = { voucher: "RVM-ABC123-DEF456", amount: 0.2, items: [] }, sessao } = {}) {
  const fila = [...insercoes];
  const json = (corpo, status = 200) => Promise.resolve(new Response(JSON.stringify(corpo), { status }));
  const f = vi.fn((url, opcoes) => {
    if (url === "/api/status") return json({ model_ready: true });
    if (url === "/predict") return json(PET);
    if (url.startsWith("blob:")) return Promise.resolve(new Response(new Blob(["x"], { type: "image/jpeg" })));
    if (url === "/api/session") return sessao ? sessao(opcoes) : json({ session_id: "s1" });
    if (url === "/api/session/s1/insert") {
      const r = fila.shift();
      return typeof r === "function" ? r(opcoes) : json(r);
    }
    if (url === "/api/session/s1/finish") return json(fim);
    return json({ error: "rota desconhecida" }, 404);
  });
  vi.stubGlobal("fetch", f);
  return f;
}

async function sacolaCom(n, servidor) {
  servidorDaMaquina(servidor);
  const { container } = render(
    <MemoryRouter future={futuroDoRouter}>
      <LixeiraPessoal />
    </MemoryRouter>
  );
  fireEvent.change(container.querySelector('input[type="file"]'), {
    target: { files: [new File(["x"], "a.jpg", { type: "image/jpeg" })] },
  });
  fireEvent.click(screen.getByRole("button", { name: /analisar foto/i }));
  fireEvent.click(await screen.findByRole("button", { name: /adicionar à sacola/i }));
  for (let i = 1; i < n; i += 1) fireEvent.click(screen.getByRole("button", { name: /adicionar mais um/i }));
  return screen.getByRole("region", { name: /sua sacola/i });
}

describe("Cheguei na máquina", () => {
  it("sem itens na sacola o botão não aparece", () => {
    servidorDaMaquina();
    render(
      <MemoryRouter future={futuroDoRouter}>
        <LixeiraPessoal />
      </MemoryRouter>
    );
    expect(screen.queryByRole("button", { name: /cheguei na máquina/i })).not.toBeInTheDocument();
    expect(screen.getByText(/adicione ao menos uma embalagem para usar a máquina/i)).toBeInTheDocument();
  });

  it("confere item a item no servidor, mostra o voucher e esvazia a sacola", async () => {
    await sacolaCom(2, { insercoes: [ACEITO, { ...ACEITO, balance: 0.2 }] });
    fireEvent.click(screen.getByRole("button", { name: /cheguei na máquina/i }));

    const deposito = screen.getByRole("region", { name: /conferindo na máquina/i });
    expect(screen.getByRole("heading", { name: /conferindo na máquina/i })).toHaveFocus();
    const voucher = await within(deposito).findByRole("article", { name: /voucher reciclaai/i });
    expect(within(voucher).getByText("RVM-ABC123-DEF456")).toBeInTheDocument();
    expect(voucher).toHaveTextContent(/R\$\s0,20/);
    expect(within(deposito).getAllByText("Aceito")).toHaveLength(2);
    expect(within(deposito).getByText("2 de 2")).toBeInTheDocument();
    expect(within(deposito).getByRole("progressbar")).toHaveAttribute("aria-valuenow", "100");
    expect(within(deposito).getByText("Conferência concluída")).toBeInTheDocument();

    // Uma foto por unidade foi enviada no campo "image"; depois a sessão foi encerrada.
    const chamadas = fetch.mock.calls.map(([url]) => url);
    expect(chamadas.filter((u) => u === "/api/session/s1/insert")).toHaveLength(2);
    expect(chamadas.at(-1)).toBe("/api/session/s1/finish");
    const corpo = fetch.mock.calls.find(([u]) => u === "/api/session/s1/insert")[1].body;
    expect(corpo.get("image")).toBeInstanceOf(Blob);

    expect(screen.getByRole("link", { name: "Sacola, 0 itens" })).toBeInTheDocument();
    expect(URL.revokeObjectURL).not.toHaveBeenCalled(); // a conferência ainda mostra as fotos

    fireEvent.click(within(deposito).getByRole("button", { name: /fotografar outra embalagem/i }));
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:foto");
    expect(screen.queryByRole("region", { name: /conferindo na máquina/i })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /arraste uma foto aqui/i })).toHaveFocus();
  });

  it("a máquina pode devolver um item que a lixeira estimou como aceito", async () => {
    await sacolaCom(2, {
      insercoes: [ACEITO, RECUSADO],
      fim: { voucher: "RVM-111111-222222", amount: 0.1, items: [] },
    });
    fireEvent.click(screen.getByRole("button", { name: /cheguei na máquina/i }));
    const deposito = screen.getByRole("region", { name: /conferindo na máquina/i });
    await within(deposito).findByRole("article", { name: /voucher reciclaai/i });
    expect(within(deposito).getByText("Aceito")).toBeInTheDocument();
    expect(within(deposito).getByText(/devolvido/i)).toHaveTextContent(/Não reconheci uma embalagem nesta foto/);
    // O item devolvido volta para a sacola; o aceito sai.
    expect(screen.getByRole("link", { name: "Sacola, 1 item" })).toBeInTheDocument();
  });

  it("sem nada aceito não há voucher nem botão de copiar", async () => {
    await sacolaCom(1, { insercoes: [RECUSADO], fim: { voucher: null, amount: 0, items: [] } });
    fireEvent.click(screen.getByRole("button", { name: /cheguei na máquina/i }));
    const deposito = screen.getByRole("region", { name: /conferindo na máquina/i });
    expect(await within(deposito).findByText("Sem voucher desta vez")).toBeInTheDocument();
    expect(within(deposito).getByRole("article", { name: /nenhuma embalagem aceita/i })).toBeInTheDocument();
    expect(within(deposito).queryByRole("button", { name: /copiar código/i })).not.toBeInTheDocument();
  });

  it("erro 503 mostra a mensagem do servidor e não perde a sacola", async () => {
    const msg = "O modelo ainda não foi treinado neste servidor. Rode 'python treino.py' e reinicie.";
    await sacolaCom(2, {
      insercoes: [() => Promise.resolve(new Response(JSON.stringify({ error: msg }), { status: 503 }))],
    });
    fireEvent.click(screen.getByRole("button", { name: /cheguei na máquina/i }));
    const deposito = screen.getByRole("region", { name: /conferindo na máquina/i });
    expect(await within(deposito).findByRole("alert")).toHaveTextContent(msg);
    expect(within(deposito).getByRole("alert")).toHaveTextContent(/sua sacola continua igual/i);
    expect(fetch.mock.calls.some(([u]) => u.endsWith("/finish"))).toBe(false);
    expect(URL.revokeObjectURL).not.toHaveBeenCalled();

    fireEvent.click(within(deposito).getByRole("button", { name: /voltar para a sacola/i }));
    const sacola = screen.getByRole("region", { name: /sua sacola/i });
    expect(within(sacola).getByRole("listitem")).toHaveTextContent("Plástico × 2");
    expect(screen.getByRole("heading", { name: "Sua sacola" })).toHaveFocus();
  });

  it("sem conexão também avisa e mantém a sacola", async () => {
    await sacolaCom(1, { sessao: () => Promise.reject(new TypeError("Failed to fetch")) });
    fireEvent.click(screen.getByRole("button", { name: /cheguei na máquina/i }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/não consegui falar com a máquina/i);
    expect(screen.getByRole("link", { name: "Sacola, 1 item" })).toBeInTheDocument();
  });

  it("cancelar no meio para a conferência e mantém a sacola", async () => {
    let sinal;
    await sacolaCom(2, {
      insercoes: [
        (opcoes) => {
          sinal = opcoes.signal;
          return new Promise((_, rejeitar) =>
            opcoes.signal.addEventListener("abort", () => rejeitar(new DOMException("cancelado", "AbortError")))
          );
        },
      ],
    });
    fireEvent.click(screen.getByRole("button", { name: /cheguei na máquina/i }));
    const deposito = screen.getByRole("region", { name: /conferindo na máquina/i });
    await vi.waitFor(() => expect(sinal).toBeDefined());
    fireEvent.click(within(deposito).getByRole("button", { name: /cancelar/i }));
    expect(sinal.aborted).toBe(true);
    expect(screen.queryByRole("region", { name: /conferindo na máquina/i })).not.toBeInTheDocument();
    expect(within(screen.getByRole("region", { name: /sua sacola/i })).getByRole("listitem")).toHaveTextContent("Plástico × 2");
    expect(fetch.mock.calls.some(([u]) => u.endsWith("/finish"))).toBe(false);
  });

  it("Copiar código usa a área de transferência e avisa; se falhar, mostra como copiar", async () => {
    const escrever = vi.fn(() => Promise.resolve());
    Object.defineProperty(navigator, "clipboard", { value: { writeText: escrever }, configurable: true });
    await sacolaCom(1, { insercoes: [ACEITO], fim: { voucher: "RVM-ABC123-DEF456", amount: 0.1, items: [] } });
    fireEvent.click(screen.getByRole("button", { name: /cheguei na máquina/i }));
    const copiar = await screen.findByRole("button", { name: /copiar código/i });
    fireEvent.click(copiar);
    expect(escrever).toHaveBeenCalledWith("RVM-ABC123-DEF456");
    expect(await screen.findByText("Código copiado")).toBeInTheDocument();

    escrever.mockImplementation(() => Promise.reject(new Error("negado")));
    document.execCommand = vi.fn(() => false);
    fireEvent.click(copiar);
    expect(await screen.findByText(/não deu para copiar/i)).toBeInTheDocument();
    delete navigator.clipboard;
  });
});
