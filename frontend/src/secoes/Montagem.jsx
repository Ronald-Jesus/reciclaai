import { useEffect, useLayoutEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { PECAS } from "../maquina/pecas.js";
import MaquinaSVG from "../maquina/MaquinaSVG.jsx";
import PlayerQuadros from "../maquina/PlayerQuadros.jsx";
import useMenosAnimacao from "../hooks/useMenosAnimacao.js";

gsap.registerPlugin(ScrollTrigger);

const N = PECAS.length;

export function rotuloProgresso(atual, total) {
  return `${atual} de ${total} peças`;
}

// N trechos de peça + 1 trecho final para ligar a tela; cada peça encaixa perto do fim do seu trecho.
export function passoPorProgresso(p, total = N) {
  return {
    n: Math.min(total, Math.floor(p * (total + 1) + 0.15)),
    ligada: p >= (total + 0.4) / (total + 1),
  };
}

function textos(n, ligada) {
  if (ligada) {
    return {
      estado: "Ligada",
      nome: "Pronta. Insira uma embalagem.",
      porque: "A tela liga quando a última peça encaixa. A partir daqui, cada garrafa vale crédito.",
    };
  }
  if (n === 0) return { estado: "Máquina vazia", nome: "Só o contorno.", porque: "Role para a primeira peça entrar." };
  return { estado: n === N ? "Montada" : "Montando", nome: PECAS[n - 1].nome, porque: PECAS[n - 1].porque };
}

// Pixels de rolagem por peça: mais curto no celular.
const passoPx = () => (window.innerWidth < 600 ? 200 : 380);

// 6.3 A máquina em palco escuro: presa na tela, monta de baixo para cima conforme a rolagem.
// Com menos animação: máquina pronta, lista visível das 9 peças e nenhuma rolagem presa.
export default function Montagem() {
  const menosAnimacao = useMenosAnimacao();
  const [progresso, setProgresso] = useState(0);
  const secaoRef = useRef(null);
  const pinRef = useRef(null);
  const { n, ligada } = menosAnimacao ? { n: N, ligada: true } : passoPorProgresso(progresso);
  const t = textos(n, ligada);

  useLayoutEffect(() => {
    if (menosAnimacao) return undefined;
    const ctx = gsap.context(() => {
      const pecas = pinRef.current.querySelectorAll("[data-peca]");
      const origens = [{ y: 360 }, { x: -320 }, { x: 320 }];
      // O texto segue o desenho: a linha do tempo já vem com o atraso do scrub.
      const tl = gsap.timeline({ paused: true, onUpdate: () => setProgresso(tl.progress()) });
      pecas.forEach((el, i) => {
        const o = origens[i % 3];
        gsap.set(el, { opacity: 0, x: o.x || 0, y: o.y || 0, rotation: (i % 2 ? 1 : -1) * 9, transformOrigin: "50% 50%" });
        tl.to(el, { opacity: 1, x: 0, y: 0, rotation: 0, duration: 0.85, ease: "back.out(1.6)" }, i);
      });
      tl.to({}, { duration: 1 }, N);
      ScrollTrigger.create({
        trigger: pinRef.current,
        start: "top top",
        end: () => `+=${(N + 1) * passoPx()}`,
        pin: true,
        scrub: 0.5,
        invalidateOnRefresh: true,
        animation: tl,
      });
    }, secaoRef);
    return () => ctx.revert();
  }, [menosAnimacao]);

  // Peça nova: nome e motivo entram de baixo.
  useEffect(() => {
    if (menosAnimacao) return;
    const alvos = secaoRef.current.querySelectorAll(".palco__nome, .palco__porque");
    gsap.fromTo(alvos, { y: 14, opacity: 0 }, { y: 0, opacity: 1, duration: 0.35, stagger: 0.05, ease: "power2.out", overwrite: true });
  }, [n, menosAnimacao]);

  // Tela liga: o círculo de luz cresce atrás da máquina e a tela pisca ao acender.
  const ligadaAntes = useRef(false);
  useEffect(() => {
    if (menosAnimacao || ligada === ligadaAntes.current) return;
    ligadaAntes.current = ligada;
    const luz = secaoRef.current.querySelector(".palco__luz");
    gsap.to(luz, { scale: ligada ? 1 : 0, duration: ligada ? 0.7 : 0.3, ease: ligada ? "back.out(1.6)" : "power2.in" });
    const tela = secaoRef.current.querySelector(".maquina-tela-ligada");
    if (ligada && tela) gsap.fromTo(tela, { opacity: 0 }, { opacity: 1, duration: 0.12, repeat: 3, yoyo: true, onComplete: () => gsap.set(tela, { opacity: 1 }) });
  }, [ligada, menosAnimacao]);

  return (
    <section
      className={`palco${menosAnimacao ? " palco--estatico" : ""}${ligada ? " is-on" : ""}`}
      id="como-funciona"
      aria-labelledby="maquina-titulo"
      ref={secaoRef}
    >
      <div className="palco__intro secao__in">
        <h2 className="secao__titulo" id="maquina-titulo">A máquina que dá valor à embalagem.</h2>
        <p className="palco__lead">
          {menosAnimacao
            ? "Aqui está a máquina pronta. Abaixo, as nove peças de baixo para cima e por que cada uma existe."
            : "Nove peças, montadas de baixo para cima. Role devagar: cada uma diz por que existe."}
        </p>
      </div>

      <div className="palco__pin" ref={pinRef}>
        <div className="palco__cena">
          <div className="palco__luz" aria-hidden="true" />
          <div className="palco__svg">
            {menosAnimacao ? <MaquinaSVG telaLigada /> : <PlayerQuadros progresso={progresso} telaLigada={ligada} />}
          </div>
        </div>

        <div className="palco__painel" aria-live="polite">
          <div className="rc-progress-label palco__contagem">
            <span>{rotuloProgresso(n, N)}</span>
            <span className="palco__estado">{t.estado}</span>
          </div>
          <div
            className="rc-progress palco__barra"
            role="progressbar"
            aria-label="Montagem da máquina"
            aria-valuemin={0}
            aria-valuemax={N}
            aria-valuenow={n}
            aria-valuetext={rotuloProgresso(n, N)}
          >
            <div className="rc-progress__bar" style={{ "--rc-progress": `${(n / N) * 100}%` }} />
          </div>
          <p className="palco__num" aria-hidden="true">{String(n).padStart(2, "0")}</p>
          <h3 className="palco__nome">{t.nome}</h3>
          <p className="palco__porque">{t.porque}</p>
        </div>
      </div>

      {/* Equivalente textual da montagem: sempre no HTML; visível quando não há animação. */}
      <div className={menosAnimacao ? "palco__lista secao__in" : "palco__lista sr-only"}>
        <h3 className="palco__lista-titulo">As 9 peças, de baixo para cima</h3>
        <ol className="pecas">
          {PECAS.map((p) => (
            <li key={p.id}>
              <strong>{p.nome}</strong>
              <span>{p.porque}</span>
            </li>
          ))}
        </ol>
      </div>

      <div className="palco__regras secao__in">
        <div className="regra">
          <span className="rc-tag rc-tag--plastico rc-tag--large"><span className="rc-tag__material">Garrafa plástica</span><span className="rc-tag__bin">R$ 0,10</span></span>
        </div>
        <div className="regra">
          <span className="rc-tag rc-tag--metal rc-tag--large"><span className="rc-tag__material">Lata</span><span className="rc-tag__bin">R$ 0,15</span></span>
        </div>
        <div className="regra">
          <span className="rc-tag rc-tag--vidro rc-tag--large"><span className="rc-tag__material">Vidro</span><span className="rc-tag__bin">R$ 0,25</span></span>
        </div>
        <p className="regra__nota">
          Papel, orgânico e rejeito são reconhecidos e devolvidos com a lixeira certa. Abaixo de 70% de certeza, a
          máquina devolve o item e pede para reposicionar.
        </p>
      </div>
    </section>
  );
}
