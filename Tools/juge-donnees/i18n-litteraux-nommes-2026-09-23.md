# Valeurs NOMMÉES rendues en littéral hors Libelle — la table site → clé (23/09)

Décision f2 (23/09) : tout texte affiché passe par `Libelle`. Ces 107 sites (28 résolveurs) rendent un LITTÉRAL à lettres pour une valeur
**nommée** — ce ne sont pas des replis, le lot « replis » (53 → 0) ne les voyait pas. La table est **produite mécaniquement** :
`python3 Tools/juge-donnees/i18n-litteraux-nommes.py [--back <sha>] > i18n-litteraux-nommes-2026-09-23.tsv` (arbre `10d32c75`, back HEAD).

- **fr** = le littéral actuel, recopié À L'OCTET depuis le code : c'est le mot du jeu aujourd'hui ; le passer au catalogue ne change rien
  pour un joueur fr. **L'atelier** écrit l'**en**, et signale les fr qui heurtent un mot ratifié ou servi (doublon, accord, apostrophe `’`).
- **Clé** = `Libelle.De(domaine, rôle, fr)`, `Slug` recopié. Domaine = celui que le fichier emploie DÉJÀ (`appro`, `conflit`,
  `demolition.ecran`, `distribution`, `loi`, `carte`, `revue`, `famille`, `decision`) ; rôle « bloc » (patron du `29-…`) ou celui du résolveur
  (`famille.anciennete`, `decision.portee`, `decision.urgence`, `revue.reserve`, `carte.tissu`, `chrome.phase`). **Proposés** (le fichier
  n'emploie encore aucun `Libelle`) : `vente.bloc.*` (Selling), `commissariat.bloc.*` (Precinct), `famille.regle.*` (éditeur de règles).
- **Littéraux ANGLAIS** (5, éditeur de règles : « Run default », « Pause ops », « in my building », « run the default behavior »,
  « pause operations ») : colonne fr VIDE — l'atelier écrit le FR, la clé se dérivera de ce fr.
- **Apostrophe : `’` (règle D10, orchestrateur 23/09).** La colonne fr la prend déjà ; le code, qui écrit `'`, passera au `’` dans le lot
  (la clé ne change pas). La colonne d'état le signale site par site.
- Au back à la génération (voir l'en-tête de la colonne d'état) : `distribution.bloc.tient` et `appro.bloc.il_n_y_a_plus_rien` servies,
  fr identique ; le reste non servi.
- 0 collision de clé (deux fr différents sous une même clé).

**Hors table, déclaré** : `MotDuType` (repli de `building.type.*`, déjà servi, par `ParValeur`) ; les glyphes à lettres (`[C]`, `[o..]`,
`[v..]` — question posée à l'atelier sur leur existence) ; Settings « Français » / « English » (ENDONYMES : allowlist nommée au lot).

**Fin du lot** (après le créneau) : chaque site passe par `Libelle.De`, et ce script devient une GARDE commitée — aucun littéral à lettres
rendu par un résolveur de texte, hors l'allowlist nommée, contrôle positif compris, dette à 0 dans le même lot.
