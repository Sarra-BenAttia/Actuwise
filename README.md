<p align="center">
  <img src="frontend/public/images/logoassurance.png" alt="ACTUWISE Logo" width="350" onerror="this.src='https://via.placeholder.com/350x120?text=ACTUWISE+Studio'"/>
</p>

<h1 align="center">ACTUWISE Studio — Plateforme d'Intelligence Actuarielle 🚀</h1>

<p align="center">
  <strong>Projet de Stage de 3ème année — Actuariat & Data Science Appliquée</strong><br>
  <em>Plateforme unifiée alliant Modélisation Actuarielle classique (Chain-Ladder, Bornhuetter-Ferguson, GLM), Machine Learning (XGBoost, CANN), Computer Vision (YOLOv8, CNN), Séries Temporelles (ARIMA, LSTM) et IA Générative (RAG + Llama 3.3) pour l'assurance Non-Vie automobile.</em>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Python-3.10+-3776AB?logo=python&logoColor=white" alt="Python"/>
  <img src="https://img.shields.io/badge/FastAPI-0.110-009688?logo=fastapi&logoColor=white" alt="FastAPI"/>
  <img src="https://img.shields.io/badge/XGBoost-Gradient%20Boosting-FF6600" alt="XGBoost"/>
  <img src="https://img.shields.io/badge/PyTorch-Deep%20Learning-EE4C2C?logo=pytorch&logoColor=white" alt="PyTorch"/>
  <img src="https://img.shields.io/badge/YOLOv8-Computer%20Vision-8A2BE2" alt="YOLOv8"/>
  <img src="https://img.shields.io/badge/RAG-Llama%203.3%20%7C%20Groq-000000" alt="RAG"/>
  <img src="https://img.shields.io/badge/PostgreSQL-Database-4169E1?logo=postgresql&logoColor=white" alt="PostgreSQL"/>
  <img src="https://img.shields.io/badge/License-MIT-22C55E" alt="License"/>
</p>

---

## 📖 Overview

This project was developed as part of a **3rd-year internship** in **Actuarial Science & Applied Data Science**, applied to a real Tunisian automobile insurance portfolio covering **6 years of historical data (2018–2023)**.

**ACTUWISE Studio** is a fully operational actuarial intelligence platform that covers the entire insurance value chain — from strategic portfolio monitoring to individual claims processing — in a single unified web application. The platform bridges the gap between regulatory-standard classical actuarial methods and the predictive power of modern machine learning, providing actuaries, underwriters and management with tools that are both mathematically rigorous and intelligently automated.

### Key Design Principles

- **Benchmark-driven model selection** — at startup, the platform automatically evaluates GLM vs XGBoost vs CANN (Gini coefficient) and Chain-Ladder vs XGBoost Reserving (RMSE), then selects and activates the best-performing model
- **Explainability first** — every ML prediction is backed by SHAP values (feature-level contributions) so actuaries understand what drives each result
- **Real portfolio data** — built on an actual Tunisian automobile insurance dataset, not synthetic data
- **Regulatory alignment** — IBNR reserving methods follow IFRS 17 and CGA (Comité Général des Assurances Tunisie) standards
- **Full API exposure** — every module is accessible via a documented REST API (Swagger UI)

---

## 🗂️ Modules Overview

| # | Module | Type | Core Method |
|---|---|---|---|
| M1 | Portfolio Dashboard | Analytics | KPIs, Series, Ratios |
| M2 | IBNR Reserving | Classical Actuarial | Chain-Ladder / BF / Cape Cod |
| M3 | Predictive Pricing | ML + Actuarial | GLM / XGBoost / CANN |
| M4 | Claims Forecasting | Time Series | ARIMA / LSTM |
| M5 | Fraud Detection | Unsupervised ML | DBSCAN / KMeans |
| M6 | SinistrIA | Computer Vision + OCR | CNN + EasyOCR |
| M7 | PhotoCar | Computer Vision | YOLOv8 + XGBoost |
| M8 | AI Assistant | Generative AI | RAG + Llama 3.3 |

---

## 📊 Module 1 — Analyse de Sinistralité (Portfolio Dashboard)

Real-time monitoring of the financial and technical health of the automobile portfolio over a 72-month period.

