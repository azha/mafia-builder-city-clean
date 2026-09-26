using System.Collections;
using UnityEngine;
using UnityEngine.UI;
using MafiaCleanCity.Shell;
using MafiaCleanCity.Theme;
using TMPro;

namespace MafiaCleanCity.Onboarding
{
    // ㉕ LA PREMIÈRE FOIS — l'overlay de découverte, et le droit de le refuser.
    //
    // MATIÈRE — les 3 routes de `tutorial-overlay.controller.ts`, sous `JwtAuthGuard`. Le MOTEUR
    // était déjà là : W1.1-b a livré `tutorial_state` et le résolveur d'éligibilité. Il ne
    // manquait que l'écran — c'est le seul du chantier dont le back attendait le front, et pas
    // l'inverse.
    //
    // ⛔ CE QUI DÉCIDE DE L'ÉCRAN : `PATCH /v1/ui/tutorial` EST LE SEUL ÉCRIVAIN de
    // `shown_tutorial_ids`. Un overlay qu'on ferme sans appeler cette route revient à CHAQUE
    // session, indéfiniment — le joueur croirait le jeu cassé, et rien dans le back ne le
    // signalerait. C'est donc la fermeture qui porte l'appel, jamais l'ouverture.
    //
    // ⛔ ET LE REFUS EST UN DROIT, PAS UN ÉCHEC. `tutorials_opt_out` est servi par une route à
    // part : il est offert dès le premier overlay, au même rang visuel que « continuer ». Le
    // cacher derrière trois écrans en ferait une option théorique.
    //
    // ✅ D10-h EST CLOSE (back 4a922bc9, 02/09) : les 11 textes `tutorial.*` sont SERVIS. `next_tutorial_id` porte la clé entière
    // (`tutorial.queue_runs_dry`) : l'écran affiche le TEXTE servi (`TexteDuTutoriel`), plus jamais l'identifiant (atelier 33, 23/09).
    // ⛔ `next_tutorial_id` NULL NE VEUT PAS DIRE « FINI » : au plus un tutoriel par session (`hasShownAnySince`), et rien n'est
    //    désigné avant la première décision. « Tout vu » seulement si plus rien n'est éligible (`PhraseSansSuivant`).
    // ⛔ LA BASCULE EST DANS LE SENS DU JOUEUR : « On vous explique encore » (mot RATIFIÉ, Profil, série 6 cadres 95-96) est ALLUMÉE
    //    quand `tutorials_opt_out` est FAUX. La clé est un opt-OUT : l'inversion vit en UN seul lieu, `BasculeTutoriels`
    //    (ShellContracts), partagé avec ⑲ Réglages.
    //
    // ⚠️ Le 3ᵉ endpoint canon (`PATCH /v1/me/settings`) est ABSENT (S10-a) — non câblé.
    // ⛔ NON REVU — jalon 2026-09-05.
    public class TutorialScreenController : MonoBehaviour, IShellTenant
    {
        [Header("Backend")]
        private string baseUrlPose;   // posée par un appelant (tests, shell) ; sinon la source unique
        private string baseUrl { get => baseUrlPose ?? MafiaCleanCity.AdresseDuBack.Url; set => baseUrlPose = value; }
        public TutorielData Etat { get; private set; }
        public bool EtatVide { get; private set; }
        /// <summary>⛔ LE SEUL PRÉDICAT HONNÊTE POUR UNE CAPTURE. Attendre qu'un CHAMP arrive
        /// n'est pas attendre que l'écran soit DESSINÉ : ㉓ enchaîne trois requêtes, et guetter la
        /// première faisait capturer DEUX requêtes trop tôt — image vide, test vert. ⑰ battait
        /// entre 23 et 3 éléments d'un run à l'autre pour la même raison, une requête d'avance.
        /// ⇒ Ce compteur monte à la FIN de `Rendre()`. C'est une propriété structurelle : elle ne
        /// dépend d'aucun champ, d'aucun ordre de requêtes, et elle survivra à l'ajout d'un appel.</summary>
        public int RendusEffectues { get; private set; }
        public string DerniereErreur { get; private set; }
        /// <summary>Garde : le dernier refus DEMANDÉ par la bascule (la valeur envoyée à `tutorials_opt_out`), null avant tout geste.</summary>
        public bool? DernierRefusDemande { get; private set; }
        /// <summary>Garde : l'état AFFICHÉ de la bascule « On vous explique encore ».</summary>
        public bool BasculeAffichee { get; private set; }

