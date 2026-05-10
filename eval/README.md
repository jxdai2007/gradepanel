# Eval — Calibration

Measures bootstrap extraction quality against hand-graded ground-truth submissions.

## Setup

1. Place hand-graded submissions in `eval/ground-truth/*.txt` (one file per submission).
2. Ensure `OPENROUTER_API_KEY` is set in `.env.local`.
3. Run:

```bash
npm run eval
```

Outputs `eval/calibration.json` with:
- `totalDeductions` — total deductions extracted across all files
- `validQuotes` — count where extracted quote is a substring of the original submission
- `quoteValidationPassRate` — percent of quotes passing validation (target: ≥ 90%)
- `rubricItemsInferred` — rubric items inferred from all deductions combined
- `perFile` — per-submission breakdown

## File format

Each `.txt` file should be a complete graded submission, e.g.:

```
Math 131A — Midterm 1
Student ID: AXXXXXXXX
Problem 1 (10 pts)

<question text>

Student answer:
<student work>

TA marks:
-N: <reason>

Total: N/10
```

## Ground-truth collection

For the hackathon demo: 5 submissions from Midterm 1 and 5 from Midterm 2,
sharing a common concept (e.g. chain rule). Quality range should cover:
- Strong submissions (0-1 deductions)
- Medium submissions (2-3 deductions)
- Weak submissions (4+ deductions)

Replace placeholder files (`mt1-001.txt`, `mt1-002.txt`, `mt2-001.txt`) with
real hand-graded data when available.
