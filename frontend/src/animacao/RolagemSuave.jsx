import useRolagemSuave from "../hooks/useRolagemSuave.js";

// Componente sem visual: só liga a rolagem suave enquanto estiver na tela.
export default function RolagemSuave() {
  useRolagemSuave();
  return null;
}
