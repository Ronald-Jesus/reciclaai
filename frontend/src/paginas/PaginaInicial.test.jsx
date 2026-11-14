import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect, vi, afterEach } from "vitest";
import gsap from "gsap";
import PaginaInicial from "./PaginaInicial.jsx";
import { futuroDoRouter } from "../rotas.js";

const TITULO = "Embalagem devolvida é cliente de volta.";

function menosAnimacao(matches) {
  window.matchMedia = vi.fn().mockImplementation((q) => ({
    matches, media: q, addEventListener: vi.fn(), removeEventListener: vi.fn(),
  }));
}

function renderizar() {
  return render(
    <MemoryRouter future={futuroDoRouter}>
      <PaginaInicial />
    </MemoryRouter>
  );
}

describe("Página inicial: hero", () => {
  afterEach(() => vi.restoreAllMocks());

  it("tem o link 'Role para ver' para o problema", () => {
    menosAnimacao(true);
    renderizar();
    const link = screen.getByRole("link", { name: /role para ver/i });
    expect(link).toHaveAttribute("href", "#problema");
    expect(link).toHaveTextContent("south");
  });

  it("tem a frase em cartão e uma ação só: 'Ver a máquina por dentro'", () => {
    menosAnimacao(true);
    const { container } = renderizar();
    const hero = container.querySelector(".hero");
    expect(within(hero).getByText(/Seu cliente traz o que ia para o lixo e sai com crédito/)).toHaveClass("hero__lead");
    const acoes = within(hero.querySelector(".hero__acoes")).getAllByRole("link");
    expect(acoes.map((a) => a.textContent)).toEqual(["Ver a máquina por dentro"]);
    expect(acoes[0]).toHaveAttribute("href", "#como-funciona");
    expect(within(hero).queryByRole("link", { name: /testar o app|por que funciona/i })).not.toBeInTheDocument();
  });

  it("o título entra palavra por palavra e o leitor de tela lê a frase inteira", () => {
    menosAnimacao(false);
    const from = vi.spyOn(gsap, "from");
    const { container } = renderizar();
    expect(screen.getByRole("heading", { level: 1, name: TITULO })).toBeInTheDocument();
    const palavras = container.querySelectorAll(".hero__titulo .split-w > span");
    expect(palavras).toHaveLength(TITULO.split(" ").length);
    expect(from.mock.calls.some(([alvo]) => alvo?.length === palavras.length)).toBe(true);
    const entra = (classe) => from.mock.calls.some(([alvo]) => [...(alvo ?? [])].some((el) => el.classList?.contains(classe)));
    expect(entra("hero__acoes")).toBe(true);
    expect(entra("hero__lead")).toBe(true);
  });

  it("com menos animação o título fica parado e inteiro", () => {
    menosAnimacao(true);
    const from = vi.spyOn(gsap, "from");
    const { container } = renderizar();
    expect(screen.getByRole("heading", { level: 1, name: TITULO })).toHaveTextContent(TITULO);
    expect(container.querySelector(".split-w")).toBeNull();
    expect(from).not.toHaveBeenCalled();
  });
});
