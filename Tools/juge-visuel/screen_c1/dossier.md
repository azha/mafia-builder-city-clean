# Dossier du juge visuel — screen_c1 — rempli le 2026-10-08 (CLIENT-1, propriétaire de l'écran)

> Généré depuis `.claude/skills/juge-visuel/dossier-gabarit.md` (dépôt back) par
> `Tools/nouvel-ecran.py`. Tout ce qui est entre chevrons se remplace ; tout ce qui ne peut pas
> être rempli se dit « non fourni » avec la raison — jamais supprimé.

## L'écran

- **Nom** : Le journal & la rue (㊳, `screen_c1`, `JournalScreenController`)
- **Ce qu'on vient y faire** : prendre la température de la ville au matin (ce qui fait la une, ce qui se dit dans la rue, ce qui est en cours) et décider d'y prêter attention.
- **Chemin joueur pour y arriver** : onglet `More` (AppShell.Tab.More) → LE JOURNAL & LA RUE
- **États capturés** : compte NEUF, journal CHARGÉ (`DernierChargement`) : 05 à la une, 00 dans la rue, 00 en cours, cinq brèves de presse —
  le seul état que produit le harnais `PlanchesParEcran` (08/10), le MÊME aux deux résolutions (au 07/10 la 2400 montrait l'état « pas encore
  ouvert » : corrigé). Aucun cadre n'en est l'homologue exact : le cadre 125 dessine un joueur établi (01/04/03). Les états « dans la rue » et
  « en cours » (puce colorée, horodatage à droite) ne sont **pas capturés** : non fourni, faute de compte qui en porte.
- **Routes du domaine** :
  - `GET /v1/news/feed`
  - `GET /v1/news/beats/:id`
  - `GET /v1/ambient/feed`
  - `POST /v1/ambient/attend/:id`
  - `GET /v1/world/districts`
  - `GET /v1/random-world/active`
  - `GET /v1/random-world/known-couplings`
  - `POST /v1/random-world/hollow/:eventId/attend-funeral`

## Référence (fait autorité : l'IMAGE)

| fichier | rôle | taille px | facteur de rendu | largeur CSS ↔ largeur Unity |
|---|---|---|---|---|
| `Tools/juge-visuel/screen_c1/reference-1080x2102.png` | rendu ratifié = **cadre 125** « Le journal — ce qui se dit ce matin », RE-RENDU le 2026-10-08 sur l'atelier master `7d88a65` (sha256 `3de6fc4fc115a666…`) | 1080×2102 | ×3,6 | 300 CSS = 1080 px |
| `Tools/juge-visuel/screen_c1/reference-vocabulaire-1080x2102.png` | témoin de VOCABULAIRE = **cadre 145** « Les onze crans, tous », re-rendu le même jour (sha256 `dfa0fef4f784798f…`) | 1080×2102 | ×3,6 | 300 CSS = 1080 px |
| cadres 126-130 (« Ce qui arrive à la ville », « La rivière ne se retirera pas », « Ce que vous avez compris », « Rien ce matin », « Ce qui manque encore ») | références d'ÉTAT | 1080×2102 | ×3,6 | 300 CSS = 1080 px |
| `Tools/juge-visuel/v6/m-125.png` | canon antérieur — témoin, jamais la référence | — | — | — |
| `~/project/atelier3d-mafia/ecrans-brennar-6.html` cadres 125-130 et 145 (atelier `7d88a65` ; numéros = **index à partir de 0** des `<div class="etiquette">`, relus par leur TEXTE le 2026-10-08) | source HTML/CSS (aide de lecture, ne prime jamais sur l'image) | — | — | — |

- **Script de rendu** : `Tools/rendre-tel.py ~/project/atelier3d-mafia/ecrans-brennar-6.html 125 <sortie> 3.6` (et 145) — 2026-10-08 ; « ✅ non rogné », 1080×2102 mesurés ; deux rendus successifs : **0 px** d'écart (rendu déterministe).
  Pourquoi re-rendre : la référence du 2026-09-03 portait l'ANCIEN HUD (9 194 px d'écart, y 78-193) ; le rendu du juge du 07/10 (`r-groupe-2026-10-07/ref/cadre-125.png`, atelier `d84c6eb`) est identique au nouveau au-dessus de y 880 (**0 px**), et n'en diffère sous y 880 (21 203 px, y 886-1528) que par le balayage cyan de la liste, figé dans son rendu et retiré depuis (atelier `9469d5a`, « 6 balayages cyan sans cause retirés »).
