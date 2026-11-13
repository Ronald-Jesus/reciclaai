import { useEffect, useState } from "react";

const CONSULTA = "(prefers-reduced-motion: reduce)";

function ler() {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
  return window.matchMedia(CONSULTA).matches;
}

// Verdadeiro quando o sistema pede menos animação. Acompanha mudanças em tempo real.
export default function useMenosAnimacao() {
  const [menos, setMenos] = useState(ler);

  useEffect(() => {
    if (typeof window.matchMedia !== "function") return undefined;
    const consulta = window.matchMedia(CONSULTA);
    const aoMudar = (evento) => setMenos(evento.matches);
    setMenos(consulta.matches);
    consulta.addEventListener("change", aoMudar);
    return () => consulta.removeEventListener("change", aoMudar);
  }, []);

  return menos;
}
