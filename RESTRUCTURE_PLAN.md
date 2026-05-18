# File System Restructure Plan
## Hysteria2 C2 Advanced Panel

| Field | Value |
|-------|-------|
| **Original scope** | ~700+ source files, 239 TS files in `lib/` |
| **Target** | PNPM monorepo with domain packages + `apps/web` |
| **Status** | **Phase 4 partial — dev app running, cutover incomplete** |
| **Last updated** | 2026-05-15 |

**Related docs:** `RESTRUCTURE_QUICKSTART.md`, `MIGRATION_GUIDE.md`, `MIGRATION_COMPLETE.md`

---

## Implementation Status (Executive)

### Done

| Area | Status | Notes |
|------|--------|-------|
| PNPM workspace | ✅ | `pnpm-workspace.yaml`, root `package.json`, `turbo.json` |
| Package scaffolding | ✅ | `@c2panel/{shared,infrastructure,ai,c2,security,osint,ui,core}` |
| `apps/web` | ✅ | Next.js 16 app copied; routes under `apps/web/app/` |
| Bulk copy `lib/` → packages | ✅ | ~327 TS files under `packages/` (copied, not fully decoupled) |
| Bulk copy `components/` → `packages/ui` | ✅ | UI package populated |
| `apps/web` → `@c2panel/*` imports | ✅ | ~120+ route/page files migrated |
| Dev bridge (symlinks) | ✅ | `apps/web/app/lib` → `../../../lib`, `components/*` → repo `components/` |
| Webpack aliases | ✅ | Directory-level `@c2panel/*` + `@` → `apps/web/app` in `next.config.js` |
| Infrastructure bridges | ✅ | `packages/infrastructure/src/mailer` → `lib/mailer`, `rate-limiter.ts` symlinked |
| Local dev verified | ✅ | `/` and `/login` return **200** with `pnpm next dev --webpack` |

### Not done (cutover backlog)

| Area | Status | Notes |
|------|--------|-------|
| Remove root `app/`, `lib/`, `components/` | ❌ | Still canonical for workflow routes + `@/lib` consumers |
| `apps/web` workflow/auth routes | ⏳ | ~36 API files still import `@/lib/workflow/*`, `@/lib/auth/*` |
| Package-internal `@/lib/` imports | ⏳ | ~55 files in `packages/*` still reference `@/lib/` |
| Physical move `lib/mailer/` | ⏳ | Symlinked into infrastructure, not copied |
| `packages/core` domain layer | ❌ | Scaffold only |
| UI atomic design (atoms/molecules) | ❌ | Flat `components/` structure kept |
| `services/mailer` consolidation | ⏳ | `services/mailer/` exists; legacy `mailer-service/` may remain |
| Package `tsc` / `turbo build` green | ❌ | `ignoreBuildErrors: true` on web; packages need TS fixes |
| Production build from monorepo root | ⏳ | Not verified end-to-end |
| Test co-location per package | ❌ | Tests still under root `tests/` |
| Prisma schema split | ❌ | Single `prisma/` at repo root |
| `deployments/` / `docs/` reorg | ❌ | Future phases |

### Import strategy (current hybrid)

```
apps/web/app/
├── api/...          → mix of @c2panel/* (migrated) and @/lib/* (workflow, auth, secrets)
├── admin/...        → mostly @c2panel/* + @/components/* (symlinked)
├── lib/             → symlink → ../../../lib  (repo root)
└── components/      → symlinks → ../../../../components/*

packages/*/src/      → @c2panel/* between packages; ~55 files still use @/lib/* internally
```

**Rule until cutover finishes:** Do not delete root `lib/` or `components/` until zero imports reference them and `turbo build` passes.

---

## Executive Summary

### Original issues

1. **Lib folder bloat** — 239 TypeScript files in a flat-ish structure
2. **Inconsistent naming** — Mixed kebab-case, camelCase, PascalCase
3. **Scattered domains** — C2, AI, ops, infra logic spread everywhere
4. **Duplicate concerns** — Multiple config directories, deployment folders
5. **No clear boundaries** — Business logic mixed with UI components
6. **Test sprawl** — Tests scattered, naming inconsistent
7. **Missing abstractions** — No clear layered architecture

### Restructure goals

