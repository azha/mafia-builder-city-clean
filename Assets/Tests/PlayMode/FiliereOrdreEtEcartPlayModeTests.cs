using System.Collections;
using System.Collections.Generic;
using System.Linq;
using NUnit.Framework;
using UnityEngine;
using UnityEngine.TestTools;
using MafiaCleanCity.Operational;
using MafiaCleanCity.Tests;   // SeederSupport
using Object = UnityEngine.Object;

namespace MafiaCleanCity.Operational.Tests
{
    /// <summary>㊵ porte la filière (ruling de f2 du 2026-09-23, reco (a) de l'atelier `25-donnees-servies-4-11-12-40-7.md` §1 :
    /// l'onglet Filière monte ㊵ ; ⑪ et ⑫ sortent du chemin joueur). Ses DEUX conditions, gardées ici :
    /// (1) l'ORDRE des étapes vient de `stage_index` (la liste des nœuds) — personne ne le lisait ;
    /// (2) `deviation_active` est LU (seul ⑪ le lisait) : compteur « ÉCARTS », étiquette « écart », panneau du cadre 138.
    /// Catégorie propre, SANS la paire (le compte est celui du seeder) : elle entrera au filtre après un run vert.</summary>
    [Category("EcranFiliere")]
    public class FiliereOrdreEtEcartPlayModeTests
    {
        private GameObject hostGo;

        [TearDown]
        public void TearDown()
        {
            MafiaCleanCity.I18n.I18nCatalog.Oublier();
            GameObject reste = GameObject.Find("FiliereRoot");
            while (reste != null) { Object.DestroyImmediate(reste); reste = GameObject.Find("FiliereRoot"); }
            if (hostGo != null) Object.DestroyImmediate(hostGo);
            hostGo = null;
        }

        private FiliereScreenController MonterEcran()
        {
            hostGo = new GameObject("FiliereScreen", typeof(RectTransform));
            return hostGo.AddComponent<FiliereScreenController>();
        }

        private static LaunderingStageDto Etape(string node, string bande, bool terminal = false) =>
            new LaunderingStageDto { node = node, cleanliness_band = bande, terminal = terminal, has_cash = false };

        private static LaunderingNodeRefDto Noeud(string node, int rang) =>
            new LaunderingNodeRefDto { node = node, stage_index = rang };

        private static bool PorteLEtiquetteEcart(int rang)
        {
            GameObject racine = GameObject.Find("FiliereRoot");
            Assert.IsNotNull(racine, "FiliereRoot introuvable");
            Transform etape = racine.GetComponentsInChildren<Transform>(true).FirstOrDefault(t => t.name == "Etape" + rang);
            Assert.IsNotNull(etape, $"Etape{rang} introuvable");
            return etape.Find("Ecart") != null;
        }

