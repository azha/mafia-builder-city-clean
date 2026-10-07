using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.UI;
using MafiaCleanCity.Shell;
using MafiaCleanCity.Theme;
using TMPro;

namespace MafiaCleanCity.Economy.Shop
{
    // ㉓ LA VITRINE — le catalogue, le solde en Marks, l'achat, ce qu'on possède déjà.
    //
    // MATIÈRE — les 5 routes d'`iap.controller.ts`, 4 tirées ici, toutes sous `JwtAuthGuard` :
    // `iap/catalogue` · `me/iap/balance` · `me/iap/items/purchase` · `me/iap/entitlements`.
    // Les formes sont RECOPIÉES de `iap-catalogue.service.ts:36-45`, pas reformulées.
    //
    // FORME — la maquette fait foi : `ecrans-brennar-6.html` cadres 98 (les extras, le cadre NOMINAL), 99 (la caisse — les Marks), 100 (zéro Mark), atelier 7159e54 (re-rendus en MARKS : le back n'a qu'une
    // monnaie, décision de f2 du 08/10 ; le « jeton » n'y est plus que l'OBJET dessiné — la pièce au T). Le juge groupé du 07/10 (`Tools/juge-visuel/compte/r-groupe-2026-10-07/rapport.md`) : « la vitrine n'est
    // plus une vitrine » — cinq A, trois B, corrigés ici fidèlement (ruling user 07/10) :
    //   A1 la GRILLE 2 × 2 (`.planche`) : deux cartes par rangée, gouttière de 8 CSS px — plus une colonne de bandes pleine largeur ;
    //   A2 la carte est une PLAQUE teintée (`.art` : #221a20 → #1a141a, bord #3a2530, rayon 4) — plus un filet sur le fond de page ;
    //   A3 un DESSIN par article (`VitrinePictogrammes` : la pile de pièces par rang, la plaque aux couleurs, le tableau de bord, la clé, l'enveloppe) — plus le même disque quatre fois ;
    //   A4 la BANDE BASSE `.voix` (`PiedDEcran.BandeDeVoix`) en pied de la pile ; SANS la voix (Wexler, « derrière le comptoir », sa réplique) : TD-823, registre back — rien n'est inventé à sa place ;
    //   A5 une seule monnaie, les Marks, partout (les clés de la table 69) ;
    //   B1 l'INTITULÉ d'étagère qui dit par quoi on paie (« Les extras — payés en Marks » / « Les Marks — payés au magasin ») ;
    //   B2 le MÉDAILLON de bonus (`.bonus`) : plaque or collée dans l'angle de la carte, hors mise en page ;
    //   B3 le COMPTOIR (`.compt`) : plaque bronze, enseigne à GAUCHE, solde en pastille à DROITE sur la même ligne, filet de laiton.
    // Ordre des étagères : le cadre nominal (98) montre les extras — ils ouvrent l'écran ; la caisse (99) suit, puis le soutien sur une planche large.
    // Le GESTE d'achat : la maquette ne dessine aucun bouton — la carte EST l'article, son étiquette de prix dit l'état (`.etiq`, `.etiq.hors` + « hors d'atteinte » en rouge, `.acquis`) ; une carte à portée se prend
    // d'un appui (le `Button` est la carte). Les mots de l'état restent ceux que le back sert (table 69) : « pas assez de Marks », « plus aucun Mark, et rien n'en redonne », « Bientôt ».
    // Consigné (C, ni correctif ni tour de juge) : le dégradé de la plaque et des pièces (aplat médian), les reflets de la vitre, « donne N Marks » (clé servie) là où le cadre écrit « + N Marks », le sous-titre
    // anglais `.en` (aucune source : absent), « DERRIÈRE LA VITRE / Bientôt » là où le cadre écrit « PRIX DU MAGASIN » (le magasin n'est pas branché : cohérent avec l'état, dit le juge).
    //
    // ⛔⛔ CE QUE CET ÉCRAN REND VISIBLE, ET QUI EST LE VRAI SUJET : *pour un joueur non payeur,
    // la vitrine est terminale.* Les TROIS écrivains de `economy_states.marks` sont le don de
    // bienvenue (50, une fois), un reçu vérifié, une subvention staff. Et **le don vaut exactement
    // le prix du seul article atteignable** : un achat, puis les autres sont hors d'atteinte pour
    // toujours. ⇒ L'écran l'ÉCRIT, dans la bande du bas (`.pied p.mort` de la maquette), en une ligne, quand le solde est à zéro.
    //
    // ⛔ ET LE SECOND MUR, MESURÉ : les MARKS_PACK et SUPPORT sont en argent réel et passent par
    // `iap/purchase/validate`, qui **ne peut créditer dans AUCUN environnement** — la production
    // câble `NullIapReceiptVerifier` (rend toujours null), et l'allow-list du faux vérificateur
    // est VIDE par défaut. Ces articles sont donc montrés DERRIÈRE LA VITRE, sans geste, avec la
    // raison écrite (« Bientôt »). Un bouton qui ne peut pas aboutir est pire qu'un article qu'on ne peut pas prendre.
    //
    // ⚠️ `bonus_pct` compare le **ratio Marks/euro** au pack de base — l'étiquette dit donc
    // « +N % de Marks par euro », jamais « +N % » collé au nombre de Marks : « 600 Marks +20 % »
    // se lit « 720 », et c'est faux. Défaut relevé par le juge sur la maquette, corrigé ici aussi.
    public class ShopScreenController : MonoBehaviour, IShellTenant
    {
        [Header("Backend")]
        private string baseUrlPose;   // posée par un appelant (tests, shell) ; sinon la source unique
        private string baseUrl { get => baseUrlPose ?? MafiaCleanCity.AdresseDuBack.Url; set => baseUrlPose = value; }
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
        /// <summary>La largeur d'une carte de la grille, en unités : (300 − 2 × 10 − 8) / 2 px CSS — la maquette est dessinée pour 300 px CSS = la largeur du canvas.</summary>
        private static float LargeurDeCarte => (Px(300f) - 2f * Px(10f) - Px(8f)) / 2f;

