using System.Collections;
using System.Collections.Generic;
using NUnit.Framework;
using UnityEngine;
using UnityEngine.UI;
using UnityEngine.TestTools;
using MafiaCleanCity.Operational;
using MafiaCleanCity.CityMap;   // REUSE AuthClient (signup) — patron ㊲ OuvrirJoueurFrais
using MafiaCleanCity.Tests;     // SeederSupport.SafeCallsign
using Object = UnityEngine.Object;

namespace MafiaCleanCity.Operational.Tests
{
    /// <summary>ecran_appro « La chaîne d'appro » — suite du chantier de métier du 2026-09-03.
    ///
    /// COUVERT : le montage structurel (CanvasRenderer, MaskableGraphic), la capture pour le juge
    /// visuel (armée, jamais exécutée cette passe — éditeur non lancé), un PARCOURS joueur réel
    /// (§P, signup → découverte du bâtiment → la route, patron `ReputationScreenPlayModeTests`
    /// (㊲) `OuvrirJoueurFrais`), les trois états pilotés par la donnée (§E, via `RendrePourTest`)
    /// et les résolveurs du seul domaine fermé confirmé (§R). NON EXÉCUTÉ cette passe (aucun test
    /// n'a tourné, seule la COMPILATION est prouvée — voir implementation-notes.md).
    /// NON COUVERT : le geste « EN COMMANDER » de bout en bout contre le vrai back (P1 s'arrête
    /// au chargement de la fiche, il ne passe pas de commande — `PasserCommandeEtRecharger()` est
    /// exposée pour un futur test qui le ferait), et l'état « livrée » (aucune maquette, copie
    /// inventée — voir implementation-notes.md § Deviations).</summary>
    [Category("EcranAppro")]
    public class ChaineDApproScreenPlayModeTests
    {
        // ⛔ TD-576, CLASSE « CATALOGUE » (2026-09-23) — cette classe charge le catalogue i18n (directement, ou en montant un
        // écran / le shell / la scène du build qui l'amorce) et ne le rendait JAMAIS : global statique, il passait à la classe
        // suivante. Mesuré : le 1er cas d'`ArchetypeServi_…` a hérité d'un bundle réel laissé en amont. Rendu à chaque test ;
        // la garde de sortie de MafiaCI nomme toute classe qui le laisserait encore chargé.
        [TearDown] public void OublierLeCatalogue() => MafiaCleanCity.I18n.I18nCatalog.Oublier();

        private GameObject hostGo;
        private HashSet<int> ecransAvant = new HashSet<int>();

        // ⛔ TD-576, LA MÊME CLASSE (22/09) — le contrôleur CHARGE PAR LE RÉSEAU (`Charger()`), et le TearDown le
        // détruisait en `Destroy` DIFFÉRÉ : il survivait une frame au test, sa coroutine en vol. Il n'écrit aucun
        // `LogError`, donc son sursis n'avait encore accusé personne — c'est exactement la forme qui a produit le
        // rouge d'Ecran9, en silence. ⇒ `DestroyImmediate`, et la garde de sortie ci-dessous.
        private static IEnumerable<ChaineDApproScreenController> EcransVivants() =>
            Object.FindObjectsByType<ChaineDApproScreenController>(FindObjectsInactive.Include, FindObjectsSortMode.None);

        /// <summary>Les écrans nés APRÈS le relevé du `[SetUp]` et encore vivants (un résidu d'une autre classe
        /// est dans le relevé : il n'accuse pas celle-ci).</summary>
        private List<string> Survivants()
        {
            var l = new List<string>();
            foreach (var e in EcransVivants())
                if (!ecransAvant.Contains(e.GetInstanceID())) l.Add(e.gameObject.name);
            return l;
        }

        [SetUp]
        public void ReleverLesEcrans()
        {
            ecransAvant = new HashSet<int>();
            foreach (var e in EcransVivants()) ecransAvant.Add(e.GetInstanceID());
        }

        [TearDown]
        public void TearDown()
        {
            GameObject reste = GameObject.Find("ChaineDApproRoot");
            while (reste != null) { Object.DestroyImmediate(reste); reste = GameObject.Find("ChaineDApproRoot"); }
            if (hostGo != null) Object.DestroyImmediate(hostGo);
            hostGo = null;

            // ⛔ GARDE DE SORTIE : zéro écran né pendant ce test encore vivant. Rouge ICI, le test FAUTIF est nommé.
            List<string> survivants = Survivants();
            Assert.IsEmpty(survivants, "TD-576 : écran(s) orphelin(s) en sortie de test — " +
                string.Join(", ", survivants) + ". Un montage hors de `hostGo` survit au TearDown.");
        }

        /// <summary>⛔ CONTRÔLE POSITIF de la garde de sortie : un écran monté hors de `hostGo` est NOMMÉ, et plus
        /// rien une fois détruit. Hôte INACTIF : ni `Awake` ni `Start`, aucune requête.</summary>
        [Test]
        public void LaGardeDeSortie_NommeUnEcranOrphelin()
        {
            var orphelin = new GameObject("EcranOrphelinVolontaire");
            orphelin.SetActive(false);
            orphelin.AddComponent<ChaineDApproScreenController>();
            try
            {
                CollectionAssert.Contains(Survivants(), "EcranOrphelinVolontaire",
                    "la garde ne voit pas un écran monté hors de `hostGo` : elle ne mordrait jamais");
            }
            finally { Object.DestroyImmediate(orphelin); }
            CollectionAssert.IsEmpty(Survivants(), "détruit en immédiat, il ne doit plus être compté");
        }

        /// <summary>La racine RÉELLE de l'écran n'est PAS `hostGo` : hors shell, le contrôleur
        /// découvre un Canvas et bâtit dessous (patron ㊲, ligne pour ligne). Chercher
        /// `hostGo.GetComponentsInChildren` rendrait ZÉRO en silence.</summary>
        private GameObject RacineEcran()
        {
            GameObject r = GameObject.Find("ChaineDApproRoot");
            Assert.IsNotNull(r, "ChaineDApproRoot introuvable : le contrôleur n'a pas construit sa " +
                                "mise en page (ni sous mountParent, ni sous un Canvas découvert)");
            return r;
        }

        private ChaineDApproScreenController MonterEcran()
        {
            hostGo = new GameObject("ChaineDApproScreen", typeof(RectTransform));
            var ecran = hostGo.AddComponent<ChaineDApproScreenController>();
            return ecran;
        }

