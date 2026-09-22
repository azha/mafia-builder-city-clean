# Dossier du juge visuel — ㉝ Raser un site — r2-㉝ — 2026-09-22

> ⚠️ **Dossier PRÉPARÉ pour la RECAPTURE des constats suspendus du 07/09, pas encore instruisable : les captures manquent.**
> Généré par `Tools/juge-visuel/preparer-r2-2026-09-22.py` (atelier / DA) le 2026-09-22. Dès que le créneau de recapture a
> tourné (`RECAPTURE-2026-09-22.md`), l'orchestrateur pose ici les captures (COPIES + sha256 + ligne d'identité dans
> `captures-provenance.md`, journal joint) et ce dossier devient instruisable tel quel. S'il te manque autre chose, c'est un
> défaut du dossier : dis-le dans ton rapport, section « non vérifié ». Rien ne s'invente.

## L'écran

- **Nom** : Raser un site (㉝, canon ``) — contrôleur `DemolitionScreenController`
- **Ce qu'on vient y faire** : non pré-rempli (front.md sans « Montre »)
- **Chemin joueur emprunté par la capture** : Plus → RASER UN SITE
- **États capturés** : NON FOURNI — aucune capture encore. Attendues : voir la table des captures.
- **Pourquoi ce tour** : les planches jugées les 06–07/09 photographiaient un back du 04-09 (`SUSPENSION-back-04-09-2026-09-07.md`).
  Les constats ci-dessous ont été SUSPENDUS (pas rétractés) : ils attendent une planche prise sur le conteneur recréé. Les
  autres constats du tour précédent (forme, matière, géométrie) tiennent et ne sont pas à refaire.

## Ce qu'on te demande de trancher — les constats SUSPENDUS de cet écran (lus dans le document de suspension)

