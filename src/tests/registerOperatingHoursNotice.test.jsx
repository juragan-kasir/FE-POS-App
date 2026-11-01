import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { QueryClient, QueryClientProvider } from "react-query";
import { MemoryRouter } from "react-router-dom";
import CashRegisterOpenClose from "../page/cash-register/CashRegisterOpenClose";
import CashRegisterCurrent from "../page/cash-register/CashRegisterCurrent";
import {
  openCashRegister,
  getOpenRegisters,
  getCurrentCashRegister
} from "@/services/cash-register";
import { getAllLocation, getLocationDetail } from "@/services/location";
import { toast } from "sonner";
import { getTodayScheduleMinutes } from "@/utils/storeTimezone";

// Phase 39 Batch 6F: informational-only early-opening / overtime-closing
// banners on the register Open and Close screens. Both must compare the
// STORE's local time (never the browser/test-runner's), never block the
// action, and never interfere with the pre-existing "store already has an
// open register" guard on the Open screen.
//
// Phase 39 Batch 6E supersedes 6F's original "stay silent on a closed day"
// decision: a day whose openingHours entry exists with open/close both
// null (i.e. getTodayScheduleMinutes returns a non-null object with both
// minutes null) now surfaces its own informational "closed today" notice
// on both screens — still purely informational, never blocking. This is
// distinct from a genuinely UNREADABLE schedule (missing openingHours
// array, or no entry at all for today), where getTodayScheduleMinutes
// returns null outright and every screen stays silent exactly as before,
// since there is nothing to positively assert in that case.
//
// getTodayScheduleMinutes is mocked (not global timers — that would fight
// React Query's internal polling, e.g. getWhatsAppStatus's 5s refetch, and
// testing-library's own async waitFor loop) so every test's early/late/
// overtime intent is expressed directly as {nowMinutes, openMinutes,
// closeMinutes}, never as a real-wall-clock-relative offset. An earlier
// version anchored fixtures to the REAL current time (getStoreNowParts(
// STORE_TZ) + a safety-margin offset, folded back into a same-day HH:MM
// string via modulo 1440) — that silently corrupted itself into a
// same-day "just after midnight" time whenever the suite happened to run
// within the offset's margin of actual midnight in America/New_York,
// since a per-day schedule cannot represent "N minutes from now" once
// that instant is genuinely tomorrow. Test 7 below still exercises the
// REAL getStoreNowParts/getTodayScheduleMinutes implementation (via
// jest.requireActual, bypassing this file's mock) with a fixed, explicit
// instant — so the timezone-comparison logic itself stays proven
// correct, just never against an uncontrolled live clock.

jest.mock("@/utils/storeTimezone", () => {
  const actual = jest.requireActual("@/utils/storeTimezone");
  return {
    ...actual,
    getTodayScheduleMinutes: jest.fn()
  };
});

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (k, opts) => (opts?.time != null ? `${k}:${opts.time}` : k)
  })
}));

// A mutable holder so each test can pick cashier vs. super_admin without
// re-mocking the module (jest.mock factories run once per file).
const mockCookieState = {
  value: [{ activeStore: "1", user: { id: 1, roleType: "cashier", store: "1" } }]
};
jest.mock("react-cookie", () => ({
  useCookies: () => mockCookieState.value
}));

jest.mock("sonner", () => ({
  toast: { success: jest.fn(), error: jest.fn(), info: jest.fn() }
}));

jest.mock("@/services/cash-register", () => ({
  openCashRegister: jest.fn(() => Promise.resolve({})),
  getOpenRegisters: jest.fn(),
  getCurrentCashRegister: jest.fn(),
  closeCashRegister: jest.fn(() => Promise.resolve({}))
}));

jest.mock("@/services/location", () => ({
  getAllLocation: jest.fn(),
  getLocationDetail: jest.fn()
}));

jest.mock("@/services/invoice", () => ({}));

const mockNavigate = jest.fn();
jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: () => mockNavigate
}));

const STORE_TZ = "America/New_York";

// getTodayScheduleMinutes is mocked, so the actual `openingHours`/
// `timezone` payload content is never read for its own sake — only that
// it's present, so the components' queries resolve. Any fixed, valid-
// looking array works; NOON is just a safe, readable anchor for the
// numeric {nowMinutes, openMinutes, closeMinutes} results below.
const FIXED_OPENING_HOURS = [{ day: "monday", open: "09:00", close: "21:00", isOpen: true }];
const NOON = 12 * 60;

