// lib/panel/index.ts
import type { ZodSchema } from 'zod'
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions'
import { callLLM } from '@/lib/llm/caller'
import { PANEL_MODELS, type ModelName } from '@/lib/llm/models'
import { aggregate, type PanelResponse, type PanelResult } from '@/lib/panel/aggregate'

export type { PanelResponse, PanelResult } from '@/lib/panel/aggregate'
export { aggregate } from '@/lib/panel/aggregate'

export interface RunPanelOptions<T> {
  messages: ChatCompletionMessageParam[]
  schema: ZodSchema<T>
  models?: ModelName[]
  timeoutMs?: number
}

export async function runPanel<T>(opts: RunPanelOptions<T>): Promise<PanelResult<T>> {
  const models = opts.models ?? PANEL_MODELS
  const settled = await Promise.allSettled(
    models.map(async (model) => ({
      model,
      value: await callLLM({ model, messages: opts.messages, schema: opts.schema, timeoutMs: opts.timeoutMs }),
    }))
  )
  const responses: PanelResponse<T>[] = settled.map((s, i) => {
    if (s.status === 'fulfilled') {
      return { model: models[i], status: 'fulfilled', value: s.value.value }
    } else {
      return { model: models[i], status: 'rejected', reason: String(s.reason) }
    }
  })
  return aggregate(responses)
}