        private static TMP_FontAsset Serif => DesignTokens.Current.hudSerifFont;
        private static TMP_FontAsset Sans => DesignTokens.Current.primaryFont;

        // ═══ La palette de ㉓, lue sur `.vitr6` (ecrans-brennar-6.html @7159e54) — aplats opaques posés tels quels (la maquette ne pose ici aucune opacité : rien à convertir). Les valeurs à moins de 4/255 d'un jeton
        // passent par le jeton (garde Palette) : `#12100e` → nightSocle, `#0c1015` → hudGaugeFaceOuter, `#8d93a0` → onSurfaceSecondaryAlt, `#b9ac92` → hudCremeSecondary, `#d9ab4e` → hudMoneyUnderlineGold. ═══
        private static Color Or => DesignTokens.Current.hudMoneyUnderlineGold;          // `#d9ab4e` — l'enseigne, l'accordé, le médaillon
        private static Color Creme2 => DesignTokens.Current.hudCremeSecondary;          // `#b9ac92` — le bord de l'étiquette de prix
        private static Color Socle => DesignTokens.Current.nightSocle;                  // `#12100e` — la pastille du solde, la bande du bas
        private static Color VitreBas => DesignTokens.Current.hudGaugeFaceOuter;        // `#0c1015` — le bas du fond de la vitre
        private static Color GrisDEtagere => DesignTokens.Current.onSurfaceSecondaryAlt; // `#8d93a0` — l'intitulé d'étagère, la note « Bientôt »
        private static readonly Color32 ComptoirHaut = new Color32(0x2a, 0x23, 0x1f, 255), ComptoirBas = new Color32(0x1b, 0x16, 0x13, 255);
        private static readonly Color32 Laiton = new Color32(0x6b, 0x4f, 0x14, 255);          // le filet du comptoir, le bord de la pastille
        private static readonly Color32 CremeDuTitre = new Color32(0xf0, 0xdf, 0xc4, 255);    // le montant du solde
        private static readonly Color32 VitreHaut = new Color32(0x15, 0x1b, 0x23, 255);
        private static readonly Color32 Rebord = new Color32(0x3a, 0x2e, 0x24, 255);          // le rebord de la planche, le filet de la bande
        private static readonly Color32 OmbreDuRebord = new Color32(0x16, 0x11, 0x0d, 255);
        private static readonly Color32 PlaqueDArticle = new Color32(0x1e, 0x17, 0x1d, 255);  // la médiane du dégradé #221a20 → #1a141a
        private static readonly Color32 BordDArticle = new Color32(0x3a, 0x25, 0x30, 255);
        private static readonly Color32 Papier = new Color32(0xef, 0xe6, 0xd4, 255);          // le nom de l'article, l'étiquette de prix
        private static readonly Color32 PapierTerni = new Color32(0xe6, 0xdb, 0xc9, 255);     // `.etiq.hors`
        private static readonly Color32 EncreDuPapier = new Color32(0x24, 0x1f, 0x1c, 255);   // le montant, le médaillon ; le fond du portrait
        private static readonly Color32 EncreTernie = new Color32(0x75, 0x59, 0x59, 255);
        private static readonly Color32 MagasinFond = new Color32(0x1b, 0x23, 0x2c, 255), MagasinBord = new Color32(0x3f, 0x4a, 0x57, 255), MagasinEncre = new Color32(0x9f, 0xb0, 0xc0, 255);
        private static readonly Color32 VertAcquis = new Color32(0x7f, 0xc9, 0x9a, 255);
        private static readonly Color32 RougeDuManque = new Color32(0xd9, 0x7a, 0x6a, 255);
        private static readonly Color32 BordDuPortrait = new Color32(0x4a, 0x3a, 0x2a, 255);
        private static readonly Color32 EncreMorte = new Color32(0xd0, 0xa8, 0xa0, 255);      // `.mort`

        private enum EtatDEtiquette { Papier, Hors, Magasin }

        private ShopClient client;
        private string token;
        private bool initialise;
        private Transform mountParent;
        private RectTransform etageres;
        private TextMeshProUGUI soldeTexte;
        private GameObject terminalBloc;
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
            // le 2026-09-02, capture à l'appui.
            RectTransform rt = (RectTransform)transform;
            rt.anchorMin = Vector2.zero;
            rt.anchorMax = Vector2.one;
            rt.offsetMin = Vector2.zero;
            rt.offsetMax = Vector2.zero;
            // ⛔⛔ ET L'ORDRE DE FRATRIE DÉCIDE DE CE QU'ON VOIT. Mesuré le 2026-09-02 : l'écran était de la BONNE taille, au BON endroit, sous le BON canvas, et SIX frères se dessinaient par-dessus.
            // ⇒ Un locataire monté en surimpression doit être le DERNIER enfant, sinon il est rendu dessous. Propriété STRUCTURELLE — la seule classe de garde qui ait fermé ce genre de défaut ici.
            transform.SetAsLastSibling();
        }

        /// <summary>⛔⛔ CE HOOK-CI EST LE BON. Lu dans le corps du shell (`AppShell.ConstruireLocataire`) : le composant naît APRÈS le re-parentage, donc `OnTransformParentChanged` ne tirait jamais ; et poser
        /// l'ordre au montage ne suffit pas (des frères s'ajoutent après la fenêtre synchrone). `Start()` s'exécute à la frame SUIVANTE — le premier instant où « être dernier » est stable.
        /// ★ Avant d'écrire un hook, lire le CORPS de ce qui l'appelle, et se demander si l'événement qu'il observe peut seulement se produire.</summary>
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

