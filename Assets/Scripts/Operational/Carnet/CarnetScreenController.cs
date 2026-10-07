using System.Collections;
using System.Collections.Generic;
using System.Linq;
using UnityEngine;
using UnityEngine.UI;
using TMPro;
using MafiaCleanCity.Shell;
using MafiaCleanCity.Theme;

namespace MafiaCleanCity.Operational
{
    /// <summary>screen_c3 « Carnet » — squelette généré par Tools/nouvel-ecran.py.
    ///
    /// Patron : `ReputationScreenController` (㊲, `pilote-B` — le seul écran construit ET jugé
    /// par juge-visuel ET juge-données). Ce squelette pose le contrat `IShellTenant`, un fond
    /// CanvasRenderer-safe et un résolveur exhaustif d'exemple ; il NE POSE PAS la géométrie de
    /// la maquette — ça, c'est `// MÉTIER ICI`, une fois la maquette lue.
    ///
    /// GÉOMÉTRIE — deux règles héritées, non négociables (mesurées ailleurs dans ce dépôt) :
    ///  · aucune valeur dérivée de `Screen.*` ni d'un `rect` lu au montage — passer par
    ///    `EchelleMaquette.Px(...)` avec la largeur DÉCLARÉE de LA maquette de cet écran
    ///    (`EchelleMaquette.LargeurEcransBrennar` = 300 par défaut pour les écrans de la famille
    ///    `ecrans-brennar.html` — // MÉTIER ICI : vérifier laquelle des 3 maquettes est la
    ///    source, ou ajouter une constante `Largeur<Nom>` si c'en est une quatrième).
    ///  · `Canvas.scaleFactor` lu la frame de la création rend 1,0 — plausible et faux. Toute
    ///    lecture de géométrie attend `yield return null` après la construction.</summary>
    public class CarnetScreenController : MonoBehaviour, IShellTenant
    {
        [Header("Backend")]
        private string baseUrlPose;   // posée par un appelant (tests, shell) ; sinon la source unique
        private string baseUrl { get => baseUrlPose ?? MafiaCleanCity.AdresseDuBack.Url; set => baseUrlPose = value; }
        // ---- points d'injection du shell (IShellTenant) -----------------------------------
        private Transform mountParent;
        /// <summary>⛔ CE POINT D'INJECTION CONSTRUIT — ET C'EST LE CORRECTIF (mesuré 2026-09-02).
        /// Le gabarit appelait <c>EnsureInitialized()</c> depuis <c>Awake()</c>. Or <c>Awake</c>
        /// s'exécute SYNCHRONEMENT DANS <c>AddComponent&lt;T&gt;()</c>, donc AVANT que l'appelant
        /// ait pu poser le parent : la racine n'a pas encore de largeur, et <c>BuildLayout()</c>
        /// mesure zéro. Symptôme observé sur un écran réel : textes empilés au centre, ce qui
        /// ressemble à un défaut de mise en page alors que c'est un défaut d'ORDRE.
        /// ⇒ *Le shell, lui, fait déjà le bon ordre à ses trois sites de montage (parent, puis
        /// géométrie, puis <c>AddComponent</c> en DERNIER) — le défaut n'était pas chez lui, il
        /// était dans ce gabarit, donc dans les 46 écrans qu'il reste à générer.*
        /// La construction se déclenche donc quand le parent est CONNU, pas quand l'objet naît.</summary>
        public void SetMountParent(Transform parent)
        {
            mountParent = parent;

            // ⛔⛔ LES DEUX GESTES CI-DESSOUS SONT UN CORRECTIF MESURÉ (2026-09-03, écran ㉜),
            // et ce gabarit produit les écrans qui restent : sans eux, CHACUN naîtrait avec le
            // même défaut. Le gabarit faisait bâtir la racine sous `mountParent` (= `ContentSlot`) :
            // elle devenait un FRÈRE de l'hôte du locataire au lieu de son enfant. La garde d'ordre
            // de fratrie de la planche l'a dit au premier montage réel — « frère 18 sur 20 — ce qui
            // se dessine PAR DESSUS : [19] <Nom>Root graphics=52 ». L'écran était complet et se
            // recouvrait LUI-MÊME : la garde mesurait l'hôte, le dessin vivait sur la racine.
            // ⇒ Les écrans qui passent déjà sous le shell (`Shop`, `Settings`, …) font tous
            //   l'inverse : hôte étiré au conteneur, hôte DERNIER, racine sous l'hôte.

            // (1) L'hôte remplit son conteneur. Sans ça son rect reste à 100×100 — la taille par
            // défaut d'un RectTransform neuf — et tout ce qu'on bâtit dessous tient dans 100 px,
            // sans la moindre erreur console.
            // ⛔⛔ L'HÔTE N'EST PAS UN `RectTransform` — ET LA RÈGLE EXACTE A ÉTÉ MESURÉE.
            // `AppShell.ConstruireLocataire` crée l'hôte par `new GameObject($"Tenant_...")`,
            // donc avec un `Transform` NU. Les écrans qui en ont quand même un ne l'ont pas
            // reçu : ils l'ont PROVOQUÉ, en posant un `Graphic` directement sur l'hôte — Unity
            // convertit alors le Transform toute seule.
            // ⇒ **L'hôte est un `RectTransform` si et seulement si l'écran dessine dessus.**
            //   Cet écran-ci dessine dans un ENFANT de l'hôte, donc la conversion n'arriverait
            //   jamais : le harnais de capture rendrait « n'est pas un RectTransform », et un
            //   cast dur rendrait une `InvalidCastException` nue (mesuré, run r2 et run 3).
            // ⇒ On la demande donc EXPLICITEMENT, plutôt que de compter sur un effet de bord de
            //   quelqu'un d'autre. Un `RectTransform` ajouté ici remplace le `Transform` — c'est
            //   l'opération prévue par Unity pour exactement ce cas.
            RectTransform rtHote = transform as RectTransform;
            if (rtHote == null) rtHote = gameObject.AddComponent<RectTransform>();
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

        // ---- crochets de test ---------------------------------------------------------------
        public CarnetCourantDto DernierChargement { get; private set; }
        /// <summary>Le code rendu par `named-sequences` — 403 MESURÉ sur un compte frais.
        /// ⚠️ Ce n'est PAS une erreur à masquer : c'est le verrou que le cadre m-89 demande de
        /// MONTRER. Zéro = pas encore demandé.</summary>
        public long CodeSuitesNommees { get; private set; }
        /// <summary>Vrai dès que l'écran a FINI de se rendre — succès, vide ou repli.</summary>
        public bool RenduTermine { get; private set; }
        /// <summary>C8 — le calendrier politique servi ; null tant que non lu, ou si la route n'a pas répondu.</summary>
        public CalendrierPolitiqueDto DernierCalendrier { get; private set; }
        public string DerniereErreur { get; private set; }
        public long DernierCodeErreur { get; private set; }

        private RectTransform racinePleinEcran;
        // ⛔ `JournalClient` — LE PRODUCTEUR DES ROUTES `ambient`, déjà écrit pour ㊳ et
        // déjà MESURÉ (200 sur `/v1/ambient/feed`). Le générateur m'en avait fabriqué un second
        // avec des DTO en double ; le compilateur l'a dit avant le premier run, comme pour ㊵.
        private CarnetClient client;
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
            // ⛔ RÉPÉTÉ ICI, ET CE N'EST PAS UNE REDONDANCE. Le shell ajoute des enfants à
            // `ContentSlot` APRÈS la fenêtre synchrone du montage — mesuré ailleurs dans ce dépôt :
            // « frère 6 sur 11 » restait inchangé quand l'ordre n'était posé qu'au montage.
            // `Start()` court à la frame SUIVANTE : c'est le premier instant où « être dernier »
            // est stable.
            if (transform.parent != null) transform.SetAsLastSibling();
            EnsureInitialized();
            amorce = StartCoroutine(Amorcer());
        }

