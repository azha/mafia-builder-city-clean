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

## 5. Ce qui devrait être re-ratifié (par l'user)

1. **Le district de ①** : le canon montre ZO (v1), le client montre D. Garder D (le canon illustrait un district ; celui de ① dépend du
   joueur), ou monter ZO v2 comme district par défaut.
2. **La fiche de ①** : les trois cases en **bandes** (« Rapporte · Raccordée · Sain ») sous « REVENU · CHAÎNE · ÉTAT », au lieu de
   « $ 2 400 · $ 180/h · 12% » sous « À COLLECTER · REVENUS · HEAT LOCAL » ; et la ligne de type qui dit l'**installation**
   (« OPÉRATIONNEL ») au lieu de « Bar · Quartier général ». Écart assumé au code, jamais montré à l'user.
3. **Le heat** : quatre bandes servies (Froid · Tiède · Chaud · Brûlant) contre trois états au canon (37 % · 78 % chaud · 96 %
   descente) ; « CHALEUR » au lieu de « Heat » ; et l'état **Descente** (pouls, aiguille qui tremble, **gyrophare dans le monde**) qui
   n'existe pas au client — seule une teinte d'alarme à Brûlant. C'est le bloc que l'annotation 2 du canon met en avant (« l'état vit
   dans le monde, pas que dans le chrome »).
4. **L'horloge** : le canon montre « 21:40 » ; le client montre la phase seule (« JOUR 12 · Soirée »). La minute est servie à
   l'ouverture depuis F14 : l'afficher (une heure n'est pas un scalaire de simulation), ou ratifier la phase seule.
5. **Le « + $ » qui monte des bâtiments** (annotation 1 : « l'argent se voit gagner ») : absent du client. Le garder au canon (et le
   faire), ou le retirer.
6. **Un mot par type de bâtiment**, partout (§3.4) — et une orthographe en (*Specialized*).
7. **Les veto ouverts** qui touchent ① et ② : « la banque », « Ouvrir » (et sa famille, §4).
8. **Hors user, pour le client** : les **18 mots du chrome** et les **30 de la fiche de ①** n'ont pas de clé ; les **6 libellés anglais**
   de ② (« - Refine », « < Vehicle », « + Amount »…) sont en anglais dans l'écran fr. L'atelier écrit le fr et l'en de ces mots sur
   demande.

## 6. Ce qui part d'ici

- Ce document, et son annexe générée `22-annexe-mots-1-2.md` (201 sites, rejouable par `--controle`).
- `inventaire-22.py` (les mots de ① et ②, registre par registre) ; `apparier-fond-maquette.py` accepte désormais un `#id` (le fond posé en
  `style` d'un élément, comme dans `hud-brennar.html`).
- Aucun rendu, aucun asset, rien sous `Assets`.
