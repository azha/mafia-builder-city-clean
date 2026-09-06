using System;
using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.EventSystems;
using UnityEngine.InputSystem.UI;
using UnityEngine.UI;
using MafiaCleanCity.CityMap; // REUSE AuthClient (signin → Bearer)
using MafiaCleanCity.Shell;   // EchelleMaquette — la conversion px CSS → unités de canvas
using MafiaCleanCity.Theme;
using TMPro;

namespace MafiaCleanCity.Operational.Exceptions
{
    // IMPLEMENTS: spec §4-T2 — screen_5 (Exception Queue, full view) REDUCED surface: the pending list with the 3
    // band labels + a lieutenant badge, EmptyState, tap row → ExceptionDetailController (OpenNav idiom). Honest
    // deferral (the M1 Dashboard precedent): sort / filters / swipe actions / batch resolve / Loading-Partial-
    // Offline-Error rich states (docs/tech/08_ui_screens/screen_5_exception_queue.md) are NOT built in this slice —
    // they need no new endpoint and land with the canon completion (spec §8). -- session:2026-06-10 (Phase-20 T2) --
    //
    // R2.2: the rows render the 3 CLOSED band labels (tracked in the scan corpus) + producer free text
    // (event_descriptor — chrome, component-tracked only: an i18n key may carry digits).
    public class ExceptionQueueController : MonoBehaviour, MafiaCleanCity.Shell.IShellTenant
    {
        [Header("Backend")]
        [SerializeField] private string baseUrl = "http://localhost";

        [Header("Demo sign-in (seeded by Tools/seed_operational_demo.mjs)")]
        [SerializeField] private string demoIdentifier = "operational_demo@example.test";
        [SerializeField] private string demoPassword = "operational-demo-pw";

        // ---- Public state (PlayMode test hooks) ----
        public bool IsAuthenticated { get; private set; }
        public string Token { get; private set; }
        public string AuthError { get; private set; }
        public bool QueueLoaded { get; private set; }
        public string QueueError { get; private set; }
        public ExceptionCardDto[] Cards { get; private set; } = Array.Empty<ExceptionCardDto>();
        /// <summary>Band/label strings shown to the player — the no-raw-scalar scan corpus.</summary>
        public IReadOnlyList<string> RenderedTexts => renderedTexts;
        public GameObject LastNavGameObject { get; private set; }
        public ExceptionDetailController LastDetail { get; private set; }

        private readonly List<string> renderedTexts = new List<string>();
        private TMP_FontAsset font;
        private TextMeshProUGUI headerText;
        private RectTransform rowsArea;
        private AuthClient auth;
        private ExceptionsClient client;
        private bool initialized;

        /// <summary>Vrai dès qu'un chargement a été DÉCIDÉ — par `Start` ou par un rendu explicite.
        /// Empêche l'auto-chargement d'écraser un rendu de test une frame plus tard (patron `2efdf2e`).</summary>
        private bool chargementAmorce;

        /// <summary>⛔⛔ LA POIGNÉE, PARCE QUE LE DRAPEAU SEUL NE FERME QUE LE DÉMARRAGE — et sur CET
        /// écran il ne ferme même pas ça. Précision mesurée par B, appliquée par F à ㉜/㉝ (`69dbf7f`),
        /// et vérifiée ici sur le corps du test : `ExceptionQueuePlayModeTests.cs:531-546` fait
        /// `AddComponent` → **douze frames** → `RendrePourTest`. Quand le rendu arrive, `Start()` est
        /// passé depuis longtemps et `chargementAmorce` vaut DÉJÀ `true` : le drapeau ne peut plus
        /// rien empêcher. Si `Boot()` attend encore le réseau, il rendra par-dessus.
        /// ⇒ *Une garde à l'entrée d'une coroutine ne protège que de son DÉMARRAGE, jamais de son
        ///   achèvement.* Il faut l'ARRÊTER, pas seulement lui interdire de commencer.
        /// ★ Les douze frames sont exactement la forme du piège : elles rendent le test vert tant
        ///   que le back échoue vite, et rouge le jour où il répond lentement.</summary>
        private Coroutine coroutineBoot;

        // House teardown flag (BuildingCardController precedent) — covers coroutines resumed by an external
        // PlayMode runner after an inter-fixture teardown.
        private bool destroyed;
        private void OnDestroy() { destroyed = true; }
        private bool Destroyed => destroyed || this == null;

        // Slate palette (mirrors DashboardController).
        private static Color SurfaceBg => DesignTokens.Current.surfaceBase;
        private static Color CardBg => DesignTokens.Current.surfaceCard;
        private static Color RowBg => DesignTokens.Current.surfaceRow;
        private static Color TextPrimary => DesignTokens.Current.onSurfacePrimary;
        private static Color TextSecondary => DesignTokens.Current.onSurfaceSecondary;
        private static Color AccentMild => DesignTokens.Current.accentSuccess;
        private static Color AccentModerate => DesignTokens.Current.accentWarning;
        private static Color AccentSevere => DesignTokens.Current.accentDanger;
        private static Color CtaColor => DesignTokens.Current.accentGold;

        private void Start()
        {
            EnsureInitialized();
            // ⛔⛔ UN RENDU EXPLICITE ANNULE L'AUTO-CHARGEMENT — sinon les deux se courent après et le
            //    rendu explicite PERD. Mesuré sur `ChaineDAppro` le 2026-09-04 (`2efdf2e`), et cet
            //    écran a exactement la même forme : `AddComponent` → le test appelle `RendrePourTest`
            //    dans la MÊME frame (avant `Start`) → une frame passe → `Start` lance `Boot()` →
            //    `LoadQueue()` remplace `Cards` par ce que le back rend, AVANT les assertions.
            //    ★ Ce que ça rend traître : le test reste VERT tant que le réseau est plus lent
            //      qu'une frame. Il ne rougit que le jour où le back est absent, rapide, ou en
            //      erreur — donc dans un run où on l'attribuera à la régression d'un voisin. C'est
            //      arrivé, sur `EcranApproE1_EtatRepos`, dans un run à huit catégories.
            //    ⇒ La classe fait DOUZE contrôleurs (`Start` auto-chargeant + `RendrePourTest`) ;
            //      quatre portaient déjà la garde, celui-ci est le cinquième. Les sept restants sont
            //      nommés dans le message de commit — je ne touche pas aux écrans des autres.
            if (!chargementAmorce) { chargementAmorce = true; coroutineBoot = StartCoroutine(Boot()); }
        }

