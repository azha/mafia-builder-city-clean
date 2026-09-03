using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.UI;
using TMPro;
using MafiaCleanCity.Shell;
using MafiaCleanCity.Theme;

namespace MafiaCleanCity.Operational
{
    /// <summary>㉜ « Ce que vous avez confié » — le tableau de service.
    ///
    /// MAQUETTE : `ecrans-brennar-6.html` (300 px CSS de large, `.tel{width:min(300px,88vw)}`),
    /// générateur `atelier/generateur-service.py`, cadres `Tools/juge-visuel/v6/m-73..78.png`.
    /// Six cadres = CINQ états, et l'écran les porte tous les cinq :
    ///   m-73  tableau, rien de confié          m-76  reprendre — l'aperçu en six lignes
    ///   m-74  confier — une plaque visée       m-77  épuisé — le jeton est dépensé
    ///   m-75  tableau, deux charges confiées   m-78  la réserve — huit charges sans surface
    ///
    /// ⛔⛔ CE QUE CET ÉCRAN NE DESSINE PAS, ET POURQUOI. La maquette écrit « depuis 6 jours »
    /// sous chaque charge confiée. **Aucune route de cet écran ne sert l'ancienneté d'une
    /// délégation.** `GET /v1/lieutenants` sert bien un `tenure_bucket`, mais c'est l'ancienneté
    /// DU LIEUTENANT dans la maison — un nombre juste qui répond à une autre question, exactement
    /// la faute d'unités que ce dépôt a déjà payée (un compteur d'étapes de quête comparé à un
    /// seuil d'interactions). L'écran n'affiche donc aucune durée, et met à cette place ce qui EST
    /// servi : `recovery` (« il rattrape encore ») et `recall_scar` (« déjà repris une fois »).
    /// *Un slot de maquette se remplit avec la donnée qui existe, ou il se vide — jamais avec la
    /// donnée voisine qui a la bonne forme.*
    ///
    /// ⛔ ET CE QU'IL AJOUTE À LA MAQUETTE, SUR UNE MESURE. La maquette montre les quatre plaques
    /// toutes identiques (« vous / vous la faites ») et le geste « EN CONFIER UNE » toujours vif.
    /// Or un compte neuf est `NASCENT` sur les quatre, et le serveur refuse alors **toute**
    /// graduation (422, « raw &lt; threshold »). Rendue telle quelle, la maquette donnerait un
    /// bouton qui ne peut RIEN faire, sans dire pourquoi. Le champ `mastery_bucket` est le
    /// prédicat d'éligibilité LUI-MÊME (même fonction des deux côtés, cf. `TaskCategoryRowDto`) :
    /// la sous-ligne de droite d'une plaque tenue par le joueur porte donc son état réel — « pas
    /// encore prête » / « prête à confier » — au lieu du texte constant « vous la faites », et le
    /// geste passe au style ÉTEINT que la maquette possède déjà (m-77) quand aucune ne l'est.
    /// Même emplacement, même géométrie, même palette : seule la source change, d'un littéral
    /// vers une mesure.
    ///
    /// GÉOMÉTRIE — deux règles héritées, non négociables :
    ///  · aucune valeur dérivée de `Screen.*` : tout passe par `EchelleMaquette.Px(...)` contre
    ///    `LargeurEcransBrennar6`, la largeur DÉCLARÉE de CETTE maquette.
    ///  · `Canvas.scaleFactor` lu la frame de la création rend 1,0 — plausible et faux. Toute
    ///    lecture de géométrie attend `yield return null` après la construction.</summary>
    public class DelegationScreenController : MonoBehaviour, IShellTenant
    {
        [Header("Backend")]
        [SerializeField] private string baseUrl = "http://localhost";

        // ═══ Contrat de locataire ════════════════════════════════════════════════════════════

        private Transform mountParent;

        /// <summary>⛔ CE POINT D'INJECTION CONSTRUIT. `Awake()` s'exécute SYNCHRONEMENT DANS
        /// `AddComponent<T>()`, donc AVANT que l'appelant ait posé le parent : la racine n'a pas
        /// encore de largeur et toute la mise en page mesure zéro. La construction se déclenche
        /// quand le parent est CONNU, pas quand l'objet naît.
        ///
        /// ⛔⛔ ET LES DEUX GESTES QUI SUIVENT SONT UN CORRECTIF MESURÉ, PAS UNE PRÉCAUTION.
        /// Le gabarit `Tools/nouvel-ecran.py` faisait construire la racine sous `mountParent`
        /// (= `ContentSlot`) : elle devenait alors un FRÈRE de l'hôte du locataire, et non son
        /// enfant. La garde d'ordre de fratrie de la planche l'a dit au premier montage réel —
        /// « ce_que_vous_avez_confie : frère 18 sur 20 — ce qui se dessine PAR DESSUS : [19]
        /// DelegationRoot graphics=52 ». L'écran était complet (52 Graphic) et se recouvrait
        /// LUI-MÊME : la mesure portait sur l'hôte, le dessin sur la racine, et les deux
        /// n'étaient plus le même objet.
        /// ⇒ Les huit écrans qui passent déjà sous le shell font tous l'inverse, et c'est la
        ///   convention RÉELLE de ce dépôt : la racine vit sous `transform` (l'hôte), l'hôte
        ///   s'étire au conteneur, et l'hôte se met DERNIER. `Shop`/`Settings` portent les mêmes
        ///   trois gestes, avec leur propre mesure à l'appui.
        /// ⚠️ Le défaut vient du GABARIT, donc il attend les 46 écrans qui restent à générer.
        ///   Signalé au chantier ; corrigé ici pour cet écran.</summary>
        public void SetMountParent(Transform parent)
        {
            mountParent = parent;

            // (1) L'hôte remplit son conteneur. Sans ça son rect reste à 100×100 — la taille par
            // défaut d'un RectTransform neuf — et tout ce qu'on bâtit dessous se retrouve dans une
            // boîte de 100 px, sans la moindre erreur console.
            RectTransform rtHote = transform as RectTransform;
            if (rtHote != null)
            {
                rtHote.anchorMin = Vector2.zero;
                rtHote.anchorMax = Vector2.one;
                rtHote.offsetMin = Vector2.zero;
                rtHote.offsetMax = Vector2.zero;
            }

            // (2) Un locataire monté en surimpression doit être le DERNIER enfant, sinon il est
            // rendu SOUS ses frères. Propriété STRUCTURELLE : aucun pixel, aucune résolution.
            transform.SetAsLastSibling();

            EnsureInitialized();
        }

        private string token;
        public void SetToken(string t) => token = t;

        // ═══ Crochets de test ════════════════════════════════════════════════════════════════

        public GetMetaTaskCategoriesResponseDto DernierChargement { get; private set; }
        public GetLieutenantsResponseDto DernierRoster { get; private set; }
        public string DerniereErreur { get; private set; }
        public long DernierCodeErreur { get; private set; }
        public EtatEcran EtatCourant { get; private set; } = EtatEcran.Tableau;

        /// <summary>Le compte de rendus ABOUTIS — incrémenté à la toute fin d'`AppliquerEtat`,
        /// jamais à l'arrivée d'un champ.
        /// ⛔ C'est le prédicat que la planche de captures attend, et sa forme est un correctif
        /// mesuré : guetter l'arrivée d'une donnée est satisfait AU MILIEU de la coroutine, donc
        /// la capture part trop tôt et le test est VERT sur une image vide. Une propriété qui ne
        /// monte qu'après le dernier `Construire…` ne dépend ni du nombre de requêtes ni de leur
        /// ordre, et elle reste juste le jour où cet écran en ajoute une.</summary>
        public int RendusEffectues { get; private set; }

        /// <summary>Le jeton de structure, tel que le SHELL l'a publié après `POST /v1/session/open`.
        /// ⛔ Jamais une supposition, jamais un compteur local : `structural_budget.{used,
        /// cap_reached}` est une clé RÉELLE de la réponse d'ouverture (mesurée le 2026-09-03), et
        /// c'est le shell qui la reçoit. L'écran la lit via `JetonDeStructure` (`ShellContracts`) —
        /// pas via `AppShell` : `Shell` référence `Operational`, donc la lecture inverse serait un
        /// cycle d'assemblies (mesuré, CS0246 sur `StructuralBudgetDto`).
        /// ⚠️ Hors shell (test isolé), `JetonDeStructure.Connu` est faux et l'écran se rend comme
        /// avant que cette information existe. Un test peut forcer l'état par
        /// <see cref="RendrePourTest"/>.</summary>
        public bool JetonDepenseConnu { get; private set; }
        public bool JetonDepense { get; private set; }

        public enum EtatEcran { Tableau, Confier, Reprendre, Reserve }

        // ═══ État interne ════════════════════════════════════════════════════════════════════

        private RectTransform racinePleinEcran;
        private RectTransform corps;
        private RectTransform tete;
        private RectTransform zoneCentrale;
        private RectTransform pied;
        private TextMeshProUGUI titreTete;
        private TextMeshProUGUI sousTitreTete;
        private DelegationClient client;
        private bool initialise;

        /// <summary>La catégorie visée par l'état `Confier` ou `Reprendre` — jamais un index de
        /// tableau : une CLÉ, pour qu'un rechargement qui réordonne la liste ne déplace pas la
        /// cible en silence.</summary>
        private string cleVisee;

        private int candidatIndex;
        private GetMetaRecallPreviewResponseDto apercuCourant;
        private string refusAffiche;

        private float Px(float css) =>
            EchelleMaquette.Px(css, racinePleinEcran, EchelleMaquette.LargeurEcransBrennar6);
        private int PxTrait(float css) =>
            EchelleMaquette.PxTrait(css, racinePleinEcran, EchelleMaquette.LargeurEcransBrennar6);

