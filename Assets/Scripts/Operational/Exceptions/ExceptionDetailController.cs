using System;
using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.EventSystems;
using UnityEngine.InputSystem.UI;
using UnityEngine.UI;
using MafiaCleanCity.Theme;
using TMPro;

namespace MafiaCleanCity.Operational.Exceptions
{
    // IMPLEMENTS: spec §4-T3 — screen_5a (Exception Detail) REDUCED surface: full descriptor + bands, candidate
    // actions as tap buttons (suggested highlighted), the "Add as rule" toggle (canon 5a) with the DSL preview,
    // a separate Escalate button, the qualitative outcome after resolve, Back. Honest deferral: rich confirmations /
    // reduced-motion / telemetry / full A11y pass (screen_5a canon) land with the canon completion (spec §8).
    // -- session:2026-06-10 (Phase-20 T3) --
    //
    // METHOD DERIVATION (action-bound — mirrors the backend's consistency guard; the UI never invents a method):
    //   candidate.effect.type non-empty → method = effect.type (raid REPAIR/BRIBE/LAY_LOW)
    //   else addAsRule && add_rule_dsl non-empty → ADD_RULE
    //   else → ONE_TIME
    // Escalate is its own affordance → ESCALATE with chosen_action_id = suggested_action.id.
    public class ExceptionDetailController : MonoBehaviour, MafiaCleanCity.Shell.IShellTenant
    {
        // ---- Public state (PlayMode test hooks) ----
        public ExceptionCardDto CurrentCard { get; private set; }
        public string LastOutcome { get; private set; }
        public string LastError { get; private set; }
        public bool AddAsRule { get; private set; }
        public IReadOnlyList<string> RenderedTexts => renderedTexts;

        private string token;
        private string baseUrl = "http://localhost";
        private Action onBack;
        private ExceptionsClient client;

        private readonly List<string> renderedTexts = new List<string>();
        private TMP_FontAsset font;
        private RectTransform body;
        private bool initialized;
        private bool resolving;
        private GameObject backdropGo;
        private GameObject sheetGo;

        // House teardown pattern (BuildingCardController precedent): a destroyed flag set in OnDestroy +
        // Unity fake-null. OnDestroy also tears down the screen's canvas children — BuildLayout parents the
        // backdrop/sheet to the SHARED canvas (not the host), so destroying the host alone would orphan an
        // opaque, raycast-eating overlay on top of the queue (the review C1 finding).
        private bool destroyed;
        private void OnDestroy()
        {
            destroyed = true;
            if (backdropGo != null) Destroy(backdropGo);
            if (sheetGo != null) Destroy(sheetGo);
        }
        private bool Destroyed => destroyed || this == null;

        // Slate palette (mirrors DashboardController).
        private static Color SurfaceBg => DesignTokens.Current.surfaceBase;
        private static Color CardBg => DesignTokens.Current.surfaceCard;
        private static Color RowBg => DesignTokens.Current.surfaceRow;
        private static Color TextPrimary => DesignTokens.Current.onSurfacePrimary;
        private static Color TextSecondary => DesignTokens.Current.onSurfaceSecondary;
        private static Color AccentMild => DesignTokens.Current.accentSuccess;
        private static Color AccentModerate => DesignTokens.Current.accentWarning;
        private static Color AccentSevere => DesignTokens.Current.accentDanger;
        private static Color CtaColor => DesignTokens.Current.accentGold;

        /// <summary>Wire the card + bearer + back-callback. Safe before Start() (the queue calls this in the same
        /// frame as AddComponent); Start() then builds the layout from the injected card.</summary>
        public void Init(ExceptionCardDto card, string bearer, string url, Action onBack)
        {
            CurrentCard = card;
            token = bearer;
            if (!string.IsNullOrEmpty(url)) baseUrl = url;
            this.onBack = onBack;
            EnsureInitialized();
            Render();
        }

        private void Start() { EnsureInitialized(); Render(); }

