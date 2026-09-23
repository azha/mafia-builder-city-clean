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
        // ⛔ TD-576, CLASSE « CATALOGUE » (2026-09-23) — cette classe charge le catalogue i18n (directement, ou en montant un
        // écran / le shell / la scène du build qui l'amorce) et ne le rendait JAMAIS : global statique, il passait à la classe
        // suivante. Mesuré : le 1er cas d'`ArchetypeServi_…` a hérité d'un bundle réel laissé en amont. Rendu à chaque test ;
        // la garde de sortie de MafiaCI nomme toute classe qui le laisserait encore chargé.
        [TearDown] public void OublierLeCatalogue() => MafiaCleanCity.I18n.I18nCatalog.Oublier();

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
            CollectionAssert.Contains(ecran.RenderedTexts, "on ne les a pas croisés",
                "aucun envoi rentré : la ligne de la table 40 (conflit.bloc.on_ne_les_a_pas_croises) doit être rendue");
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
                "Vous avez l'homme. Personne pour lui dire où frapper — on ne sait pas encore " +
                "où ils sont.",
                "même avec un MUSCLE trouvé, l'écran doit dire que la cible reste indécouvrable — " +
                "aucun bouton cliquable n'est construit cette passe");
        }

        [UnityTest]
        public IEnumerator EcranConflitE3_LesRentresSeulsSeComptent_ParFamille_ZeroDitOnNeLesAPasCroises()
        {
            var ecran = MonterEcran();
            ecran.RendrePourTest(
                new GetLieutenantsResponseDto { lieutenants = new LieutenantRowDto[0] },
                new GetEngagementsResponseDto
                {
                    engagements = new[]
                    {
                        Envoi("e1", "tarcum", "Tarcum", "resolved", "advance", "low", "medium"),
                        Envoi("e2", "tarcum", "Tarcum", "resolved", "hold", "medium", "medium"),
                        Envoi("e3", "tarcum", "Tarcum", "scheduled", "", "", "medium"),
                        Envoi("e4", "coil", "La Coil", "resolved", "hold", "high", "medium"),
                        Envoi("e5", "iron_throat", "Gorge-de-Fer", "scheduled", "", "", "medium"),
                        Envoi("e6", "une_5e_famille_jamais_annoncee", "unknown_une_5e_famille_jamais_annoncee",
                              "resolved", "contested", "medium", "medium"),
                    },
                });
            yield return null;

            Assert.AreEqual("2 fois", TexteDe(ecran, "Famille_tarcum", "Fois"),
                "tarcum : 2 envois RENTRÉS ; le 3ᵉ, parti, n'y est pas encore allé (arbitrage du 23/09)");
            Assert.AreEqual("on est allés chez eux", TexteDe(ecran, "Famille_tarcum", "Visites"));
            Assert.AreEqual("1 fois", TexteDe(ecran, "Famille_coil", "Fois"), "`one {# fois}` de l'ICU");
            Assert.IsNull(TexteDe(ecran, "Famille_iron_throat", "Fois"),
                "iron_throat : un seul envoi, PARTI ⇒ 0 rentré ⇒ pas de compte (l'ICU ne sert qu'à partir de 1)");
            Assert.AreEqual("on ne les a pas croisés", TexteDe(ecran, "Famille_iron_throat", "Visites"));
            Assert.AreEqual("on ne les a pas croisés", TexteDe(ecran, "Famille_saltline", "Visites"));
            CollectionAssert.DoesNotContain(ecran.RenderedTexts, "jamais", "à 0, pas de doublon « jamais » + « on ne les a pas croisés »");
            foreach (string t in ecran.RenderedTexts)
                StringAssert.DoesNotContain("une_5e_famille", t, "une famille hors domaine ne s'affiche nulle part, ni sa sentinelle");
            Assert.AreEqual("les ferrailleurs de Spine", TexteDe(ecran, "Famille_coil", "SousTitre"),
                "sous-titre de la maquette ratifiée, clé servie (balayage 34)");
        }

        [UnityTest]
        public IEnumerator EcranConflitE4_CompteIndisponible_AucuneLigneDeCompte()
        {
            var ecran = MonterEcran();
            ecran.RendrePourTest(new GetLieutenantsResponseDto { lieutenants = new LieutenantRowDto[0] }, null);
            yield return null;

            CollectionAssert.Contains(ecran.RenderedTexts, "Le compte des envois précédents n'a pas répondu.");
            foreach (string cle in ConflitResolvers.DomaineFamilles)
            {
                Assert.IsNull(TexteDe(ecran, "Famille_" + cle, "Visites"), cle + " : un compte à zéro mentirait quand la route n'a pas répondu");
                Assert.IsNull(TexteDe(ecran, "Famille_" + cle, "Fois"));
            }
            CollectionAssert.DoesNotContain(ecran.RenderedTexts, "compte indisponible", "l'ancien littéral hors Libelle est retiré");
        }

        /// <summary>Le texte du nœud `enfant` sous la ligne `ligne` de la table, ou null s'il n'existe pas. Cherché sous
        /// `ConflitRoot` (`RacineEcran`) : hors shell, l'écran bâtit sous un Canvas découvert, pas sous son hôte.</summary>
        private string TexteDe(ConflitScreenController ecran, string ligne, string enfant)
        {
            foreach (TMPro.TextMeshProUGUI t in RacineEcran().GetComponentsInChildren<TMPro.TextMeshProUGUI>(true))
                if (t.name == enfant && t.transform.parent != null
                    && (t.transform.parent.name == ligne || (t.transform.parent.parent != null && t.transform.parent.parent.name == ligne)))
                    return t.text;
            return null;
        }

        // ═══ R — Résolveurs : couverture du domaine des 4 familles ═══════════════════════════
        //
        // `target_rival_key` est clos côté back (enum Postgres `rival_key`, `RIVAL_DISPLAY_NAME` à 4 entrées) et une famille
        // hors domaine est refusée au POST (404). Hors domaine, `NomFamille` rend « type inconnu » comme tout résolveur de
        // SORTE — jamais la clé brute, jamais une exception.
        [Test]
        public void EcranConflitR1_ResolveurNomFamille_CouvreLesQuatreValeurs()
        {
            Assert.AreEqual("La Coil", ConflitResolvers.NomFamille("coil"));
            Assert.AreEqual("Tarcum", ConflitResolvers.NomFamille("tarcum"));
            Assert.AreEqual("Gorge-de-Fer", ConflitResolvers.NomFamille("iron_throat"));
            Assert.AreEqual("Saltline", ConflitResolvers.NomFamille("saltline"));
            var vus = new HashSet<string>();
            foreach (string cle in ConflitResolvers.DomaineFamilles)
                Assert.IsTrue(vus.Add(ConflitResolvers.NomFamille(cle)), "deux familles ne partagent pas un nom : " + cle);
        }

        [Test]
        public void EcranConflitR2_ResolveurNomFamille_UneCinquiemeValeurTombeDansTypeInconnu()
        {
            Assert.AreEqual("type inconnu", ConflitResolvers.NomFamille("BOGUS_5E_VALEUR"),
                "une 5ᵉ valeur fabriquée tombe dans le mot de la famille, comme partout");
            Assert.AreEqual("—", ConflitResolvers.NomFamille(""), "absente : « — »");
        }

        [Test]
        public void EcranConflitR2bis_SousTitreFamille_CouvreLesQuatreValeurs_EtUneCinquiemeTombeDansTypeInconnu()
        {
            Assert.AreEqual("les ferrailleurs de Spine", ConflitResolvers.SousTitreFamille("coil"));
            Assert.AreEqual("le port, et ce qui y entre", ConflitResolvers.SousTitreFamille("tarcum"));
            Assert.AreEqual("les docks du nord", ConflitResolvers.SousTitreFamille("iron_throat"));
            Assert.AreEqual("la ligne de sel, à l’est", ConflitResolvers.SousTitreFamille("saltline"));   // D10 : apostrophe typographique
            Assert.AreEqual("type inconnu", ConflitResolvers.SousTitreFamille("BOGUS_5E_VALEUR"));
        }

        [Test]
        public void EcranConflitR3_FoisChezEux_LeReplIcuSeFormate_EtLaValeurServieLEmporte()
        {
            Assert.AreEqual("1 fois", ConflitResolvers.FoisChezEux(1), "repli ICU `one` — sans catalogue");
            Assert.AreEqual("7 fois", ConflitResolvers.FoisChezEux(7), "repli ICU `other`, `#` remplacé");
            StringAssert.DoesNotContain("{", ConflitResolvers.FoisChezEux(2), "jamais d'accolade ICU à l'écran");

            MafiaCleanCity.I18n.I18nCatalog.ChargerPourTest("fr", new Dictionary<string, string>
            {
                { "conflit.bloc.fois_chez_eux", "{n, plural, =0 {jamais} one {une fois} other {# fois servies}}" },
            });
            Assert.AreEqual("une fois", ConflitResolvers.FoisChezEux(1), "servie : la valeur du catalogue l'emporte sur le repli");
            Assert.AreEqual("3 fois servies", ConflitResolvers.FoisChezEux(3));
        }

        [Test]
        public void EcranConflitR4_CompterRentres_NeCompteQueLesRentresDuDomaine()
        {
            Dictionary<string, int> c = ConflitScreenController.CompterRentres(new[]
            {
                Envoi("a", "saltline", "Saltline", "resolved", "retreat", "low", "medium"),
                Envoi("b", "saltline", "Saltline", "scheduled", "", "", "medium"),
                Envoi("c", "bogus", "unknown_bogus", "resolved", "hold", "low", "medium"),
                null,
            });
            Assert.AreEqual(1, c["saltline"]);
            Assert.IsFalse(c.ContainsKey("bogus"));
            Assert.AreEqual(0, ConflitScreenController.CompterRentres(null).Count);
        }

        /// <summary>Un envoi à 7 clés servies (forme `EngagementView`), pour les états pilotés par la donnée.</summary>
        private static EngagementDto Envoi(string id, string famille, string nom, string status,
                                           string issue, string cout, string chaleur) =>
            new EngagementDto
            {
                engagement_id = id, target_rival_key = famille,
                target_rival_name_i18n = new RivalNomI18nDto
                {
                    key = "game.fiction.rival.name", @params = new RivalNomParamsDto { nom = nom },
                },
                status = status, outcome_bucket = issue, friction_consumed_bucket = cout, heat_increment_bucket = chaleur,
            };

        // ═══ L1 — forme G et gardes de VALEUR (㉙, 23/09) ═══════════════════════════════════════
        //
        // Un envoi porte 7 clés servies (`EngagementView`, back `combat.service.ts:95-103`) et 2 annoncées pour après le gate
        // (`target_axis_i18n`, `lieutenant`, noms figés par l'orchestrateur). Aucun corps NON VIDE n'a été mesuré sur la pile :
        // les corps ci-dessous sont FABRIQUÉS à la forme du back, et désérialisés par le MÊME appel que `ConflitClient`
        // (JsonUtility sur l'enveloppe). Mots attendus : table 40 de l'atelier (997d6ab4), octet pour octet.

        private const string CorpsRentre =
            "{\"payload\":{\"data\":{\"engagements\":[{\"engagement_id\":\"7c1e0a52-0000-4000-8000-000000000001\"," +
            "\"target_rival_key\":\"iron_throat\"," +
            "\"target_rival_name_i18n\":{\"key\":\"game.fiction.rival.name\",\"params\":{\"nom\":\"Gorge-de-Fer\"}}," +
            "\"status\":\"resolved\",\"outcome_bucket\":\"breakthrough\",\"friction_consumed_bucket\":\"high\"," +
            "\"heat_increment_bucket\":\"medium\"," +
            "\"target_axis_i18n\":{\"key\":\"conflit.axe.finance\",\"params\":{}}," +
            "\"lieutenant\":{\"id\":\"9d2f0000-0000-4000-8000-000000000002\",\"name\":\"Lt. Voss\"}}]}}}";

        private const string CorpsParti =
            "{\"payload\":{\"data\":{\"engagements\":[{\"engagement_id\":\"7c1e0a52-0000-4000-8000-000000000003\"," +
            "\"target_rival_key\":\"saltline\"," +
            "\"target_rival_name_i18n\":{\"key\":\"game.fiction.rival.name\",\"params\":{\"nom\":\"Saltline\"}}," +
            "\"status\":\"scheduled\",\"outcome_bucket\":null,\"friction_consumed_bucket\":null," +
            "\"heat_increment_bucket\":null,\"target_axis_i18n\":null,\"lieutenant\":null}]}}}";

        private static EngagementDto Premier(string corps) =>
            JsonUtility.FromJson<GetEngagementsEnvelope>(corps).payload.data.engagements[0];

        [Test]
        public void EcranConflitL1_LesNeufClesArriventDansLeDto()
        {
            EngagementDto e = Premier(CorpsRentre);
            Assert.AreEqual("7c1e0a52-0000-4000-8000-000000000001", e.engagement_id);
            Assert.AreEqual("iron_throat", e.target_rival_key);
            Assert.AreEqual("game.fiction.rival.name", e.target_rival_name_i18n.key);
            Assert.AreEqual("Gorge-de-Fer", e.target_rival_name_i18n.@params.nom, "le paramètre `nom` du gabarit `{nom}`");
            Assert.AreEqual("resolved", e.status);
            Assert.AreEqual("breakthrough", e.outcome_bucket);
            Assert.AreEqual("high", e.friction_consumed_bucket);
            Assert.AreEqual("medium", e.heat_increment_bucket);
            Assert.AreEqual("conflit.axe.finance", e.target_axis_i18n.key);
            Assert.AreEqual("9d2f0000-0000-4000-8000-000000000002", e.lieutenant.id);
            Assert.AreEqual("Lt. Voss", e.lieutenant.name);

            // Contrôle positif : une clé MAL NOMMÉE n'arrive pas — l'égalité ci-dessus mesure bien la déclaration du champ.
            EngagementDto mal = Premier(CorpsRentre.Replace("\"outcome_bucket\"", "\"outcome\""));
            Assert.AreEqual("", mal.outcome_bucket ?? "", "une clé servie sous un autre nom doit rester vide dans le DTO");
        }

        [Test]
        public void EcranConflitL1_UnEnvoiParti_NullPartoutSaufLaFamille_AucunMotDevine()
        {
            EngagementDto e = Premier(CorpsParti);
            Assert.AreEqual("scheduled", e.status);
            Assert.IsNull(ConflitResolvers.Issue(e.outcome_bucket), "pas encore rentré : aucune issue, pas de ligne");
            Assert.IsNull(ConflitResolvers.Cout(e.friction_consumed_bucket), "coût null : pas de ligne « ça nous a coûté »");
            Assert.IsNull(ConflitResolvers.Chaleur(e.heat_increment_bucket), "chaleur null : pas de ligne « la ville a chauffé »");
            Assert.IsNull(ConflitResolvers.Axe(e.target_axis_i18n), "axe null (ou pas encore servi) : aucun axe deviné");
            Assert.IsNull(ConflitResolvers.NomDuLieutenant(e.lieutenant), "lieutenant null (disparu) : le nom s’omet, sans repli");
            Assert.AreEqual("Saltline", ConflitResolvers.NomServi(e.target_rival_name_i18n));

            // Un corps d'AVANT le lot back (les deux clés absentes) se lit comme null : même rendu.
            EngagementDto avant = Premier(CorpsParti.Replace(",\"target_axis_i18n\":null,\"lieutenant\":null", ""));
            Assert.IsNull(ConflitResolvers.Axe(avant.target_axis_i18n));
            Assert.IsNull(ConflitResolvers.NomDuLieutenant(avant.lieutenant));
        }

        [Test]
        public void EcranConflitL1_Issue_CouvreLeDomaineAvecLesMotsDeLaTable40()
        {
            Assert.AreEqual("On a reculé", ConflitResolvers.Issue("retreat"));
            Assert.AreEqual("Rien obtenu", ConflitResolvers.Issue("hold"));
            Assert.AreEqual("Disputé", ConflitResolvers.Issue("contested"));
            Assert.AreEqual("Terrain gagné", ConflitResolvers.Issue("advance"));
            Assert.AreEqual("Percée", ConflitResolvers.Issue("breakthrough"));
            Assert.AreEqual("Percée", ConflitResolvers.Issue(Premier(CorpsRentre).outcome_bucket), "la valeur d'un corps");
            Assert.AreEqual("état inconnu", ConflitResolvers.Issue("rout"), "hors domaine : le mot de la famille, jamais la valeur");
            Assert.IsNull(ConflitResolvers.Issue(""));
        }

        [Test]
        public void EcranConflitL1_CoutEtChaleur_CouvrentLeDomaineAvecLesMotsDeLaTable40()
        {
            Assert.AreEqual("un peu", ConflitResolvers.Cout("low"));
            Assert.AreEqual("pas mal", ConflitResolvers.Cout("medium"));
            Assert.AreEqual("beaucoup", ConflitResolvers.Cout("high"));
            Assert.AreEqual("un peu", ConflitResolvers.Chaleur("low"));
            Assert.AreEqual("pas mal", ConflitResolvers.Chaleur("medium"));
            Assert.AreEqual("beaucoup", ConflitResolvers.Chaleur("high"));
            EngagementDto e = Premier(CorpsRentre);
            Assert.AreEqual("beaucoup", ConflitResolvers.Cout(e.friction_consumed_bucket));
            Assert.AreEqual("pas mal", ConflitResolvers.Chaleur(e.heat_increment_bucket), "`medium` : la seule valeur produite");
            Assert.AreEqual("état inconnu", ConflitResolvers.Cout("extreme"));
            Assert.AreEqual("état inconnu", ConflitResolvers.Chaleur("extreme"));
            Assert.IsNull(ConflitResolvers.Cout(null));
            Assert.IsNull(ConflitResolvers.Chaleur(null));
        }

        [Test]
        public void EcranConflitL1_AxeEtNoms_MotsServisOuRienJamaisLaValeurMachine()
        {
            Assert.AreEqual("leurs gros bras", ConflitResolvers.Axe(new AxeI18nDto { key = "conflit.axe.muscle" }));
            Assert.AreEqual("leur argent", ConflitResolvers.Axe(Premier(CorpsRentre).target_axis_i18n));
            Assert.AreEqual("leurs informateurs", ConflitResolvers.Axe(new AxeI18nDto { key = "conflit.axe.intel" }));
            Assert.AreEqual("leurs installations", ConflitResolvers.Axe(new AxeI18nDto { key = "conflit.axe.infrastructure" }));
            Assert.AreEqual("leur tête", ConflitResolvers.Axe(new AxeI18nDto { key = "conflit.axe.leadership" }));
            Assert.AreEqual("type inconnu", ConflitResolvers.Axe(new AxeI18nDto { key = "conflit.axe.logistique" }));

            Assert.AreEqual("Gorge-de-Fer", ConflitResolvers.NomServi(Premier(CorpsRentre).target_rival_name_i18n));
            Assert.IsNull(ConflitResolvers.NomServi(new RivalNomI18nDto
            {
                key = "game.fiction.rival.name", @params = new RivalNomParamsDto { nom = "unknown_bogus" },
            }), "la sentinelle hors domaine du back ne s’affiche jamais");
            Assert.IsNull(ConflitResolvers.NomServi(new RivalNomI18nDto()), "référence absente ⇒ null");

            Assert.AreEqual("Lt. Voss", ConflitResolvers.NomDuLieutenant(Premier(CorpsRentre).lieutenant));
        }

        [Test]
        public void EcranConflitL1_CorpsEnvoye_OmetLAxeQuandAucunNEstChoisi()
        {
            var sansAxe = new PostEngagementsBody { lieutenant_id = "lt-1", target_rival_key = "coil", target_holding_id = "" };
            Assert.AreEqual("{\"lieutenant_id\":\"lt-1\",\"target_rival_key\":\"coil\"}", ConflitClient.CorpsEnvoye(sansAxe));
            // Contrôle positif : la sérialisation nue écrit bien la clé vide que le back refuse (422) — le cas que la garde attrape.
            StringAssert.Contains("\"target_holding_id\":\"\"", JsonUtility.ToJson(sansAxe));

            var nulAxe = new PostEngagementsBody { lieutenant_id = "lt-1", target_rival_key = "coil", target_holding_id = null };
            StringAssert.DoesNotContain("target_holding_id", ConflitClient.CorpsEnvoye(nulAxe));

            var avecAxe = new PostEngagementsBody { lieutenant_id = "lt-1", target_rival_key = "coil", target_holding_id = "finance" };
            Assert.AreEqual("{\"lieutenant_id\":\"lt-1\",\"target_rival_key\":\"coil\",\"target_holding_id\":\"finance\"}",
                ConflitClient.CorpsEnvoye(avecAxe));
            Assert.AreEqual("{}", ConflitClient.CorpsEnvoye(null));
        }

        [Test]
        public void EcranConflitL1_ReponseDuPost_PorteLIdentifiantDeLEnvoi()
        {
            PostEngagementsResponseDto r = JsonUtility.FromJson<PostEngagementsEnvelope>(
                "{\"payload\":{\"data\":{\"engagement_id\":\"7c1e0a52-0000-4000-8000-000000000004\"}}}").payload.data;
            Assert.AreEqual("7c1e0a52-0000-4000-8000-000000000004", r.engagement_id);
        }
    }
}
