using System;
using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.EventSystems;
using UnityEngine.InputSystem.UI;
using UnityEngine.UI;
using TMPro;
using MafiaCleanCity.Shell;
using MafiaCleanCity.Theme;
using MafiaCleanCity.CityMap;   // REUSE WorldApiClient + CityProjectionsClient (découverte du hub, §3/§4)
using MafiaCleanCity.I18n;

namespace MafiaCleanCity.Operational
{
    /// <summary>ecran_distribution « La distribution » (㉘) — « la ficelle sur le liège », sur
    /// ses données réelles.
    ///
    /// Patron : `ChaineDApproScreenController` (㉚, le voisin le plus récent de la même famille de
    /// maquette — découverte de bâtiment par districts+interior, résolveurs nommés, pis-aller
    /// consignés). Maquette : `Tools/juge-visuel/v6/m-54.png` (repos) .. `m-58.png` — voir
    /// implementation-notes.md § Deviations pour ce que m-57/m-58 n'ont PAS de source.
    ///
    /// ⛔⛔ TROIS CONTRATS DU BRIEF ÉTAIENT FAUX OU INCOMPLETS, CORRIGÉS PAR LA MESURE DU 2026-09-03
    /// (`rtk proxy curl` — un `curl` nu sur cet arbre rend un SCHÉMA DE TYPES au lieu du corps
    /// réel, voir implementation-notes.md § Deviations) :
    ///  1. `POST .../dispatch` prend `{from_building_id, to_building_id, cargo_grams}` — PAS de
    ///     `vehicle_type` ni de `route_id`. La projection (`GET .../projection`) NE PORTE AUCUN
    ///     identifiant de bâtiment : la « route » affichée sur le liège et le couple
    ///     (from,to) que `dispatch` exige sont STRUCTURELLEMENT INDISCOUVRABLES l'un depuis
    ///     l'autre par les 4 routes données. Voir `DecouvrirRoute`.
    ///  2. « Le labo de Spine-B » / « Le comptoir de Lattice-A » NE SONT PAS de la fiction pure :
    ///     `Spine-B`/`Lattice-A` sont des `name_canonical` RÉELS de `GET /v1/world/districts`
    ///     (districts 5 et 8 sur ce compte). Mais le joueur de démo NE POSSÈDE AUCUN bâtiment
    ///     dans ces deux districts précis (ses bâtiments vivent en `Tidewater-1`, `Stack-1`,
    ///     `Glass-1`, `Verge-A`) — la maquette montre donc un exemple à valeurs fixes, pas ce
    ///     compte. `LabelBatiment` construit le MÊME GENRE de libellé (type + `name_canonical`
    ///     réel du bâtiment DÉCOUVERT), jamais les littéraux de la maquette recopiés tels quels.
    ///  3. `available_vehicles` ne contredit pas les 2 courriers BIKE déjà possédés — MESURÉ :
    ///     c'est la flotte ACHETÉE (`POST .../vehicles/purchase`) qui le peuple, pas les courriers
    ///     existants. Voir `DistributionRouteDto`.
    ///
    /// GÉOMÉTRIE — deux règles héritées, non négociables (mesurées ailleurs dans ce dépôt) :
    ///  · aucune valeur dérivée de `Screen.*` ni d'un `rect` lu au montage — passer par
    ///    `EchelleMaquette.Px(...)`. Maquette source NON confirmée (même trou que ㉚, voir
    ///    implementation-notes.md § Deviations) : `LargeurEcransBrennar` (300) conservé.
    ///  · `Canvas.scaleFactor` lu la frame de la création rend 1,0 — plausible et faux. Toute
    ///    lecture de géométrie attend `yield return null` après la construction.</summary>
    public class DistributionScreenController : MonoBehaviour, IShellTenant
    {
        [Header("Backend")]
        [SerializeField] private string baseUrl = "http://localhost";

        // ---- points d'injection du shell (IShellTenant) -----------------------------------
        private Transform mountParent;

        /// <summary>Construit dès que le parent est connu — patron `ChaineDApproScreenController`
        /// / gabarit corrigé (`Tools/nouvel-ecran.py`) : `Awake()` court dans `AddComponent<T>()`,
        /// AVANT que l'appelant ait pu poser le parent.</summary>
        public void SetMountParent(Transform parent)
        {
            mountParent = parent;

            // ⛔⛔ L'HÔTE N'EST PAS UN `RectTransform` (mesuré : `AppShell.ConstruireLocataire`
            // crée l'hôte par `new GameObject($"Tenant_...")`, `Transform` nu) — demandé
            // EXPLICITEMENT, jamais supposé.
            RectTransform rtHote = transform as RectTransform;
            if (rtHote == null) rtHote = gameObject.AddComponent<RectTransform>();
            rtHote.anchorMin = Vector2.zero;
            rtHote.anchorMax = Vector2.one;
            rtHote.offsetMin = Vector2.zero;
            rtHote.offsetMax = Vector2.zero;

            // Ordre de fratrie — l'HÔTE, pas la racine : c'est lui qui est frère des autres
            // locataires sous `ContentSlot`.
            transform.SetAsLastSibling();
        }

        private string token;
        public void SetToken(string t) => token = t;

        // ---- crochets de test ---------------------------------------------------------------
        public GetOperationalCouriersResponseDto DernierChargementCouriers { get; private set; }
        public GetOperationalDistributionProjectionResponseDto DernierChargementProjection { get; private set; }
        public string DerniereErreur { get; private set; }
        public long DernierCodeErreur { get; private set; }
        /// <summary>Le hub de distribution découvert par `DecouvrirRoute` — crochet de test.</summary>
        public string FromBuildingId { get; private set; }
        public string FromLabel { get; private set; }
        /// <summary>Peut rester `null` — voir `DecouvrirRoute` : aucune destination n'est
        /// garantie découvrable (aucun `front_shop`/`dealer_spot_front` sur ce compte au-delà du
        /// hub lui-même n'est une prémisse assurée).</summary>
        public string ToBuildingId { get; private set; }
        public string ToLabel { get; private set; }
        public string LieutenantLabel { get; private set; }
        public bool DernierAchatOk { get; private set; }
        /// <summary>Les textes RÉELLEMENT rendus, dans l'ordre — crochet de test (patron
        /// `ExceptionQueueController.RenderedTexts` / ㉚).</summary>
        public IReadOnlyList<string> RenderedTexts => renderedTexts;
        private readonly List<string> renderedTexts = new List<string>();

        private RectTransform racinePleinEcran;
        private DistributionClient client;
        private bool initialise;
        private bool chargementAmorce;

