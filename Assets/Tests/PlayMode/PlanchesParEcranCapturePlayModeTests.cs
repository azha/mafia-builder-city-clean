using System.Collections;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using NUnit.Framework;
using UnityEngine;
using UnityEngine.TestTools;
using UnityEngine.UI;
using MafiaCleanCity.CityMap;
using MafiaCleanCity.Shell;
using MafiaCleanCity.Shell.Tests;
using MafiaCleanCity.Tests;
using Object = UnityEngine.Object;

namespace MafiaCleanCity.Capture.Tests
{
    // PLANCHES PAR ÉCRAN (CLIENT-1, 07/10 ; demandé par f2 pour la RECAPTURE GROUPÉE des causes 3, 4 et 7 du rapport de conformité de CLIENT-3) — sur le modèle de `ClicheParcours` :
    // un compte NEUF (`POST /v1/auth/signup`, jamais le compte de démo ni de capture), le vrai shell, puis les DIX écrans que les causes touchent, chacun photographié aux deux résolutions
    // portrait (1080×2400, le téléphone visé ; 1080×1920, l'art natif) par `CaptureSousShell.CapturerLeShell` (les gardes d'échelle, d'encre et de bandeau y sont celles des autres planches).
    //   ㊳ Journal (PLUS) · ㉞ Carnet (PLUS) · ㉚ Chaîne d'appro (PLUS) · ㉘ Distribution (PLUS) · ㉛ Loi (PLUS) · ㉝ Démolition (PLUS « raser un site ») · ㉓ Boutique (PLUS « la vitrine »)
    //   · ⑭ La semaine (PLUS) · ⑮ Inspections (PLUS) · ㊵ Filière (onglet du dock)
    // L'ÉTAT est celui qu'un compte NEUF montre — VIDE ou NOMINAL selon l'écran — et CHAQUE planche le DIT dans `journal.tsv` (colonne « état » : le verdict de chargement de l'écran, « état vide » quand il
    // l'expose) avec le CADRE DE RÉFÉRENCE correspondant NOMMÉ (colonne « référence » : `Tools/juge-visuel/INDEX.md`, le fichier rendu et le cadre de la maquette). Un écran dont l'état neuf n'est pas celui
    // du cadre ne peut pas être jugé sur la composition de ses rangées : le juge lit la colonne avant de comparer.
    // Quand un écran est une LISTE DÉFILANTE dont le contenu déborde (`ListeDefilante.ContenuDepasse`, cause 7), une seconde planche `<pas>_bas` le montre défilé jusqu'au bout.
    // Sortie : `MAFIA_PLANCHES_SORTIE` si posée, sinon `Logs/planches-par-ecran/<horodatage>/` — JAMAIS dans `Assets/`. Cible : `MAFIA_PARCOURS_BACK_URL` (mêmes gardes, `CibleDuParcours`).
    // ⚠️ Catégorie PROPRE de la famille capture (`ClichePlanchesParEcran`), hors du filtre MafiaCI ; elle se lance nommément, sur la pile dev, et crée un compte à chaque exécution.
    public class PlanchesParEcranCapturePlayModeTests
    {
        private const string MotDePasse = "planches-neuf-pw";
        private const string VariableSortie = "MAFIA_PLANCHES_SORTIE";
        private const string VariableCible = "MAFIA_PARCOURS_BACK_URL";
        private static readonly (int largeur, int hauteur)[] Resolutions = { (1080, 2400), (1080, 1920) };
        private static int callsignSeq;

        /// <summary>Un écran à photographier : son pas, son nom, comment y aller (une entrée du PLUS par son id stable, ou un onglet du dock), et son cadre de référence NOMMÉ.</summary>
        public readonly struct Ecran
        {
            public readonly string Pas, Nom, EntreeDuPlus, Reference;
            public readonly AppShell.Tab? Onglet;
            public Ecran(string pas, string nom, string entree, AppShell.Tab? onglet, string reference) { Pas = pas; Nom = nom; EntreeDuPlus = entree; Onglet = onglet; Reference = reference; }
        }