        /// <summary>HORS RÉSEAU — pour la garde de classe (`Vitrine`) et les harnais : pose le catalogue, le solde et les possessions, puis dessine. Même chemin que `Charger` après ses trois requêtes.</summary>
        public void RendrePourTest(SkuDto[] catalogue, int solde, string[] possedes)
        {
            Init();
            Catalogue = catalogue;
            Solde = solde;
            Possedes = possedes;
            Rendre();
        }

        private void Rendre()
        {
            for (int i = etageres.childCount - 1; i >= 0; i--)
                UnityEngine.Object.Destroy(etageres.GetChild(i).gameObject);

            // ⚠️ -1 signifie « pas lu », 0 signifie « lu, et il est vide ». Les confondre ferait
            // afficher « 0 Mark » à un joueur dont la route a simplement échoué.
            // ㉓ (table 69, client 06a500d4, f2 2026-09-26) : la monnaie s'appelle « Marks » (canon). Le solde connu passe par le
            // gabarit ICU `boutique.bloc.n_marks` ; « — Marks » garde la clé `boutique.bloc.jetons` (valeur changée, clé gardée).
            soldeTexte.text = Solde < 0 ? SoldeInconnu() : NMarks(Solde);
            terminalBloc.SetActive(Solde == 0);

            var possedes = new HashSet<string>(Possedes ?? new string[0]);

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

            // Deux étagères, dans l'ordre de la maquette : les extras (cadre 98, le NOMINAL — ce qu'on peut prendre avec ses Marks), puis la caisse (cadre 99 : les liasses en 2 × 2, le soutien sur une planche large).
            var extras = new List<SkuDto>();
            var liasses = new List<SkuDto>();
            var soutiens = new List<SkuDto>();
            foreach (SkuDto s in Catalogue)
            {
                if (s.kind == "MARKS_PACK") liasses.Add(s);
                else if (s.kind == "SUPPORT") soutiens.Add(s);
                else extras.Add(s);
            }
            // le rang d'une liasse parmi les siennes (par ce qu'elle donne) fait la hauteur de sa pile de pièces (A3)
            var rangs = new Dictionary<string, int>();
            var parTaille = new List<SkuDto>(liasses);
            parTaille.Sort((a, b) => a.marks_granted.CompareTo(b.marks_granted));
            for (int i = 0; i < parTaille.Count; i++) rangs[parTaille[i].sku_id] = i;

            if (extras.Count > 0) Etagere(Lib("Les extras — payés en Marks"), extras, possedes, rangs, false);
            if (liasses.Count > 0) Etagere(Lib("Les Marks — payés au magasin"), liasses, possedes, rangs, false);
            if (soutiens.Count > 0) Etagere(liasses.Count > 0 ? null : Lib("Les Marks — payés au magasin"), soutiens, possedes, rangs, true);
            RendusEffectues++;
        }

        /// <summary>Une ÉTAGÈRE `.etag` : l'intitulé `h3` (qui dit par quoi on paie — B1), la planche, son rebord de bois (3 px) et l'ombre portée (3 px). `titre` nul : une planche de suite (le soutien) sans intitulé.</summary>
        private void Etagere(string titre, List<SkuDto> articles, HashSet<string> possedes, Dictionary<string, int> rangs, bool large)
        {
            GameObject etag = Bloc("Etagere", etageres, false, 0f);
            etag.GetComponent<VerticalLayoutGroup>().padding = new RectOffset((int)Px(10f), (int)Px(10f), (int)Px(9f), 0);
            etag.AddComponent<LayoutElement>().flexibleHeight = 0f;
            if (titre != null)
            {
                TextMeshProUGUI h3 = Ligne(etag.transform, "Titre", titre, 7.5f, GrisDEtagere, Sans, true);
                h3.fontStyle = FontStyles.Bold | FontStyles.UpperCase;
                h3.characterSpacing = 21f;   // 1,6 px sur 7,5 px ≈ .21em
                Espace(etag.transform, Px(7f));
            }
            Planche(etag.transform, articles, possedes, rangs, large);
            Filet(etag.transform, "Rebord", Px(3f), Rebord);
            Filet(etag.transform, "Ombre", Px(3f), OmbreDuRebord);
        }

        /// <summary>LA PLANCHE `.planche` (A1) : la grille à DEUX colonnes (`1fr 1fr`, gouttière 8 CSS px), rangée par rangée ; les deux cartes d'une rangée ont la hauteur de la plus haute (comme la grille CSS) et la même largeur.
        /// Une rangée incomplète garde sa case vide. `large` : une colonne (`.planche.large`, le soutien).</summary>
        private void Planche(Transform etag, List<SkuDto> articles, HashSet<string> possedes, Dictionary<string, int> rangs, bool large)
        {
            GameObject planche = Bloc("Planche", etag, false, Px(8f));
            planche.GetComponent<VerticalLayoutGroup>().padding = new RectOffset(0, 0, 0, (int)Px(9f));
            int parRangee = large ? 1 : 2;
            for (int i = 0; i < articles.Count; i += parRangee)
            {
                GameObject rangee = Bloc("Rangee", planche.transform, true, Px(8f));
                rangee.GetComponent<HorizontalLayoutGroup>().childForceExpandHeight = true;
                for (int j = 0; j < parRangee; j++)
                {
                    if (i + j < articles.Count) Article(rangee.transform, articles[i + j], possedes.Contains(articles[i + j].sku_id), rangs);
                    else CaseVide(rangee.transform);
                }
            }
        }