        // ═══ 1. GARDE STRUCTURELLE — ne lit aucun pixel, ne dépend d'aucune résolution ═══════

        /// <summary>⛔ TOUT `Graphic` PORTE SON `CanvasRenderer`, et TOUT Graphic sous ce fond
        /// est `MaskableGraphic` (donc masquable par un futur `Mask` parent) — patron ㊲, garde
        /// structurelle AVANT toute garde de valeur (c'est celle qui a fermé la classe
        /// "occlusion par fratrie" en 12 lignes là où 4 tours de gardes pixel n'y voyaient rien).
        ///
        /// ⚠️ Anti-vacuité : `AddComponent<ChaineDApproScreenController>()` seul construit déjà le
        /// fond de `BuildLayout()` (appelé depuis `Awake()`), donc CETTE garde mord même sur le
        /// squelette non rempli — au moins 1 Graphic (le fond). Une fois le MÉTIER ICI de
        /// `BuildLayout()` rempli, relever le plancher `Assert.Greater(comptes, 1, ...)` vers une
        /// valeur qui reflète le contenu réel (㊲ l'a posé à 10).</summary>
        [UnityTest]
        public IEnumerator EcranApproS1_ToutGraphic_PorteSonCanvasRenderer()
        {
            MonterEcran();
            yield return null;   // laisser Awake()/BuildLayout() s'exécuter

            var sansRenderer = new List<string>();
            var nonMaskable = new List<string>();
            int comptes = 0;
            foreach (Graphic g in RacineEcran().GetComponentsInChildren<Graphic>(true))
            {
                comptes++;
                if (g.GetComponent<CanvasRenderer>() == null) sansRenderer.Add(g.name);
                if (!(g is MaskableGraphic)) nonMaskable.Add(g.name);
            }

            // ⛔ PLANCHER RELEVÉ (patron ㊲, note du squelette : « une fois BuildLayout() rempli,
            // relever le plancher vers une valeur qui reflète le contenu réel »). `BuildLayout()`
            // construit désormais, SANS aucune donnée (`MonterEcran()` seul, pas de `Charger()`) :
            // le fond (1) + le titre (1) + le sous-titre (1) — au moins 3, TOUJOURS, même à vide.
            // Valeur non vérifiée en éditeur (consigne : ne pas lancer Unity) — voir
            // implementation-notes.md § Deviations.
            Assert.Greater(comptes, 2,
                "moins de 3 Graphic dans l'arbre — le squelette (fond+titre+sous-titre) construit " +
                "par BuildLayout() n'est pas au complet, la garde suivante serait sous-scopée");
            Assert.IsEmpty(sansRenderer,
                "des Graphic sans CanvasRenderer ne dessinent RIEN, en silence : " +
                string.Join(", ", sansRenderer));
            Assert.IsEmpty(nonMaskable,
                "des Graphic non-MaskableGraphic ignoreraient tout Mask parent (un `Graphic` nu " +
                "dérivé sur mesure, jamais `UnityEngine.UI.Image`/`TextMeshProUGUI`) : " +
                string.Join(", ", nonMaskable));
        }

        // ═══ 2. LA CAPTURE HORS SHELL A ÉTÉ RETIRÉE — mesurée VIDE, et sa garde la certifiait ═
        //
        // ⛔⛔ Ce que le gabarit posait ici photographiait un écran NON MONTÉ et NON CHARGÉ :
        // `MonterEcran()` fait un `AddComponent` nu — pas de shell, pas de `SetMountParent`, pas
        // de jeton, pas d'appel à `Charger()` — puis la capture partait UNE frame plus tard.
        // Mesuré le 2026-09-03 sur les PNG produits, en comptant les teintes distinctes quantifiées
        // à 5 bits par canal, exactement comme la garde de variété du dépôt :
        //     ecran_appro_1080x1920.png                 →   2 teintes
        //     ecran_appro_1080x2400.png                 →   2 teintes
        //     planche_la_chaine_d_appro_1080x2400.png   → 563 teintes   (sous le chrome réel)
        //     planche_la_distribution_1080x2400.png     → 573 teintes   (sous le chrome réel)
        // Deux teintes, c'est un fond et un titre. Une session voisine a fait le même constat sur
        // ㉘ et a retiré la catégorie du filtre plutôt que de commiter l'image.
        //
        // ★ ET LA GARDE ANTI-VACUITÉ DU GABARIT CERTIFIAIT CE VIDE. Elle assertait
        // `horsFond > 0` — « l'image n'est pas parfaitement uniforme » — avec un plancher que son
        // propre commentaire déclarait « volontairement bas, à durcir une fois BuildLayout()
        // rempli ». Un écran qui rend son fond ET son titre la satisfait. *Une garde qui mesure la
        // mauvaise propriété est pire que pas de garde : elle certifie le défaut.* Et le
        // durcissement différé n'est jamais venu — un différé sans détecteur n'est pas un différé,
        // c'est un trou.
        //
        // ⇒ La capture de cet écran vit dans `PlancheChantierCCapturePlayModeTests`, qui le monte
        // SOUS LE CHROME RÉEL par `CaptureSousShell`, attend un chargement abouti, et mesure le
        // rect du locataire — pas l'encre de toute l'image. Deux résolutions sont par ailleurs hors
        // du régime de la semaine (une capture par écran).
        // ⚠️ Le patron retiré ici existe encore dans 5 autres suites du dépôt, dont 3 montent
        // aussi hors shell : ce lot ferme l'instance, pas la classe.

        // ═══ Fixture parcours : un joueur à soi, patron ㊲ `OuvrirJoueurFrais` ═══════════════════

        private static string BaseUrl => MafiaCleanCity.AdresseDuBack.Url;   // la source du shell (garde de classe, 26/09)
        private static int callsignSeq;
        private string token;

        private IEnumerator OuvrirJoueurFrais()
        {
            var auth = new AuthClient { BaseUrl = BaseUrl };
            string callsign = SeederSupport.SafeCallsign("appro", ref callsignSeq);
            string err = null;
            token = null;
            yield return auth.SignUp(callsign, "screen-appro-pw", t => token = t, e => err = e);
            Assert.IsNull(err, $"signup a échoué : {err}");
            Assert.IsNotNull(token, "signup n'a pas rendu de jeton");

            // ⛔ Le régime, RÉTABLI et non supposé (patron ㊲) : on ferme toute session qu'un
            // voisin — ou ce signup lui-même — aurait pu laisser ouverte.
            yield return FermerSession();
        }

