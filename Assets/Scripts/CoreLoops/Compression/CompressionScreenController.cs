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
        [SerializeField] private string baseUrl = "http://localhost";

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

        private void Rendre()
        {
            for (int i = lignes.childCount - 1; i >= 0; i--)
                UnityEngine.Object.Destroy(lignes.GetChild(i).gameObject);
            for (int i = jetons.childCount - 1; i >= 0; i--)
                UnityEngine.Object.Destroy(jetons.GetChild(i).gameObject);

            pressionTexte.text = Etat == null
                ? "pression inconnue"
                : $"{Lisible(Etat.stress_bucket)} · {Lisible(Etat.week_state)}";
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

            Texte(tete.transform, "Genre", Lisible(p.source_kind), Px(11.5f),
                  p.addressed ? Creme2 : Creme, DesignTokens.Current.hudSerifFont);

            GameObject espace = new GameObject("Espace", typeof(RectTransform));
            espace.transform.SetParent(tete.transform, false);
            espace.AddComponent<LayoutElement>().flexibleWidth = 1f;

            Texte(tete.transform, "Palier", Lisible(p.tier), Px(7.5f), TeintePalier(p.tier),
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

        /// <summary>Pis-aller : aucune clé i18n n'est servie par ce back. Ce n'est PAS une
        /// traduction — c'est une mise en forme d'un littéral anglais.</summary>
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

            // ⛔ OR VIF, PAS OR. Mesuré sur `reference-1080x2102.png` : le titre d'état rend
            //    (242,201,107) = `hudMoneyGold`. Il était posé en `--or` (217,171,78) — le bon
            //    jeton d'une AUTRE fonction (le soulignement du solde). *Un jeton juste employé
            //    pour un autre rôle rend un pixel plausible et faux.*
            TextMeshProUGUI titre = Texte(transform, "Titre", "LA SEMAINE", Px(13f), OrVif,
                                          DesignTokens.Current.hudSerifFont, TextAlignmentOptions.Center);
            titre.characterSpacing = 18f;

            pressionTexte = Texte(transform, "Pression", "pression inconnue", Px(8.5f), Creme2,
                                  DesignTokens.Current.primaryFont, TextAlignmentOptions.Center);

            // le budget : des jetons qu'on compte, pas un nombre dans une phrase
            GameObject bandeau = Bloc("Budget", transform, true, Px(5f));
            var hb = bandeau.GetComponent<HorizontalLayoutGroup>();
            hb.childForceExpandWidth = false;
            hb.childAlignment = TextAnchor.MiddleCenter;
            jetons = (RectTransform)bandeau.transform;

            ConstruirePlaque(transform);

            GameObject liste = Bloc("Lignes", transform, false, Px(8f));
            lignes = (RectTransform)liste.transform;

            videTexte = Texte(transform, "Vide", "", Px(11f), Creme2,
                              DesignTokens.Current.hudSerifFont, TextAlignmentOptions.Center);
            videTexte.gameObject.SetActive(false);
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
