import { describe, it, expect } from "vitest";
import { validarArquivo } from "./validarArquivo.js";

const MB = 1024 * 1024;

function arquivo(nome, tipo, tamanho = 1000) {
  const f = new File(["x"], nome, { type: tipo });
  Object.defineProperty(f, "size", { value: tamanho });
  return f;
}

describe("validarArquivo", () => {
  it("aceita JPG, PNG e WEBP até 5 MB", () => {
    expect(validarArquivo(arquivo("a.jpg", "image/jpeg"))).toEqual({ ok: true });
    expect(validarArquivo(arquivo("a.png", "image/png", 5 * MB))).toEqual({ ok: true });
    expect(validarArquivo(arquivo("a.webp", "image/webp"))).toEqual({ ok: true });
  });

  it("recusa arquivo que não é imagem", () => {
    const r = validarArquivo(arquivo("notas.pdf", "application/pdf"));
    expect(r.ok).toBe(false);
    expect(r.mensagem).toMatch(/envie em JPG ou PNG, até 5 MB/i);
  });

  it("recusa HEIC do iPhone dizendo o que fazer", () => {
    for (const f of [arquivo("IMG_1.HEIC", "image/heic"), arquivo("IMG_2.heif", "")]) {
      const r = validarArquivo(f);
      expect(r.ok).toBe(false);
      expect(r.mensagem).toMatch(/HEIC/);
      expect(r.mensagem).toMatch(/envie em JPG ou PNG, até 5 MB/i);
    }
  });

  it("recusa acima de 5 MB com o tamanho na mensagem", () => {
    const r = validarArquivo(arquivo("grande.jpg", "image/jpeg", 7.2 * MB));
    expect(r.ok).toBe(false);
    expect(r.mensagem).toMatch(/passa de 5 MB/);
    expect(r.mensagem).toMatch(/7,2 MB/);
  });

  it("recusa 5 MB + 1 byte", () => {
    const r = validarArquivo(arquivo("limite.jpg", "image/jpeg", 5 * MB + 1));
    expect(r.ok).toBe(false);
    expect(r.mensagem).toMatch(/passa de 5 MB/);
  });

  it("tipo vazio decide pela extensão", () => {
    expect(validarArquivo(arquivo("a.JPEG", "")).ok).toBe(true);
    expect(validarArquivo(arquivo("a.webp", "")).ok).toBe(true);
    expect(validarArquivo(arquivo("notas.txt", "")).ok).toBe(false);
    expect(validarArquivo(arquivo("sem-extensao", "")).ok).toBe(false);
  });

  it("recusa quando não há arquivo", () => {
    expect(validarArquivo(undefined).ok).toBe(false);
  });
});
