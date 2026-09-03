using System.Collections;
using UnityEngine;
using UnityEngine.UI;
using TMPro;
using MafiaCleanCity.Shell;
using MafiaCleanCity.Theme;

namespace MafiaCleanCity.Operational
{
    /// <summary>screen_c3 « Carnet » — squelette généré par Tools/nouvel-ecran.py.
    ///
    /// Patron : `ReputationScreenController` (㊲, `pilote-B` — le seul écran construit ET jugé
    /// par juge-visuel ET juge-données). Ce squelette pose le contrat `IShellTenant`, un fond
    /// CanvasRenderer-safe et un résolveur exhaustif d'exemple ; il NE POSE PAS la géométrie de
    /// la maquette — ça, c'est `// MÉTIER ICI`, une fois la maquette lue.
    ///
    /// GÉOMÉTRIE — deux règles héritées, non négociables (mesurées ailleurs dans ce dépôt) :
    ///  · aucune valeur dérivée de `Screen.*` ni d'un `rect` lu au montage — passer par
    ///    `EchelleMaquette.Px(...)` avec la largeur DÉCLARÉE de LA maquette de cet écran
    ///    (`EchelleMaquette.LargeurEcransBrennar` = 300 par défaut pour les écrans de la famille
    ///    `ecrans-brennar.html` — // MÉTIER ICI : vérifier laquelle des 3 maquettes est la
    ///    source, ou ajouter une constante `Largeur<Nom>` si c'en est une quatrième).
    ///  · `Canvas.scaleFactor` lu la frame de la création rend 1,0 — plausible et faux. Toute
    ///    lecture de géométrie attend `yield return null` après la construction.</summary>
    public class CarnetScreenController : MonoBehaviour, IShellTenant
    {
        [Header("Backend")]
        [SerializeField] private string baseUrl = "http://localhost";

        // ---- points d'injection du shell (IShellTenant) -----------------------------------
        private Transform mountParent;
        /// <summary>⛔ CE POINT D'INJECTION CONSTRUIT — ET C'EST LE CORRECTIF (mesuré 2026-09-02).
        /// Le gabarit appelait <c>EnsureInitialized()</c> depuis <c>Awake()</c>. Or <c>Awake</c>
        /// s'exécute SYNCHRONEMENT DANS <c>AddComponent&lt;T&gt;()</c>, donc AVANT que l'appelant
        /// ait pu poser le parent : la racine n'a pas encore de largeur, et <c>BuildLayout()</c>
        /// mesure zéro. Symptôme observé sur un écran réel : textes empilés au centre, ce qui
        /// ressemble à un défaut de mise en page alors que c'est un défaut d'ORDRE.
        /// ⇒ *Le shell, lui, fait déjà le bon ordre à ses trois sites de montage (parent, puis
        /// géométrie, puis <c>AddComponent</c> en DERNIER) — le défaut n'était pas chez lui, il
        /// était dans ce gabarit, donc dans les 46 écrans qu'il reste à générer.*
        /// La construction se déclenche donc quand le parent est CONNU, pas quand l'objet naît.</summary>
        public void SetMountParent(Transform parent)
        {
            mountParent = parent;

            // ⛔⛔ LES DEUX GESTES CI-DESSOUS SONT UN CORRECTIF MESURÉ (2026-09-03, écran ㉜),
            // et ce gabarit produit les écrans qui restent : sans eux, CHACUN naîtrait avec le
            // même défaut. Le gabarit faisait bâtir la racine sous `mountParent` (= `ContentSlot`) :
            // elle devenait un FRÈRE de l'hôte du locataire au lieu de son enfant. La garde d'ordre
            // de fratrie de la planche l'a dit au premier montage réel — « frère 18 sur 20 — ce qui
            // se dessine PAR DESSUS : [19] <Nom>Root graphics=52 ». L'écran était complet et se
            // recouvrait LUI-MÊME : la garde mesurait l'hôte, le dessin vivait sur la racine.
            // ⇒ Les écrans qui passent déjà sous le shell (`Shop`, `Settings`, …) font tous
            //   l'inverse : hôte étiré au conteneur, hôte DERNIER, racine sous l'hôte.

            // (1) L'hôte remplit son conteneur. Sans ça son rect reste à 100×100 — la taille par
            // défaut d'un RectTransform neuf — et tout ce qu'on bâtit dessous tient dans 100 px,
            // sans la moindre erreur console.
            // ⛔⛔ L'HÔTE N'EST PAS UN `RectTransform` — ET LA RÈGLE EXACTE A ÉTÉ MESURÉE.
            // `AppShell.ConstruireLocataire` crée l'hôte par `new GameObject($"Tenant_...")`,
            // donc avec un `Transform` NU. Les écrans qui en ont quand même un ne l'ont pas
            // reçu : ils l'ont PROVOQUÉ, en posant un `Graphic` directement sur l'hôte — Unity
            // convertit alors le Transform toute seule.
            // ⇒ **L'hôte est un `RectTransform` si et seulement si l'écran dessine dessus.**
            //   Cet écran-ci dessine dans un ENFANT de l'hôte, donc la conversion n'arriverait
            //   jamais : le harnais de capture rendrait « n'est pas un RectTransform », et un
            //   cast dur rendrait une `InvalidCastException` nue (mesuré, run r2 et run 3).
            // ⇒ On la demande donc EXPLICITEMENT, plutôt que de compter sur un effet de bord de
            //   quelqu'un d'autre. Un `RectTransform` ajouté ici remplace le `Transform` — c'est
            //   l'opération prévue par Unity pour exactement ce cas.
            RectTransform rtHote = transform as RectTransform;
            if (rtHote == null) rtHote = gameObject.AddComponent<RectTransform>();
            if (rtHote != null)
            {
                rtHote.anchorMin = Vector2.zero;
                rtHote.anchorMax = Vector2.one;
                rtHote.offsetMin = Vector2.zero;
                rtHote.offsetMax = Vector2.zero;
            }

            // (2) Un locataire monté en surimpression doit être le DERNIER enfant, sinon il est
            // rendu SOUS ses frères. Propriété STRUCTURELLE : aucun pixel, aucune résolution.
            transform.SetAsLastSibling();

            EnsureInitialized();
        }

