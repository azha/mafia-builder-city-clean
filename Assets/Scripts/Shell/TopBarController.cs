using System;
using System.Collections;
using System.Collections.Generic;
using System.Globalization;
using UnityEngine;
using UnityEngine.UI;
using MafiaCleanCity.Operational; // REUSE DashboardClient (GetMe/GetWallet) + MeDto/WalletDto (envelope/payload/data)
using MafiaCleanCity.Theme;
using TMPro;

namespace MafiaCleanCity.Shell
{
    // W3.U1 C2 (design §3 C2) — le TopBar : les 4 éléments canoniques (callsign, cash, point de
    // notification, temps in-game). Persistant, monté une seule fois par l'AppShell dans
    // `TopBarSlot` — jamais reconstruit à chaque changement d'onglet (§1.2 du design : "TopBar 4
    // éléments PERSISTANTS").
    //
    // Callsign + cash sont des VRAIES requêtes que ce composant émet lui-même (REUSE DashboardClient
    // — GetMe/GetWallet, déjà lues via le triplet enveloppe/payload/data). Le point de notification
    // (`backlog_badge`) et le temps in-game (`opened_game_day`, design D3, la 12e clé) viennent du
    // payload `session/open` — CE composant ne l'appelle PAS lui-même (c'est le rôle de C3,
    // `SessionClient`) : `Load` les reçoit en PARAMÈTRE, posés par l'appelant. C'est pourquoi C2 est
    // livrable et testable AVANT que C3 existe (§3.0 du design : C2 ne consomme que `GET /v1/me` +
    // `GET /v1/economy/wallet` en propre).
    public class TopBarController : MonoBehaviour
    {
        // nav-hud-design-v1.md §3.1 (chunk 2) — l'action « leading » : ÉTEND le TopBar, ne le
        // REMPLACE pas (§3.1 : "aucun bouton ne devient jamais un 4ᵉ enfant du Canvas" — 3
        // falsifiables C1-F2/C8-F1 assertent déjà childCount==3 sur la racine ; un enfant de
        // TopBarSlot ne les touche pas). État NOMMÉ, jamais déduit d'une absence d'objet.
        public enum LeadingAction { None, BackToMap }

        [Header("Backend")]
        [SerializeField] private string baseUrl = "http://localhost";

        // ---- test hooks — action leading (§3.1) ----------------------------
        public LeadingAction CurrentLeadingAction { get; private set; } = LeadingAction.None;

        // ---- test hooks ---------------------------------------------------
        public bool Loaded { get; private set; }
        public string MeError { get; private set; }
        public string WalletError { get; private set; }
        public MeDto CurrentMe { get; private set; }
        public WalletDto CurrentWallet { get; private set; }
        public bool NotificationActive { get; private set; }
        public int OpenedGameDay { get; private set; }
        public string RenderedGameDayText { get; private set; }
        public string RenderedCashText { get; private set; }

        // ---- test hooks — day_phase (§6.3, chunk 5) -------------------------
        /// <summary>État affiché par le manomètre pour day_phase : la valeur DAWN|DAY|DUSK|NIGHT du
        /// DTO district déjà récupéré quand `AppShell` est en district, sinon l'état NOMMÉ "—"
        /// (jamais la dernière valeur d'un district quitté — voir `SetDayPhase`).</summary>
        public string DayPhaseText { get; private set; } = "—";

        // ---- test hooks — manomètre heat (§6.4, chunk 5) --------------------
        public string CitywideHeatBucket { get; private set; }
        public HeatBucketResolver.Rank CitywideHeatRank { get; private set; } = HeatBucketResolver.Rank.Unknown;
        /// <summary>hud-F2 — 4 valeurs DISTINCTES pour les 4 buckets réels (dérivées de
        /// `HeatBucketResolver.NeedleAngleDegrees`, fonction pure — voir ce fichier pour le test
        /// hors-réseau direct).</summary>
        public float HeatNeedleAngleDegrees { get; private set; }

