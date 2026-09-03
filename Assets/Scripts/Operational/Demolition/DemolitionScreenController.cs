using System.Collections;
using UnityEngine;
using UnityEngine.UI;
using TMPro;
using MafiaCleanCity.Shell;
using MafiaCleanCity.Theme;

namespace MafiaCleanCity.Operational
{
    /// <summary>㉝ « Raser un site » — la fiche et la parcelle libérée.
    ///
    /// MAQUETTE : `ecrans-brennar-6.html` (300 px CSS), générateur `atelier/generateur-demol.py`,
    /// cadres `Tools/juge-visuel/v6/m-79..84.png`. Cinq états :
    ///   m-79 global — la friction et son voyant     m-82 parcelle — deux offres classées
    ///   m-80 fiche — les cinq mesures du site       m-83/84 fermée — l'offre est partie
    ///   m-81 démolir — la confirmation
    ///
    /// ⛔⛔ CE QUE LA MESURE A APPRIS ET QU'AUCUN DOCUMENT NE DISAIT (pile dev, 2026-09-03,
    /// deux comptes créés par signup, parcours entièrement joueur) :
    ///  (a) `decommission` exige `{confirm:true}` — sinon **422 DEMOLITION_CONFIRM_REQUIRED**.
    ///      Le back exigeait donc déjà le second écran que la planche dessine (m-81). Un écran à
    ///      un seul geste aurait compilé, semblé fini, et découvert le refus en jeu.
    ///  (b) Un bâtiment qui porte un lieutenant REFUSE — **409 LIEUTENANT_ASSIGNED**. Et
    ///      `lieutenant_ids` est DÉJÀ dans le corps que l'écran lit pour lister les bâtiments :
    ///      la précondition est donc affichable AVANT le geste, comme `mastery_bucket` sur ㉜.
    ///  (c) Une démolition réussie fait passer `structural_budget` à `{used:1, cap_reached:true}`.
    ///      ⇒ La thèse du chantier — ㉜, ㉝ et ㉞ partagent UN jeton — cesse d'être une
    ///        affirmation de document : c'est une mesure. Les trois lisent `JetonDeStructure`.
    ///
    /// ⛔⛔ ET LE MAILLON QUI MANQUE, MESURÉ : **aucune route ne liste les bâtiments d'un joueur.**
    /// `GET /v1/friction/nodes/{buildingId}` exige un UUID que rien ne sert. Le seul chemin joueur
    /// est `GET /v1/world/districts` (18) puis `GET /v1/city/district/{id}/interior` jusqu'à en
    /// trouver un qui porte des `buildings[]` — mesuré, il a fallu **16 districts sur 18** avant
    /// de tomber sur les quatre du kit de départ. Cet écran fait donc ce balayage, et il le DIT
    /// pendant qu'il le fait plutôt que de rester muet : dix-huit allers-retours réseau sans un
    /// mot ressemblent à un écran gelé. Dette TD-534.
    ///
    /// GÉOMÉTRIE — mêmes deux règles que partout : aucune valeur dérivée de `Screen.*` (tout passe
    /// par `EchelleMaquette.Px` contre `LargeurEcransBrennar6`), et aucune lecture de géométrie
    /// avant un `yield return null` après la construction.</summary>
    public class DemolitionScreenController : MonoBehaviour, IShellTenant
    {
        [Header("Backend")]
        [SerializeField] private string baseUrl = "http://localhost";

        // ═══ Contrat de locataire ════════════════════════════════════════════════════════════

        private Transform mountParent;

        /// <summary>⛔ CE POINT D'INJECTION CONSTRUIT, ET IL POSE AUSSI LA FRATRIE. `Awake()` court
        /// SYNCHRONEMENT dans `AddComponent<T>()`, donc avant tout parentage. Et l'hôte créé par
        /// le shell est un `Transform` NU : il n'devient `RectTransform` que si l'écran dessine
        /// dessus. On le demande donc explicitement — sinon le harnais de capture mesure un objet
        /// sans pixel, et un cast dur rend une `InvalidCastException` nue (mesuré sur ㉜).</summary>
        public void SetMountParent(Transform parent)
        {
            mountParent = parent;
            RectTransform rtHote = transform as RectTransform;
            if (rtHote == null) rtHote = gameObject.AddComponent<RectTransform>();
            rtHote.anchorMin = Vector2.zero;
            rtHote.anchorMax = Vector2.one;
            rtHote.offsetMin = Vector2.zero;
            rtHote.offsetMax = Vector2.zero;
            transform.SetAsLastSibling();
            EnsureInitialized();
        }

        private string token;
        public void SetToken(string t) => token = t;

        // ═══ Crochets de test ════════════════════════════════════════════════════════════════

        public GetFrictionStateResponseDto DerniereFriction { get; private set; }
        public GetFrictionNodesResponseDto DerniereFiche { get; private set; }
        public GetFrictionReplacementOptionsResponseDto DernieresOffres { get; private set; }
        public DistrictBuildingDto[] DerniersBatiments { get; private set; }
        public string DerniereErreur { get; private set; }
        public int RendusEffectues { get; private set; }
        public EtatEcran EtatCourant { get; private set; } = EtatEcran.Global;
        public bool JetonDepenseConnu { get; private set; }
        public bool JetonDepense { get; private set; }
        /// <summary>Combien de districts il a fallu ouvrir avant d'en trouver un qui porte des
        /// bâtiments. Crochet de mesure autant que d'affichage : sans lui, le coût réel du seul
        /// chemin joueur vers un `building_id` n'est pas une propriété observable.</summary>
        public int DistrictsBalayes { get; private set; }

        public enum EtatEcran { Global, Fiche, Demolir, Parcelle, Fermee }

        // ═══ État interne ════════════════════════════════════════════════════════════════════

        private RectTransform racinePleinEcran;
        private RectTransform corps;
        private RectTransform zoneCentrale;
        private RectTransform pied;
        private TextMeshProUGUI titreTete;
        private TextMeshProUGUI sousTitreTete;
        private DemolitionClient client;
        private bool initialise;

        private DistrictBuildingDto batimentVise;
        private readonly System.Collections.Generic.Dictionary<string, GetFrictionNodesResponseDto> fichesParSite
            = new System.Collections.Generic.Dictionary<string, GetFrictionNodesResponseDto>();
        private string nomDistrictVise;
        private string refusAffiche;
        private int blocLibere;

        private float Px(float css) =>
            EchelleMaquette.Px(css, racinePleinEcran, EchelleMaquette.LargeurEcransBrennar6);
        private int PxTrait(float css) =>
            EchelleMaquette.PxTrait(css, racinePleinEcran, EchelleMaquette.LargeurEcransBrennar6);

        // ── Géométrie de la maquette, en px CSS — lue dans `generateur-demol.py`.
        private const float CssMargeH        = 13f;
        private const float CssTetePadHaut   = 11f;
        private const float CssTetePadBas    = 9f;
        private const float CssTeteTitre     = 12f;
        private const float CssTeteSous      = 7f;
        private const float CssTeteEcart     = 4f;
        private const float CssBodyPadHaut   = 10f;
        private const float CssTitron        = 6.6f;
        private const float CssTitronBas     = 7f;
        private const float CssFichePadX     = 11f;   // .dm-fiche{padding:10px 11px 11px}
        private const float CssFichePadHaut  = 10f;
        private const float CssFichePadBas   = 11f;
        private const float CssFicheDos      = 5f;    // .dm-fiche::before{width:5px}
        private const float CssFicheRetrait  = 6f;    // .l{padding-left:6px} / h4{margin-left:6px}
        private const float CssFicheTitre    = 10f;   // .dm-fiche h4 — Serif 700
        private const float CssFicheEtiquette = 6.2f; // .dm-fiche h4 span
        private const float CssFicheLignePad = 4.5f;  // .dm-fiche .l{padding:4.5px 0}
        private const float CssFicheLibelle  = 6.5f;  // .l u
        private const float CssFicheValeur   = 8.4f;  // .l b
        private const float CssVerdictHaut   = 9f;    // .dm-verdict{margin:9px 0 0 6px}
        private const float CssVerdictPadY   = 7f;    // .dm-verdict{padding:7px 9px}
        private const float CssVerdictPadX   = 9f;
        private const float CssVerdictTitre  = 8f;
        private const float CssVerdictSous   = 6.4f;
        private const float CssGlobPadY      = 10f;   // .dm-glob{padding:10px 11px}
        private const float CssGlobPadX      = 11f;
        private const float CssGlobEcart     = 11f;   // .dm-glob{gap:11px}
        private const float CssGlobGros      = 15f;   // .dm-glob .gros — Serif 700
        private const float CssGlobTitre     = 9f;
        private const float CssGlobSous      = 6.5f;
        private const float CssPenalHaut     = 8f;    // .dm-penal{margin-top:8px}
        private const float CssPenalPadY     = 7f;
        private const float CssPenalPadX     = 9f;
        private const float CssPenal         = 7.2f;
        private const float CssParcPadY      = 9f;    // .dm-parcelle{padding:9px 10px}
        private const float CssParcPadX      = 10f;
        private const float CssParcTitre     = 9f;
        private const float CssParcSous      = 6.4f;
        private const float CssParcBas       = 9f;    // .dm-parcelle{margin-bottom:9px}
        private const float CssOffrePadY     = 8f;    // .dm-offre{padding:8px 10px}
        private const float CssOffrePadX     = 10f;
        private const float CssOffreEcart    = 9f;
        private const float CssOffreBas      = 5f;
        private const float CssOffreHaut     = 36f;   // même gabarit que les plaques de ㉜
        private const float CssRang          = 20f;   // .dm-offre .rg{width:20px;height:20px}
        private const float CssRangCorps     = 9f;
        private const float CssOffreTitre    = 9f;
        private const float CssOffreSous     = 6.4f;
        private const float CssTagCorps      = 6.6f;  // .dm-offre .tag
        private const float CssTagPadY       = 3f;
        private const float CssTagPadX       = 5f;
        private const float CssBasPadHaut    = 9f;
        private const float CssBasPadBas     = 15f;
        private const float CssDit           = 8.6f;
        private const float CssGesteHaut     = 9f;
        private const float CssGestePadY     = 9f;
        private const float CssGestePadX     = 11f;
        private const float CssGeste         = 9.5f;
        private const float CssGesteSous     = 6.5f;
        private const float CssRienPadY      = 8f;
        private const float CssRienPadX      = 10f;
        private const float CssRien          = 6.9f;
        private const float CssRayonPetit    = 2f;
        private const float CssRayonMoyen    = 3f;
        private const float CssFilet         = 1f;
        private const float CssFiletEpais    = 2f;

        private void Start()
        {
            // Le shell ajoute des enfants à `ContentSlot` APRÈS la fenêtre synchrone du montage :
            // `Start()` court à la frame suivante, premier instant où « être dernier » est stable.
            if (transform.parent != null) transform.SetAsLastSibling();
            EnsureInitialized();
            StartCoroutine(Amorcer());
        }

