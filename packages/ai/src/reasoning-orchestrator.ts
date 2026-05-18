/**
 * Advanced LLM Reasoning Orchestrator
 *
 * Replaces static pre-planning with dynamic, LLM-driven reasoning:
 *
 * 1. RECEIVE  — Accept user message
 * 2. REASON   — LLM classifies intent and assesses requirements
 * 3. EXECUTE  — Iterative LLM tool calling with result feedback
 * 4. VERIFY   — LLM validates completion against original goal
 * 5. REPORT   — Synthesize final response with reasoning trace
 *
 * Key change: No static arg pre-planning. The LLM dynamically decides
 * tool arguments based on conversation context and previous results.
 */

import { generateObject } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'
import { createOpenAI } from '@ai-sdk/openai'
import { z } from 'zod'
import { chatComplete, type ChatMessage } from './llm'
import { aiToolDefinitions, AI_TOOL_NAMES, AI_TOOLS } from './tools'
import type { AgentTool } from './tool-types'
import { getExtractorModel } from './reasoning/extractor-provider'
import logger from '@c2panel/infrastructure/logging'
import { sanitizeMessageContent } from './robustness'
import { serverEnv } from '@c2panel/infrastructure/config'
import { runAiToolRobust } from './tool-runner'
import { isToolNeedsInput, formatNeedsInputMessage } from './tool-result'
import {
  createOpenRouterOpenAICompat,
  getOpenRouterModelId,
  hasOpenRouterKey,
} from './openrouter/stack'

const log = logger.child({ module: 'ai-reasoning-orchestrator' })

// ============================================================
// ROBUSTNESS CONSTANTS
// ============================================================

/** Max consecutive identical tool calls before breaking the loop */
const MAX_DUPLICATE_TOOL_CALLS = 3

/** Max reasoning messages before trimming old context */
const MAX_REASONING_MESSAGES = 60

/** Max retries for transient LLM failures in the reasoning loop */
const MAX_LLM_RETRIES = 2

/** Base delay (ms) for LLM retry backoff */
const LLM_RETRY_BASE_DELAY_MS = 1000

// ============================================================
// MODEL PROVIDER - Anthropic Primary
// ============================================================

function getReasoningModel() {
  const env = serverEnv()
  if (hasOpenRouterKey(env)) {
    const client = createOpenRouterOpenAICompat(env)
    return client(getOpenRouterModelId(env, 'reasoning_json'))
  }
  if (env.ANTHROPIC_API_KEY) {
    return anthropic(env.ANTHROPIC_MODEL || 'claude-sonnet-4-5-20251001')
  }
  if (env.XAI_API_KEY) {
    const client = createOpenAI({
      baseURL: env.XAI_BASE_URL,
      apiKey: env.XAI_API_KEY,
    })
    return client(env.XAI_MODEL)
  }
  return getExtractorModel()
}

function safeStringifyForContent(value: unknown): string {
  if (typeof value === 'string') {
    return sanitizeMessageContent(value)
  }
  try {
    return sanitizeMessageContent(JSON.stringify(value))
  } catch {
    return sanitizeMessageContent(String(value))
  }
}

// Normalize tool arguments to handle common AI mistakes
function normalizeToolArguments(args: any): any {
  if (!args || typeof args !== 'object') return args

  const normalized = { ...args }

  // Handle tags parameter - convert object to array if needed
  if (args.tags && !Array.isArray(args.tags)) {
    if (typeof args.tags === 'object') {
      normalized.tags = Object.values(args.tags).filter((v: any) => typeof v === 'string')
    } else {
      normalized.tags = []
    }
  }

  // Handle other common array parameters that might receive objects
  const arrayFields = ['nodeIds', 'profileIds', 'targetIds', 'allowedIPs']
  arrayFields.forEach(field => {
    if (args[field] && !Array.isArray(args[field])) {
      if (typeof args[field] === 'object') {
        normalized[field] = Object.values(args[field]).filter((v: any) => typeof v === 'string')
      } else if (typeof args[field] === 'string') {
        normalized[field] = [args[field]]
      } else {
        normalized[field] = []
      }
    }
  })

  return normalized
}

// ============================================================
// ROBUSTNESS HELPERS
// ============================================================

/** Detect if the LLM is stuck calling the same tool with the same args */
function isStaleLoop(
  toolName: string,
  args: Record<string, unknown>,
  recentExecutions: Array<{ toolName: string; args?: string }>,
): boolean {
  const argsStr = JSON.stringify(args)
  let consecutiveDuplicates = 0
  for (let i = recentExecutions.length - 1; i >= 0; i--) {
    const exec = recentExecutions[i]
    if (exec.toolName === toolName && exec.args === argsStr) {
      consecutiveDuplicates++
    } else {
      break
    }
  }
  return consecutiveDuplicates >= MAX_DUPLICATE_TOOL_CALLS
}

