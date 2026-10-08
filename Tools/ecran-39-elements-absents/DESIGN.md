# ㊴ Le dossier — les éléments ABSENTS de la maquette `.dos6` (CLIENT-2) — DESIGN v5 (08/10), à revoir ⊥

**Commande** (f2, 08/10) : construire sur ㊴ ce que la maquette montre et que le client ne construit pas — compteurs, pistes côte à côte,
acteurs, pied, bascule — d'après les cadres de ㊴, en vérifiant ce que le back sert avant de dessiner une valeur. Classe A. **Aucun code.**
v5 AMENDE la v4 (historique : `git log -- Tools/ecran-39-elements-absents/DESIGN.md`) et lève la revue ⊥ NEUVE de la v4
(`REVUE-v4.md` : NOT_APPROVED, B1-B2, M1-M4, m1-m6). Décision de f2 (08/10) sur B2 : indexer les côtés de `FiletsPoses.Cote` comme
`Contour`, avec une garde. Chaque mesure citée ci-dessous a été REFAITE le 08/10 sur cette branche (sorties dans §7).

## 1. Sources épinglées
- Maquette : `atelier3d-mafia/ecrans-brennar-6.html` @**a70a8c5**, md5 **10ff67f4**, **9** `.dos6`. L'atelier a avancé (HEAD 4bd3ea2, md5
  **74336445**) : les 9 cadres de ㊴ y sont **identiques octet pour octet** à a70a8c5 et aucun des 3 blocs `<style>` qui changent
  (`.hrz6`, `.mar6`, `.rgl6`) n'est celui de `.dos6` — la source reste a70a8c5, re-vérifiée. Indices de cadres
  0-based (convention du dépôt) : 131 132 133 134 135 136 143 150 151. Mesure par `html.parser` qui IGNORE les balises vides (`br`…) —
  sans ça, 135 perdait son `.pann` (faute de la v1-v3.1, B4).
- Back : `mafia-clean-city` @**accc9605** (0 fichier changé sous `operational/forensic` et `operational/internal_affairs` depuis a0a7672b).

## 2. Ce que dessine la maquette (mesuré @a70a8c5)
Enfants directs de chaque `.dos6` :
| cadre | rôle | enfants | compteurs (`.fen` ×3) |
|---|---|---|---|
| 131 | pistes (ancien) | cerne enseigne compteurs elast pann pied | 01/3 pistes chaudes · 00 franchies · 01/4 qui tiennent |
| 132 | pistes, dernier cran (`.pi.bout`) | idem | 03/3 · 02 franchies · 01/4 |
| 133 | acteurs (ancien) | cerne enseigne compteurs elast pann | 04 acteurs connus · 01 qui ont peur · 01 partis |
| 134 | acteurs, « parti » | idem | idem |
| **135** | **état vide** | cerne enseigne compteurs **elast pann** (le `.pann` est FRÈRE de `.elast` ; `.elast` ne contient que `.rien`) | 00/3 pistes chaudes · 00 franchies · 00 acteurs connus — **aucune `.fen.ici` ni `.fen.porte`** |
| 136 | chantier (L1-L4) | cerne enseigne compteurs pann×4 | hors périmètre |
| 143 | vocabulaire des 12 crans | cerne enseigne compteurs elast pann | référence du juge, hors périmètre |
| **150** | **vue pistes (fait foi)** | cerne enseigne compteurs elast pann pied | `fen ici` 01/1 pistes chaudes · `fen` 00 franchies · `fen porte` « › » 01/4 acteurs qui tiennent |
| **151** | **vue acteurs (fait foi)** | cerne enseigne compteurs elast pann pied | `fen ici` 04 acteurs connus · `fen` 01 qui ont peur · `fen porte` « ‹ » 01/1 pistes chaudes |

- **150** : `.pistes` = `.pi.eteinte` (la comptabilité : crans au liseré, mot « — », sous le mot « pas encore sur la table ») · `.pi`
  (ce qui sort des cuves : « ça se voit », `visible`) · `.pi.eteinte` (le train de vie d’un lieutenant, idem) ; sous les pistes
  `.notepi` « Les livres et le train de vie : personne ne regarde par là. Pour l’instant. » (PROPOSÉ) ; `.pann` « pourquoi trois
  colonnes » (…« Pour voir qui parle, la fenêtre des acteurs, en haut à droite. ») ; pied `.cta6.eteint` « ACHETER DU RENSEIGNEMENT » +
  `.note6` « sur un acteur, pas sur une piste — éteint : le prix n’est pas servi ».
