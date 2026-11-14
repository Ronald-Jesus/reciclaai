import { useLayoutEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { FOTOS } from "../dados/creditos.js";
import FraseRevelada from "../componentes/FraseRevelada.jsx";
import useMenosAnimacao from "../hooks/useMenosAnimacao.js";

gsap.registerPlugin(ScrollTrigger);

const PASSOS = [
  {
    foto: FOTOS.rua,
    frase: "Toda garrafa aqui já teve dono.",
    texto: "Depois de beber, ninguém volta para buscar. Para quem joga fora, a embalagem não vale nada. Por isso ela fica na rua.",
    lado: "a",
  },
  { foto: FOTOS.calcada, frase: "Na calçada, ela vira lixo.", lado: "b" },
  { foto: FOTOS.rio, frase: "A chuva leva até o rio.", lado: "a" },
  { foto: FOTOS.praia, frase: "O rio entrega na praia.", lado: "b" },
];

// 6.1 Abertura com o problema: fotos grandes e frases reveladas ao rolar.
export default function Problema() {
  const ref = useRef(null);
  const menosAnimacao = useMenosAnimacao();

  // Cada foto sobe e desgira enquanto a página rola (como no protótipo).
  useLayoutEffect(() => {
    if (menosAnimacao || !ref.current) return undefined;
    const ctx = gsap.context(() => {
      ref.current.querySelectorAll(".foto").forEach((f, i) => {
        gsap.fromTo(
          f,
          { y: 60, rotation: i % 2 ? 1.5 : -1.5 },
          { y: 0, rotation: 0, ease: "none", scrollTrigger: { trigger: f, start: "top bottom", end: "top 40%", scrub: true } }
        );
      });
    }, ref);
    return () => ctx.revert();
  }, [menosAnimacao]);

  return (
    <section className="fotos" id="problema" aria-label="O problema, em fotos" ref={ref}>
      {PASSOS.map(({ foto, frase, texto, lado }, i) => (
        <div className={`passo passo--${lado}`} key={foto.arquivo}>
          <figure className="foto">
            <img
              className="foto__img"
              src={`/fotos/${foto.arquivo}`}
              alt={foto.alt}
              width="1600"
              height="1000"
              loading={i === 0 ? "eager" : "lazy"}
              decoding="async"
            />
            <figcaption className="foto__credito">
              Foto: <a href={foto.link} target="_blank" rel="noopener noreferrer">{foto.autor}</a> · {foto.licenca}
            </figcaption>
          </figure>
          <div className="passo__texto">
            <FraseRevelada className="frase">{frase}</FraseRevelada>
          </div>
          {/* Cartão preso no canto da foto, ligando a imagem à frase. */}
          {texto && <p className="passo__paragrafo">{texto}</p>}
        </div>
      ))}
      <p className="pergunta">
        E se cada garrafa valesse dinheiro <em>para quem devolve</em>?
      </p>
    </section>
  );
}