        // ── Géométrie de la maquette, en px CSS — lue dans `generateur-service.py`, jamais à l'œil.
        private const float CssHauteurCadre  = 462f;  // service(..., H=462)
        private const float CssMargeH        = 13f;   // .sv-tete / .sv-body / .sv-bas padding-x
        private const float CssTetePadHaut   = 11f;   // .sv-tete{padding:11px 13px 9px}
        private const float CssTetePadBas    = 9f;
        private const float CssTeteTitre     = 12f;   // .sv-tete h3  — DejaVu Serif 700
        private const float CssTeteSous      = 7f;    // .sv-tete p
        private const float CssTeteEcart     = 4f;    // .sv-tete p{margin-top:4px}
        private const float CssBodyPadHaut   = 10f;   // .sv-body{padding:10px 13px 0}
        private const float CssTitron        = 6.6f;  // .sv-titron
        private const float CssTitronBas     = 7f;
        private const float CssJetonPadY     = 8f;    // .sv-jeton{padding:8px 10px}
        private const float CssJetonPadX     = 10f;
        private const float CssJetonEcart    = 9f;    // .sv-jeton{gap:9px}
        private const float CssJetonBas      = 10f;   // .sv-jeton{margin-bottom:10px}
        private const float CssJetonRond     = 16f;   // .sv-jeton .rond{width:16px;height:16px}
        private const float CssJetonTitre    = 8.4f;  // .sv-jeton b
        private const float CssJetonSous     = 6.4f;  // .sv-jeton i
        private const float CssPlaquePadY    = 8f;    // .sv-plaque{padding:8px 10px}
        private const float CssPlaquePadX    = 10f;
        private const float CssPlaqueEcart   = 9f;    // .sv-plaque{gap:9px}
        private const float CssPlaqueBas     = 5f;    // .sv-plaque{margin-bottom:5px}
        private const float CssPlaqueHaut    = 36f;   // mesuré sur m-73 (110 px d'image ÷ 3,000)
        private const float CssCroLarg       = 9f;    // .sv-plaque .cro{width:9px;height:20px}
        private const float CssCroHaut       = 20f;
        private const float CssPlaqueTitre   = 9f;    // .sv-plaque .q b — DejaVu Serif 700
        private const float CssPlaqueSous    = 6.4f;  // .sv-plaque .q i
        private const float CssTenuTitre     = 8f;    // .sv-plaque .tenu b
        private const float CssTenuSous      = 6.2f;  // .sv-plaque .tenu i
        private const float CssApercuPadY    = 10f;   // .sv-apercu{padding:10px 11px}
        private const float CssApercuPadX    = 11f;
        private const float CssApercuTitre   = 9f;    // .sv-apercu h4 — Serif 700
        private const float CssApercuTitreBas = 8f;
        private const float CssApercuLignePad = 4.5f; // .sv-apercu .l{padding:4.5px 0}
        private const float CssApercuLibelle = 6.5f;  // .sv-apercu .l u
        private const float CssApercuValeur  = 8.2f;  // .sv-apercu .l b
        private const float CssNoteHaut      = 8f;    // .sv-note{margin-top:8px}
        private const float CssNote          = 6.8f;
        private const float CssBasPadHaut    = 9f;    // .sv-bas{padding:9px 13px 15px}
        private const float CssBasPadBas     = 15f;
        private const float CssDit           = 8.6f;  // .sv-dit
        private const float CssGesteHaut     = 9f;    // .sv-geste{margin-top:9px}
        private const float CssGestePadY     = 9f;    // .sv-geste{padding:9px 11px}
        private const float CssGestePadX     = 11f;
        private const float CssGeste         = 9.5f;
        private const float CssGesteSous     = 6.5f;  // .sv-geste small
        private const float CssRienHaut      = 9f;    // .sv-rien{margin-top:9px}
        private const float CssRienPadY      = 8f;    // .sv-rien{padding:8px 10px}
        private const float CssRienPadX      = 10f;
        private const float CssRien          = 6.9f;
        private const float CssRayonPetit    = 2f;    // .sv-plaque{border-radius:2px}
        private const float CssRayonMoyen    = 3f;    // .sv-jeton/.sv-apercu/.sv-geste{border-radius:3px}
        private const float CssFilet         = 1f;
        private const float CssFiletEpais    = 2f;    // .sv-bas{border-top:2px} / .sv-rien{border-left:2px}

        // ⚠️ PAS d'appel depuis `Awake()` : il court dans `AddComponent`, avant tout parentage.
        // `Start()` est le filet, et `EnsureInitialized` est idempotent : le premier des deux qui
        // arrive gagne. Sans ce filet, un écran monté sans `SetMountParent` ne se construirait
        // JAMAIS — un vert par absence, pas une économie.
        private void Start()
        {
            // ⛔ RÉPÉTÉ ICI, ET CE N'EST PAS UNE REDONDANCE. Le shell ajoute des enfants à
            // `ContentSlot` APRÈS la fenêtre synchrone du montage (mesuré ailleurs dans ce dépôt :
            // « frère 6 sur 11 » restait inchangé quand l'ordre n'était posé qu'au montage).
            // `Start()` court à la frame SUIVANTE : c'est le premier instant où « être dernier »
            // est stable. Les deux écrans qui passent déjà la garde de fratrie portent exactement
            // ces deux appels, au même endroit.
            if (transform.parent != null) transform.SetAsLastSibling();
            EnsureInitialized();
            StartCoroutine(Amorcer());
        }

        /// <summary>⛔ L'ÉCRAN SE CHARGE LUI-MÊME AU MONTAGE, ET C'EST OBLIGATOIRE. Le contrat
        /// `IShellTenant` ne porte que `SetMountParent` et `SetToken` : le shell monte le
        /// locataire et lui passe un jeton, **il n'appelle jamais `Charger`**. Sans cette amorce
        /// l'écran se construit et reste vide — charpente complète, tous les textes issus des
        /// données absents. C'est un défaut mesuré sur l'écran voisin, et il avait traversé huit
        /// tours de juge sans être vu : *un test qui déclenche lui-même ce qu'il vérifie ne
        /// prouve rien du déclencheur.*
        ///
        /// Monté hors session (tout test PlayMode isolé), le jeton est vide : on ne tente aucune
        /// requête et l'écran reste sur sa charpente — l'état d'avant que cette amorce existe.</summary>
        private IEnumerator Amorcer()
        {
            if (string.IsNullOrEmpty(token)) yield break;
            yield return Charger();
        }

        private void EnsureInitialized()
        {
            if (initialise) return;
            initialise = true;
            client = new DelegationClient { BaseUrl = baseUrl };
            BuildLayout();
        }

        // ═══ Chargement ══════════════════════════════════════════════════════════════════════

        /// <summary>Deux routes, l'une après l'autre et non en parallèle : la seconde n'existe que
        /// pour donner un NOM à ce que la première rend en UUID. Un roster manquant n'empêche donc
        /// pas l'écran de se rendre — il le rend seulement moins bavard, ce que le repli nommé de
        /// `NomDuLieutenant` dit explicitement.</summary>
        public IEnumerator Charger()
        {
            EnsureInitialized();
            DerniereErreur = null;
            DernierCodeErreur = 0;
            refusAffiche = null;

            LireJetonDepuisLeShell();

            yield return client.GetMetaTaskCategories(token,
                dto => DernierChargement = dto,
                refus => { DernierCodeErreur = refus.statut; DerniereErreur = refus.message; });

            if (DernierChargement != null)
            {
                yield return client.GetLieutenants(token,
                    dto => DernierRoster = dto,
                    // Un roster indisponible n'est PAS une erreur d'écran : on le consigne sans
                    // écraser un éventuel succès de la route principale, et le rendu continue.
                    refus => Debug.LogWarning($"[㉜] roster indisponible : {refus.message}"));
            }

            // La frame de création rend des rects non résolus : on attend le layout AVANT de
            // rendre quoi que ce soit qui lise une géométrie.
            yield return null;

            if (DernierChargement == null) { RendreEtatIndisponible(); yield break; }
            AppliquerEtat(DernierChargement);
        }

        /// <summary>Le jeton vient du shell, qui l'a reçu à l'ouverture de session. On ne rouvre
        /// PAS de session ici : une seconde ouverture consommerait de l'idempotence et pourrait
        /// rendre un budget différent de celui que le reste du shell affiche — deux vérités pour
        /// un même jeton, sur les trois écrans qui le partagent.</summary>
        private void LireJetonDepuisLeShell()
        {
            if (!JetonDeStructure.Connu) return;
            JetonDepenseConnu = true;
            JetonDepense = JetonDeStructure.PlafondAtteint;
        }

        /// <summary>Rend un corps FABRIQUÉ, sans réseau — réservé aux tests. Ne prouve jamais que
        /// le back émet ce corps, seulement ce que l'écran EN FAIT.</summary>
        /// <param name="jetonDepense">`null` = « personne n'a mesuré » (l'état hors shell, où
        /// l'écran se rend comme avant que ce champ existe) ; `true`/`false` = l'état publié.
        /// ⛔ Les deux se distinguent : replier « non connu » sur « dépensé » éteindrait tous les
        /// gestes de tout écran monté hors shell.</param>
        public void RendrePourTest(GetMetaTaskCategoriesResponseDto dto,
                                   GetLieutenantsResponseDto roster = null,
                                   bool? jetonDepense = null)
        {
            EnsureInitialized();
            DernierChargement = dto;
            DernierRoster = roster;
            JetonDepenseConnu = jetonDepense.HasValue;
            JetonDepense = jetonDepense.GetValueOrDefault();
            AppliquerEtat(dto);
        }

        /// <summary>Change d'état sans réseau (les quatre cadres de la planche sont des vues du
        /// MÊME corps déjà chargé — sauf l'aperçu de reprise, qui a sa propre route).</summary>
        public void AllerA(EtatEcran etat, string cleCategorie = null)
        {
            EtatCourant = etat;
            cleVisee = cleCategorie ?? cleVisee;
            refusAffiche = null;
            if (DernierChargement != null) AppliquerEtat(DernierChargement);
        }

        // ═══ Rendu ═══════════════════════════════════════════════════════════════════════════

        private void AppliquerEtat(GetMetaTaskCategoriesResponseDto dto)
        {
            if (dto == null) { RendreEtatIndisponible(); return; }

            Vider(zoneCentrale);
            Vider(pied);

            TaskCategoryRowDto[] rangs = dto.task_categories ?? new TaskCategoryRowDto[0];
            int confiees = 0;
            foreach (TaskCategoryRowDto r in rangs)
                if (r != null && r.delegation_state != "SELF") confiees++;

            switch (EtatCourant)
            {
                case EtatEcran.Tableau:   RendreTableau(rangs, confiees); break;
                case EtatEcran.Confier:   RendreConfier(rangs); break;
                case EtatEcran.Reprendre: RendreReprendre(rangs); break;
                case EtatEcran.Reserve:   RendreReserve(); break;
                default:
                    // Un état neuf doit être BRUYANT : un repli silencieux rendrait un écran vide
                    // qui ressemble à un écran qui charge.
                    throw new System.ArgumentOutOfRangeException(nameof(EtatCourant), EtatCourant,
                        "DelegationScreenController : état d'écran non résolu.");
            }

            // ⛔ ICI, ET NULLE PART AVANT. Placé plus haut, ce compteur dirait « rendu » d'un
            // écran dont les blocs ne sont pas encore construits — et la capture qui l'attend
            // photographierait le chrome du shell sur un cadre vide.
            RendusEffectues++;
        }

        // ── m-73 / m-75 / m-77 — le tableau, et sa variante « déjà tranché » ──────────────────

