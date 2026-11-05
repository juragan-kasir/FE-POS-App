/* eslint-disable no-undef */
// services/index.js interceptors against the session boundary, exercised
// through the real axios instance with a stub adapter: a qualifying
// protected-request 401 ends the session exactly once, exempt 401s and 403s
// never do, and nothing but the logout revocation leaves the tab once the
// session is ending.

jest.mock("@/utils/endpoints", () => ({
  ENDPOINT: { BASE_URL: "http://api.test" }
}));

let axios;
let axiosInstance;
let session;
let navigate;
let adapter;

const reply = (status) => (config) => {
  if (status < 400) {
    return Promise.resolve({ status, statusText: "OK", data: {}, headers: {}, config });
  }
  const response = { status, statusText: String(status), data: {}, headers: {}, config };
  return Promise.reject(
    new axios.AxiosError(
      `Request failed with status code ${status}`,
      "ERR_BAD_REQUEST",
      config,
      null,
      response
    )
  );
};

const visit = (path) => window.history.pushState({}, "", path);

beforeEach(() => {
  jest.resetModules();
  axios = require("axios");
  session = require("@/services/session");
  axiosInstance = require("@/services/index").axiosInstance;
  navigate = jest.spyOn(session.sessionNavigation, "replace").mockImplementation(() => {});
  adapter = jest.fn(reply(200));
  axiosInstance.defaults.adapter = (config) => adapter(config);
  sessionStorage.clear();
  visit("/dashboard");
});

afterEach(() => {
  jest.restoreAllMocks();
  visit("/");
});

describe("401 → session boundary", () => {
  test("a protected-request 401 ends the session as 'expired' without revoking", async () => {
    adapter.mockImplementation(reply(401));

    await expect(axiosInstance.get("/order/get-orders")).rejects.toMatchObject({
      response: { status: 401 }
    });

    expect(navigate).toHaveBeenCalledTimes(1);
    expect(navigate).toHaveBeenCalledWith("/login");
    expect(sessionStorage.getItem(session.SESSION_NOTICE_KEY)).toBe("expired");
    expect(adapter.mock.calls.map(([c]) => c.url)).not.toContain("/auth/logout");
  });

  test("three simultaneous 401s produce one boundary and one navigation", async () => {
    adapter.mockImplementation(reply(401));

    await Promise.allSettled([
      axiosInstance.get("/a"),
      axiosInstance.get("/b"),
      axiosInstance.post("/c", {})
    ]);

    expect(navigate).toHaveBeenCalledTimes(1);
  });

  test.each([
    "/auth/login",
    "/auth/register",
    "/auth/reset-password",
    "/auth/reset-password/request"
  ])("a 401 from the public auth call %s is ignored", async (url) => {
    adapter.mockImplementation(reply(401));
    await expect(axiosInstance.post(url, {})).rejects.toBeTruthy();
    expect(navigate).not.toHaveBeenCalled();
    expect(session.isSessionEnding()).toBe(false);
  });

  test.each(["/", "/register", "/reset-password", "/customer-display", "/customer-display-board"])(
    "a 401 while on the exempt route %s is ignored",
    async (path) => {
      visit(path);
      adapter.mockImplementation(reply(401));
      await expect(axiosInstance.get("/order/get-orders")).rejects.toBeTruthy();
      expect(navigate).not.toHaveBeenCalled();
      expect(session.isSessionEnding()).toBe(false);
    }
  );

  test("a 403 stays with the page and never ends the session", async () => {
    adapter.mockImplementation(reply(403));
    await expect(axiosInstance.get("/employee/get-employee")).rejects.toMatchObject({
      response: { status: 403 }
    });
    expect(navigate).not.toHaveBeenCalled();
    expect(session.isSessionEnding()).toBe(false);
  });
});

describe("request blocking while the session ends", () => {
  test("new requests are cancelled before reaching the network", async () => {
    session.endSession({ reason: "expired" });
    adapter.mockClear();

    const error = await axiosInstance.get("/dashboard/summary").catch((e) => e);

    expect(axios.isCancel(error)).toBe(true);
    expect(adapter).not.toHaveBeenCalled();
  });

  test("the logout revocation alone goes out, with its own 5s timeout; 401s during teardown are ignored", async () => {
    let releaseLogout;
    adapter.mockImplementation((config) => {
      if (config.url === "/auth/logout") {
        return new Promise((resolve) => {
          releaseLogout = () => resolve({ status: 200, data: {}, headers: {}, config });
        });
      }
      return reply(401)(config);
    });

    const ending = session.endSession({ reason: "logout", revoke: true });
    await new Promise((r) => setTimeout(r, 0));

    const logoutCall = adapter.mock.calls.find(([c]) => c.url === "/auth/logout");
    expect(logoutCall).toBeDefined();
    expect(logoutCall[0].timeout).toBe(5000);

    // an ordinary request during the revocation is cancelled, never sent
    const blocked = await axiosInstance.get("/order/get-orders").catch((e) => e);
    expect(axios.isCancel(blocked)).toBe(true);

    releaseLogout();
    await ending;

    expect(navigate).toHaveBeenCalledTimes(1);
    expect(sessionStorage.getItem(session.SESSION_NOTICE_KEY)).toBe("logout");
  });

  test("the timeout is scoped to the logout request only", async () => {
    await axiosInstance.get("/order/get-orders");
    expect(adapter.mock.calls[0][0].timeout).toBe(0);
  });
});
