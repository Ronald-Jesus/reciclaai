import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import useMenosAnimacao from "../hooks/useMenosAnimacao.js";

gsap.registerPlugin(ScrollTrigger);

const formatar = (v, casas) =>
  v.toLocaleString("pt-BR", { minimumFractionDigits: casas, maximumFractionDigits: casas });

// Efeito no estilo do React Bits "CountUp": o número conta de 0 até o valor final ao entrar na tela.
// O valor final já está no HTML (leitores de tela e menos animação veem o número certo).
export default function NumeroAnimado({ valor, casas = 0 }) {
  const ref = useRef(null);
  const menosAnimacao = useMenosAnimacao();
  const final = formatar(valor, casas);

  useEffect(() => {
    const el = ref.current;
    if (menosAnimacao || !el) return undefined;
    const estado = { v: 0 };
    el.textContent = formatar(0, casas);
    const gatilho = ScrollTrigger.create({
      trigger: el,
      start: "top 85%",
      once: true,
      onEnter: () =>
        gsap.to(estado, {
          v: valor, duration: 1.6, ease: "power2.out",
          onUpdate: () => { el.textContent = formatar(estado.v, casas); },
          onComplete: () => { el.textContent = final; },
        }),
    });
    return () => {
      gatilho.kill();
      gsap.killTweensOf(estado);
      el.textContent = final;
    };
  }, [menosAnimacao, valor, casas, final]);

  return <span ref={ref}>{final}</span>;
}
