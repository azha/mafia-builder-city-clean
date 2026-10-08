# Dossier du juge visuel — ecran_appro — rempli le 2026-10-08 (CLIENT-1, propriétaire de l'écran)

> Généré depuis `.claude/skills/juge-visuel/dossier-gabarit.md` (dépôt back) par
> `Tools/nouvel-ecran.py`. Tout ce qui est entre chevrons se remplace ; tout ce qui ne peut pas
> être rempli se dit « non fourni » avec la raison — jamais supprimé.
> (L'avertissement « NON JUGÉ » du 2026-09-03 est retiré : l'écran a été capturé et jugé depuis — juges r1 du 07/09, r2 du 22/09, groupé du 07/10.)

## L'écran

- **Nom** : La chaîne d'appro (㉚, `ecran_appro`, `ChaineDApproScreenController`)
- **Ce qu'on vient y faire** : savoir où en est la matière première d'un labo — ce qu'il en reste, ce que ça coûte, de quelle humeur est le
  fournisseur — et en commander.
- **Chemin joueur pour y arriver** : onglet `More` (menu « Plus », `AppShell.DestinationsPlus()`) → LA CHAÎNE D'APPRO
- **États capturés** : compte NEUF, bon CHARGÉ (`DernierChargement`) : Pyralin « pour le brindle », « il n'y a plus rien · 0 L », « le prix monte »,
  « il vous prend encore au sérieux » ; « LA CHAÎNE, EN REMONTANT · Rien ne circule encore : vos maillons attendent une première commande. » ; la voix
  du lieutenant (« Lt. Sarre : « L'étagère est vide. Sans Pyralin, je ne rallume pas. » ») et le geste « EN COMMANDER » en bande basse — le seul état
  que produit le harnais `PlanchesParEcran` (08/10), le même aux deux résolutions (tout tient, aucun défilement). Homologue : le **cadre 48**
  (« Commander — et il n'y a plus rien »). Les états « en route » (49), « ça coince » (50-52) et « délégué » (53) **ne sont pas capturés** : non fourni,
  faute de commande passée sur ce compte (aucune n'est passée par le harnais : le geste coûte).
- **Routes du domaine** :
  - `GET /v1/operational/precursors?building_id=<uuid>` — `building_id` OBLIGATOIRE (422 sans lui, mesuré 2026-09-03)
  - `POST /v1/operational/precursors/order`
  - `GET /v1/supply-chain/graph` — SANS le préfixe `operational/` (mesuré)
  - `POST /v1/supply-chain/legs/:id/maintain` — non câblée (aucun `leg_id` connu)

## Référence (fait autorité : l'IMAGE)

| fichier | rôle | taille px | facteur de rendu | largeur CSS ↔ largeur Unity |
|---|---|---|---|---|
| `Tools/juge-visuel/ecran_appro/reference-1080x2102.png` | rendu ratifié = **cadre 48** « Commander — et il n'y a plus rien », RE-RENDU le 2026-10-08 sur l'atelier master `5240cec` (sha256 `01680c13b7aff0c0…`) | 1080×2102 | ×3,6 | 300 CSS = 1080 px |
| `Tools/juge-visuel/ecran_appro/r-groupe-2026-10-07/ref/cadre-49.png` … `cadre-53.png` (« La commande est en route », « Ça coince — un cran remonté », « … deux crans remontés », « On a trouvé où ça coince », « Commander ne vous appartient plus ») | références d'ÉTAT (non capturées), rendues par le juge du 07/10 | 1080×2102 | ×3,6 | 300 CSS = 1080 px |
| `Tools/juge-visuel/v6/m-48.png` | canon antérieur — témoin, jamais la référence | — | — | — |
| `~/project/atelier3d-mafia/ecrans-brennar-6.html` cadres 48-53 (atelier `5240cec` ; numéros = **index à partir de 0** des `<div class="etiquette">`, relus par leur TEXTE le 2026-10-08 ; préfixe `.appr6`) | source HTML/CSS (aide de lecture, ne prime jamais sur l'image) | — | — | — |

- **Script de rendu** : `Tools/rendre-tel.py ~/project/atelier3d-mafia/ecrans-brennar-6.html 48 <sortie> 3.6` — 2026-10-08 ; « ✅ non rogné », 1080×2102 ;
  deux rendus successifs : **0 px** d'écart (déterministe) ; identique à **0 px** au rendu du juge du 07/10 (`r-groupe-2026-10-07/ref/cadre-48.png`, atelier `d84c6eb`).
  Pourquoi re-rendre : la référence du 2026-09-03 portait l'ANCIEN HUD (« $ 24 850 », « HEAT », 9 741 px, y 78-193) et l'apostrophe droite (« CE QU'IL », « n'y »,
  « L'étagère », Δ 167 et 191/255) que l'atelier a remplacée par ’ ; le reste de l'écart (35 019 px en tout) est une nuance d'encre ≤ 27/255 sur des libellés au texte inchangé.
- **Polices — ce qui a RÉELLEMENT rendu** (`fc-match` sur la machine du rendu) :

      'DejaVu Sans'   →  DejaVuSans.ttf: "DejaVu Sans" "Book"
      'DejaVu Serif'  →  DejaVuSerif.ttf: "DejaVu Serif" "Book"
      (fc-match lancé le 2026-10-08 sur la machine du rendu ; familles des 40 règles `.appr6` du fichier : 'DejaVu Sans' ×13, 'DejaVu Serif' ×5, aucune autre)

  Le client embarque : DejaVu Sans / DejaVu Serif — les mêmes familles (titre sérif depuis la classe C-a du juge groupé, `EnteteDEcran`).
  ⇒ Un écart de FAMILLE de police est un ARBITRAGE, pas un défaut.

## Captures en jeu (Play Mode réel, locataire réel)

| fichier | résolution | rect imprimé par le test | état | test |
|---|---|---|---|---|
| `Tools/juge-visuel/planches-par-ecran-2026-10-08-soir/E03_Chanedappro_1080x2400.png` (+ `_1080x1920`) | 1080×2400 / 1080×1920 | `journal.tsv` de la série, E03 : « chargé (DernierChargement) · 2400 : tout tient · 1920 : tout tient (contenu − fenêtre < 12 u) » | compte neuf, bon chargé, stock à 0 | `PlanchesParEcran` (`ClichePlanchesParEcran`), cumul `fa376cc4` + correctif du harnais (commité avec les planches, `8c74fce6`) |
| `Assets/Screenshots/ecran_appro_1080x1920.png`, `ecran_appro_1080x2400.png`, `planche_la_chaine_d_appro_1080x2400.png` | — | — | antérieures | `EcranApproC1_…`, capture sous chrome — TÉMOINS, plus les planches qui font foi |

⚠️ Ces planches sont ANTÉRIEURES au décor de CLIENT-2 sur ㉚ (`feat/decor-de-scene`) et aux correctifs restants du juge du 07/10.
Ce qu'elles montrent déjà (lu sur la planche 2400) : A1 titre sérif, A2 rouge des valeurs foncé sur le papier, A3 bandeau-plaque, A4 bande basse (plaque, filet, voix, geste).
Ce qu'elles ne montrent pas encore : B1 les 4 filets pointillés du bon, B2 la perforation basse du papier, B3 la note du geste (« ça part du compte tout de suite »).
À reprendre au prochain créneau, et cette ligne à mettre à jour.

- Garde anti-vide du test : pixels hors du fond dominant > 0 (plancher bas — squelette non rempli).
- Commit du client au moment des captures : cumul `fa376cc4` (08/10 soir) (une capture est une mesure DATÉE, pas une
  propriété du commit — la prendre APRÈS le dernier correctif).

## Échelle — OBLIGATOIRE, jamais déduite par le juge

Trois nombres, toujours les trois :

| | px de l'image | largeur CSS de référence | facteur |
|---|---|---|---|
| RÉFÉRENCE | 1080 | 300 | **×3,6** |
| CAPTURE   | 1080 | 300 (le canvas de 1280 u est rendu sur 1080 px) | **×3,6** |
| | | **rapport capture ÷ référence** | **1,000 en X** ; en Y la référence est un gabarit de 2102 px pour 2400/1920 : comparer en % de la hauteur, ou des épaisseurs et hauteurs de capitale |

- Ce rapport est **NORMAL**, et **toute mesure se ramène en px CSS** avant de conclure à un écart.
- Ce que la normalisation NE couvre pas : les rapports INTERNES restent des défauts réels même après normalisation.
- Repère mesuré (2026-10-08) : le bord gauche du papier du bon est à **x = 50** dans la référence = 13,9 CSS, à **x = 57** dans les deux
  captures = 15,8 CSS — 1,9 CSS de plus dans le jeu (nuance C, la même que sur ㉛ : consignée, non traitée).

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
| décor de scène (aplat `#0d0d0d` au lieu du dégradé chaud `.appr6`, `#1c1a17 → #151310 → #111014`) | lot décor de CLIENT-2 (`feat/decor-de-scene`, posé sur ㉚ avec l'accord du propriétaire, pas encore sur le cumul au 08/10) | juge du 07/10, « ASSUMÉ, non classé » |
| la bande rouge « Il y a une pénurie en ville » du cadre 48 absente | DONNÉE : le compte neuf n'est pas en pénurie ; l'écran ne la pose que si l'état servi la porte | état capturé |
| « il vous prend encore au sérieux » (encre sombre) contre « il vous fait attendre exprès » (rouge) ; « 0 L » contre « 11 – 50 L » ; « Lt. Sarre » contre « Lt. Kane » | DONNÉES d'un compte neuf (humeur du fournisseur, stock, lieutenant du roster) ; une valeur n'est pas un écart de forme | état capturé |
| « LA CHAÎNE, EN REMONTANT · Rien ne circule encore… » sous le bon, absent du cadre 48 | la chaîne n'apparaît qu'aux cadres 50-52 (« ça coince ») ; à vide, l'écran DIT qu'aucun maillon ne circule plutôt que de laisser un trou ; pas de cadre « chaîne vide » | état capturé |
| valeurs du HUD (10 000 € · Froid · JOUR 1 · Aube) contre 24 850 € · Tiède · JOUR 12 · Plein jour | DONNÉES d'un compte neuf | état capturé |

## Format du RAPPORT — imposé

Un finding par ligne, dans UNE table :

| id | gravité | critère | écart | mesure | ce que je n'ai pas pu vérifier |
|---|---|---|---|---|---|
| `F1` | `BLOQUANT` \| `MAJEUR` \| `MINEUR` | `DÉJÀ APPLIQUÉ` \| `NOUVEAU` | <l'écart> | <les nombres> | <ou vide> |

## Ce qui N'EST PAS fourni — et ne doit pas être cherché

- le code du client (`Assets/Scripts`) et ses tests ;
- les notes d'implémentation du chantier ;
- les rapports des juges précédents (`Tools/juge-visuel/ecran_appro/r1-2026-09-07/`, `r2-2026-09-22/`, `r-groupe-2026-10-07/`).
- toute capture « avant » — sauf si listée ci-dessus avec la preuve qu'UNE seule variable change.
