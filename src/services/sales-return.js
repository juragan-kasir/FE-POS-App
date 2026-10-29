import { axiosInstance } from ".";

export const getAllSalesReturn = async (payload) => {
  const params = new URLSearchParams();
  if (payload?.page) params.append("page", payload.page);
  if (payload?.limit) params.append("limit", payload.limit);
  if (payload?.status) params.append("status", payload.status);
  if (payload?.store) params.append("store", payload.store);
  if (payload?.startDate) params.append("startDate", payload.startDate);
  if (payload?.endDate) params.append("endDate", payload.endDate);
  if (payload?.orderId) params.append("orderId", payload.orderId);
  const { data, status } = await axiosInstance.get(`/sales-return/get-all?${params}`);
  if (status !== 200) throw Error(`${data?.message}`);
  return data;
};

export const getSalesReturnById = async (id) => {
  const { data, status } = await axiosInstance.get(`/sales-return/get-by-id/${id}`);
  if (status !== 200) throw Error(`${data?.message}`);
  return data;
};

export const returnOrder = async (orderId, payload) => {
  const { data, status } = await axiosInstance.post(`/pos/order/${orderId}/return`, payload);
  if (status !== 201 && status !== 200) throw Error(`${data?.message}`);
  return data;
};

// Accepts the return id, or { id, refundReference } when the refund is
// non-cash (BA 009: the server requires its reference).
export const approveSalesReturn = async (arg) => {
  const id = typeof arg === "object" && arg !== null ? arg.id : arg;
  const refundReference =
    typeof arg === "object" && arg !== null ? arg.refundReference?.trim() : undefined;
  const { data, status } = await axiosInstance.patch(
    `/sales-return/approve/${id}`,
    refundReference ? { refundReference } : undefined
  );
  if (status !== 200 && status !== 201) throw Error(`${data?.message}`);
  return data;
};

export const rejectSalesReturn = async (id) => {
  const { data, status } = await axiosInstance.patch(`/sales-return/reject/${id}`);
  if (status !== 200 && status !== 201) throw Error(`${data?.message}`);
  return data;
};