        private void EnsureInitialized()
        {
            if (initialized) return;
            initialized = true;
            font = DesignTokens.Current.primaryFont;
            client = new ExceptionsClient { BaseUrl = baseUrl };
            BuildLayout();
            EnsureEventSystem();
        }

        /// <summary>The action-bound method derivation (public static — unit-asserted by the PlayMode test).</summary>
        public static string MethodFor(CandidateActionDto a, bool addAsRule)
        {
            if (a != null && a.effect != null && !string.IsNullOrEmpty(a.effect.type)) return a.effect.type;
            if (addAsRule && a != null && !string.IsNullOrEmpty(a.add_rule_dsl)) return "ADD_RULE";
            return "ONE_TIME";
        }

        /// <summary>Toggle "Add as rule" (canon 5a) — re-renders so teachable candidates show/hide their DSL preview.</summary>
        public void SetAddAsRule(bool on)
        {
            AddAsRule = on;
            if (!Destroyed && initialized) Render();
        }

        /// <summary>Resolve via ONE candidate (method derived). Public coroutine — the PlayMode test drives it.</summary>
        public IEnumerator ResolveWith(CandidateActionDto candidate)
        {
            yield return DoResolve(MethodFor(candidate, AddAsRule), candidate != null ? candidate.id : "");
        }

        /// <summary>Escalate the card (ESCALATE; chosen_action_id = the suggested action's id).</summary>
        public IEnumerator Escalate()
        {
            string suggestedId = CurrentCard != null && CurrentCard.suggested_action != null ? CurrentCard.suggested_action.id : "";
            yield return DoResolve("ESCALATE", suggestedId);
        }

        private IEnumerator DoResolve(string method, string chosenActionId)
        {
            if (CurrentCard == null || resolving) yield break;
            resolving = true;
            LastError = null;
            ResolveResponse res = null;
            yield return client.Resolve(CurrentCard.exception_id, method, chosenActionId, token,
                ok => res = ok,
                (code, msg) => LastError = msg);
            resolving = false;
            if (Destroyed) yield break;
            if (res == null)
            {
                // Readable failure (F2): 409 already-resolved / 422 bad method render as the envelope message;
                // the player goes Back (which re-fetches the queue — stale taps self-heal).
                Render();
                yield break;
            }
            LastOutcome = res.outcome;
            Render();
        }

        /// <summary>Back to the queue: destroy this host (OnDestroy tears down the backdrop/sheet) + let the
        /// queue re-fetch.</summary>
        public void Back()
        {
            Action cb = onBack;
            if (this != null) Destroy(gameObject);
            cb?.Invoke();
        }

