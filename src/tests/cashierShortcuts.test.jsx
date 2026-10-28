import React from "react";
import { render, fireEvent, screen } from "@testing-library/react";
import { handleCashierShortcut } from "@/page/cashier/shortcuts";

// Kasir shortcuts (F2 search, F4 Bayar, F8 Simpan, F9 Meja) press the
// control marked data-shortcut, so a disabled control stays disabled, and
// nothing fires while a dialog is open.

const Screen = ({ onPay, onPark, payDisabled = false, dialog = false }) => {
  React.useEffect(() => {
    const h = (e) => handleCashierShortcut(e);
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);
  return (
    <>
      <input data-shortcut="search" aria-label="cari" />
      <button data-shortcut="checkout" disabled={payDisabled} onClick={onPay}>
        Bayar
      </button>
      <button data-shortcut="park" onClick={onPark}>
        Simpan
      </button>
      {dialog && <div role="dialog">checkout</div>}
    </>
  );
};

test("F4 pays and F8 parks", () => {
  const onPay = jest.fn();
  const onPark = jest.fn();
  render(<Screen onPay={onPay} onPark={onPark} />);
  fireEvent.keyDown(window, { key: "F4" });
  fireEvent.keyDown(window, { key: "F8" });
  expect(onPay).toHaveBeenCalledTimes(1);
  expect(onPark).toHaveBeenCalledTimes(1);
});

test("F2 focuses the product search", () => {
  render(<Screen onPay={jest.fn()} onPark={jest.fn()} />);
  fireEvent.keyDown(window, { key: "F2" });
  expect(document.activeElement).toBe(screen.getByLabelText("cari"));
});

test("a disabled Bayar (empty cart, tax unavailable) is not pressed", () => {
  const onPay = jest.fn();
  render(<Screen onPay={onPay} onPark={jest.fn()} payDisabled />);
  fireEvent.keyDown(window, { key: "F4" });
  expect(onPay).not.toHaveBeenCalled();
});

test("nothing fires while a dialog is open", () => {
  const onPay = jest.fn();
  render(<Screen onPay={onPay} onPark={jest.fn()} dialog />);
  fireEvent.keyDown(window, { key: "F4" });
  expect(onPay).not.toHaveBeenCalled();
});

test("Ctrl/Alt combinations and other keys are left alone", () => {
  const event = { key: "F4", altKey: true, preventDefault: jest.fn() };
  expect(handleCashierShortcut(event)).toBe(false);
  expect(handleCashierShortcut({ key: "a", preventDefault: jest.fn() })).toBe(false);
  expect(event.preventDefault).not.toHaveBeenCalled();
});
