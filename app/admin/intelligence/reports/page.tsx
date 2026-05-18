import { ReportGenerator } from "@/components/admin/intelligence/reports/report-generator"

export const dynamic = "force-dynamic"

export default function ReportsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-heading-xl">Automated Reporting System</h1>
        <p className="text-sm text-muted-foreground">
          Generate comprehensive reports and documentation for red team operations.
        </p>
      </div>

      <ReportGenerator />
    </div>
  )
}