// lib/panel/aggregate.ts

export interface PanelResponse<T> {
  model: string
  status: 'fulfilled' | 'rejected'
  value?: T
  reason?: string
}

export interface PanelResult<T> {
  responses: PanelResponse<T>[]
  consensus?: T
  agreement: number // 0-1, fraction of fulfilled models that agree on consensus
  disagreementFlag: boolean
}

/**
 * Aggregate panel responses by majority vote using JSON serialization as equality.
 * Consensus requires > 50% of fulfilled responses to agree.
 */
export function aggregate<T>(responses: PanelResponse<T>[]): PanelResult<T> {
  const fulfilled = responses.filter((r) => r.status === 'fulfilled' && r.value !== undefined)

  if (fulfilled.length === 0) {
    return {
      responses,
      consensus: undefined,
      agreement: 0,
      disagreementFlag: responses.length > 0,
    }
  }

  // Count occurrences by serialized JSON key
  const counts = new Map<string, { count: number; value: T }>()
  for (const r of fulfilled) {
    const key = JSON.stringify(r.value)
    const existing = counts.get(key)
    if (existing) {
      existing.count++
    } else {
      counts.set(key, { count: 1, value: r.value as T })
    }
  }

  // Find the most common value
  let best: { key: string; count: number; value: T } | undefined
  for (const [key, entry] of counts.entries()) {
    if (!best || entry.count > best.count) {
      best = { key, count: entry.count, value: entry.value }
    }
  }

  const totalModels = responses.length
  const majorityThreshold = totalModels / 2 // strictly more than half

  if (best && best.count > majorityThreshold) {
    return {
      responses,
      consensus: best.value,
      agreement: best.count / totalModels,
      disagreementFlag: false,
    }
  }

  // No majority
  return {
    responses,
    consensus: undefined,
    agreement: best ? best.count / totalModels : 0,
    disagreementFlag: true,
  }
}
