import { NextResponse, type NextRequest } from "next/server"
import { verifyAdmin, toErrorResponse } from "@/lib/auth/admin"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export type BuildPreset = {
  id: string
  name: string
  description: string
  icon: string
  category: "stealth" | "performance" | "balanced" | "custom"
  config: {
    provider: string
    regions: string[]
    size: string
    port: number
    obfsEnabled: boolean
    obfsPasswordLength?: number
    bandwidth?: {
      up: string
      down: string
    }
    masquerade?: {
      type: string
      enabled: boolean
    }
    tags: string[]
    recommendedProviders: string[]
  }
  deploymentCount: number
  estimatedCost: string
}

const BUILD_PRESETS: BuildPreset[] = [
  {
    id: "stealth-max",
    name: "Stealth Max",
    description: "Maximum obfuscation with salamander, random ports, and traffic masquerading. Best for high-censorship regions.",
    icon: "🛡️",
    category: "stealth",
    config: {
      provider: "hetzner",
      regions: ["fsn1", "nbg1", "hil"],
      size: "cax11",
      port: 443,
      obfsEnabled: true,
      obfsPasswordLength: 64,
      bandwidth: { up: "100 Mbps", down: "500 Mbps" },
      masquerade: { type: "proxy", enabled: true },
      tags: ["stealth", "obfuscated", "high-security"],
      recommendedProviders: ["hetzner", "digitalocean"],
    },
    deploymentCount: 5,
    estimatedCost: "$5-8/mo per node",
  },
  {
    id: "stealth-balanced",
    name: "Stealth Balanced",
    description: "Good obfuscation with standard ports. Balanced security and performance.",
    icon: "⚖️",
    category: "stealth",
    config: {
      provider: "hetzner",
      regions: ["fsn1", "nbg1"],
      size: "cax11",
      port: 443,
      obfsEnabled: true,
      obfsPasswordLength: 32,
      bandwidth: { up: "200 Mbps", down: "1 Gbps" },
      tags: ["stealth", "balanced", "production"],
      recommendedProviders: ["hetzner", "vultr"],
    },
    deploymentCount: 3,
    estimatedCost: "$5-6/mo per node",
  },
  {
    id: "performance-max",
    name: "Performance Max",
    description: "No obfuscation, maximum bandwidth and throughput. Best for low-censorship regions.",
    icon: "🚀",
    category: "performance",
    config: {
      provider: "hetzner",
      regions: ["fsn1", "nbg1", "hel1"],
      size: "cax21",
      port: 443,
      obfsEnabled: false,
      bandwidth: { up: "1 Gbps", down: "2 Gbps" },
      tags: ["performance", "high-throughput", "no-obfs"],
      recommendedProviders: ["hetzner", "digitalocean"],
    },
    deploymentCount: 5,
    estimatedCost: "$8-12/mo per node",
  },
  {
    id: "performance-balanced",
    name: "Performance Balanced",
    description: "Good performance with moderate resources. Cost-effective for multiple nodes.",
    icon: "⚡",
    category: "performance",
    config: {
      provider: "hetzner",
      regions: ["fsn1", "nbg1"],
      size: "cax11",
      port: 443,
      obfsEnabled: false,
      bandwidth: { up: "500 Mbps", down: "1 Gbps" },
      tags: ["performance", "balanced", "cost-effective"],
      recommendedProviders: ["hetzner", "vultr", "lightsail"],
    },
    deploymentCount: 3,
    estimatedCost: "$5-6/mo per node",
  },
  {
    id: "global-distributed",
    name: "Global Distributed",
    description: "Nodes across multiple regions for redundancy and latency optimization.",
    icon: "🌍",
    category: "balanced",
    config: {
      provider: "hetzner",
      regions: ["fsn1", "nbg1", "hil", "hel", "ash"],
      size: "cax11",
      port: 443,
      obfsEnabled: true,
      obfsPasswordLength: 32,
      bandwidth: { up: "100 Mbps", down: "500 Mbps" },
      tags: ["distributed", "global", "redundancy"],
      recommendedProviders: ["hetzner", "digitalocean", "vultr"],
    },
    deploymentCount: 5,
    estimatedCost: "$5-8/mo per node",
  },
  {
    id: "cost-optimized",
    name: "Cost Optimized",
    description: "Minimum viable configuration for budget deployments. Good for testing.",
    icon: "💰",
    category: "balanced",
    config: {
      provider: "vultr",
      regions: ["ewr", "fra", "sgp"],
      size: "vc2-1c-1gb",
      port: 443,
      obfsEnabled: true,
      obfsPasswordLength: 24,
      bandwidth: { up: "50 Mbps", down: "200 Mbps" },
      tags: ["budget", "testing", "minimal"],
      recommendedProviders: ["vultr", "digitalocean", "lightsail"],
    },
    deploymentCount: 3,
    estimatedCost: "$3-5/mo per node",
  },
  {
    id: "azure-enterprise",
    name: "Azure Enterprise",
    description: "Enterprise-grade Azure deployment with multiple regions and resource groups.",
    icon: "🏢",
    category: "custom",
    config: {
      provider: "azure",
      regions: ["westeurope", "australiaeast", "eastus"],
      size: "Standard_B1s",
      port: 443,
      obfsEnabled: true,
      obfsPasswordLength: 32,
      bandwidth: { up: "100 Mbps", down: "500 Mbps" },
      tags: ["enterprise", "azure", "production"],
      recommendedProviders: ["azure"],
    },
    deploymentCount: 5,
    estimatedCost: "$8-12/mo per node",
  },
  {
    id: "custom-advanced",
    name: "Custom Advanced",
    description: "Full custom configuration with all options available for advanced users.",
    icon: "⚙️",
    category: "custom",
    config: {
      provider: "hetzner",
      regions: ["fsn1"],
      size: "cax11",
      port: 443,
      obfsEnabled: true,
      obfsPasswordLength: 32,
      bandwidth: { up: "100 Mbps", down: "500 Mbps" },
      tags: ["custom", "advanced"],
      recommendedProviders: ["hetzner", "digitalocean", "vultr", "lightsail", "azure"],
    },
    deploymentCount: 1,
    estimatedCost: "$5-10/mo per node",
  },
]

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    await verifyAdmin(req)
    return NextResponse.json({ presets: BUILD_PRESETS })
  } catch (err) {
    return toErrorResponse(err)
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    await verifyAdmin(req)
    const body = await req.json().catch(() => null)
    const { presetId, customConfig } = body

    if (!presetId) {
      return NextResponse.json({ error: "presetId is required" }, { status: 400 })
    }

    const preset = BUILD_PRESETS.find((p) => p.id === presetId)
    if (!preset) {
      return NextResponse.json({ error: "Preset not found" }, { status: 404 })
    }

    // Merge preset config with custom overrides
    const finalConfig = {
      ...preset.config,
      ...customConfig,
      tags: [...preset.config.tags, ...(customConfig?.tags || [])],
    }

    return NextResponse.json({ 
      preset, 
      config: finalConfig,
      message: "Preset config resolved. Use this config with /api/admin/operations/deploy"
    })
  } catch (err) {
    return toErrorResponse(err)
  }
}
