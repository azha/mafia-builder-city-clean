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
    // Quand un écran est une LISTE DÉFILANTE dont le contenu déborde À LA RÉSOLUTION DE CAPTURE (mesuré dans le régime de capture, cause 7), une seconde planche `<pas>_bas` le montre défilé jusqu'au bout ; une liste qui ne l'atteint pas rougit le test.
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

        [SetUp] public void SetUp() { echecsNotes.Clear(); urlAvant = CibleDuParcours.Appliquer(System.Environment.GetEnvironmentVariable(VariableCible)); }

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
            trous.Clear();
            // E01-E10 · les dix écrans — un échec s'écrit au journal et le parcours CONTINUE (un écran récalcitrant ne coûte pas les planches suivantes)
            foreach (Ecran e in Ecrans)
                yield return Photographier(e);
            Assert.IsEmpty(trous, "liste(s) qui débordent à la résolution de capture sans que le défilement atteigne leur bout (contenu INATTEIGNABLE) :\n" + string.Join("\n", trous));
            Assert.IsEmpty(echecsNotes, "écran(s) non photographié(s) — un ÉCHEC noté au journal n'est pas un vert :\n" + string.Join("\n", echecsNotes));
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
            if (ecran == null) { Noter("E11", "⑤ Decision Detail", "ÉCHEC : ⑤ non monté", "decision-du-jour/reference-1080x2102.png (cadre 4 de ecrans-brennar-4.html)"); Assert.Fail("⑤ E11 non monté : rien n'a été photographié"); }
            for (int i = 0; i < 10; i++) yield return null;
            ecran.Afficher(new HlCardDto { card_id = "carte-fabriquee", decision_type_key = "AUTONOMY_REPORTS_PENDING", impact_bucket = "moderate", urgency_bucket = "low", structural = false },
                           new StructuralBudgetDto { used = 0, cap_reached = false });
            for (int i = 0; i < 20; i++) yield return null;
            foreach ((int largeur, int hauteur) in Resolutions)
                yield return CaptureSousShell.CapturerLeShell(shell, largeur, hauteur, Path.Combine(dossier, $"E11_DecisionDetail_{largeur}x{hauteur}.png"), false, null);
            Noter("E11", "⑤ Decision Detail", "DecisionDetailScreenController · carte FABRIQUÉE (tactique, portée modérée, urgence faible, jeton libre) — NON servie ; plaque crème F4/F5",
                  "decision-du-jour/reference-1080x2102.png (cadre nominal 4 de ecrans-brennar-4.html ; rapport r1 F4/F5)");
        }

        /// <summary>㊴ LE DOSSIER (E12, f2 08/10 — recapture pour les juges de fin d'écran) : les TROIS vues du cadre 150 (pistes), 151 (acteurs) et 135 (vide), aux deux résolutions. Compte NEUF, le vrai shell,
        /// ㊴ monté en surimpression, puis des corps FABRIQUÉS (`RendrePourTest`, aucun réseau) : un compte neuf n'a ni pistes vivantes ni acteurs, donc les vues pistes et acteurs n'existeraient pas.
        /// La vue est LUE (`Vue`) avant chaque cliché : une vue qui n'est pas celle attendue est un ÉCHEC noté et le test ROUGIT. ⚠️ L'état est DIT au journal : corps FABRIQUÉS (les bandes et les quatre
        /// acteurs de `ForensicScreenPlayModeTests`), la mise en scène de l'écran, pas un état servi.</summary>
        [UnityTest]
        [Category("ClichePlanchesParEcran")]
        [Timeout(600000)]
        public IEnumerator Planche_Dossier_TroisVues_CorpsFabriques()
        {
            yield return Ouvrir();
            shell.MonterLocataireEnSurimpression<MafiaCleanCity.Operational.ForensicScreenController>();
            MafiaCleanCity.Operational.ForensicScreenController ecran = null;
            for (float f = Time.realtimeSinceStartup + 15f; ecran == null && Time.realtimeSinceStartup < f;)
            {
                ecran = shell.ContentSlot.GetComponentInChildren<MafiaCleanCity.Operational.ForensicScreenController>(true);
                yield return null;
            }
            if (ecran == null) { Noter("E12", "㊴ Le dossier", "ÉCHEC : ㊴ non monté", "Tools/juge-visuel/INDEX.md ㊴ (cadres 150, 151, 135 de ecrans-brennar-6.html)"); Assert.Fail("㊴ E12 non monté : rien n'a été photographié"); }
            for (int i = 0; i < 10; i++) yield return null;

            var bandes = new MafiaCleanCity.Operational.GetForensicResponseDto { audit_risk_bucket = "clean", effluent_visibility_bucket = "visible", lifestyle_alarm_bucket = "quiet" };
            var vides = new MafiaCleanCity.Operational.GetForensicResponseDto { audit_risk_bucket = "clean", effluent_visibility_bucket = "clear", lifestyle_alarm_bucket = "quiet" };
            var roster = new[]
            {
                new MafiaCleanCity.Operational.ActeurDto { actorType = "lawyer", status = "steady", actorRef = "4f21aaaa" },
                new MafiaCleanCity.Operational.ActeurDto { actorType = "clerk", status = "nervous", actorRef = "9c07bbbb" },
                new MafiaCleanCity.Operational.ActeurDto { actorType = "clerk", status = "unavailable", actorRef = "1b44cccc" },
                new MafiaCleanCity.Operational.ActeurDto { actorType = "lawyer", status = "gone", actorRef = "7e90dddd" },
            };
            const string ref150 = "Tools/juge-visuel/INDEX.md ㊴ — cadre 150 (pistes) de ecrans-brennar-6.html", ref151 = "Tools/juge-visuel/INDEX.md ㊴ — cadre 151 (acteurs) de ecrans-brennar-6.html",
                         ref135 = "Tools/juge-visuel/INDEX.md ㊴ — cadre 135 (état vide) de ecrans-brennar-6.html";

            // vue PISTES (cadre 150)
            ecran.RendrePourTest(bandes, roster);
            for (int i = 0; i < 20; i++) yield return null;
            if (ecran.Vue != MafiaCleanCity.Operational.VueDossier.Pistes) { Noter("E12", "㊴ Le dossier — pistes", "ÉCHEC : la vue est " + ecran.Vue + ", pas Pistes", ref150); Assert.Fail("㊴ E12 : la vue pistes n'est pas celle montrée"); }
            foreach ((int largeur, int hauteur) in Resolutions)
                yield return CaptureSousShell.CapturerLeShell(shell, largeur, hauteur, Path.Combine(dossier, $"E12_Dossier_Pistes_{largeur}x{hauteur}.png"), false, null);
            Noter("E12", "㊴ Le dossier — pistes", "ForensicScreenController · vue Pistes · corps FABRIQUÉS (audit clean, effluent visible, train de vie quiet ; 4 acteurs) — NON servis", ref150);

            // vue ACTEURS (cadre 151) : la PORTE, bascule locale
            ecran.Basculer();
            for (int i = 0; i < 20; i++) yield return null;
            if (ecran.Vue != MafiaCleanCity.Operational.VueDossier.Acteurs) { Noter("E12", "㊴ Le dossier — acteurs", "ÉCHEC : la vue est " + ecran.Vue + ", pas Acteurs", ref151); Assert.Fail("㊴ E12 : la vue acteurs n'est pas celle montrée"); }
            foreach ((int largeur, int hauteur) in Resolutions)
                yield return CaptureSousShell.CapturerLeShell(shell, largeur, hauteur, Path.Combine(dossier, $"E12_Dossier_Acteurs_{largeur}x{hauteur}.png"), false, null);
            Noter("E12", "㊴ Le dossier — acteurs", "ForensicScreenController · vue Acteurs (après la porte) · mêmes corps FABRIQUÉS : un acteur par statut (steady, nervous, unavailable, gone) — NON servis", ref151);

            // vue VIDE (cadre 135) : effluent clear + roster vide servi
            ecran.RendrePourTest(vides, new MafiaCleanCity.Operational.ActeurDto[0]);
            for (int i = 0; i < 20; i++) yield return null;
            if (ecran.Vue != MafiaCleanCity.Operational.VueDossier.Vide) { Noter("E12", "㊴ Le dossier — vide", "ÉCHEC : la vue est " + ecran.Vue + ", pas Vide", ref135); Assert.Fail("㊴ E12 : la vue vide n'est pas celle montrée"); }
            foreach ((int largeur, int hauteur) in Resolutions)
                yield return CaptureSousShell.CapturerLeShell(shell, largeur, hauteur, Path.Combine(dossier, $"E12_Dossier_Vide_{largeur}x{hauteur}.png"), false, null);
            Noter("E12", "㊴ Le dossier — vide", "ForensicScreenController · vue Vide · corps FABRIQUÉS (effluent clear, roster vide servi) — NON servis", ref135);
            Assert.IsEmpty(echecsNotes, "vue(s) non photographiée(s) — un ÉCHEC noté au journal n'est pas un vert :\n" + string.Join("\n", echecsNotes));
        }

        /// <summary>④ P1 AVEC DEUX CARTES EN FILE (f2 07/10) : un compte NEUF n'a qu'une carte (ou aucune), donc la ligne de pluriel n'existerait pas. L'Accueil est RE-MONTÉ (Empire) avec une
        /// réponse `session/open` dont la file porte deux cartes FABRIQUÉES (transport témoin) — c'est AU MONTAGE que le shell choisit la bande de la ligne (`AppShell.BandeFileHaute`, cadre 4) —, photographié
        /// aux deux résolutions, et MESURÉ : la colonne « qui » (nom, gravité, raison, pluriel) TIENT-ELLE dans la ligne ? Un débordement est un A : le journal le dit et le test ROUGIT.
        /// ⛔ Garde corrigée (08/10) : elle comparait les RECTS de la colonne et de la ligne — la mise en page CONTRAINT la colonne à la ligne, elle ne pouvait pas déborder (« tient » à tort, nom et pluriel
        ///    effacés sur la planche). Elle compare maintenant la hauteur PRÉFÉRÉE de la colonne à la hauteur DISPONIBLE (ligne − padding vertical), DANS le régime de capture (`avantRendu`, jamais après :
        ///    le canvas est alors rendu à la vue de jeu).
        /// ⚠️ Les cartes sont FABRIQUÉES (une réplique de lieutenant et une carte de la ville) : c'est la mise en page des deux lignes, pas un état servi.</summary>
        [UnityTest]
        [Category("ClichePlanchesParEcran")]
        [Timeout(600000)]
        public IEnumerator Planche_AccueilFile_DeuxCartes_MesureDuDebordement()
        {
            yield return Ouvrir();
            const string Ref = "04-accueil/r2-2026-10-07/reference/cadre-4-la-suite.png ; atelier master 7d88a65 (ligne haute du cadre 4 : 424 → 506, la raison + « Plusieurs attendent encore »)";
            // Deux variantes (décision f2 08/10 soir : la tête et la suite s'ANCRENT sur le haut RÉEL de la ligne — garde d'effet « aucune intersection, raison sur 1 PUIS
            // 2 lignes, aux deux résolutions ») : (1) la suite au-dessus, raison COURTE (les planches d'avant, mêmes noms) ; (2) une carte de tête au-dessus, raison LONGUE.
            const string RaisonCourte = "L’étagère est vide. Sans pyralin, je ne rallume pas.";
            const string RaisonLongue = "L’étagère est vide depuis hier soir, et sans pyralin je ne rallume pas le labo : il me faut une livraison avant la nuit.";
            var debordements = new List<string>();
            // (3) la tête SERVIE AVEC SES DEUX OPTIONS (juge 09/10, F1/F2 : moitié basse de la carte de tête, pavé or) — les clés que le back sert pour cette carte (`autonomy-reports.provider.ts`), raison courte.
            foreach ((string variante, string raison, bool avecTete, bool avecOptions) in new[] { ("", RaisonCourte, false, false), ("_TeteRaisonLongue", RaisonLongue, true, false), ("_TeteDeuxOptions", RaisonCourte, true, true), ("_TeteNonRapports", RaisonCourte, true, true) })
            {
                var cartes = new[]
                {
                    new MafiaCleanCity.Operational.Exceptions.ExceptionCardDto { exception_id = "fab-1", lieutenant_id = "lt-fab", severity_band = "MODERATE",
                        event_descriptor = raison, lieutenant = new MafiaCleanCity.Operational.Exceptions.ExceptionLieutenantDto { name = "Lt. Kane" } },
                    new MafiaCleanCity.Operational.Exceptions.ExceptionCardDto { exception_id = "fab-2", lieutenant_id = "", severity_band = "MILD", event_descriptor = "Il fait chaud en ville" },
                };
                Assert.IsTrue(ExceptionQueuePanelController.LigneHaute(cartes), "précondition : deux cartes ⇒ la ligne haute du cadre 4");
                // ⛔ (créneau du 08/10 nuit, run 5 : ÉCHEC « la file n'est pas montée ») la raison est RENDUE en réplique (« … », `ExceptionBandes.Replique`) :
                //    la comparer au texte BRUT ne réussissait jamais. On compare à la règle MÊME du rendu.
                string raisonRendue = ExceptionQueuePanelController.RaisonDeLaCarte(cartes[0]);
                Assert.IsNotNull(raisonRendue, "précondition : la carte du lieutenant a une raison à rendre");
                // Le RE-MONTAGE avec la file fabriquée : le chemin de A6 (AccueilCanon), sur le vrai shell connecté.
                // ⛔ (créneau du 08/10 soir) la réponse fabriquée part de la VRAIE session (phase, jour, budgets) : seules la tête et la file changent. Une réponse
                //    neuve publiait la phase « — » (F14) sous un bandeau resté à « Aube », et la garde de phase de `CapturerLeShell` rougissait à juste titre.
                SessionOpenDto reelle = shell.LastSessionOpen;
                Assert.IsNotNull(reelle, "précondition : la session du compte neuf est ouverte");
                SessionOpenDto fabriquee = JsonUtility.FromJson<SessionOpenDto>(JsonUtility.ToJson(reelle));
                fabriquee.JourDeFamille = reelle.JourDeFamille;
                fabriquee.JourDeFamilleALOuverture = reelle.JourDeFamilleALOuverture;
                fabriquee.JourDeFamilleServi = reelle.JourDeFamilleServi;
                // la tête FABRIQUÉE est celle de E11 (même carte, NON servie) ; sans tête, « LA SUITE » prend le dessus de la ligne
                // (4) `_TeteNonRapports` (juge-données ④ r2, 09/10) : une carte qui n'est PAS celle des rapports, à 2 options, pour juger F1/F2 contre le cadre 5 — `DAMAGED_BUILDING_REPAIR`, clés servies par le back
                //     (`hl.option.damaged_building.*`) : la branche « Ce qu'on peut faire » + les 2 options (`EstCarteDesRapports` faux). L'état est nommé au journal par le suffixe du fichier.
                bool nonRapports = variante == "_TeteNonRapports";
                fabriquee.hl_card = avecTete ? new HlCardDto { card_id = "carte-fabriquee", decision_type_key = nonRapports ? "DAMAGED_BUILDING_REPAIR" : "AUTONOMY_REPORTS_PENDING", impact_bucket = "moderate", urgency_bucket = nonRapports ? "elevated" : "low", structural = false,
                    options = !avecOptions ? null : nonRapports
                        ? new[] { new DecisionOptionDto { label = "hl.option.damaged_building.repair_via_queue" }, new DecisionOptionDto { label = "hl.option.damaged_building.leave_damaged" } }
                        : new[] { new DecisionOptionDto { label = "hl.option.autonomy_reports.review_now" }, new DecisionOptionDto { label = "hl.option.autonomy_reports.leave_pending" } } } : null;
                fabriquee.queue = cartes;
                shell.TransportDeSessionPourTest = new SessionFabriquee { Reponse = fabriquee };
                // ⛔ (créneau du 08/10 soir) EMPIRE ne ROUVRE l'Accueil que sur la carte SANS RIEN DESSUS (`SurLaCarteSansRienDessus`, geste G1) : après
                //    `Ouvrir()`, l'Accueil de l'ouverture de session est DÉJÀ en surimpression, et toucher EMPIRE remontait la carte seule (journal :
                //    « [CityMap] Loaded », aucune file) — le test notait ÉCHEC et sortait VERT. On le referme d'abord, comme `AccueilCanon.RouvrirParEmpire`.
                while (shell.SurimpressionOuverte) { shell.Depiler(); yield return null; }
                if (shell.MountedTenantType != typeof(CityMapController)) { shell.ActivateTab(AppShell.Tab.Empire); for (int i = 0; i < 5; i++) yield return null; }
                Assert.IsTrue(shell.SurLaCarteSansRienDessus, "précondition : la carte, sans rien dessus — sinon EMPIRE ne rouvre pas l'Accueil");
                ProductionClickSupport.Click(shell.TabBarRoot.Find("Tab_Empire").GetComponent<Button>());
                ExceptionQueuePanelController file = null;
                float fin = Time.realtimeSinceStartup + 20f;
                while (Time.realtimeSinceStartup < fin)
                {
                    file = shell.ContentSlot.GetComponentsInChildren<ExceptionQueuePanelController>(false).LastOrDefault();
                    if (file != null && file.RaisonRendue == raisonRendue && file.transform.GetComponentsInChildren<Transform>(true).Any(t => t.name == "Row_fab-1")) break;
                    yield return null;
                }
                if (file == null || file.RaisonRendue != raisonRendue || !file.transform.GetComponentsInChildren<Transform>(true).Any(t => t.name == "Row_fab-1"))
                {
                    Noter("A01", "④ Accueil — la file" + variante, "ÉCHEC : le panneau de la file n'est pas monté sur l'Accueil (ou sans la carte fabriquée de cette variante)", Ref);
                    Assert.Fail("④ A01 : la file fabriquée n'est pas montée sur l'Accueil rouvert — rien n'a été mesuré (un ÉCHEC noté n'est pas un vert)");
                }
                // Ce qui est AU-DESSUS de la ligne : la tête (variante 2) ou « LA SUITE », qui se lit par le RÉSEAU (`LaSuitePanelController.Charger`) — sans cette
                // attente, la planche 2400 (prise la première) partait avant elle (créneau du 08/10 soir). On attend qu'elle ait LU, quelle que soit sa réponse.
                if (!avecTete)
                {
                    LaSuitePanelController suite = null;
                    float finSuite = Time.realtimeSinceStartup + 20f;
                    while (Time.realtimeSinceStartup < finSuite)
                    {
                        suite = shell.ContentSlot.GetComponentsInChildren<LaSuitePanelController>(false).LastOrDefault();
                        if (suite != null && suite.Lu) break;
                        yield return null;
                    }
                    Assert.IsTrue(suite != null && suite.Lu, "④ A01 : « LA SUITE » n'a pas lu son état en 20 s — la planche ne montrerait pas l'Accueil entier");
                }
                for (int i = 0; i < 5; i++) yield return null;
                foreach ((int largeur, int hauteur) in Resolutions)
                {
                    string mesure = null;
                    bool deborde = false;
                    // `rebatirAccueil` : les quatre panneaux sont rebâtis À LA RÉSOLUTION (sans lui, la ligne de l'Accueil reste à sa hauteur de montage) ; la MESURE est prise ici, dans le régime de capture.
                    yield return CaptureSousShell.CapturerLeShell(shell, largeur, hauteur, Path.Combine(dossier, $"A01_AccueilFile2Cartes{variante}_{largeur}x{hauteur}.png"), true, () =>
                    {
                        file = shell.ContentSlot.GetComponentsInChildren<ExceptionQueuePanelController>(false).LastOrDefault();
                        Canvas.ForceUpdateCanvases();
                        Transform row = file != null ? file.transform.GetComponentsInChildren<Transform>(true).FirstOrDefault(c => c.name == "Row_fab-1") : null;
                        Transform col = row != null ? row.Find("QuiAttend") : null;
                        if (row == null || col == null) { mesure = "ÉCHEC : ligne ou colonne « qui » introuvable"; deborde = true; return; }
                        float bandeH = ((RectTransform)row).rect.height;
                        int padding = row.GetComponent<HorizontalLayoutGroup>().padding.vertical;
                        float disponible = bandeH - padding, voulue = LayoutUtility.GetPreferredHeight((RectTransform)col);
                        deborde = voulue > disponible + 0.5f;
                        TMPro.TextMeshProUGUI r = row.GetComponentsInChildren<TMPro.TextMeshProUGUI>(false).FirstOrDefault(t => t.name == "Raison");
                        int lignesDeRaison = 0;
                        if (r != null) { r.ForceMeshUpdate(); lignesDeRaison = r.textInfo.lineCount; }
                        // L'ANCRAGE : ce qui est au-dessus de la ligne (la tête ou la suite) commence AU-DESSUS de son haut réel — un écart négatif est une intersection (A).
                        Component dessus = avecTete
                            ? (Component)shell.ContentSlot.GetComponentsInChildren<HighestLeverageCardController>(false).LastOrDefault()
                            : shell.ContentSlot.GetComponentsInChildren<LaSuitePanelController>(false).LastOrDefault();
                        if (dessus == null) { mesure = $"ÉCHEC : {(avecTete ? "la carte de tête" : "« LA SUITE »")} introuvable au-dessus de la ligne"; deborde = true; return; }
                        var c4 = new Vector3[4];
                        ((RectTransform)file.transform).GetWorldCorners(c4);
                        float hautLigne = shell.ContentSlot.InverseTransformPoint(c4[1]).y;
                        ((RectTransform)dessus.transform).GetWorldCorners(c4);
                        float basDessus = shell.ContentSlot.InverseTransformPoint(c4[0]).y;
                        float zone = shell.ContentSlot.rect.height - ShellChrome.TopInsetPx - ShellChrome.BottomInsetPx;
                        float ecart = basDessus - hautLigne;
                        bool intersection = ecart < -0.5f;
                        deborde |= intersection;
                        mesure = $"ligne={bandeH:0.#} u · disponible (− padding {padding})={disponible:0.#} u · colonne voulue={voulue:0.#} u · raison=«{file.RaisonRendue}» sur {lignesDeRaison} ligne(s) · pluriel=«{file.PlusieursRendu}» · "
                               + $"{(avecTete ? "tête" : "suite")} au-dessus : écart {ecart:0.#} u ({(zone > 0f ? ecart / zone : 0f):0.0000} de la zone, marge voulue {AppShell.MargeAuDessusDeLaLigne:0.000}) · "
                               + $"{(deborde ? (intersection ? "INTERSECTION (A)" : "DÉBORDE (A)") : "tient")}";
                    });
                    Noter("A01", $"④ file{variante} {largeur}x{hauteur}", mesure ?? "ÉCHEC : aucune mesure prise", Ref);
                    if (deborde || mesure == null) debordements.Add($"{variante} {largeur}x{hauteur} : {mesure}");
                }
            }
            Assert.IsEmpty(debordements, "④ la ligne de file ne tient pas (colonne préférée > disponible) ou ce qui est au-dessus la RECOUPE :\n" + string.Join("\n", debordements));
        }

        /// <summary>Une réponse `session/open` FABRIQUÉE (le re-montage de l'Accueil de A01) — le patron de `AccueilCanonPlayModeTests.TransportTemoin`.</summary>
        private sealed class SessionFabriquee : ITransportDeSession
        {
            public SessionOpenDto Reponse;
            public IEnumerator Fermer(string jeton, System.Action<long, string> echec) { yield break; }
            public IEnumerator Ouvrir(string jeton, System.Action<SessionOpenDto> ok, System.Action<long, string> echec) { ok(Reponse); yield break; }
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
            // F6 (juge d'ensemble r3) : le toast `BandeauEphemere` (canon `hud-brennar.html:82`, top:78px, 5 s) est posé sur le losange du manomètre ; la maquette ne le porte dans aucun des cadres de la série 6
            // et la planche le photographiait sur la SEULE première page (E01) : on l'efface avant chaque cliché, comme une animation se prend à t=0.
            foreach (BandeauEphemere b in UnityEngine.Object.FindObjectsByType<BandeauEphemere>(FindObjectsSortMode.None)) b.Effacer();
            yield return null;
            MonoBehaviour monte = shell.MountedTenantGameObject != null ? shell.MountedTenantGameObject.GetComponent(shell.MountedTenantType) as MonoBehaviour : null;
            if (monte == null) { Noter(e.Pas, e.Nom, "ÉCHEC : aucun locataire monté", e.Reference); yield break; }
            string etat = null;
            yield return Charger(monte, s => etat = s);
            foreach ((int largeur, int hauteur) in Resolutions)
                yield return CaptureSousShell.CapturerLeShell(shell, largeur, hauteur, Path.Combine(dossier, $"{e.Pas}_{Ascii(e.Nom)}_{largeur}x{hauteur}.png"), false, null);
            // cause 7 : une liste dont le contenu déborde est photographiée AUSSI défilée jusqu'au bout.
            // ⛔⛔ MESURÉE DANS LE RÉGIME DE CAPTURE, PAR RÉSOLUTION (instruit le 08/10 : E05 ㉛, E06 ㉝, E10 ㊵ « ContenuDepasse vrai, planches _bas identiques »).
            //    Avant, le débordement était lu APRÈS les deux captures, quand `CapturerLeShell` a rendu le canvas à la VUE DE JEU (1280×960 u) : il décrivait un
            //    autre écran. ㊵ « +59,7 u » = une boîte de chaîne écrasée à 0 et une fenêtre de −2×Px(7) ; ㉛ « +1326 u » = ~40 u à 1920 + l'écart de hauteur de
            //    canvas ; à 1080×2400 et 1080×1920 les trois écrans TENAIENT (planches : aucun ascenseur), des _bas identiques étaient donc JUSTES.
            //    Maintenant : la liste est cherchée et défilée DANS `avantRendu` (après la mise en page de la résolution cible), par son ScrollRect, et l'EFFET est
            //    mesuré (le contenu a-t-il remonté de toute sa course ?) ; une liste qui tient n'a pas de planche _bas ; une liste qui déborde sans atteindre son
            //    bout, ou dont la planche _bas est identique, est un TROU (contenu inatteignable) : le journal le dit et le test rougit en fin de parcours.
            var parResolution = new List<string>();
            foreach ((int largeur, int hauteur) in Resolutions)
            {
                string haut = Path.Combine(dossier, $"{e.Pas}_{Ascii(e.Nom)}_{largeur}x{hauteur}.png"), bas = Path.Combine(dossier, $"{e.Pas}_{Ascii(e.Nom)}_bas_{largeur}x{hauteur}.png");
                ListeDefilante liste = null;
                MafiaCleanCity.CityMap.Tests.ListeDefilantePlayModeTests.Course course = default;
                yield return CaptureSousShell.CapturerLeShell(shell, largeur, hauteur, bas, false, () =>
                {
                    liste = ListeQuiDeborde(shell.ContentSlot);
                    if (liste != null) course = MafiaCleanCity.CityMap.Tests.ListeDefilantePlayModeTests.DefilerJusquAuBout(liste, null);
                });
                if (liste == null)
                {
                    if (File.Exists(bas)) File.Delete(bas);
                    parResolution.Add($"{hauteur} : tout tient (contenu − fenêtre < 12 u, mesuré à {largeur}x{hauteur})");
                    continue;
                }
                bool identiques = File.Exists(haut) && File.Exists(bas) && File.ReadAllBytes(haut).SequenceEqual(File.ReadAllBytes(bas));
                string ou = $"« {Chemin(liste.transform, shell.ContentSlot)} » fenêtre {course.Fenetre:0.#} u, contenu {course.Contenu:0.#} u";
                if (identiques || !course.AtteintLeBout)
                {
                    string detail = $"{ou}, remonté de {course.Remontee:0.#} u sur {course.Attendue:0.#}{(identiques ? ", planche _bas IDENTIQUE" : "")}";
                    trous.Add($"{e.Pas} {e.Nom} {largeur}x{hauteur} : {detail}");
                    parResolution.Add($"{hauteur} : ⚠️ TROU — {detail}");
                }
                else parResolution.Add($"{hauteur} : déborde de {course.Attendue:0.#} u ({ou}), remonté jusqu'au bout — planche _bas prise");
            }
            Noter(e.Pas, e.Nom, $"{shell.MountedTenantType.Name} · {etat} · {string.Join(" · ", parResolution)}", e.Reference);
        }

        /// <summary>Les TROUS du parcours (liste qui déborde dans le régime de capture sans atteindre son bout) : écrits au journal, puis le test rougit une fois toutes les planches prises.</summary>
        private readonly List<string> trous = new List<string>();
        /// <summary>Chaque `Noter` dont l'état commence par « ÉCHEC » (créneau du 08/10 soir : A01 notait ÉCHEC et sortait VERT) — le test qui l'a noté rougit en fin de parcours.</summary>
        private readonly List<string> echecsNotes = new List<string>();

        /// <summary>La liste qui déborde dans la mise en page COURANTE : active, fenêtre de hauteur POSITIVE (une fenêtre écrasée n'est pas une liste qui déborde : ㊵ du 08/10),
        /// course ≥ 12 u. La plus grande course l'emporte (un écran à plusieurs listes : celle qui cache le plus).</summary>
        private static ListeDefilante ListeQuiDeborde(Transform racine) =>
            racine.GetComponentsInChildren<ListeDefilante>(false)
                .Where(l => l.Defilement != null && l.Defilement.content != null)
                .Select(l => (l, f: (l.Defilement.viewport != null ? l.Defilement.viewport : (RectTransform)l.Defilement.transform).rect.height, c: l.Defilement.content.rect.height))
                .Where(x => x.f > 0f && x.c - x.f >= 12f)
                .OrderByDescending(x => x.c - x.f)
                .Select(x => x.l)
                .FirstOrDefault();

        private static string Chemin(Transform t, Transform racine)
        {
            var noms = new List<string>();
            for (Transform p = t; p != null && p != racine; p = p.parent) noms.Insert(0, p.name);
            return string.Join("/", noms);
        }

        private static string Ascii(string nom) =>
            new string(nom.Where(c => c < 128 && char.IsLetterOrDigit(c)).ToArray());

        private static IEnumerator Charger(MonoBehaviour ecran, System.Action<string> etat)
        {
            string[] finis = { "RenduTermine", "QueueLoaded", "DashboardLoaded", "CardLoaded", "IsLoaded", "ReportsLoaded", "RenderedEmptyState", "ProposeAchatTermine" };
            string[] comptes = { "RendusEffectues", "RenderedCardCount" };
            string[] objets = { "LastLoadedReview", "DernierChargement", "DernierChargementProjection" };
            // ⛔ Les écrans à PLUSIEURS chargements (juge groupé du 07/10) : ㊳ rend `DernierChargement` AVANT ses deux autres listes (la planche à 2400 n'était pas dans l'état de celle à 1920), ㉘ n'avait AUCUN
            // drapeau reconnu (attente fixe de 6 s). On attend TOUS ceux que l'écran expose : `RenduTermine` (㊳), `DernierChargementCouriers` ET `DernierChargementProjection` (㉘).
            // ⛔ ㉘ (juge d'ensemble r2, F5-b) : l'état « aucun relais » pose `DerniereErreur` AVANT de rendre l'état vide et AVANT de chercher le geste « acheter un relais » (réseau : `GetDistricts`, puis un `Interior`
            //    par quartier). Le verdict « erreur » rendait la main à cet instant : la planche à 2400 était prise SANS le geste, celle à 1920 AVEC (le réseau avait répondu entre les deux prises). Pour un écran qui
            //    expose `ProposeAchatTermine`, `DerniereErreur` n'est qu'un DIAGNOSTIC (il ne met pas fin à l'attente) et la fin du chargement — geste compris — est attendue ; l'état « aucun relais » n'a ni
            //    courriers ni projection à attendre.
            string[] tousRequis = { "RenduTermine", "DernierChargementCouriers", "DernierChargementProjection", "ProposeAchatTermine" };
            string[] erreurs = { "DerniereErreur", "LastError", "QueueError", "CardError", "AuthError" };
            System.Type t = ecran.GetType();
            if (t.GetProperty("ProposeAchatTermine") != null) erreurs = erreurs.Where(n => n != "DerniereErreur").ToArray();
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
                        if (t.GetProperty(n) != null)
                        {
                            if (n.StartsWith("DernierChargement") && lire("AucunRelais") is bool aucun && aucun) continue;   // ㉘ sans relais : rien à charger
                            object x = lire(n); if (x == null || (x is bool bx && !bx)) manque = true;
                        }
                    foreach (string n in erreurs) if (lire(n) is string e && !string.IsNullOrEmpty(e)) manque = false;
                    if (!manque) break;
                    yield return null;
                }
            if (v != null && lire("EtatVide") is bool vide && vide) v += " · état vide";
            if (v != null && lire("AucunRelais") is bool sansRelais && sansRelais)
                v += " · aucun relais" + (lire("BlocDAchatDeRelais") is int bloc && bloc >= 0 ? " · AVEC le geste d'achat" : " · SANS geste d'achat (aucun bloc libre)");
            for (int i = 0; i < 20; i++) yield return null;
            etat(v ?? "⚠️ NON ABOUTI en 20 s — la planche montre l'écran tel qu'il est à 20 s");
        }

        private void Noter(string pas, string ecran, string etat, string reference)
        {
            File.AppendAllText(journal, $"{pas}\t{ecran}\t{etat}\t{reference}\n");
            if (etat.StartsWith("ÉCHEC")) echecsNotes.Add($"{pas} {ecran} : {etat}");
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
