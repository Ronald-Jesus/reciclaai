import Icone from "../componentes/Icone.jsx";
import Botao from "../componentes/Botao.jsx";
import { MATERIAIS } from "../dados/materiais.js";
import { brl } from "./sacola.js";

export const LEGENDA_TITULO = "lx-legenda-titulo";

// Uma linha por lixeira (papel e papelão dividem a azul; "biological" é apelido de orgânico).
const LIXEIRAS = Object.values(MATERIAIS).reduce((acc, m) => {
  (acc[m.lixeira] ??= { tag: m.tag, icone: m.icone, valor: m.valor, nomes: new Set() }).nomes.add(m.rotulo);
  return acc;
}, {});

// Legenda num popup (<dialog> nativo com showModal: Esc fecha e o resto da página fica inerte).
// Quem abre guarda o botão de origem e devolve o foco a ele em onFechar.
export default function Legenda({ dialogRef, onFechar }) {
  return (
    <dialog
      ref={dialogRef}
      className="lx-dialogo"
      aria-labelledby={LEGENDA_TITULO}
      tabIndex={-1}
      data-lenis-prevent
      onClose={onFechar}
      // O cartão ocupa o <dialog> todo: um clique no próprio <dialog> veio do fundo, fora dele.
      onClick={(e) => e.target === e.currentTarget && e.currentTarget.close()}
    >
      <div className="lx-legenda rc-card rc-card--filled">
        <div className="lx-dialogo__cabeca">
          <h2 id={LEGENDA_TITULO} className="lx-resultado__sub">
            Cores das lixeiras
          </h2>
          <Botao variante="outlined" pequeno icone="close" aria-label="Fechar legenda" onClick={() => dialogRef.current?.close()}>
            Fechar
          </Botao>
        </div>
        <ul className="lx-legenda__lista">
          {Object.entries(LIXEIRAS).map(([lixeira, { tag, icone, valor, nomes }]) => (
            <li key={lixeira}>
              <span className={`rc-tag rc-tag--${tag}`}>
                <span className="rc-tag__material">
                  <Icone nome={icone} />
                  {[...nomes].join(", ")}
                </span>
                <span className="rc-tag__bin">Lixeira {lixeira}</span>
              </span>
              <span className="lx-aceita">
                <Icone nome={valor ? "check_circle" : "do_not_disturb_on"} preenchido />
                {valor ? `Máquina paga · ${brl(valor)}` : "Máquina não aceita"}
              </span>
            </li>
          ))}
        </ul>
        <p className="lx-legenda__nota">A máquina aceita plástico, metal e vidro.</p>
        <p className="lx-legenda__fonte">Cores da Resolução CONAMA nº 275/2001.</p>
      </div>
    </dialog>
  );
}