        private void RendreTableau(TaskCategoryRowDto[] rangs, int confiees)
        {
            bool jetonDispo = JetonDisponible;

            if (!jetonDispo)
            {
                // m-77 : le titre change AVANT tout le reste — c'est lui qui explique le gris.
                EcrireTete("Vous avez déjà tranché aujourd'hui",
                           "On ne redessine pas la maison deux fois dans la même journée.");
            }
            else if (confiees > 0)
            {
                // m-75 : le titre SUIT l'état réel du tableau (generateur-service.py:107-110).
                EcrireTete("Ce que vous avez confié",
                           string.Format("{0} charge{1} tenue{1} par quelqu'un d'autre. Vous pouvez les reprendre, à un prix.",
                                         confiees, confiees > 1 ? "s" : ""));
            }
            else
            {
                // m-73
                EcrireTete("Ce que vous tenez encore vous-même",
                           "Quatre choses. Chacune peut être confiée — et reprise, à un prix.");
            }

            ConstruireJeton(zoneCentrale, jetonDispo);
            foreach (TaskCategoryRowDto r in rangs) ConstruirePlaqueDeCharge(zoneCentrale, r, false);

            // ⚠️ AJOUT ASSUMÉ À LA PLANCHE : la porte vers m-78. Le cadre de la réserve existe et
            // n'a aucun chemin joueur dans la maquette — huit charges déclarées côté serveur que
            // personne ne peut voir. Une ligne de titron, à la place exacte qu'occupe un titron
            // dans m-78, l'ouvre. Consigné plutôt que passé sous silence.
            ConstruireTitronCliquable(zoneCentrale, "CE QUI N'EST PAS ENCORE À CONFIER  ▸",
                                      () => AllerA(EtatEcran.Reserve));

            if (!jetonDispo)
            {
                EcrireDit(pied, "Vous avez déjà confié une charge ", "ce matin", ".");
                ConstruireGeste(pied, "EN CONFIER UNE", "plus de décision aujourd'hui", true, null);
                ConstruireRien(pied, "Une seule décision de structure par journée", ", confier et reprendre "
                    + "comprises. Ce n'est pas une limite d'énergie : c'est pour qu'une maison ne se redessine "
                    + "pas entièrement en un après-midi.");
                return;
            }

            EcrireDit(pied, "Tant que vous tenez tout, ", "rien ne se fait sans vous",
                      " — et rien ne se fait pendant que vous dormez.");

            TaskCategoryRowDto prete = PremierePrete(rangs);
            if (prete != null)
            {
                ConstruireGeste(pied, "EN CONFIER UNE", "vous ne la ferez plus vous-même", false,
                                () => AllerA(EtatEcran.Confier, prete.category_key));
            }
            else
            {
                // Le style ÉTEINT existe déjà dans la planche (m-77) : on le réemploie pour un
                // refus DIFFÉRENT, et on écrit lequel — un bouton gris sans raison est pire qu'un
                // bouton absent.
                ConstruireGeste(pied, "EN CONFIER UNE", "aucune n'est encore prête", true, null);
            }

            if (refusAffiche != null) ConstruireRien(pied, "Le serveur a refusé", " : " + refusAffiche);
        }

        // ── m-74 — confier ───────────────────────────────────────────────────────────────────

        private void RendreConfier(TaskCategoryRowDto[] rangs)
        {
            EcrireTete("Confier une de vos charges",
                       "Vous ne la ferez plus. Quelqu'un d'autre la fera, à sa façon.");

            ConstruireJeton(zoneCentrale, JetonDisponible);
            foreach (TaskCategoryRowDto r in rangs) ConstruirePlaqueDeCharge(zoneCentrale, r, true);

            LieutenantRowDto candidat = CandidatCourant();
            TaskCategoryRowDto visee = Trouver(rangs, cleVisee);

            if (candidat == null)
            {
                // Le kit de départ en donne deux ; zéro reste possible et se dit.
                EcrireDit(pied, "", "Personne à qui la confier", " — la maison n'a aucun lieutenant.");
                ConstruireGeste(pied, "LA LUI CONFIER", "aucun candidat", true, null);
                return;
            }

            // La réplique de la maquette est de Salvatore ; le NOM vient du roster réel, jamais
            // d'un personnage écrit en dur. Toucher la réplique fait défiler les candidats — c'est
            // le seul choix de lieutenant que la planche laisse la place d'exprimer.
            string nomCharge = visee != null ? LibelleDeCharge(visee.category_key).ToLowerInvariant() : "cette charge";
            EcrireDit(pied, "", candidat.name + " :",
                      " « Donnez-moi " + nomCharge + ". Je m'en occupe, et vous ne verrez plus passer "
                      + "les commandes. »   ▸ un autre",
                      () => { candidatIndex++; AppliquerEtat(DernierChargement); });

            bool possible = visee != null && EstPrete(visee) && JetonDisponible;
            ConstruireGeste(pied, "LA LUI CONFIER",
                            possible ? "c'est votre décision du jour" : RaisonDuRefus(visee),
                            !possible,
                            possible ? (System.Action)(() => StartCoroutine(Confier(visee, candidat))) : null);

            if (refusAffiche != null) ConstruireRien(pied, "Le serveur a refusé", " : " + refusAffiche);
        }

        // ── m-76 — reprendre ─────────────────────────────────────────────────────────────────

        private void RendreReprendre(TaskCategoryRowDto[] rangs)
        {
            TaskCategoryRowDto visee = Trouver(rangs, cleVisee);
            string nom = visee != null ? LibelleDeCharge(visee.category_key) : "cette charge";
            EcrireTete("Reprendre " + nom.ToLowerInvariant(),
                       "Voilà ce que ça coûterait. On vous le dit avant, pas après.");

            if (visee != null) ConstruirePlaqueDeCharge(zoneCentrale, visee, false);

            if (apercuCourant != null) ConstruireApercu(zoneCentrale, apercuCourant);
            else ConstruireNote(zoneCentrale, refusAffiche != null
                ? "Le serveur ne peut pas dire ce que ça coûterait : " + refusAffiche
                : "On demande au serveur ce que ça coûterait…");

            ConstruireNote(zoneCentrale,
                "Ceci est un avertissement, pas un mur : le jeu vous laissera le faire.");

            EcrireDit(pied, "", NomDuLieutenant(visee) + " :",
                      " « Vous pouvez la reprendre. Il ne le prendra pas bien, et ce qu'il savait faire, "
                      + "vous devrez le réapprendre. »");

            bool possible = visee != null && visee.delegation_state != "SELF" && JetonDisponible;
            ConstruireGeste(pied, "LA REPRENDRE QUAND MÊME",
                            possible ? "c'est votre décision du jour" : "plus de décision aujourd'hui",
                            !possible,
                            possible ? (System.Action)(() => StartCoroutine(Reprendre(visee))) : null);
        }

        // ── m-78 — la réserve ────────────────────────────────────────────────────────────────

        private void RendreReserve()
        {
            EcrireTete("Ce qui n'est pas encore à confier",
                       "Huit autres charges existent dans le jeu. Aucune n'est branchée.");

            ConstruireTitronCliquable(zoneCentrale, "◂  EXISTENT, MAIS PERSONNE N'Y TOUCHE",
                                      () => AllerA(EtatEcran.Tableau));

            // ⛔ CES HUIT NE VIENNENT D'AUCUNE ROUTE, ET C'EST MESURÉ, PAS SUPPOSÉ.
            // `taskCategoryProjection` itère `TASK_CATEGORY_CATALOGUE.filter(e => e.live)` — les
            // RESERVED ne sont donc JAMAIS projetées, sur aucun compte. Les afficher exige une
            // copie côté client ; elle est déclarée comme telle dans `DelegationCatalogue`, avec
            // son ancre, et la maquette dit elle-même en toutes lettres que rien n'est derrière.
            // La planche n'en montre que six : on montre les huit, parce que le texte du bas parle
            // de huit et qu'un écran qui se contredit lui-même est pire qu'un écran qui déborde.
            foreach (var r in DelegationCatalogue.Reserve)
                ConstruirePlaqueGrise(zoneCentrale, r.libelle, r.sous);

            EcrireDit(pied, "Huit charges existent dans le jeu et ", "aucune n'est branchée", ".");
            ConstruireRien(pied, "Elles sont déclarées côté serveur mais n'ont aucune surface joueur",
                " — ni pour les confier, ni même pour les voir bouger. Tant que c'est le cas, la "
                + "délégation ne porte que sur quatre choses.");
        }

        private void RendreEtatIndisponible()
        {
            Vider(zoneCentrale);
            Vider(pied);
            EcrireTete("Le tableau de service est indisponible",
                       "On n'a pas pu lire ce que vous tenez. Rien n'a été changé.");
            ConstruireNote(zoneCentrale, DerniereErreur ?? "raison inconnue");
        }

        // ═══ Gestes ══════════════════════════════════════════════════════════════════════════

        private IEnumerator Confier(TaskCategoryRowDto visee, LieutenantRowDto candidat)
        {
            refusAffiche = null;
            int code = DelegationCatalogue.CodePour(visee.category_key);
            yield return client.PostMetaGraduation(token,
                new PostMetaGraduationBody { category_id = code, lieutenant_id = candidat.lieutenant_id },
                _ => { },
                refus => refusAffiche = refus.message);
            yield return Charger();
            if (refusAffiche == null) AllerA(EtatEcran.Tableau);
            else AppliquerEtat(DernierChargement);
        }

        private IEnumerator Reprendre(TaskCategoryRowDto visee)
        {
            refusAffiche = null;
            int code = DelegationCatalogue.CodePour(visee.category_key);
            yield return client.PostMetaRecall(token,
                new PostMetaRecallBody { category_id = code },
                _ => { },
                refus => refusAffiche = refus.message);
            yield return Charger();
            if (refusAffiche == null) AllerA(EtatEcran.Tableau);
            else AppliquerEtat(DernierChargement);
        }

        /// <summary>Ouvre l'aperçu de reprise : c'est la SEULE transition d'état qui appelle le
        /// réseau, parce que les six lignes de m-76 ne sont dans aucun corps déjà chargé.</summary>
        public IEnumerator OuvrirReprise(string cleCategorie)
        {
            cleVisee = cleCategorie;
            apercuCourant = null;
            refusAffiche = null;
            EtatCourant = EtatEcran.Reprendre;
            AppliquerEtat(DernierChargement);

            yield return client.GetMetaRecallPreview(token, DelegationCatalogue.CodePour(cleCategorie),
                dto => apercuCourant = dto,
                refus => refusAffiche = refus.message);

            AppliquerEtat(DernierChargement);
        }

        // ═══ Lectures dérivées — chacune NOMMÉE, aucune ligne de logique dans le rendu ═══════

        /// <summary>⛔ « Pas connu » se rend DISPONIBLE, jamais épuisé. Un écran monté hors shell
        /// n'a aucune raison d'éteindre ses gestes, et le serveur reste le seul juge : s'il refuse,
        /// c'est son 409 qui l'écrit, pas une supposition du client.</summary>
        private bool JetonDisponible => !JetonDepenseConnu || !JetonDepense;