        private static string Lib(string litteral) => MafiaCleanCity.I18n.Libelle.De("tutoriel", "ecran", litteral);


        /// <summary>Le TEXTE servi d'un tutoriel : `next_tutorial_id` EST sa clé (`tutorial.queue_runs_dry`). Jamais l'identifiant ;
        /// une clé non servie (ou un id vide) rend « — ».
        /// ㉕ (§G de la passe UX, 26/09 ; f2) : un texte NOMMÉ (`EstNomme`) sans nom servi rend NULL — rien de nommé à l'écran.</summary>
        public static string TexteDuTutoriel(string id, string nomServi = null)
        {
            if (string.IsNullOrWhiteSpace(id)) return "—";
            if (EstNomme(id) && string.IsNullOrWhiteSpace(nomServi)) return null;
            string t = MafiaCleanCity.I18n.Libelle.Gabarit(id.Trim(), null,
                string.IsNullOrWhiteSpace(nomServi) ? null : new System.Collections.Generic.Dictionary<string, string> { { "nom", nomServi } });
            return string.IsNullOrWhiteSpace(t) ? "—" : t;
        }

        /// <summary>㉕ (§G de la passe UX, 26/09) — l'espace des tutoriels LIÉS À UNE CARTE d'exception : leur texte parle du lieutenant
        /// de la carte. Mesuré : `tutorial.exception_card.onboarding_preseed` est servi « Lt. Hara — cuisson du soir bloquée… », un nom
        /// ÉCRIT DANS LA VALEUR, qui n'est pas le lieutenant du joueur. Le back passera `{nom}` (f2) ; tant que le paramètre n'est pas
        /// servi, le client n'affiche RIEN de nommé. TD-761 : brancher le nom servi dès que le tutoriel le porte (champ encore inconnu).</summary>
        public const string EspaceNomme = "tutorial.exception_card.";

        public static bool EstNomme(string id) =>
            !string.IsNullOrWhiteSpace(id) && id.Trim().StartsWith(EspaceNomme, System.StringComparison.Ordinal);

        /// <summary>Ce que dit l'écran quand il n'a RIEN à montrer (ni `next_tutorial_id`, ni éligible non vu — C10) : « tout vu »
        /// SEULEMENT si plus rien n'est éligible ; sinon « rien de nouveau pour aujourd’hui » (atelier 33 §4, mot proposé).</summary>
        public static string PhraseSansSuivant(string[] eligibles) =>
            eligibles == null || eligibles.Length == 0 ? Lib("Vous avez tout vu.") : Lib("Rien de nouveau pour aujourd’hui.");

        /// <summary>C10 (passe UX 2026-09-24) — le premier tutoriel ÉLIGIBLE que le joueur n'a pas encore vu ; null sinon. Pure.
        /// ⛔ Mesuré sur le serveur (corps/012, 072 de la passe) : un joueur neuf reçoit `eligible_tutorial_ids =
        /// [tutorial.exception_card.onboarding_preseed]` et `next_tutorial_id = null` — AVANT comme APRÈS sa première décision : cet
        /// éligible n'est pas un id du calendrier de divulgation, le back ne le choisit jamais. « Rien de nouveau pour aujourd’hui »
        /// était donc FAUX à vie pour lui. L'écran montre ce que le back déclare éligible et que le joueur n'a pas vu.</summary>
        public static string PremierEligibleNonVu(string[] eligibles, string[] vus)
        {
            if (eligibles == null) return null;
            var dejaVus = new System.Collections.Generic.HashSet<string>(vus ?? new string[0]);
            foreach (string id in eligibles) if (!string.IsNullOrWhiteSpace(id) && !dejaVus.Contains(id)) return id;
            return null;
        }