        private void EnsureInitialized()
        {
            if (initialized) return;
            initialized = true;
            font = DesignTokens.Current.primaryFont;
            auth = new AuthClient { BaseUrl = baseUrl };
            client = new ExceptionsClient { BaseUrl = baseUrl };
            BuildLayout();
            EnsureEventSystem();
        }

        private IEnumerator Boot()
        {
            yield return SignIn();
            if (!IsAuthenticated) yield break;

            // ⛔ SANS CETTE LIGNE, LE RÉSOLVEUR EST MUET ET PERSONNE NE LE VOIT. `Traduire` rend
            // la prose quand le catalogue est vide — donc l'écran reste PARFAITEMENT lisible, en
            // anglais, exactement comme avant le socle i18n. Le branchement se serait « bien
            // passé » et n'aurait rien changé.
            // ★ Un repli qui marche trop bien masque le fait qu'on est en train de replier.
            //   Mesuré : 11 des 12 clés demandées par ⑨/⑩ SONT servies — donc ici la différence
            //   entre amorcé et pas amorcé, c'est 11 textes traduits ou 11 textes anglais.
            yield return MafiaCleanCity.I18n.I18nCatalog.Amorcer(
                new MafiaCleanCity.I18n.I18nClient { BaseUrl = baseUrl }, Token);

            yield return LoadQueue();
        }

        public IEnumerator SignIn()
        {
            EnsureInitialized();
            if (IsAuthenticated) yield break;
            string token = null, err = null;
            yield return DemoIdentityResolver.ResolveAndSignIn(auth,
                DemoIdentityResolver.OperationalIdentifierEnvVar, DemoIdentityResolver.OperationalPasswordEnvVar,
                demoIdentifier, demoPassword, t => token = t, e => err = e);
            if (err != null || string.IsNullOrEmpty(token))
            {
                AuthError = err ?? "sign-in returned no token";
                Debug.LogError($"[ExceptionQueue] auth failed: {AuthError}");
                yield break;
            }
            Token = token;
            IsAuthenticated = true;
        }

        /// <summary>IShellTenant token injection (B1, hud-session-arbitrages-design.md §1.2) — set
        /// directly by the shell BEFORE Start() runs (synchronous MountTenant<T> window). Mirrors
        /// DashboardController.SetToken; SignIn()'s own `if (IsAuthenticated) yield break;` guard
        /// then no-ops without further changes.</summary>
        public void SetToken(string token)
        {
            Token = token;
            IsAuthenticated = !string.IsNullOrEmpty(token);
        }

        /// <summary>Fetch the pending queue + render the rows (EmptyState when none). Re-entrancy is SERIALIZED
        /// (the DashboardController.LoadDashboard precedent): a Boot() self-load racing a test-driven load on the
        /// shared Cards/QueueError fields is the documented intermittent-flake shape — a second caller WAITS for the
        /// in-flight load instead of clobbering it.</summary>
        private bool isLoading;
        public IEnumerator LoadQueue()
        {
            EnsureInitialized();
            if (isLoading)
            {
                while (isLoading && this != null) yield return null;
                yield break;
            }
            isLoading = true;
            QueueLoaded = false;
            QueueError = null;
            ExceptionCardDto[] cards = null;
            yield return client.GetQueue(Token,
                c => cards = c,
                (code, msg) => QueueError = $"{code}: {msg}");
            if (Destroyed) { isLoading = false; yield break; }
            if (cards == null)
            {
                Debug.LogError($"[ExceptionQueue] load failed: {QueueError}");
                RenderError();
                isLoading = false;
                yield break;
            }
            Cards = cards;
            QueueLoaded = true;
            Render();
            isLoading = false;
        }

        /// <summary>Open one card's detail (OpenNav idiom: host GameObject + AddComponent + Init). The card travels
        /// in memory (the projection is self-contained); on Back the queue re-fetches (server = source of truth).</summary>
        //
        // AMENDÉ (item 0.4 de `front.md`, Tools/charpente-item0-4-design.md §2.3) — MÊME bascule
        // que `DashboardController.OpenNav` : un `AppShell` (`IShellNavigator`) trouvé monte le
        // détail LUI-MÊME, en surimpression (confiné dans `ContentSlot`) — ce qui préserve
        // exactement la sémantique visée : la file (`this`) reste vivante et montée EN DESSOUS, son
        // `onBack` la rappelle toujours (design §2.1). SINON : repli EXACT d'aujourd'hui.
        public void OpenDetail(ExceptionCardDto card)
        {
            Debug.Log($"[DIAG-OPEN] entrée · carte={(card == null ? "NULL" : card.exception_id)} · " +
                      $"LastDetail={(LastDetail == null ? "null" : "présent")} · Token={(string.IsNullOrEmpty(Token) ? "VIDE" : "ok")}");
            if (card == null) return;
            // One detail at a time: a double-tap (or a second row) must not stack screens — the previous
            // detail still owns the shared canvas overlay (review I1).
            if (LastDetail != null && LastDetail) return;
            MafiaCleanCity.Shell.IShellNavigator nav = MafiaCleanCity.Shell.ShellNavigatorLocator.Find();
            ExceptionDetailController detail;
            // ⛔ UN NAVIGATEUR PRÉSENT MAIS HORS D'ÉTAT REND NULL — et le geste du joueur
            // disparaissait alors en silence. `ShellNavigatorLocator.Find()` peut rendre un shell
            // détruit (une fixture précédente, un onglet qui a démonté son slot) : `nav != null`
            // était vrai, `MonterLocataireEnSurimpression` rendait null, et `detail.Init` levait
            // dans un `UnityEvent`, qui AVALE l'exception. Résultat : on touche l'attendant, rien
            // ne s'ouvre, rien ne s'écrit nulle part.
            // ★ Tester `nav != null` teste l'EXISTENCE du navigateur, pas qu'il ait monté quelque
            //   chose. Encore la même famille : vérifier qu'une chose existe ne dit rien de ce
            //   qu'elle fait. On retombe donc sur le montage autonome plutôt que d'avaler le geste.
            detail = null;
            if (nav != null)
            {
                detail = nav.MonterLocataireEnSurimpression<ExceptionDetailController>();
                if (detail != null) LastNavGameObject = detail.gameObject;
                else Debug.LogWarning("[⑨] le navigateur n'a monté aucun détail — repli autonome");
            }
            if (detail == null)
            {
                LastNavGameObject = new GameObject("Nav_ExceptionDetail");
                detail = LastNavGameObject.AddComponent<ExceptionDetailController>();
            }
            Debug.Log($"[DIAG-OPEN] detail={(detail == null ? "NULL" : "construit")}");
            detail.Init(card, Token, baseUrl, onBack: () => { if (!Destroyed) StartCoroutine(LoadQueue()); });
            LastDetail = detail;
        }

