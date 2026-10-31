import React from "react";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import "@testing-library/jest-dom";
import { QueryClient, QueryClientProvider } from "react-query";
import AddSupplier from "../page/supplier/AddSupplier";
import EditSupplier from "../page/supplier/EditSupplier";
import { addSupplier, editSupplier, getSupplierById } from "../services/supplier";

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
if (!globalThis.ResizeObserver) globalThis.ResizeObserver = ResizeObserverStub;
if (!Element.prototype.scrollIntoView) Element.prototype.scrollIntoView = () => {};

let mockRoleType = "admin";

jest.mock("react-router-dom", () => ({
  useNavigate: () => jest.fn(),
  useSearchParams: () => [new URLSearchParams("id=12"), jest.fn()]
}));
jest.mock("react-i18next", () => ({ useTranslation: () => ({ t: (k) => k }) }));
jest.mock("sonner", () => ({
  toast: { success: jest.fn(), error: jest.fn(), warning: jest.fn() }
}));
jest.mock("react-cookie", () => ({
  useCookies: () => [{ user: { id: 1, roleType: mockRoleType, store: 1 } }]
}));
jest.mock("@/queries/useLocations", () => ({
  useLocations: () => ({ data: { data: [{ id: 2, name: "Cabang" }] }, isLoading: false })
}));
jest.mock("@/services/supplier", () => ({
  addSupplier: jest.fn(),
  editSupplier: jest.fn(),
  getSupplierById: jest.fn(),
  getAllSupplierCategories: jest.fn(() => Promise.resolve({ data: [{ id: 3, name: "Sayur" }] })),
  downloadSupplierProductTemplate: jest.fn(),
  importSupplierProducts: jest.fn()
}));
jest.mock("@/components/ui/tabs", () => ({
  Tabs: ({ children }) => <div>{children}</div>,
  TabsList: ({ children }) => <div>{children}</div>,
  TabsTrigger: ({ children }) => <div>{children}</div>,
  TabsContent: ({ children }) => <div>{children}</div>
}));
jest.mock(
  "@/components/organism/StoreSelectCard",
  () =>
    function StoreSelectCardStub({ selectedStores, onChange }) {
      return (
        <button type="button" data-testid="pick-store" onClick={() => onChange([2])}>
          {selectedStores.join(",")}
        </button>
      );
    }
);
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

const lastByText = (text) => screen.getAllByText(text).at(-1);
const byIdSuffix = (suffix) => document.querySelector(`[id$="-supplier-${suffix}"]`);
const type = (element, value) => fireEvent.change(element, { target: { value } });

const formDefaults = {
  contactPerson: "",
  email: "",
  address: "",
  isActive: true,
  paymentType: "cbd",
  tempoDays: 0,
  categoryId: null,
  mobile: "",
  whatsapp: "",
  fax: "",
  website: "",
  taxInclude: true,
  taxType: "",
  taxNumber: "",
  taxName: "",
  nitku: "",
  taxTransactionType: "",
  defaultDiscount: 0,
  defaultDescription: ""
};

const addContact = () => {
  fireEvent.click(screen.getAllByText("page.supplier.contacts.add")[0]);
  type(byIdSuffix("full-name"), "  Budi  ");
  type(byIdSuffix("position"), "Sales");
  fireEvent.click(lastByText("page.supplier.contacts.add"));
};

const addBank = () => {
  fireEvent.click(screen.getAllByText("page.supplier.bankAccounts.add")[0]);
  type(byIdSuffix("bank-name"), "BCA");
  type(byIdSuffix("account-number"), "0012345678");
  type(byIdSuffix("account-name"), "PT Sumber");
  fireEvent.click(lastByText("page.supplier.bankAccounts.add"));
};

const addProduct = () => {
  fireEvent.click(screen.getByText("page.supplier.products.addProduct"));
  type(byIdSuffix("product-name"), "Wortel");
  type(byIdSuffix("price"), "12.500");
  type(byIdSuffix("lead-time"), "2");
  fireEvent.click(lastByText("page.supplier.products.add"));
};

const confirmSave = async () => {
  fireEvent.click(lastByText("common.save"));
  fireEvent.click(await screen.findByText("page.supplier.modal.confirmSaveText"));
};

beforeEach(() => {
  jest.clearAllMocks();
  mockRoleType = "admin";
  addSupplier.mockResolvedValue({ data: { id: 30 } });
  editSupplier.mockResolvedValue({ data: { id: 12 } });
});

