import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { QueryClient, QueryClientProvider } from "react-query";
import MemberSearchModal from "../components/MemberSearchModal";
import * as memberService from "@/services/member";

jest.mock("react-cookie", () => ({
  useCookies: () => [{ activeStore: "1" }]
}));

jest.mock("@/services/member", () => ({
  getAllMember: jest.fn()
}));

const renderModal = (onSelect = jest.fn(), onClose = jest.fn()) => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemberSearchModal open={true} onClose={onClose} onSelect={onSelect} />
    </QueryClientProvider>
  );
};

describe("MemberSearchModal", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("renders search inputs and button", () => {
    renderModal();
    expect(screen.getByText("component.memberSearchModal.ui.searchMember")).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText("component.memberSearchModal.ui.phoneMemberNo")
    ).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText("component.memberSearchModal.ui.memberName")
    ).toBeInTheDocument();
    expect(screen.getByText("common.search")).toBeInTheDocument();
  });

  test("initial state prompts the cashier to search before any request is made", () => {
    renderModal();
    expect(screen.getByText("component.memberSearchModal.ui.searchForAMember")).toBeInTheDocument();
    expect(memberService.getAllMember).not.toHaveBeenCalled();
  });

  test("shows an error state with a retry action when the search request fails", async () => {
    memberService.getAllMember.mockRejectedValue(new Error("network down"));
    renderModal();
    fireEvent.change(screen.getByPlaceholderText("component.memberSearchModal.ui.memberName"), {
      target: { value: "Budi" }
    });
    fireEvent.click(screen.getByText("common.search"));
    await waitFor(() =>
      expect(
        screen.getByText(/component.memberSearchModal.ui.failedToSearchMembers/)
      ).toBeInTheDocument()
    );
    expect(screen.getByText("common.retry")).toBeInTheDocument();

    memberService.getAllMember.mockResolvedValue({
      data: [{ id: 1, name: "Budi", phoneNumber: "081234", point: 120, status: "common.active" }]
    });
    fireEvent.click(screen.getByText("common.retry"));
    await waitFor(() => expect(screen.getByText("Budi")).toBeInTheDocument());
  });

  test("Escape closes the modal", () => {
    const onClose = jest.fn();
    renderModal(jest.fn(), onClose);
    fireEvent.keyDown(screen.getByPlaceholderText("component.memberSearchModal.ui.phoneMemberNo"), {
      key: "Escape",
      code: "Escape"
    });
    expect(onClose).toHaveBeenCalled();
  });

  test("search by member number", async () => {
    memberService.getAllMember.mockResolvedValue({
      data: [{ id: 1, name: "Budi", phoneNumber: "081234", point: 120, status: "common.active" }]
    });
    renderModal();
    fireEvent.change(screen.getByPlaceholderText("component.memberSearchModal.ui.phoneMemberNo"), {
      target: { value: "081234" }
    });
    fireEvent.click(screen.getByText("common.search"));
    await waitFor(() =>
      expect(memberService.getAllMember).toHaveBeenCalledWith(
        expect.objectContaining({ phoneNumber: "081234" })
      )
    );
  });

  test("search by name", async () => {
    memberService.getAllMember.mockResolvedValue({
      data: [{ id: 2, name: "Siti", phoneNumber: "081235", point: 50, status: "common.active" }]
    });
    renderModal();
    fireEvent.change(screen.getByPlaceholderText("component.memberSearchModal.ui.memberName"), {
      target: { value: "Siti" }
    });
    fireEvent.click(screen.getByText("common.search"));
    await waitFor(() =>
      expect(memberService.getAllMember).toHaveBeenCalledWith(
        expect.objectContaining({ nameMember: "Siti" })
      )
    );
  });

  test("shows loading", async () => {
    memberService.getAllMember.mockImplementation(() => new Promise(() => {}));
    renderModal();
    fireEvent.change(screen.getByPlaceholderText("component.memberSearchModal.ui.memberName"), {
      target: { value: "Budi" }
    });
    fireEvent.click(screen.getByText("common.search"));
    expect(
      await screen.findByText("component.memberSearchModal.ui.searchingMembers")
    ).toBeInTheDocument();
  });

  test("shows empty", async () => {
    memberService.getAllMember.mockResolvedValue({ data: [] });
    renderModal();
    fireEvent.change(screen.getByPlaceholderText("component.memberSearchModal.ui.memberName"), {
      target: { value: "Unknown" }
    });
    fireEvent.click(screen.getByText("common.search"));
    await waitFor(() =>
      expect(screen.getByText("component.memberSearchModal.ui.memberNotFound")).toBeInTheDocument()
    );
  });

  test("click row selects member and closes", async () => {
    const onSelect = jest.fn();
    const onClose = jest.fn();
    memberService.getAllMember.mockResolvedValue({
      data: [{ id: 1, name: "Budi", phoneNumber: "081234", point: 120, status: "common.active" }]
    });
    renderModal(onSelect, onClose);
    fireEvent.change(screen.getByPlaceholderText("component.memberSearchModal.ui.memberName"), {
      target: { value: "Budi" }
    });
    fireEvent.click(screen.getByText("common.search"));
    await waitFor(() => expect(screen.getByText("Budi")).toBeInTheDocument());
    fireEvent.click(screen.getByText("Budi"));
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ name: "Budi" }));
    expect(onClose).toHaveBeenCalled();
  });
});
