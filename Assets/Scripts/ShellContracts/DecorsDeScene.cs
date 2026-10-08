using UnityEngine;

namespace MafiaCleanCity.Shell
{
    /// <summary>LE CATALOGUE du décor de scène — 26 entrées, recopiées du §4 de `Tools/decor-de-scene-2026-10-07/DESIGN.md`
    /// (mesures Chromium de `ecrans-brennar-6.html` : `mesure-support.json`, `mesure-bande-de-scene.json`, `INVENTAIRE.md`).
    /// C'est la SEULE table de valeurs du décor : retoucher une luminosité ou un arrêt = une ligne ICI, jamais un contrôleur.
    ///
    /// ⛔ TEINTES (§4.1, garde TD-612) : une couleur à d ≤ 4 d'un jeton est écrite PAR LE JETON (la teinte bouge d'au plus
    ///    3,62/255 : le prix de la règle) ; les autres sont des littéraux admis (`teintes.json`, règle « littéral »).
    ///    Le noir et le blanc des points de ㉘ sont les constantes nommées d'Unity.
    /// ⚠️ Les arrêts sont écrits tels que le CSS les écrit (premier = 0, dernier = 1 quand le CSS les omet) ; les couches
    ///    dans l'ordre CSS (la première est la plus HAUTE).
    /// ⚠️ Statuts : Posé 22 · DéjàLivré 3 (⑨ ⑩ ⑯ : zinc de `DecorAuComptoir`, non migrés) · NonMonté 1 (㉑).
    ///    Hors catalogue (décision f2) : ④ ⑥ ⑪ ㉕ ⑲ ① ② ⑬ ⑳.</summary>
    public static partial class DecorsDeScene
    {
        // ── jetons (§4.1) ─────────────────────────────────────────────────────────────────────────────────────
        private static readonly Teinte Or = Teinte.Jeton("hudMoneyUnderlineGold", t => t.hudMoneyUnderlineGold);       // #d9ab4e
        private static readonly Teinte Cyan = Teinte.Jeton("hudGaugeArcCold", t => t.hudGaugeArcCold);                 // #7fd4d9
        private static readonly Teinte Laiton = Teinte.Jeton("hudHairlineGold", t => t.hudHairlineGold);               // #b08d3e
        private static readonly Teinte MedaillonExt = Teinte.Jeton("lieutenantMedallionOuter", t => t.lieutenantMedallionOuter); // #111823
        private static readonly Teinte CadranExt = Teinte.Jeton("hudGaugeFaceOuter", t => t.hudGaugeFaceOuter);        // #0b1016 #0c1015
        private static readonly Teinte Base = Teinte.Jeton("surfaceBase", t => t.surfaceBase);                         // #0d0f10
        private static readonly Teinte Dialogue = Teinte.Jeton("mapDialogBg", t => t.mapDialogBg);                     // #0f141a #121519
        private static readonly Teinte Rangee = Teinte.Jeton("surfaceRow", t => t.surfaceRow);                         // #23272b
        private static readonly Teinte HorsDistrict = Teinte.Jeton("nightOutOfDistrictMuted", t => t.nightOutOfDistrictMuted); // #232a32
        private static readonly Teinte Sourdine = Teinte.Jeton("lieutenantMutedDeep", t => t.lieutenantMutedDeep);     // #1a2027 #1b1f24
        private static readonly Teinte TexteSombre = Teinte.Jeton("readableTextDark", t => t.readableTextDark);        // #1c1a17 #191a17
        private static readonly Teinte Carte = Teinte.Jeton("surfaceCard", t => t.surfaceCard);                        // #14181d #15181c

        private static readonly Teinte Transparent = Teinte.Transparent;

        private static Arret A(float pos, Teinte t) => Arret.En(pos, t);

        /// <summary>A (×7, §3.3) : deux halos (or en haut, cyan en bas) sur un 178° à 3 arrêts, le cerne, l'enseigne.</summary>
        private static SpecSupport SupportA() => new SpecSupport(new[]
            {
                SpecCouche.Radial(0.50f, 0.22f, 0.72f, 0.40f, A(0f, Or.A(0.15f)), A(0.66f, Transparent)),
                SpecCouche.Radial(0.50f, 0.96f, 0.90f, 0.60f, A(0f, Cyan.A(0.07f)), A(0.70f, Transparent)),
                SpecCouche.Lineaire(178f, A(0f, MedaillonExt), A(0.54f, CadranExt), A(1f, Base)),
            },
            cerne: new SpecFilet(Cotes.Tous, 1f, StyleFilet.Plein, Laiton, rayon: 3f, inset: 5f,
                                 lueur: Laiton.A(0x26 / 255f), flouLueurCss: 12f, lisere: CadranExt),
            enseigne: true);

        /// <summary>B : `linear-gradient(θ, c0, c1 p1, c2)`.</summary>
        private static SpecSupport Lin3(float angle, Teinte c0, float p1, Teinte c1, Teinte c2) =>
            new SpecSupport(new[] { SpecCouche.Lineaire(angle, A(0f, c0), A(p1, c1), A(1f, c2)) });