        /// <summary>`mastery_bucket == "ELIGIBLE"` — le prédicat du serveur, pas une approximation :
        /// la garde de `graduation.service.ts:225` évalue la MÊME fonction sur le MÊME score.</summary>
        private static bool EstPrete(TaskCategoryRowDto r) =>
            r != null && r.delegation_state == "SELF" && r.mastery_bucket == "ELIGIBLE";

        private static TaskCategoryRowDto PremierePrete(TaskCategoryRowDto[] rangs)
        {
            foreach (TaskCategoryRowDto r in rangs) if (EstPrete(r)) return r;
            return null;
        }

        private static TaskCategoryRowDto Trouver(TaskCategoryRowDto[] rangs, string cle)
        {
            if (rangs == null || cle == null) return null;
            foreach (TaskCategoryRowDto r in rangs) if (r != null && r.category_key == cle) return r;
            return null;
        }

        private string RaisonDuRefus(TaskCategoryRowDto visee)
        {
            if (!JetonDisponible) return "plus de décision aujourd'hui";
            if (visee == null) return "aucune charge visée";
            if (visee.delegation_state != "SELF") return "déjà confiée";
            return DelegationResolvers.PhraseDeMaitrise(visee.mastery_bucket);
        }

        private LieutenantRowDto CandidatCourant()
        {
            LieutenantRowDto[] l = DernierRoster != null ? DernierRoster.lieutenants : null;
            if (l == null || l.Length == 0) return null;
            return l[((candidatIndex % l.Length) + l.Length) % l.Length];
        }

        /// <summary>Le nom lisible derrière un `delegated_lieutenant_ref`, qui est un UUID.
        /// Repli NOMMÉ (« quelqu'un ») quand le roster ne le contient pas : on n'affiche jamais un
        /// UUID à un joueur, et on n'invente jamais un nom qu'aucune route n'a servi.</summary>
        private string NomDuLieutenant(TaskCategoryRowDto r)
        {
            if (r == null || string.IsNullOrEmpty(r.delegated_lieutenant_ref)) return "Quelqu'un";
            LieutenantRowDto[] l = DernierRoster != null ? DernierRoster.lieutenants : null;
            if (l != null)
                foreach (LieutenantRowDto x in l)
                    if (x != null && x.lieutenant_id == r.delegated_lieutenant_ref) return x.name;
            return "Quelqu'un";
        }

        private static string LibelleDeCharge(string cle) => DelegationCatalogue.LibellePour(cle);

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
            // ⛔ SOUS L'HÔTE, PAS SOUS `mountParent` — voir `SetMountParent`. Monté dans le shell,
            // `transform` EST déjà l'enfant de `ContentSlot` que le shell gouverne : y bâtir garde
            // l'écran d'un seul tenant, mesurable et déplaçable en un geste. Hors shell (test
            // isolé), l'hôte n'est sous aucun canvas : on retombe alors sur le canvas découvert,
            // comportement identique à celui d'avant ce correctif.
            Transform root = mountParent != null ? transform : canvas.transform;

            // La racine PLEIN ÉCRAN — jamais un panneau intermédiaire : c'est elle qui sert de
            // référence d'échelle à `Px()` (un conteneur plus étroit diviserait TOUTE la mise à
            // l'échelle par un facteur muet).
            GameObject racine = NouveauUI("DelegationRoot", root);
            racinePleinEcran = (RectTransform)racine.transform;
            Etirer(racinePleinEcran);
            AjouterFond(racine, DelegationResolvers.FondBas);

            // Le fond de `.serv6` a TROIS arrêts : `linear-gradient(180deg,#1d2229,#161a20 58%,
            // #121519)`. `VerticalGradient` n'en prend que deux, donc on le rend en DEUX bandes
            // qui se rejoignent exactement au genou de 58 % — un seul dégradé de bout en bout
            // aurait déplacé le genou et éclairci tout le tiers bas.
            // ⚠️ Ces couleurs sont OPAQUES : aucune conversion sRGB→linéaire ne s'applique ici
            // (le piège ne concerne que les alphas, où le navigateur mélange en sRGB et Unity en
            // linéaire). Une conversion appliquée à un aplat opaque serait une erreur symétrique.
            AjouterBande(racine, "FondHaut", 0.42f, 1f,
                         ProceduralUI.VerticalGradient(96, DelegationResolvers.FondHaut, DelegationResolvers.FondMilieu));
            AjouterBande(racine, "FondBas", 0f, 0.42f,
                         ProceduralUI.VerticalGradient(96, DelegationResolvers.FondMilieu, DelegationResolvers.FondBas));

            // ⛔ L'ÉCHELLE AVANT TOUT — un RectTransform qui vient d'être étiré n'a PAS encore son
            // `rect` résolu, et `Px()` le lit dès la première constante convertie. Une largeur de
            // canvas de 640 au lieu de 1280 ne ressemble pas à un bug : elle ressemble à un écran
            // sobre. On le DIT plutôt que de le corriger en silence.
            Canvas.ForceUpdateCanvases();
            float largeurLue = racinePleinEcran.rect.width;
            if (largeurLue < EchelleMaquette.LargeurCanvasParDefaut * 0.9f)
            {
                Debug.LogWarning($"[ECHELLE ㉜] racine non résolue : rect.width={largeurLue:F0} < "
                                 + $"{EchelleMaquette.LargeurCanvasParDefaut:F0} attendu. Toutes les "
                                 + "conversions px CSS de cet écran seront proportionnellement fausses.");
            }

            // Le corps vit SOUS le chrome. ⛔ HAUTEUR FIXE de 462 px CSS ancrée en HAUT, et non
            // étirée : la maquette le dit dans sa signature (`service(..., H=462)`), et un cadre
            // étiré verse tout le surplus d'un écran plus haut dans son bloc élastique — sur un
            // écran dont le métier est de dire « il n'y a que quatre choses », un grand vide se
            // met à dire « ça n'a pas fini de charger ».
            GameObject corpsGo = NouveauUI("Corps", racine.transform);
            corps = (RectTransform)corpsGo.transform;
            corps.anchorMin = new Vector2(0f, 1f);
            corps.anchorMax = new Vector2(1f, 1f);
            corps.pivot = new Vector2(0.5f, 1f);
            corps.offsetMin = Vector2.zero;
            corps.offsetMax = Vector2.zero;
            corps.anchoredPosition = new Vector2(0f, -ShellChrome.TopInsetPx);
            corps.sizeDelta = new Vector2(0f, Px(CssHauteurCadre));

            // `.serv6{display:flex;flex-direction:column}` — tête et bas à leur hauteur de
            // contenu, le corps prend le reste. `childForceExpandHeight=false` + un
            // `flexibleHeight=1` sur la seule zone centrale reproduit exactement `flex:1`.
            VerticalLayoutGroup pile = corpsGo.AddComponent<VerticalLayoutGroup>();
            pile.spacing = 0f;
            pile.padding = new RectOffset(0, 0, 0, 0);
            pile.childControlWidth = true;  pile.childControlHeight = true;
            pile.childForceExpandWidth = true; pile.childForceExpandHeight = false;

            tete = ConstruireTete(corpsGo.transform);
            zoneCentrale = ConstruireZoneCentrale(corpsGo.transform);
            pied = ConstruirePied(corpsGo.transform);
        }

        /// <summary>`.sv-tete{flex:none;padding:11px 13px 9px;border-bottom:1px solid #333c46;
        /// background:#1b2027}`.</summary>
        private RectTransform ConstruireTete(Transform parent)
        {
            GameObject go = NouveauUI("Tete", parent);
            AjouterFond(go, DelegationResolvers.TeteFond);
            AjouterFiletBas(go, DelegationResolvers.TeteFilet, CssFilet);

            VerticalLayoutGroup v = go.AddComponent<VerticalLayoutGroup>();
            v.padding = new RectOffset(PxTrait(CssMargeH), PxTrait(CssMargeH),
                                       PxTrait(CssTetePadHaut), PxTrait(CssTetePadBas));
            v.spacing = Px(CssTeteEcart);
            v.childControlWidth = true;  v.childControlHeight = true;
            v.childForceExpandWidth = true; v.childForceExpandHeight = false;

            titreTete = NouveauTexte(go.transform, "Titre", "", Px(CssTeteTitre),
                                     DelegationResolvers.TitreVif, DesignTokens.Current.hudSerifFont);
            titreTete.fontStyle = FontStyles.Bold;
            titreTete.characterSpacing = 2.5f;   // .sv-tete h3{letter-spacing:.3px} sur 12px
            sousTitreTete = NouveauTexte(go.transform, "SousTitre", "", Px(CssTeteSous),
                                         DelegationResolvers.Muet, DesignTokens.Current.primaryFont);
            return (RectTransform)go.transform;
        }

        /// <summary>`.sv-body{flex:1;min-height:0;overflow:hidden;padding:10px 13px 0}`.</summary>
        private RectTransform ConstruireZoneCentrale(Transform parent)
        {
            GameObject go = NouveauUI("Corps", parent);
            LayoutElement le = go.AddComponent<LayoutElement>();
            le.flexibleHeight = 1f;   // c'est LUI qui absorbe la hauteur restante — `flex:1`
            le.minHeight = 0f;        // `min-height:0`, sinon un enfant trop grand pousse la tête

            VerticalLayoutGroup v = go.AddComponent<VerticalLayoutGroup>();
            v.padding = new RectOffset(PxTrait(CssMargeH), PxTrait(CssMargeH), PxTrait(CssBodyPadHaut), 0);
            v.spacing = Px(CssPlaqueBas);   // `.sv-plaque{margin-bottom:5px}`
            v.childAlignment = TextAnchor.UpperCenter;
            v.childControlWidth = true;  v.childControlHeight = true;
            v.childForceExpandWidth = true; v.childForceExpandHeight = false;
            return (RectTransform)go.transform;
        }

        /// <summary>`.sv-bas{flex:none;background:#141a21;border-top:2px solid #2c3640;
        /// padding:9px 13px 15px}`.</summary>
        private RectTransform ConstruirePied(Transform parent)
        {
            GameObject go = NouveauUI("Bas", parent);
            AjouterFond(go, DelegationResolvers.BasFond);
            AjouterFiletHaut(go, DelegationResolvers.BasFilet, CssFiletEpais);

            VerticalLayoutGroup v = go.AddComponent<VerticalLayoutGroup>();
            v.padding = new RectOffset(PxTrait(CssMargeH), PxTrait(CssMargeH),
                                       PxTrait(CssBasPadHaut), PxTrait(CssBasPadBas));
            v.spacing = Px(CssGesteHaut);
            v.childControlWidth = true;  v.childControlHeight = true;
            v.childForceExpandWidth = true; v.childForceExpandHeight = false;
            return (RectTransform)go.transform;
        }

