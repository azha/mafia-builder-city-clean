using System;
using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.UI;
using MafiaCleanCity.Theme;
using TMPro;

namespace MafiaCleanCity.Shell
{
    // W3.U1 C4 (design §3 C4) — `HighestLeverageCard` + Commit/Skip. Rend `hl_card` (titre par clé
    // de catalogue, deux buckets, drapeau structurel) et le budget structurel. Confirmation
    // destructive OBLIGATOIRE sur Commit (le canon en fait la seule action destructive de Home,
    // global_conventions_core.md:129-138) : appui long (`LongPressButton`, REUSE) OU saisie d'un
    // mot-clé (`MotCle`) — l'alternative typed-confirm est OBLIGATOIRE pour
    // l'accessibilité (F2, "utilisateurs sans accès haptique"), jamais un pur bonus. Skip est un tap
    // simple (non destructif, "carry semantics", design §8) — jamais gardé par une confirmation.
    public class HighestLeverageCardController : MonoBehaviour
    {
        // (08/10 nuit) `CtaColor` (`accentGold`, jaune vif #ffd23f) est RETIRÉ avec l'ancien widget : les gestes prennent la grammaire `.g.or` du cadre 5
        // (jetons ficheCtaOr*) — l'allowlist D5 de `C5F2_AccentGoldBindings` perd ce fichier, nommément.

        public enum CardState { NoCard, Available, CapBlocked }

        // canon: "l'utilisateur tape un mot-clé de confirmation" (localisé F1). 08/10 nuit : le mot-clé est le LIBELLÉ du geste (`MotCle`,
        // « PRENDRE ACTE »), plus « COMMIT » (anglais, et texte de développeur à l'écran : `AccueilCanon.A0`).

        [Header("Backend")]
        private string baseUrlPose;   // posée par un appelant (tests, shell) ; sinon la source unique
        private string baseUrl { get => baseUrlPose ?? MafiaCleanCity.AdresseDuBack.Url; set => baseUrlPose = value; }
        // ---- test hooks ----------------------------------------------------
        public CardState RenderedState { get; private set; } = CardState.NoCard;
        /// <summary>⑤ — le bloc de l'Accueil est un RÉSUMÉ ; l'écran de détail est un autre objet
        /// (`DecisionDetailScreenController`), et `front.md` le dit depuis le début : « ce contrôleur
        /// couvre le BLOC de screen_1, pas cet écran ». Ce bloc n'a pas à le connaître — il annonce
        /// qu'on veut l'ouvrir, et c'est le shell qui monte l'écran. *Un bloc qui monterait lui-même
        /// un écran plein cadre inverserait la responsabilité et le rendrait impossible à monter
        /// depuis ailleurs.*</summary>
        public event System.Action OnOuvrirDetail;

        /// <summary>⛔ GESTE MORT fermé (f2 08/10 nuit, instruit par CLIENT-1) : « Prendre acte » (appui long ou saisie) postait le commit, recevait
        /// 200… et l'écran ne changeait pas ; un second appui rendait un 409 muet. Levé après un commit ACCEPTÉ (`committed`) : le shell relit
        /// la session et remonte l'Accueil (la carte tranchée est terminale côté back : `session/open` ne la sert plus). Comme `OnOuvrirDetail`,
        /// la carte ANNONCE, le shell monte.</summary>
        public event System.Action OnDecisionTranchee;

        /// <summary>La phrase du dernier refus de commit, MONTRÉE au joueur (la phrase servie du refus, sinon la phrase de la carte) ; null sans refus.</summary>
        public string RefusRendu { get; private set; }

        /// <summary>Appelé par la surface de la carte — pas par les boutons Commit/Skip, qui
        /// tranchent depuis le résumé sans passer par le détail.</summary>
        public void DemanderDetail()
        {
            if (CurrentCard != null) OnOuvrirDetail?.Invoke();
        }

        /// <summary>B6 — le bouton de la SURFACE de la carte (racine), qui appelle `DemanderDetail()`.</summary>
        public Button SurfaceButton { get; private set; }

        public HlCardDto CurrentCard { get; private set; }
        public bool CapReached { get; private set; }
        public int CommitRequestCount { get; private set; }
        public int SkipRequestCount { get; private set; }
        /// <summary>Crochet de test : combien de décisions ACCEPTÉES ont levé `OnDecisionTranchee`.</summary>
        public int DecisionsTranchees { get; private set; }
        public bool? LastCommitCommitted { get; private set; }
        public bool? LastSkipSkipped { get; private set; }
        public string LastCommitError { get; private set; }
        public string LastSkipError { get; private set; }

        public IReadOnlyList<string> RenderedTexts => renderedTexts;
        private readonly List<string> renderedTexts = new List<string>();

