using System.Collections;
using System.IO;
using System.Text.RegularExpressions;
using NUnit.Framework;
using UnityEngine;
using UnityEngine.TestTools;
using MafiaCleanCity.Shell;
using Object = UnityEngine.Object;

namespace MafiaCleanCity.Mouvements.Tests
{
    /// <summary>Le stockage de test : en mémoire. Un test ne touche JAMAIS aux `PlayerPrefs` de l'éditeur.</summary>
    internal sealed class StockageEnMemoire : IStockageDuMouvementReduit
    {
        public bool Valeur;
        public int Ecritures;
        public bool Lire() => Valeur;
        public void Ecrire(bool reduit) { Valeur = reduit; Ecritures++; }
    }

    // CLIENT-3 / E2a (design-couche-mouvement.md §3 « Accès à la régie », §5 « Mouvement réduit ») :
    //   N1  le niveau : `Reduit` si l'UNE des deux sources (réglage du joueur, système Android) le demande
    //   N2  `Appliquer` lit les deux sources et pose le niveau sur la régie ; la bascule de ⑲ le persiste puis le réapplique
    //   N3  Android : la lecture de `ANIMATOR_DURATION_SCALE` n'est COMPILÉE que sur appareil, et relue à `OnApplicationPause(false)`
    //   N4  le shell crée la régie, la publie, lit le niveau au démarrage, la retire avec lui
    // (La ligne de ⑲ elle-même : `ReglagesPlayModeTests.S5`.)
    [Category("Mouvement")]
    public class MouvementReduitPlayModeTests
    {
        private GameObject shellGo;
        private AppShell shell;

        [TearDown]
        public void TearDown()
        {
            MouvementReduit.Stockage = new StockageMouvementReduitPlayerPrefs();
            MouvementReduit.LectureDuSysteme = () => false;
            RegieMouvement.Oublier();
            LogAssert.ignoreFailingMessages = false;
            if (shell != null && shell.ShellCanvas != null) Object.DestroyImmediate(shell.ShellCanvas.gameObject);
            if (shellGo != null) Object.DestroyImmediate(shellGo);
            shell = null; shellGo = null;
        }

        [Test]
        public void N1_Niveau_ReduitSiUneDesDeuxSourcesLeDemande()
        {
            Assert.AreEqual(PolitiqueMouvement.Plein, MouvementReduit.Niveau(false, false));
            Assert.AreEqual(PolitiqueMouvement.Reduit, MouvementReduit.Niveau(true, false), "le joueur seul");
            Assert.AreEqual(PolitiqueMouvement.Reduit, MouvementReduit.Niveau(false, true), "le système seul");
            Assert.AreEqual(PolitiqueMouvement.Reduit, MouvementReduit.Niveau(true, true));
        }

        [Test]
        public void N2_Appliquer_LitLesDeuxSources_EtPoseLeNiveauSurLaRegie()
        {
            var stockage = new StockageEnMemoire();
            bool systeme = false;
            MouvementReduit.Stockage = stockage;
            MouvementReduit.LectureDuSysteme = () => systeme;
            Regie regie = RegieMouvement.PourTest();

            MouvementReduit.Appliquer();
            Assert.AreEqual(PolitiqueMouvement.Plein, regie.Politique, "aucune source ne le demande");
            stockage.Valeur = true;
            MouvementReduit.Appliquer();
            Assert.AreEqual(PolitiqueMouvement.Reduit, regie.Politique, "le réglage du joueur");
            Assert.AreEqual(PolitiqueMouvement.Reduit, RegieMouvement.PolitiqueGlobale);
            stockage.Valeur = false;
            systeme = true;
            MouvementReduit.Appliquer();
            Assert.AreEqual(PolitiqueMouvement.Reduit, regie.Politique, "l'échelle de durée d'animation du système à 0");
            systeme = false;
            MouvementReduit.Appliquer();
            Assert.AreEqual(PolitiqueMouvement.Plein, regie.Politique, "contrôle négatif : plus aucune source, le mouvement revient");
        }

        [Test]
        public void N2_PoserReglageDuJoueur_LePersiste_PuisLeReapplique()
        {
            var stockage = new StockageEnMemoire();
            MouvementReduit.Stockage = stockage;
            MouvementReduit.LectureDuSysteme = () => false;
            Regie regie = RegieMouvement.PourTest();

            MouvementReduit.PoserReglageDuJoueur(true);
            Assert.IsTrue(stockage.Valeur);
            Assert.AreEqual(1, stockage.Ecritures);
            Assert.AreEqual(PolitiqueMouvement.Reduit, regie.Politique);
            Assert.IsTrue(MouvementReduit.ReglageDuJoueur);
            MouvementReduit.PoserReglageDuJoueur(false);
            Assert.IsFalse(stockage.Valeur);
            Assert.AreEqual(PolitiqueMouvement.Plein, regie.Politique);
        }

        [Test]
        public void N2_LaCleDePlayerPrefs_EstUneConstanteNommee_ParDefautLeStockageEstPlayerPrefs()
        {
            StringAssert.StartsWith("mafia.", StockageMouvementReduitPlayerPrefs.Cle);
            Assert.IsInstanceOf<StockageMouvementReduitPlayerPrefs>(MouvementReduit.Stockage, "le défaut de production : PlayerPrefs");
        }

        // ------------------------------------------------------------------------------------------ N3 : Android

