using System.Collections;
using System.Collections.Generic;
using System.Linq;
using UnityEngine;
using UnityEngine.EventSystems;
using UnityEngine.InputSystem.UI;
using UnityEngine.UI;

namespace MafiaCleanCity.CityMap
{
    // Drives the City Map screen:
    //   1. fetches /v1/world/districts (public) and builds a two-column layout grouped
    //      by bank_side, one DistrictCellView per district coloured by control_state;
    //   2. signs in (POST /auth/v1/signin) to get a Bearer token;
    //   3. fetches the JWT-gated Heat projection per district and shows a heat badge
    //      on each cell — a togglable overlay.
    //
    // The whole UI is built programmatically from a single Canvas so the scene needs
    // almost no manual wiring — the controller find-or-creates the Canvas + EventSystem.
    public class CityMapController : MonoBehaviour
    {
        [Header("Backend")]
        [Tooltip("Public game API base. /v1 districts is unauthed; heat needs a token.")]
        [SerializeField] private string baseUrl = "https://cleancity.erutheone.eu";

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

        private readonly List<DistrictCellView> cells = new List<DistrictCellView>();
        private RectTransform northContent;
        private RectTransform southContent;
        private Text toggleLabel;
        private Font font;

        private GameObject detailPanel;
        private RectTransform detailContent;
        private Text detailTitle;
        private Coroutine detailCoroutine;
        private VerticalLayoutGroup rootVlg;

        // Right padding reserved for the detail panel (380 wide + 16 margin + gap) so the
        // banks reflow to the left instead of being covered when the panel is open.
        private const int PanelReservedRight = 408;
        private const int RootPadding = 16;

        private void Start()
        {
            font = Resources.GetBuiltinResource<Font>("LegacyRuntime.ttf");
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

        private IEnumerator AuthThenHeat()
        {
            var auth = new AuthClient { BaseUrl = baseUrl };
            string token = null;
            string err = null;
            yield return auth.SignIn(demoIdentifier, demoPassword, t => token = t, e => err = e);

            if (err != null || string.IsNullOrEmpty(token))
            {
                AuthError = err ?? "sign-in returned no token";
                Debug.LogError($"[CityMap] auth failed: {AuthError}");
                yield break;
            }

            Token = token;
            IsAuthenticated = true;
            Debug.Log("[CityMap] Signed in — Bearer token acquired.");

            yield return LoadHeat();
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
                RectTransform parent = bank == BankSide.South ? southContent : northContent;
                if (bank == BankSide.South) SouthCount++; else NorthCount++;

                DistrictCellView cell = BuildCell(parent);
                cell.Bind(dto, cell.GetComponent<Image>(), cell.GetComponentInChildren<Text>());
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
            NorthCount = 0;
            SouthCount = 0;
            HeatLoaded = false;
        }

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

            GameObject root = NewUI("CityMapRoot", canvas.transform);
            RectTransform rootRt = (RectTransform)root.transform;
            Stretch(rootRt, Vector2.zero, Vector2.zero);
            Image rootBg = root.AddComponent<Image>();
            rootBg.color = new Color(0.10f, 0.11f, 0.14f, 1f);
            rootVlg = root.AddComponent<VerticalLayoutGroup>();
            rootVlg.padding = new RectOffset(RootPadding, RootPadding, RootPadding, RootPadding);
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

            Text title = NewText("Title", header.transform, "CITY MAP  —  Districts", 28, TextAnchor.MiddleLeft);
            title.fontStyle = FontStyle.Bold;
            AddLayoutElement(title.gameObject, flexibleWidth: 1);

            BuildToggleButton(header.transform);

            // Banks row: two columns side by side, filling remaining height.
            GameObject banks = NewUI("Banks", root.transform);
            HorizontalLayoutGroup banksHlg = banks.AddComponent<HorizontalLayoutGroup>();
            banksHlg.spacing = 12;
            banksHlg.childControlWidth = true;
            banksHlg.childControlHeight = true;
            banksHlg.childForceExpandWidth = true;
            banksHlg.childForceExpandHeight = true;
            AddLayoutElement(banks, flexibleHeight: 1);

            northContent = BuildColumn(banks.transform, "North Bank", new Color(0.13f, 0.15f, 0.20f));
            southContent = BuildColumn(banks.transform, "South Bank", new Color(0.18f, 0.14f, 0.16f));

            BuildLegend(root.transform);
            BuildDetailPanel(canvas.transform);
        }