- **151** : 4 `.ac` (Avocat ia.actor.4f21 « il tient » · Greffier 9c07 « il a peur » · Greffier 1b44 « injoignable » · `.ac.parti`
  Avocat 7e90 « parti »), un `.rg` « renseignement » DERNIER ENFANT de chaque `.ac` sauf `.ac.parti` (3) ; `.pann` (PROPOSÉ, identique
  à 133) « ceux qui ne sont pas sur la liste » / « D’autres parlent, et vous ne les voyez pas » / « un inspecteur du port, un courtier,
  le greffier d’un juge : ils se paient comme les autres, mais personne ne vous a encore donné leur nom. » ; pied = `.note6` seule
  « le renseignement s’achète acteur par acteur — éteint tant que le prix n’est pas servi : on n’achète pas sans savoir combien ».
- **135** : `.elast` > `.rien` « Rien à votre nom. / Personne n’a encore eu de raison de vous ouvrir un dossier. » ; `.pann` « ce n’est
  pas une bonne nouvelle » / « C’est juste une nouvelle » / « les trois pistes montent avec ce que vous faites. À zéro, elles ne disent
  pas que vous êtes prudent : elles disent que vous n’avez pas encore commencé. » ; pas de pied.
- **CSS** (bloc `<style>` qui gouverne 150-151, et les blocs de 131-136 : 0 occurrence de `#6b737d` dans les `.dos6`, encre éteinte
  `#7a838d` partout) : `.cta6.eteint{border-color:#2a3648;color:#7a838d;background:#111823}` · `.pi.eteinte i{color:#7a838d}` ·
  `.notepi{font:italic 7px/1.4 'DejaVu Serif';color:#8a979c;text-align:center}` (ni bord ni fond) · `.fen.ici{box-shadow:inset 0 -2px
  0 #f2c96b}` (ni bord ni fond propre) · `.fen.porte{border-color:#b08d3e;background:#16191b}` + `b{color:#f2c96b}` + `i` (glyphe absolu
  à droite) · `.ac .rg{border:1px solid #2a3648;color:#7a838d;background:#0a0e16}`. Aucun `onclick`/`href`/`role`/`button` dans les 9.

## 3. Ce que sert le back (@accc9605)
- `GET /v1/me/forensic` : 3 buckets à domaine fermé ; **1 seul vivant** (`effluent_visibility_bucket`) ; `audit_risk_bucket` et
  `lifestyle_alarm_bucket` CONSTANTS (`forensic.controller.ts:11-19`), **aucun champ ne le dit**.
- `GET /v1/me/internal-affairs/actors` : `ActorSummary { actorRef, actorType: lawyer|clerk, status: steady|nervous|unavailable|gone }`.
- `POST …/actors/:ref/intel` : `costCents` n'existe que dans le RÉSULTAT ; **aucune route ne sert le prix avant l'achat** (manque L3).

## 4. Règles (f2 08/10 ; le dessin 150-151-135 fait foi)
- **R1 — deux vues et la bascule.** Vue pistes (150) par défaut, vue acteurs (151). La bascule est la **3ᵉ fenêtre** (`.fen.porte`,
  « › » vers les acteurs, « ‹ » vers les pistes) ; la 1ʳᵉ (`.fen.ici`) dit la vue courante. Le retour SYSTÈME reste celui du shell
  (§C.14 : il sort de ㊴). Pas d'autre navigation.
- **R2 — l'achat.** Vue pistes : pied `.cta6.eteint` TOUJOURS (non cliquable) + note de 150. Vue acteurs : un `.rg` éteint (non
  cliquable) en dernier enfant de chaque ligne non `gone`, aucun sur `gone` ; pied `.note6` de 151. Allumage (`.rg` + `POST …/intel`) :
  quand le back sert le prix avant l'achat (L3, transmis à BACK-1) et que l'atelier dessine l'état allumé.
- **R3 — pistes constantes.** `audit_risk` et `lifestyle_alarm` en `.pi.eteinte` : 4 crans à la teinte vide, mot « — » et titre à
  l'encre `#7a838d`, « pas encore sur la table » à la place de la clé ; `.notepi` sous les pistes. L'effluent en `.pi` normale (crans,
  mot, clé brute ; `.pi.bout` au dernier cran). Liste client en UN site (`PistesConstantes`) faute de champ servi ⇒ **TD-881** (sortie :
  le back sert la vivacité ; dette back transmise à BACK-1).
