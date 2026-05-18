/**
 * Cyber Network Visualization
 * 
 * An interactive, animated graphical interface showing:
 * - C2 infrastructure nodes and servers
 * - Target systems and compromised hosts
 * - Network topology in tree/web structure
 * - Real-time traffic flow animations
 * - Interactive controls (zoom, pan, selection)
 * 
 * Features:
 * - Canvas-based rendering for performance
 * - Smooth 60fps animations
 * - Cyber aesthetic with glow effects
 * - Particle systems for ambiance
 * - Interactive node selection
 * - Real-time traffic visualization
 */

"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { Badge } from "@/components/ui/badge"
import { 
  ZoomIn, 
  ZoomOut, 
  Maximize2, 
  Play, 
  Pause, 
  RefreshCw,
  Network,
  Server,
  Target,
  Activity
} from "lucide-react"

/* ------------------------------------------------------------------ */
/*  Types and Interfaces                                               */
/* ------------------------------------------------------------------ */

export type NodeType = "c2" | "relay" | "implant" | "target" | "database"

export interface NetworkNode {
  id: string
  type: NodeType
  name: string
  x: number
  y: number
  status: "online" | "offline" | "compromised" | "warning"
  connections: string[]
  traffic: number
  lastSeen: Date
  metadata?: Record<string, any>
}

export interface TrafficPacket {
  fromId: string
  toId: string
  progress: number
  speed: number
  type: "command" | "data" | "heartbeat" | "exfil"
  color: string
}

export interface CyberNetworkProps {
  nodes?: NetworkNode[]
  autoLayout?: boolean
  showLabels?: boolean
  onNodeClick?: (node: NetworkNode) => void
  className?: string
}

/* ------------------------------------------------------------------ */
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */

export function CyberNetwork({
  nodes = [],
  autoLayout = true,
  showLabels = true,
  onNodeClick,
  className = "",
}: CyberNetworkProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationRef = useRef<number>()
  const [isPlaying, setIsPlaying] = useState(true)
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [selectedNode, setSelectedNode] = useState<NetworkNode | null>(null)
  const [trafficEnabled, setTrafficEnabled] = useState(true)
  const [nodeStates, setNodeStates] = useState<Map<string, { pulse: number; rotation: number }>>(new Map())
  
  // Traffic packets state
  const [trafficPackets, setTrafficPackets] = useState<TrafficPacket[]>([])
  
  // Particle system state
  const particlesRef = useRef<Array<{ x: number; y: number; vx: number; vy: number; life: number }>>([])
  
  // Mouse tracking
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })

  // Generate default network if none provided
  const networkNodes = nodes.length > 0 ? nodes : generateDefaultNetwork()

  /* ------------------------------------------------------------------ */
  /*  Layout Generation                                                  */
  /* ------------------------------------------------------------------ */

  const generateLayout = useCallback(() => {
    const layoutNodes = [...networkNodes]
    
    if (autoLayout) {
      // C2 node at center
      const c2Node = layoutNodes.find(n => n.type === "c2")
      if (c2Node) {
        c2Node.x = 0
        c2Node.y = 0
      }

      // Arrange relay nodes in a circle around C2
      const relays = layoutNodes.filter(n => n.type === "relay")
      relays.forEach((relay, i) => {
        const angle = (i / relays.length) * Math.PI * 2 - Math.PI / 2
        const radius = 200
        relay.x = Math.cos(angle) * radius
        relay.y = Math.sin(angle) * radius
      })

      // Arrange implants in branches
      const implants = layoutNodes.filter(n => n.type === "implant")
      implants.forEach((implant, i) => {
        const relayIndex = i % relays.length
        const relay = relays[relayIndex]
        if (relay) {
          const angle = Math.atan2(relay.y, relay.x) + (Math.random() - 0.5) * 0.5
          const distance = 150 + Math.random() * 100
          implant.x = relay.x + Math.cos(angle) * distance
          implant.y = relay.y + Math.sin(angle) * distance
        }
      })

      // Targets at the periphery
      const targets = layoutNodes.filter(n => n.type === "target")
      targets.forEach((target, i) => {
        const angle = (i / targets.length) * Math.PI * 2
        const radius = 400 + Math.random() * 100
        target.x = Math.cos(angle) * radius
        target.y = Math.sin(angle) * radius
      })
    }

    return layoutNodes
  }, [networkNodes, autoLayout])

  const [layoutNodes, setLayoutNodes] = useState(generateLayout())

  /* ------------------------------------------------------------------ */
  /*  Animation Loop                                                    */
  /* ------------------------------------------------------------------ */

  useEffect(() => {
    if (!canvasRef.current) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    let animationId: number

    const animate = () => {
      if (!isPlaying) {
        animationId = requestAnimationFrame(animate)
        return
      }

      // Update node states
      const newStates = new Map()
      layoutNodes.forEach(node => {
        const existing = nodeStates.get(node.id) || { pulse: 0, rotation: 0 }
        newStates.set(node.id, {
          pulse: (existing.pulse + 0.02) % (Math.PI * 2),
          rotation: existing.rotation + 0.005
        })
      })
      setNodeStates(newStates)

      // Update traffic packets
      if (trafficEnabled) {
        updateTrafficPackets()
      }

      // Update particles
      updateParticles()

      // Render
      render(ctx, canvas)

      animationId = requestAnimationFrame(animate)
    }

    animationRef.current = animationId = requestAnimationFrame(animate)

    return () => {
      cancelAnimationFrame(animationId)
    }
  }, [isPlaying, layoutNodes, nodeStates, trafficEnabled, zoom, pan, showLabels, selectedNode, trafficPackets])

  /* ------------------------------------------------------------------ */
  /*  Traffic Management                                                 */
