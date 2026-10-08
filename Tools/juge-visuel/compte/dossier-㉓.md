# Dossier du juge visuel — ㉓ La vitrine (`ShopScreenController`, dossier `compte`) — après le tour « r-groupe » du 07/10 — 2026-10-08

> Écrit par CLIENT-1 (exécutant) le 2026-10-08, au fil des correctifs du rapport
> `r-groupe-2026-10-07/rapport.md` (NON APPROUVÉ : A1-A5, B1-B3, C1-C2). Tout ce qui ne peut pas
> être rempli se dit « non fourni » avec la raison — jamais supprimé. Les décisions citées sont
> celles de f2 (08/10) ; le barème est le ruling user du 07/10 (A/B corrigés fidèlement, C consignés).

## L'écran

- **Nom** : La vitrine (㉓, canon `screen_c2` dans `front.md` ; dossier `compte`) — contrôleur
  `Assets/Scripts/Economy/Shop/ShopScreenController.cs`, dessins `VitrinePictogrammes.cs`.
- **Ce qu'on vient y faire** : acheter des extras avec ses Marks ; voir les liasses de Marks (derrière
  la vitre : le magasin n'est pas branché) ; voir ce qu'on possède déjà.
- **Chemin joueur pour y arriver** : Plus → LA VITRINE.
- **Routes du domaine** : `GET /v1/iap/catalogue` · `GET /v1/me/iap/balance` ·
  `GET /v1/me/iap/entitlements` · `POST /v1/me/iap/items/purchase` (toutes sous `JwtAuthGuard`).
- **États** : le nominal (extras) · la caisse (liasses + soutien) · ACQUIS (un article possédé) ·
  hors d'atteinte (prix > solde) · zéro Mark (la note terminale dans la bande du bas) · vide /
  « n'a pas répondu ».

## Référence (fait autorité : l'IMAGE)

| fichier (dans ce dossier) | rôle | taille px | facteur | largeur CSS ↔ largeur écran |
|---|---|---|---|---|
| `reference-㉓-1080x2102.png` | cadre **98** (0-based) « La vitrine — les extras » — le NOMINAL, **re-rendu en Marks** (atelier `7159e54`) le 2026-10-08 | 1080×2102 | ×3,6 | 300 CSS = 1080 px |
| `reference-㉓-99-caisse-1080x2102.png` | cadre **99** « La caisse — les Marks » (la planche haute du juge du 07/10 la comparait au cadre 99 : elle est due) | 1080×2102 | ×3,6 | idem |
| `reference-㉓-100-zero-mark-1080x2102.png` | cadre **100** « Zéro Mark — l'état terminal » (ACQUIS + hors d'atteinte) | 1080×2102 | ×3,6 | idem |

