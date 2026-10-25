import React from "react";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import "@testing-library/jest-dom";
import { QueryClient, QueryClientProvider } from "react-query";
import { MemoryRouter } from "react-router-dom";
import { toast } from "sonner";
import EditRole from "../page/role/EditRole";
import AddRole from "../page/user/AddRole";
import RoleManagement from "../page/role/RoleManagement";
import { addRole, editRole, getRoleById, getAllRoleTable, deleteRole } from "@/services/role";
import { useUnsavedChanges } from "@/hooks/useUnsavedChanges";
import {
  buildInitialPermissions,
  buildRoleEditPayload,
  diffPermissions,
  filterGroups,
  getLeafItemsGrouped,
  unmatchedAccessMenuEntries
} from "../page/role/rolePermissions";

// Role management audit 2026-10-16: R-02 (edits send only what changed,
// never roleType/store), createdBy/modifiedBy no longer client-supplied,
// and the list/editor UX (search, scope, user count, change summary).

const mockNavigate = jest.fn();
let mockCookieUser = { id: 1, roleType: "super_admin", store: null };

jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: () => mockNavigate,
  useParams: () => ({ id: "7" })
}));
jest.mock("react-cookie", () => ({
  useCookies: () => [{ user: mockCookieUser }]
}));
jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (k, opts) => (opts && typeof opts === "object" ? `${k}:${JSON.stringify(opts)}` : k)
  })
}));
jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn(), info: jest.fn() } }));
jest.mock("@/hooks/useUnsavedChanges", () => ({ useUnsavedChanges: jest.fn() }));
jest.mock("@/services/role", () => ({
  addRole: jest.fn(() => Promise.resolve({ success: true })),
  editRole: jest.fn(() => Promise.resolve({ success: true })),
  getRoleById: jest.fn(),
  getAllRoleTable: jest.fn(),
  deleteRole: jest.fn()
}));
jest.mock("@/services/location", () => ({
  getAllLocation: jest.fn(() => Promise.resolve({ data: [{ id: 3, name: "Bakso ABC" }] }))
}));
jest.mock("@/utils/sidebar-menu", () => ({
  sidebarMenuSuperAdmin: [
    { title: "Home", href: "/home", actions: ["view"] },
    {
      title: "Sales",
      children: [
        { title: "Orders", href: "/order-list", actions: ["view", "add", "delete"] },
        { title: "Returns", href: "/sales-return", actions: ["view", "approve"] }
      ]
    }
  ]
}));
jest.mock(
  "@/components/ui/PageHeader",
  () =>
    function PageHeaderStub({ title, onBack, children }) {
      return (
        <div>
          <h1>{title}</h1>
          {onBack && <button onClick={onBack}>back</button>}
          {children}
        </div>
      );
    }
);
jest.mock(
  "@/components/organism/MissingFieldsModal",
  () =>
    function MissingFieldsModalStub() {
      return null;
    }
);
jest.mock(
  "@/components/ui/HorizontalScrollArea",
  () =>
    function HorizontalScrollAreaStub({ children }) {
      return <div>{children}</div>;
    }
);
jest.mock("@/components/ui/SearchInput", () => ({
  SearchInput: function SearchInputStub({ value, onChange, placeholder }) {
    return (
      <input aria-label={placeholder} value={value} onChange={(e) => onChange(e.target.value)} />
    );
  }
}));
jest.mock("@/components/ui/combobox", () => ({
  Combobox: function ComboboxStub({ options, value, onChange }) {
    return (
      <select aria-label="status-filter" value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    );
  }
}));
jest.mock(
  "@/components/ui/DataTable",
  () =>
    function DataTableStub({ columns, data, toolbar, emptyMessage }) {
      return (
        <div>
          {toolbar}
          {data.length === 0 ? (
            <p>{emptyMessage}</p>
          ) : (
            <table>
              <tbody>
                {data.map((row) => (
                  <tr key={row.id} data-testid={`row-${row.id}`}>
                    {columns.map((c, i) => (
                      <td key={i}>{c.render(row)}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      );
    }
);
jest.mock(
  "@/components/ui/TableActions",
  () =>
    function TableActionsStub({ items }) {
      return (
        <div>
          {items
            .filter((i) => !i.hidden)
            .map((i) => (
              <button key={i.label} onClick={i.onClick}>
                {i.label}
              </button>
            ))}
        </div>
      );
    }
);

const renderWithClient = (ui) => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } }
  });
  return render(
    <MemoryRouter>
      <QueryClientProvider client={client}>{ui}</QueryClientProvider>
    </MemoryRouter>
  );
};

const storedRole = {
  id: 7,
  name: "Admin Toko",
  roleType: "admin",
  store: 3,
  status: "active",
  isSystem: false,
  accessMenu: [
    { menu: "/home", view: true },
    { menu: "/order-list", view: true, add: false, delete: false },
    // Outside the matrix: must survive a save untouched.
    { menu: "/legacy-only", view: true }
  ]
};

beforeEach(() => {
  jest.clearAllMocks();
  mockCookieUser = { id: 1, roleType: "super_admin", store: null };
  // Full-access session: menu-level canAccess passes for every action.
  sessionStorage.clear();
});

describe("role permission helpers", () => {
  const groups = getLeafItemsGrouped();
  const stored = { "/home": { view: true }, "/order-list": { view: true } };

  test("an unchanged editor produces an id-only payload", () => {
    const perms = buildInitialPermissions(groups, stored, "admin");
    const initial = { name: "A", description: "", status: "active", permissions: perms };
    expect(buildRoleEditPayload({ id: "7", initial, current: { ...initial }, groups })).toEqual({
      id: 7
    });
  });

  test("a permission change sends accessMenu only, never roleType/store/modifiedBy", () => {
    const perms = buildInitialPermissions(groups, stored, "admin");
    const initial = { name: "A", description: "", status: "active", permissions: perms };
    const next = {
      ...perms,
      "/order-list": { ...perms["/order-list"], delete: true }
    };
    const payload = buildRoleEditPayload({
      id: 7,
      initial,
      current: { ...initial, permissions: next },
      storedAccessMenu: [{ menu: "/legacy-only", view: true }],
      groups
    });
    expect(Object.keys(payload).sort()).toEqual(["accessMenu", "id"]);
    expect(payload.accessMenu).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ menu: "/order-list", delete: true }),
        { menu: "/legacy-only", view: true }
      ])
    );
  });

  test("actions missing from a stored entry show unchecked (no silent grant)", () => {
    const perms = buildInitialPermissions(groups, stored, "admin");
    expect(perms["/order-list"]).toMatchObject({ view: true, add: false, delete: false });
    expect(perms["/sales-return"]).toMatchObject({ view: false, approve: false });
    expect(buildInitialPermissions(groups, {}, "super_admin")["/order-list"].delete).toBe(true);
  });

  test("diff lists granted and revoked actions", () => {
    const before = buildInitialPermissions(groups, stored, "admin");
    const after = {
      ...before,
      "/home": { ...before["/home"], view: false },
      "/sales-return": { ...before["/sales-return"], approve: true }
    };
    const { added, removed } = diffPermissions(groups, before, after);
    expect(added).toEqual([{ href: "/sales-return", title: "Returns", action: "approve" }]);
    expect(removed).toEqual([{ href: "/home", title: "Home", action: "view" }]);
  });

  test("legacy keys covered by the matrix are not duplicated", () => {
    expect(
      unmatchedAccessMenuEntries(
        [
          { menu: "order", view: true },
          { menu: "/x", view: true }
        ],
        groups
      )
    ).toEqual([{ menu: "/x", view: true }]);
  });

  test("menu search filters items and keeps whole matching groups", () => {
    expect(filterGroups(groups, "return").flatMap((g) => g.items.map((i) => i.href))).toEqual([
      "/sales-return"
    ]);
    expect(filterGroups(groups, "sales")[0].items).toHaveLength(2);
    expect(filterGroups(groups, "zzz")).toEqual([]);
  });
});

