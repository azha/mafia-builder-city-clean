# Dette N3 — ternaires à deux littéraux (2026-09-24)

Garde : `LitterauxNommesPlayModeTests.N3_LesTernairesADeuxLitterauxNeDepassentPasLaDette` (catégorie `Replis`), dette par fichier.
Forme : `c ? "…" : "…"`, où qu’il soit, sur une ou plusieurs lignes ; une branche au moins est un mot (lettre, ni glyphe `[…]`,
ni identifiant `a_b`, ni couleur `#…`, ni balise `<i>`, ni `true`/`false`). Un site déjà vu par N2 (`== "v" ? …`) n’est pas recompté.

**65 sites, 26 fichiers. Rien n’est corrigé dans ce lot.** La présomption est une RÈGLE DE FORME (branches PascalCase sans espace ⇒ nom
d’objet), pas une lecture : 8 présumés noms d’objet, 57 présumés mots. Chaque site se LIT avant d’être classé ou corrigé.

Hors garde (mesuré, non gardé — décision à prendre) : un ternaire à UNE branche littérale (`c ? "mot" : x`, `c ? x : "mot"`) : 33 + 21 occurrences brutes.

| site | branches | présomption |
|---|---|---|
| `BandeauEphemere.cs:223` | « FiletHaut » : « FiletBas » | nom d’objet (présumé) |
| `BuildingCardController.cs:681` | « {echec} — {raison} » : « {echec}. » | mot affiché (présumé) |
| `BuildingCardController.cs:726` | « oui » : « non » | mot affiché (présumé) |
| `BuildingCardController.cs:790` | « se dégrade » : « stable » | mot affiché (présumé) |
| `BuildingCardController.cs:972` | « Audit imminent — retirez ou répartissez maintenant » : « Audit en vue — retirez ou répartissez pour réagir » | mot affiché (présumé) |
| `BuildingCardController.cs:1037` | « Réparer » : « Réparer · {cout} » | mot affiché (présumé) |
| `BuildingCardController.cs:2007` | « Dans {jours} j » : « À jour » | mot affiché (présumé) |
| `BuildingCardController.cs:2009` | « Dû aujourd'hui » : « Dans {jours} j » | mot affiché (présumé) |
| `BuildingCardController.cs:2167` | « CranAllume » : « CranEteint » | nom d’objet (présumé) |
| `BuildingCardController.cs:2424` | « CranAllume » : « CranEteint » | nom d’objet (présumé) |
| `ChaineDApproScreenController.cs:413` | « pour le brindle » : « sert à la production » | mot affiché (présumé) |
| `ChaineDApproScreenController.cs:523` | « Nestor : « L'étagère est vide. Sans pyralin, je ne rallume pas. » » : « Votre lieutenant : « On en a besoin, et il n'y en a plus. » » | mot affiché (présumé) |
| `ChaineDApproScreenController.cs:577` | « Rien à remonter pour l'instant — la chaîne ne connaît aucun maillon sur ce compte. » : « Des maillons existent, mais cet écran ne sait pas encore les afficher. » | mot affiché (présumé) |
| `CityMapController.cs:1076` | « oui » : « non » | mot affiché (présumé) |
| `CityProjectionsClient.cs:126` | « ok » : « la réponse ne contient aucune planque » | mot affiché (présumé) |
| `CityProjectionsClient.cs:180` | « ok » : « la réponse ne contient aucun nœud » | mot affiché (présumé) |
| `CompressionScreenController.cs:195` | « pression inconnue » : « {Lisible(Etat.stress_bucket)} · {Lisible(Etat.week_state)} » | mot affiché (présumé) |
| `CompressionScreenController.cs:233` | « Libre » : « Depense » | nom d’objet (présumé) |
| `ConflitScreenController.cs:713` | « BordChoisi » : « Bord » | nom d’objet (présumé) |
| `DashboardController.cs:371` | « Boss {CurrentMe.handle} » : « Patron » | mot affiché (présumé) |
| `DashboardController.cs:389` | « en cours » : « rien en cours » | mot affiché (présumé) |
| `DecisionDetailScreenController.cs:176` | « structurelle » : « tactique » | mot affiché (présumé) |
| `DecisionDetailScreenController.cs:179` | « Structurelle — trancher consomme votre décision de la session. » : « Tactique — trancher ne touche pas à votre décision structurelle. » | mot affiché (présumé) |
| `DecisionDetailScreenController.cs:189` | « pris » : « libre » | mot affiché (présumé) |
| `DelegationScreenController.cs:447` | « s » : «  » | mot affiché (présumé) |
| `DelegationScreenController.cs:1087` | « Une décision de structure aujourd'hui » : « Décision déjà prise aujourd'hui » | mot affiché (présumé) |
| `DelegationScreenController.cs:1095` | « confier ou reprendre — pas les deux » : « la prochaine sera pour demain » | mot affiché (présumé) |
| `DemoIdentityResolver.cs:314` | « défaut » : « env » | mot affiché (présumé) |
| `DemolitionScreenController.cs:510` | « le plus mauvais rapport » : « site par site » | mot affiché (présumé) |
| `DemolitionScreenController.cs:533` | « VOTRE SITE » : « VOS {DerniersBatiments.Length} SITES » | mot affiché (présumé) |
| `DemolitionScreenController.cs:587` | « quelqu'un y travaille » : « libre » | mot affiché (présumé) |
| `DemolitionScreenController.cs:626` | « plus de décision aujourd'hui » : « c'est votre décision du jour » | mot affiché (présumé) |
| `DemolitionScreenController.cs:801` | « Parcelle libre — bloc {blocLibere} » : « Parcelle libre » | mot affiché (présumé) |
| `DemolitionScreenController.cs:859` | « tant qu'elle est encore là » : « il n'en reste aucune » | mot affiché (présumé) |
| `DemolitionScreenController.cs:966` | « LE MIEUX PLACÉ » : « AUTRE OPTION » | mot affiché (présumé) |
| `DemolitionScreenController.cs:1054` | « Local sans enseigne — îlot {b.block_id} » : « Local sans enseigne — {b.district_name}, îlot {b.block_id} » | mot affiché (présumé) |
| `DistributionScreenController.cs:763` | « TENDRE UNE AUTRE FICELLE » : « ENVOYER CE SOIR » | mot affiché (présumé) |
| `DistrictInteriorScreenController.cs:787` | «  ⚠️ une cellule sur la grille de secours n'est PAS sur son bâtiment » : «  » | mot affiché (présumé) |
| `DistrictInteriorScreenController.cs:952` | «  px[{parcelleLue.pivot_px[0]:0.0},{parcelleLue.pivot_px[1]:0.0}] » : «  GRILLE » | mot affiché (présumé) |
| `DistrictInteriorScreenController.cs:972` | « Cell_{x}_{y}_{rangDansBloc + 1} » : « Cell_{x}_{y} » | mot affiché (présumé) |
| `DistrictInteriorScreenController.cs:2608` | « Collecte indisponible : la session a expiré. » : « Rien à ramasser : personne ne tient ce point de vente. » | mot affiché (présumé) |
| `ExceptionDetailController.cs:493` | « Carte_Escalader_ » : « Carte_ » | nom d’objet (présumé) |
| `HomeChromeController.cs:145` | « La chaufferie — {BannerWeekStateRendered} » : «  » | mot affiché (présumé) |
| `HorizonScreenController.cs:559` | « {valeur:00}<size=64%>/{total}</size> » : « {valeur:00} » | mot affiché (présumé) |
| `InspectionScreenController.cs:226` | « La police n'a pas encore ouvert ses files — elle les ouvre sur les 18 districts à la fois. » : « La file n'a pas répondu. » | mot affiché (présumé) |
| `InspectionScreenController.cs:245` | « SUR · {NomDeBatiment(Cible)} » : « SUR · aucun bâtiment à vous » | mot affiché (présumé) |
| `InspectionScreenController.cs:279` | « un bâtiment de {district} » : « {enseigne} — {district} » | mot affiché (présumé) |
| `LieutenantScreenController.cs:1911` | « BiseauHaut » : « BiseauBas » | nom d’objet (présumé) |
| `LoiScreenController.cs:309` | « 1 affaire en cours » : « {n} affaires en cours » | mot affiché (présumé) |
| `LoiScreenController.cs:435` | « 1 affaire en cours » : « {n} affaires en cours » | mot affiché (présumé) |
| `LoiScreenController.cs:734` | « sous rétention » : « libre » | mot affiché (présumé) |
| `LoiScreenController.cs:736` | « LIBÉRER » : « METTRE SOUS RÉTENTION » | mot affiché (présumé) |
| `PrecinctScreenController.cs:160` | « Ce commissariat n'a encore rien retenu de vous. » : « Le commissariat n'a pas répondu. » | mot affiché (présumé) |
| `RuleModel.cs:210` | « {token}  🔒 palier {tier.ToString(CultureInfo.InvariantCulture)} » : « {token}  🔒 pas encore » | mot affiché (présumé) |
| `RuleModel.cs:383` | « {field} is not {boolWord} » : « {field} is {boolWord} » | mot affiché (présumé) |
| `SellingScreenController.cs:243` | « Cette caisse est vide ou la planque est pleine. » : « La collecte n'a pas abouti. » | mot affiché (présumé) |
| `SellingScreenController.cs:277` | « Aucun point de vente. » : « Les points de vente n'ont pas répondu. » | mot affiché (présumé) |
| `SellingScreenController.cs:357` | « caisse vide » : « aucune planque disponible » | mot affiché (présumé) |
| `SellingScreenController.cs:554` | « {auTravail:00}/{total} » : « — » | mot affiché (présumé) |
| `SellingScreenController.cs:555` | « {pleines:00} » : « — » | mot affiché (présumé) |
| `SellingScreenController.cs:556` | « {grilles:00} » : « — » | mot affiché (présumé) |
| `ShopScreenController.cs:198` | « La vitrine est vide. » : « La vitrine n'a pas répondu. » | mot affiché (présumé) |
| `ShopScreenController.cs:286` | « plus aucun jeton, et rien n'en redonne » : « pas assez de jetons » | mot affiché (présumé) |
| `TopBarController.cs:1677` | « VoluteG » : « VoluteD » | nom d’objet (présumé) |
| `TutorialScreenController.cs:181` | « Rien à découvrir pour l'instant. » : « L'état du tutoriel n'a pas répondu. » | mot affiché (présumé) |
