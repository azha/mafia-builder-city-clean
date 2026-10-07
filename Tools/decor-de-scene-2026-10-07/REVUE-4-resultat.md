# Revue ⊥ n°4 du DESIGN v4 (agent `reviewer` neuf, lecture seule, 07/10) — NON APPROUVÉ : 3 BLOCKING, 2 MAJOR, 4 MINOR
Reçue pendant la pause générale : consignée ici, NON traitée (le design reste v4 / f0f50cb5 jusqu'au signal de reprise de f2).

BLOCKING
- B1 §4 ⑮ ⑰ / §0 bis B-c / §0 ter B1 : `rx 1,523 ; ry 0,901` n'est valable que pour le cadre 31 (corkboard 298×504,05) ; cadres 33-35 = 298×400 ⇒ rx 1,282 · ry 0,955 ; le « un % reste exact à l'étirement » est faux pour un `circle` (il devient une ellipse). Correctif : forme `RadialCercleCoinLePlusLoin(cx, cy, Arret[])` qui calcule r du rect du support au montage.
- B2 §3.4/§4.1/D3 : 6 couleurs de bord à d ≤ 4 écrites en littéral (`#0a0d10` 2,85, `#14171a` surfaceCard 2,96 [15 éléments], `#2b2f3a` 3,11, `#b9ac92` 0,91, `#f2c96b` 0,12, `#ff5a4d` 0,02) ⇒ TD-612 rougit sur `DecorsDeSceneFilets.cs`. Correctif : passer teintes.py sur les couleurs de mesure-filets.json, compléter §4.1.
- B3 D6(a) / §3.4 : les états de ㉛ (`.pl-choix.pris`/`.risque`) sont sur les cadres 68 et 71, pas 67 ; `#4f7f3f` : 0 occurrence dans mesure-filets.json. Correctif : étendre la mesure aux cadres d'état ; D6(a) porte sur nominaux + états.
MAJOR
- M1 §3.4 : `K = 1280/300` inventé ; `EchelleMaquette.PxTrait(valeurCss, racinePleinEcran, LargeurEcransBrennar6=300f)` existe (1280 = repli seulement) ; D4/D6(c) à 540×960 donnerait K = 1,8 ; « 4 u pour 1 CSS px » : la docstring dit 4,2. Correctif : utiliser `EchelleMaquette.PxTrait`, supprimer K.
- M2 teintes.json périmé : rejeu = 66 couleurs (21 jeton / 45 littéral) ; commité 56 (20/36) ; §4.1 écrit 20/34 ; omet `#8a6a42` et `#ffffff`.
MINOR : « pointillé/tireté 34+6 » inversé (dotted 6, dashed 34) ; `.cerne` = 1 px (7 éléments) pas « 1-2 px » ; aucun nom de nœud pour les Images de côté (collision avec `"Cerne"` de PiedDEcran.Cerner) ; « 50 % ± 10 % » établi pour `#c3b79e` seulement.
VÉRIFIÉ EXACT par la revue : 312/1083/85 et les 8 fréquences ; ㉘ Points (B3 de la revue n°3 traité) ; ⑭ 26 px ; ㉚ `#c3b79e` ×4 ; `#2a3648` 270 côtés ; primitives existantes citées ; §4 26 lignes 22/3/1 ; A7+B9+C10 ; constats du juge ; §3.4/§7 sans CanvasGroup.
NON VÉRIFIÉ par la revue : voile de ③ (fait pris dans mesure-couches.json), nombres de la famille A, mesure-couches/bande-de-scene, prémisse gamma→linéaire (sonde D4), aires 74,3/48,9 %, md5 du jpeg, fractions Bande, lignes d'AppShell.
