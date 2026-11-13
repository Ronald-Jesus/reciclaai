// As 9 peças da máquina na ordem de montagem (de baixo para cima).
// Nomes e motivos: tabela 6.3 de docs/visao-do-produto.md.
export const PECAS = [
  { id: "compartimentos", nome: "Compartimentos (PET, lata, vidro)", porque: "Separar já na máquina deixa o material mais valioso para o reciclador." },
  { id: "separador", nome: "Separador", porque: "Desvia cada embalagem para o compartimento certo depois da decisão da IA." },
  { id: "compactador", nome: "Compactador", porque: "Amassa PET e lata: cabe muito mais até o próximo esvaziamento. Vidro segue inteiro." },
  { id: "balanca", nome: "Balança", porque: "Confere o peso: garrafa ainda cheia é devolvida." },
  { id: "esteira", nome: "Esteira", porque: "Gira a embalagem na frente da câmera e do leitor." },
  { id: "leitor", nome: "Leitor de código de barras", porque: "Nas máquinas alemãs, confirma que a embalagem faz parte do sistema. Aqui reforça a decisão da IA." },
  { id: "camera-ia", nome: "Câmera e IA", porque: "O coração da máquina: identifica o material. É a IA que você testa na lixeira pessoal." },
  { id: "abertura", nome: "Abertura de entrada", porque: "Recebe um item por vez, com luz indicando quando está pronta." },
  { id: "tela-impressora", nome: "Tela e impressora de voucher", porque: "Mostra o resultado e entrega o crédito." },
];