        // ---- render ----
        // ⛔ LE RENDU DE LA MAQUETTE RATIFIÉE — cinq blocs, dans l'ordre où l'œil les rencontre.
        // ⚠️ Contrainte R2.2 conservée telle quelle : aucun texte SUIVI ne doit porter de chiffre
        // isolé. C'est pourquoi la ligne d'ambiance dit « trois » en toutes lettres et pourquoi le
        // compte d'escalades n'entre pas dans le corpus suivi — il est du chrome, comme le texte
        // libre du producteur. Un scan qui interdit les chiffres et un écran qui doit en montrer
        // ne se contredisent que si on confond « affiché » et « suivi ».
        private void Render()
        {
            ClearRows();

            int n = Cards.Length;
            ligneAmbiance.text = n == 0
                ? "Personne ne fait la queue — le comptoir est vide"
                : (n == 1 ? "Un seul attend vos ordres" : EnLettres(n) + " attendent vos ordres")
                  + " — la file est calme";
            TrackText(ligneAmbiance, ligneAmbiance.text);

            RendreFile();
            RendreParleur();
            RendreTampon();
            RendreLienEscalades();
        }

        /// <summary>Les petits comptes en toutes lettres. R2.2 interdit le chiffre isolé dans le
        /// corpus suivi, et « Trois attendent vos ordres » est de toute façon ce que la maquette
        /// écrit — la contrainte technique et l'intention d'écriture disent ici la même chose.
        /// Au-delà de six, on ne compte plus : « la file est longue » dit ce qu'il faut savoir.</summary>
        private static string EnLettres(int n)
        {
            switch (n)
            {
                case 2: return MafiaCleanCity.I18n.Libelle.De("exceptions", "nombre", "Deux");
                case 3: return MafiaCleanCity.I18n.Libelle.De("exceptions", "nombre", "Trois");
                case 4: return MafiaCleanCity.I18n.Libelle.De("exceptions", "nombre", "Quatre");
                case 5: return MafiaCleanCity.I18n.Libelle.De("exceptions", "nombre", "Cinq");
                case 6: return MafiaCleanCity.I18n.Libelle.De("exceptions", "nombre", "Six");
                default: return MafiaCleanCity.I18n.Libelle.De("exceptions", "nombre", "Plusieurs");
            }
        }

        /// <summary>La file : un attendant par carte, le PREMIER plus grand et pleinement opaque
        /// (`.attendant.premier{width:74px;opacity:1}` contre 60px et .78). L'ordre est celui que
        /// le serveur sert — la maquette ratifie explicitement qu'il n'y a PAS de tri.</summary>
        /// <summary>Rend une file FABRIQUÉE, sans réseau — RÉSERVÉ AUX TESTS (patron ㊲/㊱).
        /// ⛔ Ne prouve JAMAIS que le serveur émet ces cartes : seulement ce que l'écran EN FAIT.
        /// Les gardes qui portent sur le contrat de la route passent par le vrai réseau.</summary>
        /// <summary>Les attendants RÉELLEMENT montés, dans l'ordre de la file — crochet de test.
        /// ⛔ Existe parce que `GameObject.Find("Attendant0")` est un piège ici : `RendreFile`
        /// DÉTRUIT ses enfants avant de les recréer, et `Destroy` est DIFFÉRÉ d'une frame. La
        /// recherche par nom global rend donc un attendant de la génération PRÉCÉDENTE, encore
        /// trouvable et déjà condamné ; son `onClick` lève sur un contrôleur mort, avant même
        /// d'entrer dans `OpenDetail`.
        /// ★ Troisième fois cette nuit que « chercher par nom global » désigne un objet mort :
        ///   la garde qui comptait le slot, le canvas d'une fixture antérieure, et ceci. La
        ///   parade est toujours la même — naviguer depuis la racine VIVANTE.</summary>
        public System.Collections.Generic.IReadOnlyList<UnityEngine.UI.Button> AttendantsPourTest()
        {
            var l = new System.Collections.Generic.List<UnityEngine.UI.Button>();
            if (fileRoot == null) return l;
            for (int i = 0; i < fileRoot.childCount; i++)
            {
                var b = fileRoot.GetChild(i).GetComponent<UnityEngine.UI.Button>();
                if (b != null) l.Add(b);
            }
            return l;
        }

        public void RendrePourTest(ExceptionCardDto[] cartes)
        {
            EnsureInitialized();
            chargementAmorce = true;   // ⇒ `Start()` ne lancera pas `Boot()` par-dessus ce rendu
            // …et arrêter ce qui est DÉJÀ parti — c'est le cas réel ici, voir `coroutineBoot`.
            if (coroutineBoot != null) { StopCoroutine(coroutineBoot); coroutineBoot = null; }

            Cards = cartes ?? System.Array.Empty<ExceptionCardDto>();
            Render();
        }

