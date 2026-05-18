import type { AiTemplate } from "@/lib/ai/types"

export const AI_TEMPLATES: AiTemplate[] = [
  {
    id: "optimize-packet-loss",
    label: "Optimize for high packet loss",
    description:
      "Generate a Hysteria2 config tuned for networks with high packet loss (satellite, mobile, congested links).",
    prompt:
      "Generate an optimized Hysteria2 server config for a network with high packet loss (10-30%). Use aggressive QUIC tuning, salamander obfuscation, and suggest appropriate bandwidth limits. Include comments explaining each optimization choice.",
    category: "config",
  },
  {
    id: "debug-tls",
    label: "Debug TLS certificate issues",
    description:
      "Run diagnostics on TLS configuration and suggest fixes for certificate problems.",
    prompt:
      "Troubleshoot my Hysteria2 TLS setup. Check the current server config for TLS issues, review recent logs for certificate errors, and suggest fixes. Focus on ACME/Let's Encrypt problems, certificate expiry, and domain mismatch issues.",
    category: "troubleshoot",
  },
  {
    id: "generate-subscription",
    label: "Generate subscription for user group",
    description:
      "List current users and nodes, then help generate subscription URLs for a group of users.",
    prompt:
      "Help me set up subscription URLs for my users. First, list the current nodes and users. Then explain how to generate subscription URLs that include the running nodes, and suggest the best format (Clash Meta, sing-box, or Hysteria2 native) for each platform.",
    category: "management",
  },
  {
    id: "rotate-stale-passwords",
    label: "Rotate stale node auth tokens",
    description:
      "Identify nodes with potentially stale authentication tokens and recommend rotation.",
    prompt:
      "Check all managed nodes and identify any that might need auth token rotation. List the nodes, their status, and when they were last updated. Suggest a rotation plan for any that look stale (not updated recently).",
    category: "management",
  },
  {
    id: "analyze-traffic",
    label: "Analyze current traffic patterns",
    description:
      "Pull live traffic data and identify anomalies, top users, and unusual patterns.",
    prompt:
      "Analyze the current traffic on my Hysteria2 infrastructure. Show me the top bandwidth consumers, total throughput, online client count, and flag any anomalies (expired users still connected, unusually high bandwidth, etc.).",
    category: "traffic",
  },
  {
    id: "suggest-masquerade",
    label: "Suggest masquerade configuration",
    description:
      "Get recommendations for masquerade proxy targets that blend with legitimate TLS traffic.",
    prompt:
      "Suggest masquerade configurations for my Hysteria2 nodes. Show me options across different categories (CDN, video streaming, cloud providers, general) and recommend the best choice for blending with normal TLS traffic. Then generate a sample server config snippet with the recommended masquerade settings.",
    category: "config",
  },
  {
    id: "throughput-diagnosis",
    label: "Diagnose low throughput",
    description:
      "Investigate why throughput might be lower than expected.",
    prompt:
      "I'm experiencing lower throughput than expected on my Hysteria2 setup. Run a full troubleshoot focusing on throughput issues. Check bandwidth limits, server status, and current traffic load. Suggest optimizations to improve speed.",
    category: "troubleshoot",
  },
  {
    id: "new-node-config",
    label: "Configure a new node",
    description:
      "Generate a complete server config for a new Hysteria2 node with best practices.",
    prompt:
      "Generate a production-ready Hysteria2 server configuration for a new node. Use ACME TLS with Let's Encrypt, salamander obfuscation, sensible bandwidth limits (100 Mbps up, 500 Mbps down), and a CDN masquerade. Include the traffic stats API and HTTP auth backend configuration. Also list the available profiles I can apply to this node.",
    category: "config",
  },
  {
    id: "payload-windows-stealth",
    label: "Build stealth Windows payload",
    description:
      "Generate an obfuscated Windows EXE with heavy obfuscation for red team operations.",
    prompt:
      "Generate a stealth Windows EXE payload with heavy obfuscation (string encoding, control flow, anti-debug). The payload should connect to our Hysteria2 infrastructure with auto-reconnect enabled. Include code signing if available. Explain the obfuscation techniques used and estimated build time.",
    category: "payload",
  },
  {
    id: "payload-linux-embedded",
    label: "Build Linux ELF for embedded systems",
    description:
      "Create a lightweight Linux payload for routers/IoT devices with static linking.",
    prompt:
      "Generate a lightweight Linux ELF payload optimized for embedded systems (routers, IoT). Use static linking with musl libc, minimal footprint, and light obfuscation. The binary should run on ARM and x86 architectures if possible. Explain the size optimization techniques.",
    category: "payload",
  },
  {
    id: "payload-macos-signed",
    label: "Build signed macOS app bundle",
    description:
      "Create a notarized macOS application bundle that passes Gatekeeper checks.",
    prompt:
      "Generate a macOS application bundle (Universal Binary for Intel + Apple Silicon) with code signing and notarization. The app should appear as a legitimate utility to pass Gatekeeper checks. Include proper Info.plist, app icon placeholders, and entitlements. Explain the signing requirements.",
    category: "payload",
  },
  {
    id: "payload-powershell-lotl",
    label: "Build PowerShell Living-off-the-Land",
    description:
      "Create a PowerShell script using native Windows tools for stealth execution.",
    prompt:
      "Generate a PowerShell payload that uses Living-off-the-Land techniques (certutil, bitsadmin, WMI) for stealth execution. Apply multiple layers of encoding and obfuscation. The script should download and execute the Hysteria2 client in memory without touching disk. Explain the LotL techniques used.",
    category: "payload",
  },
  {
    id: "payload-python-cross-platform",
    label: "Build cross-platform Python payload",
    description:
      "Create a Python payload that works on Windows, Linux, and macOS with asyncio.",
    prompt:
      "Generate a cross-platform Python payload using asyncio for concurrent connections. Include auto-reconnect logic, heartbeat keepalives, and fallback server support. Add bytecode obfuscation and explain how to bundle it with PyInstaller for distribution.",
    category: "payload",
  },
  {
    id: "list-payloads",
    label: "List my payload builds",
    description:
      "Show all payload builds with their current status and download links.",
    prompt:
      "List all my payload builds. Show the status of each (pending, building, ready, failed), their platform types, sizes, and provide download links for the ones that are ready. Also show any build errors for failed payloads.",
    category: "payload",
  },
  {
    id: "deploy-azure-eastus",
    label: "Deploy Azure VM to East US",
    description:
      "Provision a new Hysteria2 node on Azure in the East US region with pre-configured resource group.",
    prompt:
      "Deploy a new Azure VM with provider azure, region eastus, resourceGroup hysteria-rg-eastus, name hysteria-east-01, tags [c2, azure, eastus]. First check prerequisites, then proceed with deployment.",
    category: "deployment",
  },
  {
    id: "deploy-azure-westeurope",
    label: "Deploy Azure VM to West Europe",
    description:
      "Provision a new Hysteria2 node on Azure in the West Europe region with pre-configured resource group.",
    prompt:
      "Deploy a new Azure VM with provider azure, region westeurope, resourceGroup hysteria-rg-westeurope, name hysteria-west-01, tags [c2, azure, westeurope]. First check prerequisites, then proceed with deployment.",
    category: "deployment",
  },
  {
    id: "deploy-azure-australiaeast",
    label: "Deploy Azure VM to Australia East",
    description:
      "Provision a new Hysteria2 node on Azure in the Australia East region with pre-configured resource group.",
    prompt:
      "Deploy a new Azure VM with provider azure, region australiaeast, resourceGroup hysteria-rg-australiaeast, name hysteria-au-01, tags [c2, azure, australiaeast]. First check prerequisites, then proceed with deployment.",
    category: "deployment",
  },
  // Priority 1: Beacon Operations (Step 6)
  {
    id: "beacon-list",
    label: "List all beacons",
    description: "List all beacons with their status, last check-in time, and basic information.",
    prompt:
      "List all beacons in the system showing their status (online/offline/stale), hostname, username, OS, IP address, and last check-in time. Group by status and provide a summary count.",
    category: "beacon",
  },
  {
    id: "beacon-details",
    label: "Get beacon details",
    description: "Get detailed information about a specific beacon including host info, network adapters, and system details.",
    prompt:
      "Get detailed information for beacon {{BeaconID}}. Show host information, system details, user context, network adapters, and recent activity. If {{BeaconID}} is not provided, list available beacons first.",
    category: "beacon",
  },
  {
    id: "beacon-screenshot",
    label: "Capture beacon screenshot",
    description: "Capture a live screenshot from the specified beacon.",
    prompt:
      "Capture a live screenshot from beacon {{BeaconID}}. If {{BeaconID}} is not provided, list available beacons first. Display the screenshot or provide a download link.",
    category: "beacon",
  },
  {
    id: "beacon-shell",
    label: "Execute shell command",
    description: "Execute a shell command on the specified beacon.",
    prompt:
      "Execute the shell command '{{Command}}' on beacon {{BeaconID}}. If {{BeaconID}} is not provided, list available beacons first. Show the command output and exit code.",
    category: "beacon",
  },
  {
    id: "beacon-kill",
    label: "Kill beacon",
    description: "Terminate the beacon process on the target system.",
    prompt:
      "Kill beacon {{BeaconID}}. This will terminate the beacon process on the target system. If {{BeaconID}} is not provided, list available beacons first. Confirm before executing.",
    category: "beacon",
  },
  // Priority 1: Post-Exploitation (Step 7)
  {
    id: "post-exp-triage",
    label: "Phase 0 Triage",
    description: "Execute initial triage workflow: screenshot, quick recon, and OPSEC assessment.",
    prompt:
      "Execute Phase 0 triage on beacon {{BeaconID}}: 1) Capture screenshot, 2) Run quick reconnaissance (system info, running processes, network connections), 3) Assess OPSEC score. Provide a summary and risk assessment before proceeding with further actions.",
    category: "post-exploitation",
  },
  {
    id: "post-exp-credentials",
    label: "Credential harvesting",
    description: "Harvest credentials from the target system using various techniques.",
    prompt:
      "Execute credential harvesting on beacon {{BeaconID}}. Attempt LSASS memory dump, browser credential extraction, DPAPI decryption, and credential vault storage. Provide a summary of harvested credentials.",
    category: "post-exploitation",
  },
  {
    id: "post-exp-escalation",
    label: "Privilege escalation",
    description: "Attempt privilege escalation using various techniques.",
    prompt:
      "Attempt privilege escalation on beacon {{BeaconID}}. Try token impersonation, UAC bypass techniques, and assess kernel exploit opportunities. Report current and new privilege levels if successful.",
    category: "post-exploitation",
  },
  {
    id: "post-exp-persistence",
    label: "Establish persistence",
    description: "Establish persistence on the target system using multiple methods.",
    prompt:
      "Establish persistence on beacon {{BeaconID}}. Implement registry run keys, scheduled tasks, and WMI event subscriptions. Provide a summary of persistence mechanisms established.",
    category: "post-exploitation",
  },
  {
    id: "post-exp-full-workflow",
    label: "Full OPSEC-aware workflow",
    description: "Execute complete post-exploitation workflow with OPSEC considerations.",
    prompt:
      "Execute full OPSEC-aware post-exploitation workflow on beacon {{BeaconID}}: triage → credentials → escalation → persistence → AD reconnaissance → lateral movement. Assess OPSEC score before each phase and report findings per phase. Use approval gates for high-risk operations.",
    category: "post-exploitation",
  },
  // Priority 1: Cleanup & OpSec (Step 11)
  {
    id: "cleanup-remove-persistence",
    label: "Remove persistence",
    description: "Remove all persistence mechanisms from specified beacons.",
    prompt:
      "Remove all persistence mechanisms from beacons {{BeaconIDList}}. Clean up registry run keys, scheduled tasks, WMI subscriptions, and other persistence methods. Confirm each removal.",
    category: "cleanup",
  },
  {
    id: "cleanup-export-data",
    label: "Export collected data",
    description: "Export all collected data (credentials, files, logs) from the operation.",
    prompt:
      "Export all collected data from the operation including credentials, files, and logs. Package the data and provide download links or save to a specified location.",
    category: "cleanup",
  },
  {
    id: "cleanup-clear-logs",
    label: "Clear logs",
    description: "Clear logs on compromised hosts to remove evidence of activity.",
    prompt:
      "Clear logs on beacons {{BeaconIDList}}. Remove Windows event logs, PowerShell history, and other evidence of activity. Confirm each log clearing operation.",
    category: "cleanup",
  },
  {
    id: "cleanup-retire-beacons",
    label: "Retire beacons",
    description: "Safely retire and remove beacons from the system.",
    prompt:
      "Safely retire beacons {{BeaconIDList}}. Remove persistence, clear logs, and then terminate the beacon processes. Confirm each beacon retirement.",
    category: "cleanup",
  },
  {
    id: "cleanup-full-operation",
    label: "Full operation cleanup",
    description: "Execute complete operation cleanup workflow.",
    prompt:
      "Execute full operation cleanup for beacons {{BeaconIDList}}: 1) Remove all persistence, 2) Export collected data, 3) Clear logs on hosts, 4) Retire beacons, 5) Rotate node credentials, 6) Archive operation record. Confirm each step.",
    category: "cleanup",
  },
  // Priority 2: Setup & Installation (Step 1)
  {
    id: "setup-prerequisites",
    label: "Check system prerequisites",
    description: "Verify all system prerequisites for the Hysteria2 C2 framework are properly configured.",
    prompt:
      "Check system prerequisites: Node.js version, PostgreSQL connection, Git availability, and optional dependencies (Docker, Redis). Report any missing prerequisites and provide installation instructions.",
    category: "setup",
  },
  {
    id: "setup-env-config",
    label: "Configure environment variables",
    description: "Review and configure critical environment variables for the Hysteria2 C2 framework.",
    prompt:
      "Review current environment variables configuration. Check for required variables: DATABASE_URL, JWT_SECRET, XAI_API_KEY, HYSTERIA_TRAFFIC_API_BASE_URL, VIRUSTOTAL_API_KEY. Report any missing or misconfigured variables and provide guidance.",
    category: "setup",
  },
  {
    id: "setup-database",
    label: "Initialize database",
    description: "Initialize the database, run migrations, and set up the admin user.",
    prompt:
      "Initialize the database: run Prisma migrations, generate Prisma client, and ensure admin user is set up. Report database connection status and any issues encountered.",
    category: "setup",
  },
  // Priority 2: OSINT & Threat Intelligence (Step 9)
  {
    id: "osint-subdomain-discovery",
    label: "Subdomain discovery",
    description: "Discover subdomains for a target domain using Certificate Transparency logs.",
    prompt:
      "Perform subdomain discovery for domain {{Domain}} using crt.sh Certificate Transparency logs. List all discovered subdomains and identify any interesting or unexpected subdomains.",
    category: "osint",
  },
  {
    id: "osint-dns-enum",
    label: "DNS enumeration",
    description: "Perform comprehensive DNS enumeration for a target domain.",
    prompt:
      "Perform DNS enumeration for domain {{Domain}}. Query A, AAAA, MX, NS, TXT, CNAME, and SOA records. Provide a summary of the DNS infrastructure.",
    category: "osint",
  },
  {
    id: "osint-whois",
    label: "WHOIS lookup",
    description: "Perform WHOIS lookup to get registration details for a domain.",
    prompt:
      "Perform WHOIS lookup for domain {{Domain}}. Extract and display registration details including registrar, creation date, expiration date, and name servers.",
    category: "osint",
  },
  {
    id: "threat-virustotal",
    label: "VirusTotal reputation check",
    description: "Check reputation of IP, domain, URL, or file hash using VirusTotal API.",
    prompt:
      "Check VirusTotal reputation for {{Target}} (IP, domain, URL, or file hash). Provide detection ratios, last analysis date, and any relevant security vendor detections.",
    category: "threat-intel",
  },
  {
    id: "threat-otx",
    label: "AlienVault OTX correlation",
    description: "Check threat intelligence using AlienVault OTX for IOC correlation.",
    prompt:
      "Query AlienVault OTX for {{Target}} (IP, domain, or hash). Provide related pulses, malware associations, and any threat intelligence correlations.",
    category: "threat-intel",
  },
  // Priority 3: Payload Deployment (Step 5)
  {
    id: "deploy-phishing-campaign",
    label: "Set up phishing campaign",
    description: "Configure and set up a phishing campaign using the mail module.",
    prompt:
      "Set up a phishing campaign using the mail module. Configure sender details, upload email list (CSV), select payload attachment or hosted link, set rate limiting, and configure proxy routing. Provide a summary of the campaign configuration.",
    category: "deployment",
  },
  {
    id: "deploy-redirector",
    label: "Configure redirector chain",
    description: "Configure a redirector chain for payload delivery through obfuscated nodes.",
    prompt:
      "Configure a redirector chain for payload delivery. Select obfuscated nodes to use as redirectors, configure routing rules, and set up the delivery path. Test the chain and provide a summary.",
    category: "deployment",
  },
  // Infrastructure Monitoring Enhancements (Step 10)
  {
    id: "infra-dashboard",
    label: "Infrastructure dashboard overview",
    description: "Get a comprehensive overview of infrastructure status including node health and active beacons.",
    prompt:
      "Get infrastructure dashboard overview: show node health (online/offline/stale), bandwidth usage per node and aggregate, active beacon count and status, recent activity feed, and audit log summary.",
    category: "infrastructure",
  },
  {
    id: "infra-health-check",
    label: "Run health checks",
    description: "Run health checks on infrastructure including ICMP, TCP, and HTTP endpoint monitoring.",
    prompt:
      "Run health checks on all infrastructure nodes. Perform ICMP ping, TCP port checks, and HTTP endpoint monitoring. Report the health status of each node and identify any issues.",
    category: "infrastructure",
  },
  {
    id: "infra-maintenance-rotate-credentials",
    label: "Rotate infrastructure credentials",
    description: "Rotate credentials for infrastructure components including node auth and API keys.",
    prompt:
      "Rotate credentials for infrastructure components. Identify nodes and services with stale credentials, generate new credentials, and update configurations. Provide a summary of rotated credentials.",
    category: "infrastructure",
  },
]
