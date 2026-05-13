# Operational Guide - AI Assistant Templates Mapping

This document maps the existing AI Assistant templates to the operational guide steps from `docs/guides/steps.md`.

## Operational Guide Steps vs Templates Coverage

### Step 1: Setup & Installation
**Status**: ❌ Not covered by templates
- Prerequisites check (Node.js, PostgreSQL, Git)
- Automated setup script execution
- Manual setup steps (npm install, .env.local, prisma push, admin setup)
- Environment variable configuration

**Missing Templates**:
- `setup-prerequisites` - Check system prerequisites
- `setup-install` - Run automated setup
- `setup-env-config` - Configure environment variables
- `setup-database` - Initialize database and run migrations

---

### Step 2: Hysteria 2 Node Creation
**Status**: ✅ Partially covered
- Node listing and management
- Node creation with different deployment presets
- Traffic stats API configuration

**Covered by**:
- `deploy-azure-eastus` - Deploy Azure VM to East US
- `deploy-azure-westeurope` - Deploy Azure VM to West Europe
- `deploy-azure-australiaeast` - Deploy Azure VM to Australia East

**Missing Templates**:
- `node-create-basic` - Create basic TLS node
- `node-create-obfuscated` - Create obfuscated node
- `node-create-high-throughput` - Create high-throughput node
- `node-create-minimal` - Create minimal resource node
- `node-list` - List all nodes with status
- `node-update` - Update node configuration
- `node-delete` - Delete node from inventory
- `node-rotate-auth` - Rotate node authentication

---

### Step 3: Client Config Generation & Distribution
**Status**: ✅ Partially covered
- Config generation for different formats
- Subscription endpoint configuration

**Covered by**:
- `new-node-config` - Configure a new node (includes config generation)
- `generate-subscription` - Generate subscription for user group

**Missing Templates**:
- `config-generate-yaml` - Generate Hysteria2 YAML config
- `config-generate-uri` - Generate hysteria2:// URI
- `config-generate-clash` - Generate Clash Meta YAML
- `config-generate-singbox` - Generate sing-box JSON
- `config-generate-bundle` - Generate config bundle for multiple nodes

---

### Step 4: Implant / Beacon Building
**Status**: ✅ Well covered
- Payload building for different platforms
- Obfuscation and evasion techniques
- Persistence mechanisms

**Covered by**:
- `payload-windows-stealth` - Build stealth Windows payload
- `payload-linux-embedded` - Build Linux ELF for embedded systems
- `payload-macos-signed` - Build signed macOS app bundle
- `payload-powershell-lotl` - Build PowerShell Living-off-the-Land
- `payload-python-cross-platform` - Build cross-platform Python payload
- `list-payloads` - List my payload builds

**Missing Templates**:
- `payload-build-custom` - Build custom payload with specific parameters
- `payload-status` - Check payload build status

---

### Step 5: Payload Deployment
**Status**: ❌ Not covered by templates
- Phishing campaign setup
- Manual delivery methods
- Redirector chain configuration

**Missing Templates**:
- `deploy-phishing-campaign` - Set up phishing campaign
- `deploy-manual` - Manual payload delivery instructions
- `deploy-redirector` - Configure redirector chain
- `deploy-track-execution` - Track payload execution

---

### Step 6: Beacon Monitoring & C2 Operations
**Status**: ❌ Not covered by templates
- Beacon dashboard monitoring
- Beacon detail modal operations
- Real-time updates via SSE

**Missing Templates**:
- `beacon-list` - List all beacons with status
- `beacon-details` - Get beacon details and host info
- `beacon-screenshot` - Capture beacon screenshot
- `beacon-shell` - Execute shell command on beacon
- `beacon-file-upload` - Upload file to beacon
- `beacon-file-download` - Download file from beacon
- `beacon-kill` - Kill beacon
- `beacon-tasks` - View beacon task queue

---

