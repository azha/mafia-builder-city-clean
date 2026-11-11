using System.Collections;
using System.IO;
using NUnit.Framework;
using UnityEngine;
using UnityEngine.TestTools;
using UnityEngine.UI;
using MafiaCleanCity.I18n;
using MafiaCleanCity.Mouvements;
using MafiaCleanCity.Operational;
using MafiaCleanCity.Operational.Exceptions;
using MafiaCleanCity.Operational.Tests;   // AdresseDuBackPlayModeTests.Racines
using MafiaCleanCity.Shell;

namespace MafiaCleanCity.Tests
{
    // Banc de PLANCHES (juge-visuel borné, lot retour d'appui v5, 11/11) : l'Accueil du VRAI shell, à DONNÉE FIXE, photographié à deux résolutions, dans deux
    // états, UNE PAIRE de photos par cadrage (le diff de la paire mesure l'instabilité propre du banc). Régie de test à horloge figée : t = 0, jamais deux
    // captures d'une animation. Sortie : `$PLANCHES_DIR/<etat>-<L>x<H>-<n>.png` (n = 1, 2). Sans PLANCHES_DIR, le test ne fait rien et RESTE VERT (il n'est
    // pas une garde ; il se joue par son nom, jamais par catégorie de CI). Ne vaut que SOUS un périphérique graphique (pas `-nographics`).
    // Compilable sur l'arbre « avant » comme sur l'arbre « après » : il n'emploie que des coutures qui existaient déjà.
    [Category("PlanchesAccueil")]
    public class AccueilPlanchesRetourAppuiPlayModeTests
    {
        private static readonly int[][] Resolutions = { new[] { 1080, 1920 }, new[] { 1080, 2400 } };

        private GameObject shellGo;
        private AppShell shell;
        private System.Collections.Generic.HashSet<GameObject> racinesAvant;

        [SetUp]
        public void Monter()
        {
            racinesAvant = new System.Collections.Generic.HashSet<GameObject>(AdresseDuBackPlayModeTests.Racines());
            AdresseDuBack.PoserPourTest("http://127.0.0.1:9");
            I18nCatalog.Oublier();
            Libelle.RemettreLesCompteurs();
            RegieMouvement.Oublier();
            RegieMouvement.PourTest();
        }

        [TearDown]
        public void Demonter()
        {
            if (shell != null && shell.ShellCanvas != null) Object.DestroyImmediate(shell.ShellCanvas.gameObject);
            if (shellGo != null) Object.DestroyImmediate(shellGo);
            shell = null; shellGo = null;
            RegieMouvement.Oublier();
            if (racinesAvant != null)
            {
                foreach (GameObject g in AdresseDuBackPlayModeTests.Racines())
                    if (g != null && !racinesAvant.Contains(g)) Object.DestroyImmediate(g);
                racinesAvant = null;
            }
            AdresseDuBack.Oublier();
            EtatPublieParLeShell.RendrePourTest();
            I18nCatalog.Oublier();
            Libelle.RemettreLesCompteurs();
            LogAssert.ignoreFailingMessages = false;
        }

        // ------------------------------------------------------------------------------ le montage (copie de RetourGpLotBPlayModeTests)
        private sealed class TransportTemoin : ITransportDeSession
        {
            public SessionOpenDto Reponse;
            public IEnumerator Fermer(string jeton, System.Action<long, string> echec) { yield break; }
            public IEnumerator Ouvrir(string jeton, System.Action<SessionOpenDto> ok, System.Action<long, string> echec) { ok(Reponse); yield break; }
        }

        private sealed class SourceTemoin : ISourceDeLaSuite
        {
            public EtatDeLaSuite Etat;
            public IEnumerator Lire(string jeton, bool carteDeTete, System.Action<EtatDeLaSuite> ok)
            {
                if (Etat != null) Etat.CarteDeTete = carteDeTete;
                ok(Etat);
                yield break;
            }
        }

        private static EtatDeLaSuite JoueurNeuf() => new EtatDeLaSuite
        {
            Palier = 1, LaboId = "labo-1", Cuisson = "IDLE", PrecurseurType = "PYRALIN", Stock = "NONE",
            Dealers = new MafiaCleanCity.Operational.Selling.DealerDto[0],
            Lieutenants = new[] { new MafiaCleanCity.Operational.Lieutenant.RosterRow { lieutenant_id = "lt-1", name = "Lt. Tull", rule_count_band = "NONE" } },
        };

        private static void Poser<T>(object cible, string propriete, T valeur) =>
            typeof(AppShell).GetField($"<{propriete}>k__BackingField", System.Reflection.BindingFlags.Instance | System.Reflection.BindingFlags.NonPublic)
                .SetValue(cible, valeur);

