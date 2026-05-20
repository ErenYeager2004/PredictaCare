"""
app.py — RAG microservice
Exposes /retrieve for Node.js to call during chat requests.
Run: python app.py
"""

import sys
import os
from groq import Groq
from dotenv import load_dotenv
load_dotenv()
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

groq_client = Groq(
    api_key=os.getenv("GROQ_API_KEY")
)

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

@app.route("/rag-health-suggestions", methods=["POST"])
def rag_health_suggestions():

    data = request.get_json()

    disease = data.get("disease", "")
    risk = data.get("risk", "")
    probability = data.get("probability", 0)
    user_inputs = data.get("userInputs", {})

    if retriever is None:
        return jsonify({
            "reply": "RAG system unavailable currently."
        }), 200

    try:

        # ──────────────────────────────────────────────────────────────────
        # Build retrieval query
        # ──────────────────────────────────────────────────────────────────

        query = f"""
        Disease: {disease}

        Risk Level: {risk}

        User Inputs:
        {user_inputs}

        Give:
        - diet recommendations
        - exercise recommendations
        - lifestyle changes
        - warning signs
        - monitoring advice
        """

        # ──────────────────────────────────────────────────────────────────
        # Retrieve RAG context
        # ──────────────────────────────────────────────────────────────────

        retrieved_context = retriever.retrieve(query)

        # ──────────────────────────────────────────────────────────────────
        # Final AI prompt
        # ──────────────────────────────────────────────────────────────────

        prompt = f"""
You are PredictaCare AI Health Assistant.

Use ONLY the provided medical context.

================ MEDICAL CONTEXT ================

{retrieved_context}

=================================================

PATIENT DETAILS:

Disease: {disease}

Risk Level: {risk}

Probability: {probability}%

User Inputs:
{user_inputs}

Generate a personalised health plan in markdown format.

Required sections:

## Summary

## Immediate Actions

## Daily Lifestyle Changes

## Diet & Nutrition

## Exercise Recommendations

## Stress & Mental Wellness

## When to See a Doctor

## Monitoring & Tracking

Rules:
- Keep language simple
- Be medically grounded
- Tailor advice specifically to the disease
- Never prescribe medicines
- Never mention medication dosages
- HIGH risk should sound more urgent
- LOW risk should focus on prevention
- Use markdown formatting
- Use bullet points when appropriate
"""

        completion = groq_client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            temperature=0.3,
            max_tokens=1200,
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You are PredictaCare AI Health Assistant. "
                        "Never hallucinate medical information."
                    ),
                },
                {
                    "role": "user",
                    "content": prompt,
                },
            ],
        )

        reply = completion.choices[0].message.content

        return jsonify({
            "reply": reply
        })

    except Exception as e:

        print(f"[ERROR] RAG suggestion failed: {e}")

        return jsonify({
            "reply": "Failed to generate suggestions.",
            "error": str(e)
        }), 200

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
