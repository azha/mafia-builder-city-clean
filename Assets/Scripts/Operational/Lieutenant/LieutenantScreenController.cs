using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.EventSystems;
using UnityEngine.InputSystem.UI;
using UnityEngine.UI;
using MafiaCleanCity.CityMap; // REUSE AuthClient (signin → Bearer)

namespace MafiaCleanCity.Operational.Lieutenant
{
    // Phase-9 vector #9 — drives the Lieutenant rule-editor screen (screen_4a) for the COOK loop.
    //
    // T1 scope (this file): the screen SHELL + the Recruit section.
    //   1. signs in (POST /auth/v1/signin) to get a PLAYER Bearer — REUSE CityMap.AuthClient;
    //   2. offers a "Recruit COOK" button → POST /v1/lieutenants { archetype:"COOK", assigned_building_id } →
    //      stores the returned lieutenant_id + shows the outcome;
    //   3. a status line that reports the last outcome (recruited / a readable error — never a raw HTTP code, F2).
    //
    // Mirrors MafiaCleanCity.Operational.BuildingCardController's shell exactly: a single programmatic Canvas
    // (CanvasScaler + GraphicRaycaster), a VerticalLayoutGroup card, the same status-row / action-button builders +
    // slate palette + a11y glyphs, EnsureInitialized() (lazy + idempotent so the controller is safe to drive before
    // Start), public state props as PlayMode test hooks, and a Destroyed guard on every async resume.
    //
    // DEFERRED to the next tasks (NOT built here): the status-bands render (T2), the guided rule-builder + DSL-source
    // serializer + validate/attach + diagnostics (T3), the PlayMode E2E capstone (T4). This is the recruit-only shell.
    public class LieutenantScreenController : MonoBehaviour
    {
        [Header("Backend")]
        [SerializeField] private string baseUrl = "https://cleancity.erutheone.eu";

        [Header("Demo sign-in (seeded by Tools/seed_operational_demo.mjs)")]
        [SerializeField] private string demoIdentifier = "operational_demo@example.test";
        [SerializeField] private string demoPassword = "operational-demo-pw";

        [Header("Assigned building (the building to recruit the picked archetype on)")]
        [Tooltip("Player-owned operational building uuid (the assigned/source/host building). Set before Start (or set AssignedBuildingId).")]
        [SerializeField] private string assignedBuildingId = "";

        [Header("Target building (the 2nd building for LOGISTICS/LAUNDERING/DISTRIBUTION)")]
        [Tooltip("Player-owned operational building uuid — the dispatch destination / safehouse. Only used when the picked archetype NeedsTarget.")]
        [SerializeField] private string targetBuildingId = "";

        // ---- Public state (PlayMode test hooks) -------------------------------
        /// <summary>True once a PLAYER Bearer has been acquired (SignIn succeeded).</summary>
        public bool IsAuthenticated { get; private set; }
        /// <summary>The PLAYER Bearer token (null until SignIn succeeds).</summary>
        public string Token { get; private set; }
        /// <summary>Sign-in error message, if any (a readable sentence; null on success).</summary>
        public string AuthError { get; private set; }
        /// <summary>The lieutenant_id returned by the last successful Recruit (a uuid; null until recruited).</summary>
        public string LastRecruitedId { get; private set; }
        /// <summary>A short status string reporting the last outcome (recruited / a readable error — never a raw code).</summary>
        public string LastOutcome { get; private set; }
        /// <summary>The last-fetched lieutenant band projection (T2 test hook): the closed-domain bands + the
        /// player-authored script_source. Null until a successful RefreshBands. R2.2 — closed-domain strings only
        /// (plus script_source, the one allowed readable field).</summary>
        public LieutenantBands CurrentBands { get; private set; }
        /// <summary>True once the Status section has rendered at least one band row (a successful RefreshBands).</summary>
        public bool StatusShown { get; private set; }
        /// <summary>The full set of text shown to the player (labels + values) — used by the E2E to prove no raw
        /// scalar leaks client-side (R2.2), mirroring BuildingCardController.RenderedTexts.</summary>
        public IReadOnlyList<string> RenderedTexts => renderedTexts;
        /// <summary>The last-fetched lieutenant ROSTER (B2 test hook): one band-only row per delegated lieutenant the
        /// player owns (GET /v1/lieutenants). Empty array (never null) until a successful RefreshRoster, and [] when the
        /// player owns no lieutenant. R2.2 — each row is the identity uuid + closed-domain band strings only.</summary>
        public RosterRow[] CurrentRoster { get; private set; } = System.Array.Empty<RosterRow>();

        // ---- T3 Rule-builder test hooks ---------------------------------------
        /// <summary>The authored rule rows (T3 test hook). The PlayMode test populates these directly via SetRules /
        /// AddRule / ClearRules (no UI interaction needed) and reads them back; the Validate/Attach buttons serialize
        /// them via RuleModel.SerializeRules. Read-only view — mutate through the API below so the UI re-renders.</summary>
        public IReadOnlyList<RuleRow> Rules => rules;
        /// <summary>The last diagnostics rendered by Validate/Attach (T3 test hook). Empty after a successful validate/
        /// attach (the area is cleared) and never null — the no-leak scan + the diagnostics-case assertion read it.</summary>
        public DslDiagnostic[] LastDiagnostics { get; private set; } = System.Array.Empty<DslDiagnostic>();

        /// <summary>The grayed locked-tier teaser labels currently shown (B3 test hook) — the DISPLAY-ONLY locked
        /// triggers, actions, and the AND_IF combinator, each with its 🔒 lock hint. Derived directly from the
        /// RuleModel catalogues (it does NOT read the live UI), so it is non-empty whenever the teaser renders. These
        /// are intentional UI chrome (they carry tier NUMBERS by design) and are deliberately KEPT OUT of RenderedTexts
        /// — the no-raw-scalar scan covers the BAND corpus, not the locked teaser (see BuildLockedTeaser).</summary>
        public IReadOnlyList<string> LockedPrimitiveLabels => RuleModel.LockedPrimitiveLabels();

        /// <summary>The (assigned/source/host) building the Recruit action assigns the picked lieutenant to. Settable before SignIn/Recruit.</summary>
        public string AssignedBuildingId { get => assignedBuildingId; set => assignedBuildingId = value; }

        /// <summary>The TARGET building (dispatch destination / safehouse) for a 2-building archetype
        /// (LOGISTICS/LAUNDERING/DISTRIBUTION). Ignored for the single-building archetypes. Settable before Recruit.</summary>
        public string TargetBuildingId { get => targetBuildingId; set => targetBuildingId = value; }

        // ---- B1 archetype picker --------------------------------------------------
        // The currently-PICKED recruit archetype (the picker cycles RuleModel.Archetypes). The Recruit button recruits THIS
        // archetype; the target input row shows only when RuleModel.NeedsTarget(PickedArchetype). Defaults to the first
        // archetype (COOK). Settable directly as a test hook (the PlayMode test picks an archetype without UI interaction);
        // setting it re-renders the recruit section (the target row + the button label follow) AND, when no lieutenant is
        // selected yet, switches the builder palette (CurrentArchetype follows the pick before any recruit).
        [SerializeField] private string pickedArchetype = "COOK";
        /// <summary>The archetype the Recruit button will recruit (the picker selection). Set re-renders the recruit row +
        /// (pre-recruit) switches the builder palette. Unknown values are accepted but the recruit will 422 server-side.</summary>
        public string PickedArchetype
        {
            get => pickedArchetype;
            set
            {
                pickedArchetype = value;
                EnsureInitialized();
                if (Destroyed) return;
                RenderRecruitSection();
                // Pre-recruit, the builder palette follows the picker; reset any in-progress rule rows to the new palette's
                // first field so a stale field from another archetype never lingers on the builder.
                if (CurrentBands == null)
                {
                    RealignRulesToArchetype(CurrentArchetype);
                    RenderRuleRows();
                }
            }
        }

        /// <summary>The archetype whose field palette the rule-builder is CURRENTLY using: the selected/recruited
        /// lieutenant's archetype (CurrentBands.archetype, set after a recruit/select) if any, else the picked archetype
        /// (so the builder offers the right fields before the first recruit). Test hook.</summary>
        public string CurrentArchetype =>
            (CurrentBands != null && !string.IsNullOrEmpty(CurrentBands.archetype)) ? CurrentBands.archetype : pickedArchetype;

        /// <summary>
        /// Override the backend base URL (test convenience). The SerializeField defaults to localhost; a PlayMode E2E
        /// that drives the LOCAL dockerized stack sets this BEFORE SignIn so the auth + lieutenant clients both target it.
        /// Re-points the already-built clients too (idempotent; safe before or after EnsureInitialized).
        /// </summary>
        public void SetBaseUrl(string url)
        {
            baseUrl = url;
            if (auth != null) auth.BaseUrl = url;
            if (client != null) client.BaseUrl = url;
        }

        private readonly List<string> renderedTexts = new List<string>();
        private readonly List<Text> textComponents = new List<Text>();

        private Font font;
        private RectTransform statusRows;
        private RectTransform actionBar;
        private Text outcomeText;
        private Button recruitButton;
        // ---- B1 recruit section (archetype picker + target input) -------------
        private Text pickerLabel;              // the archetype cycle button's live caption.
        private Text recruitButtonLabel;       // the Recruit button's live caption ("Recruit COOK" → follows the pick).
        private GameObject targetRow;          // the target-building input row — shown only when NeedsTarget(picked).
        // ---- T2 Status section -------------------------------------------------
        private RectTransform statusSection;   // holds the Status section label + the Refresh button + the script block.
        private Button refreshButton;          // re-fetches the bands (GET /v1/lieutenants/:id).
        private Text scriptSourceText;         // the player-authored DSL text block (the ONE allowed non-band field).

