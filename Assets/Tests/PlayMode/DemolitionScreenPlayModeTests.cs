using System.Collections;
using System.Collections.Generic;
using System.Linq;
using NUnit.Framework;
using UnityEngine;
using UnityEngine.UI;
using UnityEngine.TestTools;
using MafiaCleanCity.Operational;
using Object = UnityEngine.Object;

namespace MafiaCleanCity.Operational.Tests
{
    /// <summary>ecran_demolition « La démolition » — squelette de suite généré par Tools/nouvel-ecran.py.
    ///
    /// ⛔ CE QUE CE SQUELETTE COUVRE : le montage structurel (CanvasRenderer, MaskableGraphic) et
    /// la capture pour le juge visuel. ⛔ CE QU'IL NE COUVRE PAS, et c'est // MÉTIER ICI partout
    /// où il manque : le PARCOURS joueur qui atteint cet écran (doctrine 4-couches, `CLAUDE.md`
    /// § « quatre couches ») — signup → `session/open` → la route, jamais un seed SQL sans le
    /// dire dans le nom du test. Le patron complet est `ReputationScreenPlayModeTests` (㊲,
    /// `pilote-B`) : `OuvrirJoueurFrais()` (signup + `session/close` défensif + lecture d'un
    /// lieutenant du kit de départ) — à adapter ici selon ce que `GetFrictionState` exige
    /// réellement comme précondition.</summary>
    // ⛔ `EcranDemolition` est posée TEST PAR TEST, pas sur la classe (lot de classe du 2026-09-24) : posée sur la classe, elle emportait la
    // capture (Cliche…) avec l'écran — une capture exige l'identité de capture et écrit des PNG. La capture ne porte que sa catégorie.
    public class DemolitionScreenPlayModeTests
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
            MafiaCleanCity.CityMap.DemoIdentityResolver.SortirModeCapture(GetType().Name);   // mode capture levé en fin de test (voie 1, 22/09)
            MafiaCleanCity.Shell.JetonDeStructure.OublierPourTest();
            GameObject reste = GameObject.Find("DemolitionRoot");
            while (reste != null) { Object.DestroyImmediate(reste); reste = GameObject.Find("DemolitionRoot"); }
            if (hostGo != null) Object.Destroy(hostGo);
            hostGo = null;
        }

        /// <summary>La racine RÉELLE de l'écran n'est PAS `hostGo` : hors shell, le contrôleur
        /// découvre un Canvas et bâtit dessous (patron ㊲, ligne pour ligne). Chercher
        /// `hostGo.GetComponentsInChildren` rendrait ZÉRO en silence.</summary>
        private GameObject RacineEcran()
        {
            GameObject r = GameObject.Find("DemolitionRoot");
            Assert.IsNotNull(r, "DemolitionRoot introuvable : le contrôleur n'a pas construit sa " +
                                "mise en page (ni sous mountParent, ni sous un Canvas découvert)");
            return r;
        }

        private DemolitionScreenController MonterEcran()
        {
            hostGo = new GameObject("DemolitionScreen", typeof(RectTransform));
            var ecran = hostGo.AddComponent<DemolitionScreenController>();
            return ecran;
        }

        // ═══ 1. GARDE STRUCTURELLE — ne lit aucun pixel, ne dépend d'aucune résolution ═══════

        /// <summary>⛔ TOUT `Graphic` PORTE SON `CanvasRenderer`, et TOUT Graphic sous ce fond
        /// est `MaskableGraphic` (donc masquable par un futur `Mask` parent) — patron ㊲, garde
        /// structurelle AVANT toute garde de valeur (c'est celle qui a fermé la classe
        /// "occlusion par fratrie" en 12 lignes là où 4 tours de gardes pixel n'y voyaient rien).
        ///
        /// ⚠️ Anti-vacuité : `AddComponent<DemolitionScreenController>()` seul construit déjà le
        /// fond de `BuildLayout()` (appelé depuis `Awake()`), donc CETTE garde mord même sur le
        /// squelette non rempli — au moins 1 Graphic (le fond). Une fois le MÉTIER ICI de
        /// `BuildLayout()` rempli, relever le plancher `Assert.Greater(comptes, 1, ...)` vers une
        /// valeur qui reflète le contenu réel (㊲ l'a posé à 10).</summary>
        [UnityTest]
        [Category("EcranDemolition")]
        public IEnumerator EcranDemolitionS1_ToutGraphic_PorteSonCanvasRenderer()
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
        /// <summary>Capture authentifiée du contenu, pas seulement de sa charpente. Avant TD-541,
        /// `MonterEcran()` ne donnait aucun jeton : l'amorce sortait sans requête et la caméra
        /// photographiait un fond uniforme. Le test signe désormais avec l'identité de campagne,
        /// exige la friction servie et un rendu abouti, puis seulement écrit les PNG. Mesure du
        /// correctif : 3,270 % et 3,209 % d'encre, contre 0,000 % auparavant.</summary>
        [UnityTest, Category("ClicheDemolition")]
        public IEnumerator EcranDemolitionC1_CapturerPourLeJugeVisuel_DeuxResolutions()
        {
            var auth = new MafiaCleanCity.CityMap.AuthClient { BaseUrl = MafiaCleanCity.AdresseDuBack.Url };
            string token = null, erreurConnexion = null;
            var (identifiant, motDePasse) =
                MafiaCleanCity.Shell.Tests.CaptureSousShell.IdentiteDeCaptureOuEchoue("ecran_demolition");
            yield return auth.SignIn(identifiant, motDePasse,
                t => token = t, e => erreurConnexion = e);
            Assert.IsNull(erreurConnexion, $"connexion au compte de capture échouée : {erreurConnexion}");
            // garde d'EFFET (22/09, « toute planche porte la preuve de l'effet ») — `GET /v1/me` avec le jeton réellement utilisé,
            // confronté à l'identité annoncée, AVANT tout PNG.
            yield return MafiaCleanCity.Shell.Tests.CaptureSousShell.IdentiteConnecteeOuEchoue(token, identifiant, "ecran_demolition");

            var ecran = MonterEcran();
            // Laisser Start constater l'absence de jeton, puis déclencher exactement UN chargement.
            yield return null;
            ecran.SetToken(token);
            yield return ecran.Charger();
            yield return null;

            Assert.IsNull(ecran.DerniereErreur,
                $"la route a échoué ({ecran.DerniereErreur}) : la capture montrerait " +
                "l'état d'indisponibilité, pas la démolition");
            Assert.IsNotNull(ecran.DerniereFriction, "aucun corps de friction reçu — rien à photographier");
            Assert.Greater(ecran.RendusEffectues, 0, "le corps est arrivé mais aucun rendu n'a abouti");

            yield return CapturerA(1080, 1920, "Assets/Screenshots/ecran_demolition_1080x1920.png");
            yield return CapturerA(1080, 2400, "Assets/Screenshots/ecran_demolition_1080x2400.png");
        }

        private IEnumerator CapturerA(int largeur, int hauteur, string chemin)
        {
            GameObject racine = RacineEcran();
            Canvas canvas = racine.GetComponentInParent<Canvas>();
            Assert.IsNotNull(canvas, "DemolitionRoot n'est sous aucun Canvas : rien ne peut être rendu");

            RenderMode modeAvant = canvas.renderMode;
            Camera cameraAvant = canvas.worldCamera;
            float planAvant = canvas.planeDistance;

            var rt = new RenderTexture(largeur, hauteur, 24, RenderTextureFormat.ARGB32);
            var camGo = new GameObject("CaptureCamEcranDemolition");
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

        // ═══ La ligne de site (㉝·80) — la décision de mise en page, falsifiable ════════════════

        [Test]
        [Category("EcranDemolition")]
        public void LigneDeSite_LEnseigneEstLeTitre_EtLeLieuVaEnSousLigne()
        {
            var b = new DistrictBuildingDto
            {
                building = "x", block_id = 1604, operational_type = "lab", district_name = "Les Friches",
                name_i18n = new BuildingNameI18nDto
                {
                    key = "game.fiction.building.name",
                    @params = new BuildingNameParamsDto { enseigne = "Imprimerie Skeld" },
                },
            };
            Assert.AreEqual("Imprimerie Skeld", DemolitionScreenController.NomDuSite(b),
                "le titre reste l'enseigne : « {enseigne} — {district}, îlot {n} » en titre ferait 41 caractères " +
                "à 9 px serif gras dans ~200 px et déborderait sur les enseignes longues");
            Assert.AreEqual("Les Friches, îlot 1604", DemolitionScreenController.LieuDuSite(b),
                "le lieu (㉝·80) passe en sous-ligne, devant le verdict");
            var sans = new DistrictBuildingDto { building = "y", block_id = 7, operational_type = "stash", district_name = "La Chancellerie" };
            Assert.AreEqual("Local sans enseigne — La Chancellerie, îlot 7", DemolitionScreenController.NomDuSite(sans), "le repli ratifié porte le lieu");
            Assert.AreEqual("", DemolitionScreenController.LieuDuSite(sans), "le titre de repli porte déjà le lieu : rien en sous-ligne");
            Assert.AreEqual("Local sans enseigne — îlot 7", DemolitionScreenController.NomDuSite(new DistrictBuildingDto { building = "z", block_id = 7 }),
                "sans district servi, l'îlot seul — jamais un district inventé");
        }

        // ═══ Le défilement (f2 08/10, E06 du créneau groupé) — l'EFFET, sur une liste qui déborde vraiment ═══════════════════

        /// <summary>« Le contenu dépasse mais le défilement ne déplace rien » (E06, 08/10) était une mesure prise HORS du régime de capture : sur compte
        /// neuf, les 4 sites TIENNENT à 1080×1920 et 1080×2400. Ce que le joueur réel peut avoir — « le monde réel en a dix-sept » (`ConstruireZoneCentrale`)
        /// — est fabriqué ici : 17 sites, état léger. EFFET : la fenêtre a une hauteur positive, le contenu la dépasse, le ScrollRect le remonte de TOUTE
        /// sa course et le 17ᵉ site entre dans la fenêtre — aucun site injoignable sous la coupe.</summary>
        [UnityTest]
        [Category("EcranDemolition")]
        public IEnumerator Fabrique_DixSeptSites_LaListeDefileJusquAuBout_LeDernierSiteEntreDansLaFenetre()
        {
            const int n = 17;
            var sites = Enumerable.Range(1, n).Select(i => new DistrictBuildingDto
            {
                building = "b" + i, block_id = 1500 + i, operational_type = "lab", district_name = "La Lisière",
            }).ToArray();
            var ecran = MonterEcran();
            ecran.RendrePourTest(new GetFrictionStateResponseDto { friction_bucket = "light", friction_node_count = 0 }, batiments: sites);
            yield return null;
            yield return null;
            GameObject racine = RacineEcran();
            Assert.Greater(ecran.RendusEffectues, 0, "anti-vacuité : l'écran a rendu");
            var listes = racine.GetComponentsInChildren<MafiaCleanCity.Shell.ListeDefilante>(false);
            Assert.AreEqual(1, listes.Length, "une seule liste défilante : la zone centrale");
            Transform dernier = racine.GetComponentsInChildren<Transform>(true).FirstOrDefault(t => t.name == "Site_" + (1500 + n));
            Assert.IsNotNull(dernier, $"Site_{1500 + n} introuvable : les {n} sites ne sont pas tous rendus");
            var c = MafiaCleanCity.CityMap.Tests.ListeDefilantePlayModeTests.DefilerJusquAuBout(listes[0], (RectTransform)dernier);
            Assert.Greater(c.Fenetre, 0f, $"la fenêtre a une hauteur positive ({c.Fenetre:0.#} u)");
            Assert.IsTrue(c.Deborde, $"anti-vacuité : {n} sites débordent (fenêtre {c.Fenetre:0.#} u, contenu {c.Contenu:0.#} u)");
            Assert.IsTrue(c.AtteintLeBout, $"le ScrollRect remonte la liste de {c.Remontee:0.#} u sur une course de {c.Attendue:0.#}");
            Assert.IsTrue(c.DernierVisible, $"le {n}ᵉ site entre dans la fenêtre au bout de la course");
        }
    }
}
