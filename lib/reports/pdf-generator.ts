import { prisma } from "@/lib/db"
import logger from "@/lib/logger"

const log = logger.child({ module: "reports/pdf-generator" })

/* ------------------------------------------------------------------ */
/*  Interfaces                                                        */
/* ------------------------------------------------------------------ */

export interface PdfReportConfig {
  title: string
  subtitle?: string
  author: string
  operationId?: string
  includeCharts: boolean
  includeEvidence: boolean
  branding?: { logo?: string; primaryColor: string; companyName: string }
}

export type ReportData = {
  operation?: {
    id: string; name: string; description: string; type: string; status: string; createdAt: Date
    objectives: Array<{ title: string; description: string; completed: boolean }>
    tasks: Array<{ title: string; status: string; priority: string; estimatedDuration: number; actualDuration?: number }>
  }
  beacons?: Array<{ hostname: string; ipAddress: string; os: string; status: string; lastSeen: Date }>
  credentials?: Array<{ type: string; username: string; domain?: string; cracked: boolean }>
  lateralMovements?: Array<{ fromHostname: string; toHostname: string; technique: string; status: string; timestamp: Date }>
  implants?: Array<{ id: string; name: string; type: string; status: string }>
}

/* ------------------------------------------------------------------ */
/*  CSS Styles                                                         */
/* ------------------------------------------------------------------ */

function getBaseCss(config: PdfReportConfig): string {
  const primary = config.branding?.primaryColor || "#1a1a2e"
  const companyName = config.branding?.companyName || "Operations"
  return `
@page { size: A4; margin: 2cm 2.5cm; @bottom-center { content: counter(page) " / " counter(pages); font-size: 9pt; color: #888; } @top-right { content: "${companyName} - ${config.title}"; font-size: 8pt; color: #aaa; } }
@media print { body { margin: 0; } .page-break { page-break-before: always; } .no-break { page-break-inside: avoid; } }
body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 11pt; line-height: 1.6; color: #222; }
h1 { color: ${primary}; font-size: 22pt; border-bottom: 3px solid ${primary}; padding-bottom: 8px; margin-top: 30px; }
h2 { color: ${primary}; font-size: 16pt; border-bottom: 1px solid #ddd; padding-bottom: 5px; margin-top: 24px; }
h3 { color: #444; font-size: 13pt; margin-top: 18px; }
table { width: 100%; border-collapse: collapse; margin: 15px 0; font-size: 10pt; }
th { background-color: ${primary}; color: white; padding: 8px 12px; text-align: left; font-weight: 600; }
td { border: 1px solid #ddd; padding: 6px 12px; }
tr:nth-child(even) td { background-color: #f9f9f9; }
.severity-critical { color: #dc2626; font-weight: bold; }
.severity-high { color: #ea580c; font-weight: bold; }
.severity-medium { color: #d97706; }
.severity-low { color: #65a30d; }
.metric-box { display: inline-block; width: 22%; margin: 1%; padding: 12px; border: 1px solid #ddd; border-radius: 6px; text-align: center; background: #f8f8f8; }
.metric-value { font-size: 24pt; font-weight: bold; color: ${primary}; }
.metric-label { font-size: 9pt; color: #666; text-transform: uppercase; }
.cover-page { text-align: center; padding-top: 150px; }
.cover-page h1 { font-size: 28pt; border: none; margin-bottom: 10px; }
.cover-page .subtitle { font-size: 14pt; color: #666; margin-bottom: 40px; }
.cover-page .meta { font-size: 10pt; color: #888; }
.evidence-block { background: #f5f5f5; border-left: 4px solid ${primary}; padding: 12px 16px; margin: 12px 0; font-family: 'Courier New', monospace; font-size: 9pt; white-space: pre-wrap; }
.footer-note { font-size: 8pt; color: #999; border-top: 1px solid #ddd; padding-top: 8px; margin-top: 40px; }
.chart-placeholder { border: 2px dashed #ccc; border-radius: 8px; padding: 30px; text-align: center; color: #999; margin: 20px 0; }`
}

/* ------------------------------------------------------------------ */
/*  SVG Chart                                                          */
/* ------------------------------------------------------------------ */

