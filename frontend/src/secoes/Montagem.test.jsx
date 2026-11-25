import { render, screen, within } from "@testing-library/react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { PECAS } from "../maquina/pecas.js";
import Montagem, { rotuloProgresso, passoPorProgresso } from "./Montagem.jsx";

vi.mock("../maquina/quadros.js", async (original) => ({
  ...(await original()),
  existemQuadros: async () => false,
}));

function menosAnimacao(matches) {
  window.matchMedia = vi.fn().mockImplementation((q) => ({
    matches, media: q, addEventListener: vi.fn(), removeEventListener: vi.fn(),
  }));
}

describe("Montagem da máquina", () => {
  afterEach(() => vi.restoreAllMocks());

  it('rotuloProgresso(3, 9) === "3 de 9 peças"', () => {
    expect(rotuloProgresso(3, 9)).toBe("3 de 9 peças");
  });

  it("cada trecho da rolagem encaixa uma peça e a tela liga no fim", () => {
    expect(passoPorProgresso(0)).toEqual({ n: 0, ligada: false });
    expect(passoPorProgresso(0.5).n).toBe(5);
    expect(passoPorProgresso(0.92)).toEqual({ n: 9, ligada: false });
    expect(passoPorProgresso(1)).toEqual({ n: 9, ligada: true });
  });

  it("com menos animação mostra a máquina pronta (SVG) e a lista das 9 peças", () => {
    menosAnimacao(true);
    const criar = vi.spyOn(ScrollTrigger, "create");
    const { container } = render(<Montagem />);
    const secao = container.querySelector("#como-funciona");
    expect(secao).toHaveClass("palco", "palco--estatico");
    expect(criar).not.toHaveBeenCalled();
    expect(container.querySelectorAll("[data-peca]")).toHaveLength(9);
    expect(container.querySelector("svg text").textContent).toBe("Insira uma embalagem");
    const lista = screen.getByRole("list");
    expect(within(lista).getAllByRole("listitem").map((li) => li.querySelector("strong").textContent))
      .toEqual(PECAS.map((p) => p.nome));
    expect(lista.closest(".palco__lista")).not.toHaveClass("sr-only");
    expect(screen.getByText("9 de 9 peças")).toBeInTheDocument();
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "9");
  });

  it("com animação prende a seção e liga a rolagem à montagem, com a lista para leitor de tela", () => {
    menosAnimacao(false);
    const criar = vi.spyOn(ScrollTrigger, "create");
    const { container } = render(<Montagem />);
    expect(container.querySelector("#como-funciona")).not.toHaveClass("palco--estatico");
    const gatilho = criar.mock.calls.find(([cfg]) => cfg.pin)?.[0];
    expect(gatilho).toMatchObject({ pin: true, start: "top top" });
    expect(gatilho.scrub).toBeTruthy();
    expect(gatilho.trigger).toBe(container.querySelector(".palco__pin"));
    expect(screen.getByText("0 de 9 peças")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Só o contorno." })).toBeInTheDocument();
    expect(screen.getByRole("list").closest(".palco__lista")).toHaveClass("sr-only");
  });

  it("mostra os valores por embalagem e a regra dos 70%", () => {
    menosAnimacao(true);
    const { container } = render(<Montagem />);
    const tags = [...container.querySelectorAll(".palco__regras .rc-tag")].map((t) => t.textContent);
    expect(tags).toEqual(["Garrafa plásticaR$ 0,10", "LataR$ 0,15", "VidroR$ 0,25"]);
    expect(screen.getByText(/Abaixo de 70% de certeza/)).toBeInTheDocument();
  });
});
