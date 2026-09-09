# Grandeurs mesurées au tour r1 (2026-09-06, planche du 2026-09-04 11:22, client `76ee3cc`) — ③ La Carte de Brennar

> GRANDEURS et valeurs mesurées au tour précédent — SANS les verdicts (amendement de skill, appliqué à la main). Pour la
> colonne `critère` (`DÉJÀ APPLIQUÉ` / `NOUVEAU`). `script` = repère du r1 (ses scripts ne sont PAS fournis). ⚠️ Au r1 la
> planche portait une PLAQUE opaque sous chaque nom, des noms horizontaux et une bande de légende : les grandeurs de B
> décrivent CET état-là — remesure tout, ne recopie rien.

## A. Grandeurs trouvées ÉGALES au r1 (contrôle positif du r1, verbatim)

| # | grandeur | réf | jeu | Δ / note |
|---|---|---|---|---|
| C1 | échelle de la peinture — **un seul** facteur ajuste les DEUX axes | — | `s = 1,0225` | aucun étirement ; minimum convexe, contrôles négatifs 20,3 et 20,2 contre 12,0 (`m04`) |
| C2 | cadrage vertical (part de la peinture visible) | réf-y 219 … 2085 | réf-y 218,1 … 2095,8 | +0,9 / +10,8 px sur 1866 (**0,6 %**) |
| C3 | cadrage horizontal | réf-x 0 … 1080 | réf-x 11,7 … 1057,7 | 12 px de chaque bord (**1,1 %**) |
| C4 | 7 témoins de peinture (QUAI-NORD, SAINT-BRAND, LE TREILLIS, fleuve, mer du port, DÉPÔT-EST, LES ENTREPÔTS) | — | — | **≤ 1/255 par canal** sur les 7 (`m10`) |
| C5 | couleur du fleuve, médiane 41×41 | (24, 64, 82) | (23, 64, 82) | 1/255 |
| C6 | « LE THRENNY », peint dans la texture — hauteur de capitale | 18 px | 18 px | **×1,000** (`m07`) |
| C7 | « LE THRENNY » — inclinaison | 0,00° | −0,76° | 0,8° |
| C8 | les 18 noms de quartier | 18 | 18 | **18/18**, français, accents justes (DÉPÔT-EST, LES ENTREPÔTS, LA LISIÈRE), 0 slug, 0 troncature, 0 mot anglais (`vues/plaques_contact.png`) |
| C9 | chaque marqueur dans SON quartier | — | — | les 18 rects reportés tombent sur le libellé homologue (`vues/overlay_plaques_sur_ref.png`) |
| C10 | chevauchement de marqueurs | 0 paire | **0** paire sur 153 | `m22` |
| C11 | bras NORD de la rose des vents | y = 535 | y attendu 555,0 / obtenu 555 | **0,0 px** (`m15`) |
| C12 | luminance moyenne de la carte | 38,27 | 38,36 | **0,09/255** (`m14`) |
| C13 | masse visuelle hors marqueur, 4 fenêtres témoins | — | — | ×1,04 · ×1,06 · ×1,10 · ×1,18 (`m21`) — l'instrument n'enfle pas |
| C14 | gouttière | — | contenu 231 … 2151 | rien sous le bandeau, rien sous le dock |
| C15 | débordement / rognage des marqueurs | — | marge 63 px à gauche, 51 px à droite | aucun élément coupé par le cadre |
| C16 | écart global carte/carte hors marqueurs | — | — | médiane **0,45/255** sur 3158 cellules 24×24 (`m16`) |

## B. Grandeurs à ÉCART au r1 — la mesure seule, sans la classe

