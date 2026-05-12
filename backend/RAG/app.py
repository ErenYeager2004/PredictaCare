"""
app.py — RAG microservice
Exposes /retrieve for Node.js to call during chat requests.
Run: python app.py
"""

import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from flask import Flask, request, jsonify
from flask_cors import CORS
from src.retriever import Retriever

app = Flask(__name__)
CORS(app)

# Load FAISS store once on startup
FAISS_STORE_DIR = "faiss_store"
EMBEDDING_MODEL = "all-MiniLM-L6-v2"

retriever = None

def init_retriever():
    global retriever
    try:
        retriever = Retriever(
            persist_dir=FAISS_STORE_DIR,
            embedding_model=EMBEDDING_MODEL,
            top_k=4,
        )
        print("[OK] Retriever initialized successfully.")
    except Exception as e:
        print(f"[ERROR] Failed to load FAISS store: {e}")
        print("[HINT] Did you run 'python ingest.py' first?")
        retriever = None


# ── POST /retrieve ─────────────────────────────────────────────────────────────
@app.route("/retrieve", methods=["POST"])
def retrieve():
    data = request.get_json()

    if not data or "query" not in data:
        return jsonify({ "error": "Missing 'query' in request body" }), 400

    query = data["query"].strip()
    if not query:
        return jsonify({ "error": "Query cannot be empty" }), 400

    if retriever is None:
        return jsonify({ "context": "", "warning": "RAG not available" }), 200

    try:
        context = retriever.retrieve(query)
        return jsonify({ "context": context })
    except Exception as e:
        print(f"[ERROR] Retrieval failed: {e}")
        return jsonify({ "context": "", "error": str(e) }), 200
        # Note: returning 200 so Node.js chat still works even if RAG fails


# ── GET /health ────────────────────────────────────────────────────────────────
@app.route("/health", methods=["GET"])
def health():
    return jsonify({
        "status": "ok",
        "rag_ready": retriever is not None,
    })


if __name__ == "__main__":
    init_retriever()
    app.run(host="0.0.0.0", port=5001, debug=False)
