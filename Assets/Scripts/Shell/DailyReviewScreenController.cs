using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.UI;
using MafiaCleanCity.Theme;
using MafiaCleanCity.Operational.Lieutenant;
using TMPro;

namespace MafiaCleanCity.Shell
{
    // ⑯ LA REVUE DU JOUR — « le matin au Verge d'Or ».
    //
    // Référence RATIFIÉE par l'user (« nickel », 2026-08-25) : série 4, `ecrans-brennar-4.html`,
    // cadres « trois jetons sur le zinc » / « personne au comptoir » / « après vos verdicts ».
    // La scène : le patron passe derrière le zinc avant l'ouverture. Un signalement, c'est un
    // homme qui a DÉPENSÉ UN JETON DE CONFIANCE pour poser une question — il est accoudé, son
    // jeton posé devant lui. Le titre (`descriptor.key`) est sa phrase, le motif
    // (`flag_reason.key`) sa seconde moitié en italique : c'est LUI qui parle, pas une fiche.
    //
    // LE JETON EST LE GESTE : le toucher = le lui rendre (`validate`) ; le GARDER en appui long =
    // `dismiss`, irréversible — donc le même geste que le tampon du registre (arbitrage E5 : le
    // canon voulait une feuille de confirmation, l'appui long EST la confirmation).
    //
    // ÉCHELLE — la maquette est un téléphone de 300 px CSS, le canvas du shell fait 1280 unités de
    // large (`AppShell.ReferenceResolutionWidth`, `matchWidthOrHeight=0`). Toute dimension de la
    // référence est donc multipliée par 1280/300 = 4,2667, jamais recopiée telle quelle.
    // ⚠️ Et toute OPACITÉ reprise de la maquette est exprimée dans l'espace du NAVIGATEUR (sRGB)
    // alors que ce projet rend en LINÉAIRE (`m_ActiveColorSpace: 1`) : les voiles passent par
    // `ProceduralUI.CouleurPourMelangeLineaire`, jamais par une recopie de l'alpha CSS.
    //
    // Ouverture automatique pilotée par `flag_review.auto_open` DÉJÀ CALCULÉ côté serveur — ce
    // contrôleur ne recalcule PAS la règle « première session du jour », il la LIT.
    //
    // ⛔ NON REVU — jalon 2026-09-05 (régime « full prod » du ruling user 2026-09-01 : aucun juge
    // ⊥, aucune suite complète ; test simple = typecheck + compile + une capture).
    public class DailyReviewScreenController : MonoBehaviour, IShellTenant
    {
        [Header("Backend")]
        [SerializeField] private string baseUrl = "http://localhost";

        // ---- test hooks ------------------------------------------------------
        public bool IsOpen { get; private set; }
        public bool RenderedEmptyState { get; private set; }
        public int RenderedCardCount { get; private set; }
        public int ValidateRequestCount { get; private set; }
        public int DismissRequestCount { get; private set; }
        public int BatchConfirmRequestCount { get; private set; }
        public string LastValidateError { get; private set; }
        public string LastDismissError { get; private set; }
        public string LastBatchConfirmError { get; private set; }
        public int? LastBatchConfirmedCount { get; private set; }
        public FlagReviewResponseDto LastLoadedReview { get; private set; }

        public LongPressButton BatchConfirmButton { get; private set; }

        private RectTransform rowsRoot;
        private TextMeshProUGUI emptyStateText;
        private TextMeshProUGUI registreCompte;
        private GameObject tamponRoot;
        private TextMeshProUGUI tamponLibelle;
        private TextMeshProUGUI tamponSous;
        private RosterRow[] roster;
        private Transform mountParent;
        private DailyReviewClient client;
        private string token;
        private bool initialized;

        private void Awake() => EnsureInitialized();

        private void EnsureInitialized()
        {
            if (initialized) return;
            initialized = true;
            client = new DailyReviewClient { BaseUrl = baseUrl };
            BuildLayout();
        }

