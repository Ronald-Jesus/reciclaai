import { MATERIAIS } from "../dados/materiais.js";

// Uma linha por lixeira (papel e papelão dividem a azul; "biological" é apelido de orgânico).
const LIXEIRAS = Object.values(MATERIAIS).reduce((acc, m) => {
  (acc[m.lixeira] ??= { cor: m.cor, nomes: new Set() }).nomes.add(m.rotulo);
  return acc;
}, {});

export default function Legenda() {
  return (
    <section className="lx-legenda rc-card rc-card--filled" aria-labelledby="lx-legenda-titulo">
      <h2 id="lx-legenda-titulo" className="lx-resultado__sub">
        Cores das lixeiras
      </h2>
      <ul className="lx-legenda__lista">
        {Object.entries(LIXEIRAS).map(([lixeira, { cor, nomes }]) => (
          <li key={lixeira}>
            <span className="lx-cor" style={{ background: cor }} aria-hidden="true" />
            <span><strong>Lixeira {lixeira}</strong>: {[...nomes].join(", ")}</span>
          </li>
        ))}
      </ul>
      <p className="lx-legenda__fonte">Cores da Resolução CONAMA nº 275/2001.</p>
    </section>
  );
}
