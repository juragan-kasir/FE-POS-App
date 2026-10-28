# AGENTS.md — FE-POS-App ("Bisa Nota" / "Juragan Kasir")

Guidance for AI coding agents working in this repository. The reader is assumed to know nothing about the project.

## 1. Project overview

Frontend of **Bisa Nota / Juragan Kasir**, a multi-store Point of Sale (POS) web application for restaurants/retail (Indonesian market; the UI language default is Indonesian). It is a React 18 single-page app built with Vite 7, styled with Tailwind CSS 3 + shadcn/ui (Radix primitives), and talks to a separate backend repo (`BE-POS-App`) over HTTPS via Axios.

Major feature domains: cashier terminal (POS), kitchen display system (KDS), customer self-order via QR, customer display, split bill, thermal printing (ESC/POS over Bluetooth), inventory (stock, opname, transfer, adjustment), procurement (purchase orders, goods receipt, returns), production orders (BOM/recipes), HR (employees, shifts, attendance, overtime, business trips), members/loyalty, finance (cash register, expenses, AR/AP, tax), and a large reporting suite. Multi-store ("location") support with a Super Admin switcher is central to the whole app.

- Live demo: `https://bisa-nota-demo.vercel.app` (deployed on Vercel, production branch `master`)
- Backend API: `https://api-bisa-nota.vercel.app`
- This is plain **JavaScript (JSX)** — no TypeScript anywhere.

## 2. Key commands

```bash
npm install          # install deps (npm ci in CI/Docker)
npm run dev          # dev server on http://localhost:3000 (vite --force)
npm run build        # production build → dist/
npm run preview      # preview the production build
npm run lint         # ESLint (errors include Prettier violations — see §6)
npm test             # Jest (jsdom), ~230 test files in src/tests/
```

Node.js 18+ required (CI builds on Node 20 and 22).

## 3. Environment variables

Create `.env` from `.env.example`. All vars are `VITE_*` and are **inlined at build time** — changing one requires a rebuild/redeploy (and a Docker image rebuild when using Docker).

| Variable | Required | Notes |
|---|---|---|
| `VITE_BASE_URL` | yes | Backend API base URL. `src/utils/endpoints.js` **throws at import time** if unset. |
| `VITE_ORDER_APP_URL` | no | Base URL of the customer self-order app (BISA-MAKAN-APP) embedded in table QR codes; defaults to `https://order-app-dun.vercel.app`. |
| `VITE_PUBLIC_REGISTRATION_ENABLED` | no | Build-time flag (`define: __PUBLIC_REGISTRATION__`); when not `"true"`, `/register` redirects to login. The backend has its own switch. |

Production values are set in the Vercel project settings.

## 4. Repository layout (`src/`)

