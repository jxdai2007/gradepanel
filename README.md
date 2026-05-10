# gradepanel

![CI](https://github.com/jxdai2007/gradepanel/actions/workflows/ci.yml/badge.svg)

Multi-model TA grading copilot with concept-graph retrieval, page-specific grounded feedback, and cross-test consistency.

Built solo at BIBI 2026 (Build It Break It hackathon, Google LA).

## What it does

Drag 10 already-graded student submissions in. The system extracts the implicit rubric, deductions, locations, quotes, and concepts via LLM. After a 30-second TA approval gate, the graph is populated. From then on, drag in ungraded submissions and watch them auto-grade with:

- **Multi-model panel** (Claude Sonnet 4.5 + Gemini 2.5 + GPT-4o via OpenRouter) — disagreement flags ambiguity
- **Three-tier retrieval graph** — same rubric item / same concept across tests / semantic. Cross-test consistency made visible.
- **Page-specific grounded feedback** — every deduction cites the line, exact quote from the submission, rubric requirement. Server-side quote validation rejects hallucinations.
- **Novel-issue inline card** — when no precedent exists, TA decides whether to add to graph (compounds) or accept-once (doesn't pollute).
- **Auto-regrade handler** — student requests regrade, system retrieves precedent across the class, drafts response in 30 seconds. FERPA-safe.

## Quick start

```bash
cp .env.example .env.local
# Edit .env.local with your OpenRouter API key

npm install
npm run dev
```

Open http://localhost:3000.

## For autonomous execution

If you're picking this up after a fresh chat:

1. Read `docs/EXECUTION.md` first — single entry point for end-to-end build
2. Read `docs/PLAN.md` for task-by-task with TDD code
3. Read `docs/ROADMAP.md` for the phase structure
4. Read `docs/DESIGN.md` for the why behind every architectural choice

Test data: `/Users/jollenshoulddai/Downloads/math31previous/*.pdf` (45 real UCLA Math 131A/31A midterms). Use these as fixtures for PDF ingestion + grading.

## Architecture (one paragraph)

Next.js 14 + Vercel + SQLite (via `better-sqlite3`) + sqlite-vec for vector search (FTS5 fallback). All LLM calls go through OpenRouter (one SDK, one API key, models referenced as strings: `anthropic/claude-sonnet-4.5`, `google/gemini-2.5-pro`, `openai/gpt-4o`). Embeddings via `openai/text-embedding-3-small` through OpenRouter. Strict JSON schema enforcement on every model response (Zod), XML-delimited prompts, server-side quote validation. Open source MIT.

## Tests

```bash
npm test            # vitest unit tests
npm run test:e2e    # playwright happy-path
npm run eval        # calibration against ground-truth fixtures
npm run ci          # all of the above
```

## License

MIT
