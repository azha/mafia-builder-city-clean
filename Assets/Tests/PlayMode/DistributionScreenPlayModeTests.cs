using System.Collections;
using System.Collections.Generic;
using NUnit.Framework;
using UnityEngine;
using UnityEngine.UI;
using UnityEngine.TestTools;
using MafiaCleanCity.Operational;
using MafiaCleanCity.Shell;
using MafiaCleanCity.CityMap;   // REUSE AuthClient (signup/signin) — patron ㊲/㉚ OuvrirJoueurFrais
using MafiaCleanCity.Tests;     // SeederSupport.SafeCallsign
using Object = UnityEngine.Object;

namespace MafiaCleanCity.Operational.Tests
{
    /// <summary>ecran_distribution « La distribution » (㉘) — suite du chantier de métier du
    /// 2026-09-03, complétée le même jour par TD-558 (la ficelle et son épingle du panneau de
    /// liège, voir `DistributionFicelleGraphic`).
    ///
    /// COUVERT : le montage structurel (CanvasRenderer, MaskableGraphic — S1 pour le squelette à
    /// vide, S2 pour la ficelle une fois une route connue, S1 tournant trop tôt pour la voir), la
    /// capture pour le juge visuel (armée, jamais exécutée cette passe — éditeur non lancé), DEUX
    /// PARCOURS joueur réels (§P — un compte FRAIS, sans distribution_hub dans son kit de départ,
    /// et le compte de démo nommé par le brief, qui EN a un), les 6 états pilotés par la donnée
    /// (§E, via `RendrePourTest` — dont E6 : aucune route ⇒ aucune ficelle fabriquée) et les
    /// résolveurs des 5 domaines DE TEXTE + 3 domaines DE FORME (§R, tous à repli gracieux — aucun
    /// n'est confirmé fermé par un message d'erreur, contrairement à ㉚ ; TD-558 : `route_state`
    /// n'a mesuré qu'"active", la branche "rompue" est un repli documenté, jamais une valeur
    /// observée — voir `EcranDistributionR9`).
    /// NON EXÉCUTÉ cette passe (aucun test n'a tourné, seule la COMPILATION est prouvée — voir
    /// implementation-notes.md).
    /// NON COUVERT : le geste « ENVOYER CE SOIR »/« ACHETER UN VÉLO » de bout en bout contre le
    /// vrai back (les coroutines `*EtRecharger()` sont exposées pour un futur test qui le
    /// ferait ; `EnvoyerCeSoirCoroutine` ne peut de toute façon pas réussir sur le compte de démo,
    /// stock source à zéro — voir `DistributionDtos.cs`).</summary>
    [Category("EcranDistribution")]
    public class DistributionScreenPlayModeTests
    {
        // ⛔ TD-576, CLASSE « CATALOGUE » (2026-09-23) — cette classe charge le catalogue i18n (directement, ou en montant un
        // écran / le shell / la scène du build qui l'amorce) et ne le rendait JAMAIS : global statique, il passait à la classe
        // suivante. Mesuré : le 1er cas d'`ArchetypeServi_…` a hérité d'un bundle réel laissé en amont. Rendu à chaque test ;
        // la garde de sortie de MafiaCI nomme toute classe qui le laisserait encore chargé.
        [TearDown] public void OublierLeCatalogue() => MafiaCleanCity.I18n.I18nCatalog.Oublier();

        private GameObject hostGo;

        [TearDown]
        public void TearDown()
        {
            GameObject reste = GameObject.Find("DistributionRoot");
            while (reste != null) { Object.DestroyImmediate(reste); reste = GameObject.Find("DistributionRoot"); }
            if (hostGo != null) Object.Destroy(hostGo);
            hostGo = null;
        }

        /// <summary>La racine RÉELLE de l'écran n'est PAS `hostGo` : hors shell, le contrôleur
        /// découvre un Canvas et bâtit dessous (patron ㊲, ligne pour ligne). Chercher
        /// `hostGo.GetComponentsInChildren` rendrait ZÉRO en silence.</summary>
        private GameObject RacineEcran()
        {
            GameObject r = GameObject.Find("DistributionRoot");
            Assert.IsNotNull(r, "DistributionRoot introuvable : le contrôleur n'a pas construit sa " +
                                "mise en page (ni sous mountParent, ni sous un Canvas découvert)");
            return r;
        }

        private DistributionScreenController MonterEcran()
        {
            hostGo = new GameObject("DistributionScreen", typeof(RectTransform));
            var ecran = hostGo.AddComponent<DistributionScreenController>();
            return ecran;
        }

        /// <summary>㉘ B1 (juge du 07/10 ; décision de f2 du 08/10) : la règle d'achat d'un relais (« … sur le port ou dans les cheminées seulement ») est dite UNE fois à
        /// l'écran — dans le sous-titre quand AUCUN geste n'est offert, au-dessus du geste (le coût, avant l'appui) quand il l'est. Gardes d'EFFET : les textes
        /// ACTIFS rendus, pas les paramètres. La maquette ne montre ni l'une ni l'autre (aucun cadre de cet état) : rien n'est inventé, un doublon est retiré.</summary>
        [Test]
        public void EcranDistributionB1_AucunRelais_LaReglePortCheminees_EstDiteUneSeuleFois()
        {
            var ecran = MonterEcran();
            const string regle = "sur le port ou dans les cheminées seulement";

            int Compte()
            {
                int n = 0;
                foreach (TMPro.TextMeshProUGUI x in RacineEcran().GetComponentsInChildren<TMPro.TextMeshProUGUI>(false))
                    if (x.gameObject.activeInHierarchy && !string.IsNullOrEmpty(x.text) && x.text.Contains(regle)) n++;
                return n;
            }
            string TousLesTextes()
            {
                var l = new List<string>();
                foreach (TMPro.TextMeshProUGUI x in RacineEcran().GetComponentsInChildren<TMPro.TextMeshProUGUI>(false))
                    if (x.gameObject.activeInHierarchy && !string.IsNullOrEmpty(x.text)) l.Add(x.text);
                return string.Join(" | ", l);
            }

            ecran.MontrerAucunRelaisPourTest(gesteOffert: false);
            Assert.AreEqual(1, Compte(), "sans geste : la règle est dite UNE fois, dans le sous-titre — " + TousLesTextes());
            StringAssert.Contains("Un relais s", TousLesTextes(), "sans geste, le sous-titre garde la règle d'achat (seul endroit qui la dit)");

            ecran.MontrerAucunRelaisPourTest(gesteOffert: true);   // le geste est trouvé APRÈS la recherche d'un bloc libre : le sous-titre se raccourcit
            Assert.AreEqual(1, Compte(), "avec le geste : la règle n'est dite qu'UNE fois (au-dessus du bouton, plus dans le sous-titre) — " + TousLesTextes());
            StringAssert.Contains("Coûte de l", TousLesTextes(), "avec le geste, le coût se dit AVANT l'appui (table 71, D18)");
            StringAssert.DoesNotContain("Un relais s", TousLesTextes(), "avec le geste, le sous-titre ne répète pas la règle");
        }

