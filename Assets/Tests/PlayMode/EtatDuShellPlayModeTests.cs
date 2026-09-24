using System;
using System.Collections;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Reflection;
using System.Runtime.CompilerServices;
using System.Text.RegularExpressions;
using NUnit.Framework;
using UnityEngine;
using UnityEngine.TestTools;
using MafiaCleanCity.I18n;
using MafiaCleanCity.Shell;
using Object = UnityEngine.Object;

namespace MafiaCleanCity.Operational.Tests
{
    // L'ÉTAT PUBLIÉ PAR LE SHELL, GARDE DE CLASSE (2026-09-24) — mesuré au créneau du 24/09 : `AdresseDuBack` monte le vrai shell, qui
    // publie ses marges (`ShellChrome.PublierInsets`) ; `EcranConflitE12`, monté HORS shell ensuite, bâtissait son corps sur ces
    // marges d'un shell détruit (vert seul, rouge après). 23 classes de test montent le vrai shell.
    //   S1  la liste `EtatPublieParLeShell.Couverts` est ÉGALE aux statiques mutables réels de `ShellContracts` et de `Shell`
    //       (réflexion) — un statique neuf publié par le shell rougit tant qu'il n'est pas rendu au point unique
    //   S2  le point unique est BRANCHÉ : `MafiaCI.TestFinished` rend l'état à la sortie de chaque classe
    //   S3  CONTRÔLE POSITIF : le vrai shell publie, ㉙ monté hors shell ensuite hérite de sa marge (la fuite reproduite), et le
    //       rendu la ferme (marge 0)
    //   S4  le jeton de structure : publié ⇒ non vierge ; rendu ⇒ vierge
    [Category("EtatDuShell")]
    public class EtatDuShellPlayModeTests
    {
        private static readonly Regex Adossee = new Regex(@"^<(\w+)>k__BackingField$");

        internal static List<string> StatiquesMutables(params Assembly[] assemblees)
        {
            var res = new List<string>();
            foreach (Assembly a in assemblees.Distinct())
                foreach (Type t in a.GetTypes())
                {
                    if (t.Name.StartsWith("<", StringComparison.Ordinal) || t.IsDefined(typeof(CompilerGeneratedAttribute), false)) continue;
                    foreach (FieldInfo f in t.GetFields(BindingFlags.Static | BindingFlags.Public | BindingFlags.NonPublic | BindingFlags.DeclaredOnly))
                    {
                        if (f.IsLiteral || f.IsInitOnly) continue;
                        Match m = Adossee.Match(f.Name);
                        if (!m.Success && f.Name.StartsWith("<", StringComparison.Ordinal)) continue;
                        res.Add(t.Name + "." + (m.Success ? m.Groups[1].Value : f.Name));
                    }
                }
            return res.OrderBy(x => x, StringComparer.Ordinal).ToList();
        }

        [Test]
        public void S1_LesStatiquesPubliesParLeShell_SontTousRendusAuPointUnique()
        {
            List<string> reels = StatiquesMutables(typeof(ShellChrome).Assembly, typeof(AppShell).Assembly);
            Assert.GreaterOrEqual(reels.Count, 2, "anti-vacuité : la réflexion voit au moins les marges du chrome");
            CollectionAssert.AreEquivalent(EtatPublieParLeShell.Couverts, reels,
                "les statiques MUTABLES de ShellContracts/Shell ont divergé de EtatPublieParLeShell.Couverts — un statique neuf publié " +
                "par le shell fuit d'une classe de test à la suivante tant qu'il n'est pas rendu par RendrePourTest. Réels : " +
                string.Join(", ", reels));
        }

        [Test]
        public void S2_LePointUniqueEstBranche_MafiaCIRendLEtatALaSortieDeChaqueClasse()
        {
            string ci = File.ReadAllText(Path.Combine(Application.dataPath, "Editor", "MafiaCI.cs"));
            int crochet = ci.IndexOf("public void TestFinished(", StringComparison.Ordinal);
            int appel = ci.IndexOf("EtatPublieParLeShell.RendrePourTest()", StringComparison.Ordinal);
            Assert.GreaterOrEqual(crochet, 0, "MafiaCI.TestFinished introuvable : le crochet de sortie de classe a disparu");
            Assert.Greater(appel, crochet, "MafiaCI ne rend plus l'état du shell dans TestFinished : la fuite revient entre les classes");
        }

        // ── S3 : le contrôle positif ────────────────────────────────────────────────────────────────────────────────────

        private GameObject shellGo, hote;
        private AppShell shell;
        private HashSet<GameObject> racinesAvant;

