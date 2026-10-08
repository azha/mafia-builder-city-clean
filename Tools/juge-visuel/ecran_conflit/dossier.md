# Dossier du juge visuel — ecran_conflit — rempli le 2026-10-08 (CLIENT-1, propriétaire de l'écran)

> Généré depuis `.claude/skills/juge-visuel/dossier-gabarit.md` (dépôt back) par
> `Tools/nouvel-ecran.py`. Tout ce qui est entre chevrons se remplace ; tout ce qui ne peut pas
> être rempli se dit « non fourni » avec la raison — jamais supprimé.

## L'écran

- **Nom** : Le conflit / « la table du fond » (㉙, `ecran_conflit`, `ConflitScreenController`)
- **Ce qu'on vient y faire** : choisir chez quelle famille rivale envoyer un lieutenant ce soir (les quatre familles de Brennar et ce qu'on sait
  d'elles), l'envoyer — on saura demain — puis suivre ce qui est en cours et ce qui est rentré.
- **Chemin joueur pour y arriver** : onglet `More` (menu « Plus ») → LE CONFLIT
- **États capturés** : **NON FOURNI.** ㉙ n'est pas dans la série `PlanchesParEcran` du 08/10 (dix écrans E01-E10, liste arrêtée par f2). Les
  dernières captures sont celles du juge r5 du 23/09 (verdict APPROUVÉ), prises contre l'ANCIENNE référence : depuis, l'atelier a RÉÉCRIT le
  cadre 59 (voir « Pourquoi re-rendre »), le client a suivi (source au 08/10 : « choisit qui y envoyer », « la ferraille, à Spine », « pas de
  rappel possible »), le bandeau de titre et le décor de CLIENT-2 (e189670c, `feat/decor-de-scene`) sont venus. À produire : une planche de ㉙
  sous le shell, aux deux résolutions ; homologue attendu sur un compte neuf : **cadre 59** (« on n'a jamais croisé personne »).
- **Routes du domaine** :
  - `GET /v1/me/engagements`
  - `POST /v1/me/engagements`

## Référence (fait autorité : l'IMAGE)

| fichier | rôle | taille px | facteur de rendu | largeur CSS ↔ largeur Unity |
|---|---|---|---|---|
| `Tools/juge-visuel/ecran_conflit/reference-1080x2102.png` | rendu ratifié = **cadre 59** « Le premier coup — on n'a jamais croisé personne », RE-RENDU le 2026-10-08 sur l'atelier master `5240cec` (sha256 `fd52288d1e44f7da…`) | 1080×2102 | ×3,6 | 300 CSS = 1080 px |
| `Tools/juge-visuel/ecran_conflit/reference-manque-1080x2102.png` | référence d'ÉTAT = **cadre 64** « Ce qu'on ne peut pas faire », re-rendu le même jour (sha256 `a1ff558e8c772b65…`) | 1080×2102 | ×3,6 | 300 CSS = 1080 px |
| cadres 60, 62, 63 (« Le septième coup — la vendetta est visible », « Ce qui est en cours », « Ce qui est rentré ») | références d'ÉTAT | 1080×2102 | ×3,6 | 300 CSS = 1080 px |
| cadre 61 « Deux choses ne collent pas » | **INATTEIGNABLE côté client** (étiquette de l'atelier : « décision L4 : seuls les gros bras sont proposés ») — ne pas juger | — | — | — |
| cadres 65, 66 (« v1 — la table du fond », « v1 — il est rentré ») | versions v1, témoins — jamais la référence | — | — | — |
| `Tools/juge-visuel/v6/m-65.png` | canon antérieur — témoin, jamais la référence | — | — | — |
| `~/project/atelier3d-mafia/ecrans-brennar-6.html` cadres 59-64 (atelier `5240cec` ; numéros = **index à partir de 0** des `<div class="etiquette">`, relus par leur TEXTE le 2026-10-08 ; préfixe `.cfl6`) | source HTML/CSS (aide de lecture, ne prime jamais sur l'image) | — | — | — |

- **Script de rendu** : `Tools/rendre-tel.py ~/project/atelier3d-mafia/ecrans-brennar-6.html 59 <sortie> 3.6` (et 64) — 2026-10-08 ; « ✅ non rogné »,
  1080×2102 ; deux rendus successifs du 59 : **0 px** d'écart (déterministe).
  Pourquoi re-rendre : contre la référence du 23/09 (celle du juge r5, identique à 0 px), le cadre 59 diffère de **852 513 px** — ancien HUD
  (9 741 px, y 78-193) et surtout le CORPS (816 505 px, y 542-1780), réécrit par l'atelier selon les arbitrages du 23/09 : réplique SANS orateur,
  « On envoie **Lt. Kest** chez La Coil, sur **leurs installations** » (plus « l'entrepôt de Dépôt-Est »), plus de ligne « CE QU'ON PREND SI ÇA MARCHE »,
  « on n'a jamais croisé leur route » à la place de « jamais / on ne les a pas croisés », « la ferraille, à Spine », sous-titre « on choisit qui y
  envoyer », note du geste « pas de rappel possible ». Le cadre 64 : 32 208 px, HUD et apostrophe ' → ’ seulement (vu en côte à côte).
- **Polices — ce qui a RÉELLEMENT rendu** (`fc-match` sur la machine du rendu) :

      'DejaVu Sans'   →  DejaVuSans.ttf: "DejaVu Sans" "Book"
      'DejaVu Serif'  →  DejaVuSerif.ttf: "DejaVu Serif" "Book"
      (fc-match lancé le 2026-10-08 sur la machine du rendu ; familles des 55 règles `.cfl6` du fichier : 'DejaVu Sans' ×17, 'DejaVu Serif' ×9, aucune autre)

  Le client embarque : DejaVu Sans / DejaVu Serif — les mêmes familles.
  ⇒ Un écart de FAMILLE de police est un ARBITRAGE, pas un défaut.

## Captures en jeu (Play Mode réel, locataire réel)

| fichier | résolution | rect imprimé par le test | état | test |
|---|---|---|---|---|
| — | — | — | — | **NON FOURNI** : aucune capture de l'écran actuel (voir « États capturés ») |
| `Tools/juge-visuel/ecran_conflit/r5-2026-09-23/capture-1080x2400.png` (+ `-1080x1920`, `-1080x1920-bas`) | — | — | 23/09, shell sans session | TÉMOINS seulement : jugés APPROUVÉS contre l'ANCIENNE référence ; antérieurs au cadre réécrit, au bandeau et au décor |

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
| décor de scène (support `.cfl6` à 3 arrêts, scène du district à 0,2) | lot décor de CLIENT-2 (`feat/decor-de-scene`, e189670c, posé avec l'accord du propriétaire, pas encore sur le cumul au 08/10) | DESIGN.md du décor §4 |
| la cible et le butin dits « leurs installations » (pas d'adresse ni de butin nommé) | l'API ne sert ni la possession visée ni le butin ; ARBITRAGE du juge r5 (23/09), que le cadre 59 réécrit dessine désormais | juge r5, ligne 8 |
| rivaux en noms de fiction (La Coil, Tarcum, Gorge-de-Fer, Saltline) | noms de la fiction, non servis (§C-2 du mandat) | mandat |
| cadre 61 (« Deux choses ne collent pas ») | inatteignable côté client (seuls les gros bras sont proposés, décision L4) ; le refus 409 reste traduit | étiquette de l'atelier |
| valeurs du HUD d'un compte neuf | DONNÉES ; une valeur n'est pas un écart de forme | état attendu |

## Format du RAPPORT — imposé

Un finding par ligne, dans UNE table :

| id | gravité | critère | écart | mesure | ce que je n'ai pas pu vérifier |
|---|---|---|---|---|---|
| `F1` | `BLOQUANT` \| `MAJEUR` \| `MINEUR` | `DÉJÀ APPLIQUÉ` \| `NOUVEAU` | <l'écart> | <les nombres> | <ou vide> |

## Ce qui N'EST PAS fourni — et ne doit pas être cherché

- le code du client (`Assets/Scripts`) et ses tests ;
- les notes d'implémentation du chantier ;
- les rapports des juges précédents (`Tools/juge-visuel/ecran_conflit/r1-2026-09-07/` … `r5-2026-09-23/`).
- toute capture « avant » — sauf si listée ci-dessus avec la preuve qu'UNE seule variable change.
