import React from "react";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import "@testing-library/jest-dom";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "react-query";

// FE W3 Phase 2 — Store Configuration detail/edit page.

// jsdom gaps for the Radix Select / Popover and cmdk controls.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
if (!globalThis.ResizeObserver) globalThis.ResizeObserver = ResizeObserverStub;
if (!Element.prototype.hasPointerCapture) {
  Element.prototype.hasPointerCapture = () => false;
}
if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {};
}

let mockRouteId = "loc-001";
const mockNavigate = jest.fn();
jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useParams: () => ({ id: mockRouteId }),
  useNavigate: () => mockNavigate
}));
jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (k) => k, i18n: { language: "id", changeLanguage: jest.fn() } })
}));
const mockToastSuccess = jest.fn();
const mockToastError = jest.fn();
jest.mock("sonner", () => ({
  toast: {
    success: (...args) => mockToastSuccess(...args),
    error: (...args) => mockToastError(...args)
  }
}));

const mockGetStoreConfigurationById = jest.fn();
const mockEditStoreConfiguration = jest.fn();
jest.mock("@/services/location", () => ({
  getStoreConfigurationById: (...args) => mockGetStoreConfigurationById(...args),
  editStoreConfiguration: (...args) => mockEditStoreConfiguration(...args)
}));

let mockPermission;
jest.mock("@/hooks/useStoreManagePermission", () => ({
  useStoreManagePermission: () => mockPermission
}));

jest.mock("@/services/session", () => ({
  endSession: jest.fn(),
  SESSION_END_REASON: { LOGOUT: "logout", EXPIRED: "expired" }
}));
jest.mock("react-cookie", () => ({
  useCookies: () => [{ user: { id: 1, roleType: "admin" } }, jest.fn(), jest.fn()]
}));
jest.mock("@/hooks/useUserSession", () => ({
  useUserSession: () => ({ id: 1, roleType: "admin" })
}));
jest.mock("@/contexts/StoreContext", () => ({
  useStore: () => ({ activeStoreId: null, activeStoreName: "", setActiveStore: jest.fn() })
}));

import StoreConfigurationDetail, {
  TOUR_BUTTON_CLEARANCE
} from "@/page/store-configuration/StoreConfigurationDetail";

const STORE = {
  id: "loc-001",
  storeId: "ST-001",
  name: "Store One",
  status: "active",
  description: "Flagship store",
  timezone: "Asia/Jakarta",
  maxActiveParkedCarts: 10,
  parkedCartTtlMinutes: 60,
  dailyTarget: 1500000,
  category: "Branch",
  mainBranch: false
};

const body = (data) => ({ success: true, message: "Success", data });
const httpError = (status, data = {}) =>
  Object.assign(new Error(`HTTP ${status}`), { response: { status, data } });

let client;
const renderPage = () => {
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <StoreConfigurationDetail />
      </MemoryRouter>
    </QueryClientProvider>
  );
};

const saveButton = () => screen.getByRole("button", { name: "common.save" });
const descriptionInput = () => screen.getByLabelText("page.storeConfiguration.field.description");

const loaded = async () => {
  await screen.findByText("ST-001");
  return descriptionInput();
};

const editAndConfirm = async (value = "Renovated store") => {
  fireEvent.change(await loaded(), { target: { value } });
  await waitFor(() => expect(saveButton()).toBeEnabled());
  fireEvent.click(saveButton());
  fireEvent.click(await screen.findByText("common.yesSave"));
};

beforeEach(() => {
  mockRouteId = "loc-001";
  mockPermission = { canManageStores: true, isLoading: false, isError: false, refetch: jest.fn() };
  mockNavigate.mockReset();
  mockToastSuccess.mockReset();
  mockToastError.mockReset();
  mockGetStoreConfigurationById.mockReset();
  mockEditStoreConfiguration.mockReset();
  mockGetStoreConfigurationById.mockResolvedValue(body(STORE));
});

describe("permission gate", () => {
  test("auth context loading shows the skeleton and fetches nothing", () => {
    mockPermission = { ...mockPermission, isLoading: true, canManageStores: false };
    const { container } = renderPage();
    expect(container.querySelector('[aria-busy="true"]')).toBeInTheDocument();
    expect(mockGetStoreConfigurationById).not.toHaveBeenCalled();
  });

  test("without store.manage renders Access Denied and fetches nothing", () => {
    mockPermission = { ...mockPermission, canManageStores: false };
    renderPage();
    expect(screen.getByText("error.forbiddenTitle")).toBeInTheDocument();
    expect(mockGetStoreConfigurationById).not.toHaveBeenCalled();
  });
});

