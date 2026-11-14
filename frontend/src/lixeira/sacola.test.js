import { describe, it, expect } from "vitest";
import { sacolaReducer, totalSacola, brl, SACOLA_VAZIA } from "./sacola.js";

const pet = { id: 1, url: "blob:1", classe: "plastic", machine: { accepted: true, value: 0.1 } };
const vidro = { id: 2, url: "blob:2", classe: "glass", machine: { accepted: true, value: 0.25 } };
const papel = { id: 3, url: "blob:3", classe: "paper", machine: { accepted: false, value: 0, reason: "Lixeira azul." } };

function com(...itens) {
  return itens.reduce((estado, item) => sacolaReducer(estado, { tipo: "adicionar", item }), SACOLA_VAZIA);
}

describe("sacolaReducer", () => {
  it("só material aceito pode ir para a sacola", () => {
    const estado = com(pet, papel);
    expect(estado.itens).toEqual([pet]);
  });

  it("aceita várias unidades da mesma foto, cada uma com seu id", () => {
    const outra = { ...pet, id: 9 };
    const estado = sacolaReducer(com(pet, outra), { tipo: "remover", id: 1 });
    expect(estado.itens).toEqual([outra]);
    expect(estado.itens[0].url).toBe(pet.url);
  });

  it("total soma os valores", () => {
    expect(totalSacola(com(pet, vidro, pet).itens)).toBe(0.45);
    expect(totalSacola([])).toBe(0);
  });

  it("desfazer devolve o item removido no mesmo lugar", () => {
    const removido = sacolaReducer(com(pet, vidro), { tipo: "remover", id: 1 });
    expect(removido.itens).toEqual([vidro]);
    expect(removido.removido).toEqual({ item: pet, indice: 0 });

    const desfeito = sacolaReducer(removido, { tipo: "desfazer" });
    expect(desfeito.itens).toEqual([pet, vidro]);
    expect(desfeito.removido).toBeNull();
  });

  it("desfazer sem remoção não muda nada", () => {
    const estado = com(pet);
    expect(sacolaReducer(estado, { tipo: "desfazer" })).toBe(estado);
  });

  it("limpar esvazia e esquece a remoção", () => {
    const estado = sacolaReducer(com(pet, vidro), { tipo: "remover", id: 2 });
    expect(sacolaReducer(estado, { tipo: "limpar" })).toEqual(SACOLA_VAZIA);
  });
});

describe("brl", () => {
  it("formata em reais", () => {
    expect(brl(0.25)).toMatch(/^R\$\s0,25$/);
    expect(brl(1.5)).toMatch(/^R\$\s1,50$/);
  });
});
