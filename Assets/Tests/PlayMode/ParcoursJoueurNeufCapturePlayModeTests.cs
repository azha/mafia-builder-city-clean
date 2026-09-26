using System.Collections;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using NUnit.Framework;
using UnityEngine;
using UnityEngine.TestTools;
using UnityEngine.UI;
using MafiaCleanCity.CityMap;
using MafiaCleanCity.Operational;
using MafiaCleanCity.Shell;
using MafiaCleanCity.Shell.Tests;
using MafiaCleanCity.Tests;
using Object = UnityEngine.Object;

namespace MafiaCleanCity.Capture.Tests
{
    // CLICHÉ DU PARCOURS D'UN JOUEUR NEUF (passe UX 2026-09-24, phase 2 ; demandé par l'orchestrateur le 2026-09-26) — le chemin
    // qu'un joueur fait en ouvrant l'app pour la première fois, dans le VRAI client, photographié à chaque pas aux deux résolutions
    // portrait (1080×2400, le téléphone visé ; 1080×1920, l'art natif) :
    //   P0  inscription  — un compte NEUF par `POST /v1/auth/signup` ; jamais le compte de démo ni le compte de capture gelé, qui
    //                      sont des comptes RICHES : la phase 1 a mesuré sur le serveur ce que vit un joueur neuf, et aucune planche
    //                      du dépôt ne le montre (`RAPPORT.md` §8 de la passe : « aucune capture en jeu d'état vide n'existe »)
    //   P1  lancement    — l'Accueil ④ sur la carte ③, tel que le shell le pose à l'ouverture de session
    //   P2  carte        — le toucher de l'onglet EMPIRE (③ seule)
    //   P3  district     — « Entrer » dans le district du KIT, lu dans `me/buildings` (jamais un numéro supposé)
    //   P4  bâtiment     — le toucher d'un bâtiment du kit (le labo d'abord : la cuisson est le premier maillon de la boucle) ⇒ la fiche
    //   P5  fiche ②      — le toucher de la TÊTE de la fiche (B1, 3fc84fbf), le seul chemin du kit vers la cuisson
    // Ajouts demandés par la session UX (f1, 26/09 ; ids du RAPPORT.md §4 de la passe), SOUPLES : un échec s'écrit au journal et le
    // parcours continue — un écran récalcitrant ne coûte pas les planches suivantes (les gardes de rendu, elles, restent dures) :
    //   A1-A4  tant que l'Accueil est là (G1) : « Voir l'ardoise » → ⑨ ; la carte d'accueil → ⑩ (C1) ; « Prendre acte » → ce qui
    //          reste à l'écran (l'Accueil revient-il ?) ; « Les télégrammes » → ㉔ s'il est encore joignable
    //   B1     dans ② : le geste du pupitre. « Allumer le feu » est touché s'il est offert (le back refuse sans stock : B2) ;
    //          « Commander » ne l'est JAMAIS (il dépense, et changerait le compte que les planches suivantes montrent)
    //   F1-F2  onglets FAMILLE ⑥ et FILIÈRE ㊵ · M0 menu PLUS ⑱, en haut puis défilé en bas (G5)
    //   M1-M7  depuis PLUS : ㊳ Journal (C2), ㉞ Carnet (C8), ⑰ Commissariat (C5), ㉕ La première fois (C10), ㉚ Chaîne d'appro,
    //          ⑯ Revue du jour, ㉓ boutique
    //   (6)    au journal de P1 et P3 : JOUR, phase du bandeau et phase servie du district (C4)
    // « Recruter » n'est PAS joué : il brûlerait la seule décision de structure de la session (C9).
    // Chaque pas écrit une ligne dans `journal.tsv` (ce qui a été VU : chargé, compté, nommé) ; les planches et le journal vont dans
    // `MAFIA_PARCOURS_SORTIE` si elle est posée, sinon dans `Logs/cliche-parcours/<horodatage>/` — JAMAIS dans `Assets/` : ces images
    // sont une preuve pour la passe UX, pas des planches du dépôt, et un PNG neuf sous `Assets/` y ferait naître un `.meta`.
    //
    // ⛔ L'IDENTITÉ. Le compte est créé PAR CE TEST (classe C de la garde `DemoIdentityResolverGuardPlayModeTests` : compte frais,
    // jetable) et posé sur le shell AVANT son `Start()` — un appel explicite bat toute variable d'environnement (précédence de
    // `DemoIdentityResolver`, rang 1). La paire `MAFIA_CAPTURE_*` n'est donc NI exigée NI lue : elle désigne le compte gelé, et la
    // photographier ici serait le défaut que ce test existe pour éviter. La garde d'EFFET reste, elle, la même que partout
    // (`CaptureSousShell.ShellConnecteOuEchoue`, `GET /v1/me` avec le jeton réellement utilisé) — AVANT toute planche.
    // ⚠️ Aucun journal n'imprime l'indicatif : son empreinte seulement (`DemoIdentityResolver.Empreinte`, règle 9d12ab3b).
    //
    // ⛔ LE RENDU. Toutes les planches passent par `CaptureSousShell.CapturerLeShell` (le shell ENTIER, chrome compris, avec les
    // gardes d'échelle, d'encre et de bandeau des planches de `VuePrincipaleCapturePlayModeTests`) — une garde recopiée n'est pas
    // une garde partagée.
    //
    // ⚠️ Catégorie PROPRE, seule, de la famille capture (`ClicheParcours` : ni contenue dans une autre ni en contenant une — K0 de
    // `CategoriesDeCapturePlayModeTests`, balayé sur les 108 catégories du dépôt). Hors du filtre MafiaCI, comme toute capture :
    // elle se lance nommément, sur la pile dev, et crée un compte à chaque exécution.
    public class ParcoursJoueurNeufCapturePlayModeTests
    {
        private const string MotDePasse = "parcours-neuf-pw";
        private const string VariableSortie = "MAFIA_PARCOURS_SORTIE";
        /// <summary>f1/f2 (26/09) — la cible du parcours. Posée (ex. l'URL du VPS) : l'inscription ET le shell visent cette adresse
        /// (`AdresseDuBack.PoserPourTest` au SetUp, AVANT tout client : `AuthClient` lit l'adresse à sa construction). Absente : rien ne
        /// change (pile dev, `AdresseDuBack.Url`). ⚠️ Contre un serveur distant, chaque run y crée un compte NEUF — voulu (c'est ce que
        /// voit un joueur sur son téléphone) ; jamais le compte de démo ni le compte de capture.</summary>
        private const string VariableCible = "MAFIA_PARCOURS_BACK_URL";

