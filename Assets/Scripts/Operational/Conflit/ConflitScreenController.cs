using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.EventSystems;
using UnityEngine.InputSystem.UI;
using UnityEngine.UI;
using TMPro;
using MafiaCleanCity.Shell;
using MafiaCleanCity.Theme;
using MafiaCleanCity.I18n;

namespace MafiaCleanCity.Operational
{
    /// <summary>ecran_conflit « Le conflit » (㉙) — « la table du fond », version 2 dite lisible,
    /// sur ses données réelles.
    ///
    /// Patron : `LoiScreenController` (㉛, le voisin le plus récent de la même famille de
    /// maquette `Tools/juge-visuel/v6/`) — mêmes idiomes : `Libelle.De`, résolveurs nommés,
    /// `TrackText`/`RenderedTexts`, `ShellChrome.TopInsetPx`/`BottomInsetPx`, section vide
    /// honnête plutôt que fabriquée.
    ///
    /// ⛔⛔ CE QUE m-65/m-66 MONTRENT, ET CE QUE CET ÉCRAN NE PEUT PAS CONSTRUIRE — mesuré en
    /// direct le 2026-09-03 (`rtk proxy curl`, comptes `operational_demo@example.test` ET un
    /// signup frais) :
    ///  1. `GET /v1/me/engagements` rend `{engagements: []}` — VIDE sur les deux comptes. La
    ///     « vendetta » (« on est allés chez eux 7 fois ») ne peut donc jamais afficher qu'un
    ///     compte HONNÊTE à zéro pour l'instant — jamais un chiffre fabriqué.
    ///  2. `POST /v1/me/engagements` EXIGE un lieutenant `archetype == "MUSCLE"`
    ///     (`RESOURCE_NOT_FOUND · "No such MUSCLE lieutenant for this player: <uuid>"`) — et
    ///     `GET /v1/lieutenants` en rend ZÉRO sur les DEUX comptes sondés (démo : 3 COOK, 1
    ///     LAUNDERING, 1 LOGISTICS ; signup frais : 2 COOK). **C'est le cœur de ce lot** : le
    ///     geste d'envoi ne peut aboutir sur AUCUN compte que nous sachions fabriquer, et
    ///     l'écran le DIT plutôt que de griser un bouton en silence (`RendrePied`).
    ///  3. Aucune route ne liste les rivaux du joueur ni leurs possessions — `target_holding_id`
    ///     est donc structurellement INDÉCOUVRABLE. Les quatre familles (m-65 : La Coil, Tarcum,
    ///     Gorge-de-Fer, Saltline — `iron_throat` du domaine POST = « Gorge-de-Fer » de la
    ///     maquette, seule correspondance qui recouvre les 4 noms) restent donc PÂLES : dessinées
    ///     depuis le domaine clos, sans donnée de possession derrière (`RendreTable`). Aucun
    ///     bouton d'envoi cliquable n'est construit cette passe, quel que soit l'état des
    ///     lieutenants — voir `RendrePied`.
    ///  4. m-63 (« Ce qui est rentré », un historique de coups numérotés) et m-64 (« Ce qu'on ne
    ///     peut pas faire », le panneau d'aveu explicite du chantier) sont dans le MÊME
    ///     répertoire `v6/` et narrent le MÊME Bruno/Tarcum — MAIS ne sont PAS dans la liste des
    ///     livrables de ce lot (§ « CE QUE JE TE DEMANDE »). Non construits cette passe — voir
    ///     Tools/conflit-implementation-notes.md § Deviations, à faire remonter.
    ///
    /// Ce qui EST construit, sur données réelles mesurées : §1/§2 la table des 4 familles avec
    /// leur compte de vendetta groupé côté client (`GET /v1/me/engagements`, jamais fabriqué) ;
    /// §3 le pied — `GET /v1/lieutenants` filtré `archetype == "MUSCLE"`, et l'impossibilité
    /// déclarée quand il n'y en a aucun (le cas réel, sur les deux comptes sondés).
    ///
    /// GÉOMÉTRIE — deux règles héritées, non négociables (mesurées ailleurs dans ce dépôt) :
    ///  · aucune valeur dérivée de `Screen.*` ni d'un `rect` lu au montage — passer par
    ///    `EchelleMaquette.Px(...)`. Maquette source NON confirmée (même trou que ㉛/㉘/㉚,
    ///    répertoire `v6/` commun) : `LargeurEcransBrennar` (300) conservé.
    ///  · `Canvas.scaleFactor` lu la frame de la création rend 1,0 — plausible et faux. Toute
    ///    lecture de géométrie attend `yield return null` après la construction.</summary>
    public class ConflitScreenController : MonoBehaviour, IShellTenant
    {
        [Header("Backend")]
        [SerializeField] private string baseUrl = "http://localhost";