        // ---- B2 Roster section -------------------------------------------------
        private RectTransform rosterSection;   // holds the Roster section label + the "Refresh roster" button + the rows.
        private RectTransform rosterRows;      // the container the per-lieutenant roster rows render into.

        // ---- T3 Rule-builder section ------------------------------------------
        private readonly List<RuleRow> rules = new List<RuleRow>();  // the authored rule model (test hook: Rules/SetRules).
        private RectTransform builderSection;  // holds the rule-builder label + the per-rule rows + the +Add/Validate/Attach.
        private RectTransform ruleRows;        // the container the per-rule editor rows render into.
        private RectTransform diagnosticsArea; // where RenderDiagnostics lists the 422 diagnostics (cleared on success).

        private AuthClient auth;
        private LieutenantClient client;

        // Slate palette (mirrors BuildingCardController + global_conventions_core direction).
        private static readonly Color SurfaceBg = new Color(0.086f, 0.098f, 0.106f); // #16191b
        private static readonly Color RowBg = new Color(0.137f, 0.165f, 0.176f);     // #232a2d
        private static readonly Color TextPrimary = new Color(0.933f, 0.945f, 0.949f);
        private static readonly Color AccentMild = new Color(0.263f, 0.878f, 0.753f);   // #43e0c0 cyan
        private static readonly Color AccentModerate = new Color(1f, 0.62f, 0.239f);    // #ff9e3d amber
        private static readonly Color AccentSevere = new Color(1f, 0.353f, 0.302f);     // #ff5a4d red
        private static readonly Color CtaColor = new Color(1f, 0.824f, 0.247f);         // #ffd23f yellow
        // B3 locked-tier teaser: a single dim/disabled colour for the grayed, non-selectable locked primitives (the
        // teaser lines + their section header). Distinctly dimmer than TextPrimary so "locked" reads at a glance.
        private static readonly Color LockedDim = new Color(0.42f, 0.45f, 0.49f);       // #6b7380 muted slate

        // Teardown/cancellation guard (the SAME pattern as BuildingCardController): an async Recruit coroutine driven
        // by an OUTSIDE pump (the PlayMode test runner) can resume after this controller's GameObject was destroyed by
        // an inter-fixture teardown → dereferencing torn-down UI → NullReferenceException. Every async resume that
        // precedes a UI mutation checks this and no-ops. Triggers only on a genuinely destroyed object.
        private bool destroyed;
        private bool Destroyed => destroyed || this == null;

        private void OnDestroy()
        {
            destroyed = true;
        }

        private void Start()
        {
            EnsureInitialized();
            StartCoroutine(Boot());
        }

        // Lazily build clients + the UI so the controller is safe to drive (SignIn / Recruit) before Start() has run —
        // e.g. an E2E that calls SignIn() in the same frame as AddComponent. Idempotent.
        private bool initialized;
        private void EnsureInitialized()
        {
            if (initialized) return;
            initialized = true;
            font = Resources.GetBuiltinResource<Font>("LegacyRuntime.ttf");
            auth = new AuthClient { BaseUrl = baseUrl };
            client = new LieutenantClient { BaseUrl = baseUrl };
            BuildLayout();
            EnsureEventSystem();
        }

        private IEnumerator Boot()
        {
            yield return SignIn();
        }

        /// <summary>Sign in and acquire a Bearer (REUSE AuthClient). Idempotent.</summary>
        public IEnumerator SignIn()
        {
            EnsureInitialized();
            if (IsAuthenticated) yield break;
            string token = null, err = null;
            yield return auth.SignIn(demoIdentifier, demoPassword, t => token = t, e => err = e);
            if (err != null || string.IsNullOrEmpty(token))
            {
                AuthError = err ?? "sign-in returned no token";
                Debug.LogError($"[Lieutenant] auth failed: {AuthError}");
                yield break;
            }
            Token = token;
            IsAuthenticated = true;
        }

        /// <summary>Set the player Bearer directly (test convenience when already signed in elsewhere).</summary>
        public void SetToken(string token)
        {
            Token = token;
            IsAuthenticated = !string.IsNullOrEmpty(token);
        }

        // ----------------------------------------------------------- recruit (T1)

        /// <summary>Recruit the PICKED archetype on the assigned building (POST /v1/lieutenants). For a 2-building archetype
        /// (LOGISTICS/LAUNDERING/DISTRIBUTION) the target_building_id is sent too (else omitted). On success stores the
        /// lieutenant_id + shows the outcome + pulls the fresh bands (so the builder palette follows the recruited
        /// archetype); on failure shows a readable error (never a raw HTTP code, F2). The backend is authoritative — a
        /// wrong building/type/missing-target returns a readable 404/409/422 surfaced here.</summary>
        public IEnumerator RecruitChosen()
        {
            EnsureInitialized();
            if (!IsAuthenticated) { SetOutcome("Sign in first.", AccentSevere); yield break; }

            string archetype = pickedArchetype;
            string id = null;
            long errCode = 0;
            string errMsg = null;
            // A 2-building archetype sends its target_building_id; a single-building archetype omits it (pass null).
            string target = RuleModel.NeedsTarget(archetype) ? targetBuildingId : null;
            yield return client.Recruit(archetype, assignedBuildingId, target, Token,
                ok => id = ok,
                (code, msg) => { errCode = code; errMsg = msg; });

            // The POST is a network round-trip; this controller's GameObject may have been destroyed by an inter-fixture
            // teardown while we awaited it. Bail before touching any UI.
            if (Destroyed) yield break;

            if (!string.IsNullOrEmpty(id))
            {
                LastRecruitedId = id;
                SetOutcome($"{archetype} recruited.", AccentMild);
                // Pull the fresh lieutenant bands so the Status section reflects the just-recruited lieutenant (CurrentBands
                // .archetype set → the rule-builder palette switches to this archetype's fields).
                yield return RefreshBands();
                if (!Destroyed)
                {
                    // The recruited archetype is now CurrentArchetype (CurrentBands.archetype); realign any in-progress rule
                    // rows to its palette + re-render so the builder offers the right fields (no stale cross-archetype field).
                    RealignRulesToArchetype(CurrentArchetype);
                    RenderRuleRows();
                }
            }
            else
            {
                // Surface the readable error message (F2) — the raw code is kept on the log line only.
                Debug.LogError($"[Lieutenant] recruit failed ({errCode}): {errMsg}");
                SetOutcome(errMsg ?? "Recruit failed.", AccentSevere);
            }
        }

        /// <summary>Back-compat shim — Phase-9 callers/tests recruit COOK via this entry point. Picks COOK then recruits.</summary>
        public IEnumerator RecruitCook()
        {
            PickedArchetype = "COOK";
            yield return RecruitChosen();
        }

        // ----------------------------------------------------------- status bands (T2)

        /// <summary>Fetch + render the lieutenant band projection for the last-recruited lieutenant (GET
        /// /v1/lieutenants/:id). Called after a successful recruit and from the Refresh button. On success stores
        /// CurrentBands + renders the band rows; on failure shows a readable status (never a raw HTTP code, F2) and
        /// leaves the previously-rendered bands intact. No-ops cleanly when nothing has been recruited yet.</summary>
        public IEnumerator RefreshBands()
        {
            EnsureInitialized();
            if (!IsAuthenticated) { SetOutcome("Sign in first.", AccentSevere); yield break; }
            if (string.IsNullOrEmpty(LastRecruitedId)) { SetOutcome("Recruit a lieutenant first.", AccentModerate); yield break; }

            yield return client.GetBands(LastRecruitedId, Token,
                bands => { CurrentBands = bands; },
                (code, msg) =>
                {
                    // F2: surface the readable error — the raw code is kept on the log line only.
                    Debug.LogError($"[Lieutenant] status failed ({code}): {msg}");
                    SetOutcome("Status failed — " + msg, AccentSevere);
                });

            // The GET is a network round-trip; bail before touching UI if torn down by an inter-fixture teardown.
            if (Destroyed) yield break;

            if (CurrentBands != null) RenderBands();
        }

        // ----------------------------------------------------------- roster (B2)

        /// <summary>Fetch + render the player's lieutenant ROSTER (GET /v1/lieutenants). On success stores CurrentRoster
        /// + renders one row per lieutenant (archetype + op_state band + an Open button); a player with no lieutenant
        /// yields an empty roster (rendered as a friendly empty line, NOT an error). On failure shows a readable status
        /// (never a raw HTTP code, F2) and leaves the previously-rendered roster intact. Called from the "Refresh roster"
        /// button.</summary>
        public IEnumerator RefreshRoster()
        {
            EnsureInitialized();
            if (!IsAuthenticated) { SetOutcome("Sign in first.", AccentSevere); yield break; }

            yield return client.ListLieutenants(Token,
                rows => { CurrentRoster = rows; RenderRoster(); },
                (code, msg) =>
                {
                    // F2: surface the readable error — the raw code is kept on the log line only.
                    Debug.LogError($"[Lieutenant] roster failed ({code}): {msg}");
                    SetOutcome("Roster failed — " + msg, AccentSevere);
                });
        }

        /// <summary>Select a lieutenant from the roster (the Open button / B2 test hook): point the current-lieutenant id
        /// (LastRecruitedId — the SAME field Recruit/RefreshBands/Validate/Attach use) at `id`, then RefreshBands() so its
        /// bands load. Loading the bands sets CurrentBands.archetype → CurrentArchetype switches the builder palette, and
        /// the script_source renders READ-ONLY in the Status section. Re-parsing the source into editable RuleRows is
        /// DEFERRED (re-authoring replaces the whole script) — Open does NOT round-trip the source into the builder.</summary>
        public void OpenLieutenant(string id)
        {
            if (string.IsNullOrEmpty(id)) return;
            EnsureInitialized();
            if (Destroyed) return;
            // REUSE the existing current-lieutenant id field — no parallel selection state. RefreshBands reads it.
            LastRecruitedId = id;
            StartCoroutine(RefreshBands());
        }

