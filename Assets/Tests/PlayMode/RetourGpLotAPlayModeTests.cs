using System.Collections;
using System.Collections.Generic;
using System.Linq;
using NUnit.Framework;
using UnityEngine;
using UnityEngine.TestTools;
using MafiaCleanCity.CityMap;
using MafiaCleanCity.I18n;
using MafiaCleanCity.Mouvements;
using MafiaCleanCity.Operational;
using MafiaCleanCity.Operational.Tests;   // AdresseDuBackPlayModeTests.Racines
using MafiaCleanCity.Shell;
using Object = UnityEngine.Object;

namespace MafiaCleanCity.Tests
{
    // E-R6 (design retour d'appui v5, §4) — GP, lot A : les SCÉNARIOS qui relèvent la population RÉELLE de boutons, hors réseau. Un test par
    // écran / état ; chacun monte l'écran, appelle `RetourGpReleve.Relever` (un seul relevé, un seul verdict par bouton), publie, puis asserte
    //   · aucun rouge (0 / 2 attachements, handle nul, effet sous le plancher, hors cadre) ;
    //   · l'anti-vacuité : N pressables relevés > 0, N LU du relevé (jamais écrit à une valeur devinée) et journalisé.
    // Écrans montés : District (héros ; fiche ouverte), CityMap (carte ; panneau de détail), BuildingCard (labo OPERATIONAL).
    // Les tests rendent par `RenderTexture` à la résolution des vrais écrans : ils exigent un périphérique graphique (pas `-nographics`).
    [Category("RetourAppui")]
    public class RetourGpLotAPlayModeTests
    {
        /// <summary>La résolution à laquelle les vrais écrans se rendent (les captures de contrôle sont à 1080 × 1920).</summary>
        private const int LargeurEcran = 1080, HauteurEcran = 1920;
        /// <summary>L'attente d'une ouverture de fiche, comme `CaptureTeteFichePlayModeTests` (la fiche s'anime, on attend qu'elle ait fini).</summary>
        private const int FramesDAttente = 90;
        private const string NomTete = "Tete_OuvrirFiche";
        private const string NomFiche = "FicheBatiment";
        private const string NomPanneauDetail = "DetailPanel";

        private readonly List<GameObject> montes = new List<GameObject>();
        private HashSet<GameObject> racinesAvant;
        private Regie regie;

        [SetUp]
        public void Monter()
        {
            racinesAvant = new HashSet<GameObject>(AdresseDuBackPlayModeTests.Racines());
            I18nCatalog.Oublier();
            Libelle.RemettreLesCompteurs();
            RegieMouvement.Oublier();
            regie = RegieMouvement.PourTest();   // AVANT le montage : les contrôleurs attachent leurs ambiances à la régie courante
        }

        [TearDown]
        public void Demonter()
        {
            DetruireMontes();
            RegieMouvement.Oublier();
            if (racinesAvant != null)
            {
                foreach (GameObject g in AdresseDuBackPlayModeTests.Racines().Where(g => g != null && !racinesAvant.Contains(g)).ToList())
                    Object.DestroyImmediate(g);   // le Canvas et l'EventSystem créés par un écran nu
                racinesAvant = null;
            }
            I18nCatalog.Oublier();
            Libelle.RemettreLesCompteurs();
        }

        private void DetruireMontes()
        {
            foreach (GameObject g in montes) if (g != null) Object.DestroyImmediate(g);
            montes.Clear();
        }

        private static IEnumerator Attendre()
        {
            for (int i = 0; i < FramesDAttente; i++) yield return null;
        }

        // ------------------------------------------------------------------------------ le verdict commun
        /// <summary>Publie, puis asserte l'anti-vacuité (N pressables lu du relevé, journalisé) et l'absence de rouge.</summary>
        private static void Verifier(string scenario, List<LigneGp> lignes, List<string> rougesSupplementaires = null)
        {
            PublicationGp.Publier(lignes);
            int n = RetourGpReleve.Pressables(lignes);
            Debug.Log("[GP] " + scenario + " : N pressables relevés = " + n + " sur " + lignes.Count + " boutons montés");
            Assert.Greater(n, 0, scenario + " — anti-vacuité : " + n + " pressable relevé sur " + lignes.Count + " boutons montés");
            List<string> rouges = RetourGpReleve.Rouges(lignes);
            if (rougesSupplementaires != null) rouges.AddRange(rougesSupplementaires);
            Assert.IsEmpty(rouges, scenario + " — " + rouges.Count + " rouge(s) sur " + n + " pressables :\n" + string.Join("\n", rouges));
        }

