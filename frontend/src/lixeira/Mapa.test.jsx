import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { describe, it, expect, vi, afterEach } from "vitest";
import Mapa from "./Mapa.jsx";
import { LISTA_SALVA } from "./mercados.js";
import * as maplibre from "maplibre-gl";

// O maplibre-gl é substituído por um duplo em setupTests.js.
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
    expect(within(lista).getAllByRole("listitem")).toHaveLength(3);
    const nomes = LISTA_SALVA.mercados.map((m) => m.nome);
    expect(nomes).toContain(within(lista).getAllByRole("listitem")[0].querySelector("strong").textContent);
    expect(screen.getByRole("link", { name: /abrir rota/i })).toHaveAttribute("href", expect.stringContaining("openstreetmap.org/directions"));
    expect(screen.getByText(/min a pé/, { selector: ".lx-mapa__destaque *" })).toBeInTheDocument();
    expect(screen.queryByText(/failed|error|erro/i)).not.toBeInTheDocument();
  });

  it("o mais próximo aparece antes da busca terminar e é trocado pela busca real", async () => {
    let responder;
    vi.stubGlobal("fetch", vi.fn(() => new Promise((ok) => (responder = ok))));
    render(<Mapa />);
    // Na hora: lista salva, ordenada a partir do centro, e o aviso de atualização.
    expect(screen.getByRole("heading", { level: 3 })).toHaveTextContent("Biomundo");
    expect(screen.getByText("Atualizando com o OpenStreetMap…")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent(/Mais perto: Biomundo, 200 m, 3 min a pé/);
    responder(new Response(JSON.stringify({ elements: [{ lat: -15.794, lon: -47.8829, tags: { name: "Mercado Real" } }] })));
    expect(await screen.findByRole("heading", { level: 3, name: "Mercado Real" })).toBeInTheDocument();
    expect(screen.queryByText("Atualizando com o OpenStreetMap…")).not.toBeInTheDocument();
    expect(screen.queryByText(/lista salva/)).not.toBeInTheDocument();
  });

  it("busca termina como salva: mantém a lista e mostra o aviso", async () => {
    falhar();
    render(<Mapa />);
    expect(await screen.findByText(/Mostrando uma lista salva de Brasília/)).toBeInTheDocument();
    expect(screen.queryByText("Atualizando com o OpenStreetMap…")).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 3 })).toHaveTextContent("Biomundo");
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
    expect(await screen.findByText(/não deu para usar sua localização/i)).toBeInTheDocument();
    expect(screen.getByText(/centro de Brasília/i)).toBeInTheDocument();
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
