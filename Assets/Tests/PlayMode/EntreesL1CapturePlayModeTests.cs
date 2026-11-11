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
        private static readonly (int l, int h)[] Resolutions = { (1080, 2400), (1080, 1920) };
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
            MouvementReduit.OublierPourTest();
            CibleDuParcours.Restaurer(urlAvant);
        }

        private IEnumerator Ouvrir(string sousDossier = null)
        {
            string sortie = System.Environment.GetEnvironmentVariable(VariableSortie);
            dossier = !string.IsNullOrWhiteSpace(sortie) ? sortie.Trim()
                : Path.Combine("Logs", "entrees-l1", System.DateTime.UtcNow.ToString("yyyyMMdd-HHmmss"));
            if (sousDossier != null) dossier = Path.Combine(dossier, sousDossier);
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

        private string AlphaSlot()
        {
            CanvasGroup cg = shell.ContentSlot.GetComponent<CanvasGroup>();   // `is` contournerait le « null » d'Unity : comparaison explicite
            return (cg != null ? cg.alpha : 1f).ToString("0.000");
        }

        /// <summary>L'état de `shell.entree` : alpha de ContentSlot, piste du dernier montage d'onglet (posée ? vivante ?), identité du locataire monté. Sert à TRANCHER (a) l'appui relance l'entrée / (b) le banc.</summary>
        private string EtatEntree()
        {
            Handle h = shell.EntreeOngletPourTest;
            int id = shell.MountedTenantGameObject != null ? shell.MountedTenantGameObject.GetInstanceID() : 0;
            return $"alpha ContentSlot {AlphaSlot()} · piste shell.entree {(h.EstNul ? "nulle" : RegieMouvement.EstVivant(h) ? "VIVANTE" : "finie")} · locataire #{id}";
        }

        private IEnumerator Cliche(string scenario, string instant, string mesure, System.Func<string> lire, int nResolutions = 2)
        {
            string avant = lire();
            string dernier = null;
            for (int k = 0; k < nResolutions; k++)
            {
                string nom = $"{scenario}_{instant}_{Resolutions[k].l}x{Resolutions[k].h}.png";
                yield return CaptureSousShell.CapturerLeShell(shell, Resolutions[k].l, Resolutions[k].h, Path.Combine(dossier, nom), false, null);
                dernier = nom;
            }
            Noter(scenario, instant, mesure + " (avant le rendu)", avant, dernier);
            Noter(scenario, instant, mesure + " (après le rendu)", lire(), dernier);
        }

        private BandeauEphemere BandeauDuShell()
        {
            BandeauEphemere b = shell.TopBar != null ? shell.TopBar.Bandeau : null;
            Assert.IsNotNull(b, "le shell porte son bandeau");
            return b;
        }

        /// <summary>Monte ⑲ par le PLUS (geste réel) et attend son 1er rendu, puis le laisse CALMER : horloge fraîche, 1er tick, +300 ms simulées. Le banc de la 1ʳᵉ version tapait l'interrupteur sous l'horloge figée du
        /// scénario précédent : la piste `shell.entree` de ⑲ n'avait jamais été évaluée, son 1ᵉʳ tick tombait sur le geste (F1 du juge, run22). Les diagnostics avant/après le prouvent.</summary>
        private IEnumerator MonterReglagesEtCalmer(string scenario)
        {
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
            for (float f = Time.realtimeSinceStartup + 30f; reglages.RendusEffectues == 0 && Time.realtimeSinceStartup < f;) yield return null;
            for (int i = 0; i < 20; i++) yield return null;
            Noter(scenario, "montage de ⑲ (horloge encore figée sur le scénario d'avant)", "état de shell.entree", EtatEntree(), "—");
            Regie r = Fige(out float tM);
            A(r, tM);
            Noter(scenario, "1er tick après le montage", "état de shell.entree", EtatEntree(), "—");
            A(r, tM + 0.3f);
            Noter(scenario, "+300 ms simulées", "état de shell.entree", EtatEntree(), "—");
            Assert.AreEqual(1f, float.Parse(AlphaSlot(), System.Globalization.CultureInfo.InvariantCulture), 1e-3f, "⑲ est entier (α = 1) avant tout geste");
        }

        private SettingsScreenController Reglages() => Object.FindFirstObjectByType<SettingsScreenController>();
        private Transform Ligne(string nom) => Object.FindObjectsByType<Transform>(FindObjectsInactive.Include, FindObjectsSortMode.None).Where(t => t.name == nom).LastOrDefault();
        private RectTransform CurseurDe(string nom) => Ligne(nom).GetComponentsInChildren<RectTransform>(true).First(x => x.name == "Curseur");

        /// <summary>Un geste réel sur une ligne de bascule. `capturer` : clichés à t0 / 70 ms / 140 ms (2 résolutions) ; sinon échantillons numériques seuls. Le journal dit, à chaque instant, l'état de `shell.entree` : si l'appui
        /// relançait l'entrée, la piste serait VIVANTE et l'alpha de ContentSlot < 1.</summary>
        private IEnumerator Geste(string scenario, string nomLigne, bool capturer, bool avantCliche, int nResolutions = 2, bool course = true)
        {
            SettingsScreenController reglages = Reglages();
            Transform ligne = Ligne(nomLigne);
            Assert.IsNotNull(ligne, $"la ligne {nomLigne} est rendue");
            string Course() => $"curseur x={CurseurDe(nomLigne).anchoredPosition.x:0.00} u · {EtatEntree()}";
            if (avantCliche) yield return Cliche(scenario, "avant", "curseur", Course, nResolutions);
            Regie r = Fige(out float t0);
            A(r, t0);
            int rendusAvant = reglages.RendusEffectues;
            Assert.IsTrue(ProductionClickSupport.Click(ligne.GetComponent<Button>()), "le geste réel : la bascule accepte le clic de production");
            for (float f = Time.realtimeSinceStartup + 20f; reglages.RendusEffectues == rendusAvant && Time.realtimeSinceStartup < f;) yield return null;
            Assert.Greater(reglages.RendusEffectues, rendusAvant, "le geste a été suivi d'un rendu de ⑲");
            // La piste naît à la réponse du serveur, APRÈS les ticks de l'`Update` à t0 : +1 ms par frame jusqu'à ce que la régie ait écrit le DÉPART (le curseur quitte son arrivée) ; ce tick est « t = 0 » de la course.
            float arrivee = CurseurDe(nomLigne).anchoredPosition.x, tNaissance = t0;
            bool parti = false;
            for (int k = 1; k <= 40 && !parti && course; k++)
            {
                yield return null;
                tNaissance = t0 + 0.001f * k;
                A(r, tNaissance);
                parti = Mathf.Abs(CurseurDe(nomLigne).anchoredPosition.x - arrivee) > 20f;
            }
            if (course) Assert.IsTrue(parti, $"la régie n'a jamais écrit le départ du curseur (arrivée x = {arrivee:0.00})");
            else { yield return null; tNaissance = t0 + 0.001f; A(r, tNaissance); Assert.IsFalse(parti, "Réduit : la course est sautée, le curseur ne part pas"); }
            Noter(scenario, "naissance", "ms après le geste avant l'écriture du départ", ((tNaissance - t0) * 1000f).ToString("0"), "—");
            foreach ((string nom, float d) in new[] { ("t0", 0f), ("t70ms", 0.07f), ("t140ms", 0.15f) })
            {
                A(r, tNaissance + d);
                if (capturer) yield return Cliche(scenario, nom, "curseur", Course, nResolutions);
                else Noter(scenario, nom, "curseur", Course(), "—");
            }
        }

        [UnityTest]
        [Category("CaptureEntreesL1")]
        [Timeout(1500000)]
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

            // ───────────────────────── bandeau.entree : une annonce HOT, 200 ms, descend de 10 u et paraît (t0, 50, 70, 100, 200 ms)
            r = Fige(out t0);
            BandeauEphemere bandeau = BandeauDuShell();
            var rt = (RectTransform)bandeau.transform;
            CanvasGroup g = bandeau.GetComponent<CanvasGroup>();
            float repos = rt.anchoredPosition.y;
            string Bande() => $"y−repos={rt.anchoredPosition.y - repos:0.00} u · alpha={g.alpha:0.000}";
            Noter("bandeau-entree", "avant", "repos y", repos.ToString("0.00"), "—");
            Assert.IsTrue(bandeau.Annoncer(AnnonceDuBandeau.Choisir(false, null, "HOT", null, null), null, 30f), "l'annonce est acceptée");
            yield return null;
            yield return Cliche("bandeau-entree", "t0", "bandeau", Bande);
            A(r, t0 + 0.05f);
            yield return Cliche("bandeau-entree", "t50ms", "bandeau", Bande);
            A(r, t0 + 0.07f);
            yield return Cliche("bandeau-entree", "t70ms", "bandeau", Bande);
            A(r, t0 + 0.10f);
            yield return Cliche("bandeau-entree", "t100ms", "bandeau", Bande);
            A(r, t0 + 0.21f);
            yield return Cliche("bandeau-entree", "t200ms", "bandeau", Bande);
            bandeau.Effacer();
            yield return null;

            // ───────────────────────── bascule.course : ⑲ Réglages, gestes réels, 140 ms, les DEUX sens. Entre le montage de ⑲ et le geste : ≥ 300 ms simulées (F1 du juge).
            yield return MonterReglagesEtCalmer("bascule-course");
            yield return Geste("bascule-course-marche-sens1", "Bascule_Marche", capturer: true, avantCliche: true);
            yield return Geste("bascule-course-marche-sens2", "Bascule_Marche", capturer: true, avantCliche: false);
            if (Ligne("Bascule_Tutoriels") != null)   // l'autre ligne ⑲ : numérique seul (le produit relance-t-il l'entrée sur AUCUN interrupteur ?)
                yield return Geste("bascule-course-tutoriels-sens1", "Bascule_Tutoriels", capturer: false, avantCliche: false);
            else Noter("bascule-course-tutoriels", "—", "ligne Bascule_Tutoriels", "absente (compte neuf : tutoriels non chargés)", "—");

            int attendus = Resolutions.Length * (4 + 5 + 4 + 3);
            int obtenus = Directory.GetFiles(dossier, "*.png").Length;
            Debug.Log($"[ENTREES-L1] FIN — {obtenus} clichés dans {Path.GetFullPath(dossier)}");
            Assert.AreEqual(attendus, obtenus, "shell.entree 4 + bandeau.entree 5 + bascule sens 1 (avant, t0, mi, fin) 4 + bascule sens 2 (t0, mi, fin) 3, par résolution");
        }

        /// <summary>L'état Réduit : le niveau est forcé AVANT le shell (`MouvementReduit.Appliquer` écrase la politique à la création de la régie). Les trois entrées SAUTENT (durée 0) : alpha 1, bandeau au repos, curseur au bout, couleur finale.</summary>
        [UnityTest]
        [Category("CaptureEntreesL1")]
        [Timeout(900000)]
        public IEnumerator Entrees_L1_EtatReduit()
        {
            MouvementReduit.LectureDuSysteme = () => true;
            yield return Ouvrir("reduit");
            Noter("reduit", "ouverture", "MouvementReduit.SystemeLeDemande", MouvementReduit.SystemeLeDemande.ToString(), "—");

            Regie r = Fige(out float t0);
            shell.ActivateTab(AppShell.Tab.Org);
            yield return null;
            A(r, t0 + 0.001f);
            yield return Cliche("reduit-shell-entree", "apres-montage", "alpha ContentSlot", AlphaSlot, 1);

            r = Fige(out t0);
            BandeauEphemere bandeau = BandeauDuShell();
            var rt = (RectTransform)bandeau.transform;
            CanvasGroup g = bandeau.GetComponent<CanvasGroup>();
            float repos = rt.anchoredPosition.y;
            Assert.IsTrue(bandeau.Annoncer(AnnonceDuBandeau.Choisir(false, null, "HOT", null, null), null, 30f), "l'annonce est acceptée");
            yield return null;
            A(r, t0 + 0.001f);
            yield return Cliche("reduit-bandeau-entree", "apres-annonce", "bandeau", () => $"y−repos={rt.anchoredPosition.y - repos:0.00} u · alpha={g.alpha:0.000}", 1);
            bandeau.Effacer();
            yield return null;

            yield return MonterReglagesEtCalmer("reduit-bascule-course");
            yield return Geste("reduit-bascule-course", "Bascule_Marche", capturer: true, avantCliche: true, nResolutions: 1, course: false);
            Assert.AreEqual(6, Directory.GetFiles(dossier, "*.png").Length, "Réduit : shell 1 + bandeau 1 + bascule 4 (avant, t0, 70 ms, 140 ms — tous au bout : la course est sautée)");
        }
    }
}
