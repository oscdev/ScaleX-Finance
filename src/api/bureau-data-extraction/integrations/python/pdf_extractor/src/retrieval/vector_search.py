import faiss
import numpy as np

from src.utils.logger import logger


class VectorSearch:

    def __init__(self, embedding_dimension: int):

        self.index = faiss.IndexFlatIP(
            embedding_dimension
        )

        self.chunks = []

    def add(
        self,
        embeddings,
        chunks
    ):

        embeddings = np.array(
            embeddings,
            dtype=np.float32
        )

        self.index.add(embeddings)

        self.chunks.extend(chunks)

        logger.info(
            "Chunks added successfully"
        )

    def search(
        self,
        query_embedding,
        top_k: int = 5
    ):

        query_embedding = np.array(
            [query_embedding],
            dtype=np.float32
        )

        scores, indices = self.index.search(
            query_embedding,
            top_k
        )

        results = []

        for score, index in zip(
            scores[0],
            indices[0]
        ):

            if index == -1:
                continue

            results.append(
                {
                    "score": float(score),
                    "chunk": self.chunks[index]
                }
            )

        logger.info(
            f"Retrieved {len(results)} chunks"
        )

        return results