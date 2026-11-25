import { useRef } from "react";
import { Link } from "react-router-dom";
import gsap from "gsap";
import Icone from "../componentes/Icone.jsx";
import useMenosAnimacao from "../hooks/useMenosAnimacao.js";
import { faiscas } from "../lixeira/efeitos.js";

const FORCA = 0.35;

// 6.8 Fechamento: o botão puxa na direção do cursor e solta faíscas no clique, como no protótipo.
export default function Fechamento() {
  const menosAnimacao = useMenosAnimacao();
  const imaRef = useRef(null);
  const botaoRef = useRef(null);

  function puxar(e) {
    if (menosAnimacao || !window.matchMedia("(pointer: fine)").matches) return;
    const r = imaRef.current.getBoundingClientRect();
    gsap.to(botaoRef.current, {
      x: (e.clientX - r.left - r.width / 2) * FORCA,
      y: (e.clientY - r.top - r.height / 2) * FORCA,
      duration: 0.3,
      ease: "power3.out",
    });
  }

  function soltar() {
    if (!menosAnimacao) gsap.to(botaoRef.current, { x: 0, y: 0, duration: 0.5, ease: "elastic.out(1, 0.4)" });
  }

  function estourar(e) {
    if (menosAnimacao) return;
    // Pelo teclado o clique vem sem coordenadas: usa o meio do botão.
    const r = botaoRef.current.getBoundingClientRect();
    faiscas(e.clientX || r.left + r.width / 2, e.clientY || r.top + r.height / 2, 10, "var(--rc-brand)");
  }

  return (
    <section className="fim" id="testar" aria-labelledby="fim-titulo">
      <div className="secao__in">
        <h2 className="fim__titulo" id="fim-titulo">Teste a IA dessa câmera.</h2>
        <p className="fim__lead">
          Fotografe uma garrafa, uma lata ou um pote. A mesma IA da máquina diz o material, a lixeira certa e quanto vale.
        </p>
        <div className="fim__ima" ref={imaRef} onMouseMove={puxar} onMouseLeave={soltar}>
          <Link className="rc-fab rc-fab--extended rc-fab--large fim__btn" to="/lixeira" ref={botaoRef} onClick={estourar}>
            <Icone nome="photo_camera" />
            <span>Abrir a Lixeira Pessoal</span>
          </Link>
        </div>
      </div>
    </section>
  );
}