/* ------------------------------------------------------------------ */

  const updateTrafficPackets = () => {
    // Add new traffic packets randomly
    if (Math.random() < 0.1 && layoutNodes.length > 1) {
      const fromNode = layoutNodes[Math.floor(Math.random() * layoutNodes.length)]
      const connections = fromNode.connections
      if (connections.length > 0) {
        const toId = connections[Math.floor(Math.random() * connections.length)]
        const toNode = layoutNodes.find(n => n.id === toId)
        if (toNode) {
          const types: Array<"command" | "data" | "heartbeat" | "exfil"> = ["command", "data", "heartbeat", "exfil"]
          const colors = ["#00ff88", "#00aaff", "#ffaa00", "#ff4444"]
          const typeIndex = Math.floor(Math.random() * types.length)
          
          setTrafficPackets(prev => [...prev, {
            fromId: fromNode.id,
            toId: toNode.id,
            progress: 0,
            speed: 0.01 + Math.random() * 0.02,
            type: types[typeIndex],
            color: colors[typeIndex]
          }])
        }
      }
    }

    // Update existing packets
    setTrafficPackets(prev => {
      return prev
        .map(packet => ({
          ...packet,
          progress: packet.progress + packet.speed
        }))
        .filter(packet => packet.progress < 1)
    })
  }

  /* ------------------------------------------------------------------ */
  /*  Particle System                                                    */
/* ------------------------------------------------------------------ */

  const updateParticles = () => {
    // Add new particles
    if (Math.random() < 0.3) {
      const angle = Math.random() * Math.PI * 2
      const radius = 300 + Math.random() * 200
      particlesRef.current.push({
        x: Math.cos(angle) * radius,
        y: Math.sin(angle) * radius,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        life: 1
      })
    }

    // Update existing particles
    particlesRef.current = particlesRef.current
      .map(p => ({
        ...p,
        x: p.x + p.vx,
        y: p.y + p.vy,
        life: p.life - 0.005
      }))
      .filter(p => p.life > 0)
  }

  /* ------------------------------------------------------------------ */
  /*  Rendering                                                         */
