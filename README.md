<p align="center">
  <img src="frontend/public/images/logoassurance.png" alt="ACTUWISE Logo" width="350" onerror="this.src='https://via.placeholder.com/350x120?text=ACTUWISE+Studio'"/>
</p>

<h1 align="center">ACTUWISE Studio — Plateforme d'Intelligence Actuarielle 🚀</h1>

<p align="center">
  <strong>Projet de Stage de 3ème année — Actuariat & Data Science Appliquée</strong><br>
  <em>Une plateforme unifiée alliant Modélisation Actuarielle classique (Chain-Ladder, GLM), Machine Learning (XGBoost, CANN), Computer Vision (YOLOv8, CNN), Séries Temporelles (ARIMA, LSTM) et IA Générative (RAG + LLM) pour l'assurance Non-Vie.</em>
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

This project was developed as part of a **3rd-year internship** in **Actuarial Science & Applied Data Science**.

**ACTUWISE Studio** is a fully functional, production-ready actuarial intelligence platform applied to a real Tunisian automobile insurance portfolio (6 years of data). It unifies classical actuarial mathematics with modern Artificial Intelligence into a single cohesive web application — covering the entire insurance value chain from strategic portfolio monitoring to individual claims processing.

The core challenge this project addresses is the growing gap between traditional actuarial methods (which remain the regulatory standard) and the new capabilities offered by machine learning and generative AI. ACTUWISE Studio bridges this gap by providing actuaries, underwriters and management with a single tool that is both mathematically rigorous and intelligently automated.

### What makes this project different

- **End-to-end coverage** — from raw claims data to final pricing recommendations, all in one platform
- **Benchmark-driven model selection** — models are automatically selected based on measured performance (Gini coefficient, RMSE, log-likelihood)
- **Explainability first** — every ML prediction is accompanied by SHAP values so actuaries understand what drives the result
- **Real data** — built on an actual Tunisian automobile portfolio, not synthetic or toy datasets
- **Regulatory alignment** — IBNR methods follow IFRS 17 and CGA (Comité Général des Assurances) standards

---

## ✨ Features

### 📊 Module 1 — Dashboard Stratégique (Portfolio Monitoring)
Real-time monitoring of the technical and financial health of the automobile portfolio:
- **Loss Frequency** — tracking deviations from budget forecasts by year of occurrence
- **Average Claims Cost** — detecting repair cost inflation and bodily injury impact
- **Combined Ratio (S/P + Expenses)** — the key non-life insurance profitability indicator
- **Monthly Trend Analysis** — 72-month time series of claims count and total cost (2018–2023)
- **Cross-segmentation** — portfolio breakdown by usage (Private/Professional), geography (region), and fuel type (Gasoline/Diesel/GPL)
- **Interactive charts** built with ApexCharts (bar, line, donut, heatmap)

### 🔢 Module 2 — Provisionnement IBNR (Loss Reserving)
Implementation of three actuarial reserving methods on development triangles:
- **Chain-Ladder (CL)** — projection of ultimate loss using development factors
- **Bornhuetter-Ferguson (BF)** — credibility-weighted blend of CL and a priori loss ratio
- **Cape Cod (CC)** — iterative a priori estimation from observed data
- **XGBoost Reserving** — ML-based triangle completion as an alternative benchmark
- **Stress Testing** — 4 scenarios (Favorable / Base / Adverse / Very Adverse) for sensitivity analysis
- **IFRS 17 alignment** — reserve methodology consistent with international insurance accounting standards

### 🎯 Module 3 — Tarification Prédictive (Predictive Pricing)
Full pure premium modeling pipeline with multiple competing approaches:
- **GLM (Poisson frequency × Gamma severity)** — industry-standard frequency/severity split model
- **XGBoost (Tweedie)** — gradient boosting with Tweedie distribution for compound claim cost
- **CANN (Combined Actuarial Neural Network)** — PyTorch neural network combining GLM structure with deep learning
- **Bonus-Malus System** — integration of the Tunisian CGA bonus-malus scale into pricing
- **SHAP Explainability** — top 10 feature contributions for every prediction (driver age, vehicle age, power, region, etc.)
- **Lorenz Curve & Gini Coefficient** — model discrimination power assessment
- **K-Means Segmentation** — automated policyholder risk profiling (3–5 clusters)
- **Automatic model selection** — platform auto-selects the best-performing model based on Gini score

