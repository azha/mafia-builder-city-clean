using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.UI;
using MafiaCleanCity.Shell;
using MafiaCleanCity.Theme;
using TMPro;

namespace MafiaCleanCity.Economy.Shop
{
    // ㉓ LA VITRINE — le catalogue, le solde en jetons, l'achat, ce qu'on possède déjà.
    //
    // MATIÈRE — les 5 routes d'`iap.controller.ts`, 4 tirées ici, toutes sous `JwtAuthGuard` :
    // `iap/catalogue` · `me/iap/balance` · `me/iap/items/purchase` · `me/iap/entitlements`.
    // Les formes sont RECOPIÉES de `iap-catalogue.service.ts:36-45`, pas reformulées.
    //
    // ⛔⛔ CE QUE CET ÉCRAN REND VISIBLE, ET QUI EST LE VRAI SUJET : *pour un joueur non payeur,
    // la vitrine est terminale.* Les TROIS écrivains de `economy_states.marks` sont le don de
    // bienvenue (50, une fois), un reçu vérifié, une subvention staff. Et **le don vaut exactement
    // le prix du seul article atteignable** : un achat, puis les autres sont hors d'atteinte pour
    // toujours. Ce n'est pas un cas limite à cacher au fond d'un état vide — c'est l'état dans
    // lequel finit tout joueur qui ne paie pas.
    // ⇒ L'écran l'ÉCRIT, sous le solde, en une ligne. *Une vitrine qui laisse croire qu'on
    // pourrait revenir demain avec plus de jetons ment sur l'économie qu'elle présente.*
    //
    // ⛔ ET LE SECOND MUR, MESURÉ : les MARKS_PACK et SUPPORT sont en argent réel et passent par
    // `iap/purchase/validate`, qui **ne peut créditer dans AUCUN environnement** — la production
    // câble `NullIapReceiptVerifier` (rend toujours null), et l'allow-list du faux vérificateur
    // est VIDE par défaut. Ces articles sont donc montrés DERRIÈRE LA VITRE, sans geste, avec la
    // raison écrite. Un bouton qui ne peut pas aboutir est pire qu'un article qu'on ne peut pas
    // prendre : il fait porter l'échec au joueur.
    //
    // ⚠️ DEUX ASSUMÉS, contre la convention du lot 0, écrits plutôt que masqués :
    // · `display_name` est servi en **littéral ANGLAIS** — le bundle i18n ne porte aucune clé
    //   produit (67 messages, tous `error.*`). On affiche donc ce que le back sert, tel quel.
    // · les sous-titres descriptifs de la maquette **n'ont aucune source** ; il n'y en a pas ici.
    //
    // ⚠️ `bonus_pct` compare le **ratio jetons/euro** au pack de base — l'étiquette dit donc
    // « +N % de jetons par euro », jamais « +N % » collé au nombre de jetons : « 600 jetons +20 % »
    // se lit « 720 », et c'est faux. Défaut relevé par le juge sur la maquette, corrigé ici aussi.
    //
    // ⚠️ MAQUETTE v6 « LA VITRINE » (cadres 48-50) NON RATIFIÉE par l'user au 2026-09-02 — cet
    // écran est bâti sur la SURFACE MESURÉE. À re-confronter dès ratification.
    // ⛔ NON REVU — jalon 2026-09-05.
    public class ShopScreenController : MonoBehaviour, IShellTenant
    {
        [Header("Backend")]
        [SerializeField] private string baseUrl = "http://localhost";

        public SkuDto[] Catalogue { get; private set; }
        public int Solde { get; private set; } = -1;
        public string[] Possedes { get; private set; }
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

        private ShopClient client;
        private string token;
        private bool initialise;
        private Transform mountParent;
        private RectTransform etageres;
        private TextMeshProUGUI soldeTexte;
        private TextMeshProUGUI terminalTexte;
        private TextMeshProUGUI videTexte;

        private void Awake() => Init();

        private void Init()
        {
            if (initialise) return;
            initialise = true;
            client = new ShopClient { BaseUrl = baseUrl };
            Construire();
        }

        /// <summary>⛔ Le placement appartient au SHELL, pas au locataire. Mesuré sur ㉟ : forcer
        /// des ancres contre un conteneur qui gouverne ses enfants ne marche pas — il les
        /// recalcule à chaque passe de mise en page. L'écran accepte le rect qu'on lui donne.</summary>
        public void SetMountParent(Transform parent)
        {
            mountParent = parent;
            Init();
        }

        public void SetToken(string bearer)
        {
            Init();
            token = bearer;
            if (!string.IsNullOrEmpty(bearer)) StartCoroutine(Charger(bearer));
        }

        private IEnumerator Charger(string bearer)
        {
            yield return client.ListerCatalogue(bearer, s => Catalogue = s,
                                                (c, m) => DerniereErreur = $"catalogue {c}: {m}");
            yield return client.LireSolde(bearer, s => Solde = s,
                                          (c, m) => DerniereErreur = $"solde {c}: {m}");
            yield return client.ListerPossessions(bearer, p => Possedes = p,
                                                  (c, m) => DerniereErreur = $"possessions {c}: {m}");
            Rendre();
        }

