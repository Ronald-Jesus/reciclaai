import Icone from "../componentes/Icone.jsx";

// As 4 dicas do protótipo. Na captura começa fechada; no resultado incerto, aberta.
export default function DicasDeFoto({ aberta = false }) {
  return (
    <details className="lx-dicas rc-card rc-card--filled" open={aberta}>
      <summary>
        <Icone nome="lightbulb" />
        Dicas para uma boa foto
        <Icone nome="expand_more" className="lx-chev" />
      </summary>
      <ul>
        <li>Um item por foto, no centro da imagem.</li>
        <li>Fundo liso e luz clara, sem sombra em cima.</li>
        <li>Chegue perto: a embalagem deve ocupar a maior parte da foto.</li>
        <li>Mostre o rótulo, mas sem cobrir o material com a mão.</li>
      </ul>
    </details>
  );
}
