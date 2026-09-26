# ① Intérieur de district et ② Fiche bâtiment — inventaire de la maquette ratifiée, l'art, les mots (jalon 1, CLIENT-2)

> Atelier / DA, 2026-09-23. **Maquette ratifiée** : `~/project/atelier3d-mafia/hud-brennar.html` au commit `5983267` (« HUD v3.1 validé
> user », 2026-08-20 10:56), identique à l'octet à `master` (`64f678a`). **Client** : l'arbre de CLIENT-2, `~/project/mafia-unity-F`
> (`ecrans/2026-09-23`) à `201c57c1`. **Back** : `~/project/mafia-back-suite` (`back/s5-revue-du-jour`) à `587b78b4` — c'est la table du
> dépôt, pas le SHA servi par la pile. Aucun rendu : on attend le signal de l'orchestrateur.
> Instruments : `apparier-fond-maquette.py` (étendu à `#id`), `inventaire-22.py` (les mots, registre par registre ; annexe générée
> `22-annexe-mots-1-2.md`, rejouable : `python3 Tools/atelier-2026-09-22/inventaire-22.py --client 201c57c1 --back 587b78b4 --controle
> Tools/atelier-2026-09-22/22-annexe-mots-1-2.md`).

## 0. Ce que la maquette couvre — et ce qu'elle ne couvre pas

- `hud-brennar.html` n'a **aucun `class="cadre"`** : c'est **un** téléphone, avec **quatre états** pilotés par deux boutons de démo
  (🌙/☀️ et 🔥, `:180-181`) : **N** nuit au repos (par défaut, heat 37 %), **J** jour, **C** chaud (78 %), **D** descente (96 %). Les
  pastilles ①-⑥ de la maquette (`.co`, `:173-203`) sont ses propres numéros de blocs : on les garde.
- **② n'a pas de maquette ratifiée.** Le bloc 5 de la maquette, la `.fiche` (« LE VERGE D'OR », trois cases, trois boutons), est
  dessiné au client **par ①** (`DistrictInteriorScreenController.cs:1990-2260`, `OuvrirFiche`), pas par ②. ② (`BuildingCardController`,
  `screen_2a`) est la fiche détaillée : ses lignes d'état et ses actions n'ont de modèle dans **aucune** maquette (l'INDEX des juges le
  dit : « aucune maquette de série 4/6 »). Pour ②, ce document inventorie donc les **mots** (§3), et non un écart au dessin.
- Le **chrome** (la barre, le médaillon, le dock) est dans la maquette de ① mais vit au client dans `TopBarController`/`AppShell`,
  partagés par tous les écrans. Il est inventorié ici ; à l'orchestrateur de dire s'il est au périmètre de CLIENT-2.

## 1. Les blocs de la maquette, état par état

| # | bloc | états | source dans la maquette | au client (arbre F `201c57c1`) |
|---|---|---|---|---|
| — | le fond de ville, nuit / jour | N C D / J | PNG embarqués, `#fond-nuit` / `#fond-jour` (`:149-150`) | `DistrictBackgroundSlots` → `VERGE_D_NUIT_FINAL.png` / `VERGE_D_JOUR_FINAL.png` (§2.1) |
| — | la barre : verre fumé, filet laiton, volutes | tous ; filet braise en C | CSS `.barre` + SVG `.volute` (`:26-34`, `:154-171`) | `TopBarController` (volute, filet, `warmedBrass`) |
| 1 | l'argent : « Argent », « $ 24 850 », le fil propre/sale | tous | `.aile.gauche` (`:156-157`) | `TopBarController.cs:1067` « ARGENT » + `MoneyUnderlineWidthPx = 74` (`:467`, « REUSE exact — hud-brennar.html:59 ») |
| 2 | le médaillon : cadran à aiguille, « 37% », « Heat » ; « Descente » en D | N J 37 % · C 78 % · D 96 % | `.medaillon` + SVG `.cadran` (`:158-168`), script `:249-256` | `TopBarController` : manomètre, bandes `HeatBucketResolver` (Froid · Tiède · Chaud · Brûlant), légende « CHALEUR » (`:1504`) |
| 3 | l'horloge : « Jour 12 · Soirée », « 21:40 » | N C D ; J : « 14:10 » | `.aile.droite` (`:169`), script `:246` | « JOUR {n} » (`TopBarController.cs:613`) + la phase servie (`DayPhaseResolver`) ; **pas d'heure** |
| 4 | le bandeau éphémère | N · C · D (un texte par état) | `.bandeau-alerte` (`:176`), script `:257-259` | la ligne de notification du chrome (`LibelleNotifCalme` « [ ] Calme », `:357`) ; aucun des trois textes |
| — | le gyrophare du flic en planque | D seulement | CSS `.gyro` (`:72-76`), posé dans le monde (23 %, 56,5 %) | **absent** (0 occurrence de `gyro` dans `Assets/Scripts`) |
| — | le « + $320 » qui monte d'un bâtiment | N C D (pas J) | CSS `.floater` (`:77-80`) | **absent** (0 occurrence) |
| — | l'alarme : filet et boîtier braise, pouls, aiguille qui tremble | C (filet) · D (pouls + tremble) | `.tel.chaud`, `.tel.descente` (`:31`, `:64-71`) | teinte d'alarme à `BURNING` seulement (`TopBarController.cs:708-718`) ; **ni pouls ni tremblement** |
| 5 | la fiche : « LE VERGE D'OR », « Bar · Quartier général », 3 cases, 3 boutons | tous | `.fiche` (`:183-196`) | **①** `DistrictInteriorScreenController.cs:1990-2260` (§3.1) |
| 6 | le dock : Empire · Famille · Marché · Plus, point or sur Famille | tous | `.dock` (`:197-202`), 4 PNG 32 px embarqués | `AppShell.DockRatifie` (`:1669-1675`) : Empire · Famille · **Filière** · Plus ; icônes montées (§2.3) |
| — | 🌙/☀️, 🔥, les pastilles ①-⑥ | — | `.bascule`, `.chaudb`, `.co` | outils de démonstration, **pas des blocs du jeu** |

