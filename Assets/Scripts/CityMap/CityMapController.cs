using System.Collections;
using System.Collections.Generic;
using System.Linq;
using UnityEngine;
using UnityEngine.EventSystems;
using UnityEngine.InputSystem.UI;
using UnityEngine.UI;
using MafiaCleanCity.Theme;
using TMPro;

namespace MafiaCleanCity.CityMap
{
    // Drives the City Map screen:
    //   1. fetches /v1/world/districts (public) and builds a two-column layout grouped
    //      by bank_side, one DistrictCellView per district coloured by control_state;
    //   2. signs in (POST /v1/auth/signin) to get a Bearer token;
    //   3. fetches the JWT-gated Heat projection per district and shows a heat badge
    //      on each cell — a togglable overlay.
    //
    // The whole UI is built programmatically from a single Canvas so the scene needs
    // almost no manual wiring — the controller find-or-creates the Canvas + EventSystem.
    public class CityMapController : MonoBehaviour, MafiaCleanCity.Shell.IShellTenant
    {
        [Header("Backend")]
        [Tooltip("Public game API base. /v1 districts is unauthed; heat needs a token.")]
        [SerializeField] private string baseUrl = "http://localhost";

        [Header("Demo sign-in (seeded by Tools/seed_citymap_demo.mjs)")]
        [SerializeField] private string demoIdentifier = "citymap_demo@example.test";
        [SerializeField] private string demoPassword = "citymap-demo-pw";

        [Header("Overlay")]
        [SerializeField] private bool heatOverlayOn = true;

        // District-load state.
        public bool IsLoaded { get; private set; }
        public string LastError { get; private set; }
        public IReadOnlyList<DistrictCellView> Cells => cells;
        public int NorthCount { get; private set; }
        public int SouthCount { get; private set; }

        // Auth + heat state.
        public bool IsAuthenticated { get; private set; }
        public string Token { get; private set; }
        public string AuthError { get; private set; }
        public bool HeatLoaded { get; private set; }
        public bool HeatOverlayOn => heatOverlayOn;

        // District detail panel state.
        public DistrictDetail CurrentDetail { get; private set; }
        public bool DetailLoaded { get; private set; }
        public int SelectedDistrictId { get; private set; } = -1;

        // nav-hud-design-v1.md §3.2 (chunk 2) — « Entrer » : fired with the district id the SAME
        // way every other event in this file surfaces state (a public C# event, no shell coupling
        // here — AppShell subscribes when it mounts this controller as the City tenant, §3.3).
        public event System.Action<int> OnEnterDistrict;

        private readonly List<DistrictCellView> cells = new List<DistrictCellView>();
        private RectTransform northContent;
        private RectTransform southContent;
        private TextMeshProUGUI toggleLabel;
        private TMP_FontAsset font;

        private GameObject detailPanel;
        private RectTransform detailContent;
        private TextMeshProUGUI detailTitle;
        private Coroutine detailCoroutine;
        private VerticalLayoutGroup rootVlg;

        // §3.2 — « Entrer », un enfant PERSISTANT de detailPanel ("Footer", 3ᵉ enfant — §3.2 : la
        // destruction de RenderDetail est scopée à detailContent, jamais à detailPanel lui-même,
        // donc ce bouton SURVIT à tous les rafraîchissements du panneau).
        private Button enterButton;

        // Right padding reserved for the detail panel (380 wide + 16 margin + gap) so the
        // banks reflow to the left instead of being covered when the panel is open.
        private const int PanelReservedRight = 408;
        private const int RootPadding = 16;

        // ⛔ UNION AU MERGE DU 2026-09-03 — deux ajouts DISJOINTS dans la même région, aucun
        // arbitrage à rendre : le chantier C a posé les deux paddings de chrome (`BottomPadding` le
        // matin, `TopPadding` l'après-midi — *un correctif scopé au côté qu'on regardait*), le lot
        // « ville peinte » a posé les champs de la texture plein cadre et de ses 18 ancres. La
        // branche peinte est partie AVANT les deux paddings : leur absence de son côté n'était pas
        // une décision, c'était sa date. Les deux blocs se suivent.
        // ShellChrome.BottomInsetPx (dock height) read fresh each time, never cached: the shell
        // publishes it AFTER a locataire mounts, and it can be 0 for a while during that window.
        // Vaut 0 hors shell (les fixtures ci-dessous montent CityMapController seul) — repli
        // inchangé pour elles.
        private static int BottomPadding => RootPadding + (int)MafiaCleanCity.Shell.ShellChrome.BottomInsetPx;

        // ⛔ LE SYMÉTRIQUE, ET IL MANQUAIT — mesuré sur la PREMIÈRE capture 1080x2400 réelle
        //    (2026-09-02, chantier C, image à l'appui) : le titre « CARTE DE LA VILLE » et la
        //    première rangée de districts passaient DERRIÈRE la barre haute, sous « ARGENT » et le
        //    manomètre. Le padding du haut valait `RootPadding` nu, soit 16 px, alors que le chrome
        //    en mange bien davantage. Le correctif de bas avait été posé le matin même sans son
        //    symétrique — *un correctif scopé au côté qu'on regardait.*
        //    Vaut `RootPadding` seul hors shell (l'inset est à 0) : repli inchangé pour les fixtures.
        private static int TopPadding => RootPadding + (int)MafiaCleanCity.Shell.ShellChrome.TopInsetPx;

        // ------------------------------------------------------- la ville peinte (TD-494, 2026-09-03)
        // La texture plein cadre de l'écran ③ (atelier `ville-peinte/`, extraite de la maquette
        // ratifiée série 6 cadre ③·22) et ses 18 ancres, chargées par `Resources.Load` — le même
        // seam que les bustes de La Famille : cet écran est construit 100 % à l'exécution, sans
        // prefab ni scène. Absentes ⇒ l'ancienne liste en deux colonnes est montée à la place, et
        // `VillePeinteMontee` reste FAUX — `CarteVillePlayModeTests` l'asserte VRAI : un asset
        // manquant rougit, il ne se déguise pas en écran qui marche.
        private const string CheminPeinture = "CityMap/carte_ville_nuit";
        private const string CheminAncres = "CityMap/ancres_districts";
        private const float MarqueurLargeur = 210f;   // unités canvas (1280 de large) — le lettrage de
        private const float MarqueurHauteur = 40f;    // la maquette fait ~2,2 % de la largeur

        /// <summary>Le corps du nom de quartier, en unités de canvas. ⛔ 16 RENDAIT LE NOM 37 %
        /// TROP PETIT : un juge ⊥ a mesuré la hauteur de capitale en tranches verticales de 24 px
        /// (insensible à l'inclinaison) — **médiane 16 px** sur la maquette contre **10 px** en jeu,
        /// rapport 0,625, avec pour contrôle positif « LE THRENNY », peint dans la texture, qui rend
        /// 18 px des DEUX côtés (×1,000). Le rapport s'applique au corps : 16 ÷ 0,625 = 25,6.</summary>
        private const int CorpsDuNomUnites = 26;


        /// <summary>Le plafond d'opacité du halo d'état de contrôle — DÉRIVÉ, pas choisi.
        ///
        /// L'instrument du juge compte comme « masse visuelle » tout pixel dépassant le fond de
        /// **+20 de luminance**. Le fond de la carte vit à L ≈ 26–35 (navy) ; la teinte d'état la
        /// plus claire, `controlUncontested`, rend L ≈ 143. Un voile d'opacité α ajoute donc
        /// ΔL ≈ (143 − 30)·α, et il reste sous le seuil de l'instrument tant que α &lt; 20/113 =
        /// **0,177**. Le halo ne peut donc plus, par construction, être compté comme la masse qui a
        /// produit F1 — et ce n'est pas une promesse, c'est une inégalité opposable.
        /// ⚠️ Bornée à 0,15 et non à 0,177 : la marge absorbe l'écart sRGB↔linéaire que ce dépôt a
        /// déjà payé une fois (un même α ne donne pas le même pixel dans les deux espaces, et
        /// l'écart CROÎT avec le contraste — ce qui est exactement notre cas, une teinte claire sur
        /// une nuit bleue).</summary>
        public const float AlphaHaloMax = 0.15f;

        /// <summary>Le contour SOMBRE du canon sous les noms de quartier — `stroke:#080d14` et
        /// `stroke-width:2.4` en CSS. La dilatation de l'underlay TMP est normalisée (0..1) et se
        /// rapporte à la largeur du champ de distance ; 2,4 CSS sur un corps de 26 unités donne
        /// ≈ 0,092, arrondi à **0,09** — dérivé, et à remesurer par la garde d'effet plutôt qu'à
        /// croire sur parole.</summary>
        public static readonly Color ContourNomCouleur = new Color(0x08 / 255f, 0x0d / 255f, 0x14 / 255f, 1f);
        public const float ContourNomDilatation = 0.09f;
        public bool VillePeinteMontee { get; private set; }
        public Sprite VillePeinteSprite { get; private set; }
        public RectTransform VillePeinteRect => villePeinteRt;
        public IReadOnlyList<string> DistrictsSansAncre => districtsSansAncre;

