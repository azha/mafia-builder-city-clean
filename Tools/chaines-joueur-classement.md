# Chaînes joueur qui parlent du SYSTÈME au lieu de parler AU joueur

Population mesurée par `Tools/chaines-joueur.py` (contrôles verts) : **1122 chaînes affichées, 829 textes distincts, 142 fichiers**.

Verdicts posés **par lecture**. Le vocabulaire d'atelier n'a servi qu'au rappel ; il a produit cinq fausses accusations, gardées ici comme contrôle négatif.

## A — INSTRUCTION DE DÉVELOPPEUR SERVIE AU JOUEUR — 7

- `Operational/Autonomy/AutonomyInboxController.cs:254`
  > Boîte d'autonomie indisponible — vérifier la pile
  — dit au joueur d'inspecter la pile Docker
- `Operational/BuildingCard/BuildingCardController.cs:851`
  > Failed to load building. Check the seeder + stack.
  — dit au joueur de lancer le seeder
- `Operational/Dashboard/DashboardController.cs:425`
  > Check the seeder + stack.
  — dit au joueur de lancer le seeder
- `Operational/Exceptions/ExceptionQueueController.cs:510`
  > File indisponible — vérifier la pile
  — dit au joueur d'inspecter la pile Docker
- `Operational/Horizon/HorizonScreenController.cs:145`
  > aujourd'hui. Quelqu'un doit écrire les textes.
  — dit au joueur qu'un texte reste à écrire
- `Operational/Laundering/LaunderingController.cs:233`
  > Failed to load the node. Check the seeder + stack.
  — dit au joueur de lancer le seeder
- `Operational/Laundering/PipelineOverviewController.cs:194`
  > Failed to load the pipeline. Check the seeder + stack.
  — dit au joueur de lancer le seeder

## B — L'ARCHITECTURE COMME EXPLICATION (dire le trou est la doctrine ; le dire avec les mots de l'atelier ne l'est pas) — 53

- `Account/Profile/ProfileScreenController.cs:164`
  > ⛔ aucune route ne l'écrit : elle ne peut pas être changée
  — « route »
- `Account/Profile/ProfileScreenController.cs:168`
  > aucune route de mutation de profil n'existe
  — « route de mutation »
- `Account/Profile/ProfileScreenController.cs:169`
  > aucune route TOTP n'existe
  — « route » + sigle de protocole
- `Account/Profile/ProfileScreenController.cs:170`
  > aucun domaine de sauvegarde — l'emplacement n'existe que comme article
  — « domaine »
- `Account/Settings/SettingsScreenController.cs:136`
  > CE QUE LE SERVEUR NE SERT PAS ENCORE
  — « serveur » + « servir » technique
- `Account/Settings/SettingsScreenController.cs:137`
  > aucune route de déconnexion joueur
  — « route joueur »
- `Account/Settings/SettingsScreenController.cs:138`
  > le domaine RGPD n'a pas de surface joueur
  — « domaine » + « surface joueur »
- `Account/Settings/SettingsScreenController.cs:139`
  > chacune vit sur sa propre route — il n'y a pas de service de réglages
  — « route » + « service »
- `CityMap/DistrictInteriorScreenController.cs:2235`
  > Collecte : ce bâtiment n'expose pas encore son vendeur.
  — « expose »
- `CityMap/DistrictInteriorScreenController.cs:2241`
  > Amélioration : à ouvrir depuis la fiche opérationnelle.
  — renvoie à un autre écran par son nom interne
- `CityMap/DistrictInteriorScreenController.cs:330`
  > Scène indisponible pour ce quart horaire — réessayez plus tard.
  — « Scène » + « quart horaire »
- `CitySim/Precinct/PrecinctScreenController.cs:176`
  > aucune route n'existe encore
  — « route »
- `CitySim/Precinct/PrecinctScreenController.cs:177`
  > la route voisine vise les affaires internes, pas ce commissariat
  — « route voisine »
- `Operational/BuildingCard/BuildingCardController.cs:2122`
  > MONTANT DU TRANSFERT (vérifié serveur)
  — « vérifié serveur »
- `Operational/Carnet/CarnetScreenController.cs:243`
  > CE QUE CET ÉCRAN SAIT POUR L'INSTANT
  — « cet écran »
- `Operational/Carnet/CarnetScreenController.cs:255`
  > CE QUE LE SERVEUR ENVOIE VRAIMENT
  — « serveur »
- `Operational/Carnet/CarnetScreenController.cs:255`
  > la route n'a rien rendu. Ce n'est pas « la soirée est vide » : c'est « on ne 
  — « route » = endpoint
