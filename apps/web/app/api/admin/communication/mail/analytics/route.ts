import { NextResponse, type NextRequest } from "next/server"
import { verifyAdmin, toErrorResponse } from "@c2panel/infrastructure/security/admin"
import { prisma } from "@c2panel/infrastructure"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    await verifyAdmin(req)

    const searchParams = req.nextUrl.searchParams
    const period = searchParams.get('period') || '7d' // 7d, 30d, 90d, all
    const tunnelType = searchParams.get('tunnelType')

    // Calculate date range
    const now = new Date()
    let startDate = new Date()
    
    switch (period) {
      case '7d':
        startDate.setDate(now.getDate() - 7)
        break
      case '30d':
        startDate.setDate(now.getDate() - 30)
        break
      case '90d':
        startDate.setDate(now.getDate() - 90)
        break
      case 'all':
        startDate = new Date(0)
        break
    }

    // Build where clause
    const where: any = {
      sentAt: {
        gte: startDate
      }
    }

    if (tunnelType) {
      where.tunnelType = tunnelType
    }

    // Get email logs
    const emailLogs = await prisma.emailLog.findMany({
      where,
      orderBy: { sentAt: 'desc' }
    })

    // Get campaigns
    const campaigns = await prisma.emailCampaign.findMany({
      where: {
        createdAt: {
          gte: startDate
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    // Calculate analytics
    const totalEmails = emailLogs.length
    const tunnelScriptEmails = emailLogs.filter(e => e.type === 'tunnel_script').length
    const notificationEmails = emailLogs.filter(e => e.type === 'notification').length

    // Advanced deliverability metrics
    const delivered = emailLogs.filter(e => e.status === 'delivered').length
    const opened = emailLogs.filter(e => e.status === 'opened' || e.openedAt).length
    const clicked = emailLogs.filter(e => e.status === 'clicked' || e.clickedAt).length
    const bounced = emailLogs.filter(e => e.status === 'bounced').length
    const hardBounces = emailLogs.filter(e => e.bounceType === 'hard').length
    const softBounces = emailLogs.filter(e => e.bounceType === 'soft').length
    const complained = emailLogs.filter(e => e.status === 'complained').length
    const failed = emailLogs.filter(e => e.status === 'failed').length

    // Calculate rates
    const deliveryRate = totalEmails > 0 ? ((delivered / totalEmails) * 100).toFixed(2) : '0'
    const openRate = delivered > 0 ? ((opened / delivered) * 100).toFixed(2) : '0'
    const clickRate = opened > 0 ? ((clicked / opened) * 100).toFixed(2) : '0'
    const bounceRate = totalEmails > 0 ? ((bounced / totalEmails) * 100).toFixed(2) : '0'
    const complaintRate = totalEmails > 0 ? ((complained / totalEmails) * 100).toFixed(2) : '0'

    // Average delivery delay
    const deliveredWithDelay = emailLogs.filter(e => e.deliveryDelayMs && e.status === 'delivered')
    const avgDeliveryDelay = deliveredWithDelay.length > 0 
      ? Math.round(deliveredWithDelay.reduce((sum, e) => sum + (e.deliveryDelayMs || 0), 0) / deliveredWithDelay.length)
      : 0

    // Group by tunnel type
    const byTunnelType: Record<string, number> = {}
    emailLogs.forEach(log => {
      if (log.tunnelType) {
        byTunnelType[log.tunnelType] = (byTunnelType[log.tunnelType] || 0) + 1
      }
    })

    // Group by date
    const byDate: Record<string, number> = {}
    emailLogs.forEach(log => {
      const date = log.sentAt.toISOString().split('T')[0]
      byDate[date] = (byDate[date] || 0) + 1
    })

    // Group by ISP/domain for advanced analytics
    const byIsp: Record<string, { delivered: number; total: number; bounced: number }> = {}
    const byDomain: Record<string, { delivered: number; total: number; bounced: number }> = {}
    
    emailLogs.forEach(log => {
      if (log.isp) {
        if (!byIsp[log.isp]) {
          byIsp[log.isp] = { delivered: 0, total: 0, bounced: 0 }
        }
        byIsp[log.isp].total++
        if (log.status === 'delivered') byIsp[log.isp].delivered++
        if (log.status === 'bounced') byIsp[log.isp].bounced++
      }
      
      if (log.domain) {
        if (!byDomain[log.domain]) {
          byDomain[log.domain] = { delivered: 0, total: 0, bounced: 0 }
        }
        byDomain[log.domain].total++
        if (log.status === 'delivered') byDomain[log.domain].delivered++
        if (log.status === 'bounced') byDomain[log.domain].bounced++
      }
    })

    // Bounce reasons breakdown
    const bounceReasons: Record<string, number> = {}
    emailLogs.forEach(log => {
      if (log.bounceReason) {
        bounceReasons[log.bounceReason] = (bounceReasons[log.bounceReason] || 0) + 1
      }
    })

    // Campaign analytics
    const totalCampaigns = campaigns.length
    const completedCampaigns = campaigns.filter(c => c.status === 'completed').length
    const runningCampaigns = campaigns.filter(c => c.status === 'running').length
    const scheduledCampaigns = campaigns.filter(c => c.status === 'scheduled').length

    const totalRecipients = campaigns.reduce((sum, c) => sum + c.totalRecipients, 0)
    const totalSent = campaigns.reduce((sum, c) => sum + c.sentCount, 0)
    const totalFailed = campaigns.reduce((sum, c) => sum + c.failedCount, 0)

    const successRate = totalSent > 0 ? ((totalSent / totalRecipients) * 100).toFixed(2) : '0'

    // Recent activity
    const recentActivity = emailLogs.slice(0, 10).map(log => ({
      id: log.id,
      to: log.to,
      subject: log.subject,
      type: log.type,
      tunnelType: log.tunnelType,
      status: log.status,
      sentAt: log.sentAt
    }))

    return NextResponse.json({
      success: true,
      period,
      dateRange: {
        start: startDate,
        end: now
      },
      overview: {
        totalEmails,
        tunnelScriptEmails,
        notificationEmails,
        totalCampaigns,
        completedCampaigns,
        runningCampaigns,
        scheduledCampaigns
      },
      campaigns: {
        totalRecipients,
        totalSent,
        totalFailed,
        successRate: parseFloat(successRate)
      },
      deliverability: {
        delivered,
        opened,
        clicked,
        bounced,
        hardBounces,
        softBounces,
        complained,
        failed,
        deliveryRate: parseFloat(deliveryRate),
        openRate: parseFloat(openRate),
        clickRate: parseFloat(clickRate),
        bounceRate: parseFloat(bounceRate),
        complaintRate: parseFloat(complaintRate),
        avgDeliveryDelay
      },
      breakdown: {
        byTunnelType,
        byDate,
        byIsp,
        byDomain,
        bounceReasons
      },
      recentActivity
    })
  } catch (err) {
    return toErrorResponse(err)
  }
}