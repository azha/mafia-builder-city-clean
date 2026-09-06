using System;
using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.UI;
using MafiaCleanCity.Operational.Exceptions; // REUSE ExceptionsClient + ExceptionCardDto — already the exact shapes
using MafiaCleanCity.Theme;
using TMPro;

namespace MafiaCleanCity.Shell
{
    // W3.U1 C5 (design §3 C5) — `ExceptionQueuePanel` : top-N + actions inline. La LISTE elle-même
    // vient de la clé `queue` que C3 fournit (`SetQueue`) — ce panneau n'appelle PAS
    // `GET /v1/exceptions/queue` pour l'afficher ; cette route n'est appelée QUE par le lien "voir
    // toutes" (design : "elle n'appelle pas la route de file"). L'action inline REUSE
    // `ExceptionsClient.Resolve` (déjà consommé par `ExceptionsClient.cs`).
    public class ExceptionQueuePanelController : MonoBehaviour
    {
        [Header("Backend")]
        [SerializeField] private string baseUrl = "http://localhost";

        // ---- test hooks -----------------------------------------------------
        public int RenderedCardCount { get; private set; }
        public bool RenderedEmptyState { get; private set; }
        public int ResolveRequestCount { get; private set; }
        public int ViewAllRequestCount { get; private set; }
        public string LastResolveError { get; private set; }
        public string LastViewAllError { get; private set; }
        public ExceptionCardDto[] LastViewAllResult { get; private set; }
        // ITEM 0.5 §2 (C2) — les cartes RÉELLEMENT rendues (jamais celles d'un `ViewAll` séparé) :
        // sans ce test hook, un test qui veut désigner une ligne rendue par nom ("Row_" + id) devrait
        // soit deviner un id, soit refaire un appel réseau — les DEUX contournent le fait que le
        // panneau CONNAÎT déjà ses cartes.
        public IReadOnlyList<ExceptionCardDto> CurrentCards => currentCards;

        public IReadOnlyList<string> RenderedSeverityLabels => renderedSeverityLabels;
        private readonly List<string> renderedSeverityLabels = new List<string>();

        private RectTransform rowsRoot;
        private TextMeshProUGUI emptyStateText;
        private ExceptionsClient client;
        private string token;
        private ExceptionCardDto[] currentCards = Array.Empty<ExceptionCardDto>();
        private bool initialized;

        private void Awake() => EnsureInitialized();

        private void EnsureInitialized()
        {
            if (initialized) return;
            initialized = true;
            client = new ExceptionsClient { BaseUrl = baseUrl };
            BuildLayout();
        }

        /// <summary>Feed this panel the `queue` slice of a `session/open` payload — REUSE, never a
        /// separate fetch (design: C3 alimente C5 en données).</summary>
        public void SetQueue(string bearerToken, ExceptionCardDto[] cards)
        {
            EnsureInitialized();
            token = bearerToken;
            currentCards = cards ?? Array.Empty<ExceptionCardDto>();
            Render();
        }

        /// <summary>Inline resolve — a REAL request (REUSE ExceptionsClient.Resolve).</summary>
        public IEnumerator ResolveInline(string exceptionId, string method, string chosenActionId)
        {
            EnsureInitialized();
            ResolveRequestCount++;
            LastResolveError = null;
            yield return client.Resolve(exceptionId, method, chosenActionId, token,
                dto => { /* the caller (a real screen) would re-fetch session/open; this panel only proves the request fired */ },
                (code, msg) => LastResolveError = $"{code}: {msg}");
        }

