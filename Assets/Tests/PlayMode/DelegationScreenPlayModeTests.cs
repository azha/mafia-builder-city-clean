using System.Collections;
using System.Collections.Generic;
using System.Linq;
using NUnit.Framework;
using UnityEngine;
using UnityEngine.UI;
using UnityEngine.TestTools;
using MafiaCleanCity.Operational;
using MafiaCleanCity.Tests;
using Object = UnityEngine.Object;

namespace MafiaCleanCity.Operational.Tests
{
    /// <summary>ecran_delegation « La délégation » — squelette de suite généré par Tools/nouvel-ecran.py.
    ///
    /// ⛔ CE QUE CE SQUELETTE COUVRE : le montage structurel (CanvasRenderer, MaskableGraphic) et
    /// la capture pour le juge visuel. ⛔ CE QU'IL NE COUVRE PAS, et c'est // MÉTIER ICI partout
    /// où il manque : le PARCOURS joueur qui atteint cet écran (doctrine 4-couches, `CLAUDE.md`
    /// § « quatre couches ») — signup → `session/open` → la route, jamais un seed SQL sans le
    /// dire dans le nom du test. Le patron complet est `ReputationScreenPlayModeTests` (㊲,
    /// `pilote-B`) : `OuvrirJoueurFrais()` (signup + `session/close` défensif + lecture d'un
    /// lieutenant du kit de départ) — à adapter ici selon ce que `GetMetaTaskCategories` exige
    /// réellement comme précondition.</summary>
    // ⛔ LA CATÉGORIE EST POSÉE TEST PAR TEST, PAS SUR LA CLASSE (2026-09-24, orchestrateur) : posée sur la classe, elle s'unissait
    // à `PhotoEcranDelegation` sur C1 — la capture partait avec EcranDelegation et rougissait faute de la paire du compte de capture
    // (créneau du 23/09 08:48, 80/81). C1 ne porte plus que sa catégorie de capture (partie 2), comme les autres écrans.
    public class DelegationScreenPlayModeTests
    {
        private GameObject hostGo;

        [TearDown]
        public void TearDown()
        {
            MafiaCleanCity.CityMap.DemoIdentityResolver.SortirModeCapture(GetType().Name);   // mode capture levé en fin de test (voie 1, 22/09)
            // ⛔ L'ÉTAT STATIQUE SE REND, SINON C'EST L'ORDRE DES VOISINS QUI DÉCIDE. Les suites
            // PlayMode de ce dépôt tournent SÉRIELLES dans UN processus : un `JetonDeStructure`
            // publié par un test survit à tous les suivants. Ce dépôt a déjà payé exactement ça
            // (un lot voisin a fait tomber un seeder inchangé en laissant une session ouverte).
            MafiaCleanCity.Shell.JetonDeStructure.OublierPourTest();
            GameObject reste = GameObject.Find("DelegationRoot");
            while (reste != null) { Object.DestroyImmediate(reste); reste = GameObject.Find("DelegationRoot"); }
            if (hostGo != null) Object.Destroy(hostGo);
            hostGo = null;
        }

        /// <summary>La racine RÉELLE de l'écran n'est PAS `hostGo` : hors shell, le contrôleur
        /// découvre un Canvas et bâtit dessous (patron ㊲, ligne pour ligne). Chercher
        /// `hostGo.GetComponentsInChildren` rendrait ZÉRO en silence.</summary>
        private GameObject RacineEcran()
        {
            GameObject r = GameObject.Find("DelegationRoot");
            Assert.IsNotNull(r, "DelegationRoot introuvable : le contrôleur n'a pas construit sa " +
                                "mise en page (ni sous mountParent, ni sous un Canvas découvert)");
            return r;
        }

        private DelegationScreenController MonterEcran()
        {
            hostGo = new GameObject("DelegationScreen", typeof(RectTransform));
            var ecran = hostGo.AddComponent<DelegationScreenController>();
            return ecran;
        }

        // ═══ 1. GARDE STRUCTURELLE — ne lit aucun pixel, ne dépend d'aucune résolution ═══════

        /// <summary>⛔ TOUT `Graphic` PORTE SON `CanvasRenderer`, et TOUT Graphic sous ce fond
        /// est `MaskableGraphic` (donc masquable par un futur `Mask` parent) — patron ㊲, garde
        /// structurelle AVANT toute garde de valeur (c'est celle qui a fermé la classe
        /// "occlusion par fratrie" en 12 lignes là où 4 tours de gardes pixel n'y voyaient rien).
        ///
        /// ⚠️ Anti-vacuité : `AddComponent<DelegationScreenController>()` seul construit déjà le
        /// fond de `BuildLayout()` (appelé depuis `Awake()`), donc CETTE garde mord même sur le
        /// squelette non rempli — au moins 1 Graphic (le fond). Une fois le MÉTIER ICI de
        /// `BuildLayout()` rempli, relever le plancher `Assert.Greater(comptes, 1, ...)` vers une
        /// valeur qui reflète le contenu réel (㊲ l'a posé à 10).</summary>
        [UnityTest, Category("EcranDelegation")]
        public IEnumerator EcranDelegationS1_ToutGraphic_PorteSonCanvasRenderer()
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

