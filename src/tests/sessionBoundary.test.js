/* eslint-disable no-undef */
// Session boundary (services/session.js): one deterministic, idempotent,
// fail-safe end of the authenticated session. Each test loads a fresh module
// registry because the "ending" flag deliberately lives for the whole page.

const mockLogOut = jest.fn();
jest.mock("@/services/auth", () => ({
  logOut: (...args) => mockLogOut(...args)
}));

const COOKIE_EXPIRED = "=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/";

const setCookie = (name, value) => {
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/`;
};
const clearAllCookies = () => {
  document.cookie.split(";").forEach((c) => {
    const name = c.split("=")[0].trim();
    if (name) document.cookie = `${name}${COOKIE_EXPIRED}`;
  });
};
const cookieNames = () =>
  document.cookie
    .split(";")
    .map((c) => c.split("=")[0].trim())
    .filter(Boolean);

let session;
let stores;
let navigate;

const load = () => {
  jest.resetModules();
  session = require("@/services/session");
  stores = {
    orderList: require("@/state/order-list").orderList,
    checkout: require("@/state/checkout").checkout,
    invoice: require("@/state/invoice").invoice,
    categorySelect: require("@/state/category").categorySelect
  };
  navigate = jest.spyOn(session.sessionNavigation, "replace").mockImplementation(() => {});
};

const seedSession = () => {
  setCookie("token", "token-A");
  setCookie("user", JSON.stringify({ id: 1, store: 1 }));
  setCookie("activeStore", "1");
  setCookie("activeStoreName", "Store A");
  sessionStorage.setItem("user", JSON.stringify({ id: 1 }));
  localStorage.setItem("globalStoreFilter", "1");
  localStorage.setItem("customer-display-cart", JSON.stringify({ items: [{ id: 9 }] }));
  localStorage.setItem("customer-display-event", JSON.stringify({ eventId: "e1" }));

  stores.orderList.getState().addingProduct({ id: 9, nameProduct: "Kopi", count: 1 });
  stores.checkout.getState().updateCheckout({ id: 7, invoice: "INV-A", cashierName: "Ani" });
  stores.invoice.getState().updateInvoice({ memberName: "Budi", memberPhoneNumber: "0812" });
  stores.categorySelect.getState().updateCategory(5);
};

const seedPreferences = () => {
  sessionStorage.setItem("translation", JSON.stringify({ state: { translation: "en" } }));
  localStorage.setItem("app-theme", JSON.stringify({ state: { theme: "dark" } }));
  localStorage.setItem("super-admin-tour", JSON.stringify({ state: { isCompleted: true } }));
  localStorage.setItem("tips-dismissed-cashier", "true");
  localStorage.setItem("floating-tour-dismissed", "1");
  localStorage.setItem("pos-onboarding-done", "true");
  localStorage.setItem("pos-welcome-seen", "1");
};

beforeEach(() => {
  clearAllCookies();
  sessionStorage.clear();
  localStorage.clear();
  mockLogOut.mockReset();
  mockLogOut.mockResolvedValue({});
  load();
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe("endSession — explicit logout", () => {
  test("revokes the server session once, with a logout-only timeout, then navigates once to /", async () => {
    await session.endSession({ reason: "logout", revoke: true });

    expect(mockLogOut).toHaveBeenCalledTimes(1);
    expect(mockLogOut).toHaveBeenCalledWith(undefined, {
      timeout: session.LOGOUT_TIMEOUT_MS,
      sessionRevocation: true
    });
    expect(session.LOGOUT_TIMEOUT_MS).toBe(5000);
    expect(navigate).toHaveBeenCalledTimes(1);
    expect(navigate).toHaveBeenCalledWith("/login");
    expect(sessionStorage.getItem(session.SESSION_NOTICE_KEY)).toBe("logout");
  });

  test("revocation happens before any credential is cleared (the request still needs the token)", async () => {
    setCookie("token", "token-A");
    let tokenDuringRevoke;
    mockLogOut.mockImplementation(async () => {
      tokenDuringRevoke = cookieNames().includes("token");
    });

    await session.endSession({ reason: "logout", revoke: true });

    expect(tokenDuringRevoke).toBe(true);
    expect(cookieNames()).not.toContain("token");
  });

  test.each([
    ["401", Object.assign(new Error("Unauthorized"), { response: { status: 401 } })],
    ["403", Object.assign(new Error("Forbidden"), { response: { status: 403 } })],
    ["network error", new Error("Network Error")],
    ["timeout", Object.assign(new Error("timeout of 5000ms exceeded"), { code: "ECONNABORTED" })]
  ])("a failed revocation (%s) never keeps the local session alive", async (_label, error) => {
    seedSession();
    mockLogOut.mockRejectedValue(error);

    await expect(session.endSession({ reason: "logout", revoke: true })).resolves.toBeUndefined();

    expect(cookieNames()).not.toContain("token");
    expect(sessionStorage.getItem("user")).toBeNull();
    expect(navigate).toHaveBeenCalledTimes(1);
  });
});

describe("endSession — expired session", () => {
  test("skips the backend revocation and leaves an 'expired' notice", async () => {
    await session.endSession({ reason: "expired" });

    expect(mockLogOut).not.toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledTimes(1);
    expect(navigate).toHaveBeenCalledWith("/login");
    expect(sessionStorage.getItem(session.SESSION_NOTICE_KEY)).toBe("expired");
  });

  test("tears down synchronously when there is nothing to revoke", () => {
    session.endSession({ reason: "expired" });
    expect(navigate).toHaveBeenCalledTimes(1);
  });
});

describe("endSession — idempotency", () => {
  test("the first call owns the boundary; concurrent and later calls are no-ops", async () => {
    let releaseRevoke;
    mockLogOut.mockImplementation(
      () =>
        new Promise((resolve) => {
          releaseRevoke = resolve;
        })
    );

    const first = session.endSession({ reason: "logout", revoke: true });
    expect(session.isSessionEnding()).toBe(true);
    await session.endSession({ reason: "expired" });
    await session.endSession({ reason: "logout", revoke: true });
    expect(navigate).not.toHaveBeenCalled();

    releaseRevoke();
    await first;
    await session.endSession({ reason: "expired" });

    expect(mockLogOut).toHaveBeenCalledTimes(1);
    expect(navigate).toHaveBeenCalledTimes(1);
    expect(sessionStorage.getItem(session.SESSION_NOTICE_KEY)).toBe("logout");
  });
});

describe("endSession — storage policy", () => {
  test("removes every session-bound key and keeps every device preference", async () => {
    seedSession();
    seedPreferences();
    setCookie("unrelated", "keep-me");

    await session.endSession({ reason: "logout", revoke: true });

    for (const name of ["token", "user", "activeStore", "activeStoreName"]) {
      expect(cookieNames()).not.toContain(name);
    }
    expect(cookieNames()).toContain("unrelated");

    for (const key of ["user"]) expect(sessionStorage.getItem(key)).toBeNull();
    for (const key of ["globalStoreFilter", "customer-display-cart", "customer-display-event"]) {
      expect(localStorage.getItem(key)).toBeNull();
    }
    // Zustand re-persists the reset state on reset; the keys are then
    // removed outright.
    for (const key of ["order-list", "checkout", "invoice", "category"]) {
      expect(sessionStorage.getItem(key)).toBeNull();
    }

    expect(sessionStorage.getItem("translation")).not.toBeNull();
    for (const key of [
      "app-theme",
      "super-admin-tour",
      "tips-dismissed-cashier",
      "floating-tour-dismissed",
      "pos-onboarding-done",
      "pos-welcome-seen"
    ]) {
      expect(localStorage.getItem(key)).not.toBeNull();
    }
  });

  test("never wipes whole storage areas", async () => {
    const localClear = jest.spyOn(Storage.prototype, "clear");
    await session.endSession({ reason: "logout", revoke: true });
    expect(localClear).not.toHaveBeenCalled();
  });

  test("resets the transactional stores to their empty state", async () => {
    seedSession();
    expect(stores.orderList.getState().order).toHaveLength(1);

    await session.endSession({ reason: "logout", revoke: true });

    expect(stores.orderList.getState().order).toEqual([]);
    expect(stores.checkout.getState().data.open).toBe(false);
    expect(stores.checkout.getState().data.invoice).toBe("");
    expect(stores.invoice.getState().data.memberName).toBe("");
    expect(stores.invoice.getState().data.memberPhoneNumber).toBe("");
    expect(stores.categorySelect.getState().category).toBe(0);
  });
});

describe("endSession — fail-safe teardown", () => {
  test("disposes registered session resources and forgets unregistered ones", async () => {
    const kept = jest.fn();
    const dropped = jest.fn();
    session.registerSessionResource(kept);
    const unregister = session.registerSessionResource(dropped);
    unregister();

    await session.endSession({ reason: "expired" });

    expect(kept).toHaveBeenCalledTimes(1);
    expect(dropped).not.toHaveBeenCalled();
  });

  test("one failing step never stops the rest of the cleanup", async () => {
    seedSession();
    session.registerSessionResource(() => {
      throw new Error("socket already gone");
    });
    const removeItem = Storage.prototype.removeItem;
    jest.spyOn(Storage.prototype, "removeItem").mockImplementation(function (key) {
      if (key === "user") throw new Error("storage blocked");
      return removeItem.call(this, key);
    });

    await session.endSession({ reason: "logout", revoke: true });

    expect(cookieNames()).not.toContain("token");
    expect(localStorage.getItem("globalStoreFilter")).toBeNull();
    expect(sessionStorage.getItem("order-list")).toBeNull();
    expect(stores.orderList.getState().order).toEqual([]);
    expect(navigate).toHaveBeenCalledTimes(1);
  });

  test("still navigates when every cleanup step throws", async () => {
    session.registerSessionResource(() => {
      throw new Error("dispose");
    });
    for (const store of Object.values(stores)) {
      jest.spyOn(store, "getState").mockImplementation(() => {
        throw new Error("store");
      });
    }
    jest.spyOn(Storage.prototype, "removeItem").mockImplementation(() => {
      throw new Error("removeItem");
    });
    jest.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("setItem");
    });
    Object.defineProperty(document, "cookie", {
      configurable: true,
      get: () => "",
      set: () => {
        throw new Error("cookie");
      }
    });

    try {
      await expect(session.endSession({ reason: "logout", revoke: true })).resolves.toBeUndefined();
    } finally {
      delete document.cookie;
    }

    expect(navigate).toHaveBeenCalledTimes(1);
    expect(navigate).toHaveBeenCalledWith("/login");
  });

  test("a throwing navigation does not escape endSession", async () => {
    navigate.mockImplementation(() => {
      throw new Error("navigation blocked");
    });
    await expect(session.endSession({ reason: "expired" })).resolves.toBeUndefined();
  });
});

describe("session notice + exempt paths", () => {
  test("consumeSessionNotice returns the reason once and deletes it", () => {
    sessionStorage.setItem(session.SESSION_NOTICE_KEY, "expired");
    expect(session.consumeSessionNotice()).toBe("expired");
    expect(sessionStorage.getItem(session.SESSION_NOTICE_KEY)).toBeNull();
    expect(session.consumeSessionNotice()).toBeNull();
  });

  test.each([
    ["/", true],
    ["/register", true],
    ["/reset-password", true],
    ["/customer-display", true],
    ["/customer-display/", true],
    ["/customer-display-board", true],
    ["/home", false],
    ["/dashboard", false],
    ["/customer-display-boards", false],
    ["/customer-order", false]
  ])("isSessionExemptPath(%s) === %s", (path, expected) => {
    expect(session.isSessionExemptPath(path)).toBe(expected);
  });
});