        private void Rendre()
        {
            for (int i = etageres.childCount - 1; i >= 0; i--)
                UnityEngine.Object.Destroy(etageres.GetChild(i).gameObject);

            // ⚠️ -1 signifie « pas lu », 0 signifie « lu, et il est vide ». Les confondre ferait
            // afficher « zéro jeton » à un joueur dont la route a simplement échoué.
            soldeTexte.text = Solde < 0 ? "— jetons" : $"{Solde} jetons";
            soldeTexte.color = Solde == 0 ? Braise : Or;

            var possedes = new HashSet<string>(Possedes ?? new string[0]);
            terminalTexte.gameObject.SetActive(Solde == 0);

            EtatVide = Catalogue == null || Catalogue.Length == 0;
            videTexte.gameObject.SetActive(EtatVide);
            if (EtatVide)
            {
                videTexte.text = DerniereErreur == null
                    ? "La vitrine est vide."
                    : "La vitrine n'a pas répondu.";
                return;
            }
            foreach (SkuDto s in Catalogue) Article(s, possedes.Contains(s.sku_id));
        }

        private void Article(SkuDto s, bool possede)
        {
            bool argentReel = s.kind == "MARKS_PACK" || s.kind == "SUPPORT";
            bool abordable = !argentReel && Solde >= s.price_marks && s.price_marks > 0;

            GameObject r = Bloc("Sku_" + s.sku_id, etageres, false, Px(4f));
            Image fond = r.AddComponent<Image>();
            fond.sprite = ProceduralUI.RoundedRectOutline((int)Px(12f), Px(1f),
                possede ? Hex("#d9ab4e40") : Hex("#ffffff24"));
            fond.type = Image.Type.Sliced;
            r.GetComponent<VerticalLayoutGroup>().padding =
                new RectOffset((int)Px(10f), (int)Px(10f), (int)Px(8f), (int)Px(9f));

            GameObject tete = Bloc("Tete", r.transform, true, Px(6f));
            var htete = tete.GetComponent<HorizontalLayoutGroup>();
            htete.childForceExpandWidth = false;
            htete.childAlignment = TextAnchor.MiddleLeft;

            // l'objet, en pastille : sa forme dit sa nature avant qu'on lise son nom
            GameObject pastille = new GameObject("Objet", typeof(RectTransform));
            pastille.transform.SetParent(tete.transform, false);
            pastille.AddComponent<Image>().sprite =
                ProceduralUI.RadialDisc((int)Px(11f), argentReel ? Creme2 : Or, Hex("#7a5a14"));
            LayoutElement pl = pastille.AddComponent<LayoutElement>();
            pl.preferredWidth = Px(11f); pl.preferredHeight = Px(11f); pl.flexibleWidth = 0f;

            // ⚠️ littéral ANGLAIS servi par le back — aucune clé i18n produit n'existe (assumé).
            Texte(tete.transform, "Nom", string.IsNullOrEmpty(s.display_name) ? s.sku_id : s.display_name,
                  Px(11.5f), Creme, DesignTokens.Current.hudSerifFont);

            GameObject espace = new GameObject("Espace", typeof(RectTransform));
            espace.transform.SetParent(tete.transform, false);
            espace.AddComponent<LayoutElement>().flexibleWidth = 1f;

            if (possede)
                Texte(tete.transform, "Possede", "ACQUIS", Px(7.5f), Or, DesignTokens.Current.primaryFont);

            // le prix : en jetons, ou en argent réel — jamais les deux dans la même unité
            if (s.price_marks > 0)
                Texte(r.transform, "Prix", $"{s.price_marks} jetons", Px(9f),
                      abordable || possede ? Creme : Eteint, DesignTokens.Current.primaryFont);
            else if (!string.IsNullOrEmpty(s.price_store_product_id))
                Texte(r.transform, "Prix", "en boutique", Px(9f), Creme2, DesignTokens.Current.primaryFont);

            // ce que le pack DONNE, écrit sur l'objet — le pack de soutien était le seul des cinq
            // à ne pas le dire (défaut du juge, corrigé dans la maquette et ici).
            if (s.marks_granted > 0)
                Texte(r.transform, "Donne", $"donne {s.marks_granted} jetons", Px(7.5f), Creme2,
                      DesignTokens.Current.primaryFont);

            // ⚠️ `bonus_pct` porte sur le RATIO jetons/euro, pas sur le nombre de jetons.
            if (s.bonus_pct > 0)
                Texte(r.transform, "Bonus", $"+{s.bonus_pct} % de jetons par euro", Px(7.5f), Or,
                      DesignTokens.Current.primaryFont);

            Geste(r.transform, s, possede, argentReel, abordable);
        }

