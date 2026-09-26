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
        private string baseUrlPose;   // posée par un appelant (tests, shell) ; sinon la source unique
        private string baseUrl { get => baseUrlPose ?? MafiaCleanCity.AdresseDuBack.Url; set => baseUrlPose = value; }
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
        /// <summary>Les répliques RÉELLEMENT posées, dans l'ordre des cartes rendues — pour la garde de VALEUR (2026-09-23).</summary>
        public IReadOnlyList<string> RenderedDescripteurs => renderedDescripteurs;
        private readonly List<string> renderedDescripteurs = new List<string>();

        private RectTransform rowsRoot;
        private TextMeshProUGUI emptyStateText;
        // ④ (2026-09-23, maquette 25 §2.2) — la SUIVANTE sous la carte de tête (queue[0] : « {nom} attend vos ordres · grave · trancher »,
        // les clés du bandeau, servies) et, file vide, l'ambiance « Personne ne fait la queue — la routine tient » (la phrase de ⑨,
        // `ExceptionQueueController.AmbianceVide`, servie). Mécanique, pas pixel : la maquette n'est pas ratifiée.
        private TextMeshProUGUI suivanteText, ambianceText;
        public string TexteSuivante => suivanteText != null && suivanteText.gameObject.activeSelf ? suivanteText.text : null;
        public string TexteAmbiance => ambianceText != null && ambianceText.gameObject.activeSelf ? ambianceText.text : null;
        // ④ LA LIGNE DE L'ACCUEIL (2026-09-26, mesure de l'UX sur `ecrans-brennar-accueil.html` @ d4b0379, §I.5) — sur l'Accueil, la file
        // n'est qu'UNE ligne, juste au-dessus du dock : « {nom} attend vos ordres » / GRAVITÉ, et TRANCHER à droite, 7,2 % de l'écran.
        // Le reste de la file vit dans l'ardoise ⑨ : toucher la ligne l'ouvre (« ViewAll », devenu la surface de la ligne) ; TRANCHER
        // ouvre la carte ⑩. Posé par le shell (`PoserEnLigneDeLAccueil`) ; hors Accueil, le panneau garde sa forme de liste.
        public bool LigneDeLAccueil { get; private set; }
        /// <summary>La hauteur de la ligne de l'Accueil, en unités de canvas (référence 1 280 de large) : 7,2 % d'un écran d'aspect 0,51
        /// (la maquette) ≈ 180. Fixe : elle ne s'étire jamais sur sa bande.</summary>
        public const float HauteurLigneAccueil = 180f;
        private GameObject viewAllGo;
        private TextMeshProUGUI viewAllLabel;
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

        /// <summary>Passe le panneau en LIGNE DE L'ACCUEIL (voir `LigneDeLAccueil`) et le re-rend.</summary>
        public void PoserEnLigneDeLAccueil()
        {
            EnsureInitialized();
            LigneDeLAccueil = true;
            VerticalLayoutGroup vlg = GetComponent<VerticalLayoutGroup>();
            if (vlg != null) { vlg.padding = new RectOffset(40, 40, 0, 0); vlg.childAlignment = TextAnchor.UpperCenter; }
            // « Voir l'ardoise » devient la SURFACE de la ligne : transparente, étendue au panneau, DERRIÈRE la ligne (TRANCHER, posé
            // après, reste au-dessus) — toucher « Lt. X attend vos ordres » ouvre l'ardoise, toucher TRANCHER ouvre la carte.
            viewAllGo.GetComponent<LayoutElement>().ignoreLayout = true;
            RectTransform va = (RectTransform)viewAllGo.transform;
            va.anchorMin = Vector2.zero; va.anchorMax = Vector2.one; va.offsetMin = va.offsetMax = Vector2.zero;
            Image vaImg = viewAllGo.GetComponent<Image>();
            Color transparent = vaImg.color; transparent.a = 0f; vaImg.color = transparent;
            viewAllLabel.gameObject.SetActive(false);
            viewAllGo.transform.SetSiblingIndex(0);
            foreach (TextMeshProUGUI t in new[] { emptyStateText, ambianceText })
            {
                t.fontSize = 30;
                t.alignment = TextAlignmentOptions.Center;
                t.GetComponent<LayoutElement>().preferredWidth = -1;
            }
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
            renderedDescripteurs.Clear();

            if (currentCards.Length == 0)
            {
                RenderedEmptyState = true;
                RenderedCardCount = 0;
                emptyStateText.gameObject.SetActive(true);
                emptyStateText.text = Lib("file", "Aucune exception en attente");
                ambianceText.gameObject.SetActive(true);
                ambianceText.text = MafiaCleanCity.Operational.Exceptions.ExceptionQueueController.AmbianceVide();
                suivanteText.gameObject.SetActive(false);
                return;
            }

            RenderedEmptyState = false;
            emptyStateText.gameObject.SetActive(false);
            ambianceText.gameObject.SetActive(false);
            suivanteText.gameObject.SetActive(!LigneDeLAccueil);   // sur l'Accueil, la ligne EST la suivante
            suivanteText.text = Suivante(currentCards[0]);

            if (LigneDeLAccueil)
            {
                // UNE ligne : la première décision. `RenderedCardCount` reste le nombre de cartes PORTÉES (la file entière, dans ⑨).
                RenderedCardCount = currentCards.Length;
                AddLigneDeLAccueil(currentCards[0]);
                return;
            }

            // R2.3 sensitivity (C5-F2): render EXACTLY as many rows as the array carries — never a
            // hard-coded count (3 is only the TUNABLE'S default, never a client-side constant).
            RenderedCardCount = currentCards.Length;
            foreach (ExceptionCardDto card in currentCards)
            {
                AddRow(card);
            }
        }

        /// <summary>La hauteur d'une ligne de file (deux lignes de texte à 14 et la marge de 6 + 6) — fixe, voir AddRow.</summary>
        public const float HauteurLigne = 48f;

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
            // ⛔ Créneau du 26/09 (planche P1, file seule) : l'UNIQUE ligne s'étirait sur toute la bande (≈ 44 % de l'écran), texte
            //    minuscule, « trancher » perdu à droite. Décidé (reco, 26/09) : la ligne a une hauteur FIXE de conception — deux lignes de
            //    texte et leur marge — ni min seul, ni flexible : elle ne s'étire jamais, quelle que soit la bande ou l'ordre de layout (la
            //    hauteur préférée d'un TMP calculée à largeur nulle suffisait à la gonfler). La réplique trop longue finit en ellipse.
            //    Garde : AccueilCanonPlayModeTests A6 (même hauteur avec et sans carte de tête).
            rowLe.minHeight = HauteurLigne;
            rowLe.preferredHeight = HauteurLigne;
            rowLe.flexibleHeight = 0f;

            // Gravité — le MOT, dans la couleur de sa gravité (C5-F1 : la couleur n'est jamais seule). 23/09 (décision f2 D11) : le glyphe
            // « [!..] » qui portait la couleur à côté du mot est RETIRÉ ; la couleur passe au mot lui-même.
            TextMeshProUGUI label = NewText(row.transform, SeverityLabel(card.severity_band), 90);
            label.color = SeverityAccent(card.severity_band);
            renderedSeverityLabels.Add(label.text);

            // ⛔ Le descripteur partait BRUT ici — ni règle, ni guillemets, ni tiret sur le vide.
            //    C'est le `exc_demo_teach_heat` que le juge a lu sur la planche.
            // ⛔ Et il partait SANS i18n jusqu'au 2026-09-23 (`card.event_descriptor` brut, défaut prouvé par l'atelier) : le texte
            //    passe désormais par `TexteServeur`, la MÊME règle que ⑨ — le jumeau servi s'il est connu, la prose sinon.
            TextMeshProUGUI descriptor = NewText(row.transform,
                MafiaCleanCity.Operational.Exceptions.ExceptionBandes.Replique(
                    MafiaCleanCity.Operational.Exceptions.ExceptionBandes.TexteServeur(card),
                    MafiaCleanCity.Operational.Exceptions.ExceptionBandes.ParleUnLieutenant(card)), 260);
            renderedDescripteurs.Add(descriptor.text);
            descriptor.overflowMode = TextOverflowModes.Ellipsis;   // la hauteur de la ligne est fixe : la réplique ne la pousse pas

            // ⛔ PASSE UX 26/09 (§G/§I, ④) — ici vivait « Resolve » : un APLAT `accentGold` SANS libellé, étiré par la mise en page (le plus
            //    gros élément de l'écran de la minute 0), dont le toucher RÉGLAIT la carte par l'action suggérée sans rien dire. Le geste
            //    de la ligne est « trancher » (le mot du canon, `ecrans-brennar-accueil.html` cadres 1-2, clé servie du bandeau) : il OUVRE
            //    la carte (⑩), où le joueur choisit. Décidé (reco, 26/09). `ResolveInline` reste (sa garde W3U1 l'appelle directement).
            GameObject trancherGo = new GameObject("Trancher", typeof(RectTransform));
            trancherGo.transform.SetParent(row.transform, false);
            Image zone = trancherGo.AddComponent<Image>();
            Color invisible = DesignTokens.Current.surfaceRow; invisible.a = 0f;
            zone.color = invisible;                                   // une zone de toucher, pas un aplat
            Button b = trancherGo.AddComponent<Button>();
            b.transition = Selectable.Transition.None;
            b.targetGraphic = zone;
            ExceptionCardDto carte = card;
            b.onClick.AddListener(() => OuvrirLaCarte(carte));
            LayoutElement btnLe = trancherGo.AddComponent<LayoutElement>();
            btnLe.minWidth = 70;
            btnLe.minHeight = 28;
            btnLe.flexibleWidth = 0f;                                  // ne s'étire plus
            TextMeshProUGUI mot = NewText(trancherGo.transform, MafiaCleanCity.I18n.Libelle.De("chrome", "bandeau", "trancher"), 90);
            mot.color = DesignTokens.Current.accentGold;              // l'or du geste, sur le mot — jamais un aplat
            mot.alignment = TextAlignmentOptions.Center;
            mot.raycastTarget = false;
            RectTransform motRt = (RectTransform)mot.transform;
            motRt.anchorMin = Vector2.zero; motRt.anchorMax = Vector2.one; motRt.offsetMin = motRt.offsetMax = Vector2.zero;
        }

        /// <summary>La ligne de l'Accueil : « {nom} attend vos ordres » sur la GRAVITÉ en capitales, TRANCHER en or à droite.</summary>
        private void AddLigneDeLAccueil(ExceptionCardDto card)
        {
            GameObject row = new GameObject("Row_" + card.exception_id, typeof(RectTransform));
            row.transform.SetParent(rowsRoot, false);
            Image fond = row.AddComponent<Image>();
            fond.color = DesignTokens.Current.surfaceCard;
            fond.raycastTarget = false;                               // le toucher passe à la surface « ViewAll », dessous
            HorizontalLayoutGroup hlg = row.AddComponent<HorizontalLayoutGroup>();
            hlg.padding = new RectOffset(36, 36, 18, 18);
            hlg.spacing = 16;
            hlg.childAlignment = TextAnchor.MiddleLeft;
            hlg.childControlWidth = true;
            hlg.childControlHeight = true;
            hlg.childForceExpandWidth = false;
            hlg.childForceExpandHeight = false;
            LayoutElement rowLe = row.AddComponent<LayoutElement>();
            rowLe.minHeight = HauteurLigneAccueil;
            rowLe.preferredHeight = HauteurLigneAccueil;
            rowLe.flexibleHeight = 0f;

            GameObject gauche = new GameObject("QuiAttend", typeof(RectTransform));
            gauche.transform.SetParent(row.transform, false);
            VerticalLayoutGroup col = gauche.AddComponent<VerticalLayoutGroup>();
            col.spacing = 6;
            col.childAlignment = TextAnchor.MiddleLeft;
            col.childControlWidth = true; col.childControlHeight = true;
            col.childForceExpandWidth = true; col.childForceExpandHeight = false;
            gauche.AddComponent<LayoutElement>().flexibleWidth = 1f;

            TextMeshProUGUI qui = NewText(gauche.transform, QuiAttend(card), -1);
            qui.fontSize = 34;
            qui.overflowMode = TextOverflowModes.Ellipsis;
            qui.enableWordWrapping = false;
            TextMeshProUGUI gravite = NewText(gauche.transform, SeverityLabel(card.severity_band).ToUpperInvariant(), -1);
            gravite.fontSize = 22;
            gravite.characterSpacing = 8;
            gravite.color = SeverityAccent(card.severity_band);
            renderedSeverityLabels.Add(SeverityLabel(card.severity_band));

            GameObject trancherGo = new GameObject("Trancher", typeof(RectTransform));
            trancherGo.transform.SetParent(row.transform, false);
            Image zone = trancherGo.AddComponent<Image>();
            Color invisible = DesignTokens.Current.surfaceCard; invisible.a = 0f;
            zone.color = invisible;
            Button b = trancherGo.AddComponent<Button>();
            b.transition = Selectable.Transition.None;
            b.targetGraphic = zone;
            ExceptionCardDto carte = card;
            b.onClick.AddListener(() => OuvrirLaCarte(carte));
            LayoutElement btnLe = trancherGo.AddComponent<LayoutElement>();
            btnLe.minWidth = 220; btnLe.preferredWidth = 220; btnLe.minHeight = 100;
            btnLe.flexibleWidth = 0f;
            TextMeshProUGUI mot = NewText(trancherGo.transform, MafiaCleanCity.I18n.Libelle.De("chrome", "bandeau", "trancher").ToUpperInvariant(), -1);
            mot.fontSize = 30;
            mot.fontStyle = FontStyles.Bold;
            mot.characterSpacing = 10;
            mot.color = DesignTokens.Current.accentGold;
            mot.alignment = TextAlignmentOptions.MidlineRight;
            RectTransform motRt = (RectTransform)mot.transform;
            motRt.anchorMin = Vector2.zero; motRt.anchorMax = Vector2.one; motRt.offsetMin = motRt.offsetMax = Vector2.zero;
        }

        /// <summary>QUI attend : le lieutenant NOMMÉ, ou la ville — les deux clés du bandeau, servies (la première partie de `Suivante`).</summary>
        public static string QuiAttend(ExceptionCardDto c) =>
            c == null ? "" : MafiaCleanCity.Operational.Exceptions.ExceptionBandes.ParleUnLieutenant(c)
                ? MafiaCleanCity.I18n.Libelle.Gabarit("chrome.bandeau.attend_vos_ordres", "{nom} attend vos ordres",
                    new Dictionary<string, string> { { "nom", MafiaCleanCity.Operational.Exceptions.ExceptionBandes.Locuteur(c) } })
                : MafiaCleanCity.I18n.Libelle.Gabarit("chrome.bandeau.la_ville_attend_vos_ordres", "La ville attend vos ordres");

        /// <summary>« trancher » : ouvre la carte (⑩) PAR LE SHELL, en surimpression — le joueur y choisit. Hors shell : rien.</summary>
        public void OuvrirLaCarte(ExceptionCardDto card)
        {
            if (card == null) return;
            IShellNavigator nav = ShellNavigatorLocator.Find();
            if (nav == null) return;
            ExceptionDetailController detail = nav.MonterLocataireEnSurimpression<ExceptionDetailController>();
            if (detail == null) return;
            detail.Init(card, token, client != null ? client.BaseUrl : MafiaCleanCity.AdresseDuBack.Url, onBack: null);
            LastCarteOuverte = detail.gameObject;
        }

        /// <summary>Le détail ⑩ ouvert par « trancher » (garde).</summary>
        public GameObject LastCarteOuverte { get; private set; }

        // ⛔ LES TROIS ÉTAIENT MORTES, et la troisième était le pire des trois : elle rendait
        //    « High »/« Medium »/« Low » — de l'anglais — sur un domaine que le back n'émet PAS
        //    (`HIGH|MEDIUM|LOW` contre `MILD|MODERATE|SEVERE`), donc en pratique elle recrachait
        //    la valeur BRUTE du serveur, et « Unknown » quand elle était vide. Trois mots anglais
        //    sur un chemin qui n'en tolère aucun. Le domaine vit dans `ExceptionBandes`.
        /// <summary>La suivante : QUI attend (un lieutenant NOMMÉ par `ExceptionBandes.Locuteur`, ou la ville), sa gravité, et le geste
        /// « trancher » — les clés du bandeau (`chrome.bandeau.attend_vos_ordres`, `…la_ville_attend_vos_ordres`, `…trancher`), servies.</summary>
        public static string Suivante(ExceptionCardDto c)
        {
            if (c == null) return "";
            return QuiAttend(c) + " · " + SeverityLabel(c.severity_band) + " · " + MafiaCleanCity.I18n.Libelle.De("chrome", "bandeau", "trancher");
        }

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

            suivanteText = NewText(transform, "", 260);
            suivanteText.gameObject.SetActive(false);
            suivanteText.transform.SetSiblingIndex(0);   // SOUS la carte de tête : en tête de ce panneau

            emptyStateText = NewText(transform, Lib("file", "Aucune exception en attente"), 260);
            emptyStateText.gameObject.SetActive(false);
            ambianceText = NewText(transform, "", 260);
            ambianceText.gameObject.SetActive(false);

            viewAllGo = new GameObject("ViewAll", typeof(RectTransform));
            viewAllGo.transform.SetParent(transform, false);
            Image vaImg = viewAllGo.AddComponent<Image>();
            vaImg.color = DesignTokens.Current.surfaceRow;
            Button vaBtn = viewAllGo.AddComponent<Button>();
            vaBtn.targetGraphic = vaImg;
            vaBtn.onClick.AddListener(() => StartCoroutine(ViewAll()));
            LayoutElement vaLe = viewAllGo.AddComponent<LayoutElement>();
            vaLe.minHeight = 32;
            viewAllLabel = NewText(viewAllGo.transform, "Voir l'ardoise ›", 200);
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
