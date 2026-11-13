import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, waitFor } from "@testing-library/react";

const { destroy, criar } = vi.hoisted(() => {
  const destroy = vi.fn();
  return { destroy, criar: vi.fn(() => ({ destroy })) };
});
vi.mock("vanta/dist/vanta.dots.min.js", () => ({ default: criar }));
vi.mock("three", () => ({ WebGLRenderer: function () {} }));

import FundoVanta from "./FundoVanta.jsx";

function simular(menos) {
  window.matchMedia = vi.fn().mockImplementation((q) => ({
    matches: menos && q.includes("reduced-motion"),
    media: q,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
}

describe("FundoVanta", () => {
  beforeEach(() => {
    criar.mockClear();
    destroy.mockClear();
    window.innerWidth = 1280;
  });

  it("Vanta não é criado com menos animação", async () => {
    simular(true);
    render(<FundoVanta />);
    await new Promise((r) => setTimeout(r, 50));
    expect(criar).not.toHaveBeenCalled();
  });

  it("Vanta não é criado em tela pequena", async () => {
    simular(false);
    window.innerWidth = 390;
    render(<FundoVanta />);
    await new Promise((r) => setTimeout(r, 50));
    expect(criar).not.toHaveBeenCalled();
  });

  it("cria o efeito e destrói ao desmontar", async () => {
    simular(false);
    const { unmount } = render(<FundoVanta />);
    await waitFor(() => expect(criar).toHaveBeenCalledTimes(1));
    unmount();
    expect(destroy).toHaveBeenCalled();
  });
});
