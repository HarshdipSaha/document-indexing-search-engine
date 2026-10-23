const $ = (selector) => document.querySelector(selector);
let currentQuery = '';
let searchVersion = 0;
let mutating = false;
const samples = [
  { title: '01 · Computer science', text: 'Computer science studies computers and computation. Computer systems use algorithms to process information. Computing connects mathematics and engineering.' },
  { title: '02 · Search engines', text: 'A search engine retrieves relevant documents. Search engines build an inverted index for fast keyword search. Document indexing stores term frequencies for ranking.' },
  { title: '03 · Text processing', text: 'Text processing includes tokenization, stop word removal and stemming. Running, runs and runner are related words. Processing documents improves information retrieval.' },
  { title: '04 · Partial word retrieval', text: 'Character n-grams support partial word search. Computer and computing share character sequences. A search index maps each sequence to candidate words.' }
];

function status(message, error = false) {
  $('#status').textContent = message;
  $('#status').classList.toggle('error', error);
}

async function api(url, options) {
  const response = await fetch(url, options);
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'The request failed. Please try again.');
  return data;
}

function element(tag, text, className) {
  const node = document.createElement(tag);
  node.textContent = text;
  if (className) node.className = className;
  return node;
}

async function refreshCollection() {
  const data = await api('/api/documents');
  $('#document-count').textContent = `${data.stats.documents} documents`;
  const list = $('#documents');
  list.replaceChildren();
  if (!data.documents.length) list.append(element('p', 'Add text or upload documents to begin.', 'muted'));
  for (const doc of data.documents) {
    const row = element('div', '', 'document-item');
    row.append(element('strong', doc.title), element('small', `${doc.text.length.toLocaleString()} characters`));
    list.append(row);
  }
  $('#load-samples').textContent = data.documents.length ? 'Add example documents' : 'Start with example documents';
}

function renderResults(selector, results) {
  const container = $(selector);
  container.replaceChildren();
  if (!results.length) {
    container.append(element('p', 'No matches. Try another term, a shorter fragment, or add a document.', 'empty'));
  }
  for (const result of results) {
    const card = element('article', '', 'result-card');
    card.append(element('h3', result.title), element('p', result.preview));
    for (const [term, count] of Object.entries(result.frequencies)) {
      card.append(element('span', `${term}: ${count}`, 'term'));
    }
    card.append(element('div', `Total frequency: ${result.score}`, 'score'));
    container.append(card);
  }
}

async function search(query) {
  const version = ++searchVersion;
  currentQuery = query;
  status('Searching both indexes…');
  try {
    const report = await api(`/api/search?q=${encodeURIComponent(query)}`);
    if (version !== searchVersion) return;
    for (const [mode, prefix] of [['inverted', 'exact'], ['ngram', 'partial']]) {
      const result = report[mode];
      $(`#${prefix}-count`).textContent = result.results.length;
      $(`#${prefix}-time`).textContent = `${result.time_ms.toFixed(4)} ms`;
      renderResults(`#${prefix}-results`, result.results);
    }
    $('#timing-label').textContent = `Median of ${report.repeats} warm runs`;
    status(`Compared both indexes for “${query}”. Term chips show processed query terms and their frequencies.`);
  } catch (error) {
    if (version === searchVersion) status(error.message, true);
  }
}

async function mutate(action, success) {
  if (mutating) return;
  mutating = true;
  const buttons = [...document.querySelectorAll('aside button')];
  buttons.forEach((button) => { button.disabled = true; });
  try {
    await action();
    await refreshCollection();
    if (currentQuery) await search(currentQuery);
    status(success);
  } catch (error) {
    status(error.message, true);
    // A multi-document operation can partially succeed on an I/O failure.
    await refreshCollection().catch(() => {});
  } finally {
    mutating = false;
    buttons.forEach((button) => { button.disabled = false; });
  }
}

function addDocument(doc) {
  return api('/api/documents', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(doc)
  });
}

$('#search-form').addEventListener('submit', (event) => {
  event.preventDefault();
  search($('#query').value.trim());
});

for (const button of document.querySelectorAll('[data-query]')) {
  button.addEventListener('click', () => {
    $('#query').value = button.dataset.query;
    search(button.dataset.query);
  });
}

$('#add-form').addEventListener('submit', (event) => {
  event.preventDefault();
  mutate(async () => {
    await addDocument({ title: $('#title').value, text: $('#text').value });
    event.target.reset();
  }, 'Document added. Both indexes are up to date.');
});

$('#upload-form').addEventListener('submit', (event) => {
  event.preventDefault();
  mutate(async () => {
    await api('/api/upload', { method: 'POST', body: new FormData(event.target) });
    event.target.reset();
  }, 'Documents uploaded. Both indexes are up to date.');
});

$('#load-samples').addEventListener('click', () => {
  mutate(async () => {
    const { documents } = await api('/api/documents');
    const titles = new Set(documents.map((doc) => doc.title));
    for (const doc of samples) {
      if (!titles.has(doc.title)) await addDocument(doc);
    }
  }, 'Example collection ready. Try “computer”, then “compu” to compare.');
});

refreshCollection().catch((error) => status(error.message, true));