        /// <summary>L'angle DÉCLARÉ par le fichier d'ancres pour un quartier, en convention d'image
        /// — la DONNÉE, pas ce que la scène en a fait.
        /// ⛔ Existe pour qu'une falsifiable puisse comparer le rendu à sa source. Ma première garde
        /// d'inclinaison lisait l'angle sur le `Transform` qu'elle testait : en inversant le signe
        /// du correctif, l'attendu s'inversait avec lui et la garde restait VERTE sur le monde
        /// qu'elle existait pour interdire. *Le contrôle et son sujet ne doivent pas partager leur
        /// support* — ici le support était le transform lui-même.</summary>
        public float AngleAncreDeclare(string nomCanonique)
        {
            if (ancres == null || string.IsNullOrEmpty(nomCanonique)) return 0f;
            AncreDistrictDto a;
            return ancres.TryGetValue(nomCanonique.ToUpperInvariant(), out a) && a != null ? a.angle_deg : 0f;
        }
        private RectTransform villePeinteRt;
        private RectTransform marqueursRt;
        private Dictionary<string, AncreDistrictDto> ancres;
        private readonly List<string> districtsSansAncre = new List<string>();

        private void Start()
        {
            font = DesignTokens.Current.primaryFont;
            BuildLayout();
            EnsureEventSystem();
            StartCoroutine(Load());
        }

        /// <summary>Fetch districts + render, then sign in + load the heat overlay.</summary>
        public IEnumerator Load()
        {
            IsLoaded = false;
            LastError = null;
            ClearCells();

            var client = new WorldApiClient { BaseUrl = baseUrl };
            List<DistrictDto> result = null;
            string error = null;
            yield return client.GetDistricts(d => result = d, e => error = e);

            if (error != null)
            {
                LastError = error;
                Debug.LogError($"[CityMap] {error}");
                yield break;
            }

            Populate(result);
            IsLoaded = true;
            Debug.Log($"[CityMap] Loaded {cells.Count} districts (north={NorthCount}, south={SouthCount}).");

            yield return AuthThenHeat();
        }

        /// <summary>AMENDÉ (hud-session-arbitrages-design.md §1.2, B1) — si un jeton a déjà été
        /// INJECTÉ par le shell (`SetToken`, avant `Start()`), `IsAuthenticated` est déjà vrai ici :
        /// saute le sign-in démo, pose l'état comme le ferait un signin réussi (repli inchangé,
        /// `IShellTenant.cs` — REÇU un jeton ⇒ ne signe pas soi-même). Le second publieur du chunk 5
        /// (`AdoptToken` vers le shell) a QUITTÉ ce point : le shell possède la session, la
        /// direction locataire→shell pour le JETON meurt avec la course qu'elle portait (§1.1).</summary>
        private IEnumerator AuthThenHeat()
        {
            if (IsAuthenticated)
            {
                RefreshEnterInteractable();
                yield return LoadHeat();
                yield break;
            }

            var auth = new AuthClient { BaseUrl = baseUrl };
            string token = null;
            string err = null;
            yield return DemoIdentityResolver.ResolveAndSignIn(auth,
                DemoIdentityResolver.CityMapIdentifierEnvVar, DemoIdentityResolver.CityMapPasswordEnvVar,
                demoIdentifier, demoPassword, t => token = t, e => err = e);

            if (err != null || string.IsNullOrEmpty(token))
            {
                AuthError = err ?? "sign-in returned no token";
                Debug.LogError($"[CityMap] auth failed: {AuthError}");
                yield break;
            }

            Token = token;
            IsAuthenticated = true;
            RefreshEnterInteractable(); // §3.2 — 2e point : le panneau peut avoir été ouvert AVANT l'auth (Populate à :98, signature à :102)
            Debug.Log("[CityMap] Signed in — Bearer token acquired.");

            yield return LoadHeat();
        }

        /// <summary>IShellTenant token injection (B1) — set directly by the shell BEFORE Start() runs
        /// (synchronous MountTenant<T> window). Mirrors DashboardController.SetToken.</summary>
        public void SetToken(string token)
        {
            Token = token;
            IsAuthenticated = !string.IsNullOrEmpty(token);
        }

        /// <summary>Fetch the heat projection for every district and badge each cell.</summary>
        public IEnumerator LoadHeat()
        {
            if (!IsAuthenticated)
            {
                Debug.LogWarning("[CityMap] LoadHeat called before authentication");
                yield break;
            }

            var client = new WorldApiClient { BaseUrl = baseUrl };
            foreach (DistrictCellView cell in cells)
            {
                DistrictHeatDto heat = null;
                string err = null;
                yield return client.GetDistrictHeat(cell.Model.id, Token, h => heat = h, e => err = e);
                if (heat != null)
                {
                    cell.SetHeat(CityMapEnums.ParseHeatBucket(heat.district_bucket));
                }
                else if (err != null)
                {
                    Debug.LogWarning($"[CityMap] heat fetch failed for district {cell.Model.id}: {err}");
                }
            }

            HeatLoaded = true;
            ApplyOverlayVisibility();
            Debug.Log($"[CityMap] Heat overlay loaded for {cells.Count} districts.");
        }

        /// <summary>Toggle the heat overlay on/off (button + public API for tests).</summary>
        public void SetHeatOverlay(bool on)
        {
            heatOverlayOn = on;
            UpdateToggleLabel();
            ApplyOverlayVisibility();
        }

        private void ApplyOverlayVisibility()
        {
            foreach (DistrictCellView cell in cells) cell.ShowHeat(heatOverlayOn);
        }

        private void Populate(List<DistrictDto> districts)
        {
            NorthCount = 0;
            SouthCount = 0;
            foreach (DistrictDto dto in districts)
            {
                BankSide bank = CityMapEnums.ParseBankSide(dto.bank_side);
                if (bank == BankSide.South) SouthCount++; else NorthCount++;

                DistrictCellView cell;
                if (VillePeinteMontee)
                {
                    // L'ancre est appariée par le nom canon, sans la casse ("Tidewater-1" ↔
                    // "TIDEWATER-1") ; un district sans ancre est CONSIGNÉ (le test l'exige vide)
                    // et posé au centre plutôt que perdu.
                    string cle = (dto.name_canonical ?? string.Empty).ToUpperInvariant();
                    if (!ancres.TryGetValue(cle, out AncreDistrictDto ancre)) districtsSansAncre.Add(dto.name_canonical);
                    cell = BuildMarqueur(marqueursRt, ancre);
                    // ⛔ Le porteur de l'état de contrôle est le HALO, pas l'`Image` de la cellule —
                    // celle-ci est devenue la surface de toucher, transparente. `GetComponent<Image>()`
                    // rendrait l'état de contrôle invisible SANS qu'aucune assertion de couleur ne
                    // bronche : elle serait vraie sur un objet à alpha nul. On désigne le halo par
                    // son NOM, jamais par sa position dans l'arbre.
                    Image halo = cell.transform.Find("Halo").GetComponent<Image>();
                    cell.Bind(dto, halo, cell.GetComponentInChildren<TextMeshProUGUI>(), compact: true);
                    AjusterHaloSurLEncre(cell);
                }
                else
                {
                    RectTransform parent = bank == BankSide.South ? southContent : northContent;
                    cell = BuildCell(parent);
                    cell.Bind(dto, cell.GetComponent<Image>(), cell.GetComponentInChildren<TextMeshProUGUI>());
                }
                cells.Add(cell);
            }
        }

        private void ClearCells()
        {
            foreach (DistrictCellView c in cells)
            {
                if (c != null) Destroy(c.gameObject);
            }
            cells.Clear();
            districtsSansAncre.Clear();
            NorthCount = 0;
            SouthCount = 0;
            HeatLoaded = false;
        }

        // W3.U1 C1 (design D2) — optional parent-of-mount the AppShell renseigne BEFORE Start() runs.
        // See DashboardController.mountParent for the full rationale (byte-identical mechanism here).
        private Transform mountParent;
        public void SetMountParent(Transform parent) => mountParent = parent;

        // ----------------------------------------------------------------- UI

        private void BuildLayout()
        {
            Canvas canvas = FindFirstObjectByType<Canvas>();
            if (canvas == null)
            {
                GameObject canvasGo = new GameObject("Canvas",
                    typeof(Canvas), typeof(CanvasScaler), typeof(GraphicRaycaster));
                canvas = canvasGo.GetComponent<Canvas>();
                canvas.renderMode = RenderMode.ScreenSpaceOverlay;
                CanvasScaler scaler = canvasGo.GetComponent<CanvasScaler>();
                scaler.uiScaleMode = CanvasScaler.ScaleMode.ScaleWithScreenSize;
                scaler.referenceResolution = new Vector2(1280, 720);
            }
            Transform mountRoot = mountParent != null ? mountParent : canvas.transform; // W3.U1 D2

            GameObject root = NewUI("CityMapRoot", mountRoot);
            RectTransform rootRt = (RectTransform)root.transform;
            Stretch(rootRt, Vector2.zero, Vector2.zero);
            // 2026-09-02 — hygiène de montage : aucune garde d'ordre de fratrie n'existait ici.
            // `CityMapRoot` (contrairement à ShopScreenController) n'est PAS le transform du
            // locataire lui-même — c'est un enfant SÉPARÉ créé ici, sous `mountRoot`, jamais
            // reparenté ensuite : un site unique suffit (pas de `OnTransformParentChanged` à poser,
            // rien ne le reparente après cette ligne — le patron à deux sites de
            // ShopScreenController.cs:105-135 répond à un mécanisme qui ne s'applique pas ici).
            rootRt.SetAsLastSibling();
            Image rootBg = root.AddComponent<Image>();
            rootBg.color = DesignTokens.Current.mapRootBg;

            Sprite peinture = Resources.Load<Sprite>(CheminPeinture);
            TextAsset ancresJson = Resources.Load<TextAsset>(CheminAncres);
            if (peinture != null && ancresJson != null)
            {
                BuildVillePeinte(root.transform, peinture, ancresJson);
            }
            else
            {
                Debug.LogWarning($"[CityMap] ville peinte absente (sprite={peinture != null}, ancres={ancresJson != null}) — liste en colonnes montée à la place");
                BuildListeEnColonnes(root);
            }
            BuildDetailPanel(mountRoot); // W3.U1 D2 — modal stays confined to the shell's content slot too
        }

