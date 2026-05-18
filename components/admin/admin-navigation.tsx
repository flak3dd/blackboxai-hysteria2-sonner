/**
 * Admin Navigation Component
 * 
 * Comprehensive navigation for the admin interface with all features organized by category
 */

"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { 
  LayoutDashboard,
  Server,
  Mail,
  Shield,
  Target,
  Brain,
  Database,
  Key,
  Settings,
  Users,
  Bell,
  FileText,
  Activity,
  Globe,
  Lock,
  Zap,
  Eye
} from "lucide-react"

interface NavItem {
  title: string
  href: string
  icon: React.Component<{ className?: string }>
  category: string
}

const navItems: NavItem[] = [
  // Operations
  { title: "Overview", href: "/admin", icon: LayoutDashboard, category: "Operations" },
  { title: "Quick Ops", href: "/admin/operations/quick-ops", icon: Zap, category: "Operations" },
  { title: "Network Map", href: "/admin/operations/network", icon: Globe, category: "Operations" },
  { title: "Nodes", href: "/admin/operations/nodes", icon: Server, category: "Operations" },
  { title: "Infrastructure", href: "/admin/operations/infrastructure", icon: Database, category: "Operations" },
  { title: "Transport", href: "/admin/operations/transport", icon: Activity, category: "Operations" },
  { title: "Traffic", href: "/admin/operations/infrastructure/traffic", icon: Activity, category: "Operations" },
  
  // Security
  { title: "Beacons", href: "/admin/security/beacons", icon: Eye, category: "Security" },
  { title: "Implants", href: "/admin/security/implants", icon: Lock, category: "Security" },
  { title: "Payloads", href: "/admin/security/payloads", icon: Zap, category: "Security" },
  { title: "Post-Exploitation", href: "/admin/security/post-exploitation", icon: Target, category: "Security" },
  { title: "Forensics", href: "/admin/security/forensics", icon: FileText, category: "Security" },
  { title: "Threat Intel", href: "/admin/security/threat", icon: Shield, category: "Security" },
  { title: "Credentials", href: "/admin/security/credentials", icon: Key, category: "Security" },
  { title: "Lateral Movement", href: "/admin/security/lateral-movement", icon: Activity, category: "Security" },
  
  // Intelligence
  { title: "Analytics", href: "/admin/intelligence/analytics", icon: Activity, category: "Intelligence" },
  { title: "Campaigns", href: "/admin/intelligence/campaigns", icon: Target, category: "Intelligence" },
  { title: "Coordination", href: "/admin/intelligence/coordination", icon: Users, category: "Intelligence" },
  { title: "OSINT", href: "/admin/intelligence/osint", icon: Globe, category: "Intelligence" },
  { title: "Notifications", href: "/admin/intelligence/notifications", icon: Bell, category: "Intelligence" },
  { title: "Reports", href: "/admin/intelligence/reports", icon: FileText, category: "Intelligence" },
  
  // Automation
  { title: "AI Assistant", href: "/admin/automation/ai", icon: Brain, category: "Automation" },
  { title: "ShadowGrok Approvals", href: "/admin/automation/shadowgrok-approvals", icon: Shield, category: "Automation" },
  { title: "Workflow", href: "/admin/automation/workflow", icon: Activity, category: "Automation" },
  { title: "Workflow Analytics", href: "/admin/automation/workflow/analytics", icon: FileText, category: "Automation" },
  
  // Configuration
  { title: "Configs", href: "/admin/configuration/configs", icon: Settings, category: "Configuration" },
  { title: "Config Audit", href: "/admin/configuration/config-audit", icon: Shield, category: "Configuration" },
  { title: "Profiles", href: "/admin/configuration/profiles", icon: FileText, category: "Configuration" },
  { title: "Secrets", href: "/admin/configuration/secrets", icon: Key, category: "Configuration" },
  { title: "Users", href: "/admin/configuration/users", icon: Users, category: "Configuration" },
  { title: "Settings", href: "/admin/configuration/settings", icon: Settings, category: "Configuration" },
  
  // Mail
  { title: "Mail", href: "/admin/mail", icon: Mail, category: "Mail" },
  { title: "Simple Bulk Email", href: "/admin/mail/simple-bulk-email", icon: Mail, category: "Mail" },
  
  // Azure
  { title: "Azure Batch Ops", href: "/admin/azure/batch", icon: Server, category: "Azure" },
  
  // Visualization
  { title: "Cyber Network", href: "/admin/visualization/cyber-network", icon: Activity, category: "Visualization" },
  
  // Other
  { title: "LOTL", href: "/admin/lotl", icon: Lock, category: "Other" },
]

interface AdminNavigationProps {
  className?: string
  orientation?: "sidebar" | "horizontal"
}

export function AdminNavigation({ className, orientation = "sidebar" }: AdminNavigationProps) {
  const pathname = usePathname()
  
  const categories = Array.from(new Set(navItems.map(item => item.category)))
  
  if (orientation === "horizontal") {
    return (
      <div className={cn("border-b bg-background", className)}>
        <div className="flex gap-1 px-4 overflow-x-auto">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-2 px-3 py-4 text-sm font-medium border-b-2 transition-colors",
                  isActive
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:border-transparent"
                )}
              >
                <Icon className="h-4 w-4" />
                {item.title}
              </Link>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div className={cn("space-y-6", className)}>
      {categories.map((category) => (
        <div key={category}>
          <h3 className="text-sm font-semibold text-muted-foreground mb-3">{category}</h3>
          <div className="space-y-1">
            {navItems
              .filter(item => item.category === category)
              .map((item) => {
                const Icon = item.icon
                const isActive = pathname === item.href
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {item.title}
                  </Link>
                )
              })}
          </div>
        </div>
      ))}
    </div>
  )
}