        /// <summary>⛔ L'ÉCRAN SE CHARGE LUI-MÊME AU MONTAGE. Le contrat `IShellTenant` ne porte que
        /// `SetMountParent` et `SetToken` : le shell n'appelle JAMAIS `Charger`. Sans cette amorce
        /// l'écran se construit et reste vide — charpente complète, données absentes. Mesuré sur
        /// l'écran voisin, et invisible à huit tours de juge : *un test qui déclenche lui-même ce
        /// qu'il vérifie ne prouve rien du déclencheur.*</summary>
        private IEnumerator Amorcer()
        {
            if (string.IsNullOrEmpty(token)) yield break;
            yield return Charger();
        }

        private void EnsureInitialized()
        {
            if (initialise) return;
            initialise = true;
            client = new DemolitionClient { BaseUrl = baseUrl };
            BuildLayout();
        }

        // ═══ Chargement ══════════════════════════════════════════════════════════════════════

        public IEnumerator Charger()
        {
            EnsureInitialized();
            DerniereErreur = null;
            refusAffiche = null;
            LireJetonDepuisLeShell();

            yield return client.GetFrictionState(token,
                d => DerniereFriction = d,
                r => DerniereErreur = r.message);

            // Les offres d'abord : si une parcelle est déjà libre, c'est ELLE que le joueur doit
            // voir en arrivant (m-82), pas l'état global. L'écran suit l'état du monde plutôt
            // qu'un ordre fixe.
            yield return client.GetFrictionReplacementOptions(token,
                d => DernieresOffres = d,
                r => Debug.LogWarning($"[㉝] offres indisponibles : {r.message}"));

            yield return TrouverLesBatiments();

            yield return null;   // la frame de création rend des rects non résolus

            if (DerniereFriction == null) { RendreEtatIndisponible(); yield break; }

            if (DernieresOffres != null && DernieresOffres.options != null && DernieresOffres.options.Length > 0)
            {
                blocLibere = DernieresOffres.options[0].freed_block_id;
                EtatCourant = EtatEcran.Parcelle;
            }
            Rendre();
        }

        /// <summary>⛔ LE BALAYAGE — TOUS LES DISTRICTS, ET C'EST UN CORRECTIF MESURÉ SUR L'IMAGE.
        /// Aucune route ne liste les bâtiments d'un joueur (TD-534) : on ouvre les districts un
        /// par un. La première version s'ARRÊTAIT au premier district non vide, pour économiser
        /// des allers-retours.
        /// ⇒ La capture a réfuté l'économie : l'écran annonçait « **17** endroits se gênent entre
        ///   eux » (`friction_node_count`, servi) juste au-dessus d'une liste d'**UN** site. Les
        ///   deux nombres décrivent le même monde et se contredisaient à trois centimètres l'un de
        ///   l'autre. *Un écran qui se contredit lui-même apprend au joueur à ne croire aucun de
        ///   ses deux chiffres* — et le second était faux par MON économie, pas par le back.
        /// ⇒ On balaie donc les 18, et on accumule. Le coût est réel (18 requêtes au montage) et
        ///   il est le prix du trou de surface, pas un choix de confort : c'est TD-534 qui le
        ///   paiera, en servant la liste une bonne fois.</summary>
        private IEnumerator TrouverLesBatiments()
        {
            DerniersBatiments = null;
            DistrictsBalayes = 0;
            nomDistrictVise = null;
            GetWorldDistrictsResponseDto monde = null;
            yield return client.GetWorldDistricts(token, d => monde = d,
                r => Debug.LogWarning($"[㉝] liste des districts indisponible : {r.message}"));
            if (monde == null || monde.districts == null) yield break;

            var trouves = new System.Collections.Generic.List<DistrictBuildingDto>();
            foreach (WorldDistrictDto d in monde.districts)
            {
                DistrictsBalayes++;
                GetCityDistrictInteriorResponseDto interieur = null;
                yield return client.GetCityDistrictInterior(token, d.id, x => interieur = x, _ => { });
                if (interieur == null || interieur.buildings == null || interieur.buildings.Length == 0) continue;
                trouves.AddRange(interieur.buildings);
                if (nomDistrictVise == null)
                    nomDistrictVise = !string.IsNullOrEmpty(interieur.name) ? interieur.name : d.name;
            }
            DerniersBatiments = trouves.Count > 0 ? trouves.ToArray() : null;
            if (DerniersBatiments == null) yield break;

            // ⛔ ET LES FICHES, PARCE QUE LE GESTE PROMET UN CLASSEMENT. « VOIR CE QUI COÛTE LE
            // PLUS » n'est pas un libellé décoratif : sans les fiches, l'écran ne SAIT pas lequel
            // coûte le plus, et le geste ouvrirait un site au hasard en prétendant le contraire.
            // Une fiche par site, borné par le nombre de bâtiments du joueur — et chaque rangée
            // porte alors son propre verdict, ce qui rend le classement VISIBLE plutôt que promis.
            fichesParSite.Clear();
            foreach (DistrictBuildingDto b in DerniersBatiments)
            {
                GetFrictionNodesResponseDto f = null;
                yield return client.GetFrictionNodes(token, b.building, x => f = x, _ => { });
                if (f != null) fichesParSite[b.building] = f;
            }
            batimentVise = PireSite();
        }

        /// <summary>Le site au plus mauvais rapport — `poor` d'abord, puis `fair`, etc. Un site
        /// dont la fiche n'a pas été lue n'est jamais « le pire » : on ne classe pas sur une
        /// absence de mesure.</summary>
        private DistrictBuildingDto PireSite()
        {
            DistrictBuildingDto pire = null;
            int pireRang = int.MaxValue;
            foreach (DistrictBuildingDto b in DerniersBatiments)
            {
                if (!fichesParSite.TryGetValue(b.building, out GetFrictionNodesResponseDto f)) continue;
                int rang = DemolitionResolvers.RangDeRapport(f.output_to_friction_ratio_bucket);
                if (rang < pireRang) { pireRang = rang; pire = b; }
            }
            // Aucun site mesuré : on vise le premier plutôt que rien, mais le geste dira ce qu'il
            // sait — il ne prétendra pas avoir classé.
            return pire ?? (DerniersBatiments.Length > 0 ? DerniersBatiments[0] : null);
        }

        private void LireJetonDepuisLeShell()
        {
            if (!JetonDeStructure.Connu) return;
            JetonDepenseConnu = true;
            JetonDepense = JetonDeStructure.PlafondAtteint;
        }

        /// <summary>Rend des corps FABRIQUÉS, sans réseau — réservé aux tests. Ne prouve jamais que
        /// le back émet ces corps, seulement ce que l'écran EN FAIT.</summary>
        public void RendrePourTest(GetFrictionStateResponseDto friction,
                                   GetFrictionNodesResponseDto fiche = null,
                                   GetFrictionReplacementOptionsResponseDto offres = null,
                                   DistrictBuildingDto[] batiments = null,
                                   bool? jetonDepense = null)
        {
            EnsureInitialized();
            DerniereFriction = friction;
            DerniereFiche = fiche;
            DernieresOffres = offres;
            DerniersBatiments = batiments;
            if (batiments != null && batiments.Length > 0) batimentVise = batiments[0];
            JetonDepenseConnu = jetonDepense.HasValue;
            JetonDepense = jetonDepense.GetValueOrDefault();
            Rendre();
        }

        public void AllerA(EtatEcran etat)
        {
            EtatCourant = etat;
            refusAffiche = null;
            Rendre();
        }

        // ═══ Rendu ═══════════════════════════════════════════════════════════════════════════

        private void Rendre()
        {
            if (DerniereFriction == null && EtatCourant != EtatEcran.Parcelle && EtatCourant != EtatEcran.Fermee)
            {
                RendreEtatIndisponible();
                return;
            }
            Vider(zoneCentrale);
            Vider(pied);

            switch (EtatCourant)
            {
                case EtatEcran.Global:   RendreGlobal(); break;
                case EtatEcran.Fiche:    RendreFiche(false); break;
                case EtatEcran.Demolir:  RendreFiche(true); break;
                case EtatEcran.Parcelle: RendreParcelle(false); break;
                case EtatEcran.Fermee:   RendreParcelle(true); break;
                default:
                    // Un état neuf doit être BRUYANT : un repli silencieux rendrait un écran vide
                    // qui ressemble à un écran qui charge.
                    throw new System.ArgumentOutOfRangeException(nameof(EtatCourant), EtatCourant,
                        "DemolitionScreenController : état d'écran non résolu.");
            }

            // ⛔ ICI, ET NULLE PART AVANT : placé plus haut, ce compteur dirait « rendu » d'un
            // écran dont les blocs ne sont pas construits, et la capture qui l'attend
            // photographierait le chrome du shell sur un cadre vide.
            RendusEffectues++;
        }

        // ── m-79 : l'état global ─────────────────────────────────────────────────────────────

