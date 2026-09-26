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

        // ⛔ L'URL DU BACK : UNE SOURCE (`MafiaCleanCity.AdresseDuBack`), ÉCRITE ICI, VÉRIFIÉE DANS L'APK (2026-09-24).
        //    Avant : on posait l'URL sur le SEUL `AppShell` sérialisé de la scène et on vérifiait la scène ; 69 écrans et clients
        //    gardaient leur `"http://localhost"` en défaut, et l'APK du 24/09 s'appelait lui-même. La vérification lisait le
        //    PARAMÈTRE. Maintenant : la ressource `Assets/Resources/adresse_du_back.txt` est écrite le temps du build puis retirée,
        //    et l'APK produit est BALAYÉ — il échoue s'il contient `http://localhost` hors des bibliothèques natives, ou s'il ne
        //    contient pas l'URL voulue. *La garde porte sur l'effet.*
        string urlVoulue = Environment.GetEnvironmentVariable(BaseUrlEnvVar);
        if (string.IsNullOrWhiteSpace(urlVoulue) || urlVoulue.IndexOf("localhost", StringComparison.OrdinalIgnoreCase) >= 0)
            throw new BuildFailedException("[BuildScript] " + BaseUrlEnvVar + " " +
                (string.IsNullOrWhiteSpace(urlVoulue) ? "NON POSÉE" : "= " + urlVoulue + " (localhost)") +
                " — un APK sans URL de back, ou vers le téléphone lui-même, ne se construit pas.");
        urlVoulue = urlVoulue.Trim();
        string ressource = "Assets/Resources/" + MafiaCleanCity.AdresseDuBack.NomRessource + ".txt";
        if (File.Exists(ressource))
            throw new BuildFailedException("[BuildScript] " + ressource + " EXISTE déjà (reste d'un build interrompu ?) — la retirer à la main " +
                                           "après l'avoir lue : les tests de l'éditeur partiraient vers cette URL.");

        string outDir = Path.Combine(Directory.GetCurrentDirectory(), "Builds", "Android");
        Directory.CreateDirectory(outDir);
        string outPath = Path.Combine(outDir, "mafia-clean-city.apk");
        if (File.Exists(outPath)) File.Delete(outPath);   // jamais l'APK d'un build précédent pris pour celui-ci

        var opts = new BuildPlayerOptions
        {
            scenes = scenes,
            locationPathName = outPath,
            target = BuildTarget.Android,
            targetGroup = BuildTargetGroup.Android,
            options = BuildOptions.Development,
        };

        BuildSummary s;
        try
        {
            File.WriteAllText(ressource, urlVoulue);
            AssetDatabase.ImportAsset(ressource, ImportAssetOptions.ForceSynchronousImport);
            Debug.Log("[BuildScript] " + BaseUrlEnvVar + " = " + urlVoulue + " · écrite dans " + ressource);
            Debug.Log("[BuildScript] building Android APK -> " + outPath);
            BuildReport report = BuildPipeline.BuildPlayer(opts);
            s = report.summary;
        }
        finally
        {
            // ⛔ Le dispositif RESTAURE ce qu'il a posé, et le DIT (un reste redirigerait les tests de l'éditeur vers le VPS).
            AssetDatabase.DeleteAsset(ressource);
            if (File.Exists(ressource)) File.Delete(ressource);
            if (File.Exists(ressource + ".meta")) File.Delete(ressource + ".meta");
            Debug.Log("[BuildScript] " + ressource + (File.Exists(ressource) ? " ⛔ ENCORE PRÉSENTE" : " retirée"));
        }
        Debug.Log("[BuildScript] BUILD_DONE result=" + s.result + " sizeBytes=" + s.totalSize +
                  " errors=" + s.totalErrors + " path=" + outPath);

        bool ok = s.result == BuildResult.Succeeded;
        if (ok)
        {
            string verdict = VerifierLApk(outPath, urlVoulue);
            if (verdict != null)
            {
                Debug.LogError("[BuildScript] ⛔ APK REFUSÉ : " + verdict);
                File.Delete(outPath);   // un APK refusé ne se distribue pas par erreur
                ok = false;
            }
        }
        if (Application.isBatchMode) EditorApplication.Exit(ok ? 0 : 1);
    }

    /// <summary>LA GARDE D'EFFET : balaye chaque entrée de l'APK HORS `lib/` (les bibliothèques natives d'Unity et d'IL2CPP portent
    /// leurs propres chaînes, qui ne sont pas les nôtres) — `global-metadata.dat`, les scènes, les assets, les ressources — en
    /// UTF-8 et en UTF-16LE. Rend null si l'APK est conforme : 0 `http://localhost`, et l'URL voulue présente au moins une fois.
    /// Sinon, la raison, avec les entrées fautives nommées. Imprime les comptes dans les deux cas.</summary>
    public static string VerifierLApk(string apk, string urlVoulue)
    {
        byte[][] interdits = { System.Text.Encoding.UTF8.GetBytes("http://localhost"), System.Text.Encoding.Unicode.GetBytes("http://localhost") };
        // B5 point 7 (f2 26/09) : la paire de démo, MOT DE PASSE compris, était dans chaque APK distribué (global-metadata.dat, ×2 au
        // 26/09). `IdentiteDeDemo` ne la porte plus qu'en éditeur ; ce balayage refuse l'APK qui la porterait encore.
        string[] paireDeDemo = { "operational-demo-pw", "operational_demo@example.test", "citymap-demo-pw", "citymap_demo@example.test" };
        byte[][] demo = paireDeDemo.SelectMany(p => new[] { System.Text.Encoding.UTF8.GetBytes(p), System.Text.Encoding.Unicode.GetBytes(p) }).ToArray();
        var fautivesDemo = new System.Collections.Generic.List<string>();
        byte[][] voulus = { System.Text.Encoding.UTF8.GetBytes(urlVoulue), System.Text.Encoding.Unicode.GetBytes(urlVoulue) };
        var fautives = new System.Collections.Generic.List<string>();
        int entrees = 0, presencesVoulues = 0;
        using (var zip = System.IO.Compression.ZipFile.OpenRead(apk))
        {
            foreach (var e in zip.Entries)
            {
                if (e.FullName.StartsWith("lib/", StringComparison.Ordinal) || e.Length == 0) continue;
                entrees++;
                byte[] octets;
                using (var flux = e.Open())
                using (var m = new MemoryStream())
                {
                    flux.CopyTo(m);
                    octets = m.ToArray();
                }
                int n = interdits.Sum(motif => Compter(octets, motif));
                if (n > 0) fautives.Add(e.FullName + " ×" + n);
                int d = demo.Sum(motif => Compter(octets, motif));
                if (d > 0) fautivesDemo.Add(e.FullName + " ×" + d);
                presencesVoulues += voulus.Sum(motif => Compter(octets, motif));
            }
        }
        Debug.Log("[BuildScript] balayage APK : " + entrees + " entrées hors lib/ · http://localhost = " + fautives.Count + " entrée(s)" +
                  (fautives.Count > 0 ? " [" + string.Join(", ", fautives) + "]" : "") + " · « " + urlVoulue + " » présente ×" + presencesVoulues);
        if (entrees < 10) return "seulement " + entrees + " entrées balayées — le balayage ne voit pas l'APK";
        Debug.Log("[BuildScript] balayage APK : paire de démo = " + fautivesDemo.Count + " entrée(s)" +
                  (fautivesDemo.Count > 0 ? " [" + string.Join(", ", fautivesDemo) + "]" : ""));
        if (fautives.Count > 0) return "http://localhost dans " + string.Join(", ", fautives);
        if (fautivesDemo.Count > 0) return "la paire de démo (identifiant ou mot de passe) dans " + string.Join(", ", fautivesDemo);
        if (presencesVoulues == 0) return "l'URL voulue « " + urlVoulue + " » n'est NULLE PART dans l'APK";
        return null;
    }

    /// <summary>Occurrences (sans chevauchement) de <paramref name="motif"/> dans <paramref name="octets"/>.</summary>
    public static int Compter(byte[] octets, byte[] motif)
    {
        int n = 0;
        for (int i = 0; i <= octets.Length - motif.Length; i++)
        {
            int j = 0;
            while (j < motif.Length && octets[i + j] == motif[j]) j++;
            if (j == motif.Length) { n++; i += motif.Length - 1; }
        }
        return n;
    }
}