        private string token;
        public void SetToken(string t) => token = t;

        // ---- crochets de test ---------------------------------------------------------------
        public CarnetCourantDto DernierChargement { get; private set; }
        /// <summary>Le code rendu par `named-sequences` — 403 MESURÉ sur un compte frais.
        /// ⚠️ Ce n'est PAS une erreur à masquer : c'est le verrou que le cadre m-89 demande de
        /// MONTRER. Zéro = pas encore demandé.</summary>
        public long CodeSuitesNommees { get; private set; }
        /// <summary>Vrai dès que l'écran a FINI de se rendre — succès, vide ou repli.</summary>
        public bool RenduTermine { get; private set; }
        public string DerniereErreur { get; private set; }
        public long DernierCodeErreur { get; private set; }

        private RectTransform racinePleinEcran;
        // ⛔ `JournalClient` — LE PRODUCTEUR DES ROUTES `ambient`, déjà écrit pour ㊳ et
        // déjà MESURÉ (200 sur `/v1/ambient/feed`). Le générateur m'en avait fabriqué un second
        // avec des DTO en double ; le compilateur l'a dit avant le premier run, comme pour ㊵.
        private CarnetClient client;
        private bool initialise;

        private float Px(float css) =>
            EchelleMaquette.Px(css, racinePleinEcran, EchelleMaquette.LargeurEcransBrennar);
        private int PxTrait(float css) =>
            EchelleMaquette.PxTrait(css, racinePleinEcran, EchelleMaquette.LargeurEcransBrennar);

