import { useEffect, useState } from "react";
import Icone from "../componentes/Icone.jsx";

const SECOES = [
  { id: "fotografar", rotulo: "Fotografar", icone: "photo_camera" },
  { id: "sacola", rotulo: "Sacola", icone: "shopping_bag" },
  { id: "mapa", rotulo: "Mapa", icone: "map" },
];

// Barra inferior do celular (some no CSS a partir de 720 px), como no app do protótipo.
// Marca com aria-current a seção que está no meio da tela.
export default function BarraLixeira({ quantidade, sacolaRef }) {
  const [atual, setAtual] = useState("fotografar");

  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return undefined;
    const observador = new IntersectionObserver(
      (entradas) => entradas.forEach((e) => e.isIntersecting && setAtual(e.target.id)),
      { rootMargin: "-45% 0px -50% 0px" } // uma faixa fina no meio da tela
    );
    SECOES.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (el) observador.observe(el);
    });
    return () => observador.disconnect();
  }, []);

  return (
    <nav className="rc-navbar rc-navbar--fixed lx-barra" aria-label="Seções da lixeira">
      {SECOES.map(({ id, rotulo, icone }) => (
        <a
          key={id}
          href={`#${id}`}
          className="rc-navbar__item"
          aria-current={atual === id ? "location" : undefined}
          aria-label={id === "sacola" ? `Sacola, ${quantidade} ${quantidade === 1 ? "item" : "itens"}` : undefined}
          onClick={() => setAtual(id)}
        >
          <span className="rc-navbar__indicator" ref={id === "sacola" ? sacolaRef : undefined}>
            <Icone nome={icone} />
            {id === "sacola" && (
              <span className="rc-badge rc-badge--anchored rc-num" aria-hidden="true">
                {quantidade}
              </span>
            )}
          </span>
          <span className="rc-navbar__label">{rotulo}</span>
        </a>
      ))}
    </nav>
  );
}
