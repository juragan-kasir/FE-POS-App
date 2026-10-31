# Agent Gotchas — Traps That Bite in This Repo

Each entry: the trap, why it happens (with file reference), and the correct move. Ordered roughly by how often they bite.

---

## 1. This is `react-query` v3, not `@tanstack/react-query`

The package is literally named `react-query` (v3). APIs differ from v4/v5 in ways that will silently misbehave if you write from muscle memory:

| You may reach for (v4/v5) | Actually exists here (v3) |
|---|---|
| `useQuery({ queryKey, queryFn })` object arg | `useQuery(key, fn, options)` positional |
| `cacheTime` | `cacheTime` (v4+ renamed it `gcTime` — that name does not exist here) |
| `isPending` | `isLoading` (v3 `isLoading` ≈ v5 `isPending` for queries) |
| `isLoading` (fetching, has data) | `isFetching` |
| `useMutation({ mutationFn, onSuccess })` object | `useMutation(fn, options)` positional |
| `queryClient.invalidateQueries({ queryKey })` | `queryClient.invalidateQueries(["key"])` array arg |
| default `refetchOnMount: true` | app sets `refetchOnMount: "always"` in `src/index.jsx:41` — remounting a list **always** refetches, even fresh cache |

The `MutationCache.onSuccess` global hook in `src/index.jsx:28` calls `markAllClean()` (clears the unsaved-changes dirty flag) after every successful mutation — that is why a successful save doesn't trigger the leave guard.

## 2. `queryFn` receives a context object — don't treat the first arg as your param

`react-query` v3 calls `queryFn(context)`. A service like `getAllLocation(status)` that is passed **directly** as the queryFn receives that object, not a string. The codebase guards it: `typeof status === "string" && status ? ...` (`src/services/location.js:7`) — the inline `ponytail:` comment says exactly this. If you write a new service used directly as a queryFn, either keep the defensive `typeof` check or wrap: `useQuery(key, () => getThing(param))`.

## 3. Don't add `store` to requests yourself — and don't strip the injection blindly

The axios request interceptor (`src/services/index.js:13-98`) injects store scope automatically:

