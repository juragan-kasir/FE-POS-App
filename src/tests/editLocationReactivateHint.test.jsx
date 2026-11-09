import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { QueryClient, QueryClientProvider } from "react-query";
import EditLocation from "../page/location/EditLocation";
import { getLocationById } from "@/services/location";
import { isReactivatableStatus } from "@/lib/store-lifecycle";

jest.mock("react-router-dom", () => ({
  useNavigate: () => jest.fn(),
  useSearchParams: () => [new URLSearchParams("id=loc1"), jest.fn()]
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
  getLocationById: jest.fn(),
  editLocation: jest.fn(() => Promise.resolve({ data: {} }))
}));

jest.mock("@/services/employee", () => ({
  getAllEmployee: jest.fn(() => Promise.resolve({ data: [] }))
}));

jest.mock("@/services/geocoding", () => ({
  reverseGeocode: jest.fn(),
  forwardGeocode: jest.fn()
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

jest.mock("@/services/general", () => ({
  getProvinces: jest.fn(() => Promise.resolve([])),
  getCities: jest.fn(() => Promise.resolve([])),
  getDistricts: jest.fn(() => Promise.resolve([])),
  getVillages: jest.fn(() => Promise.resolve([])),
  getPostalCode: jest.fn(() => Promise.resolve([]))
}));

// 2026-11-10: the BE refuses inactive/closed/archived → active from the edit
// form (STORE_ACTIVATION_NOT_PERMITTED). The switch must not offer it; the
// hint points to "Aktifkan Kembali" on the location list instead.
const renderPage = () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={queryClient}>
      <EditLocation />
    </QueryClientProvider>
  );
};

const openSettingsTab = async () => {
  fireEvent.mouseDown(await screen.findByText("page.location.form.tabPengaturan"));
  return screen.findByRole("switch");
};

beforeAll(() => {
  // The status control is a Radix Switch, which measures itself.
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
});

describe("isReactivatableStatus", () => {
  test.each([
    ["archived", true],
    ["inactive", true],
    ["closed", true],
    ["active", false],
    ["draft", false],
    ["retired", false],
    ["quarantined", false],
    [undefined, false]
  ])("%s → %s", (status, expected) => {
    expect(isReactivatableStatus(status)).toBe(expected);
  });
});

describe("EditLocation — status switch for a store out of service", () => {
  test.each(["inactive", "closed", "archived"])(
    "a %s store cannot be switched on here and shows the reactivate hint",
    async (status) => {
      getLocationById
        .mockReset()
        .mockResolvedValue({ data: { id: "loc1", name: "Store 1", status } });
      renderPage();
      const toggle = await openSettingsTab();
      await waitFor(() => expect(toggle).toBeDisabled());
      expect(toggle).toHaveAttribute("aria-checked", "false");
      expect(screen.getByText("page.location.form.reactivateHint")).toBeInTheDocument();
    }
  );

  test("an active store keeps the switch usable and shows no hint", async () => {
    getLocationById
      .mockReset()
      .mockResolvedValue({ data: { id: "loc1", name: "Store 1", status: "active" } });
    renderPage();
    const toggle = await openSettingsTab();
    await waitFor(() => expect(toggle).toHaveAttribute("aria-checked", "true"));
    expect(toggle).not.toBeDisabled();
    expect(screen.queryByText("page.location.form.reactivateHint")).not.toBeInTheDocument();
  });
});
