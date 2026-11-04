import {
  buildAddressLines,
  buildReceiptModel,
  isSocialVisible,
  receiptPrintCss,
  renderReceiptElement
} from "@/utils/receiptDocument";
import { generateESCPOS, printViaBrowser } from "@/utils/thermalPrint";

const base = {
  storeName: "Warung Bakso Pak Kumis",
  addressLines: ["Jl. Melati 5", "Kel. Sukamaju, Bandung"],
  logo: "data:image/png;base64,AAAA",
  orderNumber: "INV-001",
  cashier: "Sari",
  date: "2026-10-19T14:30:00Z",
  table: "7",
  paymentMethod: "cash",
  paymentMethodLabel: "Cash",
  memberName: "Budi",
  memberTier: "Gold",
  memberPoints: 2450,
  items: [
    { name: "Bakso Urat", qty: 2, price: 25000, options: [{ name: "Pedas" }] },
    { name: "Es Teh", qty: 1, price: 5000 }
  ],
  subtotal: 55000,
  discount: 5000,
  tax: 5500,
  taxLabel: "Pajak (11%)",
  total: 55500,
  showTender: true,
  cashAmount: 60000,
  changeAmount: 4500,
  footer: "Terima kasih",
  socialMedia: [
    { platform: "Instagram", account: "@baksopk" },
    { platform: "TikTok", account: "@baksopk.tt" }
  ],
  paperSize: "58mm"
};

// Visible text with a space between elements (textContent glues spans).
const text = (el) => {
  const parts = [];
  const walker = el.ownerDocument.createTreeWalker(el, 4);
  while (walker.nextNode()) parts.push(walker.currentNode.nodeValue);
  return parts.join(" ").replace(/\s+/g, " ");
};
const section = (el, name) => el.querySelector(`[data-receipt-section="${name}"]`);

describe("renderReceiptElement — the single receipt design", () => {
  test("renders header, meta, member, items, totals, tender and footer in order", () => {
    const el = renderReceiptElement(base);
    const order = [...el.querySelectorAll("[data-receipt-section]")].map((n) =>
      n.getAttribute("data-receipt-section")
    );
    expect(order).toEqual(["header", "meta", "member", "items", "totals", "footer"]);
    expect(text(section(el, "header"))).toContain("Warung Bakso Pak Kumis");
    expect(text(section(el, "header"))).toContain("Jl. Melati 5");
    expect(text(section(el, "meta"))).toContain("INV-001");
    expect(text(section(el, "meta"))).toContain("Sari");
    expect(text(section(el, "meta"))).toContain("Meja");
    expect(text(section(el, "items"))).toContain("2 x Rp25.000");
    expect(text(section(el, "items"))).toContain("Rp50.000");
    expect(text(section(el, "items"))).toContain("– Pedas");
    const totals = text(section(el, "totals"));
    expect(totals).toContain("Diskon -Rp5.000");
    expect(totals).toContain("Pajak (11%) Rp5.500");
    expect(totals).toContain("TOTAL Rp55.500");
    expect(totals).toContain("Kembali Rp4.500");
    expect(text(section(el, "footer"))).toContain("Instagram: @baksopk");
  });

  test("is thermal-safe: no background fills and no white text (browsers drop backgrounds in print)", () => {
    const el = renderReceiptElement(base);
    for (const node of [el, ...el.querySelectorAll("*")]) {
      const bg = node.style.background || node.style.backgroundColor;
      if (bg) expect(["#fff", "rgb(255, 255, 255)", "white"]).toContain(bg);
      expect(["#fff", "rgb(255, 255, 255)", "white"]).not.toContain(node.style.color);
    }
  });

  test("honours every visibility switch from the invoice settings", () => {
    const el = renderReceiptElement({
      ...base,
      showLogo: false,
      showStoreName: false,
      showAddress: false,
      showMemberInfo: false,
      showSocialMedia: false,
      showTender: false
    });
    expect(el.querySelector("img")).toBeNull();
    expect(section(el, "header")).toBeNull();
    expect(section(el, "member")).toBeNull();
    expect(text(el)).not.toContain("Instagram");
    expect(text(el)).not.toContain("Kembali");
  });

  test("member fields can be hidden one by one", () => {
    const el = renderReceiptElement({ ...base, memberFieldsVisibility: { tier: false } });
    expect(text(section(el, "member"))).toContain("Budi");
    expect(text(section(el, "member"))).not.toContain("Gold");
    expect(text(section(el, "member"))).toContain("2.450");
  });

  test("social visibility is keyed by list position (as the settings page saves it)", () => {
    const el = renderReceiptElement({ ...base, socialMediaVisibility: { 1: false } });
    expect(text(el)).toContain("Instagram: @baksopk");
    expect(text(el)).not.toContain("TikTok");
    expect(isSocialVisible('{"0":false}', base.socialMedia[0], 0)).toBe(false);
    expect(isSocialVisible({ Instagram: false }, base.socialMedia[0], 0)).toBe(false);
    expect(isSocialVisible({}, base.socialMedia[0], 0)).toBe(true);
  });

  test("store data is rendered as text, never as markup", () => {
    const el = renderReceiptElement({
      ...base,
      logo: "",
      storeName: '<img src=x onerror="alert(1)">',
      items: [{ name: "<b>x</b>", qty: 1, price: 1 }]
    });
    expect(el.querySelector("img")).toBeNull();
    expect(el.querySelector("b")).toBeNull();
    expect(text(el)).toContain('<img src=x onerror="alert(1)">');
  });

  test("paper width follows the paper size setting", () => {
    expect(renderReceiptElement(base).getAttribute("data-receipt")).toBe("58mm");
    expect(renderReceiptElement({ ...base, paperSize: "80mm" }).style.width).toBe("80mm");
    // no invalid "size: 58mm auto" — Chrome drops it; the printer sets the page
    expect(receiptPrintCss()).not.toMatch(/size:/);
  });

  test("address lines respect each field switch", () => {
    const lines = buildAddressLines(
      { address: "Jl. A", city: "Bandung", province: "Jabar", phone: "0812", email: "a@b.c" },
      { province: false, email: false }
    );
    expect(lines).toEqual(["Jl. A", "Bandung", "Telp 0812"]);
  });

  test("legacy flat data (storeAddress/storePhone) still renders", () => {
    const model = buildReceiptModel({ storeAddress: "Jl. B", storePhone: "0813", total: 1 });
    expect(model.addressLines).toEqual(["Jl. B", "Telp 0813"]);
  });
});