        private void RendreFile()
        {
            for (int i = fileRoot.childCount - 1; i >= 0; i--)
                UnityEngine.Object.Destroy(fileRoot.GetChild(i).gameObject);

            for (int i = 0; i < Cards.Length && i < 3; i++)
            {
                ExceptionCardDto c = Cards[i];
                bool premier = i == 0;
                GameObject a = NewUI($"Attendant{i}", fileRoot);

                // ⛔ CHAQUE ATTENDANT OUVRE SA PROPRE CARTE — c'est LE chemin joueur vers ⑩.
                // Avant : seul le tampon ouvrait, et toujours celle du PREMIER. Les deux autres
                // attendants étaient dessinés, alignés, lisibles… et morts au toucher. Un écran
                // qui montre trois interlocuteurs et n'en laisse joindre qu'un ment sur ce qu'il
                // propose, sans qu'aucune garde structurelle ne s'en aperçoive : les trois
                // existent, aux bonnes places, avec les bonnes valeurs.
                Image fondA = a.AddComponent<Image>();
                fondA.color = new Color(0f, 0f, 0f, 0f);   // cible de toucher, invisible
                Button ba = a.AddComponent<Button>();
                ba.targetGraphic = fondA;
                ExceptionCardDto carteDeCetAttendant = c;   // capture par valeur : sinon les
                ba.onClick.AddListener(() => OpenDetail(carteDeCetAttendant)); // trois ouvrent la dernière

                VerticalLayoutGroup v = a.AddComponent<VerticalLayoutGroup>();
                v.spacing = Px(3f);
                v.childControlWidth = true; v.childControlHeight = true;
                v.childForceExpandWidth = true; v.childForceExpandHeight = false;
                v.childAlignment = TextAnchor.UpperCenter;
                AddLayoutElement(a, preferredWidth: Px(premier ? 74f : 60f));

                GameObject med = NewUI("Medaillon", a.transform);
                Image mi = med.AddComponent<Image>();
                mi.color = premier ? AccentSevere : TextSecondary;
                AddLayoutElement(med, preferredHeight: Px(premier ? 58f : 44f));

                // Le rail sous le médaillon PORTE la sévérité — c'est le canal de la maquette.
                GameObject rail = NewUI("Rail", a.transform);
                rail.AddComponent<Image>().color = SeverityAccent(c.severity_band);
                AddLayoutElement(rail, preferredHeight: Px(3f));

                TextMeshProUGUI nom = NouveauTexteMaquette(a.transform, "Nom",
                    QuiParle(c), premier ? 11f : 9.5f, TextPrimary);
                nom.alignment = TextAlignmentOptions.Center;
                TrackText(nom, nom.text);

                TextMeshProUGUI bandes = NouveauTexteMaquette(a.transform, "Bandes",
                    ExceptionBandes.Ligne(c.severity_band, c.priority_band), 8f, TextSecondary);
                bandes.alignment = TextAlignmentOptions.Center;
                TrackText(bandes, bandes.text);

                // screen_a8 : la catégorie de couche conflit, EN TOUTES LETTRES.
                // ⛔ Le canon la veut « doublée texte » (F2/a11y) — donc pas d'icône seule, et
                // surtout pas une couleur seule. Rien n'est dessiné quand la catégorie n'est pas
                // reconnue : une pastille par défaut aurait la même forme qu'une pastille mesurée.
                string cat = CategorieConflit(c);
                if (cat != null)
                {
                    TextMeshProUGUI pastille = NouveauTexteMaquette(a.transform, "Categorie",
                                                                    cat, 7.5f, TextSecondary);
                    pastille.alignment = TextAlignmentOptions.Center;
                    TrackText(pastille, pastille.text);
                }
            }
        }

        /// <summary>Le premier de la file PARLE : médaillon + bulle avec son nom, le contexte, les
        /// deux bandes en pastilles, et sa réplique. C'est le cœur de la mise en scène ratifiée —
        /// « le premier parle », et la file attend derrière.</summary>
        private void RendreParleur()
        {
            for (int i = parleRoot.childCount - 1; i >= 0; i--)
                UnityEngine.Object.Destroy(parleRoot.GetChild(i).gameObject);
            if (Cards.Length == 0) return;

            ExceptionCardDto c = Cards[0];
            GameObject med = NewUI("MedaillonParleur", parleRoot);
            med.AddComponent<Image>().color = AccentSevere;
            AddLayoutElement(med, preferredWidth: Px(52f), preferredHeight: Px(52f));

            GameObject bulle = NewUI("Bulle", parleRoot);
            bulle.AddComponent<Image>().color = CardBg;
            VerticalLayoutGroup v = bulle.AddComponent<VerticalLayoutGroup>();
            v.padding = new RectOffset(PxI(12f), PxI(12f), PxI(9f), PxI(9f));
            v.spacing = Px(4f);
            v.childControlWidth = true; v.childControlHeight = true;
            v.childForceExpandWidth = true; v.childForceExpandHeight = false;
            AddLayoutElement(bulle, flexibleWidth: 1);

            TextMeshProUGUI qui = NouveauTexteMaquette(bulle.transform, "Qui",
$"{QuiParle(c)} · {ExceptionBandes.Ligne(c.severity_band, c.priority_band)}", 8f, TextSecondary);
            TrackText(qui, qui.text);

            TextMeshProUGUI dit = NouveauTexteMaquette(bulle.transform, "Replique",
                Replique(c),
                10f, TextPrimary);
            dit.enableWordWrapping = true;
            // ⚠️ Texte LIBRE du producteur : chrome, suivi au composant et pas au corpus (il peut
            // légitimement porter des chiffres — c'est ce que dit l'en-tête R2.2 de ce fichier).
        }

