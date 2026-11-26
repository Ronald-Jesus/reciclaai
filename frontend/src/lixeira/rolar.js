import { lenisAtual } from "../hooks/useRolagemSuave.js";

// Leva a seção do elemento para a tela e põe o foco nele (o título precisa de tabIndex -1).
// Com o Lenis ligado quem rola é ele: a rolagem nativa suave (scrollIntoView smooth) ele cancela.
// Sem Lenis (menos animação) é salto direto. Os dois respeitam o scroll-margin-top da seção.
export function irPara(el) {
  if (!el) return;
  const alvo = el.closest("section") ?? el;
  const lenis = lenisAtual();
  if (lenis) {
    const menos = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    lenis.scrollTo(alvo, { immediate: menos });
  } else {
    alvo.scrollIntoView?.({ block: "start" });
  }
  el.focus({ preventScroll: true });
}
