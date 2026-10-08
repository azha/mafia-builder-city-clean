# Dossier du juge visuel — ⑥ Org Chart — r4 — 2026-09-22

> ⚠️ **Dossier PRÉPARÉ, pas encore instruisable : les captures manquent.** Généré par
> `Tools/juge-visuel/preparer-r4-famille-r17-miroir-2026-09-22.py` (atelier / DA) le 2026-09-22. Dès que le créneau a tourné, l'orchestrateur
> pose ici les captures (COPIES + sha256 + ligne d'identité dans `captures-provenance.md`, journal joint) et ce dossier devient
> instruisable tel quel. S'il te manque autre chose, c'est un défaut du dossier : dis-le dans ton rapport, section « non vérifié ».

## L'écran

- **Nom** : Org Chart (⑥, canon `screen_3`) — contrôleur `LieutenantScreenController`
- **Ce qu'on vient y faire** : l'organigramme Don → lieutenants → hommes, avec chips de résumé.
- **Chemin joueur emprunté par la capture** : onglet FAMILLE
- **Pourquoi ce tour** : le tour précédent (r3-2026-09-06) a rendu **APPROUVÉ (0 bloquant, 0 majeur, 14 mineurs)**. Depuis, du TEXTE de cet écran a été
  réécrit (lots du 2026-09-22) — un verdict rendu avant une réécriture ne couvre pas le texte réécrit (MANDAT §5-bis).

## Ce qu'on te demande de trancher

1. **Les constats du tour précédent**, un par un, selon ce classement (périmètre, pas jugement — `famille/constats-a-rejuger.md`) :

| id (tour précédent) | gravité | écart | ce que tu en fais |
|---|---|---|---|
| `F1` | MINEUR | bord haut du rang du Don gris au lieu d'or | **TENU** |
| `F2` | MINEUR | bloc « qui » 19,7 % plus lâche (nom → pastille) | **TENU** |
| `F3` | MINEUR | rang du Don : deux lignes 30 % plus serrées | **TENU** |
| `F4` | MINEUR | halo du médaillon du Don à moins de la moitié | **TENU** |
| `F5` | MINEUR | ombre portée des rangs à 48 % | **TENU** |
| `F6` | MINEUR | anneau du bouton retour à −50 % d'énergie | **TENU** |
| `F7` | MINEUR | disque intérieur des médaillons plus sombre, moins bleu | **TENU** |
| `F8` | MINEUR | fond de tête en plaque pleine largeur | **TENU** |
| `F9` | MINEUR | texte de pastille +11,4 % de capitale | **TENU** |
| `F10` | MINEUR | rayon des coins des rangs −1,8 CSS | **TENU** |
| `F11` | MINEUR | haut des cartes plus bleu, liseré plat | **TENU** |
| `F12` | MINEUR | pointillé des emplacements vides plus clairsemé | **TENU** |
| `F13` | MINEUR | anneaux de médaillon −11 % d'énergie | **TENU** |
| `F14` | MINEUR | rang du Don : « Vous » / « LE DON » au lieu de « Don V. » / « VOUS » (dépend des données) | **TENU** |

   - **TENU** : constate-le sur la nouvelle capture (présent ou fermé), sans le re-dériver.
   - **À REJUGER** / **À RE-VÉRIFIER** : re-mesure-le contre la référence de CE dossier.
   - **CADUC** : ne le compte plus ; si l'écart réapparaît sous une autre forme, c'est un `NOUVEAU`.
2. **Le texte réécrit** — sur la capture, le texte affiché est-il exactement celui-ci ? Un texte ancien à l'écran = écart de SENS
   (le client n'a pas câblé), jamais l'inverse :

| où | texte attendu (fr, ratifié) |
|---|---|
| dialogue de réaffectation, chargement | « Le lieutenant arrive… rouvrez « Réaffecter » quand sa fiche est là. » |
| dialogue de réaffectation, question | « Confirmer la réaffectation ? Son ancienneté repart de zéro, et il lui faudra le temps de s'installer. » |
| dialogue de réaffectation, ligne 1 | « Installation prévue : {bande} » |
| dialogue de réaffectation, ligne 2 | « Ancienneté perdue : {bande} » |
| dialogue de réaffectation, ligne 3 | « Rendement perdu : {bande} » |
| éditeur de règles, cycleur `AND_IF` vide | « aucune » |
| éditeur de règles, primitive verrouillée par palier | « {JETON}  🔒 palier {n} » |
| éditeur de règles, primitive pas dans ce build | « {JETON}  🔒 pas encore » |

3. **Tout le reste** : `NOUVEAU`, au format imposé.

## Référence (fait autorité : l'IMAGE)

| fichier (dans ce dossier) | rôle |
|---|---|
| `reference-1120.png` | l'organigramme de référence (1120×1850), rendu le 02/09 (`7bfd1968`) — INCHANGÉ depuis le r3 |
| `reference-source.html` | sa source (aide de lecture, ne prime jamais sur l'image) |

- **Source HTML/CSS** : `ecrans-brennar.html` (atelier `8509195`) — aide de lecture, ne prime JAMAIS sur l'image.
  ⚠️ référence = Tools/family-organigramme-reference-1120.png (1120×1850) et famille/ecran-canon.png ; ⑦ ⑧ sont des sections du même contrôleur
- **Polices — ce qui a RÉELLEMENT rendu la référence** : **DejaVu**, depuis le 2026-09-23 (ARBITRAGES du 07/09, point 18) — `Tools/rendre-maquette.py`
  passe `Tools/polices/fonts-dejavu.conf` à Chrome, prouvé par `Tools/polices/controle-polices.py` (chasse à l'encre = DejaVu à 1 px). `fc-match` sous ce réglage :

      Georgia            →  "DejaVu Serif" "Book"
      DejaVu Sans        →  "DejaVu Sans" "Book"
      Courier New        →  "Liberation Mono" "Regular"
      sans-serif         →  "DejaVu Sans" "Book"
      serif              →  "DejaVu Serif" "Book"
      Times New Roman    →  "DejaVu Serif" "Book"
      Segoe UI           →  "DejaVu Sans" "Book"

  Le client embarque **DejaVu Sans** / **DejaVu Serif** : la référence est rendue dans la **même** famille ⇒ un écart de famille, de graisse
  ou de chasse **se compare** (ce n'est plus un arbitrage). ⚠️ Une référence d'avant le 2026-09-23 ne l'était pas : Chrome rendait Georgia en
  **Liberation Serif** (et non en Noto Serif, comme `fc-match` le disait alors) et Segoe UI en Noto Sans.

## Captures en jeu (Play Mode réel, compte de capture, SOUS le chrome du shell) — À POSER AU CRÉNEAU

| fichier attendu (copie dans ce dossier) | commande qui le produit | ce qu'elle montre | preuve d'identité exigée | état |
|---|---|---|---|---|
| `famille_1080x2400.png` | `MAFIA_CI_CATEGORIES=CaptureFamille` (`FamilleCapturePlayModeTests`, préfixe unique : 1 catégorie) | l'organigramme, onglet FAMILLE — montre le glyphe d'archétype ; ne montre AUCUN des huit textes réécrits | `[DemoIdentityResolver] régime=… identité=…` (le test passe par le shell de la scène de build ; pas de garde `[IDENTITE-CONNECTEE]`) | **NON FOURNI** — à poser au créneau |
| `— (aucune catégorie aujourd'hui)` | **aucun test de capture n'ouvre la réaffectation ni l'éditeur de règles** (mesuré sur `gate/cumul-client-2026-09-22` : 4 fichiers de test touchent ces vues, 0 capture) | les huit textes du tableau « à vérifier » — dette de CAPTURE, à écrire côté client ; tant qu'elle court, ces textes vont en « non vérifié » | — | **NON FOURNI** — à poser au créneau |

- Protocole : `RECAPTURE-2026-09-22.md` §2 — conteneur RECRÉÉ, horodatage de l'image lu PENDANT le run, empreinte à deux propriétés
  avant/après, **un run = une paire** exportée sous `MAFIA_CAPTURE_*` SEULEMENT (`MAFIA_DEMO_*` posé = faute), et ⛔ **l'arbre du run
  contient `55e674db`** (§2.6 — `main` au 22/09 ne le contient pas). La catégorie de cet écran n'est PAS dans la valeur unique du §1 :
  à ajouter au run, ou à lancer à part avec la même paire.
- **Corps réels comparables** : `famille/corps-reels/` ; s'ils ne sont pas du compte et de la fenêtre de la planche (`passe-synchrone.py`,
  RECAPTURE §2.5), les VALEURS vont en « non vérifié » — la forme se juge.

## Échelle — OBLIGATOIRE, jamais déduite par le juge

- Référence : `reference-1120.png` (1120×1850), rendue par `family-organigramme-reference-source.html` — même contrat que le r3 (voir son dossier pour les ancres) ; capture 1080×2400.
- Le CHROME (bandeau, dock) n'est pas à l'échelle du contenu : `AppShell.Px(css) = css × 1280/392` ; il se juge contre le canon du HUD.
- Hauteurs : référence et capture n'ont pas la même hauteur — aligner par PARTIES entre bandeau et dock. Les rapports INTERNES
  sont invariants d'échelle et restent des défauts réels.

## Règles de doctrine applicables

- Portrait ; gouttière ; contraste ≥ 3:1 / 4,5:1 sur l'art réel ; **langue affichée : français** (un enum brut, une clé i18n ou un
  anglais à l'écran = écart de SENS) ; espace de mélange sRGB (maquette) / linéaire (client) ; animation : AUCUNE.
- Chrome non alimenté / phase « — » hors district = état VOULU ; ronds du dock vides = arbitrage user ; anglais dans la RÉFÉRENCE =
  maquette en retard.
- Une planche prise sur un back antérieur à la recréation n'est pas opposable ; une ligne de journal ne se cite que JOINTE.

## Format du RAPPORT — imposé

| id | gravité | critère | dépend des données | écart | mesure | ce que je n'ai pas pu vérifier |
|---|---|---|---|---|---|---|
| `F1` | `BLOQUANT` \| `MAJEUR` \| `MINEUR` | `DÉJÀ APPLIQUÉ` \| **`NOUVEAU`** | oui/non | <l'écart> | <les nombres> | <ou vide> |

- Chaque id du classement ci-dessus : **TENU / CLOS / NOUVEAU**, avec sa mesure. Chaque texte réécrit : **conforme / écart de sens /
  non capturé**. Le compte se prend dans la table ; ASSUMÉ et ARBITRAGE à part.

## Ce qui N'EST PAS fourni — et ne doit pas être cherché

- le code du client et ses tests ; les rapports des juges précédents (seul le CLASSEMENT ci-dessus en est tiré — un périmètre) ;
- pour l'instant : toute capture.

Préparé sur le client `5544ecd2` (branche `da/2026-09-22`), classement mesuré sur `gate/cumul-client-2026-09-22` (`81803f0a`), atelier `8509195`.
