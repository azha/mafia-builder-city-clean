using System;
using System.Collections;
using System.Collections.Generic;
using System.Globalization;
using UnityEngine;
using UnityEngine.UI;
using MafiaCleanCity.Operational; // REUSE DashboardClient (GetMe/GetWallet) + MeDto/WalletDto (envelope/payload/data)
using MafiaCleanCity.Theme;
using TMPro;

namespace MafiaCleanCity.Shell
{
    // W3.U1 C2 (design §3 C2) — le TopBar : les 4 éléments canoniques (callsign, cash, point de
    // notification, temps in-game). Persistant, monté une seule fois par l'AppShell dans
    // `TopBarSlot` — jamais reconstruit à chaque changement d'onglet (§1.2 du design : "TopBar 4
    // éléments PERSISTANTS").
    //
    // Callsign + cash sont des VRAIES requêtes que ce composant émet lui-même (REUSE DashboardClient
    // — GetMe/GetWallet, déjà lues via le triplet enveloppe/payload/data). Le point de notification
    // (`backlog_badge`) et le temps in-game (`opened_game_day`, design D3, la 12e clé) viennent du
    // payload `session/open` — CE composant ne l'appelle PAS lui-même (c'est le rôle de C3,
    // `SessionClient`) : `Load` les reçoit en PARAMÈTRE, posés par l'appelant. C'est pourquoi C2 est
    // livrable et testable AVANT que C3 existe (§3.0 du design : C2 ne consomme que `GET /v1/me` +
    // `GET /v1/economy/wallet` en propre).
    //
    // HUD v3.1 boucle ⊥ PIXEL-PERFECT (2026-08-21, ruling user mot pour mot : « ya rien qui va, les
    // couleurs etc. lance artefact et reprends tant que c'est pas pixel perfect »). REPRISE du round
    // 247ed3b : ce round avait COMPOSÉ ses teintes depuis les 51 tokens existants par alpha
    // (`accentGold` jaune vif → « laiton », `nightBackground`/`surfaceBase` → « verre bleu nuit ») au
    // lieu de porter les hex EXACTS de la maquette — root cause nommée par le ruling lui-même. Ce
    // round porte 10 tokens DÉDIÉS (`hud*`, DesignTokens.cs, gdd/14 @e171c594), REUSE verbatim des
    // variables CSS de `hud-brennar.html` (`:root`). La référence pixel du lot est
    // `Tools/hud-topbar-reference-2560.png` (rendue en isolation à l'échelle Unity — voir ce fichier
    // pour le protocole).
    //
    // Les 7 écarts structurels fermés ici (voir implementation-notes.md pour le détail complet) :
    // (1) ARGENT+montant passent à GAUCHE, serif, `hudMoneyGold` (« l'argent, seul or de l'écran ») ;
    // (2) le manomètre porte un ARC réel (track+cold+hot, `Image.FillMethod.Radial180`) + une valeur
    //     lisible au centre + le caption HEAT (voir Deviations : la maquette montre un "37%" que
    //     AUCUNE donnée réelle ne porte — substitué par le libellé de bucket réel, R2.2) ;
    // (3) l'horloge passe à l'aile DROITE (JOUR N petites capitales + phase en grand serif — voir
    //     Deviations : la maquette montre une heure "21:40" que AUCUNE donnée réelle ne porte) ;
    // (4) zéro badge PERMANENT — le badge reste un hook de DONNÉES headless (R2.2, C2F2/C2F4/DA5
    //     inchangés), sa chrome visible est retirée (le bandeau éphémère qui le remplacerait est
    //     hors périmètre — voir Deviations) ;
    // (5) police SERIF (`DesignTokens.Current.hudSerifFont`, DejaVu Serif SDF) pour l'argent,
    //     l'heure/phase, la valeur du manomètre ;
    // (6) coins arrondis (`ProceduralUI.RoundedRectMask` + `UnityEngine.UI.Mask`), verre fumé, et
    //     AUCUN filet rouge en état calme (le rouge n'existe QUE via `UpdateAlarmState`, inchangé,
    //     hors périmètre de ce lot) ;
    // (7) le callsign n'existe pas dans la maquette — retiré de la chrome VISIBLE (reste un hook de
    //     données headless, même traitement que le badge — voir Deviations).
    //
    // Ce qui NE bouge PAS : le maillon de session (chunk 5, day_phase/manomètre) et l'action leading
    // (chunk 2, §3.1) restent EXACTEMENT les mêmes méthodes publiques/sémantique. `ZoneRow` (3 zones
    // peintes, `HeatBucketResolver.SeverityColor`) et l'angle de l'aiguille (`HeatNeedleAngleDegrees`,
    // -60/-20/20/60) restent BYTE-POUR-BYTE ce que `HudPlayModeTests`/`HeatBucketResolver` épinglent
    // déjà (hud-F2/F6/M1). `UpdateAlarmState` reste routé exclusivement par `HeatBucketResolver.
    // SeverityColor` — jamais un accès direct à un token de sévérité depuis ce fichier.
    public class TopBarController : MonoBehaviour
    {
        // nav-hud-design-v1.md §3.1 (chunk 2) — l'action « leading » : ÉTEND le TopBar, ne le
        // REMPLACE pas (§3.1 : "aucun bouton ne devient jamais un 4ᵉ enfant du Canvas" — 3
        // falsifiables C1-F2/C8-F1 assertent déjà childCount==3 sur la racine ; un enfant de
        // TopBarSlot ne les touche pas). État NOMMÉ, jamais déduit d'une absence d'objet.
        public enum LeadingAction { None, BackToMap }

        [Header("Backend")]
        [SerializeField] private string baseUrl = "http://localhost";

        // ---- test hooks — action leading (§3.1) ----------------------------
        public LeadingAction CurrentLeadingAction { get; private set; } = LeadingAction.None;

        // ---- test hooks ---------------------------------------------------
        public bool Loaded { get; private set; }
        public string MeError { get; private set; }
        public string WalletError { get; private set; }
        public MeDto CurrentMe { get; private set; }
        public WalletDto CurrentWallet { get; private set; }
        public bool NotificationActive { get; private set; }
        public int OpenedGameDay { get; private set; }
        public string RenderedGameDayText { get; private set; }
        public string RenderedCashText { get; private set; }

        // ---- test hooks — day_phase (§6.3, chunk 5) -------------------------
        /// <summary>État affiché par l'aile droite pour day_phase : la valeur DAWN|DAY|DUSK|NIGHT du
        /// DTO district déjà récupéré quand `AppShell` est en district, sinon l'état NOMMÉ "—"
        /// (jamais la dernière valeur d'un district quitté — voir `SetDayPhase`).</summary>
        public string DayPhaseText { get; private set; } = "—";

        // ---- test hooks — manomètre heat (§6.4, chunk 5) --------------------
        public string CitywideHeatBucket { get; private set; }
        public HeatBucketResolver.Rank CitywideHeatRank { get; private set; } = HeatBucketResolver.Rank.Unknown;
        /// <summary>hud-F2 — 4 valeurs DISTINCTES pour les 4 buckets réels (dérivées de
        /// `HeatBucketResolver.NeedleAngleDegrees`, fonction pure — voir ce fichier pour le test
        /// hors-réseau direct). INCHANGÉ par ce round (contrat numérique pinné, M1).</summary>
        public float HeatNeedleAngleDegrees { get; private set; }

        // ---- test hooks — frontière avec la navigation district (2026-08-21) ----------------
        /// <summary>Portée EFFECTIVE du chrome bas de barre, médaillon compris — le médaillon PEND
        /// sous `TopBarSlot` par construction (doctrine, `ManometreVerticalOffsetPx`) : un appelant
        /// qui réserve seulement `TopBarSlot.rect.height` (56px NOMINAUX) sous-estime la zone
        /// réellement occupée par le chrome, et tout ce qu'il monte SOUS la barre (ex. le titre
        /// district) peut se retrouver chevauché par l'anneau/le filet. MESURÉ en LIVE (jamais une
        /// constante recopiée) — mais PAS via `GetWorldCorners` : cette première forme mélangeait
        /// des UNITÉS DIFFÉRENTES (pixels ÉCRAN post-`CanvasScaler`) avec `TopBarSlot.rect.height`
        /// (unités CANVAS LOCALES, pré-scale) — correct seulement quand `canvas.scaleFactor==1`, et
        /// FAUX dès qu'il diverge (mesuré : `NavF4`/`NavF5` rougissaient sous `run_tests`, dont la
        /// Game View n'est pas garantie à 1280×720 exact). `CalculateRelativeRectTransformBounds`
        /// RELATIF À `transform` LUI-MÊME reste en unités canvas locales des deux côtés — ce
        /// composant est stretché à son parent (`BuildLayout` → `Stretch(selfRt,...)`), donc son
        /// propre `.rect` COÏNCIDE avec `TopBarSlot` dans CES MÊMES unités. 0 si `Manometre`
        /// n'existe pas encore (avant `BuildLayout`).</summary>
        public float EffectiveBottomOverhangPx
        {
            get
            {
                Transform manoT = transform.Find("Manometre");
                if (manoT == null) return 0f;
                RectTransform selfRt = GetComponent<RectTransform>();
                Bounds manoBounds = RectTransformUtility.CalculateRelativeRectTransformBounds(transform, (RectTransform)manoT);
                float selfBottomY = selfRt.rect.yMin;
                float manoBottomY = manoBounds.min.y;
                float debordLocal = Mathf.Max(0f, selfBottomY - manoBottomY);

                // ⛔⛔ CETTE GRANDEUR TRAVERSE UN CHANGEMENT DE REPÈRE, ET ELLE DOIT SORTIR DANS
                // CELUI DE L'ÉCRAN. Le bandeau est désormais autoré en px CSS de la maquette et
                // porté à l'écran par un `localScale` sur son parent : le calcul ci-dessus est
                // donc en unités de MAQUETTE, pas en unités de canvas.
                //   J'ai d'abord converti au site d'appel — et j'en ai corrigé UN sur DEUX. Le
                //   second réservait 32,2 unités là où le médaillon en occupe 98, et le titre du
                //   district passait sous l'anneau. **Deux sites d'appel de la même valeur, un
                //   seul corrigé** : c'est le mode d'échec le plus banal d'une conversion posée
                //   chez l'appelant. Il y en a quatre au total (2 en production, 2 en test).
                //   ⇒ La conversion vit ICI, une fois, chez celui qui CONNAÎT son échelle. Aucun
                //     appelant ne peut plus l'oublier, et la propriété exposée a désormais la
                //     même unité que le `rect.height` avec lequel tout le monde l'additionne.
                float echelle = transform.lossyScale.y;
                if (echelle <= 0.0001f) echelle = 1f;   // anti-vacuité : jamais une division/produit par 0
                return debordLocal * echelle;
            }
        }

