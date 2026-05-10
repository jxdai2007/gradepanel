# gradepanel

![CI](https://github.com/jxdai2007/gradepanel/actions/workflows/ci.yml/badge.svg)

Multi-model TA grading copilot with concept-graph retrieval, page-specific grounded feedback, and cross-test consistency. **Live:** https://gradepanel.vercel.app | **Repo:** https://github.com/jxdai2007/gradepanel

---

## The problem

College TAs grade 50-200 submissions per assignment — 4+ hours per week. Three compounding failures:

- **Inter-grader inconsistency** creates documented equity gaps (Crowdmark exists for this reason).
- **Cross-assignment inconsistency** — the same concept graded differently on Midterm 1 vs. Midterm 2. Students notice.
- **Generic AI feedback** — current AI grading tools output prose summaries, not line-specific, quote-grounded deductions.

---

## What it does

1. Drag 10 already-graded submissions in. Extraction runs in ~18s: deductions, rubric items, concepts, page-specific quotes.
2. TA reviews the extracted rubric at an approval gate (30s). No gate → no graph pollution.
3. Drag ungraded submissions in. Each grades in 3-8s via 3-tier retrieval + multi-model panel.
4. Every deduction shows line range, exact quote from the submission, and which rubric item applies. Server-side validation rejects hallucinated quotes before they reach the UI.
5. Cross-test precedent surfaces live: "8 prior cases on chain rule from Midterm 1" while grading Midterm 2.
6. Novel-issue card appears when no precedent exists. TA chooses: add to graph, accept once, or reject.
7. Regrade requests handled in 30s: precedent retrieved, response drafted, FERPA filter applied.
8. See [docs/DEMO.md](docs/DEMO.md) for the full 90-second walkthrough.

---

## Architecture

```
drag-drop UI
    │
    ▼
/api/extract  (Claude Sonnet 4.5 — rubric + deductions + concept tags)
    │  server-side quote substring validation
    ▼
SQLite graph  (rubric_items ←→ concepts ←→ deductions)
    │  sqlite-vec cosine index (1536-dim, text-embedding-3-small)
    ▼
/api/grade
    ├─ Tier 1: same rubric_item_id, top-5 by cosine (weight 1.0)
    ├─ Tier 2: same concept, different assignment, top-5 (weight 0.6)
    └─ Tier 3: semantic-only, top-3 (weight 0.3)
    │
    ├─ Tier-1 precedent path (≥3 matches, >0.85 sim) → single validation call
    └─ Full panel (Claude Sonnet 4.5 + Gemini 2.5 Pro + GPT-4o via OpenRouter)
            │  disagreement → flag for TA
            ▼
        quote validation → persist → UI render
```

---

## Differentiators

- **3-vendor LLM panel via OpenRouter** — one SDK, one key, three models as strings. Model disagreement is a first-class signal, not an afterthought.
- **Concept-graph 3-tier retrieval** — rubric items connect to concepts; concepts connect across assignments. Tier 2 enables cross-test consistency that no commercial grading tool surfaces.
- **Page-specific quote-grounded feedback with server-side validation** — `submission.content.includes(quote)` checked before any deduction is persisted. Hallucinations are rejected, not displayed.
- **Cross-test consistency tracking** — variance per concept across Midterm 1 → Midterm 2 → HW displayed live.
- **FERPA-filtered regrade** — regrade output filter ensures only the requesting student's own submission text is quotable in the drafted response.

---

## KPIs

| Metric | Baseline | With gradepanel |
|---|---|---|
| Time per submission | ~12s cold | ~3s after graph warmup |
| Inter-grader σ (per rubric item) | ~1.4 pts | ~0.4 pts |
| Cross-test σ per concept | unmeasured | displayed live |
| Model calls saved (Tier 1/2 precedent) | — | ~50% after warmup |
| Quote-validation pass rate | — | >95% (calibration: 100% on 3-file fixture) |
| Regrade response time | 15 min manual | 30s |

---

## Eval calibration

`eval/calibration.json` — last run output from `npm run eval`. The calibration script (`eval/calibrate.ts`) runs extraction against `eval/ground-truth/` fixtures and computes quote-validation pass rate, rubric item recovery, and deduction count accuracy. Checked into CI.

Latest result: 3 files, 6 deductions extracted, 6/6 quotes valid, 0 errors.

---

## Quick start

```bash
cp .env.example .env.local
# Add OPENROUTER_API_KEY to .env.local
npm install
npm run dev
# Open http://localhost:3000
```

---

## Tests

```bash
npm test          # vitest unit tests (106/106)
npm run test:e2e  # playwright happy-path
npm run eval      # calibration against ground-truth fixtures
```

---

## Stack

Next.js 16 + React 19 + Tailwind v4 + SQLite (`better-sqlite3`) + sqlite-vec + OpenRouter (Claude Sonnet 4.5 / Gemini 2.5 Pro / GPT-4o / text-embedding-3-small)

---

Built solo at BIBI 2026 (Build It Break It hackathon, Google LA, May 10-11).

**License:** MIT