        public static readonly Ecran[] Ecrans =
        {
            new Ecran("E01", "㊳ Journal", "le_journal_la_rue", null, "screen_c1/reference-1080x2102.png (cadre 125 de ecrans-brennar-6.html) ; vocabulaire : cadre 145"),
            new Ecran("E02", "㉞ Carnet", "les_ordres_du_soir", null, "carnet/reference-1080x2102.png (cadres 85-91 de ecrans-brennar-6.html)"),
            new Ecran("E03", "㉚ Chaîne d'appro", "la_chaine_d_appro", null, "ecran_appro/reference-1080x2102.png (cadres 48-53 de ecrans-brennar-6.html)"),
            new Ecran("E04", "㉘ Distribution", "la_distribution", null, "ecran_distribution/reference-1080x2102.png (cadres 54-58 de ecrans-brennar-6.html)"),
            new Ecran("E05", "㉛ Loi", "la_loi", null, "ecran_loi/reference-1080x2102.png (cadre 67) + reference-avocat-1080x2102.png (cadre 68) — AUCUN cadre « parloir vide »"),
            new Ecran("E06", "㉝ Démolition", "raser_un_site", null, "ecran_demolition/reference-1080x2102.png (cadres 79-84 de ecrans-brennar-6.html)"),
            new Ecran("E07", "㉓ Boutique", "la_vitrine", null, "compte/reference-㉓-1080x2102.png (cadres 98-100 de ecrans-brennar-6.html)"),
            new Ecran("E08", "⑭ La semaine", "la_semaine", null, "compression/reference-1080x2102.png (cadre NOMINAL 25) ; états v4-25..v4-30 (cadres 25-30 de ecrans-brennar-4.html) ; « au calme » = cadre 29"),
            new Ecran("E09", "⑮ Inspections", "les_inspections", null, "police/reference-⑮-1080x2102.png (cadres 31-35 de ecrans-brennar-6.html)"),
            new Ecran("E10", "㊵ Filière", null, AppShell.Tab.Pipeline, "screen_c2/reference-1080x2102.png (cadres 137-142 de ecrans-brennar-6.html)"),
        };

        private GameObject shellGo;
        private AppShell shell;
        private string dossier, journal, urlAvant;

        [SetUp] public void SetUp() { urlAvant = CibleDuParcours.Appliquer(System.Environment.GetEnvironmentVariable(VariableCible)); }

        [TearDown]
        public void TearDown()
        {
            DemoIdentityResolver.SortirModeCapture(GetType().Name);
            if (shell != null && shell.ShellCanvas != null) Object.DestroyImmediate(shell.ShellCanvas.gameObject);
            if (shellGo != null) Object.DestroyImmediate(shellGo);
            shell = null; shellGo = null;
            LogAssert.ignoreFailingMessages = false;
            MafiaCleanCity.I18n.I18nCatalog.Oublier();   // TD-576 : le shell amorce le catalogue, la classe le rend
            CibleDuParcours.Restaurer(urlAvant);
        }

        /// <summary>P0 + P1 : le dossier de sortie, un compte NEUF, le shell ouvert et calme. Commun aux deux tests de la classe.</summary>
        private IEnumerator Ouvrir()
        {
            string sortie = System.Environment.GetEnvironmentVariable(VariableSortie);
            dossier = !string.IsNullOrWhiteSpace(sortie) ? sortie.Trim()
                : Path.Combine("Logs", "planches-par-ecran", System.DateTime.UtcNow.ToString("yyyyMMdd-HHmmss"));
            Directory.CreateDirectory(dossier);
            journal = Path.Combine(dossier, "journal.tsv");
            if (!File.Exists(journal)) File.WriteAllText(journal, "pas\técran\tétat\tréférence\n");
            Debug.Log($"[PLANCHES] planches et journal → {Path.GetFullPath(dossier)}");

            // P0 · inscription d'un compte NEUF (jamais le compte de démo ni le compte de capture gelé)
            var auth = new AuthClient();
            string callsign = SeederSupport.SafeCallsign("planches", ref callsignSeq);
            string errSignup = null;
            yield return auth.SignUp(callsign, MotDePasse, _ => { }, e => errSignup = e);
            Assert.IsNull(errSignup, $"P0 : l'inscription du compte neuf a échoué ({errSignup}) — la pile dev répond-elle ?");
            Noter("P0", "inscription", CibleDuParcours.Bandeau(MafiaCleanCity.AdresseDuBack.Url) + $"compte neuf {DemoIdentityResolver.Empreinte(callsign)} · back visé {MafiaCleanCity.AdresseDuBack.Url}", "—");

            // P1 · le shell, posé comme à l'ouverture de session
            LogAssert.ignoreFailingMessages = true;
            shellGo = new GameObject("PlanchesShell");
            shell = shellGo.AddComponent<AppShell>();
            shell.SetIdentity(callsign, MotDePasse);   // AVANT Start()
            float fin = Time.realtimeSinceStartup + 45f;
            while (string.IsNullOrEmpty(shell.Token) && Time.realtimeSinceStartup < fin) yield return null;
            Assert.IsFalse(string.IsNullOrEmpty(shell.Token), "P1 : le shell n'a pas ouvert de session avec le compte neuf");
            yield return CaptureSousShell.ShellConnecteOuEchoue(shell, callsign, "cliche_planches_par_ecran");
            var echecs = new List<string>();
            yield return CaptureSousShell.AttendreUnShellCalme(shell, echecs);
            Assert.IsEmpty(echecs, "P1 : " + string.Join(" · ", echecs));
        }