        public LongPressButton CommitButton { get; private set; }
        private TMP_InputField typedConfirmInput;
        private Button typedConfirmButton;
        private TextMeshProUGUI titleText;
        private TextMeshProUGUI impactText;
        private TextMeshProUGUI urgencyText;
        private TextMeshProUGUI stateText;
        // ④ (2026-09-23, maquette atelier 25 §2.2, non ratifiée : la MÉCANIQUE, pas le pixel) — les deux options SERVIES de la carte,
        // montrées comme une RECOMMANDATION (options[0], puis [1] en alternative) et JAMAIS sur un bouton : mesuré par le back, elles
        // sont DESCRIPTIVES (`hl-card-types.ts:99-102`) — commit ne reçoit aucun indice d'option et ne produit aucun effet pour les 8
        // fournisseurs (il enregistre une décision de session). « Réparer via la file » sur le bouton du tampon mentirait. Les boutons
        // gardent leurs libellés jusqu'aux mots de l'atelier (demandés par f2). Et l'entrée du rapport quand la carte est celle des rapports.
        private TextMeshProUGUI commitLabel, rapportText, recommandationText, alternativeText, surtitreText, noteText, consequenceRecommandationText, consequenceAlternativeText;
        // Table 45 de l'atelier (a0ff6cba, accueil.carte.*) : les boutons disent ce qu'ils FONT — [Prendre acte] = commit (une décision de
        // session) — et la carte des rapports garde [Lire maintenant], qui OUVRE les rapports (navigation réelle, jamais le commit).
        // [Pas maintenant] et [Laisser en attente] (= skip) sont RETIRÉS (f2 08/10 nuit : gestes morts, voir `RequestSkip`).
        private Button lireButton;
        private TextMeshProUGUI lireLabel;
        private GameObject typedRowGo;
        /// <summary>Crochet de test : les deux options RENDUES en recommandation ([0], puis [1]), vide sans carte.</summary>
        public IReadOnlyList<string> OptionsRendues => optionsRendues;
        /// <summary>Crochet de test : les libellés des boutons de la carte (le tampon seul depuis le retrait de « Pas maintenant », f2 08/10) — la garde
        /// vérifie qu'aucun ne porte une option.</summary>
        public IReadOnlyList<string> LibellesDesBoutons =>
            new List<string> { commitLabel != null ? commitLabel.text : null };
        /// <summary>Crochet de test : le libellé de [Lire maintenant] (carte des rapports), null s'il est caché.</summary>
        public string LibelleLire => lireButton != null && lireButton.gameObject.activeSelf && lireLabel != null ? lireLabel.text : null;
        public bool TamponVisible => CommitButton != null && CommitButton.gameObject.activeSelf;
        private readonly List<string> optionsRendues = new List<string>();
        /// <summary>Crochet de test : « Lire maintenant » a-t-il ouvert les rapports ?</summary>
        public bool RapportsOuverts { get; private set; }
        /// <summary>Crochet de test : le nom du lieutenant du 1ᵉʳ rapport ouvert (lu par `AutonomyClient.GetReports`), null sinon.</summary>
        public string NomDuRapport { get; private set; }
        /// <summary>La carte est-elle celle des rapports à lire ?</summary>
        public bool EstCarteDesRapports =>
            CurrentCard != null && !string.IsNullOrEmpty(CurrentCard.decision_type_key)
            && CurrentCard.decision_type_key.EndsWith("AUTONOMY_REPORTS_PENDING", StringComparison.Ordinal);

        private HlCardClient client;
        private string token;
        private bool initialized;

        private void Awake() => EnsureInitialized();

        private void EnsureInitialized()
        {
            if (initialized) return;
            initialized = true;
            client = new HlCardClient { BaseUrl = baseUrl };
            BuildLayout();
        }

        /// <summary>Feed this widget the `hl_card` + `structural_budget` slice of a `session/open`
        /// payload (design: "il alimente C4… en données") — and the Bearer to use for Commit/Skip.</summary>
        public void SetPayload(string bearerToken, HlCardDto card, StructuralBudgetDto budget)
        {
            EnsureInitialized();
            token = bearerToken;
            CurrentCard = card;
            CapReached = budget != null && budget.cap_reached;

            if (card == null || string.IsNullOrEmpty(card.card_id))
            {
                RenderedState = CardState.NoCard;
            }
            else if (card.structural && CapReached)
            {
                RenderedState = CardState.CapBlocked;
            }
            else
            {
                RenderedState = CardState.Available;
            }
            NomDuRapport = null;
            Render();
            // ④ l'entrée du rapport : le NOM vient de la route des rapports (lot F), par la MÊME fonction que le bandeau — jamais copié.
            if (EstCarteDesRapports && !string.IsNullOrEmpty(token) && isActiveAndEnabled) StartCoroutine(ChargerLeNomDuRapport());
        }

        /// <summary>④ [Lire maintenant] : OUVRE les rapports, comme le « lire » du bandeau — navigation réelle, AUCUN tampon (table 45).</summary>
        public void OuvrirLesRapports()
        {
            if (!EstCarteDesRapports) return;
            IShellNavigator nav = ShellNavigatorLocator.Find();
            if (nav != null) nav.MonterLocataireEnSurimpression<MafiaCleanCity.Operational.Autonomy.AutonomyInboxController>();
            RapportsOuverts = true;
        }

        private IEnumerator ChargerLeNomDuRapport()
        {
            string id = null;
            yield return new MafiaCleanCity.Operational.Autonomy.AutonomyClient { BaseUrl = baseUrl }.GetReports(token,
                rapports => NomDuRapport = AnnonceDuBandeau.NomDuPremierRapport(rapports, out id),
                (code, msg) => Debug.LogWarning($"[HlCard] rapports d'autonomie (best-effort) : {code} {msg}"));
            if (this == null) yield break;
            Render();
        }

        /// <summary>Wired to `CommitButton.OnLongPressCompleted` — design C4-F1: a short tap NEVER
        /// reaches this (the gesture layer already filtered it out); this method itself refuses to
        /// emit anything while `CapBlocked` (design C4-F3 — client-side refusal, never even attempted
        /// against the server, which would ALSO 409 STRUCTURAL_CAP_EXHAUSTED).</summary>
        public IEnumerator RequestCommit()
        {
            EnsureInitialized();
            if (RenderedState != CardState.Available || CurrentCard == null) yield break; // CapBlocked/NoCard -> refused, zero requests
            CommitRequestCount++;
            LastCommitError = null;
            LastCommitCommitted = null;
            RefusRendu = null;
            yield return client.Commit(token, CurrentCard.card_id,
                dto => LastCommitCommitted = dto.committed,
                (code, msg) => LastCommitError = $"{code}: {msg}");
            if (this == null) yield break;
            if (LastCommitError == null && LastCommitCommitted == true) { TrancheePourDeBon(); yield break; }
            // un refus se DIT : la phrase servie (`error.core_loops.structural_cap_exhausted`…), sinon celle de la carte — jamais une erreur muette
            RefusRendu = client.DernierePhraseDeRefus
                         ?? MafiaCleanCity.I18n.Libelle.Gabarit("accueil.carte.la_decision_n_a_pas_ete_prise", "La décision n\u2019a pas été prise.");
            if (stateText != null) { stateText.text = RefusRendu; Track(RefusRendu); Visibilites(); }
        }