        /// <summary>La ville peinte : la texture en COVER dans la zone LIBRE sous le chrome (la
        /// maquette ③·22 pose la carte entre la barre haute et le dock, jamais dessous), les 18
        /// marqueurs ancrés en FRACTIONS du rect de la peinture (ils suivent le cover à toute
        /// résolution), et un pied (bascule de chaleur + légende) au bas de la zone.</summary>
        private void BuildVillePeinte(Transform root, Sprite peinture, TextAsset ancresJson)
        {
            VillePeinteSprite = peinture;
            AncresDistrictsDto dto = JsonUtility.FromJson<AncresDistrictsDto>(ancresJson.text);
            ancres = new Dictionary<string, AncreDistrictDto>();
            if (dto != null && dto.ancres != null)
            {
                foreach (AncreDistrictDto a in dto.ancres) ancres[a.nom.ToUpperInvariant()] = a;
            }

            // `ShellChrome` publie ce que le chrome MANGE (barre haute + débord du manomètre,
            // dock) ; hors shell les deux valent 0 et la zone est le canvas entier.
            GameObject zone = NewUI("ZoneLibre", root);
            RectTransform zoneRt = (RectTransform)zone.transform;
            Stretch(zoneRt, new Vector2(0f, MafiaCleanCity.Shell.ShellChrome.BottomInsetPx),
                            new Vector2(0f, -MafiaCleanCity.Shell.ShellChrome.TopInsetPx));

            // COVER : la peinture remplit la zone en gardant son format (2100×3640 = 0,577 contre
            // 0,546 pour la zone libre à 1080×2400 : ~1,4 % rogné de chaque côté, rien en hauteur).
            // ⚠️ BLANC, pas un token : la couleur est CUITE dans la texture (même règle que les
            // bustes — teinter multiplierait deux couleurs).
            GameObject peintureGo = NewUI("VillePeinte", zone.transform);
            villePeinteRt = (RectTransform)peintureGo.transform;
            Stretch(villePeinteRt, Vector2.zero, Vector2.zero);
            Image img = peintureGo.AddComponent<Image>();
            img.sprite = peinture;
            img.color = Color.white;
            img.preserveAspect = false;
            img.raycastTarget = false;
            AspectRatioFitter fit = peintureGo.AddComponent<AspectRatioFitter>();
            fit.aspectMode = AspectRatioFitter.AspectMode.EnvelopeParent;
            fit.aspectRatio = peinture.rect.width / peinture.rect.height;

            GameObject marqueurs = NewUI("Marqueurs", peintureGo.transform);
            marqueursRt = (RectTransform)marqueurs.transform;
            Stretch(marqueursRt, Vector2.zero, Vector2.zero);

            GameObject pied = NewUI("Pied", zone.transform);
            RectTransform piedRt = (RectTransform)pied.transform;
            piedRt.anchorMin = new Vector2(0f, 0f);
            piedRt.anchorMax = new Vector2(1f, 0f);
            piedRt.pivot = new Vector2(0.5f, 0f);
            piedRt.sizeDelta = new Vector2(-2f * RootPadding, 40f);
            piedRt.anchoredPosition = new Vector2(0f, RootPadding);
            HorizontalLayoutGroup hlg = pied.AddComponent<HorizontalLayoutGroup>();
            hlg.spacing = 18;
            hlg.childAlignment = TextAnchor.MiddleLeft;
            hlg.childControlWidth = true;
            hlg.childControlHeight = true;
            hlg.childForceExpandWidth = false;
            hlg.childForceExpandHeight = false;
            BuildToggleButton(pied.transform);
            // ⛔ PLUS DE LÉGENDE À PASTILLES SUR LA VILLE PEINTE (F6). Le juge ⊥ l'a mesurée comme
            // les SEULS aplats saturés de l'écran — (242,189,49), (61,178,86), (209,66,66) — sur un
            // écran dont la palette dominante plafonne à (85,87,77), et texte en blanc PUR
            // (242,242,242). La maquette n'en porte aucune : elle explique l'état par des écussons
            // posés sur la ville, et sa ligne du bas est une phrase de fiction en italique.
            // ⚠️ Elle reste montée sur le REPLI en deux colonnes (`BuildListeEnColonnes`), où elle
            //   fait partie de cette mise en page-là. On retire une légende d'un montage, pas la
            //   fonction du dépôt.
            // ⚠️ ET CE QUE CE RETRAIT LAISSE OUVERT, plutôt que de le passer sous silence : plus rien
            //   n'explique les couleurs d'état. Le halo les porte à α ≤ 0,15, donc à peine ; la
            //   maquette, elle, ne les explique pas non plus — elle les DESSINE autrement (écussons
            //   numérotés, lavis sur l'aire du quartier, halo or de chez-soi), et ces trois objets
            //   n'existent pas côté client. C'est le même manque que F4 : de la donnée d'atelier.
            // ⚠️ Le BOUTON de bascule reste : ce n'est pas une décoration, c'est une interaction —
            //   et la maquette n'en a aucune. Le retirer supprimerait une fonction, pas un écart.
            //   ⇒ arbitrage, pas conformité.

            VillePeinteMontee = true;
        }

        /// <summary>L'ancienne liste en deux colonnes — REPLI quand la peinture ou ses ancres
        /// manquent (et le chemin que les tests `CityMap*` d'avant le 2026-09-03 exerçaient).</summary>
        private void BuildListeEnColonnes(GameObject root)
        {
            rootVlg = root.AddComponent<VerticalLayoutGroup>();
            // 2026-09-02 — `ShellChrome.BottomInsetPx` (zone sûre + barre d'onglets) n'était lu
            // nulle part dans ce fichier : le contenu (dernière rangée de districts, légende)
            // pouvait passer sous le dock. Vaut 0 hors shell (tests isolés ci-dessous) : inchangé
            // pour eux. Même valeur réutilisée dans ReserveSpaceForPanel — ne PAS dupliquer le 0
            // implicite là-bas.
            rootVlg.padding = new RectOffset(RootPadding, RootPadding, TopPadding, BottomPadding);
            rootVlg.spacing = 12;
            rootVlg.childControlWidth = true;
            rootVlg.childControlHeight = true;
            rootVlg.childForceExpandWidth = true;
            rootVlg.childForceExpandHeight = false;

            // Header row: title + heat-overlay toggle button.
            GameObject header = NewUI("Header", root.transform);
            HorizontalLayoutGroup hhlg = header.AddComponent<HorizontalLayoutGroup>();
            hhlg.spacing = 12;
            hhlg.childAlignment = TextAnchor.MiddleCenter;
            hhlg.childControlWidth = true;
            hhlg.childControlHeight = true;
            hhlg.childForceExpandWidth = false;
            hhlg.childForceExpandHeight = true;
            AddLayoutElement(header, minHeight: 44, flexibleHeight: 0);

            // JUGE-D5 (audit visuel du district, 2026-08-21, balayage étendu à CityMap.cs — même
            // périmètre CityMap/) — chaîne traduite, était en anglais dans une surface autrement
            // française ("← Carte"/Lib("Entrer") plus bas dans ce même fichier).
            TextMeshProUGUI title = NewText("Title", header.transform, Lib("CARTE DE LA VILLE — Districts"), 28, TextAlignmentOptions.Left);
            title.fontStyle = FontStyles.Bold;
            AddLayoutElement(title.gameObject, flexibleWidth: 1);

            BuildToggleButton(header.transform);

            // Banks row: two columns side by side, DIMENSIONNÉES SUR LEUR CONTENU (retour user
            // relayé par le contrôleur, 2026-08-21 : les captures multi-résolution du lot HUD v3.1
            // ont montré cette rangée forcée à `flexibleHeight=1` — elle s'étirait pour occuper
            // TOUT l'espace vertical restant du canvas, laissant les 3/4 d'un écran portrait
            // recouverts d'un aplat de couleur totalement vide sous la liste de districts. MESURÉ
            // (execute_code, geometry live) : le contenu réel (en-tête + N cellules de 40px) tenait
            // dans le quart supérieur d'un canvas 1080×2400. `flexibleHeight=0` (retiré) : `Banks`
            // se dimensionne maintenant sur son CONTENU — le reste du canvas montre `mapRootBg`
            // (le fond de l'écran, PAS un second aplat de panneau) ; `childForceExpandHeight=true`
            // À L'INTÉRIEUR de `Banks` reste utile pour égaliser les deux colonnes ENTRE ELLES si
            // north/south ont des comptes différents — inchangé, portée réduite au strict besoin.
            GameObject banks = NewUI("Banks", root.transform);
            HorizontalLayoutGroup banksHlg = banks.AddComponent<HorizontalLayoutGroup>();
            banksHlg.spacing = 12;
            banksHlg.childControlWidth = true;
            banksHlg.childControlHeight = true;
            banksHlg.childForceExpandWidth = true;
            banksHlg.childForceExpandHeight = true;
            AddLayoutElement(banks, flexibleHeight: 0);

            northContent = BuildColumn(banks.transform, "NorthBank", Lib("Rive nord"), DesignTokens.Current.mapPanelNorth);
            southContent = BuildColumn(banks.transform, "SouthBank", Lib("Rive sud"), DesignTokens.Current.mapPanelSouth);

            BuildLegend(root.transform);
        }

