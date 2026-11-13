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
    expect(screen.getByRole("heading", { level: 1, name: /embalagem devolvida/i })).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: /testar o app/i }).length).toBeGreaterThan(0);
  });

  it("renderiza a lixeira pessoal em /lixeira", () => {
    renderizarEm("/lixeira");
    expect(screen.getByRole("heading", { name: "Lixeira pessoal" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /voltar para a página inicial/i })).toBeInTheDocument();
  });
});
