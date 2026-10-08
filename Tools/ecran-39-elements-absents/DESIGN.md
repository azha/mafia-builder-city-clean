# ㊴ Le dossier — les éléments ABSENTS de la maquette `.dos6` (CLIENT-2, 08/10) — DESIGN v1, à revoir

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

## 4. Questions à trancher (f2) — elles changent le code
- **Q1 deux vues** : la maquette a une vue « pistes » (131-132) et une vue « acteurs » (133-134), aux compteurs DIFFÉRENTS. Comment le
  joueur passe-t-il de l'une à l'autre (onglets ? les deux empilées ? la vue acteurs seulement si le roster est non vide) ?
- **Q2 le geste** : « acheter du renseignement — sur un acteur, pas sur une piste ». Dans la vue pistes, le geste ALLUMÉ mène-t-il à la vue
  acteurs (choisir l'acteur), ou est-il ÉTEINT dans la vue pistes et posé PAR LIGNE d'acteur ? Et le prix (`costCents`) n'est connu
  qu'APRÈS l'achat (L3 « dire le prix » : manque du back) — achat sans prix affiché : acceptable ?
- **Q3 pistes constantes** : deux pistes sur trois sont constantes côté back ; les afficher comme « vivantes » est ce que fait déjà la vue
  actuelle — on garde, ou on le dit au joueur ?

## 5. Gardes prévues
Pixels/structure : 3 `.pi` côte à côte dans `Elast` (ordre, 4 crans chacun, cran servi coloré), `PiBout` au dernier cran ; une ligne par
acteur servi, `AcParti` sur `gone` ; compteurs dérivés = recalcul indépendant sur des corps FABRIQUÉS (deux états : vide 135, chargé
131/133) ; « — » sur route en erreur ; D2/D6b du décor (RecettesEnAttente[㊴] rétrécit : Fen, Elast, PiBout, Ac, AcParti, Cta6).