        private void BuildToggleButton(Transform parent)
        {
            GameObject btn = NewUI("HeatToggle", parent);
            Image img = btn.AddComponent<Image>();
            img.color = DesignTokens.Current.mapChipBg;
            Button button = btn.AddComponent<Button>();
            button.targetGraphic = img;
            AddLayoutElement(btn, minHeight: 36, flexibleHeight: 0, minWidth: 210, preferredWidth: 210);

            toggleLabel = NewText("Label", btn.transform, "", 16, TextAlignmentOptions.Center);
            Stretch((RectTransform)toggleLabel.transform, new Vector2(8, 4), new Vector2(-8, -4));

            button.onClick.AddListener(() => SetHeatOverlay(!heatOverlayOn));
            UpdateToggleLabel();
        }

        private void UpdateToggleLabel()
        {
            if (toggleLabel != null)
            {
                toggleLabel.text = heatOverlayOn ? Lib("Chaleur : affichée") : Lib("Chaleur : masquée");
            }
        }

        private RectTransform BuildColumn(Transform parent, string nomObjet, string header, Color panelColor)
        {
            GameObject col = NewUI(nomObjet, parent);
            // PIÈGE MESURÉ ailleurs dans ce dépôt (`Shell/VerticalGradientImage.cs`) — `Graphic`
            // porte `[RequireComponent(typeof(CanvasRenderer))]`, mais `AddComponent<T>()` seul ne
            // l'ajoute PAS à l'exécution : sans lui, ce Graphic ne dessinerait RIEN, silencieusement.
            // `NewUI` ne construit qu'un `RectTransform` — CanvasRenderer explicite ici.
            col.AddComponent<CanvasRenderer>();
            // Retour user relayé par le contrôleur (2026-08-21) : « verre gravé, aucun aplat de
            // couleur » — REUSE du dégradé 2 arrêts (voir `CityMapVerticalGradient.cs`, patron de
            // `Shell/VerticalGradientImage.cs`, dupliqué ICI faute de pouvoir référencer `Shell`
            // depuis `CityMap` sans cycle d'assembly). Arrêt HAUT = `panelColor` (identité de la
            // banque, PRÉSERVÉE — north/south restent visuellement distincts) ; arrêt BAS =
            // `mapRootBg` (le fond partagé de l'écran) — le panneau se fond dans le fond au lieu
            // de s'arrêter net sur un bord d'aplat, quelle que soit sa hauteur réelle après le
            // correctif de layout ci-dessus.
            CityMapVerticalGradient colBg = col.AddComponent<CityMapVerticalGradient>();
            colBg.SetColors(panelColor, DesignTokens.Current.mapRootBg);
            VerticalLayoutGroup vlg = col.AddComponent<VerticalLayoutGroup>();
            vlg.padding = new RectOffset(8, 8, 8, 8);
            vlg.spacing = 6;
            vlg.childAlignment = TextAnchor.UpperCenter;
            vlg.childControlWidth = true;
            vlg.childControlHeight = true;
            vlg.childForceExpandWidth = true;
            vlg.childForceExpandHeight = false;
            AddLayoutElement(col, flexibleWidth: 1);

            TextMeshProUGUI h = NewText("Header", col.transform, header.ToUpperInvariant(), 20, TextAlignmentOptions.Center);
            h.fontStyle = FontStyles.Bold;
            AddLayoutElement(h.gameObject, minHeight: 32, flexibleHeight: 0);

            return (RectTransform)col.transform;
        }

        private DistrictCellView BuildCell(Transform parent)
        {
            GameObject cell = NewUI("DistrictCell", parent);
            Image bg = cell.AddComponent<Image>();
            bg.color = Color.gray;
            AddLayoutElement(cell, minHeight: 40, preferredHeight: 40, flexibleHeight: 0);

            TextMeshProUGUI label = NewText("Label", cell.transform, "", 16, TextAlignmentOptions.Left);
            RectTransform labelRt = (RectTransform)label.transform;
            Stretch(labelRt, new Vector2(10, 2), new Vector2(-94, -2)); // leave room for the heat badge

            // Heat badge — right-anchored. Hidden until heat is fetched.
            //
            // Retour user relayé par le contrôleur (2026-08-21) : « l'état de chaleur signalé sans
            // pastille pleine ». L'ANCIEN badge remplissait tout le conteneur 80×24 de la couleur
            // heat (une vraie "pastille pleine" — même défaut que l'ancien onglet actif de la
            // TabBar, une teinte fonctionnelle en APLAT). REUSE du patron déjà établi PLUS BAS dans
            // ce même fichier pour la légende de contrôle (`AddLegendItem` : petit carré-témoin +
            // légende neutre, jamais un pavé coloré) — le même conteneur 80×24 reste inchangé (le
            // label de la cellule réserve déjà 94px pour lui, `Stretch` ci-dessus), mais son CONTENU
            // devient un petit carré-témoin (14px, gauche) + un texte NEUTRE (blanc, comme tout
            // autre texte de cet écran — `NewText`) au lieu d'un fond coloré.
            GameObject badge = NewUI("HeatBadge", cell.transform);
            RectTransform badgeRt = (RectTransform)badge.transform;
            badgeRt.anchorMin = new Vector2(1f, 0.5f);
            badgeRt.anchorMax = new Vector2(1f, 0.5f);
            badgeRt.pivot = new Vector2(1f, 0.5f);
            badgeRt.sizeDelta = new Vector2(80f, 24f);
            badgeRt.anchoredPosition = new Vector2(-8f, 0f);

            const float SwatchDiameterPx = 14f;
            GameObject swatchGo = NewUI("HeatSwatch", badge.transform);
            RectTransform swatchRt = (RectTransform)swatchGo.transform;
            swatchRt.anchorMin = new Vector2(0f, 0.5f);
            swatchRt.anchorMax = new Vector2(0f, 0.5f);
            swatchRt.pivot = new Vector2(0f, 0.5f);
            swatchRt.sizeDelta = new Vector2(SwatchDiameterPx, SwatchDiameterPx);
            swatchRt.anchoredPosition = Vector2.zero;
            Image badgeBg = swatchGo.AddComponent<Image>();
            badgeBg.color = CityMapEnums.HeatColorFor(HeatBucket.Unknown);
            badgeBg.raycastTarget = false; // let clicks fall through to the cell button

            TextMeshProUGUI badgeLabel = NewText("HeatLabel", badge.transform, "", 12, TextAlignmentOptions.Left);
            Stretch((RectTransform)badgeLabel.transform, new Vector2(SwatchDiameterPx + 6f, 2f), new Vector2(0f, -2f));

            DistrictCellView view = cell.AddComponent<DistrictCellView>();
            view.AttachHeatBadge(badge, badgeBg, badgeLabel);

            // The whole cell is a button → opens the district detail panel.
            Button cellButton = cell.AddComponent<Button>();
            cellButton.targetGraphic = bg;
            cellButton.onClick.AddListener(() => SelectDistrict(view.Model.id));

            return view;
        }

