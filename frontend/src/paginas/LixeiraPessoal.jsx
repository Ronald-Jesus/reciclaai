import Topo from "../componentes/Topo.jsx";
import Rodape from "../componentes/Rodape.jsx";
import Botao from "../componentes/Botao.jsx";

export default function LixeiraPessoal() {
  return (
    <>
      <Topo />
      <main id="conteudo" tabIndex={-1}>
        <section className="secao-provisoria">
          <div className="secao__in">
            <h1 className="secao__titulo">Lixeira pessoal</h1>
            <p className="secao__lead">
              Conteúdo provisório: aqui o aplicativo identificará o material do resíduo.
            </p>
            <div className="hero__acoes">
              <Botao variante="outlined" para="/">
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
