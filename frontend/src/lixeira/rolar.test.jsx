import { renderHook } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import Lenis from "lenis";
import useRolagemSuave from "../hooks/useRolagemSuave.js";
import { irPara } from "./rolar.js";

function simularSistema(menos) {
  window.matchMedia = vi.fn().mockImplementation((consulta) => ({
    matches: menos,
    media: consulta,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
}

function secaoComTitulo() {
  document.body.innerHTML = '<section><h2 tabindex="-1">Sua sacola</h2></section>';
  const secao = document.querySelector("section");
  secao.scrollIntoView = vi.fn();
  return { secao, titulo: document.querySelector("h2") };
}

const original = window.matchMedia;
beforeEach(() => Lenis.mockClear());
afterEach(() => {
  window.matchMedia = original;
  document.body.innerHTML = "";
});

describe("irPara", () => {
  it("com o Lenis ligado, rola por ele até a seção (a rolagem nativa suave ele cancela)", () => {
    simularSistema(false);
    const { unmount } = renderHook(() => useRolagemSuave());
    const lenis = Lenis.mock.results[0].value;
    lenis.scrollTo = vi.fn();
    const { secao, titulo } = secaoComTitulo();

    irPara(titulo);

    expect(lenis.scrollTo).toHaveBeenCalledWith(secao, { immediate: false });
    expect(secao.scrollIntoView).not.toHaveBeenCalled();
    expect(titulo).toHaveFocus();
    unmount();
  });

  it("com menos animação não há Lenis: salta direto, sem rolagem suave", () => {
    simularSistema(true);
    const { unmount } = renderHook(() => useRolagemSuave());
    const { secao, titulo } = secaoComTitulo();

    irPara(titulo);

    expect(secao.scrollIntoView).toHaveBeenCalledWith({ block: "start" });
    expect(titulo).toHaveFocus();
    unmount();
  });

  it("depois que o Lenis sai, volta ao salto direto", () => {
    simularSistema(false);
    const { unmount } = renderHook(() => useRolagemSuave());
    unmount();
    const { secao, titulo } = secaoComTitulo();
    irPara(titulo);
    expect(secao.scrollIntoView).toHaveBeenCalledWith({ block: "start" });
  });

  it("sem elemento não faz nada", () => {
    expect(() => irPara(null)).not.toThrow();
  });
});