        // ═══ Les blocs de la planche ═════════════════════════════════════════════════════════

        private void EcrireTete(string titre, string sous)
        {
            if (titreTete != null) titreTete.text = titre;
            if (sousTitreTete != null) sousTitreTete.text = sous;
        }

        /// <summary>`.sv-jeton` — le rond, la phrase, et la précision à droite. Deux styles :
        /// disponible (or sur brun) et dépensé (`.use`, brun éteint sur rouge sombre).</summary>
        private void ConstruireJeton(Transform parent, bool disponible)
        {
            GameObject go = NouveauUI("Jeton", parent);
            AjouterPlaqueArrondie(go, disponible ? DelegationResolvers.JetonFond : DelegationResolvers.JetonFondUse,
                                  disponible ? DelegationResolvers.JetonBord : DelegationResolvers.JetonBordUse,
                                  CssRayonMoyen);

            HorizontalLayoutGroup h = go.AddComponent<HorizontalLayoutGroup>();
            h.padding = new RectOffset(PxTrait(CssJetonPadX), PxTrait(CssJetonPadX),
                                       PxTrait(CssJetonPadY), PxTrait(CssJetonPadY));
            h.spacing = Px(CssJetonEcart);
            h.childAlignment = TextAnchor.MiddleLeft;
            h.childControlWidth = true;  h.childControlHeight = true;
            h.childForceExpandWidth = false; h.childForceExpandHeight = false;

            GameObject rond = NouveauUI("Rond", go.transform);
            Image disque = AjouterImage(rond);
            disque.sprite = ProceduralUI.RadialDisc(32, Color.white, Color.white);
            disque.color = disponible ? DelegationResolvers.Or : DelegationResolvers.JetonRondUse;
            disque.raycastTarget = false;
            LayoutElement leRond = rond.AddComponent<LayoutElement>();
            leRond.preferredWidth = Px(CssJetonRond); leRond.preferredHeight = Px(CssJetonRond);
            leRond.flexibleWidth = 0f;
            GameObject anneau = NouveauUI("Anneau", rond.transform);
            Etirer((RectTransform)anneau.transform);
            Image bord = AjouterImage(anneau);
            bord.sprite = ProceduralUI.Ring(32, 4f, Color.white);
            bord.color = disponible ? DelegationResolvers.OrSombre : DelegationResolvers.JetonBordUse;
            bord.raycastTarget = false;

            TextMeshProUGUI titre = NouveauTexte(go.transform, "Phrase",
                disponible ? "Une décision de structure aujourd'hui" : "Décision déjà prise aujourd'hui",
                Px(CssJetonTitre),
                disponible ? DelegationResolvers.Or : DelegationResolvers.JetonEncreUse,
                DesignTokens.Current.primaryFont);
            titre.fontStyle = FontStyles.Bold;
            titre.GetComponent<LayoutElement>().flexibleWidth = 1f;

            TextMeshProUGUI sous = NouveauTexte(go.transform, "Precision",
                disponible ? "confier ou reprendre — pas les deux" : "la prochaine sera pour demain",
                Px(CssJetonSous), DelegationResolvers.OrMuet, DesignTokens.Current.primaryFont);
            sous.alignment = TextAlignmentOptions.Right;
            // `.sv-jeton i{max-width:52%}` — la contrainte qui fait passer la phrase de gauche à
            // la ligne, et donc la hauteur du jeton. Sans elle, le bloc tient sur une ligne et
            // l'écran ne ressemble plus à la planche.
            LayoutElement leSous = sous.GetComponent<LayoutElement>();
            leSous.flexibleWidth = 0f;
            leSous.preferredWidth = Px(EchelleMaquette.LargeurEcransBrennar6 * 0.52f)
                                    - Px(CssMargeH + CssJetonPadX);

            // `.sv-jeton{margin-bottom:10px}` — l'écart de la pile vaut déjà 5 (celui des
            // plaques) : on ajoute les 5 qui manquent plutôt que de gonfler le bloc lui-même,
            // ce qui aurait agrandi sa boîte peinte.
            Espaceur(parent, CssJetonBas - CssPlaqueBas);
        }

        /// <summary>Une plaque du tableau : filet vertical, nom + sous-titre, et à droite qui la
        /// tient. `viseeActive` allume le liseret `.viser` sur la charge ciblée (m-74).</summary>
        private void ConstruirePlaqueDeCharge(Transform parent, TaskCategoryRowDto r, bool viseeActive)
        {
            if (r == null) return;
            bool confiee = r.delegation_state != "SELF";
            bool visee = viseeActive && r.category_key == cleVisee;

            GameObject go = NouveauUI("Plaque_" + r.category_key, parent);
            Color fond = confiee ? DelegationResolvers.PlaqueConfieeFond : DelegationResolvers.PlaqueFond;
            Color bordure = visee ? DelegationResolvers.OrSombre
                          : confiee ? DelegationResolvers.JetonBord : DelegationResolvers.PlaqueBord;
            AjouterPlaqueArrondie(go, fond, bordure, CssRayonPetit);

            LayoutElement le = go.AddComponent<LayoutElement>();
            le.preferredHeight = Px(CssPlaqueHaut);
            le.minHeight = Px(CssPlaqueHaut);

            HorizontalLayoutGroup h = go.AddComponent<HorizontalLayoutGroup>();
            h.padding = new RectOffset(PxTrait(CssPlaquePadX), PxTrait(CssPlaquePadX),
                                       PxTrait(CssPlaquePadY), PxTrait(CssPlaquePadY));
            h.spacing = Px(CssPlaqueEcart);
            h.childAlignment = TextAnchor.MiddleLeft;
            h.childControlWidth = true;  h.childControlHeight = true;
            h.childForceExpandWidth = false; h.childForceExpandHeight = false;

            GameObject cro = NouveauUI("Cro", go.transform);
            Image croImg = AjouterImage(cro);
            croImg.sprite = ProceduralUI.RoundedRectMask(PxTrait(CssRayonPetit));
            croImg.type = Image.Type.Sliced;
            croImg.color = confiee ? DelegationResolvers.OrSombre : DelegationResolvers.CroLibre;
            croImg.raycastTarget = false;
            LayoutElement leCro = cro.AddComponent<LayoutElement>();
            leCro.preferredWidth = Px(CssCroLarg); leCro.preferredHeight = Px(CssCroHaut);
            leCro.flexibleWidth = 0f; leCro.flexibleHeight = 0f;

            GameObject q = NouveauUI("Q", go.transform);
            VerticalLayoutGroup vq = q.AddComponent<VerticalLayoutGroup>();
            vq.spacing = Px(2f);
            vq.childAlignment = TextAnchor.MiddleLeft;
            vq.childControlWidth = true;  vq.childControlHeight = true;
            vq.childForceExpandWidth = true; vq.childForceExpandHeight = false;
            q.AddComponent<LayoutElement>().flexibleWidth = 1f;
            NouveauTexte(q.transform, "Nom", LibelleDeCharge(r.category_key), Px(CssPlaqueTitre),
                         DelegationResolvers.TitreVif, DesignTokens.Current.hudSerifFont)
                .fontStyle = FontStyles.Bold;
            NouveauTexte(q.transform, "Sous", DelegationCatalogue.SousTitrePour(r.category_key),
                         Px(CssPlaqueSous), DelegationResolvers.Muet, DesignTokens.Current.primaryFont);

            GameObject tenu = NouveauUI("Tenu", go.transform);
            VerticalLayoutGroup vt = tenu.AddComponent<VerticalLayoutGroup>();
            vt.spacing = Px(2f);
            vt.childAlignment = TextAnchor.MiddleRight;
            vt.childControlWidth = true;  vt.childControlHeight = true;
            vt.childForceExpandWidth = true; vt.childForceExpandHeight = false;
            tenu.AddComponent<LayoutElement>().flexibleWidth = 0f;

            TextMeshProUGUI qui = NouveauTexte(tenu.transform, "Qui",
                confiee ? NomDuLieutenant(r) : "vous", Px(CssTenuTitre),
                confiee ? DelegationResolvers.OrPale : DelegationResolvers.Cyan,
                DesignTokens.Current.primaryFont);
            qui.fontStyle = FontStyles.Bold;
            qui.alignment = TextAlignmentOptions.Right;

            // ⛔ ICI VIT LE SEUL ÉCART ASSUMÉ AVEC LA PLANCHE — voir l'en-tête de la classe.
            // La maquette écrit « depuis 6 jours » (confiée) et « vous la faites » (libre) : deux
            // constantes. On y met ce que le corps SERT réellement.
            TextMeshProUGUI etat = NouveauTexte(tenu.transform, "Etat", SousLigneDePlaque(r),
                Px(CssTenuSous), DelegationResolvers.Muet, DesignTokens.Current.primaryFont);
            etat.alignment = TextAlignmentOptions.Right;

            // Une plaque se touche : confiée elle ouvre l'aperçu de reprise (m-76), prête elle
            // ouvre le cadre « confier » (m-74). Une plaque ni l'une ni l'autre reste inerte —
            // un bouton qui ne fait rien apprend au joueur à ne plus appuyer.
            if (confiee) RendreCliquable(go, () => StartCoroutine(OuvrirReprise(r.category_key)));
            else if (EstPrete(r) && JetonDisponible) RendreCliquable(go, () => AllerA(EtatEcran.Confier, r.category_key));
        }

        /// <summary>La sous-ligne de droite, entièrement dérivée du corps servi.</summary>
        private static string SousLigneDePlaque(TaskCategoryRowDto r)
        {
            if (r.delegation_state != "SELF")
            {
                if (r.recovery) return "il rattrape encore";
                if (r.recall_scar) return "repris une fois déjà";
                return "il la tient";
            }
            if (r.recall_scar) return "vous l'avez reprise";
            if (r.recovery) return "vous rattrapez encore";
            return DelegationResolvers.PhraseDeMaitrise(r.mastery_bucket);
        }