        /// <summary>Charger dès le montage — sans cet appel, `Charger()` n'a AUCUN appelant et
        /// l'écran reste sur son état initial pour toujours.
        ///
        /// ⛔⛔ TROISIÈME FOIS. ㊴ l'a payé, ㊵ porte déjà ce commentaire mot pour mot — et j'ai
        /// bâti ㉞ sans l'appel. Ce qui l'a rendu invisible : `BuildLayout()` construit un écran
        /// COMPLET et NOMMÉ (« le carnet n'a pas encore été ouvert », les 8 créneaux dessinés),
        /// donc la capture isolée est belle, remplie, et parfaitement plausible. *Un état initial
        /// bien fait ressemble à un écran qui fonctionne ; c'est ce qui le rend indétectable à
        /// l'œil.* Aucune de mes gardes structurelles ni ma photo isolée ne pouvaient le voir :
        /// elles n'attendaient aucune donnée, donc elles n'ont rien manqué.
        /// ⇒ C'est la capture SOUS CHROME qui l'a trouvé, en refusant de photographier tant que
        ///   `RenduTermine` était faux. La garde qui refuse de mesurer vaut mieux que la mesure
        ///   qui rassure.</summary>
        private IEnumerator Amorcer()
        {
            if (string.IsNullOrEmpty(token)) yield break;   // hors session : état initial NOMMÉ
            if (corpsImposeParUnTest) yield break;          // un test tient l'écran
            yield return Charger();
        }

        private void EnsureInitialized()
        {
            if (initialise) return;
            initialise = true;
            client = new CarnetClient { BaseUrl = baseUrl };
            BuildLayout();
        }

        // ═══ Chargement ══════════════════════════════════════════════════════════════════════

        /// <summary>Charge la surface. // MÉTIER ICI si `GetAmbientFeed` a des paramètres
        /// de chemin (id, etc.) — ajouter les arguments correspondants ici et les faire
        /// remonter depuis l'appelant (le shell, ou un `RendrePourTest`).</summary>
        public IEnumerator Charger()
        {
            EnsureInitialized();
            DerniereErreur = null;
            DernierCodeErreur = 0;

            // ⛔ SANS CETTE LIGNE, LA CONVERSION i18n EST INERTE. `Libelle.De` rend son LITTÉRAL
            // tant que `I18nCatalog` est vide, donc un écran « converti » qui n'amorce jamais le
            // dictionnaire affiche exactement ce qu'il affichait avant — et ses captures sont
            // belles, françaises, et ne prouvent rien.
            // ★ *Convertir et amorcer sont deux gestes.* Le premier est visible dans le diff, le
            //   second ne l'est nulle part : rien ne rougit quand il manque, puisque le repli est
            //   byte-identique au texte d'origine. C'est la même famille que « deux populations
            //   disjointes » — la garantie qui rendait la conversion sûre est ce qui a caché
            //   qu'elle ne servait à rien. Mesuré le 2026-09-04 : AUCUN de mes 7 écrans convertis
            //   n'amorçait, sur les 6 du dépôt qui le font.
            yield return MafiaCleanCity.I18n.I18nCatalog.Amorcer(
                new MafiaCleanCity.I18n.I18nClient { BaseUrl = baseUrl }, token);

            RenduTermine = false;

            yield return client.GetCarnetCourant(token,
                dto => DernierChargement = dto,
                (code, msg) => { DernierCodeErreur = code; DerniereErreur = msg; });

            // ⛔ LE 403 EST UNE RÉPONSE, PAS UN ÉCHEC. `named-sequences` rend 403 tant que le
            // palier 2 n'est pas atteint (`NAMED_SEQUENCE_UNLOCK_REQUIRED`, mesuré). On garde le
            // CODE pour le montrer verrouillé — le cadre m-89 dessine cette fonction, et la
            // cacher effacerait ce que le joueur doit apprendre à débloquer.
            yield return client.GetSuitesNommees(token,
                _ => CodeSuitesNommees = 200,
                (code, msg) => CodeSuitesNommees = code);

            // C8 — ce que la ville prépare : servi (200 mesuré), plus jamais « personne ne vous le rapporte ».
            DernierCalendrier = null;
            yield return client.GetCalendrierPolitique(token, c => DernierCalendrier = c, (code, msg) => { });

            // La frame de création rend des rects non résolus : on attend le layout AVANT de
            // rendre quoi que ce soit qui lise une géométrie.
            yield return null;

            if (DernierChargement == null) { RendreEtatIndisponibleNomme(); RenduTermine = true; yield break; }
            yield return LireLesCibles();
            AppliquerEtat(DernierChargement);
            RenduTermine = true;
        }

        // ═══ ㉞ LE COMPOSEUR (commande f2 26/09, table 73) ═══════════════════════════════════════════════════════════════════
        // `compose` exige 4 à 8 ordres D'UN COUP : le carnet se garde ICI jusqu'à 4, puis compose, puis commit.

        /// <summary>Les cibles posables par type (`ComposeurDuCarnet.CiblesEligibles`, TD-764) ; null tant que non lues.</summary>
        public Dictionary<string, List<CibleDuCarnet>> Cibles { get; private set; }
        public ComposeurDuCarnet.Brouillon Brouillon { get; } = new ComposeurDuCarnet.Brouillon();
        /// <summary>null : composeur fermé ; "" : étape 1 (« Quel ordre ? ») ; un type : étape 2 (« Sur quoi ? »).</summary>
        public string EtapeDuComposeur { get; private set; }
        public int LigneEnMain { get; private set; } = -1;
        public string DernierRefus { get; private set; }
        public bool ConfirmationDemandee { get; private set; }
        public int Compositions { get; private set; }
        public int Lancements { get; private set; }
        private bool envoiEnCours;

