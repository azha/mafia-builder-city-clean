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
    /// 2026-09-03.
    ///
    /// COUVERT : le montage structurel (CanvasRenderer, MaskableGraphic), la capture pour le juge
    /// visuel (armée, jamais exécutée cette passe — éditeur non lancé), DEUX PARCOURS joueur réels
    /// (§P — un compte FRAIS, sans distribution_hub dans son kit de départ, et le compte de démo
    /// nommé par le brief, qui EN a un), les 5 états pilotés par la donnée (§E, via
    /// `RendrePourTest`) et les résolveurs des 5 domaines (§R, tous à repli gracieux — aucun n'est
    /// confirmé fermé par un message d'erreur, contrairement à ㉚).
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

        // ═══ 2. CAPTURE pour le juge visuel ⊥ — deux résolutions ══════════════════════════════

        /// <summary>Patron ㊲/㉚ (`CapturerA`) : bascule le Canvas en `ScreenSpaceCamera` sur une
        /// `RenderTexture` de la taille CIBLE, reconstruit le layout APRÈS la bascule, cadre
        /// l'ortho sur le rect RÉEL du canvas.</summary>
        [UnityTest, Category("PhotoEcranDistribution")]
        public IEnumerator EcranDistributionC1_CapturerPourLeJugeVisuel_DeuxResolutions()
        {
            MonterEcran();
            yield return null;

            yield return CapturerA(1080, 1920, "Assets/Screenshots/ecran_distribution_1080x1920.png");
            yield return CapturerA(1080, 2400, "Assets/Screenshots/ecran_distribution_1080x2400.png");
        }

        private IEnumerator CapturerA(int largeur, int hauteur, string chemin)
        {
            GameObject racine = RacineEcran();
            Canvas canvas = racine.GetComponentInParent<Canvas>();
            Assert.IsNotNull(canvas, "DistributionRoot n'est sous aucun Canvas : rien ne peut être rendu");

            RenderMode modeAvant = canvas.renderMode;
            Camera cameraAvant = canvas.worldCamera;
            float planAvant = canvas.planeDistance;

            var rt = new RenderTexture(largeur, hauteur, 24, RenderTextureFormat.ARGB32);
            var camGo = new GameObject("CaptureCamEcranDistribution");
            var cam = camGo.AddComponent<Camera>();
            cam.targetTexture = rt;
            cam.clearFlags = CameraClearFlags.SolidColor;
            cam.backgroundColor = Color.black;
            cam.orthographic = true;

            canvas.renderMode = RenderMode.ScreenSpaceCamera;
            canvas.worldCamera = cam;
            canvas.planeDistance = 10f;
            Canvas.ForceUpdateCanvases();
            yield return null;

            LayoutRebuilder.ForceRebuildLayoutImmediate((RectTransform)racine.transform);
            Canvas.ForceUpdateCanvases();
            yield return null;
            yield return null;

            RectTransform crt = (RectTransform)canvas.transform;
            cam.orthographicSize = crt.rect.height / 2f;
            cam.aspect = crt.rect.width / crt.rect.height;

            cam.Render();
            RenderTexture prev = RenderTexture.active;
            RenderTexture.active = rt;
            var tex = new Texture2D(largeur, hauteur, TextureFormat.RGB24, false);
            tex.ReadPixels(new Rect(0, 0, largeur, hauteur), 0, 0);
            tex.Apply();
            RenderTexture.active = prev;
            System.IO.File.WriteAllBytes(chemin, tex.EncodeToPNG());

            // Anti-vacuité de FORME (patron ㊲/㉚) : une capture ratée est UNIFORME.
            Color[] pixels = tex.GetPixels();
            var histo = new Dictionary<int, int>();
            foreach (Color c in pixels)
            {
                int k = (Mathf.RoundToInt(c.r * 31) << 10) | (Mathf.RoundToInt(c.g * 31) << 5) | Mathf.RoundToInt(c.b * 31);
                histo.TryGetValue(k, out int n); histo[k] = n + 1;
            }
            int dominant = 0;
            foreach (var kv in histo) if (kv.Value > dominant) dominant = kv.Value;
            int horsFond = pixels.Length - dominant;
            Assert.Greater(horsFond, 0,
                $"capture {largeur}x{hauteur} entièrement UNIFORME — l'écran n'a rien rendu hors " +
                "de son propre fond");

            canvas.renderMode = modeAvant;
            canvas.worldCamera = cameraAvant;
            canvas.planeDistance = planAvant;
            Object.Destroy(camGo);
            rt.Release();
            yield return null;
        }

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

        // ═══ R — Résolveurs : QUATRE domaines, AUCUN confirmé fermé (contrôle positif + repli
        // gracieux — jamais de contrôle négatif "doit lever", contrairement à ㉚) ════════════════

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
    }
}
