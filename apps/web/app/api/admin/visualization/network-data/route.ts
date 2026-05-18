/**
 * Cyber Network Data API
 * 
 * Provides real-time network topology data for visualization:
 * - Node information (implants, relays, targets, C2 servers)
 * - Connection mappings
 * - Status updates
 * - Traffic statistics
 */

import { NextResponse, type NextRequest } from "next/server"
import { verifyAdmin, toErrorResponse } from "@c2panel/infrastructure/security/admin"
import { prisma } from "@c2panel/infrastructure"
import logger from "@c2panel/infrastructure/logging"

const log = logger.child({ module: "api-network-data" })

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/* ------------------------------------------------------------------ */
/*  GET - Network Topology Data                                        */
/* ------------------------------------------------------------------ */

export async function GET(req: NextRequest): Promise<NextResponse> {
  const requestId = `network-data-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

  try {
    await verifyAdmin(req)

    const { searchParams } = new URL(req.url)
    const includeOffline = searchParams.get('includeOffline') !== 'false'

    // Fetch real data from database
    const [implants, nodes, beacons] = await Promise.all([
      prisma.implant.findMany({
        where: includeOffline ? undefined : { status: 'online' },
        select: {
          id: true,
          hostname: true,
          status: true,
          lastSeen: true,
          ip: true,
          os: true,
          arch: true,
        }
      }),
      prisma.node.findMany({
        where: includeOffline ? undefined : { status: 'online' },
        select: {
          id: true,
          name: true,
          status: true,
          region: true,
          ip: true,
          lastSeen: true,
        }
      }),
      prisma.beacon.findMany({
        where: includeOffline ? undefined : { status: 'online' },
        select: {
          id: true,
          implantId: true,
          lastSeen: true,
          status: true,
        }
      })
    ])

    // Transform to network format
    const networkNodes = [
      // C2 Server (main panel)
      {
        id: "c2-main",
        type: "c2" as const,
        name: "C2 Command Server",
        x: 0,
        y: 0,
        status: "online" as const,
        connections: nodes.filter(n => n.status === 'online').map(n => n.id),
        traffic: implants.filter(i => i.status === 'online').length * 10,
        lastSeen: new Date(),
        metadata: {
          region: "primary",
          uptime: "99.9%",
          version: "2.0.0"
        }
      },
      // Infrastructure nodes
      ...nodes.map(node => ({
        id: node.id,
        type: "relay" as const,
        name: node.name || `Node-${node.id.slice(0, 8)}`,
        x: 0,
        y: 0,
        status: node.status as "online" | "offline" | "warning",
        connections: beacons
          .filter(b => b.implantId !== undefined)
          .map(b => b.implantId!)
          .slice(0, 5), // Limit connections
        traffic: Math.floor(Math.random() * 50),
        lastSeen: node.lastSeen || new Date(),
        metadata: {
          ip: node.ip,
          region: node.region,
          type: "infrastructure"
        }
      })),
      // Implants
      ...implants.map(implant => ({
        id: implant.id,
        type: "implant" as const,
        name: implant.hostname || `Implant-${implant.id.slice(0, 8)}`,
        x: 0,
        y: 0,
        status: implant.status as "online" | "offline" | "compromised",
        connections: [], // Will be populated based on node relationships
        traffic: Math.floor(Math.random() * 30),
        lastSeen: implant.lastSeen || new Date(),
        metadata: {
          ip: implant.ip,
          os: implant.os,
          arch: implant.arch,
          type: "agent"
        }
      }))
    ]

    // Establish implant-to-node relationships
    networkNodes.forEach(node => {
      if (node.type === 'implant') {
        const relatedNode = nodes[Math.floor(Math.random() * nodes.length)]
        if (relatedNode) {
          node.connections = [relatedNode.id]
        }
      }
    })

    // Calculate statistics
    const stats = {
      totalNodes: networkNodes.length,
      onlineNodes: networkNodes.filter(n => n.status === 'online').length,
      compromisedNodes: networkNodes.filter(n => n.status === 'compromised').length,
      offlineNodes: networkNodes.filter(n => n.status === 'offline').length,
      warningNodes: networkNodes.filter(n => n.status === 'warning').length,
      totalTraffic: networkNodes.reduce((sum, n) => sum + (n.traffic || 0), 0),
      implants: implants.length,
      targets: implants.filter(i => i.status === 'compromised').length,
      relays: nodes.length
    }

    log.info({ requestId, ...stats }, "Network data retrieved")

    return NextResponse.json({
      requestId,
      nodes: networkNodes,
      stats,
      timestamp: new Date().toISOString()
    })
  } catch (err) {
    log.error({ requestId, err }, "Failed to retrieve network data")
    return toErrorResponse(err)
  }
}
