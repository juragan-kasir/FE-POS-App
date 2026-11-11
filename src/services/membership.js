import { axiosInstance } from ".";

export const getMemberships = async (params = {}) => {
  const { data } = await axiosInstance.get("/memberships", { params });
  return data;
};

export const createMembership = async ({ userId, tenantId, role }) => {
  const { data } = await axiosInstance.post("/memberships", { userId, tenantId, role });
  return data;
};

export const updateMembershipStatus = async (id, status) => {
  const { data } = await axiosInstance.patch(`/memberships/${id}`, { status });
  return data;
};
