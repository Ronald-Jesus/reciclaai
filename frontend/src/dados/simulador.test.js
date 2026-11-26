import { describe, it, expect } from "vitest";
import { simular, MISTURAS, INICIAL } from "./simulador.js";

describe("simular (conta do protótipo)", () => {
  it("com os valores iniciais do protótipo: 45.000 por mês, R$ 5.850, 540.000 no ano", () => {
    // 1500 × 20% × 5 × 30 = 45.000; crédito médio 0,6×0,10 + 0,3×0,15 + 0,1×0,25 = 0,13.
    const r = simular(INICIAL);
    expect(INICIAL).toEqual({ pessoasPorDia: 1500, trazemPct: 20, embalagensPorPessoa: 5, mistura: "pet" });
    expect(r.mes).toBe(45000);
    expect(r.credito).toBeCloseTo(5850, 6);
    expect(r.ano).toBe(540000);
  });

  it("a mistura muda só o crédito", () => {
    // Igual: (0,10 + 0,15 + 0,25) / 3 = 0,1666…; Mais vidro: 0,2×0,10 + 0,2×0,15 + 0,6×0,25 = 0,20.
    expect(simular({ ...INICIAL, mistura: "igual" }).credito).toBeCloseTo(7500, 6);
    expect(simular({ ...INICIAL, mistura: "vidro" }).credito).toBeCloseTo(9000, 6);
    expect(simular({ ...INICIAL, mistura: "vidro" }).mes).toBe(45000);
  });

  it("nos limites dos controles", () => {
    // Mínimo: 100 × 5% × 1 × 30 = 150; máximo: 5000 × 60% × 20 × 30 = 1.800.000.
    const min = simular({ pessoasPorDia: 100, trazemPct: 5, embalagensPorPessoa: 1, mistura: "pet" });
    expect(min.mes).toBeCloseTo(150, 6);
    expect(min.credito).toBeCloseTo(19.5, 6);
    expect(simular({ pessoasPorDia: 5000, trazemPct: 60, embalagensPorPessoa: 20, mistura: "pet" }).ano).toBeCloseTo(21600000, 3);
  });

  it("as misturas somam 100% e têm o texto do protótipo", () => {
    for (const m of Object.values(MISTURAS)) expect(m.pet + m.lata + m.vidro).toBeCloseTo(1, 9);
    expect(MISTURAS.pet.texto).toBe("60% PET, 30% lata, 10% vidro");
    expect(MISTURAS.igual.texto).toBe("Um terço de cada: PET, lata e vidro");
    expect(MISTURAS.vidro.texto).toBe("20% PET, 20% lata, 60% vidro");
  });
});
