"""
01_data_loading.py

Charge les deux fichiers sources bruts, les nettoie, effectue la jointure
temporelle police <-> sinistre, et exporte un dataset fusionné propre.

Exécution :
    python 01_data_loading.py

Sortie :
    data/01_merged_raw.parquet   (dataset fusionné sinistre + police)
    data/01_polices_clean.parquet (référentiel polices nettoyé, réutilisé
                                    par le formulaire de déploiement pour
                                    les listes déroulantes)

Notes de conception (voir README.md et résumé_limites.md pour le détail) :
- Seuls les sinistres dont le numéro de police (TMP_POLEXT_CDE) est
  présent dans le référentiel polices (POL_FILLE) sont conservés.
  Les autres sont documentés mais exclus (ils ne peuvent recevoir aucune
  des 4 règles métier, qui dépendent toutes d'attributs police/véhicule).
- Une police peut avoir plusieurs termes annuels (lignes) : la jointure
  choisit le terme actif au moment du sinistre. Voir `jointure_qualite`
  dans utils.temporal_join pour les cas où aucun terme antérieur au
  sinistre n'existe (approximation documentée, pas silencieuse).
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

import pandas as pd

from utils import (
    DATA_DIR,
    RAW_POLICES_XLSX,
    RAW_SINISTRES_XLS,
    clean_polices,
    clean_sinistres,
    load_polices_raw,
    load_sinistres_raw,
    log,
    match_diagnostics,
    section,
    temporal_join,
)


def main():
    section("1/4 — Chargement des fichiers bruts")
    log(f"Fichier polices  : {RAW_POLICES_XLSX}")
    df_pol = load_polices_raw()
    log(f"  -> {len(df_pol):,} lignes, {df_pol.shape[1]} colonnes".replace(",", " "))

    log(f"Fichier sinistres: {RAW_SINISTRES_XLS} (3 feuilles concaténées)")
    df_sin = load_sinistres_raw()
    log(f"  -> {len(df_sin):,} lignes, {df_sin.shape[1]} colonnes".replace(",", " "))

    section("2/4 — Nettoyage (marqueur '-' -> NaN, typage dates/nombres)")
    df_pol = clean_polices(df_pol)
    df_sin = clean_sinistres(df_sin)
    log("Colonnes polices avec valeurs manquantes après nettoyage :")
    na_pol = df_pol.isna().sum()
    for col, n in na_pol[na_pol > 0].items():
        log(f"  - {col}: {n:,} ({n/len(df_pol):.1%})".replace(",", " "))

    log("\nDoublons de lignes (polices exactement identiques) : "
        f"{df_pol.duplicated().sum():,}".replace(",", " "))
    log("Doublons de lignes (sinistres exactement identiques) : "
        f"{df_sin.duplicated().sum():,}".replace(",", " "))

    section("3/4 — Diagnostic de la jointure police <-> sinistre")
    diag = match_diagnostics(df_sin, df_pol)
    log(f"Polices : {diag['n_polices_uniques']:,} polices uniques ".replace(",", " ")
        + f"sur {diag['n_lignes_polices']:,} lignes (termes annuels)".replace(",", " "))
    log(f"Sinistres (lignes garantie) avec police correspondante : "
        f"{diag['n_lignes_garantie_matchees']:,}/{diag['n_lignes_garantie_total']:,} "
        f"= {diag['taux_lignes_matchees']:.1%}".replace(",", " "))
    log(f"Sinistres uniques avec police correspondante : "
        f"{diag['n_sinistres_uniques_matches']:,}/{diag['n_sinistres_uniques_total']:,} "
        f"= {diag['taux_sinistres_matches']:.1%}".replace(",", " "))

    log("\nEffectue la jointure temporelle (peut prendre quelques secondes)...")
    merged = temporal_join(df_sin, df_pol)

    n_exact = (merged["jointure_qualite"] == "exacte").sum()
    n_approx = (merged["jointure_qualite"] == "approximee").sum()
    log(f"\nJointure temporelle terminée : {len(merged):,} lignes sinistre-garantie retenues".replace(",", " "))
    log(f"  - jointure_qualite = 'exacte'    : {n_exact:,} ({n_exact/len(merged):.1%})".replace(",", " "))
    log(f"  - jointure_qualite = 'approximee': {n_approx:,} ({n_approx/len(merged):.1%})".replace(",", " ")
        + "  <- terme de police non contemporain du sinistre, à utiliser avec prudence")

    n_claims_final = merged["TMP_CLMEXT_CDE"].nunique()
    log(f"\nSinistres uniques dans le dataset fusionné final : {n_claims_final:,}".replace(",", " "))

    section("4/4 — Export")
    out_merged = DATA_DIR / "01_merged_raw.parquet"
    out_pol = DATA_DIR / "01_polices_clean.parquet"

    # Colonnes object restantes potentiellement mixtes -> forcer en string
    # pour un export parquet stable (les NaN restent NaN)
    merged_export = merged.copy()
    for c in merged_export.columns:
        if merged_export[c].dtype == object:
            merged_export[c] = merged_export[c].astype("string")
    merged_export.to_parquet(out_merged, index=False)
    log(f"Dataset fusionné exporté : {out_merged}  ({merged_export.shape[0]:,} x {merged_export.shape[1]})".replace(",", " "))

    pol_export = df_pol.copy()
    for c in pol_export.columns:
        if pol_export[c].dtype == object:
            pol_export[c] = pol_export[c].astype("string")
    pol_export.to_parquet(out_pol, index=False)
    log(f"Référentiel polices nettoyé exporté : {out_pol}  ({pol_export.shape[0]:,} x {pol_export.shape[1]})".replace(",", " "))

    section("Résumé")
    log(f"Sinistres non joignables (documentés, exclus du pipeline) : "
        f"{diag['n_sinistres_uniques_total'] - diag['n_sinistres_uniques_matches']:,}".replace(",", " "))
    log("Prochaine étape : python 02_feature_engineering.py")


if __name__ == "__main__":
    main()