**Indicators computed:**
- **Claims Frequency** — monthly `nb_sinistres` tracked against budget forecasts by year of occurrence (`annee_survenance`)
- **Average Claims Cost** — `cout_moyen` per claim, detecting repair inflation and bodily injury trends
- **Combined Ratio** — `ratio_sinistres / primes + frais_gestion` per year; segments flagged in red when > 100% (technical loss)
- **Monthly Time Series** — 72 months (2018–2023) of `nb_sinistres` + `cout_total` from `serie_mensuelle.csv`
- **Cross-segmentation** — portfolio breakdown by `Usage` (Promenade/Affaire/Transport), `Region` (24 Tunisian governorates), `Energie` (Essence/Diesel/GPL)
- **By-guarantee analysis** — `sinistralite_par_garantie.csv`: RC, Vol, Incendie, Bris de Glace, Dommages

**Data sources:** `serie_mensuelle.csv`, `sinistralite_par_annee.csv`, `sinistralite_par_garantie.csv`, `ratio_combine_par_annee.csv`

---

## 🔢 Module 2 — Provisionnement IBNR (Loss Reserving)

Implementation of the three standard actuarial reserving methods on paid claims development triangles, with automated model selection.

### Methods Implemented

**Chain-Ladder (CL)**
- Projection of cumulative paid claims using development factors `f_k = Σ C_{i,k+1} / Σ C_{i,k}`
- Ultimate loss estimated per year of occurrence: `C_{i,∞} = C_{i,n} × f_n × f_{n+1} × ...`
- IBNR = Ultimate − Cumulative paid to date
- Source data: `triangle_cumul.csv`, `facteurs_developpement.csv`

**Bornhuetter-Ferguson (BF)**
- Credibility-weighted blend: `IBNR_BF = (1 - 1/f_k) × ELR × Premium`
- Combines CL development factors with an a priori Expected Loss Ratio (ELR) to stabilize estimates for immature years

**Cape Cod (CC)**
- Iterative a priori ELR estimation: `ELR_CC = Σ Paid / Σ (Premium × % developed)`
- Avoids dependency on assumed ELR; derived entirely from observed portfolio experience

**XGBoost ML Reserving** (benchmark alternative)
- Triangle completion using gradient boosting; compared against Chain-Ladder on RMSE
- Automatic selection: XGBoost is activated if `RMSE(XGBoost) < RMSE(Chain-Ladder)`, otherwise Chain-Ladder is retained as the regulatory default

**Stress Testing**
- 4 scenarios applied to the IBNR estimate: Favorable / Base / Adverse / Very Adverse
- Used for sensitivity analysis and capital requirement estimation (Solvency II / IFRS 17 context)

**IFRS 17 alignment** — reserve methodology consistent with international insurance accounting standards (CSM, Risk Adjustment)

**Data sources:** `resultats_CL.csv`, `resultats_BF.csv`, `resultats_CC.csv`, `resultats_XGB_reserving.csv`, `benchmark_provisionnement.csv`, `stress_tests.csv`, `triangle_cumul.csv`, `facteurs_developpement.csv`

---

## 🎯 Module 3 — Tarification Prédictive (Predictive Pricing)

Full pure premium modeling pipeline with three competing actuarial/ML models, automated benchmarking, Bonus-Malus integration and SHAP explainability.

### Pure Premium Modeling

**GLM — Frequency / Severity Split (Regulatory Standard)**
- **Frequency model**: Poisson GLM — `E[N] = exp(Xβ)`, models claim count per unit of exposure
- **Severity model**: Gamma GLM — `E[C|N>0] = exp(Xγ)`, models average cost per claim
- **Pure Premium** = `Frequency × Severity`
- Features: `driver_age`, `vehicle_age`, `Puissance fiscale`, `Valeur venale`, `Classe BM`, `Usage`, `CLI_SEX`, `Region`, `Energie`

**XGBoost — Tweedie Compound Model**
- Direct pure premium estimation using XGBoost with Tweedie distribution (`tweedie_variance_power ≈ 1.5`)
- Captures non-linear interactions (e.g., young driver × high-power vehicle × urban region)
- Feature importance extracted via `model.get_score(importance_type="gain")`
- **Gini = 0.329** on the test portfolio → selected as primary model

**CANN — Combined Actuarial Neural Network (PyTorch)**
- Architecture combines a GLM-structured linear layer with a deep neural network component
- Preserves actuarial interpretability while adding non-linear capacity
- Benchmarked against XGBoost: CANN is auto-selected if `Gini(CANN) > Gini(XGBoost)`

**Automatic Model Selection Logic:**
```
IF Gini(CANN) > Gini(XGBoost) → activate CANN
ELSE IF Gini(XGBoost) > Gini(GLM) → activate XGBoost   ← current selection
ELSE → activate GLM (regulatory fallback)
```

### Bonus-Malus System (CGA Tunisian Scale)

