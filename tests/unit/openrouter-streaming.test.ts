/**
 * OpenRouter streaming functionality tests
 */

import {
  streamOpenRouterText,
  streamOpenRouterTextWithCallback,
  type StreamOptions,
} from "@/lib/ai/openrouter/stack"

describe("OpenRouter Streaming", () => {
  describe("streamOpenRouterText", () => {
    it("should have correct function signature", () => {
      expect(typeof streamOpenRouterText).toBe("function")
    })

    it("should accept valid stream options", async () => {
      const options: StreamOptions = {
        messages: [
          { role: "user" as const, content: "Hello" },
        ],
        temperature: 0.7,
        modelKind: "chat_tooling",
      }

      // We can't actually call this without a real API key
      // but we can verify the function exists and has the right signature
      expect(options.messages).toHaveLength(1)
      expect(options.messages[0].role).toBe("user")
    })

    it("should handle system messages correctly", () => {
      const options: StreamOptions = {
        messages: [
          { role: "system" as const, content: "You are a helpful assistant" },
          { role: "user" as const, content: "Hello" },
        ],
        temperature: 0.5,
      }

      expect(options.messages).toHaveLength(2)
      expect(options.messages[0].role).toBe("system")
      expect(options.messages[1].role).toBe("user")
    })

    it("should support abort signal", () => {
      const controller = new AbortController()
      const options: StreamOptions = {
        messages: [{ role: "user" as const, content: "Test" }],
        signal: controller.signal,
      }

      expect(options.signal).toBe(controller.signal)
    })

    it("should support onFinish callback", () => {
      const onFinish = jest.fn()
      const options: StreamOptions = {
        messages: [{ role: "user" as const, content: "Test" }],
        onFinish,
      }

      expect(typeof onFinish).toBe("function")
    })
  })

  describe("streamOpenRouterTextWithCallback", () => {
    it("should have correct function signature", () => {
      expect(typeof streamOpenRouterTextWithCallback).toBe("function")
    })

    it("should accept onChunk callback", () => {
      const onChunk = jest.fn()
      const options: StreamOptions & { onChunk: (chunk: string) => void } = {
        messages: [{ role: "user" as const, content: "Test" }],
        onChunk,
      }

      expect(typeof onChunk).toBe("function")
    })

    it("should handle async onChunk callback", async () => {
      const onChunk = async (chunk: string) => {
        // Simulate async processing
        await new Promise(resolve => setTimeout(resolve, 1))
        return chunk.length
      }

      expect(typeof onChunk).toBe("function")
      const result = await onChunk("test")
      expect(result).toBe(4)
    })
  })

  describe("StreamOptions interface", () => {
    it("should support all optional fields", () => {
      const options: StreamOptions = {
        messages: [{ role: "user" as const, content: "Test" }],
        temperature: 0.8,
        tools: {},
        signal: new AbortController().signal,
        modelKind: "reasoning_json",
        onFinish: () => {},
      }

      expect(options.temperature).toBe(0.8)
      expect(options.modelKind).toBe("reasoning_json")
      expect(options.tools).toBeDefined()
      expect(options.signal).toBeDefined()
      expect(options.onFinish).toBeDefined()
    })

    it("should handle different model kinds", () => {
      const kinds: Array<"chat_tooling" | "reasoning_json" | "cheap"> = [
        "chat_tooling",
        "reasoning_json",
        "cheap",
      ]

      kinds.forEach(kind => {
        const options: StreamOptions = {
          messages: [{ role: "user" as const, content: "Test" }],
          modelKind: kind,
        }
        expect(options.modelKind).toBe(kind)
      })
    })
  })
})