        // ⚠️ PAS d'appel depuis `Awake()` : il court dans `AddComponent`, avant tout parentage.
        // `Start()` est le filet — il s'exécute après que l'appelant a eu sa frame pour injecter le
        // parent, et `EnsureInitialized` est idempotent, donc le premier des deux qui arrive gagne
        // sans que le second ne reconstruise. Sans ce filet, un écran monté sans `SetMountParent`
        // ni `Charger()` ne se construirait JAMAIS — un vert par absence, pas une économie.
        private void Start()
        {
            // ⛔ RÉPÉTÉ ICI, ET CE N'EST PAS UNE REDONDANCE. Le shell ajoute des enfants à
            // `ContentSlot` APRÈS la fenêtre synchrone du montage — mesuré ailleurs dans ce dépôt :
            // « frère 6 sur 11 » restait inchangé quand l'ordre n'était posé qu'au montage.
            // `Start()` court à la frame SUIVANTE : c'est le premier instant où « être dernier »
            // est stable.
            if (transform.parent != null) transform.SetAsLastSibling();
            EnsureInitialized();
        }

        private void EnsureInitialized()
        {
            if (initialise) return;
            initialise = true;
            client = new CarnetClient { BaseUrl = baseUrl };
            BuildLayout();
        }

        // ═══ Chargement ══════════════════════════════════════════════════════════════════════

        /// <summary>Charge la surface. // MÉTIER ICI si `GetAmbientFeed` a des paramètres
        /// de chemin (id, etc.) — ajouter les arguments correspondants ici et les faire
        /// remonter depuis l'appelant (le shell, ou un `RendrePourTest`).</summary>
        public IEnumerator Charger()
        {
            EnsureInitialized();
            DerniereErreur = null;
            DernierCodeErreur = 0;

            RenduTermine = false;

            yield return client.GetCarnetCourant(token,
                dto => DernierChargement = dto,
                (code, msg) => { DernierCodeErreur = code; DerniereErreur = msg; });

            // ⛔ LE 403 EST UNE RÉPONSE, PAS UN ÉCHEC. `named-sequences` rend 403 tant que le
            // palier 2 n'est pas atteint (`NAMED_SEQUENCE_UNLOCK_REQUIRED`, mesuré). On garde le
            // CODE pour le montrer verrouillé — le cadre m-89 dessine cette fonction, et la
            // cacher effacerait ce que le joueur doit apprendre à débloquer.
            yield return client.GetSuitesNommees(token,
                _ => CodeSuitesNommees = 200,
                (code, msg) => CodeSuitesNommees = code);

            // La frame de création rend des rects non résolus : on attend le layout AVANT de
            // rendre quoi que ce soit qui lise une géométrie.
            yield return null;

            if (DernierChargement == null) { RendreEtatIndisponibleNomme(); RenduTermine = true; yield break; }
            AppliquerEtat(DernierChargement);
            RenduTermine = true;
        }

        /// <summary>Rend un corps FABRIQUÉ, sans réseau — réservé aux tests (patron ㊲,
        /// `RendrePourTest`). Ne prouve jamais que le back émet ce corps, seulement ce que
        /// l'écran EN FAIT.</summary>
        public void RendrePourTest(CarnetCourantDto dto)
        {
            EnsureInitialized();
            AppliquerEtat(dto);
        }

        /// <summary>// MÉTIER ICI — TOUT le rendu métier de cet écran part d'ici. Vide à
        /// dessein : remplir depuis la maquette RATIFIÉE et le corps RÉEL mesuré, jamais depuis
        /// une supposition sur ce que l'interface TypeScript back "devrait" rendre.</summary>
        /// <summary>L'état AVANT tout chargement — le troisième, celui qu'on oublie.
        /// ⚠️ TROIS états donnent un carnet à huit lignes vides, et rien ne les distingue à
        /// l'image : « pas encore demandé », « demandé et vide », « pas de réponse ». Les
        /// confondre fait passer une panne pour une soirée sans ordres.</summary>
        private void RendreEtatInitial()
        {
            titreEcran.text = Lib("Les ordres de ce soir");
            sousTitre.text = Lib("le carnet n'a pas encore été ouvert");
            compte.text = "";
            ViderCreneaux();
            for (int i = 1; i <= 8; i++) Creneau(i, null, null);
            MajPanneau(Lib("CE QUE CET ÉCRAN SAIT POUR L'INSTANT"),
                Lib("Rien n'a encore été demandé"),
                Lib("ce n'est ni « aucun ordre » ni « pas de réponse », c'est « pas encore »."));
        }

