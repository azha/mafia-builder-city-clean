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
    /// <summary>ecran_conflit « Le conflit » (㉙), v2 (cadres 59-64, tables 40 et addendum de l'atelier).
    ///
    /// COUVERT :
    ///  · le montage structurel (CanvasRenderer, MaskableGraphic) ;
    ///  · UN parcours réel (P1 — signup frais → `Charger()` : `engagements` vide, aucun gros bras) ;
    ///  · la forme G des DTO et les gardes de VALEUR (L1 : corps fabriqués à la forme du back, désérialisés comme le client) ;
    ///  · les états pilotés par la donnée (E, via `RendrePourTest`) : table des familles, en cours, rentré, panneau d'envoi,
    ///    choix par les vrais boutons, refus du POST, reprise réseau à clé constante ;
    ///  · les résolveurs et la couverture de leurs domaines (R).
    /// NON COUVERT : un envoi RÉUSSI de bout en bout — aucun compte sondé n'a de gros bras (P1).</summary>
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

        /// <summary>L6 — GARDE STRUCTURELLE DU DÉFILEMENT (l'historique grandit sans borne : le débordement est CERTAIN, pas
        /// à attendre d'une capture). Tout le contenu de ㉙ est sous le `content` d'un `ScrollRect` vertical dont la fenêtre
        /// (`viewport`) porte un `RectMask2D` ; tout `Graphic` sous la fenêtre est un `MaskableGraphic` MASQUABLE (sinon il
        /// dessinerait par-dessus le dock). Seul le fond de `ConflitRoot` est hors de la fenêtre.</summary>
        [UnityTest]
        public IEnumerator EcranConflitS2_LeContenuDefileSousUnMasque()
        {
            var ecran = MonterEcran();
            ecran.RendrePourTest(new GetLieutenantsResponseDto { lieutenants = new[] { Lieutenant("MUSCLE") } },
                new GetEngagementsResponseDto { engagements = new[] { Envoi("p1", "coil", "La Coil", "scheduled", "", "", "medium") } });
            yield return null;

            Transform racine = RacineEcran().transform;
            ScrollRect sr = racine.GetComponentInChildren<ScrollRect>(true);
            Assert.IsTrue(sr != null, "aucun ScrollRect sous ConflitRoot");
            Assert.IsTrue(sr.vertical && !sr.horizontal, "défilement vertical seulement");
            Assert.IsTrue(sr.viewport != null && sr.content != null, "fenêtre et contenu posés");
            Assert.IsTrue(sr.viewport.TryGetComponent<RectMask2D>(out _), "la fenêtre coupe ce qui dépasse (RectMask2D)");
            Assert.IsTrue(sr.content.IsChildOf(sr.viewport), "le contenu est DANS la fenêtre");

            foreach (string section in new[] { "Titre", "SousTitre", "Rentre", "EnCours", "Coup", "Table", "Pied", "Erreur" })
            {
                Transform t = sr.content.Find(section);
                Assert.IsTrue(t != null, $"la section {section} n'est pas sous le contenu qui défile");
            }

            var horsFenetre = new List<string>();
            var nonMasquables = new List<string>();
            foreach (Graphic g in racine.GetComponentsInChildren<Graphic>(true))
            {
                if (g.transform == racine) continue;   // le fond plein écran, seul hors de la fenêtre
                if (!g.transform.IsChildOf(sr.viewport)) horsFenetre.Add(g.name);
                else if (!(g is MaskableGraphic mg) || !mg.maskable) nonMasquables.Add(g.name);
            }
            Assert.IsEmpty(horsFenetre, "des Graphic hors de la fenêtre dessineraient par-dessus le chrome : " + string.Join(", ", horsFenetre));
            Assert.IsEmpty(nonMasquables, "des Graphic que le masque ne coupe pas : " + string.Join(", ", nonMasquables));
        }

        /// <summary>L6 — un historique LONG fabriqué (40 envois rentrés, 3 partis) : le contenu dépasse la fenêtre, et le
        /// défilement l'atteint (défilé jusqu'au bout, le bouton d'envoi est dans la fenêtre). Rien n'est coupé à la source :
        /// chaque rentré a sa ligne.</summary>
        [UnityTest]
        public IEnumerator EcranConflitE12_UnHistoriqueLong_DepasseLaFenetre_EtSeDefile()
        {
            var ecran = MonterEcran();
            var envois = new List<EngagementDto>();
            for (int i = 0; i < 3; i++) envois.Add(Envoi("p" + i, "tarcum", "Tarcum", "scheduled", "", "", "medium"));
            for (int i = 0; i < 40; i++) envois.Add(Envoi("r" + i, i % 2 == 0 ? "coil" : "saltline", i % 2 == 0 ? "La Coil" : "Saltline",
                "resolved", "hold", "low", "medium"));
            ecran.RendrePourTest(new GetLieutenantsResponseDto { lieutenants = new[] { Lieutenant("MUSCLE") } },
                new GetEngagementsResponseDto { engagements = envois.ToArray() });
            yield return null;
            yield return null;
            Canvas.ForceUpdateCanvases();

            ScrollRect sr = RacineEcran().GetComponentInChildren<ScrollRect>(true);
            float fenetre = sr.viewport.rect.height, contenu = sr.content.rect.height;
            Assert.Greater(fenetre, 0f, "fenêtre de hauteur nulle : la mesure ne vaudrait rien");
            Assert.Greater(contenu, fenetre * 1.5f, $"40 rentrés doivent dépasser la fenêtre (contenu {contenu}, fenêtre {fenetre})");
            Assert.AreEqual(40, CompterNoms(sr.content, "DejaRentre_"), "chaque rentré a sa ligne : rien n'est coupé à la source");

            sr.verticalNormalizedPosition = 0f;   // tout en bas
            Canvas.ForceUpdateCanvases();
            yield return null;
            Transform bouton = sr.content.Find("Pied/LEnvoyerCeSoir");
            Assert.IsTrue(bouton != null, "le bouton d'envoi existe");
            Vector3[] coins = new Vector3[4], fen = new Vector3[4];
            ((RectTransform)bouton).GetWorldCorners(coins);
            sr.viewport.GetWorldCorners(fen);
            Assert.GreaterOrEqual(coins[0].y, fen[0].y - 1f, "défilé jusqu'au bout, le bouton d'envoi est DANS la fenêtre (joignable)");
        }

        private static int CompterNoms(Transform racine, string prefixe)
        {
            int n = 0;
            foreach (Transform t in racine.GetComponentsInChildren<Transform>(true)) if (t.name.StartsWith(prefixe)) n++;
            return n;
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
            // Bundle RÉEL : la valeur SERVIE de la clé l'emporte sur le repli (v3 de la table 40, df041316, tant que le back sert la v2).
            // On vérifie que l'écran rend la ligne DE LA CLÉ, quelle que soit la version servie.
            string attendu = MafiaCleanCity.I18n.Libelle.Gabarit("conflit.bloc.on_ne_les_a_pas_croises", "on n’a jamais croisé leur route");
            CollectionAssert.Contains(ecran.RenderedTexts, attendu,
                "aucun envoi rentré : la ligne de conflit.bloc.on_ne_les_a_pas_croises doit être rendue");
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
        public IEnumerator EcranConflitE1_AucunGrosBras_LesPhrasesServies_RienAChoisir()
        {
            var ecran = MonterEcran();
            ecran.RendrePourTest(
                new GetLieutenantsResponseDto { lieutenants = new[] { Lieutenant("COOK"), Lieutenant("LOGISTICS") } },
                new GetEngagementsResponseDto { engagements = new EngagementDto[0] });
            yield return null;

            Assert.AreEqual(0, ecran.MuscleLieutenants.Count);
            CollectionAssert.Contains(ecran.RenderedTexts, "Le coup de ce soir");
            CollectionAssert.Contains(ecran.RenderedTexts, "Aucun de vos lieutenants n'est du genre Gros bras.");
            Assert.IsNull(GameObject.Find("LEnvoyerCeSoir"), "sans gros bras, aucun bouton d'envoi");
            // `TryGetComponent`, pas `GetComponent == null` sous NUnit : dans l'éditeur, un composant absent rend un « faux null ».
            Assert.IsFalse(RacineEcran().transform.Find("Corps/Contenu/Table/Famille_coil").TryGetComponent<Button>(out _),
                "sans gros bras, la famille ne se choisit pas");
            CollectionAssert.DoesNotContain(ecran.RenderedTexts,
                "« Dites-moi seulement chez qui. Je pars ce soir, on saura demain. »",
                "la réplique n'apparaît QUE s'il y a un gros bras");
        }

        [UnityTest]
        public IEnumerator EcranConflitE2_GrosBras_LePanneauDEnvoi_RienDePreselectionne_BoutonInactif()
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
            CollectionAssert.Contains(ecran.RenderedTexts, "Lt. Vasca");
            // Résolveur PARTAGÉ `FamilleLabels` : MUSCLE → « Gros bras », SEASONED → « Du métier » (atelier 28).
            CollectionAssert.Contains(ecran.RenderedTexts, "Gros bras · Du métier");
            CollectionAssert.Contains(ecran.RenderedTexts,
                "On choisit une famille, on choisit qui y envoyer. On saura demain.");
            foreach (string mot in new[] { "leurs gros bras", "leur argent", "leurs informateurs", "leurs installations", "leur tête" })
                CollectionAssert.Contains(ecran.RenderedTexts, mot, "les 5 axes, mots de la table 40");
            CollectionAssert.Contains(ecran.RenderedTexts,
                "« Dites-moi seulement chez qui. Je pars ce soir, on saura demain. »", "la réplique v2 (D14), sans orateur");
            CollectionAssert.Contains(ecran.RenderedTexts, "L’envoyer ce soir");
            CollectionAssert.Contains(ecran.RenderedTexts, "pas de rappel possible");
            CollectionAssert.DoesNotContain(ecran.RenderedTexts,
                "Vous avez l'homme. Personne pour lui dire où frapper — on ne sait pas encore où ils sont.",
                "phrase devenue FAUSSE (les axes existent) : retirée");

            Assert.IsNull(ecran.ChoixFamille, "aucune famille présélectionnée");
            Assert.IsNull(ecran.ChoixLieutenant, "aucun homme présélectionné, même s'il est seul");
            Assert.IsNull(ecran.ChoixAxe, "aucun axe présélectionné");
            Assert.IsFalse(ecran.EnvoiPossible);
            Assert.IsFalse(GameObject.Find("LEnvoyerCeSoir").GetComponent<Button>().interactable, "inactif tant que rien n'est choisi");
            CollectionAssert.DoesNotContain(ecran.RenderedTexts, "Ce soir", "aucune famille marquée");
        }

        [UnityTest]
        public IEnumerator EcranConflitE9_LesTroisChoix_LaPhraseDEnvoi_EtLeBoutonActif()
        {
            var ecran = MonterEcran();
            ecran.RendrePourTest(
                new GetLieutenantsResponseDto { lieutenants = new[] { Lieutenant("MUSCLE", "FRESH", "Lt. Kest"), Lieutenant("COOK") } },
                new GetEngagementsResponseDto
                {
                    engagements = new[] { Envoi("r1", "tarcum", "Tarcum", "resolved", "breakthrough", "high", "medium") },
                });
            yield return null;

            // Par les VRAIS boutons (le geste du joueur), pas seulement les crochets.
            RacineEcran().transform.Find("Corps/Contenu/Table/Famille_tarcum").GetComponent<Button>().onClick.Invoke();
            yield return null;
            Assert.AreEqual("tarcum", ecran.ChoixFamille);
            Assert.AreEqual("Ce soir", TexteSous("Famille_tarcum", "CeSoir"), "la famille choisie porte « Ce soir »");
            Assert.AreEqual(4, CompterNoms(RacineEcran().transform, "Ecu"), "un écusson par famille, jamais un cinquième");
            Assert.IsNotNull(RacineEcran().transform.Find("Corps/Contenu/Table/Famille_tarcum/BordChoisi"),
                "la ligne visée porte le filet chaud de la maquette");
            Assert.AreEqual("T", TexteSous("Famille_tarcum", "Initiale"));
            Assert.IsFalse(ecran.EnvoiPossible, "famille seule : pas encore");

            GameObject.Find("Homme_00000000-0000-4000-8000-000000000000").GetComponent<Button>().onClick.Invoke();
            yield return null;
            Assert.AreEqual("00000000-0000-4000-8000-000000000000", ecran.ChoixLieutenant);
            Assert.IsFalse(ecran.EnvoiPossible, "famille et homme : pas encore — l'axe est OBLIGATOIRE");

            GameObject.Find("Axe_finance").GetComponent<Button>().onClick.Invoke();
            yield return null;
            Assert.AreEqual("finance", ecran.ChoixAxe);
            Assert.IsTrue(ecran.EnvoiPossible);
            Assert.IsTrue(GameObject.Find("LEnvoyerCeSoir").GetComponent<Button>().interactable);
            CollectionAssert.Contains(ecran.RenderedTexts, "On envoie Lt. Kest chez Tarcum, sur leur argent.");
            CollectionAssert.Contains(ecran.RenderedTexts, "La dernière fois là-bas\u00A0: une percée, et la ville a chauffé pas mal.",
                "la phrase de l'atelier (addendum à la 40, 24897b48), l'issue en forme de milieu de phrase");

            // Un non-gros-bras n'est pas choisissable, même par le crochet.
            ecran.ChoisirLieutenant("id-inconnu");
            Assert.AreEqual("00000000-0000-4000-8000-000000000000", ecran.ChoixLieutenant);
            ecran.ChoisirAxe("logistique");
            Assert.AreEqual("finance", ecran.ChoixAxe, "un axe hors des 5 est ignoré");
        }

        [UnityTest]
        public IEnumerator EcranConflitE10_EnEnvoyerUnAutre_EtYRetourner_RemettentLesChoixAZero()
        {
            var ecran = MonterEcran();
            ecran.RendrePourTest(
                new GetLieutenantsResponseDto { lieutenants = new[] { Lieutenant("MUSCLE", "FRESH", "Lt. Kest") } },
                new GetEngagementsResponseDto
                {
                    engagements = new[]
                    {
                        Envoi("p1", "coil", "La Coil", "scheduled", "", "", "medium"),
                        Envoi("r1", "tarcum", "Tarcum", "resolved", "contested", "low", "medium"),
                    },
                });
            yield return null;
            ecran.ChoisirFamille("saltline"); ecran.ChoisirAxe("intel");
            ecran.ChoisirLieutenant("00000000-0000-4000-8000-000000000000");
            yield return null;

            Assert.AreEqual("autre famille, autre cible", TexteSous("EnEnvoyerUnAutre", "Precision"));
            Assert.AreEqual("Envoyer quelqu’un d’autre", TexteSous("EnEnvoyerUnAutre", "Libelle"));
            GameObject.Find("EnEnvoyerUnAutre").GetComponent<Button>().onClick.Invoke();
            yield return null;
            Assert.IsNull(ecran.ChoixFamille); Assert.IsNull(ecran.ChoixAxe); Assert.IsNull(ecran.ChoixLieutenant);

            CollectionAssert.Contains(ecran.RenderedTexts, "« Voilà ce que ça a donné. À vous de dire si on y retourne. »");
            Assert.AreEqual("même famille, autre cible", TexteSous("YRetourner", "Precision"));
            ecran.ChoisirAxe("muscle");
            GameObject.Find("YRetourner").GetComponent<Button>().onClick.Invoke();
            yield return null;
            Assert.AreEqual("tarcum", ecran.ChoixFamille, "« même famille » : celle du dernier rentré");
            Assert.IsNull(ecran.ChoixAxe, "« autre cible » : l'axe repart de zéro");
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
            Assert.AreEqual("on leur a rendu visite", TexteDe(ecran, "Famille_tarcum", "Visites"));
            Assert.AreEqual("1 fois", TexteDe(ecran, "Famille_coil", "Fois"), "`one {# fois}` de l'ICU");
            Assert.IsNull(TexteDe(ecran, "Famille_iron_throat", "Fois"),
                "iron_throat : un seul envoi, PARTI ⇒ 0 rentré ⇒ pas de compte (l'ICU ne sert qu'à partir de 1)");
            Assert.AreEqual("on n’a jamais croisé leur route", TexteDe(ecran, "Famille_iron_throat", "Visites"));
            Assert.AreEqual("on n’a jamais croisé leur route", TexteDe(ecran, "Famille_saltline", "Visites"));
            CollectionAssert.DoesNotContain(ecran.RenderedTexts, "jamais", "à 0, pas de doublon « jamais » + « on ne les a pas croisés »");
            foreach (string t in ecran.RenderedTexts)
                StringAssert.DoesNotContain("une_5e_famille", t, "une famille hors domaine ne s'affiche nulle part, ni sa sentinelle");
            Assert.AreEqual("la ferraille, à Spine", TexteDe(ecran, "Famille_coil", "SousTitre"),
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

        // ═══ L3 — cadres 62 (en cours) et 63 (rentré) ══════════════════════════════════════════

        private static EngagementDto AvecLieutenant(EngagementDto e, string nom)
        {
            e.lieutenant = nom == null ? null : new EngagementLieutenantDto { id = "lt-" + e.engagement_id, name = nom };
            return e;
        }

        [UnityTest]
        public IEnumerator EcranConflitE5_EnCoursEtRentre_LesMotsDeLaTable40_SansNomQuandLeLieutenantManque()
        {
            var ecran = MonterEcran();
            ecran.RendrePourTest(
                new GetLieutenantsResponseDto { lieutenants = new LieutenantRowDto[0] },
                new GetEngagementsResponseDto
                {
                    engagements = new[]   // servie du plus récent au plus ancien
                    {
                        AvecLieutenant(Envoi("p1", "tarcum", "Tarcum", "scheduled", "", "", "medium"), "Lt. Voss"),
                        AvecLieutenant(Envoi("p2", "iron_throat", "Gorge-de-Fer", "scheduled", "", "", "medium"), null),
                        AvecLieutenant(Envoi("r1", "coil", "La Coil", "resolved", "hold", "high", "medium"), null),
                        AvecLieutenant(Envoi("r0", "coil", "La Coil", "resolved", "breakthrough", "low", "medium"), "Lt. Dorne"),
                    },
                });
            yield return null;

            // Cadre 62
            CollectionAssert.Contains(ecran.RenderedTexts, "Ce qui est en cours");
            CollectionAssert.Contains(ecran.RenderedTexts, "Ce qu’on a envoyé et qui n’est pas encore rentré.");
            CollectionAssert.Contains(ecran.RenderedTexts, "En route, pas encore de retour");
            Assert.AreEqual("Lt. Voss", TexteSous("Parti_p1", "Lieutenant"));
            Assert.AreEqual("en route vers Tarcum", TexteSous("Parti_p1", "Lieu"), "le nom SERVI de la famille, dans le gabarit");
            Assert.IsNotNull(GameObject.Find("Parti_p1").transform.Find("Avatar/Buste"),
                "un lieutenant servi porte le petit portrait de la maquette");
            Assert.AreEqual(TMPro.FontStyles.Normal, TexteComposantSous("Parti_p1", "Lieu").fontStyle,
                "le lieu est droit dans `.env .q i` malgré le nom historique de la balise CSS");
            Assert.AreEqual("plus de rappel possible", TexteSous("Parti_p1", "Droite"));
            Assert.IsNull(TexteSous("Parti_p2", "Lieutenant"), "lieutenant null (disparu) : la ligne s'affiche SANS nom, sans repli");
            Assert.IsNull(GameObject.Find("Parti_p2").transform.Find("Avatar"),
                "lieutenant absent : aucun portrait inventé");
            Assert.AreEqual("en route vers Gorge-de-Fer", TexteSous("Parti_p2", "Lieu"));
            CollectionAssert.Contains(ecran.RenderedTexts, "Déjà de retour");
            Assert.AreEqual("était chez La Coil", TexteSous("DejaRentre_r1", "Lieu"));
            Assert.AreEqual("Rien obtenu", TexteSous("DejaRentre_r1", "Droite"));
            Assert.AreEqual("Percée", TexteSous("DejaRentre_r0", "Droite"));
            CollectionAssert.Contains(ecran.RenderedTexts, "2 personnes dehors. On ne les rappelle pas — on saura demain matin.",
                "D15 : le nombre vient de la liste (2 partis)");

            // Cadre 63 : le DERNIER rentré (r1, premier `resolved` de la liste)
            CollectionAssert.Contains(ecran.RenderedTexts, "Ce qui est rentré");
            CollectionAssert.Contains(ecran.RenderedTexts, "Ce que chaque envoi a rapporté, et ce que ça nous a coûté.");
            CollectionAssert.Contains(ecran.RenderedTexts, "De retour");
            Assert.AreEqual("était chez La Coil", TexteSous("Rentre_r1", "Lieu"));
            Assert.AreEqual("Rien obtenu", TexteSous("Rentre_r1", "Droite"));
            Assert.IsNull(TexteSous("Rentre_r0", "Lieu"), "un seul envoi dans « Il est rentré » : le dernier");
            Assert.AreEqual("ça nous a coûté", TexteSous("Cout", "Libelle"));
            Assert.AreEqual("beaucoup", TexteSous("Cout", "Mot"));
            Assert.AreEqual("la ville a chauffé", TexteSous("Chaleur", "Libelle"));
            Assert.AreEqual("pas mal", TexteSous("Chaleur", "Mot"));
            CollectionAssert.Contains(ecran.RenderedTexts, "Depuis le début, chez La Coil");
            Assert.AreEqual("un envoi", TexteSous("Historique_r1", "Libelle"));
            Assert.AreEqual("Rien obtenu", TexteSous("Historique_r1", "Issue"));
            Assert.IsNotNull(GameObject.Find("Historique_r1").transform.Find("IssueCadre"),
                "l'issue est le badge bordé de la maquette, pas une colonne de texte nue");
            Assert.AreEqual("un envoi", TexteSous("Historique_r0", "Libelle"));
            Assert.AreEqual("Percée", TexteSous("Historique_r0", "Issue"));
            Assert.AreEqual(new Color32(0x98, 0x79, 0x79, 0xff), CouleurSous("Historique_r1", "Issue"),
                "Rien obtenu garde l'encre sourde exacte de la maquette");
            Assert.AreEqual(new Color32(0xe0, 0x66, 0x4a, 0xff), CouleurSous("Historique_r0", "Issue"),
                "Percée garde la braise exacte de la maquette");
            Assert.IsNull(TexteSous("Historique_p1", "Libelle"), "un envoi encore parti n'entre pas dans l'historique");
            foreach (string t in ecran.RenderedTexts)
                StringAssert.DoesNotContain("Coup n°", t, "aucun rang tant que `strike_index` n'est pas servi");
        }

        [UnityTest]
        public IEnumerator EcranConflitE6_RentreSansCoutNiChaleur_LesLignesSOmettent_EtRienEnCoursSansParti()
        {
            var ecran = MonterEcran();
            ecran.RendrePourTest(
                new GetLieutenantsResponseDto { lieutenants = new LieutenantRowDto[0] },
                new GetEngagementsResponseDto
                {
                    engagements = new[] { Envoi("r1", "saltline", "Saltline", "resolved", "retreat", "", "") },
                });
            yield return null;

            Assert.AreEqual("On a reculé", TexteSous("Rentre_r1", "Droite"));
            Assert.AreEqual("un envoi", TexteSous("Historique_r1", "Libelle"));
            Assert.AreEqual("On a reculé", TexteSous("Historique_r1", "Issue"));
            Assert.IsNull(TexteSous("Cout", "Mot"), "coût null : pas de ligne « ça nous a coûté »");
            Assert.IsNull(TexteSous("Chaleur", "Mot"), "chaleur null : pas de ligne « la ville a chauffé »");
            CollectionAssert.DoesNotContain(ecran.RenderedTexts, "Ce qui est en cours", "aucun envoi parti : pas de section");
        }

        [UnityTest]
        public IEnumerator EcranConflitE7_AucunEnvoi_NiEnCoursNiRentre()
        {
            var ecran = MonterEcran();
            ecran.RendrePourTest(new GetLieutenantsResponseDto { lieutenants = new LieutenantRowDto[0] },
                new GetEngagementsResponseDto { engagements = new EngagementDto[0] });
            yield return null;

            CollectionAssert.DoesNotContain(ecran.RenderedTexts, "Ce qui est en cours");
            CollectionAssert.DoesNotContain(ecran.RenderedTexts, "Ce qui est rentré");
        }

        [Test]
        public void EcranConflitR5_CoupN_HommesDehors_FamilleDe()
        {
            Assert.IsNull(ConflitResolvers.CoupN(0), "`strike_index` absent (0) : aucun « Coup n° »");
            Assert.AreEqual("Coup n°4", ConflitResolvers.CoupN(4));
            Assert.AreEqual(0, Premier(CorpsRentre).strike_index, "pas encore servi ⇒ 0");
            Assert.AreEqual(7, Premier(CorpsRentre.Replace("\"status\"", "\"strike_index\":7,\"status\"")).strike_index,
                "servi ⇒ la valeur arrive dans le DTO (forme G)");

            Assert.AreEqual("Une personne dehors.", ConflitResolvers.HommesDehors(1));
            Assert.AreEqual("2 personnes dehors.", ConflitResolvers.HommesDehors(2));

            Assert.AreEqual("Gorge-de-Fer", ConflitResolvers.FamilleDe(Premier(CorpsRentre)), "le nom servi");
            Assert.AreEqual("La Coil", ConflitResolvers.FamilleDe(new EngagementDto { target_rival_key = "coil" }),
                "nom servi absent : le nom du domaine");
            Assert.AreEqual("type inconnu", ConflitResolvers.FamilleDe(Envoi("x", "bogus", "unknown_bogus", "resolved", "hold", "", "")),
                "sentinelle du back hors domaine : jamais affichée");
        }

        // ═══ L5a — aucun texte technique à l'écran ═══════════════════════════════════════════════

        /// <summary>Un POST refusé (sans jeton : 401 ; pile absente : erreur réseau) remplit le crochet de test, et rien de
        /// technique n'arrive à l'écran. Aucune écriture possible : sans jeton, le back refuse avant tout.</summary>
        [UnityTest]
        public IEnumerator EcranConflitE8_UnRefusDuPost_NAfficheAucunTexteTechnique()
        {
            var ecran = MonterEcran();
            ecran.RendrePourTest(new GetLieutenantsResponseDto { lieutenants = new LieutenantRowDto[0] },
                new GetEngagementsResponseDto { engagements = new EngagementDto[0] });
            yield return null;

            yield return ecran.EnvoyerCeSoirEtRecharger("00000000-0000-4000-8000-000000000000", "coil", "");

            Assert.IsFalse(ecran.DernierEnvoiOk);
            Assert.IsNotNull(ecran.DerniereErreur, "contrôle positif : le refus a bien eu lieu, et le crochet le porte");
            foreach (TMPro.TextMeshProUGUI t in RacineEcran().GetComponentsInChildren<TMPro.TextMeshProUGUI>(true))
            {
                StringAssert.DoesNotContain("/v1/", t.text, "une route à l'écran : " + t.name);
                StringAssert.DoesNotContain("a échoué", t.text, "un message technique à l'écran : " + t.name);
                Assert.AreNotEqual(ecran.DerniereErreur, t.text, "le message technique à l'écran : " + t.name);
            }
        }

        // ═══ L4b — les refus du POST, et la reprise qui ne part pas deux fois ════════════════════════

        /// <summary>Pile injoignable (port 9, refusé aussitôt) : le refus est « réseau », son MOT s'affiche sous le bouton, et
        /// l'essai suivant du MÊME envoi réémet la MÊME Idempotency-Key — le back rejoue alors au lieu de réexécuter
        /// (`idempotency.interceptor.ts`, R-ID-4), ce qui rend vraie « il ne partira pas deux fois ». Un envoi DIFFÉRENT
        /// (autre axe) part avec une clé neuve. Aucune écriture : rien n'atteint le back.</summary>
        [UnityTest]
        public IEnumerator EcranConflitE11_Reseau_LeMotSAffiche_EtLaRepriseReemetLaMemeCle()
        {
            var ecran = MonterEcran();
            ecran.BaseUrl = "http://127.0.0.1:9";
            ecran.RendrePourTest(
                new GetLieutenantsResponseDto { lieutenants = new[] { Lieutenant("MUSCLE", "FRESH", "Lt. Kest") } },
                new GetEngagementsResponseDto { engagements = new EngagementDto[0] });
            yield return null;
            ecran.ChoisirFamille("coil");
            ecran.ChoisirLieutenant("00000000-0000-4000-8000-000000000000");
            ecran.ChoisirAxe("finance");
            yield return null;

            yield return ecran.EnvoyerCeSoirEtRecharger(ecran.ChoixLieutenant, ecran.ChoixFamille, ecran.ChoixAxe);
            yield return null;
            Assert.AreEqual("reseau", ecran.DerniereClasseDeRefus, "http 0 : on ne sait pas si l'ordre est parti");
            string cle1 = ecran.DerniereCleDIdempotence;
            Assert.IsTrue(System.Guid.TryParse(cle1, out _), "une clé UUID (l'intercepteur refuse toute autre forme)");
            Assert.AreEqual("La ligne a coupé : on ne sait pas si l’ordre est parti. Réessayez, il ne partira pas deux fois.",
                TexteSous("Pied", "Refus"));
            Assert.AreEqual("finance", ecran.ChoixAxe, "un refus garde les choix");

            yield return ecran.EnvoyerCeSoirEtRecharger(ecran.ChoixLieutenant, ecran.ChoixFamille, ecran.ChoixAxe);
            Assert.AreEqual(cle1, ecran.DerniereCleDIdempotence, "la reprise du MÊME envoi réémet la MÊME clé");

            ecran.ChoisirAxe("intel");
            Assert.IsNull(ecran.DerniereClasseDeRefus, "un nouveau choix efface le refus");
            yield return ecran.EnvoyerCeSoirEtRecharger(ecran.ChoixLieutenant, ecran.ChoixFamille, ecran.ChoixAxe);
            Assert.AreNotEqual(cle1, ecran.DerniereCleDIdempotence, "un envoi DIFFÉRENT (autre axe) : clé neuve (contrôle négatif)");
        }

        [Test]
        public void EcranConflitR6_LesRefusDuPost_ClassesEtMots()
        {
            Assert.AreEqual("reseau", ConflitResolvers.ClasserRefusDEnvoi(0, null));
            Assert.AreEqual("reseau", ConflitResolvers.ClasserRefusDEnvoi(409, "IDEMPOTENCY_REQUEST_IN_FLIGHT"),
                "le même envoi encore en vol : on ne sait pas s'il est parti, la clé se garde");
            Assert.AreEqual("muscle", ConflitResolvers.ClasserRefusDEnvoi(409, "MUSCLE_LIEUTENANT_REQUIRED"));
            Assert.AreEqual("autre", ConflitResolvers.ClasserRefusDEnvoi(409, "IDEMPOTENCY_KEY_CONFLICT"), "un 409 n'est pas forcément « gros bras »");
            Assert.AreEqual("introuvable", ConflitResolvers.ClasserRefusDEnvoi(404, "RESOURCE_NOT_FOUND"));
            Assert.AreEqual("mal_forme", ConflitResolvers.ClasserRefusDEnvoi(422, "VALIDATION_FAILED"));
            Assert.AreEqual("autre", ConflitResolvers.ClasserRefusDEnvoi(401, "UNAUTHENTICATED"));
            Assert.AreEqual("autre", ConflitResolvers.ClasserRefusDEnvoi(500, null));

            Assert.AreEqual("Seul un lieutenant du genre Gros bras peut partir sur ce coup. Envoyez-en un, ou recrutez-en un.",
                ConflitResolvers.MotDuRefusDEnvoi("muscle"));
            Assert.AreEqual("Ce coup ne tient plus. Reprenez depuis la liste.", ConflitResolvers.MotDuRefusDEnvoi("introuvable"));
            Assert.AreEqual("L’ordre n’est pas parti : il était mal formé. Réessayez.", ConflitResolvers.MotDuRefusDEnvoi("mal_forme"));
            Assert.IsNull(ConflitResolvers.MotDuRefusDEnvoi("autre"), "aucun mot écrit pour « autre » : rien à l'écran");
            Assert.IsNull(ConflitResolvers.MotDuRefusDEnvoi(null));

            Assert.AreEqual("MUSCLE_LIEUTENANT_REQUIRED", ConflitClient.CodeApi(
                "{\"payload\":{\"error\":{\"code\":\"MUSCLE_LIEUTENANT_REQUIRED\",\"http_status\":409,\"message\":\"x\"}}}"));
            Assert.IsNull(ConflitClient.CodeApi(""));
            Assert.IsNull(ConflitClient.CodeApi("<html>502</html>"), "un corps qui n'est pas du JSON : null, jamais une exception");
        }

        [Test]
        public void EcranConflitR7_LaDerniereFoisChezEux_LaPhraseDeLAtelier_OuRien()
        {
            Assert.AreEqual("une percée", ConflitResolvers.IssueEnPhrase("breakthrough"));
            Assert.AreEqual("du terrain gagné", ConflitResolvers.IssueEnPhrase("advance"));
            Assert.AreEqual("rien obtenu", ConflitResolvers.IssueEnPhrase("hold"));
            Assert.AreEqual("ça s’est disputé", ConflitResolvers.IssueEnPhrase("contested"));
            Assert.AreEqual("on a reculé", ConflitResolvers.IssueEnPhrase("retreat"));
            Assert.AreEqual("état inconnu", ConflitResolvers.IssueEnPhrase("rout"));
            Assert.IsNull(ConflitResolvers.IssueEnPhrase(""));

            Assert.AreEqual("La dernière fois là-bas : ça s’est disputé, et la ville a chauffé beaucoup.",
                ConflitResolvers.LaDerniereFoisChezEux(Envoi("r", "coil", "La Coil", "resolved", "contested", "low", "high")));
            Assert.IsNull(ConflitResolvers.LaDerniereFoisChezEux(Envoi("p", "coil", "La Coil", "scheduled", "", "", "medium")),
                "issue nulle (pas encore rentré) : pas de phrase");
            Assert.IsNull(ConflitResolvers.LaDerniereFoisChezEux(Envoi("r", "coil", "La Coil", "resolved", "hold", "low", "")),
                "chaleur nulle : la phrase l'exige, aucun mot deviné");
            Assert.IsNull(ConflitResolvers.LaDerniereFoisChezEux(null));
        }

        // ═══ L7 — sans gros bras, le chemin du recrutement ═════════════════════════════════════════

        /// <summary>Un navigateur de shell FACTICE : il monte le locataire demandé sous lui et le garde, sans shell réel.</summary>
        private class FauxNavigateur : MonoBehaviour, MafiaCleanCity.Shell.IShellNavigator
        {
            public MonoBehaviour Monte;
            public T MonterLocataireEnSurimpression<T>() where T : MonoBehaviour, MafiaCleanCity.Shell.IShellTenant
            {
                var hote = new GameObject("Hote_" + typeof(T).Name, typeof(RectTransform));
                hote.transform.SetParent(transform, false);
                T t = hote.AddComponent<T>();
                t.SetMountParent(transform);
                Monte = t;
                return t;
            }
        }

        /// <summary>Sans gros bras, « Recruter un nouveau lieutenant » (clé SERVIE `famille.ecran.recruter_un_nouveau_lieutenant`)
        /// ouvre la Famille EN SURIMPRESSION par le navigateur du shell, panneau de recrutement déplié. Contrôle négatif : sans
        /// navigateur, rien n'est monté (et le geste le dit dans le journal). L'écran monté est détruit dans la MÊME frame,
        /// avant son `Start()` : aucun appel réseau.</summary>
        [UnityTest]
        public IEnumerator EcranConflitE13_AucunGrosBras_RecruterOuvreLaFamille_PanneauDeRecrutementDeplie()
        {
            var ecran = MonterEcran();
            ecran.RendrePourTest(new GetLieutenantsResponseDto { lieutenants = new[] { Lieutenant("COOK") } },
                new GetEngagementsResponseDto { engagements = new EngagementDto[0] });
            yield return null;

            Assert.AreEqual("Recruter un nouveau lieutenant", TexteSous("Recruter", "Libelle"));
            Button recruter = GameObject.Find("Recruter").GetComponent<Button>();
            Assert.IsTrue(recruter.interactable);

            // Contrôle négatif : aucun navigateur ⇒ rien n'est monté.
            LogAssert.Expect(LogType.Warning, "[㉙] recrutement : aucun navigateur de shell — rien n'est ouvert");
            recruter.onClick.Invoke();
            Assert.IsTrue(ecran.DernierRecrutementOuvert == null);

            var navGo = new GameObject("FauxNavigateur", typeof(RectTransform));
            try
            {
                var nav = navGo.AddComponent<FauxNavigateur>();
                recruter.onClick.Invoke();
                Assert.IsTrue(ecran.DernierRecrutementOuvert != null, "la Famille est montée par le navigateur");
                Assert.AreSame(nav.Monte, ecran.DernierRecrutementOuvert, "montée PAR le navigateur du shell, pas en autonome");
                Assert.IsTrue(ecran.DernierRecrutementOuvert.RecrutementDeplie, "le panneau de recrutement est déplié");
            }
            finally { Object.DestroyImmediate(navGo); }
        }

        /// <summary>Le texte du nœud `enfant` sous le nœud `ligne` (à n'importe quelle profondeur sous `ConflitRoot`), ou null.</summary>
        private string TexteSous(string ligne, string enfant)
        {
            foreach (Transform tr in RacineEcran().GetComponentsInChildren<Transform>(true))
            {
                if (tr.name != ligne) continue;
                foreach (TMPro.TextMeshProUGUI t in tr.GetComponentsInChildren<TMPro.TextMeshProUGUI>(true))
                    if (t.name == enfant) return t.text;
            }
            return null;
        }

        private TMPro.TextMeshProUGUI TexteComposantSous(string ligne, string enfant)
        {
            foreach (Transform tr in RacineEcran().GetComponentsInChildren<Transform>(true))
            {
                if (tr.name != ligne) continue;
                foreach (TMPro.TextMeshProUGUI t in tr.GetComponentsInChildren<TMPro.TextMeshProUGUI>(true))
                    if (t.name == enfant) return t;
            }
            Assert.Fail($"texte {enfant} introuvable sous {ligne}");
            return null;
        }

        private Color32 CouleurSous(string ligne, string enfant)
        {
            foreach (Transform tr in RacineEcran().GetComponentsInChildren<Transform>(true))
            {
                if (tr.name != ligne) continue;
                foreach (TMPro.TextMeshProUGUI t in tr.GetComponentsInChildren<TMPro.TextMeshProUGUI>(true))
                    if (t.name == enfant) return t.color;
            }
            Assert.Fail($"texte {enfant} introuvable sous {ligne}");
            return default;
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
            Assert.AreEqual("la ferraille, à Spine", ConflitResolvers.SousTitreFamille("coil"));
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
    /// <summary>㉙ DE BOUT EN BOUT sur la pile (L8, 23/09) — catégorie À PART (`ConflitReel`, pas un préfixe d'`EcranConflit` :
    /// le filtre d'Unity prend par préfixe), pour le lancer seul. Un compte NEUF (jamais un compte gelé) :
    /// signup → session/open (l'octroi d'accueil sème les 4 familles) → GET /v1/me/buildings → recrutement d'un gros bras
    /// (AVANT tout autre geste structurel : il consomme la décision structurelle de la session) → l'écran charge, on choisit
    /// famille, homme et axe, « L’envoyer ce soir » part → « parti chez La Coil ». Puis la PROMESSE de la phrase réseau :
    /// le MÊME corps réémis avec la MÊME Idempotency-Key rend le MÊME engagement, et la liste en compte UN. Contrôle
    /// négatif : une clé NEUVE crée bien un second envoi (le compte sait voir une différence).</summary>
    [Category("ConflitReel")]
    public class ConflitReelPlayModeTests
    {
        private const string BaseUrl = "http://localhost";
        private static int callsignSeq;
        private string token;
        private GameObject hostGo;

        /// <summary>La session du compte neuf se ferme TOUJOURS, même sur un rouge (patron `OuvrirJoueurFrais`).</summary>
        [UnityTearDown]
        public IEnumerator FermerLaSession()
        {
            if (!string.IsNullOrEmpty(token)) yield return FermerSession();
            token = null;
        }

        [TearDown]
        public void Fermer()
        {
            if (hostGo != null) Object.DestroyImmediate(hostGo);
            GameObject reste = GameObject.Find("ConflitRoot");
            while (reste != null) { Object.DestroyImmediate(reste); reste = GameObject.Find("ConflitRoot"); }
            MafiaCleanCity.I18n.I18nCatalog.Oublier();
        }

        private IEnumerator FermerSession()
        {
            using (var req = new UnityEngine.Networking.UnityWebRequest(BaseUrl + "/v1/session/close", "POST"))
            {
                req.uploadHandler = new UnityEngine.Networking.UploadHandlerRaw(System.Text.Encoding.UTF8.GetBytes("{}"));
                req.downloadHandler = new UnityEngine.Networking.DownloadHandlerBuffer();
                req.SetRequestHeader("Content-Type", "application/json");
                req.SetRequestHeader("Authorization", "Bearer " + token);
                req.SetRequestHeader("Idempotency-Key", System.Guid.NewGuid().ToString());
                yield return req.SendWebRequest();
            }
        }

        [UnityTest]
        public IEnumerator ConflitReel_UnGrosBrasRecrute_LEnvoiPart_EtLaMemeCleNeLeFaitPasPartirDeuxFois()
        {
            // 1. Un compte neuf, sa session (l'octroi d'accueil), ses bâtiments.
            string err = null;
            yield return new AuthClient { BaseUrl = BaseUrl }.SignUp(SeederSupport.SafeCallsign("conflitreel", ref callsignSeq),
                "screen-conflit-pw", t => token = t, e => err = e);
            Assert.IsNull(err, "signup refusé (code et message dans le journal du back ; l'identité ne s'écrit pas ici)");
            Assert.IsNotNull(token);
            bool ouverte = false;
            yield return new MafiaCleanCity.Shell.SessionClient { BaseUrl = BaseUrl }.OpenSession(token, "conflit-reel-1.0.0",
                _ => ouverte = true, (c, m) => err = $"session/open {c} {m}");
            Assert.IsTrue(ouverte, err);

            MafiaCleanCity.Shell.BatimentPossedeDto[] batiments = null;
            yield return new MafiaCleanCity.Shell.MesBatimentsClient { BaseUrl = BaseUrl }.Lire(token, b => batiments = b,
                (c, m) => err = $"me/buildings {c} {m}");
            Assert.IsNotNull(batiments, err);
            string batiment = null;
            foreach (var b in batiments) if (!string.IsNullOrEmpty(b.operational_type)) { batiment = b.building; break; }
            Assert.IsNotNull(batiment, "l'octroi d'accueil n'a posé aucun bâtiment opérationnel");

            // 2. Le gros bras, AVANT tout autre geste structurel.
            string grosBras = null;
            yield return new MafiaCleanCity.Operational.Lieutenant.LieutenantClient { BaseUrl = BaseUrl }.Recruit(
                "MUSCLE", batiment, null, token, id => grosBras = id, (c, m) => err = $"recrutement {c} {m}");
            Assert.IsNotNull(grosBras, err);

            // 3. L'écran : il voit le gros bras, on choisit, « L’envoyer ce soir » part.
            hostGo = new GameObject("ConflitScreen", typeof(RectTransform));
            var ecran = hostGo.AddComponent<ConflitScreenController>();
            ecran.SetToken(token);
            yield return ecran.Charger();
            Assert.AreEqual(1, ecran.MuscleLieutenants.Count, "le gros bras recruté est choisissable");
            ecran.ChoisirFamille("coil");
            ecran.ChoisirLieutenant(grosBras);
            ecran.ChoisirAxe("finance");
            Assert.IsTrue(ecran.EnvoiPossible);
            string cle = null;
            ecran.EnvoyerLeCoup();   // le geste du bouton
            float fin = Time.realtimeSinceStartup + 20f;
            while (!ecran.DernierEnvoiOk && ecran.DerniereClasseDeRefus == null && Time.realtimeSinceStartup < fin) yield return null;
            Assert.IsTrue(ecran.DernierEnvoiOk, $"l'envoi n'est pas parti : classe {ecran.DerniereClasseDeRefus}, {ecran.DerniereErreur}");
            cle = ecran.DerniereCleDIdempotence;
            string engagement = ecran.DernierEngagementId;
            Assert.IsFalse(string.IsNullOrEmpty(engagement), "`engagement_id` rendu par le POST");
            // Le rechargement suit le succès : attendre que la liste RELUE porte l'envoi (l'ancienne, vide, reste lisible avant).
            fin = Time.realtimeSinceStartup + 20f;
            while ((ecran.DernierChargementEngagements?.engagements?.Length ?? 0) == 0 && Time.realtimeSinceStartup < fin) yield return null;
            Assert.AreEqual(1, ecran.DernierChargementEngagements?.engagements?.Length, "un envoi dans la liste");
            Assert.AreEqual("scheduled", ecran.DernierChargementEngagements.engagements[0].status);
            // Le rendu suit la relecture d'UNE frame (`Charger` : RechargerEngagements → yield → AppliquerEtat) — mesuré au créneau
            // du 23/09 : lue trop tôt, la liste des textes était encore celle d'avant l'envoi. On attend le RENDU, pas la donnée.
            fin = Time.realtimeSinceStartup + 10f;
            while (!System.Linq.Enumerable.Contains(ecran.RenderedTexts, "Ce qui est en cours") && Time.realtimeSinceStartup < fin) yield return null;
            CollectionAssert.Contains(ecran.RenderedTexts, "Ce qui est en cours");

            // 4. La promesse : même corps + même clé ⇒ le MÊME engagement, et toujours UN dans la liste.
            var client = new ConflitClient { BaseUrl = BaseUrl };
            var corps = new PostEngagementsBody { lieutenant_id = grosBras, target_rival_key = "coil", target_holding_id = "finance" };
            PostEngagementsResponseDto rejeu = null;
            yield return client.PostEngagements(token, corps, r => rejeu = r, (c, a, m) => err = $"rejeu {c} {a}", cle);
            Assert.IsNotNull(rejeu, err);
            Assert.AreEqual(engagement, rejeu.engagement_id, "la même clé REJOUE la réponse, elle ne réexécute pas");
            GetEngagementsResponseDto liste = null;
            yield return client.GetEngagements(token, l => liste = l, (c, m) => err = $"GET {c}");
            Assert.AreEqual(1, liste?.engagements?.Length, "« il ne partira pas deux fois » : un seul engagement");

            // 5. Contrôle négatif : une clé NEUVE, le même corps ⇒ un second envoi, que le compte voit.
            PostEngagementsResponseDto second = null;
            yield return client.PostEngagements(token, corps, r => second = r, (c, a, m) => err = $"second {c} {a}", null);
            Assert.IsNotNull(second, err);
            Assert.AreNotEqual(engagement, second.engagement_id);
            liste = null;
            yield return client.GetEngagements(token, l => liste = l, (c, m) => err = $"GET {c}");
            Assert.AreEqual(2, liste?.engagements?.Length, "une clé neuve fait partir un second envoi : le compte sait le voir");
        }
    }
}
