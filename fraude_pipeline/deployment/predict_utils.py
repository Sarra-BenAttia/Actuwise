"""
predict_utils.py

Logique de scoring d'un nouveau dossier saisi via le formulaire :
- recalcule les 4 règles métier (mêmes seuils que 03_rules_scoring.py)
- recalcule les features numériques nécessaires au DBSCAN
- charge scaler.pkl + dbscan_model.pkl et prédit si le dossier est une
  anomalie (DBSCAN ne supporte pas nativement .predict() sur un nouveau
  point : on implémente la règle standard "distance au point-coeur le
  plus proche <= eps => pas une anomalie", décrite dans la doc DBSCAN)
- combine en score_suspicion avec la même pondération que 05_suspicion_score.py

Toute erreur de saisie (date mal formée, champ numérique invalide, champ
obligatoire manquant) est renvoyée sous forme de dict {"erreurs": [...]}
plutôt que de lever une exception non gérée.
"""

from __future__ import annotations

import pickle
from datetime import date, datetime
from pathlib import Path

import numpy as np

MODELS_DIR = Path(__file__).resolve().parent.parent / "models"

# --- mêmes seuils que scripts/03_rules_scoring.py et 05_suspicion_score.py ---
SAP_ECART_THRESHOLD = 90_000
SMALL_CLAIM_THRESHOLD = 500
EARLY_CLAIM_DAYS = 14
OLD_VEHICLE_YEARS = 15
REG_AMOUNT_P90_ELEVE = 950  # seuil calculé sur les données d'entraînement (voir résumé_limites.md)
FREQ_PETITS_SINISTRES_SEUIL = 5  # idem (P90 observé à l'entraînement)
W_REGLES = 0.5
W_ANOMALIE = 0.5

FEATURE_COLS = [
    "age_assure",
    "anciennete_vehicule",
    "delai_declaration_survenance_j",
    "delai_souscription_sinistre_j",
    "nb_sinistres_police",
    "reg_amount_annee_concernee",
    "sap_annee_concernee",
    "ecart_sap_reglement",
    "nb_petits_sinistres_police",
]


_models_cache = {}


def load_models():
    if not _models_cache:
        with open(MODELS_DIR / "scaler.pkl", "rb") as f:
            _models_cache["scaler"] = pickle.load(f)
        with open(MODELS_DIR / "dbscan_model.pkl", "rb") as f:
            _models_cache["dbscan"] = pickle.load(f)
        with open(MODELS_DIR / "feature_columns.pkl", "rb") as f:
            _models_cache["feature_meta"] = pickle.load(f)
    return _models_cache


def parse_date(value: str, field_name: str, errors: list) -> date | None:
    if not value:
        errors.append(f"Le champ '{field_name}' est obligatoire.")
        return None
    for fmt in ("%Y-%m-%d", "%d/%m/%Y"):
        try:
            return datetime.strptime(value.strip(), fmt).date()
        except ValueError:
            continue
    errors.append(f"Le champ '{field_name}' n'est pas une date valide (format attendu AAAA-MM-JJ) : '{value}'")
    return None


def parse_float(value: str, field_name: str, errors: list, required: bool = True, default: float = 0.0) -> float:
    if value is None or str(value).strip() == "":
        if required:
            errors.append(f"Le champ '{field_name}' est obligatoire.")
            return None
        return default
    try:
        return float(str(value).replace(",", "."))
    except ValueError:
        errors.append(f"Le champ '{field_name}' doit être un nombre valide : '{value}'")
        return None


def parse_int(value: str, field_name: str, errors: list, required: bool = True, default: int = 0) -> int:
    f = parse_float(value, field_name, errors, required=required, default=default)
    if f is None:
        return None
    return int(f)


def dbscan_predict_new_point(x_scaled_row: np.ndarray, dbscan) -> bool:
    """
    DBSCAN (scikit-learn) n'a pas de méthode .predict() pour de nouveaux
    points : le modèle est transductif. On applique la règle standard
    utilisée en pratique pour scorer un nouveau point avec un DBSCAN déjà
    entraîné : si la distance euclidienne au point-coeur (core sample) le
    plus proche est <= eps, le point est considéré comme faisant partie
    du même voisinage dense (pas une anomalie) ; sinon, il est traité
    comme du bruit (anomalie).

    Retourne True si le dossier est classé "anomalie".
    """
    core_points = dbscan.components_  # points-coeurs identifiés à l'entraînement
    if core_points.shape[0] == 0:
        # Aucun point-coeur (cas dégénéré) -> impossible de statuer, on
        # considère prudemment comme anomalie pour ne pas rater un dossier atypique
        return True
    dists = np.linalg.norm(core_points - x_scaled_row, axis=1)
    return bool(dists.min() > dbscan.eps)


