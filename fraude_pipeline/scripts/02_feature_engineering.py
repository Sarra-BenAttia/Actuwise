"""
02_feature_engineering.py

Calcule les features dérivées à partir du dataset fusionné (sortie de
01_data_loading.py) et exporte un dataset enrichi.

Exécution :
    python 02_feature_engineering.py

Entrée  : data/01_merged_raw.parquet
Sortie  : data/02_features.parquet

Features calculées (toutes documentées, aucune ne dépend d'une colonne
inexistante dans les fichiers sources) :
  - age_assure                      : âge de l'assuré au moment du sinistre (années)
  - anciennete_vehicule             : ancienneté du véhicule au moment du sinistre (années)
  - delai_declaration_survenance_j  : CLM_REPORTED_DATE - TMP_CLMLOSS_DATE (jours)
  - delai_souscription_sinistre_j   : TMP_CLMLOSS_DATE - POL_START_DATE (jours)
                                       NB: POL_START_DATE vient directement du
                                       fichier sinistres (pas de la police jointe),
                                       donc fiable même quand jointure_qualite='approximee'
  - nb_sinistres_police             : nombre de sinistres uniques sur la police (période complète)
  - reg_amount_annee_concernee      : REG_AMOUNT_{année du sinistre}
  - sap_annee_concernee             : SAP_{année du sinistre}
  - ecart_sap_reglement             : sap_annee_concernee - reg_amount_annee_concernee
  - montant_regle_normalise         : z-score de reg_amount_annee_concernee au sein du
                                       même TRANS_TYPE_DESC (type de garantie)
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

import numpy as np
import pandas as pd

from utils import DATA_DIR, days_between, years_between, log, section

YEAR_MIN, YEAR_MAX = 2004, 2023

# Bornes de plausibilité pour écarter les erreurs de saisie évidentes
# (pas des seuils métier, juste des garde-fous physiques). Documentées
# explicitement plutôt qu'appliquées silencieusement.
BIRTH_YEAR_MIN, BIRTH_YEAR_MAX = 1920, 2010
VEHICLE_YEAR_MIN, VEHICLE_YEAR_MAX = 1930, 2024


def pick_year_value(df: pd.DataFrame, prefix: str, year_series: pd.Series) -> np.ndarray:
    """Sélectionne, pour chaque ligne, la valeur de la colonne
    f'{prefix}_{année}' correspondant à l'année de survenance du sinistre
    (vectorisé, sans .apply)."""
    cols = [f"{prefix}_{y}" for y in range(YEAR_MIN, YEAR_MAX + 1)]
    matrix = df[cols].to_numpy(dtype=float)
    idx = (year_series.clip(YEAR_MIN, YEAR_MAX) - YEAR_MIN).to_numpy()
    return matrix[np.arange(len(df)), idx]


def main():
    section("1/3 — Chargement du dataset fusionné")
    df = pd.read_parquet(DATA_DIR / "01_merged_raw.parquet")
    log(f"Dataset chargé : {len(df):,} lignes".replace(",", " "))

    section("2/3 — Calcul des features dérivées")

    # --- Garde-fous de plausibilité sur les dates sources (erreurs de
    #     saisie évidentes, ex: année 0983, naissance après le sinistre) ---
    birth_year = df["Date de naissance"].dt.year
    invalid_birth = birth_year.notna() & ((birth_year < BIRTH_YEAR_MIN) | (birth_year > BIRTH_YEAR_MAX))
    n_invalid_birth = int(invalid_birth.sum())
    if n_invalid_birth:
        log(f"  ATTENTION: {n_invalid_birth} 'Date de naissance' hors plage plausible "
            f"[{BIRTH_YEAR_MIN}-{BIRTH_YEAR_MAX}] (ex: année de naissance postérieure au "
            "sinistre) -> mises à NaN plutôt que de fausser age_assure silencieusement.")
        df.loc[invalid_birth, "Date de naissance"] = pd.NaT

    veh_year = df["MTR_USE_START_DATE"].dt.year
    invalid_veh = veh_year.notna() & ((veh_year < VEHICLE_YEAR_MIN) | (veh_year > VEHICLE_YEAR_MAX))
    n_invalid_veh = int(invalid_veh.sum())
    if n_invalid_veh:
        log(f"  ATTENTION: {n_invalid_veh} 'MTR_USE_START_DATE' hors plage plausible "
            f"[{VEHICLE_YEAR_MIN}-{VEHICLE_YEAR_MAX}] -> mises à NaN plutôt que de fausser "
            "anciennete_vehicule silencieusement.")
        df.loc[invalid_veh, "MTR_USE_START_DATE"] = pd.NaT

    # --- Âge de l'assuré ---
    df["age_assure"] = years_between(df["Date de naissance"], df["TMP_CLMLOSS_DATE"])
    n_age_na = df["age_assure"].isna().sum()
    log(f"age_assure            : moyenne={df['age_assure'].mean():.1f} ans, "
        f"manquant={n_age_na:,} ({n_age_na/len(df):.1%})".replace(",", " "))

    # --- Ancienneté du véhicule ---
    df["anciennete_vehicule"] = years_between(df["MTR_USE_START_DATE"], df["TMP_CLMLOSS_DATE"])
    n_anc_na = df["anciennete_vehicule"].isna().sum()
    log(f"anciennete_vehicule   : moyenne={df['anciennete_vehicule'].mean():.1f} ans, "
        f"manquant={n_anc_na:,} ({n_anc_na/len(df):.1%})".replace(",", " "))
    n_neg = (df["anciennete_vehicule"] < 0).sum()
    if n_neg:
        log(f"  ATTENTION: {n_neg} véhicules avec ancienneté négative "
            "(MTR_USE_START_DATE postérieure au sinistre) -> vraisemblablement lié "
            "à jointure_qualite='approximee' (terme de police non contemporain). "
            "Conservé tel quel, à filtrer si besoin en aval.")

    # --- Délai déclaration - survenance ---
    df["delai_declaration_survenance_j"] = days_between(df["TMP_CLMLOSS_DATE"], df["CLM_REPORTED_DATE"])
    log(f"delai_declaration_survenance_j : médiane={df['delai_declaration_survenance_j'].median():.0f} j")

    # --- Délai souscription - sinistre (utilise POL_START_DATE du fichier
    #     sinistre lui-même, pas la police jointe -> fiable indépendamment
    #     de jointure_qualite) ---
    df["delai_souscription_sinistre_j"] = days_between(df["POL_START_DATE"], df["TMP_CLMLOSS_DATE"])
    log(f"delai_souscription_sinistre_j  : médiane={df['delai_souscription_sinistre_j'].median():.0f} j, "
        f"min={df['delai_souscription_sinistre_j'].min():.0f} j")

    # --- Nombre de sinistres par police sur la période ---
    nb_sin = df.groupby("TMP_POLEXT_CDE")["TMP_CLMEXT_CDE"].transform("nunique")
    df["nb_sinistres_police"] = nb_sin
    log(f"nb_sinistres_police   : moyenne={df['nb_sinistres_police'].mean():.2f}, "
        f"max={df['nb_sinistres_police'].max():.0f}")

    # --- Montant réglé / SAP de l'année concernée ---
    year_series = df["TMP_CLMLOSS_DATE"].dt.year
    n_out_of_range = ((year_series < YEAR_MIN) | (year_series > YEAR_MAX)).sum()
    if n_out_of_range:
        log(f"  ATTENTION: {n_out_of_range} sinistres avec année de survenance hors "
            f"[{YEAR_MIN}-{YEAR_MAX}], année recadrée aux bornes disponibles.")
    df["reg_amount_annee_concernee"] = pick_year_value(df, "REG_AMOUNT", year_series)
    df["sap_annee_concernee"] = pick_year_value(df, "SAP", year_series)
    log(f"reg_amount_annee_concernee : moyenne={df['reg_amount_annee_concernee'].mean():.1f} DT")
    log(f"sap_annee_concernee        : moyenne={df['sap_annee_concernee'].mean():.1f} DT")

    # --- Écart SAP / règlement ---
    df["ecart_sap_reglement"] = df["sap_annee_concernee"] - df["reg_amount_annee_concernee"]
    log(f"ecart_sap_reglement   : moyenne={df['ecart_sap_reglement'].mean():.1f} DT, "
        f"max={df['ecart_sap_reglement'].max():.1f} DT")

    # --- Montant réglé normalisé (z-score par type de garantie) ---
    grp = df.groupby("TRANS_TYPE_DESC")["reg_amount_annee_concernee"]
    grp_mean = grp.transform("mean")
    grp_std = grp.transform("std").replace(0, np.nan)
    df["montant_regle_normalise"] = (df["reg_amount_annee_concernee"] - grp_mean) / grp_std
    n_z_na = df["montant_regle_normalise"].isna().sum()
    log(f"montant_regle_normalise : manquant={n_z_na:,} (garanties avec std=0 ou effectif=1)".replace(",", " "))

    section("3/3 — Export")
    out = DATA_DIR / "02_features.parquet"
    export_df = df.copy()
    for c in export_df.columns:
        if export_df[c].dtype == object or pd.api.types.is_string_dtype(export_df[c]):
            export_df[c] = export_df[c].astype("string")
    export_df.to_parquet(out, index=False)
    log(f"Dataset enrichi exporté : {out}  ({export_df.shape[0]:,} x {export_df.shape[1]})".replace(",", " "))
    log("\nProchaine étape : python 03_rules_scoring.py")


if __name__ == "__main__":
    main()
