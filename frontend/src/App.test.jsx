import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect } from "vitest";
import App from "./App.jsx";
import { futuroDoRouter } from "./rotas.js";

function renderizarEm(rota) {
  return render(
    <MemoryRouter initialEntries={[rota]} future={futuroDoRouter}>
      <App />
    </MemoryRouter>
  );
}

describe("App", () => {
  it("renderiza a página inicial", () => {
    renderizarEm("/");
    expect(screen.getByRole("heading", { name: "ReciclaAI" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /lixeira pessoal/i })).toBeInTheDocument();
  });

  it("renderiza a lixeira pessoal em /lixeira", () => {
    renderizarEm("/lixeira");
    expect(screen.getByRole("heading", { name: "Lixeira pessoal" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /página inicial/i })).toBeInTheDocument();
  });
});