def score_dossier(form: dict) -> dict:
    """
    form: dict des champs saisis (voir app.py pour la liste exacte).
    Retourne soit {"erreurs": [...]}, soit le détail complet du scoring.
    """
    errors: list[str] = []

    date_naissance = parse_date(form.get("date_naissance", ""), "Date de naissance", errors)
    date_mise_circulation = parse_date(form.get("mtr_use_start_date", ""), "Date de mise en circulation du véhicule", errors)
    date_souscription = parse_date(form.get("pol_start_date", ""), "Date de souscription (POL_START_DATE)", errors)
    date_survenance = parse_date(form.get("clmloss_date", ""), "Date de survenance du sinistre", errors)
    date_declaration = parse_date(form.get("clm_reported_date", ""), "Date de déclaration", errors)

    tmp_type = form.get("tmp_type", "")
    if tmp_type not in ("C", "M", "D"):
        errors.append(f"TMP_TYPE doit être C, M ou D (reçu: '{tmp_type}')")

    trans_type_desc = form.get("trans_type_desc", "")
    if not trans_type_desc:
        errors.append("Le type de garantie (TRANS_TYPE_DESC) est obligatoire.")

    reg_amount = parse_float(form.get("reg_amount", ""), "Montant réglé estimé (REG_AMOUNT)", errors)
    sap_amount = parse_float(form.get("sap_amount", ""), "Provision estimée (SAP)", errors, required=False, default=0.0)
    nb_sinistres_police = parse_int(form.get("nb_sinistres_police", ""), "Nombre de sinistres déjà connus sur la police", errors, required=False, default=0)
    nb_petits_sinistres_police = parse_int(form.get("nb_petits_sinistres_police", ""), "Nombre de sinistres <=500 DT déjà connus sur la police", errors, required=False, default=0)

    if errors:
        return {"erreurs": errors}

    # --- features dérivées, mêmes formules que 02_feature_engineering.py ---
    age_assure = (date_survenance - date_naissance).days / 365.25
    anciennete_vehicule = (date_survenance - date_mise_circulation).days / 365.25
    delai_declaration_survenance_j = (date_declaration - date_survenance).days
    delai_souscription_sinistre_j = (date_survenance - date_souscription).days
    ecart_sap_reglement = sap_amount - reg_amount

    # --- 4 règles métier (mêmes seuils que 03_rules_scoring.py) ---
    is_grave = (tmp_type == "C") or (abs(reg_amount) >= REG_AMOUNT_P90_ELEVE)
    is_early = 0 <= delai_souscription_sinistre_j < EARLY_CLAIM_DAYS
    r1 = int(is_grave and is_early)

    is_old_vehicle = anciennete_vehicule >= OLD_VEHICLE_YEARS
    is_tierce_collision = ("tierce" in trans_type_desc.lower()) or ("dommages collision" in trans_type_desc.lower())
    r3 = int(is_old_vehicle and is_tierce_collision)

    r4 = int(abs(ecart_sap_reglement) >= SAP_ECART_THRESHOLD)

    r7 = int(nb_petits_sinistres_police >= FREQ_PETITS_SINISTRES_SEUIL)

    score_regles_metier = r1 + r3 + r4 + r7

    # --- DBSCAN ---
    models = load_models()
    scaler = models["scaler"]
    dbscan = models["dbscan"]
    medians = models["feature_meta"]["medians"]

    feature_values = {
        "age_assure": age_assure,
        "anciennete_vehicule": anciennete_vehicule,
        "delai_declaration_survenance_j": delai_declaration_survenance_j,
        "delai_souscription_sinistre_j": delai_souscription_sinistre_j,
        "nb_sinistres_police": nb_sinistres_police,
        "reg_amount_annee_concernee": reg_amount,
        "sap_annee_concernee": sap_amount,
        "ecart_sap_reglement": ecart_sap_reglement,
        "nb_petits_sinistres_police": nb_petits_sinistres_police,
    }
    # imputation par la médiane d'entraînement si une valeur est NaN (ex: âge
    # non calculable) -- documenté au retour de la fonction
    imputed_fields = []
    x_row = []
    for col in FEATURE_COLS:
        v = feature_values[col]
        if v is None or (isinstance(v, float) and np.isnan(v)):
            v = medians[col]
            imputed_fields.append(col)
        x_row.append(v)
    x_row = np.array(x_row, dtype=float).reshape(1, -1)
    x_scaled = scaler.transform(x_row)[0]

    dbscan_anomalie = dbscan_predict_new_point(x_scaled, dbscan)

    score_suspicion = W_REGLES * (score_regles_metier / 4.0) + W_ANOMALIE * int(dbscan_anomalie)

    return {
        "erreurs": [],
        "score_regles_metier": score_regles_metier,
        "regles_declenchees": {
            "R1_sinistre_grave_precoce": bool(r1),
            "R3_vehicule_ancien_tierce": bool(r3),
            "R4_ecart_sap_eleve": bool(r4),
            "R7_frequence_petits_sinistres": bool(r7),
        },
        "dbscan_anomalie": bool(dbscan_anomalie),
        "score_suspicion": round(score_suspicion, 3),
        "features_calculees": {k: round(v, 2) if isinstance(v, float) else v for k, v in feature_values.items()},
        "champs_imputes_par_mediane": imputed_fields,
    }
