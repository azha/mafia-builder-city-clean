using System.Collections;
using UnityEngine;
using UnityEngine.UI;
using MafiaCleanCity.Shell;
using MafiaCleanCity.Theme;
using MafiaCleanCity.Account.Profile;
using TMPro;

namespace MafiaCleanCity.Account.Settings
{
    // ⑲ LES RÉGLAGES — la langue, et rien d'autre, parce que rien d'autre n'est servi.
    //
    // ⛔⛔ CET ÉCRAN A ÉTÉ DÉCLARÉ « BLOQUÉ » CE MATIN PAR MOI-MÊME. La mesure disait : 1 endpoint
    // servi sur 5, et `player.locale` lu et projeté sans qu'aucune route ne l'écrive — la forme B
    // des chaînes mortes. La session back a livré l'écrivain dans la journée.
    // ⇒ *Un « bloqué » est une mesure DATÉE, jamais une propriété de l'écran.* Re-mesuré avant
    // d'écrire : `PATCH /v1/me/settings` existe, sous `JwtAuthGuard`, domaine `en | fr`.
    //
    // ⛔ CE QUI RESTE OUVERT, ET LE BACK LE DIT LUI-MÊME : ce n'est PAS un domaine de réglages.
    // `player_settings` n'existe pas comme table ; les autres préférences vivent chacune sur SA
    // route (`PATCH /v1/ui/tutorial-opt-out`, `PUT /v1/me/meta-market/visibility`). S10-a reste
    // ouvert — c'est l'écrivain d'UN champ, pas un service.
    // ⇒ L'écran montre donc UN réglage et l'écrit. Dessiner un panneau de préférences dont une
    // seule serait branchée ferait passer un trou de surface pour un écran fini — et personne ne
    // reviendrait le mesurer.
    //
    // ⛔ Et les trois gestes que le canon demande et que le back ne sert PAS sont écrits à
    // l'écran, éteints, avec leur raison : déconnexion, suppression de compte (RGPD), et le reste
    // des préférences. *Un geste impossible qu'on masque devient un geste qu'on croit ne pas
    // exister.*
    //
    // ⚠️ Aucun `GET /v1/me/settings` n'existe : l'état courant vient de `GET /v1/me`.
    // ⛔ NON REVU — jalon 2026-09-05.
    public class SettingsScreenController : MonoBehaviour, IShellTenant
    {
        [Header("Backend")]
        [SerializeField] private string baseUrl = "http://localhost";

        public ProfilData Profil { get; private set; }
        public string LangueCourante { get; private set; }
        public bool EtatVide { get; private set; }
        /// <summary>⛔ LE SEUL PRÉDICAT HONNÊTE POUR UNE CAPTURE. Attendre qu'un CHAMP arrive
        /// n'est pas attendre que l'écran soit DESSINÉ : ㉓ enchaîne trois requêtes, et guetter la
        /// première faisait capturer DEUX requêtes trop tôt — image vide, test vert. ⑰ battait
        /// entre 23 et 3 éléments d'un run à l'autre pour la même raison, une requête d'avance.
        /// ⇒ Ce compteur monte à la FIN de `Rendre()`. C'est une propriété structurelle : elle ne
        /// dépend d'aucun champ, d'aucun ordre de requêtes, et elle survivra à l'ajout d'un appel.</summary>
        public int RendusEffectues { get; private set; }
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

        private SettingsClient client;
        private string token;
        private bool initialise;
        private Transform mountParent;
        private RectTransform corps;
        private TextMeshProUGUI videTexte;

        private void Awake() => Init();

        /// <summary>⛔ Le shell ajoute des frères APRÈS la fenêtre synchrone du montage
        /// (`AppShell.ConstruireLocataire` : parentage, PUIS `AddComponent`, PUIS les setters).
        /// `Start()` s'exécute à la frame suivante — le premier instant où « être dernier » est
        /// stable. Sans ça, l'écran rend SOUS ses frères, à la bonne taille et au bon endroit.</summary>
        private void Start()
        {
            if (transform.parent != null) transform.SetAsLastSibling();
        }

        private void Init()
        {
            if (initialise) return;
            initialise = true;
            client = new SettingsClient { BaseUrl = baseUrl };
            Construire();
        }

