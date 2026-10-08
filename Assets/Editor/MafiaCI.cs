using UnityEditor;
using UnityEditor.TestTools.TestRunner.Api;
using UnityEngine;

// W4.P4a/C2-C3 — point d'entrée batchmode pour les PlayMode tests, appelé via
// `-executeMethod MafiaCI.RunPlayModeTests` par Tools/run-unity-check.sh. Existe parce que
// le TestRunnerApi est asynchrone (callback RunFinished) : cette classe pilote l'exécution et
// appelle EditorApplication.Exit() elle-même avec le code réel (0 = tout passe, 1 = au moins
// un échec), plutôt que de laisser `-quit` clore le process avant la fin réelle des tests.
public static class MafiaCI
{
    // Scopé à une liste de catégories plutôt qu'à TOUT PlayMode : la suite existante contient
    // des tests E2E lourds (charter 27, live docker stack, seed via Process) qu'aucun de ces
    // lots ne touche ni ne garantit disponibles — "aucun E2E" pour ces lots (voir mandats). Le
    // juge Unity exécute LEURS tests, pas la suite entière.
    // W3.U-DA (2026-08-15) : ajoute "W3UDA" à côté de "W4P4a" plutôt que de créer un second
    // point d'entrée — un seul juge batchmode par projet, élargi au fil des lots (même patron
    // que le cumul de branches côté back : on n'ajoute pas de gate, on élargit celui qui existe).
    // W3.U1 (design C1-F0) — ajoute "W3U1" au même titre : le shell/Home/Daily-Review est le
    // PATRON des 11 lots d'écrans suivants, et C1-F0 exige que ce lot passe par le MÊME filtre
    // que les précédents, jamais un second juge.
    // W3.U2/C4 (2026-08-17) — ajoute "W3U2" : premier chunk Unity du lot "intérieur de district"
    // (diorama nocturne), même patron — élargir, jamais un second point d'entrée.
    // ITEM 0 / `front.md` (2026-08-25) — ajoute "Charpente" : les falsifiables STRUCTURELLES qui
    // rendent vraie (ou fausse) la colonne « monté » des 49 écrans — la scène de démarrage du build,
    // le montage des locataires par le shell. Même patron : on élargit ce filtre, jamais un second
    // point d'entrée.
    // ⚠️ CE FILTRE MATCHE PAR REGEX NON ANCRÉE (règle LUE le 2026-09-24 : `RuntimeTestRunnerFilter.cs:31` du Test Framework,
    // `CategoryFilterExtended(s) { IsRegex = true }` ⇒ toute catégorie qui CONTIENT la demandée — `EcranDelegation` a pris
    // `PhotoEcranDelegation` au créneau du 24/09 ; on l'avait crue « par préfixe », ce qui n'en voyait qu'un cas), et un nom inexact
    // n'ERREUR PAS : il exécute un AUTRE jeu. ⚠️ Les mentions « aucune relation de préfixe (vérifié) » des inscriptions ci-dessous
    // ont été RELUES sous la règle réelle le 2026-09-24 (balayage sous-chaîne de toutes les catégories de Assets/Tests) : elles
    // tiennent, sauf les paires qui emportent une capture — `EcranDemolition`, `ScreenB3/B7/C1/C2/C3/C6` ⊂ leurs `Photo…` — et
    // `I18n` ⊂ `I18nReseau` ; voir le lot de classe qui renomme les captures (et `I18nReseau` → `CatalogueEnLigne`, 24/09 : qui
    // veut les deux les demande tous les deux). Et il
    // et le déclare vert (mesuré ici même le 2026-08-21 : `category_names: ["HUD"]` → 31/31 VERT
    // avec le défaut réarmé exprès, parce que le seul test décisif portait une AUTRE catégorie).
    // ⇒ après tout run qui doit DÉCIDER, relancer le test visé SEUL par son nom complet et vérifier
    // qu'il est dans le compte. Ne jamais choisir un nom de catégorie de mémoire : le lire dans le
    // fichier qui le porte.
    // ⛔⛔ RÉSOLUTION DE MERGE (2026-09-02) — UNION EXPLICITE, ET AUCUN CÔTÉ N'ÉTAIT SUFFISANT.
    // Les deux branches ont ajouté une catégorie et ignoré celle de l'autre : `main` portait
    // `DemoIdentity` (29 tests déclarés) sans `ScreenB3`, `pilote-B` portait `ScreenB3` sans
    // `DemoIdentity`. **Prendre un côté tel quel retirait des tests du filtre SANS RIEN DIRE** —
    // très exactement le défaut que l'avertissement ci-dessous décrit. Mesuré avant de résoudre :
    // 227 tests déclarés sous le filtre de `main`, et la liste de B en aurait retiré 29.
    // ⛔ CETTE LISTE EST UN FILTRE, ET UN TEST HORS LISTE NE TOURNE JAMAIS — sans que rien ne le
    // signale. Le run rend son `TOTAL:` et son exit 0 en ayant exécuté un AUTRE jeu que celui
    // qu'on croyait. Ce dépôt a déjà payé exactement ça : `category_names: ["HUD"]` a rendu
    // **31/31 VERT avec le défaut réarmé exprès**, parce qu'aucune catégorie « HUD » n'existe et
    // que le filtre matche par regex non ancrée (sous-chaîne).
    //
    // ⇒ Toute catégorie neuve doit être AJOUTÉE ICI le jour où elle est créée, sinon la suite qui
    // la porte est invisible au juge — verte par absence, ce qui ressemble trait pour trait à
    // verte par succès.
    //
    // `ScreenB3` ajoutée le 2026-08-31 : l'écran ㊲ (La réputation). Mesuré au moment de
    // l'ajouter — les catégories réellement portées par la suite sont W3U2 (17), Screenshot (11),
    // W3U1 (10), HUDv31 (5), Charpente (5), W4P4a (3), W3UDA (3), ScreenB3 (1), JUGE (1),
    // Capture (1). Quatre d'entre elles restent DÉLIBÉRÉMENT hors filtre — `Screenshot`,
    // `Capture`, `JUGE`, `HUDv31` produisent des images ou des rapports et coûtent cher ; elles se
    // lancent nommément, pas dans le run de vérification.
    // `Joignabilite` ajoutée le 2026-09-02 — et pour la RAISON QUE CE FICHIER DOCUMENTE DÉJÀ
    // deux lignes plus haut : quand `ScreenB3` manquait ici, 8 tests n'ont jamais tourné en se
    // déclarant verts. Les deux gardes du chantier joignabilité (le balayage du graphe de montage
    // et le clic des entrées du menu) portent cette catégorie ; sans cette ligne elles seraient
    // livrées, compilées, et JAMAIS EXÉCUTÉES par le juge — la forme la plus économique de garde
    // décorative. *Écrire une garde ne l'installe pas ; l'inscrire au filtre, si.*
    // ⚠️ `CarteVille` RE-RETIRÉE le 2026-09-03, la DEUXIÈME fois dans la journée. La branche
    // « légende » de DA est repartie d'un `main` ANTÉRIEUR à son propre renommage (une catégorie
    // par écran) et l'a réintroduite au filtre. Compté après merge : **0 fichier porteur**. Une
    // entrée que personne ne porte ne casse rien — elle AFFIRME une couverture qui n'existe pas,
    // le symétrique exact du défaut que ce fichier existe pour empêcher.
    // ⇒ *Une valeur retirée revient par la branche qui n'a pas vu le retrait.* Le contrôle utile
    //   n'est donc pas « l'ai-je retirée ? » mais « QUI la porte aujourd'hui ? », rejoué à chaque
    //   merge — c'est un compte, pas une mémoire.
    // ⚠️ Et le contrôle lui-même se contrôle : ma première version comparait dans le MAUVAIS SENS
    //   (« une catégorie portée commence-t-elle par l'entrée ? » au lieu de « l'entrée est-elle
    //   portée ? ») et accusait `PhotoEcranAppro`, qui est bel et bien portée par
    //   `ChaineDApproScreenPlayModeTests`. Un balayage qui accuse se vérifie sur un cas dont on
    //   SAIT la réponse avant de supprimer quoi que ce soit.
    // ⛔ `HUDv31` et `EcranDelegation` INSCRITES le 2026-09-03 — deux trous MESURÉS, pas supposés.
    // Balayage du jour : 25 fichiers / 85 tests ne portent QUE des catégories absentes de cette
    // liste, donc qu'aucun run ne peut demander. Une partie est délibérée (les `Photo*` de capture
    // et `Capture`, qui fait SIGSEGV sous Mesa — documenté plus haut), mais pas ces deux-là :
    //   · `HUDv31` : 5 fichiers / 24 tests — le chrome, la barre d'onglets, la zone sûre, le
    //     manomètre. Le socle de l'écran, jugé par personne.
    //   · `EcranDelegation` : la suite de ㉜, arrivée avec l'écran sans son inscription ici.
    // ⛔ RENOMMÉES LE 2026-09-24 (lot de classe, garde `CategoriesDeCapturePlayModeTests`) : le filtre est une regex NON ANCRÉE, et
    // `PhotoEcranDelegation` CONTENAIT `EcranDelegation` (elle partait avec l'écran). Correspondance : PhotoEcranDelegation →
    // ClicheDelegation · PhotoEcranDemolition → ClicheDemolition · PhotoScreenB3/B7/C1/C2/C3/C6 → ClicheB3/B7/C1/C2/C3/C6 ·
    // PhotoScreenC3SousChrome → ClicheSousChromeC3. Les documents datés avant cette date gardent les anciens noms (ce qui a TOURNÉ).
    // ⚠️ `PhotoEcranDelegation` (aujourd'hui `ClicheDelegation`) n'est PAS inscrite, et c'est délibéré : les catégories `Photo*`
    // écrivent des PNG à chaque exécution — les faire tourner sous le juge salit l'arbre à chaque
    // run. Même régime que `PhotoPlanche`/`PhotoRevue`.
    // ⚠️ Inscrire une catégorie ne la rend pas VERTE : c'est justement l'inverse du service qu'on
    // lui demande. Elles s'inscrivent APRÈS avoir été exécutées vertes, jamais avant — et c'est ce
    // qui a évité le pire ici.
    // ⛔⛔ CE QUE LE RUN DE VÉRIFICATION A TROUVÉ, ET POURQUOI `HUDv31` N'EST PAS DANS LA LISTE.
    // Inscrite puis exécutée, elle a passé DOUZE tests (multi-résolution, zone sûre, barre
    // d'onglets) puis **fait planter l'éditeur** sur `ManometreOraclePlayModeTests` :
    // `Got a SIGSEGV while executing native code`, core dumped, puis le process a pendu jusqu'au
    // plafond — `elapsed=904s timeout=900s`. La l'inscrire sans la lancer aurait fait tomber CHAQUE
    // run du juge en core dump, pour tout le monde. C'est un second porteur du SIGSEGV que ce
    // fichier documente déjà pour `Capture`.
    // ⇒ Le fichier fautif est sorti de `HUDv31` (catégorie `ManometreOracle`, hors filtre, même
    //   régime que `Capture`). `HUDv31` en compte donc 4 au lieu de 5 et redevient candidate — mais
    //   elle n'entrera ici qu'après un run vert, parce que sa 4e suite (`TopBarDoctrineV31`, 7
    //   tests) n'a JAMAIS tourné : le crash est arrivé avant elle. *Douze verts ne disent rien des
    //   sept qui n'ont pas démarré.*
    // ✅ `HUDv31` INSCRITE le 2026-09-23 — voir la note des six inscriptions du créneau 05:18-05:58, plus bas.
    // ⛔ LES `Photo*` SONT DEHORS — TOUTES, depuis le 2026-09-03. Elles écrivent des PNG dans
    // `Assets/Screenshots` à chaque exécution : les faire tourner sous le juge salit l'arbre à
    // chaque run, et un `git add` distrait embarque alors des captures que personne n'a regardées.
    // ⚠️ MA RÈGLE DE FUSION LES A LAISSÉES ENTRER. En résolvant trois conflits de suite sur cette
    // ligne j'ai appliqué « union de ce qui est PORTÉ » — juste contre les entrées MORTES, muet
    // sur la question de savoir si une catégorie portée DOIT être jugée. Résultat mesuré :
    // 8 `Photo*` dehors et 2 dedans (`PhotoChantierC`, `PhotoEcranAppro`), pendant que je refusais
    // `PhotoEcranDelegation` pour cette raison exacte, dans le même commit.
    // ⇒ Deux critères, pas un : (1) l'entrée est-elle PORTÉE ? sinon elle affirme une couverture
    //   qui n'existe pas ; (2) sa suite doit-elle tourner sous le juge ? une capture, non.
    //   La première est un compte, la seconde une décision — les confondre laisse passer les deux
    //   sortes d'erreur.
    // ✅ `EcranDistribution` INSCRITE (2026-09-22) — ses 20 tests sont des parcours, des états et des résolveurs, AUCUNE capture :
    //   la capture C1 qui la faisait tomber (image uniforme, 03/09) a été RETIRÉE par 6f4a57a3, et la planche de ㉘ est
    //   `planche_la_distribution_1080x2400.png`, produite par `PhotoChantierC` sous la garde d'effet. Verte SEULE avant
    //   inscription : `passed=20 failed=0 declares=20 comptes=20`, catégories RÉELLEMENT exécutées = [EcranDistribution], sans
    //   paire d'identité (run du 22/09 23:29). Aucun test n'exige la paire : elle entre dans la PARTIE 1 du gate client.
    // ⛔ `MutationDeCarte` (1 test) HORS DU FILTRE, PAR CONSTRUCTION, ET POUR TOUJOURS (raison écrite le 2026-09-23, table
    //   `categories-hors-filtre.md`) : c'est `Capture_Detail_ApresTampon_SousChrome_MUTE`, qui RÉSOUT une exception pour de bon sur le
    //   compte de capture — sa catégorie a été choisie pour n'être le préfixe de rien, parce qu'un lancement de `CaptureDetail` l'avait un
    //   jour emportée et consommé la carte. Elle se lance SEULE, à dessein, avec la paire, après avoir prévenu. Jamais au filtre par défaut.
    // ✅ SIX INSCRIPTIONS DU CRÉNEAU 2026-09-23 05:18-05:58 (tête 8d689a75 = merge CLIENT-2 ada52db4 + `MAFIA_CI_TESTS`), sans la paire,
    //   aucun test n'en exige (0 appel d'identité de capture), déclarés == comptés partout, VERDICT code=0 :
    //   `HUDv31` 32/32 · `CarteActions` 3/3 · `PoliceGras` 1/1 · `VideChezLeNouveau` 1/1 (passage 2, 05:51, `passed=37 failed=0
    //   declares=37 comptes=37`) ; `IconesDispatcher` 1/1 · `EcranDistrict` 10/10 (passage 1, dans le même lot que Charpente ;
    //   `EcranDistrict` = ⑬ de CLIENT-2, 4 tests à 218e2829 + 6 de ①-0/①-1/①-2). Préfixes : `EcranDistrict` emporte
    //   `EcranDistribution`, déjà inscrite ; aucune autre entrée neuve n'emporte une catégorie non inscrite (compteur : 591 → 639 = +48).
    //   Toutes en PARTIE 1 du gate client. Rapport : `Tools/juge-donnees/creneau-2026-09-22/categories-hors-filtre.md`.
    // ⛔ `ManometreOracle` (5 tests) RESTE DEHORS — GEL reproduit SEUL le 2026-09-23 : `Oracle1_Ring_UniqueLaitonFamily_On360_…`, filtre
    //   par nom, 1 déclaré : journal muet 245 s après son `RUN`, CPU ≈ 378 %, le délai de test d'Unity ne mord pas (fil principal
    //   gelé) ; tué par le chien de garde du lanceur, puis SIGSEGV au démontage de mono (effet du kill, pas une preuve de crash
    //   autonome). Même signature que le 03/09 (en-tête du fichier de test). Rien ne boucle côté C# avant son premier `yield` ;
    //   `TopBarDoctrineV31` porte le même motif (`WaitForEndOfFrame` + `CaptureScreenshotAsTexture`) et passe 19/19 : le motif
    //   seul n'explique pas le gel. Les 4 autres tests de la classe n'ont JAMAIS tourné : à mesurer PAR NOM (`MAFIA_CI_TESTS`),
    //   Oracle1 exclu.
    // ⛔ `SondeGelVolontaire` (1 test) HORS DU FILTRE, PAR CONSTRUCTION (2026-09-23) : c'est le contrôle positif du chien de garde de
    //   GEL de `run-unity-check.sh` — il gèle le fil principal quand `MAFIA_SONDE_GEL=1` est posée, et sort Inconclusive sinon. Il se
    //   lance SEUL, par nom (`MAFIA_CI_TESTS`), et doit rendre RC=5 avec le test nommé. Au filtre par défaut il ne prouverait rien.
    // ⛔ `Screenshot` RESTE DEHORS (TD-625) — et `DashboardPlayModeTests.CaptureDashboardScreenshot` le confirme (passage 3, par nom) :
    //   il SUPPRIME la planche commitée (`File.Delete`, DashboardPlayModeTests.cs:345) AVANT `ScreenCapture.CaptureScreenshot`, qui
    //   n'écrit rien en 10 s en batchmode ⇒ échec = planche détruite. Défaut d'INSTRUMENT, dette datée dans `dette-captures.md`.
    //   Les 2 autres tests de la classe (`LoadsDashboard_…`, `Wallet_WithoutToken_…`) sont SANS catégorie : verts par nom (2/2),
    //   injoignables par tout filtre de catégories tant qu'ils n'en portent pas.
    // ✅ `EcranRevue` (⑯, 32 tests) et `EcranFile` (⑨, 18 tests) INSCRITES (2026-09-23) — écrans de CLIENT-2, entrés au cumul
    //   par le merge de `ecrans/2026-09-23` (8d632ebd, 34aab08c). Sans elles, ⑯ et ⑨ n'étaient dans AUCUN gate. Vertes chez
    //   CLIENT-2 : `passed=70 failed=0 declares=70 comptes=70`, [Ecran10, EcranExceptions, EcranFile, EcranRevue] (a3134d5f,
    //   sur 13ed9869, pile aea5ef7c) ; la preuve sur CE cumul est la partie 1 qui suit le regroupement. Aucune n'exige la
    //   paire, aucune n'écrit de PNG, aucune relation de préfixe (ni `EcranF…`/`EcranR…` inscrite ne les emporte) : PARTIE 1.
    // ✅ `Palette` INSCRITE (2026-09-22) — la garde TD-612 (« aucun littéral ne recopie un token nommé »). Née le 06/09
    //   (d665720d, 28696e43) pour ROUGIR sur son dénominateur mesuré, elle n'avait JAMAIS été inscrite : une garde rouge
    //   hors de tout filtre ne garde rien — c'est CLIENT-2 qui l'a trouvée rouge (34) en la lançant à la main. Fermée par ⑯
    //   (9) puis par les 5 commits par assembly du 22/09 (6d3e5bfc…15ba04fb, 34 → 0 au port Python). Verte SEULE avant
    //   inscription : `passed=5 failed=0 declares=5 comptes=5`, catégories RÉELLEMENT exécutées = [Palette] (22/09 23:50).
    //   Sans paire, sans relation de préfixe : PARTIE 1 du gate client.
    // ⚠️ `ScreenC2` et `FiliereSonde` sont inscrites, elles, parce qu'elles ont tourné VERTES dans
    // ce même run (28 passés / 1 échec — celui de la capture C1 de ㉘, retirée depuis). *Le même run tranche
    // dans les deux sens : il inscrit ce qui passe et refuse ce qui tombe.*
    // ⛔⛔ `CaptureJournal` / `CaptureFiliere` / `CaptureDossier` NON INSCRITES — elles passent
    // SEULES et tombent EN GROUPE, et je n'ai pas su nommer le coupable. Les quatre mesures, dans
    // l'ordre où je les ai prises (2026-09-03) :
    //   les 3 + `Joignabilite` + `ScreenC2`  → 12 passés / **2 échecs** (㊴ et ㊳ « n'ont RIEN chargé »)
    //   les 2 en défaut, SEULES              →  2 passés / 0 échec
    //   + `Joignabilite` seulement           → 11 passés / 0 échec
    //   + `ScreenC2` seulement               →  4 passés / 0 échec
    //   + `CaptureFiliere` seulement         →  3 passés / 0 échec
    // ⇒ Aucune addition UNIQUE ne reproduit. *Quand ça ne reproduit pas, c'est une information* :
    //   la cause est DIFFUSE — de l'état accumulé sur un run long (le run rouge en portait 14, les
    //   verts 2 à 11), pas un co-tenant identifiable. Les gardes qui tombent sont celles que le
    //   chantier B a écrites aujourd'hui contre le vert à vide, et elles font exactement leur
    //   travail : elles refusent de photographier un écran qui n'a pas chargé.
    // ⇒ Les inscrire ferait tomber le juge, qui exécute justement des runs longs. Elles restent
    //   dehors jusqu'à ce que la reproduction soit construite — et construire la reproduction fait
    //   partie du correctif, sinon le prochain lot repaie ces quatre runs.
    // ⚠️ Ce n'est PAS un défaut des écrans : ils chargent et se capturent correctement en isolé.
    private static readonly string[] Categories =
        { "W4P4a", "W3UDA", "W3U1", "W3U2", "Charpente", "DemoIdentity", "ScreenB3", "ShellSurimpression", "CaptureDistrict", "CaptureReputation", "CaptureFamille", "Joignabilite", "ScreenCarte", "CaptureCarte", "EcranAutonomy", "EcranExceptions", "EcranRegleLieutenant", "EcranTenureLieutenant", "EcranUiLieutenant", "EcranRegleTier2", "EcranAppro", "ScreenB7", "ScreenC1", "ScreenC6", "EcranDelegation", "ScreenC2", "EcranDemolition", "ScreenC3", "EcranLoi", "EcranConflit", "Ecran10", "I18n", "CatalogueEnLigne", "BundleReel", "JUGE", "CaptureDetail", "CaptureExceptions", "CaptureFiche", "CaptureSousChrome", "CaptureHorizon", "CaptureForensic", "FicheTete", "Graisses",
        // Montage de l'art (2026-09-07) — entre au filtre AVEC son compte vert, jamais avant :
        // une garde qui n'a jamais tourné n'est pas une garde. Mesuré sous surcharge :
        // `passed=2 failed=0 declares=2 comptes=2`, couverture 12/12, zéro réseau, zéro écriture.
        "CarteIcones",
        // Glyphes d'archétype (2026-09-07) — vert AVANT inscription :
        // `passed=4 failed=0 declares=4 comptes=4` avec CarteIcones, couverture 6/10,
        // zéro réseau, zéro écriture, zéro semis.
        "IconesArchetype",
        // Bloc partagé + châssis de ㉟ (2026-09-07) — verts AVANT inscription, dans le même
        // créneau : `passed=5 failed=0 declares=5 comptes=5`, catégories RÉELLEMENT exécutées
        // = [BlocPartage, ChassisVente]. Zéro réseau, zéro écriture, zéro semis : les deux
        // suites fabriquent leur monde (bloc partagé construit, canvas monté à la main).
        // ⚠️ `BlocPartage` a rougi DEUX fois avant ce vert, et jamais sur le code qu'elle juge :
        //    d'abord parce que ses deux relevés n'étaient pas pris au même instant de frame,
        //    puis parce que `Canvas.scaleFactor` vaut 1,000000 dans la frame de sa création —
        //    ×2 exactement sur toute la géométrie. Elle porte donc un rendu de CHAUFFE.
        "BlocPartage",
        "ChassisVente",
        // Gestes de la fiche canonique (2026-09-09) — inscrits seulement après le run combiné
        // réel : 4/4 avec FicheTete, dont collecte + blanchiment contre la pile Docker, chacun
        // propriétaire de son semis. Leur absence du filtre rendrait les CTA à nouveau décoratifs
        // sans que le gate principal ne le voie.
        "FicheBlanchiment",
        "FicheCollecte",
        // ㉟ RAMASSER (2026-09-12) — vert AVANT inscription, run combiné réel contre la pile dev
        // qui sert les 12 clés (dealer_spot_id compris) :
        // `passed=5 failed=0 declares=5 comptes=5`, catégories RÉELLEMENT exécutées =
        // [FicheBlanchiment, FicheCollecte, Graisses, PhotoVente, VenteRamassage].
        "VenteRamassage",
        // ⑮ le registre des 18 districts + le dépôt (2026-09-22) — vert AVANT inscription, seul,
        // contre la pile dev : `passed=5 failed=0 declares=5 comptes=5`, catégories RÉELLEMENT
        // exécutées = [Inspection], elapsed=77s. Un semis (le seeder, propriétaire), 18 + 1 + 1
        // lectures et un dépôt FONDÉ par run sur le compte semé ; un compte frais par test de
        // premier jour. ⚠️ Son premier run (13:32) avait un rouge, et c'était le TEST qui avait
        // tort — « un compte frais ne possède rien » — pas l'écran : la planque est donnée à
        // l'arrivée. Le compte ci-dessus est celui du run qui a suivi la correction.
        "Inspection",
        // Réinscrite le 2026-09-22 — verte seule avant inscription (20/20), voir la note au-dessus du tableau.
        "EcranDistribution",
        // Inscrite le 2026-09-22 — verte seule avant inscription (5/5), voir la note au-dessus du tableau.
        "Palette",
        // Inscrites le 2026-09-23 au regroupement — ⑯ et ⑨ de CLIENT-2, voir la note au-dessus du tableau.
        "EcranRevue",
        "EcranFile",
        // Inscrites le 2026-09-23 après le créneau 05:18-05:58 — vertes avant inscription, voir la note au-dessus du tableau.
        "HUDv31",
        "CarteActions",
        "PoliceGras",
        "VideChezLeNouveau",
        "IconesDispatcher",
        "EcranDistrict",
        // ㊵ porte la filière (2026-09-23) — 3/3 vert AVANT inscription, par nom (MAFIA_CI_TESTS), créneau 06:20-06:29, tête
        // e21e0c55 : l'ordre par stage_index et l'écart de TÊTE sur le compte semé (4 étapes, 0 écart), + 2 états fabriqués.
        // Sans la paire, aucune relation de préfixe (vérifié) : PARTIE 1. Validé par l'orchestrateur.
        // RECOMPTÉ 5 (2026-09-23, 2c3af6bf : + la propreté de la table 48 — couverture du domaine et corps RÉEL du 07/09) : 5/5 vert au
        // créneau de CLIENT UNITY (pile e7f52351, tête 25bcb0b1, run court 132/133, le seul rouge hors de cette catégorie).
        "EcranFiliere",
        // Les gardes de CLASSE du texte affiché (2026-09-23, CLIENT-2) — 7/7 vert AVANT inscription au créneau 06:39 (tête 3f9ecad3,
        // pile d8e41362, 418/420 : le seul rouge était un test du Tissu resté à l'apostrophe ASCII, vert au ciblé de 06:45 par nom). Portent
        // R1-R3 (couverture de domaine de 49 résolveurs, domaines lus dans le back ; sentinelles « __inconnu__ »), G1-G2 (plus de glyphe
        // en texte ; toute valeur en couleur porte un mot) et N1-N2 (aucun littéral nommé hors Libelle, allowlist EXACTE). Hors paire :
        // aucune relation de préfixe (tests statiques + résolveurs purs). Validé par l'orchestrateur.
        "Replis",
        // La garde des catégories (fdc13219, CLIENT-2) : K0 aucune catégorie n'en contient une autre, K2 aucune capture ne porte d'écran,
        // K3 un test qui écrit une image est une capture ou une exception nommée — 3/3 vert AVANT inscription au créneau de CLIENT UNITY
        // du 2026-09-24 (tête 92bfb1ba, pile 66060cc1, déclarés 115 = comptés 115, Assets/Screenshots propre après le run). Statique,
        // sans réseau. Aucune relation de préfixe (K0 elle-même). Validé par l'orchestrateur.
        "GardeCategories",
        // L'URL du back, UNE source (9667532b, 2026-09-24) : A1 contrôles de l'instrument, A2 0 URL littérale hors AdresseDuBack.cs, A3 aucune
        // ressource d'URL laissée, A4 l'EFFET (un écouteur HTTP local devient la source ; le shell y signe, Loi/Conflit/Distribution/Réputation
        // montés par le shell y envoient leurs requêtes). 4/4 vert DANS le run large du créneau du 2026-09-24 (tête e7a71a52, pile 66060cc1,
        // 133/0/1, déclarés 134 = comptés 134). Réseau LOCAL seul (127.0.0.1, port libre), aucun compte touché. Aucune relation de préfixe
        // (vérifiée). Validé par l'orchestrateur.
        "AdresseDuBack",
        // TD-490 (2026-09-23) — deux tests E2E SANS catégorie, donc jamais lancés par un filtre, dont les épingles avaient pourri
        // derrière les traductions : réparés EN ENTIER (épingles déléguées aux résolveurs, bc658b2c / 4ae0dfa0 / 881a0ed4), catégorie
        // posée sur la MÉTHODE (la classe emporterait sa capture `Screenshot`). Verts AVANT inscription : créneau 06:48-06:57, tête
        // 881a0ed4, `FicheOperationnelle,BoucleOperationnelle` → passed=3 failed=0, VERDICT 0, 0 catalogue. Sans la paire (compte du
        // seeder) : PARTIE 1. Validé par l'orchestrateur.
        "FicheOperationnelle",
        "BoucleOperationnelle",
        // ④ l'Accueil (a02aa2fb, baab41ab, 4c3de5f0, 37f518ac) et ⑦ les deux décisions (fac52423, 140a13f6) — verts AVANT inscription
        // au créneau de CLIENT UNITY du 2026-09-23 (pile e7f52351, tête 25bcb0b1, sans la paire) : EcranAccueil 5/5,
        // EcranLieutenantDecisions 4/4 (run court 132/133 ; le seul rouge, BundleReel, corrigé en fc3033ec puis 4/4 seul). Aucune
        // relation de préfixe avec une autre catégorie (vérifié). Validé par l'orchestrateur.
        "EcranAccueil",
        "EcranLieutenantDecisions",
        // ② la fiche bâtiment, lots 1, 4 et 6 (2026-09-23, CLIENT-2) — 10/10 vert AVANT inscription au créneau de 08:00 (tête 84b77b9c,
        // pile e7f52351, 445/446, 0 rouge). Pupitre (3 échelles), serre, saisie : 9 tests sans réseau + P5, RÉEL en LECTURE SEULE (un vrai
        // labo d'operational_demo, aucune mutation). Aucune relation de préfixe (vérifié). Validé par l'orchestrateur.
        "FicheBatiment",
        // ㉕ le tutoriel (2026-09-23, CLIENT-2) — 3/3 vert AVANT inscription, même créneau (08:00, tête 84b77b9c, pile e7f52351) : le texte
        // servi au lieu de l'identifiant, « null » n'est pas « tout vu », la bascule dans le sens du joueur. Sans réseau. Aucune relation de
        // préfixe (vérifié). Validé par l'orchestrateur. ⚠️ Reglages n'entre PAS encore : K2 passe d'abord sur un compte neuf.
        "Tutoriel",
        // ⑲ les réglages (2026-09-23, CLIENT-2) — 7/7 vert AVANT inscription au créneau de 08:25 (tête 97b1ed00, pile e7f52351) : les deux
        // bascules servies (tutoriels, marché), « Fermer le coffre » vivant, la forme G ; K1-K3 le coffre rouvert. K2 est RÉEL et fait une
        // vraie sortie : sur un compte NEUF depuis 81dc18b5 (jamais le compte de démo partagé). Aucune relation de préfixe (vérifié).
        // Validé par l'orchestrateur.
        "Reglages",
        // ② AshLuxury (2026-09-23, CLIENT UNITY) — trois tests réels SANS catégorie (même classe que TD-490 : aucun filtre ne les lançait),
        // catégorie posée sur la MÉTHODE (la classe emporterait sa capture `Screenshot`). Verts AVANT inscription, par nom (MAFIA_CI_TESTS),
        // au créneau de la partie 1 du gate (pile e7f52351, tête 5d7c8678) : 3/3, après l'exemption partagée de l'échéance en jours
        // (ab7059d8). Ils sèment operational_demo (seeder), jamais le compte gelé : PARTIE 1. Aucune relation de préfixe (vérifié).
        // Validé par l'orchestrateur.
        "AshLuxury",
        // Passe UX du 24-26/09 (CLIENT-1) — cinq catégories NEUVES, vertes SEULES avant inscription au créneau du 26/09 05:04-05:10
        // (cumul 22fdcb55, pile 66060cc1, sans la paire, empreinte de demo_capture identique avant/après) : run 1 = 68/69, le seul rouge
        // (CartePanneau P4, attendu écrit à la main) corrigé en 27effcba et vert au run 2 (par noms, 35/35). Aucune relation de préfixe
        // (compteur : RÉELLEMENT prises = PORTÉES = les 5). Hors paire, aucune capture : PARTIE 1. Validé par l'orchestrateur.
        "RetourSerie6",    // 10 — revenir en série 6 : retour du système, onglet actif, G1/G2/G3/G5, F1 (fusion B4)
        "CartePresence",   //  4 — ③ la présence du joueur (D21, table 58)
        "CartePanneau",    //  4 — ③ le panneau d'un district par valeur (table 68 + addendum)
        "ChainesDev",      //  4 — aucune chaîne de développeur à l'écran (crochets, noms de type) ; table 66 des diagnostics
        "EtatsVides",      //  2 — table 63 v2 (① BLANCHIR, planque vide)
        // « La suite » (cadre 4 de ④, table 72, CLIENT-1, 2026-09-26) — catégorie NEUVE, verte avant inscription au créneau du 26/09
        // (cumul c4889d71 : LaSuite+AccueilCanon+EcranAccueil+BundleReel+Charpente = 69/70, 1 ignoré déclaré, déclarés = comptés ; LaSuite
        // 10/10). Hors réseau, aucune capture : PARTIE 1. Aucune relation de préfixe (compteur : PORTÉES = prises). Validé par l'orchestrateur.
        "LaSuite",         // 10 — la décision par état (A1/A2/A3/B/C/D), l'ordre, les disparitions, les gestes, le premier geste doré
        // ⑥ CuisinierAuRepos (CLIENT-2) — catégorie portée, jamais inscrite : verte au créneau CLIENT-1 du 26/09 (cumul 5632e6db, pile
        // 1ffb08b4) dans le run de liste (2/2, 241/243, seul rouge la dette ZeroRepli coupée en 1c51baf8), pas lancée seule. Aucune relation
        // de préfixe (compteur : PORTÉES = prises). Validé par l'orchestrateur.
        "CuisinierAuRepos", //  2
        // Créneau CLIENT-1 du 26/09 (cumul 386e4a38 → b7fb8a8d, pile 1ffb08b4) : trois catégories PORTÉES, jamais inscrites — la 2ᵉ fois
        // aujourd'hui après CuisinierAuRepos, c'est une CLASSE (garde de classe à suivre). Vertes dans le run 2 de la liste (584 : 581 verts,
        // les 2 rouges étaient deux gardes de classe, corrigées en b7fb8a8d et rejouées 2/2). Validé par l'orchestrateur.
        "AccueilCanon",     // 10 — ④ canon : mise en page, la suite, la file au-dessus du dock, le fond, A9/A10 structure
        "PlanqueVide",      //  6 — ① / ㊵ la planque vide ou non (table 63)
        "ConflitReel",      //  1 — ㉙ contre le back réel
        // La DETTE DATÉE de la garde « catégorie jamais inscrite » (dba0b20e) rétrécit : les 15 autres catégories fonctionnelles, lancées au créneau
        // CLIENT-1 du 26/09 (pile 256de0f8), vertes — EtatDuShell après de887d7d (S1 avait vu, à raison, un statique mutable de B5).
        // ManometreOracle reste HORS filtre : Oracle1 GÈLE (reproduit : RC=5, chien de garde à 180 s). Validé par l'orchestrateur.
        "CeQuiArrive", "ChaineSilencieuse", "CommissariatDuJoueur", "EtatDuShell", "FicheLabo", "GestesDeVente", "HorizonAuMontage",
        "HoteDeRecrutement", "LocuteurReel", "MenuPlus", "ProfilEnMots", "RevueSansRoutine", "SansRelais", "SessionAuRetour", "VariablesDeRefus",
        // C4 (CLIENT-1, 07/10) — l'horloge légère `GET /v1/me/clock` en appel de FOND (`X-Mafia-Background: 1`) : 6 tests hors réseau, sans
        // paire. Catégorie NEUVE, inscrite le jour où elle naît (la garde I1 l'exige) ; verte au créneau suivant, jamais déclarée verte avant.
        "HorlogeLegere",
        // COLLECTE (CLIENT-1, 07/10) — les bandes et les codes du ramassage de la caisse (tables 75/85 de l'atelier), 8 tests hors réseau, sans
        // paire. Catégorie NEUVE inscrite le jour où elle naît (garde I1) ; verte au créneau suivant, jamais déclarée verte avant.
        "CollecteMots",
        // CanvasRacine (CLIENT-2, 07/10) — la résolution partagée du Canvas racine d'un écran (fin de B3H1 « photographie le Canvas d'un test précédent ») :
        // 5 tests. Verte 5/5 au créneau de CLIENT-1 du 07/10 (HEAD fccb633c, run par FILTRE de catégories avec ScreenB3, CuisinierAuRepos, IconesArchetype,
        // EcranFile, … : 142 déclarés = 142 comptés, VERDICT 0), PAS dans l'ordre d'un run complet — le prochain gate complet le dira. Inscrite le jour où
        // elle est verte, sortie de la dette datée de la garde I1. Filtre : 100 → 101 catégories, 963 → 968 tests au compteur.
        "CanvasRacine",
        // ClientHttp (CLIENT-2, TD-767) — le client HTTP commun : `Authorization`, `Idempotency-Key` et l'en-tête de fond posés en UN endroit, garde de valeur G1-G4 (0 littéral d'en-tête
        // hors du client). Verte 4/4 au créneau de CLIENT-1 du 07/10 nuit (HEAD 2de97eb4, run par FILTRE de catégories avec CollecteMots, AccueilCanon, HorlogeLegere, LaSuite, SessionAuRetour,
        // GardeCategories, EcranFile : 137 déclarés = 137 comptés). PAS dans l'ordre d'un run complet : le prochain gate complet le dira. Filtre : 101 → 102 catégories, 981 → 985 tests.
        "ClientHttp",
        // ListeDefilante (CLIENT-1, 07/10, cause 7 du rapport de conformité de CLIENT-3) — le défilement + le fondu + l'ascenseur communs : calcul pur, effet sur une fenêtre, garde de classe
        // (tout RectMask2D passe par lui ou est une exception nommée). Catégorie NEUVE inscrite le jour où elle naît (garde I1) ; PAS ENCORE JOUÉE : verte au créneau, jamais déclarée avant.
        "ListeDefilante",
        // PiedDEcran (CLIENT-1, 07/10, cause 3 du rapport de conformité de CLIENT-3) — les DEUX grammaires du geste principal de la maquette (`.cta6` des écrans de lecture, `.geste` des écrans de commande) :
        // couleurs, effet sur un bouton construit, garde (㉚ ㉘ ㊵). Catégorie NEUVE inscrite le jour où elle naît (garde I1) ; PAS ENCORE JOUÉE.
        "PiedDEcran",
        // MotsDesEnumeres (CLIENT-1, 07/10, cause 4 du rapport de conformité de CLIENT-3) — le résolveur commun des énumérés (⑭ ⑮), sa garde de classe (plus de `Lisible(`, liste noire anglaise) et la dette datée de ㉔. PAS ENCORE JOUÉE.
        "MotsDesEnumeres",
        // FileDeLAccueilRaison (CLIENT-1, 07/10) — les deux lignes ajoutées au cadre 4 de ④ : la raison du lieutenant et « Plusieurs attendent encore ». PAS ENCORE JOUÉE.
        "FileDeLAccueilRaison",
        // EnteteDEcran (CLIENT-1, 08/10) — classes C-a/C-b du juge groupé : le bandeau de titre en gabarit, la police et l'échelle des titres. PAS ENCORE JOUÉE.
        "EnteteDEcran",
        // BandeBasse (CLIENT-1, 08/10) — classe C-c et instances A du juge groupé (㉚ rouge + pied en bande, ㉘ jetons d'action, ㉞ bande éteinte + pastilles + réglure). PAS ENCORE JOUÉE.
        "BandeBasse",
        // EcranVitrine (CLIENT-1, 08/10 ; « Vitrine » jusqu'au 08/10 soir, renommée : la regex non ancrée prenait PhotoVitrine avec elle, K0) — ㉓ : les cinq A et trois B du juge groupé du 07/10 (grille 2×2 de plaques illustrées, dessins par article, bande basse sans voix, comptoir, intitulés, médaillon) ; dessins purs, garde de source, effet
        // sur un catalogue fabriqué. Catégorie NEUVE inscrite le jour où elle naît (garde I1) ; PAS ENCORE JOUÉE.
        "EcranVitrine",
        // DecorDeScene (CLIENT-2, 08/10) : verte SEULE au créneau du 08/10 (passed=38 failed=0 declares=38, HEAD feat/decor-de-scene) —
        // primitives, Poser, catalogue = INDEX, rendu 540×960, filets D6, gardes statiques D2/D3/D6b.
        "DecorDeScene",
    };
    // ⚠️ UNION AU MERGE (3e fois sur cette ligne le 2026-09-03) — et la règle est
    // toujours la même : on unit ce qui est PORTÉ, jamais les deux listes. Une entrée
    // sans porteur affirme une couverture qui n'existe pas ; une entrée portée qu'on
    // retire rend ses tests inatteignables sans que rien ne rougisse. Le compte se
    // refait à CHAQUE merge — c'est une mesure, pas une mémoire.
    // ⚠️ Le balayage des porteurs utilise `Category\("x"\)` PARTOUT, jamais
    //   `\[Category\("x"\)\]` : la forme combinée `[UnityTest, Category("x")]` est
    //   employée ici et le motif étroit en cachait HUIT le 2026-09-03.
    // ⚠️ UNION AU MERGE DU 2026-09-03 : `CarteVille` vient du lot « ville peinte », les huit
    // autres du chantier C et du mien. Les deux branches avaient RAISON séparément et le
    // conflit portait sur la LIGNE, pas sur l'intention — un filtre se fusionne toujours en
    // union : une catégorie retirée ici rend ses tests inatteignables SANS que rien ne rougisse.
    // `ScreenCarte` et `CaptureCarte` ajoutees le 2026-09-02 (chantier C) — POUR LA RAISON QUE CE
    // FICHIER DOCUMENTE DEJA DEUX FOIS. Mesure du jour sur `Assets/Tests/PlayMode` : 86 fichiers,
    // 68 portent une categorie, 15 n'en portent AUCUNE et abritent 30 tests. Les 4 suites de la
    // carte en faisaient partie, et la capture `Capture_CarteDeVille_SousChromeV31` n'heritait que
    // du `Capture` de sa classe — or ce meme depot documente que la categorie `Capture` ENTIERE
    // fait SIGSEGV dans le pilote Mesa : cette capture n'etait donc atteignable par AUCUN filtre
    // executable. Poser la categorie sur les suites sans l'inscrire ICI aurait ferme le defaut
    // visible en laissant le defaut reel : *ecrire une garde ne l'installe pas ; l'inscrire au
    // filtre, si.*
    // ⚠️ Il reste 11 fichiers sans categorie (TD-490) — ce lot ne ferme pas la classe.

