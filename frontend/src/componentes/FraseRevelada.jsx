import { Fragment, useLayoutEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import useMenosAnimacao from "../hooks/useMenosAnimacao.js";

gsap.registerPlugin(ScrollTrigger);

// Efeito no estilo do React Bits "ScrollFloat": as letras sobem conforme a rolagem.
// Refeito com GSAP ScrollTrigger. Com menos animação, mostra o texto direto.
export default function FraseRevelada({ children, className = "" }) {
  const ref = useRef(null);
  const menosAnimacao = useMenosAnimacao();
  const texto = String(children);

  useLayoutEffect(() => {
    if (menosAnimacao || !ref.current) return undefined;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        ref.current.querySelectorAll(".float-c"),
        { yPercent: 120, scaleY: 2.2, scaleX: 0.7, opacity: 0, transformOrigin: "50% 0%" },
        {
          yPercent: 0, scaleY: 1, scaleX: 1, opacity: 1, ease: "back.inOut(2)", stagger: 0.03,
          scrollTrigger: { trigger: ref.current, start: "top 88%", end: "bottom 55%", scrub: true },
        },
      );
    }, ref);
    return () => ctx.revert();
  }, [menosAnimacao, texto]);

  if (menosAnimacao) return <p className={className}>{texto}</p>;
  return (
    <p className={className} ref={ref}>
      <span className="sr-only">{texto}</span>
      <span aria-hidden="true">
        {texto.split(" ").map((palavra, w, todas) => (
          <Fragment key={w}>
            <span className="float-p">
              {palavra.split("").map((c, i) => (
                <span className="float-c" key={i}>
                  {c}
                </span>
              ))}
            </span>
            {w < todas.length - 1 ? " " : ""}
          </Fragment>
        ))}
      </span>
    </p>
  );
}
