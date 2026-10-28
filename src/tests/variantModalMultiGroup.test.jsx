import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import VariantModal from "../page/cashier/components/VariantModal";
import { normalizeCatalogProduct } from "../utils/catalogPrice";

jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (k, opts) => (typeof opts === "string" ? opts : k) })
}));

const drink = normalizeCatalogProduct({
  id: 9,
  nameProduct: "Es Kopi",
  price: 10000,
  effectivePrice: 10000,
  isOption: true,
  options: [
    {
      id: 1,
      name: "Size",
      options: [
        { name: "Large", price: 2000 },
        { name: "Small", price: 0 }
      ]
    },
    {
      id: 2,
      name: "Sugar",
      options: [
        { name: "Less", price: 0 },
        { name: "Normal", price: 0 }
      ]
    }
  ],
  hasModifiers: true,
  modifiers: [
    { id: 1, name: "Extra Shot", price: 3000 },
    { id: 2, name: "Oat Milk", price: 4000 }
  ]
});

describe("VariantModal keeps every option group", () => {
  test("sends one selection from each option group", () => {
    const onSelect = jest.fn();
    render(<VariantModal product={drink} onSelect={onSelect} onClose={jest.fn()} />);

    fireEvent.click(screen.getByText("Large"));
    fireEvent.click(screen.getByText("Less"));
    fireEvent.click(screen.getByText("page.cashier.addToCart"));

    expect(onSelect).toHaveBeenCalledWith(
      expect.objectContaining({
        price: 12000,
        label: "Size - Large + Sugar - Less",
        options: [{ name: "Size - Large" }, { name: "Sugar - Less" }]
      })
    );
  });

  test("sends every selected modifier, not only the last one", () => {
    const onSelect = jest.fn();
    render(<VariantModal product={drink} onSelect={onSelect} onClose={jest.fn()} />);

    fireEvent.click(screen.getByText("Large"));
    fireEvent.click(screen.getByText("Extra Shot"));
    fireEvent.click(screen.getByText("Oat Milk"));
    fireEvent.click(screen.getByText("page.cashier.addToCart"));

    expect(onSelect).toHaveBeenCalledWith(
      expect.objectContaining({
        price: 19000,
        modifiers: [{ name: "Extra Shot" }, { name: "Oat Milk" }]
      })
    );
  });
});
