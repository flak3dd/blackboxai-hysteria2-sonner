"use client"
import { useState, useEffect } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { apiFetch } from "@/lib/api/fetch"
import { decryptSshKey } from "@/lib/crypto/encryption"

type SshTerminalModalProps = {
  nodeId: string
  nodeName: string
  onClose: () => void
}

export function SshTerminalModal({ nodeId, nodeName, onClose }: SshTerminalModalProps) {
  const [node, setNode] = useState<{
    hostname: string
    sshUsername?: string | null
    sshPort?: number
    sshPrivateKey?: string | null
  } | null>(null)
  const [sshCommand, setSshCommand] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState("")

  console.log("SshTerminalModal props:", { nodeId, nodeName })

  useEffect(() => {
    const fetchNode = async () => {
      try {
        console.log("Fetching node with ID:", nodeId)
        if (!nodeId) {
          throw new Error("nodeId is undefined")
        }
        const res = await apiFetch(`/api/admin/operations/nodes/${nodeId}`)
        if (!res.ok) {
          const errorText = await res.text()
          console.error(`API Error ${res.status}:`, errorText)
          throw new Error(`Failed to fetch node details (${res.status})`)
        }
        const data = await res.json()
        setNode(data.node)
      } catch (err) {
        setError("Failed to load node details")
        console.error(err)
      } finally {
        setIsLoading(false)
      }
    }
    fetchNode()
  }, [nodeId])

  const generateSshCommand = async () => {
    if (!node?.sshPrivateKey) {
      setError("No SSH key stored for this node. SSH keys are only stored for nodes deployed through this panel.")
      return
    }

    setIsGenerating(true)
    setError("")

    try {
      const privateKey = decryptSshKey(node.sshPrivateKey)
      const username = node.sshUsername || "root"
      const port = node.sshPort || 22
      const host = node.hostname

      // Generate a temporary file command
      const command = `cat << 'EOF' > /tmp/${nodeName}_ssh_key
${privateKey}
EOF
chmod 600 /tmp/${nodeName}_ssh_key
ssh -i /tmp/${nodeName}_ssh_key -p ${port} ${username}@${host}
rm /tmp/${nodeName}_ssh_key`

      setSshCommand(command)
      
      // Update last SSH connection time
      await apiFetch(`/api/admin/operations/nodes/${nodeId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ sshConnectedAt: Date.now() }),
      }).catch(() => {})
    } catch (err) {
      setError("Failed to decrypt SSH key. The node may not have SSH credentials stored.")
      console.error(err)
    } finally {
      setIsGenerating(false)
    }
  }

  const copyToClipboard = () => {
    navigator.clipboard.writeText(sshCommand).then(() => {
      toast.success("SSH command copied to clipboard")
    }).catch(() => {
      toast.error("Failed to copy to clipboard")
    })
  }

  const copyKeyOnly = async () => {
    if (!node?.sshPrivateKey) {
      toast.error("No SSH key stored for this node")
      return
    }

    try {
      const privateKey = decryptSshKey(node.sshPrivateKey)
      navigator.clipboard.writeText(privateKey).then(() => {
        toast.success("SSH private key copied to clipboard")
      }).catch(() => {
        toast.error("Failed to copy to clipboard")
      })
    } catch (err) {
      toast.error("Failed to decrypt SSH key")
    }
  }

  if (isLoading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
        <div className="w-full max-w-2xl bg-background rounded-lg shadow-xl p-6" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <span className="ml-3 text-sm">Loading node details...</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="w-full max-w-2xl bg-background rounded-lg shadow-xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          <h2 className="text-lg font-semibold mb-4">SSH Terminal - {nodeName}</h2>
          
          <div className="space-y-4">
            {node && (
              <div className="bg-muted p-4 rounded-md">
                <div className="text-sm font-medium mb-2">Connection Details:</div>
                <div className="text-sm space-y-1 font-mono">
                  <div><span className="text-muted-foreground">Host:</span> {node.hostname}</div>
                  <div><span className="text-muted-foreground">Port:</span> {node.sshPort || 22}</div>
                  <div><span className="text-muted-foreground">User:</span> {node.sshUsername || "root"}</div>
                </div>
              </div>
            )}

            {!sshCommand ? (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Click the button below to generate an SSH command with the stored private key.
                </p>
                {node && !node.sshPrivateKey && (
                  <div className="bg-yellow-50 dark:bg-yellow-950 p-3 rounded-md">
                    <p className="text-sm text-yellow-800 dark:text-yellow-200">
                      ⚠️ This node doesn't have SSH credentials stored. Only nodes deployed through this panel after this feature was added will have SSH keys stored.
                    </p>
                  </div>
                )}
                <Button
                  onClick={generateSshCommand}
                  disabled={isGenerating || !node?.sshPrivateKey}
                  className="w-full"
                >
                  {isGenerating ? "Generating..." : "Generate SSH Command"}
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">SSH Command:</label>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={copyToClipboard}>
                      Copy Command
                    </Button>
                    <Button variant="outline" size="sm" onClick={copyKeyOnly}>
                      Copy Key Only
                    </Button>
                  </div>
                </div>
                <pre className="bg-black text-green-400 p-4 rounded-md text-xs overflow-x-auto whitespace-pre-wrap">
                  {sshCommand}
                </pre>
                <div className="text-xs text-muted-foreground">
                  💡 Copy and paste this command into your terminal to connect to the node.
                  The command creates a temporary key file, connects via SSH, then cleans up.
                </div>
              </div>
            )}

            {error && (
              <div className="bg-red-50 dark:bg-red-950 p-3 rounded-md">
                <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
              </div>
            )}

            <div className="flex justify-end pt-4">
              <Button variant="outline" onClick={onClose}>Close</Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