        /// <summary>Les 4 sources de cibles (mesure du 26/09, back @1ffb08b4) — lues seulement quand aucun carnet n'est servi.</summary>
        private IEnumerator LireLesCibles()
        {
            if (DernierChargement.slots != null && DernierChargement.slots.Length > 0) yield break;
            BatimentPossedeDto[] batiments = null;
            RouteSauveeDto[] routes = null;
            MafiaCleanCity.Operational.Exceptions.ExceptionCardDto[] ardoises = null;
            CandidatDto[] candidats = null;
            yield return new MesBatimentsClient { BaseUrl = baseUrl }.Lire(token, b => batiments = b, (c, m) => { });
            yield return client.GetRoutesSauvees(token, r => routes = r);
            yield return new MafiaCleanCity.Operational.Exceptions.ExceptionsClient { BaseUrl = baseUrl }.GetQueue(token, q => ardoises = q, (c, m) => { });
            if (ComposeurDuCarnet.RecruterOffert) yield return client.GetCandidats(token, k => candidats = k);
            Cibles = ComposeurDuCarnet.CiblesEligibles(batiments, routes, ardoises, candidats);
        }

        /// <summary>Rend le composeur sur un carnet vide SERVI et des cibles FABRIQUÉES — réservé aux tests (aucun réseau).</summary>
        public void RendreComposeurPourTest(Dictionary<string, List<CibleDuCarnet>> cibles)
        {
            Cibles = cibles;
            RendrePourTest(new CarnetCourantDto { slots = new CueSlotDto[0] });
        }

        public void OuvrirLeComposeur() { if (!Brouillon.Plein) { EtapeDuComposeur = ""; DernierRefus = null; RendreDeNouveau(); } }
        public void FermerLeComposeur() { EtapeDuComposeur = null; RendreDeNouveau(); }

        /// <summary>Étape 1 → 2. Un type OFFERT et qui a au moins une cible ; sinon rien (aucun geste qui ne peut aboutir).</summary>
        public void ChoisirType(string slotType)
        {
            if (!ComposeurDuCarnet.TypesOfferts().Contains(slotType) || CiblesDe(slotType).Count == 0) return;
            EtapeDuComposeur = slotType;
            RendreDeNouveau();
        }

        public void Choisir(CibleDuCarnet c)
        {
            if (!Brouillon.Poser(c)) return;
            EtapeDuComposeur = null;
            DernierRefus = null;
            RendreDeNouveau();
        }

        public void RetirerLigne(int i) { Brouillon.Retirer(i); LigneEnMain = -1; DernierRefus = null; ConfirmationDemandee = false; RendreDeNouveau(); }

        /// <summary>« appui long pour déplacer » : la ligne est prise en main, puis posée sur la ligne touchée ensuite.</summary>
        public void PrendreEnMain(int i) { LigneEnMain = i >= 0 && i < Brouillon.Compte ? i : -1; RendreDeNouveau(); }
        public void PoserIci(int j)
        {
            if (LigneEnMain < 0) return;
            Brouillon.Deplacer(LigneEnMain, j);
            LigneEnMain = -1;
            ConfirmationDemandee = false;
            RendreDeNouveau();
        }

        private List<CibleDuCarnet> CiblesDe(string t) =>
            Cibles != null && Cibles.TryGetValue(t, out List<CibleDuCarnet> l) ? l : new List<CibleDuCarnet>();

        /// <summary>« Lancer la soirée » : compose (4 à 8 d'un coup), puis commit. SETTLING_COMPOUND_REQUIRED ⇒ la confirmation
        /// servie ; « Y aller quand même » renvoie commit avec l'acquittement. Tout autre refus parle par la table 73.</summary>
        public IEnumerator LancerLaSoiree()
        {
            if (!Brouillon.PeutLancer || envoiEnCours) yield break;
            envoiEnCours = true;
            DernierRefus = null;
            CarnetClient.Envoi compose = null;
            yield return client.Composer(Brouillon.Corps(), token, e => compose = e);
            Compositions++;
            if (this == null) yield break;
            if (compose == null || !compose.Ok) { Refuser(compose); yield break; }
            yield return Commettre(false);
        }

        public IEnumerator YAllerQuandMeme()
        {
            if (!ConfirmationDemandee || envoiEnCours) yield break;
            envoiEnCours = true;
            yield return Commettre(true);
        }

        private IEnumerator Commettre(bool acquitter)
        {
            CarnetClient.Envoi commit = null;
            yield return client.Lancer(acquitter, token, e => commit = e);
            Lancements++;
            if (this == null) yield break;
            if (commit != null && !commit.Ok && ComposeurDuCarnet.Code(commit.Corps) == ComposeurDuCarnet.CodeConfirmation)
            {
                ConfirmationDemandee = true;
                envoiEnCours = false;
                RendreDeNouveau();
                yield break;
            }
            if (commit == null || !commit.Ok) { Refuser(commit); yield break; }
            ConfirmationDemandee = false;
            Brouillon.Vider();
            envoiEnCours = false;
            DernierChargement = commit.Carnet ?? DernierChargement;
            AppliquerEtat(DernierChargement);
        }

        private void Refuser(CarnetClient.Envoi e)
        {
            DernierRefus = ComposeurDuCarnet.PhraseDuRefus(e?.Corps);
            ConfirmationDemandee = false;
            envoiEnCours = false;
            RendreDeNouveau();
        }

        private void RendreDeNouveau() { if (DernierChargement != null) AppliquerEtat(DernierChargement); }

        /// <summary>Rend un corps FABRIQUÉ, sans réseau — réservé aux tests (patron ㊲,
        /// `RendrePourTest`). Ne prouve jamais que le back émet ce corps, seulement ce que
        /// l'écran EN FAIT.</summary>
        /// <summary>⛔ FERME LA COURSE ENTRE `Start()` ET LE RENDU DE TEST. Une suite qui pose un
        /// VRAI jeton puis appelle cette méthode laisse `Amorcer()` partir en parallèle :
        /// l'auto-chargement rendrait les données réelles PAR-DESSUS le corps fabriqué.
        /// ⚠️ Le garde-fou `IsNullOrEmpty(token)` ne couvre PAS ce cas — il protège l'écran monté
        /// hors session, pas celui à qui un test donne une identité PUIS impose un corps.
        /// ⚠️ Et le drapeau seul ne suffit pas : si la coroutine est déjà dans son appel réseau,
        /// elle appliquera son état — `Charger()` le fait dans PLUSIEURS branches. *Fermer une
        /// course en demandant à l'autre de renoncer suppose qu'il repasse par un point où on
        /// peut le lui dire.* `StopCoroutine` ne le suppose pas.</summary>
        private bool corpsImposeParUnTest;
        private Coroutine amorce;

        public void RendrePourTest(CarnetCourantDto dto)
        {
            corpsImposeParUnTest = true;
            if (amorce != null) { StopCoroutine(amorce); amorce = null; }
            EnsureInitialized();
            AppliquerEtat(dto);
        }