describe("detail load", () => {
  test("loading shows the skeleton", () => {
    mockGetStoreConfigurationById.mockReturnValue(new Promise(() => {}));
    const { container } = renderPage();
    expect(container.querySelector('[aria-busy="true"]')).toBeInTheDocument();
  });

  test("hydrates the form from the configuration and starts clean", async () => {
    renderPage();
    const description = await loaded();
    expect(mockGetStoreConfigurationById).toHaveBeenCalledWith("loc-001");
    expect(description).toHaveValue("Flagship store");
    expect(screen.getByLabelText("page.storeConfiguration.field.maxActiveParkedCarts")).toHaveValue(
      10
    );
    expect(screen.getByLabelText("page.storeConfiguration.field.parkedCartTtlMinutes")).toHaveValue(
      60
    );
    expect(screen.getByLabelText("page.storeConfiguration.field.dailyTarget")).toHaveValue(
      (1500000).toLocaleString("id-ID")
    );
    expect(screen.getByText("ST-001")).toBeInTheDocument();
    expect(saveButton()).toBeDisabled();
  });

  test("403 renders Access Denied", async () => {
    mockGetStoreConfigurationById.mockRejectedValue(httpError(403, { code: "FORBIDDEN" }));
    renderPage();
    expect(await screen.findByText("error.forbiddenTitle")).toBeInTheDocument();
  });

  test("404 renders the not-found state", async () => {
    mockGetStoreConfigurationById.mockRejectedValue(httpError(404));
    renderPage();
    expect(await screen.findByText("page.storeConfiguration.notFound.title")).toBeInTheDocument();
  });

  test("an id rejected by the W3 wrapper before HTTP renders the not-found state", async () => {
    mockRouteId = "loc-000";
    mockGetStoreConfigurationById.mockRejectedValue(new Error("Invalid store configuration id"));
    renderPage();
    expect(await screen.findByText("page.storeConfiguration.notFound.title")).toBeInTheDocument();
    fireEvent.click(screen.getByText("page.storeConfiguration.action.backToList"));
    expect(mockNavigate).toHaveBeenCalledWith("/store-configuration");
  });

  test("other load failures are retryable", async () => {
    mockGetStoreConfigurationById.mockRejectedValueOnce(httpError(500));
    renderPage();
    fireEvent.click(await screen.findByText("common.retry"));
    expect(await screen.findByText("ST-001")).toBeInTheDocument();
  });
});

describe("dirty state", () => {
  test("editing enables Save; reverting disables it again", async () => {
    renderPage();
    const description = await loaded();
    fireEvent.change(description, { target: { value: "Changed" } });
    await waitFor(() => expect(saveButton()).toBeEnabled());
    fireEvent.change(description, { target: { value: "Flagship store" } });
    await waitFor(() => expect(saveButton()).toBeDisabled());
  });
});

describe("terminal stores", () => {
  test.each(["closed", "retired", "quarantined"])("%s is read-only", async (status) => {
    mockGetStoreConfigurationById.mockResolvedValue(body({ ...STORE, status }));
    renderPage();
    const description = await loaded();
    expect(screen.getByText("page.storeConfiguration.terminal.title")).toBeInTheDocument();
    expect(description).toBeDisabled();
    expect(
      screen.getByLabelText("page.storeConfiguration.field.maxActiveParkedCarts")
    ).toBeDisabled();
    expect(saveButton()).toBeDisabled();
  });

  test("422 STORE_STATUS_IRREVERSIBLE switches the page to read-only", async () => {
    mockEditStoreConfiguration.mockRejectedValue(
      httpError(422, {
        code: "STORE_STATUS_IRREVERSIBLE",
        message: "closed stores cannot be reconfigured"
      })
    );
    renderPage();
    await editAndConfirm();
    expect(await screen.findByText("page.storeConfiguration.terminal.title")).toBeInTheDocument();
    expect(descriptionInput()).toBeDisabled();
    expect(saveButton()).toBeDisabled();
  });
});

