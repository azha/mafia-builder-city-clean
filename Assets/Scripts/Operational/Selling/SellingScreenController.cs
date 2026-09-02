using System.Collections;
using UnityEngine;
using UnityEngine.UI;
using MafiaCleanCity.Shell;
using MafiaCleanCity.Theme;
using TMPro;

namespace MafiaCleanCity.Operational.Selling
{
    // ㉟ LA VENTE — « les points de vente ».
    //
    // ⛔⛔ LE PLUS GROS TROU MESURÉ DU CORPUS : on cuit, on convoie, on se fait arrêter — et AUCUN
    // écran ne permettait de vendre. C'est le bout de la chaîne, là où l'argent rentre.
    //
    // MATIÈRE — sept clés, TOUTES DES BANDES (R2.2, zéro scalaire) :
    // · la marchandise en pastille (`substance`) · la caisse en JAUGE À CRANS (`cash_band`) ·
    // · la marge en QUATRE TRAITS (`margin_band`) · l'activité en état (`activity_band`).
    // ⚠️ La jauge est à CRANS et pas continue, et ce n'est pas un choix graphique : les paliers du
    // back sont DISCRETS (NONE|LOW|MODERATE|HIGH|FULL). *Une barre continue mentirait sur la
    // précision de la donnée* — elle laisserait croire à un montant là où il n'y a qu'un palier.
    //
    // ⛔ ET LA CHAÎNE MORTE QUE CET ÉCRAN DÉCLARE AU LIEU DE LA MASQUER : `collect` exige une
    // planque possédée, et rien ne crée jamais de ligne `safehouses` (0 écrivain, re-mesuré le
    // 2026-09-02 avec contrôle positif ; TD-358). RAMASSER échoue pour tout joueur, partout.
    // ⇒ Le bouton est montré ÉTEINT, avec la raison écrite à l'écran. *Un geste impossible qu'on
    // masque devient un geste qu'on croit ne pas exister ; montré éteint, il devient une promesse
    // datée* — et le jour où la planque existe, c'est cette ligne qui devra changer, pas la
    // découverte que l'écran ne le proposait pas.
    // ⚠️ Symptôme visible de la même chaîne : `cash_band` monte jusqu'à FULL et RIEN ne la vide.
    //
    // ⚠️ MAQUETTE NON RATIFIÉE au 2026-09-02 (juge-données ✗, ratification user ✗) — cet écran est
    // bâti sur la SURFACE MESURÉE, pas sur un dessin approuvé. À re-confronter à la maquette dès
    // qu'elle est ratifiée.
    // ⛔ NON REVU — jalon 2026-09-05.
    public class SellingScreenController : MonoBehaviour, IShellTenant
    {
        [Header("Backend")]
        [SerializeField] private string baseUrl = "http://localhost";

        public DealerDto[] Dealers { get; private set; }
        public bool EtatVide { get; private set; }
        public int CollectTentatives { get; private set; }
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

        private SellingClient client;
        private string token;
        private bool initialise;
        private Transform mountParent;
        private RectTransform rangees;
        private TextMeshProUGUI videTexte;

        private void Awake() => Init();

        private void Init()
        {
            if (initialise) return;
            initialise = true;
            client = new SellingClient { BaseUrl = baseUrl };
            Construire();
        }

