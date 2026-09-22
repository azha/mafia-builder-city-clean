# ④ Les libellés d'action restés en anglais — copie FR, par écran, avec le cadre

Atelier / DA, 2026-09-22, sur `main` à `9b5d6117`. Population : `Tools/chaines-joueur.py --json` (1140 chaînes) filtrée sur les chaînes sans marqueur français, complétée à la main par les deux seams que l'outil ne voit pas (`DetailRow(...)` sur ③, les fonctions de libellé `…Label()` de ②). Lignes de `9b5d6117`.

**Deux classes, comme TD-644 le demande** : (a) ce que le client écrit lui-même — un libellé, un bouton, une raison, un titre de ligne : c'est ici, mot français côté client ; (b) ce qui TRADUIT une valeur de bande servie par le back (`minor`, `elevated`, `Basic`, `Scheduled`…) : c'est une entrée de catalogue, sa clé doit être servie avant le repointage (piège TD-643). Les (b) sont livrés en annexe, pour f7, pas pour un repointage client.

**Règle d'état vide** (TD-644, le manomètre déjà corrigé) : « Unavailable », « Unknown », « No banner », « No active alerts » ne se traduisent pas — un tiret n'a pas de langue. Quand l'état vide a un NOM dans la maquette, on prend le nom (« Rien à signaler », ⑱·21).

---

## ③ La carte — `CityMap/CityMapController.cs`, `DistrictCellView.cs` — cadres 22, 23, 24

Le cadre 23 dessine la bande du quartier : `Les Bassins | rive nord · le port · 37 blocs | tiède | ⚑ descente en cours · précinct 1 en chasse`. Le cadre 24 : « Chaque quartier a son tissu », « nappes de chaleur, ⚑, écussons ». Le panneau de détail du client (`BuildDetail`, :1049-1150) n'est pas dessiné en série 6 : ses libellés prennent les mots que les autres écrans ont déjà posés.

| ligne | aujourd'hui | ratifié | d'où vient le mot |
|---|---|---|---|
| :1016 | District {districtId} | Quartier {districtId} *(mieux : le nom, `CityMapEnums.DisplayName`)* | c22 « dix-huit quartiers » |
| :1052 | Profile | Tissu | c24 |
| :1053 | Blocks | Blocs | c23 |
| :1054 | Bank (+ `north`/`south` bruts) | Rive (+ « nord » / « sud ») | c23 « rive nord » |
| :1055 | Control | Contrôle | — |
| :1060 | Projections / sign-in required | Relevés / ouvrez une session | — |
| :1043 | n/a (not ticked) | pas encore relevé | — (état nommé, jamais « n/a ») |
| :1074-1076 | Heat — district / Heat — citywide / Heat — escalated (YES / no) | Chaleur — le quartier / Chaleur — la ville / Descente (oui / non) | c23 « ⚑ descente en cours » |
| :1078 | Heat | Chaleur | HUD |
| :1082 | Flow backpressure | Refoulement | ㉚ « la conduite qui refoule » |
| :1088-1089 | Exposure / Network cleanliness | Exposition / Propreté du réseau | ㊵·137 « propres » |
| :1091 | Throughput | Débit | — |
| :1095 | Stash blocking | Réserve qui bloque | ㊵ « planque », ② « Réserve » |
| :1101-1104 | Buffer load / Buffer tail / Buffer | Tampon — charge / Tampon — traîne / Tampon | — |
| :1110-1113 | Inspection queue / Dispatcher regime | File d'inspection / Régime du dispatch | ⑮·32 « le registre de dispatch » |
| :1117 | Audit pins | Épingles d'audit | ⑪ « Audit pin » |
| :1121 | Deal leks | Coins de vente | ㉜·78 « les contestations de coin », ㉟ « coin » |
| :1125 | Cohesion | Cohésion | — |
| :1137 | Police belief (P{n}) | Ce qu'ils croient (précinct {n}) | ⑰:168 « CE QU'ILS CROIENT », c31 « PRÉCINCT 1 » |
| :1141 | Patrol heat (P{n}) | La patrouille (précinct {n}) | ⑰:171 « LA PATROUILLE » |
| :1145 | Citizen whisper (city) / Citizen whisper | Ce qui se dit (la ville) | ㊳·125 « ce qui se dit ce matin » |
| `DistrictCellView:55` | {profile} brut | → ② (six mots de tissu) | c23 |

## ④ L'accueil — `Operational/Dashboard/DashboardController.cs` — aucune maquette ; cadres les plus proches ⑱·20/21 « Le Bureau » (La chaufferie · Les télégrammes · Le registre du matin · La planche d'ordres · La ville · Les commissariats · Le coffre) et ⑨·11 (« Personne ne fait la queue — la routine tient »)

