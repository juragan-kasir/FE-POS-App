import React from "react";
import { render, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { QueryClient, QueryClientProvider } from "react-query";
import { MemoryRouter } from "react-router-dom";
import * as ReactQuery from "react-query";
import WaiterRequestList from "../page/waiterRequest/WaiterRequestList";
import { useSocket } from "@/services/socket";
import { getWaiterRequestList } from "@/services/waiterRequest";

jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (k) => k })
}));
jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }));
jest.mock("react-cookie", () => ({
  useCookies: () => [{ user: { roleType: "kasir", store: 7 }, activeStore: 7 }]
}));
jest.mock("@/hooks/useGlobalStoreFilter", () => ({
  useGlobalStoreFilter: () => ["all", jest.fn()]
}));
jest.mock("@/services/location", () => ({
  getAllLocation: jest.fn(() => Promise.resolve({ data: [] }))
}));
jest.mock("@/services/waiterRequest", () => ({
  getWaiterRequestList: jest.fn(() =>
    Promise.resolve({ data: [], pagination: { total: 0, totalPages: 1 } })
  ),
  updateWaiterRequestStatus: jest.fn()
}));
jest.mock("@/services/socket", () => ({ useSocket: jest.fn() }));

// Stub every child UI component — this test only cares about the query
// config (refetchInterval), not the rendered table/toolbar/modal markup.
jest.mock(
  "@/components/ui/DataTable",
  () =>
    function DataTableStub() {
      return <div />;
    }
);
jest.mock(
  "@/components/ui/StatCard",
  () =>
    function StatCardStub() {
      return <div />;
    }
);
jest.mock(
  "@/components/ui/PageHeader",
  () =>
    function PageHeaderStub() {
      return <div />;
    }
);
jest.mock(
  "@/components/ui/TableToolbar",
  () =>
    function TableToolbarStub() {
      return <div />;
    }
);
jest.mock(
  "@/components/ui/StoreFilter",
  () =>
    function StoreFilterStub() {
      return <div />;
    }
);
jest.mock("@/components/ui/combobox", () => ({
  Combobox: function ComboboxStub() {
    return <div />;
  }
}));
jest.mock(
  "@/components/organism/modal",
  () =>
    function ModalStub() {
      return null;
    }
);
jest.mock(
  "@/components/organism/abort-controller",
  () =>
    function AbortControllerStub({ children }) {
      return <>{children}</>;
    }
);

