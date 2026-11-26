import { render, screen, within } from "@testing-library/react";
import { describe, it, expect, vi, afterEach } from "vitest";
import gsap from "gsap";
import Painel from "./Painel.jsx";

function menosAnimacao(matches) {
  window.matchMedia = vi.fn().mockImplementation((q) => ({
    matches, media: q, addEventListener: vi.fn(), removeEventListener: vi.fn(),
  }));
}

// Mesmo formato de GET /api/admin/status (rvm.bin_status e rvm.stats). O servidor ordena por nome.
const STATUS = {
  bins: [
    { material: "glass", count: 100, capacity: 100, percent: 100, warning: true, full: true },
    { material: "metal", count: 60, capacity: 300, percent: 20, warning: false, full: false },
    { material: "plastic", count: 176, capacity: 200, percent: 88, warning: true, full: false },
  ],
  stats: { items_accepted: 336, vouchers: 12 },
};

function servidor(resposta) {
  vi.stubGlobal("fetch", vi.fn(() => resposta));
}
const ok = (corpo) => Promise.resolve(new Response(JSON.stringify(corpo), { status: 200 }));

describe("Painel do operador", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("mostra os níveis vindos da API, na ordem plástico, metal, vidro", async () => {
    menosAnimacao(true);
    servidor(ok(STATUS));
    render(<Painel />);
    const barras = await screen.findAllByRole("progressbar");
    expect(fetch).toHaveBeenCalledWith("/api/admin/status");
    expect(barras.map((b) => b.getAttribute("aria-label"))).toEqual(["Plástico", "Metal", "Vidro"]);
    expect(barras.map((b) => b.getAttribute("aria-valuenow"))).toEqual(["88", "20", "100"]);
    expect(barras[0]).toHaveAttribute("aria-valuemin", "0");
    expect(barras[0]).toHaveAttribute("aria-valuemax", "100");
    expect(barras[0]).toHaveAttribute("aria-valuetext", "88% (176 de 200)");
    expect(screen.getByText(/336 embalagens aceitas e 12 vouchers emitidos/)).toBeInTheDocument();
    expect(screen.queryByText(/valores de exemplo/i)).not.toBeInTheDocument();
  });

  it("avisa em texto quando um compartimento está quase cheio ou cheio", async () => {
    menosAnimacao(true);
    servidor(ok(STATUS));
    const { container } = render(<Painel />);
    await screen.findAllByRole("progressbar");
    const textos = [...container.querySelectorAll(".painel__alerta")].map((a) => a.textContent.replace(/^info/, ""));
    expect(textos).toContain("Plástico está quase cheio (88%): esvaziar logo.");
    expect(textos).toContain("Vidro está cheio: a máquina recusa vidro até esvaziar.");
    expect(textos.some((t) => t.startsWith("Metal"))).toBe(false);
  });

  it("sem compartimento perto de encher, não mostra alerta", async () => {
    menosAnimacao(true);
    servidor(ok({ bins: [{ material: "metal", count: 3, capacity: 300, percent: 1, warning: false, full: false }], stats: {} }));
    const { container } = render(<Painel />);
    expect(await screen.findByText("Nenhum compartimento perto de encher.")).toBeInTheDocument();
    expect(container.querySelectorAll(".painel__alerta")).toHaveLength(1);
  });

  it.each([
    ["rede fora", () => Promise.reject(new TypeError("Failed to fetch"))],
    ["erro do servidor", () => Promise.resolve(new Response("erro", { status: 500 }))],
    ["resposta sem compartimentos", () => ok({ bins: [] })],
  ])("com %s, mostra os níveis de exemplo do protótipo, sem erro técnico", async (_, resposta) => {
    menosAnimacao(true);
    servidor(resposta());
    render(<Painel />);
    expect(await screen.findByText("Valores de exemplo")).toBeInTheDocument();
    const barras = screen.getAllByRole("progressbar");
    expect(barras.map((b) => b.getAttribute("aria-valuenow"))).toEqual(["88", "41", "18"]);
    expect(screen.getByText("Plástico passa de 85%: esvaziar até amanhã.")).toBeInTheDocument();
    expect(screen.queryByText(/failed|fetch|500|erro/i)).not.toBeInTheDocument();
  });

  it("o botão leva ao /admin do Flask com link comum", () => {
    menosAnimacao(true);
    servidor(new Promise(() => {}));
    render(<Painel />);
    const link = screen.getByRole("link", { name: /abrir o painel do operador/i });
    expect(link).toHaveAttribute("href", "/admin");
  });

  it("as barras enchem com GSAP quando entram na tela", async () => {
    menosAnimacao(false);
    // Sem tween de verdade: o jsdom não tem requestAnimationFrame para o ScrollTrigger.
    const from = vi.spyOn(gsap, "from").mockImplementation(() => ({}));
    servidor(ok(STATUS));
    const { container } = render(<Painel />);
    await screen.findAllByRole("progressbar");
    const chamada = from.mock.calls.find(([alvo]) => alvo?.length === 3);
    expect(chamada).toBeTruthy();
    expect([...chamada[0]].every((el) => el.parentElement.classList.contains("nivel"))).toBe(true);
    expect(chamada[1].scrollTrigger.trigger).toBe(container.querySelector(".painel"));
  });

  it("com menos animação, as barras ficam paradas no valor e não usam GSAP", async () => {
    menosAnimacao(true);
    const from = vi.spyOn(gsap, "from");
    const to = vi.spyOn(gsap, "to");
    servidor(ok(STATUS));
    const { container } = render(<Painel />);
    await screen.findAllByRole("progressbar");
    expect(from).not.toHaveBeenCalled();
    expect(to).not.toHaveBeenCalled();
    const primeira = within(container.querySelector(".niveis")).getAllByRole("progressbar")[0];
    expect(primeira.style.getPropertyValue("--n")).toBe("88%");
  });
});