        // ----------------------------------------------------------- rule-builder (T3)

        /// <summary>Replace the authored rules wholesale (T3 test hook — the PlayMode test builds the demo rules without
        /// touching the UI). Re-renders the rule rows + the live preview. A null arg clears the list.</summary>
        public void SetRules(List<RuleRow> newRules)
        {
            rules.Clear();
            if (newRules != null) rules.AddRange(newRules);
            EnsureInitialized();
            if (!Destroyed) RenderRuleRows();
        }

        /// <summary>Append one authored rule (T3 test hook / the +Add button). Re-renders the rule rows.</summary>
        public void AddRule(RuleRow row)
        {
            if (row == null) return;
            rules.Add(row);
            EnsureInitialized();
            if (!Destroyed) RenderRuleRows();
        }

        /// <summary>Remove all authored rules (T3 test hook). Re-renders the (now empty) rule rows.</summary>
        public void ClearRules()
        {
            rules.Clear();
            EnsureInitialized();
            if (!Destroyed) RenderRuleRows();
        }

        // A default rule for the +Add button — the CURRENT archetype's FIRST palette field, its trigger kind, its first
        // comparator, a sensible default value, EXECUTE_DEFAULT, mid-priority. The player then edits it via the dropdowns/
        // slider. Uses CurrentArchetype so a +Add on a SECURITY lieutenant seeds a building_damaged rule, not a COOK one.
        private RuleRow NewDefaultRule()
        {
            FieldSpec f = RuleModel.FieldsFor(CurrentArchetype)[0];
            return new RuleRow(
                f.TriggerKind, f.Key, f.Comparators[0],
                f.IsBool ? "true" : "0",
                RuleModel.Actions[0],
                (RuleModel.PriorityMin + RuleModel.PriorityMax) / 2);
        }

        // Realign any in-progress rule rows to a (new) archetype's palette: any rule whose field is NOT in the archetype's
        // palette is reset to the palette's first field (its trigger kind / first comparator / a default value), so a stale
        // field from another archetype never lingers on the builder when the archetype switches (e.g. after picking
        // SECURITY, a leftover COOK `heat` rule becomes a `building_damaged` rule). Rules already on a valid palette field
        // are left untouched. Does NOT re-render — the caller re-renders.
        private void RealignRulesToArchetype(string archetype)
        {
            FieldSpec[] palette = RuleModel.FieldsFor(archetype);
            FieldSpec first = palette[0];
            for (int i = 0; i < rules.Count; i++)
            {
                RuleRow r = rules[i];
                bool inPalette = false;
                for (int j = 0; j < palette.Length; j++)
                    if (palette[j].Key == r.field) { inPalette = true; break; }
                if (inPalette) continue;
                r.field = first.Key;
                r.triggerKind = first.TriggerKind;
                r.comparator = first.Comparators[0];
                r.value = first.IsBool ? "true" : "0";
            }
        }

        /// <summary>Serialize the authored rules to a DSL `source` and DRY-RUN validate it against the backend (POST
        /// .../behavior-script/validate). On 200 → outcome "Script valid ✓" + the diagnostics area is cleared; on a
        /// non-2xx → RenderDiagnostics(details, message). No-ops cleanly when nothing has been recruited yet.</summary>
        public IEnumerator ValidateRules()
        {
            EnsureInitialized();
            if (!IsAuthenticated) { SetOutcome("Sign in first.", AccentSevere); yield break; }
            if (string.IsNullOrEmpty(LastRecruitedId)) { SetOutcome("Recruit a lieutenant first.", AccentModerate); yield break; }

            string source = RuleModel.SerializeRules(rules);
            yield return client.ValidateScript(LastRecruitedId, source, Token,
                onValid: () =>
                {
                    if (Destroyed) return;
                    ClearDiagnostics();
                    SetOutcome("Script valid ✓", AccentMild);
                },
                onInvalid: (code, details, msg) =>
                {
                    if (Destroyed) return;
                    Debug.LogError($"[Lieutenant] validate rejected ({code}): {msg}");
                    RenderDiagnostics(details, msg);
                });
        }

        /// <summary>Serialize the authored rules and ATTACH them (POST .../behavior-script). On 200 → outcome
        /// "Attached ✓", clear diagnostics, and RefreshBands() so the status updates (rule_count_band → FEW +
        /// script_source round-trips); on a non-2xx → RenderDiagnostics. No-ops when nothing has been recruited.</summary>
        public IEnumerator AttachRules()
        {
            EnsureInitialized();
            if (!IsAuthenticated) { SetOutcome("Sign in first.", AccentSevere); yield break; }
            if (string.IsNullOrEmpty(LastRecruitedId)) { SetOutcome("Recruit a lieutenant first.", AccentModerate); yield break; }

            string source = RuleModel.SerializeRules(rules);
            bool attached = false;
            yield return client.AttachScript(LastRecruitedId, source, Token,
                onAttached: () =>
                {
                    if (Destroyed) return;
                    attached = true;
                    ClearDiagnostics();
                    SetOutcome("Attached ✓", AccentMild);
                },
                onInvalid: (code, details, msg) =>
                {
                    if (Destroyed) return;
                    Debug.LogError($"[Lieutenant] attach rejected ({code}): {msg}");
                    RenderDiagnostics(details, msg);
                });

            // The POST is a network round-trip; bail before any further UI/coroutine if torn down by a teardown.
            if (Destroyed) yield break;

            // On a successful attach, pull the fresh bands so the Status section reflects the new script (rule_count_band
            // → FEW + the script_source round-trips). RefreshBands has its own auth/recruit/Destroyed guards.
            if (attached) yield return RefreshBands();
        }

        // Render the structured DSL diagnostics (the 422 `details`) as readable lines in the diagnostics area, plus the
        // backend's human `message` as a header (F2 — never a raw HTTP code). Each diagnostic → "Line {line}:{col} —
        // {message} [{kind}]". Stores LastDiagnostics (test hook). When `details` is empty (e.g. a 404 not-owned, or a
        // malformed body), we still show the readable message so the player isn't left silent. The client never judges
        // validity — it renders exactly what the backend returned.
        private void RenderDiagnostics(DslDiagnostic[] details, string message)
        {
            LastDiagnostics = details ?? System.Array.Empty<DslDiagnostic>();
            if (Destroyed) return;

            ClearDiagnosticsRows();

            // Header line — the readable error message (F2). The diagnostics-area header is band-safe (a sentence, no
            // raw scalar) so it stays in the scan corpus; the per-diagnostic lines carry the player's own DSL spans.
            string header = string.IsNullOrEmpty(message) ? "Script rejected." : message;
            SetOutcome(header, AccentSevere);

            int n = LastDiagnostics.Length;
            if (diagnosticsArea != null)
            {
                if (n == 0)
                {
                    AddDiagnosticLine(header, AccentSevere);
                }
                else
                {
                    for (int i = 0; i < n; i++)
                    {
                        DslDiagnostic d = LastDiagnostics[i];
                        string line = $"Line {d.line}:{d.col} — {d.message} [{d.kind}]";
                        AddDiagnosticLine(line, AccentSevere);
                    }
                }
            }
        }

        // Clear the diagnostics area + the LastDiagnostics hook (on a successful validate/attach).
        private void ClearDiagnostics()
        {
            LastDiagnostics = System.Array.Empty<DslDiagnostic>();
            ClearDiagnosticsRows();
        }

        // Destroy the rendered diagnostic line GameObjects (independent of the rest of the screen).
        private void ClearDiagnosticsRows()
        {
            if (diagnosticsArea == null) return;
            for (int i = diagnosticsArea.childCount - 1; i >= 0; i--)
                Object.Destroy(diagnosticsArea.GetChild(i).gameObject);
        }

        // One diagnostic line in the diagnostics area. The text carries the player's OWN authored DSL spans (line/col)
        // + the backend's plain-English message — NOT a band corpus, so it is deliberately KEPT OUT of renderedTexts
        // (the no-raw-scalar scan), like script_source: it legitimately references the player's own rule positions.
        private void AddDiagnosticLine(string text, Color color)
        {
            Text t = NewText("Diagnostic", diagnosticsArea, text, 13, TextAnchor.UpperLeft);
            t.color = color;
            t.verticalOverflow = VerticalWrapMode.Overflow;
            AddLayoutElement(t.gameObject, minHeight: 20, flexibleHeight: 0);
            // Track only the COMPONENT, not the string — excluded from the no-raw-scalar scan (player's own spans).
            if (!textComponents.Contains(t)) textComponents.Add(t);
        }

        // ----------------------------------------------------------- rendering

        // Set the outcome status text + the public LastOutcome hook (re-tracked for the no-raw-scalar scan).
        private void SetOutcome(string text, Color accent)
        {
            LastOutcome = text;
            if (Destroyed) return;
            if (outcomeText != null)
            {
                outcomeText.text = text;
                outcomeText.color = accent;
            }
            TrackText(outcomeText, text);
        }

        // --------------------------------------------------------------- status render (T2)

