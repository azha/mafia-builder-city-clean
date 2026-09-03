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
using MafiaCleanCity.CityMap;   // REUSE WorldApiClient + CityProjectionsClient (découverte du bâtiment, §4)
using MafiaCleanCity.I18n;

namespace MafiaCleanCity.Operational
{
    /// <summary>ecran_appro « La chaîne d'appro » (㉚) — le bon de commande de matière première,
    /// sur ses données réelles.
    ///
    /// Patron : `ReputationScreenController` (㊲, `pilote-B`). Maquette :
    /// `Tools/juge-visuel/v6/m-48.png` (repos) .. `m-53.png` (délégué) — voir
    /// `Tools/juge-visuel/ecran_appro/dossier.md`.
    ///
    /// ⛔⛔ TROIS CONTRATS DU BRIEF ÉTAIENT FAUX, CORRIGÉS PAR LA MESURE DU 2026-09-03 (voir
    /// implementation-notes.md § Deviations pour le détail) :
    ///  1. `GET /v1/operational/precursors` EXIGE `building_id` (422 sans lui) — la note en
    ///     donnait une lecture sans paramètre.
    ///  2. Le corps réel porte 9 clés, pas 5 — `building`/`precursor_type`/`has_pending_order`/
    ///     `has_arrived_order` manquaient à l'énumération initiale.
    ///  3. `nodes` de `GET /v1/supply-chain/graph` est VIDE sur le compte de démo — confirmé, et
    ///     c'est le fait porteur de la section « LA CHAÎNE, EN REMONTANT » (§3 du brief).
    ///
    /// GÉOMÉTRIE — deux règles héritées, non négociables (mesurées ailleurs dans ce dépôt) :
    ///  · aucune valeur dérivée de `Screen.*` ni d'un `rect` lu au montage — passer par
    ///    `EchelleMaquette.Px(...)`. Maquette source NON confirmée parmi les 3/4 largeurs connues
    ///    (`hud-brennar.html`=392, `ecrans-brennar.html`=300, `-6`=300, `-4`=300) — `Tools/
    ///    juge-visuel/v6/` ne recoupe aucun nom de fichier HTML déjà cité dans ce dépôt, et lire la
    ///    source (`atelier3d-mafia`, hors de cet arbre) était hors périmètre. Le squelette avait
    ///    posé `LargeurEcransBrennar` (300) par défaut ; conservé tel quel — les 3 candidats à 300
    ///    valent aujourd'hui le même nombre, donc le choix ne change rien tant qu'ils ne divergent
    ///    pas (voir implementation-notes.md § Deviations).
    ///  · `Canvas.scaleFactor` lu la frame de la création rend 1,0 — plausible et faux. Toute
    ///    lecture de géométrie attend `yield return null` après la construction.</summary>
    public class ChaineDApproScreenController : MonoBehaviour, IShellTenant
    {
        [Header("Backend")]
        [SerializeField] private string baseUrl = "http://localhost";

        // ---- points d'injection du shell (IShellTenant) -----------------------------------
        private Transform mountParent;

        /// <summary>Construit dès que le parent est connu (correctif du squelette : `Awake()`
        /// tourne dans `AddComponent&lt;T&gt;()`, AVANT que l'appelant ait pu poser le parent — voir
        /// le commentaire d'origine, conservé plus bas sur `EnsureInitialized`).</summary>
        public void SetMountParent(Transform parent)
        {
            mountParent = parent;
            EnsureInitialized();
            // ⛔⛔ ORDRE DE FRATRIE — patron `ShopScreenController.cs:100-134`, le commit le PLUS
            // RÉCENT de ce dépôt au moment où ce fichier a été écrit (2026-09-02 16:03, contre
            // `ReputationScreenController` 06:42 le même jour — 10h d'écart, même journée).
            // ⚠️ LE BRIEF CITAIT `OnTransformParentChanged` — C'EST FAUX, ET LE CORPS DE SHOP LE
            // DIT NOMMÉMENT : ce hook ne peut jamais tirer, parce qu'au moment où le shell
            // re-parente le host (`host.transform.SetParent(slot)`), le composant tenant N'EXISTE
            // PAS ENCORE (`AddComponent&lt;T&gt;()` arrive après, à l'étape suivante). Shop l'a
            // essayé, l'a vu mort, et corrigé par un second appel dans `Start()` — c'est CE
            // patron-là que ce fichier suit, pas celui du brief (voir implementation-notes.md
            // § Deviations).
            // ⛔ L'HÔTE N'EST PAS UN `RectTransform` — `ConstruireLocataire` le crée par un
            // `new GameObject($"Tenant_{T}")` nu (vérifié le 2026-09-03 sur `main` : zéro
            // `AddComponent<RectTransform>` dans `AppShell.cs`). On le demande donc
            // EXPLICITEMENT plutôt que de compter sur l'effet de bord de quelqu'un d'autre :
            // sans lui, le harnais de capture rend « n'est pas un RectTransform ».
            RectTransform rtHote = transform as RectTransform;
            if (rtHote == null) rtHote = gameObject.AddComponent<RectTransform>();
            rtHote.anchorMin = Vector2.zero;
            rtHote.anchorMax = Vector2.one;
            rtHote.offsetMin = Vector2.zero;
            rtHote.offsetMax = Vector2.zero;
            // L'ordre porte sur l'HÔTE, pas sur la racine : c'est lui qui est frère des
            // autres locataires sous `ContentSlot`.
            transform.SetAsLastSibling();
        }

        private string token;
        public void SetToken(string t) => token = t;

