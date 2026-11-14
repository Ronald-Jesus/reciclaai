import { describe, it, expect } from "vitest";
import { distanciaKm, maisProximo, ordenarPorDistancia, minutosAPe, textoDistancia, CENTRO_BRASILIA } from "./geo.js";

// Rodoviária do Plano Piloto e Congresso Nacional: cerca de 2 km em linha reta.
const RODOVIARIA = { lat: -15.7942, lng: -47.8822 };
const CONGRESSO = { lat: -15.7998, lng: -47.8645 };

describe("geo", () => {
  it("distância entre dois pontos conhecidos de Brasília", () => {
    expect(distanciaKm(RODOVIARIA, CONGRESSO)).toBeCloseTo(2.0, 0);
    expect(distanciaKm(RODOVIARIA, RODOVIARIA)).toBe(0);
  });

  it("maisProximo escolhe o menor", () => {
    const mercados = [
      { nome: "Longe", ...CONGRESSO },
      { nome: "Perto", lat: -15.795, lng: -47.883 },
    ];
    expect(maisProximo(RODOVIARIA, mercados).nome).toBe("Perto");
    expect(ordenarPorDistancia(RODOVIARIA, mercados).map((m) => m.nome)).toEqual(["Perto", "Longe"]);
    expect(maisProximo(RODOVIARIA, [])).toBeUndefined();
  });

  it("minutosAPe(1.2) === 15 (5 km/h, arredondado para cima)", () => {
    expect(minutosAPe(1.2)).toBe(15);
    expect(minutosAPe(0)).toBe(1);
  });

  it("texto da distância decide pelo valor arredondado", () => {
    expect(textoDistancia(0.994)).toBe("990 m");
    expect(textoDistancia(0.996)).toBe("1,0 km");
    expect(textoDistancia(1.26)).toBe("1,3 km");
  });

  it("centro de Brasília fica no Plano Piloto", () => {
    expect(distanciaKm(CENTRO_BRASILIA, RODOVIARIA)).toBeLessThan(1);
  });
});
