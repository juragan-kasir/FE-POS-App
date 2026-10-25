import { guides } from "../components/organism/UserGuide";
import id from "../i18n/id.json";
import en from "../i18n/en.json";

const getKey = (locale, key) => locale[key];

const collectKeys = (guide) =>
  [
    guide.titleKey,
    guide.introKey,
    ...guide.steps.map((step) => step.textKey),
    ...(guide.tipKeys || [])
  ].filter(Boolean);

describe("UserGuide registry", () => {
  const entries = Object.entries(guides);

  test("has guides for every form that lacked one", () => {
    const required = [
      "add-bom",
      "add-bundle",
      "add-business-trip",
      "add-driver",
      "add-discount",
      "add-expense-category",
      "add-expense",
      "add-goods-receipt",
      "add-goods-request",
      "add-production-order",
      "add-promo",
      "add-reservation",
      "create-sales-return",
      "add-shift-template",
      "add-stock-transfer",
      "add-user",
      "add-role",
      "edit-role",
      "edit-category",
      "edit-ingredient-category"
    ];

    required.forEach((key) => expect(guides[key]).toBeDefined());
  });

  test.each(entries)("%s has translation keys in id and en", (_guideKey, guide) => {
    const keys = collectKeys(guide);

    expect(keys.length).toBeGreaterThan(0);
    keys.forEach((key) => {
      expect(getKey(id, key)).toEqual(expect.any(String));
      expect(getKey(en, key)).toEqual(expect.any(String));
    });
  });
});
