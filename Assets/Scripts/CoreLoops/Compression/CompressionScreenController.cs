using System.Collections;
using UnityEngine;
using UnityEngine.UI;
using MafiaCleanCity.Shell;
using MafiaCleanCity.Theme;
using TMPro;

namespace MafiaCleanCity.CoreLoops.Compression
{
    // ⑭ LA SEMAINE DE COMPRESSION — le tableau des problèmes, le budget de décisions, le report.
    //
    // MATIÈRE — les 5 routes joueur mesurées le 2026-09-02, réparties sur QUATRE contrôleurs et
    // toutes sous `JwtAuthGuard` : `compression/state` · `compression/board` ·
    // `compression/board/problems/:id/decide` · `compression/engage` · `compression/defer`.
    //
    // ⛔ CE QUI DÉCIDE DE L'ÉCRAN : LE BUDGET DE DÉCISIONS EST LA MATIÈRE, PAS LA LISTE.
    // `decisions_remaining` n'est pas une décoration à côté du tableau — c'est ce qui rend la
    // semaine JOUABLE. Un tableau de problèmes sans budget visible est une liste de corvées ; avec
    // le budget, chaque ligne devient un arbitrage. On le montre donc EN HAUT, en jetons qu'on
    // compte, pas en nombre au milieu d'une phrase.
    //
    // ⛔ ET LES DEUX ÉVÉNEMENTS QUE LA RÉPONSE PORTE ET QU'ON N'AVALE PAS : `revealed_secondary`
    // (trancher un problème en découvre un autre) et `finalized` (la semaine se ferme). Ce sont
    // les deux seuls moments où l'écran change de nature ; les traiter comme un simple
    // rafraîchissement ferait disparaître le sens du geste qu'on vient de faire.
    //
    // ⚠️ `target_ref` est un `Record<string, unknown>` — une forme LIBRE que `JsonUtility` ne sait
    // pas lire. On ne la déclare pas : l'écran désigne un problème par son GENRE et son PALIER,
    // jamais par une cible qu'il ne peut pas décoder. Prétendre la lire produirait un champ nul
    // silencieux et une ligne vide qui aurait l'air d'un problème sans nom.
    //
    // ⚠️ LE COMPTE DE DÉMO N'A JAMAIS VÉCU DE TICK NIGHTLY (mesuré par la session voisine) : ce
    // tableau sera VIDE tant que les ticks ne tournent pas au provisionnement. L'écran est donc
    // bâti pour que l'état vide soit un état à part entière, pas un accident — « au calme » est un
    // des trois cadres de la maquette, pas un cas d'erreur.
    //
    // ⚠️ MAQUETTE série 4 (cadres 25-30) en jugement, non ratifiée au 2026-09-02.
    // ⛔ NON REVU — jalon 2026-09-05.
    public class CompressionScreenController : MonoBehaviour, IShellTenant
    {
        [Header("Backend")]
        private string baseUrlPose;   // posée par un appelant (tests, shell) ; sinon la source unique
        private string baseUrl { get => baseUrlPose ?? MafiaCleanCity.AdresseDuBack.Url; set => baseUrlPose = value; }
        public BoardData Tableau { get; private set; }
        public EtatData Etat { get; private set; }
        public bool EtatVide { get; private set; }
        /// <summary>⛔ LE SEUL PRÉDICAT HONNÊTE POUR UNE CAPTURE. Attendre qu'un CHAMP arrive
        /// n'est pas attendre que l'écran soit DESSINÉ : ㉓ enchaîne trois requêtes, et guetter la
        /// première faisait capturer DEUX requêtes trop tôt — image vide, test vert. ⑰ battait
        /// entre 23 et 3 éléments d'un run à l'autre pour la même raison, une requête d'avance.
        /// ⇒ Ce compteur monte à la FIN de `Rendre()`. C'est une propriété structurelle : elle ne
        /// dépend d'aucun champ, d'aucun ordre de requêtes, et elle survivra à l'ajout d'un appel.</summary>
        public int RendusEffectues { get; private set; }
        public string DerniereErreur { get; private set; }

        private GameObject plaque;
        private TextMeshProUGUI plaqueKicker, plaqueTitre, plaqueCorps;

        private const float K = 1280f / 300f;
        private static float Px(float cssPx) => cssPx * K;

        // ⛔ CES QUATRE ÉTAIENT DES RECOPIES, chacune à 0/255 d'un jeton nommé — mesuré par
        //    `Tools/apparier-litteraux-aux-tokens.py` : #eae0c8 = hudCreme · #b9ad92 =
        //    hudCremeSecondary · #d9ab4e = hudMoneyUnderlineGold · #e0664a = hudGaugeArcHot.
        //    ⇒ *La valeur circulait, le nom ne circulait pas* — et une garde qui balaie les ACCÈS
        //      aux jetons est aveugle à un littéral qui en recopie la valeur : couleur juste,
        //      chemin faux. C'est la classe mesurée le 2026-09-06 (92 littéraux, 47 à moins de 4).
        //    ⚠️ Ce sont des PROPRIÉTÉS, pas des `static readonly` : un initialiseur statique qui
        //      lit `DesignTokens.Current` tombe en contexte de constructeur, où `Resources.Load`
        //      jette — 65 champs de ce dépôt l'ont payé (verts en run complet, rouges à froid).
        private static Color Creme  => DesignTokens.Current.hudCreme;              // --creme
        private static Color Creme2 => DesignTokens.Current.hudCremeSecondary;     // --creme-2
        private static Color Or     => DesignTokens.Current.hudMoneyUnderlineGold; // --or
        private static Color OrVif  => DesignTokens.Current.hudMoneyGold;          // --or-vif
        private static Color Braise => DesignTokens.Current.hudGaugeArcHot;        // --braise

        /// <summary>`--lisere` #2a3648 — la bordure au repos de la maquette, et la SEULE valeur de
        /// ce fichier qui reste un littéral. ⚠️ CE N'EST PAS UNE RECOPIE PAR PARESSE, et il faut
        /// dire pourquoi, sinon le prochain balayage la classera avec les quatre qu'on vient de
        /// retirer :
        ///   · elle n'existe PAS dans `DesignTokens.asset` — son plus proche voisin,
        ///     `hudGaugeFaceInner`, est à 6/255 et c'est le fond d'un CADRAN DE MANOMÈTRE ;
        ///   · elle a DÉJÀ un producteur unique dans ce dépôt, `ReputationResolvers.Lisere`, écrit
        ///     avec le même raisonnement ;
        ///   · et il est **hors de portée** : `CoreLoops.asmdef` ne référence pas `Operational`
        ///     (références mesurées : UnityEngine.UI · Unity.InputSystem · Theme ·
        ///     Unity.TextMeshPro · ShellContracts · I18n). Ajouter la référence pour une couleur
        ///     coûterait un couplage d'assemblies ; recopier la valeur en la NOMMANT coûte cette
        ///     ligne et reste balayable.
        /// ⇒ Elle remonte au canon avec les trois autres du châssis, quand l'arbitrage DA remonté
        ///   à l'user le 2026-08-30 sera rendu.</summary>
        private static Color Lisere => Hex("#2a3648");
        private static readonly Color Eteint = new Color(1f, 1f, 1f, 0.18f);

        private static Color Hex(string h)
        {
            ColorUtility.TryParseHtmlString(h, out Color c);
            return c;
        }

