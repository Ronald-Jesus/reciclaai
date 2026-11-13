import { renderHook } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import Lenis from "lenis";
import useRolagemSuave from "./useRolagemSuave.js";

function simularSistema(matches) {
  window.matchMedia = vi.fn().mockImplementation((consulta) => ({
    matches,
    media: consulta,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
}

describe("useRolagemSuave", () => {
  beforeEach(() => Lenis.mockClear());

  it("rolagem suave não inicia com menos animação", () => {
    simularSistema(true);
    renderHook(() => useRolagemSuave());
    expect(Lenis).not.toHaveBeenCalled();
  });

  it("inicia o Lenis e o destrói ao sair", () => {
    simularSistema(false);
    const { unmount } = renderHook(() => useRolagemSuave());
    expect(Lenis).toHaveBeenCalledTimes(1);
    const instancia = Lenis.mock.results[0].value;
    unmount();
    expect(instancia.destroy).toHaveBeenCalledTimes(1);
  });
});