        private float Px(float css) =>
            EchelleMaquette.Px(css, racinePleinEcran, EchelleMaquette.LargeurEcransBrennar);
        private int PxTrait(float css) =>
            EchelleMaquette.PxTrait(css, racinePleinEcran, EchelleMaquette.LargeurEcransBrennar);

        // ⚠️ PAS d'appel depuis `Awake()` : il court dans `AddComponent`, avant tout parentage.
        private void Start()
        {
            if (transform.parent != null) transform.SetAsLastSibling();
            EnsureInitialized();
            EnsureEventSystem();
            // ⛔⛔ L'ÉCRAN SE CHARGE LUI-MÊME AU MONTAGE — sans cette ligne il se construit et
            // reste VIDE POUR TOUJOURS. Le shell monte le locataire et lui passe un jeton ; il
            // n'appelle JAMAIS `Charger()`. Défaut payé sur ㉚ : `Charger()` défini, aucun
            // appelant, capture en échec sur « chargement non abouti après 20 s ». Et les tests
            // de CET écran ne peuvent pas voir ce trou : ils appellent `Charger()` eux-mêmes —
            // c'est la capture, et elle seule, qui l'aurait trouvé.
            if (!chargementAmorce) { chargementAmorce = true; StartCoroutine(Charger()); }
            transform.SetAsLastSibling();
        }

        private void EnsureInitialized()
        {
            if (initialise) return;
            initialise = true;
            client = new DistributionClient { BaseUrl = baseUrl };
            BuildLayout();
        }

        private void EnsureEventSystem()
        {
            if (FindFirstObjectByType<EventSystem>() == null)
            {
                GameObject es = new GameObject("EventSystem", typeof(EventSystem));
                es.AddComponent<InputSystemUIInputModule>();
            }
        }

        // ═══ §3/§4 — Découverte du hub de distribution (et, si possible, d'une destination) ═════
        //
        // ⛔ AUCUNE ROUTE NE LISTE LES BÂTIMENTS DU JOUEUR (même trou que ㉚). Balayage
        // districts → interior, REUSE `MafiaCleanCity.CityMap.WorldApiClient`/
        // `CityProjectionsClient` (DRY). Coût mesuré sur ce compte : le hub de distribution vit en
        // district 1 (1er scanné) ; une destination `front_shop`/`dealer_spot_front` vit en
        // district 16 — donc 16 appels `interior` dans le pire cas mesuré ici, jusqu'à 18 en
        // pire cas théorique (aucun distribution_hub trouvé).
        //
        // ⛔⛔ CE QUI N'EST PAS RÉSOLU, ET NE PEUT PAS L'ÊTRE PAR CES 4 ROUTES : la « route »
        // affichée sur le liège (`sinuosity_bucket`/`river_crossings_count_bucket`/`route_state`)
        // n'a AUCUN identifiant de bâtiment — `dispatch` en exige deux. Ce hub-ci (`from`) est
        // donc RÉEL et mesuré ; la destination (`to`) est un HEURISTIQUE (le premier point de
        // vente du joueur trouvé, hors du hub) et non une lecture d'une route affichée — voir
        // implementation-notes.md § Deviations. Si aucune destination n'est trouvée, `ToBuildingId`
        // reste `null` et `RendrePied` le dit honnêtement plutôt que de fabriquer un id.
        private IEnumerator DecouvrirRoute(Action onOk, Action<string> onErr)
        {
            var world = new WorldApiClient { BaseUrl = baseUrl };
            List<DistrictDto> districts = null;
            string errDistricts = null;
            yield return world.GetDistricts(d => districts = d, e => errDistricts = e);
            if (districts == null)
            {
                onErr?.Invoke($"GET /v1/world/districts indisponible : {errDistricts}");
                yield break;
            }

            var proj = new CityProjectionsClient { BaseUrl = baseUrl };
            string fromId = null, fromLabel = null, toId = null, toLabel = null, lieutenantLabel = null;

            foreach (DistrictDto d in districts)
            {
                DistrictInteriorDto interior = null;
                long codeInterior = 0;
                yield return proj.Interior(d.id, token, i => interior = i, c => codeInterior = c);
                if (interior == null || interior.buildings == null) continue;

                foreach (DistrictInteriorBuildingDto b in interior.buildings)
                {
                    if (fromId == null && b.operational_type == "distribution_hub")
                    {
                        fromId = b.building;
                        fromLabel = LabelBatiment(b, interior);
                        lieutenantLabel = LabelLieutenant(b, interior);
                    }
                    else if (fromId != null && toId == null && b.building != fromId &&
                             (b.operational_type == "front_shop" || b.operational_type == "dealer_spot_front"))
                    {
                        toId = b.building;
                        toLabel = LabelBatiment(b, interior);
                    }
                }
                if (fromId != null && toId != null) break;
            }

            if (fromId == null)
            {
                onErr?.Invoke("aucun distribution_hub trouvé parmi les districts possédés — la " +
                              "prémisse de cet écran (un hub de distribution) ne tient pas ici");
                yield break;
            }
            FromBuildingId = fromId;
            FromLabel = fromLabel;
            ToBuildingId = toId;   // peut rester null — voir RendrePied
            ToLabel = toLabel;
            LieutenantLabel = lieutenantLabel;
            onOk?.Invoke();
        }

        /// <summary>Traduction GÉNÉRIQUE `operational_type` → nom de bâtiment lisible — seuls les
        /// 10 types RÉELLEMENT rencontrés sur ce compte (2026-09-03) sont nommés ; repli GRACIEUX
        /// (littéral brut) pour les 2 restants du domaine à 12 membres, jamais un throw : ce
        /// n'est pas un domaine fermé annoncé par une erreur, juste une énumération observée.</summary>
        private static string NomTypeBatiment(string operationalType)
        {
            switch (operationalType)
            {
                case "distribution_hub": return "l'entrepôt de distribution";
                case "specialized_lab":
                case "lab": return "le labo";
                case "refinery": return "la raffinerie";
                case "money_holding": return "la caisse";
                case "stash": return "la planque";
                case "front_shop": return "la boutique";
                case "dealer_spot_front": return "le comptoir";
                case "cash_safehouse": return "la planque-coffre";
                case "grow_house": return "la ferme";
                default: return string.IsNullOrEmpty(operationalType) ? "le bâtiment" : operationalType;
            }
        }

        /// <summary>« Le [type] de [district] » — MÊME FORME que la maquette (« Le labo de
        /// Spine-B ») mais avec le VRAI `name_canonical` du district où vit le bâtiment
        /// DÉCOUVERT, jamais les littéraux fixes de la maquette (voir le commentaire de classe,
        /// point 2).</summary>
        private static string LabelBatiment(DistrictInteriorBuildingDto b, DistrictInteriorDto district)
        {
            string typeNom = NomTypeBatiment(b.operational_type);
            string prefixMaj = typeNom.Length > 0
                ? char.ToUpperInvariant(typeNom[0]) + typeNom.Substring(1)
                : typeNom;
            return string.IsNullOrEmpty(district.name_canonical)
                ? prefixMaj
                : prefixMaj + " de " + district.name_canonical;
        }

