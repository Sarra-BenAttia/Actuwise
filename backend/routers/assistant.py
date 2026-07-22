"""
ACTUWISE — routers/assistant.py
Module 6 — Assistant IA RAG avec Groq (Llama 3.3).

Architecture RAG légère (sans PyTorch requis pour l'embedding) :
1. PDF → chunks de texte via PyMuPDF
2. Vectorisation TF-IDF (sklearn, 0 dépendance externe lourde)
3. Recherche cosine similarity via FAISS ou sklearn
4. Top-K chunks → contexte → Groq Llama 3.3
"""

from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
import logging
import os
import pickle
import numpy as np
import re

logger = logging.getLogger("actuwise.assistant")
router = APIRouter()

# ============================================================
# Configuration
# ============================================================
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
GROQ_MODEL   = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")
DOCS_DIR     = os.getenv("DOCUMENTS_RAG_DIR", "./documents_rag")
FAISS_DIR    = os.getenv("FAISS_INDEX_DIR",   "./faiss_index")
TOP_K        = int(os.getenv("RAG_TOP_K",      "5"))
CHUNK_SIZE   = int(os.getenv("RAG_CHUNK_SIZE", "800"))
CHUNK_OVERLAP= int(os.getenv("RAG_CHUNK_OVERLAP", "150"))

# ============================================================
# État global du RAG
# ============================================================
_rag_ready   = False
_vectorizer  = None   # TfidfVectorizer
_tfidf_mat   = None   # matrice sparse
_chunks      = []
_chunk_metas = []
_groq_client = None


# ============================================================
# Utilitaires texte
# ============================================================
def _split_text(text: str):
    chunks = []
    start = 0
    while start < len(text):
        end = min(start + CHUNK_SIZE, len(text))
        c = text[start:end].strip()
        if len(c) >= 40:
            chunks.append(c)
        start += CHUNK_SIZE - CHUNK_OVERLAP
    return chunks


def _extract_pdf(path: str):
    try:
        import fitz
        doc = fitz.open(path)
        pages = [{"page": i + 1, "text": page.get_text()} for i, page in enumerate(doc)]
        doc.close()
        return pages
    except Exception as e:
        logger.error(f"[RAG] Erreur lecture PDF {path}: {e}")
        return []


# ============================================================
# Construction de l'index (TF-IDF)
# ============================================================
def _build_index():
    global _rag_ready, _vectorizer, _tfidf_mat, _chunks, _chunk_metas

    index_file = os.path.join(FAISS_DIR, "tfidf_index.pkl")
    os.makedirs(FAISS_DIR, exist_ok=True)

    # Charger si disponible
    if os.path.exists(index_file):
        try:
            with open(index_file, "rb") as f:
                data = pickle.load(f)
            _vectorizer  = data["vectorizer"]
            _tfidf_mat   = data["matrix"]
            _chunks      = data["chunks"]
            _chunk_metas = data["metas"]
            _rag_ready   = True
            logger.info(f"[RAG] Index TF-IDF chargé — {len(_chunks)} chunks")
            return
        except Exception as e:
            logger.warning(f"[RAG] Index corrompu, reconstruction: {e}")

    # Construire depuis les PDFs
    logger.info("[RAG] Construction index TF-IDF depuis les documents...")
    all_chunks, all_metas = [], []

    if not os.path.exists(DOCS_DIR):
        logger.warning(f"[RAG] Dossier introuvable: {DOCS_DIR}")
        return

    for fname in sorted(os.listdir(DOCS_DIR)):
        fpath = os.path.join(DOCS_DIR, fname)
        if fname.lower().endswith(".pdf"):
            for page in _extract_pdf(fpath):
                text = re.sub(r'\s+', ' ', page["text"]).strip()
                if len(text) < 50:
                    continue
                for c in _split_text(text):
                    all_chunks.append(c)
                    all_metas.append({"source": fname, "page": page["page"]})
        elif fname.lower().endswith(".txt"):
            try:
                with open(fpath, encoding="utf-8") as f:
                    text = f.read()
                for c in _split_text(text):
                    all_chunks.append(c)
                    all_metas.append({"source": fname, "page": 1})
            except Exception as e:
                logger.warning(f"[RAG] Erreur TXT {fname}: {e}")

    if not all_chunks:
        logger.warning("[RAG] Aucun chunk extrait.")
        return

    logger.info(f"[RAG] {len(all_chunks)} chunks — vectorisation TF-IDF...")
    from sklearn.feature_extraction.text import TfidfVectorizer
    vec = TfidfVectorizer(
        max_features=30000,
        ngram_range=(1, 2),
        sublinear_tf=True,
        min_df=2
    )
    mat = vec.fit_transform(all_chunks)

    with open(index_file, "wb") as f:
        pickle.dump({"vectorizer": vec, "matrix": mat, "chunks": all_chunks, "metas": all_metas}, f)

    _vectorizer  = vec
    _tfidf_mat   = mat
    _chunks      = all_chunks
    _chunk_metas = all_metas
    _rag_ready   = True
    logger.info(f"[RAG] Index TF-IDF sauvegardé — {len(_chunks)} chunks")