        /// <summary>// MÉTIER ICI — TOUT le rendu métier de cet écran part d'ici. Vide à
        /// dessein : remplir depuis la maquette RATIFIÉE et le corps RÉEL mesuré, jamais depuis
        /// une supposition sur ce que l'interface TypeScript back "devrait" rendre.</summary>
        /// <summary>L'état AVANT tout chargement — le troisième, celui qu'on oublie.
        /// ⚠️ TROIS états donnent un carnet à huit lignes vides, et rien ne les distingue à
        /// l'image : « pas encore demandé », « demandé et vide », « pas de réponse ». Les
        /// confondre fait passer une panne pour une soirée sans ordres.</summary>
        private void RendreEtatInitial()
        {
            titreEcran.text = MafiaCleanCity.I18n.Libelle.Gabarit("carnet.bloc.les_ordres_de_ce_soir", "Les ordres à lancer");   // table 80 @20ceeca0 : la valeur servie réécrite (le geste part tout de suite — mesure back), clé gardée
            sousTitre.text = Lib("le carnet n'a pas encore été ouvert");
            compte.text = "";
            ViderCreneaux();
            for (int i = 1; i <= 8; i++) Creneau(i, null, null);
            MajPanneau(Lib("CE QU'ON SAIT POUR L'INSTANT"),
                Lib("Rien n'a encore été demandé"),
                Lib("ce n'est ni « aucun ordre » ni « pas de réponse », c'est « pas encore »."));
        }

        private void RendreEtatIndisponibleNomme()
        {
            titreEcran.text = MafiaCleanCity.I18n.Libelle.Gabarit("carnet.bloc.les_ordres_de_ce_soir", "Les ordres à lancer");   // table 80 @20ceeca0 : la valeur servie réécrite (le geste part tout de suite — mesure back), clé gardée
            sousTitre.text = Lib("le carnet n'a pas répondu");
            compte.text = "";
            ViderCreneaux();
            for (int i = 1; i <= 8; i++) Creneau(i, null, null);
            MajPanneau(Lib("CE QU'ON SAIT VRAIMENT"), Lib("Pas de réponse"),
                Lib("on n'a pas eu de réponse. Ce n'est pas « la soirée est vide » : c'est « on ne "
                    + "sait pas ce qui est prévu »."));
        }

        private void AppliquerEtat(CarnetCourantDto dto)
        {
            DernierChargement = dto;
            CueSlotDto[] servis = dto != null && dto.slots != null ? dto.slots.OrderBy(x => x.drag_order).ToArray() : new CueSlotDto[0];
            bool composer = servis.Length == 0;
            int n = composer ? Brouillon.Compte : servis.Length;

            titreEcran.text = MafiaCleanCity.I18n.Libelle.Gabarit("carnet.bloc.les_ordres_de_ce_soir", "Les ordres à lancer");   // table 80 @20ceeca0 : la valeur servie réécrite (le geste part tout de suite — mesure back), clé gardée
            sousTitre.text = n == 0
                ? Lib("aucun ordre posé — entre quatre et huit, dans l'ordre où ils partiront")
                : Lib("entre quatre et huit gestes, dans l'ordre où ils partiront");
            compte.text = n + Lib(" ORDRES SUR 8");

            ViderCreneaux();
            // ⛔ LES HUIT SONT TOUJOURS DESSINÉS. Le plafond donne sa forme au geste, et masquer
            // les vides ferait croire le carnet plein. Un créneau SERVI se nomme par son type (`carnet.ordre.*`) ; sa cible, seulement
            // si elle est connue des sources lues — jamais un nom inventé.
            for (int i = 1; i <= 8; i++)
            {
                if (!composer)
                {
                    CueSlotDto sl = i <= servis.Length ? servis[i - 1] : null;
                    Creneau(i, sl == null ? null : NomServi(sl.slot_type), sl == null ? null : CibleConnue(sl)?.Libelle());
                    continue;
                }
                CibleDuCarnet c = i <= Brouillon.Compte ? Brouillon.Lignes[i - 1] : null;
                GameObject ligne = Creneau(i, c == null ? null : ComposeurDuCarnet.NomDuType(c.SlotType), c?.Libelle());
                BrancherLigne(ligne, i - 1, c);
            }
            RendreComposeur(composer);

            if (CodeSuitesNommees == 403)
            {
                // ⛔ LE VERROU SE MONTRE, IL NE SE CACHE PAS — cadre m-89. Le 403 mesuré est
                // `NAMED_SEQUENCE_UNLOCK_REQUIRED` : rejouer une soirée d'un geste s'ouvre au
                // palier 2. Masquer la fonction priverait le joueur de la seule chose qui lui
                // dise qu'elle existe.
                MajPanneau(Lib("CE QUI S'OUVRIRA PLUS TARD"),
                    Lib("Rejouer une soirée — verrouillé"),
                    Lib("une suite d'ordres qu'on met de côté et qu'on relance d'un geste. Cette "
                        + "façon de faire s'ouvre plus tard — il faut d'abord monter d'un palier."));
                return;
            }

            // C8 (passe UX 2026-09-24) — le cadre m-91 « Ce qui arrive ». ⛔ L'ÉNONCÉ D'AVANT ÉTAIT DATÉ : « personne ne vous le
            // rapporte » reposait sur quatre chemins en 404 le 03/09 ; `political-events/calendar` rend 200 (route joueur depuis
            // e40f4142). Il désarmait l'information qu'il prétendait absente. Désormais : ce qui est EN COURS, puis ce qui est
            // ANNONCÉ, par leur nom — et AUCUNE date (m-91 : « le calendrier ne donne aucune date »).
            RendreCeQuiArrive();

        }

        private static string NomServi(string slotType) =>
            ComposeurDuCarnet.TypesLive.Contains(slotType) ? ComposeurDuCarnet.NomDuType(slotType) : null;

        private CibleDuCarnet CibleConnue(CueSlotDto sl) =>
            sl?.target_ref == null || Cibles == null || !Cibles.TryGetValue(sl.slot_type ?? "", out List<CibleDuCarnet> l)
                ? null : l.FirstOrDefault(c => c.Id == sl.target_ref.id);

        /// <summary>Les gestes d'une ligne du brouillon : Retirer ; appui long pour prendre en main ; toucher pour poser la ligne en
        /// main ; la PREMIÈRE ligne vide ouvre le composeur (« — rien — » devient touchable, table 73).</summary>
        private void BrancherLigne(GameObject ligne, int index, CibleDuCarnet c)
        {
            if (ligne == null) return;
            if (c != null)
            {
                // la ligne reçoit les appuis (AppuiLong) : un fond — teinté si elle est en main, transparent sinon
                AjouterFond(ligne, LigneEnMain == index ? CouleurEnMain : new Color(0f, 0f, 0f, 0f)).raycastTarget = true;
                if (LigneEnMain >= 0 && LigneEnMain != index) AjouterToucher(ligne, () => PoserIci(index));
                var appui = ligne.AddComponent<AppuiLong>();
                appui.Action = () => PrendreEnMain(index);
                NouveauBouton(ligne.transform, "Retirer", MafiaCleanCity.I18n.Libelle.Gabarit("carnet.composeur.retirer", "Retirer"),
                    () => RetirerLigne(index), false);
                return;
            }
            if (index == Brouillon.Compte && !Brouillon.Plein && EtapeDuComposeur == null)
                NouveauBouton(ligne.transform, "Poser", MafiaCleanCity.I18n.Libelle.Gabarit("carnet.composeur.poser_un_ordre", "Poser un ordre"),
                    OuvrirLeComposeur, false);
        }