        private string urlAvant;

        [SetUp]
        public void SetUp()
        {
            // gardes (f2 26/09) : la cible est VALIDÉE avant toute pose — donc avant tout `new AuthClient()` ; l'adresse d'avant est
            // retenue pour être RESTAURÉE (pas seulement effacée) au TearDown
            urlAvant = CibleDuParcours.Appliquer(System.Environment.GetEnvironmentVariable(VariableCible));
        }
        private static readonly (int largeur, int hauteur)[] Resolutions = { (1080, 2400), (1080, 1920) };
        private static int callsignSeq;

        private GameObject shellGo;
        private AppShell shell;
        private string dossier;
        private string journal;

        [TearDown]
        public void TearDown()
        {
            DemoIdentityResolver.SortirModeCapture(GetType().Name);   // jamais posé ici ; levé quand même, comme toute classe de capture
            if (shell != null && shell.ShellCanvas != null) Object.DestroyImmediate(shell.ShellCanvas.gameObject);
            if (shellGo != null) Object.DestroyImmediate(shellGo);
            shell = null; shellGo = null;
            LogAssert.ignoreFailingMessages = false;
            MafiaCleanCity.I18n.I18nCatalog.Oublier();   // TD-576 : le shell amorce le catalogue, la classe le rend
            CibleDuParcours.Restaurer(urlAvant);            // la cible posée par MAFIA_PARCOURS_BACK_URL ne survit pas au test
        }

