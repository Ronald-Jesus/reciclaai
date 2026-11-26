export const DUVIDAS = [
  {
    pergunta: "Como a IA reconhece o material?",
    resposta:
      "Em duas etapas. Primeiro, um filtro confere se a foto mostra um resíduo. Depois, um modelo treinado com fotos de resíduos diz se é plástico, metal, vidro, papel, papelão, orgânico ou rejeito, com uma porcentagem de certeza.",
  },
  {
    pergunta: "E se ela errar?",
    resposta:
      "Abaixo de 70% de certeza, a máquina devolve o item e pede para reposicionar. A balança e o leitor de código de barras conferem a decisão. Garrafa ainda cheia também volta.",
  },
  {
    pergunta: "Por que o app não paga direto?",
    resposta:
      "O crédito só existe quando a embalagem entra na máquina. O app mostra quanto ela vale, mas não paga. Assim ninguém ganha duas vezes fotografando a mesma garrafa.",
  },
  {
    pergunta: "Quanto vale cada embalagem?",
    resposta:
      "Garrafa plástica R$ 0,10, lata R$ 0,15 e vidro R$ 0,25. O voucher vale no caixa do local que tem a máquina.",
  },
  {
    pergunta: "E orgânico, papel e papelão?",
    resposta:
      "A máquina reconhece e devolve, indicando a lixeira certa: azul para papel e papelão, marrom para orgânico, cinza para rejeito (cores da Resolução CONAMA 275).",
  },
  {
    pergunta: "As fotos ficam guardadas?",
    resposta:
      "Não. A foto serve só para a leitura. No app, ela fica na memória do seu navegador enquanto a página está aberta e nunca é gravada no servidor.",
  },
];

// 6.7 Dúvidas frequentes: <details> nativo, que já abre e fecha pelo teclado.
export default function Duvidas() {
  return (
    <section className="duvidas" id="duvidas" aria-labelledby="duv-titulo">
      <div className="secao__in duvidas__in">
        <h2 className="secao__titulo" id="duv-titulo">Dúvidas frequentes</h2>
        <div className="faq">
          {DUVIDAS.map(({ pergunta, resposta }) => (
            <details key={pergunta}>
              <summary>{pergunta}</summary>
              <p>{resposta}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