        /// <summary>La décision est ACCEPTÉE par le back : on le compte et on l'annonce au shell (qui relit la session et remonte l'Accueil).</summary>
        private void TrancheePourDeBon()
        {
            DecisionsTranchees++;
            OnDecisionTranchee?.Invoke();
        }

        /// <summary>⛔ Réservé aux tests hors réseau : rejoue EXACTEMENT ce qu'un commit accepté déclenche (le compte et l'annonce au shell).</summary>
        public void DecisionAccepteePourTest() => TrancheePourDeBon();

        /// <summary>The accessible ALTERNATIVE to the long press (canon: "alternative typed-confirm
        /// obligatoire — utilisateurs sans accès haptique", F2). A tap on the confirm button ALONE
        /// never commits — the typed text must match `MotCle` (case-insensitive; the
        /// SAME "no bare tap confirms a destructive action" rule the canon states for BOTH paths).
        /// Routes through the SAME `RequestCommit()` — one behaviour, two triggers, never two
        /// divergent request paths that could drift apart.</summary>
        public IEnumerator RequestCommitViaTypedConfirm(string typedText)
        {
            if (!string.Equals((typedText ?? "").Trim(), MotCle, StringComparison.OrdinalIgnoreCase))
                yield break; // wrong/empty keyword -> refused, zero requests (mirrors the CapBlocked refusal)
            yield return RequestCommit();
        }

        /// <summary>La route `skip` (design §8 « carry semantics »). ⛔ AUCUN GESTE NE L'APPELLE PLUS (f2 08/10 nuit, option (c)) : « Pas
        /// maintenant » était un GESTE MORT — 200, puis rien à l'écran — et le back ne sert AUCUNE carte suivante (modèle top-1 : la carte
        /// sautée est reportée, `findCarried` la relit telle quelle ; rien n'est recalculé avant la prochaine ouverture FRAÎCHE). Le cadre 5
        /// de l'atelier (5240cec) ne le dessine pas. Gardée pour l'option (a) (une ligne « mise de côté » de l'atelier) et pour la garde
        /// réseau de la route (W3U1 C4-F4).</summary>
        public IEnumerator RequestSkip()
        {
            EnsureInitialized();
            if (CurrentCard == null) yield break;
            SkipRequestCount++;
            LastSkipError = null;
            yield return client.Skip(token, CurrentCard.card_id,
                dto => LastSkipSkipped = dto.skipped,
                (code, msg) => LastSkipError = $"{code}: {msg}");
        }

        // --------------------------------------------------------------- render

        private void Render()
        {
            renderedTexts.Clear();
            optionsRendues.Clear();
            if (rapportText != null) rapportText.text = "";
            if (recommandationText != null) recommandationText.text = "";
            if (alternativeText != null) alternativeText.text = "";
            if (consequenceRecommandationText != null) consequenceRecommandationText.text = "";
            if (consequenceAlternativeText != null) consequenceAlternativeText.text = "";
            if (lireLabel != null) lireLabel.text = "";
            if (surtitreText != null) surtitreText.text = "";
            if (noteText != null) noteText.text = "";
            bool rapports = RenderedState == CardState.Available && EstCarteDesRapports;
            // ⛔ PASSE UX 26/09 (§G P1) — sans carte (« Rien à signaler »), l'Accueil montrait QUAND MÊME le bloc « Tamponner — appui
            //    long », « Skip » et la rangée « Type "COMMIT" » : des gestes sur rien. Les gestes n'existent que s'il y a une carte.
            // 08/10 nuit (cadre 5) : le geste n'existe que s'il AGIT — pas sans carte, pas sur la carte des rapports (elle se LIT), pas quand la limite
            // de structure est atteinte (`RequestCommit` refuserait : un geste qui refuse toujours serait un geste mort). La saisie est cachée au repos.
            Montrer(lireButton, rapports);
            Montrer(CommitButton, RenderedState == CardState.Available && !rapports);
            if (typedRowGo != null) typedRowGo.SetActive(false);
            if (stateText != null) stateText.text = "";
            switch (RenderedState)
            {
                case CardState.NoCard:
                    // ④ état « rien à trancher » (maquette 25 §2.2, cadre 0) : « Rien à signaler » en titre, puis « Aucune décision en
                    // attente » — l'ordre de la maquette (les deux clés sont servies, `accueil.carte.*`).
                    titleText.text = Lib("carte", "Rien à signaler");
                    impactText.text = "";
                    urgencyText.text = "";
                    stateText.text = Lib("carte", "Aucune décision en attente");
                    Track(titleText.text);
                    Track(stateText.text);
                    break;
                case CardState.CapBlocked:
                    titleText.text = LibellesDecision.Type(CurrentCard.decision_type_key);
                    impactText.text = ImpactLabel(CurrentCard.impact_bucket);
                    urgencyText.text = UrgencyLabel(CurrentCard.urgency_bucket);
                    stateText.text = Lib("carte", "Limite de structure atteinte");
                    Track(titleText.text);
                    Track(impactText.text);
                    Track(urgencyText.text);
                    Track(stateText.text);
                    break;
                case CardState.Available:
                    RendreLesOptions();
                    // Le geste de la carte des rapports ne reste JAMAIS sans mot : sans exactement deux options servies (planche A01 du 08/10 :
                    // pilule vide), il dit ce qu'il FAIT — la clé de la table 45, comme [Prendre acte].
                    if (rapports && lireLabel != null && string.IsNullOrWhiteSpace(lireLabel.text))
                    {
                        lireLabel.text = Lib("carte", "Lire maintenant");
                        Track(lireLabel.text);
                    }
                    titleText.text = LibellesDecision.Type(CurrentCard.decision_type_key);
                    impactText.text = ImpactLabel(CurrentCard.impact_bucket);
                    urgencyText.text = UrgencyLabel(CurrentCard.urgency_bucket);
                    // « Prêt » n'est plus dit : le cadre 5 n'a pas de ligne d'état ; le geste dit qu'on peut agir.
                    Track(titleText.text);
                    Track(impactText.text);
                    Track(urgencyText.text);
                    break;
            }
            Visibilites();
        }

