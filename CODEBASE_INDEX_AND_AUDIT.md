# Comprehensive Codebase Index & Dead Code Audit

**Project:** hysteria2-c2-advanced  
**Audit Date:** 2026-05-11  
**Total Files Analyzed:** ~400+ source files  
**Build Status:** Success (1 warning about NFT trace in next.config.js)

---

## Table of Contents
1. [Complete File Index](#1-complete-file-index)
2. [Unused / Dead Code](#2-unused--dead-code)
3. [Redundant / Duplicate Implementations](#3-redundant--duplicate-implementations)
4. [Dependency Issues](#4-dependency-issues)
5. [Incorrectly Implemented Code](#5-incorrectly-implemented-code)
6. [Recommendations](#6-recommendations)

---

## 1. Complete File Index

### 1.1 Application Routes (`app/`)

| Category | Files | Count |
|---|---|---|
| Auth | `(auth)/layout.tsx`, `(auth)/login/page.tsx` | 2 |
| Admin Pages | `admin/page.tsx` (dashboard), `admin/ai/page.tsx`, `admin/analytics/page.tsx`, `admin/beacons/page.tsx`, `admin/config-audit/page.tsx`, `admin/configs/page.tsx`, `admin/coordination/page.tsx`, `admin/forensics/page.tsx`, `admin/implants/page.tsx`, `admin/infrastructure/page.tsx`, `admin/infrastructure/traffic/page.tsx`, `admin/lotl/page.tsx`, `admin/mail/page.tsx`, `admin/mail/migrator/page.tsx`, `admin/network/page.tsx`, `admin/nodes/page.tsx`, `admin/osint/page.tsx`, `admin/payloads/page.tsx`, `admin/profiles/page.tsx`, `admin/reports/page.tsx`, `admin/settings/page.tsx`, `admin/threat/page.tsx`, `admin/transport/page.tsx`, `admin/workflow/page.tsx`, `admin/workflow/analytics/page.tsx` | 25 |
| API Routes - AI | `api/admin/ai/autonomous/route.ts`, `api/admin/ai/chat/route.ts`, `api/admin/ai/conversations/route.ts`, `api/admin/ai/conversations/[id]/route.ts`, `api/admin/ai/deploy-profile/route.ts`, `api/admin/ai/providers/health/route.ts`, `api/admin/ai/providers/reset/route.ts`, `api/admin/ai/shadowgrok/route.ts`, `api/admin/ai/shadowgrok/stream/route.ts`, `api/admin/ai/stats/route.ts`, `api/admin/ai/templates/route.ts` | 11 |
| API Routes - Core | `api/admin/beacons/route.ts`, `api/admin/beacons/[id]/route.ts`, `api/admin/config/audit/route.ts`, `api/admin/config/danger-mode/route.ts`, `api/admin/config/provider-keys/route.ts`, `api/admin/config/suggest/route.ts`, `api/admin/config/universal/route.ts`, `api/admin/credentials/route.ts`, `api/admin/credentials/[id]/route.ts`, `api/admin/deploy/route.ts`, `api/admin/deploy/[id]/destroy/route.ts`, `api/admin/deploy/[id]/stream/route.ts`, `api/admin/deploy/batch/route.ts`, `api/admin/deploy/presets/route.ts`, `api/admin/deploy/provision-script/route.ts`, `api/admin/implants/route.ts`, `api/admin/implants/[id]/route.ts`, `api/admin/infrastructure/egress/route.ts`, `api/admin/infrastructure/traffic/route.ts`, `api/admin/lateral-movement/route.ts`, `api/admin/lateral-movement/[id]/route.ts`, `api/admin/nodes/route.ts`, `api/admin/nodes/[id]/route.ts`, `api/admin/notifications/route.ts`, `api/admin/notifications/[notificationId]/route.ts`, `api/admin/notifications/unread-count/route.ts`, `api/admin/osint/domain/route.ts`, `api/admin/overview/route.ts`, `api/admin/payloads/route.ts`, `api/admin/payloads/[id]/route.ts`, `api/admin/payloads/[id]/download/route.ts`, `api/admin/profiles/route.ts`, `api/admin/profiles/[id]/route.ts`, `api/admin/profiles/[id]/apply/route.ts`, `api/admin/reasoning/stats/route.ts`, `api/admin/reasoning/traces/route.ts`, `api/admin/reasoning/traces/[traceId]/route.ts`, `api/admin/server/config/route.ts`, `api/admin/server/kick/route.ts`, `api/admin/server/logs/route.ts`, `api/admin/server/online/route.ts`, `api/admin/server/restart/route.ts`, `api/admin/server/start/route.ts`, `api/admin/server/status/route.ts`, `api/admin/server/stop/route.ts`, `api/admin/server/traffic/route.ts`, `api/admin/threatintel/abusech/route.ts`, `api/admin/threatintel/alienvault/route.ts`, `api/admin/threatintel/virustotal/route.ts`, `api/admin/traffic-stats/route.ts`, `api/admin/users/route.ts`, `api/admin/users/[id]/route.ts`, `api/admin/users/[id]/client-config/route.ts` | 50+ |
| API Routes - Auth | `api/auth/login/route.ts`, `api/auth/login-redirect/route.ts`, `api/auth/logout/route.ts`, `api/auth/refresh/route.ts`, `api/auth/session/route.ts` | 5 |
| API Routes - Mail | `api/admin/mail/accounts/route.ts`, `api/admin/mail/accounts/[id]/messages/route.ts`, `api/admin/mail/accounts/[id]/test/route.ts`, `api/admin/mail/analytics/route.ts`, `api/admin/mail/auto-test/route.ts`, `api/admin/mail/bounce/route.ts`, `api/admin/mail/campaigns/route.ts`, `api/admin/mail/campaigns/[id]/route.ts`, `api/admin/mail/harvest/route.ts`, `api/admin/mail/logs/route.ts`, `api/admin/mail/migrator/config/route.ts`, `api/admin/mail/migrator/run/route.ts`, `api/admin/mail/mysmtp/batch/route.ts`, `api/admin/mail/mysmtp/send/route.ts`, `api/admin/mail/mysmtp/validate/route.ts`, `api/admin/mail/queue/route.ts`, `api/admin/mail/resend/send/route.ts`, `api/admin/mail/send-test/route.ts`, `api/admin/mail/templates/route.ts`, `api/admin/mail/test-all/route.ts`, `api/admin/mail/tracking/route.ts`, `api/admin/mail/tunnel-script/route.ts`, `api/mailer/campaigns/bulk/route.ts`, `api/mailer/send-tunnel/route.ts`, `api/mailer/tunnel-with-payloads/route.ts` | 25 |
| API Routes - Workflow | `api/workflow/analytics/route.ts`, `api/workflow/functions/route.ts`, `api/workflow/proactive/route.ts`, `api/workflow/scheduled/route.ts`, `api/workflow/scheduled/[id]/route.ts`, `api/workflow/sessions/route.ts`, `api/workflow/sessions/[sessionId]/route.ts`, `api/workflow/sessions/[sessionId]/export/route.ts`, `api/workflow/sessions/[sessionId]/respond/route.ts`, `api/workflow/sessions/import/route.ts` | 10 |
| API Routes - Other | `api/dpanel/implant/result/route.ts`, `api/dpanel/implant/tasks/route.ts`, `api/events/route.ts`, `api/hysteria/auth/route.ts`, `api/hysteria/traffic/route.ts`, `api/shadowgrok/approvals/route.ts`, `api/shadowgrok/execute/route.ts`, `api/sub/hysteria2/route.ts` | 8 |

### 1.2 Components (`components/`)

| Category | Files | Count |
|---|---|---|
| Admin Layout | `admin/admin-header.tsx`, `admin/nav.tsx`, `admin/sidebar.tsx`, `admin/sign-out-button.tsx` | 4 |
| AI | `admin/ai/ai-chat-view.tsx`, `admin/ai/ai-dashboard-widget.tsx`, `admin/ai/ai-page-tabs.tsx`, `admin/ai/ai-settings-view.tsx`, `admin/ai/openrouter-config-view.tsx`, `admin/ai/provider-health-view.tsx`, `admin/ai/reasoning-trace-view.tsx`, `admin/ai/shadowgrok-view.tsx` | 8 |
| Beacons | `admin/beacons/beacon-detail-modal.tsx`, `admin/beacons/beacons-data-table.tsx`, `admin/beacons/beacons-filters.tsx`, `admin/beacons/beacons-summary-cards.tsx`, `admin/beacons/beacons-view.tsx` | 5 |
| Configs | `admin/configs/configs-view.tsx` | 1 |
| Dashboard | `admin/dashboard/dashboard-widgets.tsx`, `admin/dashboard/overview.tsx` | 2 |
| Deployments | `admin/deployments/deployment-monitoring-view.tsx` | 1 |
| Implants | `admin/implants/enhanced-implants-view.tsx`, `admin/implants/implants-view.tsx` | 2 |
| Infrastructure | `admin/infrastructure/overview.tsx`, `admin/infrastructure/traffic-dashboard.tsx` | 2 |
| LOTL | `admin/lotl/enhanced-lotl-arsenal-view.tsx`, `admin/lotl/lotl-arsenal-view.tsx` | 2 |
| Mail | `admin/mail/mail-analytics-view.tsx`, `admin/mail/mail-test-view.tsx`, `admin/mail/migrator-view.tsx` | 3 |
| Network | `admin/network/network-map-view.tsx` | 1 |
| Nodes | `admin/nodes/deploy-modal.tsx`, `admin/nodes/node-modals.tsx`, `admin/nodes/nodes-view.tsx` | 3 |
| Payloads | `admin/payloads/payloads-view.tsx` | 1 |
| Profiles | `admin/profiles/enhanced-profiles-view.tsx`, `admin/profiles/profiles-view.tsx` | 2 |
| Server | `admin/server/server-management-view.tsx` | 1 |
| Transport | `admin/transport/transport-protocols-view.tsx` | 1 |
| Weaponize | `admin/weaponize/weaponize-analytics-view.tsx` | 1 |
| Workflow | `admin/workflow/function-discovery.tsx`, `admin/workflow/proactive-insights.tsx`, `admin/workflow/session-history.tsx`, `admin/workflow/workflow-analytics-dashboard.tsx`, `admin/workflow/workflow-analytics.tsx`, `admin/workflow/workflow-chat.tsx`, `admin/workflow/workflow-progress.tsx`, `admin/workflow/workflow-scheduler.tsx`, `admin/workflow/workflow-templates.tsx` | 9 |
| Theme | `theme-provider.tsx` | 1 |
| UI Primitives | 40+ files including `button.tsx`, `card.tsx`, `dialog.tsx`, `sonner.tsx`, `badge.tsx`, `table.tsx`, `tabs.tsx`, `input.tsx`, `select.tsx`, `scroll-area.tsx`, `sheet.tsx`, `popover.tsx`, `dropdown-menu.tsx`, `tooltip.tsx`, `separator.tsx`, `checkbox.tsx`, `switch.tsx`, `progress.tsx`, `breadcrumb.tsx`, `command.tsx`, `textarea.tsx`, `label.tsx`, `avatar.tsx`, `collapsible.tsx`, `skeleton.tsx`, `loading-states.tsx`, `animations.tsx`, `page-transition.tsx`, `status-indicator.tsx`, `performance.tsx`, `interactive-states.tsx`, `empty-state.tsx`, `floating-label-input.tsx`, `input-group.tsx`, `virtual-list.tsx`, `progressive-image.tsx`, `masonry-layout.tsx`, `dashboard-grid.tsx`, `container.tsx`, `accessibility.tsx`, `accessibility-preferences.tsx`, `keyboard-navigation.tsx`, `mobile-drawer.tsx`, `error-boundary.tsx`, `enhanced-toast.tsx`, `skeleton-screens.tsx`, `celebration.tsx` | 50+ |

### 1.3 Library Modules (`lib/`)

| Category | Files | Count |
|---|---|---|
| AI Core | `ai/ai-initializer.ts`, `ai/anomaly-detection.ts`, `ai/argument-extractor.ts`, `ai/automated-reporting.ts`, `ai/chat.ts`, `ai/conversations.ts`, `ai/debug-logger.ts`, `ai/intelligent-scheduler.ts`, `ai/llm.ts`, `ai/openrouter/stack.ts`, `ai/orchestration-engine.ts`, `ai/predictive-caching.ts`, `ai/provider-fallback.ts`, `ai/reasoning-orchestrator.ts`, `ai/self-optimizing-config.ts`, `ai/startup.ts`, `ai/system-prompt.ts`, `ai/templates.ts`, `ai/threat-correlation.ts`, `ai/tool-normalizer.ts`, `ai/tool-types.ts`, `ai/tool-validator.ts`, `ai/tools.ts`, `ai/types.ts` | 24 |
| AI Reasoning | `ai/reasoning/chain-of-thought.ts`, `ai/reasoning/extractor-provider.ts`, `ai/reasoning/index.ts`, `ai/reasoning/meta-cognition.ts`, `ai/reasoning/reasoning-pipeline.ts`, `ai/reasoning/reasoning-trace.ts`, `ai/reasoning/reasoning-trace.ts`, `ai/reasoning/schemas.ts` | 8 |
| AI Robustness | `ai/robustness/circuit-breaker.ts`, `ai/robustness/degradation.ts`, `ai/robustness/errors.ts`, `ai/robustness/health-check.ts`, `ai/robustness/index.ts`, `ai/robustness/monitoring.ts`, `ai/robustness/retry.ts`, `ai/robustness/validation.ts` | 8 |
| API | `api/fetch.ts`, `api/fetch-optimized.ts`, `api/sse.ts` | 3 |
| Auth | `auth/admin.ts`, `auth/jwt.ts`, `auth/redirect.ts`, `auth/session.ts` | 4 |
| C2 | `c2/dispatch.ts`, `c2/kill-switch.ts`, `c2/traffic-analysis.ts` | 3 |
| Config | `config/audit.ts`, `config-audit/analyzer.ts` | 2 |
| DB | `db.ts`, `db/beacons.ts`, `db/credentials.ts`, `db/implants.ts`, `db/lateral-movement.ts`, `db/nodes.ts`, `db/payload-builds.ts`, `db/profiles.ts`, `db/schema.ts`, `db/server-config.ts`, `db/subscriptions.ts`, `db/usage.ts`, `db/users.ts` | 13 |
| Deploy | `deploy/orchestrator.ts`, `deploy/provider-keys.ts`, `deploy/provision-script.ts`, `deploy/ssh.ts`, `deploy/types.ts`, `deploy/providers/azure.ts`, `deploy/providers/digitalocean.ts`, `deploy/providers/hetzner.ts`, `deploy/providers/index.ts`, `deploy/providers/lightsail.ts`, `deploy/providers/vultr.ts` | 11 |
| Env | `env.ts` | 1 |
| Grok (ShadowGrok) | `grok/agent-runner.ts`, `grok/agent-runner-enhanced.ts`, `grok/grok-tools.ts`, `grok/tool-executor.ts`, `grok/README.md` | 5 |
| Hooks | `hooks/use-keyboard-shortcuts.ts`, `hooks/use-optimistic-update.ts` | 2 |
| Hysteria | `hysteria/binary.ts`, `hysteria/client-config.ts`, `hysteria/config.ts`, `hysteria/manager.ts`, `hysteria/traffic.ts`, `hysteria/types.ts` | 6 |
| Implants | `implants/build-deploy.ts`, `implants/compilation-service.ts`, `implants/generator.ts` | 3 |
| Infrastructure | `infrastructure/cache.ts`, `infrastructure/domain-fronting.ts`, `infrastructure/egress-manager.ts`, `infrastructure/http-client.ts`, `infrastructure/monitoring.ts`, `infrastructure/proxy-agent.ts`, `infrastructure/proxy-health.ts`, `infrastructure/proxy-rotation.ts`, `infrastructure/rate-limiter.ts`, `infrastructure/traffic-stats.ts` | 10 |
| Logger | `logger.ts` | 1 |
| Mail | `mail/accounts.ts`, `mail/auto-test.ts`, `mail/client.ts`, `mail/sender.ts`, `mail/types.ts` | 5 |
| Mailer | `mailer/bulk-campaign.ts`, `mailer/enhanced-mailer.ts`, `mailer/mysmtp.ts`, `mailer/queue.ts`, `mailer/resend.ts`, `mailer/templates.ts`, `mailer/tracking.ts` | 7 |
| Net | `net/dispatcher.ts`, `net/fetch.ts`, `net/strategy.ts` | 3 |
| Notifications | `notifications/email-notifier.ts`, `notifications/notification-system.ts` | 2 |
| OSINT | `osint/domain-enum.ts`, `osint/email-harvester.ts` | 2 |
| Pagination | `pagination.ts` | 1 |
| Payloads | `payloads/generator.ts`, `payloads/templates.ts` | 2 |
| Post-Exploitation | `post-exploitation/agents/ad-reconnaissance-agent.ts`, `post-exploitation/agents/agent-coordinator.ts`, `post-exploitation/agents/credential-harvester-agent.ts`, `post-exploitation/agents/index.ts`, `post-exploitation/agents/lateral-movement-agent.ts`, `post-exploitation/agents/privilege-escalation-agent.ts`, `post-exploitation/bloodhound/analyzer.ts`, `post-exploitation/bloodhound/exporter.ts`, `post-exploitation/bloodhound/importer.ts`, `post-exploitation/bloodhound/index.ts`, `post-exploitation/bloodhound/storage.ts`, `post-exploitation/credential-vault.ts`, `post-exploitation/engine.ts`, `post-exploitation/opsec-scorer.ts`, `post-exploitation/pathfinder.ts`, `post-exploitation/swarm-integration.ts`, `post-exploitation/techniques/as-rep-roasting.ts`, `post-exploitation/techniques/dcom.ts`, `post-exploitation/techniques/index.ts`, `post-exploitation/techniques/kerberoasting.ts`, `post-exploitation/techniques/kerberos-utils.ts`, `post-exploitation/techniques/pass-the-hash.ts`, `post-exploitation/techniques/smb.ts`, `post-exploitation/techniques/winrm.ts`, `post-exploitation/techniques/wmi.ts`, `post-exploitation/types.ts` | 26 |
| Security | `security/controls.ts`, `security/file-validation.ts`, `security/killswitch.ts`, `security/xss-sanitization.ts` | 4 |
| Swarm | `swarm/agent-registry.ts`, `swarm/agents/base-agent.ts`, `swarm/agents/evasion-agent.ts`, `swarm/agents/exfiltration-agent.ts`, `swarm/agents/persistence-agent.ts`, `swarm/agents/recon-agent.ts`, `swarm/communication/message-builder.ts`, `swarm/communication/message-bus.ts`, `swarm/index.ts`, `swarm/intelligence/swarm-intelligence.ts`, `swarm/orchestration/negotiation-engine.ts`, `swarm/orchestration/swarm-coordinator.ts`, `swarm/swarm-manager.ts`, `swarm/types.ts` | 15 |
| Threat Intel | `threatintel/abusech.ts`, `threatintel/alienvault.ts`, `threatintel/virustotal.ts` | 3 |
| Utils | `utils.ts` | 1 |
| Workflow | `workflow/engine.ts`, `workflow/function-registry.ts`, `workflow/intent-analyzer.ts`, `workflow/proactive-intelligence.ts`, `workflow/response-generator.ts`, `workflow/templates.ts`, `workflow/types.ts` | 7 |

### 1.4 Configuration & Scripts

| Category | Files |
|---|---|
| Config | `.env.example`, `next.config.js`, `postcss.config.mjs`, `tailwind.config.ts`, `tsconfig.json`, `jest.config.js`, `eslint.config.mjs` |
| Scripts | `scripts/fix-node-deployment.md`, `scripts/reset-ai-providers.js`, `scripts/run-prisma.js`, `scripts/setup-admin.js`, `scripts/setup.bat`, `scripts/setup.sh`, `scripts/test-ai-assistant.ts`, `scripts/test-azure-deployment.ts`, `scripts/test-azure.ts` |
| Prisma | `prisma/schema.prisma`, `prisma/supabase-realtime.sql` |

### 1.5 Tests (`tests/`)

| Category | Files | Count |
|---|---|---|
| AI | `ai/agent-coordinator.test.ts`, `ai/ai-assistant-comprehensive.test.ts`, `ai/ai-new-tools.test.ts`, `ai/ai-nl-prompting.test.ts`, `ai/ai-robustness.test.ts`, `ai/ai-tools-enhanced.test.ts`, `ai/azure-deploy-live.test.ts` | 7 |
| E2E | `e2e/admin-dashboard.spec.ts`, `e2e/login.spec.ts` | 2 |
| Integration | `integration/compilation-packing.test.ts` | 1 |
| Manual | `manual/test-advanced-c2.ts`, `manual/test-ai-assistant-audit.ts`, `manual/test-ai-commands.ts`, `manual/test-ai-prompts.ts`, `manual/test-email-system.ts`, `manual/test-mysmtp-integration.ts`, `manual/test-payload-attachments.ts` | 7 |
| OPSEC | `opsec/end-to-end-workflow.test.ts`, `opsec/implant-deployment.test.ts`, `opsec/infrastructure-test.test.ts`, `opsec/traffic-blending.test.ts` | 4 |
| Reasoning | `reasoning/chain-of-thought.test.ts`, `reasoning/meta-cognition.test.ts`, `reasoning/reasoning-trace.test.ts` | 3 |
| ShadowGrok | `shadowgrok/agent-task.test.ts`, `shadowgrok/nl-understanding.test.ts`, `shadowgrok/shadowgrok-approval.test.ts`, `shadowgrok/shadowgrok-execution.test.ts`, `shadowgrok/suggest-offensive-steps.test.ts` | 5 |
| UI | `ui/button.test.tsx`, `ui/card.test.tsx`, `ui/test-utils.tsx` | 3 |
| Unit | `unit/api-implants.test.ts`, `unit/api-nodes.test.ts`, `unit/api-payloads.test.ts`, `unit/api-routes.test.ts`, `unit/auth-admin.test.ts`, `unit/auth-jwt.test.ts`, `unit/auth.test.ts`, `unit/openrouter-stack.test.ts`, `unit/openrouter-streaming.test.ts`, `unit/schemas.test.ts`, `unit/test-helpers.test.ts`, `unit/traffic-blending-config.test.ts` | 12 |
| Setup | `setup/database-mock.ts`, `setup/database-transactional.ts`, `setup/database.ts`, `setup/jest.setup.js` | 4 |
| Utils | `utils/mock-server.ts`, `utils/test-helpers.ts` | 2 |

---

## 2. Unused / Dead Code

### 2.1 Completely Unused Modules (0 imports in app code)

| Module / Directory | Files | Reason |
|---|---|---|
| `lib/hooks/` | `use-keyboard-shortcuts.ts`, `use-optimistic-update.ts` | Never imported anywhere in the project |
| `lib/swarm/` | All 15 files | Entire swarm subsystem is dead code; never imported |
| `lib/payloads/` | `generator.ts`, `templates.ts` | Never imported anywhere |
| `lib/security/` | `controls.ts`, `file-validation.ts`, `killswitch.ts`, `xss-sanitization.ts` | Only imported in manual test scripts, never in app |
| `lib/config-audit/` | `analyzer.ts` | Never imported (the route uses `lib/config/audit` instead) |
| `lib/api/fetch-optimized.ts` | - | Never imported anywhere |
| `lib/net/fetch.ts` | - | Never imported anywhere (only `net/dispatcher.ts` uses `net/strategy.ts`) |
| `lib/infrastructure/domain-fronting.ts` | - | Never imported |
| `lib/infrastructure/proxy-rotation.ts` | - | Never imported (only referenced in `INTEGRATION_PLAN.md`) |
| `lib/infrastructure/monitoring.ts` | - | Never imported |
| `lib/ai/startup.ts` | - | Only referenced in `INTEGRATION_PLAN.md`, never imported in code |
| `lib/implants/` | All 3 files | Only used in tests/manual scripts, never in app routes/components |
| `lib/post-exploitation/` | All 26 files | Only imported in tests (`tests/ai/agent-coordinator.test.ts`), never in app |
| `lib/c2/` | All 3 files | Only self-referencing imports within the module; not used by app |

### 2.2 Unused Components (Exported but Never Imported)

| Component | File | Issue |
|---|---|---|
| `EnhancedImplantsView` | `components/admin/implants/enhanced-implants-view.tsx` | `ImplantsView` is used instead |
| `EnhancedLotlArsenalView` | `components/admin/lotl/enhanced-lotl-arsenal-view.tsx` | `LotlArsenalView` is used instead |
| `EnhancedProfilesView` | `components/admin/profiles/enhanced-profiles-view.tsx` | `ProfilesView` is used instead |

### 2.3 Unused / Orphaned API Routes

All API routes are technically reachable by Next.js routing, but some serve modules that are themselves dead code:

| Route | Backend Module Status |
|---|---|
| `api/admin/payloads/*` | `lib/payloads/` is unused |
| `api/admin/lateral-movement/*` | `lib/post-exploitation/` is unused |
| `api/admin/credentials/*` | Credential DB module may be underutilized |
| `api/dpanel/implant/*` | `lib/implants/` is unused in app |
| `api/shadowgrok/execute` | Uses `lib/grok/agent-runner` (superseded by `agent-runner-enhanced`) |

---

## 3. Redundant / Duplicate Implementations

### 3.1 Duplicate Fetch/HTTP Client Wrappers

| File | Purpose | Usage |
|---|---|---|
| `lib/api/fetch.ts` | `apiFetch` wrapper with auth headers | Used in ~20 components |
| `lib/api/fetch-optimized.ts` | Optimized fetch wrapper | **Never imported** |
| `lib/net/fetch.ts` | Egress proxy fetch | **Never imported** |
| `lib/net/dispatcher.ts` | Proxy strategy dispatcher | Only used by `net/strategy.ts` |

**Recommendation:** Consolidate into a single `lib/api/fetch.ts` or rename `fetch-optimized.ts` and `net/fetch.ts` to indicate they are drafts, or remove them.

### 3.2 Duplicate Agent Runners

| File | Status |
|---|---|
| `lib/grok/agent-runner.ts` | Used only by `api/shadowgrok/execute/route.ts` |
| `lib/grok/agent-runner-enhanced.ts` | Used by main ShadowGrok API routes |

**Issue:** Two parallel implementations. The non-enhanced version is effectively deprecated.

### 3.3 Duplicate Component Versions

| Base Component | "Enhanced" Version | Status |
|---|---|---|
| `components/admin/implants/implants-view.tsx` | `enhanced-implants-view.tsx` | Enhanced never imported |
| `components/admin/lotl/lotl-arsenal-view.tsx` | `enhanced-lotl-arsenal-view.tsx` | Enhanced never imported |
| `components/admin/profiles/profiles-view.tsx` | `enhanced-profiles-view.tsx` | Enhanced never imported |

### 3.4 Duplicate Utility Functions

| Function | Locations |
|---|---|
| `sleep(ms)` | `lib/ai/robustness/retry.ts`, `lib/mailer/bulk-campaign.ts`, `scripts/test-azure-deployment.ts` |
| `chunk<T>(array, size)` | `lib/mailer/bulk-campaign.ts` (local), plus inline duplicates in other files |
| `getAvailableProviders()` | `lib/ai/provider-fallback.ts` (line 149) AND `lib/ai/robustness/health-check.ts` (line 93) |

### 3.5 Duplicate Provider Health Monitoring

| File | Exports |
|---|---|
| `lib/ai/provider-fallback.ts` | `getAvailableProviders()`, `getDetailedProviderStatus()`, `resetAllProviderState()` |
| `lib/ai/robustness/health-check.ts` | `getAvailableProviders()`, `ProviderHealthMonitor`, `getGlobalHealthMonitor()` |

These two files overlap in responsibility. They should be consolidated.

---

## 4. Dependency Issues

### 4.1 Unused Dependencies (Safe to Remove)

| Package | Reason |
|---|---|
| `@radix-ui/react-dialog` | No direct imports. Project uses `@base-ui/react/dialog` instead. May be transitively required by `cmdk` |
| `dns2` | Zero imports anywhere in codebase |
| `shadcn` | CLI scaffolding tool, never imported in source |

### 4.2 Missing Dependencies (Must Add)

| Package | Where Used | Type |
|---|---|---|
| `uuid` | `lib/swarm/` (7 files) | runtime |
| `@jest/globals` | 6 test files | dev |
| `ws` | `tests/utils/mock-server.ts` | dev |

**Note:** `@types/uuid` is in devDependencies but `uuid` itself is missing.

### 4.3 Dependencies Indirectly Required (False Positives)

| Package | Why It's Needed |
|---|---|
| `pino-pretty` | String target in `lib/logger.ts`: `pino.transport({ target: "pino-pretty", ... })` |
| `react-dom` | Peer dependency of Next.js |
| `prisma` | CLI tool + `scripts/run-prisma.js` dynamic require |
| `tailwindcss`, `@tailwindcss/postcss`, `tw-animate-css` | CSS imports / PostCSS config |
| `jest`, `jest-environment-jsdom`, `ts-jest` | Test infrastructure |
| All `@types/*` | TypeScript compilation |

---

## 5. Incorrectly Implemented Code

### 5.1 Import Path Inconsistency

- `app/api/admin/config/audit/route.ts` imports from `lib/config/audit`
- `lib/config-audit/analyzer.ts` exists but is **never imported**

The `config-audit/` directory appears to be an abandoned or superseded version.

### 5.2 Dead Subsystems with Active API Routes

Several API routes expose dead subsystems:
- `api/admin/payloads/*` -> `lib/payloads/` (unused)
- `api/admin/lateral-movement/*` -> `lib/post-exploitation/` (unused)
- `api/dpanel/implant/*` -> `lib/implants/` (unused in app)
- `api/admin/beacons/*` -> Beacon UI exists but beacon backend has minimal integration

These routes compile but their backing modules are not exercised by the frontend.

### 5.3 Deprecated Next.js Convention

Build warning:
```
The "middleware" file convention is deprecated. Please use "proxy" instead.
```

### 5.4 NFT Trace Warning

Build warning:
```
Turbopack build encountered 1 warnings:
./next.config.js
Encountered unexpected file in NFT list
```

Caused by dynamic filesystem operations in `app/api/admin/payloads/[id]/download/route.ts`.

---

## 6. Recommendations

### Priority 1: Remove Dead Code

1. **Delete `lib/swarm/` entirely** (15 files) -- completely unused
2. **Delete `lib/hooks/` entirely** (2 files) -- completely unused
3. **Delete `lib/payloads/` entirely** (2 files) -- completely unused
4. **Delete `lib/config-audit/` entirely** (1 file) -- superseded by `lib/config/audit.ts`
5. **Delete `lib/api/fetch-optimized.ts`** -- never imported
6. **Delete `lib/net/fetch.ts`** -- never imported
7. **Delete `lib/infrastructure/domain-fronting.ts`** -- never imported
8. **Delete `lib/infrastructure/proxy-rotation.ts`** -- never imported
9. **Delete `lib/infrastructure/monitoring.ts`** -- never imported
10. **Delete `lib/ai/startup.ts`** -- only referenced in docs
11. **Delete unused enhanced components:**
    - `components/admin/implants/enhanced-implants-view.tsx`
    - `components/admin/lotl/enhanced-lotl-arsenal-view.tsx`
    - `components/admin/profiles/enhanced-profiles-view.tsx`

### Priority 2: Consolidate Duplicates

1. **Merge `lib/grok/agent-runner.ts` into `agent-runner-enhanced.ts`** or delete the old one
2. **Merge `lib/ai/provider-fallback.ts` and `lib/ai/robustness/health-check.ts`** health functions
3. **Consolidate fetch wrappers** -- pick one implementation, delete the others
4. **Extract `sleep()` and `chunk()` into `lib/utils.ts`**

### Priority 3: Fix Dependencies

```bash
# Remove unused
npm uninstall dns2 shadcn

# Add missing
npm install uuid
npm install -D @jest/globals ws

# Evaluate: @radix-ui/react-dialog may be needed transitively by cmdk
```

### Priority 4: Address Build Warnings

1. Fix the deprecated `middleware` convention
2. Fix the NFT trace warning in `next.config.js` / `payloads/download/route.ts`

### Priority 5: Reconcile Dead Subsystems with Routes

Either:
- Wire up `lib/post-exploitation/`, `lib/implants/`, `lib/payloads/` to the frontend, OR
- Remove the API routes and frontend pages that expose these dead subsystems

---

## Summary Statistics

| Metric | Count |
|---|---|
| Total source files | ~400+ |
| Completely unused modules | ~50+ files |
| Unused dependencies | 3 |
| Missing dependencies | 3 |
| Duplicate implementations | 6+ |
| Build warnings | 2 |
| Dead components | 3 |
| Dead API routes (backing dead modules) | 8+ |
