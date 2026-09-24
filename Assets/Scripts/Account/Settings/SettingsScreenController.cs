using System.Collections;
using UnityEngine;
using UnityEngine.UI;
using MafiaCleanCity.Shell;
using MafiaCleanCity.Theme;
using MafiaCleanCity.Account.Profile;
using MafiaCleanCity.Onboarding;
using TMPro;

namespace MafiaCleanCity.Account.Settings
{
    // ⑲ LES RÉGLAGES — la langue, et rien d'autre, parce que rien d'autre n'est servi.
    //
    // ⛔⛔ CET ÉCRAN A ÉTÉ DÉCLARÉ « BLOQUÉ » CE MATIN PAR MOI-MÊME. La mesure disait : 1 endpoint
    // servi sur 5, et `player.locale` lu et projeté sans qu'aucune route ne l'écrive — la forme B
    // des chaînes mortes. La session back a livré l'écrivain dans la journée.
    // ⇒ *Un « bloqué » est une mesure DATÉE, jamais une propriété de l'écran.* Re-mesuré avant
    // d'écrire : `PATCH /v1/me/settings` existe, sous `JwtAuthGuard`, domaine `en | fr`.
    //
    // ⛔ CE QUI RESTE OUVERT, ET LE BACK LE DIT LUI-MÊME : ce n'est PAS un domaine de réglages.
    // `player_settings` n'existe pas comme table ; les autres préférences vivent chacune sur SA
    // route (`PATCH /v1/ui/tutorial-opt-out`, `PUT /v1/me/meta-market/visibility`). S10-a reste
    // ouvert — c'est l'écrivain d'UN champ, pas un service.
    // ⇒ L'écran montre donc UN réglage et l'écrit. Dessiner un panneau de préférences dont une
    // seule serait branchée ferait passer un trou de surface pour un écran fini — et personne ne
    // reviendrait le mesurer.
    //
    // ⛔ Et les trois gestes que le canon demande et que le back ne sert PAS sont écrits à
    // l'écran, éteints, avec leur raison : déconnexion, suppression de compte (RGPD), et le reste
    // des préférences. *Un geste impossible qu'on masque devient un geste qu'on croit ne pas
    // exister.*
    //
    // ⚠️ Aucun `GET /v1/me/settings` n'existe : l'état courant vient de `GET /v1/me`.
    //
    // ✅ 23/09 (inventaire de l'atelier 35, `d9b57e55`) — l'en-tête ci-dessus est DATÉ : trois éléments SERVIS et DESSINÉS par la porte
    //    ratifiée (le Profil, série 6, cadres 95-97) sont désormais branchés, dans le tiroir « Le jeu » :
    //    · « On vous explique encore » — `tutorials_opt_out` (`GET /v1/ui/tutorial-state`, `PATCH /v1/ui/tutorial-opt-out`), la MÊME
    //      bascule que ㉕, par le même client (`TutorialClient`) et la même inversion (`BasculeTutoriels`, ShellContracts) ;
    //    · « Dire mes prix au marché » — `meta_market_visibility_enabled` (`GET /v1/me`, `PUT /v1/me/meta-market/visibility`, L1) ;
    //    · « Fermer le coffre · cette session seulement » — `POST /v1/auth/signout` : « Se déconnecter — pas encore » était FAUX.
    //    Restent éteints, avec leur raison, les gestes que le back NE sert PAS : « Fermer partout » (L11), « Tout effacer » (L10).
    // ⛔ NON REVU — jalon 2026-09-05.
    public class SettingsScreenController : MonoBehaviour, IShellTenant
    {
        [Header("Backend")]
        private string baseUrlPose;   // posée par un appelant (tests, shell) ; sinon la source unique
        private string baseUrl { get => baseUrlPose ?? MafiaCleanCity.AdresseDuBack.Url; set => baseUrlPose = value; }
        public ProfilData Profil { get; private set; }
        public string LangueCourante { get; private set; }
        public bool EtatVide { get; private set; }
        /// <summary>⛔ LE SEUL PRÉDICAT HONNÊTE POUR UNE CAPTURE. Attendre qu'un CHAMP arrive
        /// n'est pas attendre que l'écran soit DESSINÉ : ㉓ enchaîne trois requêtes, et guetter la
        /// première faisait capturer DEUX requêtes trop tôt — image vide, test vert. ⑰ battait
        /// entre 23 et 3 éléments d'un run à l'autre pour la même raison, une requête d'avance.
        /// ⇒ Ce compteur monte à la FIN de `Rendre()`. C'est une propriété structurelle : elle ne
        /// dépend d'aucun champ, d'aucun ordre de requêtes, et elle survivra à l'ajout d'un appel.</summary>
        public int RendusEffectues { get; private set; }
        public string DerniereErreur { get; private set; }
        /// <summary>L'état des tutoriels (`GET /v1/ui/tutorial-state`), pour la bascule « On vous explique encore ».</summary>
        public TutorielData Tutoriels { get; private set; }
        /// <summary>Gardes : les gestes DEMANDÉS (la valeur envoyée), null avant tout geste.</summary>
        public bool? DernierOptOutDemande { get; private set; }
        public bool? DerniereVisibiliteDemandee { get; private set; }
        public bool DeconnexionDemandee { get; private set; }
        /// <summary>Vrai après une sortie CONFIRMÉE par le back (`signed_out: true`).</summary>
        public bool CoffreFerme { get; private set; }
        /// <summary>Gardes : l'état AFFICHÉ des deux bascules.</summary>
        public bool BasculeTutorielsAffichee { get; private set; }
        public bool BasculeMarcheAffichee { get; private set; }