        private void RendreGlobal()
        {
            EcrireTete("L'organisation frotte",
                       "Plus vous tenez de choses, plus elles se gênent entre elles.");

            int noeuds = DerniereFriction.friction_node_count;
            string bande = DerniereFriction.friction_bucket;

            GameObject bloc = NouveauUI("Global", zoneCentrale);
            AjouterPlaqueArrondie(bloc, DemolitionResolvers.BlocFond, DemolitionResolvers.BlocBord, CssRayonMoyen);
            HorizontalLayoutGroup h = bloc.AddComponent<HorizontalLayoutGroup>();
            h.padding = new RectOffset(PxTrait(CssGlobPadX), PxTrait(CssGlobPadX),
                                       PxTrait(CssGlobPadY), PxTrait(CssGlobPadY));
            h.spacing = Px(CssGlobEcart);
            h.childAlignment = TextAnchor.MiddleLeft;
            h.childControlWidth = true; h.childControlHeight = true;
            h.childForceExpandWidth = false; h.childForceExpandHeight = false;

            TextMeshProUGUI gros = NouveauTexte(bloc.transform, "Gros",
                noeuds.ToString(System.Globalization.CultureInfo.InvariantCulture), Px(CssGlobGros),
                DemolitionResolvers.CouleurDeFriction(bande), DesignTokens.Current.hudSerifFont);
            gros.fontStyle = FontStyles.Bold;
            LayoutElement leGros = gros.GetComponent<LayoutElement>();
            leGros.flexibleWidth = 0f;
            // Plancher, jamais un simple `preferred` : un `HorizontalLayoutGroup` serré rétrécit
            // vers `minWidth`, qui vaut zéro par défaut — le défaut d'ellipse payé sur ㉜.
            leGros.minWidth = Px(CssGlobGros * 1.4f);

            GameObject q = NouveauUI("Q", bloc.transform);
            VerticalLayoutGroup vq = q.AddComponent<VerticalLayoutGroup>();
            vq.spacing = Px(3f);
            vq.childControlWidth = true; vq.childControlHeight = true;
            vq.childForceExpandWidth = true; vq.childForceExpandHeight = false;
            q.AddComponent<LayoutElement>().flexibleWidth = 1f;
            NouveauTexte(q.transform, "Bande", DemolitionResolvers.PhraseDeFriction(bande),
                         Px(CssGlobTitre), DemolitionResolvers.TitreVif, DesignTokens.Current.hudSerifFont)
                .fontStyle = FontStyles.Bold;
            NouveauTexte(q.transform, "Sous",
                $"{noeuds} endroits se gênent entre eux. Chacun coûte un peu de ce que les autres rapportent.",
                Px(CssGlobSous), DemolitionResolvers.Muet, DesignTokens.Current.primaryFont);

            if (DerniereFriction.penalty_active)
            {
                // ⛔ Ni pourcentage ni seuil : le back n'en sert AUCUN (R2.2). « Tout produit
                // moins » est ce qu'on sait ; « −12 % » serait une précision inventée que
                // personne ne pourrait plus retirer.
                GameObject pen = NouveauUI("Penalite", zoneCentrale);
                AjouterPlaqueArrondie(pen, DemolitionResolvers.PenalFond, DemolitionResolvers.PenalBord, CssRayonPetit);
                VerticalLayoutGroup vp = pen.AddComponent<VerticalLayoutGroup>();
                vp.padding = new RectOffset(PxTrait(CssPenalPadX), PxTrait(CssPenalPadX),
                                            PxTrait(CssPenalPadY), PxTrait(CssPenalPadY));
                vp.childControlWidth = true; vp.childControlHeight = true;
                vp.childForceExpandWidth = true; vp.childForceExpandHeight = false;
                NouveauTexte(pen.transform, "Texte",
                    "<b>Tout produit moins en ce moment.</b> Tant que ça grince, chaque site rend en "
                    + "dessous de ce qu'il devrait. Ça s'arrête quand on allège.",
                    Px(CssPenal), DemolitionResolvers.PenalEncre, DesignTokens.Current.primaryFont);
            }

            ListerLesSites();

            EcrireDit(pied, "", "Dima :",
                      " « On a trop de choses au même endroit. Il va falloir en enlever une. »");
            // ⛔ LE GESTE ET LA LISTE DOIVENT DIRE LA MÊME CHOSE. La première capture les a pris
            // en flagrant délit : le bouton annonçait « aucun site trouvé », ÉTEINT, pendant que
            // la liste au-dessus en affichait un. `batimentVise` n'était renseigné que par les
            // chemins de test et d'ouverture de fiche — jamais par le chargement.
            // ⇒ Le repli tire désormais de la MÊME liste que celle qui est dessinée : les deux ne
            //   peuvent plus diverger, parce qu'ils n'ont plus deux sources.
            if (batimentVise == null && DerniersBatiments != null && DerniersBatiments.Length > 0)
                batimentVise = DerniersBatiments[0];
            bool possible = batimentVise != null;
            ConstruireGeste(pied, "VOIR CE QUI COÛTE LE PLUS",
                            possible
                                ? (fichesParSite.Count > 0 ? "le plus mauvais rapport" : "site par site")
                                : "aucun site trouvé",
                            !possible, false,
                            possible ? (System.Action)(() => StartCoroutine(OuvrirFiche(batimentVise))) : null);
            if (refusAffiche != null) ConstruireRien(pied, "Le serveur a refusé", " : " + refusAffiche);
        }

        /// <summary>La liste des sites, et le COÛT du seul chemin joueur qui y mène. Elle n'est pas
        /// dans la planche — la planche suppose qu'on sait déjà quel site regarder. Mesuré : rien
        /// ne le donne. Plutôt que d'inventer une route, l'écran montre ce qu'il a pu atteindre et
        /// dit combien ça a coûté.</summary>
        private void ListerLesSites()
        {
            GameObject titron = NouveauUI("TitronSites", zoneCentrale);
            VerticalLayoutGroup vt = titron.AddComponent<VerticalLayoutGroup>();
            vt.padding = new RectOffset(0, 0, PxTrait(CssTitronBas), PxTrait(CssTitronBas));
            vt.childControlWidth = true; vt.childControlHeight = true;
            vt.childForceExpandWidth = true; vt.childForceExpandHeight = false;
            // ⚠️ Le titron compte, il ne nomme plus un district : la liste est GLOBALE depuis le
            // balayage complet, et l'annoncer sous le nom du premier district trouvé aurait été
            // faux dès qu'un joueur possède des sites dans deux endroits.
            string entete = DerniersBatiments == null || DerniersBatiments.Length == 0
                ? "AUCUN SITE TROUVÉ"
                : (DerniersBatiments.Length == 1 ? "VOTRE SITE" : $"VOS {DerniersBatiments.Length} SITES");
            NouveauTexte(titron.transform, "Texte", entete, Px(CssTitron),
                         DemolitionResolvers.Muet, DesignTokens.Current.primaryFont)
                .characterSpacing = 22f;

            if (DerniersBatiments == null || DerniersBatiments.Length == 0)
            {
                ConstruireRien(zoneCentrale, "Aucune route ne liste vos bâtiments",
                    $" — on a ouvert {DistrictsBalayes} districts sans en trouver. C'est un trou de "
                    + "surface, pas une ville vide.");
                return;
            }

            foreach (DistrictBuildingDto b in DerniersBatiments) ConstruireLigneDeSite(b);
        }

        private void ConstruireLigneDeSite(DistrictBuildingDto b)
        {
            bool bloque = b.lieutenant_ids != null && b.lieutenant_ids.Length > 0;
            GameObject go = NouveauUI("Site_" + b.block_id, zoneCentrale);
            AjouterPlaqueArrondie(go, DemolitionResolvers.BlocFond, DemolitionResolvers.BlocBord, CssRayonPetit);
            LayoutElement le = go.AddComponent<LayoutElement>();
            le.preferredHeight = Px(CssOffreHaut); le.minHeight = Px(CssOffreHaut);

            HorizontalLayoutGroup h = go.AddComponent<HorizontalLayoutGroup>();
            h.padding = new RectOffset(PxTrait(CssOffrePadX), PxTrait(CssOffrePadX),
                                       PxTrait(CssOffrePadY), PxTrait(CssOffrePadY));
            h.spacing = Px(CssOffreEcart);
            h.childAlignment = TextAnchor.MiddleLeft;
            h.childControlWidth = true; h.childControlHeight = true;
            h.childForceExpandWidth = false; h.childForceExpandHeight = false;

            GameObject q = NouveauUI("Q", go.transform);
            VerticalLayoutGroup vq = q.AddComponent<VerticalLayoutGroup>();
            vq.spacing = Px(2f);
            vq.childAlignment = TextAnchor.MiddleLeft;
            vq.childControlWidth = true; vq.childControlHeight = true;
            vq.childForceExpandWidth = true; vq.childForceExpandHeight = false;
            q.AddComponent<LayoutElement>().flexibleWidth = 1f;
            NouveauTexte(q.transform, "Nom", NomDuSite(b), Px(CssOffreTitre),
                         DemolitionResolvers.TitreVif, DesignTokens.Current.hudSerifFont)
                .fontStyle = FontStyles.Bold;
            // Le type SEUL ne dit rien de ce qui intéresse le joueur ici. Quand la fiche a été
            // lue, la rangée porte son verdict — c'est ce qui rend le classement du geste visible
            // au lieu d'être promis.
            string sous = DemolitionResolvers.NomDeType(b.operational_type);
            if (fichesParSite.TryGetValue(b.building, out GetFrictionNodesResponseDto fs))
                sous += " · " + DemolitionResolvers.PhraseDeRapport(fs.output_to_friction_ratio_bucket);
            NouveauTexte(q.transform, "Sous", sous,
                         Px(CssOffreSous), DemolitionResolvers.Muet, DesignTokens.Current.primaryFont);

            // ⛔ LE REFUS SE DIT AVANT LE GESTE. `lieutenant_ids` est déjà dans ce corps, et le
            // serveur refusera la démolition avec 409 LIEUTENANT_ASSIGNED. Laisser le joueur
            // appuyer pour l'apprendre serait cacher une information qu'on a sous les yeux.
            TextMeshProUGUI etat = NouveauTexte(go.transform, "Etat",
                bloque ? "quelqu'un y travaille" : "libre", Px(CssOffreSous),
                bloque ? DemolitionResolvers.Or : DemolitionResolvers.Muet,
                DesignTokens.Current.primaryFont);
            etat.alignment = TextAlignmentOptions.Right;
            etat.GetComponent<LayoutElement>().flexibleWidth = 0f;

            RendreCliquable(go, () => StartCoroutine(OuvrirFiche(b)));
        }

        // ── m-80 / m-81 : la fiche, puis la confirmation ─────────────────────────────────────

        private void RendreFiche(bool confirmation)
        {
            if (confirmation)
                EcrireTete("Le raser", "La parcelle sera libre. Les voisins le sentiront.");
            else
                EcrireTete("Ce bâtiment vous coûte",
                           "Ce qu'il rapporte, ce qu'il gêne, et ce qu'il coûterait de le raser.");

            if (DerniereFiche == null)
            {
                ConstruireRien(zoneCentrale, "La fiche n'est pas lisible",
                    refusAffiche != null ? " : " + refusAffiche : " — le serveur n'a rien rendu.");
            }
            else
            {
                ConstruireFiche(zoneCentrale, DerniereFiche);
            }

            bool bloque = batimentVise != null && batimentVise.lieutenant_ids != null
                          && batimentVise.lieutenant_ids.Length > 0;

            if (!confirmation)
            {
                EcrireDit(pied, "", "Dima :",
                          " « Celui-là, on le garde par habitude. Il gêne les voisins et il ne rend "
                          + "presque rien. »");
                ConstruireGeste(pied, "LE RASER",
                                bloque ? "un lieutenant y travaille"
                                       : !JetonDisponible ? "plus de décision aujourd'hui"
                                       : "c'est votre décision du jour",
                                bloque || !JetonDisponible, true,
                                (bloque || !JetonDisponible) ? null : (System.Action)(() => AllerA(EtatEcran.Demolir)));
                if (bloque)
                    ConstruireRien(pied, "Le serveur refusera",
                        " tant qu'un lieutenant est affecté ici — il faut le réaffecter d'abord. "
                        + "C'est écrit avant le geste plutôt que découvert après.");
            }
            else if (JetonDisponible)
            {
                EcrireDit(pied, "Une fois rasé, ", "on ne le remet pas",
                          ". La parcelle restera libre le temps de choisir quoi y mettre.");
                ConstruireGeste(pied, "CONFIRMER — LE RASER", "et libérer la parcelle", false, true,
                                () => StartCoroutine(Raser()));
            }
            else
            {
                EcrireDit(pied, "Vous avez déjà tranché ", "une chose de structure", " aujourd'hui.");
                ConstruireGeste(pied, "CONFIRMER — LE RASER", "plus de décision aujourd'hui", true, true, null);
                ConstruireRien(pied, "Raser un site compte comme la décision de structure du jour",
                    ", au même titre que confier ou reprendre une charge. Ce sera pour demain.");
            }

            if (refusAffiche != null) ConstruireRien(pied, "Le serveur a refusé", " : " + refusAffiche);
        }

