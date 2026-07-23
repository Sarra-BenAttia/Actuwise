<p align="center">
  <img src="frontend/public/images/logoassurance.png" alt="ACTUWISE Logo" width="350" onerror="this.src='https://via.placeholder.com/350x120?text=ACTUWISE+Studio'"/>
</p>

<h1 align="center">ACTUWISE Studio — Plateforme d'Intelligence Actuarielle 🚀</h1>

<p align="center">
  <strong>Projet de fin d'études — Actuariat & Data Science</strong><br>
  <em>Une plateforme unifiée alliant Modélisation Actuarielle classique (Chain-Ladder, GLM), Machine Learning (XGBoost), Computer Vision (YOLOv8, CNN) et IA Générative (LLM RAG) pour l'assurance Non-Vie.</em>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Python-3.10+-blue?logo=python" alt="Python"/>
  <img src="https://img.shields.io/badge/FastAPI-0.110-009688?logo=fastapi" alt="FastAPI"/>
  <img src="https://img.shields.io/badge/XGBoost-ML-orange?logo=xgboost" alt="XGBoost"/>
  <img src="https://img.shields.io/badge/YOLOv8-Computer%20Vision-purple" alt="YOLOv8"/>
  <img src="https://img.shields.io/badge/RAG-LLM%20Groq-black" alt="RAG"/>
  <img src="https://img.shields.io/badge/License-MIT-green" alt="License"/>
</p>

---

## 📖 Overview

This project was developed as part of the final-year internship program in **Actuarial Science & Applied Data Science**.

**ACTUWISE Studio** is a fully functional, end-to-end actuarial intelligence platform applied to a Tunisian automobile insurance portfolio. It bridges traditional actuarial mathematics with state-of-the-art Artificial Intelligence to automate, accelerate and explain the core tasks of a non-life insurance company: pricing, reserving, claims management, and regulatory reporting.

The platform demonstrates how modern data science and generative AI can be integrated into actuarial workflows — reducing processing time, improving IBNR estimation accuracy, and delivering explainable predictions to technical and management teams.

---

## ✨ Features

- 📊 **Strategic Dashboard** — KPI monitoring (Loss Ratio, Combined Ratio, Claims Frequency, Average Cost) with dynamic ApexCharts visualizations
- 🔢 **IBNR Reserving (Module 2)** — Chain-Ladder, Bornhuetter-Ferguson, Cape Cod methods on development triangles
- 🎯 **Predictive Pricing (Module 3)** — Pure Premium modeling via GLM (Poisson/Gamma) and XGBoost with Bonus-Malus logic and SHAP explainability
- 📈 **Time Series Forecasting (Module 4)** — ARIMA, SARIMA, LSTM neural network for claims frequency prediction
- 🕵️ **Fraud Detection** — DBSCAN + KMeans unsupervised anomaly detection on claims data
- 📷 **PhotoCar (Computer Vision)** — YOLOv8 damage detection on vehicle photos + XGBoost repair cost estimation
- 📄 **SinistrIA (OCR + CNN)** — Automated extraction from accident reports (plates, VIN, driver ID) + CNN sketch classification for liability determination
- 🤖 **AI Assistant (RAG)** — Retrieval-Augmented Generation chatbot over internal PDF documents (regulations, tariff schedules, IFRS 17 norms) powered by Llama 3.3 via Groq API

---

## 🏗️ Tech Stack

### Backend
| Technology | Role |
|---|---|
| **Python 3.10+** | Core language |
| **FastAPI** | REST API framework, async inference serving |
| **Uvicorn** | ASGI server |
| **SQLAlchemy + PostgreSQL** | Database ORM & persistence |
| **Pydantic** | Data validation & schemas |

### Machine Learning & Data Science
| Technology | Role |
|---|---|
| **XGBoost** | Pricing (frequency & severity), reserving, repair cost |
| **scikit-learn** | GLM, KMeans, DBSCAN, preprocessing pipelines |
| **pandas / numpy** | Data manipulation & actuarial calculations |
| **SHAP** | Model explainability (feature importance) |
| **statsmodels** | ARIMA / SARIMA time series models |
| **PyTorch** | CANN (Combined Actuarial Neural Network), LSTM, CNN |

### Computer Vision & NLP
| Technology | Role |
|---|---|
| **Ultralytics YOLOv8** | Vehicle damage detection (object detection) |
| **EasyOCR / pytesseract** | Text extraction from accident report documents |
| **LangChain + FAISS / TF-IDF** | RAG retrieval pipeline over PDF documents |
| **Groq API (Llama 3.3)** | Generative AI for the actuarial chatbot |

### Frontend
| Technology | Role |
|---|---|
| **HTML5 / CSS3 / Vanilla JS** | SPA interface with Glassmorphism design system |
| **ApexCharts** | Interactive data visualizations |
| **Static file serving via FastAPI** | No separate frontend server needed |

---

## 📁 Directory Structure

```
actuwise_app/
├── backend/
│   ├── main.py                  # FastAPI app entry point
│   ├── routers/                 # API route modules (pricing, reserving, fraud, photocar, rag…)
│   ├── services/                # Business logic & ML inference
│   ├── schemas/                 # Pydantic request/response models
│   ├── models/                  # Trained ML model files (excluded from git)
│   ├── data/                    # CSV datasets (excluded from git)
│   ├── documents_rag/           # PDF documents for RAG indexing
│   ├── faiss_index/             # FAISS vector index (auto-generated)
│   ├── database.py              # DB connection
│   └── requirements.txt
├── frontend/
│   └── public/
│       ├── login.html
│       ├── app.html             # Main SPA
│       ├── dashboard.html       # Strategic dashboard
│       └── js/                  # Dynamic chart scripts
├── docs/                        # Architecture diagrams & screenshots
├── run.bat                      # Windows one-click launcher
└── README.md
```

---

## 🚀 Getting Started

### Prerequisites
- Python 3.10+
- A [Groq API key](https://console.groq.com) (free tier available) for the AI Assistant

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/Sarra-BenAttia/Actuwise.git
cd Actuwise/backend

# 2. Create and activate a virtual environment
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # Linux / macOS

# 3. Install dependencies
pip install -r requirements.txt

# 4. Configure environment variables
cp .env.example .env
# Edit .env and set: GROQ_API_KEY=your_key_here

# 5. Start the backend
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

**On Windows**, you can also use the one-click launcher:
```bash
run.bat
```

### Access the Application
Once the backend is running, open your browser at:

👉 **http://localhost:8000/login.html**

```
Email    : actuaire@actuwise.com
Password : admin123
```

API documentation (Swagger UI): **http://localhost:8000/docs**

---

## 📊 Key Results

| Module | Method | Performance |
|---|---|---|
| **Reserving (M2)** | Chain-Ladder | Industry-standard IBNR estimation |
| **Pricing (M3)** | XGBoost vs GLM | Gini = 0.329 (XGBoost selected) |
| **Fraud Detection** | DBSCAN + KMeans | Unsupervised anomaly scoring |
| **Forecasting (M4)** | ARIMA + LSTM | Claims frequency prediction |

---

## 🎓 Acknowledgments

This project was developed as a final-year research internship in Actuarial Science & Data Science, Tunis, Tunisia.

It was designed to demonstrate the convergence of classical actuarial methods and modern Artificial Intelligence in a production-ready platform for non-life insurance companies.

---

*Built with passion for Actuarial Science and AI.* 📊🤖