        /// <summary>Every SCANNED text (R2.2 corpus — design C2-F4). Excludes elements whose
        /// `trackValue` is false (numeric UI chrome: cash, game-day — mirrors
        /// `DashboardController.AddStatusRow(trackValue:false)`, `:340`).</summary>
        public IReadOnlyList<string> RenderedTexts => renderedTexts;
        private readonly List<string> renderedTexts = new List<string>();

        private TextMeshProUGUI callsignText;
        private TextMeshProUGUI cashText;
        private TextMeshProUGUI notificationText;
        private TextMeshProUGUI gameDayText;
        private TextMeshProUGUI dayPhaseLabel;
        private RectTransform heatNeedle;

        // §3.1 — le bouton leading, construit UNE fois dans BuildLayout, premier enfant du
        // HorizontalLayoutGroup, JAMAIS détruit ; seule sa visibilité (SetActive) suit l'état.
        private GameObject leadingGo;
        private TextMeshProUGUI leadingText;
        private System.Action leadingOnClick;

        private DashboardClient client;
        private bool initialized;

        private void Awake() => EnsureInitialized();

        private void EnsureInitialized()
        {
            if (initialized) return;
            initialized = true;
            client = new DashboardClient { BaseUrl = baseUrl };
            BuildLayout();
        }

        /// <summary>Fetch callsign + cash (REAL requests, REUSE DashboardClient) and render all 4
        /// TopBar elements. `backlogBadge`/`openedGameDay` are supplied by the caller (C3's
        /// SessionClient in production; a literal value in C2's own tests) — see the class header.</summary>
        public IEnumerator Load(string token, bool backlogBadge, int openedGameDay)
        {
            EnsureInitialized();
            Loaded = false;
            MeError = null;
            WalletError = null;
            NotificationActive = backlogBadge;
            OpenedGameDay = openedGameDay;

            yield return client.GetMe(token, dto => CurrentMe = dto, (code, msg) => MeError = $"{code}: {msg}");
            yield return client.GetWallet(token, dto => CurrentWallet = dto, (code, msg) => WalletError = $"{code}: {msg}");

            if (this == null) yield break; // torn down mid-fetch (mirrors DashboardController's own guard)

            Render();
            Loaded = true;
        }

        private void Render()
        {
            renderedTexts.Clear();

            // 1) Callsign — identity only, never cash (R2.2). Fully SCANNED (no digits expected).
            string callsign = CurrentMe != null && !string.IsNullOrEmpty(CurrentMe.handle) ? CurrentMe.handle : "Boss";
            callsignText.text = callsign;
            Track(callsignText.text, trackValue: true);

            // 2) Cash — LOCALE-formatted, NO hard-coded currency symbol (design C2-F1). Digit-bearing
            //    UI chrome, EXCLUDED from the scan corpus (design C2-F4 / IMPORTANT-5) — the SAME
            //    mechanism DashboardController already uses for "Tier N" (`:340`).
            string locale = CurrentMe != null ? CurrentMe.locale : null;
            string cashRaw = CurrentWallet != null ? CurrentWallet.cash_cents : null;
            RenderedCashText = FormatCash(cashRaw, locale);
            cashText.text = RenderedCashText;
            Track(cashText.text, trackValue: false);

            // 3) Notification point — the VALUE follows `backlogBadge`, both polarities distinguishable
            //    (design C2-F2). A named state (glyph + label), never colour alone.
            notificationText.text = NotificationActive ? "[!] New" : "[ ] Clear";
            Track(notificationText.text, trackValue: true);

            // 4) In-game time (design D3, the 12th key) — ALSO digit-bearing chrome (the SAME "Tier
            //    N"/day-counter family as cash), EXCLUDED from the scan for the SAME reason (a bare
            //    "Day N" would otherwise trip the exact guard IMPORTANT-5 names — the day COUNT is
            //    not a hidden precision metric, R2.2 permits it same as cash's own standing, §1.3.e).
            RenderedGameDayText = $"Day {OpenedGameDay}";
            gameDayText.text = RenderedGameDayText;
            Track(gameDayText.text, trackValue: false);
        }