        /// <summary>Le nom du lieutenant assigné au bâtiment, joint via `lieutenant_ids[0]` →
        /// `district.lieutenants[].lieutenant_id` (forme mesurée : `Lt. Hara` sur le hub du
        /// compte de démo). `null` si le bâtiment n'a aucun lieutenant assigné — `RendrePied`
        /// retombe alors sur le pis-aller littéral de la maquette (« Dima »).</summary>
        private static string LabelLieutenant(DistrictInteriorBuildingDto b, DistrictInteriorDto district)
        {
            if (b.lieutenant_ids == null || b.lieutenant_ids.Length == 0 || district.lieutenants == null)
                return null;
            string id = b.lieutenant_ids[0];
            foreach (DistrictLieutenantDto l in district.lieutenants)
                if (l.lieutenant_id == id) return l.name;
            return null;
        }

        // ═══ Chargement ══════════════════════════════════════════════════════════════════════

        public IEnumerator Charger()
        {
            EnsureInitialized();
            DerniereErreur = null;
            DernierCodeErreur = 0;

            string errRoute = null;
            yield return DecouvrirRoute(() => { }, e => errRoute = e);
            if (string.IsNullOrEmpty(FromBuildingId))
            {
                DerniereErreur = errRoute ?? "découverte du hub de distribution : échec";
                RendreEtatIndisponible();
                yield break;
            }

            // ⛔ SANS CETTE LIGNE, LES RÉSOLVEURS SONT MUETS (patron ㉚/⑨) : `Libelle.De` rend le
            // littéral tant que le dictionnaire est vide — branchement transparent.
            yield return I18nCatalog.Amorcer(new I18nClient { BaseUrl = baseUrl }, token);

            yield return RechargerCouriers();
            if (DernierChargementCouriers == null) { RendreEtatIndisponible(); yield break; }

            yield return RechargerProjection();
            // Non bloquant si la projection échoue — même idiome que `ChaineDApproScreenController.
            // RechargerChaine` : le board rend un état honnête (« aucune route connue ») plutôt que
            // de casser tout l'écran pour une section secondaire.
            AppliquerEtat();
        }

        private IEnumerator RechargerCouriers()
        {
            DerniereErreur = null;
            DernierCodeErreur = 0;
            DernierChargementCouriers = null;
            yield return client.GetOperationalCouriers(token,
                dto => DernierChargementCouriers = dto,
                (code, msg) => { DernierCodeErreur = code; DerniereErreur = msg; });
            // La frame de création rend des rects non résolus : on attend le layout AVANT de
            // rendre quoi que ce soit qui lise une géométrie.
            yield return null;
        }

        private IEnumerator RechargerProjection()
        {
            DernierChargementProjection = null;
            yield return client.GetOperationalDistributionProjection(token,
                dto => DernierChargementProjection = dto,
                (code, msg) => DerniereErreur = DerniereErreur ?? $"projection : {code} {msg}");
            yield return null;
        }

        /// <summary>Rend un corps FABRIQUÉ, sans réseau — réservé aux tests (patron ㉚/㊲,
        /// `RendrePourTest`). Ne prouve jamais que le back émet ces corps, seulement ce que
        /// l'écran EN FAIT.</summary>
        public void RendrePourTest(GetOperationalCouriersResponseDto couriers,
            GetOperationalDistributionProjectionResponseDto projection,
            string fromLabel = "L'entrepôt de test", string toLabel = "La boutique de test",
            string lieutenantLabel = null)
        {
            EnsureInitialized();
            DernierChargementCouriers = couriers;
            DernierChargementProjection = projection;
            FromBuildingId = "00000000-0000-4000-8000-000000000000";
            FromLabel = fromLabel;
            ToBuildingId = toLabel != null ? "00000000-0000-4000-8000-000000000001" : null;
            ToLabel = toLabel;
            LieutenantLabel = lieutenantLabel;
            AppliquerEtat();
        }

        // ═══ Rendu — piloté par l'agrégat des `transit_band` des courriers (voir le commentaire
        // de classe, point 1 : la projection et les courriers ne partagent AUCUNE clé de
        // jointure — le board ne peut donc PAS être piloté par `route_state`, seulement les 3
        // lignes de détail le sont) ══════════════════════════════════════════════════════════════
        //
        // 3 états, chacun sourcé sur une maquette réelle : en transit (m-55, prioritaire — brief
        // §2 : « en transit, aucun bouton, il faut le DIRE ») · livré (m-56) · repos (m-54,
        // défaut). m-57 (route rompue) et m-58 (coursier arrêté) NE SONT PAS construits — aucune
        // clé mesurée ne les porte (voir implementation-notes.md § Deviations).
        private void AppliquerEtat()
        {
            renderedTexts.Clear();

            bool enTransit = false, arrivee = false;
            if (DernierChargementCouriers?.couriers != null)
            {
                foreach (CourierDto c in DernierChargementCouriers.couriers)
                {
                    if (c.transit_band == "IN_TRANSIT") enTransit = true;
                    else if (c.transit_band == "ARRIVED") arrivee = true;
                }
            }
            bool boutonVisible = !enTransit;

            RendreTitre(enTransit, arrivee);
            RendreCorkboard();
            RendreCouriers();
            RendrePied(enTransit, arrivee, boutonVisible);
        }

        private void RendreTitre(bool enTransit, bool arrivee)
        {
            string titre, sousTitre;
            if (enTransit)
            {
                titre = "Ce qui est sur la route";                                  // m-55, verbatim
                sousTitre = "Un coursier est parti. Voilà le chemin qu'il prend.";   // m-55, verbatim
            }
            else if (arrivee)
            {
                titre = "C'est livré";                                              // m-56, verbatim
                sousTitre = "La marchandise est arrivée. Voilà ce que le trajet a coûté à la route."; // m-56
            }
            else
            {
                titre = "L'envoi de ce soir";                                       // m-54, verbatim
                sousTitre = "On choisit d'où ça part, où ça va, et par quel chemin."; // m-54, verbatim
            }
            titreTexte.text = Libelle.De("distribution", "titre", titre);
            sousTitreTexte.text = Libelle.De("distribution", "sous_titre", sousTitre);
            TrackText(titreTexte.text);
            TrackText(sousTitreTexte.text);
        }