function generateBarChartSvg(data: Array<{ label: string; value: number }>, width = 500, height = 200): string {
  const maxVal = Math.max(...data.map(d => d.value), 1)
  const barWidth = Math.floor((width - 60) / data.length) - 8
  const chartHeight = height - 40
  let bars = ""
  data.forEach((d, i) => {
    const barHeight = Math.round((d.value / maxVal) * chartHeight)
    const x = 40 + i * (barWidth + 8)
    const y = chartHeight - barHeight
    bars += `<rect x="${x}" y="${y}" width="${barWidth}" height="${barHeight}" fill="#1a1a2e" rx="2"/>`
    bars += `<text x="${x + barWidth / 2}" y="${chartHeight + 15}" text-anchor="middle" font-size="9" fill="#666">${d.label}</text>`
    bars += `<text x="${x + barWidth / 2}" y="${y - 5}" text-anchor="middle" font-size="9" fill="#333">${d.value}</text>`
  })
  return `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">${bars}</svg>`
}

/* ------------------------------------------------------------------ */
/*  Report Generator                                                   */
/* ------------------------------------------------------------------ */

export async function generatePdfReport(config: PdfReportConfig, data: ReportData): Promise<{ buffer: Buffer; pageCount: number; sizeBytes: number }> {
  log.info({ title: config.title }, "Generating PDF report")

  const sections: Array<{ id: string; title: string }> = [
    { id: "overview", title: "Overview" }, { id: "metrics", title: "Operational Metrics" },
  ]
  if (data.operation) { sections.push({ id: "objectives", title: "Objectives Status" }); sections.push({ id: "tasks", title: "Task Progress" }) }
  if (data.beacons?.length) sections.push({ id: "beacons", title: "Beacon Activity" })
  if (data.credentials?.length) sections.push({ id: "credentials", title: "Credential Harvest" })
  if (data.lateralMovements?.length) sections.push({ id: "lateral", title: "Lateral Movement" })
  if (config.includeEvidence) sections.push({ id: "evidence", title: "Evidence & Artifacts" })

  let body = ""

  // Cover page
  const logo = config.branding?.logo ? `<img src="${config.branding.logo}" alt="Logo" style="max-height:80px;margin-bottom:20px;"/>` : ""
  body += `<div class="cover-page">${logo}<h1>${config.title}</h1>${config.subtitle ? `<div class="subtitle">${config.subtitle}</div>` : ""}
    <div class="meta"><p><strong>Author:</strong> ${config.author}</p><p><strong>Generated:</strong> ${new Date().toISOString()}</p><p><strong>Classification:</strong> INTERNAL USE ONLY</p></div></div><div class="page-break"></div>`

  // TOC
  body += `<div class="toc"><h2>Table of Contents</h2><ol>${sections.map(s => `<li><a href="#${s.id}">${s.title}</a></li>`).join("\n")}</ol></div>`

  // Overview
  body += `<div class="page-break"></div><div id="overview"><h2>Overview</h2>`
  if (data.operation) {
    body += `<p><strong>Operation:</strong> ${data.operation.name}</p><p><strong>Type:</strong> ${data.operation.type}</p><p><strong>Status:</strong> ${data.operation.status}</p><p><strong>Started:</strong> ${data.operation.createdAt.toISOString()}</p>`
    if (data.operation.description) body += `<p><strong>Description:</strong> ${data.operation.description}</p>`
  } else { body += `<p>No operation data available.</p>` }
  body += `</div>`

  // Metrics
  body += `<div id="metrics"><h2>Operational Metrics</h2><div>
    <div class="metric-box"><div class="metric-value">${data.beacons?.length || 0}</div><div class="metric-label">Beacons</div></div>
    <div class="metric-box"><div class="metric-value">${data.credentials?.length || 0}</div><div class="metric-label">Credentials</div></div>
    <div class="metric-box"><div class="metric-value">${data.lateralMovements?.length || 0}</div><div class="metric-label">Lateral Moves</div></div>
    <div class="metric-box"><div class="metric-value">${data.implants?.length || 0}</div><div class="metric-label">Implants</div></div></div></div>`

  if (config.includeCharts) {
    body += `<div class="chart-placeholder">${generateBarChartSvg([
      { label: "Beacons", value: data.beacons?.length || 0 }, { label: "Credentials", value: data.credentials?.length || 0 },
      { label: "Lateral", value: data.lateralMovements?.length || 0 }, { label: "Implants", value: data.implants?.length || 0 },
    ])}</div>`
  }

  // Objectives
  if (data.operation) {
    body += `<div class="page-break"></div><div id="objectives"><h2>Objectives Status</h2><table><tr><th>Objective</th><th>Description</th><th>Status</th></tr>
      ${data.operation.objectives.map(o => `<tr><td>${o.title}</td><td>${o.description}</td><td class="${o.completed ? "severity-low" : "severity-medium"}">${o.completed ? "Completed" : "Pending"}</td></tr>`).join("")}</table></div>`

    body += `<div id="tasks"><h2>Task Progress</h2><table><tr><th>Task</th><th>Priority</th><th>Status</th><th>Duration</th></tr>
      ${data.operation.tasks.map(t => `<tr><td>${t.title}</td><td class="severity-${t.priority === "HIGH" ? "critical" : t.priority === "MEDIUM" ? "medium" : "low"}">${t.priority}</td><td>${t.status}</td><td>${t.actualDuration || t.estimatedDuration}h</td></tr>`).join("")}</table></div>`
  }

  // Beacons
  if (data.beacons?.length) {
    body += `<div class="page-break"></div><div id="beacons"><h2>Beacon Activity</h2><table><tr><th>Hostname</th><th>IP Address</th><th>OS</th><th>Status</th><th>Last Seen</th></tr>
      ${data.beacons.map(b => `<tr><td>${b.hostname}</td><td>${b.ipAddress}</td><td>${b.os}</td><td>${b.status}</td><td>${b.lastSeen.toISOString()}</td></tr>`).join("")}</table></div>`
  }

  // Credentials
  if (data.credentials?.length) {
    body += `<div id="credentials"><h2>Credential Harvest</h2><table><tr><th>Type</th><th>Username</th><th>Domain</th><th>Cracked</th></tr>
      ${data.credentials.map(c => `<tr><td>${c.type}</td><td>${c.username}</td><td>${c.domain || "-"}</td><td class="${c.cracked ? "severity-low" : "severity-high"}">${c.cracked ? "Yes" : "No"}</td></tr>`).join("")}</table></div>`
  }

  // Lateral movement
  if (data.lateralMovements?.length) {
    body += `<div id="lateral"><h2>Lateral Movement</h2><table><tr><th>From</th><th>To</th><th>Technique</th><th>Status</th><th>Timestamp</th></tr>
      ${data.lateralMovements.map(m => `<tr><td>${m.fromHostname}</td><td>${m.toHostname}</td><td>${m.technique}</td><td>${m.status}</td><td>${m.timestamp.toISOString()}</td></tr>`).join("")}</table></div>`
  }

  // Evidence
  if (config.includeEvidence) {
    body += `<div class="page-break"></div><div id="evidence"><h2>Evidence & Artifacts</h2><p>Detailed evidence and artifacts collected during the operation.</p><div class="evidence-block">Evidence data would be populated from operation logs and artifact collection.</div></div>`
  }

  body += `<div class="footer-note"><p>This report was automatically generated by the ${config.branding?.companyName || "Operations"} reporting system.</p><p>Classification: INTERNAL USE ONLY | Generated: ${new Date().toISOString()}</p></div>`

  const html = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"/><title>${config.title}</title><style>${getBaseCss(config)}</style></head><body>${body}</body></html>`
  const buffer = Buffer.from(html, "utf-8")
  const pageCount = Math.max(1, Math.ceil(html.length / 3000))

  return { buffer, pageCount, sizeBytes: buffer.byteLength }
}

export async function generateExecutivePdf(data: any, config: PdfReportConfig): Promise<Buffer> {
  const result = await generatePdfReport({ ...config, title: config.title || "Executive Summary", subtitle: config.subtitle || "Leadership Briefing", includeCharts: true, includeEvidence: false }, data)
  return result.buffer
}

export async function generateTechnicalPdf(data: any, config: PdfReportConfig): Promise<Buffer> {
  const result = await generatePdfReport({ ...config, title: config.title || "Technical Findings", subtitle: config.subtitle || "Detailed Technical Analysis", includeCharts: true, includeEvidence: true }, data)
  return result.buffer
}
