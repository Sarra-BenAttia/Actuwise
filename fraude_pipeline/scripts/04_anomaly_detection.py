"""
04_anomaly_detection.py

Détection non supervisée d'anomalies (DBSCAN) sur les features numériques
standardisées, indépendamment des règles métier. Un K-Means complémentaire
est ajouté pour segmenter les profils en groupes interprétables.

Exécution :
    python 04_anomaly_detection.py

Entrée  : data/03_rules.parquet
Sorties :
    data/04_anomaly.parquet     (dataset + flag anomalie DBSCAN + cluster K-Means)
    models/scaler.pkl           (StandardScaler entraîné, réutilisé en déploiement)
    models/dbscan_model.pkl     (modèle DBSCAN entraîné)
    models/kmeans_model.pkl     (modèle K-Means entraîné)
    models/feature_columns.pkl  (liste ordonnée des features utilisées, pour le
                                  formulaire de déploiement)

Features utilisées (numériques, dérivées à l'étape 2, imputées par la
médiane quand nécessaire — l'imputation est documentée, pas silencieuse) :
    age_assure, anciennete_vehicule, delai_declaration_survenance_j,
    delai_souscription_sinistre_j, nb_sinistres_police,
    reg_amount_annee_concernee, sap_annee_concernee, ecart_sap_reglement,
    nb_petits_sinistres_police

NB: montant_regle_normalise est exclu des features DBSCAN car il est déjà
dérivé de reg_amount_annee_concernee (redondance/colinéarité) ; il reste
disponible dans le dataset pour l'explicabilité.
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

import pickle

import numpy as np
import pandas as pd
from sklearn.cluster import DBSCAN, KMeans
from sklearn.neighbors import NearestNeighbors
from sklearn.preprocessing import StandardScaler

from utils import DATA_DIR, MODELS_DIR, log, section

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

N_KMEANS_CLUSTERS = 4


def choose_dbscan_eps(X: np.ndarray, min_samples: int) -> float:
    """Heuristique du 'coude' sur la distance au k-ième plus proche voisin
    (méthode standard pour choisir eps en DBSCAN), plutôt qu'une valeur
    d'eps arbitraire."""
    nn = NearestNeighbors(n_neighbors=min_samples)
    nn.fit(X)
    distances, _ = nn.kneighbors(X)
    k_distances = np.sort(distances[:, -1])
    # coude approximé par le point de courbure maximale (méthode simple,
    # documentée) : on prend le 90e percentile des k-distances comme eps,
    # un choix pragmatique et reproductible.
    eps = float(np.percentile(k_distances, 90))
    return eps, k_distances


def main():
    section("1/4 — Chargement et préparation des features")
    df = pd.read_parquet(DATA_DIR / "03_rules.parquet")
    log(f"Dataset chargé : {len(df):,} lignes".replace(",", " "))

    X_raw = df[FEATURE_COLS].copy()
    log("Valeurs manquantes par feature (avant imputation) :")
    na_counts = X_raw.isna().sum()
    for col, n in na_counts[na_counts > 0].items():
        log(f"  - {col}: {n:,} ({n/len(df):.1%})".replace(",", " "))

    medians = X_raw.median()
    X_imputed = X_raw.fillna(medians)
    log("\nImputation par la médiane appliquée (valeurs utilisées, pour traçabilité) :")
    for col, val in medians.items():
        if na_counts.get(col, 0) > 0:
            log(f"  - {col}: médiane={val:.2f}")

    section("2/4 — Standardisation")
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X_imputed.to_numpy())
    log(f"Features standardisées : {X_scaled.shape[0]:,} x {X_scaled.shape[1]} colonnes".replace(",", " "))

    section("3/4 — DBSCAN")
    min_samples = max(5, int(0.001 * len(df)))  # data-driven, borne basse à 5
    eps, k_distances = choose_dbscan_eps(X_scaled, min_samples)
    log(f"min_samples={min_samples} (0.1% de l'effectif, borné à 5 min)")
    log(f"eps={eps:.3f} (P90 des distances au {min_samples}-ième plus proche voisin)")

    dbscan = DBSCAN(eps=eps, min_samples=min_samples)
    labels = dbscan.fit_predict(X_scaled)
    n_clusters = len(set(labels)) - (1 if -1 in labels else 0)
    n_noise = int((labels == -1).sum())
    log(f"\nDBSCAN terminé : {n_clusters} clusters trouvés, {n_noise:,} points classés 'bruit' "
        f"({n_noise/len(df):.1%})".replace(",", " "))

    df["dbscan_cluster"] = labels
    df["dbscan_anomalie"] = (labels == -1).astype(int)

    if n_clusters > 0:
        log("\nTaille des clusters (hors bruit) :")
        cluster_sizes = pd.Series(labels[labels >= 0]).value_counts().sort_index()
        for c, n in cluster_sizes.items():
            log(f"  cluster {c}: {n:,} ({n/len(df):.1%})".replace(",", " "))

    # Si eps=P90 produit un DBSCAN dégénéré (tout en un cluster ou tout en
    # bruit), le documenter clairement plutôt que de le cacher.
    if n_clusters <= 1:
        log("\nATTENTION : DBSCAN ne trouve qu'un seul cluster (ou aucun) avec ce paramétrage. "
            "Le flag 'dbscan_anomalie' reste utilisable (points de bruit = atypiques) mais "
            "la segmentation en clusters n'est pas informative ici — voir résumé_limites.md.")

    section("4/4 — K-Means complémentaire (segmentation interprétable)")
    kmeans = KMeans(n_clusters=N_KMEANS_CLUSTERS, random_state=42, n_init=10)
    km_labels = kmeans.fit_predict(X_scaled)
    df["kmeans_segment"] = km_labels
    log(f"K-Means ({N_KMEANS_CLUSTERS} segments) terminé.")
    log("Taille des segments K-Means :")
    for c, n in pd.Series(km_labels).value_counts().sort_index().items():
        log(f"  segment {c}: {n:,} ({n/len(df):.1%})".replace(",", " "))

    log("\nProfil moyen des segments K-Means (features non standardisées) :")
    profile = X_imputed.groupby(km_labels).mean()
    log(profile.round(1).to_string())

    section("Export")
    out = DATA_DIR / "04_anomaly.parquet"
    export_df = df.copy()
    for c in export_df.columns:
        if export_df[c].dtype == object or pd.api.types.is_string_dtype(export_df[c]):
            export_df[c] = export_df[c].astype("string")
    export_df.to_parquet(out, index=False)
    log(f"Dataset avec flags d'anomalie exporté : {out}  ({export_df.shape[0]:,} x {export_df.shape[1]})".replace(",", " "))

    with open(MODELS_DIR / "scaler.pkl", "wb") as f:
        pickle.dump(scaler, f)
    with open(MODELS_DIR / "dbscan_model.pkl", "wb") as f:
        pickle.dump(dbscan, f)
    with open(MODELS_DIR / "kmeans_model.pkl", "wb") as f:
        pickle.dump(kmeans, f)
    with open(MODELS_DIR / "feature_columns.pkl", "wb") as f:
        pickle.dump({"columns": FEATURE_COLS, "medians": medians.to_dict()}, f)
    log(f"\nModèles sauvegardés dans {MODELS_DIR} : scaler.pkl, dbscan_model.pkl, "
        "kmeans_model.pkl, feature_columns.pkl")
    log("\nProchaine étape : python 05_suspicion_score.py")


if __name__ == "__main__":
    main()