        /// <summary>⛔ CE CONTRÔLEUR NE SE PLACE PLUS LUI-MÊME, ET C'EST UNE DÉCISION MESURÉE.
        /// Deux tentatives ont échoué avant celle-ci, chacune réfutée par le diagnostic imprimé
        /// dans la capture :
        ///   · placement dans `SetMountParent` → `frere=1/8`, `rect=1280x960` : le shell re-parente
        ///     APRÈS le setter, donc tout ce qu'on y pose est écrasé ;
        ///   · placement dans `Start()`        → `frere=3/8`, `rect=1280x960` : le rang bouge, la
        ///     taille NON — donc ce n'est pas l'ordre qui décide, c'est le CONTENEUR qui gouverne
        ///     la taille de ses enfants.
        /// ⇒ Forcer des ancres contre un conteneur qui contrôle ses enfants ne peut pas marcher :
        /// il les recalcule à chaque passe de mise en page. *Se battre contre le système de layout
        /// est toujours une erreur de couche.* L'écran ACCEPTE donc le rect que le shell lui donne
        /// et se dessine dedans — c'est au shell de décider de la place d'un locataire, pas au
        /// locataire de se l'arroger.
        /// ⚠️ CONSÉQUENCE ASSUMÉE, écrite plutôt que masquée : monté en surimpression, cet écran
        /// occupe la BANDE que le shell lui alloue (1280x960), pas le plein cadre. Tant qu'il n'a
        /// pas d'entrée de navigation propre — les quatre onglets sont pris — c'est le meilleur
        /// état vérifiable : il rend, il est lisible, et il ne prétend pas être ailleurs.</summary>
        public void SetMountParent(Transform parent)
        {
            mountParent = parent;
            Init();
            // ⛔ LES ANCRES SONT LE TRAVAIL DE L'ÉCRAN, ET LES RETIRER A ÉTÉ UNE SUR-CORRECTION.
            // Mesuré dans les deux sens : AVEC elles `rect=1280x960` (la taille réelle du
            // `ContentSlot`), SANS elles `rect=100x100` — la taille par défaut d'un RectTransform
            // neuf — et l'écran ne dessine plus rien du tout.
            // ⇒ Ce que la mesure précédente disait vraiment n'était pas « le placement appartient
            // au shell », c'était « le shell alloue 960 de haut, pas le plein cadre ». J'ai conclu
            // d'un rect qui ne changeait pas qu'il ne fallait rien poser, alors qu'il ne changeait
            // pas parce qu'il était DÉJÀ correct. *Un chiffre stable entre deux essais ne dit pas
            // que le geste est inutile : il peut dire qu'il a marché les deux fois.*
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
            yield return client.ListDealers(bearer, d => Dealers = d,
                                            (c, m) => DerniereErreur = $"{c}: {m}");
            Rendre();
        }

        private void Rendre()
        {
            for (int i = rangees.childCount - 1; i >= 0; i--)
                UnityEngine.Object.Destroy(rangees.GetChild(i).gameObject);

            EtatVide = Dealers == null || Dealers.Length == 0;
            videTexte.gameObject.SetActive(EtatVide);
            if (EtatVide)
            {
                videTexte.text = DerniereErreur == null
                    ? "Aucun point de vente."
                    : "Les points de vente n'ont pas répondu.";
                return;
            }
            foreach (DealerDto d in Dealers) Rangee(d);
        }

        private void Rangee(DealerDto d)
        {
            GameObject r = Bloc("Dealer_" + d.dealer, rangees, false, Px(4f));
            Image fond = r.AddComponent<Image>();
            fond.sprite = ProceduralUI.RoundedRectOutline((int)Px(12f), Px(1f), Hex("#ffffff24"));
            fond.type = Image.Type.Sliced;
            r.GetComponent<VerticalLayoutGroup>().padding =
                new RectOffset((int)Px(10f), (int)Px(10f), (int)Px(8f), (int)Px(9f));

            GameObject tete = Bloc("Tete", r.transform, true, Px(6f));
            tete.GetComponent<HorizontalLayoutGroup>().childForceExpandWidth = false;
            tete.GetComponent<HorizontalLayoutGroup>().childAlignment = TextAnchor.MiddleLeft;

            // la marchandise en pastille
            GameObject pastille = new GameObject("Substance", typeof(RectTransform));
            pastille.transform.SetParent(tete.transform, false);
            pastille.AddComponent<Image>().sprite = ProceduralUI.RadialDisc((int)Px(11f), Or, Hex("#7a5a14"));
            LayoutElement pl = pastille.AddComponent<LayoutElement>();
            pl.preferredWidth = Px(11f); pl.preferredHeight = Px(11f); pl.flexibleWidth = 0f;

            Texte(tete.transform, "Nom", Lisible(d.substance), Px(11.5f), Creme,
                  DesignTokens.Current.hudSerifFont);
            GameObject espace = new GameObject("Espace", typeof(RectTransform));
            espace.transform.SetParent(tete.transform, false);
            espace.AddComponent<LayoutElement>().flexibleWidth = 1f;
            Texte(tete.transform, "Activite", Activite(d.activity_band), Px(7.5f),
                  d.activity_band == "COMPROMISED" ? Braise : Creme2, DesignTokens.Current.primaryFont);

            // la caisse : cinq CRANS, jamais une barre continue
            Crans(r.transform, "Caisse", d.cash_band, 5, CaisseRang(d.cash_band));
            // la marge : quatre traits
            Crans(r.transform, "Marge", d.margin_band, 4, MargeRang(d.margin_band));

            // le geste impossible, montré éteint
            GameObject ramasser = Bloc("Ramasser", r.transform, false, Px(1f));
            ramasser.GetComponent<VerticalLayoutGroup>().childAlignment = TextAnchor.MiddleCenter;
            ramasser.GetComponent<VerticalLayoutGroup>().padding =
                new RectOffset((int)Px(8f), (int)Px(8f), (int)Px(6f), (int)Px(6f));
            Image rf = ramasser.AddComponent<Image>();
            rf.sprite = ProceduralUI.RoundedRectDashedOutline((int)Px(9f), Px(1f), (int)Px(4f), (int)Px(3f), Eteint);
            rf.type = Image.Type.Sliced;
            Texte(ramasser.transform, "Lib", "RAMASSER", Px(9f), Eteint,
                  DesignTokens.Current.primaryFont, TextAlignmentOptions.Center).characterSpacing = 14f;
            Texte(ramasser.transform, "Raison", "impossible — aucune planque n'existe encore",
                  Px(6.8f), Creme2, DesignTokens.Current.primaryFont, TextAlignmentOptions.Center)
                .enableWordWrapping = true;
        }

