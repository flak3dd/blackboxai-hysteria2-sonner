import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function AdminOverviewPage() {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold">Overview</h1>
        <p className="text-sm text-muted-foreground">
          Admin shell is live. Dashboard, proxy settings, and mail views land in later phases.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Agents</CardTitle>
            <CardDescription>LLM-driven tasks via Hysteria egress</CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            <a href="/admin/agents" className="underline-offset-2 hover:underline">
              Open agents →
            </a>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Server</CardTitle>
            <CardDescription>Binary lifecycle + config</CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">Coming in Phase 3.</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Mail</CardTitle>
            <CardDescription>IMAP / POP3 account testing</CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">Coming in Phase 4.</CardContent>
        </Card>
      </div>
    </div>
  )
}