        private static SessionOpenDto Session(string idCarte, string typeDeCarte, params string[] file)
        {
            var q = new ExceptionCardDto[file.Length];
            for (int i = 0; i < file.Length; i++) q[i] = new ExceptionCardDto { exception_id = file[i], severity_band = "MODERATE" };
            return new SessionOpenDto
            {
                session_id = "s",
                hl_card = idCarte == null ? null : new HlCardDto { card_id = idCarte, decision_type_key = typeDeCarte, impact_bucket = "moderate", urgency_bucket = "low" },
                queue = q,
            };
        }

        private IEnumerator AttendreLAccueil()
        {
            float t0 = Time.realtimeSinceStartup;
            while (Time.realtimeSinceStartup - t0 < 15f
                   && (shell.ContentSlot == null || shell.ContentSlot.GetComponentInChildren<ExceptionQueuePanelController>(false) == null))
                yield return null;
            yield return null;
            yield return null;
            Canvas.ForceUpdateCanvases();
        }

        private IEnumerator MonterLAccueil(SessionOpenDto session, bool avecSuite)
        {
            LogAssert.ignoreFailingMessages = true;
            shellGo = new GameObject("AppShell_Planches");
            shell = shellGo.AddComponent<AppShell>();
            yield return AttendreLAccueil();
            Poser(shell, "Token", "jeton-de-test");
            shell.TransportDeSessionPourTest = new TransportTemoin { Reponse = session };
            shell.SourceDeLaSuitePourTest = new SourceTemoin { Etat = avecSuite ? JoueurNeuf() : null };
            if (shell.SurimpressionOuverte) Assert.AreEqual("surimpression", shell.Depiler());
            yield return null;
            ProductionClickSupport.Click(shell.TabBarRoot.Find("Tab_Empire").GetComponent<Button>());
            yield return AttendreLAccueil();
            RegieMouvement.Oublier();   // horloge figée : t = 0, rien n'avance entre les deux photos de la paire
            RegieMouvement.PourTest();
        }

        private static void Ecrire(string dossier, string etat, int l, int h, int n, Color32[] px)
        {
            var tex = new Texture2D(l, h, TextureFormat.RGB24, false);
            tex.SetPixels32(px);
            tex.Apply();
            File.WriteAllBytes(Path.Combine(dossier, etat + "-" + l + "x" + h + "-" + n + ".png"), tex.EncodeToPNG());
            Object.DestroyImmediate(tex);
        }

        private IEnumerator Planches(string etat, SessionOpenDto session, bool avecSuite)
        {
            string dossier = System.Environment.GetEnvironmentVariable("PLANCHES_DIR");
            if (string.IsNullOrEmpty(dossier)) { Assert.Ignore("PLANCHES_DIR absent : banc de planches inactif"); yield break; }
            Directory.CreateDirectory(dossier);
            yield return MonterLAccueil(session, avecSuite);
            foreach (int[] r in Resolutions)
                for (int n = 1; n <= 2; n++)
                    Ecrire(dossier, etat, r[0], r[1], n, RetourReleveHelper.Photographier(shell.ShellCanvas, r[0], r[1]));
            Debug.Log("[PLANCHES] " + etat + " : " + Resolutions.Length + " résolutions x 2 photos dans " + dossier);
        }

        // Les états que la MAQUETTE de l'Accueil dessine (ecrans-brennar-accueil.html @ 8f59cf94, 8 cadres ④) ; les cadres 7 (l'après-geste) et 8 (l'échec
        // de la 1re cible) demandent un geste et ne sont pas montés ici.
        private const string Local = "DAMAGED_BUILDING_REPAIR", Rapports = "AUTONOMY_REPORTS_PENDING";

        [UnityTest] public IEnumerator Cadre1_RienATrancher() { yield return Planches("c1-rien-a-trancher", Session(null, null), false); }
        [UnityTest] public IEnumerator Cadre2_UneCarteDeTete() { yield return Planches("c2-une-carte-de-tete", Session("c-tete", Local), false); }
        [UnityTest] public IEnumerator Cadre3_DesRapportsALire() { yield return Planches("c3-des-rapports-a-lire", Session("c-rapports", Rapports), false); }
        [UnityTest] public IEnumerator Cadre4_LaFileSousPression() { yield return Planches("c4-la-file-sous-pression", Session(null, null, "e-1", "e-2", "e-3", "e-4"), false); }
        [UnityTest] public IEnumerator Cadre5_JoueurNeufLaSuite() { yield return Planches("c5-joueur-neuf-la-suite", Session(null, null), true); }
        [UnityTest] public IEnumerator Cadre6_CarteDeTeteAuDessusDeLaFile() { yield return Planches("c6-carte-de-tete-au-dessus-de-la-file", Session("c-tete", Local, "e-1", "e-2", "e-3", "e-4"), false); }
    }
}
