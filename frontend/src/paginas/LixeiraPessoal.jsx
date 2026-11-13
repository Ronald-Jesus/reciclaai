import { useEffect, useRef, useState } from "react";
import Topo from "../componentes/Topo.jsx";
import Rodape from "../componentes/Rodape.jsx";
import Botao from "../componentes/Botao.jsx";
import Captura from "../lixeira/Captura.jsx";
import { MATERIAIS } from "../dados/materiais.js";
import "../lixeira/lixeira.css";

// shortcut: resumo simples do resultado; a issue #44 troca por Resultado.jsx e a sacola.
function Resumo({ resposta, tituloRef }) {
  if (resposta.nao_reconhecido) {
    return (
      <p ref={tituloRef} tabIndex={-1} className="lx-resumo__titulo">
        Não reconheci uma embalagem nesta foto.
      </p>
    );
  }
  const { prediction } = resposta;
  const material = MATERIAIS[prediction.class];
  const confianca = String(prediction.confidence).replace(".", ",");
  return (
    <>
      <p ref={tituloRef} tabIndex={-1} className="lx-resumo__titulo">
        {material?.rotulo ?? prediction.label ?? prediction.class}
      </p>
      <p className="lx-resumo__texto">{confianca}% de confiança</p>
    </>
  );
}

export default function LixeiraPessoal() {
  const [resultado, setResultado] = useState(null); // { resposta, url }
  const [focarCaptura, setFocarCaptura] = useState(false);
  const tituloRef = useRef(null);
  const urlRef = useRef(null);

  // O botão "Analisar foto" some: o foco vai para o título do resultado.
  useEffect(() => {
    if (resultado) tituloRef.current?.focus();
  }, [resultado]);

  // A URL da foto analisada é desta página: libera ao sair.
  useEffect(() => () => urlRef.current && URL.revokeObjectURL(urlRef.current), []);

  function receber(resposta, url) {
    urlRef.current = url;
    setResultado({ resposta, url });
  }

  function novaFoto() {
    URL.revokeObjectURL(urlRef.current);
    urlRef.current = null;
    setFocarCaptura(true);
    setResultado(null);
  }

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

            <div aria-live="polite">
              {resultado && (
                <div className="lx-resumo">
                  <img className="lx-resumo__foto" src={resultado.url} alt="Foto analisada" />
                  <div>
                    <Resumo resposta={resultado.resposta} tituloRef={tituloRef} />
                    <Botao className="lx-resumo__acao" icone="add_a_photo" onClick={novaFoto}>
                      Analisar outra foto
                    </Botao>
                  </div>
                </div>
              )}
            </div>
            {!resultado && <Captura onResultado={receber} focar={focarCaptura} />}

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