        /// <summary>⛔ GARDE DE VALEUR SUR UN CORPS RÉEL — le compte semé (`seed_operational_demo.mjs`, sans la paire) : l'ordre
        /// affiché == l'ordre de `stage_index` lu dans la liste servie ; l'écart de la TÊTE est lu (la route ne sert qu'elle) ; le
        /// compteur « ÉCARTS » == son `deviation_active` ; l'étiquette « écart » sur la tête seule, et seulement si elle s'écarte.
        /// Anti-vacuité : au moins 2 étapes (sinon l'ordre ne prouve rien).</summary>
        [UnityTest]
        public IEnumerator Reel_OrdreAffiche_EstCeluiDeStageIndex_EtLesEcartsSontLus()
        {
            string json = SeederSupport.RunSeeder("Tools/seed_operational_demo.mjs", "=== OPERATIONAL DEMO SEEDED ===");
            string email = SeederSupport.ExtractString(json, "email"), mdp = SeederSupport.ExtractString(json, "password");
            Assert.IsFalse(string.IsNullOrEmpty(email) || string.IsNullOrEmpty(mdp), "identité du compte semé lue dans le manifeste");

            var auth = new MafiaCleanCity.CityMap.AuthClient { BaseUrl = MafiaCleanCity.AdresseDuBack.Url };
            string token = null, err = null;
            yield return auth.SignIn(email, mdp, t => token = t, e => err = e);
            Assert.IsNull(err, $"connexion au compte semé échouée : {err}");

            var ecran = MonterEcran();
            ecran.SetToken(token);
            yield return null;
            yield return ecran.Charger();
            yield return null;

            Assert.IsNull(ecran.DerniereErreur, $"route en échec ({ecran.DernierCodeErreur} — {ecran.DerniereErreur})");
            Assert.IsNotNull(ecran.DerniereListe, "la liste des nœuds (porteuse de stage_index) a été lue");
            Assert.IsNotNull(ecran.DernierChargement, "le pipeline a été lu");
            Assert.GreaterOrEqual(ecran.OrdreAffiche.Count, 2, "anti-vacuité : au moins 2 étapes rendues");
            Assert.IsTrue(ecran.OrdreParStageIndex, "chaque étape du pipeline a son stage_index dans la liste servie");

            var rangs = ecran.DerniereListe.nodes.Where(n => n != null).ToDictionary(n => n.node, n => n.stage_index);
            List<string> attendu = ecran.DernierChargement.stages.Select(e => e.node).OrderBy(n => rangs[n]).ToList();
            CollectionAssert.AreEqual(attendu, ecran.OrdreAffiche.ToList(), "l'ordre affiché est celui de stage_index");
            for (int i = 1; i < ecran.OrdreAffiche.Count; i++)
                Assert.Less(rangs[ecran.OrdreAffiche[i - 1]], rangs[ecran.OrdreAffiche[i]],
                    $"stage_index croît le long de l'écran (étapes {i} et {i + 1})");

            // ⚠️ La route du nœud ne sert que la TÊTE (mesuré le 23/09 : 404 « not a player-owned Stage-1 laundering node » sur
            //    les autres) : le drapeau est celui de la filière, lu UNE fois, sur la tête (1ʳᵉ étape affichée).
            string tete = ecran.OrdreAffiche[0];
            Assert.IsTrue(ecran.EcartsParNoeud.ContainsKey(tete), $"l'écart de la tête {tete} a été LU (GET …/laundering/{{node}})");
            Assert.AreEqual(1, ecran.EcartsParNoeud.Count, "une seule lecture : la tête");
            int vrais = ecran.EcartsParNoeud[tete] ? 1 : 0;
            Assert.AreEqual(vrais, ecran.EcartsAffiches, "le compteur « ÉCARTS » == deviation_active de la tête (0 ou 1)");
            for (int i = 0; i < ecran.OrdreAffiche.Count; i++)
                Assert.AreEqual(i == 0 && vrais == 1, PorteLEtiquetteEcart(i + 1),
                    $"étape {i + 1} : l'étiquette « écart » n'est portée que par la tête, et seulement si elle s'écarte");
            Debug.Log($"[FILIERE] corps réel : {ecran.OrdreAffiche.Count} étapes, ordre par stage_index, {vrais} écart(s)");
        }