        /// <summary>Le panneau de liège : deux étiquettes (texte SOURCÉ — `FromLabel`/`ToLabel`,
        /// jamais les littéraux « Spine-B »/« Lattice-A » de la maquette, voir le commentaire de
        /// classe) + les 3 lignes en pointillés, résolues depuis la PREMIÈRE route de la
        /// projection (aucun sélecteur dans la maquette — un seul panneau à la fois).
        /// ⚠️ La FICELLE elle-même n'est pas tracée en géométrie exacte — approximation
        /// consignée, voir implementation-notes.md § Deviations : le lien est porté par l'ORDRE
        /// visuel des deux étiquettes et leurs sous-titres D'OÙ ÇA PART / OÙ ÇA VA, pas par un
        /// tracé point-à-point.</summary>
        private void RendreCorkboard()
        {
            ViderEnfants(corkboardRoot);

            GameObject panneau = NouveauUI("Panneau", corkboardRoot);
            AjouterFond(panneau, Liege);
            AddLayoutElement(panneau, preferredHeight: Px(120f), flexibleHeight: 0);
            VerticalLayoutGroup vp = panneau.AddComponent<VerticalLayoutGroup>();
            vp.padding = new RectOffset(PxTrait(14f), PxTrait(14f), PxTrait(14f), PxTrait(14f));
            vp.spacing = Px(24f);
            vp.childControlWidth = true; vp.childControlHeight = true;
            vp.childForceExpandWidth = true; vp.childForceExpandHeight = false;
            vp.childAlignment = TextAnchor.UpperLeft;

            ConstruireEtiquette(panneau.transform, "EtiquetteDepart",
                FromLabel ?? "?", "D'OÙ ÇA PART", TextAlignmentOptions.Left);
            ConstruireEtiquette(panneau.transform, "EtiquetteArrivee",
                ToLabel ?? Libelle.De("distribution", "bloc", "destination à déterminer"),
                "OÙ ÇA VA", TextAlignmentOptions.Right);

            GameObject lignes = NouveauUI("Lignes", corkboardRoot);
            VerticalLayoutGroup vl = lignes.AddComponent<VerticalLayoutGroup>();
            vl.spacing = Px(2f);
            vl.childControlWidth = true; vl.childControlHeight = true;
            vl.childForceExpandWidth = true; vl.childForceExpandHeight = false;
            AddLayoutElement(lignes, flexibleHeight: 0);
            lignesRoot = lignes.transform;

            DistributionRouteDto route = (DernierChargementProjection?.routes != null &&
                                           DernierChargementProjection.routes.Length > 0)
                ? DernierChargementProjection.routes[0] : null;

            if (route == null)
            {
                TextMeshProUGUI msg = NouveauTexteFiche(lignes.transform, "AucuneRoute",
                    Libelle.De("distribution", "bloc", "Aucune route connue pour l'instant."),
                    9f, DesignTokens.Current.onSurfaceMuted, false);
                TrackText(msg.text);
                return;
            }

            ConstruireLigne(lignes.transform, "LE CHEMIN",
                DistributionResolvers.TexteChemin(route.sinuosity_bucket),
                DesignTokens.Current.onSurfacePrimary);
            ConstruireLigne(lignes.transform, "À TRAVERSER",
                DistributionResolvers.TexteTraverser(route.river_crossings_count_bucket),
                DesignTokens.Current.onSurfacePrimary);
            ConstruireLigne(lignes.transform, "CETTE ROUTE",
                DistributionResolvers.TexteRouteState(route.route_state),
                DistributionResolvers.CouleurRouteState(route.route_state, VertBon, DesignTokens.Current.onSurfacePrimary));
        }

        private void ConstruireEtiquette(Transform parent, string nom, string titreBrut,
            string sousTitreLitteral, TextAlignmentOptions alignement)
        {
            GameObject chip = NouveauUI(nom, parent);
            AjouterFond(chip, Creme);
            AddLayoutElement(chip, preferredHeight: Px(34f), flexibleWidth: 1);
            VerticalLayoutGroup v = chip.AddComponent<VerticalLayoutGroup>();
            v.padding = new RectOffset(PxTrait(8f), PxTrait(8f), PxTrait(6f), PxTrait(6f));
            v.childControlWidth = true; v.childControlHeight = true;
            v.childForceExpandWidth = true; v.childForceExpandHeight = false;

            // `titreBrut` = donnée DÉCOUVERTE (nom de bâtiment réel), jamais passée par
            // `Libelle.De` — ce n'est pas une phrase fermée d'interface, c'est du contenu.
            TextMeshProUGUI titre = NouveauTexteFiche(chip.transform, "Titre", titreBrut, 9.5f, EncreSombre, true);
            titre.alignment = alignement;
            titre.enableWordWrapping = true;
            TrackText(titre.text);

            TextMeshProUGUI sous = NouveauTexteFiche(chip.transform, "SousTitre",
                Libelle.De("distribution", "bloc", sousTitreLitteral), 6.5f, EncreSombre, false);
            sous.characterSpacing = 2f;
            sous.alignment = alignement;
            TrackText(sous.text);
        }

        private void ConstruireLigne(Transform parent, string libelleLitteral, string valeur, Color couleurValeur)
        {
            GameObject ligne = NouveauUI("Ligne_" + Libelle.Slug(libelleLitteral), parent);
            HorizontalLayoutGroup h = ligne.AddComponent<HorizontalLayoutGroup>();
            h.childControlWidth = true; h.childControlHeight = true;
            h.childForceExpandWidth = true; h.childForceExpandHeight = false;
            AddLayoutElement(ligne, minHeight: Px(16f), flexibleHeight: 0);

            TextMeshProUGUI lib = NouveauTexteFiche(ligne.transform, "Libelle",
                Libelle.De("distribution", "bloc", libelleLitteral), 7.5f, DesignTokens.Current.onSurfaceMuted, false);
            AddLayoutElement(lib.gameObject, flexibleWidth: 1);
            lib.characterSpacing = 3f;
            TrackText(lib.text);

            TextMeshProUGUI val = NouveauTexteFiche(ligne.transform, "Valeur", valeur, 9.5f, couleurValeur, true);
            val.alignment = TextAlignmentOptions.Right;
            TrackText(val.text);
        }