            // ⛔ PLANCHER RELEVÉ APRÈS REMPLISSAGE, ET IL EST DÉRIVÉ, PAS CHOISI. Le squelette
            // généré n'avait qu'UN Graphic (son fond) et le plancher à `> 0` était honnête pour
            // lui. L'écran construit en porte au minimum : 1 fond + 2 bandes de dégradé + 1 fond
            // de tête + 1 filet + 2 textes de tête + 1 fond de pied + 1 filet = 9, AVANT tout
            // contenu de la zone centrale — laquelle, sur un corps chargé, ajoute au moins le
            // jeton (fond + bord + rond + anneau + 2 textes) et quatre plaques. Un plancher resté
            // à 1 aurait certifié un écran réduit à son fond : *une garde qui ne monte pas avec
            // ce qu'elle garde cesse de garder quoi que ce soit.*
            Assert.Greater(comptes, 8,
                $"seulement {comptes} Graphic — la charpente de l'écran (fond, deux bandes, tête, " +
                "filets, pied) en impose 9 au minimum. En dessous, l'écran ne s'est pas construit " +
                "et les gardes suivantes seraient vraies À VIDE.");
            Assert.IsEmpty(sansRenderer,
                "des Graphic sans CanvasRenderer ne dessinent RIEN, en silence : " +
                string.Join(", ", sansRenderer));
            Assert.IsEmpty(nonMaskable,
                "des Graphic non-MaskableGraphic ignoreraient tout Mask parent (un `Graphic` nu " +
                "dérivé sur mesure, jamais `UnityEngine.UI.Image`/`TextMeshProUGUI`) : " +
                string.Join(", ", nonMaskable));
        }

        // ═══ 2. CAPTURE pour le juge visuel ⊥ — deux résolutions ══════════════════════════════

        /// <summary>Patron ㊲ (`CapturerA`) : bascule le Canvas en `ScreenSpaceCamera` sur une
        /// `RenderTexture` de la taille CIBLE (le batchmode reste bloqué à 640 de large — capturer
        /// une résolution qu'on n'a pas passe par la caméra, pas par `-screen-width`), reconstruit
        /// le layout APRÈS la bascule (sinon on photographie une géométrie calculée pour 640), et
        /// cadre l'ortho sur le rect RÉEL du canvas (pas sur la résolution demandée : le
        /// CanvasScaler change les unités).
        ///
        /// ⚠️ `Canvas.scaleFactor` lu la frame de la création rend 1,0 — plausible et faux, d'où
        /// les `yield return null` avant tout rendu.</summary>
        // ⛔⛔ LA CATÉGORIE GÉNÉRIQUE DES CAPTURES ÉTAIT CODÉE EN DUR ICI, et ce gabarit produit
        // les 46 écrans restants. Deux défauts d'un coup, à chaque écran généré :
        // (a) la capture n'était adressable QUE par `Capture`, donc pas isolable de ses soeurs ;
        // (b) `Capture` fait SIGSEGV dans le pilote Mesa (mesuré dans ce dépôt), donc la seule
        //     demande qui l'atteignait est aussi celle qui tue le run.
        // ⇒ Une capture livrée par ce gabarit était **armée et injoignable** — exactement le
        //   défaut que le chantier joignabilité ferme côté ÉCRANS, ici côté TESTS.
        // ⚠️ Et le préfixe est `Photo`, pas `Capture` : le filtre d'Unity matche par PRÉFIXE, donc
        //   `Capture<Ecran>` serait emporté par une demande de `Capture` — le piège qui a mordu
        //   trois sessions le 2026-09-02 (`["HUD"]`→`HUDv31`, `["CaptureDetail"]`→
        //   `CaptureDetailMutant`, et ma propre série de noms, refusée par ma propre garde).
        /// <summary>Capture authentifiée du contenu, pas seulement de sa charpente. Avant TD-541,
        /// `MonterEcran()` ne donnait aucun jeton : l'amorce sortait sans requête et la caméra
        /// photographiait un fond uniforme. Le test signe désormais avec l'identité de campagne,
        /// exige un corps et un rendu abouti, puis seulement écrit les PNG. Mesure du correctif :
        /// 3,252 % et 2,602 % d'encre aux deux résolutions, contre 0,000 % auparavant.</summary>
        [UnityTest, Category("PhotoEcranDelegation")]
        public IEnumerator EcranDelegationC1_CapturerPourLeJugeVisuel_DeuxResolutions()
        {
            var auth = new MafiaCleanCity.CityMap.AuthClient { BaseUrl = BaseUrl };
            string erreurConnexion = null;
            token = null;
            var (identifiant, motDePasse) =
                MafiaCleanCity.Shell.Tests.CaptureSousShell.IdentiteDeCaptureOuEchoue("ecran_delegation");
            yield return auth.SignIn(identifiant, motDePasse,
                t => token = t, e => erreurConnexion = e);
            Assert.IsNull(erreurConnexion, $"connexion au compte de capture échouée : {erreurConnexion}");
            // garde d'EFFET (22/09, « toute planche porte la preuve de l'effet ») — `GET /v1/me` avec le jeton réellement utilisé,
            // confronté à l'identité annoncée, AVANT tout PNG.
            yield return MafiaCleanCity.Shell.Tests.CaptureSousShell.IdentiteConnecteeOuEchoue(token, identifiant, "ecran_delegation");

            var ecran = MonterEcran();
            // Laisser Start constater l'absence de jeton, puis déclencher exactement UN chargement.
            yield return null;
            ecran.SetToken(token);
            yield return ecran.Charger();
            yield return null;

            Assert.IsNull(ecran.DerniereErreur,
                $"la route a échoué (code {ecran.DernierCodeErreur} — {ecran.DerniereErreur}) : " +
                "la capture montrerait l'état d'indisponibilité, pas la délégation");
            Assert.IsNotNull(ecran.DernierChargement, "aucun corps reçu — rien à photographier");
            Assert.Greater(ecran.RendusEffectues, 0, "le corps est arrivé mais aucun rendu n'a abouti");

            yield return CapturerA(1080, 1920, "Assets/Screenshots/ecran_delegation_1080x1920.png");
            yield return CapturerA(1080, 2400, "Assets/Screenshots/ecran_delegation_1080x2400.png");
        }

