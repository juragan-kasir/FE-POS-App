import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import CartPanel from "../page/cashier/components/CartPanel";

jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (k, opts) => (typeof opts === "string" ? opts : k) })
}));

const items = [
  { cartKey: "1_", id: 1, nameProduct: "Kopi", price: 10000, count: 1, totalPrice: 10000 }
];

const baseProps = {
  items,
  subtotal: 10000,
  totalItems: 1,
  onIncrement: jest.fn(),
  onDecrement: jest.fn(),
  onDelete: jest.fn(),
  onCheckout: jest.fn()
};

describe("CartPanel refuses to promise a total without a tax rate", () => {
  test("shows the tax as unavailable and blocks checkout", () => {
    render(
      <CartPanel
        {...baseProps}
        taxRate={null}
        taxAmount={null}
        taxUnavailable
        onRetryTax={jest.fn()}
      />
    );

    expect(screen.getByText("page.cashier.taxUnavailable")).toBeInTheDocument();
    expect(screen.getByText("—")).toBeInTheDocument();

    const checkout = screen.getByText("page.cashier.checkout").closest("button");
    expect(checkout).toBeDisabled();
    fireEvent.click(checkout);
    expect(baseProps.onCheckout).not.toHaveBeenCalled();
  });

  test("offers a retry that asks for the rate again", () => {
    const onRetryTax = jest.fn();
    render(
      <CartPanel
        {...baseProps}
        taxRate={null}
        taxAmount={null}
        taxUnavailable
        onRetryTax={onRetryTax}
      />
    );

    fireEvent.click(screen.getByText("common.retry"));
    expect(onRetryTax).toHaveBeenCalledTimes(1);
  });
});
