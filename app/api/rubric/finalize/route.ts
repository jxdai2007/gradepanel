// app/api/rubric/finalize/route.ts
// Persists an approved rubric (rubric_items + concepts + rubric_concepts) into SQLite.
// Strategy: delete existing rubric_items (+ cascade) for the assignment, then re-insert.
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { randomUUID } from 'crypto'
import { getDb } from '@/lib/graph/db'

const Body = z.object({
  courseId: z.string().min(1),
  assignmentId: z.string().min(1),
  rubricItems: z.array(
    z.object({
      id: z.string().min(1),
      description: z.string().min(1),
      max_points: z.number().nonnegative(),
    })
  ).min(1),
  concepts: z.array(z.string()).default([]),
})

export async function POST(req: Request) {
  let body: z.infer<typeof Body>
  try {
    body = Body.parse(await req.json())
  } catch {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
  }

  try {
    const db = getDb()
    const tx = db.transaction(() => {
      // Ensure course exists
      db.prepare(
        `INSERT OR IGNORE INTO courses (id, name) VALUES (?, ?)`
      ).run(body.courseId, body.courseId)

      // Ensure assignment exists
      db.prepare(
        `INSERT OR IGNORE INTO assignments (id, course_id, name) VALUES (?, ?, ?)`
      ).run(body.assignmentId, body.courseId, body.assignmentId)

      // Delete existing rubric for this assignment (rubric_concepts cascade via FK)
      db.prepare(
        `DELETE FROM rubric_concepts WHERE rubric_item_id IN (SELECT id FROM rubric_items WHERE assignment_id = ?)`
      ).run(body.assignmentId)
      db.prepare(
        `DELETE FROM rubric_items WHERE assignment_id = ?`
      ).run(body.assignmentId)

      // Insert new rubric items
      for (const item of body.rubricItems) {
        db.prepare(
          `INSERT INTO rubric_items (id, assignment_id, description, max_points) VALUES (?, ?, ?, ?)`
        ).run(item.id, body.assignmentId, item.description, item.max_points)
      }

      // Insert concepts and link to all rubric items
      for (const conceptName of body.concepts) {
        const conceptId = randomUUID()
        db.prepare(
          `INSERT OR IGNORE INTO concepts (id, course_id, name) VALUES (?, ?, ?)`
        ).run(conceptId, body.courseId, conceptName)
        // Find just-inserted or existing concept by name+course
        const existing = db.prepare(
          `SELECT id FROM concepts WHERE course_id = ? AND name = ? LIMIT 1`
        ).get(body.courseId, conceptName) as { id: string } | undefined
        const cid = existing?.id ?? conceptId
        // Link to all rubric items
        for (const item of body.rubricItems) {
          db.prepare(
            `INSERT OR IGNORE INTO rubric_concepts (rubric_item_id, concept_id) VALUES (?, ?)`
          ).run(item.id, cid)
        }
      }
    })
    tx()
    return NextResponse.json({ ok: true }, { status: 201 })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: 'Finalize failed', details: message }, { status: 500 })
  }
}