        /// <summary>`.sv-plaque.gris{opacity:.5}` — une charge de la réserve : pas de tenant, pas
        /// de geste, et le texte le dit.</summary>
        private void ConstruirePlaqueGrise(Transform parent, string libelle, string sous)
        {
            GameObject go = NouveauUI("Reserve_" + libelle, parent);
            AjouterPlaqueArrondie(go, DelegationResolvers.PlaqueFondGrise,
                                  DelegationResolvers.PlaqueBordGrise, CssRayonPetit);
            LayoutElement le = go.AddComponent<LayoutElement>();
            le.preferredHeight = Px(CssPlaqueHaut); le.minHeight = Px(CssPlaqueHaut);

            HorizontalLayoutGroup h = go.AddComponent<HorizontalLayoutGroup>();
            h.padding = new RectOffset(PxTrait(CssPlaquePadX), PxTrait(CssPlaquePadX),
                                       PxTrait(CssPlaquePadY), PxTrait(CssPlaquePadY));
            h.spacing = Px(CssPlaqueEcart);
            h.childAlignment = TextAnchor.MiddleLeft;
            h.childControlWidth = true;  h.childControlHeight = true;
            h.childForceExpandWidth = false; h.childForceExpandHeight = false;

            GameObject cro = NouveauUI("Cro", go.transform);
            Image croImg = AjouterImage(cro);
            croImg.sprite = ProceduralUI.RoundedRectMask(PxTrait(CssRayonPetit));
            croImg.type = Image.Type.Sliced;
            croImg.color = DelegationResolvers.CroGris;
            croImg.raycastTarget = false;
            LayoutElement leCro = cro.AddComponent<LayoutElement>();
            leCro.preferredWidth = Px(CssCroLarg); leCro.preferredHeight = Px(CssCroHaut);
            leCro.flexibleWidth = 0f; leCro.flexibleHeight = 0f;

            GameObject q = NouveauUI("Q", go.transform);
            VerticalLayoutGroup vq = q.AddComponent<VerticalLayoutGroup>();
            vq.spacing = Px(2f);
            vq.childAlignment = TextAnchor.MiddleLeft;
            vq.childControlWidth = true; vq.childControlHeight = true;
            vq.childForceExpandWidth = true; vq.childForceExpandHeight = false;
            q.AddComponent<LayoutElement>().flexibleWidth = 1f;
            NouveauTexte(q.transform, "Nom", libelle, Px(CssPlaqueTitre),
                         DelegationResolvers.TitreEteint, DesignTokens.Current.hudSerifFont)
                .fontStyle = FontStyles.Bold;
            NouveauTexte(q.transform, "Sous", sous, Px(CssPlaqueSous),
                         DelegationResolvers.MuetEteint, DesignTokens.Current.primaryFont);

            GameObject tenu = NouveauUI("Tenu", go.transform);
            VerticalLayoutGroup vt = tenu.AddComponent<VerticalLayoutGroup>();
            vt.spacing = Px(2f);
            vt.childAlignment = TextAnchor.MiddleRight;
            vt.childControlWidth = true; vt.childControlHeight = true;
            vt.childForceExpandWidth = true; vt.childForceExpandHeight = false;
            tenu.AddComponent<LayoutElement>().flexibleWidth = 0f;
            TextMeshProUGUI tiret = NouveauTexte(tenu.transform, "Tiret", "—", Px(CssTenuTitre),
                                                 DelegationResolvers.OrMuet, DesignTokens.Current.primaryFont);
            tiret.alignment = TextAlignmentOptions.Right;
            TextMeshProUGUI rien = NouveauTexte(tenu.transform, "Rien", "rien derrière", Px(CssTenuSous),
                                                DelegationResolvers.MuetEteint, DesignTokens.Current.primaryFont);
            rien.alignment = TextAlignmentOptions.Right;
        }

        /// <summary>`.sv-apercu` — les six lignes de l'aperçu de reprise, dans l'ordre exact de
        /// la maquette. Chaque libellé est fixe ; chaque valeur vient d'un champ du corps.</summary>
        private void ConstruireApercu(Transform parent, GetMetaRecallPreviewResponseDto p)
        {
            GameObject go = NouveauUI("Apercu", parent);
            AjouterPlaqueArrondie(go, DelegationResolvers.ApercuFond,
                                  DelegationResolvers.ApercuBord, CssRayonMoyen);
            VerticalLayoutGroup v = go.AddComponent<VerticalLayoutGroup>();
            v.padding = new RectOffset(PxTrait(CssApercuPadX), PxTrait(CssApercuPadX),
                                       PxTrait(CssApercuPadY), PxTrait(CssApercuPadY));
            v.spacing = 0f;
            v.childControlWidth = true;  v.childControlHeight = true;
            v.childForceExpandWidth = true; v.childForceExpandHeight = false;

            TextMeshProUGUI h4 = NouveauTexte(go.transform, "Titre", "Si vous reprenez maintenant",
                Px(CssApercuTitre), DelegationResolvers.TitreVif, DesignTokens.Current.hudSerifFont);
            h4.fontStyle = FontStyles.Bold;
            h4.margin = new Vector4(0f, 0f, 0f, Px(CssApercuTitreBas));

            LigneApercu(go.transform, "CE QU'IL A APPRIS",
                        DelegationResolvers.PhraseDeChute(p.drop_bucket),
                        DelegationResolvers.CouleurDeChute(p.drop_bucket));
            LigneApercu(go.transform, "POUR TOUT REGAGNER",
                        DelegationResolvers.PhraseDeRecuperation(p.recovery_bucket),
                        DelegationResolvers.TexteVif);
            LigneApercu(go.transform, "CE QU'ON LUI DOIT",
                        DelegationResolvers.PhraseDIndemnite(p.severance_bucket),
                        DelegationResolvers.CouleurDIndemnite(p.severance_bucket));
            LigneApercu(go.transform, "IL VOUS EN VEUT",
                        "pendant " + DelegationResolvers.PhraseDeFenetre(p.window_days_band),
                        DelegationResolvers.TexteVif);
            // ⚠️ Ces deux lignes sont CONDITIONNELLES dans la maquette (`if successeur` / `if
            // penalite`) : absentes, elles ne laissent pas de ligne vide. Une ligne « — » à leur
            // place ferait croire à une valeur nulle là où il n'y a pas de sujet.
            if (!string.IsNullOrEmpty(p.suspended_successor_key))
                LigneApercu(go.transform, "CELUI QU'IL FORMAIT", "s'arrête aussi", DelegationResolvers.Rouge);
            if (p.re_delegation_penalty)
                LigneApercu(go.transform, "SI VOUS RECONFIEZ PLUS TARD", "ça coûtera plus", DelegationResolvers.Rouge);
        }

        /// <summary>`.sv-apercu .l{display:flex;justify-content:space-between;padding:4.5px 0;
        /// border-top:1px dotted #3b4650}` — le filet du HAUT, sauf sur la première.</summary>
        private void LigneApercu(Transform parent, string libelle, string valeur, Color couleur)
        {
            GameObject go = NouveauUI("Ligne_" + libelle, parent);
            if (parent.childCount > 2) AjouterFiletHaut(go, DelegationResolvers.ApercuBord, CssFilet);
            HorizontalLayoutGroup h = go.AddComponent<HorizontalLayoutGroup>();
            h.padding = new RectOffset(0, 0, PxTrait(CssApercuLignePad), PxTrait(CssApercuLignePad));
            h.spacing = Px(CssJetonEcart);
            h.childAlignment = TextAnchor.MiddleLeft;
            h.childControlWidth = true;  h.childControlHeight = true;
            h.childForceExpandWidth = false; h.childForceExpandHeight = false;

            TextMeshProUGUI u = NouveauTexte(go.transform, "Libelle", libelle, Px(CssApercuLibelle),
                                             DelegationResolvers.Muet, DesignTokens.Current.primaryFont);
            u.characterSpacing = 13f;   // .l u{letter-spacing:.9px} sur 6,5px
            u.GetComponent<LayoutElement>().flexibleWidth = 1f;

            TextMeshProUGUI b = NouveauTexte(go.transform, "Valeur", valeur, Px(CssApercuValeur),
                                             couleur, DesignTokens.Current.primaryFont);
            b.fontStyle = FontStyles.Bold;
            b.alignment = TextAlignmentOptions.Right;
            b.GetComponent<LayoutElement>().flexibleWidth = 0f;
        }

        private void ConstruireNote(Transform parent, string texte)
        {
            TextMeshProUGUI t = NouveauTexte(parent, "Note", texte, Px(CssNote),
                                             DelegationResolvers.NoteEncre, DesignTokens.Current.hudSerifFont);
            t.fontStyle = FontStyles.Italic;
            t.margin = new Vector4(0f, Px(CssNoteHaut), 0f, 0f);
        }

        private void ConstruireTitronCliquable(Transform parent, string texte, System.Action action)
        {
            GameObject go = NouveauUI("Titron", parent);
            VerticalLayoutGroup v = go.AddComponent<VerticalLayoutGroup>();
            v.padding = new RectOffset(0, 0, PxTrait(CssTitronBas), PxTrait(CssTitronBas));
            v.childControlWidth = true; v.childControlHeight = true;
            v.childForceExpandWidth = true; v.childForceExpandHeight = false;
            TextMeshProUGUI t = NouveauTexte(go.transform, "Texte", texte, Px(CssTitron),
                                             DelegationResolvers.Titron, DesignTokens.Current.primaryFont);
            t.characterSpacing = 22f;   // .sv-titron{letter-spacing:1.5px} sur 6,6px
            t.fontStyle = FontStyles.Bold;
            RendreCliquable(go, action);
        }

        /// <summary>`.sv-dit` — la phrase du bas, italique serif, avec sa portion en gras droit.
        /// Un `action` non nul la rend touchable (le défilement des candidats de m-74).</summary>
        private void EcrireDit(Transform parent, string avant, string gras, string apres,
                               System.Action action = null)
        {
            GameObject go = NouveauUI("Dit", parent);
            VerticalLayoutGroup v = go.AddComponent<VerticalLayoutGroup>();
            v.childControlWidth = true; v.childControlHeight = true;
            v.childForceExpandWidth = true; v.childForceExpandHeight = false;
            // ⛔ LE GRAS DE CETTE PHRASE EST DROIT, PAS ITALIQUE : `.sv-dit b{font-style:normal}`
            // — le seul endroit de l'écran où le gras SORT de l'italique au lieu de s'y ajouter.
            // Poser `fontStyle = Italic` sur le TMP entier puis `<b>` par-dessus donnerait un
            // gras ITALIQUE : on met donc l'italique en balises, sur les deux morceaux qui la
            // portent, et le champ reste Normal.
            TextMeshProUGUI t = NouveauTexte(go.transform, "Texte",
                (string.IsNullOrEmpty(avant) ? "" : "<i>" + avant + "</i>")
                + "<b>" + gras + "</b>"
                + (string.IsNullOrEmpty(apres) ? "" : "<i>" + apres + "</i>"),
                Px(CssDit), DelegationResolvers.DitEncre, DesignTokens.Current.hudSerifFont);
            t.fontStyle = FontStyles.Normal;
            if (action != null) RendreCliquable(go, action);
        }

