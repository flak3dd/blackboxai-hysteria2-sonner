import { chromium } from "@playwright/test"
import path from "path"

const BASE = "http://localhost:3000"
const OUT  = path.join(process.cwd(), "public/screenshots")

const PAGES = [
  { slug: "dashboard",      url: "/admin",                              label: "Command Center" },
  { slug: "nodes",          url: "/admin/operations/nodes",             label: "Node Management" },
  { slug: "infrastructure", url: "/admin/operations/infrastructure",    label: "Infrastructure" },
  { slug: "payloads",       url: "/admin/security/payloads",            label: "Payload Builder" },
  { slug: "osint",          url: "/admin/intelligence/osint",           label: "OSINT Intelligence" },
  { slug: "ai",             url: "/admin/automation/ai",                label: "AI Automation" },
]

async function run() {
  const browser = await chromium.launch({ headless: true })
  const ctx     = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    colorScheme: "dark",
  })
  const page = await ctx.newPage()

  // ── login ──
  await page.goto(`${BASE}/login`)
  await page.waitForLoadState("networkidle")
  await page.waitForSelector("#username", { timeout: 10_000 })
  await page.fill("#username", "admin")
  await page.fill("#password", "admin123")
  // Disclaimer checkbox (Radix UI renders as role="checkbox" button)
  await page.locator('[role="checkbox"]').click()
  await page.waitForSelector('button[type="submit"]:not([disabled])', { timeout: 5_000 })
  await page.click('button[type="submit"]')
  await page.waitForURL(`${BASE}/admin**`, { timeout: 15_000 })
  await page.waitForLoadState("networkidle")
  await page.waitForTimeout(1200)

  // ── screenshots ──
  for (const p of PAGES) {
    console.log(`→ ${p.label}`)
    await page.goto(`${BASE}${p.url}`)
    await page.waitForLoadState("networkidle")
    await page.waitForTimeout(1000)
    await page.screenshot({
      path: `${OUT}/${p.slug}.png`,
      clip: { x: 0, y: 0, width: 1440, height: 900 },
    })
    console.log(`  saved ${p.slug}.png`)
  }

  await browser.close()
  console.log("\nDone — screenshots in public/screenshots/")
}

run().catch(e => { console.error(e); process.exit(1) })
