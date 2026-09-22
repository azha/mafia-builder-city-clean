# Dossier du juge visuel — ⑮ Les inspections (MIS Inspection Queue) — r2-⑮ — 2026-09-22

> ⚠️ **Dossier PRÉPARÉ, pas encore instruisable : les captures en jeu manquent.** Préparé par l'atelier (DA) le
> 2026-09-22 pour la maquette #32 (18 districts, tout ou rien), pendant que le client câble D2/D3. Dès que le client
> déclare fini, l'orchestrateur ajoute les captures (copies + sha256 dans `captures-provenance.md`, journal joint) et
> ce dossier devient instruisable tel quel. S'il te manque autre chose, c'est un défaut du dossier : dis-le dans ton
> rapport, section « non vérifié ». Rien ne s'invente.

## L'écran

- **Nom** : Les inspections (MIS Inspection Queue) (⑮, canon `screen_10`) — contrôleur `InspectionScreenController`
- **Ce qu'on vient y faire** : la file d'inspection, la lecture payante, le dépôt de rapport, le flood backlash (front.md « Montre »)
- **Chemin joueur emprunté par la capture** : Plus → LES INSPECTIONS
- **États capturés** : NON FOURNI — aucune capture encore. Attendues (2b du skill) : l'état GARNI (les 18 districts, cadre #32) et
  l'état VIDE (« La police n'a pas encore ouvert ses files — elle les ouvre sur les 18 districts à la fois. », texte ratifié le
  2026-09-22 sur le pied du cadre #32) ; si l'écran porte le dépôt (#33), une capture de l'état « SUR · aucun bâtiment à vous ».
- **Tour précédent** : r1 (2026-09-07) — NON APPROUVÉ, et son premier constat était un **défaut de dossier** : la référence fournie
  était le cadre #31 (⑰, le commissariat), pas #32. Ce tour-ci corrige cela : la référence est #32, rendue au SHA du jour (mesuré :
  le PNG commité avant ce jour était bien #31 à 0,3 % près). Tu ne lis pas le rapport r1.

## Ce qu'on te demande de trancher — les constats SUSPENDUS de cet écran (lus dans `SUSPENSION-back-04-09-2026-09-07.md`)

| id (r1) | écart | section |
|---|---|---|
| `B2` | oui (la chaîne) / non (la forme) — « district district-1 », identifiant brut | A |
| `M1` | oui (le nombre de districts) / non (le résumé) — un seul district affiché | A |
| `M4` | 44,3 % de la hauteur d'écran est un vide absolu entre la dernière rangée et le dock | A |
| `B1` | 11 valeurs en anglais (None, Predominant, Moderate) — si la locale manquait à cette date | B |

- **`police/constats-a-rejuger-⑮.md`** — le périmètre exact du re-jugement (7 tenus · 9 à rejuger · 2 caducs) : à lire AVANT de compter.

## Référence (fait autorité : l'IMAGE)

