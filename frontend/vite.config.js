import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  base: "/",
  // O three.js (~614 kB) fica num pedaço à parte, carregado só pelo fundo Vanta do topo.
  // O MapLibre (~1,1 MB) também, carregado só pela seção "Onde depositar" da lixeira.
  build: { chunkSizeWarningLimit: 1150 },
  server: {
    // No `npm run dev`, as chamadas à API vão para o Flask.
    proxy: { "/api": "http://127.0.0.1:5000", "/predict": "http://127.0.0.1:5000" },
  },
  test: {
    environment: "jsdom",
    setupFiles: "./src/setupTests.js",
  },
});
