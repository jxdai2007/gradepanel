// lib/stats/crosstest.ts
import { getDb } from '@/lib/graph/db'

export function cross_assignment_sigma_per_concept(courseId: string): Array<{
  concept_id: string
  concept_name: string
  perAssignment: Array<{ assignment_id: string; sigma: number; n: number }>
}> {
  const db = getDb()
  const concepts = db
    .prepare(`SELECT id, name FROM concepts WHERE course_id = ?`)
    .all(courseId) as Array<{ id: string; name: string }>

  return concepts.map((c) => {
    const rows = db
      .prepare(
        `SELECT a.id as assignment_id,
                SUM((d.points_deducted - avg_pts) * (d.points_deducted - avg_pts)) / COUNT(*) as variance,
                COUNT(*) as n
         FROM deductions d
         JOIN deduction_concepts dc ON dc.deduction_id = d.id
         JOIN rubric_items ri ON ri.id = d.rubric_item_id
         JOIN assignments a ON a.id = ri.assignment_id
         JOIN (SELECT a2.id as assignment_id, AVG(d2.points_deducted) as avg_pts
               FROM deductions d2
               JOIN rubric_items ri2 ON ri2.id = d2.rubric_item_id
               JOIN assignments a2 ON a2.id = ri2.assignment_id
               JOIN deduction_concepts dc2 ON dc2.deduction_id = d2.id
               WHERE dc2.concept_id = ?
               GROUP BY a2.id) m ON m.assignment_id = a.id
         WHERE dc.concept_id = ?
         GROUP BY a.id`
      )
      .all(c.id, c.id) as Array<{ assignment_id: string; variance: number; n: number }>

    return {
      concept_id: c.id,
      concept_name: c.name,
      perAssignment: rows.map((r) => ({
        assignment_id: r.assignment_id,
        sigma: Math.sqrt(r.variance || 0),
        n: r.n,
      })),
    }
  })
}
