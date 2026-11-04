import { buildReceiptModel, receiptPrintCss, renderReceiptElement } from "@/utils/receiptDocument";
import { getToken } from "@/utils/cookies";

const RECEIPT_WIDTH = 48;

const padBoth = (left, right, width = RECEIPT_WIDTH) => {
  const leftLen = left.length;
  const rightLen = right.length;
  const space = Math.max(1, width - leftLen - rightLen);
  return left + " ".repeat(space) + right;
};

const line = (char = "-", width = RECEIPT_WIDTH) => char.repeat(width);

const formatPrice = (val) => `Rp${Number(val || 0).toLocaleString("id-ID")}`;

// Text version of the same receipt for ESC/POS printers (USB/Serial):
// identical sections, order and labels as renderReceiptElement, laid out
// in fixed-width columns (32 chars on 58mm, 48 on 80mm).
export const generateESCPOS = (data, opts = {}) => {
  const m = buildReceiptModel(data);
  const W = m.paperSize === "80mm" ? 48 : 32;
  const init = "\x1B\x40";
  const alignCenter = "\x1B\x61\x01";
  const alignLeft = "\x1B\x61\x00";
  const doubleHeight = "\x1B\x21\x10";
  const normal = "\x1B\x21\x00";
  const boldOn = "\x1B\x45\x01";
  const boldOff = "\x1B\x45\x00";
  const row = ([label, value]) => padBoth(String(label), String(value), W) + "\n";

  let enc = init + alignCenter;
  if (m.storeName)
    enc += boldOn + doubleHeight + m.storeName.toUpperCase() + "\n" + normal + boldOff;
  m.addressLines.forEach((l) => (enc += l + "\n"));
  enc += alignLeft + line("-", W) + "\n";
  if (m.meta.length) {
    m.meta.forEach((r) => (enc += row(r)));
    enc += line("-", W) + "\n";
  }
  if (m.member.length) {
    enc += boldOn + m.labels.memberInfo.toUpperCase() + boldOff + "\n";
    m.member.forEach((r) => (enc += row(r)));
    enc += line("-", W) + "\n";
  }
  if (!m.items.length) enc += m.labels.noItems + "\n";
  m.items.forEach((item) => {
    enc += item.name + "\n";
    if (item.variant) enc += "  - " + item.variant + "\n";
    item.addons.forEach((name) => (enc += "  + " + name + "\n"));
    enc += row([`${item.qty} x ${formatPrice(item.price)}`, formatPrice(item.total)]);
  });
  enc += line("-", W) + "\n";
  m.totals.forEach((r) => (enc += row(r)));
  enc += line("=", W) + "\n";
  enc += boldOn + row(m.grandTotal) + boldOff;
  m.tender.forEach((r) => (enc += row(r)));
  if (m.footer || m.social.length) {
    enc += line("-", W) + "\n" + alignCenter;
    if (m.footer) enc += m.footer + "\n";
    m.social.forEach((l) => (enc += l + "\n"));
    enc += alignLeft;
  }
  enc += "\n\n\n";
  // ponytail: skip cut for mobile printers (no cutter), enable via opts.cut
  if (opts.cut) {
    enc += "\x1D\x56\x00";
  }
  return enc;
};

export const formatCurrency = (amount) => {
  return formatPrice(amount);
};

// Browser print of the shared receipt element (renderReceiptElement) —
// the same element the settings preview and the cashier receipt show.
export const printViaBrowser = (data) => {
  const fill = (doc) => {
    // Becomes the suggested file name for "Save as PDF".
    doc.title = data?.orderNumber ? `Struk ${data.orderNumber}` : "Struk";
    const style = doc.createElement("style");
    style.textContent = receiptPrintCss();
    doc.head.append(style);
    doc.body.append(renderReceiptElement(data, doc));
  };

  // ponytail: konten disuntikkan langsung ke dokumen tujuan via DOM API;
  // kalau popup diblokir, iframe tersembunyi mencetak tanpa buka tab baru
  const win = window.open("", "_blank");
  if (win) {
    fill(win.document);
    setTimeout(() => {
      win.focus();
      win.print();
    }, 500);
    return;
  }
  const iframe = document.createElement("iframe");
  iframe.title = "Struk";
  iframe.style.cssText =
    "position:fixed;inset:0;z-index:99999;width:100%;height:100%;border:0;background:#fff";
  iframe.className = "print-thermal";
  const style = document.createElement("style");
  style.textContent = "@media print{body>*:not(.print-thermal){display:none!important}}";
  document.body.append(style, iframe);
  fill(iframe.contentDocument);
  setTimeout(() => {
    iframe.contentWindow.focus();
    iframe.contentWindow.print();
    setTimeout(() => {
      iframe.remove();
      style.remove();
    }, 100);
  }, 100);
};

