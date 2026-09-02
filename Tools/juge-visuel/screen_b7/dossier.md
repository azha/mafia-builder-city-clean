# Dossier du juge visuel — screen_b7 — r1 — <AAAA-MM-JJ>

> Généré depuis `.claude/skills/juge-visuel/dossier-gabarit.md` (dépôt back) par
> `Tools/nouvel-ecran.py`. Tout ce qui est entre chevrons se remplace ; tout ce qui ne peut pas
> être rempli se dit « non fourni » avec la raison — jamais supprimé.

## L'écran

- **Nom** : Forensic (`screen_b7`)
- **Ce qu'on vient y faire** : <une phrase de produit, pas de code — MÉTIER ICI>
- **Chemin joueur pour y arriver** : onglet `More` (AppShell.Tab.More)
- **États capturés** : <ex. jour et nuit · vide et plein · sélection 1> — et pourquoi ceux-là.
- **Routes du domaine** :
  - `GET /v1/me/forensic`

## Référence (fait autorité : l'IMAGE)

| fichier | rôle | taille px | facteur de rendu | largeur CSS ↔ largeur Unity |
|---|---|---|---|---|
| `<non fourni au générateur — à compléter>` | rendu ratifié | <W×H> | <ex. ×2> | <ex. 300 CSS = 1280 u (canvas)> |
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
| `Assets/Screenshots/screen_b7_1080x1920.png` | 1080×1920 | <ligne du log> | <jour> | `ScreenB7C1_CapturerPourLeJugeVisuel_DeuxResolutions` |
| `Assets/Screenshots/screen_b7_1080x2400.png` | 1080×2400 | <ligne du log> | <jour> | `ScreenB7C1_CapturerPourLeJugeVisuel_DeuxResolutions` |

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
| <à remplir> | <…> | <…> |

## Format du RAPPORT — imposé

Un finding par ligne, dans UNE table :

| id | gravité | critère | écart | mesure | ce que je n'ai pas pu vérifier |
|---|---|---|---|---|---|
| `F1` | `BLOQUANT` \| `MAJEUR` \| `MINEUR` | `DÉJÀ APPLIQUÉ` \| `NOUVEAU` | <l'écart> | <les nombres> | <ou vide> |

## Ce qui N'EST PAS fourni — et ne doit pas être cherché

- le code du client (`Assets/Scripts`) et ses tests ;
- les notes d'implémentation du chantier ;
- les rapports des juges précédents (`Tools/juge-visuel/screen_b7/r<k>/`, k < 1) — aucun ici, r1.
- toute capture « avant » — sauf si listée ci-dessus avec la preuve qu'UNE seule variable change.