        [UnityTest]
        [Category("ClichePlanchesParEcran")]
        [Timeout(900000)]
        public IEnumerator Planches_DesDixEcrans_CompteNeuf_DeuxResolutions()
        {
            yield return Ouvrir();
            // E01-E10 · les dix écrans — un échec s'écrit au journal et le parcours CONTINUE (un écran récalcitrant ne coûte pas les planches suivantes)
            foreach (Ecran e in Ecrans)
                yield return Photographier(e);
        }

        /// <summary>⑤ « la décision du jour » (F4/F5, plaque crème) : compte NEUF, le shell, ⑤ monté en surimpression, une carte FABRIQUÉE (`Afficher`) — le compte neuf n'a pas de carte de tête servie et la capture
        /// gelée exige la paire de capture. ⚠️ L'état est DIT au journal : la carte n'est PAS servie, c'est la mise en scène de la matière et du CTA, pas la balance du jeu.</summary>
        [UnityTest]
        [Category("ClichePlanchesParEcran")]
        [Timeout(600000)]
        public IEnumerator Planche_DecisionDetail_PlaqueCreme_CarteFabriquee()
        {
            yield return Ouvrir();
            shell.MonterLocataireEnSurimpression<DecisionDetailScreenController>();
            DecisionDetailScreenController ecran = null;
            for (float f = Time.realtimeSinceStartup + 15f; ecran == null && Time.realtimeSinceStartup < f;)
            {
                ecran = shell.ContentSlot.GetComponentInChildren<DecisionDetailScreenController>(true);
                yield return null;
            }
            if (ecran == null) { Noter("E11", "⑤ Decision Detail", "ÉCHEC : ⑤ non monté", "decision-du-jour/reference-1080x2102.png (cadre 4 de ecrans-brennar-4.html)"); yield break; }
            for (int i = 0; i < 10; i++) yield return null;
            ecran.Afficher(new HlCardDto { card_id = "carte-fabriquee", decision_type_key = "AUTONOMY_REPORTS_PENDING", impact_bucket = "moderate", urgency_bucket = "low", structural = false },
                           new StructuralBudgetDto { used = 0, cap_reached = false });
            for (int i = 0; i < 20; i++) yield return null;
            foreach ((int largeur, int hauteur) in Resolutions)
                yield return CaptureSousShell.CapturerLeShell(shell, largeur, hauteur, Path.Combine(dossier, $"E11_DecisionDetail_{largeur}x{hauteur}.png"), false, null);
            Noter("E11", "⑤ Decision Detail", "DecisionDetailScreenController · carte FABRIQUÉE (tactique, portée modérée, urgence faible, jeton libre) — NON servie ; plaque crème F4/F5",
                  "decision-du-jour/reference-1080x2102.png (cadre nominal 4 de ecrans-brennar-4.html ; rapport r1 F4/F5)");
        }

