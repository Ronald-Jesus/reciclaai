import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect } from "vitest";
import Topo from "./Topo.jsx";
import { futuroDoRouter } from "../rotas.js";

function renderizar() {
  return render(
    <MemoryRouter future={futuroDoRouter}>
      <Topo />
    </MemoryRouter>
  );
}

describe("Topo", () => {
  it("Topo tem link para a lixeira pessoal", () => {
    renderizar();
    expect(screen.getByRole("link", { name: /testar o app/i })).toHaveAttribute("href", "/lixeira");
  });

  it("tem as âncoras da página inicial", () => {
    renderizar();
    for (const [nome, id] of [
      ["Como funciona", "como-funciona"],
      ["Para quem", "para-quem"],
      ["Simulador", "simulador"],
      ["Dúvidas", "duvidas"],
    ]) {
      expect(screen.getByRole("link", { name: nome })).toHaveAttribute("href", `/#${id}`);
    }
  });

  it("o botão do menu informa se está aberto", () => {
    renderizar();
    const botao = screen.getByRole("button", { name: /menu/i });
    expect(botao).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(botao);
    expect(botao).toHaveAttribute("aria-expanded", "true");
  });

  it("Esc fecha o menu e devolve o foco ao botão", () => {
    renderizar();
    const botao = screen.getByRole("button", { name: /menu/i });
    fireEvent.click(botao);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(botao).toHaveAttribute("aria-expanded", "false");
    expect(botao).toHaveFocus();
  });

  it("clicar em um link do menu o fecha", () => {
    renderizar();
    const botao = screen.getByRole("button", { name: /menu/i });
    fireEvent.click(botao);
    fireEvent.click(screen.getByRole("link", { name: "Dúvidas" }));
    expect(botao).toHaveAttribute("aria-expanded", "false");
  });

  it("tem o link para pular ao conteúdo", () => {
    renderizar();
    expect(screen.getByRole("link", { name: /pular para o conteúdo/i })).toHaveAttribute("href", "#conteudo");
  });
});
