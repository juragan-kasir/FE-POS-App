import { axiosInstance } from ".";

export const getProductById = async (id) => {
  const { data, status } = await axiosInstance.get(`/product/get-by-id/${id}`);
  if (status !== 200) throw Error(`${data.message}`);
  return data;
};

export const getProductReviews = async (id) => {
  const { data, status } = await axiosInstance.get(`/order/customer-reviews?productId=${id}`);
  if (status !== 200) throw Error(`${data.message}`);
  return data?.data;
};

export const getAllProduct = async ({ location, nameProduct, category, status } = {}) => {
  const params = {};
  if (location) params.store = location;
  if (nameProduct) params.nameProduct = nameProduct;
  if (category) params.category = category;
  if (status) params.status = status;
  const { data, status: httpStatus } = await axiosInstance.get("/product/get-product", { params });
  if (httpStatus !== 200) throw Error(`${data.message}`);
  return data;
};

export const getProductByOutlet = async ({ location, search, page }) => {
  const params = new URLSearchParams();
  if (location) params.append("store", location);
  if (search) params.append("search", search);
  // F7-02: the endpoint defaults to a 200-row page when `limit` is omitted,
  // silently truncating any store with a larger catalog. 500 is its hard
  // max (mirrors the same pattern already used by getIngredients above).
  params.append("limit", "500");
  if (page != null) params.append("page", String(page));
  const { data, status } = await axiosInstance.get(`/product/get-product-by-super-admin?${params}`);
  if (status !== 200) throw Error(`${data.message}`);
  return data;
};

// Phase 31 Batch 2 (PERF-1): follow the endpoint's existing
// pagination.hasMore contract so catalogs larger than one 500-row page are
// concatenated instead of silently truncated. Bounded (10 pages) so a
// pathological catalog cannot fan out requests without limit. Bundles ride
// along on every page response; the first page's copy is kept.
export const getFullProductCatalog = async ({ location, search } = {}) => {
  const MAX_CATALOG_PAGES = 10;
  let page = 1;
  let allItems = [];
  let bundles = [];
  let first = true;
  for (;;) {
    const res = await getProductByOutlet({ location, search, page });
    const items = res?.data || [];
    if (first) {
      bundles = res?.bundles || [];
      first = false;
    }
    allItems = allItems.concat(items);
    const hasMore = res?.pagination?.hasMore === true;
    if (!hasMore || page >= MAX_CATALOG_PAGES) {
      return {
        data: allItems,
        bundles,
        pagination: { page, limit: 500, hasMore: hasMore && page >= MAX_CATALOG_PAGES }
      };
    }
    page += 1;
  }
};

export const getIngredients = async ({ store, search } = {}) => {
  const params = new URLSearchParams();
  if (store) params.append("store", store);
  if (search) params.append("search", search);
  params.append("limit", "500");
  params.append("status", "active");
  const { data, status } = await axiosInstance.get(`/ingredient/get-all?${params}`);
  if (status !== 200) throw Error(`${data.message}`);
  return data;
};

export const getAllProductTable = async ({
  location,
  limit,
  page,
  statusProduct,
  search,
  category,
  sort
}) => {
  let url = `/product/get-product-all?store=${location}&page=${page}&limit=${limit}&status=${statusProduct}`;
  if (search) url += `&search=${encodeURIComponent(search)}`;
  if (category) url += `&category=${encodeURIComponent(category)}`;
  if (sort) url += `&sort=${sort}`;
  const { data, status } = await axiosInstance.get(url);
  if (status !== 200) throw Error(`${data.message}`);
  return data;
};

export const addProduct = async (payload) => {
  const { data, status } = await axiosInstance.post("/product/add-product", payload);
  if (status !== 200 && status !== 201) throw Error(`${data.message}`);
  return data;
};

export const editProduct = async (payload) => {
  const { data, status } = await axiosInstance.put("/product/edit-product", payload);
  if (status !== 200 && status !== 201) throw Error(`${data.message}`);
  return data;
};

export const deleteProduct = async (payload) => {
  const { data, status } = await axiosInstance.delete(`/product/delete-product/${payload.id}`, {
    data: payload
  });
  if (status !== 200) throw Error(data?.error);
  return data;
};

const downloadBlob = async (url, filename) => {
  const { data, status } = await axiosInstance.get(url, {
    responseType: "arraybuffer"
  });

  if (status !== 200) throw new Error("Download failed");

  const blob = new Blob([data], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  });

  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
};

export const downloadProductTemplate = async () => {
  return downloadBlob("/product/template", `template-produk.xlsx`);
};

export const downloadProductExcel = async () => {
  return downloadBlob("/product/download", `${Date.now()}-products.xlsx`);
};

export const uploadProductExcel = async (file) => {
  const formData = new FormData();
  formData.append("file", file);
  const { data, status } = await axiosInstance.post("/product/import", formData, {
    headers: { "Content-Type": "multipart/form-data" }
  });
  if (status !== 200 && status !== 201) throw Error(`${data.message}`);
  return data;
};

// Portions each recipe product can make at the outlet, its limiting
// ingredients, and every ingredient's use per portion + stock (BRD BR-05).
export const getRecipeAvailability = async ({ location } = {}) => {
  const params = new URLSearchParams();
  if (location) params.append("store", location);
  const { data, status } = await axiosInstance.get(`/product/recipe-availability?${params}`);
  if (status !== 200) throw Error(`${data?.message}`);
  return data?.data || null;
};
