using System.Collections;
using System.Collections.Generic;
using NUnit.Framework;
using UnityEngine;
using UnityEngine.SceneManagement;
using UnityEngine.TestTools;
using UnityEngine.UI;
using Object = UnityEngine.Object;

namespace MafiaCleanCity.Shell.Tests
{
    // ITEM 0.1 de `front.md` — LA CHARPENTE. Ce n'est pas un écran : c'est la falsifiable qui rend
    // vraie (ou fausse) la colonne « monté » des 49 écrans du document.
    //
    // CE QUI ÉTAIT MESURÉ AVANT CE LOT (front.md §0, re-vérifié le 2026-08-25 sur `fe00b0a`) :
    //   0 `AddComponent<AppShell>` dans `Assets/Scripts` · 24 dans `Assets/Tests` (8 fichiers) ·
    //   le GUID d'`AppShell.cs` absent de tout fichier hors son propre `.meta` · 0 prefab ·
    //   les Build Settings ne portaient que `SampleScene` (une caméra, une lumière, un Volume).
    //   ⇒ un build lancé n'aurait montré AUCUN écran, y compris les 13 déjà construits.
    //
    // ⛔ LE PIÈGE QUE CETTE CLASSE EXISTE POUR NE PAS TOMBER DEDANS, nommé dans `front.md` :
    //   « une garde qui construit son propre `AppShell` teste le test ». Les 24 montages d'`Assets/
    //   Tests` prouvent que le shell FONCTIONNE ; aucun ne prouve qu'un JOUEUR le rencontre. La
    //   grandeur qui discrimine n'est donc pas « un AppShell existe » mais **« la scène enregistrée
    //   à l'index 0 des Build Settings en porte un »** — et c'est la seule que ces tests lisent :
    //   la scène est chargée PAR SON INDEX DE BUILD, jamais par son chemin écrit à la main, et le
    //   shell trouvé doit APPARTENIR à cette scène (`gameObject.scene`), jamais au domaine PlayMode.
    //
    // Pourquoi additif et non `Single` : `Single` détruit la scène du runner et rend impossible tout
    // déchargement propre en fin de test — la scène de démarrage (et ses coroutines réseau) resterait
    // vivante dans les tests SUIVANTS. Le précédent maison est explicite là-dessus (`AppShell.cs`,
    // `MountTenant<T>` : un locataire orphelin a déjà attribué son `Debug.LogError` à un test sans
    // rapport trois fixtures plus loin). L'index de build reste la grandeur lue dans les deux modes.
    [Category("Charpente")]
    public class CharpenteBootScenePlayModeTests
    {
        private Scene sceneDeDemarrage;

        // Le shell DÉCOUVRE un Canvas (`FindFirstObjectByType<Canvas>`) au lieu d'en créer un quand
        // il en trouve un : un Canvas laissé par un test antérieur du MÊME domaine PlayMode ferait
        // donc bâtir la barre du shell de la scène de démarrage DANS la scène du voisin. Ce n'est
        // pas une précaution de style — c'est la co-tenance que ce dépôt a déjà payée deux fois.
        // ⇒ On nettoie AVANT, et on IMPRIME ce qu'on a nettoyé : un dispositif conditionnel qui ne
        // déclare pas son régime est indiscernable d'un dispositif inerte.
        [UnitySetUp]
        public IEnumerator SetUp()
        {
            int shellsTues = 0, canvasTues = 0, locatairesTues = 0;
            foreach (AppShell reste in Object.FindObjectsByType<AppShell>(FindObjectsInactive.Include, FindObjectsSortMode.None))
            {
                if (reste.ShellCanvas != null) { Object.DestroyImmediate(reste.ShellCanvas.gameObject); canvasTues++; }
                Object.DestroyImmediate(reste.gameObject);
                shellsTues++;
            }
            foreach (Canvas reste in Object.FindObjectsByType<Canvas>(FindObjectsInactive.Include, FindObjectsSortMode.None))
            {
                Object.DestroyImmediate(reste.gameObject);
                canvasTues++;
            }
            // ⛔ C6 (revue ⊥ round 2) — CLASSE ENTIÈRE, pas seulement l'instance nommée : un
            // AppShell/Canvas résiduel n'est pas la SEULE pollution possible. La branche de repli
            // d'`OpenNav`/`OpenDetail` (item 0.4) crée une racine `Nav_*` NUE, jamais parentée sous
            // un AppShell — donc jamais atteinte par les deux boucles ci-dessus — qui survivrait
            // dans le domaine PlayMode et entrerait dans un balayage `IShellTenant` d'un test
            // SUIVANT (rouge à tort, dépendant de l'ordre). On détruit donc TOUT GameObject portant
            // un `IShellTenant`, quelle que soit sa racine, et on IMPRIME le compte (un dispositif
            // conditionnel qui ne déclare pas son régime est indiscernable d'un dispositif inerte).
            foreach (MonoBehaviour comportement in Object.FindObjectsByType<MonoBehaviour>(FindObjectsInactive.Include, FindObjectsSortMode.None))
            {
                if (comportement != null && comportement is IShellTenant)
                {
                    Object.DestroyImmediate(comportement.gameObject);
                    locatairesTues++;
                }
            }
            Debug.Log($"[Charpente] SetUp — régime déclaré : {shellsTues} AppShell, {canvasTues} Canvas et " +
                      $"{locatairesTues} IShellTenant résiduels détruits avant le chargement.");
            yield return null;
        }

