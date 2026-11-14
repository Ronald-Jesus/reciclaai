import "@testing-library/jest-dom/vitest";
import { vi, afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

afterEach(() => cleanup());

// O jsdom não implementa matchMedia: padrão é "sem preferência por menos animação".
if (!window.matchMedia) {
  window.matchMedia = vi.fn().mockImplementation((consulta) => ({
    matches: false,
    media: consulta,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
}

// Lenis precisa de layout real; nos testes é substituído por um duplo.
vi.mock("lenis", () => ({
  default: vi.fn().mockImplementation(() => ({ on: vi.fn(), raf: vi.fn(), destroy: vi.fn() })),
}));

// MapLibre precisa de WebGL; nos testes é substituído por um duplo.
vi.mock("maplibre-gl", () => {
  const Map = vi.fn().mockImplementation(() => ({
    addControl: vi.fn(),
    fitBounds: vi.fn(),
    jumpTo: vi.fn(),
    flyTo: vi.fn(),
    remove: vi.fn(),
    once: vi.fn(),
    loaded: vi.fn(() => true),
  }));
  // Marker guarda o elemento; Popup põe o conteúdo no documento para o teste clicar.
  const Marker = vi.fn().mockImplementation(function ({ element }) {
    this.element = element;
    this.setLngLat = vi.fn(() => this);
    this.addTo = vi.fn(() => this);
    this.remove = vi.fn();
  });
  const Popup = vi.fn().mockImplementation(function () {
    this.setLngLat = vi.fn(() => this);
    this.setDOMContent = vi.fn((el) => ((this.el = el), this));
    this.addTo = vi.fn(() => (document.body.append(this.el), this));
    this.remove = vi.fn(() => this.el?.remove());
  });
  return { Map, Marker, Popup, NavigationControl: vi.fn(), setWorkerUrl: vi.fn() };
});
