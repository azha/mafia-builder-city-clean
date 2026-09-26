# Passe UX du 24/09 — défauts shell et navigation (C4, C7, G1-G8) : design court par groupe

Source : rapport de la passe UX (`~/project/mafia-ux-passe`, `scratchpad/ux-passe-2026-09-24/RAPPORT.md` §4, §5, §7-bis), lu, sans
écriture. Branche `ux/shell-nav-2026-09-24`, depuis `6bdea032`. Chaque ancre ci-dessous a été RELUE dans le code du client.

## Registre relu avant de coder

- `Tools/juge-visuel/ARBITRAGES-user-2026-09-07.md` §C.14 : « ✅ **Flèche retour — tranchée (pas de domicile en série 6)**. …
  **Reco : retirer la flèche du bandeau**, ARGENT revient à x 16,33. » — ratifiée EN BLOC par f2 le 07/09 à 01:05 (en-tête du fichier).
- Mémoire `project_arbitrage_fleche_retour_serie6` (du 06/09, la veille) : « ARBITRAGE USER EN ATTENTE ».
- Le code porte toujours la flèche : `AppShell.cs:379` (sortie du district), `:550` et `:685` (Accueil → carte),
  via `TopBar.SetLeadingAction(BackToMap, ExitToCityMap)`.
- ⇒ **Les deux sources se contredisent.** Aucun retour n'est inventé dans ce lot ; la question est posée à l'orchestrateur.

## A. Horloge du bandeau — C4 (JOUR et phase figés à l'ouverture) — **NON CODÉ, besoin du back**

- Mesuré : `JOUR` = `SessionOpenDto.opened_game_day`, posé UNE fois (`TopBarController.cs:564-571`, seul appelant `AppShell.cs:647`) ;
  la phase hors district = `LastSessionOpen.day_phase` (`AppShell.cs:157-160`), relue à chaque changement d'onglet mais toujours la
  même valeur ; aucune minuterie dans le client (0 `InvokeRepeating`).
- Aucune route servie ne rend le JOUR courant. `GET /v1/city/district/:id/interior` rend `day_phase` vivant, mais pas le jour, et il
  est lourd (tout le contenu du district). `session/open` ré-appelé rend la MÊME session figée (`openFresh` + `onConflictDoNothing`).
- L'extrapolation locale (`opened_game_minute` + temps écoulé ÷ 2 s) est interdite par §6.3 (`SessionDtos.cs:100-103`,
  `AppShell.cs:157`), et dériverait dès que l'horloge serveur s'arrête (session périmée).
- **Design proposé** : une route de LECTURE légère côté back (ex. `GET /v1/clock` → `game_minute`, `game_day`, `day_phase`, que
  `district-interior.controller.ts:116-118` calcule déjà), lue par le shell toutes les 30-60 s réelles et à chaque retour au premier
  plan, qui pose `TopBar` (jour + phase hors district). Dans un district, la phase reste celle de l'intérieur (même source serveur).
  ⇒ lot back d'abord ; le client câble ensuite (une coroutine dans `AppShell`, un setter `TopBarController.SetJour`).

## B. Boutons morts — C7, G4 — **CODÉ** (`a76ce53d`)

- C7 : `HomeChromeController.ClickDailyReviewShortcut` ne faisait que compter ⇒ monte `DailyReviewScreenController` en surimpression
  par `IShellNavigator` (le mécanisme de « Voir l'ardoise »). Garde : `CharpenteAccueilPanneauxPlayModeTests` (4 coins au raycast,
  clic de PRODUCTION, cible = la revue, sous `ContentSlot`) — le détecteur de péremption m5 demandait exactement cela.
