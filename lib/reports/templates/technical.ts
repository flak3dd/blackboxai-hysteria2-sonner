import type { ReportData, ReportFormat } from "../generator"

export class TechnicalTemplate {
  render(data: ReportData, format: ReportFormat = "markdown"): string {
    if (format === "markdown") {
      return this.renderMarkdown(data)
    } else if (format === "json") {
      return this.renderJson(data)
    } else if (format === "html") {
      return this.renderHtml(data)
    }
    return this.renderMarkdown(data)
  }

  private renderMarkdown(data: ReportData): string {
    const lines: string[] = []

    lines.push("# Technical Findings Report")
    lines.push("")
    lines.push(`**Report Generated**: ${new Date().toISOString()}`)
    lines.push(`**Classification**: INTERNAL USE ONLY - TECHNICAL`)
    lines.push("")

    if (data.operation) {
      lines.push("## Operation Details")
      lines.push("")
      lines.push(`**Operation ID**: ${data.operation.id}`)
      lines.push(`**Operation Name**: ${data.operation.name}`)
      lines.push(`**Operation Type**: ${data.operation.type}`)
      lines.push(`**Status**: ${data.operation.status}`)
      lines.push(`**Started**: ${data.operation.createdAt.toISOString()}`)
      lines.push("")
    }

    lines.push("## Methodology")
    lines.push("")
    lines.push(this.generateMethodology(data))
    lines.push("")

    lines.push("## Beacon Analysis")
    lines.push("")
    lines.push(this.generateBeaconAnalysis(data))
    lines.push("")

    lines.push("## Credential Analysis")
    lines.push("")
    lines.push(this.generateCredentialAnalysis(data))
    lines.push("")

    lines.push("## Lateral Movement Analysis")
    lines.push("")
    lines.push(this.generateLateralMovementAnalysis(data))
    lines.push("")

    lines.push("## Implant Analysis")
    lines.push("")
    lines.push(this.generateImplantAnalysis(data))
    lines.push("")

    lines.push("## Task Execution Analysis")
    lines.push("")
    lines.push(this.generateTaskAnalysis(data))
    lines.push("")

    lines.push("## Technical Conclusions")
    lines.push("")
    lines.push(this.generateConclusions(data))
    lines.push("")

    lines.push("---")
    lines.push("")
    lines.push("*This technical report contains detailed findings for security professionals.*")
    lines.push("*Refer to the Executive Summary for high-level overview.*")

    return lines.join("\n")
  }

  private renderJson(data: ReportData): string {
    return JSON.stringify(
      {
        type: "technical_findings",
        generatedAt: new Date().toISOString(),
        classification: "INTERNAL USE ONLY - TECHNICAL",
        operation: data.operation,
        methodology: this.generateMethodology(data),
        beaconAnalysis: this.generateBeaconAnalysis(data),
        credentialAnalysis: this.generateCredentialAnalysis(data),
        lateralMovementAnalysis: this.generateLateralMovementAnalysis(data),
        implantAnalysis: this.generateImplantAnalysis(data),
        taskAnalysis: this.generateTaskAnalysis(data),
        conclusions: this.generateConclusions(data),
      },
      null,
      2
    )
  }

