# Dossier du juge visuel — ecran_delegation — r1 — <AAAA-MM-JJ>

> Généré depuis `.claude/skills/juge-visuel/dossier-gabarit.md` (dépôt back) par
> `Tools/nouvel-ecran.py`. Tout ce qui est entre chevrons se remplace ; tout ce qui ne peut pas
> être rempli se dit « non fourni » avec la raison — jamais supprimé.

## L'écran

- **Nom** : La délégation (`ecran_delegation`)
- **Ce qu'on vient y faire** : <une phrase de produit, pas de code — MÉTIER ICI>
- **Chemin joueur pour y arriver** : onglet `More` (AppShell.Tab.More)
- **États capturés** : <ex. jour et nuit · vide et plein · sélection 1> — et pourquoi ceux-là.
- **Routes du domaine** :
  - `GET /v1/meta/task-categories`
  - `GET /v1/meta/recall-preview/:categoryId`
  - `POST /v1/meta/graduation`
  - `POST /v1/meta/recall`
  - `GET /v1/lieutenants`

## Référence (fait autorité : l'IMAGE)

| fichier | rôle | taille px | facteur de rendu | largeur CSS ↔ largeur Unity |
|---|---|---|---|---|
| `Tools/juge-visuel/v6/m-75.png` | rendu ratifié | <W×H> | <ex. ×2> | <ex. 300 CSS = 1280 u (canvas)> |
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
| `Assets/Screenshots/planche_ce_que_vous_avez_confie_1080x2400.png` | 1080×2400 | <ligne du log> | <jour> | campagne `PhotoPlanche` |

⛔⛔ **CE DOSSIER POINTAIT SUR DEUX PLANCHES VIDES — corrigé le 2026-09-07, et la raison vaut d'être lue.**
Les deux fichiers `ecran_delegation_1080x{1920,2400}.png` mesurent **0,000 % d'encre** (balayage des
124 planches commitées : elles sont 4 dans ce cas, toutes de la même famille, et la suivante est à
0,329 % — la séparation est nette, il n'y a pas de zone grise). **Cause inscrite à l'inventaire sous
TD-541** : `MonterEcran()` n'appelle jamais `SetToken`, l'amorce sort immédiatement, et la capture est
prise **une frame après la création**, sur un écran monté et **jamais chargé**. Ces images ne
photographient donc que la charpente.
⇒ **La planche qui fait foi est celle qui passe par le chemin du joueur** — `planche_ce_que_vous_avez_confie`,
**3,419 %** d'encre, et c'est celle que la table de `construire-dossiers.py` désigne pour ㉜ depuis le
2026-09-04 (`confiance="mesurée"`, le contrôleur cite m-73..78).
⚠️ **Ce dossier est ANTÉRIEUR à cette table** : écrit à la main le 2026-09-03 (`bb75c53`), il n'est pas
une sortie du générateur — c'est pourquoi la correction de la table ne l'avait pas atteint. *Deux
artefacts de même nom et de provenance différente : celui qui est généré suit, celui qui est écrit à la
main reste.*
⇒ **Un juge qui aurait suivi ce dossier aurait jugé la charpente en croyant juger l'écran, et aurait eu
raison de conclure « rien à voir ».** *Une planche vide est mauvaise ; un dossier qui pointe sur elle est
pire, parce qu'il l'annonce comme une preuve.*

- Garde anti-vide du test : pixels hors du fond dominant > 0 (plancher bas — squelette non rempli).
  ⚠️ **Cette garde n'a pas protégé** : un plancher d'encre a été posé dans `CaptureSousShell` le
  2026-09-06 à 15:43 (`d130c99`), soit **neuf heures après** que ces planches ont été commitées, et ses
  deux tests sont **rouges depuis**. Ils avaient été classés « préexistants » sans être lus.
  ⇒ *Un rouge classé par CATÉGORIE plutôt que lu par son CONTENU est un rouge qui n'existe pas.*
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
| <à remplir> | <…> | <…> |

## Format du RAPPORT — imposé

Un finding par ligne, dans UNE table :

| id | gravité | critère | écart | mesure | ce que je n'ai pas pu vérifier |
|---|---|---|---|---|---|
| `F1` | `BLOQUANT` \| `MAJEUR` \| `MINEUR` | `DÉJÀ APPLIQUÉ` \| `NOUVEAU` | <l'écart> | <les nombres> | <ou vide> |

## Ce qui N'EST PAS fourni — et ne doit pas être cherché

- le code du client (`Assets/Scripts`) et ses tests ;
- les notes d'implémentation du chantier ;
- les rapports des juges précédents (`Tools/juge-visuel/ecran_delegation/r<k>/`, k < 1) — aucun ici, r1.
- toute capture « avant » — sauf si listée ci-dessus avec la preuve qu'UNE seule variable change.