- `Operational/Carnet/CarnetScreenController.cs:284`
  > serveur la refuse tant que le palier 2 n'est pas atteint.
  — « serveur »
- `Operational/Carnet/CarnetScreenController.cs:296`
  > CE QUE CET ÉCRAN NE PEUT PAS VOUS DIRE
  — « cet écran »
- `Operational/Carnet/CarnetScreenController.cs:296`
  > le calendrier politique n'a aucune route joueur — seul l'administrateur y 
  — « route joueur » + « maquette » + « serveur »
- `Operational/Conflit/ConflitScreenController.cs:332`
  > Dessinées, pas renseignées : aucune route ne dit ce qu'elles préparent ni ce qu'elles possèdent.
  — « route »
- `Operational/Conflit/ConflitScreenController.cs:508`
  > Vous avez l'homme. Personne pour lui dire où frapper — aucune route ne connaît 
  — « route »
- `Operational/Delegation/DelegationScreenController.cs:479`
  > Le serveur a refusé
  — « serveur »
- `Operational/Delegation/DelegationScreenController.cs:533`
  > Le serveur ne peut pas dire ce que ça coûterait : 
  — « serveur »
- `Operational/Delegation/DelegationScreenController.cs:533`
  > On demande au serveur ce que ça coûterait…
  — « serveur »
- `Operational/Delegation/DelegationScreenController.cs:555`
  > Huit autres charges existent dans le jeu. Aucune n'est branchée.
  — « branché »
- `Operational/Delegation/DelegationScreenController.cs:571`
  > aucune n'est branchée
  — « branché » = câblé
- `Operational/Delegation/DelegationScreenController.cs:572`
  > Elles sont déclarées côté serveur mais n'ont aucune surface joueur
  — « surface joueur »
- `Operational/Demolition/DemolitionScreenController.cs:526`
  >  — on a ouvert {DistrictsBalayes} districts sans en trouver. C'est un trou de 
  — « trou de surface »
- `Operational/Demolition/DemolitionScreenController.cs:526`
  > Aucune route ne liste vos bâtiments
  — « route »
- `Operational/Demolition/DemolitionScreenController.cs:595`
  >  — le serveur n'a rien rendu.
  — « serveur »
- `Operational/Demolition/DemolitionScreenController.cs:618`
  > Le serveur refusera
  — « serveur »
- `Operational/Distribution/DistributionScreenController.cs:524`
  > Aucune route connue pour l'instant.
  — « route » = endpoint, alors que l'écran voisin dit « CETTE ROUTE » pour un itinéraire
- `Operational/Filiere/FiliereScreenController.cs:369`
  > la route n'a rien rendu. Ce n'est pas « la filière est vide » : c'est « on 
  — « route » = endpoint
- `Operational/Filiere/FiliereScreenController.cs:419`
  > le premier maillon : sans elle, rien n'entre dans la filière. Le même lot 
  — « lot » = lot de livraison du programme
- `Operational/Filiere/FiliereScreenController.cs:422`
  > la propreté est la seule grandeur servie : ni montant, ni durée, ni frais.
  — « grandeur servie »
- `Operational/Filiere/FiliereScreenController.cs:425`
  > la route répond, et elle répond « rien » : ce n'est pas une panne, c'est un 
  — « route »
- `Operational/Forensic/ForensicScreenController.cs:176`
  > lesquelles de ces trois bandes reposent sur des données — cet écran ne peut 
  — « cet écran »
- `Operational/Forensic/ForensicScreenController.cs:176`
  > mesure pour vous : c'est la valeur par défaut du serveur. Le corps ne dit pas 
  — « valeur par défaut » + « le corps » = corps de réponse
- `Operational/Forensic/ForensicScreenController.cs:195`
  > la route n'a rien rendu. Ce n'est pas « tout va bien » : c'est « on ne sait pas ».
  — « route » = endpoint
- `Operational/Horizon/HorizonScreenController.cs:131`
  > CE QUE LE SERVEUR NE DIT PAS
  — « serveur »
- `Operational/Horizon/HorizonScreenController.cs:145`
  > contient que des messages d'erreur. Voilà l'écran tel qu'il s'afficherait 
  — « l'écran tel qu'il s'afficherait »
- `Operational/Horizon/HorizonScreenController.cs:145`
  > le serveur ne propose aucune capacité pour l'instant — ce n'est pas une 
  — « serveur » + « capacité »