  private renderHtml(data: ReportData): string {
    let html = `<!DOCTYPE html>
<html>
<head>
  <title>Technical Findings Report</title>
  <style>
    body { font-family: 'Courier New', monospace; max-width: 900px; margin: 0 auto; padding: 20px; }
    h1 { color: #333; border-bottom: 2px solid #333; }
    h2 { color: #555; margin-top: 30px; }
    h3 { color: #666; }
    pre { background-color: #f5f5f5; padding: 15px; border-radius: 5px; overflow-x: auto; }
    code { background-color: #f0f0f0; padding: 2px 6px; border-radius: 3px; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
    th { background-color: #e8e8e8; }
  </style>
</head>
<body>
  <h1>Technical Findings Report</h1>
  <p><strong>Report Generated:</strong> ${new Date().toISOString()}</p>
  <p><strong>Classification:</strong> INTERNAL USE ONLY - TECHNICAL</p>
`

    if (data.operation) {
      html += `
  <h2>Operation Details</h2>
  <p><strong>Operation ID:</strong> <code>${data.operation.id}</code></p>
  <p><strong>Operation Name:</strong> ${data.operation.name}</p>
  <p><strong>Operation Type:</strong> ${data.operation.type}</p>
  <p><strong>Status:</strong> ${data.operation.status}</p>
  <p><strong>Started:</strong> ${data.operation.createdAt.toISOString()}</p>
`
    }

    html += `
  <h2>Methodology</h2>
  <pre>${this.generateMethodology(data)}</pre>

  <h2>Beacon Analysis</h2>
  <pre>${this.generateBeaconAnalysis(data)}</pre>

  <h2>Credential Analysis</h2>
  <pre>${this.generateCredentialAnalysis(data)}</pre>

  <h2>Lateral Movement Analysis</h2>
  <pre>${this.generateLateralMovementAnalysis(data)}</pre>

  <h2>Implant Analysis</h2>
  <pre>${this.generateImplantAnalysis(data)}</pre>

  <h2>Task Execution Analysis</h2>
  <pre>${this.generateTaskAnalysis(data)}</pre>

  <h2>Technical Conclusions</h2>
  <pre>${this.generateConclusions(data)}</pre>

  <hr>
  <p><em>This technical report contains detailed findings for security professionals.</em></p>
  <p><em>Refer to the Executive Summary for high-level overview.</em></p>
</body>
</html>`

    return html
  }

  private generateMethodology(data: ReportData): string {
    let methodology = "This technical report documents the findings from the red team operation.\n\n"
    methodology += "### Data Collection Methods\n"
    methodology += "- Beacon telemetry and check-in data\n"
    methodology += "- Credential harvesting from compromised hosts\n"
    methodology += "- Lateral movement execution logs\n"
    methodology += "- Implant deployment and status monitoring\n"
    methodology += "- Task execution results\n\n"

    if (data.operation) {
      methodology += `### Operation Scope\n`
      methodology += `- Operation Type: ${data.operation.type}\n`
      methodology += `- Target Environment: Enterprise network\n`
      methodology += `- Assessment Duration: Ongoing\n`
    }

    return methodology
  }

