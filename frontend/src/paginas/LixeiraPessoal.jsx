import { useEffect, useReducer, useRef, useState } from "react";
import Topo from "../componentes/Topo.jsx";
import Rodape from "../componentes/Rodape.jsx";
import Botao from "../componentes/Botao.jsx";
import Captura from "../lixeira/Captura.jsx";
import Resultado from "../lixeira/Resultado.jsx";
import Sacola from "../lixeira/Sacola.jsx";
import Legenda from "../lixeira/Legenda.jsx";
import Mapa from "../lixeira/Mapa.jsx";
import { sacolaReducer, SACOLA_VAZIA } from "../lixeira/sacola.js";
import "../lixeira/lixeira.css";

// shortcut: a sacola vive só no estado React (some ao recarregar); localStorage não ajuda
// porque a URL blob: da miniatura morre com a página. Guardar a foto exigiria IndexedDB.
export default function LixeiraPessoal() {
  const [resultado, setResultado] = useState(null); // { id, resposta, url }
  const [sacola, despachar] = useReducer(sacolaReducer, SACOLA_VAZIA);
  const [focarCaptura, setFocarCaptura] = useState(false);
  const tituloRef = useRef(null);
  const proximoId = useRef(0);
  const urlsRef = useRef(new Set()); // URLs de foto que esta página ainda usa

  // O botão "Analisar foto" some: o foco vai para o título do resultado.
  useEffect(() => {
    if (resultado) tituloRef.current?.focus();
  }, [resultado]);

  // Libera a URL de uma foto quando nada mais a mostra (nem o resultado, nem a sacola,
  // nem o item que ainda pode voltar com "Desfazer").
  useEffect(() => {
    const vivas = new Set(
      [resultado?.url, ...sacola.itens.map((i) => i.url), sacola.removido?.item.url].filter(Boolean)
    );
    urlsRef.current.forEach((url) => vivas.has(url) || URL.revokeObjectURL(url));
    urlsRef.current = vivas;
  });
  useEffect(() => () => urlsRef.current.forEach((url) => URL.revokeObjectURL(url)), []);

  function receber(resposta, url) {
    proximoId.current += 1;
    setResultado({ id: proximoId.current, resposta, url });
  }

  function novaFoto() {
    setFocarCaptura(true);
    setResultado(null);
  }

  function colocar() {
    const { id, url, resposta } = resultado;
    despachar({ tipo: "adicionar", item: { id, url, classe: resposta.prediction.class, machine: resposta.machine } });
  }

  // "na": já está na sacola; "removido": pode voltar com "Desfazer" (não pode duplicar).
  const naSacola = !resultado
    ? undefined
    : sacola.itens.some((i) => i.id === resultado.id)
      ? "na"
      : sacola.removido?.item.id === resultado.id
        ? "removido"
        : undefined;

  return (
    <>
      <Topo />
      <main id="conteudo" tabIndex={-1}>
        <section className="lx-pagina">
          <div className="secao__in lx-pagina__in">
            <div className="lx-cabeca">
              <h1 className="secao__titulo">Lixeira pessoal</h1>
              <p className="secao__lead">
                Tire ou envie a foto de uma embalagem. A IA diz qual é o material.
              </p>
            </div>

            <div className="lx-layout">
              <div className="lx-layout__principal">
                <div aria-live="polite">
                  {resultado && (
                    <Resultado
                      resposta={resultado.resposta}
                      url={resultado.url}
                      tituloRef={tituloRef}
                      naSacola={naSacola}
                      onColocar={colocar}
                      onNovaFoto={novaFoto}
                    />
                  )}
                </div>
                {!resultado && <Captura onResultado={receber} focar={focarCaptura} />}
              </div>

              <div className="lx-layout__lateral">
                <Sacola
                  itens={sacola.itens}
                  removido={sacola.removido}
                  onRemover={(id) => despachar({ tipo: "remover", id })}
                  onDesfazer={() => despachar({ tipo: "desfazer" })}
                  onLimpar={() => despachar({ tipo: "limpar" })}
                />
                <Legenda />
              </div>
            </div>

            {/* Sempre visível: dá para ver onde fica a máquina antes da primeira foto. */}
            <Mapa />

            <div className="hero__acoes">
              <Botao variante="text" para="/">
                Voltar para a página inicial
              </Botao>
            </div>
          </div>
        </section>
      </main>
      <Rodape />
    </>
  );
}