| Path | Contents |
|---|---|
| `App.jsx` / `index.jsx` | Entry point. Root router (`createBrowserRouter`), global providers (React Query, i18next, Cookies, Socket, Store, Toaster), service worker registration. |
| `routes/` | Route groups per domain (`auth.routes.jsx`, `cashier.routes.jsx`, `inventory.routes.jsx`, …) exported from `routes/index.jsx`. Pages are `React.lazy`-loaded; route groups render inside `DashboardLayout` (sidebar + header) or standalone. |
| `page/` | 65+ feature folders, 220+ page components (e.g. `page/cashier/CashierPage`). |
| `components/ui/` | shadcn/ui base components (`button.jsx`, `table.jsx`, `dialog.jsx`, …). New primitives follow this directory and its naming (kebab-case files). |
| `components/layout/` | `DashboardLayout`, `Sidebar`, `Header`, `CommandPalette` (Cmd+K). |
| `components/organism/` | Complex feature components (modals, guided tour, FAQ chat, Sentry initializer, support widget). |
| `components/dashboard*`, `report/`, `receipt/`, `document/` | Domain-specific composite components. |
| `services/` | **The API layer.** ~70 files, one per backend resource (`product.js`, `order.js`, …). All HTTP goes through the shared Axios instance in `services/index.js`. |
| `queries/` | React Query v3 hooks (`useLocations.js`, …) with a query-key factory (`keys.js`) and shared policies (`policies.js`). Use these instead of calling services directly from components where a hook exists. |
| `state/` | Zustand stores (`theme`, `checkout`, `order-list`, `translation`, `tour`, …); several are persisted to local/session storage. |
| `contexts/` | React contexts (`StoreContext`, `UnsavedChangesContext`). |
| `hooks/` | Shared custom hooks (`useDebounce`, `useKeyboardShortcuts`, `useUnsavedChanges`, …). |
| `lib/` | Domain logic helpers (`payload-normalizer.js`, `recipe-costing.js`, `store-lifecycle.js`, `validation.js`, `utils.js` — includes the `cn()` Tailwind class merger). |
| `utils/` | Cross-cutting utilities (`permission.js`, `sidebar-menu.js`, `pageAccess.js`, `cookies.js`, `endpoints.js`, `formatter-currency.js`, …). |
| `constants/` | Small shared constants (`fieldLimits.js`, `shiftTypes.js`). |
| `i18n/` | i18next setup + bundled `en.json`/`id.json`. Runtime translations are also fetched from `public/locales/{en,id}/translation.json` (cache-busted by `__TRANSLATION_REV__`, computed from an MD5 of all four locale files at build time in `vite.config.js`). Default language: `id`. |
| `tests/` | All Jest tests live here (centralized, not colocated), named `*.test.js(x)`. |

Root config files: `vite.config.js`, `tailwind.config.js`, `postcss.config.js`, `eslint.config.mjs`, `jsconfig.json` (only defines the `@/* → src/*` path alias), `components.json` (shadcn/ui config), `jest.setup.cjs` + `babel.jest.config.cjs` + `jest.transform.cjs`, `vercel.json`, `Dockerfile` + `docker-build.sh` + `nginx.conf` (alternative Docker deployment).

## 5. Architecture notes that matter

- **Axios instance (`src/services/index.js`)** — never create ad-hoc Axios clients. The instance's interceptors handle: `Authorization: Bearer <token>` from the session cookie; **automatic store injection** (super_admin gets the `activeStore` cookie injected into GET params/mutation bodies unless the payload already carries its own store scope; non-super-admins always get their store; per-request opt-out via `skipStoreInjection: true` on the Axios config); request cancellation once the session is ending (`CanceledError`, except the logout revocation itself); and "register required" detection. `src/services/errorMessage.js` (`normalizeApiError`) turns API errors into readable messages — use it instead of rendering raw API error bodies.
- **Two API response envelope styles** (documented in `docs/api-response-contracts.md`): style A `{ success, message, data }` (most endpoints) and style B `{ message?, data }` / `{ error, code }` (`POST /order/create`, `POST /order/quote`). Detect by checking `typeof body.success === "boolean"`. Money is integer rupiah; dates are `YYYY-MM-DD`.
- **RBAC**: four roles — `super_admin`, `admin`, `kasir`, `user`. Sidebar items (`src/utils/sidebar-menu.js`), page access (`src/utils/pageAccess.js`), and per-button actions (`src/utils/permission.js`) are all permission-gated; routes use `components/ui/RequireRole.jsx`. Menu enforcement is only partial on the backend, so keep FE-side gating intact when adding screens.
- **Real-time**: Socket.IO client (`src/services/socket.jsx`) drives KDS/queue updates. There is **no Socket.IO server on Vercel** — KDS/queue fall back to polling there. Don't assume a persistent socket connection exists.
- **Performance conventions**: pages and heavy libs are lazy-loaded per route; Sentry is deferred until after page idle (~1.5 s + `requestIdleCallback`) to protect LCP; `lucide-react` is forced into a single `icons` chunk via `manualChunks` (a finer-grained manual chunking was tried and reverted — it made every page load recharts); Inter font is self-hosted via `@fontsource/inter` (no Google Fonts request chain); sourcemaps are disabled in builds.
- **Offline**: `public/sw.js` caches the static shell plus a few read APIs, but there is intentionally **no offline mode** (decision record DR-25): the `OfflineIndicator` warns that saves/payments/prints are blocked; nothing is queued or synced.
- **PWA-ish**: `manifest.json`, icons, theme handling. The stored theme is applied pre-React-mount in `index.html` to avoid FOUC.

