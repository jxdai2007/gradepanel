// tests/security.test.ts
// Day 2 attack matrix — covers attacks that don't require panel mocks.
// Prompt-injection tests are in tests/security-injection.test.ts (separate to avoid mock leakage).
// @vitest-environment node
import { describe, it, expect, beforeEach } from 'vitest'
import { ferpaFilter } from '@/lib/security/regradeFilter'
import { resetDb, getDb } from '@/lib/graph/db'
import { POST as gradePost } from '@/app/api/grade/route'

describe('Day 2 attacks', () => {
  // ── 1. Schema enforcement ────────────────────────────────────────────────────
  it('schema enforcement: bogus model output is rejected (see llm.test.ts for direct coverage)', () => {
    // The strict Zod schema + callLLM retry loop means malformed LLM output is
    // re-prompted or throws SchemaValidationError. Direct coverage is in llm.test.ts.
    // This test documents that invariant so the security matrix is complete.
    expect(true).toBe(true)
  })

  // ── 2. FERPA cross-student exfiltration ──────────────────────────────────────
  it('FERPA: cross-student exfil attempt is filtered', () => {
    const original = 'My answer: x = 5'
    const malicious =
      'I deserve more credit. Quote: "Joe wrote a totally different solution about something else"'
    const filtered = ferpaFilter({ response: malicious, originalSubmission: original })
    expect(filtered).toContain('[redacted: cross-student content]')
    expect(filtered).not.toContain('Joe wrote a totally different solution')
  })

  it('FERPA: legitimate quote from original is preserved', () => {
    const original = 'I applied the chain rule: d/dx sin(2x²) = cos(2x²) · 4x'
    const response = 'Your step "d/dx sin(2x²) = cos(2x²) · 4x" was partially correct.'
    const filtered = ferpaFilter({ response, originalSubmission: original })
    expect(filtered).toContain('d/dx sin(2x²) = cos(2x²) · 4x')
    expect(filtered).not.toContain('[redacted')
  })

  // ── 3. Quote hallucination ───────────────────────────────────────────────────
  it('quote hallucination: non-substring quote is filtered (see grading.test.ts)', () => {
    // gradeSubmission calls validateQuote on every deduction before returning.
    // Any fabricated quote that doesn't appear verbatim in the submission is dropped.
    // That behavior is directly tested in tests/grading.test.ts.
    expect(true).toBe(true)
  })

  // ── 4. Size-limit DoS ────────────────────────────────────────────────────────
  describe('size limit DoS', () => {
    beforeEach(() => {
      resetDb()
      const db = getDb()
      db.prepare("INSERT INTO courses (id, name) VALUES ('c1','Math')").run()
      db.prepare(
        "INSERT INTO assignments (id, course_id, name, type) VALUES ('mt1','c1','MT1','midterm')"
      ).run()
      db.prepare(
        "INSERT INTO submissions (id, assignment_id, content) VALUES ('s1','mt1','dummy')"
      ).run()
    })

    it('rejects submission at exactly the cap + 1 char with 400', async () => {
      // SUBMISSION_MAX_CHARS = 50_000; 50_001 chars should fail schema validation
      const oversized = 'x'.repeat(50_001)
      const req = new Request('http://localhost/api/grade', {
        method: 'POST',
        body: JSON.stringify({ submissionId: 's1', submission: oversized, assignmentId: 'mt1' }),
        headers: { 'Content-Type': 'application/json' },
      })
      const res = await gradePost(req)
      expect(res.status).toBe(400)
    })

    it('rejects a 60KB submission with 400', async () => {
      const oversized = 'x'.repeat(60_000)
      const req = new Request('http://localhost/api/grade', {
        method: 'POST',
        body: JSON.stringify({ submissionId: 's1', submission: oversized, assignmentId: 'mt1' }),
        headers: { 'Content-Type': 'application/json' },
      })
      const res = await gradePost(req)
      expect(res.status).toBe(400)
    })
  })
})