        // ---- crochets de test ---------------------------------------------------------------
        public GetOperationalPrecursorsResponseDto DernierChargement { get; private set; }
        public GetSupplyChainGraphResponseDto DernierGraphe { get; private set; }
        public string DerniereErreur { get; private set; }
        public long DernierCodeErreur { get; private set; }
        /// <summary>Le `building_id` trouvé par `DecouvrirBuildingId` — crochet de test (§4/§5 du
        /// brief : « écris ton choix et son coût »).</summary>
        public string BuildingIdDecouvert { get; private set; }
        /// <summary>Les textes RÉELLEMENT rendus, dans l'ordre — crochet de test (patron
        /// `ExceptionQueueController.RenderedTexts`), pour asserter le contenu sans dépendre de la
        /// hiérarchie d'objets.</summary>
        public IReadOnlyList<string> RenderedTexts => renderedTexts;
        private readonly List<string> renderedTexts = new List<string>();

        private RectTransform racinePleinEcran;
        private ChaineDApproClient client;
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
            EnsureInitialized();
            EnsureEventSystem();
            // Second point d'ordre de fratrie — voir le commentaire de `SetMountParent` : c'est ce
            // second appel, une frame plus tard, qui rend l'ordre STABLE (patron Shop).
            transform.SetAsLastSibling();
        }

        private void EnsureInitialized()
        {
            if (initialise) return;
            initialise = true;
            client = new ChaineDApproClient { BaseUrl = baseUrl };
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

        // ═══ §4/§5 — Découverte du bâtiment ═════════════════════════════════════════════════════
        //
        // ⛔ AUCUNE ROUTE NE LISTE LES BÂTIMENTS DU JOUEUR (mesuré — la note back du district le
        // dit aussi). Deux chemins possibles, per le brief : `supply-chain/graph` (un seul appel,
        // MAIS le statut de population de `legs[]` sur ce compte n'a jamais été mesuré — et
        // `nodes`, LUI, est confirmé VIDE, donc bâtir la découverte sur le même graphe qui sert
        // ailleurs à PROUVER l'absence de données serait fragile par construction) ; ou balayer
        // les districts.
        // ⇒ TRANCHÉ : balayage districts → interior, REUSE de `MafiaCleanCity.CityMap.
        // WorldApiClient`/`CityProjectionsClient` (DRY — pas de second client HTTP réécrit pour la
        // même route). `DistrictDto.control_state` porte `PLAYER_HELD` : c'est le district que le
        // joueur possède, donc celui où vit son kit de départ (labo compris — Nestor : « Sans
        // pyralin, je ne rallume pas », donc un labo existe forcément sur un compte qui a
        // débloqué cet écran).
        // COÛT : 1 appel `GET /v1/world/districts` (sans auth) + 1 appel `GET .../interior` PAR
        // district PLAYER_HELD rencontré, dans l'ordre, jusqu'au premier qui porte au moins un
        // bâtiment. Cas courant mesuré ailleurs dans ce dépôt (un compte frais n'a qu'UN district
        // possédé) : 2 appels. Pire cas : 1 + N si plusieurs districts sont possédés et que les
        // premiers sont vides de bâtiments (non observé, mais non exclu).
        private IEnumerator DecouvrirBuildingId(Action<string> onOk, Action<string> onErr)
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
            foreach (DistrictDto d in districts)
            {
                if (d.control_state != "PLAYER_HELD") continue;

                DistrictInteriorDto interior = null;
                long codeInterior = 0;
                yield return proj.Interior(d.id, token, i => interior = i, c => codeInterior = c);
                if (interior != null && interior.buildings != null && interior.buildings.Length > 0)
                {
                    // Premier bâtiment du district possédé — pas de filtre sur `operational_type`
                    // (12 membres back, jamais mesurés en entier ici) : filtrer sur un type précis
                    // reviendrait à deviner lequel porte le labo. La route `precursors` elle-même
                    // dira si CE bâtiment ne consomme rien (voir `RendreEtatIndisponible`).
                    onOk?.Invoke(interior.buildings[0].building);
                    yield break;
                }
            }
            onErr?.Invoke("aucun district PLAYER_HELD avec au moins un bâtiment — la prémisse de " +
                          "cet écran (un kit de départ possédé) ne tient pas sur ce compte");
        }

        // ═══ Chargement ══════════════════════════════════════════════════════════════════════

        /// <summary>Charge la surface entière : découvre le bâtiment (§4), amorce l'i18n, puis lit
        /// la fiche (route 1) et le graphe (route 3, pour la section chaîne).</summary>
        public IEnumerator Charger()
        {
            EnsureInitialized();
            DerniereErreur = null;
            DernierCodeErreur = 0;

            string buildingId = null;
            string errBuilding = null;
            yield return DecouvrirBuildingId(id => buildingId = id, e => errBuilding = e);
            if (string.IsNullOrEmpty(buildingId))
            {
                DerniereErreur = errBuilding ?? "découverte du bâtiment : échec";
                RendreEtatIndisponible();
                yield break;
            }
            BuildingIdDecouvert = buildingId;

            // ⛔ SANS CETTE LIGNE, LES RÉSOLVEURS SONT MUETS (patron ⑨, `ExceptionQueueController.
            // Boot`) : `Libelle.De` rend le littéral tant que le dictionnaire est vide, donc
            // l'écran reste lisible en français « en dur » — le branchement se serait « bien
            // passé » et n'aurait rien changé. Amorcé ici plutôt que caché.
            yield return I18nCatalog.Amorcer(new I18nClient { BaseUrl = baseUrl }, token);

            yield return RechargerPrecurseurs();
            yield return RechargerChaine();
        }

