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
            yield return ChargerRoster();   // ⑨-3 — le rôle des attendants, par jointure
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
            // ⑨-2 — `.zinc.haut` (66 %) quand la file attend ; `.zinc.haut.vide` (52 %) quand personne (cadre 16).
            if (decor != null) decor.AppliquerZinc(n == 0 ? ZincVide : ZincFile, DosFile);
            // ⑨-6 — personne (cadre 16) : ni ligne du soir, ni file, ni bulle, ni tampon ; les tabourets vides et la plaque
            // du soir les remplacent. La phrase vit dans la plaque, plus dans la ligne.
            bool vide = n == 0;
            ligneAmbiance.gameObject.SetActive(!vide);
            fileRoot.gameObject.SetActive(!vide);
            parleRoot.gameObject.SetActive(!vide);
            tamponRoot.gameObject.SetActive(!vide);
            tabouretsVides.SetActive(vide);
            plaqueDuSoir.SetActive(vide);
            if (vide)
            {
                plaqueSurtitre.text = Lib("Ce soir, au Verge d’Or");
                plaqueTitre.text = AmbianceVide();
                TrackText(plaqueSurtitre, plaqueSurtitre.text);
                TrackText(plaqueTitre, plaqueTitre.text);
            }
            else
            {
                ligneAmbiance.text = (n == 1 ? "Un seul attend vos ordres" : EnLettres(n) + " attendent vos ordres")
                                     + " — la file est calme";
                TrackText(ligneAmbiance, ligneAmbiance.text);
            }

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

        // ================================================================ ⑨-6 personne au comptoir

        /// <summary>⑨-6 — L'ÉTAT VIDE, cadre 16 (`.comptoir.simple` : `.tabourets.grands.vides`, `.plaque`, `.filet.lien`).
        ///   `.tabourets.grands` : trois tabourets vides, siège 40×22, pied 38×9, `padding:0 6px`, `margin:2px 0 8px`, .85 —
        ///     `DecorAuComptoir.ConstruireTabourets`, le code de ⑯ à l'échelle de cette série ;
        ///   `.plaque` : le verre de `PlaqueAuComptoir` (celui de la plaque du matin de ⑯), `.kicker` 8px capitales crème-2
        ///     espacé .22em « Ce soir, au Verge d’Or », `.titre` Georgia 15 or-vif espacé .04em.
        /// Bâti une fois, masqué ; `Render` bascule entre la file et lui.</summary>
        private void BuildEtatVide(Transform parent)
        {
            tabouretsVides = DecorAuComptoir.ConstruireTabourets(parent, Px, 38f,
                new RectOffset(PxI(6f), PxI(6f), PxI(2f), PxI(8f)));
            tabouretsVides.name = "TabouretsVides";

            plaqueDuSoir = PlaqueAuComptoir.Construire(parent, "PlaqueDuSoir", PlaqueAuComptoir.Plaque(Px));
            plaqueSurtitre = NouveauTexteMaquette(plaqueDuSoir.transform, "Surtitre", "", 8f, Creme2);
            plaqueSurtitre.fontStyle = FontStyles.UpperCase;
            plaqueSurtitre.characterSpacing = 22f;
            plaqueTitre = NouveauTexteMaquette(plaqueDuSoir.transform, "Titre", "", 15f, OrVif);
            plaqueTitre.font = DesignTokens.Current.hudSerifFont;
            plaqueTitre.characterSpacing = 4f;
            plaqueTitre.enableWordWrapping = true;

            tabouretsVides.SetActive(false);
            plaqueDuSoir.SetActive(false);
        }

        /// <summary>La phrase de l'état vide. Le back sert `exceptions.file.ambiance` en pluriel ICU, dont la branche `=0` a
        /// été réalignée sur la maquette (« … — la routine tient », atelier §3.4 ; servie à `aea5ef7c`). ⚠️ Seule la branche
        /// `=0` est lue ici : `other` pose `#` en CHIFFRES, et un texte suivi ne porte pas de chiffre isolé (R2.2) — la ligne
        /// de la file garde ses nombres en lettres. Repli : le mot de la maquette.</summary>
        public static string AmbianceVide()
        {
            const string cle = "exceptions.file.ambiance";
            if (MafiaCleanCity.I18n.I18nCatalog.Connait(cle))
            {
                string t = MafiaCleanCity.I18n.I18nCatalog.Traduire(cle,
                    new System.Collections.Generic.Dictionary<string, string> { { "count", "0" } });
                if (!string.IsNullOrWhiteSpace(t)) return t;
            }
            return "Personne ne fait la queue — la routine tient";
        }

        // ================================================================ ⑨-3 qui attend

        /// <summary>⑨-3 — LA FILE AU COMPTOIR, cadre 14 (`.file`, `.attendant`, `.rail`, `.ville-b`) :
        ///   `.file{display:flex; align-items:flex-end; gap:10px; padding:0 10px}` — tassée à GAUCHE, alignée par le BAS
        ///     (juge r1 m3, m4 : elle s'étirait sur toute la largeur et s'alignait par le haut) ;
        ///   `.attendant` 60px, opacité .78 ; `.premier` 74px, opacité 1, chevron ▼ or-vif 9px au-dessus (r1 M9) ;
        ///   `.medl` carré arrondi 44 / r14 (58 / r18 pour le premier) AVEC le buste des lieutenants (r1 B2) ou, pour la
        ///     ville, un « B » or-vif Georgia 20 gras (`.ville-b`, r1 m7) — `MedaillonAuComptoir`, sans anneau ni halo or ;
        ///   `.rail` 34×3 : braise = grave, or = modérée, cyan = légère (r1 M3 : trois rails gris ; m5 : taille constante) ;
        ///   `b` le NOM (serif, 10px, crème — même taille pour tous, r1 m6) ; `small` « rôle · gravité · priorité »
        ///     (6,5px, capitales, crème-2) — le rôle par jointure `GET /v1/lieutenants` (`archetype`), absent tant qu'elle
        ///     n'a pas répondu ;
        ///   au-delà de TROIS : un « +N » à la suite (r1 M8 : « Cinq attendent » pour trois dessinés). ⚠️ La maquette ne
        ///     montre jamais plus de trois attendants : ce « +N » est une décision client, au style du nom, à juger.
        /// Chaque attendant ouvre SA carte (⑩) au toucher, comme avant.</summary>
        private void RendreFile()
        {
            for (int i = fileRoot.childCount - 1; i >= 0; i--)
                UnityEngine.Object.Destroy(fileRoot.GetChild(i).gameObject);

            Sprite buste = Resources.Load<Sprite>(MedaillonAuComptoir.CheminBusteLieutenant);
            for (int i = 0; i < Cards.Length && i < 3; i++)
            {
                ExceptionCardDto c = Cards[i];
                bool premier = i == 0;
                GameObject a = NewUI($"Attendant{i}", fileRoot);

                // ⛔ CHAQUE ATTENDANT OUVRE SA PROPRE CARTE — c'est LE chemin joueur vers ⑩ (capture par valeur).
                Image fondA = a.AddComponent<Image>();
                fondA.color = new Color(0f, 0f, 0f, 0f);   // cible de toucher, invisible
                Button ba = a.AddComponent<Button>();
                ba.targetGraphic = fondA;
                ExceptionCardDto carteDeCetAttendant = c;
                ba.onClick.AddListener(() => OpenDetail(carteDeCetAttendant));
                if (!premier) a.AddComponent<CanvasGroup>().alpha = 0.78f;   // `.attendant{opacity:.78}`

                VerticalLayoutGroup v = a.AddComponent<VerticalLayoutGroup>();
                v.spacing = Px(3f);
                v.childControlWidth = true; v.childControlHeight = true;
                v.childForceExpandWidth = false; v.childForceExpandHeight = false;
                v.childAlignment = TextAnchor.LowerCenter;
                AddLayoutElement(a, preferredWidth: Px(premier ? 74f : 60f), minWidth: Px(premier ? 74f : 60f));

                if (premier)
                {
                    TextMeshProUGUI chevron = NouveauTexteMaquette(a.transform, "Chevron", "▼", 9f, OrVif);
                    chevron.alignment = TextAlignmentOptions.Center;
                }

                bool ville = !ExceptionBandes.ParleUnLieutenant(c);
                GameObject med = MedaillonAuComptoir.Construire(a.transform, "Medaillon",
                    Px(premier ? 58f : 44f), Px(premier ? 18f : 14f), Mathf.Max(1f, Px(1f)), ville ? null : buste);
                if (ville) LettreDeLaVille(med.transform, 20f);

                // Le rail sous le médaillon PORTE la gravité — le canal de la maquette.
                GameObject rail = NewUI("Rail", a.transform);
                rail.AddComponent<Image>().color = CouleurRail(c.severity_band);
                AddLayoutElement(rail, preferredWidth: Px(34f), minWidth: Px(34f), preferredHeight: Px(3f), minHeight: Px(3f));

                TextMeshProUGUI nom = NouveauTexteMaquette(a.transform, "Nom", QuiParle(c), 10f, Creme);
                nom.font = DesignTokens.Current.hudSerifFont;
                nom.alignment = TextAlignmentOptions.Center;
                TrackText(nom, nom.text);

                TextMeshProUGUI bandes = NouveauTexteMaquette(a.transform, "Bandes", LigneAttendant(c), 6.5f, Creme2);
                bandes.fontStyle = FontStyles.UpperCase;
                bandes.characterSpacing = 10f;                  // `letter-spacing:.1em`
                bandes.alignment = TextAlignmentOptions.Center;
                bandes.enableWordWrapping = true;
                TrackText(bandes, bandes.text);

                // screen_a8 : la catégorie de couche conflit, EN TOUTES LETTRES (inchangé).
                string cat = CategorieConflit(c);
                if (cat != null)
                {
                    TextMeshProUGUI pastille = NouveauTexteMaquette(a.transform, "Categorie", cat, 6.5f, Creme2);
                    pastille.alignment = TextAlignmentOptions.Center;
                    TrackText(pastille, pastille.text);
                }
            }

            int enPlus = Cards.Length - 3;
            if (enPlus > 0)
            {
                // CHROME, non suivi : un compte de cartes, pas un scalaire de simulation (même statut que le sous-titre du
                // tampon et le compte d'escalades).
                TextMeshProUGUI plus = NouveauTexteMaquette(fileRoot, "EnPlus", "+" + enPlus, 10f, Creme2);
                plus.font = DesignTokens.Current.hudSerifFont;
                plus.alignment = TextAlignmentOptions.Bottom;
            }
        }

        /// <summary>La couleur du rail d'une gravité — `.rail.g` braise, `.rail.m` or, `.rail.l` cyan ; hors domaine ⇒ la
        /// teinte neutre, jamais celle de « léger ».</summary>
        public static Color CouleurRail(string gravite)
        {
            switch (ExceptionBandes.RangGravite(gravite))
            {
                case 2:  return DesignTokens.Current.hudGaugeArcHot;          // --braise
                case 1:  return DesignTokens.Current.hudMoneyUnderlineGold;   // --or
                case 0:  return DesignTokens.Current.hudGaugeArcCold;         // --cyan
                default: return DesignTokens.Current.onSurfaceSecondary;
            }
        }

        /// <summary>« rôle · gravité · priorité » (`.attendant small`). Le rôle vient de la JOINTURE (`archetype` de
        /// `GET /v1/lieutenants`, mot de `FamilleLabels`) ; sans lui (la ville, ou la jointure pas encore revenue), la
        /// ligne commence à la gravité — jamais un rôle inventé.</summary>
        public string LigneAttendant(ExceptionCardDto c)
        {
            string role = RoleDe(c);
            string bandes = ExceptionBandes.Ligne(c.severity_band, c.priority_band);
            return string.IsNullOrEmpty(role) ? bandes : role + " · " + bandes;
        }

        private string RoleDe(ExceptionCardDto c)
        {
            if (roster == null || !ExceptionBandes.ParleUnLieutenant(c)) return null;
            foreach (MafiaCleanCity.Operational.Lieutenant.RosterRow r in roster)
                if (r != null && r.lieutenant_id == c.lieutenant_id && !string.IsNullOrEmpty(r.archetype))
                    return MafiaCleanCity.Operational.FamilleLabels.Archetype(r.archetype);
            return null;
        }

        private MafiaCleanCity.Operational.Lieutenant.RosterRow[] roster;

        /// <summary>La jointure du rôle : `GET /v1/lieutenants`, APRÈS la file, non bloquante (si elle échoue, les rôles
        /// manquent, l'écran reste lisible) ; puis la file est redessinée.</summary>
        private IEnumerator ChargerRoster()
        {
            MafiaCleanCity.Operational.Lieutenant.RosterRow[] r = null;
            yield return new MafiaCleanCity.Operational.Lieutenant.LieutenantClient { BaseUrl = baseUrl }
                .ListLieutenants(Token, rows => r = rows, (code, msg) => { });
            if (Destroyed || r == null) yield break;
            roster = r;
            Render();
        }

        /// <summary>Test hook — pose le roster sans réseau (même effet que `ChargerRoster` quand il revient).</summary>
        public void PoserRosterPourTest(MafiaCleanCity.Operational.Lieutenant.RosterRow[] r)
        {
            roster = r;
            Render();
        }

        private static Color Creme => DesignTokens.Current.hudCreme;
        private static Color Creme2 => DesignTokens.Current.hudCremeSecondary;
        private static Color OrVif => DesignTokens.Current.hudMoneyGold;

        // ================================================================ ⑨-4 celui qui parle

        /// <summary>⑨-4 — LE PREMIER DE LA FILE PARLE, cadre 14 (`.parle`, `.bulle`, `.chip`) — juge r1 M4 (la bulle avait
        /// perdu nom en or, ligne de rôle, pastilles, queue, liseré, coins) et M5 (aucun coin arrondi, aucun liseré) :
        ///   `.parle{display:flex; gap:10px; align-items:flex-end}` ; `.parle .medl` 60×60, rayon 18 (`MedaillonAuComptoir`,
        ///     buste ou « B », sans or) ;
        ///   `.bulle` : `linear-gradient(160deg, rgba(28,40,60,.9), rgba(12,18,30,.96))` (le bas par le jeton
        ///     `hudBarGlassBottom`, d = 1,4 ; le haut #1c283c n'a pas de jeton proche), bord 1px #ffffff2a, rayon 14, la QUEUE
        ///     (`::before`, carré de 12 tourné de 45°, à gauche, 10px du bas) ; ⚠️ le coin bas-gauche à 4px n'est pas repris
        ///     (un seul rayon par sprite), la queue le recouvre ;
        ///   `.qui b` le NOM, Georgia 12 or-vif ; `.qui` « · rôle · contexte », 8px capitales .14em crème-2 ;
        ///   `.chip` gravité et priorité : 6,5px capitales, bord 1px et encre crème-2, rayon 7 (les classes `.sev-*`/`.pri-*`
        ///     ne sont définies nulle part dans la page : c'est le `.chip` de base, ce que montre le PNG) ;
        ///   `p` la RÉPLIQUE, Georgia 13 crème, interligne 1,3 — « Patron — … » quand un lieutenant parle en prose.
        /// Le contexte : « toute la ville » pour la ville (cadre 17) ; « au bâtiment touché » quand une issue vise un bâtiment
        /// (`effect.target_building_id`, cadre 14) ; rien sinon — jamais un lieu inventé.</summary>
        private void RendreParleur()
        {
            for (int i = parleRoot.childCount - 1; i >= 0; i--)
                UnityEngine.Object.Destroy(parleRoot.GetChild(i).gameObject);
            if (Cards.Length == 0) return;

            ExceptionCardDto c = Cards[0];
            bool ville = !ExceptionBandes.ParleUnLieutenant(c);
            GameObject med = MedaillonAuComptoir.Construire(parleRoot, "MedaillonParleur", Px(60f), Px(18f),
                Mathf.Max(1f, Px(1f)), ville ? null : Resources.Load<Sprite>(MedaillonAuComptoir.CheminBusteLieutenant));
            if (ville) LettreDeLaVille(med.transform, 20f);

            GameObject bulle = NewUI("Bulle", parleRoot);
            AddLayoutElement(bulle, flexibleWidth: 1);
            Image forme = bulle.AddComponent<Image>();
            forme.sprite = ProceduralUI.RoundedRectMask(PxI(14f));
            forme.type = Image.Type.Sliced;
            forme.color = Color.white;
            bulle.AddComponent<Mask>().showMaskGraphic = false;
            GameObject verre = NewUI("Verre", bulle.transform);
            Stretch((RectTransform)verre.transform, Vector2.zero, Vector2.zero);
            verre.AddComponent<LayoutElement>().ignoreLayout = true;
            Image verreImg = verre.AddComponent<Image>();
            verreImg.sprite = ProceduralUI.LinearGradient(64, 160f, VerreBulleHaut, VerreBulleBas);
            verreImg.raycastTarget = false;
            Filet(bulle.transform, "Bord", 0f, PxI(14f), Mathf.Max(1f, Px(1f)), Hex("#ffffff2a"));
            Queue(parleRoot, bulle.transform.GetSiblingIndex());

            VerticalLayoutGroup v = bulle.AddComponent<VerticalLayoutGroup>();
            v.padding = new RectOffset(PxI(12f), PxI(12f), PxI(9f), PxI(9f));
            v.spacing = Px(3f);
            v.childControlWidth = true; v.childControlHeight = true;
            v.childForceExpandWidth = true; v.childForceExpandHeight = false;

            TextMeshProUGUI nom = NouveauTexteMaquette(bulle.transform, "QuiNom", QuiParle(c), 12f, OrVif);
            nom.font = DesignTokens.Current.hudSerifFont;
            nom.fontStyle = FontStyles.Bold;
            TrackText(nom, nom.text);

            string contexte = ContexteDuPremier(c);
            if (!string.IsNullOrEmpty(contexte))
            {
                TextMeshProUGUI ctx = NouveauTexteMaquette(bulle.transform, "QuiContexte", contexte, 8f, Creme2);
                ctx.fontStyle = FontStyles.UpperCase;
                ctx.characterSpacing = 14f;                      // `.bulle .qui{letter-spacing:.14em}`
                ctx.enableWordWrapping = true;
                TrackText(ctx, ctx.text);
            }

            GameObject pastilles = NewUI("Pastilles", bulle.transform);
            HorizontalLayoutGroup hp = pastilles.AddComponent<HorizontalLayoutGroup>();
            hp.spacing = Px(5f);
            hp.childControlWidth = true; hp.childControlHeight = true;
            hp.childForceExpandWidth = false; hp.childForceExpandHeight = false;
            hp.childAlignment = TextAnchor.MiddleLeft;
            Pastille(pastilles.transform, "Gravite", ExceptionBandes.Gravite(c.severity_band));
            Pastille(pastilles.transform, "Priorite", ExceptionBandes.Priorite(c.priority_band));

            TextMeshProUGUI dit = NouveauTexteMaquette(bulle.transform, "Replique", RepliqueDuPremier(c), 13f, Creme);
            dit.font = DesignTokens.Current.hudSerifFont;
            dit.enableWordWrapping = true;
            // ⚠️ Texte du PRODUCTEUR : chrome, suivi au composant et pas au corpus (il peut porter des chiffres — en-tête R2.2).
        }

        /// <summary>Le contexte de celui qui parle, `.qui` après le nom : « rôle · lieu ». Chacun ABSENT quand la donnée
        /// manque (pas de jointure, pas de cible) — jamais un mot de remplissage.</summary>
        public string ContexteDuPremier(ExceptionCardDto c)
        {
            var parts = new List<string>();
            string role = RoleDe(c);
            if (!string.IsNullOrEmpty(role)) parts.Add(role);
            if (!ExceptionBandes.ParleUnLieutenant(c)) parts.Add(Lib("toute la ville"));
            else if (VisUnBatiment(c)) parts.Add(Lib("au bâtiment touché"));
            return parts.Count == 0 ? null : "· " + string.Join(" · ", parts);
        }

        private static bool VisUnBatiment(ExceptionCardDto c)
        {
            if (c == null || c.candidate_actions == null) return false;
            foreach (CandidateActionDto a in c.candidate_actions)
                if (a != null && a.effect != null && !string.IsNullOrEmpty(a.effect.target_building_id)) return true;
            return false;
        }

        /// <summary>La réplique du premier, cadre 14 : « Patron — ils ont retourné… » — l'adresse DEVANT, la première
        /// lettre de la phrase servie passée en minuscule (atelier 11-… §3.3 : « ⑨ met l'adresse devant, et passe « Ils » en
        /// minuscule »). Seulement quand un LIEUTENANT parle en PROSE (la règle des guillemets, `ExceptionBandes.Replique`) :
        /// la ville parle sans guillemets et sans « Patron », un identifiant se montre nu.</summary>
        public static string RepliqueDuPremier(ExceptionCardDto c)
        {
            string texte = TexteServeur(c);
            bool lieutenant = ExceptionBandes.ParleUnLieutenant(c);
            string brut = ExceptionBandes.Replique(texte, lieutenant);
            if (!lieutenant || string.IsNullOrWhiteSpace(texte) || !texte.Trim().Contains(" ")) return brut;
            string t = texte.Trim();
            // minuscule initiale seulement devant une lettre suivie d'une minuscule : « Ils » → « ils », jamais « LT », « Lt. »
            if (t.Length > 1 && char.IsUpper(t[0]) && char.IsLower(t[1]) && !t.StartsWith("Lt"))
                t = char.ToLowerInvariant(t[0]) + t.Substring(1);
            return "« " + Lib("Patron") + " — " + t + " »";
        }

        private void Pastille(Transform parent, string nom, string texte)
        {
            GameObject go = NewUI(nom, parent);
            Image bord = go.AddComponent<Image>();
            bord.sprite = ProceduralUI.RoundedRectOutline(PxI(7f), Mathf.Max(1f, Px(1f)), Creme2);
            bord.type = Image.Type.Sliced;
            bord.raycastTarget = false;
            HorizontalLayoutGroup h = go.AddComponent<HorizontalLayoutGroup>();
            h.padding = new RectOffset(PxI(5f), PxI(5f), PxI(1f), PxI(1f));
            h.childControlWidth = true; h.childControlHeight = true;
            h.childForceExpandWidth = false;
            TextMeshProUGUI t = NouveauTexteMaquette(go.transform, "Lib", texte, 6.5f, Creme2);
            t.fontStyle = FontStyles.UpperCase;
            t.characterSpacing = 8f;                              // `.chip{letter-spacing:.08em}`
            TrackText(t, t.text);
        }

        /// <summary>`.bulle::before{left:-7px; bottom:10px; 12×12; rotate(45deg)}` — la queue qui pointe vers le médaillon, de la
        /// couleur du bas du verre. Elle DÉBORDE de la bulle (qui masque ses enfants) : elle vit donc dans la rangée `.parle`,
        /// hors mise en page, JUSTE AVANT la bulle, placée par ancres depuis la CSS — médaillon 60 + écart 10 − 7 px de
        /// débord, 10 px du bas (la rangée étire la bulle sur sa hauteur : leurs bas coïncident).</summary>
        private void Queue(Transform rangee, int rangBulle)
        {
            GameObject q = NewUI("QueueBulle", rangee);
            q.AddComponent<LayoutElement>().ignoreLayout = true;
            RectTransform rt = (RectTransform)q.transform;
            rt.anchorMin = rt.anchorMax = new Vector2(0f, 0f);
            rt.pivot = new Vector2(0.5f, 0.5f);
            rt.sizeDelta = new Vector2(Px(12f), Px(12f));
            rt.anchoredPosition = new Vector2(Px(60f + 10f - 7f + 6f), Px(10f + 6f));
            rt.localRotation = Quaternion.Euler(0f, 0f, 45f);
            Image img = q.AddComponent<Image>();
            img.color = VerreBulleBas;
            img.raycastTarget = false;
            q.transform.SetSiblingIndex(rangBulle);
        }

        private void LettreDeLaVille(Transform medaillon, float corps)
        {
            TextMeshProUGUI b = NouveauTexteMaquette(medaillon, "VilleB", "B", corps, OrVif);
            b.font = DesignTokens.Current.hudSerifFont;
            b.fontStyle = FontStyles.Bold;
            b.alignment = TextAlignmentOptions.Center;
            b.gameObject.AddComponent<LayoutElement>().ignoreLayout = true;
            var brt = (RectTransform)b.transform;
            brt.anchorMin = Vector2.zero; brt.anchorMax = Vector2.one;
            brt.offsetMin = Vector2.zero; brt.offsetMax = Vector2.zero;
        }

        // `rgba(28,40,60,.9)` / `rgba(12,18,30,.96)` : le haut sans jeton proche (d = 7,3), le bas par `hudBarGlassBottom`
        // (d = 1,4, TD-612). Opacités CSS passées par l'ajustement linéaire (la bulle flotte sur le décor).
        private static Color VerreBulleHaut
        {
            get { Color c = Hex("#1c283c"); c.a = ProceduralUI.AlphaVoileSurFondQuelconque(c, 0.90f, out _); return c; }
        }
        private static Color VerreBulleBas
        {
            get
            {
                Color t = DesignTokens.Current.hudBarGlassBottom;
                Color c = new Color(t.r, t.g, t.b, 1f);
                c.a = ProceduralUI.AlphaVoileSurFondQuelconque(c, 0.96f, out _);
                return c;
            }
        }

        // ================================================================ ⑨-1 le tampon qui résout

        /// <summary>⑨-1 — LE TAMPON, cadre 14 ratifié : `.tampon` crème (#d9cca9), bord 2px #93402c, filet intérieur
        /// (inset 3px #93402c55), encre #93402c en capitales espacées (.22em), sous-titre « suggéré · appui long — sa main :
        /// N autres issues › ». Même famille que le tampon de ⑯ (papier PLEIN : `RoundedRectMask` teint, jamais un contour teint).
        /// DEUX GESTES sur le même objet, comme le jeton de ⑯ :
        ///   · APPUI LONG ⇒ résoudre la suggérée, par la VRAIE route, avec le `method` et l'`id` SERVIS (Lot 0 D4 : L0.2 est
        ///     fermé côté back — l'ancien commentaire de ce site disait l'inverse, voir l'écart 5e57bc6d §0.2) ;
        ///   · TAP ⇒ ouvrir sa main (⑩), c'est le « › » du sous-titre.
        /// Remplace un pavé corail plein à texte blanc (juge r1 M2 : contraste 2,71:1, sous le plancher) qui ouvrait ⑩ au tap
        /// et ne résolvait jamais.</summary>
        private void RendreTampon()
        {
            for (int i = tamponRoot.childCount - 1; i >= 0; i--)
                UnityEngine.Object.Destroy(tamponRoot.GetChild(i).gameObject);
            tamponLibelle = null; tamponSous = null; tamponAppui = null;
            if (Cards.Length == 0) return;

            ExceptionCardDto c = Cards[0];
            (string method, string id)? choix = ChoixDuTampon(c);

            GameObject t = NewUI("TamponBouton", tamponRoot);
            Stretch((RectTransform)t.transform, Vector2.zero, Vector2.zero);
            Image papier = t.AddComponent<Image>();
            papier.sprite = ProceduralUI.RoundedRectMask(PxI(11f));
            papier.type = Image.Type.Sliced;
            papier.color = Hex("#d9cca9");
            Filet(t.transform, "Bord", 0f, PxI(11f), Px(2f), EncreTampon);
            Filet(t.transform, "FiletInterieur", Px(3f), PxI(7f), Px(1f), Hex("#93402c55"));

            VerticalLayoutGroup v = t.AddComponent<VerticalLayoutGroup>();
            v.padding = new RectOffset(PxI(12f), PxI(12f), PxI(10f), PxI(10f));
            v.spacing = Px(2f);
            v.childControlWidth = true; v.childControlHeight = true;
            v.childForceExpandWidth = true; v.childForceExpandHeight = false;
            v.childAlignment = TextAnchor.MiddleCenter;

            // Le libellé : l'action suggérée, en toutes lettres (par sa clé i18n si servie, sa prose sinon).
            string action = choix.HasValue ? LibelleAction(c.suggested_action).ToUpperInvariant() : Lib("OUVRIR SA MAIN");
            tamponLibelle = NouveauTexteMaquette(t.transform, "Libelle", action, 12f, EncreTampon);
            tamponLibelle.alignment = TextAlignmentOptions.Center;
            tamponLibelle.characterSpacing = 22f;             // `.tampon{letter-spacing:.22em}`
            tamponLibelle.fontStyle = FontStyles.Bold;        // `.tampon{font-weight:800}`
            tamponLibelle.enableWordWrapping = true;
            TrackText(tamponLibelle, tamponLibelle.text);

            Color encreSous = EncreTampon; encreSous.a = 0.85f;  // `.tampon small{opacity:.85}` sur fond CONNU (le papier)
            tamponSous = NouveauTexteMaquette(t.transform, "SousTexte",
                choix.HasValue ? SousTitreTampon(AutresIssues(c)) : Lib("il attend une consigne"), 8.5f, encreSous);
            tamponSous.alignment = TextAlignmentOptions.Center;
            tamponSous.enableWordWrapping = true;
            // ⚠️ NON SUIVI, et c'est la règle de ce fichier, pas une dérogation : « sa main : 5 autres issues » porte un
            //    CHIFFRE, que la maquette écrit (cadres 14 et 17). Ce n'est pas un scalaire de simulation — la cible de R2.2 —
            //    mais le compte des CHOIX du joueur, qu'il voit dans sa main. Même statut que le compte d'escalades, déjà
            //    du chrome (voir l'en-tête de `Render`). La garde `…_NoRawScalar` garde son motif entier.
            if (!choix.HasValue) TrackText(tamponSous, tamponSous.text);

            // Les deux gestes. `Button` tire AUSSI au relâchement d'un appui long : le tap est donc CONSOMMÉ quand l'appui
            // long a abouti (même garde que le jeton de ⑯).
            bool consomme = false;
            Button tap = t.AddComponent<Button>();
            tap.targetGraphic = papier;
            ExceptionCardDto carte = c;
            tap.onClick.AddListener(() =>
            {
                if (consomme) { consomme = false; return; }
                OpenDetail(carte);
            });
            if (choix.HasValue)
            {
                tamponAppui = t.AddComponent<LongPressButton>();
                tamponAppui.OnLongPressCompleted += () =>
                {
                    consomme = true;
                    if (!Destroyed) StartCoroutine(ResoudreLaSuggestion());
                };
            }
        }

        /// <summary>Ce que l'appui long envoie : `(method, id)` de la suggestion SERVIE, ou null si la carte n'en porte pas
        /// (`suggested_action` null ⇒ JsonUtility rend une instance vide : `id` vide). Le `method` est celui du back
        /// (Lot 0 D4) ; ⚠️ s'il manque — pile antérieure à D4 seulement —, repli sur l'ancienne dérivation client
        /// (`ExceptionDetailController.MethodFor`), déclaré ici plutôt que caché.</summary>
        public static (string method, string id)? ChoixDuTampon(ExceptionCardDto c)
        {
            CandidateActionDto s = c != null ? c.suggested_action : null;
            if (s == null || string.IsNullOrEmpty(s.id)) return null;
            string method = !string.IsNullOrEmpty(s.method) ? s.method : ExceptionDetailController.MethodFor(s, false);
            return (method, s.id);
        }

        /// <summary>Le nombre d'issues de sa main AUTRES que la suggérée — le « N autres issues » du sous-titre.</summary>
        public static int AutresIssues(ExceptionCardDto c)
        {
            if (c == null || c.candidate_actions == null) return 0;
            string idSug = c.suggested_action != null ? c.suggested_action.id : null;
            int n = 0;
            foreach (CandidateActionDto a in c.candidate_actions)
                if (a != null && a.id != idSug) n++;
            return n;
        }

        /// <summary>« suggéré · appui long — sa main : N autres issues › » (cadre 14 ; « 1 autre issue » au cadre 17).
        /// ⚠️ Assemblé avec le nombre : `Libelle.De` ne prend pas de paramètre (dette X1, comme ⑯).</summary>
        public static string SousTitreTampon(int autres)
        {
            string tete = Lib("suggéré · appui long — sa main");
            if (autres <= 0) return tete + " ›";
            // l'espace est ICI, pas dans le littéral : une valeur servie ne le porterait pas (le slug le rogne)
            return tete + " : " + autres + " " + (autres == 1 ? Lib("autre issue") : Lib("autres issues")) + " ›";
        }

        private static string LibelleAction(CandidateActionDto a)
        {
            if (a == null) return string.Empty;
            if (a.label_i18n != null && !string.IsNullOrEmpty(a.label_i18n.key)
                && MafiaCleanCity.I18n.I18nCatalog.Connait(a.label_i18n.key))
                return MafiaCleanCity.I18n.I18nCatalog.Traduire(a.label_i18n.key);
            return a.label ?? string.Empty;
        }

        /// <summary>⑨-1 — résoudre la suggestion du PREMIER de la file, par `POST /v1/exceptions/:id/resolve` avec le
        /// `method` et l'`id` servis. Puis la file est RECHARGÉE (le serveur fait foi ; l'état « après le tampon » de v4-17
        /// est le lot ⑨-6). Public : la garde le pilote.</summary>
        public IEnumerator ResoudreLaSuggestion()
        {
            EnsureInitialized();
            if (Cards.Length == 0 || resolutionEnCours) yield break;
            ExceptionCardDto c = Cards[0];
            (string method, string id)? choix = ChoixDuTampon(c);
            if (!choix.HasValue) yield break;
            resolutionEnCours = true;
            DerniereIssue = null;
            DerniereErreurResolution = null;
            yield return client.Resolve(c.exception_id, choix.Value.method, choix.Value.id, Token,
                ok => DerniereIssue = ok.outcome,
                (code, msg) => DerniereErreurResolution = $"{code}: {msg}");
            resolutionEnCours = false;
            if (Destroyed) yield break;
            if (DerniereIssue != null) yield return LoadQueue();
        }

        private bool resolutionEnCours;
        private TextMeshProUGUI tamponLibelle, tamponSous;
        private LongPressButton tamponAppui;

        // ---- test hooks ⑨-1
        public ExceptionsClient ClientPourTest { get { EnsureInitialized(); return client; } }
        public string DerniereIssue { get; private set; }
        public string DerniereErreurResolution { get; private set; }
        public string TamponLibelleTexte => tamponLibelle != null ? tamponLibelle.text : null;
        public string TamponSousTexte => tamponSous != null ? tamponSous.text : null;
        public LongPressButton TamponAppuiLong => tamponAppui;

        private static Color EncreTampon => Hex("#93402c");

        private static Color Hex(string h)
        {
            ColorUtility.TryParseHtmlString(h, out Color c);
            return c;
        }

        /// <summary>Un filet arrondi hors mise en page, en retrait de `retrait` (le bord et le filet du tampon).</summary>
        private static void Filet(Transform parent, string nom, float retrait, int rayon, float epaisseur, Color couleur)
        {
            GameObject go = NewUI(nom, parent);
            RectTransform rt = (RectTransform)go.transform;
            rt.anchorMin = Vector2.zero; rt.anchorMax = Vector2.one;
            rt.offsetMin = new Vector2(retrait, retrait); rt.offsetMax = new Vector2(-retrait, -retrait);
            Image img = go.AddComponent<Image>();
            img.sprite = ProceduralUI.RoundedRectOutline(rayon, epaisseur, couleur);
            img.type = Image.Type.Sliced;
            img.raycastTarget = false;
            go.AddComponent<LayoutElement>().ignoreLayout = true;
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
            headerText.text = "L'ARDOISE";
            TextMeshProUGUI err = NewText("Error", rowsArea, Lib("Le comptoir n'a pas répondu."), 14, TextAlignmentOptions.Left);
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
            hf.childAlignment = TextAnchor.LowerLeft;                   // `.file{align-items:flex-end}`, tassée à gauche
            hf.padding = new RectOffset(PxI(10f), PxI(10f), 0, 0);      // `.file{padding:0 10px}`
            AddLayoutElement(fileRoot.gameObject, preferredHeight: Px(CssFileHaut));

            parleRoot = (RectTransform)NewUI("Parle", comptoirGo.transform).transform;
            HorizontalLayoutGroup hp = parleRoot.gameObject.AddComponent<HorizontalLayoutGroup>();
            hp.spacing = Px(CssParleEcart);
            hp.childControlWidth = true; hp.childControlHeight = true;
            hp.childForceExpandWidth = false; hp.childForceExpandHeight = true;
            hp.childAlignment = TextAnchor.LowerLeft;

            tamponRoot = (RectTransform)NewUI("Tampon", comptoirGo.transform).transform;
            AddLayoutElement(tamponRoot.gameObject, preferredHeight: Px(CssTamponHaut));

            BuildEtatVide(comptoirGo.transform);

            lienRoot = (RectTransform)NewUI("LienEscalades", comptoirGo.transform).transform;
            AddLayoutElement(lienRoot.gameObject, preferredHeight: Px(CssLienHaut));

            // ⑨-2 — le décor, premier enfant de la racine, SOUS tout le comptoir, hors mise en page.
            decor = DecorAuComptoir.Construire<DecorAuComptoir>(racineGo.transform, ParametresFile());
        }

        // ================================================================ ⑨-2 le décor

        /// <summary>⑨-2 — le décor de ⑨, cadres 14-18 (juge r1 B1 BLOQUANT : « la scène du comptoir est absente »,
        /// 57 % du rect libre en noir pur). Source : atelier `11-exceptions-inventaire.md` §2.1 (`79ba0a03`) — le fond
        /// `.scene.bar` est `bar_FINAL2.png` ENTIER (atelier `a026f50`, 1080×1350, sha256 8ad2255b…), prouvé au pixel
        /// (écart 0,75/255), `background-position: center 20%`. Monté tel quel sous
        /// `Assets/Art/Scenes/Resources/Scenes/sprite_environment_bar_nuit.png` (même patron que le Verge d'Or de ⑯).
        /// Le même bar servira au Recrutement ⑳ : ce chemin n'est pas lié à ⑨.
        /// `.degrade.fort` : #0a0f18 à d8 · 55 · 99 · f4 · ff (0, 18, 40, 56, 70 %). Zinc `.zinc.haut` 66 % (étagère 15 %),
        /// `.zinc.haut.vide` 52 % quand personne n'attend (cadre 16).</summary>
        public static DecorAuComptoir.Parametres ParametresFile() => new DecorAuComptoir.Parametres
        {
            CheminScene = CheminBar,
            SourceLargeur = 1080f, SourceHauteur = 1350f,
            Boite = new Rect(0f, 0f, 1080f, 1350f),
            PositionVerticale = 0.20f,
            CleDegrade = "degrade.fort",
            Degrade = () => new[]
            {
                (0.00f, DecorAuComptoir.Voile(DecorAuComptoir.Nuit, 0xd8)),
                (0.18f, DecorAuComptoir.Voile(DecorAuComptoir.Nuit, 0x55)),
                (0.40f, DecorAuComptoir.Voile(DecorAuComptoir.Nuit, 0x99)),
                (0.56f, DecorAuComptoir.Voile(DecorAuComptoir.Nuit, 0xf4)),
                (0.70f, DecorAuComptoir.Voile(DecorAuComptoir.Nuit, 0xff)),
                (1.00f, DecorAuComptoir.Voile(DecorAuComptoir.Nuit, 0xff)),
            },
            HauteurZinc = ZincFile, HauteurDos = DosFile,
        };

        public const string CheminBar = "Scenes/sprite_environment_bar_nuit";
        public const float ZincFile = 0.66f, ZincVide = 0.52f, DosFile = 0.15f;

        private DecorAuComptoir decor;
        public DecorAuComptoir Decor => decor;

        private RectTransform racine, comptoir, fileRoot, parleRoot, tamponRoot, lienRoot;
        private TextMeshProUGUI ligneAmbiance;

        // ⑨-6 — l'état vide (cadre 16) : trois grands tabourets vides et la plaque du soir, à la place de la file.
        private GameObject tabouretsVides, plaqueDuSoir;
        private TextMeshProUGUI plaqueSurtitre, plaqueTitre;
        public GameObject TabouretsVides => tabouretsVides;
        public GameObject PlaqueDuSoir => plaqueDuSoir;
        public string PlaqueDuSoirSurtitre => plaqueSurtitre != null ? plaqueSurtitre.text : null;
        public string PlaqueDuSoirTitre => plaqueTitre != null ? plaqueTitre.text : null;
        public GameObject LigneSoir => ligneAmbiance != null ? ligneAmbiance.gameObject : null;
        public GameObject FilePourTest => fileRoot != null ? fileRoot.gameObject : null;
        public GameObject ParlePourTest => parleRoot != null ? parleRoot.gameObject : null;
        public GameObject TamponPourTest => tamponRoot != null ? tamponRoot.gameObject : null;

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

        // ⑨-0 — L'ANCIEN COMMENTAIRE DE `QuiParle` ÉTAIT FAUX, et il faut le dire : il affirmait « le NOM du lieutenant
        // n'est pas projeté sur cette route ». Il l'est depuis C3 (`lieutenant: {id, name}`, corps du 06/09 : « Lt. Rook »),
        // et c'est le DTO qui le jetait (forme G). Un énoncé d'absence est daté : celui-ci avait expiré sans que rien ne
        // rougisse, parce qu'un champ non déclaré ne lève rien.
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

        private static string QuiParle(ExceptionCardDto c) => ExceptionBandes.Locuteur(c);

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
        // ⑨-4 — `Replique(c)` est retirée : la réplique du premier passe par `RepliqueDuPremier` (la même règle des guillemets,
        // `ExceptionBandes.Replique`, plus l'adresse « Patron — »), et `TexteServeur` reste le point de passage du texte serveur.
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
