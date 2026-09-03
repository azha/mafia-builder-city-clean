using System.Collections;
using System.Collections.Generic;
using NUnit.Framework;
using UnityEngine;
using UnityEngine.UI;
using UnityEngine.TestTools;
using MafiaCleanCity.Operational;
using MafiaCleanCity.CityMap;   // REUSE AuthClient (signup) — patron ㊲/㉛/㉘ OuvrirJoueurFrais
using MafiaCleanCity.Tests;     // SeederSupport.SafeCallsign
using Object = UnityEngine.Object;

namespace MafiaCleanCity.Operational.Tests
{
    /// <summary>ecran_conflit « Le conflit » (㉙) — « la table du fond » — suite du chantier de
    /// métier du 2026-09-03.
    ///
    /// COUVERT : le montage structurel (CanvasRenderer, MaskableGraphic), UN PARCOURS joueur réel
    /// (§P — signup frais → `Charger()` → assertion sur les DEUX routes réelles : `engagements`
    /// vide, `lieutenants` sans aucun MUSCLE — « le cas réel » du brief), les états pilotés par la
    /// donnée (§E, via `RendrePourTest` : vendetta groupée, familles hors domaine, MUSCLE présent
    /// vs absent) et les résolveurs du domaine clos annoncé (§R, contrôle positif ET négatif).
    /// NON EXÉCUTÉ cette passe (aucun test n'a tourné, seule la COMPILATION est prouvée — voir
    /// Tools/conflit-implementation-notes.md). Régime de la semaine : pas de suite complète, pas
    /// de revue ⊥, pas de gate.
    /// NON COUVERT : `EnvoyerCeSoirEtRecharger` de bout en bout en SUCCÈS (structurellement
    /// inatteignable — aucun compte sondé n'a de lieutenant MUSCLE, voir `ConflitClient.cs`) ;
    /// m-63/m-64 (voir le commentaire de classe de `ConflitScreenController`, hors du périmètre
    /// de ce lot).</summary>
    [Category("EcranConflit")]
    public class ConflitScreenPlayModeTests
    {
        private GameObject hostGo;

        [TearDown]
        public void TearDown()
        {
            GameObject reste = GameObject.Find("ConflitRoot");
            while (reste != null) { Object.DestroyImmediate(reste); reste = GameObject.Find("ConflitRoot"); }
            if (hostGo != null) Object.Destroy(hostGo);
            hostGo = null;
        }

        /// <summary>La racine RÉELLE de l'écran n'est PAS `hostGo` : hors shell, le contrôleur
        /// découvre un Canvas et bâtit dessous (patron ㊲/㉛/㉘, ligne pour ligne). Chercher
        /// `hostGo.GetComponentsInChildren` rendrait ZÉRO en silence.</summary>
        private GameObject RacineEcran()
        {
            GameObject r = GameObject.Find("ConflitRoot");
            Assert.IsNotNull(r, "ConflitRoot introuvable : le contrôleur n'a pas construit sa " +
                                "mise en page (ni sous mountParent, ni sous un Canvas découvert)");
            return r;
        }

        private ConflitScreenController MonterEcran()
        {
            hostGo = new GameObject("ConflitScreen", typeof(RectTransform));
            var ecran = hostGo.AddComponent<ConflitScreenController>();
            return ecran;
        }

        // ═══ 1. GARDE STRUCTURELLE — ne lit aucun pixel, ne dépend d'aucune résolution ═══════

