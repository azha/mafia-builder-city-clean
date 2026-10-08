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
    // décision structurelle de la session (`structural_budget`). Le geste : « les lire maintenant » (appui long — `commit`). « Laisser
    // sur le zinc » (`skip`) est RETIRÉ (f2 08/10 nuit, option (c)) : un GESTE MORT — 200, puis rien — et le back ne sert aucune carte
    // suivante (la carte sautée est reportée telle quelle). Écart à la maquette ASSUMÉ par f2, à consigner au dossier de ⑤.
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
        private string baseUrlPose;   // posée par un appelant (tests, shell) ; sinon la source unique
        private string baseUrl { get => baseUrlPose ?? MafiaCleanCity.AdresseDuBack.Url; set => baseUrlPose = value; }
        // ---- sondes de test ---------------------------------------------------
        public HlCardDto CarteAffichee { get; private set; }
        public bool EtatSabot { get; private set; }
        public int CommitCount { get; private set; }
        public string DerniereErreur { get; private set; }
        /// <summary>La phrase du dernier refus, MONTRÉE au joueur (servie, sinon celle de la carte) ; null sans refus.</summary>
        public string RefusRendu { get; private set; }
        /// <summary>⛔ GESTE MORT fermé (f2 08/10 nuit) : le tampon postait le commit et l'écran restait tel quel. Levé après un commit ACCEPTÉ : le
        /// shell referme cette surimpression et remonte l'Accueil, relu (la carte tranchée n'y est plus).</summary>
        public event System.Action OnDecisionTranchee;
        /// <summary>Crochet de test : combien de décisions ACCEPTÉES ont levé `OnDecisionTranchee`.</summary>
        public int DecisionsTranchees { get; private set; }
        public LongPressButton BoutonLire { get; private set; }

        private const float K = 1280f / 300f;
        private static float Px(float cssPx) => cssPx * K;

        // ⑤ / TD-612 — QUATRE DE CES CINQ COULEURS RECOPIAIENT LA VALEUR D'UN TOKEN NOMMÉ.
        // Valeur juste, chemin faux : l'écran rendait la bonne teinte et aucune garde ne pouvait
        // le voir — les allowlists comptent les ACCÈS à `DesignTokens.Current.*`, et un littéral
        // n'en est pas un. Appariement MESURÉ (`Tools/apparier-litteraux-aux-tokens.py`), toutes
        // à distance 0,00 — et par la VALEUR, jamais par le nom : « Or » n'est pas `accentGold`
        // (celui-là est à 47 d'ici) mais `hudMoneyUnderlineGold`.
        // ⛔⛔ FORME `=>`, JAMAIS `= …` : un `static readonly Color = DesignTokens.Current.X`
        //    s'évalue à l'initialisation du TYPE, en contexte de constructeur, où le
        //    `Resources.Load` de `DesignTokens.Current` JETTE. Ce dépôt a mesuré 65 champs de
        //    cette forme verts en run complet et rouges en run scopé à froid.
        private static Color Creme  => DesignTokens.Current.hudCreme;              // #eae0c8
        private static Color Creme2 => DesignTokens.Current.hudCremeSecondary;     // #b9ad92
        private static Color Or     => DesignTokens.Current.hudMoneyUnderlineGold; // #d9ab4e
        private static Color OrVif  => DesignTokens.Current.hudMoneyGold;          // #f2c96b
        // La cinquième reste un littéral : son token le plus proche est à 37,8 — c'est une couleur
        // propre à cet écran, pas une recopie. La convertir demanderait de CRÉER un token, donc un
        // arbitrage de palette qui appartient à l'atelier. *Substituer ne serait pas ranger.*
        private static readonly Color Rouge = Hex("#93402c");
        /// <summary>⑤ F5 — LE LISERÉ INTÉRIEUR DE LA CARTE est OR : `.carte-or{box-shadow:inset 0 0 0 4px #fbf3dc,inset 0 0 0 5px #b08d3e}` (`ecrans-brennar-6.html:245`). Aucun état de la maquette ne le fait
        /// rouge (`.tranchee` ne fait que `saturate(.8)`) ; le rouge brique `#93402c` est celui du coin, du titre, des pips, des bandes. Mesuré (juge r3, `m05d`) : maquette (176,141,62), jeu (147,64,44).
        /// Le laiton du jeton, `hudHairlineGold` (`#b08d3e`).</summary>
        public static Color FiletDeLaCarte => DesignTokens.Current.hudHairlineGold;

        // ⑤ F4 (CLIENT-3 / juge r1, décision de f2 du 07/10 : « fidèle à la maquette ») — la MATIÈRE CRÈME de la carte. La carte était un CONTOUR sans matière (`RoundedRectOutline` seul : l'intérieur transparent
        // laissait voir le zinc noir) : 0 px crème en jeu. Mesure du juge : matière de la carte REF (219,206,171).
        // ⑤ F7 (juge d'ensemble r2, 08/10) — LE GESTE PRINCIPAL N'EST PLUS UNE PLAQUE CRÈME : la série 4 (`.tampon`, crème / brique) a été remplacée par la série 6, dont le cadre 5 ne porte que la
        // `.plaque-laiton` (`ecrans-brennar-6.html:263-264`) : `linear-gradient(180deg,#e8c87a,#b08d3e 55%,#8a6a22)`, bord 1 px `#6b4a12` rayon 6 (POSÉ par `Filets`, recette `PlaqueLaiton`), encre `#3a2a0a`,
        // `small` en `#3a2a0acc`. `PiedDEcran.PlaqueCreme` reste, pour ⑮ DÉPOSER.
        /// <summary>La matière de la carte : REF (219,206,171). Aplat opaque (aucune conversion sRGB → linéaire).</summary>
        public static Color MatiereDeLaCarte => new Color32(219, 206, 171, 255);
        /// <summary>`.plaque-laiton` : les trois arrêts du dégradé vertical (180°) — clair `#e8c87a` à 0 %, le laiton du jeton `hudHairlineGold` (`#b08d3e`, = le remplissage médian mesuré (173,138,60)) à 55 %, sombre `#8a6a22` à 100 %.
        /// Des pixels OPAQUES cuits dans le sprite : aucune opacité à convertir pour le mélange linéaire.</summary>
        public static (float pos, Color c)[] DegradeDeLaPlaque() => new[]
        {
            (0f, Hex("#e8c87a")), (0.55f, DesignTokens.Current.hudHairlineGold), (1f, Hex("#8a6a22")),
        };
        /// <summary>L'encre de la plaque laiton (`#3a2a0a`) — le libellé « LES LIRE MAINTENANT ».</summary>
        public static Color EncreDeLaPlaque => Hex("#3a2a0a");
        /// <summary>Où, dans la hauteur de la plaque, se tient la sous-ligne : 10 CSS de marge + le libellé (≈ 14) + 2 + la moitié de la sous-ligne, sur ≈ 48 CSS.</summary>
        private const float PositionDeLaSousLigne = 0.7f;
        /// <summary>`small{color:#3a2a0acc}` : l'encre à 80 % d'opacité. L'opacité CSS recopiée sur du texte ferait un mélange LINÉAIRE plus pâle que le navigateur, et déplacer la couleur à opacité conservée
        /// ne peut pas être exact sur un fond qui varie (le dégradé) : la couleur est donc l'OPAQUE que le navigateur produit (mélange sRGB de l'encre sur le dégradé à la hauteur de la sous-ligne).</summary>
        public static Color EncreDeLaSousLigne()
        {
            Color fond = ProceduralUI.EchantillonDeDegrade(DegradeDeLaPlaque(), PositionDeLaSousLigne);
            Color m = Color.Lerp(fond, EncreDeLaPlaque, 0.8f);
            m.a = 1f;
            return m;
        }
        /// <summary>L'encre sombre sur la matière crème (le titre) et sa version affaiblie (les libellés) — l'encre de la carte de la maquette.</summary>
        private static Color Encre => Hex("#2a1c12");
        private static Color EncreFaible => Hex("#6f5f4d");

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
        /// <summary>L'inclinaison de la carte, en degrés — `+` = sens trigonométrique (le haut
        /// part vers la gauche), la convention d'Unity. Mesurée à 2,00° sur la référence par le
        /// juge ⊥ (F14) ; le sens est lu sur l'image, jamais déduit de la magnitude.</summary>
        private const float InclinaisonCarteDeg = 2f;

        private RectTransform pipsPortee, pipsUrgence;
        private TextMeshProUGUI porteeLibelle, urgenceLibelle, sabotTexte, grave;
        private RectTransform pile;
        private ListeDefilante listeDefilante;
        private PileDeDecision pileDeDecision;
        /// <summary>La FENÊTRE défilante de la pile (`ListeDefilante`) — lue par les gardes (le contenu qui dépasse défile, il n'est ni tranché ni imprimé sur le reste).</summary>
        public ListeDefilante FenetreDefilante => listeDefilante;
        /// <summary>Le calcul de la pile : hauteur préférée, fenêtre, haut du feutre (gardes).</summary>
        public PileDeDecision LaPile => pileDeDecision;
        /// <summary>La carte (portrait, `.carte-or`) — lue par les gardes de géométrie.</summary>
        public RectTransform CarteRect => carteRoot;

        /// <summary>⑤ l'état SABOT — classe « moment en dur » (f2 26/09, table 78) : le moment suit day_phase SERVI (PhaseDeSession).</summary>
        public static string PhraseDuSabot() =>
            MafiaCleanCity.I18n.Moment.Dire("decision.moment.vide", PhaseDeSession.DayPhase, new System.Collections.Generic.Dictionary<string, string>
            {
                { "DAWN", "Rien ne se détache du sabot ce matin." },
                { "DAY", "Rien ne se détache du sabot aujourd\u2019hui." },
                { "DUSK", "Rien ne se détache du sabot ce soir." },
                { "NIGHT", "Rien ne se détache du sabot cette nuit." },
            }, "Rien ne se détache du sabot pour l\u2019instant.");
        private GameObject tampon;

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
            grave.gameObject.SetActive(carte != null);
            if (carte == null) sabotTexte.text = PhraseDuSabot();   // la phase servie peut avoir changé depuis le montage
            sabotTexte.gameObject.SetActive(carte == null);
            tampon.SetActive(carte != null);
            if (carte == null) return;

            bool structurelle = carte.structural;
            coinLibelle.text = structurelle ? "structurelle" : "tactique";
            titre.text = LibellesDecision.Type(carte.decision_type_key);
            noteZinc.text = structurelle
                ? "Structurelle — trancher consomme votre décision de la session."
                : "Tactique — trancher ne touche pas à votre décision structurelle.";

            RemplirPips(pipsPortee, porteeLibelle, carte.impact_bucket, urgence: false);
            RemplirPips(pipsUrgence, urgenceLibelle, carte.urgency_bucket, urgence: true);

            // Le jeton : la décision structurelle de la session. `used`/`cap_reached` sont les deux
            // seules clés servies — on n'invente ni total ni reste.
            bool pris = budget != null && budget.cap_reached;
            jetonChiffre.text = pris ? "0" : "1";
            jetonEtat.text = pris ? "pris" : "libre";
            jetonEtat.color = pris ? Creme2 : OrVif;
        }

        private static Sprite Disque => ProceduralUI.RadialDisc((int)Px(7f), Color.white, Color.white);
        private static Sprite Anneau => ProceduralUI.Ring((int)Px(7f), Px(1f), Color.white);

        /// <summary>Un cerne de `epaisseur` u autour d'une surface (le contour arrondi de la maquette), en enfant HORS mise en page, posé EN PREMIER (sous les textes), à `retrait` u du bord. Idempotent par nom.</summary>
        private static void Cerner(Transform parent, string nom, int rayon, float epaisseur, Color couleur, float retrait)
        {
            if (parent.Find(nom) != null) return;
            GameObject go = new GameObject(nom, typeof(RectTransform), typeof(CanvasRenderer));
            go.transform.SetParent(parent, false);
            go.transform.SetAsFirstSibling();
            go.AddComponent<LayoutElement>().ignoreLayout = true;
            RectTransform rt = (RectTransform)go.transform;
            rt.anchorMin = Vector2.zero; rt.anchorMax = Vector2.one;
            rt.offsetMin = new Vector2(retrait, retrait); rt.offsetMax = new Vector2(-retrait, -retrait);
            Image im = go.AddComponent<Image>();
            im.sprite = ProceduralUI.RoundedRectOutline(rayon, epaisseur, couleur);
            im.type = Image.Type.Sliced;
            im.raycastTarget = false;
        }

        private static void RemplirPips(RectTransform hote, TextMeshProUGUI libelle, string bucket, bool urgence)
        {
            int n = LibellesDecision.Rang(bucket, urgence);
            for (int i = 0; i < hote.childCount; i++)
            {
                Image img = hote.GetChild(i).GetComponent<Image>();
                if (img == null) continue;
                // ⑤ F8 (même matière) : le rang plein est un DISQUE rouge brique (147,64,44), le rang vide un ANNEAU creux de la même teinte — plus un disque gris plein
                img.sprite = i < n ? Disque : Anneau;
                img.color = Rouge;
            }
            // ⛔⛔ CETTE TERNAIRE COUVRAIT TROIS VALEURS SUR SIX. Elle testait `high`, `moderate`,
            //    `medium`, `low` — le back sert `minor|moderate|major` et `low|elevated|pressing`.
            //    Quatre des six valeurs réelles tombaient donc sur « — », sur l'écran dont c'est
            //    le sujet, et personne ne l'a vu parce que le compte de démo sert justement les
            //    deux que la liste contenait. ⇒ Un seul producteur, adossé aux deux types du back.
            //    ⚠️ Et il en faut DEUX, pas un : portée et urgence sont deux domaines DISTINCTS
            //      (`minor|moderate|major` / `low|elevated|pressing`), que cette ternaire unique
            //      mélangeait. Les servir par la même fonction, c'était accepter qu'un jour l'un
            //      réponde pour l'autre.
            libelle.text = urgence ? LibellesDecision.Urgence(bucket) : LibellesDecision.Portee(bucket);
        }

        /// <summary>Pis-aller tant qu'aucune clé i18n n'est servie par ce back (178 référencées,
        /// 0 servie — mesuré au socle). Ce n'est PAS une traduction : le jour où le bundle arrive,
        /// c'est cette fonction qu'on remplace, pas la mise en page.</summary>
        /// <summary>Le titre que le JOUEUR lit pour un type de décision.
        ///
        /// ⛔ MESURÉ EN CAPTURE (planche ⑤, 2026-09-04) : l'écran affichait
        /// « AUTONOMY REPORTS PENDING » en capitales, au centre d'une interface entièrement
        /// française. Ce n'était pas une traduction manquante — c'était `Lisible()`, un
        /// DÉ-SLUGGEUR : il prend la clé machine du serveur, remplace les `_` par des espaces et
        /// met une majuscule. *Le joueur lisait un identifiant technique déguisé en phrase.*
        /// ⇒ Aucune garde ne pouvait le voir : le texte est bien posé, non vide, capitalisé, et
        ///   il ne passe par AUCUN littéral — donc mon extracteur de clés le compte à zéro et mon
        ///   compteur de replis ne le voit pas non plus. Il n'existe que dans l'image.
        ///
        /// La forme ici : on demande la clé au dictionnaire, et on RETOMBE sur l'ancien rendu si
        /// elle manque. Tant que le back ne sert pas `decision.type.*`, l'écran est byte-identique
        /// à avant — la conversion ne peut donc rien casser ; elle devient française le jour où
        /// les clés arrivent.
        /// ⚠️ CE QUE ÇA NE FERME PAS, et c'est écrit parce qu'un zéro s'y cache : la clé est
        /// CALCULÉE depuis une valeur du serveur, donc `Tools/cles-i18n-du-client.py` — qui ne
        /// lit que des littéraux — ne la produira JAMAIS. La liste des types de décision doit
        /// venir du back, elle ne peut pas être dérivée d'ici. TD-535.</summary>
        public IEnumerator Commit()
        {
            Init();
            if (CarteAffichee == null) yield break;
            CommitCount++;
            DerniereErreur = null;
            RefusRendu = null;
            bool accepte = false;
            yield return client.Commit(token, CarteAffichee.card_id, dto => accepte = dto.committed,
                                       (c, m) => DerniereErreur = $"{c}: {m}");
            if (this == null) yield break;
            if (DerniereErreur == null && accepte) { TrancheePourDeBon(); yield break; }
            // un refus se DIT, sous la carte (la note du zinc) : la phrase servie, sinon celle de la carte — jamais une erreur muette
            RefusRendu = client.DernierePhraseDeRefus
                         ?? MafiaCleanCity.I18n.Libelle.Gabarit("accueil.carte.la_decision_n_a_pas_ete_prise", "La décision n\u2019a pas été prise.");
            if (noteZinc != null) noteZinc.text = RefusRendu;
        }

        private void TrancheePourDeBon()
        {
            DecisionsTranchees++;
            OnDecisionTranchee?.Invoke();
        }

        /// <summary>⛔ Réservé aux tests hors réseau : rejoue EXACTEMENT ce qu'un commit accepté déclenche.</summary>
        public void DecisionAccepteePourTest() => TrancheePourDeBon();

        // --------------------------------------------------------------- construction

        /// <summary>Le comptoir : la carte au centre avec son jeton, la note, le tampon (le filet « laisser sur le zinc » est retiré, f2 08/10). Ancré EN BAS comme la maquette (`margin-top:auto`) — c'est ce
        /// qui fait lire la scène comme un zinc et pas comme une page.</summary>
        private void Construire()
        {
            RectTransform selfRt = GetComponent<RectTransform>();
            if (selfRt == null) selfRt = gameObject.AddComponent<RectTransform>();

            // ⛔ UN ÉCRAN EN SURIMPRESSION SANS FOND N'EN EST PAS UN. Mesuré sur la première
            // capture : la carte, les pips et le tampon rendaient correctement — et la carte de la
            // ville, ses districts et les blocs de l'Accueil traversaient tout, rendant l'écran
            // illisible. Le défaut ne se voit PAS en lisant le contrôleur : il naît de ce qu'il y a
            // DERRIÈRE, donc seule une capture prise sur le chemin réel pouvait le montrer.
            // ⇒ Le fond est opaque, pas un scrim : cet écran REMPLACE la vue, il ne la nuance pas.
            // LE DÉCOR DE SCÈNE (CLIENT-2, design `Tools/decor-de-scene-2026-10-07/DESIGN.md`) tient ces deux rôles : la scène « verge »
            // nuit + le voile + le TAPIS de feutre (radial 90 % 60 % à 50 % 30 %, coins 26/26/0/0) couvrent TOUT le cadre (opaque), et
            // `Decor/Capteur` (raycast) AVALE les clics — sans ça, un doigt qui tombe entre deux éléments actionne l'écran de dessous.
            DecorPose decor = DecorDeScene.Poser(transform, DecorsDeScene.DecisionDetail);
            // ⑤ F8 — LE LISERÉ D'OR du tapis (`.tapis-feutre{border-top:3px solid #b08d3e}`) : la recette `TapisFeutre`, POSÉE par `Filets` sur le support (jamais un Image à la main : garde D6b). `Poser` met son conteneur
            // en PREMIER enfant, donc SOUS le radial opaque du feutre (invisible) : il est remonté en DERNIER. Le `Mask` du support (coins 26/26/0/0) arrondit ses extrémités ; `PileDeDecision` ne fait que poser les
            // offsets du support, le trait le suit.
            Filets.Poser(decor.Support, DecorsDeScene.Filets.DecisionDetail.TapisFeutre).transform.SetAsLastSibling();

            // ⛔ F12 — LE FEUTRE SUIT LE CONTENU, il n'est pas ancré à une FRACTION de l'écran (la classe de ㊴ : une hauteur posée par `Bande` = 34 % laissait les deux tiers du
            // feutre vides, et à 1920 la pile ne tient pas). La maquette : `.tapis-feutre` ÉPOUSE son contenu (`.panneau{margin-top:auto}`). Trois étages, de dehors en dedans :
            //   · `Fenetre`  — la fenêtre (RectMask2D + `ListeDefilante`) sous la barre du haut, jusqu'au bas de l'écran ;
            //   · `Defile`   — le contenu défilant, haut = max(hauteur de la pile, hauteur de la fenêtre) : ce qui dépasse DÉFILE, il n'est ni tranché ni imprimé sur le reste ;
            //   · `Pile`     — la pile verticale, ancrée EN BAS de `Defile` (`margin-top:auto`), de la hauteur de son contenu — SA HAUTEUR PRÉFÉRÉE, jamais une fraction.
            // `PileDeDecision` (sur la pile) pose ces hauteurs et ancre le haut du support du décor sur le haut de la pile.
            GameObject fenetreGo = new GameObject("Fenetre", typeof(RectTransform), typeof(CanvasRenderer));
            fenetreGo.transform.SetParent(transform, false);
            RectTransform fenetreRt = (RectTransform)fenetreGo.transform;
            fenetreRt.anchorMin = Vector2.zero; fenetreRt.anchorMax = Vector2.one;
            fenetreRt.offsetMin = Vector2.zero; fenetreRt.offsetMax = Vector2.zero;
            Image recepteur = fenetreGo.AddComponent<Image>();
            recepteur.color = Color.clear;
            recepteur.raycastTarget = false;   // `PileDeDecision` ne le rend actif que si le contenu dépasse (un ScrollRect doit recevoir le geste) ; sinon `Decor/Capteur` avale le clic
            fenetreGo.AddComponent<RectMask2D>();   // la FENÊTRE ; ce qui la dépasse défile (ListeDefilante : fondu + ascenseur)

            GameObject defileGo = new GameObject("Defile", typeof(RectTransform));
            defileGo.transform.SetParent(fenetreRt, false);
            RectTransform defileRt = (RectTransform)defileGo.transform;
            defileRt.anchorMin = new Vector2(0f, 1f); defileRt.anchorMax = Vector2.one; defileRt.pivot = new Vector2(0.5f, 1f);
            defileRt.offsetMin = Vector2.zero; defileRt.offsetMax = Vector2.zero;

            GameObject pileGo = new GameObject("Pile", typeof(RectTransform));
            pileGo.transform.SetParent(defileRt, false);
            pile = (RectTransform)pileGo.transform;
            pile.anchorMin = Vector2.zero; pile.anchorMax = new Vector2(1f, 0f); pile.pivot = new Vector2(0.5f, 0f);
            pile.offsetMin = Vector2.zero; pile.offsetMax = Vector2.zero;
            VerticalLayoutGroup vlg = pileGo.AddComponent<VerticalLayoutGroup>();
            vlg.padding = new RectOffset((int)Px(10f), (int)Px(10f),
                                         (int)Px(10f),   // `.tapis-feutre{padding:10px 12px 12px}` : le haut du feutre est ce retrait au-dessus de la table
                                         (int)ShellChrome.BottomInsetPx + (int)Px(6f));   // relu à chaque frame par PileDeDecision (le shell publie ses insets après le montage)
            vlg.spacing = Px(8f);
            vlg.childControlWidth = true;
            vlg.childControlHeight = true;
            vlg.childForceExpandWidth = true;
            vlg.childForceExpandHeight = false;
            vlg.childAlignment = TextAnchor.LowerCenter;
            pileDeDecision = pileGo.AddComponent<PileDeDecision>();
            pileDeDecision.Lier(fenetreRt, defileRt, vlg, decor, recepteur, Px(6f));
            // le fondu de fin de course se fond dans le BAS du feutre : le dernier arrêt du radial du catalogue (jamais une recopie)
            Color fondDuBas = DecorsDeScene.DecisionDetail.Support.Couches[0].Arrets[2].Couleur.Resoudre();
            fondDuBas.a = 1f;
            listeDefilante = ListeDefilante.Equiper(fenetreRt, defileRt, fondDuBas);

            // ⑤ F4 (juge d'ensemble r3, 08/10) — L'EYEBROW N'EST PAS DANS LA CARTE : `.grave` (`ecrans-brennar-6.html:243`) est un enfant du `.tapis-feutre`, AU-DESSUS de `.table` :
            // `text-align:center;font:9.5px Georgia;letter-spacing:.3em;text-transform:uppercase;color:#f2c96b;margin-top:4px` — or vif (`hudMoneyGold`) sur le feutre, CENTRÉ. Le jeu le logeait dans la carte
            // (rouge brique 4,47:1 sur la crème, calé à gauche). Capitales À L'AFFICHAGE (`UpperCase`) ; le texte reste celui du client. Masqué avec la carte (le sabot a sa propre phrase).
            grave = Texte(pile, "Grave", "CE QUI PÈSE LE PLUS AUJOURD'HUI", Px(9.5f), OrVif,
                          DesignTokens.Current.hudSerifFont, TextAlignmentOptions.Center);
            grave.fontStyle |= FontStyles.UpperCase;
            grave.characterSpacing = 30f;   // `.3em` — 100 = 1 em dans TMP
            grave.enableWordWrapping = true;
            grave.margin = new Vector4(0f, Px(4f), 0f, 0f);   // `margin-top:4px`
            grave.GetComponent<LayoutElement>().preferredWidth = 0f;

            // ── la table de jeu : la carte + le jeton structurel, côte à côte ────────────────
            // `.tapis-feutre .table{display:flex;align-items:flex-end;justify-content:center;gap:14px;padding:4px 0 0}` : centrée, chacun à SA largeur.
            GameObject table = Bloc("TableDeJeu", pile, horizontal: true, espace: Px(14f));
            HorizontalLayoutGroup th = table.GetComponent<HorizontalLayoutGroup>();
            th.childAlignment = TextAnchor.LowerCenter;
            th.childForceExpandWidth = false;
            th.padding = new RectOffset(0, 0, (int)Px(4f), 0);
            // ⛔ un groupe horizontal dans une pile verticale rend son `flexibleHeight` à la pile (la carte, dont le titre est élastique, lui en donnerait un) : 0 l'emporte.
            table.AddComponent<LayoutElement>().flexibleHeight = 0f;

            GameObject carte = Bloc("CarteDuJour", table.transform, horizontal: false, espace: Px(4f));
            carteRoot = (RectTransform)carte.transform;
            // ⛔ F14 — LA CARTE EST POSÉE, PAS COLLÉE. Le canon l'incline de **2,00°** (bord gauche,
            // résidu 0,29 px sur 650 lignes chez le juge) ; le jeu la rendait à 0,00°, et elle
            // cessait d'être « une carte distribuée sur un zinc » pour devenir un panneau.
            // ⚠️ Le SIGNE vient de la RÉFÉRENCE ouverte, pas du rapport : celui-ci donne la valeur
            //   absolue de l'angle du bord, ce qui ne dit pas de quel côté. Ce dépôt a déjà payé un
            //   signe déduit d'une magnitude — l'aiguille du manomètre inversée, et le halo des
            //   noms de ③ construit à l'envers d'un contour. *Une magnitude ne porte pas son sens.*
            carteRoot.localRotation = Quaternion.Euler(0f, 0f, InclinaisonCarteDeg);
            Image fond = carte.AddComponent<Image>();
            // ⛔ LA CINQUIÈME RECOPIE VIVAIT ICI, AVEC SON ALPHA — et c'est la forme que le motif
            //    de la garde ratait : il exigeait le guillemet fermant après SIX chiffres, donc
            //    toute couleur écrite avec son opacité lui était invisible (13 sites dans l'arbre,
            //    3 recopies exactes, dont celle-ci). Le motif porte désormais les deux longueurs.
            // ⚠️ L'OPACITÉ EST CONSERVÉE TELLE QUELLE, et c'est délibéré : ce commit range le
            //    CHEMIN de la teinte, il ne touche pas à la composition. Savoir si cette
            //    translucidité doit être convertie pour le mélange linéaire est une question de
            //    RENDU, mesurable seulement contre la référence de cet écran — la mêler ici ferait
            //    bouger deux choses à la fois, et plus rien ne départagerait laquelle a agi.
            // ⑤ F4 : la MATIÈRE crème d'abord (surface pleine), puis le bord d'or-brun et le filet rouge intérieur de la maquette, en enfants hors mise en page
            fond.sprite = ProceduralUI.RoundedRectMask((int)Px(14f));
            fond.color = MatiereDeLaCarte;
            fond.type = Image.Type.Sliced;
            Cerner(carte.transform, "BordCarte", (int)Px(14f), Px(1.5f), Hex("#8a6a2c"), 0f);
            Cerner(carte.transform, "FiletCarte", (int)Px(11f), Px(1f), FiletDeLaCarte, Px(3f));
            VerticalLayoutGroup cv = carte.GetComponent<VerticalLayoutGroup>();
            cv.padding = new RectOffset((int)Px(12f), (int)Px(12f), (int)Px(10f), (int)Px(12f));
            // ⛔ F13 (a) — LA CARTE EST UN PORTRAIT : `.carte-or{width:176px;min-height:212px}`. Elle prenait toute la largeur que le jeton lui laissait
            // (`flexibleWidth = 1` : 702×330, paysage) ; sa largeur est la sienne (176 CSS), sa hauteur un PLANCHER (212 CSS) que son contenu peut dépasser.
            LayoutElement carteLe = carte.AddComponent<LayoutElement>();
            carteLe.minWidth = Px(176f);
            carteLe.preferredWidth = Px(176f);
            carteLe.flexibleWidth = 0f;
            carteLe.minHeight = Px(212f);

            GameObject coin = Bloc("Coin", carte.transform, horizontal: true, espace: Px(4f));
            coin.GetComponent<HorizontalLayoutGroup>().childForceExpandWidth = false;
            Texte(coin.transform, "Cachet", "♦", Px(13f), Rouge, DesignTokens.Current.primaryFont);
            coinLibelle = PetitesCapitales(Texte(coin.transform, "Nature", "tactique", Px(7.5f), Rouge,
                                DesignTokens.Current.primaryFont));

            // F13 (e) — `.carte-or .titre{text-align:center;font-weight:700;margin:auto 2px;padding:24px 0 8px}` : en GRAS, centré dans ce que le plancher de la carte laisse (`margin:auto` ⇒
            // la boîte du titre est ÉLASTIQUE, son texte au milieu), jamais collé en haut.
            titre = Texte(carte.transform, "Titre", "", Px(15f), Encre,
                          DesignTokens.Current.hudSerifFont, TextAlignmentOptions.Center);
            titre.enableWordWrapping = true;
            titre.fontStyle |= FontStyles.Bold;
            titre.margin = new Vector4(Px(2f), Px(24f), Px(2f), Px(8f));
            LayoutElement titreLe = titre.GetComponent<LayoutElement>();
            titreLe.preferredWidth = 0f;
            titreLe.flexibleHeight = 1f;

            // F13 (b) — `.bandes{display:flex;justify-content:space-between;border-top:1px solid #93402c44;padding-top:7px}` : PORTÉE et URGENCE sont deux COLONNES (libellé, pips, valeur
            // empilés) écartées aux deux bords ; le filet haut est POSÉ par `Filets` (recette mesurée, sur la matière connue de la carte), jamais un Image à la main.
            GameObject bandes = Bloc("Bandes", carte.transform, horizontal: true, espace: 0f);
            HorizontalLayoutGroup bh = bandes.GetComponent<HorizontalLayoutGroup>();
            bh.childForceExpandWidth = false;
            bh.childAlignment = TextAnchor.UpperCenter;
            bh.padding = new RectOffset(0, 0, (int)Px(7f), 0);
            bandes.AddComponent<LayoutElement>().flexibleHeight = 0f;
            pipsPortee = BandeDePips(bandes.transform, "Portée", out porteeLibelle);
            GameObject ressort = new GameObject("Ressort", typeof(RectTransform));   // `justify-content:space-between`
            ressort.transform.SetParent(bandes.transform, false);
            LayoutElement ressortLe = ressort.AddComponent<LayoutElement>();
            ressortLe.preferredWidth = 0f;
            ressortLe.flexibleWidth = 1f;
            pipsUrgence = BandeDePips(bandes.transform, "Urgence", out urgenceLibelle);
            Filets.Poser((RectTransform)bandes.transform, DecorsDeScene.Filets.DecisionDetail.Bandes, MatiereDeLaCarte);

            // F13 (c) — LE CACHET DE CIRE, posé EN DERNIER (il recouvre le coin haut-droit de la carte, à cheval sur son bord).
            PoserLeCachetDeCire(carte.transform);

            // ── le jeton structurel ──────────────────────────────────────────────────────────
            GameObject colonne = Bloc("JetonStruct", table.transform, horizontal: false, espace: Px(1f));
            colonne.GetComponent<VerticalLayoutGroup>().childAlignment = TextAnchor.MiddleCenter;
            colonne.GetComponent<VerticalLayoutGroup>().childForceExpandWidth = false;
            LayoutElement colLe = colonne.AddComponent<LayoutElement>();
            colLe.preferredWidth = Px(64f);   // `.jeton-or{width:64px}`
            colLe.flexibleWidth = 0f;

            // `.jeton-or .piece` : 42 CSS, `radial-gradient(circle at 40% 32%, #f2d9a0, #b08d3e 60%, #7a5a14)`, `border:2px dashed #fff6` (la TRANCHE MOLETÉE : l'alternance
            // tiret / vide qui crante le bord, F13 (d)), `inset 0 0 0 3px #b08d3e`, `0 6px 10px #000c`. Le conteneur ne dessine rien : ombre, pièce, chiffre sont ses enfants.
            GameObject jeton = new GameObject("Jeton", typeof(RectTransform));
            jeton.transform.SetParent(colonne.transform, false);
            LayoutElement jl = jeton.AddComponent<LayoutElement>();
            jl.preferredWidth = Px(42f);
            jl.preferredHeight = Px(42f);
            jl.flexibleWidth = 0f;
            jl.flexibleHeight = 0f;
            PoserUneOmbre(jeton.transform, 42f, 10f, 6f);
            Image piece = NouvelleImage("Piece", jeton.transform);
            piece.sprite = ProceduralUI.DisqueMolete((int)Px(42f), new Vector2(0.40f, 0.32f),
                new[] { (0f, Hex("#f2d9a0")), (0.60f, DesignTokens.Current.hudHairlineGold), (1f, Hex("#7a5a14")) },
                Px(3f), DesignTokens.Current.hudHairlineGold, Px(2f), Px(10f), 0.6f, Color.white, 0.4f);
            Etirer((RectTransform)piece.transform);
            jetonChiffre = Texte(jeton.transform, "Chiffre", "1", Px(14f), Hex("#3a2a12"),
                                 DesignTokens.Current.primaryFont, TextAlignmentOptions.Center, true);
            jetonEtat = PetitesCapitales(Texte(colonne.transform, "Etat", "libre", Px(7.5f), OrVif,
                              DesignTokens.Current.primaryFont, TextAlignmentOptions.Center));
            Texte(colonne.transform, "Sous", "votre décision structurelle de la session", Px(6.3f),
                  Creme2, DesignTokens.Current.primaryFont, TextAlignmentOptions.Center)
                .enableWordWrapping = true;

            // ── l'état SABOT : aucune carte ne se détache ────────────────────────────────────
            sabotTexte = Texte(pile, "Sabot",
                               PhraseDuSabot(), Px(11f), Creme2,
                               DesignTokens.Current.hudSerifFont, TextAlignmentOptions.Center);
            sabotTexte.gameObject.SetActive(false);

            // F19 — la légende est en ITALIQUE dans le canon (« Tactique — trancher ne touche
            // pas… »), le jeu la rendait en romain. Vérifié sur la référence, pas déduit du
            // rapport.
            noteZinc = Texte(pile, "NoteZinc", "", Px(8f), Creme2,
                             DesignTokens.Current.primaryFont, TextAlignmentOptions.Center);
            noteZinc.enableWordWrapping = true;
            noteZinc.fontStyle |= FontStyles.Italic;   // F19 — le canon la met en italique

            // ── « laisser sur le zinc » (skip) RETIRÉ — f2 08/10 nuit, option (c) : un geste MORT (voir l'en-tête). ──────────
            // ── le tampon = commit, à APPUI LONG. Même geste que le tampon de la Revue : ce qui
            //    est irréversible ne se déclenche pas d'un doigt distrait. ──────────────────────
            tampon = Bloc("Tampon", pile, horizontal: false, espace: Px(2f));   // `.plaque-laiton small{margin-top:2px}`
            tampon.GetComponent<VerticalLayoutGroup>().childAlignment = TextAnchor.MiddleCenter;
            tampon.GetComponent<VerticalLayoutGroup>().padding =
                new RectOffset((int)Px(12f), (int)Px(12f), (int)Px(11f), (int)Px(11f));   // `padding:11px 12px`
            // ⑤ F7 — la `.plaque-laiton` de la série 6 (voir l'en-tête des couleurs) : un rectangle arrondi (rayon 6) qui MASQUE, dedans le dégradé 3 arrêts, au-dessus le bord 1 px POSÉ par `Filets`
            // (recette `PlaqueLaiton`, jamais un Image à la main : garde D6b), puis les textes. Le dégradé est un sprite carré aux coins vifs : sans le masque ils dépasseraient du bord arrondi.
            Image tf = tampon.AddComponent<Image>();
            tf.sprite = ProceduralUI.RoundedRectMask((int)Px(6f));
            tf.type = Image.Type.Sliced;
            tf.color = Color.white;
            tampon.AddComponent<Mask>().showMaskGraphic = false;   // seul le canal ALPHA du rectangle sert de stencil ; il reste cible du raycast (l'appui long)
            Image degrade = NouvelleImage("Degrade", tampon.transform);
            degrade.sprite = ProceduralUI.DegradeLineaire(180f, DegradeDeLaPlaque(), 1f, 1f);   // 180° : la hauteur de la boîte porte les `%`, son aspect n'y change rien
            degrade.gameObject.AddComponent<LayoutElement>().ignoreLayout = true;
            Etirer((RectTransform)degrade.transform);
            degrade.transform.SetAsFirstSibling();
            Filets.Poser((RectTransform)tampon.transform, DecorsDeScene.Filets.DecisionDetail.PlaqueLaiton).transform.SetSiblingIndex(1);   // au-dessus du dégradé (Poser le met en premier), sous les textes
            TextMeshProUGUI lib = Texte(tampon.transform, "Lib", "LES LIRE MAINTENANT", Px(12.5f),
                                        EncreDeLaPlaque, DesignTokens.Current.hudSerifFont, TextAlignmentOptions.Center);
            lib.characterSpacing = 22f;   // `.22em`
            lib.fontStyle = FontStyles.Bold;
            Texte(tampon.transform, "Sous",
                  "appui long — la carte est tranchée ; le sujet, lui, reste à traiter",
                  Px(8f), EncreDeLaSousLigne(), DesignTokens.Current.primaryFont, TextAlignmentOptions.Center)
                .enableWordWrapping = true;
            BoutonLire = tampon.AddComponent<LongPressButton>();
            BoutonLire.OnLongPressCompleted += () => StartCoroutine(Commit());
        }

        /// <summary>F13 (c) — LE CACHET DE CIRE (`.carte-or .cachet`, recette `spec-cachet-et-jeton.md`) : 36 CSS, `radial-gradient(circle at 40% 35%, #c9432c, #7a1f12 70%)`, anneau
        /// `inset 0 0 0 3px #8a2a18` (le bourrelet), ombre `0 3px 8px #000c`, « ♦ » or 13 CSS, `rotate(-12deg)` (CSS : sens horaire positif ⇒ +12° en Unity), `right:-10px;top:-14px` : il
        /// DÉBORDE du coin haut-droit de la carte — son centre est à 8 CSS DEDANS du bord droit et à 4 CSS SOUS le bord haut. Hors mise en page, enfant de la carte, posé après tout le reste.
        /// Dégradé et anneau sont des pixels OPAQUES (aucune opacité à convertir pour le mélange linéaire) ; seule l'ombre est translucide (`OmbreNoire`).</summary>
        private void PoserLeCachetDeCire(Transform carte)
        {
            GameObject go = new GameObject("CachetDeCire", typeof(RectTransform));
            go.transform.SetParent(carte, false);
            go.AddComponent<LayoutElement>().ignoreLayout = true;
            RectTransform rt = (RectTransform)go.transform;
            rt.anchorMin = Vector2.one; rt.anchorMax = Vector2.one; rt.pivot = new Vector2(0.5f, 0.5f);
            rt.sizeDelta = new Vector2(Px(36f), Px(36f));
            rt.anchoredPosition = new Vector2(-Px(8f), -Px(4f));
            rt.localRotation = Quaternion.Euler(0f, 0f, 12f);
            PoserUneOmbre(rt, 36f, 8f, 3f);
            Image disque = NouvelleImage("Cire", rt);
            disque.sprite = ProceduralUI.DisqueAFoyer((int)Px(36f), new Vector2(0.40f, 0.35f),
                new[] { (0f, Hex("#c9432c")), (0.70f, Hex("#7a1f12")) }, Px(3f), Hex("#8a2a18"));
            Etirer((RectTransform)disque.transform);
            TextMeshProUGUI losange = Texte(rt, "Glyphe", "♦", Px(13f), OrVif, DesignTokens.Current.primaryFont, TextAlignmentOptions.Center, true);
            losange.raycastTarget = false;
        }

        /// <summary>L'ombre `#000c` (noir à 80 %) : l'opacité CSS recopiée donnerait un halo trop LÉGER sur la matière claire de la carte (Unity compose en linéaire) ; le fond sous une ombre
        /// n'est pas unique (crème de la carte, feutre vert), donc l'ajustement d'opacité pour fond quelconque — jamais le déplacement de couleur, impossible pour un noir.</summary>
        private static Color OmbreNoire()
        {
            Color c = Color.black;
            c.a = ProceduralUI.AlphaVoileSurFondQuelconque(Color.black, 0.8f, out _);
            return c;
        }

        /// <summary>`box-shadow: 0 Ypx Bpx #000c` d'un disque de `diametreCss` : une Image carrée de `diametre + 2·flou` posée au centre de `parent`, décalée vers le BAS. Hors mise en page
        /// (aucun groupe sur `parent`), posée EN PREMIER pour passer sous le disque.</summary>
        private static void PoserUneOmbre(Transform parent, float diametreCss, float flouCss, float decalageCss)
        {
            int d = (int)Px(diametreCss), f = (int)Px(flouCss);
            Image ombre = NouvelleImage("Ombre", parent);
            ombre.sprite = ProceduralUI.OmbreDeDisque(d, f, OmbreNoire());
            RectTransform rt = (RectTransform)ombre.transform;
            rt.anchorMin = new Vector2(0.5f, 0.5f); rt.anchorMax = new Vector2(0.5f, 0.5f); rt.pivot = new Vector2(0.5f, 0.5f);
            rt.sizeDelta = new Vector2(d + 2 * f, d + 2 * f);
            rt.anchoredPosition = new Vector2(0f, -Px(decalageCss));
            rt.SetAsFirstSibling();
        }

        /// <summary>Une Image qui NAÎT avec son `CanvasRenderer` (garde du socle : `AddComponent` à l'exécution n'honore pas `[RequireComponent]`), sans raycast.</summary>
        private static Image NouvelleImage(string nom, Transform parent)
        {
            GameObject go = new GameObject(nom, typeof(RectTransform), typeof(CanvasRenderer));
            go.transform.SetParent(parent, false);
            Image im = go.AddComponent<Image>();
            im.raycastTarget = false;
            return im;
        }

        private static void Etirer(RectTransform rt)
        {
            rt.anchorMin = Vector2.zero; rt.anchorMax = Vector2.one;
            rt.offsetMin = Vector2.zero; rt.offsetMax = Vector2.zero;
        }

        /// <summary>Une COLONNE de `.bandes` (`.bande{display:flex;flex-direction:column;align-items:center;gap:2px}`) : le libellé, les trois pips, la valeur — empilés, centrés. Elle
        /// n'est plus une LIGNE (libellé · pips · valeur côte à côte) : deux colonnes écartées aux deux bords tiennent dans les 152 CSS de la carte.</summary>
        private RectTransform BandeDePips(Transform parent, string nom, out TextMeshProUGUI libelle)
        {
            GameObject bande = Bloc("Bande" + nom, parent, horizontal: false, espace: Px(2f));
            VerticalLayoutGroup colonne = bande.GetComponent<VerticalLayoutGroup>();
            colonne.childForceExpandWidth = false;
            colonne.childAlignment = TextAnchor.UpperCenter;
            PetitesCapitales(Texte(bande.transform, "Lib", nom, Px(7.5f), EncreFaible, DesignTokens.Current.primaryFont,
                                   TextAlignmentOptions.Center));

            GameObject pips = Bloc("Pips", bande.transform, horizontal: true, espace: Px(3f));
            pips.GetComponent<HorizontalLayoutGroup>().childForceExpandWidth = false;
            pips.GetComponent<HorizontalLayoutGroup>().childAlignment = TextAnchor.MiddleCenter;
            for (int i = 0; i < 3; i++)
            {
                GameObject pip = new GameObject("Pip" + i, typeof(RectTransform), typeof(CanvasRenderer));
                pip.transform.SetParent(pips.transform, false);
                pip.AddComponent<Image>().sprite = Disque;
                LayoutElement pl = pip.AddComponent<LayoutElement>();
                pl.preferredWidth = Px(7f);
                pl.preferredHeight = Px(7f);
                pl.flexibleWidth = 0f;
            }
            // ⚠️ PAS de petites capitales ici, et c'est la RÉFÉRENCE qui l'a dit, pas moi. Je les
            // avais appliquées aux cinq sites d'un coup — le finding parle de « cinq instances, une
            // cause ». En ouvrant la référence : les LIBELLÉS sont en capitales espacées (PORTÉE,
            // URGENCE, LIBRE), mais les VALEURS sont en bas de casse (« modérée », « faible »).
            // *Une cause unique ne veut pas dire une population unique* — j'ai failli fermer le
            // finding en en créant un autre, et seule l'image l'a montré.
            libelle = Texte(bande.transform, "Val", "—", Px(7.5f), Encre, DesignTokens.Current.primaryFont,
                            TextAlignmentOptions.Center);
            return (RectTransform)pips.transform;
        }

        /// <summary>⛔⛔ LES PETITES CAPITALES ESPACÉES — trait d'identité (d) du canon, et **une
        /// seule cause pour cinq instances**. Un juge ⊥ mesure « toutes les petites capitales
        /// espacées deviennent du bas-de-casse » : TACTIQUE → tactique, PORTÉE → Portée, URGENCE,
        /// LIBRE, et les deux valeurs de bande. *Cinq findings dans la table, un seul geste ici* —
        /// et c'est pour ça qu'on écrit un producteur au lieu de retoucher cinq appels.
        /// ⚠️ La CASSE est un STYLE, jamais une transformation du texte : `FontStyles.UpperCase`
        /// laisse la chaîne servie intacte, donc `Portée` reste `Portée` pour qui la lit dans le
        /// DTO ou dans un test. Passer par `ToUpper()` aurait rendu la donnée illisible à sa propre
        /// source — la faute que ce dépôt a déjà nommée sur ③ (« capitales en STYLE, le texte reste
        /// le nom servi »).
        /// ⚠️ Et l'interlettrage se compte en CENTIÈMES d'em dans TMP : `.12em` s'écrit `12f`.
        /// Ce dépôt l'a payé sur ③ le même jour (8 posé pour 24 dus, soit le tiers).</summary>
        private static TextMeshProUGUI PetitesCapitales(TextMeshProUGUI t)
        {
            t.fontStyle |= FontStyles.UpperCase;
            t.characterSpacing = 12f;   // `.12em` — 100 = 1 em dans TMP
            return t;
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
            GameObject go = new GameObject(nom, typeof(RectTransform), typeof(CanvasRenderer));
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

    /// <summary>⛔ F12 — LA PILE DE ⑤ ET SON FEUTRE : le support du décor (le tapis de feutre) ÉPOUSE la hauteur du contenu, et ce qui dépasse la fenêtre DÉFILE.
    ///
    /// La maquette (`.tapis-feutre` dans `.panneau{margin-top:auto}`) fait suivre le feutre à son contenu ; le client l'ancrait à `Bande` = 34 % de la hauteur — une FRACTION, la classe de ㊴ :
    /// deux tiers de feutre vides sous une carte rétrécie, et, à 1920, un contenu qui ne tient pas (déficit estimé −274 px) qu'aucune fraction ne rend. Porté par `Pile` (le groupe vertical
    /// du contenu, ancré EN BAS de `Defile`, `Defile` étant le contenu défilant de `Fenetre`) :
    ///   · `Pile` vaut sa hauteur PRÉFÉRÉE (jamais écrasée ni étirée) ; `Defile` vaut le plus grand de cette hauteur et de la fenêtre ⇒ si la pile tient, elle repose sur le bas de la fenêtre
    ///     (`margin-top:auto`) ; sinon `Defile` est plus haut que la fenêtre et le `ScrollRect` de `ListeDefilante` le fait défiler ;
    ///   · le haut du support = le haut de la pile quand elle tient (`retrait + fenêtre − pile`), le haut de la fenêtre sinon : le feutre couvre ce que la fenêtre montre. Posé par des OFFSETS
    ///     (ancres 0..1, `offsetMax.y = −haut`), pas par une fraction ;
    ///   · le retrait du haut (la barre du shell) et la marge du bas (le dock) sont relus à CHAQUE image : le shell publie ses insets APRÈS le montage du locataire.
    /// Un `ILayoutSelfController` : ses hauteurs se posent DANS la passe de mise en page, après le calcul des hauteurs préférées des enfants (comme `ContentSizeFitter`), pas une image plus tard.</summary>
    public sealed class PileDeDecision : MonoBehaviour, ILayoutSelfController
    {
        private RectTransform fenetre, defile, pile;
        private LayoutGroup groupe;
        private DecorPose decor;
        private Image recepteur;
        private float margeBas;
        private float derniereVue = -1f;

        /// <summary>La hauteur préférée de la pile (rembourrage compris), lue à la dernière passe.</summary>
        public float HauteurPreferee { get; private set; }
        /// <summary>La hauteur de la fenêtre à la dernière passe.</summary>
        public float HauteurDeLaFenetre { get; private set; }
        /// <summary>Le contenu dépasse-t-il la fenêtre (et défile-t-il) ?</summary>
        public bool Deborde { get; private set; }
        /// <summary>Le haut du feutre, en unités depuis le HAUT de l'écran.</summary>
        public float HautDuFeutre { get; private set; }

        internal void Lier(RectTransform fen, RectTransform def, LayoutGroup g, DecorPose d, Image rec, float margeBasUnites)
        {
            fenetre = fen; defile = def; pile = (RectTransform)g.transform; groupe = g; decor = d; recepteur = rec; margeBas = margeBasUnites;
            Redemander();
        }

        public void SetLayoutHorizontal() { }

        public void SetLayoutVertical() => Dimensionner();

        private void OnEnable() => Redemander();

        private void Redemander()
        {
            if (pile != null) LayoutRebuilder.MarkLayoutForRebuild(pile);
        }

        private void LateUpdate()
        {
            if (fenetre == null || groupe == null) return;
            float retrait = ShellChrome.TopInsetPx;
            if (!Mathf.Approximately(-fenetre.offsetMax.y, retrait))
            {
                fenetre.offsetMax = new Vector2(fenetre.offsetMax.x, -retrait);
                Redemander();
            }
            int bas = Mathf.RoundToInt(ShellChrome.BottomInsetPx + margeBas);
            if (groupe.padding.bottom != bas)
            {
                groupe.padding.bottom = bas;
                Redemander();
            }
            if (!Mathf.Approximately(fenetre.rect.height, derniereVue))
            {
                derniereVue = fenetre.rect.height;
                Redemander();
            }
        }

        /// <summary>Pose les hauteurs de `Pile` et `Defile` et le haut du support. Public : un test le rejoue sans attendre une passe de mise en page.</summary>
        public void Dimensionner()
        {
            if (fenetre == null || defile == null || pile == null) return;
            float pref = LayoutUtility.GetPreferredHeight(pile);
            float vue = fenetre.rect.height;
            HauteurPreferee = pref;
            HauteurDeLaFenetre = vue;
            Deborde = ListeDefilante.Depasse(pref, vue);
            defile.SetSizeWithCurrentAnchors(RectTransform.Axis.Vertical, Mathf.Max(pref, vue));
            pile.SetSizeWithCurrentAnchors(RectTransform.Axis.Vertical, pref);
            if (recepteur != null) recepteur.raycastTarget = Deborde;

            // le haut du feutre : le retrait de la barre + ce que la fenêtre a de libre au-dessus de la pile (0 quand elle déborde)
            HautDuFeutre = -fenetre.offsetMax.y + Mathf.Max(0f, vue - pref);
            RectTransform support = decor != null ? decor.Support : null;
            if (support != null)
            {
                support.anchorMin = Vector2.zero; support.anchorMax = Vector2.one;
                support.offsetMin = Vector2.zero; support.offsetMax = new Vector2(0f, -HautDuFeutre);
            }
        }
    }
}