- Scale range: **0.50 (BM min) → 3.50 (BM max)**
- Annual reduction for claim-free year: **−0.05**
- Penalty per responsible claim: **+0.25**
- **Trajectory simulator**: projects BM evolution over 3 years under 3 scenarios:
  - *No claim* — BM decreases by 0.05/year
  - *1 responsible claim* — BM increases by 0.25 then normalizes
  - *Probable (AI-driven)* — weighted trajectory using XGBoost-predicted claim probability
- Claim probability prediction: `P(sinistre) = 1 − exp(−λ)` where `λ` = XGBoost frequency prediction

### SHAP Explainability
- Top 10 feature contributions for every individual pricing prediction
- Summary plots: `shap_summary_frequence.png`, `shap_summary_severite.png`
- Key drivers identified: `Valeur venale` > `vehicle_age` > `Classe BM` > `Region` > `driver_age`

### Segmentation & Discrimination
- **Lorenz Curve & Gini Coefficient** — model discrimination power: how well the model separates high-risk from low-risk policyholders
- **K-Means Clustering** — automatic policyholder risk profiling into 3–5 segments
- **Combined Ratio by Segment** — `ratio_combine_par_segment.csv`: segments with ratio > 100% flagged as technically unprofitable

**Data sources:** `benchmark_module3.csv`, `lorenz_curve_data.csv`, `shap_values_top10.csv`, `clusters_profils.csv`, `ratio_combine_par_segment.csv`, `prime_pure_par_segment.csv`, `Tarification_Auto_Predictive_Resultats.xlsx`

---

## 📈 Module 4 — Séries Temporelles (Claims Forecasting)

Multi-model forecasting of monthly claims metrics with perturbation-based SHAP explainability on the LSTM.

### Models

**ARIMA / SARIMA** — `statsmodels`
- Parameters loaded from `arima_params.json` (`p`, `d`, `q`)
- Seasonal decomposition of the 72-month claims series
- Forecast with `model_fit.forecast(steps=N)`

**LSTM (Long Short-Term Memory)** — PyTorch
- Architecture: `input_size=1`, `hidden_size=64`, `num_layers=2`, `dropout=0.2`
- Trained on normalized time series; predictions denormalized back to TND/count scale
- Loaded from `lstm_best.pt`
- Auto-selected if `RMSE(LSTM) < RMSE(SARIMA)` (benchmark-driven)

**SHAP on LSTM (Perturbation Method)**
- Each historical month is neutralized (replaced by mean) and the prediction change is measured
- `impact_i = pred_reference − pred_perturbed_i` → converted back to real scale (TND)
- Top 5 most influential months displayed with human-readable labels (e.g., "Juillet 2022 — il y a 12 mois")

**Output:** 12-month forward forecasts with expanding confidence intervals (`IC = ±(100 + i×15)`)

---

## 🕵️ Module 5 — Détection de Fraude

Unsupervised anomaly detection on claims characteristics to flag suspicious files.

- **DBSCAN** (`dbscan_model.pkl`) — density-based clustering; claims in low-density regions (noise points) are flagged as potential fraud
- **KMeans** (`kmeans_model.pkl`) — behavioral segmentation; distance from centroid used as anomaly score
- **Feature pipeline** — claims normalized via `scaler.pkl`, fed into both models using `feature_columns.pkl`
- **Real-time scoring** — new claim scored instantly via `POST /api/fraude/score`
- Region frequency mapping for 24 Tunisian governorates integrated into feature engineering

---

## 📄 Module 6 — SinistrIA (Smart Claims Declaration)

AI-powered processing of the French/Tunisian "Constat à l'Amiable" (accident report form).

**OCR Pipeline**
- **EasyOCR** (deep learning OCR) — extracts unstructured text zones: driver name, permit number, VIN, license plate
- **pytesseract** — structured field extraction from registration cards and driving licenses
- Handles Arabic and French text simultaneously

**CNN Sketch Classifier** (`cnn_accident.pth` — PyTorch, `torchvision`)
- Classifies hand-drawn accident sketches into accident types:
  - Rear impact (`choc_arriere`)
  - Intersection collision (`croisement`)
  - Parking incident (`stationnement`)
  - Lane change (`changement_voie`)
  - Other configurations
- Output fed into **CGA/IDA convention rules** to automatically determine liability percentage

---

## 📷 Module 7 — PhotoCar (Vehicle Damage Assessment)

Automated repair cost estimation from a single vehicle photograph.

**YOLOv8 Damage Detection** (`photocar_yolo_best.pt`)
- Fine-tuned on automotive damage dataset
- Detects damaged parts: bumper (`pare-chocs`), fender (`aile`), hood (`capot`), door (`portière`), windshield (`bris de glace`), headlight (`phare`), mirror (`rétroviseur`)
- Returns bounding boxes + confidence scores per detected component

