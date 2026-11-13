import { useEffect, useRef } from "react";
import gsap from "gsap";
import Icone from "../componentes/Icone.jsx";
import Botao from "../componentes/Botao.jsx";
import useMenosAnimacao from "../hooks/useMenosAnimacao.js";
import { MATERIAIS, NAO_RESIDUO } from "../dados/materiais.js";
import { brl } from "./sacola.js";

const TITULO = "lx-resultado-titulo";

const pct = (n) => `${String(n).replace(".", ",")}%`;
const nomeDa = (classe, rotulo) =>
  MATERIAIS[classe]?.rotulo ?? (classe === "nao_residuo" ? NAO_RESIDUO.rotulo : rotulo ?? classe);

function DicasDeFoto() {
  return (
    <div className="lx-dicas">
      <h3 className="lx-resultado__sub">Dicas para uma foto melhor</h3>
      <ul>
        <li>Chegue mais perto: a embalagem deve ocupar quase toda a foto.</li>
        <li>Use luz clara e um fundo liso.</li>
        <li>Deixe só uma embalagem na foto.</li>
        <li>Segure firme para a imagem não tremer.</li>
      </ul>
    </div>
  );
}

// Resposta do /predict: material, lixeira (CONAMA), confiança, top 3, valor ou motivo e dica.
// Foto não reconhecida ou confiança baixa: só a mensagem e as dicas de foto.
export default function Resultado({ resposta, url, tituloRef, naSacola, onColocar, onNovaFoto }) {
  const menosAnimacao = useMenosAnimacao();
  const raizRef = useRef(null);
  const { prediction, machine = {}, ranking = [] } = resposta;
  const semMaterial = resposta.nao_reconhecido || resposta.low_confidence;
  const material = MATERIAIS[prediction.class];

  // As barras crescem. A entrada do cartão é em CSS: animar com GSAP um ancestral do
  // título focado tirava o foco dele (visto no jsdom).
  useEffect(() => {
    const barras = raizRef.current?.querySelectorAll(".lx-ranking__barra span");
    if (menosAnimacao || !barras?.length) return undefined;
    const tween = gsap.from(barras, { scaleX: 0, transformOrigin: "left", duration: 0.6, ease: "power2.out", stagger: 0.08 });
    return () => tween.revert();
  }, [resposta, menosAnimacao]);

  const outraFoto = (
    <Botao variante={semMaterial ? "filled" : "outlined"} icone="add_a_photo" onClick={onNovaFoto}>
      Analisar outra foto
    </Botao>
  );

  if (semMaterial) {
    return (
      <section ref={raizRef} className="lx-resultado rc-card" aria-labelledby={TITULO}>
        <div className="lx-resultado__cabeca">
          <img className="lx-resultado__foto" src={url} alt="Foto analisada" />
          <div>
            <h2 id={TITULO} ref={tituloRef} tabIndex={-1} className="lx-resultado__titulo">
              {machine.reason || "Não reconheci uma embalagem nesta foto."}
            </h2>
            {resposta.low_confidence && (
              <p className="lx-resultado__texto">
                A IA ficou com {pct(prediction.confidence)} de certeza. Abaixo de 70% a resposta não vale.
              </p>
            )}
          </div>
        </div>
        <DicasDeFoto />
        <div className="lx-acoes">{outraFoto}</div>
      </section>
    );
  }

  return (
    <section
      ref={raizRef}
      className="lx-resultado rc-card rc-card--material"
      style={{ "--rc-mat": material?.cor }}
      aria-labelledby={TITULO}
    >
      <div className="lx-resultado__cabeca">
        <img className="lx-resultado__foto" src={url} alt="Foto analisada" />
        <div>
          <h2 id={TITULO} ref={tituloRef} tabIndex={-1} className="lx-resultado__titulo">
            {nomeDa(prediction.class, prediction.label)}
          </h2>
          {material && (
            <p className="lx-lixeira">
              <span className="lx-cor" style={{ background: material.cor }} aria-hidden="true" />
              Lixeira {material.lixeira}
            </p>
          )}
          <p className="lx-resultado__texto rc-num">{pct(prediction.confidence)} de confiança</p>
        </div>
      </div>

      {ranking.length > 0 && (
        <div>
          <h3 className="lx-resultado__sub">Respostas mais prováveis</h3>
          <ol className="lx-ranking">
            {ranking.slice(0, 3).map((r) => (
              <li key={r.class}>
                <span>{nomeDa(r.class, r.label)}</span>
                <span className="lx-ranking__barra" aria-hidden="true">
                  <span style={{ width: `${r.confidence}%` }} />
                </span>
                <span className="rc-num">{pct(r.confidence)}</span>
              </li>
            ))}
          </ol>
        </div>
      )}

      {machine.accepted ? (
        <p className="lx-valor">
          <Icone nome="payments" preenchido />
          <span>
            Vale <strong className="rc-num">{brl(machine.value)}</strong> na máquina (estimativa).
          </span>
        </p>
      ) : (
        machine.reason && (
          <p className="lx-aviso">
            <Icone nome="block" />
            {machine.reason}
          </p>
        )
      )}

      {material?.dica && (
        <p className="lx-dica">
          <Icone nome="lightbulb" />
          {material.dica}
        </p>
      )}

      <div className="lx-acoes">
        {machine.accepted && (
          <Botao
            icone={naSacola === "na" ? "check" : naSacola ? "undo" : "shopping_bag"}
            aria-disabled={naSacola || undefined}
            onClick={naSacola ? undefined : onColocar}
          >
            {naSacola === "na" ? "Está na sacola" : naSacola ? "Removido da sacola" : "Colocar na sacola"}
          </Botao>
        )}
        {outraFoto}
      </div>
    </section>
  );
}