- **super_admin**: `activeStore` cookie is injected into GET params (`?store=`) and mutation bodies — only when a store is explicitly picked, and only if the payload doesn't already carry its own store scope.
- **others**: their assigned store (`user` cookie's `store`, falling back to `activeStore`) is always injected.

The payload is considered "already scoped" if it contains any of: `store`, `stores`, `storeId`, `storeIds`, `storePrices`, `selectedStore` (or `store=`/`stores=` in the URL). Multi-store forms (product `storePrices`, expense `allStores`) rely on this — do not "helpfully" add a store field.

A page that has its own store (the cashier's `?store=`) must keep `activeStore` in sync, or every component that reads the cookie talks to another store — before FE #294 a super_admin selling at store B printed store A's receipt header and searched store A's members. Data that belongs to a record (an order's receipt) must read the record's store, not the cookie.

Per-request opt-out: `axiosInstance.put(url, body, { skipStoreInjection: true })` — required when the BE schema is strict and rejects unknown keys (documented example: `editStoreConfiguration`, `src/services/location.js:130`).

## 4. Two response envelopes — detect, don't assume

Style A `{ success, message, data }` vs style B `{ message?, data }` / `{ error, code }` (only `POST /order/create` and `POST /order/quote`). Services in this repo mostly just return the envelope and pages read `res.data`; when you handle errors generically, check `typeof body.success === "boolean"` first. Full detail: `docs/api-response-contracts.md`.

Also: services throw `Error` with the server message, and the response interceptor runs `normalizeApiError(err)` on every AxiosError — so `err.message` is already human-readable (never raw "Request failed with status code 500"). Prefer `err?.response?.data?.message || err.message` in UI code, which is the existing pattern.

## 5. Money is integer rupiah; dates are `YYYY-MM-DD`

No floats, no rounding at display time without checking the convention. Use `src/utils/formatter-currency.js` for display. Backend rejects non-integer `cashAmount`/`changeAmount` with 422 (`docs/api-response-contracts.md` §3.2). Aggregate report values may be 2-decimal and negative (`net` on balance-sheet rows).

## 6. Jest haste map breaks with nested worktrees

`modulePathIgnorePatterns` in `package.json` excludes `.worktrees/` and `.claude/worktrees/`. If a tool lands you in a nested worktree, Jest may fail with haste-map collisions or mysteriously not find tests. Per `RELEASING.md`, don't use nested worktrees for routine work — return to the main checkout. Keep those two ignore entries if you ever edit the Jest config.

## 7. Test environment stubs you must (and must not) provide

- Already in `jest.setup.cjs`: `TextEncoder`/`TextDecoder` polyfills, `Request` stub for React Router 7.
- You must still stub `ResizeObserver` (and any other observer a Radix primitive uses) in tests that render shadcn components — the copy-paste stub is in `src/tests/cashRegisterClosingBalance.test.jsx:40`.
- Mock `react-cookie`'s `useCookies` — many components read `user`/`activeStore` cookies during render; without the mock they get undefined and crash or mis-render.
- Run a single file with `npx jest src/tests/<name>.test.jsx`; the full `npm test` runs ~230 files.

## 8. Dev server serves stale translations

`__TRANSLATION_REV__` is computed when `vite.config.js` evaluates — i.e., at dev-server start. Edit a locale file on a server that has run for hours and browsers keep getting the old `translation.json` (key shows up raw). Restart `npm run dev` (production is fine: every deploy recomputes the hash). Details: `src/i18n/index.js`.

## 9. i18n keys are flat — dots are not nesting

`keySeparator: false` (`src/i18n/index.js:46`). `t("page.ingredientCategory.add.titleAdd")` looks up one literal flat key. Don't try nested objects in the JSON, and don't "fix" dots.

## 10. Don't fight the chunking

`manualChunks` in `vite.config.js` isolates **only** `lucide-react` into an `icons` chunk. A finer-grained split (recharts etc.) was tried and reverted: it made every page load recharts (423 KB) through cross-chunk symbol exports. Don't re-add per-vendor manual chunks. Lazy-load pages via `React.lazy` in route files instead — that is the sanctioned splitting mechanism.

Other deliberate build choices: sourcemaps off, Inter self-hosted via `@fontsource/inter`, Sentry deferred ~1.5 s + `requestIdleCallback` (errors before init are lost by design — don't "fix" that either; see the `ponytail:` comment in `src/App.jsx:55`).

## 11. "Ponytail" comments and DR-n codes are load-bearing

Non-obvious decisions are recorded inline as `// ponytail: …` comments (Indonesian/English mix) and as decision records referenced `DR-<n>`. Before changing code that has one of these comments, read it — it usually explains exactly the "bug" you are about to reintroduce. (`normalizeStoreId` store-configuration boundary, `refetchOnMount: "always"`, translation inlining, Sentry deferral — all examples from above.)

## 12. Leave guards and dirty tracking are wired globally

- Form pages must go through `useFormExit`/`useLeaveGuard` + `UnsavedChangesContext` (see Recipe 3 in `docs/agent-recipes.md`). Skipping it means a user with a dirty form navigates away silently.
- Any successful mutation marks all stores clean via the global `MutationCache.onSuccess` (`src/index.jsx:28`) — so a form that saves via `useMutation` is auto-cleaned; manual saves need `markAllClean()` from `src/lib/unsaved-changes-store.js`.

## 13. No Socket.IO server on Vercel

`src/services/socket.jsx` drives KDS/queue updates, but on Vercel there is no socket server — those screens fall back to polling. Never assume a live socket: code that depends on realtime pushes must also work when only polling exists, and tests must not require a socket connection.

## 14. `skipStoreInjection` vs FormData, and JSON-in-FormData

Multipart endpoints accept a JSON string in `body.data` (`docs/api-response-contracts.md` §2.3). `normalizePayload(data, { isFormData: true, jsonFields: ["items"] })` handles the common shapes (store arrays, JSON fields, file arrays). Use it instead of hand-building FormData.

## 15. A query keyed on search text must keep its previous data

`react-query` v3 starts every new key with `isLoading: true` and no data. If a page renders a skeleton for `isLoading` and the key includes the (debounced) search text, each search swaps the input itself for the skeleton: the field unmounts, loses focus, and keys typed after a pause (or the Enter that should add a product) go nowhere. Use `keepPreviousData: true` and show the skeleton only on the first load. When the key also includes a scope (store), tag the result with that scope and treat data of another scope as still loading, so a store switch never shows the previous store's rows — see `CashierPage.jsx` (`forStore`, FE #292).

## 16. Quick verification before you call anything done

```bash
npx prettier --write <files>   # formatting is an ESLint error, not a warning
npm run lint
npx jest src/tests/<relevant>.test.jsx
npm test                       # before pushing; CI also runs lint + full test + build
```
