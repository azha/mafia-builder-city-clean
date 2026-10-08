# Dossier du juge visuel — screen_c2 — rempli le 2026-10-08 (CLIENT-1, propriétaire de l'écran)

> Généré depuis `.claude/skills/juge-visuel/dossier-gabarit.md` (dépôt back) par
> `Tools/nouvel-ecran.py`. Tout ce qui est entre chevrons se remplace ; tout ce qui ne peut pas
> être rempli se dit « non fourni » avec la raison — jamais supprimé.

## L'écran

- **Nom** : La filière (㊵, `screen_c2`, `FiliereScreenController`)
- **Ce qu'on vient y faire** : voir où en est chaque étape de la filière de blanchiment (combien d'étapes, combien sont propres, où elle s'écarte de son profil), et y faire passer l'argent de la planque.
- **Chemin joueur pour y arriver** : onglet `More` (AppShell.Tab.More) → LA FILIÈRE
- **États capturés** : compte NEUF, aucune filière (aucun nœud) — c'est l'état qu'un joueur neuf voit, et le seul que le harnais
  `PlanchesParEcran` produit (07/10). Son homologue exact est le **cadre 140** « Vous n'avez pas encore de filière » (boîte de chaîne vide,
  phrase italique centrée, INJECTER au pied). L'état nominal (filière montée, cadre 137) n'est **pas capturé** : non fourni, faute de
  compte avec un nœud injecté dans le harnais.
- **Routes du domaine** :
  - `GET /v1/laundering/:nodeId`
  - `GET /v1/laundering/:nodeId/pipeline`
  - `POST /v1/laundering/inject`
  - `POST /v1/laundering/stage`

## Référence (fait autorité : l'IMAGE)

| fichier | rôle | taille px | facteur de rendu | largeur CSS ↔ largeur Unity |
|---|---|---|---|---|
| `Tools/juge-visuel/screen_c2/reference-1080x2102.png` | rendu ratifié = **cadre 137** « La filière — où en est chaque étape » (identité MESURÉE par le juge du 07/10 : `r-groupe-2026-10-07/mesures/m_identite_references.py`, 0,904 contre 6,3 → 15,7) | 1080×2102 | ×3,6 | 300 CSS = 1080 px |
| cadre **140** « Vous n'avez pas encore de filière » (rendu par le juge du 07/10) | référence d'ÉTAT, homologue du compte neuf | 1080×2102 | ×3,6 | 300 CSS = 1080 px |
| `Tools/juge-visuel/v6/m-137.png` | canon antérieur — témoin, jamais la référence | 900×1752 | ×3,0 | 300 CSS = 900 px |
| `~/project/atelier3d-mafia/ecrans-brennar-6.html` cadres 137-142 (atelier `7159e54`, 149 cadres ; numéros = **index à partir de 0** des `<div class="etiquette">`, convention de `rendre-references-dues.py` et de l'INDEX) | source HTML/CSS (aide de lecture, ne prime jamais sur l'image) | — | — | — |