        /// <summary>UNE CARTE `.art` (A2, A3) : la plaque teintée au bord fin et au rayon 4, le dessin, le nom en serif, ce que la liasse donne, l'étiquette de prix et l'état ; le médaillon de bonus (B2) et l'étiquette ACQUIS
        /// collés dans les angles, hors mise en page. Un article à portée se prend d'un appui sur la carte.</summary>
        private void Article(Transform rangee, SkuDto s, bool possede, Dictionary<string, int> rangs)
        {
            bool argentReel = s.kind == "MARKS_PACK" || s.kind == "SUPPORT";
            bool abordable = !argentReel && Solde >= s.price_marks && s.price_marks > 0;

            GameObject art = new GameObject("Sku_" + s.sku_id, typeof(RectTransform));
            art.transform.SetParent(rangee, false);
            Image fond = art.AddComponent<Image>();
            fond.sprite = ProceduralUI.RoundedRectMask((int)Px(4f));
            fond.type = Image.Type.Sliced;
            fond.color = PlaqueDArticle;
            VerticalLayoutGroup v = art.AddComponent<VerticalLayoutGroup>();
            v.padding = new RectOffset((int)Px(7f), (int)Px(7f), (int)Px(7f), (int)Px(6f));
            v.spacing = Px(4f);
            v.childAlignment = TextAnchor.UpperCenter;
            v.childControlWidth = true; v.childControlHeight = true;
            v.childForceExpandWidth = false; v.childForceExpandHeight = false;
            // deux colonnes ÉGALES : la carte ne réclame aucune largeur propre, la rangée partage la sienne
            LayoutElement le = art.AddComponent<LayoutElement>();
            le.minWidth = 0f; le.preferredWidth = 0f; le.flexibleWidth = 1f;
            Bord(art.transform, ProceduralUI.RoundedRectOutline((int)Px(4f), Px(1f), BordDArticle), Image.Type.Sliced);
            if (possede) art.AddComponent<CanvasGroup>().alpha = 0.62f;   // `.art.pris`

            VitrinePictogrammes.Dessiner(art.transform, VitrinePictogrammes.MotifDe(s.kind, s.sku_id),
                                         rangs.TryGetValue(s.sku_id, out int rang) ? rang : 0, s.sku_id, Px, Serif);

            // ㉓ (table 69) : le nom se lit par la clé COMPOSÉE depuis l'id servi, `boutique.sku.<sku_id>` ; repli compté sur ce que le back sert.
            Colonne(art.transform, "Nom", NomDuSku(s), 9f, Papier, Serif, true);

            // ce que la liasse DONNE (`.accorde`) — par la clé servie (le cadre écrit « + N Marks » : consigné)
            if (s.marks_granted > 0)
            {
                TextMeshProUGUI accorde = Colonne(art.transform, "Donne",
                    MafiaCleanCity.I18n.Libelle.Gabarit("boutique.bloc.donne_n_marks", "donne {n, plural, one {# Mark} other {# Marks}}", N(s.marks_granted)),
                    7f, Or, Sans, true);
                accorde.characterSpacing = 6f;
            }

            // l'étiquette de prix, et l'état qu'elle dit
            if (possede)
            {
                EtiquetteAcquis(art.transform);   // `.acquis` — et plus d'étiquette de prix (cadre 100)
            }
            else if (argentReel)
            {
                Etiquette(art.transform, "DERRIÈRE LA VITRE", EtatDEtiquette.Magasin);
                Colonne(art.transform, "Note", Bientot(), 6.5f, GrisDEtagere, Sans);
            }
            else if (s.price_marks > 0)
            {
                Etiquette(art.transform, NMarks(s.price_marks), abordable ? EtatDEtiquette.Papier : EtatDEtiquette.Hors);
                // `.manque` : la raison, en rouge, sous l'étiquette — les deux refus disent « Marks » (table 69)
                if (!abordable) Colonne(art.transform, "Manque", Solde == 0 ? PlusAucunMark() : PasAssezDeMarks(), 6.5f, RougeDuManque, Sans);
            }

            // ⚠️ `bonus_pct` porte sur le RATIO Marks/euro, pas sur le nombre de Marks.
            if (s.bonus_pct > 0)
                Medaillon(art.transform, MafiaCleanCity.I18n.Libelle.Gabarit("boutique.bloc.bonus_de_marks_par_euro", "+{bonus} % de Marks par euro",
                    new Dictionary<string, string> { { "bonus", s.bonus_pct.ToString(System.Globalization.CultureInfo.InvariantCulture) } }));

            if (abordable)
            {
                Button bouton = art.AddComponent<Button>();
                bouton.targetGraphic = fond;
                string skuId = s.sku_id;
                bouton.onClick.AddListener(() => StartCoroutine(Acheter(skuId)));
            }
        }

        /// <summary>L'ÉTIQUETTE DE PRIX `.etiq`, pendue sous le nom : plaque de papier au bord fin (rayon 2), le jeton et le montant ; `.hors` = papier terni, bord POINTILLÉ, encre éteinte ; `.magasin` = plaque sombre
        /// bleutée, sans jeton, lettrée en petites capitales.</summary>
        private void Etiquette(Transform art, string texte, EtatDEtiquette etat)
        {
            GameObject e = new GameObject("Etiquette", typeof(RectTransform));
            e.transform.SetParent(art, false);
            Image fond = e.AddComponent<Image>();
            fond.sprite = ProceduralUI.RoundedRectMask((int)Px(2f));
            fond.type = Image.Type.Sliced;
            fond.color = etat == EtatDEtiquette.Magasin ? (Color)MagasinFond : etat == EtatDEtiquette.Hors ? (Color)PapierTerni : (Color)Papier;
            fond.raycastTarget = false;
            HorizontalLayoutGroup h = e.AddComponent<HorizontalLayoutGroup>();
            h.padding = new RectOffset((int)Px(6f), (int)Px(6f), (int)Px(2f), (int)Px(2f));
            h.spacing = Px(4f);
            h.childAlignment = TextAnchor.MiddleLeft;
            h.childControlWidth = true; h.childControlHeight = true;
            h.childForceExpandWidth = false; h.childForceExpandHeight = false;
            e.AddComponent<LayoutElement>().flexibleWidth = 0f;
            // ⛔ LE TYPE SUIT LE SPRITE : le trait continu veut `Sliced`, le pointillé veut `Tiled` (sa section centrale porte UNE période, `Sliced` l'étirerait en barre).
            if (etat == EtatDEtiquette.Hors)
                Bord(e.transform, ProceduralUI.RoundedRectDashedOutline((int)Px(2f), Px(1f), (int)Px(3f), (int)Px(2f), Creme2), Image.Type.Tiled);
            else
                Bord(e.transform, ProceduralUI.RoundedRectOutline((int)Px(2f), Px(1f), etat == EtatDEtiquette.Magasin ? (Color)MagasinBord : Creme2), Image.Type.Sliced);
            if (etat != EtatDEtiquette.Magasin) VitrinePictogrammes.Jeton(e.transform, 11f, Px);
            TextMeshProUGUI montant = Ligne(e.transform, "Montant", texte,
                etat == EtatDEtiquette.Magasin ? 7.5f : 9f,
                etat == EtatDEtiquette.Magasin ? (Color)MagasinEncre : etat == EtatDEtiquette.Hors ? (Color)EncreTernie : (Color)EncreDuPapier,
                Sans, true);
            if (etat == EtatDEtiquette.Magasin) montant.characterSpacing = 4f;
        }