        private void Track(string text, bool trackValue)
        {
            if (trackValue && !string.IsNullOrEmpty(text)) renderedTexts.Add(text);
        }

        /// <summary>§3.1 — bascule l'action leading. `LeadingAction.None` cache le bouton (les 4
        /// éléments canoniques reflow vers la gauche, HorizontalLayoutGroup ignore un enfant
        /// inactif) ; `BackToMap` le montre avec `onClick` câblé. Épinglé par sa VALEUR
        /// (`CurrentLeadingAction`), jamais par la présence/absence du GameObject — le bouton
        /// existe toujours, seule sa visibilité change (§3.1).</summary>
        public void SetLeadingAction(LeadingAction action, System.Action onClick)
        {
            EnsureInitialized();
            CurrentLeadingAction = action;
            leadingOnClick = onClick;
            bool visible = action != LeadingAction.None;
            leadingGo.SetActive(visible);
            if (visible) leadingText.text = LabelFor(action);
        }

        private static string LabelFor(LeadingAction action)
        {
            switch (action)
            {
                case LeadingAction.BackToMap: return "← Carte"; // "← Carte" — libellé littéral du design §3
                default: return "";
            }
        }

        // ----------------------------------------------------------- day_phase (§6.3, chunk 5)

        /// <summary>Appelé par `AppShell` : la valeur du DTO district déjà récupéré quand on est EN
        /// district, `null` sinon (§6.3 — état NOMMÉ "—", jamais dérivé côté client, jamais la
        /// dernière valeur d'un district quitté).</summary>
        public void SetDayPhase(string dayPhase)
        {
            EnsureInitialized();
            DayPhaseText = string.IsNullOrEmpty(dayPhase) ? "—" : dayPhase;
            dayPhaseLabel.text = DayPhaseText;
        }

        // ----------------------------------------------------------- manomètre heat (§6.4, chunk 5)

        /// <summary>Appelé par `AppShell` (publié par un tenant, ou par le repli de l'AppShell lui-
        /// même — §6.2). Résout via `HeatBucketResolver`, le lieu UNIQUE partagé avec
        /// `DashboardController.HeatGlyph`/`HeatLabel` (§6.4 — un seul `switch` à 4 branches, pas
        /// deux résolveurs qui pourraient dériver l'un de l'autre).</summary>
        public void SetCitywideHeatBucket(string bucket)
        {
            EnsureInitialized();
            CitywideHeatBucket = bucket;
            CitywideHeatRank = HeatBucketResolver.ResolveRank(bucket);
            HeatNeedleAngleDegrees = HeatBucketResolver.NeedleAngleDegrees(bucket);
            heatNeedle.localEulerAngles = new Vector3(0f, 0f, HeatNeedleAngleDegrees);
        }

        // ----------------------------------------------------------- cash formatting (C2-F1)

        /// <summary>Format a BigInt-serialized cents STRING as a locale-appropriate currency string —
        /// NO hard-coded symbol (design C2-F1). Uses `decimal` throughout (never float/double): the
        /// dimensioning scenario is a value beyond Number.MAX_SAFE_INTEGER (2^53), which decimal's
        /// ~28-29 significant digits comfortably survive without precision loss. Static + independently
        /// testable — the falsifiable never depends on a live seeded wallet reaching that magnitude.</summary>
        public static string FormatCash(string cashCentsRaw, string localeCode)
        {
            if (string.IsNullOrEmpty(cashCentsRaw)) return "—";
            decimal cents;
            if (!decimal.TryParse(cashCentsRaw, NumberStyles.Integer | NumberStyles.AllowLeadingSign,
                    CultureInfo.InvariantCulture, out cents))
            {
                return "—";
            }
            decimal major = cents / 100m;
            CultureInfo culture = ResolveCulture(localeCode);
            return major.ToString("C", culture);
        }

