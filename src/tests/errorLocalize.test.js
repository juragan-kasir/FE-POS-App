import { AxiosError } from "axios";
import i18next from "i18next";

jest.mock("@/utils/endpoints", () => ({ ENDPOINT: { BASE_URL: "http://api.test" } }));
import { friendlyErrorMessage, normalizeApiError } from "../services/errorMessage";
import { localizeServerError, localizeSentence } from "../services/errorLocalize";
import { forbiddenKind } from "../components/organism/abort-controller";

// UX audit #2: most server 4xx messages are English while the app runs in
// Indonesian. Recognised ones are shown in Indonesian; unknown ones keep the
// server's words rather than a vague generic message.

const httpError = (status, data) =>
  new AxiosError(
    `Request failed with status code ${status}`,
    "ERR_BAD_REQUEST",
    {},
    {},
    {
      status,
      data
    }
  );

describe("localizeSentence", () => {
  test.each([
    ["Supplier not found", "Supplier tidak ditemukan atau sudah dihapus."],
    ["Product not found: Kopi Susu", "Produk tidak ditemukan: Kopi Susu"],
    ["Batch not found", "Data tidak ditemukan atau sudah dihapus."],
    ["store is required", "Toko wajib diisi."],
    ["store and items are required", "Toko dan item wajib diisi."],
    [
      "Bank name, account number, and account name are required",
      "Nama bank, nomor rekening dan nama pemilik rekening wajib diisi."
    ],
    ["Category name already exists", "Nama kategori ini sudah ada."],
    ["Product with this name already exists.", "Produk dengan nama ini sudah ada."],
    ["Purchase order is already cancelled", "Purchase order sudah dibatalkan."],
    ["Split bill already paid", "Split bill sudah dibayar."],
    ["AR is already fully paid", "Piutang sudah lunas."],
    ["Invalid store value", "Toko tidak valid."],
    ["taxRate must be between 0 and 100", "Tarif pajak harus antara 0 dan 100."],
    ["productId must be a positive integer", "Produk tidak valid."],
    ["Quantity must be greater than 0", "Jumlah harus lebih dari 0."],
    ["cart.items must not be empty", "Item keranjang tidak boleh kosong."],
    ["Unauthorized", "Sesi Anda berakhir. Silakan masuk kembali."]
  ])("%s", (input, expected) => {
    expect(localizeSentence(input)).toBe(expected);
  });

  test("unknown English and Indonesian messages are left to the caller", () => {
    expect(localizeSentence("Order is not eligible for split-bill payment")).toBeNull();
    expect(localizeSentence("Foo bar is required")).toBeNull();
    expect(localizeSentence("Stok tidak cukup")).toBeNull();
    expect(localizeSentence("Shift Sudah Terdaftar")).toBeNull();
  });
});

describe("localizeServerError", () => {
  const translate = (key) => (key === "apiError.code.SPLIT_NOT_PAYABLE" ? "Sudah dibayar." : null);

  test("a known code wins over the message", () => {
    expect(
      localizeServerError(
        { code: "SPLIT_NOT_PAYABLE", message: "Split bill already paid" },
        translate
      )
    ).toBe("Sudah dibayar.");
  });

  test("zod issues become '<Label> <rule>'", () => {
    expect(
      localizeServerError({
        message: "nameProduct: String must contain at most 100 character(s); price: Required",
        errors: [
          { field: "name", message: "String must contain at most 100 character(s)" },
          { field: "items.0.price", message: "Required" }
        ]
      })
    ).toBe("Nama maksimal 100 karakter. Harga wajib diisi.");
  });

  test("an unknown zod field keeps the whole server message", () => {
    expect(
      localizeServerError({
        message: "fooBar: Required",
        errors: [{ field: "fooBar", message: "Required" }]
      })
    ).toBeNull();
  });
});

describe("friendlyErrorMessage with an Indonesian UI", () => {
  test("a recognised 4xx is shown in Indonesian", () => {
    expect(friendlyErrorMessage(httpError(404, { message: "Supplier not found" }))).toBe(
      "Supplier tidak ditemukan atau sudah dihapus."
    );
  });

  test("a known code uses the locale text", () => {
    expect(
      friendlyErrorMessage(
        httpError(409, { code: "SPLIT_NOT_PAYABLE", message: "Split bill already paid" })
      )
    ).toBe(i18next.t("apiError.code.SPLIT_NOT_PAYABLE"));
    expect(i18next.t("apiError.code.SPLIT_NOT_PAYABLE")).toBe("Split bill ini sudah dibayar.");
  });

  test("an unrecognised English 4xx keeps the server's words", () => {
    expect(
      friendlyErrorMessage(
        httpError(409, { message: "Order is not eligible for split-bill payment" })
      )
    ).toBe("Order is not eligible for split-bill payment");
  });

  test("5xx handling is unchanged", () => {
    expect(friendlyErrorMessage(httpError(500, { message: "Supplier not found" }))).toMatch(
      /Terjadi kesalahan di server/
    );
  });

  test("normalizeApiError keeps the server's text as serverMessage", () => {
    const err = normalizeApiError(httpError(404, { message: "Supplier not found" }));
    expect(err.response.data.message).toBe("Supplier tidak ditemukan atau sudah dihapus.");
    expect(err.response.data.serverMessage).toBe("Supplier not found");
  });
});

describe("friendlyErrorMessage with an English UI", () => {
  const original = i18next.language;
  beforeAll(() => {
    i18next.language = "en";
  });
  afterAll(() => {
    i18next.language = original;
  });

  test("keeps the server's English text", () => {
    expect(friendlyErrorMessage(httpError(404, { message: "Supplier not found" }))).toBe(
      "Supplier not found"
    );
  });
});

test("forbiddenKind still spots a store-less account after localization", () => {
  const err = normalizeApiError(httpError(403, { message: "Store assignment required" }));
  expect(forbiddenKind(err)).toBe("noStore");
  expect(
    forbiddenKind({
      response: {
        status: 403,
        data: { message: "Pilih toko", serverMessage: "Store assignment required" }
      }
    })
  ).toBe("noStore");
});