    // ⚠️ `MAFIA_CI_CATEGORIES` (liste séparée par des virgules) REMPLACE le filtre par défaut.
    // Ajouté le 2026-08-31 pour une raison précise et vérifiable : le log ne NOMME que les tests
    // qui échouent, donc « 0 échec sur ma catégorie » ne distingue pas « tout est vert » de
    // « le filtre n'a rien matché » — le zéro d'ABSENCE, déjà payé une fois sur cet écran quand
    // `ScreenB3` manquait dans `Categories` et que 8 tests n'ont jamais tourné en se déclarant verts.
    // Le compteur global ne le dit pas non plus : mesuré, il vaut 231 tests exécutés AVANT comme
    // APRÈS l'ajout de mes 9 tests. Un run filtré sur une seule catégorie rend `passed=N` pour
    // CETTE catégorie, et N est alors une preuve d'exécution, pas une absence d'échec.
    // ⛔ Non posée, la variable laisse le comportement BYTE-IDENTIQUE pour tout appelant existant.
    public static void RunPlayModeTests()
    {
        string[] cats = Categories;
        string surcharge = System.Environment.GetEnvironmentVariable("MAFIA_CI_CATEGORIES");
        if (!string.IsNullOrWhiteSpace(surcharge))
        {
            cats = surcharge.Split(',');
            for (int i = 0; i < cats.Length; i++) cats[i] = cats[i].Trim();
            cats = System.Array.FindAll(cats, c => c.Length > 0);
            // Imprimé pour que le filtre EFFECTIVEMENT appliqué soit lisible dans le log — un
            // filtre qu'on croit posé et qui ne l'est pas est exactement le piège qu'on ferme ici.
            UnityEngine.Debug.Log("MafiaCI: filtre SURCHARGÉ par MAFIA_CI_CATEGORIES = ["
                                  + string.Join(", ", cats) + "]");
        }
        // ⚠️ `MAFIA_CI_TESTS` (NOMS COMPLETS, séparés par des virgules) — ajouté le 2026-09-23 : relancer SEUL un test décisif
        //    que le préfixe des catégories ne sait pas isoler (mesuré : `DashboardPlayModeTests` porte 2 tests SANS catégorie,
        //    injoignables par tout filtre, et une capture sous `Screenshot`, dont le filtre est proscrit — TD-625, il emporte
        //    11 planches). Posée, elle REMPLACE les catégories (le log le dit) ; correspondance EXACTE sur `FullName`, et tout
        //    nom qui ne désigne aucune feuille est NOMMÉ et rougit le verdict — le zéro d'absence, version nominative.
        string[] noms = null;
        // ⛔ TD-751 (dette client, 2026-09-26, CLIENT-1) — le compteur de « déclarés » ne sait lire que des noms de TEST complets. Un
        //    filtre par noms de CLASSE (fixture), que Unity accepte et exécute bien, rend `declares=0`, `nomsInconnus=N`, `filtreVide=1`
        //    et donc `VERDICT code=1` sur un run tout vert. Cas mesuré : créneau du 26/09, run 2, 9 classes, passed=35 failed=0 — les 35
        //    déclarés ont dû être recomptés À LA MAIN (attributs [Test]/[UnityTest] des 9 fichiers). Reste : faire compter aussi les
        //    fixtures (déclarés = somme de leurs tests) avant d'accepter un nom de classe comme connu.
        string surchargeNoms = System.Environment.GetEnvironmentVariable("MAFIA_CI_TESTS");
        if (!string.IsNullOrWhiteSpace(surchargeNoms))
        {
            noms = System.Array.FindAll(System.Array.ConvertAll(surchargeNoms.Split(','), n => n.Trim()), n => n.Length > 0);
            cats = null;
            UnityEngine.Debug.Log("MafiaCI: filtre PAR NOMS (MAFIA_CI_TESTS, les catégories sont IGNORÉES) = ["
                                  + string.Join(", ", noms) + "]");
        }
        var api = ScriptableObject.CreateInstance<TestRunnerApi>();
        api.RegisterCallbacks(new Callbacks(cats, noms));
        api.Execute(new ExecutionSettings(new Filter { testMode = TestMode.PlayMode, categoryNames = cats, testNames = noms }));
    }