        // ------------------------------------------------------------------------------ (i)(ii) District
        private static DistrictInteriorBuildingDto Batiment(string id, int bloc, string type, string enseigne, string recolte = null)
        {
            return new DistrictInteriorBuildingDto
            {
                building = id, block_id = bloc, operational_type = type, conversion_band = "OPERATIONAL",
                shell_state = "STANDING", condition_band = "SOUND", revenue_band = "IDLE", revenue_chain = "UNWIRED", activity_band = "IDLE",
                harvest_band = recolte, lapse_phase_bucket = "WITHIN_WINDOW", maintenance_in_progress = false, lieutenant_ids = new string[0],
                name_i18n = new DistrictBuildingNameI18nDto
                {
                    key = "game.fiction.building.name",
                    @params = new DistrictBuildingNameParamsDto { enseigne = enseigne, district = "Les Bassins", block = "1" },
                },
            };
        }

        // trois bâtiments, un par bloc : chacun ouvre une fiche dont les actions diffèrent (COLLECTER : point de vente chargé ; BLANCHIR :
        // commerce de façade ; AMÉLIORER : relais). Les pressables de la fiche dépendent du type : voir `DistrictInteriorScreenController`.
        private static readonly DistrictInteriorBuildingDto[] Batiments =
        {
            Batiment("b-vente", 0, "dealer_spot_front", "Coin Marrek", recolte: "AVAILABLE"),
            Batiment("b-facade", 1, "front_shop", "Façade Verge"),
            Batiment("b-relais", 2, "distribution_hub", "Transit Marrek"),
        };

        private DistrictInteriorScreenController MonterDistrict(out Canvas canvas)
        {
            var host = new GameObject("DistrictHostGp", typeof(RectTransform));
            montes.Add(host);
            var ecran = host.AddComponent<DistrictInteriorScreenController>();
            ecran.Render(new DistrictInteriorDto
            {
                district = "district-1", district_id = 1, profile = "lattice", name_canonical = "Test", bank_side = "north",
                grid = new DistrictInteriorGridDto { width = Batiments.Length, height = 1 },
                blocks = Batiments.Select(b => new DistrictInteriorBlockDto { block_id = b.block_id, x = b.block_id, y = 0 }).ToArray(),
                buildings = Batiments, day_phase = "NIGHT",
            });
            Assert.IsNotNull(ecran.ScreenRoot, "l'écran District n'a pas de racine");
            canvas = ecran.ScreenRoot.GetComponentInParent<Canvas>().rootCanvas;
            return ecran;
        }

        [UnityTest]
        public IEnumerator GP_District_Heros()
        {
            DistrictInteriorScreenController ecran = MonterDistrict(out Canvas canvas);
            yield return Attendre();
            List<LigneGp> lignes = RetourGpReleve.Relever("District", "héros", ecran.ScreenRoot.gameObject, canvas, regie, LargeurEcran, HauteurEcran);
            Verifier("District/héros", lignes);
        }

        [UnityTest]
        public IEnumerator GP_District_FicheOuverte()
        {
            DistrictInteriorScreenController ecran = MonterDistrict(out Canvas canvas);
            yield return Attendre();
            var lignes = new List<LigneGp>();
            foreach (DistrictInteriorBuildingDto b in Batiments)
            {
                ecran.OuvrirFiche(b);
                yield return Attendre();
                Assert.IsTrue(ecran.FicheOuverte, "précondition : la fiche de " + b.building + " est ouverte");
                Transform fiche = ecran.ScreenRoot.GetComponentsInChildren<Transform>(true).FirstOrDefault(t => t.name == NomFiche);
                Assert.IsNotNull(fiche, "la fiche (" + NomFiche + ") est dans l'arbre de l'écran");
                // le relevé de la fiche seule : la ville dessous est le relevé de l'état « héros », et la feuille la recouvre
                lignes.AddRange(RetourGpReleve.Relever("District", "fiche/" + b.operational_type, fiche.gameObject, canvas, regie, LargeurEcran, HauteurEcran));
            }
            Verifier("District/fiche ouverte", lignes, RougesTete(lignes));
        }

        /// <summary>La tête de la fiche doit sortir en CAS 3 (voile sur la tête, décision f2 11/11) : tout autre cas est un ROUGE nommé, jamais
        /// arrangé ici.</summary>
        private static List<string> RougesTete(List<LigneGp> lignes)
        {
            var res = new List<string>();
            int vues = 0;
            foreach (LigneGp l in lignes)
            {
                if (!l.Chemin.EndsWith("/" + NomTete)) continue;
                vues++;
                if (!l.Pressable) res.Add("GP-CAS : " + l.Ecran + "/" + l.Chemin + " — non pressable (" + l.Etat + ") : la tête devait l'être");
                else if (l.Cas != CasRetour.VoileDuBouton)
                    res.Add("GP-CAS : " + l.Ecran + "/" + l.Chemin + " — cas " + (int)l.Cas + " (" + l.Etat + "), attendu " + (int)CasRetour.VoileDuBouton
                            + " : voile sur la tête");
            }
            if (vues == 0) res.Add("GP-CAS : " + NomTete + " absente du relevé de la fiche");
            return res;
        }