        /// <summary>④ P1 AVEC DEUX CARTES EN FILE (f2 07/10) : un compte NEUF n'a qu'une carte (ou aucune), donc la ligne de pluriel n'existerait pas. Le shell ouvert, la ligne de l'Accueil est RÉ-ALIMENTÉE par deux cartes FABRIQUÉES
        /// (`SetQueue`), photographiée aux deux résolutions, et MESURÉE : la colonne « qui » (nom, gravité, raison, pluriel) tient-elle dans la ligne ? Un débordement est un A (le journal le dit : DÉBORDE).
        /// ⚠️ Les cartes sont FABRIQUÉES (une réplique de lieutenant et une carte de la ville) : c'est la mise en page des deux lignes, pas un état servi.</summary>
        [UnityTest]
        [Category("ClichePlanchesParEcran")]
        [Timeout(600000)]
        public IEnumerator Planche_AccueilFile_DeuxCartes_MesureDuDebordement()
        {
            yield return Ouvrir();
            ExceptionQueuePanelController file = null;
            for (float f = Time.realtimeSinceStartup + 20f; file == null && Time.realtimeSinceStartup < f;)
            {
                file = shell.ContentSlot.GetComponentInChildren<ExceptionQueuePanelController>(true);
                yield return null;
            }
            const string Ref = "04-accueil/r2-2026-10-07/reference/cadre-4-la-suite.png ; atelier master 0dd516e (la raison + « Plusieurs attendent encore »)";
            if (file == null) { Noter("A01", "④ Accueil — la file", "ÉCHEC : le panneau de la file n'est pas monté sur l'Accueil", Ref); yield break; }
            var cartes = new[]
            {
                new MafiaCleanCity.Operational.Exceptions.ExceptionCardDto { exception_id = "fab-1", lieutenant_id = "lt-fab", severity_band = "MODERATE",
                    event_descriptor = "L’étagère est vide. Sans pyralin, je ne rallume pas.", lieutenant = new MafiaCleanCity.Operational.Exceptions.ExceptionLieutenantDto { name = "Lt. Kane" } },
                new MafiaCleanCity.Operational.Exceptions.ExceptionCardDto { exception_id = "fab-2", lieutenant_id = "", severity_band = "MILD", event_descriptor = "Il fait chaud en ville" },
            };
            foreach ((int largeur, int hauteur) in Resolutions)
            {
                // `rebatirAccueil` : les quatre panneaux sont rebâtis À LA RÉSOLUTION (sans lui, la ligne de l'Accueil reste à sa hauteur de montage : 40 u) ; la file est ALORS ré-alimentée (le rebâtissage la recrée)
                yield return CaptureSousShell.CapturerLeShell(shell, largeur, hauteur, Path.Combine(dossier, $"A01_AccueilFile2Cartes_{largeur}x{hauteur}.png"), true, () =>
                {
                    file = shell.ContentSlot.GetComponentInChildren<ExceptionQueuePanelController>(true);
                    file?.SetQueue(shell.Token, cartes);
                });
                Transform row = null;
                if (file != null) foreach (Transform c in file.transform.GetComponentsInChildren<Transform>(true)) if (c.name == "Row_fab-1") { row = c; break; }
                Transform col = row != null ? row.Find("QuiAttend") : null;
                if (row == null || col == null) { Noter("A01", $"④ file {largeur}x{hauteur}", "ÉCHEC : ligne ou colonne « qui » introuvable", Ref); continue; }
                float bandeH = ((RectTransform)row).rect.height, voulue = LayoutUtility.GetPreferredHeight((RectTransform)col);
                var coins = new Vector3[4]; ((RectTransform)row).GetWorldCorners(coins); float basLigne = coins[0].y, hautLigne = coins[1].y;
                ((RectTransform)col).GetWorldCorners(coins); float basColonne = coins[0].y, hautColonne = coins[1].y;
                bool deborde = basColonne < basLigne - 0.5f || hautColonne > hautLigne + 0.5f;
                Noter("A01", $"④ file {largeur}x{hauteur}",
                    $"ligne={bandeH:0.#} u · colonne voulue={voulue:0.#} u · bas colonne−bas ligne={basColonne - basLigne:0.#} u · haut colonne−haut ligne={hautColonne - hautLigne:0.#} u · raison=«{file.RaisonRendue}» · pluriel=«{file.PlusieursRendu}» · {(deborde ? "DÉBORDE (A)" : "tient")}", Ref);
            }
        }