        private IEnumerator FermerSession()
        {
            using (var req = new UnityEngine.Networking.UnityWebRequest(
                       BaseUrl + "/v1/session/close", "POST"))
            {
                req.uploadHandler = new UnityEngine.Networking.UploadHandlerRaw(
                    System.Text.Encoding.UTF8.GetBytes("{}"));
                req.downloadHandler = new UnityEngine.Networking.DownloadHandlerBuffer();
                req.SetRequestHeader("Content-Type", "application/json");
                MafiaCleanCity.ClientHttp.Authentifier(req, token);
                MafiaCleanCity.ClientHttp.Idempotent(req);
                yield return req.SendWebRequest();
                // Un 404/409 est normal si aucune session n'est ouverte : on ferme, on n'exige pas.
            }
        }

        // ═══ P — PARCOURS joueur réel (doctrine 4-couches, CLAUDE.md § « quatre couches ») ═══════
        //
        // signup → découverte du bâtiment (§4/§5 du brief, districts+interior, JAMAIS un seed
        // SQL) → `GET .../precursors`. C'est le SEUL test qui ferme les six formes de chaîne
        // morte pour cet écran : un vert ici prouve qu'un joueur qui vient de naître peut
        // atteindre sa fiche, pas seulement que le moteur calcule juste.
        [UnityTest]
        public IEnumerator EcranApproP1_ParcoursJoueurReel_DecouvreSonBatimentEtChargeLaFiche()
        {
            yield return OuvrirJoueurFrais();

            var ecran = MonterEcran();
            ecran.SetToken(token);
            yield return ecran.Charger();

            Assert.IsNotNull(ecran.BuildingIdDecouvert,
                "aucun bâtiment découvert — la prémisse de cet écran (un district PLAYER_HELD " +
                "possédant au moins un bâtiment sur un compte fraîchement signé) ne tient pas, " +
                "et ce n'est pas un défaut de CET écran mais du kit de départ");
            Assert.IsNull(ecran.DerniereErreur, $"Charger() a levé une erreur : {ecran.DerniereErreur}");
            Assert.IsNotNull(ecran.DernierChargement,
                "GET /v1/operational/precursors n'a rien rendu pour le bâtiment découvert");

            // Épingle sur l'ENSEMBLE DE CLÉS consommé (précédent maison :
            // tutorial_overlay_session_open_non_regression.spec.ts) — les 9 clés mesurées le
            // 2026-09-03, pas un sous-ensemble choisi après coup.
            GetOperationalPrecursorsResponseDto dto = ecran.DernierChargement;
            Assert.IsNotNull(dto.building, "clé absente : building");
            Assert.IsNotNull(dto.precursor_type, "clé absente : precursor_type");
            Assert.IsNotNull(dto.stock_band, "clé absente : stock_band");
            Assert.IsNotNull(dto.stock_liters_label, "clé absente : stock_liters_label");
            Assert.IsNotNull(dto.price_trend_bucket, "clé absente : price_trend_bucket");
            Assert.IsNotNull(dto.supplier_pressure_bucket, "clé absente : supplier_pressure_bucket");
            // has_pending_order / has_arrived_order / scarcity_active sont des bool — toujours
            // présents côté C# (pas de forme "absente" possible pour un champ non-nullable).

            Assert.Greater(ecran.RenderedTexts.Count, 0, "aucun texte rendu — la fiche est vide");
        }

        // ═══ E — États pilotés par la donnée (RendrePourTest, patron ㊲ §5) ═════════════════════
        //
        // ⛔ Ne prouvent jamais que le back émet ces corps — seulement ce que l'écran EN FAIT.
        // La preuve du corps RÉEL est P1 ci-dessus.

        private static GetOperationalPrecursorsResponseDto CorpsFabrique(
            bool enCours = false, bool arrivee = false, string stockBand = "NONE",
            string prixBucket = "UP", string pressionBucket = "STRAINED", bool penurie = true)
        {
            return new GetOperationalPrecursorsResponseDto
            {
                building = "00000000-0000-4000-8000-000000000000",
                precursor_type = "PYRALIN",
                stock_band = stockBand,
                has_pending_order = enCours,
                has_arrived_order = arrivee,
                stock_liters_label = "0 L",
                price_trend_bucket = prixBucket,
                scarcity_active = penurie,
                supplier_pressure_bucket = pressionBucket,
            };
        }

        [UnityTest]
        public IEnumerator EcranApproE1_EtatRepos_ConstruitLaFicheEtLeBoutonActif()
        {
            var ecran = MonterEcran();
            ecran.RendrePourTest(CorpsFabrique());
            yield return null;

            // Les quatre valeurs de la fiche (m-48), le bouton, et la pénurie (scarcity_active).
            CollectionAssert.Contains(ecran.RenderedTexts, "il n’y a plus rien · 0 L",
                "ligne CE QU'IL EN RESTE absente ou mal composée");
            CollectionAssert.Contains(ecran.RenderedTexts, "le prix monte", "résolveur prix (UP) muet");
            CollectionAssert.Contains(ecran.RenderedTexts, "il vous fait attendre exprès",
                "résolveur fournisseur (STRAINED) muet");
            CollectionAssert.Contains(ecran.RenderedTexts, "EN COMMANDER",
                "le bouton n'est pas construit en état repos");
            CollectionAssert.Contains(ecran.RenderedTexts, "Il y a une pénurie en ville",
                "scarcity_active=true ne produit pas la bannière");
        }

        private static Rect Monde(RectTransform rt)
        {
            var c = new Vector3[4];
            rt.GetWorldCorners(c);
            return Rect.MinMaxRect(c[0].x, c[0].y, c[2].x, c[2].y);
        }

        private static Transform Trouver(Transform racine, string nom)
        {
            foreach (Transform x in racine.GetComponentsInChildren<Transform>(true))
                if (x.name == nom) return x;
            return null;
        }

