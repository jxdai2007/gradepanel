# gradepanel — Implementation Roadmap

**Generated:** 2026-05-10 (BIBI 2026 hackathon, Google LA)
**Goal:** Ship gradepanel in 22h via subagent-driven execution with TDD discipline
**Design doc:** `~/.gstack/projects/jollenshoulddai/jollenshoulddai-gradepanel-design-20260510-111944.md`

---

## Strategic Constraints

- **Time:** 22 hours solo build + Day 2 attack phase
- **Architecture:** Next.js 14 + Vercel + 3-model panel (Claude Sonnet 4.5 + Gemini 2.5 + GPT-4o) + SQLite+sqlite-vec graph + OpenAI embeddings
- **Defense:** strict JSON schema enforcement on every LLM call + XML-delimited prompts + server-side quote validation + regrade output filter + zip-slip + size limits
- **Ship:** live Vercel URL, public GitHub repo, green CI badge, hand-graded calibration eval, 3 TA interviews logged
- **Test discipline:** every meaningful unit unit-tested in isolation; API routes integration-tested; one E2E happy-path via Playwright

---

## Six Phases (Sequential, Internally Parallelizable)

```
Phase 0: Setup (Hours 0–1)
  └── must complete before anything else

Phase 1: Core Primitives (Hours 1–4)
  ├── 1A: Schema-enforced LLM caller (single model) ──┐
  ├── 1B: Quote validator                              ├── parallel
  ├── 1C: Embedding client                             │
  └── 1D: SQLite + sqlite-vec + schema migrations    ──┘

Phase 2: Domain Logic (Hours 4–8)
  ├── 2A: 3-model panel (depends on 1A) ─────────────┐
  ├── 2B: Bootstrap extraction (depends on 1A)        ├── parallel
  ├── 2C: 3-tier retrieval (depends on 1C, 1D)        │
  └── 2D: Concept tagging (depends on 1A)           ──┘

Phase 3: API Routes (Hours 8–12)
  ├── 3A: POST /api/extract (depends on 2B, 2D)      ┐
  ├── 3B: POST /api/grade (depends on 2A, 2C)         │
  ├── 3C: POST /api/regrade (depends on 2C, security) ├── parallel
  ├── 3D: GET /api/stats (depends on 2C)              │
  └── 3E: GET /api/health                           ──┘

Phase 4: UI (Hours 12–16)
  ├── 4A: Drag-drop + bootstrap progress (depends on 3A) ┐
  ├── 4B: Approval gate (depends on 3A)                  │
  ├── 4C: Submission viewer + line numbering            ├── partial parallel
  ├── 4D: Deduction cards + precedent badges            │
  ├── 4E: Novel-issue inline card (depends on 3B)       │
  └── 4F: KPI dashboard (depends on 3D)              ──┘

Phase 5: Integration + Day 2 Defenses (Hours 16–19)
  ├── 5A: E2E happy-path test (Playwright)
  ├── 5B: Day 2 attack tests (prompt injection, FERPA, schema, zip slip)
  ├── 5C: Eval calibration script + chart
  └── 5D: Reach 1 — regrade UI + endpoint hardening

Phase 6: Polish (Hours 19–22)
  ├── 6A: README + repo polish
  ├── 6B: Demo rehearsal x3 + backup video
  └── 6C: Submit
```

---

## Phase 0: Setup

**Goal:** Repo exists, CI is green, deploys cleanly, /api/health returns 200. Nothing else.

| # | Task | Output |
|---|------|--------|
| 0.1 | `npx create-next-app@latest gradepanel --typescript --tailwind --eslint --app` | Empty Next.js project |
| 0.2 | `git init && gh repo create gradepanel --public --source=. --push` | Public GitHub repo |
| 0.3 | Install deps: `vitest @vitest/ui @anthropic-ai/sdk openai @google/generative-ai better-sqlite3 sqlite-vec zod react-dropzone` | package.json updated |
| 0.4 | Add `.github/workflows/ci.yml` — lint + typecheck + test on every push | CI passes on first commit |
| 0.5 | Add `vitest.config.ts` + `tsconfig.json` strict mode | Test runner configured |
| 0.6 | Implement `app/api/health/route.ts` returning `{ ok: true, ts: Date.now() }` | Health endpoint live |
| 0.7 | `vercel --prod` deploy | Live URL working |
| 0.8 | Commit: `chore: init gradepanel scaffold + CI + health endpoint` | First green commit |