        private static SpecSupport Plein(Teinte c, float rayon = 0f) =>
            new SpecSupport(new[] { SpecCouche.Plein(c) }, rayon: new Vector4(rayon, rayon, rayon, rayon));

        private static SpecDecor District(string sym, string ecran, float lum, float bande, SpecSupport s,
                                          StatutDecor statut = StatutDecor.Pose) =>
            new SpecDecor(sym, ecran, statut, SceneDeFond.District, lum, bande, s);

        // ── les 26 entrées (§4) ───────────────────────────────────────────────────────────────────────────────

        public static readonly SpecDecor CityMap = new SpecDecor("③", "CityMapController", StatutDecor.Pose,
            SceneDeFond.District, 0.40f, 1f, null, voile: false);

        public static readonly SpecDecor DecisionDetail = new SpecDecor("⑤", "DecisionDetailScreenController", StatutDecor.Pose,
            SceneDeFond.Verge, 1f, 0.34f,
            new SpecSupport(new[]
                {
                    SpecCouche.Radial(0.50f, 0.30f, 0.90f, 0.60f,
                        A(0f, Teinte.Hex("#2f6e4c")), A(0.60f, Teinte.Hex("#17402d")), A(1f, Teinte.Hex("#0a2318"))),
                },
                rayon: new Vector4(26f, 26f, 0f, 0f)));

        public static readonly SpecDecor DailyReview = new SpecDecor("⑯", "DailyReviewScreenController", StatutDecor.DejaLivre,
            SceneDeFond.VergeJour, 1f, 0.19f, Plein(Teinte.Hex("#efe4c6"), 3f));

        public static readonly SpecDecor Reputation = District("㊲", "ReputationScreenController", 0.24f, 0.21f, SupportA());
        public static readonly SpecDecor Selling = District("㉟", "SellingScreenController", 0.24f, 0.21f, SupportA());

        /// <summary>La `vitre`, zone dominante (74,3 % de l'aire) ; racine sans fond.</summary>
        public static readonly SpecDecor Shop = District("㉓", "ShopScreenController", 0.24f, 0.21f,
            Lin3(168f, Teinte.Hex("#151b23"), 0.46f, Dialogue, CadranExt));

        private static SpecSupport Liege() => new SpecSupport(new[]
        {
            SpecCouche.RadialCercle(0.30f, 0.20f,
                A(0f, Teinte.Hex("#8a6a3a")), A(0.60f, Teinte.Hex("#6b4f28")), A(1f, Teinte.Hex("#513a1c"))),
        });

        public static readonly SpecDecor Inspection = District("⑮", "InspectionScreenController", 0.45f, 0.10f, Liege());
        public static readonly SpecDecor Precinct = District("⑰", "PrecinctScreenController", 0.45f, 0.10f, Liege());

        /// <summary>La tôle : `Points` pas 26, r 1,4 → 1,9, sur un 90° à 3 arrêts.</summary>
        public static readonly SpecDecor Compression = District("⑭", "CompressionScreenController", 0.62f, 0.35f,
            new SpecSupport(new[]
            {
                SpecCouche.Points(26f, 1.4f, 1.9f, Teinte.Hex("#4a5057"), Vector2.zero),
                SpecCouche.Lineaire(90f, A(0f, Teinte.Hex("#2a2e33")), A(0.50f, Rangee), A(1f, Teinte.Hex("#2a2e33"))),
            }));

        public static readonly SpecDecor Forensic = District("㊴", "ForensicScreenController", 0.24f, 0.21f, SupportA());
        public static readonly SpecDecor Journal = District("㊳", "JournalScreenController", 0.24f, 0.21f, SupportA());
        public static readonly SpecDecor Filiere = District("㊵", "FiliereScreenController", 0.24f, 0.21f, SupportA());

        public static readonly SpecDecor Profile = District("㉒", "ProfileScreenController", 0.24f, 0.21f,
            Lin3(158f, Teinte.Hex("#333c46"), 0.42f, HorsDistrict, Sourdine));

        public static readonly SpecDecor Horizon = District("㊱", "HorizonScreenController", 0.24f, 0.21f, SupportA());

        public static readonly SpecDecor Delegation = District("㉜", "DelegationScreenController", 0.18f, 0.21f,
            Lin3(180f, Teinte.Hex("#1d2229"), 0.58f, Teinte.Hex("#161a20"), Dialogue));

        public static readonly SpecDecor ChaineDAppro = District("㉚", "ChaineDApproScreenController", 0.20f, 0.21f,
            Lin3(180f, TexteSombre, 0.60f, Teinte.Hex("#151310"), Teinte.Hex("#111014")));