        private TutorialClient tutoriels;

        /// <summary>Couture de test : rend un état fabriqué, sans réseau.</summary>
        public void RendrePourTest(ProfilData profil, TutorielData etatTutoriels)
        {
            Init();
            Profil = profil;
            LangueCourante = profil != null ? profil.locale : null;
            Tutoriels = etatTutoriels;
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

        private SettingsClient client;
        private string token;
        private bool initialise;
        private Transform mountParent;
        private RectTransform corps;
        private TextMeshProUGUI videTexte;

        private void Awake() => Init();

        /// <summary>⛔ Le shell ajoute des frères APRÈS la fenêtre synchrone du montage
        /// (`AppShell.ConstruireLocataire` : parentage, PUIS `AddComponent`, PUIS les setters).
        /// `Start()` s'exécute à la frame suivante — le premier instant où « être dernier » est
        /// stable. Sans ça, l'écran rend SOUS ses frères, à la bonne taille et au bon endroit.</summary>
        private void Start()
        {
            if (transform.parent != null) transform.SetAsLastSibling();
        }

        private void Init()
        {
            if (initialise) return;
            initialise = true;
            client = new SettingsClient { BaseUrl = baseUrl };
            tutoriels = new TutorialClient { BaseUrl = baseUrl };
            Construire();
        }

        public void SetMountParent(Transform parent)
        {
            mountParent = parent;
            Init();
            RectTransform rt = (RectTransform)transform;
            rt.anchorMin = Vector2.zero;
            rt.anchorMax = Vector2.one;
            rt.offsetMin = Vector2.zero;
            rt.offsetMax = Vector2.zero;
            transform.SetAsLastSibling();
        }

        public void SetToken(string bearer)
        {
            Init();
            token = bearer;
            if (!string.IsNullOrEmpty(bearer)) StartCoroutine(Charger(bearer));
        }

        private IEnumerator Charger(string bearer)
        {
            yield return client.LireProfil(bearer, p => { Profil = p; LangueCourante = p.locale; },
                                           (c, m) => DerniereErreur = $"{c}: {m}");
            yield return tutoriels.LireEtat(bearer, e => Tutoriels = e,
                                            (c, m) => DerniereErreur = $"tutoriels {c}: {m}");
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
                videTexte.text = DerniereErreur == null
                    ? Lib("Aucun réglage.")
                    : Lib("Les réglages n'ont pas répondu.");
                RendusEffectues++;
                return;
            }

            // « La langue de la maison » : le mot RATIFIÉ (D14, Profil série 6 cadres 95-97), plus « LA LANGUE ».
            Section(Lib("La langue de la maison"));
            foreach (string l in SettingsClient.Langues) Langue(l);

            // Le tiroir « Le jeu » : les deux préférences SERVIES, chacune sur sa route.
            Section(Lib("Le jeu"));
            if (Tutoriels != null)
            {
                bool allumee = BasculeTutoriels.Allumee(Tutoriels.tutorials_opt_out);   // le SEUL lieu de l'inversion, partagé avec ㉕
                BasculeTutorielsAffichee = allumee;
                Bascule("Bascule_Tutoriels", Lib("On vous explique encore"),
                        Lib("décochez le jour où vous n’avez plus besoin qu’on vous tienne la main"), allumee,
                        () => StartCoroutine(DefinirOptOut(BasculeTutoriels.OptOutPour(!allumee))));
            }
            bool visible = Profil.meta_market_visibility_enabled;
            BasculeMarcheAffichee = visible;
            Bascule("Bascule_Marche", Lib("Dire mes prix au marché"),
                    Lib("sans ça, le marché de région ne vous dit rien non plus"), visible,
                    () => StartCoroutine(DefinirVisibilite(!visible)));

            // La sortie : « Fermer le coffre · cette session seulement » (ratifié, cadres 95-96), VIVANTE (`POST /v1/auth/signout`).
            if (CoffreFerme)
                Texte(corps, "CoffreFerme", Lib("Le coffre est fermé."), Px(11f), Creme2,
                      DesignTokens.Current.hudSerifFont, TextAlignmentOptions.Center);
            else
                Geste("FermerLeCoffre", Lib("Fermer le coffre"), Lib("cette session seulement"),
                      () => StartCoroutine(FermerLeCoffre()));

            // Ce que le back NE sert PAS : dessiné par la porte ratifiée, éteint, avec sa raison — le client dit vrai.
            Section(Lib("Ce qui ne s’ouvre pas encore"));
            // D17 (atelier 38, `d75bb64e`) : l'espace INSÉCABLE U+00A0 avant « : » et à l'intérieur des « », comme le fr servi — un repli
            // à espace ordinaire réintroduirait la coupure de ligne que D17 corrige. Écrit en `\u00A0`, visible dans la source.
            Manque(Lib("Fermer partout"), Lib("pas encore\u00A0: toutes les sessions ouvertes n’ont pas encore de guichet"));
            Manque(Lib("Tout effacer"), Lib("pas encore\u00A0: «\u00A0et ne plus jamais revenir\u00A0» n’a pas encore de guichet"));
            RendusEffectues++;
        }

