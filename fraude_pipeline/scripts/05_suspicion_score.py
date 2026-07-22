"""
05_suspicion_score.py

Combine `score_regles_metier` (0-4) et le flag d'anomalie DBSCAN en un
score de suspicion final pondéré, compare le pouvoir de détection de ce
score à une sélection aléatoire de même taille, et produit un top N de
dossiers prioritaires pour contrôle humain.

Exécution :
    python 05_suspicion_score.py

Entrée  : data/04_anomaly.parquet
Sorties :
    data/05_suspicion_final.parquet   (dataset final avec score et rang)
    outputs/top_dossiers_prioritaires.csv

Pondération (voir résumé_limites.md pour la discussion) :
    score_suspicion = W_REGLES * (score_regles_metier / 4) + W_ANOMALIE * dbscan_anomalie

    W_REGLES = 0.5, W_ANOMALIE = 0.5 par défaut : poids égal entre le
    signal métier (règles expertes) et le signal statistique (DBSCAN),
    car ce sont deux sources d'information indépendantes et complémentaires
    (peu de recouvrement observé à l'étape 4 — voir la matrice croisée
    imprimée en console). Ajustable en tête de script sans toucher au
    reste du pipeline.

    NB: score_regles_metier est dominé en volume par la règle R7
    (fréquence élevée de petits sinistres, ~32% des dossiers) — voir
    résumé_limites.md pour la recommandation de re-pondérer les règles
    individuellement si l'expert sinistre le juge nécessaire.
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

import numpy as np
import pandas as pd

from utils import DATA_DIR, OUTPUTS_DIR, log, section

W_REGLES = 0.5
W_ANOMALIE = 0.5
TOP_N = 200
RANDOM_SEED = 42


def main():
    section("1/4 — Chargement du dataset")
    df = pd.read_parquet(DATA_DIR / "04_anomaly.parquet")
    log(f"Dataset chargé : {len(df):,} lignes".replace(",", " "))

    section("2/4 — Score de suspicion final")
    log(f"Pondération : score_regles_metier (poids={W_REGLES}) + dbscan_anomalie (poids={W_ANOMALIE})")
    df["score_suspicion"] = (
        W_REGLES * (df["score_regles_metier"] / 4.0) + W_ANOMALIE * df["dbscan_anomalie"]
    )
    log("\nDistribution de score_suspicion :")
    log(df["score_suspicion"].describe().to_string())

    log("\nRecoupement règles / anomalie DBSCAN (pour vérifier la complémentarité des 2 signaux) :")
    log(pd.crosstab(df["score_regles_metier"], df["dbscan_anomalie"],
                     rownames=["score_regles_metier"], colnames=["dbscan_anomalie"]).to_string())

    # score_suspicion est quasi-discret (peu de valeurs possibles : 5
    # niveaux de score_regles_metier x 2 flags DBSCAN). Un rang basé
    # uniquement dessus produit énormément d'ex-aequo, ce qui rend un
    # "top N" strict peu significatif. On ajoute donc un critère de
    # départage continu (ampleur de l'écart SAP/règlement, en valeur
    # absolue) pour obtenir un classement fin et un top N réellement
    # composé de N dossiers, sans changer le score_suspicion lui-même.
    df["_depart_tie"] = df["ecart_sap_reglement"].abs().fillna(0)
    df = df.sort_values(["score_suspicion", "_depart_tie"], ascending=[False, False]).reset_index(drop=True)
    df["rang_suspicion"] = np.arange(1, len(df) + 1)
    n_ties_score_only = int((df["score_suspicion"] == df["score_suspicion"].iloc[TOP_N - 1]).sum())
    log(f"NB: {n_ties_score_only} dossiers partagent le même score_suspicion que le {TOP_N}e "
        "dossier -> un critère de départage (écart SAP/règlement absolu) a été appliqué pour "
        "obtenir un top N précis ; le score_suspicion affiché reste, lui, inchangé.")
    df = df.drop(columns=["_depart_tie"])

    section("3/4 — Comparaison au hasard (gain de détection)")
    rng = np.random.default_rng(RANDOM_SEED)
    top_n = df.head(TOP_N)
    random_idx = rng.choice(df.index, size=min(TOP_N, len(df)), replace=False)
    random_sample = df.loc[random_idx]

    def summarize(sample: pd.DataFrame, label: str):
        n_regle = int((sample["score_regles_metier"] >= 1).sum())
        n_anom = int(sample["dbscan_anomalie"].sum())
        n_both = int(((sample["score_regles_metier"] >= 1) & (sample["dbscan_anomalie"] == 1)).sum())
        log(f"{label:35s} (n={len(sample)}): "
            f"règle déclenchée={n_regle} ({n_regle/len(sample):.1%}), "
            f"anomalie DBSCAN={n_anom} ({n_anom/len(sample):.1%}), "
            f"les deux={n_both} ({n_both/len(sample):.1%})")

    summarize(top_n, f"Top {TOP_N} (score_suspicion)")
    summarize(random_sample, f"Échantillon aléatoire (n={TOP_N})")

    baseline_rate = (df["score_regles_metier"] >= 1).mean()
    topn_rate = (top_n["score_regles_metier"] >= 1).mean()
    if baseline_rate > 0:
        gain = topn_rate / baseline_rate
        log(f"\nGain vs taux de base sur toute la population "
            f"({baseline_rate:.1%}) : x{gain:.1f} de dossiers avec règle déclenchée "
            f"dans le top {TOP_N}")

    section(f"4/4 — Top {TOP_N} dossiers prioritaires")
    rule_cols = [
        "R1_sinistre_grave_precoce",
        "R3_vehicule_ancien_tierce",
        "R4_ecart_sap_eleve",
        "R7_frequence_petits_sinistres",
    ]
    cols_export = [
        "TMP_CLMEXT_CDE", "TMP_POLEXT_CDE", "TMP_CLMLOSS_DATE", "TRANS_TYPE_DESC",
        "jointure_qualite", "score_regles_metier", *rule_cols,
        "dbscan_anomalie", "dbscan_cluster", "kmeans_segment",
        "score_suspicion", "rang_suspicion",
        "reg_amount_annee_concernee", "sap_annee_concernee", "ecart_sap_reglement",
        "anciennete_vehicule", "age_assure", "delai_souscription_sinistre_j",
        "nb_petits_sinistres_police",
    ]
    top_export = top_n[cols_export].copy()
    log(f"Aperçu des 10 dossiers les plus suspects :")
    log(top_export.head(10).to_string(index=False))

    out_parquet = DATA_DIR / "05_suspicion_final.parquet"
    export_df = df.copy()
    for c in export_df.columns:
        if export_df[c].dtype == object or pd.api.types.is_string_dtype(export_df[c]):
            export_df[c] = export_df[c].astype("string")
    export_df.to_parquet(out_parquet, index=False)
    log(f"\nDataset final complet exporté : {out_parquet}  ({export_df.shape[0]:,} x {export_df.shape[1]})".replace(",", " "))

    out_csv = OUTPUTS_DIR / "top_dossiers_prioritaires.csv"
    top_export.to_csv(out_csv, index=False, encoding="utf-8-sig")
    log(f"Top {TOP_N} dossiers prioritaires exporté : {out_csv}")

    log("\nPipeline de scripts terminé. Voir README.md pour l'usage du formulaire de déploiement.")


if __name__ == "__main__":
    main()