- G4 : ③ monté par l'Accueil n'était abonné à rien ⇒ contrat `IEntreeDeDistrict` (ShellContracts), implémenté par `AppShell`
  (`EntrerDansLeDistrict` → `EnterDistrict`, le chemin de l'onglet Empire). Test hors réseau `EntreeDeDistrictDepuisLAccueilPlayModeTests`
  (+ contrôle négatif).

## C. Accueil et menu — G1, G5 — **NON CODÉ, décision de produit**

- G1 (l'Accueil n'est montré qu'une fois) : mesuré — seul `AcquireSessionThenActivateHome` le monte ; tout geste de dock le démonte.
  Le rouvrir demande un GESTE que rien ne dessine : re-toucher EMPIRE ? une entrée « Accueil » ? l'afficher à chaque retour sur
  Empire ? Et la sortie de l'Accueil passe aujourd'hui par la flèche (`:550`, `:685`) — §Registre. **Question**, pas de code.
- G5 (21 entrées à plat dans Plus, `AppShell.cs:830-949`) : regrouper ou masquer les vides demande des MOTS (titres de groupes) et un
  ordre — l'atelier. Masquer un écran vide cacherait une surface que le joueur ne découvrirait plus. **Question atelier.**

## D. Fermer et revenir — G2, G3, G7 — **NON CODÉ**

- G2 (la fiche d'un bâtiment du district ne se ferme pas ; `FermerFiche()` n'a que des appelants de test,
  `DistrictInteriorScreenController.cs:2490`) : le canon de ① (`hud-brennar.html`) dessine la fiche en cadre STATIQUE, toujours
  ouverte — 0 ✕, 0 « fermer », 0 geste. Options, sans mot ni chrome nouveau : (a) re-toucher le bâtiment sélectionné referme ;
  (b) toucher le sol hors bâtiment referme. **Reco (a)+(b)** — mais c'est un geste que le canon ne dit pas ⇒ **question**.
- G3 (le « ‹ » de l'en-tête Famille est décoratif, `LieutenantScreenController.cs:1636-1662`) et G7 (écrans sans retour : ⑩ hors
  shell seulement, `ExceptionDetailController.cs:279-281` ; surimpressions sans action de tête, `AppShell.cs:253, 1116-1127`) :
  c'est EXACTEMENT la flèche retour ⇒ bloqués par la contradiction du §Registre. Rien n'est inventé.

## E. Fiche ② — G8 — **NON CODÉ, latent**

- « Injecter » (`BuildingCardController.cs:1140`) : action vide, il lui faut une planque CIBLE (`Inject(safehouseId, amount)`) —
  laquelle, et quel montant, est un choix de produit. « Ouvrir » (`:1219`) rend 409 sur un bâtiment déjà ouvert.
- Latent : un joueur neuf n'atteint pas ② (B1, routé CLIENT-2). **Reco** : masquer « Ouvrir » quand le bâtiment est déjà ouvert
  (donnée servie à vérifier) et retirer « Injecter » tant qu'il n'a pas de cible — à trancher avec CLIENT-2, propriétaire de ②.

## MàJ 2026-09-26 — D (G2, G3/G7) et §Registre : **CODÉ** sur ordre de l'orchestrateur (focus UX)

La contradiction du §Registre est levée : §C.14 appliqué (l'orchestrateur confirme « tranchée, retirer »). Livré :

- **(4) flèche retirée** : plus aucun `SetLeadingAction(BackToMap, …)` (district, Accueil ×2) ; l'ARGENT revient au bord par
  `TopBarController.RepositionMoneyCluster`. Garde de source R3 (contrôle positif fabriqué).
- **(1) l'onglet actif** ramène à sa racine : c'était déjà vrai (`ActivateTab` remonte) ; garde R2.
- **(2) le retour du système** (`AppShell.Depiler`, sur `Escape` = retour Android) dépile un niveau par appui :
  surimpression → la racine du contexte, REMONTÉE par le geste qui l'avait montée ; fiche → fermée ; district → carte ;
  entrée du menu Plus → le menu ; racine d'un autre onglet → la carte ; sur la carte → rien.
- **G2** : re-toucher le bâtiment ouvert referme la fiche (un autre y bascule) ; toucher le SOL la referme
  (`DistrictMapNavigation.OnToucheSol`, un tap né hors de tout `Selectable`, relâché sous le seuil de glisser).
- **Garde « depuis chaque écran monté, un chemin mène à la carte »** : `RetourSerie6PlayModeTests.R1` — population = les onglets
  de l'enum, chaque entrée RÉELLE du menu Plus, le district, sa fiche, une surimpression sur chacun, deux empilées ; pour chaque
  état, la suite des retours est épinglée et finit sur la carte, et le toucher de l'Empire y mène en un geste.

Décidé (reco, 26/09) — réversibles, à dire à l'orchestrateur :
- La racine d'un onglet autre que l'Empire se dépile vers la CARTE (l'Empire est le seul domicile du dock) ; sur la carte, le
  retour ne fait rien (il ne quitte pas l'application).
- Une entrée du menu Plus se dépile vers le MENU (elle en est un niveau).
- Dépiler une surimpression REMONTE la racine (un district re-demande son intérieur) plutôt que de la conserver ; les
  surimpressions imbriquées se dépilent ensemble (leur contenu est mêlé à celui de la racine sous `ContentSlot`).
- Le « sol » de G2 = le PREMIER objet sous le doigt est absent ou appartient à l'écran du district hors de la fiche (le titre
  compte comme sol) ; la fiche, le chrome du shell et une surimpression gardent le toucher.

Reste : G3 (le « ‹ » décoratif de l'en-tête Famille) — reco : le brancher sur `Depiler` par un contrat de `ShellContracts`,
lot suivant ; G7 est couvert par le retour du système (⑩ n'est sans retour que monté hors shell, jamais sur le chemin joueur).

MàJ 2026-09-26 (bis) — **G3 CODÉ** (validé par l'orchestrateur) : le « ‹ » de l'en-tête Famille devient un `Button` sans
transition sur le disque déjà dessiné (`LieutenantScreenController.BrancherRetourDuShell`), qui appelle `IRetourDuShell.Depiler`
(contrat neuf de `ShellContracts`, implémenté par `AppShell`). Famille racine d'onglet → carte ; en surimpression → l'écran
d'en dessous ; hors shell → rien. Gardes `RetourSerie6.G3_*` (effet sur un faux shell + contrôle négatif ; garde de source).
Les choix « Décidé (reco, 26/09) » ci-dessus sont validés par l'orchestrateur.

MàJ 2026-09-26 (ter) — **G1 et G5 CODÉS** (maquettes PROPOSÉES atelier 7380e10, `ecrans-brennar-navigation.html` cadres 0-2 ;
générateur client 864ee188 ; clés table 60 `60-menu-plus-cles-2026-09-26.tsv`, commit client 9a17e7bf).
- **G1** : sur la carte, sans rien par-dessus, toucher EMPIRE rouvre l'Accueil en surimpression (`AppShell.ToucherLOnglet`), ses
  quatre panneaux une frame plus tard (mêmes gardes que l'acquisition) ; le retour du système le referme sur la carte.
- **G5** : le menu Plus en CINQ groupes titrés, entrées sur deux colonnes (une entrée seule prend la rangée), 20 entrées ; « La
  Filière » sort (le dock la porte). Titres et entrées par `Libelle.De("plus", "groupe"|"entree", repli)` — replis à l'octet de la
  table 60 (casse de phrase), capitales en STYLE ; les 25 clés en DETTE DATÉE de ZeroRepli jusqu'au lot i18n du back.

Décidé (reco, 26/09) :
- G1 vit sur la BULLE (`ToucherLOnglet`), pas dans `ActivateTab` : les remontées internes (retour, sortie de district, racine
  remontée) ne rouvrent jamais l'Accueil.
- G5 : la pile reste ANCRÉE EN HAUT sous le bandeau (garde `MenuPlusGeometrie` (1)) quand la maquette la pose en bas ; la fenêtre
  défilante reste (elle ne défile pas quand tout tient). Géométrie de la maquette (entrée 23,6 px CSS, rayon 7, écarts 4) ; le
  filet `#ffffff17` des entrées est omis (aucun token, garde Palette) ; fond `ficheGlassTop`, texte `hudCreme`, titres `hudHairlineGold`.
