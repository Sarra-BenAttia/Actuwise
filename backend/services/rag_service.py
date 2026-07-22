"""
ACTUWISE — services/rag_service.py
Module 6 — Service RAG (PLACEHOLDER).

Ce service sera implémenté lors de l'intégration du Module 6.
Structure préparée pour LangChain + FAISS + OpenAI GPT-4o.

Fonctionnement prévu :
  1. Vérifier si l'index FAISS existe dans faiss_index/
  2. Si oui → charger l'index directement
  3. Si non → indexer les PDF de documents_rag/ et sauvegarder
  4. Pour chaque question : chercher top-K chunks pertinents
  5. Générer la réponse avec GPT-4o + sources
"""

import os
import logging
from pathlib import Path

logger = logging.getLogger("actuwise.rag")

# Chemins (configurables via .env)
DOCUMENTS_DIR = os.getenv("DOCUMENTS_RAG_DIR", "./documents_rag")
FAISS_INDEX_DIR = os.getenv("FAISS_INDEX_DIR", "./faiss_index")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4o")
EMBEDDING_MODEL = os.getenv("EMBEDDING_MODEL", "text-embedding-3-small")
RAG_TOP_K = int(os.getenv("RAG_TOP_K", "5"))
RAG_CHUNK_SIZE = int(os.getenv("RAG_CHUNK_SIZE", "1000"))
RAG_CHUNK_OVERLAP = int(os.getenv("RAG_CHUNK_OVERLAP", "200"))

# Instance globale du retriever (initialisée une seule fois)
_rag_retriever = None
_rag_chain = None


def initialize_rag() -> bool:
    """
    PLACEHOLDER — Initialise le service RAG.
    Sera implémenté dans Module 6.

    Returns:
        True si l'initialisation réussit, False sinon.
    """
    global _rag_retriever, _rag_chain

    logger.info("[RAG] Module 6 non encore implémenté — RAG non initialisé (placeholder)")
    return False


def query_rag(question: str, historique: list = None) -> dict:
    """
    PLACEHOLDER — Interroge le RAG avec une question en français.

    Args:
        question : Question de l'actuaire
        historique : Historique de la conversation

    Returns:
        dict avec reponse, sources, et statut
    """
    return {
        "status": "not_implemented",
        "reponse": None,
        "sources": [],
        "message": "Module 6 — RAG non encore implémenté"
    }


def is_rag_ready() -> bool:
    """Vérifie si le RAG est prêt à répondre."""
    return _rag_retriever is not None and _rag_chain is not None


# ============================================================
# Structure complète prévue pour Module 6 :
# ============================================================
#
# def _load_documents() -> list:
#     """Charge tous les PDF depuis documents_rag/."""
#     from langchain_community.document_loaders import PyPDFLoader
#     from langchain.text_splitter import RecursiveCharacterTextSplitter
#
#     documents = []
#     for pdf_file in Path(DOCUMENTS_DIR).glob("*.pdf"):
#         loader = PyPDFLoader(str(pdf_file))
#         docs = loader.load()
#         documents.extend(docs)
#
#     splitter = RecursiveCharacterTextSplitter(
#         chunk_size=RAG_CHUNK_SIZE,
#         chunk_overlap=RAG_CHUNK_OVERLAP
#     )
#     return splitter.split_documents(documents)
#
# def _build_or_load_index(chunks):
#     """Construit l'index FAISS ou le charge si déjà sauvegardé."""
#     from langchain_openai import OpenAIEmbeddings
#     from langchain_community.vectorstores import FAISS
#
#     index_path = Path(FAISS_INDEX_DIR)
#     embeddings = OpenAIEmbeddings(
#         model=EMBEDDING_MODEL,
#         api_key=OPENAI_API_KEY
#     )
#
#     if (index_path / "index.faiss").exists():
#         return FAISS.load_local(str(index_path), embeddings)
#     else:
#         vectorstore = FAISS.from_documents(chunks, embeddings)
#         vectorstore.save_local(str(index_path))
#         return vectorstore