        /// <summary>Le tampon : l'action suggérée, en gros. La maquette la donne comme le geste par
        /// défaut, l'appui long ouvrant la main complète (le détail ⑩).</summary>
        private void RendreTampon()
        {
            for (int i = tamponRoot.childCount - 1; i >= 0; i--)
                UnityEngine.Object.Destroy(tamponRoot.GetChild(i).gameObject);
            if (Cards.Length == 0) return;

            GameObject t = NewUI("TamponBouton", tamponRoot);
            Image fond = t.AddComponent<Image>();
            fond.color = AccentSevere;
            Stretch((RectTransform)t.transform, Vector2.zero, Vector2.zero);
            Button b = t.AddComponent<Button>();
            b.targetGraphic = fond;
            ExceptionCardDto c = Cards[0];
            b.onClick.AddListener(() => OpenDetail(c));

            VerticalLayoutGroup v = t.AddComponent<VerticalLayoutGroup>();
            v.childControlWidth = true; v.childControlHeight = true;
            v.childForceExpandWidth = true; v.childForceExpandHeight = false;
            v.childAlignment = TextAnchor.MiddleCenter;

            // ⚠️ RECTIFICATION en cours d'écriture : j'avais noté que l'action suggérée était
            // innommable à cause du défaut L0.2 (ids d'action et `method` du resolve sans table de
            // liaison). C'est vrai pour RÉSOUDRE, pas pour AFFICHER — le corps porte
            // `suggested_action.label`, et la maquette l'écrit en toutes lettres sur le tampon.
            // ★ J'ai failli reporter sur l'affichage une limite qui ne pèse que sur l'action.
            //   Une dette mal située fait renoncer à ce qu'elle n'empêche pas.
            string action = c.suggested_action != null && !string.IsNullOrEmpty(c.suggested_action.label)
                ? c.suggested_action.label.ToUpperInvariant()
                : "OUVRIR SA MAIN";
            TextMeshProUGUI libelle = NouveauTexteMaquette(t.transform, "Libelle",
                action, 12f, TextPrimary);
            libelle.alignment = TextAlignmentOptions.Center;
            libelle.characterSpacing = 22f;   // `.tampon{letter-spacing:.22em}`
            TrackText(libelle, libelle.text);

            // ⚠️ La maquette écrit ici l'action suggérée (« RÉPARER LE BÂTIMENT ») et annonce
            // « appui long — sa main : 5 autres issues ». On ne peut PAS l'écrire aujourd'hui :
            // le document de lot le mesure, `candidate_actions` et le `method` du resolve sont
            // deux vocabulaires SANS table de liaison (défaut L0.2). Nommer une action suggérée
            // reviendrait à inventer la correspondance que le back ne fournit pas.
            // ⇒ Le bouton ouvre donc la main complète, où le joueur CHOISIT — c'est le geste que
            //   la maquette met derrière l'appui long, promu geste principal tant que le maillon
            //   manque. L'écran ne promet rien qu'il ne puisse tenir.
            // ⛔ MESURÉ sur la capture du 2026-09-02 : ce sous-titre était en `TextSecondary`
            // (`onSurfaceSecondary`, #8a979c) et son contraste sur l'aplat corail du tampon
            // tombait à 0.096 — sous le seuil de 0.18 de `LisibiliteDuTexte`, quand le titre
            // juste au-dessus mesurait 0.456.
            // ★ `onSurfaceSecondary` est une encre pour la SURFACE sombre. Posée sur un accent,
            //   elle n'est pas « discrète », elle est illisible. Sur un aplat d'accent, la
            //   sourdine doit venir de l'ALPHA de l'encre sur accent — même famille que le titre,
            //   atténuée — jamais d'un jeton fait pour un autre fond.
            // C'est la faute que j'ai déjà commise sur ⑩ : un fond qu'on corrige change la
            // contrainte sur TOUT ce qui est posé dessus, et rien ne vient le rappeler.
            Color encreSurTampon = TextPrimary;
            encreSurTampon.a = 0.8f;          // mesuré : contraste 0.365 sur le corail
            TextMeshProUGUI sous = NouveauTexteMaquette(t.transform, "SousTexte",
                Lib("il attend une consigne"), 8f, encreSurTampon);
            sous.alignment = TextAlignmentOptions.Center;
            TrackText(sous, sous.text);
        }

        /// <summary>Le lien vers les escalades archivées, « à relire à tête reposée ».</summary>
        private void RendreLienEscalades()
        {
            for (int i = lienRoot.childCount - 1; i >= 0; i--)
                UnityEngine.Object.Destroy(lienRoot.GetChild(i).gameObject);

            GameObject l = NewUI("Filet", lienRoot);
            l.AddComponent<Image>().color = CardBg;
            Stretch((RectTransform)l.transform, Vector2.zero, Vector2.zero);
            VerticalLayoutGroup v = l.AddComponent<VerticalLayoutGroup>();
            v.childControlWidth = true; v.childControlHeight = true;
            v.childForceExpandWidth = true; v.childForceExpandHeight = false;
            v.childAlignment = TextAnchor.MiddleCenter;

            TextMeshProUGUI titre = NouveauTexteMaquette(l.transform, "Titre",
                Lib("Escalades archivées"), 9.5f, TextPrimary);
            titre.alignment = TextAlignmentOptions.Center;
            TrackText(titre, titre.text);

            TextMeshProUGUI leg = NouveauTexteMaquette(l.transform, "Legende",
                Lib("à relire à tête reposée"), 7.5f, TextSecondary);
            leg.alignment = TextAlignmentOptions.Center;
            TrackText(leg, leg.text);
        }

        private void RenderError()
        {
            ClearRows();
            headerText.text = "EXCEPTIONS";
            TextMeshProUGUI err = NewText("Error", rowsArea, Lib("File indisponible — vérifier la pile"), 14, TextAlignmentOptions.Left);
            err.color = AccentSevere;
            AddLayoutElement(err.gameObject, minHeight: 24, flexibleHeight: 0);
            TrackText(headerText, headerText.text);
            TrackText(err, err.text);
        }
        // ⛔ `AddCardRow` RETIRÉE le 2026-09-03 — code mort depuis la refonte en « comptoir ».
        // Elle bâtissait des lignes `Card_<exception_id>` que plus AUCUN appelant ne demandait
        // (mesuré : 0 dans tout `Assets/Scripts`). Son seul effet restant était de tromper :
        // un test cherchait encore ses objets et rougissait en accusant l'écran de ne pas
        // afficher une carte servie (TD-577). *Du code mort qui nomme un design précédent
        // n'est pas neutre — il donne à une garde périmée l'air d'avoir raison.*

        // ---- band → glyph/accent (a11y F2: shape + label, never colour alone) ----
        // ⛔ CES DEUX-LÀ ÉTAIENT MORTES : elles commutaient sur `HIGH|MEDIUM|LOW`, que le back
        //    n'émet jamais (sa projection rend `MILD|MODERATE|SEVERE`). Elles tombaient donc
        //    TOUJOURS dans leur défaut — glyphe `[?]` et teinte neutre pour chaque carte, quelle
        //    que soit la gravité. Le domaine vit désormais dans `ExceptionBandes`, une seule fois.
        private static string SeverityGlyph(string b) => ExceptionBandes.Glyphe(b);
        private static Color SeverityAccent(string b)
        {
            switch (ExceptionBandes.RangGravite(b))
            {
                case 0:  return AccentMild;
                case 1:  return AccentModerate;
                case 2:  return AccentSevere;
                default: return TextSecondary;
            }
        }
        // `Cap` retiré : son dernier appelant est parti avec les bandes. Il rendait « Unknown »
        // sur une valeur vide — un mot anglais de plus, sur le chemin d'un trou de donnée.

        // W3.U1 C1 (design D2) — optional parent-of-mount the AppShell renseigne BEFORE Start() runs.
        // See DashboardController.mountParent for the full rationale (byte-identical mechanism here).
        private Transform mountParent;
        public void SetMountParent(Transform parent) => mountParent = parent;

        // --------------------------------------------------------------- UI build