        // ⛔ SANS DÉCLENCHEUR, L'ÉCRAN S'OUVRE VIDE — et c'est un précédent MESURÉ de ce dépôt, pas
        // une précaution : `LieutenantScreenController` a livré un écran affichant « aucun
        // lieutenant » à un compte qui en possédait DEUX, parce que le chargement du roster n'avait
        // qu'un seul appelant — un bouton de mise au point. Ici, `LoadReview` et `LoadRoster`
        // n'avaient AUCUN appelant de production : l'écran se serait monté sur un comptoir vide et
        // aurait eu l'air correct.
        //
        // ⇒ Le déclencheur est le CONTRAT DU SHELL, pas une seconde authentification. `AppShell`
        // tient déjà le jeton et le remet à chaque locataire par `IShellTenant.SetToken` — ma
        // première version rouvrait un `signin` à elle, c'est-à-dire un second chemin d'auth pour
        // un jeton déjà acquis. Et ne pas implémenter cette interface était une ERREUR DE
        // COMPILATION, pas un oubli silencieux : `MountTenant<T>` la contraint.
        /// <summary>⛔ ET LE PARENTAGE SE FAIT ICI, PAS DANS `BuildLayout()`. Mesuré sur la première
        /// capture réussie : les cinq billets se sont empilés dans une colonne de largeur nulle,
        /// tous les textes superposés. Cause — `BuildLayout()` est appelé depuis `Awake()`, donc
        /// AVANT que le shell n'appelle `SetMountParent` : `mountParent` y valait null, les ancres
        /// de plein écran n'étaient jamais posées, et la racine gardait une largeur de zéro.
        /// *Un rect de largeur nulle ne casse rien et ne lève rien : il laisse tout déborder au
        /// centre, ce qui ressemble à un défaut de mise en page et n'en est pas un.*</summary>
        public void SetMountParent(Transform parent)
        {
            mountParent = parent;
            EnsureInitialized();
            if (parent == null) return;
            transform.SetParent(parent, false);
            RectTransform rt = (RectTransform)transform;
            rt.anchorMin = Vector2.zero;
            rt.anchorMax = Vector2.one;
            rt.offsetMin = Vector2.zero;
            rt.offsetMax = Vector2.zero;
            // ⛔⛔ ET L'ORDRE DE FRATRIE DÉCIDE DE CE QU'ON VOIT. Mesuré le 2026-09-02 sur deux
            // captures : `rect=1280x960`, `frere=1/8` — l'écran était de la BONNE taille, au BON
            // endroit, sous le BON canvas, et SIX frères se dessinaient par-dessus. La capture
            // montrait la carte de la ville, l'autonomie et le dock ; l'écran, nulle part.
            // ⇒ Un locataire monté en surimpression doit être le DERNIER enfant, sinon il est
            // rendu dessous. C'est une propriété STRUCTURELLE — elle ne dépend d'aucun pixel,
            // d'aucune résolution, d'aucune couleur — et c'est la seule classe de garde qui ait
            // fermé ce genre de défaut ici.
            transform.SetAsLastSibling();
        }


        /// <summary>⛔ LE SHELL RE-PARENTE APRÈS AVOIR APPELÉ `SetMountParent` — mesuré deux fois.
        /// Poser l'ordre de fratrie dans le setter le fait donc DÉFAIRE aussitôt : la planche du
        /// 2026-09-02 a intercepté ㉓ à « frère 6 sur 11 » alors que le setter l'avait bien mise en
        /// dernier. Les six autres écrans passaient, non parce que le geste marchait, mais parce
        /// que le shell les appendait déjà en fin de liste — *une garde qui réussit six fois sur
        /// sept ne marche pas : elle est chanceuse six fois sur sept.*
        /// ⇒ On ne devine plus QUAND le parentage a lieu : on RÉAGIT à l'événement. Unity appelle
        /// ce callback exactement au changement de parent, donc après le geste du shell, quel que
        /// soit son ordre interne. La propriété devient indépendante de la séquence d'appel.
        /// ⚠️ Le callback tire aussi au démontage, où le parent est nul — d'où la garde.</summary>
        private void OnTransformParentChanged()
        {
            if (transform.parent != null) transform.SetAsLastSibling();
        }

        public void SetToken(string bearer)
        {
            EnsureInitialized();
            token = bearer;
            if (!string.IsNullOrEmpty(bearer)) StartCoroutine(Charger(bearer));
        }

        private IEnumerator Charger(string bearer)
        {
            yield return LoadReview(bearer);
            yield return LoadRoster(bearer);
        }

        /// <summary>Design C8-F3 — the screen opens WHEN the server boolean is true, and stays
        /// closed when false. A value read, never re-derived client-side.</summary>
        public void ApplyAutoOpen(bool serverAutoOpen)
        {
            EnsureInitialized();
            IsOpen = serverAutoOpen;
        }

        public IEnumerator LoadReview(string bearerToken)
        {
            EnsureInitialized();
            token = bearerToken;
            yield return client.GetFlagReview(token, dto => LastLoadedReview = dto, (c, m) => { });
            if (LastLoadedReview != null) Render(LastLoadedReview.cards);
        }

        public IEnumerator ValidateFlag(string flagId)
        {
            EnsureInitialized();
            ValidateRequestCount++;
            LastValidateError = null;
            yield return client.Validate(token, flagId, dto => { }, (c, m) => LastValidateError = $"{c}: {m}");
        }

        public IEnumerator DismissFlag(string flagId)
        {
            EnsureInitialized();
            DismissRequestCount++;
            LastDismissError = null;
            yield return client.Dismiss(token, flagId, dto => { }, (c, m) => LastDismissError = $"{c}: {m}");
        }

        /// <summary>Wired to `BatchConfirmButton.OnLongPressCompleted` — design C8-F2: batch confirm
        /// REQUIRES the long press, a tap emits nothing (the button's OWN gesture gate already
        /// filters that; this method fires only on a genuine completion).</summary>
        public IEnumerator RequestBatchConfirm()
        {
            EnsureInitialized();
            BatchConfirmRequestCount++;
            LastBatchConfirmError = null;
            yield return client.BatchConfirm(token,
                dto => LastBatchConfirmedCount = dto.batch_confirmed_count,
                (c, m) => LastBatchConfirmError = $"{c}: {m}");
        }

