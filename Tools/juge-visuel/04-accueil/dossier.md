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