        /// <summary>Table 63 v2 — le joueur NEUF : rien de vu (`shown` vide) et au moins un éligible. Pure.</summary>
        public static bool PremiereLecon(TutorielData e) =>
            e != null && (e.shown_tutorial_ids == null || e.shown_tutorial_ids.Length == 0)
            && e.eligible_tutorial_ids != null && e.eligible_tutorial_ids.Length > 0;

        /// <summary>Couture de test : rend un état fabriqué, sans réseau.</summary>
        public void RendrePourTest(TutorielData etat)
        {
            Init();
            Etat = etat;
            DerniereErreur = null;
            Rendre();
        }

        private const float K = 1280f / 300f;
        private static float Px(float cssPx) => cssPx * K;

        private static Color Creme => DesignTokens.Current.hudCreme;
        private static Color Creme2 => DesignTokens.Current.hudCremeSecondary;
        private static Color Or => DesignTokens.Current.hudMoneyUnderlineGold;
        private static readonly Color Eteint = new Color(1f, 1f, 1f, 0.18f);

        private static Color Hex(string h)
        {
            ColorUtility.TryParseHtmlString(h, out Color c);
            return c;
        }

        private TutorialClient client;
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
            client = new TutorialClient { BaseUrl = baseUrl };
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
            yield return client.LireEtat(bearer, e => Etat = e,
                                         (c, m) => DerniereErreur = $"{c}: {m}");
            Rendre();
        }

        private void Rendre()
        {
            for (int i = corps.childCount - 1; i >= 0; i--)
                UnityEngine.Object.Destroy(corps.GetChild(i).gameObject);

            EtatVide = Etat == null;
            videTexte.gameObject.SetActive(EtatVide);
            if (EtatVide)
            {
                videTexte.text = DerniereErreur == null
                    ? "Rien à découvrir pour l'instant."
                    : "L'état du tutoriel n'a pas répondu.";
                RendusEffectues++;
                return;
            }

            if (Etat.tutorials_opt_out)
            {
                Texte(corps, "Refus", Lib("Vous avez demandé qu’on vous laisse tranquille."),
                      Px(11f), Creme2, DesignTokens.Current.hudSerifFont,
                      TextAlignmentOptions.Center).enableWordWrapping = true;
                Bascule();   // éteinte : la rallumer revient sur le refus
                RendusEffectues++;
                return;
            }

            string suivant = Etat.next_tutorial_id;
            // ㉕ : un tutoriel NOMMÉ sans nom servi ne se montre pas (rien de nommé) — mais il ATTEND : ce n'est ni « tout vu » ni
            // « rien de nouveau ».
            bool nommeEnAttente = false;
            if (!string.IsNullOrEmpty(suivant) && TexteDuTutoriel(suivant) == null) { nommeEnAttente = true; suivant = null; }
            if (string.IsNullOrEmpty(suivant))
            {
                // C10 — `next` null n'épuise pas l'éligible : un tutoriel éligible, pas encore vu, et dont le texte est SERVI, se montre.
                string eligible = PremierEligibleNonVu(Etat.eligible_tutorial_ids, Etat.shown_tutorial_ids);
                string texteEligible = eligible != null ? TexteDuTutoriel(eligible) : "—";
                if (texteEligible == null) nommeEnAttente = true;
                else if (texteEligible != "—") suivant = eligible;
            }
            if (string.IsNullOrEmpty(suivant) && nommeEnAttente)
            {
                // ㉕ : la tête seule — une leçon attend, on ne la lit pas encore (son texte nomme un lieutenant qui n'est pas le vôtre).
                // Pas de « Compris » : on ne marque pas vu ce qu'on n'a pas montré.
                Texte(corps, "Titre2",
                      PremiereLecon(Etat)
                          ? MafiaCleanCity.I18n.Libelle.Gabarit("tutoriel.vide.une_premiere_lecon_vous_attend", "Une première leçon vous attend.")
                          : Lib("À découvrir"),
                      Px(13f), Creme, DesignTokens.Current.hudSerifFont, TextAlignmentOptions.Center).enableWordWrapping = true;
            }
            else if (string.IsNullOrEmpty(suivant))
            {
                Texte(corps, "Fini", PhraseSansSuivant(Etat.eligible_tutorial_ids), Px(13f), Creme,
                      DesignTokens.Current.hudSerifFont, TextAlignmentOptions.Center).enableWordWrapping = true;
            }
            else
            {
                // table 63 v2 : le joueur NEUF (rien vu, un éligible) lit « Une première leçon vous attend. » en tête — une phrase, pas un
                // surtitre : casse normale. Sinon le surtitre « À découvrir », en capitales de style.
                bool premiereLecon = PremiereLecon(Etat);
                TextMeshProUGUI sur = Texte(corps, "Titre2",
                      premiereLecon ? MafiaCleanCity.I18n.Libelle.Gabarit("tutoriel.vide.une_premiere_lecon_vous_attend", "Une première leçon vous attend.") : Lib("À découvrir"),
                      Px(7.5f), Eteint, DesignTokens.Current.primaryFont, TextAlignmentOptions.Center);
                sur.characterSpacing = premiereLecon ? 0f : 14f;
                sur.fontStyle = premiereLecon ? FontStyles.Normal : FontStyles.UpperCase;
                // Le TEXTE servi du tutoriel (D10-h close) — jamais l'identifiant.
                Texte(corps, "Texte", TexteDuTutoriel(suivant), Px(14f), Or,
                      DesignTokens.Current.hudSerifFont, TextAlignmentOptions.Center)
                    .enableWordWrapping = true;
                string id = suivant;
                // « Compris » : le mot RATIFIÉ (série 2, cadre 31 — D14 : il l'emporte sur « J'AI COMPRIS »).
                Bouton(Lib("Compris"), Or, () => StartCoroutine(MarquerVu(id)));
            }

            int vus = Etat.shown_tutorial_ids != null ? Etat.shown_tutorial_ids.Length : 0;
            int eligibles = Etat.eligible_tutorial_ids != null ? Etat.eligible_tutorial_ids.Length : 0;
            Texte(corps, "Compte", $"{vus} vu(s) · {eligibles} disponible(s)", Px(8f), Creme2,
                  DesignTokens.Current.primaryFont, TextAlignmentOptions.Center);

            // ★ le refus est un DROIT : la bascule est offerte dès le premier écran, jamais cachée
            Bascule();   // allumée : l'éteindre, c'est le refus
            RendusEffectues++;
        }