        /// <summary>Le bloc du composeur, sous le carnet : l'état vide, l'étape 1, l'étape 2, le refus, la confirmation, et le pied
        /// (« Encore n ordres à poser » ou « Lancer la soirée » — ce bouton n'existe qu'à 4).</summary>
        private void RendreComposeur(bool actif)
        {
            if (composeurRoot == null) return;
            // détachés AVANT la destruction (différée à la fin de la frame) : un rendu relu dans la même frame ne voit que le neuf
            for (int i = composeurRoot.childCount - 1; i >= 0; i--)
            {
                Transform ancien = composeurRoot.GetChild(i);
                ancien.SetParent(null, false);
                UnityEngine.Object.Destroy(ancien.gameObject);
            }
            composeurRoot.SetAsLastSibling();   // sous les huit lignes, qui sont recréées à chaque rendu
            composeurRoot.gameObject.SetActive(actif);
            if (!actif) return;
            Transform r = composeurRoot;

            if (ConfirmationDemandee)
            {
                var (titre, phrase, bouton, sous) = ComposeurDuCarnet.PhrasesDeConfirmation();
                Ligne(r, "ConfirmationTitre", titre, true);
                Ligne(r, "ConfirmationPhrase", phrase, false);
                NouveauBouton(r, "YAllerQuandMeme", bouton, () => StartCoroutine(YAllerQuandMeme()), true);
                Ligne(r, "ConfirmationSous", sous, false);
                return;
            }
            if (!string.IsNullOrEmpty(DernierRefus)) Ligne(r, "Refus", DernierRefus, false);

            if (EtapeDuComposeur == "")
            {
                Ligne(r, "QuelOrdre", MafiaCleanCity.I18n.Libelle.Gabarit("carnet.composeur.quel_ordre", "Quel ordre\u202f?"), true);
                foreach (string t in ComposeurDuCarnet.TypesOfferts())
                {
                    string type = t;
                    int nb = CiblesDe(t).Count;
                    if (nb == 0)
                        Ligne(r, "Type_" + t, ComposeurDuCarnet.NomDuType(t) + " — " + MafiaCleanCity.I18n.Libelle.Gabarit(
                            "carnet.composeur.rien_a_viser_pour_l_instant", "rien \u00e0 viser pour l\u2019instant"), false);
                    else
                        NouveauBouton(r, "Type_" + t, ComposeurDuCarnet.NomDuType(t), () => ChoisirType(type), false);
                }
                return;
            }
            if (!string.IsNullOrEmpty(EtapeDuComposeur))
            {
                Ligne(r, "SurQuoi", MafiaCleanCity.I18n.Libelle.Gabarit("carnet.composeur.sur_quoi", "Sur quoi\u202f?"), true);
                foreach (CibleDuCarnet c in CiblesDe(EtapeDuComposeur))
                {
                    CibleDuCarnet cible = c;
                    string nom = c.Kind == "candidate" && c.Bandes != null && c.Bandes.Length > 0
                        ? c.Libelle() + "\n" + string.Join("\n", c.Bandes) : c.Libelle();
                    if (Brouillon.Contient(c))
                        Ligne(r, "Cible_" + c.Id, nom + " — " + MafiaCleanCity.I18n.Libelle.Gabarit("carnet.composeur.deja_dans_le_carnet", "d\u00e9j\u00e0 dans le carnet"), false);
                    else
                    {
                        Ligne(r, "Cible_" + c.Id, nom, false);
                        NouveauBouton(r, "Choisir_" + c.Id, MafiaCleanCity.I18n.Libelle.Gabarit("carnet.composeur.choisir", "Choisir"), () => Choisir(cible), false);
                    }
                }
                return;
            }

            if (Brouillon.Compte == 0)
            {
                Ligne(r, "IlFaut", MafiaCleanCity.I18n.Libelle.Gabarit("carnet.vide.il_faut_au_moins_quatre_ordres_pour_une_soiree",
                    "Il faut au moins quatre ordres pour une soir\u00e9e."), true);
                if (ComposeurDuCarnet.TotalDesCibles(Cibles) < ComposeurDuCarnet.Minimum)
                    Ligne(r, "PasEncore", MafiaCleanCity.I18n.Libelle.Gabarit("carnet.vide.pas_encore_de_quoi_remplir_une_soiree",
                        "Pas encore de quoi remplir une soir\u00e9e\u00a0: il faudra d\u2019autres locaux, des itin\u00e9raires ou des candidats."), false);
                var posables = ComposeurDuCarnet.TypesOfferts().Where(t => CiblesDe(t).Count > 0).ToList();
                if (posables.Count > 0)
                {
                    Ligne(r, "VousPouvez", MafiaCleanCity.I18n.Libelle.Gabarit("carnet.vide.vous_pouvez_deja_poser", "Vous pouvez d\u00e9j\u00e0 poser"), false);
                    foreach (string t in posables)
                        Ligne(r, "Posable_" + t, ComposeurDuCarnet.NomDuType(t) + " — " + MafiaCleanCity.I18n.Libelle.Gabarit("carnet.vide.n_cibles",
                            "{n, plural, one {# cible} other {# cibles}}", new Dictionary<string, string> { { "n", CiblesDe(t).Count.ToString() } }), false);
                }
                return;
            }
            if (Brouillon.Compte >= 2)
                Ligne(r, "AppuiLong", MafiaCleanCity.I18n.Libelle.Gabarit("carnet.composeur.appui_long_pour_deplacer", "appui long pour d\u00e9placer"), false);
            if (!Brouillon.PeutLancer)
            {
                Ligne(r, "Encore", MafiaCleanCity.I18n.Libelle.Gabarit("carnet.composeur.encore_n_ordres_a_poser",
                    "{n, plural, one {Encore un ordre \u00e0 poser} other {Encore # ordres \u00e0 poser}}",
                    new Dictionary<string, string> { { "n", Brouillon.EncoreAPoser.ToString() } }), false);
                return;
            }
            NouveauBouton(r, "Lancer", MafiaCleanCity.I18n.Libelle.Gabarit("carnet.bloc.lancer_la_soiree", "Lancer la soir\u00e9e"),
                () => StartCoroutine(LancerLaSoiree()), true);
            Ligne(r, "SansRetour", MafiaCleanCity.I18n.Libelle.Gabarit("carnet.bloc.une_fois_partie_on_ne_la_reprend_pas",
                "une fois partie, on ne la reprend pas"), false);
        }