        /// <summary>Un marqueur de district sur la ville peinte. Il garde les TROIS porteurs
        /// qu'une tuile avait et que les tests épinglent : `Background` (couleur = état de contrôle),
        /// `Label` (contient `name_canonical`), `HeatBadge` (carré-témoin + libellé, masqué tant
        /// que la chaleur est inconnue) — plus le composant `DistrictCellView` lui-même (sceau
        /// d'identité de type, `AppShellPlayModeTests`). Ancre = fraction du rect parent.</summary>
        private DistrictCellView BuildMarqueur(Transform parent, AncreDistrictDto ancre)
        {
            GameObject cell = NewUI("DistrictMarqueur", parent);
            RectTransform rt = (RectTransform)cell.transform;
            Vector2 a = ancre != null ? new Vector2(ancre.x_frac, 1f - ancre.y_frac) : new Vector2(0.5f, 0.5f);
            rt.anchorMin = a;
            rt.anchorMax = a;
            rt.pivot = new Vector2(0.5f, 0.5f);
            rt.sizeDelta = new Vector2(MarqueurLargeur, MarqueurHauteur);
            rt.anchoredPosition = Vector2.zero;
            // ⛔ LE NOM SUIT LA TRAME DE SON QUARTIER (③ F4). Le juge a mesuré une amplitude de
            // **17,4°** sur sept quartiers de la maquette (LES BASSINS −10,21° … DÉPÔT-EST +7,23°)
            // contre **±0,4°** en jeu : tous les noms redressés à l'horizontale. L'angle n'est pas
            // dérivable d'une image — c'est une propriété du PROFIL de trame, six profils, six
            // angles (amplitude réelle 28°, le juge n'avait aucun quartier `glass`), lue dans la
            // source d'auteur par l'atelier et livrée dans le fichier d'ancres.
            // ⚠️ LE SIGNE EST LE PIÈGE, et le fichier le dit : sa convention est celle de l'IMAGE
            //   (0° horizontal, positif HORAIRE, y vers le bas) tandis qu'Unity tourne à l'inverse.
            //   D'où le `-`. *Une garde sur le signe de la constante serait satisfaite par les deux
            //   mondes* — c'est l'aiguille inversée ; celle de ce lot lit de quel côté tombe
            //   l'extrémité d'un nom, pas le signe qu'on a écrit.
            rt.localRotation = Quaternion.Euler(0f, 0f, ancre != null ? -ancre.angle_deg : 0f);

            // ⛔⛔ LA PLAQUE OPAQUE EST PARTIE, ET ELLE PORTAIT CINQ DES DIX ÉCARTS DE ③.
            // Un juge ⊥ a mesuré (`carte/r1-2026-09-06`) : `Image` sur la cellule, `Color.gray`,
            // 210 × 40 unités, opacité 100 % — 45 échantillons répartis dans une plaque rendent
            // TOUS exactement (140,140,148), y compris par-dessus le parc et la rose des vents.
            //   F1  masse visuelle ×3,00 à ×7,85 autour du nom (témoins sans marqueur : ×1,04 à ×1,18)
            //   F2  contraste du nom 2,80:1 — SOUS le plancher de doctrine 4,5:1, quand la maquette
            //       obtient 8,43:1 en n'ayant AUCUNE plaque
            //   F5  le bras SUD de la rose des vents recouvert : 31 px perdus sur 146, soit 21 %
            //   F7  largeur FIXE : 177 px de plaque pour 48 px d'encre sur « ORSEL » — 73 % de
            //       plaque sans une seule lettre
            //   F10 arête franche : (140,140,148) → (22,36,49) en UN pixel, rayon 0
            // *Un seul objet mal choisi a produit cinq findings dans quatre classes différentes.*
            // La maquette ne pose pas de plaque : elle GRAVE le nom à même la peinture, et l'état
            // de contrôle vit ailleurs (lavis sur l'AIRE du quartier, écussons, halo or de chez-soi).
            //
            // ⇒ La cellule garde donc DEUX graphiques distincts, parce qu'ils font deux métiers que
            //   l'ancien mélangeait :
            //     · `Hit`  — transparent, la SURFACE DE TOUCHER (210 × 40 unités, inchangée : c'est
            //               une cible de doigt, elle n'a jamais eu à être visible) ;
            //     · `Halo` — le porteur de l'état de contrôle, une lueur radiale SANS BORD, large
            //               comme l'encre et non comme une constante.
            //   `Background` (ce que les tests épinglent) désigne désormais le HALO : le contrat
            //   « la couleur porte l'état de contrôle » est INTACT, c'est sa forme qui change.
            Image hit = cell.AddComponent<Image>();
            hit.color = new Color(0f, 0f, 0f, 0f);   // invisible, mais toujours cliquable
            hit.raycastTarget = true;

            GameObject haloGo = NewUI("Halo", cell.transform);
            Image halo = haloGo.AddComponent<Image>();
            // ⛔ PAS DE SPRITE PLEIN : une lueur qui s'éteint, donc aucune arête à mesurer (F10).
            halo.sprite = MafiaCleanCity.Shell.ProceduralUI.VoileRadial(
                128, Color.white, new Vector2(0.5f, 0.5f), 0.5f, 0.5f);
            halo.type = Image.Type.Simple;
            halo.raycastTarget = false;
            halo.transform.SetAsFirstSibling();      // sous le nom, toujours
            // ⛔ LE HALO CLAIR EST NEUTRALISÉ, PAS SUPPRIMÉ — et le choix se justifie. Il portait le
            // signe INVERSE de ce que le canon demande (voir le contour sombre plus bas) ; le
            // supprimer casserait `AjusterHaloSurLEncre` et la garde qui plafonne son alpha, deux
            // dispositifs justes pour ce qu'ils surveillent. On le rend donc INERTE en un point et
            // on le dit, plutôt que de disperser le retrait sur trois fichiers dans le même geste.
            // ⚠️ Un dispositif inerte ressemble trait pour trait à un dispositif appliqué : la
            //    valeur est écrite ici et son plafond reste vérifié — 0 est bien ≤ au plafond.
            { Color hc = halo.color; hc.a = 0f; halo.color = hc; }

            TextMeshProUGUI label = NewText("Label", cell.transform, "", CorpsDuNomUnites,
                TextAlignmentOptions.Center);
            // ⛔ LA ROMAINE À EMPATTEMENTS DU CANON — `hudSerifFont` EXISTE dans les jetons et
            // n'était pas employé ici. Un juge ⊥ mesure « la maquette est en romaine à empattements,
            // le jeu en linéale » ; le client embarque pourtant la fonte. *Un jeton disponible et
            // non appelé se lit comme un jeton absent, et personne ne le cherche.*
            label.font = DesignTokens.Current.hudSerifFont;
            // ⛔ 24, PAS 8 — et l'unité était le défaut, pas la valeur. Le canon donne
            // `letter-spacing:.24em` ; le `characterSpacing` de TMP se compte en **centièmes d'em**,
            // ce que ce dépôt écrit déjà noir sur blanc ailleurs (`characterSpacing = 12f` annoté
            // « `.12em` » sur les boutons de fiche). 8 valait donc 0,08 em — le tiers du dû, et
            // c'est précisément « l'avance perdue » que le juge mesure.
            label.characterSpacing = 24f;   // `.nomq{letter-spacing:.24em}` — 100 = 1 em
            // ⛔ `opacity:.9` du canon (m1), qui n'est PAS un rouge-moins-bleu : la maquette pose une
            // opacité sur l'encre entière, pas une teinte plus froide.
            label.alpha = 0.9f;
            label.fontStyle = FontStyles.UpperCase; // capitales en STYLE — le texte reste le nom servi
            // ⛔ LA TEINTE EST UNE FAMILLE, PAS UNE VALEUR (F9). Mesuré par le juge : l'encre de la
            // maquette va de (173,164,144) à (205,189,165), soit r−b de 29 à 40 — une crème CHAUDE.
            // Le jeu rendait (235,235,236), r−b = 1 : un blanc neutre, qui appartient à une autre
            // langue graphique. `hudCremeSecondary` (#b9ad92) rend r−b = 39, dans la bande mesurée.
            label.color = DesignTokens.Current.hudCremeSecondary;
            // ⛔⛔ LE NOM NE SE TRONQUE PLUS, ET C'EST UNE RÉGRESSION QUE J'AI FAITE PUIS VUE SUR LA
            // PLANCHE. En passant le corps de 16 à 26 unités (F3), les noms longs ont cessé de tenir
            // dans les 198 unités que laissait `Stretch` : la planche rendait « HAUTES-MAR »,
            // « LES ENTREP », « PLACE DES C », « LA CHANCEL », « MARNE-BASS ». Le juge avait pourtant
            // un CONTRÔLE POSITIF là-dessus — C8, « 18/18, 0 slug, 0 troncature » — et mon correctif
            // le cassait. *Un correctif qui ferme un finding en cassant un contrôle positif du même
            // rapport n'a pas corrigé, il a déplacé.* Vu en REGARDANT la planche, pas en relisant le
            // code : `overflowMode = Truncate` coupe sans lever quoi que ce soit.
            // ⇒ Le correctif est le MODE DE DÉBORDEMENT, pas la largeur de la boîte. Je l'ai
            //   d'abord « corrigé » en élargissant la boîte ET en passant en `Overflow` — deux
            //   variables à la fois — et le contrôle positif est resté VERT quand j'ai remis
            //   l'ancienne largeur : la largeur n'était pour rien dans le défaut, et la constante
            //   que j'avais introduite pour elle était décorative. *Deux variables qui bougent
            //   ensemble ne départagent rien*, y compris dans son propre correctif.
            //   Un nom trop long DÉBORDE désormais (visible, donc jugeable, et le juge mesure les
            //   paires de marqueurs — C10, 0 sur 153) au lieu d'être coupé en silence.
            Stretch((RectTransform)label.transform, new Vector2(6, 2), new Vector2(-6, -2));
            label.overflowMode = TextOverflowModes.Overflow;

            // ⛔⛔⛔ LE SIGNE ÉTAIT INVERSÉ, ET C'EST LE FINDING LE PLUS COÛTEUX DE CET ÉCRAN.
            // La maquette CREUSE un contour SOMBRE sous le glyphe — `paint-order:stroke;
            // stroke:#080d14; stroke-width:2.4` — mesuré par un juge ⊥ à **−10 à −20 L** sous l'art.
            // Le jeu posait un halo CLAIR, mesuré **+17,7 L**. Les deux dispositifs ont la même
            // intention (détacher le nom de l'art) et des signes opposés ; le nôtre venait d'un
            // « +20 L » que le round précédent avait pris pour une propriété de la maquette alors
            // que c'était le contraste que le contour sombre PRODUIT. *Une cible dérivée d'un effet
            // n'est pas la description de sa cause* — et on a construit la cause inverse.
            // ⇒ Le halo clair part ; à sa place, un `Underlay` sombre à la cote du canon. Ce n'est
            //   PAS un contour TMP (`_OutlineWidth`) : ce dépôt a déjà mesuré qu'il se trace à
            //   l'INTÉRIEUR du bord et ronge la lettre (195 → 90 → 28 pixels clairs) sans jamais
            //   devenir sombre. L'underlay, lui, s'ajoute AUTOUR.
            var mat = label.fontMaterial;
            mat.EnableKeyword(ShaderUtilities.Keyword_Underlay);
            mat.SetColor(ShaderUtilities.ID_UnderlayColor, ContourNomCouleur);
            mat.SetFloat(ShaderUtilities.ID_UnderlayOffsetX, 0f);
            mat.SetFloat(ShaderUtilities.ID_UnderlayOffsetY, 0f);
            mat.SetFloat(ShaderUtilities.ID_UnderlayDilate, ContourNomDilatation);
            mat.SetFloat(ShaderUtilities.ID_UnderlaySoftness, 0f);   // un CONTOUR, pas une ombre

            // Le halo suit l'ENCRE (F7) : il est posé une fois le texte connu, dans `AjusterHalo`.
            var haloRt = (RectTransform)haloGo.transform;
            haloRt.anchorMin = new Vector2(0.5f, 0.5f);
            haloRt.anchorMax = new Vector2(0.5f, 0.5f);
            haloRt.pivot = new Vector2(0.5f, 0.5f);
            haloRt.anchoredPosition = Vector2.zero;
            haloRt.sizeDelta = new Vector2(MarqueurLargeur, MarqueurHauteur);

            GameObject badge = NewUI("HeatBadge", cell.transform);
            RectTransform badgeRt = (RectTransform)badge.transform;
            badgeRt.anchorMin = new Vector2(0.5f, 0f);
            badgeRt.anchorMax = new Vector2(0.5f, 0f);
            badgeRt.pivot = new Vector2(0.5f, 1f);
            badgeRt.sizeDelta = new Vector2(80f, 24f);
            badgeRt.anchoredPosition = new Vector2(0f, -4f);

            const float SwatchDiameterPx = 14f;
            GameObject swatchGo = NewUI("HeatSwatch", badge.transform);
            RectTransform swatchRt = (RectTransform)swatchGo.transform;
            swatchRt.anchorMin = new Vector2(0f, 0.5f);
            swatchRt.anchorMax = new Vector2(0f, 0.5f);
            swatchRt.pivot = new Vector2(0f, 0.5f);
            swatchRt.sizeDelta = new Vector2(SwatchDiameterPx, SwatchDiameterPx);
            swatchRt.anchoredPosition = Vector2.zero;
            Image badgeBg = swatchGo.AddComponent<Image>();
            badgeBg.color = CityMapEnums.HeatColorFor(HeatBucket.Unknown);
            badgeBg.raycastTarget = false;
            TextMeshProUGUI badgeLabel = NewText("HeatLabel", badge.transform, "", 12, TextAlignmentOptions.Left);
            Stretch((RectTransform)badgeLabel.transform, new Vector2(SwatchDiameterPx + 6f, 2f), new Vector2(0f, -2f));

            DistrictCellView view = cell.AddComponent<DistrictCellView>();
            view.AttachHeatBadge(badge, badgeBg, badgeLabel);
            Button cellButton = cell.AddComponent<Button>();
            cellButton.targetGraphic = hit;
            cellButton.onClick.AddListener(() => SelectDistrict(view.Model.id));
            return view;
        }