        /// <summary>`.dm-fiche` — la fiche cartonnée : crème sur fond sombre, dos brun à gauche,
        /// cinq lignes pointillées, et le verdict rouge quand le rapport est `poor`.</summary>
        private void ConstruireFiche(Transform parent, GetFrictionNodesResponseDto f)
        {
            GameObject go = NouveauUI("Fiche", parent);
            Image fond = AjouterImage(go);
            fond.sprite = ProceduralUI.RoundedRectMask(PxTrait(CssRayonPetit));
            fond.type = Image.Type.Sliced;
            fond.color = DemolitionResolvers.FicheCarton;
            fond.raycastTarget = false;

            // `.dm-fiche::before` — le dos de la fiche, hors du flux.
            GameObject dos = NouveauUI("Dos", go.transform);
            dos.AddComponent<LayoutElement>().ignoreLayout = true;
            RectTransform rtDos = (RectTransform)dos.transform;
            rtDos.anchorMin = new Vector2(0f, 0f); rtDos.anchorMax = new Vector2(0f, 1f);
            rtDos.pivot = new Vector2(0f, 0.5f);
            rtDos.sizeDelta = new Vector2(Px(CssFicheDos), 0f);
            rtDos.anchoredPosition = Vector2.zero;
            AjouterFond(dos, DemolitionResolvers.FicheDos);

            VerticalLayoutGroup v = go.AddComponent<VerticalLayoutGroup>();
            v.padding = new RectOffset(PxTrait(CssFichePadX + CssFicheRetrait), PxTrait(CssFichePadX),
                                       PxTrait(CssFichePadHaut), PxTrait(CssFichePadBas));
            v.spacing = 0f;
            v.childControlWidth = true; v.childControlHeight = true;
            v.childForceExpandWidth = true; v.childForceExpandHeight = false;

            GameObject h4 = NouveauUI("Entete", go.transform);
            HorizontalLayoutGroup hh = h4.AddComponent<HorizontalLayoutGroup>();
            hh.spacing = Px(8f);
            hh.childAlignment = TextAnchor.LowerLeft;
            hh.childControlWidth = true; hh.childControlHeight = true;
            hh.childForceExpandWidth = false; hh.childForceExpandHeight = false;
            TextMeshProUGUI titre = NouveauTexte(h4.transform, "Nom",
                batimentVise != null ? NomDuSite(batimentVise) : "Ce site", Px(CssFicheTitre),
                DemolitionResolvers.FicheEncre, DesignTokens.Current.hudSerifFont);
            titre.fontStyle = FontStyles.Bold;
            titre.GetComponent<LayoutElement>().flexibleWidth = 1f;
            TextMeshProUGUI etiq = NouveauTexte(h4.transform, "Etiquette", "FICHE DU SITE",
                Px(CssFicheEtiquette), DemolitionResolvers.FicheMuet, DesignTokens.Current.primaryFont);
            etiq.characterSpacing = 18f;   // .h4 span{letter-spacing:1.1px} sur 6,2px
            etiq.alignment = TextAlignmentOptions.Right;
            etiq.GetComponent<LayoutElement>().flexibleWidth = 0f;
            Espaceur(go.transform, 8f);    // h4{margin-bottom:8px}

            LigneDeFiche(go.transform, "CE QU'IL RAPPORTE",
                         DemolitionResolvers.PhraseDeRendement(f.output_value_bucket),
                         DemolitionResolvers.CouleurDeRendement(f.output_value_bucket), false);
            LigneDeFiche(go.transform, "CE QU'IL GÊNE AUTOUR",
                         DemolitionResolvers.PhraseDeFriction(f.friction_load_bucket),
                         DemolitionResolvers.CouleurDeFriction(f.friction_load_bucket), true);
            LigneDeFiche(go.transform, "AU TOTAL",
                         DemolitionResolvers.PhraseDeRapport(f.output_to_friction_ratio_bucket),
                         DemolitionResolvers.CouleurDeRapport(f.output_to_friction_ratio_bucket), true);
            LigneDeFiche(go.transform, "LE RASER COÛTERAIT",
                         DemolitionResolvers.PhraseDeCout(f.decommission_cost_bucket),
                         DemolitionResolvers.CouleurDeCout(f.decommission_cost_bucket), true);
            LigneDeFiche(go.transform, "VOISINS TOUCHÉS",
                         f.neighbor_count.ToString(System.Globalization.CultureInfo.InvariantCulture),
                         DemolitionResolvers.FicheEncre, true);

            if (f.output_to_friction_ratio_bucket == "poor")
            {
                GameObject verdict = NouveauUI("Verdict", go.transform);
                Image vb = AjouterImage(verdict);
                vb.sprite = ProceduralUI.RoundedRectMask(PxTrait(CssRayonPetit));
                vb.type = Image.Type.Sliced;
                vb.color = DemolitionResolvers.VerdictFond;
                vb.raycastTarget = false;
                VerticalLayoutGroup vv = verdict.AddComponent<VerticalLayoutGroup>();
                vv.padding = new RectOffset(PxTrait(CssVerdictPadX), PxTrait(CssVerdictPadX),
                                            PxTrait(CssVerdictPadY), PxTrait(CssVerdictPadY));
                vv.spacing = Px(3f);
                vv.childControlWidth = true; vv.childControlHeight = true;
                vv.childForceExpandWidth = true; vv.childForceExpandHeight = false;
                verdict.GetComponent<LayoutElement>();
                NouveauTexte(verdict.transform, "Titre", "Il vous coûte plus qu'il ne vous rapporte.",
                             Px(CssVerdictTitre), DemolitionResolvers.VerdictEncre,
                             DesignTokens.Current.primaryFont).fontStyle = FontStyles.Bold;
                NouveauTexte(verdict.transform, "Sous", "Le garder, c'est payer pour gêner les autres.",
                             Px(CssVerdictSous), DemolitionResolvers.VerdictSous,
                             DesignTokens.Current.primaryFont);
            }
        }

        private void LigneDeFiche(Transform parent, string libelle, string valeur, Color couleur, bool filet)
        {
            GameObject go = NouveauUI("L_" + libelle, parent);
            if (filet) AjouterFiletHaut(go, DemolitionResolvers.FicheFilet, CssFilet);
            HorizontalLayoutGroup h = go.AddComponent<HorizontalLayoutGroup>();
            h.padding = new RectOffset(0, 0, PxTrait(CssFicheLignePad), PxTrait(CssFicheLignePad));
            h.spacing = Px(9f);
            h.childAlignment = TextAnchor.MiddleLeft;
            h.childControlWidth = true; h.childControlHeight = true;
            h.childForceExpandWidth = false; h.childForceExpandHeight = false;
            TextMeshProUGUI u = NouveauTexte(go.transform, "Libelle", libelle, Px(CssFicheLibelle),
                                             DemolitionResolvers.FicheMuet, DesignTokens.Current.primaryFont);
            u.characterSpacing = 14f;   // .l u{letter-spacing:.9px} sur 6,5px
            u.GetComponent<LayoutElement>().flexibleWidth = 1f;
            TextMeshProUGUI b = NouveauTexte(go.transform, "Valeur", valeur, Px(CssFicheValeur),
                                             couleur, DesignTokens.Current.primaryFont);
            b.fontStyle = FontStyles.Bold;
            b.alignment = TextAlignmentOptions.Right;
            b.GetComponent<LayoutElement>().flexibleWidth = 0f;
        }

        // ── m-82 / m-84 : la parcelle libérée et ses deux offres ─────────────────────────────

        private void RendreParcelle(bool fermee)
        {
            if (fermee)
                EcrireTete("Cette offre est fermée", "On a trop attendu, ou quelqu'un l'a prise avant.");
            else
                EcrireTete("La parcelle est libre",
                           "Deux offres, classées. Elles ne restent pas ouvertes longtemps.");

            GameObject parc = NouveauUI("Parcelle", zoneCentrale);
            Image bord = AjouterImage(parc);
            // ⚠️ LE PAS DES TIRETS N'EST PAS MESURÉ, ET JE LE DIS PLUTÔT QUE DE L'AFFIRMER.
            // La maquette écrit `border:2px dashed` : la longueur du tiret et du vide sont alors
            // choisies par le NAVIGATEUR, pas par la CSS — aucune valeur à recopier. J'ai pris
            // trait = vide = 3× l'épaisseur, la convention la plus courante, sans l'avoir relevée
            // sur le PNG. C'est le seul nombre de cet écran qui ne vient pas d'une mesure ; il est
            // cosmétique (le bord reste pointillé quoi qu'il arrive) et il est consigné comme tel
            // plutôt que noyé parmi les constantes justes.
            bord.sprite = ProceduralUI.RoundedRectDashedOutline(
                PxTrait(CssRayonMoyen), PxTrait(CssFiletEpais),
                PxTrait(CssFiletEpais * 3f), PxTrait(CssFiletEpais * 3f), Color.white);
            bord.type = Image.Type.Sliced;
            bord.color = DemolitionResolvers.ParcelleBord;
            bord.raycastTarget = false;
            VerticalLayoutGroup vp = parc.AddComponent<VerticalLayoutGroup>();
            vp.padding = new RectOffset(PxTrait(CssParcPadX), PxTrait(CssParcPadX),
                                        PxTrait(CssParcPadY), PxTrait(CssParcPadY));
            vp.spacing = Px(3f);
            vp.childAlignment = TextAnchor.MiddleCenter;
            vp.childControlWidth = true; vp.childControlHeight = true;
            vp.childForceExpandWidth = true; vp.childForceExpandHeight = false;
            TextMeshProUGUI pb = NouveauTexte(parc.transform, "Titre",
                blocLibere > 0 ? $"Parcelle libre — bloc {blocLibere}" : "Parcelle libre",
                Px(CssParcTitre), DemolitionResolvers.ParcelleEncre, DesignTokens.Current.hudSerifFont);
            pb.fontStyle = FontStyles.Bold; pb.alignment = TextAlignmentOptions.Center;
            TextMeshProUGUI pi = NouveauTexte(parc.transform, "Sous",
                "ce qu'il y avait là n'y est plus.", Px(CssParcSous),
                DemolitionResolvers.Muet, DesignTokens.Current.primaryFont);
            pi.alignment = TextAlignmentOptions.Center;
            Espaceur(zoneCentrale, CssParcBas - CssOffreBas);

            GameObject titron = NouveauUI("Titron", zoneCentrale);
            VerticalLayoutGroup vt = titron.AddComponent<VerticalLayoutGroup>();
            vt.padding = new RectOffset(0, 0, 0, PxTrait(CssTitronBas));
            vt.childControlWidth = true; vt.childControlHeight = true;
            vt.childForceExpandWidth = true; vt.childForceExpandHeight = false;
            NouveauTexte(titron.transform, "Texte", "CE QU'ON PEUT Y METTRE", Px(CssTitron),
                         DemolitionResolvers.Muet, DesignTokens.Current.primaryFont)
                .characterSpacing = 22f;

            ReplacementOptionDto[] offres = DernieresOffres != null ? DernieresOffres.options : null;
            if (offres == null || offres.Length == 0)
            {
                ConstruireRien(zoneCentrale, "Plus aucune offre",
                    " — elles se ferment (prises, expirées, retirées). Ce n'est pas une liste qui attend.");
            }
            else
            {
                foreach (ReplacementOptionDto o in offres) ConstruireOffre(o, fermee && o.rank == 1);
            }

            if (fermee)
            {
                EcrireDit(pied, "", "Dima :", " « Trop tard pour celle-là. »");
                ReplacementOptionDto autre = PremiereOffreOuverte(offres, 2);
                ConstruireGeste(pied, "PRENDRE L'AUTRE",
                                autre != null ? "tant qu'elle est encore là" : "il n'en reste aucune",
                                autre == null, false,
                                autre != null ? (System.Action)(() => StartCoroutine(Prendre(autre))) : null);
                ConstruireRien(pied, "Une offre de remplacement se ferme",
                    " — prise, expirée, ou retirée. Ce n'est pas une liste qui attend.");
            }
            else
            {
                EcrireDit(pied, "", "Dima :",
                          " « Deux propositions. La première est mieux placée. Elles ne resteront pas "
                          + "sur la table. »");
                ReplacementOptionDto premiere = PremiereOffreOuverte(offres, 1);
                ConstruireGeste(pied, "PRENDRE LA PREMIÈRE",
                                premiere != null
                                    ? DemolitionResolvers.NomDeType(premiere.candidate_building_type)
                                    : "il n'en reste aucune",
                                premiere == null, false,
                                premiere != null ? (System.Action)(() => StartCoroutine(Prendre(premiere))) : null);
            }

            if (refusAffiche != null) ConstruireRien(pied, "Le serveur a refusé", " : " + refusAffiche);
        }