**Deux états impossibles dans la maquette elle-même** :
- **J** (jour) : le script écrit « 14:10 » dans `#heure` puis appelle `document.getElementById('phase')` (`:247`), qui n'existe pas
  (les classes `.medaillon .jour/.heure/.phase` sont définies, `:51-54`, mais jamais posées : le médaillon a été donné au heat). Le
  script s'arrête là, et l'aile garde « **Jour 12 · Soirée** » avec **14:10**. Le mot qu'il voulait poser, « Après-midi », n'est pas une
  phase servie : le back sert `DAWN · DAY · DUSK · NIGHT` (« Aube · Plein jour · Soirée · Nuit », `DayPhaseResolver.cs:52-55`).
- **C** et **D** au jour : la maquette cache le gyrophare au jour (`.tel.jour .gyro{opacity:0}`, `:75`) mais garde le reste. Rien
  d'impossible, mais la descente de jour n'a pas de signe dans le monde.

## 2. L'art — ce qui existe, et la preuve

### 2.1 Le fond : la maquette montre le district **ZO en version 1**, le client montre le district **D**

Mesuré par pixels (`apparier-fond-maquette.py hud-brennar.html '#fond-nuit' …`, interpréteur avec numpy, lecture seule) :

| fond embarqué | meilleure source | écart RVB | voisins ±4 px | négatif |
|---|---|---|---|---|
| `#fond-nuit` (PNG 1080×1920, 3 027 089 o) | `DISTRICT_ZO_NUIT_FINAL.png`, boîte entière | **8,52** | 15,38 · 13,13 | `DISTRICT_D_JOUR_FINAL` 56,17 |
| `#fond-jour` (PNG 1080×1920, 2 995 987 o) | `DISTRICT_ZO_JOUR_FINAL.png`, boîte entière | **8,38** | 15,53 · 12,95 | `DISTRICT_ZO_NUIT_FINAL` 37,98 |

- **8,5 n'est pas une compression** (un PNG n'en a pas, et un JPEG ré-encodé rend 1 à 3) : la **médiane** de l'écart est **0,33**, et
  7,5 % des pixels seulement dépassent 40 — tous sous **y = 843**, en bas à droite. La moitié haute est identique ; le bas diffère.
- **Pourquoi** : la maquette est ratifiée à **10:56** (`5983267`) ; les deux fichiers `DISTRICT_ZO_*_FINAL.png` sont entrés dans le dépôt à
  **11:41** (`22af573`, « district v2 — usine reculée (transversale dégagée), rues peuplées, lumières sud »). La maquette embarque la
  **version 1** du district, jamais versionnée comme fichier : sa **seule copie est le PNG sans perte dans la maquette**.
- **Le client** : ① charge `VERGE_D_NUIT_FINAL.png` / `VERGE_D_JOUR_FINAL.png` (`DistrictBackgroundSlots.asset`, GUID `2c7ecd0b…` /
  `c117a561…`), **identiques à l'octet** à `DISTRICT_D_{NUIT,JOUR}_FINAL.png` de l'atelier (même commit `22af573`) — **un autre district**
  (écart 34,95 contre le fond nuit de la maquette). Le district ZO v2 n'est dans le client qu'**en dehors de `Assets`** :
  `Tools/fal/generees/2026-09-06/decors/DISTRICT_ZO_NUIT_1080x2400.png`, non monté (`12-…` §2.1).
- Phase → fond : `NIGHT`, `DUSK` → nuit ; `DAY`, `DAWN` → jour (`DistrictInteriorScreenController.cs:318-321`, « pis-aller — pas de fond
  DUSK/DAWN dédié »). La maquette pose « Soirée · 21:40 » sur le fond de **nuit** : même règle.

⇒ **Rien à produire** pour le fond. **À trancher** : le district de ① est D (au client) et non ZO (au canon) ; si le canon doit être
suivi, ZO v2 existe et ZO v1 s'extrait sans perte de la maquette (§5, point 1).

### 2.2 Ce que la maquette dessine en CSS/SVG — rien à rastériser

La barre, les volutes, le médaillon (boîtier, lunette, cadran, aiguille, losange), le fil propre/sale, la fiche (verre, filet laiton,
boutons or et filet), le dock (ronds, pointe, point or), le **gyrophare** (un dégradé radial rouge) et le **« + $320 »** (du texte) sont du
CSS ou du SVG en ligne : **aucun asset bitmap à produire**. Au client, le chrome les dessine déjà (`TopBarController`, `AppShell`),
sauf trois : le **gyrophare**, le **« + $ » qui monte**, et l'**alarme animée** de D (pouls, aiguille qui tremble) — voir §5.

### 2.3 Le dock : les icônes sont montées, et la preuve tient sur l'alpha