        private IEnumerator RechargerPrecurseurs()
        {
            DerniereErreur = null;
            DernierCodeErreur = 0;
            // ⛔ REMIS À NULL AVANT L'APPEL : sans ça, un échec réseau sur un RECHARGEMENT (après
            // une commande) laisserait `DernierChargement` porter l'ancien état pré-commande, et
            // le test d'échec juste en dessous (`== null`) ne le verrait jamais — l'écran
            // afficherait alors un état PÉRIMÉ en silence plutôt que le message d'indisponibilité.
            DernierChargement = null;
            yield return client.GetOperationalPrecursors(token, BuildingIdDecouvert,
                dto => DernierChargement = dto,
                (code, msg) => { DernierCodeErreur = code; DerniereErreur = msg; });

            // La frame de création rend des rects non résolus : on attend le layout AVANT de
            // rendre quoi que ce soit qui lise une géométrie.
            yield return null;

            if (DernierChargement == null) { RendreEtatIndisponible(); yield break; }
            AppliquerEtat(DernierChargement);
        }

        private IEnumerator RechargerChaine()
        {
            GetSupplyChainGraphResponseDto graphe = null;
            yield return client.GetSupplyChainGraph(token,
                dto => graphe = dto,
                // Non bloquant : la section chaîne se contente d'un état vide honnête même sans
                // le graphe (§3 du brief) — un 4xx/5xx ici ne doit pas casser le bon de commande.
                (code, msg) => DerniereErreur = DerniereErreur ?? $"graphe : {code} {msg}");
            DernierGraphe = graphe;
            AppliquerChaine(graphe);
        }

        /// <summary>Rend un corps FABRIQUÉ, sans réseau — réservé aux tests (patron ㊲,
        /// `RendrePourTest`). Ne prouve jamais que le back émet ce corps, seulement ce que
        /// l'écran EN FAIT.</summary>
        public void RendrePourTest(GetOperationalPrecursorsResponseDto dto)
        {
            EnsureInitialized();
            DernierChargement = dto;
            AppliquerEtat(dto);
        }

        /// <summary>Idem pour la section chaîne — voir `RendrePourTest`.</summary>
        public void RendrePourTestChaine(GetSupplyChainGraphResponseDto dto)
        {
            EnsureInitialized();
            DernierGraphe = dto;
            AppliquerChaine(dto);
        }

        // ═══ §1/§2 — Le bon de commande, trois états pilotés par la donnée ══════════════════════
        //
        // repos (m-48, !has_pending_order && !has_arrived_order) · commande en cours (m-49,
        // has_pending_order) · livrée (has_arrived_order — ⛔ AUCUNE MAQUETTE ne couvre cet état,
        // voir `RendrePied` : le texte y est un pis-aller ASSUMÉ, pas une lecture de maquette).
        // ⚠️ Le 4e état de m-53 (« Commander ne vous appartient plus », délégation à un
        // lieutenant) N'EST PAS construit : aucune des 9 clés mesurées ne le porte — voir
        // implementation-notes.md § Deviations. Construire une détection dessus serait deviner.
        private void AppliquerEtat(GetOperationalPrecursorsResponseDto dto)
        {
            // ⛔ VIDÉ ICI, PAS DANS `AppliquerChaine` : un ré-appel (patron `PasserCommandeCoroutine`
            // → `RechargerPrecurseurs` → `AppliquerEtat` une 2e fois sur la MÊME instance, après
            // une commande) accumulerait sinon les textes de l'état PRÉCÉDENT sous les nouveaux —
            // un `DoesNotContain("EN COMMANDER")` après passage en « en cours » resterait faux
            // positif si le texte du premier rendu traîne encore. `AppliquerChaine`, elle,
            // n'efface pas ce qu'`AppliquerEtat` a tracé : les deux sections cumulent leurs
            // textes le temps d'un `Charger()` — c'est ce que `RenderedTexts` doit représenter.
            renderedTexts.Clear();

            bool enCours = dto.has_pending_order;
            // ⚠️ `has_pending_order` ET `has_arrived_order` À LA FOIS VRAIES : cas jamais mesuré
            // (les deux valaient false sur le compte de démo avant toute commande). Priorité
            // donnée à « livrée » — c'est l'état le plus avancé du cycle commande → livraison.
            bool arrivee = dto.has_arrived_order;

            RendreTitre(dto, enCours, arrivee);
            RendreFiche(dto, enCours, arrivee);
            RendrePied(dto, enCours, arrivee);
        }

        private void RendreTitre(GetOperationalPrecursorsResponseDto dto, bool enCours, bool arrivee)
        {
            string titre, sousTitre;
            if (arrivee)
            {
                // ⛔ PIS-ALLER — aucune maquette ne couvre cet état (voir le commentaire de classe
                // ci-dessus et implementation-notes.md § Deviations). Copie inventée, dans le
                // registre des deux autres titres, pas une lecture de m-XX.
                titre = "La commande est arrivée";
                sousTitre = "Le stock est reconstitué. Vous pouvez commander à nouveau.";
            }
            else if (enCours)
            {
                titre = "La commande est en route";                              // m-49, verbatim
                sousTitre = "Elle est payée et partie. Il n'y a plus qu'à attendre."; // m-49, verbatim
            }
            else
            {
                titre = "Commander de la matière première";                      // m-48, verbatim
                sousTitre = "Sans elle, aucun labo ne rallume. Le fournisseur, lui, a ses humeurs."; // m-48
            }
            titreTexte.text = Libelle.De("appro", "titre", titre);
            sousTitreTexte.text = Libelle.De("appro", "sous_titre", sousTitre);
            TrackText(titreTexte.text);
            TrackText(sousTitreTexte.text);
        }

