using System.Collections;
using UnityEngine;
using UnityEngine.UI;
using MafiaCleanCity.Theme;
using TMPro;

namespace MafiaCleanCity.Shell
{
    // ⑤ `screen_1a` — « LA DÉCISION DU JOUR », la carte distribuée sur le zinc.
    //
    // Référence RATIFIÉE par l'user (« ok top on garde comme ça », 2026-08-26) : série 4,
    // `ecrans-brennar-4.html` cadres 4-8. La scène : une carte se détache du sabot et se pose sur
    // le comptoir. Le coin ♦ dit si elle est TACTIQUE ou STRUCTURELLE ; deux bandes de pips disent
    // sa portée (`impact_bucket`) et son urgence (`urgency_bucket`) ; le jeton à droite est votre
    // décision structurelle de la session (`structural_budget`). Deux gestes : « les lire
    // maintenant » (appui long — `commit`) ou « laisser sur le zinc » (`skip`).
    //
    // ⛔ CE QUE CET ÉCRAN NE PEUT PAS FAIRE, ET POURQUOI IL NE LE PROMET PAS :
    // · IL N'EXISTE AUCUN `GET` UNITAIRE DE CARTE HL. Elle n'est servie que dans la clé `hl_card`
    //   de `session/open`. L'écran affiche donc ce que L'OUVERTURE lui a donné — il ne recharge
    //   pas, il ne rafraîchit pas. Prétendre le contraire demanderait un lot back (`front.md` S11-a).
    // · `recall-preview` prévisualise le RECALL, pas la GRADUATION (S11-b) : un écran qui
    //   promettrait un aperçu de graduation promettrait ce qui n'existe pas. Il n'y en a pas ici.
    //
    // ⇒ NI CLIENT NI DTO NEUFS. `HlCardClient` sert déjà `/commit` et `/skip`, `HlCardDto` porte les
    // six clés que la maquette dessine. Générer un client de plus aurait dupliqué une couture
    // existante — l'erreur qui a coûté trois lancements Unity sur l'écran ⑯.
    //
    // ÉCHELLE : maquette de 300 px CSS, canvas du shell de 1280 unités ⇒ ×4,2667.
    // ⛔ NON REVU — jalon 2026-09-05 (régime full prod).
    public class DecisionDetailScreenController : MonoBehaviour, IShellTenant
    {
        [Header("Backend")]
        [SerializeField] private string baseUrl = "http://localhost";

        // ---- sondes de test ---------------------------------------------------
        public HlCardDto CarteAffichee { get; private set; }
        public bool EtatSabot { get; private set; }
        public int CommitCount { get; private set; }
        public int SkipCount { get; private set; }
        public string DerniereErreur { get; private set; }
        public LongPressButton BoutonLire { get; private set; }

        private const float K = 1280f / 300f;
        private static float Px(float cssPx) => cssPx * K;

        private static readonly Color Creme = Hex("#eae0c8");
        private static readonly Color Creme2 = Hex("#b9ad92");
        private static readonly Color Or = Hex("#d9ab4e");
        private static readonly Color OrVif = Hex("#f2c96b");
        private static readonly Color Rouge = Hex("#93402c");

        private static Color Hex(string h)
        {
            ColorUtility.TryParseHtmlString(h, out Color c);
            return c;
        }

        private HlCardClient client;
        private string token;
        private bool initialise;
        private Transform mountParent;

        private RectTransform carteRoot;
        private TextMeshProUGUI coinLibelle, titre, noteZinc, jetonChiffre, jetonEtat;
        private RectTransform pipsPortee, pipsUrgence;
        private TextMeshProUGUI porteeLibelle, urgenceLibelle, sabotTexte;
        private GameObject filet, tampon;

        private void Awake() => Init();

        private void Init()
        {
            if (initialise) return;
            initialise = true;
            client = new HlCardClient { BaseUrl = baseUrl };
            Construire();
        }

