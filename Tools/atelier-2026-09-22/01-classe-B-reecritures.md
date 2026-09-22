# ① Classe B — « l'architecture comme explication » : 53 chaînes, le cadre qui les demande, la réécriture en fiction

Atelier / DA, 2026-09-22, sur `main` à `9b5d6117` (branche `da/2026-09-22`). Source : `Tools/chaines-joueur-classement.md` §B. Le client câble ; ce fichier livre le texte et la décision. Les 6 témoins de la classe N ne sont pas touchés.

## La doctrine, et le registre

Dire le trou EST la doctrine (㉜ : « LE PANNEAU DIT LE TROU »). Le défaut de ces 53 phrases est de **registre** : elles disent le trou avec les mots du dépôt. La maison a déjà sa langue pour ça, dans la maquette même :

- **« rien derrière »** (㉜·78) — ce qui existe et que personne ne tient.
- **« Cette façon de faire s'ouvre plus tard »** (㉞·88) — ce qui est verrouillé.
- **« Le jeu ne vous donnera jamais de chiffre là-dessus. Vous n'aurez que ce signe … C'est voulu. »** (㉛·72) — le manque délibéré, DÉCLARÉ.
- **« La ville ne vous prévient pas de tout »** (㉞·91) — ce qu'on ne sait pas.
- **« Personne ne fait la queue — la routine tient »** (⑨·11) — le vide légitime.
- **« ce qui manque encore »** (㊲·124, ㊳·130, ㊴·136, ㊵·142, ㊱·118) — le titre que la maquette donne elle-même à ses panneaux de trous.
- **« Le profil / la file / le commissariat / le tableau / la vitrine / le carnet / la filière / le miroir / l'horizon / le parloir / le conflit / la distribution / la chaîne d'appro / le comptoir / la boîte / le portefeuille n'a pas répondu »** — la formule maison de la panne (24 sites mesurés), le sujet est TOUJOURS l'objet de fiction.

**Mots interdits au joueur** (ce sont les nôtres) : route (= endpoint), serveur, surface joueur, domaine, lot, clés de traduction, dictionnaire du jeu, branché/câblé, projection, grandeur servie, capacité (au sens système), maquette, corps, « cet écran ».
**Mots de la maison** : on / personne (le sujet des trous), la ville, la maison, le jeu (㉛·72 « le jeu vous laissera le faire »), pas encore, pour l'instant, on ne sait pas, c'est voulu.

**Trois titres de panneau reviennent sur cinq écrans** ; ils sont réécrits UNE fois, pareil partout :

| titre actuel | sites | titre ratifié |
|---|---|---|
| CE QUE LE SERVEUR ENVOIE VRAIMENT | Carnet:255 · Filière:369 · Forensic:194 · Horizon:181 · Journal:274/446 | **CE QU'ON SAIT VRAIMENT** |
| CE QUE LE SERVEUR NE DIT PAS | Carnet:296 · Forensic:176 · Settings:136 | **CE QUE LA VILLE NE DIT PAS** (Carnet, Forensic) · **CE QUI NE S'OUVRE PAS ENCORE** (Settings — ce sont des gestes verrouillés, pas des faits inconnus) |
| CE QUE CET ÉCRAN SAIT POUR L'INSTANT | Carnet:243 | **CE QU'ON SAIT POUR L'INSTANT** |

Et **une phrase de panne** revient sur quatre écrans : « la route n'a rien rendu. Ce n'est pas « X » : c'est « Y ». » → **« on n'a pas eu de réponse. Ce n'est pas « X » : c'est « Y ». »** — le sous-titre au-dessus dit déjà « … n'a pas répondu », le panneau ne le répète pas.

## Épingles périmées constatées (`chaines-joueur-classer.py --verifier` sur `9b5d6117` : 67 motifs · 5 écarts)