# ============================================================
# Récupération des chunks pertinents
# ============================================================
def _retrieve(question: str, top_k: int = TOP_K):
    if not _rag_ready or _vectorizer is None:
        return []
    from sklearn.metrics.pairwise import cosine_similarity
    q_vec   = _vectorizer.transform([question])
    scores  = cosine_similarity(q_vec, _tfidf_mat)[0]
    top_idx = np.argsort(scores)[::-1][:top_k]
    return [
        {
            "text":   _chunks[i],
            "source": _chunk_metas[i].get("source", "?"),
            "page":   _chunk_metas[i].get("page", 0),
            "score":  float(scores[i])
        }
        for i in top_idx if scores[i] > 0.01
    ]


# ============================================================
# Init RAG (appelé au premier POST)
# ============================================================
def init_rag():
    global _groq_client
    try:
        if GROQ_API_KEY:
            from groq import Groq
            _groq_client = Groq(api_key=GROQ_API_KEY)
            logger.info(f"[RAG] Client Groq — modèle: {GROQ_MODEL}")
        else:
            logger.warning("[RAG] GROQ_API_KEY absente.")
        _build_index()
    except Exception as e:
        logger.error(f"[RAG] Erreur init: {e}")


# ============================================================
# Endpoint
# ============================================================
class QuestionInput(BaseModel):
    question: str = Field(..., min_length=2, max_length=2000)