describe("EditRole", () => {
  test("saving one permission change sends only accessMenu after a change summary", async () => {
    getRoleById.mockResolvedValue({ data: storedRole });
    renderWithClient(<EditRole />);
    const checkbox = await screen.findByLabelText("Orders — page.role.action.delete");
    fireEvent.click(checkbox);
    expect(useUnsavedChanges).toHaveBeenLastCalledWith(true);

    fireEvent.click(screen.getByText("page.role.edit.saveChanges"));
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText("Orders — page.role.action.delete")).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole("button", { name: "page.role.edit.saveChanges" }));

    await waitFor(() => expect(editRole).toHaveBeenCalledTimes(1));
    const payload = editRole.mock.calls[0][0];
    expect(payload.id).toBe(7);
    expect(payload).not.toHaveProperty("roleType");
    expect(payload).not.toHaveProperty("store");
    expect(payload).not.toHaveProperty("modifiedBy");
    expect(payload).not.toHaveProperty("name");
    expect(payload.accessMenu).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ menu: "/order-list", delete: true }),
        { menu: "/legacy-only", view: true }
      ])
    );
  });

  test("saving without changes sends nothing", async () => {
    getRoleById.mockResolvedValue({ data: storedRole });
    renderWithClient(<EditRole />);
    await screen.findByLabelText("Orders — page.role.action.delete");
    fireEvent.click(screen.getByText("page.role.edit.saveChanges"));
    expect(toast.info).toHaveBeenCalledWith("page.role.edit.noChanges");
    expect(editRole).not.toHaveBeenCalled();
  });

  test("shows the role type and store scope read-only", async () => {
    getRoleById.mockResolvedValue({ data: storedRole });
    renderWithClient(<EditRole />);
    expect(await screen.findByText("page.role.type.admin")).toBeInTheDocument();
    expect(
      await screen.findByText('page.role.scope.store:{"name":"Bakso ABC"}')
    ).toBeInTheDocument();
  });

  test("a role outside the caller scope (404) shows a not-found state, not a retry", async () => {
    getRoleById.mockRejectedValue({ response: { status: 404 } });
    renderWithClient(<EditRole />);
    expect(await screen.findByText("page.role.detail.notFound")).toBeInTheDocument();
    fireEvent.click(screen.getByText("page.role.edit.backToList"));
    expect(mockNavigate).toHaveBeenCalledWith("/role-management");
  });

  test("leaving a clean editor navigates without a discard prompt", async () => {
    getRoleById.mockResolvedValue({ data: storedRole });
    renderWithClient(<EditRole />);
    await screen.findByLabelText("Orders — page.role.action.delete");
    fireEvent.click(screen.getByText("common.cancel"));
    expect(mockNavigate).toHaveBeenCalledWith("/role-management");
  });
});