        // ---- render ----
        private void Render()
        {
            if (Destroyed || body == null) return;
            ExceptionCardDto c = CurrentCard;
            if (c == null) return;

            ClearBody();

            // ── `.parle` : qui parle, ses trois bandes en pastilles, puis sa réplique ──
            // Maquette : « <b>Le cuisinier</b> · au bâtiment touché » + chips gravité/priorité/
            // confiance, puis la réplique entre guillemets.
            //
            // ⚠️ LE RÔLE N'EST PAS DANS CE CORPS. La maquette le tire de `GET /v1/lieutenants`
            // par jointure (`archetype`) — jointure que cet écran ne fait pas. Et `lieutenant`
            // porte bien un `name` depuis peu, mais sa valeur est « Lieutenant » : le placeholder
            // de TD-046, écrit par le chemin de recrutement de production lui-même sur 18 996
            // lignes. Rien dans le corps ne distingue ce placeholder d'un vrai nom.
            // ★ Donc on montre le RÔLE générique, pas le « nom ». Afficher « Lieutenant » comme
            //   un nom serait le même mensonge que « SALVATORE » sur ㊲ : plus joli, et faux.
            //   L'écart est déclaré ici avec sa date plutôt que masqué.
            string qui = c.lieutenant_id != null && c.lieutenant_id.Length > 0
                ? "Votre lieutenant" : "La ville";
            TextMeshProUGUI quiTxt = NewText("Qui", body, qui, (int)PxD(11f), TextAlignmentOptions.Left);
            quiTxt.fontStyle = FontStyles.Bold;
            AddLayoutElement(quiTxt.gameObject, minHeight: PxD(14f), flexibleHeight: 0);
            TrackText(quiTxt, qui);

            // Les trois bandes, en pastilles — libellés FERMÉS, suivis par le corpus de balayage.
            string pastilles = $"{Cap(c.severity_band)} · {Cap(c.priority_band)} · {Cap(c.confidence_band)}";
            TextMeshProUGUI chips = NewText("Chips", body, pastilles, (int)PxD(CssChipCorps * 1.4f),
                                            TextAlignmentOptions.Left);
            chips.color = SeverityTeinte(c.severity_band);
            AddLayoutElement(chips.gameObject, minHeight: PxD(11f), flexibleHeight: 0);
            TrackText(chips, pastilles);

            // La réplique — texte PRODUCTEUR (prose anglaise aujourd'hui, clé demain) : chrome,
            // non suivi. Passe par le point unique `Texte()`.
            TextMeshProUGUI desc = NewText("Descriptor", body,
                "« " + Texte(c.event_descriptor) + " »", (int)PxD(11.5f), TextAlignmentOptions.Left);
            desc.color = TextPrimary;
            AddLayoutElement(desc.gameObject, minHeight: PxD(24f), flexibleHeight: 0);

            // ---- Resolved state: show outcome + Back, then return. ----
            if (!string.IsNullOrEmpty(LastOutcome))
            {
                TextMeshProUGUI resolved = NewText("Resolved", body, "Résolu ✓", 16, TextAlignmentOptions.Left);
                resolved.color = AccentMild;
                resolved.fontStyle = FontStyles.Bold;
                AddLayoutElement(resolved.gameObject, minHeight: 22, flexibleHeight: 0);
                TrackText(resolved, "Résolu ✓");

                // Outcome — producer free text (enum value may carry letters but qualitative): CHROME, TextPrimary.
                TextMeshProUGUI outcomeText = NewText("Outcome", body, "Issue : " + LastOutcome, 14, TextAlignmentOptions.Left);
                outcomeText.color = TextPrimary;
                AddLayoutElement(outcomeText.gameObject, minHeight: 20, flexibleHeight: 0);
                // chrome — NOT tracked

                AddButton("Back", Back);
                return;
            }

            // ---- Error line (if present — producer text, chrome). ----
            if (!string.IsNullOrEmpty(LastError))
            {
                TextMeshProUGUI errText = NewText("Error", body, LastError, 13, TextAlignmentOptions.Left);
                errText.color = AccentSevere;
                AddLayoutElement(errText.gameObject, minHeight: 18, flexibleHeight: 0);
                // chrome — NOT tracked
            }

            // ═══ ⑩ LA MAIN DE CARTES — maquette RATIFIÉE `ecrans-brennar-4.html`, cadre
            // « Exception — sa main de cartes (le détail) », ratifiée avec ⑨ le 2026-08-26.
            //
            // ⛔ IL N'Y A PAS DE ROUTE DE DÉTAIL, et ce n'est pas un manque : `GET
            // /v1/exceptions/:id` rend 404 (mesuré 2026-09-02) et la maquette le DIT elle-même —
            // « le détail, même carte dépliée — il n'y a pas de GET unitaire ». La carte de la
            // file porte déjà tout. Ne pas ouvrir de lot back pour cette route.
            //
            // Les trois cartes ne sont pas trois candidats quelconques : ce sont trois RÔLES, et
            // le dessin les place toujours au même endroit (la suggérée au MILIEU, levée —
            // `.carte:nth-child(2){translateY(-8px)}`). Le reste part au TALON, qui n'est pas un
            // ornement mais le CARDINAL des issues non montrées.
            RendreMain(c);
            AddButton("Escalate", () => StartCoroutine(Escalate()));
            AddButton("Back", Back);
        }

