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
    // HUD v3.1 (doctrine DA, 2026-08-21 — hud-brennar.html / palettes-ecrans.html, verdicts user
    // successifs) — RESTYLE de cette classe, PAS un remplacement : le maillon de session (chunk 5,
    // day_phase/manomètre) et l'action leading (chunk 2, §3.1) restent EXACTEMENT les mêmes
    // méthodes publiques. Ce qui change ici est purement la CONSTRUCTION visuelle (BuildLayout et
    // ce qu'elle appelle) — jamais Load/Render/FormatCash, jamais la sémantique des test hooks.
    // Doctrine appliquée : (1) barre UNIQUE, verre gravé bleu nuit, filet — voir BuildBarBackground/
    // BuildHairline ; (2) manomètre heat CENTRÉ (le geste le plus visible à corriger, verdict user) —
    // voir BuildManometre, ancrage 0.5/0.5 indépendant de tout voisin ; (3) l'or JAMAIS en aplat —
    // un SEUL accès à `accentGold` dans tout ce fichier (InitPalette), composé par alpha pour le
    // filet et l'anneau, jamais une surface pleine ; le solde reste en argent (onSurfacePrimary),
    // jamais en or ; (4) dégradés/texture chiffrés — VerticalGradientImage (fond) + ProceduralUI
    // (médaillon, dégradé radial + anneau). Voir implementation-notes.md § Deviations pour les
    // écarts assumés à la maquette (pas de callsign dans `.barre` source, pas de flou de fond, le
    // tampon "B" simplifié à un filet).
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

        // ---- HUD v3.1 — chrome doctrine (voir header de classe) -------------
        private VerticalGradientImage barBackground;
        private Image hairline;
        private Image boitierRing;
        private Color calmGoldFilet;
        private Color calmGoldRing;

        private const float BarPaddingX = 16f;
        private const float ClusterSpacing = 12f;
        private const float LeadingWidth = 90f;
        private const float LeadingHeight = 40f;
        private const float ManometreDiameter = 64f;
        private const float BoitierRingThicknessPx = 3f;
        private const float CenterFlankGap = 20f;
        private const float CenterFlankWidth = 108f;
        private const float CashWidth = 220f;
        private const float HairlineThicknessPx = 2f;
        private const float ZoneRowWidth = 34f;
        private const float ZoneRowHeight = 9f;

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

        /// <summary>§3.1 — bascule l'action leading. `LeadingAction.None` cache le bouton ; le
        /// callsign reflow vers la gauche (`RepositionLeftCluster`, HUD v3.1 — remplace le reflow
        /// qu'un HorizontalLayoutGroup faisait avant le restyle, désormais impossible puisque le
        /// manomètre exige un ancrage absolu indépendant de ce cluster). `BackToMap` le montre avec
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
            RepositionLeftCluster();
        }

        private static string LabelFor(LeadingAction action)
        {
            switch (action)
            {
                case LeadingAction.BackToMap: return "← Carte"; // "← Carte" — libellé littéral du design §3
                default: return "";
            }
        }

        /// <summary>HUD v3.1 — le callsign est le seul élément dont la position dépend d'un voisin
        /// (le bouton leading). Tout le reste de la barre est ancré en absolu (voir BuildLayout) :
        /// c'est délibérément le SEUL reflow manuel qui reste, et il ne touche jamais le manomètre
        /// (ancré à 0.5/0.5, sans rapport avec ce cluster gauche).</summary>
        private void RepositionLeftCluster()
        {
            if (callsignText == null) return;
            bool leadingVisible = CurrentLeadingAction != LeadingAction.None;
            float x = BarPaddingX + (leadingVisible ? LeadingWidth + ClusterSpacing : 0f);
            RectTransform rt = callsignText.rectTransform;
            rt.anchoredPosition = new Vector2(x, rt.anchoredPosition.y);
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
            UpdateAlarmState();
        }

        /// <summary>HUD v3.1 (doctrine — mockup `.tel.chaud`/`.tel.descente`) : le filet de la barre
        /// et l'anneau du médaillon basculent vers la teinte "Severe" quand la ville brûle
        /// (BURNING), sinon restent au filet or calme. La teinte alarme passe PAR LE RÉSOLVEUR —
        /// jamais un accès direct à un token de sévérité depuis ce fichier (F2_SeverityTokenAccesses
        /// exclut explicitement ce fichier de ces accès directs ; le résolveur reste le lieu
        /// UNIQUE — paraphrase délibérée, socle CLAUDE.md : citer verbatim la forme qu'on évite
        /// réintroduit exactement ce qu'on évite dans le compte du scanner).</summary>
        private void UpdateAlarmState()
        {
            bool alarm = CitywideHeatRank == HeatBucketResolver.Rank.Burning;
            if (alarm)
            {
                Color severe = HeatBucketResolver.SeverityColor(HeatBucketResolver.Severity.Severe);
                if (hairline != null) hairline.color = WithAlpha(severe, 0.85f);
                if (boitierRing != null) boitierRing.color = WithAlpha(severe, 0.9f);
            }
            else
            {
                if (hairline != null) hairline.color = calmGoldFilet;
                if (boitierRing != null) boitierRing.color = calmGoldRing;
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
        // HUD v3.1 — PLUS de HorizontalLayoutGroup unique sur la racine (voir header de classe) :
        // chaque enfant reçoit un ancrage EXPLICITE, seul moyen de garantir le manomètre EXACTEMENT
        // au centre indépendamment de tout ce qui l'entoure. `LeadingAction` et `Manometre` restent
        // des enfants DIRECTS de ce transform (jamais nichés) — NavigationPlayModeTests.cs:89 et
        // HudPlayModeTests.cs:333 font un `Find` À UN SEGMENT qui ne descend pas dans un
        // sous-conteneur.
        private void BuildLayout()
        {
            RectTransform selfRt = GetComponent<RectTransform>();
            if (selfRt == null) selfRt = gameObject.AddComponent<RectTransform>();
            Stretch(selfRt, Vector2.zero, Vector2.zero);

            InitPalette();
            BuildBarBackground();
            BuildHairline();

            // §3.1 — le bouton leading (inchangé fonctionnellement ; ancrage explicite désormais).
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

            // Identité — coin gauche, indépendante du centre (la maquette ne montre pas de callsign
            // dans sa `.barre` — voir implementation-notes.md § Deviations). Autosize pour ne plus
            // jamais passer en 2 lignes sur un callsign long (bug visible pré-restyle, corrigé au
            // passage — aucune falsifiable n'épingle la taille de police exacte).
            callsignText = NewText("Callsign", "Boss",
                new Vector2(0f, 0.5f), new Vector2(0f, 0.5f), new Vector2(0f, 0.5f),
                new Vector2(BarPaddingX, 0f), new Vector2(220f, 40f),
                15f, TextAlignmentOptions.Left, DesignTokens.Current.onSurfacePrimary);
            callsignText.enableAutoSizing = true;
            callsignText.fontSizeMin = 10f;
            callsignText.fontSizeMax = 15f;
            callsignText.textWrappingMode = TextWrappingModes.NoWrap;

            // Flanc GAUCHE du centre — jour (grand) + phase (caption), à `CenterFlankGap` du bord
            // du manomètre — "callsign/jour/badge répartis autour du centre" (doctrine).
            gameDayText = NewText("GameDay", "Day —",
                new Vector2(0.5f, 0.5f), new Vector2(0.5f, 0.5f), new Vector2(1f, 0.5f),
                new Vector2(-(ManometreDiameter / 2f + CenterFlankGap), 7f), new Vector2(CenterFlankWidth, 20f),
                14f, TextAlignmentOptions.Right, DesignTokens.Current.onSurfacePrimary);
            dayPhaseLabel = NewText("DayPhase", "—",
                new Vector2(0.5f, 0.5f), new Vector2(0.5f, 0.5f), new Vector2(1f, 0.5f),
                new Vector2(-(ManometreDiameter / 2f + CenterFlankGap), -9f), new Vector2(CenterFlankWidth, 14f),
                9.5f, TextAlignmentOptions.Right, DesignTokens.Current.onSurfaceSecondary, letterSpacing: 6f);

            BuildManometre();
            BuildNotificationBadge();

            // Bord droit — solde, EN ARGENT (doctrine : "l'or jamais en aplat... chiffres d'argent
            // seulement") — jamais accentGold ici.
            cashText = NewText("Cash", "—",
                new Vector2(1f, 0.5f), new Vector2(1f, 0.5f), new Vector2(1f, 0.5f),
                new Vector2(-BarPaddingX, 0f), new Vector2(CashWidth, 40f),
                19f, TextAlignmentOptions.Right, DesignTokens.Current.onSurfacePrimary);

            RepositionLeftCluster();
        }

        /// <summary>UNIQUE lecture de `accentGold` dans tout ce fichier (ChromeTabAccentAllowlist —
        /// forme (iii), indirection par variable — compte 1 occurrence, allowlist amendée
        /// NOMMÉMENT pour ce fichier). Composé par ALPHA en deux teintes dérivées (filet / anneau),
        /// jamais une couleur d'aplat : doctrine "l'or jamais en aplat, filets seulement".</summary>
        private void InitPalette()
        {
            Color baseGold = DesignTokens.Current.accentGold;
            calmGoldFilet = WithAlpha(baseGold, 0.62f);
            calmGoldRing = WithAlpha(baseGold, 0.78f);
        }

        /// <summary>"Verre gravé bleu nuit" (doctrine finale, palettes-ecrans.html §D) — dégradé
        /// vertical composé à partir de DEUX tokens EXISTANTS (jamais un 52e) : `nightBackground`
        /// (déjà "bleu-pétrole désaturé" au canon, le voisin mesuré le plus proche du stop haut de
        /// la maquette) en haut, `surfaceBase` (voisin le plus proche du stop bas) en bas — alpha
        /// réduite pour la sensation "verre" (implementation-notes.md § Deviations : pas de flou de
        /// fond réel, uGUI ne l'offre pas nativement pour ce panneau).</summary>
        private void BuildBarBackground()
        {
            // MESURÉ (execute_code, 2026-08-21) — `[RequireComponent(typeof(CanvasRenderer))]` porté
            // par `Graphic` (base de VerticalGradientImage) n'est PAS auto-honoré par
            // `gameObject.AddComponent<T>()` pour un type dérivé à l'exécution : `Image` (le type
            // Unity natif) obtient bien son `CanvasRenderer` automatiquement, `VerticalGradientImage`
            // non — reproduit sur deux GameObjects isolés, comparés côte à côte. Sans lui, `Graphic`
            // ne peut RIEN dessiner (silencieux — le fond tombait au flat `surfaceCard` de
            // `TopBarSlot`, EN DESSOUS, sans qu'aucune erreur ne le signale). Remède : `CanvasRenderer`
            // EXPLICITE dans le constructeur du GameObject, avant tout `AddComponent`.
            GameObject bgGo = new GameObject("BarBackground", typeof(RectTransform), typeof(CanvasRenderer));
            bgGo.transform.SetParent(transform, false);
            Stretch((RectTransform)bgGo.transform, Vector2.zero, Vector2.zero);
            barBackground = bgGo.AddComponent<VerticalGradientImage>();
            barBackground.raycastTarget = false;
            Color top = DesignTokens.Current.nightBackground; top.a = 0.96f;
            Color bottom = DesignTokens.Current.surfaceBase; bottom.a = 0.92f;
            barBackground.SetColors(top, bottom);
            bgGo.transform.SetAsFirstSibling(); // rendu EN DESSOUS de tout le reste (ordre de fratrie uGUI)
        }

        /// <summary>Filet or (composé, voir InitPalette) sur le bord bas de la barre — 2px, pleine
        /// largeur. Épaisseur volontairement fine : c'est ce qui la garde HORS de la falsifiable
        /// "or jamais en aplat" (sa plus petite dimension reste sous le seuil "filet", quelle que
        /// soit sa longueur).</summary>
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
            hairline.color = calmGoldFilet;
        }

        /// <summary>§6.4 (chunk 5) — 3 zones peintes / 4 arrêts d'aiguille. HUD v3.1 : le manomètre
        /// est désormais un "médaillon" circulaire (dégradé radial + anneau, hud-brennar.html
        /// `.medaillon`), ancré EXACTEMENT au centre de la barre (0.5/0.5, position ZÉRO) —
        /// indépendant de tout ce qui l'entoure, c'est le geste le plus visible corrigé par ce lot
        /// (verdict user). `ZoneRow` (3 bandes peintes, sa propre HorizontalLayoutGroup) et
        /// `Needle` (pivot bas-centre, tourné par `SetCitywideHeatBucket`) restent des FRÈRES —
        /// jamais parent/enfant — sinon la Layout Group du premier écraserait la rotation du
        /// second. Le judge de ce chunk reste fonctionnel (§0 périmètre du design d'origine) :
        /// `ZoneRow` garde EXACTEMENT 3 enfants Image aux couleurs `HeatBucketResolver.SeverityColor`
        /// — HudF6/F2 (HudPlayModeTests) l'épinglent byte-pour-byte, inchangé par ce restyle.</summary>
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
            boitierRing.color = calmGoldRing;
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
                DesignTokens.Current.surfaceRaised, DesignTokens.Current.surfaceBase);
            face.color = Color.white; // la teinte vit DANS le dégradé de la texture, pas dans .color
            face.raycastTarget = false;

            GameObject zoneRowGo = new GameObject("ZoneRow", typeof(RectTransform));
            zoneRowGo.transform.SetParent(manoGo.transform, false);
            RectTransform zoneRowRect = (RectTransform)zoneRowGo.transform;
            zoneRowRect.anchorMin = new Vector2(0.5f, 0f);
            zoneRowRect.anchorMax = new Vector2(0.5f, 0f);
            zoneRowRect.pivot = new Vector2(0.5f, 0f);
            zoneRowRect.anchoredPosition = new Vector2(0f, 6f);
            zoneRowRect.sizeDelta = new Vector2(ZoneRowWidth, ZoneRowHeight);
            HorizontalLayoutGroup zoneHlg = zoneRowGo.AddComponent<HorizontalLayoutGroup>();
            zoneHlg.childControlWidth = true;
            zoneHlg.childControlHeight = true;
            zoneHlg.childForceExpandWidth = true;
            zoneHlg.childForceExpandHeight = true;
            zoneHlg.spacing = 1;
            // CORRIGÉ (hud-session-arbitrages-design.md §2.3/§2.4) — lookup NOMMÉ, `Severity(rank)`
            // via `HeatBucketResolver`, le lieu UNIQUE (§2.4) — trois appels DIRECTS, indexés par
            // `Severity`, jamais par une position de bucket implicite. INCHANGÉ par le restyle.
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

            GameObject needleGo = new GameObject("Needle", typeof(RectTransform));
            needleGo.transform.SetParent(manoGo.transform, false);
            heatNeedle = (RectTransform)needleGo.transform;
            heatNeedle.anchorMin = heatNeedle.anchorMax = new Vector2(0.5f, 0.5f);
            heatNeedle.pivot = new Vector2(0.5f, 0f);
            heatNeedle.sizeDelta = new Vector2(2.5f, 20f);
            heatNeedle.anchoredPosition = new Vector2(0f, -4f);
            Image needleImg = needleGo.AddComponent<Image>();
            needleImg.color = DesignTokens.Current.onSurfacePrimary;
            needleImg.raycastTarget = false;
        }

        /// <summary>Le "badge" (point de notification) — flanc DROIT du centre. Doctrine "tampon
        /// SIGNER L'ORDRE" (palettes-ecrans.html §B/§D) REUSE comme MATÉRIAU (filet or en
        /// soulignement, texte espacé) — pas comme COPIE : le texte fonctionnel existant
        /// ("[!] New" / "[ ] Clear") reste VERBATIM, épinglé par C2F2/C2F4 — voir
        /// implementation-notes.md § Deviations pour cette lecture.</summary>
        private void BuildNotificationBadge()
        {
            GameObject badgeGo = new GameObject("Notification", typeof(RectTransform));
            badgeGo.transform.SetParent(transform, false);
            RectTransform badgeRect = (RectTransform)badgeGo.transform;
            badgeRect.anchorMin = badgeRect.anchorMax = new Vector2(0.5f, 0.5f);
            badgeRect.pivot = new Vector2(0f, 0.5f);
            badgeRect.anchoredPosition = new Vector2(ManometreDiameter / 2f + CenterFlankGap, 0f);
            badgeRect.sizeDelta = new Vector2(CenterFlankWidth, 28f);

            Image badgeBg = badgeGo.AddComponent<Image>();
            badgeBg.color = DesignTokens.Current.surfaceRow; // REUSE — même chrome que le bouton leading
            badgeBg.raycastTarget = false;

            GameObject underlineGo = new GameObject("Underline", typeof(RectTransform));
            underlineGo.transform.SetParent(badgeGo.transform, false);
            RectTransform underlineRect = (RectTransform)underlineGo.transform;
            underlineRect.anchorMin = new Vector2(0f, 0f);
            underlineRect.anchorMax = new Vector2(1f, 0f);
            underlineRect.pivot = new Vector2(0.5f, 0f);
            underlineRect.sizeDelta = new Vector2(-8f, HairlineThicknessPx);
            underlineRect.anchoredPosition = new Vector2(0f, 2f);
            Image underlineImg = underlineGo.AddComponent<Image>();
            underlineImg.color = calmGoldFilet;
            underlineImg.raycastTarget = false;

            notificationText = NewText("Label", "[ ] Clear",
                Vector2.zero, Vector2.one, new Vector2(0.5f, 0.5f),
                Vector2.zero, Vector2.zero,
                13f, TextAlignmentOptions.Center, DesignTokens.Current.onSurfacePrimary,
                letterSpacing: 2f, parent: badgeGo.transform);
            Stretch(notificationText.rectTransform, new Vector2(4f, 2f), new Vector2(-4f, -2f));
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