describe("save", () => {
  test("confirmation precedes a dirty-only PUT", async () => {
    mockEditStoreConfiguration.mockResolvedValue(body({ id: "loc-001" }));
    renderPage();
    fireEvent.change(await loaded(), { target: { value: "Renovated store" } });
    await waitFor(() => expect(saveButton()).toBeEnabled());
    fireEvent.click(saveButton());
    expect(await screen.findByText("common.confirmSave")).toBeInTheDocument();
    expect(mockEditStoreConfiguration).not.toHaveBeenCalled();
    fireEvent.click(screen.getByText("common.yesSave"));
    await waitFor(() => expect(mockEditStoreConfiguration).toHaveBeenCalledTimes(1));
    expect(mockEditStoreConfiguration).toHaveBeenCalledWith({
      id: "loc-001",
      description: "Renovated store"
    });
  });

  test("success: toast, required invalidations and a detail refetch", async () => {
    mockEditStoreConfiguration.mockResolvedValue(body({ id: "loc-001" }));
    renderPage();
    await loaded();
    const invalidate = jest.spyOn(client, "invalidateQueries");
    mockGetStoreConfigurationById.mockResolvedValue(
      body({ ...STORE, description: "Renovated store" })
    );
    await editAndConfirm();

    await waitFor(() =>
      expect(mockToastSuccess).toHaveBeenCalledWith("page.storeConfiguration.toast.saved")
    );
    const keys = invalidate.mock.calls.map(([key]) => key);
    expect(keys).toEqual(
      expect.arrayContaining([
        ["store-configuration", "1"],
        ["store-configurations"],
        ["locations"],
        ["location-options"]
      ])
    );
    await waitFor(() => expect(mockGetStoreConfigurationById).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(saveButton()).toBeDisabled());
    expect(descriptionInput()).toHaveValue("Renovated store");
  });

  test("saving shows progress and blocks duplicate submission", async () => {
    mockEditStoreConfiguration.mockReturnValue(new Promise(() => {}));
    renderPage();
    await editAndConfirm();
    const saving = await screen.findByRole("button", { name: "common.saving" });
    expect(saving).toBeDisabled();
    fireEvent.click(saving);
    fireEvent.submit(saving.closest("form"));
    expect(mockEditStoreConfiguration).toHaveBeenCalledTimes(1);
  });

  test("400 maps field errors and focuses the error summary", async () => {
    mockEditStoreConfiguration.mockRejectedValue(
      httpError(400, {
        success: false,
        message: "description: too long",
        errors: [{ field: "description", message: "too long" }]
      })
    );
    renderPage();
    await editAndConfirm();
    const summary = await screen.findByRole("alert");
    expect(
      within(summary).getByText("page.storeConfiguration.field.description: too long")
    ).toBeInTheDocument();
    await waitFor(() => expect(summary).toHaveFocus());
    expect(screen.getAllByText("too long").length).toBeGreaterThan(0);
  });

  test("400 without field errors still lists a general message", async () => {
    mockEditStoreConfiguration.mockRejectedValue(
      httpError(400, { success: false, message: "Unrecognized key(s) in object" })
    );
    renderPage();
    await editAndConfirm();
    const summary = await screen.findByRole("alert");
    expect(within(summary).getByText("Unrecognized key(s) in object")).toBeInTheDocument();
  });

  test("403 on save renders Access Denied", async () => {
    mockEditStoreConfiguration.mockRejectedValue(httpError(403, { code: "FORBIDDEN" }));
    renderPage();
    await editAndConfirm();
    expect(await screen.findByText("error.forbiddenTitle")).toBeInTheDocument();
  });

  test("other failures keep the edits and show an error toast", async () => {
    mockEditStoreConfiguration.mockRejectedValue(httpError(500, { message: "boom" }));
    renderPage();
    await editAndConfirm("Kept edit");
    await waitFor(() => expect(mockToastError).toHaveBeenCalledWith("boom"));
    expect(descriptionInput()).toHaveValue("Kept edit");
    expect(saveButton()).toBeEnabled();
  });
});