        /// <summary>La fiche crème « BON DE COMMANDE » — les quatre lignes mesurées, la 5e
        /// (« LA COMMANDE ») seulement en cours, et l'encart pénurie sur `scarcity_active`.</summary>
        private void RendreFiche(GetOperationalPrecursorsResponseDto dto, bool enCours, bool arrivee)
        {
            ViderEnfants(ficheRoot);

            GameObject entete = NouveauUI("Entete", ficheRoot);
            HorizontalLayoutGroup h = entete.AddComponent<HorizontalLayoutGroup>();
            h.childControlWidth = true; h.childControlHeight = true;
            h.childForceExpandWidth = true; h.childForceExpandHeight = false;
            AddLayoutElement(entete, preferredHeight: Px(20f));

            string titrePrecurseur = ChaineDApproResolvers.TitreLisible(dto.precursor_type);
            TextMeshProUGUI nom = NouveauTexteFiche(entete.transform, "Nom", titrePrecurseur, 15f, EncreSombre, true);
            AddLayoutElement(nom.gameObject, flexibleWidth: 1);
            TrackText(nom.text);

            TextMeshProUGUI bon = NouveauTexteFiche(entete.transform, "Bon",
                Libelle.De("appro", "bloc", "BON DE COMMANDE"), 8f, CremeSecondaire, false);
            bon.alignment = TextAlignmentOptions.Right;
            bon.characterSpacing = 6f;
            TrackText(bon.text);

            // ⛔ « À QUOI ÇA SERT » — AUCUNE SOURCE DANS LE CORPS (9 clés mesurées, aucune ne
            // décrit l'usage). Le texte de la maquette (« pour le brindle ») est spécifique à
            // Pyralin ; il n'a de sens QUE si `precursor_type == "PYRALIN"`. Affiché ici comme
            // pis-aller GÉNÉRIQUE plutôt que de recopier un texte faux pour un autre précurseur —
            // voir implementation-notes.md § Deviations pour la portée exacte du trou.
            string usage = string.Equals(dto.precursor_type, "PYRALIN", StringComparison.OrdinalIgnoreCase)
                ? "pour le brindle"                // m-48, verbatim — seul cas couvert par la mesure
                : "sert à la production";           // pis-aller générique — aucune source pour les autres types
            ConstruireLigne(ficheRoot, "À QUOI ÇA SERT", usage, EncreSombre);

            string valeurStock = ChaineDApproResolvers.TexteStock(dto.stock_band) + " · " +
                                  (dto.stock_liters_label ?? "?");   // label DÉJÀ formaté, affiché tel quel
            ConstruireLigne(ficheRoot, "CE QU'IL EN RESTE", valeurStock,
                dto.stock_band == "NONE" ? RougeMauvais : EncreSombre);

            ConstruireLigne(ficheRoot, "LE PRIX", ChaineDApproResolvers.TextePrix(dto.price_trend_bucket),
                ChaineDApproResolvers.CouleurPrix(dto.price_trend_bucket, RougeMauvais, VertBon, EncreSombre));

            ConstruireLigne(ficheRoot, "LE FOURNISSEUR",
                ChaineDApproResolvers.TextePressionFournisseur(dto.supplier_pressure_bucket),
                ChaineDApproResolvers.CouleurPressionFournisseur(dto.supplier_pressure_bucket, RougeMauvais, EncreSombre));

            if (enCours)
                ConstruireLigne(ficheRoot, "LA COMMANDE", "est en route", VertBon);   // m-49, verbatim

            if (dto.scarcity_active)
            {
                GameObject banniere = NouveauUI("Penurie", ficheRoot);
                banniere.AddComponent<Image>().color = RougeMauvais;
                VerticalLayoutGroup v = banniere.AddComponent<VerticalLayoutGroup>();
                v.padding = new RectOffset(PxTrait(10f), PxTrait(10f), PxTrait(8f), PxTrait(8f));
                v.spacing = Px(2f);
                v.childControlWidth = true; v.childControlHeight = true;
                v.childForceExpandWidth = true; v.childForceExpandHeight = false;
                AddLayoutElement(banniere, flexibleHeight: 0);

                TextMeshProUGUI ptitre = NouveauTexteFiche(banniere.transform, "Titre",
                    Libelle.De("appro", "bloc", "Il y a une pénurie en ville"), 11f, Color.white, true);
                TrackText(ptitre.text);
                TextMeshProUGUI psous = NouveauTexteFiche(banniere.transform, "Sous",
                    Libelle.De("appro", "bloc", "Tout le monde en cherche en même temps. Ça se paiera plus cher, et plus tard."),
                    8.5f, new Color(1f, 1f, 1f, 0.85f), false);
                psous.enableWordWrapping = true;
                TrackText(psous.text);
            }
        }

        private void ConstruireLigne(Transform parent, string libelleLitteral, string valeur, Color couleurValeur)
        {
            GameObject ligne = NouveauUI("Ligne_" + Libelle.Slug(libelleLitteral), parent);
            HorizontalLayoutGroup h = ligne.AddComponent<HorizontalLayoutGroup>();
            h.childControlWidth = true; h.childControlHeight = true;
            h.childForceExpandWidth = true; h.childForceExpandHeight = false;
            AddLayoutElement(ligne, minHeight: Px(16f), flexibleHeight: 0);

            TextMeshProUGUI lib = NouveauTexteFiche(ligne.transform, "Libelle",
                Libelle.De("appro", "bloc", libelleLitteral), 7.5f, CremeSecondaire, false);
            AddLayoutElement(lib.gameObject, flexibleWidth: 1);
            lib.characterSpacing = 3f;
            TrackText(lib.text);

            TextMeshProUGUI val = NouveauTexteFiche(ligne.transform, "Valeur", valeur, 9.5f, couleurValeur, true);
            val.alignment = TextAlignmentOptions.Right;
            TrackText(val.text);
        }

