import { useEffect, useLayoutEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Botao from "../componentes/Botao.jsx";
import Icone from "../componentes/Icone.jsx";
import { MATERIAIS } from "../dados/materiais.js";
import useMenosAnimacao from "../hooks/useMenosAnimacao.js";

gsap.registerPlugin(ScrollTrigger);

// Ordem do protótipo; o servidor devolve em ordem alfabética.
const ORDEM = ["plastic", "metal", "glass"];

// Valores do protótipo aprovado, mostrados só quando o servidor não responde.
const EXEMPLO = {
  exemplo: true,
  bins: [
    { material: "plastic", percent: 88 },
    { material: "metal", percent: 41 },
    { material: "glass", percent: 18 },
  ],
  alertas: ["Plástico passa de 85%: esvaziar até amanhã."],
};

// Os avisos vêm das marcas do servidor (rvm.bin_status), não de um limite repetido aqui.
function alertas(bins) {
  return bins.flatMap((b) => {
    const nome = MATERIAIS[b.material]?.rotulo ?? b.material;
    if (b.full) return [`${nome} está cheio: a máquina recusa ${nome.toLowerCase()} até esvaziar.`];
    if (b.warning) return [`${nome} está quase cheio (${Math.round(b.percent)}%): esvaziar logo.`];
    return [];
  });
}

async function lerStatus() {
  try {
    const resposta = await fetch("/api/admin/status");
    if (!resposta.ok) return EXEMPLO;
    const { bins, stats } = await resposta.json();
    if (!Array.isArray(bins) || bins.length === 0) return EXEMPLO;
    const ordenados = [...bins].sort((a, b) => (ORDEM.indexOf(a.material) + 1 || 99) - (ORDEM.indexOf(b.material) + 1 || 99));
    return { exemplo: false, bins: ordenados, alertas: alertas(ordenados), stats };
  } catch {
    return EXEMPLO;
  }
}

function Nivel({ bin }) {
  const m = MATERIAIS[bin.material] ?? { rotulo: bin.material, tag: "rejeito" };
  const pct = Math.min(100, Math.max(0, Math.round(bin.percent)));
  const texto = bin.capacity ? `${pct}% (${bin.count} de ${bin.capacity})` : `${pct}%`;
  return (
    <li>
      <span className={`rc-tag rc-tag--${m.tag}`}>
        <span className="rc-tag__material">{m.rotulo}</span>
      </span>
      <div
        className="nivel"
        role="progressbar"
        aria-label={m.rotulo}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
        aria-valuetext={texto}
        style={{ "--n": `${pct}%` }}
      >
        <span className={`rc-mat--${m.tag}`} />
      </div>
      <b aria-hidden="true">{pct}%</b>
    </li>
  );
}

// 6.6 Painel do operador: o que quem cuida da máquina vê, com os dados do servidor do projeto.
export default function Painel() {
  const [dados, setDados] = useState(null);
  const menosAnimacao = useMenosAnimacao();
  const painelRef = useRef(null);

  useEffect(() => {
    let vivo = true;
    lerStatus().then((d) => vivo && setDados(d));
    return () => {
      vivo = false;
    };
  }, []);

  // As barras enchem da esquerda quando o cartão entra na tela (scaleX: sem refazer o layout).
  useLayoutEffect(() => {
    if (menosAnimacao || !dados || !painelRef.current) return undefined;
    const ctx = gsap.context(() => {
      gsap.from(painelRef.current.querySelectorAll(".nivel > span"), {
        scaleX: 0,
        transformOrigin: "left center",
        duration: 0.9,
        ease: "power3.out",
        stagger: 0.12,
        scrollTrigger: { trigger: painelRef.current, start: "top 80%", once: true },
      });
    }, painelRef);
    return () => ctx.revert();
  }, [menosAnimacao, dados]);

  return (
    <section className="operador" id="painel" aria-labelledby="op-titulo">
      <div className="secao__in operador__grade">
        <div>
          <h2 className="secao__titulo" id="op-titulo">
            Quem cuida da máquina sabe a hora de esvaziar.
          </h2>
          <p className="secao__lead">
            O painel do operador mostra o nível de cada compartimento, o que entrou e os vouchers emitidos.
          </p>
          <Botao variante="tonal" icone="dashboard" href="/admin">
            Abrir o painel do operador
          </Botao>
          <p className="operador__nota">O painel roda no servidor do projeto, com os dados desta demonstração.</p>
        </div>
        <div className="painel rc-card" role="group" aria-label="Painel do operador" aria-busy={!dados} ref={painelRef}>
          <p className="painel__topo">
            <Icone nome="sensors" />
            {dados && !dados.exemplo ? "Máquina do projeto · agora" : "Máquina da entrada · hoje"}
          </p>
          {!dados ? (
            <p className="painel__carregando">Lendo os níveis da máquina…</p>
          ) : (
            <>
              <ul className="niveis">
                {dados.bins.map((b) => (
                  <Nivel bin={b} key={b.material} />
                ))}
              </ul>
              {dados.alertas.length > 0 ? (
                dados.alertas.map((a) => (
                  <p className="painel__alerta" key={a}>
                    <Icone nome="info" />
                    {a}
                  </p>
                ))
              ) : (
                <p className="painel__alerta painel__alerta--ok">
                  <Icone nome="check_circle" />
                  Nenhum compartimento perto de encher.
                </p>
              )}
              {dados.stats?.items_accepted != null && (
                <p className="painel__stats">
                  Desde o início: {dados.stats.items_accepted} embalagens aceitas e {dados.stats.vouchers ?? 0}{" "}
                  vouchers emitidos.
                </p>
              )}
              <p className="painel__exemplo">{dados.exemplo ? "Valores de exemplo" : "Dados do servidor do projeto"}</p>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