**XGBoost Cost Estimator** (`model_cost_xgboost.pkl`)
- Input: binary damage vector (part detected / not detected) + detection confidence scores
- Output: repair cost estimate in **TND (Tunisian Dinar)**
- SHAP values show exactly which damaged parts drive the cost estimate

---

## 🤖 Module 8 — Assistant IA (RAG Chatbot)

Specialized generative AI assistant for actuarial and insurance regulatory knowledge.

**Architecture:** Retrieval-Augmented Generation (RAG)
1. **Indexing** — PDF documents chunked and indexed at startup via TF-IDF (`tfidf_index.pkl`) + FAISS dense vectors
2. **Retrieval** — hybrid search (TF-IDF sparse + FAISS dense) over the knowledge base
3. **Generation** — retrieved chunks sent as context to **Llama 3.3 70B** via **Groq API** (ultra-low latency)
4. **Citation** — every answer references the exact source document and passage

**Knowledge Base** (`documents_rag/`):
- CGA circulars — Comité Général des Assurances Tunisie regulations
- IFRS 17 standard — Insurance Contracts international accounting norm
- Annual reports — portfolio historical data and commentary
- Bonus-Malus tables — CGA official scale

**Example queries:** *"Comment fonctionne la méthode IBNR ?"*, *"Quelles sont les exclusions de la garantie vol ?"*, *"Explique le CSM dans IFRS 17"*

---

## 🏗️ Tech Stack

### Backend
| Technology | Version | Role |
|---|---|---|
| **Python** | 3.10+ | Core language |
| **FastAPI** | 0.110+ | REST API, async ML inference, static file serving |
| **Uvicorn** | latest | ASGI production server |
| **SQLAlchemy** | 2.x | ORM — User, Claim, AuditLog models |
| **PostgreSQL** | 14+ | Relational database |
| **Pydantic** | v2 | Request/response schema validation |
| **python-dotenv** | latest | Environment variable management |

### Machine Learning & Actuarial Science
| Technology | Role |
|---|---|
| **XGBoost** | Tweedie pricing, IBNR reserving, repair cost, BM claim probability |
| **scikit-learn** | GLM (Poisson/Gamma), KMeans, DBSCAN, Lorenz curve, TF-IDF retrieval |
| **statsmodels** | ARIMA / SARIMA time series, Poisson/Gamma GLM fitting |
| **scipy** | Statistical distributions — Poisson, Gamma, Tweedie |
| **pandas / numpy** | Triangle calculations, exposure aggregations, normalization |
| **SHAP** | Feature importance for XGBoost pricing + LSTM perturbation method |

### Deep Learning
| Technology | Role |
|---|---|
| **PyTorch** | CANN (pricing), LSTM (forecasting), CNN (sketch classification) |
| **torchvision** | CNN architecture for accident sketch image classification |

### Computer Vision & Document Processing
| Technology | Role |
|---|---|
| **Ultralytics YOLOv8** | Fine-tuned vehicle damage detection |
| **EasyOCR** | Deep learning OCR — French/Arabic accident report extraction |
| **pytesseract** | Structured field OCR (plates, VIN, permit numbers) |
| **Pillow / OpenCV** | Image preprocessing and augmentation |

### Generative AI & NLP
| Technology | Role |
|---|---|
| **LangChain** | RAG pipeline orchestration |
| **FAISS** | Dense vector similarity search |
| **scikit-learn TF-IDF** | Sparse keyword-based retrieval fallback |
| **Groq API** | Llama 3.3 70B — ultra-fast LLM inference |
| **PyMuPDF / pdfplumber** | PDF text extraction and chunking |

### Frontend
| Technology | Role |
|---|---|
| **HTML5 / CSS3** | Responsive SPA — Glassmorphism design system |
| **Vanilla JavaScript ES6+** | Dynamic UI, API calls, state management |
| **ApexCharts** | Interactive charts: bar, line, area, donut, heatmap |
| **FastAPI StaticFiles** | Frontend served directly by the backend — no separate server |

---

## 📁 Directory Structure

