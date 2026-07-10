from src.utils.logger import logger


class HybridSearch:

    def __init__(
        self,
        vector_search,
        bm25_search
    ):

        self.vector_search = vector_search

        self.bm25_search = bm25_search

    def search(
        self,
        query: str,
        query_embedding,
        top_k: int = 5,
        alpha: float = 0.5
    ):

        vector_results = (
            self.vector_search.search(
                query_embedding=query_embedding,
                top_k=top_k * 2
            )
        )

        bm25_results = (
            self.bm25_search.search(
                query=query,
                top_k=top_k * 2
            )
        )

        combined_scores = {}

        # -------------------------
        # Vector scores
        # -------------------------

        for result in vector_results:

            chunk = result["chunk"]

            chunk_id = chunk.chunk_id

            score = result["score"]

            if chunk_id not in combined_scores:

                combined_scores[chunk_id] = {
                    "chunk": chunk,
                    "vector_score": 0.0,
                    "bm25_score": 0.0
                }

            combined_scores[chunk_id][
                "vector_score"
            ] = score

        # -------------------------
        # BM25 scores
        # -------------------------

        for result in bm25_results:

            chunk = result["chunk"]

            chunk_id = chunk.chunk_id

            score = result["score"]

            if chunk_id not in combined_scores:

                combined_scores[chunk_id] = {
                    "chunk": chunk,
                    "vector_score": 0.0,
                    "bm25_score": 0.0
                }

            combined_scores[chunk_id][
                "bm25_score"
            ] = score

        # -------------------------
        # Normalize BM25
        # -------------------------

        max_bm25 = max(
            (
                item["bm25_score"]
                for item in combined_scores.values()
            ),
            default=1.0
        )

        # -------------------------
        # Final scoring
        # -------------------------

        final_results = []

        for item in combined_scores.values():

            normalized_bm25 = (
                item["bm25_score"] / max_bm25
                if max_bm25 > 0
                else 0.0
            )

            final_score = (

                alpha * item["vector_score"]

                +

                (1 - alpha) * normalized_bm25
            )

            final_results.append(
                {
                    "score": final_score,
                    "vector_score": item[
                        "vector_score"
                    ],
                    "bm25_score": item[
                        "bm25_score"
                    ],
                    "chunk": item["chunk"]
                }
            )

        final_results.sort(
            key=lambda x: x["score"],
            reverse=True
        )

        logger.info(
            f"Hybrid search returned "
            f"{len(final_results[:top_k])} chunks"
        )

        return final_results[:top_k]