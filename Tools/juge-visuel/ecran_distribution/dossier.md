# Dossier du juge visuel — ecran_distribution — rempli le 2026-10-08 (CLIENT-1, propriétaire de l'écran)

> Généré depuis `.claude/skills/juge-visuel/dossier-gabarit.md` (dépôt back) par
> `Tools/nouvel-ecran.py`. Tout ce qui est entre chevrons se remplace ; tout ce qui ne peut pas
> être rempli se dit « non fourni » avec la raison — jamais supprimé.

## L'écran

- **Nom** : La distribution / « la ficelle sur le liège » (㉘, `ecran_distribution`, `DistributionScreenController`)
- **Ce qu'on vient y faire** : décider d'où part la marchandise, où elle va et par quel chemin (la ficelle sur le liège, puis sa lecture en mots),
  et l'envoyer ; voir ses coursiers en route ou arrivés.
- **Chemin joueur pour y arriver** : onglet `More` (menu « Plus ») → LA DISTRIBUTION
- **États capturés** : compte NEUF, **sans relais** (aucun `distribution_hub` possédé) : « Pas encore de relais. », la règle d'achat et le geste
  « ACHETER UN RELAIS » — le seul état que produit le harnais `PlanchesParEcran` (08/10), le même aux deux résolutions (tout tient). **Aucun
  cadre** ne le dessine (54-58 = envoyer, en route, livré, route coupée, coursier pris) : le liège, les étiquettes punaisées, la ficelle, la
  `.lecture` et la voix du lieutenant **ne sont pas capturés** — non fourni, faute d'un compte qui possède un relais OUVERT (le kit de départ n'en
  a pas ; un relais s'achète puis s'ouvre en deux jours).
- **Routes du domaine** :
  - `GET /v1/operational/couriers`
  - `GET /v1/operational/distribution/projection`
  - `POST /v1/operational/distribution/dispatch`
  - `POST /v1/operational/vehicles/purchase`

## Référence (fait autorité : l'IMAGE)

