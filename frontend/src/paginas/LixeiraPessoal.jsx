import { useEffect, useReducer, useRef, useState } from "react";
import Topo from "../componentes/Topo.jsx";
import Rodape from "../componentes/Rodape.jsx";
import Botao from "../componentes/Botao.jsx";
import useMenosAnimacao from "../hooks/useMenosAnimacao.js";
import Captura from "../lixeira/Captura.jsx";
import Resultado from "../lixeira/Resultado.jsx";
import Sacola, { SACOLA_TITULO } from "../lixeira/Sacola.jsx";
import Legenda from "../lixeira/Legenda.jsx";
import BarraLixeira from "../lixeira/BarraLixeira.jsx";
import Mapa from "../lixeira/Mapa.jsx";
import { sacolaReducer, SACOLA_VAZIA } from "../lixeira/sacola.js";
import { irPara } from "../lixeira/rolar.js";
import { faiscas, voar } from "../lixeira/efeitos.js";
import "../lixeira/lixeira.css";

const AVISO_MS = 6000; // snackbar "Adicionada à sacola" some sozinho, como no protótipo
const titulo = (id) => document.getElementById(id);

// shortcut: a sacola vive só no estado React (some ao recarregar); localStorage não ajuda
// porque a URL blob: da miniatura morre com a página. Guardar a foto exigiria IndexedDB.
export default function LixeiraPessoal() {
  const [resultado, setResultado] = useState(null); // { id, resposta, url, adicionados }
  const [sacola, despachar] = useReducer(sacolaReducer, SACOLA_VAZIA);
  const [avisoSacola, setAvisoSacola] = useState(false);
  const [pedidoCaptura, setPedidoCaptura] = useState(0); // muda para levar o foco à captura
  const menosAnimacao = useMenosAnimacao();
  const tituloRef = useRef(null);
  const capturaRef = useRef(null);
  const barraSacolaRef = useRef(null); // ícone da sacola na barra inferior (celular)
  const legendaRef = useRef(null);
  const origemLegenda = useRef(null); // botão que abriu a legenda: recebe o foco de volta
  const proximoId = useRef(0);
  const urlsRef = useRef(new Set()); // URLs de foto que esta página ainda usa

  // O botão "Analisar foto" some: o foco vai para o título do resultado.
  useEffect(() => {
    if (resultado) tituloRef.current?.focus();
  }, [resultado?.id]);

  // "Fotografar outra" / "Fotografar mais": rola até a captura e foca o primeiro botão dela.
  useEffect(() => {
    if (!pedidoCaptura) return;
    irPara(capturaRef.current?.querySelector("button"));
  }, [pedidoCaptura]);

  useEffect(() => {
    if (!avisoSacola) return undefined;
    const t = setTimeout(() => setAvisoSacola(false), AVISO_MS);
    return () => clearTimeout(t);
  }, [avisoSacola]);

  // Libera a URL de uma foto quando nada mais a mostra (nem o resultado, nem a sacola,
  // nem o item que ainda pode voltar com "Desfazer"). Várias unidades dividem a mesma URL.
  useEffect(() => {
    const vivas = new Set(
      [resultado?.url, ...[...sacola.itens, ...(sacola.removido?.itens.map((r) => r.item) ?? [])].map((i) => i.url)].filter(Boolean)
    );
    urlsRef.current.forEach((url) => vivas.has(url) || URL.revokeObjectURL(url));
    urlsRef.current = vivas;
  });
  useEffect(() => () => urlsRef.current.forEach((url) => URL.revokeObjectURL(url)), []);

  function receber(resposta, url) {
    proximoId.current += 1;
    setAvisoSacola(false);
    setResultado({ id: proximoId.current, resposta, url, adicionados: 0 });
  }

  function novaFoto() {
    setAvisoSacola(false);
    setResultado(null);
    setPedidoCaptura((n) => n + 1);
  }

  function abrirLegenda(evento) {
    origemLegenda.current = evento.currentTarget;
    legendaRef.current?.showModal();
    legendaRef.current?.focus();
  }

  // "+" na sacola: mais uma unidade igual à última daquele material (mesma foto, id novo).
  function maisUm(item) {
    proximoId.current += 1;
    despachar({ tipo: "adicionar", item: { ...item, id: proximoId.current } });
  }

  // Cada clique põe mais uma unidade (id próprio; a foto é a mesma).
  function colocar(evento) {
    const { url, resposta } = resultado;
    proximoId.current += 1;
    despachar({
      tipo: "adicionar",
      item: { id: proximoId.current, url, classe: resposta.prediction.class, machine: resposta.machine },
    });
    setResultado((r) => ({ ...r, adicionados: r.adicionados + 1 }));
    setAvisoSacola(true);
    if (menosAnimacao) return;
    const botao = evento.currentTarget.getBoundingClientRect();
    faiscas(evento.clientX || botao.left + botao.width / 2, evento.clientY || botao.top + botao.height / 2);
    // No celular a sacola fica longe: a miniatura voa até o ícone da sacola na barra inferior.
    const icone = barraSacolaRef.current;
    const alvo = icone?.offsetParent ? icone : titulo(SACOLA_TITULO); // offsetParent nulo: barra escondida
    if (alvo) voar(url, botao, alvo.getBoundingClientRect());
  }

  const verSacola = () => irPara(titulo(SACOLA_TITULO));

  return (
    <>
      <Topo />
      <main id="conteudo" tabIndex={-1}>
        <section className="lx-pagina">
          <div className="secao__in lx-pagina__in">
            <div className="lx-cabeca">
              <div>
                <h1 className="secao__titulo">Lixeira pessoal</h1>
                <p className="secao__lead">
                  Tire ou envie a foto de uma embalagem. A IA diz qual é o material.
                </p>
              </div>
              <Botao variante="tonal" pequeno icone="palette" aria-haspopup="dialog" onClick={abrirLegenda}>
                Legenda
              </Botao>
            </div>

            <div className="lx-layout">
              <div className="lx-layout__principal" id="fotografar">
                <div aria-live="polite">
                  {resultado && (
                    <Resultado
                      resposta={resultado.resposta}
                      url={resultado.url}
                      tituloRef={tituloRef}
                      adicionados={resultado.adicionados}
                      avisoSacola={avisoSacola}
                      onColocar={colocar}
                      onNovaFoto={novaFoto}
                      onVerSacola={verSacola} // o snackbar fica até o tempo acabar: sumir antes deslocaria a rolagem
                      onVerLegenda={abrirLegenda}
                    />
                  )}
                </div>
                <div ref={capturaRef}>{!resultado && <Captura onResultado={receber} />}</div>
              </div>

              <div className="lx-layout__lateral">
                <Sacola
                  itens={sacola.itens}
                  removido={sacola.removido}
                  onRemover={(id) => despachar({ tipo: "remover", id })}
                  onRemoverGrupo={(classe) => despachar({ tipo: "removerGrupo", classe })}
                  onMais={maisUm}
                  onDesfazer={() => despachar({ tipo: "desfazer" })}
                  onLimpar={() => despachar({ tipo: "limpar" })}
                  onFotografarMais={novaFoto}
                />
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

      <Legenda dialogRef={legendaRef} onFechar={() => origemLegenda.current?.focus()} />
      <BarraLixeira quantidade={sacola.itens.length} sacolaRef={barraSacolaRef} />
    </>
  );
}