        /// <summary>Section « VOS COURRIERS » — AUCUNE maquette ne la montre (m-54..m-58 ne
        /// portent qu'UN fil narratif, jamais une liste) ; construite pour satisfaire le brief
        /// §2 (« les courriers, avec leur transit_band »). Chaque ligne : véhicule (résolveur
        /// `TexteVehicule`) + état (résolveur `TexteTransitBand`) + note (`degrading`/
        /// `temperature_status`, JAMAIS de branchement sur la VALEUR de `temperature_status` —
        /// domaine non inventé, consigne du brief : affiché brut, uniquement si non-null).</summary>
        private void RendreCouriers()
        {
            ViderEnfants(couriersRoot);

            TextMeshProUGUI label = NouveauTexteFiche(couriersRoot, "CouriersLabel",
                Libelle.De("distribution", "bloc", "VOS COURRIERS"), 8.5f,
                DesignTokens.Current.onSurfaceSecondary, false);
            label.characterSpacing = 4f;
            TrackText(label.text);

            CourierDto[] couriers = DernierChargementCouriers?.couriers;
            if (couriers == null || couriers.Length == 0)
            {
                TextMeshProUGUI vide = NouveauTexteFiche(couriersRoot, "CouriersVide",
                    Libelle.De("distribution", "bloc", "Aucun courrier pour l'instant."), 9f,
                    DesignTokens.Current.onSurfaceMuted, false);
                TrackText(vide.text);
            }
            else
            {
                foreach (CourierDto c in couriers)
                {
                    GameObject bloc = NouveauUI("Courier_" + c.courier, couriersRoot);
                    AjouterFond(bloc, DesignTokens.Current.surfaceRow);
                    VerticalLayoutGroup vc = bloc.AddComponent<VerticalLayoutGroup>();
                    vc.padding = new RectOffset(PxTrait(8f), PxTrait(8f), PxTrait(5f), PxTrait(5f));
                    vc.spacing = Px(2f);
                    vc.childControlWidth = true; vc.childControlHeight = true;
                    vc.childForceExpandWidth = true; vc.childForceExpandHeight = false;
                    AddLayoutElement(bloc, flexibleHeight: 0);

                    GameObject ligne = NouveauUI("Ligne", bloc.transform);
                    HorizontalLayoutGroup h = ligne.AddComponent<HorizontalLayoutGroup>();
                    h.childControlWidth = true; h.childControlHeight = true;
                    h.childForceExpandWidth = true; h.childForceExpandHeight = false;
                    AddLayoutElement(ligne, minHeight: Px(16f), flexibleHeight: 0);

                    TextMeshProUGUI vehic = NouveauTexteFiche(ligne.transform, "Vehicule",
                        DistributionResolvers.TexteVehicule(c.vehicle_type), 8.5f,
                        DesignTokens.Current.onSurfacePrimary, false);
                    AddLayoutElement(vehic.gameObject, flexibleWidth: 1);
                    TrackText(vehic.text);

                    bool estEnTransit = c.transit_band == "IN_TRANSIT";
                    TextMeshProUGUI bande = NouveauTexteFiche(ligne.transform, "Bande",
                        DistributionResolvers.TexteTransitBand(c.transit_band), 8.5f,
                        estEnTransit ? VertBon : DesignTokens.Current.onSurfaceSecondary, true);
                    bande.alignment = TextAlignmentOptions.Right;
                    TrackText(bande.text);

                    if (c.degrading || !string.IsNullOrEmpty(c.temperature_status))
                    {
                        // `degrading` MESURÉ false sur les 3 — cette branche n'est jamais
                        // exercée sur le compte de démo, voir E4 (test fabriqué).
                        string note = c.degrading
                            ? "La marchandise se dégrade."
                            : c.temperature_status; // valeur BRUTE, domaine non inventé (brief)
                        TextMeshProUGUI n = NouveauTexteFiche(bloc.transform, "Note", note, 7.5f, RougeMauvais, false);
                        TrackText(n.text);
                    }
                }
            }

            // ⚠️ « ACHETER UN VÉLO » — AUCUNE maquette ne la montre (m-54..m-58). Ajoutée pour
            // câbler `POST .../vehicles/purchase` (mesurée en SUCCÈS RÉEL, voir DistributionDtos)
            // — pis-aller de véhicule fixé à "bike" (aucun sélecteur dans la maquette).
            GameObject boutonAchat = NouveauUI("BoutonAcheterVehicule", couriersRoot);
            AjouterFond(boutonAchat, DesignTokens.Current.surfaceRaised);
            Button ba = boutonAchat.AddComponent<Button>();
            ba.targetGraphic = boutonAchat.GetComponent<Image>();
            ba.onClick.AddListener(AcheterVehicule);
            HorizontalLayoutGroup hba = boutonAchat.AddComponent<HorizontalLayoutGroup>();
            hba.padding = new RectOffset(PxTrait(10f), PxTrait(10f), PxTrait(8f), PxTrait(8f));
            hba.childAlignment = TextAnchor.MiddleCenter;
            hba.childControlWidth = true; hba.childControlHeight = true;
            AddLayoutElement(boutonAchat, preferredHeight: Px(26f), flexibleHeight: 0);

            TextMeshProUGUI libAchat = NouveauTexteFiche(boutonAchat.transform, "Libelle",
                Libelle.De("distribution", "bouton", "ACHETER UN VÉLO"), 8.5f,
                DesignTokens.Current.onSurfacePrimary, true);
            TrackText(libAchat.text);
        }