        /// <summary>LE MÉDAILLON DE BONUS `.bonus` (B2) : plaque or collée dans l'angle HAUT-DROIT de la carte (5 px), encre sombre, texte à droite plié dans 60 % de la carte — la plaque épouse les lignes pliées
        /// (mesurées par TMP), pas la largeur du pli.</summary>
        private void Medaillon(Transform art, string texte)
        {
            GameObject m = new GameObject("Bonus", typeof(RectTransform));
            m.transform.SetParent(art, false);
            m.AddComponent<LayoutElement>().ignoreLayout = true;
            RectTransform rt = (RectTransform)m.transform;
            rt.anchorMin = rt.anchorMax = new Vector2(1f, 1f);
            rt.pivot = new Vector2(1f, 1f);
            rt.anchoredPosition = new Vector2(-Px(5f), -Px(5f));
            Image fond = m.AddComponent<Image>();
            fond.sprite = ProceduralUI.RoundedRectMask((int)Px(2f));
            fond.type = Image.Type.Sliced;
            fond.color = Or;
            fond.raycastTarget = false;
            VerticalLayoutGroup v = m.AddComponent<VerticalLayoutGroup>();
            v.padding = new RectOffset((int)Px(4f), (int)Px(4f), (int)Px(1f), (int)Px(1f));
            v.childControlWidth = true; v.childControlHeight = true;
            v.childForceExpandWidth = false; v.childForceExpandHeight = false;
            ContentSizeFitter fitter = m.AddComponent<ContentSizeFitter>();
            fitter.horizontalFit = ContentSizeFitter.FitMode.PreferredSize;
            fitter.verticalFit = ContentSizeFitter.FitMode.PreferredSize;
            TextMeshProUGUI t = Ligne(m.transform, "Texte", texte, 6.5f, EncreDuPapier, Sans, true, TextAlignmentOptions.Right);
            t.enableWordWrapping = true;
            float plafond = 0.6f * LargeurDeCarte - 2f * Px(4f);
            Vector2 libre = t.GetPreferredValues(texte);
            Vector2 mesure = libre.x > plafond ? t.GetPreferredValues(texte, plafond, Mathf.Infinity) : libre;
            if (float.IsNaN(mesure.x) || mesure.x <= 0f || float.IsNaN(mesure.y) || mesure.y <= 0f) mesure = new Vector2(plafond, 3f * Px(6.5f) * 1.35f);
            LayoutElement le = t.GetComponent<LayoutElement>();
            le.preferredWidth = Mathf.Ceil(Mathf.Min(mesure.x, plafond)) + 1f;
            le.preferredHeight = Mathf.Ceil(mesure.y);
        }

        /// <summary>L'ÉTIQUETTE « ACQUIS » `.acquis` : cerne vert fin, lettres vertes espacées, collée dans l'angle HAUT-GAUCHE (6 px), légèrement tournée (−6° CSS = +6° écran). Hors mise en page.</summary>
        private void EtiquetteAcquis(Transform art)
        {
            GameObject a = new GameObject("Acquis", typeof(RectTransform));
            a.transform.SetParent(art, false);
            a.AddComponent<LayoutElement>().ignoreLayout = true;
            RectTransform rt = (RectTransform)a.transform;
            rt.anchorMin = rt.anchorMax = new Vector2(0f, 1f);
            rt.pivot = new Vector2(0f, 1f);
            rt.anchoredPosition = new Vector2(Px(6f), -Px(6f));
            rt.localEulerAngles = new Vector3(0f, 0f, 6f);
            Image cerne = a.AddComponent<Image>();
            cerne.sprite = ProceduralUI.RoundedRectOutline((int)Px(2f), Px(1.4f), VertAcquis);
            cerne.type = Image.Type.Sliced;
            cerne.raycastTarget = false;
            HorizontalLayoutGroup h = a.AddComponent<HorizontalLayoutGroup>();
            h.padding = new RectOffset((int)Px(5f), (int)Px(5f), (int)Px(1f), (int)Px(1f));
            h.childControlWidth = true; h.childControlHeight = true;
            h.childForceExpandWidth = false; h.childForceExpandHeight = false;
            ContentSizeFitter fitter = a.AddComponent<ContentSizeFitter>();
            fitter.horizontalFit = ContentSizeFitter.FitMode.PreferredSize;
            fitter.verticalFit = ContentSizeFitter.FitMode.PreferredSize;
            Ligne(a.transform, "Texte", "ACQUIS", 6.5f, VertAcquis, Sans, true).characterSpacing = 12f;
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

            // B3 + A4 : la racine est une PILE (gabarit `EnteteDEcran.PoserLaPile`, marges d'écran haut/bas du shell) : le comptoir en tête, la vitre qui défile et prend le reste, la bande basse en pied.
            EnteteDEcran.PoserLaPile(gameObject, (int)ShellChrome.TopInsetPx, (int)ShellChrome.BottomInsetPx);
            ConstruireLeComptoir();
            ConstruireLaVitre();
            ConstruireLaBande();
        }

