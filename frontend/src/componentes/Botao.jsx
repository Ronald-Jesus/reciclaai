import { Link } from "react-router-dom";
import Icone from "./Icone.jsx";

const VARIANTES = ["filled", "tonal", "outlined", "text"];

// Botão do sistema (.rc-btn). Com `para` vira link de rota; com `href`, link comum.
export default function Botao({
  variante = "filled",
  pequeno = false,
  bloco = false,
  icone,
  para,
  href,
  className = "",
  children,
  ...resto
}) {
  const v = VARIANTES.includes(variante) ? variante : "filled";
  const classes = [
    "rc-btn",
    `rc-btn--${v}`,
    pequeno ? "rc-btn--small" : "",
    bloco ? "rc-btn--block" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");
  const conteudo = (
    <>
      {icone ? <Icone nome={icone} /> : null}
      {children}
    </>
  );
  if (para) {
    return (
      <Link className={classes} to={para} {...resto}>
        {conteudo}
      </Link>
    );
  }
  if (href) {
    return (
      <a className={classes} href={href} {...resto}>
        {conteudo}
      </a>
    );
  }
  return (
    <button className={classes} type="button" {...resto}>
      {conteudo}
    </button>
  );
}