### 📈 Module 4 — Séries Temporelles (Claims Forecasting)
Multi-model forecasting of monthly claims frequency and cost:
- **ARIMA / SARIMA** — classical statistical time series with seasonality decomposition
- **LSTM (Long Short-Term Memory)** — PyTorch recurrent neural network for non-linear patterns
- **Prophet** — trend + seasonality decomposition (Facebook / Meta)
- **12-month forward forecasts** with confidence intervals
- **Anomaly alerts** — automatic flagging of months deviating significantly from forecasts

### 🕵️ Module 5 — Détection de Fraude (Fraud Detection)
Unsupervised anomaly detection on claims characteristics:
- **DBSCAN** — density-based clustering to isolate outlier claims (potential fraud)
- **KMeans** — behavioral segmentation of claimants
- **Real-time scoring** — new claim scored instantly on submission
- **Risk profiling** — visualization of high-risk claim profiles

### 📄 Module 6 — SinistrIA (Smart Claims Declaration)
AI-powered accident report processing:
- **EasyOCR + pytesseract** — automatic text extraction from scanned documents (license plates, VIN, driver name, permit number, registration card)
- **CNN (Convolutional Neural Network)** — classification of hand-drawn accident sketches from the French/Tunisian "Constat à l'Amiable" form into accident types: rear impact, intersection, parking, lane crossing, etc.
- **Liability determination** — automatic responsibility assignment per CGA/IDA convention based on sketch classification
- **Multi-document processing** — handles accident report, driving license and registration card simultaneously

### 📷 Module 7 — PhotoCar (Vehicle Damage Assessment)
Repair cost estimation from a single vehicle photo:
- **YOLOv8 (Ultralytics)** — fine-tuned object detection model identifying damaged parts: bumper, fender, hood, door, windshield, headlight, mirror
- **XGBoost cost estimator** — predicts repair cost in TND (Tunisian Dinar) from detected damage zones
- **SHAP visualization** — shows exactly which damaged parts drive the cost estimate up or down
- **Confidence scores** — detection probability per damaged component

### 🤖 Module 8 — Assistant IA (RAG Chatbot)
Specialized generative AI assistant for actuarial and insurance knowledge:
- **Architecture** — Retrieval-Augmented Generation (RAG) combining TF-IDF / FAISS vector search with LLM generation
- **Knowledge base** — indexed PDF documents: CGA circulars, IFRS 17 standard, annual reports, bonus-malus tables, tariff schedules
- **LLM** — Llama 3.3 70B via Groq API (ultra-low latency inference)
- **Source citation** — every answer references the exact document and page it was retrieved from
- **Example queries** — *"How does the IBNR mechanism work?"*, *"What are the exclusion clauses for theft coverage?"*, *"Explain IFRS 17 CSM calculation"*

---

## 🏗️ Tech Stack

### Backend
| Technology | Version | Role |
|---|---|---|
| **Python** | 3.10+ | Core language |
| **FastAPI** | 0.110+ | REST API framework, async ML inference serving |
| **Uvicorn** | latest | ASGI production server |
| **SQLAlchemy** | 2.x | Database ORM |
| **PostgreSQL** | 14+ | Relational database (users, claims, audit logs) |
| **Pydantic** | v2 | Request/response validation & schemas |
| **python-dotenv** | latest | Environment variable management |

### Machine Learning & Actuarial Science
| Technology | Role |
|---|---|
| **XGBoost** | Pricing (frequency & severity), IBNR reserving, repair cost estimation |
| **scikit-learn** | GLM, KMeans, DBSCAN, preprocessing pipelines, Lorenz curve |
| **pandas / numpy** | Data manipulation, triangle calculations, actuarial aggregations |
| **SHAP** | Model explainability — feature importance for every prediction |
| **statsmodels** | ARIMA / SARIMA time series modeling |
| **scipy** | Statistical distributions (Poisson, Gamma, Tweedie) |