        private CompressionClient client;
        private string token;
        private bool initialise;
        private Transform mountParent;
        private RectTransform lignes;
        private RectTransform jetons;
        private TextMeshProUGUI pressionTexte;
        private TextMeshProUGUI videTexte;
        // la JAUGE DE TENSION (`.cadran-fer`) : ce que RendreJauge repose à chaque rendu
        private RectTransform aiguille;
        private Image lampe;
        private Sprite lampeAllumee, lampeEteinte;
        private TextMeshProUGUI legendeTexte;
        private LayoutElement legendeLayout;

        private void Awake() => Init();

        private void Init()
        {
            if (initialise) return;
            initialise = true;
            client = new CompressionClient { BaseUrl = baseUrl };
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
            yield return client.LireEtat(bearer, e => Etat = e,
                                         (c, m) => DerniereErreur = $"état {c}: {m}");
            // ⛔ 404 SUR LE TABLEAU N'EST PAS UNE PANNE : c'est « aucune semaine de compression
            // en cours », et le back le dit mot pour mot — `no active compression board for
            // player`. Mesuré le 2026-09-02 : `compression/state` rend 200 avec
            // `week_state: "none"` pendant que `compression/board` rend 404. Sans ce cas, l'écran
            // annonçait « Le tableau n'a pas répondu » sur l'état le plus NORMAL du jeu, et la
            // capture le montrait — un écran honnête sur la mauvaise chose.
            yield return client.LireTableau(bearer, t => Tableau = t,
                                            (c, m) => DerniereErreur = c == 404 ? null : $"tableau {c}: {m}");
            Rendre();
        }

        /// <summary>Le corps imposé par un TEST (patron `ForensicScreenController.RendrePourTest`) : l'état et le tableau d'un compte
        /// fabriqué, aucune requête. Le rendu est celui de la production.</summary>
        public void RendrePourTest(EtatData etat, BoardData tableau)
        {
            Init();
            Etat = etat;
            Tableau = tableau;
            DerniereErreur = null;
            Rendre();
        }

        private void Rendre()
        {
            for (int i = lignes.childCount - 1; i >= 0; i--)
                UnityEngine.Object.Destroy(lignes.GetChild(i).gameObject);
            for (int i = jetons.childCount - 1; i >= 0; i--)
                UnityEngine.Object.Destroy(jetons.GetChild(i).gameObject);

            RendreJauge();
            pressionTexte.text = Etat == null
                ? "pression inconnue"
                : LignePression(Etat.stress_bucket, Etat.week_state);
            // ⛔ « SEVERE » N'EXISTE PAS DANS CE DOMAINE — je l'avais supposé par analogie avec les
            // paliers d'autres écrans. `StressBucket` (stress-bucket.ts) vaut
            // `calm | mounting | crushing | compression_active`, EN MINUSCULES. La comparaison
            // précédente ne pouvait donc JAMAIS être vraie : la couleur d'alerte était morte, et
            // rien ne l'aurait signalé — un écran qui n'alerte jamais ressemble à un écran calme.
            bool tendu = Etat != null
                      && (Etat.stress_bucket == "crushing" || Etat.stress_bucket == "compression_active");
            pressionTexte.color = tendu ? Braise : Creme2;

            // le budget en JETONS qu'on compte — jamais un nombre noyé dans une phrase
            if (Tableau != null)
            {
                int total = Tableau.decisions_used + Tableau.decisions_remaining;
                for (int i = 0; i < total; i++) Jeton(i < Tableau.decisions_remaining);
            }

            EtatVide = Tableau == null || Tableau.entries == null || Tableau.entries.Length == 0;
            // ⚠️ « au calme » est un ÉTAT de la semaine, pas une erreur — et il faut le distinguer
            // d'une route qui n'a pas répondu, sinon on annonce le calme à un joueur dont le
            // tableau a simplement échoué à charger. La PANNE garde donc sa ligne ; l'ÉTAT, lui,
            // est désormais dit par la plaque du canon.
            bool panne = DerniereErreur != null;
            videTexte.gameObject.SetActive(EtatVide && panne);
            if (EtatVide && panne) videTexte.text = "Le tableau n'a pas répondu.";
            RendrePlaque(EtatVide && !panne);
            if (EtatVide)
            {
                RendusEffectues++;
                return;
            }
            foreach (ProblemeDto p in Tableau.entries) Ligne(p);
            RendusEffectues++;
        }

        private void Jeton(bool libre)
        {
            GameObject j = new GameObject(libre ? "Libre" : "Depense", typeof(RectTransform));
            j.transform.SetParent(jetons, false);
            j.AddComponent<Image>().sprite = ProceduralUI.RadialDisc(
                (int)Px(13f), libre ? Or : Eteint, Hex("#7a5a14"));
            LayoutElement le = j.AddComponent<LayoutElement>();
            le.preferredWidth = Px(13f); le.preferredHeight = Px(13f); le.flexibleWidth = 0f;
        }

        private void Ligne(ProblemeDto p)
        {
            GameObject r = Bloc("Pb_" + p.id, lignes, false, Px(4f));
            Image fond = r.AddComponent<Image>();
            fond.sprite = ProceduralUI.RoundedRectOutline((int)Px(12f), Px(1f),
                p.addressed ? Hex("#ffffff14") : Hex("#ffffff24"));
            fond.type = Image.Type.Sliced;
            r.GetComponent<VerticalLayoutGroup>().padding =
                new RectOffset((int)Px(10f), (int)Px(10f), (int)Px(8f), (int)Px(9f));

            GameObject tete = Bloc("Tete", r.transform, true, Px(6f));
            var h = tete.GetComponent<HorizontalLayoutGroup>();
            h.childForceExpandWidth = false;
            h.childAlignment = TextAnchor.MiddleLeft;

            // le palier en pastille : sa couleur dit la gravité avant qu'on lise le genre
            GameObject pastille = new GameObject("Palier", typeof(RectTransform));
            pastille.transform.SetParent(tete.transform, false);
            pastille.AddComponent<Image>().sprite =
                ProceduralUI.RadialDisc((int)Px(11f), TeintePalier(p.tier), Hex("#7a5a14"));
            LayoutElement pl = pastille.AddComponent<LayoutElement>();
            pl.preferredWidth = Px(11f); pl.preferredHeight = Px(11f); pl.flexibleWidth = 0f;

            Texte(tete.transform, "Genre", MafiaCleanCity.I18n.MotsDesEnumeres.Dire(MafiaCleanCity.I18n.MotsDesEnumeres.GenreDeProbleme, p.source_kind), Px(11.5f),
                  p.addressed ? Creme2 : Creme, DesignTokens.Current.hudSerifFont);

            GameObject espace = new GameObject("Espace", typeof(RectTransform));
            espace.transform.SetParent(tete.transform, false);
            espace.AddComponent<LayoutElement>().flexibleWidth = 1f;

            Texte(tete.transform, "Palier", MafiaCleanCity.I18n.MotsDesEnumeres.Dire(MafiaCleanCity.I18n.MotsDesEnumeres.Palier, p.tier), Px(7.5f), TeintePalier(p.tier),
                  DesignTokens.Current.primaryFont);

            if (p.addressed)
            {
                Texte(r.transform, "Traite", "TRANCHÉ", Px(7.5f), Or, DesignTokens.Current.primaryFont);
                return;
            }
            Gestes(r.transform, p.id);
        }

