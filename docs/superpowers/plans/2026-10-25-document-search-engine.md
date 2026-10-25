# Document Search Engine Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Polish the retrieval workbench into a clearly structured, fully tested submission that demonstrates both document-indexing assignments.

**Architecture:** Preserve Flask as a thin HTTP/UI adapter. Separate deterministic preprocessing from the stateful document/index repository so exact and partial retrieval can be independently understood and tested. Keep the existing browser workbench as the visual explanation of results and benchmarks.

**Tech Stack:** Python 3, Flask, NLTK PorterStemmer, vanilla HTML/CSS/JavaScript, unittest/pytest.

---

## File structure

- `preprocessing.py` — deterministic tokenization, stop-word removal, stemming, and N-gram generation.
- `search_engine.py` — persistent collection, inverted and N-gram indexes, retrieval and timing.
- `app.py` — Flask routes, request validation, and JSON error responses.
- `templates/index.html`, `static/app.js`, `static/style.css` — the Search, Library, and Comparison experience.
- `tests/test_engine.py` — algorithm, preprocessing, persistence, and benchmark tests.
- `tests/test_app.py` — HTTP/API integration tests.
- `README.md` — demo instructions and explicit Q1/Q2 coverage.

### Task 1: Extract the preprocessing boundary

**Files:**
- Create: `tests/test_preprocessing.py`
- Create: `preprocessing.py`
- Modify: `search_engine.py`

- [ ] **Step 1: Write a failing import-level test**: `from preprocessing import preprocess, tokenize, grams`; assert `preprocess('The runners were RUNNING, and cats!') == ['runner', 'run', 'cat']` and `grams('index', 3) == {'ind', 'nde', 'dex'}`.
- [ ] **Step 2: Run** `python -m unittest tests.test_preprocessing -v` and confirm it fails because `preprocessing` does not exist.
- [ ] **Step 3: Create `preprocessing.py`** with the current stable stop-word collection, `tokenize`, `preprocess`, and `grams`; change `search_engine.py` to import these public helpers and remove its duplicate definitions.
- [ ] **Step 4: Run** `python -m unittest discover -s tests -p "test_*.py" -v` and confirm the module test and existing engine/API tests pass.
- [ ] **Step 5: Commit** with `git commit -m "refactor: isolate text preprocessing"`.

### Task 2: Verify document-ingestion integration

**Files:**
- Modify: `tests/test_app.py`
- Modify: `app.py`
- Modify: `search_engine.py` (only if endpoint behavior needs support)

- [ ] **Step 1: Add a failing API test** that posts a document and asserts the `201` response contains `document`, `index_stats`, and `index_stats['documents'] == 1`; also assert an immediately-following `/api/search?q=algorithms` report contains the new document in the inverted result set with `{'algorithm': 2}`.
- [ ] **Step 2: Run** `python -m unittest tests.test_app.AppTests.test_add_document_reports_updated_index_stats -v` and confirm it fails because the endpoint does not yet return `index_stats`.
- [ ] **Step 3: Implement the minimal endpoint adjustment** required by that test, without changing the upload atomicity behavior already protected by regression tests.
- [ ] **Step 4: Run** `python -m unittest discover -s tests -p "test_*.py" -v` and confirm all API and engine tests pass.
- [ ] **Step 5: Commit** with `git commit -m "feat: expose indexed document feedback"`.

### Task 3: Make the comparison demonstrable

**Files:**
- Modify: `templates/index.html`
- Modify: `static/app.js`
- Modify: `static/style.css`
- Modify: `tests/test_app.py`

- [ ] **Step 1: Add a failing browser-smoke assertion** after a partial `compu` search: an `aria-live` search summary contains both the exact and N-gram result counts and their measured milliseconds.
- [ ] **Step 2: Run** `python tests/browser_smoke.py` and confirm it fails due to the missing accessible comparison summary (skip only if `agent-browser` is unavailable, documenting the command failure).
- [ ] **Step 3: Implement the smallest accessible UI improvement** needed to expose that one-line exact/partial timing summary while retaining the existing detailed Search/Comparison views.
- [ ] **Step 4: Run** `python tests/browser_smoke.py` and `python -m unittest discover -s tests -p "test_*.py" -v` and confirm both pass.
- [ ] **Step 5: Commit** with `git commit -m "feat: clarify index comparison workbench"`.

### Task 4: Submit-ready documentation and verification

**Files:**
- Modify: `README.md`
- Modify: `.gitignore` (if data/runtime artifacts are missing)

- [ ] **Step 1: Update README** with install/run commands, a concise architecture diagram, example exact/partial queries, and a Q1/Q2 checklist.
- [ ] **Step 2: Run** `python -m unittest discover -s tests -p "test_*.py" -v` and `python tests/browser_smoke.py` (when the optional browser CLI is installed).
- [ ] **Step 3: Run manual smoke checks** through Flask’s test client or the browser: add text, upload files, exact-search, partial-search, comparison view.
- [ ] **Step 4: Commit** with `git commit -m "docs: complete assignment submission guide"`.
- [ ] **Step 5: Create a public GitHub repository and push the branch**, as explicitly authorized by the requester; record the repository URL in the handoff.