        /// <summary>"View all" — the ONE place this panel calls `GET /v1/exceptions/queue` (REUSE
        /// ExceptionsClient.GetQueue), a REAL request read through payload.data.</summary>
        /// <summary>Le geste « voir tout » du panneau d'accueil — il OUVRE désormais l'écran ⑨.
        ///
        /// ⛔ Il ne naviguait pas. Il refaisait l'appel réseau et rangeait le résultat dans
        /// `LastViewAllResult`, une propriété que seuls des tests lisent : le joueur cliquait, une
        /// requête partait, et rien ne se passait à l'écran. La file complète était donc
        /// INJOIGNABLE depuis un shell en marche — c'est le « NAV-HORS-SHELL » du document de lot,
        /// et il ne se voit dans aucun test qui appelle `ViewAll()` puis lit sa propriété.
        /// ★ Un geste qui rend une VALEUR au lieu de produire un EFFET se teste parfaitement et ne
        ///   sert à personne. Le test vérifiait que la donnée arrivait ; le joueur attendait un écran.
        ///
        /// La requête est conservée : elle rafraîchit le panneau au passage, et l'écran monté
        /// recharge de son côté. Le repli — pas de navigateur trouvé — garde l'ancien comportement
        /// plutôt que de lever : hors shell, il n'y a nulle part où ouvrir.
        public IEnumerator ViewAll()
        {
            EnsureInitialized();
            ViewAllRequestCount++;
            LastViewAllError = null;
            yield return client.GetQueue(token,
                cards => LastViewAllResult = cards,
                (code, msg) => LastViewAllError = $"{code}: {msg}");

            MafiaCleanCity.Shell.IShellNavigator nav = MafiaCleanCity.Shell.ShellNavigatorLocator.Find();
            if (nav == null) yield break;   // hors shell : rien à ouvrir, et ce n'est pas une erreur
            LastViewAllNavGameObject =
                nav.MonterLocataireEnSurimpression<MafiaCleanCity.Operational.Exceptions.ExceptionQueueController>()
                   .gameObject;
        }

        /// <summary>L'hôte de l'écran ouvert par le dernier « voir tout » — crochet de test.
        /// Nul tant qu'aucune navigation n'a eu lieu (ou hors shell).</summary>
        public GameObject LastViewAllNavGameObject { get; private set; }

        // --------------------------------------------------------------- render

        private void Render()
        {
            for (int i = rowsRoot.childCount - 1; i >= 0; i--) UnityEngine.Object.Destroy(rowsRoot.GetChild(i).gameObject);
            renderedSeverityLabels.Clear();

            if (currentCards.Length == 0)
            {
                RenderedEmptyState = true;
                RenderedCardCount = 0;
                emptyStateText.gameObject.SetActive(true);
                emptyStateText.text = Lib("file", "Aucune exception en attente");
                return;
            }

            RenderedEmptyState = false;
            emptyStateText.gameObject.SetActive(false);

            // R2.3 sensitivity (C5-F2): render EXACTLY as many rows as the array carries — never a
            // hard-coded count (3 is only the TUNABLE'S default, never a client-side constant).
            RenderedCardCount = currentCards.Length;
            foreach (ExceptionCardDto card in currentCards)
            {
                AddRow(card);
            }
        }

        private void AddRow(ExceptionCardDto card)
        {
            GameObject row = new GameObject("Row_" + card.exception_id, typeof(RectTransform));
            row.transform.SetParent(rowsRoot, false);
            row.AddComponent<Image>().color = DesignTokens.Current.surfaceRow;
            HorizontalLayoutGroup hlg = row.AddComponent<HorizontalLayoutGroup>();
            hlg.padding = new RectOffset(10, 10, 6, 6);
            hlg.spacing = 8;
            hlg.childControlWidth = true;
            hlg.childControlHeight = true;
            LayoutElement rowLe = row.AddComponent<LayoutElement>();
            rowLe.minHeight = 36;

            // Severity — VALUE + LABEL together (design C5-F1: colour is never the sole differentiator).
            TextMeshProUGUI glyph = NewText(row.transform, SeverityGlyph(card.severity_band), 60);
            glyph.color = SeverityAccent(card.severity_band);
            TextMeshProUGUI label = NewText(row.transform, SeverityLabel(card.severity_band), 90);
            renderedSeverityLabels.Add(label.text);

            TextMeshProUGUI descriptor = NewText(row.transform, card.event_descriptor, 260);

            GameObject resolveBtn = new GameObject("Resolve", typeof(RectTransform));
            resolveBtn.transform.SetParent(row.transform, false);
            Image img = resolveBtn.AddComponent<Image>();
            img.color = DesignTokens.Current.accentGold;
            Button b = resolveBtn.AddComponent<Button>();
            b.targetGraphic = img;
            string suggestedMethod = "ONE_TIME";
            string suggestedActionId = card.suggested_action != null ? card.suggested_action.id : null;
            b.onClick.AddListener(() => StartCoroutine(ResolveInline(card.exception_id, suggestedMethod, suggestedActionId)));
            LayoutElement btnLe = resolveBtn.AddComponent<LayoutElement>();
            btnLe.minWidth = 70;
            btnLe.minHeight = 28;
        }

