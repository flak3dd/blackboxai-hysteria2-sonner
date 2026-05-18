"use client"

import { useState } from "react"
import { PayloadsView } from "@/components/admin/security/payloads/payloads-view"
import { PayloadBuilder } from "@/components/admin/security/payloads/payload-builder"
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@c2panel/ui/components/ui/tabs"

export const dynamic = "force-dynamic"

export default function PayloadsPage() {
  const [activeTab, setActiveTab] = useState("simple")

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="simple">Simple View</TabsTrigger>
          <TabsTrigger value="advanced">Advanced Builder</TabsTrigger>
        </TabsList>

        <TabsContent value="simple" className="mt-6">
          <PayloadsView />
        </TabsContent>

        <TabsContent value="advanced" className="mt-6">
          <PayloadBuilder />
        </TabsContent>
      </Tabs>
    </div>
  )
}
