// Most server error messages are English ("Supplier not found", "store is
// required", zod's "String must contain at most 100 character(s)") while the
// app runs in Indonesian. When the UI is Indonesian, localizeServerError()
// turns the ones it recognises into Indonesian:
//   1. a known `code` → apiError.code.<CODE> from the locale files;
//   2. zod issues (`errors: [{ field, message }]`) → "<Label> <rule>";
//   3. common English shapes ("X not found", "X is required", "Invalid X",
//      "X already exists", "X must be …", "X is already cancelled").
// Anything it does not recognise is returned unchanged: an English message
// still tells the user what went wrong, a vague Indonesian one would not.
// The lasting fix is Indonesian messages (or codes) from the server.

// Subjects and field names as the server writes them (lowercased, camelCase
// and dots split into words, a trailing "id" dropped) → Indonesian label.
const NOUNS = {
  store: "Toko",
  outlet: "Toko",
  location: "Lokasi",
  supplier: "Supplier",
  "supplier category": "Kategori supplier",
  product: "Produk",
  products: "Produk",
  "product category": "Kategori produk",
  category: "Kategori",
  "category name": "Nama kategori",
  order: "Pesanan",
  table: "Meja",
  customer: "Pelanggan",
  "customer name": "Nama pelanggan",
  member: "Member",
  "member tier": "Tingkat member",
  tier: "Tingkat member",
  user: "Pengguna",
  username: "Username",
  "username/email": "Username/email",
  email: "Email",
  password: "Kata sandi",
  "confirm password": "Konfirmasi kata sandi",
  role: "Role",
  tenant: "Tenant",
  ingredient: "Bahan baku",
  "ingredient name": "Nama bahan baku",
  "ingredient category": "Kategori bahan baku",
  unit: "Satuan",
  name: "Nama",
  title: "Judul",
  price: "Harga",
  "cost price": "Harga beli",
  "price override": "Harga manual",
  "expected price": "Harga",
  quantity: "Jumlah",
  qty: "Jumlah",
  amount: "Nominal",
  item: "Item",
  items: "Item",
  "cart items": "Item keranjang",
  reason: "Alasan",
  notes: "Catatan",
  note: "Catatan",
  description: "Deskripsi",
  phone: "Nomor HP",
  "phone number": "Nomor HP",
  address: "Alamat",
  tax: "Pajak",
  "tax config": "Konfigurasi pajak",
  "tax rate": "Tarif pajak",
  rate: "Tarif",
  discount: "Diskon",
  promo: "Promo",
  "promo code": "Kode promo",
  campaign: "Kampanye promo",
  bundle: "Paket",
  shift: "Shift",
  "shift template": "Template shift",
  employee: "Karyawan",
  department: "Departemen",
  position: "Posisi",
  expense: "Pengeluaran",
  "expense category": "Kategori pengeluaran",
  payment: "Pembayaran",
  "payment method": "Metode pembayaran",
  "payment type": "Metode pembayaran",
  "type payment": "Metode pembayaran",
  reference: "Nomor referensi",
  "reference number": "Nomor referensi",
  "purchase order": "Purchase order",
  "goods receipt": "Penerimaan barang",
  "goods request": "Permintaan barang",
  "purchase return": "Retur pembelian",
  "sales return": "Retur penjualan",
  stock: "Stok",
  "stock transfer": "Transfer stok",
  "stock opname": "Stok opname",
  warehouse: "Gudang",
  contact: "Kontak",
  "contact name": "Nama kontak",
  "bank account": "Rekening bank",
  invoice: "Invoice",
  "split bill": "Split bill",
  register: "Register kasir",
  "cash register": "Register kasir",
  session: "Sesi",
  "start time": "Jam mulai",
  "end time": "Jam selesai",
  date: "Tanggal",
  "start date": "Tanggal mulai",
  "end date": "Tanggal selesai",
  ar: "Piutang",
  ap: "Utang",
  "journal entry": "Jurnal",
  account: "Akun",
  driver: "Driver",
  "delivery order": "Pesanan pengiriman",
  reservation: "Reservasi",
  queue: "Antrian",
  recipe: "Resep",
  bom: "BOM",
  "production order": "Perintah produksi",
  report: "Laporan",
  type: "Jenis",
  status: "Status",
  channel: "Kanal",
  image: "Gambar",
  file: "File",
  url: "URL",
  question: "Pertanyaan",
  barcode: "Barcode",
  code: "Kode",
  symbol: "Simbol",
  currency: "Mata uang",
  "currency code": "Kode mata uang",
  "account number": "Nomor rekening",
  "account name": "Nama pemilik rekening",
  "bank name": "Nama bank",
  "normal balance": "Saldo normal",
  "return reason": "Alasan retur",
  "expense items": "Item pengeluaran",
  "planned quantity": "Jumlah rencana",
  "conversion to base": "Konversi satuan",
  "reservation date": "Tanggal reservasi",
  points: "Poin",
  "total amount": "Total",
  "table number": "Nomor meja",
  "cash amount": "Uang diterima",
  "change amount": "Kembalian",
  sku: "SKU"
};