        /// <summary>⛔ TOUT `Graphic` PORTE SON `CanvasRenderer`, et TOUT Graphic sous ce fond
        /// est `MaskableGraphic` — patron ㊲/㉛/㉘, garde structurelle AVANT toute garde de valeur
        /// (c'est celle qui a fermé la classe "occlusion par fratrie" en 12 lignes là où 4 tours
        /// de gardes pixel n'y voyaient rien).
        ///
        /// Plancher à 2 (patron ㉛/㉘) : `BuildLayout()` construit, SANS aucune donnée
        /// (`MonterEcran()` seul, avant que `Charger()` n'ait eu le temps de compléter ses deux
        /// appels réseau), le fond (1) + le titre (1) + le sous-titre (1) — au moins 3,
        /// TOUJOURS, même à vide.</summary>
        [UnityTest]
        public IEnumerator EcranConflitS1_ToutGraphic_PorteSonCanvasRenderer()
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
        // Mesuré le 2026-09-03 sur les PNG produits par le même gabarit sur les écrans voisins, en
        // comptant les teintes distinctes quantifiées à 5 bits par canal :
        //     ecran_appro_1080x1920.png                 →   2 teintes
        //     ecran_appro_1080x2400.png                 →   2 teintes
        //     planche_la_chaine_d_appro_1080x2400.png   → 563 teintes   (sous le chrome réel)
        //     planche_la_distribution_1080x2400.png     → 573 teintes   (sous le chrome réel)
        // Deux teintes, c'est un fond et un titre. Les trois autres écrans du chantier l'ont déjà
        // retiré (㉚, ㉘, ㉛) plutôt que de commiter l'image.
        //
        // ★ ET LA GARDE ANTI-VACUITÉ DU GABARIT CERTIFIAIT CE VIDE. Elle assertait
        // `horsFond > 0` — « l'image n'est pas parfaitement uniforme » — avec un plancher que son
        // propre commentaire déclarait « volontairement bas, à durcir une fois BuildLayout()
        // rempli ». Un écran qui rend son fond ET son titre la satisfait. *Une garde qui mesure la
        // mauvaise propriété est pire que pas de garde : elle certifie le défaut.* Et le
        // durcissement différé n'est jamais venu — un différé sans détecteur n'est pas un différé,
        // c'est un trou.
        //
        // ⇒ La capture de cet écran, si elle est un jour requise, doit être prise SOUS LE CHROME
        // RÉEL (patron `PlancheChantierCCapturePlayModeTests` des écrans voisins), monté par le
        // shell, chargement abouti, rect du locataire mesuré — pas l'encre de toute l'image.
        // Hors du régime de la semaine (pas de capture, pas de revue, pas de gate).

        // ═══ Fixture parcours : un joueur à soi, patron ㊲/㉛/㉘ `OuvrirJoueurFrais` ═══════════════

        private const string BaseUrl = "http://localhost";
        private static int callsignSeq;
        private string token;