**Milestone:** Public URL returns 200 on `/api/health`. CI badge in README is green.

**Subagent execution:** Tasks 0.1–0.8 must be done sequentially by ONE subagent (filesystem state depends on prior step).

---

## Phase 1: Core Primitives

**Goal:** The four shared building blocks all higher layers depend on. Fully unit-tested in isolation.

### 1A: Schema-enforced LLM caller (single model)

**File:** `lib/llm/caller.ts`

Function: `callLLM(model, prompt, schema) → ParsedResponse | SchemaError`. Wraps Anthropic/OpenAI/Google SDKs in a unified interface. Validates response against Zod schema, retries once on schema error, throws on persistent failure.

**Tests (vitest, mock SDK responses):**
- Valid response → returns parsed object
- Malformed JSON → retries once → if still bad, throws `SchemaValidationError`
- Network error → propagates
- Different models map to different SDK clients correctly
- Timeout (per-model, default 9000ms) → throws `LLMTimeout`

### 1B: Quote validator

**File:** `lib/grounding/validate.ts`

Function: `validateQuote(submission, quote) → { valid: boolean, normalizedMatch?: string }`. Checks if `quote` appears as substring in `submission` after whitespace normalization. Tolerates LF/CRLF, leading/trailing space, but NOT semantic variation.

**Tests:**
- Exact match → valid
- Whitespace differences → valid (after normalization)
- Substring match → valid
- Hallucinated quote (not in source) → invalid
- Empty quote → invalid

### 1C: Embedding client

**File:** `lib/graph/embed.ts`

Function: `embed(text) → Float32Array(1536)`. Uses OpenAI `text-embedding-3-small`. Batch-friendly: `embedBatch(texts) → Float32Array[]`.

**Tests:**
- Returns 1536-dim float array
- Batch returns array of correct length
- Cosine of identical text ≈ 1.0
- Cosine of unrelated text < 0.5
- Network error → propagates

### 1D: SQLite + sqlite-vec + schema

**File:** `lib/graph/db.ts` + `lib/graph/schema.sql`

Initializes SQLite (`better-sqlite3`) at `~/.gradepanel/graph.db`. Loads sqlite-vec extension. Runs migrations from `schema.sql`. Falls back to FTS5 with manual cosine if sqlite-vec fails to load.

**Tables:**
- `courses, assignments, rubric_items, concepts, rubric_concepts`
- `submissions, deductions, deduction_concepts`
- `ta_actions, regrade_requests`

**Tests:**
- DB initializes with correct schema
- sqlite-vec extension loads OR FTS5 fallback activates with warning
- Insert + retrieve a deduction
- Foreign keys enforced
- Vector dimension validation (1536-dim required)

---

## Phase 2: Domain Logic

### 2A: 3-Model Panel

**File:** `lib/panel/index.ts`

Function: `runPanel(prompt, schema) → PanelResult`. Dispatches three parallel `callLLM` invocations (Claude + Gemini + GPT-4o). Aggregator merges responses, computes per-finding agreement, flags disagreements.

**Tests:**
- 3 models agree → consensus, agreement = 1.0
- 2 of 3 agree → consensus = majority, agreement = 0.66
- All 3 disagree → flagged for review
- 1 model times out → partial result with N/A flag, doesn't block
- All 3 fail → throws `PanelTotalFailure`

### 2B: Bootstrap Extraction

**File:** `lib/extract/bootstrap.ts`

Function: `extractBootstrap(submissions: TextDoc[]) → ExtractedBootstrap`. Single-model (Claude Sonnet 4.5). Five LLM steps:
1. Per-submission: extract student answer + TA deductions
2. Cross-submission rubric inference
3. Concept extraction per rubric item
4. Deduction-to-rubric mapping
5. Quote validation on every extracted deduction (filter out hallucinated quotes)

**Tests:**
- Extract from 1 well-structured submission → 4-6 deductions
- Quote validation catches hallucinated quote
- Rubric inference clusters deductions across submissions
- Concept extraction returns specific names (not "general code quality")
- Empty submissions list → throws `InsufficientDataError`

### 2C: 3-Tier Retrieval

**File:** `lib/graph/retrieve.ts`

