// lib/llm/models.ts
export const MODELS = {
  CLAUDE: 'anthropic/claude-sonnet-4.5',
  GEMINI: 'google/gemini-2.5-pro',
  GPT4O: 'openai/gpt-4o',
  EMBED: 'openai/text-embedding-3-small',
} as const

export type ModelName = typeof MODELS[keyof typeof MODELS]

export const PANEL_MODELS: ModelName[] = [MODELS.CLAUDE, MODELS.GEMINI, MODELS.GPT4O]
