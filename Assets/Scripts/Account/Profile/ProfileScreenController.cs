using System.Collections;
using UnityEngine;
using UnityEngine.UI;
using MafiaCleanCity.Shell;
using MafiaCleanCity.Theme;
using TMPro;

namespace MafiaCleanCity.Account.Profile
{
    // ㉒ LE PROFIL — (ex-« LE COFFRE » : ce nom est déjà celui de ⑪ Pipeline dans le canon,
    // collision tranchée le 2026-09-02 ; le menu Plus y entre sous « VOTRE PROFIL »)
    // ㉒ — qui vous êtes, et ce que le compte sait de vous.
    //
    // MATIÈRE — `GET /v1/me` sous `JwtAuthGuard`, CINQ champs projetés
    // (`auth.service.ts#projectPlayer`) : account_id · handle · email · lifecycle_state · locale.
    //
    // ⛔ SURFACE MAIGRE, ET L'ÉCRAN LE DIT — 5 endpoints servis sur 16 au canon. Ce que la
    // maquette promettait et que le back ne sert PAS, écrit à l'écran plutôt que découvert :
    // · **S10-c** — aucune mutation de profil : ni email, ni mot de passe, ni TOTP. Zéro route.
    // · **S10-b** — ⛔ LA LANGUE NE SE CHANGE PAS. `player.locale` existe en base, est LU, est
    //   projeté ici — et **aucune route ne l'écrit**. C'est la forme B des chaînes mortes : la
    //   donnée vit, la transition n'est jamais écrite. Montrer un sélecteur de langue serait un
    //   geste sans destination.
    // · **S10-e** — aucun domaine de sauvegarde : `save_slot` n'existe QUE comme SKU de boutique.
    //   Le joueur peut donc ACHETER un emplacement que rien ne lit ni n'écrit.
    // · Le **masquage d'email** que le canon demande n'existe pas côté serveur : la route rend
    //   l'adresse EN CLAIR. On peut la masquer À L'AFFICHAGE, et c'est fait — mais ça ne protège
    //   rien sur le fil, et le prétendre serait pire que de ne rien masquer. C'est écrit.
    //
    // ⚠️ MAQUETTE « LE COFFRE » v6 (cadres 45-47) non ratifiée au 2026-09-02.
    // ⛔ NON REVU — jalon 2026-09-05.
    public class ProfileScreenController : MonoBehaviour, IShellTenant
    {
        [Header("Backend")]
        [SerializeField] private string baseUrl = "http://localhost";

        public ProfilData Profil { get; private set; }
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

        private ProfileClient client;
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
            client = new ProfileClient { BaseUrl = baseUrl };
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


        /// <summary>⛔⛔ CE HOOK-CI EST LE BON, ET LES DEUX PRÉCÉDENTS ÉTAIENT DÉCORATIFS.
        /// Lu dans le corps du shell (`AppShell.ConstruireLocataire`), pas déduit :
        ///   1. `host = new GameObject(...)`      — créé à la racine, SANS parent
        ///   2. `host.transform.SetParent(slot)`  — le parent change ICI
        ///   3. `host.AddComponent&lt;T&gt;()`         — le composant naît APRÈS
        ///   4. `tenant.SetMountParent(slot)`     — puis `SetToken`, même frame
        /// ⇒ `OnTransformParentChanged` ne pouvait JAMAIS tirer : au moment du re-parentage,
        /// ce composant n'existait pas. Un dispositif qui nomme un mécanisme réel et ne
        /// s'exécute jamais — et il a survécu deux runs en passant pour un correctif, parce que
        /// six écrans sur sept étaient déjà derniers SANS lui.
        /// ⇒ Et poser l'ordre en (4) ne suffit pas non plus : la mesure dit `frère 6 sur 11`,
        /// donc des frères s'ajoutent APRÈS la fenêtre synchrone du montage.
        /// ⇒ `Start()` s'exécute à la frame SUIVANTE — après tout ce que le shell fait en
        /// synchrone. C'est le premier instant où « être dernier » est stable.
        /// ★ La leçon vaut plus que la ligne : *avant d'écrire un hook, lire le CORPS de ce qui
        /// l'appelle, et se demander si l'événement qu'il observe peut seulement se produire.*</summary>
        private void Start()
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
            yield return client.LireProfil(bearer, p => Profil = p,
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
                videTexte.text = DerniereErreur == null ? "Aucun profil." : "Le profil n'a pas répondu.";
                return;
            }

