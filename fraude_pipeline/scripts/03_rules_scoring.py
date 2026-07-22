"""
03_rules_scoring.py

Implémente les 4 règles métier applicables (sur les 10 du rapport de
référence — les 6 autres nécessitent des champs absents des fichiers
fournis, voir résumé_limites.md) et construit `score_regles_metier`,
un score de 0 à 4 (nombre de règles déclenchées).

IMPORTANT : `score_regles_metier` est un signal faible ("weak label"),
PAS une confirmation de fraude. Il ne doit jamais être renommé `fraude`
ou `label_fraude` en aval (cf. README.md).

Exécution :
    python 03_rules_scoring.py

Entrée  : data/02_features.parquet
Sortie  : data/03_rules.parquet

Règles et seuils (tous data-driven, justifiés ci-dessous, jamais
inventés arbitrairement) :

  R1 — Sinistre grave < 14j après souscription
       grave = TMP_TYPE == 'C' (corporel) OU montant réglé (valeur absolue,
       année concernée) dans le décile supérieur (P90) des montants observés
       0 <= delai_souscription_sinistre_j < 14

  R3 — Véhicule ancien (>=15 ans) sur garantie Tierce / Dommages Collision
       anciennete_vehicule >= 15
       ET TRANS_TYPE_DESC contient "Tierce" ou "Dommages Collision"

  R4 — Écart SAP / règlement élevé
       |ecart_sap_reglement| >= 90 000 DT (seuil fourni par le rapport de référence)

  R7 — Fréquence élevée de petits sinistres (<=500 DT) sur la police
       nombre de sinistres <=500 DT (valeur absolue) sur la police, sur
       toute la période, >= seuil du 90e percentile de cette distribution
       (calculé sur les données, affiché en console)
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

import numpy as np
import pandas as pd

from utils import DATA_DIR, log, section

SAP_ECART_THRESHOLD = 90_000  # seuil fourni explicitement par le rapport de référence
SMALL_CLAIM_THRESHOLD = 500   # seuil "petit sinistre" fourni par le rapport de référence
EARLY_CLAIM_DAYS = 14         # seuil "précoce" fourni par le rapport de référence
OLD_VEHICLE_YEARS = 15        # seuil "véhicule ancien" fourni par le rapport de référence


def main():
    section("1/3 — Chargement du dataset enrichi")
    df = pd.read_parquet(DATA_DIR / "02_features.parquet")
    log(f"Dataset chargé : {len(df):,} lignes".replace(",", " "))

    section("2/3 — Calcul des 4 règles métier applicables")

    # ---- R1 : sinistre grave < 14j après souscription ----
    abs_reg = df["reg_amount_annee_concernee"].abs()
    p90_reg = abs_reg.quantile(0.90)
    log(f"R1 - seuil 'montant élevé' (P90 des montants réglés, valeur absolue) : {p90_reg:,.0f} DT".replace(",", " "))
    is_grave = (df["TMP_TYPE"] == "C") | (abs_reg >= p90_reg)
    is_early = df["delai_souscription_sinistre_j"].between(0, EARLY_CLAIM_DAYS - 1)
    df["R1_sinistre_grave_precoce"] = (is_grave & is_early).astype(int)
    log(f"R1_sinistre_grave_precoce déclenchée : {df['R1_sinistre_grave_precoce'].sum():,} "
        f"({df['R1_sinistre_grave_precoce'].mean():.1%})".replace(",", " "))

    # ---- R3 : véhicule ancien + garantie Tierce/Collision ----
    is_old_vehicle = df["anciennete_vehicule"] >= OLD_VEHICLE_YEARS
    is_tierce_collision = df["TRANS_TYPE_DESC"].str.contains(
        "Tierce|Dommages Collision", case=False, na=False, regex=True
    )
    df["R3_vehicule_ancien_tierce"] = (is_old_vehicle & is_tierce_collision).astype(int)
    log(f"R3_vehicule_ancien_tierce déclenchée : {df['R3_vehicule_ancien_tierce'].sum():,} "
        f"({df['R3_vehicule_ancien_tierce'].mean():.1%})".replace(",", " "))

    # ---- R4 : écart SAP / règlement élevé ----
    df["R4_ecart_sap_eleve"] = (df["ecart_sap_reglement"].abs() >= SAP_ECART_THRESHOLD).astype(int)
    log(f"R4_ecart_sap_eleve (seuil {SAP_ECART_THRESHOLD:,} DT) déclenchée : "
        f"{df['R4_ecart_sap_eleve'].sum():,} ({df['R4_ecart_sap_eleve'].mean():.1%})".replace(",", " "))

    # ---- R7 : fréquence élevée de petits sinistres ----
    is_small = abs_reg <= SMALL_CLAIM_THRESHOLD
    # une ligne par police = nombre de sinistres <=500 DT sur cette police
    policy_small_counts = df.loc[is_small].groupby("TMP_POLEXT_CDE")["TMP_CLMEXT_CDE"].nunique()
    df["nb_petits_sinistres_police"] = df["TMP_POLEXT_CDE"].map(policy_small_counts).fillna(0).astype(int)

    freq_threshold = int(policy_small_counts.quantile(0.90))
    freq_threshold = max(freq_threshold, 2)  # garde-fou : jamais en dessous de 2
    log(f"R7 - seuil 'fréquence élevée' (P90 du nb de petits sinistres/police, "
        f"parmi les polices concernées) : >= {freq_threshold}")
    df["R7_frequence_petits_sinistres"] = (df["nb_petits_sinistres_police"] >= freq_threshold).astype(int)
    log(f"R7_frequence_petits_sinistres déclenchée : {df['R7_frequence_petits_sinistres'].sum():,} "
        f"({df['R7_frequence_petits_sinistres'].mean():.1%})".replace(",", " "))

    section("3/3 — Score de règles métier (0 à 4)")
    rule_cols = [
        "R1_sinistre_grave_precoce",
        "R3_vehicule_ancien_tierce",
        "R4_ecart_sap_eleve",
        "R7_frequence_petits_sinistres",
    ]
    df["score_regles_metier"] = df[rule_cols].sum(axis=1)
    log("Distribution de score_regles_metier :")
    dist = df["score_regles_metier"].value_counts().sort_index()
    for score, n in dist.items():
        log(f"  score={score} : {n:,} sinistres ({n/len(df):.1%})".replace(",", " "))

    log(f"\nRAPPEL : score_regles_metier est un signal faible (règles heuristiques), "
        f"PAS une confirmation de fraude. {int((df['score_regles_metier']>=1).sum()):,} "
        f"sinistres déclenchent au moins 1 règle sur 4.".replace(",", " "))

    out = DATA_DIR / "03_rules.parquet"
    export_df = df.copy()
    for c in export_df.columns:
        if export_df[c].dtype == object or pd.api.types.is_string_dtype(export_df[c]):
            export_df[c] = export_df[c].astype("string")
    export_df.to_parquet(out, index=False)
    log(f"\nDataset avec score de règles exporté : {out}  ({export_df.shape[0]:,} x {export_df.shape[1]})".replace(",", " "))
    log("Prochaine étape : python 04_anomaly_detection.py")


if __name__ == "__main__":
    main()