        private void Section(string titre)
        {
            TextMeshProUGUI t = Texte(corps, "S_" + titre, titre, Px(7.5f), Eteint, DesignTokens.Current.primaryFont);
            t.characterSpacing = 14f;
            t.fontStyle = FontStyles.UpperCase;   // la casse est au RENDU : le catalogue garde « La langue de la maison »
        }

        /// <summary>Une bascule du tiroir « Le jeu » : libellé, sous-ligne, interrupteur (allumé : or, curseur à droite).</summary>
        private void Bascule(string nom, string libelle, string sous, bool allumee, UnityEngine.Events.UnityAction geste)
        {
            GameObject ligne = Bloc(nom, corps, true, Px(8f));
            var h = ligne.GetComponent<HorizontalLayoutGroup>();
            h.childAlignment = TextAnchor.MiddleLeft;
            h.childForceExpandWidth = false;
            h.padding = new RectOffset((int)Px(10f), (int)Px(10f), (int)Px(6f), (int)Px(6f));
            GameObject textes = Bloc("Textes", ligne.transform, false, Px(2f));
            textes.AddComponent<LayoutElement>().flexibleWidth = 1f;
            Texte(textes.transform, "Libelle", libelle, Px(10.5f), Creme, DesignTokens.Current.primaryFont).enableWordWrapping = true;
            Texte(textes.transform, "Sous", sous, Px(7.5f), Creme2, DesignTokens.Current.primaryFont).enableWordWrapping = true;

            GameObject piste = new GameObject("Interrupteur", typeof(RectTransform));
            piste.transform.SetParent(ligne.transform, false);
            LayoutElement pl = piste.AddComponent<LayoutElement>();
            pl.preferredWidth = pl.minWidth = Px(22f);
            pl.preferredHeight = pl.minHeight = Px(12f);
            Image fond = piste.AddComponent<Image>();
            fond.sprite = ProceduralUI.RoundedRectMask((int)Px(6f));
            fond.type = Image.Type.Sliced;
            fond.color = allumee ? Or : Eteint;
            GameObject curseur = new GameObject("Curseur", typeof(RectTransform));
            curseur.transform.SetParent(piste.transform, false);
            var crt = (RectTransform)curseur.transform;
            crt.anchorMin = crt.anchorMax = crt.pivot = new Vector2(allumee ? 1f : 0f, 0.5f);
            crt.sizeDelta = new Vector2(Px(10f), Px(10f));
            crt.anchoredPosition = new Vector2(allumee ? -Px(1f) : Px(1f), 0f);
            Image rond = curseur.AddComponent<Image>();
            rond.sprite = ProceduralUI.RoundedRectMask((int)Px(5f));
            rond.type = Image.Type.Sliced;
            rond.color = Creme;
            rond.raycastTarget = false;

            Image zone = ligne.AddComponent<Image>();
            Color transparent = Color.white; transparent.a = 0f;
            zone.color = transparent;
            Button b = ligne.AddComponent<Button>();
            b.targetGraphic = zone;
            b.onClick.AddListener(geste);
        }

