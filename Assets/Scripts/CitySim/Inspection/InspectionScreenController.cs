using System.Collections;
using UnityEngine;
using UnityEngine.UI;
using MafiaCleanCity.Shell;
using MafiaCleanCity.Theme;
using TMPro;

namespace MafiaCleanCity.CitySim.Inspection
{
    // ⑮ LA FILE D'INSPECTION — la charge de la file, le régime du répartiteur, la forme de la
    // distribution, et le dépôt de rapport avec son retour de bâton.
    //
    // MATIÈRE — les 2 routes joueur d'`inspection.controller.ts`, sous `JwtAuthGuard`.
    //
    // ⛔ CE QUI DÉCIDE DE L'ÉCRAN : LE BACK NE SERT QUE DES BANDES, JAMAIS DES COMPTES, ET C'EST
    // ÉCRIT DANS SES PROPRES COMMENTAIRES — « the qualitative queue-load band (the only load
    // signal — never the exact length / cap ratio) », « the distribution SHAPE, never raw counts
    // (Inv 4) ». Un écran qui afficherait « 7 inspections en attente » inventerait une précision
    // que la projection refuse délibérément de donner. On dessine donc des FORMES : des barres de
    // présence à quatre paliers, jamais un nombre.
    //
    // ⛔ S12-a — LE BACK EST SCOPÉ DISTRICT, LE CANON VOULAIT UN AGRÉGAT JOUEUR. Aucune route ne
    // rend la file de tous les districts ; l'agrégat coûterait 18 appels. Cet écran interroge UN
    // district et le dit dans son titre. *Mieux vaut un écran honnête sur un district qu'un
    // agrégat qu'aucune route ne peut fournir.*
    //
    // ★★ S12-b — LE RETOUR DE BÂTON N'EST PAS UNE ROUTE, c'est `backlash_triggered` dans la
    // réponse au dépôt de rapport. Il n'est visible QU'À CET INSTANT : aucune route ne permet de
    // le relire. Le rater, c'est le perdre — l'écran le fige donc à l'écran jusqu'au prochain
    // geste, au lieu de le laisser filer dans un rafraîchissement.
    //
    // ⚠️ S12-d — la route rend 404 sur compte neuf. Traité comme un ÉTAT (« ce district n'a pas
    // encore de file »), pas comme une panne : sur un compte de démo qui n'a jamais vécu de tick
    // NIGHTLY, c'est le cas NORMAL, et l'annoncer comme une erreur ferait accuser le réseau.
    //
    // ⚠️ MAQUETTE série 6 (cadres 31-35) en jugement, non ratifiée au 2026-09-02.
    // ⛔ NON REVU — jalon 2026-09-05.
    public class InspectionScreenController : MonoBehaviour, IShellTenant
    {
        [Header("Backend")]
        [SerializeField] private string baseUrl = "http://localhost";
        [Header("Cible")]
        [Tooltip("Le back est scopé DISTRICT : cet écran en montre UN.")]
        [SerializeField] private int districtId = 1;

        public FileData File { get; private set; }
        public RapportData DernierRapport { get; private set; }
        public bool EtatVide { get; private set; }
        public string DerniereErreur { get; private set; }

        private const float K = 1280f / 300f;
        private static float Px(float cssPx) => cssPx * K;

        private static readonly Color Creme = Hex("#eae0c8");
        private static readonly Color Creme2 = Hex("#b9ad92");
        private static readonly Color Or = Hex("#d9ab4e");
        private static readonly Color Braise = Hex("#e0664a");
        private static readonly Color Eteint = new Color(1f, 1f, 1f, 0.18f);

        private static Color Hex(string h)
        {
            ColorUtility.TryParseHtmlString(h, out Color c);
            return c;
        }

        private InspectionClient client;
        private string token;
        private bool initialise;
        private Transform mountParent;
        private RectTransform corps;
        private TextMeshProUGUI sousTitre;
        private TextMeshProUGUI batonTexte;
        private TextMeshProUGUI videTexte;

        private void Awake() => Init();

        private void Init()
        {
            if (initialise) return;
            initialise = true;
            client = new InspectionClient { BaseUrl = baseUrl };
            Construire();
        }

        public void SetMountParent(Transform parent)
        {
            mountParent = parent;
            Init();
            // ⛔ Sans ces quatre lignes le rect reste à 100x100 et l'écran ne dessine RIEN, sans
            // erreur console (mesuré sur ㉟ le 2026-09-02, capture à l'appui).
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
            if (!string.IsNullOrEmpty(bearer)) StartCoroutine(Charger(bearer));
        }

