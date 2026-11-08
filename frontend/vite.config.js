import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  base: "/",
  server: {
    // No `npm run dev`, as chamadas à API vão para o Flask.
    proxy: { "/api": "http://127.0.0.1:5000", "/predict": "http://127.0.0.1:5000" },
  },
  test: {
    environment: "jsdom",
    setupFiles: "./src/setupTests.js",
  },
});
