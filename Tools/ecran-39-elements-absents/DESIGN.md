# ㊴ Le dossier — les éléments ABSENTS de la maquette `.dos6` (CLIENT-2, 08/10) — DESIGN v2 (règles de f2 du 08/10 intégrées), à revoir ⊥

**Commande** (f2, 08/10) : après le décor de scène, construire sur ㊴ ce que la maquette montre et que le client ne construit pas — les
compteurs, la boîte des pistes, le pied « acheter du renseignement », les acteurs — d'après les cadres de ㊴, le geste éteint s'il n'a pas
de route, en vérifiant ce que le back sert avant de dessiner une valeur. Classe A (contenu que le joueur perçoit). **Aucun code écrit.**

## 1. Ce que dessine la maquette (mesuré, `ecrans-brennar-6.html`, les 7 `.dos6`)
| cadre | sous-titre | compteurs (`.fen` ×3) | zone élastique | panneau | pied |
|---|---|---|---|---|---|
| 131 | trois pistes, et elles ne se mélangent pas | 01/3 pistes chaudes · 00 franchies · 01/4 qui tiennent | `.pistes` : 3 `.pi` côte à côte (titre, 4 crans, mot, clé) | pourquoi trois colonnes | `.cta6` ACHETER DU RENSEIGNEMENT + `.note6` « sur un acteur, pas sur une piste » |
| 132 | ils sont venus | 03/3 · 02 franchies · 01/4 | `.pi.bout` (bord accentDanger) sur les pistes au DERNIER cran | le dernier cran | idem |
| 133 | qui parle, et qui a peur | 04 acteurs connus · 01 qui ont peur · 01 partis | `.acteurs` : 4 `.ac` (type, ref, état) ; `.ac.parti` tireté, opacité .45 | deux types listés, cinq achetables | — |
| 134 | il ne reviendra pas | idem 133 | idem | parti n'est pas injoignable | — |
| 135 | rien à votre nom | 00/3 · 00 franchies · 00 acteurs connus | `.rien` (phrase) | ce n'est pas une bonne nouvelle | — |
| 136 | ce qui manque encore | — | 4 `.pann` « maillon manquant » L1-L4 | — | — | ⇒ cadre de CHANTIER (inventaire des manques), **pas un état joueur** : hors périmètre |
| 143 | les douze crans, tous | 03 pistes · 12 crans · 00 moyennés | vocabulaire des 12 crans | — | — | ⇒ RÉFÉRENCE de vocabulaire (juge), pas un état joueur |

## 2. Ce que sert le back (mesuré dans `services/game-back/src`, HEAD a0a7672b)
- `GET /v1/me/forensic` → `ForensicClientProjection` : `audit_risk_bucket` (clean|watched|flagged|audited), `effluent_visibility_bucket`
  (clear|faint|visible|glaring), `lifestyle_alarm_bucket` (quiet|noticed|watched|subpoenaed). ⚠️ « 1 bucket réel sur 3 » : seul
  l'effluent a une source vivante, les deux autres sont CONSTANTS pour tout joueur (en-tête de `forensic.controller.ts`).
- `GET /v1/me/internal-affairs/actors` → `{ actors: ActorSummary[] }`, `ActorSummary = { actorRef, actorType: 'lawyer'|'clerk', status:
  'steady'|'nervous'|'unavailable'|'gone' }` (4 états qualitatifs ; jamais de pourcentage — mur P5).
- `POST /v1/me/internal-affairs/actors/:ref/intel` body `{ actor_type }` → `IAIntelPurchaseResult { purchaseId, band, costCents, … }` :
  la ROUTE DU GESTE EXISTE, mais elle porte sur UN acteur (`:ref`), jamais sur une piste.