- **Source HTML/CSS** (aide de lecture, ne prime jamais sur l'image) :
  `~/project/atelier3d-mafia/ecrans-brennar-6.html` @ `7159e54`, bloc `.vitr6` (l. 5292-5355),
  cadres `<div class="cadre">` **0-based** 98, 99, 100. Rendu : `Tools/rendre-tel.py <page> <index> <sortie> 3.6`
  (« ✅ non rogné », 1080×2102 asserté, exécuté le 2026-10-08 sur les trois).
- ⚠️ **La maquette a changé de monnaie** : « jetons » → « Marks » (le back n'a qu'UNE monnaie ;
  décision de f2 du 08/10). Les trois références ci-dessus sont les cadres régénérés ; le « jeton »
  n'y est plus que l'OBJET dessiné (la pièce au T). L'écart A5 du 07/10 est donc TRANCHÉ côté
  maquette, pas côté client.
- **Polices** : la série 6 demande `'DejaVu Sans'` et `'DejaVu Serif'` des deux côtés — mêmes
  familles que le client (à vérifier par `fc-match` à la prochaine génération de dossier ; **non
  fourni** ici : pas exécuté).

## Ce qui a été corrigé (écriture du 2026-10-08, typecheck 17/17, PAS JOUÉ)

| # | classe | correctif | où |
|---|---|---|---|
| A1 | grille 2×2 | `.planche` : deux cartes par rangée, gouttière 8 CSS px, hauteur de rangée commune ; le soutien sur une `.planche.large` | `Planche()` |
| A2 | matière de la carte | `.art` : plaque arrondie (rayon 4) teintée `#1e171d` (médiane du dégradé #221a20→#1a141a), bord 1 px `#3a2530` | `Article()` |
| A3 | pictogramme | un dessin PAR article, recopié du SVG (viewBox 84×54 → 64×41) : pile de pièces par rang (1/3/5/8 épaisseurs), plaque aux trois couleurs, tableau au sodium, clé numérotée, enveloppe scellée | `VitrinePictogrammes` |
| A4 | bande du bas | `.voix` : plaque `#12100e` (jeton nightSocle), filet haut `#3a2e24` — **sans la voix** ni cadre rond du portrait (décision de f2, 08/10 (c)) | `PiedDEcran.BandeDeVoix`, `ConstruireLaBande()` |
| A5 | vocabulaire | une seule monnaie, les Marks, partout (clés de la table 69) ; la maquette re-rendue en Marks | — |
| B1 | intitulé d'étagère | « Les extras — payés en Marks » / « Les Marks — payés au magasin » (h3, 7,5 px, lettré, capitales) | `Etagere()` |
| B2 | médaillon de bonus | `.bonus` : plaque OR collée dans l'angle haut-droit, encre sombre, texte plié dans 60 % de la carte, hors mise en page | `Medaillon()` |
| B3 | comptoir | `.compt` : plaque bronze (#2a231f→#1b1613), filet de laiton 2 px, enseigne serif OR à gauche, solde en pastille (socle, bord laiton, jeton, montant crème) à droite, même ligne | `ConstruireLeComptoir()` |

- **Ordre des étagères** : les extras ouvrent l'écran (cadre nominal 98), la caisse suit (99). Le
  catalogue est servi liasses d'abord ; l'écran le RANGE.
- **Le geste d'achat** : la maquette ne dessine aucun bouton — la carte est l'article, l'étiquette
  de prix dit l'état (`.etiq` / `.etiq.hors` + « hors d'atteinte » / `.acquis`). Une carte à portée se
  prend d'un **APPUI LONG** sur la carte (`LongPressButton`, 1 000 ms) — décision de f2 (08/10 (a)),
  ci-dessous. Un glissement de la vitre lâche l'appui en cours.
- **i18n** : deux clés neuves dérivées (`boutique.bloc.les_extras_payes_en_marks`,
  `boutique.bloc.les_marks_payes_au_magasin`), inscrites en dette datée
  (`ZeroRepliDesLocatairesPlayModeTests.DetteDatee`), table demandée au back via f2.

## Décisions de f2 (08/10, en réponse au message FIN DE TÂCHE de ㉓)

| # | question | décision de f2 | appliqué |
|---|---|---|---|
| (a) | l'ACHAT SANS CONFIRMATION : la maquette ne dessine aucune confirmation, un appui dépense le don de bienvenue d'un coup | **pas d'achat en un seul appui** : le geste maison des actions irréversibles, l'**APPUI LONG** (`LongPressButton`, `T.ui.destructive_longpress_ms` = 1 000 ms, avec son arc). L'atelier dessinera l'arc sur la carte plus tard | la carte à portée porte `LongPressButton` (plus de `Button`) ; un appui court n'achète rien ; la vitre qui glisse lâche l'appui (un glissement lent de plus d'une seconde aurait acheté l'article sous le doigt). **L'arc n'est pas posé** : aucun composant d'arc n'existe dans le dépôt, et l'atelier le dessine — la carte ne montre donc AUCUN retour pendant l'appui |
| (b) | les extras d'abord (cadre nominal 98) | OK, c'est le cadre nominal | inchangé |
| (c) | la bande `.voix` avec le cadre rond du portrait VIDE | **retirer le cadre rond** tant que TD-823 n'est pas servi (un cercle vide se lit comme un défaut) ; la bande garde texte et filet | `ConstruireLaBande()` ne pose plus « Portrait » |
| (d) | « donne 100 Marks » au lieu de « + 100 Marks » | C consigné, OK | C2 ci-dessous |

| (e) | l'ALTERNATIVE PAR SAISIE : le canon de `LongPressButton` l'exige, la maquette n'en dessine aucune | **le canon fait foi** : la poser, la plus discrète possible (style de la carte, sans nouvel élément visible si le canon le permet) ; écrire ici que c'est le canon qui l'impose et que l'atelier la dessinera | voir ci-dessous |

### (e) L'alternative par saisie — c'est le CANON qui l'impose ; l'atelier la dessinera

- **Source** : `docs/tech/08_ui_screens/global_conventions_core.md:131-137` (dépôt back) — confirmation par
  **typed-confirm** (mot-clé dans la langue de l'interface) **ou** appui long de 1 000 ms, et pour l'appui long :
  « Accessible : alternative typed-confirm **obligatoire** (F2 — utilisateurs sans accès haptique) ». La maquette (cadres
  98-100) n'en dessine aucune : **ce n'est pas une décision de design, c'est une exigence du canon**, et sa forme est
  provisoire jusqu'au dessin de l'atelier.
- **Forme posée (la plus discrète)** : **rien de visible au repos**. Un appui COURT sur une carte à portée — qui n'achète
  jamais (« un tap simple ne confirme jamais ») — ouvre DANS la carte une étiquette de saisie au style de l'étiquette de
  prix (plaque papier `#efe6d4`, rayon 2, bord crème fin ; invite italique éteinte « tapez ACHETER », centrée). Le mot
  validé (casse et blancs ignorés) demande l'achat par le MÊME chemin que l'appui long ; tout autre mot n'achète rien.
  Un second appui court referme la saisie ; une seule est ouverte à la fois.
- **Code** : `LongPressButton.OnShortTap` (neuf, additif : un appui relâché avant le seuil, ni sorti ni lâché par la
  vitre) ; `ShopScreenController.OuvrirLaSaisie`, `ConfirmerParSaisie`, `MotCleDAchat`.
- **Mots neufs, non servis** : `boutique.bloc.acheter` (« ACHETER », le mot-clé) et `boutique.bloc.tapez_mot`
  (« tapez {mot} ») — à faire servir par une table de l'atelier.
- **Garde** : `Vitrine` V2 (source : aucun `Button`, la saisie s'ouvre par `OnShortTap`) et V3 (effet : absente au
  repos, ouverte par l'appui court, papier, `CanvasRenderer`, un mauvais mot et le vide n'achètent rien, le mot-clé
  achète une fois).

## Écarts CONSIGNÉS (C — ni correctif ni tour de juge, ruling user 07/10)

| # | écart | pourquoi consigné |
|---|---|---|
| C1 | « DERRIÈRE LA VITRE / Bientôt » là où le cadre 99 écrit « PRIX DU MAGASIN » | le magasin n'est pas branché (`NullIapReceiptVerifier`) ; le juge du 07/10 : « cohérent avec l'état » ; la forme `.etiq.magasin` est reprise, les mots restent ceux servis |
| C2 | « donne 100 Marks » là où le cadre écrit « + 100 Marks » | la clé `boutique.bloc.donne_n_marks` est SERVIE : la valeur servie s'affiche ; la forme `.accorde` (or, gras, 7 px) est reprise |
| C3 | le montant de l'étiquette dit « 50 Marks » là où le cadre met « 50 » + le jeton | gabarit ICU servi (`n_marks`), pas de clé pour le seul nombre |
| C4 | pas de sous-titre anglais `.en` sous le nom | aucune source servie ; le juge du 07/10 l'a compté POUR le client |
| C5 | dégradés (plaque de carte, comptoir OK ; pièces : disque radial or→or sombre au lieu du dégradé `#lai` ; vitre OK) et les deux reflets `.reflet` de la vitre | nuances de rendu |
| C6 | « MARKS » en petites capitales grises à côté du nombre dans la pastille du solde | un seul texte servi « 50 Marks », 13 px crème |
| C7 | la pastille du solde reste crème à 0 Mark (le client la peignait braise) | le cadre 100 la montre crème : suivi |

## Ce que ce dossier ne fournit pas

1. **La voix du lieutenant** (Wexler, portrait, « derrière le comptoir », les trois répliques des
   cadres 98-100) : **non servie** — TD-823 (registre back). Décision de f2 du 08/10 : « bande basse
   sans voix ». La bande et son filet sont posés, PAS le cadre rond du portrait (f2, 08/10 (c)) ; la colonne de la voix est
   VIDE, rien n'est inventé à sa place. Le juge verra la bande SANS personnage : c'est l'état attendu.
2. **Aucune capture en jeu** : rien n'a été joué (porte Unity libre, aucun créneau sans signal de f2).
   Les planches `E07_Boutique_*` du harnais `PlanchesParEcran` sont à reprendre au créneau groupé.
3. **Le geste d'achat réel** (appui long → `POST /v1/me/iap/items/purchase` → relecture) : hors
   réseau, non vérifié. La garde `Vitrine` V3 pilote l'appui (court : 0 achat ; lâché par la vitre ;
   long abouti : 1 achat demandé ; saisie : le mot-clé seul achète), pas la route.
4. **Les polices réellement rendues** (`fc-match`) : non exécuté ce tour.

## Captures en jeu attendues (au créneau groupé, sur signal de f2)

| fichier | commande | rôle |
|---|---|---|
| `E07_Boutique_1080x2400.png`, `_1080x1920`, `_bas_*` | `MAFIA_CI_CATEGORIES=ClichePlanchesParEcran` (`MAFIA_PLANCHES_SORTIE`) | planche haute (extras, cadre 98) et `_bas` (caisse, cadre 99) |
| garde `Vitrine` | `MAFIA_CI_CATEGORIES=Vitrine` | V1 dessins purs · V2 source · V3 effet sur catalogue fabriqué |
