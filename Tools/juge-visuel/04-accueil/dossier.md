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
| F3 le fond | **le quartier PEINT** (diorama du district, profil verge, jour/nuit selon la phase servie) | Mieux que la carte vectorielle de ③ ; aucun art neuf. |

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
