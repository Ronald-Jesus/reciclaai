import { useEffect } from "react";
import Lenis from "lenis";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import useMenosAnimacao from "./useMenosAnimacao.js";

gsap.registerPlugin(ScrollTrigger);

// Liga a rolagem suave (Lenis), movida pelo ticker do GSAP.
// Não faz nada quando o sistema pede menos animação.
export default function useRolagemSuave() {
  const menosAnimacao = useMenosAnimacao();

  useEffect(() => {
    if (menosAnimacao) return undefined;

    const lenis = new Lenis({ anchors: { offset: -72 } });
    lenis.on("scroll", ScrollTrigger.update);
    const passo = (tempo) => lenis.raf(tempo * 1000);
    gsap.ticker.add(passo);
    gsap.ticker.lagSmoothing(0);

    return () => {
      gsap.ticker.remove(passo);
      gsap.ticker.lagSmoothing(500, 33);
      lenis.destroy();
    };
  }, [menosAnimacao]);
}
