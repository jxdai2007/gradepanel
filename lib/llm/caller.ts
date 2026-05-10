// lib/llm/caller.ts
import OpenAI from 'openai'
import { z, ZodSchema } from 'zod'
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions'

const client = new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1',
  defaultHeaders: {
    'HTTP-Referer': 'https://gradepanel.vercel.app',
    'X-Title': 'gradepanel',
  },
  // Required when running in jsdom (vitest) environment
  dangerouslyAllowBrowser: true,
})

export class SchemaValidationError extends Error {
  constructor(public modelOutput: string, public zodError: z.ZodError) {
    super(`Schema validation failed: ${zodError.message}\nOutput: ${modelOutput.slice(0, 500)}`)
    this.name = 'SchemaValidationError'
  }
}

export class LLMTimeoutError extends Error {
  constructor(model: string, timeoutMs: number) {
    super(`LLM call to ${model} exceeded ${timeoutMs}ms`)
    this.name = 'LLMTimeoutError'
  }
}

export interface CallLLMOptions<T> {
  model: string
  messages: ChatCompletionMessageParam[]
  schema: ZodSchema<T>
  maxRetries?: number
  timeoutMs?: number
  temperature?: number
}

export async function callLLM<T>(opts: CallLLMOptions<T>): Promise<T> {
  const {
    model,
    messages,
    schema,
    maxRetries = 1,
    timeoutMs = parseInt(process.env.GRADEPANEL_PANEL_TIMEOUT_MS || '15000', 10),
    temperature = 0.2,
  } = opts

  const systemDirective: ChatCompletionMessageParam = {
    role: 'system',
    content: 'You return only valid JSON matching the requested schema. No prose, no markdown, no explanation outside the JSON.',
  }
  const allMessages = messages[0]?.role === 'system' ? messages : [systemDirective, ...messages]

  let lastError: unknown
  let lastOutput = ''
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await Promise.race([
        client.chat.completions.create({
          model,
          messages: allMessages,
          temperature,
          response_format: { type: 'json_object' },
        }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new LLMTimeoutError(model, timeoutMs)), timeoutMs)
        ),
      ])

      const raw = response.choices[0]?.message?.content || ''
      lastOutput = raw
      // Strip markdown code fences if model wraps JSON (some models ignore response_format)
      const content = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim()
      const parsed = JSON.parse(content)
      return schema.parse(parsed)
    } catch (err) {
      lastError = err
      if (err instanceof LLMTimeoutError) throw err
      if (attempt === maxRetries) {
        if (err instanceof z.ZodError) throw new SchemaValidationError(lastOutput, err)
        if (err instanceof SyntaxError) throw new SchemaValidationError(lastOutput, new z.ZodError([{ code: 'custom', path: [], message: 'invalid JSON' }]))
        throw err
      }
    }
  }
  throw lastError
}