        // --------------------------------------------------------------- render

        // Toutes les dimensions ci-dessous sont celles de la RÉFÉRENCE (px CSS du téléphone de
        // 300), multipliées par ce facteur. Les écrire en dur, converties, ferait perdre le lien
        // avec la maquette — et c'est ce lien qui permet de rejuger sans re-deviner.
        private const float K = 1280f / 300f;
        private static float Px(float cssPx) => cssPx * K;

        private static readonly Color Creme     = Hex("#eae0c8");
        private static readonly Color Creme2    = Hex("#b9ad92");
        private static readonly Color Or        = Hex("#d9ab4e");
        private static readonly Color OrVif     = Hex("#f2c96b");
        private static readonly Color Laiton    = Hex("#b08d3e");
        private static readonly Color Braise    = Hex("#e0664a");
        private static readonly Color Cyan      = Hex("#7fd4d9");
        private static readonly Color Vert      = Hex("#7db36a");
        private static readonly Color PapierHaut = Hex("#efe4c6");
        private static readonly Color PapierBas  = Hex("#dccfa9");
        private static readonly Color EncrePapier = Hex("#2b1d0e");
        private static readonly Color EncrePapier2 = Hex("#5a4629");
        private static readonly Color Rouge     = Hex("#93402c");
        private static readonly Color VertCachet = Hex("#4f7f3f");

        private static Color Hex(string h)
        {
            ColorUtility.TryParseHtmlString(h, out Color c);
            return c;
        }

        private void Render(FlagCardDto[] cards)
        {
            for (int i = rowsRoot.childCount - 1; i >= 0; i--) UnityEngine.Object.Destroy(rowsRoot.GetChild(i).gameObject);

            int enAttente = LastLoadedReview != null ? LastLoadedReview.routine_pending_count : 0;
            bool tamponDisponible = LastLoadedReview != null && LastLoadedReview.batch_confirm_available;

            if (cards == null || cards.Length == 0)
            {
                RenderedEmptyState = true;
                RenderedCardCount = 0;
                emptyStateText.gameObject.SetActive(true);
                // « Personne au comptoir » — trois tabourets vides, le registre seul. Le texte est
                // la scène, pas un état d'erreur : c'est une bonne nouvelle, pas un vide technique.
                emptyStateText.text = "Personne au comptoir ce matin.";
                MajRegistre(enAttente, tamponDisponible, 0);
                return;
            }

            RenderedEmptyState = false;
            emptyStateText.gameObject.SetActive(false);
            RenderedCardCount = cards.Length;
            foreach (FlagCardDto card in cards) AddRow(card);
            MajRegistre(enAttente, tamponDisponible, cards.Length);
        }

        /// <summary>Le registre et son tampon. « tenue sans vous · N » est `routine_pending_count`
        /// EN ENTIER (arbitrage JD-E3, ratifié tel que dessiné) ; le tampon n'existe que si
        /// `batch_confirm_available` — son absence n'est pas un bouton grisé, c'est un objet qui
        /// n'est pas sur le zinc.</summary>
        private void MajRegistre(int enAttente, bool tamponDisponible, int signalements)
        {
            if (registreCompte != null) registreCompte.text = enAttente.ToString();
            if (tamponRoot != null)
            {
                tamponRoot.SetActive(tamponDisponible);
                if (tamponLibelle != null) tamponLibelle.text = "CONFIRMER LA ROUTINE · " + enAttente;
                if (tamponSous != null)
                    tamponSous.text = signalements > 0
                        ? "appui long — les " + signalements + " signalements restent à votre main"
                        : "appui long";
            }
        }