  private generateBeaconAnalysis(data: ReportData): string {
    if (!data.beacons || data.beacons.length === 0) {
      return "No beacon data available for analysis."
    }

    let analysis = `### Beacon Summary\n`
    analysis += `- Total Beacons: ${data.beacons.length}\n`

    const statusCounts = data.beacons.reduce((acc, beacon) => {
      acc[beacon.status] = (acc[beacon.status] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    analysis += `- Status Breakdown:\n`
    Object.entries(statusCounts).forEach(([status, count]) => {
      analysis += `  - ${status}: ${count}\n`
    })

    analysis += `\n### Detailed Beacon Information\n\n`
    analysis += `| Hostname | IP Address | OS | Status | Last Check-in |\n`
    analysis += `|----------|------------|-----|--------|--------------|\n`

    data.beacons.slice(0, 20).forEach((beacon) => {
      analysis += `| ${beacon.hostname} | ${beacon.ipAddress} | ${beacon.os} | ${beacon.status} | ${beacon.lastSeen.toISOString()} |\n`
    })

    const staleBeacons = data.beacons.filter((b) => {
      const hoursSinceLastSeen = (Date.now() - b.lastSeen.getTime()) / (1000 * 60 * 60)
      return hoursSinceLastSeen > 24
    })

    if (staleBeacons.length > 0) {
      analysis += `\n### Stale Beacons (>24 hours)\n`
      analysis += `${staleBeacons.length} beacons have not checked in within 24 hours:\n`
      staleBeacons.forEach((beacon) => {
        const hoursSince = ((Date.now() - beacon.lastSeen.getTime()) / (1000 * 60 * 60)).toFixed(1)
        analysis += `- ${beacon.hostname} (${beacon.ipAddress}) - Last seen ${hoursSince} hours ago\n`
      })
    }

    return analysis
  }

  private generateCredentialAnalysis(data: ReportData): string {
    if (!data.credentials || data.credentials.length === 0) {
      return "No credential data available for analysis."
    }

    let analysis = `### Credential Summary\n`
    analysis += `- Total Credentials: ${data.credentials.length}\n`

    const typeCounts = data.credentials.reduce((acc, cred) => {
      acc[cred.type] = (acc[cred.type] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    analysis += `- Type Breakdown:\n`
    Object.entries(typeCounts).forEach(([type, count]) => {
      analysis += `  - ${type}: ${count}\n`
    })

    const crackedCount = data.credentials.filter((c) => c.cracked).length
    analysis += `- Cracked: ${crackedCount}\n`
    analysis += `- Uncracked: ${data.credentials.length - crackedCount}\n`

    analysis += `\n### Detailed Credential Information\n\n`
    analysis += `| Type | Username | Domain | Cracked |\n`
    analysis += `|------|----------|--------|---------|\n`

    data.credentials.slice(0, 20).forEach((cred) => {
      analysis += `| ${cred.type} | ${cred.username} | ${cred.domain || "N/A"} | ${cred.cracked ? "Yes" : "No"} |\n`
    })

    const uniqueDomains = Array.from(new Set(data.credentials.map((c) => c.domain).filter((d): d is string => Boolean(d))))
    if (uniqueDomains.length > 0) {
      analysis += `\n### Domains Identified\n`
      uniqueDomains.forEach((domain) => {
        const count = data.credentials.filter((c) => c.domain === domain).length
        analysis += `- ${domain}: ${count} credentials\n`
      })
    }

    return analysis
  }

  private generateLateralMovementAnalysis(data: ReportData): string {
    if (!data.lateralMovements || data.lateralMovements.length === 0) {
      return "No lateral movement data available for analysis."
    }

    let analysis = `### Lateral Movement Summary\n`
    analysis += `- Total Movements: ${data.lateralMovements.length}\n`

    const statusCounts = data.lateralMovements.reduce((acc, movement) => {
      acc[movement.status] = (acc[movement.status] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    analysis += `- Status Breakdown:\n`
    Object.entries(statusCounts).forEach(([status, count]) => {
      analysis += `  - ${status}: ${count}\n`
    })

    const techniqueCounts = data.lateralMovements.reduce((acc, movement) => {
      acc[movement.technique] = (acc[movement.technique] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    analysis += `- Technique Breakdown:\n`
    Object.entries(techniqueCounts).forEach(([technique, count]) => {
      analysis += `  - ${technique}: ${count}\n`
    })

    analysis += `\n### Detailed Movement Information\n\n`
    analysis += `| Source | Destination | Technique | Status | Timestamp |\n`
    analysis += `|--------|-------------|-----------|--------|----------|\n`

    data.lateralMovements.slice(0, 20).forEach((movement) => {
      analysis += `| ${movement.fromHostname} | ${movement.toHostname} | ${movement.technique} | ${movement.status} | ${movement.timestamp.toISOString()} |\n`
    })

    const successfulMovements = data.lateralMovements.filter((m) => m.status === "success")
    if (successfulMovements.length > 0) {
      analysis += `\n### Successful Lateral Movement Paths\n`
      const paths = new Map<string, string[]>()
      successfulMovements.forEach((m) => {
        const key = m.fromHostname
        if (!paths.has(key)) {
          paths.set(key, [])
        }
        paths.get(key)!.push(m.toHostname)
      })
      paths.forEach((destinations, source) => {
        analysis += `- ${source} → ${destinations.join(", ")}\n`
      })
    }

    return analysis
  }

  private generateImplantAnalysis(data: ReportData): string {
    if (!data.implants || data.implants.length === 0) {
      return "No implant data available for analysis."
    }

    let analysis = `### Implant Summary\n`
    analysis += `- Total Implants: ${data.implants.length}\n`

    const statusCounts = data.implants.reduce((acc, implant) => {
      acc[implant.status] = (acc[implant.status] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    analysis += `- Status Breakdown:\n`
    Object.entries(statusCounts).forEach(([status, count]) => {
      analysis += `  - ${status}: ${count}\n`
    })

    const typeCounts = data.implants.reduce((acc, implant) => {
      acc[implant.type] = (acc[implant.type] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    analysis += `- Type Breakdown:\n`
    Object.entries(typeCounts).forEach(([type, count]) => {
      analysis += `  - ${type}: ${count}\n`
    })

    analysis += `\n### Detailed Implant Information\n\n`
    analysis += `| Name | Type | Architecture | Status | First Seen | Last Seen |\n`
    analysis += `|------|------|--------------|--------|------------|----------|\n`

    data.implants.slice(0, 20).forEach((implant) => {
      analysis += `| ${implant.name} | ${implant.type} | ${implant.architecture} | ${implant.status} | ${implant.firstSeen.toISOString()} | ${implant.lastSeen?.toISOString() || "N/A"} |\n`
    })

    return analysis
  }

  private generateTaskAnalysis(data: ReportData): string {
    if (!data.operation || data.operation.tasks.length === 0) {
      return "No task data available for analysis."
    }

    let analysis = `### Task Summary\n`
    analysis += `- Total Tasks: ${data.operation.tasks.length}\n`

    const statusCounts = data.operation.tasks.reduce((acc, task) => {
      acc[task.status] = (acc[task.status] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    analysis += `- Status Breakdown:\n`
    Object.entries(statusCounts).forEach(([status, count]) => {
      analysis += `  - ${status}: ${count}\n`
    })

    const priorityCounts = data.operation.tasks.reduce((acc, task) => {
      acc[task.priority] = (acc[task.priority] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    analysis += `- Priority Breakdown:\n`
    Object.entries(priorityCounts).forEach(([priority, count]) => {
      analysis += `  - ${priority}: ${count}\n`
    })

    const totalEstimated = data.operation.tasks.reduce((sum, task) => sum + task.estimatedDuration, 0)
    const totalActual = data.operation.tasks
      .filter((t) => t.actualDuration)
      .reduce((sum, task) => sum + (task.actualDuration || 0), 0)

    analysis += `- Duration Analysis:\n`
    analysis += `  - Total Estimated: ${totalEstimated} hours\n`
    analysis += `  - Total Actual: ${totalActual} hours\n`

    analysis += `\n### Detailed Task Information\n\n`
    analysis += `| Task | Status | Priority | Est. Duration | Actual Duration |\n`
    analysis += `|------|--------|----------|---------------|----------------|\n`

    data.operation.tasks.slice(0, 20).forEach((task) => {
      analysis += `| ${task.title} | ${task.status} | ${task.priority} | ${task.estimatedDuration}h | ${task.actualDuration ? `${task.actualDuration}h` : "N/A"} |\n`
    })

    return analysis
  }

  private generateConclusions(data: ReportData): string {
    let conclusions = "### Technical Conclusions\n\n"

    const points: string[] = []

    if (data.beacons && data.beacons.length > 0) {
      points.push(`Successfully established ${data.beacons.length} beacons within the target environment`)
    }

    if (data.credentials && data.credentials.length > 0) {
      const cracked = data.credentials.filter((c) => c.cracked).length
      points.push(`Harvested ${data.credentials.length} credentials, with ${cracked} successfully cracked for lateral movement`)
    }

    if (data.lateralMovements && data.lateralMovements.length > 0) {
      const successful = data.lateralMovements.filter((m) => m.status === "success").length
      points.push(`Executed ${data.lateralMovements.length} lateral movement attempts, ${successful} successful`)
    }

    if (data.operation) {
      const completedTasks = data.operation.tasks.filter((t) => t.status === "completed").length
      points.push(`Completed ${completedTasks}/${data.operation.tasks.length} operational tasks`)
    }

    if (points.length === 0) {
      points.push("Insufficient data available for technical conclusions")
    }

    conclusions += points.map((p) => `- ${p}`).join("\n")

    conclusions += "\n\n### Recommendations\n"
    conclusions += "- Continue monitoring beacon health and persistence\n"
    conclusions += "- Analyze failed lateral movement attempts for security controls\n"
    conclusions += "- Prioritize cracking of high-value credentials\n"
    conclusions += "- Document all technical findings for final report"

    return conclusions
  }
}

export const technicalTemplate = new TechnicalTemplate()