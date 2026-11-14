// Leva a seção do elemento para a tela e põe o foco nele (o título precisa de tabIndex -1).
export function irPara(el) {
  if (!el) return;
  const menos = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  (el.closest("section") ?? el).scrollIntoView?.({ behavior: menos ? "auto" : "smooth", block: "start" });
  el.focus({ preventScroll: true });
}
