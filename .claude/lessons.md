# Lessons

- [i18n] `t` from useTranslation keeps its identity when the http backend finishes loading — a useMemo snapshot of t() calls with `[t]` deps freezes raw keys after a full reload; always include `ready` in the deps (or call t() inline). (2026-10-28)
- [workflow] A bug report about "copywriting X" usually means the raw key X is rendering (translation resolution failure) — fix resolution, never delete the copy. (2026-10-28)
- [components] Hide a store filter by returning null at the label-and-control wrapper (`StoreFilterField`), not only inside `StoreFilter` — the page-owned label otherwise stays visible for single-store users. (2026-10-29)
- [components] A `TableToolbar` filter wrapper still takes a `flex-1` slot when its child renders null; add `empty:hidden` so hiding the store filter also collapses its empty grid column. (2026-10-30)
- [auth] Remember-me spans cookie expiry, a localStorage user copy, and a root-route redirect — sessionStorage is empty after a browser restart and `/` always renders LoginPage. (2026-10-30)
- [components] Icon-only delete buttons use variant="ghost" + text-destructive, not variant="destructive" — the destructive variant paints a red icon on a red background (hit in product, GR, supplier and promo forms). (2026-10-31)
