using System.IO;
using UnityEditor;
using UnityEditor.Build;
using UnityEditor.Build.Reporting;
using UnityEngine;

// Headless APK build entry point.
//   Unity -batchmode -nographics -projectPath <repo> -buildTarget Android \
//         -executeMethod BuildScript.BuildAndroid -logFile <log>
//
// Builds the live game scene (CityMap) into a debug-signed Development APK for sideload /
// Firebase App Distribution. The client is repointed at https://cleancity.erutheone.eu on this
// branch. Embedded Android SDK/NDK/JDK ship with the editor → no external path config needed.
public static class BuildScript
{
    [MenuItem("Build/Android APK (CityMap)")]
    public static void BuildAndroid()
    {
        const string appId = "eu.erutheone.mafiacleancity";
        PlayerSettings.SetApplicationIdentifier(NamedBuildTarget.Android, appId);
        PlayerSettings.Android.minSdkVersion = AndroidSdkVersions.AndroidApiLevel25;
        // IL2CPP + fat (ARM64 + ARMv7): required for installability. Mono Android is ARMv7 32-bit-only,
        // and a 32-bit-only APK is rejected on 64-bit-only phones (INSTALL_FAILED_NO_MATCHING_ABIS). The
        // embedded NDK dangling-symlink corruption is fixed (android-ndk-r27c -> . symlink recreated), so
        // IL2CPP native compilation works for both architectures.
        PlayerSettings.SetScriptingBackend(NamedBuildTarget.Android, ScriptingImplementation.IL2CPP);
        PlayerSettings.Android.targetArchitectures = AndroidArchitecture.ARM64 | AndroidArchitecture.ARMv7;

        // The Build Settings list SampleScene (empty default); the real game is CityMap.unity.
        string[] scenes = { "Assets/Scenes/CityMap.unity" };

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
        // Only quit when running headless (batchmode CLI). When triggered interactively (menu /
        // MCP execute_menu_item), do NOT exit — that would close the developer's open editor.
        if (Application.isBatchMode)
            EditorApplication.Exit(s.result == BuildResult.Succeeded ? 0 : 1);
    }
}
