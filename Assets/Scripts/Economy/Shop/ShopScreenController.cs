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
            // ⛔ Sans ces quatre lignes le rect reste à 100x100 — la taille par défaut d'un
            // RectTransform neuf — et l'écran ne dessine RIEN, sans erreur console. Mesuré sur ㉟
            // le 2026-09-02, capture à l'appui : la garde anti-vacuité était verte quand même,
            // parce qu'elle comptait les teintes de TOUTE l'image et que les écrans du dessous
            // rendaient. Une garde qui mesure le cadre ne peut pas voir qu'un locataire est absent.
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
            // ⛔ UN SEUL DES DEUX PASSE PAR LA CLÉ, et le choix n'est pas cosmétique.
            // · « — jetons » est un littéral STATIQUE : l'état « solde inconnu ». Il a sa clé.
            // · `$"{Solde} jetons"` ASSEMBLE une valeur avec un mot. Le faire passer entier par
            //   le catalogue exigerait un gabarit à trou (`{n} jetons`) que le dictionnaire ne
            //   porte pas, et keyer le seul mot « jetons » fabriquerait une phrase que personne
            //   n'a écrite — l'ordre des mots et l'accord ne sont pas les mêmes dans toutes les
            //   langues.
            // ★ C'est le même cas que la phrase ambiante de ⑨ (« Trois attendent vos ordres »),
            //   qui a dû être demandée au back comme clé ICU plurielle plutôt que recomposée
            //   côté client. Ici la clé n'existe pas encore : je laisse la composition VISIBLE
            //   plutôt que d'en fabriquer une moitié.
            soldeTexte.text = Solde < 0 ? Lib("— jetons") : $"{Solde} jetons";
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
                RendusEffectues++;
                return;
            }
            foreach (SkuDto s in Catalogue) Article(s, possedes.Contains(s.sku_id));
            RendusEffectues++;
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
            // ⛔ Le bloc de tête déclare SA hauteur : un groupe horizontal enfant d'un groupe
            // vertical ne la déduit pas de ses textes, et une hauteur nulle fait empiler tous les
            // frères au même Y.
            LayoutElement teteLe = tete.AddComponent<LayoutElement>();
            teteLe.preferredHeight = Px(13f);
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

            // ⛔⛔ NEUF ARTICLES NE TIENNENT PAS DANS 569 px, ET SANS DÉFILEMENT LE GROUPE LES
            // ÉCRASE AU LIEU DE DÉBORDER. Mesuré par sonde géométrique, pas déduit — les quatre
            // enfants de la première rangée sont bien placés et espacés (y = -36,7 / -58,9 /
            // -80,6 / -131,3, le groupe vertical FONCTIONNE), mais leur hauteur RÉELLE tombe à
            // ~5 px pour une hauteur PRÉFÉRÉE de ~55 :
            //     rangée h=200,8 · [0] Tete h=5,4 prefH=55,5 · [1] Prix h=5,0 prefH=51,8
            //                     · [2] Donne h=4,2 prefH=43,2 · [3] Geste h=63,1
            // TMP dessine son texte HORS de sa boîte quand la boîte est trop petite : d'où neuf
            // articles superposés et illisibles, sans une seule erreur.
            // ⇒ Trois hypothèses fausses avaient précédé cette mesure (hauteur des textes, hauteur
            // du bloc de tête, imbrication), et un correctif posé sur la deuxième n'avait RIEN
            // changé. *Une explication qui n'explique qu'une partie des occurrences est fausse,
            // pas partielle* — le comptoir superposait aussi, sans bloc imbriqué.
            // ⇒ La vraie cause n'est pas la géométrie d'une rangée, c'est que le CONTENU dépasse
            // le cadre. Une boutique à neuf articles a besoin de DÉFILER ; comprimer était le
            // symptôme, pas le sujet. ㉒ et ⑲ rendent juste parce qu'ils tiennent, pas parce
            // qu'ils sont mieux construits.
            GameObject vue = new GameObject("Defilement", typeof(RectTransform));
            vue.transform.SetParent(transform, false);
            // ⛔ `Mask` DÉCOUPE PAR LE CANAL ALPHA de son Graphic, pas par son rectangle. Le
            // masque quasi transparent que j'avais posé (alpha 0,004) est donc un pochoir presque
            // VIDE : il pouvait écarter ce qu'il devait garder. Symptôme sur la capture — rangées
            // débordant à gauche et bordures arrondies disparues.
            // ⇒ `RectMask2D` découpe par RECTANGLE, n'exige aucun Graphic et n'a pas de seuil
            // d'alpha. Il n'y a rien à régler et donc rien à régler de travers.
            // ★ Ce n'est pas une 4e hypothèse à l'aveugle : c'est le remplacement d'un mécanisme
            // dont le paramètre décisif était douteux par un mécanisme qui n'en a pas. Et la sonde
            // ci-dessous mesure le résultat au lieu de me laisser dire « ça a l'air mieux ».
            vue.AddComponent<RectMask2D>();
            LayoutElement vueLe = vue.AddComponent<LayoutElement>();
            vueLe.flexibleHeight = 1f;                      // prend toute la hauteur restante
            ScrollRect defil = vue.AddComponent<ScrollRect>();
            defil.horizontal = false;
            defil.movementType = ScrollRect.MovementType.Clamped;
            defil.scrollSensitivity = Px(20f);

            GameObject liste = Bloc("Etageres", vue.transform, false, Px(8f));
            RectTransform listeRt = (RectTransform)liste.transform;
            listeRt.anchorMin = new Vector2(0f, 1f);
            listeRt.anchorMax = new Vector2(1f, 1f);
            listeRt.pivot = new Vector2(0.5f, 1f);
            // ⛔ UN RectTransform NEUF A UN sizeDelta DE (100, 100), ET DES ANCRES ÉTIRÉES NE LE
            // REMPLACENT PAS : ELLES S'Y AJOUTENT. Mesuré, pas supposé — la sonde a rendu
            //     vue w=1196,0 · liste w=1296,0 · ancres=[0,0 → 1,0]
            // et 1296 − 1196 = 100, exactement la valeur par défaut. La liste débordait donc de
            // 50 px de CHAQUE côté (pivot centré), ce qui coupait le début des libellés et
            // poussait les bordures arrondies hors du masque.
            // ⇒ Avec des ancres étirées, `sizeDelta` est un DELTA sur la taille du parent, pas une
            // taille. Le laisser à sa valeur par défaut, c'est demander « parent + 100 ».
            // ★ Trois hypothèses avaient précédé cette mesure sur le défaut voisin ; ici le nombre
            // a tranché du premier coup parce que la sonde regardait enfin la bonne GRANDEUR — la
            // largeur. Une sonde qui ne mesure que la hauteur ne peut pas voir un débordement
            // horizontal, et j'avais passé deux runs avec exactement cette sonde-là.
            listeRt.sizeDelta = new Vector2(0f, listeRt.sizeDelta.y);
            // ⚠️ Sans ce fitter, le contenu garde la hauteur du cadre et le groupe écrase de
            // nouveau : c'est LUI qui laisse la liste grandir au-delà de ce qui est visible.
            var fitter = liste.AddComponent<ContentSizeFitter>();
            fitter.verticalFit = ContentSizeFitter.FitMode.PreferredSize;
            defil.content = listeRt;
            defil.viewport = (RectTransform)vue.transform;
            etageres = listeRt;

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
            // ⛔ SANS HAUTEUR DÉCLARÉE, UN TEXTE IMBRIQUÉ NE PREND PAS DE PLACE ET TOUT SE
            // SUPERPOSE. Mesuré à la capture du 2026-09-02 : les neuf articles rendaient leurs
            // vraies données — nom, prix, bonus, raison — TOUS DESSINÉS AU MÊME ENDROIT, illisibles.
            // Cause : `preferredWidth = 0` empêche TMP de calculer une hauteur utile quand il est
            // sous un groupe HORIZONTAL lui-même enfant d'un groupe vertical ; le bloc de tête
            // remontait donc une hauteur nulle et ses frères se plaçaient par-dessus.
            // ⇒ On déclare la hauteur de ligne au lieu de la laisser déduire. ⚠️ Correctif SCOPÉ à
            // cet écran : ㉒ le profil emploie les mêmes helpers et rend juste — il n'a pas de bloc
            // horizontal imbriqué. *Le défaut est dans l'imbrication, pas dans le helper*, et
            // toucher les huit écrans pour réparer celui-ci en casserait sept qui vont bien.
            le.preferredHeight = taille * 1.35f;
            return t;
        }

        /// <summary>Item 0.6 — les littéraux STATIQUES passent par `boutique.bloc.<slug>`, repli
        /// sur le littéral.
        /// ⚠️ N'Y PASSE PAS la composition `$"{Solde} jetons"` : voir le commentaire au site
        /// d'appel. Une chaîne assemblée avec une valeur demande un gabarit ICU côté serveur,
        /// pas une clé côté client.</summary>
        private static string Lib(string litteral) =>
            MafiaCleanCity.I18n.Libelle.De("boutique", "bloc", litteral);

    }
}
