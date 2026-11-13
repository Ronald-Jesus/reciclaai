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
    expect(screen.queryByText(/de confiança/)).not.toBeInTheDocument();
  });

  it("mostra o material e a confiança", async () => {
    await analisar({
      prediction: { class: "plastic", confidence: 91.5 },
      nao_reconhecido: false,
      low_confidence: false,
    });
    expect(await screen.findByText("Plástico")).toBeInTheDocument();
    expect(screen.getByText(/91,5% de confiança/)).toBeInTheDocument();
  });

  it("o foco vai para o resultado e depois volta para a área da foto", async () => {
    await analisar({
      prediction: { class: "glass", confidence: 80 },
      nao_reconhecido: false,
      low_confidence: false,
    });
    expect(await screen.findByText("Vidro")).toHaveFocus();
    fireEvent.click(screen.getByRole("button", { name: /analisar outra foto/i }));
    expect(screen.getByRole("button", { name: /arraste uma foto aqui/i })).toHaveFocus();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:foto");
  });

  it("legenda das lixeiras sempre visível, antes de qualquer foto", () => {
    servidorQueResponde({});
    render(
      <MemoryRouter future={futuroDoRouter}>
        <LixeiraPessoal />
      </MemoryRouter>
    );
    const legenda = screen.getByRole("region", { name: /cores das lixeiras/i });
    for (const cor of ["azul", "verde", "amarela", "vermelha", "marrom", "cinza"]) {
      expect(within(legenda).getByText(new RegExp(`lixeira ${cor}`, "i"))).toBeInTheDocument();
    }
  });

  it("aceito mostra lixeira, top 3, valor e dica", async () => {
    await analisar(PET);
    await screen.findByRole("heading", { name: "Plástico" });
    const r = resultado("Plástico");
    expect(within(r).getByText(/lixeira vermelha/i)).toBeInTheDocument();
    expect(within(r).getAllByRole("listitem")).toHaveLength(3);
    expect(within(r).getByText(/R\$\s0,10/)).toBeInTheDocument();
    expect(within(r).getByText(/Esvazie e enxágue a garrafa/)).toBeInTheDocument();
  });

  it("recusado mostra o motivo e não deixa colocar na sacola", async () => {
    await analisar({
      ...PET,
      prediction: { class: "paper", confidence: 90 },
      machine: { accepted: false, value: 0, reason: "A máquina não aceita papel. Use a lixeira azul." },
    });
    await screen.findByText("Papel");
    const r = resultado("Papel");
    expect(within(r).getByText(/não aceita papel/)).toBeInTheDocument();
    expect(within(r).queryByText(/R\$/)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /colocar na sacola/i })).not.toBeInTheDocument();
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
    expect(within(r).getByText(/dicas para uma foto melhor/i)).toBeInTheDocument();
    expect(within(r).getByText(/chegue mais perto/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /colocar na sacola/i })).not.toBeInTheDocument();
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
    expect(within(r).getByText(/chegue mais perto/i)).toBeInTheDocument();
    expect(within(r).queryByText(/lixeira/i)).not.toBeInTheDocument();
    expect(within(r).queryByText(/R\$/)).not.toBeInTheDocument();
    expect(within(r).queryByText(/não é resíduo|plástico/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /colocar na sacola/i })).not.toBeInTheDocument();
  });

  it("sacola soma, remove com desfazer e guarda a foto", async () => {
    await analisar(PET);
    fireEvent.click(await screen.findByRole("button", { name: /colocar na sacola/i }));
    const sacola = screen.getByRole("region", { name: /sua sacola/i });
    expect(within(sacola).getByRole("img", { name: "Plástico" })).toHaveAttribute("src", "blob:foto");
    expect(within(sacola).getByText(/total estimado/i).parentElement).toHaveTextContent(/R\$\s0,10/);
    expect(within(sacola).getByText(/só existe quando você deposita/i)).toBeInTheDocument();

    // A foto está na sacola: trocar de foto não pode liberar a URL.
    fireEvent.click(screen.getByRole("button", { name: /analisar outra foto/i }));
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

  it("durante o Desfazer o resultado mostra 'Removido da sacola' e não duplica", async () => {
    await analisar(PET);
    fireEvent.click(await screen.findByRole("button", { name: /colocar na sacola/i }));
    const sacola = screen.getByRole("region", { name: /sua sacola/i });
    fireEvent.click(within(sacola).getByRole("button", { name: /remover plástico/i }));
    const botao = screen.getByRole("button", { name: /removido da sacola/i });
    fireEvent.click(botao);
    expect(within(sacola).queryByRole("img", { name: "Plástico" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /desfazer/i }));
    expect(within(sacola).getAllByRole("img", { name: "Plástico" })).toHaveLength(1);
    expect(screen.getByRole("button", { name: /está na sacola/i })).toBeInTheDocument();
  });
});
