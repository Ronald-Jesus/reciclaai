import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { describe, it, expect, vi, afterEach } from "vitest";
import Mapa from "./Mapa.jsx";
import { LISTA_SALVA } from "./mercados.js";
import * as maplibre from "maplibre-gl";
import { CENTRO_BRASILIA, ordenarPorDistancia } from "./geo.js";

// O maplibre-gl é substituído por um duplo em setupTests.js.
// Item da lista marcado como selecionado (aria-pressed).
const selecionado = () => screen.getByRole("button", { pressed: true });
const falhar = () => vi.stubGlobal("fetch", vi.fn(() => Promise.reject(new TypeError("Failed to fetch"))));

afterEach(() => {
  vi.unstubAllGlobals();
  delete navigator.geolocation;
});

describe("Mapa", () => {
  it("aviso de demonstração sempre visível", () => {
    falhar();
    render(<Mapa />);
    expect(screen.getByText("Os mercados aparecem só para demonstração; não são parceiros.")).toBeVisible();
    expect(screen.getByText("© OpenFreeMap © colaboradores do OpenStreetMap")).toBeInTheDocument();
  });

  it("se a busca falhar, usa a lista salva sem erro na tela", async () => {
    falhar();
    render(<Mapa />);
    const lista = await screen.findByRole("list", { name: /mais perto/i });
    expect(within(lista).getAllByRole("listitem")).toHaveLength(LISTA_SALVA.mercados.length);
    const nomes = LISTA_SALVA.mercados.map((m) => m.nome);
    expect(nomes).toContain(within(lista).getAllByRole("listitem")[0].querySelector("strong").textContent);
    expect(screen.getByRole("link", { name: /abrir rota/i })).toHaveAttribute("href", expect.stringContaining("openstreetmap.org/directions"));
    // O detalhe e a rota ficam dentro do item selecionado: o mais perto não aparece duas vezes.
    const item = selecionado().closest("li");
    expect(within(item).getByText(/em linha reta · \d+ min a pé/)).toBeInTheDocument();
    expect(within(item).getByRole("link", { name: /abrir rota/i })).toBeInTheDocument();
    expect(screen.getAllByText("Mais perto")).toHaveLength(1);
    expect(screen.queryByRole("heading", { level: 3 })).not.toBeInTheDocument();
    expect(screen.queryByText(/failed|error|erro/i)).not.toBeInTheDocument();
  });

  it("o mais próximo aparece antes da busca terminar e é trocado pela busca real", async () => {
    let responder;
    vi.stubGlobal("fetch", vi.fn(() => new Promise((ok) => (responder = ok))));
    render(<Mapa />);
    // Na hora: lista salva, ordenada a partir do centro, e o aviso de atualização.
    expect(selecionado()).toHaveTextContent("Biomundo");
    expect(screen.getByText("Atualizando com o OpenStreetMap…")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent(/Mais perto: Biomundo, 200 m, 3 min a pé/);
    responder(new Response(JSON.stringify({ elements: [{ lat: -15.794, lon: -47.8829, tags: { name: "Mercado Real" } }] })));
    await waitFor(() => expect(selecionado()).toHaveTextContent("Mercado Real"));
    expect(screen.queryByText("Atualizando com o OpenStreetMap…")).not.toBeInTheDocument();
    expect(screen.queryByText(/lista salva/)).not.toBeInTheDocument();
  });

  it("busca termina como salva: mantém a lista e mostra o aviso", async () => {
    falhar();
    render(<Mapa />);
    expect(await screen.findByText(/Mostrando uma lista salva de Brasília/)).toBeInTheDocument();
    expect(screen.queryByText("Atualizando com o OpenStreetMap…")).not.toBeInTheDocument();
    expect(selecionado()).toHaveTextContent("Biomundo");
  });

  it("fora de Brasília: aviso e busca a partir do centro", async () => {
    const fetch = vi.fn(() => Promise.reject(new TypeError("x")));
    vi.stubGlobal("fetch", fetch);
    navigator.geolocation = {
      getCurrentPosition: vi.fn((ok) => ok({ coords: { latitude: -23.5505, longitude: -46.6333 } })), // São Paulo
    };
    render(<Mapa />);
    fireEvent.click(screen.getByRole("button", { name: /usar minha localização/i }));
    expect(await screen.findByText(/fora de Brasília/i)).toBeInTheDocument();
    expect(fetch.mock.calls.every(([url, o]) => !String(url).includes("-23.55") && !o?.body?.includes("-23.55"))).toBe(true);
  });

  it("enquanto procura a localização, o botão fica aria-disabled e ignora cliques", () => {
    falhar();
    navigator.geolocation = { getCurrentPosition: vi.fn() }; // nunca responde
    render(<Mapa />);
    const botao = screen.getByRole("button", { name: /usar minha localização/i });
    fireEvent.click(botao);
    expect(botao).toHaveAttribute("aria-disabled", "true");
    expect(botao).not.toBeDisabled();
    fireEvent.click(botao);
    expect(navigator.geolocation.getCurrentPosition).toHaveBeenCalledTimes(1);
  });

  it("sem localização usa o centro de Brasília", async () => {
    falhar();
    navigator.geolocation = { getCurrentPosition: vi.fn((_, erro) => erro({ code: 1 })) };
    render(<Mapa />);
    expect(screen.getByText(/partindo do centro de Brasília/i)).toBeInTheDocument();
    expect(navigator.geolocation.getCurrentPosition).not.toHaveBeenCalled(); // só pede no clique
    fireEvent.click(screen.getByRole("button", { name: /usar minha localização/i }));
    expect(await screen.findByText(/permissão de localização foi negada/i)).toBeInTheDocument();
    expect(screen.getByText(/centro de Brasília/i)).toBeInTheDocument();
  });

  it("o aviso diz o motivo: demorou, indisponível ou navegador sem suporte", async () => {
    falhar();
    navigator.geolocation = { getCurrentPosition: vi.fn((_, erro) => erro({ code: 3 })) };
    const { unmount } = render(<Mapa />);
    fireEvent.click(screen.getByRole("button", { name: /usar minha localização/i }));
    expect(await screen.findByText(/demorou mais de 10 segundos/i)).toBeInTheDocument();
    unmount();

    navigator.geolocation = { getCurrentPosition: vi.fn((_, erro) => erro({ code: 2 })) };
    const segundo = render(<Mapa />);
    fireEvent.click(screen.getByRole("button", { name: /usar minha localização/i }));
    expect(await screen.findByText(/não foi possível descobrir sua localização/i)).toBeInTheDocument();
    segundo.unmount();

    delete navigator.geolocation;
    render(<Mapa />);
    fireEvent.click(screen.getByRole("button", { name: /usar minha localização/i }));
    expect(await screen.findByText(/não permite usar a localização/i)).toBeInTheDocument();
  });

  it("cada mercado da lista tem o link Como chegar", async () => {
    falhar();
    render(<Mapa />);
    const links = await screen.findAllByRole("link", { name: /como chegar a/i });
    expect(links.length).toBeGreaterThan(1);
    expect(links[0]).toHaveAttribute("href", expect.stringContaining("openstreetmap.org/directions"));
    expect(links[0]).toHaveAttribute("target", "_blank");
  });

  it("com localização, a busca parte da pessoa", async () => {
    const fetch = vi.fn(() => Promise.reject(new TypeError("x")));
    vi.stubGlobal("fetch", fetch);
    navigator.geolocation = {
      getCurrentPosition: vi.fn((ok) => ok({ coords: { latitude: -15.83, longitude: -47.92 } })),
    };
    render(<Mapa />);
    fireEvent.click(screen.getByRole("button", { name: /usar minha localização/i }));
    await waitFor(() => expect(fetch.mock.calls.some(([, o]) => o?.body?.includes("-15.83"))).toBe(true));
    expect(await screen.findByText(/partindo da sua localização/i)).toBeInTheDocument();
  });

  it("estilo do mapa falha antes de abrir: aviso no lugar do mapa, lista continua", async () => {
    falhar();
    maplibre.Map.mockImplementationOnce(() => ({
      addControl: vi.fn(),
      remove: vi.fn(),
      loaded: () => false,
      once: (evento, fn) => evento === "error" && fn(),
    }));
    render(<Mapa />);
    expect(await screen.findByText(/não deu para carregar o mapa agora/i)).toBeInTheDocument();
    expect(screen.getByRole("list", { name: /mais perto/i })).toBeInTheDocument();
  });

  describe("pinos e escolha", () => {
    const ordem = ordenarPorDistancia(CENTRO_BRASILIA, LISTA_SALVA.mercados);
    // Pinos de mercado ainda no mapa (os marcadores antigos foram removidos ao trocar a lista).
    const pinosVivos = () =>
      maplibre.Marker.mock.instances
        .filter((mk) => !mk.remove.mock.calls.length && mk.element.querySelector(".lx-pino--mercado"))
        .map((mk) => mk.element);

    async function abrirComListaSalva() {
      maplibre.Marker.mockClear();
      falhar();
      render(<Mapa />);
      await screen.findByText(/Mostrando uma lista salva de Brasília/);
      await waitFor(() => expect(pinosVivos()).toHaveLength(ordem.length));
    }

    it("número de pinos = número de mercados, e o mais perto começa destacado", async () => {
      await abrirComListaSalva();
      const pinos = pinosVivos();
      expect(pinos[0]).toHaveClass("is-selected");
      expect(pinos.slice(1).every((p) => !p.classList.contains("is-selected"))).toBe(true);
      expect(pinos[0]).toHaveAccessibleName(new RegExp(ordem[0].nome));
    });

    it("clicar no item 2 seleciona, atualiza o cartão e a rota, destaca o pino e centraliza o mapa", async () => {
      await abrirComListaSalva();
      const segundo = ordem[1];
      const botao = screen.getByRole("button", { name: new RegExp(segundo.nome) });
      fireEvent.click(botao);
      expect(botao).toHaveAttribute("aria-pressed", "true");
      expect(selecionado()).toHaveTextContent(segundo.nome);
      expect(within(botao.closest("li")).getByText("Selecionado")).toBeInTheDocument();
      expect(screen.getByRole("link", { name: /abrir rota/i }).getAttribute("href")).toContain(
        encodeURIComponent(`${segundo.lat},${segundo.lng}`)
      );
      expect(screen.getByRole("status")).toHaveTextContent(new RegExp(`Selecionado: ${segundo.nome}`));
      const pinos = pinosVivos();
      expect(pinos[1]).toHaveClass("is-selected");
      expect(pinos[0]).not.toHaveClass("is-selected");
      const mapa = maplibre.Map.mock.results.at(-1).value;
      expect(mapa.flyTo).toHaveBeenCalledWith({ center: [segundo.lng, segundo.lat], zoom: 16 });
    });

    it("clicar num pino abre o popup; 'Escolher este' seleciona o mercado", async () => {
      await abrirComListaSalva();
      const terceiro = ordem[2];
      fireEvent.click(pinosVivos()[2]);
      expect(screen.getByText(terceiro.nome, { selector: ".lx-popup strong" })).toBeInTheDocument();
      fireEvent.click(screen.getByRole("button", { name: "Escolher este" }));
      expect(selecionado()).toHaveTextContent(terceiro.nome);
      expect(pinosVivos()[2]).toHaveClass("is-selected");
      expect(screen.queryByRole("button", { name: "Escolher este" })).not.toBeInTheDocument();
    });
  });

  it("cancela a busca ao desmontar", () => {
    const fetch = vi.fn(() => new Promise(() => {}));
    vi.stubGlobal("fetch", fetch);
    const { unmount } = render(<Mapa />);
    const sinal = fetch.mock.calls[0][1].signal;
    expect(sinal.aborted).toBe(false);
    unmount();
    expect(sinal.aborted).toBe(true);
  });
});
