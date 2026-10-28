import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import QrisPaymentModal from "../page/customer-display-board/QrisPaymentModal";

jest.mock("qrcode.react", () => ({
  QRCodeSVG: ({ value }) => <div data-testid="qris-code" data-value={value} />
}));

jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (k, opts) => (typeof opts === "string" ? opts : k) })
}));

describe("QrisPaymentModal is honest about its payment mode", () => {
  test("does not render a QR when no merchant payload exists", () => {
    render(<QrisPaymentModal event={{ total: 50000, tableName: "A1" }} onDismiss={jest.fn()} />);

    expect(screen.queryByTestId("qris-code")).not.toBeInTheDocument();
    expect(screen.getByText("page.customerDisplayBoard.qris.manualTitle")).toBeInTheDocument();
    expect(screen.getByText("page.customerDisplayBoard.qris.manualDesc")).toBeInTheDocument();
  });

  test("renders the QR only when a merchant payload is provided", () => {
    render(
      <QrisPaymentModal
        event={{ total: 50000, qrValue: "00020101021226670016COM.GO-JEK.WWW" }}
        onDismiss={jest.fn()}
      />
    );

    expect(screen.getByTestId("qris-code")).toHaveAttribute(
      "data-value",
      "00020101021226670016COM.GO-JEK.WWW"
    );
    expect(
      screen.queryByText("page.customerDisplayBoard.qris.manualTitle")
    ).not.toBeInTheDocument();
  });
});