### Deep Learning
| Technology | Role |
|---|---|
| **PyTorch** | CANN (Combined Actuarial Neural Network), LSTM forecasting, CNN sketch classifier |
| **torchvision** | CNN architecture for accident sketch classification |

### Computer Vision & Document Processing
| Technology | Role |
|---|---|
| **Ultralytics YOLOv8** | Vehicle damage detection — fine-tuned on automotive damage dataset |
| **EasyOCR** | Deep learning-based OCR for French/Arabic accident report extraction |
| **pytesseract** | Tesseract OCR wrapper for structured document fields |
| **Pillow / OpenCV** | Image preprocessing and augmentation |

### Generative AI & NLP
| Technology | Role |
|---|---|
| **LangChain** | RAG orchestration pipeline |
| **FAISS** | Dense vector similarity search over document embeddings |
| **TF-IDF (scikit-learn)** | Sparse retrieval fallback for keyword-based search |
| **Groq API** | Ultra-fast LLM inference (Llama 3.3 70B) |
| **PyMuPDF / pdfplumber** | PDF text extraction and chunking |

### Frontend
| Technology | Role |
|---|---|
| **HTML5 / CSS3** | Responsive SPA with Glassmorphism design system |
| **Vanilla JavaScript (ES6+)** | Dynamic UI, API calls, state management |
| **ApexCharts** | Interactive charts (bar, line, donut, heatmap, area) |
| **Static serving via FastAPI** | No separate frontend server — served directly by the backend |

---

## 📁 Directory Structure

```
actuwise_app/
│
├── backend/
│   ├── main.py                      # FastAPI app — startup, middleware, static files, lifespan
│   ├── database.py                  # SQLAlchemy engine & session factory
│   ├── models_db.py                 # ORM models (User, Claim, AuditLog)
│   │
│   ├── routers/                     # API route modules
│   │   ├── auth.py                  # JWT login / logout / token refresh
│   │   ├── dashboard.py             # Module 1 — KPIs & portfolio analytics
│   │   ├── provisionnement.py       # Module 2 — IBNR reserving endpoints
│   │   ├── tarification.py          # Module 3 — Pricing & scoring
│   │   ├── bonus_malus.py           # Bonus-Malus CGA scale logic
│   │   ├── series_temporelles.py    # Module 4 — Forecasting
│   │   ├── fraude.py                # Module 5 — Fraud detection
│   │   ├── sinistria.py             # Module 6 — OCR + CNN claims
│   │   ├── photocar.py              # Module 7 — YOLO damage assessment
│   │   └── chatbot.py               # Module 8 — RAG assistant
│   │
│   ├── services/                    # Business logic & ML inference layer
│   │   ├── data_loader.py           # CSV dataset loading & caching
│   │   ├── model_loader.py          # ML model loading at startup
│   │   ├── model_selector.py        # Automatic best-model selection
│   │   ├── rag_service.py           # RAG pipeline (retrieval + generation)
│   │   └── ocr_service.py           # OCR extraction logic
│   │
│   ├── schemas/                     # Pydantic input/output schemas
│   ├── models/                      # Trained ML model files (excluded from git — see .gitignore)
│   ├── data/                        # CSV actuarial datasets (excluded from git)
│   ├── documents_rag/               # PDF knowledge base for RAG indexing
│   ├── faiss_index/                 # Auto-generated FAISS vector index
│   ├── app/models/                  # XGBoost JSON model artifacts
│   └── requirements.txt
│
├── frontend/
│   └── public/
│       ├── login.html               # Authentication page
│       ├── app.html                 # Main SPA — all 8 modules
│       ├── dashboard.html           # Strategic dashboard
│       └── js/
│           ├── dashboard-dynamic.js # Dashboard charts & KPI logic
│           └── ...                  # Module-specific JS
│
├── docs/                            # Architecture diagrams & UI screenshots
├── notebooks/                       # Jupyter notebooks for model training & EDA
├── fraude_pipeline/                 # Standalone fraud detection pipeline scripts
├── photocnn/                        # YOLO & CNN training scripts
├── sinistre/                        # SinistrIA training data & model scripts
│
├── run.bat                          # Windows one-click launcher (port 8000)
├── start.bat                        # Full-stack launcher (backend + frontend)
├── install.bat                      # Automated setup (venv + pip install)
└── README.md
```

