import "./estilo/tokens.css";
import "./estilo/componentes.css";
import "./estilo/base.css";
import "./estilo/secoes-abertura.css";
import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.jsx";
import { futuroDoRouter } from "./rotas.js";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter future={futuroDoRouter}>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