        private void RendreEtatIndisponibleNomme()
        {
            titreEcran.text = Lib("Les ordres de ce soir");
            sousTitre.text = Lib("le carnet ne répond pas");
            compte.text = "";
            ViderCreneaux();
            for (int i = 1; i <= 8; i++) Creneau(i, null, null);
            MajPanneau(Lib("CE QUE LE SERVEUR ENVOIE VRAIMENT"), Lib("Pas de réponse"),
                Lib("la route n'a rien rendu. Ce n'est pas « la soirée est vide » : c'est « on ne "
                    + "sait pas ce qui est prévu »."));
        }

        private void AppliquerEtat(CarnetCourantDto dto)
        {
            string[] creneaux = dto != null && dto.slots != null ? dto.slots : new string[0];

            titreEcran.text = Lib("Les ordres de ce soir");
            sousTitre.text = creneaux.Length == 0
                ? Lib("aucun ordre posé — entre quatre et huit, dans l'ordre où ils partiront")
                : Lib("entre quatre et huit gestes, dans l'ordre où ils partiront");
            compte.text = creneaux.Length + Lib(" ORDRES SUR 8");

            ViderCreneaux();
            // ⛔ LES HUIT SONT TOUJOURS DESSINÉS. Le plafond donne sa forme au geste, et masquer
            // les vides ferait croire le carnet plein. `slots` est mesuré VIDE sur un compte
            // frais et sa forme n'est pas connue : on n'affiche donc que le RANG, jamais un
            // titre inventé.
            for (int i = 1; i <= 8; i++)
                Creneau(i, i <= creneaux.Length ? creneaux[i - 1] : null, null);

            if (CodeSuitesNommees == 403)
            {
                // ⛔ LE VERROU SE MONTRE, IL NE SE CACHE PAS — cadre m-89. Le 403 mesuré est
                // `NAMED_SEQUENCE_UNLOCK_REQUIRED` : rejouer une soirée d'un geste s'ouvre au
                // palier 2. Masquer la fonction priverait le joueur de la seule chose qui lui
                // dise qu'elle existe.
                MajPanneau(Lib("CE QUI S'OUVRIRA PLUS TARD"),
                    Lib("Rejouer une soirée — verrouillé"),
                    Lib("une suite d'ordres qu'on met de côté et qu'on relance d'un geste. Le "
                        + "serveur la refuse tant que le palier 2 n'est pas atteint."));
                return;
            }

            // ⚠️ CE QUE CET ÉCRAN NE PEUT PAS MONTRER, et qui est MESURÉ : le calendrier
            // politique (cadre m-91, « Ce qui arrive »). Les quatre chemins joueur essayés
            // rendent 404 et la documentation ne porte que `/v1/admin/political-events/*`.
            // ★ Le dire plutôt que d'omettre le cadre : un écran amputé sans explication se lit
            //   comme un écran fini.
            MajPanneau(Lib("CE QUE CET ÉCRAN NE PEUT PAS VOUS DIRE"),
                Lib("Ce que la ville prépare"),
                Lib("le calendrier politique n'a aucune route joueur — seul l'administrateur y "
                    + "accède. La maquette le dessine ; le serveur ne le sert à personne."));

        }

        /// <summary>Repli NOMMÉ sur échec réseau — jamais une exception, jamais un écran noir
        /// (patron ㊲ : `Render(null)` a fait planter un autre écran de ce dépôt à la première
        /// ligne qui lisait le payload).</summary>
        private void RendreEtatIndisponible()
        {
            // MÉTIER ICI — au minimum, un texte d'état ; ne PAS laisser le rendu du chargement
            // précédent affiché (même défaut qu'une liste non vidée : ㊲ l'a payé).
        }

        // ═══ Construction de la mise en page ═════════════════════════════════════════════════

        // ═══ Palette du CARNET — le papier contre la nuit ═══════════════════════════════════
        // ⛔ Ces trois teintes ne sortent pas de `DesignTokens` : elles sont propres à cet écran,
        // parce qu'il est le seul du programme à opposer un objet CHAUD (le carnet du joueur) au
        // châssis FROID (ce que la ville lui sert). Les prendre dans les jetons de surface
        // rendrait le carnet identique aux autres blocs, et l'écran perdrait son argument.
        private static readonly Color CouleurPapier      = new Color(0.898f, 0.878f, 0.816f);
        private static readonly Color CouleurEncre       = new Color(0.129f, 0.106f, 0.075f);
        private static readonly Color CouleurEncreFaible = new Color(0.404f, 0.365f, 0.302f);