        private static ReplacementOptionDto PremiereOffreOuverte(ReplacementOptionDto[] offres, int rang)
        {
            if (offres == null) return null;
            foreach (ReplacementOptionDto o in offres) if (o != null && o.rank == rang) return o;
            foreach (ReplacementOptionDto o in offres) if (o != null) return o;
            return null;
        }

        private void ConstruireOffre(ReplacementOptionDto o, bool fermee)
        {
            GameObject go = NouveauUI("Offre_" + o.rank, zoneCentrale);
            bool premiere = o.rank == 1;
            AjouterPlaqueArrondie(go,
                premiere ? DemolitionResolvers.OffreUneFond : DemolitionResolvers.BlocFond,
                premiere ? DemolitionResolvers.OffreUneBord : DemolitionResolvers.BlocBord, CssRayonMoyen);
            LayoutElement le = go.AddComponent<LayoutElement>();
            le.preferredHeight = Px(CssOffreHaut); le.minHeight = Px(CssOffreHaut);

            HorizontalLayoutGroup h = go.AddComponent<HorizontalLayoutGroup>();
            h.padding = new RectOffset(PxTrait(CssOffrePadX), PxTrait(CssOffrePadX),
                                       PxTrait(CssOffrePadY), PxTrait(CssOffrePadY));
            h.spacing = Px(CssOffreEcart);
            h.childAlignment = TextAnchor.MiddleLeft;
            h.childControlWidth = true; h.childControlHeight = true;
            h.childForceExpandWidth = false; h.childForceExpandHeight = false;

            GameObject rg = NouveauUI("Rang", go.transform);
            Image disque = AjouterImage(rg);
            disque.sprite = ProceduralUI.RadialDisc(32, Color.white, Color.white);
            disque.color = premiere ? DemolitionResolvers.OrSombre : DemolitionResolvers.BlocBord;
            disque.raycastTarget = false;
            LayoutElement leRg = rg.AddComponent<LayoutElement>();
            // Plancher ET préféré : sans `minWidth`, un groupe serré aplatit le disque en ellipse
            // sur le seul axe disputé — mesuré sur ㉜.
            leRg.preferredWidth = Px(CssRang); leRg.preferredHeight = Px(CssRang);
            leRg.minWidth = Px(CssRang); leRg.minHeight = Px(CssRang);
            leRg.flexibleWidth = 0f; leRg.flexibleHeight = 0f;
            TextMeshProUGUI num = NouveauTexte(rg.transform, "N",
                o.rank.ToString(System.Globalization.CultureInfo.InvariantCulture), Px(CssRangCorps),
                premiere ? DemolitionResolvers.OrPale : DemolitionResolvers.ParcelleEncre,
                DesignTokens.Current.hudSerifFont);
            num.fontStyle = FontStyles.Bold;
            num.alignment = TextAlignmentOptions.Center;
            Etirer((RectTransform)num.transform);
            num.GetComponent<LayoutElement>().ignoreLayout = true;

            GameObject q = NouveauUI("Q", go.transform);
            VerticalLayoutGroup vq = q.AddComponent<VerticalLayoutGroup>();
            vq.spacing = Px(2f);
            vq.childAlignment = TextAnchor.MiddleLeft;
            vq.childControlWidth = true; vq.childControlHeight = true;
            vq.childForceExpandWidth = true; vq.childForceExpandHeight = false;
            q.AddComponent<LayoutElement>().flexibleWidth = 1f;
            NouveauTexte(q.transform, "Nom",
                         DemolitionResolvers.NomDeType(o.candidate_building_type), Px(CssOffreTitre),
                         DemolitionResolvers.TitreVif, DesignTokens.Current.hudSerifFont)
                .fontStyle = FontStyles.Bold;
            // ⛔ Ce que l'offre PROJETTE vient du corps, pas d'une phrase écrite d'avance : la
            // maquette met « proche des routes déjà tenues », que rien ne sert. Deux bandes le
            // disent honnêtement.
            string proj = o.projected == null ? "projection non servie"
                : DemolitionResolvers.PhraseDeRendement(o.projected.output_value_bucket)
                  + " · " + DemolitionResolvers.PhraseDeFriction(o.projected.friction_load_bucket);
            NouveauTexte(q.transform, "Sous", proj, Px(CssOffreSous),
                         DemolitionResolvers.Muet, DesignTokens.Current.primaryFont);

            GameObject tag = NouveauUI("Tag", go.transform);
            Color teinte = fermee ? DemolitionResolvers.TagFerme
                         : premiere ? DemolitionResolvers.Or : DemolitionResolvers.Muet;
            Image tb = AjouterImage(tag);
            tb.sprite = ProceduralUI.RoundedRectOutline(PxTrait(CssRayonPetit), PxTrait(CssFilet), Color.white);
            tb.type = Image.Type.Sliced;
            tb.color = teinte;
            tb.raycastTarget = false;
            HorizontalLayoutGroup ht = tag.AddComponent<HorizontalLayoutGroup>();
            ht.padding = new RectOffset(PxTrait(CssTagPadX), PxTrait(CssTagPadX),
                                        PxTrait(CssTagPadY), PxTrait(CssTagPadY));
            ht.childControlWidth = true; ht.childControlHeight = true;
            ht.childForceExpandWidth = false; ht.childForceExpandHeight = false;
            tag.AddComponent<LayoutElement>().flexibleWidth = 0f;
            TextMeshProUGUI tt = NouveauTexte(tag.transform, "Texte",
                fermee ? "DÉJÀ PRISE" : premiere ? "LE MIEUX PLACÉ" : "AUTRE OPTION",
                Px(CssTagCorps), teinte, DesignTokens.Current.primaryFont);
            tt.fontStyle = FontStyles.Bold;
            tt.characterSpacing = 12f;   // .tag{letter-spacing:.8px} sur 6,6px

            if (!fermee) RendreCliquable(go, () => StartCoroutine(Prendre(o)));
        }

        private void RendreEtatIndisponible()
        {
            Vider(zoneCentrale);
            Vider(pied);
            EcrireTete("L'état de la friction est indisponible",
                       "On n'a pas pu lire ce que vous tenez. Rien n'a été changé.");
            ConstruireRien(zoneCentrale, "Raison", " : " + (DerniereErreur ?? "inconnue"));
        }

        // ═══ Gestes ══════════════════════════════════════════════════════════════════════════

        private IEnumerator OuvrirFiche(DistrictBuildingDto b)
        {
            batimentVise = b;
            DerniereFiche = null;
            refusAffiche = null;
            EtatCourant = EtatEcran.Fiche;
            Rendre();
            yield return client.GetFrictionNodes(token, b.building,
                d => DerniereFiche = d,
                r => refusAffiche = r.message);
            Rendre();
        }

        /// <summary>⛔ `confirm: true` EST OBLIGATOIRE — mesuré, un corps vide rend 422
        /// DEMOLITION_CONFIRM_REQUIRED. Ce geste n'est atteignable que depuis l'état `Demolir`,
        /// c'est-à-dire APRÈS le cadre de confirmation de la maquette : le drapeau du protocole et
        /// le second écran disent la même chose, et c'est le serveur qui l'avait dit en premier.</summary>
        private IEnumerator Raser()
        {
            refusAffiche = null;
            PostFrictionNodesDecommissionResponseDto r = null;
            yield return client.PostFrictionNodesDecommission(token, batimentVise.building, true,
                d => r = d,
                refus => refusAffiche = refus.message);

            if (r != null && r.decommissioned)
            {
                blocLibere = r.freed_block_id;
                // Une démolition consomme le jeton du jour — mesuré. On l'inscrit tout de suite
                // pour que ㉜ et ㉞ le voient sans rouvrir de session : la source reste unique.
                JetonDeStructure.Publier(1, true);
                JetonDepenseConnu = true; JetonDepense = true;
                yield return client.GetFrictionReplacementOptions(token,
                    d => DernieresOffres = d, _ => { });
                EtatCourant = EtatEcran.Parcelle;
            }
            yield return client.GetFrictionState(token, d => DerniereFriction = d, _ => { });
            Rendre();
        }

        private IEnumerator Prendre(ReplacementOptionDto o)
        {
            refusAffiche = null;
            bool ok = false;
            yield return client.PostFrictionReplacementOptionsPick(token, o.id,
                _ => ok = true,
                refus => refusAffiche = refus.message);

            // L'état réel se relit sur les offres, jamais sur ce qu'on croit que `pick` a rendu :
            // le corps de succès de cette route n'a jamais été observé (TD-533).
            yield return client.GetFrictionReplacementOptions(token, d => DernieresOffres = d, _ => { });
            if (!ok) EtatCourant = EtatEcran.Fermee;
            Rendre();
        }

        // ═══ Lectures dérivées ═══════════════════════════════════════════════════════════════

        private bool JetonDisponible => !JetonDepenseConnu || !JetonDepense;

        /// <summary>Le nom de fiction vient d'une CLÉ i18n avec ses paramètres — jamais une chaîne
        /// prête. `params.enseigne` porte le nom lisible ; sans lui on nomme par le bloc plutôt que
        /// d'afficher une clé technique à un joueur.</summary>
        private static string NomDuSite(DistrictBuildingDto b)
        {
            if (b?.name_i18n?.@params != null && !string.IsNullOrEmpty(b.name_i18n.@params.enseigne))
                return b.name_i18n.@params.enseigne;
            return b != null ? $"Site du bloc {b.block_id}" : "Ce site";
        }

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
            // Sous l'hôte quand on est monté dans le shell (il est déjà l'enfant de `ContentSlot`
            // que le shell gouverne) ; sous le canvas découvert hors shell.
            Transform root = mountParent != null ? transform : canvas.transform;