/** Trim reasoning messages to prevent token overflow.
 *  Keeps: system prompt + last N messages */
function trimReasoningMessages(messages: ChatMessage[]): ChatMessage[] {
  if (messages.length <= MAX_REASONING_MESSAGES) return messages

  // Always keep the system prompt (first message)
  const systemMsg = messages[0]
  const rest = messages.slice(1)

  // Keep the most recent messages
  const trimmed = rest.slice(rest.length - MAX_REASONING_MESSAGES + 1)

  // Add a context summary so the LLM knows older context was trimmed
  const contextNotice: ChatMessage = {
    role: 'user',
    content: '[System: Earlier conversation context was trimmed to stay within limits. The most recent messages are preserved. Continue from where we left off.]',
  }

  return [systemMsg, contextNotice, ...trimmed]
}

/** Check if an LLM error is transient (retryable) */
function isTransientLlmError(err: unknown): boolean {
  if (!(err instanceof Error)) return false
  const msg = err.message.toLowerCase()
  return (
    msg.includes('timeout') ||
    msg.includes('timed out') ||
    msg.includes('econnreset') ||
    msg.includes('econnrefused') ||
    msg.includes('socket hang up') ||
    msg.includes('429') ||
    msg.includes('rate limit') ||
    msg.includes('overloaded') ||
    msg.includes('capacity') ||
    msg.includes('5') && /\b5\d{2}\b/.test(msg) // 5xx
  )
}

/** Retry an LLM call with exponential backoff for transient errors */
async function chatCompleteWithRetry(
  options: Parameters<typeof chatComplete>[0],
  maxRetries: number = MAX_LLM_RETRIES,
): Promise<Awaited<ReturnType<typeof chatComplete>>> {
  let lastError: Error | undefined

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await chatComplete(options)
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err))

      if (!isTransientLlmError(err) || attempt >= maxRetries) {
        throw lastError
      }

      // Exponential backoff with jitter
      const delay = LLM_RETRY_BASE_DELAY_MS * Math.pow(2, attempt) + Math.floor(Math.random() * 500)
      log.warn(
        { attempt: attempt + 1, maxRetries, delay, error: lastError.message },
        'LLM call failed (transient), retrying...',
      )
      await new Promise(r => setTimeout(r, delay))
    }
  }

  throw lastError ?? new Error('LLM call failed after retries')
}

// ============================================================
// REASONING SCHEMAS
// ============================================================

const TaskClassificationSchema = z.object({
  taskType: z.enum([
    'simple_query',
    'action_required',
    'ambiguous',
    'destructive',
  ]).describe('Classification of the task'),
  confidence: z.number().min(0).max(1).describe('Confidence in classification'),
  reasoning: z.string().describe('Why this classification was chosen'),
  likelyTools: z.array(z.string()).describe('Tools likely needed'),
  clarificationNeeded: z.array(z.string()).describe('Questions if ambiguous'),
  riskLevel: z.enum(['none', 'low', 'medium', 'high', 'critical']).describe('Risk level'),
})

const VerificationResultSchema = z.object({
  isComplete: z.boolean().describe('Whether the task is fully complete'),
  allToolsSucceeded: z.boolean().describe('Whether all tool calls succeeded'),
  contradictions: z.array(z.string()).describe('Any contradictions found'),
  missingInformation: z.array(z.string()).describe('Information still needed'),
  confidence: z.number().min(0).max(1).describe('Confidence in results'),
  recommendation: z.enum(['accept', 'retry_failed', 'gather_more', 'ask_user']).describe('Next step'),
})

// ============================================================
// EXPORTED TYPES
// ============================================================

export type TaskClassification = z.infer<typeof TaskClassificationSchema>
export type VerificationResult = z.infer<typeof VerificationResultSchema>
export type ReasoningPhase = 'classify' | 'execute' | 'verify' | 'report'

export type ReasoningProgress = {
  phase: ReasoningPhase
  detail: string
  classification?: TaskClassification
  verification?: VerificationResult
}

export type ReasoningProgressCallback = (progress: ReasoningProgress) => Promise<void> | void

// ============================================================
// MAIN ORCHESTRATOR
// ============================================================

/**
 * Run a reasoning-first chat interaction using advanced LLM reasoning.
 *
 * Key architectural changes from previous version:
 * - No static pre-planning with argKeys/argValues
 * - LLM dynamically decides tool calls based on context
 * - Tool results fed back to LLM for next-step reasoning
 * - Natural parameter chaining (e.g., deploymentId from deploy_node → get_deployment_status)
 */