        // ── ⑩ : les constantes de la maquette, lues à la source (série 4, largeur 300) ──
        private const float CssMainEcart   = 7f;     // .main{gap:7px}
        private const float CssCarteRayon  = 9f;     // .carte{border-radius:9px}
        private const float CssCarteLargeur = 100f;  // .carte{max-width:100px}
        private const float CssCarteRatio  = 3f / 2f;// .carte{aspect-ratio:2/3}
        private const float CssCarteLeve   = 8f;     // .carte:nth-child(2){translateY(-8px)}
        private const float CssCarteL      = 8f;     // .carte .l
        private const float CssCarteT      = 11.5f;  // .carte .t
        private const float CssCarteC      = 7.5f;   // .carte .c
        private const float CssTalonL      = 34f;    // .talon{width:34px}
        private const float CssTalonH      = 50f;    // .talon{height:50px}
        private const float CssChipCorps   = 6.5f;   // .bulle .qui .chip{font-size:6.5px}
        private const float CssTamponHaut  = 46f;    // le tampon de ⑨, même châssis
        private const float CssMargeEcran  = 10f;    // .comptoir{padding-inline:10px} (⑨, même châssis)

        private float PxD(float css) => MafiaCleanCity.Shell.EchelleMaquette.Px(
            css, body, MafiaCleanCity.Shell.EchelleMaquette.LargeurEcransBrennar4);

        /// <summary>Le rôle de chaque carte, décidé sur la DONNÉE et non sur l'ordre du tableau.
        /// · suggérée  = `suggested_action` ;
        /// · apprendre = l'issue qui porte `add_rule_dsl` (« lui apprendre », maquette) ;
        /// · risquée   = la première autre.
        /// ⚠️ Une carte peut n'avoir qu'UNE issue (mesuré : `exc_demo_one_time` n'a que
        /// `let_ride`). On rend alors ce qu'on a — jamais une carte vide pour tenir le dessin.
        /// ⛔ La carte « nue » à zéro issue n'est PAS dessinée par la maquette (écart É8 assumé
        /// par la maquette elle-même) : on affiche la réplique et le talon, sans main.</summary>
        private void RendreMain(ExceptionCardDto c)
        {
            string idSug = c.suggested_action != null ? c.suggested_action.id : "";
            CandidateActionDto sug = null, apprendre = null, risquee = null;
            var restantes = new List<CandidateActionDto>();

            if (c.candidate_actions != null)
                foreach (CandidateActionDto ca in c.candidate_actions)
                {
                    if (ca == null) continue;
                    if (sug == null && !string.IsNullOrEmpty(idSug) && ca.id == idSug) { sug = ca; continue; }
                    if (apprendre == null && !string.IsNullOrEmpty(ca.add_rule_dsl)) { apprendre = ca; continue; }
                    if (risquee == null) { risquee = ca; continue; }
                    restantes.Add(ca);
                }
            if (sug == null) sug = c.suggested_action;

            GameObject main = NewUI("Main", body);
            HorizontalLayoutGroup h = main.AddComponent<HorizontalLayoutGroup>();
            h.spacing = PxD(CssMainEcart);
            h.childAlignment = TextAnchor.LowerCenter;
            h.childControlWidth = true; h.childControlHeight = true;
            h.childForceExpandWidth = true; h.childForceExpandHeight = false;
            AddLayoutElement(main, minHeight: PxD(CssCarteLargeur * CssCarteRatio + CssCarteLeve),
                             flexibleHeight: 0);

            // L'ORDRE EST CELUI DU DESSIN : risquée, suggérée (levée, au milieu), apprendre.
            if (risquee != null)   Carte(main.transform, "Risqué",        risquee,   sombre: true,  levee: false);
            if (sug != null)       Carte(main.transform, "Suggéré",       sug,       sombre: false, levee: true);
            if (apprendre != null) Carte(main.transform, "Lui apprendre", apprendre, sombre: true,  levee: false);

            // Le talon : le CARDINAL des issues qu'on ne montre pas. Zéro ⇒ pas de talon (le
            // dessin n'en met pas quand la main tient entière).
            if (restantes.Count > 0)
            {
                GameObject talon = NewUI("Talon", main.transform);
                talon.AddComponent<Image>().color = AccentSevere;
                AddLayoutElement(talon, minWidth: PxD(CssTalonL), preferredWidth: PxD(CssTalonL),
                                 minHeight: PxD(CssTalonH), flexibleHeight: 0, flexibleWidth: 0);
                TextMeshProUGUI t = NewText("TalonNb", talon.transform, "+" + restantes.Count,
                                            (int)PxD(CssCarteT), TextAlignmentOptions.Center);
                t.color = TextPrimary;
                TrackText(t, "+" + restantes.Count);
            }

            // Le tampon — l'action suggérée, en un seul geste. `POST /v1/exceptions/:id/resolve`
            // est la SEULE route d'écriture de cet écran (maquette : « un seul geste, une route »).
            if (sug != null)
            {
                CandidateActionDto capture = sug;
                AddButtonTo(body, sug.label, () => StartCoroutine(ResolveWith(capture)), track: false);
            }
        }