| ligne | aujourd'hui | ratifié |
|---|---|---|
| :389, :398 | Citywide heat | Chaleur de la ville |
| :398 | Unavailable | — *(état vide, comme ARGENT —)* |
| :391 | Escalation / Escalating / Steady | Descente / en cours / rien en cours |
| :405 | Vocabulary / Tier {n} — {…} | Palier / Palier {n} — {…} *(㉒·95 « PALIER »)* |
| :423 | Wallet unavailable | — *(la légende :425 dit déjà « Le portefeuille n'a pas répondu. »)* |
| :441-445 | Heat escalating citywide / Citywide heat BURNING / Citywide heat HOT / Exceptions waiting / Autonomy reports waiting | Descente en cours en ville / La ville brûle / La ville est chaude / Des exceptions attendent / Des rapports d'autonomie attendent |
| :446 | No active alerts | Rien à signaler *(⑱·21)* |
| :456 | Alerts | Alertes |
| :467-471 | City Map / Building Card / Exceptions / Autonomy | La carte / La fiche / L'ardoise / Les télégrammes *(c22 « La Carte » ; ㉝·80 « fiche du site » ; ⑨·9 « Exceptions — l'ardoise » ; ⑱·20 « Les télégrammes · deux rapports d'autonomie »)* |

## ② La fiche du bâtiment — `Operational/BuildingCard/BuildingCardController.cs` — aucune maquette de série 4/6 ; HUD de Brennar (COLLECTER · BLANCHIR · AMÉLIORER), ㉝·80 (fiche du site), ㉚·48 (« Commander de la matière première · EN COMMANDER »), ㉞·85 (« Lancer une cuisson », « Envoyer un coursier »), ㉘·54 (« On choisit d'où ça part, où ça va »), ㊵·140 (« INJECTER »), ㉕·92-94 (« RÉSERVÉ », « honoré », « le rendez-vous est passé »)

### (a) ce que le client écrit — boutons, raisons, titres de ligne

| ligne | aujourd'hui | ratifié |
|---|---|---|
| :862 | ACTIONS | ACTIONS *(français aussi ; ou « GESTES », ㉞·85 — au choix du client, un seul mot partout)* |
| :889 | Repair (insufficient cash) | Réparer — pas assez d'argent |
| :909 / :913 | Upgrade lab tier / … (insufficient cash) | Agrandir le labo / Agrandir le labo — pas assez d'argent |
| :935 / :939 | Upgrade hub tier / … | Agrandir le relais / … — pas assez d'argent *(㉚·50 « le relais du milieu »)* |
| :961 / :965 | Upgrade holding tier / … | Agrandir la banque / … — pas assez d'argent *(corrigé le 2026-09-22 : j'avais écrit « la caisse », qui est la caisse du dealer — voir d4)* |
| :976 | Order Pyralin | Commander du pyralin *(㉚·48)* |
| :977 | Start Cook | Lancer une cuisson *(㉞·85)* |
| :984 | Start Ash Cook | Lancer une cuisson d'ash |
| :987 | Honor appointment | Honorer le rendez-vous *(㉕·93)* |
| :991 | Inject (launder) | Injecter *(㊵·140)* |
| :1009 / :1014 | Tend crop / Tend crop (already tended this stage) | Soigner la culture / Soigner la culture — déjà fait à ce stade *(㉕·36-38 la chambre de pousse)* |
| :1026 | Plant | Planter *(:2021 « PLANTER — choisir une culture » existe déjà)* |
| :1037 / :1041 | Dispatch courier / … (choose a source + destination) | Envoyer un coursier / Envoyer un coursier — choisissez d'où ça part et où ça va *(㉞·85, ㉘·54)* |
| :1057 / :1058 | Deposit cash / Withdraw cash | Déposer / Retirer |
| :1068 | Convert | Aménager *(㉝·83 « Ce qu'on peut y mettre »)* |
| :630 | Operational — Yes / No | En service — oui / non |
| :629, :632 | Setup / Cover | Mise en place / Couverture |
| :649, :652 | Structure / Raid risk | Structure / Risque de descente |
| :660 | Alert · Raided — seized {…} | Alerte · Descente — saisi : {…} |
| :673, :675 | Substance / Temperature | Substance / Température |
| :678 | Cold chain — Degrading / Stable | Chaîne du froid — se dégrade / stable |
| :704, :714 | Lab tier / Purity | Taille du labo / Pureté |
| :724, :726 | Appointment / Payout | Rendez-vous / Gain *(㉕·92 « GAIN »)* |
| :743, :746, :750 | Crop / Grow stage / Husbandry | Culture / Pousse / Soin |
| :770, :778 | Hub tier / Roster | Taille du relais / Équipe |

### (b) annexe — bandes servies, traduites par le client (clé au back d'abord, pour f7)

| fonction | valeurs EN (ordre du code) | FR ratifié |
|---|---|---|
| `TypeLabel` :1081-1091 | Lab · Stash · Front shop · Cash safehouse · Dealer-spot front · Specialized lab · Refinery · Grow house · Distribution hub · Money holding · Not converted | Labo · Réserve · Commerce-écran *(traduction maison, classe N)* · Planque · Coin de vente · Labo spécialisé · Raffinerie · Serre · Relais · **Banque** *(corrigé le 2026-09-22 — j'avais écrit « Caisse », servi tel quel sous `building.type.money_holding` ; voir d4)* · Pas aménagé |
| `SeizedLabel` | a heavy haul · a moderate haul · a light haul · nothing | une grosse prise · une prise moyenne · une petite prise · rien |
| `RepairCostLabel` | major cost · moderate cost · minor cost · no cost | gros frais · frais moyens · petits frais · sans frais |
| `LabTierLabel` :1250 | Basic · Refined · Master | Simple · Affiné · Maître |
| `PurityLabel` :1277 | Cut · Standard · Pure · Crystalline | Coupée · Courante · Pure · Cristalline |
| `AppointmentStatusLabel` :1313 | Scheduled · Honored · Expired | Réservé · Honoré · Passé *(㉕·92-94, mot pour mot)* |
| `PayoutLabel` :1333 | Pending · Lost · Modest · Fair · Strong · Premium | En attente · Perdu · Modeste · Correct · Fort · Exceptionnel |
| `GrowStageLabel` | Early · Mid · Late · Ready to harvest | Début · Milieu · Fin · À récolter |
| `HusbandryLabel` | Withered · On track · Thriving | Flétrie · En bonne voie · Florissante |
| `GrowablePrecursorLabel` | Verdant root · Lull resin · Glass lily | Racine verdoyante · Résine de lull · Lys de verre *(`generateur-labo.py`)* |
| `HubTierLabel`, `MoneyHoldingTierLabel` | Small · Medium · Large · Major · Max | Petit · Moyen · Grand · Majeur · Maximal |
| `RosterLabel`, `CapacityLabel` | Open · Busy · Full | Ouverte · Occupée · Pleine |
| `VehicleLabel` | Foot · Bike · Car | À pied · Vélo · Voiture *(㉘·54 « à pied »)* |
| `HeldLabel` | Empty · Low · Moderate · High · Massive | Vide · Peu · Moyen · Beaucoup · Énorme |
| `TransferAmountLabel` | Pocket · Small · Medium · Large | De poche · Petit · Moyen · Gros |
| déjà keyées (`Cle(…)` :1097-1118) — pour le bundle : | Operational · In setup · Not converted / Strong · Standard · Weak · None / Intact · Damaged · Repairing / Low · Elevated · High · Imminent | En service · En cours d'aménagement · Pas aménagé / Solide · Correcte · Faible · Aucune / Intact · Abîmé · En réparation / Faible · Élevé · Fort · Imminent |

## ⑥ La famille — `Operational/Lieutenant/LieutenantScreenController.cs` — `ecrans-brennar.html` organigramme (« La Famille ») ; les bandes de cet écran sont déjà en français (« S'installe vite », « Petit gain de rendement »)

| ligne | aujourd'hui | ratifié |
|---|---|---|
| :2862 | Loading lieutenant… reopen Reassign once the card has loaded. | Le lieutenant arrive… rouvrez « Réaffecter » quand sa fiche est là. |
| :2866 | Confirm reassignment? It resets tenure and starts a settling window. | Confirmer la réaffectation ? Son ancienneté repart de zéro, et il lui faudra le temps de s'installer. |
| :2868 | Projected settling: {…} | Installation prévue : {…} |
| :2870 | Tenure forfeited: {…} | Ancienneté perdue : {…} |
| :2871 | Yield bonus lost: {…} | Rendement perdu : {…} |
| :3405 | NONE *(valeur du cycleur AND_IF quand aucune condition)* | aucune *(le token AND_IF lui-même est ratifié, classe R)* |
| :1682 | 1 LIEUTENANT / n LIEUTENANTS | déjà français — pluriel ICU, TD-542, rien à faire ici |

## ⑨ ⑩ L'ardoise — `Operational/Exceptions/ExceptionQueueController.cs`, `ExceptionDetailController.cs`, `Shell/ExceptionQueuePanelController.cs` — cadres 9-13

| ligne | aujourd'hui | ratifié | cadre |
|---|---|---|---|
| `ExceptionQueueController:509` | EXCEPTIONS *(en-tête de l'état de panne)* | L'ARDOISE | ⑨·9 « Exceptions — l'ardoise » |
| `ExceptionDetailController:566` | EXCEPTION | SA MAIN | ⑩·10 « Exception — l'ardoise : sa main » |
| `ExceptionQueuePanelController:235` | See all exceptions | Voir l'ardoise › | ⑨·9 « sa main : 5 autres issues › » |

## ⑤ La décision du jour — `Shell/HighestLeverageCardController.cs` — cadres 4-8 (« Décision du jour — la table : … après le tampon »)

| ligne | aujourd'hui | ratifié |
|---|---|---|
| :237 | Commit (hold) | Tamponner — appui long *(⑤·7 « après le tampon » ; ⑨·9 « suggéré · appui long »)* |

## Chrome partagé — `Shell/HomeChromeController.cs`, `Shell/OrgVitalsPanelController.cs` — le bandeau des cadres 22-24 (« ARGENT · Tiède · CHALEUR · JOUR 26 · Nuit »), ⑭·14-19 (« Compression — la chaufferie »)

| ligne | aujourd'hui | ratifié |
|---|---|---|
| `HomeChrome:132` | Compression week: {état} / No banner | La chaufferie — {état} / *(rien : pas de bandeau, pas de texte)* |
| `HomeChrome:138` | Pressure: {…} + Normal · Warning · Saturated · Unknown | Pression : {…} + normale · tendue · saturée · — *(bandes servies : classe (b), clé au back)* |
| `OrgVitals:154-162` | Heat / Friction / Stress | Chaleur / Friction / Tension |
| `OrgVitals:192` | Heat: Unavailable ({raison}) | Chaleur : — ({raison}) |
| `OrgVitals:70, :104` | not requested yet / no answer | pas encore demandée / pas de réponse |

## ⑪ Le coffre (blanchiment) — `Operational/Laundering/LaunderingController.cs` — aucune maquette ; ㊵·137 (« étapes · propres · écarts »)

| ligne | aujourd'hui | ratifié |
|---|---|---|
| :218 | Cleanliness | Propreté |
| :222 | Deviation — Audit pin active / Conforming | Écart — épingle d'audit posée / dans les clous |
| :250 | Inject (launder) | Injecter |

## ⑮ Les inspections — `CitySim/Inspection/InspectionScreenController.cs` — cadres 31-35 (le registre de dispatch nomme les quartiers : « Les Bassins·2·3 »)

| ligne | aujourd'hui | ratifié |
|---|---|---|
| :168, :173, :316 | district {id} | le nom du quartier (`CityMapEnums.DisplayName`) ; repli « quartier {id} » |

## ㉔ Les télégrammes (autonomie) — `Operational/Autonomy/AutonomyInboxController.cs` — cadres 25-30

| ligne | aujourd'hui | ratifié |
|---|---|---|
| :338 | `option.label_key` brut | les 18 clés de ⑤ (bundle) |
| :372-375 | [~] Minimal · [<>] Arbitrage · [!] Exposition accrue · [$] Coût d'opportunité | conséquence minime · un compromis · on s'expose · on laisse passer quelque chose *(㉔·26 : « consequence minime », « un compromis » ; les deux autres au même registre)* |

---

## Compte

Classe (a), écrite par le client : **③** 26 libellés · **④** 14 · **②** 36 · **⑥** 6 · **⑨⑩** 3 · **⑤** 1 · chrome 7 · **⑪** 3 · **⑮** 1 · **㉔** 4 = **101 chaînes**, dont ~50 sont des libellés d'ACTION ou de raison (le périmètre nommé par TD-649 classe A) et le reste des titres de ligne du même geste. Classe (b), annexe : 15 fonctions de bande sur ② + 1 sur le chrome, à keyer au back avant tout repointage.

---

## Annexe c — ce que la tranche 1 du client (`75ac1001`) a laissé à l'atelier, pour la tranche 2

Ajoutée le 2026-09-22 après la tranche 1 du lot D. Lignes lues au commit `75ac1001` (branche `gate/cumul-client-2026-09-22`).

### c1. Le bouton de réparation — ② `BuildingCardController.cs:883`

Proposé par le client : `Réparer ({bande})`. **Remplacé** par :

| bande servie | bouton |
|---|---|
| `MAJOR` | Réparer · gros frais |
| `MODERATE` | Réparer · frais moyens |
| `MINOR` | Réparer · petits frais |
| `NONE` | Réparer · sans frais |

- Pourquoi : dans la maquette, un qualificatif suit le verbe après ` · ` sur une seule ligne (⑨·9 « suggéré · appui long », ㉞·85 « 4 ordres · cuisson, appro, deux passages ») ; la parenthèse n'est pas une forme de texte joueur de la maison. Le verbe est celui de la raison (« Réparer — pas assez d'argent », ratifiée plus haut, même forme que les trois « Agrandir … — pas assez d'argent »).
- ⚠️ À `75ac1001` le bouton rend « Réparer (major cost) » : la bande passe encore par `RepairCostLabel`, qui est en annexe (b), donc à keyer au back d'abord. **Tant que la clé n'est pas servie, le bouton dit « Réparer » seul** — jamais une bande anglaise.

### c2. Les messages de `RunAction` — ② `BuildingCardController.cs:350-590`

Forme rendue : `{succès}` si la route répond 2xx, sinon `{échec} — {raison}` (`RunAction`, `:591-605`). Les quatre demandés :

| EN (`75ac1001`) | FR |
|---|---|
| Repair underway | Réparation lancée |
| Repair unavailable | Impossible de réparer |
| Conversion requested | **avec** « Aménager » : Aménagement demandé · **sans** : Ouverture demandée |
| Convert unavailable | **avec** : Impossible d'aménager · **sans** : Impossible d'ouvrir |

**Le verbe de Convert, sans « Aménager » (sous veto user) : « Ouvrir ».** On ouvre un labo, une planque, un commerce ; la maquette l'emploie pour une installation (㊵·140 « Une première injection **ouvre** la filière »). ⚠️ Le choix vaut pour **toute la famille à la fois**, sinon la fiche se contredit d'une ligne à l'autre :

| où | avec « Aménager » | sans (recommandé tant que le veto tient) |
|---|---|---|
| bouton `Convert` (annexe a, `:1068`) | Aménager | Ouvrir |
| succès / échec | Aménagement demandé / Impossible d'aménager | Ouverture demandée / Impossible d'ouvrir |
| `SetupLabel` (annexe b, clé `setup`) `OPERATIONAL` · `IN_SETUP` · `NOT_CONVERTED` | En service · En cours d'aménagement · Pas aménagé | Ouvert · Ouverture en cours · Pas encore ouvert |
| `TypeLabel` « Not converted » (annexe b) | Pas aménagé | Pas encore ouvert |

**Les douze autres paires du même `RunAction`** — hors de la question posée, mais sur la même ligne de code et absentes de ④ elles aussi ; données ici pour que la tranche 2 n'ait pas à revenir :

| EN | FR succès | FR échec |
|---|---|---|
| Ordered Pyralin / Order failed | Pyralin commandé | Impossible de commander |
| Cook started / Cook unavailable | Cuisson lancée | Impossible de lancer la cuisson |
| Ash cook started / Cook unavailable | Cuisson d'ash lancée | Impossible de lancer la cuisson |
| Cash injected / Inject unavailable | Argent injecté | Impossible d'injecter |
| Lab tier upgraded / Upgrade unavailable | Labo agrandi | Impossible d'agrandir |
| Hub tier upgraded / Upgrade unavailable | Relais agrandi | Impossible d'agrandir |
| Holding tier upgraded / Upgrade unavailable | Banque agrandie *(corrigé, d4)* | Impossible d'agrandir |
| Appointment booked / Booking unavailable | Rendez-vous réservé | Impossible de réserver |
| Appointment honored / Honor unavailable | Rendez-vous honoré | Impossible d'honorer le rendez-vous |
| Planted / Plant unavailable | Planté | Impossible de planter |
| Tended / Tend unavailable | Culture soignée | Impossible de soigner la culture |
| Courier dispatched / Dispatch unavailable | Coursier parti | Impossible d'envoyer le coursier |
| Cash deposited / Deposit unavailable | Argent déposé | Impossible de déposer |
| Cash withdrawn / Withdraw unavailable | Argent retiré | Impossible de retirer |

Mots pris à la maquette : « commander » (㉚·48), « lancer une cuisson » (㉞·85), « injecter » (㊵·140), « réservé » / « honoré » (㉕·92-93), « un coursier est parti » (㉘·55) ; « agrandir », « relais » : annexe (a) ; « banque » : d4.

**c2-bis. Ce qui suit le tiret — mesuré, et c'est un défaut de sens.** À `75ac1001`, `{raison}` est le `message` de DÉVELOPPEUR de l'enveloppe d'erreur du back (anglais), ou `request failed (N) …` quand il manque (`BuildingCardClient.cs`, `ReadableError`). Mes quatre formes françaises seraient donc suivies d'une phrase anglaise ou d'un code HTTP — la classe C que ① a déjà close (« la raison nommait un verbe HTTP »). **Règle** : `{échec} — {texte de user_facing_i18n_key}` quand le bundle connaît la clé (64 clés `error.*` servies en français, ex. `error.compression.budget_exhausted` « Il n'y a plus de place pour ceci aujourd'hui. Reprenez demain. ») ; sinon `{échec}.` seul. Jamais le `message`, jamais un code. Le câblage est au client ; la règle de texte est celle-ci.

### c3. Le cadenas des primitives — `RuleModel.cs:209-212` (`MakeLabel`)

| cas (code du back) | EN | FR |
|---|---|---|
| `tier >= 2` — `TIER_NOT_UNLOCKED` | `{TOKEN}  🔒 Tier {n}` | `{TOKEN}  🔒 palier {n}` |
| `tier == 1` — `NOT_SUPPORTED_YET` | `{TOKEN}  🔒 soon` | `{TOKEN}  🔒 pas encore` |

- « palier » est le mot de la maquette (㉒·95 « PALIER », ㉞·88 « monter d'un palier ») ; en minuscule après le cadenas, comme une légende.
- « soon » promettait une date que le back ne donne pas : `NOT_SUPPORTED_YET` veut dire « pas dans ce build ». « pas encore » est la forme maison de ce trou (①, ㉒, ⑲).
- `{TOKEN}` (TIME, LIFECYCLE, PEER_EVENT…) reste tel quel : c'est le jeton de la grammaire que le joueur écrit (classe R, ratifié).

### c4. ㉔ — les glyphes `[~] [<>] [!] [$]` devant les conséquences

**Retirés.** Les quatre conséquences sont posées dans une seule couleur (`outcomeText.color = TextSecondary`, `AutonomyInboxController.cs:351`) : le glyphe ne double aucune couleur, le mot porte déjà le sens (la règle F2 « la couleur n'est jamais seule » est tenue par le mot), ㉔·26 n'en dessine aucun, et `[<>]` / `[$]` sont des codes privés qu'aucun joueur ne sait lire.
⚠️ Ce n'est pas la règle de ⑨ : là, `[!!!]` double une échelle de gravité portée par la couleur, et il reste.
⛔ **Correction du 2026-09-22 (mesurée sur la table des orphelines, `4bddb0aa`)** : j'avais écrit que le retrait changeait la clé dérivée. C'est faux — le slug ignore le glyphe (`autonomie.etat.consequence_minime` dérive de « [~] conséquence minime »). **La clé ne change pas ; c'est la VALEUR servie qui doit perdre le glyphe**, sinon `Libelle.De` le ramène à l'écran par le bundle. Les valeurs fr et en sans glyphe sont dans `07-orphelines-en.md`.

**Compte de l'annexe c** : 1 bouton (4 bandes) · 4 messages demandés (+ la famille « Ouvrir », 6 entrées) · 28 messages en complément (14 paires) · 1 règle de raison · 2 légendes de cadenas · 1 décision de glyphes.

---

## Annexe d — hors annexe c, signalé par le client après la tranche 2 (`7d675f9c`)

Lignes lues à `7d675f9c`.

### d1. ⑪ `LaunderingController` — son propre `RunAction` (`:173-174`, `:185-186`)

Même forme de rendu que ② : `{succès}`, ou `{échec} — {raison}` (la règle c2-bis s'applique : après le tiret, le texte de
`user_facing_i18n_key` quand le bundle le connaît, sinon l'échec seul).

| EN | FR succès | FR échec |
|---|---|---|
| Cash injected / Inject unavailable | Argent injecté | Impossible d'injecter |
| Float collected / Collect unavailable | La caisse a rejoint votre planque. | Impossible de ramasser |

- « Argent injecté » : la même paire que ② (annexe c2) — un geste, un mot, sur les deux écrans.
- « Float » est la caisse du DEALER (le geste verse l'argent sale d'un dealer dans la planque). Le client a déjà une phrase pour ce
  geste exact : « La caisse a rejoint votre planque. » (`SellingScreenController.cs:251`, ㉟) — reprise telle quelle. L'intérieur du
  district dit le même geste autrement (« Caisse confiée à la planque. », `DistrictInteriorScreenController.cs:2408`) : à aligner sur
  la phrase de ㉟ au même lot. « ramasser » est le verbe de ㉟·109.

### d2. ② le sélecteur de culture — `« < Crop »` / `« Crop > »` (`:2045`, `:2054`)

**« ‹ » et « › »**, seuls. La ligne porte déjà son titre (« PLANTER — choisir une culture ») et la valeur sitôt au centre (« Racine
verdoyante »…) : le bouton n'a qu'à dire la direction. Le chevron simple est le signe de la maison (⑨·9 « sa main : 5 autres
issues › », ⑱ « › », ㉜ « ◂ »). Si le client veut un mot (cible tactile étroite, trois contrôles sur 300 CSS) : « ‹ Culture » /
« Culture › », EN « ‹ Crop » / « Crop › ».

### d3. Complément, hors question — six titres de ligne de ② encore anglais à `7d675f9c`, et la garde de saisie

Ils manquaient dans mon annexe a (les lignes du relais et du coffre d'argent propre, après `:778`) ; ils sont servis en anglais dans les
deux locales. En les réécrivant, leur slug change : ils entreront dans la prochaine table des orphelines — `fr` et `en` sont donnés ici.

| ligne (`7d675f9c`) | EN aujourd'hui | FR | EN |
|---|---|---|---|
| `:795` | Vehicles | Véhicules | Vehicles |
| `:816` | Holding tier | Taille de la banque *(voir d4)* | Vault size |
| `:824` | Held | En dépôt | On deposit |
| `:831` | Capacity | Capacité | Capacity |
| `:838` | Yield | Rendement | Yield |
| `:850` | Forfeiture | Saisie | Seizure |

Les valeurs qui vont avec :

| où | EN aujourd'hui | FR | EN |
|---|---|---|---|
| `YieldLabel` (clés `yield`, déjà keyées) `IDLE` · `EARNING` | Idle · Earning | rien ne rentre · ça rapporte | nothing coming in · earning |
| `:848` (`IMMINENT`) | Under audit (imminent) — withdraw or diversify NOW | Audit imminent — retirez ou répartissez maintenant | Audit imminent — withdraw or spread it out now |
| `:849` (`PENDING`) | Under audit (pending) — withdraw or diversify to react | Audit en vue — retirez ou répartissez pour réagir | Audit coming — withdraw or spread it out to react |

« rien ne rentre » est le mot de ㉟·111 ; « audit » celui de ㊴ (« RISQUE D'AUDIT ») ; les capitales « NOW » ne passent pas en français
(la maison ne crie pas : l'urgence est portée par `[!!]` et la couleur sévère, déjà sur la ligne).

### d4. ⛔ Le nom de `money_holding` — une collision que j'ai créée, mesurée puis tranchée

**Le problème.** L'annexe b donnait « Caisse » au type `money_holding` (le bâtiment où l'argent PROPRE est déposé et rapporte), et
l'annexe a « Agrandir la caisse ». Or « caisse » est partout ailleurs la caisse du DEALER. ⛔ Et le mot est déjà SERVI : f7 l'a posé
sous `building.type.money_holding` dans sa passe des bandes (mesuré par f7 à `ea215ce9`, :3163-3164) — si bien que le back donne à ce
seul type **deux noms français** (« Coffre » par `district.type_batiment.coffre`, « Caisse » par `building.type.money_holding`) et deux
anglais (« Vault », « Money holding »). Ma première table d4 ne citait que le premier ; corrigé ci-dessous.

**Le critère** (orchestrateur, 2026-09-22) : un mot compris par un joueur sans glossaire, et qui n'a AUCUN autre emploi dans le corpus —
mesuré sur les trois supports, contrôle positif d'abord. **Instrument** : `Tools/atelier-2026-09-22/mesurer-mot-money-holding.py`
(maquettes `atelier3d-mafia` en nœuds de texte seulement ; littéraux de `Assets/Scripts` sans commentaires ; littéraux de
`string_table.ts`, clés exclues), lancé sur atelier `20d006d` · client `7d675f9c` · back `ea215ce9` :

| mot | maquettes | client | back | ce que le mot désigne aujourd'hui |
|---|---|---|---|---|
| **caisse** (contrôle positif) | 30 | 12 | 10 | la caisse du DEALER (㉟ ×18, `Selling`, `CityProjectionsClient:139`, `DistrictInterior:2408`, back `:2042-2047`) · les caisses du labo (cadres 39-44, « Le labo ») · la caisse de la vitrine (㉓·99) · la caisse déclarée d'une façade (⑯·0) · **et `money_holding`** (② `:562`, `:972`, `:976`, `Distribution:232`, back `building.type.money_holding` :3164) — ✅ l'instrument voit le corpus |
| **coffre** | 15 | 3 | 1 | le COMPTE du joueur (㉒/㉖ « VOTRE COFFRE », « FERMER LE COFFRE » ×7 ; ㉑·105-106 « ça se rouvre au Coffre ») · le MENU (⑱·20-21 « Le coffre ») · l'ancien ⑪ (`ecrans-brennar.html` c2 « Coffre — tableau de bord » ×3) · **et déjà `money_holding`** (③·24 « le labo, la planque, la façade, le coffre », `DistrictInteriorScreenController.cs:1735`, `LibellesBatiment.cs:30`, back `district.type_batiment.coffre` = « Coffre », ② `:2133`) |
| coffre-fort | 3 | 0 | 0 | le menu ⑱ (« Le coffre-fort = compte · réglages · boutique ») |
| officine | 0 | 0 | 0 | — |
| **banque** | **0** | **0** | **0** | — |
| *EN* bank | 0 | 1 | 2 | la RIVE (`CityMapController.cs:511` « Banks », back « North bank » / « South bank ») |
| *EN* **vault** | 0 | 0 | 1 | **`money_holding` lui-même** (`district.type_batiment.coffre` EN = « Vault ») — aucun autre emploi |

**La décision, dans l'ordre du critère :**
1. **« coffre » collisionne** : il nomme déjà trois objets — le compte du joueur, le menu, l'ancien ⑪ — en plus de `money_holding`. Un
   joueur qui lit « Le coffre » dans le menu puis « Coffre » sur un bâtiment de la carte ne peut pas savoir qu'il s'agit de deux choses.
2. **« l'officine » est rejetée** sans collision : 0 emploi, mais en français courant le mot dit d'abord une pharmacie ou un atelier
   clandestin — il demande le glossaire que le critère interdit.
3. ⇒ **« la banque »**, troisième candidat, mesuré : **0 emploi sur les trois supports**, compris de tous, et c'est ce que le bâtiment
   EST dans le jeu : on y dépose, ça rapporte, un audit peut le saisir (d3 : « En dépôt », « Rendement », « Saisie », « Audit
   imminent ») ; ses enseignes servies le disent déjà (« Crédit Hara », « Prêts Dorne », « Épargne Sallo », « Change Voss »).
4. **EN : « vault »** — pas « bank », qui en anglais nomme déjà la RIVE sur la carte et dans le registre. « Vault » n'a qu'un emploi
   dans le corpus, et c'est ce type même : l'anglais ne change pas.

**Les sites à changer ensemble** — onze, pas cinq : la mesure a trouvé le nom « Coffre » déjà posé sur ce type, et f7 le « Caisse »
qu'il avait servi depuis mon annexe b.

| support · site | aujourd'hui | FR | EN |
|---|---|---|---|
| client `BuildingCardController.cs:1101` (`TypeLabel`) | Money holding | Banque | Vault |
| client `:972` bouton · `:976` raison | Agrandir la caisse · … — pas assez d'argent | Agrandir la banque · … — pas assez d'argent | Enlarge the vault · … — not enough money |
| client `:562` succès | Caisse agrandie | Banque agrandie | Vault enlarged |
| client `:816` titre de ligne | Holding tier | Taille de la banque | Vault size |
| client `:2133` légende du montant | MONTANT DU TRANSFERT — le coffre a le dernier mot | MONTANT DU TRANSFERT — la banque a le dernier mot | TRANSFER AMOUNT — the vault has the last word |
| client `DistributionScreenController.cs:232` | la caisse | la banque | the vault |
| client `DistrictInteriorScreenController.cs:1735` | Coffre (clé `district.type_batiment.coffre`) | Banque (nouvelle clé dérivée `district.type_batiment.banque`) | Vault |
| client `LibellesBatiment.cs:30` | Coffre | Banque | — (littéral sans clé) |
| back `string_table.ts` `district.type_batiment.coffre` (FR `:2525` · EN `:922` à `ea215ce9`) | Coffre · Vault | nouvelle clé `district.type_batiment.banque` : Banque · Vault | — |
| back `string_table.ts` `building.type.money_holding` (FR `:3163-3164` · EN `:1560-1561` à `ea215ce9`) | Caisse · Money holding | Banque · Vault — même clé, valeurs remplacées (tranché par l'orchestrateur, passe de f7) | — |
| atelier `ecrans-brennar-6.html` ③·24 (légende « le labo, la planque, la façade, le coffre ») | le coffre | la banque | — |

- `district.type_batiment.coffre` deviendra orpheline au changement du littéral (le slug change) : elle entrera dans la prochaine
  table des orphelines du client, comme les autres.
- Le compte du joueur (㉒/㉖ « VOTRE COFFRE »), le menu (⑱ « Le coffre ») et la caisse du dealer (㉟) **ne changent pas** : ce sont
  eux qui gardent « coffre » et « caisse ».
- L'user garde son veto. Le changement de la maquette ③·24 part avec la vague du client, pas avant.