        private IEnumerator OuvrirJoueurFrais()
        {
            var auth = new AuthClient { BaseUrl = BaseUrl };
            string callsign = SeederSupport.SafeCallsign("conflit", ref callsignSeq);
            string err = null;
            token = null;
            yield return auth.SignUp(callsign, "screen-conflit-pw", t => token = t, e => err = e);
            Assert.IsNull(err, $"signup a échoué : {err}");
            Assert.IsNotNull(token, "signup n'a pas rendu de jeton");
            // ⛔ FERMÉE ICI, PAS EN FIN DE TEST — patron ㉛/㉘ `OuvrirJoueurFrais` : signup/signin
            // ouvrent une `gameplay_session` dont d'autres tests de la même suite PlayMode
            // (sérielle, un seul processus) pourraient hériter le régime.
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
        //
        // signup → `Charger()` (les deux GET, `session/open` du shell n'étant pas requis par ces
        // routes — mesuré : `GET /v1/lieutenants`/`GET /v1/me/engagements` répondent au seul
        // Bearer du signup). C'est le SEUL test qui ferme les six formes de chaîne morte pour cet
        // écran : un vert ici prouve qu'un joueur qui vient de naître peut atteindre l'écran ET
        // que « le cas réel » du brief (zéro lieutenant MUSCLE) est bien ce que l'écran rend.
        [UnityTest]
        public IEnumerator EcranConflitP1_ParcoursJoueurFrais_AucunMuscleEtVendettaVide()
        {
            yield return OuvrirJoueurFrais();

            var ecran = MonterEcran();
            ecran.SetToken(token);
            yield return ecran.Charger();

            Assert.IsNull(ecran.DerniereErreur, $"Charger() a levé une erreur : {ecran.DerniereErreur}");
            Assert.IsNotNull(ecran.DernierChargementLieutenants, "GET /v1/lieutenants n'a rien rendu");
            Assert.IsNotNull(ecran.DernierChargementLieutenants.lieutenants, "clé absente : lieutenants");
            Assert.Greater(ecran.DernierChargementLieutenants.lieutenants.Length, 0,
                "un signup frais n'a désormais AUCUN lieutenant — RE-MESURER, cette note est " +
                "PÉRIMÉE et doit être réécrite, pas ignorée (le kit de départ mesuré le " +
                "2026-09-03 en donne 2, tous COOK)");

            // ⛔⛔ LA PRÉMISSE CENTRALE DU LOT, RÉ-EXERCÉE EN DIRECT — pas supposée.
            Assert.AreEqual(0, ecran.MuscleLieutenants.Count,
                "un signup frais a désormais un lieutenant MUSCLE — RE-MESURER : cette note est " +
                "PÉRIMÉE et le geste d'envoi devient possible, ce n'est plus « le cas réel » du brief");

            Assert.IsNotNull(ecran.DernierChargementEngagements, "GET /v1/me/engagements n'a rien rendu");
            Assert.IsNotNull(ecran.DernierChargementEngagements.engagements, "clé absente : engagements");
            Assert.AreEqual(0, ecran.DernierChargementEngagements.engagements.Length,
                "un signup frais a désormais des engagements — RE-MESURER, cette note est PÉRIMÉE");

            CollectionAssert.Contains(ecran.RenderedTexts,
                "Aucun de vos lieutenants n'est du genre Gros bras.",
                "le message d'impossibilité (« le cœur de ce lot ») n'est pas rendu alors qu'aucun " +
                "MUSCLE n'existe");
            CollectionAssert.Contains(ecran.RenderedTexts, "on n'y est jamais allés",
                "la vendetta vide n'affiche pas le message honnête attendu pour au moins une famille");
        }

        // ═══ E — États pilotés par la donnée (RendrePourTest, patron ㊲/㉛/㉘ §5) ═════════════════
        //
        // ⛔ Ne prouvent jamais que le back émet ces corps — seulement ce que l'écran EN FAIT.
        // La preuve du corps RÉEL (« zéro MUSCLE ») est P1 ci-dessus.

        private static LieutenantRowDto Lieutenant(string archetype, string tenure = "FRESH", string nom = "Lt. Test") =>
            new LieutenantRowDto
            {
                lieutenant_id = "00000000-0000-4000-8000-000000000000",
                name = nom,
                archetype = archetype,
                op_state_band = "IDLE",
                rule_count_band = "NONE",
                tenure_bucket = tenure,
            };

        [UnityTest]
        public IEnumerator EcranConflitE1_AucunMuscle_AfficheLimpossibiliteEtAucunBouton()
        {
            var ecran = MonterEcran();
            ecran.RendrePourTest(
                new GetLieutenantsResponseDto { lieutenants = new[] { Lieutenant("COOK"), Lieutenant("LOGISTICS") } },
                new GetEngagementsResponseDto { engagements = new EngagementDto[0] });
            yield return null;

            Assert.AreEqual(0, ecran.MuscleLieutenants.Count);
            CollectionAssert.Contains(ecran.RenderedTexts,
                "Aucun de vos lieutenants n'est du genre Gros bras.");
            CollectionAssert.DoesNotContain(ecran.RenderedTexts, "Dites-moi qui j'envoie et sur quoi. " +
                "Je pars ce soir, on saura demain.",
                "la réplique du lieutenant envoyé ne doit apparaître QUE si un MUSCLE est trouvé");
        }

        [UnityTest]
        public IEnumerator EcranConflitE2_MusclePresent_AfficheLeLieutenantMaisAucunBouton()
        {
            var ecran = MonterEcran();
            ecran.RendrePourTest(
                new GetLieutenantsResponseDto
                {
                    lieutenants = new[] { Lieutenant("COOK"), Lieutenant("MUSCLE", "SEASONED", "Lt. Vasca") },
                },
                new GetEngagementsResponseDto { engagements = new EngagementDto[0] });
            yield return null;

            Assert.AreEqual(1, ecran.MuscleLieutenants.Count);
            CollectionAssert.Contains(ecran.RenderedTexts, "Lt. Vasca",
                "le nom du lieutenant MUSCLE trouvé n'est pas rendu");
            // Résolveur PARTAGÉ `FamilleLabels` (DRY, pas une seconde table de correspondance) :
            // MUSCLE → « Gros bras », SEASONED → « Aguerri ».
            CollectionAssert.Contains(ecran.RenderedTexts, "Gros bras · Aguerri",
                "la bande archétype/ancienneté ne passe pas par le résolveur PARTAGÉ FamilleLabels");
            CollectionAssert.Contains(ecran.RenderedTexts,
                "Dites-moi qui j'envoie et sur quoi. Je pars ce soir, on saura demain.");
            CollectionAssert.Contains(ecran.RenderedTexts,
                "Vous avez l'homme. Personne pour lui dire où frapper — aucune route ne connaît " +
                "encore vos rivaux.",
                "même avec un MUSCLE trouvé, l'écran doit dire que la cible reste indécouvrable — " +
                "aucun bouton cliquable n'est construit cette passe");
        }

        [UnityTest]
        public IEnumerator EcranConflitE3_VendettaGroupeeParFamille_EtFamilleInconnueSignalee()
        {
            var ecran = MonterEcran();
            ecran.RendrePourTest(
                new GetLieutenantsResponseDto { lieutenants = new LieutenantRowDto[0] },
                new GetEngagementsResponseDto
                {
                    engagements = new[]
                    {
                        new EngagementDto { target_rival_key = "tarcum" },
                        new EngagementDto { target_rival_key = "tarcum" },
                        new EngagementDto { target_rival_key = "coil" },
                        new EngagementDto { target_rival_key = "une_5e_famille_jamais_annoncee" },
                    },
                });
            yield return null;

            CollectionAssert.Contains(ecran.RenderedTexts, "on y est allés 2 fois",
                "le compte groupé par target_rival_key='tarcum' (2 entrées fabriquées) est faux");
            CollectionAssert.Contains(ecran.RenderedTexts, "on y est allés 1 fois",
                "le compte groupé par target_rival_key='coil' (1 entrée fabriquée) est faux");
            CollectionAssert.Contains(ecran.RenderedTexts, "on n'y est jamais allés",
                "saltline/iron_throat (0 entrée fabriquée) devraient rester à zéro, honnêtement");
            CollectionAssert.Contains(ecran.RenderedTexts,
                "1 envoi vise une famille hors des quatre connues — non affiché ci-dessus.",
                "une clé hors domaine ne doit pas être silencieusement perdue par le comptage");
        }

        // ═══ R — Résolveurs : domaine ANNONCÉ CLOS, contrôle positif ET négatif ═══════════════
        //
        // `target_rival_key` est annoncé clos par l'orchestrateur (coil|tarcum|iron_throat|
        // saltline), NON reproduit ici par un message d'erreur back (voir `ConflitDtos.cs`) —
        // c'est pourquoi `ConflitResolvers.NomFamille`/`SousTitreFamille` portent un
        // `default: throw` MALGRÉ cette réserve : ils ne sont appelés QUE sur les 4 clés que
        // l'écran énumère lui-même. Contrôle positif (les 4 valeurs connues résolvent) ET négatif
        // (une 5ᵉ valeur est BRUYANTE, pas absorbée en silence) — sans le second, le premier ne
        // prouve pas que le repli existe, seulement que les cas heureux marchent.
        [Test]
        public void EcranConflitR1_ResolveurNomFamille_CouvreLesQuatreValeursAnnoncees()
        {
            Assert.AreEqual("La Coil", ConflitResolvers.NomFamille("coil"));
            Assert.AreEqual("Tarcum", ConflitResolvers.NomFamille("tarcum"));
            Assert.AreEqual("Gorge-de-Fer", ConflitResolvers.NomFamille("iron_throat"));
            Assert.AreEqual("Saltline", ConflitResolvers.NomFamille("saltline"));
        }

        [Test]
        public void EcranConflitR2_ResolveurNomFamille_RejetteUneValeurHorsDomaineAnnonce()
        {
            Assert.Throws<System.ArgumentOutOfRangeException>(
                () => ConflitResolvers.NomFamille("BOGUS_5E_VALEUR"),
                "une valeur hors du domaine annoncé (coil|tarcum|iron_throat|saltline) doit être " +
                "BRUYANTE, jamais absorbée en silence par un repli connu");
        }

        [Test]
        public void EcranConflitR3_ResolveurSousTitreFamille_CouvreLesQuatreValeursAnnoncees()
        {
            Assert.AreEqual("les ferrailleurs de Spine", ConflitResolvers.SousTitreFamille("coil"));
            Assert.AreEqual("le port, et ce qui y entre", ConflitResolvers.SousTitreFamille("tarcum"));
            Assert.AreEqual("les docks du nord", ConflitResolvers.SousTitreFamille("iron_throat"));
            Assert.AreEqual("la ligne de sel, à l'est", ConflitResolvers.SousTitreFamille("saltline"));
        }

        [Test]
        public void EcranConflitR4_ResolveurSousTitreFamille_RejetteUneValeurHorsDomaineAnnonce()
        {
            Assert.Throws<System.ArgumentOutOfRangeException>(
                () => ConflitResolvers.SousTitreFamille("BOGUS_5E_VALEUR"));
        }
    }
}
