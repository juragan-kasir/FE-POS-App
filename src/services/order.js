import { axiosInstance } from ".";

export const createOrder = async (payload) => {
  const { data, status } = await axiosInstance.post("/order/create", payload);
  if (status !== 200 && status !== 201) throw Error(`${data.message}`);
  return data;
};

export const createOpenBill = async (payload) => {
  const { data } = await axiosInstance.post("/order/open-bill", payload);
  return data;
};

export const addOrderItems = async (orderId, payload) => {
  const { data } = await axiosInstance.post(`/order/${orderId}/items`, payload);
  return data;
};

// DR-11 / DR-17: the server's totals for the exact payload /order/create
// would receive (same resolver; read-only). The checkout displays these
// instead of re-deriving discounts or tax in the browser.
export const quoteOrder = async (payload) => {
  const { data, status } = await axiosInstance.post("/order/quote", payload);
  if (status !== 200) throw Error(`${data.message}`);
  return data;
};

// F-SMOKE-01: reads the exact rate order/create will apply (same
// getActiveTaxRate/getServiceChargeRate resolution, fallback included) so the
// cashier UI can never show a percentage that diverges from what gets charged.
export const getCustomerTaxRate = async (store) => {
  const { data, status } = await axiosInstance.get("/order/customer-tax-rate", {
    params: { store }
  });
  if (status !== 200) throw Error(`${data.message}`);
  return data;
};

export const getOrdersByStore = async (payload) => {
  const params = new URLSearchParams();
  if (payload?.location) params.set("store", payload.location);
  if (payload?.page) params.set("page", payload.page);
  if (payload?.limit) params.set("limit", payload.limit);
  if (payload?.date) params.set("date", payload.date);
  if (payload?.status) params.set("status", payload.status);
  if (payload?.paymentStatus) params.set("paymentStatus", payload.paymentStatus);
  if (payload?.startDate) params.set("startDate", payload.startDate);
  if (payload?.endDate) params.set("endDate", payload.endDate);
  // Phase 39 Batch 4: register-window querying — the backend resolves the
  // register lifecycle timestamps (openedAt..closedAt) server-side. The
  // Detail Register page must use this, never the opening calendar date.
  if (payload?.cashRegisterId) params.set("cashRegisterId", payload.cashRegisterId);
  // Phase 39 Batch 4 follow-up: "outside" lists the register's
  // outside-window population (mirrors the reconciliation OUTSIDE_WINDOW
  // bucket) for the Detail page history section.
  if (payload?.window) params.set("window", payload.window);
  const { data, status } = await axiosInstance.get(`/order/get-orders?${params.toString()}`);
  if (status !== 200) throw Error(`${data.message}`);
  return data;
};

export const getOrderById = async (id) => {
  const { data, status } = await axiosInstance.get(`/order/get-order/${id}`);
  if (status !== 200) throw Error(`${data.message}`);
  return data;
};

export const updateOrderStatus = async (payload) => {
  const { data, status } = await axiosInstance.put("/order/update-status", payload);
  if (status !== 200 && status !== 201) throw Error(`${data.message}`);
  return data;
};