            GameObject racine = NouveauUI("DemolitionRoot", root);
            racinePleinEcran = (RectTransform)racine.transform;
            Etirer(racinePleinEcran);
            AjouterFond(racine, DemolitionResolvers.FondBas);

            // `linear-gradient(180deg,#20211d,#191a17 58%,#141513)` — trois arrêts, donc DEUX
            // bandes qui se rejoignent au genou de 58 %. Un seul dégradé déplacerait le genou.
            // ⚠️ Aplats OPAQUES : aucune conversion sRGB→linéaire (elle ne concerne que les alphas).
            AjouterBande(racine, "FondHaut", 0.42f, 1f,
                ProceduralUI.VerticalGradient(96, DemolitionResolvers.FondHaut, DemolitionResolvers.FondMilieu));
            AjouterBande(racine, "FondBas", 0f, 0.42f,
                ProceduralUI.VerticalGradient(96, DemolitionResolvers.FondMilieu, DemolitionResolvers.FondBas));

            Canvas.ForceUpdateCanvases();
            float largeurLue = racinePleinEcran.rect.width;
            if (largeurLue < EchelleMaquette.LargeurCanvasParDefaut * 0.9f)
            {
                // On le DIT plutôt que de corriger en silence : une largeur de canvas divisée par
                // deux ne ressemble pas à un bug, elle ressemble à un écran sobre.
                Debug.LogWarning($"[ECHELLE ㉝] racine non résolue : rect.width={largeurLue:F0} < "
                                 + $"{EchelleMaquette.LargeurCanvasParDefaut:F0} attendu.");
            }

            // ⛔ LE CADRE REMPLIT L'ESPACE ENTRE LES DEUX BARRES. Le `H=462` du générateur n'est
            // pas une hauteur de carte : c'est le RESTE sous le chrome dans un téléphone 9:17,5.
            // Figé, il laisse une bande morte au-dessus du dock à 20:9 — mesuré sur ㉜ : 11,9 % de
            // la hauteur. La CSS le disait déjà (`height:100%` + `.dm-body{flex:1}`).
            GameObject corpsGo = NouveauUI("Corps", racine.transform);
            corps = (RectTransform)corpsGo.transform;
            corps.anchorMin = Vector2.zero;
            corps.anchorMax = Vector2.one;
            corps.pivot = new Vector2(0.5f, 0.5f);
            corps.offsetMin = new Vector2(0f, ShellChrome.BottomInsetPx);
            corps.offsetMax = new Vector2(0f, -ShellChrome.TopInsetPx);

            VerticalLayoutGroup pile = corpsGo.AddComponent<VerticalLayoutGroup>();
            pile.spacing = 0f;
            pile.padding = new RectOffset(0, 0, 0, 0);
            pile.childControlWidth = true; pile.childControlHeight = true;
            pile.childForceExpandWidth = true; pile.childForceExpandHeight = false;

            ConstruireTete(corpsGo.transform);
            zoneCentrale = ConstruireZoneCentrale(corpsGo.transform);
            pied = ConstruirePied(corpsGo.transform);
        }

        private void ConstruireTete(Transform parent)
        {
            GameObject go = NouveauUI("Tete", parent);
            AjouterFond(go, DemolitionResolvers.TeteFond);
            AjouterFiletBas(go, DemolitionResolvers.TeteFilet, CssFilet);
            VerticalLayoutGroup v = go.AddComponent<VerticalLayoutGroup>();
            v.padding = new RectOffset(PxTrait(CssMargeH), PxTrait(CssMargeH),
                                       PxTrait(CssTetePadHaut), PxTrait(CssTetePadBas));
            v.spacing = Px(CssTeteEcart);
            v.childControlWidth = true; v.childControlHeight = true;
            v.childForceExpandWidth = true; v.childForceExpandHeight = false;
            titreTete = NouveauTexte(go.transform, "Titre", "", Px(CssTeteTitre),
                                     DemolitionResolvers.TitreVif, DesignTokens.Current.hudSerifFont);
            titreTete.fontStyle = FontStyles.Bold;
            titreTete.characterSpacing = 2.5f;
            sousTitreTete = NouveauTexte(go.transform, "SousTitre", "", Px(CssTeteSous),
                                         DemolitionResolvers.Muet, DesignTokens.Current.primaryFont);
        }

        /// <summary>`.dm-body{flex:1;min-height:0;overflow:hidden}` — et les TROIS morceaux comptent.
        ///
        /// ⛔⛔ `overflow:hidden` N'ÉTAIT PAS IMPLÉMENTÉ, ET LA CAPTURE L'A DIT. Avec 17 sites, la
        /// liste réclamait sa hauteur de contenu : le groupe vertical parent la lui accordait,
        /// l'écran DÉBORDAIT sous le dock, et la tête se faisait écraser — titre et sous-titre
        /// superposés. Rien dans le code ne bornait la zone ; `min-height:0` seul ne borne pas,
        /// il autorise seulement à rétrécir.
        /// ⇒ Trois gestes, un par morceau de la CSS, et aucun n'est facultatif :
        ///   · `preferredHeight = 0` — la zone ne RÉCLAME rien. Sans ça elle demande la hauteur de
        ///     ses 17 enfants et le parent la sert avant de servir la tête et le pied.
        ///   · `flexibleHeight = 1` — elle prend ce qui RESTE, et rien de plus. C'est `flex:1`.
        ///   · `RectMask2D` — elle COUPE ce qui dépasse. C'est `overflow:hidden`, et c'est la seule
        ///     des trois qui empêche un enfant de dessiner par-dessus le dock.
        /// ⚠️ Et comme couper sans donner accès au reste rendrait des sites INJOIGNABLES, la zone
        ///   est aussi un `ScrollRect` vertical. La maquette ne le montre pas parce qu'elle n'a
        ///   jamais eu que quatre rangées ; le monde réel en a dix-sept. *Une maquette dessine un
        ///   cas, pas une borne.*
        /// ⇒ `zoneCentrale` est le CONTENU (ce qui défile), pas la fenêtre : tous les blocs
        ///   continuent de s'y parenter sans rien savoir du défilement.</summary>
        private RectTransform ConstruireZoneCentrale(Transform parent)
        {
            GameObject fenetre = NouveauUI("Corps", parent);
            LayoutElement le = fenetre.AddComponent<LayoutElement>();
            le.flexibleHeight = 1f;
            le.minHeight = 0f;
            le.preferredHeight = 0f;
            fenetre.AddComponent<RectMask2D>();
            ScrollRect sr = fenetre.AddComponent<ScrollRect>();
            sr.horizontal = false;
            sr.vertical = true;
            sr.movementType = ScrollRect.MovementType.Clamped;
            sr.scrollSensitivity = 40f;

            GameObject contenu = NouveauUI("Contenu", fenetre.transform);
            RectTransform rtc = (RectTransform)contenu.transform;
            rtc.anchorMin = new Vector2(0f, 1f);
            rtc.anchorMax = new Vector2(1f, 1f);
            rtc.pivot = new Vector2(0.5f, 1f);
            rtc.offsetMin = Vector2.zero;
            rtc.offsetMax = Vector2.zero;
            sr.viewport = (RectTransform)fenetre.transform;
            sr.content = rtc;

            VerticalLayoutGroup v = contenu.AddComponent<VerticalLayoutGroup>();
            v.padding = new RectOffset(PxTrait(CssMargeH), PxTrait(CssMargeH), PxTrait(CssBodyPadHaut), 0);
            v.spacing = Px(CssOffreBas);
            v.childAlignment = TextAnchor.UpperCenter;
            v.childControlWidth = true; v.childControlHeight = true;
            v.childForceExpandWidth = true; v.childForceExpandHeight = false;
            // Le contenu se dimensionne sur ses enfants — c'est ce qui donne au ScrollRect une
            // course à parcourir. Sans lui, la zone couperait et il n'y aurait rien à faire défiler.
            ContentSizeFitter csf = contenu.AddComponent<ContentSizeFitter>();
            csf.verticalFit = ContentSizeFitter.FitMode.PreferredSize;
            return rtc;
        }

        private RectTransform ConstruirePied(Transform parent)
        {
            GameObject go = NouveauUI("Bas", parent);
            AjouterFond(go, DemolitionResolvers.BasFond);
            AjouterFiletHaut(go, DemolitionResolvers.BasFilet, CssFiletEpais);
            VerticalLayoutGroup v = go.AddComponent<VerticalLayoutGroup>();
            v.padding = new RectOffset(PxTrait(CssMargeH), PxTrait(CssMargeH),
                                       PxTrait(CssBasPadHaut), PxTrait(CssBasPadBas));
            v.spacing = Px(CssGesteHaut);
            v.childControlWidth = true; v.childControlHeight = true;
            v.childForceExpandWidth = true; v.childForceExpandHeight = false;
            return (RectTransform)go.transform;
        }

        // ═══ Blocs partagés ══════════════════════════════════════════════════════════════════

        private void EcrireTete(string titre, string sous)
        {
            if (titreTete != null) titreTete.text = titre;
            if (sousTitreTete != null) sousTitreTete.text = sous;
        }

        /// <summary>`.dm-dit` — le gras y est DROIT dans une phrase italique
        /// (`font-style:normal`) : l'italique vit donc en balises sur les deux morceaux qui la
        /// portent, et le champ `fontStyle` reste Normal. Poser Italic puis `<b>` par-dessus
        /// donnerait un gras italique.</summary>
        private void EcrireDit(Transform parent, string avant, string gras, string apres,
                               System.Action action = null)
        {
            GameObject go = NouveauUI("Dit", parent);
            VerticalLayoutGroup v = go.AddComponent<VerticalLayoutGroup>();
            v.childControlWidth = true; v.childControlHeight = true;
            v.childForceExpandWidth = true; v.childForceExpandHeight = false;
            TextMeshProUGUI t = NouveauTexte(go.transform, "Texte",
                (string.IsNullOrEmpty(avant) ? "" : "<i>" + avant + "</i>")
                + "<b>" + gras + "</b>"
                + (string.IsNullOrEmpty(apres) ? "" : "<i>" + apres + "</i>"),
                Px(CssDit), DemolitionResolvers.DitEncre, DesignTokens.Current.hudSerifFont);
            t.fontStyle = FontStyles.Normal;
            if (action != null) RendreCliquable(go, action);
        }