    private class Callbacks : ICallbacks
    {
        // ⛔⛔ LE DÉNOMINATEUR QUI MANQUAIT (mesuré 2026-09-02, par une session voisine).
        //    **Une exception NON GÉRÉE dans un test PlayMode interrompt la SUITE** : les tests qui
        //    suivent ne tournent jamais, et leur nom n'apparaît NI en succès NI en échec. Le run
        //    ressemble alors simplement à un run plus court. Mesuré chez elle : une capture n'a pas
        //    été exécutée une seule fois tant qu'une autre levait — invisible dans les compteurs.
        //    ⇒ `passed=N failed=M` ne prouve donc RIEN à lui seul : il dit ce qui a tourné, jamais
        //    ce qui AURAIT DÛ tourner. Sans dénominateur, « aucun échec » et « la suite s'est
        //    arrêtée au troisième test » rendent la même sortie.
        //    ⇒ On compte ici les feuilles que le FILTRE retient, et `RunFinished` confronte.
        private readonly string[] filtre;
        private int declares = -1;

        // ⛔⛔ CE QUE LE FILTRE A RÉELLEMENT PRIS — mesuré le 2026-09-02, et payé DEUX FOIS.
        //    `Filter.categoryNames` d'Unity correspond par REGEX NON ANCRÉE (sous-chaîne), pas exactement — lu dans la source le
        //    2026-09-24 (`RuntimeTestRunnerFilter.cs:31`, `IsRegex = true`) ; « par préfixe » n'en était qu'un cas.
        //    · 2026-08-21, session voisine : un run lancé sur `["HUD"]` a rendu **31/31 VERT avec
        //      un défaut réarmé exprès** — aucune catégorie « HUD » n'existe, le filtre avait pris
        //      `HUDv31`. Le vert certifiait le défaut.
        //    · 2026-09-02, ici : `["CaptureDetail"]` a emporté `CaptureDetailMutant`, un test qui
        //      CONSOMME une carte du compte de démo partagé. La séparation par catégorie était
        //      visible, documentée, et inopérante.
        //    ⇒ Même moteur, même piège, quatre mois d'écart : ce n'est pas une inattention, c'est
        //      STRUCTUREL. La ligne demandée ne dit pas ce qui a tourné.
        //    ⇒ On collecte donc les catégories des tests RÉELLEMENT exécutés et on les confronte
        //      au filtre demandé. *Vérifier ce qu'un instrument a pris, pas ce qu'on croit lui
        //      avoir demandé.*
        private readonly System.Collections.Generic.SortedSet<string> categoriesVues
            = new System.Collections.Generic.SortedSet<string>();
        private readonly string[] filtreNoms;
        private readonly System.Collections.Generic.HashSet<string> nomsTrouves = new System.Collections.Generic.HashSet<string>();
        public Callbacks(string[] categories, string[] noms = null) { filtre = categories; filtreNoms = noms; }

