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
