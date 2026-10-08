# ㊴ — revue ⊥ du DESIGN v4 (54197000), 08/10 — **NOT_APPROVED**

Relecteur `reviewer` NEUF (pas celui de la v3.1), à contexte vierge ; il a re-mesuré lui-même (`mesurer-filets.cjs` relancé sur 150-151,
`generer-filets.py` joué en bac à sable). Résumé fidèle de son rapport, à lever en v5.

**Exact (vérifié par lui)** : §1 (atelier a70a8c5, md5 10ff67f4, 9 `.dos6`, indices 0-based ; back accc9605, 0 diff) ; §2 en entier
(enfants, 135 `.pann` frère de `.elast`, compteurs, CSS, panneau 151 = 133, 0 `#6b737d`) ; §3 ; `#7a838d` sur `#111823` = 4,63:1.

## BLOCKING
- **B1** — L'étape 0 génère **5** recettes, pas 3 : `mesurer-filets.cjs` lit les styles CALCULÉS et la clé du générateur porte la classList
  (`generer-filets.py:110`) ⇒ `FenIci` et `PiEteinte` SONT générées (bord 1 px `#2a3648`, sans or) ; catalogue ㊴ = 16. `FenIci` manuelle
  entrerait en collision de nom (0 pixel or) ; `PiEteinte` absente de `RecettesEnAttente[㊴]` ⇒ D6b rougit.
- **B2** — `FiletsPoses.Cote` (`FiletsPoses.cs:53,70,173-175`) indexe les côtés droits par leur NOM seul : deux specs sur `Bas` = la même
  `Image`, le 2ᵉ ÉCRASE le 1ᵉʳ ⇒ `Fen + Bas 2px or` efface le bord bas `#2a3648` (la maquette : 1 px `#2a3648` PUIS 2 px or à l'intérieur).
  Il manque aussi `inset: 1f`. **Prérequis de CODE** : indexer les côtés comme `Contour` (`:122`). La garde « ≥ 1 rangée or » passerait
  sur le rendu amputé : compter 2 rangées or ET la rangée `#2a3648` dessous.

## MAJOR
- **M1** — R4 vue acteurs liste 4 compteurs ; 151 en dessine 3 (connus · qui ont peur · porte pistes chaudes ; « partis » n'existe qu'en 133/134).
- **M2** — `verifier-indices-cadres.py` n'existe pas sur cette branche (seulement `design/conformite-anim-2026-10-07`, b5bd0d87) et contrôle
  `Tools/juge-visuel/INDEX.md`, pas `ecrans-index.json` : l'étape 0 est sans contrôle.
- **M3** — `Filets` et `Filets.Forensic` ne sont pas `partial` ; `RecettesDe` (tests:186-188) ne réfléchit que `DecorsDeScene.Filets` ;
  `F(…)` du générateur est privé ⇒ une recette manuelle « dans DecorsDeScene.cs » n'est ni exprimable là, ni vue par D6b.
- **M4** — `Lisere` n'est PAS rendu par `Filets.Poser` (0 occurrence dans `FiletsPoses.cs`) mais par `DecorDeScene.PoserCerne` : l'analogie tombe.

## MINOR
m1 R5 « 00/1 » dévie de 135 (« 00/3 ») : à étiqueter déviation, pas « fait foi » · m2 `#f2c96b` = jeton `hudMoneyGold` (TD-612) ·
m3 gardes : épaisseur 2 px et position à pincer, « la porte a son bord or » à compter · m4 §5 « se vide » / « Mano reste » contradictoires,
`PiEteinte` omise · m5 aucune garde d'effet sur `.notepi` ni sur les mots de `.pi.eteinte` · m6 « — » sur route en erreur dans un `.fen` :
extrapolation, à marquer PROPOSÉ.

## Pour lever le gate (v5)
(1) §5 sur la mesure réelle : 5 recettes générées, catalogue 16, `RecettesEnAttente` complété ; (2) une voie pour l'or de `.fen.ici` qui
n'efface pas le bas de `Fen` (prérequis `FiletsPoses.Cote` indexé, + `inset: 1f`, garde 2 rangées or + rangée `#2a3648`) — décision f2 :
c'est du code dans ShellContracts ; (3) R4 acteurs à 3 fenêtres ; (4) étape 0 : bon index + un contrôle qui existe ; (5) classe hôte de
toute recette manuelle et sa garde.