`Assets/Art/Icons/Resources/DockIcons/dock_{empire,famille,plus}_64.png` (`d8b7ae62`, « F13 le dock porte ses icônes ») : **alpha
identique** pixel à pixel à nos rasters `Tools/dock/icones/dock_*_64.png` (écart 0) ; le RVB a été mis à **blanc**, dérivation
documentée par CLIENT-1 (`Tools/juge-donnees/dock/provenance-icones-2026-09-23.md`) pour que la teinte `invert(.78)` sorte à 199.
**Filière** : rond vide, par choix, tant que l'user n'a pas tranché A / B / C (`18-…`).

### 2.4 Les bustes de ① : la capuche est déjà là

① pose `Lieutenant/ui_element_buste_lieutenant` sur ses marqueurs (`DistrictInteriorScreenController.cs:1542`) : c'est le buste à
**capuche** (vérifié à l'image), celui que `09-…` retient pour **tout** lieutenant (B03). ① ne montre **aucun** médaillon du Don :
la règle de l'**anneau** (réservé au Don) n'a rien à y changer. La maquette de ① n'a pas de buste.

### 2.5 ② : aucun art

`BuildingCardController` ne charge **aucun** sprite (0 `Resources.Load`, 0 `Sprite`) : des lignes de texte et des glyphes ASCII
(`[#]`, `[~]`, `[!]`). Rien à produire, rien à prouver.

## 3. Les mots — ce que le bundle sert, ce qu'il ne sert pas

Mesuré par `inventaire-22.py` (annexe `22-annexe-mots-1-2.md`, **201 sites**, un par ligne). Registre par registre : `FR_MESSAGES` et
`EN_MESSAGES` (1048 clés chacun) lus par leur nom. ⚠️ `resolveBundle('fr')` = EN ⊕ FR : une clé présente en EN et absente en FR
servirait l'**anglais** dans le bundle fr — **0 cas** sur ① et ②.

| écran | sites | par une clé, `ok` (fr et en, en ≠ fr) | par une clé, `en == fr` | **littéral seul** (aucune clé : le même mot dans les deux bundles) |
|---|---|---|---|---|
| ① fiche + libellés de type | 43 | 13 (`district.type_batiment.*`) | 0 | **30** |
| ① chrome (barre, médaillon, dock) | 18 | 0 | 0 | **18** |
| ② fiche bâtiment | 140 | 106 | 11 | **23** |

### 3.1 La fiche de ① (bloc 5) : le canon contre le client

| canon (`:183-196`) | au client | mode | registre |
|---|---|---|---|
| LE VERGE D'OR | le nom servi : `game.fiction.building.name` → « {enseigne} — {district}, îlot {block} » (`:2195-2207`) | clé servie | fr/en servis ; ⚠️ plus long que le canon (le code le dit, `:1990-1996`) |
| Bar · Quartier général | `LibellesBatiment.Conversion` : « NON CONVERTI » · « EN INSTALLATION » · « OPÉRATIONNEL » (`LibellesBatiment.cs:55-57`) | **littéral** | aucun ; et ≠ le fr servi de la même bande à ② (« Pas encore converti ») — §4 |
| $ 2 400 · À COLLECTER | `LibellesBatiment.Revenu` (« Rapporte », « Au repos ») · « REVENU » (`:2233`) | **littéral** | aucun |
| $ 180/h · REVENUS | `LibellesBatiment.Chaine` (« Raccordée », « Coupée ») · « CHAÎNE » (`:2237`) | **littéral** | aucun |
| 12% · HEAT LOCAL | `LibellesBatiment.Etat` (« Sain » … « Hors service ») · « ÉTAT » (`:2241`) | **littéral** | aucun |
| COLLECTER · BLANCHIR · AMÉLIORER | les mêmes mots (`:2057-2061`) | **littéral** | aucun |

Les trois cases : des **bandes** au lieu de chiffres, et **ÉTAT** au lieu du heat local (le DTO n'en porte pas). C'est un écart **assumé
et écrit** dans le code (`:2223-2241`), jamais ratifié (§5, point 2).

### 3.2 Le chrome : **aucun mot n'a de clé**

« ARGENT », « JOUR — » / « JOUR {n} », « CHALEUR », « Patron », les bandes « Froid · Tiède · Chaud · Brûlant », les phases « Aube ·
Plein jour · Soirée · Nuit », « [ ] Calme », et le dock « Empire · Famille · Filière · Plus » : **18 littéraux**, posés tels quels
(`NewText(…, "ARGENT")`, `return "Froid"`, `t.text = label.ToUpperInvariant()`). Le bundle en montre donc le **français**. Aucune clé
du back n'a ces valeurs, sauf « Patron » (`exceptions.bloc.patron`, servie pour ⑨ : Boss).
Canon contre client : « **Heat** » (un mot anglais dans le canon fr) est devenu « **CHALEUR** » ; « Descente » (état D) n'a pas d'équivalent
au médaillon (le client s'arrête à « Brûlant »).

### 3.3 ② : 106 clés justes, 11 `en == fr`, 23 littéraux

- **`en == fr`, 11** — tous des **mots identiques dans les deux langues**, pas des défauts TD-690 : Structure, Substance (×2 sites), Standard,
  Intact, Imminent, Pure, et les quatre substances (Brindle, Crick, Hush, Ash — noms propres).
- **Littéraux, 23** : les **14 actions** en français (« Réparer », « Agrandir le labo / le relais / la banque », « Commander du pyralin »,
  « Lancer une cuisson », « Lancer une cuisson d'ash », « Honorer le rendez-vous », « Injecter », « Soigner la culture », « Planter »,
  « Envoyer un coursier », « Déposer », « Retirer », « **Ouvrir** ») ; deux valeurs (« oui / non », « se dégrade / stable ») ; et **6 en
  anglais dans l'écran fr** : « - Refine », « + Refine », « < Vehicle », « Vehicle > », « - Amount », « + Amount » (`:2004-2167`).
- **Replis anglais** : les bandes `setup`, `cover`, `structural`, `raid_risk`, `temperature` passent par `Cle(role, "<mot anglais>")`
  (`:1112-1239`) : la clé est servie en fr (« Opérationnel », « Solide », « Faible »…), mais si elle manquait, l'écran fr afficherait
  l'**anglais**. La garde « zéro repli » le verrait ; c'est noté, pas un défaut aujourd'hui.

### 3.4 ① et ② ne nomment pas les bâtiments avec les mêmes mots

Même `operational_type`, deux familles de clés servies — **fr** et **en** diffèrent d'un écran à l'autre :

| type | ① `district.type_batiment.*` (fr / en) | ② `building.type.*` (fr / en) |
|---|---|---|
| `lab` | Laboratoire / Lab | **Labo** / Lab |
| `stash` | Cache / Stash | **Réserve** / Stash |
| `dealer_spot_front` | Point de vente / Dealer spot | **Coin de vente** / **Dealer-spot front** |
| `specialized_lab` | Laboratoire spécialisé / **Specialised** lab | **Labo spécialisé** / **Specialized** lab |
| `cash_safehouse` | Planque / Safehouse | Planque / **Cash safehouse** |
| `distribution_hub` | Relais / Hub | Relais / **Distribution hub** |

Et une troisième famille, **littérale**, dans `LibellesBatiment.Type` (`:32-44`, celle de ①) : elle reprend les mots de
`district.type_batiment` sans passer par la clé. Le joueur qui tape un bâtiment dans ① puis ouvre ② lit « Cache » puis « Réserve ».
**Un mot par type** est à choisir (§5, point 6) ; l'en a même deux orthographes (*Specialised* / *Specialized*).

## 4. Ce qui a changé depuis la ratification (2026-08-20)

| décision | où elle touche ① / ② | état au client (`201c57c1`) | état au back (`587b78b4`) |
|---|---|---|---|
| **Dock ratifié** : Marché → **Filière** | bloc 6 | « Filière » (`AppShell.cs:1673`), rond vide | — |
| **d4, « la banque »** (`e3e007cc`, veto user ouvert) | le type `money_holding` | ① « Banque » (clé), ② « Banque », « Taille de la banque » (clés), « Agrandir la banque » (littéral) | `district.type_batiment.banque` et `building.type.money_holding` : Banque / **Vault** |
| **« Ouvrir »** pour *Convert* (`04-…` §c2, veto user ouvert sur « Aménager ») | ② bouton ; ① ligne de type ; ② ligne « Mise en place » | ② bouton « **Ouvrir** » (`:1080`) ; ① « **NON CONVERTI** » (littéral) ; ② « **Pas encore converti** » (servi) | `building.setup.*` : « Opérationnel · En installation · **Pas encore converti** » |
| **Capuche** pour tout lieutenant (B03, `09-…`) | marqueurs de ① | buste à capuche (`:1542`) — conforme | — |
| **Anneau réservé au Don** (`0ccd8d5`) | — | ① et ② n'ont pas de médaillon de Don | — |
| **Phase du jour servie à l'ouverture** (F14, back `f4883b7c`) | bloc 3, et le fond jour/nuit | `TopBar.SetDayPhase(PhaseHorsDistrict())` quand le district ne rend rien (`AppShell.cs:397`), sinon la phase du district | `session/open` sert la minute et la phase (mig 0154) |
| **Zéro scalaire isolé** (R2.2) | blocs 2, 5 | le heat en bandes, la fiche en bandes | — |

⚠️ **« Ouvrir » ne tient que si toute la famille suit** (`04-…` : « sinon la fiche se contredit d'une ligne à l'autre »). Aujourd'hui,
② affiche le bouton « Ouvrir » **et** la ligne « Mise en place : Pas encore converti » ; ① affiche « NON CONVERTI ». Trois mots pour
une même bande. Avec « Ouvrir », la famille est : **Ouvert · Ouverture en cours · Pas encore ouvert** (et « Ouverture demandée /
Impossible d'ouvrir » pour le retour d'action) — au back pour `building.setup.*`, et au client pour `LibellesBatiment.Conversion`.

## 5. Ce qui devrait être re-ratifié (par l’user) — corrigé par les registres au §7.4

1. **Le district de ①** : le canon montre ZO (v1), le client montre D. Garder D (le canon illustrait un district ; celui de ① dépend du
   joueur), ou monter ZO v2 comme district par défaut.
2. ~~La fiche de ①~~ — **déjà tranché** (§7.4) : `Tools/juge-visuel/ARBITRAGES-user-2026-09-07.md` point 8 (ratifié par f2 le 07/09
   à 01:05) garde **« À COLLECTER · REVENUS · HEAT LOCAL » en bandes**, HEAT LOCAL = la chaleur du district (point 7). Les cases
   « REVENU · CHAÎNE · ÉTAT » du client sont donc un **défaut**, pas un écart à ratifier (D2/D3 de CLIENT-2). Reste à l'user : la ligne
   de type (« Bar · Quartier général » n'a aucune source ; le client montre l'installation).
3. **Le heat** : le **mot** au lieu du pourcentage est **tranché** (point 11 du 07/09 : « le mot ; canon HUD à mettre à jour ») et
   « HEAT » dans les références est un retard de maquette (point 19). Reste un **défaut client**, pas une question : l'état **Descente**
   (pouls, aiguille qui tremble, **gyrophare dans le monde**), que le client n'a pas (`heat.escalated` servi, jamais lu).
4. ~~L'horloge~~ — **déjà tranché** : point 16 du 07/09, « garder la PHASE (mot, R2.2) et retirer l'heure du canon ». Le client est
   conforme ; c'est la maquette qui est en retard.
5. ~~Le « + $ » qui monte des bâtiments~~ — **déjà tranché** : le point 17 du 07/09 range `.floater` dans l'**échafaudage** d'atelier
   (avec les pastilles `.co` et les bascules) que le canon propre retire. Aucune source servie non plus (M10 de CLIENT-2).
6. **Un mot par type de bâtiment**, partout (§3.4) — et une orthographe en (*Specialized*).
7. **Les veto ouverts** qui touchent ① et ② : « la banque », « Ouvrir » (et sa famille, §4).
8. **Hors user, pour le client** : les **18 mots du chrome** et les **30 de la fiche de ①** n'ont pas de clé ; les **6 libellés anglais**
   de ② (« - Refine », « < Vehicle », « + Amount »…) sont en anglais dans l'écran fr. L'atelier écrit le fr et l'en de ces mots sur
   demande.

## 6. Ce qui part d'ici

- Ce document, et son annexe générée `22-annexe-mots-1-2.md` (201 sites, rejouable par `--controle`).
- `inventaire-22.py` (les mots de ① et ②, registre par registre) ; `apparier-fond-maquette.py` accepte désormais un `#id` (le fond posé en
  `style` d'un élément, comme dans `hud-brennar.html`).
- `inventaire-22.py --cles-22` : les 23 clés du §7.1 (non servies, placeholders, aucun chiffre, titres dérivés, familles == énums servis).
- Aucun rendu, aucun asset, rien sous `Assets`.

---

## 7. Complément — l'écart de CLIENT-2 (`Tools/juge-donnees/ecran-principal/ecart-2026-09-23.md`, `e2bd7681`)

> Back relu à `1b9b1121` (`back/s5-revue-du-jour`) pour « ce qui est déjà servi ». Aucun rendu, aucun Blender.
> Clés vérifiées : `python3 Tools/atelier-2026-09-22/inventaire-22.py --cles-22 --back 1b9b1121`.

### 7.1 Les mots — fr avec `’`, et ce qui était déjà servi

**Déjà servi, mesuré par nom dans les deux registres** : aucune clé `harvest`, aucune clé pour les bandes de chaleur, aucun titre de case,
aucun texte de bandeau ; `building.type.*` couvre **10 types sur 12** (manquent `press_house` et `office`) ; `building.yield.idle|earning`
(« rien ne rentre » / « ça rapporte ») existe, pour le `yield_band` de ②.

**A. Les trois cases de la fiche (lot ①-1)** — les titres par `Libelle.De("district", "fiche", …)`, les valeurs par `ParValeur`.
Le 3ᵉ titre suit les points 11 et 19 du 07/09 : « Heat » devient « Chaleur ».

| clé | fr | en | note |
|---|---|---|---|
| `district.fiche.a_collecter` | À COLLECTER | TO COLLECT | titre de la case 1 (canon) |
| `district.fiche.revenus` | REVENUS | INCOME | titre de la case 2 (canon) |
| `district.fiche.chaleur_locale` | CHALEUR LOCALE | LOCAL HEAT | titre de la case 3 (canon « HEAT LOCAL ») |
| `district.harvest.nothing` | Rien | Nothing | `harvest_band` NOTHING : rien à ramasser ; teinte crème-2 |
| `district.harvest.available` | Prêt | Ready | AVAILABLE : il y a de quoi ramasser ; teinte **or-vif** (l'argent, comme le « $ 2 400 » du canon) |
| `district.harvest.full` | Plein | Full | FULL : quelque chose **s’est arrêté** faute de collecte (`capacity-guard.service.ts:70-78`) ; teinte **braise** |
| `district.revenue.idle` | Au repos | Idle | `revenue_band` IDLE — le mot que ① affiche déjà (`LibellesBatiment.cs:68`) |
| `district.revenue.earning` | Rapporte | Earning | EARNING (`LibellesBatiment.cs:67`) |
| `heat.bucket.cold` | Froid | Cold | une famille pour la case 3 **et** le médaillon (`HeatBucketResolver.cs:71-74`, littéraux aujourd'hui) |
| `heat.bucket.warm` | Tiède | Warm | |
| `heat.bucket.hot` | Chaud | Hot | |
| `heat.bucket.burning` | Brûlant | Burning | |
| `chrome.medaillon.descente` | Descente | Raid | le libellé du médaillon PENDANT une descente (`TopBarController.cs:725`, CLIENT-2 `881c17f6`) — le mot du canon (`hud-brennar.html:255`), jusqu'ici sans clé ; en : le mot déjà servi pour la descente (`building.row.risque_de_descente` → « Raid risk »). **Proposé, non ratifié** pour l'en |

- `district.revenue.*` plutôt que `building.yield.*` : même énum (IDLE | EARNING), mais « ça rapporte » est écrit pour une ligne de ②, en
  minuscule. Dans une case, à côté de « Prêt » et « Tiède », il faut la capitale. Si l'user veut un seul mot pour les deux écrans, c'est
  le point 6 du §5.
- ⚠️ **La donnée de la case 3** : le point 7 du 07/09 a ratifié le bucket **du district** (« le médaillon reste la VILLE »). Le lot ①-1 de
  CLIENT-2 propose `buildings[].heat_bucket`, le bucket **du bâtiment** (route `…/heat`), plus proche du « Heat local » du canon.
  C'est un changement de donnée ratifiée : à confirmer par l'orchestrateur. Le titre « CHALEUR LOCALE » convient aux deux.

**B. La tête de la fiche (lot ①-2)** — titre = `params.enseigne` seule (patron S03, `11-…` §3.11) ; dessous, une ligne « type · lieu ».

| clé | fr | en |
|---|---|---|
| `district.fiche.type_lieu` | {type} · {district}, îlot {block} | {type} · {district}, block {block} |
| `district.fiche.type_lieu.rang` | {type} · {district}, îlot {block}, n° {rang} | {type} · {district}, block {block}, no. {rang} |
| `building.type.press_house` | Imprimerie | Print shop |
| `building.type.office` | Agence | Agency |

- `{type}` = la valeur servie de `building.type.<operational_type>`. `{district}`, `{block}`, `{rang}` = les params de `name_i18n`, déjà
  servis. Mêmes mots que le nom servi (`game.fiction.building.name` : « îlot », « n° » / « block », « no. »).
- Le client met la ligne en capitales, comme `.fiche .titre .type` au canon (`text-transform:uppercase`).
- **Les deux types manquants** (le back ne les sert pas : « sans clé parce que sans texte ratifié ») — méthode de « la banque » (`e3e007cc`),
  instrument `mesurer-mot-money-holding.py 64f678a 201c57c1 1b9b1121 <mots>` : chaque candidat compté dans les **trois corpus** (texte
  des maquettes, littéraux du client, littéraux du back), texte lu seulement.

  | type | candidat | emplois | verdict |
  |---|---|---|---|
  | `press_house` | **Imprimerie** | 3, tous l'enseigne « Imprimerie Skeld » (㊲ cadres 80-82) | **retenu** : aucun autre sens ; c'est le mot des enseignes du type |
  | | « Atelier de presse » (① aujourd'hui, `district.type_batiment`) | 3, lui-même | écarté : « presse » est aussi **les journaux** (« copie de presse », « brève de presse » : série 6, cadres 91 et 130) |
  | `office` | **Agence** | **0** | **retenu** : compris sans glossaire (une agence, un bureau d'affaires), aucun autre emploi — comme « banque » |
  | | « Bureau » (① aujourd'hui) | 12 | écarté : **« Le Bureau »** est l'écran ⑫ (série 6, cadres 20-21, « le bureau du patron ») — et l'icône d'Empire est déjà le bâtiment « bureau » (`18-…`) |
  | | « Cabinet » | 9 | écarté : c'est l'**avocat** (㉝, « Un cabinet », `loi.bloc.un_cabinet`) |
  | | « Conseil » | 3 | écarté : le conseil de la ville (cadre 91), et un rôle de lieutenant (`LieutenantScreenController.cs:1086`) |
  | en | **Print shop** · **Agency** | 0 · 0 | retenus. « Office » a 18 emplois (dont la chronique de la ville : « The office of… ») ; « Press house » est le mot actuel de ①, écarté avec « presse » |

  « Imprimerie » et « Agence » sont aussi le premier mot d'une enseigne de leur type (« Imprimerie Skeld », « Agence Tegg ») : sur ces
  deux-là, la ligne « type · lieu » répète le titre. C'est le cas de toute famille où l'enseigne dit le métier ; ce n'est pas une
  collision de sens.
  ⚠️ ① sert encore `district.type_batiment.atelier_de_presse` et `.bureau` (« Atelier de presse », « Bureau ») : un cas de plus pour « un
  mot par type » (§3.4, §5 point 6). Recommandation : ① prend les mots de `building.type.*`.
- « Quartier général » n'a **aucune** source (ni drapeau ni type) : pas de mot à écrire tant que le back ne le sert pas.
- Point 12 du 07/09 (titre sur 2 lignes maximum, jamais rétréci) : l'enseigne seule fait **24 signes** au plus (« Traitement des eaux Dorn »).

**C. Le bandeau éphémère (lot ①-3)** — sources servies : `session/open.queue[]` (cartes d'exception : `lieutenant {id, name} | null`,
`severity_band`, `building`), `backlog_badge`, `heat.citywide_bucket`, `heat.escalated`, les rapports d'autonomie.

| clé | fr | en | quand |
|---|---|---|---|
| `chrome.bandeau.brigade_quadrille` | La brigade quadrille le quartier — planquez la caisse | The squad is combing the district — hide the cash | `heat.escalated` (état D du canon : « La brigade quadrille le Verge — planquez la caisse », le district rendu générique) |
| `chrome.bandeau.les_indics_parlent` | Les indics parlent : la brigade s’agite | The informants are talking: the squad is stirring | `citywide_bucket` ∈ HOT, BURNING sans `escalated` (état C du canon, mot pour mot) |
| `chrome.bandeau.attend_vos_ordres` | {nom} attend vos ordres | {nom} is waiting for your orders | la 1ʳᵉ carte de `queue` porte un lieutenant (« vos ordres » : `exceptions.file.ambiance`, servi) |
| `chrome.bandeau.la_ville_attend_vos_ordres` | La ville attend vos ordres | The city is waiting for your orders | la 1ʳᵉ carte n'a pas de lieutenant (⑨ : c'est la ville qui parle) |
| `chrome.bandeau.rapport` | {nom} a un rapport pour vous | {nom} has a report for you | un rapport d'autonomie **OUVERT** — en attente de votre décision — annoncé **une fois par session** ; le back ne tient aucun état lu / non lu, d'où ce déclencheur (tranché par l'orchestrateur le 2026-09-23 ; état N du canon : « Sal a un rapport du soir ») |
| `chrome.bandeau.trancher` | trancher | decide | le mot d'action en or, après une carte (le canon met « lire » en or) |
| `chrome.bandeau.lire` | lire | read | le mot d'action après un rapport (canon) |

- « du soir » tombe : un rapport arrive à toute heure, et la phase est déjà dans la barre.
- Sans genre présumé : « attend », « a » ne s'accordent pas ; `{nom}` est le nom servi du lieutenant.
- Aucun chiffre. S'il y a plusieurs cartes, le bandeau n'en nomme qu'une ; le compte en lettres existe déjà dans la file (⑨,
  `exceptions.file.attendent_encore`).
- **Qui passe en premier** (proposition, le canon ne l'écrit pas) : D > C > carte de la file > rapport. Un seul bandeau à la fois.
- **Durée** : le canon n'en donne aucune (du CSS, sans minuterie ; la doctrine dit « s'effacent »). Proposition : **5 s**, ou jusqu'au
  toucher. À ratifier avec le rendu.
- Les glyphes (✉ ⚠ 🚨 du canon) n'ont pas de langue (TD-644) : le client pose les siens (`[!]`), hors clé.

### 7.2 L'art et la géométrie — r9 B2, r9 M10, le gyrophare

**M10 — la hauteur de l'art : elle existe déjà, en 2400.**
`Tools/fal/generees/2026-09-06/decors/DISTRICT_D_{NUIT,JOUR}_1080x2400.png` (client, **non monté**) : mesuré, la source 1080×1920 montée
(`VERGE_D_*_FINAL.png`) y est **à l'identique de y = 480 à y = 2400** (écart **0,000**/255, nuit et jour ; décalé de 4 px : 7,0). Les
480 px du haut sont une extension de l'art.
- **Hauteur de l'art** : 2400 px. **Règle de pose unique** : l'art **calé en bas**. À 1920, l'écran montre les lignes 480..2400 de l'art,
  c'est-à-dire la source actuelle ; à 2400, il montre tout. Plus de bande unie ni de couture (r9 M10 : art posé de 240 à 2160).
- **Ancres** : la carte d'ancrage est écrite pour 1920. Dans l'art 2400, chaque `pivot_px` prend **+480 en y**, et
  `base_px_par_m.origine` aussi (`[515,757 ; 996,57]` → `[515,757 ; 1476,57]`). Aucun autre champ ne change (même caméra, même échelle).
- Montage : sous `Assets/Art/District/Backgrounds/` à côté des deux actuels, et `DistrictBackgroundSlots` pointé dessus. C'est un
  travail client ; l'atelier ne touche pas `Assets`.

**B2 — deux marqueurs sur sol nu : la cause est la carte d'ancrage, et la corriger demande Blender.**
- La carte (`VERGE_D_NUIT_FINAL.json`, profil « batiments-reels+semis-sur-empreinte », **51 parcelles**) sort de
  `~/project/atelier3d-mafia/parcelles.py`, qui importe `bpy`. Son propre en-tête le dit : la grille de **10 colonnes au pas de 6,5 m**
  est imposée au cadre de CAM_D, et « les colonnes hautes (x ≳ 6) débordent dans la zone quai/docks de la scène pour TOUT district
  verge ». C'est le Commerce-écran « sur le quai » de B2.
- Mesure déjà faite par `mafia-blender` le 07/09 (instrument `~/project/mafia-clean-city/scripts/mesure/ancres_v3.py`, `bpy` lui aussi) :
  **23 ancres sur 40 à plus de 3 m d'un bâtiment**. Ruling user : « tout doit être construit ».
- Les positions de B2 dans r9 (B06 (305, 947), B11 (148, 1496) en px de capture) ne tombent sur **aucun** `pivot_px` (le plus proche est à
  160 px) : elles sont dans le repère de la capture, pas dans celui du fond. Nommer les deux parcelles demande donc l'appariement de la
  capture (`reconcilier_ancres_ecran.py`).
- **La correction**, au signal seulement : régénérer la carte en ne gardant que les ancres dans une empreinte de bâtiment (la méthode
  des groupes de `ancres_v3.py` : union des boîtes, aire ≥ 12 m²). Critère d'acceptation : `ancres_v3.py` rend **0 ancre dehors**. Et
  l'écrire directement pour l'art 2400 (+480), pour ne pas faire deux fois le chemin.

**Le gyrophare (lot ①-4)** — mesuré sur la maquette, puis sur le fond du client.
- Au canon : `.gyro` = boîte de **60 × 36 CSS** à (23 %, 56,5 %) du téléphone. Le téléphone et le fond sont tous deux en 9:16 : le fond
  tient **1:1** (×2,7551). Dans l'art 1080×1920 : boîte **(248, 1085) – (414, 1184)**, soit 165 × 99 px, centre **(331, 1134)**, dégradé
  radial `#ff5a3cbb` → transparent à 70 %, teinte qui bascule en 0,9 s (`:72-76`), **caché le jour** (`:75`).
- Ce qu'il éclaire : dans ZO, la **voiture de police** peinte dans le fond (gyrophare du toit vers **(230, 988)**). La lueur est posée à
  101 px à droite et 146 px sous elle, sur le trottoir.
- Dans **D** (le fond du client), la voiture de police existe aussi, ailleurs : gyrophare du toit vers **(410, 975) ± 5 px** (mesuré sur
  le fond de jour, même caméra la nuit). Reporter le décalage du canon tomberait sur un **toit** dans D.
- **Proposition** : la lueur **centrée sur le gyrophare de la voiture de D**, à la taille du canon : centre **(410, 975)** dans l'art
  1920, **(410, 1455)** dans l'art 2400 ; 165 × 99 px dans l'art ; visible **seulement** si `heat.escalated`.
- Le jour : **tranché, le canon tient** (orchestrateur, 2026-09-23) — la lueur reste cachée le jour (`:75`). La question de l'allumer aussi
  le jour est close : sans signe dans le monde, la descente de jour est portée par le chrome (« DESCENTE » au médaillon, cerclage et filet
  qui battent, aiguille qui tremble — CLIENT-2 `881c17f6`) ; le joueur est informé.

### 7.3 Le point or de Famille (M21) : son sens **n'est écrit nulle part**

Lu dans la source et la note de la maquette :
- **La forme** : `.dockb small.disc` (`:117`), un disque de 8 CSS, `--or`, cerclé de `#0a0f17`, en haut à droite du rond ; posé sur
  **Famille** seulement (`:199`).
- **La note** (annotation 6, `:227-229`) : « Empire · Famille (**point or discret, pas de badge rouge**) · Marché · Plus ». Elle dit ce
  qu'il n'est pas (un badge rouge), pas ce qu'il signale.
- **La doctrine** (annotation 4, `:221-223`) : « Zéro badge permanent […] les événements arrivent en bandeaux éphémères (rapport d'un
  lieutenant, convocation) et s'effacent ». Le point est donc le seul signe qui **reste** : c'est une tension avec la doctrine, que la
  note ne résout pas.
- **Le seul indice**, et c'est une inférence, pas une source : dans le même état (N), le bandeau dit « ✉ **Sal** a un rapport du soir ».
  Sal est un lieutenant, et les lieutenants sont sous Famille.
- **Les registres** ne le disent pas non plus : `front.md` §4 A écrit « Famille (+ point or discret) », sans sens. Les juges l'ont lu
  chacun à leur façon : r2 (25/08) « notification, vraisemblablement pilotée par la donnée » ; juge-données (07/09, D7) « ● (6 en
  attente) ».
- ⇒ **À poser à l'user.** Les candidats servis aujourd'hui : un **rapport d'autonomie ouvert** (en attente de décision ; le back ne tient aucun état lu / non lu) (le plus proche de l'indice ; route
  `GET /v1/autonomy-reports`), ou des **cartes en attente** (`backlog_badge` / `queue` ; mais la file n'est pas le contenu de Famille).

### 7.4 Les arbitrages ouverts du r9 — d'abord dans les registres

| arbitrage (r9, via `e2bd7681` §3) | registre | état |
|---|---|---|
| **FILIÈRE contre MARCHÉ** | `front.md` §4 **A**, « TRANCHÉ — ruling user du 2026-08-25 » : « `Empire · Famille · Filière · Plus` […] « Marché » ne s'allume qu'au **jalon 4**, quand `screen_b1` existera […] Ne plus reposer cette question : elle est au registre. » Même dock dans `18-…` (dock ratifié). | **tranché** : FILIÈRE |
| **Format monétaire** | `Tools/juge-visuel/ARBITRAGES-user-2026-09-07.md` **point 10**, ratifié en bloc par f2 le 07/09 à 01:05 sous le ruling user du 30/08 : « **9 627 820 €**, sans centimes, espace fine insécable » ; point 19 : « $ 24 850 » dans les références = maquette en retard. | **tranché** |
| **Police** (Noto Serif contre DejaVu Serif) | même fichier, **point 18** : « **re-rendre les références avec DejaVu** » (le client embarque DejaVu, épinglé par un test ; routé à blender). `front.md` §4 J : un écart de police « s'arbitre », il ne se corrige pas. | **tranché** : c'est la référence qui change, au signal |
| **Flou de la plaque** (r9 m7) | **aucun registre** : ni `front.md` §4, ni `docs_int/06_open_decisions.md`, ni les arbitrages du 07/09, ni les fichiers de l'atelier de ce soir. Mesure : r8 m16, le vu-à-travers corrèle mieux avec l'art **brut** (0,136) qu'avec l'art flouté à 5 CSS (0,100) ; r9 : à l'opacité mesurée, on ne peut pas trancher. uGUI n'a pas de flou d'arrière-plan. | **pour l'user** : accepter la plaque sans flou, ou poser dessous une copie floutée de l'art |

Tranché aussi par les mêmes registres, et que l'écart de CLIENT-2 range encore dans « à trancher » :
- **Le fil du ratio** (M2 / D8) : point 6 du 07/09, « **(a)** bande portefeuille à 4 crans, **sinon (b)** retirer la barre — **jamais
  (c)** ». Tant que le back ne sert pas la bande (L3), c'est **(b)**.
- **La 3ᵉ statistique** : points 7 et 8 (HEAT LOCAL = bucket du district, en bande) — voir la réserve du §7.1 A.
- **L'heure** : point 16 (garder la phase, retirer l'heure du canon).
- **La référence de ①** : point 17, `ecran-canon-propre.png`.

⚠️ **Une contradiction à lever — les icônes du dock.** Le point **15** du 07/09 porte l'arbitrage user « **j'aime pas les icônes** », avec
la recommandation de mettre le canon à jour en ronds vides (et les dossiers de juge le citent comme « arbitrage user connu »). Le
23/09, F13 (`d8b7ae62`) a **monté** des icônes sur Empire, Famille et Plus, en laissant Filière vide « par choix de l'user ». Si l'user
a changé d'avis depuis le 07/09, il faut **l'écrire au registre**. Sinon, F13 va contre un arbitrage ratifié.

