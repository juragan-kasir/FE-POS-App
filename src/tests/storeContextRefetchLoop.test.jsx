import React, { useEffect } from "react";
import { render, waitFor, act } from "@testing-library/react";
import "@testing-library/jest-dom";
import { CookiesProvider } from "react-cookie";
import { QueryClient, QueryClientProvider, useQuery } from "react-query";
import { StoreProvider, useStore } from "../contexts/StoreContext";
import { getAllLocation, getPublicLocations } from "../services/location";
import { axiosInstance } from "../services";

// StoreContext.jsx relies on Vite's automatic JSX runtime (no React import);
// this Jest transform compiles JSX to React.createElement.
globalThis.React = React;

// Observed 2026-10-19 on /dashboard-admin: an `admin` account with no store
// looped GET /auth/context + GET /location/get-location-mine forever.
// DashboardLayout auto-picks the first location; for a non-super_admin
// setActiveStore forces user.store ("" here), so the store never changed,
// yet each call rewrote the `user` cookie (new object -> new setActiveStore
// identity -> the auto-pick effect fired again) and ran
// queryClient.invalidateQueries(). Real react-cookie is used on purpose: a
// mocked no-op setCookie hides the loop.

jest.mock("../services", () => ({
  axiosInstance: { get: jest.fn() }
}));

const setCookies = (cookies) => {
  document.cookie.split(";").forEach((c) => {
    const name = c.split("=")[0].trim();
    if (name) document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
  });
  Object.entries(cookies).forEach(([k, v]) => {
    const value = typeof v === "string" ? v : JSON.stringify(v);
    document.cookie = `${k}=${encodeURIComponent(value)}; path=/`;
  });
};

// Same auto-pick effect as DashboardLayout.jsx (non-super_admin branch),
// plus a circuit breaker: the unfixed loop is a synchronous render/effect
// cycle that would hang Jest, so stop after MAX_PICKS and let the assertion
// fail instead.
const MAX_PICKS = 20;
const AutoPick = ({ fetchLocations, onPick }) => {
  const { activeStoreId, setActiveStore } = useStore();
  const picks = React.useRef(0);
  const { data } = useQuery(["allLocations"], fetchLocations, { enabled: !activeStoreId });
  const locations = data?.data || [];
  useEffect(() => {
    if (!locations.length || activeStoreId || picks.current >= MAX_PICKS) return;
    picks.current += 1;
    onPick();
    setActiveStore(locations[0].id, locations[0].name);
  }, [locations, activeStoreId, setActiveStore]);
  return null;
};

const renderWithStore = (ui, client = new QueryClient()) =>
  render(
    <CookiesProvider defaultSetOptions={{ path: "/" }}>
      <QueryClientProvider client={client}>
        <StoreProvider>{ui}</StoreProvider>
      </QueryClientProvider>
    </CookiesProvider>
  );

describe("StoreContext refetch loop (admin without store)", () => {
  test("auto-pick settles instead of refetching forever", async () => {
    setCookies({ user: { roleType: "admin", store: "", storeName: "" } });
    const fetchLocations = jest.fn(() => Promise.resolve({ data: [{ id: 3, name: "Toko A" }] }));
    const onPick = jest.fn();

    renderWithStore(<AutoPick fetchLocations={fetchLocations} onPick={onPick} />);

    await waitFor(() => expect(fetchLocations).toHaveBeenCalled());
    await act(() => new Promise((r) => setTimeout(r, 300)));

    // The first pick writes the (empty) store once; the next one is a no-op
    // and stops the cycle. Unfixed, it re-picks until the breaker trips.
    expect(onPick.mock.calls.length).toBeLessThanOrEqual(2);
    expect(fetchLocations.mock.calls.length).toBeLessThanOrEqual(2);
  });

  test("auto-pick never labels an unassigned admin with another store's name", async () => {
    setCookies({ user: { roleType: "admin", store: "", storeName: "" } });
    const fetchLocations = jest.fn(() => Promise.resolve({ data: [{ id: 3, name: "Toko A" }] }));
    let store;
    const Grab = () => {
      store = useStore();
      return null;
    };

    renderWithStore(
      <>
        <AutoPick fetchLocations={fetchLocations} onPick={jest.fn()} />
        <Grab />
      </>
    );
    await waitFor(() => expect(fetchLocations).toHaveBeenCalled());
    await act(() => new Promise((r) => setTimeout(r, 100)));

    // The BE treats this account as storeless (403 Store assignment
    // required); the header pill must not claim "Toko A".
    expect(store.activeStoreName).toBe("");
    expect(document.cookie).not.toContain(encodeURIComponent("Toko A"));
  });

  test("setting the store that is already active does not invalidate queries", () => {
    setCookies({
      user: { roleType: "super_admin" },
      activeStore: "3",
      activeStoreName: "Toko A"
    });
    const client = new QueryClient();
    const invalidate = jest.spyOn(client, "invalidateQueries");
    let store;
    const Grab = () => {
      store = useStore();
      return null;
    };
    renderWithStore(<Grab />, client);

    act(() => store.setActiveStore(3, "Toko A"));
    expect(invalidate).not.toHaveBeenCalled();

    act(() => store.setActiveStore(4, "Toko B"));
    expect(invalidate).toHaveBeenCalledTimes(1);
  });
});

describe("getAllLocation status param", () => {
  beforeEach(() => axiosInstance.get.mockResolvedValue({ data: { data: [] }, status: 200 }));

  test("used directly as a queryFn it sends no [object Object] status", async () => {
    await getAllLocation({ queryKey: ["allLocations"], signal: undefined });
    expect(axiosInstance.get).toHaveBeenLastCalledWith("/location/get-location-mine");
  });

  test("an explicit status string is still sent", async () => {
    await getAllLocation("all");
    expect(axiosInstance.get).toHaveBeenLastCalledWith("/location/get-location-mine?status=all");
  });

  // PGA-09: signed-in pickers must never read the platform-wide public list;
  // only the sign-up form (no session yet) does.
  test("only the sign-up list reads the public endpoint", async () => {
    await getPublicLocations();
    expect(axiosInstance.get).toHaveBeenLastCalledWith("/location/get-location-public");
  });
});
