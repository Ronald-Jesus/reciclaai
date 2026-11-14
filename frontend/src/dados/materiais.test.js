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

describe("valores da máquina", () => {
  it("são os mesmos de rvm.ACCEPTED, e só plástico, metal e vidro têm valor", async () => {
    const { readFileSync } = await import("node:fs");
    const rvm = readFileSync(`${process.cwd()}/../rvm.py`, "utf-8") // os testes rodam de frontend/;
    const aceitos = Object.fromEntries(
      [...rvm.matchAll(/"(\w+)": \{"value": ([\d.]+)/g)].map(([, classe, valor]) => [classe, Number(valor)])
    );
    expect(aceitos).toEqual({ plastic: 0.1, metal: 0.15, glass: 0.25 });
    for (const [classe, m] of Object.entries(MATERIAIS)) expect(m.valor).toBe(aceitos[classe]);
  });

  it("todo material tem a tag do sistema (rc-tag)", () => {
    for (const m of Object.values(MATERIAIS)) {
      expect(["plastico", "metal", "vidro", "papel", "organico", "rejeito"]).toContain(m.tag);
    }
  });
});