1. **Domain-Driven Design (DDD)** — Clear bounded contexts
2. **Feature-based organization** — Co-locate related code
3. **Clean architecture** — Separate concerns (data / domain / UI)
4. **Monorepo-ready** — Package splitting with Turborepo
5. **Developer experience** — Predictable file locations

---

## As-Built Structure (2026-05-15)

```
blackboxai-hysteria2-sonner-1/
├── apps/
│   └── web/                          # @c2panel/web — primary Next.js app
│       ├── app/
│       │   ├── (auth)/, admin/, api/, track/
│       │   ├── lib/                  # SYMLINK → ../../../lib
│       │   └── components/           # SYMLINKS → ../../../../components/*
│       ├── public/
│       ├── next.config.js            # webpack aliases + outputFileTracingRoot
│       ├── tsconfig.json             # "@/*" → "./app/*"
│       └── package.json
│
├── packages/
│   ├── shared/                       # @c2panel/shared
│   ├── infrastructure/               # @c2panel/infrastructure (+ mailer symlink)
│   ├── ai/                           # @c2panel/ai (+ agents/grok for @c2panel/grok)
│   ├── c2/                           # @c2panel/c2
│   ├── security/                     # @c2panel/security
│   ├── osint/                        # @c2panel/osint
│   ├── ui/                           # @c2panel/ui (copy of components/)
│   └── core/                         # @c2panel/core (scaffold)
│
├── services/
│   └── mailer/                       # Standalone mailer (Go/config)
│
├── lib/                              # LEGACY — still source of truth for many modules
├── components/                       # LEGACY — symlinked into apps/web
├── app/                              # LEGACY — root Next app (duplicate of apps/web)
├── prisma/                           # Database schema (unchanged location)
├── tests/                            # Root-level tests (unchanged)
├── pnpm-workspace.yaml
├── turbo.json
└── package.json
```

---

## Phase 1: Target Directory Structure

*(Target end state — partially implemented; see As-Built above for current reality.)*

```
blackboxai-hysteria2-sonner-1/
├── .github/
├── .husky/
├── .vscode/
│
├── apps/
│   └── web/
│       ├── app/
│       │   ├── (auth)/
│       │   ├── (dashboard)/          # Planned: wrap admin + track
│       │   │   ├── admin/
│       │   │   └── track/
│       │   └── api/
│       ├── public/
│       └── middleware.ts
│
├── packages/
│   ├── core/
│   ├── infrastructure/
│   ├── ai/
│   ├── c2/
│   ├── osint/
│   ├── security/
│   ├── ui/
│   └── shared/
│
├── services/
│   └── mailer/
│
├── prisma/
├── deployments/
├── docs/
├── tests/
├── scripts/
├── config/
├── package.json
├── pnpm-workspace.yaml
└── turbo.json
```

---

## Phase 2: File Migration Mapping

### 2.1 Lib folder breakdown

| Current location | Target location | Copy status | Import cleanup |
|-----------------|-----------------|-------------|----------------|
| `lib/ai/` | `packages/ai/src/` | ✅ Copied | ⏳ ~30 `@/lib/` refs in package |
| `lib/grok/` | `packages/ai/src/agents/grok/` | ✅ Copied | ✅ `@c2panel/grok` alias in web |
| `lib/c2/`, `lib/hysteria/`, `lib/payloads/` | `packages/c2/src/` | ✅ Copied | ⏳ Internal `@/lib/` refs |
| `lib/osint/`, `lib/threatintel/` | `packages/osint/src/` | ✅ Copied | ⏳ Partial |
| `lib/db/`, `lib/auth/` | `packages/infrastructure/src/` | ✅ Partial new + copy | ⏳ Session/JWT refs |
| `lib/mail/`, `lib/mailer/` | `packages/infrastructure/.../email`, `mailer/` | ⏳ Symlink only for mailer | ⏳ |
| `lib/crypto/`, `lib/secrets/`, `lib/opsec/` | `packages/security/src/` | ✅ Copied | ⏳ |
| `lib/utils/`, types, zod | `packages/shared/src/` | ✅ New modules + partial copy | ⏳ |
| `lib/hooks/` | `packages/ui/src/hooks/` | ✅ Copied | ⏳ |
| `lib/workflow/` | `packages/ai/src/workflows/` or stay in `lib/` | ❌ Still in root `lib/` | ❌ Web routes use `@/lib/workflow` |
| `lib/azure/` | `packages/infrastructure/.../external/azure/` | ⏳ Partial | ⏳ |
| `lib/orchestration/` | `packages/core/src/use-cases/` | ❌ Not migrated | ❌ |

