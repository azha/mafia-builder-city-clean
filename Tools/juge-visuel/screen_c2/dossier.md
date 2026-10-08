# Dossier du juge visuel — screen_c2 — r1 — <AAAA-MM-JJ>

> Généré depuis `.claude/skills/juge-visuel/dossier-gabarit.md` (dépôt back) par
> `Tools/nouvel-ecran.py`. Tout ce qui est entre chevrons se remplace ; tout ce qui ne peut pas
> être rempli se dit « non fourni » avec la raison — jamais supprimé.

## L'écran

- **Nom** : Filiere (`screen_c2`)
- **Ce qu'on vient y faire** : <une phrase de produit, pas de code — MÉTIER ICI>
- **Chemin joueur pour y arriver** : onglet `More` (AppShell.Tab.More)
- **États capturés** : <ex. jour et nuit · vide et plein · sélection 1> — et pourquoi ceux-là.
- **Routes du domaine** :
  - `GET /v1/laundering/:nodeId`
  - `GET /v1/laundering/:nodeId/pipeline`
  - `POST /v1/laundering/inject`
  - `POST /v1/laundering/stage`

## Référence (fait autorité : l'IMAGE)

| fichier | rôle | taille px | facteur de rendu | largeur CSS ↔ largeur Unity |
|---|---|---|---|---|
| `Tools/juge-visuel/v6/m-137.png` | rendu ratifié | <W×H> | <ex. ×2> | <ex. 300 CSS = 1280 u (canvas)> |
| `<…-reference-source.html>` | source HTML/CSS (aide de lecture, ne prime jamais sur l'image) | — | — | — |

- **Script de rendu** : `<Tools/…-reference-render.sh>` — <date du rendu> ; assertion de largeur : <ok>.
- **Polices — ce qui a RÉELLEMENT rendu** (`fc-match` sur la machine du rendu) :

      <famille CSS 1>  →  <fc-match>
      <famille CSS 2>  →  <fc-match>

  Le client embarque : DejaVu Sans / DejaVu Serif (à confirmer sur cet écran).
  ⇒ Un écart de FAMILLE de police est un ARBITRAGE, pas un défaut.

## Captures en jeu (Play Mode réel, locataire réel)

| fichier | résolution | rect imprimé par le test | état | test |
|---|---|---|---|---|
| `Assets/Screenshots/screen_c2_1080x1920.png` | 1080×1920 | <ligne du log> | <jour> | `ScreenC2C1_CapturerPourLeJugeVisuel_DeuxResolutions` |
| `Assets/Screenshots/screen_c2_1080x2400.png` | 1080×2400 | <ligne du log> | <jour> | `ScreenC2C1_CapturerPourLeJugeVisuel_DeuxResolutions` |

- Garde anti-vide du test : pixels hors du fond dominant > 0 (plancher bas — squelette non rempli).
- Commit du client au moment des captures : `<sha>` (une capture est une mesure DATÉE, pas une
  propriété du commit — la prendre APRÈS le dernier correctif).

## Échelle — OBLIGATOIRE, jamais déduite par le juge

Trois nombres, toujours les trois :

| | px de l'image | largeur CSS de référence | facteur |
|---|---|---|---|
| RÉFÉRENCE | <…> | <…> | **<…>** |
| CAPTURE   | <…> | <…> | **<…>** |
| | | **rapport capture ÷ référence** | **<…>** |

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
| **B1 du juge du 07/10 — le libellé du 2ᵉ compteur** : « 01 PROPRES » (cadres 142/143/145 du fichier au 08/10 = 137/138/140 de l'INDEX), plus « 00/4 PROPRE AU BOUT » (cadre 146 = 141 de l'INDEX) | **règle de f2 (08/10)** : le libellé suit l'état que dessine le cadre — la forme « N/M PROPRE AU BOUT » si le back SERT le compte des étapes propres, sinon « PROPRES ». **MESURÉ** (back `a0a7672b`, `operational/laundering/laundering.projection.service.ts:85-92, 155-164`) : `GET …/laundering/:nodeId/pipeline` ne sert que `stages[]` (`cleanliness_band`, `terminal`, `has_cash`) — **aucun compte** (« chain LENGTH … NOT surfaced as a raw number »). ⇒ « PROPRES » partout, sans dénominateur ; le nombre = les étapes dont la bande servie est `CLEAN` (cadre 142 : une seule étape `clean` ⇒ « 01 »). Libellé en capitales par le style (`.bln6 .fen>span{text-transform:uppercase}`), la valeur servie `filiere.bloc.propres` étant « propres » | décision de f2 du 08/10 ; mesure ci-contre |
| **Q2 — le geste au pied AVEC une filière montée** (cadre 142 : INJECTER sous le panneau) | **décision de f2 (08/10)** : la planque est lue AUSSI en nominal ; le pied porte le geste quand la planque servie tient de quoi blanchir (absent sinon, jamais éteint). Le libellé reste BLANCHIR (mot ratifié, table 77) et sa note « l'argent passe de la planque à la filière » | décision de f2 du 08/10 |

## Format du RAPPORT — imposé

Un finding par ligne, dans UNE table :

| id | gravité | critère | écart | mesure | ce que je n'ai pas pu vérifier |
|---|---|---|---|---|---|
| `F1` | `BLOQUANT` \| `MAJEUR` \| `MINEUR` | `DÉJÀ APPLIQUÉ` \| `NOUVEAU` | <l'écart> | <les nombres> | <ou vide> |

## Ce qui N'EST PAS fourni — et ne doit pas être cherché

- le code du client (`Assets/Scripts`) et ses tests ;
- les notes d'implémentation du chantier ;
- les rapports des juges précédents (`Tools/juge-visuel/screen_c2/r<k>/`, k < 1) — aucun ici, r1.
- toute capture « avant » — sauf si listée ci-dessus avec la preuve qu'UNE seule variable change.
