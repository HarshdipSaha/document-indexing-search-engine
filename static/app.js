const $ = (selector) => document.querySelector(selector);
const shell = $('#app-shell');
let documents = [];
let history = [];
let currentQuery = '';
let selectedDocumentId = null;
let activeHistoryId = null;
let searchVersion = 0;
let mutating = false;
const samples = [
  { title: '01 · Computer science', text: 'Computer science studies computers and computation. Computer systems use algorithms to process information. Computing connects mathematics and engineering.' },
  { title: '02 · Search engines', text: 'A search engine retrieves relevant documents. Search engines build an inverted index for fast keyword search. Document indexing stores term frequencies for ranking.' },
  { title: '03 · Text processing', text: 'Text processing includes tokenization, stop word removal and stemming. Running, runs and runner are related words. Processing documents improves information retrieval.' },
  { title: '04 · Partial word retrieval', text: 'Character n-grams support partial word search. Computer and computing share character sequences. A search index maps each sequence to candidate words.' }
];

function status(message, error = false) {
  for (const selector of ['#status', '#dialog-status']) {
    $(selector).textContent = message;
    $(selector).classList.toggle('error', error);
  }
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

function isPanelOpen(panel) {
  const breakpoint = panel === 'sidebar' ? 760 : 1100;
  return window.innerWidth <= breakpoint
    ? shell.classList.contains(`${panel}-open`)
    : !shell.classList.contains(`${panel}-collapsed`);
}

function overlayPanel() {
  if (window.innerWidth <= 760 && isPanelOpen('sidebar')) return 'sidebar';
  if (window.innerWidth <= 1100 && isPanelOpen('knowledge')) return 'knowledge';
  return null;
}

function updatePanels() {
  const overlay = overlayPanel();
  for (const panel of ['sidebar', 'knowledge']) {
    $(`#toggle-${panel}`).setAttribute('aria-expanded', String(isPanelOpen(panel)));
    const target = panel === 'sidebar' ? $('#sidebar') : $('#knowledge-panel');
    target.inert = !isPanelOpen(panel) || Boolean(overlay && overlay !== panel);
  }
  $('.workspace').inert = Boolean(overlay);
  $('#panel-backdrop').hidden = !overlay;
}

function setPanel(panel, open) {
  const breakpoint = panel === 'sidebar' ? 760 : 1100;
  if (window.innerWidth <= breakpoint) {
    shell.classList.toggle(`${panel}-open`, open);
    if (open) shell.classList.remove(`${panel === 'sidebar' ? 'knowledge' : 'sidebar'}-open`);
  } else {
    shell.classList.toggle(`${panel}-collapsed`, !open);
  }
  updatePanels();
  const target = panel === 'sidebar' ? $('#sidebar') : $('#knowledge-panel');
  if (open && window.innerWidth <= breakpoint) {
    target.querySelector('button, a[href]').focus({ preventScroll: true });
  } else if (!open && target.contains(document.activeElement)) {
    $(`#toggle-${panel}`).focus({ preventScroll: true });
  }
}

function closePanels() {
  shell.classList.remove('sidebar-open', 'knowledge-open');
  updatePanels();
}

function showFiles() {
  selectedDocumentId = null;
  $('#knowledge-overview').hidden = false;
  $('#document-viewer').hidden = true;
  for (const button of document.querySelectorAll('.document-item')) {
    button.classList.remove('selected');
  }
}

function openDocument(id) {
  const doc = documents.find((item) => item.id === id);
  if (!doc) return;
  selectedDocumentId = id;
  $('#document-title').textContent = doc.title;
  $('#document-content').textContent = doc.text;
  $('#document-meta').textContent = `${doc.text.length.toLocaleString()} characters · Indexed and searchable`;
  $('#knowledge-overview').hidden = true;
  $('#document-viewer').hidden = false;
  setPanel('knowledge', true);
  $('#knowledge-panel .knowledge-scroll').scrollTop = 0;
  $('#back-to-files').focus({ preventScroll: true });
}

function fileButton(doc, className) {
  const button = element('button', '', className);
  button.type = 'button';
  button.setAttribute('aria-label', `Open ${doc.title}`);
  const copy = element('span', '', 'file-copy');
  copy.append(element('strong', doc.title),
    element('span', `${doc.text.length.toLocaleString()} characters · Text`));
  button.append(element('span', 'T', 'file-symbol'), copy);
  button.addEventListener('click', () => openDocument(doc.id));
  return button;
}

async function refreshCollection() {
  const data = await api('/api/documents');
  documents = data.documents;
  const count = documents.length;
  $('#document-count').textContent = count;
  $('#header-file-count').textContent = count;
  $('#project-stats').textContent = `${count} ${count === 1 ? 'document' : 'documents'} indexed`;
  for (const [id, key] of [['stem-count', 'stems'], ['word-count', 'words'], ['gram-count', 'grams']]) {
    $(`#${id}`).textContent = data.stats[key].toLocaleString();
  }
  $('#documents').replaceChildren();
  $('#home-files').replaceChildren();
  $('#getting-started').hidden = count > 0;
  $('#home-files').hidden = count === 0;
  if (!count) {
    $('#documents').append(element('p', 'No files yet. Add a source to start building your project.', 'empty-files'));
  }
  for (const doc of documents) {
    $('#documents').append(fileButton(doc, 'document-item'));
  }
  for (const doc of documents.slice(0, 3)) {
    $('#home-files').append(fileButton(doc, 'file-card'));
  }
  if (count > 3) {
    const more = element('button', `View all ${count} files →`, 'view-all-files');
    more.addEventListener('click', () => {
      showFiles();
      setPanel('knowledge', true);
      $('#knowledge-panel [data-open-add]').focus({ preventScroll: true });
    });
    $('#home-files').append(more);
  }
  if (selectedDocumentId) openDocument(selectedDocumentId);
}

function renderHistory() {
  const container = $('#search-history');
  const restoreFocus = container.contains(document.activeElement);
  container.replaceChildren();
  if (!history.length) container.append(element('p', 'Your searches will appear here.', 'sidebar-empty'));
  for (const entry of history) {
    const button = element('button', entry.query, 'history-item');
    button.title = entry.query;
    if (entry.id === activeHistoryId) button.setAttribute('aria-current', 'true');
    button.addEventListener('click', () => {
      search(entry.query);
      if (window.innerWidth <= 760) setPanel('sidebar', false);
    });
    container.append(button);
  }
  if (restoreFocus && !$('#sidebar').inert) {
    container.querySelector('[aria-current="true"]')?.focus({ preventScroll: true });
  }
}

function renderResults(selector, results) {
  const container = $(selector);
  container.replaceChildren();
  if (!results.length) {
    container.append(element('p', 'No documents match this index. Try another term or a shorter fragment.', 'empty-results'));
  }
  for (const result of results) {
    const card = element('article', '', 'result-card');
    const heading = element('h4', '');
    const source = element('button', result.title, 'source-link');
    source.addEventListener('click', () => openDocument(result.id));
    heading.append(source);
    card.append(heading, element('p', result.preview, 'result-preview'));
    const frequencies = element('div', '', 'term-list');
    for (const [term, count] of Object.entries(result.frequencies)) {
      frequencies.append(element('span', `${term}: ${count}`, 'term'));
    }
    card.append(frequencies, element('span', `Total frequency ${result.score}`, 'score'));
    container.append(card);
  }
}

function renderReport(report) {
  for (const [mode, prefix] of [['inverted', 'exact'], ['ngram', 'partial']]) {
    const result = report[mode];
    $(`#${prefix}-count`).textContent = result.results.length;
    $(`#${prefix}-time`).textContent = `${result.time_ms.toFixed(4)} ms`;
    renderResults(`#${prefix}-results`, result.results);
  }
  const unique = new Set([...report.inverted.results, ...report.ngram.results].map((row) => row.id));
  $('#result-summary').textContent = unique.size
    ? `Found ${unique.size} matching ${unique.size === 1 ? 'source' : 'sources'} in your project. Here’s how each index sees your query.`
    : 'No matching sources this time. Try a shorter fragment, a different keyword, or add more project content.';
  $('#timing-label').textContent = `${report.repeats} warm runs`;
  $('.search-response').hidden = false;
}

async function search(query, { refresh = false } = {}) {
  query = query.trim();
  if (!query) {
    $('#query').focus();
    return false;
  }
  const version = ++searchVersion;
  const submittedDraft = $('#query').value;
  currentQuery = query;
  $('#project-home').hidden = true;
  $('#conversation').hidden = false;
  $('#query-message').textContent = query;
  $('.search-response').hidden = true;
  $('#search-form').setAttribute('aria-busy', 'true');
  $('#search-submit').disabled = true;
  status('Searching your project with both indexes…');
  try {
    const report = await api(`/api/search?q=${encodeURIComponent(query)}`);
    if (version !== searchVersion) return false;
    let entry = history.find((item) => item.query === query);
    if (!entry) entry = { id: String(version), query };
    history = [entry, ...history.filter((item) => item.id !== entry.id)].slice(0, 20);
    activeHistoryId = entry.id;
    renderHistory();
    renderReport(report);
    if (!refresh && $('#query').value === submittedDraft && submittedDraft.trim() === query) {
      $('#query').value = '';
    }
    if (!refresh) $('#workspace-scroll').scrollTop = 0;
    status(`Compared both indexes for “${query}”. Open a source to read it.`);
    return true;
  } catch (error) {
    if (version === searchVersion) {
      if (!refresh && $('#query').value === submittedDraft && !submittedDraft.trim()) {
        $('#query').value = query;
      }
      status(error.message, true);
    }
    return false;
  } finally {
    if (version === searchVersion) {
      $('#search-submit').disabled = false;
      $('#search-form').setAttribute('aria-busy', 'false');
    }
  }
}

function newSearch() {
  searchVersion += 1;
  currentQuery = '';
  activeHistoryId = null;
  $('#project-home').hidden = false;
  $('#conversation').hidden = true;
  $('#query').value = '';
  $('#search-submit').disabled = false;
  $('#search-form').setAttribute('aria-busy', 'false');
  $('#workspace-scroll').scrollTop = 0;
  renderHistory();
  if (window.innerWidth <= 760) setPanel('sidebar', false);
  status('Search your project. Exact keywords and partial words are both welcome.');
  $('#query').focus();
}

async function mutate(action, success) {
  if (mutating) return;
  mutating = true;
  const buttons = [...document.querySelectorAll('[data-mutation], #load-samples, #add-dialog input, #add-dialog textarea')];
  buttons.forEach((button) => { button.disabled = true; });
  status('Adding sources and updating both indexes…');
  try {
    await action();
    await refreshCollection();
    // Refresh the active query without creating a duplicate recent-search entry.
    const refreshed = !currentQuery || await search(currentQuery, { refresh: true });
    $('#add-dialog').close();
    if (refreshed) status(success);
  } catch (error) {
    status(error.message, true);
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

for (const button of document.querySelectorAll('[data-open-add]')) {
  button.addEventListener('click', () => {
    $('#dialog-status').textContent = '';
    $('#add-dialog').showModal();
  });
}
$('#close-add-dialog').addEventListener('click', () => $('#add-dialog').close());
$('#toggle-sidebar').addEventListener('click', () => setPanel('sidebar', !isPanelOpen('sidebar')));
$('#toggle-knowledge').addEventListener('click', () => setPanel('knowledge', !isPanelOpen('knowledge')));
$('#close-sidebar').addEventListener('click', () => { setPanel('sidebar', false); $('#toggle-sidebar').focus(); });
$('#close-knowledge').addEventListener('click', () => { setPanel('knowledge', false); $('#toggle-knowledge').focus(); });
$('#back-to-files').addEventListener('click', () => { showFiles(); $('#knowledge-panel [data-open-add]').focus(); });
$('#panel-backdrop').addEventListener('click', () => { closePanels(); $('#query').focus(); });
$('#new-search').addEventListener('click', newSearch);
$('#project-link').addEventListener('click', newSearch);
window.addEventListener('resize', updatePanels);
document.addEventListener('keydown', (event) => {
  if ($('#add-dialog').open) return;
  const overlay = overlayPanel();
  if (event.key === 'Tab' && overlay) {
    const target = overlay === 'sidebar' ? $('#sidebar') : $('#knowledge-panel');
    const controls = [...target.querySelectorAll('button:not([disabled]), a[href], summary')]
      .filter((node) => node.getClientRects().length > 0);
    const first = controls[0];
    const last = controls[controls.length - 1];
    if (event.shiftKey && (document.activeElement === first || !target.contains(document.activeElement))) {
      event.preventDefault();
      last?.focus();
    } else if (!event.shiftKey && (document.activeElement === last || !target.contains(document.activeElement))) {
      event.preventDefault();
      first?.focus();
    }
  }
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
    event.preventDefault();
    newSearch();
  }
  if (event.key === 'Escape') {
    closePanels();
    $('#query').focus();
  }
});

$('#search-form').addEventListener('submit', (event) => {
  event.preventDefault();
  search($('#query').value);
});
$('#query').addEventListener('keydown', (event) => {
  if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) {
    event.preventDefault();
    if (!$('#search-submit').disabled) $('#search-form').requestSubmit();
  }
});
for (const button of document.querySelectorAll('[data-query]')) {
  button.addEventListener('click', () => search(button.dataset.query));
}
$('#add-form').addEventListener('submit', (event) => {
  event.preventDefault();
  const doc = { title: $('#title').value, text: $('#text').value };
  mutate(async () => {
    await addDocument(doc);
    event.target.reset();
  }, 'Document added. Both indexes are up to date.');
});
$('#upload-form').addEventListener('submit', (event) => {
  event.preventDefault();
  const files = new FormData(event.target);
  mutate(async () => {
    await api('/api/upload', { method: 'POST', body: files });
    event.target.reset();
  }, 'Documents uploaded. Both indexes are up to date.');
});
$('#load-samples').addEventListener('click', () => {
  mutate(async () => {
    const data = await api('/api/documents');
    const titles = new Set(data.documents.map((doc) => doc.title));
    for (const doc of samples) {
      if (!titles.has(doc.title)) await addDocument(doc);
    }
  }, 'Example collection ready. Try “computer”, then “compu” to compare.');
});

updatePanels();
refreshCollection().catch((error) => status(error.message, true));