/* ------------------------------------------------------------------ */

  const render = (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) => {
    const { width, height } = canvas
    const centerX = width / 2
    const centerY = height / 2

    // Clear canvas
    ctx.fillStyle = "#0a0a1a"
    ctx.fillRect(0, 0, width, height)

    // Apply zoom and pan
    ctx.save()
    ctx.translate(centerX + pan.x, centerY + pan.y)
    ctx.scale(zoom, zoom)

    // Draw background grid
    drawGrid(ctx)

    // Draw particles
    drawParticles(ctx)

    // Draw connections
    drawConnections(ctx)

    // Draw traffic
    if (trafficEnabled) {
      drawTraffic(ctx)
    }

    // Draw nodes
    layoutNodes.forEach(node => {
      drawNode(ctx, node)
    })

    ctx.restore()

    // Draw overlay UI
    drawOverlay(ctx, width, height)
  }

  const drawGrid = (ctx: CanvasRenderingContext2D) => {
    ctx.strokeStyle = "#1a1a2a"
    ctx.lineWidth = 0.5
    
    const gridSize = 50
    const extent = 1000
    
    for (let x = -extent; x <= extent; x += gridSize) {
      ctx.beginPath()
      ctx.moveTo(x, -extent)
      ctx.lineTo(x, extent)
      ctx.stroke()
    }
    
    for (let y = -extent; y <= extent; y += gridSize) {
      ctx.beginPath()
      ctx.moveTo(-extent, y)
      ctx.lineTo(extent, y)
      ctx.stroke()
    }
  }

  const drawParticles = (ctx: CanvasRenderingContext2D) => {
    particlesRef.current.forEach(p => {
      ctx.beginPath()
      ctx.arc(p.x, p.y, 1, 0, Math.PI * 2)
      ctx.fillStyle = `rgba(100, 200, 255, ${p.life * 0.3})`
      ctx.fill()
    })
  }

  const drawConnections = (ctx: CanvasRenderingContext2D) => {
    layoutNodes.forEach(node => {
      node.connections.forEach(targetId => {
        const target = layoutNodes.find(n => n.id === targetId)
        if (target) {
          ctx.beginPath()
          ctx.moveTo(node.x, node.y)
          ctx.lineTo(target.x, target.y)
          ctx.strokeStyle = "#2a2a4a"
          ctx.lineWidth = 1
          ctx.stroke()
        }
      })
    })
  }

  const drawTraffic = (ctx: CanvasRenderingContext2D) => {
    trafficPackets.forEach(packet => {
      const fromNode = layoutNodes.find(n => n.id === packet.fromId)
      const toNode = layoutNodes.find(n => n.id === packet.toId)
      
      if (fromNode && toNode) {
        const x = fromNode.x + (toNode.x - fromNode.x) * packet.progress
        const y = fromNode.y + (toNode.y - fromNode.y) * packet.progress
        
        // Draw packet with glow
        ctx.shadowColor = packet.color
        ctx.shadowBlur = 10
        ctx.beginPath()
        ctx.arc(x, y, 4, 0, Math.PI * 2)
        ctx.fillStyle = packet.color
        ctx.fill()
        ctx.shadowBlur = 0
      }
    })
  }

  const drawNode = (ctx: CanvasRenderingContext2D, node: NetworkNode) => {
    const state = nodeStates.get(node.id) || { pulse: 0, rotation: 0 }
    const isSelected = selectedNode?.id === node.id

    // Node size based on type
    const baseSize = {
      c2: 30,
      relay: 20,
      implant: 15,
      target: 12,
      database: 18
    }[node.type]

    // Pulse effect
    const pulseSize = Math.sin(state.pulse) * 3

    // Status colors
    const statusColors = {
      online: "#00ff88",
      offline: "#666666",
      compromised: "#ff4444",
      warning: "#ffaa00"
    }
    const statusColor = statusColors[node.status]

    // Draw outer glow
    ctx.shadowColor = statusColor
    ctx.shadowBlur = 20 + pulseSize

    // Draw node circle
    ctx.beginPath()
    ctx.arc(node.x, node.y, baseSize + pulseSize, 0, Math.PI * 2)
    ctx.fillStyle = "#1a1a3a"
    ctx.fill()
    ctx.strokeStyle = statusColor
    ctx.lineWidth = isSelected ? 3 : 2
    ctx.stroke()

    ctx.shadowBlur = 0

    // Draw node icon/symbol
    ctx.save()
    ctx.translate(node.x, node.y)
    ctx.rotate(state.rotation)
    drawNodeIcon(ctx, node.type, baseSize * 0.6)
    ctx.restore()

    // Draw label
    if (showLabels) {
      ctx.font = "10px Arial"
      ctx.fillStyle = "#ffffff"
      ctx.textAlign = "center"
      ctx.fillText(node.name, node.x, node.y + baseSize + 15)
    }

    // Draw traffic indicator
    if (node.traffic > 0) {
      const trafficAngle = state.rotation
      const trafficRadius = baseSize + 8
      ctx.beginPath()
      ctx.arc(
        node.x + Math.cos(trafficAngle) * trafficRadius,
        node.y + Math.sin(trafficAngle) * trafficRadius,
        3,
        0,
        Math.PI * 2
      )
      ctx.fillStyle = "#00aaff"
      ctx.fill()
    }
  }

  const drawNodeIcon = (ctx: CanvasRenderingContext2D, type: NodeType, size: number) => {
    ctx.fillStyle = "#ffffff"
    ctx.strokeStyle = "#ffffff"
    ctx.lineWidth = 2

    switch (type) {
      case "c2":
        // Central hub icon
        ctx.beginPath()
        ctx.arc(0, 0, size, 0, Math.PI * 2)
        ctx.stroke()
        ctx.beginPath()
        ctx.arc(0, 0, size * 0.4, 0, Math.PI * 2)
        ctx.fill()
        break
      case "relay":
        // Relay/bridge icon
        ctx.beginPath()
        ctx.moveTo(-size, 0)
        ctx.lineTo(size, 0)
        ctx.moveTo(0, -size)
        ctx.lineTo(0, size)
        ctx.stroke()
        break
      case "implant":
        // Implant/target icon
        ctx.beginPath()
        ctx.moveTo(0, -size)
        ctx.lineTo(size * 0.8, size * 0.6)
        ctx.lineTo(-size * 0.8, size * 0.6)
        ctx.closePath()
        ctx.stroke()
        break
      case "target":
        // Target icon
        ctx.beginPath()
        ctx.arc(0, 0, size, 0, Math.PI * 2)
        ctx.stroke()
        ctx.beginPath()
        ctx.arc(0, 0, size * 0.3, 0, Math.PI * 2)
        ctx.fill()
        break
      case "database":
        // Database icon
        ctx.beginPath()
        ctx.ellipse(0, -size * 0.3, size, size * 0.3, 0, 0, Math.PI * 2)
        ctx.stroke()
        ctx.beginPath()
        ctx.moveTo(-size, -size * 0.3)
        ctx.lineTo(-size, size * 0.3)
        ctx.lineTo(size, size * 0.3)
        ctx.lineTo(size, -size * 0.3)
        ctx.stroke()
        break
    }
  }

  const drawOverlay = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    // Draw stats overlay
    const onlineNodes = layoutNodes.filter(n => n.status === "online").length
    const totalTraffic = trafficPackets.length

    ctx.font = "12px Arial"
    ctx.fillStyle = "#ffffff"
    
    // Stats box
    const statsX = 20
    const statsY = 20
    ctx.fillText(`Nodes: ${layoutNodes.length}`, statsX, statsY)
    ctx.fillText(`Online: ${onlineNodes}`, statsX, statsY + 15)
    ctx.fillText(`Traffic: ${totalTraffic}`, statsX, statsY + 30)
    ctx.fillText(`Zoom: ${(zoom * 100).toFixed(0)}%`, statsX, statsY + 45)
  }

  /* ------------------------------------------------------------------ */
  /*  Event Handlers                                                     */