        // ⛔ REFONTE 2026-09-02 — SUR LA MAQUETTE RATIFIÉE, pas sur celle d'avant.
        // `ecrans-brennar-4.html` cadre 14, ratifié par l'user le 2026-08-26 (« ok c'est bien »).
        // L'ancien rendu était une liste de cartes en pixels bruts (560×600, padding 20) ; la
        // maquette dessine une FILE AU COMPTOIR : une ligne d'ambiance, trois attendants sur un
        // rail, le premier qui parle dans une bulle, une action suggérée en tampon, et un lien
        // vers les escalades archivées.
        //
        // ⚠️ Deux choses structurent tout et diffèrent de l'écran ㊲ :
        //   · `.comptoir{margin-top:auto}` — le contenu est collé EN BAS, le décor occupe le haut ;
        //   · l'échelle passe par `LargeurEcransBrennar4`, DÉCLARÉE pour cette série. Elle vaut le
        //     même nombre que celle de la série 6 aujourd'hui, et elle est distincte exprès : deux
        //     fichiers sources différents peuvent diverger sans prévenir.
        private void BuildLayout()
        {
            Canvas canvas = FindFirstObjectByType<Canvas>();
            if (canvas == null)
            {
                GameObject canvasGo = new GameObject("Canvas",
                    typeof(Canvas), typeof(CanvasScaler), typeof(GraphicRaycaster));
                canvas = canvasGo.GetComponent<Canvas>();
                canvas.renderMode = RenderMode.ScreenSpaceOverlay;
                CanvasScaler scaler = canvasGo.GetComponent<CanvasScaler>();
                scaler.uiScaleMode = CanvasScaler.ScaleMode.ScaleWithScreenSize;
                scaler.referenceResolution = new Vector2(1280, 720);
            }
            Transform root = mountParent != null ? mountParent : canvas.transform; // W3.U1 D2

            GameObject racineGo = NewUI("ExceptionQueueRoot", root);
            racine = (RectTransform)racineGo.transform;
            Stretch(racine, Vector2.zero, Vector2.zero);
            racineGo.AddComponent<Image>().color = SurfaceBg;

            // ⛔ L'ÉCHELLE AVANT TOUTE CONVERSION — un RectTransform qui vient d'être étiré n'a pas
            // encore son `rect` résolu, et la première constante convertie le lirait à faux. Payé
            // sur ㊲ : tout l'écran rendu à la MOITIÉ de son échelle, invisible parce qu'un écran
            // deux fois trop petit ressemble à un écran sobre.
            Canvas.ForceUpdateCanvases();

            // Le comptoir : collé en bas (`margin-top:auto`), c'est lui qui porte tout.
            GameObject comptoirGo = NewUI("Comptoir", racineGo.transform);
            comptoir = (RectTransform)comptoirGo.transform;
            comptoir.anchorMin = new Vector2(0f, 0f);
            comptoir.anchorMax = new Vector2(1f, 0f);
            comptoir.pivot = new Vector2(0.5f, 0f);
            // ⛔ LE DOCK MANGE SA PART — sinon le contenu passe DESSOUS.
            // Trouvé par la première capture SOUS CHROME (2026-09-02) : le lien « Escalades
            // archivées » et le bas du tampon passaient derrière les quatre boutons de navigation.
            // Aucune capture hors shell ne pouvait le voir — il n'y a pas de dock dans l'image, et
            // l'écran paraissait parfaitement posé.
            // ★ C'est exactement l'angle mort A4, porté déclaré pendant huit tours de juge sur ㊲ :
            //   « ce que l'absence de chrome m'empêche de vérifier ». Il ne se ferme pas en
            //   raisonnant, il se ferme en montant l'écran sous le chrome et en regardant.
            // Hors shell l'inset vaut 0 et l'écran retombe exactement sur son comportement d'avant.
            comptoir.offsetMin = new Vector2(Px(CssComptoirPadX),
                                             Px(CssComptoirPadBas) + ShellChrome.BottomInsetPx);
            comptoir.offsetMax = new Vector2(-Px(CssComptoirPadX), 0f);
            comptoir.sizeDelta = new Vector2(comptoir.sizeDelta.x, Px(CssComptoirHaut));

            VerticalLayoutGroup pile = comptoirGo.AddComponent<VerticalLayoutGroup>();
            pile.spacing = Px(CssComptoirEcart);
            pile.childControlWidth = true; pile.childControlHeight = true;
            pile.childForceExpandWidth = true; pile.childForceExpandHeight = false;
            pile.childAlignment = TextAnchor.LowerCenter;

            ligneAmbiance = NouveauTexteMaquette(comptoirGo.transform, "LigneSoir", "",
                                                 CssLigneSoir, TextSecondary);
            ligneAmbiance.alignment = TextAlignmentOptions.Center;

            fileRoot = (RectTransform)NewUI("File", comptoirGo.transform).transform;
            HorizontalLayoutGroup hf = fileRoot.gameObject.AddComponent<HorizontalLayoutGroup>();
            hf.spacing = Px(CssFileEcart);
            hf.childControlWidth = true; hf.childControlHeight = true;
            hf.childForceExpandWidth = false; hf.childForceExpandHeight = false;
            hf.childAlignment = TextAnchor.LowerCenter;
            AddLayoutElement(fileRoot.gameObject, preferredHeight: Px(CssFileHaut));

            parleRoot = (RectTransform)NewUI("Parle", comptoirGo.transform).transform;
            HorizontalLayoutGroup hp = parleRoot.gameObject.AddComponent<HorizontalLayoutGroup>();
            hp.spacing = Px(CssParleEcart);
            hp.childControlWidth = true; hp.childControlHeight = true;
            hp.childForceExpandWidth = false; hp.childForceExpandHeight = true;
            hp.childAlignment = TextAnchor.LowerLeft;

            tamponRoot = (RectTransform)NewUI("Tampon", comptoirGo.transform).transform;
            AddLayoutElement(tamponRoot.gameObject, preferredHeight: Px(CssTamponHaut));

            lienRoot = (RectTransform)NewUI("LienEscalades", comptoirGo.transform).transform;
            AddLayoutElement(lienRoot.gameObject, preferredHeight: Px(CssLienHaut));
        }

        private RectTransform racine, comptoir, fileRoot, parleRoot, tamponRoot, lienRoot;
        private TextMeshProUGUI ligneAmbiance;