        /// <summary>Le pied : réplique de lieutenant + bouton (repos), note système (en cours),
        /// ou note + bouton (livrée — pis-aller, voir `RendreTitre`).</summary>
        private void RendrePied(GetOperationalPrecursorsResponseDto dto, bool enCours, bool arrivee)
        {
            ViderEnfants(piedRoot);

            if (enCours)
            {
                // ⚠️ RÉPLIQUE DE LIEUTENANT ABSENTE ICI : m-49 ne montre PLUS Nestor pendant
                // l'attente, seulement une note système — c'est la maquette qui le dit, pas un
                // trou de donnée.
                TextMeshProUGUI note = NouveauTexteFiche(piedRoot, "NoteSysteme",
                    Libelle.De("appro", "bloc", "La commande est payée et partie."), 10f,
                    DesignTokens.Current.onSurfaceSecondary, false);
                note.fontStyle = FontStyles.Italic;
                TrackText(note.text);

                GameObject filet = NouveauUI("Filet", piedRoot);
                Image fi = filet.AddComponent<Image>();
                fi.color = new Color(1f, 1f, 1f, 0.06f);
                VerticalLayoutGroup vf = filet.AddComponent<VerticalLayoutGroup>();
                vf.padding = new RectOffset(PxTrait(10f), PxTrait(10f), PxTrait(8f), PxTrait(8f));
                vf.childControlWidth = true; vf.childControlHeight = true;
                vf.childForceExpandWidth = true; vf.childForceExpandHeight = false;
                AddLayoutElement(filet, flexibleHeight: 0);
                TextMeshProUGUI attente = NouveauTexteFiche(filet.transform, "Attente",
                    Libelle.De("appro", "bloc",
                        "Rien à faire de plus. On ne l'accélère pas — elle arrivera quand le fournisseur l'aura décidé."),
                    8.5f, DesignTokens.Current.onSurfaceMuted, false);
                attente.enableWordWrapping = true;
                TrackText(attente.text);
                return;
            }

            if (arrivee)
            {
                // ⛔ PIS-ALLER — même trou que le titre (voir `RendreTitre`), aucune maquette.
                TextMeshProUGUI note = NouveauTexteFiche(piedRoot, "NoteSysteme",
                    Libelle.De("appro", "bloc", "Livraison réceptionnée."), 10f,
                    DesignTokens.Current.onSurfaceSecondary, false);
                note.fontStyle = FontStyles.Italic;
                TrackText(note.text);
            }
            else
            {
                // ⚠️ RÉPLIQUE DE LIEUTENANT — même trou que « à quoi ça sert » (aucune des 9 clés
                // ne porte de nom ni de réplique de lieutenant). Nom et texte VERBATIM de m-48,
                // valables seulement pour Pyralin/Nestor ; générique sinon.
                bool estPyralin = string.Equals(dto.precursor_type, "PYRALIN", StringComparison.OrdinalIgnoreCase);
                string replique = estPyralin
                    ? "Nestor : « L'étagère est vide. Sans pyralin, je ne rallume pas. »"
                    : "Votre lieutenant : « On en a besoin, et il n'y en a plus. »";
                TextMeshProUGUI q = NouveauTexteFiche(piedRoot, "Replique",
                    Libelle.De("appro", "bloc", replique), 9.5f, DesignTokens.Current.onSurfaceSecondary, false);
                q.fontStyle = FontStyles.Italic;
                q.enableWordWrapping = true;
                TrackText(q.text);
            }

            GameObject bouton = NouveauUI("BoutonCommander", piedRoot);
            Image fond = bouton.AddComponent<Image>();
            fond.color = Or;
            Button b = bouton.AddComponent<Button>();
            b.targetGraphic = fond;
            b.onClick.AddListener(PasserCommande);
            HorizontalLayoutGroup hb = bouton.AddComponent<HorizontalLayoutGroup>();
            hb.padding = new RectOffset(PxTrait(14f), PxTrait(14f), PxTrait(10f), PxTrait(10f));
            hb.childControlWidth = true; hb.childControlHeight = true;
            hb.childForceExpandWidth = false; hb.childForceExpandHeight = false;
            hb.childAlignment = TextAnchor.MiddleLeft;
            AddLayoutElement(bouton, preferredHeight: Px(38f));

            TextMeshProUGUI libBouton = NouveauTexteFiche(bouton.transform, "Libelle",
                Libelle.De("appro", "bouton", "EN COMMANDER"), 11f, EncreSombre, true);
            libBouton.characterSpacing = 4f;
            TrackText(libBouton.text);
            boutonCommanderTexte = libBouton;
            boutonCommander = b;
        }