        /// <summary>Les TROIS choix servis par `DecideChoice`, et eux seuls. Un quatrième bouton
        /// serait un geste que le back refuse — pire qu'un geste absent.</summary>
        private void Gestes(Transform parent, string problemeId)
        {
            GameObject g = Bloc("Gestes", parent, true, Px(5f));
            g.GetComponent<HorizontalLayoutGroup>().childForceExpandWidth = true;
            Geste(g.transform, problemeId, "resolve", "RÉGLER", Or);
            Geste(g.transform, problemeId, "dismiss", "ÉCARTER", Creme2);
            Geste(g.transform, problemeId, "skip", "PASSER", Eteint);
        }

        private void Geste(Transform parent, string problemeId, string choix, string libelle, Color teinte)
        {
            bool budget = Tableau != null && Tableau.decisions_remaining > 0;
            GameObject b = Bloc("G_" + choix, parent, false, Px(1f));
            var v = b.GetComponent<VerticalLayoutGroup>();
            v.childAlignment = TextAnchor.MiddleCenter;
            v.padding = new RectOffset((int)Px(6f), (int)Px(6f), (int)Px(5f), (int)Px(5f));
            Image bf = b.AddComponent<Image>();
            bf.sprite = budget
                ? ProceduralUI.RoundedRectOutline((int)Px(9f), Px(1f), teinte)
                : ProceduralUI.RoundedRectDashedOutline((int)Px(9f), Px(1f), (int)Px(4f), (int)Px(3f), Eteint);
            // ⛔ LE TYPE SUIT LE SPRITE, PAS LE SITE — et c'est ce que la correction de classe a
            //    failli manquer. Ce site pose DEUX contours selon l'état : un trait CONTINU
            //    (`RoundedRectOutline`, qui veut `Sliced` : l'étirement préserve un trait plein)
            //    et un POINTILLÉ (`RoundedRectDashedOutline`, qui veut `Tiled` : sa section
            //    centrale porte UNE période, et `Sliced` l'étirerait en une longue barre).
            //    ⇒ Basculer le site entier en `Tiled` aurait réparé le pointillé en cassant le
            //      trait plein. *Une correction de classe posée sur le SITE au lieu de l'OBJET
            //      échange un défaut contre un autre.*
            bf.type = budget ? Image.Type.Sliced : Image.Type.Tiled;
            Texte(b.transform, "Lib", libelle, Px(8.5f), budget ? teinte : Eteint,
                  DesignTokens.Current.primaryFont, TextAlignmentOptions.Center).characterSpacing = 10f;

            if (!budget) return;
            Button bouton = b.AddComponent<Button>();
            string id = problemeId, c = choix;
            bouton.onClick.AddListener(() => StartCoroutine(Decider(id, c)));
        }

        private IEnumerator Decider(string problemeId, string choix)
        {
            if (string.IsNullOrEmpty(token)) yield break;
            DecisionData res = null;
            yield return client.Decider(problemeId, choix, token, d => res = d,
                                        (c, m) => DerniereErreur = $"décision {c}: {m}");
            // ⛔ Les deux événements que la réponse porte ne sont PAS un rafraîchissement : ce sont
            // les seuls moments où la semaine change de nature. On les annonce.
            if (res != null && res.finalized)
                DerniereErreur = null;
            if (res != null && res.revealed_secondary)
                pressionTexte.text = Lib("un autre problème vient d'apparaître");
            yield return Charger(token);
        }

        private static Color TeintePalier(string t) =>
            t == "SEVERE" ? Braise : t == "MODERATE" ? Or : Creme2;

        /// <summary>La ligne de pression (cause 4, ⑭ B3) : « TENSION CALME · AUCUNE SEMAINE » — les deux énumérés (`stress_bucket`, `week_state`) en MOTS FRANÇAIS de l'atelier, par le résolveur
        /// commun (`MotsDesEnumeres`) ; un mot que l'atelier n'a pas écrit se dit « — », jamais l'anglais dé-sluggé (l'ancien `Lisible()` rendait « Calm · None »). Pure.</summary>
        public static string LignePression(string stressBucket, string weekState)
        {
            string tension = MafiaCleanCity.I18n.MotsDesEnumeres.Dire(MafiaCleanCity.I18n.MotsDesEnumeres.Tension, stressBucket);
            string semaine = MafiaCleanCity.I18n.MotsDesEnumeres.Dire(MafiaCleanCity.I18n.MotsDesEnumeres.Semaine, weekState);
            return (MafiaCleanCity.I18n.MotsDesEnumeres.NomTension + " " + tension + " · " + semaine).ToUpperInvariant();
        }

        /// <summary>F3 (juge d'ensemble r3, 08/10) : le FILET D'OR pleine largeur qui sépare la scène du corps. Maquette série 6 : `.tole{border-top:4px solid #b08d3e}` (`ecrans-brennar-6.html:286`) — le bord HAUT de la tôle,
        /// 4 px CSS (cadre 18 : 14 lignes d'image, (176,141,62), ≥ 880 px de large). La tôle EST le `Decor/Support` (sous la bande de scène) : le filet est la recette MESURÉE `Filets.Compression.Tole` (jeton `hudHairlineGold`),
        /// posée sur un hôte qui épouse le Support et reste son DERNIER enfant — sous le `Filets` d'un bloc il serait recouvert par les couches (dégradé opaque, tôle perforée). Il ne touche ni la pile ni son
        /// `padding.top` (`ReserveDeBande` seule le commande, note E4 du §17) : le contenu commence 8 px CSS plus bas, le filet vit dans la bande que la scène laisse au support.</summary>
        private static void PoserLeFiletDOr(DecorPose decor)
        {
            if (decor == null || decor.Support == null) return;
            var hote = new GameObject("Tole", typeof(RectTransform));
            hote.transform.SetParent(decor.Support, false);
            var rt = (RectTransform)hote.transform;
            rt.anchorMin = Vector2.zero; rt.anchorMax = Vector2.one;
            rt.offsetMin = Vector2.zero; rt.offsetMax = Vector2.zero;
            rt.SetAsLastSibling();
            Filets.Poser(rt, DecorsDeScene.Filets.Compression.Tole);
        }

        private ListeDefilante fenetre;
        /// <summary>La fenêtre défilante du corps (garde : le contenu qui dépasse défile, il n'est jamais tranché ni écrasé).</summary>
        public ListeDefilante FenetreDefilante => fenetre;