Function: `retrievePrecedent(rubricItemId, embedding, conceptIds) → Tiered`. Returns:
- Tier 1: same rubric item, top-5 by cosine, weight 1.0
- Tier 2: same concept(s), different rubric item, top-5, weight 0.6
- Tier 3: semantic-only, top-3, weight 0.3

**Tests:**
- Returns all three tiers
- Tier 1 only fires when rubric item has ≥1 prior deduction
- Tier 2 fires across assignments via shared concept
- Tier 3 catches semantically-similar without concept overlap
- Empty graph → all tiers empty, no error

### 2D: Concept Tagging

**File:** `lib/extract/concepts.ts`

Function: `extractConcepts(rubricItem) → ConceptTag[]`. Single LLM call with strict schema. Limits: max 3 concepts per item, must be specific (rejected if too generic).

**Tests:**
- Specific rubric → 1-3 specific concepts
- Generic concepts ("good code") → rejected, retried
- Hierarchical concepts (parent/child) deferred to v2 — flat only for hackathon
- Concepts deduplicated across items in a course

---

## Phase 3: API Routes

All routes use `lib/security/schemaEnforce.ts` middleware to validate request bodies via Zod.

### 3A: `POST /api/extract` (bootstrap)

Body: `{ files: { name, content }[] }` (10 graded submissions).
Response: streaming SSE with progress events + final structured rubric/deductions/concepts for approval.

### 3B: `POST /api/grade` (auto-grade)

Body: `{ submission: text, rubricId: string }`.
Response: deductions array with location + quote + precedent badges.
Server-side quote validation rejects hallucinated quotes.

### 3C: `POST /api/regrade` (Reach 1)

Body: `{ deductionId, studentArgument: text }`.
Response: precedent-grounded draft response. **Output filter** — only references original submission's text + aggregate stats; NEVER quotes other students.

### 3D: `GET /api/stats`

Query: `?courseId=...&assignmentId=...`.
Response: cross-TA σ per rubric item + cross-test σ per concept + time/sub histogram.

### 3E: `GET /api/health`

Already done in Phase 0.

**Tests per route:**
- Valid input → expected response shape
- Invalid input → 400 with structured error
- Schema violation → 400, no LLM call made
- Authorization (none for hackathon — anonymous OK, but rate-limited)
- Rate limit → 429 after 5 req/min per IP

---

## Phase 4: UI

### 4A: Drag-drop + Bootstrap Progress

**Components:** `DragDropZone`, `BootstrapProgress`.

Drag 10 files in → POST to `/api/extract` → SSE updates progress bar with phases.

### 4B: Approval Gate

**Component:** `ApprovalGate`.

After bootstrap, shows "We extracted 6 rubric items, 47 deductions, 4 concepts. Confirm or edit." Inline edit on rubric items (rename, merge, delete, retag concept).

### 4C: Submission Viewer

**Component:** `SubmissionViewer`.

Renders submission with line numbers + highlighted quote spans for each deduction. Click deduction card → scrolls/highlights the corresponding span.

### 4D: Deduction Cards + Precedent Badges

**Component:** `DeductionCard`.

Each card: location, quote, points, reason, agreement (3 model badges), precedent ("12 prior cases on this rubric item + 8 on chain rule"). Buttons: Accept, Edit, Reject.

### 4E: Novel-Issue Inline Card

**Component:** `NovelIssueCard`.

Surfaces when retrieval finds no precedent AND ≥2/3 models agree. Three buttons: **Add to graph** | **Accept once** | **Reject**.

### 4F: KPI Dashboard

**Component:** `KpiDashboard`.

Live updating: time/sub, σ across TAs, σ per concept across tests, calls saved.

**Tests:**
- Each component has at least 1 unit test (rendering, prop variations)
- One E2E happy-path test in Playwright covers Phase 4 end-to-end

---

## Phase 5: Integration + Day 2

### 5A: E2E Happy Path

**File:** `tests/e2e/grade-flow.spec.ts`.

Drag 2 fixture files → bootstrap → approval → grade 1 ungraded fixture → assert deduction visible with precedent badge.

### 5B: Day 2 Attack Tests

**File:** `tests/security/`.

