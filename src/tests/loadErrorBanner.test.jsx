import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { QueryClient, QueryClientProvider, useQuery } from "react-query";
import LoadErrorBanner from "@/components/ui/LoadErrorBanner";

// A form's option lists (stores, suppliers, categories) that failed to load
// used to leave an empty dropdown with no explanation. The banner reports any
// failed query on the screen and retries only the failed ones.

jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (k) => k })
}));

const Screen = ({ suppliers, stores }) => {
  useQuery("suppliers", suppliers);
  useQuery("stores", stores);
  return <LoadErrorBanner />;
};

const renderScreen = (fns) => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <Screen {...fns} />
    </QueryClientProvider>
  );
};

beforeEach(() => jest.spyOn(console, "error").mockImplementation(() => {}));
afterEach(() => console.error.mockRestore());

test("nothing is shown while every query succeeds", async () => {
  const stores = jest.fn().mockResolvedValue([]);
  renderScreen({ suppliers: jest.fn().mockResolvedValue([]), stores });
  await waitFor(() => expect(stores).toHaveBeenCalled());
  expect(screen.queryByRole("alert")).toBeNull();
});

test("a failed query shows the notice and retry refetches only that query", async () => {
  const suppliers = jest
    .fn()
    .mockRejectedValueOnce(new Error("500"))
    .mockResolvedValue([{ id: 1 }]);
  const stores = jest.fn().mockResolvedValue([]);
  renderScreen({ suppliers, stores });

  expect(await screen.findByRole("alert")).toHaveTextContent("common.loadErrorPartial");
  fireEvent.click(screen.getByRole("button", { name: /common.retry/ }));

  await waitFor(() => expect(screen.queryByRole("alert")).toBeNull());
  expect(suppliers).toHaveBeenCalledTimes(2);
  expect(stores).toHaveBeenCalledTimes(1);
});
