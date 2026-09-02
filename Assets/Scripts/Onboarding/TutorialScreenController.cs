using System.Collections;
using UnityEngine;
using UnityEngine.UI;
using MafiaCleanCity.Shell;
using MafiaCleanCity.Theme;
using TMPro;

namespace MafiaCleanCity.Onboarding
{
    // ㉕ LA PREMIÈRE FOIS — l'overlay de découverte, et le droit de le refuser.
    //
    // MATIÈRE — les 3 routes de `tutorial-overlay.controller.ts`, sous `JwtAuthGuard`. Le MOTEUR
    // était déjà là : W1.1-b a livré `tutorial_state` et le résolveur d'éligibilité. Il ne
    // manquait que l'écran — c'est le seul du chantier dont le back attendait le front, et pas
    // l'inverse.
    //
    // ⛔ CE QUI DÉCIDE DE L'ÉCRAN : `PATCH /v1/ui/tutorial` EST LE SEUL ÉCRIVAIN de
    // `shown_tutorial_ids`. Un overlay qu'on ferme sans appeler cette route revient à CHAQUE
    // session, indéfiniment — le joueur croirait le jeu cassé, et rien dans le back ne le
    // signalerait. C'est donc la fermeture qui porte l'appel, jamais l'ouverture.
    //
    // ⛔ ET LE REFUS EST UN DROIT, PAS UN ÉCHEC. `tutorials_opt_out` est servi par une route à
    // part : il est offert dès le premier overlay, au même rang visuel que « continuer ». Le
    // cacher derrière trois écrans en ferait une option théorique.
    //
    // ⚠️ D10-h — LA COPY PRÉ-SEEDÉE DU CANON EST FAUSSE DÈS SA PREMIÈRE PHRASE (décision ouverte
    // au registre). Cet écran n'invente donc AUCUN texte de tutoriel : il affiche
    // l'IDENTIFIANT servi. C'est laid et c'est honnête — écrire une copy de remplacement ici la
    // figerait dans le client et enterrerait la décision que l'user doit prendre.
    //
    // ⚠️ Le 3ᵉ endpoint canon (`PATCH /v1/me/settings`) est ABSENT (S10-a) — non câblé.
    // ⛔ NON REVU — jalon 2026-09-05.
    public class TutorialScreenController : MonoBehaviour, IShellTenant
    {
        [Header("Backend")]
        [SerializeField] private string baseUrl = "http://localhost";

        public TutorielData Etat { get; private set; }
        public bool EtatVide { get; private set; }
        public string DerniereErreur { get; private set; }

        private const float K = 1280f / 300f;
        private static float Px(float cssPx) => cssPx * K;

        private static readonly Color Creme = Hex("#eae0c8");
        private static readonly Color Creme2 = Hex("#b9ad92");
        private static readonly Color Or = Hex("#d9ab4e");
        private static readonly Color Eteint = new Color(1f, 1f, 1f, 0.18f);

        private static Color Hex(string h)
        {
            ColorUtility.TryParseHtmlString(h, out Color c);
            return c;
        }

        private TutorialClient client;
        private string token;
        private bool initialise;
        private Transform mountParent;
        private RectTransform corps;
        private TextMeshProUGUI videTexte;

        private void Awake() => Init();

        private void Init()
        {
            if (initialise) return;
            initialise = true;
            client = new TutorialClient { BaseUrl = baseUrl };
            Construire();
        }

        public void SetMountParent(Transform parent)
        {
            mountParent = parent;
            Init();
            // ⛔ Sans ces quatre lignes le rect reste à 100x100 et l'écran ne dessine RIEN.
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
            Init();
            token = bearer;
            if (!string.IsNullOrEmpty(bearer)) StartCoroutine(Charger(bearer));
        }

        private IEnumerator Charger(string bearer)
        {
            yield return client.LireEtat(bearer, e => Etat = e,
                                         (c, m) => DerniereErreur = $"{c}: {m}");
            Rendre();
        }

