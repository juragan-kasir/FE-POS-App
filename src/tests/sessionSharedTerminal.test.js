/* eslint-disable no-undef */
// Shared POS terminal, end to end:
//
//   cashier A works (store, cart, checkout, invoice, category, customer
//   display, socket) → logs out → cashier B logs in → the app boots fresh.
//
// The page reload is modelled with a fresh module registry: everything that
// lives in memory (React Query, StoreProvider, SocketProvider, zustand stores,
// the session flag) starts over, while cookies and web storage persist
// exactly as they would across a real reload. Cashier B must inherit nothing
// from cashier A.

const mockLogOut = jest.fn(() => Promise.resolve({}));
jest.mock("@/services/auth", () => ({ logOut: (...args) => mockLogOut(...args) }));
jest.mock("@/utils/endpoints", () => ({ ENDPOINT: { BASE_URL: "https://api.example.com" } }));
jest.mock("socket.io-client", () => ({
  __esModule: true,
  io: jest.fn(() => ({
    id: "socket",
    on: jest.fn(),
    off: jest.fn(),
    emit: jest.fn(),
    removeAllListeners: jest.fn(),
    disconnect: jest.fn()
  }))
}));

const setCookie = (name, value) => {
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/`;
};
const readCookie = (name) => {
  const hit = document.cookie.split("; ").find((c) => c.startsWith(`${name}=`));
  return hit ? decodeURIComponent(hit.slice(name.length + 1)) : null;
};

test("cashier B inherits none of cashier A's user, store or transaction state", async () => {
  // ---- page load 1: cashier A -------------------------------------------
  jest.resetModules();
  const sessionA = require("@/services/session");
  const navigate = jest.spyOn(sessionA.sessionNavigation, "replace").mockImplementation(() => {});

  setCookie("token", "token-A");
  setCookie("user", JSON.stringify({ id: 1, roleType: "admin", store: 1, storeName: "Store A" }));
  setCookie("activeStore", "1");
  setCookie("activeStoreName", "Store A");
  sessionStorage.setItem("user", JSON.stringify({ id: 1, accessMenu: ["cashier"] }));
  localStorage.setItem("globalStoreFilter", "1");
  localStorage.setItem(
    "customer-display-cart",
    JSON.stringify({ items: [{ nameProduct: "Kopi A" }], total: 20000 })
  );
  localStorage.setItem("customer-display-event", JSON.stringify({ eventId: "qris-A" }));
  localStorage.setItem("app-theme", JSON.stringify({ state: { theme: "dark" }, version: 0 }));

  require("@/state/order-list")
    .orderList.getState()
    .addingProduct({ id: 9, nameProduct: "Kopi A" });
  require("@/state/checkout")
    .checkout.getState()
    .updateCheckout({ id: 7, invoice: "INV-A", cashierName: "A" });
  require("@/state/invoice")
    .invoice.getState()
    .updateInvoice({ memberName: "Member A", memberPhoneNumber: "0811" });
  require("@/state/category").categorySelect.getState().updateCategory(5);
  expect(JSON.parse(sessionStorage.getItem("order-list")).state.order).toHaveLength(1);

  const socketA = { disconnect: jest.fn() };
  sessionA.registerSessionResource(() => socketA.disconnect());

  await sessionA.endSession({ reason: "logout", revoke: true });

  expect(mockLogOut).toHaveBeenCalledTimes(1);
  expect(socketA.disconnect).toHaveBeenCalledTimes(1);
  expect(navigate).toHaveBeenCalledTimes(1);
  expect(navigate).toHaveBeenCalledWith("/login");

  // ---- login as cashier B (store 2) ---------------------------------------
  setCookie("token", "token-B");
  setCookie("user", JSON.stringify({ id: 2, roleType: "admin", store: 2, storeName: "Store B" }));
  sessionStorage.setItem("user", JSON.stringify({ id: 2, accessMenu: ["cashier"] }));

  // ---- page load 2: fresh boot --------------------------------------------
  jest.resetModules();
  const React = require("react");
  const h = React.createElement;
  // StoreContext.jsx relies on Vite's automatic JSX runtime; Jest compiles
  // with the classic one, which needs `React` in scope.
  globalThis.React = React;
  const { render, screen, waitFor, cleanup } = require("@testing-library/react/pure");
  const { CookiesProvider } = require("react-cookie");
  const { QueryClient, QueryClientProvider } = require("react-query");
  const { StoreProvider, useStore } = require("@/contexts/StoreContext");
  const { SocketProvider } = require("@/services/socket");
  const { io } = require("socket.io-client");
  const sessionB = require("@/services/session");

  expect(sessionB.isSessionEnding()).toBe(false);

  const queryClient = new QueryClient();
  const StoreProbe = () => {
    const { activeStoreId, activeStoreName } = useStore();
    return h("div", { "data-testid": "store" }, `${activeStoreId}|${activeStoreName}`);
  };

  render(
    h(
      CookiesProvider,
      null,
      h(
        QueryClientProvider,
        { client: queryClient },
        h(StoreProvider, null, h(SocketProvider, null, h(StoreProbe)))
      )
    )
  );

  try {
    // store context comes from B's cookies only
    expect(screen.getByTestId("store").textContent).toBe("2|Store B");
    expect(readCookie("activeStore")).toBe("2");
    expect(localStorage.getItem("globalStoreFilter")).toBeNull();

    // the socket is B's, opened with B's token
    await waitFor(() => expect(io).toHaveBeenCalledTimes(1));
    expect(io.mock.calls[0][1].auth).toEqual({ token: "token-B" });

    // no transaction state from A survives the reload
    expect(require("@/state/order-list").orderList.getState().order).toEqual([]);
    expect(require("@/state/checkout").checkout.getState().data).toMatchObject({
      open: false,
      invoice: ""
    });
    expect(require("@/state/invoice").invoice.getState().data).toMatchObject({
      memberName: "",
      memberPhoneNumber: ""
    });
    expect(require("@/state/category").categorySelect.getState().category).toBe(0);
    expect(localStorage.getItem("customer-display-cart")).toBeNull();
    expect(localStorage.getItem("customer-display-event")).toBeNull();

    // the query cache starts empty and nothing of A's identity is left
    expect(queryClient.getQueryCache().getAll()).toHaveLength(0);
    expect(readCookie("token")).toBe("token-B");
    expect(JSON.parse(readCookie("user"))).toMatchObject({ id: 2, store: 2 });

    // device preferences survive
    expect(localStorage.getItem("app-theme")).not.toBeNull();
  } finally {
    cleanup();
    delete globalThis.React;
  }
});
