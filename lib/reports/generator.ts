import { prisma } from "@/lib/db"
import { executiveTemplate } from "./templates/executive"
import { technicalTemplate } from "./templates/technical"

export type ReportType = "executive" | "technical" | "timeline" | "comprehensive"
export type ReportFormat = "markdown" | "json" | "html"

export interface ReportConfig {
  type: ReportType
  format: ReportFormat
  operationId?: string
  startDate?: Date
  endDate?: Date
  customSections?: string[]
}

export interface ReportData {
  operation?: {
    id: string
    name: string
    description: string
    type: string
    status: string
    createdAt: Date
    objectives: Array<{ title: string; description: string; completed: boolean }>
    tasks: Array<{
      title: string
      status: string
      priority: string
      estimatedDuration: number
      actualDuration?: number
    }>
  }
  beacons?: Array<{
    hostname: string
    ipAddress: string
    os: string
    status: string
    lastSeen: Date
  }>
  credentials?: Array<{
    type: string
    username: string
    domain?: string
    cracked: boolean
  }>
  lateralMovements?: Array<{
    fromHostname: string
    toHostname: string
    technique: string
    status: string
    timestamp: Date
  }>
  implants?: Array<{
    name: string
    type: string
    architecture: string
    status: string
    firstSeen: Date
    lastSeen?: Date
  }>
}

export interface GeneratedReport {
  id: string
  type: ReportType
  format: ReportFormat
  title: string
  content: string
  generatedAt: Date
  metadata: {
    operationId?: string
    operationName?: string
    dataPoints: number
    format: string
  }
}

class ReportGenerator {
  async generateReport(config: ReportConfig): Promise<GeneratedReport> {
    // Gather data based on configuration
    const data = await this.gatherData(config)

    // Select template based on report type
    const content = await this.renderReport(config.type, data, config)

    // Generate report metadata
    const metadata = {
      operationId: config.operationId,
      operationName: data.operation?.name,
      dataPoints: this.countDataPoints(data),
      format: config.format,
    }

    // Save report to database
    const savedReport = await this.saveReport(config, content, metadata)

    return {
      id: savedReport.id,
      type: config.type,
      format: config.format,
      title: this.generateTitle(config, data),
      content,
      generatedAt: new Date(),
      metadata,
    }
  }

