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

        private const string BaseUrl = "http://localhost";
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
                req.SetRequestHeader("Authorization", "Bearer " + token);
                req.SetRequestHeader("Idempotency-Key", System.Guid.NewGuid().ToString());
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

            CollectionAssert.Contains(ecran.RenderedTexts, "L'envoi de ce soir", "titre repos absent");
            CollectionAssert.Contains(ecran.RenderedTexts, "ça serpente — plus long, plus discret",
                "résolveur LE CHEMIN muet (meandering)");
            CollectionAssert.Contains(ecran.RenderedTexts, "un pont",
                "résolveur À TRAVERSER muet (single)");
            CollectionAssert.Contains(ecran.RenderedTexts, "tient",
                "résolveur CETTE ROUTE muet (active)");
            CollectionAssert.Contains(ecran.RenderedTexts, "ENVOYER CE SOIR",
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
            CollectionAssert.DoesNotContain(ecran.RenderedTexts, "ENVOYER CE SOIR",
                "brief §2 : « en transit, aucun bouton »");
            CollectionAssert.Contains(ecran.RenderedTexts,
                "Il est en chemin. On ne le rappelle pas — on saura à l'arrivée.",
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

            CollectionAssert.Contains(ecran.RenderedTexts, "C'est livré", "titre livré absent");
            CollectionAssert.Contains(ecran.RenderedTexts, "TENDRE UNE AUTRE FICELLE", "bouton livré absent");
            CollectionAssert.DoesNotContain(ecran.RenderedTexts, "ENVOYER CE SOIR",
                "le libellé repos ne doit pas apparaître en état livré");
        }

        [UnityTest]
        public IEnumerator EcranDistributionE4_AucuneRouteDansLaProjection_MessageHonnetePasDeCrash()
        {
            var ecran = MonterEcran();
            ecran.RendrePourTest(CouriersFabrique(Courier("IDLE")), ProjectionFabrique());
            yield return null;

            CollectionAssert.Contains(ecran.RenderedTexts, "Aucune route connue pour l'instant.",
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
            CollectionAssert.DoesNotContain(ecran.RenderedTexts, "ENVOYER CE SOIR",
                "sans destination découverte, aucun bouton ne doit être fabriqué sur un id inventé");
            CollectionAssert.Contains(ecran.RenderedTexts,
                "Aucune destination connue pour l'envoi de ce soir.",
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

        [Test]
        public void EcranDistributionR2_ResolveurChemin_ReplyGracieuxSurValeurNonObservee()
        {
            Assert.AreEqual("bogus_5e_valeur", DistributionResolvers.TexteChemin("bogus_5e_valeur"),
                "domaine NON confirmé fermé — une valeur non listée doit être affichée BRUTE, " +
                "jamais lever (contrairement à ㉚.supplier_pressure_bucket, confirmé fermé lui)");
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
            Assert.AreEqual("severed", DistributionResolvers.TexteRouteState("severed"),
                "aucune valeur au-delà de 'active' n'est mesurée — repli brut, pas d'invention de texte");
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
            Assert.AreEqual("arrivé", DistributionResolvers.TexteTransitBand("ARRIVED"));
            Assert.AreEqual("prêt", DistributionResolvers.TexteTransitBand("IDLE"));
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
            Assert.IsTrue(DistributionResolvers.FormeChaineSerpente("tortuous"),
                "hypothèse m-57, jamais observée — doit quand même serpenter (repli, pas d'exception)");
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
    }
}