        // ═══ §3 — La chaîne, en état vide honnête ═══════════════════════════════════════════════
        //
        // ⛔⛔ `nodes` EST VIDE SUR LE COMPTE DE DÉMO (mesuré 2026-09-03, `GET /v1/supply-chain/
        // graph`) — c'est le fait le plus important de cet écran. La liste numérotée de m-50/51/52
        // (« LA CHAÎNE, EN REMONTANT », crans 1/2/3/!) N'A DONC AUCUNE SOURCE : construire ces
        // crans serait fabriquer une liste. Le squelette de la section RESTE (pas de section
        // masquée), avec un message qui dit la mesure au joueur — pas une liste inventée.
        // ⇒ ET COMME `backpressure`/`trace-step`/`resolve` prennent toutes un identifiant de nœud
        // (la seule action locale scaffoldée dans ce sens, `POST .../legs/:id/maintain`, prend un
        // `leg_id`), elles sont INATTEIGNABLES sans un nœud connu : non câblées, voir
        // `ChaineDApproClient.PostSupplyChainLegsMaintain`.
        private void AppliquerChaine(GetSupplyChainGraphResponseDto dto)
        {
            ViderEnfants(chaineRoot);

            TextMeshProUGUI label = NouveauTexteFiche(chaineRoot, "ChaineLabel",
                Libelle.De("appro", "bloc", "LA CHAÎNE, EN REMONTANT"), 8.5f,
                DesignTokens.Current.onSurfaceSecondary, false);
            label.characterSpacing = 4f;
            TrackText(label.text);

            bool vide = dto == null || dto.nodes == null || dto.nodes.Length == 0;
            string message = vide
                // MESURÉ (2026-09-03, compte `operational_demo@example.test`) : `nodes: []`.
                ? "Rien à remonter pour l'instant — la chaîne ne connaît aucun maillon sur ce compte."
                // Jamais observé non vide ici : pas de rendu dédié cette passe (aucune maquette
                // pour un nœud réel, et backpressure/trace-step/resolve restent inatteignables
                // sans id de nœud) — voir implementation-notes.md § Deviations.
                : "Des maillons existent, mais cet écran ne sait pas encore les afficher.";
            TextMeshProUGUI msg = NouveauTexteFiche(chaineRoot, "ChaineMessage",
                Libelle.De("appro", "bloc", message), 9f, DesignTokens.Current.onSurfaceMuted, false);
            msg.enableWordWrapping = true;
            TrackText(msg.text);
        }

        /// <summary>Repli NOMMÉ sur échec réseau — jamais une exception, jamais un écran noir
        /// (patron ㊲ : `Render(null)` a fait planter un autre écran de ce dépôt à la première
        /// ligne qui lisait le payload).</summary>
        private void RendreEtatIndisponible()
        {
            ViderEnfants(ficheRoot);
            ViderEnfants(piedRoot);
            ViderEnfants(chaineRoot);
            titreTexte.text = Libelle.De("appro", "titre", "La chaîne d'appro est indisponible");
            sousTitreTexte.text = string.IsNullOrEmpty(DerniereErreur)
                ? Libelle.De("appro", "sous_titre", "Réessayez dans un instant.")
                : DerniereErreur;
            TrackText(titreTexte.text);
            TrackText(sousTitreTexte.text);
        }

        // ═══ Le geste « EN COMMANDER » ═══════════════════════════════════════════════════════════

        /// <summary>Câblée sur `Button.onClick` (patron `ExceptionQueueController.OpenDetail`) :
        /// fire-and-forget côté UI, la coroutine porte toute la logique et est aussi exposée en
        /// awaitable pour les tests (`PasserCommandeEtRecharger`).</summary>
        public void PasserCommande()
        {
            if (string.IsNullOrEmpty(BuildingIdDecouvert) || DernierChargement == null) return;
            StartCoroutine(PasserCommandeCoroutine());
        }

        /// <summary>Crochet de test : awaitable, contrairement à `PasserCommande()`.</summary>
        public IEnumerator PasserCommandeEtRecharger() => PasserCommandeCoroutine();

        private IEnumerator PasserCommandeCoroutine()
        {
            // ⚠️ `quantity_units` — AUCUNE UI de quantité dans la maquette (m-48..m-53 : un seul
            // bouton, zéro sélecteur). Pis-aller : 1 unité, la plus petite commande possible —
            // voir `PostOperationalPrecursorsOrderBody` et implementation-notes.md § Deviations.
            var body = new PostOperationalPrecursorsOrderBody
            {
                building_id = BuildingIdDecouvert,
                precursor_type = DernierChargement.precursor_type,
                quantity_units = 1,
            };
            string erreur = null;
            yield return client.PostOperationalPrecursorsOrder(token, body,
                dto => { /* réponse = seulement order_id (mesuré) — on relit la route 1 pour l'état */ },
                (code, msg) => erreur = $"{code}: {msg}");
            if (erreur != null)
            {
                DerniereErreur = erreur;
                yield break;
            }
            // « Puis re-lit la route 1 » (brief §2) — pas `Charger()` : le bâtiment est déjà connu,
            // re-découvrir coûterait 1 à 2 appels inutiles.
            yield return RechargerPrecurseurs();
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
            // ⛔ SOUS L'HÔTE, PAS SOUS `mountParent` — aligné le 2026-09-03 sur le gabarit
            // corrigé (`Tools/nouvel-ecran.py:515-518`). Bâtir sous `mountParent` faisait
            // naître la feuille en FRÈRE de l'hôte : toute garde en `GetComponentsInChildren`
            // sur le composant mesurait alors un sous-arbre VIDE et rapportait « chargement non
            // abouti » sur un écran parfaitement affiché — payé le même jour sur quatre écrans
            // d'un coup, avec quatre messages précis, chiffrés et faux. `transform` EST déjà
            // l'enfant de `ContentSlot` que le shell gouverne ; hors shell on retombe sur le
            // canvas découvert.
            Transform root = mountParent != null ? transform : canvas.transform;

            // La racine PLEIN ÉCRAN — jamais un panneau intermédiaire : c'est elle qui sert de
            // référence d'échelle à `Px()`/`PxTrait()` (un conteneur plus étroit fausserait
            // TOUTE la mise à l'échelle par un facteur muet).
            GameObject racine = NouveauUI("ChaineDApproRoot", root);
            racinePleinEcran = (RectTransform)racine.transform;
            Etirer(racinePleinEcran);
            AjouterFond(racine, DesignTokens.Current.surfaceBase);
            racinePleinEcran.SetAsLastSibling();

            // ⛔ L'ÉCHELLE AVANT TOUTE CONVERSION (patron `ExceptionQueueController`) — un
            // RectTransform qui vient d'être étiré n'a pas encore son `rect` résolu.
            Canvas.ForceUpdateCanvases();

            // Le corps vit SOUS le bandeau haut ET AU-DESSUS du dock bas — LES DEUX insets,
            // publiés par le shell (`ShellChrome`). Hors shell (tests isolés) les deux valent 0 et
            // le corps remplit tout l'écran : le comportement d'avant que ces champs existent.
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
                18f, DesignTokens.Current.onSurfacePrimary, true);
            titreTexte.enableWordWrapping = true;

