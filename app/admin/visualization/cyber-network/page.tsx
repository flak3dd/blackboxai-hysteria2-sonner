/**
 * Cyber Network Visualization Page
 * 
 * Interactive dashboard for C2 infrastructure visualization:
 * - Real-time network topology
 * - Traffic flow monitoring
 * - Node status tracking
 * - Interactive controls
 */

import { CyberNetwork } from "@/components/visualization/cyber-network"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  Activity, 
  Server, 
  Network, 
  AlertTriangle, 
  CheckCircle, 
  Clock,
  Zap,
  Shield,
  Target
} from "lucide-react"

export const dynamic = "force-dynamic"

// Mock data generation for demo
function generateNetworkData() {
  return [
    {
      id: "c2-main",
      type: "c2" as const,
      name: "C2 Command Server",
      x: 0,
      y: 0,
      status: "online" as const,
      connections: ["relay-us-east", "relay-eu-west", "relay-apac", "db-primary"],
      traffic: 142,
      lastSeen: new Date(),
      metadata: { ip: "10.0.1.100", region: "US-East-1", uptime: "99.9%" }
    },
    {
      id: "relay-us-east",
      type: "relay" as const,
      name: "Relay US-East-1",
      x: 0,
      y: 0,
      status: "online" as const,
      connections: ["c2-main", "implant-win-001", "implant-win-002", "implant-lnx-001"],
      traffic: 87,
      lastSeen: new Date(),
      metadata: { ip: "10.0.2.50", latency: "12ms", bandwidth: "1Gbps" }
    },
    {
      id: "relay-eu-west",
      type: "relay" as const,
      name: "Relay EU-West-1",
      x: 0,
      y: 0,
      status: "online" as const,
      connections: ["c2-main", "implant-win-003", "implant-mac-001"],
      traffic: 65,
      lastSeen: new Date(),
      metadata: { ip: "10.0.2.51", latency: "28ms", bandwidth: "500Mbps" }
    },
    {
      id: "relay-apac",
      type: "relay" as const,
      name: "Relay APAC-1",
      x: 0,
      y: 0,
      status: "warning" as const,
      connections: ["c2-main", "implant-lnx-002"],
      traffic: 34,
      lastSeen: new Date(Date.now() - 300000),
      metadata: { ip: "10.0.2.52", latency: "45ms", bandwidth: "250Mbps" }
    },
    {
      id: "db-primary",
      type: "database" as const,
      name: "Operations Database",
      x: 0,
      y: 0,
      status: "online" as const,
      connections: ["c2-main"],
      traffic: 92,
      lastSeen: new Date(),
      metadata: { size: "2.5TB", backup: "Enabled", encryption: "AES-256" }
    },
    {
      id: "implant-win-001",
      type: "implant" as const,
      name: "Implant-WIN-001",
      x: 0,
      y: 0,
      status: "online" as const,
      connections: ["relay-us-east", "target-corp-001"],
      traffic: 45,
      lastSeen: new Date(),
      metadata: { os: "Windows 11", arch: "x64", user: "admin" }
    },
    {
      id: "implant-win-002",
      type: "implant" as const,
      name: "Implant-WIN-002",
      x: 0,
      y: 0,
      status: "online" as const,
      connections: ["relay-us-east", "target-corp-002"],
      traffic: 38,
      lastSeen: new Date(),
      metadata: { os: "Windows 10", arch: "x64", user: "user" }
    },
    {
      id: "implant-lnx-001",
      type: "implant" as const,
      name: "Implant-LNX-001",
      x: 0,
      y: 0,
      status: "compromised" as const,
      connections: ["relay-us-east"],
      traffic: 12,
      lastSeen: new Date(Date.now() - 900000),
      metadata: { os: "Ubuntu 22.04", arch: "x64", user: "root" }
    },
    {
      id: "implant-win-003",
      type: "implant" as const,
      name: "Implant-WIN-003",
      x: 0,
      y: 0,
      status: "online" as const,
      connections: ["relay-eu-west", "target-gov-001"],
      traffic: 52,
      lastSeen: new Date(),
      metadata: { os: "Windows Server 2022", arch: "x64", user: "svc_account" }
    },
    {
      id: "implant-mac-001",
      type: "implant" as const,
      name: "Implant-MAC-001",
      x: 0,
      y: 0,
      status: "offline" as const,
      connections: ["relay-eu-west"],
      traffic: 0,
      lastSeen: new Date(Date.now() - 7200000),
      metadata: { os: "macOS 14", arch: "arm64", user: "user" }
    },
    {
      id: "implant-lnx-002",
      type: "implant" as const,
      name: "Implant-LNX-002",
      x: 0,
      y: 0,
      status: "online" as const,
      connections: ["relay-apac", "target-edu-001"],
      traffic: 28,
      lastSeen: new Date(),
      metadata: { os: "CentOS 8", arch: "x64", user: "admin" }
    },
    {
      id: "target-corp-001",
      type: "target" as const,
      name: "Target-CORP-001",
      x: 0,
      y: 0,
      status: "compromised" as const,
      connections: ["implant-win-001"],
      traffic: 22,
      lastSeen: new Date(),
      metadata: { organization: "Corp A", criticality: "High", sector: "Finance" }
    },
    {
      id: "target-corp-002",
      type: "target" as const,
      name: "Target-CORP-002",
      x: 0,
      y: 0,
      status: "online" as const,
      connections: ["implant-win-002"],
      traffic: 18,
      lastSeen: new Date(),
      metadata: { organization: "Corp B", criticality: "Medium", sector: "Healthcare" }
    },
    {
      id: "target-gov-001",
      type: "target" as const,
      name: "Target-GOV-001",
      x: 0,
      y: 0,
      status: "online" as const,
      connections: ["implant-win-003"],
      traffic: 35,
      lastSeen: new Date(),
      metadata: { organization: "Gov Agency", criticality: "Critical", sector: "Defense" }
    },
    {
      id: "target-edu-001",
      type: "target" as const,
      name: "Target-EDU-001",
      x: 0,
      y: 0,
      status: "warning" as const,
      connections: ["implant-lnx-002"],
      traffic: 15,
      lastSeen: new Date(Date.now() - 600000),
      metadata: { organization: "University", criticality: "Low", sector: "Education" }
    }
  ]
}

