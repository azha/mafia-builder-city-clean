using System.Collections;
using System.Collections.Generic;
using NUnit.Framework;
using UnityEngine;
using UnityEngine.UI;
using UnityEngine.TestTools;
using MafiaCleanCity.Operational;
using MafiaCleanCity.Tests;   // SeederSupport.SafeCallsign
using MafiaCleanCity.Theme;
using Object = UnityEngine.Object;

namespace MafiaCleanCity.Operational.Tests
{
    /// <summary>screen_c1 « Journal » — squelette de suite généré par Tools/nouvel-ecran.py.
    ///
    /// ⛔ CE QUE CE SQUELETTE COUVRE : le montage structurel (CanvasRenderer, MaskableGraphic) et
    /// la capture pour le juge visuel. ⛔ CE QU'IL NE COUVRE PAS, et c'est // MÉTIER ICI partout
    /// où il manque : le PARCOURS joueur qui atteint cet écran (doctrine 4-couches, `CLAUDE.md`
    /// § « quatre couches ») — signup → `session/open` → la route, jamais un seed SQL sans le
    /// dire dans le nom du test. Le patron complet est `ReputationScreenPlayModeTests` (㊲,
    /// `pilote-B`) : `OuvrirJoueurFrais()` (signup + `session/close` défensif + lecture d'un
    /// lieutenant du kit de départ) — à adapter ici selon ce que `GetNewsFeed` exige
    /// réellement comme précondition.</summary>
    // ⛔ `ScreenC1` est posée TEST PAR TEST, pas sur la classe (lot de classe du 2026-09-24) : posée sur la classe, elle emportait la
    // capture (Cliche…) avec l'écran — une capture exige l'identité de capture et écrit des PNG. La capture ne porte que sa catégorie.
    public class JournalScreenPlayModeTests
    {
        // ⛔ TD-576, CLASSE « CATALOGUE » (2026-09-23) — cette classe charge le catalogue i18n (directement, ou en montant un
        // écran / le shell / la scène du build qui l'amorce) et ne le rendait JAMAIS : global statique, il passait à la classe
        // suivante. Mesuré : le 1er cas d'`ArchetypeServi_…` a hérité d'un bundle réel laissé en amont. Rendu à chaque test ;
        // la garde de sortie de MafiaCI nomme toute classe qui le laisserait encore chargé.
        [TearDown] public void OublierLeCatalogue() => MafiaCleanCity.I18n.I18nCatalog.Oublier();

        private GameObject hostGo;
        private int seq;

        [TearDown]
        public void TearDown()
        {
            MafiaCleanCity.CityMap.DemoIdentityResolver.SortirModeCapture(GetType().Name);   // mode capture levé en fin de test (voie 1, 22/09)
            GameObject reste = GameObject.Find("JournalRoot");
            while (reste != null) { Object.DestroyImmediate(reste); reste = GameObject.Find("JournalRoot"); }
            if (hostGo != null) Object.Destroy(hostGo);
            hostGo = null;
        }

        /// <summary>La racine RÉELLE de l'écran n'est PAS `hostGo` : hors shell, le contrôleur
        /// découvre un Canvas et bâtit dessous (patron ㊲, ligne pour ligne). Chercher
        /// `hostGo.GetComponentsInChildren` rendrait ZÉRO en silence.</summary>
        private GameObject RacineEcran()
        {
            GameObject r = GameObject.Find("JournalRoot");
            Assert.IsNotNull(r, "JournalRoot introuvable : le contrôleur n'a pas construit sa " +
                                "mise en page (ni sous mountParent, ni sous un Canvas découvert)");
            return r;
        }

        private JournalScreenController MonterEcran()
        {
            hostGo = new GameObject("JournalScreen", typeof(RectTransform));
            var ecran = hostGo.AddComponent<JournalScreenController>();
            return ecran;
        }

        // ═══ 1. GARDE STRUCTURELLE — ne lit aucun pixel, ne dépend d'aucune résolution ═══════

