# Next: Brainstorm Gradescope-style data ingestion

## State at hand-off (2026-05-10)

Phases 0–6 complete + PDF vision extraction shipped. Live at https://gradepanel.vercel.app, 67 tests passing, CI green. See `docs/EXECUTION.md`, `docs/DESIGN.md`, `docs/PLAN.md`.

## The pivot the user surfaced

The user's actual graded data is **Gradescope export format**, not what gradepanel v1 was built for. Example pasted in chat:

```
Question 2
Problem 2
4 / 4 pts
applied rubric item
+ 4 pts
Grading comment: CORRECT

unapplied rubric item
+ 3.95 pts
Grading comment: Pretty much correct, but with incomplete Gauss-Jordan elimination.

unapplied rubric item
+ 1 pt
Grading comment: Setting up the linear system correctly

unapplied rubric item
+ 1.5 pts
Grading comment: Performing Gauss-Jordan elimination essentially correctly (...)

unapplied rubric item
+ 0.5 pts
Grading comment: Correctly bringing the matrix to a form which clearly shows the inconsistency of the system

unapplied rubric item
+ 1 pt
Grading comment: Circling the correct answer (A)

unapplied rubric item
+ 0 pts
Grading comment: INCORRECT like that
```

Mismatches with v1:
- Per submission: PDF (handwritten) + rubric text are SEPARATE — not one combined "graded PDF"
- Rubric is already EXPLICIT — no LLM clustering needed
- Grading is POSITIVE (credit-based applied/unapplied), not negative deductions
- `+0 pts INCORRECT` is a legitimate rubric item, not noise

## Three directions the user wants to brainstorm

**Direction A (recommended): Gradescope adapter**
- New upload UX: drag the PDF + paste the rubric text in a textarea
- Deterministic parser for the `applied|unapplied / +N pts / Grading comment: ...` structure (no LLM for rubric extraction)
- Rubric items go straight into the graph
- Per submission, "applied" items recorded as positive-credit judgments
- Future ungraded PDFs scored by vision LLM against the now-explicit rubric
- ~45 min ship

**Direction B: Reframe demo entirely around this data shape**
- Skip the bootstrap-extraction step
- Entry point becomes "paste your rubric" page
- Then drag-drop student PDFs for grading
- Cleaner demo for this specific data; loses the "LLM extracts your rubric" magic moment
- ~20 min ship

**Direction C: Stay with v1, ask user to adapt their data**
- They'd have to merge PDF + rubric into one input
- Lossy, worse demo, more work for them
- Not recommended

User chose direction A AND wants to explore "other directions" in a new brainstorming session.

## Open questions to explore in the new chat

1. Should the rubric upload be:
   - A separate one-time setup step (rubric persists, then upload many student PDFs against it)?
   - Or per-submission (drag PDF + paste rubric for each submission)?
2. How does positive grading interact with the existing `deductions` table? Options:
   - Add a `points_change` field (positive=credit, negative=deduction). Rename `deductions` table semantics.
   - Keep `deductions` table, store credits as negative points_deducted (semantic bend).
   - New `rubric_applications` table separate from `deductions`.
3. For Day 2 attack survival: rubric text is now user-controlled. What prevents prompt injection in the `Grading comment` field?
4. What does the "novel issue" UX become when grading positive-credit against a fixed rubric? Probably: "this submission demonstrates X which isn't covered by any rubric item — TA, add a new item?"
5. Cross-test consistency story changes: now we have explicit rubric items per assignment. Cross-test = same concept tagged across assignments' rubrics. Concept extraction still applies.
6. What's the demo for this? Walk through one real graded submission, then drop an ungraded one, watch it get scored against the same rubric.

## To start the next chat

1. Open new Claude Code session
2. `cd ~/Desktop/gradepanel`
3. Paste this prompt:

```
You are picking up the gradepanel project at /Users/jollenshoulddai/Desktop/gradepanel.

Read these to get context:
1. docs/NEXT.md (this file — what we just decided)
2. docs/DESIGN.md (what gradepanel is, original design)
3. docs/EXECUTION.md (build state, env keys, fixtures)

The user wants to invoke the superpowers:brainstorming skill to explore Direction A (Gradescope adapter) and other related directions for handling their actual graded data shape. The user is at BIBI 2026 hackathon at Google LA, has ~14 hours left, all phases 0-6 are done and deployed.

Live URL: https://gradepanel.vercel.app
GitHub: https://github.com/jxdai2007/gradepanel
Test data: 45 UCLA Math 131A midterm PDFs at /Users/jollenshoulddai/Downloads/math31previous/

Use the brainstorming skill. Ask one question at a time. Don't auto-implement until design is approved.
```

That's it — fresh context, full state, ready to brainstorm A + alternatives.
