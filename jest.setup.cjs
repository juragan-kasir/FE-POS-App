/* global __dirname */
const { TextEncoder, TextDecoder } = require("util");

global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// jsdom does not expose the Fetch API. React Router 7 builds a Request for
// data-router navigations (including createMemoryRouter in tests).
if (!global.Request) {
  global.Request = class Request {
    constructor(url, init = {}) {
      this.url = String(url);
      this.method = init.method || "GET";
      this.signal = init.signal;
      this.headers = init.headers;
      this.body = init.body;
    }
  };
}
// The app initializes i18next before the first render (src/i18n). Module-level
// labels read through i18next.t (status maps, chat greetings) need that
// instance initialized in tests too, or they render undefined. It is loaded
// synchronously with the Indonesian runtime dictionary. It is deliberately
// not bound to react-i18next: components keep the test's own mock (or the
// unbound key-returning t) exactly as before.
{
  const fs = require("fs");
  const path = require("path");
  const i18next = require("i18next");
  const readLocale = (lng) =>
    JSON.parse(
      fs.readFileSync(path.join(__dirname, "public/locales", lng, "translation.json"), "utf8")
    );
  i18next.init({
    lng: "id",
    fallbackLng: false,
    keySeparator: false,
    interpolation: { escapeValue: false },
    resources: { id: { translation: readLocale("id") }, en: { translation: readLocale("en") } },
    initImmediate: false,
    react: { useSuspense: false }
  });
}
