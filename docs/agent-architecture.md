# Architecture Deep-Dive — How the App Actually Runs

The mental model an agent needs before touching cross-cutting code: provider tree, one request's full journey, how server/client state is organized, and how access control is layered. `AGENTS.md` §5 is the summary; this is the referenced-detail version. All file references are from repo root.

---

## 1. Runtime composition

Boot order (`index.html` → `src/index.jsx` → `src/App.jsx`):

1. `index.html` applies the stored theme class pre-mount (no FOUC).
2. `src/index.jsx` builds the provider tree, outermost first:
   `CookiesProvider` → `QueryClientProvider` → `StoreProvider` → `I18nextProvider` → `Toaster` → `SocketProvider` → `App`. Inside `React.StrictMode`. The service worker (`public/sw.js`) registers on window load.
3. `src/App.jsx` composes the router. `RootLayout` wraps everything: `OfflineIndicator`, lazy `SupportComponent`, `RouteProgress`, global keyboard shortcuts, `RegisterRequiredDialog`, deferred Sentry, `UnsavedChangesProvider` → `ErrorBoundary` → `Outlet`.
4. Route groups: `authRoutes` + `cashierRoutes` render standalone; everything else renders inside `<Route element={<DashboardLayout />}>` so sidebar/header persist across navigation (`src/App.jsx:94-122`).

## 2. One request's journey

```
page component
  └─ useQuery/useMutation (react-query v3)
       └─ service fn (src/services/<resource>.js)  ← throws Error(server message) on bad status
            └─ axiosInstance (src/services/index.js)
                 ├─ REQUEST interceptor
                 │    ├─ session ending? → CanceledError (nothing leaves the tab except logout revocation)
                 │    ├─ attach Authorization: Bearer <token cookie>
                 │    └─ store injection (decision table below)
                 └─ RESPONSE interceptor (errors only)
                      ├─ 401 (non-public) → endSession(EXPIRED) → full reload to login
                      ├─ 403 → one shared session probe (GET /auth/context, cached 10 s) —
                      │         probe 403 = account disabled/deleted → endSession
                      ├─ register-required error → RegisterRequiredDialog opens app-wide
                      └─ normalizeApiError(err) → err.message becomes a human-readable, localized string
```

Key consequences:

- **Services never toast and never redirect.** They throw; pages render the error. Interceptors own session/register handling globally.
- After `endSession`, everything in-flight is canceled and the tab reloads — `src/services/session.js` (`endSession`, `SESSION_COOKIES`, storage-key cleanup). A 401 mid-mutation means the mutation promise rejects with `CanceledError`; pages generally don't need special handling because the page is being replaced.
- Error text you can trust: `err?.response?.data?.message || err.message` (house pattern).

### Store-injection decision table (request interceptor, `src/services/index.js:13-98`)

| Caller | Store source | Injected when |
|---|---|---|
| super_admin | `activeStore` cookie | only if a store is picked **and** payload has no own store scope |
| everyone else | `user` cookie's `store` (fallback `activeStore`) | always (unless payload/URL already scoped, or `skipStoreInjection: true`) |

"Own store scope" = payload/params/URL contains `store`, `stores`, `storeId`, `storeIds`, `storePrices`, or `selectedStore`. Injection lands in GET params as `?store=`, in JSON bodies as `body.store`, in FormData as an appended field.

## 3. Response conventions

- Two envelopes; detect via `typeof body.success === "boolean"` (style A standard, style B only `POST /order/create` + `/order/quote`). Detail: `docs/api-response-contracts.md`.
- Two pagination styles: offsets `{ count, limit, offset }` vs `{ pagination: { total, page, limit, totalPages } }`.
- Money: integer rupiah. Dates: `YYYY-MM-DD`; model timestamps ISO-8601.
- Services return the full envelope; the `data` property is the payload.

## 4. Server state — React Query v3