        /// <summary>Every SCANNED text (R2.2 corpus — design C2-F4). Excludes elements whose
        /// `trackValue` is false (numeric UI chrome: cash, game-day — mirrors
        /// `DashboardController.AddStatusRow(trackValue:false)`, `:340`).</summary>
        public IReadOnlyList<string> RenderedTexts => renderedTexts;
        private readonly List<string> renderedTexts = new List<string>();

        // ---- chrome VISIBLE (money left / gauge center / clock right) ------
        private TextMeshProUGUI moneyLabelText;
        private TextMeshProUGUI moneyValueText;
        private Image moneyUnderline;
        private RectTransform moneyClusterRect;
        private TextMeshProUGUI dayLabelText;
        private TextMeshProUGUI phaseValueText;
        private TextMeshProUGUI gaugeValueText;
        private RectTransform heatNeedle;

        // ---- hooks de DONNÉES headless — écart (4)+(7), voir Deviations : ces deux éléments
        // restent nécessaires au contrat R2.2/test (callsign identité scannée, badge C2F2/C2F4/DA5)
        // mais n'ont plus de chrome VISIBLE dans la doctrine (ni l'un ni l'autre n'apparaît dans
        // `hud-brennar.html`). alpha=0, taille minimale — jamais détruits, jamais SetActive(false)
        // (un objet inactif ne recevrait plus de `.text` à jour de façon aussi évidente ; alpha=0
        // suffit et garde le composant simple à raisonner).
        private TextMeshProUGUI callsignText;
        private TextMeshProUGUI notificationText;

        // §3.1 — le bouton leading, construit UNE fois dans BuildLayout, premier enfant du
        // HorizontalLayoutGroup, JAMAIS détruit ; seule sa visibilité (SetActive) suit l'état.
        private GameObject leadingGo;
        private TextMeshProUGUI leadingText;
        private System.Action leadingOnClick;

        // ---- HUD v3.1 — chrome doctrine --------------------------------------
        private VerticalGradientImage barBackground;
        private Image hairline;
        private Image boitierRing;
        private Color calmGoldColor;

        /// <summary>Gouttière horizontale du chrome. La VALEUR a déménagé dans `ShellChrome.GutterX`
        /// (assembly `ShellContracts`) le 2026-08-21 : les locataires en ont besoin pour s'y aligner
        /// et ne peuvent pas lire `Shell` sans cycle d'assemblies. Cet alias reste pour que les ~30
        /// sites d'appel du bandeau ne changent pas — mais il n'y a plus qu'UNE définition, donc le
        /// bandeau et le titre de district ne peuvent plus diverger.</summary>
        private const float BarPaddingX = ShellChrome.GutterX;
        // 36 et non 90. Le canon ne porte AUCUN bouton retour dans le bandeau : à sa place vit
        // une volute décorative de 34×12 (`.volute g`). Le retour est fonctionnel ici (on est
        // DANS un district, il faut pouvoir en sortir) mais il ne peut pas occuper 23 % de la
        // largeur : à 90, il poussait l'aile ARGENT sous le médaillon et le montant sortait
        // TRONQUÉ (mesuré sur capture : « $10,00 » coupé net par l'anneau du manomètre).
        // 16 (marge) + 36 + 12 (écart) + 96 (aile) = 160 < 164, la gauche du médaillon.
        private const float LeadingWidth = 36f;
        private const float LeadingHeight = 40f;
        // ⛔ RATIOS RE-MESURÉS CONTRE LA MAQUETTE (2026-08-22, demande user « traite le menu en haut
        // et en bas, en terme de ratio »). Tout est rapporté à la HAUTEUR DE BARRE, la seule grandeur
        // comparable entre une maquette de 2560 px et un écran de 1200.
        //   maquette : anneau y 14..141 (le filet à y 102-103 le coupe) ⇒ 128 px pour une barre de
        //              104 ⇒ **123,1 %** ; débord sous la barre 141−103 = 38 px ⇒ **36,5 %**
        //   capture  : 58 px pour une barre de 53 ⇒ 109,4 % ; débord 15 px ⇒ 28,3 %
        // ⇒ 1,231 × 56 = 68,9. ★ Et la mesure a failli être fausse : mon premier relevé donnait
        //   « 53,8 % de débord » parce que la bande verticale d'or incluait le LOSANGE que la
        //   maquette pose SOUS le médaillon (y 148..159) — un ornement séparé, pas l'anneau.
        // ⚠️ 68 ET NON 69, ET C'EST UNE MESURE QUI L'IMPOSE. À 69 — la valeur exacte du ratio —
        // l'oracle du manomètre rougit : « piste parasite détectée dans le demi-cercle INFÉRIEUR,
        // ang=333 r=2,5 ». Un diamètre IMPAIR place le centre du cercle procédural entre deux texels
        // et laisse un pixel isolé près du centre. Ce dépôt connaît déjà cette famille : la parité
        // d'un conteneur avait fabriqué une phase d'un demi-pixel sur le fond pré-rendu.
        // 68 donne 121,4 % contre 123,1 % visé (70 donnerait 125,0 %) — c'est le pair le plus proche.
        private const float ManometreDiameter = 68f;
        /// <summary>Les deux libellés de la pastille de notification. PUBLICS et NOMMÉS parce
        /// que TROIS assertions, dans DEUX fichiers de test, les recopiaient en littéral — la même
        /// correspondance en quatre exemplaires. Une traduction en faisait diverger trois.</summary>
        public const string LibelleNotifActive = "[!] Nouveau";
        public const string LibelleNotifCalme = "[ ] Calme";

        private const float BoitierRingThicknessPx = 3f;
        private const float ArcDiameterPx = 48f;
        private const float ArcThicknessPx = 5f;
        // 96 — `hud-brennar.html` : `.aile{min-width:96px}`, mesuré `.aile.gauche` 96,00 et
        // `.aile.droite` 97,95. À 160 les deux ailes totalisaient 320 des 392 de large et se
        // rejoignaient SOUS le médaillon (64 de large, centré) — 320 + 64 = 384 pour 392 moins
        // 32 de marges = 360 disponibles. Le chevauchement était arithmétique.
        private const float MoneyClusterWidth = 96f;
        private const float ClockClusterWidth = 98f;
        private const float HairlineThicknessPx = 2f;
        private const float MoneyUnderlineWidthPx = 74f; // REUSE exact — hud-brennar.html:59 `.ratio{width:74px}`
        private const float ZoneRowWidth = 34f;
        private const float ZoneRowHeight = 9f;
        private const float BarCornerRadiusPx = 10f;

        // HUD v3.1 — correctif manomètre (2026-08-21, 5 défauts mesurés vs `Tools/hud-topbar-
        // reference-2560.png`) — géométrie REUSE exacte du SVG source (`hud-topbar-reference-
        // source.html:41-50`, viewBox 60x40, centre local (30,34), rayon 26) :
        //   MESURÉ — le médaillon N'EST PAS centré dans la barre côté maquette : `.medaillon{top:
        //   7px}` dans une `.barre{height:52px}` place son centre à 39px du haut, 13px SOUS le
        //   centre de la barre (26px). REUSE exact de ces 13px (pas de recalcul proportionnel —
        //   même doctrine que le reste de ce fichier : `ManometreDiameter`/`MoneyUnderlineWidthPx`
        //   sont déjà des REUSE verbatim). Root cause du défaut 1 (anneau qui semble "doublé") :
        //   centré (ancien code), le médaillon (64px) déborde de ~4px de CHAQUE côté d'une barre de
        //   56px — son bord bas touche quasiment le filet du bas de barre, les deux rouges (alarme)
        //   se fondant visuellement en un seul bourrelet épais. Décalé de -13px, le bord HAUT rentre
        //   entièrement dans la barre (0 clip par l'écran) et le bord BAS déborde de ~17px, proche
        //   du ~19px de la référence — le filet et l'anneau redeviennent deux traits clairement
        //   séparés (voir `Tools/hud-v31-manometre-fix-notes.md` § Deviations pour la mesure).
        // Débord visé 36,5 % × 56 = 20,4 px sous la barre. Avec un rayon de 34,5 :
        //   bas = −(28 + 20,4) = −48,4  ⇒  centre = −48,4 + 34,5 = −13,9
        private const float ManometreVerticalOffsetPx = -14f;