        // ---- points d'injection du shell (IShellTenant) -----------------------------------
        private Transform mountParent;

        /// <summary>Construit dès que le parent est connu — patron `LoiScreenController` /
        /// gabarit corrigé (`Tools/nouvel-ecran.py`) : `Awake()` court dans `AddComponent<T>()`,
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

            EnsureInitialized();
        }

        private string token;
        public void SetToken(string t) => token = t;

        // ---- crochets de test ---------------------------------------------------------------
        public GetEngagementsResponseDto DernierChargementEngagements { get; private set; }
        public GetLieutenantsResponseDto DernierChargementLieutenants { get; private set; }
        public string DerniereErreur { get; private set; }
        public long DernierCodeErreur { get; private set; }
        public bool DernierEnvoiOk { get; private set; }
        /// <summary>Les lieutenants `archetype == "MUSCLE"` — crochet de test, alimenté par la
        /// dernière `RendrePied`. Vide sur les deux comptes sondés (le cas réel).</summary>
        public IReadOnlyList<LieutenantRowDto> MuscleLieutenants => muscleLieutenants;
        private List<LieutenantRowDto> muscleLieutenants = new List<LieutenantRowDto>();
        /// <summary>Les textes RÉELLEMENT rendus, dans l'ordre — crochet de test (patron
        /// `ExceptionQueueController.RenderedTexts` / ㉛/㉘).</summary>
        public IReadOnlyList<string> RenderedTexts => renderedTexts;
        private readonly List<string> renderedTexts = new List<string>();