        /// <summary>LE COMPTOIR `.compt` (B3) : plaque bronze en dégradé (#2a231f → #1b1613), fermée par un filet de laiton de 2 px ; l'enseigne « LA VITRINE » en serif or lettrée à GAUCHE, le solde en pastille à DROITE
        /// (`.solde` : socle sombre, bord de laiton, rayon 4, le jeton et le montant en crème) — sur la MÊME ligne.</summary>
        private void ConstruireLeComptoir()
        {
            GameObject comptoir = new GameObject("Comptoir", typeof(RectTransform));
            comptoir.transform.SetParent(transform, false);
            Image fond = comptoir.AddComponent<Image>();
            fond.sprite = ProceduralUI.VerticalGradient((int)Px(32f), ComptoirHaut, ComptoirBas);
            fond.type = Image.Type.Simple;
            fond.raycastTarget = false;
            HorizontalLayoutGroup h = comptoir.AddComponent<HorizontalLayoutGroup>();
            h.padding = new RectOffset((int)Px(12f), (int)Px(12f), (int)Px(9f), (int)Px(9f) + (int)Px(2f));
            h.spacing = Px(8f);
            h.childAlignment = TextAnchor.MiddleLeft;
            h.childControlWidth = true; h.childControlHeight = true;
            h.childForceExpandWidth = false; h.childForceExpandHeight = false;
            comptoir.AddComponent<LayoutElement>().flexibleHeight = 0f;

            TextMeshProUGUI enseigne = Ligne(comptoir.transform, "Titre", "LA VITRINE", 11f, Or, Serif, true);
            enseigne.characterSpacing = 22f;   // 2,4 px sur 11 px ≈ .22em
            enseigne.GetComponent<LayoutElement>().flexibleWidth = 1f;   // pousse la pastille à droite

            GameObject solde = new GameObject("Solde", typeof(RectTransform));
            solde.transform.SetParent(comptoir.transform, false);
            Image sf = solde.AddComponent<Image>();
            sf.sprite = ProceduralUI.RoundedRectMask((int)Px(4f));
            sf.type = Image.Type.Sliced;
            sf.color = Socle;
            sf.raycastTarget = false;
            HorizontalLayoutGroup hs = solde.AddComponent<HorizontalLayoutGroup>();
            hs.padding = new RectOffset((int)Px(8f), (int)Px(8f), (int)Px(4f), (int)Px(4f));
            hs.spacing = Px(5f);
            hs.childAlignment = TextAnchor.MiddleLeft;
            hs.childControlWidth = true; hs.childControlHeight = true;
            hs.childForceExpandWidth = false; hs.childForceExpandHeight = false;
            solde.AddComponent<LayoutElement>().flexibleWidth = 0f;
            Bord(solde.transform, ProceduralUI.RoundedRectOutline((int)Px(4f), Px(1f), Laiton), Image.Type.Sliced);
            VitrinePictogrammes.Jeton(solde.transform, 13f, Px);
            soldeTexte = Ligne(solde.transform, "Montant", SoldeInconnu(), 13f, CremeDuTitre, Sans, true);

            // le filet de laiton, hors mise en page, collé au bord bas de la plaque
            GameObject filet = new GameObject("Filet", typeof(RectTransform));
            filet.transform.SetParent(comptoir.transform, false);
            filet.AddComponent<LayoutElement>().ignoreLayout = true;
            RectTransform fr = (RectTransform)filet.transform;
            fr.anchorMin = new Vector2(0f, 0f); fr.anchorMax = new Vector2(1f, 0f); fr.pivot = new Vector2(0.5f, 0f);
            fr.sizeDelta = new Vector2(0f, Px(2f)); fr.anchoredPosition = Vector2.zero;
            Image fi = filet.AddComponent<Image>();
            fi.color = Laiton; fi.raycastTarget = false;
        }

        /// <summary>LA VITRE `.vitre` : le fond en dégradé (#151b23 → #0c1015), la fenêtre qui prend toute la hauteur restante et DÉFILE (cause 7 : fondu + ascenseur par `ListeDefilante`), les étagères empilées dedans.
        /// ⛔ `RectMask2D` découpe par RECTANGLE (un `Mask` découpe par le canal alpha de son Graphic : le pochoir quasi transparent posé autrefois écartait ce qu'il devait garder).
        /// ⛔ Un RectTransform NEUF a un sizeDelta de (100, 100) et des ancres étirées s'y AJOUTENT : la liste débordait de 50 px de chaque côté — mesuré, pas supposé.</summary>
        private void ConstruireLaVitre()
        {
            GameObject vue = new GameObject("Defilement", typeof(RectTransform));
            vue.transform.SetParent(transform, false);
            Image fond = vue.AddComponent<Image>();
            fond.sprite = ProceduralUI.VerticalGradient((int)Px(200f), VitreHaut, VitreBas);
            fond.type = Image.Type.Simple;
            fond.raycastTarget = true;   // le glissement se prend sur la vitre
            vue.AddComponent<RectMask2D>();
            LayoutElement vueLe = vue.AddComponent<LayoutElement>();
            vueLe.flexibleHeight = 1f; vueLe.minHeight = 0f;
            ScrollRect defil = vue.AddComponent<ScrollRect>();
            defil.horizontal = false;
            defil.movementType = ScrollRect.MovementType.Clamped;
            defil.scrollSensitivity = Px(20f);

            GameObject liste = Bloc("Etageres", vue.transform, false, 0f);
            RectTransform listeRt = (RectTransform)liste.transform;
            listeRt.anchorMin = new Vector2(0f, 1f);
            listeRt.anchorMax = new Vector2(1f, 1f);
            listeRt.pivot = new Vector2(0.5f, 1f);
            listeRt.sizeDelta = new Vector2(0f, 0f);
            liste.AddComponent<ContentSizeFitter>().verticalFit = ContentSizeFitter.FitMode.PreferredSize;
            defil.content = listeRt;
            defil.viewport = (RectTransform)vue.transform;
            ListeDefilante.Indiquer(defil, VitreBas);
            etageres = listeRt;

            // l'état vide, dans la vitre, hors du contenu qui se rebâtit
            videTexte = Colonne(vue.transform, "Vide", "", 11f, Papier, Serif);
            RectTransform vr = (RectTransform)videTexte.transform;
            vr.anchorMin = new Vector2(0f, 1f); vr.anchorMax = new Vector2(1f, 1f); vr.pivot = new Vector2(0.5f, 1f);
            vr.offsetMin = new Vector2(Px(16f), -Px(60f)); vr.offsetMax = new Vector2(-Px(16f), -Px(24f));
            videTexte.gameObject.SetActive(false);
        }

