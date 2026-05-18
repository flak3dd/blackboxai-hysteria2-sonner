"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"

const LINKS = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/operations/nodes", label: "Infrastructure" },
  { href: "/admin/security/beacons", label: "Beacons" },
  { href: "/admin/operations/transport", label: "Protocols" },
  { href: "/admin/security/payloads", label: "Payloads" },
  { href: "/admin/intelligence/osint", label: "OSINT" },
  { href: "/admin/operations/network", label: "Network" },
  { href: "/admin/lotl", label: "LotL Arsenal" },
  { href: "/admin/security/forensics", label: "Anti-Forensics" },
  { href: "/admin/security/threat", label: "Threat Intel" },
  { href: "/admin/intelligence/analytics", label: "Analytics" },
  { href: "/admin/intelligence/coordination", label: "Team Ops" },
  { href: "/admin/communication/mail", label: "Mail Test" },
  { href: "/admin/communication/mail/migrator", label: "Migrator" },
  { href: "/admin/intelligence/reports", label: "Reports" },
]

export function AdminNav() {
  const pathname = usePathname()
  return (
    <nav className="flex items-center gap-4 text-sm">
      {LINKS.map((l) => {
        const active =
          l.href === "/admin" ? pathname === "/admin" : pathname?.startsWith(l.href)
        return (
          <Link
            key={l.href}
            href={l.href}
            className={cn(
              "transition-colors",
              active ? "text-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {l.label}
          </Link>
        )
      })}
    </nav>
  )
}