export async function runReasoningChat(
  conversationMessages: ChatMessage[],
  userMessage: string,
  options: {
    signal?: AbortSignal
    invokerUid?: string
    onProgress?: ReasoningProgressCallback
    maxToolRounds?: number
  } = {},
): Promise<{
  messages: Array<{
    role: 'system' | 'user' | 'assistant' | 'tool'
    content: string | null
    toolCalls?: Array<{ id: string; name: string; arguments: string }>
    toolResult?: { toolCallId: string; name: string; content: string }
  }>
  classification: TaskClassification
  verification: VerificationResult | null
  providersUsed: string[]
  modelsUsed: string[]
}> {
  const { signal, invokerUid, onProgress, maxToolRounds = 15 } = options
  const providersUsed = new Set<string>()
  const modelsUsed = new Set<string>()
  const resultMessages: Array<{
    role: 'system' | 'user' | 'assistant' | 'tool'
    content: string | null
    toolCalls?: Array<{ id: string; name: string; arguments: string }>
    toolResult?: { toolCallId: string; name: string; content: string }
  }> = []

  // ============================================================
  // PHASE 1: CLASSIFY
  // ============================================================
  await onProgress?.({ phase: 'classify', detail: 'Analyzing your request...' })

  const classification = await classifyTask(userMessage, conversationMessages, signal)

  await onProgress?.({
    phase: 'classify',
    detail: `Task classified: ${classification.taskType} (${Math.round(classification.confidence * 100)}% confidence)`,
    classification,
  })

  log.info({
    taskType: classification.taskType,
    confidence: classification.confidence,
    likelyTools: classification.likelyTools,
    riskLevel: classification.riskLevel,
  }, 'Task classified')

  // Handle simple queries — no tools needed
  if (classification.taskType === 'simple_query') {
    const llmResult = await chatComplete({
      messages: conversationMessages,
      temperature: 0.3,
      signal,
    })
    if (llmResult._provider) providersUsed.add(llmResult._provider)
    if (llmResult._model) modelsUsed.add(llmResult._model)

    resultMessages.push({ role: 'assistant', content: llmResult.content ?? '' })

    return {
      messages: resultMessages,
      classification,
      verification: null,
      providersUsed: [...providersUsed],
      modelsUsed: [...modelsUsed],
    }
  }

  // Handle ambiguous requests
  if (classification.taskType === 'ambiguous' && classification.clarificationNeeded.length > 0) {
    const clarificationText = `I need some clarification before proceeding:\n\n${
      classification.clarificationNeeded.map((q, i) => `${i + 1}. ${q}`).join('\n')
    }`
    resultMessages.push({ role: 'assistant', content: clarificationText })

    return {
      messages: resultMessages,
      classification,
      verification: null,
      providersUsed: [...providersUsed],
      modelsUsed: [...modelsUsed],
    }
  }

  // ============================================================
  // PHASE 2: DYNAMIC EXECUTION WITH LLM REASONING
  // ============================================================
  await onProgress?.({ phase: 'execute', detail: 'Starting dynamic execution with LLM reasoning...' })

  // Build system prompt for reasoning agent
  const systemPrompt = buildReasoningSystemPrompt(classification)

  // Detect if the user is responding to a previous needs-input prompt.
  // If the last assistant message in the conversation asked for clarification,
  // include that context so the LLM knows what the user is answering.
  const recentAssistantMsgs = conversationMessages
    .filter(m => m.role === 'assistant' && m.content && m.content.trim().length > 0)
    .slice(-3)
  const lastAssistantContent = recentAssistantMsgs.length > 0
    ? recentAssistantMsgs[recentAssistantMsgs.length - 1].content ?? ''
    : ''
  const isRespondingToNeedsInput = lastAssistantContent.includes('I need more information') ||
    lastAssistantContent.includes('I need some clarification') ||
    lastAssistantContent.includes('Missing fields:')

  let reasoningUserPrompt: string
  if (isRespondingToNeedsInput) {
    // Include the previous assistant question and the user's answer so the LLM
    // can fill in the missing parameters on the next tool call
    reasoningUserPrompt = [
      `Previous assistant message (asking for clarification):`,
      lastAssistantContent,
      '',
      `User's response: "${userMessage}"`,
      '',
      `The user is answering the clarification above. Use their response as the missing parameter(s) when calling the tool that previously asked for input. Do NOT call the tool again without the parameters the user just provided.`,
    ].join('\n')
  } else {
    reasoningUserPrompt = `User request: "${userMessage}"\n\nStart by analyzing what needs to be done, then use the available tools to accomplish the task. After each tool result, decide the next step.`
  }

  // Initialize conversation for this reasoning session
  const reasoningMessages: ChatMessage[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: reasoningUserPrompt },
  ]

  const toolExecutions: Array<{ toolName: string; success: boolean; result?: unknown; error?: string; args?: string }> = []
  let rounds = 0

  while (rounds < maxToolRounds) {
    if (signal?.aborted) break
    rounds++

    // Trim reasoning context to prevent token overflow
    const trimmedMessages = trimReasoningMessages(reasoningMessages)

    await onProgress?.({
      phase: 'execute',
      detail: `Round ${rounds}: Asking LLM to reason next steps...`,
    })

    // Get tool definitions for this round
    const tools = aiToolDefinitions()

    // Call LLM with tools to get its reasoning and next action
    // Uses chatCompleteWithRetry for transient error resilience
    let llmResponse: Awaited<ReturnType<typeof chatComplete>>
    try {
      llmResponse = await chatCompleteWithRetry({
        messages: trimmedMessages,
        tools,
        temperature: 0.2,
        enableFallback: true,
        signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(90_000)]) : AbortSignal.timeout(90_000),
      })
    } catch (llmErr) {
      // LLM call failed even after retries — surface error and break
      log.error(
        { round: rounds, error: llmErr instanceof Error ? llmErr.message : String(llmErr) },
        'LLM call failed in reasoning loop after retries',
      )
      resultMessages.push({
        role: 'assistant',
        content: `I encountered an error while processing your request: ${llmErr instanceof Error ? llmErr.message : String(llmErr)}. Please try again.`,
      })
      break
    }

    if (llmResponse._provider) providersUsed.add(llmResponse._provider)
    if (llmResponse._model) modelsUsed.add(llmResponse._model)

    // Check if LLM wants to use a tool
    const toolCalls = llmResponse.toolCalls

    if (!toolCalls || toolCalls.length === 0) {
      // No tool call - LLM provided final answer or reasoning
      const content = llmResponse.content || 'No response from LLM'

      resultMessages.push({
        role: 'assistant',
        content: content,
      })

      reasoningMessages.push({ role: 'assistant', content })

      // Check if task appears complete
      if (content.toLowerCase().includes('complete') ||
          content.toLowerCase().includes('finished') ||
          content.toLowerCase().includes('done') ||
          content.toLowerCase().includes('deployed') ||
          toolExecutions.length > 0) {
        break
      }

      // If no tools executed yet and no tool call, we might be stuck
      if (toolExecutions.length === 0 && rounds > 3) {
        break
      }
    } else {
      // Process each tool call (typically just one in reasoning mode)
      for (const call of toolCalls) {
        const toolName = call.function.name
        let args: Record<string, unknown> = {}
        try {
          args = JSON.parse(call.function.arguments)
          // Normalize arguments to handle common AI mistakes
          args = normalizeToolArguments(args)
        } catch {
          args = { _raw: call.function.arguments }
        }

        // Stale loop detection: if the LLM keeps calling the same tool
        // with the same args, break the loop to prevent infinite spinning
        if (isStaleLoop(toolName, args, toolExecutions)) {
          log.warn(
            { round: rounds, tool: toolName, args },
            'Stale loop detected — same tool called with identical args too many times',
          )
          reasoningMessages.push({
            role: 'assistant',
            content: llmResponse.content || '',
            tool_calls: toolCalls,
          })
          reasoningMessages.push({
            role: 'tool',
            content: safeStringifyForContent({
              error: 'You have called this tool with the same arguments multiple times without success. Stop retrying and either try a different approach or report the failure to the user.',
              hint: 'Try a different tool, modify the arguments, or provide a final response explaining what went wrong.',
            }),
            tool_call_id: call.id,
          })
          // Push one more prompt to help the LLM break out
          reasoningMessages.push({
            role: 'user',
            content: `The tool ${toolName} has been called with identical arguments too many times. You must stop retrying and either use a different approach or provide a final response to the user.`,
          })
          continue
        }

        await onProgress?.({
          phase: 'execute',
          detail: `Executing ${toolName}...`,
        })

        log.info({ round: rounds, tool: toolName, args }, 'LLM requested tool execution')

        // Execute the tool with full robustness (timeout, retry, breaker, validation)
        const robustResult = await runAiToolRobust(toolName, args, {
          signal,
          invokerUid,
          timeoutMs: 90_000,
          maxRetries: 1,
        })

        const toolSuccess = robustResult.ok
        const toolResult = robustResult.result
        const toolError = robustResult.error

        // Track for result messages
        const toolCallId = `reasoning-${rounds}-${Date.now()}`
        resultMessages.push({
          role: 'assistant',
          content: null,
          toolCalls: [{ id: toolCallId, name: toolName, arguments: call.function.arguments }],
        })
        resultMessages.push({
          role: 'tool',
          content: null,
          toolResult: {
            toolCallId,
            name: toolName,
            content: safeStringifyForContent(toolResult),
          },
        })

        toolExecutions.push({ toolName, success: toolSuccess, result: toolResult, error: toolError, args: JSON.stringify(args) })

        log.info(
          {
            round: rounds,
            tool: toolName,
            success: toolSuccess,
            attempts: robustResult.attempts,
            durationMs: robustResult.durationMs,
            shortCircuited: robustResult.shortCircuited,
            needsInput: robustResult.needsInput,
          },
          'Tool execution completed',
        )

        // Generic detection: any tool that returns a structured "needs input"
        // response. If the tool provided multiple-choice options, auto-select
        // the best one based on context and retry immediately. Only ask the
        // user if there are no options to choose from.
        if (robustResult.needsInput && isToolNeedsInput(toolResult)) {
          const autoSelected = autoSelectOption(toolResult, userMessage)

          if (autoSelected) {
            // Auto-select succeeded — retry the tool with the selected value
            log.info(
              {
                round: rounds,
                tool: toolName,
                autoSelectedField: toolResult.missingFields?.[0],
                autoSelectedValue: autoSelected.value,
              },
              'Auto-selected needs-input option, retrying tool',
            )

            // Build retry args: inject the auto-selected value into the missing field
            const retryArgs = { ...args }
            for (const field of (toolResult.missingFields ?? [])) {
              retryArgs[field] = autoSelected.value
            }

            // Push the initial (failed) tool call + result to message history
            resultMessages.push({
              role: 'assistant',
              content: null,
              toolCalls: [{ id: `reasoning-${rounds}-initial-${Date.now()}`, name: toolName, arguments: call.function.arguments }],
            })
            resultMessages.push({
              role: 'tool',
              content: null,
              toolResult: {
                toolCallId: `reasoning-${rounds}-initial-${Date.now()}`,
                name: toolName,
                content: safeStringifyForContent(toolResult),
              },
            })

            // Re-execute the tool with the auto-selected args
            await onProgress?.({
              phase: 'execute',
              detail: `Auto-selected "${autoSelected.label}" for ${toolName}, retrying...`,
            })

            const retryResult = await runAiToolRobust(toolName, retryArgs, {
              signal,
              invokerUid,
              timeoutMs: 90_000,
              maxRetries: 1,
            })

            const retryToolCallId = `reasoning-${rounds}-retry-${Date.now()}`
            resultMessages.push({
              role: 'assistant',
              content: null,
              toolCalls: [{ id: retryToolCallId, name: toolName, arguments: JSON.stringify(retryArgs) }],
            })
            resultMessages.push({
              role: 'tool',
              content: null,
              toolResult: {
                toolCallId: retryToolCallId,
                name: toolName,
                content: safeStringifyForContent(retryResult.result),
              },
            })

            toolExecutions.push({
              toolName,
              success: retryResult.ok,
              result: retryResult.result,
              error: retryResult.error,
              args: JSON.stringify(retryArgs),
            })

            // Feed the retry result back to the reasoning context
            reasoningMessages.push({
              role: 'assistant',
              content: llmResponse.content || '',
              tool_calls: [{ id: call.id, type: 'function' as const, function: { name: toolName, arguments: JSON.stringify(retryArgs) } }],
            })
            reasoningMessages.push({
              role: 'tool',
              content: safeStringifyForContent(retryResult.result),
              tool_call_id: call.id,
            })

            // If the retry also needs input, then ask the user
            if (retryResult.needsInput && isToolNeedsInput(retryResult.result)) {
              resultMessages.push({
                role: 'assistant',
                content: formatNeedsInputMessage(retryResult.result),
              })
              return {
                messages: resultMessages,
                classification,
                verification: null,
                providersUsed: [...providersUsed],
                modelsUsed: [...modelsUsed],
              }
            }

            // Continue the loop with the retry result
            reasoningMessages.push({
              role: 'user',
              content: `Based on the tool results above, decide: continue with another tool, or provide final response if complete.`,
            })
            continue
          }

          // No options to auto-select — ask the user
          resultMessages.push({
            role: 'assistant',
            content: formatNeedsInputMessage(toolResult),
          })
          return {
            messages: resultMessages,
            classification,
            verification: null,
            providersUsed: [...providersUsed],
            modelsUsed: [...modelsUsed],
          }
        }

        // If the circuit breaker rejected the call, surface a clear message to
        // the LLM so it can pick a different tool instead of looping.
        if (robustResult.shortCircuited) {
          reasoningMessages.push({
            role: 'assistant',
            content: llmResponse.content || '',
            tool_calls: toolCalls,
          })
          reasoningMessages.push({
            role: 'tool',
            content: safeStringifyForContent({
              error: toolError,
              hint: `Tool ${toolName} is temporarily unavailable due to repeated failures. Try a different approach or wait before retrying.`,
            }),
            tool_call_id: call.id,
          })
          continue
        }

        // Add assistant's tool request to reasoning context
        reasoningMessages.push({
          role: 'assistant',
          content: llmResponse.content || '',
          tool_calls: toolCalls,
        })

        // Add tool result to reasoning context - CRITICAL for parameter chaining
        reasoningMessages.push({
          role: 'tool',
          content: safeStringifyForContent(toolResult),
          tool_call_id: call.id,
        })
      }

      // Add summary prompt to help LLM decide next step
      reasoningMessages.push({
        role: 'user',
        content: `Based on the tool results above, decide: continue with another tool, or provide final response if complete.`,
      })
    }
  }

  // ============================================================
  // PHASE 3: VERIFY
  // ============================================================
  await onProgress?.({ phase: 'verify', detail: 'Verifying completion...' })

  const verification = await verifyWithLLM(
    userMessage,
    toolExecutions,
    reasoningMessages,
    signal,
  )

  await onProgress?.({
    phase: 'verify',
    detail: `Verification: ${verification.recommendation} (${Math.round(verification.confidence * 100)}% confidence)`,
    verification,
  })

  // ============================================================
  // PHASE 4: REPORT
  // ============================================================
  await onProgress?.({ phase: 'report', detail: 'Generating final response...' })

  // Generate final operational response
  const finalResponse = await generateFinalResponse(
    userMessage,
    toolExecutions,
    verification,
    reasoningMessages,
    signal,
  )

  if (finalResponse._provider) providersUsed.add(finalResponse._provider)
  if (finalResponse._model) modelsUsed.add(finalResponse._model)

  // Only add if we haven't already captured a final assistant message
  const lastResultMsg = resultMessages[resultMessages.length - 1]
  if (!lastResultMsg || lastResultMsg.role !== 'assistant' || !lastResultMsg.content) {
    resultMessages.push({
      role: 'assistant',
      content: finalResponse.content,
    })
  }

  return {
    messages: resultMessages,
    classification,
    verification,
    providersUsed: [...providersUsed],
    modelsUsed: [...modelsUsed],
  }
}

