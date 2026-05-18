/**
 * Simplified Mail Page
 * 
 * A clean, focused interface for email operations:
 * - Bulk Email Sending
 * - Template Management
 * - Quick Test Email
 */

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@c2panel/ui/components/ui/tabs"
import { SimpleBulkEmail } from "@/components/admin/mail/simple-bulk-email"
import { SimpleTemplates } from "@/components/admin/mail/simple-templates"

export const dynamic = "force-dynamic"

export default function SimpleMailPage() {
  return (
    <div className="container mx-auto py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Mail</h1>
        <p className="text-muted-foreground">Simplified email management</p>
      </div>

      <Tabs defaultValue="bulk" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="bulk">Bulk Email</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="quick">Quick Test</TabsTrigger>
        </TabsList>

        <TabsContent value="bulk">
          <SimpleBulkEmail />
        </TabsContent>

        <TabsContent value="templates">
          <SimpleTemplates />
        </TabsContent>

        <TabsContent value="quick">
          <QuickTestEmail />
        </TabsContent>
      </Tabs>
    </div>
  )
}

function QuickTestEmail() {
  return (
    <div className="max-w-xl mx-auto">
      <div className="text-center py-12">
        <h3 className="text-lg font-medium">Quick Test Email</h3>
        <p className="text-muted-foreground">Send a quick test email to verify your configuration</p>
      </div>
    </div>
  )
}