        /// <summary>`.dm-geste`, avec ses trois styles : or, `.rouge` (le geste destructeur) et
        /// `.mort` (refusé).</summary>
        private void ConstruireGeste(Transform parent, string libelle, string precision,
                                     bool mort, bool rouge, System.Action action)
        {
            GameObject go = NouveauUI("Geste", parent);
            Color fond = mort ? DemolitionResolvers.GesteMortFond
                       : rouge ? DemolitionResolvers.GesteRougeFond : DemolitionResolvers.GesteFond;
            Color bord = mort ? DemolitionResolvers.GesteMortBord
                       : rouge ? DemolitionResolvers.GesteRougeBord : DemolitionResolvers.GesteBord;
            Color encre = mort ? DemolitionResolvers.GesteMortEncre
                        : rouge ? DemolitionResolvers.Rouge : DemolitionResolvers.Or;
            Color sous = mort ? DemolitionResolvers.GesteMortSous
                       : rouge ? DemolitionResolvers.RougeMuet : DemolitionResolvers.OrMuet;
            AjouterPlaqueArrondie(go, fond, bord, CssRayonMoyen);

            HorizontalLayoutGroup h = go.AddComponent<HorizontalLayoutGroup>();
            h.padding = new RectOffset(PxTrait(CssGestePadX), PxTrait(CssGestePadX),
                                       PxTrait(CssGestePadY), PxTrait(CssGestePadY));
            h.spacing = Px(8f);
            h.childAlignment = TextAnchor.MiddleLeft;
            h.childControlWidth = true; h.childControlHeight = true;
            h.childForceExpandWidth = false; h.childForceExpandHeight = false;

            TextMeshProUGUI t = NouveauTexte(go.transform, "Libelle", libelle, Px(CssGeste),
                                             encre, DesignTokens.Current.primaryFont);
            t.fontStyle = FontStyles.Bold;
            t.characterSpacing = 7f;
            t.GetComponent<LayoutElement>().flexibleWidth = 1f;
            TextMeshProUGUI s = NouveauTexte(go.transform, "Precision", precision, Px(CssGesteSous),
                                             sous, DesignTokens.Current.primaryFont);
            s.alignment = TextAlignmentOptions.Right;
            s.GetComponent<LayoutElement>().flexibleWidth = 0f;

            // ⛔ Un geste MORT ne reçoit AUCUN gestionnaire — pas un gestionnaire qui ne fait rien.
            // Une zone qui absorbe le toucher sans effet est indiscernable d'une panne.
            if (!mort && action != null) RendreCliquable(go, action);
        }

        private void ConstruireRien(Transform parent, string gras, string reste)
        {
            GameObject go = NouveauUI("Rien", parent);
            AjouterFiletGauche(go, DemolitionResolvers.BlocBord, CssFiletEpais);
            VerticalLayoutGroup v = go.AddComponent<VerticalLayoutGroup>();
            v.padding = new RectOffset(PxTrait(CssRienPadX), PxTrait(CssRienPadX),
                                       PxTrait(CssRienPadY), PxTrait(CssRienPadY));
            v.childControlWidth = true; v.childControlHeight = true;
            v.childForceExpandWidth = true; v.childForceExpandHeight = false;
            NouveauTexte(go.transform, "Texte", "<b>" + gras + "</b>" + reste, Px(CssRien),
                         DemolitionResolvers.Muet, DesignTokens.Current.primaryFont);
        }

        // ═══ Primitives — dupliquées par convention ══════════════════════════════════════════

        /// <summary>⛔ DÉ-PARENTER AVANT `Destroy` : `Destroy` est DIFFÉRÉ à la fin de la frame, et
        /// une reconstruction immédiate compterait les anciens enfants dans le layout le temps
        /// d'une frame — une capture prise là montre l'écran doublé.</summary>
        private static void Vider(RectTransform zone)
        {
            if (zone == null) return;
            for (int i = zone.childCount - 1; i >= 0; i--)
            {
                Transform enfant = zone.GetChild(i);
                enfant.SetParent(null, false);
                Destroy(enfant.gameObject);
            }
        }

        private void Espaceur(Transform parent, float hauteurCss)
        {
            GameObject go = NouveauUI("Espaceur", parent);
            LayoutElement le = go.AddComponent<LayoutElement>();
            le.preferredHeight = Px(hauteurCss);
            le.minHeight = Px(hauteurCss);
        }

        private static GameObject NouveauUI(string nom, Transform parent)
        {
            GameObject go = new GameObject(nom, typeof(RectTransform));
            go.transform.SetParent(parent, false);
            return go;
        }

        /// <summary>⛔ TOUTE Image passe par ici : `AddComponent<T>()` à l'exécution n'honore PAS
        /// le `[RequireComponent(CanvasRenderer)]` d'une classe de base, et sans `CanvasRenderer`
        /// un `Graphic` ne dessine RIEN, sans la moindre erreur console.</summary>
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

        private void AjouterPlaqueArrondie(GameObject go, Color fond, Color bord, float rayonCss)
        {
            Image f = AjouterImage(go);
            f.sprite = ProceduralUI.RoundedRectMask(PxTrait(rayonCss));
            f.type = Image.Type.Sliced;
            f.color = fond;
            f.raycastTarget = false;

            GameObject liseret = NouveauUI("Bord", go.transform);
            liseret.AddComponent<LayoutElement>().ignoreLayout = true;
            Etirer((RectTransform)liseret.transform);
            Image b = AjouterImage(liseret);
            b.sprite = ProceduralUI.RoundedRectOutline(PxTrait(rayonCss), PxTrait(CssFilet), Color.white);
            b.type = Image.Type.Sliced;
            b.color = bord;
            b.raycastTarget = false;
        }

        private void AjouterFiletHaut(GameObject go, Color couleur, float epaisseurCss) =>
            Filet(go, couleur, epaisseurCss, new Vector2(0f, 1f), new Vector2(1f, 1f), new Vector2(0.5f, 1f));

        private void AjouterFiletBas(GameObject go, Color couleur, float epaisseurCss) =>
            Filet(go, couleur, epaisseurCss, new Vector2(0f, 0f), new Vector2(1f, 0f), new Vector2(0.5f, 0f));

        private void AjouterFiletGauche(GameObject go, Color couleur, float epaisseurCss)
        {
            GameObject f = NouveauUI("FiletG", go.transform);
            f.AddComponent<LayoutElement>().ignoreLayout = true;
            RectTransform rt = (RectTransform)f.transform;
            rt.anchorMin = new Vector2(0f, 0f); rt.anchorMax = new Vector2(0f, 1f);
            rt.pivot = new Vector2(0f, 0.5f);
            rt.sizeDelta = new Vector2(Px(epaisseurCss), 0f);
            rt.anchoredPosition = Vector2.zero;
            AjouterFond(f, couleur);
        }

        private void Filet(GameObject go, Color couleur, float epaisseurCss,
                           Vector2 min, Vector2 max, Vector2 pivot)
        {
            GameObject f = NouveauUI("Filet", go.transform);
            f.AddComponent<LayoutElement>().ignoreLayout = true;
            RectTransform rt = (RectTransform)f.transform;
            rt.anchorMin = min; rt.anchorMax = max; rt.pivot = pivot;
            rt.sizeDelta = new Vector2(0f, Px(epaisseurCss));
            rt.anchoredPosition = Vector2.zero;
            AjouterFond(f, couleur);
        }

        /// <summary>La cible de rayon est une image TRANSPARENTE dédiée, jamais le fond peint : les
        /// fonds sont posés avec `raycastTarget = false`, sinon le premier fond plein écran
        /// avalerait tous les touchers de la page.</summary>
        private static void RendreCliquable(GameObject go, System.Action action)
        {
            if (action == null) return;
            GameObject zone = NouveauUI("Touche", go.transform);
            zone.AddComponent<LayoutElement>().ignoreLayout = true;
            Etirer((RectTransform)zone.transform);
            Image cible = AjouterImage(zone);
            cible.color = new Color(0f, 0f, 0f, 0f);
            cible.raycastTarget = true;
            Button b = zone.AddComponent<Button>();
            b.transition = Selectable.Transition.None;
            b.onClick.AddListener(() => action());
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
            t.textWrappingMode = TextWrappingModes.Normal;
            go.AddComponent<LayoutElement>();
            return t;
        }

        private static void Etirer(RectTransform rt, float marge = 0f)
        {
            rt.anchorMin = Vector2.zero;
            rt.anchorMax = Vector2.one;
            rt.offsetMin = new Vector2(marge, marge);
            rt.offsetMax = new Vector2(-marge, -marge);
        }

