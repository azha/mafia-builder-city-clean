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
    private static readonly string[] Categories =
        { "W4P4a", "W3UDA", "W3U1", "W3U2", "Charpente", "ScreenB3" };

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
        api.RegisterCallbacks(new Callbacks());
        api.Execute(new ExecutionSettings(new Filter { testMode = TestMode.PlayMode, categoryNames = cats }));
    }

    private class Callbacks : ICallbacks
    {
        public void RunStarted(ITestAdaptor testsToRun)
        {
            // Revue ⊥ MINOR-6 : `testsToRun.TestCaseCount` reflète l'ARBRE PlayMode DÉCOUVERT dans
            // son ensemble (le filtre de catégories s'applique à L'EXÉCUTION des feuilles, pas à la
            // taille de l'arbre rapportée ici) — mesuré : 151 sur ce dépôt alors que 3 catégories
            // combinées n'en exécutent que 86. Un lecteur qui rapproche "started — 151" de
            // "passed=86" peut lire 65 tests évaporés là où rien n'a disparu. Le mot "découverts"
            // rend ça explicite sans changer ce que la ligne mesure (aucune falsifiable n'en dépend
            // — seul `passed=`/`failed=` de RunFinished ci-dessous compte).
            Debug.Log($"MafiaCI: RunPlayModeTests started — {testsToRun.TestCaseCount} test(s) découverts (arbre PlayMode entier ; le filtre de catégories s'applique à l'exécution, voir passed= ci-dessous)");
        }

        public void RunFinished(ITestResultAdaptor result)
        {
            int failed = result.FailCount;
            Debug.Log($"MafiaCI: RunPlayModeTests finished — passed={result.PassCount} failed={failed} " +
                      $"skipped={result.SkipCount} inconclusive={result.InconclusiveCount}");
            EditorApplication.Exit(failed > 0 ? 1 : 0);
        }

        public void TestStarted(ITestAdaptor test) { }

        public void TestFinished(ITestResultAdaptor result)
        {
            if (result.TestStatus == TestStatus.Failed && !result.HasChildren)
            {
                Debug.LogError($"MafiaCI: FAIL {result.FullName} — {result.Message}");
            }
        }
    }
}
