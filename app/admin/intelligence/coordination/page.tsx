"use client"

import { CampaignDashboard } from "@/components/admin/intelligence/coordination/campaign-dashboard"

export const dynamic = "force-dynamic"

export default function CoordinationPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-heading-xl">Multi-Operator Coordination</h1>
        <p className="text-sm text-muted-foreground">
          Coordinate team operations and manage collaborative red team activities.
        </p>
      </div>

      <CampaignDashboard />
    </div>
  )
}