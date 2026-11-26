import { useLayoutEffect, useRef, useState } from "react";
import gsap from "gsap";
import Icone from "../componentes/Icone.jsx";
import { DIAS_POR_MES, INICIAL, MISTURAS, VALOR, simular } from "../dados/simulador.js";
import useMenosAnimacao from "../hooks/useMenosAnimacao.js";

const numero = (v) => Math.round(v).toLocaleString("pt-BR");
const reais = (v) => `R$ ${numero(v)}`;
const centavos = (v) => `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;

// Limites e passos do protótipo aprovado (seção 6.4).
const CONTROLES = [
  { campo: "pessoasPorDia", id: "sim-pessoas", rotulo: "Pessoas por dia no local", min: 100, max: 5000, step: 50, mostra: numero, anuncia: (v) => `${numero(v)} pessoas` },
  { campo: "trazemPct", id: "sim-trazem", rotulo: "Quantas trazem embalagens", min: 5, max: 60, step: 1, mostra: (v) => `${v}%` },
  { campo: "embalagensPorPessoa", id: "sim-por", rotulo: "Embalagens por pessoa", min: 1, max: 20, step: 1, mostra: String, anuncia: (v) => `${v} embalagens` },
];

const CHAVES = Object.keys(MISTURAS);

// Estilo do React Bits "CountUp": o número sobe do valor anterior até o novo.
// O número animado fica fora da árvore de acessibilidade; o leitor de tela lê só o valor final.
function Contagem({ valor, formatar }) {
  const ref = useRef(null);
  // Valor na tela agora: se o controle mexe no meio da contagem, a próxima parte daqui.
  const mostrado = useRef(valor);
  const menosAnimacao = useMenosAnimacao();

  useLayoutEffect(() => {
    const el = ref.current;
    if (menosAnimacao || mostrado.current === valor) {
      mostrado.current = valor;
      el.textContent = formatar(valor);
      return undefined;
    }
    const estado = { v: mostrado.current };
    const tween = gsap.to(estado, {
      v: valor, duration: 0.6, ease: "power2.out",
      onUpdate: () => {
        mostrado.current = estado.v;
        el.textContent = formatar(estado.v);
      },
    });
    return () => tween.kill();
  }, [valor, formatar, menosAnimacao]);

  return (
    <>
      <span aria-hidden="true" ref={ref} />
      <span className="sr-only">{formatar(valor)}</span>
    </>
  );
}

// 6.4 Simulador: a conta fica em dados/simulador.js; aqui só os controles e as saídas.
export default function Simulador() {
  const [entrada, setEntrada] = useState(INICIAL);
  const r = simular(entrada);
  const botoes = useRef([]);

  function escolher(i) {
    setEntrada((e) => ({ ...e, mistura: CHAVES[i] }));
    botoes.current[i]?.focus();
  }

  function teclasMistura(e, i) {
    const d = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
    if (!d) return;
    e.preventDefault();
    escolher((i + d + CHAVES.length) % CHAVES.length);
  }

  return (
    <section className="impacto" id="simulador" aria-labelledby="sim-titulo">
      <div className="secao__in">
        <h2 className="secao__titulo" id="sim-titulo">
          Faça a conta do seu local.
        </h2>
        <p className="secao__lead">Mexa nos três números. O resultado é por mês, com os valores que a máquina paga.</p>

        <div className="sim">
          <form className="sim__entradas rc-card" aria-describedby="sim-nota" onSubmit={(e) => e.preventDefault()}>
            {CONTROLES.map((c) => {
              const v = entrada[c.campo];
              return (
                <div className="sim__campo" key={c.id}>
                  <label htmlFor={c.id}>{c.rotulo}</label>
                  <div className="sim__linha">
                    <input
                      type="range"
                      id={c.id}
                      min={c.min}
                      max={c.max}
                      step={c.step}
                      value={v}
                      aria-valuetext={(c.anuncia ?? c.mostra)(v)}
                      style={{ "--fill": `${((v - c.min) / (c.max - c.min)) * 100}%` }}
                      onChange={(e) => setEntrada((atual) => ({ ...atual, [c.campo]: Number(e.target.value) }))}
                    />
                    <output htmlFor={c.id}>{c.mostra(v)}</output>
                  </div>
                </div>
              );
            })}
            <fieldset className="sim__campo sim__mix">
              <legend>O que mais chega</legend>
              <div className="rc-segmented rc-segmented--block" role="radiogroup" aria-label="Mistura de embalagens">
                {CHAVES.map((k, i) => {
                  const marcado = entrada.mistura === k;
                  return (
                    <button
                      type="button"
                      className="rc-segmented__btn"
                      role="radio"
                      key={k}
                      aria-checked={marcado}
                      tabIndex={marcado ? 0 : -1}
                      ref={(el) => (botoes.current[i] = el)}
                      onClick={() => escolher(i)}
                      onKeyDown={(e) => teclasMistura(e, i)}
                    >
                      <Icone nome="check" />
                      {MISTURAS[k].rotulo}
                    </button>
                  );
                })}
              </div>
              <p className="sim__mixtxt">{MISTURAS[entrada.mistura].texto}</p>
            </fieldset>
          </form>

          <div className="sim__saidas" aria-live="polite">
            <div className="saida rc-card rc-card--primary">
              <p className="saida__rotulo">Embalagens por mês</p>
              <p className="saida__valor">
                <Contagem valor={r.mes} formatar={numero} />
              </p>
              <p className="saida__extra">que deixam de ir para a rua</p>
            </div>
            <div className="saida rc-card">
              <p className="saida__rotulo">Crédito que volta ao caixa</p>
              <p className="saida__valor">
                <Contagem valor={r.credito} formatar={reais} />
              </p>
              <p className="saida__extra">por mês, em vouchers gastos no próprio local</p>
            </div>
            <div className="saida rc-card rc-card--filled">
              <p className="saida__rotulo">Em um ano</p>
              <p className="saida__valor saida__valor--menor">
                <Contagem valor={r.ano} formatar={numero} />
              </p>
              <p className="saida__extra">embalagens separadas por material</p>
            </div>
          </div>
        </div>
        <p className="sim__nota" id="sim-nota">
          Conta: pessoas × quantas trazem × embalagens × {DIAS_POR_MES} dias. Valores por embalagem: PET{" "}
          {centavos(VALOR.pet)}, lata {centavos(VALOR.lata)}, vidro {centavos(VALOR.vidro)}. É uma simulação, não uma
          promessa.
        </p>
      </div>
    </section>
  );
}
