"""Run with: .venv/bin/python app.py"""

import os
import tempfile
from pathlib import Path
from urllib.parse import urlsplit

from flask import Flask, jsonify, render_template, request
from werkzeug.exceptions import RequestEntityTooLarge
from werkzeug.middleware.proxy_fix import ProxyFix

from search_engine import SearchEngine


def create_app(storage_path=None):
    root_dir = Path(__file__).resolve().parent
    app = Flask(
        __name__,
        template_folder=str(root_dir / 'templates'),
        static_folder=str(root_dir / 'static')
    )
    app.wsgi_app = ProxyFix(app.wsgi_app, x_for=1, x_proto=1, x_host=1, x_port=1, x_prefix=1)
    app.config['MAX_CONTENT_LENGTH'] = 5 * 1024 * 1024

    if storage_path is None:
        env_path = os.environ.get('DOCUMENT_STORE_PATH')
        if env_path:
            storage_path = Path(env_path)
        elif os.environ.get('VERCEL') or os.environ.get('AWS_LAMBDA_FUNCTION_NAME') or os.environ.get('SERVERLESS'):
            storage_path = Path(tempfile.gettempdir()) / 'documents.json'
        else:
            storage_path = root_dir / 'data' / 'documents.json'

    engine = SearchEngine(storage_path)

    @app.before_request
    def reject_cross_origin_writes():
        if request.method not in ('POST', 'PUT', 'PATCH', 'DELETE'):
            return None
        origin = request.headers.get('Origin')
        expected = urlsplit(request.host_url)
        actual = urlsplit(origin) if origin else None
        forwarded_proto = request.headers.get('X-Forwarded-Proto')
        if forwarded_proto and actual:
            expected = expected._replace(scheme=forwarded_proto)
        if (request.headers.get('Sec-Fetch-Site') == 'cross-site'
                or (actual and (actual.scheme, actual.netloc) != (expected.scheme, expected.netloc))):
            return jsonify(error='Cross-origin document changes are not allowed.'), 403
        return None

    @app.errorhandler(ValueError)
    def invalid_input(error):
        return jsonify(error=str(error)), 400

    @app.errorhandler(RequestEntityTooLarge)
    def too_large(error):
        return jsonify(error='Request exceeds the 5 MB upload limit.'), 413

    @app.get('/')
    def home():
        return render_template('index.html')

    @app.get('/api/documents')
    def documents():
        return jsonify(documents=engine.list_documents(), stats=engine.stats())

    @app.post('/api/documents')
    def add_document():
        data = request.get_json(silent=True)
        if not isinstance(data, dict):
            raise ValueError('Send a JSON object with title and text.')
        doc = engine.add_document(data.get('title'), data.get('text'))
        return jsonify(document=doc, index_stats=engine.stats()), 201

    @app.post('/api/upload')
    def upload():
        files = request.files.getlist('files')
        if not files or len(files) > 30:
            raise ValueError('Select between 1 and 30 UTF-8 .txt files.')
        pending = []
        # Validate the entire upload before adding any document.
        for file in files:
            name = (file.filename or '').replace('\\', '/').rsplit('/', 1)[-1]
            if not name.lower().endswith('.txt'):
                raise ValueError('Only .txt files are supported.')
            try:
                text = file.read().decode('utf-8-sig')
            except UnicodeDecodeError as error:
                raise ValueError(f'{name} is not valid UTF-8 text.') from error
            if not text.strip():
                raise ValueError(f'{name} is empty.')
            pending.append((name, text))
        added = [engine.add_document(name, text) for name, text in pending]
        return jsonify(documents=added, index_stats=engine.stats()), 201

    @app.get('/api/search')
    def search():
        query = request.args.get('q', '')
        if len(query) > 500:
            raise ValueError('Use a query of at most 500 characters.')
        with engine.lock:
            report = engine.compare(query)
            report['collection_ids'] = sorted(engine.documents)
        return jsonify(report)

    return app


app = create_app()


if __name__ == '__main__':
    app.run(host='127.0.0.1', port=5000, debug=False)