        private static void AjouterBande(GameObject parent, string nom, float yMin, float yMax, Sprite sprite)
        {
            GameObject go = NouveauUI(nom, parent.transform);
            RectTransform rt = (RectTransform)go.transform;
            rt.anchorMin = new Vector2(0f, yMin); rt.anchorMax = new Vector2(1f, yMax);
            rt.offsetMin = Vector2.zero; rt.offsetMax = Vector2.zero;
            Image img = AjouterImage(go);
            img.sprite = sprite;
            img.color = Color.white;   // la couleur vit dans le sprite, jamais dans les deux
            img.raycastTarget = false;
        }
    }

    /// <summary>㉝ — les correspondances « valeur du domaine → apparence / phrase », chacune en
    /// FONCTION NOMMÉE prenant la valeur du domaine. Jamais un tableau positionnel, jamais une
    /// chaîne de ternaires : un balayage anti-régression rend ZÉRO sur un fichier qui porte ses
    /// correspondances par l'ordre d'un tableau — la garde ne voit sa cible qu'après ce passage.
    ///
    /// Couleurs : les hexadécimaux de `generateur-demol.py`, aplats OPAQUES (aucune conversion
    /// sRGB→linéaire — elle ne concerne que les alphas).</summary>
    public static class DemolitionResolvers
    {
        private static Color Hex(int r, int g, int b) => new Color(r / 255f, g / 255f, b / 255f, 1f);

        // ── fond : linear-gradient(180deg,#20211d,#191a17 58%,#141513) — l'olive de la démolition,
        //    délibérément différent du bleu de ㉜ : ce n'est pas le même endroit du jeu.
        public static readonly Color FondHaut   = Hex(0x20, 0x21, 0x1d);
        public static readonly Color FondMilieu = Hex(0x19, 0x1a, 0x17);
        public static readonly Color FondBas    = Hex(0x14, 0x15, 0x13);

        public static readonly Color TeteFond  = Hex(0x1e, 0x1f, 0x1b);
        public static readonly Color TeteFilet = Hex(0x3a, 0x3c, 0x34);
        public static readonly Color BasFond   = Hex(0x14, 0x1a, 0x21);
        public static readonly Color BasFilet  = Hex(0x2c, 0x36, 0x40);

        public static readonly Color TitreVif = Hex(0xee, 0xf3, 0xf9);
        public static readonly Color Muet     = Hex(0x8f, 0x92, 0x85);
        public static readonly Color DitEncre = Hex(0xcd, 0xd6, 0xe0);

        public static readonly Color BlocFond = Hex(0x23, 0x25, 0x20);
        public static readonly Color BlocBord = Hex(0x3c, 0x3e, 0x35);

        // ── la fiche cartonnée : le seul bloc CLAIR de tout le corpus d'écrans ──
        public static readonly Color FicheCarton = Hex(0xe9, 0xe4, 0xd4);
        public static readonly Color FicheEncre  = Hex(0x2a, 0x2a, 0x22);
        public static readonly Color FicheMuet   = Hex(0x7f, 0x7a, 0x63);
        public static readonly Color FicheFilet  = Hex(0xc2, 0xbd, 0xa4);
        public static readonly Color FicheDos    = Hex(0x8c, 0x7a, 0x3f);

        public static readonly Color VerdictFond  = Hex(0x8c, 0x2f, 0x36);
        public static readonly Color VerdictEncre = Hex(0xf6, 0xef, 0xe2);
        public static readonly Color VerdictSous  = Hex(0xf0, 0xd8, 0xcf);

        public static readonly Color PenalFond  = Hex(0x2e, 0x21, 0x14);
        public static readonly Color PenalBord  = Hex(0x8a, 0x6a, 0x22);
        public static readonly Color PenalEncre = Hex(0xe8, 0xd3, 0xa4);

        public static readonly Color ParcelleBord  = Hex(0x5a, 0x5c, 0x4e);
        public static readonly Color ParcelleEncre = Hex(0xc9, 0xcb, 0xb8);
        public static readonly Color OffreUneFond  = Hex(0x26, 0x21, 0x17);
        public static readonly Color OffreUneBord  = Hex(0x5a, 0x4a, 0x2a);
        public static readonly Color TagFerme      = Hex(0x8b, 0x6a, 0x6a);

        public static readonly Color Or        = Hex(0xd9, 0xab, 0x4e);
        public static readonly Color OrSombre  = Hex(0x5a, 0x4a, 0x2a);
        public static readonly Color OrMuet    = Hex(0x9a, 0x8a, 0x6a);
        public static readonly Color OrPale    = Hex(0xf0, 0xdf, 0xc4);
        public static readonly Color Rouge     = Hex(0xd9, 0x7a, 0x6a);
        public static readonly Color RougeMuet = Hex(0xa0, 0x7a, 0x76);

        public static readonly Color GesteFond      = Hex(0x24, 0x1c, 0x11);
        public static readonly Color GesteBord      = Hex(0x5a, 0x4a, 0x2a);
        public static readonly Color GesteRougeFond = Hex(0x24, 0x12, 0x14);
        public static readonly Color GesteRougeBord = Hex(0x5c, 0x2a, 0x2a);
        public static readonly Color GesteMortFond  = Hex(0x1c, 0x14, 0x14);
        public static readonly Color GesteMortBord  = Hex(0x4a, 0x3a, 0x3a);
        public static readonly Color GesteMortEncre = Hex(0x8b, 0x6a, 0x6a);
        public static readonly Color GesteMortSous  = Hex(0x7a, 0x60, 0x60);

        private static readonly Color Vert   = Hex(0x7f, 0xc9, 0x9a);
        private static readonly Color Ambre  = Hex(0xe0, 0x8a, 0x5a);
        private static readonly Color Neutre = Hex(0x9a, 0xa6, 0xb3);

        // ── friction : light · balanced · strained · overloaded ──

        public enum Friction { Light, Balanced, Strained, Overloaded }

        /// <summary>⛔ Le repli est un JET, pas une valeur par défaut : une 5ᵉ bande repliée en
        /// silence sur « ça tient » mentirait au joueur sur l'état de sa ville. (Un `switch` C#
        /// sans `default` est CS0161 — « exhaustif sans default » n'existe pas ici ; le détecteur
        /// d'un membre neuf est un TEST sur `Enum.GetValues`, jamais le compilateur.)</summary>
        public static Friction LireFriction(string b)
        {
            switch (b)
            {
                case "light":      return Friction.Light;
                case "balanced":   return Friction.Balanced;
                case "strained":   return Friction.Strained;
                case "overloaded": return Friction.Overloaded;
                default: throw new System.ArgumentOutOfRangeException(nameof(b), b,
                    "DemolitionResolvers.LireFriction : bande non résolue.");
            }
        }

        public static string PhraseDeFriction(string b)
        {
            switch (LireFriction(b))
            {
                case Friction.Light:      return "Ça tourne rond";
                case Friction.Balanced:   return "Ça tient";
                case Friction.Strained:   return "Ça force";
                case Friction.Overloaded: return "Ça grince partout";
                default: throw new System.ArgumentOutOfRangeException(nameof(b), b, "PhraseDeFriction");
            }
        }

        public static Color CouleurDeFriction(string b)
        {
            switch (LireFriction(b))
            {
                case Friction.Light:      return Vert;
                case Friction.Balanced:   return Neutre;
                case Friction.Strained:   return Or;
                case Friction.Overloaded: return Rouge;
                default: throw new System.ArgumentOutOfRangeException(nameof(b), b, "CouleurDeFriction");
            }
        }

        // ── rendement : very_low · low · medium · high · very_high ──

        public enum Rendement { VeryLow, Low, Medium, High, VeryHigh }

        public static Rendement LireRendement(string b)
        {
            switch (b)
            {
                case "very_low":  return Rendement.VeryLow;
                case "low":       return Rendement.Low;
                case "medium":    return Rendement.Medium;
                case "high":      return Rendement.High;
                case "very_high": return Rendement.VeryHigh;
                default: throw new System.ArgumentOutOfRangeException(nameof(b), b,
                    "DemolitionResolvers.LireRendement : bande non résolue.");
            }
        }

        public static string PhraseDeRendement(string b)
        {
            switch (LireRendement(b))
            {
                case Rendement.VeryLow:  return "presque rien";
                case Rendement.Low:      return "peu";
                case Rendement.Medium:   return "correct";
                case Rendement.High:     return "bien";
                case Rendement.VeryHigh: return "très bien";
                default: throw new System.ArgumentOutOfRangeException(nameof(b), b, "PhraseDeRendement");
            }
        }

        public static Color CouleurDeRendement(string b)
        {
            switch (LireRendement(b))
            {
                case Rendement.VeryLow:  return Rouge;
                case Rendement.Low:      return Ambre;
                case Rendement.Medium:   return Or;
                case Rendement.High:     return Vert;
                case Rendement.VeryHigh: return Vert;
                default: throw new System.ArgumentOutOfRangeException(nameof(b), b, "CouleurDeRendement");
            }
        }

        // ── rapport : poor · fair · good · excellent ──

        public enum Rapport { Poor, Fair, Good, Excellent }

        public static Rapport LireRapport(string b)
        {
            switch (b)
            {
                case "poor":      return Rapport.Poor;
                case "fair":      return Rapport.Fair;
                case "good":      return Rapport.Good;
                case "excellent": return Rapport.Excellent;
                default: throw new System.ArgumentOutOfRangeException(nameof(b), b,
                    "DemolitionResolvers.LireRapport : bande non résolue.");
            }
        }

        public static string PhraseDeRapport(string b)
        {
            switch (LireRapport(b))
            {
                case Rapport.Poor:      return "il coûte plus qu'il ne rapporte";
                case Rapport.Fair:      return "c'est juste";
                case Rapport.Good:      return "ça vaut le coup";
                case Rapport.Excellent: return "c'est une bonne affaire";
                default: throw new System.ArgumentOutOfRangeException(nameof(b), b, "PhraseDeRapport");
            }
        }

        /// <summary>Le rang du rapport, du PIRE (0) au meilleur (3) — sert à classer les sites,
        /// donc à rendre vrai le libellé « voir ce qui coûte le plus ». Passe par `LireRapport`,
        /// donc une bande inconnue JETTE ici aussi : classer sur une valeur non résolue mettrait
        /// silencieusement le mauvais site en tête.</summary>
        public static int RangDeRapport(string b)
        {
            switch (LireRapport(b))
            {
                case Rapport.Poor:      return 0;
                case Rapport.Fair:      return 1;
                case Rapport.Good:      return 2;
                case Rapport.Excellent: return 3;
                default: throw new System.ArgumentOutOfRangeException(nameof(b), b, "RangDeRapport");
            }
        }

        public static Color CouleurDeRapport(string b)
        {
            switch (LireRapport(b))
            {
                case Rapport.Poor:      return Rouge;
                case Rapport.Fair:      return Or;
                case Rapport.Good:      return Vert;
                case Rapport.Excellent: return Vert;
                default: throw new System.ArgumentOutOfRangeException(nameof(b), b, "CouleurDeRapport");
            }
        }

        // ── coût : cheap · moderate · expensive · very_expensive ──

        public enum Cout { Cheap, Moderate, Expensive, VeryExpensive }

        public static Cout LireCout(string b)
        {
            switch (b)
            {
                case "cheap":          return Cout.Cheap;
                case "moderate":       return Cout.Moderate;
                case "expensive":      return Cout.Expensive;
                case "very_expensive": return Cout.VeryExpensive;
                default: throw new System.ArgumentOutOfRangeException(nameof(b), b,
                    "DemolitionResolvers.LireCout : bande non résolue.");
            }
        }

        public static string PhraseDeCout(string b)
        {
            switch (LireCout(b))
            {
                case Cout.Cheap:         return "trois fois rien";
                case Cout.Moderate:      return "raisonnable";
                case Cout.Expensive:     return "cher";
                case Cout.VeryExpensive: return "très cher";
                default: throw new System.ArgumentOutOfRangeException(nameof(b), b, "PhraseDeCout");
            }
        }

        public static Color CouleurDeCout(string b)
        {
            switch (LireCout(b))
            {
                case Cout.Cheap:         return Vert;
                case Cout.Moderate:      return Or;
                case Cout.Expensive:     return Ambre;
                case Cout.VeryExpensive: return Rouge;
                default: throw new System.ArgumentOutOfRangeException(nameof(b), b, "CouleurDeCout");
            }
        }

        /// <summary>⛔⛔ LA TABLE DE LA MAQUETTE ÉTAIT FAUSSE, ET SEULE LA MESURE L'A DIT.
        /// `generateur-demol.py` nomme six types (`lab`, `refinery`, `press_house`, `safehouse`,
        /// `front`, `warehouse`). Or le back sert `cash_safehouse` et `front_shop` — mesuré sur
        /// les DEUX seules offres qu'une parcelle libérée produit réellement. Un écran qui aurait
        /// recopié la table de la maquette aurait affiché du vide sur ses deux seules lignes.
        /// ⇒ Les douze membres ci-dessous viennent de l'enum PostgreSQL
        ///   (`db/schema/operational_chain.ts:28-31`, `building_operational_type`), pas d'une
        ///   lecture de maquette : c'est le domaine FERMÉ, donc le seul dénominateur honnête.
        /// ⚠️ Repli NON jetant ici, et c'est délibéré : un type inconnu se montre BRUT plutôt que
        /// de faire tomber l'écran. Ce n'est pas une correspondance qui décide d'un GESTE — c'est
        /// un libellé. On voit le trou au lieu de le masquer, et personne ne perd sa parcelle.</summary>
        public static string NomDeType(string t)
        {
            switch (t)
            {
                case "front_shop":        return "Une façade";
                case "cash_safehouse":    return "Une planque";
                case "stash":             return "Une cache";
                case "lab":               return "Un labo";
                case "grow_house":        return "une serre";
                case "refinery":          return "Une raffinerie";
                case "press_house":       return "Une presse";
                case "distribution_hub":  return "Un point de distribution";
                case "office":            return "Un bureau";
                case "dealer_spot_front": return "Un point de vente";
                case "money_holding":     return "Une société-écran";
                case "specialized_lab":   return "Un labo spécialisé";
                default:                  return string.IsNullOrEmpty(t) ? "Un bâtiment" : t;
            }
        }
    }
}