        /// <summary>⛔ TOUT `Graphic` PORTE SON `CanvasRenderer`, et TOUT Graphic sous ce fond
        /// est `MaskableGraphic` (donc masquable par un futur `Mask` parent) — patron ㊲, garde
        /// structurelle AVANT toute garde de valeur (c'est celle qui a fermé la classe
        /// "occlusion par fratrie" en 12 lignes là où 4 tours de gardes pixel n'y voyaient rien).
        ///
        /// ⚠️ Anti-vacuité : `AddComponent<JournalScreenController>()` seul construit déjà le
        /// fond de `BuildLayout()` (appelé depuis `Awake()`), donc CETTE garde mord même sur le
        /// squelette non rempli — au moins 1 Graphic (le fond). Une fois le MÉTIER ICI de
        /// `BuildLayout()` rempli, relever le plancher `Assert.Greater(comptes, 1, ...)` vers une
        /// valeur qui reflète le contenu réel (㊲ l'a posé à 10).</summary>
        [UnityTest]
        [Category("ScreenC1")]
        public IEnumerator ScreenC1S1_ToutGraphic_PorteSonCanvasRenderer()
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

            Assert.Greater(comptes, 0,
                "0 Graphic dans l'arbre — l'écran n'a pas été construit, la garde suivante " +
                "serait vraie À VIDE");
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
        // ⛔⛔ LA CATÉGORIE GÉNÉRIQUE DES CAPTURES ÉTAIT CODÉE EN DUR ICI, et ce gabarit produit les 46
        /// écrans restants. Deux défauts d'un coup, à chaque écran généré :
        /// (a) la capture n'était adressable QUE par `Capture`, donc pas isolable de ses soeurs ;
        /// (b) `Capture` fait SIGSEGV dans le pilote Mesa (mesuré dans ce dépôt), donc la seule
        ///     demande qui l'atteignait est aussi celle qui tue le run.
        /// ⇒ Une capture livrée par ce gabarit était **armée et injoignable** — exactement le
        ///   défaut que le chantier joignabilité ferme côté ÉCRANS, ici côté TESTS.
        /// ⚠️ Et le préfixe est `Photo`, pas `Capture` : le filtre d'Unity matche par PRÉFIXE, donc
        ///   `Capture<Ecran>` serait emporté par une demande de `Capture` — le piège qui a mordu
        ///   trois sessions le 2026-09-02 (`["HUD"]`→`HUDv31`, `["CaptureDetail"]`→
        ///   `CaptureDetailMutant`, et ma propre série de noms, refusée par ma propre garde).
        [UnityTest, Category("ClicheC1")]
        public IEnumerator ScreenC1C1_CapturerPourLeJugeVisuel_DeuxResolutions()
        {
            // ⛔⛔ ON SE CONNECTE AU COMPTE SERVI. Cette suite ne s'authentifiait PAS : l'écran
            // était monté sans jeton, `Amorcer()` sortait aussitôt, et la capture photographiait
            // un écran JAMAIS CHARGÉ. Mesuré le 2026-09-04 : 12 des 17 suites de capture de ce
            // dépôt étaient dans ce cas.
            // ★ *Une capture ne mesure pas l'écran : elle mesure l'écran ET le monde qu'on lui a
            //   donné.* Sans données, « cassé » et « correctement vide » rendent la MÊME image.
            // ⚠️ La garde anti-vacuité ci-dessous restait donc satisfaite par la coquille : elle
            //    vérifiait qu'il Y A du texte, sur un écran qui n'avait rien à dire.
            var auth = new MafiaCleanCity.CityMap.AuthClient { BaseUrl = MafiaCleanCity.AdresseDuBack.Url };
            string token = null, err = null;
            // ⛔⛔ LE COMPTE PHOTOGRAPHIÉ VIENT DE LA CAMPAGNE, PLUS D'UN LITTÉRAL. Cette suite
            //    SÈME un compte et en PHOTOGRAPHIE un autre — ce qui n'était pas distinguable tant
            //    qu'un seul nom (`MAFIA_DEMO_IDENTIFIER`) désignait les deux (TD-642/647). Depuis
            //    que le seeder a sa propre variable, le littéral figeait la capture sur le compte
            //    de SEMIS : mesuré le 2026-09-06, `operational_demo` porte **0 lieutenant** quand
            //    le compte de capture en porte 3 — la précondition échouait donc à raison, sur le
            //    mauvais compte. *Une capture doit vérifier le compte qu'elle PHOTOGRAPHIE.*
            //    La paire est EXIGÉE, pas repliée : sans elle la planche montrerait un autre monde
            //    sans que rien dans l'image ne le dise (garde partagée, `CaptureSousShell`).
            var (idCapture, mdpCapture) = MafiaCleanCity.Shell.Tests.CaptureSousShell.IdentiteDeCaptureOuEchoue("screen_c1");
            yield return auth.SignIn(idCapture, mdpCapture,
                                     t => token = t, e => err = e);
            Assert.IsNull(err, $"connexion au compte de démo échouée : {err}");
            // garde d'EFFET (étape 8 du runbook, décision de l'orchestrateur du 22/09 : CONFORME partout) — `GET /v1/me` avec le jeton
            // réellement utilisé, confronté à l'identité annoncée, AVANT tout PNG. `[DemoIdentityResolver]` ne dit que ce que le résolveur a
            // appliqué, pas avec quoi le shell s'est connecté.
            yield return MafiaCleanCity.Shell.Tests.CaptureSousShell.IdentiteConnecteeOuEchoue(token, idCapture, "screen_c1");

            var ecran = MonterEcran();
            ecran.SetToken(token);
            yield return null;
            yield return ecran.Charger();
            yield return null;

            // Le vide RENDU et le vide SUBI ont la même image (patron ㊴).
            Assert.IsNull(ecran.DerniereErreur,
                // ⛔ LE CODE SEUL NE SUFFIT PAS. Première version : elle imprimait « code 422 »
                // et rien d'autre — j'ai dû relancer un run entier pour apprendre POURQUOI.
                // *Une garde qui nomme le symptôme sans le motif coûte un aller-retour à chaque
                // fois qu'elle mord*, et c'est justement quand elle mord qu'on est pressé.
                $"la route a échoué (code {ecran.DernierCodeErreur} — {ecran.DerniereErreur}) : " +
                "la capture montrerait l'état d'indisponibilité, pas le journal");
            Assert.IsNotNull(ecran.DernierChargement, "aucun corps reçu — rien à photographier");

            // ⛔ GARDE ANTI-VACUITÉ — elle manquait, et la PREMIÈRE capture de ㊳ est partie MUETTE :
            // enseigne sans sous-titre, trois « 00 » sans libellé, panneau vide, test VERT.
            // ★ Un PNG d'une coquille est un PNG parfaitement valide. Rien dans le verdict ne
            //   distingue « l'écran s'est dessiné » de « l'écran s'est dessiné et n'a rien à
            //   dire » — seule une garde sur le CONTENU les sépare.
            // ⚠️ On n'exige PAS de données : cet écran est monté sans session, et son état
            //   « pas encore chargé » est légitime. On exige qu'il le DISE.
            var textes = new List<string>();
            foreach (TMPro.TextMeshProUGUI t in RacineEcran()
                         .GetComponentsInChildren<TMPro.TextMeshProUGUI>(true))
                if (!string.IsNullOrWhiteSpace(t.text)) textes.Add(t.name);
            Assert.GreaterOrEqual(textes.Count, 8,
                "㊳ ne pose que " + textes.Count + " texte(s) non vides — la capture montrerait " +
                "une coquille : enseigne, trois compteurs avec leurs libellés et le panneau font " +
                "au moins huit. Vus : [" + string.Join(", ", textes) + "]");

            yield return CapturerA(1080, 1920, "Assets/Screenshots/screen_c1_1080x1920.png");
            yield return CapturerA(1080, 2400, "Assets/Screenshots/screen_c1_1080x2400.png");
        }