describe("print paths use the same receipt", () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  test("browser print puts exactly the rendered receipt on the page", () => {
    const printDoc = document.implementation.createHTMLDocument("print");
    const win = { document: printDoc, focus: jest.fn(), print: jest.fn() };
    const open = jest.spyOn(window, "open").mockReturnValue(win);

    printViaBrowser(base);
    jest.runAllTimers();

    expect(printDoc.body.innerHTML).toBe(renderReceiptElement(base).outerHTML);
    expect(printDoc.head.textContent).toContain("@page { margin: 0; }");
    expect(win.print).toHaveBeenCalled();
    open.mockRestore();
  });

  test("ESC/POS text carries the same sections and hides the same fields", () => {
    const out = generateESCPOS({ ...base, socialMediaVisibility: { 1: false } });
    expect(out).toContain("WARUNG BAKSO PAK KUMIS");
    expect(out).toContain("INV-001");
    expect(out).toContain("2 x Rp25.000");
    expect(out).toContain("Pajak (11%)");
    expect(out).toContain("TOTAL");
    expect(out).toContain("Instagram: @baksopk");
    expect(out).not.toContain("TikTok");
    // 58mm = 32 columns: no row is wider than the paper
    out
      .split("\n")
      .filter((l) => l.includes("Rp") && !l.includes("\u001B"))
      .forEach((l) => expect(l.length).toBeLessThanOrEqual(32));
  });
});

// PGA-20 (product-grade audit 2026-11-02): a priced add-on (Extra Shot
// +4.000) was charged on the line but never printed.
describe("priced add-ons are printed", () => {
  const withAddons = {
    ...base,
    items: [
      {
        name: "Americano",
        qty: 1,
        price: 28000,
        options: [{ name: "Ukuran - Large" }],
        modifiers: [{ name: "Extra Shot" }, "Oat Milk"]
      }
    ]
  };

  test("the receipt names every add-on under its line", () => {
    const text = renderReceiptElement(withAddons).textContent;
    expect(text).toContain("– Ukuran - Large");
    expect(text).toContain("+ Extra Shot");
    expect(text).toContain("+ Oat Milk");
  });

  test("the ESC/POS receipt prints the same add-ons", () => {
    const out = generateESCPOS(withAddons);
    expect(out).toContain("  + Extra Shot\n");
    expect(out).toContain("  + Oat Milk\n");
  });

  test("a line without add-ons prints none", () => {
    expect(buildReceiptModel(base).items[1].addons).toEqual([]);
    expect(renderReceiptElement(base).textContent).not.toContain("+ ");
  });
});