describe("AddSupplier — characterization", () => {
  test("is sent with the form values, contacts and bank accounts", async () => {
    renderPage(AddSupplier);
    type(screen.getByPlaceholderText("page.supplier.form.namePlaceholder"), "PT Sumber");
    type(screen.getByPlaceholderText("page.supplier.form.phonePlaceholder"), "0812-3456-789");
    addContact();
    addBank();
    await confirmSave();
    await waitFor(() => expect(addSupplier).toHaveBeenCalledTimes(1));
    expect(addSupplier.mock.calls[0][0]).toEqual({
      ...formDefaults,
      name: "PT Sumber",
      phone: "08123456789",
      status: "active",
      store: [],
      contacts: [{ fullName: "Budi", position: "Sales", email: null, phone: null }],
      bankAccounts: [
        {
          bankName: "BCA",
          accountNumber: "0012345678",
          accountName: "PT Sumber",
          isDefault: false,
          status: "active"
        }
      ],
      products: []
    });
  });

  test("a super admin sends the picked store and the supplied products", async () => {
    mockRoleType = "super_admin";
    renderPage(AddSupplier);
    fireEvent.click(screen.getByTestId("pick-store"));
    type(screen.getByPlaceholderText("page.supplier.form.namePlaceholder"), "PT Sumber");
    type(screen.getByPlaceholderText("page.supplier.form.phonePlaceholder"), "08123456789");
    addProduct();
    await confirmSave();
    await waitFor(() => expect(addSupplier).toHaveBeenCalledTimes(1));
    const payload = addSupplier.mock.calls[0][0];
    expect(payload.store).toEqual([2]);
    expect(payload.products).toEqual([
      {
        name: "Wortel",
        price: 12500,
        unit: "pcs",
        leadTime: 2,
        leadTimeUnit: "hari",
        qualityRating: 0,
        minOrderQty: "1",
        notes: ""
      }
    ]);
  });

  test("without a name the missing field is listed and nothing is sent", async () => {
    renderPage(AddSupplier);
    type(screen.getByPlaceholderText("page.supplier.form.phonePlaceholder"), "08123456789");
    fireEvent.click(lastByText("common.save"));
    expect(await screen.findByTestId("missing-fields")).toHaveTextContent(
      "page.supplier.form.name"
    );
    expect(addSupplier).not.toHaveBeenCalled();
  });

  test("a draft is sent with status draft", async () => {
    renderPage(AddSupplier);
    type(screen.getByPlaceholderText("page.supplier.form.namePlaceholder"), "PT Sumber");
    fireEvent.click(screen.getByText("page.supplier.form.saveAsDraft"));
    fireEvent.click(await screen.findByText("page.supplier.modal.draftConfirm"));
    await waitFor(() => expect(addSupplier).toHaveBeenCalledTimes(1));
    expect(addSupplier.mock.calls[0][0].status).toBe("draft");
  });
});

const loadedSupplier = {
  id: 12,
  name: "PT Sumber",
  contactPerson: "Andi",
  phone: "08123456789",
  email: "sumber@example.com",
  address: "Jl. Pasar 1",
  status: "inactive",
  paymentType: "tempo",
  tempoDays: 30,
  categoryId: 3,
  mobile: "",
  whatsapp: "",
  fax: "",
  website: "",
  taxInclude: false,
  taxType: "ppn",
  taxNumber: "01.234",
  taxName: "PT Sumber",
  nitku: "",
  taxTransactionType: "purchase",
  defaultDiscount: 5,
  defaultDescription: "",
  store: [{ id: 2, name: "Cabang" }],
  contacts: [{ id: 7, fullName: "Budi", position: "", email: "", phone: "0811" }],
  bankAccounts: [
    {
      id: 8,
      bankName: "BCA",
      accountNumber: "0012345678",
      accountName: "PT Sumber",
      isDefault: true,
      status: "active"
    }
  ],
  products: [
    {
      id: 9,
      productId: 90,
      name: "Wortel",
      price: 12500,
      unit: "kg",
      leadTime: 2,
      leadTimeUnit: "hari",
      qualityRating: 4,
      minOrderQty: 10,
      notes: "Segar"
    }
  ]
};

const loadedPayload = {
  id: "12",
  name: "PT Sumber",
  contactPerson: "Andi",
  phone: "08123456789",
  email: "sumber@example.com",
  address: "Jl. Pasar 1",
  isActive: false,
  paymentType: "tempo",
  tempoDays: 30,
  categoryId: 3,
  mobile: "",
  whatsapp: "",
  fax: "",
  website: "",
  taxInclude: false,
  taxType: "ppn",
  taxNumber: "01.234",
  taxName: "PT Sumber",
  nitku: "",
  taxTransactionType: "purchase",
  defaultDiscount: 5,
  defaultDescription: "",
  status: "inactive",
  store: [2],
  contacts: [{ fullName: "Budi", position: null, email: null, phone: "0811" }],
  bankAccounts: [
    {
      bankName: "BCA",
      accountNumber: "0012345678",
      accountName: "PT Sumber",
      isDefault: true,
      status: "active"
    }
  ],
  products: [
    {
      name: "Wortel",
      price: 12500,
      unit: "kg",
      leadTime: 2,
      leadTimeUnit: "hari",
      qualityRating: 4,
      minOrderQty: 10,
      notes: "Segar"
    }
  ]
};

describe("EditSupplier — characterization", () => {
  beforeEach(() => {
    mockRoleType = "super_admin";
    getSupplierById.mockResolvedValue({ data: loadedSupplier });
  });

  test("an unchanged supplier is sent back as loaded", async () => {
    renderPage(EditSupplier);
    await screen.findByDisplayValue("Jl. Pasar 1");
    await confirmSave();
    await waitFor(() => expect(editSupplier).toHaveBeenCalledTimes(1));
    expect(editSupplier.mock.calls[0][0]).toEqual(loadedPayload);
  });

  test("editing a supplied product and removing a contact are both sent", async () => {
    renderPage(EditSupplier);
    await screen.findByDisplayValue("Jl. Pasar 1");
    fireEvent.click(screen.getByText("Wortel").closest("tr").querySelectorAll("button")[0]);
    type(byIdSuffix("price"), "15000");
    const productsCard = screen.getByText("page.supplier.products.title").closest('[class*="p-6"]');
    fireEvent.click(within(productsCard).getByText("common.save"));
    fireEvent.click(screen.getByText("Budi").closest("tr").querySelectorAll("button")[1]);
    await confirmSave();
    await waitFor(() => expect(editSupplier).toHaveBeenCalledTimes(1));
    const payload = editSupplier.mock.calls[0][0];
    expect(payload.contacts).toEqual([]);
    expect(payload.products).toEqual([
      { ...loadedPayload.products[0], price: 15000, minOrderQty: "10" }
    ]);
  });
});
