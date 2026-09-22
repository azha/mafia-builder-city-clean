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
| :961 / :965 | Upgrade holding tier / … | Agrandir la caisse / … — pas assez d'argent *(enseignes `money_holding` : Change, Crédit, Caisse)* |
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
| `TypeLabel` :1081-1091 | Lab · Stash · Front shop · Cash safehouse · Dealer-spot front · Specialized lab · Refinery · Grow house · Distribution hub · Money holding · Not converted | Labo · Réserve · Commerce-écran *(traduction maison, classe N)* · Planque · Coin de vente · Labo spécialisé · Raffinerie · Serre · Relais · Caisse · Pas aménagé |
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