            sousTitreTexte = NouveauTexteFiche(corpsGo.transform, "SousTitre", "",
                10.5f, DesignTokens.Current.onSurfaceSecondary, false);
            sousTitreTexte.enableWordWrapping = true;
            AddLayoutElement(sousTitreTexte.gameObject, flexibleHeight: 0);

            // La fiche crème « BON DE COMMANDE » — un fond, un layout, contenu rempli par
            // `RendreFiche` (appelée à chaque `AppliquerEtat`).
            GameObject ficheGo = NouveauUI("Fiche", corpsGo.transform);
            ficheGo.AddComponent<Image>().color = Creme;
            VerticalLayoutGroup vf = ficheGo.AddComponent<VerticalLayoutGroup>();
            vf.padding = new RectOffset(PxTrait(12f), PxTrait(12f), PxTrait(10f), PxTrait(10f));
            vf.spacing = Px(5f);
            vf.childControlWidth = true; vf.childControlHeight = true;
            vf.childForceExpandWidth = true; vf.childForceExpandHeight = false;
            AddLayoutElement(ficheGo, flexibleHeight: 0);
            ficheRoot = ficheGo.transform;

            // « LA CHAÎNE, EN REMONTANT » — squelette persistant (§3), contenu rempli par
            // `AppliquerChaine`.
            GameObject chaineGo = NouveauUI("Chaine", corpsGo.transform);
            VerticalLayoutGroup vc = chaineGo.AddComponent<VerticalLayoutGroup>();
            vc.spacing = Px(4f);
            vc.childControlWidth = true; vc.childControlHeight = true;
            vc.childForceExpandWidth = true; vc.childForceExpandHeight = false;
            AddLayoutElement(chaineGo, flexibleHeight: 0);
            chaineRoot = chaineGo.transform;