        private void Rendre()
        {
            for (int i = corps.childCount - 1; i >= 0; i--)
                UnityEngine.Object.Destroy(corps.GetChild(i).gameObject);

            EtatVide = Etat == null;
            videTexte.gameObject.SetActive(EtatVide);
            if (EtatVide)
            {
                videTexte.text = DerniereErreur == null
                    ? "Rien à découvrir pour l'instant."
                    : "L'état du tutoriel n'a pas répondu.";
                return;
            }

            if (Etat.tutorials_opt_out)
            {
                Texte(corps, "Refus", "Vous avez demandé qu'on vous laisse tranquille.",
                      Px(11f), Creme2, DesignTokens.Current.hudSerifFont,
                      TextAlignmentOptions.Center).enableWordWrapping = true;
                Bouton("REVENIR SUR CE CHOIX", Or, () => StartCoroutine(Refuser(false)));
                return;
            }

            string suivant = Etat.next_tutorial_id;
            if (string.IsNullOrEmpty(suivant))
            {
                Texte(corps, "Fini", "Vous avez tout vu.", Px(13f), Creme,
                      DesignTokens.Current.hudSerifFont, TextAlignmentOptions.Center);
            }
            else
            {
                // ⚠️ On affiche l'IDENTIFIANT, pas une copy : la copy pré-seedée du canon est
                // fausse dès sa première phrase (D10-h). En inventer une la figerait ici.
                Texte(corps, "Titre2", "À DÉCOUVRIR", Px(7.5f), Eteint,
                      DesignTokens.Current.primaryFont, TextAlignmentOptions.Center)
                    .characterSpacing = 14f;
                Texte(corps, "Id", suivant, Px(14f), Or,
                      DesignTokens.Current.hudSerifFont, TextAlignmentOptions.Center)
                    .enableWordWrapping = true;
                Texte(corps, "Note", "⚠️ le texte de ce tutoriel n'est pas encore écrit — "
                      + "l'identifiant tient lieu de contenu", Px(6.8f), Creme2,
                      DesignTokens.Current.primaryFont, TextAlignmentOptions.Center)
                    .enableWordWrapping = true;
                string id = suivant;
                Bouton("J'AI COMPRIS", Or, () => StartCoroutine(MarquerVu(id)));
            }

            int vus = Etat.shown_tutorial_ids != null ? Etat.shown_tutorial_ids.Length : 0;
            int eligibles = Etat.eligible_tutorial_ids != null ? Etat.eligible_tutorial_ids.Length : 0;
            Texte(corps, "Compte", $"{vus} vu(s) · {eligibles} disponible(s)", Px(8f), Creme2,
                  DesignTokens.Current.primaryFont, TextAlignmentOptions.Center);

            // ★ le refus est un DROIT : au même rang que « continuer », jamais caché
            Bouton("NE PLUS RIEN ME MONTRER", Creme2, () => StartCoroutine(Refuser(true)));
        }

        private void Bouton(string libelle, Color teinte, UnityEngine.Events.UnityAction action)
        {
            GameObject b = Bloc("B_" + libelle, corps, false, Px(1f));
            var v = b.GetComponent<VerticalLayoutGroup>();
            v.childAlignment = TextAnchor.MiddleCenter;
            v.padding = new RectOffset((int)Px(8f), (int)Px(8f), (int)Px(7f), (int)Px(7f));
            Image bf = b.AddComponent<Image>();
            bf.sprite = ProceduralUI.RoundedRectOutline((int)Px(9f), Px(1f), teinte);
            bf.type = Image.Type.Sliced;
            Texte(b.transform, "L", libelle, Px(9f), teinte,
                  DesignTokens.Current.primaryFont, TextAlignmentOptions.Center).characterSpacing = 12f;
            b.AddComponent<Button>().onClick.AddListener(action);
        }

        /// <summary>⛔ Le SEUL écrivain de `shown_tutorial_ids`. Sans cet appel, le même overlay
        /// revient à chaque session pour toujours.</summary>
        private IEnumerator MarquerVu(string tutorialId)
        {
            if (string.IsNullOrEmpty(token)) yield break;
            yield return client.MarquerVu(tutorialId, token, () => { },
                                          (c, m) => DerniereErreur = $"marquage {c}: {m}");
            yield return Charger(token);
        }

        private IEnumerator Refuser(bool refus)
        {
            if (string.IsNullOrEmpty(token)) yield break;
            yield return client.DefinirRefus(refus, token, _ => { },
                                             (c, m) => DerniereErreur = $"refus {c}: {m}");
            yield return Charger(token);
        }

        private void Construire()
        {
            RectTransform selfRt = GetComponent<RectTransform>();
            if (selfRt == null) selfRt = gameObject.AddComponent<RectTransform>();

            Image voile = gameObject.AddComponent<Image>();
            voile.color = DesignTokens.Current.surfaceBase;
            voile.raycastTarget = true;

            VerticalLayoutGroup v = gameObject.AddComponent<VerticalLayoutGroup>();
            v.padding = new RectOffset((int)Px(14f), (int)Px(14f),
                                       (int)ShellChrome.TopInsetPx + (int)Px(10f),
                                       (int)ShellChrome.BottomInsetPx + (int)Px(10f));
            v.spacing = Px(10f);
            v.childControlWidth = true;
            v.childControlHeight = true;
            v.childForceExpandWidth = true;
            v.childForceExpandHeight = false;
            v.childAlignment = TextAnchor.MiddleCenter;

            TextMeshProUGUI titre = Texte(transform, "Titre", "LA PREMIÈRE FOIS", Px(13f), Or,
                                          DesignTokens.Current.hudSerifFont, TextAlignmentOptions.Center);
            titre.characterSpacing = 18f;

            GameObject c = Bloc("Corps", transform, false, Px(9f));
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