        /// <summary>Le shell donne son emplacement AVANT `Start()`. Le parentage vit ICI et pas
        /// dans la construction : sur l'écran ⑯, le faire dans `Awake()` laissait la racine à une
        /// largeur NULLE — rien ne lève, tout déborde au centre, et ça ressemble à un défaut de
        /// mise en page.</summary>
        public void SetMountParent(Transform parent)
        {
            mountParent = parent;
            Init();
            if (parent == null) return;
            transform.SetParent(parent, false);
            RectTransform rt = (RectTransform)transform;
            rt.anchorMin = Vector2.zero;
            rt.anchorMax = Vector2.one;
            rt.offsetMin = Vector2.zero;
            rt.offsetMax = Vector2.zero;
        }

        public void SetToken(string bearer)
        {
            Init();
            token = bearer;
            // La carte n'a pas de route à elle : on lit celle que le shell a déjà reçue à
            // l'ouverture. C'est la limite S11-a, respectée telle quelle.
            AppShell shell = FindFirstObjectByType<AppShell>();
            if (shell != null && shell.LastSessionOpen != null)
                Afficher(shell.LastSessionOpen.hl_card, shell.LastSessionOpen.structural_budget);
            else
                Afficher(null, null);
        }

        public void Afficher(HlCardDto carte, StructuralBudgetDto budget)
        {
            Init();
            CarteAffichee = carte;
            EtatSabot = carte == null;

            // « LE SABOT » — `hl_card: null`. Le back rend null honnêtement là où le canon disait
            // « non applicable » (arbitrage JD-E4, canon re-basé). Ce n'est pas une erreur : c'est
            // qu'aucune carte ne se détache aujourd'hui, et l'écran le dit dans ces mots.
            carteRoot.gameObject.SetActive(carte != null);
            sabotTexte.gameObject.SetActive(carte == null);
            filet.SetActive(carte != null);
            tampon.SetActive(carte != null);
            if (carte == null) return;

            bool structurelle = carte.structural;
            coinLibelle.text = structurelle ? "structurelle" : "tactique";
            titre.text = Lisible(carte.decision_type_key);
            noteZinc.text = structurelle
                ? "Structurelle — trancher consomme votre décision de la session."
                : "Tactique — trancher ne touche pas à votre décision structurelle.";

            RemplirPips(pipsPortee, porteeLibelle, carte.impact_bucket);
            RemplirPips(pipsUrgence, urgenceLibelle, carte.urgency_bucket);

            // Le jeton : la décision structurelle de la session. `used`/`cap_reached` sont les deux
            // seules clés servies — on n'invente ni total ni reste.
            bool pris = budget != null && budget.cap_reached;
            jetonChiffre.text = pris ? "0" : "1";
            jetonEtat.text = pris ? "pris" : "libre";
            jetonEtat.color = pris ? Creme2 : OrVif;
        }

        private static void RemplirPips(RectTransform hote, TextMeshProUGUI libelle, string bucket)
        {
            int n = bucket == "high" ? 3 : bucket == "moderate" || bucket == "medium" ? 2 : bucket == "low" ? 1 : 0;
            for (int i = 0; i < hote.childCount; i++)
            {
                Image img = hote.GetChild(i).GetComponent<Image>();
                if (img != null) img.color = i < n ? Or : new Color(1f, 1f, 1f, 0.12f);
            }
            libelle.text = bucket == "high" ? "élevée"
                         : bucket == "moderate" || bucket == "medium" ? "modérée"
                         : bucket == "low" ? "faible" : "—";
        }

        /// <summary>Pis-aller tant qu'aucune clé i18n n'est servie par ce back (178 référencées,
        /// 0 servie — mesuré au socle). Ce n'est PAS une traduction : le jour où le bundle arrive,
        /// c'est cette fonction qu'on remplace, pas la mise en page.</summary>
        private static string Lisible(string cle)
        {
            if (string.IsNullOrEmpty(cle)) return "";
            string[] p = cle.Split('.');
            string d = p[p.Length - 1].Replace('_', ' ');
            return d.Length == 0 ? "" : char.ToUpperInvariant(d[0]) + d.Substring(1);
        }

