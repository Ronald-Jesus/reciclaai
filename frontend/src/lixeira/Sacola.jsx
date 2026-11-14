import { useEffect, useRef } from "react";
import gsap from "gsap";
import Icone from "../componentes/Icone.jsx";
import Botao from "../componentes/Botao.jsx";
import useMenosAnimacao from "../hooks/useMenosAnimacao.js";
import { MATERIAIS } from "../dados/materiais.js";
import { agruparSacola, brl, totalSacola } from "./sacola.js";
import { TagMaterial } from "./Resultado.jsx";

export const SACOLA_TITULO = "lx-sacola-titulo";

const nome = (item) => MATERIAIS[item.classe]?.rotulo ?? item.classe;

// Texto do snackbar: uma unidade ou o grupo inteiro.
function textoRemovido({ itens }) {
  const n = nome(itens[0].item);
  return itens.length === 1 ? `Item removido: ${n}.` : `Removidos: ${itens.length} × ${n}.`;
}

// Total que conta do valor anterior até o novo (como o CountUp do React Bits).
// O texto é escrito só pelo efeito: o React não controla o filho deste span.
function TotalAnimado({ valor }) {
  const ref = useRef(null);
  const anterior = useRef(null);
  const menosAnimacao = useMenosAnimacao();

  useEffect(() => {
    const el = ref.current;
    const de = anterior.current;
    anterior.current = valor;
    if (menosAnimacao || de === null || de === valor) {
      el.textContent = brl(valor);
      return undefined;
    }
    const estado = { v: de };
    const tween = gsap.to(estado, {
      v: valor,
      duration: 0.8,
      ease: "power2.out",
      onUpdate: () => (el.textContent = brl(Math.round(estado.v * 100) / 100)),
      onComplete: () => (el.textContent = brl(valor)),
    });
    return () => {
      tween.kill();
      el.textContent = brl(valor);
    };
  }, [valor, menosAnimacao]);

  return <span ref={ref} aria-hidden="true" />;
}

// Sacola: o que a pessoa leva para a máquina e quanto deve receber lá. Não é saldo.
// Itens iguais (mesmo material) ficam numa linha só, com quantidade e − / +.
export default function Sacola({ itens, removido, onRemover, onRemoverGrupo, onMais, onDesfazer, onLimpar, onFotografarMais }) {
  const tituloRef = useRef(null);
  const desfazerRef = useRef(null);
  const tinhaRemovido = useRef(false);
  const focarDesfazer = useRef(false); // o botão clicado sumiu junto com a linha
  const total = totalSacola(itens);
  const grupos = agruparSacola(itens);

  // Se o botão clicado some com a linha, o foco vai para "Desfazer"; depois volta ao título.
  useEffect(() => {
    if (removido && focarDesfazer.current) desfazerRef.current?.focus();
    else if (!removido && tinhaRemovido.current && !document.activeElement?.closest(".lx-sacola__item")) tituloRef.current?.focus();
    focarDesfazer.current = false;
    tinhaRemovido.current = Boolean(removido);
  }, [removido]);

  return (
    <section id="sacola" className="lx-sacola rc-card" aria-labelledby={SACOLA_TITULO}>
      <h2 id={SACOLA_TITULO} ref={tituloRef} tabIndex={-1} className="lx-resultado__titulo">
        Sua sacola
      </h2>

      {itens.length === 0 ? (
        <div className="lx-vazia rc-card rc-card--filled">
          <Icone nome="shopping_bag" preenchido className="lx-vazia__icone" />
          <p className="lx-sacola__nome">Sua sacola está vazia.</p>
          <p>Fotografe uma embalagem e adicione aqui. A máquina aceita plástico, metal e vidro.</p>
        </div>
      ) : (
        <ul className="lx-sacola__lista" data-lenis-prevent>
          {grupos.map(({ classe, itens: unidades, ultimo, subtotal }) => {
            const n = nome(ultimo);
            return (
              <li key={classe} className="lx-sacola__item">
                <img className="lx-sacola__foto" src={ultimo.url} alt={n} />
                <div className="lx-sacola__info">
                  <p className="lx-sacola__nome">
                    {n} <span className="rc-num">× {unidades.length}</span>
                  </p>
                  <TagMaterial classe={classe} />
                  <p className="rc-num lx-sacola__subtotal">{brl(subtotal)}</p>
                </div>
                <div className="lx-sacola__controles">
                  <div className="lx-qtd" role="group" aria-label={`Quantidade de ${n}`}>
                    <button
                      type="button"
                      className="lx-qtd__botao"
                      aria-label={`Tirar uma unidade de ${n}`}
                      onClick={() => {
                        focarDesfazer.current = unidades.length === 1;
                        onRemover(ultimo.id);
                      }}
                    >
                      <Icone nome="remove" />
                    </button>
                    <span className="lx-qtd__valor rc-num" aria-hidden="true">
                      {unidades.length}
                    </span>
                    <button type="button" className="lx-qtd__botao" aria-label={`Pôr mais uma unidade de ${n}`} onClick={() => onMais(ultimo)}>
                      <Icone nome="add" />
                    </button>
                  </div>
                  <Botao
                    variante="outlined"
                    pequeno
                    icone="delete"
                    aria-label={`Remover ${n} da sacola (${unidades.length} ${unidades.length === 1 ? "unidade" : "unidades"})`}
                    onClick={() => {
                      focarDesfazer.current = true;
                      onRemoverGrupo(classe);
                    }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <div aria-live="polite">
        {removido && (
          <div className="rc-snackbar">
            <p className="rc-snackbar__text">{textoRemovido(removido)}</p>
            <div className="rc-snackbar__actions">
              <button ref={desfazerRef} type="button" className="rc-snackbar__action" onClick={onDesfazer}>
                Desfazer
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="rc-card rc-card--primary lx-total">
        <p>Total estimado</p>
        <p className="lx-total__valor">
          <strong className="rc-num">
            <TotalAnimado valor={total} />
          </strong>{" "}
          <span className="lx-total__sufixo">a receber na máquina</span>
        </p>
        <p className="sr-only" aria-live="polite">
          {brl(total)} a receber na máquina
        </p>
      </div>
      <p className="lx-dica">
        <Icone nome="info" />
        É só uma estimativa. O crédito só existe quando você deposita as embalagens na máquina.
      </p>

      <div className="lx-acoes">
        <Botao variante="outlined" icone="photo_camera" onClick={onFotografarMais}>
          Fotografar mais
        </Botao>
        {itens.length > 0 && (
          <Botao
            variante="text"
            icone="delete_sweep"
            onClick={() => {
              onLimpar();
              tituloRef.current?.focus();
            }}
          >
            Esvaziar sacola
          </Botao>
        )}
      </div>
    </section>
  );
}