        /// <summary>La `planche`, zone dominante (48,9 %) ; racine sans fond.</summary>
        public static readonly SpecDecor Distribution = District("㉘", "DistributionScreenController", 0.24f, 0.21f,
            new SpecSupport(new[]
            {
                SpecCouche.Points(9f, 1.1f, 1.2f, Teinte.Nommee("noir", Color.black, 0.133f), Vector2.zero),
                SpecCouche.Points(13f, 0.9f, 1.0f, Teinte.Nommee("blanc", Color.white, 0.08f), new Vector2(4f, 6f)),
                SpecCouche.Lineaire(158f, A(0f, Teinte.Hex("#9a774b")), A(0.62f, Teinte.Hex("#7b5c37")), A(1f, Teinte.Hex("#654a2c"))),
                SpecCouche.Plein(Teinte.Hex("#8a6a42")),
            }));

        public static readonly SpecDecor Loi = District("㉛", "LoiScreenController", 0.18f, 0.21f,
            Lin3(180f, Sourdine, 0.58f, Carte, Teinte.Hex("#101317")));

        public static readonly SpecDecor Demolition = District("㉝", "DemolitionScreenController", 0.18f, 0.21f,
            Lin3(180f, Teinte.Hex("#20211d"), 0.58f, TexteSombre, Teinte.Hex("#141513")));

        public static readonly SpecDecor Carnet = District("㉞", "CarnetScreenController", 0.18f, 0.21f,
            Lin3(180f, Teinte.Hex("#1e1c19"), 0.58f, Teinte.Hex("#181614"), Teinte.Hex("#131211")));

        public static readonly SpecDecor Conflit = District("㉙", "ConflitScreenController", 0.20f, 0.21f,
            Lin3(180f, Teinte.Hex("#2a1e14"), 0.46f, Teinte.Hex("#1d1610"), Teinte.Hex("#141014")));

        public static readonly SpecDecor ExceptionQueue = new SpecDecor("⑨", "ExceptionQueueController", StatutDecor.DejaLivre,
            SceneDeFond.Bar, 1f, 0.29f, Plein(Teinte.Hex("#1d2124")));

        public static readonly SpecDecor ExceptionDetail = new SpecDecor("⑩", "ExceptionDetailController", StatutDecor.DejaLivre,
            SceneDeFond.Bar, 1f, 0.11f, Plein(Teinte.Hex("#1d2124")));

        public static readonly SpecDecor AutonomyInbox = District("㉔", "AutonomyInboxController", 0.45f, 0.10f,
            Lin3(180f, Teinte.Hex("#3a3f47"), 0.40f, Teinte.Hex("#22262b"), Carte));

        public static readonly SpecDecor Market = District("㉑", "Market (non monté)", 0.24f, 0.21f, SupportA(),
            StatutDecor.NonMonte);

        /// <summary>⑱ : le bureau, arrêt DUR à 18 px ; la racine est `MenuPlus`, insettée par `ShellChrome` (§5.1).</summary>
        public static readonly SpecDecor MenuPlus = new SpecDecor("⑱", "AppShell.MonterMenuPlus", StatutDecor.Pose,
            SceneDeFond.Bar, 0.55f, 0.12f,
            new SpecSupport(new[]
            {
                SpecCouche.Lineaire(180f, A(0f, Teinte.Hex("#5a2e16")), Arret.EnPxCss(18f, Teinte.Hex("#3a1c0e")),
                                    Arret.EnPxCss(18f, Teinte.Hex("#2b120c"))),
            }));

        /// <summary>Les BORDS D'ÉTAT (§3.4) : fond ET bord d'un bloc, posés ensemble par `Filets.Etat` (qui refuse un bord égal au
        /// fond — le défaut mesuré par le juge sur ㉛). Fonds : la CSS de la maquette ; bords : les recettes MESURÉES.</summary>
        public static class Etats
        {
            /// <summary>㉛ `.pl-choix` (cadre 68, « Lui trouver un avocat ») — correspondance donnée par CLIENT-1 le 08/10 :
            /// commis d'office = `.pris` (« EN PLACE »), un cabinet = neutre (« DISPONIBLE »), la filière = `.risque`.</summary>
            public static class Loi
            {
                public static readonly EtatDeBloc Pris = new EtatDeBloc(Teinte.Hex("#22301f"), Filets.Loi.PlChoixPris);
                public static readonly EtatDeBloc Neutre = new EtatDeBloc(Teinte.Hex("#1e242b"), Filets.Loi.PlChoix);
                public static readonly EtatDeBloc Risque = new EtatDeBloc(Teinte.Hex("#2e2114"), Filets.Loi.PlChoixRisque);
            }
        }

        /// <summary>Les 26 entrées, dans l'ordre du §4. Lu par D1 (périmètre = INDEX) et D2 (pose).</summary>
        public static readonly SpecDecor[] Tous =
        {
            CityMap, DecisionDetail, DailyReview, Reputation, Selling, Shop, Inspection, Precinct, Compression, Forensic,
            Journal, Filiere, Profile, Horizon, Delegation, ChaineDAppro, Distribution, Loi, Demolition, Carnet, Conflit,
            ExceptionQueue, ExceptionDetail, AutonomyInbox, Market, MenuPlus,
        };
    }
}