        /// <summary>LA BANDE BASSE `.voix` (A4) : la plaque et son filet par `PiedDEcran.BandeDeVoix` ; le cadre rond du portrait `.av` ; la colonne de la voix — VIDE : la voix du lieutenant (Wexler, « derrière le
        /// comptoir », sa réplique) n'est pas servie (TD-823) et rien n'est posé à sa place. La seule ligne qu'elle porte : la note de l'état terminal (`.pied p.mort`), quand le solde est à zéro.</summary>
        private void ConstruireLaBande()
        {
            GameObject bas = PiedDEcran.BandeDeVoix(transform, Px, Socle, Rebord);

            GameObject portrait = new GameObject("Portrait", typeof(RectTransform));
            portrait.transform.SetParent(bas.transform, false);
            LayoutElement pl = portrait.AddComponent<LayoutElement>();
            pl.preferredWidth = Px(32f); pl.preferredHeight = Px(32f); pl.minWidth = Px(32f); pl.flexibleWidth = 0f;
            Image pf = portrait.AddComponent<Image>();
            pf.sprite = ProceduralUI.RadialDisc((int)Px(32f), EncreDuPapier, EncreDuPapier);
            pf.raycastTarget = false;
            Bord(portrait.transform, ProceduralUI.Ring((int)Px(32f), Px(1f), BordDuPortrait), Image.Type.Simple);

            GameObject colonne = Bloc("Voix", bas.transform, false, Px(3f));
            colonne.AddComponent<LayoutElement>().flexibleWidth = 1f;

            // `.mort` : filet gauche rouge de 2 px, retrait de 6 px, encre rosée
            terminalBloc = Bloc("Terminal", colonne.transform, false, 0f);
            terminalBloc.GetComponent<VerticalLayoutGroup>().padding = new RectOffset((int)Px(8f), 0, 0, 0);
            GameObject filet = new GameObject("Filet", typeof(RectTransform));
            filet.transform.SetParent(terminalBloc.transform, false);
            filet.AddComponent<LayoutElement>().ignoreLayout = true;
            RectTransform fr = (RectTransform)filet.transform;
            fr.anchorMin = new Vector2(0f, 0f); fr.anchorMax = new Vector2(0f, 1f); fr.pivot = new Vector2(0f, 0.5f);
            fr.sizeDelta = new Vector2(Px(2f), 0f); fr.anchoredPosition = Vector2.zero;
            Image fi = filet.AddComponent<Image>();
            fi.color = RougeDuManque; fi.raycastTarget = false;
            Colonne(terminalBloc.transform, "Note", "le don de bienvenue ne se reçoit qu'une fois — rien ne recrédite en jouant",
                    7f, EncreMorte, Sans, false, TextAlignmentOptions.Left);
            terminalBloc.SetActive(false);
        }

        // ═══ outillage de mise en page ═══

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

        /// <summary>Un cerne (ou un contour) posé sur tout le pourtour du parent, hors mise en page : la couleur est CUITE dans le sprite. ⛔ Le `CanvasRenderer` d'abord (sans lui rien ne dessine).</summary>
        private static Image Bord(Transform parent, Sprite sprite, Image.Type type)
        {
            GameObject go = new GameObject("Bord", typeof(RectTransform));
            go.transform.SetParent(parent, false);
            go.AddComponent<LayoutElement>().ignoreLayout = true;
            RectTransform rt = (RectTransform)go.transform;
            rt.anchorMin = Vector2.zero; rt.anchorMax = Vector2.one; rt.offsetMin = rt.offsetMax = Vector2.zero;
            if (go.GetComponent<CanvasRenderer>() == null) go.AddComponent<CanvasRenderer>();
            Image im = go.AddComponent<Image>();
            im.sprite = sprite; im.type = type; im.raycastTarget = false;
            return im;
        }

        private static void Filet(Transform parent, string nom, float hauteur, Color couleur)
        {
            GameObject go = new GameObject(nom, typeof(RectTransform));
            go.transform.SetParent(parent, false);
            LayoutElement le = go.AddComponent<LayoutElement>();
            le.preferredHeight = hauteur; le.minHeight = hauteur; le.flexibleHeight = 0f;
            if (go.GetComponent<CanvasRenderer>() == null) go.AddComponent<CanvasRenderer>();
            Image im = go.AddComponent<Image>();
            im.color = couleur; im.raycastTarget = false;
        }

        private static void Espace(Transform parent, float hauteur)
        {
            GameObject go = new GameObject("Espace", typeof(RectTransform));
            go.transform.SetParent(parent, false);
            LayoutElement le = go.AddComponent<LayoutElement>();
            le.preferredHeight = hauteur; le.minHeight = hauteur; le.flexibleHeight = 0f;
        }