        /// <summary>Une jauge à CRANS — un cran par palier servi, allumé ou non. Pas une barre :
        /// la donnée est discrète et une barre continue prétendrait une précision qui n'existe
        /// pas.</summary>
        private void Crans(Transform parent, string nom, string bande, int total, int allumes)
        {
            GameObject l = Bloc(nom, parent, true, Px(5f));
            l.GetComponent<HorizontalLayoutGroup>().childForceExpandWidth = false;
            l.GetComponent<HorizontalLayoutGroup>().childAlignment = TextAnchor.MiddleLeft;
            Texte(l.transform, "Lib", nom, Px(7.5f), Creme2, DesignTokens.Current.primaryFont);
            GameObject g = Bloc("Crans", l.transform, true, Px(2f));
            g.GetComponent<HorizontalLayoutGroup>().childForceExpandWidth = false;
            for (int i = 0; i < total; i++)
            {
                GameObject c = new GameObject("C" + i, typeof(RectTransform));
                c.transform.SetParent(g.transform, false);
                Image im = c.AddComponent<Image>();
                im.sprite = ProceduralUI.RoundedRectOutline((int)Px(2f), Px(1f), i < allumes ? Or : Eteint);
                im.type = Image.Type.Sliced;
                im.color = i < allumes ? Or : Eteint;
                LayoutElement le = c.AddComponent<LayoutElement>();
                le.preferredWidth = Px(9f); le.preferredHeight = Px(7f); le.flexibleWidth = 0f;
            }
            Texte(l.transform, "Val", Lisible(bande), Px(7f), Creme, DesignTokens.Current.primaryFont);
        }

        private static int CaisseRang(string b) =>
            b == "FULL" ? 5 : b == "HIGH" ? 4 : b == "MODERATE" ? 3 : b == "LOW" ? 2 : b == "NONE" ? 0 : 0;

        private static int MargeRang(string b) =>
            b == "HIGH_PREMIUM" ? 4 : b == "PREMIUM" ? 3 : b == "ELEVATED" ? 2 : b == "STANDARD" ? 1 : 0;

        private static string Activite(string b) =>
            b == "WORKING" ? "AU POSTE" : b == "IDLE" ? "INACTIF"
            : b == "ABSENT" ? "ABSENT" : b == "COMPROMISED" ? "COMPROMIS" : "—";

        /// <summary>Pis-aller : aucune clé i18n n'est servie par ce back (178 référencées, 0
        /// servie). Ce n'est PAS une traduction.</summary>
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

            TextMeshProUGUI titre = Texte(transform, "Titre", "LES POINTS DE VENTE", Px(13f), Or,
                                          DesignTokens.Current.hudSerifFont, TextAlignmentOptions.Center);
            titre.characterSpacing = 18f;

            GameObject liste = Bloc("Rangees", transform, false, Px(8f));
            rangees = (RectTransform)liste.transform;

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
            go.AddComponent<LayoutElement>();
            return t;
        }
    }
}