        // Les mesures de `ecrans-brennar-4.html`, en px CSS de CETTE maquette — jamais celles d'un
        // écran voisin, même quand le nombre coïncide.
        private const float CssComptoirPadX  = 10f;   // `.comptoir{padding:0 10px 10px}`
        private const float CssComptoirPadBas = 10f;
        private const float CssComptoirHaut  = 230f;  // ce que le comptoir occupe en bas de l'écran
        private const float CssComptoirEcart =  8f;   // `.comptoir{gap:8px}`
        private const float CssLigneSoir     = 11.5f; // `.ligne-soir{font-size:11.5px}`
        private const float CssFileEcart     = 10f;   // `.file{gap:10px}`
        private const float CssFileHaut      = 74f;   // le premier attendant fait 74px de large
        private const float CssParleEcart    = 10f;   // `.parle{gap:10px}`
        private const float CssTamponHaut    = 46f;   // `.tampon{padding:10px 12px}` + 2 lignes
        private const float CssLienHaut      = 34f;   // `.filet{padding:7px}` + sa légende

        private float Px(float css) =>
            EchelleMaquette.Px(css, racine, EchelleMaquette.LargeurEcransBrennar4);

        /// <summary>Idem, planché à 1 — pour les paddings, dont un zéro serait un défaut de rendu.</summary>
        private int PxI(float css) =>
            EchelleMaquette.PxTrait(css, racine, EchelleMaquette.LargeurEcransBrennar4);

        /// <summary>Qui parle. ⚠️ Le corps ne porte QUE `lieutenant_id` — le NOM du lieutenant
        /// n'est pas projeté sur cette route, alors que la maquette l'écrit (« Cuisinier »,
        /// « Logistique »). On montre donc « La ville » quand la carte n'est liée à personne, et un
        /// libellé neutre sinon, plutôt qu'un nom inventé.
        /// ★ Même règle que sur ㊲ : le trou se montre, il ne se comble pas. Y écrire un nom
        ///   plausible serait le défaut exact que le juge données a trouvé là-bas.
        /// Mesure du 2026-09-02 : `ExceptionCardDto` porte `lieutenant_id`, pas de champ de nom.</summary>
        /// <summary>screen_a8 — la CATÉGORIE de couche conflit d'une exception, ou `null`.
        ///
        /// Le canon (`docs/tech/08a_conflict_layer_screens/screen_a8_…md`) fait de a8 une
        /// EXTENSION de cet écran : dix types d'exception venus de la couche conflit, et une seule
        /// spécificité d'affichage — « une petite icône de catégorie conflit / diplomacy / intel /
        /// reputation par row ». Tout le reste est REUSE de ⑨. C'est donc ici que a8 vit, et
        /// nulle part ailleurs : il n'y a pas d'écran a8 à construire.
        ///
        /// ⛔ CE QUE CETTE FONCTION NE SAIT PAS, et il faut le lire avant de s'y fier.
        /// `ExceptionCardDto` ne porte **aucun champ de catégorie** : le canon dit que le filtre
        /// Type « opère sur une catégorie DÉRIVÉE d'`event_descriptor` ». Or `event_descriptor`
        /// est une clé i18n, et **je n'ai jamais vu une seule de ces clés** — `front.md` mesure
        /// « 0 occurrence de la variante conflit » (2026-08-27), et la session back confirme le
        /// 2026-09-02 : six exceptions sur le compte de démo, zéro conflit.
        /// ⇒ Les fragments ci-dessous sont pris aux NOMS DES MÉCANIQUES du canon, pas à des clés
        ///   observées. Ils sont donc une hypothèse, et elle est écrite comme telle.
        /// ★ Une correspondance écrite sans un seul échantillon ne se teste pas : elle rend
        ///   `null` sur tout, aujourd'hui, et ce `null` ressemblerait à « pas de conflit » alors
        ///   qu'il veut dire « je n'ai rien pu reconnaître ». C'est pourquoi l'appelant affiche la
        ///   pastille SEULEMENT sur une catégorie reconnue, et ne dessine rien sinon — plutôt que
        ///   d'inventer une catégorie par défaut, qui aurait la même forme qu'une catégorie
        ///   mesurée.
        /// ⚠️ À rejouer dès qu'une exception de conflit existe : si les clés réelles ne
        ///   contiennent pas ces fragments, cette fonction restera muette sans rien signaler.</summary>
        public static string CategorieConflit(ExceptionCardDto c)
        {
            if (c == null || string.IsNullOrEmpty(c.event_descriptor)) return null;
            string d = c.event_descriptor.ToLowerInvariant();

            // reputation — Boss Mirror (04c §3.1)
            if (d.Contains("boss_mirror") || d.Contains("mirror")) return MafiaCleanCity.I18n.Libelle.De("exceptions", "categorie", "RÉPUTATION");
            // diplomacy — Sealed-Envelope (§4.7), Shared Exposure Lock (§4.5)
            if (d.Contains("sealed_envelope") || d.Contains("exposure") || d.Contains("pact"))
                return MafiaCleanCity.I18n.Libelle.De("exceptions", "categorie", "DIPLOMATIE");
            // intel — Regime Switching (§3.1), Adaptive Skin (§3.6), Purge Trap (§8.4)
            if (d.Contains("regime") || d.Contains("adaptive_skin") || d.Contains("purge"))
                return MafiaCleanCity.I18n.Libelle.De("exceptions", "categorie", "RENSEIGNEMENT");
            // conflit — Dead Hand (§7.1), Sandpile (§5.1), Familiarity (§6.1), Trophic Gap (§3.5)
            if (d.Contains("dead_hand") || d.Contains("sandpile") || d.Contains("cascade")
                || d.Contains("familiarity") || d.Contains("trophic"))
                return MafiaCleanCity.I18n.Libelle.De("exceptions", "categorie", "CONFLIT");

            return null;
        }

        private static string QuiParle(ExceptionCardDto c) =>
            string.IsNullOrEmpty(c.lieutenant_id) ? MafiaCleanCity.I18n.Libelle.De("exceptions", "locuteur", "La ville") : "Votre lieutenant";