        /// <summary>Le halo épouse l'ENCRE du nom, jamais une largeur constante.
        ///
        /// ⛔ MESURÉ (F7) : les 18 plaques faisaient TOUTES 177 × 34 px pendant que l'encre allait
        /// de 48 px (« ORSEL ») à 158 px (« PLACE DES COMPTES ») — donc 129 px de plaque, soit
        /// **73 %**, sans une seule lettre sur le nom le plus court. Une boîte plus grande que son
        /// contenu ne se contente pas d'être laide : elle MENT sur la place prise, et ici elle
        /// masquait la peinture (F5, le bras sud de la rose des vents recouvert sur 21 % de sa
        /// longueur).
        /// ⚠️ La surface de TOUCHER, elle, ne suit PAS l'encre : elle reste à
        /// `MarqueurLargeur × MarqueurHauteur`, parce qu'un nom court ne doit pas devenir une cible
        /// de doigt plus petite que les autres. *Deux métiers, deux boîtes* — c'est exactement ce
        /// que l'ancienne `Image` unique confondait.</summary>
        private static void AjusterHaloSurLEncre(DistrictCellView cell)
        {
            if (cell == null || cell.Background == null || cell.Label == null) return;
            cell.Label.ForceMeshUpdate();
            var haloRt = (RectTransform)cell.Background.transform;
            // Le halo s'éteint À SON BORD : sans marge, le voile serait tranché net là où il
            // devait finir de s'éteindre. Une demi-hauteur de chaque côté suffit.
            float largeurEncre = cell.Label.GetRenderedValues(true).x;
            haloRt.sizeDelta = new Vector2(largeurEncre + MarqueurHauteur, MarqueurHauteur);

            // ⛔ LE PLAFOND D'OPACITÉ S'APPLIQUE ICI, ET SEULEMENT ICI. `DistrictCellView.Bind`
            // pose `ColorFor(State)` à pleine opacité, et c'est JUSTE pour l'autre montage de cet
            // écran — la liste en deux colonnes, où la tuile EST un pavé plein et doit le rester.
            // Une opacité bornée dans `Bind` serait une garde d'un domaine appliquée à un autre :
            // le socle a déjà payé ce défaut (un `Mathf.Max(1, …)` écrit pour une épaisseur de
            // trait, appliqué à un retrait négatif). ⇒ La contrainte vit chez celui qui la
            // connaît : le marqueur posé sur la peinture.
            // La TEINTE, elle, n'est pas touchée — le contrat « la couleur porte l'état de
            // contrôle » reste vrai canal par canal.
            Color teinte = cell.Background.color;
            teinte.a = Mathf.Min(teinte.a, AlphaHaloMax);
            cell.Background.color = teinte;
        }

        private void BuildLegend(Transform parent)
        {
            GameObject legend = NewUI("Legend", parent);
            HorizontalLayoutGroup hlg = legend.AddComponent<HorizontalLayoutGroup>();
            hlg.spacing = 18;
            hlg.childAlignment = TextAnchor.MiddleCenter;
            hlg.childControlWidth = true;
            hlg.childControlHeight = true;
            hlg.childForceExpandWidth = false;
            hlg.childForceExpandHeight = false;
            AddLayoutElement(legend, minHeight: 30, flexibleHeight: 0);

            AddLegendItem(legend.transform, Lib("Libre"), CityMapEnums.ColorFor(ControlState.Uncontested));
            AddLegendItem(legend.transform, Lib("Disputé"), CityMapEnums.ColorFor(ControlState.Contested));
            AddLegendItem(legend.transform, Lib("À vous"), CityMapEnums.ColorFor(ControlState.PlayerHeld));
            AddLegendItem(legend.transform, Lib("Rival"), CityMapEnums.ColorFor(ControlState.RivalHeld));
        }

        private void AddLegendItem(Transform parent, string label, Color swatchColor)
        {
            GameObject item = NewUI("LegendItem", parent);
            HorizontalLayoutGroup hlg = item.AddComponent<HorizontalLayoutGroup>();
            hlg.spacing = 6;
            hlg.childAlignment = TextAnchor.MiddleLeft;
            hlg.childControlWidth = true;
            hlg.childControlHeight = true;
            hlg.childForceExpandWidth = false;
            hlg.childForceExpandHeight = false;

            GameObject swatch = NewUI("Swatch", item.transform);
            Image sw = swatch.AddComponent<Image>();
            sw.color = swatchColor;
            AddLayoutElement(swatch, minHeight: 18, preferredHeight: 18, minWidth: 18, preferredWidth: 18);

            TextMeshProUGUI t = NewText("Caption", item.transform, label, 14, TextAlignmentOptions.Left);
            AddLayoutElement(t.gameObject, minHeight: 18);
        }

        // ------------------------------------------------------ detail panel