## 6. Code style

- **Formatting = Prettier, enforced as an ESLint error** (`eslint-plugin-prettier`). Config (`.prettierrc`): semicolons, 2-space indent, `printWidth: 100`, double quotes, `trailingComma: "none"`, `bracketSameLine: true`. Run `npx prettier --write <files>` rather than hand-formatting.
- ESLint flat config (`eslint.config.mjs`): `eslint:recommended` + `eslint-plugin-react` recommended + Prettier; `react/prop-types` is **off** (PropTypes are not enforced), `react/react-in-jsx-scope` off. `npm run lint` covers `src/`.
- Conventions seen throughout: named exports for services/utils (`export const getAllX = async () => …`), kebab-case file names (`stock-transfer.js`, `date-picker.jsx`, page dirs kebab-case with PascalCase component files), `@/` import alias, `date-fns` for dates, `sonner` for toasts, `react-hook-form` + `zod` for forms, `zustand` for client state, `react-query` v3 (the package is literally named `react-query`, not `@tanstack/react-query`) for server state.
- Comments in the codebase are a mix of English and Indonesian; both are normal here. Many non-obvious decisions are recorded in inline "ponytail:" comments and in decision records referenced as `DR-<n>` — read nearby comments before "fixing" seemingly odd code.
- **UI work**: follow the project's design system in `layout.md` ("The Glass Ledger": bento-grid dashboards, glass chrome, fixed shell) and the shadcn/ui + Tailwind token setup in `src/index.css` (CSS variables, dark mode via `dark` class). The repo ships project-local design skills under `.claude/skills/` (notably `ui-ux-pro-max`); `RELEASING.md` instructs contributors to follow that skill's standards for UI changes.

## 7. Testing