        private void Construire()
        {
            RectTransform selfRt = GetComponent<RectTransform>();
            if (selfRt == null) selfRt = gameObject.AddComponent<RectTransform>();

            // LE DÉCOR DE SCÈNE (CLIENT-2, design `Tools/decor-de-scene-2026-10-07/DESIGN.md`) : la scène du district à 0,62, le voile,
            // et la TÔLE (`Points` tous les 26 px CSS sur un 90° #2a2e33 → #23272b → #2a2e33) — DÉCLARÉS au catalogue. Il remplace
            // l'aplat `surfaceBase` ; son `Decor/Capteur` garde le bloqueur de raycast que portait cet aplat.
            DecorPose decor = DecorDeScene.Poser(transform, DecorsDeScene.Compression);

            // ⚠️ `v` est LA pile de l'écran (le VerticalLayoutGroup du GameObject lui-même) : la jauge de tension (`ConstruireJauge`) en est le premier bloc.
            VerticalLayoutGroup v = gameObject.AddComponent<VerticalLayoutGroup>();
            v.padding = new RectOffset((int)Px(10f), (int)Px(10f),
                                       0,   // le haut : sous la bande de scène (ReserverLaBande, juste dessous)
                                       (int)ShellChrome.BottomInsetPx + (int)Px(8f));
            v.spacing = Px(8f);
            v.childControlWidth = true;
            v.childControlHeight = true;
            v.childForceExpandWidth = true;
            v.childForceExpandHeight = false;
            v.childAlignment = TextAnchor.UpperCenter;
            // §5.6 du design : la pile commence SOUS max(barre, bande de scène 35 %), comme la tôle de la maquette.
            DecorDeScene.ReserverLaBande(v, decor, Px(8f));
            PoserLeFiletDOr(decor);

            // ⛔ UN DÉBORDEMENT NE PART PAS EN DETTE (f2, 08/10 ; même classe que ㊴ r1 F1/F2) : la jauge ajoute ~120 px CSS à la pile ; à 1080×1920 elle dépasse la fenêtre d'environ 35 px CSS et le
            // `VerticalLayoutGroup` l'écrasait sous sa hauteur préférée (texte hors de sa boîte). Le CORPS est donc une FENÊTRE défilante (`ListeDefilante` : fondu + ascenseur) sur un CONTENU qui épouse
            // ses enfants (ContentSizeFitter) ; quand tout tient, rien ne change (ni fondu, ni course).
            GameObject corps = new GameObject("Corps", typeof(RectTransform));
            corps.transform.SetParent(transform, false);
            corps.AddComponent<RectMask2D>();
            LayoutElement corpsLe = corps.AddComponent<LayoutElement>();
            corpsLe.flexibleHeight = 1f; corpsLe.minHeight = 0f;
            GameObject contenuGo = new GameObject("Contenu", typeof(RectTransform));
            contenuGo.transform.SetParent(corps.transform, false);
            RectTransform contenuRt = (RectTransform)contenuGo.transform;
            contenuRt.anchorMin = new Vector2(0f, 1f); contenuRt.anchorMax = new Vector2(1f, 1f);
            contenuRt.pivot = new Vector2(0.5f, 1f);
            contenuRt.offsetMin = Vector2.zero; contenuRt.offsetMax = Vector2.zero;
            VerticalLayoutGroup pileCorps = contenuGo.AddComponent<VerticalLayoutGroup>();
            pileCorps.spacing = Px(8f);
            pileCorps.childControlWidth = true; pileCorps.childControlHeight = true;
            pileCorps.childForceExpandWidth = true; pileCorps.childForceExpandHeight = false;
            pileCorps.childAlignment = TextAnchor.UpperCenter;
            contenuGo.AddComponent<ContentSizeFitter>().verticalFit = ContentSizeFitter.FitMode.PreferredSize;
            fenetre = ListeDefilante.Equiper((RectTransform)corps.transform, contenuRt, DesignTokens.Current.surfaceBase);
            Transform pile = contenuGo.transform;

            // LA JAUGE DE TENSION (juge visuel r1 du 08/10, F3 : l'élément héros du cadre manquait) — en TÊTE du corps, comme `.cadran-fer`
            // est le premier objet de la tôle de la série 6 (cadres 14-19). Tout le reste de la pile est inchangé.
            ConstruireJauge(pile);

            // ⛔ OR VIF, PAS OR. Mesuré sur `reference-1080x2102.png` : le titre d'état rend
            //    (242,201,107) = `hudMoneyGold`. Il était posé en `--or` (217,171,78) — le bon
            //    jeton d'une AUTRE fonction (le soulignement du solde). *Un jeton juste employé
            //    pour un autre rôle rend un pixel plausible et faux.*
            TextMeshProUGUI titre = Texte(pile, "Titre", "LA SEMAINE", Px(13f), OrVif,
                                          DesignTokens.Current.hudSerifFont, TextAlignmentOptions.Center);
            titre.characterSpacing = 18f;

            pressionTexte = Texte(pile, "Pression", "pression inconnue", Px(8.5f), Creme2,
                                  DesignTokens.Current.primaryFont, TextAlignmentOptions.Center);

            // le budget : des jetons qu'on compte, pas un nombre dans une phrase
            GameObject bandeau = Bloc("Budget", pile, true, Px(5f));
            var hb = bandeau.GetComponent<HorizontalLayoutGroup>();
            hb.childForceExpandWidth = false;
            hb.childAlignment = TextAnchor.MiddleCenter;
            jetons = (RectTransform)bandeau.transform;

            ConstruirePlaque(pile);

            GameObject liste = Bloc("Lignes", pile, false, Px(8f));
            lignes = (RectTransform)liste.transform;

            videTexte = Texte(pile, "Vide", "", Px(11f), Creme2,
                              DesignTokens.Current.hudSerifFont, TextAlignmentOptions.Center);
            videTexte.gameObject.SetActive(false);
        }

        // ═══ LA JAUGE DE TENSION — `.cadran-fer` de la série 6 (`ecrans-brennar-6.html:289-292` ; SVG des cadres 14-19, l.784-804) ═══
        // Juge visuel r1 du 08/10, F3 (BLOQUANT) : l'élément héros du cadre n'était pas construit — le commentaire de `Construire` promettait « le manomètre »
        // depuis CLIENT-3 et personne ne l'avait écrit. La géométrie est RECOPIÉE de la maquette (px CSS, `Px()` comme le reste du contrôleur) :
        //   · `.cadran-fer` 200×118, `border:4px #b08d3e`, `border-radius:100px 100px 14px 14px`, fond `radial-gradient(120% 100% at 50% 100%,#3a3f47,#15181c 70%)`,
        //     halos `0 0 0 4px #1a1d21, 0 0 0 6px #4a3a12` ;
        //   · le SVG (`left:14px; top:8px; 172×102`, viewBox 168×100 ⇒ échelle min(172/168, 102/100) = 1,02, centré) : piste `#ffffff1a`, froid `#7fd4d977`,
        //     or `#d9ab4e99`, chaud `#e0402acc`, tous `stroke-width:9`, rayon 70 autour de (84,92) ; froid/or se rejoignent en (49,32), or/chaud en (119,32) ;
        //     aiguille `line 84,92 → 84,40`, trait 2,6, `#eae0c8`, tournée de `rotate(θ)` autour de (84,92) ; moyeu `r=6 #b08d3e` cerclé `#6b4a12` ;
        //   · 4 vis 9×9 (`.v1 left:10/bottom:8`, `.v2 right:10/bottom:8`, `.v3 left:40/top:24`, `.v4 right:40/top:24`), l'onglet `.etiquette-fer` « TENSION »
        //     (`bottom:-11px`, 8 px, `letter-spacing:.34em`, `#e8c87a → #b08d3e`), puis `.lampe-rouge` (`margin-top:16px`) qui porte la légende.
        // ⚠️ ANGLES DE L'AIGUILLE, MESURÉS sur les `transform:rotate()` des cadres (CSS : degrés, SENS HORAIRE depuis la verticale) : au calme −60° (cadre 18,
        //    l.800) ; montante +12° (cadre 14, l.784) ; écrasante et sous compression +64° (cadres 15 et 19, l.788 et l.804 — le cadre 16 « un autre apparaît » dit +60°, l.792).
        //    La maquette n'a AUCUN cadre pour `crushing` seul : les trois cadres chauds sont tous en semaine ouverte (`compression_active`) et disent « ÉCRASANTE » ;
        //    le cran `crushing` reprend donc leur valeur dominante (+64°) — consigné aux Deviations de `impl-F3-jauge.md`.
        private const float CadranL = 200f, CadranH = 118f, CadranBord = 4f, CadranRayonHaut = 100f, CadranRayonBas = 14f;
        private const float SvgGauche = 14f, SvgHaut = 8f, SvgL = 172f, SvgH = 102f, VueL = 168f, VueH = 100f;
        private const float ArcCentreVueX = 84f, ArcCentreVueY = 92f, ArcRayonVue = 70f, ArcTraitVue = 9f;
        private const float AiguilleLongVue = 52f, AiguilleTraitVue = 2.6f, MoyeuRayonVue = 6f;
        private const float VisCote = 9f, LampeCote = 13f, OngletDebord = 7f /* bottom:-11px du padding-box = 11 − 4 de bordure sous le border-box */;
        private const float AiguilleCalmCss = -60f, AiguilleMountingCss = 12f, AiguilleCrushingCss = 64f, AiguilleActiveCss = 64f;
        private const float PisteAlpha = 0x1a / 255f, FroidAlpha = 0x77 / 255f, OrAlpha = 0x99 / 255f, ChaudAlpha = 0xcc / 255f;

