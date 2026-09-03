# Dossier du juge visuel — ecran_appro — r1 — NON JUGÉ (implémentation seule, 2026-09-03)

> Généré depuis `.claude/skills/juge-visuel/dossier-gabarit.md` (dépôt back) par
> `Tools/nouvel-ecran.py`. Tout ce qui est entre chevrons se remplace ; tout ce qui ne peut pas
> être rempli se dit « non fourni » avec la raison — jamais supprimé.
>
> ⛔ **CE DOSSIER N'A PAS ÉTÉ JUGÉ.** Le régime de cette passe interdisait de lancer l'éditeur
> Unity (« un second éditeur casserait tout » — le créneau était tenu ailleurs). Les sections qui
> exigent une capture Play Mode réelle (captures, échelle mesurée, écarts) sont donc marquées
> « non fourni » ci-dessous plutôt que remplies par estimation — voir
> `implementation-notes.md` § Deviations pour le détail. À invoquer via le skill `juge-visuel`
> une fois une capture réelle disponible.

## L'écran

- **Nom** : La chaîne d'appro (`ecran_appro`, ㉚)
- **Ce qu'on vient y faire** : commander la matière première d'un labo à sec (Pyralin et
  consorts) — lire l'état du stock, du prix et du fournisseur, et déclencher un réachat d'une
  pression du pouce.
- **Chemin joueur pour y arriver** : le menu « Plus » (`AppShell.DestinationsPlus()`, entrée
  « LA CHAÎNE D'APPRO ») — PAS `Tab.More` directement : depuis le 2026-09-02 cet onglet ouvre un
  MENU (`MonterMenuPlus`), il ne monte plus un écran unique. Le brief de ce chantier citait
  encore l'ancien contrat (`case Tab.More:`) ; c'était une prémisse fausse, corrigée en écrivant
  l'entrée dans `DestinationsPlus()` — voir implementation-notes.md § Deviations.
- **États capturés** : <non fourni — aucune capture cette passe, éditeur non lancé>. Trois états
  existent côté DONNÉE (repos/commande en cours/livrée — voir le contrôleur) ; un 4e (délégué,
  m-53) n'a aucune source et n'est pas construit.
- **Routes du domaine** :
  - `GET /v1/operational/precursors?building_id=<uuid>` — `building_id` OBLIGATOIRE (422 sans
    lui, mesuré 2026-09-03)
  - `POST /v1/operational/precursors/order`
  - `GET /v1/supply-chain/graph` — SANS le préfixe `operational/` (mesuré)
  - `POST /v1/supply-chain/legs/:id/maintain` — non câblée cette passe (aucun `leg_id` connu)

## Référence (fait autorité : l'IMAGE)

| fichier | rôle | taille px | facteur de rendu | largeur CSS ↔ largeur Unity |
|---|---|---|---|---|
| `Tools/juge-visuel/v6/m-48.png` | rendu ratifié | <W×H> | <ex. ×2> | <ex. 300 CSS = 1280 u (canvas)> |
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
| `Assets/Screenshots/ecran_appro_1080x1920.png` | 1080×1920 | <ligne du log> | <jour> | `EcranApproC1_CapturerPourLeJugeVisuel_DeuxResolutions` |
| `Assets/Screenshots/ecran_appro_1080x2400.png` | 1080×2400 | <ligne du log> | <jour> | `EcranApproC1_CapturerPourLeJugeVisuel_DeuxResolutions` |

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
- les rapports des juges précédents (`Tools/juge-visuel/ecran_appro/r<k>/`, k < 1) — aucun ici, r1.
- toute capture « avant » — sauf si listée ci-dessus avec la preuve qu'UNE seule variable change.
