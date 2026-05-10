import { describe, it, expect } from 'vitest'
import { GET } from '@/app/api/health/route'

describe('GET /api/health', () => {
  it('returns 200 with ok:true', async () => {
    const res = await GET()
    const json = await res.json()
    expect(res.status).toBe(200)
    expect(json.ok).toBe(true)
    expect(typeof json.ts).toBe('number')
  })
})