// ============================================================
// AUTO-SELECT HELPER — picks the best option from a needs-input prompt
// ============================================================

/**
 * When a tool returns a needs-input result with multiple-choice options,
 * auto-select the best one based on the user's original message context.
 *
 * Selection strategy:
 * 1. If there's only one option, pick it
 * 2. Match keywords from the user's message against option labels/values/descriptions
 * 3. Fall back to the first option if no match
 * 4. Return null if there are no options (user must be asked)
 */
function autoSelectOption(
  toolResult: import('@/lib/ai/tool-result').ToolNeedsInputResult,
  userMessage: string,
): { label: string; value: string; description?: string } | null {
  const options = toolResult.prompt?.options
  if (!options || options.length === 0) return null

  // Single option — just use it
  if (options.length === 1) return options[0]

  const msgLower = userMessage.toLowerCase()

  // Score each option by how well it matches the user's request
  let bestOption = options[0]
  let bestScore = -1

  for (const opt of options) {
    let score = 0
    const labelLower = opt.label.toLowerCase()
    const valueLower = opt.value.toLowerCase()
    const descLower = (opt.description ?? '').toLowerCase()

    // Check if the user's message contains the option label
    if (msgLower.includes(labelLower)) score += 10
    // Check if the user's message contains words from the value
    const valueWords = valueLower.split(/\s+/)
    for (const word of valueWords) {
      if (word.length > 3 && msgLower.includes(word)) score += 5
    }
    // Check if the user's message contains words from the description
    const descWords = descLower.split(/\s+/)
    for (const word of descWords) {
      if (word.length > 3 && msgLower.includes(word)) score += 3
    }
    // Bonus for common keywords in the user's message matching the option
    const stealthKeywords = ['stealth', 'obfuscat', 'masquerade', 'salamander', 'opsec', 'covert', 'hide']
    const throughputKeywords = ['high-throughput', 'throughput', 'bandwidth', 'speed', 'fast', 'gbps']
    const minimalKeywords = ['minimal', 'basic', 'simple', 'bare', 'quick']
    const productionKeywords = ['production', 'acme', 'tls', 'cert', 'stable', 'secure']

    if (stealthKeywords.some(k => msgLower.includes(k)) && (labelLower.includes('stealth') || valueLower.includes('stealth') || descLower.includes('stealth') || descLower.includes('obfuscat') || descLower.includes('opsec'))) {
      score += 8
    }
    if (throughputKeywords.some(k => msgLower.includes(k)) && (labelLower.includes('throughput') || descLower.includes('throughput'))) {
      score += 8
    }
    if (minimalKeywords.some(k => msgLower.includes(k)) && (labelLower.includes('minimal') || descLower.includes('minimal') || descLower.includes('bare'))) {
      score += 8
    }
    if (productionKeywords.some(k => msgLower.includes(k)) && (labelLower.includes('production') || labelLower.includes('acme') || descLower.includes('acme') || descLower.includes('production'))) {
      score += 8
    }

    if (score > bestScore) {
      bestScore = score
      bestOption = opt
    }
  }

  // If no keywords matched at all, still return the first option as a reasonable default
  return bestOption
}

