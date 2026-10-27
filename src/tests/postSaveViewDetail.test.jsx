import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { QueryClient, QueryClientProvider } from "react-query";
import { MemoryRouter, Routes, Route, useLocation } from "react-router-dom";
import Modal from "../components/organism/modal";
import { createdId } from "../utils/createdRecord";

// UX #2: after creating a record the user can open it straight away
// ("Lihat Detail") instead of always landing back on the list.

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
if (!globalThis.ResizeObserver) globalThis.ResizeObserver = ResizeObserverStub;

jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (k, o) => o?.defaultValue ?? k, i18n: { language: "id" } })
}));
jest.mock("sonner", () => ({
  toast: { success: jest.fn(), error: jest.fn(), info: jest.fn() }
}));
jest.mock("react-cookie", () => ({
  useCookies: () => [{ user: { id: 1, roleType: "admin", store: 1 } }]
}));
jest.mock("@/services/member", () => ({ addMember: jest.fn() }));
jest.mock("@/services/member-tier", () => ({
  addMemberTier: jest.fn(),
  getAllMemberTier: jest.fn(() => Promise.resolve({ data: [] }))
}));
jest.mock("@/components/organism/UserGuide", () => () => null);

import { toast } from "sonner";
import { addMember } from "@/services/member";
import { addMemberTier } from "@/services/member-tier";
import AddMember from "../page/member/AddMember";
import AddMemberTier from "../page/member-tier/AddMemberTier";

const Where = () => {
  const loc = useLocation();
  return <p data-testid="where">{loc.pathname + loc.search}</p>;
};

const renderAt = (path, element) =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path={path} element={element} />
          <Route path="*" element={<Where />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );

describe("createdId", () => {
  test("reads the id of the single record a create returned", () => {
    expect(createdId({ success: true, data: { id: 7 } })).toBe(7);
    expect(createdId({ data: { id: "a1" } })).toBe("a1");
  });
  test("is null when there is no single record to open", () => {
    expect(createdId({ success: true, message: "ok" })).toBeNull();
    expect(createdId({ data: [{ id: 1 }, { id: 2 }] })).toBeNull();
    expect(createdId(undefined)).toBeNull();
  });
});

describe("Modal secondary action", () => {
  test("renders beside confirm, runs, and closes", () => {
    const onSecondary = jest.fn();
    const onOpenChange = jest.fn();
    render(
      <Modal
        type="success"
        open
        onOpenChange={onOpenChange}
        title="Berhasil"
        secondaryText="Lihat Detail"
        onSecondary={onSecondary}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: "Lihat Detail" }));
    expect(onSecondary).toHaveBeenCalled();
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
  test("is absent without secondaryText", () => {
    render(<Modal type="success" open onOpenChange={jest.fn()} title="Berhasil" />);
    expect(screen.getAllByRole("button")).toHaveLength(1);
  });
});

test("Tambah Member: the success notice opens the new member", async () => {
  addMember.mockResolvedValue({ success: true, data: { id: 31 } });
  renderAt("/add-member", <AddMember />);

  fireEvent.click(screen.getByRole("button", { name: /page.member.add.saveDraft/ }));
  fireEvent.click(await screen.findByRole("button", { name: "page.member.add.draftModalConfirm" }));
  fireEvent.click(await screen.findByRole("button", { name: "common.viewDetail" }));

  await waitFor(() =>
    expect(screen.getByTestId("where")).toHaveTextContent("/detail-member?id=31")
  );
});

test("Tambah Member Tier: the success toast carries a Lihat Detail action", async () => {
  addMemberTier.mockResolvedValue({ success: true, data: { id: 4 } });
  renderAt("/add-member-tier", <AddMemberTier />);

  fireEvent.click(screen.getByRole("button", { name: /page.memberTier.add.saveDraft/ }));
  fireEvent.click(
    await screen.findByRole("button", { name: "page.memberTier.add.draftModalConfirm" })
  );

  await waitFor(() => expect(toast.success).toHaveBeenCalled());
  const { action } = toast.success.mock.calls.at(-1)[1];
  expect(action.label).toBe("common.viewDetail");
  action.onClick();
  await waitFor(() =>
    expect(screen.getByTestId("where")).toHaveTextContent("/detail-member-tier?id=4")
  );
});
