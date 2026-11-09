import { FOTOS } from "../dados/creditos.js";
import FraseRevelada from "../componentes/FraseRevelada.jsx";

const PASSOS = [
  {
    foto: FOTOS.rua,
    frase: "Toda garrafa aqui já teve dono.",
    texto: "Depois de beber, ninguém volta para buscar. Para quem joga fora, a embalagem não vale nada. Por isso ela fica na rua.",
    lado: "a",
  },
  { foto: FOTOS.calcada, frase: "Na calçada, ela vira lixo.", lado: "b" },
  { foto: FOTOS.rio, frase: "A chuva leva até o rio.", lado: "a" },
  { foto: FOTOS.praia, frase: "O rio entrega na praia.", lado: "b" },
];

// 6.1 Abertura com o problema: fotos grandes e frases reveladas ao rolar.
export default function Problema() {
  return (
    <section className="fotos" id="problema" aria-label="O problema, em fotos">
      {PASSOS.map(({ foto, frase, texto, lado }, i) => (
        <div className={`passo passo--${lado}`} key={foto.arquivo}>
          <figure className="foto">
            <img
              className="foto__img"
              src={`/fotos/${foto.arquivo}`}
              alt={foto.alt}
              width="1600"
              height="1000"
              loading={i === 0 ? "eager" : "lazy"}
              decoding="async"
            />
            <figcaption className="foto__credito">
              Foto: <a href={foto.link} target="_blank" rel="noopener noreferrer">{foto.autor}</a> · {foto.licenca}
            </figcaption>
          </figure>
          <div className="passo__texto">
            <FraseRevelada className="frase">{frase}</FraseRevelada>
            {texto && <p className="passo__paragrafo">{texto}</p>}
          </div>
        </div>
      ))}
      <p className="pergunta">
        E se cada garrafa valesse dinheiro <em>para quem devolve</em>?
      </p>
    </section>
  );
}
