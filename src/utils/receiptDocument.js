import { dateLocale } from "@/lib/locale";

// The ONE receipt design. The invoice-settings preview, the cashier's
// on-screen receipt and the browser print all render the element built
// here, so what is previewed is exactly what comes out of the printer.
//
// Thermal-safe on purpose: black on white, no background fills (browsers
// drop backgrounds when printing, which used to blank the white-on-dark
// header), separators drawn with dashed/solid borders.
//
// Built with createElement + textContent only — receipt data is user input
// (store, member and item names), so no HTML string ever reaches a sink.

export const DEFAULT_RECEIPT_LABELS = {
  invoiceNumber: "No. Invoice",
  date: "Tanggal",
  cashier: "Kasir",
  table: "Meja",
  paymentMethod: "Pembayaran",
  memberInfo: "Info Member",
  memberName: "Nama",
  memberTier: "Tier",
  memberPoints: "Poin",
  subtotal: "Subtotal",
  discount: "Diskon",
  tax: "Pajak",
  redeemPoints: (points) => `Redeem Poin (${points} Poin)`,
  totalBeforeRedeem: "Total sebelum redeem",
  total: "TOTAL",
  cash: "Tunai",
  change: "Kembali",
  noItems: "-"
};

const FONT_STACKS = {
  sans: 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif',
  serif: 'Georgia, Cambria, "Times New Roman", Times, serif',
  monospace: '"Courier New", Courier, monospace'
};

const FONT_SIZES = {
  small: { base: 10, small: 9, title: 13, total: 12 },
  normal: { base: 11, small: 10, title: 15, total: 13 },
  large: { base: 13, small: 11, title: 17, total: 15 }
};

const SPACING = {
  compact: { row: 1, section: 4 },
  normal: { row: 2, section: 6 },
  relaxed: { row: 4, section: 10 }
};

export const formatRupiah = (value) => `Rp${Number(value || 0).toLocaleString("id-ID")}`;

const parseMaybeJson = (raw) => {
  if (!raw) return {};
  if (typeof raw !== "string") return raw;
  try {
    return JSON.parse(raw) || {};
  } catch {
    return {};
  }
};

// Invoice settings store social visibility by list position; an older
// platform-keyed map is honoured too. Visible unless explicitly false.
export const isSocialVisible = (visibility, entry, index) => {
  const map = parseMaybeJson(visibility);
  if (map[index] === false || map[String(index)] === false) return false;
  if (entry?.platform && map[entry.platform] === false) return false;
  return true;
};

const socialText = (sm) =>
  typeof sm === "string"
    ? sm
    : `${sm?.platform || sm?.name || ""}: ${sm?.account || sm?.username || sm?.url || ""}`.trim();

// Store address as separate printed lines, each field honouring its
// visibility switch from the invoice settings.
export const buildAddressLines = (fields = {}, visibility = {}) => {
  const vis = parseMaybeJson(visibility);
  const on = (key) => vis[key] !== false;
  const lines = [];
  if (on("address") && fields.address) lines.push(fields.address);
  if (on("locationDetail") && fields.locationDetail) lines.push(fields.locationDetail);
  // A full street address (e.g. from a map pick) often already names the
  // village/district/city/province and postal code — print each only once.
  const written = `${on("address") ? fields.address || "" : ""} ${
    on("locationDetail") ? fields.locationDetail || "" : ""
  }`.toLowerCase();
  const alreadyWritten = (name) => {
    const core = String(name)
      .toLowerCase()
      .replace(
        /^(kota administrasi|kabupaten administrasi|kabupaten|kota|kecamatan|kelurahan|desa|provinsi)\s+/,
        ""
      )
      .trim();
    return core.length > 0 && written.includes(core);
  };
  const region = [
    on("village") && fields.village,
    on("district") && fields.district,
    on("city") && fields.city,
    on("province") && fields.province
  ].filter((name) => name && !alreadyWritten(name));
  if (region.length) lines.push(region.join(", "));
  if (on("postalCode") && fields.postalCode && !written.includes(String(fields.postalCode))) {
    lines.push(`Kode Pos ${fields.postalCode}`);
  }
  if (on("phone") && fields.phone) lines.push(`Telp ${fields.phone}`);
  if (on("email") && fields.email) lines.push(fields.email);
  return lines;
};