        // Rebuild the status rows from CurrentBands. Each band → glyph (shape — a11y F2, never colour-only) + worded
        // label + worded value (a closed-domain map → human text). NO raw scalar leaks (R2.2): every band cell is a
        // worded label, never the raw role_id / rules-count / delegation bool / tick. The script_source block (the
        // player's OWN authored DSL — the one explicitly-allowed readable non-band field) is rendered as readable text
        // below the rows; it is deliberately KEPT OUT of the no-raw-scalar scan corpus (renderedTexts) because it
        // legitimately carries the player's own numbers (priorities / comparator values) — the T4 scan excludes it.
        private void RenderBands()
        {
            if (Destroyed) return;
            LieutenantBands b = CurrentBands;
            if (b == null) return;

            ClearStatusRows();

            // archetype (COOK | SECURITY | LOGISTICS | BOOKKEEPER | LAUNDERING | DISTRIBUTION | UNKNOWN).
            AddStatusRow("Archetype", ArchetypeLabel(b.archetype), "[*]", AccentMild);
            // granted_role (advisory | executor | delegated_owner | cohort_overseer).
            AddStatusRow("Role", GrantedRoleLabel(b.granted_role), GrantedRoleGlyph(b.granted_role), AccentMild);
            // mode (tasked | delegated).
            AddStatusRow("Mode", ModeLabel(b.mode), ModeGlyph(b.mode), AccentMild);
            // op_state_band (ACTIVE | PAUSED | IDLE) — the delegated operational state.
            AddStatusRow("State", OpStateLabel(b.op_state_band), OpStateGlyph(b.op_state_band), OpStateAccent(b.op_state_band));
            // rule_count_band (NONE | FEW | MANY) — the behavior-script rule count as a band (never the raw count).
            AddStatusRow("Rules", RuleCountLabel(b.rule_count_band), RuleCountGlyph(b.rule_count_band), RuleCountAccent(b.rule_count_band));

            RenderScriptSource(b.script_source);

            StatusShown = true;
        }

        // Render the player-authored DSL source as a readable text block (the ONE explicitly-allowed non-band field;
        // spec §7 — the player WROTE it, so it reads back). Shows "(no script yet)" when empty (a fresh recruit). The
        // content is tracked as a Text COMPONENT (so a re-render can find it) but its STRING is NOT added to the
        // no-raw-scalar scan corpus (renderedTexts) — it legitimately contains the player's own scalars (priorities /
        // values), and the T4 scan covers the BAND rows, not the player's authored text.
        private void RenderScriptSource(string source)
        {
            if (Destroyed) return;
            bool empty = string.IsNullOrEmpty(source);
            string shown = empty ? "(no script yet)" : source;
            if (scriptSourceText != null)
            {
                scriptSourceText.text = shown;
                scriptSourceText.color = empty ? new Color(0.55f, 0.59f, 0.63f) : TextPrimary;
                scriptSourceText.fontStyle = empty ? FontStyle.Italic : FontStyle.Normal;
                // Track only the COMPONENT (not the string) — script_source is the allowed readable field, excluded from
                // the no-raw-scalar scan; the "(no script yet)" placeholder is band-safe but we keep the policy uniform.
                if (!textComponents.Contains(scriptSourceText)) textComponents.Add(scriptSourceText);
            }
        }

        // Clear just the band rows (statusRows) — independent of the script_source block (a persistent Text in the
        // status section). Mirrors BuildingCardController.ClearRows but scoped to the bands; it also prunes the band
        // rows' tracked text from renderedTexts so the no-raw-scalar scan reflects only the CURRENT render.
        private void ClearStatusRows()
        {
            renderedTexts.Clear();
            textComponents.Clear();
            // The outcome line is part of the live screen text too — re-track it so a fresh render keeps it in the scan.
            if (outcomeText != null) { textComponents.Add(outcomeText); if (!string.IsNullOrEmpty(LastOutcome)) renderedTexts.Add(LastOutcome); }
            if (statusRows != null)
                for (int i = statusRows.childCount - 1; i >= 0; i--)
                    Object.Destroy(statusRows.GetChild(i).gameObject);
        }

        // ----- archetype band (COOK | SECURITY | LOGISTICS | BOOKKEEPER | LAUNDERING | DISTRIBUTION | UNKNOWN) -----
        // EXHAUSTIVE over LieutenantProjectionService.ArchetypeBand (LieutenantArchetype + UNKNOWN).
        private static string ArchetypeLabel(string a)
        {
            switch (a)
            {
                case "COOK": return "Cook";
                case "SECURITY": return "Security";
                case "LOGISTICS": return "Logistics";
                case "BOOKKEEPER": return "Bookkeeper";
                case "LAUNDERING": return "Laundering";
                case "DISTRIBUTION": return "Distribution";
                case "UNKNOWN": return "Unknown";
                default: return string.IsNullOrEmpty(a) ? "—" : a;
            }
        }

        // ----- granted_role band (advisory | executor | delegated_owner | cohort_overseer) — EXHAUSTIVE over GrantedRoleBand -----
        private static string GrantedRoleLabel(string r)
        {
            switch (r)
            {
                case "advisory": return "Advisory";
                case "executor": return "Executor";
                case "delegated_owner": return "Delegated owner";
                case "cohort_overseer": return "Cohort overseer";
                default: return string.IsNullOrEmpty(r) ? "—" : r;
            }
        }
        // A distinct shape per role (a11y F2 — shape carries meaning alongside colour).
        private static string GrantedRoleGlyph(string r) =>
            r == "advisory" ? "[?]" : r == "executor" ? "[>]" : r == "delegated_owner" ? "[@]" : r == "cohort_overseer" ? "[#]" : "[-]";

        // ----- mode band (tasked | delegated) — EXHAUSTIVE over ModeBand -----
        private static string ModeLabel(string m)
        {
            switch (m)
            {
                case "tasked": return "Tasked";
                case "delegated": return "Delegated";
                default: return string.IsNullOrEmpty(m) ? "—" : m;
            }
        }
        private static string ModeGlyph(string m) => m == "delegated" ? "[>>]" : m == "tasked" ? "[>]" : "[-]";

        // ----- op_state_band (ACTIVE | PAUSED | IDLE) — EXHAUSTIVE over OpStateBand -----
        // R2.2: the delegation_paused bool + live cook state surface ONLY as this band. ACTIVE=working (mild),
        // PAUSED=script halted ops (severe), IDLE=quiet (moderate).
        private static string OpStateLabel(string s)
        {
            switch (s)
            {
                case "ACTIVE": return "Active";
                case "PAUSED": return "Paused";
                case "IDLE": return "Idle";
                default: return string.IsNullOrEmpty(s) ? "—" : s;
            }
        }
        private static string OpStateGlyph(string s) =>
            s == "ACTIVE" ? "[>]" : s == "PAUSED" ? "[||]" : s == "IDLE" ? "[..]" : "[-]";
        private static Color OpStateAccent(string s) =>
            s == "ACTIVE" ? AccentMild : s == "PAUSED" ? AccentSevere : AccentModerate;

        // ----- rule_count_band (NONE | FEW | MANY) — EXHAUSTIVE over RuleCountBand. R2.2: the raw rule count NEVER -----
        // surfaces; the player sees the band. A 2-segment fill gauge (shape encodes the level — a11y F2).
        private static string RuleCountLabel(string b)
        {
            switch (b)
            {
                case "NONE": return "No rules";
                case "FEW": return "A few rules";
                case "MANY": return "Many rules";
                default: return string.IsNullOrEmpty(b) ? "—" : b;
            }
        }
        private static string RuleCountGlyph(string b) =>
            b == "MANY" ? "[##]" : b == "FEW" ? "[#.]" : b == "NONE" ? "[..]" : "[-]";
        private static Color RuleCountAccent(string b) =>
            b == "MANY" ? AccentMild : b == "FEW" ? AccentMild : b == "NONE" ? AccentModerate : AccentSevere;

        // --------------------------------------------------------------- layout

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

            // Dim backdrop (the City Map would sit behind in-game).
            GameObject backdrop = NewUI("LieutenantBackdrop", canvas.transform);
            Stretch((RectTransform)backdrop.transform, Vector2.zero, Vector2.zero);
            backdrop.AddComponent<Image>().color = new Color(0.05f, 0.05f, 0.06f, 0.85f);

            // The bottom-sheet card, anchored bottom-centre (mirrors BuildingCardController).
            GameObject card = NewUI("LieutenantSheet", canvas.transform);
            RectTransform cardRt = (RectTransform)card.transform;
            cardRt.anchorMin = new Vector2(0.5f, 0f);
            cardRt.anchorMax = new Vector2(0.5f, 0f);
            cardRt.pivot = new Vector2(0.5f, 0f);
            cardRt.sizeDelta = new Vector2(560, 1180); // B3: title + roster + status bands + script + rule-builder (+ locked teaser) + recruit + outcome.
            cardRt.anchoredPosition = new Vector2(0, 24);
            card.AddComponent<Image>().color = SurfaceBg;
            VerticalLayoutGroup vlg = card.AddComponent<VerticalLayoutGroup>();
            vlg.padding = new RectOffset(18, 18, 16, 16);
            vlg.spacing = 10;
            vlg.childControlWidth = true;
            vlg.childControlHeight = true;
            vlg.childForceExpandWidth = true;
            vlg.childForceExpandHeight = false;

            Text titleText = NewText("Title", card.transform, "LIEUTENANT", 22, TextAnchor.MiddleLeft);
            titleText.fontStyle = FontStyle.Bold;
            AddLayoutElement(titleText.gameObject, minHeight: 30, flexibleHeight: 0);
            TrackText(titleText, "LIEUTENANT");