        private IEnumerator Charger(string bearer)
        {
            yield return client.LireFile(districtId, bearer, f => File = f,
                                         (c, m) => DerniereErreur = c == 404 ? null : $"{c}: {m}");
            Rendre();
        }

        private void Rendre()
        {
            for (int i = corps.childCount - 1; i >= 0; i--)
                UnityEngine.Object.Destroy(corps.GetChild(i).gameObject);

            EtatVide = File == null;
            videTexte.gameObject.SetActive(EtatVide);
            if (EtatVide)
            {
                // ⚠️ 404 = « pas encore de file », pas « panne ». Les confondre ferait accuser le
                // réseau sur un compte qui n'a simplement jamais vécu de tick.
                videTexte.text = DerniereErreur == null
                    ? "Ce district n'a pas encore de file d'inspection."
                    : "La file n'a pas répondu.";
                sousTitre.text = $"district {districtId}";
                return;
            }

            sousTitre.text = $"district {File.district} · {Lisible(File.dispatcher_regime)}";
            sousTitre.color = File.dispatcher_regime == "SURGE"
                           || File.dispatcher_regime == "BACKLOGGED" ? Braise : Creme2;

            // la charge : cinq crans, parce que les paliers du back sont cinq et DISCRETS
            Crans(corps, "Charge", File.queue_load, 5, ChargeRang(File.queue_load));

            Section(corps, "PAR GRAVITÉ");
            if (File.severity_distribution != null)
            {
                Bande("Critique", File.severity_distribution.critical, Braise);
                Bande("Urgent", File.severity_distribution.urgent, Or);
                Bande("Sous l'œil", File.severity_distribution.watching, Creme);
                Bande("Silencieux", File.severity_distribution.silent, Creme2);
            }

            Section(corps, "PAR PROVENANCE");
            if (File.type_distribution != null)
            {
                Bande("Programmée", File.type_distribution.SCHEDULED, Creme2);
                Bande("Indicateur", File.type_distribution.INFORMANT, Creme);
                Bande("Faux rapport", File.type_distribution.FALSE_REPORT, Braise);
                Bande("Rapport fondé", File.type_distribution.GENUINE_REPORT, Or);
                Bande("Cascade", File.type_distribution.CASCADE, Creme2);
                Bande("Médico-légal", File.type_distribution.FORENSIC, Creme2);
            }
        }

        private void Section(Transform parent, string titre)
        {
            Texte(parent, "S_" + titre, titre, Px(7.5f), Eteint,
                  DesignTokens.Current.primaryFont).characterSpacing = 14f;
        }

        /// <summary>Une bande de PRÉSENCE à quatre paliers — jamais un compte. Le back refuse
        /// délibérément de donner les nombres ; les inventer serait mentir sur la précision.</summary>
        private void Bande(string libelle, string bande, Color teinte)
        {
            int r = BandeRang(bande);
            GameObject l = Bloc("B_" + libelle, corps, true, Px(5f));
            var h = l.GetComponent<HorizontalLayoutGroup>();
            h.childForceExpandWidth = false;
            h.childAlignment = TextAnchor.MiddleLeft;

            TextMeshProUGUI lib = Texte(l.transform, "Lib", libelle, Px(8.5f),
                                        r == 0 ? Eteint : Creme, DesignTokens.Current.primaryFont);
            lib.GetComponent<LayoutElement>().preferredWidth = Px(64f);
            lib.GetComponent<LayoutElement>().flexibleWidth = 0f;

            GameObject g = Bloc("Paliers", l.transform, true, Px(2f));
            g.GetComponent<HorizontalLayoutGroup>().childForceExpandWidth = false;
            for (int i = 0; i < 3; i++)
            {
                GameObject c = new GameObject("P" + i, typeof(RectTransform));
                c.transform.SetParent(g.transform, false);
                Image im = c.AddComponent<Image>();
                im.sprite = ProceduralUI.RoundedRectOutline((int)Px(2f), Px(1f), i < r ? teinte : Eteint);
                im.type = Image.Type.Sliced;
                im.color = i < r ? teinte : Eteint;
                LayoutElement le = c.AddComponent<LayoutElement>();
                le.preferredWidth = Px(16f); le.preferredHeight = Px(7f); le.flexibleWidth = 0f;
            }
            Texte(l.transform, "Val", Lisible(bande), Px(7f), r == 0 ? Eteint : Creme2,
                  DesignTokens.Current.primaryFont);
        }