        private void Ligne(Transform parent, string nom, string texte, bool titre) =>
            NouveauTexte(parent, nom, texte, Px(titre ? 11f : 9f), titre ? CouleurEncre : CouleurEncreFaible,
                titre ? DesignTokens.Current.hudSerifFont : DesignTokens.Current.primaryFont);

        /// <summary>Un bouton RÉEL (Image + Button + libellé) : jamais un bouton sans geste (garde O4/O5 de ②, même règle ici).</summary>
        private GameObject NouveauBouton(Transform parent, string nom, string texte, UnityEngine.Events.UnityAction action, bool principal)
        {
            GameObject go = NouveauUI("Bouton" + nom, parent);
            Image fond = AjouterImage(go);
            fond.color = principal ? CouleurEncre : CouleurPapierFonce;
            var b = go.AddComponent<Button>();
            b.targetGraphic = fond;
            b.onClick.AddListener(action);
            var le = go.AddComponent<LayoutElement>();
            le.minHeight = Px(20f); le.minWidth = Px(44f); le.flexibleWidth = 0f;
            TextMeshProUGUI t = NouveauTexte(go.transform, "Libelle", texte, Px(8.5f), principal ? CouleurPapier : CouleurEncre,
                DesignTokens.Current.primaryFont);
            t.alignment = TextAlignmentOptions.Center;
            Etirer((RectTransform)t.transform, Px(3f));
            return go;
        }

        private static void AjouterToucher(GameObject ligne, UnityEngine.Events.UnityAction action)
        {
            Image img = ligne.GetComponent<Image>();
            if (img == null) img = AjouterFond(ligne, new Color(0f, 0f, 0f, 0f));
            img.raycastTarget = true;
            var b = ligne.AddComponent<Button>();
            b.targetGraphic = img;
            b.onClick.AddListener(action);
        }

        /// <summary>Repli NOMMÉ sur échec réseau — jamais une exception, jamais un écran noir
        /// (patron ㊲ : `Render(null)` a fait planter un autre écran de ce dépôt à la première
        /// ligne qui lisait le payload).</summary>
        private void RendreEtatIndisponible()
        {
            // MÉTIER ICI — au minimum, un texte d'état ; ne PAS laisser le rendu du chargement
            // précédent affiché (même défaut qu'une liste non vidée : ㊲ l'a payé).
        }

        // ═══ Construction de la mise en page ═════════════════════════════════════════════════

        // ═══ Palette du CARNET — le papier contre la nuit ═══════════════════════════════════
        // ⛔ Ces trois teintes ne sortent pas de `DesignTokens` : elles sont propres à cet écran,
        // parce qu'il est le seul du programme à opposer un objet CHAUD (le carnet du joueur) au
        // châssis FROID (ce que la ville lui sert). Les prendre dans les jetons de surface
        // rendrait le carnet identique aux autres blocs, et l'écran perdrait son argument.
        private static readonly Color CouleurPapier      = new Color(0.898f, 0.878f, 0.816f);
        private static readonly Color CouleurEncre       = new Color(0.129f, 0.106f, 0.075f);
        private static readonly Color CouleurEncreFaible = new Color(0.404f, 0.365f, 0.302f);
        private static readonly Color CouleurPapierFonce = new Color(0.820f, 0.796f, 0.722f);   // un geste secondaire, sur le papier
        private static readonly Color CouleurEnMain      = new Color(0.851f, 0.824f, 0.741f);   // la ligne prise en main

        private RectTransform composeurRoot;

        private RectTransform listeRoot;
        private TextMeshProUGUI titreEcran, sousTitre, compte;
        private TextMeshProUGUI pannSur, pannTitre, pannTexte;

        /// <summary>Item 0.6 — les littéraux STATIQUES passent par `carnet.bloc.<slug>`.
        /// ⚠️ Le repli est FRANÇAIS, pas anglais : `Libelle.De` rend le littéral quand la clé
        /// manque, donc un repli anglais s'affiche en anglais À TRAVERS la conversion. Mesuré le
        /// 2026-09-03 : 81 de mes 107 replis étaient dans ce cas.</summary>
        private static string Lib(string litteral) =>
            MafiaCleanCity.I18n.Libelle.De("carnet", "bloc", litteral);

        private void ConstruirePanneau(Transform parent)
        {
            GameObject go = NouveauUI("Panneau", parent);
            AjouterFond(go, DesignTokens.Current.surfaceCard);
            var le = go.AddComponent<LayoutElement>();
            le.minHeight = Px(74f); le.preferredHeight = -1f; le.flexibleHeight = 0f;
            var v = go.AddComponent<VerticalLayoutGroup>();
            v.padding = new RectOffset((int)Px(10f), (int)Px(10f), (int)Px(8f), (int)Px(8f));
            v.spacing = Px(3f);
            v.childControlWidth = true; v.childControlHeight = true;
            v.childForceExpandWidth = true; v.childForceExpandHeight = false;
            pannSur = NouveauTexte(go.transform, "SurTitre", "", Px(7f),
                DesignTokens.Current.hudCremeSecondary, DesignTokens.Current.primaryFont);
            pannSur.fontStyle = FontStyles.UpperCase;   // les capitales du surtitre sont du STYLE (table 65) ; les valeurs déjà en capitales n'y perdent rien
            pannTitre = NouveauTexte(go.transform, "Titre", "", Px(12f),
                DesignTokens.Current.hudCreme, DesignTokens.Current.hudSerifFont);
            pannTexte = NouveauTexte(go.transform, "Texte", "", Px(8.5f),
                DesignTokens.Current.hudCremeSecondary, DesignTokens.Current.primaryFont);
        }

        /// <summary>C8 — les lignes de « Ce qui arrive » : (id, nom servi, en cours ?) — en cours d'abord, puis annoncé. Pure.</summary>
        public static List<(string id, string nom, bool enCours)> LignesCeQuiArrive(CalendrierPolitiqueDto c)
        {
            var lignes = new List<(string, string, bool)>();
            if (c == null) return lignes;
            foreach (EvenementPolitiqueDto e in c.active ?? new EvenementPolitiqueDto[0])
                if (e != null && !string.IsNullOrEmpty(e.eventId)) lignes.Add((e.eventId, e.name, true));
            foreach (EvenementPolitiqueDto e in c.upcoming ?? new EvenementPolitiqueDto[0])
                if (e != null && !string.IsNullOrEmpty(e.eventId)) lignes.Add((e.eventId, e.name, false));
            return lignes;
        }

