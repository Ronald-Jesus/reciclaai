import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import Icone from "./Icone.jsx";
import Botao from "./Botao.jsx";

const LINKS = [
  { id: "como-funciona", texto: "Como funciona" },
  { id: "para-quem", texto: "Para quem" },
  { id: "simulador", texto: "Simulador" },
  { id: "duvidas", texto: "Dúvidas" },
];

export default function Topo() {
  const [aberto, setAberto] = useState(false);
  const botaoMenu = useRef(null);
  const fechar = () => setAberto(false);

  useEffect(() => {
    if (!aberto) return undefined;
    const aoTeclar = (e) => {
      if (e.key === "Escape") {
        setAberto(false);
        botaoMenu.current?.focus();
      }
    };
    const aoRedimensionar = () => {
      if (window.innerWidth >= 1040) setAberto(false);
    };
    document.addEventListener("keydown", aoTeclar);
    window.addEventListener("resize", aoRedimensionar);
    return () => {
      document.removeEventListener("keydown", aoTeclar);
      window.removeEventListener("resize", aoRedimensionar);
    };
  }, [aberto]);

  return (
    <>
    <a className="skip" href="#conteudo">
      Pular para o conteúdo
    </a>
    <header className={`topo${aberto ? " is-open" : ""}`} id="topo">
      <div className="topo__in">
        <Link className="marca" to="/" aria-label="ReciclaAI, início" onClick={fechar}>
          <span className="marca__selo" aria-hidden="true">
            <Icone nome="recycling" preenchido />
          </span>
          <span className="marca__nome">ReciclaAI</span>
        </Link>
        <button
          ref={botaoMenu}
          className="topo__menu rc-btn rc-btn--outlined rc-btn--small"
          type="button"
          aria-expanded={aberto}
          aria-controls="nav-principal"
          onClick={() => setAberto((a) => !a)}
        >
          <Icone nome={aberto ? "close" : "menu"} />
          <span>Menu</span>
        </button>
        <nav className="topo__nav" id="nav-principal" aria-label="Principal">
          <ul>
            {LINKS.map((l) => (
              <li key={l.id}>
                <a href={`/#${l.id}`} onClick={fechar}>
                  {l.texto}
                </a>
              </li>
            ))}
            <li>
              <Link className="topo__app" to="/lixeira" onClick={fechar}>
                <Icone nome="photo_camera" />
                Testar o app
              </Link>
            </li>
          </ul>
        </nav>
        <Botao className="topo__cta" pequeno href="/#simulador" onClick={fechar}>
          Ver o simulador
        </Botao>
      </div>
    </header>
    </>
  );
}