        private IEnumerator CapturerA(int largeur, int hauteur, string chemin)
        {
            GameObject racine = RacineEcran();
            Canvas canvas = racine.GetComponentInParent<Canvas>();
            Assert.IsNotNull(canvas, "DelegationRoot n'est sous aucun Canvas : rien ne peut être rendu");

            RenderMode modeAvant = canvas.renderMode;
            Camera cameraAvant = canvas.worldCamera;
            float planAvant = canvas.planeDistance;

            var rt = new RenderTexture(largeur, hauteur, 24, RenderTextureFormat.ARGB32);
            var camGo = new GameObject("CaptureCamEcranDelegation");
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
            // Le plancher d'encre — 4 planches du dépôt étaient vides avec des tests verts.
            MafiaCleanCity.Shell.Tests.CaptureSousShell.PlancherDEncre(tex, chemin);

            // Anti-vacuité de FORME (patron ㊲) : une capture ratée est UNIFORME, peu importe sa
            // couleur — on compte les pixels qui diffèrent du fond dominant, pas les pixels
            // "clairs" (le fond lui-même peut être clair).
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
            // ⛔ TD-554 : ce plancher était `horsFond > 0` — il n'exigeait QUE que l'image ne
            // soit pas d'une seule couleur, donc un écran VIDE le franchissait. Il venait du
            // gabarit de `Tools/nouvel-ecran.py`, avec son excuse « plancher volontairement bas,
            // à durcir une fois BuildLayout() rempli » : aucun écran n'est jamais revenu le
            // durcir. *Une dette écrite dans un gabarit n'est pas une dette, c'est une politique.*
            // La PROPORTION de pixels hors dominante est de toute façon la mauvaise grandeur —
            // l'anticrénelage d'un titre en produit autant qu'une mise en page. Le NOMBRE DE
            // TEINTES tranche. Seuils repris de `CaptureSousShell`.
            // ⛔ AVERTISSEMENT, PAS ASSERTION (2026-09-04) : cet écran est capturé SEUL, sur un
            // compte souvent frais. Son état vide rend légitimement 8 à 9 teintes, et asserter
            // ici ferait rougir un écran CORRECT — mesuré sur ㉜ et ㉝, à qui je l'ai failli.
            // *Une garde chromatique ne distingue pas « cassé » de « correctement vide ».*
            if (histo.Count <= 12)
                Debug.LogWarning($"[CAPTURE] {largeur}x{hauteur} — {histo.Count} teintes : un FOND " +
                    "avec un titre. Vérifier QUEL COMPTE la suite ouvre avant de conclure.");
            Assert.IsTrue(largeur >= 200 && hauteur >= 200,
                $"capture {largeur}x{hauteur} : une dimension sous 200 px — un RectTransform resté " +
                "à sa taille par défaut (100x100) ne leve AUCUNE erreur console et rend une image plausible");

            canvas.renderMode = modeAvant;
            canvas.worldCamera = cameraAvant;
            canvas.planeDistance = planAvant;
            Object.Destroy(camGo);
            rt.Release();
            yield return null;
        }

        // ═══ 3. PARCOURS — routes joueur seulement, aucun seed SQL, aucun seam `_test` ═══════

        private const string BaseUrl = "http://localhost";
        private static int callsignSeq;
        private string token;

        /// <summary>signup → (session fermée par précaution) → la route. C'est la couche
        /// PARCOURS de la doctrine à quatre couches : elle prouve qu'un joueur ATTEINT cette
        /// surface, ce qu'aucun test de moteur ne prouve jamais.</summary>
        private IEnumerator OuvrirJoueurFrais()
        {
            var auth = new MafiaCleanCity.CityMap.AuthClient { BaseUrl = BaseUrl };
            string callsign = SeederSupport.SafeCallsign("d32", ref callsignSeq);
            string err = null;
            token = null;
            yield return auth.SignUp(callsign, "ecran-32-pw", t => token = t, e => err = e);
            Assert.IsNull(err, $"signup a échoué : {err}");
            Assert.IsNotNull(token, "signup n'a pas rendu de jeton");
        }