        private static void CaseVide(Transform rangee)
        {
            GameObject go = new GameObject("CaseVide", typeof(RectTransform));
            go.transform.SetParent(rangee, false);
            LayoutElement le = go.AddComponent<LayoutElement>();
            le.minWidth = 0f; le.preferredWidth = 0f; le.flexibleWidth = 1f;
        }

        /// <summary>Un texte d'UNE ligne qui ÉPOUSE sa largeur (l'enseigne, un montant, un intitulé) : TMP dit sa largeur, la hauteur de ligne est DÉCLARÉE (⛔ sans hauteur déclarée, un texte imbriqué ne prend pas de
        /// place et tout se superpose — mesuré à la capture du 2026-09-02 : neuf articles dessinés au même endroit, sans une erreur).</summary>
        private static TextMeshProUGUI Ligne(Transform parent, string nom, string valeur, float tailleCss, Color couleur, TMP_FontAsset police,
                                             bool gras = false, TextAlignmentOptions alignement = TextAlignmentOptions.Left)
        {
            TextMeshProUGUI t = NouveauTexte(parent, nom, valeur, tailleCss, couleur, police, gras, alignement);
            t.enableWordWrapping = false;
            t.GetComponent<LayoutElement>().preferredHeight = Px(tailleCss) * 1.35f;
            return t;
        }

        /// <summary>Un texte qui prend TOUTE la largeur de sa colonne et se PLIE (le nom d'un article, une raison, une note) : la hauteur est celle que TMP mesure au pli, à la largeur que la colonne lui donne.</summary>
        private static TextMeshProUGUI Colonne(Transform parent, string nom, string valeur, float tailleCss, Color couleur, TMP_FontAsset police,
                                               bool gras = false, TextAlignmentOptions alignement = TextAlignmentOptions.Center)
        {
            TextMeshProUGUI t = NouveauTexte(parent, nom, valeur, tailleCss, couleur, police, gras, alignement);
            t.enableWordWrapping = true;
            LayoutElement le = t.GetComponent<LayoutElement>();
            le.preferredWidth = 0f; le.flexibleWidth = 1f;
            return t;
        }

        private static TextMeshProUGUI NouveauTexte(Transform parent, string nom, string valeur, float tailleCss, Color couleur, TMP_FontAsset police,
                                                    bool gras, TextAlignmentOptions alignement)
        {
            GameObject go = new GameObject(nom, typeof(RectTransform));
            go.transform.SetParent(parent, false);
            if (go.GetComponent<CanvasRenderer>() == null) go.AddComponent<CanvasRenderer>();
            TextMeshProUGUI t = go.AddComponent<TextMeshProUGUI>();
            t.font = police;
            t.fontSize = Px(tailleCss);
            t.color = couleur;
            t.text = valeur;
            t.alignment = alignement;
            t.raycastTarget = false;
            if (gras) t.fontStyle = FontStyles.Bold;
            go.AddComponent<LayoutElement>();
            return t;
        }

        // ═══ les mots ═══

        /// <summary>Item 0.6 — les littéraux STATIQUES passent par `boutique.bloc.<slug>`, repli
        /// sur le littéral.
        /// ⚠️ Jamais une chaîne assemblée avec une valeur : celle-là passe par un gabarit ICU à clé
        /// explicite (`NMarks`, table 69).</summary>
        private static string Lib(string litteral) =>
            MafiaCleanCity.I18n.Libelle.De("boutique", "bloc", litteral);

        /// <summary>㉓ (table 69) : « — Marks », le solde INCONNU. Valeur changée, clé gardée : `boutique.bloc.jetons` (le slug de
        /// l'ancien littéral) — d'où `Gabarit` et non `Lib`, qui ferait suivre la clé au mot.</summary>
        private static string SoldeInconnu() =>
            MafiaCleanCity.I18n.Libelle.Gabarit("boutique.bloc.jetons", "— Marks");

        /// <summary>㉓ (table 69) : un nombre de Marks — le solde connu et le prix. Gabarit ICU pluriel, jamais « {n} » collé à un mot.</summary>
        private static string NMarks(int n) =>
            MafiaCleanCity.I18n.Libelle.Gabarit("boutique.bloc.n_marks", "{n, plural, one {# Mark} other {# Marks}}", N(n));

        private static Dictionary<string, string> N(int n) =>
            new Dictionary<string, string> { { "n", n.ToString(System.Globalization.CultureInfo.InvariantCulture) } };

        /// <summary>㉓ (passe UX 2026-09-26, table 63 v2 ; R3/D24 « les garder, marqués bientôt ») : le pack en argent réel reste visible, marqué « Bientôt » — plus la phrase technique du vérificateur de reçu.</summary>
        private static string Bientot() => MafiaCleanCity.I18n.Libelle.Gabarit("boutique.bloc.bientot", "Bientôt");

        /// <summary>㉓ (table 69) : les deux refus d'achat disent « Marks ».</summary>
        private static string PlusAucunMark() =>
            MafiaCleanCity.I18n.Libelle.Gabarit("boutique.bloc.plus_aucun_mark_et_rien_n_en_redonne", "plus aucun Mark, et rien n’en redonne");

        private static string PasAssezDeMarks() =>
            MafiaCleanCity.I18n.Libelle.Gabarit("boutique.bloc.pas_assez_de_marks", "pas assez de Marks");

        /// <summary>㉓ (table 69) : le nom d'un article, par `boutique.sku.<sku_id>` (clé composée depuis l'id SERVI, telle quelle) ;
        /// repli compté sur ce que le back sert.</summary>
        private static string NomDuSku(SkuDto s)
        {
            string servi = string.IsNullOrEmpty(s.display_name) ? s.sku_id : s.display_name;
            return string.IsNullOrEmpty(s.sku_id) ? servi : MafiaCleanCity.I18n.Libelle.Gabarit("boutique.sku." + s.sku_id, servi);
        }
    }
}