        /// <summary>Un « billet » : le médaillon du buste, la bulle où il parle, la colonne du
        /// jeton. Le nom vient de la maquette — c'est ce qu'on pose sur un zinc.</summary>
        private void AddRow(FlagCardDto card)
        {
            GameObject billet = new GameObject("Billet_" + card.flag_id, typeof(RectTransform));
            billet.transform.SetParent(rowsRoot, false);
            HorizontalLayoutGroup hlg = billet.AddComponent<HorizontalLayoutGroup>();
            hlg.spacing = Px(7f);
            hlg.childControlWidth = true;
            hlg.childControlHeight = true;
            // ⚠️ `childForceExpandWidth` DOIT RESTER FAUX. Mis à vrai pour réparer le débordement,
            // il a étiré le médaillon et le jeton en ELLIPSES larges — le correctif d'un défaut de
            // largeur qui en fabrique un autre, un cran plus loin. Ce qui règle vraiment le
            // débordement est `preferredWidth = 0` sur la bulle (voir plus bas) : elle cesse de
            // réclamer la largeur de son texte non coupé, et son `flexibleWidth` lui donne le
            // reste. Les deux voisins gardent alors leur taille carrée.
            hlg.childForceExpandWidth = false;
            hlg.childForceExpandHeight = false;
            hlg.childAlignment = TextAnchor.LowerLeft;

            // ── le buste ─────────────────────────────────────────────────────────────────────
            GameObject medl = new GameObject("Medaillon", typeof(RectTransform));
            medl.transform.SetParent(billet.transform, false);
            Image medlImg = medl.AddComponent<Image>();
            medlImg.sprite = ProceduralUI.MedallionFace((int)Px(40f),
                DesignTokens.Current.lieutenantMedallionInner,
                DesignTokens.Current.lieutenantMedallionOuter,
                Laiton);
            medlImg.type = Image.Type.Simple;
            LayoutElement medlLe = medl.AddComponent<LayoutElement>();
            medlLe.preferredWidth = Px(40f);
            medlLe.preferredHeight = Px(40f);
            medlLe.flexibleWidth = 0f;
            medlLe.flexibleHeight = 0f;

            // ── la bulle : c'est LUI qui parle ───────────────────────────────────────────────
            GameObject bulle = new GameObject("Bulle", typeof(RectTransform));
            bulle.transform.SetParent(billet.transform, false);
            Image bulleFond = bulle.AddComponent<Image>();
            bulleFond.sprite = ProceduralUI.RoundedRectOutline((int)Px(12f), Px(1f), Hex("#ffffff2a"));
            bulleFond.type = Image.Type.Sliced;
            bulleFond.color = Color.white;
            GameObject bulleVerre = new GameObject("Verre", typeof(RectTransform));
            bulleVerre.transform.SetParent(bulle.transform, false);
            RectTransform bvRt = (RectTransform)bulleVerre.transform;
            bvRt.anchorMin = Vector2.zero; bvRt.anchorMax = Vector2.one;
            bvRt.offsetMin = Vector2.zero; bvRt.offsetMax = Vector2.zero;
            Image bvImg = bulleVerre.AddComponent<Image>();
            bvImg.sprite = ProceduralUI.VerticalGradient((int)Px(60f),
                DesignTokens.Current.lieutenantGlassTop, DesignTokens.Current.lieutenantGlassBottom);
            bvImg.type = Image.Type.Sliced;
            bulleVerre.transform.SetAsFirstSibling();

            VerticalLayoutGroup bvlg = bulle.AddComponent<VerticalLayoutGroup>();
            bvlg.padding = new RectOffset((int)Px(9f), (int)Px(9f), (int)Px(6f), (int)Px(7f));
            bvlg.spacing = Px(2f);
            bvlg.childControlWidth = true;
            bvlg.childControlHeight = true;
            bvlg.childForceExpandWidth = true;
            bvlg.childForceExpandHeight = false;
            LayoutElement bulleLe = bulle.AddComponent<LayoutElement>();
            // ⛔ `preferredWidth = 0` EST LE POINT QUI COMPTE. Sans lui, TMP réclame la largeur de
            // sa ligne NON COUPÉE : la bulle demandait des milliers d'unités, poussait la colonne
            // du jeton hors de l'écran, et le débordement se lisait comme un défaut de marge alors
            // que c'était une demande de taille. *Une boîte qui réclame plus que son contenant ne
            // rétrécit pas : elle pousse ses voisins dehors.*
            bulleLe.preferredWidth = 0f;
            bulleLe.flexibleWidth = 1f;

            // ligne « qui » : le nom, ses chips, le jour poussé à droite
            GameObject qui = new GameObject("Qui", typeof(RectTransform));
            qui.transform.SetParent(bulle.transform, false);
            HorizontalLayoutGroup qhlg = qui.AddComponent<HorizontalLayoutGroup>();
            qhlg.spacing = Px(5f);
            qhlg.childControlWidth = true;
            qhlg.childControlHeight = true;
            qhlg.childForceExpandWidth = false;
            qhlg.childAlignment = TextAnchor.MiddleLeft;

            // ⚠️ CE NOM VAUDRA « Lieutenant » POUR TOUT LE MONDE, ET CE N'EST PAS UN DÉFAUT D'ICI.
            // Mesuré côté back : le chemin de recrutement de PRODUCTION écrit le littéral
            // (`lieutenant.service.ts:235`, `name: 'Lieutenant'` — pool de noms localisés différé,
            // spec §11), et l'octroi d'onboarding fait pareil. En base, tous joueurs confondus :
            // « Lieutenant » ×18996, « LT w3u1 » ×474, et deux vrais noms.
            // ⇒ La colonne ACCEPTE un vrai nom, c'est le POOL qui n'existe pas. Cette projection est
            // correcte : elle affiche fidèlement ce que la production écrit. Le juge-données avait
            // raison sur le symptôme (« les noms sont un bouchon ») et à côté sur la cause — ce
            // n'est pas la base qui est bouchonnée, c'est l'écrivain UNIQUE qui écrit une constante.
            // Couvert par TD-046 (pool de noms différé) ; ne pas rouvrir de dette ici.
            string nom = card.lieutenant != null && !string.IsNullOrEmpty(card.lieutenant.name)
                ? card.lieutenant.name
                : "—";
            Texte(qui.transform, "Nom", nom, Px(11.5f), OrVif, DesignTokens.Current.hudSerifFont);

            // Les deux chips viennent de la JOINTURE client sur `GET /v1/lieutenants` (`tenure_bucket`).
            // ⚠️ `flag_frequency_band` n'est PAS dans `RosterRow` : la chip « signale rarement /
            // souvent » de la maquette n'a pas de source ici — non dessinée plutôt que fabriquée.
            string anciennete = AncienneteChip(card.lieutenant != null ? card.lieutenant.id : null);
            if (!string.IsNullOrEmpty(anciennete)) Chip(qui.transform, anciennete, Cyan);

            GameObject espace = new GameObject("Espace", typeof(RectTransform));
            espace.transform.SetParent(qui.transform, false);
            espace.AddComponent<LayoutElement>().flexibleWidth = 1f;

            Chip(qui.transform, "J" + card.flagged_game_day, Creme2);

            // sa phrase : le titre, puis le motif en italique
            GameObject phraseGo = new GameObject("Phrase", typeof(RectTransform));
            phraseGo.transform.SetParent(bulle.transform, false);
            TextMeshProUGUI phrase = phraseGo.AddComponent<TextMeshProUGUI>();
            phrase.font = DesignTokens.Current.hudSerifFont;
            phrase.fontSize = Px(10.5f);
            phrase.color = Creme;
            phrase.lineSpacing = -8f;
            phrase.enableWordWrapping = true;
            // ⛔ AUCUNE CLÉ i18n N'EST SERVIE PAR CE BACK — mesuré au socle : 178 clés référencées,
            // 0 servie. Afficher `descriptor.key` tel quel donne
            // « core_loops.flag_discipline.routine.front_shop_reconciliation.descriptor » en pleine
            // bulle, ce que la première capture montre. La maquette veut une PHRASE.
            // ⇒ En attendant le bundle, on rend le dernier segment porteur, lisible, et le fait que
            // ce soit un PIS-ALLER est écrit ici : le jour où `GET /v1/i18n/bundle` sert ces clés,
            // c'est cette fonction qu'on remplace, pas la mise en page.
            string titre = Lisible(card.descriptor != null ? card.descriptor.key : null);
            string motif = Lisible(card.flag_reason != null ? card.flag_reason.key : null);
            phrase.text = string.IsNullOrEmpty(motif)
                ? titre
                : titre + "<i><color=#b9ad92> — " + motif + "</color></i>";

            // ── la colonne du jeton : le geste ───────────────────────────────────────────────
            GameObject col = new GameObject("JetonCol", typeof(RectTransform));
            col.transform.SetParent(billet.transform, false);
            VerticalLayoutGroup cvlg = col.AddComponent<VerticalLayoutGroup>();
            cvlg.spacing = Px(1f);
            cvlg.childControlWidth = true;
            cvlg.childControlHeight = true;
            // le jeton est un DISQUE : étiré à la largeur de sa colonne il devient un ovale, et la
            // troisième capture le montrait sur les cinq billets. Même cause que les médaillons, un
            // conteneur plus loin — *un correctif de largeur se vérifie sur CHAQUE conteneur qui
            // porte un objet rond, pas seulement sur celui qu'on vient de toucher.*
            cvlg.childForceExpandWidth = false;
            cvlg.childForceExpandHeight = false;
            cvlg.childAlignment = TextAnchor.MiddleCenter;
            LayoutElement colLe = col.AddComponent<LayoutElement>();
            colLe.preferredWidth = Px(50f);
            colLe.flexibleWidth = 0f;
            colLe.flexibleHeight = 0f;

            GameObject jeton = new GameObject("Jeton", typeof(RectTransform));
            jeton.transform.SetParent(col.transform, false);
            Image jetonImg = jeton.AddComponent<Image>();
            jetonImg.sprite = ProceduralUI.RadialDisc((int)Px(34f), Hex("#f2d9a0"), Hex("#7a5a14"));
            LayoutElement jetonLe = jeton.AddComponent<LayoutElement>();
            jetonLe.preferredWidth = Px(34f);
            jetonLe.preferredHeight = Px(34f);
            jetonLe.flexibleWidth = 0f;
            Texte(jeton.transform, "Coche", "✓", Px(13f), Hex("#3a2a12"), DesignTokens.Current.primaryFont,
                  TextAlignmentOptions.Center, true);

            // LE GESTE, et il porte les deux verdicts sur le MÊME objet — c'est la maquette :
            // toucher = rendre, garder = passer outre. `LongPressButton` n'expose que la
            // complétion ; le `Button` tirerait AUSSI au relâchement d'un appui long, donc on
            // consomme le geste explicitement plutôt que de laisser les deux partir.
            LongPressButton garder = jeton.AddComponent<LongPressButton>();
            bool consomme = false;
            garder.OnLongPressCompleted += () =>
            {
                consomme = true;
                StartCoroutine(DismissFlag(card.flag_id));
            };
            Button rendre = jeton.AddComponent<Button>();
            rendre.targetGraphic = jetonImg;
            rendre.onClick.AddListener(() =>
            {
                if (consomme) { consomme = false; return; }
                StartCoroutine(ValidateFlag(card.flag_id));
            });

            Texte(col.transform, "Rendre", "RENDRE", Px(7.5f), OrVif, DesignTokens.Current.primaryFont,
                  TextAlignmentOptions.Center);
            Texte(col.transform, "Garder", "garder · appui long", Px(6.3f), Creme2,
                  DesignTokens.Current.primaryFont, TextAlignmentOptions.Center);

            // la réserve — `trust_budget_bucket`, trois pastilles
            GameObject reserve = new GameObject("Reserve", typeof(RectTransform));
            reserve.transform.SetParent(col.transform, false);
            HorizontalLayoutGroup rhlg = reserve.AddComponent<HorizontalLayoutGroup>();
            rhlg.spacing = Px(2f);
            rhlg.childControlWidth = true;
            rhlg.childControlHeight = true;
            rhlg.childForceExpandWidth = false;
            rhlg.childAlignment = TextAnchor.MiddleCenter;
            int allumees = ReservePastilles(card.trust_budget_bucket);
            for (int k = 0; k < 3; k++)
            {
                GameObject pip = new GameObject("Pip" + k, typeof(RectTransform));
                pip.transform.SetParent(reserve.transform, false);
                Image pi = pip.AddComponent<Image>();
                pi.sprite = k < allumees
                    ? ProceduralUI.RadialDisc((int)Px(9f), Hex("#f2d9a0"), Hex("#7a5a14"))
                    : ProceduralUI.Ring((int)Px(9f), Px(1f), Hex("#ffffff22"));
                LayoutElement pl = pip.AddComponent<LayoutElement>();
                pl.preferredWidth = Px(9f);
                pl.preferredHeight = Px(9f);
                pl.flexibleWidth = 0f;
            }
            Texte(col.transform, "ReserveLib", "RÉSERVE · " + ReserveLibelle(card.trust_budget_bucket),
                  Px(5.8f), Creme2, DesignTokens.Current.primaryFont, TextAlignmentOptions.Center);
        }

