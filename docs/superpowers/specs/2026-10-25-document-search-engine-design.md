# Document Search Engine Design

## Goal

Deliver one local web application that satisfies both assignments: users can add or upload text documents, search exact keywords through an inverted index, search word fragments through an N-gram index, and directly compare results and timings.

## Options considered

1. Keep a single large engine and add UI copy. This is fastest but makes the two indexing techniques harder to inspect and test.
2. Use a small layered Flask design (recommended): a preprocessing module supplies stable tokens/stems, an engine owns persisted documents and both indexes, and Flask exposes a narrow JSON API to the workbench.
3. Add an external search platform. This would exceed the assignment and make indexing less demonstrable.

## Architecture

`SearchEngine` persists a document collection as JSON and rebuilds its two in-memory indexes at startup. It owns document validation, atomic writes, exact/partial retrieval, scoring, and benchmark measurement. The Flask app is an HTTP adapter only: it validates request shape, handles upload limits, and returns JSON. The browser renders results, per-term frequencies, and the comparison table from that API.

### Retrieval pipeline

1. Preprocess text: lowercase tokenization, English stop-word removal, Porter stemming.
2. Build the inverted index as `stem -> {document_id: frequency}` for exact keyword retrieval.
3. Build the N-gram index as `character gram -> words` plus raw-word postings for substring retrieval.
4. For each query, deduplicate query terms, collect document postings, total term frequencies into a score, and order predictably.
5. Benchmark each method repeatedly using a monotonic clock and show median milliseconds alongside the result sets.

## User experience

The existing retrieval workbench stays as the presentation layer, with three clear views: Search (mode switch and matched documents), Library (manual entry and multi-file upload), and Comparison (result-count/timing table plus document coverage). The UI labels the algorithms and preprocessing so the assignment requirements are visible during a demo.

## Error handling and safety

The app accepts only non-empty UTF-8 `.txt` uploads, limits upload quantity and size, rejects malformed JSON, and makes uploads atomic: no valid file is stored when another file in the batch fails validation. JSON persistence is written to a temporary file then replaced. Cross-origin mutating requests are denied.

## Testing and acceptance criteria

- Unit tests prove tokenization, stop-word removal, stemming, indexing, ranking, partial matching, persistence, and timing reports.
- API tests prove document addition, batch uploads, automatic index updates, invalid-input responses, and both technique results.
- The browser smoke test exercises Search, Library, and Comparison workflows.
- README includes setup, API/use instructions, algorithms, and a requirement-to-feature checklist for Q1 and Q2.