        /// <summary>Une carte de la main. `l` (le rôle) est un libellé FERMÉ — il est suivi ;
        /// `t` (le titre) et `c` (la conséquence) sont du texte producteur — chrome, non suivi.</summary>
        private void Carte(Transform parent, string role, CandidateActionDto a, bool sombre, bool levee)
        {
            GameObject carte = NewUI("Carte_" + (a != null ? a.id : role), parent);
            carte.AddComponent<Image>().color = sombre ? RowBg : CardBg;
            VerticalLayoutGroup v = carte.AddComponent<VerticalLayoutGroup>();
            int pad = (int)PxD(8f);
            v.padding = new RectOffset(pad, pad, pad, (int)PxD(7f));
            v.spacing = PxD(2f);
            v.childControlWidth = true; v.childControlHeight = true;
            v.childForceExpandWidth = true; v.childForceExpandHeight = false;
            AddLayoutElement(carte, preferredWidth: PxD(CssCarteLargeur),
                             minHeight: PxD(CssCarteLargeur * CssCarteRatio), flexibleHeight: 0);

            // La suggérée est LEVÉE — c'est le seul signal de rang dans le dessin, et il ne tient
            // pas dans la couleur seule : le rôle est écrit en toutes lettres juste dessous.
            if (levee)
            {
                var rt = (RectTransform)carte.transform;
                rt.anchoredPosition = new Vector2(rt.anchoredPosition.x, PxD(CssCarteLeve));
            }

            TextMeshProUGUI lib = NewText("Role", carte.transform, role, (int)PxD(CssCarteL),
                                          TextAlignmentOptions.Left);
            lib.color = levee ? CtaColor : AccentModerate;
            TrackText(lib, role);

            TextMeshProUGUI titre = NewText("Titre", carte.transform,
                a != null ? Texte(a.label) : "—", (int)PxD(CssCarteT), TextAlignmentOptions.Left);
            titre.fontStyle = FontStyles.Bold;
            titre.color = sombre ? TextPrimary : DesignTokens.Current.surfaceBase;

            if (a != null && !string.IsNullOrEmpty(a.projected_consequence))
            {
                TextMeshProUGUI cons = NewText("Consequence", carte.transform,
                    Texte(a.projected_consequence), (int)PxD(CssCarteC), TextAlignmentOptions.Left);
                cons.fontStyle = FontStyles.Italic;
                cons.color = sombre ? TextSecondary : DesignTokens.Current.surfaceCard;
            }
        }

        /// <summary>LE POINT UNIQUE de passage des textes serveur.
        ///
        /// Aujourd'hui la route rend de la PROSE anglaise (mesuré 2026-09-02 : 14 proses pour
        /// 1 clé sur `/v1/exceptions/queue`) — donc ceci rend la prose telle quelle. La session
        /// back convertit ces champs en `*_ref` (TD-452, additif : la prose reste, une référence
        /// arrive à côté).
        /// ⇒ Quand les `*_ref` seront là, c'est ICI et nulle part ailleurs qu'on les consomme :
        ///   `I18nCatalog.Traduire(ref)` si la référence est présente, la prose sinon. Le repli
        ///   n'est PAS la clé nue pour cet écran — contrairement au nom de bâtiment, une prose
        ///   existe et veut dire quelque chose.
        /// ⚠️ Je n'écris pas le branchement maintenant : les noms de champs ne sont pas encore
        ///   dans le corps, et coder contre des noms supposés est exactement ce qui a fait
        ///   inventer un écran a8 qui n'existait pas.</summary>
        private static string Texte(string prose) => prose ?? string.Empty;