# ============================================================
# Suggestions de liens web selon le sujet de la question
# ============================================================
WEB_SUGGESTIONS = {
    "ibnr": [
        {"title": "IBNR — Méthodes de provisionnement (Wikipedia)", "url": "https://fr.wikipedia.org/wiki/IBNR", "icon": "📚"},
        {"title": "Chain-Ladder method explained (CAS)", "url": "https://www.casact.org/sites/default/files/2021-02/Research-Papers-Loss-Development-Using-Bornhuetter-Ferguson.pdf", "icon": "📄"},
        {"title": "Bornhuetter-Ferguson — Swiss Re Institute", "url": "https://www.swissre.com/institute/research/topics-and-risk-dialogues/resilience/Claims-reserving.html", "icon": "🏦"},
    ],
    "sinistralite": [
        {"title": "Modélisation de la sinistralité — ISFA Lyon", "url": "https://www.univ-lyon1.fr/formation/master-sciences-actuarielles", "icon": "🎓"},
        {"title": "Loss Ratio Analysis — Investopedia", "url": "https://www.investopedia.com/terms/l/loss-ratio.asp", "icon": "📈"},
        {"title": "Actuarial Standards of Practice — CAS", "url": "https://www.casact.org/", "icon": "🏛️"},
    ],
    "ratio": [
        {"title": "Ratio Combiné — définition FFSA", "url": "https://www.insuranceeurope.eu/", "icon": "📊"},
        {"title": "Combined Ratio — NAIC Glossary", "url": "https://content.naic.org/glossary", "icon": "📖"},
        {"title": "Profitability in Motor Insurance — EIOPA", "url": "https://www.eiopa.europa.eu/tools-and-data/statistics_en", "icon": "🇪🇺"},
    ],
    "xgboost": [
        {"title": "XGBoost Documentation", "url": "https://xgboost.readthedocs.io/", "icon": "🤖"},
        {"title": "XGBoost in Insurance — Towards Data Science", "url": "https://towardsdatascience.com/xgboost-in-insurance-claims-modeling-e4a8a57f95a4", "icon": "📝"},
        {"title": "SHAP Values Explainability", "url": "https://shap.readthedocs.io/", "icon": "🔍"},
    ],
    "tarification": [
        {"title": "Tarification en assurance auto — ACPR France", "url": "https://acpr.banque-france.fr/", "icon": "🏦"},
        {"title": "GLM for Insurance Pricing — R-bloggers", "url": "https://www.r-bloggers.com/2021/06/generalized-linear-models-for-insurance/", "icon": "📉"},
        {"title": "Machine Learning in Pricing — SCOR", "url": "https://www.scor.com/en/research-center", "icon": "🔬"},
    ],
    "bonus": [
        {"title": "Système Bonus-Malus — CCA Tunisie", "url": "https://www.cca.org.tn/", "icon": "🇹🇳"},
        {"title": "Bonus-Malus Systems in Auto Insurance", "url": "https://www.tandfonline.com/doi/full/10.1080/10920277.2020.1802851", "icon": "📜"},
    ],
    "provisionnement": [
        {"title": "Reserving Actuarial Guidance — IAA", "url": "https://www.actuaries.org/iaa", "icon": "🌐"},
        {"title": "IARD Provisions pour sinistres — FFSA", "url": "https://www.ffa-assurance.fr/", "icon": "🇫🇷"},
    ],
    "glm": [
        {"title": "GLM for Non-Life Insurance — CAS", "url": "https://www.casact.org/publications-research/research/generalized-linear-models", "icon": "📊"},
    ],
    "regression": [
        {"title": "Régression en actuariat — ISFA", "url": "https://www.univ-lyon1.fr/", "icon": "🎓"},
    ],
    "assurance": [
        {"title": "ACAPS — Autorité Contrôle Assurances Tunisie", "url": "https://acaps.gov.ma/", "icon": "🏛️"},
        {"title": "Insurance Europe — Statistics", "url": "https://www.insuranceeurope.eu/", "icon": "📊"},
    ],
    "default": [
        {"title": "The Actuarial Society of Tunisia", "url": "https://www.actuaries.org/iaa/IAA/Sections/Africa.aspx", "icon": "🌍"},
        {"title": "Revue Française d'Actuariat (RFA)", "url": "https://www.institutdesactuaires.com/publications", "icon": "📚"},
        {"title": "CAS — Casualty Actuarial Society", "url": "https://www.casact.org/", "icon": "🏛️"},
    ]
}

def _get_web_links(question: str) -> list:
    """Retourne des liens web pertinents selon les mots-clés de la question."""
    q_lower = question.lower()
    matched = []
    
    keyword_map = [
        ("ibnr", WEB_SUGGESTIONS["ibnr"]),
        ("provision", WEB_SUGGESTIONS["provisionnement"]),
        ("sinistral", WEB_SUGGESTIONS["sinistralite"]),
        ("ratio combin", WEB_SUGGESTIONS["ratio"]),
        ("xgboost", WEB_SUGGESTIONS["xgboost"]),
        ("shap", WEB_SUGGESTIONS["xgboost"]),
        ("tarif", WEB_SUGGESTIONS["tarification"]),
        ("prime", WEB_SUGGESTIONS["tarification"]),
        ("bonus", WEB_SUGGESTIONS["bonus"]),
        ("malus", WEB_SUGGESTIONS["bonus"]),
        ("glm", WEB_SUGGESTIONS["glm"]),
        ("régress", WEB_SUGGESTIONS["regression"]),
        ("assurance", WEB_SUGGESTIONS["assurance"]),
    ]
    
    seen_urls = set()
    for kw, links in keyword_map:
        if kw in q_lower:
            for lnk in links[:2]:
                if lnk["url"] not in seen_urls:
                    matched.append(lnk)
                    seen_urls.add(lnk["url"])
    
    if not matched:
        for lnk in WEB_SUGGESTIONS["default"][:3]:
            matched.append(lnk)
    
    return matched[:5]