            // Le pied — réplique/note + bouton, contenu rempli par `RendrePied`.
            GameObject piedGo = NouveauUI("Pied", corpsGo.transform);
            VerticalLayoutGroup vp = piedGo.AddComponent<VerticalLayoutGroup>();
            vp.spacing = Px(8f);
            vp.childControlWidth = true; vp.childControlHeight = true;
            vp.childForceExpandWidth = true; vp.childForceExpandHeight = false;
            AddLayoutElement(piedGo, flexibleHeight: 1);
            piedRoot = piedGo.transform;
        }

        private Transform ficheRoot, chaineRoot, piedRoot;
        private TextMeshProUGUI titreTexte, sousTitreTexte, boutonCommanderTexte;
        private Button boutonCommander;

        // ═══ Palette — locale, patron `ShopScreenController` (le voisin le plus récent de la
        // même famille de maquette) : les tokens `DesignTokens.fiche*`/`hudCreme*` existent mais
        // pour un AUTRE consommateur mesuré (la fiche bâtiment sombre de l'écran principal,
        // `hud-brennar.html`, pas cette fiche crème-là) — « un token par consommateur mesuré »
        // interdit de les recycler ici sans mesure. Les accents sémantiques (danger/succès), eux,
        // sont explicitement documentés comme génériques (« Accents sémantiques (sévérité
        // mild/moderate/severe + CTA) ») : réutilisés tels quels. ═══════════════════════════════
        private static readonly Color Creme = Hex("#eae0c8");
        private static readonly Color CremeSecondaire = Hex("#b9ad92");
        // ⚠️ ESTIMÉ VISUELLEMENT SUR LA MAQUETTE, NON ÉCHANTILLONNÉ AU PIXEL — aucun outil de
        // lecture de pixel n'était disponible cette passe. À corriger par une sonde dédiée (patron
        // `Tools/mesure-geometrie-*.py`) avant tout jugement `juge-visuel`. Voir
        // implementation-notes.md § Deviations.
        private static readonly Color EncreSombre = Hex("#241804");
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

    /// <summary>ecran_appro — les correspondances « valeur du domaine → apparence », chacune en
    /// FONCTION NOMMÉE prenant la valeur du domaine (patron `HeatBucketResolver` — jamais un
    /// tableau positionnel ni une chaîne de ternaires dispersée dans la mise en page : ce dépôt a
    /// mesuré qu'une correspondance écrite en commentaire ou en index de tableau ne peut pas être
    /// assertée ; une fonction nommée, si).
    ///
    /// ⚠️ TROIS DOMAINES, TROIS NIVEAUX DE CONFIANCE, ET LA FORME SUIT LE NIVEAU :
    ///  · `supplier_pressure_bucket` — domaine FERMÉ ANNONCÉ par le back (message d'erreur mesuré
    ///    2026-09-03 : FRESH | USED | STRAINED). Résolveur EXHAUSTIF sur un enum OWNED, `default:
    ///    throw` (patron `HeatBucketResolver.SeverityFor`) : une 4e valeur RÉELLE doit être
    ///    BRUYANTE, jamais absorbée en silence par un repli connu.
    ///  · `price_trend_bucket`/`stock_band` — SEULE UNE VALEUR CHACUN est mesurée ("UP"/"NONE").
    ///    Les autres littéraux ci-dessous ("STABLE"/"DOWN") sont des HYPOTHÈSES DE CLÉ tirées de
    ///    la maquette (le TEXTE associé est confirmé par le design — m-49/m-53 — le LITTÉRAL DE
    ///    CLÉ back ne l'est pas). Résolveur en Label STRING→STRING (patron
    ///    `HeatBucketResolver.Label`) : repli GRACIEUX sur la valeur brute, jamais un throw — un
    ///    domaine non confirmé fermé ne doit jamais faire planter l'écran sur une vraie valeur
    ///    back simplement non mesurée ici.</summary>
    public static class ChaineDApproResolvers
    {
        public enum PressionFournisseur { Fresh, Used, Strained }

        public static PressionFournisseur ResolvePressionFournisseur(string bucket)
        {
            switch (bucket)
            {
                case "FRESH": return PressionFournisseur.Fresh;
                case "USED": return PressionFournisseur.Used;
                case "STRAINED": return PressionFournisseur.Strained;
                default: throw new ArgumentOutOfRangeException(nameof(bucket), bucket,
                    "ChaineDApproResolvers.ResolvePressionFournisseur : bucket hors du domaine " +
                    "annoncé (FRESH|USED|STRAINED, mesuré 2026-09-03) — 4e valeur RÉELLE du " +
                    "domaine, à traiter explicitement ici, jamais absorbée en silence.");
            }
        }

        public static string TextePressionFournisseur(PressionFournisseur p)
        {
            switch (p)
            {
                case PressionFournisseur.Fresh: return "il vous prend encore au sérieux";   // m-49
                case PressionFournisseur.Used: return "il commence à traîner";              // m-53
                case PressionFournisseur.Strained: return "il vous fait attendre exprès";   // m-48
                default: throw new ArgumentOutOfRangeException(nameof(p), p,
                    "ChaineDApproResolvers.TextePressionFournisseur : membre non résolu.");
            }
        }

        public static string TextePressionFournisseur(string bucket) =>
            TextePressionFournisseur(ResolvePressionFournisseur(bucket));

        public static Color CouleurPressionFournisseur(PressionFournisseur p, Color mauvais, Color neutre)
        {
            switch (p)
            {
                case PressionFournisseur.Fresh: return neutre;      // m-49 : encre neutre
                case PressionFournisseur.Used: return neutre;       // m-53 : encre neutre (mesuré, pas rouge)
                case PressionFournisseur.Strained: return mauvais;  // m-48 : rouge brique
                default: throw new ArgumentOutOfRangeException(nameof(p), p,
                    "ChaineDApproResolvers.CouleurPressionFournisseur : membre non résolu.");
            }
        }

        public static Color CouleurPressionFournisseur(string bucket, Color mauvais, Color neutre) =>
            CouleurPressionFournisseur(ResolvePressionFournisseur(bucket), mauvais, neutre);

        /// <summary>"UP" MESURÉ (2026-09-03). "STABLE"/"DOWN" : hypothèse de clé, texte de
        /// m-49/m-53. Repli GRACIEUX : la valeur brute, jamais un throw (domaine non confirmé
        /// fermé).</summary>
        public static string TextePrix(string bucket)
        {
            switch (bucket)
            {
                case "UP": return "le prix monte";              // m-48, MESURÉ
                case "STABLE": return "le prix ne bouge pas";    // m-49 — hypothèse de clé
                case "DOWN": return "le prix baisse";            // m-53 — hypothèse de clé
                default: return string.IsNullOrEmpty(bucket) ? "prix : état inconnu" : bucket;
            }
        }

        public static Color CouleurPrix(string bucket, Color mauvais, Color bon, Color neutre)
        {
            switch (bucket)
            {
                case "UP": return mauvais;    // m-48 : rouge brique
                case "DOWN": return bon;      // m-53 : vert
                default: return neutre;       // "STABLE" (m-49) et tout inconnu : encre neutre
            }
        }

        /// <summary>"NONE" MESURÉ (2026-09-03). Repli GRACIEUX — même raisonnement que
        /// `TextePrix`.</summary>
        public static string TexteStock(string band)
        {
            switch (band)
            {
                case "NONE": return "il n'y a plus rien";   // m-48, MESURÉ
                default: return string.IsNullOrEmpty(band) ? "stock : état inconnu" : band;
            }
        }

        /// <summary>Formatage GÉNÉRIQUE d'un littéral de domaine back (ex. "PYRALIN",
        /// "VERDANT_ROOT_EXTRACT") en titre lisible — PAS une table de noms par précurseur
        /// (aucune mesurée au-delà de "PYRALIN"→"Pyralin"). Transforme les soulignés en espaces et
        /// met chaque mot en casse Titre. NON confirmé sur un nom à plusieurs mots — seule la
        /// forme à un mot (Pyralin) est réellement mesurée.</summary>
        public static string TitreLisible(string type)
        {
            if (string.IsNullOrEmpty(type)) return "?";
            string[] mots = type.Split('_');
            for (int i = 0; i < mots.Length; i++)
            {
                if (mots[i].Length == 0) continue;
                mots[i] = char.ToUpperInvariant(mots[i][0]) + mots[i].Substring(1).ToLowerInvariant();
            }
            return string.Join(" ", mots);
        }
    }
}
