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
    /// <summary>ecran_loi « La loi » (㉛) — « le parloir », sur ses données réelles.
    ///
    /// Patron : `DistributionScreenController` (㉘, le voisin construit la veille — même famille
    /// de maquette `Tools/juge-visuel/v6/`, mêmes idiomes : `Libelle.De`, résolveurs nommés,
    /// `TrackText`/`RenderedTexts`, `ShellChrome.TopInsetPx`/`BottomInsetPx`).
    ///
    /// ⛔⛔ CE QUE LES SIX CADRES DE LA MAQUETTE (m-67..m-72) MONTRENT, ET CE QUE CET ÉCRAN NE PEUT
    /// PAS CONSTRUIRE : les six sont TOUS des états d'une affaire ACTIVE (Tomas Verrick, un
    /// coursier arrêté) — jauge de chaleur commune du HUD en haut (chrome du shell, PAS un
    /// `burn_risk_score` propre à cet écran : elle est IDENTIQUE sur les 6 cadres, valeur "tiède"
    /// figée, donc structurellement le bandeau partagé, pas une donnée de cas), `chargeSeverity`
    /// (« lourd »/« mineur »/« un crime »), `daysRemaining` (compte à rebours), `leak` (« SORTI »)
    /// par élément su. AUCUNE de ces clés n'est confirmée par un corps mesuré — `GET /v1/me/legal`
    /// rend `activeCases: []` sur LES DEUX comptes sondés (démo ET un compte fraîchement signé).
    /// ⇒ Cet écran ne rend AUCUN de ces cadres : `RendreAffaires` déclare le manque (§3) plutôt que
    /// de le combler. Voir Tools/loi-implementation-notes.md § Deviations pour le détail complet.
    ///
    /// Ce qui EST construit, sur données réelles mesurées (`rtk proxy curl`, 2026-09-03) :
    /// §1 le roster d'avocats déjà engagés (`lawyerRoster[]`, 5 clés) avec le geste de rétention
    /// (`PUT .../retainer`, mesuré par ce lot — absent du brief) ; §2 le recrutement pour les deux
    /// tiers payants (copie VERBATIM de m-68, `POST .../lawyers`) ; §3 la section affaires, VIDE
    /// honnêtement (aucun geste d'ici n'en crée — une affaire naît d'une descente).
    ///
    /// GÉOMÉTRIE — deux règles héritées, non négociables (mesurées ailleurs dans ce dépôt) :
    ///  · aucune valeur dérivée de `Screen.*` ni d'un `rect` lu au montage — passer par
    ///    `EchelleMaquette.Px(...)`. Maquette source NON confirmée (même trou que ㉘/㉚) :
    ///    `LargeurEcransBrennar` (300) conservé.
    ///  · `Canvas.scaleFactor` lu la frame de la création rend 1,0 — plausible et faux. Toute
    ///    lecture de géométrie attend `yield return null` après la construction.</summary>
    public class LoiScreenController : MonoBehaviour, IShellTenant
    {
        [Header("Backend")]
        private string baseUrlPose;   // posée par un appelant (tests, shell) ; sinon la source unique
        private string baseUrl { get => baseUrlPose ?? MafiaCleanCity.AdresseDuBack.Url; set => baseUrlPose = value; }
        // ---- points d'injection du shell (IShellTenant) -----------------------------------
        private Transform mountParent;

        /// <summary>Construit dès que le parent est connu — patron `DistributionScreenController`
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
        public GetLegalResponseDto DernierChargement { get; private set; }
        public string DerniereErreur { get; private set; }
        /// <summary>Garde de classe des refus (f2 2026-09-26) — la phrase SERVIE du refus de la route qui a échoué
        /// (`client.DernierePhraseDeRefus`, lue dans son onErr), montrée au sous-titre de l'état indisponible ; sinon la phrase
        /// de l'écran. `DerniereErreur` reste TECHNIQUE (crochet de test), jamais affiché.</summary>
        public string PhraseDuRefus { get; private set; }
        public long DernierCodeErreur { get; private set; }
        public bool DernierRecrutementOk { get; private set; }
        public bool DernierBasculementRetainerOk { get; private set; }
        /// <summary>Les textes RÉELLEMENT rendus, dans l'ordre — crochet de test (patron
        /// `ExceptionQueueController.RenderedTexts` / ㉘/㉚).</summary>
        public IReadOnlyList<string> RenderedTexts => renderedTexts;
        private readonly List<string> renderedTexts = new List<string>();

        private RectTransform racinePleinEcran;
        private LoiClient client;
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
            // n'appelle JAMAIS `Charger()`. Défaut payé sur ㉚ (patron ㉘) : `Charger()` défini,
            // aucun appelant, capture en échec sur « chargement non abouti après 20 s ». Et les
            // tests de CET écran ne peuvent pas voir ce trou : ils appellent `Charger()`
            // eux-mêmes — c'est la capture, et elle seule, qui l'aurait trouvé.
            if (!chargementAmorce) { chargementAmorce = true; coroutineChargement = StartCoroutine(Charger()); }
            transform.SetAsLastSibling();
        }

        private void EnsureInitialized()
        {
            if (initialise) return;
            initialise = true;
            client = new LoiClient { BaseUrl = baseUrl };
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
            PhraseDuRefus = null;
            DernierCodeErreur = 0;

            // ⛔ SANS CETTE LIGNE, LES RÉSOLVEURS SONT MUETS (patron ㉘/㉚/⑨) : `Libelle.De` rend
            // le littéral tant que le dictionnaire est vide — branchement transparent.
            yield return I18nCatalog.Amorcer(new I18nClient { BaseUrl = baseUrl }, token);
            if (renduExpliciteDemande) yield break;   // un test a rendu pendant l'attente : on n'écrase pas

            yield return client.GetLegal(token,
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

        /// <summary>Rend un corps FABRIQUÉ, sans réseau — réservé aux tests (patron ㉘/㊲,
        /// `RendrePourTest`). Ne prouve jamais que le back émet ce corps, seulement ce que
        /// l'écran EN FAIT.</summary>
        public void RendrePourTest(GetLegalResponseDto dto)
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
            DernierChargement = dto;
            AppliquerEtat(dto);
        }

        // ═══ Rendu — TROIS sections, patron ㉘ (un bloc = une méthode `Rendre<Nom>`) ═══════════

        private void AppliquerEtat(GetLegalResponseDto dto)
        {
            renderedTexts.Clear();
            RendreTitre();
            RendreRoster(dto.lawyerRoster);
            RendreRecrutement();
            RendreAffaires(dto.activeCases);
            RendreMessageErreur();
            RendreBande(dto.lawyerRoster);
        }

        // ═══ ㉛ B1 — la bande basse : le geste « LUI TROUVER UN AVOCAT » (cause 3, CLIENT-3 ; décision de f2 07/10) ═══════════════════════════

        /// <summary>Le geste du pied est offert tant qu'AUCUN avocat n'est retenu (aucun `retainer` : roster vide, ou tous libérés). Pure.</summary>
        public static bool GesteDeBasOffert(LawyerDto[] roster)
        {
            if (roster == null) return true;
            foreach (LawyerDto a in roster) if (a != null && a.retainer) return false;
            return true;
        }

        /// <summary>Le bouton du pied, s'il existe (crochet de test).</summary>
        public Button BoutonDuPied { get; private set; }

        /// <summary>La bande basse de la maquette (`.pl-bas`, cadres #67-#72) : la plaque, puis le geste `.geste` — « LUI TROUVER UN AVOCAT », légende « le commis d'office fait ce qu'il peut » (mots
        /// du cadre #67). ⚠️ SANS LA VOIX du lieutenant (`.dit`) : quel lieutenant parle et quelle phrase est une donnée que le back ne sert pas (TD-848) — rien n'est inventé. Le geste NE RECRUTE PAS :
        /// les trois façons de défendre (commis, cabinet, filière) sont les cartes de l'écran, et c'est ELLES qui engagent ; le geste y CONDUIT (le corps défile jusqu'à elles). Un geste qui paierait
        /// un cabinet sans le dire serait un bouton qui ment.</summary>
        private void RendreBande(LawyerDto[] roster)
        {
            ViderEnfants(basRoot, garder: "Filet");
            BoutonDuPied = null;
            if (!GesteDeBasOffert(roster)) return;

            GameObject bouton = NouveauUI("BoutonDuPied", basRoot);
            AjouterFond(bouton, PiedDEcran.Couleurs(PiedDEcran.Forme.Geste, PiedDEcran.Etat.Allume).fond);
            Button b = bouton.AddComponent<Button>();
            b.targetGraphic = bouton.GetComponent<Image>();
            b.onClick.AddListener(AllerAuRecrutement);
            HorizontalLayoutGroup h = bouton.AddComponent<HorizontalLayoutGroup>();
            h.padding = new RectOffset(PxTrait(11f), PxTrait(11f), PxTrait(9f), PxTrait(9f));
            h.spacing = Px(8f);
            h.childAlignment = TextAnchor.MiddleLeft;
            h.childControlWidth = true; h.childControlHeight = true;
            h.childForceExpandWidth = false; h.childForceExpandHeight = false;
            AddLayoutElement(bouton, minHeight: Px(26f), flexibleHeight: 0);

            TextMeshProUGUI lib = NouveauTexteFiche(bouton.transform, "Libelle",
                Libelle.De("loi", "bouton", "LUI TROUVER UN AVOCAT"), 9.5f, DesignTokens.Current.hudMoneyGold, true);
            lib.characterSpacing = 7f;   // `.geste` letter-spacing .7 px sur 9,5 px ≈ .074em
            lib.enableWordWrapping = true;
            AddLayoutElement(lib.gameObject, flexibleWidth: 1);
            TrackText(lib.text);

            TextMeshProUGUI legende = NouveauTexteFiche(bouton.transform, "Legende",
                Libelle.De("loi", "bloc", "le commis d’office fait ce qu’il peut"), 6.5f,
                PiedDEcran.Legende(PiedDEcran.Etat.Allume), false);
            legende.alignment = TextAlignmentOptions.MidlineRight;
            legende.enableWordWrapping = true;
            AddLayoutElement(legende.gameObject, flexibleWidth: 1);
            TrackText(legende.text);

            PiedDEcran.StylerLeBouton(bouton, lib, PiedDEcran.Forme.Geste);
            BoutonDuPied = b;
        }

        /// <summary>Le geste du pied : fait défiler le corps jusqu'aux trois façons de défendre. Sans défilement possible (tout tient), il ne fait rien — les cartes sont déjà là.</summary>
        public void AllerAuRecrutement()
        {
            if (listeDefilante == null || listeDefilante.Defilement == null || recruteRoot == null) return;
            ScrollRect sr = listeDefilante.Defilement;
            Canvas.ForceUpdateCanvases();
            RectTransform contenu = sr.content;
            RectTransform cible = (RectTransform)recruteRoot;
            float yHaut = contenu.InverseTransformPoint(cible.TransformPoint(new Vector3(0f, cible.rect.yMax, 0f))).y;   // le pivot du contenu est EN HAUT : 0 en haut, négatif en bas
            float maxDecalage = Mathf.Max(0f, contenu.rect.height - sr.viewport.rect.height);
            sr.verticalNormalizedPosition = maxDecalage <= 0f ? 1f : 1f - Mathf.Clamp01((-yHaut - Px(6f)) / maxDecalage);
        }

        /// <summary>Titre/sous-titre — AUCUN cadre de la maquette (m-67..m-72) ne montre cet écran
        /// à l'état « aucune affaire », donc ce texte n'est PAS une citation : « le parloir » est
        /// le nom que le chantier donne lui-même à cet écran (brief), le sous-titre est une
        /// synthèse d'interface, même geste que « VOS COURRIERS » sur ㉘ (aucune maquette non
        /// plus).</summary>
        private void RendreTitre()
        {
            titreTexte.text = Libelle.De("loi", "titre", "Le parloir");
            sousTitreTexte.text = Libelle.De("loi", "sous_titre",
                "Vos avocats, et ce qu'ils peuvent faire pour vous.");
            TrackText(titreTexte.text);
            TrackText(sousTitreTexte.text);
        }

        /// <summary>§1 — Le roster déjà engagé (`lawyerRoster[]`, 5 clés MESURÉES). Chaque ligne :
        /// `lawyerLabel` AFFICHÉ TEL QUEL (prose anglaise servie par le back, TD-452 — ne JAMAIS
        /// le traduire côté client), un tag de tier COURT (résolveur `TierLabelCourt`), l'état de
        /// rétention (résolveur `TexteRetainer`), le nombre d'affaires (`activeCaseCount`, brut —
        /// ce n'est pas une correspondance domaine→apparence, juste un nombre), et le geste de
        /// rétention (`PUT .../retainer`, brief §2 : « c'est le SEUL geste qui reste au joueur une
        /// fois l'avocat recruté, donc il porte l'écran »).</summary>
        private void RendreRoster(LawyerDto[] roster)
        {
            ViderEnfants(rosterRoot);

            TextMeshProUGUI label = NouveauTexteFiche(rosterRoot, "RosterLabel",
                Libelle.De("loi", "bloc", "VOS AVOCATS"), 8.5f,
                DesignTokens.Current.onSurfaceSecondary, false);
            label.characterSpacing = 4f;
            TrackText(label.text);

            if (roster == null || roster.Length == 0)
            {
                TextMeshProUGUI vide = NouveauTexteFiche(rosterRoot, "RosterVide",
                    MessageRosterVide, 9f,
                    DesignTokens.Current.onSurfaceMuted, false);
                TrackText(vide.text);
                return;
            }

            foreach (LawyerDto avocat in roster)
            {
                GameObject bloc = NouveauUI("Avocat_" + avocat.lawyerId, rosterRoot);
                AjouterFond(bloc, DesignTokens.Current.surfaceRow);
                VerticalLayoutGroup vc = bloc.AddComponent<VerticalLayoutGroup>();
                vc.padding = new RectOffset(PxTrait(8f), PxTrait(8f), PxTrait(6f), PxTrait(6f));
                vc.spacing = Px(3f);
                vc.childControlWidth = true; vc.childControlHeight = true;
                vc.childForceExpandWidth = true; vc.childForceExpandHeight = false;
                AddLayoutElement(bloc, flexibleHeight: 0);

                GameObject ligneNom = NouveauUI("Ligne", bloc.transform);
                HorizontalLayoutGroup h = ligneNom.AddComponent<HorizontalLayoutGroup>();
                h.spacing = Px(6f);
                h.childControlWidth = true; h.childControlHeight = true;
                h.childForceExpandWidth = true; h.childForceExpandHeight = false;
                AddLayoutElement(ligneNom, minHeight: Px(16f), flexibleHeight: 0);

                // `avocat.lawyerLabel` = prose SERVIE, jamais `Libelle.De` (ce n'est pas une
                // phrase fermée d'interface — TD-452, voir le commentaire de méthode).
                TextMeshProUGUI nom = NouveauTexteFiche(ligneNom.transform, "Nom",
                    avocat.lawyerLabel ?? "?", 9.5f, DesignTokens.Current.onSurfacePrimary, true);
                AddLayoutElement(nom.gameObject, flexibleWidth: 1);
                TrackText(nom.text);

                TextMeshProUGUI tag = NouveauTexteFiche(ligneNom.transform, "Tier",
                    LoiResolvers.TierLabelCourt(avocat.tier), 7.5f,
                    DesignTokens.Current.onSurfaceMuted, false);
                tag.alignment = TextAlignmentOptions.Right;
                TrackText(tag.text);

                TextMeshProUGUI etat = NouveauTexteFiche(bloc.transform, "Retainer",
                    LoiResolvers.TexteRetainer(avocat.retainer), 8f,
                    avocat.retainer ? VertBon : DesignTokens.Current.onSurfaceMuted, false);
                TrackText(etat.text);

                TextMeshProUGUI affaires = NouveauTexteFiche(bloc.transform, "Affaires",
                    TexteCompteAffaires(avocat.activeCaseCount), 8f,
                    DesignTokens.Current.onSurfaceMuted, false);
                TrackText(affaires.text);

                GameObject bouton = NouveauUI("BoutonRetainer", bloc.transform);
                AjouterFond(bouton, DesignTokens.Current.surfaceRaised);
                string lawyerId = avocat.lawyerId;
                bool nouvelEtat = !avocat.retainer;
                Button b = bouton.AddComponent<Button>();
                b.targetGraphic = bouton.GetComponent<Image>();
                b.onClick.AddListener(() => BasculerRetainer(lawyerId, nouvelEtat));
                HorizontalLayoutGroup hb = bouton.AddComponent<HorizontalLayoutGroup>();
                hb.padding = new RectOffset(PxTrait(10f), PxTrait(10f), PxTrait(6f), PxTrait(6f));
                hb.childAlignment = TextAnchor.MiddleCenter;
                hb.childControlWidth = true; hb.childControlHeight = true;
                AddLayoutElement(bouton, preferredHeight: Px(22f), flexibleHeight: 0);

                TextMeshProUGUI libBouton = NouveauTexteFiche(bouton.transform, "Libelle",
                    Libelle.De("loi", "bouton", LoiResolvers.TexteBoutonRetainer(avocat.retainer)),
                    8f, DesignTokens.Current.onSurfacePrimary, true);
                TrackText(libBouton.text);
            }
        }

        private static string TexteCompteAffaires(int n) =>
            n == 0 ? "0 affaire en cours" : n == 1 ? "1 affaire en cours" : $"{n} affaires en cours";

        /// <summary>§2 — Recrutement, copie VERBATIM de m-68 (« Lui trouver un avocat » /
        /// « Trois façons de le défendre. Aucune n'est sans revers. » — ce COUPLE-là reste
        /// PROPRE à une affaire active et n'est donc PAS repris ici, voir `RendreTitre`) : les
        /// TROIS cartes « Commis d'office » (informative, pas de route — badge « EN PLACE »),
        /// « Un cabinet » (`tier=boutique`, badge « DISPONIBLE ») et « La filière »
        /// (`tier=corruption_pipeline`, badge « À VOS RISQUES »), plus le paragraphe
        /// d'avertissement sur la filière. Les deux dernières sont CLIQUABLES —
        /// `POST /v1/me/legal/lawyers`.
        /// ⚠️ L'EYEBROW « QUI PEUT VOUS DÉFENDRE » (adapté depuis « QUI PEUT LE DÉFENDRE » — cet
        /// écran n'a personne de spécifique « à défendre ») N'EST PAS une citation exacte, voir
        /// Tools/loi-implementation-notes.md § Deviations.</summary>
        private void RendreRecrutement()
        {
            ViderEnfants(recruteRoot);

            TextMeshProUGUI eyebrow = NouveauTexteFiche(recruteRoot, "RecruteLabel",
                Libelle.De("loi", "bloc", "QUI PEUT VOUS DÉFENDRE"), 8.5f,
                DesignTokens.Current.onSurfaceSecondary, false);
            eyebrow.characterSpacing = 4f;
            TrackText(eyebrow.text);

            // ㉛ A3 / B2 (juge du 07/10) : la PASTILLE est encadrée (`.tag{border:1px solid currentColor}`) et sa couleur, comme son cadre,
            // vient de la recette mesurée du cadre 68 — « EN PLACE » est le vert #7fc99a (`Tag`), plus le turquoise du jeton de succès.
            ConstruireCarteAvocat(recruteRoot, "commis_d_office", "Commis d’office",
                "gratuit — il fait ce qu'il peut", "EN PLACE", DecorsDeScene.Filets.Loi.Tag, null);
            ConstruireCarteAvocat(recruteRoot, "un_cabinet", "Un cabinet",
                "ça coûte — il connaît les juges", "DISPONIBLE", DecorsDeScene.Filets.Loi.Tag_2,
                "boutique");
            ConstruireCarteAvocat(recruteRoot, "la_filiere", "La filière",
                "ça coûte cher — et ça peut se retourner", "À VOS RISQUES",
                DecorsDeScene.Filets.Loi.Tag_3, "corruption_pipeline");

            // ㉛ B3 : `.pl-rien{margin-top:10px;padding:8px 10px;border-left:2px solid #3b4650;font:6.9px/1.35}` et `b{font-weight:600}` sur « filière »
            GameObject avert = NouveauUI("AvertissementFiliere", recruteRoot);
            VerticalLayoutGroup va = avert.AddComponent<VerticalLayoutGroup>();
            va.padding = new RectOffset(PxTrait(10f), PxTrait(10f), PxTrait(8f), PxTrait(8f));
            va.childControlWidth = true; va.childControlHeight = true;
            va.childForceExpandWidth = true; va.childForceExpandHeight = false;
            AddLayoutElement(avert, flexibleHeight: 0);
            Filets.Poser((RectTransform)avert.transform, DecorsDeScene.Filets.Loi.PlRien);
            TextMeshProUGUI info = NouveauTexteFiche(avert.transform, "InfoFiliere",
                MettreEnGras(Libelle.De("loi", "bloc",
                    "La filière fait classer une affaire sans procès — mais elle se sert de gens " +
                    "qui, un jour, peuvent parler à leur tour."), "filière"),
                6.9f, DesignTokens.Current.onSurfaceMuted, false);
            info.enableWordWrapping = true;
            TrackText(info.text.Replace("<b>", "").Replace("</b>", ""));   // le corpus scanné reste le texte SERVI, sans balise
        }

        /// <summary>Le mot nommé, en gras, dans la phrase SERVIE (sa première occurrence, sans égard à la casse) ; la phrase telle quelle s'il n'y est pas.</summary>
        private static string MettreEnGras(string phrase, string mot)
        {
            if (string.IsNullOrEmpty(phrase) || string.IsNullOrEmpty(mot)) return phrase;
            int i = phrase.IndexOf(mot, System.StringComparison.OrdinalIgnoreCase);
            if (i < 0) return phrase;
            return phrase.Substring(0, i) + "<b>" + phrase.Substring(i, mot.Length) + "</b>" + phrase.Substring(i + mot.Length);
        }

        /// <summary>Les trois messages de l'état vide — UNE source : l'écran les rend, les tests les lisent ICI. Mesuré le
        /// 2026-09-22 (gate client, partie 1) : `EcranLoiE1` recopiait la troisième phrase et a rougi quand l'atelier l'a
        /// réécrite (ebf97d1e) ; une seconde copie du texte diverge au premier lot de copie.</summary>
        public static string MessageRosterVide => Libelle.De("loi", "bloc", "Vous n’avez encore engagé personne.");
        public static string MessageAffairesVide => Libelle.De("loi", "bloc", "Aucune affaire en cours.");
        public static string NoteAffaires => Libelle.De("loi", "bloc", "Une affaire naît d'une descente — rien ici n'en crée.");

        /// <summary>Une carte de m-68 — verbatim (titre/sous-titre/badge). `tier == null` ⇒
        /// carte informative sans bouton (« Commis d'office » : aucune route ne le recrute, il
        /// est le repli par défaut). `tier != null` ⇒ bouton câblé sur `RecruterAvocat(tier)`.</summary>
        /// <summary>L'état de chaque carte d'avocat (cadre 68, correspondance de CLIENT-1 du 08/10) : FIXE par carte.</summary>
        private static EtatDeBloc EtatDeLaCarte(string idStable)
        {
            switch (idStable)
            {
                case "commis_d_office": return DecorsDeScene.Etats.Loi.Pris;
                case "la_filiere": return DecorsDeScene.Etats.Loi.Risque;
                default: return DecorsDeScene.Etats.Loi.Neutre;
            }
        }

        private void ConstruireCarteAvocat(Transform parent, string idStable, string titreLitteral,
            string sousTitreLitteral, string badgeLitteral, SpecFilet[] recettePastille, string tier)
        {
            GameObject carte = NouveauUI("Carte_" + idStable, parent);
            // `.pl-choix` : l'ÉTAT de la carte (fond ET bord ensemble, `Filets.Etat` refuse un bord égal au fond — le A du juge sur ㉛).
            Image fondCarte = AjouterFond(carte, DesignTokens.Current.surfaceRow);
            Filets.Etat((RectTransform)carte.transform, fondCarte, EtatDeLaCarte(idStable));
            // `.pl-choix{display:flex;align-items:center;gap:9px;padding:8px 10px}` : le bloc nom + sous-ligne à gauche, la pastille à droite, CENTRÉE
            HorizontalLayoutGroup h = carte.AddComponent<HorizontalLayoutGroup>();
            h.padding = new RectOffset(PxTrait(10f), PxTrait(10f), PxTrait(8f), PxTrait(8f));
            h.spacing = Px(9f);
            h.childAlignment = TextAnchor.MiddleLeft;
            h.childControlWidth = true; h.childControlHeight = true;
            h.childForceExpandWidth = false; h.childForceExpandHeight = false;
            AddLayoutElement(carte, flexibleHeight: 0);

            GameObject nom = NouveauUI("Nom", carte.transform);   // `.n{flex:1;min-width:0}`
            VerticalLayoutGroup v = nom.AddComponent<VerticalLayoutGroup>();
            v.spacing = Px(2f);
            v.childControlWidth = true; v.childControlHeight = true;
            v.childForceExpandWidth = true; v.childForceExpandHeight = false;
            AddLayoutElement(nom, flexibleWidth: 1);

            TextMeshProUGUI titre = NouveauTexteFiche(nom.transform, "Titre",
                Libelle.De("loi", "bloc", titreLitteral), 10f, DesignTokens.Current.onSurfacePrimary, true);
            TrackText(titre.text);

            TextMeshProUGUI sous = NouveauTexteFiche(nom.transform, "SousTitre",
                Libelle.De("loi", "bloc", sousTitreLitteral), 8f, DesignTokens.Current.onSurfaceMuted, false);
            sous.enableWordWrapping = true;
            TrackText(sous.text);

            // `.tag{font:700 6.6px;letter-spacing:.8px;border:1px solid currentColor;border-radius:2px;padding:3px 5px}` : le cadre ET l'encre sont
            // celles de la recette mesurée (`currentColor` = la couleur du texte).
            GameObject pastille = NouveauUI("Pastille", carte.transform);
            HorizontalLayoutGroup hp = pastille.AddComponent<HorizontalLayoutGroup>();
            hp.padding = new RectOffset(PxTrait(5f), PxTrait(5f), PxTrait(3f), PxTrait(3f));
            hp.childControlWidth = true; hp.childControlHeight = true;
            hp.childForceExpandWidth = false; hp.childForceExpandHeight = false;
            AddLayoutElement(pastille, flexibleWidth: 0);
            Filets.Poser((RectTransform)pastille.transform, recettePastille);
            TextMeshProUGUI badge = NouveauTexteFiche(pastille.transform, "Badge",
                Libelle.De("loi", "badge", badgeLitteral), 6.6f, recettePastille[0].Couleur.Resoudre(), true);
            badge.characterSpacing = 12f;   // .8px sur 6,6px ≈ .12em
            badge.enableWordWrapping = false;
            TrackText(badge.text);

            if (tier == null) return;   // « Commis d'office » — informatif seul, aucune route.

            Button b = carte.AddComponent<Button>();
            b.targetGraphic = carte.GetComponent<Image>();
            b.onClick.AddListener(() => RecruterAvocat(tier));
        }

        /// <summary>§3 — Affaires en cours, ÉTAT VIDE HONNÊTE (brief §3). `activeCases` mesuré
        /// VIDE sur les deux comptes sondés — aucun geste de CET écran n'en crée (une affaire
        /// naît d'une descente, mécanisme hors des 4 routes données). Repli défensif si un jour
        /// `activeCases` n'est plus vide (jamais observé, jamais exercé par un test réel) :
        /// affiche le COMPTE seul — pas une réduction R2.2 d'une projection connue, `LegalCaseDto`
        /// ne porte AUCUN champ mesuré à afficher (voir `LoiDtos.cs`), le compte est la seule
        /// information honnête disponible sans inventer de domaine.</summary>
        private void RendreAffaires(LegalCaseDto[] cases)
        {
            ViderEnfants(affairesRoot);

            TextMeshProUGUI label = NouveauTexteFiche(affairesRoot, "AffairesLabel",
                Libelle.De("loi", "bloc", "AFFAIRES EN COURS"), 8.5f,
                DesignTokens.Current.onSurfaceSecondary, false);
            label.characterSpacing = 4f;
            TrackText(label.text);

            int n = cases?.Length ?? 0;
            if (n == 0)
            {
                TextMeshProUGUI vide = NouveauTexteFiche(affairesRoot, "AffairesVide",
                    MessageAffairesVide, 9f,
                    DesignTokens.Current.onSurfaceMuted, false);
                TrackText(vide.text);

                TextMeshProUGUI note = NouveauTexteFiche(affairesRoot, "AffairesNote",
                    NoteAffaires, 7.5f,
                    DesignTokens.Current.onSurfaceMuted, false);
                note.enableWordWrapping = true;
                TrackText(note.text);
                return;
            }

            // ⛔ JAMAIS EXERCÉ SUR LES COMPTES SONDÉS — voir le commentaire de méthode.
            TextMeshProUGUI compte = NouveauTexteFiche(affairesRoot, "AffairesCompte",
                n == 1 ? "1 affaire en cours" : $"{n} affaires en cours", 9f,
                DesignTokens.Current.onSurfacePrimary, true);
            TrackText(compte.text);
        }

        private void RendreMessageErreur()
        {
            ViderEnfants(erreurRoot);
            // la phrase du refus (servie, sinon celle de l'écran), jamais `DerniereErreur` (garde de classe des refus)
            if (string.IsNullOrEmpty(PhraseDuRefus)) return;
            TextMeshProUGUI msg = NouveauTexteFiche(erreurRoot, "Erreur", PhraseDuRefus, 7.5f,
                RougeMauvais, false);
            msg.enableWordWrapping = true;
            TrackText(msg.text);
        }

        /// <summary>Repli NOMMÉ sur échec réseau — jamais une exception, jamais un écran noir
        /// (patron ㊲/㉘ : `Render(null)` a fait planter un autre écran de ce dépôt à la première
        /// ligne qui lisait le payload).</summary>
        private void RendreEtatIndisponible()
        {
            ViderEnfants(rosterRoot);
            ViderEnfants(recruteRoot);
            ViderEnfants(affairesRoot);
            ViderEnfants(erreurRoot);
            titreTexte.text = Libelle.De("loi", "titre", "Le parloir n'a pas répondu");
            // la phrase SERVIE du refus, sinon celle de l'écran — jamais `DerniereErreur` (garde de classe des refus)
            sousTitreTexte.text = PhraseDuRefus ?? Libelle.De("loi", "sous_titre", "Réessayez dans un instant.");
            TrackText(titreTexte.text);
            TrackText(sousTitreTexte.text);
        }

        // ═══ Le geste « recruter un avocat » ═══════════════════════════════════════════════════

        public void RecruterAvocat(string tier)
        {
            StartCoroutine(RecruterAvocatCoroutine(tier));
        }

        /// <summary>Crochet de test : awaitable, contrairement à `RecruterAvocat()`.</summary>
        public IEnumerator RecruterAvocatEtRecharger(string tier) => RecruterAvocatCoroutine(tier);

        private IEnumerator RecruterAvocatCoroutine(string tier)
        {
            DernierRecrutementOk = false;
            var body = new PostLegalLawyersBody { tier = tier };
            string erreur = null;
            PostLegalLawyersResponseDto rep = null;
            yield return client.PostLegalLawyers(token, body,
                dto => rep = dto,
                (code, msg) => erreur = $"{code}: {msg}");
            if (erreur != null)
            {
                DerniereErreur = erreur;
                PhraseDuRefus = client.DernierePhraseDeRefus   // table 70
                    ?? Libelle.Gabarit("loi.refus.l_embauche_n_a_pas_abouti_reessayez_plus_tard", "L\u2019embauche n\u2019a pas abouti. Réessayez plus tard.");
                RendreMessageErreur();
                yield break;
            }
            DernierRecrutementOk = true;
            DerniereErreur = null;
            PhraseDuRefus = null;
            DernierChargement = new GetLegalResponseDto
            {
                activeCases = rep.activeCases,
                lawyerRoster = rep.lawyerRoster,
            };
            AppliquerEtat(DernierChargement);
        }

        // ═══ Le geste « rétention » (PUT .../retainer) — brief §2, le SEUL geste qui reste au
        // joueur une fois l'avocat recruté ═══════════════════════════════════════════════════════

        public void BasculerRetainer(string lawyerId, bool nouvelEtat)
        {
            StartCoroutine(BasculerRetainerCoroutine(lawyerId, nouvelEtat));
        }

        public IEnumerator BasculerRetainerEtRecharger(string lawyerId, bool nouvelEtat) =>
            BasculerRetainerCoroutine(lawyerId, nouvelEtat);

        private IEnumerator BasculerRetainerCoroutine(string lawyerId, bool nouvelEtat)
        {
            DernierBasculementRetainerOk = false;
            var body = new PutLegalLawyersRetainerBody { active = nouvelEtat };
            string erreur = null;
            PutLegalLawyersRetainerResponseDto rep = null;
            yield return client.PutLegalLawyersRetainer(token, lawyerId, body,
                dto => rep = dto,
                (code, msg) => erreur = $"{code}: {msg}");
            if (erreur != null)
            {
                DerniereErreur = erreur;
                PhraseDuRefus = client.DernierePhraseDeRefus   // table 70
                    ?? Libelle.Gabarit("loi.refus.la_retention_n_a_pas_change_reessayez_plus_tard", "La rétention n\u2019a pas changé. Réessayez plus tard.");
                RendreMessageErreur();
                yield break;
            }
            DernierBasculementRetainerOk = true;
            DerniereErreur = null;
            PhraseDuRefus = null;
            DernierChargement = new GetLegalResponseDto
            {
                activeCases = rep.activeCases,
                lawyerRoster = rep.lawyerRoster,
            };
            AppliquerEtat(DernierChargement);
        }

        // ═══ Construction de la mise en page ═════════════════════════════════════════════════

        private void BuildLayout()
        {
            Canvas canvas = MafiaCleanCity.Shell.CanvasRacine.Resoudre(transform, mountParent);
            // ⛔ SOUS L'HÔTE, PAS SOUS `mountParent` (patron ㉘/gabarit corrigé) : bâtir sous
            // `mountParent` fait naître la feuille en FRÈRE de l'hôte — toute garde en
            // `GetComponentsInChildren` mesurerait alors un sous-arbre VIDE.
            Transform root = mountParent != null ? transform : canvas.transform;

            GameObject racine = NouveauUI("LoiRoot", root);
            racinePleinEcran = (RectTransform)racine.transform;
            Etirer(racinePleinEcran);
            // LE DÉCOR DE SCÈNE (CLIENT-2, design `Tools/decor-de-scene-2026-10-07/DESIGN.md`) : la scène du district à 0,18, le voile,
            // le support B de `.parl6` (#1b1f24 → #14181d 58 % → #101317) — DÉCLARÉS au catalogue, plus de fond plat ici.
            DecorPose decor = DecorDeScene.Poser(racine.transform, DecorsDeScene.Loi);
            racinePleinEcran.SetAsLastSibling();

            // ⛔ L'ÉCHELLE AVANT TOUTE CONVERSION — un RectTransform qui vient d'être étiré n'a
            // pas encore son `rect` résolu.
            Canvas.ForceUpdateCanvases();

            // ㉛ B1 + cause 7 (CLIENT-3, 07/10) : la racine est une PILE — le CORPS (masque + défilement : `ListeDefilante`, un fondu et un ascenseur quand le contenu déborde) puis la
            // BANDE BASSE `.bas` de la maquette (plaque #141a21, filet 2 px #2c3640, le geste), qui reste en PIED quoi que le corps contienne. Les marges d'écran (haut, bas) sont celles
            // de la pile ; l'ancien « PAS de ScrollRect » (écran jamais lancé) est levé par la classe : la garde ListeDefilante le sait.
            VerticalLayoutGroup pilePage = racine.AddComponent<VerticalLayoutGroup>();
            pilePage.padding = new RectOffset(0, 0, 0, (int)ShellChrome.BottomInsetPx);   // le haut : ReserverLaBande, ci-dessous
            pilePage.spacing = 0f;
            pilePage.childControlWidth = true; pilePage.childControlHeight = true;
            pilePage.childForceExpandWidth = true; pilePage.childForceExpandHeight = false;
            // §5.6 du design : l'en-tête commence SOUS max(barre, bande de scène 21 %), comme `.parl6` sous la scène de la maquette.
            DecorDeScene.ReserverLaBande(pilePage, decor, 0f);

            // C-a + C-b (juge groupé du 07/10, f2) : le BANDEAU DE TITRE de la maquette (`.pl-tete`, `EnteteDEcran`) est le premier élément de la pile, pleine largeur, et NE DÉFILE PAS (`flex:none` : B1, le fragment de titre coupé)
            var (titreDuBandeau, sousTitreDuBandeau) = EnteteDEcran.Construire(racine.transform, EnteteDEcran.Loi, Px,
                DesignTokens.Current.hudSerifFont, DesignTokens.Current.primaryFont, DesignTokens.Current.onSurfaceSecondary, 10f);
            GameObject corpsGo = NouveauUI("Corps", racine.transform);
            corpsGo.AddComponent<RectMask2D>();
            LayoutElement corpsLe = corpsGo.AddComponent<LayoutElement>();
            corpsLe.flexibleHeight = 1f; corpsLe.minHeight = 0f;

            GameObject contenuGo = NouveauUI("Contenu", corpsGo.transform);
            RectTransform contenuRt = (RectTransform)contenuGo.transform;
            contenuRt.anchorMin = new Vector2(0f, 1f); contenuRt.anchorMax = new Vector2(1f, 1f);
            contenuRt.pivot = new Vector2(0.5f, 1f);
            contenuRt.offsetMin = Vector2.zero; contenuRt.offsetMax = Vector2.zero;
            VerticalLayoutGroup pile = contenuGo.AddComponent<VerticalLayoutGroup>();
            pile.padding = new RectOffset(PxTrait(16f), PxTrait(16f), PxTrait(14f), PxTrait(14f));
            pile.spacing = Px(12f);
            pile.childControlWidth = true; pile.childControlHeight = true;
            pile.childForceExpandWidth = true; pile.childForceExpandHeight = false;
            pile.childAlignment = TextAnchor.UpperCenter;
            ContentSizeFitter ajuste = contenuGo.AddComponent<ContentSizeFitter>();
            ajuste.verticalFit = ContentSizeFitter.FitMode.PreferredSize;
            listeDefilante = ListeDefilante.Equiper((RectTransform)corpsGo.transform, contenuRt, DesignTokens.Current.surfaceBase);

            titreTexte = titreDuBandeau;
            sousTitreTexte = sousTitreDuBandeau;

            GameObject rosterGo = NouveauUI("Roster", contenuGo.transform);
            VerticalLayoutGroup vr = rosterGo.AddComponent<VerticalLayoutGroup>();
            vr.spacing = Px(4f);
            vr.childControlWidth = true; vr.childControlHeight = true;
            vr.childForceExpandWidth = true; vr.childForceExpandHeight = false;
            AddLayoutElement(rosterGo, flexibleHeight: 0);
            rosterRoot = rosterGo.transform;

            GameObject recruteGo = NouveauUI("Recrutement", contenuGo.transform);
            VerticalLayoutGroup vc2 = recruteGo.AddComponent<VerticalLayoutGroup>();
            vc2.spacing = Px(6f);
            vc2.childControlWidth = true; vc2.childControlHeight = true;
            vc2.childForceExpandWidth = true; vc2.childForceExpandHeight = false;
            AddLayoutElement(recruteGo, flexibleHeight: 0);
            recruteRoot = recruteGo.transform;

            GameObject affairesGo = NouveauUI("Affaires", contenuGo.transform);
            VerticalLayoutGroup va = affairesGo.AddComponent<VerticalLayoutGroup>();
            va.spacing = Px(4f);
            va.childControlWidth = true; va.childControlHeight = true;
            va.childForceExpandWidth = true; va.childForceExpandHeight = false;
            AddLayoutElement(affairesGo, flexibleHeight: 0);
            affairesRoot = affairesGo.transform;

            GameObject erreurGo = NouveauUI("Erreur", contenuGo.transform);
            VerticalLayoutGroup ve = erreurGo.AddComponent<VerticalLayoutGroup>();
            ve.childControlWidth = true; ve.childControlHeight = true;
            ve.childForceExpandWidth = true; ve.childForceExpandHeight = false;
            AddLayoutElement(erreurGo, flexibleHeight: 0);
            erreurRoot = erreurGo.transform;

            // ㉛ B1 — la bande basse `.bas` : filet haut 2 px #2c3640, plaque #141a21, padding 9/13/15 CSS ; le geste y est posé par `RendreBande` (état servi)
            GameObject basGo = NouveauUI("Bas", racine.transform);
            AjouterFond(basGo, PiedDEcran.PlaqueDuBas);
            VerticalLayoutGroup bas = basGo.AddComponent<VerticalLayoutGroup>();
            bas.padding = new RectOffset(PxTrait(13f), PxTrait(13f), PxTrait(9f) + PxTrait(2f), PxTrait(15f));
            bas.spacing = Px(5f);
            bas.childControlWidth = true; bas.childControlHeight = true;
            bas.childForceExpandWidth = true; bas.childForceExpandHeight = false;
            AddLayoutElement(basGo, flexibleHeight: 0);
            GameObject filet = NouveauUI("Filet", basGo.transform);
            filet.AddComponent<LayoutElement>().ignoreLayout = true;
            RectTransform filetRt = (RectTransform)filet.transform;
            filetRt.anchorMin = new Vector2(0f, 1f); filetRt.anchorMax = new Vector2(1f, 1f);
            filetRt.pivot = new Vector2(0.5f, 1f); filetRt.sizeDelta = new Vector2(0f, Px(2f));
            filetRt.anchoredPosition = Vector2.zero;
            filet.AddComponent<Image>().color = PiedDEcran.FiletDuBas;
            basRoot = basGo.transform;
        }

        private Transform rosterRoot, recruteRoot, affairesRoot, erreurRoot, basRoot;
        private ListeDefilante listeDefilante;
        private TextMeshProUGUI titreTexte, sousTitreTexte;

        // ═══ Palette — locale, patron ㉘ (aucun token `DesignTokens` dédié n'existe pour ce
        // consommateur précis). ═══════════════════════════════════════════════════════════════
        private static Color VertBon => DesignTokens.Current.accentSuccess;
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

        private static void ViderEnfants(Transform parent, string garder = null)
        {
            if (parent == null) return;
            for (int i = parent.childCount - 1; i >= 0; i--)
                if (garder == null || parent.GetChild(i).name != garder)
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

    /// <summary>ecran_loi — les correspondances « valeur du domaine → apparence », chacune en
    /// FONCTION NOMMÉE prenant la valeur du domaine (patron `HeatBucketResolver`/
    /// `DistributionResolvers`) — jamais un switch recopié deux fois, jamais une correspondance
    /// portée par l'ordre d'un tableau ou par un commentaire.</summary>
    public static class LoiResolvers
    {
        /// <summary>`tier` — domaine ANNONCÉ FERMÉ par le 422 de `POST /v1/me/legal/lawyers`
        /// (mesuré : "tier must be 'boutique' or 'corruption_pipeline'.") — mais CE message
        /// ferme le corps ENVOYÉ à la création, pas la valeur SERVIE dans `lawyerRoster[].tier`
        /// (observée UNE fois : "boutique"). Repli GRACIEUX (patron
        /// `DistributionResolvers.TexteVehicule`, qui garde le même repli malgré un domaine de
        /// BODY confirmé fermé par un 422 sœur) — jamais de throw sur une valeur SERVIE.</summary>
        public static string TierLabelCourt(string tier)
        {
            switch (tier)
            {
                case "public_defender": return MafiaCleanCity.I18n.Libelle.De("loi", "bloc", "Commis d’office");   // atelier 29 : clé DÉJÀ servie
                case "boutique": return MafiaCleanCity.I18n.Libelle.De("loi", "bloc", "cabinet");
                case "corruption_pipeline": return MafiaCleanCity.I18n.Libelle.De("loi", "bloc", "filière");
                default: return MafiaCleanCity.I18n.Repli.Type(tier);   // plus « tier inconnu » (un mot anglais) ni le palier brut — atelier 28
            }
        }

        public static string TexteRetainer(bool retainer) => retainer ? "sous rétention" : "libre";

        public static string TexteBoutonRetainer(bool retainer) => retainer ? "LIBÉRER" : "METTRE SOUS RÉTENTION";
    }
}
