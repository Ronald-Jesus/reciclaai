import { describe, it, expect } from "vitest";
import { MATERIAIS, NAO_RESIDUO } from "./materiais.js";

describe("MATERIAIS", () => {
  it("todo material tem cor e lixeira", () => {
    const classes = ["cardboard", "glass", "metal", "organic", "paper", "plastic", "trash"];
    for (const classe of classes) {
      const m = MATERIAIS[classe];
      expect(m.cor).toMatch(/^#[0-9a-f]{6}$/);
      expect(m.lixeira).toBeTruthy();
      expect(m.rotulo).toBeTruthy();
      expect(m.icone).toBeTruthy();
      expect(m.dica).toBeTruthy();
    }
  });

  it("biological é apelido de organic", () => {
    expect(MATERIAIS.biological).toBe(MATERIAIS.organic);
  });

  it("não residuo não é material e não tem lixeira", () => {
    expect(MATERIAIS.nao_residuo).toBeUndefined();
    expect(NAO_RESIDUO.lixeira).toBeNull();
    expect(NAO_RESIDUO.cor).toBeUndefined();
  });
});
