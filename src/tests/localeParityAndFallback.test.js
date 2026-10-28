/* eslint-disable no-undef */
import fs from "fs";
import path from "path";
import i18next from "i18next";

const LOCALE_DIR = path.resolve(__dirname, "../../public/locales");
const APP_ROOT = path.resolve(__dirname, "../..");
// Synthetic, unsupported language code used ONLY to exercise the fallbackLng →
// en machinery. No language resource is registered for it, so every key must
// resolve through the en fallback — keeps fallback coverage without shipping
// an extra maintained language file.
const SYNTHETIC_LNG = "fr";

const readLocale = (lng) =>
  JSON.parse(fs.readFileSync(path.join(LOCALE_DIR, lng, "translation.json"), "utf8"));

const createTestI18n = async (lng = SYNTHETIC_LNG) => {
  const en = readLocale("en");
  const id = readLocale("id");
  const instance = i18next.createInstance();
  await instance.init({
    lng,
    fallbackLng: (code) => (code === "en" || code === "id" ? [] : ["en"]),
    load: "languageOnly",
    supportedLngs: ["en", "id"],
    keySeparator: false,
    interpolation: { escapeValue: false },
    resources: {
      en: { translation: en },
      id: { translation: id }
    },
    react: { useSuspense: false }
  });
  return instance;
};

describe("Locale inventory", () => {
  test("public locales en/id exist and are valid JSON", () => {
    ["en", "id"].forEach((lng) => {
      const data = readLocale(lng);
      expect(typeof data).toBe("object");
      expect(Object.keys(data).length).toBeGreaterThan(0);
    });
  });

  test("en and id have perfect key parity", () => {
    const en = readLocale("en");
    const id = readLocale("id");
    const enKeys = Object.keys(en);
    const idKeys = Object.keys(id);
    expect(enKeys.length).toBe(idKeys.length);
    expect(enKeys.filter((k) => !(k in id))).toEqual([]);
    expect(idKeys.filter((k) => !(k in en))).toEqual([]);
  });

  test("jpn is fully removed: no locale file, no supportedLngs entry, no UI/preload reference", () => {
    expect(fs.existsSync(path.join(LOCALE_DIR, "jpn"))).toBe(false);
    const i18nInit = fs.readFileSync(path.join(APP_ROOT, "src/i18n/index.js"), "utf8");
    expect(i18nInit).not.toContain("jpn");
    expect(i18nInit).toContain('supportedLngs: ["en", "id"]');
    const indexHtml = fs.readFileSync(path.join(APP_ROOT, "index.html"), "utf8");
    expect(indexHtml).not.toContain("jpn");
    expect(indexHtml).toContain('var supported = ["en", "id"]');
    const header = fs.readFileSync(path.join(APP_ROOT, "src/components/layout/Header.jsx"), "utf8");
    expect(header).not.toContain("jpn");
  });
});

describe("Fallback behavior", () => {
  test("unsupported language missing key falls back to en, not raw key", async () => {
    const i18n = await createTestI18n();
    const missingKey = "page.cashier.payment";
    const enVal = readLocale("en")[missingKey];
    expect(enVal).toBeDefined();
    const resolved = i18n.t(missingKey);
    expect(resolved).toBe(enVal);
    expect(resolved).not.toBe(missingKey);
  });

  test("nested missing key also falls back (keySeparator false, flat keys)", async () => {
    const i18n = await createTestI18n();
    const key = "page.cashier.deleteTitle";
    const en = readLocale("en");
    expect(en[key]).toBeDefined();
    expect(i18n.t(key)).toBe(en[key]);
  });

  test("switching back to id returns id translation", async () => {
    const i18n = await createTestI18n();
    const key = "page.cashier.payment";
    expect(i18n.t(key)).toBe(readLocale("en")[key]);
    await i18n.changeLanguage("id");
    expect(i18n.t(key)).toBe(readLocale("id")[key]);
  });

  test("no blank or raw key when unsupported language hits missing key", async () => {
    const i18n = await createTestI18n();
    const key = "page.cashier.payment";
    const val = i18n.t(key);
    expect(typeof val).toBe("string");
    expect(val.trim()).not.toBe("");
    expect(val).not.toBe(key);
  });
});

describe("Critical UI keys resolve under fallback", () => {
  const criticalKeys = [
    "page.cashier.payment",
    "page.cashier.deleteTitle",
    "page.cashier.cart.title",
    "page.product.form.nameProduct",
    "page.member.form.name"
  ];

  test.each(criticalKeys)("critical key %s resolves via fallback→en (no raw key)", async (key) => {
    const i18n = await createTestI18n();
    const en = readLocale("en");
    expect(en[key]).toBeDefined();
    const resolved = i18n.t(key);
    expect(typeof resolved).toBe("string");
    expect(resolved.trim()).not.toBe("");
    expect(resolved).not.toBe(key);
    expect(resolved).toBe(en[key]);
  });

  test("sidebar.roleManagement resolves correctly from en/id", async () => {
    const i18n = await createTestI18n();
    expect(i18n.t("sidebar.roleManagement")).toBe(readLocale("en")["sidebar.roleManagement"]);
    await i18n.changeLanguage("id");
    expect(i18n.t("sidebar.roleManagement")).toBe(readLocale("id")["sidebar.roleManagement"]);
  });
});