- « CE QUE LE SERVEUR NE SERT PAS ENCORE » (Settings:136) → le code dit désormais « CE QUE LE SERVEUR NE DIT PAS » — d'où « la classe revient : attendu 2, mesuré 3 » sur ce dernier.
- « le serveur ne propose aucune capacité » (Horizon:145) → disparu : remplacé par le cadre 117 (« Les cartes viennent du monde, pas du menu »).
- « CE QUE CET ÉCRAN NE PEUT PAS » (Carnet:296) → disparu (le titre est devenu « CE QUE LE SERVEUR NE DIT PAS »).
- « n'expose pas encore son vendeur » (DistrictInterior:2235) → disparu : la phrase est « Collecte indisponible : aucun vendeur affecté. » (:2396).
Ce fichier réécrit le texte **tel qu'il est dans `main` aujourd'hui** ; les numéros de ligne sont ceux de `9b5d6117`.

---

## ㉒ Le compte — `Account/Profile/ProfileScreenController.cs` — cadres 95, 96, 97 (« Le compte »)

Le cadre 95 pose la langue des trous de cet écran : `La langue de la maison | réglée le jour où vous avez ouvert le compte` ; `Ce qui s'ouvre ensuite | … | verrouillé`. Le cadre 97 dessine chaque geste manquant comme une LIGNE avec son verbe (« en changer », « la corriger », « TOUT EFFACER · et ne plus jamais revenir ») — les numéros L7/L8/L10 sont des annotations d'atelier, pas du texte joueur.

| ligne | aujourd'hui | ratifié |
|---|---|---|
| :163 | ⛔ aucune route ne l'écrit : elle ne peut pas être changée | réglée le jour où vous avez ouvert le compte — elle ne se change pas encore |
| :167 | Changer le mot de passe — aucune route de mutation de profil n'existe | Changer le mot de passe — pas encore : la clé est celle du premier jour |
| :168 | Double authentification — aucune route TOTP n'existe | Double authentification — pas encore : la maison ne demande qu'une clé |
| :169 | Vos sauvegardes — aucun domaine de sauvegarde — l'emplacement n'existe que comme article | Vos dossiers — pas encore : un second dossier s'achète à la vitrine, mais aucun ne s'ouvre encore ici |

(« dossier » est le mot de la vitrine ㉓·98 : « Deuxième dossier », « Troisième dossier » ; « sauvegarde » est le nôtre.)

## ⑲ Les réglages — `Account/Settings/SettingsScreenController.cs` — aucune maquette de série 4/6 ; cadres les plus proches ㉒·95 (« FERMER LE COFFRE · cette session seulement ») et ㉒·97 (« FERMER PARTOUT · toutes les sessions ouvertes », « TOUT EFFACER · et ne plus jamais revenir »)

| ligne | aujourd'hui | ratifié |
|---|---|---|
| :136 | CE QUE LE SERVEUR NE DIT PAS | CE QUI NE S'OUVRE PAS ENCORE |
| :137 | Se déconnecter — aucune route de déconnexion joueur | Se déconnecter — pas encore : la session se ferme avec l'appareil, pas d'ici |
| :138 | Supprimer mon compte — le domaine RGPD n'a pas de surface joueur | Tout effacer — pas encore : « et ne plus jamais revenir » n'a pas encore de guichet |
| :139 | Les autres préférences — chacune vit sur sa propre route — il n'y a pas de service de réglages | Les autres préférences — pas encore : chaque réglage se prend là où il sert, il n'y a pas encore de tiroir pour les ranger ensemble |

## ① L'intérieur du district — `CityMap/DistrictInteriorScreenController.cs` — le HUD de Brennar (`hud-brennar.html` : « LE VERGE D'OR · Bar · Quartier général · COLLECTER · BLANCHIR · AMÉLIORER », l'horloge « Jour 12 · Soirée · 21:40 » pilote la scène jour/nuit)