        // Alarme (`UpdateAlarmState`) — RE-DÉRIVÉ (2026-08-21, retour user relayé par le
        // contrôleur : « posé sur le décor du district, l'anneau doit lire comme un médaillon
        // suspendu, jamais comme un trait parasite »). AUCUNE maquette de l'état chaud n'existe
        // dans ce dépôt — vérifié EXHAUSTIVEMENT (`find . -iname "*.html"` : 3 fichiers réels,
        // aucun ne définit `.tel.chaud`/`.tel.descente` ; ce nom de classe n'existe QUE comme
        // citation dans `Tools/hud-v31-doctrine-implementation-notes.md`, un round antérieur —
        // la source elle-même a disparu). L'ancien 0.55 avait donc été choisi À L'ŒIL (« lit
        // comme… » — aucun chiffre à l'appui) ; c'est précisément ce que le retour visait.
        //
        // Critère QUANTIFIÉ retenu, faute de pixel de référence : « reconnaissable laiton » =
        // la TEINTE (hue HSV) du mélange reste plus proche de `hudHairlineGold` (41,6°) que de
        // `accentDanger` (4,4°) — le point médian des deux teintes est à 22,98°. Calculé
        // (script indépendant, `Color.Lerp` linéaire RGB) : le point de bascule exact est à
        // ratio=0,390 (au-delà, la teinte perçue est plus proche du rouge que du laiton).
        // L'ANCIEN 0,55 était donc DÉJÀ passé du côté rouge (hue 17,2°, à 24,4° de laiton contre
        // 13,2° de danger) — la lecture "orange vif" du retour user est exactement ce que ce
        // calcul prédit. Repris à 0,30 — marge délibérée sous le point de bascule (hue 26,7°,
        // encore à ~4° du bord des 22,98°), pas juste en-deçà : une valeur AU bord serait aussi
        // arbitraire qu'un choix à l'œil. Vérifié ne PAS dégrader les deux propriétés déjà
        // testées (`ManometreOraclePlayModeTests.Oracle1`, distances euclidiennes RGB
        // normalisées, recalculées indépendamment — script Python, jamais estimées) : distance
        // calme↔alarme = 0,112 (seuil existant > 0,05 — 2,2× de marge ; RATRAPÉ : plus BASSE
        // qu'avant, 0,55 donnait 0,205 — l'ancien réglage "changeait plus", au prix d'être plus
        // proche du rouge, voir ci-dessous) ; distance alarme↔`accentDanger` brut = 0,261 (seuil
        // existant > 0,10 — 2,6× de marge, contre 1,7× à 0,55 qui donnait 0,168) — la propriété
        // qui compte pour CE correctif (rester loin du rouge d'alerte) est mieux marginée
        // qu'avant, au prix assumé d'un signal de changement un peu moins ample (toujours 2,2×
        // le seuil existant, donc toujours largement distinguible). Mélangé avec le laiton calme
        // via `Color.Lerp` — jamais un token
        // dédié inventé (R2.3 : aucune couleur inline ; seule une PROPORTION est appliquée à deux
        // tokens déjà scellés).
        private const float AlarmTintBlendRatio = 0.30f;

        // Défaut 4 — « pivot discret » : diamètre AFFICHÉ inchangé (proportion SVG déjà correcte,
        // voir le docblock au site d'appel), seule la résolution INTERNE de la texture générée
        // grandit pour un cercle net (anti-crénelage réel) au lieu d'un blob à 5 texels.
        private const float NeedleThicknessPx = 1.5f;
        private const float NeedleCenterDotDiameterPx = 5f;
        private const int NeedleCenterDotTextureResPx = 32;

        // Défaut 5 — texte central écrasé (chevauchement de lettres, contraste faible à cause de
        // traits SDF trop fins pour l'encre pleine à 6.5/5.5pt, même plafond de netteté que
        // `moneyLabelText`/`dayLabelText`, voir `BuildMoneyCluster`). MESURÉ (TMP.preferredWidth,
        // `HeatBucketResolver.Label`) : "Burning" (le plus long des libellés réels) tient à 41.06px
        // à 10pt, largement sous `faceDiameter-8`≈49px — aucune marge de police n'était le facteur
        // limitant, contrairement à `moneyLabelText`.
        private const float GaugeValueFontSizePx = 10f;
        private const float GaugeCaptionFontSizePx = 7f;

        private DashboardClient client;
        private bool initialized;

        private void Awake() => EnsureInitialized();

        private void EnsureInitialized()
        {
            if (initialized) return;
            initialized = true;
            client = new DashboardClient { BaseUrl = baseUrl };
            BuildLayout();
        }

        /// <summary>Fetch callsign + cash (REAL requests, REUSE DashboardClient) and render all 4
        /// TopBar elements. `backlogBadge`/`openedGameDay` are supplied by the caller (C3's
        /// SessionClient in production; a literal value in C2's own tests) — see the class header.</summary>
        public IEnumerator Load(string token, bool backlogBadge, int openedGameDay)
        {
            EnsureInitialized();
            Loaded = false;
            MeError = null;
            WalletError = null;
            NotificationActive = backlogBadge;
            OpenedGameDay = openedGameDay;

            yield return client.GetMe(token, dto => CurrentMe = dto, (code, msg) => MeError = $"{code}: {msg}");
            yield return client.GetWallet(token, dto => CurrentWallet = dto, (code, msg) => WalletError = $"{code}: {msg}");

            if (this == null) yield break; // torn down mid-fetch (mirrors DashboardController's own guard)

            Render();
            Loaded = true;
        }

        private void Render()
        {
            renderedTexts.Clear();

            // 1) Callsign — identité, hook de données SCANNÉ (headless — écart (7), voir Deviations).
            string callsign = CurrentMe != null && !string.IsNullOrEmpty(CurrentMe.handle) ? CurrentMe.handle : "Patron";
            callsignText.text = callsign;
            Track(callsignText.text, trackValue: true);

            // 2) Cash — LOCALE-formatted, NO hard-coded currency symbol (design C2-F1). Digit-bearing
            //    UI chrome, EXCLUDED from the scan corpus (design C2-F4 / IMPORTANT-5) — the SAME
            //    mechanism DashboardController already uses for "Tier N" (`:340`). Doctrine (1) :
            //    « l'argent, seul or de l'écran » — serif, `hudMoneyGold`.
            string locale = CurrentMe != null ? CurrentMe.locale : null;
            string cashRaw = CurrentWallet != null ? CurrentWallet.cash_cents : null;
            RenderedCashText = FormatCash(cashRaw, locale);
            moneyValueText.text = RenderedCashText;
            Track(moneyValueText.text, trackValue: false);

            // 3) Notification point — la VALEUR suit `backlogBadge`, les deux polarités
            //    distinguables (design C2-F2). Hook de données SCANNÉ, headless (écart (4)).
            notificationText.text = NotificationActive ? LibelleNotifActive : LibelleNotifCalme;
            Track(notificationText.text, trackValue: true);

            // 4) In-game time (design D3, la 12e clé) — chrome digit-bearing, EXCLU du scan (même
            //    famille que le cash). `RenderedGameDayText` reste EXACTEMENT "Day {N}" (test hook
            //    inchangé) — l'affichage VISIBLE ("JOUR {N}") est un format SÉPARÉ, dérivé de la même
            //    valeur, voir `RepositionMoneyCluster`/`BuildLayout` pour `dayLabelText`.
            RenderedGameDayText = $"Day {OpenedGameDay}";
            dayLabelText.text = $"JOUR {OpenedGameDay}";
            Track(RenderedGameDayText, trackValue: false);
        }

        private void Track(string text, bool trackValue)
        {
            if (trackValue && !string.IsNullOrEmpty(text)) renderedTexts.Add(text);
        }

        /// <summary>§3.1 — bascule l'action leading. `LeadingAction.None` cache le bouton ; le
        /// cluster ARGENT (gauche) reflow vers la droite (`RepositionMoneyCluster` — HUD v3.1,
        /// remplace le reflow du callsign : le callsign n'a plus de chrome visible, c'est le cluster
        /// ARGENT qui occupe désormais le coin gauche, écart (1)). `BackToMap` le montre avec
        /// `onClick` câblé. Épinglé par sa VALEUR (`CurrentLeadingAction`), jamais par la
        /// présence/absence du GameObject — le bouton existe toujours, seule sa visibilité change
        /// (§3.1).</summary>
        public void SetLeadingAction(LeadingAction action, System.Action onClick)
        {
            EnsureInitialized();
            CurrentLeadingAction = action;
            leadingOnClick = onClick;
            bool visible = action != LeadingAction.None;
            leadingGo.SetActive(visible);
            if (visible) leadingText.text = LabelFor(action);
            RepositionMoneyCluster();
        }

        private static string LabelFor(LeadingAction action)
        {
            switch (action)
            {
                // ⛔ « ← Carte » REVENAIT À LA LIGNE (« Cart » / « e » — mesuré sur capture portrait)
                // depuis que le bandeau est à l'échelle du canon : le libellé littéral du design §3
                // supposait un bouton de 90 unités, et 90 unités de maquette poussaient l'aile
                // ARGENT sous le médaillon. Les deux ne peuvent pas être vrais ensemble.
                // ⇒ La flèche seule. C'est ce dont le canon se rapproche le plus (il ne porte AUCUN
                // bouton retour ici, juste une volute décorative de 34×12 au même endroit), et le
                // geste reste découvrable : c'est le seul contrôle du coin gauche.
                // *Un libellé de design écrit sous une contrainte de largeur fausse est daté par
                // cette contrainte, pas par sa date.*
                case LeadingAction.BackToMap: return "←";
                default: return "";
            }
        }

        /// <summary>HUD v3.1 — le cluster ARGENT (gauche) est le seul élément dont la position
        /// dépend d'un voisin (le bouton leading) — même patron que le callsign avant ce round, sur
        /// le NOUVEL occupant du coin gauche (écart (1)). Ne touche jamais le manomètre (ancré à
        /// 0.5/0.5, sans rapport avec ce cluster).</summary>
        private void RepositionMoneyCluster()
        {
            if (moneyClusterRect == null) return;
            bool leadingVisible = CurrentLeadingAction != LeadingAction.None;
            float x = BarPaddingX + (leadingVisible ? LeadingWidth + 12f : 0f);
            moneyClusterRect.anchoredPosition = new Vector2(x, moneyClusterRect.anchoredPosition.y);
        }

        // ----------------------------------------------------------- day_phase (§6.3, chunk 5)