        /// <summary>Pis-aller d'affichage tant qu'aucune clé i18n n'est servie : on prend le
        /// segment porteur de la clé et on le rend lisible. Ce n'est PAS une traduction.</summary>
        private static string Lisible(string cle)
        {
            if (string.IsNullOrEmpty(cle)) return "";
            string[] parts = cle.Split('.');
            string dernier = parts.Length >= 2 && (parts[parts.Length - 1] == "descriptor" ||
                                                   parts[parts.Length - 1] == "reason")
                ? parts[parts.Length - 2]
                : parts[parts.Length - 1];
            dernier = dernier.Replace('_', ' ');
            return dernier.Length == 0 ? "" : char.ToUpperInvariant(dernier[0]) + dernier.Substring(1);
        }

        private static int ReservePastilles(string bucket)
        {
            switch (bucket)
            {
                case "high": return 3;
                case "normal": return 2;
                case "low": return 1;
                default: return 0;
            }
        }

        private static string ReserveLibelle(string bucket)
        {
            switch (bucket)
            {
                case "high": return "ÉLEVÉE";
                case "normal": return "NORMALE";
                case "low": return "FAIBLE";
                default: return "—";
            }
        }

        /// <summary>Jointure client sur `GET /v1/lieutenants` (`tenure_bucket`) — la maquette la
        /// pose explicitement comme faisable SANS lot back. Rendue vide tant que le roster n'est
        /// pas chargé : une chip absente vaut mieux qu'une chip inventée.</summary>
        private string AncienneteChip(string lieutenantId)
        {
            if (string.IsNullOrEmpty(lieutenantId) || roster == null) return null;
            foreach (RosterRow r in roster)
            {
                // ⛔ « new » N'EST PAS UNE VALEUR DE CE DOMAINE — je l'avais supposée par bon sens.
                // `bucketForStreak` (tenure-inertia.ts) ne rend que FRESH | ACCLIMATED | SEASONED |
                // SENIOR | ENTRENCHED. La comparaison était donc morte : le badge « NOUVELLE » ne
                // s'affichait JAMAIS, sur aucun lieutenant, et rien ne le signalait — un badge qui ne
                // s'allume pas ressemble à un badge dont la condition n'est pas remplie.
                if (r != null && r.lieutenant_id == lieutenantId && r.tenure_bucket == "FRESH") return "NOUVELLE";
            }
            return null;
        }