        private void Bouton(string libelle, Color teinte, UnityEngine.Events.UnityAction action)
        {
            GameObject b = Bloc("B_" + libelle, corps, false, Px(1f));
            var v = b.GetComponent<VerticalLayoutGroup>();
            v.childAlignment = TextAnchor.MiddleCenter;
            v.padding = new RectOffset((int)Px(8f), (int)Px(8f), (int)Px(7f), (int)Px(7f));
            Image bf = b.AddComponent<Image>();
            bf.sprite = ProceduralUI.RoundedRectOutline((int)Px(9f), Px(1f), teinte);
            bf.type = Image.Type.Sliced;
            TextMeshProUGUI l = Texte(b.transform, "L", libelle, Px(9f), teinte,
                  DesignTokens.Current.primaryFont, TextAlignmentOptions.Center);
            l.characterSpacing = 12f;
            l.fontStyle = FontStyles.UpperCase;   // la casse est au RENDU, le mot du catalogue reste « Compris »
            b.AddComponent<Button>().onClick.AddListener(action);
        }

        /// <summary>« On vous explique encore » — la bascule du Profil (série 6, cadres 95-96, RATIFIÉE), dans le sens du joueur.
        /// Allumée ⇔ `tutorials_opt_out` faux. Le toucher la bascule et envoie l'opt-out INVERSE (`RefusPourBascule`).</summary>
        private void Bascule()
        {
            bool allumee = BasculeTutoriels.Allumee(Etat.tutorials_opt_out);   // le SEUL lieu de l'inversion (ShellContracts), partagé avec ⑲
            BasculeAffichee = allumee;
            GameObject ligne = Bloc("Bascule", corps, true, Px(8f));
            var h = ligne.GetComponent<HorizontalLayoutGroup>();
            h.childAlignment = TextAnchor.MiddleLeft;
            h.childForceExpandWidth = false;

            GameObject textes = Bloc("Textes", ligne.transform, false, Px(2f));
            textes.AddComponent<LayoutElement>().flexibleWidth = 1f;
            Texte(textes.transform, "Libelle", Lib("On vous explique encore"), Px(10f), Creme,
                  DesignTokens.Current.primaryFont, TextAlignmentOptions.Left).enableWordWrapping = true;
            Texte(textes.transform, "Sous",
                  Lib("décochez le jour où vous n’avez plus besoin qu’on vous tienne la main"),
                  Px(7.5f), Creme2, DesignTokens.Current.primaryFont, TextAlignmentOptions.Left).enableWordWrapping = true;

            // L'interrupteur : une pastille arrondie, le bouton à droite quand elle est allumée.
            GameObject piste = new GameObject("Interrupteur", typeof(RectTransform));
            piste.transform.SetParent(ligne.transform, false);
            LayoutElement pl = piste.AddComponent<LayoutElement>();
            pl.preferredWidth = pl.minWidth = Px(22f);
            pl.preferredHeight = pl.minHeight = Px(12f);
            Image fond = piste.AddComponent<Image>();
            fond.sprite = ProceduralUI.RoundedRectMask((int)Px(6f));
            fond.type = Image.Type.Sliced;
            fond.color = allumee ? Or : Eteint;
            GameObject bouton = new GameObject("Curseur", typeof(RectTransform));
            bouton.transform.SetParent(piste.transform, false);
            var brt = (RectTransform)bouton.transform;
            brt.anchorMin = brt.anchorMax = brt.pivot = new Vector2(allumee ? 1f : 0f, 0.5f);
            brt.sizeDelta = new Vector2(Px(10f), Px(10f));
            brt.anchoredPosition = new Vector2(allumee ? -Px(1f) : Px(1f), 0f);
            Image rond = bouton.AddComponent<Image>();
            rond.sprite = ProceduralUI.RoundedRectMask((int)Px(5f));
            rond.type = Image.Type.Sliced;
            rond.color = Creme;
            rond.raycastTarget = false;

            Button b = ligne.AddComponent<Button>();
            Image zone = ligne.AddComponent<Image>();
            Color transparent = Color.white; transparent.a = 0f;
            zone.color = transparent;
            b.targetGraphic = zone;
            b.onClick.AddListener(() => StartCoroutine(Refuser(BasculeTutoriels.OptOutPour(!allumee))));
        }

