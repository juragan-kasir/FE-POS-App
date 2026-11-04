import React from "react";
import { render, act, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "react-query";
import { useLocations } from "../queries/useLocations";
import { qk } from "../queries/keys";
import { getAllLocation } from "@/services/location";

// The store list (GET /location/get-location-mine) was fetched by ~104
// useQuery calls under ~60 different keys ("allLocations",
// "locations-role", "cashier-locations" …), so the same data was requested
// and cached many times. useLocations is now the single entry point.

jest.mock("@/services/location", () => ({
  getAllLocation: jest.fn((status) =>
    Promise.resolve({ data: status === "all" ? [{ id: 1 }, { id: 2 }] : [{ id: 1 }] })
  )
}));

// Same defaults as src/index.jsx.
const appClient = () =>
  new QueryClient({
    defaultOptions: { queries: { staleTime: 30000, retry: false, refetchOnMount: "always" } }
  });

const Use = ({ status, onData }) => {
  const { data } = useLocations(status);
  if (data && onData) onData(data);
  return null;
};

const settle = () => act(() => new Promise((r) => setTimeout(r, 20)));

beforeEach(() => getAllLocation.mockClear());

describe("useLocations request budget", () => {
  test("Header + layout + page asking for active stores = one request", async () => {
    render(
      <QueryClientProvider client={appClient()}>
        <Use />
        <Use status="active" />
        <Use />
      </QueryClientProvider>
    );
    await settle();
    expect(getAllLocation).toHaveBeenCalledTimes(1);
    expect(getAllLocation).toHaveBeenCalledWith(undefined);
  });

  test("navigating to another page within 5 min reuses the cache", async () => {
    const client = appClient();
    const { rerender } = render(
      <QueryClientProvider client={client}>
        <Use />
      </QueryClientProvider>
    );
    await settle();
    rerender(
      <QueryClientProvider client={client}>
        <Use key="next-page" />
      </QueryClientProvider>
    );
    await settle();
    expect(getAllLocation).toHaveBeenCalledTimes(1);
  });

  test('"all" (archived included) is its own cache entry and never leaks into "active"', async () => {
    const seen = { active: null, all: null };
    render(
      <QueryClientProvider client={appClient()}>
        <Use onData={(d) => (seen.active = d)} />
        <Use status="all" onData={(d) => (seen.all = d)} />
      </QueryClientProvider>
    );
    await settle();
    expect(getAllLocation).toHaveBeenCalledTimes(2);
    expect(getAllLocation).toHaveBeenCalledWith("all");
    expect(seen.active.data).toHaveLength(1);
    expect(seen.all.data).toHaveLength(2);
  });

  test("a location mutation's invalidation refreshes every variant", async () => {
    const client = appClient();
    render(
      <QueryClientProvider client={client}>
        <Use />
        <Use status="all" />
      </QueryClientProvider>
    );
    await settle();
    getAllLocation.mockClear();

    await act(() => client.invalidateQueries(qk.locations.all()));
    await waitFor(() => expect(getAllLocation).toHaveBeenCalledTimes(2));
  });
});

describe("qk.locations", () => {
  test("default and explicit active share a key; all is distinct", () => {
    expect(qk.locations.list()).toEqual(qk.locations.list("active"));
    expect(qk.locations.list("all")).not.toEqual(qk.locations.list());
    expect(qk.locations.list("all").slice(0, 1)).toEqual(qk.locations.all());
  });
});