        /// <summary>Le verre ne garde que ce qui PARLE : un texte vide est retiré (il prendrait sa ligne), les niveaux et les options avec leurs textes ;
        /// puis le bloc est ajusté à sa bande.</summary>
        private void Visibilites()
        {
            foreach (TextMeshProUGUI t in new[] { titleText, stateText, rapportText, surtitreText, noteText, consequenceRecommandationText, consequenceAlternativeText })
                if (t != null) t.gameObject.SetActive(!string.IsNullOrEmpty(t.text));
            if (niveauxGo != null) niveauxGo.SetActive(!string.IsNullOrEmpty(impactText.text) || !string.IsNullOrEmpty(urgencyText.text));
            if (optionsGo != null) optionsGo.SetActive(!string.IsNullOrEmpty(recommandationText.text) || !string.IsNullOrEmpty(alternativeText.text));
            Ajuster();
        }

        /// <summary>④ les deux options SERVIES (clés `hl.option.*`, traduites par le catalogue) en RECOMMANDATION, exactement deux, sinon
        /// rien — jamais sur les boutons (options descriptives, voir les champs). L'entrée du rapport quand le nom est lu.</summary>
        private void RendreLesOptions()
        {
            DecisionOptionDto[] o = CurrentCard != null ? CurrentCard.options : null;
            if (o != null && o.Length == 2 && o[0] != null && o[1] != null)
            {
                string agir = MafiaCleanCity.I18n.Libelle.Gabarit(o[0].label, "—");
                string laisser = MafiaCleanCity.I18n.Libelle.Gabarit(o[1].label, "—");
                optionsRendues.Add(agir);
                optionsRendues.Add(laisser);
                if (EstCarteDesRapports)
                {
                    // [Lire maintenant] ouvre les rapports : l'option SAISIE est ici le geste (table 45). [Laisser en attente] (= skip) est
                    // RETIRÉ avec « Pas maintenant » (f2 08/10 : un geste mort, la carte restait) ; l'option reste lue, pas montrée en bouton.
                    if (lireLabel != null) lireLabel.text = agir;
                }
                else
                {
                    if (surtitreText != null) surtitreText.text = Lib("carte", "Ce qu’on peut faire");
                    if (recommandationText != null) recommandationText.text = agir;
                    if (alternativeText != null) alternativeText.text = laisser;
                    if (consequenceRecommandationText != null) consequenceRecommandationText.text = ConsequenceDe(o[0].label);
                    if (consequenceAlternativeText != null) consequenceAlternativeText.text = ConsequenceDe(o[1].label);
                    Track(consequenceRecommandationText != null ? consequenceRecommandationText.text : null);
                    Track(consequenceAlternativeText != null ? consequenceAlternativeText.text : null);
                    if (noteText != null) noteText.text = Lib("carte", "prendre acte n’agit pas à votre place");
                    Track(surtitreText != null ? surtitreText.text : null);
                    Track(noteText != null ? noteText.text : null);
                }
                Track(agir);
                Track(laisser);
            }
            if (!EstCarteDesRapports)
            {
                if (commitLabel != null) commitLabel.text = Lib("carte", "Prendre acte");
            }
            if (EstCarteDesRapports && !string.IsNullOrWhiteSpace(NomDuRapport) && rapportText != null)
            {
                rapportText.text = MafiaCleanCity.I18n.Libelle.Gabarit("chrome.bandeau.rapport", "{nom} a un rapport pour vous",
                    new Dictionary<string, string> { { "nom", NomDuRapport } });
                Track(rapportText.text);
            }
        }

        private void Track(string t)
        {
            if (!string.IsNullOrEmpty(t)) renderedTexts.Add(t);
        }

        // ⛔⛔ CES DEUX RÉSOLVEURS RENDAIENT L'ANGLAIS PENDANT QUE ⑤ RENDAIT LE FRANÇAIS, sur les
        //    MÊMES champs de la MÊME réponse, à quelques secondes d'écart pour le joueur : la carte
        //    de l'Accueil disait « Moderate / Low », son détail « modérée / faible ». Et le TITRE
        //    était pire — `decision_type_key` posé BRUT, donc `AUTONOMY_REPORTS_PENDING` en toutes
        //    lettres, là où ⑤ passait par un résolveur.
        //    ★★ *Deux écrans qui montrent la même donnée doivent la nommer pareil, et la seule
        //      façon de s'en assurer est qu'un seul code la nomme.* C'est exactement la forme de
        //      TD-611, sur une autre grandeur : deux producteurs, l'un branché, l'autre oublié.
        //    ⇒ Les deux méthodes sont supprimées plutôt que traduites : les garder traduites
        //      laisserait DEUX producteurs, et le prochain qui change un mot n'en changerait qu'un.
        private static string ImpactLabel(string b) => LibellesDecision.Portee(b);
        private static string UrgencyLabel(string b) => LibellesDecision.Urgence(b);

        // --------------------------------------------------------------- UI build