        [UnityTest]
        [Category("ClicheParcours")]
        public IEnumerator Parcours_JoueurNeuf_Inscription_Carte_District_Batiment_FicheOperationnelle()
        {
            string sortie = System.Environment.GetEnvironmentVariable(VariableSortie);
            dossier = !string.IsNullOrWhiteSpace(sortie)
                ? sortie.Trim()
                : Path.Combine("Logs", "cliche-parcours", System.DateTime.UtcNow.ToString("yyyyMMdd-HHmmss"));
            Directory.CreateDirectory(dossier);
            journal = Path.Combine(dossier, "journal.tsv");
            File.WriteAllText(journal, "pas\tgeste\tvu\n");
            Debug.Log($"[PARCOURS] planches et journal → {Path.GetFullPath(dossier)}");

            // ── P0 · inscription ────────────────────────────────────────────────────────────────────────────────────────────────
            var auth = new AuthClient();   // `AdresseDuBack.Url` : la même source que le shell
            string callsign = SeederSupport.SafeCallsign("parcours", ref callsignSeq);
            string errSignup = null;
            yield return auth.SignUp(callsign, MotDePasse, _ => { }, e => errSignup = e);
            Assert.IsNull(errSignup, $"P0 : l'inscription du compte neuf a échoué ({errSignup}) — la pile dev répond-elle ?");
            // garde (c) : un compte créé AILLEURS qu'en local se DIT en tête — l'hôte EFFECTIVEMENT visé (lu dans AdresseDuBack.Url après la
            // pose), jamais la variable brute ; l'identité du compte par son EMPREINTE seulement
            Noter("P0", "inscription", CibleDuParcours.Bandeau(MafiaCleanCity.AdresseDuBack.Url)
                + $"compte neuf {DemoIdentityResolver.Empreinte(callsign)} · back visé {MafiaCleanCity.AdresseDuBack.Url}");

            // ── P1 · lancement ──────────────────────────────────────────────────────────────────────────────────────────────────
            LogAssert.ignoreFailingMessages = true;   // le shell journalise ses replis réseau ; ce test juge ce qu'il VOIT
            shellGo = new GameObject("ParcoursShell");
            shell = shellGo.AddComponent<AppShell>();
            shell.SetIdentity(callsign, MotDePasse);   // AVANT Start() — même frame que AddComponent
            float fin = Time.realtimeSinceStartup + 45f;
            while (string.IsNullOrEmpty(shell.Token) && Time.realtimeSinceStartup < fin) yield return null;
            Assert.IsFalse(string.IsNullOrEmpty(shell.Token), "P1 : le shell n'a pas ouvert de session avec le compte neuf");
            yield return CaptureSousShell.ShellConnecteOuEchoue(shell, callsign, "cliche_parcours");

            var echecs = new List<string>();
            yield return CaptureSousShell.AttendreUnShellCalme(shell, echecs);
            Assert.IsEmpty(echecs, "P1 : " + string.Join(" · ", echecs));
            DashboardController accueil = shell.ContentSlot.GetComponentInChildren<DashboardController>(true);
            Assert.IsNotNull(accueil, "P1 : l'Accueil n'est pas posé au lancement — la planche montrerait autre chose que l'ouverture");
            fin = Time.realtimeSinceStartup + 30f;
            while (!accueil.DashboardLoaded && Time.realtimeSinceStartup < fin) yield return null;
            Assert.IsTrue(accueil.DashboardLoaded, "P1 : l'Accueil n'a pas chargé — la planche montrerait un écran vide qui a l'air fini");
            // f1 26/09 (run VPS) : la planche P1 à 2400 était prise AVANT que LA SUITE soit lue (8 requêtes contre un back distant) — on
            // attend une CONDITION : la suite lue (montrée ou vide assumé), ou pas de suite du tout (carte de tête). Le délai mesuré entre
            // au journal : c'est aussi le temps pendant lequel le joueur voit un Accueil sans guide.
            float t0Suite = Time.realtimeSinceStartup;
            MafiaCleanCity.Shell.LaSuitePanelController suite = null;
            fin = Time.realtimeSinceStartup + 30f;
            while (Time.realtimeSinceStartup < fin)
            {
                suite = shell.ContentSlot.GetComponentsInChildren<MafiaCleanCity.Shell.LaSuitePanelController>(true).LastOrDefault();
                if (suite == null || suite.Lu) break;
                yield return null;
            }
            string etatSuite = suite == null ? "sans suite (carte de tête)"
                : !suite.Lu ? "ÉCHEC : la suite n'a pas été lue en 30 s"
                : $"la suite lue en {(Time.realtimeSinceStartup - t0Suite) * 1000f:F0} ms après l'Accueil chargé · {suite.LignesRendues.Count} ligne(s)";
            yield return Photographier("p1_lancement", rebatirAccueil: true);
            Noter("P1", "lancement", $"Accueil chargé · {etatSuite} · bandeau {Bandeau()}");
            yield return DepuisLAccueil(accueil);

            // ── P2 · carte ──────────────────────────────────────────────────────────────────────────────────────────────────────
            shell.ActivateTab(AppShell.Tab.Empire);   // le toucher de l'onglet EMPIRE
            yield return null;                        // l'ancien locataire part en différé (voir `Capture_CarteDeVille_SousChromeV31`)
            CityMapController carte = null;
            fin = Time.realtimeSinceStartup + 20f;
            while (carte == null && Time.realtimeSinceStartup < fin)
            {
                carte = shell.ContentSlot.GetComponentInChildren<CityMapController>(true);
                yield return null;
            }
            Assert.IsNotNull(carte, "P2 : la carte n'est pas montée par l'onglet EMPIRE");
            fin = Time.realtimeSinceStartup + 30f;
            while (!carte.IsLoaded && Time.realtimeSinceStartup < fin) yield return null;
            Assert.IsTrue(carte.IsLoaded, "P2 : la carte n'a pas chargé ses districts");
            Transform racineCarte = shell.ContentSlot.Find("CityMapRoot");
            Assert.IsNotNull(racineCarte, "P2 : la carte monte son `CityMapRoot` dans le slot de contenu du shell");
            int noeuds = racineCarte.GetComponentsInChildren<Transform>(true).Length;
            Assert.Greater(noeuds, 20, $"P2 : la carte n'a rien construit ({noeuds} nœuds)");
            for (int i = 0; i < 30; i++) yield return null;
            yield return Photographier("p2_carte");
            Noter("P2", "onglet EMPIRE", $"carte chargée · {noeuds} nœuds");

            // ── P3 · district du kit ────────────────────────────────────────────────────────────────────────────────────────────
            BatimentPossedeDto[] possedes = null; string errBatiments = null;
            yield return new MesBatimentsClient().Lire(shell.Token, b => possedes = b, (c, m) => errBatiments = $"{c} {m}");
            Assert.IsNull(errBatiments, $"P3 : `me/buildings` n'a pas répondu ({errBatiments})");
            Assert.IsNotNull(possedes, "P3 : `me/buildings` sans corps");
            Assert.IsNotEmpty(possedes, "P3 : le compte neuf ne possède aucun bâtiment — le kit de départ n'a pas été octroyé");
            BatimentPossedeDto vise = PremierParType(possedes, b => b.operational_type);
            Noter("P3", "me/buildings", $"{possedes.Length} bâtiment(s) : " + string.Join(", ", possedes.Select(b =>
                $"{b.operational_type ?? "∅"}@{b.district_id}{(string.IsNullOrEmpty(b.district_name) ? "" : $" ({b.district_name})")}")));

            shell.EnterDistrict(vise.district_id);   // « Entrer » depuis la carte
            DistrictInteriorScreenController district = null;
            fin = Time.realtimeSinceStartup + 20f;
            while (district == null && Time.realtimeSinceStartup < fin)
            {
                yield return null;
                district = Object.FindFirstObjectByType<DistrictInteriorScreenController>();
            }
            Assert.IsNotNull(district, "P3 : l'intérieur de district n'est pas monté");
            fin = Time.realtimeSinceStartup + 30f;
            while (district.LastFetch == null && district.LastErrorCode == 0 && Time.realtimeSinceStartup < fin) yield return null;
            Assert.IsNotNull(district.LastFetch, $"P3 : l'intérieur n'est pas arrivé (code {district.LastErrorCode})");
            // la donnée n'est pas le rendu (créneau du 23/09, `Capture_VuePrincipale_DistrictAvecBatiments_SousChromeV31`)
            fin = Time.realtimeSinceStartup + 30f;
            while (district.RenderedBuildingCount == 0 && Time.realtimeSinceStartup < fin) yield return null;
            Assert.Greater(district.RenderedBuildingCount, 0, "P3 : aucun bâtiment rendu dans le district du kit");
            Assert.AreEqual(vise.district_id, shell.CityTabDistrictId, "P3 : on doit être DANS le district du kit au moment de la planche");
            for (int i = 0; i < 20; i++) yield return null;
            yield return Photographier("p3_district");
            Noter("P3", $"Entrer · district {vise.district_id}", $"{district.RenderedBuildingCount} bâtiment(s) rendu(s) · "
                + $"bandeau {Bandeau()} · phase servie du district «{district.LastFetch.day_phase}»");

            // ── P4 · bâtiment ───────────────────────────────────────────────────────────────────────────────────────────────────
            var idsPossedes = new HashSet<string>(possedes.Where(b => b != null).Select(b => b.building));
            DistrictInteriorBuildingDto[] duKit = (district.LastFetch.buildings ?? new DistrictInteriorBuildingDto[0])
                .Where(b => b != null && idsPossedes.Contains(b.building)).ToArray();
            Assert.IsNotEmpty(duKit, "P4 : aucun bâtiment du kit dans l'intérieur servi — le district rendu n'est pas le sien");
            DistrictInteriorBuildingDto touche = PremierParType(duKit, b => b.operational_type);
            district.OuvrirFiche(touche);   // ce que le bouton de la cellule appelle
            for (int i = 0; i < 8; i++) yield return null;
            Assert.IsTrue(district.FicheOuverte, "P4 : la fiche ne s'est pas ouverte");
            Assert.AreEqual(touche.building, district.FicheBuildingId, "P4 : la fiche porte un autre bâtiment que celui touché");
            Transform fiche = Descendant(shell.ContentSlot, "FicheBatiment");
            Assert.IsNotNull(fiche, "P4 : la fiche n'existe pas dans l'arbre de l'écran");
            string actions = string.Join(" · ", fiche.GetComponentsInChildren<Transform>(false)
                .Where(t => t.name.StartsWith("Btn_")).Select(t => t.name.Substring(4)));
            yield return Photographier("p4_fiche_du_district");
            Noter("P4", $"toucher le bâtiment ({touche.operational_type})", $"fiche ouverte · actions visibles : {actions}");

            // ── P5 · fiche ② par la tête (B1) ───────────────────────────────────────────────────────────────────────────────────
            // Cherchée APRÈS les planches de P4 : leur recuit a rebâti la racine du district, et avec elle la tête.
            Transform tete = Descendant(shell.ContentSlot, "Tete_OuvrirFiche");
            Assert.IsNotNull(tete, "P5 : la tête de la fiche n'a pas de zone de toucher — B1 absent de cet arbre");
            Button tapTete = tete.GetComponent<Button>();
            Assert.IsNotNull(tapTete, "P5 : la zone de la tête ne porte pas de bouton");
            tapTete.onClick.Invoke();   // le toucher du joueur
            BuildingCardController fiche2 = null;
            fin = Time.realtimeSinceStartup + 20f;
            while (fiche2 == null && Time.realtimeSinceStartup < fin)
            {
                fiche2 = shell.ContentSlot.GetComponentInChildren<BuildingCardController>(true);
                yield return null;
            }
            Assert.IsNotNull(fiche2, "P5 : le toucher de la tête n'a pas monté ② sous le shell");
            Assert.AreEqual(touche.building, fiche2.BuildingId, "P5 : ② porte un autre bâtiment que celui de la fiche");
            fin = Time.realtimeSinceStartup + 30f;
            while (!fiche2.CardLoaded && string.IsNullOrEmpty(fiche2.CardError) && Time.realtimeSinceStartup < fin) yield return null;
            Assert.IsTrue(fiche2.CardLoaded, $"P5 : ② n'a pas chargé ({fiche2.CardError ?? "délai dépassé"})");
            for (int i = 0; i < 30; i++) yield return null;

            // ② est une SURIMPRESSION posée APRÈS la racine du district : le joueur la voit au-dessus. Le recuit de la capture
            // rend le district, qui repasse dessus (`Render` → `SetAsLastSibling`) ⇒ on remet, avant le rendu, ce qui était au-dessus.
            List<Transform> auDessus = FreresAuDessusDe(shell.ContentSlot, "DistrictInteriorRoot");
            Assert.IsTrue(auDessus.Any(t => t.name == "BuildingCardSheet"),
                "P5 : la feuille de ② n'est pas au-dessus du district AVANT la capture — le joueur ne la verrait pas non plus. "
                + "Au-dessus : " + string.Join(", ", auDessus.Select(t => t.name)));
            yield return Photographier("p5_fiche_operationnelle", avantRendu: () =>
            {
                foreach (Transform t in auDessus) if (t != null) t.SetAsLastSibling();
            });
            Noter("P5", "toucher la tête de la fiche (B1)",
                  $"② chargée · {fiche2.CurrentCard?.operational_type ?? touche.operational_type}"
                  + (fiche2.CurrentLab != null ? " · labo servi" : ""));
            yield return PupitreDeLaFiche(fiche2, auDessus);

            // ── F · onglets du dock ─────────────────────────────────────────────────────────────────────────────────────────────
            yield return Onglet("F1", AppShell.Tab.Org, "f1_famille", "FAMILLE ⑥");
            yield return Onglet("F2", AppShell.Tab.Pipeline, "f2_filiere", "FILIÈRE ㊵");

            // ── M · menu PLUS et ses écrans ─────────────────────────────────────────────────────────────────────────────────────
            yield return MenuPlus();
            foreach ((string pas, string id, string ecran) in EcransDuPlus)
                yield return EntreeDuPlus(pas, id, ecran);
        }

