import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import Icone from "../componentes/Icone.jsx";
import Botao from "../componentes/Botao.jsx";
import useMenosAnimacao from "../hooks/useMenosAnimacao.js";
import { MATERIAIS } from "../dados/materiais.js";
import { abrirSessao, encerrarSessao, inserirNaMaquina } from "./api.js";
import { brl } from "./sacola.js";
import { TotalAnimado } from "./Sacola.jsx";

export const DEPOSITO_TITULO = "lx-deposito-titulo";
const SEM_CONEXAO = "Não consegui falar com a máquina. Confira a conexão e tente de novo.";

const linhasDe = (itens) => itens.map((item) => ({ item, estado: "fila" }));

// Cópia antiga (execCommand) para quando a área de transferência não está liberada.
function copiarAntigo(texto) {
  const area = document.createElement("textarea");
  area.value = texto;
  area.setAttribute("readonly", "");
  area.style.position = "fixed";
  area.style.opacity = "0";
  document.body.append(area);
  area.select();
  let ok = false;
  try {
    ok = document.execCommand("copy");
  } catch {
    ok = false;
  }
  area.remove();
  return ok;
}

function Status({ estado, motivo }) {
  if (estado === "aceito")
    return (
      <p className="lx-status lx-status--ok">
        <Icone nome="check_circle" preenchido />
        <span>Aceito</span>
      </p>
    );
  if (estado === "devolvido")
    return (
      <p className="lx-status lx-status--volta">
        <Icone nome="undo" preenchido />
        <span>{`Devolvido · ${motivo}`}</span>
      </p>
    );
  if (estado === "conferindo")
    return (
      <p className="lx-status">
        <Icone nome="progress_activity" className="lx-gira" />
        <span>Conferindo…</span>
      </p>
    );
  return (
    <p className="lx-status lx-status--fila">
      <Icone nome="schedule" />
      <span>Na fila</span>
    </p>
  );
}