            // Roster section (B2): a section label + a "Refresh roster" button + one row per delegated lieutenant. Built
            // directly under the title so the player picks a lieutenant here, then its bands + script render in the Status
            // section below. Open(row) selects the lieutenant (→ RefreshBands loads its bands incl. archetype → palette).
            GameObject roster = NewUI("RosterSection", card.transform);
            VerticalLayoutGroup rovlg = roster.AddComponent<VerticalLayoutGroup>();
            rovlg.spacing = 6;
            rovlg.childControlWidth = true;
            rovlg.childControlHeight = true;
            rovlg.childForceExpandWidth = true;
            rovlg.childForceExpandHeight = false;
            rosterSection = (RectTransform)roster.transform;
            AddLayoutElement(roster, flexibleHeight: 0);
            BuildRosterSection();

            // Status rows container (used by T2 to render the bands; declared now so the shell layout is complete).
            GameObject rows = NewUI("StatusRows", card.transform);
            VerticalLayoutGroup rvlg = rows.AddComponent<VerticalLayoutGroup>();
            rvlg.spacing = 6;
            rvlg.childControlWidth = true;
            rvlg.childControlHeight = true;
            rvlg.childForceExpandWidth = true;
            rvlg.childForceExpandHeight = false;
            statusRows = (RectTransform)rows.transform;
            AddLayoutElement(rows, flexibleHeight: 0);

            // Status section (T2): the section label + a Refresh button + the player-authored script block. Built BELOW
            // the band rows (statusRows) so the bands render directly under the title, with the Refresh + script beneath.
            GameObject status = NewUI("StatusSection", card.transform);
            VerticalLayoutGroup svlg = status.AddComponent<VerticalLayoutGroup>();
            svlg.spacing = 6;
            svlg.childControlWidth = true;
            svlg.childControlHeight = true;
            svlg.childForceExpandWidth = true;
            svlg.childForceExpandHeight = false;
            statusSection = (RectTransform)status.transform;
            AddLayoutElement(status, flexibleHeight: 0);
            BuildStatusSection();

            // Rule-builder section (T3): the section label + the per-rule editor rows + the +Add / Validate / Attach
            // buttons + the diagnostics area. Built BELOW the status section, ABOVE the recruit action bar.
            GameObject builder = NewUI("BuilderSection", card.transform);
            VerticalLayoutGroup bvlg = builder.AddComponent<VerticalLayoutGroup>();
            bvlg.spacing = 6;
            bvlg.childControlWidth = true;
            bvlg.childControlHeight = true;
            bvlg.childForceExpandWidth = true;
            bvlg.childForceExpandHeight = false;
            builderSection = (RectTransform)builder.transform;
            AddLayoutElement(builder, flexibleHeight: 0);
            BuildRuleBuilderSection();

            // Action bar (the Recruit section).
            GameObject actions = NewUI("ActionBar", card.transform);
            VerticalLayoutGroup avlg = actions.AddComponent<VerticalLayoutGroup>();
            avlg.spacing = 6;
            avlg.childControlWidth = true;
            avlg.childControlHeight = true;
            avlg.childForceExpandWidth = true;
            avlg.childForceExpandHeight = false;
            actionBar = (RectTransform)actions.transform;
            AddLayoutElement(actions, flexibleHeight: 1);

            BuildRecruitSection();
        }

        // The Recruit section (B1): a section label + an ARCHETYPE PICKER (a cycle button over RuleModel.Archetypes) +
        // an assigned-building row + a CONDITIONAL target-building row (shown only when the picked archetype NeedsTarget) +
        // a "Recruit <archetype>" button + an outcome status line. Mirrors the building-card action-button + status-line
        // pattern. The button drives RecruitChosen() as a coroutine (recruits the PICKED archetype).
        private void BuildRecruitSection()
        {
            NewSectionLabel(actionBar, "RECRUIT — pick an archetype + assign");

            // Archetype picker — a tap-to-cycle button over the 6 recruitable archetypes (RuleModel.Archetypes). Advancing
            // it changes PickedArchetype, which re-renders this section (target row + button label follow) + (pre-recruit)
            // switches the builder palette. We keep the live caption so the next render shows the new pick.
            GameObject pickerRow = NewUI("ArchetypePicker", actionBar);
            HorizontalLayoutGroup phlg = pickerRow.AddComponent<HorizontalLayoutGroup>();
            phlg.spacing = 6;
            phlg.childAlignment = TextAnchor.MiddleLeft;
            phlg.childControlWidth = true;
            phlg.childControlHeight = true;
            phlg.childForceExpandWidth = false;
            phlg.childForceExpandHeight = true;
            AddLayoutElement(pickerRow, minHeight: 30, flexibleHeight: 0);

            Text pickerCap = NewText("PickerCap", pickerRow.transform, "Archetype", 14, TextAnchor.MiddleLeft);
            pickerCap.color = new Color(0.72f, 0.76f, 0.80f);
            AddLayoutElement(pickerCap.gameObject, minWidth: 90, flexibleWidth: 0);
            TrackText(pickerCap, "Archetype");

            Button pick = AddCycleButton(pickerRow.transform, "Archetype",
                () => ArchetypeLabel(pickedArchetype),
                CyclePickedArchetype);
            pickerLabel = pick.GetComponentInChildren<Text>();

            // Assigned-building row caption (the field itself is configured via the SerializeField / AssignedBuildingId hook;
            // the M1 demo seeds it, so the screen does not need a free-text uuid editor here — the row is a readable label).
            NewSectionLabel(actionBar, "Assigned building (set by the seeder / AssignedBuildingId)");

            // Conditional target-building row — built once, shown/hidden by RenderRecruitSection per NeedsTarget(picked).
            targetRow = NewUI("TargetRow", actionBar);
            VerticalLayoutGroup tvlg = targetRow.AddComponent<VerticalLayoutGroup>();
            tvlg.spacing = 2;
            tvlg.childControlWidth = true;
            tvlg.childControlHeight = true;
            tvlg.childForceExpandWidth = true;
            tvlg.childForceExpandHeight = false;
            AddLayoutElement(targetRow, flexibleHeight: 0);
            NewSectionLabel(targetRow.transform, "Target building (destination / safehouse — set by TargetBuildingId)");

            recruitButton = AddActionButton(actionBar, RecruitButtonText(pickedArchetype), () => StartCoroutine(RecruitChosen()));
            recruitButtonLabel = recruitButton.GetComponentInChildren<Text>();

            outcomeText = NewText("Outcome", actionBar, "—", 15, TextAnchor.MiddleLeft);
            outcomeText.color = new Color(0.72f, 0.76f, 0.80f);
            AddLayoutElement(outcomeText.gameObject, minHeight: 24, flexibleHeight: 0);
            TrackText(outcomeText, "—");

            RenderRecruitSection();
        }

        // Advance the picked archetype to the next recruitable one (wraps RuleModel.Archetypes). Re-renders the recruit
        // section + (pre-recruit) switches the builder palette via the PickedArchetype setter.
        private void CyclePickedArchetype()
        {
            string[] all = RuleModel.Archetypes;
            int idx = 0;
            for (int i = 0; i < all.Length; i++)
                if (all[i] == pickedArchetype) { idx = i; break; }
            PickedArchetype = all[(idx + 1) % all.Length];
        }

        // Re-render the recruit section's archetype-dependent parts: the picker caption, the Recruit button label, and the
        // target-row visibility (shown only for a 2-building archetype). Idempotent + Destroyed-guarded.
        private void RenderRecruitSection()
        {
            if (Destroyed) return;
            if (pickerLabel != null) pickerLabel.text = ArchetypeLabel(pickedArchetype);
            if (recruitButtonLabel != null) recruitButtonLabel.text = RecruitButtonText(pickedArchetype);
            if (targetRow != null) targetRow.SetActive(RuleModel.NeedsTarget(pickedArchetype));
        }

        // The Recruit button caption for an archetype ("Recruit Cook" / "Recruit Security" …).
        private static string RecruitButtonText(string archetype) => "Recruit " + ArchetypeLabel(archetype);

        // The Status section (T2): a section label + a Refresh button (re-fetch the bands) + the player-authored script
        // text block. The band ROWS render into statusRows (above); this section holds the controls + the script. The
        // Refresh button drives RefreshBands() as a coroutine. Mirrors the building-card action-button + status-line style.
        private void BuildStatusSection()
        {
            NewSectionLabel(statusSection, "STATUS — delegated lieutenant");

            refreshButton = AddActionButton(statusSection, "Refresh", () => StartCoroutine(RefreshBands()));

            // Script-source sub-label + the readable DSL block (the ONE allowed non-band field). Empty until a script is
            // attached (T3); shows "(no script yet)" so a fresh recruit reads clearly.
            NewSectionLabel(statusSection, "Behavior script");
            scriptSourceText = NewText("ScriptSource", statusSection, "(no script yet)", 13, TextAnchor.UpperLeft);
            scriptSourceText.color = new Color(0.55f, 0.59f, 0.63f);
            scriptSourceText.fontStyle = FontStyle.Italic;
            scriptSourceText.verticalOverflow = VerticalWrapMode.Overflow;
            AddLayoutElement(scriptSourceText.gameObject, minHeight: 40, flexibleHeight: 0);
            // NOT TrackText'd: script_source is the player-authored field, excluded from the no-raw-scalar scan corpus.
            textComponents.Add(scriptSourceText);
        }

        // ----------------------------------------------------------- roster UI (B2)

        // The Roster section (B2): a section label + a "Refresh roster" button (re-fetch GET /v1/lieutenants) + a rows
        // container the per-lieutenant rows render into. The button drives RefreshRoster() as a coroutine. Mirrors the
        // Status-section idiom (section label + action button + a rows container) 1:1.
        private void BuildRosterSection()
        {
            NewSectionLabel(rosterSection, "ROSTER — your lieutenants");

            AddActionButton(rosterSection, "Refresh roster", () => StartCoroutine(RefreshRoster()));

            GameObject rows = NewUI("RosterRows", rosterSection);
            VerticalLayoutGroup rvlg = rows.AddComponent<VerticalLayoutGroup>();
            rvlg.spacing = 6;
            rvlg.childControlWidth = true;
            rvlg.childControlHeight = true;
            rvlg.childForceExpandWidth = true;
            rvlg.childForceExpandHeight = false;
            rosterRows = (RectTransform)rows.transform;
            AddLayoutElement(rows, flexibleHeight: 0);

            RenderRoster();
        }