        /// <summary>Les écrans du PLUS que la passe UX veut, dans SON ordre de valeur (f1, 26/09).</summary>
        private static readonly (string pas, string id, string ecran)[] EcransDuPlus =
        {
            ("M1", "le_journal_la_rue", "㊳ Journal"), ("M2", "les_ordres_du_soir", "㉞ Carnet"), ("M3", "le_commissariat", "⑰ Commissariat"),
            ("M4", "la_premiere_fois", "㉕ La première fois"), ("M5", "la_chaine_d_appro", "㉚ Chaîne d'appro"),
            ("M6", "la_revue_du_jour", "⑯ Revue du jour"), ("M7", "la_vitrine", "㉓ boutique"),
        };

        /// <summary>A1-A4 — les gestes de l'Accueil, tant qu'il est là (G1 : il part au premier geste de dock).</summary>
        private IEnumerator DepuisLAccueil(DashboardController accueil)
        {
            // A1 · « Voir l'ardoise › » (panneau de file de l'Accueil)
            Transform panneau = shell.ContentSlot.Find("AccueilExceptionQueue");
            Button voir = panneau != null ? Descendant(panneau, "ViewAll")?.GetComponent<Button>() : null;
            if (voir == null) { Noter("A1", "Voir l'ardoise", "ÉCHEC : bouton « ViewAll » introuvable sous AccueilExceptionQueue"); yield break; }
            if (!ProductionClickSupport.Click(voir)) { Noter("A1", "Voir l'ardoise", "ÉCHEC : le bouton refuse le clic de production"); yield break; }
            MafiaCleanCity.Operational.Exceptions.ExceptionQueueController file = null;
            yield return Attendre(() => file = shell.ContentSlot.GetComponentInChildren<MafiaCleanCity.Operational.Exceptions.ExceptionQueueController>(true), 20f);
            if (file == null) { Noter("A1", "Voir l'ardoise", "ÉCHEC : ⑨ non monté"); yield break; }
            string etat = null;
            yield return Charger(file, e => etat = e);
            yield return Photographier("a1_ardoise");
            Noter("A1", "Voir l'ardoise", $"⑨ · {etat} · {file.Cards.Length} carte(s)");

            // A2 · toucher la carte d'accueil (ce que le bouton de la carte appelle)
            if (file.Cards.Length == 0) { Noter("A2", "toucher la carte", "aucune carte en file — ⑩ non atteint"); yield break; }
            file.OpenDetail(file.Cards[0]);
            MafiaCleanCity.Operational.Exceptions.ExceptionDetailController detail = null;
            yield return Attendre(() => detail = shell.ContentSlot.GetComponentInChildren<MafiaCleanCity.Operational.Exceptions.ExceptionDetailController>(true), 20f);
            if (detail == null) { Noter("A2", "toucher la carte", "ÉCHEC : ⑩ non monté"); yield break; }
            yield return Attendre(() => detail.CurrentCard != null ? detail : null, 20f);
            for (int i = 0; i < 30; i++) yield return null;
            yield return Photographier("a2_detail");
            var carte = detail.CurrentCard;
            string gestes = carte?.candidate_actions == null ? "∅"
                : string.Join(" | ", carte.candidate_actions.Where(a => a != null).Select(a => $"{a.method} «{a.label}»"));
            Noter("A2", "toucher la carte", $"⑩ · gestes servis : {gestes} · suggéré : {carte?.suggested_action?.method ?? "∅"}");

            // A3 · « Prendre acte » = le geste suggéré (sinon le premier) — une résolution RÉELLE, sur ce compte jetable
            var geste = carte?.suggested_action ?? carte?.candidate_actions?.FirstOrDefault(a => a != null);
            if (geste == null) { Noter("A3", "Prendre acte", "aucun geste servi — rien à toucher"); yield break; }
            yield return detail.ResolveWith(geste);
            // ⛔ A3 (relevé f1 §K.6, planches VPS) : 60 frames FIXES ne suffisaient pas contre un back distant — la relecture de ⑨ n'était
            //    pas revenue, la planche montrait encore la carte. On ATTEND une condition (borné) : ⑨ relue SANS la carte tranchée, ou le
            //    panneau de l'après visible. Le journal dit laquelle — ou le délai : si la carte est encore là APRÈS, c'est un vrai défaut.
            string tranchee = carte?.exception_id;
            bool Retour() => (file != null && file.QueueLoaded && !file.Cards.Any(c => c != null && c.exception_id == tranchee))
                             || (file != null && file.ApresBloc != null && file.ApresBloc.activeInHierarchy);
            float t0 = Time.realtimeSinceStartup;
            yield return Attendre(() => Retour() ? file : null, 20f);
            string attente = Retour() ? $"retour vu en {Time.realtimeSinceStartup - t0:0.0} s" : "DÉLAI 20 s : la carte tranchée est ENCORE là (vrai défaut)";
            bool accueilLa = accueil != null && accueil.isActiveAndEnabled;
            yield return Photographier("a3_retour");
            Noter("A3", $"Prendre acte ({geste.method})", $"{attente} · erreur={detail.LastError ?? "aucune"} · Accueil encore actif : {(accueilLa ? "oui" : "non")} · "
                + $"locataire monté : {shell.MountedTenantType?.Name ?? "aucun"}");

            // A4 · « Les télégrammes » (barre ALLER À de l'Accueil), s'il est encore joignable
            Button tele = Descendant(shell.ContentSlot, "Nav_Autonomy")?.GetComponent<Button>();
            if (tele == null || !tele.isActiveAndEnabled) { Noter("A4", "Les télégrammes", "INJOIGNABLE : « Nav_Autonomy » absent ou éteint après A3"); yield break; }
            if (!ProductionClickSupport.Click(tele)) { Noter("A4", "Les télégrammes", "ÉCHEC : le bouton refuse le clic de production"); yield break; }
            MafiaCleanCity.Operational.Autonomy.AutonomyInboxController boite = null;
            yield return Attendre(() => boite = shell.ContentSlot.GetComponentInChildren<MafiaCleanCity.Operational.Autonomy.AutonomyInboxController>(true), 20f);
            if (boite == null) { Noter("A4", "Les télégrammes", "ÉCHEC : ㉔ non monté"); yield break; }
            yield return Charger(boite, e => etat = e);
            yield return Photographier("a4_telegrammes");
            Noter("A4", "Les télégrammes", $"㉔ · {etat}");
        }