| fichier | rôle | taille px | facteur de rendu | largeur CSS ↔ largeur Unity |
|---|---|---|---|---|
| `Tools/juge-visuel/ecran_distribution/reference-1080x2102.png` | rendu ratifié = **cadre 54** « Envoyer — la ficelle à tendre », RE-RENDU le 2026-10-08 sur l'atelier master `5240cec` (sha256 `bd1b011cca5f6651…`) | 1080×2102 | ×3,6 | 300 CSS = 1080 px |
| `Tools/juge-visuel/ecran_distribution/r-groupe-2026-10-07/ref/cadre-55.png` … `cadre-58.png` (« En route — ça serpente », « Livré — mais la route s'use », « La route est coupée », « Ils ont pris Lt. Tull ») | références d'ÉTAT, rendues par le juge du 07/10 | 1080×2102 | ×3,6 | 300 CSS = 1080 px |
| `Tools/juge-visuel/v6/m-54.png` … `m-58.png` | canon antérieur — témoins, jamais la référence | — | — | — |
| `~/project/atelier3d-mafia/ecrans-brennar-6.html` cadres 54-58 (atelier `5240cec` ; numéros = **index à partir de 0** des `<div class="etiquette">`, relus par leur TEXTE le 2026-10-08 ; préfixe `.lieg6`) | source HTML/CSS (aide de lecture, ne prime jamais sur l'image) | — | — | — |

- **Script de rendu** : `Tools/rendre-tel.py ~/project/atelier3d-mafia/ecrans-brennar-6.html 54 <sortie> 3.6` — 2026-10-08 ; « ✅ non rogné », 1080×2102 ;
  deux rendus successifs : **0 px** d'écart (déterministe) ; identique à **0 px** au rendu du juge du 07/10 (`r-groupe-2026-10-07/ref/cadre-54.png`, atelier `d84c6eb`).
  Pourquoi re-rendre : la référence du 03/09 (26 911 px d'écart) portait l'ANCIEN HUD (9 741 px, y 78-193) et l'apostrophe droite (« L'envoi », « d'où »,
  « D'OÙ ÇA PART », « n'est pas encore tendue », « je l'envoie ») que l'atelier a remplacée par ’ — rien d'autre (vu en côte à côte).
- **Polices — ce qui a RÉELLEMENT rendu** (`fc-match` sur la machine du rendu) :

      'DejaVu Sans'   →  DejaVuSans.ttf: "DejaVu Sans" "Book"
      'DejaVu Serif'  →  DejaVuSerif.ttf: "DejaVu Serif" "Book"
      (fc-match lancé le 2026-10-08 sur la machine du rendu ; familles des 46 règles `.lieg6` du fichier : 'DejaVu Sans' ×13, 'DejaVu Serif' ×5, aucune autre)

  Le client embarque : DejaVu Sans / DejaVu Serif — les mêmes familles (titre sérif depuis la classe C-a du juge groupé, `EnteteDEcran`).
  ⇒ Un écart de FAMILLE de police est un ARBITRAGE, pas un défaut.

## Captures en jeu (Play Mode réel, locataire réel)

| fichier | résolution | rect imprimé par le test | état | test |
|---|---|---|---|---|
| `Tools/juge-visuel/planches-par-ecran-2026-10-08-soir/E04_Distribution_1080x2400.png` (+ `_1080x1920`) | 1080×2400 / 1080×1920 | `journal.tsv` de la série, E04 : « DerniereErreur=«aucun distribution_hub trouvé parmi les districts possédés…» · 2400 : tout tient · 1920 : tout tient » (le diagnostic NOMMÉ de l'état sans relais ; il n'est pas affiché) | compte neuf, sans relais, geste d'achat offert | `PlanchesParEcran` (`ClichePlanchesParEcran`), cumul `fa376cc4` + correctif du harnais (`8c74fce6`) |
| `Assets/Screenshots/planche_la_distribution_1080x2400.png` | — | — | antérieure | TÉMOIN, plus la planche qui fait foi |

⚠️ Ces planches sont ANTÉRIEURES à `93da6df9` (fonds de zone ; le pied devient la bande basse `.bas` ANCRÉE en pied : sur la planche, le geste
« ACHETER UN RELAIS » flotte encore sous le bandeau — ㉘ B2 du juge du 07/10) et au décor de CLIENT-2 (`755bddaf`, la planche `.planche`, pas encore
sur le cumul). ㉘ B1 (la règle d'achat dite DEUX fois, dans le bandeau puis au-dessus du geste) y est encore visible : décision de mots, ouverte.
À reprendre au prochain créneau, et cette ligne à mettre à jour.

- Garde anti-vide du test : pixels hors du fond dominant > 0 (plancher bas — squelette non rempli).
- Commit du client au moment des captures : cumul `fa376cc4` (08/10 soir) (une capture est une mesure DATÉE, pas une
  propriété du commit — la prendre APRÈS le dernier correctif).

## Échelle — OBLIGATOIRE, jamais déduite par le juge

Trois nombres, toujours les trois :

| | px de l'image | largeur CSS de référence | facteur |
|---|---|---|---|
| RÉFÉRENCE | 1080 | 300 | **×3,6** |
| CAPTURE   | 1080 | 300 (le canvas de 1280 u est rendu sur 1080 px ; gouttière 48 px mesurée par le juge du 07/10, réf 13 CSS = 46,8 px) | **×3,6** |
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
| décor de scène (aplat au lieu du support `.planche` : `Points` ×2 sur `Lineaire(158°, #9a774b → #7b5c37 → #654a2c)`, base `#8a6a42`) | lot décor de CLIENT-2 (`feat/decor-de-scene`, 755bddaf, posé avec l'accord du propriétaire, pas encore sur le cumul au 08/10) | juge du 07/10, « ASSUMÉ, non classé » |
| l'état « Pas encore de relais » lui-même (liège, étiquettes, ficelle, lecture, voix absents) | aucun cadre ne le dessine ; un compte neuf n'a pas de relais (table 63) : ces parties ne sont pas comparables, pas absentes | juge du 07/10, avertissement de comparabilité |
| « VOS COURRIERS » et « ACHETER UN VÉLO » (état nominal) | aucun cadre m-54..m-58 ne les montre ; construits pour le brief (les coursiers et leur `transit_band`, l'achat de véhicule mesuré en succès réel) ; plaque `.lecture` empruntée (93da6df9) | `DistributionScreenController` (commentaires de `RendreCouriers`) |
| les cadres 57 (route coupée) et 58 (coursier pris) | aucune clé mesurée ne les porte : non construits | `AppliquerEtat` |
| C consignés (93da6df9) : pointillés `.l+.l` de la lecture non tracés ; padding de la bande basse 9/13/15 contre 10/12/15 | nuances (ruling du 07/10) | commit 93da6df9 |
| valeurs du HUD d'un compte neuf | DONNÉES ; une valeur n'est pas un écart de forme | état capturé |

## Format du RAPPORT — imposé

Un finding par ligne, dans UNE table :

| id | gravité | critère | écart | mesure | ce que je n'ai pas pu vérifier |
|---|---|---|---|---|---|
| `F1` | `BLOQUANT` \| `MAJEUR` \| `MINEUR` | `DÉJÀ APPLIQUÉ` \| `NOUVEAU` | <l'écart> | <les nombres> | <ou vide> |

## Ce qui N'EST PAS fourni — et ne doit pas être cherché

- le code du client (`Assets/Scripts`) et ses tests ;
- les notes d'implémentation du chantier ;
- les rapports des juges précédents (`Tools/juge-visuel/ecran_distribution/r1-2026-09-07/`, `r2-2026-09-22/`, `r-groupe-2026-10-07/`).
- toute capture « avant » — sauf si listée ci-dessus avec la preuve qu'UNE seule variable change.
