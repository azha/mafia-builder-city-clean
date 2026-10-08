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

        // ⑤ F4 + F5 (CLIENT-3 / juge r1, décision de f2 07/10 : « fidèle à la maquette », aucune décision écrite ne réduit l'écran) — la PLAQUE CRÈME. La carte et le tampon étaient des CONTOURS
        // sans matière (`RoundedRectOutline` seul : l'intérieur transparent laissait voir le zinc noir) : 0 px crème en jeu, le CTA primaire à 2,78:1 sur noir contre 4,33:1 sur crème, et le
        // secondaire 5,3× plus contrasté que lui. Mesures du juge : matière de la carte REF (219,206,171), plaque du CTA REF (216,202,167). Troisième grammaire du « geste principal » : un CTA
        // CRÈME à encre sombre (ni `.cta6` ni `.geste`), documenté dans `Tools/juge-visuel/decision-du-jour/DECISION-F4-F5-2026-10-07.md`.
        /// <summary>La matière de la carte : REF (219,206,171) ; la plaque du tampon : REF (216,202,167). Aplats opaques (aucune conversion sRGB → linéaire).</summary>
        public static Color MatiereDeLaCarte => new Color32(219, 206, 171, 255);
        public static Color PlaqueDuTampon => PiedDEcran.PlaqueCreme;
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
        private TextMeshProUGUI porteeLibelle, urgenceLibelle, sabotTexte;

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
            GameObject go = new GameObject(nom, typeof(RectTransform));
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

            VerticalLayoutGroup vlg = gameObject.AddComponent<VerticalLayoutGroup>();
            vlg.padding = new RectOffset((int)Px(10f), (int)Px(10f),
                                         0,   // le haut : sous la bande de scène (ReserverLaBande, juste dessous)
                                         (int)ShellChrome.BottomInsetPx + (int)Px(6f));
            vlg.spacing = Px(8f);
            vlg.childControlWidth = true;
            vlg.childControlHeight = true;
            vlg.childForceExpandWidth = true;
            vlg.childForceExpandHeight = false;
            vlg.childAlignment = TextAnchor.LowerCenter;
            // §5.6 du design : la pile commence SOUS max(barre, bande de scène 34 %) ; alignée en BAS, la table reste sur le feutre.
            DecorDeScene.ReserverLaBande(vlg, decor, Px(6f));

            // ── la table de jeu : la carte + le jeton structurel, côte à côte ────────────────
            GameObject table = Bloc("TableDeJeu", transform, horizontal: true, espace: Px(8f));
            table.GetComponent<HorizontalLayoutGroup>().childAlignment = TextAnchor.LowerLeft;

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
            Cerner(carte.transform, "FiletCarte", (int)Px(11f), Px(1f), Rouge, Px(3f));
            VerticalLayoutGroup cv = carte.GetComponent<VerticalLayoutGroup>();
            cv.padding = new RectOffset((int)Px(12f), (int)Px(12f), (int)Px(10f), (int)Px(12f));
            carte.AddComponent<LayoutElement>().flexibleWidth = 1f;

            GameObject coin = Bloc("Coin", carte.transform, horizontal: true, espace: Px(4f));
            coin.GetComponent<HorizontalLayoutGroup>().childForceExpandWidth = false;
            Texte(coin.transform, "Cachet", "♦", Px(13f), Rouge, DesignTokens.Current.primaryFont);
            coinLibelle = PetitesCapitales(Texte(coin.transform, "Nature", "tactique", Px(7.5f), Rouge,
                                DesignTokens.Current.primaryFont));

            TextMeshProUGUI kicker = Texte(carte.transform, "Kicker", "CE QUI PÈSE LE PLUS AUJOURD'HUI",
                                           Px(7.5f), Rouge, DesignTokens.Current.primaryFont);
            kicker.characterSpacing = 14f;

            titre = Texte(carte.transform, "Titre", "", Px(15f), Encre,
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
            jetonEtat = PetitesCapitales(Texte(colonne.transform, "Etat", "libre", Px(7.5f), OrVif,
                              DesignTokens.Current.primaryFont, TextAlignmentOptions.Center));
            Texte(colonne.transform, "Sous", "votre décision structurelle de la session", Px(6.3f),
                  Creme2, DesignTokens.Current.primaryFont, TextAlignmentOptions.Center)
                .enableWordWrapping = true;

            // ── l'état SABOT : aucune carte ne se détache ────────────────────────────────────
            sabotTexte = Texte(transform, "Sabot",
                               PhraseDuSabot(), Px(11f), Creme2,
                               DesignTokens.Current.hudSerifFont, TextAlignmentOptions.Center);
            sabotTexte.gameObject.SetActive(false);

            // F19 — la légende est en ITALIQUE dans le canon (« Tactique — trancher ne touche
            // pas… »), le jeu la rendait en romain. Vérifié sur la référence, pas déduit du
            // rapport.
            noteZinc = Texte(transform, "NoteZinc", "", Px(8f), Creme2,
                             DesignTokens.Current.primaryFont, TextAlignmentOptions.Center);
            noteZinc.enableWordWrapping = true;
            noteZinc.fontStyle |= FontStyles.Italic;   // F19 — le canon la met en italique

            // ── « laisser sur le zinc » (skip) RETIRÉ — f2 08/10 nuit, option (c) : un geste MORT (voir l'en-tête). ──────────
            // ── le tampon = commit, à APPUI LONG. Même geste que le tampon de la Revue : ce qui
            //    est irréversible ne se déclenche pas d'un doigt distrait. ──────────────────────
            tampon = Bloc("Tampon", transform, horizontal: false, espace: Px(2f));
            tampon.GetComponent<VerticalLayoutGroup>().childAlignment = TextAnchor.MiddleCenter;
            tampon.GetComponent<VerticalLayoutGroup>().padding =
                new RectOffset((int)Px(12f), (int)Px(12f), (int)Px(10f), (int)Px(10f));
            Image tf = tampon.AddComponent<Image>();
            // ⑤ F5 : la PLAQUE crème (surface pleine, REF 216,202,167) sous le cerne rouge — l'encre rouge sombre y est à 4,3:1 ; sur le zinc noir elle était à 2,78:1
            tf.sprite = ProceduralUI.RoundedRectMask((int)Px(11f));
            tf.type = Image.Type.Sliced;
            tf.color = PlaqueDuTampon;
            Cerner(tampon.transform, "BordTampon", (int)Px(11f), Px(2f), Rouge, 0f);
            Cerner(tampon.transform, "FiletTampon", (int)Px(8f), Px(1f), new Color(Rouge.r, Rouge.g, Rouge.b, 0.5f), Px(4f));
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
            PetitesCapitales(Texte(bande.transform, "Lib", nom, Px(7.5f), EncreFaible, DesignTokens.Current.primaryFont));

            GameObject pips = Bloc("Pips", bande.transform, horizontal: true, espace: Px(3f));
            pips.GetComponent<HorizontalLayoutGroup>().childForceExpandWidth = false;
            for (int i = 0; i < 3; i++)
            {
                GameObject pip = new GameObject("Pip" + i, typeof(RectTransform));
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
            libelle = Texte(bande.transform, "Val", "—", Px(7.5f), Encre, DesignTokens.Current.primaryFont);
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
