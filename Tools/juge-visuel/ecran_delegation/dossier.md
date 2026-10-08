# Dossier du juge visuel — ecran_delegation — rempli le 2026-10-08 (CLIENT-1, propriétaire de l'écran)

> Généré depuis `.claude/skills/juge-visuel/dossier-gabarit.md` (dépôt back) par
> `Tools/nouvel-ecran.py`. Tout ce qui est entre chevrons se remplace ; tout ce qui ne peut pas
> être rempli se dit « non fourni » avec la raison — jamais supprimé.

## L'écran

- **Nom** : Ce que vous avez confié / La délégation (㉜, `ecran_delegation`, `DelegationScreenController`)
- **Ce qu'on vient y faire** : voir, en un écran, qui tient quoi dans la maison — quatre charges, chacune à vous ou à un lieutenant, avec leur
  maîtrise — et en confier une, contre un prix, une fois par jour (ou reprendre une charge confiée, en sachant ce que ça coûterait).
- **Chemin joueur pour y arriver** : onglet `More` (menu « Plus ») → CE QUE VOUS AVEZ CONFIÉ
- **États capturés** : **NON FOURNI.** ㉜ n'est pas dans la série `PlanchesParEcran` du 08/10 (dix écrans E01-E10, liste arrêtée par f2) et n'a
  eu aucun juge groupé le 07/10. Les seules captures datent du 06-07/09 (voir plus bas) : antérieures au bandeau de titre (classe C-a/C-b), à la
  maîtrise par charge alignée sur la table 56 et au décor de CLIENT-2 (`feat/decor-de-scene`, 82be49b7) ⇒ elles ne jugent plus l'écran actuel.
  À produire : une planche de ㉜ sous le shell, aux deux résolutions, sur un compte neuf (homologue attendu : **cadre 73** « Tout est encore à vous » —
  aucune charge confiée).
- **Routes du domaine** :
  - `GET /v1/meta/task-categories`
  - `GET /v1/meta/recall-preview/:categoryId`
  - `POST /v1/meta/graduation`
  - `POST /v1/meta/recall`
  - `GET /v1/lieutenants`

## Référence (fait autorité : l'IMAGE)