        /// <summary>La teinte d'une gravité — fonction NOMMÉE (patron `HeatBucketResolver`),
        /// jamais une chaîne de ternaires : une garde anti-régression ne voit pas sa cible dans
        /// un ternaire. Une bande inconnue rend la teinte neutre, jamais celle de « bénin ».</summary>
        private static Color SeverityTeinte(string bande)
        {
            switch ((bande ?? string.Empty).Trim().ToUpperInvariant())
            {
                case "MILD":     return AccentMild;
                case "MODERATE": return AccentModerate;
                case "SEVERE":   return AccentSevere;
                default:         return TextSecondary;
            }
        }

        private void AddButton(string label, UnityEngine.Events.UnityAction onClick) => AddButtonTo(body, label, onClick, track: true);

        private void AddButtonTo(Transform parent, string label, UnityEngine.Events.UnityAction onClick, bool track = true)
        {
            GameObject btn = NewUI("Btn_" + label.Replace(" ", "").Replace(":", ""), parent);
            Image img = btn.AddComponent<Image>();
            img.color = DesignTokens.Current.surfaceRaised;
            Button b = btn.AddComponent<Button>();
            b.targetGraphic = img;
            b.onClick.AddListener(onClick);
            AddLayoutElement(btn, minHeight: 44, flexibleHeight: 0); // ≥44dp tap target (F2)
            TextMeshProUGUI t = NewText("Label", btn.transform, label, 14, TextAlignmentOptions.Center);
            t.color = CtaColor;
            Stretch((RectTransform)t.transform, new Vector2(10, 2), new Vector2(-10, -2));
            if (track) TrackText(t, label);
        }

        private static string Cap(string b) =>
            string.IsNullOrEmpty(b) ? "Unknown" : char.ToUpperInvariant(b[0]) + b.Substring(1).ToLowerInvariant();

        // W3.U1 C1 (design D2) — optional parent-of-mount the AppShell renseigne BEFORE Start() runs.
        // See DashboardController.mountParent for the full rationale (byte-identical mechanism here).
        private Transform mountParent;
        public void SetMountParent(Transform parent) => mountParent = parent;

        // IShellTenant conformance (B1, hud-session-arbitrages-design.md §1.2) — NO-OP ici : ce
        // contrôleur ne s'authentifie jamais lui-même (Start() ne fait que `EnsureInitialized();
        // Render();`, aucun Token/IsAuthenticated dans ce fichier) — il reçoit ses données déjà
        // résolues d'un appelant externe (ExceptionQueueController). Rien à sauter.
        public void SetToken(string token) { }

        // --------------------------------------------------------------- UI build

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
            Transform root = mountParent != null ? mountParent : canvas.transform; // W3.U1 D2

            // Full-screen ardoise backdrop.
            backdropGo = NewUI("ExceptionDetailBackdrop", root);
            Stretch((RectTransform)backdropGo.transform, Vector2.zero, Vector2.zero);
            backdropGo.AddComponent<Image>().color = SurfaceBg;