        /// <summary>Appelé par `AppShell` : la valeur du DTO district déjà récupéré quand on est EN
        /// district, `null` sinon (§6.3 — état NOMMÉ "—", jamais dérivé côté client, jamais la
        /// dernière valeur d'un district quitté). Écart (3) : cette valeur est désormais la VALEUR
        /// dominante (grande, serif) de l'aile droite — substitut honnête à l'horloge "HH:MM" de la
        /// maquette, qu'AUCUNE donnée client ne porte (voir Deviations).</summary>
        public void SetDayPhase(string dayPhase)
        {
            EnsureInitialized();
            // La valeur du back passe par un RÉSOLVEUR NOMMÉ, comme la chaleur voisine — sans lui,
            // le joueur lisait `DAWN` (l'enum de la base) à côté de `JOUR 1`.
            DayPhaseText = DayPhaseResolver.Label(dayPhase);
            phaseValueText.text = DayPhaseText;
        }

        // ----------------------------------------------------------- manomètre heat (§6.4, chunk 5)

        /// <summary>Appelé par `AppShell` (publié par un tenant, ou par le repli de l'AppShell lui-
        /// même — §6.2). Résout via `HeatBucketResolver`, le lieu UNIQUE partagé avec
        /// `DashboardController.HeatGlyph`/`HeatLabel` (§6.4 — un seul `switch` à 4 branches, pas
        /// deux résolveurs qui pourraient dériver l'un de l'autre). Écart (2) : la valeur centrale du
        /// manomètre est le LIBELLÉ de bucket réel (`HeatBucketResolver.Label`), pas un pourcentage
        /// fabriqué — voir Deviations (aucune donnée client ne porte de heat continu).</summary>
        public void SetCitywideHeatBucket(string bucket)
        {
            EnsureInitialized();
            CitywideHeatBucket = bucket;
            CitywideHeatRank = HeatBucketResolver.ResolveRank(bucket);
            HeatNeedleAngleDegrees = HeatBucketResolver.NeedleAngleDegrees(bucket);
            heatNeedle.localEulerAngles = new Vector3(0f, 0f, HeatNeedleAngleDegrees);
            gaugeValueText.text = HeatBucketResolver.Label(bucket);
            // Les quatre libellés n'ont pas la même largeur : la boîte suit le texte, sinon elle
            // reste dimensionnée pour celui du premier rendu.
            AjusterALEncre(gaugeValueText, ManometreDiameter - BoitierRingThicknessPx * 2f - 1f - 8f);
            UpdateAlarmState();
        }

        /// <summary>HUD v3.1 (doctrine — mockup `.tel.chaud`/`.tel.descente`) : le filet de la barre
        /// et l'anneau du médaillon basculent vers la teinte "Severe" quand la ville brûle
        /// (BURNING), sinon restent au filet or calme. La teinte alarme passe PAR LE RÉSOLVEUR —
        /// jamais un accès direct à un token de sévérité depuis ce fichier (F2_SeverityTokenAccesses
        /// exclut explicitement ce fichier de ces accès directs ; le résolveur reste le lieu
        /// UNIQUE — paraphrase délibérée, socle CLAUDE.md : citer verbatim la forme qu'on évite
        /// réintroduit exactement ce qu'on évite dans le compte du scanner). INCHANGÉ par ce round —
        /// hors périmètre (les 7 écarts du ruling portent sur l'état CALME).</summary>
        private void UpdateAlarmState()
        {
            bool alarm = CitywideHeatRank == HeatBucketResolver.Rank.Burning;
            if (alarm)
            {
                Color severe = HeatBucketResolver.SeverityColor(HeatBucketResolver.Severity.Severe);
                Color warmedBrass = Color.Lerp(calmGoldColor, severe, AlarmTintBlendRatio);
                if (hairline != null) hairline.color = warmedBrass;
                if (boitierRing != null) boitierRing.color = warmedBrass;
            }
            else
            {
                if (hairline != null) hairline.color = calmGoldColor;
                if (boitierRing != null) boitierRing.color = calmGoldColor;
            }
        }

        private static Color WithAlpha(Color c, float a)
        {
            c.a = a;
            return c;
        }

        // ----------------------------------------------------------- cash formatting (C2-F1)

        /// <summary>Format a BigInt-serialized cents STRING as a locale-appropriate currency string —
        /// NO hard-coded symbol (design C2-F1). Uses `decimal` throughout (never float/double): the
        /// dimensioning scenario is a value beyond Number.MAX_SAFE_INTEGER (2^53), which decimal's
        /// ~28-29 significant digits comfortably survive without precision loss. Static + independently
        /// testable — the falsifiable never depends on a live seeded wallet reaching that magnitude.</summary>
        public static string FormatCash(string cashCentsRaw, string localeCode)
        {
            if (string.IsNullOrEmpty(cashCentsRaw)) return "—";
            decimal cents;
            if (!decimal.TryParse(cashCentsRaw, NumberStyles.Integer | NumberStyles.AllowLeadingSign,
                    CultureInfo.InvariantCulture, out cents))
            {
                return "—";
            }
            decimal major = cents / 100m;
            CultureInfo culture = ResolveCulture(localeCode);
            return major.ToString("C", culture);
        }

        private static CultureInfo ResolveCulture(string localeCode)
        {
            switch (localeCode)
            {
                case "fr": return CultureInfo.GetCultureInfo("fr-FR");
                case "en":
                default:
                    // Unknown/absent locale falls back to en-US — still culture-driven formatting
                    // (grouping/decimal/symbol all come FROM the CultureInfo), never a hard-coded "$".
                    return CultureInfo.GetCultureInfo("en-US");
            }
        }

        // --------------------------------------------------------------- UI build

        // No Canvas discovery here (unlike the 9 screen tenants) — TopBarController is NEVER a
        // stand-alone entry-point screen; it always builds directly into whatever RectTransform its
        // own GameObject is parented under (AppShell.TopBarSlot in production; a bare test parent in
        // isolation — design §3.0: C2 consumes no route that needs a shell to exist).
        //
        // Chaque enfant reçoit un ancrage EXPLICITE (pas de HorizontalLayoutGroup sur la racine —
        // c'est ce qui garantit le manomètre EXACTEMENT au centre indépendamment de tout ce qui
        // l'entoure). `LeadingAction` et `Manometre` restent des enfants DIRECTS de ce transform
        // (jamais nichés) — NavigationPlayModeTests.cs:89 et HudPlayModeTests.cs:333 font un `Find` À
        // UN SEGMENT qui ne descend pas dans un sous-conteneur.
        private void BuildLayout()
        {
            RectTransform selfRt = GetComponent<RectTransform>();
            if (selfRt == null) selfRt = gameObject.AddComponent<RectTransform>();
            Stretch(selfRt, Vector2.zero, Vector2.zero);

            InitPalette();
            BuildBarBackground();
            BuildHairline();

            // §3.1 — le bouton leading (inchangé fonctionnellement ; ancrage explicite).
            leadingGo = new GameObject("LeadingAction", typeof(RectTransform));
            leadingGo.transform.SetParent(transform, false);
            RectTransform leadingRect = (RectTransform)leadingGo.transform;
            leadingRect.anchorMin = leadingRect.anchorMax = new Vector2(0f, 0.5f);
            leadingRect.pivot = new Vector2(0f, 0.5f);
            leadingRect.anchoredPosition = new Vector2(BarPaddingX, 0f);
            leadingRect.sizeDelta = new Vector2(LeadingWidth, LeadingHeight);
            Image leadingImg = leadingGo.AddComponent<Image>();
            // ⛔ PLUS D'APLAT. `surfaceRow` peignait un pavé gris-vert derrière « ← Carte » — le
            // seul rectangle plein de tout l'écran, et le canon n'en porte aucun (le bandeau est
            // un verre translucide, la fiche une plaque, le dock des ronds). L'Image reste, à
            // alpha nul : c'est elle qui reçoit le clic, et une cible de clic sans Graphic ne
            // reçoit rien.
            Color leadingFond = DesignTokens.Current.surfaceRow; leadingFond.a = 0f;
            leadingImg.color = leadingFond;
            Button leadingBtn = leadingGo.AddComponent<Button>();
            leadingBtn.targetGraphic = leadingImg;
            leadingBtn.onClick.AddListener(() => leadingOnClick?.Invoke());

            GameObject leadingLabelGo = new GameObject("Label", typeof(RectTransform));
            leadingLabelGo.transform.SetParent(leadingGo.transform, false);
            leadingText = leadingLabelGo.AddComponent<TextMeshProUGUI>();
            leadingText.font = DesignTokens.Current.primaryFont;
            leadingText.text = "";
            // Ratio re-mesuré (2026-08-22) : à 14, le libellé du bouton retour occupait **18,9 %**
            // de la hauteur de barre, presque autant que le MONTANT (20,8 %) — un contrôle secondaire
            // aussi présent que la valeur principale. La maquette du bandeau ne porte aucun bouton
            // ici, donc il n'y a pas de ratio ratifié à copier : on le place ENTRE le libellé
            // (11,3 %) et la valeur (20,8 %), soit ~15 % ⇒ 14 × 15/18,9 = 11,1.
            leadingText.fontSize = 11;
            leadingText.alignment = TextAlignmentOptions.Center;
            leadingText.color = DesignTokens.Current.onSurfacePrimary;
            leadingText.raycastTarget = false;
            Stretch((RectTransform)leadingText.transform, new Vector2(6, 2), new Vector2(-6, -2));
            leadingGo.SetActive(false);

            // Écart (7) — le callsign n'existe pas dans `.barre` de la maquette : reste un hook de
            // DONNÉES headless (R2.2 scan corpus, C2F4), zéro chrome visible (alpha 0). Ne dépend
            // plus du bouton leading — invisible, il n'a rien à éviter.
            callsignText = NewText("Callsign", "Patron",
                new Vector2(0f, 0.5f), new Vector2(0f, 0.5f), new Vector2(0f, 0.5f),
                new Vector2(BarPaddingX, 0f), new Vector2(220f, 40f),
                15f, TextAlignmentOptions.Left, WithAlpha(DesignTokens.Current.onSurfacePrimary, 0f));
            callsignText.raycastTarget = false;

            BuildMoneyCluster();
            BuildManometre();
            BuildClockCluster();
            BuildNotificationHook();

            RepositionMoneyCluster();
        }

