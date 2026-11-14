import { render, screen, fireEvent, act } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect, vi } from "vitest";
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

describe("Topo: link ativo e CTA", () => {
  it("o CTA leva para a máquina por dentro", () => {
    renderizar();
    expect(screen.getByRole("link", { name: "Ver a máquina por dentro" })).toHaveAttribute("href", "/#como-funciona");
  });

  it("marca o link da seção visível com aria-current", () => {
    let aoCruzar;
    let opcoes;
    const observe = vi.fn();
    const disconnect = vi.fn();
    window.IntersectionObserver = vi.fn().mockImplementation((f, o) => {
      aoCruzar = f;
      opcoes = o;
      return { observe, disconnect };
    });
    const secao = document.createElement("section");
    secao.id = "simulador";
    document.body.append(secao);

    const { unmount } = renderizar();
    expect(opcoes).toEqual({ rootMargin: "-45% 0px -50% 0px" });
    expect(observe).toHaveBeenCalledWith(secao);

    act(() => aoCruzar([{ target: secao, isIntersecting: true }]));
    expect(screen.getByRole("link", { name: "Simulador" })).toHaveAttribute("aria-current", "true");
    expect(screen.getByRole("link", { name: "Dúvidas" })).not.toHaveAttribute("aria-current");

    unmount();
    expect(disconnect).toHaveBeenCalled();
    secao.remove();
    delete window.IntersectionObserver;
  });
});