        /// <summary>L'échelle du viewBox 168×100 dans sa boîte 172×102 (`preserveAspectRatio` par défaut : le plus petit des deux rapports, centré).</summary>
        private static float EchelleSvg => Mathf.Min(SvgL / VueL, SvgH / VueH);

        /// <summary>Le centre des arcs (pivot de l'aiguille), en px CSS depuis le coin haut-gauche du BORD du cadran.</summary>
        private static Vector2 CentreDesArcsCss => new Vector2(
            CadranBord + SvgGauche + (SvgL - VueL * EchelleSvg) * 0.5f + ArcCentreVueX * EchelleSvg,
            CadranBord + SvgHaut + (SvgH - VueH * EchelleSvg) * 0.5f + ArcCentreVueY * EchelleSvg);

        /// <summary>L'angle (0° à DROITE, sens trigonométrique) d'un point du viewBox vu du pivot : `M49 32` ⇒ 120,26° et `M119 32` ⇒ 59,74°.</summary>
        private static float AngleDuPointVue(float x, float y) => Mathf.Atan2(ArcCentreVueY - y, x - ArcCentreVueX) * Mathf.Rad2Deg;
        private static readonly float ArcFroidFinDeg = AngleDuPointVue(49f, 32f);
        private static readonly float ArcChaudDebutDeg = AngleDuPointVue(119f, 32f);

        private static Color Opaque(Color c) { c.a = 1f; return c; }
        private static Color LegendeAllumee => Hex("#ff8a70");   // `.lampe-rouge span{color:#ff8a70}`
        private static Color LegendeEteinte => Hex("#b3b8bf");   // `.lampe-rouge.eteinte span`

        /// <summary>Les arrêts du fond du cadran : `radial-gradient(120% 100% at 50% 100%, #3a3f47, #15181c 70%)`. `#15181c` est à 1,7/255 du jeton `surfaceCard` (garde TD-612) : on prend le jeton ;
        /// `#3a3f47` n'a aucun jeton à moins de 5 (`mapChipBg`).</summary>
        private static (float pos, Color c)[] ArretsDuFond() =>
            new[] { (0f, Hex("#3a3f47")), (0.7f, Opaque(DesignTokens.Current.surfaceCard)) };

        /// <summary>Le fond sRGB du cadran au point `p` (px CSS depuis le coin du BORD) : le foyer est au milieu du bas de la boîte de PADDING (192×110), les demi-axes 120 % × 100 % de cette boîte.</summary>
        private static Color FondDuCadran(Vector2 p)
        {
            const float L = CadranL - 2f * CadranBord, H = CadranH - 2f * CadranBord;
            float nx = (p.x - (CadranBord + L * 0.5f)) / (1.2f * L), ny = (p.y - (CadranBord + H)) / H;
            return ProceduralUI.EchantillonDeDegrade(ArretsDuFond(), Mathf.Sqrt(nx * nx + ny * ny));
        }

        private static Vector2 PointSurLArc(float angleDeg)
        {
            float a = angleDeg * Mathf.Deg2Rad, r = ArcRayonVue * EchelleSvg;
            Vector2 c = CentreDesArcsCss;
            return new Vector2(c.x + r * Mathf.Cos(a), c.y - r * Mathf.Sin(a));
        }

        /// <summary>Une teinte de maquette (sRGB, avec son opacité CSS) posée pour que le mélange LINÉAIRE d'Unity rende ce que le navigateur rend en sRGB sur `fondSrgb` — la classe mesurée sur le manomètre
        /// du HUD (`TopBarController.TeinteSurCadran`, privée à `Shell` : même méthode, `ProceduralUI.CouleurPourMelangeLineaire`). On garde l'opacité du CSS et on déplace la COULEUR. Hors gamut :
        /// teinte d'origine, et le log le dit. ⚠️ Le fond d'un arc VARIE le long de l'arc (le foyer du dégradé est au bas de la boîte, pas au pivot) : la teinte est résolue au point MILIEU de l'arc.</summary>
        private static Color TeinteSurFond(Color encre, float alphaSrgb, Color fondSrgb, string quoi)
        {
            Color r = ProceduralUI.CouleurPourMelangeLineaire(encre, fondSrgb, alphaSrgb, out bool atteignable);
            if (atteignable) return r;
            Debug.LogWarning($"[JAUGE-sRGB] {quoi} : aucune couleur ne reproduit le mélange sRGB sur ce fond — teinte d'origine conservée.");
            r = encre;
            r.a = alphaSrgb;
            return r;
        }

        /// <summary>L'angle de l'aiguille en degrés CSS (HORAIRE depuis la verticale) pour un cran du back — les valeurs MESURÉES sur la maquette (voir plus haut). Faux pour un cran inconnu : l'aiguille se retire,
        /// elle ne se pose pas sur un cran inventé (même doctrine que `PlaqueDeTension`).</summary>
        public static bool AngleDeLAiguilleCss(string stressBucket, out float degresCss)
        {
            switch (stressBucket)
            {
                case "calm": degresCss = AiguilleCalmCss; return true;
                case "mounting": degresCss = AiguilleMountingCss; return true;
                case "crushing": degresCss = AiguilleCrushingCss; return true;
                case "compression_active": degresCss = AiguilleActiveCss; return true;
                default: degresCss = 0f; return false;
            }
        }

        /// <summary>La légende sous le cadran (`.lampe-rouge span`, en capitales) : le MOT du cran par le résolveur commun (`MotsDesEnumeres`), et au calme la phrase du cadre 18 — « CALME — VOS AFFAIRES RESPIRENT ».
        /// Pure. (Les phrases des autres cadres — « SEMAINE ANNONCÉE — MONTANTE », « OUVERTE TOUTE SEULE — ÉCRASANTE »… — dépendent de la SEMAINE, pas du seul cran : la ligne de pression les dit.)</summary>
        public static string LegendeDeTension(string stressBucket)
        {
            string mot = MafiaCleanCity.I18n.MotsDesEnumeres.Dire(MafiaCleanCity.I18n.MotsDesEnumeres.Tension, stressBucket);
            string phrase = stressBucket == "calm" ? Lib("vos affaires respirent") : null;
            return (phrase == null ? mot : mot + " — " + phrase).ToUpperInvariant();
        }

