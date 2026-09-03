using System.Collections;
using UnityEngine;
using UnityEngine.UI;
using TMPro;
using MafiaCleanCity.Shell;
using MafiaCleanCity.Theme;

namespace MafiaCleanCity.Operational
{
    /// <summary>screen_c2 « Filiere » — squelette généré par Tools/nouvel-ecran.py.
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
    public class FiliereScreenController : MonoBehaviour, IShellTenant
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

        /// <summary>Le nœud dont on montre la filière — VIDE aujourd'hui, et c'est le sujet.
        /// ⚠️ Aucun appelant ne le renseigne parce qu'aucune route amont ne le rend (TD-572).
        /// Le champ existe pour que le jour où une route le fournit, l'écran ait déjà sa prise —
        /// et pour que son absence soit une DONNÉE lisible plutôt qu'un paramètre oublié.</summary>
        private string nodeId;
        public void SetNodeId(string id) => nodeId = id;

        /// <summary>Vrai dès que l'écran a FINI de se rendre — succès, cassure ou repli.
        /// Même raison que sur ㊳ : un appelant qui attend N frames photographie un écran qui
        /// n'a pas encore rendu, et l'image ne le dit pas.</summary>
        public bool RenduTermine { get; private set; }

        // ---- crochets de test ---------------------------------------------------------------
        public GetLaunderingResponseDto DernierChargement { get; private set; }
        public string DerniereErreur { get; private set; }
        public long DernierCodeErreur { get; private set; }