        private IEnumerator Photographier(Ecran e)
        {
            if (e.Onglet.HasValue) shell.ActivateTab(e.Onglet.Value);
            else
            {
                shell.ActivateTab(AppShell.Tab.More);
                for (int i = 0; i < 5; i++) yield return null;
                Button entree = Descendant(shell.ContentSlot, "MenuPlus_" + e.EntreeDuPlus)?.GetComponent<Button>();
                if (entree == null) { Noter(e.Pas, e.Nom, $"ÉCHEC : entrée « MenuPlus_{e.EntreeDuPlus} » introuvable", e.Reference); yield break; }
                if (!ProductionClickSupport.Click(entree)) { Noter(e.Pas, e.Nom, "ÉCHEC : l'entrée refuse le clic de production", e.Reference); yield break; }
            }
            for (int i = 0; i < 12; i++) yield return null;
            MonoBehaviour monte = shell.MountedTenantGameObject != null ? shell.MountedTenantGameObject.GetComponent(shell.MountedTenantType) as MonoBehaviour : null;
            if (monte == null) { Noter(e.Pas, e.Nom, "ÉCHEC : aucun locataire monté", e.Reference); yield break; }
            string etat = null;
            yield return Charger(monte, s => etat = s);
            foreach ((int largeur, int hauteur) in Resolutions)
                yield return CaptureSousShell.CapturerLeShell(shell, largeur, hauteur, Path.Combine(dossier, $"{e.Pas}_{Ascii(e.Nom)}_{largeur}x{hauteur}.png"), false, null);
            // cause 7 : une liste dont le contenu déborde est photographiée AUSSI défilée jusqu'au bout.
            // ⛔ Détection corrigée (juge groupé du 07/10 : sur ㉝ les planches `_bas` étaient identiques au bit près aux hautes alors que `ContenuDepasse` disait vrai) : on exige un débordement MESURÉ
            // (contenu − fenêtre ≥ 12 u), et APRÈS la planche basse on compare les octets des deux PNG — identiques ⇒ le journal le DIT, il ne prétend pas que la liste défile.
            ListeDefilante deborde = shell.ContentSlot.GetComponentsInChildren<ListeDefilante>(false)
                .FirstOrDefault(l => l.ContenuDepasse && l.Defilement != null && l.Defilement.content != null && l.Defilement.viewport != null
                                     && l.Defilement.content.rect.height - l.Defilement.viewport.rect.height >= 12f);
            string defil = "aucune liste ne déborde (mesure : contenu − fenêtre < 12 u)";
            if (deborde != null)
            {
                float excedent = deborde.Defilement.content.rect.height - deborde.Defilement.viewport.rect.height;
                int identiques = 0;
                foreach ((int largeur, int hauteur) in Resolutions)
                {
                    string haut = Path.Combine(dossier, $"{e.Pas}_{Ascii(e.Nom)}_{largeur}x{hauteur}.png"), bas = Path.Combine(dossier, $"{e.Pas}_{Ascii(e.Nom)}_bas_{largeur}x{hauteur}.png");
                    yield return CaptureSousShell.CapturerLeShell(shell, largeur, hauteur, bas, false,
                        () => { deborde.Defilement.verticalNormalizedPosition = 0f; deborde.Rafraichir(); });
                    if (File.Exists(haut) && File.Exists(bas) && File.ReadAllBytes(haut).SequenceEqual(File.ReadAllBytes(bas))) identiques++;
                }
                defil = identiques == 0 ? $"liste défilante : le contenu DÉBORDE de {excedent:0.#} u — planche _bas prise"
                    : $"⚠️ ContenuDepasse vrai (+{excedent:0.#} u) mais {identiques}/2 planches _bas IDENTIQUES aux hautes : le défilement ne déplace rien — à instruire";
            }
            Noter(e.Pas, e.Nom, $"{shell.MountedTenantType.Name} · {etat} · {defil}", e.Reference);
        }

        private static string Ascii(string nom) =>
            new string(nom.Where(c => c < 128 && char.IsLetterOrDigit(c)).ToArray());

