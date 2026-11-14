import { render } from "@testing-library/react";
import { describe, it, expect, vi, afterEach } from "vitest";
import gsap from "gsap";
import Problema from "./Problema.jsx";

function menosAnimacao(matches) {
  window.matchMedia = vi.fn().mockImplementation((q) => ({
    matches, media: q, addEventListener: vi.fn(), removeEventListener: vi.fn(),
  }));
}

describe("Problema", () => {
  afterEach(() => vi.restoreAllMocks());

  it("cada foto sobe e desgira com a rolagem", () => {
    menosAnimacao(false);
    const fromTo = vi.spyOn(gsap, "fromTo");
    const { container } = render(<Problema />);
    const fotos = [...container.querySelectorAll(".foto")];
    const chamadas = fromTo.mock.calls.filter(([alvo]) => fotos.includes(alvo));
    expect(chamadas).toHaveLength(fotos.length);
    chamadas.forEach(([, de, ate], i) => {
      expect(de).toEqual({ y: 60, rotation: i % 2 ? 1.5 : -1.5 });
      expect(ate).toMatchObject({ y: 0, rotation: 0, scrollTrigger: { scrub: true } });
    });
  });

  it("com menos animação as fotos ficam paradas", () => {
    menosAnimacao(true);
    const fromTo = vi.spyOn(gsap, "fromTo");
    const { container } = render(<Problema />);
    const fotos = [...container.querySelectorAll(".foto")];
    expect(fromTo.mock.calls.some(([alvo]) => fotos.includes(alvo))).toBe(false);
  });
});
