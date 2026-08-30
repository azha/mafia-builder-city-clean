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
    // SURCHARGE D'IDENTITÉ DE DÉMO (revue ⊥ I2, 2026-08-30) — ajoute "DemoIdentity" : sans cette
    // entrée, les 3 classes de `DemoIdentityResolverPlayModeTests.cs` /
    // `DemoIdentityTwoAccountsPlayModeTests.cs` ne tournaient sous AUCUN juge — une garde qui n'a
    // jamais tourné n'est pas une garde. Même patron : on élargit, jamais un second point d'entrée.
    private static readonly string[] Categories = { "W4P4a", "W3UDA", "W3U1", "W3U2", "Charpente", "DemoIdentity" };

    public static void RunPlayModeTests()
    {
        var api = ScriptableObject.CreateInstance<TestRunnerApi>();
        api.RegisterCallbacks(new Callbacks());
        api.Execute(new ExecutionSettings(new Filter { testMode = TestMode.PlayMode, categoryNames = Categories }));
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