- **R4 — compteurs (M1 levé : 3 fenêtres par vue).** Vue pistes (150) : `.fen.ici` « pistes chaudes » = pistes VIVANTES hors de leur
  premier cran / pistes vivantes (« 01/1 ») · `.fen` « franchies » = pistes vivantes au dernier cran · `.fen.porte` « acteurs qui
  tiennent » = `steady` / acteurs servis (« 01/4 »). Vue acteurs (151) : `.fen.ici` « acteurs connus » = tous les acteurs servis,
  `gone` compris (151 : 04 pour 4 lignes dont `.ac.parti`) · `.fen` « qui ont peur » = `nervous` · `.fen.porte` « pistes chaudes » = le
  MÊME compte que la fenêtre ici de la vue pistes. **Pas de compteur « partis » en 151** (il n'existe que dans 133/134, anciens). Route
  en erreur ⇒ « — » à la place du nombre, **PROPOSÉ** (m6 : la maquette ne dessine aucune erreur ; extrapolation, à classer au juge).
- **R5 — l'état vide (135)** ⇔ toutes les pistes vivantes au premier cran ET roster servi vide. Il **n'a PAS de bascule** (f2 : la
  maquette n'en dessine pas). Trois `.fen` nues — « 00/1 pistes chaudes », « 00 franchies », « 00 acteurs connus » —, `.elast` > `.rien`,
  puis `.pann` de 135 en FRÈRE de `.elast`, pas de pied. **Déviation étiquetée (m1)** : 135 écrit « 00/**3** pistes chaudes » ; ici le
  dénominateur est celui de R4 (pistes VIVANTES : 1 aujourd'hui) parce que 2 des 3 pistes sont constantes et affichées éteintes (f2,
  Q3) — le « 3 » de la maquette compterait des pistes éteintes. Roster vide avec une piste vivante chaude ⇒ vue pistes (150), sa porte
  vers une vue acteurs qui affiche « 00 acteurs connus » et aucune ligne.
- **R6 — mots** (tous par `Libelle`, clés neuves avec le texte de la maquette ; les textes PROPOSÉS sont re-mesurés s'ils changent) :
  `steady` « il tient » · `nervous` « il a peur » · `unavailable` « injoignable » · `gone` « parti » (+ `.ac.parti`) ; `lawyer` « Avocat »
  · `clerk` « Greffier » ; silhouette `.sil` teintée par l'état. Panneaux : pistes = 150, acteurs = 151 (= 133 réécrit, PROPOSÉ ; la
  phrase « Les trois autres existent sans être visibles. » a disparu), vide = 135 — **trois clés de panneau**, une par vue.

## 5. Recettes de filets — MESURÉ, pas supposé (lève B1, B2, M2, M3, M4, m2, m4)
**Fait établi (B1).** `mesurer-filets.cjs` lit les styles CALCULÉS de tous les éléments ; le générateur nomme une recette par la
classList COMPLÈTE de l'élément (`generer-filets.py:110`, `pascal(cls)`). Donc `.fen.ici`, `.fen.porte`, `.pi.eteinte`, `.cta6.eteint`
et `.rg` — qui ont tous un bord 1 px — sont des recettes GÉNÉRÉES, que l'élément ait ou non une règle de bord propre. Mesuré le 08/10
(sortie §7) : 150 = 12 éléments bordés, 151 = 15 ; `mesure-filets.json` n'a que 0-142, donc 150-151 absents et rien ne le dit.

**Étape 0 (préalable au code d'écran, un commit à elle).**
1. `ecrans-index.json` : ㊴ `cadres` = [131…136, 150, 151].
2. Ajouter 150-151 à `mesure-filets.json` (`mesurer-filets.cjs '[…]'`, Chromium) ; les 6 cadres déjà mesurés sont re-mesurés identiques.
3. **Le contrôle qui existe (M2).** `verifier-indices-cadres.py` n'est pas sur cette branche et vise `Tools/juge-visuel/INDEX.md` : on
   ne s'y appuie pas. À la place, `generer-filets.py` REFUSE (exit 1, message nommant le cadre) tout cadre de l'index absent de
   `mesure-filets.json` — aujourd'hui `par_cadre.get(c, [])` l'avale en silence, c'est ce qui rendrait l'étape 0 muette. Contrôle
   obligatoire : retirer 151 de la mesure, lancer, lire `rc=1` ; le remettre, lire `rc=0`. Puis `generer-filets.py` et `--verifier`.
4. `verifier-design.py` et `inventaire.py` lisent aussi l'index : les relancer, consigner leur écart avant/après.
Résultat ATTENDU, calculé le 08/10 sans rien écrire (générateur appelé en mémoire sur l'index et la mesure amendés) : ㊴ passe de 11
à **16** recettes — neuves : **`Cta6Eteint` `FenIci` `FenPorte` `PiEteinte` `Rg`** — et le total de 363 à 368. Le compte du catalogue
est RE-LU après la génération réelle ; si le réel diffère, c'est le réel qui fait foi.

**`FenIci` générée = le BORD seul** (1 px `#2a3648`, 4 côtés). Son OR n'est pas un bord : `.fen.ici{box-shadow:inset 0 -2px 0 #f2c96b}`
(mesuré §7 : `rgb(242,201,107) 0 -2px 0 0 inset`, ni flou ni étalement), soit 2 px pleins À L'INTÉRIEUR du bord, collés en bas.

**Prérequis de CODE — étape 1 (B2, décision f2).** `FiletsPoses.Cote` nomme l'`Image` d'un côté par le côté seul (`ImageDe(nom,…)`) :
deux specs sur `Bas` écrasent la même image, le 2ᵉ gagne, et `Fen` + or en bas perd son bord bas `#2a3648`. Correction, dans
`Maj()` : un côté n'est suffixé que s'il a DÉJÀ été posé par une spec précédente de la même recette (premier = `Bas`, second =
`Bas<i>`, `i` = rang de la spec, comme `Contour` suffixe `i`). Écart assumé à la lettre de la décision (« comme `Contour` » suffixe
toujours quand `recette.Length > 1`) : les noms de nœuds restent ceux d'aujourd'hui pour toute recette SANS collision — des gardes
existantes les lisent (`Enseigne/Filets/Bas`, `FiliereOrdreEtEcartPlayModeTests.cs:161` ; `Haut|Droite|Bas|Gauche`,
`DecorDeSceneFiletsPlayModeTests.cs:227`) et la décision n'a pas à les casser. Le `double` (`Interieur`) suit le nom suffixé.
Même passage : l'or est posé avec `inset: 1f` (le bord est 1 px CSS). **Garde (EFFET)** dans `DecorDeSceneFiletsPlayModeTests` : sur le
banc, `Fen` + `SpecFilet(Bas, 2f, …, inset: 1f)`, rendre et compter sur la colonne centrale, du bas vers le haut : `PxTrait(1)`
rangées `#2a3648`, PUIS `PxTrait(2)` rangées or, 0 rangée or en haut ; contrôle : l'ancien code (suffixe retiré) doit rougir sur « la
rangée `#2a3648` est absente ».

**Recette composée `FenIciOr` (M3, M4, m2).** Hôte : une classe NEUVE `DecorsDeScene.FiletsComposes` dans `DecorsDeScene.cs`, HORS du
fichier généré (`Filets` n'est pas `partial`, `F(…)` y est privé : on n'y ajoute rien). `FenIciOr` =
`Filets.Forensic.FenIci` suivie de `new SpecFilet(Cotes.Bas, 2f, StyleFilet.Plein, Teinte.Jeton("hudMoneyGold", t => t.hudMoneyGold,
1f), couleurCss: "f2c96b", inset: 1f)` (`#f2c96b` EST le jeton `hudMoneyGold`, TD-612 — jamais un littéral ; la chaîne CSS sans `#`).
Mécanisme : `Filets.Poser` (surimpression étirée, `ignoreLayout`, au-dessus du fond du bloc). L'analogie de la v4 avec `Lisere` tombe
(M4) : `Lisere` est rendu par `DecorDeScene.PoserCerne`, pas par `Filets.Poser`. `FiletsComposes` est invisible à D6b
(`RecettesDe` ne réfléchit que `Filets`) : **garde D6c** — pour chaque champ de `FiletsComposes`, ses N premières specs sont, une à une,
celles de la recette GÉNÉRÉE qu'il nomme (un re-mesure qui change `FenIci` change `FenIciOr` ou rougit) ; et D6b compte une référence
à `FiletsComposes.FenIciOr` comme référence à `FenIci` (table du test `{FenIciOr → FenIci}`).

**Ce qui n'est PAS une recette** : `.notepi` (aucun bord, fond ni ombre : un texte TMP posé par l'écran). `.pi.eteinte` EST générée
(`PiEteinte`, bord seul) ; ses crans vides et ses encres sont posés par l'écran.

**`RecettesEnAttente[㊴]`** (`DecorDeScenePosePlayModeTests.cs:104`, aujourd'hui `Ac AcParti Cta6 Elast Fen Mano PiBout`, 7) : à
l'étape 0, les 5 neuves y entrent (12) avec leur raison (D6b rougit sinon) ; à la pose, tout ce que l'écran construit en sort
(`Ac AcParti Elast Fen PiBout` + les 5 neuves). **Restent**, avec raison : `Mano` (cadran non branché) et `Cta6` (le pied « acheter »
allumé des cadres 131-132, dessin ANCIEN ; le pied qui fait foi est `Cta6Eteint`). Le test D6b exige que toute sortie soit effective.

## 6. Gardes prévues (EFFET d'abord : rendre et compter des pixels)
- **Structure** : 3 `.fen` dans l'ordre ; vue pistes = 3 `.pi` côte à côte (ordre, 4 crans chacune) ; vue acteurs = une ligne par acteur
  servi, `.rg` dernier enfant sauf `gone` ; 135 : `.pann` frère de `.elast`, 0 porte, 0 pied.
- **Pixels (m3 : épaisseurs et positions PINCÉES)** : `FenIciOr` — `PxTrait(2)` rangées or au bas de la 1ʳᵉ fenêtre, directement AU-DESSUS
  de `PxTrait(1)` rangées `#2a3648`, 0 en haut (contrôle : `FenIci` seule n'a aucune rangée or) ; la porte : `PxTrait(1)` rangées de
  bord `#b08d3e` sur les 4 côtés, COMPTÉES ; `Cta6Eteint` et `Rg` à l'encre `#7a838d` ±6/255 sur leur fond (contraste mesuré ≥ 4,5:1
  sinon consigné) ; 2 pistes éteintes = 0 cran coloré, l'effluent ≥ 1. **m5** : `.notepi` — son texte rendu a des pixels à `#8a979c`
  ±6/255, centré à ±2 px du milieu de sa colonne ; les mots « — » et « pas encore sur la table » de `.pi.eteinte` — pixels à `#7a838d`
  non nuls dans leur boîte (une garde sur les PARAMÈTRES ne tient pas lieu de garde sur l'EFFET).
- **Geste** : clic de PRODUCTION sur la porte ⇒ l'autre vue, `.fen.ici` suit ; clic sur `Cta6Eteint` ou un `.rg` ⇒ AUCUNE requête
  (compteur de requêtes = 0) ; 135 : aucun geste.
- **Données** : compteurs recalculés indépendamment sur des corps FABRIQUÉS (vide 135 ; chargé 150/151 ; roster vide + piste chaude ;
  route en erreur ⇒ « — ») ; dénominateur = pistes vivantes ; `PistesConstantes` lue en UN site (garde de source) ; TD-881 au registre.
- **Décor** : D2/D6b/D6c (`RecettesEnAttente[㊴]` rétrécit, jamais de nom périmé). **Ordre des commits** : étape 0 (outil + données +
  catalogue régénéré) → étape 1 (`FiletsPoses` + sa garde) → `FiletsComposes` + D6c → écran.

## 7. Preuves (08/10, cette branche)
- Cadres de ㊴ a70a8c5 contre HEAD atelier 4bd3ea2 : `131…136 143 150 151` identiques ; blocs `<style>` changés : 57 (`.hrz6`), 65
  (`.mar6`), 66 (`.rgl6`), aucun `.dos6`.
- `mesurer-filets.cjs '[131…136,150,151]'` : 131-136 identiques à `mesure-filets.json` ; 150 → 12 éléments, 151 → 15 (listés : `mano cerne
  enseigne fen.ici fen fen.porte elast pi.eteinte pi pi.eteinte pann cta6.eteint` ; `… ac rg ac rg ac rg ac.parti pann`).
- Ombres internes sur les 128 cadres indexés + 150-151 : seule `fen.ici` porte `inset 0 -2px 0 0 #f2c96b` ; aucune ombre interne
  n'est un bord (`cerne` 1 px est posé par `PoserCerne`).
- Générateur appelé en mémoire avec 150-151 ajoutés : 363 → 368 recettes ; ㊴ = `Ac AcParti Cerne Cta6 Cta6Eteint Elast Enseigne Fen FenIci
  FenPorte Mano Pann Pi PiBout PiEteinte Rg` (16).