## 3. Traduction proposée
- **Compteurs** (vue pistes) : « N/3 pistes chaudes » = pistes servies hors de leur PREMIER cran ; « N franchies » = pistes servies à leur
  DERNIER cran ; « N/M qui tiennent » = acteurs `steady` / acteurs servis. Dérivations d'ordre sur des domaines FERMÉS et servis, aucune
  valeur inventée ; un domaine non servi (route en erreur) ⇒ « — » (jamais 0 : un zéro dirait « mesuré »). Vue acteurs : connus / ont peur
  (`nervous`) / partis (`gone`).
- **Boîte des pistes** (`.elast`, recette `Filets.Forensic.Elast`) : les 3 signaux actuels deviennent 3 `.pi` CÔTE À CÔTE (titre, 4 crans
  colorés jusqu'au cran servi, le mot, la clé brute), `.pi.bout` (recette `PiBout`, accentDanger) au dernier cran.
- **Acteurs** (`.acteurs`) : une ligne par acteur servi (type en mots, `actorRef` tel quel — L2 « donner un nom » reste un manque du
  back, consigné —, l'état en mots) ; `gone` ⇒ `.ac.parti` (recette `AcParti`, tireté, opacité .45).
- **Pied** (`.cta6` + `.note6`) : PiedDEcran (CLIENT-1, grammaire `Cta6`). Le geste a une route, mais par ACTEUR.
- **Panneau** : la phrase de chaque état (cadres 131-135), textes de la maquette par `Libelle`.

## 4. Règles tranchées par f2 (08/10) et mesures qui les appliquent (v2)
Mesures de ce tour (maquette `atelier3d-mafia/ecrans-brennar-6.html` @01afe4e, md5 70344220 = la copie d'`atelier-anim`) :
- **Enfants directs des 7 `.dos6`** : 131-132 `cerne enseigne compteurs elast pann pied` · 133-134 `cerne enseigne compteurs elast
  pann` (**pas de pied**) · 135 `cerne enseigne compteurs elast` (le panneau vit DANS `.elast`, pas de pied) · 136 `… compteurs pann×4` ·
  143 `… elast pann`. Aucun `onclick`/`href`/`role`, aucun onglet : **la maquette ne dessine aucun élément de bascule**.
- **CSS `.dos6`** (50 sélecteurs) : `.cta6.eteint` EXISTE (bord `#2a3648`, texte `#7a838d`, fond `#111823`), utilisé 3 fois dans le
  fichier ; aucun sélecteur d'onglet ni de bouton par ligne d'acteur (`.ac` = silhouette `.sil`, type+ref, `.st`).
- **Le back ne marque pas les pistes constantes** : aucun champ de vivacité dans `ForensicClientProjection` ; seul l'en-tête de
  `forensic.controller.ts:11-19` @a0a7672b le dit (effluent vivant ; audit et train de vie constants).
- **Le « revenir » de la série 6** (`AppShell.cs:445-458`, ARBITRAGES §C.14) : sans chrome, par le retour SYSTÈME qui dépile un niveau
  du SHELL ; une vue interne d'un écran n'est pas un niveau (le retour sortirait de ㊴ vers le menu PLUS).

**R1 — deux vues, pas de navigation inventée.** Vue **pistes** (131-132) par défaut ; vue **acteurs** (133-134). Pistes → acteurs : le
geste du pied (R2), seul élément dessiné qui y mène. **Acteurs → pistes : AUCUN élément dessiné** ⇒ à faire dessiner par CLIENT-3
dans l'atelier AVANT d'en coder un (règle f2). ⚠️ Alternative à soumettre à f2, non retenue par défaut : le retour système (§C.14)
dépile la vue acteurs avant l'écran — ça touche `AppShell.Depiler` (fichier de CLIENT-1) et ne dessine rien. **Tant que l'un des deux
n'est pas tranché, la vue acteurs n'est PAS codée** (une vue sans sortie piège le joueur) ; la vue pistes l'est, son geste ÉTEINT (R2).
**R2 — le geste.** Vue pistes : `ACHETER DU RENSEIGNEMENT` + `.note6` ; ALLUMÉ ⇔ la vue acteurs existe (R1 tranché) ET le roster est
servi NON VIDE ⇒ il NAVIGUE vers la vue acteurs (aucun achat) ; sinon `.cta6.eteint` (la classe de la maquette, recette `Cta6Eteint`),
note inchangée. Vue acteurs : la maquette n'a NI pied NI bouton par ligne ⇒ **rien n'est dessiné** pour l'achat (« éteint » = absent :
dessiner un bouton éteint serait un élément inventé) ; quand le back servira le prix AVANT l'achat (manque L3, transmis à BACK-1),
CLIENT-3 dessine le geste par ligne, puis on code `POST …/actors/:ref/intel`.
**R3 — pistes constantes.** `audit_risk_bucket` et `lifestyle_alarm_bucket` s'affichent ÉTEINTES : crans tous à la teinte vide, le
mot remplacé par « — », la clé brute masquée, et une note. Le texte de la note n'est PAS dans la maquette ⇒ demandé à l'atelier
(CLIENT-3) avec sa clé i18n, jamais écrit ici. L'effluent s'affiche normalement. La liste des pistes constantes vit côté client en UN
site nommé (`PistesConstantes`) faute de champ servi ⇒ **dette TD-881** (plage TD-880..889), ancre ce site, sortie : le back sert un
champ de vivacité (dette back transmise à BACK-1 par f2) et la liste disparaît.
**R4 — compteurs (révise §3).** Vue pistes : « pistes chaudes » et « franchies » ne comptent que les pistes VIVANTES, sur un
dénominateur = nombre de pistes vivantes (« 00/1 » aujourd'hui, jamais « /3 » : trois pistes comptées dont deux constantes diraient
« mesuré » ) ; « qui tiennent » = `steady` / acteurs servis ; roster en erreur ⇒ « — ». Vue acteurs : connus · `nervous` · `gone`.
**R5 — l'état vide (135).** Toutes les pistes VIVANTES à leur premier cran ET roster servi vide ⇒ le cadre 135 : `.rien` + son
panneau dans `.elast`, **pas de pied** (mesuré). Roster vide mais une piste vivante chaude ⇒ vue pistes, geste éteint (R2).
**R6 — mots.** `steady` « il tient » · `nervous` « il a peur » · `unavailable` « injoignable » · `gone` « parti » (+ `AcParti`) ;
`lawyer` « Avocat » · `clerk` « Greffier » ; silhouette `.sil` teintée par l'état (4 jetons de la maquette) ; tout par `Libelle`.

## 5. Points ouverts pour la revue ⊥ (et f2)
- P1 : R1 — élément dessiné par CLIENT-3, ou retour système (§C.14) ? Bloque la vue acteurs, pas la vue pistes.
- P2 : le panneau de 133 (« deux types listés, cinq achetables », « la route accepte… ») parle de la ROUTE au joueur : texte d'état
  joueur ou note de chantier comme 136 ? Proposé : remplacé par le panneau de 134 tant que l'atelier ne tranche pas.
- P3 : R4 — un dénominateur « /1 » s'écarte du dessin « /3 » ; écart A assumé (vérité de la donnée) ou C ?

## 6. Gardes prévues
Pixels/structure : 3 `.pi` côte à côte dans `Elast` (ordre, 4 crans chacun, cran servi coloré), `PiBout` au dernier cran ; une ligne par
acteur servi, `AcParti` sur `gone` ; compteurs dérivés = recalcul indépendant sur des corps FABRIQUÉS (deux états : vide 135, chargé
131/133) ; « — » sur route en erreur ; D2/D6b du décor (RecettesEnAttente[㊴] rétrécit : Fen, Elast, PiBout, Ac, AcParti, Cta6) ; R2 : `Cta6Eteint` quand la vue acteurs n'existe pas ou que le roster est vide/en erreur ; R3 : 2 `.pi` éteintes (0 cran coloré, « — »),
l'effluent coloré ; R4 : dénominateur = pistes vivantes ; R5 : 135 sans pied ; TD-881 au registre.
