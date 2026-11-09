import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { CREDITOS } from "./creditos.js";

describe("créditos das fotos", () => {
  it("há de 3 a 5 fotos", () => {
    expect(CREDITOS.length).toBeGreaterThanOrEqual(3);
    expect(CREDITOS.length).toBeLessThanOrEqual(5);
  });

  it("toda foto tem texto alternativo e crédito", () => {
    for (const f of CREDITOS) {
      expect(f.alt.length).toBeGreaterThan(20);
      expect(f.autor).toBeTruthy();
      expect(f.link).toMatch(/^https:\/\/(unsplash|www\.pexels)\.com\//);
      expect(["Unsplash License", "Pexels License"]).toContain(f.licenca);
      const arquivo = path.resolve(process.cwd(), "public/fotos", f.arquivo);
      expect(fs.existsSync(arquivo), `${f.arquivo} existe em public/fotos`).toBe(true);
    }
  });
});
