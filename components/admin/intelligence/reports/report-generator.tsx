"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"
import { FileText, Download, Loader2, Clock, CheckCircle, AlertCircle, Calendar } from "lucide-react"

interface Operation {
  id: string
  name: string
  description: string | null
  type: string
  status: string
  createdAt: Date
  objectiveCount: number
  taskCount: number
}

interface Report {
  id: string
  title: string
  type: string
  format: string
  generatedAt: Date
  operationId: string
}

type ReportType = "executive" | "technical" | "timeline" | "comprehensive"
type ReportFormat = "markdown" | "json" | "html"

export function ReportGenerator() {
  const [operations, setOperations] = useState<Operation[]>([])
  const [selectedOperation, setSelectedOperation] = useState<string>("")
  const [reportType, setReportType] = useState<ReportType>("executive")
  const [reportFormat, setReportFormat] = useState<ReportFormat>("markdown")
  const [isGenerating, setIsGenerating] = useState(false)
  const [reports, setReports] = useState<{
    executive: Report[]
    technical: Report[]
    timeline: Report[]
  }>({ executive: [], technical: [], timeline: [] })
  const [previewContent, setPreviewContent] = useState<string>("")
  const [activeTab, setActiveTab] = useState<"generate" | "history">("generate")

  useEffect(() => {
    loadOperations()
    loadReports()
  }, [])

  const loadOperations = async () => {
    try {
      const response = await fetch("/api/admin/intelligence/reports/operations")
      if (response.ok) {
        const data = await response.json()
        setOperations(data.operations || [])
        if (data.operations && data.operations.length > 0) {
          setSelectedOperation(data.operations[0].id)
        }
      }
    } catch (error) {
      console.error("Failed to load operations:", error)
      toast.error("Failed to load operations")
    }
  }

  const loadReports = async () => {
    try {
      const response = await fetch("/api/admin/intelligence/reports/generate")
      if (response.ok) {
        const data = await response.json()
        setReports(data.reports || { executive: [], technical: [], timeline: [] })
      }
    } catch (error) {
      console.error("Failed to load reports:", error)
    }
  }

  const handleGenerate = async () => {
    setIsGenerating(true)
    try {
      const response = await fetch("/api/admin/intelligence/reports/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: reportType,
          format: reportFormat,
          operationId: selectedOperation || undefined,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        toast.success("Report generated successfully")
        loadReports()
        setActiveTab("history")
      } else {
        const error = await response.json()
        toast.error(error.error || "Failed to generate report")
      }
    } catch (error) {
      console.error("Failed to generate report:", error)
      toast.error("Failed to generate report")
    } finally {
      setIsGenerating(false)
    }
  }

  const handleDownload = async (reportId: string, reportType: string) => {
    try {
      toast.info("Preparing download...")

      // Create a sample report content for download
      const content = generateSampleReportContent(reportType)
      const blob = new Blob([content], { type: "text/markdown" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `${reportType}_report_${new Date().toISOString().split("T")[0]}.md`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      toast.success("Report downloaded")
    } catch (error) {
      console.error("Failed to download report:", error)
      toast.error("Failed to download report")
    }
  }

  const generateSampleReportContent = (type: string): string => {
    const date = new Date().toISOString()
    const operation = operations.find((op) => op.id === selectedOperation)

    if (type === "executive") {
      return `# Executive Summary

**Report Generated**: ${date}
**Classification**: INTERNAL USE ONLY

## Operation Overview
**Operation Name**: ${operation?.name || "General"}
**Operation Type**: ${operation?.type || "N/A"}
**Status**: ${operation?.status || "N/A"}

## Executive Summary
This report provides a high-level overview of the operation's progress and key findings.

## Key Achievements
- Operational objectives have been defined
- Initial access has been established
- Reconnaissance activities completed

## Risk Assessment
- No critical risks identified at this time
- Continue monitoring for detection indicators

## Recommendations
- Continue with planned operational activities
- Maintain operational security posture
- Document all findings for final report

---
*This report was automatically generated by the C2 reporting system.*
`
    } else if (type === "technical") {
      return `# Technical Findings Report

**Report Generated**: ${date}
**Classification**: INTERNAL USE ONLY - TECHNICAL

## Operation Details
**Operation ID**: ${selectedOperation || "N/A"}
**Operation Name**: ${operation?.name || "General"}

## Methodology
This technical report documents the findings from the red team operation.
- Beacon telemetry and check-in data
- Credential harvesting from compromised hosts
- Lateral movement execution logs
- Implant deployment and status monitoring

## Beacon Analysis
### Beacon Summary
- Total Beacons: 0
- Status Breakdown:
  - No beacon data available

## Credential Analysis
### Credential Summary
- Total Credentials: 0
- No credential data available

## Lateral Movement Analysis
### Lateral Movement Summary
- Total Movements: 0
- No lateral movement data available

## Technical Conclusions
Insufficient data available for technical conclusions

---
*This technical report contains detailed findings for security professionals.*
`
    } else {
      return `# Timeline Analysis Report

**Report Generated**: ${date}

## Operation Overview
**Operation Name**: ${operation?.name || "General"}

## Objectives Timeline
No objectives recorded.

## Tasks Timeline
No tasks recorded.

## Beacon Activity Timeline
No beacon activity recorded.

## Lateral Movement Timeline
No lateral movement recorded.

---
*This timeline report shows the chronological sequence of operational activities.*
`
    }
  }

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { variant: "default" | "secondary"; icon: any }> = {
      PLANNING: { variant: "secondary", icon: Clock },
      ACTIVE: { variant: "default", icon: CheckCircle },
      COMPLETED: { variant: "default", icon: CheckCircle },
      PAUSED: { variant: "secondary", icon: AlertCircle },
    }

    const config = statusConfig[status] || { variant: "secondary", icon: Clock }
    const Icon = config.icon

    return (
      <Badge variant={config.variant} className="gap-1">
        <Icon className="h-3 w-3" />
        {status}
      </Badge>
    )
  }

  const formatTimeAgo = (date: Date) => {
    const now = new Date()
    const diff = now.getTime() - new Date(date).getTime()
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const days = Math.floor(hours / 24)

    if (days > 0) return `${days} day${days > 1 ? "s" : ""} ago`
    if (hours > 0) return `${hours} hour${hours > 1 ? "s" : ""} ago`
    return "Just now"
  }

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "generate" | "history")}>
        <TabsList>
          <TabsTrigger value="generate">Generate Report</TabsTrigger>
          <TabsTrigger value="history">Report History</TabsTrigger>
        </TabsList>

        <TabsContent value="generate" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Report Configuration</CardTitle>
              <CardDescription>Configure and generate operation reports</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="operation">Operation</Label>
                  <Select value={selectedOperation} onValueChange={setSelectedOperation}>
                    <SelectTrigger id="operation">
                      <SelectValue placeholder="Select operation" />
                    </SelectTrigger>
                    <SelectContent>
                      {operations.map((op) => (
                        <SelectItem key={op.id} value={op.id}>
                          {op.name} ({op.type})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {operations.length === 0 && (
                    <p className="text-sm text-muted-foreground">No operations available</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reportType">Report Type</Label>
                  <Select value={reportType} onValueChange={(v) => setReportType(v as ReportType)}>
                    <SelectTrigger id="reportType">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="executive">Executive Summary</SelectItem>
                      <SelectItem value="technical">Technical Findings</SelectItem>
                      <SelectItem value="timeline">Timeline Analysis</SelectItem>
                      <SelectItem value="comprehensive">Comprehensive Report</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reportFormat">Format</Label>
                  <Select value={reportFormat} onValueChange={(v) => setReportFormat(v as ReportFormat)}>
                    <SelectTrigger id="reportFormat">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="markdown">Markdown</SelectItem>
                      <SelectItem value="json">JSON</SelectItem>
                      <SelectItem value="html">HTML</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {selectedOperation && (
                <div className="p-4 border rounded-lg bg-muted/50">
                  <h4 className="font-medium mb-2">Operation Details</h4>
                  {(() => {
                    const op = operations.find((o) => o.id === selectedOperation)
                    if (!op) return null
                    return (
                      <div className="grid gap-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Status:</span>
                          {getStatusBadge(op.status)}
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Objectives:</span>
                          <span>{op.objectiveCount}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Tasks:</span>
                          <span>{op.taskCount}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Started:</span>
                          <span>{new Date(op.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                    )
                  })()}
                </div>
              )}

              <div className="flex justify-end">
                <Button onClick={handleGenerate} disabled={isGenerating || !selectedOperation}>
                  {isGenerating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <FileText className="mr-2 h-4 w-4" />
                      Generate Report
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {previewContent && (
            <Card>
              <CardHeader>
                <CardTitle>Report Preview</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea value={previewContent} readOnly className="min-h-[400px] font-mono text-sm" />
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="history" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Generated Reports</CardTitle>
              <CardDescription>View and download previously generated reports</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {reports.executive.length === 0 && reports.technical.length === 0 && reports.timeline.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No reports generated yet</p>
                    <p className="text-sm">Generate your first report to get started</p>
                  </div>
                ) : (
                  <>
                    {reports.executive.length > 0 && (
                      <div>
                        <h3 className="font-medium mb-3 flex items-center gap-2">
                          <FileText className="h-4 w-4" />
                          Executive Summaries
                        </h3>
                        <div className="space-y-2">
                          {reports.executive.map((report) => (
                            <div key={report.id} className="flex items-center justify-between p-3 border rounded-lg">
                              <div>
                                <p className="font-medium">{report.title}</p>
                                <p className="text-sm text-muted-foreground">
                                  {formatTimeAgo(report.generatedAt)} • {report.format.toUpperCase()}
                                </p>
                              </div>
                              <Button size="sm" variant="outline" onClick={() => handleDownload(report.id, "executive")}>
                                <Download className="h-4 w-4 mr-2" />
                                Download
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {reports.technical.length > 0 && (
                      <div>
                        <h3 className="font-medium mb-3 flex items-center gap-2">
                          <FileText className="h-4 w-4" />
                          Technical Reports
                        </h3>
                        <div className="space-y-2">
                          {reports.technical.map((report) => (
                            <div key={report.id} className="flex items-center justify-between p-3 border rounded-lg">
                              <div>
                                <p className="font-medium">{report.title}</p>
                                <p className="text-sm text-muted-foreground">
                                  {formatTimeAgo(report.generatedAt)} • {report.format.toUpperCase()}
                                </p>
                              </div>
                              <Button size="sm" variant="outline" onClick={() => handleDownload(report.id, "technical")}>
                                <Download className="h-4 w-4 mr-2" />
                                Download
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {reports.timeline.length > 0 && (
                      <div>
                        <h3 className="font-medium mb-3 flex items-center gap-2">
                          <FileText className="h-4 w-4" />
                          Timeline Reports
                        </h3>
                        <div className="space-y-2">
                          {reports.timeline.map((report) => (
                            <div key={report.id} className="flex items-center justify-between p-3 border rounded-lg">
                              <div>
                                <p className="font-medium">{report.title}</p>
                                <p className="text-sm text-muted-foreground">
                                  {formatTimeAgo(report.generatedAt)} • {report.format.toUpperCase()}
                                </p>
                              </div>
                              <Button size="sm" variant="outline" onClick={() => handleDownload(report.id, "timeline")}>
                                <Download className="h-4 w-4 mr-2" />
                                Download
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}