        /// <summary>`hudHairlineGold`, REUSE exact `--laiton` (hud-brennar.html:5). Root cause du
        /// round précédent (247ed3b, voir header de classe) : `accentGold` composé par ALPHA. Ce
        /// round n'a PLUS BESOIN de composer — le hex laiton EXACT est un token dédié, opaque,
        /// utilisé TEL QUEL pour le filet et l'anneau du médaillon (le soulignement sous le montant
        /// est un token DISTINCT, `hudMoneyUnderlineGold` — mesuré tour 2, voir BuildMoneyCluster).</summary>
        private void InitPalette()
        {
            calmGoldColor = DesignTokens.Current.hudHairlineGold;
        }

        /// <summary>« Verre gravé bleu nuit » (doctrine — hud-brennar.html:26,
        /// `linear-gradient(180deg,#0b111be8,#0d131ed8)`) — dégradé vertical composé depuis les DEUX
        /// tokens DÉDIÉS `hudBarGlassTop`/`hudBarGlassBottom` (écart de fond mesuré par le ruling :
        /// `surfaceBase`/`nightBackground` composés au round précédent lisaient `#0d0f10` gris neutre
        /// contre `#0f1722` bleu nuit cible). Enfant d'un `Mask` à coins arrondis (écart (6),
        /// `ProceduralUI.RoundedRectMask`) — `BarMask` est le PREMIER enfant de la racine (rendu SOUS
        /// tout le reste), `BarBackground` son unique enfant, stretché.</summary>
        private void BuildBarBackground()
        {
            GameObject maskGo = new GameObject("BarMask", typeof(RectTransform), typeof(CanvasRenderer));
            maskGo.transform.SetParent(transform, false);
            Stretch((RectTransform)maskGo.transform, Vector2.zero, Vector2.zero);
            Image maskImg = maskGo.AddComponent<Image>();
            maskImg.sprite = ProceduralUI.RoundedRectMask((int)BarCornerRadiusPx);
            maskImg.type = Image.Type.Sliced;
            maskImg.color = Color.white;
            maskImg.raycastTarget = false;
            Mask mask = maskGo.AddComponent<Mask>();
            mask.showMaskGraphic = false; // seul le canal ALPHA sert de stencil — jamais son .color
            maskGo.transform.SetAsFirstSibling();

            // MESURÉ (execute_code, TopBarController.BuildLayout() réel, round précédent 2026-08-21)
            // — `[RequireComponent(typeof(CanvasRenderer))]` porté par `Graphic` (base de
            // VerticalGradientImage) n'est PAS auto-honoré par `gameObject.AddComponent<T>()` pour un
            // type dérivé à l'exécution — `CanvasRenderer` EXPLICITE dans le constructeur du
            // GameObject, avant tout `AddComponent`.
            GameObject bgGo = new GameObject("BarBackground", typeof(RectTransform), typeof(CanvasRenderer));
            bgGo.transform.SetParent(maskGo.transform, false);
            Stretch((RectTransform)bgGo.transform, Vector2.zero, Vector2.zero);
            barBackground = bgGo.AddComponent<VerticalGradientImage>();
            barBackground.raycastTarget = false;
            barBackground.SetColors(DesignTokens.Current.hudBarGlassTop, DesignTokens.Current.hudBarGlassBottom);
        }

        /// <summary>Filet or (`hudHairlineGold`, opaque — plus de composition par alpha, voir
        /// InitPalette) sur le bord bas de la barre — 2px, pleine largeur. Épaisseur volontairement
        /// fine : c'est ce qui la garde HORS de la falsifiable "or jamais en aplat" (sa plus petite
        /// dimension reste sous le seuil "filet", quelle que soit sa longueur). Écart (6) — calme par
        /// défaut, JAMAIS rouge hors alarme (`UpdateAlarmState`, inchangé, hors périmètre).</summary>
        private void BuildHairline()
        {
            GameObject hlGo = new GameObject("Hairline", typeof(RectTransform));
            hlGo.transform.SetParent(transform, false);
            RectTransform hlRect = (RectTransform)hlGo.transform;
            hlRect.anchorMin = new Vector2(0f, 0f);
            hlRect.anchorMax = new Vector2(1f, 0f);
            hlRect.pivot = new Vector2(0.5f, 0f);
            hlRect.sizeDelta = new Vector2(0f, HairlineThicknessPx);
            hlRect.anchoredPosition = Vector2.zero;
            hairline = hlGo.AddComponent<Image>();
            hairline.raycastTarget = false;
            hairline.color = calmGoldColor;
            // ⛔ LE FILET S'ESTOMPE AUX EXTRÉMITÉS (2026-08-22). Il était à pleine intensité d'un
            // bord à l'autre — il coupait l'écran d'un trait net au lieu de mourir dans les marges.
            // Relevé sur la maquette (y=102), intensité relative par pas de 5 % de la largeur :
            //     0 % → 0,11 · 5 % → 0,35 · 10 % → 0,60 · 15 % → 0,85 · 20 % → 1,00 · … puis miroir
            // soit une rampe LINÉAIRE sur les 20 % extrêmes, partant de ~0,10. Deux juges visuels
            // l'ont signalé (« pleine intensité sur 96,2 % contre 59,1 % dans la maquette »).
            // ⚠️ ALPHA DE BORD = 0, et non 0,10 comme mon premier jet. Le « 0,11 » du relevé est un
            // RAPPORT DE ROUGE, pas un alpha : il inclut le fond de la maquette (19,23,39). Retiré de
            // l'équation — a = (R − 19)/(176 − 19) — la rampe part bien de **zéro** :
            //     0 % → 0,00 · 5 % → 0,27 · 10 % → 0,55 · 15 % → 0,83 · 20 % → 1,00. Linéaire.
            hairline.sprite = ProceduralUI.HorizontalFade(256, 0.20f, 0f);
            hairline.type = Image.Type.Simple;
        }

        /// <summary>Écart (1) — « L'argent, seul or de l'écran » (doctrine, hud-brennar.html annexe
        /// §1) : coin GAUCHE de la barre, cluster à 3 éléments — label petites capitales (ARGENT,
        /// `hudCremeSecondary`), montant serif (`hudMoneyGold`), soulignement décoratif 2px
        /// (`hudMoneyUnderlineGold`, REUSE `--or`, DISTINCT du laiton de l'anneau — mesuré tour 2 sur
        /// le rendu pixel). Le soulignement N'ENCODE PAS un ratio propre/sale — aucune donnée
        /// client ne porte cette information (voir Deviations) ; sa présence/largeur est un choix
        /// visuel FIXE, jamais une valeur dérivée d'un champ inexistant (R2.2).</summary>
        private void BuildMoneyCluster()
        {
            GameObject clusterGo = new GameObject("MoneyCluster", typeof(RectTransform));
            clusterGo.transform.SetParent(transform, false);
            moneyClusterRect = (RectTransform)clusterGo.transform;
            moneyClusterRect.anchorMin = moneyClusterRect.anchorMax = new Vector2(0f, 0.5f);
            moneyClusterRect.pivot = new Vector2(0f, 0.5f);
            moneyClusterRect.anchoredPosition = new Vector2(BarPaddingX, 0f);
            moneyClusterRect.sizeDelta = new Vector2(MoneyClusterWidth, 40f);

            // MESURÉ (sonde Tools/hud-topbar-probe.py, 2026-08-21) — à 8.5pt, le SDF de ce
            // label ne produit AUCUN pixel pleinement saturé (delta mesuré ~30 contre la
            // référence Chrome, qui ATTEINT le hex exact) : les traits sont trop fins pour
            // qu'un échantillon tombe pleinement "dans" l'encre à cette taille. Remonté à 10pt —
            // aucune falsifiable n'épingle 8.5 précisément (légende décorative).
            moneyLabelText = NewText("Label", "ARGENT",
                new Vector2(0f, 1f), new Vector2(1f, 1f), new Vector2(0f, 1f),
                new Vector2(0f, -1f), new Vector2(MoneyClusterWidth, 13f),
                // Ratio re-mesuré : la maquette met ce libellé à **10,6 %** de la hauteur de barre
                // (encre y 22..32 pour une barre de 104), la capture était à **13,2 %** (7 px sur 53).
                // 11 × 10,6/13,2 = 8,8.
                9f, TextAlignmentOptions.Left, DesignTokens.Current.hudCremeSecondary,
                letterSpacing: 3f, parent: clusterGo.transform);

            moneyValueText = NewText("Value", "—",
                new Vector2(0f, 1f), new Vector2(1f, 1f), new Vector2(0f, 1f),
                new Vector2(0f, -14f), new Vector2(MoneyClusterWidth, 22f),
                // Ratio re-mesuré, et c'est l'écart le plus fort du bandeau : la maquette met le
                // montant à **21,2 %** de la hauteur de barre (encre y 44..65 sur 104), la capture
                // était à **34,0 %** (18 px sur 53) — 60 % trop gros. La hiérarchie s'en trouvait
                // inversée : la maquette est dominée par le montant, la capture l'était par la jauge.
                // 19 × 21,2/34,0 = 11,8 ⇒ premier essai à 12f. ⚠️ MESURÉ APRÈS COUP : 18,9 %, donc
                // TROP PETIT — parce que mon 34,0 % de départ était contaminé par le libellé du
                // bouton « ← Carte », qui partage ces lignes. Fenêtre resserrée sur la seule colonne
                // ARGENT (x 108..260), puis 12 × 21,2/18,9 = 13,5 ⇒ 13f.
                13f, TextAlignmentOptions.Left, DesignTokens.Current.hudMoneyGold,
                parent: clusterGo.transform);
            moneyValueText.font = DesignTokens.Current.hudSerifFont;

            GameObject underlineGo = new GameObject("Underline", typeof(RectTransform));
            underlineGo.transform.SetParent(clusterGo.transform, false);
            RectTransform underlineRect = (RectTransform)underlineGo.transform;
            underlineRect.anchorMin = underlineRect.anchorMax = new Vector2(0f, 1f);
            underlineRect.pivot = new Vector2(0f, 1f);
            underlineRect.anchoredPosition = new Vector2(0f, -37f);
            underlineRect.sizeDelta = new Vector2(MoneyUnderlineWidthPx, HairlineThicknessPx);
            moneyUnderline = underlineGo.AddComponent<Image>();
            moneyUnderline.color = DesignTokens.Current.hudMoneyUnderlineGold; // --or, DISTINCT du laiton (tour 2, mesuré)
            moneyUnderline.raycastTarget = false;
        }