| ligne | aujourd'hui | ratifié | cadre |
|---|---|---|---|
| :341 | Scène indisponible pour ce quart horaire — réessayez plus tard. | La ville ne se laisse pas voir à cette heure — revenez dans un moment. | HUD (l'horloge fait la scène) — état NOMMÉ d'un quart inconnu, jamais un rendu vide |
| :2396 | Collecte indisponible : aucun vendeur affecté. | Rien à ramasser : personne ne tient ce point de vente. | ㉟·111 « Aucun dealer — rien ne rentre » ; « ramasser » = ㉟·109 |
| :2348 | Amélioration : à ouvrir depuis la fiche opérationnelle. | Améliorer : ça se fait sur la fiche du bâtiment. | HUD « AMÉLIORER » ; ㉝·80 « fiche du site » |

## ⑰ Le commissariat — `CitySim/Precinct/PrecinctScreenController.cs` — cadres 31-35 (« La police »)

Le cadre 33 (« LE COUP FOURRÉ — on leur donne un os à ronger ») et le cadre 35 (« ce que le back sait déjà et ne dit pas ») cadrent les gestes de cet écran ; le renseignement qui s'achète est celui du dossier (㊴·136 « Dire le prix du renseignement »).

| ligne | aujourd'hui | ratifié |
|---|---|---|
| :176 | Recruter un greffier — aucune route n'existe encore | Recruter un greffier — pas encore : on n'a personne à acheter au greffe |
| :177 | Acheter un renseignement — la route voisine vise les affaires internes, pas ce commissariat | Acheter un renseignement — pas encore : ce qui s'achète parle des affaires internes, pas de ce commissariat |

## ② La fiche du bâtiment — `Operational/BuildingCard/BuildingCardController.cs` — aucune maquette de série 4/6 ; cadre le plus proche ㉝·80 (la fiche du site) ; le coffre ㉒·95 (« VOTRE COFFRE »)

| ligne | aujourd'hui | ratifié |
|---|---|---|
| :2122 | MONTANT DU TRANSFERT (vérifié serveur) | MONTANT DU TRANSFERT — le coffre a le dernier mot |

(« vérifié serveur » voulait dire : le montant peut être refusé après coup. Le coffre qui a le dernier mot dit la même chose, avant le geste.)

## ㉞ Les ordres du soir — `Operational/Carnet/CarnetScreenController.cs` — cadres 85-91

Le cadre 88 (« Rejouer une soirée — pas encore ») ÉCRIT le verrou : « Vous ne pouvez pas encore mettre une soirée de côté. Cette façon de faire s'ouvre plus tard — il faut d'abord monter d'un palier. » Le cadre 91 (« Ce qui arrive ») écrit l'inconnu : « La ville ne vous prévient pas de tout — mais ce qui est annoncé, on peut s'y préparer. »

| ligne | aujourd'hui | ratifié |
|---|---|---|
| :243 | CE QUE CET ÉCRAN SAIT POUR L'INSTANT | CE QU'ON SAIT POUR L'INSTANT |
| :255 | CE QUE LE SERVEUR ENVOIE VRAIMENT | CE QU'ON SAIT VRAIMENT |
| :255 | la route n'a rien rendu. Ce n'est pas « la soirée est vide » : c'est « on ne sait pas ce qui est prévu ». | on n'a pas eu de réponse. Ce n'est pas « la soirée est vide » : c'est « on ne sait pas ce qui est prévu ». |
| :284 | une suite d'ordres qu'on met de côté et qu'on relance d'un geste. Le serveur la refuse tant que le palier 2 n'est pas atteint. | une suite d'ordres qu'on met de côté et qu'on relance d'un geste. Cette façon de faire s'ouvre plus tard — il faut d'abord monter d'un palier. **(cadre 88, mot pour mot)** |
| :296 | CE QUE LE SERVEUR NE DIT PAS | CE QUE LA VILLE NE DIT PAS |
| :296 | le calendrier politique n'a aucune route joueur — seul l'administrateur y accède. La maquette le dessine ; le serveur ne le sert à personne. | ce que la ville prépare, personne ne vous le rapporte encore. Ce sera ici le jour où quelqu'un le fera. **(cadre 91 : « Ce que la ville prépare, et ce qu'on peut faire contre »)** |

