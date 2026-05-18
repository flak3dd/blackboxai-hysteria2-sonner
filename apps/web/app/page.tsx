import Link from "next/link"
import {
  ArrowRight, Terminal, Shield, Activity, Network,
  Zap, Cpu, Globe, Lock, Database,
} from "lucide-react"

const capabilities = [
  {
    icon: Network,
    title: "Infrastructure Mgmt",
    desc: "Deploy and manage distributed infrastructure with advanced networking and real-time telemetry across all nodes.",
    num: "01",
  },
  {
    icon: Terminal,
    title: "Command & Control",
    desc: "Secure C2 channels with encrypted communication. Multi-protocol — Hysteria2, HTTP/S, DNS — all in one console.",
    num: "02",
  },
  {
    icon: Activity,
    title: "Real-time Analytics",
    desc: "Live dashboards and comprehensive reporting. Full telemetry stream from every connected agent at sub-second latency.",
    num: "03",
  },
  {
    icon: Zap,
    title: "AI Automation",
    desc: "Intelligent workflow automation with AI-assisted decision making. Automate recon, staging, and exfil pipelines.",
    num: "04",
  },
  {
    icon: Cpu,
    title: "Payload Management",
    desc: "Generate, customize, and deploy payloads across multiple platforms, architectures, and evasion profiles.",
    num: "05",
  },
  {
    icon: Globe,
    title: "OSINT Integration",
    desc: "Open-source intelligence gathering and automated data collection. Correlate targets across multiple data sources.",
    num: "06",
  },
]

const securityFeatures = [
  {
    icon: Lock,
    title: "E2E Encryption",
    desc: "TLS 1.3 with certificate pinning. All communications encrypted at rest and in transit.",
  },
  {
    icon: Database,
    title: "Audit Logging",
    desc: "Comprehensive activity logs for compliance and forensic analysis. Tamper-evident chain of custody.",
  },
  {
    icon: Shield,
    title: "Access Control",
    desc: "Role-based permissions with MFA. Session-bound tokens, no persistent credentials stored.",
  },
  {
    icon: Activity,
    title: "OPSEC Features",
    desc: "Built-in operational security enforcement. Traffic shaping, timing jitter, and attribution hardening.",
  },
]

const agents = [
  { name: "agent-001", status: "ACTIVE",  ip: "10.0.1.42",   os: "linux/x64"  },
  { name: "agent-002", status: "ACTIVE",  ip: "172.16.8.7",  os: "win/x64"    },
  { name: "agent-003", status: "IDLE",    ip: "192.168.1.99",os: "darwin/arm" },
  { name: "agent-004", status: "ACTIVE",  ip: "10.0.2.11",   os: "linux/x64"  },
]

const listeners = [
  { proto: "HYSTERIA2", port: "4443" },
  { proto: "HTTP/HTTPS", port: "8080" },
]