  private async gatherData(config: ReportConfig): Promise<ReportData> {
    const data: ReportData = {}

    if (config.operationId) {
      // Fetch operation-specific data
      const operation = await prisma.operation.findUnique({
        where: { id: config.operationId },
        include: {
          objectives: true,
          tasks: true,
        },
      })

      if (operation) {
        data.operation = {
          id: operation.id,
          name: operation.name,
          description: operation.description || "",
          type: operation.type,
          status: operation.status,
          createdAt: operation.createdAt,
          objectives: operation.objectives.map((obj) => ({
            title: obj.title,
            description: obj.description,
            completed: obj.completed,
          })),
          tasks: operation.tasks.map((task) => ({
            title: task.title,
            status: task.status,
            priority: task.priority,
            estimatedDuration: task.estimatedDuration,
            actualDuration: task.actualDuration || undefined,
          })),
        }
      }
    } else {
      // If no operation specified, get the most recent operation
      const recentOperation = await prisma.operation.findFirst({
        orderBy: { createdAt: "desc" },
        include: {
          objectives: true,
          tasks: true,
        },
      })

      if (recentOperation) {
        data.operation = {
          id: recentOperation.id,
          name: recentOperation.name,
          description: recentOperation.description || "",
          type: recentOperation.type,
          status: recentOperation.status,
          createdAt: recentOperation.createdAt,
          objectives: recentOperation.objectives.map((obj) => ({
            title: obj.title,
            description: obj.description,
            completed: obj.completed,
          })),
          tasks: recentOperation.tasks.map((task) => ({
            title: task.title,
            status: task.status,
            priority: task.priority,
            estimatedDuration: task.estimatedDuration,
            actualDuration: task.actualDuration || undefined,
          })),
        }
      }
    }

    // Gather beacon data
    data.beacons = await prisma.beacon.findMany({
      orderBy: { lastCheckin: "desc" },
      take: 50,
    })

    // Gather credential data
    data.credentials = await prisma.credential.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
    })

    // Gather lateral movement data
    data.lateralMovements = await prisma.lateralMovement.findMany({
      orderBy: { timestamp: "desc" },
      take: 50,
    })

    // Gather implant data
    data.implants = await prisma.implant.findMany({
      orderBy: { firstSeen: "desc" },
      take: 50,
    })

    return data
  }

  private async renderReport(type: ReportType, data: ReportData, config: ReportConfig): Promise<string> {
    switch (type) {
      case "executive":
        return executiveTemplate.render(data, config.format)
      case "technical":
        return technicalTemplate.render(data, config.format)
      case "timeline":
        return this.renderTimelineReport(data, config.format)
      case "comprehensive":
        return this.renderComprehensiveReport(data, config.format)
      default:
        throw new Error(`Unknown report type: ${type}`)
    }
  }

  private renderTimelineReport(data: ReportData, format: ReportFormat): string {
    const lines: string[] = []

    if (format === "markdown") {
      lines.push("# Timeline Analysis Report")
      lines.push("")
      lines.push(`**Generated**: ${new Date().toISOString()}`)
      lines.push("")

      if (data.operation) {
        lines.push("## Operation Overview")
        lines.push("")
        lines.push(`**Name**: ${data.operation.name}`)
        lines.push(`**Type**: ${data.operation.type}`)
        lines.push(`**Status**: ${data.operation.status}`)
        lines.push(`**Started**: ${data.operation.createdAt.toISOString()}`)
        lines.push("")

        lines.push("## Objectives Timeline")
        lines.push("")
        data.operation.objectives.forEach((obj, idx) => {
          lines.push(`${idx + 1}. ${obj.title} - ${obj.completed ? "✓ Completed" : "○ Pending"}`)
        })
        lines.push("")

        lines.push("## Tasks Timeline")
        lines.push("")
        data.operation.tasks.forEach((task, idx) => {
          const duration = task.actualDuration || task.estimatedDuration
          lines.push(`${idx + 1}. ${task.title}`)
          lines.push(`   - Status: ${task.status}`)
          lines.push(`   - Priority: ${task.priority}`)
          lines.push(`   - Duration: ${duration}h`)
          lines.push("")
        })
      }

      lines.push("## Beacon Activity Timeline")
      lines.push("")
      if (data.beacons && data.beacons.length > 0) {
        data.beacons.slice(0, 20).forEach((beacon) => {
          lines.push(`- ${beacon.hostname} (${beacon.ipAddress}) - Last seen: ${beacon.lastSeen.toISOString()}`)
        })
      } else {
        lines.push("No beacon activity recorded.")
      }
      lines.push("")

      lines.push("## Lateral Movement Timeline")
      lines.push("")
      if (data.lateralMovements && data.lateralMovements.length > 0) {
        data.lateralMovements.slice(0, 20).forEach((movement) => {
          lines.push(`- ${movement.fromHostname} → ${movement.toHostname}`)
          lines.push(`  - Technique: ${movement.technique}`)
          lines.push(`  - Status: ${movement.status}`)
          lines.push(`  - Timestamp: ${movement.timestamp.toISOString()}`)
        })
      } else {
        lines.push("No lateral movement recorded.")
      }
    }

    return lines.join("\n")
  }

  private renderComprehensiveReport(data: ReportData, format: ReportFormat): string {
    const lines: string[] = []

    if (format === "markdown") {
      lines.push("# Comprehensive Operation Report")
      lines.push("")
      lines.push(`**Generated**: ${new Date().toISOString()}`)
      lines.push("")
      lines.push("---")
      lines.push("")

      // Include executive summary
      lines.push(executiveTemplate.render(data, format))
      lines.push("")
      lines.push("---")
      lines.push("")

      // Include technical findings
      lines.push(technicalTemplate.render(data, format))
      lines.push("")
      lines.push("---")
      lines.push("")

      // Include timeline
      lines.push(this.renderTimelineReport(data, format))
    }

    return lines.join("\n")
  }

  private async saveReport(config: ReportConfig, content: string, metadata: any) {
    if (config.operationId) {
      switch (config.type) {
        case "executive":
          return await prisma.executiveReport.create({
            data: {
              title: this.generateTitle(config, {}),
              operationId: config.operationId,
              period: {
                start: config.startDate || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
                end: config.endDate || new Date(),
              },
              summary: { content },
              keyFindings: {},
              riskAssessment: {},
              recommendations: {},
              nextSteps: {},
              appendix: {},
            },
          })
        case "technical":
          return await prisma.technicalReport.create({
            data: {
              title: this.generateTitle(config, {}),
              operationId: config.operationId,
              methodology: {},
              findings: { content },
              vulnerabilities: {},
              exploits: {},
              evidence: {},
              tools: {},
              conclusions: {},
            },
          })
        case "timeline":
          return await prisma.timelineReport.create({
            data: {
              title: this.generateTitle(config, {}),
              operationId: config.operationId,
              events: {},
              milestones: {},
              activities: {},
              communications: {},
              decisions: {},
            },
          })
        default:
          throw new Error(`Cannot save report type: ${config.type}`)
      }
    }

    // Return a mock ID if no operation
    return { id: `report_${Date.now()}` }
  }

  private generateTitle(config: ReportConfig, data: ReportData): string {
    const date = new Date().toISOString().split("T")[0]
    const operationName = data.operation?.name || "General"

    const typeLabels: Record<ReportType, string> = {
      executive: "Executive Summary",
      technical: "Technical Findings",
      timeline: "Timeline Analysis",
      comprehensive: "Comprehensive Report",
    }

    return `${typeLabels[config.type]} - ${operationName} - ${date}`
  }

  private countDataPoints(data: ReportData): number {
    let count = 0
    if (data.operation) {
      count += data.operation.objectives.length
      count += data.operation.tasks.length
    }
    if (data.beacons) count += data.beacons.length
    if (data.credentials) count += data.credentials.length
    if (data.lateralMovements) count += data.lateralMovements.length
    if (data.implants) count += data.implants.length
    return count
  }

  async getReports(operationId?: string) {
    const where = operationId ? { operationId } : {}

    const [executive, technical, timeline] = await Promise.all([
      prisma.executiveReport.findMany({
        where,
        orderBy: { generatedAt: "desc" },
        take: 20,
      }),
      prisma.technicalReport.findMany({
        where,
        orderBy: { generatedAt: "desc" },
        take: 20,
      }),
      prisma.timelineReport.findMany({
        where,
        orderBy: { generatedAt: "desc" },
        take: 20,
      }),
    ])

    return {
      executive: executive.map((r) => ({
        id: r.id,
        title: r.title,
        type: "executive" as const,
        format: "markdown" as const,
        generatedAt: r.generatedAt,
        operationId: r.operationId,
      })),
      technical: technical.map((r) => ({
        id: r.id,
        title: r.title,
        type: "technical" as const,
        format: "markdown" as const,
        generatedAt: r.generatedAt,
        operationId: r.operationId,
      })),
      timeline: timeline.map((r) => ({
        id: r.id,
        title: r.title,
        type: "timeline" as const,
        format: "markdown" as const,
        generatedAt: r.generatedAt,
        operationId: r.operationId,
      })),
    }
  }

  async getOperations() {
    const operations = await prisma.operation.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: {
            objectives: true,
            tasks: true,
          },
        },
      },
      take: 50,
    })

    return operations.map((op) => ({
      id: op.id,
      name: op.name,
      description: op.description,
      type: op.type,
      status: op.status,
      createdAt: op.createdAt,
      objectiveCount: op._count.objectives,
      taskCount: op._count.tasks,
    }))
  }
}

export const reportGenerator = new ReportGenerator()