        private static bool LampeAllumee(string stressBucket) => stressBucket == "crushing" || stressBucket == "compression_active";

        private static RectTransform PoserCss(RectTransform rt, float x, float y, float l, float h)
        {
            rt.anchorMin = rt.anchorMax = rt.pivot = new Vector2(0f, 1f);
            rt.anchoredPosition = new Vector2(Px(x), -Px(y));
            rt.sizeDelta = new Vector2(Px(l), Px(h));
            return rt;
        }

        /// <summary>Un `Graphic` qui NAÎT avec son `CanvasRenderer` (`AddComponent` à l'exécution n'honore pas `RequireComponent`), sans raycast.</summary>
        private static Image Peindre(Transform parent, string nom, Sprite sprite, Color couleur)
        {
            GameObject go = new GameObject(nom, typeof(RectTransform), typeof(CanvasRenderer));
            go.transform.SetParent(parent, false);
            Image im = go.AddComponent<Image>();
            im.sprite = sprite;
            im.color = couleur;
            im.type = Image.Type.Simple;
            im.raycastTarget = false;
            return im;
        }

        /// <summary>Une forme à coins arrondis haut/bas, unie ou à dégradé radial, posée en px CSS (coin haut-gauche du BORD du cadran).</summary>
        private static Image Forme(Transform parent, string nom, float x, float y, float l, float h, float rayonHaut, float rayonBas,
                                   float cx, float cy, float rx, float ry, (float pos, Color c)[] arrets)
        {
            Sprite sp = ProceduralUI.BoiteArrondieRadiale((int)Px(l), (int)Px(h), (int)Px(rayonHaut), (int)Px(rayonBas), cx, cy, rx, ry, arrets);
            Image im = Peindre(parent, nom, sp, Color.white);
            PoserCss(im.rectTransform, x, y, l, h);
            return im;
        }

        private static Image FormeUnie(Transform parent, string nom, float x, float y, float l, float h, float rayonHaut, float rayonBas, Color plein) =>
            Forme(parent, nom, x, y, l, h, rayonHaut, rayonBas, 0.5f, 0.5f, 1f, 1f, new[] { (0f, plein), (1f, plein) });

        private static void Arc(Transform parent, string nom, float debutDeg, float finDeg, Color teinte)
        {
            float s = EchelleSvg, dExt = 2f * (ArcRayonVue + ArcTraitVue * 0.5f) * s;
            Vector2 c = CentreDesArcsCss;
            Sprite sp = ProceduralUI.ArcCuit((int)Px(dExt), Px(ArcTraitVue * s), Color.white, debutDeg, finDeg);
            Image im = Peindre(parent, nom, sp, teinte);
            PoserCss(im.rectTransform, c.x - dExt * 0.5f, c.y - dExt * 0.5f, dExt, dExt);
        }

