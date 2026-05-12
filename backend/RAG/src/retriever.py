import numpy as np
from src.vectorStore import FaissVectorStore
from pathlib import Path
BASE_DIR = Path(__file__).resolve().parent.parent
class Retriever:
    def __init__(
        self,
        persist_dir: str = str(BASE_DIR / "faiss_store"),
        embedding_model: str = "all-MiniLM-L6-v2",
        top_k: int = 4,
    ):
        self.top_k = top_k
        self.store = FaissVectorStore(
            persist_dir=persist_dir,
            embedding_model=embedding_model,
        )
        self.store.load()
        print(f"[INFO] Retriever ready — will return top {top_k} chunks per query.")

    def retrieve(self, query: str) -> str:
        """
        Search the vector store for relevant chunks and return
        them as a single joined string ready to inject into the LLM prompt.
        """
        if self.store.index is None:
          raise ValueError("Vector store not loaded.")
        results = self.store.query(query, top_k=self.top_k)

        if not results:
            return ""

        chunks = []

        for r in results:

            meta = r.get("metadata", {})

            text = meta.get("text", "").strip()
            source = meta.get("source", "unknown")
            page = meta.get("page", "N/A")

            if text:
               chunk_text = (
                f"[Source: {source} | Page: {page}]\n{text}"
                )
               chunks.append(chunk_text)

        context = "\n\n---\n\n".join(chunks)
        print(f"[INFO] Retrieved {len(chunks)} chunks for query: '{query}'")
        return context


# Test
if __name__ == "__main__":
    retriever = Retriever()
    result = retriever.retrieve("What are the symptoms of PCOS?")
    print("\n=== RETRIEVED CONTEXT ===")
    print(result)
