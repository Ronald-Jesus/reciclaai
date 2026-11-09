import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import Contraste from "./Contraste.jsx";

describe("Contraste Brasil × Alemanha", () => {
  it("os números do contraste mostram a fonte", () => {
    // Com menos animação o número final está no HTML, sem contagem.
    window.matchMedia = vi.fn().mockImplementation((q) => ({
      matches: true, media: q, addEventListener: vi.fn(), removeEventListener: vi.fn(),
    }));
    const { container } = render(<Contraste />);
    const casos = [
      ["97,3%", "mercadoeconsumo.com.br"],
      ["+96%", "dpg-pfandsystem.de"],
    ];
    for (const [numero, trecho] of casos) {
      const valor = [...container.querySelectorAll(".numero__valor")].find((el) => el.textContent === numero);
      expect(valor, numero).toBeTruthy();
      const link = valor.closest("article").querySelector("a");
      expect(link.getAttribute("href")).toContain(trecho);
    }
    expect(screen.getByText("O segredo é o valor, não a lixeira.")).toBeInTheDocument();
  });
});