        private static TextMeshProUGUI Texte(Transform parent, string nom, string valeur, float taille,
            Color couleur, TMP_FontAsset police,
            TextAlignmentOptions alignement = TextAlignmentOptions.Left, bool etendre = false)
        {
            GameObject go = new GameObject(nom, typeof(RectTransform));
            go.transform.SetParent(parent, false);
            if (etendre)
            {
                RectTransform rt = (RectTransform)go.transform;
                rt.anchorMin = Vector2.zero; rt.anchorMax = Vector2.one;
                rt.offsetMin = Vector2.zero; rt.offsetMax = Vector2.zero;
            }
            TextMeshProUGUI t = go.AddComponent<TextMeshProUGUI>();
            t.font = police;
            t.fontSize = taille;
            t.color = couleur;
            t.text = valeur;
            t.alignment = alignement;
            t.enableWordWrapping = false;
            return t;
        }

        private static void Chip(Transform parent, string libelle, Color couleur)
        {
            GameObject go = new GameObject("Chip", typeof(RectTransform));
            go.transform.SetParent(parent, false);
            Image bord = go.AddComponent<Image>();
            bord.sprite = ProceduralUI.RoundedRectOutline((int)Px(7f), Px(1f), new Color(couleur.r, couleur.g, couleur.b, 0.35f));
            bord.type = Image.Type.Sliced;
            HorizontalLayoutGroup h = go.AddComponent<HorizontalLayoutGroup>();
            h.padding = new RectOffset((int)Px(5f), (int)Px(5f), (int)Px(1f), (int)Px(1f));
            h.childControlWidth = true;
            h.childControlHeight = true;
            h.childForceExpandWidth = false;
            h.childAlignment = TextAnchor.MiddleCenter;
            TextMeshProUGUI t = Texte(go.transform, "Lib", libelle, Px(6.3f), couleur,
                                      DesignTokens.Current.primaryFont, TextAlignmentOptions.Center);
            t.characterSpacing = 8f;
        }

