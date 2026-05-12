
import os
import sys

from src.data_loader import load_all_documents
from src.vectorStore import FaissVectorStore




BASE_DIR = os.path.dirname(os.path.abspath(__file__))

DATA_DIR = os.path.join(BASE_DIR, "data")

FAISS_STORE_DIR = os.path.join(
    BASE_DIR,
    "faiss_store"
)


EMBEDDING_MODEL = "all-MiniLM-L6-v2"

CHUNK_SIZE = 1000
CHUNK_OVERLAP = 200


# Main Pipeline
def main():

    print("=" * 60)
    print("RAG INGESTION PIPELINE")
    print("=" * 60)


    # Step 1 — Load Documents


    print(f"\n[STEP 1] Loading documents from:\n{DATA_DIR}\n")

    documents = load_all_documents(DATA_DIR)

    if not documents:

        print(
            "\n[ERROR] No documents found.\n"
            "Add files to the data/ folder and retry."
        )

        sys.exit(1)

    print(
        f"\n[OK] Loaded {len(documents)} "
        f"document pages/sections."
    )



    print("\n[STEP 2] Building FAISS vector store...\n")

    store = FaissVectorStore(
        persist_dir=FAISS_STORE_DIR,
        embedding_model=EMBEDDING_MODEL,
        chunk_size=CHUNK_SIZE,
        chunk_overlap=CHUNK_OVERLAP,
    )

    store.build_from_documents(documents)


    print("\n" + "=" * 60)
    print("✅ INGESTION COMPLETE!")
    print("=" * 60)

    print(
        f"\nFAISS index saved to:\n"
        f"{FAISS_STORE_DIR}/faiss.index"
    )

    print(
        f"\nMetadata saved to:\n"
        f"{FAISS_STORE_DIR}/metadata.pkl"
    )

    print("\nYou can now start your chatbot backend.\n")




if __name__ == "__main__":
    main()
