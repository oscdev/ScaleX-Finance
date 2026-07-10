from rank_bm25 import BM25Okapi

from src.utils.logger import logger

import re


class BM25Search:

    def __init__(self):

        self.bm25 = None

        self.chunks = []

    def tokenize(self, text:str):

        tokens = re.findall(
            r"\b\w+\b",
            text.lower()
        )

        return tokens

    def build(self, chunks):

        logger.info(
            "Building BM25 index"
        )

        self.chunks = chunks

        tokenized_chunks = [

        self.tokenize(
            f"{chunk.section_title}\n"
            f"{chunk.clean_content}"
            )

            for chunk in chunks
        ]

        self.bm25 = BM25Okapi(
            tokenized_chunks
        )

        logger.info(
            "BM25 index built successfully"
        )

    def search(
        self,
        query: str,
        top_k: int = 5
    ):

        logger.info(
            f"Performing BM25 search "
            f"(top_k={top_k})"
        )

        tokenized_query = (
            self.tokenize(query)
        )

        scores = self.bm25.get_scores(
            tokenized_query
        )

        ranked_indices = sorted(
            range(len(scores)),
            key=lambda i: scores[i],
            reverse=True
        )[:top_k]

        results = []

        for index in ranked_indices:

            results.append(
                {
                    "score": float(scores[index]),
                    "chunk": self.chunks[index]
                }
            )

        logger.info(
            f"Retrieved {len(results)} chunks"
        )

        return results