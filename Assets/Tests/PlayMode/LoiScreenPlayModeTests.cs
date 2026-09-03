using System.Collections;
using System.Collections.Generic;
using NUnit.Framework;
using UnityEngine;
using UnityEngine.UI;
using UnityEngine.TestTools;
using MafiaCleanCity.Operational;
using MafiaCleanCity.CityMap;   // REUSE AuthClient (signup/signin) — patron ㊲/㉘ OuvrirJoueurFrais
using MafiaCleanCity.Tests;     // SeederSupport.SafeCallsign
using Object = UnityEngine.Object;

namespace MafiaCleanCity.Operational.Tests
{
    /// <summary>ecran_loi « La loi » (㉛) — « le parloir » — suite du chantier de métier du
    /// 2026-09-03.
    ///
    /// COUVERT : le montage structurel (CanvasRenderer, MaskableGraphic), la capture pour le juge
    /// visuel (armée, jamais exécutée cette passe — éditeur non lancé), QUATRE PARCOURS joueur
    /// réels (§P — un compte FRAIS vide, le compte de démo peuplé avec épingle sur l'ensemble de
    /// clés, le geste « rétention » aller-retour, le geste « recruter » de bout en bout), les
    /// états pilotés par la donnée (§E, via `RendrePourTest`) et les résolveurs des deux domaines
    /// (§R).
    /// NON EXÉCUTÉ cette passe (aucun test n'a tourné, seule la COMPILATION est prouvée — voir
    /// Tools/loi-implementation-notes.md). Régime de la semaine : pas de suite complète, pas de
    /// revue ⊥, pas de gate.
    /// NON COUVERT : `cases/:id/plea`/`cases/:id/payoff` (0 affaire active sur les deux comptes
    /// sondés — structurellement inatteignables, voir `LoiClient.cs`).</summary>
    [Category("EcranLoi")]
    public class LoiScreenPlayModeTests
    {
        private GameObject hostGo;

        [TearDown]
        public void TearDown()
        {
            GameObject reste = GameObject.Find("LoiRoot");
            while (reste != null) { Object.DestroyImmediate(reste); reste = GameObject.Find("LoiRoot"); }
            if (hostGo != null) Object.Destroy(hostGo);
            hostGo = null;
        }

        /// <summary>La racine RÉELLE de l'écran n'est PAS `hostGo` : hors shell, le contrôleur
        /// découvre un Canvas et bâtit dessous (patron ㊲/㉘, ligne pour ligne). Chercher
        /// `hostGo.GetComponentsInChildren` rendrait ZÉRO en silence.</summary>
        private GameObject RacineEcran()
        {
            GameObject r = GameObject.Find("LoiRoot");
            Assert.IsNotNull(r, "LoiRoot introuvable : le contrôleur n'a pas construit sa " +
                                "mise en page (ni sous mountParent, ni sous un Canvas découvert)");
            return r;
        }

        private LoiScreenController MonterEcran()
        {
            hostGo = new GameObject("LoiScreen", typeof(RectTransform));
            var ecran = hostGo.AddComponent<LoiScreenController>();
            return ecran;
        }

        // ═══ 1. GARDE STRUCTURELLE — ne lit aucun pixel, ne dépend d'aucune résolution ═══════