const formatDate = (date) => {
  const d = date ? new Date(date) : null;
  if (!d || Number.isNaN(d.getTime())) return "";
  return d.toLocaleString(dateLocale(), {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
};

// Normalizes the flat receipt data (the same object the thermal paths and
// the local print bridge receive) into what the receipt shows.
export const buildReceiptModel = (data = {}) => {
  const labels = { ...DEFAULT_RECEIPT_LABELS, ...(data.labels || {}) };
  const addressVisibility = parseMaybeJson(data.addressFieldsVisibility);
  const memberVisibility = parseMaybeJson(data.memberFieldsVisibility);
  const showMember = data.showMemberInfo !== false;

  const addressLines = Array.isArray(data.addressLines)
    ? data.addressLines.filter(Boolean)
    : [data.storeAddress, data.storePhone && `Telp ${data.storePhone}`, data.storeEmail].filter(
        Boolean
      );

  const member = [];
  if (showMember) {
    if (data.memberName && memberVisibility.name !== false)
      member.push([labels.memberName, data.memberName]);
    if (data.memberTier && memberVisibility.tier !== false)
      member.push([labels.memberTier, data.memberTier]);
    if (
      (data.memberName || data.memberTier) &&
      data.memberPoints != null &&
      memberVisibility.points !== false
    )
      member.push([labels.memberPoints, Number(data.memberPoints).toLocaleString("id-ID")]);
  }

  const items = (data.items || []).map((item) => {
    const qty = Number(item.qty ?? item.count ?? item.quantity ?? 0);
    const price = Number(item.price || 0);
    return {
      name: item.name || item.nameProduct || item.productName || "-",
      variant: item.variant || item.options?.[0]?.name || item.variantName || "",
      qty,
      price,
      total: Number(item.total ?? item.totalPrice ?? qty * price)
    };
  });

  const redeemed = Number(data.redeemedPoints || 0);
  const total = Number(data.total || 0);

  return {
    labels,
    paperSize: data.paperSize === "80mm" ? "80mm" : "58mm",
    fontFamily: FONT_STACKS[data.fontFamily] ? data.fontFamily : "monospace",
    fontSize: FONT_SIZES[data.fontSize] ? data.fontSize : "normal",
    lineSpacing: SPACING[data.lineSpacing] ? data.lineSpacing : "normal",
    logo: data.showLogo !== false && data.logo ? data.logo : "",
    storeName:
      data.showStoreName !== false && addressVisibility.storeName !== false
        ? data.storeName || ""
        : "",
    addressLines: data.showAddress !== false ? addressLines : [],
    meta: [
      [labels.invoiceNumber, data.orderNumber],
      [labels.date, data.dateText || formatDate(data.date)],
      [labels.cashier, data.cashier],
      [labels.table, data.table],
      [labels.paymentMethod, data.paymentMethodLabel || data.paymentMethod]
    ].filter(([, value]) => value != null && value !== "" && value !== "-"),
    member,
    items,
    totals: [
      [labels.subtotal, formatRupiah(data.subtotal)],
      Number(data.discount) > 0 && [labels.discount, `-${formatRupiah(data.discount)}`],
      Number(data.tax) > 0 && [data.taxLabel || labels.tax, formatRupiah(data.tax)],
      redeemed > 0 && [
        typeof labels.redeemPoints === "function"
          ? labels.redeemPoints(redeemed.toLocaleString("id-ID"))
          : labels.redeemPoints,
        `-${formatRupiah(redeemed)}`
      ],
      redeemed > 0 && [labels.totalBeforeRedeem, formatRupiah(total + redeemed)]
    ].filter(Boolean),
    grandTotal: [labels.total, formatRupiah(total)],
    tender:
      data.showTender === false
        ? []
        : [
            Number(data.cashAmount) > 0 && [labels.cash, formatRupiah(data.cashAmount)],
            Number(data.cashAmount) > 0 && [labels.change, formatRupiah(data.changeAmount)]
          ].filter(Boolean),
    footer: data.footer || "",
    social:
      data.showSocialMedia === false
        ? []
        : (data.socialMedia || [])
            .filter((sm, i) => isSocialVisible(data.socialMediaVisibility, sm, i))
            .map(socialText)
            .filter(Boolean)
  };
};

// Page CSS for the print document. No @page size: the selected printer's
// paper decides it (a thermal driver reports 58/80mm; "Save as PDF" gets
// a normal page with the receipt centred). The receipt element itself is
// exactly 58mm/80mm wide.
export const receiptPrintCss = () =>
  "@page { margin: 0; } " +
  "html, body { margin: 0; padding: 0; background: #fff; } " +
  "body { display: flex; justify-content: center; } " +
  "* { -webkit-print-color-adjust: exact; print-color-adjust: exact; }";

// Builds the receipt element in `doc` (the page's own document for the
// preview, the print window's document for printing).
export const renderReceiptElement = (data, doc = document) => {
  const m = buildReceiptModel(data);
  const size = FONT_SIZES[m.fontSize];
  const gap = SPACING[m.lineSpacing];

  const el = (tag, style, text) => {
    const node = doc.createElement(tag);
    if (style) node.style.cssText = style;
    if (text != null) node.textContent = String(text);
    return node;
  };
  const row = (label, value, style = "") => {
    const r = el(
      "div",
      `display:flex;justify-content:space-between;gap:8px;padding:${gap.row}px 0;${style}`
    );
    r.append(el("span", "", label), el("span", "text-align:right;white-space:nowrap;", value));
    return r;
  };
  const rule = (kind = "dashed") =>
    el("div", `border-top:1px ${kind} #000;margin:${gap.section}px 0;height:0;`);

  const paper = el(
    "div",
    [
      `width:${m.paperSize}`,
      "box-sizing:border-box",
      "padding:3mm 3mm 5mm",
      "background:#fff",
      "color:#000",
      `font-family:${FONT_STACKS[m.fontFamily]}`,
      `font-size:${size.base}px`,
      "line-height:1.35",
      "word-break:break-word"
    ].join(";")
  );
  paper.setAttribute("data-receipt", m.paperSize);

  // Header: logo, store name, address lines.
  if (m.logo || m.storeName || m.addressLines.length) {
    const header = el("div", "text-align:center;");
    header.setAttribute("data-receipt-section", "header");
    if (m.logo) {
      const img = doc.createElement("img");
      img.src = m.logo;
      img.alt = "";
      img.style.cssText = `display:block;margin:0 auto ${gap.section}px;max-width:60%;max-height:48px;object-fit:contain;`;
      header.append(img);
    }
    if (m.storeName)
      header.append(
        el(
          "div",
          `font-size:${size.title}px;font-weight:700;text-transform:uppercase;`,
          m.storeName
        )
      );
    m.addressLines.forEach((line) => header.append(el("div", `font-size:${size.small}px;`, line)));
    paper.append(header, rule());
  }

  if (m.meta.length) {
    const meta = el("div", `font-size:${size.small}px;`);
    meta.setAttribute("data-receipt-section", "meta");
    m.meta.forEach(([label, value]) => meta.append(row(label, value)));
    paper.append(meta, rule());
  }

  if (m.member.length) {
    const member = el("div", `font-size:${size.small}px;`);
    member.setAttribute("data-receipt-section", "member");
    member.append(el("div", "font-weight:700;text-transform:uppercase;", m.labels.memberInfo));
    m.member.forEach(([label, value]) => member.append(row(label, value)));
    paper.append(member, rule());
  }

  const items = el("div", "");
  items.setAttribute("data-receipt-section", "items");
  if (!m.items.length) items.append(el("div", "text-align:center;", m.labels.noItems));
  m.items.forEach((item) => {
    const block = el("div", `padding:${gap.row}px 0;`);
    block.append(el("div", "font-weight:600;", item.name));
    if (item.variant) block.append(el("div", `font-size:${size.small}px;`, `– ${item.variant}`));
    block.append(row(`${item.qty} x ${formatRupiah(item.price)}`, formatRupiah(item.total)));
    items.append(block);
  });
  paper.append(items, rule());

  const totals = el("div", "");
  totals.setAttribute("data-receipt-section", "totals");
  m.totals.forEach(([label, value]) => totals.append(row(label, value)));
  totals.append(rule("solid"));
  totals.append(
    row(m.grandTotal[0], m.grandTotal[1], `font-weight:700;font-size:${size.total}px;`)
  );
  m.tender.forEach(([label, value]) => totals.append(row(label, value)));
  paper.append(totals);

  if (m.footer || m.social.length) {
    paper.append(rule());
    const footer = el("div", `text-align:center;font-size:${size.small}px;`);
    footer.setAttribute("data-receipt-section", "footer");
    if (m.footer) footer.append(el("div", "font-style:italic;white-space:pre-line;", m.footer));
    m.social.forEach((line) => footer.append(el("div", "", line)));
    paper.append(footer);
  }

  return paper;
};
