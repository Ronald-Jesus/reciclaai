import { useLayoutEffect, useRef, useState } from "react";
import gsap from "gsap";
import Icone from "../componentes/Icone.jsx";
import useMenosAnimacao from "../hooks/useMenosAnimacao.js";

// Textos do protótipo aprovado (seção 6.5).
const LOCAIS = [
  {
    id: "mercado", aba: "Supermercados", titulo: "Supermercados", icone: "shopping_cart",
    beneficios: ["O voucher só vale no seu caixa. O crédito volta como venda.", "Quem traz embalagem tem um motivo a mais para voltar à loja."],
  },
  {
    id: "condominio", aba: "Condomínios", titulo: "Condomínios", icone: "apartment",
    beneficios: ["Menos garrafa misturada no lixo comum.", "Material já separado e compactado: a coleta busca menos vezes."],
  },
  {
    id: "escola", aba: "Escolas", titulo: "Escolas e universidades", icone: "school",
    beneficios: ["A máquina vira aula: o aluno vê a câmera decidir o material.", "O voucher pode virar crédito na cantina."],
  },
  {
    id: "evento", aba: "Eventos", titulo: "Eventos", icone: "festival",
    beneficios: ["Lata no chão vira fila na máquina. Menos limpeza no fim.", "O crédito é gasto em bebida no próprio evento."],
  },
];

const PASSO = { ArrowRight: 1, ArrowLeft: -1 };

// 6.5 Para quem: abas no padrão WAI-ARIA (setas, Home e End trocam e movem o foco).
export default function ParaQuem() {
  const [ativa, setAtiva] = useState(0);
  const menosAnimacao = useMenosAnimacao();
  const abas = useRef([]);
  const paineis = useRef([]);
  const anterior = useRef(ativa);

  // O cartão novo "assenta" na sombra, como um botão neo-brutalista solto.
  useLayoutEffect(() => {
    // Só na troca de aba (o StrictMode roda o efeito duas vezes ao montar).
    if (anterior.current === ativa) return;
    anterior.current = ativa;
    const el = paineis.current[ativa];
    if (menosAnimacao || !el) return;
    const tinta = getComputedStyle(document.documentElement).getPropertyValue("--rc-ink").trim() || "#000";
    gsap.fromTo(el, { x: 6, y: 6, boxShadow: `0 0 0 0 ${tinta}` },
      { x: 0, y: 0, boxShadow: `6px 6px 0 0 ${tinta}`, duration: 0.25, ease: "power2.out", clearProps: "boxShadow,transform" });
  }, [ativa, menosAnimacao]);

  function ir(i) {
    setAtiva(i);
    abas.current[i]?.focus();
  }

  function teclas(e, i) {
    const n = LOCAIS.length;
    if (e.key in PASSO) ir((i + PASSO[e.key] + n) % n);
    else if (e.key === "Home") ir(0);
    else if (e.key === "End") ir(n - 1);
    else return;
    e.preventDefault();
  }

  return (
    <section className="quem" id="para-quem" aria-labelledby="quem-titulo">
      <div className="secao__in">
        <h2 className="secao__titulo" id="quem-titulo">
          Onde a máquina se paga.
        </h2>
        <div className="quem__abas rc-segmented" role="tablist" aria-label="Tipo de local">
          {LOCAIS.map((l, i) => (
            <button
              type="button"
              className="rc-segmented__btn"
              role="tab"
              id={`aba-${l.id}`}
              key={l.id}
              aria-controls={`painel-${l.id}`}
              aria-selected={i === ativa}
              aria-pressed={i === ativa}
              tabIndex={i === ativa ? 0 : -1}
              ref={(el) => (abas.current[i] = el)}
              onClick={() => setAtiva(i)}
              onKeyDown={(e) => teclas(e, i)}
            >
              <Icone nome="check" />
              {l.aba}
            </button>
          ))}
        </div>
        {LOCAIS.map((l, i) => (
          <div
            className="quem__painel rc-card"
            role="tabpanel"
            id={`painel-${l.id}`}
            key={l.id}
            aria-labelledby={`aba-${l.id}`}
            hidden={i !== ativa}
            tabIndex={0}
            ref={(el) => (paineis.current[i] = el)}
          >
            <Icone nome={l.icone} className="quem__icone" />
            <h3>{l.titulo}</h3>
            <ul className="beneficios">
              {l.beneficios.map((b) => (
                <li key={b}>{b}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