## ㉙ Le conflit — `Operational/Conflit/ConflitScreenController.cs` — cadres 59-66 ; le cadre 64 (« Ce qu'on ne peut pas faire ») dessine le trou et finit en fiction : « Tant que c'est le cas, le conflit se joue à l'aveugle et à sens unique : on frappe, on ne parle pas, on ne voit pas venir. »

| ligne | aujourd'hui | ratifié |
|---|---|---|
| :332 | Dessinées, pas renseignées : aucune route ne dit ce qu'elles préparent ni ce qu'elles possèdent. | Dessinées, pas renseignées : personne ne vous dit ce qu'elles préparent ni ce qu'elles possèdent — on frappe à l'aveugle. |
| :508 | Vous avez l'homme. Personne pour lui dire où frapper — aucune route ne connaît encore vos rivaux. | Vous avez l'homme. Personne pour lui dire où frapper — on ne sait pas encore où ils sont. |

⚠️ Le cadre 64 lui-même porte « Elles ne sont pas branchées » et « aucune route joueur · 4 pour l'administration · 29 pour les tests » : c'est du texte d'atelier dessiné dans le cadre du téléphone. **Décision DA** : le haut du cadre 64 garde ses trois lignes (« Savoir qui elles sont / Leur parler / Les faire suivre ») avec « rien derrière » (㉜·78) à la place des comptes de routes ; les comptes restent dans la note d'atelier sous le cadre. À reporter dans `generateur-table.py` (atelier), lot séparé.

## ㉜ Ce que vous avez confié — `Operational/Delegation/DelegationScreenController.cs` — cadres 73-78

Le cadre 78 (« Les huit qui n'existent pas encore ») dessine le trou avec **« rien derrière »** sur chaque plaque et « Existent, mais personne n'y touche » en titre — c'est la langue à reprendre. Son texte du bas (« Aucune n'est branchée », « déclarées côté serveur mais n'ont aucune surface joueur ») est du registre d'atelier dessiné dans le cadre : **même réécriture des deux côtés**, `generateur-service.py` à aligner (atelier, lot séparé). Le cadre 76 (« Reprendre — ce que ça coûterait ») écrit : « Voilà ce que ça coûterait. On vous le dit avant, pas après. »

| ligne | aujourd'hui | ratifié |
|---|---|---|
| :479 | Le serveur a refusé : {raison} | Refusé : {raison} |
| :533 | Le serveur ne peut pas dire ce que ça coûterait : {raison} | On ne peut pas vous dire ce que ça coûterait : {raison} |
| :533 | On demande au serveur ce que ça coûterait… | On demande ce que ça coûterait… |
| :555 | Huit autres charges existent dans le jeu. Aucune n'est branchée. | Huit autres charges existent dans le jeu. Personne ne les tient encore. |
| :571 | Huit charges existent dans le jeu et **aucune n'est branchée**. | Huit charges existent dans le jeu et **personne n'y touche encore**. |
| :572 | Elles sont déclarées côté serveur mais n'ont aucune surface joueur — ni pour les confier, ni même pour les voir bouger. Tant que … quatre choses. | Elles existent, mais il n'y a rien derrière — ni pour les confier, ni même pour les voir bouger. Tant que c'est le cas, la délégation ne porte que sur quatre choses. |

## ㉝ Raser un site — `Operational/Demolition/DemolitionScreenController.cs` — cadres 79-84

⛔ **Deux chaînes de cet écran ne sont plus un trou : elles sont FAUSSES** (mesure du client du 2026-09-22 : `GET /v1/me/buildings` existe, 200, 17 bâtiments sur le compte de démo — `player-buildings.controller.ts:89`, qui rend par bâtiment `district_name` (fiction), `block_id`, `operational_type`, `name_i18n`, `lieutenant_ids`). Ici le texte n'est pas « une meilleure façon de dire le trou », c'est **le texte de l'état réel** :

| ligne | aujourd'hui | ratifié (état réel) | cadre |
|---|---|---|---|
| :518 | AUCUN SITE TROUVÉ | AUCUN SITE À VOUS | ㉝·79 « VOIR CE QUI COÛTE LE PLUS · site par site » |
| :526 | Aucune route ne liste vos bâtiments — on a ouvert {n} districts sans en trouver. C'est un trou de surface, pas une ville vide. | **Vous ne tenez encore aucun site** — rien à raser. *(le vide légitime, rare : la planque est donnée à l'arrivée, ㊵·142)* | ㉝·79 |
| :1038 (`NomDuSite`, repli) | Site du bloc {n} | Local sans enseigne — {district}, îlot {n} | vocabulaire servi `enseigne_inconnue` + `batiment_forme` ; ㉝·80 « Imprimerie Skeld — Les Friches, îlot 1604 » |
| (ligne de site) | {enseigne} seule | **{enseigne} — {district}, îlot {block}** en titre, le verdict en sous-ligne | ㉝·80 (`district_name` et `block_id` sont servis par la route) |