        private static CultureInfo ResolveCulture(string localeCode)
        {
            switch (localeCode)
            {
                case "fr": return CultureInfo.GetCultureInfo("fr-FR");
                case "en":
                default:
                    // Unknown/absent locale falls back to en-US — still culture-driven formatting
                    // (grouping/decimal/symbol all come FROM the CultureInfo), never a hard-coded "$".
                    return CultureInfo.GetCultureInfo("en-US");
            }
        }

        // --------------------------------------------------------------- UI build

        // No Canvas discovery here (unlike the 9 screen tenants) — TopBarController is NEVER a
        // stand-alone entry-point screen; it always builds directly into whatever RectTransform its
        // own GameObject is parented under (AppShell.TopBarSlot in production; a bare test parent in
        // isolation — design §3.0: C2 consumes no route that needs a shell to exist).
        private void BuildLayout()
        {
            RectTransform selfRt = GetComponent<RectTransform>();
            if (selfRt == null) selfRt = gameObject.AddComponent<RectTransform>();
            Stretch(selfRt, Vector2.zero, Vector2.zero);

            HorizontalLayoutGroup hlg = gameObject.AddComponent<HorizontalLayoutGroup>();
            hlg.padding = new RectOffset(14, 14, 8, 8);
            hlg.spacing = 12;
            hlg.childAlignment = TextAnchor.MiddleLeft;
            hlg.childControlWidth = true;
            hlg.childControlHeight = true;
            hlg.childForceExpandWidth = false;
            hlg.childForceExpandHeight = true;

            // §3.1 — le bouton leading est le PREMIER enfant du HorizontalLayoutGroup, construit
            // AVANT les 4 éléments canoniques pour que la fratrie le place en tête (gauche). Caché
            // par défaut (LeadingAction.None) — un test qui ne l'active jamais ne doit rien voir.
            leadingGo = new GameObject("LeadingAction", typeof(RectTransform));
            leadingGo.transform.SetParent(transform, false);
            Image leadingImg = leadingGo.AddComponent<Image>();
            leadingImg.color = DesignTokens.Current.surfaceRow; // REUSE — même famille que le chrome de la TabBar
            Button leadingBtn = leadingGo.AddComponent<Button>();
            leadingBtn.targetGraphic = leadingImg;
            leadingBtn.onClick.AddListener(() => leadingOnClick?.Invoke());
            LayoutElement leadingLe = leadingGo.AddComponent<LayoutElement>();
            leadingLe.preferredWidth = 90;
            leadingLe.flexibleWidth = 0;

            GameObject leadingLabelGo = new GameObject("Label", typeof(RectTransform));
            leadingLabelGo.transform.SetParent(leadingGo.transform, false);
            leadingText = leadingLabelGo.AddComponent<TextMeshProUGUI>();
            leadingText.font = DesignTokens.Current.primaryFont;
            leadingText.text = "";
            leadingText.fontSize = 14;
            leadingText.alignment = TextAlignmentOptions.Center;
            leadingText.color = DesignTokens.Current.onSurfacePrimary;
            leadingText.raycastTarget = false;
            Stretch((RectTransform)leadingText.transform, new Vector2(6, 2), new Vector2(-6, -2));
            leadingGo.SetActive(false);

            callsignText = NewText("Callsign", "Boss", 130);
            gameDayText = NewText("GameDay", "Day —", 90);
            notificationText = NewText("Notification", "[ ] Clear", 110);
            cashText = NewText("Cash", "—", 160);
            dayPhaseLabel = NewText("DayPhase", "—", 60);
            BuildManometre();
        }

