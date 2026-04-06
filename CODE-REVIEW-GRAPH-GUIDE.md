# Code Review Graph - Simple Guide

## What is it?

Code Review Graph is a **smart map of your codebase** that saves money by reducing Claude's token usage.

Think of it like Google Maps for your code. Instead of Claude walking through every street (file) to find a shop (function), it just looks at the map and goes directly there.

---

## The Problem it Solves

Every time you ask Claude something like:

> "Fix the bug in ArticleCard"

**Without the graph**, Claude does this:

```
1. Read file 1... nope, not here
2. Read file 2... nope
3. Read file 3... nope
   ... reads 79 files ...
79. Found it! Now let me find what uses it...
   ... reads all 79 files again ...
```

**Result:** Hundreds of thousands of tokens burned just to find things.

**With the graph**, Claude does this:

```
1. Ask graph: "Where is ArticleCard?"
   -> Answer: ArticleCard.jsx, line 3-30

2. Ask graph: "What files use ArticleCard?"
   -> Answer: ExploreScreen.jsx, line 8

3. Read only those 2 files
```

**Result:** 6-8x fewer tokens = significant cost savings.

---

## How Does it Work?

### Step 1: Build (one time)

```
code-review-graph build
```

This scans your entire codebase and creates a **knowledge graph** stored locally:

```
Your Code (79 files)
    |
    v
Tree-sitter Parser (understands code structure)
    |
    v
SQLite Database (.code-review-graph/graph.db)
    |
    Contains:
    - 426 nodes (functions, components, files)
    - 2,021 edges (who calls who, who imports what)
```

### Step 2: Auto-Update (automatic)

Every time you:
- **Save a file** -> graph updates that file only (< 2 seconds)
- **Make a git commit** -> graph updates changed files only

You never need to rebuild manually.

### Step 3: Claude Uses it (automatic)

When you ask Claude anything, it queries the graph first:

```
You: "Refactor the ThreadCard component"

Claude's brain:
  1. semantic_search("ThreadCard")     -> Found at ThreadCard.jsx:5
  2. query_graph(importers_of)         -> Used by TopicDetail.jsx, ForumScreen.jsx
  3. get_impact_radius(ThreadCard.jsx) -> Changing it affects 3 files
  4. Read ONLY those 3 files
  5. Make the change with full context
```

---

## What Tools Does Claude Get?

The graph gives Claude **22 tools**. Here are the most important ones:

### Finding Code

| Tool | What it does | Example |
|------|-------------|---------|
| `semantic_search` | Find any function/component by name | "Where is ArticleCard?" |
| `query_graph` | Find relationships between code | "What calls this function?" |
| `file_summary` | Get all functions in a file | "What's in ExploreScreen.jsx?" |

### Understanding Impact

| Tool | What it does | Example |
|------|-------------|---------|
| `get_impact_radius` | What breaks if I change this? | "If I edit utils.js, what's affected?" |
| `get_affected_flows` | Which user flows are impacted? | "Does this change affect login?" |
| `detect_changes` | Risk-scored change analysis | "How risky is this PR?" |

### Architecture

| Tool | What it does | Example |
|------|-------------|---------|
| `architecture_overview` | High-level codebase structure | "How is the app organized?" |
| `list_communities` | Groups of related code | "What are the main modules?" |
| `list_flows` | Execution paths in the app | "What are the main user flows?" |

### Refactoring

| Tool | What it does | Example |
|------|-------------|---------|
| `refactor_tool` | Preview renames, find dead code | "What happens if I rename this?" |
| `find_large_functions` | Find functions that are too big | "What needs splitting up?" |

---

## Real Example from Our Project

### "What files import ArticleCard?"

**Without graph (old way):**
```
Claude runs: Grep "ArticleCard" across 79 files
Reads: multiple files to confirm imports
Tokens used: ~5,000-10,000
```

**With graph (new way):**
```
Claude runs: query_graph(importers_of, ArticleCard.jsx)
Answer: ExploreScreen.jsx, line 8
Tokens used: ~200
```

That is a **25-50x reduction** for a single lookup.

---

## Our Project's Graph Stats

```
Files indexed:     79
Functions found:   347
Total nodes:       426
Total edges:       2,021
Language:          JavaScript
Storage:           Local SQLite (no cloud)
Update speed:      < 2 seconds
```

### Edge Types (relationships tracked)

| Type | Count | Meaning |
|------|-------|---------|
| CALLS | 1,437 | Function A calls Function B |
| CONTAINS | 387 | File contains Function |
| IMPORTS_FROM | 197 | File imports from another File |

---

## Token Savings Breakdown

| Task Type | Without Graph | With Graph | Savings |
|-----------|--------------|------------|---------|
| Find a component | Read ~20 files | 1 graph query | ~10x |
| Check what uses it | Grep all files | 1 graph query | ~25x |
| Code review (small PR) | Read all changed + related files | Graph returns only impacted files | ~6-8x |
| Code review (large PR) | Read entire codebase sections | Graph computes blast radius | ~15-49x |
| Architecture question | Read folder structure + key files | 1 graph query | ~10x |
| Refactoring | Read every file that might break | Graph traces exact dependencies | ~8-12x |

---

## Files Added to Our Project

```
.mcp.json                          # MCP server config (tells Claude how to connect)
.code-review-graph/                # Graph database (gitignored, local only)
  graph.db                         # SQLite database with all code relationships
.claude/settings.json              # Auto-update hooks (rebuilds on file save/commit)
.claude/skills/                    # Slash commands for the graph
CLAUDE.md                          # Instructions telling Claude to use graph first
```

---

## Commands You Can Run

```bash
# Check graph health
code-review-graph status

# Rebuild from scratch (if something seems off)
code-review-graph build

# Update incrementally (usually automatic)
code-review-graph update

# Watch mode (live updates as you code)
code-review-graph watch

# See a visual graph of your code (opens in browser)
code-review-graph visualize

# Analyze risk of recent changes
code-review-graph detect-changes
```

---

## FAQ

**Q: Does this send my code to the cloud?**
No. Everything is local. The graph is stored in `.code-review-graph/graph.db` on your machine.

**Q: Do I need to do anything after setup?**
No. The graph auto-updates via hooks on every file save and git commit.

**Q: Does it slow down my editor?**
No. Updates happen in the background and take < 2 seconds.

**Q: What if the graph gets corrupted?**
Run `code-review-graph build` to rebuild from scratch.

**Q: Does this work with other AI tools?**
Yes. It supports Claude Code, Cursor, Windsurf, Zed, Continue, and OpenCode.

**Q: How much money does this save?**
Depends on usage, but the benchmarks show **6-8x fewer tokens on average**. If you spend $100/month on Claude tokens, this could bring it down to ~$12-16/month for the same work.
