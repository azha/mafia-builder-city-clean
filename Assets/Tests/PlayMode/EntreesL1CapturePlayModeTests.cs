using System.Collections;
using System.IO;
using System.Linq;
using NUnit.Framework;
using UnityEngine;
using UnityEngine.TestTools;
using UnityEngine.UI;
using MafiaCleanCity.Account.Settings;
using MafiaCleanCity.CityMap;
using MafiaCleanCity.Mouvements;
using MafiaCleanCity.Shell;
using MafiaCleanCity.Shell.Tests;
using MafiaCleanCity.Tests;
using Object = UnityEngine.Object;

namespace MafiaCleanCity.Capture.Tests
{
    // HARNAIS DES JUGES DE L1 (CLIENT-2, 11/11) — les trois entrées de passage (shell.entree, bandeau.entree, bascule.course) photographiées À MI-FONDU : l'horloge de la régie est FIGÉE sur un instant
    // jamais tické, la capture se prend à t = 0, à mi-course et à la fin, et le journal DIT la valeur écrite (alpha de ContentSlot, `anchoredPosition.y` du bandeau, `anchoredPosition.x` du curseur) à chaque
    // cliché. Une capture d'animation se prend à t = 0 (règle du socle) : l'horloge figée est ce qui la rend reproductible. Même banc que `PlanchesParEcranCapturePlayModeTests` : compte NEUF sur la pile dev,
    // vrai shell, `CaptureSousShell.CapturerLeShell`. Volontairement SANS `[PhotoSansEntree]` : ici l'entrée DOIT jouer.
    // Sortie : `MAFIA_ENTREES_L1_SORTIE` si posée, sinon `Logs/entrees-l1/<horodatage>/`. Cible : `MAFIA_PARCOURS_BACK_URL`. Catégorie PROPRE (`CaptureEntreesL1`), hors du filtre MafiaCI.
    // ⚠️ « t = 0 » du curseur = t0 + 0,5 ms : la piste naît à la réponse du serveur, APRÈS un `Tick` à t0 (régie idempotente : `Tick(t0)` n'évaluerait pas l'âge 0) ; 0,5 ms sur 140 ms = 0,4 % de la course.
    public class EntreesL1CapturePlayModeTests
    {
        private const string MotDePasse = "entrees-l1-pw";
        private const string VariableSortie = "MAFIA_ENTREES_L1_SORTIE";
        private const string VariableCible = "MAFIA_PARCOURS_BACK_URL";
        private const int Largeur = 1080, Hauteur = 2400;
        private static int callsignSeq;

        private GameObject shellGo;
        private AppShell shell;
        private string dossier, journal, urlAvant;
        private float horloge = 0f;   // chaque scénario prend un instant NEUF (jamais tické) ET PETIT : un float vers 1e6 n’a que 62,5 ms de résolution (run21 : alpha figé entre deux ticks)

        [SetUp] public void SetUp() { urlAvant = CibleDuParcours.Appliquer(System.Environment.GetEnvironmentVariable(VariableCible)); }

        [TearDown]
        public void TearDown()
        {
            DemoIdentityResolver.SortirModeCapture(GetType().Name);
            if (shell != null && shell.ShellCanvas != null) Object.DestroyImmediate(shell.ShellCanvas.gameObject);
            if (shellGo != null) Object.DestroyImmediate(shellGo);
            shell = null; shellGo = null;
            LogAssert.ignoreFailingMessages = false;
            MafiaCleanCity.I18n.I18nCatalog.Oublier();
            CibleDuParcours.Restaurer(urlAvant);
        }

