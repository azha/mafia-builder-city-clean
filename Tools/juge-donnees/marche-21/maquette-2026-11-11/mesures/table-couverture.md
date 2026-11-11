|B| (cles projetees, DEDUIT)      = 54
|M non apparies|                  = 17
somme                             = 71
nombre de lignes de la table      = 71
IDENTITE VERTE

| # | information | B | M | statut | classe | preuve |
|---|---|---|---|---|---|---|
| B01 | lanes[] (cardinal) | ● | M06,M11,M14 | affichee comme dessinee | OK | market.controller.ts:106-115 ; cles epinglees e2e marche_ardoise_enumerateur.engine.spec.ts:60,191 ; enveloppe payload.data.lanes :120 |
| B02 | lanes[].district_id | ● | M12 | affichee comme dessinee | OK | market.controller.ts:111 ; LaneConfidenceRow market-projection.service.ts:47 |
| B03 | lanes[].substance_type | ● | M10,M16,M21,M36,M47,M48 | affichee comme dessinee | OK | market.controller.ts:112 ; enum operational_chain.ts:40 [brindle,crick,hush,ash] |
| B04 | lanes[].lane_confidence_bucket | ● | M07,M15,M23,M24 | affichee comme dessinee | OK | market.controller.ts:113 ; LOW / MODERATE / HIGH market-projection.service.ts:38 ; seuils :137-141 |
| B05 | districts[] (cardinal 18) | ● | M08,M11 | affichee comme dessinee | OK | world-geography.repository.ts:77-105 ; ordre asc(id) :88 |
| B06 | districts[].id | ● | – | disponible, ni dessinee ni affichee | QUESTION | world-geography.repository.ts:36,90 |
| B07 | districts[].profile | ● | M32,M35 | affichee comme dessinee | OK | world-geography.repository.ts:37,91 ; enum world_geography.ts:14-21 (6 membres) |
| B08 | districts[].index | ● | – | disponible, ni dessinee ni affichee | QUESTION | world-geography.repository.ts:38,92 |
| B09 | districts[].name_canonical | ● | – | disponible, ni dessinee ni affichee | QUESTION | world-geography.repository.ts:39,93 |
| B10 | districts[].block_count | ● | – | disponible, ni dessinee ni affichee | QUESTION | world-geography.repository.ts:40,94 |
| B11 | districts[].bank_side | ● | – | disponible, ni dessinee ni affichee | QUESTION | world-geography.repository.ts:41,95 ; enum world_geography.ts:23 |
| B12 | districts[].control_state | ● | – | disponible, ni dessinee ni affichee | QUESTION | world-geography.repository.ts:42,96 ; domaine ferme :58 |
| B13 | districts[].name (les 18 noms de fiction) | ● | M12 | affichee comme dessinee | OK | world-geography.repository.ts:45,99 ; district-names.ts:23-29 |
| B14 | districts[].precinct_id | ● | – | disponible, ni dessinee ni affichee | QUESTION | world-geography.repository.ts:49,101 |
| B15 | districts[].openable_types | ● | – | disponible, ni dessinee ni affichee | QUESTION | world-geography.repository.ts:54,103 |
| B16 | signal (discriminant 'insufficient_signal') | ● | M34,M40,M42 | affichee comme dessinee | OK | meta-market.controller.ts:46-57,93-95 ; mur de visibilite meta-market-read.service.ts:220-224 ; plancher :124-130 |
| B17 | signal.medianCents | ● | – | disponible, ni dessinee ni affichee | QUESTION | meta-market.controller.ts:51,98 |
| B18 | signal.p10Cents | ● | – | disponible, ni dessinee ni affichee | QUESTION | meta-market.controller.ts:52,99 |
| B19 | signal.p90Cents | ● | – | disponible, ni dessinee ni affichee | QUESTION | meta-market.controller.ts:53,100 |
| B20 | signal.sampleCount | ● | – | disponible, ni dessinee ni affichee | QUESTION | meta-market.controller.ts:53,101 ; prose contraire meta-market-read.service.ts:11 |
| B21 | signal.lastAggregatedAt | ● | – | disponible, ni dessinee ni affichee | QUESTION | meta-market.controller.ts:54,102 |
| B22 | signal.trend ('up' / 'stable' / 'down') | ● | M37 | affichee comme dessinee | OK | meta-market.controller.ts:55,103 ; calcul meta-market-read.service.ts:24-30,147 |
| B23 | visibilityEnabled | ● | M41 | affichee comme dessinee | OK | meta-market.controller.ts:118,129 ; colonne player.meta_market_visibility_enabled :127 |
| B24 | marche.titre.le_marche | ● | M04 | affichee comme dessinee | OK | string_table.ts:3332 / :362 |
| B25 | marche.sous_titre.tableau_du_verge_d_or | ● | M05 | affichee comme dessinee | OK | string_table.ts:3326 / :356 |
| B26 | marche.colonne.quartier | ● | M09 | affichee comme dessinee | OK | string_table.ts:3303 / :333 |
| B27 | marche.compteur.lignes_connues | ● | M06 | affichee comme dessinee | OK | string_table.ts:3304 / :334 |
| B28 | marche.compteur.sures | ● | M07 | affichee comme dessinee | OK | string_table.ts:3306 / :336 |
| B29 | marche.compteur.quartiers_noirs | ● | M08 | affichee comme dessinee | OK | string_table.ts:3305 / :335 |
| B30 | marche.substance.brindle | ● | M10,M21 | affichee comme dessinee | OK | string_table.ts:3328 / :358 |
| B31 | marche.substance.crick | ● | M10,M21 | affichee comme dessinee | OK | string_table.ts:3329 / :359 |
| B32 | marche.substance.hush | ● | M10,M21 | affichee comme dessinee | OK | string_table.ts:3330 / :360 |
| B33 | marche.substance.ash | ● | M10,M21 | affichee comme dessinee | OK | string_table.ts:3327 / :357 |
| B34 | marche.forme.briques | ● | M21 | affichee comme dessinee | OK | string_table.ts:3312 / :342 |
| B35 | marche.forme.cristaux | ● | M21 | affichee comme dessinee | OK | string_table.ts:3313 / :343 |
| B36 | marche.forme.plaque | ● | M21 | affichee comme dessinee | OK | string_table.ts:3314 / :344 |
| B37 | marche.forme.prismes | ● | M21 | affichee comme dessinee | OK | string_table.ts:3315 / :345 |
| B38 | marche.origine.extrait_de_racine | ● | M18 | affichee comme dessinee | OK | string_table.ts:3316 / :346 |
| B39 | marche.origine.resine_de_lull | ● | M18 | affichee comme dessinee | OK | string_table.ts:3319 / :349 |
| B40 | marche.origine.lys_de_verre | ● | M18 | affichee comme dessinee | OK | string_table.ts:3318 / :348 |
| B41 | marche.origine.herbe_des_friches | ● | – | servie, aucun cadre brindle | QUESTION | string_table.ts:3317 / :347 ; 0 occurrence maquette (confrontation-textes.txt) |
| B42 | marche.confiance.oui_dire | ● | – | servie, aucun cadre LOW | QUESTION | string_table.ts:3307 / :337 ; 0 occurrence maquette |
| B43 | marche.confiance.recoupe | ● | M23 | affichee comme dessinee | OK | string_table.ts:3308 / :338 ; dessine cadre 102 |
| B44 | marche.confiance.sur | ● | – | servie, le cadre HIGH dit autre chose | DEFAUT | string_table.ts:3309 / :339 ; 0 occurrence (le 146 dit « UNE LIGNE QUI TIENT ») |
| B45 | marche.titre.voyant_eteint | ● | M26 | affichee comme dessinee | OK | string_table.ts:3333 / :363 ; dessine cadre 103 |
| B46 | marche.titre.hors_du_tableau | ● | – | servie+ratifiee (MOTS 24a), jamais dessinee | DEFAUT | string_table.ts:3331 / :361 ; 0 occurrence dans TOUT le fichier (controle positif vert) |
| B47 | marche.phrase.bande_low | ● | – | servie, aucun cadre LOW | QUESTION | string_table.ts:3321 / :351 ; 0 occurrence |
| B48 | marche.phrase.bande_moderate | ● | M24 | affichee comme dessinee | OK | string_table.ts:3322 / :352 ; dessine a l octet cadre 102 |
| B49 | marche.phrase.bande_high | ● | – | servie, aucun cadre HIGH non-ash | QUESTION | string_table.ts:3320 / :350 ; 0 occurrence |
| B50 | marche.phrase.case_sans_ligne | ● | M27 | affichee comme dessinee | OK | string_table.ts:3325 / :355 ; dessine a l octet cadre 103 |
| B51 | marche.phrase.case_ash | ● | M29 | affichee comme dessinee | OK | string_table.ts:3324 / :354 ; dessine cadre 146 (+1 phrase en trop) |
| B52 | marche.phrase.bilan_lignes (ICU plural) | ● | M19 | dessinee en LETTRES, servie en CHIFFRES | DEFAUT | string_table.ts:3323 / :353 ; rendu attendu « 3 lignes sur 72 » ABSENT, dessine « Trois lignes sur soixante-douze » |
| B53 | marche.etat.chargement | ● | – | servie, aucun cadre de chargement | QUESTION | string_table.ts:3310 / :340 ; 0 occurrence |
| B54 | marche.etat.echec | ● | – | servie, aucun cadre d echec | QUESTION | string_table.ts:3311 / :341 ; 0 occurrence |
| N01 | M01 — barre « ARGENT / 24 850 € » — l argent du joueur | – | ● | dessinee sans source DANS CE LOT | HORS DOMAINE | cadre-101.html, .barre .aile |
| N02 | M02 — barre « CHALEUR / Tiede » + jauge — la chaleur policiere | – | ● | dessinee sans source DANS CE LOT | HORS DOMAINE | cadre-101.html, .barre .mano |
| N03 | M03 — barre « JOUR 12 / Plein jour » — le jour et la phase | – | ● | dessinee sans source DANS CE LOT | HORS DOMAINE | cadre-101.html, .barre .aile.droite |
| N04 | M13 — l ORDRE des 18 lignes — quel quartier est a quelle ligne | – | ● | dessinee sans source | ASSUME A CONSIGNER | mesure : 1,2,3,4,5,6,7,11,12,8,9,13,10,14,16,15,17,18 (cadre-101.txt:110-331) vs asc(id) world-geography.repository.ts:88 et district_id ASC market.controller.ts:97 |
| N05 | reliefs typographiques dans 5 chaines servies — la moitie de phrase mise en avant | – | ● | dessinee sans source | ASSUME A CONSIGNER | 6 occurrences mesurees : <em> 101 ; <u> 102 « pas le prix » ; <u>x2 103 « a zero »/« jamais ouverte » ; <u> 104 « genre » ; <u> 146 « tient » (relief-et-compteurs.txt) — les 31 valeurs servies sont PLATES |
| N06 | M22 — l onglet actif (.og.pris) — la substance choisie | – | ● | dessinee sans source | ASSUME A CONSIGNER | cadre-101.html .onglets .og.pris (crick) |
| N07 | le gabarit « NOM · BANDE » — la composition titre du panneau | – | ● | dessinee sans source | ASSUME A CONSIGNER | cadres 102/103/146 .pann.pp>b ; aucune cle marche.gabarit.* parmi les 31 |
| N08 | M28 — titre « LE VERRE · UNE LIGNE QUI TIENT » — la bande de la case ash | – | ● | dessinee sans source | ECART (mots ratifies contraires) | cadre-146.html .pann.pp>b ; RETIRE par MOTS-MARCHE-21.md:33, remplace par 24a « HORS DU TABLEAU » |
| N09 | M29b — 2e phrase ash — « Le tableau dit seulement si la ligne tient — jamais ce qu elle vaut. » | – | ● | dessinee sans source | ECART (mots ratifies contraires) | cadre-146.html .pann.pp>small ; RETIREE par MOTS-MARCHE-21.md:33 ; absente des 31 cles |
| N10 | M30 — les voyants ASH ALLUMES — une ligne ash existe et sa bande | – | ● | dessinee sans source | ECART (TD-966 contredit) | 4 cases mesurees : 146 Le Verre 1.00, Place des Comptes 0.75, La Lisiere 0.54 ; 104 glass x ash « DESCEND » (voyants-allumes.txt) |
| N11 | M31 — entete « genre » — la colonne de gauche du tableau de region | – | ● | dessinee sans source | ASSUME A CONSIGNER | cadres 104:84 / 105 ; aucune cle (marche.colonne.quartier seule existe) |
| N12 | M33 — le tableau de region 6x4 — la liste des (genre x substance) | – | ● | dessinee sans source | LOT BACK (enumerateur) | 24 cases mesurees, 6 rg (voyants-allumes.txt) ; aucun enumerateur : GET me/meta-market/signal exige substance+district_profile (meta-market.controller.ts:79-86) |
| N13 | M38 — les 3 couleurs de direction — monte / tient / descend | – | ● | dessinee sans source | ASSUME A CONSIGNER | #43e0c0 / #ffd23f / #ff5a4d (cadre-104.html) |
| N14 | M39 — le panneau du cadre 104 — « Six genres d endroit, pas dix-huit quartiers » + « elles disent une direction, jamais un chiffre » | – | ● | dessinee sans source | ASSUME A CONSIGNER | cadre-104.txt:183-197 ; 3 textes, aucune cle parmi les 31 |
| N15 | M43 — le panneau du cadre 105 (le mur) — « Vous ne dites pas vos prix / alors on ne vous dit pas les notres. Ca se rouvre au Coffre, tiroir le jeu » | – | ● | dessinee sans source | ASSUME A CONSIGNER | cadre-105 .pann ; aucune cle parmi les 31 ; renvoi a l ecran ㉖ (PUT me/meta-market/visibility) |
| N16 | M44 — « L2 maillon manquant » — auto-documentation : 3 mesures en projection sans ecrivain | – | ● | dessinee sans source | TROU DOCUMENTE (se garde) | cadre-106 ; q_inferred/realised_price_multiplier/lambda market-projection.service.ts:71-76, absentes de la route (market.controller.ts:11-14) |
| N17 | M45 — « L4 maillon manquant » — auto-documentation : la region connait un prix, l ecran ne le montre pas | – | ● | dessinee sans source | TROU DOCUMENTE (se garde) | cadre-106 ; medianCents/p10/p90 meta-market.controller.ts:98-100 |