        public void SetMountParent(Transform parent)
        {
            mountParent = parent;
            Init();
            RectTransform rt = (RectTransform)transform;
            rt.anchorMin = Vector2.zero;
            rt.anchorMax = Vector2.one;
            rt.offsetMin = Vector2.zero;
            rt.offsetMax = Vector2.zero;
            transform.SetAsLastSibling();
        }

        public void SetToken(string bearer)
        {
            Init();
            token = bearer;
            if (!string.IsNullOrEmpty(bearer)) StartCoroutine(Charger(bearer));
        }

        private IEnumerator Charger(string bearer)
        {
            yield return client.LireProfil(bearer, p => { Profil = p; LangueCourante = p.locale; },
                                           (c, m) => DerniereErreur = $"{c}: {m}");
            Rendre();
        }

        private void Rendre()
        {
            for (int i = corps.childCount - 1; i >= 0; i--)
                UnityEngine.Object.Destroy(corps.GetChild(i).gameObject);

            EtatVide = Profil == null;
            videTexte.gameObject.SetActive(EtatVide);
            if (EtatVide)
            {
                videTexte.text = DerniereErreur == null
                    ? Lib("Aucun réglage.")
                    : Lib("Les réglages n'ont pas répondu.");
                RendusEffectues++;
                return;
            }

            Section("LA LANGUE");
            foreach (string l in SettingsClient.Langues) Langue(l);

            Section("CE QUE LE SERVEUR NE SERT PAS ENCORE");
            Manque("Se déconnecter", "aucune route de déconnexion joueur");
            Manque("Supprimer mon compte", "le domaine RGPD n'a pas de surface joueur");
            Manque("Les autres préférences", "chacune vit sur sa propre route — il n'y a pas de service de réglages");
            RendusEffectues++;
        }

        private void Section(string titre)
        {
            Texte(corps, "S_" + titre, titre, Px(7.5f), Eteint,
                  DesignTokens.Current.primaryFont).characterSpacing = 14f;
        }

        /// <summary>Un choix de langue. ⚠️ Les libellés sont écrits en DUR et c'est assumé : il
        /// n'existe aucune clé i18n servie par ce back (178 référencées, 0 servie), et une langue
        /// doit se reconnaître dans SA propre langue, jamais traduite.</summary>
        private void Langue(string code)
        {
            bool active = code == LangueCourante;
            string nom = code == "fr" ? "Français" : code == "en" ? "English" : code;

            GameObject r = Bloc("L_" + code, corps, true, Px(6f));
            var h = r.GetComponent<HorizontalLayoutGroup>();
            h.childAlignment = TextAnchor.MiddleLeft;
            // ⛔ SANS CECI LA PASTILLE EST ÉTIRÉE SUR TOUTE LA LARGEUR, en une ellipse d'or de
            // 400 px — vu sur la capture du 2026-09-02. `Bloc()` laisse `childForceExpandWidth` à
            // vrai, ce qui écrase le `flexibleWidth = 0` de la pastille : le groupe distribue
            // l'espace restant à TOUS ses enfants, y compris ceux qui ont déclaré ne pas en
            // vouloir. *Un disque étiré ne se lit plus comme un disque* — et l'étirement d'un
            // sprite rond en ellipse est le défaut que ce dépôt a déjà payé sur un anneau 9-slice.
            // ⇒ Trouvé par un balayage, pas par l'œil : des 8 écrans qui dessinent une pastille,
            // celui-ci était le SEUL à ne jamais poser cette ligne (0 occurrence contre 1 à 12).
            h.childForceExpandWidth = false;
            h.padding = new RectOffset((int)Px(10f), (int)Px(10f), (int)Px(8f), (int)Px(9f));
            Image fond = r.AddComponent<Image>();
            fond.sprite = ProceduralUI.RoundedRectOutline((int)Px(10f), Px(1f),
                active ? Or : Hex("#ffffff24"));
            fond.type = Image.Type.Sliced;

            GameObject puce = new GameObject("Puce", typeof(RectTransform));
            puce.transform.SetParent(r.transform, false);
            puce.AddComponent<Image>().sprite =
                ProceduralUI.RadialDisc((int)Px(9f), active ? Or : Eteint, Hex("#7a5a14"));
            LayoutElement pl = puce.AddComponent<LayoutElement>();
            pl.preferredWidth = Px(9f); pl.preferredHeight = Px(9f); pl.flexibleWidth = 0f;

            Texte(r.transform, "Nom", nom, Px(11.5f), active ? Creme : Creme2,
                  DesignTokens.Current.hudSerifFont);

            if (active) return;
            Button b = r.AddComponent<Button>();
            string c = code;
            b.onClick.AddListener(() => StartCoroutine(Changer(c)));
        }

