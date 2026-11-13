import { CREDITOS } from "../dados/creditos.js";

export default function Rodape() {
  return (
    <footer className="rodape">
      <div className="secao__in rodape__in">
        <p className="rodape__marca">ReciclaAI</p>
        <div>
          <p>
            <strong>Fontes</strong>
          </p>
          <ul>
            <li>Cores da coleta seletiva: Resolução CONAMA nº 275/2001.</li>
          </ul>
          <p className="rodape__sub">
            <strong>Fotos</strong>
          </p>
          <ul>
            {CREDITOS.map((f) => (
              <li key={f.arquivo}>
                <a href={f.link} target="_blank" rel="noopener noreferrer">
                  {f.autor}
                </a>
                , {f.licenca}
              </li>
            ))}
          </ul>
        </div>
        <p className="rodape__nota">
          Projeto Integrador · Engenharia de Software · CEUB 2026/2. A máquina é um conceito: não é
          fabricada nem vendida. Fotos de bancos gratuitos, com crédito ao fotógrafo.
        </p>
      </div>
    </footer>
  );
}