        /// <summary>Un geste VIVANT de la porte (« Fermer le coffre ») : contour or, libellé, sous-ligne.</summary>
        private void Geste(string nom, string libelle, string sous, UnityEngine.Events.UnityAction action)
        {
            GameObject b = Bloc(nom, corps, false, Px(1f));
            var v = b.GetComponent<VerticalLayoutGroup>();
            v.childAlignment = TextAnchor.MiddleCenter;
            v.padding = new RectOffset((int)Px(8f), (int)Px(8f), (int)Px(6f), (int)Px(6f));
            Image bf = b.AddComponent<Image>();
            bf.sprite = ProceduralUI.RoundedRectOutline((int)Px(9f), Px(1f), Or);
            bf.type = Image.Type.Sliced;
            TextMeshProUGUI l = Texte(b.transform, "L", libelle, Px(9f), Or, DesignTokens.Current.primaryFont, TextAlignmentOptions.Center);
            l.characterSpacing = 10f;
            l.fontStyle = FontStyles.UpperCase;
            Texte(b.transform, "R", sous, Px(6.8f), Creme2, DesignTokens.Current.primaryFont, TextAlignmentOptions.Center);
            b.AddComponent<Button>().onClick.AddListener(action);
        }

        private IEnumerator DefinirOptOut(bool optOut)
        {
            DernierOptOutDemande = optOut;
            if (string.IsNullOrEmpty(token)) yield break;
            yield return tutoriels.DefinirRefus(optOut, token, _ => { }, (c, m) => DerniereErreur = $"tutoriels {c}: {m}");
            yield return Charger(token);   // le serveur seul décide de ce qui a été écrit
        }

        private IEnumerator DefinirVisibilite(bool enabled)
        {
            DerniereVisibiliteDemandee = enabled;
            if (string.IsNullOrEmpty(token)) yield break;
            yield return client.DefinirVisibiliteMarche(enabled, token, _ => { }, (c, m) => DerniereErreur = $"marché {c}: {m}");
            yield return Charger(token);
        }

        /// <summary>`POST /v1/auth/signout` : la session courante est RÉVOQUÉE. Le jeton du shell ne vaut plus rien ensuite. Le SHELL
        /// ferme le coffre (`IFermetureDuCoffre`) : il démonte ses locataires et n'offre qu'un geste, « Rouvrir le coffre », qui rejoue
        /// le lancement. Monté seul, l'écran dit « Le coffre est fermé. » et ne relit rien.</summary>
        private IEnumerator FermerLeCoffre()
        {
            DeconnexionDemandee = true;
            if (string.IsNullOrEmpty(token)) yield break;
            yield return client.Deconnecter(token, () => CoffreFerme = true, (c, m) => DerniereErreur = $"sortie {c}: {m}");
            if (!CoffreFerme) yield break;
            // Le SHELL ferme le coffre (décision f2 du 23/09) : il démonte tout — cet écran compris — et n'offre plus que « Rouvrir le
            // coffre ». Monté seul (un test), l'écran le dit lui-même.
            IFermetureDuCoffre shell = FermetureDuCoffreLocator.Find();
            if (shell != null) shell.CoffreFerme();
            else Rendre();
        }