        // --------------------------------------------------------------- UI build

        /// <summary>Le comptoir : les billets en haut, le registre, le tampon. `margin-top:auto`
        /// de la maquette devient un `childAlignment` bas — la scène est ancrée au zinc, pas au
        /// haut de l'écran, et c'est ce qui la fait lire comme un comptoir.</summary>
        private void BuildLayout()
        {
            RectTransform selfRt = GetComponent<RectTransform>();
            if (selfRt == null) selfRt = gameObject.AddComponent<RectTransform>();
            // Le shell donne son emplacement AVANT `Start()` : on s'y parente plutôt que de
            // découvrir un Canvas, sinon l'écran se monte à côté de la zone de contenu.
            if (mountParent != null)
            {
                transform.SetParent(mountParent, false);
                selfRt.anchorMin = Vector2.zero;
                selfRt.anchorMax = Vector2.one;
                selfRt.offsetMin = Vector2.zero;
                selfRt.offsetMax = Vector2.zero;
            }

            VerticalLayoutGroup vlg = gameObject.AddComponent<VerticalLayoutGroup>();
            // ⛔ SANS LES MARGES DE CHROME, LE PREMIER BILLET PASSE SOUS LA TOPBAR ET LE TAMPON SOUS
            // LA BARRE D'ONGLETS — mesuré sur la première capture lisible : les deux étaient à
            // moitié couverts. Le shell publie ses insets pour tout locataire (`ShellChrome`), et
            // ne pas les consommer est le défaut par défaut, pas un cas limite.
            vlg.padding = new RectOffset((int)Px(10f), (int)Px(10f),
                                         (int)ShellChrome.TopInsetPx + (int)Px(6f),
                                         (int)ShellChrome.BottomInsetPx + (int)Px(6f));
            vlg.spacing = Px(8f);
            vlg.childControlWidth = true;
            vlg.childControlHeight = true;
            vlg.childForceExpandWidth = true;
            vlg.childForceExpandHeight = false;
            vlg.childAlignment = TextAnchor.LowerCenter;

            GameObject rowsGo = new GameObject("FlagRows", typeof(RectTransform));
            rowsGo.transform.SetParent(transform, false);
            VerticalLayoutGroup rvlg = rowsGo.AddComponent<VerticalLayoutGroup>();
            rvlg.spacing = Px(8f);
            rvlg.childControlWidth = true;
            rvlg.childControlHeight = true;
            rvlg.childForceExpandWidth = true;
            rvlg.childForceExpandHeight = false;
            rowsRoot = (RectTransform)rowsGo.transform;

            GameObject emptyGo = new GameObject("EmptyState", typeof(RectTransform));
            emptyGo.transform.SetParent(transform, false);
            emptyStateText = emptyGo.AddComponent<TextMeshProUGUI>();
            emptyStateText.font = DesignTokens.Current.hudSerifFont;
            emptyStateText.fontSize = Px(11f);
            emptyStateText.color = Creme2;
            emptyStateText.alignment = TextAlignmentOptions.Center;
            emptyStateText.gameObject.SetActive(false);

            BuildRegistre();
            BuildTampon();
        }

