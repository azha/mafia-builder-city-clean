# Dossier du juge visuel — ㊲ La réputation — r17 — 2026-09-22

> ⚠️ **Dossier PRÉPARÉ, pas encore instruisable : les captures manquent.** Généré par
> `Tools/juge-visuel/preparer-r4-famille-r17-miroir-2026-09-22.py` (atelier / DA) le 2026-09-22. Dès que le créneau a tourné, l'orchestrateur
> pose ici les captures (COPIES + sha256 + ligne d'identité dans `captures-provenance.md`, journal joint) et ce dossier devient
> instruisable tel quel. S'il te manque autre chose, c'est un défaut du dossier : dis-le dans ton rapport, section « non vérifié ».

## L'écran

- **Nom** : La réputation (㊲, canon ``) — contrôleur `ReputationScreenController`
- **Ce qu'on vient y faire** : non pré-rempli (front.md sans « Montre »)
- **Chemin joueur emprunté par la capture** : Plus → LA RÉPUTATION
- **Pourquoi ce tour** : le tour précédent (r16-2026-09-07) a rendu **NON APPROUVÉ (0 bloquant, 3 majeurs, 8 mineurs)**. Depuis, du TEXTE de cet écran a été
  réécrit (lots du 2026-09-22) — un verdict rendu avant une réécriture ne couvre pas le texte réécrit (MANDAT §5-bis).

## Ce qu'on te demande de trancher

1. **Les constats du tour précédent**, un par un, selon ce classement (périmètre, pas jugement — `reputation/constats-a-rejuger-r17.md`) :

| id (tour précédent) | gravité | écart | ce que tu en fais |
|---|---|---|---|
| `M1` | MAJEUR | à 1920, l'ascenseur posé SUR le contenu | **À REJUGER** |
| `M2` | MAJEUR | panneau élastique −11,6 %, la carte portrait en sort par le bas | **À REJUGER** |
| `M3` | MAJEUR | le visage déborde de la chevelure | **TENU** |
| `m1` | MINEUR | col en V +54,4 % d'aire | **TENU** |
| `m2` | MINEUR | reflet du miroir +68 % et bord à bord | **À REJUGER** |
| `m3` | MINEUR | boîte de compteur sans dégradé intérieur | **TENU** |
| `m4` | MINEUR | lueur ambrée sous le rail haut | **TENU** |
| `m5` | MINEUR | aparté « ce qu'il a absorbé » en 2 lignes au lieu de 3 | **TENU** |
| `m6` | MINEUR | marges et hors-tout du cadre | **TENU** |
| `m7` | MINEUR | boîte du CTA 6 px plus basse | **TENU** |
| `m8` | MINEUR | filet or sous le sous-titre 6 px plus haut | **TENU** |
| `A3` | ASSUMÉ | le reflet est FIXE, dans le tiers haut | **À RE-VÉRIFIER** |
| `R4` | ARBITRAGE | libellés de la maquette en retard (HEAT, tiède, $ 24 850, JOUR 12) | **CADUC (3 sur 4)** |

   - **TENU** : constate-le sur la nouvelle capture (présent ou fermé), sans le re-dériver.
   - **À REJUGER** / **À RE-VÉRIFIER** : re-mesure-le contre la référence de CE dossier.
   - **CADUC** : ne le compte plus ; si l'écart réapparaît sous une autre forme, c'est un `NOUVEAU`.
2. **Le texte réécrit** — sur la capture, le texte affiché est-il exactement celui-ci ? Un texte ancien à l'écran = écart de SENS
   (le client n'a pas câblé), jamais l'inverse :

| où | texte attendu (fr, ratifié) |
|---|---|
| bloc bas, état vierge (#120) | « … pas parce qu’il est médiocre. Et personne ne jugera votre constance tant qu’il n’a pas assez vu : indéterminé, jamais au milieu d’une jauge. » |
| bloc bas, état de dérive (#121) — si le compte du run le sert | « … On vous dit que vous dérivez, jamais sur quelle règle : ce n’est pas un choix, c’est ce qui manque encore. » |

3. **Tout le reste** : `NOUVEAU`, au format imposé.

## Référence (fait autorité : l'IMAGE)

| fichier (dans ce dossier) | rôle |
|---|---|
| `reference-1080x2102.png` | cadre NOMINAL #120 « Rien n'a encore déteint », RE-RENDU le 22/09 (atelier `20d006d`) — ⚠️ ce n'est PAS l'image que le r16 a reçue |
| `reference-derive-1080x2102.png` | cadre #121 (dérive), rendu le 22/09 |
| `reference-indetermine-1080x2102.png` | cadre #144 (indéterminé AVEC de l'absorbé) |
| `hud-canon-1176.png` | le canon du chrome (le chrome se juge contre lui, pas contre le cadre) |

- **Source HTML/CSS** : `ecrans-brennar-6.html` (atelier `8509195`) — aide de lecture, ne prime JAMAIS sur l'image.
  ⚠️ le contrôleur cite m-120.png
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
| `screen_b3_reputation_sous_chrome_1080x2400.png` | `MAFIA_CI_CATEGORIES=CaptureReputation` (`VuePrincipaleCapturePlayModeTests.Capture_EcranReputation_SousChrome`, préfixe unique : 1 catégorie) | le miroir sous chrome, par le chemin joueur Plus → LA RÉPUTATION ; l'ÉTAT montré dépend du compte du run (vierge #120, dérive #121, indéterminé avec absorbé #144) | `[DemoIdentityResolver] régime=… identité=…` (pas de garde `[IDENTITE-CONNECTEE]` dans cette méthode) | **NON FOURNI** — à poser au créneau |
| `screen_b3_reputation_sous_chrome_1080x1920.png` | même méthode | la 1920 — c'est elle qui tranche `M1` | idem | **NON FOURNI** — à poser au créneau |
| `temoin-menu-plus-1080x2400.png (← `menu_plus_1080x2400.png`)` | même méthode | témoin ⑱ : donne l'inset haut du contenu (méthode du r16, `R2`) | idem | **NON FOURNI** — à poser au créneau |

- Protocole : `RECAPTURE-2026-09-22.md` §2 — conteneur RECRÉÉ, horodatage de l'image lu PENDANT le run, empreinte à deux propriétés
  avant/après, **un run = une paire** exportée sous `MAFIA_CAPTURE_*` SEULEMENT (`MAFIA_DEMO_*` posé = faute), et ⛔ **l'arbre du run
  contient `55e674db`** (§2.6 — `main` au 22/09 ne le contient pas). La catégorie de cet écran n'est PAS dans la valeur unique du §1 :
  à ajouter au run, ou à lancer à part avec la même paire.
- **Corps réels comparables** : `reputation/corps-reels/` ; s'ils ne sont pas du compte et de la fenêtre de la planche (`passe-synchrone.py`,
  RECAPTURE §2.5), les VALEURS vont en « non vérifié » — la forme se juge.

## Échelle — OBLIGATOIRE, jamais déduite par le juge

| | px | largeur CSS | facteur |
|---|---|---|---|
| RÉFÉRENCE (`.tel` 300 CSS) | 1080 | 300 | ×3,6 |
| CAPTURE (contenu à `LargeurEcransBrennar6 = 300`) | 1080 | 300 | ×3,6 |
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