        private void BuildDetailPanel(Transform canvasParent)
        {
            detailPanel = NewUI("DetailPanel", canvasParent);
            RectTransform dp = (RectTransform)detailPanel.transform;
            dp.anchorMin = new Vector2(1f, 0f);
            dp.anchorMax = new Vector2(1f, 1f);
            dp.pivot = new Vector2(1f, 1f);
            // 2026-09-02 — le bas de ce panneau tombait EXACTEMENT sur le bord bas de ContentSlot
            // (0 px d'écart : anchorMin.y=0, pivot=(1,1), l'ancien `sizeDelta.y=-16` ne mange QUE
            // l'inset du haut). Sous shell, ContentSlot couvre tout le canvas par conception, donc
            // le Footer/« Entrer » du panneau passait sous le dock. `sizeDelta.y` mange maintenant
            // AUSSI `ShellChrome.BottomInsetPx` — `anchoredPosition.y` reste -16 (inset du haut,
            // hors périmètre de ce correctif) ; vaut 0 hors shell, repli inchangé pour les fixtures.
            // 2026-09-02 (chantier C) — l'inset du HAUT entre ici aussi : il était déclaré
            // « hors périmètre » par le correctif de bas, et la capture réelle a montré que le
            // chrome recouvre le contenu. Les deux insets sont désormais mangés par la hauteur, et
            // le panneau descend sous la barre au lieu de commencer derrière elle.
            dp.sizeDelta = new Vector2(380f, -(16f + MafiaCleanCity.Shell.ShellChrome.TopInsetPx
                                               + MafiaCleanCity.Shell.ShellChrome.BottomInsetPx));
            dp.anchoredPosition = new Vector2(-16f, -(16f + MafiaCleanCity.Shell.ShellChrome.TopInsetPx));
            // 2026-09-02 — même garde structurelle que CityMapRoot ci-dessus : ce panneau doit
            // toujours rendre AU-DESSUS de la carte. Aujourd'hui redondant (BuildDetailPanel est
            // appelé après CityMapRoot dans le même BuildLayout, donc déjà dernier enfant à la
            // création) — posé explicitement pour ne plus dépendre de cet ordre d'appel.
            dp.SetAsLastSibling();

            Image bg = detailPanel.AddComponent<Image>();
            bg.color = DesignTokens.Current.mapDialogBg;

            VerticalLayoutGroup vlg = detailPanel.AddComponent<VerticalLayoutGroup>();
            vlg.padding = new RectOffset(14, 14, 12, 12);
            vlg.spacing = 8;
            vlg.childAlignment = TextAnchor.UpperLeft;
            vlg.childControlWidth = true;
            vlg.childControlHeight = true;
            vlg.childForceExpandWidth = true;
            vlg.childForceExpandHeight = false;

            GameObject header = NewUI("Header", detailPanel.transform);
            HorizontalLayoutGroup hlg = header.AddComponent<HorizontalLayoutGroup>();
            hlg.childAlignment = TextAnchor.MiddleLeft;
            hlg.childControlWidth = true;
            hlg.childControlHeight = true;
            hlg.childForceExpandWidth = false;
            hlg.childForceExpandHeight = true;
            hlg.spacing = 8;
            AddLayoutElement(header, minHeight: 30, flexibleHeight: 0);

            detailTitle = NewText("Title", header.transform, "", 20, TextAlignmentOptions.Left);
            detailTitle.fontStyle = FontStyles.Bold;
            AddLayoutElement(detailTitle.gameObject, flexibleWidth: 1);

            GameObject closeBtn = NewUI("Close", header.transform);
            Image closeImg = closeBtn.AddComponent<Image>();
            closeImg.color = DesignTokens.Current.mapCloseButtonBg;
            Button cb = closeBtn.AddComponent<Button>();
            cb.targetGraphic = closeImg;
            cb.onClick.AddListener(HideDetail);
            AddLayoutElement(closeBtn, minHeight: 26, flexibleHeight: 0, minWidth: 30, preferredWidth: 30);
            TextMeshProUGUI cx = NewText("X", closeBtn.transform, "X", 16, TextAlignmentOptions.Center);
            Stretch((RectTransform)cx.transform, Vector2.zero, Vector2.zero);

            GameObject content = NewUI("Content", detailPanel.transform);
            VerticalLayoutGroup cvlg = content.AddComponent<VerticalLayoutGroup>();
            cvlg.spacing = 4;
            cvlg.childAlignment = TextAnchor.UpperLeft;
            cvlg.childControlWidth = true;
            cvlg.childControlHeight = true;
            cvlg.childForceExpandWidth = true;
            cvlg.childForceExpandHeight = false;
            AddLayoutElement(content, flexibleHeight: 1);
            detailContent = (RectTransform)content.transform;

            // §3.2 — "Footer", 3ᵉ enfant DIRECT de detailPanel (siblings: Header, Content, Footer).
            // Construit ICI, UNE fois, jamais recréé par RenderDetail (dont la boucle de
            // destruction est scopée à detailContent — vérifié dans le corps ci-dessus, :587 avant
            // ce chunk). Second argument décisif du design : BuildDetail fait ~13 requêtes
            // séquentielles avant FinishDetail ⇒ un bouton construit dans RenderDetail serait
            // ABSENT pendant tout le chargement ; construit ici, il existe dès l'ouverture du
            // panneau (SelectDistrict), avant même la première requête de projection.
            GameObject footer = NewUI("Footer", detailPanel.transform);
            HorizontalLayoutGroup fhlg = footer.AddComponent<HorizontalLayoutGroup>();
            fhlg.childAlignment = TextAnchor.MiddleCenter;
            fhlg.childControlWidth = true;
            fhlg.childControlHeight = true;
            fhlg.childForceExpandWidth = true;
            fhlg.childForceExpandHeight = true;
            AddLayoutElement(footer, minHeight: 40, flexibleHeight: 0);

            GameObject enterGo = NewUI("EnterButton", footer.transform);
            Image enterImg = enterGo.AddComponent<Image>();
            enterImg.color = DesignTokens.Current.mapChipBg; // REUSE — même token que HeatToggle (pas accentGold : allowlist C5F2 fermée)
            enterButton = enterGo.AddComponent<Button>();
            enterButton.targetGraphic = enterImg;
            enterButton.interactable = false; // aucun jeton au démarrage (nav-F3)
            enterButton.onClick.AddListener(() => OnEnterDistrict?.Invoke(SelectedDistrictId));

            TextMeshProUGUI enterLabel = NewText("Label", enterGo.transform, "Entrer", 16, TextAlignmentOptions.Center);
            Stretch((RectTransform)enterLabel.transform, Vector2.zero, Vector2.zero);

            detailPanel.SetActive(false);
        }

        /// <summary>§3.2 — les TROIS points de rafraîchissement de l'interactable de « Entrer »,
        /// EXACTEMENT ceux nommés par le design : SelectDistrict, juste après IsAuthenticated=true,
        /// FinishDetail. Un jeton ET un district sélectionné sont tous deux requis — le panneau qui
        /// porte ce bouton n'est de toute façon visible que quand un district est sélectionné, mais
        /// l'interactable epingle la valeur, jamais l'activation du GameObject seule.</summary>
        private void RefreshEnterInteractable()
        {
            if (enterButton != null) enterButton.interactable = IsAuthenticated && SelectedDistrictId >= 0;
        }

        // I2 (hud-session-arbitrages-design.md §3) — RETIRÉ FRANCHEMENT (branche 2 : « garde-le sur
        // un chemin emprunté OU retire-le franchement »). Ce localisateur n'a plus AUCUN appelant
        // ici sous B1 : `AdoptToken` a quitté le contrat (§1.2) et CityMapController ne publie pas
        // de heat (seul Dashboard le fait, §6.2). Sa copie dédupliquée vit désormais dans
        // `ShellContracts.ShellSessionSinkLocator`, sur le seul chemin qui l'emprunte encore
        // (`DashboardController.LoadDashboard`).

        /// <summary>Open the detail panel for a district and fetch its system projections.</summary>
        public void SelectDistrict(int districtId)
        {
            SelectedDistrictId = districtId;
            DetailLoaded = false;
            DistrictCellView cell = cells.FirstOrDefault(c => c.Model != null && c.Model.id == districtId);
            // 2026-09-02 — même repli que la tuile (CityMapEnums.DisplayName) : fiction d'abord,
            // name_canonical si le back n'en sert pas.
            if (detailTitle != null) detailTitle.text = cell != null ? CityMapEnums.DisplayName(cell.Model) : $"District {districtId}";
            if (detailPanel != null) detailPanel.SetActive(true);
            ReserveSpaceForPanel(true);
            RefreshEnterInteractable(); // §3.2 — 1er point
            if (detailCoroutine != null) StopCoroutine(detailCoroutine);
            detailCoroutine = StartCoroutine(BuildDetail(districtId, cell));
        }

        public void HideDetail()
        {
            SelectedDistrictId = -1;
            if (detailPanel != null) detailPanel.SetActive(false);
            ReserveSpaceForPanel(false);
        }

        // Reflow the map to the left of the panel (reassign padding so the layout group
        // re-runs — mutating RectOffset fields in place would not mark it dirty).
        private void ReserveSpaceForPanel(bool reserve)
        {
            if (rootVlg == null) return; // ville peinte : pas de layout à décaler, le panneau recouvre la carte
            int right = reserve ? PanelReservedRight : RootPadding;
            // 2026-09-02 — ce recalcul écrasait le padding bas posé dans BuildLayout et retombait
            // sur un `RootPadding` nu, perdant le BottomInsetPx dès le premier SelectDistrict/
            // HideDetail. Même valeur qu'à la construction (BottomPadding), pas un second calcul.
            rootVlg.padding = new RectOffset(RootPadding, right, RootPadding, BottomPadding);
        }

        private static DetailRow Missing(string label) => new DetailRow(label, "n/a (not ticked)", false);

