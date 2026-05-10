# EXECUTION — Read This First (After Fresh Chat)

You are picking up gradepanel mid-build at /Users/jollenshoulddai/Desktop/gradepanel. The user is the project owner (Jollen Dai, UCLA freshman) at BIBI 2026 hackathon at Google LA. They are working on hand-grading + TA interviews in parallel. Your job: build the app autonomously following PLAN.md.

## What gradepanel is

A solo 24h hackathon project: multi-model TA grading copilot with concept-graph retrieval, page-specific grounded feedback, and cross-test consistency. Read `docs/DESIGN.md` for the full why.

## Read order

1. **`docs/DESIGN.md`** — Why this project exists, who it's for, what makes it different. 5 min read.
2. **`docs/ROADMAP.md`** — Six phases, parallelization graph, milestones. 5 min read.
3. **`docs/PLAN.md`** — Task-by-task with full TDD code, exact paths, exact commands. THE PLAN. Read as you execute, not all upfront.

## Required env

`.env.local` is already populated with the user's OpenRouter API key. Sourced from `/Users/jollenshoulddai/Desktop/escalon/.env`. Do not commit this file (it's in `.gitignore`).

```
OPENROUTER_API_KEY=REDACTED_OPENROUTER_KEY
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
GOOGLE_API_KEY=REDACTED_GOOGLE_KEY
```

All three panel models (Claude Sonnet 4.5, Gemini 2.5 Pro, GPT-4o) and embeddings (text-embedding-3-small) go through OpenRouter via the OpenAI SDK. Models referenced by string:

- `anthropic/claude-sonnet-4.5`
- `google/gemini-2.5-pro` (or `google/gemini-2.5-flash` for speed)
- `openai/gpt-4o`
- `openai/text-embedding-3-small`

## Test fixtures

**45 real UCLA Math 131A/31A midterms** at `/Users/jollenshoulddai/Downloads/math31previous/*.pdf`. Use these as the integration test corpus. They are heterogeneous (some graded, some not, varying quality, varying professors). The app must handle them gracefully — that's the real-world bar.

## Execution discipline

1. **Follow PLAN.md task-by-task in order within a phase.** Phases are sequential (don't start Phase 2 before Phase 1 completes).
2. **Within a phase, parallel-dispatch independent tasks.** Use the `Agent` tool with subagent_type=general-purpose and tools=*. Each agent gets full task spec from PLAN.md.
3. **Every task is TDD: write failing test → run → fail → implement → run → pass → commit.** Steps are explicit in PLAN.md. Skipping the "verify it fails" step is a real bug source — don't skip.
4. **Use Skill tool for `impeccable` (frontend design)** when working on UI components in Phase 4. Skill is available — use it.
5. **Commit after every task.** Frequent commits = recoverable state if anything breaks.
6. **At each phase boundary, run the full test suite.** `npm run ci` must be green before proceeding.

## Phase checkpoints — what to verify before moving on

| End of phase | Verify |
|---|---|
| Phase 0 | `curl http://localhost:3000/api/health` returns `{ok:true}`. CI badge green. |
| Phase 1 | `npm test lib/` — all primitives pass ≥3 tests each |
| Phase 2 | `npm test lib/` — domain logic tests pass + integration tests with Phase 1 |
| Phase 3 | `npm test app/api/` — all 5 routes integration-test pass |
| Phase 4 | `npm run test:e2e` — happy-path E2E pass (drag → bootstrap → approve → grade → see deduction with quote) |
| Phase 5 | `npm test tests/security/` — all Day 2 attack tests pass + `npm run eval` produces calibration.png |
| Phase 6 | App deployed live, README polished, demo script ready |

## When something fails

1. Read the error. Don't guess.
2. Check the test that failed against PLAN.md — did you implement what the test asserts?
3. If schema enforcement rejects an LLM response, log the response and adjust the prompt or schema. Do NOT loosen schema validation — that's a safety boundary.
4. If sqlite-vec extension fails to load, fall back to FTS5 + manual cosine (path documented in Task 1D).
5. If a subagent comes back with failing tests after 2 retries, escalate to the user with the specific failure.

## Things to NOT do

- **Don't commit `.env.local`** — it has the API key.
- **Don't commit ground-truth submissions to git if they include any real student PII.** The math31 fixtures are public exam questions, safe to commit. If user provides actual student work, gitignore it.
- **Don't loosen JSON schema validation to "make tests pass"** — schemas are part of the security model.
- **Don't skip quote validation.** It's the difference between "real TA" and "AI slop." Server-side substring check is mandatory before any deduction is persisted.
- **Don't write code in API routes that bypasses `lib/security/*` middleware.** All input must flow through the security layer.

## Things to DO

- Use parallel subagent dispatch where tasks are independent (see ROADMAP.md parallelization graph).
- Run `npm run ci` after every commit until it's a habit.
- When uncertain about a UI design choice, invoke the `impeccable` skill via Skill tool.
- Use shadcn/ui components where they exist for the UI primitives.
- Surface phase-end status to the user via a single-line summary, not a wall of text.

## When done

Phase 6 produces:
- Live Vercel URL (deployed and tested with judges' machines)
- Public GitHub repo at `jollenshoulddai/gradepanel`, pinned, MIT licensed
- README with hero + install + KPI dashboard preview + architecture + eval results
- `docs/DEMO.md` with the 90-second demo script
- Backup screen recording locally
- Devpost submission posted

Surface "DONE" with a 5-line summary listing each of these as ✅.

---

**Now go read DESIGN.md, ROADMAP.md, and PLAN.md in that order, then start Phase 0.**
