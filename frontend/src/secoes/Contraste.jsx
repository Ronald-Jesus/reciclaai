import NumeroAnimado from "../componentes/NumeroAnimado.jsx";

export const FONTE_LATAS =
  "https://mercadoeconsumo.com.br/14/08/2025/economia/brasil-reciclou-973-das-latinhas-de-aluminio-em-2024/";
export const FONTE_ALEMANHA =
  "https://dpg-pfandsystem.de/en/the-one-way-deposit-system/useful-information/press-releases/twenty-years-of-the-german-one-way-deposit-system-a-success-story.html";

// 6.2 Brasil × Alemanha: dois números com fonte.
export default function Contraste() {
  return (
    <section className="contraste" id="contraste" aria-labelledby="contraste-titulo">
      <div className="secao__in">
        <h2 className="secao__titulo" id="contraste-titulo">
          Quando a embalagem vale, ela volta.
        </h2>
        <div className="contraste__grade">
          <article className="numero rc-card">
            <p className="numero__valor">
              <NumeroAnimado valor={97.3} casas={1} />%
            </p>
            <p className="numero__o-que">das latas de alumínio foram recicladas no Brasil em 2024.</p>
            <p className="numero__porque">A lata tem valor de revenda. Por isso alguém sempre recolhe.</p>
            <p className="numero__fonte">
              Fonte: Recicla Latas, via{" "}
              <a href={FONTE_LATAS} target="_blank" rel="noopener noreferrer">
                Mercado&amp;Consumo (2025)<span className="sr-only"> (abre em nova aba)</span>
              </a>
            </p>
          </article>
          <p className="contraste__x" aria-hidden="true">×</p>
          <article className="numero rc-card rc-card--primary">
            <p className="numero__valor">
              +<NumeroAnimado valor={96} />%
            </p>
            <p className="numero__o-que">das embalagens com depósito voltam na Alemanha.</p>
            <p className="numero__porque">Cada garrafa tem um depósito, devolvido por uma máquina no supermercado.</p>
            <p className="numero__fonte">
              Fonte:{" "}
              <a href={FONTE_ALEMANHA} target="_blank" rel="noopener noreferrer">
                DPG Deutsche Pfandsystem<span className="sr-only"> (abre em nova aba)</span>
              </a>
            </p>
          </article>
        </div>
        <p className="contraste__moral">O segredo é o valor, não a lixeira.</p>
      </div>
    </section>
  );
}