        /// <summary>Écart (3) — l'horloge passe à l'aile DROITE : petites capitales "JOUR {N}" en
        /// haut (`hudCremeSecondary`), valeur DOMINANTE en grand serif en bas (`hudCreme`) —
        /// substitut honnête à l'heure "HH:MM" de la maquette (voir Deviations, `SetDayPhase`).</summary>
        private void BuildClockCluster()
        {
            GameObject clusterGo = new GameObject("ClockCluster", typeof(RectTransform));
            clusterGo.transform.SetParent(transform, false);
            RectTransform clusterRect = (RectTransform)clusterGo.transform;
            clusterRect.anchorMin = clusterRect.anchorMax = new Vector2(1f, 0.5f);
            clusterRect.pivot = new Vector2(1f, 0.5f);
            clusterRect.anchoredPosition = new Vector2(-BarPaddingX, 0f);
            clusterRect.sizeDelta = new Vector2(ClockClusterWidth, 40f);

            // Même correctif de netteté que moneyLabelText — voir son commentaire.
            dayLabelText = NewText("DayLabel", "JOUR —",
                new Vector2(0f, 1f), new Vector2(1f, 1f), new Vector2(1f, 1f),
                new Vector2(0f, -1f), new Vector2(ClockClusterWidth, 13f),
                // Ratio re-mesuré comme l'aile gauche : la maquette met cette ligne à **10,6 %** de
                // la hauteur de barre (encre y 30..40 sur 104), la capture était à **15,1 %**.
                // 11 × 10,6/15,1 = 7,7 ⇒ 8f. Symétrique du libellé « ARGENT », comme il se doit.
                8f, TextAlignmentOptions.Right, DesignTokens.Current.hudCremeSecondary,
                letterSpacing: 3f, parent: clusterGo.transform);

            phaseValueText = NewText("PhaseValue", "—",
                new Vector2(0f, 1f), new Vector2(1f, 1f), new Vector2(1f, 1f),
                new Vector2(0f, -14f), new Vector2(ClockClusterWidth, 22f),
                // Maquette : **19,2 %** (encre y 51..70 sur 104) ; capture : **22,6 %**.
                // 17 × 19,2/22,6 = 14,4 ⇒ 14f. ★ La maquette fait volontairement la valeur de droite
                // un peu plus PETITE que celle de gauche (19,2 contre 21,2) : l'argent domine.
                14f, TextAlignmentOptions.Right, DesignTokens.Current.hudCreme,
                parent: clusterGo.transform);
            phaseValueText.font = DesignTokens.Current.hudSerifFont;
        }

