// Conta do simulador (protótipo aprovado, seção 6.4). Os valores por embalagem vêm de MATERIAIS (= rvm.ACCEPTED).
import { MATERIAIS } from "./materiais.js";

export const VALOR = { pet: MATERIAIS.plastic.valor, lata: MATERIAIS.metal.valor, vidro: MATERIAIS.glass.valor };

// Premissa: o que mais chega à máquina. As três misturas do protótipo.
export const MISTURAS = {
  pet: { rotulo: "Mais PET", pet: 0.6, lata: 0.3, vidro: 0.1, texto: "60% PET, 30% lata, 10% vidro" },
  igual: { rotulo: "Igual", pet: 1 / 3, lata: 1 / 3, vidro: 1 / 3, texto: "Um terço de cada: PET, lata e vidro" },
  vidro: { rotulo: "Mais vidro", pet: 0.2, lata: 0.2, vidro: 0.6, texto: "20% PET, 20% lata, 60% vidro" },
};

export const DIAS_POR_MES = 30;

export const INICIAL = { pessoasPorDia: 1500, trazemPct: 20, embalagensPorPessoa: 5, mistura: "pet" };

// pessoas × quantas trazem × embalagens × 30 dias; crédito = embalagens × valor médio da mistura.
export function simular({ pessoasPorDia, trazemPct, embalagensPorPessoa, mistura }) {
  const m = MISTURAS[mistura];
  const mes = pessoasPorDia * (trazemPct / 100) * embalagensPorPessoa * DIAS_POR_MES;
  const medio = m.pet * VALOR.pet + m.lata * VALOR.lata + m.vidro * VALOR.vidro;
  return { mes, credito: mes * medio, ano: mes * 12 };
}
