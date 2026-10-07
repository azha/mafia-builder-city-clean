# Décor de scène — VERDICT du design : v5.1 APPROUVÉ (08/10/2026)

**Décision de f2 (orchestrateur), 08/10 : « le design v5.1 est APPROUVÉ, sans revue n°6 »** — le modèle est juste (mesuré par le relecteur n°5), le dernier BLOCKING était une OMISSION (aucun clip nommé), réparée par une règle explicite (`RectMask2D` sur `Decor/Support`, exigé en D0, sondé en D4) et prouvée par commande (`verifier-design.py` EXIT 0).

## Historique des revues ⊥ (agents `reviewer` neufs, lecture seule, un à la fois)
| tour | verdict | BLOCKING | traité par |
|---|---|---|---|
| n°1 (v1) | NON APPROUVÉ | 4 : primitives de dégradé inexistantes ; 18 littéraux sous TD-612 ; catalogue 25≠26 ; perte du bloqueur de raycast | primitives neuves ; `teintes.py` ; colonne Statut ; `Decor/Capteur` |
| n°2 (v2) | NON APPROUVÉ | 3 : teintes des zones ; ③ sans voile ; radial farthest-corner | `teintes.py` étendu ; `SpecDecor.Voile` ; fractions |
| n°3 (v3) | NON APPROUVÉ | 3 : base des % = boîte du support ; `RoundedRectMask` à 1 rayon ; ㉘ Points | recalcul mesuré ; primitive à 4 rayons ; 5 nombres |
| n°4 (v4, + filets) | NON APPROUVÉ | 3 : rayon par cadre ; 6 couleurs de bord ; états de ㉛ | `RadialCercle` ; `teintes.py` sur les filets (138/30/108) ; mesure sur 128 cadres |
| n°5 (v5, delta B1) | NON APPROUVÉ | 1 : clip absent (omission) | `RectMask2D` + `CercleDeSupport` + tests de la primitive |
| (v5.1) | **APPROUVÉ par f2** | 0 | `verifier-design.py` EXIT 0 |

## Preuve (sortie de `python3 Tools/decor-de-scene-2026-10-07/verifier-design.py`, 08/10)
```
OK   teintes.json idempotent (rejeu de teintes.py)
OK   §4.1 couleurs / jetons / littéraux
OK   §4.1 lignes de la table = jetons du JSON
OK   §3.4 éléments / côtés / recettes / couleurs
OK   mesure-filets couvre TOUS les cadres des 26 écrans
OK   §4 : 26 lignes, 22 Posé / 3 DéjàLivré / 1 NonMonté
OK   §4 : symboles = écrans de l'INDEX avec cadres série 6
OK   clip : RectMask2D exigé sur Decor/Support (§3.3 et D0)
OK   plus de « calculé au montage » du rayon
OK   composant CercleDeSupport présent, pas de « composant `RadialCercle` »
```
EXIT 0. Chiffres du design : 138 couleurs (30 par jeton · 108 littéraux) ; filets 1560 éléments / 5403 côtés / 137 recettes / 87 couleurs de bord sur 128 cadres ; catalogue 26 = 22 Posé · 3 DéjàLivré (⑨ ⑩ ⑯) · 1 NonMonté (㉑).

## Dettes et points consignés (classe C, non traités)
- **TD-769 à inscrire** (registre `dettes-client2.md` À JOUR, plage libre) : asset « verge nuit » pleine résolution à commander à l'atelier (repli provisoire : `assets/verge_nuit_provisoire.jpg`, 900×765, md5 `facdc64c611e3ef415dfbfb29b45226a`) ; ⑤ seul l'utilise.
- Dédoublonnage de la copie `scene_district_nuit` (+2,8 Mo).
- Supports d'état différents du nominal (4 sur 103) : ⑮ cadre 32 (`listing`), ㉒ cadre 97 (`cofr6.dense`), ㉙ cadres 65-66 (`tabl6`, « v1 »).
- `blur(1px)` ③, `sepia(.18)` ⑭, inclinaison de la feuille ⑯, ombres portées, `Bande` ancrée au haut du support (corkboard −18 px, burner +12 px), effet du bandeau sur la bande.
- Prémisse de la luminosité (`RawImage.color` = produit sRGB) : à confirmer par la sonde D4 au premier créneau ; repli = voile noir ajusté.
