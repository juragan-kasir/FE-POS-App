import React from "react";
import { render, screen, waitFor, cleanup, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "react-query";
import InvoicePage from "../page/invoice/InvoicePage";
import ReceiptModal from "../page/cashier/components/ReceiptModal";
import { printViaBrowser } from "@/utils/thermalPrint";
import { renderReceiptElement } from "@/utils/receiptDocument";

// Settings saved on /invoice-page must shape the transaction pop-up's
// receipt exactly like the settings preview: same store header, same
// footer/social lines, same paper width, font and spacing.

const SETTINGS = {
  paperSize: "80mm",
  fontFamily: "sans",
  fontSize: "large",
  lineSpacing: "compact",
  showLogo: false,
  footer: "Makasih, datang lagi ya",
  socialMediaVisibility: { 1: false },
  addressFieldsVisibility: { phone: false },
  memberFieldsVisibility: { tier: false }
};
const LOCATION = {
  id: 7,
  name: "Warung A",
  address: "Jl. Melati 5",
  detailLocation: "Depan pasar",
  phoneNumber: "0812",
  email: "warung@a.id",
  socialMedia: [
    { platform: "Instagram", account: "@warunga" },
    { platform: "TikTok", account: "@warunga.tt" }
  ]
};

jest.mock("react-i18next", () => ({ useTranslation: () => ({ t: (k) => k }) }));
jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }));
jest.mock("react-cookie", () => ({
  useCookies: () => [
    { user: { id: 1, roleType: "admin", store: 7, userName: "sari" }, activeStore: 7 },
    jest.fn()
  ]
}));
jest.mock("@/contexts/StoreContext", () => ({
  useStore: () => ({ setActiveStore: jest.fn(), isSuperAdmin: false })
}));
jest.mock("@/queries/useLocations", () => ({
  useLocations: () => ({ data: { data: [] }, isLoading: false })
}));
jest.mock("@/utils/thermalPrint", () => ({
  printViaBrowser: jest.fn(),
  printReceipt: jest.fn(() => Promise.resolve())
}));
jest.mock("@/services/invoice", () => ({
  getInvoiceSetting: jest.fn(() => Promise.resolve({ data: SETTINGS })),
  updateInvoiceSetting: jest.fn(),
  resetInvoiceSetting: jest.fn()
}));
jest.mock("@/services/location", () => ({
  getLocationById: jest.fn(() => Promise.resolve({ data: LOCATION }))
}));
jest.mock("@/services/general", () => ({
  getProvinces: jest.fn(() => Promise.resolve([])),
  getCities: jest.fn(() => Promise.resolve([])),
  getDistricts: jest.fn(() => Promise.resolve([])),
  getVillages: jest.fn(() => Promise.resolve([])),
  getPostalCode: jest.fn(() => Promise.resolve([]))
}));
jest.mock("@/services/type-payment", () => ({
  getAllTypePayment: jest.fn(() => Promise.resolve({ data: [] }))
}));
jest.mock("../services/split-bill", () => ({
  createSplitBill: jest.fn(),
  getSplitBillByOrder: jest.fn(() => Promise.resolve({ data: null })),
  paySplitBill: jest.fn(),
  cancelSplitBill: jest.fn(),
  mergeSplitBills: jest.fn()
}));

const wrap = (ui) => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>{ui}</MemoryRouter>
    </QueryClientProvider>
  );
};

const settled = async () => {
  const paper = await screen.findByTestId("receipt-paper");
  await waitFor(() => expect(paper).toHaveTextContent("Makasih, datang lagi ya"));
  await waitFor(() => expect(paper).toHaveTextContent("Depan pasar"));
  return paper.firstElementChild;
};
const part = (paper, name) =>
  paper.querySelector(`[data-receipt-section="${name}"]`)?.outerHTML ?? null;

test("the transaction pop-up applies the invoice-page settings exactly like its preview", async () => {
  wrap(<InvoicePage />);
  const preview = await settled();
  const previewParts = {
    style: preview.style.cssText,
    header: part(preview, "header"),
    footer: part(preview, "footer")
  };
  expect(previewParts.header).toContain("Warung A");
  expect(previewParts.footer).toContain("Instagram: @warunga");
  cleanup();

  wrap(
    <ReceiptModal
      data={{
        id: 9,
        orderNumber: "ORD-9",
        paymentMethod: "qris",
        customerName: "Budi",
        customerId: 7,
        customer: { memberTier: "Gold", memberPoints: 10 },
        items: [{ nameProduct: "Bakso", count: 1, price: 20000, totalPrice: 20000 }],
        subtotal: 20000,
        total: 20000
      }}
      onClose={jest.fn()}
      onNewTransaction={jest.fn()}
    />
  );
  const popup = await settled();

  expect(popup.style.cssText).toBe(previewParts.style);
  expect(part(popup, "header")).toBe(previewParts.header);
  expect(part(popup, "footer")).toBe(previewParts.footer);
  // and the saved switches really took effect
  expect(popup).toHaveAttribute("data-receipt", "80mm");
  expect(popup.querySelector("img")).toBeNull();
  expect(popup).not.toHaveTextContent("0812");
  expect(popup).not.toHaveTextContent("TikTok");
  expect(popup).toHaveTextContent("Budi");
  expect(popup).not.toHaveTextContent("Gold");

  // PDF in the pop-up prints only this receipt
  fireEvent.click(screen.getByText("PDF"));
  const printed = printViaBrowser.mock.calls.at(-1)[0];
  expect(renderReceiptElement(printed).outerHTML).toBe(popup.outerHTML);
});