        /// <summary>⛔ Le SEUL écrivain de `shown_tutorial_ids`. Sans cet appel, le même overlay
        /// revient à chaque session pour toujours.</summary>
        private IEnumerator MarquerVu(string tutorialId)
        {
            if (string.IsNullOrEmpty(token)) yield break;
            yield return client.MarquerVu(tutorialId, token, () => { },
                                          (c, m) => DerniereErreur = $"marquage {c}: {m}");
            yield return Charger(token);
        }

        private IEnumerator Refuser(bool refus)
        {
            DernierRefusDemande = refus;
            if (string.IsNullOrEmpty(token)) yield break;
            yield return client.DefinirRefus(refus, token, _ => { },
                                             (c, m) => DerniereErreur = $"refus {c}: {m}");
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
            v.padding = new RectOffset((int)Px(14f), (int)Px(14f),
                                       (int)ShellChrome.TopInsetPx + (int)Px(10f),
                                       (int)ShellChrome.BottomInsetPx + (int)Px(10f));
            v.spacing = Px(10f);
            v.childControlWidth = true;
            v.childControlHeight = true;
            v.childForceExpandWidth = true;
            v.childForceExpandHeight = false;
            v.childAlignment = TextAnchor.MiddleCenter;

            TextMeshProUGUI titre = Texte(transform, "Titre", "LA PREMIÈRE FOIS", Px(13f), Or,
                                          DesignTokens.Current.hudSerifFont, TextAlignmentOptions.Center);
            titre.characterSpacing = 18f;

            GameObject c = Bloc("Corps", transform, false, Px(9f));
            corps = (RectTransform)c.transform;

            videTexte = Texte(transform, "Vide", "", Px(11f), Creme2,
                              DesignTokens.Current.hudSerifFont, TextAlignmentOptions.Center);
            videTexte.enableWordWrapping = true;
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
