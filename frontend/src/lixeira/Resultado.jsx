import { useEffect, useRef } from "react";
import gsap from "gsap";
import Icone from "../componentes/Icone.jsx";
import Botao from "../componentes/Botao.jsx";
import useMenosAnimacao from "../hooks/useMenosAnimacao.js";
import { MATERIAIS, NAO_RESIDUO } from "../dados/materiais.js";
import { brl } from "./sacola.js";
import DicasDeFoto from "./DicasDeFoto.jsx";

const TITULO = "lx-resultado-titulo";

const pct = (n) => `${String(n).replace(".", ",")}%`;
const nomeDa = (classe, rotulo) =>
  MATERIAIS[classe]?.rotulo ?? (classe === "nao_residuo" ? NAO_RESIDUO.rotulo : rotulo ?? classe);

// Etiqueta do sistema: material + lixeira, na cor CONAMA (como no protótipo).
export function TagMaterial({ classe, grande = false }) {
  const m = MATERIAIS[classe];
  if (!m) return null;
  return (
    <span className={`rc-tag rc-tag--${m.tag}${grande ? " rc-tag--large" : ""}`}>
      <span className="rc-tag__material">
        <Icone nome={m.icone} />
        {m.rotulo}
      </span>
      <span className="rc-tag__bin">Lixeira {m.lixeira}</span>
    </span>
  );
}

function Confianca({ valor }) {
  return (
    <div>
      <p className="rc-progress-label">
        <span>Confiança da IA</span>
        <span className="rc-num">{pct(valor)}</span>
      </p>
      <div
        className="rc-progress"
        role="progressbar"
        aria-label="Confiança da IA"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={valor}
      >
        <div className="rc-progress__bar" style={{ "--rc-progress": `${valor}%` }} />
      </div>
    </div>
  );
}

// Top 3 dentro de "Por que a IA decidiu isso?".
function PorQue({ ranking }) {
  if (!ranking.length) return null;
  return (
    <details className="lx-porque">
      <summary>
        <Icone nome="psychology" />
        Por que a IA decidiu isso?
        <Icone nome="expand_more" className="lx-chev" />
      </summary>
      <p className="lx-dica">Os três materiais mais prováveis:</p>
      <ol className="lx-ranking">
        {ranking.slice(0, 3).map((r) => (
          <li key={r.class} className={MATERIAIS[r.class] ? `rc-mat--${MATERIAIS[r.class].tag}` : undefined}>
            <span>{nomeDa(r.class, r.label)}</span>
            <span className="rc-progress" aria-hidden="true">
              <span className="rc-progress__bar" style={{ "--rc-progress": `${r.confidence}%` }} />
            </span>
            <span className="rc-num">{pct(r.confidence)}</span>
          </li>
        ))}
      </ol>
    </details>
  );
}

