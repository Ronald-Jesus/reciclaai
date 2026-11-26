import { render, screen, fireEvent, within } from "@testing-library/react";
import { describe, it, expect, vi, afterEach } from "vitest";
import gsap from "gsap";
import Simulador from "./Simulador.jsx";

function menosAnimacao(matches) {
  window.matchMedia = vi.fn().mockImplementation((q) => ({
    matches, media: q, addEventListener: vi.fn(), removeEventListener: vi.fn(),
  }));
}

// O número que se vê (animado, escondido do leitor) e o que o leitor de tela anuncia.
function saida(container, rotulo) {
  const card = [...container.querySelectorAll(".saida")].find((c) => c.querySelector(".saida__rotulo").textContent === rotulo);
  return {
    visto: card.querySelector(".saida__valor [aria-hidden]").textContent,
    lido: card.querySelector(".saida__valor .sr-only").textContent,
  };
}

describe("Simulador", () => {
  afterEach(() => vi.restoreAllMocks());

  it("começa com a conta do protótipo e mostra a nota com os valores pagos", () => {
    menosAnimacao(true);
    const { container } = render(<Simulador />);
    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent("Faça a conta do seu local.");
    expect(saida(container, "Embalagens por mês")).toEqual({ visto: "45.000", lido: "45.000" });
    expect(saida(container, "Crédito que volta ao caixa").lido).toBe("R$ 5.850");
    expect(saida(container, "Em um ano").lido).toBe("540.000");
    const nota = container.querySelector("#sim-nota");
    expect(nota).toHaveTextContent(
      "Conta: pessoas × quantas trazem × embalagens × 30 dias. Valores por embalagem: PET R$ 0,10, lata R$ 0,15, vidro R$ 0,25. É uma simulação, não uma promessa."
    );
    expect(container.querySelector("form")).toHaveAttribute("aria-describedby", "sim-nota");
    expect(container.querySelector(".sim__saidas")).toHaveAttribute("aria-live", "polite");
  });

  it("os três controles têm rótulo, limites do protótipo e valor anunciado", () => {
    menosAnimacao(true);
    render(<Simulador />);
    const pessoas = screen.getByRole("slider", { name: "Pessoas por dia no local" });
    const trazem = screen.getByRole("slider", { name: "Quantas trazem embalagens" });
    const por = screen.getByRole("slider", { name: "Embalagens por pessoa" });
    expect([pessoas.min, pessoas.max, pessoas.step, pessoas.value]).toEqual(["100", "5000", "50", "1500"]);
    expect([trazem.min, trazem.max, trazem.step, trazem.value]).toEqual(["5", "60", "1", "20"]);
    expect([por.min, por.max, por.step, por.value]).toEqual(["1", "20", "1", "5"]);
    expect(pessoas).toHaveAttribute("aria-valuetext", "1.500 pessoas");
    expect(trazem).toHaveAttribute("aria-valuetext", "20%");
    expect(screen.getByText("20%", { selector: "output" })).toBeInTheDocument();
  });

  it("mexer num controle muda o resultado", () => {
    menosAnimacao(true);
    const { container } = render(<Simulador />);
    const pessoas = screen.getByRole("slider", { name: "Pessoas por dia no local" });
    fireEvent.change(pessoas, { target: { value: "3000" } });
    // 3000 × 20% × 5 × 30 = 90.000; × 0,13 = R$ 11.700.
    expect(pessoas).toHaveAttribute("aria-valuetext", "3.000 pessoas");
    expect(screen.getByText("3.000", { selector: "output" })).toBeInTheDocument();
    expect(saida(container, "Embalagens por mês").lido).toBe("90.000");
    expect(saida(container, "Crédito que volta ao caixa").visto).toBe("R$ 11.700");
    expect(saida(container, "Em um ano").lido).toBe("1.080.000");
  });

  it("a mistura muda o crédito e o texto, com clique e com setas", () => {
    menosAnimacao(true);
    const { container } = render(<Simulador />);
    const grupo = screen.getByRole("radiogroup", { name: "Mistura de embalagens" });
    const [pet, igual, vidro] = within(grupo).getAllByRole("radio");
    expect(pet).toHaveAttribute("aria-checked", "true");
    expect(screen.getByText("60% PET, 30% lata, 10% vidro")).toBeInTheDocument();

    fireEvent.click(vidro);
    expect(vidro).toHaveAttribute("aria-checked", "true");
    expect(pet).toHaveAttribute("aria-checked", "false");
    expect(saida(container, "Crédito que volta ao caixa").lido).toBe("R$ 9.000");
    expect(screen.getByText("20% PET, 20% lata, 60% vidro")).toBeInTheDocument();

    fireEvent.keyDown(vidro, { key: "ArrowRight" });
    expect(pet).toHaveAttribute("aria-checked", "true");
    expect(pet).toHaveFocus();
    fireEvent.keyDown(pet, { key: "ArrowRight" });
    expect(igual).toHaveAttribute("aria-checked", "true");
    expect(igual.tabIndex).toBe(0);
    expect(pet.tabIndex).toBe(-1);
    expect(saida(container, "Crédito que volta ao caixa").lido).toBe("R$ 7.500");
    expect(saida(container, "Embalagens por mês").lido).toBe("45.000");
  });

  it("os números sobem com GSAP do valor anterior até o novo", () => {
    menosAnimacao(false);
    const to = vi.spyOn(gsap, "to").mockImplementation(() => ({ kill: vi.fn() }));
    render(<Simulador />);
    to.mockClear();
    fireEvent.change(screen.getByRole("slider", { name: "Embalagens por pessoa" }), { target: { value: "10" } });
    const alvos = to.mock.calls.map(([, opcoes]) => opcoes.v);
    expect(alvos).toEqual(expect.arrayContaining([90000, 1080000]));
    expect(to.mock.calls.find(([, o]) => o.v === 90000)[0].v).toBe(45000);
  });

  it("com menos animação, não usa GSAP e mostra o número final", () => {
    menosAnimacao(true);
    const to = vi.spyOn(gsap, "to");
    const { container } = render(<Simulador />);
    fireEvent.change(screen.getByRole("slider", { name: "Embalagens por pessoa" }), { target: { value: "10" } });
    expect(to).not.toHaveBeenCalled();
    expect(saida(container, "Embalagens por mês").visto).toBe("90.000");
  });
});