        private IEnumerator Changer(string code)
        {
            if (string.IsNullOrEmpty(token)) yield break;
            yield return client.DefinirLangue(code, token, l => LangueCourante = l,
                                              (c, m) => DerniereErreur = $"langue {c}: {m}");
            // On RELIT le profil : le serveur seul décide de ce qui a été écrit.
            yield return Charger(token);
        }

        private void Manque(string libelle, string raison)
        {
            GameObject b = Bloc("M_" + libelle, corps, false, Px(1f));
            var v = b.GetComponent<VerticalLayoutGroup>();
            v.childAlignment = TextAnchor.MiddleCenter;
            v.padding = new RectOffset((int)Px(8f), (int)Px(8f), (int)Px(6f), (int)Px(6f));
            Image bf = b.AddComponent<Image>();
            bf.sprite = ProceduralUI.RoundedRectDashedOutline((int)Px(9f), Px(1f), (int)Px(4f), (int)Px(3f), Eteint);
            // ⛔ `Tiled`, PAS `Sliced` — et c'est le générateur lui-même qui le dit : « un contour
            //    de rectangle arrondi en POINTILLÉS, à utiliser en `Image.Type.Tiled` ». Les deux
            //    respectent le `border` du sprite et gardent les coins ; `Sliced` ÉTIRE la section
            //    centrale — qui porte exactement UNE période de pointillé — et la transforme en une
            //    longue barre, tandis que `Tiled` la RÉPÈTE. Mesuré par un juge ⊥ sur un cadre brisé :
            //    334 px de trou, 36 %, symétrique haut et bas parce que les deux rails partagent la
            //    même bande. ⇒ Classe fermée sur les 7 sites, pas seulement sur celui du rapport ;
            //    le remède était DÉJÀ en production sur deux sites de `LieutenantScreenController`.
            bf.type = Image.Type.Tiled;
            Texte(b.transform, "L", libelle, Px(9f), Eteint,
                  DesignTokens.Current.primaryFont, TextAlignmentOptions.Center).characterSpacing = 10f;
            Texte(b.transform, "R", raison, Px(6.8f), Creme2,
                  DesignTokens.Current.primaryFont, TextAlignmentOptions.Center).enableWordWrapping = true;
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
            v.spacing = Px(8f);
            v.childControlWidth = true;
            v.childControlHeight = true;
            v.childForceExpandWidth = true;
            v.childForceExpandHeight = false;
            v.childAlignment = TextAnchor.UpperCenter;

            TextMeshProUGUI titre = Texte(transform, "Titre", "LES RÉGLAGES", Px(13f), Or,
                                          DesignTokens.Current.hudSerifFont, TextAlignmentOptions.Center);
            titre.characterSpacing = 18f;

            GameObject c = Bloc("Corps", transform, false, Px(7f));
            corps = (RectTransform)c.transform;

            videTexte = Texte(transform, "Vide", "", Px(11f), Creme2,
                              DesignTokens.Current.hudSerifFont, TextAlignmentOptions.Center);
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

        /// <summary>Item 0.6 — les littéraux STATIQUES de cet écran passent par
        /// `reglages.bloc.<slug>`, repli sur le littéral (affichage BYTE-IDENTIQUE tant que le
        /// dictionnaire ne porte pas la clé — c'est ce qui rend la conversion sûre sans run).
        /// ⚠️ « Aucun réglage » et « Les réglages n'ont pas répondu » disent deux choses
        /// DIFFÉRENTES — un état vide et une panne — et gardent donc deux clés distinctes.</summary>
        private static string Lib(string litteral) =>
            MafiaCleanCity.I18n.Libelle.De("reglages", "bloc", litteral);

    }
}