        /// <summary>㉘ F2 (juge d'ensemble r1, 08/10 ; f2 : « un état vide qui ne se lit pas comme voulu reste un défaut ») : sans zone, le corps entier était un tapis de liège NU sous le bandeau (87 % du corps).
        /// Dans l'état « aucun relais » un PANNEAU de liège borné porte l'étiquette crème « D'OÙ ÇA PART » et le titre de l'état — deux clés DÉJÀ servies — ; l'état nominal ne le garde pas.</summary>
        [UnityTest]
        public IEnumerator EcranDistributionF2_AucunRelais_UnPanneauDeLiegeBornePorteLEtiquette()
        {
            var ecran = MonterEcran();
            yield return null; yield return null;
            ecran.MontrerAucunRelaisPourTest(gesteOffert: false);
            yield return null; yield return null;
            Canvas.ForceUpdateCanvases();
            Transform racine = RacineEcran().transform;
            Transform vide = racine.Find("Corps/Corkboard/PanneauVide");
            Assert.IsNotNull(vide, "l'état « aucun relais » pose son panneau de liège (jamais un tapis nu)");
            Transform chip = vide.Find("EtiquetteVide");
            Assert.IsNotNull(chip, "le panneau porte l'étiquette crème");
            Assert.AreEqual("D'OÙ ÇA PART", chip.Find("SousTitre").GetComponent<TMPro.TextMeshProUGUI>().text.ToUpperInvariant().Replace('’', '\''), "la même grammaire que la fiche d'une route");
            // F6 (juge d'ensemble r2) : la ligne 1 d'une fiche est la SOURCE ; ici il n'y en a pas — la fiche ne RÉPÈTE plus le titre du bandeau, elle dit la phrase déjà servie de l'état sans route.
            string ligne1 = chip.Find("Titre").GetComponent<TMPro.TextMeshProUGUI>().text;
            Assert.AreNotEqual(racine.Find("Entete/Titre").GetComponent<TMPro.TextMeshProUGUI>().text, ligne1, "la fiche ne répète pas le titre de l'état (juge r2 F6)");
            Assert.AreEqual(MafiaCleanCity.I18n.Libelle.De("distribution", "bloc", "Aucune route tendue pour l’instant."), ligne1, "ligne 1 = la clé déjà servie, aucun mot inventé");
            RectTransform panneau = (RectTransform)vide, etiquette = (RectTransform)chip;
            Assert.Greater(panneau.rect.height, 0f, "le panneau a une hauteur : le tapis n'est plus nu (F2)");
            var cp = new Vector3[4]; var ce = new Vector3[4];
            panneau.GetWorldCorners(cp); etiquette.GetWorldCorners(ce);
            Assert.GreaterOrEqual(ce[0].y, cp[0].y - 0.5f, "l'étiquette est DANS le panneau (bas)");
            Assert.LessOrEqual(ce[2].y, cp[2].y + 0.5f, "l'étiquette est DANS le panneau (haut)");
        }

        /// <summary>㉘ F3 + F5-a (juge d'ensemble r2, 08/10) : (F3) la plaque du panneau n'a plus de fond — l'aplat opaque recouvrait la planche (grain) — et porte le `.cadre-b` (`Filets`) ; (F5-a) dans l'état « aucun relais »
        /// `Decor/Support` prend le rect de la PLAQUE (le reste de la page redevient la scène : plus de 28 à 44 % de liège nu), et l'état nominal le RENDOUT pleine page (sans quoi un support rétréci resterait sur un cadre disparu).
        /// Garde d'EFFET sur la géométrie rendue, pas sur un paramètre ; le crochet de test marque le chargement terminé (F5-b).</summary>
        [UnityTest]
        public IEnumerator EcranDistributionF5_AucunRelais_LeSupportSuitLaPlaque_SansFond_AvecCadreB_EtLEtatNominalLeRend()
        {
            var ecran = MonterEcran();
            yield return null; yield return null;
            Canvas.ForceUpdateCanvases();
            Transform racine = RacineEcran().transform;
            RectTransform support = (RectTransform)racine.Find("Decor/Support");
            Assert.IsNotNull(support, "Decor/Support");

            ecran.MontrerAucunRelaisPourTest(gesteOffert: false);
            yield return null; yield return null;
            Canvas.ForceUpdateCanvases();
            Assert.True(ecran.ProposeAchatTermine, "le rendu explicite marque le chargement terminé : la capture n'attend plus une course");
            RectTransform plaque = (RectTransform)racine.Find("Corps/Corkboard/PanneauVide");
            Assert.IsNull(plaque.GetComponent<Image>(), "F3 : la plaque n'a PLUS de fond plat (il recouvrait le grain de la planche)");
            Assert.IsNotNull(plaque.Find(Filets.NomConteneur), "F3 : le `.cadre-b` (Filets.Distribution.CadreB) est posé sur la plaque");
            var cs = new Vector3[4]; var cp = new Vector3[4];
            support.GetWorldCorners(cs); plaque.GetWorldCorners(cp);
            Assert.AreEqual(cp[0].y, cs[0].y, 1f, "F5-a : le bas du support = le bas de la plaque");
            Assert.AreEqual(cp[2].y, cs[2].y, 1f, "F5-a : le haut du support = le haut de la plaque");
            Assert.AreEqual(cp[0].x, cs[0].x, 1f, "F5-a : la gauche du support = la gauche de la plaque");
            Assert.AreEqual(cp[2].x, cs[2].x, 1f, "F5-a : la droite du support = la droite de la plaque");
            float hauteurDuDecor = ((RectTransform)racine.Find("Decor")).rect.height;
            Assert.Less(support.rect.height, 0.5f * hauteurDuDecor, "F5-a : le support n'est plus un lit pleine page sous une petite plaque");

            // l'état nominal (une route) : le support est de nouveau « sous la bande » (anchorMax.y = 1 − Bande du catalogue), la plaque a sa planche sans fond plat aussi
            ecran.RendrePourTest(new GetOperationalCouriersResponseDto { couriers = new CourierDto[0] }, new GetOperationalDistributionProjectionResponseDto { routes = new DistributionRouteDto[0] });
            yield return null; yield return null;
            Canvas.ForceUpdateCanvases();
            Assert.AreEqual(1f - DecorsDeScene.Distribution.Bande, support.anchorMax.y, 1e-3f, "l'état nominal rend le support pleine page, sous la bande du catalogue");
            Assert.AreEqual(0f, support.anchorMin.y, 1e-3f);
            RectTransform panneau = (RectTransform)racine.Find("Corps/Corkboard/Panneau");
            Assert.IsNotNull(panneau, "l'état nominal pose son panneau");
            Assert.IsNull(panneau.GetComponent<Image>(), "F3 : le panneau nominal n'a plus de fond plat non plus");
            Assert.IsNotNull(panneau.Find(Filets.NomConteneur), "F3 : le `.cadre-b` du panneau nominal");
        }

