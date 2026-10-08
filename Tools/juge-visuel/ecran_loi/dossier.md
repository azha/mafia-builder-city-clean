# Dossier du juge visuel — ecran_loi — rempli le 2026-10-08 (CLIENT-1, propriétaire de l'écran)

> Généré depuis `.claude/skills/juge-visuel/dossier-gabarit.md` (dépôt back) par
> `Tools/nouvel-ecran.py`. Tout ce qui est entre chevrons se remplace ; tout ce qui ne peut pas
> être rempli se dit « non fourni » avec la raison — jamais supprimé.

## L'écran

- **Nom** : La loi / Le parloir (㉛, `ecran_loi`, `LoiScreenController`)
- **Ce qu'on vient y faire** : quand la police tient quelqu'un à vous, décider qui le défend (commis d'office, cabinet, filière), en sachant ce que chaque choix coûte ; à vide, voir ses avocats et ses affaires en cours.
- **Chemin joueur pour y arriver** : onglet `More` (AppShell.Tab.More) → LA LOI
- **États capturés** : compte NEUF, parloir CHARGÉ (`DernierChargement`) : aucun avocat engagé (« Vous n'avez encore engagé personne. »), les trois
  options (commis d'office EN PLACE, un cabinet DISPONIBLE, la filière À VOS RISQUES), aucune affaire en cours (« Aucune affaire en cours. »), le geste
  « LUI TROUVER UN AVOCAT » en bande basse — le seul état que produit le harnais `PlanchesParEcran` (08/10), le même aux deux résolutions. Aucun cadre
  n'est un « parloir vide » : l'homologue le plus proche est le **cadre 68** (le choix d'avocat). La vitre du prévenu (`.pl-vitre`), le compte à rebours
  et « ce qu'il sait » (cadres 67, 69-72) **ne sont pas capturés** : non fourni, faute d'un compte qui porte une affaire (une affaire naît d'une descente).
- **Routes du domaine** :
  - `GET /v1/me/legal`
  - `POST /v1/me/legal/lawyers`
  - `POST /v1/me/legal/cases/:id/plea`
  - `POST /v1/me/legal/cases/:id/payoff`

## Référence (fait autorité : l'IMAGE)

| fichier | rôle | taille px | facteur de rendu | largeur CSS ↔ largeur Unity |
|---|---|---|---|---|
| `Tools/juge-visuel/ecran_loi/reference-avocat-1080x2102.png` | rendu ratifié de l'ÉTAT CAPTURÉ = **cadre 68** « Lui trouver un avocat », RE-RENDU le 2026-10-08 sur l'atelier master `5240cec` (sha256 `028d11b0b719c4b9…`) | 1080×2102 | ×3,6 | 300 CSS = 1080 px |
| `Tools/juge-visuel/ecran_loi/reference-1080x2102.png` | rendu ratifié nominal = **cadre 67** « Ils ont arrêté un de vos coursiers », re-rendu le même jour (sha256 `4a4d8e29e703266e…`) | 1080×2102 | ×3,6 | 300 CSS = 1080 px |
| cadres 69-72 (« Il commence à parler », « Il a tout dit », « Il y a un arrangement », « Votre avocat est nerveux ») | références d'ÉTAT (non capturées) | 1080×2102 | ×3,6 | 300 CSS = 1080 px |
| `Tools/juge-visuel/v6/m-67.png` | canon antérieur — témoin, jamais la référence | — | — | — |
| `~/project/atelier3d-mafia/ecrans-brennar-6.html` cadres 67-72 (atelier `5240cec` ; numéros = **index à partir de 0** des `<div class="etiquette">`, relus par leur TEXTE le 2026-10-08 ; préfixe `.parl6`) | source HTML/CSS (aide de lecture, ne prime jamais sur l'image) | — | — | — |

- **Script de rendu** : `Tools/rendre-tel.py ~/project/atelier3d-mafia/ecrans-brennar-6.html 68 <sortie> 3.6` (et 67) — 2026-10-08 ; « ✅ non rogné »,
  1080×2102 ; deux rendus successifs : **0 px** d'écart (déterministe) ; identiques à **0 px** au rendu du juge du 07/10 (`r-groupe-2026-10-07/ref/cadre-67.png`, `cadre-68.png`, atelier `d84c6eb`).
  Pourquoi re-rendre : les références du 06/09 portaient l'ANCIEN HUD (9 741 px, y 78-193) et l'apostrophe droite (« quelqu'un », « d'office », « l'horaire »…) que l'atelier a
  remplacée par l'apostrophe typographique ’ (67 : 33 336 px en 7 bandes ; 68 : 19 762 px en 5 bandes ; hors HUD, chaque bande est une ligne de texte où seule l'apostrophe change).
- **Polices — ce qui a RÉELLEMENT rendu** (`fc-match` sur la machine du rendu) :

      'DejaVu Sans'   →  DejaVuSans.ttf: "DejaVu Sans" "Book"
      'DejaVu Serif'  →  DejaVuSerif.ttf: "DejaVu Serif" "Book"
      (fc-match lancé le 2026-10-08 sur la machine du rendu ; familles des 44 règles `.parl6` du fichier : 'DejaVu Sans' ×14, 'DejaVu Serif' ×4, aucune autre)

  Le client embarque : DejaVu Sans / DejaVu Serif — les mêmes familles (titre sérif depuis la classe C-a du juge groupé, `EnteteDEcran`).
  ⇒ Un écart de FAMILLE de police est un ARBITRAGE, pas un défaut.

## Captures en jeu (Play Mode réel, locataire réel)

| fichier | résolution | rect imprimé par le test | état | test |
|---|---|---|---|---|
| `Tools/juge-visuel/planches-par-ecran-2026-10-08-soir/E05_Loi_1080x2400.png` (+ `_1080x1920`, + `E05_Loi_bas_1080x1920.png`) | 1080×2400 / 1080×1920 | `journal.tsv` de la série, E05 : « chargé (DernierChargement) · 2400 : tout tient · 1920 : déborde de 130.8 u (fenêtre 1195.6 u, contenu 1326.4 u), remonté jusqu'au bout — planche _bas prise » | compte neuf, parloir chargé, sans avocat ni affaire | `PlanchesParEcran` (`ClichePlanchesParEcran`), cumul `fa376cc4` + correctif du harnais (commité avec les planches, `8c74fce6`) |
| `Assets/Screenshots/ecran_loi_1080x1920.png`, `ecran_loi_1080x2400.png` | — | — | antérieures | `EcranLoiC1_CapturerPourLeJugeVisuel_DeuxResolutions` — TÉMOINS, plus les planches qui font foi |

⚠️ Ces planches sont ANTÉRIEURES au décor de CLIENT-2 sur ㉛ (`feat/decor-de-scene`, 165d5b19 et 0376ff74) et aux correctifs restants du juge du 07/10.
Ce qu'elles montrent déjà (lu sur la planche 2400) : A1 titre sérif et A4 bandeau-plaque (classe C-a/C-b, `EnteteDEcran`), B1 bandeau qui ne défile plus.
Ce qu'elles ne montrent pas encore : A2 cartes encadrées selon leur état, A3 pastilles encadrées, B2 « EN PLACE » vert `#7fc99a` (il est turquoise), B3 bloc à filet gauche
de l'avertissement sur la filière. À reprendre au prochain créneau, et cette ligne à mettre à jour.

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
- Repère mesuré (2026-10-08) : le bord gauche des cartes d'option est à **x = 50** dans la référence (cadre 68, bord `#4f7f3f`) = 13,9 CSS, à
  **x = 57** dans la capture 2400 = 15,8 CSS — 1,9 CSS de plus dans le jeu (nuance C, consignée ici, non traitée).

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
| décor de scène (aplat `#0d0d0d` au lieu du fond peint de `.parl6`) | lot décor de CLIENT-2 (`feat/decor-de-scene`, posé sur ㉛ avec l'accord du propriétaire, pas encore sur le cumul au 08/10) | juge du 07/10, « ASSUMÉ, non classé » 1 |
| la voix du lieutenant (`.pl-dit`, « Lt. Rin : … ») absente de la bande basse | décision de f2 « bande basse sans voix » (TD-823) : aucune voix servie ; le geste remonte contre le filet haut, sans trou ni libellé de repli | juge du 07/10, « ASSUMÉ, non classé » 2 |
| vitre du prévenu, compte à rebours de jours, « ce qu'il sait » | compte NEUF sans affaire : la maquette n'a aucun cadre « parloir vide » ; ces parties ne sont pas comparables, pas absentes | juge du 07/10, « ASSUMÉ, non classé » 3 ; état capturé (ci-dessus) |
| « VOS AVOCATS · Vous n'avez encore engagé personne. » et « AFFAIRES EN COURS · Aucune affaire en cours. » | états VIDES servis par le back à un compte neuf ; la phrase d'affaire vide dit d'où naît une affaire (« Une affaire naît d'une descente — rien ici n'en crée. ») | état capturé |
| valeurs du HUD (10 000 € · Froid · JOUR 1 · Aube) contre 24 850 € · Tiède · JOUR 12 · Plein jour | DONNÉES d'un compte neuf ; une valeur n'est pas un écart de forme | état capturé |

## Format du RAPPORT — imposé

Un finding par ligne, dans UNE table :

| id | gravité | critère | écart | mesure | ce que je n'ai pas pu vérifier |
|---|---|---|---|---|---|
| `F1` | `BLOQUANT` \| `MAJEUR` \| `MINEUR` | `DÉJÀ APPLIQUÉ` \| `NOUVEAU` | <l'écart> | <les nombres> | <ou vide> |

## Ce qui N'EST PAS fourni — et ne doit pas être cherché

- le code du client (`Assets/Scripts`) et ses tests ;
- les notes d'implémentation du chantier ;
- les rapports des juges précédents (`Tools/juge-visuel/ecran_loi/r1-2026-09-07/`, `r2-2026-09-22/`, `r-groupe-2026-10-07/`).
- toute capture « avant » — sauf si listée ci-dessus avec la preuve qu'UNE seule variable change.