        private static IEnumerator Charger(MonoBehaviour ecran, System.Action<string> etat)
        {
            string[] finis = { "RenduTermine", "QueueLoaded", "DashboardLoaded", "CardLoaded", "IsLoaded", "ReportsLoaded", "RenderedEmptyState" };
            string[] comptes = { "RendusEffectues", "RenderedCardCount" };
            string[] objets = { "LastLoadedReview", "DernierChargement", "DernierChargementProjection" };
            // ⛔ Les écrans à PLUSIEURS chargements (juge groupé du 07/10) : ㊳ rend `DernierChargement` AVANT ses deux autres listes (la planche à 2400 n'était pas dans l'état de celle à 1920), ㉘ n'avait AUCUN
            // drapeau reconnu (attente fixe de 6 s). On attend TOUS ceux que l'écran expose : `RenduTermine` (㊳), `DernierChargementCouriers` ET `DernierChargementProjection` (㉘).
            string[] tousRequis = { "RenduTermine", "DernierChargementCouriers", "DernierChargementProjection" };
            string[] erreurs = { "DerniereErreur", "LastError", "QueueError", "CardError", "AuthError" };
            System.Type t = ecran.GetType();
            System.Func<string, object> lire = n => { var p = t.GetProperty(n); try { return p?.GetValue(ecran); } catch { return null; } };
            bool connu = finis.Concat(comptes).Concat(objets).Any(n => t.GetProperty(n) != null);
            if (!connu)
            {
                for (float f = Time.realtimeSinceStartup + 6f; Time.realtimeSinceStartup < f;) yield return null;
                etat("attente fixe de 6 s (l'écran n'expose aucun drapeau de chargement)");
                yield break;
            }
            string Verdict()
            {
                foreach (string n in erreurs) if (lire(n) is string e && !string.IsNullOrEmpty(e)) return $"erreur {n}=«{e}»";
                foreach (string n in finis) if (lire(n) is bool b && b) return $"chargé ({n})";
                foreach (string n in comptes) if (lire(n) is int k && k > 0) return $"rendu ({n}={k})";
                foreach (string n in objets) if (lire(n) != null) return $"chargé ({n})";
                return null;
            }
            string v = null;
            for (float f = Time.realtimeSinceStartup + 20f; v == null && Time.realtimeSinceStartup < f;) { v = Verdict(); yield return null; }
            if (v != null && !v.StartsWith("erreur"))
                for (float f = Time.realtimeSinceStartup + 20f; Time.realtimeSinceStartup < f;)
                {
                    bool manque = false;
                    foreach (string n in tousRequis)
                        if (t.GetProperty(n) != null) { object x = lire(n); if (x == null || (x is bool bx && !bx)) manque = true; }
                    foreach (string n in erreurs) if (lire(n) is string e && !string.IsNullOrEmpty(e)) manque = false;
                    if (!manque) break;
                    yield return null;
                }
            if (v != null && lire("EtatVide") is bool vide && vide) v += " · état vide";
            for (int i = 0; i < 20; i++) yield return null;
            etat(v ?? "⚠️ NON ABOUTI en 20 s — la planche montre l'écran tel qu'il est à 20 s");
        }

        private void Noter(string pas, string ecran, string etat, string reference)
        {
            File.AppendAllText(journal, $"{pas}\t{ecran}\t{etat}\t{reference}\n");
            Debug.Log($"[PLANCHES] {pas} · {ecran} · {etat}");
        }

        private static Transform Descendant(Transform racine, string nom)
        {
            foreach (Transform t in racine.GetComponentsInChildren<Transform>(true)) if (t.name == nom) return t;
            return null;
        }
    }

    /// <summary>La TABLE des écrans de `PlanchesParEcran` : dix écrans, chacun avec son pas, un moyen d'y aller et un cadre de référence NOMMÉ. Pure, hors réseau.</summary>
    public class PlanchesParEcranTableTests
    {
        [Test, Category("ClichePlanchesParEcran")]
        public void T1_DixEcrans_ChacunSonCadreDeReference_PasUnique_UnSeulMoyenDAller()
        {
            var e = PlanchesParEcranCapturePlayModeTests.Ecrans;
            Assert.AreEqual(10, e.Length);
            Assert.AreEqual(10, e.Select(x => x.Pas).Distinct().Count(), "pas uniques");
            Assert.AreEqual(10, e.Select(x => x.Nom).Distinct().Count());
            foreach (var x in e)
            {
                Assert.IsFalse(string.IsNullOrWhiteSpace(x.Reference), x.Nom + " : le cadre de référence est NOMMÉ");
                Assert.AreNotEqual(string.IsNullOrEmpty(x.EntreeDuPlus), x.Onglet == null ? true : false, x.Nom + " : exactement un moyen d'y aller (entrée du PLUS ou onglet)");
            }
        }
    }
}
