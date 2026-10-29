import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { Button } from "../components/ui/button";

describe("Button disabledReason", () => {
  it("explains a disabled button via tooltip and accessible description", () => {
    render(
      <Button disabled disabledReason="Pilih toko terlebih dahulu">
        Simpan
      </Button>
    );
    const button = screen.getByRole("button", { name: "Simpan" });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("title", "Pilih toko terlebih dahulu");
    expect(button).toHaveAccessibleDescription("Pilih toko terlebih dahulu");
    // The reason only shows on hover if the button still receives pointer events.
    expect(button.className).toContain("disabled:pointer-events-auto");
  });

  it("drops the reason while the button is enabled", () => {
    render(<Button disabledReason="Pilih toko terlebih dahulu">Simpan</Button>);
    const button = screen.getByRole("button", { name: "Simpan" });
    expect(button).toBeEnabled();
    expect(button).not.toHaveAttribute("title");
  });

  it("drops the reason while loading", () => {
    render(
      <Button loading disabledReason="Pilih toko terlebih dahulu">
        Simpan
      </Button>
    );
    const button = screen.getByRole("button", { name: "Simpan" });
    expect(button).toBeDisabled();
    expect(button).not.toHaveAttribute("title");
  });

  it("stays disabled while loading even when disabled={false} is passed", () => {
    render(
      <Button loading disabled={false}>
        Simpan
      </Button>
    );
    expect(screen.getByRole("button", { name: "Simpan" })).toBeDisabled();
  });
});
