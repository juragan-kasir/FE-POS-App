import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { QueryClient, QueryClientProvider } from "react-query";
import AddPromoCampaign from "../page/promo/AddPromoCampaign";
import EditPromoCampaign from "../page/promo/EditPromoCampaign";
import { createCampaign, getCampaignById, updateCampaign } from "../services/promo";

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
if (!globalThis.ResizeObserver) globalThis.ResizeObserver = ResizeObserverStub;
if (!Element.prototype.scrollIntoView) Element.prototype.scrollIntoView = () => {};

const mockNavigate = jest.fn();

jest.mock("react-router-dom", () => ({
  useNavigate: () => mockNavigate,
  useSearchParams: () => [new URLSearchParams("id=21"), jest.fn()]
}));
jest.mock("react-i18next", () => ({ useTranslation: () => ({ t: (k) => k }) }));
jest.mock("sonner", () => ({
  toast: { success: jest.fn(), error: jest.fn(), warning: jest.fn() }
}));
jest.mock("react-cookie", () => ({
  useCookies: () => [{ user: { id: 1, roleType: "admin", store: 4 }, activeStore: 4 }]
}));
jest.mock("@/queries/useLocations", () => ({
  useLocations: () => ({ data: undefined, isLoading: false })
}));
jest.mock("@/services/promo", () => ({
  createCampaign: jest.fn(),
  updateCampaign: jest.fn(),
  getCampaignById: jest.fn(),
  getCampaigns: jest.fn(() => Promise.resolve({ data: [] }))
}));
jest.mock("@/services/product", () => ({
  getAllProduct: jest.fn(() => Promise.resolve({ data: [] }))
}));
jest.mock("@/services/category", () => ({
  getAllCategoryActive: jest.fn(() => Promise.resolve({ data: [] }))
}));
jest.mock("@/services/member-tier", () => ({
  getAllMemberTier: jest.fn(() => Promise.resolve({ data: [] }))
}));
jest.mock("@/components/ui/tabs", () => ({
  Tabs: ({ children }) => <div>{children}</div>,
  TabsList: ({ children }) => <div>{children}</div>,
  TabsTrigger: ({ children }) => <div>{children}</div>,
  TabsContent: ({ children }) => <div>{children}</div>
}));
jest.mock("@/components/ui/date-picker", () => ({
  DatePicker: function DatePickerStub({ id, date, setDate }) {
    const pad = (n) => String(n).padStart(2, "0");
    return (
      <input
        data-testid={`date-${id}`}
        value={
          date instanceof Date
            ? `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
            : ""
        }
        onChange={(e) =>
          setDate(e.target.value ? new Date(`${e.target.value}T00:00:00`) : undefined)
        }
      />
    );
  }
}));
jest.mock(
  "@/components/organism/MissingFieldsModal",
  () =>
    function MissingFieldsModalStub({ open, fields }) {
      return open ? <div data-testid="missing-fields">{fields.join(",")}</div> : null;
    }
);
jest.mock(
  "@/components/organism/UserGuide",
  () =>
    function UserGuideStub() {
      return <div />;
    }
);

const renderPage = (Page) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } }
  });
  render(
    <QueryClientProvider client={queryClient}>
      <Page />
    </QueryClientProvider>
  );
};

const byIdSuffix = (suffix) => document.querySelector(`[id$="promo-campaign-${suffix}"]`);
const type = (element, value) => fireEvent.change(element, { target: { value } });
const confirmSave = async () => {
  fireEvent.click(screen.getByText("button.save"));
  fireEvent.click((await screen.findAllByText(/^common\.(save|yesSave)$/))[0]);
};

const localIso = (y, m, d, h = 0, min = 0) => new Date(y, m - 1, d, h, min).toISOString();

beforeEach(() => {
  jest.clearAllMocks();
  createCampaign.mockResolvedValue({ data: { id: 22 } });
  updateCampaign.mockResolvedValue({ data: { id: 21 } });
});

describe("AddPromoCampaign — characterization", () => {
  const fillRequired = () => {
    type(byIdSuffix("name"), "Diskon Sore");
    type(screen.getByTestId("date-add-promo-campaign-start-date"), "2026-11-01");
    type(screen.getByTestId("date-add-promo-campaign-end-date"), "2026-11-30");
  };

  test("is sent with exactly these fields", async () => {
    renderPage(AddPromoCampaign);
    fillRequired();
    type(document.getElementById("promo-discount-value"), "15");
    fireEvent.click(screen.getByText("page.promo.form.addRule"));
    await confirmSave();
    await waitFor(() => expect(createCampaign).toHaveBeenCalledTimes(1));
    expect(createCampaign.mock.calls[0][0]).toEqual({
      name: "Diskon Sore",
      description: "",
      code: "",
      type: "happy_hour",
      discountType: "percentage",
      discountValue: 15,
      maxDiscount: null,
      minPurchase: 0,
      startDate: localIso(2026, 11, 1),
      endDate: localIso(2026, 11, 30, 23, 59),
      startTime: "",
      endTime: "",
      applicableTo: "all",
      maxUsageTotal: null,
      maxUsagePerMember: null,
      priority: 0,
      isCombinable: false,
      autoActivate: false,
      store: 4,
      applicableIds: null,
      daysOfWeek: [],
      rules: [{ ruleType: "time", condition: {}, priority: 0 }],
      rewards: [],
      status: "active"
    });
  });

  test("picked active days are sent sorted", async () => {
    renderPage(AddPromoCampaign);
    fillRequired();
    fireEvent.click(screen.getByText("Sab"));
    fireEvent.click(screen.getByText("Sen"));
    await confirmSave();
    await waitFor(() => expect(createCampaign).toHaveBeenCalledTimes(1));
    expect(createCampaign.mock.calls[0][0].daysOfWeek).toEqual([1, 6]);
  });

  test("without dates the missing fields are listed and nothing is sent", async () => {
    renderPage(AddPromoCampaign);
    type(byIdSuffix("name"), "Diskon Sore");
    fireEvent.click(screen.getByText("button.save"));
    expect(await screen.findByTestId("missing-fields")).toHaveTextContent(
      "Tanggal Mulai,Tanggal Akhir"
    );
    expect(createCampaign).not.toHaveBeenCalled();
  });
});

const loadedCampaign = {
  id: 21,
  name: "Beli 2 Gratis 1",
  description: "Promo akhir bulan",
  code: "B2G1",
  type: "buy_x_get_y",
  discountType: "free_item",
  discountValue: 0,
  maxDiscount: null,
  minPurchase: 50000,
  startDate: "2026-11-01T02:00:00.000Z",
  endDate: "2026-11-30T16:59:00.000Z",
  startTime: null,
  endTime: null,
  applicableTo: "specific_products",
  applicableIds: [5, 6],
  daysOfWeek: [5, 6],
  maxUsageTotal: 100,
  maxUsagePerMember: 2,
  priority: 3,
  isCombinable: false,
  autoActivate: true,
  store: 4,
  rules: [
    {
      id: 31,
      ruleType: "buy_x_get_y",
      condition: { productIdX: 5, qtyX: 2, productIdY: 6, qtyY: 1 },
      priority: 0
    }
  ],
  rewards: [{ id: 41, rewardType: "free_item", rewardValue: 0, productId: 6, quantity: 1 }]
};

describe("EditPromoCampaign — characterization", () => {
  beforeEach(() => {
    getCampaignById.mockResolvedValue(loadedCampaign);
  });

  test("an unchanged campaign is sent back as loaded", async () => {
    renderPage(EditPromoCampaign);
    await screen.findByDisplayValue("Promo akhir bulan");
    await confirmSave();
    await waitFor(() => expect(updateCampaign).toHaveBeenCalledTimes(1));
    expect(updateCampaign.mock.calls[0][0]).toBe("21");
    expect(updateCampaign.mock.calls[0][1]).toEqual({
      name: "Beli 2 Gratis 1",
      description: "Promo akhir bulan",
      code: "B2G1",
      type: "buy_x_get_y",
      discountType: "free_item",
      discountValue: 0,
      maxDiscount: null,
      minPurchase: 50000,
      startDate: "2026-11-01T02:00:00.000Z",
      endDate: "2026-11-30T16:59:00.000Z",
      startTime: "",
      endTime: "",
      applicableTo: "specific_products",
      maxUsageTotal: 100,
      maxUsagePerMember: 2,
      priority: 3,
      isCombinable: false,
      autoActivate: true,
      store: 4,
      applicableIds: [5, 6],
      daysOfWeek: [5, 6],
      rules: loadedCampaign.rules,
      rewards: loadedCampaign.rewards,
      status: "active"
    });
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith("/promo-list"));
  });

  test("active days the server left empty stay null", async () => {
    getCampaignById.mockResolvedValue({ ...loadedCampaign, daysOfWeek: null });
    renderPage(EditPromoCampaign);
    await screen.findByDisplayValue("Promo akhir bulan");
    await confirmSave();
    await waitFor(() => expect(updateCampaign).toHaveBeenCalledTimes(1));
    expect(updateCampaign.mock.calls[0][1].daysOfWeek).toBeNull();
  });

  test("saving as draft sends status draft", async () => {
    renderPage(EditPromoCampaign);
    await screen.findByDisplayValue("Promo akhir bulan");
    fireEvent.click(screen.getByText("page.discount.add.saveAsDraft"));
    fireEvent.click(await screen.findByText("common.yes"));
    await waitFor(() => expect(updateCampaign).toHaveBeenCalledTimes(1));
    expect(updateCampaign.mock.calls[0][1].status).toBe("draft");
  });
});