- Jest 30 + `jest-environment-jsdom` + React Testing Library, wired via `jest.transform.cjs` → `babel.jest.config.cjs` (`@babel/preset-env`, classic-runtime `@babel/preset-react`). `jest.setup.cjs` polyfills `TextEncoder`/`TextDecoder` and stubs `Request` for React Router 7 under jsdom.
- Tests are centralized in `src/tests/`, named `*.test.js(x)`. Typical pattern: mock `react-i18next` (return the key from `t`), mock `sonner`'s `toast`, mock `react-cookie`, and `jest.mock("@/services/<resource>")` per service the component touches.
- The `@/` alias is mapped in the Jest `moduleNameMapper`; `modulePathIgnorePatterns` excludes `node_modules`, `.worktrees/`, and `.claude/worktrees/` (keep those entries — nested worktrees otherwise break Jest's haste map).
- Before pushing, run `npm run lint` and `npm test` locally (CI also runs them — see below).

## 8. CI, release, and deployment

- **CI**: `.github/workflows/ci.yml` runs on push/PR to `master`: lint + Jest on Node 20 & 22, then a production build on Node 22 (with `VITE_BASE_URL` set) that uploads `dist/` as an artifact. (README notes GitHub Actions may be disabled at the organisation level — run the checks locally before pushing regardless.)
- **Deploy**: **not** done by GitHub Actions. Merging to `master` triggers the **Vercel Git integration** build + deploy. `vercel.json` sets SPA rewrites to `/index.html` and disables caching for `/locales/*`. Full runbook (incl. post-deploy smoke test: login → cashier → order → KDS → payment) is in `RELEASING.md`.
- **Docker (alternative)**: multi-stage `Dockerfile` (Node 22 build → nginx 1.27 serve). `./docker-build.sh` builds and runs the container on `http://localhost:3000`, passing `VITE_*` as build args and verifying the API URL is baked into the bundle. Remember `VITE_*` values are frozen at image build time.
- Releases are tagged implicitly via Sentry: `vite.config.js` injects `__GIT_SHA__` at build time and `src/sentry.react.config.js` sets the release to `fe@<sha>`, so errors can be tied to a deploy.

## 9. Git & workflow conventions (from `RELEASING.md`)

- Never commit directly to `master`; work on feature branches and open PRs. Never force-push.
- Start from a verified, up-to-date `master` (`git fetch origin`); check `git status`, `git stash list`, and untracked files before editing; don't overwrite unrelated work.
- Stage only intended paths (`git add -- <path>`), run `git diff --check`.
- Do **not** use nested worktrees (`.worktrees/`, `.claude/worktrees/`) for routine fixes; if a tool lands you in one, return to the main checkout.
- After a merge, fetch and confirm `origin/master` actually contains the change; distinguish local test results from remote CI results.

## 10. Security considerations

- Auth token and user/active-store context live in cookies and are attached by the Axios interceptor — do not log or persist them elsewhere.
- `.env` files are git-ignored; only `.env.example` is committed. Never commit real tokens/URLs into locale JSON, tests, or docs.
- XSS hygiene: avoid `dangerouslySetInnerHTML`; the app renders user/business data (names, addresses, receipt footers) throughout. `xlsx` is pinned to a SheetJS CDN tarball (`0.20.2`) — keep that pinned URL intact when updating dependencies.
- Input validation is zod-based on the FE, but the backend is the source of truth; `src/constants/fieldLimits.js` mirrors FE-side length limits.
- Permission checks in the FE are UX gating only (backend enforcement is partial); do not present sensitive actions to roles that shouldn't have them, and flag gaps rather than widening access.

## 11. Reference docs in this repo

- `README.md` — feature catalog and full route table.
- `RELEASING.md` — release runbook and git workflow.
- `docs/backend-api-reference.md` — (Indonesian) maps every `src/services/*` call to its backend endpoint; the BE repo is the source of truth on mismatch.
- `docs/api-response-contracts.md` — (Indonesian) response envelopes, error codes, and data shapes the FE must rely on.
- `docs/agent-recipes.md` — agent cookbooks: add a page / service+query hook / form / test / i18n keys / permission, with the exact files to touch.
- `docs/agent-gotchas.md` — traps that bite here (react-query v3 API, queryFn context arg, store injection rules, Jest/jsdom stubs, chunking decisions, "ponytail" comments).
- `docs/agent-architecture.md` — runtime deep-dive: provider tree, full request journey through the axios interceptors, Zustand store inventory, access-control layers, build-time globals.
- `PANDUAN-SUPER-ADMIN.md` — (Indonesian) business-level super admin guide with status/state machines per feature.
- `layout.md` — the layout design system for UI work.

## 12. Repo owner workflow preferences

These rules override generic defaults. When a rule here conflicts with a habit, follow the rule.

### 12.1 Operating mode

- Act, don't ask, on small reversible edits (copy, locale keys, styling, single-component UI changes, config tweaks). Make the change, then report.
- Ask before acting only when the change is:
  - irreversible or wide-reaching (deleting files, renaming shared modules, dependency changes, git history rewrites);
  - ambiguous, with two reasonable readings that would produce different code;
  - a change to a shared contract used elsewhere (API payload shape, Redux state shape, route paths, design-system component props).
- Before editing, read the target file and its direct imports. Understand the existing pattern before adding to it.
- Do not add new dependencies without asking.

### 12.2 Verification (tests are off by default)

- Do not write or run tests unless the owner explicitly asks.
- Instead, run the cheapest checks that prove the change works:
  - Prettier and ESLint on every touched file;
  - JSON parse on edited locale/config files;
  - a build (`vite build`) when files were moved, renamed, or exports changed.
- Never leave existing tests broken. If you rename or remove an export or change a function signature, search the test files for it and update the references (no new test cases).
- Before reporting, self-review the diff against §12.3. Fix what fails; don't report it as a to-do.
- In the report, state: `Tests: skipped (§12)`, which checks ran, and any high-risk areas the owner should eyeball manually: money/amount formatting, auth and permissions, transaction flows, data shown to end users.

### 12.3 Code standards (senior level)

**No comments**
- Write no comments in new code: no explanatory, rationale, TODO, or "changed this because" comments. The code must explain itself through names and structure; reasoning goes in the reply, PR description, or docs.
- Leave pre-existing comments (including "ponytail" notes) untouched.

**Size and responsibility**
- One function or component = one job. If you need "and" to describe it, split it.
- Soft limits: functions ~30 lines, components ~150 lines. Over the limit means extract.
- Move non-trivial state logic out of components into custom hooks (`useX`).

**Reuse before writing (DRY)**
- Before writing any helper, search `src/lib`, `src/utils`, `src/constants`, `src/hooks`, and existing components. Reuse or extend what exists.
- Never hand-roll a UI primitive the BN design system already provides.
- If the same logic appears twice, extract it on the second occurrence.

**No magic values**
- No magic strings or numbers. Use named constants in `src/constants/<domain>.js`.
- Allowed literals: `0`, `1`, `-1`, `''`, `true`/`false`, and array indexes.
- User-facing text always goes through locale keys, including Yup validation messages.

**Naming**
- Names say what, not how: `activeAccounts`, not `filteredData`.
- Booleans: `is`/`has`/`should`/`can`. Handlers: `handleX`; props receiving them: `onX`. Selectors: `selectX`. Hooks: `useX`.
- No abbreviations except widely known ones (`id`, `url`, `api`).

**Control flow**
- Early returns and guard clauses over nesting. Max two levels of nesting.
- No nested ternaries. No `else` after `return`.
- Prefer lookup maps over long `if/else` or `switch` chains.

**React**
- Don't store derived state; compute it during render.
- No `useEffect` for data transformation or syncing state from props; use it only for real side effects.
- Memoize (`useMemo`, `useCallback`, `React.memo`) only for expensive work or stable references passed to memoized children, not by default.
- Stable, unique keys; never array index for lists that can reorder or change.

**Redux Toolkit / Formik / Yup**
- Follow the existing slice pattern (`createSlice`, colocated selectors, existing async pattern). Keep the store serializable.
- Yup schemas live in their own module next to the form, not inline in the component.

**Data and errors**
- Pure helpers, immutable updates, no side effects during render.
- No silent `catch`. Route errors through the project's existing error-handling pattern.

**Consistency and scope**
- Match the conventions already in the file over personal preference. Consistency beats cleverness.
- Refactor adjacent code toward these standards only where you touch it. Don't rewrite unrelated parts of a file, and keep refactors distinguishable from the feature change in the report.

### 12.4 Continuous learning (get smarter every session)

Lessons live in `.claude/lessons.md`. This is how mistakes stop repeating.

- **Read** `.claude/lessons.md` at the start of every task, before planning.
- **Write** a lesson when:
  - the owner corrects you or rejects a change;
  - you discover a non-obvious repo convention, pitfall, or helper that would have saved time;
  - a check fails for a reason that will recur.
- **Format**, one line each, grouped by area:
  `- [area] Do X, not Y — because Z. (YYYY-MM-DD)`
- Record only reusable rules, never one-off task details.
- Before adding, check for an existing lesson on the same point. Update it instead of duplicating.
- **Prune:** keep the file under ~60 lines. Merge overlaps and delete lessons that no longer apply.
- **Promote:** when a lesson has been applied three or more times or is clearly a hard rule, propose moving it into this steering file. Ask before editing the steering file.
- End every task report with `Lesson logged: …` or `Lesson logged: none`.

### 12.5 Report format

Keep it short:

1. **Changed:** files touched, one line each.
2. **Why:** the reasoning that would otherwise have been code comments.
3. **Checks:** what ran and the result. `Tests: skipped (§12)`.
4. **Eyeball:** high-risk areas for manual review, if any.
5. **Lesson logged:** the new or updated lesson, or `none`.