        /// <summary>㉜ lot 1 (2026-09-23) — TD-530 EST FERMÉE CÔTÉ BACK : `category_id` est SERVI par la projection
        /// (`meta-progression.projection.service.ts:70`) et c'est lui qui part vers les trois routes d'action ; la copie client des
        /// codes est retirée. Ce test lit le RÉSEAU (compte frais) et épingle la VALEUR servie de chaque charge LIVE contre le catalogue
        /// du back (`task-category-catalogue.ts` : 1, 2, 4, 5 — « 3 » est LEK_CONTEST, en réserve). Il rougit si le champ disparaît
        /// (0), si deux charges partagent un code, ou si le catalogue bouge.</summary>
        [UnityTest, Category("EcranDelegation")]
        public IEnumerator EcranDelegationG1_ChaqueChargeServiePorteSonCode()
        {
            yield return OuvrirJoueurFrais();

            var client = new DelegationClient { BaseUrl = BaseUrl };
            GetMetaTaskCategoriesResponseDto corps = null;
            string erreur = null;
            yield return client.GetMetaTaskCategories(token, d => corps = d, r => erreur = r.message);

            Assert.IsNull(erreur, $"GET /v1/meta/task-categories a échoué : {erreur}");
            Assert.IsNotNull(corps?.task_categories, "corps ou `task_categories` nul");
            Assert.Greater(corps.task_categories.Length, 0, "anti-vacuité : 0 charge servie");

            var attendus = new Dictionary<string, int>
            {
                ["ROUTE_ASSIGNMENT"] = 1, ["LIEUTENANT_HIRING"] = 2, ["SUPPLY_SOURCING"] = 4, ["HEAT_MANAGEMENT"] = 5,
            };
            foreach (TaskCategoryRowDto r in corps.task_categories)
            {
                Assert.IsTrue(DelegationScreenController.CodeServi(r), $"{r.category_key} : `category_id` absent (0) — forme G perdue");
                Assert.IsTrue(attendus.ContainsKey(r.category_key), $"charge LIVE inconnue du test : {r.category_key}");
                Assert.AreEqual(attendus[r.category_key], r.category_id, $"{r.category_key} : le code SERVI");
            }
            Assert.AreEqual(corps.task_categories.Length, corps.task_categories.Select(r => r.category_id).Distinct().Count(),
                "deux charges ne partagent jamais un code");
        }

        /// <summary>㉜ lot 1 — sans réseau : « La lui confier » envoie le code SERVI de la ligne visée (un code FABRIQUÉ, 42, qu'aucune
        /// copie client ne connaît — la preuve que rien d'autre ne le fournit) ; une ligne sans code (0) n'offre AUCUN geste vivant.</summary>
        [UnityTest, Category("EcranDelegation")]
        public IEnumerator EcranDelegationL1_LaLuiConfier_EnvoieLeCodeServi_EtSansCodeRienNePart()
        {
            UnityEngine.TestTools.LogAssert.ignoreFailingMessages = true;   // le port fermé fait échouer la requête : on lit le code PARTI
            var ecran = MonterEcran();
            ecran.SetBaseUrl("http://127.0.0.1:9");
            yield return null;
            var roster = new GetLieutenantsResponseDto { lieutenants = new[] { new LieutenantRowDto { lieutenant_id = "lt-1", name = "Lt. Vesk" } } };
            GetMetaTaskCategoriesResponseDto Corps(int code) => new GetMetaTaskCategoriesResponseDto
            {
                task_categories = new[]
                {
                    new TaskCategoryRowDto { category_key = "SUPPLY_SOURCING", category_id = code, mastery_bucket = "ELIGIBLE",
                                             progress_band = "HIGH", delegation_state = "SELF" },
                },
                delegated = new DelegatedSummaryDto[0],
            };

            ecran.RendrePourTest(Corps(42), roster, jetonDepense: false);
            ecran.AllerA(DelegationScreenController.EtatEcran.Confier, "SUPPLY_SOURCING");
            yield return null;
            Button confier = GesteVivant();
            Assert.IsNotNull(confier, "une charge prête, un candidat, le jeton libre : « La lui confier » est vivant");
            confier.onClick.Invoke();
            Assert.AreEqual(42, ecran.DerniereCategorieDemandee, "le code SERVI de la ligne part, pas une copie client");

            ecran.RendrePourTest(Corps(0), roster, jetonDepense: false);
            ecran.AllerA(DelegationScreenController.EtatEcran.Confier, "SUPPLY_SOURCING");
            yield return null;
            Assert.IsNull(GesteVivant(), "sans code servi, aucun geste vivant : on n'envoie ni 0 ni un code deviné");
        }

        // ═══ ㉜ lot 3 — les refus, EN MOTS (sans réseau) ════════════════════════════════════

        private static DelegationClient.Refus Refus(string code, string cle, string message, string raison = null) =>
            new DelegationClient.Refus { statut = 409, code = code, cle = cle, message = message, raison = raison };