        /// <summary>État FABRIQUÉ : le serveur rend les étapes DANS LE DÉSORDRE, la liste dit l'ordre ; une étape s'écarte. L'écran
        /// trie par `stage_index`, compte 1 écart, étiquette cette étape seule et pose le panneau du cadre 138.</summary>
        [Test]
        public void Fabrique_OrdreDuServeurMelange_TrieParStageIndex_UnEcartEtiquete()
        {
            var ecran = MonterEcran();
            var dto = new LaunderingPipelineDto { stages = new[] {
                Etape("n3", "CLEAN"), Etape("n1", "DIRTY"), Etape("n4", "CLEAN", terminal: true), Etape("n2", "PARTIAL") } };
            var liste = new LaunderingNodesDto { nodes = new[] { Noeud("n1", 1), Noeud("n2", 2), Noeud("n3", 3), Noeud("n4", 4) } };
            ecran.RendrePourTest(dto, liste, new Dictionary<string, bool> { { "n1", false }, { "n2", false }, { "n3", true }, { "n4", false } });

            Assert.IsTrue(ecran.OrdreParStageIndex);
            CollectionAssert.AreEqual(new[] { "n1", "n2", "n3", "n4" }, ecran.OrdreAffiche.ToList(), "trié par stage_index");
            Assert.AreEqual(1, ecran.EcartsAffiches, "un seul nœud s'écarte ; les étapes sales ne sont PAS des écarts");
            Assert.IsFalse(PorteLEtiquetteEcart(1)); Assert.IsFalse(PorteLEtiquetteEcart(2));
            Assert.IsTrue(PorteLEtiquetteEcart(3), "l'étape n3 (3ᵉ affichée) porte « écart »");
            Assert.IsFalse(PorteLEtiquetteEcart(4));
            var textes = GameObject.Find("FiliereRoot").GetComponentsInChildren<TMPro.TMP_Text>(true).Select(t => t.text).ToList();
            Assert.IsTrue(textes.Any(t => t == "La filière s’écarte de son profil"), "le panneau du cadre 138 est posé");

            // La référence 137-141 est une CHAÎNE de cuves, pas quatre cartes de texte : chaque bande servie produit une jauge
            // qualitative distincte et les quatre étapes sont reliées par exactement trois tuyaux.
            GameObject racine = GameObject.Find("FiliereRoot");
            Transform[] tous = racine.GetComponentsInChildren<Transform>(true);
            Assert.AreEqual(4, tous.Count(t => t.name == "Cuve"), "une cuve par étape");
            Assert.AreEqual(3, tous.Count(t => t.name.StartsWith("Connecteur")), "N étapes ⇒ N−1 connecteurs");
            int[] niveauxAttendus = { 1, 2, 4, 4 };
            for (int i = 1; i <= 4; i++)
            {
                Transform etape = tous.First(t => t.name == "Etape" + i);
                Transform niveau = etape.Find("Cuve/Niveau");
                Assert.IsNotNull(niveau, $"Etape{i} porte le niveau de sa cuve");
                Assert.AreEqual(niveauxAttendus[i - 1], niveau.GetComponent<UnityEngine.UI.LayoutElement>().flexibleWidth, 0.001f,
                    $"Etape{i} : la bande qualitative porte son cran, sans scalaire brut");
            }

            Transform compteurs = tous.First(t => t.name == "Compteurs");
            for (int i = 0; i < 3; i++)
            {
                UnityEngine.UI.LayoutElement largeur = compteurs.Find("Compteur" + i).GetComponent<UnityEngine.UI.LayoutElement>();
                Assert.AreEqual(0f, largeur.preferredWidth, 0.001f, $"Compteur{i} n'hérite pas de la largeur de son libellé");
                Assert.AreEqual(1f, largeur.flexibleWidth, 0.001f, $"Compteur{i} prend exactement un tiers disponible");
            }
            string comptePropres = compteurs.Find("Compteur1/Nombre").GetComponent<TMPro.TextMeshProUGUI>().text;
            StringAssert.StartsWith("01", comptePropres, "seule la sortie terminale CLEAN est comptée");
            StringAssert.Contains("/4", comptePropres, "le dénominateur vient du nombre d'étapes servi");
            Assert.AreEqual("PROPRE AU BOUT", compteurs.Find("Compteur1/Libelle").GetComponent<TMPro.TextMeshProUGUI>().text);
            Assert.IsNotNull(tous.First(t => t.name == "Enseigne").Find("FiletOr"), "le filet or ferme l'enseigne");
            Assert.AreEqual(9, racine.GetComponentsInChildren<UnityEngine.UI.Outline>(true).Length,
                "enseigne + 3 compteurs + 4 étapes + panneau portent leur liseré");
        }

        /// <summary>État FABRIQUÉ : une étape du pipeline n'a pas de `stage_index` dans la liste ⇒ l'ordre du SERVEUR est gardé
        /// (aucun rang inventé), et le drapeau le dit ; aucun écart lu ⇒ compteur 0.</summary>
        [Test]
        public void Fabrique_EtapeSansStageIndex_GardeLOrdreDuServeur()
        {
            var ecran = MonterEcran();
            var dto = new LaunderingPipelineDto { stages = new[] { Etape("b", "PARTIAL"), Etape("a", "DIRTY"), Etape("x", "CLEAN", true) } };
            var liste = new LaunderingNodesDto { nodes = new[] { Noeud("a", 1), Noeud("b", 2) } };
            LogAssert.Expect(LogType.Warning, new System.Text.RegularExpressions.Regex(@"\[FILIERE\] ordre du SERVEUR gardé"));
            ecran.RendrePourTest(dto, liste, null);

            Assert.IsFalse(ecran.OrdreParStageIndex, "« x » n'a pas de stage_index : l'ordre ne peut pas venir de la liste");
            CollectionAssert.AreEqual(new[] { "b", "a", "x" }, ecran.OrdreAffiche.ToList(), "ordre du serveur gardé tel quel");
            Assert.AreEqual(0, ecran.EcartsAffiches);
        }
        // ═══ La propreté d'une étape : table 48 de l'atelier (edf98ebf), `filiere.proprete.<valeur>` ════════════════════

