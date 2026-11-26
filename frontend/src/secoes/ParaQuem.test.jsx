import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, afterEach } from "vitest";
import gsap from "gsap";
import ParaQuem from "./ParaQuem.jsx";

function menosAnimacao(matches) {
  window.matchMedia = vi.fn().mockImplementation((q) => ({
    matches, media: q, addEventListener: vi.fn(), removeEventListener: vi.fn(),
  }));
}

const visivel = () => screen.getByRole("tabpanel");

describe("Para quem", () => {
  afterEach(() => vi.restoreAllMocks());

  it("tem as quatro abas do protótipo, com Supermercados aberta", () => {
    menosAnimacao(true);
    render(<ParaQuem />);
    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent("Onde a máquina se paga.");
    const lista = screen.getByRole("tablist", { name: "Tipo de local" });
    const abas = screen.getAllByRole("tab");
    expect(lista).toContainElement(abas[0]);
    expect(abas.map((a) => a.textContent.replace("check", ""))).toEqual(["Supermercados", "Condomínios", "Escolas", "Eventos"]);
    expect(abas.map((a) => a.getAttribute("aria-selected"))).toEqual(["true", "false", "false", "false"]);
    expect(abas.map((a) => a.tabIndex)).toEqual([0, -1, -1, -1]);
    expect(visivel()).toHaveAttribute("aria-labelledby", abas[0].id);
    expect(abas[0]).toHaveAttribute("aria-controls", visivel().id);
    expect(visivel()).toHaveTextContent("O voucher só vale no seu caixa. O crédito volta como venda.");
    expect(visivel()).toHaveTextContent("Quem traz embalagem tem um motivo a mais para voltar à loja.");
  });

  it("o clique troca a aba e o painel", () => {
    menosAnimacao(true);
    render(<ParaQuem />);
    fireEvent.click(screen.getByRole("tab", { name: "Escolas" }));
    expect(screen.getByRole("tab", { name: "Escolas" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tab", { name: "Supermercados" })).toHaveAttribute("aria-selected", "false");
    expect(screen.getAllByRole("tabpanel")).toHaveLength(1);
    expect(visivel()).toHaveTextContent("Escolas e universidades");
    expect(visivel()).toHaveTextContent("A máquina vira aula: o aluno vê a câmera decidir o material.");
    expect(visivel()).toHaveTextContent("O voucher pode virar crédito na cantina.");
  });

  it("setas, Home e End trocam a aba e movem o foco", () => {
    menosAnimacao(true);
    render(<ParaQuem />);
    const [mercado, condominio, , evento] = screen.getAllByRole("tab");
    fireEvent.keyDown(mercado, { key: "ArrowRight" });
    expect(condominio).toHaveAttribute("aria-selected", "true");
    expect(condominio).toHaveFocus();
    expect(visivel()).toHaveTextContent("Menos garrafa misturada no lixo comum.");
    expect(visivel()).toHaveTextContent("Material já separado e compactado: a coleta busca menos vezes.");
    fireEvent.keyDown(condominio, { key: "ArrowLeft" });
    fireEvent.keyDown(mercado, { key: "ArrowLeft" });
    expect(evento).toHaveAttribute("aria-selected", "true");
    expect(visivel()).toHaveTextContent("Lata no chão vira fila na máquina. Menos limpeza no fim.");
    expect(visivel()).toHaveTextContent("O crédito é gasto em bebida no próprio evento.");
    fireEvent.keyDown(evento, { key: "Home" });
    expect(mercado).toHaveFocus();
    fireEvent.keyDown(mercado, { key: "End" });
    expect(evento).toHaveFocus();
  });

  it("o painel novo entra com GSAP ao trocar de aba", () => {
    menosAnimacao(false);
    const fromTo = vi.spyOn(gsap, "fromTo").mockImplementation(() => ({}));
    render(<ParaQuem />);
    expect(fromTo).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("tab", { name: "Eventos" }));
    expect(fromTo).toHaveBeenCalledTimes(1);
    expect(fromTo.mock.calls[0][0]).toBe(visivel());
  });

  it("com menos animação, troca sem GSAP", () => {
    menosAnimacao(true);
    const fromTo = vi.spyOn(gsap, "fromTo");
    render(<ParaQuem />);
    fireEvent.click(screen.getByRole("tab", { name: "Eventos" }));
    expect(fromTo).not.toHaveBeenCalled();
    expect(visivel()).toHaveTextContent("Eventos");
  });
});