        // ═══ 1. GARDE STRUCTURELLE — ne lit aucun pixel, ne dépend d'aucune résolution ═══════

        /// <summary>⛔ TOUT `Graphic` PORTE SON `CanvasRenderer`, et TOUT Graphic sous ce fond
        /// est `MaskableGraphic` — patron ㊲/㉚, garde structurelle AVANT toute garde de valeur.
        ///
        /// Plancher à 2 (patron ㉚) : `BuildLayout()` construit, SANS aucune donnée (`MonterEcran()`
        /// seul, avant `Charger()`), le fond (1) + le titre (1) + le sous-titre (1) — au moins
        /// 3, TOUJOURS, même à vide.</summary>
        [UnityTest]
        public IEnumerator EcranDistributionS1_ToutGraphic_PorteSonCanvasRenderer()
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

        // ═══ Fixtures parcours — patron ㊲/㉚ ══════════════════════════════════════════════════

        private static string BaseUrl => MafiaCleanCity.AdresseDuBack.Url;   // la source du shell (garde de classe, 26/09)
        private static int callsignSeq;
        private string token;

        private IEnumerator OuvrirJoueurFrais()
        {
            var auth = new AuthClient { BaseUrl = BaseUrl };
            string callsign = SeederSupport.SafeCallsign("distrib", ref callsignSeq);
            string err = null;
            token = null;
            yield return auth.SignUp(callsign, "screen-distrib-pw", t => token = t, e => err = e);
            Assert.IsNull(err, $"signup a échoué : {err}");
            Assert.IsNotNull(token, "signup n'a pas rendu de jeton");
            yield return FermerSession();
        }