        // §6.4 (chunk 5) — 3 zones peintes / 4 arrêts d'aiguille. Le juge de CE chunk est
        // fonctionnel (§0 périmètre du design : le pixel-perfect du HUD vient avec les écrans
        // doctrine, #24) — une représentation SIMPLE et CORRECTE, pas le cadran radial de
        // l'artefact de référence. `ZoneRow` (3 bandes peintes, sa propre HorizontalLayoutGroup)
        // et `Needle` (pivot bas-centre, tourné par `SetCitywideHeatBucket`) sont des FRÈRES —
        // jamais parent/enfant — sinon la Layout Group du premier écraserait la rotation du second.
        private void BuildManometre()
        {
            GameObject manoGo = new GameObject("Manometre", typeof(RectTransform));
            manoGo.transform.SetParent(transform, false);
            LayoutElement manoLe = manoGo.AddComponent<LayoutElement>();
            manoLe.preferredWidth = 48;
            manoLe.flexibleWidth = 0;

            GameObject zoneRowGo = new GameObject("ZoneRow", typeof(RectTransform));
            zoneRowGo.transform.SetParent(manoGo.transform, false);
            Stretch((RectTransform)zoneRowGo.transform, Vector2.zero, Vector2.zero);
            HorizontalLayoutGroup zoneHlg = zoneRowGo.AddComponent<HorizontalLayoutGroup>();
            zoneHlg.childControlWidth = true;
            zoneHlg.childControlHeight = true;
            zoneHlg.childForceExpandWidth = true;
            zoneHlg.childForceExpandHeight = true;
            zoneHlg.spacing = 1;
            Color[] zoneColors =
            {
                DesignTokens.Current.accentSuccess, // doux (COLD/WARM)
                DesignTokens.Current.accentWarning, // modéré (HOT)
                DesignTokens.Current.accentDanger,  // sévère (BURNING)
            };
            foreach (Color c in zoneColors)
            {
                GameObject zoneGo = new GameObject("Zone", typeof(RectTransform));
                zoneGo.transform.SetParent(zoneRowGo.transform, false);
                Image zoneImg = zoneGo.AddComponent<Image>();
                zoneImg.color = c;
                zoneImg.raycastTarget = false;
            }

            GameObject needleGo = new GameObject("Needle", typeof(RectTransform));
            needleGo.transform.SetParent(manoGo.transform, false);
            heatNeedle = (RectTransform)needleGo.transform;
            heatNeedle.anchorMin = heatNeedle.anchorMax = new Vector2(0.5f, 0.5f);
            heatNeedle.pivot = new Vector2(0.5f, 0f);
            heatNeedle.sizeDelta = new Vector2(3, 16);
            heatNeedle.anchoredPosition = Vector2.zero;
            Image needleImg = needleGo.AddComponent<Image>();
            needleImg.color = DesignTokens.Current.onSurfacePrimary;
            needleImg.raycastTarget = false;
        }

        private TextMeshProUGUI NewText(string name, string initial, float preferredWidth)
        {
            GameObject go = new GameObject(name, typeof(RectTransform));
            go.transform.SetParent(transform, false);
            TextMeshProUGUI t = go.AddComponent<TextMeshProUGUI>();
            t.font = DesignTokens.Current.primaryFont;
            t.text = initial;
            t.fontSize = 15;
            t.alignment = TextAlignmentOptions.Left;
            t.color = DesignTokens.Current.onSurfacePrimary;
            t.raycastTarget = false;
            LayoutElement le = go.AddComponent<LayoutElement>();
            le.preferredWidth = preferredWidth;
            le.flexibleWidth = 0;
            return t;
        }

        private static void Stretch(RectTransform rt, Vector2 offMin, Vector2 offMax)
        {
            rt.anchorMin = Vector2.zero;
            rt.anchorMax = Vector2.one;
            rt.offsetMin = offMin;
            rt.offsetMax = offMax;
        }
    }
}