        [TearDown]
        public void TearDown()
        {
            LogAssert.ignoreFailingMessages = false;
            DetruireConflit();
            DetruireShell();
            EtatPublieParLeShell.RendrePourTest();
            I18nCatalog.Oublier();
        }

        private void DetruireShell()
        {
            if (shell != null && shell.ShellCanvas != null) Object.DestroyImmediate(shell.ShellCanvas.gameObject);
            if (shellGo != null) Object.DestroyImmediate(shellGo);
            shell = null; shellGo = null;
            if (racinesAvant == null) return;
            foreach (GameObject g in AdresseDuBackPlayModeTests.Racines().Where(g => g != null && !racinesAvant.Contains(g)).ToList())
                Object.DestroyImmediate(g);
            racinesAvant = null;
        }

        private void DetruireConflit()
        {
            GameObject reste = GameObject.Find("ConflitRoot");
            while (reste != null) { Object.DestroyImmediate(reste); reste = GameObject.Find("ConflitRoot"); }
            if (hote != null) Object.DestroyImmediate(hote);
            hote = null;
        }

        private IEnumerator MonterConflitHorsShell()
        {
            hote = new GameObject("ConflitScreen", typeof(RectTransform));
            hote.AddComponent<ConflitScreenController>();
            yield return null;
            yield return null;
        }

        private static float BasDuCorps()
        {
            GameObject racine = GameObject.Find("ConflitRoot");
            Assert.IsNotNull(racine, "ConflitRoot introuvable : ㉙ ne s'est pas construit hors shell");
            var corps = racine.transform.Find("Corps") as RectTransform;
            Assert.IsNotNull(corps, "ConflitRoot/Corps introuvable");
            return corps.offsetMin.y;
        }

        [UnityTest]
        public IEnumerator S3_LaFuiteSeReproduit_ShellPuisConflitHorsShell_EtLeRenduLaFerme()
        {
            LogAssert.ignoreFailingMessages = true;   // le shell signe vers le défaut de l'éditeur : échec réseau attendu, hors mesure
            EtatPublieParLeShell.RendrePourTest();
            Assert.IsTrue(EtatPublieParLeShell.Vierge, "départ vierge");

            // 1) le vrai shell publie ses marges
            racinesAvant = new HashSet<GameObject>(AdresseDuBackPlayModeTests.Racines());
            shellGo = new GameObject("ShellFuite");
            shell = shellGo.AddComponent<AppShell>();
            float t0 = Time.realtimeSinceStartup;
            while (ShellChrome.BottomInsetPx <= 0f && Time.realtimeSinceStartup - t0 < 15f) yield return null;
            float bas = ShellChrome.BottomInsetPx;
            Assert.Greater(bas, 0f, "le shell n'a publié AUCUNE marge en 15 s : le contrôle ne reproduirait rien");
            DetruireShell();
            yield return null;

            // 2) la fuite : le shell est détruit, sa marge survit, et ㉙ monté hors shell bâtit dessus
            Assert.AreEqual(bas, ShellChrome.BottomInsetPx, "la marge survit au shell détruit");
            yield return MonterConflitHorsShell();
            Assert.AreEqual(bas, BasDuCorps(), 0.01f,
                "SANS rendu, ㉙ hors shell bâtit son corps sur la marge d'un shell détruit — c'est la fuite, reproduite");
            DetruireConflit();
            yield return null;

            // 3) le rendu au point unique la ferme
            EtatPublieParLeShell.RendrePourTest();
            Assert.IsTrue(EtatPublieParLeShell.Vierge, "rendu : " + EtatPublieParLeShell.Decrire());
            yield return MonterConflitHorsShell();
            Assert.AreEqual(0f, BasDuCorps(), 0.01f, "APRÈS le rendu, ㉙ hors shell remplit tout (marge 0) : la fuite est fermée");
        }

        [Test]
        public void S4_LeJetonDeStructure_PublieNonVierge_RenduVierge()
        {
            EtatPublieParLeShell.RendrePourTest();
            Assert.IsTrue(EtatPublieParLeShell.Vierge);
            JetonDeStructure.Publier(1, true);
            Assert.IsFalse(EtatPublieParLeShell.Vierge, "un jeton publié n'est pas l'état vierge : " + EtatPublieParLeShell.Decrire());
            EtatPublieParLeShell.RendrePourTest();
            Assert.IsTrue(EtatPublieParLeShell.Vierge, "rendu : " + EtatPublieParLeShell.Decrire());
        }
    }
}
