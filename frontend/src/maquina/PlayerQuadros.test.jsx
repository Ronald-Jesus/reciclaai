import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { existemQuadros, nomeDoQuadro, TOTAL_QUADROS } from "./quadros.js";
import PlayerQuadros, { quadroDoProgresso } from "./PlayerQuadros.jsx";

vi.mock("./quadros.js", async (original) => ({ ...(await original()), existemQuadros: vi.fn() }));

describe("PlayerQuadros", () => {
  beforeEach(() => {
    // jsdom não desenha em <canvas>: um contexto vazio basta.
    HTMLCanvasElement.prototype.getContext = vi.fn(() => null);
  });

  it("o player escolhe o quadro pelo progresso (vídeo tocado ao contrário)", async () => {
    expect(quadroDoProgresso(0)).toBe(TOTAL_QUADROS);
    expect(quadroDoProgresso(1)).toBe(1);
    expect(quadroDoProgresso(0.5)).toBe(60);
    expect(quadroDoProgresso(-1)).toBe(TOTAL_QUADROS);
    expect(quadroDoProgresso(2)).toBe(1);

    existemQuadros.mockResolvedValue(true);
    const { container, rerender } = render(<PlayerQuadros progresso={0} />);
    await waitFor(() => expect(container.querySelector("canvas")).toBeInTheDocument());
    expect(container.querySelector("canvas").dataset.quadro).toBe(nomeDoQuadro(TOTAL_QUADROS));
    rerender(<PlayerQuadros progresso={1} />);
    expect(container.querySelector("canvas").dataset.quadro).toBe(nomeDoQuadro(1));
    expect(container.querySelector("svg")).toBeNull();
  });

  it("sem quadros usa o SVG", async () => {
    existemQuadros.mockResolvedValue(false);
    const { container } = render(<PlayerQuadros progresso={0.3} telaLigada />);
    await waitFor(() => expect(existemQuadros).toHaveBeenCalled());
    expect(container.querySelector("canvas")).toBeNull();
    expect(screen.getByRole("img", { name: /máquina de retorno/i })).toBeInTheDocument();
    expect(container.querySelector("text").textContent).toBe("Insira uma embalagem");
  });
});