        // ⛔ (08/10 nuit, mesuré par CLIENT-2 au créneau) : un filtre ANCRÉ (`^EcranVitrine$`) exécutait les bons tests et ce compteur rendait
        //    « déclarés 0 » ⇒ FILTRE VIDE ⇒ VERDICT code=1 sur un run VERT. Il comparait par ÉGALITÉ, et ne lisait que les catégories PROPRES
        //    d'un test (ou, faute, celles de son parent). Il applique maintenant LA règle d'Unity (`FiltreDeCategories.Pris`, lue dans la
        //    source du paquet) : les catégories de TOUT le chemin, `Regex.IsMatch` non ancrée. Garde : GardeCategories F1 (ancré et nu).
        private int CompterFeuillesFiltrees(ITestAdaptor n, System.Collections.Generic.List<string> heritees)
        {
            var cats = new System.Collections.Generic.List<string>();
            if (heritees != null) cats.AddRange(heritees);
            if (n.Categories != null) cats.AddRange(n.Categories);
            if (!n.IsSuite && filtreNoms != null)
            {
                if (System.Array.IndexOf(filtreNoms, n.FullName) < 0) return 0;
                nomsTrouves.Add(n.FullName);
                return 1;
            }
            if (!n.IsSuite)
                return MafiaCleanCity.Shell.FiltreDeCategories.Pris(cats, filtre) ? 1 : 0;
            int total = 0;
            if (n.Children != null)
                foreach (ITestAdaptor enfant in n.Children) total += CompterFeuillesFiltrees(enfant, cats);
            return total;
        }

