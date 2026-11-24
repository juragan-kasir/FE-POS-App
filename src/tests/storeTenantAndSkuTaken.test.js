import { AxiosError } from "axios";
import i18next from "i18next";

jest.mock("@/utils/endpoints", () => ({ ENDPOINT: { BASE_URL: "http://api.test" } }));
import { friendlyErrorMessage } from "../services/errorMessage";
import { isSkuTaken, showSkuTaken } from "../page/product/skuTaken";

// BE #386 refuses every write on an outlet without a tenant with
// 422 STORE_TENANT_REQUIRED (18 models, not only stock transfer), and BE #389
// answers a duplicate typed SKU with 409 SKU_TAKEN { field: "sku" }.

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

describe("STORE_TENANT_REQUIRED", () => {
  test("the message is about the outlet, not only about stock transfer", () => {
    const text = friendlyErrorMessage(
      httpError(422, { code: "STORE_TENANT_REQUIRED", message: "store has no tenant" })
    );
    expect(text).toBe(i18next.t("apiError.code.STORE_TENANT_REQUIRED"));
    expect(text).not.toMatch(/transfer/i);
    expect(text).toMatch(/tenant/);
  });
});

describe("SKU_TAKEN", () => {
  const skuError = () =>
    httpError(409, {
      code: "SKU_TAKEN",
      field: "sku",
      message: 'SKU "ABC" sudah dipakai produk lain'
    });

  test("has a locale text", () => {
    expect(friendlyErrorMessage(skuError())).toBe(i18next.t("apiError.code.SKU_TAKEN"));
    expect(i18next.t("apiError.code.SKU_TAKEN")).toMatch(/SKU/);
  });

  test("is recognised by code only", () => {
    expect(isSkuTaken(skuError())).toBe(true);
    expect(isSkuTaken(httpError(409, { code: "OTHER" }))).toBe(false);
    expect(isSkuTaken(new Error("network"))).toBe(false);
  });

  test("puts the message on the SKU field and goes back to step 1", () => {
    const form = { setError: jest.fn() };
    const setCurrentStep = jest.fn();
    const err = skuError();
    err.response.data.message = "SKU sudah dipakai";

    showSkuTaken({ err, form, setCurrentStep, fallback: "fallback" });

    expect(form.setError).toHaveBeenCalledWith("sku", {
      type: "server",
      message: "SKU sudah dipakai"
    });
    expect(setCurrentStep).toHaveBeenCalledWith(1);
  });

  test("falls back when the body has no message", () => {
    const form = { setError: jest.fn() };
    showSkuTaken({
      err: httpError(409, { code: "SKU_TAKEN" }),
      form,
      setCurrentStep: jest.fn(),
      fallback: "fallback"
    });
    expect(form.setError).toHaveBeenCalledWith("sku", { type: "server", message: "fallback" });
  });
});
