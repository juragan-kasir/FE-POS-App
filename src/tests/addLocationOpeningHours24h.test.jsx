import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { QueryClient, QueryClientProvider } from "react-query";
import AddLocation from "../page/location/AddLocation";
import { addLocation, generateLocationId } from "@/services/location";

jest.mock("react-router-dom", () => ({
  useNavigate: () => jest.fn(),
  useSearchParams: () => [new URLSearchParams(""), jest.fn()]
}));
jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (k) => k })
}));
jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }));
// Platform tenant field (TenantSelectField): not exercised here — a non-platform actor.
jest.mock("@/hooks/useTenantManagePermission", () => ({
  useTenantManagePermission: () => ({ canManageTenants: false, isLoading: false, isError: false })
}));
jest.mock("@/services/tenant", () => ({ getTenants: jest.fn() }));

jest.mock("@/services/location", () => ({
  addLocation: jest.fn(() => Promise.resolve({ data: {} })),
  editLocation: jest.fn(),
  generateLocationId: jest.fn(() => Promise.resolve({ data: { storeId: "ST-099" } }))
}));

jest.mock("@/services/employee", () => ({
  getAllEmployee: jest.fn(() => Promise.resolve({ data: [] }))
}));

jest.mock("@/services/geocoding", () => ({
  reverseGeocode: jest.fn(),
  forwardGeocode: jest.fn()
}));

jest.mock("@/services/general", () => ({
  getProvinces: jest.fn(() => Promise.resolve([])),
  getCities: jest.fn(() => Promise.resolve([])),
  getDistricts: jest.fn(() => Promise.resolve([])),
  getVillages: jest.fn(() => Promise.resolve([])),
  getPostalCode: jest.fn(() => Promise.resolve([]))
}));

jest.mock(
  "@/components/ui/location-map-picker",
  () =>
    function LocationMapPickerStub() {
      return <div />;
    }
);
jest.mock(
  "@/components/organism/UserGuide",
  () =>
    function UserGuideStub() {
      return <div />;
    }
);
jest.mock(
  "@/components/organism/MissingFieldsModal",
  () =>
    function MissingFieldsModalStub() {
      return null;
    }
);
jest.mock("@/components/ui/combobox", () => ({
  Combobox: function ComboboxStub({ options, value, onChange, placeholder }) {
    return (
      <select
        data-testid={placeholder}
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}>
        <option value="" />
        {(options || []).map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    );
  }
}));

const renderPage = () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={queryClient}>
      <AddLocation />
    </QueryClientProvider>
  );
};

// Opens the "Lainnya" tab and expands the operational-hours panel — both are
// collapsed by default, matching how a real user reaches the 24-hour toggle.
const openOperationalHoursPanel = async () => {
  fireEvent.mouseDown(await screen.findByText("page.location.form.tabLainnya"));
  fireEvent.click(await screen.findByText("page.location.form.operationalHours"));
  await screen.findByText("common.day.monday");
};

const saveDraft = async () => {
  fireEvent.click(screen.getByText("page.location.form.saveDraft"));
  const confirmBtn = await screen.findByText("page.location.form.draftModalConfirm");
  fireEvent.click(confirmBtn);
};

describe("AddLocation — Phase 39 Batch 6D is24Hours flag", () => {
  beforeEach(() => {
    addLocation.mockClear();
    generateLocationId.mockClear();
  });

  test("toggling 24 Hours for a day sends is24Hours: true with 00:00/23:59 placeholders", async () => {
    renderPage();
    await openOperationalHoursPanel();

    const mondayRow = screen.getByText("common.day.monday").closest("div.grid");
    const toggle24 = mondayRow.querySelector('input[aria-label="page.location.form.is24Hours"]');
    fireEvent.click(toggle24);

    await saveDraft();

    await waitFor(() => expect(addLocation).toHaveBeenCalled());
    const payload = addLocation.mock.calls[0][0];
    const monday = payload.openingHours.find((d) => d.day === "monday");
    expect(monday).toMatchObject({ is24Hours: true, open: "00:00", close: "23:59" });
  });

  test("a day left untouched defaults to is24Hours: false, never inferred", async () => {
    renderPage();
    await openOperationalHoursPanel();

    await saveDraft();

    await waitFor(() => expect(addLocation).toHaveBeenCalled());
    const payload = addLocation.mock.calls[0][0];
    const tuesday = payload.openingHours.find((d) => d.day === "tuesday");
    expect(tuesday.is24Hours).toBe(false);
    expect(tuesday.open).toBe("09:00");
    expect(tuesday.close).toBe("21:00");
  });

  test("closing a day that was set to 24 Hours resets it to { open: null, close: null, is24Hours: false }", async () => {
    renderPage();
    await openOperationalHoursPanel();

    const wednesdayRow = screen.getByText("common.day.wednesday").closest("div.grid");
    const toggle24 = wednesdayRow.querySelector('input[aria-label="page.location.form.is24Hours"]');
    fireEvent.click(toggle24);

    // Now close the day entirely via the isOpen switch (sr-only checkbox).
    const closeSwitch = wednesdayRow.querySelector('input[type="checkbox"]:not([aria-label])');
    fireEvent.click(closeSwitch);

    await saveDraft();

    await waitFor(() => expect(addLocation).toHaveBeenCalled());
    const payload = addLocation.mock.calls[0][0];
    const wednesday = payload.openingHours.find((d) => d.day === "wednesday");
    expect(wednesday).toMatchObject({ open: null, close: null, is24Hours: false });
  });

  test("the 24-hour checkbox is disabled while a day is closed", async () => {
    renderPage();
    await openOperationalHoursPanel();

    const fridayRow = screen.getByText("common.day.friday").closest("div.grid");
    const closeSwitch = fridayRow.querySelector('input[type="checkbox"]:not([aria-label])');
    fireEvent.click(closeSwitch);

    const toggle24 = fridayRow.querySelector('input[aria-label="page.location.form.is24Hours"]');
    expect(toggle24).toBeDisabled();
  });
});

describe("AddLocation — default lifecycle status", () => {
  beforeAll(() => {
    // The status control is a Radix Switch, which measures itself.
    globalThis.ResizeObserver ??= class {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
  });

  test("a new location starts as Active", async () => {
    renderPage();
    fireEvent.mouseDown(await screen.findByText("page.location.form.tabPengaturan"));
    expect(await screen.findByText("page.location.form.activeDesc")).toBeInTheDocument();
    expect(screen.queryByText("page.location.form.inactiveDesc")).not.toBeInTheDocument();
  });
});
