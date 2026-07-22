"""
Constantes du modele de tarification, figees a partir des donnees
d'entrainement (voir pipeline_modelisation.py). Ne pas recalculer ces
valeurs sur un nouveau jeu de donnees sans re-entrainer le modele.
"""

MODEL_PATH = "app/models/xgb_tweedie_model.json"

# Ordre EXACT des colonnes attendu par le modele (numeriques puis categorielles)
FEAT_NUM = ["driver_age", "vehicle_age", "Puissance fiscale", "Valeur venale", "Classe BM"]
FEAT_CAT = ["Usage", "CLI_SEX", "Region", "Energie"]
FEATURE_ORDER = FEAT_NUM + FEAT_CAT

# Valeurs medianes d'entrainement, utilisees pour imputer les valeurs manquantes
MEDIANS = {
    "driver_age": 47.0,
    "vehicle_age": 7.0,
    "Valeur venale": 30000.0,
}

# Bornes de validation (memes regles que la preparation des donnees)
BOUNDS = {
    "driver_age": (16, 100),
    "vehicle_age": (0, 40),
    "Classe BM": (1, 11),
}

# Categories valides vues a l'entrainement (categories inconnues -> "Inconnu" si applicable,
# sinon rejeter la requete)
CATEGORIES = {
    "Usage": ["Promenade et affaire", "Utilitaire I"],
    "CLI_SEX": ["F", "M", "Inconnu"],
    "Region": [
        "ARIANA", "BEJA", "BEN AROUS", "BIZERTE", "GABES", "GAFSA", "Inconnu",
        "JENDOUBA", "KAIROUAN", "KASSERINE", "KEBILI", "KEF", "MAHDIA", "MANOUBA",
        "MEDENINE", "MONASTIR", "NABEUL", "SFAX", "SIDI BOUZID", "SILIANA",
        "SOUSSE", "TATAOUINE", "TOZEUR", "TUNIS", "ZAGHOUAN",
    ],
    "Energie": ["Diesel", "Electrique", "Essence", "Gaz", "HYBRIDE"],
}

# Facteur de calibrage global (aligne le cout total predit sur le cout total observe)
CALIBRATION_FACTOR = 1.0823643254507151
