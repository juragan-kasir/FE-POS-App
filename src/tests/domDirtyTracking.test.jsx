import React from "react";
import { fireEvent, render } from "@testing-library/react";
import "@testing-library/jest-dom";

const mockRegisterDirty = jest.fn();

jest.mock("../contexts/UnsavedChangesContext", () => ({
  useUnsavedChangesGuard: () => ({ registerDirty: mockRegisterDirty })
}));

import { useDomDirtyTracking } from "../hooks/useDomDirtyTracking";

const NativeForm = () => {
  const dirtyRef = useDomDirtyTracking({ enabled: true });

  return (
    <form ref={dirtyRef} aria-label="native">
      <input name="name" defaultValue="" />
      <button type="submit">Save</button>
    </form>
  );
};

describe("useDomDirtyTracking", () => {
  beforeEach(() => mockRegisterDirty.mockClear());

  test("registers dirty on input and cleans on submit", () => {
    const { getByLabelText, getByRole, unmount } = render(<NativeForm />);

    fireEvent.change(getByLabelText("native").querySelector("input"), {
      target: { value: "Budi" }
    });

    expect(mockRegisterDirty).toHaveBeenCalledWith(expect.any(String), true);

    fireEvent.submit(getByRole("button", { name: "Save" }).closest("form"));
    expect(mockRegisterDirty).toHaveBeenLastCalledWith(expect.any(String), false);

    unmount();
    expect(mockRegisterDirty).toHaveBeenLastCalledWith(expect.any(String), false);
  });
});