        // ═══ LA CARTE DE TÊTE, RECONSTRUITE SUR LE CADRE 5 (f2, 08/10 nuit) ════════════════════════════════════════════════════════════════
        // L'ancien widget W3U1 (textes de 14-18 u en haut à gauche, rangée d'actions étirée en aplat jaune `accentGold`) n'était construit
        // sur AUCUN cadre — mesuré sur la planche A01 « tête » du créneau du 08/10 nuit. La carte prend maintenant la structure, la typographie,
        // la matière et la place du cadre 5 de `ecrans-brennar-accueil.html` (atelier master 5240cec, règles `.acc4 .verre/.titre/.niveaux/.sur/
        // .gestes/.g/.g.or/.csq4/.sous`), avec deux règles de f2 tant que TD-724 (hl-card « agit ») n'est pas livré — le commit ne reçoit AUCUNE
        // option (mesuré : `hl-card.controller.ts:41-46`, `DecisionOption` « descriptive flavor ») :
        //   · les OPTIONS sont des FAITS de la carte, en TEXTE (`.csq4`) — rien qui ait l'air d'un bouton : ni cerne, ni plaque, ni flèche ;
        //   · UN seul geste, « PRENDRE ACTE », dans la grammaire `.g.or` du cadre (pilule lustrée ficheCtaOrHaut → ficheCtaOrBas, bord ficheCtaOrBord,
        //     encre ficheCtaOrEncre — les jetons égalent le CSS au 1/255), à APPUI LONG ; l'alternative par SAISIE du canon (global_conventions_core
        //     .md:129-138) est DISCRÈTE : invisible au repos, un appui COURT sur le geste la révèle (patron ㉓).
        // La carte des rapports (cadre 2) garde son geste RÉEL « LIRE MAINTENANT » (navigation, aucun commit), même grammaire. Le calme (cadre 0) : le
        // titre et sa phrase. Le verre est CELUI de « LA SUITE » (`LaSuitePanelController.PoserLeVerre`) : ancré en BAS de la bande, à sa hauteur
        // préférée, réduit à l'échelle s'il dépasse (`Ajuster`) — son bas reste à la marge de la ligne de file (l'ancrage de ④).
        // Échelle : 300 CSS = 1 280 u ⇒ K = 4,2667 u par px CSS (même convention que ⑤).
        private const float K = 1280f / 300f;
        private static float U(float cssPx) => cssPx * K;

        /// <summary>Le bloc de verre (enfant de l'hôte, qui porte la BANDE) — crochet de mesure.</summary>
        public RectTransform Bloc { get; private set; }
        /// <summary>L'échelle appliquée au bloc pour qu'il tienne dans sa bande (1 aux résolutions de jeu).</summary>
        public float Echelle { get; private set; } = 1f;
        private GameObject niveauxGo, optionsGo;
        private TextMeshProUGUI porteeLib, urgenceLib;
        private bool ajustementEnCours;

