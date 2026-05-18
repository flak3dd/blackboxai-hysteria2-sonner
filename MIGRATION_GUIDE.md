# Migration Guide - File System Restructure

## ✅ Completed

### Phase 1-9: Foundation Setup

```
blackboxai-hysteria2-sonner-1/
├── pnpm-workspace.yaml          ✅ Workspace configuration
├── turbo.json                    ✅ Turborepo pipeline
├── tsconfig.base.json            ✅ Shared TypeScript config
├── package.json                  ✅ Updated for monorepo
│
├── apps/
│   └── web/                      ✅ Web app placeholder
│
├── packages/
│   ├── shared/                   ✅ COMPLETE
│   │   ├── src/
│   │   │   ├── types/
│   │   │   ├── utils/          ✅ performance, formatting, crypto
│   │   │   ├── constants/
│   │   │   ├── validation/
│   │   │   └── index.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── infrastructure/           ✅ COMPLETE (core adapters)
│   │   ├── src/
│   │   │   ├── adapters/
│   │   │   │   ├── database/   ✅ Prisma, Supabase
│   │   │   │   ├── cache/      ✅ Redis
│   │   │   │   ├── email/      ✅ Resend
│   │   │   │   └── queue/
│   │   │   ├── security/       ✅ password, jwt, encryption
│   │   │   ├── logging/        ✅ Pino
│   │   │   ├── config/
│   │   │   └── index.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── ai/                       ✅ Structure created
│   ├── c2/                       ✅ Structure created
│   ├── security/                 ✅ Structure created
│   ├── osint/                    ✅ Structure created
│   ├── ui/                       ✅ Structure created
│   └── core/                     ✅ Structure created
│
└── tests/
    ├── e2e/
    └── integration/
```

---

## 🔄 Remaining Work

### 1. Migrate AI Package (45 files from lib/ai/)

```bash
# Files to migrate:
lib/ai/
├── agents/           → packages/ai/src/agents/
├── providers/        → packages/ai/src/providers/
├── reasoning/        → packages/ai/src/reasoning/
├── robustness/       → packages/ai/src/utils/
├── tools/            → packages/ai/src/tools/
├── workflows/        → packages/ai/src/workflows/
├── llm.ts            → packages/ai/src/llm-client.ts
├── types.ts          → packages/ai/src/types.ts
└── ...

# Also migrate:
lib/grok/           → packages/ai/src/agents/shadowgrok/
lib/workflow/       → packages/ai/src/workflows/
lib/reasoning/      → packages/ai/src/reasoning/
```

### 2. Migrate C2 Package (28 files from lib/c2/ + related)

```bash
# Source files:
lib/c2/             → packages/c2/src/
lib/hysteria/       → packages/c2/src/transport/
lib/payloads/       → packages/c2/src/payload/
lib/implants/       → packages/c2/src/implant/
lib/post-exploitation/ → packages/c2/src/ops/
lib/swarm/          → packages/c2/src/ops/swarm/

# Also migrate:
implant/            → packages/c2/resources/
```

### 3. Migrate Security Package

```bash
lib/crypto/         → packages/security/src/crypto/
lib/opsec/          → packages/security/src/opsec/
lib/secrets/        → packages/security/src/secrets/
lib/security/       → packages/security/src/
```

### 4. Migrate OSINT Package

```bash
lib/osint/          → packages/osint/src/
lib/threatintel/    → packages/osint/src/correlation/
```

### 5. Migrate UI Package

```bash
components/           → packages/ui/src/components/
  ├── admin/        → organisms/admin/
  ├── azure/        → organisms/azure/
  ├── ui/           → atoms/
  └── visualization/→ molecules/charts/

lib/hooks/          → packages/ui/src/hooks/
```

### 6. Migrate Web App

```bash
app/                → apps/web/app/
public/             → apps/web/public/
next.config.*       → apps/web/
```

### 7. Update Imports

Replace throughout codebase:

```typescript
// BEFORE
import { cn } from "@/lib/utils"
import { prisma } from "@/lib/db"
import { something } from "@/lib/ai/llm"

// AFTER
import { cn } from "@c2panel/shared"
import { prisma } from "@c2panel/infrastructure"
import { something } from "@c2panel/ai"
```

---

## 📋 Migration Commands

### Step 1: Install Dependencies
```bash
# Install pnpm if not available
npm install -g pnpm

# Install all workspace dependencies
pnpm install
```

### Step 2: Build Packages
```bash
# Build all packages in dependency order
turbo run build

# Build specific package
turbo run build --filter=@c2panel/shared
```

### Step 3: Run Tests
```bash
# Run all tests
turbo run test

# Run specific package tests
turbo run test --filter=@c2panel/shared
```

### Step 4: Development Mode
```bash
# Start all dev servers
turbo run dev

# Start specific package dev
turbo run dev --filter=@c2panel/web
```

---

## 🔄 Import Mapping Reference

| Old Path | New Package | New Import |
|----------|-------------|------------|
| `@/lib/utils` | `@c2panel/shared` | `import { cn, debounce } from "@c2panel/shared"` |
| `@/lib/utils/performance` | `@c2panel/shared` | `import { debounce } from "@c2panel/shared"` |
| `@/lib/db` | `@c2panel/infrastructure` | `import { prisma } from "@c2panel/infrastructure"` |
| `@/lib/db/schema` | `@c2panel/shared` | `import { schemas } from "@c2panel/shared/validation"` |
| `@/lib/auth` | `@c2panel/infrastructure` | `import { hashPassword } from "@c2panel/infrastructure/security"` |
| `@/lib/mail` | `@c2panel/infrastructure` | `import { sendEmail } from "@c2panel/infrastructure/email"` |
| `@/lib/ai/*` | `@c2panel/ai` | `import { llmClient } from "@c2panel/ai"` |
| `@/lib/c2/*` | `@c2panel/c2` | `import { implantManager } from "@c2panel/c2"` |
| `@/lib/crypto` | `@c2panel/security` | `import { encrypt } from "@c2panel/security"` |
| `@/lib/opsec` | `@c2panel/security` | `import { calculateOpsecScore } from "@c2panel/security/opsec"` |
| `@/lib/osint` | `@c2panel/osint` | `import { osintClient } from "@c2panel/osint"` |
| `@/components/ui/*` | `@c2panel/ui` | `import { Button } from "@c2panel/ui"` |
| `@/components/admin/*` | `@c2panel/ui` | `import { AdminDashboard } from "@c2panel/ui/components"` |

---

## 🧪 Testing Strategy

### Unit Tests
```bash
# Co-located with source
packages/*/src/**/*.test.ts
```

### Integration Tests
```bash
tests/integration/
├── ai/
├── c2/
└── infrastructure/
```

### E2E Tests
```bash
tests/e2e/
├── auth.spec.ts
├── dashboard.spec.ts
└── implant-management.spec.ts
```

---

## 📊 Verification Checklist

- [ ] All packages build successfully (`turbo run build`)
- [ ] No TypeScript errors (`turbo run type-check`)
- [ ] All tests pass (`turbo run test`)
- [ ] ESLint passes (`turbo run lint`)
- [ ] Web app starts in dev mode (`turbo run dev`)
- [ ] No broken imports in web app
- [ ] Database connections work
- [ ] External API integrations work
- [ ] Environment variables loaded correctly

---

## 🚀 Next Steps

1. **Migrate lib/ai/ → packages/ai/** (highest priority - no dependencies)
2. **Migrate components/ → packages/ui/** (parallel work possible)
3. **Migrate lib/c2/ → packages/c2/** (core business logic)
4. **Migrate lib/osint/ → packages/osint/**
5. **Migrate lib/crypto, opsec, secrets → packages/security/**
6. **Update all import statements** (can be automated with codemod)
7. **Move app/ → apps/web/**
8. **Verify everything works**

---

*Created: 2026-05-15*
*Status: Foundation Complete - Ready for Package Migration*
