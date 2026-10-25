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