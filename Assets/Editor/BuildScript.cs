using System;
using System.IO;
using System.Linq;
using UnityEditor;
using UnityEditor.Build;
using UnityEditor.Build.Reporting;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.SceneManagement;

/// <summary>Point d'entrée du build APK headless.
/// <code>
/// Unity -batchmode -nographics -quit -projectPath &lt;repo&gt; -buildTarget Android \
///       -executeMethod BuildScript.BuildAndroid -logFile &lt;log&gt;
/// </code>
/// Repris depuis `apk/phase10-build` (2026-06-08, la plus récente des trois versions du dépôt) et
/// porté sur `main` le 2026-09-02, avec DEUX corrections mesurées — voir ci-dessous.</summary>
public static class BuildScript
{
    private const string BaseUrlEnvVar = "MAFIA_APK_BASE_URL";

    [MenuItem("Build/Android APK")]
    public static void BuildAndroid()
    {
        const string appId = "eu.erutheone.mafiacleancity";
        PlayerSettings.SetApplicationIdentifier(NamedBuildTarget.Android, appId);
        PlayerSettings.Android.minSdkVersion = AndroidSdkVersions.AndroidApiLevel25;

        // ⛔ IL2CPP + GRAS (ARM64 + ARMv7), et ce n'est PAS une préférence : Mono sur Android
        //    n'émet que de l'ARMv7 32 bits, et un APK 32 bits seul est REFUSÉ à l'installation sur
        //    un téléphone 64-bit-only (`INSTALL_FAILED_NO_MATCHING_ABIS`, « Impossible d'installer
        //    l'application »). La version de `deploy/apk-cleancity` force encore `Mono2x` avec en
        //    commentaire « le NDK embarqué est cassé » — ce contournement a été réparé à la RACINE
        //    (le symlink `<NDK>/android-ndk-r27c -> .` recréé, qui débloque ses 21 liens pendants).
        //    Re-mesuré avant d'écrire ceci : 0 symlink cassé sous `toolchains`, `build`, `sources`.
        //    ⇒ *Un contournement dont la cause est réparée devient un défaut.*
        PlayerSettings.SetScriptingBackend(NamedBuildTarget.Android, ScriptingImplementation.IL2CPP);
        PlayerSettings.Android.targetArchitectures = AndroidArchitecture.ARM64 | AndroidArchitecture.ARMv7;

        // ⛔⛔ LES SCÈNES VIENNENT D'`EditorBuildSettings`, PLUS D'UN LITTÉRAL — la correction qui
        //    comptait le plus. Les trois versions précédentes codaient en dur
        //    `Assets/Scenes/CityMap.unity`. Mesuré sur `main` le 2026-09-02 : `CityMap.unity`
        //    contient **zéro** occurrence d'`AppShell` ; `Boot.unity` en contient deux, et c'est la
        //    SEULE scène activée dans `EditorBuildSettings`. Un APK bâti sur le littéral aurait donc
        //    embarqué la carte SANS le shell — sans barre d'onglets, sans menu « Plus », donc sans
        //    aucun des onze écrans qu'on vient de rendre joignables. Le build aurait réussi.
        //    ⇒ *Le littéral décrivait un point d'entrée qui a changé, et rien ne rougissait.*
        string[] scenes = EditorBuildSettings.scenes.Where(s => s.enabled).Select(s => s.path).ToArray();

        // ⚠️ ANTI-VACUITÉ : une liste de scènes vide produit un APK qui démarre sur un écran noir,
        //    et `BuildPipeline` la traite comme une entrée valide. On refuse plutôt que de livrer.
        if (scenes.Length == 0)
            throw new BuildFailedException(
                "[BuildScript] AUCUNE scène activée dans EditorBuildSettings — l'APK démarrerait sur du vide.");

        // ⛔ ET LA GARDE QUI PORTE SUR L'EFFET, PAS SUR LE PARAMÈTRE. Vérifier « il y a des scènes »
        //    ne dit rien de ce qu'elles contiennent : c'est la garde de forme, et ce dépôt a payé
        //    plusieurs fois qu'elle certifie le défaut. La propriété qui compte est *le joueur
        //    atterrit-il dans le shell ?* — donc au moins une scène embarquée doit référencer
        //    `AppShell`. Sans elle, on rejouerait exactement le défaut du littéral, un cran plus bas.
        string porteuse = scenes.FirstOrDefault(p =>
            File.Exists(p) && File.ReadAllText(p).IndexOf("AppShell", StringComparison.Ordinal) >= 0);
        if (porteuse == null)
            throw new BuildFailedException(
                "[BuildScript] aucune des scènes embarquées ne monte AppShell : [" + string.Join(", ", scenes) +
                "]. L'APK se lancerait sans barre d'onglets ni menu — chaque écran redeviendrait injoignable.");
        Debug.Log("[BuildScript] scènes embarquées = [" + string.Join(", ", scenes) + "] · porteuse du shell = " + porteuse);

        // ⚠️ L'URL DU BACK EST SÉRIALISÉE DANS LA SCÈNE (`AppShell.baseUrl`), et elle vaut
        //    `http://localhost` — ce qui, SUR UN TÉLÉPHONE, désigne le téléphone lui-même : l'appli
        //    ne joindrait aucun back. Le dépôt a déjà un patron d'override par variable
        //    d'environnement (`DemoIdentityResolver`), on le suit plutôt que d'en inventer un.
        //    ⛔ ET LE DISPOSITIF DÉCLARE SON RÉGIME, toujours : un override inerte ressemble trait
        //    pour trait à un override appliqué. On imprime l'URL qui part, dans les deux cas.
        //    ⛔⛔ ET LE DISPOSITIF RESTAURE CE QU'IL A MUTÉ — défaut mesuré au premier build réel
        //    (2026-09-02) : `AppliquerBaseUrl` SAUVEGARDE la scène, donc `Boot.unity` restait sur
        //    l'URL du VPS après le build. Toute la suite PlayMode locale lit ce champ : le lot
        //    suivant aurait pointé sur la production sans que rien ne le dise, et le premier à s'en
        //    apercevoir l'aurait vu comme un défaut de réseau. *Un dispositif de build qui écrit
        //    sur un asset partagé le contamine pour tout le monde* — ce dépôt l'a déjà payé avec un
        //    contrôle positif qui mutait un matériau partagé.
        //    ⇒ On relit la valeur d'origine AVANT de poser la nôtre, et on la remet APRÈS le build.
        string urlVoulue = Environment.GetEnvironmentVariable(BaseUrlEnvVar);
        string urlOrigine = AppliquerBaseUrl(porteuse, null);   // lecture seule : rend la valeur en place
        string urlEmbarquee = AppliquerBaseUrl(porteuse, urlVoulue);
        Debug.Log("[BuildScript] " + BaseUrlEnvVar + (string.IsNullOrEmpty(urlVoulue) ? " NON POSÉE" : " = " + urlVoulue) +
                  " · baseUrl RÉELLEMENT EMBARQUÉE = " + (urlEmbarquee ?? "<non lisible>"));

        string outDir = Path.Combine(Directory.GetCurrentDirectory(), "Builds", "Android");
        Directory.CreateDirectory(outDir);
        string outPath = Path.Combine(outDir, "mafia-clean-city.apk");

        var opts = new BuildPlayerOptions
        {
            scenes = scenes,
            locationPathName = outPath,
            target = BuildTarget.Android,
            targetGroup = BuildTargetGroup.Android,
            options = BuildOptions.Development,
        };

        Debug.Log("[BuildScript] building Android APK -> " + outPath);
        BuildReport report = BuildPipeline.BuildPlayer(opts);
        BuildSummary s = report.summary;
        Debug.Log("[BuildScript] BUILD_DONE result=" + s.result + " sizeBytes=" + s.totalSize +
                  " errors=" + s.totalErrors + " path=" + outPath);
        // Remise en état de la scène, et on le DIT : un dispositif silencieux qui restaure
        // ressemble à un dispositif qui n'a rien touché — impossible de vérifier après coup.
        if (!string.IsNullOrEmpty(urlVoulue) && urlOrigine != null && urlOrigine != urlVoulue)
        {
            string apres = AppliquerBaseUrl(porteuse, urlOrigine);
            Debug.Log("[BuildScript] baseUrl RESTAURÉE dans la scène : " + apres +
                      (apres == urlOrigine ? " (conforme à l'origine)" : " ⛔ DIVERGE de l'origine " + urlOrigine));
        }
        if (Application.isBatchMode) EditorApplication.Exit(s.result == BuildResult.Succeeded ? 0 : 1);
    }

    /// <summary>Pose <paramref name="url"/> sur l'`AppShell` de la scène si elle est fournie, et rend
    /// dans TOUS LES CAS la valeur réellement embarquée — c'est cette valeur qui est imprimée, jamais
    /// celle qu'on croit avoir posée. Rend null si l'`AppShell` n'est pas lisible.</summary>
    private static string AppliquerBaseUrl(string cheminScene, string url)
    {
        Scene scene = EditorSceneManager.OpenScene(cheminScene, OpenSceneMode.Single);
        foreach (GameObject racine in scene.GetRootGameObjects())
        {
            foreach (MonoBehaviour c in racine.GetComponentsInChildren<MonoBehaviour>(true))
            {
                if (c == null || c.GetType().Name != "AppShell") continue;
                var so = new SerializedObject(c);
                SerializedProperty p = so.FindProperty("baseUrl");
                if (p == null) return null;
                if (!string.IsNullOrEmpty(url))
                {
                    p.stringValue = url;
                    so.ApplyModifiedPropertiesWithoutUndo();
                    EditorSceneManager.SaveScene(scene);
                }
                return p.stringValue;
            }
        }
        return null;
    }
}