        private RectTransform listeRoot;
        private TextMeshProUGUI titreEcran, sousTitre, compte;
        private TextMeshProUGUI pannSur, pannTitre, pannTexte;

        /// <summary>Item 0.6 — les littéraux STATIQUES passent par `carnet.bloc.<slug>`.
        /// ⚠️ Le repli est FRANÇAIS, pas anglais : `Libelle.De` rend le littéral quand la clé
        /// manque, donc un repli anglais s'affiche en anglais À TRAVERS la conversion. Mesuré le
        /// 2026-09-03 : 81 de mes 107 replis étaient dans ce cas.</summary>
        private static string Lib(string litteral) =>
            MafiaCleanCity.I18n.Libelle.De("carnet", "bloc", litteral);

        private void ConstruirePanneau(Transform parent)
        {
            GameObject go = NouveauUI("Panneau", parent);
            AjouterFond(go, DesignTokens.Current.surfaceCard);
            var le = go.AddComponent<LayoutElement>();
            le.minHeight = Px(74f); le.preferredHeight = -1f; le.flexibleHeight = 0f;
            var v = go.AddComponent<VerticalLayoutGroup>();
            v.padding = new RectOffset((int)Px(10f), (int)Px(10f), (int)Px(8f), (int)Px(8f));
            v.spacing = Px(3f);
            v.childControlWidth = true; v.childControlHeight = true;
            v.childForceExpandWidth = true; v.childForceExpandHeight = false;
            pannSur = NouveauTexte(go.transform, "SurTitre", "", Px(7f),
                DesignTokens.Current.hudCremeSecondary, DesignTokens.Current.primaryFont);
            pannTitre = NouveauTexte(go.transform, "Titre", "", Px(12f),
                DesignTokens.Current.accentGold, DesignTokens.Current.hudSerifFont);
            pannTexte = NouveauTexte(go.transform, "Texte", "", Px(8.5f),
                DesignTokens.Current.hudCremeSecondary, DesignTokens.Current.primaryFont);
        }

        private void MajPanneau(string sur, string titre, string texte)
        {
            if (pannSur == null) return;
            pannSur.text = sur; pannTitre.text = titre; pannTexte.text = texte;
        }

        private void ViderCreneaux()
        {
            if (listeRoot == null) return;
            for (int i = listeRoot.childCount - 1; i >= 0; i--)
            {
                GameObject e = listeRoot.GetChild(i).gameObject;
                if (e.name != "EnteteCarnet") UnityEngine.Object.Destroy(e);
            }
        }