// Past-participle states used in "X is already <state>".
const STATES = {
  cancelled: "dibatalkan",
  canceled: "dibatalkan",
  paid: "dibayar",
  closed: "ditutup",
  opened: "dibuka",
  open: "dibuka",
  approved: "disetujui",
  rejected: "ditolak",
  completed: "selesai",
  deleted: "dihapus",
  archived: "diarsipkan",
  used: "dipakai",
  active: "aktif",
  inactive: "nonaktif",
  received: "diterima",
  reversed: "dibalik",
  voided: "dibatalkan",
  registered: "terdaftar",
  assigned: "ditetapkan",
  processed: "diproses"
};

// "tableId" → "table", "cart.items" → "cart items", "Supplier category" → "supplier category"
const normalizeSubject = (raw) =>
  String(raw || "")
    .trim()
    .replace(/^(the|a|an)\s+/i, "")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[._]+/g, " ")
    .replace(/\s+/g, " ")
    .toLowerCase()
    .replace(/\s+ids?$/, "")
    .trim();

const noun = (raw) => {
  const key = normalizeSubject(raw);
  return Object.prototype.hasOwnProperty.call(NOUNS, key) ? NOUNS[key] : null;
};

const capitalize = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

// A message already in Indonesian is left alone.
const INDONESIAN =
  /\b(tidak|gagal|silakan|harus|sudah|belum|ditemukan|wajib|berhasil|anda|toko|pilih|masih|maksimal|minimal)\b/i;

// Rules for a whole sentence. Each returns Indonesian text or null.
const SENTENCE_RULES = [
  [/^unauthori[sz]ed$/i, () => "Sesi Anda berakhir. Silakan masuk kembali."],
  [/^(forbidden|access denied)$/i, () => "Anda tidak memiliki akses untuk tindakan ini."],
  [
    /^(.+?) not found(?: (?:for|in) this (?:store|outlet))?(?:: (.+))?$/i,
    ([, s, detail]) =>
      detail
        ? `${noun(s) || "Data"} tidak ditemukan: ${detail}`
        : `${noun(s) || "Data"} tidak ditemukan atau sudah dihapus.`
  ],
  [
    /^at least one (.+?) is required$/i,
    ([, s]) => (noun(s) ? `Minimal satu ${noun(s).toLowerCase()} harus diisi.` : null)
  ],
  [
    /^(.+?) (?:is|are) required$/i,
    ([, s]) => {
      // "store and items are required"
      const parts = s.split(/\s*(?:,|\band\b)\s*/i).filter(Boolean);
      const labels = parts.map(noun);
      if (labels.some((l) => !l)) return null;
      const lower = labels.map((l, i) => (i ? l.toLowerCase() : l));
      const list =
        lower.length > 1
          ? `${lower.slice(0, -1).join(", ")} dan ${lower[lower.length - 1]}`
          : lower[0];
      return `${capitalize(list)} wajib diisi.`;
    }
  ],
  [/^(?:authentication|session) required$/i, () => "Sesi Anda berakhir. Silakan masuk kembali."],
  [
    /^(.+?) not found or inactive$/i,
    ([, s]) => (noun(s) ? `${noun(s)} tidak ditemukan atau tidak aktif.` : null)
  ],
  [
    /^(.+?) with this (name|code|number) already exists$/i,
    ([, s, what]) =>
      noun(s)
        ? `${noun(s)} dengan ${{ name: "nama", code: "kode", number: "nomor" }[what.toLowerCase()]} ini sudah ada.`
        : null
  ],
  [
    /^(.+?) already exists(?: in this (?:store|outlet))?$/i,
    ([, s]) => (noun(s) ? `${noun(s)} ini sudah ada.` : null)
  ],
  [
    /^(.+?) (?:is )?already fully (paid|received)$/i,
    ([, s, st]) =>
      noun(s)
        ? `${noun(s)} sudah ${st.toLowerCase() === "paid" ? "lunas" : "diterima semua"}.`
        : null
  ],
  [
    /^store already has an open cash register$/i,
    () => "Toko ini sudah punya register kasir yang terbuka."
  ],
  [
    /^(.+?) (?:is|has been) already (\w+)$|^(.+?) already (\w+)$/i,
    (m) => {
      const s = m[1] || m[3];
      const state = STATES[(m[2] || m[4] || "").toLowerCase()];
      return noun(s) && state ? `${noun(s)} sudah ${state}.` : null;
    }
  ],
  [/^invalid (.+?)(?: value| format)?$/i, ([, s]) => (noun(s) ? `${noun(s)} tidak valid.` : null)],
  [
    /^(.+?) (?:is )?(?:invalid|not valid)$/i,
    ([, s]) => (noun(s) ? `${noun(s)} tidak valid.` : null)
  ],
  [/^(.+?) not selected$/i, ([, s]) => (noun(s) ? `Pilih ${noun(s).toLowerCase()} dulu.` : null)]
];

