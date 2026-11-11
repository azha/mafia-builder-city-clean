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
        private string baseUrlPose;   // posée par un appelant (tests, shell) ; sinon la source unique
        private string baseUrl { get => baseUrlPose ?? MafiaCleanCity.AdresseDuBack.Url; set => baseUrlPose = value; }
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
        /// <summary>Garde de classe des refus (f2 2026-09-26) — la phrase SERVIE du refus de la route qui a échoué
        /// (`client.DernierePhraseDeRefus`, lue dans son onErr), montrée au sous-titre de l'état indisponible ; sinon la phrase
        /// de l'écran. `DerniereErreur` reste TECHNIQUE (crochet de test), jamais affiché.</summary>
        public string PhraseDuRefus { get; private set; }
        public long DernierCodeErreur { get; private set; }
        /// <summary>Le `building_id` trouvé par `DecouvrirBuildingId` — crochet de test (§4/§5 du
        /// brief : « écris ton choix et son coût »).</summary>
        public string BuildingIdDecouvert { get; private set; }
        /// <summary>Table 64 (passe UX 2026-09-26) — les lieutenants SERVIS du labo (`me/buildings`) et le roster (`GET /v1/lieutenants`) :
        /// c'est là qu'est le nom de qui parle. « Nestor » était figé.</summary>
        public string[] LieutenantsDuLabo { get; private set; }
        /// <summary>Cadre 154 — les bâtiments SERVIS du joueur (`me/buildings`, le même appel que la découverte du labo) : la source des noms
        /// des maillons. Null : non lus (panne) — la chaîne n'est alors JAMAIS rendue (`Charger` s'arrête sur l'état indisponible avant le
        /// graphe) : « absent de la liste ⇒ détruit » ne se lit que sur une liste SERVIE.</summary>
        public BatimentPossedeDto[] BatimentsServis { get; private set; }
        public MafiaCleanCity.Operational.Lieutenant.RosterRow[] Roster { get; private set; }
        /// <summary>Les textes RÉELLEMENT rendus, dans l'ordre — crochet de test (patron
        /// `ExceptionQueueController.RenderedTexts`), pour asserter le contenu sans dépendre de la
        /// hiérarchie d'objets.</summary>
        public IReadOnlyList<string> RenderedTexts => renderedTexts;
        private readonly List<string> renderedTexts = new List<string>();

        /// <summary>㉚ « Les deux gestes » — LE POINT D'INJECTION UNIQUE DES COÛTS par mode (TD-1046). Lu du fil par `RelireLesCouts` (`GET /v1/supply-chain/upkeep-costs`, BACK-1 `lot/couts-30` @87820327, pas encore
        /// servi sur la pile) : `CoutsServis` quand la route répond, `CoutsNonServis` sinon (⇒ chaque mode est ÉTEINT, règle (3) de f2). Un `Couts` posé par un test (ni l'un ni l'autre) n'est JAMAIS écrasé : les tests PlayMode
        /// injectent des coûts pour prouver le chemin actif (garde G-D1).</summary>
        public ICoutsParMode Couts = CoutsNonServis.Instance;
        private ChaineDApproFeuille feuille;
        /// <summary>La feuille des gestes (voile + panneau) — crochet de test ; null tant qu'aucun geste n'a été ouvert.</summary>
        public ChaineDApproFeuille Feuille => feuille;
        private bool gesteEnCours;
        /// <summary>Un geste est parti et n'a pas encore répondu : toute autre ouverture ou tout autre choix est ignoré (un geste à la fois).</summary>
        public bool GesteEnCours => gesteEnCours;

        private RectTransform racinePleinEcran;
        private ChaineDApproClient client;
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
        // `Start()` est le filet — il s'exécute après que l'appelant a eu sa frame pour injecter le
        // parent, et `EnsureInitialized` est idempotent, donc le premier des deux qui arrive gagne
        // sans que le second ne reconstruise. Sans ce filet, un écran monté sans `SetMountParent`
        // ni `Charger()` ne se construirait JAMAIS — un vert par absence, pas une économie.
        private void Start()
        {
            EnsureInitialized();
            EnsureEventSystem();
            // ⛔⛔ L'ÉCRAN SE CHARGE LUI-MÊME AU MONTAGE — sans cette ligne il se construit et reste
            //    VIDE POUR TOUJOURS. Le shell monte le locataire et lui passe un jeton ; il
            //    n'appelle JAMAIS `Charger()`. Mesuré le 2026-09-03 : `Charger()` était défini et
            //    n'avait AUCUN appelant dans tout le fichier, et la capture a échoué sur
            //    « chargement NON abouti après 20 s ».
            //    ★ Et les tests de ce lot ne pouvaient pas le voir : ils appellent `Charger()`
            //      eux-mêmes. *Un test qui déclenche lui-même ce qu'il vérifie ne prouve rien du
            //      déclencheur* — c'est la capture, et elle seule, qui a trouvé le trou.
            if (!chargementAmorce) { chargementAmorce = true; coroutineChargement = StartCoroutine(Charger()); }
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

        // ═══ §4/§5 — Découverte du labo ═══════════════════════════════════════════════════════════
        //
        // ★ UN APPEL : `GET /v1/me/buildings` liste les bâtiments du joueur (mesuré 2026-09-22 : 200,
        // 17 bâtiments sur 4 districts pour le compte de démo ; 4 pour un compte frais, dont un `lab`
        // — corps commité `Tools/juge-donnees/police/pont-district-2026-09-22/GET_me_buildings.json`).
        // Avant, cet écran tenait pour mesuré qu'aucune route ne les listait et balayait les 18
        // intérieurs de district : la route existait (`player-buildings.controller.ts:89`) et le
        // client l'appelait 0 fois. Même famille que `safehouses` le 07/09.
        // ⛔ ET IL PRENAIT LE PREMIER BÂTIMENT VENU : sur le compte de démo, le premier district
        // scanné (1) porte un hub de distribution — la chaîne d'appro s'ouvrait donc sur un hub, pas
        // sur un labo. Ici on cherche ce qui CUISINE (`lab`, `specialized_lab`, domaine
        // `building_operational_type` à 12 membres) ; sans labo, l'écran le dit dans les mots de
        // l'atelier (22/09), et sans aucun site aussi. Une panne réseau ne sort pas : la formule
        // maison de `RendreEtatIndisponible` la dit, l'erreur technique va au journal.
        private IEnumerator DecouvrirBuildingId(Action<string> onOk, Action<string> onErr)
        {
            var mes = new MesBatimentsClient { BaseUrl = baseUrl };
            BatimentPossedeDto[] possedes = null;
            long codePanne = 0; string messagePanne = null;
            yield return mes.Lire(token, bs => possedes = bs, (c, m) => { codePanne = c; messagePanne = m; });
            BatimentsServis = possedes;   // cadre 154 : les NOMS des maillons (jointure sur building_id)
            if (possedes == null)
            {
                Debug.LogWarning($"[㉚] me/buildings indisponible : {codePanne} {messagePanne}");
                onErr?.Invoke(null);   // null = panne : le sous-titre retombe sur « Réessayez dans un instant. »
                yield break;
            }
            if (possedes.Length == 0)
            {
                onErr?.Invoke(Libelle.De("appro", "etat", "Vous ne tenez encore aucun site."));
                yield break;
            }
            foreach (BatimentPossedeDto b in possedes)
            {
                if (b == null || string.IsNullOrEmpty(b.building) || !EstUnLabo(b.operational_type)) continue;
                LieutenantsDuLabo = b.lieutenant_ids;   // table 64 : qui parle au pied de la fiche
                onOk?.Invoke(b.building);
                yield break;
            }
            onErr?.Invoke(Libelle.De("appro", "etat", "Rien à commander — vous ne tenez pas encore de labo."));
        }

        /// <summary>Table 64 — la clé de la réplique du labo à court de Pyralin, FIGÉE : elle naissait du texte, et le texte porte désormais
        /// {nom}. Même valeur que la clé que le back sert (`string_table.ts`), jamais redérivée.</summary>
        public const string CleRepliqueNestor = "appro.bloc.nestor_l_etagere_est_vide_sans_pyralin_je_ne_rallume_pas";

        /// <summary>Qui parle au pied de la fiche : le premier des lieutenants SERVIS du labo présent au roster ; aucun ⇒ null. Pure.</summary>
        public static string LieutenantDuLabo(MafiaCleanCity.Operational.Lieutenant.RosterRow[] roster, string[] lieutenantsDuLabo)
        {
            if (roster == null || lieutenantsDuLabo == null) return null;
            foreach (string id in lieutenantsDuLabo)
                foreach (MafiaCleanCity.Operational.Lieutenant.RosterRow r in roster)
                    if (r != null && r.lieutenant_id == id && !string.IsNullOrWhiteSpace(r.name)) return r.name;
            return null;
        }

        /// <summary>Les deux types qui cuisinent, dans le domaine `building_operational_type`.</summary>
        private static bool EstUnLabo(string operationalType) =>
            operationalType == "lab" || operationalType == "specialized_lab";

        // ═══ Chargement ══════════════════════════════════════════════════════════════════════

        /// <summary>Charge la surface entière : découvre le bâtiment (§4), amorce l'i18n, puis lit
        /// la fiche (route 1) et le graphe (route 3, pour la section chaîne).</summary>
        public IEnumerator Charger()
        {
            EnsureInitialized();
            DerniereErreur = null;
            PhraseDuRefus = null;
            DernierCodeErreur = 0;

            string buildingId = null;
            string errBuilding = null;
            yield return DecouvrirBuildingId(id => buildingId = id, e => errBuilding = e);
            // table 64 : le nom de qui parle vient du roster servi
            yield return new MafiaCleanCity.Operational.Lieutenant.LieutenantClient { BaseUrl = baseUrl }.ListLieutenants(token, r => Roster = r,
                (c, m) => Debug.LogWarning($"[㉚] roster indisponible : {c} {m}"));
            if (renduExpliciteDemande) yield break;   // un test a rendu pendant l'attente : on n'écrase pas
            if (string.IsNullOrEmpty(buildingId))
            {
                DerniereErreur = errBuilding;   // null = panne : RendreEtatIndisponible dit « Réessayez dans un instant. »
                RendreEtatIndisponible();
                yield break;
            }
            BuildingIdDecouvert = buildingId;

            // ⛔ SANS CETTE LIGNE, LES RÉSOLVEURS SONT MUETS (patron ⑨, `ExceptionQueueController.
            // Boot`) : `Libelle.De` rend le littéral tant que le dictionnaire est vide, donc
            // l'écran reste lisible en français « en dur » — le branchement se serait « bien
            // passé » et n'aurait rien changé. Amorcé ici plutôt que caché.
            yield return I18nCatalog.Amorcer(new I18nClient { BaseUrl = baseUrl }, token);
            if (renduExpliciteDemande) yield break;   // un test a rendu pendant l'attente : on n'écrase pas

            yield return RechargerPrecurseurs();
            if (renduExpliciteDemande) yield break;   // un test a rendu pendant l'attente : on n'écrase pas
            yield return RechargerChaine();
            if (renduExpliciteDemande) yield break;   // un test a rendu pendant l'attente : on n'écrase pas
        }

        private IEnumerator RechargerPrecurseurs()
        {
            DerniereErreur = null;
            PhraseDuRefus = null;
            DernierCodeErreur = 0;
            // ⛔ REMIS À NULL AVANT L'APPEL : sans ça, un échec réseau sur un RECHARGEMENT (après
            // une commande) laisserait `DernierChargement` porter l'ancien état pré-commande, et
            // le test d'échec juste en dessous (`== null`) ne le verrait jamais — l'écran
            // afficherait alors un état PÉRIMÉ en silence plutôt que le message d'indisponibilité.
            DernierChargement = null;
            yield return client.GetOperationalPrecursors(token, BuildingIdDecouvert,
                dto => DernierChargement = dto,
                (code, msg) => { DernierCodeErreur = code; DerniereErreur = msg; PhraseDuRefus = client.DernierePhraseDeRefus; });
            if (renduExpliciteDemande) yield break;   // un test a rendu pendant l'attente : on n'écrase pas

            // La frame de création rend des rects non résolus : on attend le layout AVANT de
            // rendre quoi que ce soit qui lise une géométrie.
            yield return null;
            if (renduExpliciteDemande) yield break;   // un test a rendu pendant l'attente : on n'écrase pas

            if (DernierChargement == null) { RendreEtatIndisponible(); yield break; }
            AppliquerEtat(DernierChargement);
        }

        private IEnumerator RechargerChaine()
        {
            // ㉚ V15 : les coûts AVANT le graphe (la feuille les lit à l'ouverture), et relus avec lui après chaque geste
            yield return RelireLesCouts();
            if (renduExpliciteDemande) yield break;   // un test a rendu pendant l'attente : on n'écrase pas
            GetSupplyChainGraphResponseDto graphe = null;
            yield return client.GetSupplyChainGraph(token,
                dto => graphe = dto,
                // Non bloquant : la section chaîne se contente d'un état vide honnête même sans
                // le graphe (§3 du brief) — un 4xx/5xx ici ne doit pas casser le bon de commande.
                (code, msg) => { DerniereErreur = DerniereErreur ?? $"graphe : {code} {msg}"; PhraseDuRefus = PhraseDuRefus ?? client.DernierePhraseDeRefus; });
            if (renduExpliciteDemande) yield break;   // un test a rendu pendant l'attente : on n'écrase pas
            DernierGraphe = graphe;
            AppliquerChaine(graphe);
        }

        /// <summary>Le `Couts` qui suit une lecture : un `Couts` INJECTÉ (ni `CoutsNonServis` ni `CoutsServis`) est gardé ; sinon les coûts lus, ou `CoutsNonServis` quand la lecture a échoué (`lus` null).
        /// Pure : la garde G-V5 la joue sans réseau.</summary>
        public static ICoutsParMode CoutsApresLecture(ICoutsParMode courants, CoutsServis lus)
        {
            if (courants != null && !(courants is CoutsNonServis) && !(courants is CoutsServis)) return courants;
            return lus != null ? (ICoutsParMode)lus : CoutsNonServis.Instance;
        }

        /// <summary>㉚ V15 — lit `GET /v1/supply-chain/upkeep-costs` et pose `Couts` (`CoutsApresLecture`). SILENCIEUX : ni `DerniereErreur`, ni `PhraseDuRefus`, ni état indisponible — la route est absente (404) sur la pile
        /// d'avant BACK-1, et une route absente n'est pas une panne de l'écran : les modes sont éteints, voilà tout. Un `Couts` injecté par un test n'est pas lu du tout (pas de réseau).</summary>
        private IEnumerator RelireLesCouts()
        {
            if (Couts != null && !(Couts is CoutsNonServis) && !(Couts is CoutsServis)) yield break;
            CoutsServis lus = null;
            yield return client.GetSupplyChainUpkeepCosts(token, c => lus = c, (code, msg) => { /* silencieux : voir ci-dessus */ });
            Couts = CoutsApresLecture(Couts, lus);   // relu APRÈS l'attente : un test qui a injecté pendant ce temps garde son injection
        }

        /// <summary>Rend un corps FABRIQUÉ, sans réseau — réservé aux tests (patron ㊲,
        /// `RendrePourTest`). Ne prouve jamais que le back émet ce corps, seulement ce que
        /// l'écran EN FAIT.</summary>
        // ⛔⛔ UN RENDU EXPLICITE ANNULE L'AUTO-CHARGEMENT — sinon les deux se courent après, et le
        //    rendu explicite PERD une frame plus tard. Mesuré le 2026-09-04, sur un rouge non
        //    attribué remonté depuis le run d'une AUTRE branche : `EcranApproE1_EtatRepos` échouait
        //    sur « le bouton n'est pas construit en état repos ».
        //    La séquence : `AddComponent` → le test appelle `RendrePourTest` (même frame, avant
        //    `Start`) et `renderedTexts` se remplit → une frame passe → `Start` déclenche
        //    `StartCoroutine(Charger())` → la charge réseau échoue → `RendreEtatIndisponible()`
        //    fait `renderedTexts.Clear()` et le bouton disparaît AVANT les assertions.
        //    ★ Le test n'était vert que parce que le back répondait en ~400 ms, donc plus lentement
        //    qu'une frame. *Un test vert par la LENTEUR d'un voisin est un test qui rougira le jour
        //    où le voisin est absent* — et c'est exactement ce qui s'est passé dans un run à huit
        //    catégories, où il a été pris pour une régression d'autrui.
        //    ⚠️ La première hypothèse — le catalogue i18n amorcé par un voisin, qui aurait fait
        //    rendre une TRADUCTION au lieu du littéral asserté — a été RÉFUTÉE par la mesure :
        //    `appro.bouton.en_commander` vaut exactement « EN COMMANDER » dans le bundle. Le
        //    mécanisme plausible n'était pas le bon ; seule la lecture du chemin d'erreur l'a dit.
        public void RendrePourTest(GetOperationalPrecursorsResponseDto dto)
        {
            EnsureInitialized();
            // ⛔ Arrêter ce qui est DÉJÀ parti, en plus d'interdire un départ — voir `coroutineChargement`.
            renduExpliciteDemande = true;
            if (coroutineChargement != null) { StopCoroutine(coroutineChargement); coroutineChargement = null; }
            chargementAmorce = true;   // ⇒ `Start()` ne lancera pas `Charger()` par-dessus ce rendu
            DernierChargement = dto;
            AppliquerEtat(dto);
        }

        /// <summary>Idem pour la section chaîne — voir `RendrePourTest`. `batiments` : les bâtiments servis (`me/buildings`) dont la chaîne lit
        /// les noms ; omis ⇒ une liste VIDE (chaque maillon est alors un bâtiment détruit), jamais « non lus ».</summary>
        public void RendrePourTestChaine(GetSupplyChainGraphResponseDto dto, BatimentPossedeDto[] batiments = null)
        {
            // ⛔ Arrêter ce qui est DÉJÀ parti, en plus d'interdire un départ — voir `coroutineChargement`.
            renduExpliciteDemande = true;
            if (coroutineChargement != null) { StopCoroutine(coroutineChargement); coroutineChargement = null; }
            chargementAmorce = true;   // même raison que `RendrePourTest` ci-dessus
            EnsureInitialized();
            BatimentsServis = batiments ?? new BatimentPossedeDto[0];
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
            ViderLaFiche();

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
                Libelle.De("appro", "bloc", "BON DE COMMANDE"), 8f, EncreDuTitreDuBon, false);
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
            ConstruireLigne(ficheRoot, "a_quoi_ca_sert", "À QUOI ÇA SERT", usage, EncreSombre);

            string valeurStock = ChaineDApproResolvers.TexteStock(dto.stock_band) + " · " +
                                  (dto.stock_liters_label ?? "?");   // label DÉJÀ formaté, affiché tel quel
            ConstruireLigne(ficheRoot, "ce_qu_il_en_reste", "CE QU'IL EN RESTE", valeurStock,
                dto.stock_band == "NONE" ? RougeDuBon : EncreSombre);

            ConstruireLigne(ficheRoot, "le_prix", "LE PRIX", ChaineDApproResolvers.TextePrix(dto.price_trend_bucket),
                ChaineDApproResolvers.CouleurPrix(dto.price_trend_bucket, RougeDuBon, VertBon, EncreSombre));

            ConstruireLigne(ficheRoot, "le_fournisseur", "LE FOURNISSEUR",
                ChaineDApproResolvers.TextePressionFournisseur(dto.supplier_pressure_bucket),
                ChaineDApproResolvers.CouleurPressionFournisseur(dto.supplier_pressure_bucket, RougeDuBon, EncreSombre));

            if (enCours)
                ConstruireLigne(ficheRoot, "la_commande", "LA COMMANDE", "est en route", VertBon);   // m-49, verbatim

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

        private void ConstruireLigne(Transform parent, string idStable, string libelleLitteral, string valeur, Color couleurValeur)
        {
            GameObject ligne = NouveauUI("Ligne_" + idStable, parent);
            // `.bon .l{border-top:1px dotted #c3b79e}` — le A du juge groupé : « 4 filets pointillés du bon → 0 ». Recette MESURÉE.
            Filets.Poser((RectTransform)ligne.transform, DecorsDeScene.Filets.ChaineDAppro.L);
            HorizontalLayoutGroup h = ligne.AddComponent<HorizontalLayoutGroup>();
            h.childControlWidth = true; h.childControlHeight = true;
            h.childForceExpandWidth = true; h.childForceExpandHeight = false;
            // F9 (juge d'ensemble r1) : `.bon .l{padding:4px 0}` — sans lui le filet pointillé touchait le haut des capitales (3 px au lieu de ~21) ; la hauteur vient du padding + de la ligne de texte
            h.padding = new RectOffset(0, 0, PxTrait(4f), PxTrait(4f));
            AddLayoutElement(ligne, flexibleHeight: 0);

            TextMeshProUGUI lib = NouveauTexteFiche(ligne.transform, "Libelle",
                Libelle.De("appro", "bloc", libelleLitteral), 7.5f, EncreFaibleDuBon, false);
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
                // ⛔ NOM FIGÉ (table 64, atelier 82a3d473) : « Nestor » parlait pour tout joueur, et la clé était FABRIQUÉE depuis ce texte —
                // y mettre {nom} aurait changé la clé. Elle est donc FIGÉE (`CleRepliqueNestor`), et {nom} = le lieutenant RÉEL du labo
                // (le premier de ses lieutenants servis présent au roster) ; aucun ⇒ la réplique ne s'affiche pas.
                string replique = null;
                if (estPyralin)
                {
                    string nom = LieutenantDuLabo(Roster, LieutenantsDuLabo);
                    if (nom != null)
                        // EXIGEANT (f2 26/09) : la valeur servie « Nestor : … » ne porte pas {nom} ⇒ NON servie ⇒ le repli de la 64,
                        // avec le vrai nom ; la valeur réécrite par le back reprendra la main toute seule
                        replique = Libelle.GabaritExigeant(CleRepliqueNestor, "{nom}\u00A0: «\u00A0L’étagère est vide. Sans Pyralin, je ne rallume pas.\u00A0»",
                            new System.Collections.Generic.Dictionary<string, string> { { "nom", nom } }, "nom");
                }
                else
                    replique = Libelle.De("appro", "bloc", "Votre lieutenant : « On en a besoin, et il n'y en a plus. »");
                if (replique != null)
                {
                    TextMeshProUGUI q = NouveauTexteFiche(piedRoot, "Replique", replique, 9.5f, DesignTokens.Current.onSurfaceSecondary, false);
                    q.fontStyle = FontStyles.Italic;
                    q.enableWordWrapping = true;
                    TrackText(q.text);
                }
            }

            // cause 3 (CLIENT-3 ㉚ M4, 07/10) : « CTA sombre cerné d'or, libellé or / aplat or plein, encre sombre — gros bouton jaune » : la forme `.geste` de SON cadre (`.appr6 .geste` : fond #241c11,
            // cerne #5a4a2a, libellé #d9ab4e) — pas la `.cta6` des écrans de lecture. ㉚ B3 (juge du 07/10) : et sa LÉGENDE `small` à droite (cadre 48 :
            // « ça part du compte tout de suite ») — `PiedDEcran.Geste` pose les deux, comme ㉞ Carnet.
            Button b = PiedDEcran.Geste(piedRoot, Px, DesignTokens.Current.primaryFont,
                Libelle.De("appro", "bouton", "EN COMMANDER"),
                Libelle.De("appro", "bouton", "ça part du compte tout de suite"),
                PiedDEcran.Etat.Allume, PasserCommande);
            TextMeshProUGUI libBouton = b.transform.Find("Libelle").GetComponent<TextMeshProUGUI>();
            TrackText(libBouton.text);
            TrackText(b.transform.Find("Legende").GetComponent<TextMeshProUGUI>().text);
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
        // ★ CADRE 154 « La chaîne vue du graphe » (atelier `4ae50cca`, RATIFIÉ ; design `Tools/appro-maillons/DESIGN.md`, rulings f2 11/11 (A) et (a)) :
        //   l'en-tête « La chaîne » REMPLACE « LA CHAÎNE, EN REMONTANT » (le titre m-50 d'une trace que le graphe ne porte pas), puis une fenêtre
        //   qui DÉFILE : les maillons (`nodes`), puis les liaisons (`legs`). TD-985 FERMÉE : la phrase provisoire est retirée ; la phrase de la
        //   table 63 aussi (dès ≥ 1 nœud, chaque maillon dit sa bande) — leurs clés servies n'ont plus de lecteur côté client, rien ne se renomme.
        //   0 nœud ET 0 liaison : « Rien à remonter… », inchangé.
        private void AppliquerChaine(GetSupplyChainGraphResponseDto dto)
        {
            ViderEnfants(chaineRoot);
            ConstruireEnteteDeChaine();

            Dictionary<string, BatimentPossedeDto> parId = ChaineDApproGraphe.ParId(BatimentsServis);
            List<ChaineDApproGraphe.Maillon> maillons = ChaineDApproGraphe.Maillons(dto?.nodes, parId);
            List<ChaineDApproGraphe.Liaison> liaisons = ChaineDApproGraphe.Liaisons(dto?.legs, parId);
            List<ChaineDApproGraphe.Route> routes = ChaineDApproGraphe.Routes(dto?.routes, parId);
            if (maillons.Count == 0 && liaisons.Count == 0 && routes.Count == 0)
            {
                // MESURÉ (2026-09-03, compte `operational_demo@example.test`) : `nodes: []`. Sous l'en-tête, à la marge haute du corps (`.abody` 10 px).
                GameObject corpsVide = NouveauUI("CorpsVide", chaineRoot);
                VerticalLayoutGroup cv = corpsVide.AddComponent<VerticalLayoutGroup>();
                cv.padding = new RectOffset(0, 0, PxTrait(10f), 0);
                cv.childControlWidth = true; cv.childControlHeight = true;
                cv.childForceExpandWidth = true; cv.childForceExpandHeight = false;
                TextMeshProUGUI msg = NouveauTexteFiche(corpsVide.transform, "ChaineMessage",
                    Libelle.De("appro", "bloc", "Rien à remonter pour l’instant — la chaîne ne connaît aucun maillon sur ce compte."),
                    9f, DesignTokens.Current.onSurfaceMuted, false);
                msg.enableWordWrapping = true;
                TrackText(msg.text);
                return;
            }

            RectTransform contenu = ConstruireFenetreDeChaine();
            if (maillons.Count > 0)
            {
                Titron(contenu, "TitronMaillons", Libelle.Gabarit("appro.titre.les_maillons", "Les maillons"), 0f);
                foreach (ChaineDApproGraphe.Maillon m in maillons) ConstruireMaillon(contenu, m);
            }
            if (liaisons.Count > 0)
            {
                // `.gr30-titron2{margin-top:9px}` — seulement quand une section le précède
                Titron(contenu, "TitronLiaisons", Libelle.Gabarit("appro.titre.les_liaisons", "Les liaisons"), maillons.Count > 0 ? 9f : 0f);
                foreach (ChaineDApproGraphe.Liaison l in liaisons) ConstruireLiaison(contenu, l);
            }
            if (routes.Count > 0)
            {
                // cadre 159 : le titron « Les routes » (`appro.titre.les_routes`, NEUF ratifié f2 — TD-1048) puis une ligne par route ; même marge que « Les liaisons » quand une section le précède
                Titron(contenu, "TitronRoutes", Libelle.Gabarit("appro.titre.les_routes", "Les routes"), maillons.Count > 0 || liaisons.Count > 0 ? 9f : 0f);
                foreach (ChaineDApproGraphe.Route r in routes) ConstruireRoute(contenu, r);
            }
        }

        // ── les pièces du cadre 154 (CSS `.appr6 .entete`, `.titron`, `.noeud.gr30-n`, `.gr30-l`, `.etat`, recopié du cadre @4ae50cca) ──
        // Couleurs du cadre en aplat : aucune n'est à moins de 4 d'un jeton (mesuré 11/11), sauf `#d9ab4e` = `hudMoneyUnderlineGold`, lu par
        // `ChaineDApproGraphe.TeinteDeRang`. Filets : les recettes MESURÉES `ChaineDAppro.Entete` / `.Noeud` quand elles existent — mesurées sur les
        // cadres 48-53, PAS 154 : leurs valeurs coïncident exactement avec le CSS du cadre 154 (`.entete` / `.noeud` : 1 px `#3a352c`, r 3), mais un
        // re-mesurage de 48-53 les déplacerait aussi ici (TD-1043) ; sinon une
        // recette locale recopiée du CSS (patron `DistributionScreenController.RecetteCadreB`) — la mesure Chromium indexe les cadres par
        // POSITION, et re-mesurer aujourd'hui remuerait les recettes des autres écrans.
        public static Color FondEntete => Hex("#1e1b16");
        public static Color EncreTitreChaine => Hex("#f0dfc4");
        public static Color EncreSousTitreChaine => Hex("#9a8f78");
        private static Color EncreTitron => Hex("#8a8069");
        public static Color FondMaillon => Hex("#221f1a");
        public static Color EncreNomMaillon => Hex("#efe6d4");
        public static Color EncreFleche => Hex("#91876e");
        public static Color FondLiaison => Hex("#1d1a16");   // ⚠️ d = 5,00 de `readableTextDark` (seuil TD-612 : 4) — un ajustement de palette peut le faire rougir
        public static Color EncreNomLiaison => Hex("#d8cfbb");
        internal static SpecFilet[] FiletLiaison => new[] { new SpecFilet(Cotes.Tous, 1f, StyleFilet.Plein, Teinte.Hex("#38332a"), rayon: 3f, couleurCss: "38332a") };
        /// <summary>`.gr30-l.gr30-contourne{border-style:dashed;border-color:#6f6656}` — la liaison `bypassed`.</summary>
        public static SpecFilet[] FiletLiaisonContournee => new[] { new SpecFilet(Cotes.Tous, 1f, StyleFilet.Tirete, Teinte.Hex("#6f6656"), rayon: 3f, couleurCss: "6f6656") };
        private static SpecFilet[] FiletEtat(Teinte t) => new[] { new SpecFilet(Cotes.Tous, 1f, StyleFilet.Plein, t, rayon: 2f) };

        /// <summary>CSS `letter-spacing` (px) → TMP `characterSpacing` (centièmes d'em du corps).</summary>
        private static float Espacement(float cssPx, float corpsCss) => cssPx / corpsCss * 100f;

        private TextMeshProUGUI TexteSerif(Transform parent, string nom, string texte, float corpsCss, Color couleur)
        {
            TextMeshProUGUI t = NouveauTexteFiche(parent, nom, texte, corpsCss, couleur, true);
            t.font = DesignTokens.Current.hudSerifFont;
            return t;
        }

        /// <summary>`.appr6 .entete` : « La chaîne » (DejaVu Serif gras 12 px) + le sous-titre (7 px), fond `#1e1b16`, filet bas MESURÉ.</summary>
        private void ConstruireEnteteDeChaine()
        {
            GameObject go = NouveauUI("EnteteChaine", chaineRoot);
            AjouterFond(go, FondEntete);
            Filets.Poser((RectTransform)go.transform, DecorsDeScene.Filets.ChaineDAppro.Entete);
            VerticalLayoutGroup v = go.AddComponent<VerticalLayoutGroup>();
            v.padding = new RectOffset(PxTrait(13f), PxTrait(13f), PxTrait(11f), PxTrait(9f));
            v.spacing = Px(4f);
            v.childControlWidth = true; v.childControlHeight = true;
            v.childForceExpandWidth = true; v.childForceExpandHeight = false;
            AddLayoutElement(go, flexibleHeight: 0);

            TextMeshProUGUI titre = TexteSerif(go.transform, "TitreChaine", Libelle.Gabarit("appro.titre.la_chaine", "La chaîne"), 12f, EncreTitreChaine);
            titre.characterSpacing = Espacement(0.3f, 12f);
            TrackText(titre.text);
            TextMeshProUGUI sous = NouveauTexteFiche(go.transform, "SousTitreChaine",
                Libelle.Gabarit("appro.sous_titre.chaque_maillon_sa_pression_chaque_liaison_son_entretien", "Chaque maillon, sa pression\u202F; chaque liaison, son entretien."), 7f, EncreSousTitreChaine, false);
            sous.enableWordWrapping = true;
            TrackText(sous.text);
        }

        /// <summary>`.abody.gr30-defile{overflow-y:auto}` (E2 du juge : N maillons, N liaisons, sans pagination) — la fenêtre prend la hauteur
        /// RESTANTE de la section et défile ; `ListeDefilante` (fondu + ascenseur, garde de classe) l'équipe. Rend le CONTENU.</summary>
        private RectTransform ConstruireFenetreDeChaine()
        {
            GameObject fenetre = NouveauUI("FenetreChaine", chaineRoot);
            LayoutElement le = fenetre.AddComponent<LayoutElement>();
            le.flexibleHeight = 1f; le.minHeight = 0f; le.preferredHeight = 0f;
            fenetre.AddComponent<RectMask2D>();

            GameObject contenu = NouveauUI("ContenuChaine", fenetre.transform);
            RectTransform rtc = (RectTransform)contenu.transform;
            rtc.anchorMin = new Vector2(0f, 1f); rtc.anchorMax = new Vector2(1f, 1f); rtc.pivot = new Vector2(0.5f, 1f);
            rtc.offsetMin = Vector2.zero; rtc.offsetMax = Vector2.zero;
            VerticalLayoutGroup v = contenu.AddComponent<VerticalLayoutGroup>();
            v.padding = new RectOffset(0, 0, PxTrait(10f), PxTrait(10f));
            v.spacing = Px(4f);   // `.gr30-n` / `.gr30-l` : margin-bottom 4px
            v.childControlWidth = true; v.childControlHeight = true;
            v.childForceExpandWidth = true; v.childForceExpandHeight = false;
            // Le contenu se dimensionne sur ses enfants : c'est ce qui donne une course au ScrollRect.
            contenu.AddComponent<ContentSizeFitter>().verticalFit = ContentSizeFitter.FitMode.PreferredSize;

            ListeDefilante.Equiper((RectTransform)fenetre.transform, rtc, DecorsDeScene.ChaineDAppro.Support.CouleurDuBas);
            return rtc;
        }

        /// <summary>`.appr6 .titron` : 6,6 px semi-gras, capitales, interlettre 1,5 px, `#8a8069`, marge basse 7 px (le pas de la liste en donne 4).</summary>
        private void Titron(Transform parent, string nom, string texte, float margeHautCss)
        {
            GameObject go = NouveauUI(nom, parent);
            VerticalLayoutGroup v = go.AddComponent<VerticalLayoutGroup>();
            v.padding = new RectOffset(0, 0, PxTrait(Mathf.Max(0f, margeHautCss - 4f)), PxTrait(3f));
            v.childControlWidth = true; v.childControlHeight = true;
            v.childForceExpandWidth = true; v.childForceExpandHeight = false;
            TextMeshProUGUI t = NouveauTexteFiche(go.transform, "Texte", texte, 6.6f, EncreTitron, true);
            t.fontStyle = FontStyles.Bold | FontStyles.UpperCase;
            t.characterSpacing = Espacement(1.5f, 6.6f);
            TrackText(t.text);
        }

        /// <summary>Le mot d'une bande, encadré de sa couleur (`.etat{font:700 7.4px;border:1px solid currentColor;border-radius:2px;padding:3px 5px}`).</summary>
        private void Etat(Transform parent, string mot, int rang)
        {
            Teinte teinte = ChaineDApproGraphe.TeinteDeRang(rang);
            GameObject go = NouveauUI("Etat", parent);
            Filets.Poser((RectTransform)go.transform, FiletEtat(teinte));
            HorizontalLayoutGroup h = go.AddComponent<HorizontalLayoutGroup>();
            h.padding = new RectOffset(PxTrait(5f), PxTrait(5f), PxTrait(3f), PxTrait(3f));
            h.childControlWidth = true; h.childControlHeight = true;
            h.childForceExpandWidth = false; h.childForceExpandHeight = false;
            AddLayoutElement(go, flexibleWidth: 0);
            TextMeshProUGUI t = NouveauTexteFiche(go.transform, "Mot", mot, 7.4f, teinte.Resoudre(), true);
            t.enableWordWrapping = false;
            TrackText(t.text);
        }

        /// <summary>Un maillon (`.noeud.gr30-n`) : pastille de la bande · nom servi · « ↳ refoule vers {nom} » si et seulement si `has_arrow` · le mot.</summary>
        private void ConstruireMaillon(Transform parent, ChaineDApproGraphe.Maillon m)
        {
            GameObject go = NouveauUI("Maillon", parent);
            AjouterFond(go, FondMaillon);
            Filets.Poser((RectTransform)go.transform, DecorsDeScene.Filets.ChaineDAppro.Noeud);
            HorizontalLayoutGroup h = go.AddComponent<HorizontalLayoutGroup>();
            h.padding = new RectOffset(PxTrait(9f), PxTrait(9f), PxTrait(6f), PxTrait(6f));
            h.spacing = Px(9f);
            h.childAlignment = TextAnchor.MiddleLeft;
            h.childControlWidth = true; h.childControlHeight = true;
            h.childForceExpandWidth = false; h.childForceExpandHeight = false;
            AddLayoutElement(go, flexibleHeight: 0);

            GameObject pt = NouveauUI("Pastille", go.transform);
            Image disque = AjouterFond(pt, ChaineDApproGraphe.TeinteDeRang(m.Rang).Resoudre());
            disque.sprite = ProceduralUI.RoundedRectMask(Mathf.Max(1, Mathf.RoundToInt(Px(4.5f))));
            disque.type = Image.Type.Sliced;
            AddLayoutElement(pt, minWidth: Px(9f), preferredWidth: Px(9f), minHeight: Px(9f), preferredHeight: Px(9f), flexibleWidth: 0);

            GameObject n = NouveauUI("N", go.transform);
            VerticalLayoutGroup v = n.AddComponent<VerticalLayoutGroup>();
            v.spacing = Px(4f);
            v.childControlWidth = true; v.childControlHeight = true;
            v.childForceExpandWidth = true; v.childForceExpandHeight = false;
            AddLayoutElement(n, flexibleWidth: 1, minWidth: 0);
            TextMeshProUGUI nom = TexteSerif(n.transform, "Nom", m.Nom, 8.4f, EncreNomMaillon);
            nom.enableWordWrapping = true;
            TrackText(nom.text);
            if (m.Vers != null)
            {
                // `appro.etiquette.refoule_vers` (BACK-1, design a7df3592 : « refoule vers » / « backs up into ») est une ÉTIQUETTE sans paramètre :
                // le nom la SUIT, comme dans le cadre (`<i class="gr30-fl">↳ refoule vers <span class="gr30-nom">…</span></i>`). Le nom entre balisé à sa
                // propre taille et son encre (`.gr30-fl .gr30-nom` : 7 px `#d8cfbb`) ; la balise est CALCULÉE (aucun littéral de couleur) ; le texte SUIVI
                // est le texte visible, sans balise.
                // (l'appel à `Libelle` reste DANS l'argument du puits d'affichage : le cliquet des chaînes ne suit pas une variable)
                string balise = "<size=" + Px(7f).ToString("0.##", System.Globalization.CultureInfo.InvariantCulture) + "><color=#"
                                + ColorUtility.ToHtmlStringRGB(EncreNomLiaison) + ">" + m.Vers + "</color></size>";
                TextMeshProUGUI fl = NouveauTexteFiche(n.transform, "Refoule",
                    "↳ " + Libelle.Gabarit("appro.etiquette.refoule_vers", "refoule vers") + " " + balise, 6.4f, EncreFleche, false);
                fl.richText = true;
                fl.enableWordWrapping = true;
                TrackText("↳ " + Libelle.Gabarit("appro.etiquette.refoule_vers", "refoule vers") + " " + m.Vers);
            }
            Etat(go.transform, m.Mot, m.Rang);
        }

        /// <summary>Une liaison (`.gr30-l`) : origine, « → » destination · si `bypassed` : filet TIRETÉ + « contournée » · le mot de la dette.</summary>
        private void ConstruireLiaison(Transform parent, ChaineDApproGraphe.Liaison l)
        {
            GameObject go = NouveauUI("Liaison", parent);
            if (l.Contournee) go.name = "LiaisonContournee";   // nom d'objet (gardes) — sans ternaire à deux littéraux (garde N3)
            Image fondDeLaLigne = AjouterFond(go, FondLiaison);
            Filets.Poser((RectTransform)go.transform, l.Contournee ? FiletLiaisonContournee : FiletLiaison);
            HorizontalLayoutGroup h = go.AddComponent<HorizontalLayoutGroup>();
            h.padding = new RectOffset(PxTrait(9f), PxTrait(9f), PxTrait(5f), PxTrait(5f));
            h.spacing = Px(8f);
            h.childAlignment = TextAnchor.MiddleLeft;
            h.childControlWidth = true; h.childControlHeight = true;
            h.childForceExpandWidth = false; h.childForceExpandHeight = false;
            AddLayoutElement(go, flexibleHeight: 0);
            // le point d'entrée d'« Entretenir la liaison » : la ligne ENTIÈRE (son fond en est la cible de clic) ; TOUJOURS interactable (§1 : « en entretien » n'est pas servi, le refus servi le dit)
            PoserLeGeste(go, fondDeLaLigne, ChaineDApproGestes.Entretien,
                new CibleDeGeste { Id = l.Id, Origine = l.Origine, Destination = l.Destination }, !string.IsNullOrEmpty(l.Id));

            GameObject t = NouveauUI("T", go.transform);
            VerticalLayoutGroup v = t.AddComponent<VerticalLayoutGroup>();
            v.spacing = Px(2f);
            v.childControlWidth = true; v.childControlHeight = true;
            v.childForceExpandWidth = true; v.childForceExpandHeight = false;
            AddLayoutElement(t, flexibleWidth: 1, minWidth: 0);
            TextMeshProUGUI origine = NouveauTexteFiche(t.transform, "Origine", l.Origine, 7.4f, EncreNomLiaison, false);
            origine.enableWordWrapping = true;
            TrackText(origine.text);

            GameObject vers = NouveauUI("Vers", t.transform);
            HorizontalLayoutGroup hv = vers.AddComponent<HorizontalLayoutGroup>();
            hv.spacing = Px(3f);
            hv.childAlignment = TextAnchor.UpperLeft;
            hv.childControlWidth = true; hv.childControlHeight = true;
            hv.childForceExpandWidth = false; hv.childForceExpandHeight = false;
            TextMeshProUGUI fleche = NouveauTexteFiche(vers.transform, "Fleche", "→", 9f, EncreTitron, true);   // un signe, pas un mot
            fleche.enableWordWrapping = false;
            AddLayoutElement(fleche.gameObject, flexibleWidth: 0);
            TextMeshProUGUI destination = NouveauTexteFiche(vers.transform, "Destination", l.Destination, 7.4f, EncreNomLiaison, false);
            destination.enableWordWrapping = true;
            AddLayoutElement(destination.gameObject, flexibleWidth: 1, minWidth: 0);
            TrackText(destination.text);

            GameObject dr = NouveauUI("Droite", go.transform);
            HorizontalLayoutGroup hd = dr.AddComponent<HorizontalLayoutGroup>();
            hd.spacing = Px(6f);
            hd.childAlignment = TextAnchor.MiddleRight;
            hd.childControlWidth = true; hd.childControlHeight = true;
            hd.childForceExpandWidth = false; hd.childForceExpandHeight = false;
            AddLayoutElement(dr, flexibleWidth: 0);
            if (l.Contournee)
            {
                TextMeshProUGUI ctn = NouveauTexteFiche(dr.transform, "Contournee", Libelle.Gabarit("appro.etiquette.contournee", "contournée"), 7f, EncreTitron, false);
                ctn.fontStyle = FontStyles.Italic;
                ctn.enableWordWrapping = false;
                TrackText(ctn.text);
            }
            else if (l.EnEntretien)
            {
                // `.gr30-ent{font:italic 7px;color:#91876e}` — « en entretien » (`legs[].maintaining`, servi ET vrai), JAMAIS avec « contournée » (E3)
                TextMeshProUGUI ent = NouveauTexteFiche(dr.transform, "EnEntretien", Libelle.Gabarit("appro.etiquette.en_entretien", "en entretien"), 7f, EncreFleche, false);
                ent.fontStyle = FontStyles.Italic;
                ent.enableWordWrapping = false;
                TrackText(ent.text);
            }
            Etat(dr.transform, l.Mot, l.Rang);
        }

        /// <summary>Une route (`.gr30-l.gr30-r`, cadre 159) : origine, « → » destination, les deux bandes (sinuosité · effondrement, chacune dans sa couleur) · « En reconstruction » si `rebuilding` · le mot de l'état.
        /// La ligne est le point d'entrée de « Reconstruire la route » ; NON interactable pendant la reconstruction (`rebuilding`, servi — la seule extinction côté ligne).</summary>
        private void ConstruireRoute(Transform parent, ChaineDApproGraphe.Route r)
        {
            GameObject go = NouveauUI("Route", parent);
            if (r.EnReconstruction) go.name = "RouteEnReconstruction";   // nom d'objet (gardes) — sans ternaire à deux littéraux (garde N3)
            Image fondDeLaLigne = AjouterFond(go, FondLiaison);
            Filets.Poser((RectTransform)go.transform, FiletLiaison);
            HorizontalLayoutGroup h = go.AddComponent<HorizontalLayoutGroup>();
            h.padding = new RectOffset(PxTrait(9f), PxTrait(9f), PxTrait(5f), PxTrait(5f));
            h.spacing = Px(8f);
            h.childAlignment = TextAnchor.MiddleLeft;
            h.childControlWidth = true; h.childControlHeight = true;
            h.childForceExpandWidth = false; h.childForceExpandHeight = false;
            AddLayoutElement(go, flexibleHeight: 0);
            PoserLeGeste(go, fondDeLaLigne, ChaineDApproGestes.Reconstruction,
                new CibleDeGeste { Id = r.Id, Origine = r.Origine, Destination = r.Destination }, !r.EnReconstruction && !string.IsNullOrEmpty(r.Id));

            GameObject t = NouveauUI("T", go.transform);
            VerticalLayoutGroup v = t.AddComponent<VerticalLayoutGroup>();
            v.spacing = Px(2f);
            v.childControlWidth = true; v.childControlHeight = true;
            v.childForceExpandWidth = true; v.childForceExpandHeight = false;
            AddLayoutElement(t, flexibleWidth: 1, minWidth: 0);
            TextMeshProUGUI origine = NouveauTexteFiche(t.transform, "Origine", r.Origine, 7.4f, EncreNomLiaison, false);
            origine.enableWordWrapping = true;
            TrackText(origine.text);

            GameObject vers = NouveauUI("Vers", t.transform);
            HorizontalLayoutGroup hv = vers.AddComponent<HorizontalLayoutGroup>();
            hv.spacing = Px(3f);
            hv.childAlignment = TextAnchor.UpperLeft;
            hv.childControlWidth = true; hv.childControlHeight = true;
            hv.childForceExpandWidth = false; hv.childForceExpandHeight = false;
            TextMeshProUGUI fleche = NouveauTexteFiche(vers.transform, "Fleche", "→", 9f, EncreTitron, true);   // un signe, pas un mot
            fleche.enableWordWrapping = false;
            AddLayoutElement(fleche.gameObject, flexibleWidth: 0);
            TextMeshProUGUI destination = NouveauTexteFiche(vers.transform, "Destination", r.Destination, 7.4f, EncreNomLiaison, false);
            destination.enableWordWrapping = true;
            AddLayoutElement(destination.gameObject, flexibleWidth: 1, minWidth: 0);
            TrackText(destination.text);

            // `.gr30-bandes{display:flex;flex-wrap:wrap;gap:2px 8px;margin-top:3px;font:6.6px/1.2}` : UN texte qui revient à la ligne, chaque mot dans sa couleur (la bande de l'échelle du cadre 154 ;
            // les balises sont CALCULÉES — aucun littéral de couleur)
            GameObject bandes = NouveauUI("Bandes", t.transform);
            VerticalLayoutGroup vb = bandes.AddComponent<VerticalLayoutGroup>();
            vb.padding = new RectOffset(0, 0, PxTrait(3f), 0);
            vb.childControlWidth = true; vb.childControlHeight = true;
            vb.childForceExpandWidth = true; vb.childForceExpandHeight = false;
            string couleurSin = ColorUtility.ToHtmlStringRGB(r.TeinteSinuosite.Resoudre());
            string couleurEff = ColorUtility.ToHtmlStringRGB(r.TeinteEffondrement.Resoudre());
            string ecart = "<space=" + Px(8f).ToString("0.##", System.Globalization.CultureInfo.InvariantCulture) + ">";
            TextMeshProUGUI mots = NouveauTexteFiche(bandes.transform, "Mots",
                "<color=#" + couleurSin + ">" + r.MotSinuosite + "</color>" + ecart + "<color=#" + couleurEff + ">" + r.MotEffondrement + "</color>", 6.6f, EncreFleche, false);
            mots.richText = true;
            mots.enableWordWrapping = true;
            TrackText(r.MotSinuosite);
            TrackText(r.MotEffondrement);

            GameObject dr = NouveauUI("Droite", go.transform);
            HorizontalLayoutGroup hd = dr.AddComponent<HorizontalLayoutGroup>();
            hd.spacing = Px(6f);
            hd.childAlignment = TextAnchor.MiddleRight;
            hd.childControlWidth = true; hd.childControlHeight = true;
            hd.childForceExpandWidth = false; hd.childForceExpandHeight = false;
            AddLayoutElement(dr, flexibleWidth: 0);
            if (r.EnReconstruction)
            {
                // `.gr30-rec{font:italic 7px;color:#91876e}` — `routes[].rebuilding` (SERVI, qualitatif : jamais un compte à rebours) ; l'état reste « Ouverte » à côté
                TextMeshProUGUI rec = NouveauTexteFiche(dr.transform, "EnReconstruction", Libelle.Gabarit("appro.etat.en_reconstruction", "En reconstruction"), 7f, EncreFleche, false);
                rec.fontStyle = FontStyles.Italic;
                rec.enableWordWrapping = false;
                TrackText(rec.text);
            }
            Etat(dr.transform, r.MotEtat, r.RangEtat);
        }

        /// <summary>Pose le point d'entrée d'un geste sur une ligne : son fond devient la cible de clic, et un `Button` (sans transition : l'extinction ne repeint pas la ligne) ouvre la feuille.</summary>
        private void PoserLeGeste(GameObject ligne, Image fond, SpecDeGeste spec, CibleDeGeste cible, bool interactable)
        {
            fond.raycastTarget = true;
            Button b = MafiaCleanCity.Shell.Retour.NouveauBouton(ligne, fond);
            b.targetGraphic = fond;
            b.transition = Selectable.Transition.None;
            b.interactable = interactable;
            b.onClick.AddListener(() => OuvrirLaFeuille(spec, cible));
        }

        /// <summary>Repli NOMMÉ sur échec réseau — jamais une exception, jamais un écran noir
        /// (patron ㊲ : `Render(null)` a fait planter un autre écran de ce dépôt à la première
        /// ligne qui lisait le payload).</summary>
        private void RendreEtatIndisponible()
        {
            ViderLaFiche();
            ViderEnfants(piedRoot);
            ViderEnfants(chaineRoot);
            if (feuille != null) feuille.Fermer();   // plus de ligne sous elle : une feuille ouverte n'aurait plus de cible
            titreTexte.text = Libelle.De("appro", "titre", "La chaîne d'appro n'a pas répondu");
            // la phrase SERVIE du refus, sinon celle de l'écran — jamais `DerniereErreur` (garde de classe des refus)
            sousTitreTexte.text = PhraseDuRefus ?? Libelle.De("appro", "sous_titre", "Réessayez dans un instant.");
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

        // ═══ ㉚ « Les deux gestes » — entretenir une liaison, reconstruire une route ═══════════════════
        //
        // Ouvrir (un `Button` sur la ligne) → choisir un mode (la feuille) → POST → 2xx : fermer + RELIRE le graphe (jamais le corps de réponse : E2) · refus : la phrase SERVIE dans la
        // feuille, qui reste ouverte · échec réseau (`responseCode == 0`) : AUCUNE phrase (G-D5). Design `Tools/gestes-30/DESIGN.md`.

        private void OuvrirLaFeuille(SpecDeGeste spec, CibleDeGeste cible)
        {
            if (gesteEnCours || racinePleinEcran == null || spec == null || cible == null || string.IsNullOrEmpty(cible.Id)) return;
            if (feuille == null) feuille = new ChaineDApproFeuille(racinePleinEcran, Px, PxTrait, ChoisirUnMode, FermerLaFeuille);
            feuille.Ouvrir(spec, cible, Couts, ChaineDApproGestes.JetonDisponible);
        }

        private void FermerLaFeuille()
        {
            if (feuille != null) feuille.Fermer();
        }

        /// <summary>Le choix d'un mode dans la feuille est-il permis ? La règle d'extinction est RELUE ici (`Actionnable`), jamais seulement l'état du bouton : un mode éteint ne part pas.</summary>
        private bool PeutChoisir(ModeDeGeste mode)
        {
            if (gesteEnCours || feuille == null || !feuille.EstOuverte || mode == null) return false;
            return ChaineDApproGestes.Actionnable(mode, ChaineDApproGestes.CentimesLisibles(Couts, mode.Id), ChaineDApproGestes.JetonDisponible);
        }

        private void ChoisirUnMode(ModeDeGeste mode)
        {
            if (PeutChoisir(mode)) StartCoroutine(GesteCoroutine(feuille.SpecOuverte, mode, feuille.CibleOuverte));
        }

        private IEnumerator GesteCoroutine(SpecDeGeste spec, ModeDeGeste mode, CibleDeGeste cible)
        {
            if (gesteEnCours) yield break;
            gesteEnCours = true;
            try   // revue ⊥ m5 : le drapeau retombe même si l'écran meurt pendant la relecture
            {
                bool ok = false; long code = 0; string erreur = null;
                if (spec == ChaineDApproGestes.Reconstruction)
                    yield return client.PostOperationalRoutesRebuild(token, cible.Id, new PostOperationalRoutesRebuildBody { mode = mode.Id },
                        _ => ok = true, (c, m) => { code = c; erreur = m; });
                else
                    yield return client.PostSupplyChainLegsMaintain(token, cible.Id, new PostSupplyChainLegsMaintainBody { mode = mode.Id },
                        _ => ok = true, (c, m) => { code = c; erreur = m; });
                if (!ok)
                {
                    TraiterLEchecDuGeste(code, erreur, client.DernierePhraseDeRefus);
                    yield break;
                }
                AppliquerLeSucces(mode);
                // l'après-geste se RELIT (E2 : les deux bandes sont re-dérivées à chaque lecture) — « en entretien » (quand servi) ou « contournée », jamais les deux ; la route « Ouverte » ET « En reconstruction »
                yield return RechargerChaine();
            }
            finally { gesteEnCours = false; }
        }

        /// <summary>Un 2xx : la feuille se ferme ; une décision STRUCTURELLE est dépensée localement (`JetonDeStructure.DepenseLocalement` : `Utilises` seul, jamais un cap fabriqué — TD-1080).</summary>
        private void AppliquerLeSucces(ModeDeGeste mode)
        {
            FermerLaFeuille();
            if (mode != null && mode.Structurel) JetonDeStructure.DepenseLocalement();
        }

        /// <summary>Un refus n'est QUE la phrase servie (`RefusServi.Phrase`, lue par le client) : `responseCode == 0` (réseau, corps vide) n'est PAS un refus — la feuille reste ouverte, sans phrase (G-D5).
        /// Aucune phrase du client à la place : le manque d'argent est un 409 `INSUFFICIENT_FUNDS` dont la clé `error.funds.insufficient` est servie par BACK-1 (`lot/couts-30` @87820327, pas encore sur la pile) — sa phrase
        /// vient du corps (`RefusServi.Phrase`), comme toute autre ; tant que la clé n'est pas servie, la feuille se tait.</summary>
        public static string PhraseDeRefusAMontrer(long code, string phraseServie)
        {
            if (code == 0) return null;
            return string.IsNullOrEmpty(phraseServie) ? null : phraseServie;
        }

        private void TraiterLEchecDuGeste(long code, string message, string phraseServie)
        {
            DernierCodeErreur = code;
            DerniereErreur = $"{code}: {message}";   // TECHNIQUE : jamais affichée
            if (feuille != null) feuille.MontrerRefus(PhraseDeRefusAMontrer(code, phraseServie));
        }

        // ── crochets de test (patron `RendrePourTest` / `RefuserPourTest`) : ne prouvent jamais que le back émet ce corps, seulement ce que l'écran EN FAIT ──

        /// <summary>Ouvre la feuille d'un geste sur une cible, comme le clic d'une ligne.</summary>
        public void OuvrirLaFeuillePourTest(SpecDeGeste spec, CibleDeGeste cible) => OuvrirLaFeuille(spec, cible);

        /// <summary>Choisit un mode de la feuille ouverte et ATTEND la fin du geste (POST puis relecture) — awaitable, contrairement au clic (patron `PasserCommandeEtRecharger`).</summary>
        public IEnumerator ChoisirPourTest(ModeDeGeste mode)
        {
            if (!PeutChoisir(mode)) yield break;
            yield return GesteCoroutine(feuille.SpecOuverte, mode, feuille.CibleOuverte);
        }

        /// <summary>Relit les coûts comme `RechargerChaine` (la lecture silencieuse, SANS le graphe) et ATTEND — awaitable : la garde G-V5 la joue sur un port fermé, puis sur la pile.</summary>
        public IEnumerator RelireLesCoutsPourTest() { EnsureInitialized(); yield return RelireLesCouts(); }

        /// <summary>Change l'adresse du back de CET écran (client compris) — la garde G-V5 la pose sur un port fermé ; `null` rend la source unique.</summary>
        public void PoserLAdresseDuBackPourTest(string url) { baseUrl = url; EnsureInitialized(); client.BaseUrl = baseUrl; }

        /// <summary>Un geste a ÉCHOUÉ avec `code` et le corps d'erreur brut `corpsBrut` : la phrase servie de ce corps passe par la même règle que celle du vrai POST.</summary>
        public void RefuserPourTest(long code, string corpsBrut) =>
            TraiterLEchecDuGeste(code, "refus de test", MafiaCleanCity.I18n.RefusServi.Phrase(corpsBrut));

        /// <summary>Un geste (de mode `mode`) a RÉUSSI et le graphe relu est `relu` : la feuille se ferme, une décision structurelle est dépensée localement, la chaîne est rendue sur ce corps.</summary>
        public void ReussirPourTest(GetSupplyChainGraphResponseDto relu, ModeDeGeste mode = null)
        {
            AppliquerLeSucces(mode);
            RendrePourTestChaine(relu, BatimentsServis);
        }

        // ═══ Construction de la mise en page ═════════════════════════════════════════════════

        private void BuildLayout()
        {
            Canvas canvas = MafiaCleanCity.Shell.CanvasRacine.Resoudre(transform, mountParent);
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
            // LE DÉCOR DE SCÈNE (CLIENT-2, design `Tools/decor-de-scene-2026-10-07/DESIGN.md`) : la scène du district à 0,2, le voile,
            // le support B de `.appr6` (#1c1a17 → #151310 60 % → #111014) — DÉCLARÉS au catalogue, plus de fond plat ici.
            DecorPose decor = DecorDeScene.Poser(racine.transform, DecorsDeScene.ChaineDAppro);
            racinePleinEcran.SetAsLastSibling();

            // ⛔ L'ÉCHELLE AVANT TOUTE CONVERSION (patron `ExceptionQueueController`) — un
            // RectTransform qui vient d'être étiré n'a pas encore son `rect` résolu.
            Canvas.ForceUpdateCanvases();

            // Le corps vit SOUS le bandeau haut ET AU-DESSUS du dock bas — LES DEUX insets,
            // publiés par le shell (`ShellChrome`). Hors shell (tests isolés) les deux valent 0 et
            // le corps remplit tout l'écran : le comportement d'avant que ces champs existent.
            // C-a + C-b (juge groupé du 07/10, f2) : la racine est une PILE (marges d'écran haut/bas du shell) dont le premier élément est le BANDEAU DE TITRE de la maquette (`EnteteDEcran` : plaque pleine largeur +
            // filet, titre DejaVu Serif crème à l'échelle de la maquette) ; le corps prend ce qui reste.
            // §5.6 du design : l'en-tête commence SOUS max(barre, bande de scène 21 %), comme `.appr6` sous la scène de la maquette.
            DecorDeScene.ReserverLaBande(EnteteDEcran.PoserLaPile(racine, 0, (int)ShellChrome.BottomInsetPx), decor, 0f);
            var (titreDuBandeau, sousTitreDuBandeau) = EnteteDEcran.Construire(racine.transform, EnteteDEcran.Appro, Px,
                DesignTokens.Current.hudSerifFont, DesignTokens.Current.primaryFont, DesignTokens.Current.onSurfaceSecondary, 7f);
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

            // La fiche crème « BON DE COMMANDE » — un fond, un layout, contenu rempli par
            // `RendreFiche` (appelée à chaque `AppliquerEtat`).
            GameObject ficheGo = NouveauUI("Fiche", corpsGo.transform);
            ficheGo.AddComponent<Image>().color = PlaqueDuBon;
            VerticalLayoutGroup vf = ficheGo.AddComponent<VerticalLayoutGroup>();
            vf.padding = new RectOffset(PxTrait(12f), PxTrait(12f), PxTrait(10f), PxTrait(10f));
            vf.spacing = Px(5f);
            vf.childControlWidth = true; vf.childControlHeight = true;
            vf.childForceExpandWidth = true; vf.childForceExpandHeight = false;
            AddLayoutElement(ficheGo, flexibleHeight: 0);
            ficheRoot = ficheGo.transform;

            // « La chaîne » (cadre 154) — squelette persistant (§3), contenu rempli par `AppliquerChaine`. Elle prend la hauteur RESTANTE
            // sous le bon (ruling f2 (A), 11/11) : sa fenêtre défile dedans. L'en-tête et la fenêtre se touchent (`.entete` puis `.abody`).
            GameObject chaineGo = NouveauUI("Chaine", corpsGo.transform);
            VerticalLayoutGroup vc = chaineGo.AddComponent<VerticalLayoutGroup>();
            vc.spacing = 0f;
            vc.childControlWidth = true; vc.childControlHeight = true;
            vc.childForceExpandWidth = true; vc.childForceExpandHeight = false;
            AddLayoutElement(chaineGo, flexibleHeight: 1, minHeight: 0);
            chaineRoot = chaineGo.transform;

            // Le pied — réplique/note + bouton, contenu rempli par `RendrePied`.
            // C-c (juge groupé du 07/10, f2 ; A4) : le pied est la BANDE BASSE `.bas` de la maquette — plaque #141a21 pleine largeur + filet haut 2 px, ANCRÉE EN PIED de la pile (le corps, flexible, la pousse en bas) ;
            // il flottait dans la colonne, sous la chaîne, sans plaque ni filet.
            GameObject bande = PiedDEcran.Bande(racine.transform, Px);
            GameObject piedGo = NouveauUI("Pied", bande.transform);
            VerticalLayoutGroup vp = piedGo.AddComponent<VerticalLayoutGroup>();
            vp.spacing = Px(8f);
            vp.childControlWidth = true; vp.childControlHeight = true;
            vp.childForceExpandWidth = true; vp.childForceExpandHeight = false;
            AddLayoutElement(piedGo, flexibleHeight: 0);
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
        private static Color Creme => DesignTokens.Current.hudCreme;
        private static Color CremeSecondaire => DesignTokens.Current.hudCremeSecondary;
        // F8 (juge d'ensemble r1) : `hudCremeSecondary` est une encre pour fond SOMBRE ; posée en libellé sur le papier du bon elle donnait 1,69:1. Teintes de la maquette (`ecrans-brennar-6.html` 4543-4545) :
        // `.bon h4 span` #6f6656, `.bon .l u` #726552 (≥ 4,5:1 sur la plaque #efe7d6, la plaque de la maquette).
        private static Color EncreFaibleDuBon => new Color32(0x72, 0x65, 0x52, 0xFF);
        private static Color EncreDuTitreDuBon => new Color32(0x6F, 0x66, 0x56, 0xFF);
        private static Color PlaqueDuBon => new Color32(0xEF, 0xE7, 0xD6, 0xFF);
        // ⚠️ ESTIMÉ VISUELLEMENT SUR LA MAQUETTE, NON ÉCHANTILLONNÉ AU PIXEL — aucun outil de
        // lecture de pixel n'était disponible cette passe. À corriger par une sonde dédiée (patron
        // `Tools/mesure-geometrie-*.py`) avant tout jugement `juge-visuel`. Voir
        // implementation-notes.md § Deviations.
        private static Color EncreSombre => DesignTokens.Current.ficheCtaOrEncre;
        private static Color Or => DesignTokens.Current.hudMoneyUnderlineGold;
        private static Color RougeMauvais => DesignTokens.Current.accentDanger;
        /// <summary>A2 (juge groupé du 07/10, f2) : le rouge des valeurs SUR LE PAPIER du bon — `.bon .l b.rouge` `#a8402f` (4,96:1 sur le papier) ; `accentDanger` `#ff5a4d` (pensé pour le fond sombre) n'y fait que 2,34:1,
        /// sous le plancher de 3:1. Aucun jeton n'est à ce rouge (le plus proche est à plus de 60/255) : une couleur propre au bon, en aplat exact (jamais un jeton substitué).</summary>
        public static Color RougeDuBon => new Color32(0xa8, 0x40, 0x2f, 255);
        /// <summary>`.bon::after` : le créneau de la perforation (#cbbfa4) — à 31/255 du jeton le plus proche (hudCremeSecondary) : une couleur du cadre, pas une recopie.</summary>
        private static Color PerforationDuBon => new Color32(0xcb, 0xbf, 0xa4, 255);
        private static Color VertBon => DesignTokens.Current.accentSuccess;

        internal static Color Hex(string h)
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

        /// <summary>Vide le bon, PUIS repose sa perforation (elle est un enfant du bon : le vidage la détruirait).</summary>
        private void ViderLaFiche()
        {
            ViderEnfants(ficheRoot);
            PoserLaPerforation(ficheRoot);
        }

        /// <summary>`.bon::after{position:absolute;left:0;right:0;bottom:0;height:5px;background:repeating-linear-gradient(90deg,#cbbfa4 0 4px,transparent 4px 8px)}`
        /// (㉚ B2, juge du 07/10) : la bande de créneaux au bas du papier — un trait de 4 px, un vide de 4 px, sur toute la largeur. Hors mise en page.</summary>
        private void PoserLaPerforation(Transform bon)
        {
            if (bon == null) return;
            GameObject go = NouveauUI("Perforation", bon);
            go.AddComponent<LayoutElement>().ignoreLayout = true;
            RectTransform rt = (RectTransform)go.transform;
            rt.anchorMin = Vector2.zero; rt.anchorMax = new Vector2(1f, 0f); rt.pivot = new Vector2(0.5f, 0f);
            rt.offsetMin = Vector2.zero; rt.offsetMax = new Vector2(0f, Px(5f));
            if (go.GetComponent<CanvasRenderer>() == null) go.AddComponent<CanvasRenderer>();
            Image img = go.AddComponent<Image>();
            int pas = Mathf.Max(1, Mathf.RoundToInt(Px(4f)));
            img.sprite = ProceduralUI.TuileTirets(pas, pas, Mathf.Max(1, Mathf.RoundToInt(Px(5f))), PerforationDuBon, false);
            img.type = Image.Type.Tiled;
            img.color = Color.white;
            img.raycastTarget = false;
            Canvas cv = img.canvas;   // un texel = une unité de canvas (comme `FiletsPoses`)
            img.pixelsPerUnitMultiplier = (cv != null ? cv.referencePixelsPerUnit : 100f) / img.sprite.pixelsPerUnit;
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

        /// <summary>La clé est la VALEUR servie (`appro.fournisseur.fresh|used|strained`, BACK-1 `lot/chaine-bandes-2` @1845e0e8,
        /// `string_table.ts:3682-3684` FR) ; le repli est le texte des maquettes, égal au FR servi, et il se COMPTE (11/11, f2).</summary>
        public static string TextePressionFournisseur(PressionFournisseur p)
        {
            switch (p)
            {
                case PressionFournisseur.Fresh: return MafiaCleanCity.I18n.Libelle.ParValeur("appro", "fournisseur", "fresh", "il vous prend encore au sérieux");   // m-49
                case PressionFournisseur.Used: return MafiaCleanCity.I18n.Libelle.ParValeur("appro", "fournisseur", "used", "il commence à traîner");              // m-53
                case PressionFournisseur.Strained: return MafiaCleanCity.I18n.Libelle.ParValeur("appro", "fournisseur", "strained", "il vous fait attendre exprès");   // m-48
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
                case "UP": return MafiaCleanCity.I18n.Libelle.De("appro", "bloc", "le prix monte");              // m-48, MESURÉ
                case "STABLE": return MafiaCleanCity.I18n.Libelle.De("appro", "bloc", "le prix ne bouge pas");    // m-49 — hypothèse de clé
                case "DOWN": return MafiaCleanCity.I18n.Libelle.De("appro", "bloc", "le prix baisse");            // m-53 — hypothèse de clé
                default: return MafiaCleanCity.I18n.Repli.Etat(bucket);   // hors domaine : le mot de la famille (atelier 28) ; absent : « — » ; jamais la valeur brute
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
                case "NONE": return MafiaCleanCity.I18n.Libelle.De("appro", "bloc", "il n’y a plus rien");   // m-48, MESURÉ
                // atelier 29 (7746e0bb), servies — dans la voix de la valeur déjà nommée.
                case "LOW": return MafiaCleanCity.I18n.Libelle.De("appro", "bloc", "il en reste peu");
                case "MEDIUM": return MafiaCleanCity.I18n.Libelle.De("appro", "bloc", "il en reste");
                case "HIGH": return MafiaCleanCity.I18n.Libelle.De("appro", "bloc", "il y en a assez");
                default: return MafiaCleanCity.I18n.Repli.Etat(band);   // hors domaine : le mot de la famille (atelier 28) ; absent : « — » ; jamais la valeur brute
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

    /// <summary>㉚ cadre 154 « La chaîne vue du graphe » (atelier `4ae50cca`, RATIFIÉ ; design `Tools/appro-maillons/DESIGN.md`) — la partie
    /// PURE : rang, mot et couleur de chaque bande, nom servi de chaque bâtiment, et l'ORDRE (règle d'affichage du CLIENT : le back n'en sert
    /// aucun). Domaines recopiés du CODE (V15, back main `6040a213`) : `BackpressureBucket` = silent|mild|warm|critical
    /// (`backpressure-bucket.ts:22`), `DebtBucket` = fresh|accruing|stressed|fractured (`debt-bucket.ts:23`). Mots : clé = la VALEUR servie
    /// (`appro.pression.*` / `appro.dette.*`, BACK-1 `lot/chaine-bandes` @f9d92251 `string_table.ts:3655-3662` FR, @1845e0e8 `:3666-3673`), repli = le FR servi
    /// (égal à l'octet, apostrophes typographiques comprises — vérifié par la revue ⊥ du 11/11).</summary>
    public static class ChaineDApproGraphe
    {
        /// <summary>Le rang d'affichage d'une bande : 0 = la pire. Hors domaine ⇒ 4 (en dernier, jamais confondu avec une bande connue).</summary>
        public const int RangHorsDomaine = 4;

        public static int RangPression(string bucket)
        {
            switch (bucket)
            {
                case "critical": return 0;
                case "warm": return 1;
                case "mild": return 2;
                case "silent": return 3;
                default: return RangHorsDomaine;
            }
        }

        public static int RangDette(string bucket)
        {
            switch (bucket)
            {
                case "fractured": return 0;
                case "stressed": return 1;
                case "accruing": return 2;
                case "fresh": return 3;
                default: return RangHorsDomaine;
            }
        }

        public static string MotPression(string bucket)
        {
            switch (bucket)
            {
                case "critical": return MafiaCleanCity.I18n.Libelle.ParValeur("appro", "pression", "critical", "Ne livre plus");
                case "warm": return MafiaCleanCity.I18n.Libelle.ParValeur("appro", "pression", "warm", "Engorgé");
                case "mild": return MafiaCleanCity.I18n.Libelle.ParValeur("appro", "pression", "mild", "Ça commence à s’accumuler");
                case "silent": return MafiaCleanCity.I18n.Libelle.ParValeur("appro", "pression", "silent", "Rien ne bloque");
                default: return MafiaCleanCity.I18n.Repli.Etat(bucket);   // hors domaine : le mot GÉNÉRIQUE « état inconnu » (`commun.repli.etat_inconnu`, servi) ; absent : « — » ; jamais la valeur brute
            }
        }

        public static string MotDette(string bucket)
        {
            switch (bucket)
            {
                case "fractured": return MafiaCleanCity.I18n.Libelle.ParValeur("appro", "dette", "fractured", "Rompu");
                case "stressed": return MafiaCleanCity.I18n.Libelle.ParValeur("appro", "dette", "stressed", "Tient à peine");
                case "accruing": return MafiaCleanCity.I18n.Libelle.ParValeur("appro", "dette", "accruing", "L’entretien prend du retard");
                case "fresh": return MafiaCleanCity.I18n.Libelle.ParValeur("appro", "dette", "fresh", "Entretenu");
                default: return MafiaCleanCity.I18n.Repli.Etat(bucket);
            }
        }

        /// <summary>La teinte d'un rang (cadre 154 : `.etat` et `.gr30-pt`, mêmes couleurs pour les maillons et les liaisons). Le rang 2
        /// (`#d9ab4e`) EST le jeton `hudMoneyUnderlineGold` (distance 0, garde TD-612) : il passe par le jeton.</summary>
        public static Teinte TeinteDeRang(int rang)
        {
            switch (rang)
            {
                case 0: return Teinte.Hex("#d97a6a");
                case 1: return Teinte.Hex("#e08a4a");
                case 2: return Teinte.Jeton("hudMoneyUnderlineGold", t => t.hudMoneyUnderlineGold);
                case 3: return Teinte.Hex("#8fb59a");
                default: return Teinte.Jeton("onSurfaceMuted", t => t.onSurfaceMuted);
            }
        }

        /// <summary>Le nom SERVI d'un bâtiment : `me/buildings` → `name_i18n` (OBLIGATOIRE côté back, `player-buildings.controller.ts:134`),
        /// rendu par le catalogue (patron `BuildingCardController.NomDuBatiment`). Absent de la liste ⇒ un bâtiment DÉMOLI (la route exclut
        /// `demolished`, `:107`) ⇒ le repli RATIFIÉ « un bâtiment détruit ». Jamais un nom deviné, jamais l'identifiant.</summary>
        public static string NomDuBatiment(string buildingId, IReadOnlyDictionary<string, BatimentPossedeDto> parId)
        {
            if (!string.IsNullOrEmpty(buildingId) && parId != null && parId.TryGetValue(buildingId, out BatimentPossedeDto b)
                && b != null && b.name_i18n != null && !string.IsNullOrEmpty(b.name_i18n.key))
            {
                var p = new Dictionary<string, string>();
                NomDeBatimentParamsDto pr = b.name_i18n.@params;
                if (pr != null)
                {
                    // on passe ce qu'on reçoit, rien de plus (`rang` est absent au rang 1 et la clé servie alors ne le demande pas)
                    if (!string.IsNullOrEmpty(pr.enseigne)) p["enseigne"] = pr.enseigne;
                    if (!string.IsNullOrEmpty(pr.district)) p["district"] = pr.district;
                    if (!string.IsNullOrEmpty(pr.block)) p["block"] = pr.block;
                    if (!string.IsNullOrEmpty(pr.rang)) p["rang"] = pr.rang;
                }
                return MafiaCleanCity.I18n.I18nCatalog.Traduire(b.name_i18n.key, p);
            }
            return MafiaCleanCity.I18n.Libelle.Gabarit("appro.etiquette.un_batiment_detruit", "un bâtiment détruit");
        }

        public static Dictionary<string, BatimentPossedeDto> ParId(BatimentPossedeDto[] batiments)
        {
            var d = new Dictionary<string, BatimentPossedeDto>();
            if (batiments == null) return d;
            foreach (BatimentPossedeDto b in batiments)
                if (b != null && !string.IsNullOrEmpty(b.building)) d[b.building] = b;
            return d;
        }

        /// <summary>Un maillon tel qu'il s'affiche. `Vers` : le nom du bâtiment vers lequel il refoule, SEULEMENT si `has_arrow` (la flèche
        /// suit cette clé et rien d'autre — cadre 154, P1 du juge) ; sinon null.</summary>
        public sealed class Maillon
        {
            public string Id, Nom, Bande, Mot, Vers;
            public int Rang;
        }

        /// <summary>Une liaison telle qu'elle s'affiche. `Contournee` = `bypassed` (trait tireté + « contournée »). `EnEntretien` = « en entretien » : `legs[].maintaining`
        /// SERVI et vrai (TD-1047), et JAMAIS avec « contournée » (juge ㉚ E3 : un contournement n'est pas un entretien en cours) — si le corps porte les deux,
        /// la contournée (déjà servie) garde la place.</summary>
        public sealed class Liaison
        {
            public string Id, Origine, Destination, Bande, Mot;
            public int Rang;
            public bool Contournee, EnEntretien;
        }

        /// <summary>Une route telle qu'elle s'affiche (cadre 159, `poser-chaine-routes.py`) : les deux noms, l'état (mot + rang de teinte), les deux bandes (sinuosité,
        /// effondrement : mot + rang de teinte) et `EnReconstruction` = `rebuilding` SERVI (qualitatif — jamais le compte à rebours).</summary>
        public sealed class Route
        {
            public string Id, Origine, Destination, Etat, MotEtat, MotSinuosite, MotEffondrement;
            public int RangOrdre, RangEtat, RangEffondrement;   // RangOrdre : la place dans la liste (state) ; RangEtat : la teinte du mot
            public Teinte TeinteSinuosite, TeinteEffondrement;
            public bool EnReconstruction;
        }

        private static readonly System.Globalization.CompareInfo Francais = System.Globalization.CultureInfo.GetCultureInfo("fr-FR").CompareInfo;
        private static int ParNom(string a, string b) => Francais.Compare(a ?? "", b ?? "", System.Globalization.CompareOptions.None);

        /// <summary>Les maillons dans l'ordre d'affichage : rang de bande (pire → meilleure), puis nom AFFICHÉ (fr-FR), puis l'id (ordre
        /// TOTAL : deux bâtiments détruits ont le même nom). Liste vide si rien n'est servi.</summary>
        public static List<Maillon> Maillons(SupplyChainNodeDto[] nodes, IReadOnlyDictionary<string, BatimentPossedeDto> parId)
        {
            var l = new List<Maillon>();
            if (nodes == null) return l;
            foreach (SupplyChainNodeDto n in nodes)
            {
                if (n == null) continue;
                l.Add(new Maillon
                {
                    Id = n.building_id ?? "",
                    Nom = NomDuBatiment(n.building_id, parId),
                    Bande = n.bucket,
                    Mot = MotPression(n.bucket),
                    Rang = RangPression(n.bucket),
                    Vers = n.has_arrow ? NomDuBatiment(n.arrow_to_building_id, parId) : null,
                });
            }
            l.Sort((a, b) =>
            {
                int c = a.Rang.CompareTo(b.Rang);
                if (c == 0) c = ParNom(a.Nom, b.Nom);
                if (c == 0) c = string.CompareOrdinal(a.Id, b.Id);
                return c;
            });
            return l;
        }

        /// <summary>Les liaisons dans l'ordre d'affichage : rang de dette (Rompu → Entretenu), puis origine, puis destination (noms affichés),
        /// puis `leg_id`.</summary>
        public static List<Liaison> Liaisons(SupplyChainLegDto[] legs, IReadOnlyDictionary<string, BatimentPossedeDto> parId)
        {
            var l = new List<Liaison>();
            if (legs == null) return l;
            foreach (SupplyChainLegDto g in legs)
            {
                if (g == null) continue;
                l.Add(new Liaison
                {
                    Id = g.leg_id ?? "",
                    Origine = NomDuBatiment(g.origin_building_id, parId),
                    Destination = NomDuBatiment(g.destination_building_id, parId),
                    Bande = g.debt_bucket,
                    Mot = MotDette(g.debt_bucket),
                    Rang = RangDette(g.debt_bucket),
                    Contournee = g.bypassed,
                    EnEntretien = g.MaintainingServi && g.maintaining && !g.bypassed,
                });
            }
            l.Sort((a, b) =>
            {
                int c = a.Rang.CompareTo(b.Rang);
                if (c == 0) c = ParNom(a.Origine, b.Origine);
                if (c == 0) c = ParNom(a.Destination, b.Destination);
                if (c == 0) c = string.CompareOrdinal(a.Id, b.Id);
                return c;
            });
            return l;
        }

        // ── les routes (cadre 159) : `state` draft|active|saturated|severed (`draft` n'a AUCUN écrivain en production — juge E1 : jamais dessiné), sinuosité
        //    pristine|stressed|critical|severed, effondrement distant|approaching|imminent|na. Couleurs : la MÊME échelle que les bandes du cadre 154 (aucune
        //    couleur neuve) ; le `na` de l'effondrement est neutre `#91876e` (`#8a8069` ne fait que 4,43:1 sur le fond de ligne). ──

        /// <summary>Le rang d'ORDRE d'une route : `severed` → `saturated` → `active` (règle d'affichage du CLIENT, ratifiée f2 11/11 ; le back n'en sert aucun). Hors domaine ⇒ en dernier.</summary>
        public static int RangEtatDeRoute(string state)
        {
            switch (state)
            {
                case "severed": return 0;
                case "saturated": return 1;
                case "active": return 2;
                default: return RangHorsDomaine;
            }
        }

        /// <summary>Le rang de TEINTE d'un état de route (échelle du cadre 154 : 0 rouge · 1 orange · 2 or · 3 vert) : coupée rouge, saturée orange, ouverte verte.</summary>
        public static int RangDeTeinteDEtat(string state)
        {
            switch (state)
            {
                case "severed": return 0;
                case "saturated": return 1;
                case "active": return 3;
                default: return RangHorsDomaine;
            }
        }

        public static int RangEffondrement(string bucket)
        {
            switch (bucket)
            {
                case "imminent": return 0;
                case "approaching": return 1;
                case "distant": return 2;
                case "na": return 3;
                default: return RangHorsDomaine;
            }
        }

        public static Teinte TeinteDeSinuosite(string bucket)
        {
            switch (bucket)
            {
                case "severed": return TeinteDeRang(0);
                case "critical": return TeinteDeRang(1);
                case "stressed": return TeinteDeRang(2);
                case "pristine": return TeinteDeRang(3);
                default: return TeinteDeRang(RangHorsDomaine);
            }
        }

        public static Teinte TeinteDEffondrement(string bucket)
        {
            switch (bucket)
            {
                case "imminent": return TeinteDeRang(1);
                case "approaching": return TeinteDeRang(2);
                case "distant": return TeinteDeRang(3);
                case "na": return Teinte.Hex("#91876e");
                default: return TeinteDeRang(RangHorsDomaine);
            }
        }

        /// <summary>Le mot d'un état de route : clé = la VALEUR servie (`appro.etat.active|saturated|severed`, NEUFS ratifiés f2 11/11 — TD-1048, non servis) ; hors domaine ⇒ le mot générique.</summary>
        public static string MotEtatDeRoute(string state)
        {
            switch (state)
            {
                case "active": return MafiaCleanCity.I18n.Libelle.ParValeur("appro", "etat", "active", "Ouverte");
                case "saturated": return MafiaCleanCity.I18n.Libelle.ParValeur("appro", "etat", "saturated", "Saturée");
                case "severed": return MafiaCleanCity.I18n.Libelle.ParValeur("appro", "etat", "severed", "Coupée");
                default: return MafiaCleanCity.I18n.Repli.Etat(state);
            }
        }

        /// <summary>Le mot de sinuosité : clé = la VALEUR servie (`appro.sinuosite.*`, BACK-1 `lot/chaine-bandes-2` @1845e0e8, servis au cumul `74c5a0b0` — REUSE ; repli = le FR servi, compté).</summary>
        public static string MotSinuosite(string bucket)
        {
            switch (bucket)
            {
                case "pristine": return MafiaCleanCity.I18n.Libelle.ParValeur("appro", "sinuosite", "pristine", "Droit au but");
                case "stressed": return MafiaCleanCity.I18n.Libelle.ParValeur("appro", "sinuosite", "stressed", "Ça fait des détours");
                case "critical": return MafiaCleanCity.I18n.Libelle.ParValeur("appro", "sinuosite", "critical", "Que des détours");
                case "severed": return MafiaCleanCity.I18n.Libelle.ParValeur("appro", "sinuosite", "severed", "La route est coupée");
                default: return MafiaCleanCity.I18n.Repli.Etat(bucket);
            }
        }

        /// <summary>Le mot d'effondrement : clé = la VALEUR servie (`appro.effondrement.*`, mêmes sources).</summary>
        public static string MotEffondrement(string bucket)
        {
            switch (bucket)
            {
                case "distant": return MafiaCleanCity.I18n.Libelle.ParValeur("appro", "effondrement", "distant", "Ça tient encore");
                case "approaching": return MafiaCleanCity.I18n.Libelle.ParValeur("appro", "effondrement", "approaching", "Ça ne tiendra pas longtemps");
                case "imminent": return MafiaCleanCity.I18n.Libelle.ParValeur("appro", "effondrement", "imminent", "Ça va lâcher");
                case "na": return MafiaCleanCity.I18n.Libelle.ParValeur("appro", "effondrement", "na", "On ne sait pas encore");
                default: return MafiaCleanCity.I18n.Repli.Etat(bucket);
            }
        }

        /// <summary>Les routes dans l'ordre d'affichage : état (coupée → saturée → ouverte), puis effondrement (imminent → na), puis nom de l'origine (fr-FR), puis destination, puis
        /// `route_id` (ordre TOTAL). Une route `draft` n'est PAS rendue (E1 : aucun écrivain, aucun mot ratifié). Liste vide si rien n'est servi.</summary>
        public static List<Route> Routes(SupplyChainRouteDto[] routes, IReadOnlyDictionary<string, BatimentPossedeDto> parId)
        {
            var l = new List<Route>();
            if (routes == null) return l;
            foreach (SupplyChainRouteDto r in routes)
            {
                if (r == null || r.state == "draft") continue;
                l.Add(new Route
                {
                    Id = r.route_id ?? "",
                    Origine = NomDuBatiment(r.origin_building_id, parId),
                    Destination = NomDuBatiment(r.destination_building_id, parId),
                    Etat = r.state,
                    MotEtat = MotEtatDeRoute(r.state),
                    RangOrdre = RangEtatDeRoute(r.state),
                    RangEtat = RangDeTeinteDEtat(r.state),
                    MotSinuosite = MotSinuosite(r.sinuosity_stress_bucket),
                    TeinteSinuosite = TeinteDeSinuosite(r.sinuosity_stress_bucket),
                    MotEffondrement = MotEffondrement(r.time_to_collapse_bucket),
                    TeinteEffondrement = TeinteDEffondrement(r.time_to_collapse_bucket),
                    RangEffondrement = RangEffondrement(r.time_to_collapse_bucket),
                    EnReconstruction = r.rebuilding,
                });
            }
            l.Sort((a, b) =>
            {
                int c = a.RangOrdre.CompareTo(b.RangOrdre);
                if (c == 0) c = a.RangEffondrement.CompareTo(b.RangEffondrement);
                if (c == 0) c = ParNom(a.Origine, b.Origine);
                if (c == 0) c = ParNom(a.Destination, b.Destination);
                if (c == 0) c = string.CompareOrdinal(a.Id, b.Id);
                return c;
            });
            return l;
        }
    }
}