        /// <summary>R1 — la phrase d'un refus vient de sa clé SERVIE (ou de la raison servie) ; le message anglais du serveur et une
        /// URL de panne ne s'affichent JAMAIS.</summary>
        [Test, Category("EcranDelegation")]
        public void EcranDelegationR1_LaPhraseDuRefus_JamaisLeMessageAnglais()
        {
            MafiaCleanCity.I18n.I18nCatalog.Oublier();
            string anglais = "category 4 has an ACTIVE promotion lock — graduation refused until it closes.";
            string generique = DelegationScreenController.PhraseDeRefus(Refus("RESOURCE_STATE_CONFLICT", "error.resource.state_conflict", anglais));
            Assert.AreEqual("Rien n’a été changé.", generique, "sans catalogue : le repli du client, pas le message");
            string panne = DelegationScreenController.PhraseDeRefus(new DelegationClient.Refus
                { statut = 0, message = "http://127.0.0.1:9/v1/meta/graduation — Cannot connect to destination host" });
            Assert.AreEqual("Rien n’a été changé.", panne, "une panne de transport ne montre ni URL ni erreur système");

            MafiaCleanCity.I18n.I18nCatalog.ChargerPourTest("fr", new Dictionary<string, string>
            {
                ["error.resource.state_conflict"] = "La situation a changé depuis votre dernier coup d’œil. Rechargez et décidez à nouveau.",
                ["error.core_loops.structural_cap_exhausted"] = "Vous avez utilisé votre décision de structure du jour. Reprenez demain.",
                ["delegation.refus.un_changement_est_deja_en_cours_sur_cette_charge"] = "un changement est déjà en cours sur cette charge",
            });
            try
            {
                Assert.AreEqual("La situation a changé depuis votre dernier coup d’œil. Rechargez et décidez à nouveau.",
                    DelegationScreenController.PhraseDeRefus(Refus("RESOURCE_STATE_CONFLICT", "error.resource.state_conflict", anglais)),
                    "sans raison servie (aujourd'hui) : la phrase GÉNÉRIQUE servie de la clé du refus");
                Assert.AreEqual("Vous avez utilisé votre décision de structure du jour. Reprenez demain.",
                    DelegationScreenController.PhraseDeRefus(Refus("STRUCTURAL_CAP_EXHAUSTED", "error.core_loops.structural_cap_exhausted",
                        "Structural decisions exhausted for this session. Return in next session.")));
                Assert.AreEqual("un changement est déjà en cours sur cette charge",
                    DelegationScreenController.PhraseDeRefus(Refus("RESOURCE_STATE_CONFLICT", "error.resource.state_conflict", anglais,
                        raison: "promotion_lock_active")), "la raison servie (annoncée) choisit le mot de la table 44");
                Assert.AreEqual("La situation a changé depuis votre dernier coup d’œil. Rechargez et décidez à nouveau.",
                    DelegationScreenController.PhraseDeRefus(Refus("RESOURCE_STATE_CONFLICT", "error.resource.state_conflict", anglais,
                        raison: "__HORS_DOMAINE__")), "une raison inconnue : la phrase générique, jamais la raison brute");
            }
            finally { MafiaCleanCity.I18n.I18nCatalog.Oublier(); }
            CollectionAssert.AreEqual(new string[] { null, null, null, null },
                new[] { null, "", "__X__", "NOT_SELF" }.Select(DelegationScreenController.PhraseDeRaison).ToArray());
        }

        /// <summary>R2 — le 409 du PLAFOND éteint le jeton PARTAGÉ dès le refus (d'après le refus servi, pas un compteur) et mène au
        /// tableau « déjà tranché » ; un autre refus reste sur l'état du geste, en mots.</summary>
        [UnityTest, Category("EcranDelegation")]
        public IEnumerator EcranDelegationR2_LePlafond_EteintLeJetonDesLeRefus()
        {
            var ecran = MonterEcran();
            ecran.SetBaseUrl("http://127.0.0.1:9");
            yield return null;
            var corps = new GetMetaTaskCategoriesResponseDto
            {
                task_categories = new[] { new TaskCategoryRowDto { category_key = "SUPPLY_SOURCING", category_id = 4, mastery_bucket = "ELIGIBLE",
                                                                   progress_band = "HIGH", delegation_state = "SELF" } },
                delegated = new DelegatedSummaryDto[0],
            };
            var roster = new GetLieutenantsResponseDto { lieutenants = new[] { new LieutenantRowDto { lieutenant_id = "lt-1", name = "Lt. Vesk" } } };
            ecran.RendrePourTest(corps, roster, jetonDepense: false);
            ecran.AllerA(DelegationScreenController.EtatEcran.Confier, "SUPPLY_SOURCING");
            Assert.IsFalse(MafiaCleanCity.Shell.JetonDeStructure.PlafondAtteint, "anti-vacuité : le jeton est libre avant le refus");

            ecran.RefuserPourTest(Refus("RESOURCE_STATE_CONFLICT", "error.resource.state_conflict", "category 4 is not SELF-managed"));
            Assert.AreEqual(DelegationScreenController.EtatEcran.Confier, ecran.EtatCourant, "un refus ordinaire reste sur le geste");
            Assert.IsFalse(MafiaCleanCity.Shell.JetonDeStructure.PlafondAtteint, "un refus ordinaire ne touche pas au jeton");
            StringAssert.Contains("Rien n’a été changé.", TexteDeLEcran(), "le refus se DIT (en mots)");
            Assert.IsFalse(TexteDeLEcran().Contains("SELF-managed"), "jamais le message anglais");

            ecran.RefuserPourTest(Refus("STRUCTURAL_CAP_EXHAUSTED", "error.core_loops.structural_cap_exhausted",
                "Structural decisions exhausted for this session. Return in next session."));
            Assert.IsTrue(MafiaCleanCity.Shell.JetonDeStructure.PlafondAtteint, "le jeton PARTAGÉ (㉝ ㉞) s'éteint dès le refus");
            Assert.IsTrue(ecran.JetonDepense);
            Assert.AreEqual(DelegationScreenController.EtatEcran.Tableau, ecran.EtatCourant, "le plafond mène au tableau « déjà tranché »");
            Assert.IsNull(GesteVivant(), "plus aucun geste vivant : le jeton est dépensé");
            yield return null;
        }