        /// <summary>Le registre — un papier, pas un panneau : c'est le seul objet clair de l'écran,
        /// et c'est ce qui le fait lire comme un cahier posé sur le zinc.</summary>
        private void BuildRegistre()
        {
            GameObject reg = new GameObject("Registre", typeof(RectTransform));
            reg.transform.SetParent(transform, false);
            Image papier = reg.AddComponent<Image>();
            papier.sprite = ProceduralUI.VerticalGradient((int)Px(40f), PapierHaut, PapierBas);
            papier.type = Image.Type.Sliced;

            HorizontalLayoutGroup h = reg.AddComponent<HorizontalLayoutGroup>();
            h.padding = new RectOffset((int)Px(10f), (int)Px(10f), (int)Px(8f), (int)Px(8f));
            h.spacing = Px(8f);
            h.childControlWidth = true;
            h.childControlHeight = true;
            h.childForceExpandWidth = false;
            h.childAlignment = TextAnchor.MiddleLeft;

            GameObject pt = new GameObject("Pastille", typeof(RectTransform));
            pt.transform.SetParent(reg.transform, false);
            pt.AddComponent<Image>().sprite = ProceduralUI.RadialDisc((int)Px(10f), VertCachet, VertCachet);
            LayoutElement ptLe = pt.AddComponent<LayoutElement>();
            ptLe.preferredWidth = Px(10f);
            ptLe.preferredHeight = Px(10f);

            GameObject quoi = new GameObject("Quoi", typeof(RectTransform));
            quoi.transform.SetParent(reg.transform, false);
            VerticalLayoutGroup qv = quoi.AddComponent<VerticalLayoutGroup>();
            qv.childControlWidth = true;
            qv.childControlHeight = true;
            qv.childForceExpandWidth = true;
            qv.childForceExpandHeight = false;
            quoi.AddComponent<LayoutElement>().flexibleWidth = 1f;
            Texte(quoi.transform, "Titre", "La routine, tenue sans vous", Px(11.5f), EncrePapier,
                  DesignTokens.Current.hudSerifFont);
            Texte(quoi.transform, "Sous", "rien n'a dévié", Px(8f), EncrePapier2,
                  DesignTokens.Current.primaryFont);

            registreCompte = Texte(reg.transform, "Compte", "0", Px(18f), Rouge,
                                   DesignTokens.Current.hudSerifFont, TextAlignmentOptions.Right);
        }

        /// <summary>Le tampon — le MÊME geste que le jeton gardé : appui long. L'arbitrage JD-E5
        /// (ratifié) supprime la feuille de confirmation du canon : l'appui long EST la
        /// confirmation. Un tampon qu'on peut poser d'un doigt distrait ne serait pas un tampon.</summary>
        private void BuildTampon()
        {
            tamponRoot = new GameObject("Tampon", typeof(RectTransform));
            tamponRoot.transform.SetParent(transform, false);
            Image fond = tamponRoot.AddComponent<Image>();
            fond.sprite = ProceduralUI.RoundedRectOutline((int)Px(11f), Px(2f), Rouge);
            fond.type = Image.Type.Sliced;
            fond.color = Hex("#d9cca9");

            VerticalLayoutGroup v = tamponRoot.AddComponent<VerticalLayoutGroup>();
            v.padding = new RectOffset((int)Px(12f), (int)Px(12f), (int)Px(10f), (int)Px(10f));
            v.spacing = Px(2f);
            v.childControlWidth = true;
            v.childControlHeight = true;
            v.childForceExpandWidth = true;
            v.childForceExpandHeight = false;
            v.childAlignment = TextAnchor.MiddleCenter;

            tamponLibelle = Texte(tamponRoot.transform, "Libelle", "CONFIRMER LA ROUTINE", Px(12f),
                                  Rouge, DesignTokens.Current.primaryFont, TextAlignmentOptions.Center);
            tamponLibelle.characterSpacing = 22f;
            tamponLibelle.fontStyle = FontStyles.Bold;
            tamponSous = Texte(tamponRoot.transform, "Sous", "appui long", Px(8.5f), Rouge,
                               DesignTokens.Current.primaryFont, TextAlignmentOptions.Center);

            BatchConfirmButton = tamponRoot.AddComponent<LongPressButton>();
            BatchConfirmButton.OnLongPressCompleted += () => StartCoroutine(RequestBatchConfirm());
            tamponRoot.SetActive(false);
        }

        /// <summary>Jointure client — `tenure_bucket` par lieutenant, la maquette la pose comme
        /// faisable sans lot back. Non bloquante : si le roster ne répond pas, les chips
        /// disparaissent, l'écran reste lisible.</summary>
        public IEnumerator LoadRoster(string bearerToken)
        {
            EnsureInitialized();
            yield return new LieutenantClient { BaseUrl = baseUrl }
                .ListLieutenants(bearerToken, rows => roster = rows, (c, m) => { });
            if (LastLoadedReview != null) Render(LastLoadedReview.cards);
        }
    }
}
