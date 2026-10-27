# Agent Recipes — How to Do Common Tasks in This Repo

Step-by-step cookbooks for the tasks an AI agent is most often asked to do here. Each recipe names the exact files to touch and the patterns to copy. Read `AGENTS.md` first for the big picture; this file is the "how" to its "what" and "why".

Reference example pages to copy from (all verified patterns):
- Simple CRUD: `src/page/ingredient-category/` (`CategoryList`, `AddCategory`, `EditCategory`, `DetailCategory`)
- Larger list + mutation: `src/page/cash-register/CashRegisterHistory.jsx`
- Service layer example: `src/services/location.js`, `src/services/ingredientCategory.js`
- Query hook example: `src/queries/useLocations.js`
- Test example: `src/tests/cashRegisterClosingBalance.test.jsx`

---

## Recipe 1 — Add a new dashboard (sidebar) page

Touch points, in order:

1. **Create the page component** in `src/page/<feature-dir>/<PascalCase>.jsx`.
   - Feature dirs are kebab-case, component files PascalCase.
   - Use the `AddCategory.jsx` structure: `PageHeader` with breadcrumbs → content card (`bg-card rounded-xl shadow-sm border border-border p-6`) → action footer. Follow `layout.md` (the "Glass Ledger" design system) and the shadcn tokens.

2. **Register the route** in the matching `src/routes/<domain>.routes.jsx`:
   ```jsx
   const MyPage = React.lazy(() => import("@/page/my-feature/MyPage"));
   // inside the route group:
   <Route path="/my-page" element={<MyPage />} />
   ```
   Routes render inside `DashboardLayout` unless they are in `auth.routes.jsx` or `cashier.routes.jsx` (standalone). Do not wrap the element in `RequireRole` yourself unless the page is role-restricted (e.g. accounting uses `RequireRole roles={["super_admin"]}`) — page access is normally handled by `pageAccess.js`.

3. **Add the sidebar menu entry** in `src/utils/sidebar-menu.js` (`sidebarMenuSuperAdmin`). Entries look like:
   ```js
   { title: "...", i18nKey: "sidebar.<key>", href: "/my-page", icon: SomeLucideIcon, children: [], actions: ["view"] }
   ```
   - Icons come from `lucide-react` (already a forced single chunk — importing more icons is cheap).
   - `actions` declares the permission actions this menu supports (from the canonical list in `getMenuActions`, `src/utils/permission.js`: `view add edit delete import export approve print edit-points edit-access reset-password update-status`).

4. **Register the permission matrix entry** in `src/page/role/rolePermissions.js` (`getLeafItemsGrouped`) so the Role Management screen can grant it. Without this, `pageAccess.js` (`MATRIX_ACTIONS`) will not guard it — the page comment there says only menus the matrix offers are guarded.

5. **Map sub-pages in `src/utils/pageAccess.js`** `SUBPAGES` if you add `/add-…`, `/edit-…`, or `/detail-…` routes:
   ```js
   ["/add-my-thing", "/my-page", "add"]
   ```
   This is what lets `hasMenuAccess` deny a direct URL to a role without `add` permission.

6. **Add i18n keys** — see Recipe 5.

7. Run `npx prettier --write` on touched files, then `npm run lint`.

---

## Recipe 2 — Add a new API service + query hook

1. **Service** — create `src/services/<resource>.js` (or add to the existing one). Always use the shared instance:
   ```js
   import { axiosInstance } from ".";

   export const getAllThing = async () => {
     const { data, status } = await axiosInstance.get("/thing/get-all");
     if (status !== 200) throw Error(`${data?.message || data?.error || "Gagal memuat data"}`);
     return data;
   };
   ```
   Conventions to copy:
   - Named exports, one function per endpoint.
   - Check `status` explicitly and `throw Error(data?.message || data?.error)` — services throw, they never toast. The response interceptor already normalized the error message (`src/services/errorMessage.js`).
   - Return the whole envelope (`data`), not `data.data` — callers unwrap.
   - If the endpoint has a strict schema that rejects unknown keys (e.g. `editStoreConfiguration`), pass `{ skipStoreInjection: true }` as the axios config — otherwise the store interceptor will inject `store` and the BE may 400. See `src/services/location.js:130` for the documented example.
   - **Do not add a `store` param yourself** unless the endpoint is genuinely cross-store. The request interceptor injects it automatically (see `docs/agent-architecture.md` §2).

2. **Query hook** (for read data shared across components) — add `src/queries/useThings.js`:
   ```js
   import { useQuery } from "react-query";
   import { getAllThing } from "@/services/thing";
   import { qk } from "./keys";
   import { REFERENCE } from "./policies";

   export const useThings = (options = {}) =>
     useQuery(qk.things.all(), getAllThing, { ...REFERENCE, ...options });
   ```
   - Register `things` in `src/queries/keys.js` (`qk`). Every parameter that changes the response goes into the key.
   - Use the `REFERENCE` policy for rarely-changing data (stores, categories, tax, payment methods); operational lists use the app default (`refetchOnMount: "always"`).
   - Not everything needs a hook — pages still call `useQuery` inline for page-scoped data. Follow the existing density: hooks exist only for genuinely shared/reference data.

3. **Mutations** — in the component, not in `queries/`:
   ```js
   const mutation = useMutation(addThing, {
     onSuccess: () => {
       queryClient.invalidateQueries(["things"]); // must match the query key used by the list
       setShowSuccess(true);
     },
     onError: (err) => {
       setModalMessage(err?.response?.data?.message || err.message);
       setErrorModal(true);
     }
   });
   ```

---

## Recipe 3 — Add an add/edit form page

Copy `src/page/ingredient-category/AddCategory.jsx` — it is the canonical, compact implementation of all the house rules:

1. **Schema** — `zodResolver` + `react-hook-form`, `mode: "onChange"`. Error messages come from `t(...)`, so the schema is built inside the component.
2. **Edit mode via query param** — `useSearchParams()`, `?id=…` means edit; the detail query is `enabled: !!editId` and `form.reset(d)` in `onSuccess`.
3. **Payload** — build a plain object, trim strings, map booleans to status strings, then `normalizePayload(data, { isFormData: false })` (use `isFormData: true` + `jsonFields: [...]` when the endpoint expects multipart).
4. **Submit flow** — the save button does NOT submit the form directly. It runs `getMissingFields(values, formSchema, fieldLabels)` first (`src/lib/validation.js` + `MissingFieldsModal`), then opens a confirm modal, and only then calls `onSubmit(form.getValues())`. Keep this — it is the consistent UX across the app.
5. **After success** — `queryClient.invalidateQueries`, success `Modal`, navigate back to the list. Use `createdId(res)` (`src/utils/createdRecord.js`) to offer "view detail" of the created record.
6. **Leave guard** — `useFormExit("/list-path", () => setShowCancel(true), form)` from `src/hooks/useLeaveGuard.js` on cancel/back so the UnsavedChanges context warns on dirty exits.
7. **Loading** — `<Loading fullscreen />` while `mutation.isLoading || detailQuery.isLoading`. Error state renders `<AbortController refetch={refetch} />`.
8. **Limits** — `maxLength={FIELD_LIMITS.…}` from `src/constants/fieldLimits.js` on text inputs.

---

## Recipe 4 — Add a test

Tests live in `src/tests/`, named `<subject>.test.jsx` (centralized, not colocated). Run one file with:

```bash
npx jest src/tests/<name>.test.jsx
```

Standard preamble (copy from `src/tests/cashRegisterClosingBalance.test.jsx`):

```js
import React from "react";
import { render, screen, within } from "@testing-library/react";
import "@testing-library/jest-dom";
import { QueryClient, QueryClientProvider } from "react-query";
import { MemoryRouter } from "react-router-dom";

jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (k, opts) => (opts?.count != null ? `${k}:${opts.count}` : k) })
}));

jest.mock("react-cookie", () => ({
  useCookies: () => [{ activeStore: "1", user: { id: 1, roleType: "admin", store: 1 } }]
}));

jest.mock("@/services/<resource>", () => ({ getX: jest.fn() }));

globalThis.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
```

Notes:
- Always mock `react-i18next` (return the key from `t`) and `sonner`'s `toast` if the component calls it, and `react-cookie` as above — many components read `user`/`activeStore` cookies at render time.
- Mock every `@/services/*` module the component touches (`jest.mock("@/services/order", ...)`), and resolve mocked service promises with an envelope-shaped value (`{ data: [], pagination: {...} }`) matching what the component destructures.
- Stub `ResizeObserver` (and any other observer) when the component renders shadcn/Radix primitives.
- For route-state-dependent pages, mock `useLocation` to return `{ state: { item } }` with a module-level variable you can set per test.
- Wrap renders in `QueryClientProvider` + `MemoryRouter` when the component uses queries/router hooks.

`jest.setup.cjs` already polyfills `TextEncoder`/`TextDecoder` and stubs `Request` for React Router 7 under jsdom — don't re-add those.

---

## Recipe 5 — Add i18n strings

Runtime translations are **not bundled** (920 KB inline once blew the entry chunk to 921 KB and LCP to 8.3 s). The runtime catalog is `public/locales/{en,id}/translation.json`, loaded via `i18next-http-backend` (`src/i18n/index.js`). `src/i18n/{en,id}.json` are **mirror copies** of the same catalog — i18next never reads them; they exist (a) as input to the build-time `__TRANSLATION_REV__` hash in `vite.config.js`, and (b) as importable fixtures for parity tests.

Rules:
- **Add the key to all four files**: `public/locales/en/translation.json`, `public/locales/id/translation.json`, and the mirrors `src/i18n/en.json`, `src/i18n/id.json`. Tests assert mirror ↔ public equality for key subsets (e.g. `src/tests/cashRegisterVarianceLocaleKeys.test.js`), and stale mirrors skew `__TRANSLATION_REV__`.
- `en` and `id` are kept 100% parallel on purpose — `fallbackLng` is empty for them, so a missing key renders raw.
- Keys are **flat strings with dots** — `keySeparator: false`, so `t("page.ingredientCategory.add.titleAdd")` is one literal key, not nested lookup. The dot is only organizational.
- Dev cache-busting: `__TRANSLATION_REV__` is computed when the Vite config evaluates (server start), so a long-running dev server serves stale `translation.json` after you edit locale files — restart `npm run dev` (or hard-reload) when new keys show up raw.
- Default language is `id`; `translationSelect` (zustand, sessionStorage) is the single source of truth for the active language.

---

## Recipe 6 — Add a permission-gated action

1. Sidebar/menu visibility: entry `actions` array in `sidebar-menu.js`.
2. Role matrix: `getLeafItemsGrouped()` in `src/page/role/rolePermissions.js`.
3. Button-level gating in a component: `hasMenuAccess(user, href, actions)` (boolean over the whole menu grant, super-admin-aware) or `canAccess(user, menuKey, action)` (one action, accepts both `add`/`create` vocabularies) from `src/utils/permission.js`. Note: the `accessMenu` grant is stripped from the `user` cookie (4 KB limit) — these helpers fall back to the full `user` object in sessionStorage, so read access through them, never by parsing the cookie yourself.
4. Role-only (not menu) restriction: wrap the route element in `RequireRole` from `src/components/ui/RequireRole.jsx`.

Remember: FE gating is UX-only — the backend partially enforces. Never widen access to make something "work"; flag the gap.