### 2.2 App Router

| Current | Target | Status |
|---------|--------|--------|
| `app/(auth)/` | `apps/web/app/(auth)/` | ✅ |
| `app/admin/` | `apps/web/app/admin/` | ✅ (not under `(dashboard)` yet) |
| `app/api/*` | `apps/web/app/api/` | ✅ |
| `app/track/` | `apps/web/app/track/` | ✅ |
| Root `app/` | Delete after cutover | ❌ Duplicate remains |

### 2.3 Components

| Current | Target | Status |
|---------|--------|--------|
| `components/admin/` | `packages/ui/.../admin/` | ✅ Copied; web uses symlink |
| `components/ui/` | `packages/ui/.../ui/` | ✅ Copied; web uses symlink |
| `components/azure/`, `visualization/` | `packages/ui/...` | ✅ Copied |
| Atoms/molecules/organisms split | Planned | ❌ |

### 2.4 Tests

| Current | Target | Status |
|---------|-----|--------|
| `tests/opsec/` | `packages/security/src/__tests__/` | ❌ |
| `tests/ui/` | `packages/ui/src/__tests__/` | ❌ |
| `tests/ai/` | `packages/ai/src/__tests__/` | ❌ |
| `tests/e2e/` | `tests/e2e/` | ✅ Unchanged |

---

## Phase 3: Naming Conventions

*(Unchanged — apply on new files; legacy names retained until dedicated rename pass.)*

### Files

```
kebab-case.ts          # Utilities, configs
PascalCase.ts          # Classes, types, interfaces
useHookName.ts         # React hooks
ComponentName.tsx      # React components
kebab-case.test.ts     # Unit tests
kebab-case.spec.ts     # Integration tests
kebab-case/            # Directories
```

### Examples (target)

```
# Before
lib/ai/robustness/retry.ts
lib/c2/implantManager.ts

# After
packages/ai/src/utils/retry-strategy.ts
packages/c2/src/implant/manager.ts
```

---

## Phase 4: Implementation Phases

### Phase 4.1: Setup — ✅ Complete

- [x] Initialize PNPM workspace
- [x] Create `packages/` structure
- [x] Setup Turborepo (`turbo.json`)
- [x] Root `package.json` workspace scripts
- [x] Per-package `package.json` + `tsconfig.json`
- [ ] Centralize ESLint/Prettier under `config/` (still at root)

### Phase 4.2: Foundation — ✅ Mostly complete

- [x] `packages/shared` — utils, types, constants, validation
- [x] `packages/infrastructure` — database, security, logging, config adapters
- [x] Webpack / TS path wiring for `@c2panel/*`
- [ ] All consumers off `@/lib/utils` inside packages
- [ ] `packages/shared` builds with `tsc` independently

### Phase 4.3: AI package — ✅ Copied, ⏳ cleanup

- [x] Copy `lib/ai/` → `packages/ai/src/`
- [x] Copy `lib/grok/` → `packages/ai/src/agents/grok/`
- [x] Copy workflow-related AI code into package tree
- [ ] Move `lib/workflow/` fully into `packages/ai/src/workflows/`
- [ ] Fix internal `@/lib/` imports (~30 files)
- [ ] Co-locate tests

### Phase 4.4: C2 package — ✅ Copied, ⏳ cleanup

- [x] Copy `lib/c2/`, hysteria, payloads, implants, post-exploitation
- [ ] Fix internal `@/lib/` imports (~25 files)
- [ ] Move `implant/` resources if still outside package

### Phase 4.5: Infrastructure — ✅ Partial

- [x] Auth, DB adapters, email adapters in package
- [x] Symlink `lib/mailer` → `packages/infrastructure/src/mailer`
- [x] Symlink `lib/infrastructure/rate-limiter.ts`
- [ ] Copy (not symlink) mailer into package
- [ ] Azure / Firebase / Supabase under `adapters/external/`
- [ ] Queue adapter (`bullmq`) complete in package