        /// <summary>㉚ B2 / B3 (juge du 07/10, corrigés le 08/10) — gardes d'EFFET : la perforation a des texels opaques ET des vides, sur toute la largeur du bon,
        /// et le geste porte sa légende À DROITE de son libellé. La perforation est reposée quand le bon est RE-rendu.</summary>
        [UnityTest]
        public IEnumerator EcranApproE1b_PerforationDuBon_EtLegendeDuGeste()
        {
            var ecran = MonterEcran();
            ecran.RendrePourTest(CorpsFabrique());
            yield return null;
            yield return null;
            Canvas.ForceUpdateCanvases();
            Transform racine = RacineEcran().transform;

            Transform fiche = Trouver(racine, "Fiche");
            Transform perfo = Trouver(fiche, "Perforation");
            Assert.IsNotNull(perfo, "B2 : le bon porte sa perforation (`.bon::after`)");
            Image img = perfo.GetComponent<Image>();
            Assert.IsNotNull(perfo.GetComponent<CanvasRenderer>());
            Assert.AreEqual(Image.Type.Tiled, img.type, "un motif répété, pas un aplat");
            Texture2D tex = img.sprite.texture;
            int opaques = 0, vides = 0;
            foreach (Color32 px in tex.GetPixels32()) { if (px.a > 0) opaques++; else vides++; }
            Assert.Greater(opaques, 0, "B2 : des créneaux opaques");
            Assert.Greater(vides, 0, "B2 : …séparés de vides (`#cbbfa4 0 4px, transparent 4px 8px`)");
            Assert.AreEqual(opaques, vides, "B2 : trait = vide (4 px / 4 px)");
            Rect rf = Monde((RectTransform)fiche), rp = Monde((RectTransform)perfo);
            Assert.AreEqual(rf.width, rp.width, 0.5f, "B2 : sur toute la largeur du bon (`left:0;right:0`)");
            Assert.AreEqual(rf.yMin, rp.yMin, 0.5f, "B2 : au bas du bon (`bottom:0`)");
            Assert.Greater(rp.height, 0.4f, "B2 : une hauteur RENDUE");

            // B3 : la légende du geste, à droite de son libellé
            Transform geste = Trouver(racine, "Geste");
            Assert.IsNotNull(geste, "le geste de la bande basse");
            var lib = Trouver(geste, "Libelle").GetComponent<TMPro.TextMeshProUGUI>();
            var leg = Trouver(geste, "Legende").GetComponent<TMPro.TextMeshProUGUI>();
            Assert.AreEqual("EN COMMANDER", lib.text);
            Assert.AreEqual("ça part du compte tout de suite", leg.text, "B3 : la note de droite du geste (cadre 48)");
            Assert.Greater(Monde(leg.rectTransform).center.x, Monde(lib.rectTransform).center.x, "B3 : à DROITE du libellé");
            Assert.Less(Monde(leg.rectTransform).xMax, Monde((RectTransform)geste).xMax, "B3 : dans le geste");

            // le bon re-rendu (commande en cours) garde sa perforation
            ecran.RendrePourTest(CorpsFabrique(enCours: true, penurie: false));
            yield return null;
            Assert.IsNotNull(Trouver(Trouver(RacineEcran().transform, "Fiche"), "Perforation"), "B2 : reposée après un nouveau rendu");
        }

        [UnityTest]
        public IEnumerator EcranApproE2_EtatCommandeEnCours_AfficheLaLigneCommandeSansBouton()
        {
            var ecran = MonterEcran();
            ecran.RendrePourTest(CorpsFabrique(enCours: true, penurie: false));
            yield return null;

            CollectionAssert.Contains(ecran.RenderedTexts, "est en route",
                "la 5e ligne LA COMMANDE n'apparaît pas quand has_pending_order=true");
            CollectionAssert.DoesNotContain(ecran.RenderedTexts, "EN COMMANDER",
                "le bouton EN COMMANDER ne doit PAS être construit pendant une commande en cours " +
                "(m-49 : aucun bouton actif, seulement une note système)");
        }

        [UnityTest]
        public IEnumerator EcranApproE3_ChaineVide_AfficheUnMessageHonnetePasUneListeFabriquee()
        {
            var ecran = MonterEcran();
            ecran.RendrePourTestChaine(new GetSupplyChainGraphResponseDto
            {
                nodes = new SupplyChainNodeDto[0],
                legs = new SupplyChainLegDto[0],
                routes = new SupplyChainRouteDto[0],
            });
            yield return null;

            CollectionAssert.Contains(ecran.RenderedTexts,
                ValeurAttendue.De("appro", "bloc", "Rien à remonter pour l’instant — la chaîne ne connaît aucun maillon sur ce compte."),
                "l'état vide de la section chaîne n'affiche pas le message honnête attendu");
            // Anti-fabrication : aucun des libellés de crans de la maquette (m-50/51/52, jamais
            // sourcés) ne doit apparaître.
            CollectionAssert.DoesNotContain(ecran.RenderedTexts, "Le labo de Spine-B",
                "un cran de la maquette d'enquête a été fabriqué alors qu'aucune donnée ne le porte");
        }

        // ═══ G — Cadre 154 « La chaîne vue du graphe » (atelier 4ae50cca, RATIFIÉ ; design `Tools/appro-maillons/DESIGN.md`) ═══════════
        //
        // ⛔ TD-985 FERMÉE : le détecteur « titre + phrase provisoire = 2 enfants » est REMPLACÉ par les gardes d'effet ci-dessous (la phrase
        // provisoire et celle de la table 63 sont retirées, rulings f2 (A) et (a) du 11/11). Le corps de G1 est le cadre MÊME : 5 maillons
        // dont 2 « Engorgé » et 1 flèche, 4 liaisons dont 1 contournée — donné au contrôleur dans le DÉSORDRE (le back ne sert aucun ordre).

        private const string GabaritNom = "{enseigne} — {district}, îlot {block}";

        private static MafiaCleanCity.Shell.BatimentPossedeDto Batiment(string id, string enseigne, string block) =>
            new MafiaCleanCity.Shell.BatimentPossedeDto
            {
                building = id,
                name_i18n = new MafiaCleanCity.Shell.NomDeBatimentI18nDto
                {
                    key = "game.fiction.building.name",
                    @params = new MafiaCleanCity.Shell.NomDeBatimentParamsDto { enseigne = enseigne, district = "La Lisière", block = block },
                },
            };