        private RectTransform racinePleinEcran;
        private ConflitClient client;
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
            // n'appelle JAMAIS `Charger()`. Défaut payé sur ㉚ (patron ㉛/㉘) : `Charger()` défini,
            // aucun appelant, capture en échec sur « chargement non abouti après 20 s ». Et les
            // tests de CET écran ne peuvent pas voir ce trou : ils appellent `Charger()`
            // eux-mêmes.
            if (!chargementAmorce) { chargementAmorce = true; StartCoroutine(Charger()); }
            transform.SetAsLastSibling();
        }

        private void EnsureInitialized()
        {
            if (initialise) return;
            initialise = true;
            client = new ConflitClient { BaseUrl = baseUrl };
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

        // ═══ Chargement ══════════════════════════════════════════════════════════════════════

        public IEnumerator Charger()
        {
            EnsureInitialized();
            DerniereErreur = null;
            DernierCodeErreur = 0;

            // ⛔ SANS CETTE LIGNE, LES RÉSOLVEURS SONT MUETS (patron ㉛/㉘/㉚/⑨) : `Libelle.De`
            // rend le littéral tant que le dictionnaire est vide — branchement transparent.
            yield return I18nCatalog.Amorcer(new I18nClient { BaseUrl = baseUrl }, token);

            // `GET /v1/lieutenants` est ESSENTIEL (« le cœur de ce lot ») : sans lui, on ne peut
            // ni dire honnêtement s'il manque un homme MUSCLE, ni afficher qui envoyer — bloquant.
            string errLieutenants = null;
            long codeLieutenants = 0;
            yield return client.GetLieutenants(token,
                dto => DernierChargementLieutenants = dto,
                (code, msg) => { codeLieutenants = code; errLieutenants = msg; });
            if (DernierChargementLieutenants == null)
            {
                DernierCodeErreur = codeLieutenants;
                DerniereErreur = errLieutenants ?? "GET /v1/lieutenants indisponible";
                RendreEtatIndisponible();
                yield break;
            }

            // Non bloquant si les engagements échouent — même idiome que
            // `DistributionScreenController.RechargerProjection` : la table rend un état honnête
            // (« compte indisponible ») plutôt que de casser tout l'écran pour une section
            // secondaire.
            yield return RechargerEngagements();

            // La frame de création rend des rects non résolus : on attend le layout AVANT de
            // rendre quoi que ce soit qui lise une géométrie.
            yield return null;
            AppliquerEtat();
        }

        private IEnumerator RechargerEngagements()
        {
            DernierChargementEngagements = null;
            yield return client.GetEngagements(token,
                dto => DernierChargementEngagements = dto,
                (code, msg) => DerniereErreur = DerniereErreur ?? $"vendetta : {code} {msg}");
            yield return null;
        }

        /// <summary>Rend un corps FABRIQUÉ, sans réseau — réservé aux tests (patron ㉛/㉘/㊲,
        /// `RendrePourTest`). Ne prouve jamais que le back émet ces corps, seulement ce que
        /// l'écran EN FAIT.</summary>
        public void RendrePourTest(GetLieutenantsResponseDto lieutenants, GetEngagementsResponseDto engagements)
        {
            EnsureInitialized();
            DernierChargementLieutenants = lieutenants;
            DernierChargementEngagements = engagements;
            AppliquerEtat();
        }

        // ═══ Le geste d'envoi — `POST /v1/me/engagements` ═══════════════════════════════════════
        //
        // ⛔⛔ NON CÂBLÉE À UN BOUTON CETTE PASSE — voir `RendrePied` : aucun bouton cliquable
        // n'est construit tant que `target_holding_id` reste indécouvrable (point 3 du
        // commentaire de classe). Exposée pour un futur écran/test une fois une route de cible
        // existe (patron `ChaineDApproScreenController.PasserCommandeEtRecharger` /
        // `DistributionScreenController.AcheterVehicule` : le geste existe, jamais atteint en
        // succès sur les comptes sondés).

        public void EnvoyerCeSoir(string lieutenantId, string targetRivalKey, string targetHoldingId) =>
            StartCoroutine(EnvoyerCeSoirEtRecharger(lieutenantId, targetRivalKey, targetHoldingId));

        /// <summary>Crochet de test : awaitable, contrairement à `EnvoyerCeSoir()`.
        /// ⚠️ COLLAPSE ASSUMÉ (brief : « un 404 sur le POST se montre comme "on ne les connaît
        /// pas encore" ») — les DEUX comptes sondés ne peuvent produire QUE le 404 « no such
        /// MUSCLE lieutenant » (voir `ConflitClient.PostEngagements`) : le 404 « cible inconnue »
        /// que cette phrase décrit n'a jamais pu être observé (il exigerait un lieutenant MUSCLE
        /// pour dépasser le premier contrôle). Cette méthode collapse donc TOUT code 404 sur
        /// cette phrase, y compris le cas MUSCLE si elle était appelée sans en avoir un — ce
        /// qu'aucun appelant ne fait cette passe (`RendrePied` ne construit aucun bouton). Voir
        /// implementation-notes.md § Deviations.</summary>
        public IEnumerator EnvoyerCeSoirEtRecharger(string lieutenantId, string targetRivalKey, string targetHoldingId)
        {
            DernierEnvoiOk = false;
            var body = new PostEngagementsBody
            {
                lieutenant_id = lieutenantId,
                target_rival_key = targetRivalKey,
                target_holding_id = targetHoldingId,
            };
            string erreur = null;
            long code = 0;
            PostEngagementsResponseDto rep = null;
            yield return client.PostEngagements(token, body, dto => rep = dto,
                (c, m) => { code = c; erreur = m; });
            if (erreur != null)
            {
                DernierCodeErreur = code;
                DerniereErreur = code == 404 ? "On ne les connaît pas encore." : erreur;
                RendreMessageErreur();
                yield break;
            }
            DernierEnvoiOk = true;
            DerniereErreur = null;
            yield return Charger();
        }

        // ═══ Rendu — DEUX sections, patron ㉛ (un bloc = une méthode `Rendre<Nom>`) ═══════════

        private void AppliquerEtat()
        {
            renderedTexts.Clear();
            RendreTitre();
            RendreTable(DernierChargementEngagements?.engagements, DernierChargementEngagements == null);
            RendrePied(DernierChargementLieutenants?.lieutenants);
            RendreMessageErreur();
        }

        /// <summary>Titre/sous-titre — AUCUN cadre de m-65/m-66 ne montre cet écran comme une
        /// page indépendante (ils montrent la CARTE posée sur la table, pas un bandeau d'écran) :
        /// « Le conflit » est le nom que le chantier donne à cet écran (`AppShell.DestinationsPlus`,
        /// brief), le sous-titre est une synthèse d'interface, même geste que « le parloir »/« La
        /// distribution » (㉛/㉘).</summary>
        private void RendreTitre()
        {
            titreTexte.text = Libelle.De("conflit", "titre", "Le conflit");
            sousTitreTexte.text = Libelle.De("conflit", "sous_titre",
                "Ce que vos hommes rapportent des familles rivales, et qui vous reste pour y retourner.");
            TrackText(titreTexte.text);
            TrackText(sousTitreTexte.text);
        }

        /// <summary>§1/§2 — La table des 4 familles rivales (domaine clos annoncé de
        /// `target_rival_key`, `ConflitResolvers.DomaineFamilles`) — PÂLES et déclarées comme
        /// telles (aucune route ne dit ce qu'elles préparent ni ce qu'elles possèdent, point 3 du
        /// commentaire de classe) — chacune avec sa « vendetta » : le compte d'engagements
        /// GROUPÉS PAR `target_rival_key` côté client, jamais fabriqué (`GET /v1/me/engagements`,
        /// vide sur les deux comptes sondés ⇒ « on n'y est jamais allés » partout, honnêtement).
        /// Un engagement dont la clé sort du domaine des 4 connues n'est PAS silencieusement
        /// perdu : il est compté et signalé à part (`inconnues`).</summary>
        private void RendreTable(EngagementDto[] engagements, bool indisponible)
        {
            ViderEnfants(tableRoot);

            TextMeshProUGUI label = NouveauTexteFiche(tableRoot, "TableLabel",
                Libelle.De("conflit", "bloc", "LES QUATRE FAMILLES"), 8.5f,
                DesignTokens.Current.onSurfaceSecondary, false);
            label.characterSpacing = 4f;
            TrackText(label.text);

            TextMeshProUGUI note = NouveauTexteFiche(tableRoot, "TableNote",
                Libelle.De("conflit", "bloc",
                    "Dessinées, pas renseignées : aucune route ne dit ce qu'elles préparent ni ce qu'elles possèdent."),
                7.5f, DesignTokens.Current.onSurfaceMuted, false);
            note.enableWordWrapping = true;
            TrackText(note.text);

            if (indisponible)
            {
                TextMeshProUGUI err = NouveauTexteFiche(tableRoot, "VendettaIndisponible",
                    Libelle.De("conflit", "bloc",
                        "Le compte des envois précédents est indisponible pour l'instant."),
                    7.5f, RougeMauvais, false);
                err.enableWordWrapping = true;
                TrackText(err.text);
            }

            Dictionary<string, int> compte = CompterVisites(engagements, out int inconnues);

            foreach (string cle in ConflitResolvers.DomaineFamilles)
            {
                GameObject ligne = NouveauUI("Famille_" + cle, tableRoot);
                AjouterFond(ligne, DesignTokens.Current.surfaceRow);
                VerticalLayoutGroup vl = ligne.AddComponent<VerticalLayoutGroup>();
                vl.padding = new RectOffset(PxTrait(10f), PxTrait(10f), PxTrait(6f), PxTrait(6f));
                vl.spacing = Px(2f);
                vl.childControlWidth = true; vl.childControlHeight = true;
                vl.childForceExpandWidth = true; vl.childForceExpandHeight = false;
                AddLayoutElement(ligne, flexibleHeight: 0);

                // Pâle : `onSurfaceDim`, jamais `onSurfacePrimary` — la couleur PORTE l'absence de
                // donnée, pas seulement le texte de la note ci-dessus.
                TextMeshProUGUI nom = NouveauTexteFiche(ligne.transform, "Nom",
                    ConflitResolvers.NomFamille(cle), 10.5f, DesignTokens.Current.onSurfaceDim, true);
                TrackText(nom.text);

                TextMeshProUGUI sousTitre = NouveauTexteFiche(ligne.transform, "SousTitre",
                    ConflitResolvers.SousTitreFamille(cle), 8f, DesignTokens.Current.onSurfaceMuted, false);
                TrackText(sousTitre.text);

                compte.TryGetValue(cle, out int n);
                string texteVisite = indisponible ? "compte indisponible" : TexteVisites(n);
                TextMeshProUGUI visites = NouveauTexteFiche(ligne.transform, "Visites",
                    texteVisite, 8f, DesignTokens.Current.onSurfaceDim, false);
                TrackText(visites.text);
            }

            if (inconnues > 0)
            {
                string texteInconnues = inconnues == 1
                    ? "1 envoi vise une famille hors des quatre connues — non affiché ci-dessus."
                    : $"{inconnues} envois visent une famille hors des quatre connues — non affiché ci-dessus.";
                TextMeshProUGUI noteInconnue = NouveauTexteFiche(tableRoot, "FamillesInconnues",
                    texteInconnues, 7.5f, RougeMauvais, false);
                noteInconnue.enableWordWrapping = true;
                TrackText(noteInconnue.text);
            }
        }

        /// <summary>Groupe les engagements par `target_rival_key`, côté client — « on est allés
        /// chez eux N fois » (m-65). `engagements` peut être `null` (jamais chargé) ou vide (les
        /// deux mesurés) : les deux rendent un dictionnaire vide, jamais une exception.
        /// `inconnues` compte les entrées dont la clé sort des 4 connues (défensif : une clé non
        /// reconnue n'est jamais silencieusement perdue).</summary>
        private static Dictionary<string, int> CompterVisites(EngagementDto[] engagements, out int inconnues)
        {
            var compte = new Dictionary<string, int>();
            inconnues = 0;
            if (engagements == null) return compte;
            foreach (EngagementDto e in engagements)
            {
                string cle = e?.target_rival_key;
                if (string.IsNullOrEmpty(cle)) continue;
                bool connue = false;
                foreach (string d in ConflitResolvers.DomaineFamilles) if (d == cle) { connue = true; break; }
                if (!connue) { inconnues++; continue; }
                compte.TryGetValue(cle, out int n);
                compte[cle] = n + 1;
            }
            return compte;
        }

        private static string TexteVisites(int n) =>
            n == 0 ? "on n'y est jamais allés" : n == 1 ? "on y est allés 1 fois" : $"on y est allés {n} fois";

        /// <summary>§3 — Qui part ce soir : `GET /v1/lieutenants` filtré `archetype == "MUSCLE"`.
        /// ⛔⛔ LE CŒUR DE CE LOT. Aucun compte sondé n'en a — le repli honnête N'EST PAS un
        /// bouton grisé en silence : il DIT au joueur qu'il lui manque un homme (brief : « le
        /// joueur doit comprendre qu'il lui manque un homme, pas croire que l'écran est
        /// cassé »).</summary>
        private void RendrePied(LieutenantRowDto[] lieutenants)
        {
            ViderEnfants(piedRoot);

            muscleLieutenants = new List<LieutenantRowDto>();
            if (lieutenants != null)
                foreach (LieutenantRowDto l in lieutenants)
                    if (l != null && l.archetype == "MUSCLE") muscleLieutenants.Add(l);

            TextMeshProUGUI label = NouveauTexteFiche(piedRoot, "PiedLabel",
                Libelle.De("conflit", "bloc", "QUI PART CE SOIR"), 8.5f,
                DesignTokens.Current.onSurfaceSecondary, false);
            label.characterSpacing = 4f;
            TrackText(label.text);

            if (muscleLieutenants.Count == 0)
            {
                TextMeshProUGUI vide = NouveauTexteFiche(piedRoot, "PiedVide",
                    Libelle.De("conflit", "bloc",
                        "Aucun de vos lieutenants n'est du genre Gros bras."), 9f,
                    DesignTokens.Current.onSurfacePrimary, true);
                TrackText(vide.text);

                TextMeshProUGUI noteVide = NouveauTexteFiche(piedRoot, "PiedNote",
                    Libelle.De("conflit", "bloc",
                        "C'est lui qui part la nuit. Il vous en manque un — ce n'est pas cassé, " +
                        "vous n'en avez tout simplement pas encore."),
                    8f, DesignTokens.Current.onSurfaceMuted, false);
                noteVide.enableWordWrapping = true;
                TrackText(noteVide.text);
                return;
            }

            LieutenantRowDto envoye = muscleLieutenants[0];

            GameObject enTete = NouveauUI("Lieutenant", piedRoot);
            HorizontalLayoutGroup hl = enTete.AddComponent<HorizontalLayoutGroup>();
            hl.spacing = Px(8f);
            hl.childControlWidth = true; hl.childControlHeight = true;
            hl.childForceExpandWidth = false; hl.childForceExpandHeight = false;
            AddLayoutElement(enTete, flexibleHeight: 0);

            // Portrait rond — approximation : un disque plein, aucun asset de portrait mesuré ni
            // mandaté par le brief (patron ㉘).
            GameObject portrait = NouveauUI("Portrait", enTete.transform);
            AjouterFond(portrait, DesignTokens.Current.surfaceRow);
            AddLayoutElement(portrait, preferredWidth: Px(26f), preferredHeight: Px(26f));

            GameObject texteBloc = NouveauUI("TexteBloc", enTete.transform);
            VerticalLayoutGroup vt = texteBloc.AddComponent<VerticalLayoutGroup>();
            vt.childControlWidth = true; vt.childControlHeight = true;
            vt.childForceExpandWidth = true; vt.childForceExpandHeight = false;
            AddLayoutElement(texteBloc, flexibleWidth: 1);

            TextMeshProUGUI nom = NouveauTexteFiche(texteBloc.transform, "Nom", envoye.name, 10.5f,
                DesignTokens.Current.onSurfacePrimary, true);
            TrackText(nom.text);

            // « Bruno · LE MUSCLE · J7 » de m-65 est une puce de FICTION (un jour de tenure
            // inventé pour un personnage nommé, jamais un champ back). Cet écran affiche à la
            // place les DEUX champs RÉELS mesurés, via les résolveurs PARTAGÉS déjà enregistrés
            // par ce dépôt (DRY — pas de seconde table de correspondance archétype/ancienneté) :
            // `archetype` → `FamilleLabels.Archetype` (organigramme ⑯) et `tenure_bucket` →
            // `FamilleLabels.Anciennete` (même fichier).
            TextMeshProUGUI role = NouveauTexteFiche(texteBloc.transform, "Role",
                $"{FamilleLabels.Archetype(envoye.archetype)} · {FamilleLabels.Anciennete(envoye.tenure_bucket)}",
                7f, DesignTokens.Current.onSurfaceMuted, false);
            role.characterSpacing = 2f;
            TrackText(role.text);

            // Réplique VERBATIM m-65 — générique, ne cite ni Tarcum ni Stack-2 (aucun des deux
            // n'est sourcé pour ce compte, voir le commentaire de classe).
            TextMeshProUGUI q = NouveauTexteFiche(piedRoot, "Replique",
                Libelle.De("conflit", "bloc",
                    "Dites-moi qui j'envoie et sur quoi. Je pars ce soir, on saura demain."),
                9f, DesignTokens.Current.onSurfaceSecondary, false);
            q.fontStyle = FontStyles.Italic;
            q.enableWordWrapping = true;
            TrackText(q.text);

            // ⛔⛔ TOUJOURS PAS DE BOUTON — un lieutenant MUSCLE existe (état jamais observé sur
            // un compte réel, exercé par `RendrePourTest` seulement), mais `target_holding_id`
            // reste structurellement indécouvrable (point 3 du commentaire de classe) :
            // fabriquer un bouton cliquable ici enverrait le joueur sur un geste qui échouerait
            // TOUJOURS, silencieusement pris pour un bug. `EnvoyerCeSoirEtRecharger` reste
            // exposée pour le jour où une route de cible existera.
            TextMeshProUGUI noteCible = NouveauTexteFiche(piedRoot, "PiedNoteCible",
                Libelle.De("conflit", "bloc",
                    "Vous avez l'homme. Personne pour lui dire où frapper — aucune route ne connaît " +
                    "encore vos rivaux."),
                8f, DesignTokens.Current.onSurfaceMuted, false);
            noteCible.enableWordWrapping = true;
            TrackText(noteCible.text);
        }

        private void RendreMessageErreur()
        {
            ViderEnfants(erreurRoot);
            if (string.IsNullOrEmpty(DerniereErreur)) return;
            TextMeshProUGUI msg = NouveauTexteFiche(erreurRoot, "Erreur", DerniereErreur, 7.5f,
                RougeMauvais, false);
            msg.enableWordWrapping = true;
            TrackText(msg.text);
        }

        /// <summary>Repli NOMMÉ sur échec réseau — jamais une exception, jamais un écran noir
        /// (patron ㊲/㉛/㉘ : `Render(null)` a fait planter un autre écran de ce dépôt à la
        /// première ligne qui lisait le payload).</summary>
        private void RendreEtatIndisponible()
        {
            ViderEnfants(tableRoot);
            ViderEnfants(piedRoot);
            ViderEnfants(erreurRoot);
            titreTexte.text = Libelle.De("conflit", "titre", "Le conflit est indisponible");
            sousTitreTexte.text = string.IsNullOrEmpty(DerniereErreur)
                ? Libelle.De("conflit", "sous_titre", "Réessayez dans un instant.")
                : DerniereErreur;
            TrackText(titreTexte.text);
            TrackText(sousTitreTexte.text);
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
            // ⛔ SOUS L'HÔTE, PAS SOUS `mountParent` (patron ㉛/㉘/gabarit corrigé) : bâtir sous
            // `mountParent` fait naître la feuille en FRÈRE de l'hôte — toute garde en
            // `GetComponentsInChildren` mesurerait alors un sous-arbre VIDE.
            Transform root = mountParent != null ? transform : canvas.transform;

            GameObject racine = NouveauUI("ConflitRoot", root);
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

            GameObject tableGo = NouveauUI("Table", corpsGo.transform);
            VerticalLayoutGroup vtb = tableGo.AddComponent<VerticalLayoutGroup>();
            vtb.spacing = Px(6f);
            vtb.childControlWidth = true; vtb.childControlHeight = true;
            vtb.childForceExpandWidth = true; vtb.childForceExpandHeight = false;
            AddLayoutElement(tableGo, flexibleHeight: 0);
            tableRoot = tableGo.transform;

            GameObject piedGo = NouveauUI("Pied", corpsGo.transform);
            VerticalLayoutGroup vp = piedGo.AddComponent<VerticalLayoutGroup>();
            vp.spacing = Px(8f);
            vp.childControlWidth = true; vp.childControlHeight = true;
            vp.childForceExpandWidth = true; vp.childForceExpandHeight = false;
            AddLayoutElement(piedGo, flexibleHeight: 1);
            piedRoot = piedGo.transform;

            GameObject erreurGo = NouveauUI("Erreur", corpsGo.transform);
            VerticalLayoutGroup ve = erreurGo.AddComponent<VerticalLayoutGroup>();
            ve.childControlWidth = true; ve.childControlHeight = true;
            ve.childForceExpandWidth = true; ve.childForceExpandHeight = false;
            AddLayoutElement(erreurGo, flexibleHeight: 0);
            erreurRoot = erreurGo.transform;
        }

        private Transform tableRoot, piedRoot, erreurRoot;
        private TextMeshProUGUI titreTexte, sousTitreTexte;

        private static Color RougeMauvais => DesignTokens.Current.accentDanger;

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
                Object.Destroy(parent.GetChild(i).gameObject);
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

    /// <summary>ecran_conflit — les correspondances « valeur du domaine → apparence », chacune en
    /// FONCTION NOMMÉE prenant la valeur du domaine (patron `HeatBucketResolver`/
    /// `DistributionResolvers`/`LoiResolvers`) — jamais un switch recopié deux fois, jamais une
    /// correspondance portée par l'ordre d'un tableau ou par un commentaire.
    ///
    /// `archetype`/`tenure_bucket` d'un lieutenant NE sont PAS résolus ici : ce dépôt porte déjà
    /// un résolveur PARTAGÉ pour les deux (`MafiaCleanCity.Operational.FamilleLabels`, organigramme
    /// ⑯) — le réutiliser est le geste DRY, en dupliquer un second ici serait exactement le
    /// défaut que ce socle dénonce (une correspondance recopiée qui divergera).</summary>
    public static class ConflitResolvers
    {
        /// <summary>Les 4 clés du domaine `target_rival_key` — ANNONCÉ CLOS par l'orchestrateur
        /// (coil · tarcum · iron_throat · saltline), NON reproduit en direct cette passe (voir
        /// `ConflitDtos.cs`, `PostEngagementsBody`) : le contrôle MUSCLE répond avant que ce champ
        /// ne soit validé sur les deux comptes sondés — aucun message d'erreur n'a donc pu
        /// confirmer ce domaine ICI. Source unique pour la table (`ConflitScreenController.
        /// RendreTable`) et le comptage de vendetta (`CompterVisites`) — jamais recopiée.</summary>
        public static readonly string[] DomaineFamilles = { "coil", "tarcum", "iron_throat", "saltline" };

        /// <summary>Le nom affiché de chaque famille — m-65, verbatim (« Gorge-de-Fer » pour
        /// `iron_throat` : seule correspondance qui recouvre exactement les 4 noms de la
        /// maquette avec les 4 clés du domaine POST). `default: throw` : cet écran n'appelle ce
        /// résolveur QUE sur les 4 clés qu'il énumère lui-même (`DomaineFamilles`), jamais sur une
        /// valeur SERVIE par le back — un throw ici ne peut donc se déclencher que sur une faute
        /// d'orthographe dans CE fichier, jamais sur une divergence avec le back (contrairement à
        /// `LoiResolvers.TierLabelCourt`, qui reçoit lui une valeur servie et garde un repli
        /// gracieux pour cette raison).</summary>
        public static string NomFamille(string cle)
        {
            switch (cle)
            {
                case "coil": return "La Coil";
                case "tarcum": return "Tarcum";
                case "iron_throat": return "Gorge-de-Fer";
                case "saltline": return "Saltline";
                default: throw new System.ArgumentOutOfRangeException(nameof(cle), cle,
                    "ConflitResolvers.NomFamille : clé hors du domaine des 4 familles connues.");
            }
        }

        /// <summary>Le sous-titre de chaque famille — m-65, verbatim. Même garde et même raison
        /// que `NomFamille`.</summary>
        public static string SousTitreFamille(string cle)
        {
            switch (cle)
            {
                case "coil": return "les ferrailleurs de Spine";
                case "tarcum": return "le port, et ce qui y entre";
                case "iron_throat": return "les docks du nord";
                case "saltline": return "la ligne de sel, à l'est";
                default: throw new System.ArgumentOutOfRangeException(nameof(cle), cle,
                    "ConflitResolvers.SousTitreFamille : clé hors du domaine des 4 familles connues.");
            }
        }
    }
}