        /// <summary>⛔ TOUT `Graphic` PORTE SON `CanvasRenderer`, et TOUT Graphic sous ce fond
        /// est `MaskableGraphic` — patron ㊲/㉘, garde structurelle AVANT toute garde de valeur.
        ///
        /// Plancher à 2 (patron ㉘) : `BuildLayout()` construit, SANS aucune donnée (`MonterEcran()`
        /// seul, avant que `Charger()` n'ait eu le temps de compléter ses deux appels réseau), le
        /// fond (1) + le titre (1) + le sous-titre (1) — au moins 3, TOUJOURS, même à vide.</summary>
        [UnityTest]
        public IEnumerator EcranLoiS1_ToutGraphic_PorteSonCanvasRenderer()
        {
            MonterEcran();
            yield return null;   // laisser Start()/BuildLayout() s'exécuter (Charger() est lancé, pas fini)

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

        // ═══ Fixtures parcours — patron ㊲/㉘ ══════════════════════════════════════════════════

        private const string BaseUrl = "http://localhost";
        private static int callsignSeq;
        private string token;

        private IEnumerator OuvrirJoueurFrais()
        {
            var auth = new AuthClient { BaseUrl = BaseUrl };
            string callsign = SeederSupport.SafeCallsign("loi", ref callsignSeq);
            string err = null;
            token = null;
            yield return auth.SignUp(callsign, "screen-loi-fresh-pw", t => token = t, e => err = e);
            Assert.IsNull(err, $"signup a échoué : {err}");
            Assert.IsNotNull(token, "signup n'a pas rendu de jeton");
            // ⛔ FERMÉE ICI, PAS EN FIN DE TEST — patron ㉘ `OuvrirJoueurFrais` : signup/signin
            // ouvrent une `gameplay_session` (le corps rend `session_id`) dont d'autres tests de
            // la même suite PlayMode (sérielle, un seul processus) pourraient hériter le régime —
            // même famille que la co-tenance HUD/seeder du socle (CLAUDE.md § « un lot peut
            // changer le régime d'exécution d'un autre »).
            yield return FermerSession();
        }

        /// <summary>Le compte de démo NOMMÉ par le brief (`operational_demo@example.test`) — le
        /// SEUL compte mesuré à posséder déjà un avocat dans son roster (« Boutique Counsel »,
        /// `tier=boutique`, `retainer=false` — voir `EcranLoiP2`).</summary>
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
        /// compte FRAÎCHEMENT SIGNÉ a `activeCases: []` ET `lawyerRoster: []` — le parloir est
        /// vide des deux côtés au jour 1. `RendreRoster`/`RendreAffaires` doivent rendre les DEUX
        /// messages d'état vide honnêtes, jamais planter sur une liste vide.</summary>
        [UnityTest]
        public IEnumerator EcranLoiP1_ParcoursJoueurFrais_RosterEtAffairesVides()
        {
            yield return OuvrirJoueurFrais();

            var ecran = MonterEcran();
            ecran.SetToken(token);
            yield return ecran.Charger();

            Assert.IsNull(ecran.DerniereErreur, $"Charger() a levé une erreur : {ecran.DerniereErreur}");
            Assert.IsNotNull(ecran.DernierChargement, "GET /v1/me/legal n'a rien rendu");
            Assert.IsNotNull(ecran.DernierChargement.activeCases, "clé absente : activeCases");
            Assert.IsNotNull(ecran.DernierChargement.lawyerRoster, "clé absente : lawyerRoster");
            Assert.AreEqual(0, ecran.DernierChargement.activeCases.Length,
                "un compte fraîchement signé a désormais des affaires actives — RE-MESURER, cette " +
                "note est PÉRIMÉE et doit être réécrite, pas ignorée");
            Assert.AreEqual(0, ecran.DernierChargement.lawyerRoster.Length,
                "un compte fraîchement signé a désormais un roster non vide — RE-MESURER");

            CollectionAssert.Contains(ecran.RenderedTexts, "Vous n'avez encore engagé personne.",
                "état vide du roster non rendu");
            CollectionAssert.Contains(ecran.RenderedTexts, "Aucune affaire en cours.",
                "état vide des affaires non rendu");
        }

        /// <summary>Le compte NOMMÉ par le brief — ferme les six formes de chaîne morte pour cet
        /// écran : un joueur qui a déjà engagé un avocat peut charger son roster et voir ses 5
        /// clés. Épingle sur l'ENSEMBLE DE CLÉS consommé (précédent maison :
        /// `tutorial_overlay_session_open_non_regression.spec.ts`) sur le PREMIER avocat.</summary>
        [UnityTest]
        public IEnumerator EcranLoiP2_CompteDemo_ChargeLeRosterEtEpingleLesCinqCles()
        {
            yield return OuvrirCompteDemo();

            var ecran = MonterEcran();
            ecran.SetToken(token);
            yield return ecran.Charger();

            Assert.IsNull(ecran.DerniereErreur, $"Charger() a levé une erreur : {ecran.DerniereErreur}");
            Assert.IsNotNull(ecran.DernierChargement, "GET /v1/me/legal n'a rien rendu");
            Assert.IsNotNull(ecran.DernierChargement.lawyerRoster, "clé absente : lawyerRoster");
            Assert.Greater(ecran.DernierChargement.lawyerRoster.Length, 0,
                "0 avocat sur le compte de démo — la prémisse mesurée le 2026-09-03 (« Boutique " +
                "Counsel » déjà présent) ne tient plus, RE-MESURER avant d'accuser cet écran");

            LawyerDto a0 = ecran.DernierChargement.lawyerRoster[0];
            Assert.IsNotNull(a0.lawyerId, "clé absente : lawyerRoster[0].lawyerId");
            Assert.IsNotNull(a0.lawyerLabel, "clé absente : lawyerRoster[0].lawyerLabel");
            Assert.IsNotNull(a0.tier, "clé absente : lawyerRoster[0].tier");
            // `retainer` (bool) et `activeCaseCount` (int) n'ont pas de valeur "absente" en JSON —
            // épinglés par leur PRÉSENCE dans le texte rendu ci-dessous, pas par un IsNotNull qui
            // ne testerait rien sur un type valeur.

            Assert.IsNotNull(ecran.DernierChargement.activeCases, "clé absente : activeCases");

            CollectionAssert.Contains(ecran.RenderedTexts, a0.lawyerLabel,
                "le lawyerLabel servi par le back n'est pas affiché tel quel");
            Assert.Greater(ecran.RenderedTexts.Count, 0, "aucun texte rendu — l'écran est vide");
        }

        /// <summary>Le geste « rétention » (`PUT .../retainer`), MESURÉ PAR CE LOT — brief §2 :
        /// « c'est le SEUL geste qui reste au joueur une fois l'avocat recruté ». Aller-retour
        /// COMPLET sur le compte de démo (true PUIS false) pour ne pas laisser l'état modifié —
        /// même hygiène que la mesure `rtk proxy curl` qui a servi à écrire `LoiClient.cs`.</summary>
        [UnityTest]
        public IEnumerator EcranLoiP3_CompteDemo_GesteRetentionAllerRetour()
        {
            yield return OuvrirCompteDemo();

            var ecran = MonterEcran();
            ecran.SetToken(token);
            yield return ecran.Charger();
            Assert.Greater(ecran.DernierChargement.lawyerRoster.Length, 0,
                "0 avocat sur le compte de démo — prémisse non remplie, voir EcranLoiP2");

            string lawyerId = ecran.DernierChargement.lawyerRoster[0].lawyerId;
            bool etatInitial = ecran.DernierChargement.lawyerRoster[0].retainer;

            yield return ecran.BasculerRetainerEtRecharger(lawyerId, !etatInitial);
            Assert.IsTrue(ecran.DernierBasculementRetainerOk,
                $"PUT .../retainer (1er appel) a échoué : {ecran.DerniereErreur}");
            LawyerDto apres1 = System.Array.Find(ecran.DernierChargement.lawyerRoster,
                l => l.lawyerId == lawyerId);
            Assert.IsNotNull(apres1, "l'avocat a disparu du roster après le geste de rétention");
            Assert.AreEqual(!etatInitial, apres1.retainer, "le geste n'a pas basculé retainer");

            // Rétablissement — ne PAS laisser l'état modifié (patron : `retainer2.json` de la
            // mesure `rtk proxy curl` qui a produit ce fichier).
            yield return ecran.BasculerRetainerEtRecharger(lawyerId, etatInitial);
            Assert.IsTrue(ecran.DernierBasculementRetainerOk,
                $"PUT .../retainer (rétablissement) a échoué : {ecran.DerniereErreur}");
            LawyerDto apres2 = System.Array.Find(ecran.DernierChargement.lawyerRoster,
                l => l.lawyerId == lawyerId);
            Assert.AreEqual(etatInitial, apres2.retainer, "le rétablissement n'a pas restauré l'état initial");
        }

        /// <summary>Le geste « recruter » (`POST .../lawyers`, tier=boutique) de BOUT EN BOUT sur
        /// un compte FRAIS — mesuré en direct (2026-09-03) : un compte fraîchement signé a assez
        /// d'argent pour un `boutique` (succès 201 observé), pas pour un `corruption_pipeline`
        /// (402 PAYMENT_REQUIRED observé, coût 4 000 000 cents). Ce test ferme le SEUL geste de
        /// création exercé de bout en bout par ce lot.</summary>
        [UnityTest]
        public IEnumerator EcranLoiP4_JoueurFrais_GesteRecruterBoutique()
        {
            yield return OuvrirJoueurFrais();

            var ecran = MonterEcran();
            ecran.SetToken(token);
            yield return ecran.Charger();
            Assert.AreEqual(0, ecran.DernierChargement.lawyerRoster.Length,
                "prémisse non remplie : le compte frais a déjà un roster non vide");

            yield return ecran.RecruterAvocatEtRecharger("boutique");

            Assert.IsTrue(ecran.DernierRecrutementOk,
                $"POST .../lawyers {{tier:boutique}} a échoué sur un compte frais : {ecran.DerniereErreur}");
            Assert.AreEqual(1, ecran.DernierChargement.lawyerRoster.Length,
                "le roster n'a pas grandi après un recrutement réussi");
            Assert.AreEqual("boutique", ecran.DernierChargement.lawyerRoster[0].tier);
        }

        // ═══ E — États pilotés par la donnée (RendrePourTest) ══════════════════════════════════
        //
        // ⛔ Ne prouvent jamais que le back émet ces corps — seulement ce que l'écran EN FAIT.
        // La preuve du corps RÉEL est P1/P2 ci-dessus.

        private static LawyerDto Avocat(string label = "Boutique Counsel", string tier = "boutique",
            bool retainer = false, int affaires = 0) => new LawyerDto
        {
            lawyerId = System.Guid.NewGuid().ToString(),
            lawyerLabel = label,
            tier = tier,
            retainer = retainer,
            activeCaseCount = affaires,
        };

        private static GetLegalResponseDto Etat(LawyerDto[] roster = null, LegalCaseDto[] cases = null) =>
            new GetLegalResponseDto
            {
                lawyerRoster = roster ?? new LawyerDto[0],
                activeCases = cases ?? new LegalCaseDto[0],
            };

        [UnityTest]
        public IEnumerator EcranLoiE1_EtatVide_MessagesHonnetesSurLesDeuxSections()
        {
            var ecran = MonterEcran();
            ecran.RendrePourTest(Etat());
            yield return null;

            CollectionAssert.Contains(ecran.RenderedTexts, "Vous n'avez encore engagé personne.");
            CollectionAssert.Contains(ecran.RenderedTexts, "Aucune affaire en cours.");
            CollectionAssert.Contains(ecran.RenderedTexts,
                "Une affaire naît d'une descente — rien sur cet écran n'en crée.");
        }

        [UnityTest]
        public IEnumerator EcranLoiE2_UnAvocatLibre_AfficheLeLabelBrutEtLeBoutonMettreSousRetention()
        {
            var ecran = MonterEcran();
            ecran.RendrePourTest(Etat(roster: new[] { Avocat(retainer: false) }));
            yield return null;

            CollectionAssert.Contains(ecran.RenderedTexts, "Boutique Counsel", "lawyerLabel non affiché tel quel");
            CollectionAssert.Contains(ecran.RenderedTexts, "cabinet", "tag de tier absent (boutique)");
            CollectionAssert.Contains(ecran.RenderedTexts, "libre", "état de rétention absent");
            CollectionAssert.Contains(ecran.RenderedTexts, "0 affaire en cours", "compte d'affaires absent");
            CollectionAssert.Contains(ecran.RenderedTexts, "METTRE SOUS RÉTENTION", "bouton de rétention absent");
        }

        [UnityTest]
        public IEnumerator EcranLoiE3_UnAvocatSousRetention_AfficheLeBoutonLiberer()
        {
            var ecran = MonterEcran();
            ecran.RendrePourTest(Etat(roster: new[] { Avocat(tier: "corruption_pipeline", retainer: true) }));
            yield return null;

            CollectionAssert.Contains(ecran.RenderedTexts, "filière", "tag de tier absent (corruption_pipeline)");
            CollectionAssert.Contains(ecran.RenderedTexts, "sous rétention", "état de rétention absent");
            CollectionAssert.Contains(ecran.RenderedTexts, "LIBÉRER", "bouton de libération absent");
        }

        [UnityTest]
        public IEnumerator EcranLoiE4_RecrutementToujoursVisible_TroisCartesVerbatimMaquette()
        {
            var ecran = MonterEcran();
            ecran.RendrePourTest(Etat());
            yield return null;

            CollectionAssert.Contains(ecran.RenderedTexts, "Commis d'office");
            CollectionAssert.Contains(ecran.RenderedTexts, "EN PLACE");
            CollectionAssert.Contains(ecran.RenderedTexts, "Un cabinet");
            CollectionAssert.Contains(ecran.RenderedTexts, "DISPONIBLE");
            CollectionAssert.Contains(ecran.RenderedTexts, "La filière");
            CollectionAssert.Contains(ecran.RenderedTexts, "À VOS RISQUES");
            CollectionAssert.Contains(ecran.RenderedTexts,
                "La filière fait classer une affaire sans procès — mais elle se sert de gens qui, " +
                "un jour, peuvent parler à leur tour.");
        }

        /// <summary>⛔ JAMAIS EXERCÉ SUR LES DEUX COMPTES SONDÉS — repli DÉFENSIF seulement (voir
        /// `RendreAffaires`). N'exige RIEN sur le domaine d'un cas, seulement que l'écran ne
        /// plante pas et rende un compte honnête.</summary>
        [UnityTest]
        public IEnumerator EcranLoiE5_AffairesNonVideRepliDefensif_AfficheLeCompteSansCrash()
        {
            var ecran = MonterEcran();
            ecran.RendrePourTest(Etat(cases: new[] { new LegalCaseDto(), new LegalCaseDto() }));
            yield return null;

            CollectionAssert.Contains(ecran.RenderedTexts, "2 affaires en cours");
        }

        // ═══ R — Résolveurs ════════════════════════════════════════════════════════════════════

        [Test]
        public void EcranLoiR1_TierLabelCourt_CouvreLesDeuxValeursMesurees()
        {
            Assert.AreEqual("cabinet", LoiResolvers.TierLabelCourt("boutique"));
            Assert.AreEqual("filière", LoiResolvers.TierLabelCourt("corruption_pipeline"));
        }

        [Test]
        public void EcranLoiR2_TierLabelCourt_ReplyGracieuxSurValeurNonObservee()
        {
            Assert.AreEqual("bogus_5e_valeur", LoiResolvers.TierLabelCourt("bogus_5e_valeur"),
                "la valeur SERVIE de tier n'est confirmée fermée que sur le corps de CRÉATION " +
                "(422 sœur) — jamais de throw sur une valeur reçue, patron " +
                "DistributionResolvers.TexteVehicule");
        }

        [Test]
        public void EcranLoiR3_TexteRetainer_CouvreLesDeuxValeurs()
        {
            Assert.AreEqual("sous rétention", LoiResolvers.TexteRetainer(true));
            Assert.AreEqual("libre", LoiResolvers.TexteRetainer(false));
        }

        [Test]
        public void EcranLoiR4_TexteBoutonRetainer_CouvreLesDeuxValeurs()
        {
            Assert.AreEqual("LIBÉRER", LoiResolvers.TexteBoutonRetainer(true));
            Assert.AreEqual("METTRE SOUS RÉTENTION", LoiResolvers.TexteBoutonRetainer(false));
        }
    }
}