        private void BuildLayout()
        {
            RectTransform selfRt = GetComponent<RectTransform>();
            if (selfRt == null) selfRt = gameObject.AddComponent<RectTransform>();

            GameObject verre = LaSuitePanelController.PoserLeVerre(transform, "Carte");
            Bloc = (RectTransform)verre.transform;
            VerticalLayoutGroup vlg = verre.AddComponent<VerticalLayoutGroup>();
            vlg.padding = new RectOffset(Mathf.RoundToInt(U(14f)), Mathf.RoundToInt(U(14f)), Mathf.RoundToInt(U(12f)), Mathf.RoundToInt(U(12f)));   // `.verre{padding:12px 14px}`
            vlg.spacing = 0f;
            vlg.childAlignment = TextAnchor.UpperCenter;
            vlg.childControlWidth = true; vlg.childControlHeight = true;
            vlg.childForceExpandWidth = true; vlg.childForceExpandHeight = false;
            verre.AddComponent<ContentSizeFitter>().verticalFit = ContentSizeFitter.FitMode.PreferredSize;

            // B6 (passe UX 2026-09-24) — la SURFACE de la carte ouvre ⑤ : le bouton est sur le VERRE (plus sur toute la bande : le vide au-dessus du
            // verre n'ouvre rien) ; les gestes, plus profonds, gardent le leur. La plaque-masque reçoit le toucher, elle ne peint rien de plus.
            Image surface = verre.GetComponent<Image>();
            surface.raycastTarget = true;
            SurfaceButton = verre.AddComponent<Button>();
            SurfaceButton.transition = Selectable.Transition.None;
            SurfaceButton.targetGraphic = surface;
            SurfaceButton.onClick.AddListener(DemanderDetail);

            Transform c = verre.transform;
            // `.titre{font:400 16px/1.2 'DejaVu Serif';letter-spacing:.06em;color:#f2c96b;text-align:center}`
            titleText = Texte(c, "Title", 16f, DesignTokens.Current.hudMoneyGold, Serif(), FontStyles.Normal, 6f);
            // `.sous{font:400 9.2px/1.4 'DejaVu Sans';color:#b9ad92;margin-top:5px}` — l'entrée du rapport (cadre 2), l'état (cadres 0 et cap), un refus
            stateText = Texte(c, "State", 9.2f, DesignTokens.Current.hudCremeSecondary, DesignTokens.Current.primaryFont, FontStyles.Normal, 0f, margeHaut: 5f);
            rapportText = Texte(c, "RapportEntree", 9.2f, DesignTokens.Current.hudCremeSecondary, DesignTokens.Current.primaryFont, FontStyles.Normal, 0f, margeHaut: 5f);

            // `.niveaux{display:flex;justify-content:center;gap:14px;margin-top:8px}` ; `span` 6,6 px gras capitales .2em #b9ad92 ; `b` 10 px sérif #eae0c8, 5 px après
            niveauxGo = Rangee(c, "Niveaux", U(14f), margeHaut: 8f);
            porteeLib = Texte(niveauxGo.transform, "PorteeLib", 6.6f, DesignTokens.Current.hudCremeSecondary, DesignTokens.Current.primaryFont, FontStyles.Bold | FontStyles.UpperCase, 20f);
            impactText = Texte(niveauxGo.transform, "Impact", 10f, DesignTokens.Current.hudCreme, Serif(), FontStyles.Normal, 0f);
            urgenceLib = Texte(niveauxGo.transform, "UrgenceLib", 6.6f, DesignTokens.Current.hudCremeSecondary, DesignTokens.Current.primaryFont, FontStyles.Bold | FontStyles.UpperCase, 20f);
            urgencyText = Texte(niveauxGo.transform, "Urgency", 10f, DesignTokens.Current.hudCreme, Serif(), FontStyles.Normal, 0f);
            porteeLib.text = Lib("carte", "Portée"); urgenceLib.text = Lib("carte", "Urgence");
            niveauxGo.GetComponent<HorizontalLayoutGroup>().spacing = U(5f);
            porteeLib.margin = new Vector4(0f, 0f, 0f, 0f); urgenceLib.margin = new Vector4(U(14f) - U(5f), 0f, 0f, 0f);   // le `gap:14px` entre les deux groupes

            // `.sur{font:700 6.6px/1 'DejaVu Sans';letter-spacing:.28em;text-transform:uppercase;color:#b9ad92;text-align:center}` (margin-top 10 px)
            surtitreText = Texte(c, "CeQuOnPeutFaire", 6.6f, DesignTokens.Current.hudCremeSecondary, DesignTokens.Current.primaryFont, FontStyles.Bold | FontStyles.UpperCase, 28f, margeHaut: 10f);
            // LES OPTIONS — des FAITS, en TEXTE `.csq4` (8 px, #b9ad92, centrées, deux colonnes à `gap:8px`) : ni cerne, ni plaque, ni flèche (f2)
            optionsGo = Rangee(c, "Options", U(8f), margeHaut: 5f);
            // F1(b) (juge r4, 09/10 ; f2 : élément ABSENT, classe A) : SOUS CHAQUE OPTION, sa CONSÉQUENCE (`.csq4-rang .csq4` — 8 px, `#b9ad92`, centrée, `margin-top:2px`) : la clé
            // SERVIE `<label>.projected_consequence`, lue au catalogue, jamais une chaîne en dur. Chaque colonne empile l'option puis sa conséquence.
            (recommandationText, consequenceRecommandationText) = ColonneDOption(optionsGo.transform, "Recommandation");
            (alternativeText, consequenceAlternativeText) = ColonneDOption(optionsGo.transform, "Alternative");

            // LE GESTE `.g.or` (margin-top 11 px) — « PRENDRE ACTE » à appui long ; un appui COURT révèle la saisie (alternative du canon)
            CommitButton = Geste(c, "CommitButton", out commitLabel).AddComponent<LongPressButton>();
            CommitButton.OnLongPressCompleted += () => StartCoroutine(RequestCommit());
            CommitButton.OnShortTap += RevelerLaSaisie;
            commitLabel.text = Lib("carte", "Prendre acte");   // table 45 (servie)

            // ④ [Lire maintenant] — la carte des rapports seulement : OUVRE les rapports, sans tampon (table 45). Même grammaire `.g.or`.
            GameObject lireGo = Geste(c, "LireButton", out lireLabel);
            lireButton = lireGo.AddComponent<Button>();
            lireButton.targetGraphic = lireGo.GetComponent<Image>();
            lireButton.onClick.AddListener(OuvrirLesRapports);
            lireGo.SetActive(false);

            // `.csq4` sous le geste : « prendre acte n'agit pas à votre place » (clé servie) — la conséquence vraie du geste
            noteText = Texte(c, "PrendreActeNote", 8f, DesignTokens.Current.hudCremeSecondary, DesignTokens.Current.primaryFont, FontStyles.Normal, 0f, margeHaut: 5f);

            // L'ALTERNATIVE PAR SAISIE (canon : obligatoire pour l'accessibilité) — discrète : cachée au repos, révélée par un appui court sur le geste.
            // Le champ au style de la plaque sombre du cadre (`.g` : fond à peine levé, filet clair) ; « tapez PRENDRE ACTE » en indication.
            GameObject typedRow = new GameObject("TypedConfirmRow", typeof(RectTransform));
            typedRow.transform.SetParent(c, false);
            HorizontalLayoutGroup trhlg = typedRow.AddComponent<HorizontalLayoutGroup>();
            trhlg.spacing = U(6f);
            trhlg.padding = new RectOffset(0, 0, Mathf.RoundToInt(U(6f)), 0);
            trhlg.childControlWidth = true; trhlg.childControlHeight = true;
            trhlg.childForceExpandWidth = true; trhlg.childForceExpandHeight = true;
            typedRow.AddComponent<LayoutElement>().minHeight = U(6f) + LaSuitePanelController.HauteurDuGeste * 0.8f;

            GameObject inputGo = new GameObject("TypedConfirmInput", typeof(RectTransform));
            inputGo.transform.SetParent(typedRow.transform, false);
            Image inputImg = inputGo.AddComponent<Image>();
            LaSuitePanelController.Arrondir(inputImg, LaSuitePanelController.RayonGeste, LaSuitePanelController.FondGesteSombre);
            LaSuitePanelController.Lisere(inputGo.transform, LaSuitePanelController.RayonGeste, LaSuitePanelController.BordDeGesteSombre);
            typedConfirmInput = inputGo.AddComponent<TMP_InputField>();
            TextMeshProUGUI inputText = ChampTexte(inputGo.transform, "Text", DesignTokens.Current.hudCreme);
            TextMeshProUGUI indication = ChampTexte(inputGo.transform, "Indication", DesignTokens.Current.hudCremeSecondary);
            indication.text = MafiaCleanCity.I18n.Libelle.Gabarit("accueil.carte.tapez_mot", "tapez {mot}",
                new Dictionary<string, string> { { "mot", MotCle } });
            indication.fontStyle = FontStyles.Italic;
            typedConfirmInput.textComponent = inputText;
            typedConfirmInput.placeholder = indication;

            GameObject typedConfirmGo = Geste(typedRow.transform, "TypedConfirmButton", out TextMeshProUGUI typedConfirmLabel, margeHaute: false);
            typedConfirmGo.GetComponent<LayoutElement>().flexibleWidth = 0f;
            typedConfirmLabel.text = Lib("carte", "Prendre acte");
            typedConfirmButton = typedConfirmGo.AddComponent<Button>();
            typedConfirmButton.targetGraphic = typedConfirmGo.GetComponent<Image>();
            typedConfirmButton.onClick.AddListener(() => StartCoroutine(RequestCommitViaTypedConfirm(typedConfirmInput.text)));
            typedRowGo = typedRow;
            typedRow.SetActive(false);
        }

