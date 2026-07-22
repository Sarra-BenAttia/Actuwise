# Résumé des limites — règles non implémentées et champs manquants

Sur les 10 règles métier du rapport de référence (Ferchichi, Assurances
BIAT, 2022), **4 sont implémentées** dans ce pipeline (R1, R3, R4, R7 —
numérotation reprise du rapport). **6 ne peuvent pas être calculées** avec
les deux fichiers fournis (`Base_production_sur_6_ans.xlsx` et
`SAP_AUTO_PAR_GARANTIES_AU_31122023.xls`). Elles sont listées ci-dessous
avec le champ précis à demander à la compagnie pour pouvoir les activer.

## Règles non implémentées

| # | Règle | Champ manquant | À demander à la compagnie |
|---|---|---|---|
| 2 | Sinistre < 14j avant résiliation | Date de résiliation de la police | Un champ `DATE_RESILIATION` (ou équivalent) par terme de police, absent de `Base_production_sur_6_ans.xlsx` |
| 5 | Augmentation de capital assuré puis sinistre | Historique du capital assuré par avenant | Un historique des avenants avec le capital assuré à chaque modification (les primes `PA 20XX` ne sont qu'une approximation faible et volontairement **non utilisée** ici — la prime dépend de nombreux facteurs autres que le capital assuré, l'utiliser aurait produit un signal trompeur) |
| 6 | Même client / même expert répété | Identifiant client unique, code expert sinistre | Un identifiant client stable (le NIF ou équivalent) et un `CODE_EXPERT` sur chaque sinistre — aucun des deux fichiers ne les contient |
| 8 | Ajout de garantie puis sinistre rapide | Fichier des avenants (dates d'ajout de garantie) | Un fichier `AVENANTS` avec la date d'effet de chaque modification de garantie |
| 9 | Circonstance "dérapage" + garantie Tierce | Variable de circonstance du sinistre | Un champ `CIRCONSTANCE` ou équivalent (texte ou code) décrivant le type d'accident déclaré |
| 10 | Véhicules récurrents entre eux (même tiers impliqué) | Identifiant du véhicule/tiers adverse | Un champ identifiant la partie adverse (matricule tiers, n° de police tiers) sur les sinistres avec recours |

Pour chacune de ces règles, le code ne fabrique **aucune donnée de
substitution** : elles sont absentes de `score_regles_metier` (qui reste
donc un score sur 4, pas sur 10) plutôt que d'être approximées de façon
trompeuse.

## Autres limites identifiées pendant le développement

### Jointure police <-> sinistre incomplète (~65% des sinistres non joints)
Seuls 35 591 sinistres uniques sur 100 794 (35,3%) trouvent une police
correspondante dans `Base_production_sur_6_ans.xlsx`. Le taux de
correspondance augmente avec la récence du sinistre (54% pour les
sinistres survenus en 2023, contre <10% pour les sinistres antérieurs à
2010), ce qui suggère que le fichier polices est un extrait du
portefeuille **actuellement actif**, pas un historique complet des
polices ayant jamais existé — mais cette hypothèse n'est pas vérifiable
avec les seules données fournies. **À clarifier avec la compagnie** :
existe-t-il un référentiel polices historique plus complet ?

### Jointure temporelle approximative pour les sinistres anciens (31,3%)
Le fichier polices ne remonte qu'à ~2016-2017 alors que les sinistres
remontent à 2004. Pour les sinistres antérieurs à la première police
disponible, le terme de police le plus proche (avant ou après) est
utilisé par défaut (`jointure_qualite = 'approximee'`), ce qui rend les
variables dérivées du véhicule/de la police (ancienneté véhicule, délai
souscription-sinistre calculé depuis `Debut effet`) moins fiables pour
ces dossiers. **Atténuation déjà en place** : `delai_souscription_sinistre_j`
utilise `POL_START_DATE` du fichier sinistres lui-même (toujours exact),
pas la police jointe — seule `anciennete_vehicule` (règle R3) reste
exposée à cette approximation.

### Règle R7 (fréquence de petits sinistres) domine le score combiné
R7 déclenche ~32% des sinistres contre <1% pour R1, R3 et R4 individuellement.
Le score `score_regles_metier` actuel est une simple somme 0/1 par règle
(demandé explicitement dans le brief). Si l'expert sinistre souhaite que
les 4 règles pèsent de façon plus équilibrée, deux options simples :
1. Pondérer chaque règle avant sommation (ex: poids inversement
   proportionnel à sa fréquence de déclenchement).
2. Relever le seuil de R7 (actuellement ≥5 petits sinistres/police, fixé
   au P90 de la distribution observée) si un seuil plus sélectif est
   souhaité métier.

### Qualité des données sources
- ~996 `Date de naissance` sont postérieures à 2010 (assuré "né après son
  sinistre") — mises à `NaN`, à faire corriger en amont si récurrent.
- 1 `MTR_USE_START_DATE` en l'an 983 (erreur de saisie évidente) — mise à `NaN`.
- `Valeur à neuf` manquante à 25,5%, `Date de naissance` à 23,5%,
  `CLI_SEX` à 20,4% — peuvent limiter la robustesse de certaines features
  si ces taux augmentent sur de nouvelles extractions.
- Colonne `TMP_TYPE` contient une valeur `'D'` non documentée dans le
  brief (qui ne mentionne que M=Matériel et C=Corporel). Conservée telle
  quelle (1 seule occurrence dans les données), sans supposer sa
  signification — **à clarifier avec la compagnie**.

### DBSCAN — comportement du modèle
Avec le paramétrage retenu (eps = P90 des distances au k-ième plus proche
voisin, k = min_samples = 0,1% de l'effectif), DBSCAN identifie un seul
cluster dense (94,8% des sinistres) et classe 5,2% des dossiers en
"bruit" (anomalies). C'est le comportement recherché pour cet usage
(isoler les dossiers atypiques plutôt que segmenter en groupes multiples),
mais cela signifie que la segmentation par cluster DBSCAN n'est pas
interprétable en tant que telle — c'est le K-Means complémentaire (4
segments) qui sert cet objectif de segmentation interprétable.
