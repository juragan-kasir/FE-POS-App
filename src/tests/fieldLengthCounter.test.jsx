import React from "react";
import { render, screen, fireEvent, act } from "@testing-library/react";
import "@testing-library/jest-dom";
import { useForm } from "react-hook-form";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import { CURRENT_DB_LIMITS, FIELD_LIMITS } from "../constants/fieldLimits";

// Field-length standard (BA DR-28): a limited input shows how many characters
// are used of the maximum; at the maximum the border turns red and a line says
// "sudah mencapai batas maksimal". Inputs without a limit are unchanged.

jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (k) => k })
}));

const Controlled = ({ max = 5, initial = "" }) => {
  const [value, setValue] = React.useState(initial);
  return (
    <Input
      aria-label="nama"
      maxLength={max}
      value={value}
      onChange={(e) => setValue(e.target.value)}
    />
  );
};

test("a limited input shows the count and the maximum", () => {
  render(<Controlled initial="abc" />);
  expect(screen.getByText("3/5")).toBeInTheDocument();
  expect(screen.getByLabelText("nama")).toHaveAttribute("maxLength", "5");
  expect(screen.getByText("common.maxLengthReached")).toHaveClass("invisible");
  expect(screen.getByLabelText("nama")).not.toHaveClass("border-destructive");
});

test("at the maximum the border turns red and the limit line shows", () => {
  render(<Controlled />);
  fireEvent.change(screen.getByLabelText("nama"), { target: { value: "abcde" } });
  expect(screen.getByText("5/5")).toHaveClass("text-destructive");
  expect(screen.getByLabelText("nama")).toHaveClass("border-destructive");
  expect(screen.getByText("common.maxLengthReached")).not.toHaveClass("invisible");

  fireEvent.change(screen.getByLabelText("nama"), { target: { value: "abcd" } });
  expect(screen.getByText("4/5")).not.toHaveClass("text-destructive");
  expect(screen.getByLabelText("nama")).not.toHaveClass("border-destructive");
});

test("the counter is announced with the input", () => {
  render(<Controlled initial="ab" />);
  const input = screen.getByLabelText("nama");
  const counterId = input.getAttribute("aria-describedby");
  expect(document.getElementById(counterId)).toHaveTextContent("2/5");
});

test("an uncontrolled (register) field counts typing and a form reset", () => {
  let api;
  const Form = () => {
    const form = useForm({ defaultValues: { name: "" } });
    api = form;
    return (
      <Input aria-label="nama" maxLength={FIELD_LIMITS.PERSON_NAME} {...form.register("name")} />
    );
  };
  render(<Form />);
  expect(screen.getByText("0/100")).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText("nama"), { target: { value: "Ani" } });
  expect(screen.getByText("3/100")).toBeInTheDocument();
  act(() => api.reset({ name: "Budi Santoso" }));
  expect(screen.getByLabelText("nama")).toHaveValue("Budi Santoso");
  expect(screen.getByText("12/100")).toBeInTheDocument();
});

test("a limited textarea counts the same way", () => {
  const Area = () => {
    const [value, setValue] = React.useState("");
    return (
      <Textarea
        aria-label="catatan"
        maxLength={3}
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />
    );
  };
  render(<Area />);
  fireEvent.change(screen.getByLabelText("catatan"), { target: { value: "abc" } });
  expect(screen.getByText("3/3")).toBeInTheDocument();
  expect(screen.getByLabelText("catatan")).toHaveClass("border-destructive");
  expect(screen.getByText("common.maxLengthReached")).not.toHaveClass("invisible");
});

test("no limit, or a number input, renders a plain input without a counter", () => {
  const { container } = render(
    <>
      <Input aria-label="cari" />
      <Input aria-label="harga" type="number" maxLength={10} />
      <Textarea aria-label="bebas" />
    </>
  );
  expect(container.textContent).not.toMatch(/\d+\/\d+/);
  expect(screen.getByLabelText("cari").parentElement).toBe(container);
});

test("the limits follow the BA DR-28 standard", () => {
  expect(FIELD_LIMITS).toMatchObject({
    PERSON_NAME: 100,
    BUSINESS_NAME: 150,
    SHORT_LABEL: 50,
    UNIT: 20,
    REGION: 50,
    POSTAL_CODE: 10,
    ADDRESS: 255,
    PHONE: 20,
    EMAIL: 254,
    URL: 2048,
    DOCUMENT_NUMBER: 50,
    CODE: 50,
    BARCODE: 50,
    REFERENCE: 255,
    NPWP: 20,
    NITKU: 22,
    BANK_ACCOUNT: 34,
    VEHICLE_PLATE: 15,
    HEX_COLOR: 9,
    SHORT_NOTE: 140,
    DESCRIPTION: 255
  });
});

test("an unstyled input keeps its own classes and still turns red at the limit", () => {
  const Plain = () => {
    const [value, setValue] = React.useState("abc");
    return (
      <Input
        unstyled
        aria-label="kode"
        className="border border-border rounded-lg px-3"
        maxLength={3}
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />
    );
  };
  render(<Plain />);
  const input = screen.getByLabelText("kode");
  expect(input).not.toHaveClass("h-10");
  expect(input).toHaveClass("rounded-lg", "border-destructive");
  expect(input).not.toHaveClass("border-border");
  expect(screen.getByText("3/3")).toBeInTheDocument();
});

test("showCount={false} keeps a plain capped input", () => {
  const { container } = render(<Input aria-label="rating" maxLength={3} showCount={false} />);
  expect(screen.getByLabelText("rating")).toHaveAttribute("maxLength", "3");
  expect(container.textContent).toBe("");
});

test("after batch B5 only the account code stays narrower than the standard", () => {
  // tenant name 150, URL 2048 and the stock transfer reason use FIELD_LIMITS now
  expect(CURRENT_DB_LIMITS).toEqual({ ACCOUNT_CODE: 20 });
});