        private IEnumerator Ouvrir()
        {
            string sortie = System.Environment.GetEnvironmentVariable(VariableSortie);
            dossier = !string.IsNullOrWhiteSpace(sortie) ? sortie.Trim()
                : Path.Combine("Logs", "entrees-l1", System.DateTime.UtcNow.ToString("yyyyMMdd-HHmmss"));
            Directory.CreateDirectory(dossier);
            journal = Path.Combine(dossier, "journal.tsv");
            File.WriteAllText(journal, "scénario\tinstant\tmesure\tvaleur\tfichier\n");
            Debug.Log($"[ENTREES-L1] clichés et journal → {Path.GetFullPath(dossier)}");

            var auth = new AuthClient();
            string callsign = SeederSupport.SafeCallsign("entrees", ref callsignSeq);
            string errSignup = null;
            yield return auth.SignUp(callsign, MotDePasse, _ => { }, e => errSignup = e);
            Assert.IsNull(errSignup, $"l'inscription du compte neuf a échoué ({errSignup}) — la pile dev répond-elle ?");

            LogAssert.ignoreFailingMessages = true;
            shellGo = new GameObject("EntreesL1Shell");
            shell = shellGo.AddComponent<AppShell>();
            shell.SetIdentity(callsign, MotDePasse);   // AVANT Start()
            float fin = Time.realtimeSinceStartup + 45f;
            while (string.IsNullOrEmpty(shell.Token) && Time.realtimeSinceStartup < fin) yield return null;
            Assert.IsFalse(string.IsNullOrEmpty(shell.Token), "le shell n'a pas ouvert de session avec le compte neuf");
            yield return CaptureSousShell.ShellConnecteOuEchoue(shell, callsign, "cliche_entrees_l1");
            var echecs = new System.Collections.Generic.List<string>();
            yield return CaptureSousShell.AttendreUnShellCalme(shell, echecs);
            Assert.IsEmpty(echecs, string.Join(" · ", echecs));
            foreach (BandeauEphemere b in Object.FindObjectsByType<BandeauEphemere>(FindObjectsSortMode.None)) b.Effacer();
            yield return null;
        }

        private Regie Fige(out float t0)
        {
            horloge += 1000f;   // 1000, 2000, 3000 s : au-delà du temps réel déjà écoulé, résolution float ≈ 0,1 ms
            t0 = horloge;
            Regie r = shell.RegieDeMouvement;
            Assert.IsNotNull(r, "le shell publie sa régie");
            r.Horloge = new HorlogeFigee(t0);
            return r;
        }

        private static void A(Regie r, float t) { ((HorlogeFigee)r.Horloge).Temps = t; r.Tick(t); }

        private void Noter(string scenario, string instant, string mesure, string valeur, string fichier)
        {
            File.AppendAllText(journal, $"{scenario}\t{instant}\t{mesure}\t{valeur}\t{fichier}\n");
            Debug.Log($"[ENTREES-L1] {scenario} · {instant} · {mesure} = {valeur}");
        }

        private IEnumerator Cliche(string scenario, string instant, string mesure, System.Func<string> lire)
        {
            string avant = lire();
            string nom = $"{scenario}_{instant}_{Largeur}x{Hauteur}.png";
            yield return CaptureSousShell.CapturerLeShell(shell, Largeur, Hauteur, Path.Combine(dossier, nom), false, null);
            Noter(scenario, instant, mesure + " (avant le rendu)", avant, nom);
            Noter(scenario, instant, mesure + " (après le rendu)", lire(), nom);
        }

        private string AlphaSlot()
        {
            CanvasGroup cg = shell.ContentSlot.GetComponent<CanvasGroup>();   // `is` contournerait le « null » d'Unity : comparaison explicite
            return (cg != null ? cg.alpha : 1f).ToString("0.000");
        }

