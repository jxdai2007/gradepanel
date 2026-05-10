// app/types.ts — shared UI types

export interface GradedDeduction {
  rubric_item_id: string
  points_deducted: number
  location: {
    line_start: number
    line_end: number
    quote: string
  }
  reason: string
}

export interface RubricItem {
  id: string
  description: string
  max_points: number
  matches: number[]
}

export interface BootstrapResult {
  perSubmission: Array<{
    original: string
    extracted: {
      student_answer: string
      deductions: Array<{
        rubric_text: string
        points: number
        line_start: number
        line_end: number
        quote: string
        reason: string
      }>
    }
  }>
  rubric: {
    rubric_items: RubricItem[]
  }
  conceptsByItem: Record<string, string[]>
}

export interface PrecedentMeta {
  tier1Count: number
  tier2Count: number
  concept?: string
}

export interface ModelAgreement {
  gpt: boolean
  cld: boolean
  gem: boolean
}

// Extended deduction with client-side id
export interface UIDeduction extends GradedDeduction {
  id: string
  isNovel?: boolean
}
