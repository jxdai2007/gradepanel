# gradepanel — Design Doc

**Date:** 2026-05-10
**Status:** APPROVED (locked at hackathon kickoff)
**Mode:** Builder (BIBI 2026 at Google LA, May 10-11, 22h solo)
**Customer:** college TA (assigned by hackathon organizers)

## Problem Statement

College TAs grade 50-200 student submissions per assignment, taking 4+ hours per week. Three problems compound:

1. **Inconsistency across TAs** — variance in deductions for similar work creates documented equity issues (Crowdmark exists specifically because of this human pain).
2. **Inconsistency across assignments** — TA grades Midterm 2's chain-rule problem differently than Midterm 1's chain-rule problem, even when testing the same concept. Students notice.
3. **Generic AI feedback** — current AI grading tools output "your work has issues" rather than "on line 47 you wrote `for (i=0; i<n; i++)` and rubric item 3 required a loop invariant."

Hackathon explicitly rewards full SWE pipeline + measurable KPIs.

## What Makes This Different

- **Three-vendor LLM panel via OpenRouter** (Claude Sonnet 4.5 + Gemini 2.5 Pro + GPT-4o) — disagreement is signal, direct rhyme to Philo Juang's Nov 2025 cross-model SAT essay experiment (his public output). One SDK, one API key.
- **Three-tier retrieval graph with concept layer** — not just a vector store, an actual graph where concepts (e.g., "chain rule") connect rubric items across assignments. Tier 2 retrieval enables cross-test precedent.
- **Cross-test consistency made first-class** — variance per concept across Midterm 1 → Midterm 2 → HW → final, displayed live to the TA. No commercial tool surfaces this.
- **Page-specific grounded feedback with quote validation** — every deduction cites line + exact quote from the submission. Server-side validation rejects hallucinated quotes. This is the "real TA, not AI slop" signal.
- **Drag-drop bootstrap with LLM extraction + TA approval gate** — TA drags 10 already-graded submissions in, system extracts implicit rubric/deductions/concepts, surfaces for 30-sec confirm.
- **Novel-issue inline card** — when no precedent exists, TA decides whether to add to graph (compounds) or accept-once (doesn't pollute).
- **Auto-regrade handler with output filter** — student requests regrade, system retrieves precedent across the class, drafts response in 30 seconds. FERPA-safe (output filter ensures only the student's own submission is referenced).

## Constraints

- Solo, 22 hours, BIBI 2026
- Live deployment required (Vercel)
- Day 2 attack phase ("Build It Break It")
- Customer assigned: college TA
- Hackathon rewards: full SWE pipeline + measurable KPIs + customer interviews (+10% per, capped 1.5x total)
- Open source MIT for Lux narrative
- Must compose with Escalon (multi-model judge panel applied to grading domain)

## Why OpenRouter

Single SDK (OpenAI-compatible), one API key, three models referenced as strings. Cuts ~2 hours of plumbing. Unifies error handling. Already configured at `/Users/jollenshoulddai/Desktop/escalon/.env` and copied to gradepanel `.env.local`.

## User Flow (LLM handles extraction, TA confirms once)

**Phase 1 — Drag-drop bootstrap (~20s):** TA drags 10 already-graded submissions (plain text or PDF). System extracts via Claude Sonnet 4.5: per-submission deductions + cross-submission rubric inference + concept extraction. Server-side quote validation on every extracted deduction.

**Phase 1.5 — Approval gate (~30s, NON-NEGOTIABLE):** "We extracted 6 rubric items, 47 deductions, 4 concepts. Confirm or edit." TA confirms. Without this gate, extraction errors poison the graph.

**Phase 2 — Auto-grade:** TA drags ungraded submissions. Per rubric item, runs 3-tier retrieval. High-confidence precedent → single validation call. Otherwise → full panel.

**Phase 3 — Novel-issue handling:** Panel proposes deduction with no precedent + ≥2/3 models agree → inline card surfaces with three buttons: **[Add to graph]** **[Accept once]** **[Reject]**. TA owns what propagates.

## The 3-tier retrieval flow

For each new submission's answer to each rubric item:

1. Embed the answer text (text-embedding-3-small via OpenRouter, 1536-dim)
2. Three-tier query:
   - **Tier 1** (weight 1.0): same `rubric_item_id`, top-5 by cosine
   - **Tier 2** (weight 0.6): same concept(s) on different `rubric_item_id` or different `assignment_id`, top-5 by cosine — enables cross-test precedent
   - **Tier 3** (weight 0.3): semantic-only, top-3 by cosine
3. Pass tiered evidence to the panel as labeled context
4. If Tier 1 has ≥3 deductions agreeing within ±1pt and >0.85 similarity → **precedent path** (single validation call, ~5x speedup)
5. Else if Tier 1/2 thin AND ≥2 panel models agree → **novel-issue alert**
6. Else → **full panel path**
7. After TA accepts AND chooses "add to graph" → graph upsert with concept tags

## Output schema (strictly enforced)

```ts
{
  rubric_item_id: string,
  points_deducted: number,
  location: {
    line_start: number,
    line_end: number,
    section_heading?: string,
    quote: string                         // exact substring of submission text
  },
  reasoning: string,
  grounding_confidence: number,            // 0-1, from quote substring match
  concepts: string[]
}
```

**Server-side validation:** `submission.content.includes(deduction.location.quote)` — if false, retry once, then reject the deduction.

## KPIs (all measurable, all displayed live)

| KPI | Measurement | Target |
|---|---|---|
| Time per submission | Total inference time / N submissions | 12s → 3s after warmup |
| Inter-grader σ (within assignment) | σ of points_deducted per rubric item across TAs | 1.4 → 0.4 |
| **Cross-test σ per concept** | Same concept, σ across assignments | "Chain rule σ: 0.6 (Midterm 1) → 0.4 (Midterm 2)" |
| Inference cost reduction | Model calls saved via Tier-1/2 precedent | ~50% after warmup |
| Quote-validation pass rate | % of deductions where quote substring matched | >95% |
| Regrade response time | Request → drafted response | 15min → 30s |

## Day 2 attack defenses (built into v1, not bolted on)

| Attack | Defense |
|---|---|
| Direct submission prompt injection | XML-delimited submission wrap + JSON schema enforcement on output |
| Indirect injection via rubric | Rubric also XML-delimited |
| FERPA exfil via regrade | regrade output filter: only original submission text quotable |
| Quote hallucination | server-side substring validation before persistence |
| API key exfil | strict JSON schema rejects responses with unexpected keys; logs strip headers |

Demo two attacks live in Day 2: submission injection (caught by schema) + rubric injection (caught by XML wrapping).

## Demo arc (90s)

1. **(8s)** Pain: UCLA TA workload + the inconsistency-equity angle (Tristan Que's lens).
2. **(15s)** Drag 10 graded files in. Progress streams: "Extracting deductions... Inferring rubric... Tagging concepts... Done in 18s."
3. **(8s)** Approval gate: "We extracted 6 rubric items, 47 deductions across 4 concepts. Confirm." TA confirms.
4. **(20s)** Auto-grade: drag 5 ungraded submissions. Each grades in 3-8s. Page-specific feedback with quotes inline. Precedent badges visible.
5. **(10s)** Cross-test moment: Tier 2 retrieval surfaces "8 cases on chain rule from Midterm 1" while grading Midterm 2.
6. **(8s)** Novel-issue card: submission 7 hits unseen pattern → "[Add to graph]" → submission 8 references it.
7. **(10s)** Reach 1: regrade request → graph retrieves precedent → drafted response in 30s. Cites only original submission. FERPA-safe.
8. **(8s)** Day 2: two attacks demoed (submission injection + rubric injection), both caught.
9. **(4s)** SWE pipeline: GitHub green CI badge + /api/health.

## Judges (research-confirmed)

- **Philo Juang** — Google DeepMind AI Engineer. UCLA CS 130 teacher. Nov 2025 multi-LLM grading experiment. Aesthetic: production rigor + applied empirical LLM behavior.
- **Omar Elamri** — Google SWE, CTF/security, IMC Starlink paper. Aesthetic: real systems + security depth + AI ethics.
- **Tristan Que** — Google SWE, UCLA CS '23, equity research (EV charging access). Aesthetic: data-driven, equity/access angle.
- **Alan Wayne** — Google EPM, edtech focus. Aesthetic: team dynamics, real-world applicability.
- **Manuel Martinez** — Google SWE.

## Hackathon scoring

Product/UX 100pts (Problems+Outcomes 30 / Customer Value 15 / Demo 25 / UX 30) + Technical 100pts (Tech Achievement 25 / Deployment 15 / Edge Cases 30 / Demo 30) + multipliers 1.0-1.5x. ~100 teams compete.

## Adversarial review record

Four independent Claude subagents ran fresh-context adversarial reviews on the v1 plan: strategist, novelty audit, Day 2 attack imagination, judge-panel imagination.

- Strategist: MEDIUM win probability, top-10. Reframe gold: "make the precedent graph student-facing for fairness infrastructure framing."
- Novelty audit: DIFFERENTIATED (3-vendor panel + RAG deduction graph + cross-TA variance is unshipped). Closest competitor: CoGrader (UIST 2025), single-model.
- Day 2 attack: 6 of 10 attacks pass current defenses without integrated fixes. Critical: FERPA exfil via regrade. All fixes integrated into v2 plan.
- Judge panel: top 5-10 estimate, Philo 7/10, kill-shot is circular eval. Hand-graded ground truth is non-negotiable.

All five critical concerns from those reviews are integrated into the v2 plan in `docs/PLAN.md`.

## Lux narrative (for application due May 26)

> "17 days post-Escalon, shipped gradepanel solo at BIBI 2026 (Google LA): open-source web app + multi-model judge panel + concept-graph retrieval applied to TA grading. Same primitive as Escalon (multi-model verdict on agent quality), shipped at a different layer (educational decisions). Pattern: I find primitives, ship them open-source, apply across domains where wrong answers hurt most. Fellowship unifies Escalon (text/agent eval) + gradepanel (educational eval) into one platform: multi-model verdict for high-stakes AI decisions."
