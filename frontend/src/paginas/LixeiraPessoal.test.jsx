import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import LixeiraPessoal from "./LixeiraPessoal.jsx";
import { futuroDoRouter } from "../rotas.js";

function servidorQueResponde(corpo) {
  vi.stubGlobal(
    "fetch",
    vi.fn((url) =>
      Promise.resolve(
        new Response(JSON.stringify(url === "/api/status" ? { model_ready: true } : corpo), { status: 200 })
      )
    )
  );
}

async function analisar(corpo) {
  servidorQueResponde(corpo);
  const { container } = render(
    <MemoryRouter future={futuroDoRouter}>
      <LixeiraPessoal />
    </MemoryRouter>
  );
  const entrada = container.querySelector('input[type="file"]');
  fireEvent.change(entrada, { target: { files: [new File(["x"], "a.jpg", { type: "image/jpeg" })] } });
  fireEvent.click(screen.getByRole("button", { name: /analisar foto/i }));
}

beforeEach(() => {
  URL.createObjectURL = vi.fn(() => "blob:foto");
  URL.revokeObjectURL = vi.fn();
});
afterEach(() => vi.unstubAllGlobals());

describe("LixeiraPessoal", () => {
  it("nao_reconhecido mostra a mensagem certa, sem material", async () => {
    await analisar({
      prediction: { class: "nao_residuo", confidence: 88 },
      nao_reconhecido: true,
      low_confidence: false,
    });
    expect(await screen.findByText("Não reconheci uma embalagem nesta foto.")).toBeInTheDocument();
    expect(screen.queryByText(/de confiança/)).not.toBeInTheDocument();
  });

  it("mostra o material e a confiança", async () => {
    await analisar({
      prediction: { class: "plastic", confidence: 91.5 },
      nao_reconhecido: false,
      low_confidence: false,
    });
    expect(await screen.findByText("Plástico")).toBeInTheDocument();
    expect(screen.getByText(/91,5% de confiança/)).toBeInTheDocument();
  });

  it("o foco vai para o resultado e depois volta para a área da foto", async () => {
    await analisar({
      prediction: { class: "glass", confidence: 80 },
      nao_reconhecido: false,
      low_confidence: false,
    });
    expect(await screen.findByText("Vidro")).toHaveFocus();
    fireEvent.click(screen.getByRole("button", { name: /analisar outra foto/i }));
    expect(screen.getByRole("button", { name: /arraste uma foto aqui/i })).toHaveFocus();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:foto");
  });
});
