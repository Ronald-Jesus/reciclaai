import { render, screen } from "@testing-library/react";
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

  it("tem o botão 'Por que funciona' para o contraste", () => {
    menosAnimacao(true);
    renderizar();
    expect(screen.getByRole("link", { name: "Por que funciona" })).toHaveAttribute("href", "#contraste");
  });

  it("o título entra palavra por palavra e o leitor de tela lê a frase inteira", () => {
    menosAnimacao(false);
    const from = vi.spyOn(gsap, "from");
    const { container } = renderizar();
    expect(screen.getByRole("heading", { level: 1, name: TITULO })).toBeInTheDocument();
    const palavras = container.querySelectorAll(".hero__titulo .split-w > span");
    expect(palavras).toHaveLength(TITULO.split(" ").length);
    expect(from.mock.calls.some(([alvo]) => alvo?.length === palavras.length)).toBe(true);
    expect(from.mock.calls.some(([alvo]) => [...(alvo ?? [])].some((el) => el.classList?.contains("hero__acoes")))).toBe(true);
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
