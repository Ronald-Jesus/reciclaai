import { Link } from "react-router-dom";

export default function PaginaInicial() {
  return (
    <main>
      <h1>ReciclaAI</h1>
      <p>Conteúdo provisório: aqui ficará a apresentação da máquina de reciclagem.</p>
      <Link to="/lixeira">Ir para a lixeira pessoal</Link>
    </main>
  );
}
