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

        // ---- le coup de ce soir (cadres 59-61) : trois choix, AUCUN présélectionné (arbitrage du 23/09) ----------------------
        /// <summary>La famille choisie (`target_rival_key`), ou null.</summary>
        public string ChoixFamille { get; private set; }
        /// <summary>Le lieutenant choisi (`lieutenant_id`, un gros bras seulement), ou null.</summary>
        public string ChoixLieutenant { get; private set; }
        /// <summary>L'axe choisi (`target_holding_id`, un des 5), ou null.</summary>
        public string ChoixAxe { get; private set; }
        /// <summary>« L’envoyer ce soir » n'est actif que si la famille, l'homme et l'axe sont choisis.</summary>
        public bool EnvoiPossible => ChoixFamille != null && ChoixLieutenant != null && ChoixAxe != null;

        public void ChoisirFamille(string cle)
        {
            if (System.Array.IndexOf(ConflitResolvers.DomaineFamilles, cle) < 0) return;
            ChoixFamille = cle;
            AppliquerEtat();
        }

        public void ChoisirLieutenant(string lieutenantId)
        {
            bool gros = false;
            foreach (LieutenantRowDto l in Muscles(DernierChargementLieutenants?.lieutenants)) if (l.lieutenant_id == lieutenantId) gros = true;
            if (!gros) return;   // seuls les gros bras sont choisissables (arbitrage du 23/09)
            ChoixLieutenant = lieutenantId;
            AppliquerEtat();
        }

        public void ChoisirAxe(string axe)
        {
            if (System.Array.IndexOf(ConflitResolvers.Axes, axe) < 0) return;
            ChoixAxe = axe;
            AppliquerEtat();
        }

        /// <summary>« En envoyer un autre » (cadres 62-63) : les choix repartent de zéro — sauf la famille quand `memeFamille`
        /// (« même famille, autre cible », cadre 63).</summary>
        public void EnEnvoyerUnAutre(string memeFamille)
        {
            ChoixFamille = System.Array.IndexOf(ConflitResolvers.DomaineFamilles, memeFamille) >= 0 ? memeFamille : null;
            ChoixAxe = null;
            ChoixLieutenant = null;
            AppliquerEtat();
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
                DerniereErreur = erreur;   // crochet de test ; les mots du refus attendent la table (L4)
                RendreMessageErreur();
                yield break;
            }
            DernierEnvoiOk = true;
            DerniereErreur = null;
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
            titreTexte.text = Libelle.De("conflit", "titre", "Le conflit");
            sousTitreTexte.text = Libelle.De("conflit", "sous_titre",
                "Ce que vos hommes rapportent des familles rivales, et qui vous reste pour y retourner.");
            TrackText(titreTexte.text);
            TrackText(sousTitreTexte.text);
        }

        /// <summary>Cadre 63 — « Ce qui est rentré » : le DERNIER envoi rentré (le premier `resolved` de la liste, servie du plus
        /// récent au plus ancien par minute de jeu), son issue, ce qu'il a coûté et ce qu'il a fait chauffer. Rien si aucun
        /// envoi n'est rentré. Chaque ligne à valeur null est OMISE (aucun mot deviné). Le nom du lieutenant s'affiche s'il est
        /// servi ; sinon la ligne commence par la famille. L'historique « Depuis le début, chez … » (Coup n°N) attend
        /// `strike_index` (L3bis) ; « Y retourner » est un geste à route (L4).</summary>
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
                    "Ce que chaque homme a rapporté, et ce que ça nous a coûté."));
            EtiquetteDeSection(rentreRoot, "IlEstRentre", Libelle.Gabarit("conflit.bloc.il_est_rentre", "Il est rentré"));
            LigneDEnvoi(rentreRoot, "Rentre_" + dernier.engagement_id, dernier,
                Libelle.Gabarit("conflit.bloc.etait_chez_famille", "était chez {famille}",
                    new Dictionary<string, string> { { "famille", ConflitResolvers.FamilleDe(dernier) } }),
                ConflitResolvers.Issue(dernier.outcome_bucket));

            string cout = ConflitResolvers.Cout(dernier.friction_consumed_bucket);
            if (cout != null)
                LigneDeMesure(rentreRoot, "Cout", Libelle.Gabarit("conflit.bloc.ca_nous_a_coute", "ça nous a coûté"), cout);
            string chaleur = ConflitResolvers.Chaleur(dernier.heat_increment_bucket);
            if (chaleur != null)
                LigneDeMesure(rentreRoot, "Chaleur", Libelle.Gabarit("conflit.bloc.la_ville_a_chauffe", "la ville a chauffé"), chaleur);

            // Cadre 63 : la réplique (sans orateur : le nom est sur la ligne au-dessus, arbitrage du 23/09) et « Y retourner »,
            // dont les mots sont ceux de la 40 : « En envoyer un autre » · « même famille, autre cible ».
            if (muscleLieutenants.Count == 0) return;
            Replique(rentreRoot, "RepliqueRentre", Libelle.Gabarit("conflit.bloc.voila_ce_que_ca_a_donne_a_vous_de_dire_si_on_y_retourne", "«\u00A0Voilà ce que ça a donné. À vous de dire si on y retourne.\u00A0»"));
            string famille = dernier.target_rival_key;
            BoutonGeste(rentreRoot, "YRetourner", Libelle.Gabarit("conflit.bloc.en_envoyer_un_autre", "En envoyer un autre"),
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
                    "Les hommes qu’on a envoyés et qui ne sont pas encore rentrés."));

            EtiquetteDeSection(enCoursRoot, "Partis",
                Libelle.Gabarit("conflit.bloc.partis_pas_encore_rentres", "Partis, pas encore rentrés"));
            string plusLeRappeler = Libelle.Gabarit("conflit.bloc.on_ne_peut_plus_le_rappeler", "on ne peut plus le rappeler");
            foreach (EngagementDto e in partis)
                LigneDEnvoi(enCoursRoot, "Parti_" + e.engagement_id, e,
                    Libelle.Gabarit("conflit.bloc.parti_chez_famille", "parti chez {famille}",
                        new Dictionary<string, string> { { "famille", ConflitResolvers.FamilleDe(e) } }),
                    plusLeRappeler);

            if (rentres.Count > 0)
            {
                EtiquetteDeSection(enCoursRoot, "DejaRentres", Libelle.Gabarit("conflit.bloc.deja_rentres", "Déjà rentrés"));
                foreach (EngagementDto e in rentres)
                    LigneDEnvoi(enCoursRoot, "DejaRentre_" + e.engagement_id, e,
                        Libelle.Gabarit("conflit.bloc.etait_chez_famille", "était chez {famille}",
                            new Dictionary<string, string> { { "famille", ConflitResolvers.FamilleDe(e) } }),
                        ConflitResolvers.Issue(e.outcome_bucket));
            }

            TextMeshProUGUI dehors = NouveauTexteFiche(enCoursRoot, "HommesDehors",
                ConflitResolvers.HommesDehors(partis.Count) + " " +
                Libelle.Gabarit("conflit.bloc.on_ne_les_rappelle_pas_on_saura_demain_matin",
                    "On ne les rappelle pas — on saura demain matin."),
                8f, DesignTokens.Current.onSurfaceSecondary, false);
            dehors.enableWordWrapping = true;
            TrackText(dehors.text);

            if (muscleLieutenants.Count > 0)
                BoutonGeste(enCoursRoot, "EnEnvoyerUnAutre", Libelle.Gabarit("conflit.bloc.en_envoyer_un_autre", "En envoyer un autre"),
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
            TrackText(e.text);
        }

        /// <summary>Une ligne d'envoi (cadres 62-63) : à gauche le nom du lieutenant (s'il est servi) en gras et le lieu en
        /// italique, à droite l'issue ou « on ne peut plus le rappeler ». `droite` null ⇒ rien à droite.</summary>
        private void LigneDEnvoi(Transform parent, string nomLigne, EngagementDto e, string lieu, string droite)
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
                TextMeshProUGUI nom = NouveauTexteFiche(gauche.transform, "Lieutenant", lieutenant, 10f,
                    DesignTokens.Current.onSurfacePrimary, true);
                TrackText(nom.text);
            }
            TextMeshProUGUI ou = NouveauTexteFiche(gauche.transform, "Lieu", lieu, 8f, DesignTokens.Current.onSurfaceMuted, false);
            ou.fontStyle = FontStyles.Italic;
            TrackText(ou.text);

            if (droite == null) return;
            TextMeshProUGUI d = NouveauTexteFiche(ligne.transform, "Droite", droite, 8.5f, DesignTokens.Current.onSurfaceSecondary, false);
            d.alignment = TextAlignmentOptions.Right;
            d.enableWordWrapping = true;
            AddLayoutElement(d.gameObject, preferredWidth: Px(90f));
            TrackText(d.text);
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
                DesignTokens.Current.onSurfaceSecondary, false);
            label.characterSpacing = 4f;
            TrackText(label.text);

            TextMeshProUGUI note = NouveauTexteFiche(tableRoot, "TableNote",
                Libelle.De("conflit", "bloc",
                    "Dessinées, pas renseignées : personne ne vous dit ce qu'elles préparent ni ce qu'elles possèdent — on frappe à l'aveugle."),
                7.5f, DesignTokens.Current.onSurfaceMuted, false);
            note.enableWordWrapping = true;
            TrackText(note.text);

            if (indisponible)
            {
                TextMeshProUGUI err = NouveauTexteFiche(tableRoot, "VendettaIndisponible",
                    Libelle.De("conflit", "bloc",
                        "Le compte des envois précédents n'a pas répondu."),
                    7.5f, RougeMauvais, false);
                err.enableWordWrapping = true;
                TrackText(err.text);
            }

            Dictionary<string, int> compte = CompterRentres(engagements);

            foreach (string cle in ConflitResolvers.DomaineFamilles)
            {
                GameObject ligne = NouveauUI("Famille_" + cle, tableRoot);
                Image fondLigne = AjouterFond(ligne, cle == ChoixFamille ? DesignTokens.Current.surfaceRaised : DesignTokens.Current.surfaceRow);
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
                hl.padding = new RectOffset(PxTrait(10f), PxTrait(10f), PxTrait(6f), PxTrait(6f));
                hl.spacing = Px(8f);
                hl.childControlWidth = true; hl.childControlHeight = true;
                hl.childForceExpandWidth = false; hl.childForceExpandHeight = false;
                hl.childAlignment = TextAnchor.MiddleLeft;
                AddLayoutElement(ligne, flexibleHeight: 0);

                // Pâle : `onSurfaceDim`, jamais `onSurfacePrimary` — la couleur PORTE l'absence de
                // donnée (aucune route ne dit ce qu'elles préparent), pas seulement la note ci-dessus.
                GameObject identite = NouveauUI("Identite", ligne.transform);
                VerticalLayoutGroup vi = identite.AddComponent<VerticalLayoutGroup>();
                vi.childControlWidth = true; vi.childControlHeight = true;
                vi.childForceExpandWidth = true; vi.childForceExpandHeight = false;
                AddLayoutElement(identite, flexibleWidth: 1);

                TextMeshProUGUI nom = NouveauTexteFiche(identite.transform, "Nom",
                    ConflitResolvers.NomFamille(cle), 10.5f, DesignTokens.Current.onSurfaceDim, true);
                TrackText(nom.text);

                // Sous-titre de la maquette ratifiée (cadres 59-61), clé SERVIE (balayage 34 : classe « servi »).
                TextMeshProUGUI sousTitre = NouveauTexteFiche(identite.transform, "SousTitre",
                    ConflitResolvers.SousTitreFamille(cle), 7.5f, DesignTokens.Current.onSurfaceMuted, false);
                sousTitre.fontStyle = FontStyles.Italic;
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
                    TextMeshProUGUI fois = NouveauTexteFiche(bloc.transform, "Fois", ConflitResolvers.FoisChezEux(n), 9f,
                        DesignTokens.Current.onSurfacePrimary, true);
                    fois.alignment = TextAlignmentOptions.Right;
                    TrackText(fois.text);
                }
                TextMeshProUGUI visites = NouveauTexteFiche(bloc.transform, "Visites",
                    n > 0 ? Libelle.Gabarit("conflit.bloc.on_est_alles_chez_eux", "on est allés chez eux")
                          : Libelle.Gabarit("conflit.bloc.on_ne_les_a_pas_croises", "on ne les a pas croisés"),
                    7.5f, DesignTokens.Current.onSurfaceMuted, false);
                visites.fontStyle = FontStyles.Italic;
                visites.alignment = TextAlignmentOptions.Right;
                TrackText(visites.text);

                if (cle == ChoixFamille)
                {
                    TextMeshProUGUI ceSoir = NouveauTexteFiche(ligne.transform, "CeSoir",
                        Libelle.Gabarit("conflit.bloc.ce_soir", "Ce soir"), 7f, DesignTokens.Current.accentGold, true);
                    ceSoir.characterSpacing = 2f;
                    TrackText(ceSoir.text);
                }
            }
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
        /// {nom} chez {famille}, sur {axe}. » ; quand la famille choisie a un envoi rentré, « La dernière fois chez eux : »
        /// + son issue (+ « , et la ville a chauffé » + la chaleur), rendue TELLE QUELLE, sans point ajouté (l'atelier écrit
        /// une clé de phrase, arbitrage du 23/09). Sans gros bras : les deux phrases servies qui le disent, et rien à choisir.</summary>
        private void RendreCoup(EngagementDto[] engagements)
        {
            ViderEnfants(coupRoot);
            EnTeteDeSection(coupRoot, Libelle.Gabarit("conflit.bloc.le_coup_de_ce_soir", "Le coup de ce soir"),
                Libelle.Gabarit("conflit.bloc.on_choisit_une_famille_on_choisit_un_homme_et_on_l_envoie_on_saura_demain", "On choisit une famille, on choisit un homme, et on l’envoie. On saura demain."));

            if (muscleLieutenants.Count == 0)
            {
                TextMeshProUGUI vide = NouveauTexteFiche(coupRoot, "PiedVide",
                    Libelle.De("conflit", "bloc", "Aucun de vos lieutenants n'est du genre Gros bras."), 9f,
                    DesignTokens.Current.onSurfacePrimary, true);
                vide.enableWordWrapping = true;
                TrackText(vide.text);
                TextMeshProUGUI noteVide = NouveauTexteFiche(coupRoot, "PiedNote",
                    Libelle.De("conflit", "bloc",
                        "C'est lui qui part la nuit. Il vous en manque un — ce n'est pas cassé, " +
                        "vous n'en avez tout simplement pas encore."),
                    8f, DesignTokens.Current.onSurfaceMuted, false);
                noteVide.enableWordWrapping = true;
                TrackText(noteVide.text);
                return;
            }

            // L'homme : une ligne par gros bras, le choisi sur fond surélevé.
            LieutenantRowDto choisi = null;
            foreach (LieutenantRowDto l in muscleLieutenants)
            {
                bool estChoisi = l.lieutenant_id == ChoixLieutenant;
                if (estChoisi) choisi = l;
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
                    a == ChoixAxe ? DesignTokens.Current.accentGold : DesignTokens.Current.onSurfaceSecondary, a == ChoixAxe);
                mot.alignment = TextAlignmentOptions.Center;
                mot.enableWordWrapping = true;
                TrackText(mot.text);
            }

            if (EnvoiPossible && choisi != null)
            {
                TextMeshProUGUI phrase = NouveauTexteFiche(coupRoot, "PhraseDEnvoi",
                    Libelle.Gabarit("conflit.bloc.on_envoie_nom_chez_famille_sur_axe", "On envoie {nom} chez {famille}, sur {axe}.",
                        new Dictionary<string, string>
                        {
                            { "nom", choisi.name },
                            { "famille", ConflitResolvers.NomFamille(ChoixFamille) },
                            { "axe", ConflitResolvers.AxeDeValeur(ChoixAxe) },
                        }),
                    9.5f, DesignTokens.Current.onSurfacePrimary, false);
                phrase.enableWordWrapping = true;
                TrackText(phrase.text);
            }

            EngagementDto derniere = ConflitResolvers.DerniereRentreeChez(engagements, ChoixFamille);
            string issue = derniere != null ? ConflitResolvers.Issue(derniere.outcome_bucket) : null;
            if (issue != null)
            {
                string texte = Libelle.Gabarit("conflit.bloc.la_derniere_fois_chez_eux", "La dernière fois chez eux\u00A0:") + " " + issue;
                string chaleur = ConflitResolvers.Chaleur(derniere.heat_increment_bucket);
                if (chaleur != null) texte += Libelle.Gabarit("conflit.bloc.et_la_ville_a_chauffe", ", et la ville a chauffé") + " " + chaleur;
                TextMeshProUGUI fois = NouveauTexteFiche(coupRoot, "LaDerniereFois", texte, 8f, DesignTokens.Current.onSurfaceSecondary, false);
                fois.enableWordWrapping = true;
                TrackText(fois.text);
            }
        }

        /// <summary>Sous la table : la réplique de l'homme (v2, sans orateur) et « L’envoyer ce soir », inactif tant que les trois
        /// choix ne sont pas faits. Rien sans gros bras (le panneau le dit déjà).</summary>
        private void RendrePied()
        {
            ViderEnfants(piedRoot);
            if (muscleLieutenants.Count == 0) return;
            Replique(piedRoot, "Replique", Libelle.Gabarit("conflit.bloc.dites_moi_qui_j_envoie_et_sur_quoi_je_pars_ce_soir_on_saura_demain", "«\u00A0Dites-moi seulement chez qui. Je pars ce soir, on saura demain.\u00A0»"));
            BoutonGeste(piedRoot, "LEnvoyerCeSoir", Libelle.Gabarit("conflit.bloc.l_envoyer_ce_soir", "L’envoyer ce soir"),
                Libelle.Gabarit("conflit.bloc.on_ne_pourra_plus_le_rappeler", "on ne pourra plus le rappeler"), EnvoiPossible, EnvoyerLeCoup);
        }

        private void Replique(Transform parent, string nom, string texte)
        {
            TextMeshProUGUI q = NouveauTexteFiche(parent, nom, texte, 9f, DesignTokens.Current.onSurfaceSecondary, false);
            q.fontStyle = FontStyles.Italic;
            q.enableWordWrapping = true;
            TrackText(q.text);
        }

        /// <summary>Un geste à route (cadres 59-63) : le libellé, et sa précision en petit dessous. `actif` faux ⇒ bouton non
        /// interactif et libellé éteint.</summary>
        private void BoutonGeste(Transform parent, string nom, string libelle, string precision, bool actif, UnityEngine.Events.UnityAction geste)
        {
            GameObject bouton = NouveauUI(nom, parent);
            Image fond = AjouterImage(bouton);
            fond.color = actif ? DesignTokens.Current.accentGold : DesignTokens.Current.surfaceRaised;
            fond.raycastTarget = true;
            Button b = bouton.AddComponent<Button>();
            b.targetGraphic = fond;
            b.interactable = actif;
            b.onClick.AddListener(geste);
            VerticalLayoutGroup vb = bouton.AddComponent<VerticalLayoutGroup>();
            vb.padding = new RectOffset(PxTrait(12f), PxTrait(12f), PxTrait(8f), PxTrait(8f));
            vb.childAlignment = TextAnchor.MiddleCenter;
            vb.childControlWidth = true; vb.childControlHeight = true;
            vb.childForceExpandWidth = true; vb.childForceExpandHeight = false;
            AddLayoutElement(bouton, flexibleHeight: 0);
            Color encre = actif ? DesignTokens.Current.surfaceBase : DesignTokens.Current.onSurfaceDisabled;
            TextMeshProUGUI l = NouveauTexteFiche(bouton.transform, "Libelle", libelle, 10f, encre, true);
            l.alignment = TextAlignmentOptions.Center;
            TrackText(l.text);
            TextMeshProUGUI p = NouveauTexteFiche(bouton.transform, "Precision", precision, 7f, encre, false);
            p.alignment = TextAlignmentOptions.Center;
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

            rentreRoot = NouvelleSection(corpsGo.transform, "Rentre");
            enCoursRoot = NouvelleSection(corpsGo.transform, "EnCours");
            coupRoot = NouvelleSection(corpsGo.transform, "Coup");

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

        private Transform tableRoot, piedRoot, erreurRoot, rentreRoot, enCoursRoot, coupRoot;

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
        /// RendreTable`) et le compte des envois rentrés (`CompterRentres`) — jamais recopiée.</summary>
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

        /// <summary>Le sous-titre de chaque famille — maquette ratifiée (cadres 59-61), clés servies `conflit.bloc.*` (balayage 34 de
        /// l'atelier : classe « servi »). Hors des 4 ⇒ « type inconnu », comme `NomFamille`.</summary>
        public static string SousTitreFamille(string cle)
        {
            switch (cle)
            {
                case "coil": return MafiaCleanCity.I18n.Libelle.De("conflit", "bloc", "les ferrailleurs de Spine");
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
            MafiaCleanCity.I18n.Libelle.Gabarit("conflit.bloc.hommes_dehors", "{n, plural, one {Un homme dehors.} other {# hommes dehors.}}",
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