        private static MafiaCleanCity.Shell.BatimentPossedeDto[] BatimentsDuCadre() => new[]
        {
            Batiment("b1501", "Soudure Varne", "1501"), Batiment("b1502", "Réserve Nock", "1502"), Batiment("b1503", "Clés-Minute Rook", "1503"),
            Batiment("b1504", "Consigne de la Threnny", "1504"), Batiment("b1505", "Billard Marr", "1505"),
        };

        private static SupplyChainNodeDto Noeud(string id, string bucket, string vers = null) =>
            new SupplyChainNodeDto { building_id = id, bucket = bucket, has_arrow = vers != null, arrow_to_building_id = vers };

        private static SupplyChainLegDto Lien(string id, string de, string vers, string dette, bool contournee = false) =>
            new SupplyChainLegDto { leg_id = id, origin_building_id = de, destination_building_id = vers, debt_bucket = dette, bypassed = contournee };

        /// <summary>Le graphe du cadre 154, dans un ordre BROUILLÉ.</summary>
        private static GetSupplyChainGraphResponseDto GrapheDuCadre() => new GetSupplyChainGraphResponseDto
        {
            nodes = new[]
            {
                Noeud("b1502", "silent"), Noeud("b1503", "warm", vers: "b1501"), Noeud("b1504", "mild"), Noeud("b1501", "critical"), Noeud("b1505", "warm"),
            },
            legs = new[]
            {
                Lien("l4", "b1502", "b1505", "fresh"), Lien("l2", "b1505", "b1503", "stressed", contournee: true),
                Lien("l1", "b1503", "b1501", "fractured"), Lien("l3", "b1504", "b1502", "accruing"),
            },
            routes = new SupplyChainRouteDto[0],
        };

        private static string Nom(string enseigne, string block) =>
            ValeurAttendue.Cle("game.fiction.building.name", GabaritNom,
                new Dictionary<string, string> { { "enseigne", enseigne }, { "district", "La Lisière" }, { "block", block } });

        private static void ServirLeNomDesBatiments() =>
            MafiaCleanCity.I18n.I18nCatalog.ChargerPourTest("fr", new Dictionary<string, string> { { "game.fiction.building.name", GabaritNom } });

        private Transform ContenuDeLaChaine()
        {
            Transform c = Trouver(hostGo.transform, "ContenuChaine");
            if (c == null) c = Trouver(RacineEcran().transform, "ContenuChaine");
            return c;
        }

        private static List<Transform> Enfants(Transform parent, string nom)
        {
            var l = new List<Transform>();
            if (parent == null) return l;
            foreach (Transform t in parent) if (t.name == nom) l.Add(t);
            return l;
        }

        private static string TexteDe(Transform racine, string nom)
        {
            Transform t = Trouver(racine, nom);
            return t != null ? t.GetComponent<TMPro.TextMeshProUGUI>().text : null;
        }

        /// <summary>G1 — l'ORDRE et l'EFFET : les noms SERVIS, dans l'ordre du cadre (bande de la pire à la meilleure, puis nom affiché), chaque
        /// maillon dit sa bande ; les liaisons idem (Rompu → Entretenu). CONTRÔLE : le corps est donné brouillé — un rendu dans l'ordre servi
        /// rougirait. Et la phrase provisoire de TD-985 n'apparaît plus.</summary>
        [UnityTest]
        public IEnumerator EcranApproG1_Cadre154_LesMaillonsEtLesLiaisonsDansLOrdreDuCadre_AvecLeursBandes()
        {
            ServirLeNomDesBatiments();
            var ecran = MonterEcran();
            ecran.RendrePourTestChaine(GrapheDuCadre(), BatimentsDuCadre());
            yield return null;
            Transform contenu = ContenuDeLaChaine();
            Assert.IsNotNull(contenu, "anti-vacuité : la fenêtre de la chaîne est construite");

            List<Transform> maillons = Enfants(contenu, "Maillon");
            CollectionAssert.AreEqual(
                new[] { Nom("Soudure Varne", "1501"), Nom("Billard Marr", "1505"), Nom("Clés-Minute Rook", "1503"),
                        Nom("Consigne de la Threnny", "1504"), Nom("Réserve Nock", "1502") },
                maillons.ConvertAll(m => TexteDe(m, "Nom")), "l'ordre du cadre 154 : bande (pire → meilleure), puis nom affiché");
            CollectionAssert.AreEqual(
                new[] { ValeurAttendue.Cle("appro.pression.critical", "Ne livre plus"), ValeurAttendue.Cle("appro.pression.warm", "Engorgé"),
                        ValeurAttendue.Cle("appro.pression.warm", "Engorgé"), ValeurAttendue.Cle("appro.pression.mild", "Ça commence à s’accumuler"),
                        ValeurAttendue.Cle("appro.pression.silent", "Rien ne bloque") },
                maillons.ConvertAll(m => TexteDe(m, "Mot")), "chaque maillon dit sa bande, par la clé de sa VALEUR servie");

            var liaisons = new List<Transform>();
            foreach (Transform t in contenu) if (t.name == "Liaison" || t.name == "LiaisonContournee") liaisons.Add(t);
            CollectionAssert.AreEqual(
                new[] { Nom("Clés-Minute Rook", "1503"), Nom("Billard Marr", "1505"), Nom("Consigne de la Threnny", "1504"), Nom("Réserve Nock", "1502") },
                liaisons.ConvertAll(l => TexteDe(l, "Origine")), "les liaisons : dette (Rompu → Entretenu)");
            CollectionAssert.AreEqual(
                new[] { ValeurAttendue.Cle("appro.dette.fractured", "Rompu"), ValeurAttendue.Cle("appro.dette.stressed", "Tient à peine"),
                        ValeurAttendue.Cle("appro.dette.accruing", "L’entretien prend du retard"), ValeurAttendue.Cle("appro.dette.fresh", "Entretenu") },
                liaisons.ConvertAll(l => TexteDe(l, "Mot")));

            CollectionAssert.Contains(ecran.RenderedTexts, ValeurAttendue.Cle("appro.titre.la_chaine", "La chaîne"), "l'en-tête du cadre remplace « LA CHAÎNE, EN REMONTANT »");
            CollectionAssert.DoesNotContain(ecran.RenderedTexts, ValeurAttendue.De("appro", "bloc", "LA CHAÎNE, EN REMONTANT"));
            CollectionAssert.DoesNotContain(ecran.RenderedTexts,
                ValeurAttendue.Cle("appro.bloc.des_maillons_existent_mais_cet_ecran_ne_sait_pas_encore_les_afficher",
                    "Des maillons existent, mais cet écran ne sait pas encore les afficher."), "TD-985 fermée : la phrase provisoire est retirée");
        }