        private void Crans(Transform parent, string nom, string bande, int total, int allumes)
        {
            GameObject l = Bloc(nom, parent, true, Px(5f));
            var h = l.GetComponent<HorizontalLayoutGroup>();
            h.childForceExpandWidth = false;
            h.childAlignment = TextAnchor.MiddleLeft;
            Texte(l.transform, "Lib", nom, Px(8.5f), Creme2, DesignTokens.Current.primaryFont);
            GameObject g = Bloc("Crans", l.transform, true, Px(2f));
            g.GetComponent<HorizontalLayoutGroup>().childForceExpandWidth = false;
            for (int i = 0; i < total; i++)
            {
                GameObject c = new GameObject("C" + i, typeof(RectTransform));
                c.transform.SetParent(g.transform, false);
                Image im = c.AddComponent<Image>();
                Color t = allumes >= 4 ? Braise : Or;
                im.sprite = ProceduralUI.RoundedRectOutline((int)Px(2f), Px(1f), i < allumes ? t : Eteint);
                im.type = Image.Type.Sliced;
                im.color = i < allumes ? t : Eteint;
                LayoutElement le = c.AddComponent<LayoutElement>();
                le.preferredWidth = Px(11f); le.preferredHeight = Px(8f); le.flexibleWidth = 0f;
            }
            Texte(l.transform, "Val", Lisible(bande), Px(7f), Creme, DesignTokens.Current.primaryFont);
        }

        private static int ChargeRang(string b) =>
            b == "SATURATED" ? 5 : b == "HEAVY" ? 4 : b == "MODERATE" ? 3 : b == "LIGHT" ? 2 : 0;

        private static int BandeRang(string b) =>
            b == "PREDOMINANT" ? 3 : b == "MANY" ? 2 : b == "SOME" ? 1 : 0;

        private static string Lisible(string v)
        {
            if (string.IsNullOrEmpty(v)) return "—";
            string d = v.Replace('_', ' ').ToLowerInvariant();
            return char.ToUpperInvariant(d[0]) + d.Substring(1);
        }

        private void Construire()
        {
            RectTransform selfRt = GetComponent<RectTransform>();
            if (selfRt == null) selfRt = gameObject.AddComponent<RectTransform>();

            Image voile = gameObject.AddComponent<Image>();
            voile.color = DesignTokens.Current.surfaceBase;
            voile.raycastTarget = true;

            VerticalLayoutGroup v = gameObject.AddComponent<VerticalLayoutGroup>();
            v.padding = new RectOffset((int)Px(10f), (int)Px(10f),
                                       (int)ShellChrome.TopInsetPx + (int)Px(8f),
                                       (int)ShellChrome.BottomInsetPx + (int)Px(8f));
            v.spacing = Px(7f);
            v.childControlWidth = true;
            v.childControlHeight = true;
            v.childForceExpandWidth = true;
            v.childForceExpandHeight = false;
            v.childAlignment = TextAnchor.UpperCenter;

            TextMeshProUGUI titre = Texte(transform, "Titre", "LES INSPECTIONS", Px(13f), Or,
                                          DesignTokens.Current.hudSerifFont, TextAlignmentOptions.Center);
            titre.characterSpacing = 18f;

            sousTitre = Texte(transform, "Sous", $"district {districtId}", Px(8.5f), Creme2,
                              DesignTokens.Current.primaryFont, TextAlignmentOptions.Center);

            // ★ le retour de bâton : figé jusqu'au prochain geste, parce qu'aucune route ne
            // permet de le relire une fois passé.
            batonTexte = Texte(transform, "Baton", "", Px(9f), Braise,
                               DesignTokens.Current.primaryFont, TextAlignmentOptions.Center);
            batonTexte.enableWordWrapping = true;
            batonTexte.gameObject.SetActive(false);

            GameObject c = Bloc("Corps", transform, false, Px(6f));
            corps = (RectTransform)c.transform;

            videTexte = Texte(transform, "Vide", "", Px(11f), Creme2,
                              DesignTokens.Current.hudSerifFont, TextAlignmentOptions.Center);
            videTexte.enableWordWrapping = true;
            videTexte.gameObject.SetActive(false);
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
            Color couleur, TMP_FontAsset police, TextAlignmentOptions alignement = TextAlignmentOptions.Left)
        {
            GameObject go = new GameObject(nom, typeof(RectTransform));
            go.transform.SetParent(parent, false);
            TextMeshProUGUI t = go.AddComponent<TextMeshProUGUI>();
            t.font = police;
            t.fontSize = taille;
            t.color = couleur;
            t.text = valeur;
            t.alignment = alignement;
            t.enableWordWrapping = false;
            LayoutElement le = go.AddComponent<LayoutElement>();
            le.preferredWidth = 0f;
            le.flexibleWidth = 1f;
            return t;
        }
    }
}
