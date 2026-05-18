import { NextResponse, type NextRequest } from "next/server"
import { verifyAdmin, toErrorResponse } from "@/lib/auth/admin"
import { DeploymentConfig } from "@/lib/deploy/types"
import { startDeployment, listDeployments } from "@/lib/deploy/orchestrator"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

// Simple in-memory danger mode settings (shared with tool-executor)
let dangerModeSettings = {
  disableAIGuardRails: false,
  bypassDeploymentApprovals: false,
};

// Function to update danger mode settings (called by settings page)
export function setDangerModeSettings(settings: typeof dangerModeSettings) {
  dangerModeSettings = settings;
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    await verifyAdmin(req)
    const deployments = listDeployments()
    return NextResponse.json({ deployments })
  } catch (err) {
    return toErrorResponse(err)
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const requestId = `deploy-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  
  try {
    await verifyAdmin(req)
    
    // Check if deployment approval bypass is enabled
    if (!dangerModeSettings.bypassDeploymentApprovals) {
      // In a real implementation, you would check for pending approvals here
      // For now, we'll just add a log entry when approval is required
      console.log(`[Deployment][${requestId}] Approval required for deployment (danger mode disabled)`);
    }
    
    const body = await req.json().catch(() => {
      throw new Error('Invalid JSON in request body')
    })
    
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ 
        error: "bad_request", 
        message: "Request body must be a valid JSON object",
        requestId 
      }, { status: 400 })
    }
    
    const parsed = DeploymentConfig.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ 
        error: "validation_error", 
        issues: parsed.error.issues,
        requestId 
      }, { status: 400 })
    }
    
    // Add timeout protection for deployment operations
    const deploymentPromise = startDeployment(parsed.data)
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Deployment operation timeout')), 300000) // 5 minutes
    )
    
    const deployment = await Promise.race([deploymentPromise, timeoutPromise]) as any
    
    console.log(`[Deployment][${requestId}] Deployment started successfully`)
    
    return NextResponse.json({ 
      deployment, 
      approvalBypassed: dangerModeSettings.bypassDeploymentApprovals,
      requestId 
    }, { status: 201 })
  } catch (err) {
    console.error(`[Deployment][${requestId}] Deployment failed:`, err)
    return toErrorResponse(err)
  }
}
