# ④ Accueil — dossier du juge visuel (écarts ASSUMÉS et décisions)

Référence qui fait foi : `ecrans-brennar-accueil.html`, cinq cadres re-rendus avec le chrome du HUD v3.1
(atelier da/2026-09-22 **5d1485c4**, cadres 2 et 4 re-rendus en **65be0216**). Juge r1 : `r1-2026-09-26/rapport.md`.

## Décisions (f2, 26/09 — « reco », réversibles)

| finding r1 | décision | pourquoi |
|---|---|---|
| F2 filet laiton pleine largeur | **ASSUMÉ** — chrome commun | La maquette HUD v3.1 fait foi pour le chrome PARTOUT (option (a)). La maquette ④ a été alignée (5d1485c4 : filet derrière le médaillon). |
| F5 typo du bandeau | **ASSUMÉ** — chrome commun | Idem : échelle du canon HUD rendue à 1080. |
| F6 dock (diamètre, empan) | **ASSUMÉ** — chrome commun | Idem ; maquette ④ alignée (ronds 46 → 35,2 CSS × 300/392). |
| F11 losange sous le médaillon | **ASSUMÉ** — chrome commun | Élément du canon HUD (TopBarController:1272). Présent dans les 5 cadres re-rendus. |
| F14 médaillon | **ASSUMÉ** — chrome commun | Idem. |
| F4 « ornement gris » | **PAS un écart** : c'est la VOLUTE du canon HUD (opacité 0,28) | Mesurée le 26/09 : encre de la référence re-rendue **(74,75,76)**, du jeu **(73,75,76)** ; boîte x 16..104 (réf) contre 12..104 (jeu). Même objet, même encre. |
| F19 3ᵉ suggestion (BLANCHIR au lieu d'ÉCRIRE UNE RÈGLE) | **le JEU a raison** | Ligne E de LA SUITE (table 76), décidée sur mesure UX ; le cadre 4 re-rendu (65be0216) montre labo · vente · planque. |
| F17 « LÉGÈRE » | **gris chaud éteint** ; la couleur est réservée à l'alarme | Cadre 4 re-rendu : LÉGÈRE (139,129,113) ; cadre 2 : MODÉRÉE gris intermédiaire ; GRAVE (182,170,144). |
| F3 le fond | **le quartier PEINT** (diorama du district, profil verge, NUIT dans tous les cas, comme les 5 cadres de la maquette — `DashboardController.ModeDuFond` renvoie « nuit » quelle que soit la phase servie ; D1 du juge de données r1 du 07/10 : la RAISON écrite est corrigée, pas le code) | Mieux que la carte vectorielle de ③ ; aucun art neuf. |

## Corrigés dans le jeu (lot du 26/09, CLIENT-1)

F1 (plus de bande : le fond peint monte derrière le bandeau), F3, F7 (pastille or sur FAMILLE, allumée par ≥ 1 rapport d'autonomie
servi), F8 (liseré laiton 3 px sur le BORD du panneau, ~66 %), F9 (pilule en dégradé ficheCtaOrHaut → ficheCtaOrBas, 385 u = 323 px),
F10 (crème chaud hudCremeSecondary / hudCreme au lieu des gris froids), F12 (plaques ficheGlassBottom, bord (32,37,47)), F13 (un or :
titres hudMoneyGold, TRANCHER ficheCtaOrHaut), F15 (marges 47 px), F16 (interlettrage de LA SUITE), F17.

⚠️ Les teintes mesurées sur la maquette (mélanges sRGB du navigateur) sont rendues par la couleur EXACTE du mélange linéaire
(`ProceduralUI.CouleurPourMelangeLineaire`), jamais par un alpha recopié — le projet est en espace linéaire.

## Instrument (planches)

P1 est photographiée APRÈS que LA SUITE soit lue (ClicheParcours, bcccdf7d) ; le délai est noté au journal.

## Juge ⊥ r3 (07/10) — décisions de f2 et état du code (écriture seule, NON COMPILÉ, rien mesuré sous Unity)

Rapport : `r3-2026-10-07/rapport.md` (NON APPROUVÉ, 1 bloquant, 4 majeurs, 10 mineurs ; 10 écarts du r1 fermés, LA SUITE à la maquette au bit près).
- **G1 BLOQUANT, G5 (même cause)** — le diorama de nuit n'était pas assombri : teinte (0,42 ; 0,42 ; 0,42) (`filter:brightness(.42)`) + le `voile-scene` de la maquette
  (`#0a0f18cc → 22 à 18 % → 00 à 40 % → 66`), l'alpha converti pour le mélange linéaire (`1 − (1−a)^2,2`). `DashboardController.TeinteDuFond`, `AlphaCssDuVoile`,
  `AlphaLineaireDuVoile`. **À MESURER** au créneau : luminance par tiers de bande contre la référence (cible ×1,0 ; le jeu était ×2,57 à ×3,01) et le rang du bouton or à 1080×2400 (cible 1/…).
- **G2, G3, G8** — la cause : `LaSuitePanelController.Melange` rend la couleur `C'` à poser AVEC l'opacité CSS ; ces jetons l'utilisaient en aplat OPAQUE, sans l'opacité, et
  quatre rôles sont devenus (73,85,96). Quatre valeurs mesurées sur la référence, par rôle : fond du bouton fantôme (20,26,36), séparateur (29,34,44), liseré du panneau (32,37,47),
  liseré de la file (41,53,70) ; liseré de 3 px (3,6 u).
- **G4** — le libellé des boutons fantômes : `hudCreme` (234,224,200), plus `onSurfacePrimary`.
- **G6** — les boutons épousent leur libellé (+ 2 × 10 px CSS), plus de largeur fixe de 385 u ; ils restent calés à droite (bord droit commun).
- **G7** — rayon du bouton : 34 u (28,8 px = 8 CSS px × 3,6) au lieu de 22 u.
- **G14** — LÉGÈRE `#8c8272`, MODÉRÉE `#a39985`, GRAVE `--creme-2` : jetons CSS en aplats exacts (même cause que G2).
- **G15 (pastille FAMILLE absente) : PAS UN DÉFAUT pour un compte neuf.** La pastille est « allumée par ≥ 1 rapport d'autonomie servi » (F7) ; un compte neuf n'en a aucun ; la maquette du cadre 4
  la dessine parce qu'elle montre un état avec un rapport. C'est un arbitrage de DONNÉE (juge-donnees), pas de rendu.
- **NON FAITS dans ce lot, avec la raison** : **G9 / G10** (rythme vertical −22 à −35 %, panneau −30 %) — `LaSuitePanelController.Ajuster` RÉDUIT À L'ÉCHELLE le bloc dès qu'il dépasse
  sa bande ; l'allonger pourrait le réduire, donc rétrécir ses marges latérales aujourd'hui EXACTES (49/49 px, #3) : à tenter avec une mesure de la bande à 1920 et à 2400.
  **G11 / G12 / G13** (interlettrage d'ARGENT, médaillon, losange) — chrome COMMUN du HUD v3.1, épinglé par les gardes `HUDv31` : à traiter avec elles, pas depuis ④.
- Tests purs : `FondEtVerreDeLAccueilPlayModeTests` (V1-V7, catégorie AccueilCanon). Planches au même endroit, puis r4 par un juge FRAIS.

## Juge ⊥ r4 (07/10) — décisions de f2 et état du code (écriture, typecheck 0 erreur, PAS ENCORE joué ni mesuré)

Rapport : `r4-2026-10-07/rapport.md` (NON APPROUVÉ, 0 BLOQUANT, 3 MAJEUR, 7 mineurs ; 8 écarts du r3 fermés, bouton or 1er aux deux résolutions, contraste des fantômes 2,81 → 13,07).
- **R1 MAJEUR** — hauteur fixe de 110 u (92 px) pour les trois boutons ; CAUSE : le groupe de mise en page du bouton forçait l'expansion en hauteur, donc se déclarait « flexible » et le parent l'étirait à la hauteur de sa rangée (119 / 133 px) — introduit par le correctif de G6.
- **R2 MAJEUR** — tailles : sous-ligne 30 → 38 u, libellé de bouton 28 → 33, « Lt. … » 34 → 40, TRANCHER 30 → 36 (mêmes polices : c'est la taille).
- **R3 MAJEUR** — le filet laiton est un PLATEAU (30 % → 70 %) avec rampes, sur `left:14px; right:14px` (55 u de retrait) ; sprite d'alpha converti pour le mélange linéaire.
- **R4 mineur** — PLANCHER additif de +5/255 (la mesure du juge : monter la teinte à 0,46 ne ferme que 28 %) : le diorama à l'alpha 252/255 sur un gris dont la luminance linéaire vaut lin(5/255)/(1 − a) ; la teinte reste 0,42.
- **R5** — verre dégradé (13,19,31) → (9,14,24). **R9** — rayon 38 u. **R10** — marges intérieures 58 / 62 u.
- **NON FAITS** : **R6** (conséquence de R2 et du reflux : se re-mesure), **R7** (zoom 91,7 % du diorama : aspect différent, rien ne dit que ce soit un défaut), **R8** (gouttière 37 / 49 px : élastique par construction, à trancher par f2).
- À MESURER au créneau (m18/m19/m39 du r4) : la part du décor sous la luminance 10 (cible 1,1 %), les hauteurs des trois boutons, les hauteurs de capitale, la loi du filet. Planches au même endroit, puis juge r5 frais.

### R7 et R8 — ASSUMÉS (f2, 07/10)
- **R7 (le diorama rendu à 91,7 % du zoom de la maquette)** : ASSUMÉ. La maquette (1080×2102) et le jeu (1080×1920 et 1080×2400) n'ont pas le même rapport d'aspect : le décor est en COVER, le cadrage suit l'écran ; rien ne le donne pour un défaut.
- **R8 (la gouttière panneau → plaque TRANCHER : 37 px à 1920, 49 px à 2400, réf 52)** : ASSUMÉ, élastique PAR CONSTRUCTION. Raison : l'aspect varie, et le panneau suit son contenu (ancré en bas, il pousse vers le haut) ; une gouttière constante exigerait de figer la hauteur de la bande, donc de rogner ou d'étirer l'un des deux.

## Dérogation du 07/10 — la raison de la file sur l'Accueil (décision de f2, acceptée)

Le cadre 4 (atelier master 0dd516e) porte, dans le bloc `.qui` de la ligne de file, la RAISON en réplique de lieutenant puis « Plusieurs attendent encore » (seulement s'il y a plusieurs cartes). La raison suit `ExceptionBandes.Replique`
(« … » seulement dans la bouche d'un lieutenant), **sauf sur un point : un texte servi SANS espace est un identifiant technique (`exc_demo_…`), et sur l'Accueil on se TAIT** (`ExceptionQueuePanelController.RaisonDeLaCarte` rend null — aucune ligne ; atelier 28 : jamais
une valeur machine brute à l'écran). `Replique` montre ce même identifiant nu dans ⑨, « pour que le trou se voie » : il reste visible là et dans la dette back **TD-453**. Dérogation tranchée par f2 le 07/10.

## Ancrage de la tête et de la suite sur la ligne de file (décision de f2, 08/10 soir) — fin de l'« hypothèse f2 »

- **Avant** (4739deb6) : la carte de tête au-dessus d'une ligne HAUTE était une bande ASSUMÉE, (0,252 ; 0,752) de la zone sûre. Aucun cadre ne
  la dessinait alors. f2 l'avait validée PROVISOIREMENT (« hypothèse f2 en attente de cadre ») et l'avait commandée à l'atelier.
- **Le cadre** : atelier master 5240cec, `ecrans-brennar-accueil.html`, cadre 5 « une carte de tête AU-DESSUS d'une ligne de file haute ». Mesuré
  par CLIENT-1 avec l'instrument de l'UX (`mesure-maquette-accueil.js`, copie qui va jusqu'au cadre 5 ; zone sûre 110 → 516, soit 406 px) :
  la ligne va de 424 à 506 ⇒ (0,0246 ; 0,2266) ; la tête de 212 à 414 ⇒ (0,2512 ; 0,7488). La marge entre la ligne et la tête est de 10 px
  (0,0246), et la hauteur de la tête de 202 px, la même qu'aux cadres 1-3 (252 → 454 au-dessus de la ligne 464 → 506). La mesure de CLIENT-3
  (tête 0,2509-0,7488 ; ligne 0,0246-0,2263) concorde.
- **La décision** : la tête ET la suite s'ANCRENT sur le haut RÉEL de la ligne, plus une marge de 0,025. La ligne n'est plus une bande fixe.
  Son haut est le plus haut de deux valeurs : sa bande mesurée pour son état (`BandeFile`, `BandeFileHaute`) et la hauteur que son contenu
  VEUT (`HauteurVoulueDeLaLigne`, padding compris : une raison sur deux lignes la fait grandir si elle ne tient plus). La tête garde sa
  hauteur (0,5). La suite garde le haut mesuré pour son état (0,746 ; 0,810 au cadre 4). Code : `AppShell.HautDeLaLigne`, `BandeTeteSur`,
  `BandeSuiteSur` et `AncrerSurLaLigne`, rejoué à chaque reconstruction par résolution (la hauteur voulue est en u, la zone sûre change).
  La règle retrouve les cadres 1-5 à 0,005 près (garde A12d). La bande assumée (0,252 ; 0,752) est RETIRÉE.
- **Gardes** : A12c (AccueilCanon, vrai shell, hors réseau ; raison sur une puis deux lignes : le haut de la ligne est celui de la règle, la
  tête est à la marge, rien ne se recouvre) ; A01 (ClichePlanchesParEcran, aux deux résolutions, dans le régime de capture ; deux
  variantes : suite et raison courte, puis tête et raison longue ; un écart négatif entre ce qui est au-dessus et la ligne est une
  INTERSECTION, et le test rougit).
- **Écart C** : le haut de la tête vaut 0,752 dans le jeu contre 0,7488 au cadre 5 (moins d'1 px CSS). Le jeu garde la hauteur 0,5 des
  cadres 1-3.

## La carte de tête reconstruite sur le cadre 5 (décision de f2, 08/10 nuit) — options en TEXTE jusqu'à TD-724

- **Le constat** : sur la planche A01 « tête » du créneau du 08/10 nuit, la carte de tête était l'ANCIEN widget W3U1. Ses textes de 14-18 u
  débordaient en haut à gauche du bloc, et sa rangée d'actions s'étirait en un aplat `accentGold` sur toute la hauteur. Aucun cadre ne le
  dessinait : un A visible.
- **La reconstruction** (`HighestLeverageCardController`) : la structure, la typographie, la matière et la place du cadre 5
  (`ecrans-brennar-accueil.html`, atelier master 5240cec, règles `.acc4`).
  - Le verre est CELUI de « LA SUITE » (`LaSuitePanelController.PoserLeVerre`, une seule matière). Il est ancré au BAS de sa bande, à sa
    hauteur préférée, et réduit à l'échelle s'il dépasse ; son bas reste à la marge de la ligne de file.
  - `.titre` : sérif, 16 px CSS, or #f2c96b. `.niveaux` : PORTÉE et URGENCE (6,6 px, gras, capitales, #b9ad92), valeurs en sérif 10 px
    #eae0c8. `.sur` : « Ce qu'on peut faire ». Échelle 300 CSS = 1 280 u.
- **Les règles de f2, tant que TD-724 (hl-card « agit ») n'est pas livré** (mesuré : le commit ne reçoit AUCUNE option,
  `hl-card.controller.ts:41-46` ; `DecisionOption` = « descriptive flavor », `hl-card-types.ts:99-105`) :
  - les OPTIONS sont des FAITS de la carte, en TEXTE `.csq4` (8 px, #b9ad92, deux colonnes centrées). Rien ne doit avoir l'air d'un bouton :
    ni cerne, ni plaque, ni flèche (garde A14) ;
  - UN seul geste, « PRENDRE ACTE », à appui long, dans la grammaire `.g.or` du cadre (la pilule lustrée ficheCtaOrHaut → ficheCtaOrBas,
    bord ficheCtaOrBord, encre ficheCtaOrEncre : les jetons égalent le CSS au 1/255). Sous lui, sa conséquence vraie : « prendre acte n'agit
    pas à votre place » ;
  - l'alternative par SAISIE du canon est DISCRÈTE : cachée au repos, un appui court sur le geste la révèle (patron ㉓). Le mot-clé est le
    libellé du geste (« PRENDRE ACTE »), plus « COMMIT ». L'indication « tapez {mot} » a une clé NEUVE, `accueil.carte.tapez_mot`, à la
    liste des mots.
  - Quand TD-724 sera livré, les options redeviendront des gestes (cadres 1 et 5 : « Mettre en réparation » / « Laisser en l'état », avec
    leurs lignes de conséquence).
- **Variantes** : la carte des rapports (cadre 2) garde son geste RÉEL « LIRE MAINTENANT » (navigation, aucun commit), même grammaire ;
  « Laisser en attente » est retiré (skip, geste mort, 2b56310b). Le calme (cadre 0) : le titre et « Aucune décision en attente ». La limite
  de structure atteinte : le titre, les niveaux, « Limite de structure atteinte », et AUCUN geste (le commit refuserait toujours).
- **Écarts ASSUMÉS** : pas de lignes de conséquence sous les options (non servies, TD-724) ; « Prêt » n'est plus dit (le cadre 5 n'a pas de
  ligne d'état).