        /// <summary>R3 — un refus n'est plus AVALÉ comme un succès : `Charger()` remettait le refus à null, et l'écran repartait au
        /// tableau. Ici une vraie requête échoue (port fermé) : l'écran reste sur « confier » et dit le refus, sans URL.</summary>
        [UnityTest, Category("EcranDelegation")]
        public IEnumerator EcranDelegationR3_UnRefusNEstPasAvaleCommeUnSucces()
        {
            UnityEngine.TestTools.LogAssert.ignoreFailingMessages = true;
            var ecran = MonterEcran();
            ecran.SetBaseUrl("http://127.0.0.1:9");
            yield return null;
            var corps = new GetMetaTaskCategoriesResponseDto
            {
                task_categories = new[] { new TaskCategoryRowDto { category_key = "SUPPLY_SOURCING", category_id = 4, mastery_bucket = "ELIGIBLE",
                                                                   progress_band = "HIGH", delegation_state = "SELF" } },
                delegated = new DelegatedSummaryDto[0],
            };
            var roster = new GetLieutenantsResponseDto { lieutenants = new[] { new LieutenantRowDto { lieutenant_id = "lt-1", name = "Lt. Vesk" } } };
            ecran.RendrePourTest(corps, roster, jetonDepense: false);
            ecran.AllerA(DelegationScreenController.EtatEcran.Confier, "SUPPLY_SOURCING");
            yield return null;
            GesteVivant().onClick.Invoke();
            float fin = Time.realtimeSinceStartup + 20f;
            while (!TexteDeLEcran().Contains("Rien n’a été changé.") && Time.realtimeSinceStartup < fin) yield return null;
            StringAssert.Contains("Rien n’a été changé.", TexteDeLEcran(), "le refus (une panne) est DIT après le rechargement");
            Assert.AreEqual(DelegationScreenController.EtatEcran.Confier, ecran.EtatCourant, "PAS le tableau d'un succès");
            Assert.IsFalse(TexteDeLEcran().Contains("127.0.0.1"), "jamais d'URL à l'écran");
        }

        // ═══ ㉜ lot 3b — le plafond et le verrou, dits AVANT l'appui (sans réseau) ═════════════

        private static GetMetaTaskCategoriesResponseDto CorpsSupply(bool verrou = false, bool budgetServi = false, bool capAtteint = false) =>
            new GetMetaTaskCategoriesResponseDto
            {
                task_categories = new[] { new TaskCategoryRowDto { category_key = "SUPPLY_SOURCING", category_id = 4, mastery_bucket = "ELIGIBLE",
                                                                   progress_band = "HIGH", delegation_state = "SELF", promotion_lock = verrou } },
                delegated = new DelegatedSummaryDto[0],
                structural_budget = new StructuralBudgetDelegationDto { used = capAtteint ? 1 : 0, cap_reached = capAtteint,
                                                                        decisions_this_session = new DecisionDeSessionDto[0] },
                StructuralBudgetServi = budgetServi,
            };

        private static readonly GetLieutenantsResponseDto UnLieutenant =
            new GetLieutenantsResponseDto { lieutenants = new[] { new LieutenantRowDto { lieutenant_id = "lt-1", name = "Lt. Vesk" } } };

        /// <summary>B1 — le budget de `task-categories` (déclaré) ne vaut que s'il est SERVI : absent (aujourd'hui), le jeton de
        /// l'ouverture de session reste ; servi avec `cap_reached`, il éteint le jeton PARTAGÉ avant tout appui.</summary>
        [UnityTest, Category("EcranDelegation")]
        public IEnumerator EcranDelegationB1_LeBudgetServi_SeulementSIlEstServi()
        {
            var ecran = MonterEcran();
            ecran.SetBaseUrl("http://127.0.0.1:9");
            yield return null;
            MafiaCleanCity.Shell.JetonDeStructure.Publier(1, true);   // l'ouverture de session a dit : dépensé
            ecran.RendrePourTest(CorpsSupply(budgetServi: false), UnLieutenant, jetonDepense: true);
            Assert.IsTrue(MafiaCleanCity.Shell.JetonDeStructure.PlafondAtteint,
                "un budget ABSENT (objet par défaut de JsonUtility) n'écrase pas le jeton de l'ouverture");

            MafiaCleanCity.Shell.JetonDeStructure.OublierPourTest();
            ecran.RendrePourTest(CorpsSupply(budgetServi: true, capAtteint: true), UnLieutenant, jetonDepense: false);
            Assert.IsTrue(MafiaCleanCity.Shell.JetonDeStructure.PlafondAtteint, "servi et atteint : le jeton partagé s'éteint");
            Assert.IsTrue(ecran.JetonDepense);
            Assert.IsNull(GesteVivant(), "plus de geste vivant AVANT l'appui");
        }

        /// <summary>B2 — la pression après une décision : `decisions_remaining` décide, `decisions_this_session_display` (cadence
        /// d'affichage) JAMAIS.</summary>
        [UnityTest, Category("EcranDelegation")]
        public IEnumerator EcranDelegationB2_LaPression_LeResteEnforceDecide_JamaisLaCadence()
        {
            var ecran = MonterEcran();
            yield return null;
            ecran.PrendreLaPression(new GetMetaPressureResponseDto { decisions_remaining = 0, decisions_this_session_display = 12 });
            Assert.IsTrue(MafiaCleanCity.Shell.JetonDeStructure.PlafondAtteint, "reste 0 : dépensé, même si la cadence affiche 12");
            Assert.IsTrue(ecran.JetonDepense);
            ecran.PrendreLaPression(new GetMetaPressureResponseDto { decisions_remaining = 1, decisions_this_session_display = 0 });
            Assert.IsFalse(MafiaCleanCity.Shell.JetonDeStructure.PlafondAtteint, "reste 1 : libre, même si la cadence affiche 0");
            Assert.IsFalse(ecran.JetonDepense);
        }