        /// <summary>Le pied : portrait + nom (RÉEL si `LieutenantLabel` a été découvert, sinon
        /// pis-aller « Dima » — littéral de la maquette) + réplique (verbatim par état, aucune
        /// source dynamique) + bouton — gated en 3 façons, dans cet ordre :
        /// (1) `boutonVisible == false` (un courrier `IN_TRANSIT`) → note, PAS de bouton (brief
        ///     §2, correctif payé sur l'écran précédent : le DIRE, pas seulement griser) ;
        /// (2) `ToBuildingId == null` (aucune destination découverte, voir `DecouvrirRoute`) →
        ///     note honnête, PAS de bouton fabriqué sur un id inventé ;
        /// (3) sinon, le bouton, câblé sur `EnvoyerCeSoir()`.</summary>
        private void RendrePied(bool enTransit, bool arrivee, bool boutonVisible)
        {
            ViderEnfants(piedRoot);

            string lieutenantAffiche = LieutenantLabel ?? "Dima"; // pis-aller EXACT de la maquette
            string replique;
            if (enTransit)
                replique = "Il est parti à la nuit. Ça serpente, mais c'est la seule qui évite le pont du Threnny."; // m-55
            else if (arrivee)
                replique = "Livré. Le carton est au comptoir, personne n'a rien vu.";                                // m-56
            else
                replique = "La marchandise est prête au labo. Dites-moi qui part et par où, et je l'enverrai ce soir."; // m-54

            GameObject enTete = NouveauUI("Lieutenant", piedRoot);
            HorizontalLayoutGroup hl = enTete.AddComponent<HorizontalLayoutGroup>();
            hl.spacing = Px(8f);
            hl.childControlWidth = true; hl.childControlHeight = true;
            hl.childForceExpandWidth = false; hl.childForceExpandHeight = false;
            AddLayoutElement(enTete, flexibleHeight: 0);

            // Portrait rond — approximation : un disque plein, aucun asset de portrait mesuré ni
            // mandaté par le brief.
            GameObject portrait = NouveauUI("Portrait", enTete.transform);
            AjouterFond(portrait, DesignTokens.Current.surfaceRow);
            AddLayoutElement(portrait, preferredWidth: Px(26f), preferredHeight: Px(26f));

            GameObject texteBloc = NouveauUI("TexteBloc", enTete.transform);
            VerticalLayoutGroup vt = texteBloc.AddComponent<VerticalLayoutGroup>();
            vt.childControlWidth = true; vt.childControlHeight = true;
            vt.childForceExpandWidth = true; vt.childForceExpandHeight = false;
            AddLayoutElement(texteBloc, flexibleWidth: 1);

            // `lieutenantAffiche` = nom RÉEL découvert ou pis-aller littéral — jamais `Libelle.De`
            // (ce n'est pas une phrase fermée d'interface).
            TextMeshProUGUI nom = NouveauTexteFiche(texteBloc.transform, "Nom", lieutenantAffiche, 10.5f,
                DesignTokens.Current.onSurfacePrimary, true);
            TrackText(nom.text);

            // « LA RÉGULATION · J9 » — aucune source dans les 4 corps mesurés, pis-aller verbatim.
            TextMeshProUGUI roleTexte = NouveauTexteFiche(texteBloc.transform, "Role",
                Libelle.De("distribution", "bloc", "LA RÉGULATION"), 7f,
                DesignTokens.Current.onSurfaceMuted, false);
            roleTexte.characterSpacing = 2f;
            TrackText(roleTexte.text);

            TextMeshProUGUI q = NouveauTexteFiche(piedRoot, "Replique",
                Libelle.De("distribution", "bloc", replique), 9f, DesignTokens.Current.onSurfaceSecondary, false);
            q.fontStyle = FontStyles.Italic;
            q.enableWordWrapping = true;
            TrackText(q.text);

            if (!boutonVisible)
            {
                TextMeshProUGUI note = NouveauTexteFiche(piedRoot, "NoteTransit",
                    Libelle.De("distribution", "bloc",
                        "Il est en chemin. On ne le rappelle pas — on saura à l'arrivée."), 8.5f, // m-55, verbatim
                    DesignTokens.Current.onSurfaceMuted, false);
                note.enableWordWrapping = true;
                TrackText(note.text);
                return;
            }

            if (string.IsNullOrEmpty(ToBuildingId))
            {
                TextMeshProUGUI noteDest = NouveauTexteFiche(piedRoot, "NoteSansDestination",
                    Libelle.De("distribution", "bloc",
                        "Aucune destination connue pour l'envoi de ce soir."), 8.5f,
                    RougeMauvais, false);
                noteDest.enableWordWrapping = true;
                TrackText(noteDest.text);
                return;
            }

            GameObject bouton = NouveauUI("BoutonEnvoyer", piedRoot);
            AjouterFond(bouton, Or);
            Button b = bouton.AddComponent<Button>();
            b.targetGraphic = bouton.GetComponent<Image>();
            b.onClick.AddListener(EnvoyerCeSoir);
            HorizontalLayoutGroup hb = bouton.AddComponent<HorizontalLayoutGroup>();
            hb.padding = new RectOffset(PxTrait(14f), PxTrait(14f), PxTrait(10f), PxTrait(10f));
            hb.childControlWidth = true; hb.childControlHeight = true;
            hb.childForceExpandWidth = false; hb.childForceExpandHeight = false;
            hb.childAlignment = TextAnchor.MiddleLeft;
            AddLayoutElement(bouton, preferredHeight: Px(36f));

            string libLitteral = arrivee ? "TENDRE UNE AUTRE FICELLE" : "ENVOYER CE SOIR"; // m-56 / m-54
            TextMeshProUGUI libBouton = NouveauTexteFiche(bouton.transform, "Libelle",
                Libelle.De("distribution", "bouton", libLitteral), 10.5f, EncreSombre, true);
            libBouton.characterSpacing = 4f;
            TrackText(libBouton.text);
            boutonEnvoyerTexte = libBouton;
            boutonEnvoyer = b;

            // « à pied · ça vide le stock du labo » (m-54, verbatim) — pis-aller conservé même en
            // état « livré » : aucun sous-texte alternatif n'est sourcé pour m-56.
            TextMeshProUGUI sousBouton = NouveauTexteFiche(piedRoot, "SousBouton",
                Libelle.De("distribution", "bloc", "à pied · ça vide le stock du labo"), 7f,
                DesignTokens.Current.onSurfaceMuted, false);
            TrackText(sousBouton.text);
        }

        /// <summary>Repli NOMMÉ sur échec réseau ou prémisse non remplie — jamais une exception,
        /// jamais un écran noir (patron ㊲/㉚).</summary>
        private void RendreEtatIndisponible()
        {
            ViderEnfants(corkboardRoot);
            ViderEnfants(couriersRoot);
            ViderEnfants(piedRoot);
            titreTexte.text = Libelle.De("distribution", "titre", "La distribution est indisponible");
            sousTitreTexte.text = string.IsNullOrEmpty(DerniereErreur)
                ? Libelle.De("distribution", "sous_titre", "Réessayez dans un instant.")
                : DerniereErreur;
            TrackText(titreTexte.text);
            TrackText(sousTitreTexte.text);
        }

        // ═══ Le geste « ENVOYER CE SOIR » ════════════════════════════════════════════════════

        public void EnvoyerCeSoir()
        {
            if (string.IsNullOrEmpty(FromBuildingId) || string.IsNullOrEmpty(ToBuildingId)) return;
            StartCoroutine(EnvoyerCeSoirCoroutine());
        }

        /// <summary>Crochet de test : awaitable, contrairement à `EnvoyerCeSoir()`.</summary>
        public IEnumerator EnvoyerCeSoirEtRecharger() => EnvoyerCeSoirCoroutine();