```
actuwise_app/
│
├── backend/
│   ├── main.py                      # FastAPI entry point — lifespan, CORS, static files
│   ├── database.py                  # SQLAlchemy engine & session factory (PostgreSQL)
│   ├── models_db.py                 # ORM models: User, Claim, AuditLog
│   │
│   ├── routers/                     # API route modules
│   │   ├── auth.py                  # JWT login / token refresh
│   │   ├── sinistralite.py          # M1 — Portfolio KPIs & analytics
│   │   ├── provisionnement.py       # M2 — IBNR: CL, BF, Cape Cod, XGB
│   │   ├── modelisation.py          # M3 — Benchmark GLM/XGB/CANN, SHAP, segments
│   │   ├── tarification.py          # M3 — Individual scoring (XGBoost Tweedie)
│   │   ├── bonus_malus.py           # M3 — BM trajectory simulator (CGA scale)
│   │   ├── forecast.py              # M4 — ARIMA / LSTM forecasting
│   │   ├── fraude.py                # M5 — DBSCAN / KMeans anomaly scoring
│   │   ├── sinistria.py             # M6 — OCR + CNN claims declaration
│   │   ├── photocar.py              # M7 — YOLOv8 damage + cost estimation
│   │   └── assistant.py             # M8 — RAG chatbot (Groq / Llama 3.3)
│   │
│   ├── services/
│   │   ├── data_loader.py           # CSV loading & caching at startup
│   │   ├── model_loader.py          # ML model loading (pkl, pt, json)
│   │   ├── model_selector.py        # Auto best-model selection (Gini / RMSE)
│   │   ├── rag_service.py           # RAG pipeline (FAISS + TF-IDF + Groq)
│   │   └── ocr_service.py           # OCR extraction logic
│   │
│   ├── schemas/                     # Pydantic I/O schemas per module
│   ├── models/                      # Trained model files (excluded from git)
│   ├── data/                        # CSV actuarial datasets (excluded from git)
│   ├── documents_rag/               # PDF knowledge base for RAG
│   ├── faiss_index/                 # Auto-generated FAISS vector index
│   └── requirements.txt
│
├── frontend/public/
│   ├── login.html                   # Auth page
│   ├── app.html                     # Main SPA — all 8 modules
│   ├── dashboard.html               # Strategic portfolio dashboard
│   └── js/dashboard-dynamic.js     # Chart rendering logic
│
├── docs/                            # Architecture diagrams & screenshots
├── notebooks/                       # Jupyter — model training & EDA
├── run.bat                          # Windows one-click launcher
└── README.md
```

---

## 🚀 Getting Started

### Prerequisites
- **Python 3.10+**
- **PostgreSQL 14+** (or SQLite for local testing)
- **Groq API key** — [Get one free](https://console.groq.com) (for the AI Assistant)

### Installation

**Option A — Windows one-click**
```bash
run.bat   # starts backend on port 8000, opens browser automatically
```

**Option B — Manual**
```bash
git clone https://github.com/Sarra-BenAttia/Actuwise.git
cd Actuwise/backend

python -m venv venv
venv\Scripts\activate          # Windows
# source venv/bin/activate     # Linux / macOS

pip install -r requirements.txt

# Configure .env
copy .env.example .env
# Set: GROQ_API_KEY, DATABASE_URL, SECRET_KEY

uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

### Access

| URL | Description |
|---|---|
| http://localhost:8000/login.html | Application login |
| http://localhost:8000/app.html | Full platform (all 8 modules) |
| http://localhost:8000/dashboard.html | Strategic dashboard |
| http://localhost:8000/docs | Swagger UI — REST API docs |

```
Email    : actuaire@actuwise.com
Password : admin123
```

---

## 📊 Model Performance Benchmark

| Module | Task | Model | Metric | Value | Selected |
|---|---|---|---|---|---|
| M2 | IBNR Reserving | Chain-Ladder | RMSE | — | ✅ default |
| M2 | IBNR Reserving | XGBoost Reserving | RMSE | benchmark | if RMSE↓ |
| M3 | Pure Premium | GLM Poisson/Gamma | Gini | 0.247 | — |
| M3 | Pure Premium | XGBoost Tweedie | Gini | **0.329** | ✅ selected |
| M3 | Pure Premium | CANN PyTorch | Gini | benchmark | if Gini↑ |
| M4 | Forecasting | ARIMA | RMSE | benchmark | fallback |
| M4 | Forecasting | LSTM PyTorch | RMSE | benchmark | if RMSE↓ |

> The platform auto-selects the best model at startup based on measured benchmark metrics — no manual configuration needed.

---

## 🔐 Environment Variables

```env
# AI Assistant (required for Module 8)
GROQ_API_KEY=your_groq_api_key_here

# Database
DATABASE_URL=postgresql://postgres:password@localhost:5432/actuwise

# JWT Authentication
SECRET_KEY=your_jwt_secret_key
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60
```

---

## 🎓 Acknowledgments

Developed as a **3rd-year internship project** in Actuarial Science & Data Science, applied to a real Tunisian non-life insurance portfolio.

*Built with passion for Actuarial Science and AI.* 📊🤖