| id r1 | ce qui a été mesuré | mesure du r1 |
|---|---|---|
| F1 | Hiérarchie inversée : les 18 noms de quartier sont posés sur une plaque rectangulaire opaque, là où la maquette grave le texte à même la pei | Masse visuelle (px dépassant le fond de +20 L, fenêtre 200×70 autour du marqueur) : **×3,00** LES BASSINS · **×4,49** HAUTES-MARCHES · **×3,95** SAINT-BRAND · **×7,85** LE TREILLIS · **×4,94** LES FRICHES — soit 37 à 60 % de la fenêtre remplie contre 8 à 17 % en maquette. 4 fenêtres témoins **sans** marqueur : ×1,04 / ×1,06 / ×1,10 / ×1,18. Opacité 100 % : 45 échantillons répartis dans la plaque VERRIER (dont au-dessus du parc vert et de la rose des vents) rendent tous exactement `(140,140,148)`. Surface opaque ajoutée 18 × 177×34 = **108 324 px = 5,22 %** de la carte. (`m21`, `m05`, `m14`) |
| F2 | Le contraste du nom descend sous le plancher de doctrine à cause de la plaque | encre `(235,235,236)` sur plaque `(140,140,148)` = **2,80:1**, plancher doctrine **4,5:1** (petit texte, hauteur de capitale 10 px = 2,8 CSS). Maquette : encre `(198,189,166)` sur îlot navy `(26,35,51)` = **8,43:1** ; sur l'îlot le plus clair, le khaki `(86,77,62)` = **4,44:1**. Plaque contre carte : 4,84:1. (`m06`, `m14`) |
| F3 | Le nom de quartier est 37 % plus petit qu'en maquette. | Hauteur de capitale mesurée en tranches verticales de 24 px (insensible à l'inclinaison) : **médiane 16 px** en maquette (15–19 sur 8 mots) contre **10 px** en jeu (10–11). Rapport médian **0,625**. Contrôle positif : « LE THRENNY », peint dans la texture, rend 18 px des deux côtés (**1,000**). (`m07`) |
| F4 | Les noms ne suivent plus la trame de leur quartier : tous redressés à l'horizontale. | Maquette, un angle par quartier : LES BASSINS **−10,21°**, LES FRICHES −6,38°, QUAI-NORD −3,51°, MARNE-BASSE +0,09°, HAUTES-MARCHES +2,86°, SAINT-BRAND +3,04°, DÉPÔT-EST **+7,23°** — amplitude **17,4°**. Jeu : −0,10° / +0,06° / +0,39°. Contrôle positif « LE THRENNY » : 0,00° / −0,76°. (`m18`) |
| F5 | La plaque VERRIER recouvre le bras SUD de la rose des vents (repère peint) et un tronçon de la route or. | Sur l'axe de l'étoile (réf x=985 → jeu x=995) : la maquette porte l'encre crème `(166,160,141)` de y=663 à y=677 ; aux lignes homologues du jeu (686…700) il n'y a que `(140,140,148)`. Bras nord : **écart 0,0 px** (contrôle positif). Hauteur attendue 146,2 px, obtenue 115 ⇒ **31 px perdus = 21 %**. Même plaque sur la route or (réf y=689). (`m15`) |
| F6 | Une bande de légende EN TROP en bas à gauche | Delta capture − maquette sur la fenêtre (40,2108)–(500,2136) : **+38,0 / +36,1 / +31,4** (l'élément est ajouté) ; témoin 10 px plus bas : −5,6/−7,3/−9,4. Puce `(140,140,148)` de 209×15 px ; pastilles `(242,189,49)`, `(61,178,86)`, `(209,66,66)` ; texte **blanc pur** `(242,242,242)`, hauteur d'encre 9–11 px. Palette dominante de la carte : 6 jetons, le plus clair `(85,87,77)`. (`m13`, `m17`, `m14`) |
| F7 | La plaque a une largeur fixe et ne suit pas son encre : elle masque de la peinture au-delà du texte, et sa marge varie de 9 à 65 px selon le | Les 18 plaques mesurent **177×34 px** (±1) ; l'encre va de **48 px** (ORSEL) à **158 px** (PLACE DES COMPTES). Marges latérales : 65/65 px pour ORSEL (soit **129 px de plaque, 73 %, sans aucune lettre**), 10/9 px pour PLACE DES COMPTES. (`m05`, `m06`) |
| F8 | Les noms sont posés systématiquement plus bas qu'en maquette, et l'un d'eux nettement décalé en x. | Centroïde d'encre, repère commun : dy = **+5,7 à +12,5 px**, médiane **+8,4**, les 7 du même signe ; dx de **−25,1** (LES BASSINS) à +11,0, médiane +1,0. Tolérance du mandat : 2 px, ou 1,5 % du parent = 16 px. (`m19`) |
| F9 | Famille de teinte de l'encre du nom : crème chaude → blanc neutre. | Maquette `(173,164,144)` à `(205,189,165)`, r−b = **29 à 40**. Jeu `(235,235,236)` et `(246,246,247)`, r−b = **1**. (`m20`) |
| F10 | La plaque n'a ni rayon d'arrondi, ni bord, ni anti-crénelage | Transition en **1 px** : x=254 `(140,140,148)` → x=255 `(22,36,49)` ; coin haut-gauche plein dès (78,483) ; aucun pixel intermédiaire sur les 4 côtés testés. Rayon 0 (maquette : aucune plaque, donc aucun rayon à comparer — c'est la présence même de l'arête qui est l'écart). (`m14`) |

## C. Ce que le r1 n'avait PAS pu vérifier (résumé, sans verdict)

- une seule résolution (1080×2400) ; aucune paire T/T+1 s (animation) ; rect du run non fourni ;
- « le client ne peint pas la chaleur sur l'aire d'un quartier » vs « toutes les données valent Libre sur ce compte » : indécidable sur une image ;
- libellé plus long que « PLACE DES COMPTES » ; états d'interaction (survol, pressé, ENTRER) ; chrome non alimenté au r1 (écarté).