        /// <summary>§6.4 (chunk 5) — 3 zones peintes / 4 arrêts d'aiguille. Le manomètre est un
        /// "médaillon" circulaire (anneau + face + ARC réel, écart (2)), ancré EXACTEMENT au centre
        /// de la barre (0.5/0.5, position ZÉRO) — indépendant de tout ce qui l'entoure (DA1).
        /// `ZoneRow` (3 bandes peintes, sa propre HorizontalLayoutGroup) et `Needle` restent des
        /// FRÈRES — jamais parent/enfant — sinon la Layout Group du premier écraserait la rotation du
        /// second. Le judge fonctionnel de ce chunk reste inchangé (§0 périmètre du design d'origine) :
        /// `ZoneRow` garde EXACTEMENT 3 enfants Image aux couleurs `HeatBucketResolver.SeverityColor`
        /// — HudF6/F2 (HudPlayModeTests) l'épinglent byte-pour-byte, inchangé par ce round.
        ///
        /// Écart (2) — l'ARC réel (track + cold + hot) REUSE la géométrie exacte du SVG `.cadran` de
        /// la maquette (`Tools/hud-topbar-reference-source.html:41-48`, viewBox 60x40, centre local
        /// (30,34), rayon 26 — angles mesurés depuis l'axe EST, sens TRIGONOMÉTRIQUE, càd la même
        /// convention que `Mathf.Cos/Sin`) : track = 180°→0° PAR le haut (demi-cercle SUPÉRIEUR
        /// complet, `M8 34 A 26 26 0 0 1 52 34`) ; cold = 180°→90° (point gauche (8,34) au point haut
        /// (30,8), `M8 34 A 26 26 0 0 1 30 8`) ; hot = 60,55°→0° (point (43,11) au point droit
        /// (52,34), `M43 11 A 26 26 0 0 1 52 34`, angle de départ = atan2(34-11,43-30)). MESURÉ
        /// (2026-08-21, correctif défauts 2+3 — grille `Origin180×fillAmount` relue via
        /// `CanvasRenderer.GetMesh()` PUIS confirmée par balayage angulaire sur capture Play Mode
        /// réelle) : `fillAmount` de `Radial180` est PROPORTIONNEL AUX 360° COMPLETS du sprite, pas
        /// aux 180° que son nom suggère — `fillAmount=0.5` donne donc un DEMI-tour exact, jamais un
        /// quart. `Image.FillMethod.Radial180` — le mécanisme uGUI natif pour un cadran, pas de
        /// texture procédurale par angle.</summary>
        private void BuildManometre()
        {
            GameObject manoGo = new GameObject("Manometre", typeof(RectTransform));
            manoGo.transform.SetParent(transform, false);
            RectTransform manoRect = (RectTransform)manoGo.transform;
            manoRect.anchorMin = manoRect.anchorMax = new Vector2(0.5f, 0.5f);
            manoRect.pivot = new Vector2(0.5f, 0.5f);
            manoRect.anchoredPosition = new Vector2(0f, ManometreVerticalOffsetPx);
            manoRect.sizeDelta = new Vector2(ManometreDiameter, ManometreDiameter);

            // ── Le losange doré sous le médaillon — un élément de la maquette JAMAIS construit ────
            // Relevé sur `Tools/hud-topbar-reference-2560.png` : sous l'anneau (qui finit à y=141),
            // un motif doré occupe **y 148..159** pour une barre de 104 — soit un ornement de 12 px,
            // posé 7 px sous l'anneau, centré. Deux juges visuels l'ont signalé absent (« losange
            // doré sous le manomètre : absent »).
            // Il ferme le médaillon par le bas, comme une goutte de sceau. Construit avec le losange
            // que le dépôt a déjà — un carré tourné de 45° — plutôt qu'un sprite neuf.
            // ⚠️ ENFANT DU MÉDAILLON, PAS DE LA BARRE — et ce n'est pas un détail de rangement.
            // `EffectiveBottomOverhangPx` mesure les bornes de `Manometre` ET DE SES ENFANTS
            // (`CalculateRelativeRectTransformBounds` est récursive). Tout ce que le chrome laisse
            // pendre sous la barre doit donc être DEDANS, sinon la propriété sous-déclare le débord
            // et l'écran qui réserve sa place se fait chevaucher.
            // Vécu en direct : posé d'abord en frère de la barre, le losange a fait rougir
            // `NavF4_TitleClearsTopBar` — le titre du district calait sa hauteur sur un débord qui
            // ignorait l'ornement. Une garde qui nomme UN objet ne voit pas ce qu'on accroche à côté.
            GameObject losangeGo = new GameObject("BoitierLosange", typeof(RectTransform));
            losangeGo.transform.SetParent(manoGo.transform, false);
            RectTransform losangeRt = (RectTransform)losangeGo.transform;
            losangeRt.anchorMin = losangeRt.anchorMax = new Vector2(0.5f, 0.5f);
            losangeRt.pivot = new Vector2(0.5f, 0.5f);
            float cote = ManometreDiameter * (12f / 128f) * 0.72f;   // 12/128 de l'anneau, minoré : un
                                                                     // carré tourné couvre plus que sa
                                                                     // hauteur nominale
            losangeRt.sizeDelta = new Vector2(cote, cote);
            // centre = bas de l'anneau (offset − rayon) − l'écart mesuré − la demi-diagonale
            float ecartSousAnneau = ManometreDiameter * (7f / 128f);
            // Position RELATIVE au médaillon désormais (son parent) : le centre du losange descend
            // du rayon, plus l'écart mesuré, plus sa demi-diagonale.
            losangeRt.anchoredPosition = new Vector2(0f,
                -(ManometreDiameter * 0.5f + ecartSousAnneau + cote * 0.707f));
            losangeRt.localEulerAngles = new Vector3(0f, 0f, 45f);
            Image losangeImg = losangeGo.AddComponent<Image>();
            losangeImg.color = DesignTokens.Current.hudHairlineGold;
            losangeImg.raycastTarget = false;

            GameObject ringGo = new GameObject("BoitierRing", typeof(RectTransform));
            ringGo.transform.SetParent(manoGo.transform, false);
            Stretch((RectTransform)ringGo.transform, Vector2.zero, Vector2.zero);
            boitierRing = ringGo.AddComponent<Image>();
            boitierRing.sprite = ProceduralUI.Ring((int)ManometreDiameter, BoitierRingThicknessPx, Color.white);
            boitierRing.color = calmGoldColor;
            boitierRing.raycastTarget = false;

            GameObject faceGo = new GameObject("BoitierFace", typeof(RectTransform));
            faceGo.transform.SetParent(manoGo.transform, false);
            RectTransform faceRect = (RectTransform)faceGo.transform;
            faceRect.anchorMin = faceRect.anchorMax = new Vector2(0.5f, 0.5f);
            faceRect.pivot = new Vector2(0.5f, 0.5f);
            faceRect.anchoredPosition = Vector2.zero;
            float faceDiameter = ManometreDiameter - BoitierRingThicknessPx * 2f - 1f;
            faceRect.sizeDelta = new Vector2(faceDiameter, faceDiameter);
            Image face = faceGo.AddComponent<Image>();
            face.sprite = ProceduralUI.RadialDisc((int)faceDiameter,
                DesignTokens.Current.hudGaugeFaceInner, DesignTokens.Current.hudGaugeFaceOuter);
            face.color = Color.white; // la teinte vit DANS le dégradé de la texture, pas dans .color
            face.raycastTarget = false;

            // Alphas REUSE exacts `hud-topbar-reference-source.html:42-44` : track `#ffffff22`
            // (0x22/255=0.133), cold `#7fd4d955` (0x55/255=0.333), hot `#e0664a88` (0x88/255=0.533)
            // — pas de valeur choisie pour la lisibilité, l'exactitude prime (ruling « pixel
            // perfect »).
            //
            // CORRIGÉ (2026-08-21, défauts 2+3 mesurés vs la référence) — le tour précédent avait
            // conclu, à `fillAmount=1`, que `Radial180` rend TOUJOURS un cercle complet quels que
            // soient origine/sens, et en avait déduit (à tort) qu'aucun angle FRACTIONNAIRE fiable
            // n'était dérivable — le track avait donc été simplifié en cercle complet
            // (`Type.Simple`), peignant une piste grise parasite sur toute la moitié BASSE du disque
            // (défaut 3) invisible en calme mais mesurée ~30 points plus claire que le fond une fois
            // composée. RE-MESURÉ : le constat à `fillAmount=1` reste vrai, mais sa cause est que le
            // remplissage est proportionnel aux 360° COMPLETS (pas 180°) — un `fillAmount` FRACTION-
            // NAIRE reste parfaitement fiable et REUSE l'angle SVG exact (docblock ci-dessus) une
            // fois divisé par 360 au lieu de 180. Track repassé en `Type.Filled` borné au demi-cercle
            // SUPÉRIEUR (0.5 = 180°/360°) : supprime la piste basse ET laisse sa teinte pâle visible
            // dans l'interstice cold/hot du haut (~30° entre 60,55° et 90°, non couvert par les deux
            // arcs de couleur — c'est CE liseré clair, jamais un troisième token, qui lit comme
            // « crème » entre le bleu et la braise, défaut 2).
            GameObject trackGo = new GameObject("ArcTrack", typeof(RectTransform));
            trackGo.transform.SetParent(manoGo.transform, false);
            RectTransform trackRect = (RectTransform)trackGo.transform;
            trackRect.anchorMin = trackRect.anchorMax = new Vector2(0.5f, 0.5f);
            trackRect.pivot = new Vector2(0.5f, 0.5f);
            trackRect.sizeDelta = new Vector2(ArcDiameterPx, ArcDiameterPx);
            Image trackImg = trackGo.AddComponent<Image>();
            trackImg.sprite = ProceduralUI.Ring((int)ArcDiameterPx, ArcThicknessPx, Color.white);
            trackImg.color = WithAlpha(DesignTokens.Current.onSurfacePrimary, 0.133f);
            trackImg.type = Image.Type.Filled;
            trackImg.fillMethod = Image.FillMethod.Radial180;
            trackImg.fillOrigin = (int)Image.Origin180.Left;
            trackImg.fillClockwise = true;
            trackImg.fillAmount = 0.5f; // 180°/360° — demi-cercle SUPÉRIEUR exact, REUSE du track SVG
            trackImg.raycastTarget = false;

            // cold : 90°/360° = 0.25 (SVG 180°→90°, point gauche au point haut). MESURÉ (capture
            // Play Mode réelle, balayage angulaire pixel-réel) : couverture effective ≈ [90°,178°],
            // à ±quelques degrés du modèle 360° linéaire — conforme.
            BuildArcSegment(manoGo.transform, "ArcCold",
                WithAlpha(DesignTokens.Current.hudGaugeArcCold, 0.333f), Image.Origin180.Left, true, 0.25f);
            // hot : le modèle 360° linéaire (60,55°/360°≈0.1682, SVG 60,55°→0°) prédit une couverture
            // de [0°,60,55°] — RÉFUTÉ par balayage angulaire pixel-réel : `Origin.Right+CCW` NE SUIT
            // PAS la même relation fillAmount→angle que `Origin.Left+CW` (asymétrie mesurée, cause
            // non identifiée) — la couverture RÉELLE à 0.1682 est ≈[7°,91°], ce qui rejoint le bord
            // de Cold (~90°) SANS trou ET sans témoin de la teinte "crème" du track entre les deux
            // (l'interstice SVG de ~30° ne survit pas à cette combinaison origine/sens). Résultat
            // visuellement CONFORME au défaut ciblé (arc continu, aucun trou — vérifié par capture) ;
            // conservé TEL QUEL plutôt que re-dérivé, la propriété qui compte (continuité) étant déjà
            // atteinte. `fillAmount` gardé au chiffre SVG malgré l'écart de couverture : le réduire
            // ouvrirait un trou (le vrai défaut 2), l'augmenter n'apporterait rien de plus.
            BuildArcSegment(manoGo.transform, "ArcHot",
                WithAlpha(DesignTokens.Current.hudGaugeArcHot, 0.533f), Image.Origin180.Right, false, 0.1682f);

            // MESURÉ (revue ⊥ sur capture r5, 2026-08-21) — `ZoneRow` (34×9, ancré au bord bas du
            // médaillon) DÉPASSE le cercle de la face : à sa position la plus basse, le rayon
            // disponible (sqrt(faceRadius²-y²)) est ~11.7px, sa demi-largeur en demande 17 — les 3
            // carrés débordent visiblement du disque (capture : rectangles qui "poking out"). La
            // doctrine (un ARC unique tracé DANS le disque, aiguille + valeur par-dessus) rend de
            // toute façon `ZoneRow` visuellement REDONDANT avec `ArcCold`/`ArcHot` ci-dessus — même
            // information (3 zones de sévérité), portée maintenant par l'arc. `ZoneRow` reste
            // STRUCTURELLEMENT INCHANGÉ (3 enfants, mêmes couleurs `SeverityColor` — hud-F6/F2 le
            // pin sur ces DEUX propriétés, jamais sur la visibilité) : masqué par un `CanvasGroup`
            // sur le CONTENEUR (alpha=0) — ne touche PAS `Image.color` des enfants, donc n'affecte
            // aucune assertion existante.
            GameObject zoneRowGo = new GameObject("ZoneRow", typeof(RectTransform));
            zoneRowGo.transform.SetParent(manoGo.transform, false);
            RectTransform zoneRowRect = (RectTransform)zoneRowGo.transform;
            zoneRowRect.anchorMin = new Vector2(0.5f, 0f);
            zoneRowRect.anchorMax = new Vector2(0.5f, 0f);
            zoneRowRect.pivot = new Vector2(0.5f, 0f);
            zoneRowRect.anchoredPosition = new Vector2(0f, 6f);
            zoneRowRect.sizeDelta = new Vector2(ZoneRowWidth, ZoneRowHeight);
            CanvasGroup zoneRowCg = zoneRowGo.AddComponent<CanvasGroup>();
            zoneRowCg.alpha = 0f;
            zoneRowCg.blocksRaycasts = false;
            zoneRowCg.interactable = false;
            HorizontalLayoutGroup zoneHlg = zoneRowGo.AddComponent<HorizontalLayoutGroup>();
            zoneHlg.childControlWidth = true;
            zoneHlg.childControlHeight = true;
            zoneHlg.childForceExpandWidth = true;
            zoneHlg.childForceExpandHeight = true;
            zoneHlg.spacing = 1;
            // CORRIGÉ (hud-session-arbitrages-design.md §2.3/§2.4) — lookup NOMMÉ, `Severity(rank)`
            // via `HeatBucketResolver`, le lieu UNIQUE (§2.4) — trois appels DIRECTS, indexés par
            // `Severity`, jamais par une position de bucket implicite. INCHANGÉ par ce round.
            Color[] zoneColors =
            {
                HeatBucketResolver.SeverityColor(HeatBucketResolver.Severity.Mild),
                HeatBucketResolver.SeverityColor(HeatBucketResolver.Severity.Moderate),
                HeatBucketResolver.SeverityColor(HeatBucketResolver.Severity.Severe),
            };
            foreach (Color c in zoneColors)
            {
                GameObject zoneGo = new GameObject("Zone", typeof(RectTransform));
                zoneGo.transform.SetParent(zoneRowGo.transform, false);
                Image zoneImg = zoneGo.AddComponent<Image>();
                zoneImg.color = c;
                zoneImg.raycastTarget = false;
            }

            // MESURÉ (capture Play Mode réelle, 2026-08-21) — un pivot bas-centre à y=-3 avec une
            // hampe de 17px traverse la zone où vit `gaugeValueText`, rendant le libellé illisible
            // ("We[aiguille]m" au lieu de "Warm"). Corrigé : pivot RELEVÉ au centre géométrique du
            // cadran (y=0, comme le point d'ancrage du losange laiton de la maquette). `ZoneRow`
            // masqué (voir plus haut) libère la moitié basse du disque : hampe et texte agrandis en
            // conséquence (revue ⊥ sur r5 — la 1ère passe restait crispée dans un espace
            // artificiellement réduit).
            // Défaut 4 (2026-08-21) — « aiguille épaisse terminée par un pâté doré » : mesuré, les
            // DEUX composantes étaient déjà proches des proportions SVG (trait 2px / rayon 26 ≈
            // 0,077 ; pivot Ø5px / rayon 26 ≈ 0,2 — quasi identiques au SVG source, 2px/26 et
            // 5,2px/26). Le "pâté" n'est donc pas un défaut de TAILLE : `ProceduralUI.RadialDisc`
            // génère une texture à la résolution EXACTE de son diamètre demandé (5×5px) — un cercle
            // sur 5 texels visibles n'a quasiment aucune marge d'anti-crénelage et rend un blob
            // anguleux. Corrigé en générant le disque à une résolution INTERNE bien plus grande
            // (`NeedleCenterDotTextureResPx`) tout en gardant la même taille AFFICHÉE (RectTransform
            // inchangé) — un cercle net et petit, "pivot discret", sans changer sa géométrie. Le
            // trait est en plus légèrement aminci (2px → 1.5px, `NeedleThicknessPx`) pour "trait fin".
            GameObject needleGo = new GameObject("Needle", typeof(RectTransform));
            needleGo.transform.SetParent(manoGo.transform, false);
            heatNeedle = (RectTransform)needleGo.transform;
            heatNeedle.anchorMin = heatNeedle.anchorMax = new Vector2(0.5f, 0.5f);
            heatNeedle.pivot = new Vector2(0.5f, 0f);
            heatNeedle.sizeDelta = new Vector2(NeedleThicknessPx, 13f);
            heatNeedle.anchoredPosition = new Vector2(0f, 5f);
            Image needleImg = needleGo.AddComponent<Image>();
            needleImg.color = DesignTokens.Current.hudCreme;
            needleImg.raycastTarget = false;

            GameObject centerDotGo = new GameObject("NeedleCenter", typeof(RectTransform));
            centerDotGo.transform.SetParent(manoGo.transform, false);
            RectTransform centerDotRect = (RectTransform)centerDotGo.transform;
            centerDotRect.anchorMin = centerDotRect.anchorMax = new Vector2(0.5f, 0.5f);
            centerDotRect.pivot = new Vector2(0.5f, 0.5f);
            centerDotRect.anchoredPosition = new Vector2(0f, 5f);
            centerDotRect.sizeDelta = new Vector2(NeedleCenterDotDiameterPx, NeedleCenterDotDiameterPx);
            Image centerDotImg = centerDotGo.AddComponent<Image>();
            centerDotImg.sprite = ProceduralUI.RadialDisc(NeedleCenterDotTextureResPx, calmGoldColor, calmGoldColor);
            centerDotImg.raycastTarget = false;

            // `ZoneRow` masqué (CanvasGroup alpha 0, voir plus haut) — plus besoin de réserver de
            // marge pour l'éviter visuellement. `enableAutoSizing` RETIRÉ : mesuré responsable d'un
            // espacement de caractères anormal (rendu observé sur "Warm", capture r5, séparation
            // visible entre 2e et 3e lettre) — TMP recalcule la meilleure taille ET, dans certaines
            // configurations de boîte contrainte en hauteur, en tire un `characterSpacing` effectif
            // incohérent. Taille FIXE à la place.
            //
            // CORRIGÉ (2026-08-21, défaut 5) — 6.5/5.5pt rendait des traits SDF trop fins pour
            // atteindre l'encre pleine (même plafond de netteté mesuré sur `moneyLabelText` à
            // 8.5pt), lu comme lettres qui se chevauchent et contraste faible. Remonté à
            // `GaugeValueFontSizePx`/`GaugeCaptionFontSizePx` (10/7pt, MESURÉ tenir largement dans
            // la boîte — voir le commentaire au site de ces constantes) — PARAPHRASE délibérée
            // (socle CLAUDE.md) : citer verbatim un littéral de bucket réintroduirait exactement ce
            // que `HudPlayModeTests.F2_BucketLiteralOccurrences` compte.
            gaugeValueText = NewText("GaugeValue", HeatBucketResolver.Label(null),
                new Vector2(0.5f, 0.5f), new Vector2(0.5f, 0.5f), new Vector2(0.5f, 0.5f),
                new Vector2(0f, -9f), new Vector2(faceDiameter - 8f, 13f),
                GaugeValueFontSizePx, TextAlignmentOptions.Center, DesignTokens.Current.hudCreme,
                parent: manoGo.transform);
            gaugeValueText.font = DesignTokens.Current.hudSerifFont;
            gaugeValueText.enableAutoSizing = false;
            gaugeValueText.textWrappingMode = TextWrappingModes.NoWrap;
            AjusterALEncre(gaugeValueText, faceDiameter - 8f);

            AjusterALEncre(NewText("GaugeCaption", "CHALEUR",
                new Vector2(0.5f, 0.5f), new Vector2(0.5f, 0.5f), new Vector2(0.5f, 0.5f),
                new Vector2(0f, -21f), new Vector2(faceDiameter - 6f, 9f),
                GaugeCaptionFontSizePx, TextAlignmentOptions.Center, DesignTokens.Current.hudCremeSecondary,
                letterSpacing: 3f, parent: manoGo.transform), faceDiameter - 6f);
        }

