/**
 * Shared Extractor Model Provider
 *
 * Provides a consistent LLM model for structured extraction
 * across all reasoning modules.
 *
 * Provider priority (auto-detects working provider):
 * 1. xAI/Grok (fast, reliable, always available)
 * 2. OpenAI (good structured output)
 * 3. Anthropic/Claude (best structured output, but key may be invalid)
 * 4. Legacy LLM provider (last resort)
 *
 * Note: Anthropic is deprioritized because invalid/expired API keys
 * return "not_found_error" for all models, causing silent failures
 * in the reasoning orchestrator.
 */

import { createOpenAI } from '@ai-sdk/openai'
import { anthropic } from '@ai-sdk/anthropic'
import { serverEnv } from '@c2panel/infrastructure/config'
import { createOpenRouterOpenAICompat, getOpenRouterModelId } from './openrouter/stack'

let cachedModel: { name: string; model: any } | null = null

/**
 * Get the extractor model for structured output generation.
 * Caches the model instance for reuse across calls.
 * OpenRouter is the PRIMARY provider.
 */
export function getExtractorModel() {
  if (cachedModel) return cachedModel.model

  const env = serverEnv()

  // PRIMARY: OpenRouter — unified gateway
  if (env.OPENROUTER_API_KEY) {
    const client = createOpenRouterOpenAICompat(env)
    cachedModel = { name: 'openrouter', model: client(getOpenRouterModelId(env, 'chat_tooling')) }
    return cachedModel.model
  }

  // Fallback: xAI/Grok
  if (env.XAI_API_KEY) {
    const client = createOpenAI({
      baseURL: env.XAI_BASE_URL,
      apiKey: env.XAI_API_KEY,
    })
    cachedModel = { name: 'xai', model: client(env.XAI_MODEL) }
    return cachedModel.model
  }

  // Fallback: OpenAI
  if (env.OPENAI_API_KEY) {
    const client = createOpenAI({ apiKey: env.OPENAI_API_KEY })
    cachedModel = { name: 'openai', model: client('gpt-4o-mini') }
    return cachedModel.model
  }

  // Fallback: Anthropic/Claude
  if (env.ANTHROPIC_API_KEY) {
    const modelName = env.ANTHROPIC_MODEL || 'claude-haiku-4-5-20251001'
    cachedModel = { name: 'anthropic', model: anthropic(modelName) }
    return cachedModel.model
  }

  // Last resort: legacy LLM provider
  if (env.LLM_PROVIDER_API_KEY) {
    const client = createOpenAI({
      baseURL: env.LLM_PROVIDER_BASE_URL,
      apiKey: env.LLM_PROVIDER_API_KEY,
    })
    cachedModel = { name: 'legacy', model: client(env.LLM_MODEL) }
    return cachedModel.model
  }

  throw new Error('No AI provider configured — set OPENROUTER_API_KEY')
}

/**
 * Get the name of the current extractor provider
 */
export function getExtractorProviderName(): string {
  return cachedModel?.name ?? 'unknown'
}

/**
 * Clear the cached model (useful when provider config changes)
 */
export function clearExtractorModelCache(): void {
  cachedModel = null
}