/* ------------------------------------------------------------------ */

  const handleMouseDown = (e: React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return
    
    const x = e.clientX - rect.left - rect.width / 2 - pan.x
    const y = e.clientY - rect.top - rect.height / 2 - pan.y
    
    // Check if clicking on a node
    const clickedNode = layoutNodes.find(node => {
      const dx = node.x - x / zoom
      const dy = node.y - y / zoom
      const distance = Math.sqrt(dx * dx + dy * dy)
      return distance < 30
    })

    if (clickedNode) {
      setSelectedNode(clickedNode)
      onNodeClick?.(clickedNode)
    } else {
      setIsDragging(true)
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y })
    }
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setPan({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      })
    }
    
    const rect = canvasRef.current?.getBoundingClientRect()
    if (rect) {
      setMousePos({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      })
    }
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault()
    const newZoom = Math.max(0.2, Math.min(3, zoom - e.deltaY * 0.001))
    setZoom(newZoom)
  }

  /* ------------------------------------------------------------------ */
  /*  Control Handlers                                                  */
/* ------------------------------------------------------------------ */

  const handleZoomIn = () => setZoom(Math.min(3, zoom + 0.2))
  const handleZoomOut = () => setZoom(Math.max(0.2, zoom - 0.2))
  const handleResetView = () => {
    setZoom(1)
    setPan({ x: 0, y: 0 })
  }
  const handleRegenerateLayout = () => {
    setLayoutNodes(generateLayout())
  }
  const handleTogglePlayback = () => setIsPlaying(!isPlaying)

  /* ------------------------------------------------------------------ */
  /*  Default Network Generator                                          */
