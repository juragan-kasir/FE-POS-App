import { axiosInstance } from ".";

export const getAllBom = async (payload) => {
  const params = new URLSearchParams();
  if (payload?.page) params.append("page", payload.page);
  if (payload?.limit) params.append("limit", payload.limit);
  if (payload?.search) params.append("search", payload.search);
  if (payload?.status && payload.status !== "all") params.append("status", payload.status);
  const { data, status } = await axiosInstance.get(`/bom/get-all?${params}`);
  if (status !== 200) throw Error(`${data?.message}`);
  return data;
};

export const getBomById = async (id) => {
  const { data, status } = await axiosInstance.get(`/bom/get-by-id/${id}`);
  if (status !== 200) throw Error(`${data?.message}`);
  return data;
};

// Not finding a BOM for a product is an expected, normal state (most
// products don't have one) — returns null rather than throwing so callers
// can treat "no BOM yet" the same as any other successful lookup.
export const getBomByProduct = async (productId) => {
  try {
    const { data } = await axiosInstance.get(`/bom/get-by-product/${productId}`);
    return data;
  } catch (err) {
    if (err?.response?.status === 404) return null;
    throw err;
  }
};

export const addBom = async (payload) => {
  const { data, status } = await axiosInstance.post("/bom/add", payload);
  if (status !== 200 && status !== 201) throw Error(`${data?.message}`);
  return data;
};

export const editBom = async (id, payload) => {
  const { data, status } = await axiosInstance.put(`/bom/edit/${id}`, payload);
  if (status !== 200 && status !== 201) throw Error(`${data?.message}`);
  return data;
};

export const deleteBom = async (id) => {
  const { data, status } = await axiosInstance.delete(`/bom/delete/${id}`);
  if (status !== 200 && status !== 204) throw Error(`${data?.message}`);
  return data;
};

// Live HPP of a product per outlet recipe (status, HPP per portion, food cost,
// margin). The caller's store scope applies; a product without a recipe has
// `recipes: []`.
export const getBomCosting = async (productId) => {
  const { data, status } = await axiosInstance.get(`/bom/costing/${productId}`);
  if (status !== 200) throw Error(`${data?.message}`);
  return data?.data || null;
};