        /// <summary>G2 — la flèche suit `has_arrow`, POINT (P1 du juge du cadre) : deux maillons `warm`, un seul la porte ⇒ UN « refoule vers »,
        /// sur Clés-Minute Rook, vers Soudure Varne. CONTRÔLE : `has_arrow=false` partout, MÊME avec `arrow_to_building_id` renseigné ⇒ 0.</summary>
        [UnityTest]
        public IEnumerator EcranApproG2_LaFlecheSuitHasArrow_EtRienDAutre()
        {
            ServirLeNomDesBatiments();
            var ecran = MonterEcran();
            ecran.RendrePourTestChaine(GrapheDuCadre(), BatimentsDuCadre());
            yield return null;
            var avecFleche = new List<string>();
            foreach (Transform m in Enfants(ContenuDeLaChaine(), "Maillon")) if (Trouver(m, "Refoule") != null) avecFleche.Add(TexteDe(m, "Nom"));
            CollectionAssert.AreEqual(new[] { Nom("Clés-Minute Rook", "1503") }, avecFleche, "une seule flèche, sur le seul maillon qui la porte");
            CollectionAssert.Contains(ecran.RenderedTexts, "↳ " + ValeurAttendue.Cle("appro.etiquette.refoule_vers", "refoule vers") + " " + Nom("Soudure Varne", "1501"),
                "la flèche nomme le bâtiment vers lequel il refoule");

            // CONTRÔLE : la clé seule décide — un `arrow_to_building_id` sans `has_arrow` ne dessine rien
            GetSupplyChainGraphResponseDto sansFleche = GrapheDuCadre();
            foreach (SupplyChainNodeDto n in sansFleche.nodes) { n.has_arrow = false; n.arrow_to_building_id = "b1501"; }
            ecran.RendrePourTestChaine(sansFleche, BatimentsDuCadre());
            yield return null;
            int n0 = 0;
            foreach (Transform m in Enfants(ContenuDeLaChaine(), "Maillon")) if (Trouver(m, "Refoule") != null) n0++;
            Assert.AreEqual(0, n0, "has_arrow=false partout ⇒ aucune flèche");
            Assert.AreEqual(5, Enfants(ContenuDeLaChaine(), "Maillon").Count, "anti-vacuité : les 5 maillons sont rendus");
        }

        /// <summary>G3 — un bâtiment absent de `me/buildings` est un bâtiment DÉMOLI (la route exclut `demolished`) : repli RATIFIÉ « un bâtiment
        /// détruit », jamais l'identifiant. CONTRÔLE : présent ⇒ son nom servi.</summary>
        [UnityTest]
        public IEnumerator EcranApproG3_UnBatimentAbsentDeLaListe_EstUnBatimentDetruit()
        {
            ServirLeNomDesBatiments();
            var ecran = MonterEcran();
            ecran.RendrePourTestChaine(new GetSupplyChainGraphResponseDto
            {
                nodes = new[] { Noeud("b-rase", "warm"), Noeud("b1501", "warm") },
                legs = new SupplyChainLegDto[0], routes = new SupplyChainRouteDto[0],
            }, BatimentsDuCadre());
            yield return null;
            var noms = Enfants(ContenuDeLaChaine(), "Maillon").ConvertAll(m => TexteDe(m, "Nom"));
            CollectionAssert.AreEquivalent(new[] { ValeurAttendue.Cle("appro.etiquette.un_batiment_detruit", "un bâtiment détruit"), Nom("Soudure Varne", "1501") }, noms);
            CollectionAssert.DoesNotContain(noms, "b-rase", "jamais l'identifiant à la place d'un nom");
            Assert.IsNull(Trouver(ContenuDeLaChaine(), "TitronLiaisons"), "aucune liaison ⇒ pas de titre « Les liaisons »");
        }

        /// <summary>G4 — STRUCTURE (avant toute valeur) : la fenêtre est un `ScrollRect` sous `ListeDefilante` avec son `RectMask2D` ; tout
        /// `Graphic` de la chaîne porte son `CanvasRenderer` et est masquable ; le filet TIRETÉ n'est QUE sur la liaison contournée, et il est
        /// DESSINÉ (des images sous son conteneur `Filets`, avec un sprite) — une garde sur la recette seule ne dirait rien de l'effet.</summary>
        [UnityTest]
        public IEnumerator EcranApproG4_Structure_FenetreDefilante_CanvasRenderer_TireteSurLaSeuleContournee()
        {
            ServirLeNomDesBatiments();
            var ecran = MonterEcran();
            ecran.RendrePourTestChaine(GrapheDuCadre(), BatimentsDuCadre());
            yield return null;
            yield return null;
            Transform fenetre = Trouver(RacineEcran().transform, "FenetreChaine");
            Assert.IsNotNull(fenetre, "la fenêtre de la chaîne existe");
            Assert.IsNotNull(fenetre.GetComponent<ScrollRect>(), "la fenêtre défile");
            Assert.IsNotNull(fenetre.GetComponent<RectMask2D>(), "la fenêtre coupe ce qui dépasse");
            Assert.IsNotNull(fenetre.GetComponent<MafiaCleanCity.Shell.ListeDefilante>(), "et elle le dit (fondu + ascenseur)");

            Transform chaine = Trouver(RacineEcran().transform, "Chaine");
            int graphiques = 0;
            foreach (Graphic g in chaine.GetComponentsInChildren<Graphic>(true))
            {
                graphiques++;
                Assert.IsNotNull(g.GetComponent<CanvasRenderer>(), $"{g.name} : un Graphic sans CanvasRenderer ne dessine rien");
                Assert.IsTrue(g is MaskableGraphic, $"{g.name} : sous un RectMask2D, tout Graphic doit être masquable");
            }
            Assert.Greater(graphiques, 20, "anti-vacuité : la chaîne a construit ses graphiques");

            Transform contenu = ContenuDeLaChaine();
            List<Transform> contournees = Enfants(contenu, "LiaisonContournee");
            // ⚠️ CONTRAT IMPLICITE : `ConstruireLiaison` NOMME l'objet « Liaison », puis « LiaisonContournee » si `bypassed` — ces deux comptes en dépendent.
            Assert.AreEqual(1, contournees.Count, "une seule liaison bypassed dans le cadre");
            Assert.AreEqual(3, Enfants(contenu, "Liaison").Count);
            var poses = contournees[0].Find(MafiaCleanCity.Shell.Filets.NomConteneur).GetComponent<MafiaCleanCity.Shell.FiletsPoses>();
            Assert.AreEqual(MafiaCleanCity.Shell.StyleFilet.Tirete, poses.Recette[0].Style, "la contournée : trait tireté");
            int dessines = 0;
            foreach (Image im in poses.GetComponentsInChildren<Image>(true)) if (im.sprite != null && im.enabled) dessines++;
            Assert.Greater(dessines, 0, "EFFET : le tireté est dessiné (au moins une image avec son sprite)");
            CollectionAssert.Contains(ecran.RenderedTexts, ValeurAttendue.Cle("appro.etiquette.contournee", "contournée"));
            foreach (Transform l in Enfants(contenu, "Liaison"))
                Assert.AreEqual(MafiaCleanCity.Shell.StyleFilet.Plein,
                    l.Find(MafiaCleanCity.Shell.Filets.NomConteneur).GetComponent<MafiaCleanCity.Shell.FiletsPoses>().Recette[0].Style,
                    "CONTRÔLE : une liaison non contournée garde son trait plein");
        }