export const printTestPage = () => {
  printViaBrowser({
    storeName: "TEST PRINTER",
    orderNumber: "TEST-001",
    cashier: "Admin",
    date: new Date().toISOString(),
    items: [{ name: "Test Print", qty: 1, price: 1000, total: 1000 }],
    subtotal: 1000,
    tax: 0,
    total: 1000,
    paymentMethod: "Test",
    footer: "Jika terbaca, printer OK"
  });
};

export const printViaWebUSB = async (data) => {
  try {
    const device = await navigator.usb.requestDevice({
      filters: []
    });
    await device.open();
    await device.selectConfiguration(1);
    await device.claimInterface(0);

    const escpos = generateESCPOS(data);
    const encoder = new TextEncoder();
    const bytes = encoder.encode(escpos);

    await device.transferOut(1, bytes);
    await device.close();
  } catch (error) {
    console.error("USB print error:", error);
    throw error;
  }
};

// ponytail: tries 9600 then 115200; X-58MP II sometimes needs 115200
const BAUD_RATES = [9600, 115200];

export const printViaSerial = async (data) => {
  try {
    let ports = await navigator.serial.getPorts();
    if (ports.length === 0) {
      const port = await navigator.serial.requestPort();
      ports = [port];
    }
    const port = ports[0];

    let lastError;
    for (const baud of BAUD_RATES) {
      try {
        await port.open({ baudRate: baud });
        lastError = null;
        break;
      } catch (e) {
        lastError = e;
      }
    }
    if (lastError) throw lastError;

    const writer = port.writable.getWriter();
    // ponytail: no cut for mobile printers
    const escpos = generateESCPOS(data);
    const encoder = new TextEncoder();
    const bytes = encoder.encode(escpos);
    await writer.write(bytes);
    writer.releaseLock();
    await port.close();
  } catch (error) {
    console.error("Serial print error:", error);
    throw error;
  }
};

const BACKEND_PRINT_URL = "http://localhost:5001/print-thermal";

export const printViaBackend = async (data) => {
  const token = getToken();
  const resp = await fetch(BACKEND_PRINT_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: JSON.stringify({ data })
  });
  const result = await resp.json();
  if (!result.success) throw new Error(result.message);
};

export const detectPrintMethod = async () => {
  const methods = [];
  methods.push({ id: "backend", label: "Bluetooth (via Backend)", priority: 0 });
  if ("serial" in navigator) {
    try {
      const ports = await navigator.serial.getPorts();
      methods.push({
        id: "serial",
        label: "Serial (Bluetooth/USB)",
        priority: ports.length > 0 ? 1 : 2
      });
    } catch {
      methods.push({ id: "serial", label: "Serial (Bluetooth/USB)", priority: 2 });
    }
  }
  if ("usb" in navigator) {
    methods.push({ id: "webusb", label: "USB", priority: 3 });
  }
  methods.push({ id: "browser", label: "Browser Print", priority: 9 });
  methods.sort((a, b) => a.priority - b.priority);
  return methods;
};

export const printReceipt = async (data, method = "auto") => {
  if (method === "auto") {
    const methods = await detectPrintMethod();
    const errors = [];
    for (const m of methods) {
      if (m.id === "browser") {
        printViaBrowser(data);
        return;
      }
      try {
        await printReceipt(data, m.id);
        return;
      } catch (e) {
        errors.push(`${m.id}: ${e.message}`);
      }
    }
    throw new Error("All print methods failed:\n" + errors.join("\n"));
  }

  switch (method) {
    case "backend":
      return printViaBackend(data);
    case "webusb":
      return printViaWebUSB(data);
    case "serial":
      return printViaSerial(data);
    case "browser":
    default:
      printViaBrowser(data);
      return;
  }
};