        private IEnumerator EnvoyerCeSoirCoroutine()
        {
            // ⚠️ `cargo_grams: 1` — pis-aller minimal, AUCUNE UI de quantité dans la maquette
            // (m-54..m-58 : un bouton, zéro sélecteur) — même idiome que `ChaineDApproScreenController.
            // PasserCommandeCoroutine` (`quantity_units: 1`).
            var body = new PostOperationalDistributionDispatchBody
            {
                from_building_id = FromBuildingId,
                to_building_id = ToBuildingId,
                cargo_grams = 1,
            };
            string erreur = null;
            yield return client.PostOperationalDistributionDispatch(token, body,
                dto => { /* réponse JAMAIS mesurée sur ce compte — stock source à zéro */ },
                (code, msg) => erreur = $"{code}: {msg}");
            if (erreur != null)
            {
                DerniereErreur = erreur;
                yield break;
            }
            yield return RechargerCouriers();
            yield return RechargerProjection();
            AppliquerEtat();
        }

        // ═══ Le geste « ACHETER UN VÉLO » ════════════════════════════════════════════════════

        public void AcheterVehicule()
        {
            StartCoroutine(AcheterVehiculeCoroutine());
        }

        public IEnumerator AcheterVehiculeEtRecharger() => AcheterVehiculeCoroutine();

        private IEnumerator AcheterVehiculeCoroutine()
        {
            var body = new PostOperationalVehiclesPurchaseBody { vehicle_type = "bike" };
            string erreur = null;
            PostOperationalVehiclesPurchaseResponseDto rep = null;
            yield return client.PostOperationalVehiclesPurchase(token, body,
                dto => rep = dto,
                (code, msg) => erreur = $"{code}: {msg}");
            if (erreur != null)
            {
                DerniereErreur = erreur;
                yield break;
            }
            DernierAchatOk = rep?.ok ?? false;
            yield return RechargerProjection();
            AppliquerEtat();
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
            // ⛔ SOUS L'HÔTE, PAS SOUS `mountParent` (patron ㉚ / gabarit corrigé) : bâtir sous
            // `mountParent` fait naître la feuille en FRÈRE de l'hôte — toute garde en
            // `GetComponentsInChildren` mesurerait alors un sous-arbre VIDE.
            Transform root = mountParent != null ? transform : canvas.transform;

            GameObject racine = NouveauUI("DistributionRoot", root);
            racinePleinEcran = (RectTransform)racine.transform;
            Etirer(racinePleinEcran);
            AjouterFond(racine, DesignTokens.Current.surfaceBase);
            racinePleinEcran.SetAsLastSibling();

            // ⛔ L'ÉCHELLE AVANT TOUTE CONVERSION — un RectTransform qui vient d'être étiré n'a
            // pas encore son `rect` résolu.
            Canvas.ForceUpdateCanvases();

            GameObject corpsGo = NouveauUI("Corps", racine.transform);
            RectTransform corps = (RectTransform)corpsGo.transform;
            corps.anchorMin = Vector2.zero;
            corps.anchorMax = Vector2.one;
            corps.offsetMin = new Vector2(0f, ShellChrome.BottomInsetPx);
            corps.offsetMax = new Vector2(0f, -ShellChrome.TopInsetPx);

            VerticalLayoutGroup pile = corpsGo.AddComponent<VerticalLayoutGroup>();
            pile.padding = new RectOffset(PxTrait(16f), PxTrait(16f), PxTrait(14f), PxTrait(14f));
            pile.spacing = Px(12f);
            pile.childControlWidth = true; pile.childControlHeight = true;
            pile.childForceExpandWidth = true; pile.childForceExpandHeight = false;
            pile.childAlignment = TextAnchor.UpperCenter;

            titreTexte = NouveauTexteFiche(corpsGo.transform, "Titre", "",
                17f, DesignTokens.Current.onSurfacePrimary, true);
            titreTexte.enableWordWrapping = true;

            sousTitreTexte = NouveauTexteFiche(corpsGo.transform, "SousTitre", "",
                10f, DesignTokens.Current.onSurfaceSecondary, false);
            sousTitreTexte.enableWordWrapping = true;
            AddLayoutElement(sousTitreTexte.gameObject, flexibleHeight: 0);

            GameObject corkboardGo = NouveauUI("Corkboard", corpsGo.transform);
            VerticalLayoutGroup vcb = corkboardGo.AddComponent<VerticalLayoutGroup>();
            vcb.spacing = Px(6f);
            vcb.childControlWidth = true; vcb.childControlHeight = true;
            vcb.childForceExpandWidth = true; vcb.childForceExpandHeight = false;
            AddLayoutElement(corkboardGo, flexibleHeight: 0);
            corkboardRoot = corkboardGo.transform;

            GameObject couriersGo = NouveauUI("Couriers", corpsGo.transform);
            VerticalLayoutGroup vco = couriersGo.AddComponent<VerticalLayoutGroup>();
            vco.spacing = Px(4f);
            vco.childControlWidth = true; vco.childControlHeight = true;
            vco.childForceExpandWidth = true; vco.childForceExpandHeight = false;
            AddLayoutElement(couriersGo, flexibleHeight: 0);
            couriersRoot = couriersGo.transform;

            GameObject piedGo = NouveauUI("Pied", corpsGo.transform);
            VerticalLayoutGroup vp = piedGo.AddComponent<VerticalLayoutGroup>();
            vp.spacing = Px(8f);
            vp.childControlWidth = true; vp.childControlHeight = true;
            vp.childForceExpandWidth = true; vp.childForceExpandHeight = false;
            AddLayoutElement(piedGo, flexibleHeight: 1);
            piedRoot = piedGo.transform;
        }

        private Transform corkboardRoot, lignesRoot, couriersRoot, piedRoot;
        private TextMeshProUGUI titreTexte, sousTitreTexte, boutonEnvoyerTexte;
        private Button boutonEnvoyer;

        // ═══ Palette — locale, patron ㉚ (aucun token `DesignTokens` dédié à une fiche crème/liège
        // n'existe — ceux qui existent servent un AUTRE consommateur mesuré). ═══════════════════
        private static readonly Color Creme = Hex("#eae0c8");
        private static readonly Color EncreSombre = Hex("#241804");
        // ⚠️ ESTIMÉ VISUELLEMENT SUR LA MAQUETTE, NON ÉCHANTILLONNÉ AU PIXEL (aucun outil de
        // lecture de pixel disponible cette passe — même trou que ㉚, voir implementation-notes.md).
        private static readonly Color Liege = Hex("#7a5230");
        private static readonly Color Or = Hex("#d9ab4e");
        private static Color RougeMauvais => DesignTokens.Current.accentDanger;
        private static Color VertBon => DesignTokens.Current.accentSuccess;

        private static Color Hex(string h)
        {
            ColorUtility.TryParseHtmlString(h, out Color c);
            return c;
        }

        // ═══ Primitives — dupliquées par convention (aucun fichier du dépôt ne les partage,
        // mesuré sur `main` le 2026-09-02) ═════════════════════════════════════════════════════