            // The detail card, anchored top-centre.
            sheetGo = NewUI("ExceptionDetailSheet", root);
            GameObject card = sheetGo;
            RectTransform cardRt = (RectTransform)card.transform;
            // ⛔ ⑩ EST UN ÉCRAN PLEIN, pas une carte posée. La maquette le dessine dans un
            // `.tel` entier (barre + comptoir), comme ⑨ dont il est le dépliage. Il valait
            // 560×600 en unités fixes, ancré en haut : sur un canvas de 1280 ça fait 43,7 % de la
            // largeur, et sous le chrome ça passait sous le bandeau.
            // ⛔ ET LES INSETS DU CHROME, dès l'écriture — c'est la quatrième fois cette nuit :
            // ⑨ et ② passaient sous le dock, ㊱ collisionnait aux deux bouts. Je ne les découvre
            // plus par la capture, je les pose en écrivant, et la garde vérifiera.
            // Hors shell les insets valent 0 et l'écran remplit tout.
            // ⛔ L'ÉCHELLE SE LIT SUR LE PLEIN ÉCRAN, ET `body` N'EXISTE PAS ENCORE ICI.
            // `PxD` s'appuie sur `body`, assigné trente lignes plus bas : l'appeler à cet endroit
            // lisait un rect NUL. C'est la même faute que sur ㊲ — une conversion px CSS faite
            // avant que sa référence soit résolue — et elle ne se voit pas : elle rend un écran
            // proportionnellement faux, qui ressemble à un choix de mise en page.
            var refEchelle = root as RectTransform;
            Canvas.ForceUpdateCanvases();
            float margeX = refEchelle != null
                ? MafiaCleanCity.Shell.EchelleMaquette.Px(CssMargeEcran, refEchelle,
                      MafiaCleanCity.Shell.EchelleMaquette.LargeurEcransBrennar4)
                : CssMargeEcran;
            cardRt.anchorMin = Vector2.zero;
            cardRt.anchorMax = Vector2.one;
            cardRt.pivot = new Vector2(0.5f, 0.5f);
            cardRt.offsetMin = new Vector2(margeX, margeX + MafiaCleanCity.Shell.ShellChrome.BottomInsetPx);
            cardRt.offsetMax = new Vector2(-margeX, -(margeX + MafiaCleanCity.Shell.ShellChrome.TopInsetPx));
            card.AddComponent<Image>().color = CardBg;
            VerticalLayoutGroup vlg = card.AddComponent<VerticalLayoutGroup>();
            vlg.padding = new RectOffset(20, 20, 18, 18);
            vlg.spacing = 10;
            vlg.childControlWidth = true;
            vlg.childControlHeight = true;
            vlg.childForceExpandWidth = true;
            vlg.childForceExpandHeight = false;

            // Header.
            TextMeshProUGUI headerText = NewText("Header", card.transform, "EXCEPTION", 24, TextAlignmentOptions.Left);
            headerText.fontStyle = FontStyles.Bold;
            AddLayoutElement(headerText.gameObject, minHeight: 32, flexibleHeight: 0);
            TrackText(headerText, "EXCEPTION");

            // Body rows area.
            GameObject bodyGo = NewUI("BodyArea", card.transform);
            VerticalLayoutGroup bvlg = bodyGo.AddComponent<VerticalLayoutGroup>();
            bvlg.spacing = 8;
            bvlg.childControlWidth = true;
            bvlg.childControlHeight = true;
            bvlg.childForceExpandWidth = true;
            bvlg.childForceExpandHeight = false;
            body = (RectTransform)bodyGo.transform;
            AddLayoutElement(bodyGo, flexibleHeight: 1);
        }

        // ---- body helpers ----
        private void ClearBody()
        {
            renderedTexts.Clear();
            if (body != null)
                for (int i = body.childCount - 1; i >= 0; i--)
                    UnityEngine.Object.Destroy(body.GetChild(i).gameObject);
            // Re-track the static header "EXCEPTION" (it lives outside body but is part of the corpus).
            renderedTexts.Add("EXCEPTION");
        }

        // --------------------------------------------------------------- helpers (verbatim DashboardController)

        private void TrackText(TextMeshProUGUI comp, string text)
        {
            if (!string.IsNullOrEmpty(text)) renderedTexts.Add(text);
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

        private TextMeshProUGUI NewText(string name, Transform parent, string value, int size, TextAlignmentOptions anchor)
        {
            GameObject go = NewUI(name, parent);
            TextMeshProUGUI t = go.AddComponent<TextMeshProUGUI>();
            t.font = font;
            t.text = value;
            t.fontSize = size;
            t.alignment = anchor;
            t.color = TextPrimary;
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