// "Cheguei na máquina": manda cada unidade da sacola para a máquina de verdade (sessão no Flask).
// A lixeira só estimou; quem decide e paga é a máquina. `itens` é a sacola no momento do clique.
export default function Deposito({ itens, onDepositados, onFechar, onFotografar }) {
  const [linhas, setLinhas] = useState(() => linhasDe(itens));
  const [voucher, setVoucher] = useState(null); // { codigo, valor }
  const [erro, setErro] = useState("");
  const [tentativa, setTentativa] = useState(0);
  const [copia, setCopia] = useState(""); // retorno do "Copiar código"
  const menosAnimacao = useMenosAnimacao();
  const tituloRef = useRef(null);
  const listaRef = useRef(null);
  const voucherRef = useRef(null);
  const aoDepositar = useRef(onDepositados);
  aoDepositar.current = onDepositados;

  // No celular o painel troca de altura e a tela fica fora dele. Salto direto: a rolagem
  // suave (scrollIntoView smooth) era cancelada aqui pelo Lenis.
  useEffect(() => {
    tituloRef.current?.closest("section").scrollIntoView?.({ block: "start", behavior: "instant" });
    tituloRef.current?.focus({ preventScroll: true });
  }, []);

  useEffect(() => {
    const controle = new AbortController();
    const sinal = controle.signal;
    const marcar = (i, dados) => setLinhas((ls) => ls.map((l, j) => (j === i ? { ...l, ...dados } : l)));
    setLinhas(linhasDe(itens));
    setErro("");
    (async () => {
      try {
        const sessao = await abrirSessao(sinal);
        const fotos = new Map(); // várias unidades dividem a mesma foto
        const aceitos = [];
        for (let i = 0; i < itens.length; i += 1) {
          const { id, url } = itens[i];
          marcar(i, { estado: "conferindo" });
          if (!fotos.has(url)) fotos.set(url, await (await fetch(url, { signal: sinal })).blob());
          const r = await inserirNaMaquina(sessao, fotos.get(url), sinal);
          if (r.accepted) aceitos.push(id);
          marcar(i, { estado: r.accepted ? "aceito" : "devolvido", motivo: r.reason, valor: r.value });
        }
        const fim = await encerrarSessao(sessao, sinal);
        setVoucher({ codigo: fim.voucher, valor: fim.amount });
        aoDepositar.current(aceitos);
      } catch (e) {
        if (e?.name === "AbortError") return;
        // shortcut: a sessão que falhou no meio fica aberta no servidor, sem voucher; tentar de novo abre outra.
        setErro(`${e?.status ? e.message : SEM_CONEXAO} Sua sacola continua igual.`);
      }
    })();
    return () => controle.abort();
  }, [itens, tentativa]);

  // Linhas entram em cascata; o voucher "imprime" como no protótipo.
  useEffect(() => {
    if (menosAnimacao || !listaRef.current) return undefined;
    const t = gsap.from(listaRef.current.children, { opacity: 0, y: 12, duration: 0.35, stagger: 0.06, ease: "power2.out", clearProps: "all" });
    return () => t.revert();
  }, [menosAnimacao]);

  useEffect(() => {
    if (!voucher) return undefined;
    voucherRef.current?.querySelector("h3")?.focus({ preventScroll: true });
    voucherRef.current?.scrollIntoView?.({ block: "nearest", behavior: "instant" });
    if (menosAnimacao) return undefined;
    const t = gsap.from(voucherRef.current.querySelector(".lx-voucher__cartao"), {
      y: 40, rotateX: -35, scale: 0.9, opacity: 0, transformPerspective: 600, duration: 0.7, ease: "back.out(1.6)", clearProps: "all",
    });
    return () => t.revert();
  }, [voucher, menosAnimacao]);

  async function copiar() {
    setCopia("");
    try {
      await navigator.clipboard.writeText(voucher.codigo);
      setCopia("Código copiado");
    } catch {
      setCopia(copiarAntigo(voucher.codigo) ? "Código copiado" : "Não deu para copiar. Selecione o código e copie.");
    }
  }

  const feitos = linhas.filter((l) => l.estado === "aceito" || l.estado === "devolvido").length;
  const pct = Math.round((feitos / linhas.length) * 100);

  return (
    <section id="sacola" className="lx-sacola lx-deposito rc-card" aria-labelledby={DEPOSITO_TITULO}>
      <h2 id={DEPOSITO_TITULO} ref={tituloRef} tabIndex={-1} className="lx-resultado__titulo">
        Conferindo na máquina
      </h2>

      <div aria-live="polite">
        <p className="rc-progress-label">
          <span id="lx-deposito-etapa">{voucher ? "Conferência concluída" : "Conferindo as embalagens…"}</span>
          <span className="rc-num">{`${feitos} de ${linhas.length}`}</span>
        </p>
      </div>
      <div className="rc-progress" role="progressbar" aria-labelledby="lx-deposito-etapa" aria-valuemin="0" aria-valuemax="100" aria-valuenow={pct}>
        <div className="rc-progress__bar" style={{ "--rc-progress": `${pct}%` }} />
      </div>

      <ul ref={listaRef} className="lx-sacola__lista" data-lenis-prevent>
        {linhas.map(({ item, estado, motivo, valor }) => {
          const nome = MATERIAIS[item.classe]?.rotulo ?? item.classe;
          return (
            <li key={item.id} className={`lx-sacola__item lx-conferencia is-${estado}`}>
              <img className="lx-sacola__foto" src={item.url} alt="" />
              <div className="lx-sacola__info">
                <p className="lx-sacola__nome">{nome}</p>
                <Status estado={estado} motivo={motivo} />
              </div>
              <p className="rc-num lx-sacola__subtotal">{brl(valor ?? item.machine.value)}</p>
            </li>
          );
        })}
      </ul>

      {erro && (
        <div className="lx-mensagens">
          <p className="lx-erro" role="alert">
            <Icone nome="error" preenchido />
            {erro}
          </p>
          <div className="lx-acoes">
            <Botao icone="refresh" onClick={() => setTentativa((n) => n + 1)}>
              Tentar de novo
            </Botao>
            <Botao variante="outlined" icone="arrow_back" onClick={onFechar}>
              Voltar para a sacola
            </Botao>
          </div>
        </div>
      )}

      {!erro && !voucher && (
        <div className="lx-acoes">
          <Botao variante="outlined" icone="close" onClick={onFechar}>
            Cancelar
          </Botao>
        </div>
      )}

      {voucher && (
        <article ref={voucherRef} className="lx-voucher" aria-labelledby="lx-voucher-titulo">
          <div className="rc-card rc-card--primary lx-voucher__cartao">
            <h3 id="lx-voucher-titulo" tabIndex={-1} className="lx-voucher__titulo">
              <Icone nome={voucher.codigo ? "confirmation_number" : "info"} preenchido />
              {voucher.codigo ? "Voucher ReciclaAI" : "Nenhuma embalagem aceita"}
            </h3>
            <p className="lx-voucher__valor rc-num">
              <TotalAnimado valor={voucher.valor} desde={0} />
              <span className="sr-only">{brl(voucher.valor)}</span>
            </p>
            <p className="lx-voucher__codigo rc-num" aria-label={voucher.codigo ? "Código do voucher" : undefined}>
              {voucher.codigo ?? "Sem voucher desta vez"}
            </p>
            {voucher.codigo && (
              <div className="lx-voucher__copiar">
                <Botao icone={copia === "Código copiado" ? "check" : "content_copy"} onClick={copiar}>
                  Copiar código
                </Botao>
                <p className="lx-voucher__copia" role="status">
                  {copia}
                </p>
              </div>
            )}
          </div>
          <p className="lx-dica">
            <Icone nome="info" />
            {voucher.codigo
              ? "Mostre o código no caixa do local da máquina. O valor volta como desconto na compra."
              : "A máquina devolveu tudo. Os itens continuam na sua sacola."}
          </p>
          <Botao variante="outlined" icone="add_a_photo" onClick={onFotografar}>
            Fotografar outra embalagem
          </Botao>
        </article>
      )}
    </section>
  );
}