        /// <summary>G5 — la liste DÉFILE (E2 du juge : N maillons, sans pagination) : 30 maillons ⇒ le contenu dépasse la fenêtre.
        /// CONTRÔLE : 1 maillon ⇒ tout tient, ni fondu ni course.</summary>
        [UnityTest]
        public IEnumerator EcranApproG5_TrenteMaillons_DepassentLaFenetre_UnTient()
        {
            ServirLeNomDesBatiments();
            var ecran = MonterEcran();
            var trente = new SupplyChainNodeDto[30];
            for (int i = 0; i < trente.Length; i++) trente[i] = Noeud("b-" + i.ToString("00"), "mild");
            ecran.RendrePourTestChaine(new GetSupplyChainGraphResponseDto { nodes = trente, legs = new SupplyChainLegDto[0], routes = new SupplyChainRouteDto[0] });
            for (int f = 0; f < 3; f++) yield return null;
            var liste = Trouver(RacineEcran().transform, "FenetreChaine").GetComponent<MafiaCleanCity.Shell.ListeDefilante>();
            liste.Rafraichir();
            Assert.IsTrue(liste.ContenuDepasse, "30 maillons : la liste dépasse sa fenêtre (elle défile)");

            ecran.RendrePourTestChaine(new GetSupplyChainGraphResponseDto { nodes = new[] { Noeud("b1501", "mild") }, legs = new SupplyChainLegDto[0], routes = new SupplyChainRouteDto[0] },
                BatimentsDuCadre());
            for (int f = 0; f < 3; f++) yield return null;
            liste = Trouver(RacineEcran().transform, "FenetreChaine").GetComponent<MafiaCleanCity.Shell.ListeDefilante>();
            liste.Rafraichir();
            Assert.IsFalse(liste.ContenuDepasse, "CONTRÔLE : un maillon tient dans la fenêtre");
        }

        /// <summary>G7 — une bande HORS DOMAINE (5ᵉ valeur inventée) : le mot GÉNÉRIQUE « état inconnu » (`Repli.Etat`, jamais la valeur brute) et le
        /// rang DERNIER (après `silent` / `fresh`). CONTRÔLE : les valeurs connues gardent leur mot et leur rang.</summary>
        [UnityTest]
        public IEnumerator EcranApproG7_UneBandeHorsDomaine_DitEtatInconnu_EtPasseEnDernier()
        {
            ServirLeNomDesBatiments();
            string inconnu = ValeurAttendue.De("commun", "repli", "état inconnu");
            Assert.AreEqual(inconnu, ChaineDApproGraphe.MotPression("boiling"));
            Assert.AreEqual(inconnu, ChaineDApproGraphe.MotDette("rusted"));
            Assert.AreEqual(ChaineDApproGraphe.RangHorsDomaine, ChaineDApproGraphe.RangPression("boiling"));
            Assert.Greater(ChaineDApproGraphe.RangPression("boiling"), ChaineDApproGraphe.RangPression("silent"), "hors domaine : après la meilleure bande");
            Assert.Greater(ChaineDApproGraphe.RangDette("rusted"), ChaineDApproGraphe.RangDette("fresh"));
            Assert.AreEqual(ValeurAttendue.Cle("appro.pression.silent", "Rien ne bloque"), ChaineDApproGraphe.MotPression("silent"), "CONTRÔLE : une valeur connue garde son mot");

            var ecran = MonterEcran();
            ecran.RendrePourTestChaine(new GetSupplyChainGraphResponseDto
            {
                nodes = new[] { Noeud("b1501", "boiling"), Noeud("b1502", "silent") },
                legs = new SupplyChainLegDto[0], routes = new SupplyChainRouteDto[0],
            }, BatimentsDuCadre());
            yield return null;
            var mots = Enfants(ContenuDeLaChaine(), "Maillon").ConvertAll(m => TexteDe(m, "Mot"));
            CollectionAssert.AreEqual(new[] { ValeurAttendue.Cle("appro.pression.silent", "Rien ne bloque"), inconnu }, mots, "la bande inconnue est rendue en DERNIER");
            CollectionAssert.DoesNotContain(ecran.RenderedTexts, "boiling", "jamais la valeur brute");
        }

