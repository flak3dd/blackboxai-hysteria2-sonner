# Restructure Quick Start

## Overview

This plan transforms the monolithic `lib/` folder (239 files) into a clean monorepo with 6 focused packages.

## Before vs After

```
BEFORE (Chaotic)                    AFTER (Organized)
├── lib/                            ├── apps/
│   ├── ai/ (45 files)              │   └── web/
│   ├── c2/ (28 files)              ├── packages/
│   ├── grok/ (12 files)            │   ├── core/         # Business logic
│   ├── osint/ (15 files)           │   ├── infrastructure/ # DB, cache, email
│   ├── azure/ (10 files)           │   ├── ai/           # LLM providers
│   ├── db/ (8 files)               │   ├── c2/           # C2 operations
│   ├── auth/ (6 files)             │   ├── osint/        # Intelligence
│   ├── crypto/ (4 files)           │   ├── security/     # Crypto, OPSEC
│   ├── opsec/ (6 files)            │   ├── ui/           # React components
│   ├── hysteria/ (8 files)         │   └── shared/       # Utilities
│   ├── payloads/ (12 files)        ├── services/
│   ├── workflow/ (10 files)        │   └── mailer/
│   ├── ... 70+ more files          ├── tests/
└── components/                     └── docs/
```

## Quick Commands

```bash
# 1. Install dependencies
pnpm install

# 2. Build all packages
turbo run build

# 3. Run tests
turbo run test

# 4. Dev mode
turbo run dev
```

## Package Purposes

| Package | Purpose | Current Files |
|---------|---------|---------------|
| `@c2panel/core` | Domain logic, use cases, entities | From `lib/config`, `lib/orchestration` |
| `@c2panel/infrastructure` | Database, cache, email, external APIs | From `lib/db`, `lib/auth`, `lib/mail`, `lib/azure`, `lib/supabase`, `lib/firebase` |
| `@c2panel/ai` | LLM providers, agents, reasoning | From `lib/ai`, `lib/grok`, `lib/workflow`, `lib/reasoning` |
| `@c2panel/c2` | Implant management, payloads, transport | From `lib/c2`, `lib/hysteria`, `lib/payloads`, `lib/implants`, `lib/post-exploitation`, `lib/swarm` |
| `@c2panel/osint` | Intelligence gathering, correlation | From `lib/osint`, `lib/threatintel` |
| `@c2panel/security` | Cryptography, OPSEC, secrets | From `lib/crypto`, `lib/opsec`, `lib/secrets`, `lib/security` |
| `@c2panel/ui` | React components, hooks, styles | From `components/`, `lib/hooks/` |
| `@c2panel/shared` | Utilities, types, constants | From `lib/utils/` |

## Import Changes

```typescript
// BEFORE
import { retry } from "@/lib/ai/robustness/retry";
import { ImplantManager } from "@/lib/c2/implantManager";

// AFTER
import { retry } from "@c2panel/ai";
import { ImplantManager } from "@c2panel/c2";
```

## Migration Priority

1. **Week 1**: `shared` (low risk)
2. **Week 2**: `infrastructure` (foundational)
3. **Week 3**: `ai` (isolated, no deps)
4. **Week 4**: `c2` (complex, core feature)
5. **Week 5**: `security` + `osint`
6. **Week 6**: `ui` (straightforward)
7. **Week 7**: `core` (depends on others)
8. **Week 8**: `web` app migration

## File Count Reduction

- **Before**: 700+ files in flat structure
- **After**: Organized in 6 domain packages + 1 web app
- **Improvement**: Clear boundaries, co-located tests, better tree-shaking

## Next Steps

1. Review `RESTRUCTURE_PLAN.md` for details
2. Create feature branch: `git checkout -b restructure/2024`
3. Run setup script: `./scripts/setup-workspace.sh`
4. Start with `packages/shared/` migration
5. Verify each package with `turbo run test --filter=@c2panel/shared`
