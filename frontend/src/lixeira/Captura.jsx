import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import Icone from "../componentes/Icone.jsx";
import Botao from "../componentes/Botao.jsx";
import useMenosAnimacao from "../hooks/useMenosAnimacao.js";
import { validarArquivo } from "./validarArquivo.js";
import { analisarFoto, statusModelo } from "./api.js";

export const VARREDURA_MINIMA_MS = import.meta.env.MODE === "test" ? 0 : 2500;

const OUTRAS_FORMAS = "Arraste, cole (Ctrl+V) ou escolha uma foto do aparelho.";

function pararFluxo(fluxo) {
  if (typeof fluxo?.getTracks === "function") fluxo.getTracks().forEach((t) => t.stop());
}

// Captura da foto: câmera, arquivo, arrastar e colar. Ao terminar a análise chama
// onResultado(respostaDoPredict, urlDaFoto); quem recebe a URL passa a cuidar dela.
// `focar`: põe o foco na área da foto ao abrir (usado em "Analisar outra foto").
export default function Captura({ onResultado, focar = false }) {
  const menosAnimacao = useMenosAnimacao();
  const [foto, setFoto] = useState(null); // { arquivo, url, nome }
  const [erro, setErro] = useState("");
  const [aviso, setAviso] = useState("");
  const [avisoCamera, setAvisoCamera] = useState("");
  const [modeloPronto, setModeloPronto] = useState(true);
  const [camera, setCamera] = useState(null); // MediaStream aberto
  const [analisando, setAnalisando] = useState(false);
  const [arrastando, setArrastando] = useState(false);

  const refs = {
    alvo: useRef(null),
    camera: useRef(null),
    tirar: useRef(null),
    analisar: useRef(null),
    cancelar: useRef(null),
  };
  const entradaRef = useRef(null);
  const videoRef = useRef(null);
  const quadroRef = useRef(null);
  const linhaRef = useRef(null);
  const controleRef = useRef(null); // AbortController da análise em andamento
  const receberRef = useRef(null);
  const vivoRef = useRef(true);
  const fluxoRef = useRef(null); // câmera aberta ou sendo aberta
  const urlRef = useRef(null); // URL da foto que ainda é desta tela
  const focoRef = useRef(focar ? "alvo" : null); // botão que recebe o foco no próximo render

  // O botão clicado some na troca de estado: o foco vai para o equivalente.
  useEffect(() => {
    if (!focoRef.current) return;
    refs[focoRef.current].current?.focus();
    focoRef.current = null;
  });

  // Pergunta ao servidor se o modelo já foi treinado. Sem resposta, não bloqueia nada.
  useEffect(() => {
    vivoRef.current = true;
    statusModelo()
      .then((dados) => vivoRef.current && setModeloPronto(dados.model_ready !== false))
      .catch((e) => vivoRef.current && e.status === 503 && setModeloPronto(false));
    return () => {
      vivoRef.current = false;
      controleRef.current?.abort();
      pararFluxo(fluxoRef.current);
      fluxoRef.current = null;
      liberarUrl();
    };
  }, []);

  function liberarUrl() {
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    urlRef.current = null;
  }

  function trocarFoto(nova) {
    liberarUrl();
    urlRef.current = nova?.url ?? null;
    setFoto(nova);
  }

  function fecharCamera() {
    pararFluxo(fluxoRef.current);
    fluxoRef.current = null;
    setCamera(null);
  }

  function receberArquivo(arquivo) {
    if (fluxoRef.current) fecharCamera();
    setAviso("");
    setAvisoCamera("");
    const r = validarArquivo(arquivo);
    if (!r.ok) {
      trocarFoto(null); // a foto anterior sai: Analisar fica inativo (HU-03)
      setErro(r.mensagem);
      return;
    }
    setErro("");
    trocarFoto({ arquivo, url: URL.createObjectURL(arquivo), nome: arquivo.name || "Foto colada" });
  }
  receberRef.current = receberArquivo;

  // Ctrl+V em qualquer lugar da página, inclusive com a câmera aberta.
  useEffect(() => {
    function aoColar(e) {
      const arquivo = e.clipboardData?.files?.[0];
      if (!arquivo || controleRef.current) return;
      e.preventDefault();
      receberRef.current(arquivo);
    }
    document.addEventListener("paste", aoColar);
    return () => document.removeEventListener("paste", aoColar);
  }, []);

  // Liga o vídeo ao fluxo da câmera.
  useEffect(() => {
    const video = videoRef.current;
    if (!camera || !video) return;
    video.srcObject = camera;
    video.play?.()?.catch?.(() => {});
  }, [camera]);

  // Linha de varredura sobre a foto enquanto analisa.
  useEffect(() => {
    if (!analisando || menosAnimacao || !linhaRef.current) return undefined;
    const tween = gsap.fromTo(
      linhaRef.current,
      { y: 0 },
      {
        y: () => (quadroRef.current?.clientHeight || 0) - 8,
        duration: 1.1,
        ease: "sine.inOut",
        repeat: -1,
        yoyo: true,
      }
    );
    return () => tween.kill();
  }, [analisando, menosAnimacao]);

  async function abrirCamera() {
    setAvisoCamera("");
    if (fluxoRef.current) return; // já aberta ou abrindo (clique duplo)
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      setAvisoCamera(`A câmera só funciona em endereço seguro (HTTPS). ${OUTRAS_FORMAS}`);
      return;
    }
    fluxoRef.current = "abrindo";
    try {
      const fluxo = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: false,
      });
      // Desmontou ou a câmera foi fechada (ex.: colou uma foto) enquanto o navegador perguntava.
      if (!vivoRef.current || fluxoRef.current !== "abrindo") {
        pararFluxo(fluxo);
        return;
      }
      fluxoRef.current = fluxo;
      focoRef.current = "tirar";
      setCamera(fluxo);
    } catch (e) {
      if (fluxoRef.current === "abrindo") fluxoRef.current = null;
      if (!vivoRef.current) return;
      setAvisoCamera(
        e?.name === "NotAllowedError"
          ? `Você não liberou a câmera. ${OUTRAS_FORMAS}`
          : `Não encontrei uma câmera disponível. ${OUTRAS_FORMAS}`
      );
    }
  }

  function tirarFoto() {
    const video = videoRef.current;
    if (!video?.videoWidth) {
      setAvisoCamera("Espere a câmera abrir.");
      return;
    }
    const tela = document.createElement("canvas");
    tela.width = video.videoWidth;
    tela.height = video.videoHeight;
    tela.getContext("2d").drawImage(video, 0, 0);
    tela.toBlob(
      (blob) => {
        if (!vivoRef.current) return;
        focoRef.current = "camera";
        if (blob) receberArquivo(new File([blob], "foto-da-camera.jpg", { type: "image/jpeg" }));
        else fecharCamera();
      },
      "image/jpeg",
      0.9
    );
  }

  function remover() {
    trocarFoto(null);
    setErro("");
    setAviso("");
    focoRef.current = "alvo";
  }

  async function analisar() {
    if (!foto) return;
    const controle = new AbortController();
    controleRef.current = controle;
    setErro("");
    setAviso("");
    focoRef.current = "cancelar";
    setAnalisando(true);
    try {
      // A IA responde em menos de meio segundo; a varredura fica visível por um tempo mínimo (2,5 s).
      const minimo = menosAnimacao ? 0 : VARREDURA_MINIMA_MS;
      const [resposta] = await Promise.all([
        analisarFoto(foto.arquivo, controle.signal),
        new Promise((ok) => setTimeout(ok, minimo)),
      ]);
      if (controle.signal.aborted) throw new DOMException("Análise cancelada.", "AbortError");
      urlRef.current = null; // a URL agora é de quem recebe o resultado
      onResultado(resposta, foto.url);
    } catch (e) {
      if (e?.name === "AbortError") setAviso("Análise cancelada. Analise de novo ou troque a foto.");
      else if (e.status === 503) setModeloPronto(false);
      else setErro(e.status ? e.message : "Não consegui falar com o servidor. Confira a conexão e tente de novo.");
    } finally {
      controleRef.current = null;
      focoRef.current = "analisar";
      setAnalisando(false);
    }
  }

  function soltar(e) {
    e.preventDefault();
    setArrastando(false);
    receberArquivo(e.dataTransfer?.files?.[0]);
  }

  function sobre(e) {
    e.preventDefault();
    setArrastando(true);
  }

  return (
    <div className="lx-captura">
      <div role="status" className="lx-mensagens">
        {!modeloPronto && (
          <p className="lx-aviso">
            <Icone nome="hourglass_top" />
            A IA ainda não está pronta neste servidor. Você pode escolher a foto, mas a análise só
            funciona depois que o modelo for treinado.
          </p>
        )}
        {aviso && (
          <p className="lx-aviso lx-aviso--neutro">
            <Icone nome="info" />
            {aviso}
          </p>
        )}
      </div>

      <div role="alert" className="lx-mensagens">
        {erro && (
          <p className="lx-erro">
            <Icone nome="error" preenchido />
            {erro}
          </p>
        )}
        {avisoCamera && (
          <p className="lx-erro">
            <Icone nome="no_photography" />
            {avisoCamera}
          </p>
        )}
      </div>

      {analisando ? (
        <div className="lx-analise">
          <div className="lx-varredura" ref={quadroRef}>
            <img src={foto.url} alt="Foto em análise" />
            <span
              ref={linhaRef}
              className={`lx-varredura__linha${menosAnimacao ? " is-parada" : ""}`}
              aria-hidden="true"
            />
          </div>
          <p className="lx-analise__titulo">Analisando…</p>
          <p className="lx-analise__texto">Procurando o material da embalagem na foto.</p>
          <button
            ref={refs.cancelar}
            type="button"
            className="rc-btn rc-btn--outlined"
            onClick={() => controleRef.current?.abort()}
          >
            <Icone nome="close" />
            Cancelar análise
          </button>
        </div>
      ) : camera ? (
        <div className="lx-camera">
          <video ref={videoRef} className="lx-camera__video" playsInline muted aria-label="Imagem da câmera" />
          <div className="lx-acoes">
            <button ref={refs.tirar} type="button" className="rc-btn rc-btn--filled" onClick={tirarFoto}>
              <Icone nome="photo_camera" />
              Tirar foto
            </button>
            <Botao
              variante="outlined"
              icone="close"
              onClick={() => {
                focoRef.current = "camera";
                fecharCamera();
              }}
            >
              Fechar câmera
            </Botao>
          </div>
        </div>
      ) : (
        <>
          <div
            className={`lx-soltar${arrastando ? " is-sobre" : ""}${foto ? " tem-foto" : ""}`}
            onDragEnter={sobre}
            onDragOver={sobre}
            onDragLeave={(e) => {
              if (!e.currentTarget.contains(e.relatedTarget)) setArrastando(false);
            }}
            onDrop={soltar}
          >
            {foto ? (
              <div className="lx-previa">
                <img className="lx-previa__foto" src={foto.url} alt={`Foto escolhida: ${foto.nome}`} />
                <p className="lx-previa__nome">{foto.nome}</p>
                <div className="lx-previa__acoes">
                  <Botao variante="text" pequeno icone="swap_horiz" onClick={() => entradaRef.current?.click()}>
                    Trocar foto
                  </Botao>
                  <Botao variante="text" pequeno icone="delete" onClick={remover}>
                    Remover foto
                  </Botao>
                </div>
              </div>
            ) : (
              <button
                ref={refs.alvo}
                type="button"
                className="lx-soltar__alvo"
                onClick={() => entradaRef.current?.click()}
              >
                <span className="lx-soltar__icone rc-icon rc-icon--fill" aria-hidden="true">
                  add_a_photo
                </span>
                <span className="lx-soltar__titulo">Arraste uma foto aqui</span>
                <span className="lx-soltar__texto">
                  ou cole com <kbd>Ctrl</kbd> + <kbd>V</kbd>. Também dá para clicar e procurar no aparelho.
                </span>
              </button>
            )}
          </div>

          <div className="lx-acoes">
            <button
              ref={refs.camera}
              type="button"
              className={`rc-btn ${foto ? "rc-btn--tonal" : "rc-btn--filled"}`}
              onClick={abrirCamera}
            >
              <Icone nome="photo_camera" />
              Usar câmera
            </button>
            <Botao variante="outlined" icone="image" onClick={() => entradaRef.current?.click()}>
              Escolher foto
            </Botao>
            <button
              ref={refs.analisar}
              type="button"
              className="rc-btn rc-btn--filled"
              disabled={!foto}
              onClick={analisar}
            >
              <Icone nome="search" />
              Analisar foto
            </button>
          </div>
          <p className="lx-dica">
            <Icone nome="info" />
            Fotos em JPG, PNG ou WEBP, até 5 MB.
          </p>
        </>
      )}

      <input
        ref={entradaRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        hidden
        onChange={(e) => {
          receberArquivo(e.target.files[0]);
          e.target.value = "";
        }}
      />
    </div>
  );
}
