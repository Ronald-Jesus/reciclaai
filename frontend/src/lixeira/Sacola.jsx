import { useEffect, useRef } from "react";
import Icone from "../componentes/Icone.jsx";
import Botao from "../componentes/Botao.jsx";
import { MATERIAIS } from "../dados/materiais.js";
import { brl, totalSacola } from "./sacola.js";

const nome = (item) => MATERIAIS[item.classe]?.rotulo ?? item.classe;

// Sacola: o que a pessoa leva para a máquina e quanto deve receber lá. Não é saldo.
export default function Sacola({ itens, removido, onRemover, onDesfazer, onLimpar }) {
  const tituloRef = useRef(null);
  const desfazerRef = useRef(null);
  const tinhaRemovido = useRef(false);

  // O botão de remover some com o item: o foco vai para "Desfazer"; depois volta ao título.
  useEffect(() => {
    if (removido) desfazerRef.current?.focus();
    else if (tinhaRemovido.current) tituloRef.current?.focus();
    tinhaRemovido.current = Boolean(removido);
  }, [removido]);

  return (
    <section className="lx-sacola rc-card" aria-labelledby="lx-sacola-titulo">
      <h2 id="lx-sacola-titulo" ref={tituloRef} tabIndex={-1} className="lx-resultado__titulo">
        Sua sacola
      </h2>

      {itens.length === 0 ? (
        <p className="lx-resultado__texto">
          Está vazia. Coloque aqui as embalagens que a máquina aceita: plástico, metal e vidro.
        </p>
      ) : (
        <ul className="lx-sacola__lista">
          {itens.map((item) => (
            <li key={item.id} className="lx-sacola__item">
              <img className="lx-sacola__foto" src={item.url} alt={nome(item)} />
              <div className="lx-sacola__info">
                <p className="lx-sacola__nome">{nome(item)}</p>
                <p className="rc-num">{brl(item.machine.value)}</p>
              </div>
              <Botao
                variante="outlined"
                pequeno
                icone="delete"
                aria-label={`Remover ${nome(item)} da sacola`}
                onClick={() => onRemover(item.id)}
              />
            </li>
          ))}
        </ul>
      )}

      <div aria-live="polite">
        {removido && (
          <div className="rc-snackbar">
            <p className="rc-snackbar__text">Item removido: {nome(removido.item)}.</p>
            <div className="rc-snackbar__actions">
              <button ref={desfazerRef} type="button" className="rc-snackbar__action" onClick={onDesfazer}>
                Desfazer
              </button>
            </div>
          </div>
        )}
      </div>

      <p className="lx-sacola__total">
        <span>Total estimado</span>
        <strong className="rc-num">{brl(totalSacola(itens))}</strong>
      </p>
      <p className="lx-dica">
        <Icone nome="info" />
        É só uma estimativa. O crédito só existe quando você deposita as embalagens na máquina.
      </p>

      {itens.length > 0 && (
        <Botao
          variante="text"
          pequeno
          icone="delete_sweep"
          onClick={() => {
            onLimpar();
            tituloRef.current?.focus();
          }}
        >
          Esvaziar sacola
        </Botao>
      )}
    </section>
  );
}