// ============================================================
// HELPER FUNCTIONS
// ============================================================

function buildReasoningSystemPrompt(classification: TaskClassification): string {
  const toolDescriptions = Object.entries(AI_TOOLS as Record<string, AgentTool<unknown, unknown>>)
    .map(([name, tool]) => `- ${name}: ${tool.description}`)
    .join('\n')

  return `You are an expert AI assistant managing Hysteria2 C2 infrastructure.

AVAILABLE TOOLS:
${toolDescriptions}

TASK CONTEXT:
- Task type: ${classification.taskType}
- Risk level: ${classification.riskLevel}
- Likely tools needed: ${classification.likelyTools.join(', ') || 'unknown'}

REASONING INSTRUCTIONS:
1. Analyze the user's request and available tools
2. Determine the sequence of tool calls needed to accomplish the task
3. When calling tools, extract arguments from the user's request or previous tool results
4. For dependent operations (e.g., deploy followed by status check):
   - Call the first tool (e.g., deploy_node)
   - Wait for its result
   - Extract key values (e.g., deploymentId) from the result
   - Use those values in subsequent tool calls (e.g., get_deployment_status with deploymentId)
5. Continue until the task is complete
6. Provide a clear summary of what was accomplished

PARAMETER CHAINING GUIDE:
- deploy_node returns: { deploymentId, status, message, defaultsApplied }
- get_deployment_status requires: { deploymentId }
- Always extract deploymentId from deploy_node result before calling get_deployment_status

RULES:
- Only call tools when necessary
- Use exact tool names and valid arguments
- Wait for tool results before deciding next steps
- If a tool fails, decide whether to retry, try alternative, or report failure
- If ANY required parameter is missing or ambiguous, STOP and ask the user before proceeding
- After every action, summarize what was done so the user has full visibility
- Always include a "User action required" section in your final response stating what the user must do next
- If you need clarification, phrase it as a direct question — never guess parameters`
}