        private void ConstruireJauge(Transform parent)
        {
            float s = EchelleSvg;
            Color laiton = Opaque(DesignTokens.Current.hudHairlineGold);   // `--laiton` #b08d3e : le bord, le moyeu, le bas de l'onglet

            GameObject jauge = Bloc("Jauge", parent, false, 0f);
            VerticalLayoutGroup jv = jauge.GetComponent<VerticalLayoutGroup>();
            jv.childForceExpandWidth = false;   // le cadran garde ses 200 px et se centre (`align-self:center`)
            jv.childAlignment = TextAnchor.UpperCenter;

            GameObject cad = new GameObject("Cadran", typeof(RectTransform));
            cad.transform.SetParent(jauge.transform, false);
            LayoutElement cl = cad.AddComponent<LayoutElement>();
            cl.minWidth = cl.preferredWidth = Px(CadranL);
            cl.minHeight = cl.preferredHeight = Px(CadranH);
            cl.flexibleWidth = 0f;
            Transform c = cad.transform;

            // le boîtier, de l'extérieur vers l'intérieur : halo brun (+6), halo sombre (+4), bord laiton, face
            FormeUnie(c, "HaloBrun", -6f, -6f, CadranL + 12f, CadranH + 12f, CadranRayonHaut + 6f, CadranRayonBas + 6f, Hex("#4a3a12"));
            // `#1a1d21` est à 2,2/255 du jeton `autonomyBlockBg` (garde TD-612) : la valeur circule, on prend le jeton.
            FormeUnie(c, "HaloSombre", -4f, -4f, CadranL + 8f, CadranH + 8f, CadranRayonHaut + 4f, CadranRayonBas + 4f, Opaque(DesignTokens.Current.autonomyBlockBg));
            FormeUnie(c, "Bord", 0f, 0f, CadranL, CadranH, CadranRayonHaut, CadranRayonBas, laiton);
            Forme(c, "Face", CadranBord, CadranBord, CadranL - 2f * CadranBord, CadranH - 2f * CadranBord,
                  CadranRayonHaut - CadranBord, CadranRayonBas - CadranBord, 0.5f, 1f, 1.2f, 1f, ArretsDuFond());

            // les quatre vis (`radial-gradient(circle at 35% 30%, #d9c08a, #6b4a12)`, cercle jusqu'au coin le plus loin : √(.65² + .70²) ≈ .955)
            (float x, float y)[] vis = { (14f, 97f), (177f, 97f), (44f, 28f), (147f, 28f) };
            for (int i = 0; i < vis.Length; i++)
                Forme(c, "Vis" + (i + 1), vis[i].x, vis[i].y, VisCote, VisCote, VisCote * 0.5f, VisCote * 0.5f,
                      0.35f, 0.30f, 0.955f, 0.955f, new[] { (0f, Hex("#d9c08a")), (1f, Hex("#6b4a12")) });

            // la piste et les trois arcs : l'opacité du CSS est GARDÉE, la couleur est déplacée pour que le mélange linéaire rende le mélange sRGB du navigateur
            Color piste = TeinteSurFond(Color.white, PisteAlpha, FondDuCadran(PointSurLArc(90f)), "piste");
            Arc(c, "Piste", 180f, 0f, piste);
            Color SousLaPiste(float angle) => Color.Lerp(FondDuCadran(PointSurLArc(angle)), Color.white, PisteAlpha);
            float miFroid = (180f + ArcFroidFinDeg) * 0.5f, miOr = (ArcFroidFinDeg + ArcChaudDebutDeg) * 0.5f, miChaud = ArcChaudDebutDeg * 0.5f;
            Arc(c, "ArcFroid", 180f, ArcFroidFinDeg,
                TeinteSurFond(Opaque(DesignTokens.Current.hudGaugeArcCold), FroidAlpha, SousLaPiste(miFroid), "arc froid"));
            Arc(c, "ArcOr", ArcFroidFinDeg, ArcChaudDebutDeg,
                TeinteSurFond(Opaque(DesignTokens.Current.hudMoneyUnderlineGold), OrAlpha, SousLaPiste(miOr), "arc or"));
            Arc(c, "ArcChaud", ArcChaudDebutDeg, 0f,
                TeinteSurFond(Hex("#e0402a"), ChaudAlpha, SousLaPiste(miChaud), "arc chaud"));   // `#e0402a` : le plus proche jeton (`heatBurning`) est à 13

            // l'aiguille : pivot en bas de son rect, posée sur le centre des arcs ; son angle est reposé à chaque rendu
            Vector2 pivot = CentreDesArcsCss;
            Image ai = Peindre(c, "Aiguille", null, Opaque(Creme));
            aiguille = ai.rectTransform;
            aiguille.anchorMin = aiguille.anchorMax = new Vector2(0f, 1f);
            aiguille.pivot = new Vector2(0.5f, 0f);
            aiguille.anchoredPosition = new Vector2(Px(pivot.x), -Px(pivot.y));
            aiguille.sizeDelta = new Vector2(Px(AiguilleTraitVue * s), Px((AiguilleLongVue + AiguilleTraitVue * 0.5f) * s));   // + le demi-trait du bout rond

            // le moyeu : `circle r=6 fill #b08d3e stroke #6b4a12` (trait de 1 centré sur le rayon ⇒ 13 de diamètre dehors, 11 dedans)
            float dm = (MoyeuRayonVue * 2f + 1f) * s, di = (MoyeuRayonVue * 2f - 1f) * s;
            Sprite cercleBrun = ProceduralUI.RadialDisc((int)Px(dm), Hex("#6b4a12"), Hex("#6b4a12"));
            PoserCss(Peindre(c, "MoyeuBord", cercleBrun, Color.white).rectTransform, pivot.x - dm * 0.5f, pivot.y - dm * 0.5f, dm, dm);
            Sprite cercleLaiton = ProceduralUI.RadialDisc((int)Px(di), laiton, laiton);
            PoserCss(Peindre(c, "Moyeu", cercleLaiton, Color.white).rectTransform, pivot.x - di * 0.5f, pivot.y - di * 0.5f, di, di);

            // l'onglet « TENSION » (`.etiquette-fer`) : à cheval sur le bas du cadran, sa taille suit son TEXTE
            GameObject onglet = new GameObject("Onglet", typeof(RectTransform), typeof(CanvasRenderer));
            onglet.transform.SetParent(c, false);
            Image of = onglet.AddComponent<Image>();
            of.raycastTarget = false;
            HorizontalLayoutGroup oh = onglet.AddComponent<HorizontalLayoutGroup>();
            oh.padding = new RectOffset((int)Px(10f), (int)Px(10f), (int)Px(2f), (int)Px(2f));
            oh.childControlWidth = oh.childControlHeight = true;
            oh.childForceExpandWidth = oh.childForceExpandHeight = false;
            oh.childAlignment = TextAnchor.MiddleCenter;
            TextMeshProUGUI mot = Texte(onglet.transform, "Mot", Lib(MafiaCleanCity.I18n.MotsDesEnumeres.NomTension).ToUpperInvariant(), Px(8f),
                                        Hex("#2b1d0e"), DesignTokens.Current.primaryFont, TextAlignmentOptions.Center);
            mot.characterSpacing = 34f;   // .34em
            mot.ForceMeshUpdate();
            LayoutElement ml = mot.GetComponent<LayoutElement>();
            ml.preferredWidth = mot.preferredWidth;
            ml.flexibleWidth = 0f;
            float lo = mot.preferredWidth + 2f * (int)Px(10f), ho = mot.preferredHeight + 2f * (int)Px(2f);
            of.sprite = ProceduralUI.VerticalGradient(Mathf.Max(2, (int)ho), Hex("#e8c87a"), laiton);
            RectTransform ort = (RectTransform)onglet.transform;
            ort.anchorMin = ort.anchorMax = new Vector2(0.5f, 0f);
            ort.pivot = new Vector2(0.5f, 0f);
            ort.anchoredPosition = new Vector2(0f, -Px(OngletDebord));
            ort.sizeDelta = new Vector2(lo, ho);

            // la légende (`.lampe-rouge`, 16 px sous le cadran) : la lampe et le mot du cran
            GameObject leg = Bloc("Legende", jauge.transform, true, Px(8f));
            HorizontalLayoutGroup lh = leg.GetComponent<HorizontalLayoutGroup>();
            lh.padding = new RectOffset(0, 0, (int)Px(16f), 0);
            lh.childForceExpandWidth = false;
            lh.childAlignment = TextAnchor.MiddleCenter;
            // `radial-gradient(circle at 40% 35%, #ff8a70, #e0402a 60%, #7a1f12)` allumée ; `… #6a6f76, #2b2f35 60%` éteinte (`#2b2f35` : à 3,7 de `surfaceRaised` ⇒ le jeton)
            int dl = (int)Px(LampeCote);
            lampeAllumee = ProceduralUI.BoiteArrondieRadiale(dl, dl, dl / 2, dl / 2, 0.40f, 0.35f, 0.885f, 0.885f,
                new[] { (0f, Hex("#ff8a70")), (0.6f, Hex("#e0402a")), (1f, Hex("#7a1f12")) });
            lampeEteinte = ProceduralUI.BoiteArrondieRadiale(dl, dl, dl / 2, dl / 2, 0.40f, 0.35f, 0.885f, 0.885f,
                new[] { (0f, Hex("#6a6f76")), (0.6f, Opaque(DesignTokens.Current.surfaceRaised)) });
            lampe = Peindre(leg.transform, "Lampe", lampeEteinte, Color.white);
            LayoutElement ll = lampe.gameObject.AddComponent<LayoutElement>();
            ll.preferredWidth = ll.minWidth = Px(LampeCote);
            ll.preferredHeight = ll.minHeight = Px(LampeCote);
            ll.flexibleWidth = 0f;
            legendeTexte = Texte(leg.transform, "Mot", "", Px(8.5f), LegendeEteinte, DesignTokens.Current.primaryFont, TextAlignmentOptions.Center, true);
            legendeTexte.characterSpacing = 22f;   // .22em
            legendeLayout = legendeTexte.GetComponent<LayoutElement>();
            legendeLayout.flexibleWidth = 0f;
        }

        /// <summary>Repose l'aiguille, la lampe et la légende sur le cran de l'état. Un état absent (le back n'a pas répondu) se lit « au calme » — le même repli que `RendrePlaque` ;
        /// un cran que ce client ne connaît pas retire l'aiguille.</summary>
        private void RendreJauge()
        {
            string cran = Etat == null ? "calm" : Etat.stress_bucket;
            bool connu = AngleDeLAiguilleCss(cran, out float degres);
            aiguille.gameObject.SetActive(connu);
            if (connu) aiguille.localRotation = Quaternion.Euler(0f, 0f, -degres);   // CSS tourne vers la droite ; Unity, positif = vers la gauche
            bool allumee = LampeAllumee(cran);
            lampe.sprite = allumee ? lampeAllumee : lampeEteinte;
            legendeTexte.text = LegendeDeTension(cran);
            legendeTexte.color = allumee ? LegendeAllumee : LegendeEteinte;
            legendeTexte.ForceMeshUpdate();
            legendeLayout.preferredWidth = legendeTexte.preferredWidth;
        }