- **Polices — ce qui a RÉELLEMENT rendu** (`fc-match` sur la machine du rendu) :

      'DejaVu Sans'   →  DejaVuSans.ttf: "DejaVu Sans" "Book"
      'DejaVu Serif'  →  DejaVuSerif.ttf: "DejaVu Serif" "Book"
      (fc-match lancé le 2026-10-08 sur la machine du rendu ; familles des règles `.jrn6` du fichier : 'DejaVu Sans' ×42, 'DejaVu Serif' ×14, aucune autre)

  Le client embarque : DejaVu Sans / DejaVu Serif — les mêmes familles (titre sérif, or à 1/255 : juge du 07/10).
  ⇒ Un écart de FAMILLE de police est un ARBITRAGE, pas un défaut.

## Captures en jeu (Play Mode réel, locataire réel)

| fichier | résolution | rect imprimé par le test | état | test |
|---|---|---|---|---|
| `Tools/juge-visuel/planches-par-ecran-2026-10-08/E01_Journal_1080x2400.png` (+ `_1080x1920`, + les deux `_bas`) | 1080×2400 / 1080×1920 | `journal.tsv` de la série, E01 : « chargé (DernierChargement) · le contenu DÉBORDE de 1258.7 u — planche _bas prise » | compte neuf, journal chargé | `PlanchesParEcran` (`ClichePlanchesParEcran`), HEAD client `884db988` |
| `Assets/Screenshots/screen_c1_1080x1920.png`, `screen_c1_1080x2400.png` | — | — | antérieures | `ScreenC1C1_CapturerPourLeJugeVisuel_DeuxResolutions` — TÉMOINS, plus les planches qui font foi |

⚠️ Ces planches sont ANTÉRIEURES au décor de CLIENT-2 sur ㊳ (`feat/decor-de-scene`) et aux correctifs A1-A4 / B1-B2 du juge du 07/10 :
à reprendre au prochain créneau, et cette ligne à mettre à jour.

- Garde anti-vide du test : pixels hors du fond dominant > 0 (plancher bas — squelette non rempli).
- Commit du client au moment des captures : `884db988` (08/10) (une capture est une mesure DATÉE, pas une
  propriété du commit — la prendre APRÈS le dernier correctif).

## Échelle — OBLIGATOIRE, jamais déduite par le juge

Trois nombres, toujours les trois :

| | px de l'image | largeur CSS de référence | facteur |
|---|---|---|---|
| RÉFÉRENCE | 1080 | 300 | **×3,6** |
| CAPTURE   | 1080 | 300 (le canvas de 1280 u est rendu sur 1080 px ; gouttière canonique 13 CSS = 46,8 px retrouvée à x = 46) | **×3,6** |
| | | **rapport capture ÷ référence** | **1,000 en X** ; en Y la référence est un gabarit de 2102 px pour 2400/1920 : comparer en % de la hauteur, ou des épaisseurs et hauteurs de capitale |

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
| décor de scène (aplat au lieu du fond peint, halos, cerne laiton `.jrn6 .cerne` à y 452-454 et 2076-2078 de la référence) | lot décor de CLIENT-2 (`feat/decor-de-scene`, posé sur ㊳ avec l'accord du propriétaire, pas encore sur le cumul au 08/10) | juge du 07/10, « ASSUMÉ, non classé » |
| valeurs du HUD et des compteurs (10 000 € · Froid · JOUR 1 · Aube ; 05/00/00) contre 24 850 € · Tiède · JOUR 12 · Plein jour ; 01/04/03 | DONNÉES d'un compte neuf servies par le back ; le cadre 125 dessine un joueur établi. Une valeur n'est pas un écart de forme | état capturé (ci-dessus) |
| bandeau « Lt. … attend vos ordres — trancher » au-dessus de l'enseigne | chrome du shell (file d'exceptions de l'Accueil, ④), présent dès qu'un lieutenant attend ; le cadre 125 n'en a aucun en file. Hors du rect de l'écran | AppShell (`ExceptionQueuePanelController`) |

## Format du RAPPORT — imposé

Un finding par ligne, dans UNE table :

| id | gravité | critère | écart | mesure | ce que je n'ai pas pu vérifier |
|---|---|---|---|---|---|
| `F1` | `BLOQUANT` \| `MAJEUR` \| `MINEUR` | `DÉJÀ APPLIQUÉ` \| `NOUVEAU` | <l'écart> | <les nombres> | <ou vide> |

## Ce qui N'EST PAS fourni — et ne doit pas être cherché

- le code du client (`Assets/Scripts`) et ses tests ;
- les notes d'implémentation du chantier ;
- les rapports des juges précédents (`Tools/juge-visuel/screen_c1/r1-2026-09-07/`, `r2-2026-09-22/`, `r-groupe-2026-10-07/`).
- toute capture « avant » — sauf si listée ci-dessus avec la preuve qu'UNE seule variable change.
