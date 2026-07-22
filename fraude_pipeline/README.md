# Pipeline de détection de fraude — sinistres auto (BIAT)

Module de scoring de suspicion pour sinistres automobiles, basé sur 4 règles
métier applicables (sur les 10 du rapport de référence Ferchichi 2022) et
une détection d'anomalies non supervisée (DBSCAN). Voir `résumé_limites.md`
pour le détail des 6 règles non implémentables avec les données actuelles.

## ⚠️ Point d'attention essentiel

`score_regles_metier` et `score_suspicion` sont des **signaux faibles**
(heuristiques + statistiques), **pas une confirmation de fraude**. Aucune
variable de ce pipeline ne s'appelle `fraude` ou `label_fraude`, précisément
pour éviter toute confusion en cas de présentation à la compagnie. Tout
dossier en tête de classement doit être vérifié par un expert sinistre
humain avant toute décision.

## Ordre d'exécution

```bash
cd scripts
python 01_data_loading.py          # charge, nettoie, joint les 2 fichiers sources
python 02_feature_engineering.py   # calcule les features dérivées
python 03_rules_scoring.py         # calcule les 4 règles + score_regles_metier
python 04_anomaly_detection.py     # DBSCAN + K-Means, sauvegarde scaler.pkl / dbscan_model.pkl
python 05_suspicion_score.py       # score de suspicion final + top N + comparaison au hasard
```

Chaque script est indépendant (relit le parquet produit par le précédent)
et affiche un résumé des résultats clés en console. Exécuter dans l'ordre
au moins une fois (les scripts 2 à 5 dépendent des sorties des précédents).

## Arborescence

```
scripts/
  utils.py                    fonctions communes (chargement, nettoyage, jointure temporelle)
  01_data_loading.py
  02_feature_engineering.py
  03_rules_scoring.py
  04_anomaly_detection.py
  05_suspicion_score.py
data/                          fichiers intermédiaires .parquet (générés, pas dans git idéalement)
models/                        scaler.pkl, dbscan_model.pkl, kmeans_model.pkl, feature_columns.pkl
outputs/                       top_dossiers_prioritaires.csv
deployment/
  app.py                       application Flask (formulaire de scoring d'un nouveau dossier)
  predict_utils.py             logique de scoring (règles + DBSCAN sur nouveau point)
  form_choices.json            listes déroulantes extraites des données réelles
  templates/form.html
résumé_limites.md
README.md
```

## Jointure police <-> sinistre — points clés

- `POL_FILLE` n'est pas un identifiant unique : une police a une ligne par
  terme annuel (jusqu'à 7 termes observés, parfois avec changement de
  véhicule). La jointure retrouve, pour chaque sinistre, le terme actif
  au moment du sinistre (`Debut effet` le plus proche et antérieur à
  `TMP_CLMLOSS_DATE`), via `pd.merge_asof`.
- ~35,3% des sinistres trouvent une police correspondante dans le fichier
  `Base_production_sur_6_ans` (35 591 / 100 794). Les autres sont exclus
  et documentés — probablement des polices résiliées/non renouvelées,
  hors du périmètre de cet extrait "production" (hypothèse plausible,
  non confirmable avec les données fournies).
- Colonne `jointure_qualite` : `exacte` (terme antérieur trouvé, 68,7%)
  vs `approximee` (aucun terme antérieur au sinistre disponible — le
  fichier polices ne remonte qu'à ~2016 alors que les sinistres remontent
  à 2004 — on prend alors le terme le plus proche dans le temps, 31,3%).
  À utiliser avec prudence pour les règles basées sur `MTR_USE_START_DATE`
  (règle R3).

## Score de suspicion final

```
score_suspicion = 0.5 * (score_regles_metier / 4) + 0.5 * dbscan_anomalie
```

Poids égaux par défaut entre signal métier et signal statistique
(peu de recouvrement observé entre les deux — voir la matrice croisée
imprimée par `05_suspicion_score.py`). Ajustables en tête de script.

**Attention** : la règle R7 (fréquence élevée de petits sinistres) déclenche
à elle seule ~32% des sinistres, contre <1% pour chacune des règles R1, R3,
R4. Elle domine donc largement `score_regles_metier`. Si l'expert sinistre
souhaite rééquilibrer, la solution la plus simple est de pondérer les
règles individuellement avant de les sommer (actuellement une simple somme
0/1 par règle) — voir `résumé_limites.md`.

## Formulaire de déploiement

```bash
cd deployment
pip install flask --break-system-packages   # si besoin
python app.py
# -> http://127.0.0.1:5000
```

Le formulaire recalcule les 4 règles et le statut DBSCAN pour un nouveau
dossier saisi manuellement. Les champs à modalités fixes (Usage,
TYPE_POLICE, Energie, CLI_SEX, Region, TRANS_TYPE_DESC, marque véhicule)
sont des listes déroulantes générées depuis les données réelles
(`form_choices.json`). Les montants, dates et identifiants sont en saisie
libre, avec validation et messages d'erreur explicites en cas de format
incorrect.

Note technique : `DBSCAN` de scikit-learn n'a pas de méthode `.predict()`
pour un nouveau point (modèle transductif). Le formulaire implémente la
règle standard : distance au point-cœur (`core_sample_`) le plus proche
<= `eps` => pas une anomalie, sinon => anomalie (voir `predict_utils.py`).

## Ce qui a changé / a été corrigé pendant le développement

- pandas 3.0 type certaines colonnes texte en `StringDtype` plutôt que
  `object` : `clean_missing_markers` gère les deux cas.
- Un bug dans le calcul du seuil P90 de la règle R7 (percentile calculé
  sur des valeurs dédupliquées au lieu d'un percentile par police) a été
  identifié et corrigé avant livraison.
- Des dates aberrantes (`MTR_USE_START_DATE` en l'an 983, ~996 `Date de
  naissance` postérieures à 2010) ont été détectées et mises à `NaN`
  plutôt que silencieusement utilisées (auraient donné une ancienneté
  véhicule de 1000+ ans).
- Le "top N" du score de suspicion utilisait initialement `rank()` seul,
  ce qui produisait des centaines d'ex-aequo à cause du caractère
  quasi-discret du score ; un critère de départage (écart SAP/règlement
  absolu) a été ajouté pour obtenir un top N précis.
