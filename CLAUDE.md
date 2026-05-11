# Repository Layout

This repo is a monorepo containing two apps and shared docs:

| Path | What | Stack |
|---|---|---|
| `indiaforums/` | Web prototype (iPhone-shell single-page app) | React 19, Vite 8, plain JS, CSS Modules |
| `mobile/` | Production-track mobile app | Expo 55, React Native 0.83, TypeScript, NativeWind, Zustand, React Query |
| `docs/tracking/` | Living progress trackers (`mobile-development-progress.md`, `screen-checklist.json`) | — |
| `docs/superpowers/` | Plans + specs created via the superpowers skills | — |

Each app has its own `CLAUDE.md` — read it before touching that subtree. `AGENTS.md` and `GEMINI.md` mirror this file for other tools.

---

## Working in this repo

There is **no root `package.json`** — each app installs and runs independently.

```bash
cd indiaforums && npm install && npm run dev      # web prototype on Vite
cd mobile      && npm install && npm run start    # mobile app on Expo
```

The web prototype (`indiaforums/`) and the mobile app (`mobile/`) are separate codebases — features are reimplemented, not shared. Treat the prototype as a design/UX reference for mobile work.

---

<!-- code-review-graph MCP tools -->
## MCP Tools: code-review-graph

**IMPORTANT: This project has a knowledge graph. ALWAYS use the
code-review-graph MCP tools BEFORE using Grep/Glob/Read to explore
the codebase.** The graph is faster, cheaper (fewer tokens), and gives
you structural context (callers, dependents, test coverage) that file
scanning cannot.

### When to use graph tools FIRST

- **Exploring code**: `semantic_search_nodes` or `query_graph` instead of Grep
- **Understanding impact**: `get_impact_radius` instead of manually tracing imports
- **Code review**: `detect_changes` + `get_review_context` instead of reading entire files
- **Finding relationships**: `query_graph` with callers_of/callees_of/imports_of/tests_for
- **Architecture questions**: `get_architecture_overview` + `list_communities`

Fall back to Grep/Glob/Read **only** when the graph doesn't cover what you need.

### Key Tools

| Tool | Use when |
|------|----------|
| `detect_changes` | Reviewing code changes — gives risk-scored analysis |
| `get_review_context` | Need source snippets for review — token-efficient |
| `get_impact_radius` | Understanding blast radius of a change |
| `get_affected_flows` | Finding which execution paths are impacted |
| `query_graph` | Tracing callers, callees, imports, tests, dependencies |
| `semantic_search_nodes` | Finding functions/classes by name or keyword |
| `get_architecture_overview` | Understanding high-level codebase structure |
| `refactor_tool` | Planning renames, finding dead code |

### Workflow

1. The graph auto-updates on file changes (via hooks).
2. Use `detect_changes` for code review.
3. Use `get_affected_flows` to understand impact.
4. Use `query_graph` pattern="tests_for" to check coverage.