        /// <summary>G6 — les clés : chaque mot NEUF de la chaîne et du fournisseur, s'il n'est pas servi, est dans la DetteDatee de ZeroRepli
        /// (règle (1) de cette garde, appliquée ici sans dépendre de l'état d'arrivée de l'écran). Anti-vacuité : les 18 clés (7 de structure, 4 + 4 bandes, 3 du fournisseur).</summary>
        [UnityTest]
        public IEnumerator EcranApproG6_LesClesNonServiesDeLaChaine_SontEnDetteDatee()
        {
            ServirLeNomDesBatiments();
            var ecran = MonterEcran();
            // un premier rendu construit la mise en page (en-tête d'écran, bon…) : ses clés sont servies en vrai, pas dans ce catalogue de test
            ecran.RendrePourTestChaine(new GetSupplyChainGraphResponseDto { nodes = new SupplyChainNodeDto[0], legs = new SupplyChainLegDto[0], routes = new SupplyChainRouteDto[0] });
            yield return null;
            MafiaCleanCity.I18n.Libelle.RemettreLesCompteurs();
            GetSupplyChainGraphResponseDto g = GrapheDuCadre();
            var nodes = new List<SupplyChainNodeDto>(g.nodes) { Noeud("b-rase", "silent") };
            g.nodes = nodes.ToArray();
            ecran.RendrePourTestChaine(g, BatimentsDuCadre());
            foreach (string b in new[] { "FRESH", "USED", "STRAINED" }) ChaineDApproResolvers.TextePressionFournisseur(b);
            yield return null;
            var observees = new List<string>(MafiaCleanCity.I18n.Libelle.ClesEnRepli);
            Assert.GreaterOrEqual(observees.Count, 18, "anti-vacuité : " + string.Join(" · ", observees));
            var horsDette = observees.FindAll(k => !MafiaCleanCity.I18n.I18nCatalog.Connait(k)
                                                   && !ZeroRepliDesLocatairesPlayModeTests.DetteDatee.Contains(k));
            Assert.IsEmpty(horsDette, "clé non servie hors de la DetteDatee : " + string.Join(" · ", horsDette));
        }

        // ═══ TD-1013 — les 7 clés d'une route servie (forme G fermée) ═══════════════════════════════

        /// <summary>Les 7 clés SERVIES d'une route, écrites ICI à la main (anti-tautologie), recopiées de `supply-chain.controller.ts:92-99` (back main 6040a213).</summary>
        private static readonly string[] ClesDUneRouteServie =
            { "route_id", "origin_building_id", "destination_building_id", "sinuosity_stress_bucket", "time_to_collapse_bucket", "state", "rebuilding" };

        private static List<string> Ecarts(IEnumerable<string> champs, IEnumerable<string> servies)
        {
            var e = new List<string>();
            var c = new HashSet<string>(champs); var s = new HashSet<string>(servies);
            foreach (string k in s) if (!c.Contains(k)) e.Add("servie mais non déclarée : " + k);
            foreach (string k in c) if (!s.Contains(k)) e.Add("déclarée mais non servie : " + k);
            return e;
        }

        [Test]
        public void EcranApproTD1013_RouteDto_EpingleDesSeptCles_ControlePositif()
        {
            string[] champs = System.Array.ConvertAll(typeof(SupplyChainRouteDto).GetFields(), f => f.Name);
            Assert.IsEmpty(Ecarts(champs, ClesDUneRouteServie), "le DTO déclare EXACTEMENT les 7 clés servies (sinon JsonUtility en jette : forme G)");
            var g = JsonUtility.FromJson<GetSupplyChainGraphEnvelope>("{\"payload\":{\"data\":{\"nodes\":[],\"legs\":[],\"routes\":[{\"route_id\":\"r-1\","
                + "\"origin_building_id\":\"b-1\",\"destination_building_id\":\"b-2\",\"sinuosity_stress_bucket\":\"stressed\",\"time_to_collapse_bucket\":\"imminent\","
                + "\"state\":\"saturated\",\"rebuilding\":true}]}}}").payload.data;
            SupplyChainRouteDto r = g.routes[0];
            Assert.AreEqual("r-1", r.route_id); Assert.AreEqual("b-1", r.origin_building_id); Assert.AreEqual("b-2", r.destination_building_id);
            Assert.AreEqual("stressed", r.sinuosity_stress_bucket); Assert.AreEqual("imminent", r.time_to_collapse_bucket);
            Assert.AreEqual("saturated", r.state); Assert.IsTrue(r.rebuilding, "chaque clé servie arrive à sa valeur (dont le booléen)");
            // CONTRÔLE POSITIF : un champ retiré côté client est NOMMÉ, et une 8ᵉ clé servie aussi
            var ampute = new List<string>(champs); ampute.Remove("time_to_collapse_bucket");
            CollectionAssert.Contains(Ecarts(ampute, ClesDUneRouteServie), "servie mais non déclarée : time_to_collapse_bucket", "CONTRÔLE POSITIF : la clé retirée est vue");
            var huit = new List<string>(ClesDUneRouteServie) { "sinuosity_index" };
            CollectionAssert.Contains(Ecarts(champs, huit), "servie mais non déclarée : sinuosity_index", "CONTRÔLE POSITIF : une clé de trop au corps est vue");
        }

        // ═══ R — Résolveurs : domaine FERMÉ annoncé, contrôle positif ET négatif ═══════════════
        //
        // `supplier_pressure_bucket` est le SEUL des trois domaines de ㉚ confirmé fermé (message
        // d'erreur mesuré 2026-09-03 : FRESH|USED|STRAINED) — c'est pourquoi lui seul porte un
        // `default: throw`. Contrôle positif (les 3 valeurs connues résolvent) ET négatif (une 4e
        // valeur est BRUYANTE, pas absorbée en silence) — sans le second, le premier ne prouve pas
        // que le repli existe, seulement que les cas heureux marchent.
        [Test]
        public void EcranApproR1_ResolveurPression_CouvreLesTroisValeursAnnoncees()
        {
            // 11/11 (f2) : lu par la clé de la VALEUR servie (`appro.fournisseur.*`, BACK-1 @1845e0e8), repli = le texte des maquettes
            Assert.AreEqual(ValeurAttendue.Cle("appro.fournisseur.fresh", "il vous prend encore au sérieux"),
                ChaineDApproResolvers.TextePressionFournisseur("FRESH"));
            Assert.AreEqual(ValeurAttendue.Cle("appro.fournisseur.used", "il commence à traîner"),
                ChaineDApproResolvers.TextePressionFournisseur("USED"));
            Assert.AreEqual(ValeurAttendue.Cle("appro.fournisseur.strained", "il vous fait attendre exprès"),
                ChaineDApproResolvers.TextePressionFournisseur("STRAINED"));
        }

        [Test]
        public void EcranApproR2_ResolveurPression_RejetteUneValeurHorsDomaineAnnonce()
        {
            Assert.Throws<System.ArgumentOutOfRangeException>(
                () => ChaineDApproResolvers.TextePressionFournisseur("BOGUS_5E_VALEUR"),
                "une valeur hors du domaine annoncé (FRESH|USED|STRAINED) doit être BRUYANTE, " +
                "jamais absorbée en silence par un repli connu");
        }
    }
}