export default function Home() {
  return (
    <div className="min-h-screen bg-[#080C0F] text-white overflow-x-hidden">

      {/* ── Classification banner ── */}
      <div className="bg-amber-400/8 border-b border-amber-400/20">
        <p className="font-mono text-[10px] text-amber-400/70 tracking-[0.35em] uppercase text-center py-1.5 px-4">
          // AUTHORIZED PERSONNEL ONLY — ALL SESSIONS MONITORED AND RECORDED //
        </p>
      </div>

      {/* ── Header ── */}
      <header className="relative z-20 border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">

          <div className="flex items-center gap-3">
            <div className="w-5 h-5 border border-teal-400/60 rotate-45 flex items-center justify-center">
              <div className="w-2 h-2 bg-teal-400" />
            </div>
            <span className="font-display text-xl text-white tracking-[0.12em]">D-PANEL</span>
            <span className="font-mono text-[10px] text-teal-400/60 tracking-[0.2em] pt-0.5">// OPS</span>
          </div>

          <nav className="hidden md:flex items-center gap-8">
            {["Capabilities", "Security"].map(item => (
              <a
                key={item}
                href={`#${item.toLowerCase()}`}
                className="font-mono text-[10px] text-white/30 hover:text-white/70 tracking-[0.25em] uppercase transition-colors duration-200"
              >
                {item}
              </a>
            ))}
          </nav>

          <Link href="/login">
            <span className="inline-flex items-center gap-2 font-mono text-[10px] tracking-[0.25em] uppercase border border-teal-400/40 text-teal-400 px-4 py-2 hover:bg-teal-400/8 hover:border-teal-400/70 transition-all duration-200 cursor-pointer">
              ACCESS <ArrowRight className="w-2.5 h-2.5" />
            </span>
          </Link>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="relative min-h-[88vh] flex items-center">
        {/* Grid */}
        <div className="absolute inset-0 landing-grid-bg" />
        {/* Noise */}
        <div className="absolute inset-0 landing-noise pointer-events-none" />
        {/* Glow orb */}
        <div className="absolute top-1/2 right-[30%] -translate-y-1/2 w-[700px] h-[500px] bg-teal-400/4 rounded-full blur-[140px] pointer-events-none" />
        {/* Hard left edge line */}
        <div className="absolute left-0 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-teal-400/20 to-transparent" />

        <div className="relative z-10 max-w-7xl mx-auto px-6 w-full py-24">
          <div className="grid lg:grid-cols-[1fr_420px] xl:grid-cols-[1fr_480px] gap-12 xl:gap-20 items-center">

            {/* ── Left: Hero copy ── */}
            <div>
              {/* Badge */}
              <div className="landing-hero-badge flex items-center gap-2.5 mb-10">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-50" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-400" />
                </span>
                <span className="font-mono text-[10px] text-amber-400/80 tracking-[0.3em] uppercase">
                  SEC-CLASS: RESTRICTED
                </span>
                <span className="font-mono text-[10px] text-white/15 tracking-[0.3em]">|</span>
                <span className="font-mono text-[10px] text-white/30 tracking-[0.2em] uppercase">
                  REV 4.2.1-stable
                </span>
              </div>

              {/* Title */}
              <h1 className="mb-10 leading-none">
                <span className="landing-hero-line-1 block font-display text-[clamp(4rem,10vw,8.5rem)] text-white tracking-[0.04em]">
                  Red Team
                </span>
                <span className="landing-hero-line-2 block font-display text-[clamp(4rem,10vw,8.5rem)] tracking-[0.04em] text-transparent bg-clip-text"
                  style={{ backgroundImage: "linear-gradient(135deg, #2DD4BF 10%, #22D3EE 90%)" }}
                >
                  Operations
                </span>
                <span className="landing-hero-line-3 block font-display text-[clamp(4rem,10vw,8.5rem)] text-white/20 tracking-[0.04em]">
                  Platform
                </span>
              </h1>

              {/* Body */}
              <p className="landing-hero-body font-mono text-[13px] text-white/45 leading-relaxed max-w-lg mb-10">
                Advanced command and control infrastructure for security testing and red team operations.
                Built for operators who demand precision, not convenience.
              </p>

              {/* CTA row */}
              <div className="landing-hero-cta flex items-center gap-6 mb-16">
                <Link href="/login">
                  <span className="group inline-flex items-center gap-3 bg-teal-400 text-[#080C0F] font-mono text-[11px] tracking-[0.2em] uppercase px-7 py-3.5 font-bold hover:bg-teal-300 transition-colors duration-200 cursor-pointer">
                    ACCESS DASHBOARD
                    <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform duration-150" />
                  </span>
                </Link>
                <a
                  href="#capabilities"
                  className="font-mono text-[10px] text-white/30 hover:text-white/60 tracking-[0.25em] uppercase transition-colors duration-200"
                >
                  VIEW CAPABILITIES →
                </a>
              </div>

              {/* Stats */}
              <div className="landing-hero-stats border-t border-white/6 pt-8 grid grid-cols-3 gap-6">
                {[
                  { label: "Protocols", value: "12+" },
                  { label: "Encryption", value: "E2E" },
                  { label: "Latency",    value: "<50ms" },
                ].map(stat => (
                  <div key={stat.label}>
                    <div className="font-display text-3xl text-teal-400 tracking-wider mb-1">{stat.value}</div>
                    <div className="font-mono text-[9px] text-white/25 tracking-[0.3em] uppercase">{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* ── Right: Terminal panel ── */}
            <div className="landing-terminal hidden lg:block">
              {/* Outer border with corner accents */}
              <div className="relative border border-white/10 bg-[#0A0E12]">
                {/* Corner marks */}
                <span className="absolute -top-px -left-px w-3 h-3 border-t border-l border-teal-400/50" />
                <span className="absolute -top-px -right-px w-3 h-3 border-t border-r border-teal-400/50" />
                <span className="absolute -bottom-px -left-px w-3 h-3 border-b border-l border-teal-400/50" />
                <span className="absolute -bottom-px -right-px w-3 h-3 border-b border-r border-teal-400/50" />

                {/* Title bar */}
                <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/6 bg-white/[0.025]">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-red-500/60" />
                    <span className="w-2 h-2 rounded-full bg-yellow-500/60" />
                    <span className="w-2 h-2 rounded-full bg-green-500/60" />
                  </div>
                  <span className="font-mono text-[10px] text-white/25 tracking-wider">d-panel-ops // live</span>
                  <span className="font-mono text-[9px] text-teal-400/60 tracking-widest">ENCRYPTED</span>
                </div>

                {/* Body */}
                <div className="p-5 space-y-4 font-mono text-[11px] leading-relaxed">

                  {/* Connection */}
                  <div className="space-y-1">
                    <p className="text-white/25">$ connect --server ops.d-panel.internal --tls</p>
                    <p className="text-teal-400">✓ TLS 1.3 handshake — 12ms</p>
                    <p className="text-teal-400">✓ Identity verified [JWT + TOTP]</p>
                    <p className="text-teal-400">✓ Session established</p>
                  </div>

                  <div className="border-t border-white/5 pt-4">
                    <p className="text-white/25 mb-2">$ status --agents --verbose</p>
                    <div className="space-y-1.5">
                      {agents.map(a => (
                        <div key={a.name} className="flex items-center gap-2">
                          <span
                            className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                              a.status === "ACTIVE"
                                ? "bg-teal-400"
                                : "bg-white/20"
                            }`}
                          />
                          <span className="text-white/50 w-20 flex-shrink-0">{a.name}</span>
                          <span
                            className={`w-14 flex-shrink-0 ${
                              a.status === "ACTIVE" ? "text-teal-400" : "text-white/25"
                            }`}
                          >
                            {a.status}
                          </span>
                          <span className="text-white/25 w-24 flex-shrink-0">{a.ip}</span>
                          <span className="text-white/20 text-[10px]">{a.os}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="border-t border-white/5 pt-4">
                    <p className="text-white/25 mb-2">$ listeners --list</p>
                    <div className="space-y-1">
                      {listeners.map(l => (
                        <div key={l.proto} className="flex items-center gap-3">
                          <span className="text-amber-400/80 w-24 flex-shrink-0">{l.proto}</span>
                          <span className="text-white/40">:{l.port}</span>
                          <span className="text-teal-400 text-[10px] tracking-wider">[LISTENING]</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Prompt */}
                  <div className="border-t border-white/5 pt-3 flex items-center gap-1.5">
                    <span className="text-teal-400">$</span>
                    <span className="text-white/50">_</span>
                    <span className="landing-cursor inline-block w-[7px] h-[13px] bg-teal-400/80" />
                  </div>
                </div>
              </div>

              {/* Sub-label below terminal */}
              <p className="mt-3 text-right font-mono text-[9px] text-white/15 tracking-[0.3em] uppercase">
                LIVE SESSION VIEW — DEMO DATA
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Capabilities ── */}
      <section id="capabilities" className="relative py-28 border-t border-white/5">
        <div className="max-w-7xl mx-auto px-6">

          <div className="flex items-center gap-5 mb-16">
            <div className="h-px flex-1 bg-white/5" />
            <p className="font-mono text-[10px] text-white/25 tracking-[0.35em] uppercase">
              // 01. CAPABILITIES
            </p>
            <div className="h-px flex-1 bg-white/5" />
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-px bg-white/5">
            {capabilities.map((cap, i) => (
              <div
                key={i}
                className="landing-feature-cell bg-[#080C0F] p-8 group hover:bg-white/[0.018] transition-colors duration-300"
              >
                <div className="flex items-start justify-between mb-6">
                  <div className="w-9 h-9 border border-teal-400/20 group-hover:border-teal-400/50 flex items-center justify-center transition-colors duration-300">
                    <cap.icon className="w-4 h-4 text-teal-400/50 group-hover:text-teal-400 transition-colors duration-300" />
                  </div>
                  <span className="font-mono text-[10px] text-white/15 tracking-widest">{cap.num}</span>
                </div>
                <h3 className="font-display text-xl text-white tracking-wider mb-3 group-hover:text-teal-400/90 transition-colors duration-300">
                  {cap.title.toUpperCase()}
                </h3>
                <p className="font-mono text-[11px] text-white/35 leading-relaxed">{cap.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Security ── */}
      <section id="security" className="py-28 border-t border-white/5">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-16 xl:gap-24 items-start">

            {/* Left */}
            <div className="lg:sticky lg:top-20">
              <p className="font-mono text-[10px] text-white/25 tracking-[0.35em] uppercase mb-5">
                // 02. SECURITY
              </p>
              <h2 className="font-display text-[clamp(3rem,6vw,5.5rem)] leading-none text-white tracking-wider mb-6">
                BUILT FOR<br />
                <span
                  className="text-transparent bg-clip-text"
                  style={{ backgroundImage: "linear-gradient(135deg, #2DD4BF 10%, #22D3EE 90%)" }}
                >
                  OPERATORS
                </span>
              </h2>
              <p className="font-mono text-[12px] text-white/35 leading-relaxed max-w-sm">
                Every layer of the stack hardened for operational security.
                Designed to survive hostile environments and adversarial scrutiny.
              </p>
            </div>

            {/* Right: security feature grid */}
            <div className="grid grid-cols-2 gap-px bg-white/5">
              {securityFeatures.map((f, i) => (
                <div key={i} className="bg-[#080C0F] p-6 hover:bg-white/[0.018] transition-colors duration-300 group">
                  <div className="w-8 h-8 border border-teal-400/15 group-hover:border-teal-400/40 flex items-center justify-center mb-5 transition-colors duration-300">
                    <f.icon className="w-3.5 h-3.5 text-teal-400/50 group-hover:text-teal-400 transition-colors duration-300" />
                  </div>
                  <div className="font-display text-base text-white tracking-wider mb-2 group-hover:text-teal-400/90 transition-colors duration-300">
                    {f.title.toUpperCase()}
                  </div>
                  <div className="font-mono text-[10px] text-white/30 leading-relaxed">{f.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-28 border-t border-white/5">
        <div className="relative max-w-7xl mx-auto px-6 text-center">
          {/* Glow behind text */}
          <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-64 bg-teal-400/4 blur-[100px] pointer-events-none" />

          <p className="relative font-mono text-[10px] text-amber-400/60 tracking-[0.35em] uppercase mb-7">
            // AUTHORIZATION REQUIRED
          </p>
          <h2 className="relative font-display text-[clamp(4rem,12vw,10rem)] leading-none text-white tracking-wider mb-10">
            READY TO
            <br />
            <span
              className="text-transparent bg-clip-text"
              style={{ backgroundImage: "linear-gradient(135deg, #2DD4BF 10%, #22D3EE 90%)" }}
            >
              OPERATE
            </span>
          </h2>

          <Link href="/login">
            <span className="inline-flex items-center gap-3 font-mono text-[11px] tracking-[0.25em] uppercase border border-teal-400/40 text-teal-400 px-10 py-4 hover:bg-teal-400/8 hover:border-teal-400/70 transition-all duration-200 cursor-pointer">
              ACCESS DASHBOARD <ArrowRight className="w-3 h-3" />
            </span>
          </Link>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-white/5 py-6">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-3">
          <p className="font-mono text-[9px] text-white/15 tracking-[0.3em] uppercase">
            © 2026 D-PANEL OPS
          </p>
          <p className="font-mono text-[9px] text-white/15 tracking-[0.3em] uppercase">
            ALL ACCESS IS LOGGED AND MONITORED FOR COMPLIANCE
          </p>
        </div>
      </footer>
    </div>
  )
}
