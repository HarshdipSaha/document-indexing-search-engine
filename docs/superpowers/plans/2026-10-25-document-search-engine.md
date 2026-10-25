# Document Search Engine Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Polish the retrieval workbench into a clearly structured, fully tested submission that demonstrates both document-indexing assignments.

**Architecture:** Preserve Flask as a thin HTTP/UI adapter. Separate deterministic preprocessing from the stateful document/index repository so exact and partial retrieval can be independently understood and tested. Keep the existing browser workbench as the visual explanation of results and benchmarks.

**Tech Stack:** Python 3, Flask, NLTK PorterStemmer, vanilla HTML/CSS/JavaScript, unittest/pytest.

---

## File structure

- `search_engine.py` — persistent collection, inverted and N-gram indexes, retrieval and timing.
- `app.py` — Flask routes, request validation, and JSON error responses.
- `templates/index.html`, `static/app.js`, `static/style.css` — the Search, Library, and Comparison experience.
- `tests/test_engine.py` — algorithm, preprocessing, persistence, and benchmark tests.
- `tests/test_app.py` — HTTP/API integration tests.
- `README.md` — demo instructions and explicit Q1/Q2 coverage.

### Task 1: Lock in assignment-critical engine behavior

**Files:**
- Modify: `tests/test_engine.py`
- Modify: `search_engine.py`

- [ ] **Step 1: Add failing tests** for query-term frequency maps, exact-vs-partial result differences, duplicate-query normalization, and immediate retrieval after a new document is added.
- [ ] **Step 2: Run** `python -m pytest tests/test_engine.py -q` and confirm failures represent the missing/changed behavior.
- [ ] **Step 3: Implement only the required retrieval changes** in `search_engine.py`: normalized terms, safe n-gram candidate intersection, deterministic scores/order, and timing report fields.
- [ ] **Step 4: Run** `python -m pytest tests/test_engine.py -q` and confirm it passes.
- [ ] **Step 5: Commit** with `git commit -m "test: cover indexing assignment behavior"`.

### Task 2: Verify document-ingestion integration

**Files:**
- Modify: `tests/test_app.py`
- Modify: `app.py`
- Modify: `search_engine.py` (only if endpoint behavior needs support)

- [ ] **Step 1: Add failing API tests** for manual document insertion, UTF-8 multi-upload atomicity, automatic index updates, and comparison output for exact and partial queries.
- [ ] **Step 2: Run** `python -m pytest tests/test_app.py -q` and confirm expected failures.
- [ ] **Step 3: Implement the minimal Flask/error-handling behavior** to pass the new tests.
- [ ] **Step 4: Run** `python -m pytest tests/test_app.py -q` and confirm it passes.
- [ ] **Step 5: Commit** with `git commit -m "feat: harden document ingestion workflow"`.

### Task 3: Make the comparison demonstrable

**Files:**
- Modify: `templates/index.html`
- Modify: `static/app.js`
- Modify: `static/style.css`
- Modify: `tests/test_app.py`

- [ ] **Step 1: Add a failing HTML contract test** that asserts discoverable labels/components for exact search, partial N-gram search, frequency display, and timing comparison.
- [ ] **Step 2: Run** `python -m pytest tests/test_app.py -q` and confirm the contract fails for the absent element/label.
- [ ] **Step 3: Implement the smallest accessible UI improvements** needed to make both techniques, their timing, and per-term frequencies explicit in the workbench.
- [ ] **Step 4: Run** `python -m pytest tests/test_app.py -q` and confirm it passes.
- [ ] **Step 5: Commit** with `git commit -m "feat: clarify index comparison workbench"`.

### Task 4: Submit-ready documentation and verification

**Files:**
- Modify: `README.md`
- Modify: `.gitignore` (if data/runtime artifacts are missing)

- [ ] **Step 1: Update README** with install/run commands, a concise architecture diagram, example exact/partial queries, and a Q1/Q2 checklist.
- [ ] **Step 2: Run** `python -m pytest -q` and `python tests/browser_smoke.py` (when the optional browser CLI is installed).
- [ ] **Step 3: Run manual smoke checks** through Flask’s test client or the browser: add text, upload files, exact-search, partial-search, comparison view.
- [ ] **Step 4: Commit** with `git commit -m "docs: complete assignment submission guide"`.
- [ ] **Step 5: Create a public GitHub repository**, push the branch, and record the repository URL in the handoff.