| fichier (dans ce dossier) | rôle | taille px | facteur | largeur CSS ↔ largeur écran |
|---|---|---|---|---|
| `reference-⑮-1080x2102.png` | rendu du cadre nominal (`ecrans-brennar-6.html` #32 « La police — le registre de dispatch ») | 1080×2102 | ×3,6 | 300 CSS = 1080 px |
| `etats/cadre-31-tableau.png` | #31 « le tableau : ce qu'ils savent » — c'est le NOMINAL de ⑰ (le commissariat), fourni comme frère | 1080×2102 | ×3,6 | idem |
| `etats/cadre-33-signalement.png` | #33 « déposer un signalement » | 1080×2102 | ×3,6 | idem |
| `etats/cadre-34-retour-de-baton.png` | #34 « le retour de bâton » (représailles) | 1080×2102 | ×3,6 | idem |
| `etats/cadre-35-lots-back.png` | #35 « avec les lots back » — le bas du cadre est une NOTE D'ATELIER, pas de l'écran | 1080×2102 | ×3,6 | idem |
| `etats/inspections-canon.png` | canon de la série 2 (état garni) — direction ANTÉRIEURE (verre gravé sombre), voir A5 ci-dessous | 900×1752 | ×3,0 | 300 CSS = 900 px |
| `etats/inspections-vide.png` | canon de la série 2 (état VIDE) | 900×1752 | ×3,0 | 300 CSS = 900 px |

- **Le cadre #32, ce qu'il dessine** : en-tête `BPD · REGISTRE DE DISPATCH · 12H · JOUR 26`, un listing perforé de **18 lignes**
  (une par quartier, noms de fiction : Les Bassins … Pont-Gris) sur cinq colonnes `DISTRICT · N · CHARGE · REGIME · ORIGINES`
  (charge : VIDE / LEGERE ; régime : NOMINAL / ARRIERE ; origines : PROGRAMMEE, INDIC, FORENSIQUE, CASCADE avec un compte en
  blocs ▓), et le pied « 18 DISTRICTS · TOUT OU RIEN : LA POLICE OUVRE SES FILES PARTOUT À LA FOIS ». Capitales sans accents :
  c'est le STYLE du listing (papier à bandes), pas la donnée.
- **Source HTML/CSS** (aide de lecture, ne prime JAMAIS sur l'image) : `/home/erutheone/project/atelier3d-mafia/ecrans-brennar-6.html` (atelier `20d006d` ;
  références rendues à ce même SHA, le 2026-09-22). Les cadres sont les `<div class="cadre">` numérotés **0-based** ; ceux de
  cet écran, avec la ligne où chacun commence :
  - #31 (l.1043) — La police — le tableau : ce qu’ils savent  ⇐ rendu dans `etats/cadre-31-…png`
  - #32 (l.1080) — La police — le registre de dispatch  ⇐ **cadre NOMINAL, rendu en référence**
  - #33 (l.1090) — La police — déposer un signalement  ⇐ rendu dans `etats/cadre-33-…png`
  - #34 (l.1103) — La police — le retour de bâton  ⇐ rendu dans `etats/cadre-34-…png`
  - #35 (l.1115) — La police — avec les lots back  ⇐ rendu dans `etats/cadre-35-…png`
  Le châssis commun (jetons de couleur, primitives) est `/home/erutheone/project/atelier3d-mafia/chassis6.py`. La CSS sert à NOMMER les valeurs voulues
  (hex, px, états) ; si CSS et image divergent, l'image gagne.
- **Rendu** : `Tools/rendre-tel.py <page> <index> <sortie> 3.6` via `Tools/juge-visuel/rendre-references-2026-09-22.py`
  (index apparié à son étiquette avant rendu, machine libre vérifiée) — Chrome sans tête, fenêtre généreuse puis recadrage
  à 300×584 CSS × 3,6 = 1080×2102, assertion de taille en sortie (anti-crop payé deux fois ici).
- **Polices — ce qui a RÉELLEMENT rendu la référence** (`fc-match` sur cette machine, exécuté à la génération de ce dossier
  le 2026-09-22, la même machine et le même jour que les rendus) :

      Georgia            →  "Noto Serif" "Regular"
      DejaVu Sans        →  "DejaVu Sans" "Book"
      Courier New        →  "Liberation Mono" "Regular"
      sans-serif         →  "Noto Sans" "Regular"
      serif              →  "Noto Serif" "Regular"
      Times New Roman    →  "Liberation Serif" "Regular"
      Segoe UI           →  "Noto Sans" "Regular"

  Le client embarque **DejaVu Sans** / **DejaVu Serif** (`DesignTokens.primaryFont` / `hudSerifFont`).
  La série 6 demande `'DejaVu Sans'` (rendue par elle-même : même police des deux côtés sur le sans-sérif) et
  `Georgia,serif` (→ Noto Serif à la référence, DejaVu Serif au client) ⇒ un écart de FAMILLE ou de chasse sur le sérif est
  un **ARBITRAGE** ; la hauteur de capitale, elle, se compare.

## Captures en jeu (Play Mode réel, compte réel, SOUS le chrome du shell)

| fichier (dans ce dossier) | résolution | état | prise le | test |
|---|---|---|---|---|
| — | — | **NON FOURNI** : aucune capture encore — le client câble D2/D3 | — | — |

- À fournir par l'orchestrateur au top du client, selon 2a du skill : `capture-1080x2400.png` (+ 1920 si la ligne GO le couvre),
  COPIES avec sha256 dans `captures-provenance.md`, la ligne d'identité du journal (`[DemoIdentityResolver] régime=env
  identité=…`) jointe, le SHA de l'arbre au run. Tant que cette table est vide, ce dossier ne s'instruit pas.
- Compte photographié : **un run = une paire** (client `55e674db`) — la paire exportée par l'user sous `MAFIA_CAPTURE_*` SEULEMENT
  (`MAFIA_DEMO_*` posé = faute, décision du 2026-09-22 — RECAPTURE §2.4).
  Preuve jointe exigée : la ligne `[IDENTITE-CONNECTEE] planche_les_inspections : /v1/me email=… · CONFORME` du journal du run (la garde
  qui compare le compte réellement connecté à l'annoncé) ; sans elle, les VALEURS de la planche ne se comparent à rien ; la FORME se juge.
- **Corps réels comparables** : `Tools/juge-visuel/police/corps-reels/` est sur `operational_demo` (22/09, pile `03cf564c`) ; il est REPRIS
  sur le compte du run dans la fenêtre du créneau (`passe-synchrone.py`, RECAPTURE §2.5). La provenance de chaque corps dit son compte :
  s'il n'est pas celui de la planche, les VALEURS vont en « non vérifié ».

## Échelle — OBLIGATOIRE, jamais déduite par le juge

| | px de l'image | largeur CSS de référence | facteur |
|---|---|---|---|
| RÉFÉRENCE (cadre de série 6, `.tel` 300 CSS) | 1080 | 300 | **×3,6** |
| CAPTURE (contenu de l'écran, dessiné à `LargeurEcransBrennar6 = 300`) | 1080 | 300 | **×3,6** |
| | | **rapport capture ÷ référence** | **1,00** |

- ⇒ Pour le CONTENU de l'écran, référence et capture sont **à la même échelle** : 1 px CSS = 3,6 px des deux côtés. Un écart
  de taille sur le contenu est un écart RÉEL, pas un artefact d'instrument.
- ⚠️ **Le CHROME (bandeau haut + dock du bas) n'est PAS à cette échelle.** Il est construit par le shell d'après
  `hud-brennar.html` (`.tel` de **392 CSS**) : `AppShell.Px(css) = css × 1280/392` — **×2,755 px par px CSS à 1080 de large**.
  Le cadre de série 6 dessine sa propre barre et son propre dock à 300 CSS : ce sont des ÉVOCATIONS du chrome. ⇒ **Le chrome se
  juge contre le canon du HUD** (`hud-canon-1176.png`, 1176 px = 392 CSS, ×3) **et le contenu contre le cadre de série 6**.
- Hauteurs : référence **584 CSS** (2102 px, 9:17,5) ; capture **666,7 CSS** (2400 px, 9:20). La différence est absorbée par
  la zone de contenu ENTRE le bandeau et le dock : aligne le haut du contenu sur le bas du bandeau, et le bas du contenu sur le
  haut du dock — jamais par le pixel absolu.
- ⚠️ Ce que la normalisation NE couvre PAS : les rapports INTERNES (18 lignes inégales, une colonne qui déborde) sont invariants
  d'échelle et restent des défauts réels.

## Règles de doctrine applicables

- **Portrait, deux résolutions** (1080×2400 cible ; 1920 si fournie) — ce qui n'est pas fourni s'écrit en non-vérifié.
- **Gouttière** : le contenu reste dans le rect libre entre bandeau et dock ; seul le chrome traverse.
- **Contraste** : ≥ 3:1 grands textes, ≥ 4,5:1 petits — sur l'art réel. ⚠️ Le listing de #32 est du texte clair sur papier
  sombre à bandes : mesure sur la bande, pas sur la marge.
- **Langue affichée : français**, via résolveurs nommés. Le r1 a compté onze valeurs anglaises (`None`, `Predominant`,
  `Moderate`) et le sous-titre `district district-1` : si elles sont encore là, c'est un écart de SENS, pas de forme. Les noms de
  quartier sont des NOMS DE FICTION servis par le back (`Les Bassins` …), jamais `Tidewater-1`.
- **Tout ou rien (D2)** : la police ouvre ses files sur les 18 districts à la fois — un écran qui n'en montre QU'UN (le r1)
  n'est pas un état, c'est un écart. L'état vide est nommé (texte ratifié ci-dessus), jamais une liste absente.
- **Espace de mélange** : maquette composée en sRGB par Chrome, client en linéaire — un écart SYSTÉMATIQUE de même signe sur
  plusieurs translucidités est une erreur de modèle, pas N erreurs.
- **Animation : AUCUNE sur un nouvel écran** (ruling user 2026-08-27) — paire T/T+1 s à fournir avec les captures.
- **Chrome non alimenté / phase « — » hors district = ÉTAT VOULU** ; ronds du dock vides = arbitrage user connu ; libellés
  anglais dans la RÉFÉRENCE (`HEAT`, `$ 24 850`) = maquette en retard, jamais un écart d'écran.
- **Cadre de style** (user, 2026-09-06) : sombre, napolitain, mafieux, fin 80s – début 90s — une divergence de DIRECTION est un
  ARBITRAGE ; géométrie, jeton, typographie, espacement restent des écarts d'écran.
- **Une ligne de journal ne se cite que JOINTE.** Une preuve recopiée d'un message n'est pas une preuve lue.

## Écarts ASSUMÉS — à inventorier, à classer ASSUMÉ, à vérifier « rendu proprement »

⚠️ Un écart assumé a un PÉRIMÈTRE : la colonne de droite dit ce qui le ferait SORTIR de l'assumé.

| ce qu'on voit | pourquoi (mesuré, avec sa source) | ce qui le ferait SORTIR de l'assumé |
|---|---|---|
| **Le dépôt (#33) ne débite rien** : « PRIX 50 · annoncé par le serveur — rien n'est débité aujourd'hui » | mesuré côté back, note du cadre #35 (D4) : le prix est annoncé, le portefeuille ne bouge pas | un débit à l'écran sans débit réel, ou l'inverse |
| **Le dépôt peut échouer** (« Le signalement n'a pas été pris. », texte ratifié 2026-09-22) | D3 : la route veut un identifiant entier, la seule identité de bâtiment côté joueur est un uuid — 422 mesuré (note #35) | un échec MUET, ou un succès affiché sans corps 2xx |
| **« SUR · aucun bâtiment à vous »** quand le compte n'a rien à désigner | même forme que « AUCUN SITE À VOUS » (㉝) — état nommé | un bouton DÉPOSER actif sans cible |
| **Le retour de bâton (#34) n'a pas de dessin en jeu** | Q1 (note #35) : `backlash_triggered` est un front, vrai une fois au 8ᵉ dépôt ; l'état persistant n'est lu nulle part (L4) | un écran qui affiche des représailles sans source |
| **Direction A5** : le canon de série 2 (verre gravé sombre) et le cadre #32 (listing perforé, papier à bandes) coexistent | arbitrage relevé au r1 ; la référence de CE tour est #32 | — (à ne pas re-compter) |
| **Le bas du cadre #35** (« Avec les lots : … ») | note d'atelier dessinée dans le cadre, pas un texte joueur | ce texte à l'écran |

## Format du RAPPORT — imposé

⛔ Le juge choisit ses catégories et ses instruments ; il ne choisit pas la forme de son verdict. **Un finding par ligne, dans
UNE table, et rien de compté ailleurs** :

| id | gravité | critère | dépend des données | écart | mesure | ce que je n'ai pas pu vérifier |
|---|---|---|---|---|---|---|
| `F1` | `BLOQUANT` \| `MAJEUR` \| `MINEUR` | `DÉJÀ APPLIQUÉ` \| **`NOUVEAU`** | oui/non | <l'écart> | <les nombres> | <ou vide> |

- gravité : liste fermée, trois valeurs (ASSUMÉ et ARBITRAGE vont dans des tables À PART, jamais comptés).
- critère : `NOUVEAU` dès que l'instrument ou la grandeur n'existait pas au tour précédent.
- Sépare ce qui dépend des DONNÉES (18 lignes, comptes, origines du compte de capture — daté) de ce qui dépend de la FORME.
- Le compte se prend dans la table, jamais dans la synthèse.

## Ce qui N'EST PAS fourni — et ne doit pas être cherché

- le code du client (`Assets/Scripts`) et ses tests — tu constates ce que tu VOIS ;
- les notes d'implémentation du chantier (D2/D3) ;
- **le rapport du juge r1** (`Tools/juge-visuel/police/r1-⑮-2026-09-07/`) : il existe à côté, il ne t'est pas fourni ;
- toute capture « avant » ;
- pour l'instant : **toute capture** (voir la table) — ce dossier attend le top du client.

Préparé sur le client `d0824c8c` (branche `da/2026-09-22`), atelier `20d006d`.