- Client configured in `src/index.jsx:27-44`: `staleTime` 30 s, exponential backoff via `shouldRetryQuery` (`src/lib/query-retry.js`), `refetchOnWindowFocus/Reconnect: false`, **`refetchOnMount: "always"`** — remounting a list always refetches. Don't add per-query refetch flags without a reason.
- Global `MutationCache.onSuccess` → `markAllClean()` (unsaved-changes store).
- Query keys: factory in `src/queries/keys.js` (`qk`). Only genuinely shared/reference data has hooks there (`useLocations`, `useReportData`) with the `REFERENCE` policy (`staleTime` 5 min, `refetchOnMount: true`) from `src/queries/policies.js`. Page-scoped queries inline their own keys — match the exact key string when invalidating from a mutation.

## 5. Client state — Zustand inventory (`src/state/`)

| Store | Export | Persisted | Purpose |
|---|---|---|---|
| `theme.js` | `useThemeStore` | localStorage `app-theme` | Theme; applied pre-mount in `index.html` |
| `translation.js` | `translationSelect` | sessionStorage `translation` | Active language (default `id`); single source of truth — no browser detection |
| `checkout.js` | `checkout` | sessionStorage `checkout` | Receipt/checkout overlay data |
| `checkout-attempt.js` | `checkoutAttempts` | sessionStorage `checkout-attempt` | In-flight payment idempotency recovery; merges out orphaned in-flight keys on hydrate |
| `order-list.js` | `orderList` | sessionStorage `order-list` | Order list UI state |
| `invoice.js` | `invoice` | sessionStorage `invoice` | Invoice overlay data |
| `category.js` | `categorySelect` | sessionStorage `category` | Selected category filter |
| `tour.js` | `useTourStore` | localStorage `super-admin-tour` | Guided tour progress |
| `registerRequired.js` | `useRegisterRequiredStore` | — (memory) | Opens the app-wide "open cash register" dialog; driven by the response interceptor |

Rule of thumb: server state → react-query; ephemeral UI → plain component state; cross-page UI/session state → zustand with the same persistence tier as its siblings (session = per-tab, local = durable).

## 6. Routing & access control layers

1. **Route existence** — `src/routes/*.routes.jsx`, lazy per page.
2. **Menu visibility** — `src/utils/sidebar-menu.js` filtered by role permissions.
3. **Page access** — `src/utils/pageAccess.js`: `MATRIX_ACTIONS` (from the role-permission matrix in `src/page/role/rolePermissions.js`) + `SUBPAGES` map (detail/add/edit → parent menu + action). Landing pages (`/home`, `/dashboard-super-admin`) are never locked. Super admin bypasses menu permissions (`src/utils/role.js`).
4. **Role guard** — `src/components/ui/RequireRole.jsx` for pages restricted to roles rather than menu actions (e.g. accounting → super_admin).
5. **Action gating** — `hasMenuAccess`/`findMenuPermission` (`src/utils/permission.js`) for buttons.

All FE layers are UX gating; backend enforcement is partial.

## 7. Realtime

`src/services/socket.jsx`: the socket.io client is dynamic-imported (~40 KB gz kept out of the entry chunk), connects with **polling transport only**, and exposes `{ socket, connected, joinStore }`. Consumers must branch on `connected` — when false (including all of Vercel, which has no socket server), KDS/queue screens run their own polling. The socket joins per-store rooms (`join-store`); every session boundary is a full page load, so a stale-token socket never lingers.

## 8. Build-time injected globals

`vite.config.js` `define`:

| Global | Value | Used by |
|---|---|---|
| `__GIT_SHA__` | `git rev-parse --short HEAD` | i18n cache-buster; Sentry release `fe@<sha>` (`src/sentry.react.config.js`) |
| `__TRANSLATION_REV__` | MD5 of all four locale files | i18n cache-buster (changes on any locale edit, even uncommitted) |
| `__PUBLIC_REGISTRATION__` | `VITE_PUBLIC_REGISTRATION_ENABLED === "true"` | `/register` gating (DR-24 D-08) |

Plus `import.meta.env.VITE_BASE_URL` — `src/utils/endpoints.js` throws at import time when unset, so the app fails fast, not at first request.

## 9. i18n loading path

Flat keys (`keySeparator: false`), runtime-loaded from `/locales/{lng}/translation.json` only (`src/i18n/index.js`); `src/i18n/{en,id}.json` are mirrors used by tests and the rev hash, not by i18next. Full rules: `docs/agent-recipes.md` Recipe 5.