        private void BuildToggleButton(Transform parent)
        {
            GameObject btn = NewUI("HeatToggle", parent);
            Image img = btn.AddComponent<Image>();
            img.color = new Color(0.22f, 0.24f, 0.30f);
            Button button = btn.AddComponent<Button>();
            button.targetGraphic = img;
            AddLayoutElement(btn, minHeight: 36, flexibleHeight: 0, minWidth: 210, preferredWidth: 210);

            toggleLabel = NewText("Label", btn.transform, "", 16, TextAnchor.MiddleCenter);
            Stretch((RectTransform)toggleLabel.transform, new Vector2(8, 4), new Vector2(-8, -4));

            button.onClick.AddListener(() => SetHeatOverlay(!heatOverlayOn));
            UpdateToggleLabel();
        }

        private void UpdateToggleLabel()
        {
            if (toggleLabel != null)
            {
                toggleLabel.text = heatOverlayOn ? "Heat overlay: ON" : "Heat overlay: OFF";
            }
        }

        private RectTransform BuildColumn(Transform parent, string header, Color panelColor)
        {
            GameObject col = NewUI(header.Replace(" ", ""), parent);
            Image colBg = col.AddComponent<Image>();
            colBg.color = panelColor;
            VerticalLayoutGroup vlg = col.AddComponent<VerticalLayoutGroup>();
            vlg.padding = new RectOffset(8, 8, 8, 8);
            vlg.spacing = 6;
            vlg.childAlignment = TextAnchor.UpperCenter;
            vlg.childControlWidth = true;
            vlg.childControlHeight = true;
            vlg.childForceExpandWidth = true;
            vlg.childForceExpandHeight = false;
            AddLayoutElement(col, flexibleWidth: 1);

            Text h = NewText("Header", col.transform, header.ToUpperInvariant(), 20, TextAnchor.MiddleCenter);
            h.fontStyle = FontStyle.Bold;
            AddLayoutElement(h.gameObject, minHeight: 32, flexibleHeight: 0);

            return (RectTransform)col.transform;
        }