        private static GameObject NouveauUI(string nom, Transform parent)
        {
            GameObject go = new GameObject(nom, typeof(RectTransform));
            go.transform.SetParent(parent, false);
            return go;
        }

        /// <summary>⛔ TOUTE Image passe par ici — `AddComponent<T>()` à l'exécution n'honore PAS
        /// le `[RequireComponent(CanvasRenderer)]` d'une classe de base (mesuré sur ce dépôt :
        /// `VerticalGradientImage`, deux panneaux jamais visibles, sans erreur console).</summary>
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

        private TextMeshProUGUI NouveauTexteFiche(Transform parent, string nom, string texte,
                                                   float corpsCss, Color couleur, bool gras)
        {
            GameObject go = NouveauUI(nom, parent);
            if (go.GetComponent<CanvasRenderer>() == null) go.AddComponent<CanvasRenderer>();
            TextMeshProUGUI t = go.AddComponent<TextMeshProUGUI>();
            t.font = DesignTokens.Current.primaryFont;
            t.text = texte;
            t.fontSize = Px(corpsCss);   // un corps de texte à 0 est un défaut de rendu
            t.color = couleur;
            t.fontStyle = gras ? FontStyles.Bold : FontStyles.Normal;
            t.raycastTarget = false;
            return t;
        }

        private void TrackText(string texte)
        {
            if (!string.IsNullOrEmpty(texte)) renderedTexts.Add(texte);
        }

        private static void ViderEnfants(Transform parent)
        {
            if (parent == null) return;
            for (int i = parent.childCount - 1; i >= 0; i--)
                UnityEngine.Object.Destroy(parent.GetChild(i).gameObject);
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

        private static void Etirer(RectTransform rt, float marge = 0f)
        {
            rt.anchorMin = Vector2.zero;
            rt.anchorMax = Vector2.one;
            rt.offsetMin = new Vector2(marge, marge);
            rt.offsetMax = new Vector2(-marge, -marge);
        }
    }

    /// <summary>ecran_distribution — les correspondances « valeur du domaine → apparence »,
    /// chacune en FONCTION NOMMÉE prenant la valeur du domaine (patron `HeatBucketResolver` /
    /// `ChaineDApproResolvers`) — jamais un switch recopié deux fois, jamais une correspondance
    /// portée par l'ordre d'un tableau ou par un commentaire.
    ///
    /// ⚠️ QUATRE DOMAINES, AUCUN CONFIRMÉ FERMÉ PAR UN MESSAGE D'ERREUR (contrairement à
    /// `supplier_pressure_bucket` de ㉚) — TOUS les résolveurs ci-dessous ont donc un repli
    /// GRACIEUX (jamais un `throw`) : une valeur non listée est affichée BRUTE plutôt que de
    /// faire planter l'écran sur une vraie valeur back simplement non observée ici.</summary>
    public static class DistributionResolvers
    {
        /// <summary>`sinuosity_bucket` — 2 valeurs MESURÉES (2026-09-03, 3 routes réelles) :
        /// "direct" (1x), "meandering" (2x). "tortuous" est une HYPOTHÈSE DE CLÉ tirée de m-57
        /// (jamais observée).</summary>
        public static string TexteChemin(string bucket)
        {
            switch (bucket)
            {
                case "direct": return "droit — le plus court";                    // m-54, MESURÉ
                case "meandering": return "ça serpente — plus long, plus discret"; // m-55/56, MESURÉ
                case "tortuous": return "tordu — beaucoup de détours";             // m-57 — hypothèse
                default: return string.IsNullOrEmpty(bucket) ? "chemin : état inconnu" : bucket;
            }
        }

        /// <summary>`river_crossings_count_bucket` — 2 valeurs MESURÉES : "none" (1x), "single"
        /// (2x). "multiple" est une hypothèse tirée de m-57 (« trois ponts » — jamais
        /// observée).</summary>
        public static string TexteTraverser(string bucket)
        {
            switch (bucket)
            {
                case "none": return "aucune rivière";  // m-54, MESURÉ
                case "single": return "un pont";        // m-55/56, MESURÉ
                case "multiple": return "trois ponts";  // m-57 — hypothèse
                default: return string.IsNullOrEmpty(bucket) ? "traversée : état inconnu" : bucket;
            }
        }

        /// <summary>`route_state` — UNE SEULE valeur MESURÉE sur les 3 routes : "active" (3/3).
        /// ⛔ `severed`/`saturated` N'EXISTENT PAS comme clés séparées (le brief le disait,
        /// confirmé) — aucune AUTRE valeur de `route_state` n'a été observée non plus. « tient »
        /// est la lecture retenue pour "active" (m-55, vert) : aucune maquette ne nomme "active"
        /// littéralement, c'est une inférence documentée, pas une mesure.</summary>
        public static string TexteRouteState(string state)
        {
            switch (state)
            {
                case "active": return "tient"; // m-55 — lecture retenue, voir implementation-notes.md
                default: return string.IsNullOrEmpty(state) ? "état inconnu" : state;
            }
        }

        public static Color CouleurRouteState(string state, Color succes, Color neutre)
        {
            switch (state)
            {
                case "active": return succes;
                default: return neutre;
            }
        }

        /// <summary>`transit_band` (courriers) — 2 valeurs MESURÉES sur les 3 courriers du
        /// compte : "ARRIVED", "IDLE". "IN_TRANSIT" est ANNONCÉ par le brief mais JAMAIS observé
        /// ici — traité en hypothèse, repli gracieux.</summary>
        public static string TexteTransitBand(string band)
        {
            switch (band)
            {
                case "ARRIVED": return "arrivé";
                case "IDLE": return "prêt";
                case "IN_TRANSIT": return "en chemin"; // hypothèse — jamais observée sur ce compte
                default: return string.IsNullOrEmpty(band) ? "état inconnu" : band;
            }
        }

        /// <summary>`vehicle_type` — DEUX CASSES MESURÉES SUR DEUX ROUTES DIFFÉRENTES (fait à
        /// rapporter, voir `CourierDto`) : `GET .../couriers` rend "FOOT"/"BIKE" (MAJUSCULES) ;
        /// le message 422 de `POST .../vehicles/purchase` annonce foot|bike|car|refrigerated_van
        /// (minuscules). Comparaison en `ToUpperInvariant()` pour ne pas dupliquer la table.</summary>
        public static string TexteVehicule(string type)
        {
            if (string.IsNullOrEmpty(type)) return "véhicule inconnu";
            switch (type.ToUpperInvariant())
            {
                case "FOOT": return "à pied";
                case "BIKE": return "à vélo";
                case "CAR": return "en voiture";
                case "REFRIGERATED_VAN": return "en camion réfrigéré";
                default: return type;
            }
        }
    }
}