Each attack from the Day 2 review has a test:
- Direct submission prompt injection → schema enforcement rejects malformed
- Indirect injection via rubric → XML wrapping isolates input
- FERPA exfil via regrade → output filter strips foreign content
- Quote hallucination → server validation rejects
- Zip slip (if Reach 2 attempted) → extractor rejects path traversal
- Size limit DoS → middleware caps at 10KB submission, 20 rubric items

### 5C: Eval Calibration

**File:** `eval/calibrate.ts` + `eval/ground-truth/*.txt`.

Loads 10 hand-graded submissions, runs through panel, compares to canonical, generates `eval/calibration.png`. Output: defect-recall, false-positive rate, per-tier source attribution.

### 5D: Reach 1 Polish

Hardening: regrade output filter must strip quoted text >200 chars not in original submission. Tests: cross-student exfil attempts → blocked.

---

## Phase 6: Polish

- README with hero, install, KPI preview, architecture, eval, demo gif
- Repo pinned on user GitHub
- Demo script as `docs/DEMO.md`
- Backup screen recording (90s) saved locally
- Vercel deploy verified one final time
- Devpost submission

---

## Subagent Execution Strategy

### Parallelization graph

After Phase 0 completes (sequential):

- **Phase 1:** dispatch 4 subagents in parallel (1A, 1B, 1C, 1D). All independent.
- **Phase 2:** dispatch 4 subagents (2A, 2B, 2C, 2D). 2A waits for 1A. 2B waits for 1A. 2C waits for 1C+1D. 2D waits for 1A. All can start once Phase 1 subagents return.
- **Phase 3:** dispatch 5 subagents (3A-3E). All depend on Phase 2 components.
- **Phase 4:** dispatch 6 subagents (4A-4F). Most independent UI components; 4E depends on 4D.
- **Phase 5:** dispatch 4 subagents (5A-5D). All independent.
- **Phase 6:** sequential (README + rehearsal + submit).

### Two-stage review per task

For each subagent return:
1. **Auto-check:** does the test suite pass? Does CI pass? Does the API contract match?
2. **Manual sign-off:** I review code briefly, accept or reject with feedback.

If subagent returns with failing tests: dispatch back with the failure context; cap at 2 retries before escalating to user.

### Checkpoints for user review

I'll surface these to user for explicit sign-off:
- After Phase 1 complete (core primitives in place)
- After Phase 2 complete (domain logic ready)
- After Phase 4 complete (UI working end-to-end)
- After Phase 5 complete (security defenses verified)
- Before submission

Between checkpoints, I execute autonomously. User works on hand-grading + TA interviews in parallel.

---

## Test Strategy Summary

- **Unit tests** (vitest): every function in `lib/`, every API route handler, every UI component
- **Integration tests:** API route + database + LLM mocked = full request/response cycle
- **E2E tests** (Playwright): one happy-path covering drag → bootstrap → approve → grade → see deduction
- **Security tests:** every Day 2 attack vector has a test that asserts it's caught
- **Calibration test:** eval/calibrate.ts runs against ground truth, fails CI if defect-recall <60% or quote-validation <90%

---

## Success Criteria (Phase Gates)

| Phase | Pass condition |
|---|---|
| 0 | Public URL responds 200 on /api/health, CI green |
| 1 | All 4 primitive units have ≥3 passing tests each |
| 2 | All 4 domain components have ≥3 passing tests each + integration with Phase 1 |
| 3 | All 5 routes have integration tests passing |
| 4 | E2E happy path passes |
| 5 | All Day 2 attack tests pass + calibration produces chart |
| 6 | Submitted to Devpost |

---

## Risks + Mitigations

| Risk | Probability | Mitigation |
|---|---|---|
| sqlite-vec extension fails on Vercel serverless | Med | FTS5 + manual cosine fallback baked into 1D |
| LLM extraction hallucinates quotes | High | Quote validator (1B) is mandatory pre-persistence step |
| Bootstrap takes too long for demo | Med | Parallel extraction, progress streaming, max 30s budget |
| Subagent gets stuck in retry loop | Low | Cap retries at 2, escalate after 3 |
| API rate limit during demo | Low | Per-model limits configured, fallback to single-model on 429 |
| Vercel function timeout (10s hobby) | High | Use Pro tier OR explicitly cap LLM calls at 9s with `Promise.race` |

---

## Next Step

Plan document follows. Save the time-pressed implementation budget for code, not for re-deciding architecture.
