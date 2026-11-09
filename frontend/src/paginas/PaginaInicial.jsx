import Topo from "../componentes/Topo.jsx";
import Rodape from "../componentes/Rodape.jsx";
import Botao from "../componentes/Botao.jsx";
import FundoVanta from "../componentes/FundoVanta.jsx";
import Problema from "../secoes/Problema.jsx";
import Contraste from "../secoes/Contraste.jsx";

const SECOES = [
  { id: "como-funciona", titulo: "Como funciona" },
  { id: "para-quem", titulo: "Para quem" },
  { id: "simulador", titulo: "Simulador" },
  { id: "duvidas", titulo: "Dúvidas" },
];

export default function PaginaInicial() {
  return (
    <>
      <Topo />
      <main id="conteudo" tabIndex={-1}>
        <section className="hero" aria-labelledby="hero-titulo">
          <FundoVanta />
          <div className="hero__in">
            <p className="hero__sobre">Máquina de retorno de embalagens com câmera e IA</p>
            <h1 className="hero__titulo" id="hero-titulo">
              Embalagem devolvida é cliente de volta.
            </h1>
            <div className="hero__acoes">
              <Botao href="#como-funciona">Ver a máquina por dentro</Botao>
              <Botao variante="outlined" para="/lixeira">
                Testar o app
              </Botao>
            </div>
          </div>
        </section>
        <Problema />
        <Contraste />
        {SECOES.map((s) => (
          <section className="secao-provisoria" id={s.id} key={s.id} aria-labelledby={`${s.id}-titulo`}>
            <div className="secao__in">
              <h2 className="secao__titulo" id={`${s.id}-titulo`}>
                {s.titulo}
              </h2>
              <p className="secao__lead">Conteúdo provisório: esta seção será preenchida nas próximas partes.</p>
            </div>
          </section>
        ))}
      </main>
      <Rodape />
    </>
  );
}
