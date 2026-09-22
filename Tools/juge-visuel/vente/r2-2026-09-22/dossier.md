# Dossier du juge visuel — ㉟ La vente — r2-㉟ — 2026-09-22

> ⚠️ **Dossier PRÉPARÉ pour la RECAPTURE des constats suspendus du 07/09, pas encore instruisable : les captures manquent.**
> Généré par `Tools/juge-visuel/preparer-r2-2026-09-22.py` (atelier / DA) le 2026-09-22. Dès que le créneau de recapture a
> tourné (`RECAPTURE-2026-09-22.md`), l'orchestrateur pose ici les captures (COPIES + sha256 + ligne d'identité dans
> `captures-provenance.md`, journal joint) et ce dossier devient instruisable tel quel. S'il te manque autre chose, c'est un
> défaut du dossier : dis-le dans ton rapport, section « non vérifié ». Rien ne s'invente.

## L'écran

- **Nom** : La vente (㉟, canon ``) — contrôleur `SellingScreenController`
- **Ce qu'on vient y faire** : non pré-rempli (front.md sans « Montre »)
- **Chemin joueur emprunté par la capture** : Plus → LA VENTE
- **États capturés** : NON FOURNI — aucune capture encore. Attendues : voir la table des captures.
- **Pourquoi ce tour** : les planches jugées les 06–07/09 photographiaient un back du 04-09 (`SUSPENSION-back-04-09-2026-09-07.md`).
  Les constats ci-dessous ont été SUSPENDUS (pas rétractés) : ils attendent une planche prise sur le conteneur recréé. Les
  autres constats du tour précédent (forme, matière, géométrie) tiennent et ne sont pas à refaire.

## Ce qu'on te demande de trancher — les constats SUSPENDUS de cet écran (lus dans le document de suspension)

| id (tour précédent) | écart | section |
|---|---|---|
| `B2` | L'écran est vide à 74,2 % et il ne l'est pas par manque de place. | A |
| `M9` | La ligne « lieu · lek N · posture de prix » est absente : ni district, ni lek, ni tarif nulle part sur l'écran | A |
| `M11` | Le texte de l'écran nie ce que l'empreinte déclarée compte : « aucune planque n'existe encore », alors que l'e | A |
| `m7` | La carte est intitulée par un mot que la maquette emploie comme SUBSTANCE, pas comme personne : « Brindle ». | A |
| `B3` | « Moderate » / « Standard » — idem (fermé par unity par ailleurs) | B |
| `M11` | « aucune planque n'existe encore » contre 2 planques d'empreinte | B |

- **`vente/constats-a-rejuger.md`** — le périmètre exact du re-jugement de ce écran (tenu / à rejuger / caduc) : à lire AVANT de compter.

## Référence (fait autorité : l'IMAGE)

| fichier (dans ce dossier) | rôle | taille px | facteur | largeur CSS ↔ largeur écran |
|---|---|---|---|---|
| `reference-1080x2102.png` | rendu du cadre nominal (`ecrans-brennar-6.html` #107 « La vente — qui vend et ce qu'il y a dans la caisse ») | 1080×2102 | ×3,6 | 300 CSS = 1080 px |
| `reference-ramasser-1080x2102.png` | **NON RENDU au 2026-09-22** — cadre 109 « Ramasser — nulle part où la porter », le cadre d'état homologue de la capture r1 (demandé par le juge r1, point 3) — À RENDRE après le gate du 2026-09-22 (rendre-references-2026-09-22.py) | — | — | — |
| `etats/*-canon.png`, `etats/*-vide.png` (s'ils existent) | canons antérieurs (série 2, ×3,0) — témoins d'ÉTAT, jamais la référence | 900×1752 | ×3,0 | 300 CSS = 900 px |

- **Source HTML/CSS** (aide de lecture, ne prime JAMAIS sur l'image) : `/home/erutheone/project/atelier3d-mafia/ecrans-brennar-6.html` (atelier `20d006d`).
  Les cadres sont les `<div class="cadre">` numérotés **0-based** ; ceux de cet écran :
  - #107 (l.5772) — La vente — qui vend et ce qu'il y a dans la caisse  ⇐ **cadre NOMINAL, rendu en référence**
  - #108 (l.5775) — La caisse de Oskar — pleine à ras
  - #109 (l.5778) — Ramasser — nulle part où la porter
  - #110 (l.5781) — Ilse s'est fait prendre
  - #111 (l.5784) — Aucun dealer — rien ne rentre
  - #112 (l.5787) — Ce qui manque encore
  ⚠️ ⛔ RÉTABLI 107-112 / nominal 107 le 2026-09-22, MESURÉ sur le TEXTE AFFICHÉ (pas sur une classe CSS) : le cadre 107 porte l'étiquette « La vente — qui vend et ce qu'il y a dans la caisse » et dessine les six dealers + « AFFECTER UN DEALER » (c'est l'état nominal) ; 108 est « La caisse de Oskar » (un état) ; 113 est « L'horizon — ce qui s'ouvre et à quel prix » (㊱, déjà dans SA plage 113-118). Le PNG commité `vente/reference-1080x2102.png` EST le cadre 107 (7,1 % d'écart, dû au lot de vocabulaire de l'atelier ; 34,3 % contre 108) — le juge r1 a comparé au bon cadre. La « correction » du 2026-09-07 (107-112 -> 108-113, « #107 appartient à ㉗ : ses 47 occurrences de `vnt6` sont le bloc <style> ») déduisait l'appartenance d'un cadre de l'endroit où sa CSS est déclarée : le segment de 107 CONTIENT le <style> de la rangée ET son contenu — une déclaration dense n'exclut pas l'usage, elle le précède. ⇒ 5e mécanisme d'attribution fausse : corriger une table sur un compte de classe CSS sans relire le cadre. dealers en prénoms servis (§DA-2)
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
| `planche_la_vente_1080x2400.png` | `MAFIA_CI_CATEGORIES=PhotoPlanche` | sous chrome, surimpression | **NON FOURNI** — à poser au créneau |
| `la_vente_1080x2400.png` | `MAFIA_CI_CATEGORIES=PhotoVente` | écran seul (LaVenteCapturePlayModeTests) | **NON FOURNI** — à poser au créneau |

- Protocole de planche : `RECAPTURE-2026-09-22.md` §2 (conteneur RECRÉÉ, horodatage de l'image lu PENDANT le run, empreinte à
  deux propriétés avant/après, un run = une paire exportée sous `MAFIA_CAPTURE_*` ET `MAFIA_DEMO_*` — le capteur de corps ne lit que
  la seconde —, sha256 + preuve d'identité jointe : `[IDENTITE-CONNECTEE] … CONFORME` ou `[DemoIdentityResolver]` selon la catégorie,
  §2.4 ; `[IDENTITE-CAPTURE]` n'est PAS une preuve).
- **Corps réels comparables** : `vente/corps-reels/` est sur `operational_demo` (22/09, pile `03cf564c`) ; il est REPRIS sur le
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
- les rapports des juges précédents (`vente/r<k>-…/`) — sauf la LISTE des constats suspendus recopiée ci-dessus, et le
  fichier `constats-a-rejuger` s'il existe (ce sont des périmètres, pas des jugements) ;
- pour l'instant : toute capture.

Préparé sur le client `e2e4fc4b` (branche `da/2026-09-22`), atelier `20d006d`.
