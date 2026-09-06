| # | information | B | M | F | statut | classe | preuve |
|---|---|---|---|---|---|---|---|
| 1 | Jour de jeu | opened_game_day | M7a | JOUR 50 | ●●● | ✔ | TopBar:500 dayLabelText=$"JOUR {N}" ; corps opened_game_day=50 |
| 2 | Badge de retard (volume file) | backlog_badge | M9 | hook alpha 0 | ●●– | **DÉFAUT** | TopBar:1505-1508 alpha 0 ; :1433-1439 ruban hors périmètre |
| 3 | Carte à plus fort levier | hl_card | – | – | ●–– | question | AppShell:3 sites — consommée par ④, pas dessinée sur ① |
| 4 | File d'exceptions | queue | – | – | ●–– | question | AppShell:3 sites ; 6 en attente au corps /exceptions/queue |
| 5 | Pression de la file | queue_pressure_band | – | – | ●–– | question | AppShell:1 site ; corps = 'normal' |
| 6 | Budget structurel | structural_budget | – | – | ●–– | question | AppShell:4 sites — pas sur ① |
| 7 | Friction | friction_glance | – | – | ●–– | question | AppShell:1 site ; corps friction_bucket='balanced' |
| 8 | Semaine de compression | compression_glance | – | – | ●–– | question | AppShell:2 sites → HomeChrome banner, pas ① |
| 9 | Revue de drapeaux | flag_review | – | – | ●–– | question | 0 site (motif nu, contrôle positif OK) |
| 10 | Décantation | settling_glance | – | – | ●–– | question | 0 site (motif nu) |
| 11 | Onboarding | onboarding | – | – | ●–– | question | 0 site (motif nu) ; funnel_step='HOME_FIRST' |
| 12 | Identifiant de session | session_id | – | – | ●–– | plomberie | 0 site (motif nu) |
| 13 | Quart du jour | day_phase | M7b | « Aube » | ●●● | ✔ | DayPhaseResolver:52 DAWN→Aube ; corps day_phase='DAWN' |
| 14 | Nom de fiction du district | name | – | titre district | ●–● | à ratifier | interior name='Les Bassins' ; 3 sites — la maquette ne dessine pas de titre de district |
| 15 | Slug du district | name_canonical | – | – | ●–– | plomberie | 2 sites (identité) |
| 16 | Profil de district | profile | – | teinte | ●–● | à ratifier | DistrictCellView:1 — sous-teintes DA |
| 17 | Rive | bank_side | – | orientation | ●–● | à ratifier | DistrictCellView:1 |
| 18 | Blocs du district | blocks | – | cellules | ●–● | à ratifier | 2 sites ; 37 blocs |
| 19 | Bâtiments du district | buildings | – | marqueurs | ●–● | à ratifier | 4 sites ; 1 bâtiment en district 1 |
| 20 | Identifiant district | district_id | – | – | ●–– | plomberie | 2 sites (DistrictTinted) |
| 21 | Libellé district | district | – | – | ●–– | plomberie | 2 sites |
| 22 | Grille du district | grid | – | – | ●–– | question | 0 site (motif nu) ; 10×4 pour 37 blocs |
| 23 | Lieutenants du district | lieutenants | – | – | ●–– | **question forte** | 0 site de LECTURE ; corps = [] en district 1 ; DTO:183-189 le dit hors budget |
| 24 | Nom propre du bâtiment | name_i18n | M10 | « Colis Kofi » | ●●● | ✔ | ResoudreNomBatiment:1937-1951 ; corps enseigne='Colis Kofi' |
| 25 | Bande de conversion | conversion_band | M11 | « OPÉRATIONNEL » | ●●● | ✔ | fiche:1962 LibellesBatiment.Conversion |
| 26 | Bande de revenu | revenue_band | M12 | « Au repos » | ●●● | ✔ (bande assumée) | fiche:1973 ; corps IDLE |
| 27 | Chaîne de revenu | revenue_chain | M13 | « Coupée » | ●●● | ✔ (bande assumée) | fiche:1977 ; corps UNWIRED |
| 28 | État de l'ouvrage | condition_band | – | « Sain » | ●–● | à ratifier | fiche:1981 — occupe la case du HEAT LOCAL de la maquette |
| 29 | Type opérationnel | operational_type | – | repli titre | ●–● | **DÉFAUT (repli mort)** | LibellesBatiment:24-40 MAJUSCULES vs enum back MINUSCULES ; :1940 sans normalisation |
| 30 | Identité du bâtiment | building | – | – | ●–– | plomberie | 3 sites |
| 31 | Bloc du bâtiment | block_id | – | position | ●–● | à ratifier | 3 sites — jointure géographie |
| 32 | Activité | activity_band | – | – | ●–– | question | 1 site |
| 33 | Coquille | shell_state | – | – | ●–– | question | 0 site de LECTURE (2 sites = commentaires) |
| 34 | Phase de laps | lapse_phase_bucket | – | – | ●–– | question | 1 site |
| 35 | Maintenance en cours | maintenance_in_progress | – | – | ●–– | question | 1 site |
| 36 | Lieutenants affectés | lieutenant_ids | – | médaillons | ●–● | à ratifier | 3 sites ; corps = [] ici |
| 37 | Chaleur de la ville | citywide_bucket | M5/M6 | « BURNING » | ●●● | ✔ (mot, R2.2) | AppShell:675 ; journal chaleur=«BURNING» |
| 38 | Chaleur du district | district_bucket | – | – | ●–– | **question forte** | 0 site sur ① ; corps='COLD' — le médaillon montre la VILLE, pas le district |
| 39 | Chaleur par bâtiment | heat_bucket | M14 | – | ●●– | **DÉFAUT** | WorldDtos:141 déclaré, 1 occurrence arbre = la déclaration, 0 lecture ; corps='COLD' |
| 40 | Escalade de chaleur | escalated | – | – | ●–– | question | déclaré WorldDtos:150, lu par un AUTRE écran seulement |
| 41 | Libellé heat (racine) | district | – | – | ●–– | plomberie | clé 'district' du corps heat |
| 42 | Bâtiments (heat) | buildings | – | – | ●–– | plomberie | conteneur |
| 43 | Identité bâtiment (heat) | building | – | – | ●–– | plomberie | jointure |
| 44 | Nom i18n (heat) | name_i18n | – | – | ●–– | plomberie | doublon de l'interior |
| 45 | Libellé « Argent » | – | M1 | « ARGENT » | –●● | **à ratifier** | TopBar:932 littéral ; pas une clé back |
| 46 | Montant d'argent | – | M2 | « 9 627 820,00 € » | –●● | source hors archive | TopBar:485 CurrentWallet.cash_cents — DashboardClient hors du front archivé |
| 47 | Barre de ratio propre/sale | – | M3 | trait or plein 74px | –●● | **DÉFAUT** | TopBar:354 MoneyUnderlineWidthPx=74 (largeur du CONTENEUR) ; 1 seul Image, pas de piste |
| 48 | Cadran / aiguille | – | M4 | manomètre | –●● | ✔ (piloté par citywide) | TopBar arcs + aiguille |
| 49 | Heure HH:MM | – | M8 | – | –●– | **forme F (game_minute)** | game_minute ABSENT des 12 clés de session/open ; provenance corps le dit |
| 50 | CTA COLLECTER | – | M15 | message inerte | –●● | **DÉFAUT (action morte)** | :2051-2052 ; jointure bâtiment→dealer non projetée |
| 51 | CTA BLANCHIR | – | M16 | message inerte FAUX | –●● | **DÉFAUT (prose datée)** | :2055 « aucune planque » ; empreinte planques_n=2 ; createSafehouse:82 appelé onboarding-grant:411 |
| 52 | CTA AMÉLIORER | – | M17 | message inerte | –●● | à ratifier | :2058 — vit sur un autre écran |
| 53 | Dock Empire (actif) | – | M18 | onglet Empire | –●● | ✔ | AppShell:82 Tab.Empire |
| 54 | Dock Famille + pastille or | – | M19 | onglet Org, sans pastille | –●● | **DÉFAUT (pastille)** | AppShell:82 Tab.Org ; aucun `.disc` trouvé dans le front |
| 55 | Dock Marché | – | M20 | onglet Pipeline | –●● | **écart de nom** | AppShell:59-60 dock ratifié « Filière » ≠ « Marché » de la maquette |
| 56 | Dock Plus | – | M21 | onglet More | –●● | ✔ | AppShell:82 Tab.More |
| 57 | Libellé « JOUR » | – | – | « JOUR » | ––● | littéral | TopBar:500 — habillage du chiffre |
| 58 | Libellés fiche REVENU/CHAÎNE/ÉTAT | – | – | 3 littéraux | ––● | littéral | :1974,:1978,:1982 — ÉTAT remplace HEAT LOCAL du canon |
| 59 | Message d'état des CTA | – | – | 3 littéraux | ––● | **voir DÉFAUT BLANCHIR** | :2052,:2055,:2058 |

**Contrôle d'arithmétique** : |clés B| = 44 · |éléments M non appariés| = 12 · |rendus F sans source| = 3 · somme = 59 · lignes = 59 · ✅ ÉGAL