| id (tour précédent) | écart | section |
|---|---|---|
| `M2` | Contradiction de sens dans le bloc d'état : le verdict `.q b` dit « Ça tient » pendant que le titre, le sous-t | A |
| `M3` | Deux rangées strictement identiques (« Réparation Ilm · Un labo · c'est juste · quelqu'un y travaille ») et au | A |
| `m2` | `.dm-penal` absent (la bande ambre « Tout produit moins en ce moment. »). Très probablement l'état calme — mai | A |
| `m4` | Le grand nombre `.gros` est rendu en gris-bleu froid `#9aa6b3` là où le seul état écrit de la maquette met `#d | A |
| `M2` | « Ça tient » contre « 13 endroits se gênent » sur 17 sites (comptes) | B |
| `B1 (compte)` | 17 sites annoncés, 7 lisibles — le NOMBRE ; la coupe à mi-carte reste un écart de forme | B |

- aucun `constats-a-rejuger` pour cet écran : la référence du tour précédent était la bonne ; seuls les constats SUSPENDUS ci-dessus sont à trancher, les autres tiennent.

## Référence (fait autorité : l'IMAGE)

| fichier (dans ce dossier) | rôle | taille px | facteur | largeur CSS ↔ largeur écran |
|---|---|---|---|---|
| `reference-1080x2102.png` | rendu du cadre nominal (`ecrans-brennar-6.html` #79 « L'organisation frotte ») | 1080×2102 | ×3,6 | 300 CSS = 1080 px |
| `etats/*-canon.png`, `etats/*-vide.png` (s'ils existent) | canons antérieurs (série 2, ×3,0) — témoins d'ÉTAT, jamais la référence | 900×1752 | ×3,0 | 300 CSS = 900 px |

- **Source HTML/CSS** (aide de lecture, ne prime JAMAIS sur l'image) : `/home/erutheone/project/atelier3d-mafia/ecrans-brennar-6.html` (atelier `868ab87`).
  Les cadres sont les `<div class="cadre">` numérotés **0-based** ; ceux de cet écran :
  - #79 (l.5067) — L'organisation frotte  ⇐ **cadre NOMINAL, rendu en référence**
  - #80 (l.5069) — Ce bâtiment vous coûte
  - #81 (l.5071) — Le raser — confirmer
  - #82 (l.5073) — Vous avez déjà tranché aujourd'hui
  - #83 (l.5075) — La parcelle est libre
  - #84 (l.5077) — L'offre s'est fermée
  ⚠️ le contrôleur cite m-79..84. ⛔ NOMINAL CORRIGÉ le 2026-09-07, 80 → 79 : le juge du r1 a mesuré que la CAPTURE montre 79 (« L'organisation frotte ») et non 80 (« Ce bâtiment vous coûte »), prouvé par 4 marqueurs de source dont VOIR CE QUI COÛTE LE PLUS, 1 seule occurrence dans toute la page, en 79. Le dossier faisait donc rendre la mauvaise référence, et la couche globale devenait incomparable (luminance ×8 : la fiche crème de 80, 29,2 % de l'image, absente de 79 — cet écart n'accusait rien). ⇒ Un nominal est l'état que la CAPTURE montre, jamais l'état le plus représentatif du groupe : il se mesure sur la planche, pas se choisit sur la maquette.
- **Rendu** : `Tools/rendre-tel.py <page> <index> <sortie> 3.6` — Chrome sans tête, recadrage à 300×584 CSS × 3,6 = 1080×2102,
  assertion de taille en sortie. Références nominales re-vérifiées le 2026-09-22 (⑮ ⑰ ㊲ re-rendues ; voir l'INDEX).
- **Polices — ce qui a RÉELLEMENT rendu la référence** (`fc-match` sur cette machine, exécuté à la génération de ce dossier le 2026-09-22) :

      Georgia            →  "Noto Serif" "Regular"
      DejaVu Sans        →  "DejaVu Sans" "Book"
      Courier New        →  "Liberation Mono" "Regular"
      sans-serif         →  "Noto Sans" "Regular"
      serif              →  "Noto Serif" "Regular"
      Times New Roman    →  "Liberation Serif" "Regular"
      Segoe UI           →  "Noto Sans" "Regular"

  Le client embarque **DejaVu Sans** / **DejaVu Serif**. La série 6 demande `'DejaVu Sans'` (même police des deux côtés) et
  `Georgia,serif` (→ Noto Serif à la référence, DejaVu Serif au client) ⇒ un écart de FAMILLE ou de chasse sur le sérif est un
  **ARBITRAGE** ; la hauteur de capitale, elle, se compare.

## Captures en jeu (Play Mode réel, compte de capture, SOUS le chrome du shell) — À POSER AU CRÉNEAU

| fichier attendu (copie dans ce dossier) | commande qui le produit | rôle / angle mort | état |
|---|---|---|---|
| `planche_raser_un_site_1080x2400.png` | `MAFIA_CI_CATEGORIES=PhotoPlanche` | sous chrome, surimpression | **NON FOURNI** — à poser au créneau |

- Protocole de planche : `RECAPTURE-2026-09-22.md` §2 (conteneur RECRÉÉ, horodatage de l'image lu PENDANT le run, empreinte à
  deux propriétés avant/après, un run = une paire, exportée sous `MAFIA_CAPTURE_*` SEULEMENT — `MAFIA_DEMO_*` posé = faute —,
  sha256 + preuve d'identité jointe : `[IDENTITE-CONNECTEE] … CONFORME` ou `[DemoIdentityResolver]` selon la catégorie,
  §2.4 ; `[IDENTITE-CAPTURE]` n'est PAS une preuve).
- **Corps réels comparables** : `ecran_demolition/corps-reels/` est sur `operational_demo` (22/09, pile `03cf564c`) ; il est REPRIS sur le
  compte du run, dans la fenêtre du créneau, par `passe-synchrone.py` (RECAPTURE §2.5). La provenance de chaque fichier dit le compte :
  si elle ne dit pas celui de la planche, les VALEURS vont en « non vérifié » — la forme se juge.

## Échelle — OBLIGATOIRE, jamais déduite par le juge

| | px de l'image | largeur CSS de référence | facteur |
|---|---|---|---|
| RÉFÉRENCE (cadre de série 6, `.tel` 300 CSS) | 1080 | 300 | **×3,6** |
| CAPTURE (contenu de l'écran, dessiné à `LargeurEcransBrennar6 = 300`) | 1080 | 300 | **×3,6** |
| | | **rapport capture ÷ référence** | **1,00** |

- Contenu : même échelle des deux côtés, un écart de taille est RÉEL. Le CHROME (bandeau, dock) n'est PAS à cette échelle :
  `AppShell.Px(css) = css × 1280/392` (×2,755) — il se juge contre `hud-canon-1176.png`, le contenu contre le cadre de série 6.
- Hauteurs : référence 584 CSS (2102 px) ; capture 666,7 CSS (2400 px) — aligner par PARTIES entre bandeau et dock.
- Les rapports INTERNES sont invariants d'échelle et restent des défauts réels.

## Règles de doctrine applicables

- Portrait ; gouttière (contenu entre bandeau et dock) ; contraste ≥ 3:1 / 4,5:1 sur l'art réel ; **langue affichée : français**
  via résolveurs nommés (un enum brut, une clé i18n ou un repli anglais à l'écran = écart de SENS) ; espace de mélange (sRGB
  maquette / linéaire client : un écart systématique = une erreur de modèle) ; animation : AUCUNE (paire T/T+1 s à fournir).
- Chrome non alimenté / phase « — » hors district = état VOULU ; ronds du dock vides = arbitrage user ; anglais dans la
  RÉFÉRENCE = maquette en retard ; cadre de style (sombre, napolitain, mafieux, fin 80s–début 90s) : direction = ARBITRAGE.
- **Une planche prise sur un back ANTÉRIEUR à la recréation n'est pas opposable** : le journal joint doit porter l'horodatage
  de l'image (`built_at`) et le `server_build_ref` ; sans eux, tout constat de VALEUR va en « non vérifié ».
- Une ligne de journal ne se cite que JOINTE.

## Écarts ASSUMÉS — à inventorier, à classer ASSUMÉ, à vérifier « rendu proprement »

| ce qu'on voit | pourquoi (mesuré, avec sa source) | ce qui le ferait SORTIR de l'assumé |
|---|---|---|
| (à compléter par l'orchestrateur au top, depuis le `juge-donnees` mode maquette de l'écran s'il existe) | | |

## Format du RAPPORT — imposé

| id | gravité | critère | dépend des données | écart | mesure | ce que je n'ai pas pu vérifier |
|---|---|---|---|---|---|---|
| `F1` | `BLOQUANT` \| `MAJEUR` \| `MINEUR` | `DÉJÀ APPLIQUÉ` \| **`NOUVEAU`** | oui/non | <l'écart> | <les nombres> | <ou vide> |

- Pour chaque constat SUSPENDU listé plus haut : **tranché TENU / tranché CLOS**, avec la mesure sur la nouvelle planche — c'est
  le seul compte attendu de ce tour, en plus des `NOUVEAU`.
- gravité : liste fermée ; ASSUMÉ et ARBITRAGE à part ; le compte se prend dans la table.

## Ce qui N'EST PAS fourni — et ne doit pas être cherché

- le code du client et ses tests ; les notes d'implémentation ;
- les rapports des juges précédents (`ecran_demolition/r<k>-…/`) — sauf la LISTE des constats suspendus recopiée ci-dessus, et le
  fichier `constats-a-rejuger` s'il existe (ce sont des périmètres, pas des jugements) ;
- pour l'instant : toute capture.

Préparé sur le client `048559b1` (branche `da/2026-09-22`), atelier `868ab87`.