// Resposta do /predict: material, lixeira (CONAMA), confiança, top 3, valor ou motivo e dica.
// Foto não reconhecida ou confiança baixa: só a mensagem e as dicas de foto (sem palpite).
// `adicionados`: quantas unidades desta foto já foram para a sacola; `avisoSacola` mostra o snackbar.
export default function Resultado({
  resposta,
  url,
  tituloRef,
  adicionados = 0,
  avisoSacola = false,
  onColocar,
  onNovaFoto,
  onVerSacola,
  onVerLegenda,
}) {
  const menosAnimacao = useMenosAnimacao();
  const raizRef = useRef(null);
  const { prediction, machine = {}, ranking = [] } = resposta;
  const semMaterial = resposta.nao_reconhecido || resposta.low_confidence;
  const material = MATERIAIS[prediction.class];

  // As barras crescem. A entrada do cartão é em CSS: animar com GSAP um ancestral do
  // título focado tirava o foco dele (visto no jsdom).
  useEffect(() => {
    const barras = raizRef.current?.querySelectorAll(".rc-progress__bar");
    if (menosAnimacao || !barras?.length) return undefined;
    const tween = gsap.from(barras, { scaleX: 0, transformOrigin: "left", duration: 0.6, ease: "power2.out", stagger: 0.08 });
    return () => tween.revert();
  }, [resposta, menosAnimacao]);

  if (semMaterial) {
    return (
      <section ref={raizRef} className="lx-resultado" aria-labelledby={TITULO}>
        <div className="lx-aviso lx-aviso--neutro" role="alert">
          <Icone nome="warning" preenchido />
          <div>
            <h2 id={TITULO} ref={tituloRef} tabIndex={-1} className="lx-resultado__titulo">
              {machine.reason || "Não reconheci uma embalagem nesta foto."}
            </h2>
            {resposta.low_confidence && (
              <p className="lx-resultado__texto">
                A IA ficou com {pct(prediction.confidence)} de certeza. Abaixo de 70% o item é devolvido.
                Reposicione a embalagem e tente de novo.
              </p>
            )}
          </div>
        </div>
        <img className="lx-resultado__foto" src={url} alt="Foto analisada" />
        <DicasDeFoto aberta />
        <div className="lx-acoes">
          <Botao icone="photo_camera" onClick={onNovaFoto}>
            Tentar outra foto
          </Botao>
        </div>
      </section>
    );
  }

  const titulo = [
    nomeDa(prediction.class, prediction.label),
    material && `lixeira ${material.lixeira}`,
    machine.accepted && pct(prediction.confidence),
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <section ref={raizRef} className="lx-resultado" aria-labelledby={TITULO}>
      <article
        className={`rc-card rc-card--material${material ? ` rc-mat--${material.tag}` : ""}`}
      >
        <div className="lx-resultado__cabeca">
          <img className="lx-resultado__foto" src={url} alt="Foto analisada" />
          <div className="lx-resultado__nome">
            <h2 id={TITULO} ref={tituloRef} tabIndex={-1} className="lx-resultado__titulo">
              {titulo}
            </h2>
            <TagMaterial classe={prediction.class} grande />
          </div>
        </div>
      </article>

      {machine.accepted ? (
        <div className="lx-valor">
          <Icone nome="payments" preenchido />
          <p>
            <strong className="rc-num">Vale {brl(machine.value)}</strong>
            <br />
            na máquina (estimativa)
          </p>
        </div>
      ) : (
        <div className="lx-aviso lx-aviso--neutro">
          <Icone nome="block" preenchido />
          <div>
            <h3 className="lx-resultado__sub">A máquina não aceita este item.</h3>
            <p className="lx-resultado__texto">Ela recebe só plástico (PET), lata e vidro. {machine.reason}</p>
          </div>
        </div>
      )}

      {material?.dica && (
        <p className="lx-dica">
          <Icone nome="lightbulb" />
          Dica: {material.dica}
        </p>
      )}

      <Confianca valor={prediction.confidence} />
      <PorQue ranking={ranking} />

      <div className="lx-acoes">
        {machine.accepted ? (
          <Botao icone="add_shopping_cart" onClick={onColocar}>
            {adicionados ? "Adicionar mais um" : "Adicionar à sacola"}
          </Botao>
        ) : null}
        <Botao variante={machine.accepted ? "outlined" : "filled"} icone="photo_camera" onClick={onNovaFoto}>
          Fotografar outra
        </Botao>
        {!machine.accepted && (
          <Botao variante="outlined" icone="palette" onClick={onVerLegenda}>
            Ver legenda das lixeiras
          </Botao>
        )}
      </div>

      <div role="status">
        {avisoSacola && (
          <div className="rc-snackbar lx-snackbar">
            <p className="rc-snackbar__text">Adicionada à sacola</p>
            <div className="rc-snackbar__actions">
              <button type="button" className="rc-snackbar__action" onClick={onVerSacola}>
                Ver sacola
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