        // Rebuild the roster rows from CurrentRoster. Each lieutenant → one row: an archetype glyph + worded archetype
        // label + the op_state band (worded) + an "Open" button that selects it (OpenLieutenant → RefreshBands → the
        // builder palette + the status bands + the read-only script follow). An empty roster renders a friendly empty
        // line, never an error. R2.2: every cell is a worded band/label — the uuid stays on the Open button's closure,
        // never shown; no raw scalar leaks.
        private void RenderRoster()
        {
            if (Destroyed || rosterRows == null) return;
            ClearRosterRows(); // prune the prior rows' tracked text from the scan corpus, THEN rebuild (parity with ClearStatusRows).

            if (CurrentRoster == null || CurrentRoster.Length == 0)
            {
                Text empty = NewText("NoLieutenants", rosterRows, "(no lieutenants — recruit one below)", 13, TextAnchor.MiddleLeft);
                empty.color = new Color(0.55f, 0.59f, 0.63f);
                empty.fontStyle = FontStyle.Italic;
                AddLayoutElement(empty.gameObject, minHeight: 22, flexibleHeight: 0);
                TrackText(empty, "(no lieutenants — recruit one below)");
                return;
            }

            for (int i = 0; i < CurrentRoster.Length; i++)
                BuildRosterRow(CurrentRoster[i], i);
        }

        // Destroy the current roster rows AND prune their tracked text from the shared no-raw-scalar scan corpus
        // (textComponents/renderedTexts) — scoped to rosterRows so it does NOT wipe the Status section's tracked text the
        // way the global ClearStatusRows does. Without this, repeated "Refresh roster" clicks accumulate now-destroyed Text
        // components + duplicate strings in the corpus (RenderedTexts). Mirrors ClearStatusRows' prune-then-render intent.
        private void ClearRosterRows()
        {
            if (rosterRows == null) return;
            for (int i = rosterRows.childCount - 1; i >= 0; i--)
            {
                GameObject child = rosterRows.GetChild(i).gameObject;
                foreach (Text t in child.GetComponentsInChildren<Text>(true))
                {
                    textComponents.Remove(t);
                    renderedTexts.Remove(t.text); // remove one matching occurrence (TrackText added this exact string).
                }
                Object.Destroy(child);
            }
        }

        // One roster row: archetype glyph + worded archetype label + the op_state band (worded) + an "Open" button. The
        // Open button captures the row's lieutenant_id and calls OpenLieutenant(id) (selects it → RefreshBands). Mirrors
        // the AddStatusRow horizontal-row idiom (glyph + label + value), plus a trailing compact action button.
        private void BuildRosterRow(RosterRow row, int index)
        {
            GameObject go = NewUI("RosterRow_" + index, rosterRows);
            go.AddComponent<Image>().color = RowBg;
            HorizontalLayoutGroup hlg = go.AddComponent<HorizontalLayoutGroup>();
            hlg.padding = new RectOffset(10, 10, 6, 6);
            hlg.spacing = 10;
            hlg.childAlignment = TextAnchor.MiddleLeft;
            hlg.childControlWidth = true;
            hlg.childControlHeight = true;
            hlg.childForceExpandWidth = false;
            hlg.childForceExpandHeight = true;
            AddLayoutElement(go, minHeight: 30, flexibleHeight: 0);

            // Archetype glyph (shape — a11y F2, never colour-only) + worded label.
            Text g = NewText("Glyph", go.transform, ArchetypeGlyph(row.archetype), 16, TextAnchor.MiddleCenter);
            g.color = AccentMild;
            g.fontStyle = FontStyle.Bold;
            AddLayoutElement(g.gameObject, minWidth: 46, preferredWidth: 46, flexibleWidth: 0);

            Text label = NewText("Archetype", go.transform, ArchetypeLabel(row.archetype), 15, TextAnchor.MiddleLeft);
            label.color = new Color(0.72f, 0.76f, 0.80f);
            AddLayoutElement(label.gameObject, minWidth: 120, flexibleWidth: 1);

            // op_state band (ACTIVE | PAUSED | IDLE), worded + colour-coded like the Status section's State row.
            Text state = NewText("State", go.transform, OpStateLabel(row.op_state_band), 15, TextAnchor.MiddleRight);
            state.color = OpStateAccent(row.op_state_band);
            state.fontStyle = FontStyle.Bold;
            AddLayoutElement(state.gameObject, minWidth: 90, flexibleWidth: 0);

            // Open — select this lieutenant (→ RefreshBands loads its bands + switches the builder palette). The
            // lieutenant_id is captured in the closure (an opaque key); it is never rendered.
            string capturedId = row.lieutenant_id;
            AddActionButton(go.transform, "Open", () => OpenLieutenant(capturedId));

            TrackText(g, ArchetypeGlyph(row.archetype));
            TrackText(label, ArchetypeLabel(row.archetype));
            TrackText(state, OpStateLabel(row.op_state_band));
        }

        // A distinct shape per archetype (a11y F2 — shape carries meaning alongside colour). EXHAUSTIVE over the roster's
        // ArchetypeBand domain (the 6 recruitable archetypes + UNKNOWN); an unknown value falls back to a neutral glyph.
        private static string ArchetypeGlyph(string a)
        {
            switch (a)
            {
                case "COOK": return "[C]";
                case "SECURITY": return "[S]";
                case "BOOKKEEPER": return "[B]";
                case "LOGISTICS": return "[L]";
                case "LAUNDERING": return "[W]";
                case "DISTRIBUTION": return "[D]";
                default: return "[-]";
            }
        }

        // ----------------------------------------------------------- rule-builder UI (T3)

        // The Rule-builder section: a section label, the per-rule editor rows (rendered by RenderRuleRows), the
        // +Add/Validate/Attach buttons, and the diagnostics area. Mirrors the building-card section/builder idioms
        // (section label + action buttons + a rows container). The guided builder authors the player's OWN DSL — R2.2
        // is not violated (the values shown are the player's, like script_source).
        private void BuildRuleBuilderSection()
        {
            NewSectionLabel(builderSection, "RULE BUILDER — author a behavior script");

            // The per-rule editor rows render here (one editor block per RuleRow).
            GameObject rows = NewUI("RuleRows", builderSection);
            VerticalLayoutGroup rvlg = rows.AddComponent<VerticalLayoutGroup>();
            rvlg.spacing = 6;
            rvlg.childControlWidth = true;
            rvlg.childControlHeight = true;
            rvlg.childForceExpandWidth = true;
            rvlg.childForceExpandHeight = false;
            ruleRows = (RectTransform)rows.transform;
            AddLayoutElement(rows, flexibleHeight: 0);

            // +Add rule / Validate / Attach controls.
            AddActionButton(builderSection, "+ Add rule", () => AddRule(NewDefaultRule()));
            AddActionButton(builderSection, "Validate", () => StartCoroutine(ValidateRules()));
            AddActionButton(builderSection, "Attach", () => StartCoroutine(AttachRules()));

            // The diagnostics area — RenderDiagnostics lists the 422 details here (cleared on a successful validate/attach).
            NewSectionLabel(builderSection, "Diagnostics");
            GameObject diags = NewUI("DiagnosticsArea", builderSection);
            VerticalLayoutGroup dvlg = diags.AddComponent<VerticalLayoutGroup>();
            dvlg.spacing = 3;
            dvlg.childControlWidth = true;
            dvlg.childControlHeight = true;
            dvlg.childForceExpandWidth = true;
            dvlg.childForceExpandHeight = false;
            diagnosticsArea = (RectTransform)diags.transform;
            AddLayoutElement(diags, minHeight: 20, flexibleHeight: 0);

            // B3 locked-tier teaser — grayed, non-selectable hints of the primitives beyond the executable subset.
            // Built LAST in the builder section so it stays visually subordinate to the live (executable) controls.
            BuildLockedTeaser();

            RenderRuleRows();
        }

        // ----------------------------------------------------------- locked-tier teaser (B3)

        // Render the locked-tier TEASER: a grayed, NON-interactive block hinting at the DSL primitives beyond the slice
        // executable subset (STATE/EVENT triggers + EXECUTE_DEFAULT/PAUSE_OPS actions). Each locked primitive is a PLAIN
        // Text label (NOT a Button) in the dim LockedDim colour with a 🔒 hint — it CANNOT be selected, and it is NEVER
        // added to any cycle set (the executable CycleField/CycleAction reach only RuleModel.FieldsFor/Actions). The
        // catalogues (RuleModel.LockedTriggers/LockedActions/LockedCombinator) are grounded VERBATIM in the backend
        // grammar; the labels carry tier NUMBERS by design, so — like script_source / the NL preview / the diagnostics
        // lines — they are deliberately KEPT OUT of the no-raw-scalar scan corpus (renderedTexts): we track only the
        // Text COMPONENT (so a re-render can find it), never the string. The teaser is built once (static catalogues).
        private void BuildLockedTeaser()
        {
            NewSectionLabel(builderSection, "🔒 Locked — unlock with tier progression");

            GameObject teaser = NewUI("LockedTeaser", builderSection);
            VerticalLayoutGroup tvlg = teaser.AddComponent<VerticalLayoutGroup>();
            tvlg.spacing = 2;
            tvlg.childControlWidth = true;
            tvlg.childControlHeight = true;
            tvlg.childForceExpandWidth = true;
            tvlg.childForceExpandHeight = false;
            RectTransform teaserRows = (RectTransform)teaser.transform;
            AddLayoutElement(teaser, flexibleHeight: 0);

            AddLockedLine(teaserRows, "Triggers");
            foreach (RuleModel.LockedPrimitive p in RuleModel.LockedTriggers)
                AddLockedLine(teaserRows, "  " + p.Label);

            AddLockedLine(teaserRows, "Actions");
            foreach (RuleModel.LockedPrimitive p in RuleModel.LockedActions)
                AddLockedLine(teaserRows, "  " + p.Label);

            AddLockedLine(teaserRows, "Combinator");
            AddLockedLine(teaserRows, "  " + RuleModel.LockedCombinator.Label);
        }

