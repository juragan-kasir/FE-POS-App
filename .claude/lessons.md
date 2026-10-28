# Lessons

- [i18n] `t` from useTranslation keeps its identity when the http backend finishes loading — a useMemo snapshot of t() calls with `[t]` deps freezes raw keys after a full reload; always include `ready` in the deps (or call t() inline). (2026-10-28)
- [workflow] A bug report about "copywriting X" usually means the raw key X is rendering (translation resolution failure) — fix resolution, never delete the copy. (2026-10-28)