        private RectTransform racinePleinEcran;
        private FiliereClient client;
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
            StartCoroutine(Amorcer());
        }

        /// <summary>Charger dès le montage — ㊴ a montré ce que coûte un `Charger()` que personne
        /// n'appelle : l'écran reste un squelette et l'image ne peut pas le dire.</summary>
        private IEnumerator Amorcer()
        {
            if (string.IsNullOrEmpty(token)) yield break;   // hors session : état initial NOMMÉ
            yield return Charger();
        }

        private void EnsureInitialized()
        {
            if (initialise) return;
            initialise = true;
            client = new FiliereClient { BaseUrl = baseUrl };
            BuildLayout();
        }

        // ═══ Chargement ══════════════════════════════════════════════════════════════════════

        /// <summary>Charge la surface. // MÉTIER ICI si `GetLaundering` a des paramètres
        /// de chemin (id, etc.) — ajouter les arguments correspondants ici et les faire
        /// remonter depuis l'appelant (le shell, ou un `RendrePourTest`).</summary>
        public IEnumerator Charger()
        {
            EnsureInitialized();
            DerniereErreur = null;
            DernierCodeErreur = 0;
            RenduTermine = false;

            // ⛔ LE `nodeId` EST LE MAILLON MANQUANT, ET LE COMPILATEUR VIENT DE LE DIRE.
            // `GetLaundering(bearer, nodeId, …)` exige un identifiant de nœud que RIEN ne
            // fournit : aucune route amont ne rend la liste des nœuds d'un joueur (back TD-572),
            // et ⑪/⑫ affichent pour cette raison un titre, un sous-titre et aucune donnée.
            // ★ Le squelette généré appelait `GetLaundering(token, …)` sans le `nodeId` et ne
            //   compilait pas. Ce rouge n'est pas un défaut du gabarit : c'est la dette du
            //   domaine, rendue visible par le typage avant même le premier run.
            // ⇒ On NE FABRIQUE PAS d'identifiant. Sans `nodeId`, l'écran ne demande rien et
            //   montre la chaîne cassée LÀ où elle casse — ce que sa maquette prévoit déjà
            //   (cadre 142 : « 04 maillons, 04 cassés, 00 joueurs servis »).
            if (string.IsNullOrEmpty(nodeId))
            {
                yield return null;
                RendreChaineCassee();
                RenduTermine = true;
                yield break;
            }

            yield return client.GetLaundering(token, nodeId,
                dto => DernierChargement = dto,
                (code, msg) => { DernierCodeErreur = code; DerniereErreur = msg; });

            // La frame de création rend des rects non résolus : on attend le layout AVANT de
            // rendre quoi que ce soit qui lise une géométrie.
            yield return null;

            if (DernierChargement == null) { RendreEtatIndisponible(); RenduTermine = true; yield break; }
            AppliquerEtat(DernierChargement);
            RenduTermine = true;
        }

        /// <summary>Rend un corps FABRIQUÉ, sans réseau — réservé aux tests (patron ㊲,
        /// `RendrePourTest`). Ne prouve jamais que le back émet ce corps, seulement ce que
        /// l'écran EN FAIT.</summary>
        public void RendrePourTest(GetLaunderingResponseDto dto)
        {
            EnsureInitialized();
            AppliquerEtat(dto);
        }

        /// <summary>// MÉTIER ICI — TOUT le rendu métier de cet écran part d'ici. Vide à
        /// dessein : remplir depuis la maquette RATIFIÉE et le corps RÉEL mesuré, jamais depuis
        /// une supposition sur ce que l'interface TypeScript back "devrait" rendre.</summary>
        private void AppliquerEtat(GetLaunderingResponseDto dto)
        {
            // MÉTIER ICI
        }

        /// <summary>Repli NOMMÉ sur échec réseau — jamais une exception, jamais un écran noir
        /// (patron ㊲ : `Render(null)` a fait planter un autre écran de ce dépôt à la première
        /// ligne qui lisait le payload).</summary>
        private void RendreEtatIndisponible()
        {
            ViderListe();
            sousTitre.text = Lib("LA FILIÈRE NE RÉPOND PAS");
            MajCompteur(0, 0, Lib("ÉTAPES"));
            MajCompteur(1, 0, Lib("PROPRE AU BOUT"));
            MajCompteur(2, 0, Lib("ÉCARTS"));
            MajPanneau(Lib("CE QUE LE SERVEUR ENVOIE VRAIMENT"), Lib("Pas de réponse"),
                Lib("la route n'a rien rendu. Ce n'est pas « la filière est vide » : c'est « on "
                    + "ne sait pas où elle en est »."));
        }

        /// <summary>L'ÉTAT VRAI DE CET ÉCRAN AUJOURD'HUI — cadre 142, « ce qui manque encore ».
        ///
        /// ⛔ La chaîne est cassée au PREMIER maillon et le compilateur l'a dit avant le premier
        /// run : `GetLaundering` exige un `nodeId` qu'aucune route amont ne fournit (TD-572).
        /// ⚠️ ㊵ NE POURSUIT PAS la chaîne au-delà de sa cassure : il la montre LÀ où elle casse.
        /// Fabriquer un identifiant pour « voir quelque chose » afficherait une filière qui
        /// n'appartient à personne — un décor, exactement ce que ces écrans démontent.
        /// ★ Et ce n'est pas une prudence de ma part : la maquette ratifiée déclare elle-même
        ///   « 04 maillons, 04 cassés, 00 joueurs servis », et son tampon est DÉSACTIVÉ —
        ///   « INJECTER — IMPOSSIBLE : il faut une planque, et rien n'en crée jamais ». Le dessin
        ///   a tranché avant moi ; je le suis.</summary>
        private void RendreChaineCassee()
        {
            ViderListe();
            sousTitre.text = Lib("CE QUI MANQUE ENCORE");
            MajCompteur(0, 4, Lib("MAILLONS"));
            MajCompteur(1, 4, Lib("CASSÉS"));
            MajCompteur(2, 0, Lib("JOUEURS SERVIS"));

            Maillon("L1", Lib("Obtenir une planque"),
                Lib("le premier maillon, et il bloque aussi le ramassage des caisses de dealers "
                    + "— un seul lot débloque deux écrans"));
            Maillon("L2", Lib("Dire combien il y a dans la filière"),
                Lib("le montant entre et ne ressort jamais ; aucune lecture ne le rend"));
            Maillon("L3", Lib("Nommer les nœuds et les bâtiments"),
                Lib("ce sont des références ; septième écran à buter sur les libellés"));
            Maillon("L4", Lib("Dire pourquoi la filière s'écarte"),
                Lib("`deviation_active` est un booléen sans cause ni ampleur"));

            MajPanneau(Lib("CE QUE LA FILIÈRE NE DIT PAS"),
                Lib("Jamais combien il y a dedans"),
                Lib("la propreté est la seule grandeur servie : ni montant, ni durée, ni frais. "
                    + "On met de l'argent dans une filière qui ne dit jamais ce qu'elle en "
                    + "contient."));
        }

        /// <summary>Un maillon manquant — le patron du cadre 142.</summary>
        private void Maillon(string rang, string titre, string explication)
        {
            GameObject go = NouveauUI("Maillon" + rang, listeRoot);
            AjouterFond(go, DesignTokens.Current.surfaceCard);
            var le = go.AddComponent<LayoutElement>();
            le.minHeight = Px(58f); le.preferredHeight = -1f; le.flexibleHeight = 0f;
            var v = go.AddComponent<VerticalLayoutGroup>();
            v.padding = new RectOffset((int)Px(9f), (int)Px(9f), (int)Px(7f), (int)Px(7f));
            v.spacing = Px(2f);
            v.childControlWidth = true; v.childControlHeight = true;
            v.childForceExpandWidth = true; v.childForceExpandHeight = false;

            NouveauTexte(go.transform, "Rang", Lib("MAILLON MANQUANT") + "   " + rang, Px(7f),
                DesignTokens.Current.hudCremeSecondary, DesignTokens.Current.primaryFont);
            NouveauTexte(go.transform, "Titre", titre, Px(12f),
                DesignTokens.Current.hudCreme, DesignTokens.Current.hudSerifFont);
            NouveauTexte(go.transform, "Texte", explication, Px(8f),
                DesignTokens.Current.hudCremeSecondary, DesignTokens.Current.primaryFont);
        }

        /// <summary>L'état AVANT tout chargement — le troisième, celui qu'on oublie (leçon ㊳).</summary>
        private void RendreEtatInitial()
        {
            sousTitre.text = Lib("EN ATTENTE");
            MajCompteur(0, 0, Lib("ÉTAPES"));
            MajCompteur(1, 0, Lib("PROPRE AU BOUT"));
            MajCompteur(2, 0, Lib("ÉCARTS"));
            MajPanneau(Lib("CE QUE CET ÉCRAN SAIT POUR L'INSTANT"),
                Lib("La filière n'a pas encore été interrogée"),
                Lib("ce n'est ni « elle est vide » ni « elle ne répond pas », c'est « pas encore »."));
        }

        private void ViderListe()
        {
            if (listeRoot == null) return;
            for (int i = listeRoot.childCount - 1; i >= 0; i--)
                UnityEngine.Object.Destroy(listeRoot.GetChild(i).gameObject);
        }

        private void MajCompteur(int i, int valeur, string libelle)
        {
            if (compteurNombre[i] == null) return;
            compteurNombre[i].text = valeur < 100 ? valeur.ToString("00") : valeur.ToString();
            compteurLibelle[i].text = libelle;
        }

        private void MajPanneau(string sur, string titre, string texte)
        {
            if (pannSur == null) return;
            pannSur.text = sur; pannTitre.text = titre; pannTexte.text = texte;
        }

        private RectTransform listeRoot;
        private TextMeshProUGUI sousTitre;
        private readonly TextMeshProUGUI[] compteurNombre = new TextMeshProUGUI[3];
        private readonly TextMeshProUGUI[] compteurLibelle = new TextMeshProUGUI[3];
        private TextMeshProUGUI pannSur, pannTitre, pannTexte;

        /// <summary>Item 0.6 — les littéraux statiques de ㊵ passent par `filiere.bloc.<slug>`.</summary>
        private static string Lib(string litteral) =>
            MafiaCleanCity.I18n.Libelle.De("filiere", "bloc", litteral);

        // ═══ Construction de la mise en page ═════════════════════════════════════════════════

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
            GameObject racine = NouveauUI("FiliereRoot", root);
            racinePleinEcran = (RectTransform)racine.transform;
            Etirer(racinePleinEcran);
            AjouterFond(racine, DesignTokens.Current.surfaceBase);

            VerticalLayoutGroup pile = racine.AddComponent<VerticalLayoutGroup>();
            pile.padding = new RectOffset(
                (int)Px(13f), (int)Px(13f),
                (int)(Px(10f) + MafiaCleanCity.Shell.ShellChrome.TopInsetPx),
                (int)(Px(10f) + MafiaCleanCity.Shell.ShellChrome.BottomInsetPx));
            pile.spacing = Px(9f);
            pile.childControlWidth = true; pile.childControlHeight = true;
            pile.childForceExpandWidth = true; pile.childForceExpandHeight = false;

            // L'enseigne
            GameObject ens = NouveauUI("Enseigne", racine.transform);
            AjouterFond(ens, DesignTokens.Current.surfaceCard);
            var ve = ens.AddComponent<VerticalLayoutGroup>();
            ve.padding = new RectOffset((int)Px(8f), (int)Px(8f), (int)Px(7f), (int)Px(7f));
            ve.childControlWidth = true; ve.childControlHeight = true;
            ve.childForceExpandWidth = true; ve.childForceExpandHeight = false;
            TextMeshProUGUI titre = NouveauTexte(ens.transform, "Titre", Lib("La filière"),
                Px(19f), DesignTokens.Current.accentGold, DesignTokens.Current.hudSerifFont);
            titre.alignment = TextAlignmentOptions.Center;
            titre.characterSpacing = 14f;
            sousTitre = NouveauTexte(ens.transform, "SousTitre", "", Px(7.5f),
                DesignTokens.Current.hudCremeSecondary, DesignTokens.Current.primaryFont);
            sousTitre.alignment = TextAlignmentOptions.Center;
            sousTitre.characterSpacing = 18f;

            // Les trois compteurs
            GameObject bande = NouveauUI("Compteurs", racine.transform);
            var hb = bande.AddComponent<HorizontalLayoutGroup>();
            hb.spacing = Px(6f);
            hb.childControlWidth = true; hb.childControlHeight = true;
            hb.childForceExpandWidth = true; hb.childForceExpandHeight = true;
            for (int i = 0; i < 3; i++)
            {
                GameObject c = NouveauUI("Compteur" + i, bande.transform);
                AjouterFond(c, DesignTokens.Current.surfaceCard);
                var vc = c.AddComponent<VerticalLayoutGroup>();
                vc.padding = new RectOffset((int)Px(4f), (int)Px(4f), (int)Px(5f), (int)Px(5f));
                vc.childControlWidth = true; vc.childControlHeight = true;
                vc.childForceExpandWidth = true; vc.childForceExpandHeight = false;
                compteurNombre[i] = NouveauTexte(c.transform, "Nombre", "00", Px(15f),
                    DesignTokens.Current.hudGaugeArcCold, DesignTokens.Current.hudSerifFont);
                compteurNombre[i].alignment = TextAlignmentOptions.Center;
                compteurLibelle[i] = NouveauTexte(c.transform, "Libelle", "", Px(6.5f),
                    DesignTokens.Current.hudCremeSecondary, DesignTokens.Current.primaryFont);
                compteurLibelle[i].alignment = TextAlignmentOptions.Center;
                compteurLibelle[i].characterSpacing = 16f;
            }

            // Le cadre de la liste — CADRE borné (min 0, masqué) / CONTENU libre.
            // ⚠️ Structure reprise de ㊳ où elle a été mesurée : mettre la pile sur le CADRE fait
            // de sa hauteur minimale la somme de ses lignes, tout retombe aux minimums et déborde.
            GameObject cadre = NouveauUI("Liste", racine.transform);
            var lec = cadre.AddComponent<LayoutElement>();
            lec.minHeight = 0f; lec.preferredHeight = 0f; lec.flexibleHeight = 1f;
            cadre.AddComponent<RectMask2D>();
            GameObject contenu = NouveauUI("Contenu", cadre.transform);
            var rtc = (RectTransform)contenu.transform;
            rtc.anchorMin = new Vector2(0f, 1f); rtc.anchorMax = new Vector2(1f, 1f);
            rtc.pivot = new Vector2(0.5f, 1f);
            rtc.offsetMin = Vector2.zero; rtc.offsetMax = Vector2.zero;
            var vco = contenu.AddComponent<VerticalLayoutGroup>();
            vco.spacing = Px(5f);
            vco.childControlWidth = true; vco.childControlHeight = true;
            vco.childForceExpandWidth = true; vco.childForceExpandHeight = false;
            vco.childAlignment = TextAnchor.UpperCenter;
            var fit = contenu.AddComponent<ContentSizeFitter>();
            fit.verticalFit = ContentSizeFitter.FitMode.PreferredSize;
            listeRoot = rtc;

            // Le panneau
            GameObject pan = NouveauUI("Panneau", racine.transform);
            AjouterFond(pan, DesignTokens.Current.surfaceCard);
            var lep = pan.AddComponent<LayoutElement>();
            lep.minHeight = Px(92f); lep.preferredHeight = -1f; lep.flexibleHeight = 0f;
            var vp = pan.AddComponent<VerticalLayoutGroup>();
            vp.padding = new RectOffset((int)Px(10f), (int)Px(10f), (int)Px(9f), (int)Px(9f));
            vp.spacing = Px(3f);
            vp.childControlWidth = true; vp.childControlHeight = true;
            vp.childForceExpandWidth = true; vp.childForceExpandHeight = false;
            pannSur = NouveauTexte(pan.transform, "SurTitre", "", Px(7.5f),
                DesignTokens.Current.hudCremeSecondary, DesignTokens.Current.primaryFont);
            pannTitre = NouveauTexte(pan.transform, "Titre", "", Px(13f),
                DesignTokens.Current.accentGold, DesignTokens.Current.hudSerifFont);
            pannTexte = NouveauTexte(pan.transform, "Texte", "", Px(9f),
                DesignTokens.Current.hudCremeSecondary, DesignTokens.Current.primaryFont);

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

    /// <summary>screen_c2 — les correspondances « valeur du domaine → apparence », chacune en
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
    public static class FiliereResolvers
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
                    "FiliereResolvers.CouleurPour : membre de EtatDomaine non résolu.");
            }
        }
    }
}