async function classifyTask(
  userMessage: string,
  conversationMessages: ChatMessage[],
  signal?: AbortSignal,
): Promise<TaskClassification> {
  try {
    const recentContext = conversationMessages
      .slice(-4)
      .map(m => `${m.role}: ${m.content?.slice(0, 150) ?? ''}`)
      .join('\n')

    const result = await generateObject({
      model: getReasoningModel(),
      schema: TaskClassificationSchema,
      system: `You are a task classifier for an AI assistant that manages Hysteria2 C2 infrastructure.

Available tools: ${AI_TOOL_NAMES.join(', ')}

Classify the user's request:
- simple_query: Direct question, no tools needed
- action_required: Requires tool calls to complete (deploy, configure, query, etc.)
- ambiguous: Missing required information (provider, region, etc.)
- destructive: Destructive action needing confirmation

Rules:
- If provider/region not specified for deployment, classify as ambiguous
- Deletion/stopping/wiping = destructive
- Prefer action_required when tools might help`,
      prompt: `Recent conversation:\n${recentContext}\n\nUser's latest message: "${userMessage}"`,
      temperature: 0,
      abortSignal: signal,
    })

    return result.object
  } catch (err) {
    log.warn({ error: err instanceof Error ? err.message : String(err) }, 'Classification failed, using fallback')
    // Smarter fallback: if the message is short and has no action keywords,
    // treat it as a simple query rather than forcing tool use
    const msgLower = userMessage.toLowerCase()
    const actionKeywords = ['deploy', 'create', 'delete', 'update', 'configure', 'generate', 'build', 'install', 'start', 'stop', 'restart', 'destroy', 'apply', 'run', 'execute', 'send', 'scan', 'analyze']
    const hasAction = actionKeywords.some(k => msgLower.includes(k))

    return {
      taskType: hasAction ? 'action_required' : 'simple_query',
      confidence: 0.5,
      reasoning: 'Classification failed, inferred from message content',
      likelyTools: [],
      clarificationNeeded: [],
      riskLevel: 'none',
    }
  }
}

