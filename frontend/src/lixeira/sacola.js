// Sacola da lixeira pessoal: uma ESTIMATIVA do que a pessoa recebe ao depositar na máquina.
// Não é saldo. Item: { id, url, classe, machine: { accepted, value } } (machine vem do /predict).
export const SACOLA_VAZIA = { itens: [], removido: null }; // removido: { item, indice } para desfazer

export function sacolaReducer(estado, acao) {
  switch (acao.tipo) {
    case "adicionar":
      // A máquina recusaria: não entra.
      if (!acao.item?.machine?.accepted) return estado;
      return { ...estado, itens: [...estado.itens, acao.item] };
    case "remover": {
      const indice = estado.itens.findIndex((i) => i.id === acao.id);
      if (indice < 0) return estado;
      return {
        itens: estado.itens.filter((i) => i.id !== acao.id),
        removido: { item: estado.itens[indice], indice },
      };
    }
    case "desfazer": {
      if (!estado.removido) return estado;
      const { item, indice } = estado.removido;
      const itens = [...estado.itens];
      itens.splice(indice, 0, item);
      return { itens, removido: null };
    }
    case "limpar":
      return SACOLA_VAZIA;
    default:
      return estado;
  }
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