        /// <summary>Le compte de démo NOMMÉ par le brief (`operational_demo@example.test`) — le
        /// SEUL compte mesuré à posséder un `distribution_hub` (voir `EcranDistributionP2`).</summary>
        private IEnumerator OuvrirCompteDemo()
        {
            var auth = new AuthClient { BaseUrl = BaseUrl };
            string err = null;
            token = null;
            yield return auth.SignIn("operational_demo@example.test", "operational-demo-pw",
                t => token = t, e => err = e);
            Assert.IsNull(err, $"signin (compte de démo) a échoué : {err}");
            Assert.IsNotNull(token, "signin (compte de démo) n'a pas rendu de jeton");
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

        /// <summary>⛔⛔ MESURÉ EN DIRECT (2026-09-03, `rtk proxy curl`, signup frais RÉEL) : un
        /// compte FRAÎCHEMENT SIGNÉ NE PORTE AUCUN `distribution_hub` — son kit de départ (4
        /// bâtiments, district `Verge-A`) est `lab`, `stash`, `front_shop`, `cash_safehouse`.
        /// La PRÉMISSE de cet écran (un hub de distribution) NE TIENT DONC PAS au jour 1 sur ce
        /// back — même famille que « insurance mort à 3 maillons » du socle (CLAUDE.md). Ce
        /// n'est pas un défaut de cet écran ni de ce lot : c'est une mesure due, consignée ici
        /// plutôt que masquée (voir implementation-notes.md § Deviations).
        /// ⇒ Cette assertion est VOLONTAIREMENT auto-invalidante : si le starter kit change pour
        /// inclure un `distribution_hub`, `FromBuildingId` cessera d'être `null` et ce test
        /// ROUGIRA — c'est le signal qui doit alors faire relire cette note, pas la supprimer.</summary>
        [UnityTest]
        public IEnumerator EcranDistributionP1_ParcoursJoueurFrais_AucunHubDeDistributionAuJourUn()
        {
            yield return OuvrirJoueurFrais();

            var ecran = MonterEcran();
            ecran.SetToken(token);
            yield return ecran.Charger();

            Assert.IsNull(ecran.FromBuildingId,
                "un compte fraîchement signé a désormais un distribution_hub — RE-MESURER : le " +
                "starter kit a changé, cette note est PÉRIMÉE et doit être réécrite, pas ignorée");
            Assert.IsNotNull(ecran.DerniereErreur,
                "l'échec de découverte doit être un message NOMMÉ, jamais un écran muet");
            StringAssert.Contains("distribution_hub", ecran.DerniereErreur);
        }

        /// <summary>Le compte NOMMÉ par le brief — c'est le SEUL test qui ferme les six formes de
        /// chaîne morte pour cet écran quand la prémisse EST remplie : un joueur qui possède un
        /// hub de distribution peut atteindre sa fiche, ses courriers ET sa projection de route.</summary>
        [UnityTest]
        public IEnumerator EcranDistributionP2_CompteDemo_DecouvreLeHubEtChargeLesDeuxListes()
        {
            yield return OuvrirCompteDemo();

            var ecran = MonterEcran();
            ecran.SetToken(token);
            yield return ecran.Charger();

            Assert.IsNotNull(ecran.FromBuildingId,
                "aucun distribution_hub découvert sur le compte de démo — la prémisse mesurée le " +
                "2026-09-03 ne tient plus, RE-MESURER avant d'accuser cet écran");
            Assert.IsNull(ecran.DerniereErreur, $"Charger() a levé une erreur : {ecran.DerniereErreur}");
            Assert.IsNotNull(ecran.DernierChargementCouriers, "GET /v1/operational/couriers n'a rien rendu");
            Assert.IsNotNull(ecran.DernierChargementCouriers.couriers, "clé absente : couriers");

            // Épingle sur l'ENSEMBLE DE CLÉS consommé (précédent maison :
            // tutorial_overlay_session_open_non_regression.spec.ts) sur le PREMIER courrier.
            Assert.Greater(ecran.DernierChargementCouriers.couriers.Length, 0, "0 courrier — anti-vacuité");
            CourierDto c0 = ecran.DernierChargementCouriers.couriers[0];
            Assert.IsNotNull(c0.courier, "clé absente : couriers[0].courier");
            Assert.IsNotNull(c0.vehicle_type, "clé absente : couriers[0].vehicle_type");
            Assert.IsNotNull(c0.transit_band, "clé absente : couriers[0].transit_band");
            // temperature_status mesuré null — pas d'assertion IsNotNull dessus (ce serait
            // exiger un défaut de mesure comme s'il était garanti).

            Assert.IsNotNull(ecran.DernierChargementProjection, "GET .../distribution/projection n'a rien rendu");
            Assert.IsNotNull(ecran.DernierChargementProjection.routes, "clé absente : routes");
            Assert.Greater(ecran.DernierChargementProjection.routes.Length, 0, "0 route — anti-vacuité");
            DistributionRouteDto r0 = ecran.DernierChargementProjection.routes[0];
            Assert.IsNotNull(r0.route_id, "clé absente : routes[0].route_id");
            Assert.IsNotNull(r0.sinuosity_bucket, "clé absente : routes[0].sinuosity_bucket");
            Assert.IsNotNull(r0.river_crossings_count_bucket, "clé absente : routes[0].river_crossings_count_bucket");
            Assert.IsNotNull(r0.route_state, "clé absente : routes[0].route_state");
            Assert.IsNotNull(r0.available_vehicles, "clé absente : routes[0].available_vehicles");

            Assert.Greater(ecran.RenderedTexts.Count, 0, "aucun texte rendu — l'écran est vide");
        }

        // ═══ E — États pilotés par la donnée (RendrePourTest) ══════════════════════════════════
        //
        // ⛔ Ne prouvent jamais que le back émet ces corps — seulement ce que l'écran EN FAIT.
        // La preuve du corps RÉEL est P2 ci-dessus.

        private static CourierDto Courier(string transitBand, string vehicule = "FOOT",
            bool degrading = false, string temperature = null) => new CourierDto
        {
            courier = System.Guid.NewGuid().ToString(),
            vehicle_type = vehicule,
            transit_band = transitBand,
            degrading = degrading,
            temperature_status = temperature,
        };

        private static GetOperationalCouriersResponseDto CouriersFabrique(params CourierDto[] couriers) =>
            new GetOperationalCouriersResponseDto { couriers = couriers };

        private static DistributionRouteDto RouteFabrique(string sinuosity = "meandering",
            string traversee = "single", string etat = "active") => new DistributionRouteDto
        {
            route_id = System.Guid.NewGuid().ToString(),
            sinuosity_bucket = sinuosity,
            river_crossings_count_bucket = traversee,
            route_state = etat,
            available_vehicles = new[] { "FOOT" },
        };

        private static GetOperationalDistributionProjectionResponseDto ProjectionFabrique(
            params DistributionRouteDto[] routes) =>
            new GetOperationalDistributionProjectionResponseDto { routes = routes };

        [UnityTest]
        public IEnumerator EcranDistributionE1_EtatRepos_ConstruitLeLiegeEtLeBouton()
        {
            var ecran = MonterEcran();
            ecran.RendrePourTest(
                CouriersFabrique(Courier("IDLE"), Courier("IDLE")),
                ProjectionFabrique(RouteFabrique()));
            yield return null;

            CollectionAssert.Contains(ecran.RenderedTexts, ValeurAttendue.Cle("distribution.titre.l_envoi_de_ce_soir", "Le prochain envoi"), "titre repos absent (table 80 : clé gardée, valeur réécrite)");
            CollectionAssert.Contains(ecran.RenderedTexts, "ça serpente — plus long, plus discret",
                "résolveur LE CHEMIN muet (meandering)");
            CollectionAssert.Contains(ecran.RenderedTexts, "un pont",
                "résolveur À TRAVERSER muet (single)");
            CollectionAssert.Contains(ecran.RenderedTexts, "tient",
                "résolveur CETTE ROUTE muet (active)");
            CollectionAssert.Contains(ecran.RenderedTexts, ValeurAttendue.Cle("distribution.bouton.envoyer_ce_soir", "ENVOYER MAINTENANT"),
                "le bouton n'est pas construit en état repos");
        }

        [UnityTest]
        public IEnumerator EcranDistributionE2_UnCourrierEnTransit_AucunBoutonEtNoteExplicite()
        {
            var ecran = MonterEcran();
            ecran.RendrePourTest(
                CouriersFabrique(Courier("IN_TRANSIT"), Courier("IDLE")),
                ProjectionFabrique(RouteFabrique()));
            yield return null;

            CollectionAssert.Contains(ecran.RenderedTexts, "Ce qui est sur la route", "titre en-transit absent");
            CollectionAssert.DoesNotContain(ecran.RenderedTexts, ValeurAttendue.Cle("distribution.bouton.envoyer_ce_soir", "ENVOYER MAINTENANT"),
                "brief §2 : « en transit, aucun bouton »");
            CollectionAssert.Contains(ecran.RenderedTexts,
                ValeurAttendue.De("distribution", "bloc", "Il est en chemin. On ne le rappelle pas — on saura à l’arrivée."),
                "brief §2 : « il faut le DIRE au joueur, pas seulement griser » — note absente");
        }

        [UnityTest]
        public IEnumerator EcranDistributionE3_EtatLivre_AfficheLeBoutonTendreUneAutreFicelle()
        {
            var ecran = MonterEcran();
            ecran.RendrePourTest(
                CouriersFabrique(Courier("ARRIVED"), Courier("IDLE")),
                ProjectionFabrique(RouteFabrique()));
            yield return null;

            CollectionAssert.Contains(ecran.RenderedTexts, ValeurAttendue.De("distribution", "titre", "C’est livré"), "titre livré absent");
            CollectionAssert.Contains(ecran.RenderedTexts, ValeurAttendue.De("distribution", "bouton", "TENDRE UNE AUTRE FICELLE"), "bouton livré absent");
            CollectionAssert.DoesNotContain(ecran.RenderedTexts, ValeurAttendue.Cle("distribution.bouton.envoyer_ce_soir", "ENVOYER MAINTENANT"),
                "le libellé repos ne doit pas apparaître en état livré");
        }

        [UnityTest]
        public IEnumerator EcranDistributionE4_AucuneRouteDansLaProjection_MessageHonnetePasDeCrash()
        {
            var ecran = MonterEcran();
            ecran.RendrePourTest(CouriersFabrique(Courier("IDLE")), ProjectionFabrique());
            yield return null;

            CollectionAssert.Contains(ecran.RenderedTexts, ValeurAttendue.De("distribution", "bloc", "Aucune route tendue pour l’instant."),
                "l'état vide de la projection n'affiche pas le message honnête attendu");
        }

        [UnityTest]
        public IEnumerator EcranDistributionE5_AucuneDestinationDecouverte_PasDeBoutonFabrique()
        {
            var ecran = MonterEcran();
            ecran.RendrePourTest(CouriersFabrique(Courier("IDLE")), ProjectionFabrique(RouteFabrique()),
                toLabel: null);
            yield return null;

            Assert.IsNull(ecran.ToBuildingId, "fixture : toLabel=null doit laisser ToBuildingId null");
            CollectionAssert.DoesNotContain(ecran.RenderedTexts, ValeurAttendue.Cle("distribution.bouton.envoyer_ce_soir", "ENVOYER MAINTENANT"),
                "sans destination découverte, aucun bouton ne doit être fabriqué sur un id inventé");
            CollectionAssert.Contains(ecran.RenderedTexts,
                ValeurAttendue.Cle("distribution.bloc.aucune_destination_connue_pour_l_envoi_de_ce_soir", "Aucune destination connue pour le prochain envoi."),   // table 80
                "la note honnête d'absence de destination est absente");
        }

        // ═══ TD-558 — la ficelle et son épingle ════════════════════════════════════════════════

        /// <summary>⛔⛔ TOUT `Graphic` PORTE SON `CanvasRenderer`, et TOUT Graphic sous ce fond est
        /// `MaskableGraphic` — la même garde structurelle que S1, mais APRÈS que la donnée soit
        /// posée : S1 tourne AVANT que `Charger()` n'ait complété son premier appel réseau, donc
        /// AVANT que `RendreCorkboard()` n'ait jamais construit de ficelle (elle n'existe que si
        /// une route est connue). C'est cette garde-ci qui la couvre.</summary>
        [UnityTest]
        public IEnumerator EcranDistributionS2_AvecUneRoute_LaFicelleEstMaskableGraphicAvecCanvasRenderer()
        {
            var ecran = MonterEcran();
            ecran.RendrePourTest(CouriersFabrique(Courier("IDLE")), ProjectionFabrique(RouteFabrique()));
            yield return null;

            GameObject ficelleGo = GameObject.Find("Ficelle");
            Assert.IsNotNull(ficelleGo,
                "TD-558 : aucun GameObject « Ficelle » construit alors qu'une route est connue");

            Graphic[] graphics = ficelleGo.GetComponents<Graphic>();
            Assert.AreEqual(1, graphics.Length, "la ficelle ne porte pas exactement 1 Graphic");
            Assert.IsNotNull(ficelleGo.GetComponent<CanvasRenderer>(),
                "sans CanvasRenderer explicite, la ficelle ne dessinerait RIEN, sans erreur console " +
                "(AddComponent<T>() n'honore pas [RequireComponent(CanvasRenderer)] à l'exécution)");
            Assert.IsInstanceOf<MaskableGraphic>(graphics[0],
                "un Graphic nu échapperait à tout Mask parent — incident VerticalGradientImage, 2026-08-22");

            // Re-balaie l'ENSEMBLE de l'écran dans CET état (donnée posée) — la garde de S1,
            // rejouée quand la ficelle existe réellement.
            var sansRenderer = new List<string>();
            var nonMaskable = new List<string>();
            foreach (Graphic g in RacineEcran().GetComponentsInChildren<Graphic>(true))
            {
                if (g.GetComponent<CanvasRenderer>() == null) sansRenderer.Add(g.name);
                if (!(g is MaskableGraphic)) nonMaskable.Add(g.name);
            }
            Assert.IsEmpty(sansRenderer, "Graphic sans CanvasRenderer : " + string.Join(", ", sansRenderer));
            Assert.IsEmpty(nonMaskable, "Graphic non-MaskableGraphic : " + string.Join(", ", nonMaskable));
        }

        /// <summary>Sans route connue, `RendreCorkboard()` ne doit fabriquer AUCUNE ficelle — il
        /// n'y a aucune des 3 bandes à partir desquelles dériver sa forme, et une géométrie
        /// inventée (deux étiquettes seules, sans route) serait une donnée fabriquée.</summary>
        [UnityTest]
        public IEnumerator EcranDistributionE6_AucuneRouteDansLaProjection_AucuneFicelleFabriquee()
        {
            var ecran = MonterEcran();
            ecran.RendrePourTest(CouriersFabrique(Courier("IDLE")), ProjectionFabrique());
            yield return null;

            Assert.IsNull(GameObject.Find("Ficelle"),
                "TD-558 : sans route connue, aucune ficelle ne doit être fabriquée");
        }

        // ═══ R — Résolveurs : QUATRE domaines DE TEXTE (contrôle positif + repli gracieux —
        // jamais de contrôle négatif "doit lever", contrairement à ㉚) + TROIS domaines DE FORME
        // (TD-558, R7-R9 — mêmes valeurs, résolveurs distincts, voir DistributionResolvers) ══════

        [Test]
        public void EcranDistributionR1_ResolveurChemin_CouvreLesDeuxValeursMesurees()
        {
            Assert.AreEqual("droit — le plus court", DistributionResolvers.TexteChemin("direct"));
            Assert.AreEqual("ça serpente — plus long, plus discret", DistributionResolvers.TexteChemin("meandering"));
        }

        /// <summary>⛔ UNE FALSIFIABLE PAR VALEUR SERVIE (22/09) : les trois `sinuosity_bucket` du back rendent chacune un texte NON
        /// VIDE et DIFFÉRENT de la valeur brute. Avant : `gnarled` sortait brut — le client testait `tortuous`, une hypothèse.</summary>
        [Test]
        public void EcranDistributionR1b_ChaqueSinuositeServie_RendUnTexte()
        {
            foreach (string v in new[] { "direct", "meandering", "gnarled" })
            {
                string texte = DistributionResolvers.TexteChemin(v);
                Assert.IsFalse(string.IsNullOrWhiteSpace(texte), $"« {v} » rend un texte vide");
                Assert.AreNotEqual(v, texte, $"« {v} » sort BRUTE : aucune correspondance pour une valeur que le back sert");
            }
        }

        [Test]
        public void EcranDistributionR2_ResolveurChemin_ReplyGracieuxSurValeurNonObservee()
        {
            // 23/09 (règle f2, atelier 28) : l'épingle « affichée BRUTE » est REMPLACÉE — la dérive de domaine se voit par un
            // test de couverture (`ReplisPlayModeTests`), jamais par l'œil du joueur. Toujours : jamais lever.
            Assert.AreEqual(MafiaCleanCity.I18n.Repli.EtatInconnu, DistributionResolvers.TexteChemin("bogus_5e_valeur"),
                "hors domaine : « état inconnu », jamais la valeur brute, jamais lever");
        }

        [Test]
        public void EcranDistributionR3_ResolveurTraverser_CouvreLesDeuxValeursMesurees()
        {
            Assert.AreEqual("aucune rivière", DistributionResolvers.TexteTraverser("none"));
            Assert.AreEqual("un pont", DistributionResolvers.TexteTraverser("single"));
        }

        [Test]
        public void EcranDistributionR4_ResolveurRouteState_CouvreLaSeuleValeurMesureeEtReplieGracieusement()
        {
            Assert.AreEqual("tient", DistributionResolvers.TexteRouteState("active"));
            // `severed` a reçu son mot (atelier 29, servi) : « coupée ». Une valeur NON servie, elle, reste « état inconnu ».
            Assert.AreEqual("coupée", DistributionResolvers.TexteRouteState("severed"));
            Assert.AreEqual(MafiaCleanCity.I18n.Repli.EtatInconnu, DistributionResolvers.TexteRouteState("zzz_hors_domaine"),
                "une valeur non mappée : « état inconnu » — ni la valeur brute, ni un texte inventé (règle f2, atelier 28)");
        }

        [Test]
        public void EcranDistributionR5_ResolveurVehicule_InsensibleALaCasse()
        {
            // ⚠️ CASSE — GET /v1/operational/couriers rend "FOOT"/"BIKE" (majuscules),
            // POST .../vehicles/purchase attend "foot"/"bike" (minuscules, via le 422 mesuré).
            Assert.AreEqual("à pied", DistributionResolvers.TexteVehicule("FOOT"));
            Assert.AreEqual("à pied", DistributionResolvers.TexteVehicule("foot"));
            Assert.AreEqual("à vélo", DistributionResolvers.TexteVehicule("BIKE"));
            Assert.AreEqual("en voiture", DistributionResolvers.TexteVehicule("car"));
            Assert.AreEqual("en camion réfrigéré", DistributionResolvers.TexteVehicule("refrigerated_van"));
        }

        [Test]
        public void EcranDistributionR6_ResolveurTransitBand_CouvreLesDeuxValeursMesureesEtLHypothese()
        {
            // D13 (23/09, atelier 30 v2) : formes ÉPICÈNES — « arrivé » / « prêt » présumaient un coursier masculin.
            Assert.AreEqual("à destination", DistributionResolvers.TexteTransitBand("ARRIVED"));
            Assert.AreEqual("disponible", DistributionResolvers.TexteTransitBand("IDLE"));
            Assert.AreEqual("en chemin", DistributionResolvers.TexteTransitBand("IN_TRANSIT"));
        }

        // ═══ TD-558 — les 3 résolveurs de FORME de la ficelle, même valeurs de domaine que
        // R1/R3/R4 ci-dessus, jamais relues autrement (voir DistributionResolvers) ═══════════════

        [Test]
        public void EcranDistributionR7_ResolveurFormeChaine_SeuleDirectEstDroite()
        {
            Assert.IsFalse(DistributionResolvers.FormeChaineSerpente("direct"),
                "'direct' (MESURÉE) doit rester un segment droit");
            Assert.IsTrue(DistributionResolvers.FormeChaineSerpente("meandering"),
                "'meandering' (MESURÉE) doit serpenter");
            Assert.IsTrue(DistributionResolvers.FormeChaineSerpente("gnarled"),
                "'gnarled' (3e cran du back, route-finder.service.ts:199) doit serpenter");
            Assert.IsTrue(DistributionResolvers.FormeChaineSerpente("bogus_valeur_inconnue"),
                "domaine NON confirmé fermé — une valeur inconnue serpente plutôt que de " +
                "prétendre être le cas simple confirmé");
        }

        [Test]
        public void EcranDistributionR8_ResolveurNombreTraversees_CouvreLesValeursMesureesEtLHypothese()
        {
            Assert.AreEqual(0, DistributionResolvers.NombreTraverseesFicelle("none"), "'none' (MESURÉE) → 0 marque");
            Assert.AreEqual(1, DistributionResolvers.NombreTraverseesFicelle("single"), "'single' (MESURÉE) → 1 marque");
            Assert.AreEqual(2, DistributionResolvers.NombreTraverseesFicelle("multiple"),
                "hypothèse m-57 'trois ponts', jamais observée — au moins 2 pour rester distinct de 'single'");
            Assert.AreEqual(1, DistributionResolvers.NombreTraverseesFicelle("bogus_valeur_inconnue"),
                "domaine NON confirmé fermé — une valeur inconnue non vide pose 1 marque, jamais 0 " +
                "ni un compte inventé");
            Assert.AreEqual(0, DistributionResolvers.NombreTraverseesFicelle(null), "repli anti-vacuité sur null");
        }

        [Test]
        public void EcranDistributionR9_ResolveurEstRompue_SeuleActiveEstIntacte()
        {
            Assert.IsFalse(DistributionResolvers.EstRompue("active"),
                "la SEULE valeur mesurée sur ce compte (3/3, voir R4) doit rester intacte");
            Assert.IsTrue(DistributionResolvers.EstRompue("severed"),
                "valeur annoncée par le brief, JAMAIS observée sur les 3 routes réelles disponibles " +
                "— domaine non confirmé fermé : tout ce qui n'est pas 'active' bascule sur la " +
                "branche interrompue plutôt que de prétendre connaître le domaine complet");
            Assert.IsTrue(DistributionResolvers.EstRompue(null), "null n'est pas 'active' → interrompu");
            Assert.IsTrue(DistributionResolvers.EstRompue(""), "chaîne vide n'est pas 'active' → interrompu");
        }

        // ═══ Z — FONDS DE ZONE (08/10) : la racine perd son aplat au décor de scène (CLIENT-2, DESIGN.md §3.3 B — le support `.planche`
        // s'y pose) ; chaque zone sœur garde SON fond (`.entete`, `.lecture`, `.bas`). Garde d'EFFET structurelle : chaque texte VISIBLE a un
        // ancêtre opaque STRICTEMENT sous la racine — sans quoi il se lirait sur la planche de bois claire.

        /// <summary>Les textes actifs sans ancêtre opaque (Image active, alpha ≥ 0,99) entre eux et la racine, racine EXCLUE.</summary>
        private static List<string> TextesSansFondDeZone(Transform racine, out int vus)
        {
            var orphelins = new List<string>();
            vus = 0;
            foreach (TMPro.TextMeshProUGUI t in racine.GetComponentsInChildren<TMPro.TextMeshProUGUI>(false))
            {
                if (string.IsNullOrEmpty(t.text)) continue;
                vus++;
                bool fond = false;
                for (Transform a = t.transform.parent; a != null && a != racine; a = a.parent)
                {
                    Image im = a.GetComponent<Image>();
                    if (im != null && im.isActiveAndEnabled && im.color.a >= 0.99f) { fond = true; break; }
                }
                if (!fond) orphelins.Add(t.transform.parent.name + "/" + t.name + " « " + t.text + " »");
            }
            return orphelins;
        }

        [UnityTest]
        public IEnumerator EcranDistributionZ1_ChaqueTexte_AUnFondDeZone_LaBandeBasseEnPied()
        {
            var ecran = MonterEcran();
            // le cas le plus PEUPLÉ : route (liège + lecture), deux courriers dont un qui se dégrade (note), un lieutenant nommé (pied complet)
            ecran.RendrePourTest(CouriersFabrique(Courier("IDLE"), Courier("ARRIVED", degrading: true)),
                ProjectionFabrique(RouteFabrique()), lieutenantLabel: "Lt. Rin");
            yield return null;
            Transform racine = RacineEcran().transform;

            List<string> orphelins = TextesSansFondDeZone(racine, out int vus);
            Assert.GreaterOrEqual(vus, 12, "anti-vacuité : titre, sous-titre, 2 étiquettes ×2, 3 lignes ×2, courriers, pied");
            Assert.IsEmpty(orphelins, "des textes sans fond de zone (ils se liraient sur le support du décor) : " + string.Join(" · ", orphelins));

            Transform bas = racine.GetChild(racine.childCount - 1);
            Assert.AreEqual("Bas", bas.name, "la bande basse `.bas` est le DERNIER enfant de la pile : ancrée en pied (㉘ B2)");
            Assert.IsTrue(bas.gameObject.activeSelf);
            Assert.IsNotNull(bas.Find("Filet"), "le filet haut de 2 px #2c3640");
            Assert.IsNotNull(bas.Find("Pied"), "le pied (voix + geste) est DANS la bande");
            Transform couriers = racine.Find("Corps/Couriers");
            Assert.AreEqual((0x1a, 0x11, 0x08), Trio(couriers.GetComponent<Image>().color), "la plaque `.lecture` #1a1108 sous VOS COURRIERS");
            Assert.IsNotNull(couriers.Find("Filet"), "son filet haut #3d3024 survit au rendu (le contenu est vidé, pas la plaque)");
            Transform lignes = racine.Find("Corps/Corkboard/Lignes");
            Assert.AreEqual((0x1a, 0x11, 0x08), Trio(lignes.GetComponent<Image>().color), "la `.lecture` sous le liège");

            // CONTRÔLE NÉGATIF : un texte posé à même le corps (aucune plaque) DOIT être nommé — sinon la garde ne voit rien
            GameObject sonde = new GameObject("Sonde", typeof(RectTransform));
            sonde.transform.SetParent(racine.Find("Corps"), false);
            sonde.AddComponent<CanvasRenderer>();
            sonde.AddComponent<TMPro.TextMeshProUGUI>().text = "sonde";
            Assert.AreEqual(1, TextesSansFondDeZone(racine, out _).Count, "contrôle négatif : la garde doit nommer la sonde posée sans fond");
            Object.DestroyImmediate(sonde);

            // le cas le plus PAUVRE : aucune route, aucun courrier, aucune destination — chaque texte restant a encore son fond
            ecran.RendrePourTest(CouriersFabrique(), ProjectionFabrique(), toLabel: null);
            yield return null;
            orphelins = TextesSansFondDeZone(racine, out vus);
            Assert.GreaterOrEqual(vus, 5, "anti-vacuité (état pauvre)");
            Assert.IsEmpty(orphelins, "état pauvre : " + string.Join(" · ", orphelins));
        }

        // ═══ F2 (juge d'ensemble r3, 08/10) — la planche de ㉘ « aucun relais » : du KRAFT grainé à DOUBLE encadrement, mesuré sur les PIXELS RENDUS ═══════════════════════════════════════
        //
        // Cause : le `Contour` du `.cadre-b` (5 px CSS de trait sur 3 px de rayon) était un sprite 9-slice dont la bande épaisse couvrait TOUT le sprite — le centre étiré était un aplat (74,55,34) opaque,
        // posé SUR la planche. Les gardes précédentes (F3 de r2 : « pas d'Image sur la plaque », « un conteneur Filets existe ») étaient des gardes de PARAMÈTRES : elles passaient avec l'aplat.
        // Ici : on rend l'écran (1080×2400, 1 px CSS = 3,6 px) et on lit — la bague `#2a1e12`, le trait `#4a3722`, le liseré (93,71,44) à leurs retraits de la maquette (4 · 5-10 · 10-11 px CSS du bord
        // de la planche ; cadre 54 : transitions à x=17-21 et 39-43 px d'image), puis le GRAIN de la planche entre la fiche et le bas : écart-type de luminance non nul, teinte du kraft et non du trait.
        // CONTRÔLE NÉGATIF : le même instrument, posé sur le trait plein (un aplat VOULU), doit rendre un écart-type ~0 — sinon il ne distinguerait pas un aplat d'un grain.
        [UnityTest]
        public IEnumerator EcranDistributionF2r3_AucunRelais_LaPlancheEstDuKraftGraine_ADoubleEncadrement_PixelsRendus()
        {
            const int W = 1080, H = 2400;
            var ecran = MonterEcran();
            yield return null; yield return null;
            ecran.MontrerAucunRelaisPourTest(gesteOffert: false);
            yield return null; yield return null;
            Transform racine = RacineEcran().transform;
            RectTransform plaque = (RectTransform)racine.Find("Corps/Corkboard/PanneauVide");
            Assert.IsNotNull(plaque, "l'état « aucun relais » pose sa plaque");
            Canvas canvas = racine.GetComponentInParent<Canvas>().rootCanvas;

            RenderMode modeAvant = canvas.renderMode; Camera cameraAvant = canvas.worldCamera; float planAvant = canvas.planeDistance;
            var rt = new RenderTexture(W, H, 24, RenderTextureFormat.ARGB32);
            var camGo = new GameObject("F2r3_cam");
            Camera cam = camGo.AddComponent<Camera>();
            cam.targetTexture = rt; cam.clearFlags = CameraClearFlags.SolidColor; cam.backgroundColor = Color.black; cam.orthographic = true;
            canvas.renderMode = RenderMode.ScreenSpaceCamera; canvas.worldCamera = cam; canvas.planeDistance = 10f;
            Canvas.ForceUpdateCanvases();
            yield return null;
            LayoutRebuilder.ForceRebuildLayoutImmediate((RectTransform)racine);
            Canvas.ForceUpdateCanvases();
            yield return null; yield return null;
            RectTransform crt = (RectTransform)canvas.transform;
            cam.orthographicSize = crt.rect.height / 2f; cam.aspect = crt.rect.width / crt.rect.height;
            cam.Render();
            RenderTexture avant = RenderTexture.active;
            RenderTexture.active = rt;
            var tex = new Texture2D(W, H, TextureFormat.RGB24, false);
            tex.ReadPixels(new Rect(0, 0, W, H), 0, 0); tex.Apply();
            RenderTexture.active = avant;

            try
            {
                float unitesParCss = ((RectTransform)racine).rect.width / 300f;   // la règle de la maquette (300 px CSS de large), lue sur la racine rendue
                float largeurCss = plaque.rect.width / unitesParCss, hauteurCss = plaque.rect.height / unitesParCss;
                Assert.Greater(largeurCss, 30f, "la plaque a une largeur (le rect est résolu)");
                Assert.Greater(hauteurCss, 30f, "la plaque a une hauteur (le rect est résolu)");
                // le pixel (origine EN BAS) du point (cssX depuis la gauche, fraction fy depuis le bas) de la plaque
                System.Func<float, float, Vector2Int> pixel = (cssX, fy) =>
                {
                    Vector3 monde = plaque.TransformPoint(new Vector3(plaque.rect.xMin + cssX * unitesParCss, plaque.rect.yMin + fy * plaque.rect.height, 0f));
                    Vector3 l = crt.InverseTransformPoint(monde);
                    return new Vector2Int(Mathf.FloorToInt((l.x - crt.rect.xMin) / crt.rect.width * W), Mathf.FloorToInt((l.y - crt.rect.yMin) / crt.rect.height * H));
                };
                System.Func<Color, Color, float> ecart = (a, b) => Mathf.Max(Mathf.Abs(a.r - b.r), Mathf.Max(Mathf.Abs(a.g - b.g), Mathf.Abs(a.b - b.b))) * 255f;
                Color Sur(float cssX, float fy) { Vector2Int p = pixel(cssX, fy); return tex.GetPixel(p.x, p.y); }

                // (1) le DOUBLE encadrement, sur une ligne sous la fiche (fy = 0,25 depuis le bas) — les teintes de `.cadre-b` (`box-shadow: 0 0 0 1px #2a1e12`, `border: 5px solid #4a3722`, `inset 0 0 0 1px #00000044`)
                Color bague = new Color32(0x2a, 0x1e, 0x12, 255), trait = DecorsDeScene.Filets.Distribution.CadreB[0].Couleur.Resoudre(), liseret = new Color32(93, 71, 44, 255);
                Color vBague = Sur(4.5f, 0.25f), vTrait = Sur(7.5f, 0.25f), vLiseret = Sur(10.5f, 0.25f), vKraft = Sur(15f, 0.25f);
                Assert.LessOrEqual(ecart(vBague, bague), 18f, $"la bague de 1 px CSS à 4,5 px du bord : {vBague} au lieu de {bague}");
                Assert.LessOrEqual(ecart(vTrait, trait), 14f, $"le trait de 5 px CSS à 7,5 px du bord : {vTrait} au lieu de {trait}");
                Assert.LessOrEqual(ecart(vLiseret, liseret), 22f, $"le liseré de 1 px CSS à 10,5 px du bord : {vLiseret} au lieu de {liseret}");
                Assert.Greater(ecart(vKraft, trait), 25f, $"à 15 px CSS du bord on est dans le KRAFT, pas dans le trait : {vKraft}");
                Assert.Greater(ecart(vBague, trait), 12f, "la bague se DISTINGUE du trait (deux filets, pas un)");
                Assert.Greater(ecart(Sur(2f, 0.25f), trait), 25f, "à 2 px CSS du bord : le kraft, AVANT la bague — le cadre est en retrait de la planche, pas collé à son bord");

                // (2) le GRAIN : entre la fiche et le bas, la planche n'est ni plate ni de la couleur du trait
                System.Func<float, float, float, float, (float moyenne, float sigma)> lumiere = (cx0, cx1, fy0, fy1) =>
                {
                    Vector2Int a = pixel(cx0, fy0), b = pixel(cx1, fy1);
                    var ls = new List<float>();
                    for (int x = Mathf.Min(a.x, b.x); x <= Mathf.Max(a.x, b.x); x++)
                        for (int y = Mathf.Min(a.y, b.y); y <= Mathf.Max(a.y, b.y); y++)
                        { Color c = tex.GetPixel(x, y); ls.Add(0.299f * c.r + 0.587f * c.g + 0.114f * c.b); }
                    float m = 0f; foreach (float l in ls) m += l; m /= ls.Count;
                    float v = 0f; foreach (float l in ls) v += (l - m) * (l - m);
                    return (m, Mathf.Sqrt(v / ls.Count));
                };
                var kraft = lumiere(largeurCss * 0.2f, largeurCss * 0.8f, 0.10f, 0.40f);
                var aplat = lumiere(6.5f, 8.5f, 0.15f, 0.85f);   // CONTRÔLE NÉGATIF : le trait plein
                float lumTrait = 0.299f * trait.r + 0.587f * trait.g + 0.114f * trait.b;
                Assert.Less(aplat.sigma, 0.002f, "contrôle négatif : l'instrument lit ~0 sur le trait plein (un aplat voulu)");
                Assert.Greater(kraft.sigma, 0.003f, $"la planche a du GRAIN (σ(lum) = {kraft.sigma:F5}) : 0 est l'aplat brun du juge r3");
                Assert.Greater(kraft.moyenne, lumTrait + 0.06f, $"la planche est du KRAFT (lum {kraft.moyenne:F3}), plus claire que le trait ({lumTrait:F3}) — l'aplat brun la masquait");
            }
            finally
            {
                canvas.renderMode = modeAvant; canvas.worldCamera = cameraAvant; canvas.planeDistance = planAvant;
                Object.DestroyImmediate(tex); Object.DestroyImmediate(camGo); rt.Release(); Object.DestroyImmediate(rt);
            }
        }

        private static (int, int, int) Trio(Color c) { Color32 k = c; return (k.r, k.g, k.b); }
    }
}