        /// <summary>`.sv-geste` — le grand bouton d'action, et son style `.mort`.</summary>
        private void ConstruireGeste(Transform parent, string libelle, string precision,
                                     bool mort, System.Action action)
        {
            GameObject go = NouveauUI("Geste", parent);
            AjouterPlaqueArrondie(go,
                mort ? DelegationResolvers.JetonFondUse : DelegationResolvers.JetonFond,
                mort ? DelegationResolvers.JetonBordUse : DelegationResolvers.JetonBord, CssRayonMoyen);

            HorizontalLayoutGroup h = go.AddComponent<HorizontalLayoutGroup>();
            h.padding = new RectOffset(PxTrait(CssGestePadX), PxTrait(CssGestePadX),
                                       PxTrait(CssGestePadY), PxTrait(CssGestePadY));
            h.spacing = Px(8f);
            h.childAlignment = TextAnchor.MiddleLeft;
            h.childControlWidth = true;  h.childControlHeight = true;
            h.childForceExpandWidth = false; h.childForceExpandHeight = false;

            TextMeshProUGUI t = NouveauTexte(go.transform, "Libelle", libelle, Px(CssGeste),
                mort ? DelegationResolvers.JetonEncreUse : DelegationResolvers.Or,
                DesignTokens.Current.primaryFont);
            t.fontStyle = FontStyles.Bold;
            t.characterSpacing = 7f;    // .sv-geste{letter-spacing:.7px} sur 9,5px
            t.GetComponent<LayoutElement>().flexibleWidth = 1f;

            TextMeshProUGUI s = NouveauTexte(go.transform, "Precision", precision, Px(CssGesteSous),
                mort ? DelegationResolvers.GesteMortSous : DelegationResolvers.OrMuet,
                DesignTokens.Current.primaryFont);
            s.alignment = TextAlignmentOptions.Right;
            s.GetComponent<LayoutElement>().flexibleWidth = 0f;

            // ⛔ Un geste MORT ne reçoit AUCUN gestionnaire — pas un gestionnaire qui ne fait
            // rien. Une zone qui absorbe le toucher sans effet est indiscernable d'une panne.
            if (!mort && action != null) RendreCliquable(go, action);
        }

        /// <summary>`.sv-rien` — le pavé explicatif à filet gauche.</summary>
        private void ConstruireRien(Transform parent, string gras, string reste)
        {
            GameObject go = NouveauUI("Rien", parent);
            AjouterFiletGauche(go, DelegationResolvers.ApercuBord, CssFiletEpais);
            VerticalLayoutGroup v = go.AddComponent<VerticalLayoutGroup>();
            v.padding = new RectOffset(PxTrait(CssRienPadX), PxTrait(CssRienPadX),
                                       PxTrait(CssRienPadY), PxTrait(CssRienPadY));
            v.childControlWidth = true; v.childControlHeight = true;
            v.childForceExpandWidth = true; v.childForceExpandHeight = false;
            NouveauTexte(go.transform, "Texte", "<b>" + gras + "</b>" + reste, Px(CssRien),
                         DelegationResolvers.Muet, DesignTokens.Current.primaryFont);
        }

        // ═══ Primitives — dupliquées par convention (mesuré : aucun fichier du dépôt ne les
        // partage) ════════════════════════════════════════════════════════════════════════════

        /// <summary>⛔ DÉ-PARENTER AVANT `Destroy`, ET C'EST LE CORRECTIF, PAS UN DÉTAIL.
        /// `Destroy` est DIFFÉRÉ à la fin de la frame : un `Vider` suivi d'une reconstruction
        /// immédiate laisse les anciens enfants DANS le groupe de mise en page le temps d'une
        /// frame — le layout les compte, la pile déborde, et une capture prise à cet instant
        /// montre l'écran doublé. `SetParent(null)` les sort du calcul TOUT DE SUITE ; `Destroy`
        /// ne fait plus que libérer la mémoire.</summary>
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

        /// <summary>⛔ TOUTE Image passe par ici. `AddComponent<T>()` à l'exécution n'honore PAS
        /// le `[RequireComponent(CanvasRenderer)]` d'une classe de base — sans `CanvasRenderer`,
        /// un `Graphic` ne dessine RIEN, sans la moindre erreur console (mesuré sur ce dépôt :
        /// deux panneaux jamais visibles pendant des semaines).</summary>
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

        /// <summary>Un bloc peint : fond arrondi + liseret d'un pixel, le couple que `.sv-jeton`,
        /// `.sv-plaque`, `.sv-apercu` et `.sv-geste` emploient tous les quatre.</summary>
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

        /// <summary>Rend un bloc touchable. La cible de rayon est une image TRANSPARENTE dédiée,
        /// jamais le fond peint : les fonds de cet écran sont posés avec `raycastTarget = false`
        /// (sinon le premier fond plein écran avalerait tous les touchers de la page).</summary>
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

    /// <summary>㉜ — la copie CLIENT du catalogue de catégories. **C'est un pis-aller, et il est
    /// déclaré comme tel.**
    ///
    /// ⛔ POURQUOI IL EXISTE. `GET /v1/meta/task-categories` sert `category_key` (une chaîne) ;
    /// les trois routes d'action exigent `category_id` (un entier) — mesuré, un envoi de la clé
    /// rend 422. La correspondance clé→code n'est servie par AUCUNE route : elle vit dans
    /// `services/game-back/src/meta_progression/task-category-catalogue.ts` (codes lus le
    /// 2026-09-03 : 1, 2, 4, 5 pour les LIVE — noter que **3 manque**, il appartient à
    /// `LEK_CONTEST`, en réserve). Sans cette table, l'écran peut TOUT afficher et ne peut RIEN
    /// faire.
    /// ⇒ Dette **TD-530** : ajouter `category_id` à la projection (un champ additif, la valeur est
    /// déjà l'index de la boucle qui construit la réponse), puis SUPPRIMER cette table.
    /// ⚠️ Le jour où le back ajoute une 5ᵉ catégorie LIVE, cette table ne la connaîtra pas et
    /// `CodePour` jettera — bruyamment, et c'est voulu : un repli silencieux enverrait un code
    /// faux, donc déléguerait la MAUVAISE charge. Le test de classe
    /// `Toutes_les_categories_servies_ont_un_code` est le détecteur : il compare la table aux
    /// clés que la route rend VRAIMENT.
    ///
    /// Les libellés et sous-titres, eux, viennent de la maquette (`generateur-service.py`,
    /// `CAT` et `RESERVE`) : ce sont des textes d'écran, aucune route n'en sert.</summary>
    public static class DelegationCatalogue
    {
        public struct Charge
        {
            public string cle;
            public int code;
            public string libelle;
            public string sous;
        }

        /// <summary>Les 4 LIVE — clé, code, et les textes de la planche.</summary>
        public static readonly Charge[] Live =
        {
            new Charge { cle = "ROUTE_ASSIGNMENT",  code = 1, libelle = "Les tournées",          sous = "qui livre quoi, et par où" },
            new Charge { cle = "LIEUTENANT_HIRING", code = 2, libelle = "L'embauche",            sous = "qui entre dans la maison" },
            new Charge { cle = "SUPPLY_SOURCING",   code = 4, libelle = "L'approvisionnement",   sous = "ce qu'on commande, et à qui" },
            new Charge { cle = "HEAT_MANAGEMENT",   code = 5, libelle = "La chaleur",            sous = "ce qu'on fait quand la ville s'échauffe" },
        };

        /// <summary>Les 8 RESERVED. Elles ne sont projetées par AUCUNE route (la projection filtre
        /// sur `live`), donc elles ne peuvent venir que d'ici. La planche n'en dessine que six ;
        /// la huitième y est même un bouche-trou (« Le huitième, réservé, sans surface ») — on lui
        /// rend son vrai sujet, `HEAT_POSTURE_DOCTRINE`, plutôt que de recopier un placeholder
        /// dans un écran que le joueur va lire.</summary>
        public static readonly Charge[] Reserve =
        {
            new Charge { cle = "LEK_CONTEST",             code = 3,   libelle = "Le Lek",                       sous = "les contestations de coin" },
            new Charge { cle = "CASH_LAUNDERING",         code = 6,   libelle = "Le blanchiment",               sous = "faire rentrer l'argent" },
            new Charge { cle = "NODE_RETOOLING",          code = 7,   libelle = "Le réoutillage",               sous = "changer ce que produit un site" },
            new Charge { cle = "ROUTE_NETWORK_TOPOLOGY",  code = 101, libelle = "La topologie du réseau",       sous = "redessiner les routes" },
            new Charge { cle = "DELEGATION_ARCHITECTURE", code = 102, libelle = "L'architecture de délégation", sous = "déléguer la délégation elle-même" },
            new Charge { cle = "LEK_NETWORK_DESIGN",      code = 103, libelle = "Le dessin du réseau Lek",      sous = "où poser les coins" },
            new Charge { cle = "SUPPLY_WEB_DESIGN",       code = 104, libelle = "La toile d'appro",             sous = "plusieurs fournisseurs à la fois" },
            new Charge { cle = "HEAT_POSTURE_DOCTRINE",   code = 105, libelle = "La doctrine de chaleur",       sous = "la posture, pas le geste du jour" },
        };

        public static int CodePour(string cle)
        {
            foreach (Charge c in Live) if (c.cle == cle) return c.code;
            foreach (Charge c in Reserve) if (c.cle == cle) return c.code;
            throw new System.ArgumentOutOfRangeException(nameof(cle), cle,
                "DelegationCatalogue : catégorie inconnue du client. Le back en sert une que cette "
                + "table ignore — c'est TD-530 qui se rappelle à nous, pas un cas à replier en silence.");
        }

        public static string LibellePour(string cle)
        {
            foreach (Charge c in Live) if (c.cle == cle) return c.libelle;
            foreach (Charge c in Reserve) if (c.cle == cle) return c.libelle;
            return cle;   // un libellé inconnu se montre BRUT plutôt que masqué : on voit le trou.
        }

        public static string SousTitrePour(string cle)
        {
            foreach (Charge c in Live) if (c.cle == cle) return c.sous;
            foreach (Charge c in Reserve) if (c.cle == cle) return c.sous;
            return "";
        }

        /// <summary>Les clés que la table connaît — le dénominateur du test de couverture.</summary>
        public static IEnumerable<string> ToutesLesCles()
        {
            foreach (Charge c in Live) yield return c.cle;
            foreach (Charge c in Reserve) yield return c.cle;
        }
    }

    /// <summary>㉜ — les correspondances « valeur du domaine → apparence / phrase », chacune en
    /// FONCTION NOMMÉE prenant la valeur du domaine. Jamais un tableau positionnel, jamais une
    /// chaîne de ternaires : mesuré sur ce dépôt, un balayage anti-régression écrit pour traquer
    /// ces correspondances rend ZÉRO sur un fichier qui les porte par l'ordre d'un tableau — la
    /// garde ne peut voir sa cible qu'APRÈS ce passage en fonction nommée.
    ///
    /// Les couleurs sont les hexadécimaux de `generateur-service.py`, convertis une fois. Ce sont
    /// tous des APLATS OPAQUES : la conversion sRGB→linéaire ne s'applique PAS (elle ne concerne
    /// que les alphas, où le navigateur mélange en sRGB et Unity en linéaire). L'appliquer ici
    /// serait l'erreur symétrique de ne pas l'appliquer là-bas.</summary>
    public static class DelegationResolvers
    {
        private static Color Hex(int r, int g, int b) => new Color(r / 255f, g / 255f, b / 255f, 1f);