        /// <summary>B3 — le verrou de promotion (déclaré) éteint le geste AVANT l'appui et dit pourquoi, avec le mot servi de la
        /// table 44 — distinct du plafond, qui reste libre.</summary>
        [UnityTest, Category("EcranDelegation")]
        public IEnumerator EcranDelegationB3_LeVerrou_EteintLeGesteEtLeDit()
        {
            var ecran = MonterEcran();
            ecran.SetBaseUrl("http://127.0.0.1:9");
            yield return null;
            ecran.RendrePourTest(CorpsSupply(verrou: true), UnLieutenant, jetonDepense: false);
            ecran.AllerA(DelegationScreenController.EtatEcran.Confier, "SUPPLY_SOURCING");
            yield return null;
            Assert.IsNull(GesteVivant(), "verrou actif : « La lui confier » n'est pas vivant");
            StringAssert.Contains("un changement est déjà en cours sur cette charge", TexteDeLEcran(), "le verrou se DIT, avant l'appui");
            Assert.IsFalse(ecran.JetonDepense, "le verrou n'est pas le plafond : le jeton reste libre");

            ecran.RendrePourTest(CorpsSupply(verrou: false), UnLieutenant, jetonDepense: false);
            ecran.AllerA(DelegationScreenController.EtatEcran.Confier, "SUPPLY_SOURCING");
            yield return null;
            Assert.IsNotNull(GesteVivant(), "contrôle : sans verrou, le geste est vivant");
        }

        /// <summary>Le bouton du geste (`Geste` → sa zone `Touche`), s'il est vivant — un geste mort n'a AUCUN gestionnaire.</summary>
        private Button GesteVivant()
        {
            foreach (Transform t in RacineEcran().GetComponentsInChildren<Transform>(true))
                if (t.name == "Geste" && t.gameObject.activeInHierarchy)
                {
                    Transform touche = t.Find("Touche");
                    if (touche != null) return touche.GetComponent<Button>();
                }
            return null;
        }

        /// <summary>Le corps réel MESURÉ sur un compte frais, épinglé : quatre charges, toutes en
        /// `SELF`, toutes `NASCENT`. Ce n'est pas un détail de fixture — c'est ce qui rend le
        /// geste « en confier une » INOPÉRANT au premier jour, et donc ce que l'écran doit dire.
        /// ⛔ L'épingle porte sur des VALEURS présentes, jamais sur l'absence d'une clé : une
        /// assertion d'absence resterait verte le jour où la valeur apparaît.</summary>
        [UnityTest, Category("EcranDelegation")]
        public IEnumerator EcranDelegationP1_UnCompteFraisTientSesQuatreCharges()
        {
            yield return OuvrirJoueurFrais();

            var client = new DelegationClient { BaseUrl = BaseUrl };
            GetMetaTaskCategoriesResponseDto corps = null;
            string erreur = null;
            yield return client.GetMetaTaskCategories(token, d => corps = d, r => erreur = r.message);
            Assert.IsNull(erreur, $"GET /v1/meta/task-categories a échoué : {erreur}");
            Assert.IsNotNull(corps?.task_categories, "corps ou `task_categories` nul");

            Assert.AreEqual(4, corps.task_categories.Length,
                "la projection n'itère que les catégories LIVE : elles sont QUATRE. Un autre " +
                "compte signifie que le catalogue a bougé côté serveur.");
            foreach (TaskCategoryRowDto r in corps.task_categories)
            {
                Assert.AreEqual("SELF", r.delegation_state,
                    $"{r.category_key} : un compte frais ne délègue rien");
                // Ne PAS asserter `NASCENT` : la maîtrise monte avec le jeu, et un compte qui
                // aurait déjà joué serait `LEARNING` sans que rien ne soit cassé. Ce qu'on épingle,
                // c'est que la bande est LISIBLE par le résolveur — donc que l'écran saura quoi
                // écrire. Un `mastery_bucket` inconnu ferait JETER cette ligne, bruyamment.
                TaskCategoryRowDto ligne = r;   // capture par itération, explicite
                Assert.DoesNotThrow(() => { DelegationResolvers.LireMaitrise(ligne.mastery_bucket); },
                    $"{ligne.category_key} : bande de maîtrise '{ligne.mastery_bucket}' non résolue par le client");
            }
        }

        // ═══ 4. ÉTAT — le rendu, sur un corps FABRIQUÉ (ne prouve rien du back) ══════════════

