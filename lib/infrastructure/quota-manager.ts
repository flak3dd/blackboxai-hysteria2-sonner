import { prisma } from "@/lib/db"
import logger from "@/lib/logger"

const log = logger.child({ module: "quota-manager" })

/* ------------------------------------------------------------------ */
/*  Interfaces                                                        */
/* ------------------------------------------------------------------ */

export interface QuotaConfig {
  userId: string
  maxBytes: bigint
  periodDays: number
  warnAtPercent: number
  blockAtPercent: number
}

export interface QuotaUsage {
  userId: string
  usedBytes: bigint
  maxBytes: bigint
  percentUsed: number
  periodStart: Date
  periodEnd: Date
  status: "normal" | "warning" | "exceeded"
}

/* ------------------------------------------------------------------ */
/*  QuotaManager Class                                                */
/* ------------------------------------------------------------------ */

export class QuotaManager {
  async checkQuota(userId: string): Promise<QuotaUsage> {
    const user = await prisma.clientUser.findUnique({ where: { id: userId } })
    if (!user) throw new Error(`User not found: ${userId}`)

    const maxBytes = user.quotaBytes || BigInt(0)
    const usedBytes = user.usedBytes

    const createdAt = new Date(user.createdAt)
    const now = new Date()
    let periodStart = new Date(createdAt)
    while (periodStart < now) {
      const next = new Date(periodStart)
      next.setDate(next.getDate() + 30)
      if (next > now) break
      periodStart = next
    }
    const periodEnd = new Date(periodStart)
    periodEnd.setDate(periodEnd.getDate() + 30)

    const percentUsed = maxBytes > BigInt(0)
      ? Number((usedBytes * BigInt(100)) / maxBytes)
      : (usedBytes > BigInt(0) ? 100 : 0)

    let status: QuotaUsage["status"] = "normal"
    if (percentUsed >= 100) status = "exceeded"
    else if (percentUsed >= 80) status = "warning"

    return { userId, usedBytes, maxBytes, percentUsed, periodStart, periodEnd, status }
  }

  async recordUsage(userId: string, bytes: number, nodeId: string): Promise<void> {
    try {
      await prisma.usageRecord.create({ data: { userId, nodeId, tx: bytes, rx: 0, capturedAt: new Date() } })
      await prisma.clientUser.update({ where: { id: userId }, data: { usedBytes: { increment: BigInt(bytes) } } })
      log.debug({ userId, bytes, nodeId }, "Usage recorded")
    } catch (error) {
      log.error({ err: error, userId, bytes, nodeId }, "Failed to record usage")
      throw error
    }
  }

  async setQuota(userId: string, config: QuotaConfig): Promise<void> {
    try {
      await prisma.clientUser.update({ where: { id: userId }, data: { quotaBytes: config.maxBytes } })
      log.info({ userId, maxBytes: config.maxBytes.toString(), periodDays: config.periodDays }, "Quota set")
    } catch (error) {
      log.error({ err: error, userId }, "Failed to set quota")
      throw error
    }
  }

  async getTopUsers(limit: number = 10): Promise<QuotaUsage[]> {
    const users = await prisma.clientUser.findMany({
      where: { usedBytes: { gt: BigInt(0) } },
      orderBy: { usedBytes: "desc" },
      take: limit,
    })

    return users.map(user => {
      const maxBytes = user.quotaBytes || BigInt(0)
      const usedBytes = user.usedBytes
      const percentUsed = maxBytes > BigInt(0)
        ? Number((usedBytes * BigInt(100)) / maxBytes)
        : (usedBytes > BigInt(0) ? 100 : 0)

      let status: QuotaUsage["status"] = "normal"
      if (percentUsed >= 100) status = "exceeded"
      else if (percentUsed >= 80) status = "warning"

      const periodStart = new Date(user.createdAt)
      const periodEnd = new Date(periodStart)
      periodEnd.setDate(periodEnd.getDate() + 30)

      return { userId: user.id, usedBytes, maxBytes, percentUsed, periodStart, periodEnd, status }
    })
  }

  async resetPeriod(userId: string): Promise<void> {
    try {
      await prisma.clientUser.update({ where: { id: userId }, data: { usedBytes: BigInt(0) } })
      log.info({ userId }, "Usage period reset")
    } catch (error) {
      log.error({ err: error, userId }, "Failed to reset period")
      throw error
    }
  }

  async getBlocklist(): Promise<string[]> {
    const users = await prisma.clientUser.findMany({
      where: { quotaBytes: { not: null } },
      select: { id: true, quotaBytes: true, usedBytes: true },
    })
    return users.filter(u => u.quotaBytes !== null && u.usedBytes >= u.quotaBytes!).map(u => u.id)
  }

  async isUserBlocked(userId: string): Promise<boolean> {
    const user = await prisma.clientUser.findUnique({
      where: { id: userId },
      select: { quotaBytes: true, usedBytes: true },
    })
    if (!user || !user.quotaBytes) return false
    return user.usedBytes >= user.quotaBytes
  }
}

let instance: QuotaManager | null = null
export function getQuotaManager(): QuotaManager {
  if (!instance) instance = new QuotaManager()
  return instance
}