        // ------------------------------------------------------------------------------ (iii) CityMap
        private static DistrictDto District(int id, string canon, string nom) => new DistrictDto
        {
            id = id, profile = "tidewater", index = id.ToString(), name_canonical = canon, name = nom, block_count = 4,
            bank_side = "north", control_state = "UNCONTESTED",
        };

        // Montage SYNCHRONE : `Start` (qui chargerait les districts par le réseau) ne tourne jamais, l'hôte est détruit avant la première image.
        private CityMapController MonterCarte(out Canvas canvas)
        {
            var hote = new GameObject("CarteGp");
            montes.Add(hote);
            var carte = hote.AddComponent<CityMapController>();
            carte.MonterPourTest(new List<DistrictDto>
            {
                District(1, "Tidewater-1", "Le Port"), District(2, "Tidewater-2", "Marne-Basse"), District(3, "Tidewater-3", "Les Friches"),
            });
            canvas = hote.GetComponentInChildren<Canvas>(true).rootCanvas;
            return carte;
        }

        [UnityTest]
        public IEnumerator GP_CityMap_Carte()
        {
            List<LigneGp> lignes;
            try
            {
                CityMapController carte = MonterCarte(out Canvas canvas);
                Debug.Log("[GP] CityMap/carte : ville peinte montée = " + carte.VillePeinteMontee
                          + " (marqueurs si vrai ; sinon la liste en colonnes, qui porte les cellules)");
                lignes = RetourGpReleve.Relever("CityMap", "carte", canvas.gameObject, canvas, regie, LargeurEcran, HauteurEcran);
            }
            finally { DetruireMontes(); }
            Verifier("CityMap/carte", lignes);
            yield break;
        }

        [UnityTest]
        public IEnumerator GP_CityMap_PanneauDeDetail()
        {
            List<LigneGp> lignes;
            try
            {
                CityMapController carte = MonterCarte(out Canvas canvas);
                carte.SelectDistrict(1);   // non authentifié : le panneau s'ouvre et se remplit sans requête
                Transform panneau = canvas.transform.Find(NomPanneauDetail);
                Assert.IsNotNull(panneau, "le panneau de détail (" + NomPanneauDetail + ") est sous le canvas");
                Assert.IsTrue(panneau.gameObject.activeSelf, "précondition : SelectDistrict a ouvert le panneau");
                lignes = RetourGpReleve.Relever("CityMap", "détail ouvert", panneau.gameObject, canvas, regie, LargeurEcran, HauteurEcran);
            }
            finally { DetruireMontes(); }
            Verifier("CityMap/détail ouvert", lignes);
            yield break;
        }

        // ------------------------------------------------------------------------------ (iv) BuildingCard
        [UnityTest]
        public IEnumerator GP_BuildingCard_LaboOperationnel()
        {
            List<LigneGp> lignes;
            try
            {
                var hote = new GameObject("FicheGp", typeof(RectTransform), typeof(Canvas));   // un Canvas À NOUS : aucun ne fuit
                montes.Add(hote);
                var fiche = hote.AddComponent<BuildingCardController>();
                fiche.SetBaseUrl("http://127.0.0.1:9");
                fiche.SetMountParent(hote.transform);
                // labo à l'arrêt, étagère garnie : le geste du pupitre est « Allumer le feu » (un `AddActionButton` pressable) ; synchrone,
                // `Start` (qui se connecterait) ne tourne jamais
                fiche.RendrePourTest(new BuildingCardDto
                {
                    building = "b-lab", setup_state = "OPERATIONAL", cover_band = "WEAK", operational = true, operational_type = "lab",
                    structural_state = "OPERATIONAL", seized_amount = "NONE", repair_cost = "NONE", raid_risk = "LOW", lab_tier_band = "NONE",
                }, lab: new LabCookDto { building = "b-lab", cook_stage_band = "IDLE" },
                   precursors: new GetOperationalPrecursorsResponseDto { building = "b-lab", stock_band = "LOW", precursor_type = "PYRALIN" });
                lignes = RetourGpReleve.Relever("BuildingCard", "labo OPERATIONAL", hote, hote.GetComponent<Canvas>(), regie, LargeurEcran, HauteurEcran);
            }
            finally { DetruireMontes(); }
            Verifier("BuildingCard/labo OPERATIONAL", lignes);
            yield break;
        }
    }
}
