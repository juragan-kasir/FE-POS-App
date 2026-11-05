/* eslint-disable no-undef */
// Disabled-session 403 handling boundary (F1): the first qualifying
// protected-request 403 runs one shared GET /auth/context probe. Probe 200
// preserves the session and the original 403; probe 403 ends the session
// through the existing boundary exactly once; probe failure preserves
// everything; the probe never triggers itself.

jest.mock("@/utils/endpoints", () => ({
  ENDPOINT: { BASE_URL: "http://api.test" }
}));

let axios;
let axiosInstance;
let session;
let navigate;

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

const visit = (path) => window.history.pushState({}, "", path);

beforeEach(() => {
  jest.resetModules();
  axios = require("axios");
  session = require("@/services/session");
  axiosInstance = require("@/services/index").axiosInstance;
  navigate = jest.spyOn(session.sessionNavigation, "replace").mockImplementation(() => {});
  sessionStorage.clear();
  visit("/dashboard");
});

afterEach(() => {
  jest.restoreAllMocks();
  visit("/");
});

// Adapter factory: routes by URL. `probe` controls /auth/context;
// everything else answers `appStatus`.
const useAdapter = ({ appStatus = 200, probe = 200 }) => {
  const calls = [];
  const adapter = jest.fn((config) => {
    calls.push(config.url);
    const status = config.url === "/auth/context" ? probe : appStatus;
    if (probe === "network-error" && config.url === "/auth/context") {
      return Promise.reject(
        new axios.AxiosError("Network Error", "ERR_NETWORK", config, null, undefined)
      );
    }
    if (typeof probe === "number" && probe >= 500 && config.url === "/auth/context") {
      const response = { status: probe, statusText: String(probe), data: {}, headers: {}, config };
      return Promise.reject(
        new axios.AxiosError(
          `Request failed with status code ${probe}`,
          "ERR_BAD_RESPONSE",
          config,
          null,
          response
        )
      );
    }
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
  });
  axiosInstance.defaults.adapter = adapter;
  return calls;
};

describe("disabled-session probe: ordinary 403", () => {
  test("protected 403 + probe 200 preserves session, navigation, credentials; original 403 intact; one probe", async () => {
    const calls = useAdapter({ appStatus: 403, probe: 200 });

    await expect(axiosInstance.get("/order/get-orders")).rejects.toMatchObject({
      response: { status: 403 }
    });
    await flush();

    expect(navigate).not.toHaveBeenCalled();
    expect(sessionStorage.getItem(session.SESSION_NOTICE_KEY)).toBeNull();
    expect(calls.filter((u) => u === "/auth/context")).toHaveLength(1);
  });
});

describe("disabled-session probe: dead account", () => {
  test("protected 403 + probe 403 ends session once with one navigation and notice", async () => {
    const calls = useAdapter({ appStatus: 403, probe: 403 });

    await expect(axiosInstance.get("/order/get-orders")).rejects.toMatchObject({
      response: { status: 403 }
    });
    await flush();

    expect(navigate).toHaveBeenCalledTimes(1);
    expect(navigate).toHaveBeenCalledWith("/login");
    expect(sessionStorage.getItem(session.SESSION_NOTICE_KEY)).toBe("expired");
    expect(calls.filter((u) => u === "/auth/context")).toHaveLength(1);
    expect(calls).not.toContain("/auth/logout");
  });
});

describe("disabled-session probe: concurrency", () => {
  test("5 simultaneous 403s share one probe and one teardown", async () => {
    const calls = useAdapter({ appStatus: 403, probe: 403 });

    await Promise.allSettled([
      axiosInstance.get("/a"),
      axiosInstance.get("/b"),
      axiosInstance.post("/c", {}),
      axiosInstance.put("/d", {}),
      axiosInstance.delete("/e")
    ]);
    await flush();

    expect(calls.filter((u) => u === "/auth/context")).toHaveLength(1);
    expect(navigate).toHaveBeenCalledTimes(1);
  });
});

describe("disabled-session probe: failure tolerance", () => {
  test("probe network failure preserves session without navigation or loops", async () => {
    const calls = useAdapter({ appStatus: 403, probe: "network-error" });

    await expect(axiosInstance.get("/order/get-orders")).rejects.toMatchObject({
      response: { status: 403 }
    });
    await flush();

    expect(navigate).not.toHaveBeenCalled();
    expect(calls.filter((u) => u === "/auth/context")).toHaveLength(1);
  });

  test("probe 5xx preserves session without navigation", async () => {
    const calls = useAdapter({ appStatus: 403, probe: 500 });

    await expect(axiosInstance.get("/order/get-orders")).rejects.toMatchObject({
      response: { status: 403 }
    });
    await flush();

    expect(navigate).not.toHaveBeenCalled();
    expect(calls.filter((u) => u === "/auth/context")).toHaveLength(1);
  });
});

