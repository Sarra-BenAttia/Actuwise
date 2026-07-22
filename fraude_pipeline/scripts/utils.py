"""
utils.py — Fonctions communes au pipeline de détection de fraude auto.

Ce module centralise :
- le chargement des deux fichiers sources (polices, sinistres)
- le nettoyage des valeurs manquantes encodées par "-"
- la jointure temporelle police <-> sinistre (une police peut avoir
  plusieurs termes annuels, il faut retrouver le terme actif au moment
  du sinistre, pas juste matcher sur le numéro de police)
- des utilitaires de dates réutilisés par plusieurs scripts

Convention de nommage : toutes les colonnes dérivées ajoutées par ce
pipeline sont préfixées ou nommées explicitement pour ne jamais être
confondues avec une colonne source. La variable de score de règles
métier s'appelle TOUJOURS `score_regles_metier` (jamais `fraude` ou
`label_fraude`) — voir README.md pour la justification.
"""

from __future__ import annotations

import sys
from pathlib import Path

import numpy as np
import pandas as pd

# ----------------------------------------------------------------------
# Chemins par défaut (modifiables en argument de ligne de commande dans
# chaque script si besoin)
# ----------------------------------------------------------------------
DATA_DIR = Path(__file__).resolve().parent.parent / "data"
MODELS_DIR = Path(__file__).resolve().parent.parent / "models"
OUTPUTS_DIR = Path(__file__).resolve().parent.parent / "outputs"

for d in (DATA_DIR, MODELS_DIR, OUTPUTS_DIR):
    d.mkdir(parents=True, exist_ok=True)

RAW_POLICES_XLSX = "/mnt/user-data/uploads/Base_production_sur_6_ans.xlsx"
RAW_SINISTRES_XLS = "/mnt/user-data/uploads/SAP_AUTO_PAR_GARANTIES_AU_31122023_-_MAJ.xls"

MISSING_MARKER = "-"

REG_AMOUNT_YEARS = list(range(2004, 2024))
SAP_YEARS = list(range(2004, 2024))
PA_YEARS = list(range(2018, 2024))
BN_YEARS = list(range(2018, 2024))


def log(msg: str) -> None:
    """Print immédiat (flush) pour un feedback console fiable, y compris
    en cas d'exécution avec redirection de sortie."""
    print(msg, flush=True)


def section(title: str) -> None:
    log("\n" + "=" * 78)
    log(title)
    log("=" * 78)


# ----------------------------------------------------------------------
# Chargement brut
# ----------------------------------------------------------------------
def load_polices_raw(path: str = RAW_POLICES_XLSX) -> pd.DataFrame:
    """Charge la feuille 'dataset' du fichier polices (moteur openpyxl)."""
    df = pd.read_excel(path, sheet_name="dataset", engine="openpyxl")
    return df


def load_sinistres_raw(path: str = RAW_SINISTRES_XLS) -> pd.DataFrame:
    """Charge et concatène les 3 feuilles du fichier sinistres (moteur xlrd)."""
    sheets = []
    with pd.ExcelFile(path, engine="xlrd") as xls:
        sheet_names = xls.sheet_names
        for sn in sheet_names:
            d = pd.read_excel(xls, sheet_name=sn, engine="xlrd")
            sheets.append(d)
    df = pd.concat(sheets, ignore_index=True)
    return df


# ----------------------------------------------------------------------
# Nettoyage
# ----------------------------------------------------------------------
def clean_missing_markers(df: pd.DataFrame) -> pd.DataFrame:
    """Remplace le marqueur '-' par un vrai NaN sur toutes les colonnes
    texte du DataFrame. Ne touche pas aux colonnes déjà numériques/dates.

    Note : pandas >= 2.x peut typer les colonnes texte en `object` OU en
    `StringDtype` (dtype affiché 'str') selon la configuration. On traite
    donc les deux cas plutôt que de filtrer uniquement sur `== object`,
    qui ratait silencieusement les colonnes StringDtype (ex: CLI_SEX,
    Region, Ville avec le backend pandas 3.0 par défaut)."""
    df = df.copy()
    for c in df.columns:
        if df[c].dtype == object or pd.api.types.is_string_dtype(df[c]):
            df[c] = df[c].replace(MISSING_MARKER, np.nan).astype(object)
    return df


def clean_polices(df: pd.DataFrame) -> pd.DataFrame:
    """Nettoyage spécifique au fichier polices : types numériques/dates
    corrects pour les colonnes qui contenaient le marqueur '-'."""
    df = clean_missing_markers(df)
    df["Date de naissance"] = pd.to_datetime(df["Date de naissance"], errors="coerce")
    df["Valeur venale"] = pd.to_numeric(df["Valeur venale"], errors="coerce")
    df["Valeur à neuf"] = pd.to_numeric(df["Valeur à neuf"], errors="coerce")
    df["Code Postal"] = pd.to_numeric(df["Code Postal"], errors="coerce")
    # CLI_SEX, Region, Ville restent catégorielles avec NaN natif
    return df


def clean_sinistres(df: pd.DataFrame) -> pd.DataFrame:
    """Nettoyage spécifique au fichier sinistres."""
    df = clean_missing_markers(df)
    return df


