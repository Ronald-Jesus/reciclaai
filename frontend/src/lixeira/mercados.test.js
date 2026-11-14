import { describe, it, expect, vi, afterEach } from "vitest";
import { buscarMercados, LISTA_SALVA } from "./mercados.js";
import { CENTRO_BRASILIA } from "./geo.js";

const json = (corpo) => Promise.resolve(new Response(JSON.stringify(corpo), { status: 200 }));
const overpass = (n) => ({
  elements: Array.from({ length: n }, (_, i) => ({ lat: -15.79 - i / 1000, lon: -47.88, tags: { name: `M${i}` } })),
});

afterEach(() => vi.unstubAllGlobals());

describe("buscarMercados", () => {
  it("usa o Overpass quando ele responde, sem tentar o 2º raio", async () => {
    const fetch = vi.fn(() => json(overpass(1)));
    vi.stubGlobal("fetch", fetch);
    const r = await buscarMercados(CENTRO_BRASILIA);
    expect(r).toEqual({ fonte: "osm", mercados: [{ nome: "M0", lat: -15.79, lng: -47.88, endereco: "" }] });
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch.mock.calls[0][1].body).toContain(encodeURIComponent("out center;"));
  });

  it("nada em 3 km: tenta 6 km", async () => {
    const fetch = vi.fn().mockReturnValueOnce(json(overpass(0))).mockReturnValueOnce(json(overpass(4)));
    vi.stubGlobal("fetch", fetch);
    const r = await buscarMercados(CENTRO_BRASILIA);
    expect(r.mercados).toHaveLength(4);
    expect(fetch.mock.calls[1][1].body).toContain("around%3A6000");
  });

  it("Overpass falha: usa o Photon", async () => {
    const fetch = vi.fn((url) =>
      String(url).includes("photon")
        ? json({ features: [{ properties: { name: "P" }, geometry: { coordinates: [-47.88, -15.79] } }] })
        : Promise.reject(new TypeError("Failed to fetch"))
    );
    vi.stubGlobal("fetch", fetch);
    const r = await buscarMercados(CENTRO_BRASILIA);
    expect(r).toEqual({ fonte: "osm", mercados: [{ nome: "P", lat: -15.79, lng: -47.88, endereco: "" }] });
  });

  it("se a busca falhar, usa a lista salva", async () => {
    vi.stubGlobal("fetch", vi.fn(() => Promise.reject(new TypeError("Failed to fetch"))));
    const r = await buscarMercados(CENTRO_BRASILIA);
    expect(r.fonte).toBe("salva");
    expect(r.mercados).toEqual(LISTA_SALVA.mercados);
  });

  it("cancelada: rejeita com AbortError e não cai na lista salva", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn((_, { signal }) => new Promise((_, rejeitar) => signal.addEventListener("abort", () => rejeitar(signal.reason))))
    );
    const controle = new AbortController();
    const busca = buscarMercados(CENTRO_BRASILIA, controle.signal);
    controle.abort();
    await expect(busca).rejects.toMatchObject({ name: "AbortError" });
  });

  it("já cancelada: não chama a rede", async () => {
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    await expect(buscarMercados(CENTRO_BRASILIA, AbortSignal.abort())).rejects.toMatchObject({ name: "AbortError" });
    expect(fetch).not.toHaveBeenCalled();
  });
});
