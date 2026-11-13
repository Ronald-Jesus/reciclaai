import { render } from "@testing-library/react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { PECAS } from "./pecas.js";
import MaquinaSVG from "./MaquinaSVG.jsx";
import { TOTAL_QUADROS, nomeDoQuadro, existemQuadros } from "./quadros.js";

describe("PECAS", () => {
  it("PECAS tem 9 itens na ordem da visão", () => {
    expect(PECAS.map((p) => p.id)).toEqual([
      "compartimentos", "separador", "compactador", "balanca", "esteira",
      "leitor", "camera-ia", "abertura", "tela-impressora",
    ]);
    expect(PECAS[0].nome).toMatch(/^Compartimentos/);
    expect(PECAS[8].nome).toBe("Tela e impressora de voucher");
    for (const p of PECAS) {
      expect(p.nome).toBeTruthy();
      expect(p.porque).toBeTruthy();
    }
  });
});

describe("MaquinaSVG", () => {
  const pecasDesenhadas = (c) => [...c.querySelectorAll("[data-peca]")].map((g) => g.dataset.peca);

  it("desenha as 9 peças por padrão, com título acessível", () => {
    const { container, getByRole } = render(<MaquinaSVG />);
    expect(pecasDesenhadas(container)).toEqual(PECAS.map((p) => p.id));
    expect(getByRole("img", { name: /máquina de retorno/i })).toBeInTheDocument();
  });

  it("MaquinaSVG desenha só as primeiras n peças", () => {
    const { container } = render(<MaquinaSVG pecasVisiveis={3} />);
    expect(pecasDesenhadas(container)).toEqual(["compartimentos", "separador", "compactador"]);
    for (const g of container.querySelectorAll("[data-peca]")) {
      expect(g.childElementCount).toBeGreaterThan(0);
    }
  });

  it('tela ligada mostra "Insira uma embalagem"', () => {
    const { container } = render(<MaquinaSVG telaLigada />);
    expect(container.querySelector("text").textContent).toBe("Insira uma embalagem");
  });

  it("tela desligada não mostra texto", () => {
    const { container } = render(<MaquinaSVG />);
    expect(container.querySelector("svg").textContent).not.toMatch(/insira/i);
  });
});

describe("quadros", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("nomeDoQuadro numera com quatro dígitos", () => {
    expect(TOTAL_QUADROS).toBe(120);
    expect(nomeDoQuadro(1)).toBe("frame_0001.webp");
    expect(nomeDoQuadro(120)).toBe("frame_0120.webp");
  });

  it("existemQuadros só aceita resposta de imagem", async () => {
    const resposta = (ok, tipo) => ({ ok, headers: new Headers({ "content-type": tipo }) });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(resposta(true, "image/webp")));
    expect(await existemQuadros()).toBe(true);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(resposta(true, "text/html")));
    expect(await existemQuadros()).toBe(false);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(resposta(false, "text/plain")));
    expect(await existemQuadros()).toBe(false);
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("rede")));
    expect(await existemQuadros()).toBe(false);
  });
});