- `Operational/Horizon/HorizonScreenController.cs:145`
  > le serveur ne rend que des clés de traduction, et le dictionnaire du jeu ne 
  — « clés de traduction » + « dictionnaire du jeu »
- `Operational/Horizon/HorizonScreenController.cs:290`
  > le serveur ne dit pas ce qui manque pour y arriver
  — « serveur »
- `Operational/Horizon/HorizonScreenController.cs:365`
  > Le serveur n'a pas répondu
  — « serveur » LÀ OÙ SIX ÉCRANS NOMMENT UN SUJET DE FICTION
- `Operational/Horizon/HorizonScreenController.cs:365`
  > l'écran ne montre rien plutôt que de montrer un horizon périmé — ce qui était à 
  — « l'écran »
- `Operational/Journal/JournalScreenController.cs:274`
  > le serveur rend des clés et un gabarit à trous ; les titres restent à 
  — « clés » + « gabarit à trous »
- `Operational/Journal/JournalScreenController.cs:446`
  > la route n'a rien rendu. Ce n'est pas « la ville est calme » : c'est « on 
  — « route » = endpoint
- `Operational/Loi/LoiScreenController.cs:418`
  > Une affaire naît d'une descente — rien sur cet écran n'en crée.
  — « cet écran »
- `Operational/Reputation/ReputationScreenController.cs:514`
  >  — pas parce qu’il est médiocre. Et le serveur refuse de juger votre 
  — « serveur »
- `Operational/Reputation/ReputationScreenController.cs:528`
  >  : c’est un maillon manquant, pas un choix d’écran.
  — « choix d'écran » (apostrophe typographique)
- `Operational/Reputation/ReputationScreenController.cs:528`
  > l’enregistrent — le vôtre et le sien. Le serveur dit 
  — « serveur »

## C — IDENTIFIANT INTERNE RENDU TEL QUEL — 7

- `CityMap/DistrictCellView.cs:53`
  > {CityMapEnums.DisplayName(dto)}    ·    {dto.profile}    ·    {dto.block_count} blocs
  — champ de DTO interpolé BRUT, à côté d'un libellé résolu dans la même ligne
- `Onboarding/TutorialScreenController.cs:180`
  > l'identifiant tient lieu de contenu
  — « identifiant »
- `Operational/Horizon/HorizonScreenController.cs:181`
  > (sans clé)
  — « clé »
- `Operational/Lieutenant/LieutenantScreenController.cs:3137`
  > Palier de vocabulaire {VocabularyTier} — conditions débloquées (AND_IF)
  — nom du combinateur EN CODE, servi comme libellé de bouton
- `Shell/OrgVitalsPanelController.cs:104`
  > fetch failed
  — message d'exception réseau, en anglais
- `Shell/OrgVitalsPanelController.cs:180`
  > Cohésion : indisponible (pas d'agrégat pour la ville)
  — « agrégat »
- `Shell/OrgVitalsPanelController.cs:191`
  > Heat: Unavailable ({raison})
  — anglais + raison technique interpolée

## D — DIVULGATION — 1

- `Account/Profile/ProfileScreenController.cs:162`
  > ⚠️ masquée à l'affichage seulement — le serveur la rend en clair
  — dit au joueur que le masquage de son adresse est cosmétique

## E — ÉNONCÉ DATÉ SERVI AU JOUEUR — 1

- `Operational/Forensic/ForensicScreenController.cs:176`
  > au 2 septembre 2026, « train de vie » rend « calme » alors qu'aucune ligne ne le 
  — date de mesure servie au joueur — et le commentaire du fichier dit lui-même « à re-mesurer »

## HORS CLASSE — le mot d'atelier a ici son sens ORDINAIRE (contrôle négatif) — 6

- `CityMap/DistrictInteriorScreenController.cs:1667`
  > Commerce-écran
  — traduction maison de FRONT_SHOP : « écran » = paravent
- `Operational/ChaineDAppro/ChaineDApproScreenController.cs:433`
  > À QUOI ÇA SERT
  — « servir » ordinaire
- `Operational/ChaineDAppro/ChaineDApproScreenController.cs:448`
  > est en route
  — « en route » = en chemin
- `Operational/Distribution/DistributionScreenController.cs:537`
  > CETTE ROUTE
  — l'itinéraire du courrier, pas un endpoint
- `Operational/Laundering/LaunderingController.cs:346`
  > Commerce-écran — premier maillon
  — traduction maison de FRONT_SHOP : « écran » = paravent
- `Operational/Loi/LoiScreenController.cs:341`
  > La filière fait classer une affaire sans procès — mais elle se sert de gens 
  — « se servir de »