        public void RunStarted(ITestAdaptor testsToRun)
        {
            // Revue ⊥ MINOR-6 : `testsToRun.TestCaseCount` reflète l'ARBRE PlayMode DÉCOUVERT dans
            // son ensemble (le filtre de catégories s'applique à L'EXÉCUTION des feuilles, pas à la
            // taille de l'arbre rapportée ici) — mesuré : 151 sur ce dépôt alors que 3 catégories
            // combinées n'en exécutent que 86. Un lecteur qui rapproche "started — 151" de
            // "passed=86" peut lire 65 tests évaporés là où rien n'a disparu. Le mot "découverts"
            // rend ça explicite sans changer ce que la ligne mesure (aucune falsifiable n'en dépend
            // — seul `passed=`/`failed=` de RunFinished ci-dessous compte).
            declares = CompterFeuillesFiltrees(testsToRun, null);
            Debug.Log($"MafiaCI: RunPlayModeTests started — {testsToRun.TestCaseCount} test(s) découverts (arbre PlayMode entier ; le filtre de catégories s'applique à l'exécution, voir passed= ci-dessous) — DÉCLARÉS SOUS LE FILTRE : {declares}");
        }

        public void RunFinished(ITestResultAdaptor result)
        {
            int failed = result.FailCount;
            int comptes = result.PassCount + failed + result.SkipCount + result.InconclusiveCount;
            Debug.Log($"MafiaCI: RunPlayModeTests finished — passed={result.PassCount} failed={failed} " +
                      $"skipped={result.SkipCount} inconclusive={result.InconclusiveCount} " +
                      $"declares={declares} comptes={comptes}");
            // Une suite interrompue laisse des DÉCLARÉS sans résultat. C'est le seul signal qui
            // distingue « rien n'a échoué » de « la suite s'est arrêtée et personne ne l'a dit ».
            // ⛔⛔ UN FILTRE QUI NE MATCHE RIEN SORTAIT VERT — trou de ce dénominateur, trouvé en
            //    m'en servant (2026-09-02) : `declares=0 comptes=0` ne déclenchait aucune alerte et
            //    rendait RC=0. C'est EXACTEMENT le piège que l'en-tête de ce fichier décrit
            //    (`["HUD"]` -> 31/31 VERT sur une catégorie inexistante), et ma garde passait à côté
            //    parce qu'elle ne mordait qu'à partir de `declares > 0`.
            //    ⇒ *Une garde bornée par « il y a quelque chose » ne voit jamais le monde vide.*
            bool filtreVide = declares == 0;
            if (filtreVide)
                Debug.Log("MafiaCI: ⛔ FILTRE VIDE — 0 test déclaré sous ce filtre. Le run n'a RIEN " +
                          "exercé : ce n'est pas « tout est vert », c'est « rien n'a été demandé ». " +
                          "Vérifier le nom de catégorie (le filtre matche par REGEX NON ANCRÉE et ne signale " +
                          "jamais un nom inconnu).");
            // Ce que le filtre a RÉELLEMENT sélectionné, et ce qui n'avait pas été demandé.
            if (categoriesVues.Count > 0)
            {
                Debug.Log("MafiaCI: catégories RÉELLEMENT exécutées = ["
                          + string.Join(", ", categoriesVues) + "]");
                if (filtre != null && filtre.Length > 0)
                {
                    var surprises = new System.Collections.Generic.List<string>();
                    foreach (string c in categoriesVues)
                        if (!MafiaCleanCity.Shell.FiltreDeCategories.Demandee(c, filtre)) surprises.Add(c);   // `^X$` demande X : pas une surprise
                    if (surprises.Count > 0)
                        Debug.LogWarning("MafiaCI: ⚠️ CATÉGORIES NON DEMANDÉES EXÉCUTÉES ["
                            + string.Join(", ", surprises) + "] — le filtre d'Unity correspond par "
                            + "REGEX NON ANCRÉE : une catégorie demandée en emporte toute autre qui la "
                            + "CONTIENT. Vérifier qu'aucune n'a d'effet de bord (un test qui MUTE un "
                            + "compte partagé, par exemple) avant de croire ce run inoffensif.");
                }
            }

            bool tronquee = declares > 0 && comptes < declares;
            if (tronquee)
                Debug.Log($"MafiaCI: ⛔ SUITE TRONQUÉE — {declares - comptes} test(s) déclarés sous le " +
                          "filtre n'ont produit AUCUN résultat (ni succès, ni échec, ni ignoré). Une " +
                          "exception non gérée interrompt la suite : les suivants ne tournent jamais et " +
                          "leur nom n'apparaît nulle part. Ce run ne prouve rien sur eux.");
            if (catalogueSurvivant.Count > 0)
                Debug.Log($"MafiaCI: ⛔ CATALOGUE i18n SURVIVANT en sortie de {catalogueSurvivant.Count} classe(s) : [" +
                          string.Join(", ", catalogueSurvivant) + "] — chacune a laissé `I18nCatalog` chargé pour la " +
                          "classe suivante (TD-576, classe « catalogue »). Chacune est NOMMÉE ici, et le catalogue a été " +
                          "rendu après elle : la suivante est jugée sur ses propres gestes.");
            else
                Debug.Log("MafiaCI: catalogue i18n rendu en sortie de CHAQUE classe (0 survivant).");
            Debug.Log($"MafiaCI: état du shell rendu en sortie de {etatShellRendu.Count} classe(s)" +
                      (etatShellRendu.Count > 0 ? " : [" + string.Join(", ", etatShellRendu) + "]" : "") + " (EtatPublieParLeShell, point unique).");
            // ⛔ LE CODE DE SORTIE EST AUSSI IMPRIMÉ, parce que le harnais ne le VOIT PAS : quand son chien de garde tue
            //    l'éditeur après le marqueur de fin, il relit `failed=` et non ce code — une suite tronquée, un filtre vide
            //    ou un catalogue survivant sortaient donc RC=0 par ce chemin (mesuré le 23/09 avec la sonde du catalogue).
            //    `verdict_log` lit désormais cette ligne ; son absence (anciens journaux) garde le verdict d'avant.
            int nomsInconnus = 0;
            if (filtreNoms != null)
                foreach (string n in filtreNoms)
                    if (!nomsTrouves.Contains(n))
                    {
                        nomsInconnus++;
                        Debug.Log($"MafiaCI: ⛔ NOM INCONNU — « {n} » ne désigne AUCUNE feuille de l'arbre PlayMode (nom complet exact attendu).");
                    }
            int code = failed > 0 || tronquee || filtreVide || catalogueSurvivant.Count > 0 || nomsInconnus > 0 ? 1 : 0;
            Debug.Log($"MafiaCI: VERDICT code={code} (failed={failed} tronquee={(tronquee ? 1 : 0)} " +
                      $"filtreVide={(filtreVide ? 1 : 0)} catalogueSurvivant={catalogueSurvivant.Count}" +
                      (filtreNoms != null ? $" nomsInconnus={nomsInconnus}" : "") + ")");
            EditorApplication.Exit(code);
        }