        // ── fond de `.serv6` : linear-gradient(180deg,#1d2229,#161a20 58%,#121519) ──
        public static readonly Color FondHaut   = Hex(0x1d, 0x22, 0x29);
        public static readonly Color FondMilieu = Hex(0x16, 0x1a, 0x20);
        public static readonly Color FondBas    = Hex(0x12, 0x15, 0x19);

        public static readonly Color TeteFond   = Hex(0x1b, 0x20, 0x27);   // .sv-tete
        public static readonly Color TeteFilet  = Hex(0x33, 0x3c, 0x46);
        public static readonly Color BasFond    = Hex(0x14, 0x1a, 0x21);   // .sv-bas
        public static readonly Color BasFilet   = Hex(0x2c, 0x36, 0x40);

        public static readonly Color TitreVif   = Hex(0xee, 0xf3, 0xf9);   // h3 / .q b / h4
        public static readonly Color TexteVif   = Hex(0xe7, 0xec, 0xf3);   // .serv6 color / .l b
        public static readonly Color Muet       = Hex(0x8d, 0x99, 0xa6);   // p / .q i / .l u
        public static readonly Color DitEncre   = Hex(0xcd, 0xd6, 0xe0);   // .sv-dit
        public static readonly Color NoteEncre  = Hex(0x9a, 0xa6, 0xb3);   // .sv-note
        public static readonly Color Titron     = Hex(0x7e, 0x8b, 0x98);   // .sv-titron

        public static readonly Color Or         = Hex(0xd9, 0xab, 0x4e);   // .rond / .sv-geste
        public static readonly Color OrSombre   = Hex(0x8a, 0x6a, 0x22);   // .rond border / .viser
        public static readonly Color OrMuet     = Hex(0x9a, 0x8a, 0x6a);   // .sv-jeton i / small
        public static readonly Color OrPale     = Hex(0xc9, 0xa8, 0x6a);   // .tenu b
        public static readonly Color Cyan       = Hex(0x8f, 0xdf, 0xe4);   // .tenu.vous b
        public static readonly Color Rouge      = Hex(0xd9, 0x7a, 0x6a);   // ELEVE / RUINOUS

        public static readonly Color JetonFond     = Hex(0x24, 0x1c, 0x11);
        public static readonly Color JetonBord     = Hex(0x5a, 0x4a, 0x2a);
        public static readonly Color JetonFondUse  = Hex(0x1c, 0x14, 0x14);
        public static readonly Color JetonBordUse  = Hex(0x4a, 0x3a, 0x3a);
        public static readonly Color JetonRondUse  = Hex(0x2a, 0x23, 0x20);
        public static readonly Color JetonEncreUse = Hex(0x8b, 0x6a, 0x6a);
        public static readonly Color GesteMortSous = Hex(0x7a, 0x60, 0x60);

        public static readonly Color PlaqueFond        = Hex(0x20, 0x27, 0x2f);   // milieu du dégradé #242c34→#1b222a
        public static readonly Color PlaqueBord        = Hex(0x38, 0x43, 0x4e);
        public static readonly Color PlaqueConfieeFond = Hex(0x25, 0x1f, 0x15);   // milieu de #2a2418→#201b12
        public static readonly Color CroLibre          = Hex(0x46, 0x51, 0x5c);
        public static readonly Color ApercuFond        = Hex(0x22, 0x26, 0x2c);
        public static readonly Color ApercuBord        = Hex(0x3b, 0x46, 0x50);

        // `.sv-plaque.gris{opacity:.5}` — l'opacité CSS s'applique au bloc ENTIER, sous-arbre
        // compris. La reproduire par un alpha sur chaque enfant donnerait un résultat différent
        // (les recouvrements se composeraient) : on pré-mélange donc chaque couleur avec le fond,
        // ce qui est exactement ce que fait un `opacity` sur un bloc opaque posé sur un aplat.
        public static readonly Color PlaqueFondGrise = Hex(0x1b, 0x1f, 0x25);
        public static readonly Color PlaqueBordGrise = Hex(0x27, 0x2d, 0x35);
        public static readonly Color CroGris         = Hex(0x2e, 0x35, 0x3c);
        public static readonly Color TitreEteint     = Hex(0x81, 0x87, 0x8d);
        public static readonly Color MuetEteint      = Hex(0x51, 0x59, 0x61);

        // ── `mastery_bucket` : la seule correspondance de cet écran qui décide d'un GESTE ──

        public enum Maitrise { Nascent, Learning, Practiced, Eligible }

        /// <summary>⛔ Le repli est un JET, pas une valeur par défaut. Une 5ᵉ valeur de
        /// `mastery_bucket` doit être BRUYANTE : repliée en silence sur « pas encore prête », elle
        /// éteindrait le bouton pour une raison fausse, et personne ne le saurait jamais.
        /// (M2 : un `switch` C# sans `default` est CS0161 — « exhaustif sans default » n'existe
        /// pas ici. Le détecteur d'un membre neuf est un TEST sur `Enum.GetValues`, jamais le
        /// compilateur.)</summary>
        public static Maitrise LireMaitrise(string bucket)
        {
            switch (bucket)
            {
                case "NASCENT":   return Maitrise.Nascent;
                case "LEARNING":  return Maitrise.Learning;
                case "PRACTICED": return Maitrise.Practiced;
                case "ELIGIBLE":  return Maitrise.Eligible;
                default: throw new System.ArgumentOutOfRangeException(nameof(bucket), bucket,
                    "DelegationResolvers.LireMaitrise : bande de maîtrise non résolue.");
            }
        }

        public static string PhraseDeMaitrise(string bucket)
        {
            switch (LireMaitrise(bucket))
            {
                case Maitrise.Nascent:   return "vous apprenez encore";
                case Maitrise.Learning:  return "pas encore prête";
                case Maitrise.Practiced: return "presque prête";
                case Maitrise.Eligible:  return "prête à confier";
                default: throw new System.ArgumentOutOfRangeException(nameof(bucket), bucket,
                    "DelegationResolvers.PhraseDeMaitrise : membre non résolu.");
            }
        }

        // ── les quatre bandes de l'aperçu de reprise ──

        public enum Chute { Faible, Moyen, Eleve }

        public static Chute LireChute(string b)
        {
            switch (b)
            {
                case "FAIBLE": return Chute.Faible;
                case "MOYEN":  return Chute.Moyen;
                case "ELEVE":  return Chute.Eleve;
                default: throw new System.ArgumentOutOfRangeException(nameof(b), b,
                    "DelegationResolvers.LireChute : bande non résolue.");
            }
        }

        public static string PhraseDeChute(string b)
        {
            switch (LireChute(b))
            {
                case Chute.Faible: return "retombe à peine";
                case Chute.Moyen:  return "retombe nettement";
                case Chute.Eleve:  return "retombe brutalement";
                default: throw new System.ArgumentOutOfRangeException(nameof(b), b, "PhraseDeChute");
            }
        }

        public static Color CouleurDeChute(string b)
        {
            switch (LireChute(b))
            {
                case Chute.Faible: return Hex(0x7f, 0xc9, 0x9a);
                case Chute.Moyen:  return Or;
                case Chute.Eleve:  return Rouge;
                default: throw new System.ArgumentOutOfRangeException(nameof(b), b, "CouleurDeChute");
            }
        }

        public enum Recuperation { Court, Moyen, Long }

        public static Recuperation LireRecuperation(string b)
        {
            switch (b)
            {
                case "COURT": return Recuperation.Court;
                case "MOYEN": return Recuperation.Moyen;
                case "LONG":  return Recuperation.Long;
                default: throw new System.ArgumentOutOfRangeException(nameof(b), b,
                    "DelegationResolvers.LireRecuperation : bande non résolue.");
            }
        }

        public static string PhraseDeRecuperation(string b)
        {
            switch (LireRecuperation(b))
            {
                case Recuperation.Court: return "quelques jours";
                case Recuperation.Moyen: return "quelques semaines";
                case Recuperation.Long:  return "très longtemps";
                default: throw new System.ArgumentOutOfRangeException(nameof(b), b, "PhraseDeRecuperation");
            }
        }

        public enum Indemnite { Low, Medium, High, Ruinous }

        public static Indemnite LireIndemnite(string b)
        {
            switch (b)
            {
                case "LOW":     return Indemnite.Low;
                case "MEDIUM":  return Indemnite.Medium;
                case "HIGH":    return Indemnite.High;
                case "RUINOUS": return Indemnite.Ruinous;
                default: throw new System.ArgumentOutOfRangeException(nameof(b), b,
                    "DelegationResolvers.LireIndemnite : bande non résolue.");
            }
        }

        public static string PhraseDIndemnite(string b)
        {
            switch (LireIndemnite(b))
            {
                case Indemnite.Low:     return "peu";
                case Indemnite.Medium:  return "correct";
                case Indemnite.High:    return "cher";
                case Indemnite.Ruinous: return "ruineux";
                default: throw new System.ArgumentOutOfRangeException(nameof(b), b, "PhraseDIndemnite");
            }
        }

        public static Color CouleurDIndemnite(string b)
        {
            switch (LireIndemnite(b))
            {
                case Indemnite.Low:     return Hex(0x7f, 0xc9, 0x9a);
                case Indemnite.Medium:  return Or;
                case Indemnite.High:    return Hex(0xe0, 0x8a, 0x5a);
                case Indemnite.Ruinous: return Rouge;
                default: throw new System.ArgumentOutOfRangeException(nameof(b), b, "CouleurDIndemnite");
            }
        }

        public enum Fenetre { Short, Standard, Extended }

        public static Fenetre LireFenetre(string b)
        {
            switch (b)
            {
                case "SHORT":    return Fenetre.Short;
                case "STANDARD": return Fenetre.Standard;
                case "EXTENDED": return Fenetre.Extended;
                default: throw new System.ArgumentOutOfRangeException(nameof(b), b,
                    "DelegationResolvers.LireFenetre : bande non résolue.");
            }
        }

        public static string PhraseDeFenetre(string b)
        {
            switch (LireFenetre(b))
            {
                case Fenetre.Short:    return "court";
                case Fenetre.Standard: return "normal";
                case Fenetre.Extended: return "long";
                default: throw new System.ArgumentOutOfRangeException(nameof(b), b, "PhraseDeFenetre");
            }
        }
    }
}
