import { useLayoutEffect, useRef } from "react";
import gsap from "gsap";
import Topo from "../componentes/Topo.jsx";
import Rodape from "../componentes/Rodape.jsx";
import Botao from "../componentes/Botao.jsx";
import FundoVanta from "../componentes/FundoVanta.jsx";
import Problema from "../secoes/Problema.jsx";
import Contraste from "../secoes/Contraste.jsx";
import Icone from "../componentes/Icone.jsx";
import useMenosAnimacao from "../hooks/useMenosAnimacao.js";

const TITULO = "Embalagem devolvida é cliente de volta.";

const SECOES = [
  { id: "como-funciona", titulo: "Como funciona" },
  { id: "para-quem", titulo: "Para quem" },
  { id: "simulador", titulo: "Simulador" },
  { id: "duvidas", titulo: "Dúvidas" },
];

// Abertura: título entra palavra por palavra (estilo React Bits "SplitText", refeito com GSAP).
// Com menos animação, tudo aparece parado.
function Hero() {
  const ref = useRef(null);
  const menosAnimacao = useMenosAnimacao();

  useLayoutEffect(() => {
    if (menosAnimacao || !ref.current) return undefined;
    const ctx = gsap.context(() => {
      gsap.from(ref.current.querySelectorAll(".split-w > span"), {
        yPercent: 110, rotation: 6, duration: 0.9, ease: "back.out(1.4)", stagger: 0.07, delay: 0.15,
      });
      gsap.from(ref.current.querySelectorAll(".hero__sobre, .hero__lead, .hero__acoes, .hero__rolar"), {
        y: 24, opacity: 0, duration: 0.6, stagger: 0.08, delay: 0.55, ease: "power3.out",
      });
    }, ref);
    return () => ctx.revert();
  }, [menosAnimacao]);

  return (
    <section className="hero" aria-labelledby="hero-titulo" ref={ref}>
      <FundoVanta />
      <div className="hero__in">
        <p className="hero__sobre">Máquina de retorno de embalagens com câmera e IA</p>
        <h1 className="hero__titulo" id="hero-titulo">
          {menosAnimacao ? (
            TITULO
          ) : (
            <>
              <span className="sr-only">{TITULO}</span>
              <span aria-hidden="true">
                {TITULO.split(" ").map((palavra, i) => (
                  <span key={i}>
                    {i > 0 && " "}
                    <span className="split-w">
                      <span>{palavra}</span>
                    </span>
                  </span>
                ))}
              </span>
            </>
          )}
        </h1>
        <p className="hero__lead">
          Seu cliente traz o que ia para o lixo e sai com crédito para usar na próxima compra. Com você.
        </p>
        {/* Uma ação só: "Testar o app" fica no Topo e "Role para ver" segue a história. */}
        <div className="hero__acoes">
          <Botao href="#como-funciona">Ver a máquina por dentro</Botao>
        </div>
      </div>
      <a className="hero__rolar" href="#problema">
        <Icone nome="south" />
        Role para ver
      </a>
    </section>
  );
}

export default function PaginaInicial() {
  return (
    <>
      <Topo />
      <main id="conteudo" tabIndex={-1}>
        <Hero />
        <Problema />
        <Contraste />
        {SECOES.map((s) => (
          <section className="secao-provisoria" id={s.id} key={s.id} aria-labelledby={`${s.id}-titulo`}>
            <div className="secao__in">
              <h2 className="secao__titulo" id={`${s.id}-titulo`}>
                {s.titulo}
              </h2>
              <p className="secao__lead">Conteúdo provisório: esta seção será preenchida nas próximas partes.</p>
            </div>
          </section>
        ))}
      </main>
      <Rodape />
    </>
  );
}