        /// <summary>Couverture du domaine servi (`CleanlinessBucket`, 4 valeurs) avec les mots EXACTS de la table 48 ; hors domaine,
        /// « état inconnu » (jamais la valeur brute) ; absente, « — » ; quatre mots distincts.</summary>
        [Test]
        public void Proprete_CouvreLeDomaine_AvecLesMotsDeLaTable48()
        {
            CollectionAssert.AreEqual(new[] { "DIRTY", "PARTIAL", "MOSTLY_CLEAN", "CLEAN" }, PureteResolvers.Domaine,
                "le domaine du back (city-event-bus.ts:331), dans l'ordre de l'échelle");
            Assert.AreEqual("sale", PureteResolvers.Libelle("DIRTY"));
            Assert.AreEqual("à moitié", PureteResolvers.Libelle("PARTIAL"));
            Assert.AreEqual("presque propre", PureteResolvers.Libelle("MOSTLY_CLEAN"));
            Assert.AreEqual("propre", PureteResolvers.Libelle("CLEAN"));
            Assert.AreEqual(4, PureteResolvers.Domaine.Select(PureteResolvers.Libelle).Distinct().Count(), "quatre mots distincts");
            Assert.AreEqual("état inconnu", PureteResolvers.Libelle("SPOTLESS"), "hors domaine : le mot de la famille des bandes");
            Assert.AreEqual("—", PureteResolvers.Libelle(null));
            Assert.AreEqual("—", PureteResolvers.Libelle(""));
        }

        /// <summary>⛔ GARDE DE VALEUR SUR UN CORPS RÉEL — `GET /v1/operational/laundering/{node}/pipeline` capturé sur la pile le
        /// 2026-09-07 (`Tools/juge-donnees/ecran-principal/cloture-2026-09-07/mesures/14-laundering-pipeline.json`, enveloppe
        /// complète), désérialisé par l'enveloppe du client et rendu par ㊵ : la bande servie `PARTIAL` s'affiche « à moitié »,
        /// jamais « PARTIAL ». Contrôle positif : le corps porte bien une bande (sinon la garde ne mesurerait rien).</summary>
        [UnityTest]
        public IEnumerator Proprete_CorpsReel_LaBandeServieSAfficheAvecSonMot()
        {
            string chemin = System.IO.Path.Combine(Application.dataPath, "..",
                "Tools/juge-donnees/ecran-principal/cloture-2026-09-07/mesures/14-laundering-pipeline.json");
            Assert.IsTrue(System.IO.File.Exists(chemin), "le corps réel capturé est présent");
            LaunderingPipelineDto dto = JsonUtility.FromJson<LaunderingPipelineEnvelope>(System.IO.File.ReadAllText(chemin))?.payload?.data;
            Assert.IsNotNull(dto?.stages, "le corps réel se lit par l'enveloppe du client");
            Assert.AreEqual(1, dto.stages.Length);
            Assert.AreEqual("PARTIAL", dto.stages[0].cleanliness_band, "contrôle positif : la bande servie est là");

            var ecran = MonterEcran();
            ecran.RendrePourTest(dto);
            yield return null;

            Transform etape = GameObject.Find("FiliereRoot").GetComponentsInChildren<Transform>(true).FirstOrDefault(t => t.name == "Etape1");
            Assert.IsNotNull(etape, "Etape1 rendue");
            var titre = etape.Find("Titre")?.GetComponent<TMPro.TextMeshProUGUI>();
            Assert.IsNotNull(titre, "le titre de l'étape");
            Assert.AreEqual("à moitié", titre.text, "le mot de la table 48, jamais la valeur brute « PARTIAL »");
        }

    }
}