        // ⛔⛔ UNE LIGNE PAR TEST, ET CE N'EST PAS DU CONFORT (mesuré 2026-09-02).
        //    Cette classe n'imprimait QUE les `FAIL`. Conséquence : quand l'éditeur meurt EN PLEIN
        //    test — SIGSEGV reproduit deux fois dans le pilote graphique, `RenderOffscreenCameras`
        //    → `DrawBufferRanges`, Mesa Intel 25.2.8 — le log ne porte AUCUNE trace du test en
        //    cours, et la panne ressemble à « crash AVANT tout test ». On cherche alors la cause
        //    dans le démarrage, jamais dans le test qui l'a déclenchée.
        //    ⇒ `RUN`/`PASS` par test est le SEUL moyen de situer un crash : le dernier `RUN` sans
        //    `PASS` NOMME le coupable. Sans lui, un mort silencieux est indiscernable d'un mort-né.
        //    ⚠️ Et c'est complémentaire du dénominateur ci-dessus, ça ne le remplace pas : le
        //    dénominateur dit COMBIEN manquent, `RUN`/`PASS` dit LEQUEL a emporté la suite.
        public void TestStarted(ITestAdaptor test)
        {
            if (test.IsSuite) return;
            MafiaCleanCity.I18n.I18nCatalog.ContexteCourant = test.FullName;   // attribution des chargements (TD-576)
            if (test.Categories != null)
                foreach (string c in test.Categories) categoriesVues.Add(c);
            Debug.Log($"MafiaCI: RUN {test.FullName}");
        }

