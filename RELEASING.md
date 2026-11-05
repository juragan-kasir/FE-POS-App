# Release Runbook — FE-POS-App

This repo does **not** deploy via GitHub Actions. Disabling that no-op `deploy`
job removed a fake release gate; the real release flow is the Vercel Git
integration below.

## Release flow

1. **Push / open a PR** against `master`. CI (`.github/workflows/ci.yml`)
   runs `lint`, `jest`, and a production `build` (with
   `VITE_BASE_URL=https://api-bisa-nota.vercel.app`).
2. **Wait for CI checks to PASS.** Nothing goes out otherwise.
3. **Merge the PR to `master`.** The Vercel Git integration detects the push
   and runs a production build + deployment automatically (project settings →
   Git integration → Production branch `master`).
4. **Post-deploy health check** (production):
   - Load the app URL (Vercel deployment, e.g. the project's production
     domain) and confirm the homepage renders at `/` and login at `/login`.
5. **Smoke test** the critical flow: log in → open the cashier screen → place
   an order → Kitchen Display shows it → settle the payment.
   - Also verify the API is reachable: `curl -I https://api-bisa-nota.vercel.app`
     should return a live response (that is the separate backend repo).

## Prerequisites on the platform

- Production env var `VITE_BASE_URL` must be set in the Vercel project
  (e.g. `https://api-bisa-nota.vercel.app`).
- Only merge to `master` after CI is green; the Vercel deployment is its own
  gate and can be rolled back from the Vercel dashboard if needed.

## Fix workflow (routine fixes)

1. Start in the main repository checkout with a verified, up-to-date `master`
   baseline: `git fetch origin`, confirm `origin/master` is the intended
   baseline, and fast-forward-only when appropriate. Never assume the tree
   is clean.
2. Create or use a dedicated feature branch for implementation. Never commit
   directly to `master`.
3. Do not use nested worktrees (`.worktrees/`, `.claude/worktrees/`) for
   routine fixes. If a tool unexpectedly starts work in one, stop, return to
   the main checkout, and preserve existing worktrees unless separately
   authorized to modify them.
4. Before editing, inspect `git status`, `git stash list`, untracked files,
   and relevant local work. Never overwrite or delete unrelated work.
5. Keep scope explicit, stage only intended paths with
   `git add -- <path>`, and run `git diff --check`.
6. Push only the intended feature branch and follow the PR process above.
   Never force-push.
7. Distinguish local test results from remote CI results. After a merge,
   fetch and verify that `origin/master` contains the merged change.

### Jest worktree notes

- Keep `modulePathIgnorePatterns` coverage for `/node_modules/`,
  `/.worktrees/`, and `.claude/worktrees/` so nested worktrees do not create
  Jest haste-map collisions. `testPathIgnorePatterns` alone is not a
  substitute for excluding these directories from module discovery.
- Follow the project's UI/UX Pro Max skill/standards before implementing UI
  changes.