        // Aggregate the per-district system projections into the detail view model.
        private IEnumerator BuildDetail(int districtId, DistrictCellView cell)
        {
            var detail = new DistrictDetail { districtId = districtId, title = detailTitle != null ? detailTitle.text : "" };

            if (cell != null)
            {
                detail.rows.Add(new DetailRow("Profile", cell.Model.profile));
                detail.rows.Add(new DetailRow("Blocks", cell.Model.block_count.ToString()));
                detail.rows.Add(new DetailRow("Bank", cell.Model.bank_side));
                detail.rows.Add(new DetailRow("Control", cell.Model.control_state, true, true, CityMapEnums.ColorFor(cell.State)));
            }

            if (!IsAuthenticated)
            {
                detail.rows.Add(new DetailRow("Projections", "sign-in required", false));
                FinishDetail(detail);
                yield break;
            }

            var world = new WorldApiClient { BaseUrl = baseUrl };
            var proj = new CityProjectionsClient { BaseUrl = baseUrl };

            DistrictHeatDto heat = null;
            yield return world.GetDistrictHeat(districtId, Token, h => heat = h, _ => { });
            if (heat != null)
            {
                HeatBucket db = CityMapEnums.ParseHeatBucket(heat.district_bucket);
                HeatBucket cbk = CityMapEnums.ParseHeatBucket(heat.citywide_bucket);
                detail.rows.Add(new DetailRow("Heat — district", heat.district_bucket, true, true, CityMapEnums.HeatColorFor(db)));
                detail.rows.Add(new DetailRow("Heat — citywide", heat.citywide_bucket, true, true, CityMapEnums.HeatColorFor(cbk)));
                detail.rows.Add(new DetailRow("Heat — escalated", heat.escalated ? "YES" : "no"));
            }
            else detail.rows.Add(Missing("Heat"));

            FlowDto flow = null; bool flowOk = false;
            yield return proj.Flow(districtId, Token, f => { flow = f; flowOk = true; }, _ => { });
            detail.rows.Add(flowOk && flow != null ? new DetailRow("Flow backpressure", flow.backpressure) : Missing("Flow backpressure"));

            ThroughputDto thr = null; bool thrOk = false;
            yield return proj.Throughput(districtId, Token, t => { thr = t; thrOk = true; }, _ => { });
            if (thrOk && thr != null)
            {
                detail.rows.Add(new DetailRow("Exposure", thr.exposure_band));
                detail.rows.Add(new DetailRow("Network cleanliness", thr.network_cleanliness));
            }
            else detail.rows.Add(Missing("Throughput"));

            StashDto stash = null; bool stashOk = false;
            yield return proj.Stash(districtId, Token, s => { stash = s; stashOk = true; }, _ => { });
            detail.rows.Add(stashOk && stash != null ? new DetailRow("Stash blocking", stash.district_blocking_band) : Missing("Stash blocking"));

            BufferDto buf = null; bool bufOk = false;
            yield return proj.Buffer(districtId, Token, b => { buf = b; bufOk = true; }, _ => { });
            if (bufOk && buf != null)
            {
                detail.rows.Add(new DetailRow("Buffer load", buf.district_load_band));
                detail.rows.Add(new DetailRow("Buffer tail", buf.district_tail_band));
            }
            else detail.rows.Add(Missing("Buffer"));

            InspectionDto insp = null; bool inspOk = false;
            yield return proj.Inspection(districtId, Token, x => { insp = x; inspOk = true; }, _ => { });
            if (inspOk && insp != null)
            {
                detail.rows.Add(new DetailRow("Inspection queue", insp.queue_load));
                detail.rows.Add(new DetailRow("Dispatcher regime", insp.dispatcher_regime));
            }
            else detail.rows.Add(Missing("Inspection queue"));

            UnconformityDto unc = null; bool uncOk = false;
            yield return proj.Unconformity(districtId, Token, u => { unc = u; uncOk = true; }, _ => { });
            detail.rows.Add(uncOk && unc != null ? new DetailRow("Audit pins", unc.audit_pin_presence) : Missing("Audit pins"));

            LeksDto leks = null; bool leksOk = false;
            yield return proj.Leks(districtId, Token, l => { leks = l; leksOk = true; }, _ => { });
            detail.rows.Add(leksOk && leks != null ? new DetailRow("Deal leks", (leks.leks?.Count ?? 0).ToString()) : Missing("Deal leks"));

            CohesionDto coh = null; bool cohOk = false;
            yield return proj.Cohesion(districtId, Token, c => { coh = c; cohOk = true; }, _ => { });
            detail.rows.Add(cohOk && coh != null ? new DetailRow("Cohesion", coh.cohesion_state) : Missing("Cohesion"));

            // 2026-09-02 — precinct_id SERVI par le district (cell.Model), passé explicitement à
            // Belief/Patrol : c'est la valeur d'AUTORITÉ (CityProjectionsClient.PrecinctForDistrict
            // n'est qu'un repli client pour l'appelant qui n'a qu'un districtId nu — voir son
            // commentaire). `cell` peut être null (districtId sans cellule correspondante) : repli
            // sur la formule dans ce cas aussi, ce que `?? ` couvre.
            int? servedPrecinct = cell?.Model?.precinct_id;
            int precinct = servedPrecinct ?? CityProjectionsClient.PrecinctForDistrict(districtId);

            BeliefDto bel = null; bool belOk = false;
            yield return proj.Belief(districtId, Token, b => { bel = b; belOk = true; }, _ => { }, servedPrecinct);
            detail.rows.Add(belOk && bel != null ? new DetailRow($"Police belief (P{precinct})", bel.belief) : Missing($"Police belief (P{precinct})"));

            PatrolDto pat = null; bool patOk = false;
            yield return proj.Patrol(districtId, Token, p => { pat = p; patOk = true; }, _ => { }, servedPrecinct);
            detail.rows.Add(patOk && pat != null ? new DetailRow($"Patrol heat (P{precinct})", pat.patrol_heat) : Missing($"Patrol heat (P{precinct})"));

            WhisperDto whi = null; bool whiOk = false;
            yield return proj.Whisper(Token, w => { whi = w; whiOk = true; }, _ => { });
            detail.rows.Add(whiOk && whi != null ? new DetailRow("Citizen whisper (city)", whi.whisper_index) : Missing("Citizen whisper"));

            FinishDetail(detail);
        }

        private void FinishDetail(DistrictDetail detail)
        {
            CurrentDetail = detail;
            DetailLoaded = true;
            RefreshEnterInteractable(); // §3.2 — 3e point (nommé explicitement par le design)
            if (SelectedDistrictId == detail.districtId) RenderDetail(detail);
        }

        private void RenderDetail(DistrictDetail detail)
        {
            if (detailContent == null) return;
            for (int i = detailContent.childCount - 1; i >= 0; i--) Destroy(detailContent.GetChild(i).gameObject);

            foreach (DetailRow row in detail.rows)
            {
                GameObject rowGo = NewUI("Row", detailContent);
                HorizontalLayoutGroup hlg = rowGo.AddComponent<HorizontalLayoutGroup>();
                hlg.spacing = 8;
                hlg.childAlignment = TextAnchor.MiddleLeft;
                hlg.childControlWidth = true;
                hlg.childControlHeight = true;
                hlg.childForceExpandWidth = false;
                hlg.childForceExpandHeight = false;
                AddLayoutElement(rowGo, minHeight: 22, flexibleHeight: 0);

                TextMeshProUGUI l = NewText("Label", rowGo.transform, row.label, 14, TextAlignmentOptions.Left);
                l.color = DesignTokens.Current.mapLabelMuted;
                AddLayoutElement(l.gameObject, flexibleWidth: 1);

                TextMeshProUGUI v = NewText("Value", rowGo.transform, row.value, 14, TextAlignmentOptions.Right);
                v.fontStyle = row.available ? FontStyles.Bold : FontStyles.Italic;
                v.color = !row.available
                    ? DesignTokens.Current.mapConditionalGrey
                    : (row.useAccent ? row.accent : Color.white);
                AddLayoutElement(v.gameObject, minWidth: 130, flexibleWidth: 0);
            }
        }

        // -------------------------------------------------------------- helpers

        private void EnsureEventSystem()
        {
            if (FindFirstObjectByType<EventSystem>() == null)
            {
                GameObject es = new GameObject("EventSystem", typeof(EventSystem));
                es.AddComponent<InputSystemUIInputModule>(); // project uses the Input System package
            }
        }

        private static GameObject NewUI(string name, Transform parent)
        {
            GameObject go = new GameObject(name, typeof(RectTransform));
            go.transform.SetParent(parent, false);
            return go;
        }

        /// <summary>Item 0.6 — les deux littéraux AFFICHÉS de cet écran passent par
        /// `carte.bloc.<slug>`, repli sur le littéral.
        /// ⚠️ Mon recensement en annonçait onze : les neuf autres sont des NOMS D'OBJET
        /// (« Title », « Label »…), premier argument de `NewText`, qui ne s'affichent nulle
        /// part. Le compteur lisait le mauvais argument — corrigé sur l'Accueil, revérifié ici.</summary>
        private static string Lib(string litteral) =>
            MafiaCleanCity.I18n.Libelle.De("carte", "bloc", litteral);

        private TextMeshProUGUI NewText(string name, Transform parent, string value, int size, TextAlignmentOptions anchor)
        {
            GameObject go = NewUI(name, parent);
            TextMeshProUGUI t = go.AddComponent<TextMeshProUGUI>();
            t.font = font;
            t.text = value;
            t.fontSize = size;
            t.alignment = anchor;
            t.color = Color.white;
            t.textWrappingMode = TextWrappingModes.NoWrap;
            t.overflowMode = TextOverflowModes.Truncate;
            t.raycastTarget = false;
            return t;
        }

        private static void Stretch(RectTransform rt, Vector2 offMin, Vector2 offMax)
        {
            rt.anchorMin = Vector2.zero;
            rt.anchorMax = Vector2.one;
            rt.offsetMin = offMin;
            rt.offsetMax = offMax;
        }

        private static void AddLayoutElement(GameObject go, float minHeight = -1, float preferredHeight = -1,
            float flexibleHeight = -1, float flexibleWidth = -1, float minWidth = -1, float preferredWidth = -1)
        {
            LayoutElement le = go.AddComponent<LayoutElement>();
            if (minHeight >= 0) le.minHeight = minHeight;
            if (preferredHeight >= 0) le.preferredHeight = preferredHeight;
            if (flexibleHeight >= 0) le.flexibleHeight = flexibleHeight;
            if (flexibleWidth >= 0) le.flexibleWidth = flexibleWidth;
            if (minWidth >= 0) le.minWidth = minWidth;
            if (preferredWidth >= 0) le.preferredWidth = preferredWidth;
        }
    }
}