describe("AddRole", () => {
  // 10-20: the role TYPE is chosen here — the server only validates it
  // (super_admin for a global super admin only) and defaulted a missing one
  // to "user", so every UI-made role could not sell or manage the store.
  test("creates with the chosen role type, never client-supplied createdBy or store", async () => {
    renderWithClient(<AddRole />);
    fireEvent.change(screen.getByLabelText(/page.role.detail.nameLabel/), {
      target: { value: "Supervisor" }
    });
    fireEvent.click(screen.getByLabelText("Home — page.role.action.view"));
    fireEvent.click(screen.getByRole("radio", { name: /page.role.type.kasir/ }));
    fireEvent.click(screen.getByText("page.role.add.saveRole"));
    await waitFor(() => expect(addRole).toHaveBeenCalledTimes(1));
    const payload = addRole.mock.calls[0][0];
    expect(payload).not.toHaveProperty("createdBy");
    expect(payload).not.toHaveProperty("store");
    expect(payload.roleType).toBe("kasir");
    expect(payload.accessMenu).toEqual(
      expect.arrayContaining([expect.objectContaining({ menu: "/home", view: true })])
    );
  });

  test("a role type must be chosen before saving", async () => {
    addRole.mockClear();
    renderWithClient(<AddRole />);
    fireEvent.change(screen.getByLabelText(/page.role.detail.nameLabel/), {
      target: { value: "Gudang" }
    });
    fireEvent.click(screen.getByText("page.role.add.saveRole"));
    expect(addRole).not.toHaveBeenCalled();
  });

  test("only a global super admin is offered the super admin type", () => {
    mockCookieUser = { id: 1, roleType: "super_admin", store: null };
    const { unmount } = renderWithClient(<AddRole />);
    expect(screen.getByRole("radio", { name: /page.role.type.superAdmin/ })).toBeInTheDocument();
    unmount();
    mockCookieUser = { id: 2, roleType: "super_admin", store: 3 };
    renderWithClient(<AddRole />);
    expect(
      screen.queryByRole("radio", { name: /page.role.type.superAdmin/ })
    ).not.toBeInTheDocument();
    expect(screen.getByRole("radio", { name: /page.role.type.admin/ })).toBeInTheDocument();
  });

  test("a store-bound account is told the role is created for its own store", () => {
    mockCookieUser = { id: 2, roleType: "super_admin", store: 3 };
    renderWithClient(<AddRole />);
    expect(screen.getByText("page.role.scope.ownStore")).toBeInTheDocument();
  });
});

