import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, afterEach } from "vitest";
import useMenosAnimacao from "./useMenosAnimacao.js";

function simularSistema(matches) {
  let ouvinte = null;
  window.matchMedia = vi.fn().mockImplementation((consulta) => ({
    matches,
    media: consulta,
    addEventListener: (_, f) => {
      ouvinte = f;
    },
    removeEventListener: vi.fn(),
  }));
  return (novo) => ouvinte({ matches: novo });
}

describe("useMenosAnimacao", () => {
  afterEach(() => vi.restoreAllMocks());

  it("useMenosAnimacao respeita a preferência do sistema", () => {
    const mudar = simularSistema(true);
    const { result } = renderHook(() => useMenosAnimacao());
    expect(window.matchMedia).toHaveBeenCalledWith("(prefers-reduced-motion: reduce)");
    expect(result.current).toBe(true);

    act(() => mudar(false));
    expect(result.current).toBe(false);
  });

  it("é falso quando o sistema não pede menos animação", () => {
    simularSistema(false);
    const { result } = renderHook(() => useMenosAnimacao());
    expect(result.current).toBe(false);
  });
});
