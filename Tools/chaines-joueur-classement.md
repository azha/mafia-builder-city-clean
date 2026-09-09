# Chaînes joueur qui parlent du SYSTÈME au lieu de parler AU joueur

Population mesurée par `Tools/chaines-joueur.py` (contrôles verts) : **1120 chaînes affichées, 826 textes distincts**.

Chaque motif porte sa valeur **attendue** ; `--verifier` rougit dans les deux sens (la classe revient / l'épingle est périmée).

## A — INSTRUCTION DE DÉVELOPPEUR SERVIE AU JOUEUR — 3

- `—`
  > (plus aucune occurrence)
  — CLOS — disait au joueur d'inspecter la pile Docker
- `—`
  > (plus aucune occurrence)
  — CLOS — disait au joueur de lancer le seeder (4 sites)
- `—`
  > (plus aucune occurrence)
  — CLOS — s'adressait au studio, pas au joueur

## E — ÉNONCÉ DATÉ SERVI AU JOUEUR — 1

- `—`
  > (plus aucune occurrence)
  — CLOS — date de mesure servie au joueur ; le fichier disait lui-même « à re-mesurer »

## D — DIVULGATION — 1

- `—`
  > (plus aucune occurrence)
  — CLOS — mesuré côté back : /v1/me est scopé au compte du jeton, aucune route ne rend l'adresse d'un tiers. La phrase disait VRAI et présentait le droit d'accès comme une faiblesse. Le masquage reste.

## C — IDENTIFIANT INTERNE RENDU TEL QUEL — 4

- `CityMap/DistrictCellView.cs:53`
  > {CityMapEnums.DisplayName(dto)}    ·    {dto.profile}    ·    {dto.block_count} blocs
  — ⚠️ ROUTÉ ATELIER — glass|lattice|spine|stack|tidewater|verge servis bruts, AUCUN résolveur n'existe ⇒ six mots de fiction à écrire, ce n'est pas une correction. ⛔ ET IL Y A UN SECOND SITE que cet outil ne peut pas voir : CityMapController:1052 passe la VARIABLE (`DetailRow("Profile", cell.Model.profile)`) — la population ne contient que des LITTÉRAUX.
- `Shell/OrgVitalsPanelController.cs:192`
  > Heat: Unavailable ({raison})
  — ⚠️ LOT ANGLAIS — le panneau entier est encore anglais (`RenderBar(heatText, "Heat", …)`, idem Friction/Stress) ; la conversion i18n du 2026-09-03 n'a converti que Cohésion. Je ne devance pas ce lot.
- `—`
  > (plus aucune occurrence)
  — CLOS — la raison nommait un verbe HTTP
- `—`
  > (plus aucune occurrence)
  — CLOS — « agrégat ». ⚠️ « indisponible » conservé : CharpenteAccueilPanneaux l'asserte

## R — REVENDIQUÉ PUIS RETIRÉ : mesuré DÉLIBÉRÉ en ouvrant la cible — 3

- `Onboarding/TutorialScreenController.cs:180`
  > l'identifiant tient lieu de contenu
  — RETIRÉ DE C — même doctrine du trou honnête : l'écran DIT que l'identifiant remplace un texte non écrit. Aucun commentaire ne le ratifie explicitement ⇒ laissé en l'état plutôt que tranché sans maquette.
- `Operational/Horizon/HorizonScreenController.cs:181`
  > (sans clé)
  — RETIRÉ DE C — HorizonScreenController:180 porte, en code, « Le titre EST la clé : c'est ce que la maquette ratifiée montre ».
- `Operational/Lieutenant/LieutenantScreenController.cs:3137`
  > Palier de vocabulaire {VocabularyTier} — conditions débloquées (AND_IF)
  — RETIRÉ DE C — c'est le token de la GRAMMAIRE BACK que le joueur écrit dans ses règles. LieutenantUiExtensionPlayModeTests:607 asserte que ces tokens sont exposés « grounded VERBATIM in the backend grammar », et RuleEditorTier2:219 épingle la source sérialisée. L'afficher est délibéré.

## B — L'ARCHITECTURE COMME EXPLICATION (dire le trou est la doctrine ; le dire avec les mots de l'atelier ne l'est pas) — 53

- `Account/Profile/ProfileScreenController.cs:163`
  > ⛔ aucune route ne l'écrit : elle ne peut pas être changée
  — « route »
- `Account/Profile/ProfileScreenController.cs:167`
  > aucune route de mutation de profil n'existe
  — « route de mutation »
- `Account/Profile/ProfileScreenController.cs:168`
  > aucune route TOTP n'existe
  — « route » + sigle de protocole
- `Account/Profile/ProfileScreenController.cs:169`
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
  > distingue une fois affichées. Cet écran ne peut donc pas trancher, et il 
  — « cet écran » ⚠️ motif re-casé : ma réécriture a mis une majuscule à « Cet », et le fragment minuscule rendait 0 — un zéro de CASSE, pas de suppression
- `Operational/Forensic/ForensicScreenController.cs:194`
  > la route n'a rien rendu. Ce n'est pas « tout va bien » : c'est « on ne sait pas ».
  — « route » = endpoint
- `Operational/Horizon/HorizonScreenController.cs:131`
  > CE QUE LE SERVEUR NE DIT PAS
  — « serveur »
- `Operational/Horizon/HorizonScreenController.cs:145`
  > contient que des messages d'erreur. Voilà l'écran tel qu'il s'afficherait 
  — « l'écran tel qu'il s'afficherait » — CONSERVÉ : c'est le cadre ratifié de la maquette
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
  — « choix d'écran » (apostrophe typographique — le fragment ASCII rendait 0)
- `Operational/Reputation/ReputationScreenController.cs:528`
  > l’enregistrent — le vôtre et le sien. Le serveur dit 
  — « serveur »
- `—`
  > (plus aucune occurrence)
  — CLOS INCIDEMMENT — « valeur par défaut » + « le corps » (= corps de réponse) vivaient dans la MÊME phrase que l'énoncé daté de E. Les retirer ensemble était le seul geste possible ; je le déclare plutôt que de le compter comme un gain de B.
- `—`
  > (plus aucune occurrence)
  — CLOS — le SEPTIÈME de la formule maison, le seul qui nommait la machine. Six écrans disent « Le profil / la file / le commissariat / le tableau / la vitrine / l'état du tutoriel n'a pas répondu » ; ㉜ disait « le serveur ». Repris sur le patron de son jumeau structurel (Reputation:579-584 : titre « LE MIROIR EST INDISPONIBLE » + sous-titre « Le miroir ne répond pas »).

## N — HORS CLASSE : le mot d'atelier a ici son sens ORDINAIRE (contrôle négatif) — 6

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

