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
        private string baseUrlPose;   // posée par un appelant (tests, shell) ; sinon la source unique
        private string baseUrl { get => baseUrlPose ?? MafiaCleanCity.AdresseDuBack.Url; set => baseUrlPose = value; }
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
        /// <summary>Garde de classe des refus (f2 2026-09-26) — la phrase SERVIE du refus de la route qui a échoué
        /// (`client.DernierePhraseDeRefus`, lue dans son onErr), montrée au sous-titre de l'état indisponible ; sinon la phrase
        /// de l'écran. `DerniereErreur` reste TECHNIQUE (crochet de test), jamais affiché.</summary>
        public string PhraseDuRefus { get; private set; }
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
        /// <summary>⛔ LA POIGNÉE, PARCE QUE LE DRAPEAU SEUL NE FERME QUE LE DÉMARRAGE — précision
        /// mesurée par la session B, relayée par l'orchestrateur, appliquée ici aux quatre écrans du
        /// chantier C. `Charger()` ne lit `chargementAmorce` qu'AVANT de partir : une coroutine déjà
        /// en vol l'a donc franchi, elle attend le réseau, et elle rendra PAR-DESSUS le rendu du test
        /// quelques frames plus tard. Mon correctif d'hier ne fermait que le cas où `Start()` n'était
        /// pas encore parti — c'est-à-dire pas la fenêtre qui dépend de la latence du back, la seule
        /// qui rougisse vraiment.
        /// ⇒ *Une garde placée à l'entrée d'une coroutine ne protège que de son DÉMARRAGE, jamais de
        ///   son achèvement.* Il faut l'ARRÊTER, pas seulement lui interdire de commencer.</summary>
        private Coroutine coroutineChargement;

        /// <summary>⛔ ET LE DRAPEAU RELU APRÈS CHAQUE `yield`, qui n'est PAS redondant avec le
        /// `StopCoroutine` ci-dessus : celui-ci n'atteint que la coroutine dont on a gardé la poignée.
        /// Une reprise lancée par un autre chemin (bouton « réessayer », rechargement) n'y est pas, et
        /// elle rendrait quand même. Le drapeau, lui, est lu par TOUTE instance de `Charger()` à chaque
        /// reprise. *Deux mécanismes pour deux populations : la coroutine qu'on tient, et celles qu'on
        /// ne tient pas.*</summary>
        private bool renduExpliciteDemande;

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
            if (!chargementAmorce) { chargementAmorce = true; coroutineChargement = StartCoroutine(Charger()); }
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
        // ★ `GET /v1/me/buildings` liste les bâtiments du joueur en UN appel (mesuré 2026-09-22 : 200,
        // 17 bâtiments sur 4 districts pour le compte de démo ; corps commité sous
        // `Tools/juge-donnees/police/pont-district-2026-09-22/`). Avant, cet écran tenait pour mesuré
        // qu'aucune route ne les listait et balayait jusqu'à 18 intérieurs — la route existait
        // (`player-buildings.controller.ts:89`) et le client l'appelait 0 fois.
        // Le hub (`from`) est le premier `distribution_hub` possédé ; la destination (`to`) reste un
        // HEURISTIQUE (le premier point de vente hors du hub) — voir implementation-notes.md
        // § Deviations. Sans destination, `ToBuildingId` reste `null` et `RendrePied` le dit.
        // ⚠️ CE QUE `me/buildings` NE SERT PAS : le nom du lieutenant affecté (seulement ses ids) et le
        // nom canon du district. Ils vivent dans l'intérieur du district — donc UN appel `interior`,
        // celui du district du hub, au lieu de dix-huit. Les libellés de bâtiment portent le nom de
        // fiction du district (`district_name`, servi par bâtiment).
        //
        // ⛔⛔ CE QUI N'EST PAS RÉSOLU, ET NE PEUT PAS L'ÊTRE PAR CES ROUTES : la « route »
        // affichée sur le liège (`sinuosity_bucket`/`river_crossings_count_bucket`/`route_state`)
        // n'a AUCUN identifiant de bâtiment — `dispatch` en exige deux. Ce hub-ci (`from`) est
        // donc RÉEL et mesuré ; la destination (`to`) est un HEURISTIQUE et non une lecture d'une
        // route affichée.
        private IEnumerator DecouvrirRoute(Action onOk, Action<string> onErr)
        {
            var mes = new MesBatimentsClient { BaseUrl = baseUrl };
            BatimentPossedeDto[] possedes = null;
            string errMes = null;
            yield return mes.Lire(token, bs => possedes = bs, (c, m) => errMes = $"{c} {m}");
            PossedesLus = possedes;
            if (possedes == null)
            {
                Debug.LogWarning($"[㉘] me/buildings indisponible : {errMes}");
                onErr?.Invoke(null);   // null = panne : le sous-titre retombe sur la formule maison
                yield break;
            }
            BatimentPossedeDto hub = PremierRelais(possedes), destination = null;
            if (hub == null)
            {
                AucunRelais = true;   // réponse VIDE, pas une erreur : l'état vide de la table 63 le dit
                onErr?.Invoke("aucun distribution_hub trouvé parmi les districts possédés — la " +
                              "prémisse de cet écran (un hub de distribution) ne tient pas ici");
                yield break;
            }
            foreach (BatimentPossedeDto b in possedes)
                if (b != null && !string.IsNullOrEmpty(b.building) && b.building != hub.building &&
                    (b.operational_type == "front_shop" || b.operational_type == "dealer_spot_front")) { destination = b; break; }
            // le nom du lieutenant ne vit que dans l'intérieur : UN appel, celui du district du hub
            var proj = new CityProjectionsClient { BaseUrl = baseUrl };
            DistrictInteriorDto interieurDuHub = null;
            yield return proj.Interior(hub.district_id, token, i => interieurDuHub = i, _ => { });
            FromBuildingId = hub.building;
            FromLabel = LabelBatiment(hub);
            ToBuildingId = destination?.building;   // peut rester null — voir RendrePied
            ToLabel = destination == null ? null : LabelBatiment(destination);
            LieutenantLabel = LabelLieutenant(hub.lieutenant_ids, interieurDuHub);
            onOk?.Invoke();
        }

        /// <summary>Traduction GÉNÉRIQUE `operational_type` → nom de bâtiment lisible — seuls les
        /// 10 types RÉELLEMENT rencontrés sur ce compte (2026-09-03) sont nommés ; repli GRACIEUX
        /// (littéral brut) pour les 2 restants du domaine à 12 membres, jamais un throw : ce
        /// n'est pas un domaine fermé annoncé par une erreur, juste une énumération observée.</summary>
        public static string NomTypeBatiment(string operationalType)
        {
            switch (operationalType)
            {
                case "distribution_hub": return MafiaCleanCity.I18n.Libelle.De("distribution", "bloc", "le relais");
                // D12 (atelier 30 v2) : un mot par type, celui du catalogue `building.type.*` — `specialized_lab` n'est plus « le labo ».
                case "specialized_lab": return MafiaCleanCity.I18n.Libelle.De("distribution", "bloc", "le labo spécialisé");
                case "lab": return MafiaCleanCity.I18n.Libelle.De("distribution", "bloc", "le labo");
                case "refinery": return MafiaCleanCity.I18n.Libelle.De("distribution", "bloc", "la raffinerie");
                case "money_holding": return MafiaCleanCity.I18n.Libelle.De("distribution", "bloc", "la banque");
                case "stash": return MafiaCleanCity.I18n.Libelle.De("distribution", "bloc", "la réserve");
                case "front_shop": return MafiaCleanCity.I18n.Libelle.De("distribution", "bloc", "le commerce-écran");
                case "dealer_spot_front": return MafiaCleanCity.I18n.Libelle.De("distribution", "bloc", "le coin de vente");
                case "cash_safehouse": return MafiaCleanCity.I18n.Libelle.De("distribution", "bloc", "la planque");
                case "grow_house": return MafiaCleanCity.I18n.Libelle.De("distribution", "bloc", "la serre");
                // D12 : les deux types que le repli « le bâtiment » nommait faute de mot (catalogue : Imprimerie, Agence).
                case "press_house": return MafiaCleanCity.I18n.Libelle.De("distribution", "bloc", "l’imprimerie");
                case "office": return MafiaCleanCity.I18n.Libelle.De("distribution", "bloc", "l’agence");
                default: return MafiaCleanCity.I18n.Repli.LeBatiment;   // repli de NOM (atelier 28) : absent OU hors domaine, la phrase garde son nom — jamais le type brut
            }
        }

        /// <summary>« Le [type] de [district] » — MÊME FORME que la maquette (« Le labo de
        /// Spine-B ») mais avec le VRAI `name_canonical` du district où vit le bâtiment
        /// DÉCOUVERT, jamais les littéraux fixes de la maquette (voir le commentaire de classe,
        /// point 2).</summary>
        private static string LabelBatiment(BatimentPossedeDto b)
        {
            string typeNom = NomTypeBatiment(b.operational_type);
            string prefixMaj = typeNom.Length > 0
                ? char.ToUpperInvariant(typeNom[0]) + typeNom.Substring(1)
                : typeNom;
            // le nom de FICTION du district, servi par bâtiment (« La Lisière ») — le nom canon
            // (« Verge-A ») ne vit que dans l'intérieur, qu'on n'appelle plus par district
            return string.IsNullOrEmpty(b.district_name)
                ? prefixMaj
                : prefixMaj + " de " + b.district_name;
        }

        /// <summary>Le nom du lieutenant assigné au bâtiment, joint via `lieutenant_ids[0]` →
        /// `district.lieutenants[].lieutenant_id` (forme mesurée : `Lt. Hara` sur le hub du
        /// compte de démo). `null` si le bâtiment n'a aucun lieutenant assigné — `RendrePied`
        /// n'affiche alors AUCUN nom (le pis-aller « Dima » de la maquette est retiré, table 64).</summary>
        private static string LabelLieutenant(string[] lieutenantIds, DistrictInteriorDto district)
        {
            if (lieutenantIds == null || lieutenantIds.Length == 0 || district == null || district.lieutenants == null)
                return null;
            string id = lieutenantIds[0];
            foreach (DistrictLieutenantDto l in district.lieutenants)
                if (l.lieutenant_id == id) return l.name;
            return null;
        }

        // ═══ Chargement ══════════════════════════════════════════════════════════════════════

        public IEnumerator Charger()
        {
            EnsureInitialized();
            DerniereErreur = null;
            PhraseDuRefus = null;
            DernierCodeErreur = 0;

            string errRoute = null;
            AucunRelais = false;
            yield return DecouvrirRoute(() => { }, e => errRoute = e);
            if (renduExpliciteDemande) yield break;   // un test a rendu pendant l'attente : on n'écrase pas
            if (string.IsNullOrEmpty(FromBuildingId) && AucunRelais)
            {
                // ⛔ ÉTAT VIDE FAUX (passe UX 2026-09-26, table 63) : sans relais possédé (le joueur neuf), l'écran disait « La distribution
                // n'a pas répondu » + une phrase de DÉVELOPPEUR (« la prémisse de cet écran… ne tient pas ici »). Ce n'est pas une panne :
                // la réponse est VIDE. Le catalogue s'amorce ICI (plus bas, il ne l'est qu'après la route) : sinon les mots retomberaient.
                DerniereErreur = errRoute;   // le DIAGNOSTIC nommé reste (EcranDistributionP1) ; il n'est pas affiché dans cet état
                yield return I18nCatalog.Amorcer(new I18nClient { BaseUrl = baseUrl }, token);
                if (renduExpliciteDemande) yield break;
                RendreAucunRelais();
                yield return ProposerAchatDeRelais();
                yield break;
            }
            if (string.IsNullOrEmpty(FromBuildingId))
            {
                DerniereErreur = errRoute;   // null = panne : le sous-titre dit la formule maison
                RendreEtatIndisponible();
                yield break;
            }

            // ⛔ SANS CETTE LIGNE, LES RÉSOLVEURS SONT MUETS (patron ㉚/⑨) : `Libelle.De` rend le
            // littéral tant que le dictionnaire est vide — branchement transparent.
            yield return I18nCatalog.Amorcer(new I18nClient { BaseUrl = baseUrl }, token);
            if (renduExpliciteDemande) yield break;   // un test a rendu pendant l'attente : on n'écrase pas

            yield return RechargerCouriers();
            if (renduExpliciteDemande) yield break;   // un test a rendu pendant l'attente : on n'écrase pas
            if (DernierChargementCouriers == null) { RendreEtatIndisponible(); yield break; }

            yield return RechargerProjection();
            if (renduExpliciteDemande) yield break;   // un test a rendu pendant l'attente : on n'écrase pas
            // Non bloquant si la projection échoue — même idiome que `ChaineDApproScreenController.
            // RechargerChaine` : le board rend un état honnête (« aucune route connue ») plutôt que
            // de casser tout l'écran pour une section secondaire.
            AppliquerEtat();
        }

        private IEnumerator RechargerCouriers()
        {
            DerniereErreur = null;
            PhraseDuRefus = null;
            DernierCodeErreur = 0;
            DernierChargementCouriers = null;
            yield return client.GetOperationalCouriers(token,
                dto => DernierChargementCouriers = dto,
                (code, msg) => { DernierCodeErreur = code; DerniereErreur = msg; PhraseDuRefus = client.DernierePhraseDeRefus; });
            // La frame de création rend des rects non résolus : on attend le layout AVANT de
            // rendre quoi que ce soit qui lise une géométrie.
            yield return null;
        }

        private IEnumerator RechargerProjection()
        {
            DernierChargementProjection = null;
            yield return client.GetOperationalDistributionProjection(token,
                dto => DernierChargementProjection = dto,
                (code, msg) => { DerniereErreur = DerniereErreur ?? $"projection : {code} {msg}"; PhraseDuRefus = PhraseDuRefus ?? client.DernierePhraseDeRefus; });
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
            // ⛔ Arrêter ce qui est DÉJÀ parti, en plus d'interdire un départ — voir `coroutineChargement`.
            renduExpliciteDemande = true;
            if (coroutineChargement != null) { StopCoroutine(coroutineChargement); coroutineChargement = null; }
            chargementAmorce = true;   // ⛔ un rendu EXPLICITE annule l'auto-chargement — sinon
                                       //    `Start()` lance `Charger()` une frame plus tard, la
                                       //    charge échoue, l'état d'erreur fait un `Clear()` et
                                       //    efface ce rendu AVANT les assertions. Mesuré sur ㉚
                                       //    le 2026-09-04 : le test n'était vert que parce que
                                       //    le back répondait plus lentement qu'une frame.
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

            MontrerLesZones(couriers: true, pied: true);
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
                titre = "C’est livré";                                              // m-56, verbatim
                sousTitre = "La marchandise est arrivée. Voilà ce que le trajet a coûté à la route."; // m-56
            }
            else
            {
                titre = null;                                                       // table 80 : « Le prochain envoi » (clé gardée, ci-dessous)
                sousTitre = "On choisit d'où ça part, où ça va, et par quel chemin."; // m-54, verbatim
            }
            titreTexte.text = titre != null ? Libelle.De("distribution", "titre", titre)
                : MafiaCleanCity.I18n.Libelle.Gabarit("distribution.titre.l_envoi_de_ce_soir", "Le prochain envoi");   // table 80 @20ceeca0 : la valeur servie réécrite (le geste part tout de suite — mesure back), clé gardée
            sousTitreTexte.text = Libelle.De("distribution", "sous_titre", sousTitre);
            TrackText(titreTexte.text);
            TrackText(sousTitreTexte.text);
        }

        /// <summary>Le panneau de liège : deux étiquettes (texte SOURCÉ — `FromLabel`/`ToLabel`,
        /// jamais les littéraux « Spine-B »/« Lattice-A » de la maquette, voir le commentaire de
        /// classe) + LA FICELLE ET SON ÉPINGLE (TD-558, voir `DistributionFicelleGraphic`) + les 3
        /// lignes en pointillés, résolues depuis la PREMIÈRE route de la projection (aucun
        /// sélecteur dans la maquette — un seul panneau à la fois).
        /// ⛔ La ficelle relie le coin BAS-GAUCHE de l'étiquette de départ (alignée à gauche, comme
        /// « D'OÙ ÇA PART ») au coin HAUT-DROIT de l'étiquette d'arrivée (alignée à droite, comme
        /// « OÙ ÇA VA ») — c'est la MÊME asymétrie que `ConstruireEtiquette` porte déjà dans ses
        /// alignements, filée jusqu'à la géométrie. Les deux coins sont lus sur les VRAIS
        /// `RectTransform`, jamais des constantes recopiées de la maquette : ils bougent avec la
        /// résolution. Sa FORME (droite/serpente, marques de franchissement, trait
        /// continu/interrompu) est intégralement dérivée des 3 bandes de la route via
        /// `DistributionResolvers.FormeChaineSerpente`/`NombreTraverseesFicelle`/`EstRompue` —
        /// aucune n'est relue autrement que les résolveurs de texte voisins.</summary>
        private void RendreCorkboard()
        {
            ViderEnfants(corkboardRoot);

            // La route AVANT le panneau : la ficelle a besoin de savoir, dès sa construction, si
            // elle a une forme à porter (aucune route ⇒ pas de ficelle du tout, seulement les 2
            // étiquettes — même idiome que "Lignes" plus bas, qui retombe sur un message honnête).
            DistributionRouteDto route = (DernierChargementProjection?.routes != null &&
                                           DernierChargementProjection.routes.Length > 0)
                ? DernierChargementProjection.routes[0] : null;

            GameObject panneau = NouveauUI("Panneau", corkboardRoot);
            AjouterFond(panneau, Liege);
            AddLayoutElement(panneau, preferredHeight: Px(120f), flexibleHeight: 0);
            VerticalLayoutGroup vp = panneau.AddComponent<VerticalLayoutGroup>();
            vp.padding = new RectOffset(PxTrait(14f), PxTrait(14f), PxTrait(14f), PxTrait(14f));
            vp.spacing = Px(24f);
            vp.childControlWidth = true; vp.childControlHeight = true;
            vp.childForceExpandWidth = true; vp.childForceExpandHeight = false;
            vp.childAlignment = TextAnchor.UpperLeft;

            // ⛔⛔ LA FICELLE — premier enfant du panneau, `ignoreLayout` (ce n'est pas une rangée
            // du VerticalLayoutGroup : c'est une SURCOUCHE qui recouvre tout le panneau, jamais
            // dimensionnée par lui). Ordre de fratrie : un enfant est TOUJOURS rendu après le
            // graphique de SON PARENT (donc après le fond `Liege` posé sur `panneau` lui-même —
            // sous le liège dans l'ordre de rendu, mais au-dessus de sa texture) et, en étant le
            // PREMIER enfant, elle est rendue AVANT les deux étiquettes construites juste après
            // (sous les deux étiquettes). Patron `VerticalGradientImage` : `MaskableGraphic`,
            // jamais `Graphic` nu, et son `CanvasRenderer` posé EXPLICITEMENT — `AddComponent<T>()`
            // à l'exécution n'honore pas le `[RequireComponent]` d'une classe de base.
            DistributionFicelleGraphic ficelle = null;
            RectTransform ficelleRt = null;
            if (route != null)
            {
                GameObject ficelleGo = NouveauUI("Ficelle", panneau.transform);
                ficelleRt = (RectTransform)ficelleGo.transform;
                Etirer(ficelleRt);
                LayoutElement leFicelle = ficelleGo.AddComponent<LayoutElement>();
                leFicelle.ignoreLayout = true;
                if (ficelleGo.GetComponent<CanvasRenderer>() == null) ficelleGo.AddComponent<CanvasRenderer>();
                ficelle = ficelleGo.AddComponent<DistributionFicelleGraphic>();
                ficelle.raycastTarget = false;
            }

            GameObject etiquetteDepart = ConstruireEtiquette(panneau.transform, "EtiquetteDepart",
                FromLabel ?? "?", "D'OÙ ÇA PART", TextAlignmentOptions.Left);
            GameObject etiquetteArrivee = ConstruireEtiquette(panneau.transform, "EtiquetteArrivee",
                ToLabel ?? Libelle.De("distribution", "bloc", "destination à déterminer"),
                "OÙ ÇA VA", TextAlignmentOptions.Right);

            if (ficelle != null)
            {
                // ⚠️ Les deux étiquettes viennent d'être créées : leur RectTransform n'est PAS
                // encore résolu CETTE frame sans ce forçage (même idiome que `BuildLayout` pour
                // `racinePleinEcran` — une géométrie lue dans la frame de sa création rend des
                // valeurs plausibles et fausses).
                Canvas.ForceUpdateCanvases();
                RectTransform departRt = (RectTransform)etiquetteDepart.transform;
                RectTransform arriveeRt = (RectTransform)etiquetteArrivee.transform;

                var cd = new Vector3[4];
                departRt.GetWorldCorners(cd);      // [0]=bas-gauche [1]=haut-gauche [2]=haut-droit [3]=bas-droit
                var ca = new Vector3[4];
                arriveeRt.GetWorldCorners(ca);

                Vector2 origineLocale = ficelleRt.InverseTransformPoint(cd[0]);      // coin bas-gauche du départ
                Vector2 destinationLocale = ficelleRt.InverseTransformPoint(ca[2]);  // coin haut-droit de l'arrivée

                ficelle.DefinirTrace(origineLocale, destinationLocale,
                    DistributionResolvers.FormeChaineSerpente(route.sinuosity_bucket),
                    DistributionResolvers.NombreTraverseesFicelle(route.river_crossings_count_bucket),
                    DistributionResolvers.EstRompue(route.route_state),
                    CordeClaire, EpingleRouge,
                    epaisseur: Px(1.5f), rayon: Px(4.5f), amplitude: Px(6f), demiLargeurMarque: Px(5f));
            }

            GameObject lignes = NouveauUI("Lignes", corkboardRoot);
            VerticalLayoutGroup vl = lignes.AddComponent<VerticalLayoutGroup>();
            vl.spacing = Px(2f);
            vl.childControlWidth = true; vl.childControlHeight = true;
            vl.childForceExpandWidth = true; vl.childForceExpandHeight = false;
            PoserLaPlaqueDeLecture(lignes, vl);   // ㉘ fonds de zone : la bande `.lecture` sous le liège
            AddLayoutElement(lignes, flexibleHeight: 0);
            lignesRoot = lignes.transform;

            if (route == null)
            {
                TextMeshProUGUI msg = NouveauTexteFiche(lignes.transform, "AucuneRoute",
                    Libelle.De("distribution", "bloc", "Aucune route tendue pour l’instant."),
                    9f, DesignTokens.Current.onSurfaceMuted, false);
                TrackText(msg.text);
                return;
            }

            ConstruireLigne(lignes.transform, "le_chemin", "LE CHEMIN",
                DistributionResolvers.TexteChemin(route.sinuosity_bucket),
                DesignTokens.Current.onSurfacePrimary);
            ConstruireLigne(lignes.transform, "a_traverser", "À TRAVERSER",
                DistributionResolvers.TexteTraverser(route.river_crossings_count_bucket),
                DesignTokens.Current.onSurfacePrimary);
            ConstruireLigne(lignes.transform, "cette_route", "CETTE ROUTE",
                DistributionResolvers.TexteRouteState(route.route_state),
                DistributionResolvers.CouleurRouteState(route.route_state, VertBon, DesignTokens.Current.onSurfacePrimary));
        }

        /// <summary>Rend le `GameObject` de la fiche — TD-558 : `RendreCorkboard` lit ses
        /// coordonnées réelles APRÈS coup pour y ancrer la ficelle, jamais des constantes.</summary>
        private GameObject ConstruireEtiquette(Transform parent, string nom, string titreBrut,
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
            return chip;
        }

        private void ConstruireLigne(Transform parent, string idStable, string libelleLitteral, string valeur, Color couleurValeur)
        {
            GameObject ligne = NouveauUI("Ligne_" + idStable, parent);
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
                Libelle.De("distribution", "bouton", "ACHETER UN VÉLO"), 9.5f,
                DesignTokens.Current.onSurfacePrimary, true);
            TrackText(libAchat.text);
            Gestifier(boutonAchat, hba, libAchat);
        }

        /// <summary>Le pied : portrait + nom (RÉEL si `LieutenantLabel` a été découvert, sinon AUCUN —
        /// le pis-aller « Dima » est retiré, table 64) + réplique (verbatim par état, aucune
        /// source dynamique) + bouton — gated en 3 façons, dans cet ordre :
        /// (1) `boutonVisible == false` (un courrier `IN_TRANSIT`) → note, PAS de bouton (brief
        ///     §2, correctif payé sur l'écran précédent : le DIRE, pas seulement griser) ;
        /// (2) `ToBuildingId == null` (aucune destination découverte, voir `DecouvrirRoute`) →
        ///     note honnête, PAS de bouton fabriqué sur un id inventé ;
        /// (3) sinon, le bouton, câblé sur `EnvoyerCeSoir()`.</summary>
        private void RendrePied(bool enTransit, bool arrivee, bool boutonVisible)
        {
            ViderEnfants(piedRoot);

            // ⛔ NOM INVENTÉ RETIRÉ (table 64, NOTE) : le repli « Dima » de la maquette nommait un lieutenant que le joueur n'a pas.
            // Nom réel découvert, ou AUCUN nom : la réplique reste, sans locuteur.
            string lieutenantAffiche = LieutenantLabel;
            string replique, repliqueServie = null;
            if (enTransit)
            {
                replique = null;   // table 80 @26ce8926 (12ᵉ ligne) : le coursier part TOUT DE SUITE — « à la nuit » était faux ; clé gardée
                repliqueServie = MafiaCleanCity.I18n.Libelle.Gabarit(
                    "distribution.bloc.il_est_parti_a_la_nuit_ca_serpente_mais_c_est_la_seule_qui_evite_le_pont_du_threnny",
                    "Il est en route. Ça serpente, mais c\u2019est la seule qui évite le pont du Threnny.");
            }
            else if (arrivee)
                replique = "Livré. Le carton est au comptoir, personne n'a rien vu.";                                // m-56
            else
                replique = null;   // table 80 : « … et je l'envoie tout de suite. » (clé gardée, au rendu)

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
            if (!string.IsNullOrEmpty(lieutenantAffiche))
            {
                TextMeshProUGUI nom = NouveauTexteFiche(texteBloc.transform, "Nom", lieutenantAffiche, 10.5f,
                    DesignTokens.Current.onSurfacePrimary, true);
                TrackText(nom.text);
            }

            // « LA RÉGULATION · J9 » — aucune source dans les 4 corps mesurés, pis-aller verbatim.
            TextMeshProUGUI roleTexte = NouveauTexteFiche(texteBloc.transform, "Role",
                Libelle.De("distribution", "bloc", "LA RÉGULATION"), 7f,
                DesignTokens.Current.onSurfaceMuted, false);
            roleTexte.characterSpacing = 2f;
            TrackText(roleTexte.text);

            TextMeshProUGUI q = NouveauTexteFiche(piedRoot, "Replique",
                repliqueServie ?? (replique != null ? Libelle.De("distribution", "bloc", replique)
                    : MafiaCleanCity.I18n.Libelle.Gabarit("distribution.bloc.la_marchandise_est_prete_au_labo_dites_moi_qui_part_et_par_ou_et_je_l_enverrai_ce_soir", "La marchandise est prête au labo. Dites-moi qui part et par où, et je l\u2019envoie tout de suite.")), 9f, DesignTokens.Current.onSurfaceSecondary, false);
            q.fontStyle = FontStyles.Italic;
            q.enableWordWrapping = true;
            TrackText(q.text);

            if (!boutonVisible)
            {
                TextMeshProUGUI note = NouveauTexteFiche(piedRoot, "NoteTransit",
                    Libelle.De("distribution", "bloc",
                        "Il est en chemin. On ne le rappelle pas — on saura à l’arrivée."), 8.5f, // m-55, verbatim
                    DesignTokens.Current.onSurfaceMuted, false);
                note.enableWordWrapping = true;
                TrackText(note.text);
                return;
            }

            if (string.IsNullOrEmpty(ToBuildingId))
            {
                TextMeshProUGUI noteDest = NouveauTexteFiche(piedRoot, "NoteSansDestination",
                    MafiaCleanCity.I18n.Libelle.Gabarit("distribution.bloc.aucune_destination_connue_pour_l_envoi_de_ce_soir", "Aucune destination connue pour le prochain envoi."), 8.5f, // table 80 @20ceeca0 : la valeur servie réécrite (le geste part tout de suite — mesure back), clé gardée
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

            // m-56 / m-54 ; table 80 : « ENVOYER MAINTENANT » — l'envoi part tout de suite (clé gardée distribution.bouton.envoyer_ce_soir)
            string libBoutonTexte = arrivee ? Libelle.De("distribution", "bouton", "TENDRE UNE AUTRE FICELLE")
                : MafiaCleanCity.I18n.Libelle.Gabarit("distribution.bouton.envoyer_ce_soir", "ENVOYER MAINTENANT");
            TextMeshProUGUI libBouton = NouveauTexteFiche(bouton.transform, "Libelle",
                libBoutonTexte, 10.5f, EncreSombre, true);
            libBouton.characterSpacing = 4f;
            TrackText(libBouton.text);
            boutonEnvoyerTexte = libBouton;
            boutonEnvoyer = b;
            // cause 3 (CLIENT-3 ㉘ M2, 07/10) : « bouton sombre à liseré, texte or / pavé or plein, texte sombre — bouton criard » : la forme `.geste` de SON cadre (`.lieg6 .geste`)
            PiedDEcran.StylerLeBouton(bouton, libBouton, PiedDEcran.Forme.Geste);

            // « à pied · ça vide le stock du labo » (m-54, verbatim) — pis-aller conservé même en
            // état « livré » : aucun sous-texte alternatif n'est sourcé pour m-56.
            // cause 3 (㉘ M2) : dans la maquette (`.lieg6 .geste small`) la LÉGENDE est DANS le bouton, à droite (6,5 px, #9a8a6a) — le jeu la posait en dessous, hors du geste.
            LayoutElement lel = libBouton.gameObject.GetComponent<LayoutElement>() ?? libBouton.gameObject.AddComponent<LayoutElement>();
            lel.flexibleWidth = 1f;   // le libellé prend la place : la légende se range à droite (`justify-content:space-between`)
            TextMeshProUGUI sousBouton = NouveauTexteFiche(bouton.transform, "SousBouton",
                Libelle.De("distribution", "bloc", "à pied · ça vide le stock du labo"), 7f,
                PiedDEcran.Legende(PiedDEcran.Etat.Allume), false);
            sousBouton.alignment = TextAlignmentOptions.MidlineRight;
            TrackText(sousBouton.text);
        }

        /// <summary>Le premier `distribution_hub` possédé (le relais d'où partent les coursiers) ; null s'il n'y en a pas. Pure.</summary>
        public static BatimentPossedeDto PremierRelais(BatimentPossedeDto[] possedes)
        {
            if (possedes == null) return null;
            foreach (BatimentPossedeDto b in possedes)
                if (b != null && !string.IsNullOrEmpty(b.building) && b.operational_type == "distribution_hub") return b;
            return null;
        }

        /// <summary>`me/buildings` tel que lu au dernier chargement (null : non lu).</summary>
        public BatimentPossedeDto[] PossedesLus { get; private set; }

        // ═══ Le geste « ACHETER UN RELAIS » (f2 26/09, table 71 client 5354fa88) ═══════════════════════════════════

        /// <summary>Le bloc libre proposé à l'achat (-1 : aucun geste offert) et son district — crochets de test.</summary>
        public int BlocDAchatDeRelais { get; private set; } = -1;
        public int QuartierDAchatDeRelais { get; private set; } = -1;
        public int AchatsDeRelaisTentes { get; private set; }
        public ActionOutcome DernierAchatDeRelais { get; private set; }

        /// <summary>Dans l'état « aucun relais » : cherche un bloc LIBRE dans un district où un relais peut s'OUVRIR
        /// (`RelaisAAcheter`, TD-762) ; trouvé ⇒ la ligne de coût (dite AVANT l'appui) et le bouton ; sinon, PAS de geste. Un relais
        /// déjà acheté et pas encore ouvert ⇒ pas de geste (on ne rachète pas).</summary>
        private IEnumerator ProposerAchatDeRelais()
        {
            BlocDAchatDeRelais = -1; QuartierDAchatDeRelais = -1;
            if (string.IsNullOrEmpty(token) || MafiaCleanCity.Operational.Distribution.RelaisAAcheter.DejaUnRelaisAOuvrir(PossedesLus))
                yield break;
            List<DistrictDto> districts = null;
            yield return new WorldApiClient { BaseUrl = baseUrl }.GetDistricts(d => districts = d, _ => { });
            if (this == null) yield break;
            var proj = new CityProjectionsClient { BaseUrl = baseUrl };
            foreach (int quartier in MafiaCleanCity.Operational.Distribution.RelaisAAcheter.QuartiersOuvrables(districts))
            {
                DistrictInteriorDto interieur = null;
                yield return proj.Interior(quartier, token, i => interieur = i, _ => { });
                if (this == null) yield break;
                int bloc = MafiaCleanCity.Operational.Selling.PointsDeVente.BlocLibre(interieur, PossedesLus);
                if (bloc < 0) continue;
                BlocDAchatDeRelais = bloc; QuartierDAchatDeRelais = quartier;
                break;
            }
            if (BlocDAchatDeRelais < 0 || piedRoot == null || !AucunRelais) yield break;
            RendreGesteAchatDeRelais();
        }

        private void RendreGesteAchatDeRelais()
        {
            MontrerLesZones(couriers: false, pied: true);
            // le coût, dit AVANT l'appui (table 71 ; D18 « demain »), sans montant
            TextMeshProUGUI cout = NouveauTexteFiche(piedRoot, "CoutAchatRelais", Libelle.Gabarit(
                "distribution.geste.coute_de_l_argent_et_votre_decision_de_structure_du_jour_il_s_ouvre_ensuite_depuis_sa_fiche_sur_le_port_ou_dans_les_cheminees_seulement_et_en_demandera_une_autre_demain",
                "Coûte de l\u2019argent et votre décision de structure du jour\u202f; il s\u2019ouvre ensuite depuis sa fiche \u2014 sur le port ou dans les cheminées seulement \u2014 et en demandera une autre, demain."),
                8f, DesignTokens.Current.onSurfaceSecondary, false);
            cout.enableWordWrapping = true;
            TrackText(cout.text);

            GameObject bouton = NouveauUI("BoutonAcheterRelais", piedRoot);
            AjouterFond(bouton, DesignTokens.Current.surfaceRaised);
            Button b = bouton.AddComponent<Button>();
            b.targetGraphic = bouton.GetComponent<Image>();
            b.onClick.AddListener(() => StartCoroutine(AcheterUnRelais()));
            HorizontalLayoutGroup h = bouton.AddComponent<HorizontalLayoutGroup>();
            h.padding = new RectOffset(PxTrait(10f), PxTrait(10f), PxTrait(8f), PxTrait(8f));
            h.childAlignment = TextAnchor.MiddleCenter;
            h.childControlWidth = true; h.childControlHeight = true;
            AddLayoutElement(bouton, preferredHeight: Px(26f), flexibleHeight: 0);
            TextMeshProUGUI lib = NouveauTexteFiche(bouton.transform, "Libelle",
                Libelle.Gabarit("distribution.geste.acheter_un_relais", "Acheter un relais"), 9.5f,
                DesignTokens.Current.onSurfacePrimary, true);
            TrackText(lib.text);
            Gestifier(bouton, h, lib);
        }

        /// <summary>A2 (juge groupé du 07/10, f2) : les jetons d'action de ㉘ (« Acheter un relais », « Acheter un vélo ») sont à la forme `.geste` de la maquette — bord #5a4a2a, fond #241c11, libellé #d9ab4e en CAPITALES lettrées,
        /// aligné à gauche — et non le gris-bleu #2a2e38 au texte blanc en casse de phrase.</summary>
        private static void Gestifier(GameObject bouton, HorizontalLayoutGroup h, TextMeshProUGUI libelle)
        {
            h.childAlignment = TextAnchor.MiddleLeft;
            libelle.fontStyle |= FontStyles.UpperCase;   // la casse est un STYLE : le texte servi reste intact
            libelle.characterSpacing = 7f;
            PiedDEcran.StylerLeBouton(bouton, libelle, PiedDEcran.Forme.Geste);
        }

        /// <summary>L'achat, sur le bloc proposé. Réussi ⇒ « Relais acheté. Reste à l'ouvrir, depuis sa fiche. » et le geste se retire
        /// (relecture : le relais acheté se voit, `DejaUnRelaisAOuvrir`) ; échoué ⇒ la phrase servie du refus (spécifique), sinon
        /// « L'achat n'a pas abouti. » (`LigneDAction`, filtre générique).</summary>
        public IEnumerator AcheterUnRelais()
        {
            if (BlocDAchatDeRelais < 0 || string.IsNullOrEmpty(token)) yield break;
            AchatsDeRelaisTentes++;
            ActionOutcome resultat = null;
            yield return new BuildingCardClient { BaseUrl = baseUrl }.AcheterBatiment(BlocDAchatDeRelais,
                MafiaCleanCity.Operational.Distribution.RelaisAAcheter.TypeRelais, token, o => resultat = o);
            if (this == null) yield break;
            DernierAchatDeRelais = resultat;
            if (resultat != null && resultat.Ok)
            {
                ViderEnfants(piedRoot);
                BlocDAchatDeRelais = -1;
            }
            if (piedRoot == null) yield break;
            TextMeshProUGUI ligne = NouveauTexteFiche(piedRoot, "ResultatAchatRelais", BuildingCardController.LigneDAction(resultat,
                    Libelle.Gabarit("distribution.geste.relais_achete_reste_a_l_ouvrir_depuis_sa_fiche", "Relais acheté. Reste à l\u2019ouvrir, depuis sa fiche."),
                    Libelle.Gabarit("distribution.geste.l_achat_n_a_pas_abouti", "L\u2019achat n\u2019a pas abouti")),
                8.5f, DesignTokens.Current.onSurfacePrimary, false);
            ligne.enableWordWrapping = true;
            TrackText(ligne.text);
        }

        /// <summary>État vide (table 63, client 8979d626) : aucun `distribution_hub` possédé. Ce qui est vrai, et ce qu'on peut faire.</summary>
        public bool AucunRelais { get; private set; }

        private void RendreAucunRelais()
        {
            ViderEnfants(corkboardRoot);
            ViderEnfants(couriersRoot);
            ViderEnfants(piedRoot);
            MontrerLesZones(couriers: false, pied: false);   // la bande basse revient avec le geste d'achat, s'il est offert
            titreTexte.text = Libelle.Gabarit("distribution.vide.pas_encore_de_relais", "Pas encore de relais.");
            sousTitreTexte.text = Libelle.Gabarit("distribution.vide.sans_relais_rien_ne_part_c_est_de_la_que_vos_coursiers_livrent",
                                      "Sans relais, rien ne part\u00A0: c’est de là que vos coursiers livrent.")
                                  // addendum 63 (client 33b422c5, 26/09) : « s'obtient en reconvertissant un de vos locaux » était FAUX
                                  // (le back refuse de reconvertir un local du kit, real-estate.service.ts:355) — REMPLACÉE.
                                  + "\n" + Libelle.Gabarit("distribution.vide.un_relais_s_achete_sur_un_bloc_libre_puis_s_ouvre_depuis_sa_fiche",
                                      "Un relais s\u2019achète sur un bloc libre, puis s\u2019ouvre depuis sa fiche, sur le port ou dans les cheminées seulement \u2014 de l\u2019argent et deux décisions de structure, sur deux jours.");
            TrackText(titreTexte.text);
            TrackText(sousTitreTexte.text);
        }

        /// <summary>Repli NOMMÉ sur échec réseau ou prémisse non remplie — jamais une exception,
        /// jamais un écran noir (patron ㊲/㉚).</summary>
        private void RendreEtatIndisponible()
        {
            ViderEnfants(corkboardRoot);
            ViderEnfants(couriersRoot);
            ViderEnfants(piedRoot);
            MontrerLesZones(couriers: false, pied: false);
            titreTexte.text = Libelle.De("distribution", "titre", "La distribution n'a pas répondu");
            // la phrase SERVIE du refus, sinon celle de l'écran — jamais `DerniereErreur` (garde de classe des refus)
            sousTitreTexte.text = PhraseDuRefus ?? Libelle.De("distribution", "sous_titre", "Réessayez dans un instant.");
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
                // table 67 (26/09) : le refus était SILENCIEUX pour le joueur (diagnostic seulement). Sa phrase servie se pose sous le geste.
                if (client.DernierePhraseDeRefus != null && piedRoot != null)
                {
                    TextMeshProUGUI refus = NouveauTexteFiche(piedRoot, "RefusDuGeste", client.DernierePhraseDeRefus, 8.5f,
                        DesignTokens.Current.onSurfaceSecondary, false);
                    refus.enableWordWrapping = true;
                    TrackText(refus.text);
                }
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
            Canvas canvas = MafiaCleanCity.Shell.CanvasRacine.Resoudre(transform, mountParent);
            // ⛔ SOUS L'HÔTE, PAS SOUS `mountParent` (patron ㉚ / gabarit corrigé) : bâtir sous
            // `mountParent` fait naître la feuille en FRÈRE de l'hôte — toute garde en
            // `GetComponentsInChildren` mesurerait alors un sous-arbre VIDE.
            Transform root = mountParent != null ? transform : canvas.transform;

            GameObject racine = NouveauUI("DistributionRoot", root);
            racinePleinEcran = (RectTransform)racine.transform;
            Etirer(racinePleinEcran);
            // LE DÉCOR DE SCÈNE (CLIENT-2, design `Tools/decor-de-scene-2026-10-07/DESIGN.md`) : la scène du district à 0,24, le voile,
            // et la PLANCHE (`.planche`, zone dominante : Points ×2 sur un 158° de bois, sur un Plein) — DÉCLARÉS au catalogue. Premier
            // enfant, hors mise en page : `Bas` (posé plus bas par `PiedDEcran.Bande`) reste le DERNIER. Aucune Image sur la racine.
            DecorPose decor = DecorDeScene.Poser(racine.transform, DecorsDeScene.Distribution);
            racinePleinEcran.SetAsLastSibling();

            // ⛔ L'ÉCHELLE AVANT TOUTE CONVERSION — un RectTransform qui vient d'être étiré n'a
            // pas encore son `rect` résolu.
            Canvas.ForceUpdateCanvases();

            // C-a + C-b (juge groupé du 07/10, f2) : pile + BANDEAU DE TITRE de la maquette (`EnteteDEcran`), le corps prend le reste
            // §5.6 du design : l'en-tête commence SOUS max(barre, bande de scène 21 %), comme le panneau de la maquette.
            DecorDeScene.ReserverLaBande(EnteteDEcran.PoserLaPile(racine, 0, (int)ShellChrome.BottomInsetPx), decor, 0f);
            var (titreDuBandeau, sousTitreDuBandeau) = EnteteDEcran.Construire(racine.transform, EnteteDEcran.Distribution, Px,
                DesignTokens.Current.hudSerifFont, DesignTokens.Current.primaryFont, DesignTokens.Current.onSurfaceSecondary, 10f);
            GameObject corpsGo = NouveauUI("Corps", racine.transform);
            LayoutElement corpsLe = corpsGo.AddComponent<LayoutElement>();
            corpsLe.flexibleHeight = 1f; corpsLe.minHeight = 0f;

            VerticalLayoutGroup pile = corpsGo.AddComponent<VerticalLayoutGroup>();
            pile.padding = new RectOffset(PxTrait(16f), PxTrait(16f), PxTrait(14f), PxTrait(14f));
            pile.spacing = Px(12f);
            pile.childControlWidth = true; pile.childControlHeight = true;
            pile.childForceExpandWidth = true; pile.childForceExpandHeight = false;
            pile.childAlignment = TextAnchor.UpperCenter;

            titreTexte = titreDuBandeau;
            sousTitreTexte = sousTitreDuBandeau;

            GameObject corkboardGo = NouveauUI("Corkboard", corpsGo.transform);
            VerticalLayoutGroup vcb = corkboardGo.AddComponent<VerticalLayoutGroup>();
            vcb.spacing = 0f;   // la `.lecture` est COLLÉE sous la `.planche` (cadres 54-57) : aucun interstice entre le liège et sa lecture
            vcb.childControlWidth = true; vcb.childControlHeight = true;
            vcb.childForceExpandWidth = true; vcb.childForceExpandHeight = false;
            AddLayoutElement(corkboardGo, flexibleHeight: 0);
            corkboardRoot = corkboardGo.transform;

            // ㉘ fonds de zone (08/10, avant le décor de CLIENT-2 : sa racine prend le support `.planche`, et chaque zone sœur garde SON fond —
            // DESIGN.md §3.3 B) : « VOS COURRIERS » n'a AUCUN cadre (m-54..m-58) ; elle se range sous la lecture et en prend la plaque `.lecture`.
            // La plaque et son filet sur `Couriers`, le contenu (vidé à chaque rendu) dans `Contenu` : vider la plaque emporterait son filet.
            zoneCouriers = NouveauUI("Couriers", corpsGo.transform);
            VerticalLayoutGroup vzc = zoneCouriers.AddComponent<VerticalLayoutGroup>();
            vzc.childControlWidth = true; vzc.childControlHeight = true;
            vzc.childForceExpandWidth = true; vzc.childForceExpandHeight = false;
            PoserLaPlaqueDeLecture(zoneCouriers, vzc);
            AddLayoutElement(zoneCouriers, flexibleHeight: 0);
            GameObject couriersGo = NouveauUI("Contenu", zoneCouriers.transform);
            VerticalLayoutGroup vco = couriersGo.AddComponent<VerticalLayoutGroup>();
            vco.spacing = Px(4f);
            vco.childControlWidth = true; vco.childControlHeight = true;
            vco.childForceExpandWidth = true; vco.childForceExpandHeight = false;
            AddLayoutElement(couriersGo, flexibleHeight: 0);
            couriersRoot = couriersGo.transform;

            // ㉘ B2 (juge groupé du 07/10) : le pied est la BANDE BASSE `.lieg6 .bas` (plaque #141a21 pleine largeur + filet haut 2 px #2c3640), ANCRÉE
            // EN PIED de la pile (le corps, flexible, la pousse en bas — patron ㉚) ; il prenait le reste du corps, sans fond, et tout se tassait en haut.
            bandeBasse = PiedDEcran.Bande(racine.transform, Px);
            GameObject piedGo = NouveauUI("Pied", bandeBasse.transform);
            VerticalLayoutGroup vp = piedGo.AddComponent<VerticalLayoutGroup>();
            vp.spacing = Px(8f);
            vp.childControlWidth = true; vp.childControlHeight = true;
            vp.childForceExpandWidth = true; vp.childForceExpandHeight = false;
            AddLayoutElement(piedGo, flexibleHeight: 0);
            piedRoot = piedGo.transform;
            MontrerLesZones(couriers: false, pied: false);   // pendant le chargement : aucune plaque vide ; le rendu les montre
        }

        /// <summary>La plaque `.lieg6 .lecture` (cadres 54-57) : fond `#1a1108`, filet HAUT de 1 CSS px `#3d3024` (hors mise en page), padding
        /// `8 13`. Posée sur une zone DÉJÀ munie de son groupe vertical. Le pointillé entre deux lignes (`.l+.l{border-top:1px dotted #3d3024}`) n'est
        /// pas tracé : nuance C (ruling du 07/10).</summary>
        private void PoserLaPlaqueDeLecture(GameObject zone, VerticalLayoutGroup v)
        {
            AjouterFond(zone, PlaqueDeLecture);
            v.padding = new RectOffset(PxTrait(13f), PxTrait(13f), PxTrait(8f) + PxTrait(1f), PxTrait(8f));
            GameObject filet = NouveauUI("Filet", zone.transform);
            filet.AddComponent<LayoutElement>().ignoreLayout = true;
            RectTransform fr = (RectTransform)filet.transform;
            fr.anchorMin = new Vector2(0f, 1f); fr.anchorMax = new Vector2(1f, 1f); fr.pivot = new Vector2(0.5f, 1f);
            fr.offsetMin = new Vector2(0f, -PxTrait(1f)); fr.offsetMax = Vector2.zero;
            AjouterFond(filet, EnteteDEcran.Distribution.Filet);   // `#3d3024`, le filet de la même famille `.lieg6`
        }

        /// <summary>Une zone vidée (états « aucun relais », « indisponible ») se RETIRE : une plaque sans contenu serait une bande sombre vide.</summary>
        private void MontrerLesZones(bool couriers, bool pied)
        {
            if (zoneCouriers != null) zoneCouriers.SetActive(couriers);
            if (bandeBasse != null) bandeBasse.SetActive(pied);
        }

        private Transform corkboardRoot, lignesRoot, couriersRoot, piedRoot;
        private GameObject zoneCouriers, bandeBasse;
        private TextMeshProUGUI titreTexte, sousTitreTexte, boutonEnvoyerTexte;
        private Button boutonEnvoyer;

        // ═══ Palette — locale, patron ㉚ (aucun token `DesignTokens` dédié à une fiche crème/liège
        // n'existe — ceux qui existent servent un AUTRE consommateur mesuré). ═══════════════════
        private static Color Creme => DesignTokens.Current.hudCreme;
        private static Color EncreSombre => DesignTokens.Current.ficheCtaOrEncre;
        // ⚠️ ESTIMÉ VISUELLEMENT SUR LA MAQUETTE, NON ÉCHANTILLONNÉ AU PIXEL (aucun outil de
        // lecture de pixel disponible cette passe — même trou que ㉚, voir implementation-notes.md).
        private static readonly Color Liege = Hex("#7a5230");
        private static Color Or => DesignTokens.Current.hudMoneyUnderlineGold;
        /// <summary>`.lieg6 .lecture{background:#1a1108}` (cadres 54-57, lu dans `ecrans-brennar-6.html` de l'atelier master 5240cec).</summary>
        public static Color PlaqueDeLecture => new Color32(0x1a, 0x11, 0x08, 255);
        // ⛔⛔ TD-558 — la ficelle et l'épingle du panneau de liège. MESURÉES au pixel sur
        // `Tools/juge-visuel/v6/m-54.png` (python3/PIL, couleur la plus fréquente dans un carré
        // échantillon posé sur le trait / le cœur de l'épingle) — pas « estimées visuellement »
        // comme `Liege`/`Creme` ci-dessus : le cordage rend (201,189,160) de façon quasi uniforme
        // le long du trait, la tête de l'épingle (196,65,58) dans son cœur.
        private static readonly Color CordeClaire = Hex("#c9bda0");
        private static readonly Color EpingleRouge = Hex("#c4413a");
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
        /// <summary>`sinuosity_bucket` — domaine du back `direct | meandering | gnarled` (`route-finder.service.ts:199`).
        /// ⛔ Corrigé le 22/09 : le 3e cas testait "tortuous", une HYPOTHÈSE DE CLÉ tirée de m-57 que le back ne sert pas — `gnarled`
        /// sortait BRUT (mesuré par CLIENT-2). Le libellé était déjà celui de la maquette (cadre 57, atelier ca69012c §4) : seule la
        /// valeur du `case` était fausse.</summary>
        public static string TexteChemin(string bucket)
        {
            switch (bucket)
            {
                case "direct": return MafiaCleanCity.I18n.Libelle.De("distribution", "bloc", "droit — le plus court");                    // m-54, MESURÉ
                case "meandering": return MafiaCleanCity.I18n.Libelle.De("distribution", "bloc", "ça serpente — plus long, plus discret"); // m-55/56, MESURÉ
                case "gnarled": return MafiaCleanCity.I18n.Libelle.De("distribution", "bloc", "tordu — beaucoup de détours");              // m-57, cadre 57 — domaine du back
                default: return MafiaCleanCity.I18n.Repli.Etat(bucket);   // hors domaine : le mot de la famille (atelier 28) ; absent : « — » ; jamais la valeur brute
            }
        }

        /// <summary>`river_crossings_count_bucket` — 2 valeurs MESURÉES : "none" (1x), "single"
        /// (2x). "multiple" est une hypothèse tirée de m-57 (« trois ponts » — jamais
        /// observée).</summary>
        public static string TexteTraverser(string bucket)
        {
            switch (bucket)
            {
                case "none": return MafiaCleanCity.I18n.Libelle.De("distribution", "bloc", "aucune rivière");  // m-54, MESURÉ
                case "single": return MafiaCleanCity.I18n.Libelle.De("distribution", "bloc", "un pont");        // m-55/56, MESURÉ
                case "multiple": return MafiaCleanCity.I18n.Libelle.De("distribution", "bloc", "plusieurs ponts");  // m-57 — hypothèse
                default: return MafiaCleanCity.I18n.Repli.Etat(bucket);   // hors domaine : le mot de la famille (atelier 28) ; absent : « — » ; jamais la valeur brute
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
                case "active": return MafiaCleanCity.I18n.Libelle.De("distribution", "bloc", "tient");
                // atelier 29 (7746e0bb), servies : le mot de la maison, « tendre » une route ; « saturé, ou coupé » du trajet.
                case "draft": return MafiaCleanCity.I18n.Libelle.De("distribution", "bloc", "pas encore tendue");
                case "saturated": return MafiaCleanCity.I18n.Libelle.De("distribution", "bloc", "saturée");
                case "severed": return MafiaCleanCity.I18n.Libelle.De("distribution", "bloc", "coupée"); // m-55 — lecture retenue, voir implementation-notes.md
                default: return MafiaCleanCity.I18n.Repli.Etat(state);   // hors domaine : le mot de la famille (atelier 28) ; absent : « — » ; jamais la valeur brute
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

        // ═══ TD-558 — la FORME de la ficelle (voir `DistributionFicelleGraphic`), trois
        // résolveurs NOMMÉS de plus, chacun sur la MÊME valeur de domaine que son résolveur de
        // texte voisin — jamais relue autrement, jamais un switch recopié à deux endroits. ═══════

        /// <summary>`sinuosity_bucket` → le trait est-il une courbe qui SERPENTE ? Même valeur de
        /// domaine que `TexteChemin`. Seule "direct" (MESURÉE) est un segment DROIT confirmé ;
        /// toute autre valeur — "meandering" (MESURÉE), "gnarled" (le 3e cran du back) ou une valeur
        /// inconnue — dessine une courbe : "direct" est le cas simple confirmé, pas la majorité
        /// du domaine, donc le repli va vers "ça serpente", pas vers "c'est droit".</summary>
        public static bool FormeChaineSerpente(string sinuosityBucket) => sinuosityBucket != "direct";

        /// <summary>`river_crossings_count_bucket` → le nombre de marques de franchissement à
        /// poser SUR le trait (pas dans une légende). Même valeur de domaine que `TexteTraverser`.
        /// "none" (MESURÉE) → 0 · "single" (MESURÉE) → 1 · "multiple" (hypothèse m-57, « trois
        /// ponts », jamais observée) → 2, pour rester visuellement distinct de "single" sans
        /// prétendre connaître le compte exact d'un cas jamais vu · une valeur inconnue et non
        /// vide pose UNE marque plutôt que d'en inventer le nombre.</summary>
        public static int NombreTraverseesFicelle(string riverCrossingsBucket)
        {
            switch (riverCrossingsBucket)
            {
                case "none": return 0;
                case "single": return 1;
                case "multiple": return 2;
                default: return string.IsNullOrEmpty(riverCrossingsBucket) ? 0 : 1;
            }
        }

        /// <summary>`route_state` → le trait est-il INTERROMPU ? Même valeur de domaine que
        /// `TexteRouteState`/`CouleurRouteState`. ⛔ UNE SEULE valeur a été mesurée sur ce compte,
        /// 3/3 : "active" (voir `EcranDistributionR4`). Le brief annonce une valeur « route
        /// rompue » que je n'ai jamais observée sur les 3 routes réelles disponibles — le domaine
        /// n'est PAS confirmé fermé, donc pas de liste positive de valeurs "rompues" : "active"
        /// est le seul cas NOMINAL connu, et tout le reste (une valeur "rompue" hypothétique, une
        /// valeur inconnue, `null`) bascule sur la branche interrompue plutôt que de prétendre
        /// connaître le domaine complet des états possibles.</summary>
        public static bool EstRompue(string routeState) => routeState != "active";

        /// <summary>`transit_band` (courriers) — 2 valeurs MESURÉES sur les 3 courriers du
        /// compte : "ARRIVED", "IDLE". "IN_TRANSIT" est ANNONCÉ par le brief mais JAMAIS observé
        /// ici — traité en hypothèse, repli gracieux.</summary>
        public static string TexteTransitBand(string band)
        {
            switch (band)
            {
                case "ARRIVED": return MafiaCleanCity.I18n.Libelle.De("distribution", "bloc", "à destination");
                case "IDLE": return MafiaCleanCity.I18n.Libelle.De("distribution", "bloc", "disponible");
                case "IN_TRANSIT": return MafiaCleanCity.I18n.Libelle.De("distribution", "bloc", "en chemin"); // hypothèse — jamais observée sur ce compte
                default: return MafiaCleanCity.I18n.Repli.Etat(band);   // hors domaine : le mot de la famille (atelier 28) ; absent : « — » ; jamais la valeur brute
            }
        }

        /// <summary>`vehicle_type` — DEUX CASSES MESURÉES SUR DEUX ROUTES DIFFÉRENTES (fait à
        /// rapporter, voir `CourierDto`) : `GET .../couriers` rend "FOOT"/"BIKE" (MAJUSCULES) ;
        /// le message 422 de `POST .../vehicles/purchase` annonce foot|bike|car|refrigerated_van
        /// (minuscules). Comparaison en `ToUpperInvariant()` pour ne pas dupliquer la table.</summary>
        public static string TexteVehicule(string type)
        {
            if (string.IsNullOrEmpty(type)) return MafiaCleanCity.I18n.Repli.Type(type);   // absent : « — » (plus « véhicule inconnu », atelier 28)
            switch (type.ToUpperInvariant())
            {
                case "FOOT": return MafiaCleanCity.I18n.Libelle.De("distribution", "bloc", "à pied");
                case "BIKE": return MafiaCleanCity.I18n.Libelle.De("distribution", "bloc", "à vélo");
                case "CAR": return MafiaCleanCity.I18n.Libelle.De("distribution", "bloc", "en voiture");
                case "REFRIGERATED_VAN": return MafiaCleanCity.I18n.Libelle.De("distribution", "bloc", "en camion réfrigéré");
                default: return MafiaCleanCity.I18n.Repli.Type(type);   // hors domaine : le mot de la famille (atelier 28) ; absent : « — » ; jamais la valeur brute
            }
        }
    }

    /// <summary>TD-558 — la ficelle et son épingle du panneau de liège de ㉘ « La distribution » :
    /// ce qui manquait entre les deux étiquettes (voir le commentaire de classe de
    /// `DistributionScreenController.RendreCorkboard`). PORTEUSE DE DONNÉE, jamais décorative — sa
    /// forme entière (droite/serpente, marques de franchissement, trait continu/interrompu) est
    /// REÇUE via `DefinirTrace`, calculée exclusivement par `DistributionResolvers.
    /// FormeChaineSerpente`/`NombreTraverseesFicelle`/`EstRompue` : ce fichier ne relit aucune des
    /// 3 valeurs de domaine autrement.
    ///
    /// ⛔⛔ `MaskableGraphic`, JAMAIS `Graphic` nu — patron `VerticalGradientImage` (incident
    /// 2026-08-22 : un `Graphic` nu n'implémente ni `IMaskable` ni `IClippable`, donc échappe à
    /// tout `Mask` parent, deux panneaux du shell rendus non masqués pendant des semaines pour
    /// cette raison exacte). Et son `CanvasRenderer` est posé EXPLICITEMENT par l'appelant
    /// (`RendreCorkboard`) — `AddComponent<T>()` à l'exécution n'honore PAS le
    /// `[RequireComponent(CanvasRenderer)]` hérité de `Graphic` : sans lui, ce composant ne
    /// dessinerait RIEN, sans la moindre erreur console.
    ///
    /// R2.3 — toute géométrie (épaisseur, rayon, amplitude) et toute couleur sont REÇUES via
    /// `DefinirTrace`, jamais câblées ici (même discipline que `VerticalGradientImage.SetColors`) :
    /// ce fichier ne contient aucun littéral de couleur ni de px CSS.</summary>
    public class DistributionFicelleGraphic : MaskableGraphic
    {
        // Tessellation de la courbe "serpente" — une qualité de rendu, pas une valeur de design :
        // aucune maquette ni aucun résolveur n'en dépend, seule la mesh en dépend.
        private const int Segments = 32;

        // ± autour du centre du trait, EN PROPORTION de sa longueur totale — la coupure existe
        // pour une branche "rompue" JAMAIS observée sur ce back (voir
        // `DistributionResolvers.EstRompue`) : sa largeur exacte n'est donc sourcée nulle part,
        // choisie pour rester lisible sans dépendre de la résolution (une proportion, pas un px).
        private const float DemiCoupureProportion = 0.035f;

        private Vector2 origine, destination;
        private bool serpente, rompue, trace;
        private int traversees;
        private Color couleurCorde, couleurEpingle;
        private float epaisseurTrait, rayonEpingle, amplitudeSerpent, demiLargeurTraversee;

        /// <summary>Le seul point d'entrée de donnée de ce composant — voir `RendreCorkboard`
        /// pour la provenance de chaque argument (résolveurs nommés, `RectTransform` réels,
        /// conversions `Px()`).</summary>
        public void DefinirTrace(Vector2 origineLocale, Vector2 destinationLocale, bool estSerpente,
            int nombreTraversees, bool estRompue, Color corde, Color epingle,
            float epaisseur, float rayon, float amplitude, float demiLargeurMarque)
        {
            origine = origineLocale;
            destination = destinationLocale;
            serpente = estSerpente;
            traversees = Mathf.Max(0, nombreTraversees);
            rompue = estRompue;
            couleurCorde = corde;
            couleurEpingle = epingle;
            epaisseurTrait = Mathf.Max(0.5f, epaisseur);
            rayonEpingle = Mathf.Max(0f, rayon);
            amplitudeSerpent = amplitude;
            demiLargeurTraversee = Mathf.Max(0.5f, demiLargeurMarque);
            trace = true;
            SetVerticesDirty();
        }

        /// <summary>Le point du trait à `t ∈ [0,1]` : un `Lerp` pur si "direct" ; une onde SINUS
        /// complète perpendiculaire au segment direct si "serpente" — jamais un shader, jamais une
        /// texture, une mesh uGUI classique comme `VerticalGradientImage` voisine.</summary>
        private Vector2 Evaluer(float t)
        {
            Vector2 direct = Vector2.Lerp(origine, destination, t);
            if (!serpente) return direct;

            Vector2 delta = destination - origine;
            Vector2 normale = delta.sqrMagnitude > 0.0001f
                ? new Vector2(-delta.y, delta.x).normalized
                : Vector2.up;
            float decalage = Mathf.Sin(t * Mathf.PI * 2f) * amplitudeSerpent;
            return direct + normale * decalage;
        }

        protected override void OnPopulateMesh(VertexHelper vh)
        {
            vh.Clear();
            if (!trace) return;

            // Le trait — continu, ou interrompu autour de son centre si `rompue` (brief : « une
            // route rompue doit rendre le trait INTERROMPU » — jamais une couleur qui change
            // seule, un GESTE géométrique).
            float gapDebut = 0.5f - DemiCoupureProportion;
            float gapFin = 0.5f + DemiCoupureProportion;
            for (int i = 0; i < Segments; i++)
            {
                float t0 = i / (float)Segments;
                float t1 = (i + 1) / (float)Segments;
                if (rompue && t0 < gapFin && t1 > gapDebut) continue;
                AjouterSegment(vh, Evaluer(t0), Evaluer(t1), couleurCorde, epaisseurTrait);
            }

            // Les marques de franchissement — SUR le trait, à l'endroit où il croise (brief :
            // « pas dans la légende ») : un petit tick perpendiculaire à la tangente locale,
            // réparti régulièrement le long du trait entier.
            for (int k = 0; k < traversees; k++)
            {
                float t = (k + 1) / (float)(traversees + 1);
                Vector2 p = Evaluer(t);
                Vector2 tangente = Evaluer(Mathf.Min(1f, t + 0.01f)) - Evaluer(Mathf.Max(0f, t - 0.01f));
                if (tangente.sqrMagnitude < 0.0001f) tangente = destination - origine;
                Vector2 normale = new Vector2(-tangente.y, tangente.x).normalized;
                AjouterSegment(vh, p - normale * demiLargeurTraversee, p + normale * demiLargeurTraversee,
                    couleurCorde, epaisseurTrait * 0.85f);
            }

            // L'épingle — un disque plein à l'ORIGINE (le coin de l'étiquette de départ), patron
            // m-54 : le pin rouge où la ficelle démarre.
            AjouterDisque(vh, origine, rayonEpingle, couleurEpingle);
        }

        private static void AjouterSegment(VertexHelper vh, Vector2 a, Vector2 b, Color couleur, float epaisseur)
        {
            Vector2 delta = b - a;
            if (delta.sqrMagnitude < 0.0001f) return;
            Vector2 dir = delta.normalized;
            Vector2 normale = new Vector2(-dir.y, dir.x) * (epaisseur * 0.5f);

            int idx = vh.currentVertCount;
            vh.AddVert(new Vector3(a.x - normale.x, a.y - normale.y), couleur, Vector2.zero);
            vh.AddVert(new Vector3(a.x + normale.x, a.y + normale.y), couleur, Vector2.zero);
            vh.AddVert(new Vector3(b.x + normale.x, b.y + normale.y), couleur, Vector2.zero);
            vh.AddVert(new Vector3(b.x - normale.x, b.y - normale.y), couleur, Vector2.zero);
            vh.AddTriangle(idx, idx + 1, idx + 2);
            vh.AddTriangle(idx + 2, idx + 3, idx);
        }

        private static void AjouterDisque(VertexHelper vh, Vector2 centre, float rayon, Color couleur,
            int segments = 16)
        {
            if (rayon <= 0f) return;
            int idxCentre = vh.currentVertCount;
            vh.AddVert(new Vector3(centre.x, centre.y), couleur, Vector2.zero);
            int premier = vh.currentVertCount;
            for (int i = 0; i <= segments; i++)
            {
                float angle = i / (float)segments * Mathf.PI * 2f;
                Vector2 p = centre + new Vector2(Mathf.Cos(angle), Mathf.Sin(angle)) * rayon;
                vh.AddVert(new Vector3(p.x, p.y), couleur, Vector2.zero);
            }
            for (int i = 0; i < segments; i++)
                vh.AddTriangle(idxCentre, premier + i, premier + i + 1);
        }
    }
}