# ----------------------------------------------------------------------
# Jointure temporelle police <-> sinistre
# ----------------------------------------------------------------------
def temporal_join(df_sin: pd.DataFrame, df_pol: pd.DataFrame) -> pd.DataFrame:
    """
    Jointure sinistre -> police sur POL_FILLE == TMP_POLEXT_CDE, en
    choisissant le terme de police (ligne) dont `Debut effet` est le plus
    proche ET antérieur ou égal à `TMP_CLMLOSS_DATE` (date de survenance).

    Une police peut avoir plusieurs lignes (un terme par échéance
    annuelle, avec parfois un véhicule différent d'une année à l'autre).
    On veut donc le contrat réellement en vigueur au moment du sinistre,
    pas n'importe quelle ligne portant le même numéro de police.

    Ajoute une colonne `jointure_qualite` :
      - 'exacte'    : un terme de police démarrant avant le sinistre a été trouvé
      - 'approximee': aucun terme antérieur trouvé (le fichier polices ne
                       remonte qu'à ~2016-2017) -> on prend le terme le plus
                       proche dans le temps (avant ou après), à utiliser
                       avec prudence pour les règles basées sur des dates
                       (délai souscription-sinistre, ancienneté véhicule).

    Retourne uniquement les sinistres dont TMP_POLEXT_CDE existe dans
    df_pol (les non-joignables doivent être filtrés en amont et documentés
    séparément, cf. 01_data_loading.py).
    """
    pol_ids = set(df_pol["POL_FILLE"].dropna().unique())

    df_sin = df_sin[df_sin["TMP_POLEXT_CDE"].isin(pol_ids)].copy()
    df_sin = df_sin.dropna(subset=["TMP_CLMLOSS_DATE"])

    df_pol_sorted = (
        df_pol.dropna(subset=["Debut effet", "POL_FILLE"])
        .sort_values("Debut effet")
        .reset_index(drop=True)
    )
    df_sin_sorted = df_sin.sort_values("TMP_CLMLOSS_DATE").reset_index(drop=True)

    merged = pd.merge_asof(
        df_sin_sorted,
        df_pol_sorted,
        left_on="TMP_CLMLOSS_DATE",
        right_on="Debut effet",
        left_by="TMP_POLEXT_CDE",
        right_by="POL_FILLE",
        direction="backward",
        suffixes=("_sin", "_pol"),
    )
    merged["jointure_qualite"] = np.where(merged["Debut effet"].isna(), "approximee", "exacte")

    # Fallback pour les cas 'approximee' : prendre le terme le plus proche
    # (avant ou après) plutôt que de laisser les colonnes police vides.
    edge_mask = merged["jointure_qualite"] == "approximee"
    n_edge = int(edge_mask.sum())
    if n_edge > 0:
        edge_sin = df_sin_sorted.loc[edge_mask.values, :].sort_values("TMP_CLMLOSS_DATE")
        fallback = pd.merge_asof(
            edge_sin,
            df_pol_sorted,
            left_on="TMP_CLMLOSS_DATE",
            right_on="Debut effet",
            left_by="TMP_POLEXT_CDE",
            right_by="POL_FILLE",
            direction="nearest",
            suffixes=("_sin", "_pol"),
        )
        fallback["jointure_qualite"] = "approximee"
        # recombine : on garde l'ordre original de merged, on remplace
        # simplement les lignes 'approximee' par leur version fallback
        merged = merged.loc[~edge_mask].copy()
        merged = pd.concat([merged, fallback], ignore_index=True)

    return merged


def match_diagnostics(df_sin: pd.DataFrame, df_pol: pd.DataFrame) -> dict:
    """Calcule les statistiques de correspondance de la jointure, à des
    fins de documentation (utilisé par 01_data_loading.py)."""
    pol_ids = set(df_pol["POL_FILLE"].dropna().unique())
    n_lines = len(df_sin)
    n_lines_matched = int(df_sin["TMP_POLEXT_CDE"].isin(pol_ids).sum())
    n_claims = df_sin["TMP_CLMEXT_CDE"].nunique()
    n_claims_matched = df_sin.loc[df_sin["TMP_POLEXT_CDE"].isin(pol_ids), "TMP_CLMEXT_CDE"].nunique()
    return {
        "n_lignes_garantie_total": n_lines,
        "n_lignes_garantie_matchees": n_lines_matched,
        "taux_lignes_matchees": n_lines_matched / n_lines if n_lines else 0.0,
        "n_sinistres_uniques_total": n_claims,
        "n_sinistres_uniques_matches": n_claims_matched,
        "taux_sinistres_matches": n_claims_matched / n_claims if n_claims else 0.0,
        "n_polices_uniques": df_pol["POL_FILLE"].nunique(),
        "n_lignes_polices": len(df_pol),
    }


# ----------------------------------------------------------------------
# Utilitaires de dates / montants réutilisés dans le feature engineering
# et les règles métier
# ----------------------------------------------------------------------
def years_between(d1: pd.Series, d2: pd.Series) -> pd.Series:
    """Différence en années (float) entre deux séries de dates : d2 - d1."""
    return (d2 - d1).dt.days / 365.25


def days_between(d1: pd.Series, d2: pd.Series) -> pd.Series:
    """Différence en jours entre deux séries de dates : d2 - d1."""
    return (d2 - d1).dt.days


def reg_amount_for_year(row: pd.Series, year: int) -> float:
    col = f"REG_AMOUNT_{year}"
    return row.get(col, np.nan)


def sap_for_year(row: pd.Series, year: int) -> float:
    col = f"SAP_{year}"
    return row.get(col, np.nan)