        private static string Source(params string[] chemin)
        {
            string[] tous = new string[chemin.Length + 2];
            tous[0] = Application.dataPath;
            tous[1] = "Scripts";
            chemin.CopyTo(tous, 2);
            return File.ReadAllText(Path.Combine(tous));
        }

        /// <summary>Le texte du corps de `OnApplicationPause` dans une source (jusqu'à `OnApplicationFocus`, ou 600 car.).</summary>
        private static string CorpsDeLaPause(string source)
        {
            int i = source.IndexOf("void OnApplicationPause(bool enPause)", System.StringComparison.Ordinal);
            if (i < 0) return "";
            int fin = source.IndexOf("void OnApplicationFocus", i, System.StringComparison.Ordinal);
            return source.Substring(i, fin > i ? fin - i : System.Math.Min(600, source.Length - i));
        }

        [Test]
        public void N3_Android_LEchelleDeDureeD_Animation_NEstLueQueSurAppareil_EtRelueAuRetour()
        {
            string reduit = Source("ShellContracts", "MouvementReduit.cs");
            int si = reduit.IndexOf("#if UNITY_ANDROID && !UNITY_EDITOR", System.StringComparison.Ordinal);
            int sinon = reduit.IndexOf("#else", si + 1, System.StringComparison.Ordinal);
            Assert.Greater(si, 0, "compilé SEULEMENT `#if UNITY_ANDROID && !UNITY_EDITOR`");
            Assert.Greater(sinon, si);
            string android = reduit.Substring(si, sinon - si);
            StringAssert.Contains("ANIMATOR_DURATION_SCALE", android, "l'échelle de durée d'animation du système");
            StringAssert.Contains("AndroidJavaClass", android);
            Assert.AreEqual(1, Regex.Matches(reduit, "AndroidJavaClass\\(\"com\\.unity3d").Count, "un seul point d'entrée JNI");
            StringAssert.DoesNotContain("AndroidJavaClass", reduit.Substring(0, si), "aucun JNI hors du bloc Android");
            StringAssert.DoesNotContain("AndroidJavaClass", reduit.Substring(sinon), "aucun JNI dans le repli");

            // relue à CHAQUE retour au premier plan : `OnApplicationPause(false)` appelle `MouvementReduit.Appliquer()`
            string pause = CorpsDeLaPause(Source("Shell", "AppShell.cs"));
            StringAssert.Contains("MouvementReduit.Appliquer()", pause);
            // contrôle négatif : le même relevé sur un corps qui ne la relit pas rougit
            Assert.IsFalse(CorpsDeLaPause("void OnApplicationPause(bool enPause) { enArrierePlan = enPause; }\nvoid OnApplicationFocus(bool f) { }").Contains("MouvementReduit.Appliquer()"));
        }

        // ------------------------------------------------------------------------------------------ N4 : le shell

        private IEnumerator Demarrer()
        {
            LogAssert.ignoreFailingMessages = true;   // le shell signe sa session au démarrage : le bruit réseau n'est pas l'objet de ce test
            shellGo = new GameObject("AppShell");
            shell = shellGo.AddComponent<AppShell>();
            yield return null;   // Start() : EnsureInitialized
        }

        private void Detruire()
        {
            if (shell != null && shell.ShellCanvas != null) Object.DestroyImmediate(shell.ShellCanvas.gameObject);
            Object.DestroyImmediate(shellGo);
            shell = null; shellGo = null;
        }

        [UnityTest]
        public IEnumerator N4_LeShell_CreeEtPublieLaRegie_LitLeNiveauAuDemarrage_LaRetireAvecLui()
        {
            MouvementReduit.Stockage = new StockageEnMemoire { Valeur = true };
            MouvementReduit.LectureDuSysteme = () => false;
            RegieMouvement.Oublier();
            yield return Demarrer();

            Assert.IsNotNull(shell.RegieDeMouvement, "le shell crée la régie");
            Assert.AreSame(shell.RegieDeMouvement, RegieMouvement.Courante, "…et la PUBLIE (`RegieMouvement.Courante`)");
            Assert.AreSame(shellGo, shell.RegieDeMouvement.gameObject, "sur son propre GameObject : durée de vie du shell");
            Assert.AreEqual(PolitiqueMouvement.Reduit, shell.RegieDeMouvement.Politique, "le réglage du joueur, lu au démarrage");
            Assert.AreSame(HorlogeReelle.Instance, shell.RegieDeMouvement.Horloge, "le shell tourne sur le temps réel (`Update` → `Tick`)");
            // le catalogue du HUD est admis : une entrée du chrome s'attache sans lever (G1)
            var cible = new GameObject("Cible", typeof(RectTransform));
            try
            {
                Assert.DoesNotThrow(() => RegieMouvement.Attacher(CatalogueHud.Pouls, (RectTransform)cible.transform, Reglage.Defaut));
                Assert.DoesNotThrow(() => RegieMouvement.Attacher(CatalogueHud.Neon, (RectTransform)cible.transform, Reglage.Defaut));
            }
            finally { Object.DestroyImmediate(cible); }

            Detruire();
            Assert.IsNull(RegieMouvement.Courante, "la régie s'en va avec le shell");

            // contrôle négatif : le niveau vient bien de la source — un second shell, réglage éteint, démarre en Plein
            MouvementReduit.Stockage = new StockageEnMemoire { Valeur = false };
            yield return Demarrer();
            Assert.AreEqual(PolitiqueMouvement.Plein, shell.RegieDeMouvement.Politique);
            Assert.AreSame(shell.RegieDeMouvement, RegieMouvement.Courante);
        }
    }
}