        /// <summary>Le mot-clé de la saisie : le libellé MÊME du geste, en capitales (localisé avec lui).</summary>
        public static string MotCle => Lib("carte", "Prendre acte").ToUpperInvariant();

        /// <summary>Crochet de test : la saisie est-elle montrée ?</summary>
        public bool SaisieVisible => typedRowGo != null && typedRowGo.activeSelf;

        /// <summary>Un appui COURT sur le geste révèle l'alternative par saisie (elle reste cachée au repos : discrète).</summary>
        public void RevelerLaSaisie()
        {
            if (typedRowGo == null || RenderedState != CardState.Available || EstCarteDesRapports) return;
            typedRowGo.SetActive(true);
            Ajuster();
        }

        /// <summary>Le bloc ne sort JAMAIS de sa bande : plus haut qu'elle (petit écran, titre long), il se réduit à l'échelle depuis son pied
        /// (même règle que `LaSuitePanelController.Ajuster`).</summary>
        public void Ajuster()
        {
            if (Bloc == null || ajustementEnCours) return;
            ajustementEnCours = true;
            Bloc.localScale = Vector3.one;
            LayoutRebuilder.ForceRebuildLayoutImmediate(Bloc);
            float h = LayoutUtility.GetPreferredHeight(Bloc);
            float dispo = ((RectTransform)transform).rect.height;
            float k = h > 0f && dispo > 0f && h > dispo ? dispo / h : 1f;
            Bloc.localScale = new Vector3(k, k, 1f);
            Echelle = k;
            ajustementEnCours = false;
        }

        private void OnRectTransformDimensionsChange()
        {
            if (initialized && isActiveAndEnabled) Ajuster();   // la bande change (rebâtie à la résolution, ou ancrée sur la ligne)
        }

        private static TMP_FontAsset Serif() => DesignTokens.Current.hudSerifFont != null ? DesignTokens.Current.hudSerifFont : DesignTokens.Current.primaryFont;

        /// <summary>Un texte du verre, aux unités du cadre (px CSS × K), centré, qui reflue ; `margeHaut` = le `margin-top` CSS.</summary>
        private static TextMeshProUGUI Texte(Transform parent, string nom, float cssPx, Color couleur, TMP_FontAsset police, FontStyles style,
                                             float interlettrage, float margeHaut = 0f)
        {
            GameObject go = new GameObject(nom, typeof(RectTransform));
            go.transform.SetParent(parent, false);
            TextMeshProUGUI t = go.AddComponent<TextMeshProUGUI>();
            t.font = police;
            t.fontSize = U(cssPx);
            t.fontStyle = style;
            t.characterSpacing = interlettrage;
            t.color = couleur;
            t.alignment = TextAlignmentOptions.Center;
            t.enableWordWrapping = true;
            t.raycastTarget = false;
            if (margeHaut > 0f) t.margin = new Vector4(0f, U(margeHaut), 0f, 0f);
            return t;
        }

        /// <summary>Une rangée centrée (`display:flex;justify-content:center`).</summary>
        private static GameObject Rangee(Transform parent, string nom, float espace, float margeHaut)
        {
            GameObject go = new GameObject(nom, typeof(RectTransform));
            go.transform.SetParent(parent, false);
            HorizontalLayoutGroup h = go.AddComponent<HorizontalLayoutGroup>();
            h.spacing = espace;
            h.padding = new RectOffset(0, 0, Mathf.RoundToInt(U(margeHaut)), 0);
            h.childAlignment = TextAnchor.UpperCenter;
            h.childControlWidth = true; h.childControlHeight = true;
            h.childForceExpandWidth = false; h.childForceExpandHeight = false;
            return go;
        }

        /// <summary>Une COLONNE d'option (`flex:1`) : le texte de l'option, puis sa conséquence dessous (`.csq4`, `margin-top:2px`). Un texte vide est retiré par `Visibilites`/`Render` (il prendrait sa ligne).</summary>
        private static (TextMeshProUGUI option, TextMeshProUGUI consequence) ColonneDOption(Transform parent, string nom)
        {
            GameObject col = new GameObject(nom + "_Colonne", typeof(RectTransform));
            col.transform.SetParent(parent, false);
            VerticalLayoutGroup v = col.AddComponent<VerticalLayoutGroup>();
            v.spacing = 0f;
            v.childAlignment = TextAnchor.UpperCenter;
            v.childControlWidth = true; v.childControlHeight = true;
            v.childForceExpandWidth = true; v.childForceExpandHeight = false;
            col.AddComponent<LayoutElement>().flexibleWidth = 1f;
            TextMeshProUGUI option = Texte(col.transform, nom, 8f, DesignTokens.Current.hudCremeSecondary, DesignTokens.Current.primaryFont, FontStyles.Normal, 0f);
            TextMeshProUGUI consequence = Texte(col.transform, nom + "Consequence", 8f, DesignTokens.Current.hudCremeSecondary, DesignTokens.Current.primaryFont, FontStyles.Normal, 0f, margeHaut: 2f);
            return (option, consequence);
        }

        /// <summary>LA CONSÉQUENCE servie d'une option : la clé `<label>.projected_consequence` si le catalogue la SERT, sinon rien (jamais un repli inventé : une conséquence fausse vaut moins qu'une absence).</summary>
        private static string ConsequenceDe(string labelCle)
        {
            if (string.IsNullOrEmpty(labelCle)) return "";
            string cle = labelCle + ".projected_consequence";
            if (!MafiaCleanCity.I18n.Libelle.EstServie(cle)) return "";
            return MafiaCleanCity.I18n.Libelle.Gabarit(cle, "");
        }

