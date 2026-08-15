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
        [Header("Backend")]
        [SerializeField] private string baseUrl = "http://localhost";

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

        /// <summary>Every SCANNED text (R2.2 corpus — design C2-F4). Excludes elements whose
        /// `trackValue` is false (numeric UI chrome: cash, game-day — mirrors
        /// `DashboardController.AddStatusRow(trackValue:false)`, `:340`).</summary>
        public IReadOnlyList<string> RenderedTexts => renderedTexts;
        private readonly List<string> renderedTexts = new List<string>();

        private TextMeshProUGUI callsignText;
        private TextMeshProUGUI cashText;
        private TextMeshProUGUI notificationText;
        private TextMeshProUGUI gameDayText;

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

            callsignText = NewText("Callsign", "Boss", 130);
            gameDayText = NewText("GameDay", "Day —", 90);
            notificationText = NewText("Notification", "[ ] Clear", 110);
            cashText = NewText("Cash", "—", 160);
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
