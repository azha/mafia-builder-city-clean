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
            Noter("P0", "inscription", $"compte neuf {DemoIdentityResolver.Empreinte(callsign)}");

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
            yield return Photographier("p1_lancement", rebatirAccueil: true);
            Noter("P1", "lancement", $"Accueil chargé · bandeau {Bandeau()}");

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
            Noter("P3", $"Entrer · district {vise.district_id}", $"{district.RenderedBuildingCount} bâtiment(s) rendu(s)");

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
            : $"montant=«{shell.TopBar.RenderedCashText}» jour={shell.TopBar.OpenedGameDay} chaleur=«{shell.TopBar.CitywideHeatBucket}»";

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
}
