/**
 * Operational Guide Step-by-Step Tests
 *
 * Tests each step from the operational guide using AI assistant tools in a test environment.
 * This follows the docs/guides/steps.md operational guide.
 */

import {
  listNodesTool,
  createNodeTool,
  updateNodeTool,
  deleteNodeTool,
  generateConfigTool,
  listProfilesTool,
  systemStatusTool,
  troubleshootTool,
  analyzeTrafficTool,
  checkPrerequisitesTool,
  generatePlanTool,
} from "@/lib/ai/tools"

describe("Operational Guide - Step-by-Step Tests", () => {
  const ctx = { signal: AbortSignal.timeout(30000), invokerUid: "test-operational-guide" }

  // Store created resources for cleanup
  const createdResources: {
    nodeIds: string[]
  } = { nodeIds: [] }

  afterAll(async () => {
    // Cleanup: Delete created nodes
    for (const nodeId of createdResources.nodeIds) {
      try {
        await deleteNodeTool.run({ nodeId }, ctx)
      } catch {
        // Ignore cleanup errors
      }
    }
  })

  describe("Step 1: Setup & Installation", () => {
    it("should verify system status", async () => {
      console.log("Starting system status check...")
      const result = await systemStatusTool.run({}, ctx)
      console.log("System status result:", result)
      expect(result).toBeDefined()
      expect(result.status).toBeDefined()
      console.log("✓ System Status:", result.status)
    })

    it.only("should check prerequisites", async () => {
      const result = await checkPrerequisitesTool.run({}, ctx)
      expect(result).toBeDefined()
      expect(Array.isArray(result.checks)).toBe(true)
      console.log("✓ Prerequisites checked:", result.checks.length, "items")
    })
  })

  describe("Step 2: Hysteria 2 Node Creation", () => {
    it("should list existing nodes", async () => {
      const result = await listNodesTool.run({}, ctx)
      expect(result).toBeDefined()
      expect(Array.isArray(result.nodes)).toBe(true)
      expect(typeof result.count).toBe("number")
      console.log("✓ Existing nodes:", result.count)
    })

    it("should create a test node", async () => {
      const result = await createNodeTool.run(
        {
          name: "test-guide-node-01",
          hostname: "192.0.2.1",
          region: "test-region",
          tags: ["test", "operational-guide"],
          provider: "test",
        },
        ctx
      )

      expect(result).toBeDefined()
      expect(result.nodeId).toBeDefined()
      expect(result.name).toBe("test-guide-node-01")
      expect(result.status).toBeDefined()

      createdResources.nodeIds.push(result.nodeId)
      console.log("✓ Created test node:", result.nodeId)
    })

    it("should update the test node", async () => {
      const nodeId = createdResources.nodeIds[0]
      expect(nodeId).toBeDefined()

      const result = await updateNodeTool.run(
        {
          nodeId,
          tags: ["test", "operational-guide", "updated"],
        },
        ctx
      )

      expect(result).toBeDefined()
      expect(result.nodeId).toBe(nodeId)
      console.log("✓ Updated test node:", nodeId)
    })
  })

  describe("Step 3: Client Config Generation", () => {
    it("should list available config profiles", async () => {
      const result = await listProfilesTool.run({}, ctx)
      expect(result).toBeDefined()
      expect(Array.isArray(result.profiles)).toBe(true)
      console.log("✓ Available profiles:", result.profiles.length)
    })

    it("should generate a Hysteria2 config", async () => {
      const result = await generateConfigTool.run(
        {
          obfuscation: "salamander",
          masquerade: "cdn",
          port: 443,
          bandwidth: { up: 100, down: 500 },
        },
        ctx
      )

      expect(result).toBeDefined()
      expect(result.config).toBeDefined()
      console.log("✓ Generated config with salamander obfuscation")
    })

    it("should generate high-throughput config", async () => {
      const result = await generateConfigTool.run(
        {
          obfuscation: "none",
          congestionControl: "bbr",
          port: 443,
          bandwidth: { up: 1000, down: 5000 },
        },
        ctx
      )

      expect(result).toBeDefined()
      expect(result.config).toBeDefined()
      console.log("✓ Generated high-throughput config with BBR")
    })
  })

  describe("Step 8: AI Assistants", () => {
    it("should run troubleshooting diagnostics", async () => {
      const result = await troubleshootTool.run(
        {
          issue: "Test troubleshooting for operational guide",
          component: "ai-assistant",
        },
        ctx
      )

      expect(result).toBeDefined()
      expect(result.diagnosis).toBeDefined()
      console.log("✓ AI Assistant troubleshooting completed")
    })

    it("should analyze traffic patterns", async () => {
      const result = await analyzeTrafficTool.run({}, ctx)

      expect(result).toBeDefined()
      console.log("✓ Traffic analysis completed")
    })

    it("should generate an operational plan", async () => {
      const result = await generatePlanTool.run(
        {
          goal: "Test operational guide execution",
          context: "Testing step-by-step operational guide in test environment",
        },
        ctx
      )

      expect(result).toBeDefined()
      expect(result.plan).toBeDefined()
      console.log("✓ Generated operational plan")
    })
  })

  describe("Step 10: Infrastructure Monitoring", () => {
    it("should check system status for monitoring", async () => {
      const result = await systemStatusTool.run({}, ctx)
      expect(result).toBeDefined()
      console.log("✓ Infrastructure monitoring status check")
    })

    it("should analyze traffic for monitoring", async () => {
      const result = await analyzeTrafficTool.run({}, ctx)
      expect(result).toBeDefined()
      console.log("✓ Infrastructure traffic monitoring")
    })
  })
})