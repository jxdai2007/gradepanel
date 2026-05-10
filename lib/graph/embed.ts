// lib/graph/embed.ts
import OpenAI from 'openai'
import { MODELS } from '@/lib/llm/models'

const client = new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1',
  // Required when running in jsdom (vitest) environment
  dangerouslyAllowBrowser: true,
})

export async function embed(text: string): Promise<Float32Array> {
  const response = await client.embeddings.create({
    model: MODELS.EMBED,
    input: text,
  })
  return new Float32Array(response.data[0].embedding)
}

export async function embedBatch(texts: string[]): Promise<Float32Array[]> {
  const response = await client.embeddings.create({
    model: MODELS.EMBED,
    input: texts,
  })
  return response.data.map((d) => new Float32Array(d.embedding))
}

export function cosineSimilarity(a: Float32Array, b: Float32Array): number {
  if (a.length !== b.length) throw new Error('vector dim mismatch')
  let dot = 0,
    na = 0,
    nb = 0
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i]
    na += a[i] * a[i]
    nb += b[i] * b[i]
  }
  return dot / (Math.sqrt(na) * Math.sqrt(nb))
}
