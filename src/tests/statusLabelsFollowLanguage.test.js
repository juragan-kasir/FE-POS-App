import i18next from "i18next";

// Module-level status maps (kasir order queue, KDS, waiter requests, …) read
// their label through a getter that calls i18next.t, so a label follows the
// language at render time instead of being fixed when the file loads. Some
// of these keys used to carry English in the Indonesian dictionary.

const statusConfig = {
  served: {
    get label() {
      return i18next.t("page.cashier.orderQueue.status.served");
    }
  }
};

afterEach(() => i18next.changeLanguage("id"));

test("the same object reads Indonesian, then English after a language switch", async () => {
  expect(statusConfig.served.label).toBe("Disajikan");
  await i18next.changeLanguage("en");
  expect(statusConfig.served.label).toBe("Served");
});

test("kasir queue statuses are Indonesian in the Indonesian dictionary", () => {
  const id = ["confirmed", "preparing", "ready", "served"].map((s) =>
    i18next.t(`page.cashier.orderQueue.status.${s}`)
  );
  expect(id).toEqual(["Dikonfirmasi", "Diproses", "Siap", "Disajikan"]);
});