            // le nom, en grand — c'est l'identité, pas une ligne de tableau
            Texte(corps, "Handle", string.IsNullOrEmpty(Profil.handle) ? "—" : Profil.handle,
                  Px(18f), Or, DesignTokens.Current.hudSerifFont, TextAlignmentOptions.Center);
            Texte(corps, "Etat", Lisible(Profil.lifecycle_state), Px(8.5f), Creme2,
                  DesignTokens.Current.primaryFont, TextAlignmentOptions.Center).characterSpacing = 12f;

            Champ("Adresse", Masquer(Profil.email),
                  "⚠️ masquée à l'affichage seulement — le serveur la rend en clair");
            Champ("Langue", Profil.locale,
                  "⛔ aucune route ne l'écrit : elle ne peut pas être changée");
            Champ("Compte", Court(Profil.account_id), null);

            Manque("Changer le mot de passe", "aucune route de mutation de profil n'existe");
            Manque("Double authentification", "aucune route TOTP n'existe");
            Manque("Vos sauvegardes", "aucun domaine de sauvegarde — l'emplacement n'existe que comme article");
        }

        private void Champ(string libelle, string valeur, string note)
        {
            GameObject r = Bloc("C_" + libelle, corps, false, Px(2f));
            Image fond = r.AddComponent<Image>();
            fond.sprite = ProceduralUI.RoundedRectOutline((int)Px(10f), Px(1f), Hex("#ffffff24"));
            fond.type = Image.Type.Sliced;
            r.GetComponent<VerticalLayoutGroup>().padding =
                new RectOffset((int)Px(10f), (int)Px(10f), (int)Px(7f), (int)Px(8f));
            Texte(r.transform, "L", libelle, Px(7f), Eteint,
                  DesignTokens.Current.primaryFont).characterSpacing = 12f;
            Texte(r.transform, "V", string.IsNullOrEmpty(valeur) ? "—" : valeur, Px(11f), Creme,
                  DesignTokens.Current.hudSerifFont);
            if (note != null)
                Texte(r.transform, "N", note, Px(6.8f), Creme2,
                      DesignTokens.Current.primaryFont).enableWordWrapping = true;
        }

        /// <summary>Un geste que le back ne sert pas — montré éteint avec sa raison.</summary>
        private void Manque(string libelle, string raison)
        {
            GameObject b = Bloc("M_" + libelle, corps, false, Px(1f));
            var v = b.GetComponent<VerticalLayoutGroup>();
            v.childAlignment = TextAnchor.MiddleCenter;
            v.padding = new RectOffset((int)Px(8f), (int)Px(8f), (int)Px(6f), (int)Px(6f));
            Image bf = b.AddComponent<Image>();
            bf.sprite = ProceduralUI.RoundedRectDashedOutline((int)Px(9f), Px(1f), (int)Px(4f), (int)Px(3f), Eteint);
            bf.type = Image.Type.Sliced;
            Texte(b.transform, "L", libelle, Px(9f), Eteint,
                  DesignTokens.Current.primaryFont, TextAlignmentOptions.Center).characterSpacing = 10f;
            Texte(b.transform, "R", raison, Px(6.8f), Creme2,
                  DesignTokens.Current.primaryFont, TextAlignmentOptions.Center).enableWordWrapping = true;
        }

        /// <summary>⚠️ Masquage d'AFFICHAGE. Le serveur rend l'adresse en clair : ceci ne protège
        /// rien sur le fil, et l'écran le dit sous le champ plutôt que de laisser croire.</summary>
        private static string Masquer(string email)
        {
            if (string.IsNullOrEmpty(email)) return "—";
            int a = email.IndexOf('@');
            if (a <= 1) return email;
            return email.Substring(0, 1) + new string('•', System.Math.Min(a - 1, 6)) + email.Substring(a);
        }

        private static string Court(string id) =>
            string.IsNullOrEmpty(id) ? "—" : (id.Length > 8 ? id.Substring(0, 8) : id);

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
            v.spacing = Px(8f);
            v.childControlWidth = true;
            v.childControlHeight = true;
            v.childForceExpandWidth = true;
            v.childForceExpandHeight = false;
            v.childAlignment = TextAnchor.UpperCenter;

            TextMeshProUGUI titre = Texte(transform, "Titre", "LE PROFIL", Px(13f), Or,
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
    }
}
