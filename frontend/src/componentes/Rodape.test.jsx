import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import Rodape from "./Rodape.jsx";
import { FONTE_LATAS, FONTE_ALEMANHA } from "../dados/fontes.js";

describe("Rodapé", () => {
  it("mostra as fontes dos números com link", () => {
    render(<Rodape />);
    expect(screen.getByText(/97,3% das latas/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /mercado&consumo/i })).toHaveAttribute("href", FONTE_LATAS);
    expect(screen.getByText(/\+96% de retorno na Alemanha/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /dpg/i })).toHaveAttribute("href", FONTE_ALEMANHA);
  });
});