### Phase 4.6: Security & OSINT — ✅ Copied, ⏳ cleanup

- [x] Copy crypto, secrets, opsec, osint sources
- [ ] Fix cross-package imports
- [ ] Threat intel under `packages/osint/src/correlation/`

### Phase 4.7: UI package — ✅ Copied, ⏳ structure

- [x] Copy `components/` → `packages/ui/src/components/`
- [ ] Atomic design folders (optional)
- [ ] Export barrels for `admin/`, `ui/`, etc.
- [ ] Web app imports only from `@c2panel/ui` (remove component symlinks)

### Phase 4.8: Web app — ✅ Running, ⏳ cutover

- [x] `app/` → `apps/web/app/`
- [x] `public/` → `apps/web/public/`
- [x] `next.config.js` with monorepo aliases
- [x] Symlink bridge for `@/lib` and `@/components`
- [ ] Migrate remaining `@/lib/workflow`, `@/lib/auth`, secrets routes to `@c2panel/*`
- [ ] Delete root `app/`
- [ ] `pnpm run build` from repo root without `ignoreBuildErrors`

### Phase 4.9: Services & final — ❌ Not started

- [ ] Consolidate `mailer-service/` → `services/mailer/`
- [ ] Update Docker / CI for `apps/web` context
- [ ] Staging deploy + perf check
- [ ] Delete root `lib/` and `components/`

### Phase 4.10: Bridge layer (interim) — ✅ Documented

**Purpose:** Run `apps/web` before full cutover without duplicating 239 lib files.

| Bridge | Path | Target |
|--------|------|--------|
| App lib | `apps/web/app/lib` | `../../../lib` (repo root) |
| App UI | `apps/web/app/components/ui` | `../../../../components/ui` |
| App admin/azure/viz | `apps/web/app/components/{admin,azure,visualization}` | repo `components/` |
| Infra mailer | `packages/infrastructure/src/mailer` | `../../../lib/mailer` |
| Rate limiter | `packages/infrastructure/src/rate-limiter.ts` | `lib/infrastructure/rate-limiter.ts` |

**Webpack aliases** (`apps/web/next.config.js`):

```javascript
const repoRoot = path.resolve(__dirname, '../..');

config.resolve.alias = {
  '@c2panel/grok': path.join(repoRoot, 'packages/ai/src/agents/grok'),
  '@c2panel/shared': path.join(repoRoot, 'packages/shared/src'),
  '@c2panel/infrastructure': path.join(repoRoot, 'packages/infrastructure/src'),
  '@c2panel/ai': path.join(repoRoot, 'packages/ai/src'),
  '@c2panel/c2': path.join(repoRoot, 'packages/c2/src'),
  '@c2panel/security': path.join(repoRoot, 'packages/security/src'),
  '@c2panel/osint': path.join(repoRoot, 'packages/osint/src'),
  '@c2panel/ui': path.join(repoRoot, 'packages/ui/src'),
  '@': path.join(__dirname, 'app'),
};
```

**Dev command (use webpack until Turbopack aliases are parity):**

```bash
cd apps/web
pnpm next dev --webpack -p 3000
```

---

## Phase 5: Code Quality Improvements

### 5.1 Import structure (target)

```typescript
// Legacy (phasing out)
import { readSession } from "@/lib/auth/session";

// Current (preferred in apps/web)
import { readSession } from "@c2panel/infrastructure/security/session";
import { Button } from "@c2panel/ui/components/ui/button";
import { cn } from "@c2panel/shared/utils";
```

### 5.2 Package exports (target)

```json
{
  "name": "@c2panel/ai",
  "exports": {
    ".": "./src/index.ts",
    "./providers": "./src/providers/index.ts",
    "./agents": "./src/agents/index.ts"
  }
}
```

### 5.3 Barrel files

Add `index.ts` per subfolder in each package before removing webpack deep-resolve aliases.

---

## Phase 6: Build & Dev Configuration

### 6.1 Turborepo — ✅ Configured

See `turbo.json`: `build`, `test`, `lint`, `type-check`, `dev` tasks with `^build` dependency chain.

### 6.2 PNPM workspace — ✅ Configured

