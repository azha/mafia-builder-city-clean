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

        /// <summary>⑩-1 — LA CARTE SE FERME APRÈS LA RÉSOLUTION (cadre 15 → 17 ; écart D10) : la maquette ne montre pas d'état
        /// « résolu » sur ⑩ — la main se referme et ⑨ montre l'après (la carte tranchée, son cachet). Posé par la file :
        /// (carte, issue servie, action envoyée). Absent (montage autonome), la fermeture rappelle `onBack`.</summary>
        public Action<ExceptionCardDto, string, CandidateActionDto> SurResolution;
        private bool ferme;
        /// <summary>La carte s'est refermée (résolue ou quittée) ; un second geste ne rappelle rien.</summary>
        public bool Ferme => ferme;
        /// <summary>Couture de test : le client de CE détail (ses coutures coupent le réseau, `ExceptionsClient`).</summary>
        public ExceptionsClient ClientPourTest { get { EnsureInitialized(); return client; } }
        /// <summary>Le décor de ⑩ — le bar de ⑨, zinc `.main-de-cartes` à 15 %.</summary>
        public MafiaCleanCity.Shell.DecorAuComptoir Decor { get; private set; }
        /// <summary>⑩-1 — le rôle du locuteur (« Cuisinier »…), posé par la file AVANT `Init` : la jointure du roster est dans ⑨,
        /// ⑩ ne la refait pas. Absent ⇒ pas de rôle dans le contexte (jamais inventé).</summary>
        public string RoleDuLocuteur;

        /// <summary>La feuille de CE détail (montée sous le Canvas partagé : jamais la chercher par son nom).</summary>
        public GameObject FeuillePourTest => sheetGo;

        // ⑩-1b — D09 (décision de l'orchestrateur, 23/09) : TOUTE issue servie est atteignable depuis la main.
        //   · une carte se CHOISIT au toucher ; le tampon dit et envoie le choix (par défaut : la suggérée) ;
        //   · le talon se DÉPLIE au toucher : les issues restantes, en cartes sombres ;
        //   · « Escalader » est une carte du talon quand AUCUNE issue servie ne porte `method ESCALATE` (elle envoie ESCALATE
        //     avec l'id suggéré, comme l'ancien bouton) ; quand une issue la porte, c'est elle qu'on montre, sans doublon.
        /// <summary>Une carte touchable de la main (rôle ou talon déplié) — la couture des gardes d'atteignabilité.</summary>
        public sealed class CarteTouchable { public CandidateActionDto Action; public bool Escalade; public Button Bouton; }
        private readonly List<CarteTouchable> cartesTouchables = new List<CarteTouchable>();
        public IReadOnlyList<CarteTouchable> CartesPourTest => cartesTouchables;
        private bool talonDeplie;
        private CandidateActionDto selection;
        private bool selectionEscalade;
        private Button talonBouton;
        private TamponAuComptoir.Rendu tampon;
        public Button TalonPourTest => talonBouton;
        /// <summary>⑩-1e — l'appui long du tampon (la seule façon de résoudre depuis la main).</summary>
        public MafiaCleanCity.Shell.LongPressButton TamponAppuiPourTest => tampon != null ? tampon.Appui : null;
        public string TamponLibelleTexte => tampon != null ? tampon.Libelle.text : null;
        public string TamponSousTexte => tampon != null ? tampon.Sous.text : null;
        public bool TalonDeplie => talonDeplie;
        /// <summary>L'id de l'issue choisie, « ESCALADER » pour la carte synthétique.</summary>
        public string SelectionId => selectionEscalade ? "ESCALADER" : (selection != null ? selection.id : null);

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

        /// <summary>⑩-1b — le `method` ENVOYÉ : « lui apprendre » coché sur une issue qui porte une règle ⇒ ADD_RULE ; sinon le
        /// `method` SERVI (D4, comme le tampon de ⑨-1 — l'issue `escalate` de la carte de chaleur part en ESCALATE) ; sans
        /// `method` servi (pile antérieure à D4) ⇒ la dérivation `MethodFor`, déclarée.</summary>
        public static string MethodPour(CandidateActionDto a, bool addAsRule)
        {
            if (addAsRule && a != null && !string.IsNullOrEmpty(a.add_rule_dsl)) return "ADD_RULE";
            if (a != null && !string.IsNullOrEmpty(a.method)) return a.method;
            return MethodFor(a, addAsRule);
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
            yield return DoResolve(MethodPour(candidate, AddAsRule), candidate != null ? candidate.id : "", candidate);
        }

        /// <summary>Escalate the card (ESCALATE; chosen_action_id = the suggested action's id).</summary>
        public IEnumerator Escalate()
        {
            string suggestedId = CurrentCard != null && CurrentCard.suggested_action != null ? CurrentCard.suggested_action.id : "";
            yield return DoResolve("ESCALATE", suggestedId, CurrentCard != null ? CurrentCard.suggested_action : null);
        }

        private IEnumerator DoResolve(string method, string chosenActionId, CandidateActionDto action)
        {
            if (CurrentCard == null || resolving || ferme) yield break;
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
            Fermer(res.outcome, action);
        }

        /// <summary>⑩-1 — la main se referme sur une résolution réussie : l'hôte est détruit (OnDestroy emporte le décor et
        /// la feuille), puis la file reçoit l'issue (`SurResolution`) — ou, sans elle, le retour ordinaire.</summary>
        private void Fermer(string outcome, CandidateActionDto action)
        {
            if (ferme) return;
            ferme = true;
            var surResolution = SurResolution;
            Action cb = onBack;
            ExceptionCardDto carte = CurrentCard;
            if (this != null) Destroy(gameObject);
            if (surResolution != null) surResolution(carte, outcome, action);
            else cb?.Invoke();
        }

        /// <summary>Back to the queue: destroy this host (OnDestroy tears down the backdrop/sheet) + let the
        /// queue re-fetch. ⑩-1 : sans effet une fois la carte refermée — la file a déjà été rappelée.</summary>
        public void Back()
        {
            if (ferme) return;
            ferme = true;
            Action cb = onBack;
            if (this != null) Destroy(gameObject);
            cb?.Invoke();
        }

        // ---- render ----
        private void Render()
        {
            if (Destroyed || ferme || body == null) return;
            ExceptionCardDto c = CurrentCard;
            if (c == null) return;

            ClearBody();

            // ── `.parle` : qui parle, ses trois bandes en pastilles, puis sa réplique ──
            // Maquette : « <b>Le cuisinier</b> · au bâtiment touché » + chips gravité/priorité/
            // confiance, puis la réplique entre guillemets.
            //
            // ⚠️ LE RÔLE N'EST PAS DANS CE CORPS : la maquette le tire de `GET /v1/lieutenants` par jointure
            // (`archetype`) — lot ⑨-4.
            // ⑨-0 — LE NOM, lui, EST dans le corps (`lieutenant.name`, C3) et il était jeté : le DTO ne déclarait pas
            // `lieutenant`. L'ancien commentaire refusait d'afficher « Lieutenant » (le placeholder de TD-046) comme un
            // nom ; mais le corps du 06/09 sert de VRAIS noms (« Lt. Rook », « Lt. Sallo »), et un placeholder servi est
            // la donnée, pas un mensonge de l'écran. Un seul site, partagé avec ⑨ : `ExceptionBandes.Locuteur`.
            // ⑩-1 — CELUI QUI PARLE, au dessin de ⑨ (cadre 15 = cadre 14, écart D03) : médaillon 60 au buste, bulle de verre,
            // nom or-vif, « · rôle · lieu », TROIS pastilles (gravité, priorité, CONFIANCE — `.chip.conf`), la réplique suivie
            // de « Je fais quoi ? » en italique. Le code est `ParleurAuComptoir`, partagé avec ⑨. Avant : « Votre lieutenant »
            // en gras et une ligne « Grave · Critique · Confident ».
            ParleurAuComptoir parleur = Parleur();
            parleur.ContexteSuivi = ExceptionBandes.EnseigneVisee(c) == null;
            RectTransform rangee = parleur.ConstruireRangee(body, 10f);
            parleur.Construire(rangee, c, ExceptionQueueController.Contexte(RoleDuLocuteur, c), RepliqueMain(c),
                ExceptionBandes.Gravite(c.severity_band), ExceptionBandes.Priorite(c.priority_band),
                ExceptionBandes.Confiance(c.confidence_band));

            // ⑩-1 — PLUS D'ÉTAT « RÉSOLU » ICI (écart D10 : « Résolu ✓ · Issue : REPAIRING · Back », l'enum BRUT, et
            // « Issue : » servi en fr « Problème : », un contresens). La carte se referme (`Fermer`) et ⑨ montre l'après
            // avec le mot de l'issue (`ExceptionBandes.Issue`, cadre 17). ⚠️ `BRIBE_SUCCEEDED` / `BRIBE_FAILED` restent
            // NON DÉTERMINISTES (tirage dans le handler) : une capture de l'après d'un pot-de-vin doit le dire dans son nom.

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
            // ⑩-1b — D09 : plus de bouton « Escalate » (l'escalade est une carte : servie, ou synthétique dans le talon).
            // « Retour » seulement HORS shell : sous shell, le retour est le geste du shell ; hors shell (montage autonome),
            // sans lui la main n'aurait d'autre sortie que la résolution.
            if (mountParent == null) AddButton("back", Lib("Back"), Back);
        }

        private ParleurAuComptoir Parleur() => new ParleurAuComptoir(PxD, PxDI, TrackText);

        private int PxDI(float css) => MafiaCleanCity.Shell.EchelleMaquette.PxTrait(
            css, body, MafiaCleanCity.Shell.EchelleMaquette.LargeurEcransBrennar4);

        /// <summary>La réplique de ⑩ : celle de ⑨ (« Patron — … », la règle des guillemets), suivie, quand un lieutenant parle en
        /// prose, de « <i>Je fais quoi ?</i> » DANS les guillemets (cadre 15 : « … J’ai pas de consigne pour ça. <i>Je fais
        /// quoi ?</i> »). La ville et un identifiant nu ne posent pas de question.</summary>
        public static string RepliqueMain(ExceptionCardDto c)
        {
            string r = ExceptionQueueController.RepliqueDuPremier(c);
            const string fin = " »";
            if (!ExceptionBandes.ParleUnLieutenant(c) || r == null || !r.StartsWith("« ") || !r.EndsWith(fin)) return r;
            return r.Substring(0, r.Length - fin.Length) + " <i>" + Lib("Je fais quoi ?") + "</i>" + fin;
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
            cartesTouchables.Clear();
            talonBouton = null; tampon = null;
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
            if (selection == null && !selectionEscalade) selection = sug;

            // ⑩-1b — l'escalade est-elle SERVIE comme issue ? (le `method`, ou le type d'effet pour une pile antérieure à D4)
            bool escaladeServie = EstEscalade(sug);
            if (c.candidate_actions != null)
                foreach (CandidateActionDto ca in c.candidate_actions) escaladeServie |= EstEscalade(ca);

            GameObject main = NewUI("Main", body);
            HorizontalLayoutGroup h = main.AddComponent<HorizontalLayoutGroup>();
            h.spacing = PxD(CssMainEcart);
            h.childAlignment = TextAnchor.LowerCenter;
            h.childControlWidth = true; h.childControlHeight = true;
            h.childForceExpandWidth = true; h.childForceExpandHeight = false;
            AddLayoutElement(main, minHeight: PxD(CssCarteLargeur * CssCarteRatio + CssCarteLeve),
                             flexibleHeight: 0);

            // L'ORDRE EST CELUI DU DESSIN : risquée, suggérée (levée, au milieu), apprendre.
            // ⑩-1c — l'éventail du cadre 15 : risquée ♠ à −5°, descendue de 6 ; suggérée ♦ droite, LEVÉE de 8 ; apprendre ♣ à
            // +5°, descendue de 6. Le rôle décide de la place, pas l'ordre du tableau.
            if (risquee != null)   Carte(main.transform, Lib("Risqué"),        risquee,   sombre: true,  levee: false,
                                         glyphe: "♠", rotationCss: -5f, translateYCss: 6f);
            if (sug != null)       Carte(main.transform, Lib("Suggéré"),       sug,       sombre: false, levee: true,
                                         glyphe: "♦", rotationCss: 0f, translateYCss: -CssCarteLeve);
            if (apprendre != null) Carte(main.transform, Lib("Lui apprendre"), apprendre, sombre: true,  levee: false,
                                         glyphe: "♣", rotationCss: 5f, translateYCss: 6f);

            // Le talon : le CARDINAL des issues qu'on ne montre pas. Zéro ⇒ pas de talon (le
            // dessin n'en met pas quand la main tient entière).
            int caches = restantes.Count + (escaladeServie ? 0 : 1);
            if (caches > 0)
            {
                GameObject talon = NewUI("Talon", main.transform);
                Image talonImg = talon.AddComponent<Image>();
                talonImg.color = AccentSevere;
                // ⑩-1b — le talon se DÉPLIE au toucher (D09 a) : sans lui, les issues hors des trois rôles sont des routes
                // mortes (mesuré : `lay_low` de la carte de chaleur).
                talonBouton = talon.AddComponent<Button>();
                talonBouton.targetGraphic = talonImg;
                talonBouton.onClick.AddListener(() => { talonDeplie = !talonDeplie; Render(); });
                AddLayoutElement(talon, minWidth: PxD(CssTalonL), preferredWidth: PxD(CssTalonL),
                                 minHeight: PxD(CssTalonH), flexibleHeight: 0, flexibleWidth: 0);
                TextMeshProUGUI t = NewText("TalonNb", talon.transform, "+" + caches,
                                            (int)PxD(CssCarteT), TextAlignmentOptions.Center);
                t.color = TextPrimary;
                // ⛔ SANS CET ÉTIREMENT, TMP N'A AUCUNE PLACE OÙ POSER LES CARACTÈRES. Le talon
                // porte un `LayoutElement` mais AUCUN groupe de mise en page : son enfant garde
                // donc le rect par défaut, et « +1 » sortait à ZÉRO caractère posé — le talon
                // s'affichait comme un rectangle rouge nu.
                // ★ Un `LayoutElement` dimensionne l'objet AUPRÈS DE SON PARENT ; il ne dit rien
                //   à ses propres enfants. J'avais lu « le talon a une taille » comme « son
                //   contenu a une taille ».
                // ⚠️ Et c'est la garde de TRONCATURE qui l'a dit, pas l'œil : sur l'image, un
                //   texte à zéro caractère et un texte absent sont le même rectangle.
                var trt = (RectTransform)t.transform;
                trt.anchorMin = Vector2.zero; trt.anchorMax = Vector2.one;
                trt.offsetMin = Vector2.zero; trt.offsetMax = Vector2.zero;
                TrackText(t, "+" + caches);
            }

            // ⑩-1b — le talon DÉPLIÉ : les issues restantes, en cartes sombres, puis « Escalader » si aucune issue ne la porte.
            if (talonDeplie && caches > 0)
            {
                GameObject deplie = NewUI("TalonDeplie", body);
                HorizontalLayoutGroup hd = deplie.AddComponent<HorizontalLayoutGroup>();
                hd.spacing = PxD(CssMainEcart);
                hd.childAlignment = TextAnchor.LowerCenter;
                hd.childControlWidth = true; hd.childControlHeight = true;
                hd.childForceExpandWidth = true; hd.childForceExpandHeight = false;
                foreach (CandidateActionDto r in restantes)
                    Carte(deplie.transform, string.Empty, r, sombre: true, levee: false);
                if (!escaladeServie)
                    Carte(deplie.transform, string.Empty,
                          new CandidateActionDto { id = idSug, label = TexteEscalader(), method = "ESCALATE" },
                          sombre: true, levee: false, escalade: true);
            }

            // Le tampon — l'action suggérée, en un seul geste. `POST /v1/exceptions/:id/resolve`
            // est la SEULE route d'écriture de cet écran (maquette : « un seul geste, une route »).
            // ⑩-1b — le tampon envoie le CHOIX (la suggérée tant qu'on n'a rien touché).
            // ⑩-1e — le TAMPON de ⑨ (`TamponAuComptoir`, écart D08) : papier crème, encre bordeaux, et l'APPUI LONG seul
            // résout (« appui long — la carte se ferme ») ; le tap ne fait rien — choisir se fait sur les cartes.
            if (selectionEscalade || selection != null)
            {
                GameObject cadre = NewUI("Tampon", body);
                AddLayoutElement(cadre, minHeight: PxD(CssTamponHaut), preferredHeight: PxD(CssTamponHaut), flexibleHeight: 0);
                string servi = selectionEscalade ? TexteEscalader() : Texte(selection.label, selection.label_i18n);
                // S03 — « Réparer {enseigne} » quand le libellé servi dit « le bâtiment » et que la carte vise une enseigne.
                string libelle = selectionEscalade ? servi : ExceptionBandes.LibelleNomme(CurrentCard, selection, servi);
                tampon = new TamponAuComptoir(PxD, PxDI, TrackText).Construire(cadre.transform,
                    (libelle ?? string.Empty).ToUpperInvariant(), SousTitreMain(selectionEscalade ? null : selection),
                    suivreSous: true, surTap: null,
                    surAppuiLong: () => { if (!Destroyed) StartCoroutine(ResoudreLeChoix()); },
                    suivreLibelle: libelle == servi);
            }
        }

        /// <summary>⑩-1e — résoudre le CHOIX (la suggérée par défaut, la carte touchée sinon, « Escalader » si elle est choisie).
        /// Public : les gardes le pilotent comme l'appui long.</summary>
        public IEnumerator ResoudreLeChoix()
        {
            if (selectionEscalade) yield return Escalate();
            else if (selection != null) yield return ResolveWith(selection);
        }

        /// <summary>Le sous-titre du tampon de ⑩ (atelier §3.5, cadre 15) : pour une RÉPARATION, la phrase entière de la maquette ;
        /// sinon sa première moitié. Deux clés entières, jamais une concaténation.</summary>
        public static string SousTitreMain(CandidateActionDto choix)
        {
            bool reparation = choix != null && (string.Equals(choix.method, "REPAIR", StringComparison.OrdinalIgnoreCase)
                || (choix.effect != null && string.Equals(choix.effect.type, "REPAIR", StringComparison.OrdinalIgnoreCase)));
            return reparation
                ? Lib("appui long — la carte se ferme ; le bâtiment, lui, se répare avec le temps")
                : Lib("appui long — la carte se ferme");
        }

        /// <summary>Choisir une carte de la main : le tampon la dit et l'enverra.</summary>
        private void Choisir(CandidateActionDto a, bool escalade)
        {
            selection = escalade ? null : a;
            selectionEscalade = escalade;
            Render();
        }

        private static bool EstEscalade(CandidateActionDto a) =>
            a != null && (string.Equals(a.method, "ESCALATE", StringComparison.OrdinalIgnoreCase)
                          || (a.effect != null && string.Equals(a.effect.type, "ESCALATE", StringComparison.OrdinalIgnoreCase)));

        /// <summary>« Escalader » — la clé SERVIE de l'ancien bouton (`exception_detail.bloc.escalate`, fr « Escalader »), repli
        /// en français : le littéral anglais « Escalate » de l'ancien bouton ne doit pas atteindre l'écran hors catalogue.</summary>
        private static string TexteEscalader()
        {
            const string cle = "exception_detail.bloc.escalate";
            return MafiaCleanCity.I18n.I18nCatalog.Connait(cle) ? MafiaCleanCity.I18n.I18nCatalog.Traduire(cle) : "Escalader";
        }

        /// <summary>Une carte de la main. `l` (le rôle) est un libellé FERMÉ — il est suivi ;
        /// `t` (le titre) et `c` (la conséquence) sont du texte producteur — chrome, non suivi.
        /// ⑩-1c — AU DESSIN DU CADRE 15 (`.carte`, `.carte.sombre`, `.carte:nth-child(n)`, `.carte .s`) :
        ///   le CRÉNEAU est mis en page par la main ; la FACE, dessinée, porte `rotate` et `translateY` — un groupe de mise en
        ///     page réécrit la position de ses enfants, un `translateY` posé sur le créneau serait effacé (c'était le cas de
        ///     la « levée » d'avant) ;
        ///   face : rayon 9, `linear-gradient(170deg, #efe4c6, #d9cca9 60%, #c9b98f)` (sombre : #3a3630 → #26221d), bord 1px
        ///     #6b4a12 (sombre #00000088), filet intérieur à 3px (`inset 0 0 0 4px` : #93402c66, #93402c pour la suggérée,
        ///     #ffffff22 sur la sombre) ; les ombres portées (`0 8px 18px #000c`) ne sont pas reprises ;
        ///   `.l` Georgia 8 capitales .14em #93402c (sombre : braise) ; `.t` Georgia 11,5 gras #2b1d0e (crème) ; `.c` 7,5
        ///     italique #5a4629 (crème-2) ; `justify-content:space-between` : un ressort entre le titre et la conséquence ;
        ///   `.s` le GLYPHE, Georgia 11, `top:6px; right:7px`, #93402c (sombre : braise) — ♠ risqué, ♦ suggéré, ♣ lui apprendre ;
        ///     les cartes du talon déplié n'en portent pas (la maquette n'en dessine pas).
        /// Rotation : `rotate(θ)` CSS tourne dans le sens horaire pour θ &gt; 0, Unity dans l'autre ⇒ z = −θ. `translateY(+y)`
        /// CSS descend, Unity monte ⇒ y = −y.</summary>
        private void Carte(Transform parent, string role, CandidateActionDto a, bool sombre, bool levee,
                           bool escalade = false, string glyphe = null, float rotationCss = 0f, float translateYCss = 0f)
        {
            GameObject carte = NewUI((escalade ? "Carte_Escalader_" : "Carte_") + (a != null ? a.id : role), parent);
            AddLayoutElement(carte, preferredWidth: PxD(CssCarteLargeur),
                             minHeight: PxD(CssCarteLargeur * CssCarteRatio), flexibleHeight: 0);

            GameObject face = NewUI("Face", carte.transform);
            RectTransform frt = (RectTransform)face.transform;
            frt.anchorMin = Vector2.zero; frt.anchorMax = Vector2.one;
            frt.offsetMin = Vector2.zero; frt.offsetMax = Vector2.zero;
            frt.anchoredPosition = new Vector2(0f, -PxD(translateYCss));
            frt.localRotation = Quaternion.Euler(0f, 0f, -rotationCss);

            Image fondCarte = face.AddComponent<Image>();
            fondCarte.sprite = MafiaCleanCity.Shell.ProceduralUI.RoundedRectMask(Mathf.Max(1, (int)PxD(CssCarteRayon)));
            fondCarte.type = Image.Type.Sliced;
            fondCarte.color = Color.white;
            face.AddComponent<Mask>().showMaskGraphic = false;

            GameObject verre = NewUI("Verre", face.transform);
            Etirer(verre, 0f);
            Image verreImg = verre.AddComponent<Image>();
            verreImg.sprite = sombre
                ? MafiaCleanCity.Shell.DecorAuComptoir.DegradeVertical("carte.sombre",
                      new[] { (0f, Hex("#3a3630")), (1f, Hex("#26221d")) })
                : MafiaCleanCity.Shell.DecorAuComptoir.DegradeVertical("carte.claire",
                      new[] { (0f, Hex("#efe4c6")), (0.6f, Hex("#d9cca9")), (1f, Hex("#c9b98f")) });
            verreImg.raycastTarget = false;

            GameObject bord = NewUI("Bord", face.transform);
            Etirer(bord, 0f);
            Image bordImg = bord.AddComponent<Image>();
            bordImg.sprite = MafiaCleanCity.Shell.ProceduralUI.RoundedRectOutline(Mathf.Max(1, (int)PxD(CssCarteRayon)), Mathf.Max(1f, PxD(1f)),
                                                             sombre ? Hex("#00000088") : Hex("#6b4a12"));
            bordImg.type = Image.Type.Sliced;
            bordImg.raycastTarget = false;

            GameObject filet = NewUI("FiletInterieur", face.transform);
            Etirer(filet, PxD(3f));
            Image filetImg = filet.AddComponent<Image>();
            filetImg.sprite = MafiaCleanCity.Shell.ProceduralUI.RoundedRectOutline(Mathf.Max(1, (int)PxD(CssCarteRayon - 3f)), Mathf.Max(1f, PxD(1f)),
                                                              sombre ? Hex("#ffffff22") : (levee ? Bordeaux : Hex("#93402c66")));
            filetImg.type = Image.Type.Sliced;
            filetImg.raycastTarget = false;

            // ⑩-1b — une carte se CHOISIT au toucher (D09) : le tampon la dit et l'enverra.
            if (a != null)
            {
                Button choix = carte.AddComponent<Button>();
                choix.targetGraphic = fondCarte;
                CandidateActionDto capture = a;
                bool escaladeCapture = escalade;
                choix.onClick.AddListener(() => Choisir(capture, escaladeCapture));
                cartesTouchables.Add(new CarteTouchable { Action = a, Escalade = escalade, Bouton = choix });
            }

            Color encre = sombre ? Braise : Bordeaux;
            if (!string.IsNullOrEmpty(glyphe))
            {
                TextMeshProUGUI s = NewText("Glyphe", face.transform, glyphe, (int)PxD(11f), TextAlignmentOptions.TopRight);
                s.font = DesignTokens.Current.hudSerifFont;
                s.color = encre;
                s.gameObject.AddComponent<LayoutElement>().ignoreLayout = true;
                RectTransform srt = (RectTransform)s.transform;
                srt.anchorMin = srt.anchorMax = srt.pivot = new Vector2(1f, 1f);
                srt.sizeDelta = new Vector2(PxD(14f), PxD(14f));
                srt.anchoredPosition = new Vector2(-PxD(7f), -PxD(6f));
            }

            VerticalLayoutGroup v = face.AddComponent<VerticalLayoutGroup>();
            v.padding = new RectOffset((int)PxD(8f), (int)PxD(8f), (int)PxD(8f), (int)PxD(7f));
            v.spacing = PxD(1f);
            v.childControlWidth = true; v.childControlHeight = true;
            v.childForceExpandWidth = true; v.childForceExpandHeight = false;

            TextMeshProUGUI lib = NewText("Role", face.transform, role, (int)PxD(CssCarteL), TextAlignmentOptions.Left);
            // ⛔ LE RÔLE SUIT LE FOND DE SA CARTE, pas son rang (`.carte .l{color:#93402c}`, `.carte.sombre .l{color:var(--braise)}`) :
            // l'or sur le crème de la suggérée était illisible (écart 0,06). Ce qui distingue la suggérée, c'est sa levée et son fond.
            lib.font = DesignTokens.Current.hudSerifFont;
            lib.fontStyle = FontStyles.UpperCase;
            lib.characterSpacing = 14f;
            lib.color = encre;
            TrackText(lib, role);

            TextMeshProUGUI titre = NewText("Titre", face.transform,
                a != null ? Texte(a.label, a.label_i18n) : "—", (int)PxD(CssCarteT), TextAlignmentOptions.Left);
            titre.font = DesignTokens.Current.hudSerifFont;
            titre.fontStyle = FontStyles.Bold;
            titre.color = sombre ? DesignTokens.Current.hudCreme : Hex("#2b1d0e");
            // ⛔ UNE CARTE DE 100 px CSS A BESOIN DE RETOURS À LA LIGNE (« Escalate for r », coupé en plein mot, sinon).
            titre.textWrappingMode = TextWrappingModes.Normal;
            titre.overflowMode = TextOverflowModes.Overflow;

            AddLayoutElement(NewUI("Ressort", face.transform), flexibleHeight: 1);

            if (a != null && !string.IsNullOrEmpty(a.projected_consequence))
            {
                TextMeshProUGUI cons = NewText("Consequence", face.transform,
                    Texte(a.projected_consequence, a.projected_consequence_i18n), (int)PxD(CssCarteC), TextAlignmentOptions.Left);
                cons.fontStyle = FontStyles.Italic;
                cons.color = sombre ? DesignTokens.Current.hudCremeSecondary : Hex("#5a4629");
                cons.textWrappingMode = TextWrappingModes.Normal;
                cons.overflowMode = TextOverflowModes.Overflow;
            }
        }

        /// <summary>`#93402c` — l'encre bordeaux des cartes claires (`.carte .l`, `.carte .s`), celle du tampon de ⑨.</summary>
        private static Color Bordeaux => Hex("#93402c");
        /// <summary>`var(--braise)` — l'encre des cartes sombres (même jeton que le rail « grave » de ⑨).</summary>
        private static Color Braise => DesignTokens.Current.hudGaugeArcHot;

        private static Color Hex(string h)
        {
            ColorUtility.TryParseHtmlString(h, out Color c);
            return c;
        }

        private static void Etirer(GameObject go, float retrait)
        {
            RectTransform rt = (RectTransform)go.transform;
            rt.anchorMin = Vector2.zero; rt.anchorMax = Vector2.one;
            rt.offsetMin = new Vector2(retrait, retrait); rt.offsetMax = new Vector2(-retrait, -retrait);
            go.AddComponent<LayoutElement>().ignoreLayout = true;
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
        private static string Texte(string prose, I18nRefDto reference = null)
        {
            // La référence GAGNE quand elle est là ET que le dictionnaire la porte. Sinon la
            // prose : elle existe et veut dire quelque chose — contrairement au nom de bâtiment,
            // le repli n'est PAS la clé nue ici.
            // ⛔ `Connait` avant `Traduire` : sans ce test, une clé absente s'afficherait à la
            // place d'une prose parfaitement lisible, et l'écran REGRESSERAIT en se branchant.
            if (reference != null && !string.IsNullOrEmpty(reference.key)
                && MafiaCleanCity.I18n.I18nCatalog.Connait(reference.key))
                return MafiaCleanCity.I18n.I18nCatalog.Traduire(reference.key);
            return prose ?? string.Empty;
        }

        private static string Lib(string litteral) =>
            MafiaCleanCity.I18n.Libelle.De("exception_detail", "bloc", litteral);

        private void AddButton(string idStable, string label, UnityEngine.Events.UnityAction onClick) => AddButtonTo(body, idStable, label, onClick, track: true);

        private Button AddButtonTo(Transform parent, string idStable, string label, UnityEngine.Events.UnityAction onClick, bool track = true)
        {
            GameObject btn = NewUI("Btn_" + idStable, parent);
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
            return b;
        }

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

            // ⑩-1 — LE DÉCOR, plus l'ardoise (écart D01) : ⑩ est la main du même comptoir que ⑨, au zinc `.main-de-cartes`
            // (15 %, cadre 15) — il montre presque tout le bar. Le fond reste un attrape-gestes plein écran (transparent) :
            // ⑩ passe AU-DESSUS de ⑨, et rien ne doit traverser jusqu'à la file.
            backdropGo = NewUI("ExceptionDetailBackdrop", root);
            Stretch((RectTransform)backdropGo.transform, Vector2.zero, Vector2.zero);
            backdropGo.AddComponent<Image>().color = new Color(0f, 0f, 0f, 0f);
            Decor = MafiaCleanCity.Shell.DecorAuComptoir.Construire<MafiaCleanCity.Shell.DecorAuComptoir>(
                backdropGo.transform, ParametresMain());

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
            // ⑩-1 — ni feuille `CardBg` ni en-tête « SA MAIN » (écart D01, D02 : la maquette n'a ni l'une ni l'autre). Le
            // contenu est COLLÉ EN BAS, comme le `.comptoir` de ⑨ (`margin-top:auto`) ; le décor occupe le haut.
            VerticalLayoutGroup vlg = card.AddComponent<VerticalLayoutGroup>();
            vlg.padding = new RectOffset(0, 0, 0, 0);
            vlg.spacing = 10;
            vlg.childControlWidth = true;
            vlg.childControlHeight = true;
            vlg.childForceExpandWidth = true;
            vlg.childForceExpandHeight = false;
            vlg.childAlignment = TextAnchor.LowerCenter;

            // Body rows area.
            GameObject bodyGo = NewUI("BodyArea", card.transform);
            VerticalLayoutGroup bvlg = bodyGo.AddComponent<VerticalLayoutGroup>();
            bvlg.spacing = 8;
            bvlg.childControlWidth = true;
            bvlg.childControlHeight = true;
            bvlg.childForceExpandWidth = true;
            bvlg.childForceExpandHeight = false;
            body = (RectTransform)bodyGo.transform;
            bvlg.childAlignment = TextAnchor.LowerCenter;
        }

        /// <summary>⑩-1 — le bar de ⑨ (`ExceptionQueueController.ParametresFile`, même scène, même dégradé fort), au zinc de la
        /// main : `.zinc.main-de-cartes{height:15%}`, `.plateau{top:0}` — pas d'étagère au-dessus du plateau.</summary>
        public static MafiaCleanCity.Shell.DecorAuComptoir.Parametres ParametresMain()
        {
            MafiaCleanCity.Shell.DecorAuComptoir.Parametres p = ExceptionQueueController.ParametresFile();
            p.HauteurZinc = ZincMain;
            p.HauteurDos = 0f;
            return p;
        }

        public const float ZincMain = 0.15f;

        // ---- body helpers ----
        private void ClearBody()
        {
            renderedTexts.Clear();
            if (body != null)
                for (int i = body.childCount - 1; i >= 0; i--)
                    UnityEngine.Object.Destroy(body.GetChild(i).gameObject);
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
