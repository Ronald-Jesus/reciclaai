import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect, vi, afterEach } from "vitest";
import Fechamento from "./Fechamento.jsx";
import { futuroDoRouter } from "../rotas.js";

function renderizar(menosAnimacao) {
  window.matchMedia = vi.fn().mockImplementation((q) => ({
    matches: q.includes("reduced-motion") && menosAnimacao, media: q, addEventListener: vi.fn(), removeEventListener: vi.fn(),
  }));
  render(<MemoryRouter future={futuroDoRouter}><Fechamento /></MemoryRouter>);
  return screen.getByRole("link", { name: /abrir a lixeira pessoal/i });
}

describe("Fechamento", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    document.querySelectorAll(".lx-faisca").forEach((s) => s.remove());
  });

  it("leva para a lixeira pessoal", () => {
    expect(renderizar(false)).toHaveAttribute("href", "/lixeira");
  });

  it("solta faíscas no clique", () => {
    fireEvent.click(renderizar(false));
    expect(document.querySelectorAll(".lx-faisca")).toHaveLength(10);
  });

  it("com menos animação não solta faíscas", () => {
    fireEvent.click(renderizar(true));
    expect(document.querySelectorAll(".lx-faisca")).toHaveLength(0);
  });
});
