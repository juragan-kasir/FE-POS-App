import { axiosInstance } from ".";

export const getShiftById = async (id) => {
  const { data, status } = await axiosInstance.get(`/shift/get-shift/${id}`);
  if (status !== 200) throw Error(`${data.message}`);
  return data;
};

export const getAllShift = async ({ store, page, limit, statusShift, search = "" }) => {
  const { data, status } = await axiosInstance.get(
    `/shift/get-shift?store=${store}&page=${page}&pageSize=${limit}&status=${statusShift}&search=${search}`
  );
  if (status !== 200) throw Error(`${data.message}`);
  return data;
};

export const getShiftDropdown = async ({ store, statusShift }) => {
  const { data, status } = await axiosInstance.get(
    `/shift/dropdown?store=${store}&status=${statusShift}`
  );
  if (status !== 200) throw Error(`${data.message}`);
  return data;
};

export const addShift = async (payload) => {
  const { data, status } = await axiosInstance.post("/shift/add-new-shift", payload);
  if (status !== 200 && status !== 201) throw Error(`${data.message}`);
  return data;
};

export const editShift = async (payload) => {
  const { data, status } = await axiosInstance.put(`/shift/edit-shift/${payload.id}`, payload);
  if (status !== 200 && status !== 201) throw Error(`${data.message || data?.error}`);
  return data;
};

export const deleteShift = async (payload) => {
  const { data, status } = await axiosInstance.delete(`/shift/delete-shift/${payload.id}`, {
    data: payload
  });
  if (status !== 200) throw Error(data?.error);
  return data;
};
