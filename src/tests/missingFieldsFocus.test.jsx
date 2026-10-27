import React, { useState } from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../components/ui/tabs";
import MissingFieldsModal from "../components/organism/MissingFieldsModal";
import { findFieldByLabel } from "../utils/focusField";

// UX #5: closing the "required fields are empty" notice used to scroll to the
// top of the page. It now takes the user to the empty field itself.

jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (k, o) => o?.defaultValue ?? k })
}));

beforeEach(() => {
  // jsdom has no layout; record the scroll instead.
  Element.prototype.scrollIntoView = jest.fn();
  window.scrollTo = jest.fn();
});

const Page = ({ fields, items }) => {
  const [open, setOpen] = useState(true);
  return (
    <div>
      <div>
        <label>
          Nama Toko <span>*</span>
        </label>
        <input aria-label="store-name" />
      </div>
      <div>
        <label htmlFor="pic">PIC</label>
        <div>
          <input id="pic" />
        </div>
      </div>
      <div>
        <label>Supplier</label>
        <button type="button" role="combobox" aria-expanded="false">
          Pilih supplier
        </button>
      </div>
      <Tabs defaultValue="info">
        <TabsList>
          <TabsTrigger value="info">Informasi</TabsTrigger>
          <TabsTrigger value="docs">Dokumen</TabsTrigger>
        </TabsList>
        <TabsContent value="info">info</TabsContent>
        <TabsContent value="docs">
          <label>Foto KTP</label>
          <input aria-label="ktp" />
        </TabsContent>
      </Tabs>
      <MissingFieldsModal open={open} onOpenChange={setOpen} fields={fields} items={items} />
    </div>
  );
};

describe("findFieldByLabel", () => {
  test("finds the control by label text, by htmlFor, and next to the label", () => {
    render(<Page fields={[]} />);
    expect(findFieldByLabel("Nama Toko")).toBe(screen.getByLabelText("store-name"));
    expect(findFieldByLabel("PIC")).toBe(document.getElementById("pic"));
    expect(findFieldByLabel("supplier")).toBe(document.querySelector('[role="combobox"]'));
    expect(findFieldByLabel("Tidak Ada")).toBeNull();
  });
});

describe("MissingFieldsModal", () => {
  test("Isi Sekarang focuses the first empty field instead of scrolling to the top", async () => {
    render(<Page fields={["Nama Toko", "PIC"]} />);
    fireEvent.click(screen.getByRole("button", { name: "Isi Sekarang" }));

    await waitFor(() => expect(screen.getByLabelText("store-name")).toHaveFocus());
    expect(window.scrollTo).not.toHaveBeenCalled();
  });

  test("clicking a listed field goes to that field", async () => {
    render(<Page fields={["Nama Toko", "PIC"]} />);
    fireEvent.click(screen.getByRole("button", { name: /PIC/ }));

    await waitFor(() => expect(document.getElementById("pic")).toHaveFocus());
    expect(document.getElementById("pic")).toHaveClass("ring-destructive");
  });

  test("a field in another tab opens that tab first", async () => {
    render(<Page items={[{ title: "Dokumen", stepNum: 2, fields: ["Foto KTP"] }]} fields={[]} />);
    expect(screen.getByText(/Tab 2/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Isi Sekarang" }));

    await waitFor(() => expect(screen.getByLabelText("ktp")).toHaveFocus());
  });

  test("falls back to the page top when the field can't be found", async () => {
    render(<Page fields={["Tidak Ada"]} />);
    fireEvent.click(screen.getByRole("button", { name: "Isi Sekarang" }));

    await waitFor(() => expect(window.scrollTo).toHaveBeenCalled());
  });
});