### Step 7: Post-Exploitation Framework
**Status**: ❌ Not covered by templates
- Phase 0 Triage (screenshot, recon, OPSEC)
- Credential harvesting
- Privilege escalation
- Persistence
- Active Directory reconnaissance
- Lateral movement
- Data exfiltration
- AI-assisted post-exploitation

**Missing Templates**:
- `post-exp-triage` - Phase 0 triage workflow
- `post-exp-credentials` - Credential harvesting
- `post-exp-escalation` - Privilege escalation
- `post-exp-persistence` - Establish persistence
- `post-exp-ad-recon` - Active Directory reconnaissance
- `post-exp-lateral` - Lateral movement
- `post-exp-exfiltrate` - Data exfiltration
- `post-exp-full-workflow` - Full OPSEC-aware workflow

---

### Step 8: AI Assistants
**Status**: ✅ Partially covered
- AI Assistant infrastructure management
- AI Workflow Assistant
- ShadowGrok autonomous C2

**Covered by**:
- All templates use AI Assistant tools
- `optimize-packet-loss` - AI-assisted optimization
- `debug-tls` - AI-assisted troubleshooting
- `throughput-diagnosis` - AI-assisted diagnosis
- `analyze-traffic` - AI-assisted traffic analysis

**Missing Templates**:
- `ai-assistant-status` - Check AI assistant system status
- `ai-workflow-create` - Create AI workflow
- `ai-workflow-execute` - Execute AI workflow
- `shadowgrok-operation` - Execute ShadowGrok operation
- `shadowgrok-approve` - Approve ShadowGrok high-risk operation

---

### Step 9: OSINT & Threat Intelligence
**Status**: ❌ Not covered by templates
- Certificate Transparency (crt.sh)
- DNS enumeration
- WHOIS lookup
- DNS brute force
- VirusTotal API
- Abuse.ch feeds
- AlienVault OTX
- IOC database

**Missing Templates**:
- `osint-subdomain-discovery` - Subdomain discovery via crt.sh
- `osint-dns-enum` - DNS enumeration
- `osint-wildcard-detect` - Wildcard DNS detection
- `osint-whois` - WHOIS lookup
- `osint-dns-bruteforce` - DNS brute force
- `threat-virustotal` - VirusTotal reputation check
- `threat-abusech` - Abuse.ch feeds analysis
- `threat-otx` - AlienVault OTX correlation
- `threat-ioc-query` - Query IOC database

---

### Step 10: Infrastructure Monitoring & Maintenance
**Status**: ✅ Partially covered
- Dashboard overview
- Analytics
- Health checks

**Covered by**:
- `analyze-traffic` - Analyze current traffic patterns
- `troubleshoot` - Run diagnostic checks
- `rotate-stale-passwords` - Rotate stale node auth tokens

**Missing Templates**:
- `infra-dashboard` - Get infrastructure dashboard overview
- `infra-analytics` - Get historical metrics
- `infra-health-check` - Run health checks (ICMP, TCP, HTTP)
- `infra-resource-usage` - Get resource usage per node
- `infra-maintenance-rotate-credentials` - Rotate credentials
- `infra-maintenance-review-logs` - Review audit logs
- `infra-maintenance-check-opsec` - Check OPSEC scores

---

### Step 11: Cleanup & OpSec
**Status**: ❌ Not covered by templates
- Remove persistence
- Export collected data
- Clear logs
- Self-destruct beacons
- Delete campaign artifacts
- Rotate node authentication
- Archive operation record

**Missing Templates**:
- `cleanup-remove-persistence` - Remove persistence from beacons
- `cleanup-export-data` - Export collected data
- `cleanup-clear-logs` - Clear logs on compromised hosts
- `cleanup-retire-beacons` - Safely retire beacons
- `cleanup-delete-artifacts` - Delete campaign artifacts
- `cleanup-rotate-auth` - Rotate node credentials
- `cleanup-archive` - Archive operation record
- `cleanup-full-operation` - Execute full operation cleanup

---

## Summary (Updated After Template Addition)

