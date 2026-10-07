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
    /// <summary>ecran_conflit « Le conflit » (㉙) — la v2 de la maquette ratifiée (atelier `ecrans-brennar-6.html`, cadres 59-64),
    /// avec les mots de la table 40 de l'atelier (997d6ab4) et de son addendum (24897b48).
    ///
    /// Données (back, lu le 2026-09-23) :
    ///  · `GET /v1/me/engagements` : les envois du joueur, du plus récent au plus ancien (`EngagementDto`, forme G) ;
    ///  · `GET /v1/lieutenants` : seule route qui porte `archetype` — seuls les gros bras (MUSCLE) partent ;
    ///  · `POST /v1/me/engagements {lieutenant_id, target_rival_key, target_holding_id}` : l'envoi. `target_holding_id` est un
    ///    des 5 AXES (`ConflitResolvers.Axes`), pas un bâtiment ; aucune route d'annulation.
    ///
    /// Sections, dans l'ordre (une méthode `Rendre<Nom>` chacune) :
    ///  · « Ce qui est rentré » (63) — le dernier envoi rentré, son issue, son coût, sa chaleur ; « Y retourner » ;
    ///  · « Ce qui est en cours » (62) — les partis, les déjà rentrés, les hommes dehors ; « En envoyer un autre » ;
    ///  · « Le coup de ce soir » (59-61) — l'homme, l'axe, la phrase d'envoi, « La dernière fois chez eux » ;
    ///  · « Les quatre familles de Brennar » — le compte des envois RENTRÉS par famille ; on y choisit la famille ;
    ///  · la réplique et « L’envoyer ce soir », inactif tant que la famille, l'homme et l'axe ne sont pas choisis.
    /// Aucun choix présélectionné. Un refus du POST s'écrit sous le bouton, jamais en message technique (`DerniereErreur`
    /// est un crochet de test). Une reprise après un échec réseau réémet la même Idempotency-Key.
    ///
    /// L'historique « Depuis le début, chez … » rend les envois réels de la famille sous la forme épicène « un envoi ».
    /// Le rang optionnel « Coup n°N » attend toujours `strike_index` servi (L3bis) : aucun rang n'est dérivé de l'ordre.
    /// Le panneau des manques (64) n'est pas un libellé (table 40 : note).
    ///
    /// GÉOMÉTRIE — deux règles héritées, non négociables (mesurées ailleurs dans ce dépôt) :
    ///  · aucune valeur dérivée de `Screen.*` ni d'un `rect` lu au montage — passer par
    ///    `EchelleMaquette.Px(...)` (`LargeurEcransBrennar`, 300).
    ///  · `Canvas.scaleFactor` lu la frame de la création rend 1,0 — plausible et faux. Toute
    ///    lecture de géométrie attend `yield return null` après la construction.</summary>
    public class ConflitScreenController : MonoBehaviour, IShellTenant
    {
        [Header("Backend")]
        private string baseUrlPose;   // posée par un appelant (tests, shell) ; sinon la source unique
        private string baseUrl { get => baseUrlPose ?? MafiaCleanCity.AdresseDuBack.Url; set => baseUrlPose = value; }
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

        // ---- le coup de ce soir (cadres 59-61) : trois choix, AUCUN présélectionné (arbitrage du 23/09) ----------------------
        /// <summary>La famille choisie (`target_rival_key`), ou null.</summary>
        public string ChoixFamille { get; private set; }
        /// <summary>Le lieutenant choisi (`lieutenant_id`, un gros bras seulement), ou null.</summary>
        public string ChoixLieutenant { get; private set; }
        /// <summary>L'axe choisi (`target_holding_id`, un des 5), ou null.</summary>
        public string ChoixAxe { get; private set; }
        /// <summary>« L’envoyer ce soir » n'est actif que si la famille, l'homme et l'axe sont choisis.</summary>
        public bool EnvoiPossible => ChoixFamille != null && ChoixLieutenant != null && ChoixAxe != null;

        /// <summary>La classe du dernier refus du POST (`ConflitResolvers.ClasserRefusDEnvoi`), ou null. Crochet de test ; le joueur
        /// en lit le MOT (`ConflitResolvers.MotDuRefusDEnvoi`) sous le bouton.</summary>
        public string DerniereClasseDeRefus { get; private set; }
        /// <summary>L'`engagement_id` rendu par le dernier envoi RÉUSSI — crochet de test.</summary>
        public string DernierEngagementId { get; private set; }
        /// <summary>L'Idempotency-Key émise au dernier envoi — crochet de test (elle ne s'affiche jamais).</summary>
        public string DerniereCleDIdempotence { get; private set; }
        // La clé d'un envoi dont on ne sait pas s'il est parti (réseau, ou encore en vol côté back), et le corps qu'elle couvre :
        // l'essai suivant du MÊME envoi la RÉÉMET (le back rejoue, il ne réexécute pas). Tout autre issue l'oublie.
        private string cleEnSuspens, envoiEnSuspens;

        /// <summary>L'adresse du back — réglable par les tests AVANT le premier chargement (patron `RendrePourTest`).</summary>
        public string BaseUrl
        {
            get => baseUrl;
            set { baseUrl = value; if (client != null) client.BaseUrl = value; }
        }

        public void ChoisirFamille(string cle)
        {
            if (System.Array.IndexOf(ConflitResolvers.DomaineFamilles, cle) < 0) return;
            ChoixFamille = cle;
            DerniereClasseDeRefus = null;
            AppliquerEtat();
        }

        public void ChoisirLieutenant(string lieutenantId)
        {
            bool gros = false;
            foreach (LieutenantRowDto l in Muscles(DernierChargementLieutenants?.lieutenants)) if (l.lieutenant_id == lieutenantId) gros = true;
            if (!gros) return;   // seuls les gros bras sont choisissables (arbitrage du 23/09)
            ChoixLieutenant = lieutenantId;
            DerniereClasseDeRefus = null;
            AppliquerEtat();
        }

        public void ChoisirAxe(string axe)
        {
            if (System.Array.IndexOf(ConflitResolvers.Axes, axe) < 0) return;
            ChoixAxe = axe;
            DerniereClasseDeRefus = null;
            AppliquerEtat();
        }

        /// <summary>« En envoyer un autre » (cadres 62-63) : les choix repartent de zéro — sauf la famille quand `memeFamille`
        /// (« même famille, autre cible », cadre 63).</summary>
        public void EnEnvoyerUnAutre(string memeFamille)
        {
            DerniereClasseDeRefus = null;
            ChoixFamille = System.Array.IndexOf(ConflitResolvers.DomaineFamilles, memeFamille) >= 0 ? memeFamille : null;
            ChoixAxe = null;
            ChoixLieutenant = null;
            AppliquerEtat();
        }

        /// <summary>L'écran Famille ouvert par « Recruter un nouveau lieutenant » (crochet de test), ou null.</summary>
        public MafiaCleanCity.Operational.Lieutenant.LieutenantScreenController DernierRecrutementOuvert { get; private set; }

        /// <summary>L7 — ouvre la Famille EN SURIMPRESSION, panneau de recrutement déplié : le contrat `IShellNavigator`
        /// (ShellContracts), celui de ⑨ et du tableau de bord ; AppShell n'est pas touché. Sans navigateur (hors du shell) ou
        /// si le navigateur ne monte rien, le geste le DIT dans le journal au lieu de monter un écran plein cadre par-dessus
        /// le chrome (la classe de défaut que ce contrat a fermée).</summary>
        public void OuvrirRecrutement()
        {
            DernierRecrutementOuvert = null;
            MafiaCleanCity.Shell.IShellNavigator nav = MafiaCleanCity.Shell.ShellNavigatorLocator.Find();
            if (nav == null) { Debug.LogWarning("[㉙] recrutement : aucun navigateur de shell — rien n'est ouvert"); return; }
            var famille = nav.MonterLocataireEnSurimpression<MafiaCleanCity.Operational.Lieutenant.LieutenantScreenController>();
            if (famille == null) { Debug.LogWarning("[㉙] recrutement : le navigateur n'a rien monté"); return; }
            if (!famille.RecrutementDeplie) famille.BasculerRecrutement();
            DernierRecrutementOuvert = famille;
        }

        /// <summary>Le geste du bouton « L’envoyer ce soir » : rien tant que les trois choix ne sont pas faits.</summary>
        public void EnvoyerLeCoup()
        {
            if (!EnvoiPossible) return;
            EnvoyerCeSoir(ChoixLieutenant, ChoixFamille, ChoixAxe);
        }
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
            // n'appelle JAMAIS `Charger()`. Défaut payé sur ㉚ (patron ㉛/㉘) : `Charger()` défini,
            // aucun appelant, capture en échec sur « chargement non abouti après 20 s ». Et les
            // tests de CET écran ne peuvent pas voir ce trou : ils appellent `Charger()`
            // eux-mêmes.
            if (!chargementAmorce) { chargementAmorce = true; coroutineChargement = StartCoroutine(Charger()); }
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
            if (renduExpliciteDemande) yield break;   // un test a rendu pendant l'attente : on n'écrase pas

            // `GET /v1/lieutenants` est ESSENTIEL (« le cœur de ce lot ») : sans lui, on ne peut
            // ni dire honnêtement s'il manque un homme MUSCLE, ni afficher qui envoyer — bloquant.
            string errLieutenants = null;
            long codeLieutenants = 0;
            yield return client.GetLieutenants(token,
                dto => DernierChargementLieutenants = dto,
                (code, msg) => { codeLieutenants = code; errLieutenants = msg; });
            if (renduExpliciteDemande) yield break;   // un test a rendu pendant l'attente : on n'écrase pas
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
            if (renduExpliciteDemande) yield break;   // un test a rendu pendant l'attente : on n'écrase pas

            // La frame de création rend des rects non résolus : on attend le layout AVANT de
            // rendre quoi que ce soit qui lise une géométrie.
            yield return null;
            if (renduExpliciteDemande) yield break;   // un test a rendu pendant l'attente : on n'écrase pas
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
            DernierChargementLieutenants = lieutenants;
            DernierChargementEngagements = engagements;
            AppliquerEtat();
        }

        // ═══ Le geste d'envoi — `POST /v1/me/engagements` ═══════════════════════════════════════
        //
        // Câblé au bouton « L’envoyer ce soir » (`RendrePied` → `EnvoyerLeCoup`), actif seulement quand la famille, le gros bras
        // et l'axe sont choisis (L4, 23/09). Succès : les choix repartent de zéro et l'écran se recharge (l'envoi paraît dans
        // « Ce qui est en cours »).

        public void EnvoyerCeSoir(string lieutenantId, string targetRivalKey, string targetHoldingId) =>
            StartCoroutine(EnvoyerCeSoirEtRecharger(lieutenantId, targetRivalKey, targetHoldingId));

        /// <summary>Crochet de test : awaitable, contrairement à `EnvoyerCeSoir()`. Sur un refus (409
        /// `MUSCLE_LIEUTENANT_REQUIRED`, 404 lieutenant ou famille, 422, réseau), `DernierCodeErreur`/`DerniereErreur` portent
        /// le code et le message technique POUR LES TESTS ; le joueur ne voit rien de technique (`RendreMessageErreur`). Les
        /// mots du refus sont commandés à l'atelier (addendum à la table 40), branchés à leur arrivée.</summary>
        public IEnumerator EnvoyerCeSoirEtRecharger(string lieutenantId, string targetRivalKey, string targetHoldingId)
        {
            EnsureInitialized();
            DernierEnvoiOk = false;
            var body = new PostEngagementsBody
            {
                lieutenant_id = lieutenantId,
                target_rival_key = targetRivalKey,
                target_holding_id = targetHoldingId,
            };
            string envoi = ConflitClient.CorpsEnvoye(body);
            string cle = envoi == envoiEnSuspens && cleEnSuspens != null ? cleEnSuspens : System.Guid.NewGuid().ToString();
            DerniereCleDIdempotence = cle;
            string erreur = null, codeApi = null;
            long code = 0;
            bool refuse = false;
            PostEngagementsResponseDto rep = null;
            yield return client.PostEngagements(token, body, dto => rep = dto,
                (c, api, m) => { refuse = true; code = c; codeApi = api; erreur = m; }, cle);
            if (refuse)
            {
                DernierCodeErreur = code;
                DerniereErreur = erreur;   // crochet de test : TECHNIQUE, jamais affiché
                DerniereClasseDeRefus = ConflitResolvers.ClasserRefusDEnvoi(code, codeApi);
                bool enSuspens = DerniereClasseDeRefus == "reseau";
                cleEnSuspens = enSuspens ? cle : null;
                envoiEnSuspens = enSuspens ? envoi : null;
                RendrePied();
                RendreMessageErreur();
                yield break;
            }
            cleEnSuspens = null; envoiEnSuspens = null;
            DernierEngagementId = rep?.engagement_id;
            DernierEnvoiOk = true;
            DerniereErreur = null;
            DerniereClasseDeRefus = null;
            ChoixFamille = null; ChoixLieutenant = null; ChoixAxe = null;   // l'envoi est parti : on repart de zéro
            yield return Charger();
        }

        // ═══ Rendu — DEUX sections, patron ㉛ (un bloc = une méthode `Rendre<Nom>`) ═══════════

        private void AppliquerEtat()
        {
            renderedTexts.Clear();
            RendreTitre();
            muscleLieutenants = Muscles(DernierChargementLieutenants?.lieutenants);
            RendreRentre(DernierChargementEngagements?.engagements);
            RendreEnCours(DernierChargementEngagements?.engagements);
            RendreCoup(DernierChargementEngagements?.engagements);
            RendreTable(DernierChargementEngagements?.engagements, DernierChargementEngagements == null);
            RendrePied();
            RendreMessageErreur();
        }

        /// <summary>Titre/sous-titre — AUCUN cadre de m-65/m-66 ne montre cet écran comme une
        /// page indépendante (ils montrent la CARTE posée sur la table, pas un bandeau d'écran) :
        /// « Le conflit » est le nom que le chantier donne à cet écran (`AppShell.DestinationsPlus`,
        /// brief), le sous-titre est une synthèse d'interface, même geste que « le parloir »/« La
        /// distribution » (㉛/㉘).</summary>
        private void RendreTitre()
        {
            // Le titre est le geste de l'écran, comme dans les six cadres `.cfl6` de la maquette.
            // « Le conflit » reste le nom de destination dans le menu Plus ; le répéter ici
            // transformait une table où l'on décide en page documentaire (juge visuel r1 M10).
            titreTexte.text = Libelle.Gabarit("conflit.bloc.le_coup_de_ce_soir", "Le prochain coup");
            // Restauration (24/09) : l'en-tête montre le chapeau du panneau d'envoi (cadre 59, mise en scène gardée) — avec SA clé
            // (`conflit.bloc.on_choisit_…`) et le mot de la table 40 v3 (df041316). La mise en scène l'avait posé sous la clé du
            // sous-titre (`conflit.sous_titre.ce_que_vos_hommes_…`) : clé et texte ne se répondaient plus.
            sousTitreTexte.text = Libelle.Gabarit(
                "conflit.bloc.on_choisit_une_famille_on_choisit_un_homme_et_on_l_envoie_on_saura_demain",
                "On choisit une famille, on choisit qui y envoyer. On saura demain.");
            TrackText(titreTexte.text);
            TrackText(sousTitreTexte.text);
        }

        /// <summary>Cadre 63 — « Ce qui est rentré » : le DERNIER envoi rentré (le premier `resolved` de la liste, servie du plus
        /// récent au plus ancien par minute de jeu), son issue, ce qu'il a coûté et ce qu'il a fait chauffer. Rien si aucun
        /// envoi n'est rentré. Chaque ligne à valeur null est OMISE (aucun mot deviné). Le nom du lieutenant s'affiche s'il est
        /// servi ; sinon la ligne commence par la famille. L'historique groupe les envois réels de cette famille sans rang ;
        /// « Coup n°N » attend toujours `strike_index` (L3bis). « Y retourner » est un geste à route (L4).</summary>
        private void RendreRentre(EngagementDto[] engagements)
        {
            ViderEnfants(rentreRoot);
            EngagementDto dernier = null;
            if (engagements != null)
                foreach (EngagementDto e in engagements)
                    if (e != null && e.status == "resolved") { dernier = e; break; }
            if (dernier == null) return;

            EnTeteDeSection(rentreRoot,
                Libelle.Gabarit("conflit.bloc.ce_qui_est_rentre", "Ce qui est rentré"),
                Libelle.Gabarit("conflit.bloc.ce_que_chaque_homme_a_rapporte_et_ce_que_ca_nous_a_coute",
                    "Ce que chaque envoi a rapporté, et ce que ça nous a coûté."));
            EtiquetteDeSection(rentreRoot, "IlEstRentre", Libelle.Gabarit("conflit.bloc.il_est_rentre", "De retour"));
            LigneDEnvoi(rentreRoot, "Rentre_" + dernier.engagement_id, dernier,
                Libelle.Gabarit("conflit.bloc.etait_chez_famille", "était chez {famille}",
                    new Dictionary<string, string> { { "famille", ConflitResolvers.FamilleDe(dernier) } }),
                ConflitResolvers.Issue(dernier.outcome_bucket), dernier.outcome_bucket);

            string cout = ConflitResolvers.Cout(dernier.friction_consumed_bucket);
            if (cout != null)
                LigneDeMesure(rentreRoot, "Cout", Libelle.Gabarit("conflit.bloc.ca_nous_a_coute", "ça nous a coûté"), cout);
            string chaleur = ConflitResolvers.Chaleur(dernier.heat_increment_bucket);
            if (chaleur != null)
                LigneDeMesure(rentreRoot, "Chaleur", Libelle.Gabarit("conflit.bloc.la_ville_a_chauffe", "la ville a chauffé"), chaleur);

            // Cadre 63 révisé : l'historique est déjà dans la liste servie. Sans `strike_index`, chaque ligne dit seulement
            // « un envoi » et son issue — jamais un rang déduit de la position dans le tableau.
            string familleHistorique = dernier.target_rival_key;
            EtiquetteDeSection(rentreRoot, "HistoriqueFamille",
                Libelle.Gabarit("conflit.bloc.depuis_le_debut_chez_famille", "Depuis le début, chez {famille}",
                    new Dictionary<string, string> { { "famille", ConflitResolvers.FamilleDe(dernier) } }));
            if (engagements != null)
                foreach (EngagementDto e in engagements)
                    if (e != null && e.status == "resolved" && e.target_rival_key == familleHistorique)
                        LigneHistorique(rentreRoot, "Historique_" + e.engagement_id,
                            Libelle.Gabarit("conflit.bloc.un_homme_envoye", "un envoi"),
                            ConflitResolvers.Issue(e.outcome_bucket), e.outcome_bucket);

            // Cadre 63 : la réplique (sans orateur : le nom est sur la ligne au-dessus, arbitrage du 23/09) et « Y retourner »,
            // dont les mots sont ceux de la 40 : « En envoyer un autre » · « même famille, autre cible ».
            if (muscleLieutenants.Count == 0) return;
            Replique(rentreRoot, "RepliqueRentre", Libelle.Gabarit("conflit.bloc.voila_ce_que_ca_a_donne_a_vous_de_dire_si_on_y_retourne", "«\u00A0Voilà ce que ça a donné. À vous de dire si on y retourne.\u00A0»"));
            string famille = dernier.target_rival_key;
            BoutonGeste(rentreRoot, "YRetourner", Libelle.Gabarit("conflit.bloc.en_envoyer_un_autre", "Envoyer quelqu’un d’autre"),
                Libelle.Gabarit("conflit.bloc.meme_famille_autre_cible", "même famille, autre cible"), true, () => EnEnvoyerUnAutre(famille));
        }

        /// <summary>Cadre 62 — « Ce qui est en cours » : les envois PARTIS (`scheduled`, on ne peut plus les rappeler : aucune
        /// route d'annulation) puis les DÉJÀ RENTRÉS avec leur issue, et le compte des hommes dehors (D15 : le nombre vient de
        /// la liste). Rien si aucun envoi n'est parti. « En envoyer un autre » est un geste à route (L4).</summary>
        private void RendreEnCours(EngagementDto[] engagements)
        {
            ViderEnfants(enCoursRoot);
            var partis = new List<EngagementDto>();
            var rentres = new List<EngagementDto>();
            if (engagements != null)
                foreach (EngagementDto e in engagements)
                {
                    if (e == null) continue;
                    if (e.status == "scheduled") partis.Add(e);
                    else if (e.status == "resolved") rentres.Add(e);
                }
            if (partis.Count == 0) return;

            EnTeteDeSection(enCoursRoot,
                Libelle.Gabarit("conflit.bloc.ce_qui_est_en_cours", "Ce qui est en cours"),
                Libelle.Gabarit("conflit.bloc.les_hommes_qu_on_a_envoyes_et_qui_ne_sont_pas_encore_rentres",
                    "Ce qu’on a envoyé et qui n’est pas encore rentré."));

            EtiquetteDeSection(enCoursRoot, "Partis",
                Libelle.Gabarit("conflit.bloc.partis_pas_encore_rentres", "En route, pas encore de retour"));
            string plusLeRappeler = Libelle.Gabarit("conflit.bloc.on_ne_peut_plus_le_rappeler", "plus de rappel possible");
            foreach (EngagementDto e in partis)
                LigneDEnvoi(enCoursRoot, "Parti_" + e.engagement_id, e,
                    Libelle.Gabarit("conflit.bloc.parti_chez_famille", "en route vers {famille}",
                        new Dictionary<string, string> { { "famille", ConflitResolvers.FamilleDe(e) } }),
                    plusLeRappeler);

            if (rentres.Count > 0)
            {
                EtiquetteDeSection(enCoursRoot, "DejaRentres", Libelle.Gabarit("conflit.bloc.deja_rentres", "Déjà de retour"));
                foreach (EngagementDto e in rentres)
                    LigneDEnvoi(enCoursRoot, "DejaRentre_" + e.engagement_id, e,
                        Libelle.Gabarit("conflit.bloc.etait_chez_famille", "était chez {famille}",
                            new Dictionary<string, string> { { "famille", ConflitResolvers.FamilleDe(e) } }),
                        ConflitResolvers.Issue(e.outcome_bucket), e.outcome_bucket);
            }

            TextMeshProUGUI dehors = NouveauTexteFiche(enCoursRoot, "HommesDehors",
                ConflitResolvers.HommesDehors(partis.Count) + " " +
                Libelle.Gabarit("conflit.bloc.on_ne_les_rappelle_pas_on_saura_demain_matin",
                    "On ne les rappelle pas — on saura demain matin."),
                8f, DesignTokens.Current.onSurfaceSecondary, false);
            dehors.enableWordWrapping = true;
            TrackText(dehors.text);

            if (muscleLieutenants.Count > 0)
                BoutonGeste(enCoursRoot, "EnEnvoyerUnAutre", Libelle.Gabarit("conflit.bloc.en_envoyer_un_autre", "Envoyer quelqu’un d’autre"),
                    Libelle.Gabarit("conflit.bloc.autre_famille_autre_cible", "autre famille, autre cible"), true, () => EnEnvoyerUnAutre(null));
        }

        private void EnTeteDeSection(Transform parent, string titre, string chapeau)
        {
            TextMeshProUGUI t = NouveauTexteFiche(parent, "SectionTitre", titre, 12f, DesignTokens.Current.onSurfacePrimary, true);
            TrackText(t.text);
            TextMeshProUGUI c = NouveauTexteFiche(parent, "SectionChapeau", chapeau, 8f, DesignTokens.Current.onSurfaceSecondary, false);
            c.enableWordWrapping = true;
            TrackText(c.text);
        }

        private void EtiquetteDeSection(Transform parent, string nom, string texte)
        {
            TextMeshProUGUI e = NouveauTexteFiche(parent, nom, texte, 8.5f, DesignTokens.Current.onSurfaceSecondary, false);
            e.characterSpacing = 4f;
            e.fontStyle |= FontStyles.UpperCase;
            TrackText(e.text);
        }

        /// <summary>Une ligne d'envoi (cadres 62-63) : à gauche le nom du lieutenant (s'il est servi) en gras et le lieu en
        /// italique, à droite l'issue ou « on ne peut plus le rappeler ». `droite` null ⇒ rien à droite.</summary>
        private void LigneDEnvoi(Transform parent, string nomLigne, EngagementDto e, string lieu, string droite,
                                 string issueBucket = null)
        {
            GameObject ligne = NouveauUI(nomLigne, parent);
            AjouterFond(ligne, DesignTokens.Current.surfaceRow);
            HorizontalLayoutGroup hl = ligne.AddComponent<HorizontalLayoutGroup>();
            hl.padding = new RectOffset(PxTrait(10f), PxTrait(10f), PxTrait(6f), PxTrait(6f));
            hl.spacing = Px(8f);
            hl.childControlWidth = true; hl.childControlHeight = true;
            hl.childForceExpandWidth = false; hl.childForceExpandHeight = false;
            hl.childAlignment = TextAnchor.MiddleLeft;
            AddLayoutElement(ligne, flexibleHeight: 0);

            GameObject gauche = NouveauUI("Qui", ligne.transform);
            VerticalLayoutGroup vg = gauche.AddComponent<VerticalLayoutGroup>();
            vg.childControlWidth = true; vg.childControlHeight = true;
            vg.childForceExpandWidth = true; vg.childForceExpandHeight = false;
            AddLayoutElement(gauche, flexibleWidth: 1);

            string lieutenant = ConflitResolvers.NomDuLieutenant(e.lieutenant);
            if (lieutenant != null)
            {
                AjouterAvatar(ligne.transform);
                TextMeshProUGUI nom = NouveauTexteFiche(gauche.transform, "Lieutenant", lieutenant, 10f,
                    DesignTokens.Current.onSurfacePrimary, true);
                TrackText(nom.text);
            }
            TextMeshProUGUI ou = NouveauTexteFiche(gauche.transform, "Lieu", lieu, 8f, DesignTokens.Current.onSurfaceMuted, false);
            TrackText(ou.text);

            if (droite == null) return;
            if (issueBucket != null)
                AjouterBadgeIssue(ligne.transform, "Droite", droite, issueBucket);
            else
            {
                TextMeshProUGUI d = NouveauTexteFiche(ligne.transform, "Droite", droite, 8.5f,
                    DesignTokens.Current.onSurfaceSecondary, false);
                d.alignment = TextAlignmentOptions.Right;
                d.enableWordWrapping = true;
                AddLayoutElement(d.gameObject, preferredWidth: Px(90f));
                TrackText(d.text);
            }
        }

        /// <summary>« ça nous a coûté un peu » (cadre 63) : le libellé, puis le mot de la bande en gras.</summary>
        private void LigneDeMesure(Transform parent, string nom, string libelle, string mot)
        {
            GameObject ligne = NouveauUI(nom, parent);
            HorizontalLayoutGroup hl = ligne.AddComponent<HorizontalLayoutGroup>();
            hl.spacing = Px(4f);
            hl.childControlWidth = true; hl.childControlHeight = true;
            hl.childForceExpandWidth = false; hl.childForceExpandHeight = false;
            AddLayoutElement(ligne, flexibleHeight: 0);
            TextMeshProUGUI l = NouveauTexteFiche(ligne.transform, "Libelle", libelle, 8.5f, DesignTokens.Current.onSurfaceSecondary, false);
            TrackText(l.text);
            TextMeshProUGUI m = NouveauTexteFiche(ligne.transform, "Mot", mot, 8.5f, DesignTokens.Current.onSurfacePrimary, true);
            TrackText(m.text);
        }

        /// <summary>Une ligne de l'historique par famille : libellé épicène à gauche, issue à droite. Aucun nom de lieutenant
        /// ni rang n'est répété ici ; le détail du dernier retour vit déjà juste au-dessus.</summary>
        private void LigneHistorique(Transform parent, string nom, string libelle, string issue, string issueBucket)
        {
            GameObject ligne = NouveauUI(nom, parent);
            AjouterFond(ligne, DesignTokens.Current.surfaceRow);
            HorizontalLayoutGroup hl = ligne.AddComponent<HorizontalLayoutGroup>();
            hl.padding = new RectOffset(PxTrait(10f), PxTrait(10f), PxTrait(6f), PxTrait(6f));
            hl.spacing = Px(8f);
            hl.childControlWidth = true; hl.childControlHeight = true;
            hl.childForceExpandWidth = false; hl.childForceExpandHeight = false;
            hl.childAlignment = TextAnchor.MiddleLeft;
            AddLayoutElement(ligne, flexibleHeight: 0);

            TextMeshProUGUI gauche = NouveauTexteFiche(ligne.transform, "Libelle", libelle, 9f,
                DesignTokens.Current.onSurfacePrimary, true);
            AddLayoutElement(gauche.gameObject, flexibleWidth: 1);
            TrackText(gauche.text);
            if (issue == null) return;
            AjouterBadgeIssue(ligne.transform, "Issue", issue, issueBucket);
        }

        /// <summary>Le petit portrait de `.env .av` (cadres 62-63). On réemploie le buste unique déjà arbitré pour les
        /// lieutenants, mais pas le médaillon du comptoir : ce dessin-ci est rond, gris et sans liseré laiton.</summary>
        private void AjouterAvatar(Transform parent, bool clair = false)
        {
            float taille = Px(clair ? 34f : 30f);
            GameObject avatar = NouveauUI("Avatar", parent);
            avatar.transform.SetSiblingIndex(0);
            AddLayoutElement(avatar, minWidth: taille, preferredWidth: taille, minHeight: taille, preferredHeight: taille,
                flexibleWidth: 0f, flexibleHeight: 0f);
            Image masque = AjouterImage(avatar);
            masque.sprite = ProceduralUI.RoundedRectMask(Mathf.Max(1, Mathf.RoundToInt(taille * 0.5f)));
            masque.type = Image.Type.Sliced;
            masque.color = clair ? CouleurLocale("#ddd3c0") : DesignTokens.Current.surfaceRow;
            masque.raycastTarget = false;
            avatar.AddComponent<Mask>().showMaskGraphic = true;

            Sprite silhouette = Resources.Load<Sprite>(MedaillonAuComptoir.CheminBusteLieutenant);
            if (silhouette != null)
            {
                GameObject buste = NouveauUI("Buste", avatar.transform);
                Image dessin = AjouterImage(buste);
                dessin.sprite = silhouette;
                // Le PNG commun est cuit en beige pour le comptoir (#cfc4a6). Les deux contextes du conflit demandent
                // une autre encre : gris-bleu dans `.env`, brun sur la fiche papier `.ordre`.
                dessin.color = clair ? CouleurLocale("#86807b") : CouleurLocale("#b8d1ff");
                dessin.preserveAspect = true;
                dessin.raycastTarget = false;
                RectTransform brt = (RectTransform)buste.transform;
                brt.anchorMin = brt.anchorMax = new Vector2(0.5f, 0f);
                brt.pivot = new Vector2(0.5f, 0f);
                float tailleBuste = clair ? 30f : 26f;
                brt.sizeDelta = new Vector2(Px(tailleBuste), Px(tailleBuste));
                brt.anchoredPosition = Vector2.zero;
            }

            GameObject bord = NouveauUI("Bord", avatar.transform);
            Image filet = AjouterImage(bord);
            filet.sprite = ProceduralUI.RoundedRectOutline(Mathf.Max(1, Mathf.RoundToInt(taille * 0.5f)),
                Mathf.Max(1f, Px(1f)), clair ? CouleurLocale("#bfb39a") : CouleurLocale("#3b4650"));
            filet.type = Image.Type.Sliced;
            filet.raycastTarget = false;
            Etirer((RectTransform)bord.transform);
        }

        /// <summary>Le résultat de l'envoi est un badge compact bordé par sa propre couleur (`.env .res`), pas un texte gris
        /// occupant une colonne entière.</summary>
        private void AjouterBadgeIssue(Transform parent, string nomObjet,   // un NOM D'OBJET (« Droite », « Issue »), jamais le texte affiché (`texte`) — garde IdentiteNonDeriveeDuTexte
                                        string texte, string bucket)
        {
            Color couleur = CouleurIssue(bucket);
            GameObject badge = NouveauUI(nomObjet + "Cadre", parent);
            Image filet = AjouterImage(badge);
            filet.sprite = ProceduralUI.RoundedRectOutline(Mathf.Max(1, PxTrait(2f)), Mathf.Max(1f, Px(1f)), couleur);
            filet.type = Image.Type.Sliced;
            filet.raycastTarget = false;
            HorizontalLayoutGroup hb = badge.AddComponent<HorizontalLayoutGroup>();
            hb.padding = new RectOffset(PxTrait(6f), PxTrait(6f), PxTrait(4f), PxTrait(4f));
            hb.childAlignment = TextAnchor.MiddleCenter;
            hb.childControlWidth = true; hb.childControlHeight = true;
            hb.childForceExpandWidth = false; hb.childForceExpandHeight = false;
            TextMeshProUGUI libelle = NouveauTexteFiche(badge.transform, nomObjet, texte, 8f, couleur, true);
            libelle.alignment = TextAlignmentOptions.Center;
            libelle.enableWordWrapping = false;
            TrackText(libelle.text);
        }

        /// <summary>§1/§2 — La table des 4 familles (cadres 59-61) : le domaine clos de `target_rival_key`
        /// (`ConflitResolvers.DomaineFamilles`), chacune avec le compte de ses envois rentrés (`CompterRentres`, jamais
        /// fabriqué : `GET /v1/me/engagements`). Les familles restent PÂLES : aucune route ne dit ce qu'elles préparent ni ce
        /// qu'elles possèdent.</summary>
        private void RendreTable(EngagementDto[] engagements, bool indisponible)
        {
            ViderEnfants(tableRoot);

            // Table 40 : « Les quatre familles de Brennar » (D14, le mot ratifié) ; la clé servie reste (exception à la dérivation).
            TextMeshProUGUI label = NouveauTexteFiche(tableRoot, "TableLabel",
                Libelle.Gabarit("conflit.bloc.les_quatre_familles", "Les quatre familles de Brennar"), 8.5f,
                CouleurLocale("#8a7f6b"), true);
            label.characterSpacing = 4f;
            label.fontStyle |= FontStyles.UpperCase;
            TrackText(label.text);

            if (indisponible)
            {
                TextMeshProUGUI err = NouveauTexteFiche(tableRoot, "VendettaIndisponible",
                    Libelle.De("conflit", "bloc",
                        "Le compte des envois précédents n’a pas répondu."),
                    7.5f, RougeMauvais, false);
                err.enableWordWrapping = true;
                TrackText(err.text);
            }

            Dictionary<string, int> compte = CompterRentres(engagements);

            foreach (string cle in ConflitResolvers.DomaineFamilles)
            {
                GameObject ligne = NouveauUI("Famille_" + cle, tableRoot);
                bool choisie = cle == ChoixFamille;
                Image fondLigne = AjouterImage(ligne);
                fondLigne.sprite = ProceduralUI.RoundedRectMask(Mathf.Max(1, PxTrait(3f)));
                fondLigne.type = Image.Type.Sliced;
                fondLigne.color = choisie ? CouleurLocale("#2e2114") : CouleurLocale("#241c14");
                fondLigne.raycastTarget = false;
                GameObject bord = NouveauUI(choisie ? "BordChoisi" : "Bord", ligne.transform);
                bord.AddComponent<LayoutElement>().ignoreLayout = true;
                Image filet = AjouterImage(bord);
                filet.sprite = ProceduralUI.RoundedRectOutline(Mathf.Max(1, PxTrait(3f)), Mathf.Max(1f, Px(1f)),
                    choisie ? CouleurLocale("#8a6a22") : CouleurLocale("#3d3024"));
                filet.type = Image.Type.Sliced;
                filet.raycastTarget = false;
                Etirer((RectTransform)bord.transform);
                // Cadres 59-61 : on choisit la famille DANS la table — seulement s'il y a un gros bras à envoyer.
                if (muscleLieutenants.Count > 0)
                {
                    fondLigne.raycastTarget = true;
                    Button choix = ligne.AddComponent<Button>();
                    choix.targetGraphic = fondLigne;
                    string famille = cle;
                    choix.onClick.AddListener(() => ChoisirFamille(famille));
                }
                HorizontalLayoutGroup hl = ligne.AddComponent<HorizontalLayoutGroup>();
                hl.padding = new RectOffset(PxTrait(9f), PxTrait(9f), PxTrait(8.25f), PxTrait(8.25f));
                hl.spacing = Px(9f);
                hl.childControlWidth = true; hl.childControlHeight = true;
                hl.childForceExpandWidth = false; hl.childForceExpandHeight = false;
                hl.childAlignment = TextAnchor.MiddleLeft;
                AddLayoutElement(ligne, flexibleHeight: 0);

                AjouterEcusson(ligne.transform, cle, choisie);

                // Pâle : `onSurfaceDim`, jamais `onSurfacePrimary` — la couleur PORTE l'absence de
                // donnée (aucune route ne dit ce qu'elles préparent), pas seulement la note ci-dessus.
                GameObject identite = NouveauUI("Identite", ligne.transform);
                VerticalLayoutGroup vi = identite.AddComponent<VerticalLayoutGroup>();
                vi.childControlWidth = true; vi.childControlHeight = true;
                vi.childForceExpandWidth = true; vi.childForceExpandHeight = false;
                AddLayoutElement(identite, flexibleWidth: 1);

                TextMeshProUGUI nom = NouveauTexteFiche(identite.transform, "Nom",
                    ConflitResolvers.NomFamille(cle), 9.5f, CouleurLocale("#efe6d4"), true);
                nom.font = DesignTokens.Current.hudSerifFont;
                TrackText(nom.text);

                // Sous-titre de la maquette ratifiée (cadres 59-61), clé SERVIE (balayage 34 : classe « servi »).
                TextMeshProUGUI sousTitre = NouveauTexteFiche(identite.transform, "SousTitre",
                    ConflitResolvers.SousTitreFamille(cle), 6.4f, CouleurLocale("#6f6350"), false);
                TrackText(sousTitre.text);

                // Compte indisponible : AUCUNE ligne de compte — la phrase d'erreur au-dessus le dit, un compte à zéro mentirait.
                if (indisponible) continue;

                GameObject bloc = NouveauUI("Compte", ligne.transform);
                VerticalLayoutGroup vl = bloc.AddComponent<VerticalLayoutGroup>();
                vl.childControlWidth = true; vl.childControlHeight = true;
                vl.childForceExpandWidth = true; vl.childForceExpandHeight = false;
                vl.childAlignment = TextAnchor.MiddleRight;

                // Cadres 59-61, arbitrage de l'orchestrateur (23/09) : on compte les envois RENTRÉS (`resolved`) — un envoi
                // `scheduled` n'y est pas encore allé. À 0, la seule ligne « on ne les a pas croisés » ; l'ICU `fois_chez_eux`
                // ne sert qu'à partir de 1 (pas de doublon « jamais » + « on ne les a pas croisés »).
                compte.TryGetValue(cle, out int n);
                if (n > 0)
                {
                    TextMeshProUGUI fois = NouveauTexteFiche(bloc.transform, "Fois", ConflitResolvers.FoisChezEux(n), 8.5f,
                        RougeMauvais, true);
                    fois.alignment = TextAlignmentOptions.Right;
                    TrackText(fois.text);
                }
                TextMeshProUGUI visites = NouveauTexteFiche(bloc.transform, "Visites",
                    n > 0 ? Libelle.Gabarit("conflit.bloc.on_est_alles_chez_eux", "on leur a rendu visite")
                          : Libelle.Gabarit("conflit.bloc.on_ne_les_a_pas_croises", "on n’a jamais croisé leur route"),
                    6.2f, CouleurLocale("#6f6350"), false);
                visites.alignment = TextAlignmentOptions.Right;
                TrackText(visites.text);

                if (cle == ChoixFamille)
                {
                    GameObject tag = NouveauUI("CeSoirCadre", ligne.transform);
                    Image tagFond = AjouterImage(tag);
                    tagFond.sprite = ProceduralUI.RoundedRectOutline(Mathf.Max(1, PxTrait(2f)), Mathf.Max(1f, Px(1f)),
                        CouleurLocale("#8a6a22"));
                    tagFond.type = Image.Type.Sliced;
                    tagFond.raycastTarget = false;
                    HorizontalLayoutGroup tagLayout = tag.AddComponent<HorizontalLayoutGroup>();
                    tagLayout.padding = new RectOffset(PxTrait(5f), PxTrait(5f), PxTrait(3f), PxTrait(3f));
                    tagLayout.childAlignment = TextAnchor.MiddleCenter;
                    tagLayout.childControlWidth = true; tagLayout.childControlHeight = true;
                    tagLayout.childForceExpandWidth = false; tagLayout.childForceExpandHeight = false;
                    TextMeshProUGUI ceSoir = NouveauTexteFiche(tag.transform, "CeSoir",
                        Libelle.Gabarit("conflit.bloc.ce_soir", "En cours"), 6.4f, Or, true);
                    ceSoir.characterSpacing = 1f;
                    ceSoir.fontStyle |= FontStyles.UpperCase;
                    ceSoir.enableWordWrapping = false;
                    TrackText(ceSoir.text);
                }
            }
        }

        /// <summary>Le petit écu de la table des familles (`.fam .ecu`). Son initiale est `ConflitResolvers.InitialeFamille` :
        /// VIDE tant que sa clé n'est pas servie (arbitrage du 2026-09-24).</summary>
        private void AjouterEcusson(Transform parent, string cle, bool choisi)
        {
            float largeur = Px(26f), hauteur = Px(30f);
            GameObject ecu = NouveauUI("Ecu", parent);
            AddLayoutElement(ecu, minWidth: largeur, preferredWidth: largeur, minHeight: hauteur, preferredHeight: hauteur,
                flexibleWidth: 0f, flexibleHeight: 0f);
            Image fond = AjouterImage(ecu);
            fond.sprite = ProceduralUI.RoundedRectMask(Mathf.Max(1, PxTrait(4f)));
            fond.type = Image.Type.Sliced;
            fond.color = choisi ? CouleurLocale("#4a3618") : CouleurLocale("#3a2d20");
            fond.raycastTarget = false;

            GameObject bord = NouveauUI("Bord", ecu.transform);
            Image filet = AjouterImage(bord);
            filet.sprite = ProceduralUI.RoundedRectOutline(Mathf.Max(1, PxTrait(4f)), Mathf.Max(1f, Px(1f)),
                choisi ? CouleurLocale("#8a6a22") : CouleurLocale("#5a4938"));
            filet.type = Image.Type.Sliced;
            filet.raycastTarget = false;
            Etirer((RectTransform)bord.transform);

            TextMeshProUGUI initiale = NouveauTexteFiche(ecu.transform, "Initiale",
                ConflitResolvers.InitialeFamille(cle), 10f,
                choisi ? CouleurLocale("#f0dfc4") : CouleurLocale("#c9a86a"), true);
            initiale.font = DesignTokens.Current.hudSerifFont;
            initiale.alignment = TextAlignmentOptions.Center;
            Etirer((RectTransform)initiale.transform);
            TrackText(initiale.text);
        }

        /// <summary>Le compte des envois RENTRÉS (`status == "resolved"`) par `target_rival_key`, côté client. `engagements`
        /// null (jamais chargé) ou vide : dictionnaire vide, jamais une exception. Une clé hors des 4 n'est pas comptée : le
        /// back la refuse (404 au POST), elle ne peut pas être servie — la couverture du domaine est gardée par un test.</summary>
        public static Dictionary<string, int> CompterRentres(EngagementDto[] engagements)
        {
            var compte = new Dictionary<string, int>();
            if (engagements == null) return compte;
            foreach (EngagementDto e in engagements)
            {
                if (e == null || e.status != "resolved" || string.IsNullOrEmpty(e.target_rival_key)) continue;
                if (System.Array.IndexOf(ConflitResolvers.DomaineFamilles, e.target_rival_key) < 0) continue;
                compte.TryGetValue(e.target_rival_key, out int n);
                compte[e.target_rival_key] = n + 1;
            }
            return compte;
        }

        /// <summary>Les lieutenants `archetype == "MUSCLE"` (« gros bras ») — les SEULS choisissables pour un envoi (le back
        /// répond 409 `MUSCLE_LIEUTENANT_REQUIRED` à tout autre).</summary>
        private static List<LieutenantRowDto> Muscles(LieutenantRowDto[] lieutenants)
        {
            var l = new List<LieutenantRowDto>();
            if (lieutenants != null)
                foreach (LieutenantRowDto x in lieutenants)
                    if (x != null && x.archetype == "MUSCLE" && !string.IsNullOrEmpty(x.lieutenant_id)) l.Add(x);
            return l;
        }

        /// <summary>Cadres 59-61 — « Le coup de ce soir » : on choisit un homme (un gros bras), un axe (un des 5), et une famille
        /// (dans la table, en dessous). Aucun choix présélectionné. Quand les trois sont faits, la phrase d'envoi « On envoie
        /// {nom} chez {famille}, sur {axe}. » ; quand la famille choisie a un envoi rentré, la phrase de l'atelier (addendum à la
        /// 40, 24897b48 ; v3.1 « là-bas », 78faf9b4) « La dernière fois là-bas : {issue}, et la ville a chauffé {chaleur}. » (`LaDerniereFoisChezEux`).
        /// Sans gros bras : les deux phrases servies qui le disent, et rien à choisir.</summary>
        private void RendreCoup(EngagementDto[] engagements)
        {
            ViderEnfants(coupRoot);

            if (muscleLieutenants.Count == 0)
            {
                RendreOrdreIncomplet();
                return;
            }

            // Le résumé choisi est la fiche papier de la maquette. Les contrôles restent dessous : le joueur peut encore
            // corriger l'homme ou l'axe avant d'envoyer, sans que la phrase perde sa place dans l'ordre de lecture.
            LieutenantRowDto choisi = null;
            foreach (LieutenantRowDto l in muscleLieutenants)
                if (l.lieutenant_id == ChoixLieutenant) { choisi = l; break; }
            if (EnvoiPossible && choisi != null)
            {
                RendreOrdreChoisi(engagements, choisi);
                // Le cadre nominal est la fiche d'ordre terminée, pas le formulaire qui l'a
                // produite. La table reste interactive pour changer de famille ; l'homme et l'axe
                // reparaissent lorsqu'on repart de zéro après un envoi.
                return;
            }

            // L'homme : une ligne par gros bras, le choisi sur fond surélevé.
            foreach (LieutenantRowDto l in muscleLieutenants)
            {
                bool estChoisi = l.lieutenant_id == ChoixLieutenant;
                string id = l.lieutenant_id;
                GameObject ligne = LigneChoisissable(coupRoot, "Homme_" + id, estChoisi, () => ChoisirLieutenant(id));
                TextMeshProUGUI nom = NouveauTexteFiche(ligne.transform, "Nom", l.name, 10f, DesignTokens.Current.onSurfacePrimary, true);
                AddLayoutElement(nom.gameObject, flexibleWidth: 1);
                TrackText(nom.text);
                // Les deux champs RÉELS, par les résolveurs PARTAGÉS (organigramme ⑯) — jamais une puce de fiction.
                TextMeshProUGUI role = NouveauTexteFiche(ligne.transform, "Role",
                    $"{FamilleLabels.Archetype(l.archetype)} · {FamilleLabels.Anciennete(l.tenure_bucket)}",
                    7f, DesignTokens.Current.onSurfaceMuted, false);
                role.alignment = TextAlignmentOptions.Right;
                TrackText(role.text);
            }

            // L'axe : 5 choix, aucun présélectionné (le back vise un AXE, pas un bâtiment).
            GameObject axes = NouveauUI("Axes", coupRoot);
            HorizontalLayoutGroup ha = axes.AddComponent<HorizontalLayoutGroup>();
            ha.spacing = Px(4f);
            ha.childControlWidth = true; ha.childControlHeight = true;
            ha.childForceExpandWidth = true; ha.childForceExpandHeight = false;
            AddLayoutElement(axes, flexibleHeight: 0);
            foreach (string axe in ConflitResolvers.Axes)
            {
                string a = axe;
                GameObject chip = LigneChoisissable(axes.transform, "Axe_" + a, a == ChoixAxe, () => ChoisirAxe(a));
                TextMeshProUGUI mot = NouveauTexteFiche(chip.transform, "Mot", ConflitResolvers.AxeDeValeur(a), 7.5f,
                    a == ChoixAxe ? Or : DesignTokens.Current.onSurfaceSecondary, a == ChoixAxe);
                mot.alignment = TextAlignmentOptions.Center;
                mot.enableWordWrapping = true;
                TrackText(mot.text);
            }

        }

        private void RendreOrdreChoisi(EngagementDto[] engagements, LieutenantRowDto choisi)
        {
            GameObject ordre = NouveauUI("OrdreChoisi", coupRoot);
            Image papier = AjouterImage(ordre);
            papier.sprite = ProceduralUI.RoundedRectMask(Mathf.Max(1, PxTrait(2f)));
            papier.type = Image.Type.Sliced;
            papier.color = CouleurLocale("#f2ece0");
            papier.raycastTarget = false;
            VerticalLayoutGroup vo = ordre.AddComponent<VerticalLayoutGroup>();
            vo.padding = new RectOffset(PxTrait(11f), PxTrait(11f), PxTrait(10f), PxTrait(10f));
            vo.spacing = Px(7f);
            vo.childControlWidth = true; vo.childControlHeight = true;
            vo.childForceExpandWidth = true; vo.childForceExpandHeight = false;
            AddLayoutElement(ordre, flexibleHeight: 0);

            GameObject ligne = NouveauUI("Ligne", ordre.transform);
            HorizontalLayoutGroup hl = ligne.AddComponent<HorizontalLayoutGroup>();
            hl.spacing = Px(8f);
            hl.childAlignment = TextAnchor.MiddleLeft;
            hl.childControlWidth = true; hl.childControlHeight = true;
            hl.childForceExpandWidth = false; hl.childForceExpandHeight = false;
            AjouterAvatar(ligne.transform, clair: true);

            string nomFamille = ConflitResolvers.NomFamille(ChoixFamille);
            string axeVise = ConflitResolvers.AxeDeValeur(ChoixAxe);
            string phraseSimple = Libelle.Gabarit(
                "conflit.bloc.on_envoie_nom_chez_famille_sur_axe", "On envoie {nom} chez {famille}, sur {axe}.",
                new Dictionary<string, string>
                {
                    { "nom", choisi.name },
                    { "famille", nomFamille },
                    { "axe", axeVise },
                });
            string phraseAvecFamilleRouge = Libelle.Gabarit(
                "conflit.bloc.on_envoie_nom_chez_famille_sur_axe", "On envoie {nom} chez {famille}, sur {axe}.",
                new Dictionary<string, string>
                {
                    { "nom", choisi.name },
                    { "famille", $"<color=#8c2f36><b>{nomFamille}</b></color>" },
                    { "axe", axeVise },
                });
            TextMeshProUGUI phrase = NouveauTexteFiche(ligne.transform, "PhraseDEnvoi", phraseAvecFamilleRouge,
                9.5f, CouleurLocale("#2a2118"), false);
            phrase.font = DesignTokens.Current.hudSerifFont;
            phrase.enableWordWrapping = true;
            AddLayoutElement(phrase.gameObject, flexibleWidth: 1);
            // Le crochet fonctionnel reste sans balises ; la couleur rouge est une hiérarchie
            // typographique de la fiche, pas une partie de la phrase métier.
            TrackText(phraseSimple);

            // Restauration (24/09) : la ligne « Ce qu’on prend si ça marche » est RETIRÉE — la table 40 la classe « note : aucune
            // donnée servie ne le dit avant l’envoi (R2.2), pas un libellé » ; ses valeurs (« leurs armes », « leurs secrets »…)
            // étaient inventées. L'axe visé est déjà dit, avec le mot de la table, dans la phrase d'envoi.

            string laDerniereFois = ConflitResolvers.LaDerniereFoisChezEux(
                ConflitResolvers.DerniereRentreeChez(engagements, ChoixFamille));
            if (laDerniereFois == null) return;
            TextMeshProUGUI fois = NouveauTexteFiche(ordre.transform, "LaDerniereFois", laDerniereFois, 7f,
                CouleurLocale("#6d6250"), false);
            fois.font = DesignTokens.Current.hudSerifFont;
            fois.fontStyle = FontStyles.Italic;
            fois.enableWordWrapping = true;
            TrackText(fois.text);
        }

        /// <summary>L'état réel du compte de capture n'a aucun gros bras. La maquette conserve une
        /// serviette comme premier arrêt de l'œil dans tous ses états d'ordre : on garde donc la
        /// même matière et on y écrit honnêtement ce qui manque, au lieu de laisser un trou noir.</summary>
        private void RendreOrdreIncomplet()
        {
            GameObject ordre = NouveauUI("OrdreIncomplet", coupRoot);
            Image papier = AjouterImage(ordre);
            papier.sprite = ProceduralUI.RoundedRectMask(Mathf.Max(1, PxTrait(2f)));
            papier.type = Image.Type.Sliced;
            papier.color = CouleurLocale("#f2ece0");
            papier.raycastTarget = false;
            HorizontalLayoutGroup ligne = ordre.AddComponent<HorizontalLayoutGroup>();
            ligne.padding = new RectOffset(PxTrait(11f), PxTrait(11f), PxTrait(10f), PxTrait(10f));
            ligne.spacing = Px(8f);
            ligne.childAlignment = TextAnchor.MiddleLeft;
            ligne.childControlWidth = true; ligne.childControlHeight = true;
            ligne.childForceExpandWidth = false; ligne.childForceExpandHeight = false;
            AddLayoutElement(ordre, flexibleHeight: 0);
            AjouterAvatar(ordre.transform, clair: true);
            TextMeshProUGUI manque = NouveauTexteFiche(ordre.transform, "PiedVide",
                Libelle.De("conflit", "bloc", "Aucun de vos lieutenants n’est du genre Gros bras."),
                9.5f, CouleurLocale("#2a2118"), false);
            manque.font = DesignTokens.Current.hudSerifFont;
            manque.enableWordWrapping = true;
            AddLayoutElement(manque.gameObject, flexibleWidth: 1);
            TrackText(manque.text);
        }

        /// <summary>Sous la table : la réplique de l'homme (v2, sans orateur) et « L’envoyer ce soir », inactif tant que les trois
        /// choix ne sont pas faits. Rien sans gros bras (le panneau le dit déjà).</summary>
        private void RendrePied()
        {
            ViderEnfants(piedRoot);
            AjouterFondDePied();
            if (muscleLieutenants.Count == 0)
            {
                TextMeshProUGUI manque = NouveauTexteFiche(piedRoot, "PiedNote",
                    Libelle.Gabarit(
                        "conflit.bloc.c_est_lui_qui_part_la_nuit_il_vous_en_manque_un_ce_n_est_pas_casse_vous_n_en_avez_tout_simplement_pas_encore",
                        "C’est le gros bras qui part la nuit. Il vous en manque un — ce n’est pas cassé, vous n’en avez tout simplement pas encore."),
                    8f, CouleurLocale("#8d99a6"), false);
                manque.enableWordWrapping = true;
                TrackText(manque.text);
                BoutonGeste(piedRoot, "Recruter", Libelle.De("famille", "ecran", "Recruter un nouveau lieutenant"),
                    null, true, OuvrirRecrutement);   // la précision « pour préparer le coup » était inventée (restauration 24/09)
                return;
            }
            string replique = Libelle.Gabarit("conflit.bloc.dites_moi_qui_j_envoie_et_sur_quoi_je_pars_ce_soir_on_saura_demain", "\u00AB\u00A0Dites-moi seulement chez qui. J\u2019y vais, on saura demain.\u00A0\u00BB");
            // Arbitrage (5) du 23/09 : la réplique SANS orateur — « {nom} : » est une composition sans clé ; le nom est sur la ligne
            // de l'homme, au-dessus (restauration 24/09).
            Replique(piedRoot, "Replique", replique);
            string refus = ConflitResolvers.MotDuRefusDEnvoi(DerniereClasseDeRefus);
            if (refus != null)
            {
                TextMeshProUGUI r = NouveauTexteFiche(piedRoot, "Refus", refus, 8.5f, RougeMauvais, false);
                r.enableWordWrapping = true;
                TrackText(r.text);
            }
            BoutonGeste(piedRoot, "LEnvoyerCeSoir", Libelle.Gabarit("conflit.bloc.l_envoyer_ce_soir", "L\u2019envoyer"),
                Libelle.Gabarit("conflit.bloc.on_ne_pourra_plus_le_rappeler", "pas de rappel possible"), EnvoiPossible, EnvoyerLeCoup);
        }

        private void AjouterFondDePied()
        {
            GameObject fond = NouveauUI("Fond", piedRoot);
            fond.AddComponent<LayoutElement>().ignoreLayout = true;
            Image image = AjouterFond(fond, CouleurLocale("#141a21"));
            image.raycastTarget = false;
            RectTransform rt = (RectTransform)fond.transform;
            Etirer(rt);
            // Le parent suit les gouttières du contenu, mais la bande froide est une rupture de
            // bord à bord dans la maquette.
            rt.offsetMin = new Vector2(-PxTrait(13f), 0f);
            rt.offsetMax = new Vector2(PxTrait(13f), 0f);
            GameObject filet = NouveauUI("Filet", fond.transform);
            Image trait = AjouterFond(filet, CouleurLocale("#2c3640"));
            trait.raycastTarget = false;
            RectTransform frt = (RectTransform)filet.transform;
            frt.anchorMin = new Vector2(0f, 1f); frt.anchorMax = Vector2.one;
            frt.pivot = new Vector2(0.5f, 1f);
            frt.offsetMin = new Vector2(0f, -Px(2f));
            frt.offsetMax = Vector2.zero;
            fond.transform.SetAsFirstSibling();
        }

        private void Replique(Transform parent, string nom, string texte)
        {
            TextMeshProUGUI q = NouveauTexteFiche(parent, nom, texte, 8.6f, CouleurLocale("#cdd6e0"), false);
            q.font = DesignTokens.Current.hudSerifFont;
            q.fontStyle = FontStyles.Italic;
            q.enableWordWrapping = true;
            TrackText(q.text);
        }

        /// <summary>Un geste à route (cadres 59-63) : le libellé, et sa précision en petit dessous (`precision` null ⇒ aucune).
        /// `actif` faux ⇒ bouton non interactif et libellé éteint.</summary>
        private void BoutonGeste(Transform parent, string nom, string libelle, string precision, bool actif, UnityEngine.Events.UnityAction geste)
        {
            GameObject bouton = NouveauUI(nom, parent);
            Image fond = AjouterImage(bouton);
            fond.sprite = ProceduralUI.RoundedRectMask(Mathf.Max(1, PxTrait(3f)));
            fond.type = Image.Type.Sliced;
            fond.color = actif ? CouleurLocale("#241c11") : DesignTokens.Current.surfaceRaised;
            fond.raycastTarget = true;
            GameObject bord = NouveauUI("Bord", bouton.transform);
            bord.AddComponent<LayoutElement>().ignoreLayout = true;
            Image filet = AjouterImage(bord);
            filet.sprite = ProceduralUI.RoundedRectOutline(Mathf.Max(1, PxTrait(3f)), Mathf.Max(1f, Px(1f)),
                actif ? CouleurLocale("#5a4a2a") : DesignTokens.Current.onSurfaceDisabled);
            filet.type = Image.Type.Sliced;
            filet.raycastTarget = false;
            Etirer((RectTransform)bord.transform);
            Button b = bouton.AddComponent<Button>();
            b.targetGraphic = fond;
            b.interactable = actif;
            b.onClick.AddListener(geste);
            HorizontalLayoutGroup vb = bouton.AddComponent<HorizontalLayoutGroup>();
            vb.padding = new RectOffset(PxTrait(11f), PxTrait(11f), PxTrait(9f), PxTrait(9f));
            vb.spacing = Px(8f);
            vb.childAlignment = TextAnchor.MiddleCenter;
            vb.childControlWidth = true; vb.childControlHeight = true;
            vb.childForceExpandWidth = false; vb.childForceExpandHeight = false;
            AddLayoutElement(bouton, flexibleHeight: 0);
            Color encre = actif ? Or : DesignTokens.Current.onSurfaceDisabled;
            TextMeshProUGUI l = NouveauTexteFiche(bouton.transform, "Libelle", libelle, 10f, encre, true);
            l.fontStyle |= FontStyles.UpperCase;
            l.alignment = TextAlignmentOptions.Left;
            AddLayoutElement(l.gameObject, flexibleWidth: 1);
            TrackText(l.text);
            if (precision == null) return;
            TextMeshProUGUI p = NouveauTexteFiche(bouton.transform, "Precision", precision, 7f,
                actif ? CouleurLocale("#9a8a6a") : encre, false);
            p.alignment = TextAlignmentOptions.Right;
            TrackText(p.text);
        }

        /// <summary>Une ligne (ou une puce) qu'on touche pour choisir ; le choix courant est sur fond surélevé.</summary>
        private GameObject LigneChoisissable(Transform parent, string nom, bool choisie, UnityEngine.Events.UnityAction choisir)
        {
            GameObject ligne = NouveauUI(nom, parent);
            Image fond = AjouterImage(ligne);
            fond.color = choisie ? DesignTokens.Current.surfaceRaised : DesignTokens.Current.surfaceRow;
            fond.raycastTarget = true;
            Button b = ligne.AddComponent<Button>();
            b.targetGraphic = fond;
            b.onClick.AddListener(choisir);
            HorizontalLayoutGroup hl = ligne.AddComponent<HorizontalLayoutGroup>();
            hl.padding = new RectOffset(PxTrait(8f), PxTrait(8f), PxTrait(5f), PxTrait(5f));
            hl.spacing = Px(6f);
            hl.childControlWidth = true; hl.childControlHeight = true;
            hl.childForceExpandWidth = false; hl.childForceExpandHeight = false;
            hl.childAlignment = TextAnchor.MiddleLeft;
            AddLayoutElement(ligne, flexibleHeight: 0, flexibleWidth: 1);
            return ligne;
        }

        /// <summary>⛔ `DerniereErreur` est un CROCHET DE TEST (code, route, message du back) : il ne s'affiche JAMAIS au joueur,
        /// qui ne lit que des mots servis (règle du 23/09 : aucune valeur machine à l'écran). Les échecs de lecture ont déjà
        /// leurs phrases servies (`RendreEtatIndisponible`, « Le compte des envois précédents n’a pas répondu. ») ; les mots
        /// des refus du POST (409, 404, 422, réseau) n'existent pas encore dans la table 40 — demandés, branchés en L4.</summary>
        private void RendreMessageErreur()
        {
            ViderEnfants(erreurRoot);
        }

        /// <summary>Repli NOMMÉ sur échec réseau — jamais une exception, jamais un écran noir
        /// (patron ㊲/㉛/㉘ : `Render(null)` a fait planter un autre écran de ce dépôt à la
        /// première ligne qui lisait le payload).</summary>
        private void RendreEtatIndisponible()
        {
            ViderEnfants(rentreRoot);
            ViderEnfants(enCoursRoot);
            ViderEnfants(coupRoot);
            ViderEnfants(tableRoot);
            ViderEnfants(piedRoot);
            ViderEnfants(erreurRoot);
            titreTexte.text = Libelle.De("conflit", "titre", "Le conflit n'a pas répondu");
            // Jamais `DerniereErreur` ici : c'est un message technique (route, code), pas un mot pour le joueur.
            sousTitreTexte.text = Libelle.De("conflit", "sous_titre", "Réessayez dans un instant.");
            TrackText(titreTexte.text);
            TrackText(sousTitreTexte.text);
        }

        // ═══ Construction de la mise en page ═════════════════════════════════════════════════

        private void BuildLayout()
        {
            Canvas canvas = MafiaCleanCity.Shell.CanvasRacine.Resoudre(transform, mountParent);
            // ⛔ SOUS L'HÔTE, PAS SOUS `mountParent` (patron ㉛/㉘/gabarit corrigé) : bâtir sous
            // `mountParent` fait naître la feuille en FRÈRE de l'hôte — toute garde en
            // `GetComponentsInChildren` mesurerait alors un sous-arbre VIDE.
            Transform root = mountParent != null ? transform : canvas.transform;

            GameObject racine = NouveauUI("ConflitRoot", root);
            racinePleinEcran = (RectTransform)racine.transform;
            Etirer(racinePleinEcran);
            racine.AddComponent<CanvasRenderer>();
            VerticalGradientImage matiere = racine.AddComponent<VerticalGradientImage>();
            matiere.SetColors(CouleurLocale("#2a1e14"), CouleurLocale("#141014"));
            matiere.raycastTarget = false;
            racinePleinEcran.SetAsLastSibling();

            // ⛔ L'ÉCHELLE AVANT TOUTE CONVERSION — un RectTransform qui vient d'être étiré n'a
            // pas encore son `rect` résolu.
            Canvas.ForceUpdateCanvases();

            // ⛔ LA FENÊTRE DÉFILE (L6, 23/09) : l'historique grandit sans borne (« Déjà rentrés », une ligne par envoi), et
            // « rentré », « en cours », le panneau et la table dépassent déjà la hauteur d'un téléphone. `Corps` est la FENÊTRE
            // (bornée aux insets du chrome, `RectMask2D` : rien ne dessine sur le dock, `ScrollRect` vertical : rien n'est
            // injoignable) ; `Contenu` est ce qui défile, dimensionné sur ses enfants (`ContentSizeFitter`) — patron
            // `DelegationScreenController.ConstruireZoneCentrale`. Toutes les sections se parentent sous `Contenu`.
            float hauteurScene = Px(56f);
            float recouvrementSousManometre = Px(25f);
            ConstruireSceneHaute(racine.transform, hauteurScene, recouvrementSousManometre);
            GameObject corpsGo = NouveauUI("Corps", racine.transform);
            RectTransform corps = (RectTransform)corpsGo.transform;
            corps.anchorMin = Vector2.zero;
            corps.anchorMax = Vector2.one;
            corps.offsetMin = new Vector2(0f, ShellChrome.BottomInsetPx);
            corps.offsetMax = new Vector2(0f, -(ShellChrome.TopInsetPx + hauteurScene));
            corpsGo.AddComponent<RectMask2D>();
            ScrollRect defilement = corpsGo.AddComponent<ScrollRect>();
            defilement.horizontal = false;
            defilement.vertical = true;
            defilement.movementType = ScrollRect.MovementType.Clamped;
            defilement.scrollSensitivity = 40f;

            GameObject contenuGo = NouveauUI("Contenu", corpsGo.transform);
            RectTransform contenu = (RectTransform)contenuGo.transform;
            contenu.anchorMin = new Vector2(0f, 1f);
            contenu.anchorMax = new Vector2(1f, 1f);
            contenu.pivot = new Vector2(0.5f, 1f);
            contenu.offsetMin = Vector2.zero;
            contenu.offsetMax = Vector2.zero;
            defilement.viewport = corps;
            defilement.content = contenu;
            ContentSizeFitter ajuste = contenuGo.AddComponent<ContentSizeFitter>();
            ajuste.verticalFit = ContentSizeFitter.FitMode.PreferredSize;

            VerticalLayoutGroup pile = contenuGo.AddComponent<VerticalLayoutGroup>();
            pile.padding = new RectOffset(PxTrait(13f), PxTrait(13f), PxTrait(11f), PxTrait(15f));
            // Les sections Rentre/EnCours/Coup sont mutuellement exclusives dans les cadres de
            // référence. Un spacing porté par leur parent créait pourtant trois blancs quand deux
            // sections étaient vides. Chaque section porte désormais son propre rythme interne.
            pile.spacing = 0f;
            pile.childControlWidth = true; pile.childControlHeight = true;
            pile.childForceExpandWidth = true; pile.childForceExpandHeight = false;
            pile.childAlignment = TextAnchor.UpperCenter;

            titreTexte = NouveauTexteFiche(contenuGo.transform, "Titre", "",
                12f, CouleurLocale("#f0dfc4"), true);
            titreTexte.font = DesignTokens.Current.hudSerifFont;
            titreTexte.enableWordWrapping = true;

            sousTitreTexte = NouveauTexteFiche(contenuGo.transform, "SousTitre", "",
                7f, CouleurLocale("#9a8a6a"), false);
            sousTitreTexte.enableWordWrapping = true;
            AddLayoutElement(sousTitreTexte.gameObject, flexibleHeight: 0);

            // Surface de l'en-tête `.cfl6 .entete`, derrière les deux textes directs (leurs noms
            // et leur chemin restent stables pour les gardes fonctionnelles du chantier).
            GameObject entete = NouveauUI("EnteteFond", contenuGo.transform);
            LayoutElement enteteLe = entete.AddComponent<LayoutElement>();
            enteteLe.ignoreLayout = true;
            Image enteteImage = AjouterFond(entete, CouleurLocale("#20180f"));
            enteteImage.raycastTarget = false;
            RectTransform ert = (RectTransform)entete.transform;
            ert.anchorMin = new Vector2(0f, 1f); ert.anchorMax = new Vector2(1f, 1f);
            ert.pivot = new Vector2(0.5f, 1f);
            ert.sizeDelta = new Vector2(Px(26f), Px(68.5f));
            ert.anchoredPosition = new Vector2(0f, Px(11f));
            entete.transform.SetAsFirstSibling();
            GameObject enteteFilet = NouveauUI("Filet", entete.transform);
            Image enteteTrait = AjouterFond(enteteFilet, CouleurLocale("#3d3024"));
            enteteTrait.raycastTarget = false;
            RectTransform efrt = (RectTransform)enteteFilet.transform;
            efrt.anchorMin = Vector2.zero; efrt.anchorMax = new Vector2(1f, 0f);
            efrt.pivot = new Vector2(0.5f, 0f);
            efrt.sizeDelta = new Vector2(0f, Px(1f));
            efrt.anchoredPosition = new Vector2(0f, -Px(1f));

            GameObject finEntete = NouveauUI("FinEntete", contenuGo.transform);
            AddLayoutElement(finEntete, preferredHeight: Px(28f), flexibleHeight: 0);

            rentreRoot = NouvelleSection(contenuGo.transform, "Rentre");
            enCoursRoot = NouvelleSection(contenuGo.transform, "EnCours");
            coupRoot = NouvelleSection(contenuGo.transform, "Coup");

            GameObject tableGo = NouveauUI("Table", contenuGo.transform);
            VerticalLayoutGroup vtb = tableGo.AddComponent<VerticalLayoutGroup>();
            vtb.spacing = Px(4f);
            vtb.childControlWidth = true; vtb.childControlHeight = true;
            vtb.childForceExpandWidth = true; vtb.childForceExpandHeight = false;
            AddLayoutElement(tableGo, flexibleHeight: 0);
            tableRoot = tableGo.transform;

            // `.cfl6 .bas` suit immédiatement la dernière famille. Elle appartient donc au flux
            // défilant : sur un écran haut elle ne se détache pas du dossier, et sur un écran court
            // elle reste atteignable avec le reste du contenu au lieu de masquer Saltline.
            GameObject piedGo = NouveauUI("Pied", contenuGo.transform);
            VerticalLayoutGroup vp = piedGo.AddComponent<VerticalLayoutGroup>();
            vp.spacing = Px(8f);
            vp.padding = new RectOffset(PxTrait(1f), PxTrait(1f), PxTrait(9f), PxTrait(15f));
            vp.childControlWidth = true; vp.childControlHeight = true;
            vp.childForceExpandWidth = true; vp.childForceExpandHeight = false;
            AddLayoutElement(piedGo, flexibleHeight: 0);
            piedRoot = piedGo.transform;

            GameObject erreurGo = NouveauUI("Erreur", contenuGo.transform);
            VerticalLayoutGroup ve = erreurGo.AddComponent<VerticalLayoutGroup>();
            ve.childControlWidth = true; ve.childControlHeight = true;
            ve.childForceExpandWidth = true; ve.childForceExpandHeight = false;
            AddLayoutElement(erreurGo, flexibleHeight: 0);
            erreurRoot = erreurGo.transform;
        }

        private Transform tableRoot, piedRoot, erreurRoot, rentreRoot, enCoursRoot, coupRoot;

        /// <summary>La maquette fait vivre le chrome dans une silhouette de Brennar. Le TopBar
        /// partagé reste intact ; cette tranche en prolonge seulement la scène jusqu'au début du
        /// dossier, avec des masses procédurales (aucune donnée de district fabriquée).</summary>
        private void ConstruireSceneHaute(Transform parent, float hauteurSousChrome, float recouvrementSousManometre)
        {
            GameObject scene = NouveauUI("SceneHaute", parent);
            RectTransform rt = (RectTransform)scene.transform;
            rt.anchorMin = new Vector2(0f, 1f);
            rt.anchorMax = new Vector2(1f, 1f);
            rt.pivot = new Vector2(0.5f, 1f);
            rt.offsetMin = new Vector2(0f, -ShellChrome.TopInsetPx - hauteurSousChrome);
            rt.offsetMax = new Vector2(0f, -ShellChrome.TopInsetPx + recouvrementSousManometre);
            Image ciel = AjouterFond(scene, DesignTokens.Current.hudGaugeFaceOuter);   // #090d14 était à 2,45 de ce jeton : une recopie (restauration 24/09)
            ciel.raycastTarget = false;

            float[] debuts = { -0.04f, 0.08f, 0.23f, 0.36f, 0.51f, 0.67f, 0.82f };
            float[] fins =   {  0.12f, 0.27f, 0.41f, 0.56f, 0.72f, 0.87f, 1.04f };
            float[] hauts =  {  0.38f, 0.67f, 0.49f, 0.82f, 0.58f, 0.74f, 0.45f };
            for (int i = 0; i < debuts.Length; i++)
            {
                GameObject masse = NouveauUI("Silhouette_" + i, scene.transform);
                Image encre = AjouterFond(masse, CouleurLocale(i % 2 == 0 ? "#05080d" : "#070a10"));
                encre.raycastTarget = false;
                RectTransform mrt = (RectTransform)masse.transform;
                mrt.anchorMin = new Vector2(debuts[i], 0f);
                mrt.anchorMax = new Vector2(fins[i], hauts[i]);
                mrt.offsetMin = Vector2.zero;
                mrt.offsetMax = Vector2.zero;
                mrt.localRotation = Quaternion.Euler(0f, 0f, i % 2 == 0 ? -3f : 3f);
            }
        }

        /// <summary>Une section verticale vide (hauteur nulle tant qu'elle n'a pas d'enfant).</summary>
        private Transform NouvelleSection(Transform parent, string nom)
        {
            GameObject go = NouveauUI(nom, parent);
            VerticalLayoutGroup v = go.AddComponent<VerticalLayoutGroup>();
            v.spacing = Px(6f);
            v.childControlWidth = true; v.childControlHeight = true;
            v.childForceExpandWidth = true; v.childForceExpandHeight = false;
            AddLayoutElement(go, flexibleHeight: 0);
            return go.transform;
        }
        private TextMeshProUGUI titreTexte, sousTitreTexte;

        private static Color RougeMauvais => DesignTokens.Current.accentDanger;
        /// <summary>Le laiton des gestes et du choix courant — le jeton des écrans voisins du chantier (`ChaineDApproScreenController.Or`),
        /// jamais `accentGold` (jaune CTA #ffd23f, liaisons gardées par `C5F2_AccentGoldBindings` ; D5).</summary>
        private static Color Or => DesignTokens.Current.hudMoneyUnderlineGold;

        /// <summary>Couleurs des résultats du cadre 63, lues directement sur la maquette révisée : `hold` et `advance`
        /// ont leurs encres propres ; `contested` et `breakthrough` réemploient l'or et la braise déjà nommés du canon.
        /// `retreat`, non dessiné dans la maquette, reste sur la braise sémantique plutôt que d'inventer un cinquième ton.</summary>
        private static Color CouleurIssue(string bucket)
        {
            switch (bucket)
            {
                case "contested": return DesignTokens.Current.hudMoneyUnderlineGold;
                case "breakthrough":
                case "retreat": return DesignTokens.Current.hudGaugeArcHot;
                case "hold": return CouleurLocale("#987979");
                case "advance": return CouleurLocale("#7fc99a");
                default: return DesignTokens.Current.onSurfaceSecondary;
            }
        }

        /// <summary>⚠️ EXCEPTION DE PALETTE DÉCLARÉE (restauration du 24/09, règle du dépôt : « aucun littéral à moins de 4 d'un jeton
        /// nommé », garde `LitterauxDeCouleurPlayModeTests`, catégorie Palette). Mesure : `python3 Tools/apparier-litteraux-aux-tokens.py
        /// Assets/Scripts/Operational/Conflit/ConflitScreenController.cs` ⇒ **43 littéraux actifs, 0 à moins de 4 d'un jeton** (48 → 43 :
        /// la seule recopie, `#090d14` à 2,45 de `hudGaugeFaceOuter`, est remplacée par le jeton ; 4 littéraux partent avec la ligne
        /// « Ce qu’on prend » et le « jamais » retirés). Les 43 restants — fiche papier, écussons, table des familles, pied, ciel de la
        /// mise en scène du 23/09 — n'ont AUCUN jeton à moins de 4 : ce sont des arbitrages de palette de la maquette ㉙ (non ratifiée),
        /// à trancher par le juge visuel, jamais par une substitution. Un 44ᵉ littéral, ou un littéral à moins de 4 d'un jeton, se
        /// remplace par le jeton ou se déclare ici avec le nouveau compte.</summary>
        private static Color CouleurLocale(string html)
        {
            ColorUtility.TryParseHtmlString(html, out Color couleur);
            return couleur;
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
        /// <summary>Les 4 clés du domaine `target_rival_key` — CLOS côté back (enum Postgres `rival_key`, `RIVAL_DISPLAY_NAME` à 4
        /// entrées ; le POST répond 404 hors domaine, `engagements.controller.ts:161-163`). Source unique pour la table
        /// (`ConflitScreenController.RendreTable`) et le compte des envois rentrés (`CompterRentres`) — jamais recopiée.</summary>
        public static readonly string[] DomaineFamilles = { "coil", "tarcum", "iron_throat", "saltline" };

        /// <summary>Le nom affiché de chaque famille — clés servies `conflit.bloc.<nom>` (m-65 ; D11 : le nom accompagne la
        /// famille). Hors des 4 ⇒ « type inconnu », comme tout résolveur de SORTE (`Repli`) — jamais la clé brute, jamais
        /// une exception : la couverture du domaine est gardée par un test.</summary>
        public static string NomFamille(string cle)
        {
            switch (cle)
            {
                case "coil": return MafiaCleanCity.I18n.Libelle.De("conflit", "bloc", "La Coil");
                case "tarcum": return MafiaCleanCity.I18n.Libelle.De("conflit", "bloc", "Tarcum");
                case "iron_throat": return MafiaCleanCity.I18n.Libelle.De("conflit", "bloc", "Gorge-de-Fer");
                case "saltline": return MafiaCleanCity.I18n.Libelle.De("conflit", "bloc", "Saltline");
                default: return MafiaCleanCity.I18n.Repli.Type(cle);
            }
        }

        /// <summary>La clé ATTENDUE de l'initiale d'un écusson — forme `ParValeur` (`conflit.initiale.<valeur servie>`), proposée à
        /// l'atelier le 2026-09-24 ; si l'atelier la nomme autrement, c'est ICI qu'on la corrige (une source, lue par la garde
        /// `BundleReel` qui rougit le jour où elle est servie).</summary>
        public static string CleInitiale(string cle) => MafiaCleanCity.I18n.Libelle.CleDe("conflit", "initiale", cle);

        /// <summary>L'initiale de l'écusson d'une famille : VIDE (arbitrage du 2026-09-24). Les médaillons C/T/G/S de la maquette
        /// (cadres 59-61) ne se DÉDUISENT pas du nom servi : « La Coil » donne L en fr, « The Coil » donne T en en (deux T avec
        /// Tarcum), « Iron Throat » donne I. Aucune lettre inventée, aucun appel à `Libelle` (pas de repli compté) tant que la
        /// clé n'est pas servie.
        /// ⇒ Le jour où `CleInitiale(cle)` est servie (la garde `ZeroRepliDesLocataires`, règle 3, rougit) : rendre
        ///   `Libelle.ParValeur("conflit", "initiale", cle, "")`, repli vide, et remplacer le test E9 « écusson vide » par
        ///   « initiale = valeur servie ».</summary>
        /// BRANCHÉ le 2026-09-26 : la pile bfd194bc sert les quatre clés (règle 3 de ZeroRepli rouge au créneau) — l'initiale est la
        /// VALEUR servie, repli VIDE (jamais une lettre déduite du nom) ; hors domaine, vide sans rien demander.
        public static string InitialeFamille(string cle) =>
            System.Array.IndexOf(DomaineFamilles, cle) < 0 ? string.Empty : MafiaCleanCity.I18n.Libelle.ParValeur("conflit", "initiale", cle, "");

        /// <summary>Le sous-titre de chaque famille — maquette ratifiée (cadres 59-61), clés servies `conflit.bloc.*` (balayage 34 de
        /// l'atelier : classe « servi »). Hors des 4 ⇒ « type inconnu », comme `NomFamille`.</summary>
        public static string SousTitreFamille(string cle)
        {
            switch (cle)
            {
                case "coil": return MafiaCleanCity.I18n.Libelle.Gabarit("conflit.bloc.les_ferrailleurs_de_spine", "la ferraille, à Spine");
                case "tarcum": return MafiaCleanCity.I18n.Libelle.De("conflit", "bloc", "le port, et ce qui y entre");
                case "iron_throat": return MafiaCleanCity.I18n.Libelle.De("conflit", "bloc", "les docks du nord");
                case "saltline": return MafiaCleanCity.I18n.Libelle.De("conflit", "bloc", "la ligne de sel, à l’est");
                default: return MafiaCleanCity.I18n.Repli.Type(cle);
            }
        }

        /// <summary>㉙ — « N fois » : le compte des envois rentrés chez une famille, clé ICU `conflit.bloc.fois_chez_eux` (table 40).
        /// Appelé à partir de 1 seulement (à 0, l'écran dit « on ne les a pas croisés »). Le repli est le MÊME motif ICU,
        /// formaté par `Libelle` comme la valeur servie.</summary>
        public static string FoisChezEux(int n) =>
            MafiaCleanCity.I18n.Libelle.Gabarit("conflit.bloc.fois_chez_eux", "{n, plural, =0 {jamais} one {# fois} other {# fois}}",
                new Dictionary<string, string> { { "n", n.ToString(System.Globalization.CultureInfo.InvariantCulture) } });

        /// <summary>㉙ — le nom de la famille d'un envoi : le nom SERVI (`target_rival_name_i18n`), sinon celui du domaine
        /// (`NomFamille`, « type inconnu » hors des 4).</summary>
        public static string FamilleDe(EngagementDto e) =>
            e == null ? MafiaCleanCity.I18n.Repli.Type(null) : NomServi(e.target_rival_name_i18n) ?? NomFamille(e.target_rival_key);

        /// <summary>㉙ — « Un homme dehors. » / « N hommes dehors. » : clé ICU `conflit.bloc.hommes_dehors` (table 40), D15 (le
        /// nombre vient de la liste). Appelé à partir de 1.</summary>
        public static string HommesDehors(int n) =>
            MafiaCleanCity.I18n.Libelle.Gabarit("conflit.bloc.hommes_dehors", "{n, plural, one {Une personne dehors.} other {# personnes dehors.}}",
                new Dictionary<string, string> { { "n", n.ToString(System.Globalization.CultureInfo.InvariantCulture) } });

        /// <summary>㉙ — « Coup n°N » (`conflit.bloc.coup_n_n`, table 40) depuis `strike_index` SERVI. null tant qu'il est absent
        /// (0) : aucun rang dérivé de l'ordre de la liste (arbitrage du 23/09). Branché à l'écran en L3bis.</summary>
        public static string CoupN(int strikeIndex) =>
            strikeIndex < 1 ? null : MafiaCleanCity.I18n.Libelle.Gabarit("conflit.bloc.coup_n_n", "Coup n°{n}",
                new Dictionary<string, string> { { "n", strikeIndex.ToString(System.Globalization.CultureInfo.InvariantCulture) } });

        /// <summary>㉙ — les 5 axes que vise un envoi (`target_holding_id`) : `erosion_register_id` du back (`conflict_rival.ts:29`,
        /// validé par `engagements.controller.ts:176-183`), dans cet ordre. Source unique pour les choix du panneau.</summary>
        public static readonly string[] Axes = { "muscle", "finance", "intel", "infrastructure", "leadership" };

        /// <summary>㉙ — le mot d'un axe CHOISI (sa valeur, pas une référence servie) : la même clé `conflit.axe.<valeur>`.</summary>
        public static string AxeDeValeur(string axe) =>
            string.IsNullOrEmpty(axe) ? null : Axe(new AxeI18nDto { key = "conflit.axe." + axe });

        /// <summary>㉙ — le dernier envoi RENTRÉ chez `famille` : le premier `resolved` de la liste (servie du plus récent au plus
        /// ancien par minute de jeu), ou null.</summary>
        public static EngagementDto DerniereRentreeChez(EngagementDto[] engagements, string famille)
        {
            if (engagements == null || string.IsNullOrEmpty(famille)) return null;
            foreach (EngagementDto e in engagements)
                if (e != null && e.status == "resolved" && e.target_rival_key == famille) return e;
            return null;
        }

        /// <summary>㉙ — « La dernière fois là-bas : {issue}, et la ville a chauffé {chaleur}. » (`conflit.bloc.derniere_fois_chez_eux`,
        /// addendum à la 40, 24897b48), {issue} en forme de milieu de phrase (`IssueEnPhrase`), {chaleur} = `Chaleur`. null si l'envoi
        /// manque, si l'issue est nulle (pas encore rentré, règle de l'atelier) ou si la chaleur est nulle (la phrase l'exige :
        /// aucun mot deviné).</summary>
        public static string LaDerniereFoisChezEux(EngagementDto e)
        {
            if (e == null) return null;
            string issue = IssueEnPhrase(e.outcome_bucket), chaleur = Chaleur(e.heat_increment_bucket);
            if (issue == null || chaleur == null) return null;
            return MafiaCleanCity.I18n.Libelle.Gabarit("conflit.bloc.derniere_fois_chez_eux", "La dernière fois là-bas\u00A0: {issue}, et la ville a chauffé {chaleur}.",
                new Dictionary<string, string> { { "issue", issue }, { "chaleur", chaleur } });
        }

        /// <summary>㉙ — l'issue au MILIEU d'une phrase (`conflit.issue_phrase.<valeur>`, addendum à la 40 : « la casse est un mot »).
        /// Même contrat que `Issue` : null ⇒ null ; hors domaine ⇒ « état inconnu ».</summary>
        public static string IssueEnPhrase(string bucket)
        {
            switch (bucket)
            {
                case "retreat":      return MafiaCleanCity.I18n.Libelle.ParValeur("conflit", "issue_phrase", bucket, "on a reculé");
                case "hold":         return MafiaCleanCity.I18n.Libelle.ParValeur("conflit", "issue_phrase", bucket, "rien obtenu");
                case "contested":    return MafiaCleanCity.I18n.Libelle.ParValeur("conflit", "issue_phrase", bucket, "ça s’est disputé");
                case "advance":      return MafiaCleanCity.I18n.Libelle.ParValeur("conflit", "issue_phrase", bucket, "du terrain gagné");
                case "breakthrough": return MafiaCleanCity.I18n.Libelle.ParValeur("conflit", "issue_phrase", bucket, "une percée");
                default: return string.IsNullOrEmpty(bucket) ? null : MafiaCleanCity.I18n.Repli.Etat(bucket);
            }
        }

        /// <summary>㉙ — la classe d'un refus du POST, lue sur le statut ET le code du corps (`payload.error.code`) :
        ///   · `reseau` : aucune réponse (http 0), OU `IDEMPOTENCY_REQUEST_IN_FLIGHT` (409 : le même envoi est encore en vol) — on ne
        ///     sait pas s'il est parti ; l'essai suivant réémet la MÊME clé ;
        ///   · `muscle` : 409 `MUSCLE_LIEUTENANT_REQUIRED` ;
        ///   · `introuvable` : 404 (lieutenant pas au joueur, famille hors domaine, famille sans état — le back ne les distingue pas) ;
        ///   · `mal_forme` : 422 ;
        ///   · `autre` : tout le reste (401, 5xx, 409 `IDEMPOTENCY_KEY_CONFLICT`…) — AUCUN mot écrit : le joueur n'en lit rien.</summary>
        public static string ClasserRefusDEnvoi(long http, string codeApi)
        {
            if (http == 0 || codeApi == "IDEMPOTENCY_REQUEST_IN_FLIGHT") return "reseau";
            if (http == 409 && codeApi == "MUSCLE_LIEUTENANT_REQUIRED") return "muscle";
            if (http == 404) return "introuvable";
            if (http == 422) return "mal_forme";
            return "autre";
        }

        /// <summary>㉙ — LE MOT d'un refus du POST (addendum à la 40, 24897b48), ou null (aucun refus, ou classe `autre` : pas de mot écrit).
        /// Le 409 garde sa clé RATIFIÉE et servie (`error.engagements.muscle_lieutenant_required`) : la valeur servie s'affiche.</summary>
        public static string MotDuRefusDEnvoi(string classe)
        {
            switch (classe)
            {
                case "muscle":      return MafiaCleanCity.I18n.Libelle.Gabarit("error.engagements.muscle_lieutenant_required",
                                        "Seul un lieutenant du genre Gros bras peut partir sur ce coup. Envoyez-en un, ou recrutez-en un.");
                case "introuvable": return MafiaCleanCity.I18n.Libelle.Gabarit("conflit.refus.ce_coup_ne_tient_plus_reprenez_depuis_la_liste",
                                        "Ce coup ne tient plus. Reprenez depuis la liste.");
                case "mal_forme":   return MafiaCleanCity.I18n.Libelle.Gabarit("conflit.refus.l_ordre_n_est_pas_parti_il_etait_mal_forme_reessayez",
                                        "L’ordre n’est pas parti\u00A0: il était mal formé. Réessayez.");
                case "reseau":      return MafiaCleanCity.I18n.Libelle.Gabarit(
                                        "conflit.refus.la_ligne_a_coupe_on_ne_sait_pas_si_l_ordre_est_parti_reessayez_il_ne_partira_pas_deux_fois",
                                        "La ligne a coupé\u00A0: on ne sait pas si l’ordre est parti. Réessayez, il ne partira pas deux fois.");
                default: return null;
            }
        }

        /// <summary>㉙ — l'issue d'un envoi (`outcome_bucket`), mots de l'atelier table 40 (997d6ab4) ; clé tirée de la VALEUR
        /// servie (`conflit.issue.<valeur>`). Domaine `COMBAT_OUTCOME_BUCKETS` (5). ⚠️ null (envoi `scheduled`, pas encore
        /// rentré) ⇒ null : l'appelant n'écrit PAS la ligne. Présente hors domaine ⇒ « état inconnu », jamais la valeur brute.</summary>
        public static string Issue(string bucket)
        {
            switch (bucket)
            {
                case "retreat":      return MafiaCleanCity.I18n.Libelle.ParValeur("conflit", "issue", bucket, "On a reculé");
                case "hold":         return MafiaCleanCity.I18n.Libelle.ParValeur("conflit", "issue", bucket, "Rien obtenu");
                case "contested":    return MafiaCleanCity.I18n.Libelle.ParValeur("conflit", "issue", bucket, "Disputé");
                case "advance":      return MafiaCleanCity.I18n.Libelle.ParValeur("conflit", "issue", bucket, "Terrain gagné");
                case "breakthrough": return MafiaCleanCity.I18n.Libelle.ParValeur("conflit", "issue", bucket, "Percée");
                default: return string.IsNullOrEmpty(bucket) ? null : MafiaCleanCity.I18n.Repli.Etat(bucket);
            }
        }

        /// <summary>㉙ — ce que l'envoi a coûté (`friction_consumed_bucket`, `FrictionBand` : low · medium · high), table 40,
        /// clé `conflit.cout.<valeur>`. Même contrat que `Issue` : null ⇒ null (pas de ligne « ça nous a coûté »).</summary>
        public static string Cout(string bucket)
        {
            switch (bucket)
            {
                case "low":    return MafiaCleanCity.I18n.Libelle.ParValeur("conflit", "cout", bucket, "un peu");
                case "medium": return MafiaCleanCity.I18n.Libelle.ParValeur("conflit", "cout", bucket, "pas mal");
                case "high":   return MafiaCleanCity.I18n.Libelle.ParValeur("conflit", "cout", bucket, "beaucoup");
                default: return string.IsNullOrEmpty(bucket) ? null : MafiaCleanCity.I18n.Repli.Etat(bucket);
            }
        }

        /// <summary>㉙ — ce que l'envoi a fait chauffer (`heat_increment_bucket`), table 40, clé `conflit.chaleur.<valeur>`.
        /// Le back ne produit que `medium` aujourd'hui ; les mots couvrent low · medium · high. null ⇒ null (pas de ligne
        /// « la ville a chauffé », ni de suite « , et la ville a chauffé »).</summary>
        public static string Chaleur(string bucket)
        {
            switch (bucket)
            {
                case "low":    return MafiaCleanCity.I18n.Libelle.ParValeur("conflit", "chaleur", bucket, "un peu");
                case "medium": return MafiaCleanCity.I18n.Libelle.ParValeur("conflit", "chaleur", bucket, "pas mal");
                case "high":   return MafiaCleanCity.I18n.Libelle.ParValeur("conflit", "chaleur", bucket, "beaucoup");
                default: return string.IsNullOrEmpty(bucket) ? null : MafiaCleanCity.I18n.Repli.Etat(bucket);
            }
        }

        /// <summary>㉙ — le nom SERVI de la famille visée (`target_rival_name_i18n`, gabarit `{nom}`). null si la référence
        /// manque (JsonUtility : `key` vide) ou si le back sert sa sentinelle hors domaine `unknown_<clé>` — une valeur
        /// machine ne s'affiche jamais.</summary>
        public static string NomServi(RivalNomI18nDto nom)
        {
            if (nom == null || string.IsNullOrEmpty(nom.key)) return null;
            string brut = nom.@params != null ? nom.@params.nom : null;
            if (string.IsNullOrWhiteSpace(brut) || brut.StartsWith("unknown_", System.StringComparison.Ordinal)) return null;
            string rendu = MafiaCleanCity.I18n.Libelle.Gabarit(nom.key, "{nom}",
                new System.Collections.Generic.Dictionary<string, string> { { "nom", brut } });
            return string.IsNullOrWhiteSpace(rendu) ? null : rendu;
        }

        /// <summary>㉙ — l'axe visé (`target_axis_i18n`), mots de la table 40 (`conflit.axe.*`). null si aucun axe n'est
        /// servi (champ absent tant que le back ne le sert pas, ou `null` : envoi sans axe) — l'appelant n'écrit rien, aucun
        /// axe deviné. Clé servie hors des 5 ⇒ « type inconnu », jamais la clé brute.</summary>
        public static string Axe(AxeI18nDto axe)
        {
            if (axe == null || string.IsNullOrEmpty(axe.key)) return null;
            switch (axe.key)
            {
                case "conflit.axe.muscle":         return MafiaCleanCity.I18n.Libelle.Gabarit(axe.key, "leurs gros bras");
                case "conflit.axe.finance":        return MafiaCleanCity.I18n.Libelle.Gabarit(axe.key, "leur argent");
                case "conflit.axe.intel":          return MafiaCleanCity.I18n.Libelle.Gabarit(axe.key, "leurs informateurs");
                case "conflit.axe.infrastructure": return MafiaCleanCity.I18n.Libelle.Gabarit(axe.key, "leurs installations");
                case "conflit.axe.leadership":     return MafiaCleanCity.I18n.Libelle.Gabarit(axe.key, "leur tête");
                default: return MafiaCleanCity.I18n.Repli.Type(axe.key);
            }
        }

        /// <summary>㉙ — le nom du lieutenant envoyé (`lieutenant.name`). null si le back sert `lieutenant: null` (lieutenant
        /// disparu) ou ne le sert pas encore : le nom s'OMET, sans mot de repli (arbitrage de l'orchestrateur, 23/09).</summary>
        public static string NomDuLieutenant(EngagementLieutenantDto lieutenant) =>
            lieutenant == null || string.IsNullOrWhiteSpace(lieutenant.name) ? null : lieutenant.name;
    }
}