/* ------------------------------------------------------------------ */

  function generateDefaultNetwork(): NetworkNode[] {
    const nodes: NetworkNode[] = [
      // C2 Server
      {
        id: "c2-main",
        type: "c2",
        name: "C2 Main",
        x: 0,
        y: 0,
        status: "online",
        connections: ["relay-1", "relay-2", "relay-3", "database-1"],
        traffic: 85,
        lastSeen: new Date()
      },
      // Relay Servers
      {
        id: "relay-1",
        type: "relay",
        name: "Relay US-East",
        x: 0,
        y: 0,
        status: "online",
        connections: ["c2-main", "implant-1", "implant-2", "implant-3"],
        traffic: 45,
        lastSeen: new Date()
      },
      {
        id: "relay-2",
        type: "relay",
        name: "Relay EU-West",
        x: 0,
        y: 0,
        status: "online",
        connections: ["c2-main", "implant-4", "implant-5"],
        traffic: 32,
        lastSeen: new Date()
      },
      {
        id: "relay-3",
        type: "relay",
        name: "Relay Asia-Pac",
        x: 0,
        y: 0,
        status: "warning",
        connections: ["c2-main", "implant-6"],
        traffic: 15,
        lastSeen: new Date()
      },
      // Database
      {
        id: "database-1",
        type: "database",
        name: "Operations DB",
        x: 0,
        y: 0,
        status: "online",
        connections: ["c2-main"],
        traffic: 60,
        lastSeen: new Date()
      },
      // Implants
      {
        id: "implant-1",
        type: "implant",
        name: "Implant-WIN-001",
        x: 0,
        y: 0,
        status: "online",
        connections: ["relay-1", "target-1"],
        traffic: 25,
        lastSeen: new Date()
      },
      {
        id: "implant-2",
        type: "implant",
        name: "Implant-WIN-002",
        x: 0,
        y: 0,
        status: "online",
        connections: ["relay-1", "target-2"],
        traffic: 18,
        lastSeen: new Date()
      },
      {
        id: "implant-3",
        type: "implant",
        name: "Implant-LNX-001",
        x: 0,
        y: 0,
        status: "compromised",
        connections: ["relay-1"],
        traffic: 5,
        lastSeen: new Date()
      },
      {
        id: "implant-4",
        type: "implant",
        name: "Implant-MAC-001",
        x: 0,
        y: 0,
        status: "online",
        connections: ["relay-2", "target-3"],
        traffic: 22,
        lastSeen: new Date()
      },
      {
        id: "implant-5",
        type: "implant",
        name: "Implant-WIN-003",
        x: 0,
        y: 0,
        status: "offline",
        connections: ["relay-2"],
        traffic: 0,
        lastSeen: new Date(Date.now() - 3600000)
      },
      {
        id: "implant-6",
        type: "implant",
        name: "Implant-LNX-002",
        x: 0,
        y: 0,
        status: "online",
        connections: ["relay-3", "target-4"],
        traffic: 12,
        lastSeen: new Date()
      },
      // Targets
      {
        id: "target-1",
        type: "target",
        name: "Target-CORP-001",
        x: 0,
        y: 0,
        status: "compromised",
        connections: ["implant-1"],
        traffic: 8,
        lastSeen: new Date()
      },
      {
        id: "target-2",
        type: "target",
        name: "Target-CORP-002",
        x: 0,
        y: 0,
        status: "online",
        connections: ["implant-2"],
        traffic: 15,
        lastSeen: new Date()
      },
      {
        id: "target-3",
        type: "target",
        name: "Target-GOV-001",
        x: 0,
        y: 0,
        status: "online",
        connections: ["implant-4"],
        traffic: 20,
        lastSeen: new Date()
      },
      {
        id: "target-4",
        type: "target",
        name: "Target-EDU-001",
        x: 0,
        y: 0,
        status: "warning",
        connections: ["implant-6"],
        traffic: 10,
        lastSeen: new Date()
      }
    ]

    return nodes
  }

  /* ------------------------------------------------------------------ */
  /*  Canvas Setup                                                      */