        /// <summary>Un créneau du carnet — REMPLI ou vide. Le cadre m-85 dessine les deux :
        /// un numéro plein et un titre pour les remplis, un numéro pâle et « — rien — » pour les
        /// vides. Les huit sont TOUJOURS dessinés : c'est le plafond qui donne sa forme au
        /// geste, et masquer les vides ferait croire que le carnet est plein.</summary>
        private void Creneau(int rang, string titre, string sous)
        {
            GameObject go = NouveauUI("Creneau" + rang, listeRoot);
            var le = go.AddComponent<LayoutElement>();
            le.minHeight = Px(26f); le.preferredHeight = -1f; le.flexibleHeight = 0f;
            var h = go.AddComponent<HorizontalLayoutGroup>();
            h.padding = new RectOffset(0, 0, (int)Px(3f), (int)Px(3f));
            h.spacing = Px(7f);
            h.childControlWidth = true; h.childControlHeight = true;
            h.childForceExpandWidth = false; h.childForceExpandHeight = false;
            h.childAlignment = TextAnchor.MiddleLeft;

            bool vide = string.IsNullOrEmpty(titre);
            TextMeshProUGUI num = NouveauTexte(go.transform, "Rang", rang.ToString(), Px(9f),
                vide ? CouleurEncreFaible : CouleurEncre, DesignTokens.Current.primaryFont);
            num.alignment = TextAlignmentOptions.Center;
            var leNum = num.gameObject.AddComponent<LayoutElement>();
            leNum.minWidth = Px(16f); leNum.preferredWidth = Px(16f); leNum.flexibleWidth = 0f;

            GameObject corps = NouveauUI("Corps", go.transform);
            var vc = corps.AddComponent<VerticalLayoutGroup>();
            vc.childControlWidth = true; vc.childControlHeight = true;
            vc.childForceExpandWidth = true; vc.childForceExpandHeight = false;
            var leC = corps.AddComponent<LayoutElement>();
            leC.flexibleWidth = 1f;

            if (vide)
            {
                TextMeshProUGUI rien = NouveauTexte(corps.transform, "Rien", Lib("— rien —"),
                    Px(9f), CouleurEncreFaible, DesignTokens.Current.hudSerifFont);
                // ⛔ À GAUCHE, comme le titre d'un créneau REMPLI (voir juste en dessous, qui
                // laisse `NouveauTexte` à son alignement gauche par défaut). Centré, « — rien — »
                // se posait à ~500 px de son propre numéro de rang et la colonne SAUTAIT selon
                // que le créneau était plein ou vide — mesuré à l'image le 2026-09-03, sur un run
                // VERT 2/2. *Mes deux tests comptaient des textes ; compter du texte ne dit
                // jamais où il est.* Le vide et le plein doivent partager une seule colonne.
                rien.alignment = TextAlignmentOptions.Left;
                return;
            }
            NouveauTexte(corps.transform, "Titre", titre, Px(11f), CouleurEncre,
                DesignTokens.Current.hudSerifFont).fontStyle = TMPro.FontStyles.Bold;
            if (!string.IsNullOrEmpty(sous))
                NouveauTexte(corps.transform, "Sous", sous, Px(8f), CouleurEncreFaible,
                    DesignTokens.Current.primaryFont);
        }


