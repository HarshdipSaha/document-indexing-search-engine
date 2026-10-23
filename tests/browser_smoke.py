"""Optional real-browser regression test. Requires the agent-browser CLI."""

import subprocess
import sys
import tempfile
import threading
from pathlib import Path

from werkzeug.serving import make_server

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from app import create_app


def run():
    with tempfile.TemporaryDirectory() as directory:
        root = Path(directory)
        server = make_server('127.0.0.1', 0, create_app(root / 'documents.json'), threaded=True)
        thread = threading.Thread(target=server.serve_forever, daemon=True)
        thread.start()
        session = 'index-lab-' + root.name

        def browser(*args):
            result = subprocess.run(['agent-browser', '--session', session, *args],
                                    capture_output=True, text=True, timeout=30)
            if result.returncode:
                raise AssertionError(result.stdout + result.stderr)
            return result.stdout.strip()

        def check(expression):
            browser('eval', f'(() => {{ if (!({expression})) throw new Error("Browser assertion failed"); return "PASS"; }})()')

        try:
            browser('open', f'http://127.0.0.1:{server.server_port}')
            browser('set', 'viewport', '1440', '1000')
            browser('snapshot', '-i')
            browser('wait', '--text', 'No files yet.')
            check('!document.querySelector("#project-home").hidden')
            check('document.querySelector("#conversation").hidden')
            browser('eval', 'document.querySelector("#load-samples").scrollIntoView({block:"center"})')
            browser('click', '#load-samples')
            browser('wait', '--text', 'Example collection ready')
            check('document.querySelectorAll(".document-item").length === 4')
            check('document.querySelectorAll(".file-card").length === 3')

            browser('click', '[data-query="compu"]')
            browser('wait', '--text', 'Compared both indexes')
            check('document.querySelector("#exact-count").textContent === "0"')
            check('document.querySelector("#partial-count").textContent === "2"')
            check('document.querySelectorAll(".history-item").length === 1')
            browser('click', '#partial-results .source-link')
            check('!document.querySelector("#document-viewer").hidden')
            check('document.querySelector("#document-content").textContent.includes("Computer science")')
            browser('click', '#back-to-files')

            browser('fill', '#query', 'An unfinished draft')
            browser('click', '.attach-button')
            browser('fill', '#title', 'New source')
            browser('fill', '#text', 'Computers computers. <img src=x onerror=alert(1)>')
            browser('click', '#add-form button')
            browser('wait', '--text', 'Document added.')
            check('!document.querySelector("#add-dialog").open')
            check('document.querySelector("#partial-count").textContent === "3"')
            check('document.querySelector("#query").value === "An unfinished draft"')
            check('document.querySelectorAll(".history-item").length === 1')
            browser('eval', '[...document.querySelectorAll("#partial-results .source-link")].find(node => node.textContent === "New source").click()')
            check('document.querySelector("#document-content").textContent.includes("<img")')
            check('document.querySelector("#document-content img") === null')
            browser('click', '#back-to-files')

            upload = root / 'notes.txt'
            upload.write_text('Search engine retrieval notes', encoding='utf-8')
            browser('click', '.attach-button')
            browser('upload', '#files', str(upload))
            browser('click', '#upload-form button')
            browser('wait', '--text', 'Documents uploaded.')
            check('document.querySelectorAll(".document-item").length === 6')

            invalid = root / 'bad.txt'
            invalid.write_bytes(b'\xff')
            browser('click', '.attach-button')
            browser('upload', '#files', str(invalid))
            browser('click', '#upload-form button')
            browser('wait', '--text', 'not valid UTF-8')
            check('document.querySelector("#add-dialog").open')
            check('document.querySelectorAll(".document-item").length === 6')
            browser('press', 'Escape')

            browser('fill', '#query', 'computer')
            browser('press', 'Enter')
            browser('wait', '--text', 'Compared both indexes for “computer”')
            check('document.querySelectorAll(".history-item").length === 2')
            browser('click', '#search-history button:last-child')
            browser('wait', '--text', 'Compared both indexes for “compu”')
            browser('click', '#new-search')
            check('!document.querySelector("#project-home").hidden')
            check('document.querySelectorAll(".history-item").length === 2')
            check('document.activeElement.id === "query"')

            browser('eval', 'window.originalFetch = window.fetch; window.fetch = (...args) => window.originalFetch(...args).then(response => new Promise(resolve => setTimeout(() => resolve(response), 700)))')
            browser('fill', '#query', 'indexing')
            browser('eval', 'document.querySelector("#search-form").requestSubmit()')
            browser('fill', '#query', 'My next query draft')
            browser('wait', '--text', 'Compared both indexes for “indexing”')
            check('document.querySelector("#query").value === "My next query draft"')
            browser('eval', 'window.fetch = window.originalFetch')
            browser('click', '#new-search')

            browser('set', 'viewport', '390', '844')
            check('document.documentElement.scrollWidth <= innerWidth')
            browser('click', '#toggle-sidebar')
            check('document.querySelector("#toggle-sidebar").getAttribute("aria-expanded") === "true"')
            check('document.querySelector(".workspace").inert')
            check('document.querySelector("#sidebar").contains(document.activeElement)')
            browser('click', '#new-search')
            check('document.querySelector("#toggle-sidebar").getAttribute("aria-expanded") === "false"')
            browser('eval', 'document.querySelector(".file-card").scrollIntoView({block:"center"})')
            browser('click', '.file-card')
            check('document.querySelector("#toggle-knowledge").getAttribute("aria-expanded") === "true"')
            check('document.documentElement.scrollWidth <= innerWidth')
            browser('click', '#close-knowledge')
            check('document.querySelector("#toggle-knowledge").getAttribute("aria-expanded") === "false"')
            errors = browser('errors')
            assert not errors, errors
            print('Browser smoke passed: files, search, history, viewer, safe rendering, uploads, errors and mobile panels.')
        finally:
            browser('close')
            server.shutdown()
            thread.join(timeout=5)


if __name__ == '__main__':
    run()