/* ------------------------------------------------------------------ */

  const setupCanvas = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const resizeCanvas = () => {
      const parent = canvas.parentElement
      if (parent) {
        canvas.width = parent.clientWidth
        canvas.height = parent.clientHeight
      }
    }

    resizeCanvas()
    window.addEventListener("resize", resizeCanvas)
    
    return () => window.removeEventListener("resize", resizeCanvas)
  }, [])

  useEffect(setupCanvas, [setupCanvas])

  /* ------------------------------------------------------------------ */
  /*  Render                                                            */
/* ------------------------------------------------------------------ */

  return (
    <div className={`relative ${className}`}>
      <canvas
        ref={canvasRef}
        className="w-full h-full bg-[#0a0a1a] rounded-lg cursor-move"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
      />
      
      {/* Control Panel */}
      <div className="absolute bottom-4 left-4 flex gap-2">
        <Button size="sm" variant="secondary" onClick={handleZoomIn}>
          <ZoomIn className="h-4 w-4" />
        </Button>
        <Button size="sm" variant="secondary" onClick={handleZoomOut}>
          <ZoomOut className="h-4 w-4" />
        </Button>
        <Button size="sm" variant="secondary" onClick={handleResetView}>
          <Maximize2 className="h-4 w-4" />
        </Button>
        <Button size="sm" variant="secondary" onClick={handleTogglePlayback}>
          {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
        </Button>
        <Button size="sm" variant="secondary" onClick={handleRegenerateLayout}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {/* Selected Node Info */}
      {selectedNode && (
        <div className="absolute top-4 right-4 bg-[#1a1a2a] border border-[#2a2a4a] rounded-lg p-4 min-w-64">
          <div className="flex items-center gap-2 mb-3">
            <Network className="h-5 w-5 text-cyan-400" />
            <h3 className="font-semibold text-white">{selectedNode.name}</h3>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-400">Type:</span>
              <Badge variant="outline">{selectedNode.type}</Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Status:</span>
              <Badge 
                variant={selectedNode.status === "online" ? "default" : selectedNode.status === "compromised" ? "destructive" : "secondary"}
              >
                {selectedNode.status}
              </Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Traffic:</span>
              <span className="text-cyan-400">{selectedNode.traffic} req/min</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Connections:</span>
              <span>{selectedNode.connections.length}</span>
            </div>
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="absolute top-4 left-4 bg-[#1a1a2a] border border-[#2a2a4a] rounded-lg p-3">
        <div className="text-xs font-semibold text-white mb-2">Legend</div>
        <div className="space-y-1 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full border-2 border-cyan-400" />
            <span className="text-gray-300">C2 Server</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full border-2 border-green-400" />
            <span className="text-gray-300">Relay</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full border-2 border-orange-400" />
            <span className="text-gray-300">Implant</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full border-2 border-red-400" />
            <span className="text-gray-300">Target</span>
          </div>
        </div>
      </div>
    </div>
  )
}