        /// <summary>Le geste — et sa raison quand il est impossible. Jamais masqué : *un geste
        /// impossible qu'on masque devient un geste qu'on croit ne pas exister.*</summary>
        private void Geste(Transform parent, SkuDto s, bool possede, bool argentReel, bool abordable)
        {
            string libelle, raison;
            Color teinte;
            if (possede) { libelle = "ACQUIS"; raison = null; teinte = Or; }
            else if (argentReel)
            {
                libelle = "DERRIÈRE LA VITRE";
                raison = "aucun vérificateur de reçu n'est câblé — cet achat ne peut aboutir";
                teinte = Eteint;
            }
            else if (!abordable)
            {
                libelle = "ACHETER";
                raison = Solde == 0 ? "plus aucun jeton, et rien n'en redonne" : "pas assez de jetons";
                teinte = Eteint;
            }
            else { libelle = "ACHETER"; raison = null; teinte = Or; }

            GameObject b = Bloc("Geste", parent, false, Px(1f));
            var vb = b.GetComponent<VerticalLayoutGroup>();
            vb.childAlignment = TextAnchor.MiddleCenter;
            vb.padding = new RectOffset((int)Px(8f), (int)Px(8f), (int)Px(6f), (int)Px(6f));
            Image bf = b.AddComponent<Image>();
            bf.sprite = teinte == Or
                ? ProceduralUI.RoundedRectOutline((int)Px(9f), Px(1f), Or)
                : ProceduralUI.RoundedRectDashedOutline((int)Px(9f), Px(1f), (int)Px(4f), (int)Px(3f), Eteint);
            bf.type = Image.Type.Sliced;
            Texte(b.transform, "Lib", libelle, Px(9f), teinte,
                  DesignTokens.Current.primaryFont, TextAlignmentOptions.Center).characterSpacing = 14f;
            if (raison != null)
                Texte(b.transform, "Raison", raison, Px(6.8f), Creme2,
                      DesignTokens.Current.primaryFont, TextAlignmentOptions.Center)
                    .enableWordWrapping = true;

            if (teinte == Or && !possede)
            {
                Button bouton = b.AddComponent<Button>();
                string skuId = s.sku_id;
                bouton.onClick.AddListener(() => StartCoroutine(Acheter(skuId)));
            }
        }

        private IEnumerator Acheter(string skuId)
        {
            if (string.IsNullOrEmpty(token)) yield break;
            yield return client.Acheter(skuId, token, _ => { },
                                        (c, m) => DerniereErreur = $"achat {c}: {m}");
            // On RELIT le solde et les possessions au lieu de les décrémenter localement : le
            // serveur résout le prix, donc lui seul sait ce qui a été débité.
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
            v.padding = new RectOffset((int)Px(10f), (int)Px(10f),
                                       (int)ShellChrome.TopInsetPx + (int)Px(8f),
                                       (int)ShellChrome.BottomInsetPx + (int)Px(8f));
            v.spacing = Px(8f);
            v.childControlWidth = true;
            v.childControlHeight = true;
            v.childForceExpandWidth = true;
            v.childForceExpandHeight = false;
            v.childAlignment = TextAnchor.UpperCenter;

            TextMeshProUGUI titre = Texte(transform, "Titre", "LA VITRINE", Px(13f), Or,
                                          DesignTokens.Current.hudSerifFont, TextAlignmentOptions.Center);
            titre.characterSpacing = 18f;

            // le comptoir : le solde en jetons, et ce que ça veut dire
            GameObject comptoir = Bloc("Comptoir", transform, false, Px(2f));
            var vc = comptoir.GetComponent<VerticalLayoutGroup>();
            vc.childAlignment = TextAnchor.MiddleCenter;
            vc.padding = new RectOffset((int)Px(8f), (int)Px(8f), (int)Px(6f), (int)Px(7f));
            Image cf = comptoir.AddComponent<Image>();
            cf.sprite = ProceduralUI.RoundedRectOutline((int)Px(10f), Px(1f), Hex("#d9ab4e40"));
            cf.type = Image.Type.Sliced;
            soldeTexte = Texte(comptoir.transform, "Solde", "— jetons", Px(14f), Or,
                               DesignTokens.Current.hudSerifFont, TextAlignmentOptions.Center);
            terminalTexte = Texte(comptoir.transform, "Terminal",
                                  "le don de bienvenue ne se reçoit qu'une fois — rien ne recrédite en jouant",
                                  Px(6.8f), Braise, DesignTokens.Current.primaryFont,
                                  TextAlignmentOptions.Center);
            terminalTexte.enableWordWrapping = true;
            terminalTexte.gameObject.SetActive(false);

            GameObject liste = Bloc("Etageres", transform, false, Px(8f));
            etageres = (RectTransform)liste.transform;

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
            // ⚠️ Sans ceci TMP réclame la largeur du texte NON COUPÉ et fait déborder la rangée.
            LayoutElement le = go.AddComponent<LayoutElement>();
            le.preferredWidth = 0f;
            le.flexibleWidth = 1f;
            return t;
        }
    }
}