const enterCountedCash = () =>
  fireEvent.change(document.getElementById("cash-register-current-closing-balance"), {
    target: { value: "0" }
  });

const renderWithQuery = (ui) => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <MemoryRouter>
      <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
    </MemoryRouter>
  );
};

describe("Phase 39 Batch 6F — operating-hours informational banners", () => {
  afterEach(() => {
    jest.clearAllMocks();
    mockCookieState.value = [
      { activeStore: "1", user: { id: 1, roleType: "cashier", store: "1" } }
    ];
  });

  describe("CashRegisterOpenClose — early-opening notice", () => {
    beforeEach(() => {
      getAllLocation.mockResolvedValue({ data: [{ id: 1, name: "Store A" }] });
      getOpenRegisters.mockResolvedValue({ data: [] });
    });

    test("Test 1 — early opening: shows the notice, keeps Open Register enabled", async () => {
      getTodayScheduleMinutes.mockReturnValue({
        nowMinutes: NOON,
        openMinutes: NOON + 30,
        closeMinutes: NOON + 600
      });
      getLocationDetail.mockResolvedValue({
        data: { id: 1, timezone: STORE_TZ, openingHours: FIXED_OPENING_HOURS }
      });
      renderWithQuery(<CashRegisterOpenClose />);
      fireEvent.click(await screen.findByText("Rp 100.000"));

      expect(
        await screen.findByText(/page\.cashRegister\.openClose\.earlyOpeningNotice/)
      ).toBeInTheDocument();
      const openBtn = screen.getByText(/page\.cashRegister\.openClose\.openWithAmount/);
      expect(openBtn.closest("button")).not.toBeDisabled();
    });

    test("Test 2 — opening at/after scheduled time: no notice, Open Register enabled", async () => {
      getTodayScheduleMinutes.mockReturnValue({
        nowMinutes: NOON,
        openMinutes: NOON - 5,
        closeMinutes: NOON + 600
      });
      getLocationDetail.mockResolvedValue({
        data: { id: 1, timezone: STORE_TZ, openingHours: FIXED_OPENING_HOURS }
      });
      renderWithQuery(<CashRegisterOpenClose />);
      fireEvent.click(await screen.findByText("Rp 100.000"));
      await waitFor(() => expect(getLocationDetail).toHaveBeenCalled());

      expect(
        screen.queryByText(/page\.cashRegister\.openClose\.earlyOpeningNotice/)
      ).not.toBeInTheDocument();
      const openBtn = screen.getByText(/page\.cashRegister\.openClose\.openWithAmount/);
      expect(openBtn.closest("button")).not.toBeDisabled();
    });

    test("Test 3 — late opening: no warning, Open Register enabled", async () => {
      getTodayScheduleMinutes.mockReturnValue({
        nowMinutes: NOON,
        openMinutes: NOON - 120,
        closeMinutes: NOON + 600
      });
      getLocationDetail.mockResolvedValue({
        data: { id: 1, timezone: STORE_TZ, openingHours: FIXED_OPENING_HOURS }
      });
      renderWithQuery(<CashRegisterOpenClose />);
      fireEvent.click(await screen.findByText("Rp 100.000"));
      await waitFor(() => expect(getLocationDetail).toHaveBeenCalled());

      expect(
        screen.queryByText(/page\.cashRegister\.openClose\.earlyOpeningNotice/)
      ).not.toBeInTheDocument();
      const openBtn = screen.getByText(/page\.cashRegister\.openClose\.openWithAmount/);
      expect(openBtn.closest("button")).not.toBeDisabled();
    });

    test("Test 4 — closed day (open/close both null): shows closed-today notice, not early-opening, Open Register enabled (Batch 6E)", async () => {
      getTodayScheduleMinutes.mockReturnValue({
        nowMinutes: NOON,
        openMinutes: null,
        closeMinutes: null
      });
      getLocationDetail.mockResolvedValue({
        data: { id: 1, timezone: STORE_TZ, openingHours: FIXED_OPENING_HOURS }
      });
      renderWithQuery(<CashRegisterOpenClose />);
      fireEvent.click(await screen.findByText("Rp 100.000"));

      expect(
        await screen.findByText(/page\.cashRegister\.openClose\.closedTodayNotice/)
      ).toBeInTheDocument();
      expect(
        screen.queryByText(/page\.cashRegister\.openClose\.earlyOpeningNotice/)
      ).not.toBeInTheDocument();
      const openBtn = screen.getByText(/page\.cashRegister\.openClose\.openWithAmount/);
      expect(openBtn.closest("button")).not.toBeDisabled();
    });

    test("Test 4b — no schedule entry for today at all (unreadable, not positively closed): no closed-today notice, no crash (Batch 6E)", async () => {
      // getTodayScheduleMinutes returns null outright when there's no entry
      // for today (as opposed to an entry with open/close both null) — this
      // must stay silent, since there's nothing to positively assert.
      getTodayScheduleMinutes.mockReturnValue(null);
      getLocationDetail.mockResolvedValue({
        data: { id: 1, timezone: STORE_TZ, openingHours: FIXED_OPENING_HOURS }
      });
      renderWithQuery(<CashRegisterOpenClose />);
      fireEvent.click(await screen.findByText("Rp 100.000"));
      await waitFor(() => expect(getLocationDetail).toHaveBeenCalled());

      expect(
        screen.queryByText(/page\.cashRegister\.openClose\.closedTodayNotice/)
      ).not.toBeInTheDocument();
      expect(
        screen.queryByText(/page\.cashRegister\.openClose\.earlyOpeningNotice/)
      ).not.toBeInTheDocument();
      const openBtn = screen.getByText(/page\.cashRegister\.openClose\.openWithAmount/);
      expect(openBtn.closest("button")).not.toBeDisabled();
    });

    test("Test 8 — the existing 'store already open' guard is unaffected by the hours notice", async () => {
      mockCookieState.value = [
        { activeStore: "1", user: { id: 1, roleType: "super_admin", store: "1" } }
      ];
      // Deliberately ALSO early-opening, to prove the two conditions
      // coexist independently rather than one masking the other.
      getTodayScheduleMinutes.mockReturnValue({
        nowMinutes: NOON,
        openMinutes: NOON + 30,
        closeMinutes: NOON + 600
      });
      getLocationDetail.mockResolvedValue({
        data: { id: 1, timezone: STORE_TZ, openingHours: FIXED_OPENING_HOURS }
      });
      getOpenRegisters.mockResolvedValue({ data: [{ store: 1 }] });
      renderWithQuery(<CashRegisterOpenClose />);

      // Existing guard's warning still renders exactly as before.
      expect(
        await screen.findByText("page.cashRegister.openClose.storeOpenWarning")
      ).toBeInTheDocument();
      // The unrelated operating-hours notice renders alongside it.
      expect(
        await screen.findByText(/page\.cashRegister\.openClose\.earlyOpeningNotice/)
      ).toBeInTheDocument();

      fireEvent.click(await screen.findByText("Rp 100.000"));
      fireEvent.click(screen.getByText(/page\.cashRegister\.openClose\.openWithAmount/));

      // The guard still blocks the mutation exactly as before — an
      // operating-hours notice must never suppress or replace it.
      expect(toast.error).toHaveBeenCalledWith(
        "page.cashRegister.openClose.fail",
        expect.objectContaining({ description: "page.cashRegister.openClose.storeOpenError" })
      );
      expect(openCashRegister).not.toHaveBeenCalled();
    });
  });

  describe("CashRegisterCurrent — overtime-closing notice", () => {
    const mockRegister = (openingHours) => {
      getCurrentCashRegister.mockResolvedValue({
        data: {
          register: {
            id: 9001,
            status: "open",
            openedAt: "2026-09-12T10:00:00.000Z",
            openingBalance: 100000,
            notes: null,
            userData: { fullName: "angga" },
            storeData: { name: "Store A", timezone: STORE_TZ, openingHours }
          },
          currentSales: 0,
          totalExpenses: 0,
          expectedCash: 100000
        }
      });
    };

    test("Test 5 — overtime closing: shows the notice, Close Register remains enabled", async () => {
      getTodayScheduleMinutes.mockReturnValue({
        nowMinutes: NOON,
        openMinutes: NOON - 600,
        closeMinutes: NOON - 30
      });
      mockRegister(FIXED_OPENING_HOURS);
      renderWithQuery(<CashRegisterCurrent />);

      expect(
        await screen.findByText(/page\.cashRegister\.current\.overtimeNotice/)
      ).toBeInTheDocument();
      enterCountedCash();
      const closeBtn = screen.getByText("page.cashRegister.current.closeBtn");
      expect(closeBtn.closest("button")).not.toBeDisabled();
    });

    test("Test 6 — closing before/at scheduled time: no overtime notice, Close Register enabled", async () => {
      getTodayScheduleMinutes.mockReturnValue({
        nowMinutes: NOON,
        openMinutes: NOON - 600,
        closeMinutes: NOON + 5
      });
      mockRegister(FIXED_OPENING_HOURS);
      renderWithQuery(<CashRegisterCurrent />);
      await screen.findByText("page.cashRegister.current.closeBtn");

      expect(
        screen.queryByText(/page\.cashRegister\.current\.overtimeNotice/)
      ).not.toBeInTheDocument();
      enterCountedCash();
      const closeBtn = screen.getByText("page.cashRegister.current.closeBtn");
      expect(closeBtn.closest("button")).not.toBeDisabled();
    });

    test("Test 9 — closed day (open/close both null): shows closed-today notice, not overtime, Close Register enabled (Batch 6E)", async () => {
      getTodayScheduleMinutes.mockReturnValue({
        nowMinutes: NOON,
        openMinutes: null,
        closeMinutes: null
      });
      mockRegister(FIXED_OPENING_HOURS);
      renderWithQuery(<CashRegisterCurrent />);

      expect(
        await screen.findByText(/page\.cashRegister\.current\.closedTodayNotice/)
      ).toBeInTheDocument();
      expect(
        screen.queryByText(/page\.cashRegister\.current\.overtimeNotice/)
      ).not.toBeInTheDocument();
      enterCountedCash();
      const closeBtn = screen.getByText("page.cashRegister.current.closeBtn");
      expect(closeBtn.closest("button")).not.toBeDisabled();
    });

    test("Test 10 — no schedule entry for today at all (unreadable): no closed-today notice, no crash (Batch 6E)", async () => {
      getTodayScheduleMinutes.mockReturnValue(null);
      mockRegister(FIXED_OPENING_HOURS);
      renderWithQuery(<CashRegisterCurrent />);
      await screen.findByText("page.cashRegister.current.closeBtn");

      expect(
        screen.queryByText(/page\.cashRegister\.current\.closedTodayNotice/)
      ).not.toBeInTheDocument();
      expect(
        screen.queryByText(/page\.cashRegister\.current\.overtimeNotice/)
      ).not.toBeInTheDocument();
      enterCountedCash();
      const closeBtn = screen.getByText("page.cashRegister.current.closeBtn");
      expect(closeBtn.closest("button")).not.toBeDisabled();
    });
  });

  // Test 7 — direct, deterministic proof that the schedule comparison uses
  // the STORE timezone, never the test runner's local one. Uses a fixed
  // instant and an explicit timezone (never relies on system/local TZ).
  describe("storeTimezone.js — schedule comparison uses the store timezone (Test 7)", () => {
    // Uses jest.requireActual, bypassing this file's getTodayScheduleMinutes
    // mock — this is the one test that must exercise the REAL timezone
    // arithmetic, not a stand-in return value.
    const real = jest.requireActual("@/utils/storeTimezone");

    test("a fixed UTC instant resolves to different day/time depending on the timezone passed in", () => {
      // 2026-09-12T22:30:00.000Z:
      //  - in America/New_York (EDT, UTC-4 in September): 18:30 the same day.
      //  - in Asia/Jakarta (UTC+7, this suite's own system timezone): 05:30
      //    the NEXT calendar day — a different day AND a different
      //    time-of-day, so using the wrong timezone would misclassify
      //    both which schedule entry applies and the early/late result.
      const now = new Date("2026-09-12T22:30:00.000Z");

      const nyParts = real.getStoreNowParts("America/New_York", now);
      const jakartaParts = real.getStoreNowParts("Asia/Jakarta", now);

      expect(nyParts.minutes).toBe(18 * 60 + 30);
      expect(jakartaParts.minutes).toBe(5 * 60 + 30);
      expect(nyParts.dayName).not.toBe(jakartaParts.dayName);

      const openingHours = [{ day: nyParts.dayName, open: "18:00", close: "23:00", isOpen: true }];
      const result = real.getTodayScheduleMinutes(openingHours, "America/New_York", now);
      expect(result).toEqual({
        nowMinutes: 18 * 60 + 30,
        openMinutes: 18 * 60,
        closeMinutes: 23 * 60
      });

      // The same openingHours array, read under Jakarta's day name, finds
      // no matching entry at all (proves it isn't silently falling back to
      // a hardcoded/default timezone that would happen to "work").
      const wrongTzResult = real.getTodayScheduleMinutes(openingHours, "Asia/Jakarta", now);
      expect(wrongTzResult).toBeNull();
    });
  });
});