        /// <summary>Ce que l'écran FAIT d'un corps où deux charges sont confiées : le cadre m-75.
        /// ⚠️ Un corps fabriqué ne prouve JAMAIS que le back émet cette forme — c'est le rôle des
        /// deux tests de parcours ci-dessus. Il prouve seulement le rendu, et il permet d'exercer
        /// l'état « confié » qu'un compte frais ne peut pas atteindre (il faudrait `ELIGIBLE`).</summary>
        [UnityTest, Category("EcranDelegation")]
        public IEnumerator EcranDelegationE1_DeuxChargesConfiees_LeTitreEtLesNomsSuivent()
        {
            var ecran = MonterEcran();
            yield return null;

            var corps = new GetMetaTaskCategoriesResponseDto
            {
                task_categories = new[]
                {
                    new TaskCategoryRowDto { category_key = "ROUTE_ASSIGNMENT",  mastery_bucket = "NASCENT",  progress_band = "LOW",  delegation_state = "SELF" },
                    new TaskCategoryRowDto { category_key = "LIEUTENANT_HIRING", mastery_bucket = "ELIGIBLE", progress_band = "HIGH", delegation_state = "DELEGATED", delegated_lieutenant_ref = "lt-1" },
                    new TaskCategoryRowDto { category_key = "SUPPLY_SOURCING",   mastery_bucket = "ELIGIBLE", progress_band = "HIGH", delegation_state = "DELEGATED", delegated_lieutenant_ref = "lt-2" },
                    new TaskCategoryRowDto { category_key = "HEAT_MANAGEMENT",   mastery_bucket = "ELIGIBLE", progress_band = "HIGH", delegation_state = "SELF" },
                },
                delegated = new DelegatedSummaryDto[0],
            };
            var roster = new GetLieutenantsResponseDto
            {
                lieutenants = new[]
                {
                    new LieutenantRowDto { lieutenant_id = "lt-1", name = "Lt. Vesk" },
                    new LieutenantRowDto { lieutenant_id = "lt-2", name = "Lt. Ferrand" },
                },
            };
            ecran.RendrePourTest(corps, roster, jetonDepense: false);
            yield return null;

            string tout = TexteDeLEcran();
            StringAssert.Contains("Ce que vous avez confié", tout,
                "le titre doit SUIVRE l'état réel du tableau (m-75), pas rester sur celui de m-73");
            StringAssert.Contains("2 charges tenues", tout, "le sous-titre compte les charges confiées");
            // ⛔ Le NOM, pas l'UUID : `delegated_lieutenant_ref` est un identifiant, et la seule
            // façon d'écrire un nom est la jointure avec le roster. Sans elle, l'écran afficherait
            // « lt-1 » à un joueur.
            StringAssert.Contains("Lt. Vesk", tout, "le nom du lieutenant vient de GET /v1/lieutenants");
            StringAssert.Contains("Lt. Ferrand", tout, "les DEUX charges confiées nomment leur tenant");
            Assert.IsFalse(tout.Contains("lt-1"),
                "un UUID de lieutenant est visible à l'écran — la jointure avec le roster n'a pas eu lieu");
        }

        /// <summary>Le jeton dépensé change le titre, éteint le geste, et le DIT. C'est l'état
        /// m-77, et c'est la propriété que les trois écrans du jeton (㉜ ㉝ ㉞) doivent partager.</summary>
        [UnityTest, Category("EcranDelegation")]
        public IEnumerator EcranDelegationE2_JetonDepense_LeGesteSeteintEtLeDit()
        {
            var ecran = MonterEcran();
            yield return null;

            var corps = new GetMetaTaskCategoriesResponseDto
            {
                task_categories = new[]
                {
                    new TaskCategoryRowDto { category_key = "ROUTE_ASSIGNMENT", mastery_bucket = "ELIGIBLE", progress_band = "HIGH", delegation_state = "SELF" },
                },
                delegated = new DelegatedSummaryDto[0],
            };
            ecran.RendrePourTest(corps, null, jetonDepense: true);
            yield return null;

            string tout = TexteDeLEcran();
            StringAssert.Contains("Vous avez déjà tranché aujourd'hui", tout);
            StringAssert.Contains("plus de décision aujourd'hui", tout,
                "le geste doit dire POURQUOI il est éteint — un bouton gris sans raison est pire " +
                "qu'un bouton absent");
            StringAssert.Contains("Une seule décision de structure par journée", tout,
                "la règle s'explique en toutes lettres (m-77) : c'est une contrainte de design, " +
                "pas une limite d'énergie, et l'écran le dit");
        }

        /// <summary>Le cadre de la réserve (m-78) : les huit charges déclarées côté serveur et
        /// sans aucune surface joueur. Elles ne viennent d'AUCUNE route — la projection filtre sur
        /// `live` — donc ce test épingle la seule chose qui compte : que l'écran en montre HUIT et
        /// que son texte parle bien de huit. *Un écran qui se contredit lui-même apprend au joueur
        /// à ne pas le croire.*</summary>
        [UnityTest, Category("EcranDelegation")]
        public IEnumerator EcranDelegationE3_LaReserveMontreLesHuitDontElleParle()
        {
            var ecran = MonterEcran();
            yield return null;
            ecran.RendrePourTest(new GetMetaTaskCategoriesResponseDto
            {
                task_categories = new TaskCategoryRowDto[0],
                delegated = new DelegatedSummaryDto[0],
            });
            ecran.AllerA(DelegationScreenController.EtatEcran.Reserve);
            yield return null;

            Assert.AreEqual(8, DelegationCatalogue.Reserve.Length,
                "le catalogue serveur en déclare huit hors LIVE (3, 6, 7, 101..105)");
            string tout = TexteDeLEcran();
            foreach (var c in DelegationCatalogue.Reserve)
                StringAssert.Contains(c.libelle, tout, $"la réserve n'affiche pas « {c.libelle} »");
            StringAssert.Contains("personne n'y touche encore", tout);
        }

        private static string TexteDeLEcran()
        {
            var sb = new System.Text.StringBuilder();
            GameObject r = GameObject.Find("DelegationRoot");
            Assert.IsNotNull(r, "DelegationRoot introuvable");
            foreach (TMPro.TextMeshProUGUI t in r.GetComponentsInChildren<TMPro.TextMeshProUGUI>(true))
                sb.Append(t.text).Append('\n');
            return sb.ToString();
        }
    }
}