        // One grayed teaser line: a plain (non-interactive) dim Text — NOT a Button, so it is NOT selectable. Tracked as
        // a Text COMPONENT only; its STRING is NOT added to renderedTexts (the no-raw-scalar scan corpus) because the
        // locked labels carry tier numbers as intentional UI chrome — the SAME excluded-from-scan technique as
        // script_source / the NL preview / the diagnostics lines (see those comments).
        private void AddLockedLine(Transform parent, string text)
        {
            Text t = NewText("Locked", parent, text, 12, TextAnchor.MiddleLeft);
            t.color = LockedDim;
            AddLayoutElement(t.gameObject, minHeight: 18, flexibleHeight: 0);
            // Track only the COMPONENT, not the string — excluded from the no-raw-scalar scan (intentional UI chrome).
            if (!textComponents.Contains(t)) textComponents.Add(t);
        }

        // Rebuild the per-rule editor rows from the `rules` model. Each rule → a row with: a field dropdown (drives the
        // trigger kind + value-type + comparator set), a comparator dropdown, a value editor (a bool toggle for a bool
        // field / a numeric input for a numeric one), an action dropdown, a priority slider, a live NL preview line, and
        // a remove button. The dropdowns are simple cycle-buttons (tap to advance) — the building-card programmatic
        // style, functional not pixel-perfect. Mutating a control updates the RuleRow + re-renders that row's preview.
        private void RenderRuleRows()
        {
            if (Destroyed || ruleRows == null) return;
            for (int i = ruleRows.childCount - 1; i >= 0; i--)
                Object.Destroy(ruleRows.GetChild(i).gameObject);

            if (rules.Count == 0)
            {
                Text empty = NewText("NoRules", ruleRows, "(no rules — tap “+ Add rule”)", 13, TextAnchor.MiddleLeft);
                empty.color = new Color(0.55f, 0.59f, 0.63f);
                empty.fontStyle = FontStyle.Italic;
                AddLayoutElement(empty.gameObject, minHeight: 22, flexibleHeight: 0);
                return;
            }

            for (int i = 0; i < rules.Count; i++)
                BuildRuleEditor(rules[i], i);
        }

        // One rule's editor block. The dropdowns are tap-to-cycle buttons (no uGUI Dropdown prefab needed) — minimal +
        // functional, the building-card idiom. Each control mutates the RuleRow and refreshes the preview.
        private void BuildRuleEditor(RuleRow rule, int index)
        {
            GameObject block = NewUI("RuleEditor_" + index, ruleRows);
            block.AddComponent<Image>().color = RowBg;
            VerticalLayoutGroup vlg = block.AddComponent<VerticalLayoutGroup>();
            vlg.padding = new RectOffset(8, 8, 6, 6);
            vlg.spacing = 4;
            vlg.childControlWidth = true;
            vlg.childControlHeight = true;
            vlg.childForceExpandWidth = true;
            vlg.childForceExpandHeight = false;
            AddLayoutElement(block, flexibleHeight: 0);

            // The live preview line (updated by each control). Declared first so the control callbacks can refresh it.
            Text preview = null;

            // Row 1: field cycle + comparator cycle + value editor.
            GameObject controls = NewUI("Controls", block.transform);
            HorizontalLayoutGroup chlg = controls.AddComponent<HorizontalLayoutGroup>();
            chlg.spacing = 6;
            chlg.childAlignment = TextAnchor.MiddleLeft;
            chlg.childControlWidth = true;
            chlg.childControlHeight = true;
            chlg.childForceExpandWidth = false;
            chlg.childForceExpandHeight = true;
            AddLayoutElement(controls, minHeight: 30, flexibleHeight: 0);

            // Field cycle — advancing the field also resets the trigger kind, comparator set, and value to that field's
            // defaults (so the rule stays internally consistent + the value editor matches the field's type).
            AddCycleButton(controls.transform, "Field", () => FieldLabelFor(rule), () =>
            {
                CycleField(rule);
                RenderRuleRows(); // the value editor type may change (bool↔numeric) — rebuild this section.
            });

            // Comparator cycle — within the current field's palette comparator set.
            AddCycleButton(controls.transform, "Cmp", () => rule.comparator, () =>
            {
                CycleComparator(rule);
                if (preview != null) preview.text = RuleModel.PreviewRule(rule);
            });

            // Value editor — a toggle for a bool field, an InputField for a numeric one.
            FieldSpec spec = RuleModel.FieldByKey(CurrentArchetype, rule.field);
            if (spec != null && spec.IsBool)
            {
                AddCycleButton(controls.transform, "Val", () => BoolValueLabel(rule), () =>
                {
                    rule.value = (rule.value == "true") ? "false" : "true";
                    if (preview != null) preview.text = RuleModel.PreviewRule(rule);
                });
            }
            else
            {
                InputField input = AddNumberInput(controls.transform, rule.value, v =>
                {
                    rule.value = v;
                    if (preview != null) preview.text = RuleModel.PreviewRule(rule);
                });
                input.gameObject.name = "ValueInput";
            }

            // Row 2: action cycle + priority slider + remove.
            GameObject controls2 = NewUI("Controls2", block.transform);
            HorizontalLayoutGroup c2hlg = controls2.AddComponent<HorizontalLayoutGroup>();
            c2hlg.spacing = 6;
            c2hlg.childAlignment = TextAnchor.MiddleLeft;
            c2hlg.childControlWidth = true;
            c2hlg.childControlHeight = true;
            c2hlg.childForceExpandWidth = false;
            c2hlg.childForceExpandHeight = true;
            AddLayoutElement(controls2, minHeight: 30, flexibleHeight: 0);

            AddCycleButton(controls2.transform, "Action", () => ActionLabelFor(rule), () =>
            {
                CycleAction(rule);
                if (preview != null) preview.text = RuleModel.PreviewRule(rule);
            });

            // Priority slider (PriorityMin..PriorityMax, whole-number) — drives rule.priority + refreshes the preview.
            AddPrioritySlider(controls2.transform, rule.priority, p =>
            {
                rule.priority = p;
                if (preview != null) preview.text = RuleModel.PreviewRule(rule);
            });

            int captured = index;
            AddCompactButton(controls2.transform, "✕", () =>
            {
                if (captured >= 0 && captured < rules.Count) rules.RemoveAt(captured);
                RenderRuleRows();
            }, AccentSevere);

            // The NL preview line.
            preview = NewText("Preview", block.transform, RuleModel.PreviewRule(rule), 13, TextAnchor.MiddleLeft);
            preview.color = AccentMild;
            preview.verticalOverflow = VerticalWrapMode.Overflow;
            AddLayoutElement(preview.gameObject, minHeight: 20, flexibleHeight: 0);
            // The preview reads the player's OWN authored values (priority / value) — like script_source, it is excluded
            // from the no-raw-scalar scan corpus (renderedTexts); we track only the component.
            if (!textComponents.Contains(preview)) textComponents.Add(preview);
        }

        // --- rule-model mutation helpers (cycle within the CURRENT archetype's palette) ----------

        // Advance to the next field in the CURRENT archetype's palette; reset trigger kind + comparator + value to that
        // field's defaults. A single-field palette (SECURITY/BOOKKEEPER/LOGISTICS) cycles back onto itself (a no-op),
        // which is correct. Reads CurrentArchetype so the field set follows the selected/recruited/picked lieutenant.
        private void CycleField(RuleRow rule)
        {
            FieldSpec[] palette = RuleModel.FieldsFor(CurrentArchetype);
            int idx = 0;
            for (int i = 0; i < palette.Length; i++)
                if (palette[i].Key == rule.field) { idx = i; break; }
            FieldSpec next = palette[(idx + 1) % palette.Length];
            rule.field = next.Key;
            rule.triggerKind = next.TriggerKind;
            rule.comparator = next.Comparators[0];
            rule.value = next.IsBool ? "true" : "0";
        }

        // Advance the comparator within the current field's palette comparator set (looked up in the current archetype's
        // palette). Falls back to the rule's own comparator when the field is not in the palette (defensive).
        private void CycleComparator(RuleRow rule)
        {
            FieldSpec spec = RuleModel.FieldByKey(CurrentArchetype, rule.field);
            string[] set = spec != null ? spec.Comparators : new[] { rule.comparator };
            int idx = 0;
            for (int i = 0; i < set.Length; i++)
                if (set[i] == rule.comparator) { idx = i; break; }
            rule.comparator = set[(idx + 1) % set.Length];
        }

        // Advance the action atom within the (archetype-agnostic) action set.
        private static void CycleAction(RuleRow rule)
        {
            int idx = 0;
            for (int i = 0; i < RuleModel.Actions.Count; i++)
                if (RuleModel.Actions[i] == rule.action) { idx = i; break; }
            rule.action = RuleModel.Actions[(idx + 1) % RuleModel.Actions.Count];
        }