describe("back / cancel", () => {
  test("clean form leaves immediately", async () => {
    renderPage();
    await loaded();
    fireEvent.click(screen.getByRole("button", { name: "common.cancel" }));
    expect(mockNavigate).toHaveBeenCalledWith("/store-configuration");
  });

  test("dirty form asks first; staying keeps the page", async () => {
    renderPage();
    fireEvent.change(await loaded(), { target: { value: "Unsaved" } });
    fireEvent.click(screen.getByRole("button", { name: "common.cancel" }));
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText("modal.cancelTitle")).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole("button", { name: "common.cancel" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(mockNavigate).not.toHaveBeenCalled();
    expect(descriptionInput()).toHaveValue("Unsaved");
  });

  test("dirty form leaves after confirmation", async () => {
    renderPage();
    fireEvent.change(await loaded(), { target: { value: "Unsaved" } });
    fireEvent.click(screen.getByRole("button", { name: "common.cancel" }));
    fireEvent.click(await screen.findByText("modal.yesCancel"));
    expect(mockNavigate).toHaveBeenCalledWith("/store-configuration");
  });
});

// ---- Audit F-1: floating tour button clearance -------------------------------

describe("action bar clearance (floating tour button)", () => {
  test("Save and Cancel live in one sticky bar that reserves the tour-button corner", async () => {
    renderPage();
    await loaded();
    const cancel = screen.getByRole("button", { name: "common.cancel" });
    let bar = saveButton().parentElement;
    while (bar && !bar.contains(cancel)) bar = bar.parentElement;
    // Walk up to the sticky container that holds both actions.
    while (bar && !bar.className.split(" ").includes("sticky")) bar = bar.parentElement;

    expect(bar).not.toBeNull();
    expect(bar).toContainElement(saveButton());
    expect(bar).toContainElement(cancel);
    const classes = bar.className.split(" ");
    // Bottom clearance below `sm` (stacked buttons rise above the button),
    // right clearance from `sm` (right-aligned buttons stop left of it).
    for (const token of TOUR_BUTTON_CLEARANCE.split(" ")) expect(classes).toContain(token);
    expect(TOUR_BUTTON_CLEARANCE).toMatch(/(^| )pb-\[/);
    expect(TOUR_BUTTON_CLEARANCE).toMatch(/(^| )sm:pr-/);
  });
});

// ---- Audit F-2: page-level validation and legacy category -------------------

const fieldInput = (key) => screen.getByLabelText(`page.storeConfiguration.field.${key}`);

const changeField = async (key, value) => {
  fireEvent.change(fieldInput(key), { target: { value } });
  await waitFor(() => expect(saveButton()).toBeEnabled());
};

// Valid input: the confirmation opens and the PUT carries the value.
const saveAndGetPayload = async () => {
  fireEvent.click(saveButton());
  fireEvent.click(await screen.findByText("common.yesSave"));
  await waitFor(() => expect(mockEditStoreConfiguration).toHaveBeenCalledTimes(1));
  return mockEditStoreConfiguration.mock.calls[0][0];
};

// Invalid input: the field message appears and nothing is confirmed or sent.
const expectRejected = async (messageKey) => {
  fireEvent.click(saveButton());
  expect(await screen.findByText(messageKey)).toBeInTheDocument();
  expect(screen.queryByText("common.confirmSave")).not.toBeInTheDocument();
  expect(mockEditStoreConfiguration).not.toHaveBeenCalled();
};

const openSelect = (trigger) => {
  fireEvent.pointerDown(trigger);
  fireEvent.click(trigger);
};

describe("validation — maxActiveParkedCarts (integer >= 1, no cap at 20)", () => {
  beforeEach(() => mockEditStoreConfiguration.mockResolvedValue(body({ id: "loc-001" })));

  test.each([
    ["1", 1],
    ["20", 20],
    ["21", 21],
    ["", null]
  ])("accepts %p", async (input, sent) => {
    renderPage();
    await loaded();
    await changeField("maxActiveParkedCarts", input);
    expect(await saveAndGetPayload()).toEqual({ id: "loc-001", maxActiveParkedCarts: sent });
  });

  test.each(["0", "-1", "1.5"])("rejects %p", async (input) => {
    renderPage();
    await loaded();
    await changeField("maxActiveParkedCarts", input);
    await expectRejected("page.storeConfiguration.validation.maxActiveParkedCarts");
  });
});

describe("validation — parkedCartTtlMinutes (integer 1–1440)", () => {
  beforeEach(() => mockEditStoreConfiguration.mockResolvedValue(body({ id: "loc-001" })));

  test.each([
    ["1", 1],
    ["1440", 1440],
    ["", null]
  ])("accepts %p", async (input, sent) => {
    renderPage();
    await loaded();
    await changeField("parkedCartTtlMinutes", input);
    expect(await saveAndGetPayload()).toEqual({ id: "loc-001", parkedCartTtlMinutes: sent });
  });

  test.each(["0", "1441", "-1", "1.5"])("rejects %p", async (input) => {
    renderPage();
    await loaded();
    await changeField("parkedCartTtlMinutes", input);
    await expectRejected("page.storeConfiguration.validation.parkedCartTtlMinutes");
  });
});

describe("validation — dailyTarget (integer 0–2147483647 via CurrencyInput)", () => {
  beforeEach(() => mockEditStoreConfiguration.mockResolvedValue(body({ id: "loc-001" })));

  test.each([
    ["0", 0],
    ["1", 1],
    ["2147483647", 2147483647]
  ])("accepts %p", async (input, sent) => {
    renderPage();
    await loaded();
    await changeField("dailyTarget", input);
    expect(await saveAndGetPayload()).toEqual({ id: "loc-001", dailyTarget: sent });
  });

  test("rejects a value above INT4", async () => {
    renderPage();
    await loaded();
    await changeField("dailyTarget", "2147483648");
    await expectRejected("page.storeConfiguration.validation.dailyTarget");
  });

  test("a negative value cannot be entered (the sign is stripped by CurrencyInput)", async () => {
    renderPage();
    await loaded();
    await changeField("dailyTarget", "-1");
    expect(await saveAndGetPayload()).toEqual({ id: "loc-001", dailyTarget: 1 });
  });
});

describe("validation — timezone", () => {
  beforeEach(() => mockEditStoreConfiguration.mockResolvedValue(body({ id: "loc-001" })));

  test("a valid timezone can be selected and is sent", async () => {
    renderPage();
    await loaded();
    const trigger = fieldInput("timezone");
    expect(trigger).toHaveTextContent("Asia/Jakarta");
    fireEvent.click(trigger);
    fireEvent.click(await screen.findByRole("option", { name: "Asia/Makassar" }));
    await waitFor(() => expect(trigger).toHaveTextContent("Asia/Makassar"));
    await waitFor(() => expect(saveButton()).toBeEnabled());
    expect(await saveAndGetPayload()).toEqual({ id: "loc-001", timezone: "Asia/Makassar" });
  });

  test("an invalid stored timezone is not offered and blocks saving", async () => {
    mockGetStoreConfigurationById.mockResolvedValue(body({ ...STORE, timezone: "Mars/Phobos" }));
    renderPage();
    await loaded();
    const trigger = fieldInput("timezone");
    expect(trigger).not.toHaveTextContent("Mars/Phobos");
    expect(trigger).toHaveTextContent("page.storeConfiguration.field.timezonePlaceholder");
    await changeField("description", "Other change");
    await expectRejected("page.storeConfiguration.validation.timezone");
  });
});

describe("legacy category preservation", () => {
  const LEGACY = "Legacy Category";

  beforeEach(() => {
    mockGetStoreConfigurationById.mockResolvedValue(body({ ...STORE, category: LEGACY }));
    mockEditStoreConfiguration.mockResolvedValue(body({ id: "loc-001" }));
  });

  test("the stored legacy value is displayed and offered alongside the standard ones", async () => {
    renderPage();
    await loaded();
    const trigger = fieldInput("category");
    expect(trigger).toHaveTextContent(LEGACY);
    expect(trigger).not.toHaveTextContent("page.location.category.mainBranch");
    // Hydration alone never marks the legacy value as a change.
    expect(saveButton()).toBeDisabled();
    openSelect(trigger);
    expect(await screen.findByRole("option", { name: LEGACY })).toBeInTheDocument();
    for (const key of ["mainBranch", "branch", "warehouse", "office"]) {
      expect(
        screen.getByRole("option", { name: `page.location.category.${key}` })
      ).toBeInTheDocument();
    }
  });

  test("saving another field sends neither category nor mainBranch", async () => {
    renderPage();
    await loaded();
    await changeField("description", "Only the description");
    const payload = await saveAndGetPayload();
    expect(payload).toEqual({ id: "loc-001", description: "Only the description" });
    expect(payload).not.toHaveProperty("category");
    expect(payload).not.toHaveProperty("mainBranch");
    expect(fieldInput("category")).toHaveTextContent(LEGACY);
  });

  test.each([
    ["mainBranch", "Main Branch", true],
    ["warehouse", "Warehouse", false]
  ])("selecting %s sends category with the derived mainBranch", async (key, value, main) => {
    renderPage();
    await loaded();
    openSelect(fieldInput("category"));
    fireEvent.click(await screen.findByRole("option", { name: `page.location.category.${key}` }));
    await waitFor(() => expect(saveButton()).toBeEnabled());
    expect(await saveAndGetPayload()).toEqual({
      id: "loc-001",
      category: value,
      mainBranch: main
    });
  });
});
