/* eslint-disable no-undef */
import { AxiosError } from "axios";

jest.mock("@/utils/endpoints", () => ({ ENDPOINT: { BASE_URL: "http://api.test" } }));
import { friendlyErrorMessage, normalizeApiError } from "../services/errorMessage";

// UX #11: error toasts showed axios' "Request failed with status code 500" /
// "Network Error" and the server's "Internal server error" or raw DB errors.

const httpError = (status, data) =>
  new AxiosError(
    `Request failed with status code ${status}`,
    "ERR_BAD_RESPONSE",
    {},
    {},
    {
      status,
      data
    }
  );

describe("friendlyErrorMessage", () => {
  test("no response: network or timeout", () => {
    expect(friendlyErrorMessage(new AxiosError("Network Error", "ERR_NETWORK"))).toMatch(
      /Tidak dapat terhubung ke server/
    );
    expect(
      friendlyErrorMessage(new AxiosError("timeout of 30000ms exceeded", "ECONNABORTED"))
    ).toMatch(/terlalu lama merespons/);
  });

  test("a 5xx hides generic or technical server text", () => {
    for (const msg of [
      "Internal server error",
      'null value in column "store" violates',
      undefined
    ]) {
      expect(friendlyErrorMessage(httpError(500, { message: msg }))).toMatch(
        /Terjadi kesalahan di server/
      );
    }
  });

  test("keeps messages the server wrote for users", () => {
    expect(friendlyErrorMessage(httpError(409, { message: "Stok tidak cukup" }))).toBe(
      "Stok tidak cukup"
    );
    expect(friendlyErrorMessage(httpError(500, { message: "Gagal mengimport produk" }))).toBe(
      "Gagal mengimport produk"
    );
  });

  test("a 4xx without a message gets one per status", () => {
    expect(friendlyErrorMessage(httpError(403, {}))).toMatch(/tidak memiliki akses/);
    expect(friendlyErrorMessage(httpError(404, {}))).toMatch(/tidak ditemukan/);
    expect(friendlyErrorMessage(httpError(413, {}))).toMatch(/terlalu besar/);
    expect(friendlyErrorMessage(httpError(422, {}))).toMatch(/tidak valid/);
  });

  test("a cancelled request has no message", () => {
    expect(friendlyErrorMessage(new AxiosError("canceled", "ERR_CANCELED"))).toBeNull();
  });
});

describe("normalizeApiError", () => {
  test("the usual `data.message || err.message` now reads friendly", () => {
    const err = normalizeApiError(httpError(500, { message: "Internal server error" }));
    expect(err.response.data.message || err.message).toMatch(/Terjadi kesalahan di server/);
    expect(err.response.data.serverMessage).toBe("Internal server error");

    const offline = normalizeApiError(new AxiosError("Network Error", "ERR_NETWORK"));
    expect(offline.response?.data?.message || offline.message).toMatch(/Tidak dapat terhubung/);
  });

  test("leaves a server message for users and non-JSON bodies alone", () => {
    const err = normalizeApiError(httpError(409, { message: "Stok tidak cukup", code: "X" }));
    expect(err.response.data).toEqual({ message: "Stok tidak cukup", code: "X" });

    const blob = new Blob(["x"]);
    const download = normalizeApiError(httpError(500, blob));
    expect(download.response.data).toBe(blob);
    expect(download.message).toMatch(/Terjadi kesalahan di server/);
  });
});

describe("axiosInstance response interceptor", () => {
  test("a failed request rejects with the friendly message", async () => {
    const { axiosInstance } = require("../services/index");
    const adapter = (config) =>
      Promise.reject(
        new AxiosError(
          "Request failed with status code 500",
          "ERR_BAD_RESPONSE",
          config,
          {},
          {
            status: 500,
            data: { success: false, message: "Internal server error" },
            config
          }
        )
      );
    await expect(axiosInstance.get("/product/get-all", { adapter })).rejects.toMatchObject({
      message: expect.stringMatching(/Terjadi kesalahan di server/),
      response: { data: { message: expect.stringMatching(/Terjadi kesalahan di server/) } }
    });
  });
});