| fichier | rôle | taille px | facteur de rendu | largeur CSS ↔ largeur Unity |
|---|---|---|---|---|
| `Tools/juge-visuel/ecran_delegation/reference-1080x2102.png` | rendu ratifié = **cadre 73** « Tout est encore à vous », RE-RENDU le 2026-10-08 sur l'atelier master `5240cec` (sha256 `7b12c55fb2b060e5…`) | 1080×2102 | ×3,6 | 300 CSS = 1080 px |
| cadres 74-77 (« Confier l'approvisionnement », « Deux charges confiées », « Reprendre — ce que ça coûterait », « Vous avez déjà tranché aujourd'hui ») | références d'ÉTAT | 1080×2102 | ×3,6 | 300 CSS = 1080 px |
| `Tools/juge-visuel/ecran_delegation/reference-reserve-1080x2102.png` (cadre 78) | **TÉMOIN RETIRÉ — ne pas juger** : l'atelier a noté le cadre 78 « Les huit qui n'existent pas encore — RETIRÉ du client (pas un écran joueur) ; gardé pour la numérotation de la série » (0564998). Le fichier reste (l'INDEX le cite) | 1080×2102 | ×3,6 | — |
| `Tools/juge-visuel/v6/m-75.png` | canon antérieur — témoin, jamais la référence | — | — | — |
| `~/project/atelier3d-mafia/ecrans-brennar-6.html` cadres 73-77 (atelier `5240cec` ; numéros = **index à partir de 0** des `<div class="etiquette">`, relus par leur TEXTE le 2026-10-08 ; préfixe `.serv6`) | source HTML/CSS (aide de lecture, ne prime jamais sur l'image) | — | — | — |

- **Script de rendu** : `Tools/rendre-tel.py ~/project/atelier3d-mafia/ecrans-brennar-6.html 73 <sortie> 3.6` — 2026-10-08 ; « ✅ non rogné », 1080×2102 ;
  deux rendus successifs : **0 px** d'écart (déterministe).
  Pourquoi re-rendre : la référence du 06/09 (34 798 px d'écart) portait l'ANCIEN HUD (9 741 px, y 78-193), l'apostrophe droite, et surtout la
  colonne de droite d'AVANT l'alignement de l'atelier sur les tables 44 et 56 v1.1 (`0564998`) : « vous la faites » sur les quatre charges, là où le
  cadre dit maintenant la MAÎTRISE de chacune — « vous apprenez encore » (tournées), « pas encore prête » (embauche), « prête à confier »
  (approvisionnement), « presque prête » (chaleur) ; c'est ce que le client affiche depuis (résolveur de `mastery_bucket`).
- **Polices — ce qui a RÉELLEMENT rendu** (`fc-match` sur la machine du rendu) :

      'DejaVu Sans'   →  DejaVuSans.ttf: "DejaVu Sans" "Book"
      'DejaVu Serif'  →  DejaVuSerif.ttf: "DejaVu Serif" "Book"
      (fc-match lancé le 2026-10-08 sur la machine du rendu ; familles des 43 règles `.serv6` du fichier : 'DejaVu Sans' ×13, 'DejaVu Serif' ×5, aucune autre)

  Le client embarque : DejaVu Sans / DejaVu Serif — les mêmes familles.
  ⇒ Un écart de FAMILLE de police est un ARBITRAGE, pas un défaut.

## Captures en jeu (Play Mode réel, locataire réel)

| fichier | résolution | rect imprimé par le test | état | test |
|---|---|---|---|---|
| — | — | — | — | **NON FOURNI** : aucune capture de l'écran actuel (voir « États capturés ») |
| `Assets/Screenshots/ecran_delegation_1080x1920.png`, `ecran_delegation_1080x2400.png` (commit 1d3d412a, 06/09) ; `planche_ce_que_vous_avez_confie_1080x2400.png` (bfe4e991, 07/09) | — | — | antérieures | TÉMOINS seulement : antérieurs au bandeau, à la maîtrise par charge et au décor |

- Garde anti-vide du test : pixels hors du fond dominant > 0 (plancher bas — squelette non rempli).
- Commit du client au moment des captures : non fourni (aucune capture actuelle).

## Échelle — OBLIGATOIRE, jamais déduite par le juge

Trois nombres, toujours les trois :

| | px de l'image | largeur CSS de référence | facteur |
|---|---|---|---|
| RÉFÉRENCE | 1080 | 300 | **×3,6** |
| CAPTURE   | 1080 (attendue, comme les dix écrans de `PlanchesParEcran`) | 300 (le canvas de 1280 u est rendu sur 1080 px) | **×3,6** |
| | | **rapport capture ÷ référence** | **1,000 en X** ; en Y la référence est un gabarit de 2102 px pour 2400/1920 : comparer en % de la hauteur, ou des épaisseurs et hauteurs de capitale |

- Ce rapport est **NORMAL**, et **toute mesure se ramène en px CSS** avant de conclure à un écart.
- Ce que la normalisation NE couvre pas : les rapports INTERNES restent des défauts réels même après normalisation.

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
| décor de scène (support `.serv6`, scène district 0,18) | lot décor de CLIENT-2 (`feat/decor-de-scene`, 82be49b7, posé avec l'accord du propriétaire, pas encore sur le cumul au 08/10) : à juger seulement sur une capture qui le porte | DESIGN.md du décor §4 |
| valeurs du HUD et maîtrises d'un compte neuf | DONNÉES servies (`mastery_bucket` par charge) ; une valeur n'est pas un écart de forme | état attendu |
| cadre 78 (la réserve « les huit ») | retiré du client par l'atelier (0564998) : aucun écran joueur ne le porte | ci-dessus |

## Format du RAPPORT — imposé

Un finding par ligne, dans UNE table :

| id | gravité | critère | écart | mesure | ce que je n'ai pas pu vérifier |
|---|---|---|---|---|---|
| `F1` | `BLOQUANT` \| `MAJEUR` \| `MINEUR` | `DÉJÀ APPLIQUÉ` \| `NOUVEAU` | <l'écart> | <les nombres> | <ou vide> |

## Ce qui N'EST PAS fourni — et ne doit pas être cherché

- le code du client (`Assets/Scripts`) et ses tests ;
- les notes d'implémentation du chantier ;
- les rapports des juges précédents (`Tools/juge-visuel/ecran_delegation/r1-2026-09-07/`, `r2-2026-09-22/`).
- toute capture « avant » — sauf si listée ci-dessus avec la preuve qu'UNE seule variable change.
