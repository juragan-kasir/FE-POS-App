import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "react-query";
import { getAllUsers } from "@/services/user";
import { createMembership, getMemberships, updateMembershipStatus } from "@/services/membership";
import {
  MEMBERSHIP_PAGE_LIMIT,
  MEMBERSHIP_STATUS,
  TENANT_ADMIN_CANDIDATE_LIMIT,
  TENANT_ADMIN_ROLE
} from "@/constants/membership";

const accountLabel = (user) =>
  user?.fullName ? `${user.fullName} (${user.userName})` : user?.userName || "";

export const useTenantAdmins = (tenantId, { enabled }) => {
  const queryClient = useQueryClient();
  const membershipsKey = ["tenant-admins", tenantId];

  const memberships = useQuery(
    membershipsKey,
    () => getMemberships({ tenantId, limit: MEMBERSHIP_PAGE_LIMIT }),
    { enabled: enabled && !!tenantId }
  );
  const accounts = useQuery(
    ["tenant-admin-candidates"],
    () => getAllUsers({ page: 1, limit: TENANT_ADMIN_CANDIDATE_LIMIT }),
    { enabled }
  );

  const accountById = useMemo(
    () => new Map((accounts.data?.data || []).map((user) => [user.id, user])),
    [accounts.data]
  );

  const admins = (memberships.data?.data || [])
    .filter((row) => row.role === TENANT_ADMIN_ROLE && row.status === MEMBERSHIP_STATUS.active)
    .map((row) => ({
      ...row,
      label: accountLabel(accountById.get(row.userId)) || `#${row.userId}`
    }));

  const adminUserIds = new Set(admins.map((row) => row.userId));
  const candidates = (accounts.data?.data || [])
    .filter((user) => !adminUserIds.has(user.id))
    .map((user) => ({ value: String(user.id), label: accountLabel(user) }));

  const refresh = () => queryClient.invalidateQueries(membershipsKey);
  const add = useMutation(
    (userId) => createMembership({ userId: Number(userId), tenantId, role: TENANT_ADMIN_ROLE }),
    { onSuccess: refresh }
  );
  const revoke = useMutation(
    (membershipId) => updateMembershipStatus(membershipId, MEMBERSHIP_STATUS.deactivated),
    { onSuccess: refresh }
  );

  return {
    admins,
    candidates,
    isLoading: memberships.isLoading || accounts.isLoading,
    add,
    revoke
  };
};