        [UnityTearDown]
        public IEnumerator TearDown()
        {
            LogAssert.ignoreFailingMessages = false; // jamais laissé fuiter vers un test SANS RAPPORT
            if (sceneDeDemarrage.IsValid() && sceneDeDemarrage.isLoaded)
            {
                AsyncOperation dechargement = SceneManager.UnloadSceneAsync(sceneDeDemarrage);
                while (dechargement != null && !dechargement.isDone) yield return null;
            }
            sceneDeDemarrage = default;
            foreach (Canvas reste in Object.FindObjectsByType<Canvas>(FindObjectsInactive.Include, FindObjectsSortMode.None))
                Object.Destroy(reste.gameObject);
            yield return null;
        }

        /// <summary>L'INSTRUMENT, et il est scopé à UNE scène par construction. Un `FindFirstObjectByType
        /// &lt;AppShell&gt;()` nu répondrait « oui » pour un shell construit par un test, pour un objet
        /// `DontDestroyOnLoad`, ou pour n'importe quelle scène additive — c'est-à-dire pour tout SAUF
        /// la propriété qu'on mesure.</summary>
        private static AppShell SondeShellDansLaScene(Scene scene)
        {
            if (!scene.IsValid() || !scene.isLoaded) return null;
            foreach (GameObject racine in scene.GetRootGameObjects())
            {
                AppShell trouve = racine.GetComponentInChildren<AppShell>(true);
                if (trouve != null) return trouve;
            }
            return null;
        }

        private IEnumerator ChargerLaSceneDeDemarrageDuBuild()
        {
            // Le shell signe sa session au `Start()` (signin + `session/open` + sonde heat) : sur une
            // stack absente ou non semée, il logue ses propres `Debug.LogError`, qu'`UnityTestFramework`
            // compte comme des échecs. CES falsifiables-ci sont STRUCTURELLES — elles n'assertent RIEN
            // sur le réseau — donc ce bruit est orthogonal, et le taire ici n'avale aucun défaut
            // produit : aucune assertion de ce fichier ne porte sur l'authentification. (Même patron,
            // même justification, que `AppShellPlayModeTests.ExpectTenantOwnDemoAuthNoise`.)
            LogAssert.ignoreFailingMessages = true;

            // ⛔ GARDE ANTI-VACUITÉ n°1 — sans elle, un projet dont les Build Settings sont VIDES
            // ferait passer tout ce qui suit « à vide » : `GetScenePathByBuildIndex(0)` rend la chaîne
            // vide, et une comparaison entre deux chaînes vides est VRAIE.
            Assert.GreaterOrEqual(SceneManager.sceneCountInBuildSettings, 1,
                "Build Settings vides : aucune scène de démarrage ⇒ un build ne montrerait AUCUN écran.");

            string chemin = SceneUtility.GetScenePathByBuildIndex(0);
            Assert.IsNotEmpty(chemin, "la scène d'index de build 0 n'a pas de chemin");

            AsyncOperation chargement = SceneManager.LoadSceneAsync(0, LoadSceneMode.Additive);
            Assert.IsNotNull(chargement, "LoadSceneAsync(0) a refusé l'index de build 0");
            while (!chargement.isDone) yield return null;

            sceneDeDemarrage = SceneManager.GetSceneByBuildIndex(0);
            Assert.IsTrue(sceneDeDemarrage.IsValid() && sceneDeDemarrage.isLoaded,
                "la scène d'index de build 0 n'est pas chargée");
            // ⛔ GARDE ANTI-VACUITÉ n°2 — la scène chargée est bien CELLE que les Build Settings
            // désignent, pas une scène homonyme ni celle du runner de tests.
            Assert.AreEqual(chemin, sceneDeDemarrage.path,
                "la scène chargée n'est pas celle de l'index de build 0");

            yield return null; // `Start()` d'`AppShell` : `EnsureInitialized()` y bâtit tout le chrome, synchrone.
        }