        private void RendreCeQuiArrive()
        {
            if (DernierCalendrier == null)
            {
                MajPanneau(MafiaCleanCity.I18n.Libelle.Gabarit("carnet.bloc.ce_qui_arrive", "Ce qui arrive"), Lib("Ce que la ville prépare"),
                    MafiaCleanCity.I18n.Libelle.Gabarit("carnet.bloc.le_calendrier_n_a_pas_repondu", "Le calendrier n’a pas répondu."));
                return;
            }
            var lignes = LignesCeQuiArrive(DernierCalendrier);
            if (lignes.Count == 0)
            {
                MajPanneau(MafiaCleanCity.I18n.Libelle.Gabarit("carnet.bloc.ce_qui_arrive", "Ce qui arrive"), Lib("Ce que la ville prépare"),
                    MafiaCleanCity.I18n.Libelle.Gabarit("carnet.bloc.rien_n_est_annonce", "Rien n’est annoncé."));
                return;
            }
            var corps = new System.Text.StringBuilder();
            foreach (var (id, nom, enCours) in lignes)
            {
                if (corps.Length > 0) corps.Append('\n');
                // le nom : la clé SERVIE `political.event.<eventId>` (fr et en, ratifiée au staging — table 65), composée avec l'id TEL
                // QU'IL EST SERVI (casse et tiret gardés : `ParValeur` les abaisserait et ne la trouverait pas) ; le nom servi en repli
                corps.Append(MafiaCleanCity.I18n.Libelle.Gabarit(CleDEvenement(id), nom))
                     .Append(" — ").Append(enCours ? MafiaCleanCity.I18n.Libelle.Gabarit("carnet.bloc.en_cours", "en cours") : MafiaCleanCity.I18n.Libelle.Gabarit("carnet.bloc.annonce", "à venir"));
            }
            MajPanneau(MafiaCleanCity.I18n.Libelle.Gabarit("carnet.bloc.ce_qui_arrive", "Ce qui arrive"), Lib("Ce que la ville prépare"), corps.ToString());
        }

        /// <summary>C8 — la clé servie du nom d'un événement politique : « political.event. » + l'id TEL QU'IL EST SERVI.</summary>
        public static string CleDEvenement(string eventId) => "political.event." + eventId;

        private void MajPanneau(string sur, string titre, string texte)
        {
            if (pannSur == null) return;
            pannSur.text = sur; pannTitre.text = titre; pannTexte.text = texte;
        }

        private void ViderCreneaux()
        {
            if (listeRoot == null) return;
            for (int i = listeRoot.childCount - 1; i >= 0; i--)
            {
                GameObject e = listeRoot.GetChild(i).gameObject;
                if (e.name != "EnteteCarnet" && e.name != "Composeur") UnityEngine.Object.Destroy(e);
            }
        }

        /// <summary>Un créneau du carnet — REMPLI ou vide. Le cadre m-85 dessine les deux :
        /// un numéro plein et un titre pour les remplis, un numéro pâle et « — rien — » pour les
        /// vides. Les huit sont TOUJOURS dessinés : c'est le plafond qui donne sa forme au
        /// geste, et masquer les vides ferait croire que le carnet est plein.</summary>
        private GameObject Creneau(int rang, string titre, string sous)
        {
            GameObject go = NouveauUI("Creneau" + rang, listeRoot);
            var le = go.AddComponent<LayoutElement>();
            le.minHeight = Px(26f); le.preferredHeight = -1f; le.flexibleHeight = 0f;
            var h = go.AddComponent<HorizontalLayoutGroup>();
            h.padding = new RectOffset(0, 0, (int)Px(3f), (int)Px(3f));
            h.spacing = Px(7f);
            h.childControlWidth = true; h.childControlHeight = true;
            h.childForceExpandWidth = false; h.childForceExpandHeight = false;
            h.childAlignment = TextAnchor.MiddleLeft;

            bool vide = string.IsNullOrEmpty(titre);
            TextMeshProUGUI num = NouveauTexte(go.transform, "Rang", rang.ToString(), Px(9f),
                vide ? CouleurEncreFaible : CouleurEncre, DesignTokens.Current.primaryFont);
            num.alignment = TextAlignmentOptions.Center;
            var leNum = num.gameObject.AddComponent<LayoutElement>();
            leNum.minWidth = Px(16f); leNum.preferredWidth = Px(16f); leNum.flexibleWidth = 0f;

            GameObject corps = NouveauUI("Corps", go.transform);
            var vc = corps.AddComponent<VerticalLayoutGroup>();
            vc.childControlWidth = true; vc.childControlHeight = true;
            vc.childForceExpandWidth = true; vc.childForceExpandHeight = false;
            var leC = corps.AddComponent<LayoutElement>();
            leC.flexibleWidth = 1f;

            if (vide)
            {
                TextMeshProUGUI rien = NouveauTexte(corps.transform, "Rien", Lib("— rien —"),
                    Px(9f), CouleurEncreFaible, DesignTokens.Current.hudSerifFont);
                // ⛔ À GAUCHE, comme le titre d'un créneau REMPLI (voir juste en dessous, qui
                // laisse `NouveauTexte` à son alignement gauche par défaut). Centré, « — rien — »
                // se posait à ~500 px de son propre numéro de rang et la colonne SAUTAIT selon
                // que le créneau était plein ou vide — mesuré à l'image le 2026-09-03, sur un run
                // VERT 2/2. *Mes deux tests comptaient des textes ; compter du texte ne dit
                // jamais où il est.* Le vide et le plein doivent partager une seule colonne.
                rien.alignment = TextAlignmentOptions.Left;
                return go;
            }
            NouveauTexte(corps.transform, "Titre", titre, Px(11f), CouleurEncre,
                DesignTokens.Current.hudSerifFont).fontStyle = TMPro.FontStyles.Bold;
            if (!string.IsNullOrEmpty(sous))
                NouveauTexte(corps.transform, "Sous", sous, Px(8f), CouleurEncreFaible,
                    DesignTokens.Current.primaryFont);
            return go;
        }