        /// <summary>B1 — le geste du pupitre de ②. « Allumer le feu » est touché s'il est offert ; « Commander » ne l'est jamais.</summary>
        private IEnumerator PupitreDeLaFiche(BuildingCardController fiche2, List<Transform> auDessus)
        {
            var geste = fiche2.GesteDuPupitreAffiche;
            Button allumer = Descendant(shell.ContentSlot, "Action_allumer_le_feu")?.GetComponent<Button>();
            if (allumer == null)
            {
                Noter("B1", "Cuire", $"geste du pupitre = {geste} · aucun « Allumer le feu » offert"
                    + (geste == BuildingCardController.GesteDuPupitre.Commander ? " · « Commander » NON touché (il dépense) — la planche P5 le montre" : ""));
                yield break;
            }
            if (!ProductionClickSupport.Click(allumer)) { Noter("B1", "Cuire", "ÉCHEC : « Allumer le feu » refuse le clic de production"); yield break; }
            for (int i = 0; i < 180; i++) yield return null;   // la requête part et le message se pose (aucun drapeau public)
            yield return Photographier("b1_cuire", avantRendu: () => { foreach (Transform t in auDessus) if (t != null) t.SetAsLastSibling(); });
            Noter("B1", "Cuire (« Allumer le feu »)", $"geste avant = {geste} · après = {fiche2.GesteDuPupitreAffiche} · erreur carte={fiche2.CardError ?? "aucune"}");
        }

