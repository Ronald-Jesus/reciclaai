// Ícone do Material Symbols Rounded. Decorativo por padrão (aria-hidden).
export default function Icone({ nome, preenchido = false, rotulo, className = "", ...resto }) {
  const classes = ["rc-icon", preenchido ? "rc-icon--fill" : "", className].filter(Boolean).join(" ");
  const acessibilidade = rotulo ? { role: "img", "aria-label": rotulo } : { "aria-hidden": "true" };
  return (
    <span className={classes} {...acessibilidade} {...resto}>
      {nome}
    </span>
  );
}