        public IEnumerator Commit()
        {
            Init();
            if (CarteAffichee == null) yield break;
            CommitCount++;
            DerniereErreur = null;
            yield return client.Commit(token, CarteAffichee.card_id, dto => { },
                                       (c, m) => DerniereErreur = $"{c}: {m}");
        }

        public IEnumerator Skip()
        {
            Init();
            if (CarteAffichee == null) yield break;
            SkipCount++;
            DerniereErreur = null;
            yield return client.Skip(token, CarteAffichee.card_id, dto => { },
                                     (c, m) => DerniereErreur = $"{c}: {m}");
        }

        // --------------------------------------------------------------- construction

        /// <summary>Le comptoir : la carte au centre avec son jeton, la note, le filet « laisser
        /// sur le zinc », le tampon. Ancré EN BAS comme la maquette (`margin-top:auto`) — c'est ce
        /// qui fait lire la scène comme un zinc et pas comme une page.</summary>
        private void Construire()
        {
            RectTransform selfRt = GetComponent<RectTransform>();
            if (selfRt == null) selfRt = gameObject.AddComponent<RectTransform>();

            VerticalLayoutGroup vlg = gameObject.AddComponent<VerticalLayoutGroup>();
            vlg.padding = new RectOffset((int)Px(10f), (int)Px(10f),
                                         (int)ShellChrome.TopInsetPx + (int)Px(6f),
                                         (int)ShellChrome.BottomInsetPx + (int)Px(6f));
            vlg.spacing = Px(8f);
            vlg.childControlWidth = true;
            vlg.childControlHeight = true;
            vlg.childForceExpandWidth = true;
            vlg.childForceExpandHeight = false;
            vlg.childAlignment = TextAnchor.LowerCenter;

            // ── la table de jeu : la carte + le jeton structurel, côte à côte ────────────────
            GameObject table = Bloc("TableDeJeu", transform, horizontal: true, espace: Px(8f));
            table.GetComponent<HorizontalLayoutGroup>().childAlignment = TextAnchor.LowerLeft;

            GameObject carte = Bloc("CarteDuJour", table.transform, horizontal: false, espace: Px(4f));
            carteRoot = (RectTransform)carte.transform;
            Image fond = carte.AddComponent<Image>();
            fond.sprite = ProceduralUI.RoundedRectOutline((int)Px(14f), Px(1.5f), Hex("#d9ab4e55"));
            fond.type = Image.Type.Sliced;
            VerticalLayoutGroup cv = carte.GetComponent<VerticalLayoutGroup>();
            cv.padding = new RectOffset((int)Px(12f), (int)Px(12f), (int)Px(10f), (int)Px(12f));
            carte.AddComponent<LayoutElement>().flexibleWidth = 1f;

            GameObject coin = Bloc("Coin", carte.transform, horizontal: true, espace: Px(4f));
            coin.GetComponent<HorizontalLayoutGroup>().childForceExpandWidth = false;
            Texte(coin.transform, "Cachet", "♦", Px(13f), Or, DesignTokens.Current.primaryFont);
            coinLibelle = Texte(coin.transform, "Nature", "tactique", Px(7.5f), Creme2,
                                DesignTokens.Current.primaryFont);
            coinLibelle.characterSpacing = 12f;

            TextMeshProUGUI kicker = Texte(carte.transform, "Kicker", "CE QUI PÈSE LE PLUS AUJOURD'HUI",
                                           Px(7.5f), Creme2, DesignTokens.Current.primaryFont);
            kicker.characterSpacing = 14f;

            titre = Texte(carte.transform, "Titre", "", Px(15f), Creme,
                          DesignTokens.Current.hudSerifFont);
            titre.enableWordWrapping = true;
            titre.GetComponent<LayoutElement>().preferredWidth = 0f;

            pipsPortee = BandeDePips(carte.transform, "Portée", out porteeLibelle);
            pipsUrgence = BandeDePips(carte.transform, "Urgence", out urgenceLibelle);

            // ── le jeton structurel ──────────────────────────────────────────────────────────
            GameObject colonne = Bloc("JetonStruct", table.transform, horizontal: false, espace: Px(1f));
            colonne.GetComponent<VerticalLayoutGroup>().childAlignment = TextAnchor.MiddleCenter;
            colonne.GetComponent<VerticalLayoutGroup>().childForceExpandWidth = false;
            LayoutElement colLe = colonne.AddComponent<LayoutElement>();
            colLe.preferredWidth = Px(62f);
            colLe.flexibleWidth = 0f;

            GameObject jeton = new GameObject("Jeton", typeof(RectTransform));
            jeton.transform.SetParent(colonne.transform, false);
            jeton.AddComponent<Image>().sprite =
                ProceduralUI.RadialDisc((int)Px(40f), Hex("#f2d9a0"), Hex("#7a5a14"));
            LayoutElement jl = jeton.AddComponent<LayoutElement>();
            jl.preferredWidth = Px(40f);
            jl.preferredHeight = Px(40f);
            jl.flexibleWidth = 0f;
            jetonChiffre = Texte(jeton.transform, "Chiffre", "1", Px(13f), Hex("#3a2a12"),
                                 DesignTokens.Current.primaryFont, TextAlignmentOptions.Center, true);
            jetonEtat = Texte(colonne.transform, "Etat", "libre", Px(7.5f), OrVif,
                              DesignTokens.Current.primaryFont, TextAlignmentOptions.Center);
            Texte(colonne.transform, "Sous", "votre décision structurelle de la session", Px(6.3f),
                  Creme2, DesignTokens.Current.primaryFont, TextAlignmentOptions.Center)
                .enableWordWrapping = true;

            // ── l'état SABOT : aucune carte ne se détache ────────────────────────────────────
            sabotTexte = Texte(transform, "Sabot",
                               "Rien ne se détache du sabot ce matin.", Px(11f), Creme2,
                               DesignTokens.Current.hudSerifFont, TextAlignmentOptions.Center);
            sabotTexte.gameObject.SetActive(false);

            noteZinc = Texte(transform, "NoteZinc", "", Px(8f), Creme2,
                             DesignTokens.Current.primaryFont, TextAlignmentOptions.Center);
            noteZinc.enableWordWrapping = true;

            // ── « laisser sur le zinc » = skip. Un geste simple : la carte revient. ───────────
            filet = Bloc("Filet", transform, horizontal: false, espace: Px(1f));
            filet.GetComponent<VerticalLayoutGroup>().childAlignment = TextAnchor.MiddleCenter;
            filet.GetComponent<VerticalLayoutGroup>().padding =
                new RectOffset((int)Px(10f), (int)Px(10f), (int)Px(7f), (int)Px(7f));
            Image filetFond = filet.AddComponent<Image>();
            filetFond.sprite = ProceduralUI.RoundedRectDashedOutline((int)Px(10f), Px(1f), (int)Px(4f), (int)Px(3f), Hex("#ffffff22"));
            filetFond.type = Image.Type.Sliced;
            Texte(filet.transform, "Lib", "Laisser sur le zinc", Px(10f), Creme,
                  DesignTokens.Current.hudSerifFont, TextAlignmentOptions.Center);
            Texte(filet.transform, "Sous", "elle revient à la prochaine session, au même rang",
                  Px(6.8f), Creme2, DesignTokens.Current.primaryFont, TextAlignmentOptions.Center);
            Button skip = filet.AddComponent<Button>();
            skip.targetGraphic = filetFond;
            skip.onClick.AddListener(() => StartCoroutine(Skip()));

            // ── le tampon = commit, à APPUI LONG. Même geste que le tampon de la Revue : ce qui
            //    est irréversible ne se déclenche pas d'un doigt distrait. ──────────────────────
            tampon = Bloc("Tampon", transform, horizontal: false, espace: Px(2f));
            tampon.GetComponent<VerticalLayoutGroup>().childAlignment = TextAnchor.MiddleCenter;
            tampon.GetComponent<VerticalLayoutGroup>().padding =
                new RectOffset((int)Px(12f), (int)Px(12f), (int)Px(10f), (int)Px(10f));
            Image tf = tampon.AddComponent<Image>();
            tf.sprite = ProceduralUI.RoundedRectOutline((int)Px(11f), Px(2f), Rouge);
            tf.type = Image.Type.Sliced;
            tf.color = Hex("#d9cca9");
            TextMeshProUGUI lib = Texte(tampon.transform, "Lib", "LES LIRE MAINTENANT", Px(12f),
                                        Rouge, DesignTokens.Current.primaryFont, TextAlignmentOptions.Center);
            lib.characterSpacing = 20f;
            lib.fontStyle = FontStyles.Bold;
            Texte(tampon.transform, "Sous",
                  "appui long — la carte est tranchée ; le sujet, lui, reste à traiter",
                  Px(8.5f), Rouge, DesignTokens.Current.primaryFont, TextAlignmentOptions.Center)
                .enableWordWrapping = true;
            BoutonLire = tampon.AddComponent<LongPressButton>();
            BoutonLire.OnLongPressCompleted += () => StartCoroutine(Commit());
        }