```yaml
packages:
  - 'apps/*'
  - 'packages/*'
  - 'services/*'
```

### 6.3 Root scripts — ✅

```bash
pnpm install          # workspace install
pnpm dev              # turbo run dev (prefer apps/web --webpack for now)
pnpm build            # turbo run build
pnpm test             # turbo run test
pnpm type-check       # turbo run type-check
```

---

## Phase 7: Testing Strategy

*(Planned — not yet reorganized.)*

- Co-locate unit tests under `packages/*/src/__tests__/`
- Keep Playwright E2E at `tests/e2e/`
- Integration tests at `tests/integration/` for cross-package flows

**Current verified:**

| Suite | Result |
|-------|--------|
| `test:opsec` | ✅ 61 passed |
| `test:ui` | ✅ 13 passed |
| AI / ShadowGrok | ❌ API quota (external) |
| Full `npm test` | ❌ Hangs on AI tests |

---

## Phase 8: Migration Checklist

### Pre-migration — ✅

- [x] Backup / feature branch workflow
- [x] Document env vars (`.env`, `.env.local` at repo root)
- [ ] Rotate exposed credentials in env files (security follow-up)

### During migration — ⏳ In progress

- [x] Migrate package by package (copy-first strategy)
- [x] Run OPSEC/UI tests after major moves
- [x] Keep old `lib/` until verified
- [ ] Run `turbo type-check` green after each package
- [ ] Migrate workflow + auth API routes off `@/lib/`

### Post-migration — ❌

- [ ] Delete root `lib/`, `components/`, `app/`
- [ ] Remove symlinks from `apps/web/app/`
- [ ] Update README and deployment docs
- [ ] Full test suite + staging deploy
- [ ] Production build benchmark

---

## Phase 9: Remaining Work (Prioritized)

### P0 — Required for production cutover

1. Migrate `apps/web/app/api/workflow/**` and `api/auth/**` from `@/lib/*` to `@c2panel/*`
2. Replace all `@/lib/` inside `packages/*` with `@c2panel/*` (run from repo root):
   ```bash
   # Example: sed or codemod per package — verify with:
   grep -r 'from "@/lib/' packages --include='*.ts' --include='*.tsx'
   ```
3. Physically copy `lib/mailer/` into `packages/infrastructure/src/mailer/` (remove symlink)
4. `pnpm run build` at repo root without `ignoreBuildErrors: true`
5. Remove duplicate root `app/` after confirming CI uses `apps/web`

### P1 — Quality & maintainability

6. Complete `packages/core` domain/use-case layer (or defer and document as optional)
7. Add package `exports` fields and barrel `index.ts` files
8. Move tests into packages; wire `turbo test` per package
9. Update `apps/web/package.json` `dev` script to `next dev --webpack` until Turbopack alias parity

### P2 — Nice to have

10. `(dashboard)` route group for admin + track
11. UI atoms/molecules/organisms layout
12. Split Prisma schema by domain
13. `deployments/` and `docs/` reorganization
14. Consolidate mailer microservice under `services/mailer/`

---

## Benefits (unchanged)

1. **Scalability** — Add packages without touching the web app
2. **Team scaling** — Clear ownership per package
3. **Testing** — Co-located tests, better coverage visibility
4. **Reusability** — Packages can be published or reused
5. **Build performance** — Turborepo caching
6. **IDE performance** — Smaller TypeScript project scopes
7. **Onboarding** — Predictable `@c2panel/<domain>` imports

---

## Timeline (revised)

| Phase | Original estimate | Actual / remaining |
|-------|-------------------|-------------------|
| Setup + scaffolding | 1 week | ✅ Done |
| Copy + web app move | 2 weeks | ✅ Done |
| Bridge + dev working | — | ✅ Done (2026-05-15) |
| Import cleanup + package TS | 2–3 weeks | ⏳ **~2 weeks remaining** |
| Delete legacy + prod build | 1 week | ❌ Not started |
| Services / docs / tests | 1 week | ❌ Not started |

**Overall:** ~**60%** of structural migration complete; **~40%** import/cutover and build hardening remains.

---

*Generated: 2026-05-15 · Updated: 2026-05-15*  
*Status: **Implementation in progress** — monorepo scaffolded, `apps/web` dev-ready via bridge layer*
