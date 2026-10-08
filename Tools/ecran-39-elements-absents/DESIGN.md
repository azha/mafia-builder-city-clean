# ㊴ Le dossier — les éléments ABSENTS de la maquette `.dos6` (CLIENT-2) — DESIGN v4 (08/10), à revoir ⊥

**Commande** (f2, 08/10) : construire sur ㊴ ce que la maquette montre et que le client ne construit pas — compteurs, pistes côte à côte,
acteurs, pied, bascule — d'après les cadres de ㊴, en vérifiant ce que le back sert avant de dessiner une valeur. Classe A. **Aucun code.**
v4 RÉÉCRIT v1-v3.1 (historique : `git log -- Tools/ecran-39-elements-absents/DESIGN.md`) et lève la revue ⊥ du 08/10 (NOT_APPROVED :
B1-B4, M1-M3, m1-m6) avec les règles de f2 du 08/10 sur M2 et B1.

## 1. Sources épinglées
- Maquette : `atelier3d-mafia/ecrans-brennar-6.html` @**a70a8c5** (master, propre), md5 **10ff67f4**, **9** `.dos6`. Indices de cadres
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
- **R4 — compteurs.** Vue pistes : « pistes chaudes » = pistes VIVANTES hors de leur premier cran / pistes vivantes (« 01/1 ») ;
  « franchies » = pistes vivantes au dernier cran ; porte « acteurs qui tiennent » = `steady` / acteurs servis. Vue acteurs : connus ·
  `nervous` · `gone` ; porte « pistes chaudes » = le même compte que la vue pistes. Route en erreur ⇒ « — » (jamais 0).
- **R5 — l'état vide (135)** ⇔ toutes les pistes vivantes au premier cran ET roster servi vide. Il **n'a PAS de bascule** (f2 : la
  maquette n'en dessine pas, il n'y a rien à basculer) : trois `.fen` nues — « 00/1 pistes chaudes » (dénominateur de R4), « 00
  franchies », « 00 acteurs connus » —, `.elast` > `.rien`, puis `.pann` de 135 en FRÈRE de `.elast`, pas de pied. Roster vide avec une
  piste vivante chaude ⇒ vue pistes (150), sa porte vers une vue acteurs qui affiche « 00 acteurs connus » et aucune ligne.
- **R6 — mots** (tous par `Libelle`, clés neuves avec le texte de la maquette ; les textes PROPOSÉS sont re-mesurés s'ils changent) :
  `steady` « il tient » · `nervous` « il a peur » · `unavailable` « injoignable » · `gone` « parti » (+ `.ac.parti`) ; `lawyer` « Avocat »
  · `clerk` « Greffier » ; silhouette `.sil` teintée par l'état. Panneaux : pistes = 150, acteurs = 151 (= 133 réécrit, PROPOSÉ ; la
  phrase « Les trois autres existent sans être visibles. » a disparu), vide = 135 — **trois clés de panneau**, une par vue.

## 5. Recettes : ce qui est un FILET, ce qui ne l'est pas (lève B1-B3)
`generer-filets.py` : « une recette = un élément BORDÉ » de `mesure-filets.json` (128 cadres, max 142 : **150-151 absents**) ; l'index
`ecrans-index.json` porte ㊴ = [131…136] ; le catalogue `DecorsDeScene.Filets.Forensic` en a 11 (`Ac AcParti Cerne Cta6 Elast Enseigne
Fen Mano Pann Pi PiBout`).
- **Étape 0 (préalable, B2)** : ajouter 150 et 151 aux cadres de ㊴ dans l'index (`verifier-indices-cadres.py` les contrôle) ; re-mesurer
  sous Chromium (`mesurer-filets.cjs`) ; `generer-filets.py` puis `--verifier`. Recettes GÉNÉRÉES attendues : **`FenPorte`** (bord
  `#b08d3e`), **`Rg`** (bord `#2a3648`), **`Cta6Eteint`** (bord `#2a3648` ; B3 — présent en 150). Compte du catalogue re-mesuré après
  génération, jamais écrit d'avance.
- **`.fen.ici` (B1, règle f2 : rendre ce que la maquette rend, par le mécanisme existant)** : l'or est une OMBRE INTERNE SANS FLOU
  (`inset 0 -2px 0`), soit 2 px pleins à l'intérieur du bas du bloc, sans effet de mise en page. Le mécanisme existant qui rend ces
  pixels est `Filets.Poser` (surimpression étirée, `ignoreLayout`, au-dessus du fond du bloc — comme `Lisere` rend déjà `inset 0 0 0
  1px`) : une recette ÉCRITE À LA MAIN `FenIci` = `Fen` + `SpecFilet(Cotes.Bas, 2f, Plein, #f2c96b)`, dans `DecorsDeScene.cs` à côté
  du cerne (pas dans le fichier généré), sa docstring citant la CSS. Aucun bord n'est inventé : `Fen` garde son bord mesuré.
- **`.notepi`** : ni bord, ni fond, ni ombre ⇒ **pas une recette** : un texte (TMP, italique serif, `#8a979c`, centré) posé par l'écran.
- **`.pi.eteinte`** : aucune règle de bord propre ⇒ **pas une recette** (le générateur la confondrait avec `Pi`) : `.pi` + encres
  `#7a838d` + crans à la teinte vide.
- `RecettesEnAttente[㊴]` (`DecorDeScenePosePlayModeTests.cs:104`) = `Ac AcParti Cta6 Elast Fen Mano PiBout` (7) : se vide au fil de la
  pose, avec les recettes neuves (`Cta6Eteint FenIci FenPorte Rg`) ; `Mano` reste tant qu'il n'est pas branché, la garde l'exige.

## 6. Gardes prévues (EFFET d'abord : rendre et compter des pixels)
- Structure : 3 `.fen` dans l'ordre ; vue pistes = 3 `.pi` côte à côte (ordre, 4 crans chacune) ; vue acteurs = une ligne par acteur
  servi, `.rg` dernier enfant sauf `gone` ; 135 : `.pann` frère de `.elast`, 0 porte, 0 pied.
- **Pixels** : `FenIci` produit ≥ 1 rangée or au bas de la 1ʳᵉ fenêtre et AUCUNE en haut (contrôle : `Fen` seule n'en a pas) ; la porte
  a son bord or ; `Cta6Eteint` et `Rg` à l'encre `#7a838d` ±6/255 sur leur fond (contraste mesuré ≥ 4,5:1 sinon consigné) ; 2 pistes
  éteintes = 0 cran coloré, l'effluent ≥ 1.
- **Geste** : clic de PRODUCTION sur la porte ⇒ l'autre vue, `.fen.ici` suit ; clic sur `Cta6Eteint` ou un `.rg` ⇒ AUCUNE requête
  (compteur de requêtes = 0) ; 135 : aucun geste.
- **Données** : compteurs recalculés indépendamment sur des corps FABRIQUÉS (vide 135 ; chargé 150/151 ; roster vide + piste chaude ;
  route en erreur ⇒ « — ») ; dénominateur = pistes vivantes ; `PistesConstantes` lue en UN site (garde de source) ; TD-881 au registre.
- Décor : D2/D6b (`RecettesEnAttente[㊴]` rétrécit, jamais de nom périmé).