async function verifyWithLLM(
  userMessage: string,
  toolExecutions: Array<{ toolName: string; success: boolean; result?: unknown; error?: string }>,
  reasoningMessages: Array<{ role: string; content: string }>,
  signal?: AbortSignal,
): Promise<VerificationResult> {
  try {
    const executionSummary = toolExecutions
      .map((t, i) => `${i + 1}. ${t.toolName}: ${t.success ? 'SUCCESS' : `FAILED: ${t.error}`}`)
      .join('\n')

    const result = await generateObject({
      model: getReasoningModel(),
      schema: VerificationResultSchema,
      system: 'You verify task completion. Analyze execution results against the original goal.',
      prompt: `Original request: "${userMessage}"

Tool executions:
${executionSummary}

Was the task completed successfully? Are there any contradictions or missing steps?`,
      temperature: 0,
      abortSignal: signal,
    })

    return result.object
  } catch (err) {
    log.warn({ error: err instanceof Error ? err.message : String(err) }, 'LLM verification failed')

    const successful = toolExecutions.filter(t => t.success).length
    const total = toolExecutions.length

    return {
      isComplete: successful === total && total > 0,
      allToolsSucceeded: successful === total,
      contradictions: [],
      missingInformation: successful < total ? ['LLM verification unavailable — user should confirm results manually.'] : [],
      confidence: total > 0 ? successful / total : 0,
      recommendation: successful === total ? 'accept' : 'ask_user',
    }
  }
}

