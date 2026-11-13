import { useEffect, useRef } from "react";
import useMenosAnimacao from "../hooks/useMenosAnimacao.js";

const LARGURA_MINIMA = 600; // abaixo disso o fundo fica chapado (desempenho)

function corNumero(nome, padrao) {
  const valor = getComputedStyle(document.documentElement).getPropertyValue(nome).trim();
  const m = /^#([0-9a-f]{6})$/i.exec(valor);
  return m ? parseInt(m[1], 16) : padrao;
}

// Fundo animado do topo (Vanta DOTS). Vanta e three são carregados sob demanda.
// Sem animação (menos movimento, tela pequena ou falha do WebGL), sobra o bloco limão do hero.
export default function FundoVanta() {
  const ref = useRef(null);
  const menosAnimacao = useMenosAnimacao();

  useEffect(() => {
    if (menosAnimacao || window.innerWidth < LARGURA_MINIMA) return undefined;
    let efeito = null;
    let cancelado = false;

    // O efeito DOTS lê window.THREE ao carregar: o three precisa vir antes e ser publicado ali.
    import("three")
      .then(async (THREE) => {
        window.THREE = THREE;
        const modVanta = await import("vanta/dist/vanta.dots.min.js");
        if (cancelado || !ref.current) return;
        const DOTS = [modVanta.default?.default, modVanta.default?.DOTS, modVanta.default].find(
          (x) => typeof x === "function",
        );
        if (!DOTS) return;
        efeito = DOTS({
          el: ref.current,
          THREE,
          mouseControls: true,
          touchControls: false,
          gyroControls: false,
          minHeight: 200,
          minWidth: 200,
          scale: 1,
          scaleMobile: 1,
          backgroundColor: corNumero("--md-sys-color-primary-container", 0xc6f432),
          color: corNumero("--rc-ink", 0x000000),
          color2: corNumero("--md-sys-color-primary", 0x506600),
          size: 2.6,
          spacing: 34,
          showLines: false,
        });
      })
      .catch(() => {
        efeito = null; // WebGL ou carregamento falhou: fica o bloco chapado
      });

    return () => {
      cancelado = true;
      if (efeito && typeof efeito.destroy === "function") efeito.destroy();
    };
  }, [menosAnimacao]);

  return <div className="hero__fundo" ref={ref} aria-hidden="true" />;
}