        private void BuildLayout()
        {
            Canvas canvas = FindFirstObjectByType<Canvas>();
            if (canvas == null)
            {
                GameObject go = new GameObject("Canvas",
                    typeof(Canvas), typeof(CanvasScaler), typeof(GraphicRaycaster));
                canvas = go.GetComponent<Canvas>();
                canvas.renderMode = RenderMode.ScreenSpaceOverlay;
                CanvasScaler sc = go.GetComponent<CanvasScaler>();
                sc.uiScaleMode = CanvasScaler.ScaleMode.ScaleWithScreenSize;
                sc.referenceResolution = new Vector2(1280, 720);
            }
            // ⛔ SOUS L'HÔTE, PAS SOUS `mountParent` — voir `SetMountParent`. Monté dans le shell,
            // `transform` EST déjà l'enfant de `ContentSlot` que le shell gouverne. Hors shell
            // (test isolé), l'hôte n'est sous aucun canvas : on retombe sur le canvas découvert.
            Transform root = mountParent != null ? transform : canvas.transform;

            // La racine PLEIN ÉCRAN — jamais un panneau intermédiaire : c'est elle qui sert de
            // référence d'échelle à `Px()`/`PxTrait()` (un conteneur plus étroit fausserait
            // TOUTE la mise à l'échelle par un facteur muet).
            GameObject racine = NouveauUI("CarnetRoot", root);
            racinePleinEcran = (RectTransform)racine.transform;
            Etirer(racinePleinEcran);
            AjouterFond(racine, DesignTokens.Current.surfaceBase);

            VerticalLayoutGroup pile = racine.AddComponent<VerticalLayoutGroup>();
            pile.padding = new RectOffset(
                (int)Px(13f), (int)Px(13f),
                (int)(Px(10f) + MafiaCleanCity.Shell.ShellChrome.TopInsetPx),
                (int)(Px(10f) + MafiaCleanCity.Shell.ShellChrome.BottomInsetPx));
            pile.spacing = Px(8f);
            pile.childControlWidth = true; pile.childControlHeight = true;
            pile.childForceExpandWidth = true; pile.childForceExpandHeight = false;

            // L'enseigne — sombre, comme le reste du châssis
            GameObject ens = NouveauUI("Enseigne", racine.transform);
            var ve = ens.AddComponent<VerticalLayoutGroup>();
            ve.padding = new RectOffset((int)Px(2f), (int)Px(2f), (int)Px(4f), (int)Px(6f));
            ve.spacing = Px(2f);
            ve.childControlWidth = true; ve.childControlHeight = true;
            ve.childForceExpandWidth = true; ve.childForceExpandHeight = false;
            titreEcran = NouveauTexte(ens.transform, "Titre", "", Px(17f),
                DesignTokens.Current.hudCreme, DesignTokens.Current.hudSerifFont);
            sousTitre = NouveauTexte(ens.transform, "SousTitre", "", Px(9f),
                DesignTokens.Current.hudCremeSecondary, DesignTokens.Current.primaryFont);

            // ⛔ LE CARNET EST CRÈME SUR FOND SOMBRE — et ce n'est pas une coquetterie : les six
            // cadres de cet écran opposent le CARNET (papier, chaud) au reste du châssis (nuit,
            // froid). C'est ce qui dit au joueur que ces huit lignes sont À LUI, écrites de sa
            // main, alors que tout le reste de l'interface lui est SERVI.
            GameObject carnet = NouveauUI("Carnet", racine.transform);
            AjouterFond(carnet, CouleurPapier);
            var lec = carnet.AddComponent<LayoutElement>();
            lec.minHeight = 0f; lec.preferredHeight = 0f; lec.flexibleHeight = 1f;
            carnet.AddComponent<RectMask2D>();

            GameObject contenu = NouveauUI("Contenu", carnet.transform);
            var rtc = (RectTransform)contenu.transform;
            rtc.anchorMin = new Vector2(0f, 1f); rtc.anchorMax = new Vector2(1f, 1f);
            rtc.pivot = new Vector2(0.5f, 1f);
            rtc.offsetMin = Vector2.zero; rtc.offsetMax = Vector2.zero;
            var vco = contenu.AddComponent<VerticalLayoutGroup>();
            vco.padding = new RectOffset((int)Px(9f), (int)Px(9f), (int)Px(8f), (int)Px(8f));
            vco.spacing = Px(1f);
            vco.childControlWidth = true; vco.childControlHeight = true;
            vco.childForceExpandWidth = true; vco.childForceExpandHeight = false;
            var fit = contenu.AddComponent<ContentSizeFitter>();
            fit.verticalFit = ContentSizeFitter.FitMode.PreferredSize;
            listeRoot = rtc;

            // L'en-tête du carnet : « Carnet du soir » + « N ORDRES SUR 8 »
            GameObject entete = NouveauUI("EnteteCarnet", contenu.transform);
            var he = entete.AddComponent<HorizontalLayoutGroup>();
            he.childControlWidth = true; he.childControlHeight = true;
            he.childForceExpandWidth = true; he.childForceExpandHeight = false;
            he.padding = new RectOffset(0, 0, 0, (int)Px(5f));
            NouveauTexte(entete.transform, "TitreCarnet", Lib("Carnet du soir"), Px(13f),
                CouleurEncre, DesignTokens.Current.hudSerifFont).fontStyle = TMPro.FontStyles.Bold;
            compte = NouveauTexte(entete.transform, "Compte", "", Px(8f),
                CouleurEncreFaible, DesignTokens.Current.primaryFont);
            compte.alignment = TextAlignmentOptions.Right;

            ConstruirePanneau(racine.transform);
            RendreEtatInitial();
            // MÉTIER ICI — le reste de la mise en page (enseigne, blocs, listes…) se construit
            // ici, depuis la maquette. `ConstruireCerne`/`ConstruireEnseigne`/… de ㊲ montrent le
            // patron : un bloc = une méthode `Construire<Nom>(Transform parent)`.
        }

        // ═══ Primitives — dupliquées par convention (aucun fichier du dépôt ne les partage,
        // mesuré sur `main` le 2026-09-02) ═════════════════════════════════════════════════════

        private static GameObject NouveauUI(string nom, Transform parent)
        {
            GameObject go = new GameObject(nom, typeof(RectTransform));
            go.transform.SetParent(parent, false);
            return go;
        }