// Rules for "<field> <rule>" (also zod's own messages, where the field comes
// separately). Each returns the Indonesian rule text or null.
const RULE_RULES = [
  [/^required$/i, () => "wajib diisi"],
  [/^(?:is )?required$/i, () => "wajib diisi"],
  [/^expected (?:number|integer), received \w+$/i, () => "harus berupa angka"],
  [/^expected string, received \w+$/i, () => "harus berupa teks"],
  [/^(?:string )?must contain at most (\d+) character\(s\)$/i, ([, n]) => `maksimal ${n} karakter`],
  [/^(?:string )?must contain at least (\d+) character\(s\)$/i, ([, n]) => `minimal ${n} karakter`],
  [/^(?:must be )?at most (\d+) characters$/i, ([, n]) => `maksimal ${n} karakter`],
  [/^min(?:imum)? (\d+) characters$/i, ([, n]) => `minimal ${n} karakter`],
  [/^invalid email$/i, () => "email tidak valid"],
  [/^number must be greater than 0$/i, () => "harus lebih dari 0"],
  [/^number must be greater than or equal to 0$/i, () => "tidak boleh negatif"],
  [/^must be a positive (?:integer|number)(?: .*)?$/i, () => "harus berupa angka lebih dari 0"],
  [/^must be an integer$/i, () => "harus berupa bilangan bulat"],
  [/^must be an integer >= 0$/i, () => "harus berupa bilangan bulat, minimal 0"],
  [/^must be a (?:finite )?number$/i, () => "harus berupa angka"],
  [/^must not be negative$/i, () => "tidak boleh negatif"],
  [/^must be positive$/i, () => "harus lebih dari 0"],
  [/^must not be empty$/i, () => "tidak boleh kosong"],
  [/^must be greater than (\d+)$/i, ([, n]) => `harus lebih dari ${n}`],
  [/^must be between (\S+) and (\S+)$/i, ([, a, b]) => `harus antara ${a} dan ${b}`],
  [/^must be at most (\d+) characters$/i, ([, n]) => `maksimal ${n} karakter`]
];

const applyRules = (rules, text) => {
  for (const [re, fn] of rules) {
    const m = text.match(re);
    if (m) {
      const out = fn(m);
      if (out) return out;
    }
  }
  return null;
};

// "<field> <rule>" as one sentence, e.g. "taxRate must be between 0 and 100".
const fieldRuleSentence = (text) => {
  const m = text.match(/^(.+?) (must .+|is required|required|min(?:imum)? \d+ characters)$/i);
  if (!m || !noun(m[1])) return null;
  // "productId must be a positive integer" is about a bad reference, not
  // a number the user typed.
  if (/id$/i.test(m[1].trim()) && /\b(number|integer)\b/i.test(m[2])) {
    return `${noun(m[1])} tidak valid.`;
  }
  const rule = applyRules(RULE_RULES, m[2]);
  return rule ? `${noun(m[1])} ${rule}.` : null;
};

export const localizeSentence = (message) => {
  if (typeof message !== "string") return null;
  const text = message.trim().replace(/\.$/, "");
  if (!text || INDONESIAN.test(text)) return null;
  return applyRules(SENTENCE_RULES, text) || fieldRuleSentence(text);
};

// One zod issue → "<Label> <rule>", or null when either part is unknown.
const localizeIssue = ({ field, message } = {}) => {
  if (typeof message !== "string") return null;
  if (INDONESIAN.test(message)) {
    const label = noun(field);
    return label ? `${label} ${message}` : `${field}: ${message}`;
  }
  const whole = localizeSentence(message);
  if (whole) return whole;
  const label = noun(
    String(field || "")
      .split(".")
      .pop()
  );
  const rule = applyRules(RULE_RULES, message.trim().replace(/\.$/, ""));
  return label && rule ? `${label} ${rule}.` : null;
};

/**
 * Indonesian text for a server error body, or null to keep the server's own
 * message. `translate(key)` returns the locale text or null when missing.
 */
export const localizeServerError = (data, translate) => {
  if (!data || typeof data !== "object") return null;

  if (typeof data.code === "string" && translate) {
    const byCode = translate(`apiError.code.${data.code}`);
    if (byCode) return byCode;
  }

  if (Array.isArray(data.errors) && data.errors.length > 0) {
    const issues = data.errors.slice(0, 3).map(localizeIssue);
    if (issues.every(Boolean)) return issues.join(" ");
  }

  return localizeSentence(data.message);
};
