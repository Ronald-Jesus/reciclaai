// Cores das lixeiras: Resolução CONAMA nº 275/2001. As mesmas em todo o site.
const ORGANICO = {
  rotulo: "Orgânico",
  lixeira: "marrom",
  cor: "#8a5a36",
  icone: "compost",
  dica: "Restos de comida e cascas vão na lixeira marrom ou na compostagem.",
};

export const MATERIAIS = {
  cardboard: {
    rotulo: "Papelão",
    lixeira: "azul",
    cor: "#2f6db5",
    icone: "package_2",
    dica: "Desmonte a caixa e mantenha o papelão seco e limpo.",
  },
  glass: {
    rotulo: "Vidro",
    lixeira: "verde",
    cor: "#2e8b57",
    icone: "liquor",
    dica: "Enxágue e não quebre. Cacos devem ir embrulhados e identificados.",
  },
  metal: {
    rotulo: "Metal",
    lixeira: "amarela",
    cor: "#c99700",
    icone: "sprint",
    dica: "Esvazie e amasse a lata, se der. Não precisa tirar o rótulo.",
  },
  organic: ORGANICO,
  paper: {
    rotulo: "Papel",
    lixeira: "azul",
    cor: "#2f6db5",
    icone: "description",
    dica: "Papel limpo e seco. Papel engordurado ou molhado não é reciclado.",
  },
  plastic: {
    rotulo: "Plástico",
    lixeira: "vermelha",
    cor: "#c8453a",
    icone: "water_bottle",
    dica: "Esvazie e enxágue a garrafa. Tampa e rótulo podem ficar.",
  },
  trash: {
    rotulo: "Rejeito",
    lixeira: "cinza",
    cor: "#6b6f6a",
    icone: "delete",
    dica: "Sem reciclagem possível: vai na lixeira de rejeito.",
  },
};

// Apelido: o modelo pode devolver "biological" para o mesmo material.
MATERIAIS.biological = ORGANICO;

// NÃO é um material: a foto não mostra um resíduo. Não tem cor nem lixeira
// e nunca mostra valor. Fica fora de MATERIAIS de propósito.
export const NAO_RESIDUO = {
  rotulo: "Não é resíduo",
  lixeira: null,
};
