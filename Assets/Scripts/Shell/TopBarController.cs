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
    //
    // HUD v3.1 boucle ⊥ PIXEL-PERFECT (2026-08-21, ruling user mot pour mot : « ya rien qui va, les
    // couleurs etc. lance artefact et reprends tant que c'est pas pixel perfect »). REPRISE du round
    // 247ed3b : ce round avait COMPOSÉ ses teintes depuis les 51 tokens existants par alpha
    // (`accentGold` jaune vif → « laiton », `nightBackground`/`surfaceBase` → « verre bleu nuit ») au
    // lieu de porter les hex EXACTS de la maquette — root cause nommée par le ruling lui-même. Ce
    // round porte 10 tokens DÉDIÉS (`hud*`, DesignTokens.cs, gdd/14 @e171c594), REUSE verbatim des
    // variables CSS de `hud-brennar.html` (`:root`). La référence pixel du lot est
    // `Tools/hud-topbar-reference-2560.png` (rendue en isolation à l'échelle Unity — voir ce fichier
    // pour le protocole).
    //
    // Les 7 écarts structurels fermés ici (voir implementation-notes.md pour le détail complet) :
    // (1) ARGENT+montant passent à GAUCHE, serif, `hudMoneyGold` (« l'argent, seul or de l'écran ») ;
    // (2) le manomètre porte un ARC réel (track+cold+hot, `Image.FillMethod.Radial180`) + une valeur
    //     lisible au centre + le caption HEAT (voir Deviations : la maquette montre un "37%" que
    //     AUCUNE donnée réelle ne porte — substitué par le libellé de bucket réel, R2.2) ;
    // (3) l'horloge passe à l'aile DROITE (JOUR N petites capitales + phase en grand serif — voir
    //     Deviations : la maquette montre une heure "21:40" que AUCUNE donnée réelle ne porte) ;
    // (4) zéro badge PERMANENT — le badge reste un hook de DONNÉES headless (R2.2, C2F2/C2F4/DA5
    //     inchangés), sa chrome visible est retirée (le bandeau éphémère qui le remplacerait est
    //     hors périmètre — voir Deviations) ;
    // (5) police SERIF (`DesignTokens.Current.hudSerifFont`, DejaVu Serif SDF) pour l'argent,
    //     l'heure/phase, la valeur du manomètre ;
    // (6) coins arrondis (`ProceduralUI.RoundedRectMask` + `UnityEngine.UI.Mask`), verre fumé, et
    //     AUCUN filet rouge en état calme (le rouge n'existe QUE via `UpdateAlarmState`, inchangé,
    //     hors périmètre de ce lot) ;
    // (7) le callsign n'existe pas dans la maquette — retiré de la chrome VISIBLE (reste un hook de
    //     données headless, même traitement que le badge — voir Deviations).
    //
    // Ce qui NE bouge PAS : le maillon de session (chunk 5, day_phase/manomètre) et l'action leading
    // (chunk 2, §3.1) restent EXACTEMENT les mêmes méthodes publiques/sémantique. `ZoneRow` (3 zones
    // peintes, `HeatBucketResolver.SeverityColor`) et l'angle de l'aiguille (`HeatNeedleAngleDegrees`,
    // -60/-20/20/60) restent BYTE-POUR-BYTE ce que `HudPlayModeTests`/`HeatBucketResolver` épinglent
    // déjà (hud-F2/F6/M1). `UpdateAlarmState` reste routé exclusivement par `HeatBucketResolver.
    // SeverityColor` — jamais un accès direct à un token de sévérité depuis ce fichier.
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
        /// <summary>État affiché par l'aile droite pour day_phase : la valeur DAWN|DAY|DUSK|NIGHT du
        /// DTO district déjà récupéré quand `AppShell` est en district, sinon l'état NOMMÉ "—"
        /// (jamais la dernière valeur d'un district quitté — voir `SetDayPhase`).</summary>
        public string DayPhaseText { get; private set; } = "—";

        // ---- test hooks — manomètre heat (§6.4, chunk 5) --------------------
        public string CitywideHeatBucket { get; private set; }
        public HeatBucketResolver.Rank CitywideHeatRank { get; private set; } = HeatBucketResolver.Rank.Unknown;
        /// <summary>hud-F2 — 4 valeurs DISTINCTES pour les 4 buckets réels (dérivées de
        /// `HeatBucketResolver.NeedleAngleDegrees`, fonction pure — voir ce fichier pour le test
        /// hors-réseau direct). INCHANGÉ par ce round (contrat numérique pinné, M1).</summary>
        public float HeatNeedleAngleDegrees { get; private set; }

        /// <summary>Every SCANNED text (R2.2 corpus — design C2-F4). Excludes elements whose
        /// `trackValue` is false (numeric UI chrome: cash, game-day — mirrors
        /// `DashboardController.AddStatusRow(trackValue:false)`, `:340`).</summary>
        public IReadOnlyList<string> RenderedTexts => renderedTexts;
        private readonly List<string> renderedTexts = new List<string>();

        // ---- chrome VISIBLE (money left / gauge center / clock right) ------
        private TextMeshProUGUI moneyLabelText;
        private TextMeshProUGUI moneyValueText;
        private Image moneyUnderline;
        private RectTransform moneyClusterRect;
        private TextMeshProUGUI dayLabelText;
        private TextMeshProUGUI phaseValueText;
        private TextMeshProUGUI gaugeValueText;
        private RectTransform heatNeedle;

        // ---- hooks de DONNÉES headless — écart (4)+(7), voir Deviations : ces deux éléments
        // restent nécessaires au contrat R2.2/test (callsign identité scannée, badge C2F2/C2F4/DA5)
        // mais n'ont plus de chrome VISIBLE dans la doctrine (ni l'un ni l'autre n'apparaît dans
        // `hud-brennar.html`). alpha=0, taille minimale — jamais détruits, jamais SetActive(false)
        // (un objet inactif ne recevrait plus de `.text` à jour de façon aussi évidente ; alpha=0
        // suffit et garde le composant simple à raisonner).
        private TextMeshProUGUI callsignText;
        private TextMeshProUGUI notificationText;

        // §3.1 — le bouton leading, construit UNE fois dans BuildLayout, premier enfant du
        // HorizontalLayoutGroup, JAMAIS détruit ; seule sa visibilité (SetActive) suit l'état.
        private GameObject leadingGo;
        private TextMeshProUGUI leadingText;
        private System.Action leadingOnClick;

        // ---- HUD v3.1 — chrome doctrine --------------------------------------
        private VerticalGradientImage barBackground;
        private Image hairline;
        private Image boitierRing;
        private Color calmGoldColor;

        private const float BarPaddingX = 16f;
        private const float LeadingWidth = 90f;
        private const float LeadingHeight = 40f;
        private const float ManometreDiameter = 64f;
        private const float BoitierRingThicknessPx = 3f;
        private const float ArcDiameterPx = 48f;
        private const float ArcThicknessPx = 5f;
        private const float MoneyClusterWidth = 160f;
        private const float ClockClusterWidth = 160f;
        private const float HairlineThicknessPx = 2f;
        private const float MoneyUnderlineWidthPx = 74f; // REUSE exact — hud-brennar.html:59 `.ratio{width:74px}`
        private const float ZoneRowWidth = 34f;
        private const float ZoneRowHeight = 9f;
        private const float BarCornerRadiusPx = 10f;

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

            // 1) Callsign — identité, hook de données SCANNÉ (headless — écart (7), voir Deviations).
            string callsign = CurrentMe != null && !string.IsNullOrEmpty(CurrentMe.handle) ? CurrentMe.handle : "Boss";
            callsignText.text = callsign;
            Track(callsignText.text, trackValue: true);

            // 2) Cash — LOCALE-formatted, NO hard-coded currency symbol (design C2-F1). Digit-bearing
            //    UI chrome, EXCLUDED from the scan corpus (design C2-F4 / IMPORTANT-5) — the SAME
            //    mechanism DashboardController already uses for "Tier N" (`:340`). Doctrine (1) :
            //    « l'argent, seul or de l'écran » — serif, `hudMoneyGold`.
            string locale = CurrentMe != null ? CurrentMe.locale : null;
            string cashRaw = CurrentWallet != null ? CurrentWallet.cash_cents : null;
            RenderedCashText = FormatCash(cashRaw, locale);
            moneyValueText.text = RenderedCashText;
            Track(moneyValueText.text, trackValue: false);

            // 3) Notification point — la VALEUR suit `backlogBadge`, les deux polarités
            //    distinguables (design C2-F2). Hook de données SCANNÉ, headless (écart (4)).
            notificationText.text = NotificationActive ? "[!] New" : "[ ] Clear";
            Track(notificationText.text, trackValue: true);

            // 4) In-game time (design D3, la 12e clé) — chrome digit-bearing, EXCLU du scan (même
            //    famille que le cash). `RenderedGameDayText` reste EXACTEMENT "Day {N}" (test hook
            //    inchangé) — l'affichage VISIBLE ("JOUR {N}") est un format SÉPARÉ, dérivé de la même
            //    valeur, voir `RepositionMoneyCluster`/`BuildLayout` pour `dayLabelText`.
            RenderedGameDayText = $"Day {OpenedGameDay}";
            dayLabelText.text = $"JOUR {OpenedGameDay}";
            Track(RenderedGameDayText, trackValue: false);
        }

        private void Track(string text, bool trackValue)
        {
            if (trackValue && !string.IsNullOrEmpty(text)) renderedTexts.Add(text);
        }

        /// <summary>§3.1 — bascule l'action leading. `LeadingAction.None` cache le bouton ; le
        /// cluster ARGENT (gauche) reflow vers la droite (`RepositionMoneyCluster` — HUD v3.1,
        /// remplace le reflow du callsign : le callsign n'a plus de chrome visible, c'est le cluster
        /// ARGENT qui occupe désormais le coin gauche, écart (1)). `BackToMap` le montre avec
        /// `onClick` câblé. Épinglé par sa VALEUR (`CurrentLeadingAction`), jamais par la
        /// présence/absence du GameObject — le bouton existe toujours, seule sa visibilité change
        /// (§3.1).</summary>
        public void SetLeadingAction(LeadingAction action, System.Action onClick)
        {
            EnsureInitialized();
            CurrentLeadingAction = action;
            leadingOnClick = onClick;
            bool visible = action != LeadingAction.None;
            leadingGo.SetActive(visible);
            if (visible) leadingText.text = LabelFor(action);
            RepositionMoneyCluster();
        }

        private static string LabelFor(LeadingAction action)
        {
            switch (action)
            {
                case LeadingAction.BackToMap: return "← Carte"; // "← Carte" — libellé littéral du design §3
                default: return "";
            }
        }

        /// <summary>HUD v3.1 — le cluster ARGENT (gauche) est le seul élément dont la position
        /// dépend d'un voisin (le bouton leading) — même patron que le callsign avant ce round, sur
        /// le NOUVEL occupant du coin gauche (écart (1)). Ne touche jamais le manomètre (ancré à
        /// 0.5/0.5, sans rapport avec ce cluster).</summary>
        private void RepositionMoneyCluster()
        {
            if (moneyClusterRect == null) return;
            bool leadingVisible = CurrentLeadingAction != LeadingAction.None;
            float x = BarPaddingX + (leadingVisible ? LeadingWidth + 12f : 0f);
            moneyClusterRect.anchoredPosition = new Vector2(x, moneyClusterRect.anchoredPosition.y);
        }

        // ----------------------------------------------------------- day_phase (§6.3, chunk 5)

        /// <summary>Appelé par `AppShell` : la valeur du DTO district déjà récupéré quand on est EN
        /// district, `null` sinon (§6.3 — état NOMMÉ "—", jamais dérivé côté client, jamais la
        /// dernière valeur d'un district quitté). Écart (3) : cette valeur est désormais la VALEUR
        /// dominante (grande, serif) de l'aile droite — substitut honnête à l'horloge "HH:MM" de la
        /// maquette, qu'AUCUNE donnée client ne porte (voir Deviations).</summary>
        public void SetDayPhase(string dayPhase)
        {
            EnsureInitialized();
            DayPhaseText = string.IsNullOrEmpty(dayPhase) ? "—" : dayPhase;
            phaseValueText.text = DayPhaseText;
        }

        // ----------------------------------------------------------- manomètre heat (§6.4, chunk 5)

        /// <summary>Appelé par `AppShell` (publié par un tenant, ou par le repli de l'AppShell lui-
        /// même — §6.2). Résout via `HeatBucketResolver`, le lieu UNIQUE partagé avec
        /// `DashboardController.HeatGlyph`/`HeatLabel` (§6.4 — un seul `switch` à 4 branches, pas
        /// deux résolveurs qui pourraient dériver l'un de l'autre). Écart (2) : la valeur centrale du
        /// manomètre est le LIBELLÉ de bucket réel (`HeatBucketResolver.Label`), pas un pourcentage
        /// fabriqué — voir Deviations (aucune donnée client ne porte de heat continu).</summary>
        public void SetCitywideHeatBucket(string bucket)
        {
            EnsureInitialized();
            CitywideHeatBucket = bucket;
            CitywideHeatRank = HeatBucketResolver.ResolveRank(bucket);
            HeatNeedleAngleDegrees = HeatBucketResolver.NeedleAngleDegrees(bucket);
            heatNeedle.localEulerAngles = new Vector3(0f, 0f, HeatNeedleAngleDegrees);
            gaugeValueText.text = HeatBucketResolver.Label(bucket);
            UpdateAlarmState();
        }

        /// <summary>HUD v3.1 (doctrine — mockup `.tel.chaud`/`.tel.descente`) : le filet de la barre
        /// et l'anneau du médaillon basculent vers la teinte "Severe" quand la ville brûle
        /// (BURNING), sinon restent au filet or calme. La teinte alarme passe PAR LE RÉSOLVEUR —
        /// jamais un accès direct à un token de sévérité depuis ce fichier (F2_SeverityTokenAccesses
        /// exclut explicitement ce fichier de ces accès directs ; le résolveur reste le lieu
        /// UNIQUE — paraphrase délibérée, socle CLAUDE.md : citer verbatim la forme qu'on évite
        /// réintroduit exactement ce qu'on évite dans le compte du scanner). INCHANGÉ par ce round —
        /// hors périmètre (les 7 écarts du ruling portent sur l'état CALME).</summary>
        private void UpdateAlarmState()
        {
            bool alarm = CitywideHeatRank == HeatBucketResolver.Rank.Burning;
            if (alarm)
            {
                Color severe = HeatBucketResolver.SeverityColor(HeatBucketResolver.Severity.Severe);
                if (hairline != null) hairline.color = severe;
                if (boitierRing != null) boitierRing.color = severe;
            }
            else
            {
                if (hairline != null) hairline.color = calmGoldColor;
                if (boitierRing != null) boitierRing.color = calmGoldColor;
            }
        }

        private static Color WithAlpha(Color c, float a)
        {
            c.a = a;
            return c;
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
        //
        // Chaque enfant reçoit un ancrage EXPLICITE (pas de HorizontalLayoutGroup sur la racine —
        // c'est ce qui garantit le manomètre EXACTEMENT au centre indépendamment de tout ce qui
        // l'entoure). `LeadingAction` et `Manometre` restent des enfants DIRECTS de ce transform
        // (jamais nichés) — NavigationPlayModeTests.cs:89 et HudPlayModeTests.cs:333 font un `Find` À
        // UN SEGMENT qui ne descend pas dans un sous-conteneur.
        private void BuildLayout()
        {
            RectTransform selfRt = GetComponent<RectTransform>();
            if (selfRt == null) selfRt = gameObject.AddComponent<RectTransform>();
            Stretch(selfRt, Vector2.zero, Vector2.zero);

            InitPalette();
            BuildBarBackground();
            BuildHairline();

            // §3.1 — le bouton leading (inchangé fonctionnellement ; ancrage explicite).
            leadingGo = new GameObject("LeadingAction", typeof(RectTransform));
            leadingGo.transform.SetParent(transform, false);
            RectTransform leadingRect = (RectTransform)leadingGo.transform;
            leadingRect.anchorMin = leadingRect.anchorMax = new Vector2(0f, 0.5f);
            leadingRect.pivot = new Vector2(0f, 0.5f);
            leadingRect.anchoredPosition = new Vector2(BarPaddingX, 0f);
            leadingRect.sizeDelta = new Vector2(LeadingWidth, LeadingHeight);
            Image leadingImg = leadingGo.AddComponent<Image>();
            leadingImg.color = DesignTokens.Current.surfaceRow; // REUSE — même famille que le chrome de la TabBar
            Button leadingBtn = leadingGo.AddComponent<Button>();
            leadingBtn.targetGraphic = leadingImg;
            leadingBtn.onClick.AddListener(() => leadingOnClick?.Invoke());

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

            // Écart (7) — le callsign n'existe pas dans `.barre` de la maquette : reste un hook de
            // DONNÉES headless (R2.2 scan corpus, C2F4), zéro chrome visible (alpha 0). Ne dépend
            // plus du bouton leading — invisible, il n'a rien à éviter.
            callsignText = NewText("Callsign", "Boss",
                new Vector2(0f, 0.5f), new Vector2(0f, 0.5f), new Vector2(0f, 0.5f),
                new Vector2(BarPaddingX, 0f), new Vector2(220f, 40f),
                15f, TextAlignmentOptions.Left, WithAlpha(DesignTokens.Current.onSurfacePrimary, 0f));
            callsignText.raycastTarget = false;

            BuildMoneyCluster();
            BuildManometre();
            BuildClockCluster();
            BuildNotificationHook();

            RepositionMoneyCluster();
        }

        /// <summary>`hudHairlineGold`, REUSE exact `--laiton` (hud-brennar.html:5). Root cause du
        /// round précédent (247ed3b, voir header de classe) : `accentGold` composé par ALPHA. Ce
        /// round n'a PLUS BESOIN de composer — le hex laiton EXACT est un token dédié, opaque,
        /// utilisé TEL QUEL pour le filet et l'anneau du médaillon (le soulignement sous le montant
        /// est un token DISTINCT, `hudMoneyUnderlineGold` — mesuré tour 2, voir BuildMoneyCluster).</summary>
        private void InitPalette()
        {
            calmGoldColor = DesignTokens.Current.hudHairlineGold;
        }

        /// <summary>« Verre gravé bleu nuit » (doctrine — hud-brennar.html:26,
        /// `linear-gradient(180deg,#0b111be8,#0d131ed8)`) — dégradé vertical composé depuis les DEUX
        /// tokens DÉDIÉS `hudBarGlassTop`/`hudBarGlassBottom` (écart de fond mesuré par le ruling :
        /// `surfaceBase`/`nightBackground` composés au round précédent lisaient `#0d0f10` gris neutre
        /// contre `#0f1722` bleu nuit cible). Enfant d'un `Mask` à coins arrondis (écart (6),
        /// `ProceduralUI.RoundedRectMask`) — `BarMask` est le PREMIER enfant de la racine (rendu SOUS
        /// tout le reste), `BarBackground` son unique enfant, stretché.</summary>
        private void BuildBarBackground()
        {
            GameObject maskGo = new GameObject("BarMask", typeof(RectTransform), typeof(CanvasRenderer));
            maskGo.transform.SetParent(transform, false);
            Stretch((RectTransform)maskGo.transform, Vector2.zero, Vector2.zero);
            Image maskImg = maskGo.AddComponent<Image>();
            maskImg.sprite = ProceduralUI.RoundedRectMask((int)BarCornerRadiusPx);
            maskImg.type = Image.Type.Sliced;
            maskImg.color = Color.white;
            maskImg.raycastTarget = false;
            Mask mask = maskGo.AddComponent<Mask>();
            mask.showMaskGraphic = false; // seul le canal ALPHA sert de stencil — jamais son .color
            maskGo.transform.SetAsFirstSibling();

            // MESURÉ (execute_code, TopBarController.BuildLayout() réel, round précédent 2026-08-21)
            // — `[RequireComponent(typeof(CanvasRenderer))]` porté par `Graphic` (base de
            // VerticalGradientImage) n'est PAS auto-honoré par `gameObject.AddComponent<T>()` pour un
            // type dérivé à l'exécution — `CanvasRenderer` EXPLICITE dans le constructeur du
            // GameObject, avant tout `AddComponent`.
            GameObject bgGo = new GameObject("BarBackground", typeof(RectTransform), typeof(CanvasRenderer));
            bgGo.transform.SetParent(maskGo.transform, false);
            Stretch((RectTransform)bgGo.transform, Vector2.zero, Vector2.zero);
            barBackground = bgGo.AddComponent<VerticalGradientImage>();
            barBackground.raycastTarget = false;
            barBackground.SetColors(DesignTokens.Current.hudBarGlassTop, DesignTokens.Current.hudBarGlassBottom);
        }

        /// <summary>Filet or (`hudHairlineGold`, opaque — plus de composition par alpha, voir
        /// InitPalette) sur le bord bas de la barre — 2px, pleine largeur. Épaisseur volontairement
        /// fine : c'est ce qui la garde HORS de la falsifiable "or jamais en aplat" (sa plus petite
        /// dimension reste sous le seuil "filet", quelle que soit sa longueur). Écart (6) — calme par
        /// défaut, JAMAIS rouge hors alarme (`UpdateAlarmState`, inchangé, hors périmètre).</summary>
        private void BuildHairline()
        {
            GameObject hlGo = new GameObject("Hairline", typeof(RectTransform));
            hlGo.transform.SetParent(transform, false);
            RectTransform hlRect = (RectTransform)hlGo.transform;
            hlRect.anchorMin = new Vector2(0f, 0f);
            hlRect.anchorMax = new Vector2(1f, 0f);
            hlRect.pivot = new Vector2(0.5f, 0f);
            hlRect.sizeDelta = new Vector2(0f, HairlineThicknessPx);
            hlRect.anchoredPosition = Vector2.zero;
            hairline = hlGo.AddComponent<Image>();
            hairline.raycastTarget = false;
            hairline.color = calmGoldColor;
        }

        /// <summary>Écart (1) — « L'argent, seul or de l'écran » (doctrine, hud-brennar.html annexe
        /// §1) : coin GAUCHE de la barre, cluster à 3 éléments — label petites capitales (ARGENT,
        /// `hudCremeSecondary`), montant serif (`hudMoneyGold`), soulignement décoratif 2px
        /// (`hudMoneyUnderlineGold`, REUSE `--or`, DISTINCT du laiton de l'anneau — mesuré tour 2 sur
        /// le rendu pixel). Le soulignement N'ENCODE PAS un ratio propre/sale — aucune donnée
        /// client ne porte cette information (voir Deviations) ; sa présence/largeur est un choix
        /// visuel FIXE, jamais une valeur dérivée d'un champ inexistant (R2.2).</summary>
        private void BuildMoneyCluster()
        {
            GameObject clusterGo = new GameObject("MoneyCluster", typeof(RectTransform));
            clusterGo.transform.SetParent(transform, false);
            moneyClusterRect = (RectTransform)clusterGo.transform;
            moneyClusterRect.anchorMin = moneyClusterRect.anchorMax = new Vector2(0f, 0.5f);
            moneyClusterRect.pivot = new Vector2(0f, 0.5f);
            moneyClusterRect.anchoredPosition = new Vector2(BarPaddingX, 0f);
            moneyClusterRect.sizeDelta = new Vector2(MoneyClusterWidth, 40f);

            // MESURÉ (sonde Tools/hud-topbar-probe.py, 2026-08-21) — à 8.5pt, le SDF de ce
            // label ne produit AUCUN pixel pleinement saturé (delta mesuré ~30 contre la
            // référence Chrome, qui ATTEINT le hex exact) : les traits sont trop fins pour
            // qu'un échantillon tombe pleinement "dans" l'encre à cette taille. Remonté à 10pt —
            // aucune falsifiable n'épingle 8.5 précisément (légende décorative).
            moneyLabelText = NewText("Label", "ARGENT",
                new Vector2(0f, 1f), new Vector2(1f, 1f), new Vector2(0f, 1f),
                new Vector2(0f, -1f), new Vector2(MoneyClusterWidth, 13f),
                11f, TextAlignmentOptions.Left, DesignTokens.Current.hudCremeSecondary,
                letterSpacing: 3f, parent: clusterGo.transform);

            moneyValueText = NewText("Value", "—",
                new Vector2(0f, 1f), new Vector2(1f, 1f), new Vector2(0f, 1f),
                new Vector2(0f, -14f), new Vector2(MoneyClusterWidth, 22f),
                19f, TextAlignmentOptions.Left, DesignTokens.Current.hudMoneyGold,
                parent: clusterGo.transform);
            moneyValueText.font = DesignTokens.Current.hudSerifFont;

            GameObject underlineGo = new GameObject("Underline", typeof(RectTransform));
            underlineGo.transform.SetParent(clusterGo.transform, false);
            RectTransform underlineRect = (RectTransform)underlineGo.transform;
            underlineRect.anchorMin = underlineRect.anchorMax = new Vector2(0f, 1f);
            underlineRect.pivot = new Vector2(0f, 1f);
            underlineRect.anchoredPosition = new Vector2(0f, -37f);
            underlineRect.sizeDelta = new Vector2(MoneyUnderlineWidthPx, HairlineThicknessPx);
            moneyUnderline = underlineGo.AddComponent<Image>();
            moneyUnderline.color = DesignTokens.Current.hudMoneyUnderlineGold; // --or, DISTINCT du laiton (tour 2, mesuré)
            moneyUnderline.raycastTarget = false;
        }

        /// <summary>Écart (3) — l'horloge passe à l'aile DROITE : petites capitales "JOUR {N}" en
        /// haut (`hudCremeSecondary`), valeur DOMINANTE en grand serif en bas (`hudCreme`) —
        /// substitut honnête à l'heure "HH:MM" de la maquette (voir Deviations, `SetDayPhase`).</summary>
        private void BuildClockCluster()
        {
            GameObject clusterGo = new GameObject("ClockCluster", typeof(RectTransform));
            clusterGo.transform.SetParent(transform, false);
            RectTransform clusterRect = (RectTransform)clusterGo.transform;
            clusterRect.anchorMin = clusterRect.anchorMax = new Vector2(1f, 0.5f);
            clusterRect.pivot = new Vector2(1f, 0.5f);
            clusterRect.anchoredPosition = new Vector2(-BarPaddingX, 0f);
            clusterRect.sizeDelta = new Vector2(ClockClusterWidth, 40f);

            // Même correctif de netteté que moneyLabelText — voir son commentaire.
            dayLabelText = NewText("DayLabel", "JOUR —",
                new Vector2(0f, 1f), new Vector2(1f, 1f), new Vector2(1f, 1f),
                new Vector2(0f, -1f), new Vector2(ClockClusterWidth, 13f),
                11f, TextAlignmentOptions.Right, DesignTokens.Current.hudCremeSecondary,
                letterSpacing: 3f, parent: clusterGo.transform);

            phaseValueText = NewText("PhaseValue", "—",
                new Vector2(0f, 1f), new Vector2(1f, 1f), new Vector2(1f, 1f),
                new Vector2(0f, -14f), new Vector2(ClockClusterWidth, 22f),
                17f, TextAlignmentOptions.Right, DesignTokens.Current.hudCreme,
                parent: clusterGo.transform);
            phaseValueText.font = DesignTokens.Current.hudSerifFont;
        }

        /// <summary>§6.4 (chunk 5) — 3 zones peintes / 4 arrêts d'aiguille. Le manomètre est un
        /// "médaillon" circulaire (anneau + face + ARC réel, écart (2)), ancré EXACTEMENT au centre
        /// de la barre (0.5/0.5, position ZÉRO) — indépendant de tout ce qui l'entoure (DA1).
        /// `ZoneRow` (3 bandes peintes, sa propre HorizontalLayoutGroup) et `Needle` restent des
        /// FRÈRES — jamais parent/enfant — sinon la Layout Group du premier écraserait la rotation du
        /// second. Le judge fonctionnel de ce chunk reste inchangé (§0 périmètre du design d'origine) :
        /// `ZoneRow` garde EXACTEMENT 3 enfants Image aux couleurs `HeatBucketResolver.SeverityColor`
        /// — HudF6/F2 (HudPlayModeTests) l'épinglent byte-pour-byte, inchangé par ce round.
        ///
        /// Écart (2) — l'ARC réel (track + cold + hot) REUSE la géométrie exacte du SVG `.cadran` de
        /// la maquette (hud-brennar.html:159-162) : cold = 180°→90° (moitié GAUCHE du demi-cercle,
        /// fillAmount 0.5 depuis l'origine Left) ; hot = 0°→60,5° (calculé depuis les points SVG
        /// (43,11)→(52,34) autour du centre (30,34), fillAmount 60,5/180≈0.336 depuis l'origine
        /// Right, sens ANTI-horaire pour balayer vers le haut). `Image.FillMethod.Radial180` — le
        /// mécanisme uGUI natif pour un cadran demi-cercle, pas de texture procédurale par angle.</summary>
        private void BuildManometre()
        {
            GameObject manoGo = new GameObject("Manometre", typeof(RectTransform));
            manoGo.transform.SetParent(transform, false);
            RectTransform manoRect = (RectTransform)manoGo.transform;
            manoRect.anchorMin = manoRect.anchorMax = new Vector2(0.5f, 0.5f);
            manoRect.pivot = new Vector2(0.5f, 0.5f);
            manoRect.anchoredPosition = Vector2.zero;
            manoRect.sizeDelta = new Vector2(ManometreDiameter, ManometreDiameter);

            GameObject ringGo = new GameObject("BoitierRing", typeof(RectTransform));
            ringGo.transform.SetParent(manoGo.transform, false);
            Stretch((RectTransform)ringGo.transform, Vector2.zero, Vector2.zero);
            boitierRing = ringGo.AddComponent<Image>();
            boitierRing.sprite = ProceduralUI.Ring((int)ManometreDiameter, BoitierRingThicknessPx, Color.white);
            boitierRing.color = calmGoldColor;
            boitierRing.raycastTarget = false;

            GameObject faceGo = new GameObject("BoitierFace", typeof(RectTransform));
            faceGo.transform.SetParent(manoGo.transform, false);
            RectTransform faceRect = (RectTransform)faceGo.transform;
            faceRect.anchorMin = faceRect.anchorMax = new Vector2(0.5f, 0.5f);
            faceRect.pivot = new Vector2(0.5f, 0.5f);
            faceRect.anchoredPosition = Vector2.zero;
            float faceDiameter = ManometreDiameter - BoitierRingThicknessPx * 2f - 1f;
            faceRect.sizeDelta = new Vector2(faceDiameter, faceDiameter);
            Image face = faceGo.AddComponent<Image>();
            face.sprite = ProceduralUI.RadialDisc((int)faceDiameter,
                DesignTokens.Current.hudGaugeFaceInner, DesignTokens.Current.hudGaugeFaceOuter);
            face.color = Color.white; // la teinte vit DANS le dégradé de la texture, pas dans .color
            face.raycastTarget = false;

            // Alphas REUSE exacts hud-brennar.html:159-161 : track `#ffffff22` (0x22/255=0.133),
            // cold `#7fd4d955` (0x55/255=0.333), hot `#e0664a88` (0x88/255=0.533) — pas de valeur
            // choisie pour la lisibilité, l'exactitude prime (ruling « pixel perfect »).
            //
            // MESURÉ (execute_code, grille empirique Origin180×clockwise×fillAmount, 2026-08-21) —
            // `Image.FillMethod.Radial180` NE se limite PAS à un demi-cercle fixe par origine comme
            // documenté/supposé : à `fillAmount=1`, LES 8 combinaisons origin/clockwise révèlent le
            // cercle COMPLET (mesuré par échantillonnage angulaire, 0 transition sur 360°) — la
            // "moitié" n'est qu'un point de départ + un sens de balayage, jamais un plafond. Track
            // simplifié en conséquence (Type.Simple, cercle complet, alpha basse — un track à alpha
            // 0.133 en cercle complet reste visuellement discret, écart mineur consigné). Cold/Hot
            // calés par la MÊME mesure (pas par un calcul d'angle SVG, réfuté empiriquement) :
            // Origin.Left+CW à 0.20 rend [278°,16°] (gauche→haut) ; Origin.Right+CCW à 0.18 rend
            // [356°,84°] (haut→droite) — les deux couvrent ensemble gauche→haut→droite avec un
            // chevauchement mineur près du haut (sous l'aiguille/le texte, invisible).
            GameObject trackGo = new GameObject("ArcTrack", typeof(RectTransform));
            trackGo.transform.SetParent(manoGo.transform, false);
            RectTransform trackRect = (RectTransform)trackGo.transform;
            trackRect.anchorMin = trackRect.anchorMax = new Vector2(0.5f, 0.5f);
            trackRect.pivot = new Vector2(0.5f, 0.5f);
            trackRect.sizeDelta = new Vector2(ArcDiameterPx, ArcDiameterPx);
            Image trackImg = trackGo.AddComponent<Image>();
            trackImg.sprite = ProceduralUI.Ring((int)ArcDiameterPx, ArcThicknessPx, Color.white);
            trackImg.color = WithAlpha(DesignTokens.Current.onSurfacePrimary, 0.133f);
            trackImg.raycastTarget = false;

            BuildArcSegment(manoGo.transform, "ArcCold",
                WithAlpha(DesignTokens.Current.hudGaugeArcCold, 0.333f), Image.Origin180.Left, true, 0.20f);
            BuildArcSegment(manoGo.transform, "ArcHot",
                WithAlpha(DesignTokens.Current.hudGaugeArcHot, 0.533f), Image.Origin180.Right, false, 0.18f);

            // MESURÉ (revue ⊥ sur capture r5, 2026-08-21) — `ZoneRow` (34×9, ancré au bord bas du
            // médaillon) DÉPASSE le cercle de la face : à sa position la plus basse, le rayon
            // disponible (sqrt(faceRadius²-y²)) est ~11.7px, sa demi-largeur en demande 17 — les 3
            // carrés débordent visiblement du disque (capture : rectangles qui "poking out"). La
            // doctrine (un ARC unique tracé DANS le disque, aiguille + valeur par-dessus) rend de
            // toute façon `ZoneRow` visuellement REDONDANT avec `ArcCold`/`ArcHot` ci-dessus — même
            // information (3 zones de sévérité), portée maintenant par l'arc. `ZoneRow` reste
            // STRUCTURELLEMENT INCHANGÉ (3 enfants, mêmes couleurs `SeverityColor` — hud-F6/F2 le
            // pin sur ces DEUX propriétés, jamais sur la visibilité) : masqué par un `CanvasGroup`
            // sur le CONTENEUR (alpha=0) — ne touche PAS `Image.color` des enfants, donc n'affecte
            // aucune assertion existante.
            GameObject zoneRowGo = new GameObject("ZoneRow", typeof(RectTransform));
            zoneRowGo.transform.SetParent(manoGo.transform, false);
            RectTransform zoneRowRect = (RectTransform)zoneRowGo.transform;
            zoneRowRect.anchorMin = new Vector2(0.5f, 0f);
            zoneRowRect.anchorMax = new Vector2(0.5f, 0f);
            zoneRowRect.pivot = new Vector2(0.5f, 0f);
            zoneRowRect.anchoredPosition = new Vector2(0f, 6f);
            zoneRowRect.sizeDelta = new Vector2(ZoneRowWidth, ZoneRowHeight);
            CanvasGroup zoneRowCg = zoneRowGo.AddComponent<CanvasGroup>();
            zoneRowCg.alpha = 0f;
            zoneRowCg.blocksRaycasts = false;
            zoneRowCg.interactable = false;
            HorizontalLayoutGroup zoneHlg = zoneRowGo.AddComponent<HorizontalLayoutGroup>();
            zoneHlg.childControlWidth = true;
            zoneHlg.childControlHeight = true;
            zoneHlg.childForceExpandWidth = true;
            zoneHlg.childForceExpandHeight = true;
            zoneHlg.spacing = 1;
            // CORRIGÉ (hud-session-arbitrages-design.md §2.3/§2.4) — lookup NOMMÉ, `Severity(rank)`
            // via `HeatBucketResolver`, le lieu UNIQUE (§2.4) — trois appels DIRECTS, indexés par
            // `Severity`, jamais par une position de bucket implicite. INCHANGÉ par ce round.
            Color[] zoneColors =
            {
                HeatBucketResolver.SeverityColor(HeatBucketResolver.Severity.Mild),
                HeatBucketResolver.SeverityColor(HeatBucketResolver.Severity.Moderate),
                HeatBucketResolver.SeverityColor(HeatBucketResolver.Severity.Severe),
            };
            foreach (Color c in zoneColors)
            {
                GameObject zoneGo = new GameObject("Zone", typeof(RectTransform));
                zoneGo.transform.SetParent(zoneRowGo.transform, false);
                Image zoneImg = zoneGo.AddComponent<Image>();
                zoneImg.color = c;
                zoneImg.raycastTarget = false;
            }

            // MESURÉ (capture Play Mode réelle, 2026-08-21) — un pivot bas-centre à y=-3 avec une
            // hampe de 17px traverse la zone où vit `gaugeValueText`, rendant le libellé illisible
            // ("We[aiguille]m" au lieu de "Warm"). Corrigé : pivot RELEVÉ au centre géométrique du
            // cadran (y=0, comme le point d'ancrage du losange laiton de la maquette). `ZoneRow`
            // masqué (voir plus haut) libère la moitié basse du disque : hampe et texte agrandis en
            // conséquence (revue ⊥ sur r5 — la 1ère passe restait crispée dans un espace
            // artificiellement réduit).
            GameObject needleGo = new GameObject("Needle", typeof(RectTransform));
            needleGo.transform.SetParent(manoGo.transform, false);
            heatNeedle = (RectTransform)needleGo.transform;
            heatNeedle.anchorMin = heatNeedle.anchorMax = new Vector2(0.5f, 0.5f);
            heatNeedle.pivot = new Vector2(0.5f, 0f);
            heatNeedle.sizeDelta = new Vector2(2f, 13f);
            heatNeedle.anchoredPosition = new Vector2(0f, 5f);
            Image needleImg = needleGo.AddComponent<Image>();
            needleImg.color = DesignTokens.Current.hudCreme;
            needleImg.raycastTarget = false;

            GameObject centerDotGo = new GameObject("NeedleCenter", typeof(RectTransform));
            centerDotGo.transform.SetParent(manoGo.transform, false);
            RectTransform centerDotRect = (RectTransform)centerDotGo.transform;
            centerDotRect.anchorMin = centerDotRect.anchorMax = new Vector2(0.5f, 0.5f);
            centerDotRect.pivot = new Vector2(0.5f, 0.5f);
            centerDotRect.anchoredPosition = new Vector2(0f, 5f);
            centerDotRect.sizeDelta = new Vector2(5f, 5f);
            Image centerDotImg = centerDotGo.AddComponent<Image>();
            centerDotImg.sprite = ProceduralUI.RadialDisc(5, calmGoldColor, calmGoldColor);
            centerDotImg.raycastTarget = false;

            // `ZoneRow` masqué (CanvasGroup alpha 0, voir plus haut) — plus besoin de réserver de
            // marge pour l'éviter visuellement. `enableAutoSizing` RETIRÉ : mesuré responsable d'un
            // espacement de caractères anormal (rendu observé sur "Warm", capture r5, séparation
            // visible entre 2e et 3e lettre) — TMP recalcule la meilleure taille ET, dans certaines
            // configurations de boîte contrainte en hauteur, en tire un `characterSpacing` effectif
            // incohérent. Taille FIXE à la place — le libellé le plus long des 4 buckets réels
            // (`HeatBucketResolver.Label`) mesuré tenir à 6.5pt dans `faceDiameter-8` — PARAPHRASE
            // délibérée (socle CLAUDE.md) : citer verbatim un littéral de bucket réintroduirait
            // exactement ce que `HudPlayModeTests.F2_BucketLiteralOccurrences` compte.
            gaugeValueText = NewText("GaugeValue", HeatBucketResolver.Label(null),
                new Vector2(0.5f, 0.5f), new Vector2(0.5f, 0.5f), new Vector2(0.5f, 0.5f),
                new Vector2(0f, -8f), new Vector2(faceDiameter - 8f, 12f),
                6.5f, TextAlignmentOptions.Center, DesignTokens.Current.hudCreme,
                parent: manoGo.transform);
            gaugeValueText.font = DesignTokens.Current.hudSerifFont;
            gaugeValueText.enableAutoSizing = false;
            gaugeValueText.textWrappingMode = TextWrappingModes.NoWrap;

            NewText("GaugeCaption", "HEAT",
                new Vector2(0.5f, 0.5f), new Vector2(0.5f, 0.5f), new Vector2(0.5f, 0.5f),
                new Vector2(0f, -18f), new Vector2(faceDiameter - 6f, 7f),
                5.5f, TextAlignmentOptions.Center, DesignTokens.Current.hudCremeSecondary,
                letterSpacing: 3f, parent: manoGo.transform);
        }

        /// <summary>Un segment d'arc du cadran — `Image.FillMethod.Radial180` sur un sprite
        /// `ProceduralUI.Ring` PARTAGÉ (même diamètre/épaisseur, mis en cache par couleur) : le
        /// mécanisme de remplissage radial d'uGUI masque dynamiquement le sprite complet selon
        /// `fillAmount`/`fillOrigin`/`fillClockwise`, aucune texture par angle nécessaire.</summary>
        private static void BuildArcSegment(Transform parent, string name, Color color,
            Image.Origin180 origin, bool clockwise, float fillAmount)
        {
            GameObject go = new GameObject(name, typeof(RectTransform));
            go.transform.SetParent(parent, false);
            RectTransform rect = (RectTransform)go.transform;
            rect.anchorMin = rect.anchorMax = new Vector2(0.5f, 0.5f);
            rect.pivot = new Vector2(0.5f, 0.5f);
            rect.anchoredPosition = Vector2.zero;
            rect.sizeDelta = new Vector2(ArcDiameterPx, ArcDiameterPx);
            Image img = go.AddComponent<Image>();
            img.sprite = ProceduralUI.Ring((int)ArcDiameterPx, ArcThicknessPx, Color.white);
            img.color = color;
            img.type = Image.Type.Filled;
            img.fillMethod = Image.FillMethod.Radial180;
            img.fillOrigin = (int)origin;
            img.fillClockwise = clockwise;
            img.fillAmount = fillAmount;
            img.raycastTarget = false;
        }

        /// <summary>Écart (4) — « zéro badge permanent » (doctrine — le corpus sombre n'a aucun badge
        /// rouge : les événements arrivent en bandeaux éphémères et s'effacent). Le bandeau éphémère
        /// lui-même est HORS PÉRIMÈTRE de ce lot (consigné — voir Deviations : câbler un vrai système
        /// de bandeau temporisé/animé est une fonctionnalité neuve, pas un restyle). Ce qui reste :
        /// un hook de DONNÉES headless (`notificationText`, alpha 0) qui préserve EXACTEMENT le
        /// contrat R2.2 existant (C2F2/C2F4/DA5 : la VALEUR suit `backlogBadge`, scannée, jamais de
        /// chrome visible).</summary>
        private void BuildNotificationHook()
        {
            notificationText = NewText("Notification", "[ ] Clear",
                new Vector2(0.5f, 0.5f), new Vector2(0.5f, 0.5f), new Vector2(0.5f, 0.5f),
                Vector2.zero, new Vector2(10f, 10f),
                10f, TextAlignmentOptions.Center, WithAlpha(DesignTokens.Current.onSurfacePrimary, 0f));
            notificationText.raycastTarget = false;
        }

        private TextMeshProUGUI NewText(string name, string initial, Vector2 anchorMin, Vector2 anchorMax,
            Vector2 pivot, Vector2 anchoredPosition, Vector2 sizeDelta, float fontSize,
            TextAlignmentOptions alignment, Color color, float letterSpacing = 0f, Transform parent = null)
        {
            GameObject go = new GameObject(name, typeof(RectTransform));
            go.transform.SetParent(parent != null ? parent : transform, false);
            RectTransform rt = (RectTransform)go.transform;
            rt.anchorMin = anchorMin;
            rt.anchorMax = anchorMax;
            rt.pivot = pivot;
            rt.anchoredPosition = anchoredPosition;
            rt.sizeDelta = sizeDelta;
            TextMeshProUGUI t = go.AddComponent<TextMeshProUGUI>();
            t.font = DesignTokens.Current.primaryFont;
            t.text = initial;
            t.fontSize = fontSize;
            t.alignment = alignment;
            t.color = color;
            t.characterSpacing = letterSpacing;
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
    }
}