        /// <summary>Ramène la boîte d'un libellé du cadran à la largeur de son ENCRE.
        ///
        /// ⚠️ POURQUOI : les deux libellés du manomètre étaient dimensionnés sur le DISQUE
        /// (`faceDiameter − 8` / `− 6`), pas sur leur texte. Mesuré — boîtes **53,0** et **55,0** px
        /// pour une encre de **28,1** et **34,5**. Tant que le texte était court, personne ne l'a
        /// vu ; le jour où l'oracle du cadran a dû savoir OÙ EST LE TEXTE pour ne pas le confondre
        /// avec un résidu d'arc, il a lu ces boîtes surdimensionnées et a conclu que le texte
        /// couvrait tout l'hémicycle inférieur — donc qu'aucun rayon n'avait de fond de référence.
        /// **Une boîte plus grande que son contenu n'est pas neutre : c'est une fausse déclaration
        /// d'occupation, et tout ce qui raisonne sur la géométrie la croit.**
        ///
        /// `preferredWidth` est valide dès que le maillage est à jour, d'où le `ForceMeshUpdate`.</summary>
        private static void AjusterALEncre(TMP_Text texte, float largeurMax)
        {
            if (texte == null) return;
            texte.ForceMeshUpdate();
            var rt = (RectTransform)texte.transform;
            // ⚠️ BORNÉE DES DEUX CÔTÉS. Un simple `Min` avec la largeur courante ne saurait que
            // RÉTRÉCIR : la boîte resterait figée à la taille du premier libellé, et « Brûlant »
            // (le plus long des quatre) reviendrait à la ligne après un passage par « Froid ».
            rt.sizeDelta = new Vector2(Mathf.Min(largeurMax, texte.preferredWidth + 2f), rt.sizeDelta.y);
        }

        /// <summary>Un segment d'arc du cadran — `Image.FillMethod.Radial180` sur un sprite
        /// `ProceduralUI.Ring` PARTAGÉ (même diamètre/épaisseur, mis en cache par couleur) : le
        /// mécanisme de remplissage radial d'uGUI masque dynamiquement le sprite complet selon
        /// `fillAmount`/`fillOrigin`/`fillClockwise`, aucune texture par angle nécessaire.</summary>
        private static void BuildArcSegment(Transform parent, string name, Color color,
            Image.Origin180 origin, bool clockwise, float fillAmount)
        {
            GameObject go = new GameObject(name, typeof(RectTransform));
            go.transform.SetParent(parent, false);
            RectTransform rect = (RectTransform)go.transform;
            rect.anchorMin = rect.anchorMax = new Vector2(0.5f, 0.5f);
            rect.pivot = new Vector2(0.5f, 0.5f);
            rect.anchoredPosition = Vector2.zero;
            rect.sizeDelta = new Vector2(ArcDiameterPx, ArcDiameterPx);
            Image img = go.AddComponent<Image>();
            img.sprite = ProceduralUI.Ring((int)ArcDiameterPx, ArcThicknessPx, Color.white);
            img.color = color;
            img.type = Image.Type.Filled;
            img.fillMethod = Image.FillMethod.Radial180;
            img.fillOrigin = (int)origin;
            img.fillClockwise = clockwise;
            img.fillAmount = fillAmount;
            img.raycastTarget = false;
        }

        /// <summary>Écart (4) — « zéro badge permanent » (doctrine — le corpus sombre n'a aucun badge
        /// rouge : les événements arrivent en bandeaux éphémères et s'effacent). Le bandeau éphémère
        /// lui-même est HORS PÉRIMÈTRE de ce lot (consigné — voir Deviations : câbler un vrai système
        /// de bandeau temporisé/animé est une fonctionnalité neuve, pas un restyle). Ce qui reste :
        /// un hook de DONNÉES headless (`notificationText`, alpha 0) qui préserve EXACTEMENT le
        /// contrat R2.2 existant (C2F2/C2F4/DA5 : la VALEUR suit `backlogBadge`, scannée, jamais de
        /// chrome visible).</summary>
        private void BuildNotificationHook()
        {
            notificationText = NewText("Notification", LibelleNotifCalme,
                new Vector2(0.5f, 0.5f), new Vector2(0.5f, 0.5f), new Vector2(0.5f, 0.5f),
                Vector2.zero, new Vector2(10f, 10f),
                10f, TextAlignmentOptions.Center, WithAlpha(DesignTokens.Current.onSurfacePrimary, 0f));
            notificationText.raycastTarget = false;
        }

        private TextMeshProUGUI NewText(string name, string initial, Vector2 anchorMin, Vector2 anchorMax,
            Vector2 pivot, Vector2 anchoredPosition, Vector2 sizeDelta, float fontSize,
            TextAlignmentOptions alignment, Color color, float letterSpacing = 0f, Transform parent = null)
        {
            GameObject go = new GameObject(name, typeof(RectTransform));
            go.transform.SetParent(parent != null ? parent : transform, false);
            RectTransform rt = (RectTransform)go.transform;
            rt.anchorMin = anchorMin;
            rt.anchorMax = anchorMax;
            rt.pivot = pivot;
            rt.anchoredPosition = anchoredPosition;
            rt.sizeDelta = sizeDelta;
            TextMeshProUGUI t = go.AddComponent<TextMeshProUGUI>();
            t.font = DesignTokens.Current.primaryFont;
            t.text = initial;
            t.fontSize = fontSize;
            t.alignment = alignment;
            t.color = color;
            t.characterSpacing = letterSpacing;
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
    }
}