        /// <summary>⛔ TOUTE Image passe par ici. `AddComponent&lt;T&gt;()` à l'exécution
        /// n'honore PAS le `[RequireComponent(CanvasRenderer)]` d'une classe de base — sans
        /// `CanvasRenderer`, un `Graphic` ne dessine RIEN, sans la moindre erreur console
        /// (mesuré sur ce dépôt : `VerticalGradientImage`, deux panneaux jamais visibles).
        /// Et un `Image` standard `UnityEngine.UI.Image` (utilisée ici) EST déjà `MaskableGraphic`
        /// — elle passe donc sous un `Mask` parent sans rien de plus à faire ; seul un `Graphic`
        /// personnalisé dérivé directement de `Graphic` (pas `MaskableGraphic`) aurait besoin
        /// d'un correctif de base en plus de ce `CanvasRenderer` explicite.</summary>
        private static Image AjouterImage(GameObject go)
        {
            if (go.GetComponent<CanvasRenderer>() == null) go.AddComponent<CanvasRenderer>();
            return go.AddComponent<Image>();
        }

        private static Image AjouterFond(GameObject go, Color couleur)
        {
            Image img = AjouterImage(go);
            img.color = couleur;
            img.raycastTarget = false;
            return img;
        }

        private static TextMeshProUGUI NouveauTexte(Transform parent, string nom, string texte,
                                                     float corpsPx, Color couleur, TMP_FontAsset police)
        {
            GameObject go = NouveauUI(nom, parent);
            if (go.GetComponent<CanvasRenderer>() == null) go.AddComponent<CanvasRenderer>();
            TextMeshProUGUI t = go.AddComponent<TextMeshProUGUI>();
            t.font = police;
            t.text = texte;
            t.fontSize = corpsPx;   // un corps de texte à 0 est un défaut de rendu
            t.color = couleur;
            t.raycastTarget = false;
            return t;
        }

        private static void Etirer(RectTransform rt, float marge = 0f)
        {
            rt.anchorMin = Vector2.zero;
            rt.anchorMax = Vector2.one;
            rt.offsetMin = new Vector2(marge, marge);
            rt.offsetMax = new Vector2(-marge, -marge);
        }
    }

    /// <summary>screen_c3 — les correspondances « valeur du domaine → apparence », chacune en
    /// FONCTION NOMMÉE prenant la valeur du domaine (patron `HeatBucketResolver.SeverityColor` —
    /// jamais un tableau positionnel ni une chaîne de ternaires : mesuré sur ce dépôt, un
    /// balayage anti-régression écrit pour traquer ces correspondances rend ZÉRO sur un fichier
    /// qui les porte par l'ordre d'un tableau — la garde ne peut voir sa cible qu'APRÈS ce
    /// passage en fonction nommée).
    ///
    /// // MÉTIER ICI — `EtatDomaine` est un PLACEHOLDER : remplacer par l'enum réel du domaine
    /// (ex. `Severity`, `Posture`…) une fois le corps back mesuré, PUIS écrire le switch
    /// EXHAUSTIF sans `default` silencieux (un `default: throw` rend une 5ᵉ valeur BRUYANTE
    /// plutôt que collisionner avec un repli connu — patron `HeatBucketResolver`, note M2 :
    /// un `switch` STATEMENT C# sans `default` est une erreur de compilation CS0161, donc
    /// "exhaustif sans default" n'existe PAS ici — le détecteur d'un membre neuf est un TEST sur
    /// `Enum.GetValues(typeof(EtatDomaine))`, jamais le compilateur).</summary>
    public static class CarnetResolvers
    {
        public enum EtatDomaine
        {
            // MÉTIER ICI — remplacer par les valeurs RÉELLES du domaine.
            Inconnu = 0,
        }

        public static Color CouleurPour(EtatDomaine etat)
        {
            switch (etat)
            {
                case EtatDomaine.Inconnu: return DesignTokens.Current.onSurfaceMuted;
                default: throw new System.ArgumentOutOfRangeException(nameof(etat), etat,
                    "CarnetResolvers.CouleurPour : membre de EtatDomaine non résolu.");
            }
        }
    }
}
