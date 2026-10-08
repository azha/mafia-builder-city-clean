using System.Collections;
using System.Collections.Generic;
using NUnit.Framework;
using UnityEngine;
using UnityEngine.UI;
using UnityEngine.TestTools;
using MafiaCleanCity.Operational;
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
        /// Dans l'état « aucun relais » un PANNEAU de liège borné porte l'étiquette crème « D'OÙ ÇA PART » et le titre de l'état — deux clés DÉJÀ servies — et prend le corps ; l'état nominal ne le garde pas.</summary>
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
            Assert.AreEqual(racine.Find("Entete/Titre").GetComponent<TMPro.TextMeshProUGUI>().text, chip.Find("Titre").GetComponent<TMPro.TextMeshProUGUI>().text, "le titre de l'état, sans mot nouveau");
            RectTransform corps = (RectTransform)racine.Find("Corps"), panneau = (RectTransform)vide;
            Assert.Greater(panneau.rect.height, 0.4f * corps.rect.height, "le panneau remplit le corps : le trou de 87 % (F2) n'est plus un tapis nu");
            Assert.LessOrEqual(panneau.rect.height, corps.rect.height + 0.5f, "le panneau reste DANS le corps");
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

        private static (int, int, int) Trio(Color c) { Color32 k = c; return (k.r, k.g, k.b); }
    }
}
