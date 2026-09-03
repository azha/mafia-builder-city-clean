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
    // ⚠️ CE FILTRE MATCHE PAR PRÉFIXE, et un préfixe inexact n'ERREUR PAS : il exécute un AUTRE jeu
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
    // que le filtre matche par préfixe.
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
    // ⚠️ `PhotoEcranDelegation` n'est PAS inscrite, et c'est délibéré : les catégories `Photo*`
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
    // ⛔⛔ `EcranDistribution` RETIRÉE AVANT D'ÊTRE POUSSÉE — DEUXIÈME FOIS QUE CE CONTRÔLE PAIE
    // DANS LA JOURNÉE. Elle est arrivée inscrite par la branche du chantier C, sans avoir jamais
    // été exécutée. Lancée avant de pousser :
    //   FAIL DistributionScreenPlayModeTests.EcranDistributionC1_CapturerPourLeJugeVisuel_DeuxResolutions
    //     — « capture 1080x1920 entièrement UNIFORME — l'écran n'a rien rendu hors de son propre fond »
    // La pousser aurait rendu le juge ROUGE pour les cinq sessions, sur un défaut qui n'est pas
    // le leur. (Le matin, le même contrôle avait intercepté `HUDv31`, qui fait planter l'éditeur.)
    // ⇒ Elle revient ici quand ㉘ rend quelque chose — c'est au chantier C de le dire, pas à moi
    //   de le supposer. Le défaut est signalé, pas corrigé : l'écran n'est pas de mon périmètre.
    // ⚠️ `ScreenC2` et `FiliereSonde` sont inscrites, elles, parce qu'elles ont tourné VERTES dans
    // ce même run (28 passés / 1 échec, l'échec étant le seul ci-dessus). *Le même run tranche
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
        { "W4P4a", "W3UDA", "W3U1", "W3U2", "Charpente", "DemoIdentity", "ScreenB3", "ShellSurimpression", "CaptureDistrict", "CaptureReputation", "CaptureFamille", "Joignabilite", "ScreenCarte", "CaptureCarte", "EcranAutonomy", "EcranExceptions", "EcranRegleLieutenant", "EcranTenureLieutenant", "EcranUiLieutenant", "EcranRegleTier2", "EcranAppro", "ScreenB7", "ScreenC1", "ScreenC6", "EcranDelegation", "ScreenC2", "EcranDemolition", "ScreenC3" };
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
        var api = ScriptableObject.CreateInstance<TestRunnerApi>();
        api.RegisterCallbacks(new Callbacks(cats));
        api.Execute(new ExecutionSettings(new Filter { testMode = TestMode.PlayMode, categoryNames = cats }));
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
        //    `Filter.categoryNames` d'Unity correspond par PRÉFIXE, pas exactement.
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
        public Callbacks(string[] categories) { filtre = categories; }

        private int CompterFeuillesFiltrees(ITestAdaptor n, string[] heritees)
        {
            string[] cats = (n.Categories != null && n.Categories.Length > 0) ? n.Categories : heritees;
            if (!n.IsSuite)
                return (filtre == null || filtre.Length == 0
                        || (cats != null && System.Array.Exists(cats, c => System.Array.IndexOf(filtre, c) >= 0)))
                       ? 1 : 0;
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
                          "Vérifier le nom de catégorie (le filtre matche par PRÉFIXE et ne signale " +
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
                        if (System.Array.IndexOf(filtre, c) < 0) surprises.Add(c);
                    if (surprises.Count > 0)
                        Debug.LogWarning("MafiaCI: ⚠️ CATÉGORIES NON DEMANDÉES EXÉCUTÉES ["
                            + string.Join(", ", surprises) + "] — le filtre d'Unity correspond par "
                            + "PRÉFIXE : une catégorie demandée en emporte toute autre qui commence "
                            + "par elle. Vérifier qu'aucune n'a d'effet de bord (un test qui MUTE un "
                            + "compte partagé, par exemple) avant de croire ce run inoffensif.");
                }
            }

            bool tronquee = declares > 0 && comptes < declares;
            if (tronquee)
                Debug.Log($"MafiaCI: ⛔ SUITE TRONQUÉE — {declares - comptes} test(s) déclarés sous le " +
                          "filtre n'ont produit AUCUN résultat (ni succès, ni échec, ni ignoré). Une " +
                          "exception non gérée interrompt la suite : les suivants ne tournent jamais et " +
                          "leur nom n'apparaît nulle part. Ce run ne prouve rien sur eux.");
            EditorApplication.Exit(failed > 0 || tronquee || filtreVide ? 1 : 0);
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
            if (test.Categories != null)
                foreach (string c in test.Categories) categoriesVues.Add(c);
            Debug.Log($"MafiaCI: RUN {test.FullName}");
        }

        public void TestFinished(ITestResultAdaptor result)
        {
            if (result.HasChildren) return;
            if (result.TestStatus == TestStatus.Failed)
                Debug.LogError($"MafiaCI: FAIL {result.FullName} — {result.Message}");
            else
                Debug.Log($"MafiaCI: {result.TestStatus.ToString().ToUpperInvariant()} {result.FullName}");
        }
    }
}