- **Script de rendu** : rendu de l'atelier (référence commitée le 2026-09-09 ; cadres 137-142 re-rendus par le juge du 07/10) ; assertion de largeur : 1080 px mesurés.
- **Polices — ce qui a RÉELLEMENT rendu** (`fc-match` sur la machine du rendu) :

      'DejaVu Sans'   →  DejaVuSans.ttf: "DejaVu Sans" "Book"
      'DejaVu Serif'  →  DejaVuSerif.ttf: "DejaVu Serif" "Book"
      (fc-match lancé le 2026-10-08 sur la machine de l'atelier ; familles des règles `.bln6` du fichier : 'DejaVu Sans' ×14, 'DejaVu Serif' ×2, aucune autre)

  Le client embarque : DejaVu Sans / DejaVu Serif — les mêmes familles (encres du titre et du geste à 1/255, juge du 07/10).
  ⇒ Un écart de FAMILLE de police est un ARBITRAGE, pas un défaut.

## Captures en jeu (Play Mode réel, locataire réel)

| fichier | résolution | rect imprimé par le test | état | test |
|---|---|---|---|---|
| `Tools/juge-visuel/planches-par-ecran-2026-10-07/E10_Filire_1080x2400.png` (+ `_1080x1920`, + les deux `_bas`) | 1080×2400 / 1080×1920 | voir `journal.tsv` de la série (E10 : « chargé (RenduTermine) ») | compte neuf, aucune filière | `PlanchesParEcran` (`ClichePlanchesParEcran`), HEAD client `4087a758` |
| `Assets/Screenshots/screen_c2_1080x1920.png`, `screen_c2_1080x2400.png` | — | — | antérieures | `ScreenC2C1_CapturerPourLeJugeVisuel_DeuxResolutions` — TÉMOINS, plus les planches qui font foi |

⚠️ Ces planches sont ANTÉRIEURES aux correctifs A2/A3 (`ff5ec89a`), B1/Q2 (`0ea62678`) et au décor de CLIENT-2 (A1) : à reprendre au
prochain créneau, et cette ligne à mettre à jour.

- Garde anti-vide du test : pixels hors du fond dominant > 0 (plancher bas — squelette non rempli).
- Commit du client au moment des captures : `4087a758` (07/10) (une capture est une mesure DATÉE, pas une
  propriété du commit — la prendre APRÈS le dernier correctif).

## Échelle — OBLIGATOIRE, jamais déduite par le juge

Trois nombres, toujours les trois :

| | px de l'image | largeur CSS de référence | facteur |
|---|---|---|---|
| RÉFÉRENCE | 1080 | 300 | **×3,6** |
| CAPTURE   | 1080 | 300 (le canvas de 1280 u est rendu sur 1080 px) | **×3,6** |
| | | **rapport capture ÷ référence** | **1,000 en X** ; en Y la référence est un gabarit de 2102 px pour 2400/1920 : comparer en % de la hauteur |

- Dire explicitement que ce rapport est **NORMAL**, et que **toute mesure se ramène en px CSS**
  avant de conclure à un écart.
- Dire aussi ce que la normalisation NE couvre pas : les rapports INTERNES restent des défauts
  réels même après normalisation.

## Règles de doctrine applicables

- gouttière : le contenu d'écran reste dans le rect du fond ; seul le chrome traverse
- contraste : ≥ 3:1 grands textes, ≥ 4,5:1 petits (sur l'art réel, pas un gris choisi)
- langue affichée : français, via résolveurs nommés (aucun enum brut à l'écran)
- safe area / portrait : le projet est configuré portrait seul
- **animation : AUCUNE sur un nouvel écran** (ruling user 2026-08-27) : fournir deux captures du
  même état à T et T+1 s ; le juge exige 0 pixel différent

## Écarts ASSUMÉS (à inventorier, à classer ASSUMÉ, à vérifier « rendu proprement »)

| écart | raison mesurée | source |
|---|---|---|
| **B1 du juge du 07/10 — le libellé du 2ᵉ compteur** : « 01 propres » (cadres 137, 138 ; « 00 propres » au cadre 140), plus « 00 /4 propre au bout » (cadre 141) — relu par le TEXTE des cadres le 2026-10-08 (atelier `7159e54`) | **règle de f2 (08/10)** : le libellé suit l'état que dessine le cadre — la forme « N/M PROPRE AU BOUT » si le back SERT le compte des étapes propres, sinon « PROPRES ». **MESURÉ** (back `a0a7672b`, `operational/laundering/laundering.projection.service.ts:85-92, 155-164`) : `GET …/laundering/:nodeId/pipeline` ne sert que `stages[]` (`cleanliness_band`, `terminal`, `has_cash`) — **aucun compte** (« chain LENGTH … NOT surfaced as a raw number »). ⇒ « PROPRES » partout, sans dénominateur ; le nombre = les étapes dont la bande servie est `CLEAN` (cadre 137 : une seule étape propre ⇒ « 01 »). Libellé en capitales par le style (`.bln6 .fen>span{text-transform:uppercase}`), la valeur servie `filiere.bloc.propres` étant « propres » | décision de f2 du 08/10 ; mesure ci-contre |
| **Q2 — le geste au pied AVEC une filière montée** (cadres 137 et 138 : INJECTER sous le panneau) | **décision de f2 (08/10)** : la planque est lue AUSSI en nominal ; le pied porte le geste quand la planque servie tient de quoi blanchir (absent sinon, jamais éteint). Le libellé reste BLANCHIR (mot ratifié, table 77) et sa note « l'argent passe de la planque à la filière » | décision de f2 du 08/10 |
| décor de scène (aplat au lieu de l'art peint) | lot décor de CLIENT-2 (`6a2ce634` sur `feat/decor-de-scene`, pas encore sur le cumul au 08/10) | juge du 07/10, « ASSUMÉ, non classé » |

## Format du RAPPORT — imposé

Un finding par ligne, dans UNE table :

| id | gravité | critère | écart | mesure | ce que je n'ai pas pu vérifier |
|---|---|---|---|---|---|
| `F1` | `BLOQUANT` \| `MAJEUR` \| `MINEUR` | `DÉJÀ APPLIQUÉ` \| `NOUVEAU` | <l'écart> | <les nombres> | <ou vide> |

## Ce qui N'EST PAS fourni — et ne doit pas être cherché

- le code du client (`Assets/Scripts`) et ses tests ;
- les notes d'implémentation du chantier ;
- les rapports des juges précédents (`Tools/juge-visuel/screen_c2/r1-2026-09-06/`, `r-groupe-2026-10-07/`).
- toute capture « avant » — sauf si listée ci-dessus avec la preuve qu'UNE seule variable change.