        // ⛔ TD-576, CLASSE « CATALOGUE » (2026-09-23) — LA GARDE DE SORTIE, UNE SEULE, POUR TOUTES LES CLASSES.
        // `I18nCatalog` est un global STATIQUE : une classe qui le laisse chargé le passe à la suivante, qui mesure alors
        // l'état d'avant (mesuré : le 1er cas d'`ArchetypeServi_…` a lu un bundle réel laissé en amont, sans qu'aucune
        // trace dise par qui). Ni un `ITestAction` d'assembly (le lanceur d'Unity ne lit que la méthode et sa classe) ni
        // un `AfterTest` (il tourne AVANT le `[TearDown]`) ne voient la sortie d'une classe ; ce rappel, si : il arrive
        // après tous ses TearDown, dans le même domaine. ⇒ La classe qui sort catalogue chargé est NOMMÉE, compte dans
        // le code de sortie, et le catalogue est rendu après elle — la suivante est jugée sur ses propres gestes.
        private readonly System.Collections.Generic.List<string> catalogueSurvivant = new System.Collections.Generic.List<string>();
        private readonly System.Collections.Generic.List<string> etatShellRendu = new System.Collections.Generic.List<string>();

        public void TestFinished(ITestResultAdaptor result)
        {
            if (result.HasChildren)
            {
                // une CLASSE de test : un nœud qui porte un type et aucune méthode (un TestCase paramétré porte sa méthode)
                if (result.Test.TypeInfo != null && result.Test.Method == null
                    && MafiaCleanCity.I18n.I18nCatalog.Charge)
                {
                    string demande = MafiaCleanCity.I18n.I18nCatalog.DemandePendant ?? "(inconnu)";
                    string arrive = MafiaCleanCity.I18n.I18nCatalog.ArrivePendant ?? "(inconnu)";
                    catalogueSurvivant.Add($"{result.Test.Name} ← chargé pendant {demande}");
                    Debug.Log($"MafiaCI: ⛔ CATALOGUE SURVIVANT — chargé pendant {demande}" +
                              (arrive != demande ? $" (arrivé en vol pendant {arrive})" : "") +
                              $", survivant à la sortie de {result.Test.FullName} — rendu maintenant. Le FAUTIF est celui qui l'a DEMANDÉ.");
                    MafiaCleanCity.I18n.I18nCatalog.Oublier();
                }
                // ⛔ L'ÉTAT PUBLIÉ PAR LE SHELL, MÊME CROCHET (2026-09-24) — marges du chrome, jeton de structure : une classe qui
                // monte le vrai shell les laisse, et la suivante (㉙ hors shell : EcranConflitE12) bâtit sur les marges d'un shell
                // détruit. Rendu ICI pour toutes les classes (point unique ; la garde EtatDuShellPlayModeTests exige cet appel), et
                // la classe est NOMMÉE. Ne compte PAS dans le code de sortie : 23 classes montent le shell, et c'est ce rendu qui
                // neutralise la fuite — le nom sert à savoir qui publie, pas à rougir.
                if (result.Test.TypeInfo != null && result.Test.Method == null
                    && !MafiaCleanCity.Shell.EtatPublieParLeShell.Vierge)
                {
                    etatShellRendu.Add(result.Test.Name);
                    Debug.Log($"MafiaCI: état du shell publié à la sortie de {result.Test.FullName} " +
                              $"({MafiaCleanCity.Shell.EtatPublieParLeShell.Decrire()}) — rendu maintenant.");
                    MafiaCleanCity.Shell.EtatPublieParLeShell.RendrePourTest();
                }
                // Les seams de `Shell` que `ShellContracts` ne peut pas rendre (`EtatPublieParLeShell.RendusParMafiaCI`), TOUJOURS à la
                // sortie d'une classe : la valeur par défaut est celle de la production.
                if (result.Test.TypeInfo != null && result.Test.Method == null)
                    MafiaCleanCity.Shell.AppShell.SafeAreaProvider = () => Screen.safeArea;
                return;
            }
            if (result.TestStatus == TestStatus.Failed)
                Debug.LogError($"MafiaCI: FAIL {result.FullName} — {result.Message}");
            else
                Debug.Log($"MafiaCI: {result.TestStatus.ToString().ToUpperInvariant()} {result.FullName}");
        }
    }
}
