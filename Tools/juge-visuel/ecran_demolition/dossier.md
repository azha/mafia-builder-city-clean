# Dossier du juge visuel — ecran_demolition — rempli le 2026-10-08 (CLIENT-1, propriétaire de l'écran)

> Généré depuis `.claude/skills/juge-visuel/dossier-gabarit.md` (dépôt back) par
> `Tools/nouvel-ecran.py`. Tout ce qui est entre chevrons se remplace ; tout ce qui ne peut pas
> être rempli se dit « non fourni » avec la raison — jamais supprimé.

## L'écran

- **Nom** : La démolition (`ecran_demolition`)
- **Ce qu'on vient y faire** : voir ce que l'accumulation de bâtiments coûte à l'organisation (la friction), et décider d'en raser un.
- **Chemin joueur pour y arriver** : onglet `More` (AppShell.Tab.More)
- **États capturés** : compte NEUF (friction = 0) — c'est l'état qu'un joueur neuf voit, et le seul que le harnais `PlanchesParEcran`
  produit (07/10). Aucun cadre « état vide » n'existe pour ㉝ : le gabarit (compteur + titre + bande basse + geste) se juge sur le
  cadre nominal ; l'encadré ambre (`.dm-penal`) n'est attendu que si `penalty_active`.
- **Routes du domaine** :
  - `GET /v1/friction/state`
  - `GET /v1/friction/nodes/:buildingId`
  - `POST /v1/friction/nodes/:buildingId/decommission`
  - `GET /v1/friction/replacement-options`
  - `POST /v1/friction/replacement-options/:id/pick`
  - `GET /v1/world/districts`
  - `GET /v1/city/district/:districtId/interior`

## Référence (fait autorité : l'IMAGE)

| fichier | rôle | taille px | facteur de rendu | largeur CSS ↔ largeur Unity |
|---|---|---|---|---|
| `Tools/juge-visuel/ecran_demolition/reference-1080x2102.png` | rendu ratifié = **cadre 80** « Ce bâtiment vous coûte » (identité MESURÉE par le juge du 07/10 : `r-groupe-2026-10-07/mesures/m_identite_references.py`, 1,283 contre 52,8 / 53,3 / 54,2) | 1080×2102 | ×3,6 | 300 CSS = 1080 px |
| `Tools/juge-visuel/v6/m-80.png` | canon antérieur (série 2) — témoin, jamais la référence | 900×1752 | ×3,0 | 300 CSS = 900 px |
| `~/project/atelier3d-mafia/ecrans-brennar-6.html` cadres 79-84 de l'INDEX (⚠️ le fichier compte 154 cadres au 08/10, atelier `7159e54` : relire le numéro par le texte du cadre) | source HTML/CSS (aide de lecture, ne prime jamais sur l'image) | — | — | — |

- **Script de rendu** : rendu de l'atelier (re-rendu `d84c6eb`, cité par le juge du 07/10) ; assertion de largeur : 1080 px mesurés.
- **Polices — ce qui a RÉELLEMENT rendu** (`fc-match` sur la machine du rendu) :

      'DejaVu Sans'   →  DejaVuSans.ttf: "DejaVu Sans" "Book"
      'DejaVu Serif'  →  DejaVuSerif.ttf: "DejaVu Serif" "Book"
      (fc-match lancé le 2026-10-08 sur la machine de l'atelier ; familles CSS du fichier : DejaVu Sans, DejaVu Sans Mono, DejaVu Serif)

  Le client embarque : DejaVu Sans / DejaVu Serif — les mêmes familles (encre du titre identique au bit près, juge du 07/10).
  ⇒ Un écart de FAMILLE de police est un ARBITRAGE, pas un défaut.

## Captures en jeu (Play Mode réel, locataire réel)

| fichier | résolution | rect imprimé par le test | état | test |
|---|---|---|---|---|
| `Tools/juge-visuel/planches-par-ecran-2026-10-07/E06_Dmolition_1080x2400.png` (+ `_1080x1920`, + les deux `_bas`) | 1080×2400 / 1080×1920 | voir `journal.tsv` de la série | compte neuf, friction 0 | `PlanchesParEcran` (`ClichePlanchesParEcran`), HEAD client `4087a758` |
| `Assets/Screenshots/planche_raser_un_site_1080x2400.png` | 1080×2400 | — | antérieure (07/09) | campagne `PhotoPlanche` — TÉMOIN, plus la planche qui fait foi |

⛔⛔ **CE DOSSIER POINTAIT SUR DEUX PLANCHES VIDES — corrigé le 2026-09-07.**
Les deux captures `ecran_demolition_…` mesurent **0,000 % d'encre**. **Cause à l'inventaire, TD-541** :
`MonterEcran()` n'appelle jamais `SetToken`, l'amorce sort immédiatement, et la capture est prise **une
frame après la création** — écran monté, **jamais chargé**. Elles ne photographient que la charpente.
⇒ **La planche qui fait foi est celle qui passe par le chemin du joueur** — `planche_raser_un_site`,
**3,457 %** d'encre, et c'est celle que la table de `construire-dossiers.py` désigne pour ㉝ depuis le
2026-09-04 (`confiance="mesurée"`, le contrôleur cite m-79..84, nominal 80).
⚠️ **Ce dossier est ANTÉRIEUR à cette table** et n'est pas une sortie du générateur : la correction de
la table ne pouvait pas l'atteindre. *Celui qui est généré suit, celui qui est écrit à la main reste.*
⇒ **Un juge l'aurait suivi et aurait jugé la charpente en croyant juger l'écran.** Voir
`Tools/juge-visuel/ecran_delegation/dossier.md` pour le balayage complet de la classe (4 sur 124).

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
| **A1 du juge du 07/10 — la voix du lieutenant absente de la bande basse** | la voix n'est pas servie (TD-823, registre back) ; **décision de f2 : « bande basse sans voix »** (08/10, répondant au juge) — la bande garde sa plaque `#141a21`, son filet de 2 px `#2c3640` et le geste (`DemolitionScreenController.ConstruirePied`) ; la voix ne s'affiche que si le roster servi nomme un lieutenant (table 64) | décision de f2 du 08/10 ; TD-823 |
| décor de scène (aplat au lieu de l'art peint) | lot décor en cours (CLIENT-2) | juge du 07/10, « ASSUMÉ, non classé » |
| encadré ambre `.dm-penal` absent | cohérent avec l'état : friction = 0, `penalty_active` faux sur un compte neuf | juge du 07/10, C3 |

## Format du RAPPORT — imposé

Un finding par ligne, dans UNE table :

| id | gravité | critère | écart | mesure | ce que je n'ai pas pu vérifier |
|---|---|---|---|---|---|
| `F1` | `BLOQUANT` \| `MAJEUR` \| `MINEUR` | `DÉJÀ APPLIQUÉ` \| `NOUVEAU` | <l'écart> | <les nombres> | <ou vide> |

## Ce qui N'EST PAS fourni — et ne doit pas être cherché

- le code du client (`Assets/Scripts`) et ses tests ;
- les notes d'implémentation du chantier ;
- les rapports des juges précédents (`Tools/juge-visuel/ecran_demolition/r1-2026-09-07/`, `r2-2026-09-22/`, `r-groupe-2026-10-07/`).
- toute capture « avant » — sauf si listée ci-dessus avec la preuve qu'UNE seule variable change.