        // ─────────────────────────────────────────────────────────────────────────────────────────
        // F0.1-a — LA GARDE. Structurelle : aucun pixel, aucune couleur, aucune valeur de réponse.
        // ─────────────────────────────────────────────────────────────────────────────────────────
        [UnityTest]
        public IEnumerator F0_1a_LaSceneDeDemarrageDuBuild_PorteAppShellTopBarEtLaBarreDOnglets()
        {
            yield return ChargerLaSceneDeDemarrageDuBuild();

            AppShell shell = SondeShellDansLaScene(sceneDeDemarrage);
            Assert.IsNotNull(shell,
                $"aucun AppShell dans la scène de démarrage du build ({sceneDeDemarrage.path}) — " +
                "les 24 montages d'Assets/Tests prouvent que le shell marche, jamais qu'un joueur le rencontre.");

            // Le shell trouvé APPARTIENT à la scène du build. C'est cette égalité, et elle seule, qui
            // distingue « la charpente existe » de « un test a fait un AddComponent ».
            Assert.AreEqual(sceneDeDemarrage.path, shell.gameObject.scene.path,
                "l'AppShell trouvé n'appartient pas à la scène de démarrage du build");

            Assert.IsNotNull(shell.TopBar, "le shell de la scène de démarrage n'a pas de TopBarController");
            Assert.IsNotNull(shell.TabBarRoot, "le shell de la scène de démarrage n'a pas de barre d'onglets");
            Assert.IsNotNull(shell.ContentSlot, "le shell de la scène de démarrage n'a pas d'emplacement de contenu");

            // La barre d'onglets est PEUPLÉE — et EXACTEMENT de ce qu'elle doit porter.
            // ⛔ CORRIGÉ (revue ⊥ round 2, C2) : un PLANCHER (`onglets.Length > 0`) reste VERT
            // même si 3 des 4 boutons disparaissent demain — un monde où « Famille », « Filière »
            // et « Plus » ont tous disparu et où seul « Accueil » survit satisfait encore
            // `Length > 0`, sans qu'aucune de leurs destinations ne soit atteignable. `front.md`
            // (item 0.2) le dit pour ce même défaut : « Pas un compte. Asserter QUELS, pas
            // seulement combien. » `AppShell.BuildTabBar` en construit EXACTEMENT 4 (canon §6 —
            // Accueil/Famille/Filière/Plus, PAS Carte : « on est déjà sur la carte, elle sort du
            // dock »). On n'asserte toujours pas les LIBELLÉS affichés ici (item 0.2, arbitrage
            // user ouvert, i18n non tranché) — mais le NOM du GameObject de chaque bouton
            // (`$"Tab_{tab}"`, posé par `AddTabButton`, indépendant du libellé) est une clé stable.
            Button[] onglets = shell.TabBarRoot.GetComponentsInChildren<Button>(true);
            var nomsOnglets = new List<string>();
            foreach (Button b in onglets) nomsOnglets.Add(b.gameObject.name);
            var ongletsAttendus = new List<string>
            {
                $"Tab_{AppShell.Tab.Home}", $"Tab_{AppShell.Tab.Org}", $"Tab_{AppShell.Tab.Pipeline}", $"Tab_{AppShell.Tab.More}",
            };
            CollectionAssert.AreEquivalent(ongletsAttendus, nomsOnglets,
                $"la barre d'onglets de la scène de démarrage doit porter EXACTEMENT {{{string.Join(", ", ongletsAttendus)}}} " +
                $"(un de chaque, ni plus ni moins) — trouvé {{{string.Join(", ", nomsOnglets)}}}.");

            Debug.Log($"[Charpente] F0.1-a — scène « {sceneDeDemarrage.path} » · AppShell présent · " +
                      $"TopBar présent · {onglets.Length} bouton(s) d'onglet : {string.Join(", ", nomsOnglets)}.");
        }

        // ─────────────────────────────────────────────────────────────────────────────────────────
        // F0.1-b — CONTRÔLE POSITIF DE L'INSTRUMENT.
        //
        // Une sonde qui répond « oui » partout ne prouve rien : ce dépôt a déjà livré trois sondes
        // successives dont le verdict était UNIFORME et entièrement faux. On exige donc, du MÊME
        // instrument et dans le MÊME test, deux réponses DIFFÉRENTES — sur la scène du build, et sur
        // une scène témoin dont on sait qu'elle ne porte pas de shell.
        // ⇒ Ce test rougirait si `SondeShellDansLaScene` se mettait à répondre « oui » sans regarder.
        // ─────────────────────────────────────────────────────────────────────────────────────────
        [UnityTest]
        public IEnumerator F0_1b_ControlePositif_LaSondeSaitDireNonSurUneSceneSansShell()
        {
            yield return ChargerLaSceneDeDemarrageDuBuild();

            Scene temoin = SceneManager.CreateScene("charpente-temoin-sans-shell");
            yield return null;

            AppShell dansLeBuild = SondeShellDansLaScene(sceneDeDemarrage);
            AppShell dansLeTemoin = SondeShellDansLaScene(temoin);

            Assert.IsNotNull(dansLeBuild, "la sonde ne trouve pas le shell là où il est");
            Assert.IsNull(dansLeTemoin, "la sonde trouve un shell dans une scène qui n'en contient aucun ⇒ elle répond sans regarder");

            Debug.Log($"[Charpente] F0.1-b — instrument DISCRIMINANT : scène du build → trouvé ; " +
                      $"scène témoin « {temoin.name} » (0 racine) → non trouvé.");

            AsyncOperation dechargement = SceneManager.UnloadSceneAsync(temoin);
            while (dechargement != null && !dechargement.isDone) yield return null;
        }
    }
}