        private void BuildLayout()
        {
            Canvas canvas = MafiaCleanCity.Shell.CanvasRacine.Resoudre(transform, mountParent);
            // ⛔ SOUS L'HÔTE, PAS SOUS `mountParent` — voir `SetMountParent`. Monté dans le shell,
            // `transform` EST déjà l'enfant de `ContentSlot` que le shell gouverne. Hors shell
            // (test isolé), l'hôte n'est sous aucun canvas : on retombe sur le canvas découvert.
            Transform root = mountParent != null ? transform : canvas.transform;

            // La racine PLEIN ÉCRAN — jamais un panneau intermédiaire : c'est elle qui sert de
            // référence d'échelle à `Px()`/`PxTrait()` (un conteneur plus étroit fausserait
            // TOUTE la mise à l'échelle par un facteur muet).
            GameObject racine = NouveauUI("CarnetRoot", root);
            racinePleinEcran = (RectTransform)racine.transform;
            Etirer(racinePleinEcran);
            AjouterFond(racine, DesignTokens.Current.surfaceBase);

            VerticalLayoutGroup pile = racine.AddComponent<VerticalLayoutGroup>();
            pile.padding = new RectOffset(
                (int)Px(13f), (int)Px(13f),
                (int)(Px(10f) + MafiaCleanCity.Shell.ShellChrome.TopInsetPx),
                (int)(Px(10f) + MafiaCleanCity.Shell.ShellChrome.BottomInsetPx));
            pile.spacing = Px(8f);
            pile.childControlWidth = true; pile.childControlHeight = true;
            pile.childForceExpandWidth = true; pile.childForceExpandHeight = false;

            // L'enseigne — sombre, comme le reste du châssis
            GameObject ens = NouveauUI("Enseigne", racine.transform);
            var ve = ens.AddComponent<VerticalLayoutGroup>();
            ve.padding = new RectOffset((int)Px(2f), (int)Px(2f), (int)Px(4f), (int)Px(6f));
            ve.spacing = Px(2f);
            ve.childControlWidth = true; ve.childControlHeight = true;
            ve.childForceExpandWidth = true; ve.childForceExpandHeight = false;
            titreEcran = NouveauTexte(ens.transform, "Titre", "", Px(17f),
                DesignTokens.Current.hudCreme, DesignTokens.Current.hudSerifFont);
            sousTitre = NouveauTexte(ens.transform, "SousTitre", "", Px(9f),
                DesignTokens.Current.hudCremeSecondary, DesignTokens.Current.primaryFont);

            // ⛔ LE CARNET EST CRÈME SUR FOND SOMBRE — et ce n'est pas une coquetterie : les six
            // cadres de cet écran opposent le CARNET (papier, chaud) au reste du châssis (nuit,
            // froid). C'est ce qui dit au joueur que ces huit lignes sont À LUI, écrites de sa
            // main, alors que tout le reste de l'interface lui est SERVI.
            GameObject carnet = NouveauUI("Carnet", racine.transform);
            AjouterFond(carnet, CouleurPapier);
            var lec = carnet.AddComponent<LayoutElement>();
            lec.minHeight = 0f; lec.preferredHeight = 0f; lec.flexibleHeight = 1f;
            carnet.AddComponent<RectMask2D>();

            GameObject contenu = NouveauUI("Contenu", carnet.transform);
            var rtc = (RectTransform)contenu.transform;
            rtc.anchorMin = new Vector2(0f, 1f); rtc.anchorMax = new Vector2(1f, 1f);
            rtc.pivot = new Vector2(0.5f, 1f);
            rtc.offsetMin = Vector2.zero; rtc.offsetMax = Vector2.zero;
            var vco = contenu.AddComponent<VerticalLayoutGroup>();
            vco.padding = new RectOffset((int)Px(9f), (int)Px(9f), (int)Px(8f), (int)Px(8f));
            vco.spacing = Px(1f);
            vco.childControlWidth = true; vco.childControlHeight = true;
            vco.childForceExpandWidth = true; vco.childForceExpandHeight = false;
            var fit = contenu.AddComponent<ContentSizeFitter>();
            fit.verticalFit = ContentSizeFitter.FitMode.PreferredSize;
            listeRoot = rtc;

            // L'en-tête du carnet : « Carnet du soir » + « N ORDRES SUR 8 »
            GameObject entete = NouveauUI("EnteteCarnet", contenu.transform);
            var he = entete.AddComponent<HorizontalLayoutGroup>();
            he.childControlWidth = true; he.childControlHeight = true;
            he.childForceExpandWidth = true; he.childForceExpandHeight = false;
            he.padding = new RectOffset(0, 0, 0, (int)Px(5f));
            NouveauTexte(entete.transform, "TitreCarnet", Lib("Carnet du soir"), Px(13f),
                CouleurEncre, DesignTokens.Current.hudSerifFont).fontStyle = TMPro.FontStyles.Bold;
            compte = NouveauTexte(entete.transform, "Compte", "", Px(8f),
                CouleurEncreFaible, DesignTokens.Current.primaryFont);
            compte.alignment = TextAlignmentOptions.Right;

            // ㉞ le composeur : sur le PAPIER (c'est le carnet du joueur qui s'écrit), sous les huit lignes
            GameObject compo = NouveauUI("Composeur", contenu.transform);
            var vcp = compo.AddComponent<VerticalLayoutGroup>();
            vcp.padding = new RectOffset(0, 0, (int)Px(6f), 0);
            vcp.spacing = Px(3f);
            vcp.childControlWidth = true; vcp.childControlHeight = true;
            vcp.childForceExpandWidth = true; vcp.childForceExpandHeight = false;
            composeurRoot = (RectTransform)compo.transform;
            compo.SetActive(false);

            ConstruirePanneau(racine.transform);
            RendreEtatInitial();
            // MÉTIER ICI — le reste de la mise en page (enseigne, blocs, listes…) se construit
            // ici, depuis la maquette. `ConstruireCerne`/`ConstruireEnseigne`/… de ㊲ montrent le
            // patron : un bloc = une méthode `Construire<Nom>(Transform parent)`.
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
            return t;
        }

        private static void Etirer(RectTransform rt, float marge = 0f)
        {
            rt.anchorMin = Vector2.zero;
            rt.anchorMax = Vector2.one;
            rt.offsetMin = new Vector2(marge, marge);
            rt.offsetMax = new Vector2(-marge, -marge);
        }
    }

    /// <summary>screen_c3 — les correspondances « valeur du domaine → apparence », chacune en
    /// FONCTION NOMMÉE prenant la valeur du domaine (patron `HeatBucketResolver.SeverityColor` —
    /// jamais un tableau positionnel ni une chaîne de ternaires : mesuré sur ce dépôt, un
    /// balayage anti-régression écrit pour traquer ces correspondances rend ZÉRO sur un fichier
    /// qui les porte par l'ordre d'un tableau — la garde ne peut voir sa cible qu'APRÈS ce
    /// passage en fonction nommée).
    ///
    /// // MÉTIER ICI — `EtatDomaine` est un PLACEHOLDER : remplacer par l'enum réel du domaine
    /// (ex. `Severity`, `Posture`…) une fois le corps back mesuré, PUIS écrire le switch
    /// EXHAUSTIF sans `default` silencieux (un `default: throw` rend une 5ᵉ valeur BRUYANTE
    /// plutôt que collisionner avec un repli connu — patron `HeatBucketResolver`, note M2 :
    /// un `switch` STATEMENT C# sans `default` est une erreur de compilation CS0161, donc
    /// "exhaustif sans default" n'existe PAS ici — le détecteur d'un membre neuf est un TEST sur
    /// `Enum.GetValues(typeof(EtatDomaine))`, jamais le compilateur).</summary>
    public static class CarnetResolvers
    {
        public enum EtatDomaine
        {
            // MÉTIER ICI — remplacer par les valeurs RÉELLES du domaine.
            Inconnu = 0,
        }

        public static Color CouleurPour(EtatDomaine etat)
        {
            switch (etat)
            {
                case EtatDomaine.Inconnu: return DesignTokens.Current.onSurfaceMuted;
                default: throw new System.ArgumentOutOfRangeException(nameof(etat), etat,
                    "CarnetResolvers.CouleurPour : membre de EtatDomaine non résolu.");
            }
        }
    }
}