        /// <summary>Item 0.6 — un littéral STATIQUE de ⑨ passe par `exceptions.bloc.<slug>`,
        /// repli sur le littéral (contrat de `Libelle`).
        ///
        /// ⛔ TROIS FAMILLES NE PASSENT PAS PAR ICI, et chacune pour sa raison :
        /// · les GLYPHES (`[!!!]`, `[!..]`) — ce sont des FORMES, pas de la langue. Elles portent
        ///   la gravité pour qui ne distingue pas les couleurs (a11y) et sont identiques dans
        ///   toutes les langues. Les traduire n'aurait pas de sens ; les keyer inviterait
        ///   quelqu'un à le faire un jour ;
        /// · les valeurs de DOMAINE renvoyées par les résolveurs de bande — une clé qui, une fois
        ///   le dictionnaire rempli, traduirait une valeur servant à la logique ;
        /// · la LIGNE D'AMBIANCE, et c'est le cas intéressant : « Trois attendent vos ordres — la
        ///   file est calme » est ASSEMBLÉE à partir d'un compte. Keyer ses fragments produirait
        ///   des phrases intraduisibles (l'ordre des mots change d'une langue à l'autre) ; keyer
        ///   le tout est impossible puisqu'elle varie. Sa forme juste est une clé ICU à PLURIEL,
        ///   avec le compte en paramètre — exactement ce que `game.lieutenant.assignment.summary`
        ///   fait déjà et que notre résolveur sait rendre. C'est donc un lot back, demandé, pas
        ///   une dérivation côté client.
        /// ★ Décider ce qui N'A PAS le droit de devenir une clé demande plus d'attention que la
        ///   conversion elle-même.</summary>
        /// <summary>La réplique du premier — LE point de passage du texte serveur de ⑨.
        ///
        /// Consomme `event_descriptor_i18n` quand le back l'envoie ET que le dictionnaire porte
        /// la clé ; sinon la PROSE. Mesuré le 2026-09-02 : la référence est non nulle sur 2
        /// cartes sur 6, et 11 des 12 clés demandées par ⑨/⑩ sont servies — donc ce branchement
        /// change réellement ce que le joueur lit, contrairement à la mesure d'hier soir où le
        /// recouvrement était nul.
        ///
        /// ⛔ ET IL RÈGLE UN DÉFAUT QUE LA CAPTURE SOUS CHROME AVAIT MONTRÉ : sur les 4 cartes du
        /// seeder, `event_descriptor` n'est PAS de la prose — c'est un identifiant
        /// (`exc_demo_teach_heat`), et ⑨ l'affichait entre guillemets comme une parole de
        /// lieutenant. Un identifiant n'est pas une réplique : s'il n'a pas d'espace, il est
        /// montré tel quel, sans guillemets, comme ㊱ montre ses clés.
        /// ★ Mettre un identifiant technique dans la bouche d'un personnage, c'est le seul cas
        ///   de la nuit où l'écran ne se contentait pas de taire une donnée : il en inventait
        ///   une. Le trou se montre, il ne se déguise pas en dialogue.</summary>
        private static string Replique(ExceptionCardDto c)
        {
            string t = TexteServeur(c);
            if (string.IsNullOrEmpty(t)) return "—";
            bool ressembleAUnIdentifiant = !t.Contains(" ");
            return ressembleAUnIdentifiant ? t : $"« {t} »";
        }

        /// <summary>Le texte serveur d'une carte : la référence i18n si elle est SERVIE, la prose
        /// sinon. `Connait` avant `Traduire` — une clé absente ne doit pas remplacer une prose
        /// lisible par une clé nue.</summary>
        private static string TexteServeur(ExceptionCardDto c)
        {
            if (c == null) return string.Empty;
            if (c.event_descriptor_i18n != null
                && !string.IsNullOrEmpty(c.event_descriptor_i18n.key)
                && MafiaCleanCity.I18n.I18nCatalog.Connait(c.event_descriptor_i18n.key))
                return MafiaCleanCity.I18n.I18nCatalog.Traduire(c.event_descriptor_i18n.key);
            return c.event_descriptor ?? string.Empty;
        }

        private static string Lib(string litteral) =>
            MafiaCleanCity.I18n.Libelle.De("exceptions", "bloc", litteral);

        private TextMeshProUGUI NouveauTexteMaquette(Transform parent, string nom, string texte,
                                                     float corpsCss, Color couleur)
        {
            GameObject go = NewUI(nom, parent);
            TextMeshProUGUI t = go.AddComponent<TextMeshProUGUI>();
            t.text = texte;
            t.color = couleur;
            t.fontSize = Px(corpsCss);
            t.font = DesignTokens.Current.primaryFont;
            t.raycastTarget = false;
            return t;
        }

        // ---- row helpers ----
        private void ClearRows()
        {
            renderedTexts.Clear();
            if (rowsArea != null)
                for (int i = rowsArea.childCount - 1; i >= 0; i--)
                    UnityEngine.Object.Destroy(rowsArea.GetChild(i).gameObject);
        }

        // --------------------------------------------------------------- helpers (verbatim DashboardController)

        private void TrackText(TextMeshProUGUI comp, string text)
        {
            if (!string.IsNullOrEmpty(text)) renderedTexts.Add(text);
        }

        private void EnsureEventSystem()
        {
            if (FindFirstObjectByType<EventSystem>() == null)
            {
                GameObject es = new GameObject("EventSystem", typeof(EventSystem));
                es.AddComponent<InputSystemUIInputModule>();
            }
        }

        private static GameObject NewUI(string name, Transform parent)
        {
            GameObject go = new GameObject(name, typeof(RectTransform));
            go.transform.SetParent(parent, false);
            return go;
        }

        private TextMeshProUGUI NewText(string name, Transform parent, string value, int size, TextAlignmentOptions anchor)
        {
            GameObject go = NewUI(name, parent);
            TextMeshProUGUI t = go.AddComponent<TextMeshProUGUI>();
            t.font = font;
            t.text = value;
            t.fontSize = size;
            t.alignment = anchor;
            t.color = TextPrimary;
            t.textWrappingMode = TextWrappingModes.NoWrap;
            t.overflowMode = TextOverflowModes.Truncate;
            t.raycastTarget = false;
            return t;
        }

        private static void Stretch(RectTransform rt, Vector2 offMin, Vector2 offMax)
        {
            rt.anchorMin = Vector2.zero;
            rt.anchorMax = Vector2.one;
            rt.offsetMin = offMin;
            rt.offsetMax = offMax;
        }

        private static void AddLayoutElement(GameObject go, float minHeight = -1, float preferredHeight = -1,
            float flexibleHeight = -1, float flexibleWidth = -1, float minWidth = -1, float preferredWidth = -1)
        {
            LayoutElement le = go.AddComponent<LayoutElement>();
            if (minHeight >= 0) le.minHeight = minHeight;
            if (preferredHeight >= 0) le.preferredHeight = preferredHeight;
            if (flexibleHeight >= 0) le.flexibleHeight = flexibleHeight;
            if (flexibleWidth >= 0) le.flexibleWidth = flexibleWidth;
            if (minWidth >= 0) le.minWidth = minWidth;
            if (preferredWidth >= 0) le.preferredWidth = preferredWidth;
        }
    }
}