        private IEnumerator Onglet(string pas, AppShell.Tab onglet, string planche, string ecran)
        {
            shell.ActivateTab(onglet);
            yield return null;
            for (int i = 0; i < 10; i++) yield return null;
            MonoBehaviour monte = shell.MountedTenantGameObject != null
                ? shell.MountedTenantGameObject.GetComponent(shell.MountedTenantType) as MonoBehaviour : null;
            if (monte == null) { Noter(pas, ecran, "ÉCHEC : aucun locataire monté"); yield break; }
            string etat = null;
            yield return Charger(monte, e => etat = e);
            yield return Photographier(planche);
            Noter(pas, ecran, $"{shell.MountedTenantType.Name} · {etat}");
        }

        /// <summary>M0 — le menu PLUS, en haut puis défilé tout en bas (G5 : 21 entrées à plat).</summary>
        private IEnumerator MenuPlus()
        {
            shell.ActivateTab(AppShell.Tab.More);
            for (int i = 0; i < 10; i++) yield return null;
            ScrollRect defile = Descendant(shell.ContentSlot, "MenuPlus")?.GetComponent<ScrollRect>();
            yield return Photographier("m0_plus_haut", avantRendu: () => { if (defile != null) defile.verticalNormalizedPosition = 1f; });
            yield return Photographier("m0_plus_bas", avantRendu: () => { if (defile != null) defile.verticalNormalizedPosition = 0f; });
            Noter("M0", "PLUS ⑱", $"{shell.MenuPlusEntrees} entrée(s) · défilement {(defile != null ? "présent" : "ABSENT — planche basse = planche haute")}");
        }

