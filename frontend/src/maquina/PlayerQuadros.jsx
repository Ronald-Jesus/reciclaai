import { memo, useEffect, useRef, useState } from "react";
import MaquinaSVG from "./MaquinaSVG.jsx";
import { existemQuadros, nomeDoQuadro, PASTA_QUADROS, TOTAL_QUADROS } from "./quadros.js";

// O vídeo começa montado e termina explodido: a montagem é o vídeo ao contrário.
// Progresso 0 é o último quadro (peças soltas); 1 é o primeiro (máquina pronta).
export function quadroDoProgresso(progresso, total = TOTAL_QUADROS) {
  const p = Math.min(1, Math.max(0, progresso));
  return total - Math.round(p * (total - 1));
}

// O SVG não muda com o progresso (as peças são animadas pelo GSAP), só com a tela.
const SVG = memo(MaquinaSVG);

// Desenha no <canvas> o quadro do progresso. Enquanto confere os quadros, ou sem eles, mostra o SVG.
export default function PlayerQuadros({ progresso = 0, telaLigada = false }) {
  const [temQuadros, setTemQuadros] = useState(false);
  const canvasRef = useRef(null);
  const imagens = useRef([]);
  const quadro = quadroDoProgresso(progresso);

  useEffect(() => {
    let vivo = true;
    existemQuadros().then((sim) => vivo && sim && setTemQuadros(true));
    return () => {
      vivo = false;
    };
  }, []);

  function desenhar() {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx) return;
    // usa o quadro carregado mais próximo enquanto os outros chegam
    let k = quadro - 1;
    const pronto = (img) => img?.complete && img.naturalWidth;
    while (k < TOTAL_QUADROS - 1 && !pronto(imagens.current[k])) k++;
    const img = imagens.current[k];
    if (!pronto(img)) return;
    const { width: cw, height: ch } = canvas;
    const s = Math.min(cw / img.naturalWidth, ch / img.naturalHeight);
    const w = img.naturalWidth * s;
    const h = img.naturalHeight * s;
    ctx.clearRect(0, 0, cw, ch);
    ctx.drawImage(img, (cw - w) / 2, (ch - h) / 2, w, h);
  }
  const desenharRef = useRef(desenhar);
  desenharRef.current = desenhar;

  // Carrega os quadros e acompanha o tamanho do canvas.
  useEffect(() => {
    if (!temQuadros) return undefined;
    const canvas = canvasRef.current;
    const ajustar = () => {
      const r = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(r.width * dpr);
      canvas.height = Math.round(r.height * dpr);
      desenharRef.current();
    };
    imagens.current = Array.from({ length: TOTAL_QUADROS }, (_, i) => {
      const img = new Image();
      img.decoding = "async";
      img.onload = () => desenharRef.current();
      img.src = PASTA_QUADROS + nomeDoQuadro(i + 1);
      return img;
    });
    ajustar();
    window.addEventListener("resize", ajustar);
    return () => window.removeEventListener("resize", ajustar);
  }, [temQuadros]);

  useEffect(() => {
    if (temQuadros) desenhar();
  });

  if (!temQuadros) return <SVG telaLigada={telaLigada} />;
  return <canvas ref={canvasRef} className="palco__canvas" data-quadro={nomeDoQuadro(quadro)} aria-hidden="true" />;
}