// Regression coverage for a bug where, on a deployment where sockets are
// disabled entirely (useSocket returns socket: null), this screen had zero
// refresh mechanism at all — refetchOnWindowFocus/refetchOnReconnect are
// off globally and no refetchInterval compensated, so new/changed waiter
// requests never appeared without a manual page reload.
//
// P6-02 hardening: the fallback is now keyed to *connection* state, not just
// socket existence. A socket.io client is created synchronously whether or not
// it ever connects (and stays non-null across disconnect windows), so branching
// on `socket !== null` silently disabled polling while no events could arrive.
// These assertions pin the connected-model semantics; reverting `pollFallback`
// to `socket ? false : 15000` (or dropping `connected` anywhere) fails here.
describe("WaiterRequestList — polling fallback keyed to socket connection state", () => {
  // F2: simulate the backend join protocol — every join-store emit carries
  // an ack callback the server answers. Auto-ack `{ ok: true }` by default
  // (accepted join); pass another value (or null to never ack) for the
  // rejected/pending paths.
  const autoAckEmit = (ackResult = { ok: true }) =>
    jest.fn((event, ...args) => {
      const ack = args.find((a) => typeof a === "function");
      if (typeof ack === "function" && String(event).startsWith("join-") && ackResult !== null) {
        ack(ackResult);
      }
    });
  const makeSocketStub = (ackResult) => ({
    on: jest.fn(),
    off: jest.fn(),
    emit: autoAckEmit(ackResult)
  });
  const socketStub = makeSocketStub();

  const renderWithClient = () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } }
    });
    const utils = render(
      <MemoryRouter>
        <QueryClientProvider client={queryClient}>
          <WaiterRequestList />
        </QueryClientProvider>
      </MemoryRouter>
    );
    return { queryClient, ...utils };
  };

  const getMainListQuery = (queryClient) =>
    queryClient
      .getQueryCache()
      .findAll()
      .find((q) => q.queryKey[0] === "waiter-request-list");

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("polls (15000) when no socket exists at all", async () => {
    useSocket.mockReturnValue({ socket: null, connected: false });
    const { queryClient } = renderWithClient();

    await waitFor(() => expect(getWaiterRequestList).toHaveBeenCalled());
    expect(getMainListQuery(queryClient).options.refetchInterval).toBe(15000);
  });

  test("polls (15000) while a socket client exists but is not connected", async () => {
    useSocket.mockReturnValue({ socket: socketStub, connected: false });
    const { queryClient } = renderWithClient();

    await waitFor(() => expect(getWaiterRequestList).toHaveBeenCalled());
    expect(getMainListQuery(queryClient).options.refetchInterval).toBe(15000);
  });

  test("disables polling once the socket is connected and the room join is accepted", async () => {
    // F2: polling-off is a post-ack state, so assert the render args via
    // the useQuery spy — the query-cache options snapshot the first render.
    const useQuerySpy = jest.spyOn(ReactQuery, "useQuery");
    const lastListOptions = () => {
      const calls = useQuerySpy.mock.calls.filter(
        (call) => call?.[0]?.[0] === "waiter-request-list"
      );
      return calls[calls.length - 1][2];
    };

    useSocket.mockReturnValue({ socket: socketStub, connected: true });
    renderWithClient();

    await waitFor(() => expect(getWaiterRequestList).toHaveBeenCalled());
    await waitFor(() => expect(lastListOptions().refetchInterval).toBe(false));
    expect(socketStub.emit).toHaveBeenCalledWith("join-store", 7, expect.any(Function));
    useQuerySpy.mockRestore();
  });

  test("turns polling back on after a disconnect and off again after reconnect", async () => {
    const useQuerySpy = jest.spyOn(ReactQuery, "useQuery");
    const lastListOptions = () => {
      const calls = useQuerySpy.mock.calls.filter(
        (call) => call?.[0]?.[0] === "waiter-request-list"
      );
      return calls[calls.length - 1][2];
    };

    useSocket.mockReturnValue({ socket: socketStub, connected: false });
    const { queryClient, rerender } = renderWithClient();

    await waitFor(() => expect(getWaiterRequestList).toHaveBeenCalled());
    expect(getMainListQuery(queryClient).options.refetchInterval).toBe(15000);

    useSocket.mockReturnValue({ socket: socketStub, connected: true });
    rerender(
      <MemoryRouter>
        <QueryClientProvider client={queryClient}>
          <WaiterRequestList />
        </QueryClientProvider>
      </MemoryRouter>
    );
    await waitFor(() => expect(lastListOptions().refetchInterval).toBe(false));

    useSocket.mockReturnValue({ socket: socketStub, connected: false });
    rerender(
      <MemoryRouter>
        <QueryClientProvider client={queryClient}>
          <WaiterRequestList />
        </QueryClientProvider>
      </MemoryRouter>
    );
    await waitFor(() => expect(lastListOptions().refetchInterval).toBe(15000));
  });

  test("F2: keeps polling (15000) when the room join is rejected via ack", async () => {
    useSocket.mockReturnValue({ socket: makeSocketStub({ ok: false }), connected: true });
    const { queryClient } = renderWithClient();

    await waitFor(() => expect(getWaiterRequestList).toHaveBeenCalled());
    expect(getMainListQuery(queryClient).options.refetchInterval).toBe(15000);
  });

  test("F2: keeps polling (15000) while the join ack is still pending", async () => {
    useSocket.mockReturnValue({ socket: makeSocketStub(null), connected: true });
    const { queryClient } = renderWithClient();

    await waitFor(() => expect(getWaiterRequestList).toHaveBeenCalled());
    expect(getMainListQuery(queryClient).options.refetchInterval).toBe(15000);
  });
});