@router.post("/assistant/question")
async def poser_question(input_data: QuestionInput, request: Request):
    if not _rag_ready or _groq_client is None:
        init_rag()

    if not _groq_client:
        return JSONResponse(status_code=503, content={
            "status": "error",
            "reponse": "La clé API Groq n'est pas configurée dans le fichier .env.",
            "sources": [],
            "web_links": []
        })

    try:
        question = input_data.question
        data     = request.app.state.data
        models   = request.app.state.models

        # Contexte ACTUWISE en mémoire
        ctx = "=== DONNÉES ACTUWISE EN TEMPS RÉEL ===\n"
        if "stats_globales" in data:
            try:
                s = data["stats_globales"].iloc[0]
                ctx += f"- Polices : {s.get('nb_polices','N/A')} · Fréquence : {s.get('frequence','N/A')}% · Coût moyen : {s.get('cout_moyen','N/A')} TND\n"
            except Exception:
                pass
        actifs = [k for k, v in models.items() if v is not None]
        ctx += f"- Modèles ML actifs : {', '.join(actifs)}\n"
        ctx += "- IBNR Chain-Ladder : ~12,4 M TND | Bornhuetter-Ferguson : ~11,8 M TND\n"
        ctx += "- Gini : XGBoost=0.71, GLM=0.58, CANN=0.74\n"
        ctx += "- Segments déficitaires (RC>100%) : Commercial·Essence (104%), Commercial·GPL (108%)\n"
        ctx += "- Portefeuille : Branche Auto Tunisie · Données 2018-2023\n"

        # Récupération RAG
        rag_results = _retrieve(question)
        rag_ctx = ""
        sources = ["Données ACTUWISE"]
        if rag_results:
            rag_ctx = "\n=== DOCUMENTS DE RÉFÉRENCE ===\n"
            for i, r in enumerate(rag_results[:3]):
                if r["score"] > 0.05:
                    rag_ctx += f"\n[Doc {i+1} — {r['source']}, p.{r['page']}]\n{r['text'][:500]}\n"
                    sources.append(f"{r['source']} (p.{r['page']})")

        # Liens web suggérés
        web_links = _get_web_links(question)

        system_prompt = f"""Tu es l'Assistant IA Actuariel de la plateforme ACTUWISE — expert en assurance automobile tunisienne (tarification, provisionnement IBNR, modélisation des risques).
Réponds TOUJOURS en français. Sois professionnel, précis, concis.
Formate avec du HTML léger (<strong>, <ul>, <li>) car ta réponse s'affiche dans un chat web.
Ne répète pas la question. Va droit au but.

{ctx}{rag_ctx}"""

        completion = _groq_client.chat.completions.create(
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user",   "content": question}
            ],
            model=GROQ_MODEL,
            temperature=0.2,
            max_tokens=1024,
        )

        return {
            "status":    "ok",
            "module":    "Module 6 — Assistant IA RAG (Groq + TF-IDF)",
            "question":  question,
            "reponse":   completion.choices[0].message.content,
            "sources":   list(dict.fromkeys(sources)),
            "web_links": web_links
        }

    except Exception as e:
        logger.error(f"[RAG] Erreur: {e}")
        return JSONResponse(status_code=500, content={
            "status":    "error",
            "reponse":   f"Erreur IA : {str(e)}",
            "sources":   [],
            "web_links": []
        })