        /// <summary>LE GESTE `.g.or` du cadre : la pilule LUSTRÉE de « LA SUITE » (plaque ficheCtaOrBas qui sert de masque, dégradé ficheCtaOrHaut →
        /// ficheCtaOrBas, bord ficheCtaOrBord, rayon `RayonGeste`), libellé ficheCtaOrEncre, 9 px gras, capitales `.12em` ; `margin-top:11px`,
        /// pleine largeur (un seul geste : `flex:1`).</summary>
        private static GameObject Geste(Transform parent, string nom, out TextMeshProUGUI libelle, bool margeHaute = true)
        {
            Transform hote = parent;
            if (margeHaute)
            {
                // la marge haute du geste (`margin-top:11px`) : un conteneur « <nom>_Marge » la porte — un groupe vertical n'a pas de marge par enfant.
                // ⚠️ Montrer/cacher le geste passe par `Montrer`, qui bascule AUSSI ce conteneur (sinon un vide de 47 u reste).
                GameObject cadre = new GameObject(nom + "_Marge", typeof(RectTransform));
                cadre.transform.SetParent(parent, false);
                VerticalLayoutGroup v = cadre.AddComponent<VerticalLayoutGroup>();
                v.padding = new RectOffset(0, 0, Mathf.RoundToInt(U(11f)), 0);
                v.childControlWidth = true; v.childControlHeight = true;
                v.childForceExpandWidth = true; v.childForceExpandHeight = false;
                hote = cadre.transform;
            }
            GameObject geste = new GameObject(nom, typeof(RectTransform));
            geste.transform.SetParent(hote, false);
            Image im = geste.AddComponent<Image>();
            LaSuitePanelController.Arrondir(im, LaSuitePanelController.RayonGeste, DesignTokens.Current.ficheCtaOrBas);
            geste.AddComponent<Mask>().showMaskGraphic = false;
            GameObject lustre = new GameObject("Degrade", typeof(RectTransform));
            lustre.transform.SetParent(geste.transform, false);
            lustre.AddComponent<LayoutElement>().ignoreLayout = true;
            RectTransform drt = (RectTransform)lustre.transform;
            drt.anchorMin = Vector2.zero; drt.anchorMax = Vector2.one; drt.offsetMin = drt.offsetMax = Vector2.zero;
            Image degrade = lustre.AddComponent<Image>();
            degrade.sprite = ProceduralUI.VerticalGradient(64, DesignTokens.Current.ficheCtaOrHaut, DesignTokens.Current.ficheCtaOrBas);
            degrade.raycastTarget = false;
            LaSuitePanelController.Lisere(geste.transform, LaSuitePanelController.RayonGeste, DesignTokens.Current.ficheCtaOrBord);
            HorizontalLayoutGroup bh = geste.AddComponent<HorizontalLayoutGroup>();
            bh.padding = new RectOffset(Mathf.RoundToInt(U(4f)), Mathf.RoundToInt(U(4f)), 0, 0);
            bh.childAlignment = TextAnchor.MiddleCenter;
            bh.childControlWidth = true; bh.childControlHeight = true;
            bh.childForceExpandWidth = false; bh.childForceExpandHeight = false;
            LayoutElement le = geste.AddComponent<LayoutElement>();
            le.minHeight = le.preferredHeight = LaSuitePanelController.HauteurDuGeste;
            le.flexibleWidth = 1f;
            GameObject motGo = new GameObject("Label", typeof(RectTransform));
            motGo.transform.SetParent(geste.transform, false);
            libelle = motGo.AddComponent<TextMeshProUGUI>();
            libelle.font = DesignTokens.Current.primaryFont;
            libelle.fontSize = U(9f);
            libelle.fontStyle = FontStyles.Bold | FontStyles.UpperCase;   // la casse est un STYLE : le texte servi reste intact
            libelle.characterSpacing = 12f;
            libelle.color = DesignTokens.Current.ficheCtaOrEncre;
            libelle.alignment = TextAlignmentOptions.Center;
            libelle.enableWordWrapping = false;
            libelle.raycastTarget = false;
            return geste;
        }

        /// <summary>Montre ou cache un élément du verre ET son conteneur de marge (« <nom>_Marge ») s'il en a un.</summary>
        private static void Montrer(Component c, bool visible)
        {
            if (c == null) return;
            c.gameObject.SetActive(visible);
            Transform p = c.transform.parent;
            if (p != null && p.name == c.name + "_Marge") p.gameObject.SetActive(visible);
        }

        private static TextMeshProUGUI ChampTexte(Transform parent, string nom, Color couleur)
        {
            GameObject go = new GameObject(nom, typeof(RectTransform));
            go.transform.SetParent(parent, false);
            RectTransform rt = (RectTransform)go.transform;
            rt.anchorMin = Vector2.zero; rt.anchorMax = Vector2.one;
            rt.offsetMin = new Vector2(U(8f), U(2f)); rt.offsetMax = new Vector2(-U(8f), -U(2f));
            TextMeshProUGUI t = go.AddComponent<TextMeshProUGUI>();
            t.font = DesignTokens.Current.primaryFont;
            t.fontSize = U(8f);
            t.color = couleur;
            t.alignment = TextAlignmentOptions.MidlineLeft;
            t.raycastTarget = false;
            return t;
        }

        /// <summary>Item 0.6 — le littéral d'écran passe par une CLÉ. Le repli passé à `Libelle`
        /// est FRANÇAIS : `Libelle.De` rend le littéral quand la clé manque au bundle, donc un
        /// repli anglais resterait anglais à l'écran À TRAVERS la conversion (mesuré par le
        /// chantier B : 81 replis sur 107 étaient anglais après une première passe — « converti
        /// sans traduire »). Convertir sans traduire ne change rien pour le joueur.</summary>
        private static string Lib(string role, string litteral) =>
            MafiaCleanCity.I18n.Libelle.De("accueil", role, litteral);

    }
}
