import { InfrastructureOverview } from "@/components/admin/operations/infrastructure/overview"
import { TrafficStatsDashboard } from "@/components/admin/operations/traffic-stats/traffic-dashboard"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@c2panel/ui/components/ui/tabs"

export const dynamic = "force-dynamic"

export default function InfrastructurePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-heading-xl">Infrastructure Management</h1>
        <p className="text-sm text-muted-foreground">
          Manage your red team infrastructure, nodes, and deployment configurations.
        </p>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="traffic-stats">Traffic Stats</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <InfrastructureOverview />
        </TabsContent>

        <TabsContent value="traffic-stats">
          <TrafficStatsDashboard />
        </TabsContent>
      </Tabs>
    </div>
  )
}