export default function CyberNetworkPage() {
  const [selectedNode, setSelectedNode] = useState<any>(null)
  const [networkData, setNetworkData] = useState(generateNetworkData())
  const [autoRefresh, setAutoRefresh] = useState(true)

  // Auto-refresh simulation
  useEffect(() => {
    if (!autoRefresh) return

    const interval = setInterval(() => {
      setNetworkData(prev => prev.map(node => ({
        ...node,
        traffic: node.status === 'online' ? Math.max(0, node.traffic + Math.floor(Math.random() * 10) - 5) : 0,
        lastSeen: node.status === 'online' ? new Date() : node.lastSeen
      })))
    }, 2000)

    return () => clearInterval(interval)
  }, [autoRefresh])

  const stats = {
    totalNodes: networkData.length,
    onlineNodes: networkData.filter(n => n.status === 'online').length,
    compromisedNodes: networkData.filter(n => n.status === 'compromised').length,
    offlineNodes: networkData.filter(n => n.status === 'offline').length,
    warningNodes: networkData.filter(n => n.status === 'warning').length,
    totalTraffic: networkData.reduce((sum, n) => sum + n.traffic, 0),
    implants: networkData.filter(n => n.type === 'implant').length,
    targets: networkData.filter(n => n.type === 'target').length,
    relays: networkData.filter(n => n.type === 'relay').length
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Cyber Network Visualization</h1>
          <p className="text-muted-foreground">
            Real-time C2 infrastructure topology and traffic monitoring
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={autoRefresh ? "default" : "outline"}
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            <Activity className="h-4 w-4 mr-2" />
            {autoRefresh ? "Auto-Refresh On" : "Auto-Refresh Off"}
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-cyan-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Nodes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalNodes}</div>
          </CardContent>
        </Card>
        
        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Online</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.onlineNodes}</div>
          </CardContent>
        </Card>
        
        <Card className="border-l-4 border-l-red-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Compromised</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.compromisedNodes}</div>
          </CardContent>
        </Card>
        
        <Card className="border-l-4 border-l-orange-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Traffic</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalTraffic} req/min</div>
          </CardContent>
        </Card>
      </div>

      {/* Main Visualization */}
      <Card className="overflow-hidden">
        <CardHeader>
          <CardTitle>Network Topology</CardTitle>
          <CardDescription>
            Interactive visualization of C2 infrastructure with real-time traffic flow
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="h-[600px] relative">
            <CyberNetwork
              nodes={networkData}
              autoLayout={true}
              showLabels={true}
              onNodeClick={setSelectedNode}
            />
          </div>
        </CardContent>
      </Card>

      {/* Detailed Info Panel */}
      {selectedNode && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Network className="h-5 w-5 text-cyan-400" />
              {selectedNode.name}
            </CardTitle>
            <CardDescription>Detailed node information</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="overview" className="w-full">
              <TabsList>
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="connections">Connections</TabsTrigger>
                <TabsTrigger value="activity">Activity</TabsTrigger>
                <TabsTrigger value="metadata">Metadata</TabsTrigger>
              </TabsList>
              
              <TabsContent value="overview" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Node ID</p>
                    <p className="font-mono text-sm">{selectedNode.id}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Type</p>
                    <Badge>{selectedNode.type}</Badge>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Status</p>
                    <Badge 
                      variant={selectedNode.status === "online" ? "default" : 
                              selectedNode.status === "compromised" ? "destructive" : "secondary"}
                    >
                      {selectedNode.status}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Traffic</p>
                    <p className="text-cyan-400 font-semibold">{selectedNode.traffic} req/min</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Connections</p>
                    <p>{selectedNode.connections.length}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Last Seen</p>
                    <p>{new Date(selectedNode.lastSeen).toLocaleString()}</p>
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="connections" className="space-y-2">
                {selectedNode.connections.map(connId => {
                  const connectedNode = networkData.find(n => n.id === connId)
                  return (
                    <div key={connId} className="flex items-center justify-between p-2 rounded bg-[#1a1a2a]">
                      <div className="flex items-center gap-2">
                        <Server className="h-4 w-4 text-cyan-400" />
                        <span>{connectedNode?.name || connId}</span>
                      </div>
                      <Badge variant="outline">{connectedNode?.type}</Badge>
                    </div>
                  )
                })}
              </TabsContent>
              
              <TabsContent value="activity" className="space-y-2">
                <div className="p-4 rounded bg-[#1a1a2a] space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Activity className="h-4 w-4 text-green-400" />
                    <span>Heartbeat received</span>
                    <span className="text-gray-400 ml-auto">2s ago</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Shield className="h-4 w-4 text-blue-400" />
                    <span>Command executed</span>
                    <span className="text-gray-400 ml-auto">5m ago</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Target className="h-4 w-4 text-orange-400" />
                    <span>Target enumeration</span>
                    <span className="text-gray-400 ml-auto">12m ago</span>
                  </div>
                  {selectedNode.status === 'compromised' && (
                    <div className="flex items-center gap-2 text-sm">
                      <AlertTriangle className="h-4 w-4 text-red-400" />
                      <span>Security alert triggered</span>
                      <span className="text-gray-400 ml-auto">1h ago</span>
                    </div>
                  )}
                </div>
              </TabsContent>
              
              <TabsContent value="metadata" className="space-y-2">
                {selectedNode.metadata && Object.entries(selectedNode.metadata).map(([key, value]) => (
                  <div key={key} className="flex justify-between p-2 rounded bg-[#1a1a2a]">
                    <span className="text-sm text-muted-foreground capitalize">{key}</span>
                    <span className="text-sm font-mono">{String(value)}</span>
                  </div>
                ))}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}

      {/* Network Composition */}
      <div className="grid md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Implants</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-400">{stats.implants}</div>
            <p className="text-sm text-muted-foreground mt-1">Active agents</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Targets</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-400">{stats.targets}</div>
            <p className="text-sm text-muted-foreground mt-1">Compromised systems</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Relays</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-400">{stats.relays}</div>
            <p className="text-sm text-muted-foreground mt-1">Infrastructure nodes</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
