# Dossier du juge visuel — ⑰ Precinct View — r2-⑰- — 2026-09-22

> ⚠️ **Dossier PRÉPARÉ pour la RECAPTURE des constats suspendus du 07/09, pas encore instruisable : les captures manquent.**
> Généré par `Tools/juge-visuel/preparer-r2-2026-09-22.py` (atelier / DA) le 2026-09-22. Dès que le créneau de recapture a
> tourné (`RECAPTURE-2026-09-22.md`), l'orchestrateur pose ici les captures (COPIES + sha256 + ligne d'identité dans
> `captures-provenance.md`, journal joint) et ce dossier devient instruisable tel quel. S'il te manque autre chose, c'est un
> défaut du dossier : dis-le dans ton rapport, section « non vérifié ». Rien ne s'invente.

## L'écran

- **Nom** : Precinct View (⑰, canon `screen_9`) — contrôleur `PrecinctScreenController`
- **Ce qu'on vient y faire** : la mémoire du precinct, l'achat de renseignement, le recrutement de clerc.
- **Chemin joueur emprunté par la capture** : Plus → LE COMMISSARIAT
- **États capturés** : NON FOURNI — aucune capture encore. Attendues : voir la table des captures.
- **Pourquoi ce tour** : les planches jugées les 06–07/09 photographiaient un back du 04-09 (`SUSPENSION-back-04-09-2026-09-07.md`).
  Les constats ci-dessous ont été SUSPENDUS (pas rétractés) : ils attendent une planche prise sur le conteneur recréé. Les
  autres constats du tour précédent (forme, matière, géométrie) tiennent et ne sont pas à refaire.

## Ce qu'on te demande de trancher — les constats SUSPENDUS de cet écran (lus dans le document de suspension)

| id (tour précédent) | écart | section |
|---|---|---|
| `B3` | L'inventaire par commissariat — six fiches au canon série 2, six fiches punaisées au cadre #31 — est absent. L | A |
| `m4` | oui (déclenché par la longueur de la valeur) | A |
| `B3` | inventaire par commissariat absent — sous réserve du back (0 route district → précinct à cette date) | B |

- **`police/constats-a-rejuger-⑰.md`** — le périmètre exact du re-jugement de ce écran (tenu / à rejuger / caduc) : à lire AVANT de compter.

## Référence (fait autorité : l'IMAGE)

| fichier (dans ce dossier) | rôle | taille px | facteur | largeur CSS ↔ largeur écran |
|---|---|---|---|---|
| `reference-⑰-1080x2102.png` | rendu du cadre nominal (`ecrans-brennar-6.html` #31 « La police — le tableau : ce qu’ils savent ») | 1080×2102 | ×3,6 | 300 CSS = 1080 px |
| `etats/*-canon.png`, `etats/*-vide.png` (s'ils existent) | canons antérieurs (série 2, ×3,0) — témoins d'ÉTAT, jamais la référence | 900×1752 | ×3,0 | 300 CSS = 900 px |

- **Source HTML/CSS** (aide de lecture, ne prime JAMAIS sur l'image) : `/home/erutheone/project/atelier3d-mafia/ecrans-brennar-6.html` (atelier `20d006d`).
  Les cadres sont les `<div class="cadre">` numérotés **0-based** ; ceux de cet écran :
  - #31 (l.1043) — La police — le tableau : ce qu’ils savent  ⇐ **cadre NOMINAL, rendu en référence**
  - #32 (l.1080) — La police — le registre de dispatch
  - #33 (l.1090) — La police — déposer un signalement
  - #34 (l.1103) — La police — le retour de bâton
  - #35 (l.1115) — La police — avec les lots back
  ⚠️ partage les cadres 31-35 avec ⑮ ; canon police/commissariat-canon.png. ⛔ NOMINAUX ÉCHANGÉS le 2026-09-07 : ⑮ portait 31 et ⑰ portait 32, c'était l'INVERSE. Établi à la source par le juge du r1 puis re-vérifié dans ecrans-brennar-6.html : le cadre 31 parle de « précinct » et porte belief + patrol_heat PAR PRÉCINCT (⑰), le cadre 32 de « dispatch / registre » (⑮) ; 34 et 35 « précinct » aussi. Confirmé par la luminance : contenu 15,5 capture / 22,7 canon série 2 / 141,2 cadre 31 — l'écart vers le canon est 17x plus petit. ⇒ Les DEUX dossiers faisaient rendre la référence de l'autre. ⇒ 3e attribution fausse de cette table (coffre, carnet, police) et TROIS MÉCANISMES DIFFÉRENTS : doublon, planche d'un autre écran, cadres croisés. Une table écrite à la main depuis des preuves n'a jamais été confrontée à sa source ligne par ligne. 
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
| `planche_le_commissariat_1080x2400.png` | `MAFIA_CI_CATEGORIES=PhotoPlanche` | sous chrome, surimpression (test de planche) | **NON FOURNI** — à poser au créneau |

- Protocole de planche : `RECAPTURE-2026-09-22.md` §2 (conteneur RECRÉÉ, horodatage de l'image lu PENDANT le run, empreinte à
  deux propriétés avant/après, la paire du compte de capture exportée sous `MAFIA_CAPTURE_*` ET `MAFIA_DEMO_*` — le shell ne lit que
  la seconde —, sha256 + ligne `[DemoIdentityResolver]` du journal ici ; `[IDENTITE-CAPTURE]` n'est PAS une preuve, §2.4).
- **Corps réels comparables** : `police/corps-reels/` rejoués le 2026-09-22 sur la pile `03cf564c`, compte `operational_demo`
  (provenance dans chaque fichier). Comparables en VALEUR seulement si la capture est prise sur ce même compte — sinon, forme.

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
- les rapports des juges précédents (`police/r<k>-…/`) — sauf la LISTE des constats suspendus recopiée ci-dessus, et le
  fichier `constats-a-rejuger` s'il existe (ce sont des périmètres, pas des jugements) ;
- pour l'instant : toute capture.

Préparé sur le client `f0ac86c0` (branche `da/2026-09-22`), atelier `20d006d`.
