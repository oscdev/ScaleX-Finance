from sentence_transformers import (
    SentenceTransformer
)

from src.embeddings.base_embedder import (
    BaseEmbedder
)

from src.utils.logger import logger


class LocalEmbedder(BaseEmbedder):

    def __init__(
        self,
        model_name: str = (
            "BAAI/bge-small-en-v1.5"
        )
    ):

        self.model = SentenceTransformer(
            model_name
        )

    def embed(self, texts: list[str]):

        embeddings = self.model.encode(
            texts,
            normalize_embeddings=True
        )

        logger.info(
            "Embeddings generated successfully"
        )

        return embeddings