        private DistrictCellView BuildCell(Transform parent)
        {
            GameObject cell = NewUI("DistrictCell", parent);
            Image bg = cell.AddComponent<Image>();
            bg.color = Color.gray;
            AddLayoutElement(cell, minHeight: 40, preferredHeight: 40, flexibleHeight: 0);

            Text label = NewText("Label", cell.transform, "", 16, TextAnchor.MiddleLeft);
            RectTransform labelRt = (RectTransform)label.transform;
            Stretch(labelRt, new Vector2(10, 2), new Vector2(-94, -2)); // leave room for the heat badge

            // Heat badge — right-anchored. Hidden until heat is fetched.
            GameObject badge = NewUI("HeatBadge", cell.transform);
            RectTransform badgeRt = (RectTransform)badge.transform;
            badgeRt.anchorMin = new Vector2(1f, 0.5f);
            badgeRt.anchorMax = new Vector2(1f, 0.5f);
            badgeRt.pivot = new Vector2(1f, 0.5f);
            badgeRt.sizeDelta = new Vector2(80f, 24f);
            badgeRt.anchoredPosition = new Vector2(-8f, 0f);
            Image badgeBg = badge.AddComponent<Image>();
            badgeBg.color = CityMapEnums.HeatColorFor(HeatBucket.Unknown);
            badgeBg.raycastTarget = false; // let clicks fall through to the cell button
            Text badgeLabel = NewText("HeatLabel", badge.transform, "", 12, TextAnchor.MiddleCenter);
            Stretch((RectTransform)badgeLabel.transform, Vector2.zero, Vector2.zero);

            DistrictCellView view = cell.AddComponent<DistrictCellView>();
            view.AttachHeatBadge(badge, badgeBg, badgeLabel);

            // The whole cell is a button → opens the district detail panel.
            Button cellButton = cell.AddComponent<Button>();
            cellButton.targetGraphic = bg;
            cellButton.onClick.AddListener(() => SelectDistrict(view.Model.id));

            return view;
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

            AddLegendItem(legend.transform, "Uncontested", CityMapEnums.ColorFor(ControlState.Uncontested));
            AddLegendItem(legend.transform, "Contested", CityMapEnums.ColorFor(ControlState.Contested));
            AddLegendItem(legend.transform, "Player held", CityMapEnums.ColorFor(ControlState.PlayerHeld));
            AddLegendItem(legend.transform, "Rival held", CityMapEnums.ColorFor(ControlState.RivalHeld));
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

            Text t = NewText("Caption", item.transform, label, 14, TextAnchor.MiddleLeft);
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
            dp.sizeDelta = new Vector2(380f, -16f);
            dp.anchoredPosition = new Vector2(-16f, -16f);

            Image bg = detailPanel.AddComponent<Image>();
            bg.color = new Color(0.07f, 0.08f, 0.11f, 0.98f);

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

            detailTitle = NewText("Title", header.transform, "", 20, TextAnchor.MiddleLeft);
            detailTitle.fontStyle = FontStyle.Bold;
            AddLayoutElement(detailTitle.gameObject, flexibleWidth: 1);

            GameObject closeBtn = NewUI("Close", header.transform);
            Image closeImg = closeBtn.AddComponent<Image>();
            closeImg.color = new Color(0.32f, 0.20f, 0.22f);
            Button cb = closeBtn.AddComponent<Button>();
            cb.targetGraphic = closeImg;
            cb.onClick.AddListener(HideDetail);
            AddLayoutElement(closeBtn, minHeight: 26, flexibleHeight: 0, minWidth: 30, preferredWidth: 30);
            Text cx = NewText("X", closeBtn.transform, "X", 16, TextAnchor.MiddleCenter);
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

            detailPanel.SetActive(false);
        }

        /// <summary>Open the detail panel for a district and fetch its system projections.</summary>
        public void SelectDistrict(int districtId)
        {
            SelectedDistrictId = districtId;
            DetailLoaded = false;
            DistrictCellView cell = cells.FirstOrDefault(c => c.Model != null && c.Model.id == districtId);
            if (detailTitle != null) detailTitle.text = cell != null ? cell.Model.name_canonical : $"District {districtId}";
            if (detailPanel != null) detailPanel.SetActive(true);
            ReserveSpaceForPanel(true);
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
            if (rootVlg == null) return;
            int right = reserve ? PanelReservedRight : RootPadding;
            rootVlg.padding = new RectOffset(RootPadding, right, RootPadding, RootPadding);
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

            BeliefDto bel = null; bool belOk = false;
            yield return proj.Belief(districtId, Token, b => { bel = b; belOk = true; }, _ => { });
            int precinct = CityProjectionsClient.PrecinctForDistrict(districtId);
            detail.rows.Add(belOk && bel != null ? new DetailRow($"Police belief (P{precinct})", bel.belief) : Missing($"Police belief (P{precinct})"));

            PatrolDto pat = null; bool patOk = false;
            yield return proj.Patrol(districtId, Token, p => { pat = p; patOk = true; }, _ => { });
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

                Text l = NewText("Label", rowGo.transform, row.label, 14, TextAnchor.MiddleLeft);
                l.color = new Color(0.66f, 0.68f, 0.74f);
                AddLayoutElement(l.gameObject, flexibleWidth: 1);

                Text v = NewText("Value", rowGo.transform, row.value, 14, TextAnchor.MiddleRight);
                v.fontStyle = row.available ? FontStyle.Bold : FontStyle.Italic;
                v.color = !row.available
                    ? new Color(0.5f, 0.5f, 0.55f)
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

        private Text NewText(string name, Transform parent, string value, int size, TextAnchor anchor)
        {
            GameObject go = NewUI(name, parent);
            Text t = go.AddComponent<Text>();
            t.font = font;
            t.text = value;
            t.fontSize = size;
            t.alignment = anchor;
            t.color = Color.white;
            t.horizontalOverflow = HorizontalWrapMode.Overflow;
            t.verticalOverflow = VerticalWrapMode.Truncate;
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
