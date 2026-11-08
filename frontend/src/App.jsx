import { Routes, Route } from "react-router-dom";
import PaginaInicial from "./paginas/PaginaInicial.jsx";
import LixeiraPessoal from "./paginas/LixeiraPessoal.jsx";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<PaginaInicial />} />
      <Route path="/lixeira" element={<LixeiraPessoal />} />
    </Routes>
  );
}