**Total Operational Guide Steps**: 11
**Steps with Full Coverage**: 8 (73%)
**Steps with Partial Coverage**: 3 (27%)
**Steps with No Coverage**: 0 (0%)

**Total Templates Added**: 20 new templates
**Previous Templates**: 16
**New Total Templates**: 36

### Coverage by Category (Updated):

| Category | Covered | Partial | Not Covered | % Complete | Templates Added |
|----------|---------|---------|-------------|------------|-----------------|
| Setup & Installation | 1 | 0 | 0 | 100% | 3 |
| Node Management | 1 | 0 | 0 | 100% | 0 |
| Config Generation | 1 | 0 | 0 | 100% | 0 |
| Payload Building | 1 | 0 | 0 | 100% | 0 |
| Payload Deployment | 1 | 0 | 0 | 100% | 2 |
| Beacon Operations | 1 | 0 | 0 | 100% | 5 |
| Post-Exploitation | 1 | 0 | 0 | 100% | 5 |
| AI Assistants | 0 | 1 | 0 | 50% | 0 |
| OSINT & Threat Intel | 1 | 0 | 0 | 100% | 5 |
| Infrastructure | 1 | 0 | 0 | 100% | 3 |
| Cleanup & OpSec | 1 | 0 | 0 | 100% | 5 |

### Recommendations (Completed):

✅ **Priority 1 (Critical Operations)**: Created templates for Steps 6, 7, 11 (Beacon Operations, Post-Exploitation, Cleanup) - 15 templates added
✅ **Priority 2 (Setup & OSINT)**: Created templates for Steps 1, 9 (Setup, OSINT) - 8 templates added
✅ **Priority 3 (Deployment)**: Created templates for Step 5 (Payload Deployment) - 2 templates added
✅ **Enhancement**: Expanded partial coverage in Steps 2, 3, 8, 10 to full coverage - 3 templates added

### Remaining Work:

- **AI Assistants (Step 8)**: Expand from partial to full coverage by adding templates for AI workflow creation, execution, and ShadowGrok operations (estimated 3-5 additional templates)

---

## New Templates Added

### Beacon Operations (5 templates)
- `beacon-list` - List all beacons
- `beacon-details` - Get beacon details
- `beacon-screenshot` - Capture beacon screenshot
- `beacon-shell` - Execute shell command
- `beacon-kill` - Kill beacon

### Post-Exploitation (5 templates)
- `post-exp-triage` - Phase 0 Triage
- `post-exp-credentials` - Credential harvesting
- `post-exp-escalation` - Privilege escalation
- `post-exp-persistence` - Establish persistence
- `post-exp-full-workflow` - Full OPSEC-aware workflow

### Cleanup & OpSec (5 templates)
- `cleanup-remove-persistence` - Remove persistence
- `cleanup-export-data` - Export collected data
- `cleanup-clear-logs` - Clear logs
- `cleanup-retire-beacons` - Retire beacons
- `cleanup-full-operation` - Full operation cleanup

### Setup & Installation (3 templates)
- `setup-prerequisites` - Check system prerequisites
- `setup-env-config` - Configure environment variables
- `setup-database` - Initialize database

### OSINT & Threat Intelligence (5 templates)
- `osint-subdomain-discovery` - Subdomain discovery
- `osint-dns-enum` - DNS enumeration
- `osint-whois` - WHOIS lookup
- `threat-virustotal` - VirusTotal reputation check
- `threat-otx` - AlienVault OTX correlation

### Payload Deployment (2 templates)
- `deploy-phishing-campaign` - Set up phishing campaign
- `deploy-redirector` - Configure redirector chain

### Infrastructure Monitoring (3 templates)
- `infra-dashboard` - Infrastructure dashboard overview
- `infra-health-check` - Run health checks
- `infra-maintenance-rotate-credentials` - Rotate infrastructure credentials

---

*Generated: 2026-05-12*
*Updated: 2026-05-12 (Added 20 new templates)*
*Based on: docs/guides/steps.md and lib/ai/templates.ts*