        private IEnumerator EntreeDuPlus(string pas, string id, string ecran)
        {
            shell.ActivateTab(AppShell.Tab.More);
            for (int i = 0; i < 5; i++) yield return null;
            Button entree = Descendant(shell.ContentSlot, "MenuPlus_" + id)?.GetComponent<Button>();
            if (entree == null) { Noter(pas, ecran, $"ÉCHEC : entrée « MenuPlus_{id} » introuvable"); yield break; }
            if (!ProductionClickSupport.Click(entree)) { Noter(pas, ecran, "ÉCHEC : l'entrée refuse le clic de production"); yield break; }
            for (int i = 0; i < 5; i++) yield return null;
            MonoBehaviour monte = shell.MountedTenantGameObject != null
                ? shell.MountedTenantGameObject.GetComponent(shell.MountedTenantType) as MonoBehaviour : null;
            // f1 26/09 : ⑰ photographié AVANT le premier tick du monde montrait un état vide qui n'est pas celui du joueur. On attend
            // un tick RÉEL — anti-vacuité : `city/precinct/6/patrol` rend 200 (404 tant qu'aucun tick) — puis on charge l'écran.
            string attenteTick = null;
            if (pas == "M3")
            {
                var projections = new MafiaCleanCity.CityMap.CityProjectionsClient { BaseUrl = MafiaCleanCity.AdresseDuBack.Url };
                float t0 = Time.realtimeSinceStartup, finTick = t0 + 120f;
                bool tick = false;
                while (!tick && Time.realtimeSinceStartup < finTick)
                {
                    yield return projections.Patrol(0, shell.Token, _ => tick = true, _ => { }, precinctId: 6);
                    if (!tick) { float r = Time.realtimeSinceStartup + 2f; while (Time.realtimeSinceStartup < r) yield return null; }
                }
                attenteTick = tick ? $"premier tick vu en {Time.realtimeSinceStartup - t0:F0} s (patrol 6 = 200)"
                                   : "ÉCHEC : aucun tick en 120 s (patrol 6 toujours 404) — la planche montre l'état d'AVANT le monde";
            }
            if (monte == null) { Noter(pas, ecran, "ÉCHEC : cliquée, aucun locataire monté"); yield break; }
            string etat = null;
            yield return Charger(monte, e => etat = e);
            yield return Photographier($"{pas.ToLowerInvariant()}_{id}");
            Noter(pas, ecran, $"{shell.MountedTenantType.Name} · {etat}" + (attenteTick != null ? " · " + attenteTick : ""));
        }

        /// <summary>Attend qu'un écran dise qu'il a fini — par les drapeaux publics que CES écrans portent (lus par réflexion : ils
        /// n'ont pas d'interface commune) — ou qu'il porte une erreur. Sans aucun drapeau connu : attente fixe, DÉCLARÉE au journal.
        /// Non abouti en 20 s : la planche est prise quand même et le journal le DIT (c'est ce que le joueur a sous les yeux).</summary>
        private static IEnumerator Charger(MonoBehaviour ecran, System.Action<string> etat)
        {
            string[] finis = { "RenduTermine", "QueueLoaded", "DashboardLoaded", "CardLoaded", "IsLoaded", "ReportsLoaded", "RenderedEmptyState" };
            string[] comptes = { "RendusEffectues", "RenderedCardCount" };
            string[] objets = { "LastLoadedReview" };
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
            if (v != null && lire("EtatVide") is bool vide && vide) v += " · état vide";
            for (int i = 0; i < 20; i++) yield return null;
            etat(v ?? "⚠️ NON ABOUTI en 20 s — la planche montre l'écran tel qu'il est à 20 s");
        }

        private static IEnumerator Attendre<T>(System.Func<T> trouver, float delai) where T : class
        {
            for (float f = Time.realtimeSinceStartup + delai; trouver() == null && Time.realtimeSinceStartup < f;) yield return null;
        }

        /// <summary>Les deux résolutions portrait, par le rendu partagé du shell entier.</summary>
        private IEnumerator Photographier(string pas, bool rebatirAccueil = false, System.Action avantRendu = null)
        {
            foreach ((int largeur, int hauteur) in Resolutions)
                yield return CaptureSousShell.CapturerLeShell(shell, largeur, hauteur,
                    Path.Combine(dossier, $"{pas}_{largeur}x{hauteur}.png"), rebatirAccueil, avantRendu);
        }

        private void Noter(string pas, string geste, string vu)
        {
            File.AppendAllText(journal, $"{pas}\t{geste}\t{vu}\n");
            Debug.Log($"[PARCOURS] {pas} · {geste} · {vu}");
        }

        private string Bandeau() => shell.TopBar == null ? "absent"
            : $"montant=«{shell.TopBar.RenderedCashText}» jour={shell.TopBar.OpenedGameDay} phase=«{shell.TopBar.DayPhaseText}» chaleur=«{shell.TopBar.CitywideHeatBucket}»";

        /// <summary>Le labo d'abord (la cuisson ouvre la boucle), sinon le premier de la liste — jamais null sur une liste non vide.</summary>
        private static T PremierParType<T>(IEnumerable<T> liste, System.Func<T, string> type) where T : class
        {
            foreach (string voulu in new[] { "lab", "specialized_lab" })
            {
                T trouve = liste.FirstOrDefault(b => b != null && type(b) == voulu);
                if (trouve != null) return trouve;
            }
            return liste.First(b => b != null);
        }

        private static Transform Descendant(Transform racine, string nom)
        {
            foreach (Transform t in racine.GetComponentsInChildren<Transform>(true))
                if (t.name == nom) return t;
            return null;
        }

        /// <summary>Les enfants DIRECTS de `slot` posés après `nom`, dans l'ordre — ce que le joueur voit par-dessus lui.</summary>
        private static List<Transform> FreresAuDessusDe(Transform slot, string nom)
        {
            var dessus = new List<Transform>();
            Transform repere = slot.Find(nom);
            if (repere == null) return dessus;
            for (int k = repere.GetSiblingIndex() + 1; k < slot.childCount; k++) dessus.Add(slot.GetChild(k));
            return dessus;
        }
    }