        private RectTransform BandeDePips(Transform parent, string nom, out TextMeshProUGUI libelle)
        {
            GameObject bande = Bloc("Bande" + nom, parent, horizontal: true, espace: Px(6f));
            bande.GetComponent<HorizontalLayoutGroup>().childForceExpandWidth = false;
            bande.GetComponent<HorizontalLayoutGroup>().childAlignment = TextAnchor.MiddleLeft;
            Texte(bande.transform, "Lib", nom, Px(7.5f), Creme2, DesignTokens.Current.primaryFont);

            GameObject pips = Bloc("Pips", bande.transform, horizontal: true, espace: Px(3f));
            pips.GetComponent<HorizontalLayoutGroup>().childForceExpandWidth = false;
            for (int i = 0; i < 3; i++)
            {
                GameObject pip = new GameObject("Pip" + i, typeof(RectTransform));
                pip.transform.SetParent(pips.transform, false);
                pip.AddComponent<Image>().sprite = ProceduralUI.RadialDisc((int)Px(7f), Color.white, Color.white);
                LayoutElement pl = pip.AddComponent<LayoutElement>();
                pl.preferredWidth = Px(7f);
                pl.preferredHeight = Px(7f);
                pl.flexibleWidth = 0f;
            }
            libelle = Texte(bande.transform, "Val", "—", Px(7.5f), Creme, DesignTokens.Current.primaryFont);
            return (RectTransform)pips.transform;
        }

        private static GameObject Bloc(string nom, Transform parent, bool horizontal, float espace)
        {
            GameObject go = new GameObject(nom, typeof(RectTransform));
            go.transform.SetParent(parent, false);
            HorizontalOrVerticalLayoutGroup g = horizontal
                ? (HorizontalOrVerticalLayoutGroup)go.AddComponent<HorizontalLayoutGroup>()
                : go.AddComponent<VerticalLayoutGroup>();
            g.spacing = espace;
            g.childControlWidth = true;
            g.childControlHeight = true;
            g.childForceExpandWidth = true;
            g.childForceExpandHeight = false;
            return go;
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
            go.AddComponent<LayoutElement>();
            return t;
        }
    }
}