        // ⛔ LES TROIS ÉTAIENT MORTES, et la troisième était le pire des trois : elle rendait
        //    « High »/« Medium »/« Low » — de l'anglais — sur un domaine que le back n'émet PAS
        //    (`HIGH|MEDIUM|LOW` contre `MILD|MODERATE|SEVERE`), donc en pratique elle recrachait
        //    la valeur BRUTE du serveur, et « Unknown » quand elle était vide. Trois mots anglais
        //    sur un chemin qui n'en tolère aucun. Le domaine vit dans `ExceptionBandes`.
        private static string SeverityGlyph(string b) =>
            MafiaCleanCity.Operational.Exceptions.ExceptionBandes.Glyphe(b);
        private static string SeverityLabel(string b) =>
            MafiaCleanCity.Operational.Exceptions.ExceptionBandes.Gravite(b);
        private static Color SeverityAccent(string b)
        {
            switch (MafiaCleanCity.Operational.Exceptions.ExceptionBandes.RangGravite(b))
            {
                case 0:  return DesignTokens.Current.accentSuccess;
                case 1:  return DesignTokens.Current.accentWarning;
                case 2:  return DesignTokens.Current.accentDanger;
                default: return DesignTokens.Current.onSurfaceSecondary;
            }
        }

        // --------------------------------------------------------------- UI build

        private void BuildLayout()
        {
            RectTransform selfRt = GetComponent<RectTransform>();
            if (selfRt == null) selfRt = gameObject.AddComponent<RectTransform>();

            VerticalLayoutGroup vlg = gameObject.AddComponent<VerticalLayoutGroup>();
            vlg.padding = new RectOffset(8, 8, 8, 8);
            vlg.spacing = 4;
            vlg.childControlWidth = true;
            vlg.childControlHeight = true;
            vlg.childForceExpandWidth = true;
            vlg.childForceExpandHeight = false;

            GameObject rowsGo = new GameObject("Rows", typeof(RectTransform));
            rowsGo.transform.SetParent(transform, false);
            VerticalLayoutGroup rvlg = rowsGo.AddComponent<VerticalLayoutGroup>();
            rvlg.spacing = 4;
            rvlg.childControlWidth = true;
            rvlg.childControlHeight = true;
            rvlg.childForceExpandWidth = true;
            rvlg.childForceExpandHeight = false;
            rowsRoot = (RectTransform)rowsGo.transform;

            emptyStateText = NewText(transform, Lib("file", "Aucune exception en attente"), 260);
            emptyStateText.gameObject.SetActive(false);

            GameObject viewAllGo = new GameObject("ViewAll", typeof(RectTransform));
            viewAllGo.transform.SetParent(transform, false);
            Image vaImg = viewAllGo.AddComponent<Image>();
            vaImg.color = DesignTokens.Current.surfaceRow;
            Button vaBtn = viewAllGo.AddComponent<Button>();
            vaBtn.targetGraphic = vaImg;
            vaBtn.onClick.AddListener(() => StartCoroutine(ViewAll()));
            LayoutElement vaLe = viewAllGo.AddComponent<LayoutElement>();
            vaLe.minHeight = 32;
            TextMeshProUGUI vaLabel = NewText(viewAllGo.transform, "See all exceptions", 200);
        }

        private TextMeshProUGUI NewText(Transform parent, string value, float preferredWidth)
        {
            GameObject go = new GameObject("Text", typeof(RectTransform));
            go.transform.SetParent(parent, false);
            TextMeshProUGUI t = go.AddComponent<TextMeshProUGUI>();
            t.font = DesignTokens.Current.primaryFont;
            t.text = value;
            t.fontSize = 14;
            t.color = DesignTokens.Current.onSurfacePrimary;
            t.raycastTarget = false;
            LayoutElement le = go.AddComponent<LayoutElement>();
            le.preferredWidth = preferredWidth;
            return t;
        }

        /// <summary>Item 0.6 — le littéral d'écran passe par une CLÉ. Le repli passé à `Libelle`
        /// est FRANÇAIS : `Libelle.De` rend le littéral quand la clé manque au bundle, donc un
        /// repli anglais resterait anglais à l'écran À TRAVERS la conversion (mesuré par le
        /// chantier B : 81 replis sur 107 étaient anglais après une première passe — « converti
        /// sans traduire »). Convertir sans traduire ne change rien pour le joueur.</summary>
        private static string Lib(string role, string litteral) =>
            MafiaCleanCity.I18n.Libelle.De("accueil", role, litteral);

    }
}