        /// <summary>Un choix de langue. ⚠️ Les libellés sont écrits en DUR et c'est assumé : il
        /// n'existe aucune clé i18n servie par ce back (178 référencées, 0 servie), et une langue
        /// doit se reconnaître dans SA propre langue, jamais traduite.</summary>
        private void Langue(string code)
        {
            bool active = code == LangueCourante;
            string nom = code == "fr" ? "Français" : code == "en" ? "English" : code;

            GameObject r = Bloc("L_" + code, corps, true, Px(6f));
            var h = r.GetComponent<HorizontalLayoutGroup>();
            h.childAlignment = TextAnchor.MiddleLeft;
            // ⛔ SANS CECI LA PASTILLE EST ÉTIRÉE SUR TOUTE LA LARGEUR, en une ellipse d'or de
            // 400 px — vu sur la capture du 2026-09-02. `Bloc()` laisse `childForceExpandWidth` à
            // vrai, ce qui écrase le `flexibleWidth = 0` de la pastille : le groupe distribue
            // l'espace restant à TOUS ses enfants, y compris ceux qui ont déclaré ne pas en
            // vouloir. *Un disque étiré ne se lit plus comme un disque* — et l'étirement d'un
            // sprite rond en ellipse est le défaut que ce dépôt a déjà payé sur un anneau 9-slice.
            // ⇒ Trouvé par un balayage, pas par l'œil : des 8 écrans qui dessinent une pastille,
            // celui-ci était le SEUL à ne jamais poser cette ligne (0 occurrence contre 1 à 12).
            h.childForceExpandWidth = false;
            h.padding = new RectOffset((int)Px(10f), (int)Px(10f), (int)Px(8f), (int)Px(9f));
            Image fond = r.AddComponent<Image>();
            fond.sprite = ProceduralUI.RoundedRectOutline((int)Px(10f), Px(1f),
                active ? Or : Hex("#ffffff24"));
            fond.type = Image.Type.Sliced;

            GameObject puce = new GameObject("Puce", typeof(RectTransform));
            puce.transform.SetParent(r.transform, false);
            puce.AddComponent<Image>().sprite =
                ProceduralUI.RadialDisc((int)Px(9f), active ? Or : Eteint, Hex("#7a5a14"));
            LayoutElement pl = puce.AddComponent<LayoutElement>();
            pl.preferredWidth = Px(9f); pl.preferredHeight = Px(9f); pl.flexibleWidth = 0f;

            Texte(r.transform, "Nom", nom, Px(11.5f), active ? Creme : Creme2,
                  DesignTokens.Current.hudSerifFont);

            if (active) return;
            Button b = r.AddComponent<Button>();
            string c = code;
            b.onClick.AddListener(() => StartCoroutine(Changer(c)));
        }

        private IEnumerator Changer(string code)
        {
            if (string.IsNullOrEmpty(token)) yield break;
            yield return client.DefinirLangue(code, token, l => LangueCourante = l,
                                              (c, m) => DerniereErreur = $"langue {c}: {m}");
            // On RELIT le profil : le serveur seul décide de ce qui a été écrit.
            yield return Charger(token);
        }

        private void Manque(string libelle, string raison)
        {
            GameObject b = Bloc("M_" + libelle, corps, false, Px(1f));
            var v = b.GetComponent<VerticalLayoutGroup>();
            v.childAlignment = TextAnchor.MiddleCenter;
            v.padding = new RectOffset((int)Px(8f), (int)Px(8f), (int)Px(6f), (int)Px(6f));
            Image bf = b.AddComponent<Image>();
            bf.sprite = ProceduralUI.RoundedRectDashedOutline((int)Px(9f), Px(1f), (int)Px(4f), (int)Px(3f), Eteint);
            // ⛔ `Tiled`, PAS `Sliced` — et c'est le générateur lui-même qui le dit : « un contour
            //    de rectangle arrondi en POINTILLÉS, à utiliser en `Image.Type.Tiled` ». Les deux
            //    respectent le `border` du sprite et gardent les coins ; `Sliced` ÉTIRE la section
            //    centrale — qui porte exactement UNE période de pointillé — et la transforme en une
            //    longue barre, tandis que `Tiled` la RÉPÈTE. Mesuré par un juge ⊥ sur un cadre brisé :
            //    334 px de trou, 36 %, symétrique haut et bas parce que les deux rails partagent la
            //    même bande. ⇒ Classe fermée sur les 7 sites, pas seulement sur celui du rapport ;
            //    le remède était DÉJÀ en production sur deux sites de `LieutenantScreenController`.
            bf.type = Image.Type.Tiled;
            Texte(b.transform, "L", libelle, Px(9f), Eteint,
                  DesignTokens.Current.primaryFont, TextAlignmentOptions.Center).characterSpacing = 10f;
            Texte(b.transform, "R", raison, Px(6.8f), Creme2,
                  DesignTokens.Current.primaryFont, TextAlignmentOptions.Center).enableWordWrapping = true;
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

            TextMeshProUGUI titre = Texte(transform, "Titre", "LES RÉGLAGES", Px(13f), Or,
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

        /// <summary>Item 0.6 — les littéraux STATIQUES de cet écran passent par
        /// `reglages.bloc.<slug>`, repli sur le littéral (affichage BYTE-IDENTIQUE tant que le
        /// dictionnaire ne porte pas la clé — c'est ce qui rend la conversion sûre sans run).
        /// ⚠️ « Aucun réglage » et « Les réglages n'ont pas répondu » disent deux choses
        /// DIFFÉRENTES — un état vide et une panne — et gardent donc deux clés distinctes.</summary>
        private static string Lib(string litteral) =>
            MafiaCleanCity.I18n.Libelle.De("reglages", "bloc", litteral);

    }
}
