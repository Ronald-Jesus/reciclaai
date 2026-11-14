// Sacola da lixeira pessoal: uma ESTIMATIVA do que a pessoa recebe ao depositar na máquina.
// Não é saldo. Item: { id, url, classe, machine: { accepted, value } } (machine vem do /predict).
export const SACOLA_VAZIA = { itens: [], removido: null }; // removido: { itens: [{ item, indice }] } para desfazer

// Tira as unidades que passam no teste e guarda onde estavam, para o "Desfazer".
function tirar(estado, sai) {
  const removidos = estado.itens.flatMap((item, indice) => (sai(item) ? [{ item, indice }] : []));
  if (!removidos.length) return estado;
  return { itens: estado.itens.filter((i) => !sai(i)), removido: { itens: removidos } };
}

export function sacolaReducer(estado, acao) {
  switch (acao.tipo) {
    case "adicionar":
      // A máquina recusaria: não entra.
      if (!acao.item?.machine?.accepted) return estado;
      return { ...estado, itens: [...estado.itens, acao.item] };
    case "remover":
      return tirar(estado, (i) => i.id === acao.id);
    case "removerGrupo":
      return tirar(estado, (i) => i.classe === acao.classe);
    case "desfazer": {
      if (!estado.removido) return estado;
      const itens = [...estado.itens];
      // Em ordem crescente de índice, cada unidade volta exatamente para onde estava.
      estado.removido.itens.forEach(({ item, indice }) => itens.splice(indice, 0, item));
      return { itens, removido: null };
    }
    case "limpar":
      return SACOLA_VAZIA;
    default:
      return estado;
  }
}

// Uma linha por material: { classe, itens, ultimo (foto mais recente), subtotal }.
export function agruparSacola(itens) {
  const grupos = new Map();
  for (const item of itens) {
    const g = grupos.get(item.classe) ?? { classe: item.classe, itens: [] };
    g.itens.push(item);
    grupos.set(item.classe, g);
  }
  return [...grupos.values()].map((g) => ({ ...g, ultimo: g.itens.at(-1), subtotal: totalSacola(g.itens) }));
}

// Soma em centavos para não acumular erro de ponto flutuante (0,1 + 0,2).
export function totalSacola(itens) {
  return itens.reduce((soma, i) => soma + Math.round(i.machine.value * 100), 0) / 100;
}

const REAIS = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

// "R$ 0,25" (o espaço é não separável, para o valor não quebrar de linha).
export function brl(n) {
  return REAIS.format(n);
}