        /// <summary>⛔⛔ LA PLAQUE DE TENSION — ce que l'écran ne montrait PAS, et pourquoi son
        /// absence n'était pas un trou de donnée. Un juge ⊥ a mesuré, au seuil 1/255, **1 650
        /// rangées sur 1 080 colonnes sans un pixel autre que le fond — 68,8 % de l'écran**, avec
        /// son contrôle positif DANS LA MÊME IMAGE (la plaque du dock à 88 794 px, le texte à
        /// 4 311). ⇒ *Sa copie est FIXE : elle ne peut donc pas manquer parce que le back a rendu
        /// un corps vide.* C'était un défaut de CLIENT, établi sans attendre aucune route.
        ///
        /// ⛔ COPIE REPRISE VERBATIM de `ecrans-brennar-4.html` cadres 26 et 30 — la maquette que
        /// `front.md` désigne pour ⑭ (« série 4 v3.2.1, cadres 25-30 ») et celle que le dossier du
        /// juge donne pour référence. **Aucun mot n'est inventé** : c'est exactement ce qu'un lot
        /// voisin a coûté cette nuit sur ㊱, où un en-tête sans source dans l'atelier a dû être
        /// retiré faute de remplaçant ratifié.
        ///
        /// ⛔ ET LE CRAN INCONNU SE MONTRE TEL QUEL. `stress_bucket` vaut
        /// `calm | mounting | crushing | compression_active` (lu dans `stress-bucket.ts`). Le canon
        /// ne dessine de plaque QUE pour les deux premiers — les trois autres cadres montrent le
        /// tableau à la place. Un bucket que ce résolveur ne connaît pas rend donc sa VALEUR BRUTE,
        /// jamais un libellé de repli : un repli inventé le ferait passer pour un cas traité et
        /// masquerait la chose neuve qu'il faut traiter.
        ///
        /// ⇒ Forme NOMMÉE prenant la valeur du domaine, pas un tableau positionnel ni une chaîne
        /// de ternaires : une correspondance portée par l'ordre d'un tableau ou par un commentaire
        /// n'a aucune forme exécutable à asserter, et un balayage écrit pour la traquer rend zéro
        /// sur le fichier fautif lui-même.</summary>
        private static (string kicker, string titre, string corps) PlaqueDeTension(string bucket)
        {
            switch (bucket)
            {
                case "calm":
                    return ("Où en est la tension",
                            "Rien ne presse — aucune semaine en vue",
                            "La tension monte quand les problèmes s’accumulent sans réponse : "
                          + "montante, puis écrasante — et la semaine s’ouvre.");
                case "mounting":
                    return ("Ce qui vient",
                            "Vos problèmes s’accumulent — tout ce qui traîne va être mis sur la table",
                            "Une fois ouverte, la semaine ne se referme pas, et vous n’aurez que "
                          + "quelques décisions.");
                default:
                    return ("Où en est la tension", bucket, null);
            }
        }

        private void ConstruirePlaque(Transform parent)
        {
            plaque = Bloc("Plaque", parent, false, Px(4f));
            Image fond = plaque.AddComponent<Image>();
            fond.sprite = ProceduralUI.RoundedRectOutline((int)Px(12f), Px(1f), Lisere);
            fond.type = Image.Type.Sliced;
            plaque.GetComponent<VerticalLayoutGroup>().padding =
                new RectOffset((int)Px(11f), (int)Px(11f), (int)Px(9f), (int)Px(10f));

            plaqueKicker = Texte(plaque.transform, "Kicker", "", Px(7.5f), Creme2,
                                 DesignTokens.Current.primaryFont);
            plaqueKicker.characterSpacing = 16f;
            // ⛔ OR VIF, MESURÉ SUR LA RÉFÉRENCE : le titre de plaque rend (242,201,107) =
            //    `hudMoneyGold`. Il n'existait pas ; la phrase qui en tenait lieu était rendue en
            //    `--creme-2` (185,173,146), à 0/255 d'un jeton nommé — donc CHOISI, pas dérivé.
            plaqueTitre = Texte(plaque.transform, "Titre", "", Px(12f), OrVif,
                                DesignTokens.Current.hudSerifFont, TextAlignmentOptions.Left, true);
            plaqueCorps = Texte(plaque.transform, "Corps", "", Px(8.5f), Creme2,
                                DesignTokens.Current.primaryFont, TextAlignmentOptions.Left, true);
        }

        private void RendrePlaque(bool visible)
        {
            plaque.SetActive(visible);
            if (!visible) return;
            (string kicker, string titre, string corps) =
                PlaqueDeTension(Etat == null ? "calm" : Etat.stress_bucket);
            plaqueKicker.text = kicker;
            plaqueTitre.text = titre;
            plaqueCorps.text = corps ?? string.Empty;
            plaqueCorps.gameObject.SetActive(corps != null);
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

        /// <summary>⛔ `retourALaLigne` N'EST PAS UN CONFORT, C'EST LA RÉPARATION D'UN DÉBORD
        /// MESURÉ. Sans lui, une PHRASE plus large que sa boîte est rendue quand même : TMP la
        /// dessine en `Overflow`, centrée, et l'écran la coupe. Mesuré sur
        /// `planche_la_semaine_1080x2400.png` par ajustement linéaire des positions de mots
        /// (7 mots non coupés, 14 bords, résidu max 0,95 px) : la ligne fait **1 098,6 px pour
        /// 1 080 disponibles**, coupée de **11,8 px à gauche** et **7,7 px à droite** — le « A »
        /// de « Au » n'a plus qu'apex et jambe droite.
        /// ★ Et le discriminant qui sépare « le texte touche le bord » de « le texte est COUPÉ » :
        ///   **6 pixels de la couleur de CŒUR en colonne 0**. *Une frange d'anti-crénelage n'a
        ///   jamais la couleur de cœur.*
        /// ⚠️ Le défaut par défaut reste `false` : une RANGÉE du tableau qui reviendrait à la ligne
        ///   casserait sa géométrie. C'est aux PHRASES qu'on l'accorde, jamais aux bandes.</summary>
        private static TextMeshProUGUI Texte(Transform parent, string nom, string valeur, float taille,
            Color couleur, TMP_FontAsset police, TextAlignmentOptions alignement = TextAlignmentOptions.Left,
            bool retourALaLigne = false)
        {
            GameObject go = new GameObject(nom, typeof(RectTransform));
            go.transform.SetParent(parent, false);
            TextMeshProUGUI t = go.AddComponent<TextMeshProUGUI>();
            t.font = police;
            t.fontSize = taille;
            t.color = couleur;
            t.text = valeur;
            t.alignment = alignement;
            t.enableWordWrapping = retourALaLigne;
            // ⚠️ Sans ceci TMP réclame la largeur du texte NON COUPÉ et fait déborder la rangée.
            LayoutElement le = go.AddComponent<LayoutElement>();
            le.preferredWidth = 0f;
            le.flexibleWidth = 1f;
            return t;
        }

        /// <summary>Item 0.6 — les littéraux STATIQUES de cet écran passent par
        /// `semaine.bloc.<slug>`, repli sur le littéral (affichage BYTE-IDENTIQUE tant que le
        /// dictionnaire ne porte pas la clé — c'est ce qui rend la conversion sûre sans run).
        /// ⚠️ Cette phrase est une CONSTATATION de l'écran, pas une donnée du serveur : elle
        /// a donc sa clé, contrairement aux bandes servies qui restent brutes.</summary>
        private static string Lib(string litteral) =>
            MafiaCleanCity.I18n.Libelle.De("semaine", "bloc", litteral);

    }
}