async function generateFinalResponse(
  userMessage: string,
  toolExecutions: Array<{ toolName: string; success: boolean; result?: unknown; error?: string }>,
  verification: VerificationResult,
  reasoningMessages: ChatMessage[],
  signal?: AbortSignal,
): Promise<{ content: string; _provider?: string; _model?: string }> {
  try {
    // Build execution summary
    const actions = toolExecutions.map(t =>
      t.success
        ? `${t.toolName}: SUCCESS`
        : `${t.toolName}: FAILED - ${t.error}`,
    )

    const results = toolExecutions
      .filter(t => t.success && t.result)
      .map(t => {
        const resultStr = typeof t.result === 'object'
          ? JSON.stringify(t.result).slice(0, 300)
          : String(t.result).slice(0, 300)
        return `${t.toolName}: ${resultStr}`
      })
      .join('\n\n')

    const completionStatus = verification.isComplete
      ? 'COMPLETE'
      : verification.allToolsSucceeded
        ? 'PARTIAL'
        : 'FAILED'

    const systemPrompt = `You are an AI assistant reporting on completed infrastructure operations.

Format your response with these sections (include ALL of them):
- Actions taken: List of what was done
- Errors: Any failures (or "None")
- Requirements: Any missing inputs (or "None")
- Result: The actual outcome with specific data
- Completion status: ${completionStatus}
- User action required: What the user must do next. If the task is COMPLETE, say "None — task is complete." If BLOCKED or PARTIAL, list the exact input, approval, or action the user must provide. If you need clarification, phrase it as a direct question. NEVER leave this section empty or vague.
- Next steps: What to do next

Be specific, actionable, and professional. Always summarize what was done and clearly state if the user needs to do anything.`

    const userPrompt = `Original request: "${userMessage}"

Actions executed:
${actions.join('\n') || 'None'}

Results:
${results || 'No results'}

Verification: ${verification.isComplete ? 'COMPLETE' : 'INCOMPLETE'} - ${verification.recommendation}
${verification.missingInformation.length > 0 ? `Missing: ${verification.missingInformation.join(', ')}` : ''}

Provide a clear operational response.`

    const result = await chatComplete({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.3,
      signal,
    })

    return {
      content: result.content || 'No response generated',
      _provider: result._provider,
      _model: result._model,
    }
  } catch (err) {
    log.warn({ error: err instanceof Error ? err.message : String(err) }, 'Final response generation failed')

    // Fallback summary
    const successCount = toolExecutions.filter(t => t.success).length
    const isComplete = verification.isComplete && successCount === toolExecutions.length
    const userAction = isComplete
      ? 'None — task is complete.'
      : verification.missingInformation.length > 0
        ? `Please provide: ${verification.missingInformation.join(', ')}.`
        : 'Please review the results above and tell me how to proceed.'
    return {
      content: `Actions taken:\n- ${successCount}/${toolExecutions.length} tools executed successfully.\n\nErrors:\n- None.\n\nRequirements:\n- None.\n\nResult:\nVerification: ${verification.recommendation}\nCompletion: ${isComplete ? 'COMPLETE' : 'INCOMPLETE'}\n\nCompletion status:\n${isComplete ? 'COMPLETE' : 'INCOMPLETE'}\n\nUser action required:\n- ${userAction}\n\nNext steps:\n- ${isComplete ? 'No further action required unless you want me to continue.' : 'Review the results and provide the requested information to continue.'}`,
    }
  }
}