    /// <summary>La CIBLE du parcours (MAFIA_PARCOURS_BACK_URL) et ses trois gardes (f2 26/09, relues par f1). Pur, testé hors réseau.
    ///   (a) une URL `http://` vers un hôte NON local est REFUSÉE avant toute pose (un exception, le test rougit) ;
    ///   (b) `Restaurer` rend à `AdresseDuBack.Url` la valeur d'AVANT le SetUp — pas seulement « effacée » ;
    ///   (c) `Bandeau` : « COMPTE NEUF CRÉÉ SUR <hôte> · » quand l'hôte visé n'est pas local.
    /// ⚠️ `AdresseDuBack` (la source d'URL de l'APK) n'est PAS modifiée : seules ses coutures de test existantes sont appelées.</summary>
    public static class CibleDuParcours
    {
        public static bool EstLocal(string hote) =>
            hote == "localhost" || hote == "127.0.0.1" || hote == "::1" || hote == "[::1]";

        /// <summary>Null si l'URL est acceptable ; sinon la raison du refus.</summary>
        public static string Refus(string url)
        {
            if (!System.Uri.TryCreate(url, System.UriKind.Absolute, out System.Uri u)) return $"« {url} » n'est pas une URL absolue";
            if (u.Scheme != "https" && !EstLocal(u.Host)) return $"« {url} » : hors localhost, seul https est accepté";
            if (u.Scheme != "https" && u.Scheme != "http") return $"« {url} » : schéma {u.Scheme} refusé";
            return null;
        }

        /// <summary>Pose la cible si elle est donnée (après validation) ; rend l'adresse d'AVANT, à passer à `Restaurer`.</summary>
        public static string Appliquer(string brute)
        {
            string avant = MafiaCleanCity.AdresseDuBack.Url;
            if (string.IsNullOrWhiteSpace(brute)) return avant;
            string cible = brute.Trim().TrimEnd('/');
            string refus = Refus(cible);
            if (refus != null) throw new System.ArgumentException("MAFIA_PARCOURS_BACK_URL refusée : " + refus);
            MafiaCleanCity.AdresseDuBack.PoserPourTest(cible);
            return avant;
        }

        /// <summary>Rend à `AdresseDuBack.Url` sa valeur d'avant : on retire la pose, puis on repose l'ancienne valeur SI elle différait.</summary>
        public static void Restaurer(string avant)
        {
            MafiaCleanCity.AdresseDuBack.Oublier();
            if (avant != null && MafiaCleanCity.AdresseDuBack.Url != avant) MafiaCleanCity.AdresseDuBack.PoserPourTest(avant);
        }

        public static string Bandeau(string urlVisee) =>
            System.Uri.TryCreate(urlVisee, System.UriKind.Absolute, out System.Uri u) && !EstLocal(u.Host)
                ? $"COMPTE NEUF CRÉÉ SUR {u.Host} · " : "";
    }

    public class CibleDuParcoursTests
    {
        [Test, Category("ClicheParcours")]
        public void G1_HorsLocalhost_SeulHttps()
        {
            Assert.IsNotNull(CibleDuParcours.Refus("http://cleancity.erutheone.eu"), "contrôle positif : http vers le VPS REFUSÉ");
            Assert.Throws<System.ArgumentException>(() => CibleDuParcours.Appliquer("http://cleancity.erutheone.eu"), "refusé AVANT toute pose");
            Assert.IsNull(CibleDuParcours.Refus("https://cleancity.erutheone.eu"));
            Assert.IsNull(CibleDuParcours.Refus("http://localhost:3000"));
            Assert.IsNull(CibleDuParcours.Refus("http://127.0.0.1"));
            Assert.IsNotNull(CibleDuParcours.Refus("pas une url"));
        }

        [Test, Category("ClicheParcours")]
        public void G2_Restauree_PasSeulementEffacee()
        {
            string origine = MafiaCleanCity.AdresseDuBack.Url;
            try
            {
                MafiaCleanCity.AdresseDuBack.PoserPourTest("http://localhost:3999");   // une adresse RÉELLE d'avant, distincte du défaut
                string avant = CibleDuParcours.Appliquer("https://exemple.invalid/");
                Assert.AreEqual("http://localhost:3999", avant);
                Assert.AreEqual("https://exemple.invalid", MafiaCleanCity.AdresseDuBack.Url, "la cible, sans / final");
                CibleDuParcours.Restaurer(avant);
                Assert.AreEqual("http://localhost:3999", MafiaCleanCity.AdresseDuBack.Url, "RESTAURÉE à la valeur d'avant, pas effacée");
            }
            finally { MafiaCleanCity.AdresseDuBack.Oublier(); }
            Assert.AreEqual(origine, MafiaCleanCity.AdresseDuBack.Url);
        }

        [Test, Category("ClicheParcours")]
        public void G3_LeBandeau_NommeLHoteVise()
        {
            Assert.AreEqual("COMPTE NEUF CRÉÉ SUR cleancity.erutheone.eu · ", CibleDuParcours.Bandeau("https://cleancity.erutheone.eu"));
            Assert.AreEqual("", CibleDuParcours.Bandeau("http://localhost"));
            Assert.AreEqual("", CibleDuParcours.Bandeau("http://127.0.0.1:3000"));
        }
    }
}
