// eval/calibrate.ts
// Calibration script: reads eval/ground-truth/*.txt, runs bootstrap extraction,
// reports quote-validation pass rate and rubric metrics.
// Usage: npm run eval
// Requires OPENROUTER_API_KEY in .env.local

import fs from 'fs'
import path from 'path'
import { config } from 'dotenv'

// Load env before any lib imports that read API keys
config({ path: path.resolve(process.cwd(), '.env.local') })

import { extractFromSubmission } from '../lib/extract/bootstrap'
import { inferRubric } from '../lib/extract/bootstrap'

async function main() {
  const groundTruthDir = path.join(process.cwd(), 'eval', 'ground-truth')

  if (!fs.existsSync(groundTruthDir)) {
    console.log('No eval/ground-truth directory found.')
    console.log('Place hand-graded submissions in eval/ground-truth/*.txt and re-run.')
    process.exit(0)
  }

  const files = fs
    .readdirSync(groundTruthDir)
    .filter((f) => f.endsWith('.txt'))
    .sort()

  if (files.length === 0) {
    console.log('No .txt files found in eval/ground-truth/')
    console.log('Place hand-graded submissions as *.txt files and re-run.')
    process.exit(0)
  }

  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) {
    console.log('OPENROUTER_API_KEY not set — cannot run LLM extraction.')
    console.log('Set it in .env.local and re-run.')
    process.exit(0)
  }

  console.log(`Found ${files.length} ground-truth file(s): ${files.join(', ')}`)
  console.log('Running bootstrap extraction (live LLM calls)...\n')

  const submissions = files.map((f) =>
    fs.readFileSync(path.join(groundTruthDir, f), 'utf-8')
  )

  // Extract per-submission in parallel
  const perSubmission = await Promise.all(
    submissions.map(async (text, i) => {
      console.log(`  Extracting ${files[i]}...`)
      try {
        const extracted = await extractFromSubmission(text)
        return { file: files[i], original: text, extracted, error: null }
      } catch (e) {
        console.error(`  ERROR extracting ${files[i]}: ${e}`)
        return {
          file: files[i],
          original: text,
          extracted: { student_answer: '', deductions: [] },
          error: String(e),
        }
      }
    })
  )

  // Collect all deductions for rubric inference
  const allDeductions = perSubmission.flatMap((s) =>
    s.extracted.deductions.map((d) => ({ rubric_text: d.rubric_text, reason: d.reason }))
  )

  console.log('\nInferring rubric from extracted deductions...')
  let rubricItemCount = 0
  try {
    const rubric = await inferRubric(allDeductions)
    rubricItemCount = rubric.rubric_items.length
    console.log(`  Rubric items inferred: ${rubricItemCount}`)
  } catch (e) {
    console.error(`  ERROR inferring rubric: ${e}`)
  }

  // Metrics
  const totalDeductions = perSubmission.reduce(
    (sum, s) => sum + s.extracted.deductions.length,
    0
  )

  const validQuotes = perSubmission.reduce(
    (sum, s) =>
      sum +
      s.extracted.deductions.filter((d) => d.quote === '' || s.original.includes(d.quote))
        .length,
    0
  )

  const passRate = totalDeductions > 0 ? validQuotes / totalDeductions : 1.0
  const errorCount = perSubmission.filter((s) => s.error !== null).length

  // Per-file breakdown
  console.log('\n── Per-file results ──────────────────────────────────────────')
  for (const s of perSubmission) {
    const quoteValid = s.extracted.deductions.filter(
      (d) => d.quote === '' || s.original.includes(d.quote)
    ).length
    console.log(
      `  ${s.file}: ${s.extracted.deductions.length} deductions, ` +
        `${quoteValid}/${s.extracted.deductions.length} quotes valid` +
        (s.error ? ` [ERROR: ${s.error.slice(0, 60)}]` : '')
    )
  }

  console.log('\n── Summary ───────────────────────────────────────────────────')
  console.log(`  Files processed:          ${files.length}`)
  console.log(`  Extraction errors:        ${errorCount}`)
  console.log(`  Total deductions:         ${totalDeductions}`)
  console.log(`  Quote-validation pass:    ${validQuotes}/${totalDeductions} (${(passRate * 100).toFixed(1)}%)`)
  console.log(`  Rubric items inferred:    ${rubricItemCount}`)

  const metrics = {
    timestamp: new Date().toISOString(),
    filesProcessed: files.length,
    extractionErrors: errorCount,
    totalDeductions,
    validQuotes,
    quoteValidationPassRate: parseFloat((passRate * 100).toFixed(1)),
    rubricItemsInferred: rubricItemCount,
    perFile: perSubmission.map((s) => ({
      file: s.file,
      deductionsExtracted: s.extracted.deductions.length,
      quotesValid: s.extracted.deductions.filter(
        (d) => d.quote === '' || s.original.includes(d.quote)
      ).length,
      error: s.error,
    })),
  }

  const outPath = path.join(process.cwd(), 'eval', 'calibration.json')
  fs.writeFileSync(outPath, JSON.stringify(metrics, null, 2))
  console.log(`\nWritten: eval/calibration.json`)
}

main().catch((e) => {
  console.error('Fatal error:', e)
  process.exit(1)
})
