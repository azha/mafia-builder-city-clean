# Écarts de design ouverts — rapport brut de l'agrégateur G1-ecrans-1-a-14 (07/10/2026, arbre 3d295d18)

Le périmètre compte **72 écarts ouverts**, **51 codés mais non rejugés** et **12 fermés ou assumés**. Aucune capture ni aucun juge ne porte sur l'état d'aujourd'hui, sauf ④ r4, daté du 07/10. Le reste du statut vient de `git log` et de la lecture du code et des documents d'écart. Rien n'a été modifié ni lancé.

**Définitions utilisées**
- **OUVERT** : le dernier tour le tient et aucun commit ne le traite, ou il n'a jamais été traité. C'est le tableau ci-dessous.
- **CODÉ non rejugé** : un commit déclare le correctif, mais aucun juge ni aucune capture ne l'a revu. C'est le §1bis, compté à part et hors des 72.
- **FERMÉ/ASSUMÉ** : fermé par un tour ultérieur, ou assumé par une décision écrite (`dossier.md` de f2, `ARBITRAGES-user-2026-09-07.md`, décision de l'orchestrateur). Le §2 les liste.

**Abréviations de chemins** (tous sous `~/project/mafia-unity-anim/Tools/`) :
- `R9①` = `juge-visuel/ecran-principal/r9-2026-09-07/rapport.md`
- `EC①` = `juge-donnees/ecran-principal/ecart-2026-09-23.md`
- `EC②` = `juge-donnees/fiche-batiment/ecart-2026-09-23.md`
- `R3③` = `juge-visuel/carte/r3-2026-09-06/rapport.md`
- `R4④` = `juge-visuel/04-accueil/r4-2026-10-07/rapport.md` (le dossier de décisions est `juge-visuel/04-accueil/dossier.md`)
- `R1⑤` = `juge-visuel/decision-du-jour/r1-2026-09-06/rapport.md`
- `R3⑥` = `juge-visuel/famille/r3-2026-09-06/rapport.md`
- `R1⑨` = `juge-visuel/exceptions/r1-2026-09-06/rapport.md`
- `EC⑨` = `juge-donnees/exceptions/ecart-2026-09-23.md`
- `R1⑭` = `juge-visuel/compression/r1-2026-09-07/rapport.md`

## 1. Écarts OUVERTS (72)

### ① Intérieur de district (23)
| écran | écart (maquette / jeu) | perçu comme | classe | source |
|---|---|---|---|---|
| ① | Pastille sur façade / « Serre » sur la chaussée, « Commerce-écran » sur le quai (23 ancres sur 40 à plus de 3 m d'un bâtiment, côté atelier) | des pastilles posées dans le vide | A | R9① §3 B2 ; EC① §3 |
| ① | Cadran bombé (ΔL* 9,3) / cadran plat (0,6) | le médaillon n'a plus de relief, voyant plat | A | R9① M3 |
| ① | « 37% » à 17,75 CSS du cerclage / « Brûlant » à 1,08, « CHALEUR » à 2,95 | le texte colle au bord du médaillon | A | R9① M4 |
| ① | Art plein cadre / à 2400, art coupé net à 2160 px et bande unie de 31,6 CSS sous le bandeau | une bande de couleur plate et un art tronqué | A | R9① M10 ; EC① §3 |
| ① | Bandeau d'alerte centré / bande du nom de district pleine largeur, alignée à gauche, qui cède seulement la place au bandeau | un bandeau de nom hors maquette | A | R9① M11 ; commit 0b49a634 |
| ① | Libellés de type lisibles / 3 libellés à 2,30, 2,92 et 4,49:1, tous suspendus sans capture | un mot illisible sur certains bâtiments | B | R9① M7 ; EC① §3 |
| ① | 3 lieutenants à des endroits distincts / 3 marqueurs empilés sans libellé sur le même bâtiment | impossible de savoir qui est où | B | R9① M8 |
| ① | 89 CSS de jour entre montant et médaillon / 1,09 CSS, aucune garde de longueur. Le format « 24 850 € » (c963f557) n'est pas remesuré | le montant touche le médaillon | B | R9① M14 |
| ① | Floater « + $320 » / absent (aucun delta de revenu servi par le back) | aucun retour quand ça rapporte | B | EC① §1 M10 |
| ① | Jonc net (1,35 CSS) / jonc flou (2,60) | le cerclage est mou | C | R9① M1 |
| ① | Arcs de 2,5 CSS / arcs 1,7× plus épais | arcs épais | C | R9① M2 |
| ① | Course du cadran 179° / 141° | arcs raccourcis | C | R9① M5 |
| ① | Volute droite présente / aucune encre à droite (la gauche est là) | bandeau asymétrique | C | R9① M9 |
| ① | Pivot 3,55 CSS / 4,51 | pivot trop gros | C | R9① m1 |
| ① | Aiguille de 15,9 CSS / 13,06 | aiguille courte | C | R9① m2 |
| ① | Losange de 12,35 CSS / 7,92, 2,2 trop bas | losange maigre | C | R9① m3 |
| ① | Encre du CTA brun-noir (36,24,4) / bleu-noir (9,15,26) | encre du CTA | C | R9① m6 |
| ① | Plaque translucide (flou d'arrière-plan) / plaque opaque (uGUI n'a pas de flou ; arbitrage non ratifié) | verre moins vitré | C | R9① m7 ; EC① §3 |
| ① | Filet de 1 CSS / 0,73 (le client y voit une troncature de rastérisation, non confirmée) | filet un peu fin | C | R9① m8 ; commit 0b49a634 |
| ① | Ronds du dock 46 CSS / 44,6–45,0 | ronds un peu petits | C | R9① m9 |
| ① | Dégradé du dock sur 36 CSS / 14,5, plus opaque | dock plus dur | C | R9① m10 |
| ① | Disque du marqueur opaque / laisse passer l'art (B05, B06), suspendu | pastille salie | C | R9① m11 |
| ① | Néon de façade allumé = ça rapporte / pastille `nightNeonGlow` sur les bâtiments qui rapportent | signal « ça rapporte » plus discret | C | EC① §1 M22 |

### ② Fiche bâtiment (3, aucun tour de juge)
| écran | écart | perçu comme | classe | source |
|---|---|---|---|---|
| ② | Cadres 36-38 : 3 pots avec plantes dessinées, stade et tag / rangées de texte « Pousse » et « Soin », aucune plante (le back n'accepte qu'une pousse par serre) | une serre sans plante | A | EC② cadre 36 ; commit acefc0f9 |
| ② | Cadres 92-94 : lieu du rendez-vous (« Verrerie Kestrel ») / absent (`glass_venue_building_id` non projeté ; le panneau disparaît au rechargement) | rendez-vous sans lieu | B | EC② cadre 92 |
| ② | Cadres 42, 45-47, 92-94 : « AFFINÉE · n passes » et compteur de passes / absents (`refining_passes` non servi en lecture) | pas de trace des passes d'une cuisson | B | EC② « Ce que le back ne sert pas » n°1 |

### ③ Carte (9)
| écran | écart | perçu comme | classe | source |
|---|---|---|---|---|
| ③ | À 1920, carte posée dans la gouttière / dessinée plein cadre : le bandeau mange « LE PORT », le dock mange LA CHANCELLERIE, LES FRICHES, PONT-GRIS. Aucun commit sur ce point depuis | noms de quartier coupés sur écran court | A | R3③ B1 (06/09) |
| ③ | Noms gravés (contour sombre −12,8 L) / traînée claire (+14,4 L) autour des lettres | les noms flottent au lieu d'être gravés | A | R3③ M1 |
| ③ | Pas de bouton / pastille blanche « Chaleur : affichée » (255,255,255), hors palette. `ARBITRAGES-user-2026-09-07.md` pt 21 dit « retirer » ; `CityMapController.cs:583` existe encore | bouton blanc étranger à la carte | A | R3③ arbitrages ; `juge-visuel/ARBITRAGES-user-2026-09-07.md` pt 21 |
| ③ | Encre `#e0d6bd` à 90 % / `#b9ad92` opaque, identique sur les 18 noms | encre des noms un peu terne | C | R3③ m1 |
| ③ | Noms à la ligne d'ancre / 6 px (1,66 CSS) trop bas, 18 sur 18 | noms décalés vers le bas | C | R3③ m2 |
| ③ | Trait d'union aéré / DÉPÔT-EST, PONT-GRIS : l'air disparaît | « DÉPÔTEST », « PONTGRIS » | C | R3③ m3 |
| ③ | « ARGENT » à 42 CSS pour 6 de capitale / 38,1 pour 6,9 (−21 % de chasse) | libellé ARGENT serré | C | R3③ m4 |
| ③ | Anneau du médaillon net / 3,0 CSS à mi-hauteur, pic 119 au lieu de 142 | médaillon flou | C | R3③ m5 |
| ③ | Capitale du dock 6,0 CSS / 6,53 (+8,8 %) | libellés du dock un peu gros | C | R3③ m6 |

### ④ Accueil (1)
| écran | écart | perçu comme | classe | source |
|---|---|---|---|---|
| ④ | Panneau « LA SUITE » de 795 px / 621 px (−22 %), retrait haut 47 → 37. Conséquence de R2 et du reflux, « se re-mesure » | panneau plus tassé | C | R4④ R6 ; `04-accueil/dossier.md` (« NON FAITS ») |

### ⑤ Décision du jour (14)
| écran | écart | perçu comme | classe | source |
|---|---|---|---|---|
| ⑤ | Décor peint plein cadre / aplat noir (94,5 % de pixels quasi-noirs, aucun décor dans `DecisionDetailScreenController.cs`) | écran sans lieu | A | R1⑤ F1 |
| ⑤ | Contenu à 29 % de la hauteur / vide de 1 051 px (43,8 %) entre le chrome et la carte | on voit du noir d'abord | A | R1⑤ F2 |
| ⑤ | Carte crème, portrait / intérieur noir (13,13,13), texte en `Creme` | un panneau d'interface, pas une carte posée | A | R1⑤ F4 |
| ⑤ | CTA primaire sur plaque crème (4,33:1) / sur noir (2,78:1) ; le CTA secondaire est 5,3× plus contrasté | le geste principal est le moins lisible | A | R1⑤ F5 |
| ⑤ | Carte portrait 0,843 / paysage 1,749 (aire −42 %) | carte écrasée | A | R1⑤ F7 |
| ⑤ | Pastilles rouge brique et anneau creux / pastilles or et disque gris plein | pastilles d'une autre famille | A | R1⑤ F8 |
| ⑤ | Cachet de cire rouge au coin / simple « ♦ » or en texte (`DecisionDetailScreenController.cs:332`) | cachet absent | A | R1⑤ F13 ; `decision-du-jour/spec-cachet-et-jeton.md` |
| ⑤ | Portée et Urgence en 2 colonnes / 2 rangées empilées | disposition changée | C | R1⑤ F11 |
| ⑤ | Filet sous le titre (81 % de la carte) / aplat parfait | filet absent | C | R1⑤ F12 |
| ⑤ | Jeton moleté (écart-type 71) / disque plat (1,25) | pièce sans cran | C | R1⑤ F15 |
| ⑤ | Sourcil de 16 px de capitale / 21 (+31 %) | sourcil trop gros | C | R1⑤ F16 |
| ⑤ | Marge gauche de la carte 81 px / 35 | carte collée au bord | C | R1⑤ F17 |
| ⑤ | Ors du jeton −7 à −15 % de luminance | or terni | C | R1⑤ F18 |
| ⑤ | « AUJOURD’HUI » avec apostrophe typographique / apostrophe droite (`DecisionDetailScreenController.cs:337`) | typographie | C | R1⑤ F21 |

Les « six de composition » de F1, F2, F4, F5, F7 et F8 sont dits « arbitrage user » dans le message de commit 90931bcf, sans décision écrite. Ils restent comptés ouverts. `ARBITRAGES-user-2026-09-07.md` pt 3 ratifie l'« écran réduit » seulement sous condition.

### ⑥ Famille (14, tous TENUS selon `famille/constats-a-rejuger.md` du 22/09)
| écran | écart | perçu comme | classe | source |
|---|---|---|---|---|
| ⑥ | Rang du Don : « Don V. » en or et rôle « VOUS » / « Vous » en or et « LE DON » (dépend des données) | le Don lit « Vous » | A | R3⑥ F14 |
| ⑥ | Bord haut du rang du Don en or (R−B +24) / gris (+9) | cadre du Don moins doré | C | R3⑥ F1 |
| ⑥ | Bloc « qui » : nom → pastille 24,0 CSS / 28,7 (+19,7 %). Non remesuré après le glyphe d'archétype (3b92b976) | bloc plus lâche | C | R3⑥ F2 |
| ⑥ | Rang du Don : 2 lignes à 19,0 / 13,3 (−30 %) | deux lignes serrées | C | R3⑥ F3 |
| ⑥ | Halo du médaillon du Don 42 % | halo discret | C | R3⑥ F4 |
| ⑥ | Ombre portée des rangs 48 % | cartes moins décollées | C | R3⑥ F5 |
| ⑥ | Anneau du bouton retour −50 % d'énergie (1,18:1) | bouton retour effacé | C | R3⑥ F6 |
| ⑥ | Disque des médaillons plus sombre et moins bleu (ΔB −13 à −16) | rayons coniques plus visibles | C | R3⑥ F7 |
| ⑥ | Fond de tête en halo centré / plaque pleine largeur (+7/255 aux bords) | tête éclairée de bord à bord | C | R3⑥ F8 |
| ⑥ | Texte de pastille +11,4 % de capitale | pastille grosse | C | R3⑥ F9 |
| ⑥ | Rayon des coins −1,8 CSS | coins serrés | C | R3⑥ F10 |
| ⑥ | Haut des cartes plus bleu (ΔB +5) et liseré plat | verre plus bleu | C | R3⑥ F11 |
| ⑥ | Pointillé : période 5,32 CSS, occupation 55 % (maquette : 5,00 et 65 %) | pointillé clairsemé | C | R3⑥ F12 |
| ⑥ | Anneaux de médaillon −11 % d'énergie | anneaux moins nets | C | R3⑥ F13 |

### ⑨ Exceptions (3)
| écran | écart | perçu comme | classe | source |
|---|---|---|---|---|
| ⑨ | Réplique du lieutenant en prose / les cartes démo montrent l'identifiant nu `exc_demo_*`. Fermé pour le raid, tenu côté back pour les autres producteurs | texte technique à l'écran | A | R1⑨ B3 ; EC⑨ §7.2, E16′ |
| ⑨ | Libellé d'action en français (« RÉPARER LE BÂTIMENT ») / « TEACH: PAUSE ON HIGH HEAT » (`label_i18n` servi sur 5 actions sur 13) | anglais dans un écran français | A | R1⑨ B4 ; EC⑨ §7.2, E18 |
| ⑨ | Cadre 18 : âge « il y a 3 h », nom du bâtiment, « Prendre acte des deux modérées » / non constructible (S6-b, S6-c, `buildingNameRef` côté back) | état « lots back » absent | B | EC⑨ S03 |

### ⑩ Détail de l'exception (3, jamais jugé)
| écran | écart | perçu comme | classe | source |
|---|---|---|---|---|
| ⑩ | Réplique en prose / cartes démo en identifiant nu | texte technique | A | EC⑨ §8.1 D04′ |
| ⑩ | Textes des cartes aux mots de la maquette / 7 valeurs servies à réaligner (« (risqué) » dupliqué, conséquences sur 2 lignes) | mots de cartes différents | A | EC⑨ D06 |
| ⑩ | « au Verge d'Or » et « RÉPARER LE VERGE D'OR » / `building` déclaré mais formes `{enseigne}` non branchées (côté atelier) | le bâtiment visé n'est pas nommé | C | EC⑨ §8.4 |

### ⑪ Coffre (0)
Aucun écart ouvert, voir le §2.

### ⑭ Compression (2)
| écran | écart | perçu comme | classe | source |
|---|---|---|---|---|
| ⑭ | « JOUR 1 · TENSION CALME · AUCUNE SEMAINE » / « Calm · None », enums bruts. `CompressionScreenController.cs:196` appelle encore `Lisible()`, qui ne traduit pas | anglais brut en tête d'écran | A | R1⑭ B3 ; `compression/r1-2026-09-07/addendum-routage-f2.md` |
| ⑭ | Fond bleu nuit (10,14,22) / neutre (13,13,13) en zone de contenu | fond gris-noir sans bleu | C | R1⑭ m3 |

## 1bis. CODÉS non rejugés (51, hors des 72)
| écran | ids (classe) | commits |
|---|---|---|
| ① (6) | B1 A, B3 A, M13 A, M6 B, m4 C, m5 C | e9db74eb (B1, B3, M6) ; 0b49a634 (M13) ; f88d3240 (m5) ; c963f557 (m4, indirect) |
| ② (aucun finding) | 6 lots du 23/09, bulle du lieutenant, écrin Ash, « Blanchir » de la façade, « Faire sortir » vers ㉘ | bcdcb977, 87a61933, 97b1ed00, acefc0f9, b551b061, 68f6a5b5, 6a36b63b, c675019a, 4ab3abcf, 594ab14c, 517bab9b |
| ④ (7) | R1 A, R2 A, R3 A, R4 C, R5 C, R9 C, R10 C | 33a4913a, 7fb4cdaf ; « pas encore joué » |
| ⑤ (2) | F3 A (titre `decision.type.*`), F6 A (contour pointillé en `Tiled`) | 87373553 ; b2a08b3d |
| ⑨ (20) | B1, B2, M1, M2, M3, M4, M5, M7, M8, M9, M10, m7 en A ; M6, m1, m2, m3, m4, m5, m6, m8 en C | `EC⑨` §7.2, lots ⑨-0 à ⑨-6 |
| ⑩ (9) | D01, D02, D03, D04, D05, D08 en A ; D07, D09′, D10 en B | `EC⑨` §8.1, lots ⑩-1a à ⑩-1e |
| ⑭ (7) | B1, B2, B4, M1 en A ; m1, m2, m4 en C | 9a5ddc65 (plaque du canon, ligne enveloppée) |

Les commits ① et ② du 23/09 sont dans l'arbre actuel. Celui du 07/09 (④ r4) est écrit mais « pas encore joué ni mesuré ».

## 2. Fermés / assumés (12)
- **① : 1.** M12 (le fil du ratio) est retiré (5e5d856c), conformément à `ARBITRAGES-user-2026-09-07.md` pt 6, option (b). Deux autres écarts ont été fermés par r9 lui-même (voile du bandeau, positions du district) ; ils ne sont pas dans les 28.
- **② : 1.** Le nom du lieutenant et « J14 » sont assumés (décision de l'user dans le commit 6a36b63b).
- **③ : 1.** M2, les ronds du dock sans icône : arbitrage user, `ARBITRAGES-user-2026-09-07.md` pt 15 ; le revert est 95109293.
- **④ : 2.** R7 et R8 sont ASSUMÉS par f2 le 07/10 (`04-accueil/dossier.md`).
- **⑤ : 6.**
  - Fermés (3) : F9, F14, F19, vérifiés par l'auteur sur planche recapturée, pas par un juge (commit 90931bcf).
  - Assumés (3) : F10 (dock sans icône), F20 (médaillon décalé) et F22 (phase du jour), en chrome commun (`04-accueil/dossier.md` et `ARBITRAGES-user-2026-09-07.md` pt 15 et 16). Pour F20 et F22, c'est une extension par analogie : la décision de f2 sur le chrome commun vise ④.
- **⑥ : 0.**
- **⑨ : 0.**
- **⑩ : 1.** D09 (Escalate/Back) est fermé par décision de l'orchestrateur le 23/09.
- **⑭ : 0.** Les tables ASSUMÉ et ARBITRAGE du r1 (S1-S4, A1-A7) ne sont pas des findings.

Les tables ASSUMÉ et ARBITRAGE internes de r9 ①, r3 ③ et r4 ④ ne sont pas non plus comptées dans les 28, 9 et 10.

## 3. État du dernier tour par écran
| écran | dernier tour | verdict, annoncé | ouverts / codés / fermés-assumés (détail du compte) |
|---|---|---|---|
| ① | r9, 07/09 (r10 du 22/09 préparé, sans capture ni rapport) | NON APPROUVÉ, 3 bloquants, 14 majeurs, 11 mineurs (28) | 23 / 6 / 1. Les 30 items = 28 findings de r9 + 2 items de `EC①` (floater, néon). Ouverts 23 = 21 findings + 2 ; codés 6 ; fermé 1. |
| ② | aucun tour (mandat vide ; fiche jugée dans les rapports de ① r3 à r9) | — | 3 / (lots seulement) / 1. Total 4 items. |
| ③ | r3, 06/09 | NON APPROUVÉ, 1 bloquant, 2 majeurs, 6 mineurs (9) | 9 / 0 / 1. Items = 9 findings + 1 ajout (pastille Chaleur) = 10 ; ouverts 8 + 1 ; assumé 1. |
| ④ | r4, 07/10 | NON APPROUVÉ, 0 bloquant, 3 majeurs, 7 mineurs (10) | 1 / 7 / 2. Total 10 = R6 + (R1-R5, R9, R10) + (R7, R8). |
| ⑤ | r1, 06/09 | NON APPROUVÉ, 5 bloquants, 7 majeurs, 10 mineurs (22) | 14 / 2 / 6. Total 22. |
| ⑥ | r3, 06/09 (r4 du 22/09 préparé, sans capture) | APPROUVÉ, 0 bloquant, 0 majeur, 14 mineurs | 14 / 0 / 0. Total 14. |
| ⑨ | r1, 06/09 | NON APPROUVÉ, 4 bloquants, 10 majeurs, 8 mineurs (22) | 3 / 20 / 0. Items = 22 + S03 = 23 ; ouverts B3, B4, S03. |
| ⑩ | aucun tour | — | 3 / 9 / 1. Items D01-D10 + D04′ + mention du bâtiment = 13. |
| ⑪ | aucun tour, aucune maquette | — | 0 / 0 / 0. `LaunderingController` est supprimé depuis 9be2fe9d (23/09, 28 fichiers, code mort). L'onglet Filière monte ㊵ (de3dd2b4). |
| ⑭ | r1, 07/09 (r2 du 22/09 préparé, sans capture) | NON APPROUVÉ, 4 bloquants, 1 majeur, 4 mineurs (9) | 2 / 7 / 0. Total 9. |

## 4. Animation et mouvement croisés (signalés seulement)
- ① : bandeau éphémère de 5 s avec fondu de 0,4 s (0b49a634) ; gyrophare en `hue-rotate` de 0,9 s, pouls de 1,1 s et tremblement d'aiguille de 4° sur 0,14 s (881c17f6). Aucune paire T/T+1 s n'a été fournie à un juge.
- ⑤ : carte inclinée de 2° (F14, statique) ; `ARBITRAGES-user-2026-09-07.md` pt 5 laisse « garder sans tween » non ratifié, la dernière parole de l'user étant « animé le truc ».
- ⑨/⑩ : l'appui long signe le tampon, et le talon et l'éventail de cartes sont gestuels (lots ⑩-1b à ⑩-1e). Rien n'est mesuré en mouvement.
- Aucun tour de mon périmètre ne contient de paire T/T+1 s. Le ruling « aucune animation sur un nouvel écran » n'est donc ni confirmé ni infirmé nulle part.

## 5. Somme de contrôle
| | A | B | C | total |
|---|---|---|---|---|
| ① | 5 | 4 | 14 | 23 |
| ② | 1 | 2 | 0 | 3 |
| ③ | 3 | 0 | 6 | 9 |
| ④ | 0 | 0 | 1 | 1 |
| ⑤ | 7 | 0 | 7 | 14 |
| ⑥ | 1 | 0 | 13 | 14 |
| ⑨ | 2 | 1 | 0 | 3 |
| ⑩ | 2 | 0 | 1 | 3 |
| ⑪ | 0 | 0 | 0 | 0 |
| ⑭ | 1 | 0 | 1 | 2 |
| **total** | **22** | **7** | **43** | **72** |

- Total ouverts = **72** = somme par écran (23+3+9+1+14+14+3+3+0+2) = A+B+C (22+7+43).
- CODÉS non rejugés = **51** : par écran 6+0+0+7+2+0+20+9+0+7 ; par classe A 30, B 4, C 17.
- Fermés/assumés = **12**.

**Limites**
- Les classes A/B/C sont les miennes, appliquées avec la règle que vous donnez. Les cas limites : ④ R6 classé C, ① M4 classé A, ⑨ M9 classé A.
- Plusieurs findings anciens de ①, qui ne sont pas dans r9, ne sont comptés nulle part. Ils sont à rejuger sur capture neuve : r8 m2, m5, m14, m18, m20 ; r5 F10, M1, M2, F8, M10 ; r3 F10 (`EC①` §3).
- ① n'a pas de capture depuis le 07/09, ⑥ depuis le 06/09, ③ depuis le 06/09 non plus. Les captures d'avant le 04/09 photographient un back périmé : les valeurs sont suspendues, la forme tient.
- Les éléments non jugés échappent au décompte : les états secondaires de ④ (4 autres cadres), l'organigramme de ⑥ avec le glyphe d'archétype, le fourneau de ② (cadres 45-47, décision de type en attente), et les sous-vues réécrites de ⑥.