        [UnityTest]
        [Category("CaptureEntreesL1")]
        [Timeout(900000)]
        public IEnumerator Entrees_L1_ATroisInstants()
        {
            yield return Ouvrir();

            // ───────────────────────── shell.entree : Empire (déjà monté) → Org, 160 ms, fondu de ContentSlot
            yield return Cliche("shell-entree", "avant", "alpha ContentSlot", AlphaSlot);
            Regie r = Fige(out float t0);
            shell.ActivateTab(AppShell.Tab.Org);
            yield return null;   // le `Start()` du locataire a bâti son UI ; `Update` tique à t0 : âge 0
            Assert.IsFalse(shell.EntreeOngletPourTest.EstNul, "le 2ᵉ montage d'onglet pose `shell.entree`");
            yield return Cliche("shell-entree", "t0", "alpha ContentSlot", AlphaSlot);
            foreach (float d in new[] { 0.02f, 0.04f, 0.06f }) { A(r, t0 + d); Noter("shell-entree", $"échantillon {d * 1000:0} ms", "alpha ContentSlot", AlphaSlot(), "—"); }
            A(r, t0 + 0.08f);
            yield return Cliche("shell-entree", "t80ms", "alpha ContentSlot", AlphaSlot);
            foreach (float d in new[] { 0.10f, 0.12f, 0.14f }) { A(r, t0 + d); Noter("shell-entree", $"échantillon {d * 1000:0} ms", "alpha ContentSlot", AlphaSlot(), "—"); }
            A(r, t0 + 0.17f);
            yield return Cliche("shell-entree", "t160ms", "alpha ContentSlot", AlphaSlot);

            // ───────────────────────── bandeau.entree : une annonce HOT, 200 ms, descend de 10 u et paraît
            r = Fige(out t0);
            BandeauEphemere bandeau = shell.TopBar != null ? shell.TopBar.Bandeau : null;
            Assert.IsNotNull(bandeau, "le shell porte son bandeau");
            var rt = (RectTransform)bandeau.transform;
            CanvasGroup g = bandeau.GetComponent<CanvasGroup>();
            float repos = rt.anchoredPosition.y;
            string Bande() => $"y−repos={rt.anchoredPosition.y - repos:0.00} u · alpha={g.alpha:0.000}";
            Noter("bandeau-entree", "avant", "repos y", repos.ToString("0.00"), "—");
            Assert.IsTrue(bandeau.Annoncer(AnnonceDuBandeau.Choisir(false, null, "HOT", null, null), null, 30f), "l'annonce est acceptée");
            yield return null;
            yield return Cliche("bandeau-entree", "t0", "bandeau", Bande);
            A(r, t0 + 0.10f);
            yield return Cliche("bandeau-entree", "t100ms", "bandeau", Bande);
            A(r, t0 + 0.21f);
            yield return Cliche("bandeau-entree", "t200ms", "bandeau", Bande);
            bandeau.Effacer();
            yield return null;

            // ───────────────────────── bascule.course : ⑲ Réglages, geste réel sur « Dire mes prix au marché », 140 ms
            shell.ActivateTab(AppShell.Tab.More);
            for (int i = 0; i < 5; i++) yield return null;
            Button entree = shell.ContentSlot.GetComponentsInChildren<Transform>(true).FirstOrDefault(t => t.name == "MenuPlus_les_reglages")?.GetComponent<Button>();
            Assert.IsNotNull(entree, "l'entrée « Les réglages » du PLUS");
            Assert.IsTrue(ProductionClickSupport.Click(entree), "l'entrée accepte le clic de production");
            SettingsScreenController reglages = null;
            for (float f = Time.realtimeSinceStartup + 20f; reglages == null && Time.realtimeSinceStartup < f;)
            {
                reglages = Object.FindFirstObjectByType<SettingsScreenController>();
                yield return null;
            }
            Assert.IsNotNull(reglages, "Réglages est monté");
            for (float f = Time.realtimeSinceStartup + 30f; reglages.RendusEffectues == 0 && Time.realtimeSinceStartup < f;) yield return null;   // le chargement servi (profil PUIS tutoriels) puis le 1er rendu
            for (int i = 0; i < 20; i++) yield return null;   // le rendu
            Debug.Log($"[ENTREES-L1] Réglages : Profil {(reglages.Profil != null ? "chargé" : "NUL")} · EtatVide {reglages.EtatVide} · DerniereErreur « {reglages.DerniereErreur} »");
            Transform ligne = Object.FindObjectsByType<Transform>(FindObjectsInactive.Include, FindObjectsSortMode.None).Where(t => t.name == "Bascule_Marche").LastOrDefault();
            if (ligne == null)
                Debug.Log("[ENTREES-L1] DIAG Réglages : enfants de ContentSlot = " + string.Join(", ", Enumerable.Range(0, shell.ContentSlot.childCount).Select(k => shell.ContentSlot.GetChild(k).name))
                    + " · enfants du contrôleur = " + string.Join(", ", Enumerable.Range(0, reglages.transform.childCount).Select(k => reglages.transform.GetChild(k).name))
                    + " · lignes Bascule* de la scène = " + string.Join(", ", Object.FindObjectsByType<Transform>(FindObjectsInactive.Include, FindObjectsSortMode.None).Where(t => t.name.StartsWith("Bascule")).Select(t => t.name)));
            Assert.IsNotNull(ligne, "la ligne « Dire mes prix au marché » est rendue");
            RectTransform Curseur() => Object.FindObjectsByType<Transform>(FindObjectsInactive.Include, FindObjectsSortMode.None).Where(t => t.name == "Bascule_Marche").Last().GetComponentsInChildren<RectTransform>(true).First(x => x.name == "Curseur");
            string Course() => $"curseur x={Curseur().anchoredPosition.x:0.00} u";
            yield return Cliche("bascule-course", "avant", "curseur", Course);
            r = Fige(out t0);
            Assert.IsTrue(ProductionClickSupport.Click(ligne.GetComponent<Button>()), "le geste réel : la bascule accepte le clic de production");
            for (float f = Time.realtimeSinceStartup + 20f; reglages.DerniereCourseDeBascule.EstNul && Time.realtimeSinceStartup < f;) yield return null;
            Assert.IsFalse(reglages.DerniereCourseDeBascule.EstNul, "le geste a changé l'état : une course est lancée");
            // La piste naît à la réponse du serveur, APRÈS les ticks de l'`Update` à t0 : on avance l'horloge de 1 ms par frame jusqu'à ce que la régie ait écrit le DÉPART (le curseur quitte sa position d'arrivée) ;
            // ce tick est « t = 0 » de la course, et le journal dit combien de ms il a fallu.
            float arrivee = Curseur().anchoredPosition.x, tNaissance = t0;
            bool parti = false;
            for (int k = 1; k <= 40 && !parti; k++)
            {
                yield return null;
                tNaissance = t0 + 0.001f * k;
                A(r, tNaissance);
                parti = Mathf.Abs(Curseur().anchoredPosition.x - arrivee) > 20f;
            }
            Assert.IsTrue(parti, $"la régie n'a jamais écrit le départ du curseur (arrivée x = {arrivee:0.00})");
            Noter("bascule-course", "naissance", "ms après le geste avant l'écriture du départ", ((tNaissance - t0) * 1000f).ToString("0"), "—");
            yield return Cliche("bascule-course", "t0", "curseur", Course);
            A(r, tNaissance + 0.07f);
            yield return Cliche("bascule-course", "t70ms", "curseur", Course);
            A(r, tNaissance + 0.15f);
            yield return Cliche("bascule-course", "t140ms", "curseur", Course);

            Debug.Log($"[ENTREES-L1] FIN — {Directory.GetFiles(dossier, "*.png").Length} clichés dans {Path.GetFullPath(dossier)}");
            Assert.AreEqual(11, Directory.GetFiles(dossier, "*.png").Length, "11 clichés attendus : shell.entree 4 (avant, t0, mi, fin) + bandeau.entree 3 (t0, mi, fin) + bascule.course 4 (avant, t0, mi, fin)");
        }
    }
}
