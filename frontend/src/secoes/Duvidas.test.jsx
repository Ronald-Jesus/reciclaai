import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { MATERIAIS } from "../dados/materiais.js";
import Duvidas, { DUVIDAS } from "./Duvidas.jsx";

describe("Dúvidas frequentes", () => {
  it("mostra as 6 perguntas, fechadas", () => {
    const { container } = render(<Duvidas />);
    const itens = [...container.querySelectorAll("details")];
    expect(itens.map((d) => d.querySelector("summary").textContent)).toEqual(DUVIDAS.map((d) => d.pergunta));
    expect(itens).toHaveLength(6);
    expect(itens.some((d) => d.open)).toBe(false);
    expect(container.querySelector("section")).toHaveAttribute("id", "duvidas");
    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent("Dúvidas frequentes");
  });

  // materiais.test.js garante que estes valores são os do rvm.py
  it("os valores são os que a máquina paga", () => {
    const textos = DUVIDAS.map((d) => d.resposta).join(" ");
    for (const { valor } of Object.values(MATERIAIS).filter((m) => m.valor)) {
      expect(textos).toContain(`R$ ${valor.toFixed(2).replace(".", ",")}`);
    }
  });
});