describe("disabled-session probe: retry isolation", () => {
  test("concurrent retry-generated 403s share one probe; probe 200 means no teardown", async () => {
    const calls = useAdapter({ appStatus: 403, probe: 200 });

    // One logical query whose retries fan out concurrently: a single flight.
    await Promise.allSettled([
      axiosInstance.get("/order/get-orders"),
      axiosInstance.get("/order/get-orders"),
      axiosInstance.get("/order/get-orders")
    ]);
    await flush();

    expect(calls.filter((u) => u === "/auth/context")).toHaveLength(1);
    expect(navigate).not.toHaveBeenCalled();
  });

  test("sequential 403s after a completed probe trigger a fresh probe once the OK window passes (no permanent cache)", async () => {
    const { PROBE_OK_TTL_MS } = require("@/services/index");
    let now = 1_000_000;
    jest.spyOn(Date, "now").mockImplementation(() => now);
    const calls = useAdapter({ appStatus: 403, probe: 200 });

    await expect(axiosInstance.get("/order/get-orders")).rejects.toMatchObject({
      response: { status: 403 }
    });
    await flush();
    now += PROBE_OK_TTL_MS;
    await expect(axiosInstance.get("/order/get-orders")).rejects.toMatchObject({
      response: { status: 403 }
    });
    await flush();

    // Fresh probe per completed cycle (after the short OK window) so a
    // subsequently disabled account is still detected.
    expect(calls.filter((u) => u === "/auth/context")).toHaveLength(2);
    expect(navigate).not.toHaveBeenCalled();
  });

  test("sequential 403s inside the OK window share the completed probe", async () => {
    const { PROBE_OK_TTL_MS } = require("@/services/index");
    let now = 1_000_000;
    jest.spyOn(Date, "now").mockImplementation(() => now);
    const calls = useAdapter({ appStatus: 403, probe: 200 });

    for (const url of [
      "/pos/dashboard/summary",
      "/notification/unread",
      "/purchase-payment/ap-dashboard"
    ]) {
      await expect(axiosInstance.get(url)).rejects.toMatchObject({ response: { status: 403 } });
      await flush();
      now += Math.floor(PROBE_OK_TTL_MS / 4);
    }

    expect(calls.filter((u) => u === "/auth/context")).toHaveLength(1);
    expect(navigate).not.toHaveBeenCalled();
  });
});

describe("disabled-session probe: no recursion", () => {
  test("a 403 probe response never triggers a second probe", async () => {
    const calls = useAdapter({ appStatus: 403, probe: 403 });

    await expect(axiosInstance.get("/order/get-orders")).rejects.toMatchObject({
      response: { status: 403 }
    });
    await flush();
    await flush();

    expect(calls.filter((u) => u === "/auth/context")).toHaveLength(1);
    expect(navigate).toHaveBeenCalledTimes(1);
  });
});

describe("disabled-session probe: exempt paths", () => {
  test.each([
    "/auth/login",
    "/auth/register",
    "/auth/reset-password",
    "/customer-display",
    "/customer-display-board"
  ])("403 on %s never probes", async (path) => {
    const calls = useAdapter({ appStatus: 403, probe: 403 });
    visit(path);

    await expect(axiosInstance.get(path)).rejects.toMatchObject({
      response: { status: 403 }
    });
    await flush();

    expect(calls).not.toContain("/auth/context");
    expect(navigate).not.toHaveBeenCalled();
  });
});

describe("disabled-session probe: existing 401 regression", () => {
  test("qualifying 401 still ends session without probing", async () => {
    const calls = useAdapter({ appStatus: 401, probe: 200 });

    await expect(axiosInstance.get("/order/get-orders")).rejects.toMatchObject({
      response: { status: 401 }
    });
    await flush();

    expect(navigate).toHaveBeenCalledTimes(1);
    expect(sessionStorage.getItem(session.SESSION_NOTICE_KEY)).toBe("expired");
    expect(calls).not.toContain("/auth/context");
  });
});

describe("disabled-session probe: socket teardown integration", () => {
  test("probe-403 teardown runs registered socket disposal once", async () => {
    useAdapter({ appStatus: 403, probe: 403 });
    const dispose = jest.fn();
    const unregister = session.registerSessionResource(dispose);

    await expect(axiosInstance.get("/order/get-orders")).rejects.toMatchObject({
      response: { status: 403 }
    });
    await flush();

    expect(dispose).toHaveBeenCalledTimes(1);
    unregister();
  });
});