        private string FieldLabelFor(RuleRow rule)
        {
            FieldSpec spec = RuleModel.FieldByKey(CurrentArchetype, rule.field);
            return spec != null ? spec.Label : (rule.field ?? "—");
        }

        private static string ActionLabelFor(RuleRow rule) =>
            rule.action == "EXECUTE_DEFAULT" ? "Run default" : rule.action == "PAUSE_OPS" ? "Pause ops" : (rule.action ?? "—");

        private static string BoolValueLabel(RuleRow rule) => rule.value == "false" ? "false" : "true";

        // --- rule-builder widget builders --------------------------------------

        // A tap-to-cycle "dropdown" — a labelled button whose caption is read live (so the callback can advance the
        // model + the next render shows the new value). Minimal + functional (the building-card programmatic style).
        private Button AddCycleButton(Transform parent, string tag, System.Func<string> caption, UnityEngine.Events.UnityAction onTap)
        {
            GameObject btn = NewUI("Cycle_" + tag, parent);
            Image img = btn.AddComponent<Image>();
            img.color = new Color(0.16f, 0.18f, 0.22f);
            Button b = btn.AddComponent<Button>();
            b.targetGraphic = img;
            AddLayoutElement(btn, minHeight: 28, minWidth: 96, flexibleWidth: 1);

            Text t = NewText("Label", btn.transform, caption() ?? "—", 13, TextAnchor.MiddleCenter);
            t.color = TextPrimary;
            Stretch((RectTransform)t.transform, new Vector2(6, 1), new Vector2(-6, -1));
            b.onClick.AddListener(() =>
            {
                onTap();
                if (!Destroyed && t != null) t.text = caption() ?? "—";
            });
            return b;
        }

        // A small fixed-width button (e.g. the remove ✕).
        private Button AddCompactButton(Transform parent, string label, UnityEngine.Events.UnityAction onClick, Color color)
        {
            GameObject btn = NewUI("Compact_" + label, parent);
            Image img = btn.AddComponent<Image>();
            img.color = new Color(0.16f, 0.18f, 0.22f);
            Button b = btn.AddComponent<Button>();
            b.targetGraphic = img;
            b.onClick.AddListener(onClick);
            AddLayoutElement(btn, minHeight: 28, minWidth: 34, preferredWidth: 34, flexibleWidth: 0);

            Text t = NewText("Label", btn.transform, label, 14, TextAnchor.MiddleCenter);
            t.color = color;
            t.fontStyle = FontStyle.Bold;
            Stretch((RectTransform)t.transform, Vector2.zero, Vector2.zero);
            return b;
        }

        // A numeric InputField for a numeric field's value. onChanged fires per keystroke; the model stores the raw text
        // (the backend judges validity — a non-numeric value still serializes + returns a diagnostic).
        private InputField AddNumberInput(Transform parent, string initial, UnityEngine.Events.UnityAction<string> onChanged)
        {
            GameObject go = NewUI("Value", parent);
            Image img = go.AddComponent<Image>();
            img.color = new Color(0.10f, 0.12f, 0.14f);
            AddLayoutElement(go, minHeight: 28, minWidth: 80, flexibleWidth: 1);

            InputField input = go.AddComponent<InputField>();
            input.contentType = InputField.ContentType.DecimalNumber;

            Text text = NewText("Text", go.transform, initial ?? string.Empty, 13, TextAnchor.MiddleLeft);
            text.color = TextPrimary;
            text.supportRichText = false;
            Stretch((RectTransform)text.transform, new Vector2(8, 2), new Vector2(-8, -2));

            input.textComponent = text;
            input.text = initial ?? string.Empty;
            input.onValueChanged.AddListener(v => onChanged(v));
            return input;
        }

        // A whole-number priority slider (PriorityMin..PriorityMax) with a live numeric caption. onChanged fires with the
        // rounded int. The caption reads the player's OWN priority — excluded from the no-raw-scalar scan (not a band).
        private void AddPrioritySlider(Transform parent, int initial, UnityEngine.Events.UnityAction<int> onChanged)
        {
            GameObject wrap = NewUI("Priority", parent);
            HorizontalLayoutGroup hlg = wrap.AddComponent<HorizontalLayoutGroup>();
            hlg.spacing = 6;
            hlg.childAlignment = TextAnchor.MiddleLeft;
            hlg.childControlWidth = true;
            hlg.childControlHeight = true;
            hlg.childForceExpandWidth = false;
            hlg.childForceExpandHeight = true;
            AddLayoutElement(wrap, minHeight: 28, minWidth: 150, flexibleWidth: 1);

            Text cap = NewText("PrioCap", wrap.transform, "P " + initial, 13, TextAnchor.MiddleLeft);
            cap.color = TextPrimary;
            AddLayoutElement(cap.gameObject, minWidth: 48, flexibleWidth: 0);

            GameObject sliderGo = NewUI("Slider", wrap.transform);
            AddLayoutElement(sliderGo, minHeight: 20, minWidth: 90, flexibleWidth: 1);
            Slider slider = sliderGo.AddComponent<Slider>();

            GameObject fillArea = NewUI("Fill", sliderGo.transform);
            Stretch((RectTransform)fillArea.transform, Vector2.zero, Vector2.zero);
            Image fillImg = fillArea.AddComponent<Image>();
            fillImg.color = AccentMild;

            GameObject handle = NewUI("Handle", sliderGo.transform);
            Image handleImg = handle.AddComponent<Image>();
            handleImg.color = CtaColor;
            RectTransform handleRt = (RectTransform)handle.transform;
            handleRt.sizeDelta = new Vector2(14, 22);

            slider.fillRect = (RectTransform)fillArea.transform;
            slider.handleRect = handleRt;
            slider.targetGraphic = handleImg;
            slider.minValue = RuleModel.PriorityMin;
            slider.maxValue = RuleModel.PriorityMax;
            slider.wholeNumbers = true;
            slider.value = Mathf.Clamp(initial, RuleModel.PriorityMin, RuleModel.PriorityMax);
            slider.onValueChanged.AddListener(v =>
            {
                int p = Mathf.RoundToInt(v);
                if (!Destroyed && cap != null) cap.text = "P " + p;
                onChanged(p);
            });
        }

        // ----------------------------------------------------------- UI builders (mirrored from BuildingCardController)

        private string NewSectionLabel(Transform parent, string text)
        {
            Text t = NewText("Section", parent, text, 13, TextAnchor.MiddleLeft);
            t.color = new Color(0.55f, 0.59f, 0.63f);
            t.fontStyle = FontStyle.Bold;
            AddLayoutElement(t.gameObject, minHeight: 20, flexibleHeight: 0);
            TrackText(t, text);
            return text;
        }

        // A status row: glyph (shape — a11y: colour is never the sole differentiator) + label + value. Used by T2 to
        // render the bands; kept here so the shell shares the BuildingCard row vocabulary 1:1.
        private void AddStatusRow(string label, string value, string glyph, Color accent)
        {
            GameObject row = NewUI("Row_" + label, statusRows);
            row.AddComponent<Image>().color = RowBg;
            HorizontalLayoutGroup hlg = row.AddComponent<HorizontalLayoutGroup>();
            hlg.padding = new RectOffset(10, 10, 6, 6);
            hlg.spacing = 10;
            hlg.childAlignment = TextAnchor.MiddleLeft;
            hlg.childControlWidth = true;
            hlg.childControlHeight = true;
            hlg.childForceExpandWidth = false;
            hlg.childForceExpandHeight = true;
            AddLayoutElement(row, minHeight: 30, flexibleHeight: 0);

            Text g = NewText("Glyph", row.transform, glyph, 16, TextAnchor.MiddleCenter);
            g.color = accent;
            g.fontStyle = FontStyle.Bold;
            AddLayoutElement(g.gameObject, minWidth: 46, preferredWidth: 46, flexibleWidth: 0);

            Text l = NewText("Label", row.transform, label, 15, TextAnchor.MiddleLeft);
            l.color = new Color(0.72f, 0.76f, 0.80f);
            AddLayoutElement(l.gameObject, minWidth: 120, flexibleWidth: 1);

            Text v = NewText("Value", row.transform, value, 16, TextAnchor.MiddleRight);
            v.color = accent;
            v.fontStyle = FontStyle.Bold;
            AddLayoutElement(v.gameObject, minWidth: 140, flexibleWidth: 0);

            TrackText(g, glyph);
            TrackText(l, label);
            TrackText(v, value);
        }

        private Button AddActionButton(Transform parent, string label, UnityEngine.Events.UnityAction onClick)
        {
            GameObject btn = NewUI("Action_" + label.Replace(" ", "").Replace("(", "").Replace(")", ""), parent);
            Image img = btn.AddComponent<Image>();
            img.color = new Color(0.16f, 0.18f, 0.22f);
            Button b = btn.AddComponent<Button>();
            b.targetGraphic = img;
            b.onClick.AddListener(onClick);
            AddLayoutElement(btn, minHeight: 34, flexibleHeight: 0);

            Text t = NewText("Label", btn.transform, label, 15, TextAnchor.MiddleCenter);
            t.color = CtaColor;
            Stretch((RectTransform)t.transform, new Vector2(8, 2), new Vector2(-8, -2));
            TrackText(t, label);
            return b;
        }

        private void EnsureEventSystem()
        {
            if (FindFirstObjectByType<EventSystem>() == null)
            {
                GameObject es = new GameObject("EventSystem", typeof(EventSystem));
                es.AddComponent<InputSystemUIInputModule>();
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
            t.color = TextPrimary;
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

        private void TrackText(Text comp, string text)
        {
            if (comp != null) textComponents.Add(comp);
            if (!string.IsNullOrEmpty(text)) renderedTexts.Add(text);
        }
    }
}