Et les deux qui restent un trou de registre :

| ligne | aujourd'hui | ratifié |
|---|---|---|
| :595 | La fiche n'est pas lisible — le serveur n'a rien rendu. | La fiche n'est pas lisible — on n'a pas eu de réponse. |
| :618 | Le serveur refusera tant qu'un lieutenant est affecté ici — il faut le réaffecter d'abord. C'est écrit avant le geste plutôt que découvert après. | On ne rase pas un site où quelqu'un travaille — il faut d'abord le réaffecter. C'est écrit avant le geste plutôt que découvert après. **(㉜·76 : « On vous le dit avant, pas après »)** |

## ㉘ La distribution — `Operational/Distribution/DistributionScreenController.cs` — cadres 54-58

| ligne | aujourd'hui | ratifié | cadre |
|---|---|---|---|
| :524 | Aucune route connue pour l'instant. | Aucune route tendue pour l'instant. | ㉘·54 « Cette route | n'est pas encore tendue » |

**Vérifié dans le code** : `route` à cette ligne est un `DistributionRouteDto` (:445), l'ITINÉRAIRE du coursier — pas un endpoint. Le mot est déjà dans son sens de fiction (la ficelle sur le liège) ; le défaut est « connue » (connue de qui ? du système), à côté du panneau « CETTE ROUTE ». « Tendue » est le mot du cadre 54. Cette chaîne **ne porte pas** sur le trou des bâtiments : elle reste une réécriture, pas un texte d'état réel. Sur cet écran, la liste des bâtiments (d'où ça part / où ça va, ㉘·54) se lit avec la forme `{enseigne} — {district}, îlot {block}` de la route `me/buildings`, comme ㉝ ci-dessus.

## ㉚ La chaîne d'appro — `Operational/ChaineDAppro/ChaineDApproScreenController.cs` — cadres 48-53

Aucune chaîne de cet écran n'est en classe B au classement. Le « même trou » que ㉝ est ailleurs : la découverte du labo balaie les 18 intérieurs (`DecouvrirBuildingId`, :189-229) et sert au joueur, en sous-titre de la panne (:612, `DerniereErreur`), deux phrases de dépôt :

| ligne | aujourd'hui | ratifié (état réel) | cadre |
|---|---|---|---|
| :197 | GET /v1/world/districts indisponible : {err} | La chaîne d'appro n'a pas répondu — Réessayez dans un instant. *(la formule maison, déjà à :610 ; l'erreur technique ne sort pas)* | — |
| :228 | aucun des 18 districts ne porte de bâtiment pour ce compte — la prémisse de cet écran (un kit de départ possédé) ne tient pas ici | **Rien à commander — vous ne tenez pas encore de labo.** *(avec `me/buildings` : aucun `operational_type` = lab)* ; et si la liste est vide : **Vous ne tenez encore aucun site.** | ㉚·48 « Sans elle, aucun labo ne rallume. » |

## ㊵ La filière — `Operational/Filiere/FiliereScreenController.cs` — cadres 137-142

Le cadre 140 (« Votre planque est prête. La filière, elle, reste à monter. ») et le 141 (« Une filière se construit étape par étape … La première a besoin d'une injection — donc d'une planque. ») disent l'état vide ; le 142 déclare ce qui ne se dira jamais (« Le montant n'a pas à ressortir », « L'écart est un voyant, pas une mesure »).

| ligne | aujourd'hui | ratifié |
|---|---|---|
| :369 | CE QUE LE SERVEUR ENVOIE VRAIMENT | CE QU'ON SAIT VRAIMENT |
| :369 | la route n'a rien rendu. Ce n'est pas « la filière est vide » : c'est « on ne sait pas où elle en est ». | on n'a pas eu de réponse. Ce n'est pas « la filière est vide » : c'est « on ne sait pas où elle en est ». |
| :419 | le premier maillon : sans elle, rien n'entre dans la filière. Le même lot débloque le ramassage des caisses de dealers. | le premier maillon : sans elle, rien n'entre dans la filière — et rien ne se ramasse chez les dealers non plus. |
| :422 | la propreté est la seule grandeur servie : ni montant, ni durée, ni frais. | on ne vous dira que si c'est propre : ni combien, ni depuis quand, ni à quel prix. C'est voulu. **(㉛·72)** |
| :425 | la route répond, et elle répond « rien » : ce n'est pas une panne, c'est un état. Il faut une planque pour que la filière commence quelque part. | ce n'est pas une panne, c'est un état : il n'y a rien à montrer tant qu'il n'y a rien de monté. Il faut une planque pour que la filière commence quelque part. **(cadre 141)** |

## ㊴ Le dossier — `Operational/Forensic/ForensicScreenController.cs` — cadres 131-136 (« trois pistes qui ne se mélangent pas »)

| ligne | aujourd'hui | ratifié |
|---|---|---|
| :176 | CE QUE LE SERVEUR NE DIT PAS | CE QUE LA VILLE NE DIT PAS |
| :176 | Une bande sans source ressemble à une bande mesurée | Une piste posée par habitude ressemble à une piste relevée |
| :176 | une bande peut être posée par défaut au lieu d'être mesurée, et rien ne les distingue une fois affichées. Cet écran ne peut donc pas trancher, et il préfère vous le dire plutôt que de vous les présenter toutes les trois comme des faits. | une piste peut être posée par habitude au lieu d'être relevée, et rien ne les distingue une fois sur le liège. On ne peut donc pas trancher, et on préfère vous le dire que de vous présenter les trois comme des faits. |
| :194 | CE QUE LE SERVEUR ENVOIE VRAIMENT | CE QU'ON SAIT VRAIMENT |
| :194 | la route n'a rien rendu. Ce n'est pas « tout va bien » : c'est « on ne sait pas ». | on n'a pas eu de réponse. Ce n'est pas « tout va bien » : c'est « on ne sait pas ». |

(« bande » est notre mot — `band` ; la maquette dit « piste » : 131 « trois pistes », 136 « pistes chaudes ».)

## ㊱ L'horizon — `Operational/Horizon/HorizonScreenController.cs` — cadres 113-118

Le code le dit lui-même (:131-143) : le cadre **116** (« Sans les textes — l'écran tel qu'il s'affiche aujourd'hui ») est de la copie de diagnostic écrite POUR NOUS (il finit par « Quelqu'un doit écrire les textes », déjà clos en classe A) ; le cadre **117** (« Rien à l'horizon ») porte le contenu joueur : « Les cartes viennent du monde, pas du menu ». Deux épingles de cet écran sont périmées (voir en tête). Il reste trois chaînes :

| ligne | aujourd'hui | ratifié | cadre |
|---|---|---|---|
| :181-185 | CE QUE LE SERVEUR ENVOIE VRAIMENT / Aucune de ces cartes n'a de nom / le serveur ne rend que des clés de traduction, et le dictionnaire du jeu ne contient que des messages d'erreur. Voilà l'écran tel qu'il s'afficherait aujourd'hui. | CE QU'ON SAIT VRAIMENT / Aucune de ces cartes n'a encore de nom / personne n'a encore mis de mot sur ces cartes : leur titre est un numéro d'ordre. Ce qui s'ouvre se lit à ses conditions et à son prix. | ㊱·118 « Écrire les noms et les descriptions — rien de tout ça n'existe » ; le titre-clé reste (Horizon:180, ratifié) — le panneau dit pourquoi il a cette tête |
| :352 | le serveur ne dit pas ce qui manque pour y arriver | on ne sait pas encore ce qui manque pour y arriver | ㊱·118 L2 |
| :439 | l'écran ne montre rien plutôt que de montrer un horizon périmé — ce qui était à portée il y a une minute ne l'est peut-être plus. | on préfère ne rien montrer qu'un horizon périmé — ce qui était à portée il y a une minute ne l'est peut-être plus. | ㊱·117 |

## ㊳ Le journal — `Operational/Journal/JournalScreenController.cs` — cadres 125-130

| ligne | aujourd'hui | ratifié | cadre |
|---|---|---|---|
| :274 | CE QUE LE SERVEUR ENVOIE VRAIMENT | CE QU'ON SAIT VRAIMENT | |
| :274 | le serveur rend des clés et un gabarit à trous ; les titres restent à écrire. Voilà le journal tel qu'il s'afficherait aujourd'hui. | les brèves sont arrivées sans leur texte : le journal de ce matin n'a que des titres à trous. Voilà ce qu'on peut vous montrer aujourd'hui. | ㊳·130 L1/L2 « Les titres sont des gabarits à trous » |
| :446 | la route n'a rien rendu. Ce n'est pas « la ville est calme » : c'est « on ne sait pas ce qu'elle a fait cette nuit ». | on n'a pas eu de réponse. Ce n'est pas « la ville est calme » : c'est « on ne sait pas ce qu'elle a fait cette nuit ». | ㊳·129 « Rien ce matin » (le vide légitime, à ne pas confondre) |

## ㉛ La loi — `Operational/Loi/LoiScreenController.cs` — cadres 67-72

| ligne | aujourd'hui | ratifié |
|---|---|---|
| :418 | Une affaire naît d'une descente — rien sur cet écran n'en crée. | Une affaire naît d'une descente — rien ici n'en crée. |

## ㊲ Le miroir — `Operational/Reputation/ReputationScreenController.cs` — cadres 119-124

⚠️ Les cadres **120** et **121** DESSINENT les deux phrases fautives (« le serveur refuse de juger votre constance », « le serveur dit que vous dérivez, jamais sur quelle règle : c'est un maillon manquant, pas un choix d'écran ») : la maquette est dans le même registre que le code. **Décision DA** : même réécriture des deux côtés ; `generateur-reputation.py` à aligner (atelier, lot séparé). Le titre de la maquette pour ses trous est « ce qui manque encore » (cadre 124).

| ligne | aujourd'hui | ratifié |
|---|---|---|
| :558 | Et le serveur refuse de juger votre constance tant qu'il n'a pas assez vu : **indéterminé**, jamais au milieu d'une jauge. | Et personne ne jugera votre constance tant qu'il n'a pas assez vu : **indéterminé**, jamais au milieu d'une jauge. |
| :572-574 | Le serveur dit **que** vous dérivez, jamais **sur quelle règle** : c'est un maillon manquant, pas un choix d'écran. | On vous dit **que** vous dérivez, jamais **sur quelle règle** : ce n'est pas un choix, c'est ce qui manque encore. |

(Les deux emphases en or — « rien pris de vous », « indéterminé » — sont conservées telles quelles, `Or()` :1478.)

---

## Compte

53 entrées au classement : 2 sont closes (« — »), 4 épingles sont périmées (réécrites sur le texte réel), 2 deviennent des textes d'état réel (㉝:526 et :518, + ㉚:228 hors classement), 1 est un faux positif de sens vérifié dans le code (㉘:524, réécrite quand même pour lever l'ambiguïté), et les 44 autres sont réécrites ci-dessus. Trois cadres de maquette portent le même registre que le code et sont à aligner dans l'atelier : ㉙·64, ㉜·78, ㊲·120-121.
