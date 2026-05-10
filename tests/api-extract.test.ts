// tests/api-extract.test.ts
import { describe, it, expect } from 'vitest'
import { POST } from '@/app/api/extract/route'

describe('POST /api/extract', () => {
  it('400 on empty body', async () => {
    const req = new Request('http://localhost/api/extract', {
      method: 'POST',
      body: JSON.stringify({}),
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('400 on missing submissions field', async () => {
    const req = new Request('http://localhost/api/extract', {
      method: 'POST',
      body: JSON.stringify({ foo: 'bar' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('400 on empty submissions array', async () => {
    const req = new Request('http://localhost/api/extract', {
      method: 'POST',
      body: JSON.stringify({ submissions: [] }),
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('400 on submission too short', async () => {
    const req = new Request('http://localhost/api/extract', {
      method: 'POST',
      body: JSON.stringify({ submissions: ['short'] }),
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('400 on too many submissions', async () => {
    const submissions = Array.from({ length: 21 }, () => 'x'.repeat(25))
    const req = new Request('http://localhost/api/extract', {
      method: 'POST',
      body: JSON.stringify({ submissions }),
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it.skipIf(!process.env.OPENROUTER_API_KEY)(
    'extracts and returns rubric+perSubmission+conceptsByItem for valid input',
    async () => {
      const body = {
        submissions: [
          `Q1\nStudent: f(x)=sin(2x)\nTA: -1, line 2, "f(x)=sin(2x)", "missed chain rule"`,
        ],
      }
      const req = new Request('http://localhost/api/extract', {
        method: 'POST',
        body: JSON.stringify(body),
      })
      const res = await POST(req)
      expect(res.status).toBe(200)
      const json = await res.json()
      expect(json).toHaveProperty('rubric')
      expect(json).toHaveProperty('perSubmission')
      expect(json).toHaveProperty('conceptsByItem')
    },
    120_000
  )
})