---

## 🚀 Getting Started

### Prerequisites

- **Python 3.10+** — [Download](https://www.python.org/downloads/)
- **PostgreSQL 14+** — [Download](https://www.postgresql.org/download/) (or use SQLite for local dev)
- **Groq API key** — [Get one free](https://console.groq.com) (required for the AI Assistant module)
- **Git** — to clone the repository

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/Sarra-BenAttia/Actuwise.git
cd Actuwise
```

**Option A — Automated setup (Windows)**
```bash
install.bat   # creates venv, installs all dependencies
run.bat       # starts the server on port 8000
```

**Option B — Manual setup**
```bash
# 2. Create and activate a virtual environment
cd backend
python -m venv venv
venv\Scripts\activate        # Windows
source venv/bin/activate     # Linux / macOS

# 3. Install all dependencies
pip install -r requirements.txt

# 4. Configure environment variables
copy .env.example .env
# Open .env and fill in:
#   GROQ_API_KEY=your_groq_key_here
#   DATABASE_URL=postgresql://user:password@localhost:5432/actuwise
#   SECRET_KEY=your_jwt_secret

# 5. Start the server
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

### Access the Application

| URL | Description |
|---|---|
| http://localhost:8000/login.html | Application login page |
| http://localhost:8000/app.html | Main platform (all 8 modules) |
| http://localhost:8000/dashboard.html | Strategic dashboard |
| http://localhost:8000/docs | Swagger UI — full API documentation |
| http://localhost:8000/redoc | ReDoc — alternative API docs |

**Default credentials:**
```
Email    : actuaire@actuwise.com
Password : admin123
```

---

## 📊 Key Results & Model Performance

| Module | Task | Model | Metric | Result |
|---|---|---|---|---|
| **M2 — Reserving** | IBNR estimation | Chain-Ladder | — | Selected as primary method |
| **M3 — Pricing** | Pure premium | XGBoost (Tweedie) | Gini coefficient | **0.329** |
| **M3 — Pricing** | Pure premium | GLM (Poisson/Gamma) | Gini coefficient | 0.247 |
| **M3 — Pricing** | Pure premium | CANN (PyTorch) | Gini coefficient | benchmark |
| **M5 — Fraud** | Anomaly detection | DBSCAN | — | Unsupervised clustering |
| **M7 — PhotoCar** | Damage detection | YOLOv8 | mAP | Fine-tuned |
| **M8 — RAG** | Answer retrieval | FAISS + Llama 3.3 | — | Source-cited answers |

> XGBoost was automatically selected over GLM and CANN based on the highest Gini coefficient in the benchmark evaluation.

---

## 🔐 Environment Variables

Create a `.env` file in the `backend/` folder based on `.env.example`:

```env
# AI Assistant
GROQ_API_KEY=your_groq_api_key_here

# Database
DATABASE_URL=postgresql://postgres:password@localhost:5432/actuwise

# Authentication
SECRET_KEY=your_secret_key_for_jwt
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60
```

---

## 🎓 Acknowledgments

This project was developed as a **3rd-year internship** in Actuarial Science & Data Science, Tunis, Tunisia.

It was designed to demonstrate how classical actuarial mathematics and modern Artificial Intelligence can converge into a single production-ready platform — reducing claims processing time, improving reserve accuracy, and delivering fully explainable pricing decisions to non-life insurance companies.

---

*Built with passion for Actuarial Science and AI.* 📊🤖