        private IEnumerator CapturerA(int largeur, int hauteur, string chemin)
        {
            GameObject racine = RacineEcran();
            Canvas canvas = racine.GetComponentInParent<Canvas>();
            Assert.IsNotNull(canvas, "JournalRoot n'est sous aucun Canvas : rien ne peut être rendu");

            RenderMode modeAvant = canvas.renderMode;
            Camera cameraAvant = canvas.worldCamera;
            float planAvant = canvas.planeDistance;

            var rt = new RenderTexture(largeur, hauteur, 24, RenderTextureFormat.ARGB32);
            var camGo = new GameObject("CaptureCamScreenC1");
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

        // MÉTIER ICI — ajouter ici les tests de PARCOURS (signup → session/open → la route) et
        // les tests d'état (AppliquerEtat sur un corps fabriqué via RendrePourTest), patron ㊲
        // §§ 1/3/5 de ReputationScreenPlayModeTests.

        /// <summary>⛔ UNE FALSIFIABLE PAR VALEUR SERVIE (22/09) : les cinq `phase_band` du back (`random-world.projection.service.ts:47`)
        /// rendent chacune un texte NON VIDE et DIFFÉRENT de la valeur brute. Avant : `onset` et `receding` sortaient bruts — le client
        /// testait `starting` et `settling`, que le back ne sert pas.</summary>
        [Test]
        [Category("ScreenC1")]
        public void ScreenC1_ChaquePhaseServie_RendUnTexte()
        {
            foreach (string v in new[] { "onset", "unfolding", "receding", "lingering", "permanent" })
            {
                string texte = JournalScreenController.PhaseEnMots(v);
                Assert.IsFalse(string.IsNullOrWhiteSpace(texte), $"« {v} » rend un texte vide");
                Assert.AreNotEqual(v, texte, $"« {v} » sort BRUTE : aucune correspondance pour une phase que le back sert");
            }
            Assert.AreEqual("settling", JournalScreenController.PhaseEnMots("settling"),
                "« settling » n'est PAS une phase (c'est une récence) : il doit sortir brut, pas passer pour « ça retombe »");
        }

        // ═══ C2 (passe UX 2026-09-24) — le journal écrit ses brèves ═════════════════════════════
        // Les titres étaient des CLÉS, et le panneau disait « aucune de ces brèves n'a de texte » alors que le bundle fr porte les
        // 25 clés servies. Corps fabriqués sur le corps réel (`corps/014`, pile dev @66060cc1) ; bundle injecté, aucun réseau.

        private static NewsBeatDto BreveTilbey(string cleTitre) => new NewsBeatDto
        {
            beat_id = "b-1", headline_i18n_key = cleTitre, outlet_i18n_key = "press.outlet.tilbey_weekly.name",
            category = "brennar_local", district = "district-16", recency_band = "fresh",
            headline_params = new HeadlineParamsDto
            {
                outlet = "press.outlet.tilbey_weekly.name", subject = "ambient.micro_event.noisy_block", district = "district-16",
            },
        };

        private static List<string> TextesRendus(GameObject racine)
        {
            var t = new List<string>();
            foreach (TMPro.TextMeshProUGUI x in racine.GetComponentsInChildren<TMPro.TextMeshProUGUI>(true))
                if (x.gameObject.activeInHierarchy && !string.IsNullOrEmpty(x.text)) t.Add(x.text);
            return t;
        }

        [Test]
        [Category("ScreenC1")]
        public void C2_LesTitresServisSontEcrits_LeQuartierNomme_EtLePanneauSeTait()
        {
            MafiaCleanCity.I18n.I18nCatalog.ChargerPourTest("fr", new Dictionary<string, string>
            {
                { "news_beat.digest.ambient_micro.tilbey_weekly.headline", "Petites nouvelles de {district}, qui restent des nouvelles" },
                { "press.outlet.tilbey_weekly.name", "The Tilbey Weekly" },
                { "ambient.micro_event.noisy_block", "un pâté de maisons bruyant" },
            });
            JournalScreenController ecran = MonterEcran();
            ecran.PoserQuartiersPourTest(new[] { new WorldDistrictDto { id = 16, name = "La Lisière", name_canonical = "Verge-A" } });
            ecran.RendrePourTest(new GetNewsFeedResponseDto
                { beats = new[] { BreveTilbey("news_beat.digest.ambient_micro.tilbey_weekly.headline") } });

            List<string> textes = TextesRendus(RacineEcran());
            CollectionAssert.Contains(textes, "Petites nouvelles de La Lisière, qui restent des nouvelles", string.Join(" | ", textes));
            CollectionAssert.Contains(textes, "The Tilbey Weekly", "le journal par son nom, pas par sa clé");
            Assert.IsTrue(textes.Exists(x => x.StartsWith("La Lisière", System.StringComparison.Ordinal)),
                "sous le titre, le quartier par son nom de fiction");
            Assert.IsFalse(textes.Exists(x => x.Contains("news_beat.") || x.Contains("press.outlet.") || x.Contains("district-16")),
                "aucune clé ni slug à l'écran : " + string.Join(" | ", textes));
            // ㊳ (§G, 26/09) : la fraîcheur en mots (table 49), jamais la bande brute
            // ㊳ A3/B2 (08/10) : le quartier sous le titre, l'horodatage dans l'EN-TÊTE à droite — plus fondus dans une même ligne grise
            CollectionAssert.Contains(textes, "La Lisière", string.Join(" | ", textes));
            CollectionAssert.Contains(textes, "ce matin", string.Join(" | ", textes));
            Assert.IsFalse(textes.Exists(x => x.Contains("La Lisière · ce matin")), "l'horodatage n'est plus fondu dans le sous-titre : " + string.Join(" | ", textes));
            Assert.IsFalse(textes.Exists(x => x.Contains("fresh")), "« fresh » brut : " + string.Join(" | ", textes));
            Assert.AreEqual(0, ecran.LignesSansTexte);
            Assert.IsFalse(textes.Exists(x => x.Contains("n'a de texte") || x.Contains("sans leur texte") || x.Contains("sans son texte")),
                "tout est écrit : le panneau ne prétend plus le contraire");
        }

        [Test]
        [Category("ScreenC1")]
        public void C2_UneCleSansTexte_EstMontree_EtLePanneauLaCompte()
        {
            MafiaCleanCity.I18n.I18nCatalog.ChargerPourTest("fr", new Dictionary<string, string>
            {
                { "news_beat.digest.ambient_micro.tilbey_weekly.headline", "Petites nouvelles de {district}, qui restent des nouvelles" },
                { "press.outlet.tilbey_weekly.name", "The Tilbey Weekly" },
            });
            JournalScreenController ecran = MonterEcran();
            ecran.RendrePourTest(new GetNewsFeedResponseDto
            {
                beats = new[]
                {
                    BreveTilbey("news_beat.digest.ambient_micro.tilbey_weekly.headline"),
                    BreveTilbey("news_beat.cle_que_le_bundle_ne_porte_pas.headline"),
                },
            });

            List<string> textes = TextesRendus(RacineEcran());
            Assert.AreEqual(1, ecran.LignesSansTexte);
            CollectionAssert.Contains(textes, "news_beat.cle_que_le_bundle_ne_porte_pas.headline", "sans texte, la clé reste la seule vérité");
            CollectionAssert.Contains(textes, "Petites nouvelles de quartier 16, qui restent des nouvelles",
                "sans les quartiers (route non arrivée), « quartier 16 » plutôt que le slug");
            CollectionAssert.Contains(textes, "Une brève est arrivée sans son texte", "le panneau compte le trou, il ne le généralise pas");
        }

        // ═══ ㊳ A3 / B2 (juge du 07/10, corrigés le 08/10) — la carte « à la une » et la brève de la rue ═══════════════════════════════
        // Gardes d'EFFET : elles lisent les rects RENDUS (mise en page forcée), pas les paramètres posés — un réglage valide peut ne rien produire.

        private static Transform Trouver(Transform racine, string nom)
        {
            foreach (Transform t in racine.GetComponentsInChildren<Transform>(true))
                if (t.name == nom) return t;
            return null;
        }

        private static IEnumerator MettreEnPage()
        {
            yield return null;
            yield return null;
            Canvas.ForceUpdateCanvases();
        }

        private static Rect Monde(RectTransform rt)
        {
            var c = new Vector3[4];
            rt.GetWorldCorners(c);
            return Rect.MinMaxRect(c[0].x, c[0].y, c[2].x, c[2].y);
        }

        [UnityTest]
        [Category("ScreenC1")]
        public IEnumerator A3_LaCarteALaUne_EnTeteFiletOrEtHorodatageADroite()
        {
            MafiaCleanCity.I18n.I18nCatalog.ChargerPourTest("fr", new Dictionary<string, string>
            {
                { "news_beat.digest.ambient_micro.tilbey_weekly.headline", "Petites nouvelles de {district}, qui restent des nouvelles" },
                { "press.outlet.tilbey_weekly.name", "Le Clairon de Brennar" },
                { "ambient.micro_event.noisy_block", "un pâté de maisons bruyant" },
                { "press.frame.fait_divers", "fait divers" },
            });
            JournalScreenController ecran = MonterEcran();
            ecran.PoserQuartiersPourTest(new[] { new WorldDistrictDto { id = 16, name = "La Lisière", name_canonical = "Verge-A" } });
            NewsBeatDto sans = BreveTilbey("news_beat.digest.ambient_micro.tilbey_weekly.headline");
            NewsBeatDto avec = BreveTilbey("news_beat.digest.ambient_micro.tilbey_weekly.headline");
            avec.frame_tag_i18n_key = "press.frame.fait_divers";
            ecran.RendrePourTest(new GetNewsFeedResponseDto { beats = new[] { sans, avec } });
            yield return MettreEnPage();

            Transform racine = RacineEcran().transform;
            var unes = new List<Transform>();
            foreach (Transform t in racine.GetComponentsInChildren<Transform>(true)) if (t.name == "Une") unes.Add(t);
            Assert.AreEqual(2, unes.Count, "une carte par brève");
            Transform une = unes[0];

            // l'ordre de fratrie : en-tête, filet laiton, titre, quartier
            var ordre = new List<string>();
            foreach (Transform enfant in une) if (enfant.name != "Espace" && enfant.name != MafiaCleanCity.Shell.Filets.NomConteneur) ordre.Add(enfant.name);   // `Filets.Poser` pose son conteneur en 1er enfant
            CollectionAssert.AreEqual(new[] { "Jrn", "FiletOr", "Titre", "Cle" }, ordre, "A3 : en-tête, filet d'or, titre, quartier");

            var nom = Trouver(une, "Journal").GetComponent<TMPro.TextMeshProUGUI>();
            var quand = Trouver(une, "Quand").GetComponent<TMPro.TextMeshProUGUI>();
            Assert.AreEqual("Le Clairon de Brennar", nom.text, "le journal par son nom servi");
            Assert.IsTrue((nom.fontStyle & TMPro.FontStyles.UpperCase) != 0 && (nom.fontStyle & TMPro.FontStyles.Bold) != 0, "capitales, gras (`.jrn b`)");
            Assert.AreEqual(DesignTokens.Current.hudMoneyGold, nom.color, "le nom du journal est or (#f2c96b)");
            Assert.AreEqual("ce matin", quand.text);
            Assert.AreEqual(20f, nom.characterSpacing, "`.jrn b{letter-spacing:.2em}`");
            Assert.IsTrue((quand.fontStyle & TMPro.FontStyles.UpperCase) != 0 && (quand.fontStyle & TMPro.FontStyles.Bold) != 0, "horodatage : capitales, gras (`.une .jrn span`)");
            Assert.AreEqual(13f, quand.characterSpacing, "`.une .jrn span{letter-spacing:.13em}`");

            Rect rUne = Monde((RectTransform)une), rNom = Monde(nom.rectTransform), rQuand = Monde(quand.rectTransform);
            Rect rFiletOr = Monde((RectTransform)Trouver(une, "FiletOr"));
            Assert.Greater(rQuand.center.x, rNom.center.x, "A3 : l'horodatage est À DROITE du nom du journal");
            Assert.Less(rQuand.xMax, rUne.xMax, "…dans la carte (marge intérieure)");
            Assert.Greater(rNom.xMin, rUne.xMin, "…le nom dans la marge gauche");
            Assert.Greater(rFiletOr.height, 0.4f, "A3 : le filet d'or a une épaisseur RENDUE (pas un réglage sans pixel)");
            Assert.Greater(rFiletOr.width, rUne.width * 0.8f, "…et court sur la largeur de la carte");
            Assert.Less(rFiletOr.center.y, rNom.center.y, "…SOUS l'en-tête");
            Image filet = Trouver(une, "FiletOr").GetComponent<Image>();
            Assert.AreEqual(DesignTokens.Current.hudHairlineGold, filet.color, "le filet est le laiton #b08d3e");
            Assert.IsNotNull(filet.GetComponent<CanvasRenderer>());

            Assert.AreEqual("La Lisière", Trouver(une, "Cle").GetComponent<TMPro.TextMeshProUGUI>().text, "le quartier seul sous le titre");
            Assert.IsNull(Trouver(unes[0], "Angle"), "pas d'étiquette de cadre servie ⇒ rien d'inventé");
            Transform angle = Trouver(unes[1], "Angle");
            Assert.IsNotNull(angle, "étiquette de cadre servie ⇒ l'étiquette d'angle (`.angle`)");
            Assert.AreEqual("fait divers", angle.GetComponentInChildren<TMPro.TextMeshProUGUI>().text);
            Assert.Less(Monde((RectTransform)angle).width, Monde((RectTransform)unes[1]).width * 0.5f, "l'étiquette est `inline-block` : elle ne s'étire pas");
        }

        [UnityTest]
        [Category("ScreenC1")]
        public IEnumerator B2_LaBreveDeLaRue_PointEtHorodatageDeLaMemeEncre_HorodatageADroiteCentre()
        {
            MafiaCleanCity.I18n.I18nCatalog.ChargerPourTest("fr", new Dictionary<string, string>
            {
                { "ambient.queue_pharmacy", "Une file devant la pharmacie" },
                { "ambient.church_closed", "Le curé a fermé sa porte" },
            });
            JournalScreenController ecran = MonterEcran();
            ecran.PoserQuartiersPourTest(new[] { new WorldDistrictDto { id = 16, name = "La Lisière", name_canonical = "Verge-A" } });
            ecran.PoserLaRuePourTest(new GetAmbientFeedResponseDto
            {
                events = new[]
                {
                    new AmbientEventDto { descriptor_i18n_key = "ambient.queue_pharmacy", district = "district-16", recency_band = "fresh" },
                    new AmbientEventDto { descriptor_i18n_key = "ambient.church_closed", district = "district-16", recency_band = "settling" },
                },
            });
            ecran.RendrePourTest(new GetNewsFeedResponseDto { beats = new NewsBeatDto[0] });
            yield return MettreEnPage();

            var breves = new List<Transform>();
            foreach (Transform t in RacineEcran().transform.GetComponentsInChildren<Transform>(true)) if (t.name == "Breve") breves.Add(t);
            Assert.AreEqual(2, breves.Count, "une brève par évènement de la rue");

            Color[] attendu = { DesignTokens.Current.hudMoneyGold, DesignTokens.Current.hudCremeSecondary };
            string[] mots = { "ce matin", "hier" };
            for (int i = 0; i < 2; i++)
            {
                Transform b = breves[i];
                Image point = Trouver(b, "Point").GetComponent<Image>();
                var quand = Trouver(b, "Quand").GetComponent<TMPro.TextMeshProUGUI>();
                Assert.AreEqual(mots[i], quand.text);
                Assert.AreEqual(attendu[i], point.color, "le point porte l'encre de la fraîcheur");
                Assert.AreEqual(attendu[i], quand.color, "B2 : l'horodatage porte la MÊME encre que le point");
                Assert.IsTrue((quand.fontStyle & TMPro.FontStyles.UpperCase) != 0, "B2 : l'horodatage est en CAPITALES (le juge : « en bas de casse »)");
                Assert.AreEqual(10f, quand.characterSpacing, "B2 : lettré (`.qd{letter-spacing:.1em}`)");
                Assert.IsNotNull(point.sprite, "le point est un disque");
                Texture2D disque = point.sprite.texture;   // l'EFFET : opaque au centre, transparent au coin
                Assert.Greater(disque.GetPixel(disque.width / 2, disque.height / 2).a, 0.9f, "le point est plein au centre");
                Assert.Less(disque.GetPixel(0, 0).a, 0.1f, "…et rond : le coin est transparent");

                Rect rb = Monde((RectTransform)b), rp = Monde(point.rectTransform), rq = Monde(quand.rectTransform), rt = Monde((RectTransform)Trouver(b, "Corps"));
                Assert.Greater(rp.width, 0.4f, "le point a une taille RENDUE");
                Assert.AreEqual(rp.width, rp.height, 0.5f, "…carré (donc rond)");
                Assert.Greater(rq.center.x, rt.center.x, "B2 : l'horodatage est dans la colonne de DROITE, pas fondu sous le titre");
                Assert.Less(rq.xMax, rb.xMax, "…dans la brève");
                Assert.GreaterOrEqual(((RectTransform)Trouver(b, "QuandCol")).rect.width, quand.GetPreferredValues().x - 0.01f,
                    "B2 : la colonne garde la largeur de son texte (`.qd{flex:none}`)");
                Assert.Greater(rp.center.y, rb.center.y, "le point est en haut (`margin-top:3px`)");
                Assert.AreEqual(rb.center.y, rq.center.y, rb.height * 0.2f, "l'horodatage est centré sur la hauteur (`align-self:center`)");
                var cle = Trouver(b, "Cle").GetComponent<TMPro.TextMeshProUGUI>();
                Assert.AreEqual("La Lisière", cle.text, "le quartier sous le titre, sans l'horodatage");
            }
        }

        [Test]
        [Category("ScreenC1")]
        public void C2_NomDuQuartier_SlugNomDeCodeEtTexteLibre()
        {
            var q = new[] { new WorldDistrictDto { id = 3, name = "", name_canonical = "Stack-2" }, new WorldDistrictDto { id = 16, name = "La Lisière" } };
            Assert.AreEqual("La Lisière", JournalScreenController.NomDuQuartier("district-16", q));
            Assert.AreEqual("Stack-2", JournalScreenController.NomDuQuartier("district-3", q), "sans nom de fiction, le nom de code");
            Assert.AreEqual("quartier 7", JournalScreenController.NomDuQuartier("district-7", q));
            Assert.AreEqual("Brennar", JournalScreenController.NomDuQuartier("Brennar", q), "pas un slug : rendu tel quel");
            Assert.AreEqual("district-x", JournalScreenController.NomDuQuartier("district-x", null));
        }
    }
}