using System.Collections;
using NUnit.Framework;
using UnityEngine;
using UnityEngine.SceneManagement;
using UnityEngine.TestTools;
using MafiaCleanCity.Shell;

namespace MafiaCleanCity.Shell.Tests
{
    // GARDE STRUCTURELLE — **le dictionnaire est amorcé AVANT le premier montage.**
    //
    // ⛔ D'OÙ ELLE VIENT. Sept écrans avaient été convertis à `Libelle` et **aucun** n'amorçait
    // `I18nCatalog` : la conversion était inerte, et invisible, parce que le repli rendu est le
    // littéral d'origine — byte-identique à l'avant. *La garantie qui rendait la conversion sûre
    // (« rien ne change à l'écran ») est exactement ce qui a caché qu'elle ne servait à rien.*
    //
    // ⛔⛔ ET LA PROPRIÉTÉ N'EST PAS « EST-CE CHARGÉ ? ». Ce booléen est vrai aussi quand on charge
    // TROP TARD — après qu'un écran a rendu ses replis. Le cache est par SESSION : cet écran-là
    // gardera ses replis jusqu'à la fin de la partie, et `Charge == true` le certifiera.
    // ⇒ La grandeur qui discrimine est une GÉNÉRATION : combien de locataires étaient montés à
    //   l'instant de l'amorçage. Zéro, ou la garde ment. Même patron que `SurimpressionsMontees`,
    //   posé dans ce shell pour la même raison — *un drapeau déjà armé ne discrimine plus rien.*
    [Category("Joignabilite")]
    public class CatalogueAvantMontagePlayModeTests
    {
        private Scene scene;

        [UnityTearDown]
        public IEnumerator RendreLeMondeVide()
        {
            Scene active = SceneManager.GetActiveScene();
            if (active.IsValid() && active.isLoaded)
                foreach (GameObject r in active.GetRootGameObjects())
                    if (r != null) Object.DestroyImmediate(r);
            MafiaCleanCity.I18n.I18nCatalog.Oublier();
            yield return null;
        }

        [UnityTest]
        public IEnumerator LeCatalogueEstAmorceAvantLePremierMontage()
        {
            LogAssert.ignoreFailingMessages = true;
            MafiaCleanCity.I18n.I18nCatalog.Oublier();   // partir d'un monde SANS dictionnaire
            Assert.IsFalse(MafiaCleanCity.I18n.I18nCatalog.Charge,
                "précondition : le catalogue doit être vide au départ, sinon ce test constate un "
                + "chargement fait par quelqu'un d'autre et ne prouve rien de CE shell");

            Assert.GreaterOrEqual(SceneManager.sceneCountInBuildSettings, 1, "Build Settings vides");
            AsyncOperation op = SceneManager.LoadSceneAsync(SceneUtility.GetScenePathByBuildIndex(0),
                                                            LoadSceneMode.Single);
            while (op != null && !op.isDone) yield return null;
            yield return null;
            scene = SceneManager.GetActiveScene();

            AppShell shell = null;
            foreach (GameObject r in scene.GetRootGameObjects())
            {
                shell = r.GetComponentInChildren<AppShell>(true);
                if (shell != null) break;
            }
            Assert.IsNotNull(shell, "aucun AppShell dans la scène de démarrage");

            float t = 0f;
            while (shell.CurrentTab != AppShell.Tab.Empire && t < 30f) { t += Time.deltaTime; yield return null; }
            Assert.AreEqual(AppShell.Tab.Empire, shell.CurrentTab,
                "acquisition de session non résolue — rien ne peut être conclu sur l'ordre des gestes");

            Assert.AreNotEqual(-1, shell.MontagesAuChargementDuCatalogue,
                "le shell n'a JAMAIS amorcé le dictionnaire : tous les écrans de cette session "
                + "afficheront leurs replis, et `Libelle` ne sert à rien. C'est l'état exact mesuré "
                + "sur sept écrans le 2026-09-03.");
            Assert.AreEqual(0, shell.MontagesAuChargementDuCatalogue,
                $"le dictionnaire a été amorcé APRÈS {shell.MontagesAuChargementDuCatalogue} "
                + "montage(s) : ces écrans-là gardent leurs replis pour toute la session, et "
                + "`I18nCatalog.Charge == true` le certifiera quand même.");

            // ⚠️ ANTI-VACUITÉ : sans ceci, un bundle vide ou une route en erreur satisferait tout ce
            // qui précède — l'amorçage aurait « eu lieu » et n'aurait rien apporté. On exige donc
            // que le dictionnaire porte des clés, sans jamais dire lesquelles (c'est au back de le
            // décider) ni combien exactement (le compte bouge à chaque lot).
            Assert.IsTrue(MafiaCleanCity.I18n.I18nCatalog.Charge,
                "l'amorçage a été tenté mais le bundle n'a pas répondu — les écrans afficheront "
                + "leurs CLÉS ou leurs replis ; c'est un repli voulu, mais ce n'est pas un succès");
            Assert.Greater(MafiaCleanCity.I18n.I18nCatalog.NbClesServies, 0,
                "le catalogue est marqué chargé avec ZÉRO clé : l'amorçage a réussi à vide");
            Debug.Log($"[I18N] catalogue amorcé à {shell.MontagesAuChargementDuCatalogue} montage(s) · "
                      + $"locale={MafiaCleanCity.I18n.I18nCatalog.Locale} · "
                      + $"{MafiaCleanCity.I18n.I18nCatalog.NbClesServies} clés");
        }
    }
}