describe("RoleManagement", () => {
  const rows = [
    { ...storedRole, userCount: 4 },
    {
      id: 1,
      name: "Super Admin",
      roleType: "super_admin",
      store: null,
      status: "active",
      isSystem: true,
      userCount: 1
    }
  ];

  test("shows scope, user count and a system badge; search reaches the server", async () => {
    getAllRoleTable.mockResolvedValue({
      data: rows,
      pagination: { total: 2, totalPages: 1 },
      stats: { total: 2, active: 2, draft: 0, inactive: 0 }
    });
    renderWithClient(<RoleManagement />);
    const row = await screen.findByTestId("row-7");
    expect(within(row).getByText("4")).toBeInTheDocument();
    expect(within(row).getByText("page.role.type.admin")).toBeInTheDocument();
    expect(
      within(screen.getByTestId("row-1")).getByText("page.role.badge.system")
    ).toBeInTheDocument();
    expect(
      within(screen.getByTestId("row-1")).getByText("page.role.scope.global")
    ).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("page.globalSetting.roleManagement.search"), {
      target: { value: "kasir" }
    });
    await waitFor(() =>
      expect(getAllRoleTable).toHaveBeenLastCalledWith(
        expect.objectContaining({ search: "kasir", page: 1 })
      )
    );
    fireEvent.change(screen.getByLabelText("status-filter"), { target: { value: "draft" } });
    await waitFor(() =>
      expect(getAllRoleTable).toHaveBeenLastCalledWith(
        expect.objectContaining({ statusRole: "draft" })
      )
    );
  });

  const tableResponse = {
    data: rows,
    pagination: { total: 2, totalPages: 1 },
    stats: { total: 2, active: 2, draft: 0, inactive: 0 }
  };

  test("D4: deleting a role still in use explains it instead of deleting", async () => {
    getAllRoleTable.mockResolvedValue(tableResponse);
    renderWithClient(<RoleManagement />);
    const row = await screen.findByTestId("row-7");
    fireEvent.click(within(row).getByText("common.delete"));
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText("page.role.modal.inUseTitle")).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole("button"));
    expect(deleteRole).not.toHaveBeenCalled();
  });

  test("D2: a store-bound super admin gets no edit action on a built-in role", async () => {
    mockCookieUser = { id: 2, roleType: "super_admin", store: 3 };
    getAllRoleTable.mockResolvedValue(tableResponse);
    renderWithClient(<RoleManagement />);
    const systemRow = await screen.findByTestId("row-1");
    expect(within(systemRow).queryByText("common.edit")).not.toBeInTheDocument();
    expect(within(screen.getByTestId("row-7")).getByText("common.edit")).toBeInTheDocument();
  });
});

describe("EditRole built-in roles (D2)", () => {
  test("a store-bound super admin sees a locked editor", async () => {
    mockCookieUser = { id: 2, roleType: "super_admin", store: 3 };
    getRoleById.mockResolvedValue({ data: { ...storedRole, isSystem: true } });
    renderWithClient(<EditRole />);
    expect(await screen.findByText("page.role.edit.systemLocked")).toBeInTheDocument();
    expect(screen.getByText("page.role.edit.saveChanges").closest("button")).toBeDisabled();
  });

  test("the global super admin can edit a built-in role", async () => {
    getRoleById.mockResolvedValue({ data: { ...storedRole, isSystem: true } });
    renderWithClient(<EditRole />);
    expect(await screen.findByText("page.role.edit.systemHint")).toBeInTheDocument();
    expect(screen.getByText("page.role.edit.saveChanges").closest("button")).not.toBeDisabled();
  });

  test("R-11: saving an in-use active role as draft warns that it cannot be granted", async () => {
    getRoleById.mockResolvedValue({ data: { ...storedRole, userCount: 4 } });
    renderWithClient(<EditRole />);
    await screen.findByLabelText("Orders — page.role.action.delete");
    fireEvent.click(screen.getByText("common.saveAsDraft"));
    expect(await screen.findByText('page.role.edit.draftInUse:{"count":4}')).toBeInTheDocument();
  });
});
