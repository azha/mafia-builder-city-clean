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
        [SerializeField] private string baseUrl = "http://localhost";

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
            DernierCodeErreur = 0;

            // ⛔ SANS CETTE LIGNE, LES RÉSOLVEURS SONT MUETS (patron ㉘/㉚/⑨) : `Libelle.De` rend
            // le littéral tant que le dictionnaire est vide — branchement transparent.
            yield return I18nCatalog.Amorcer(new I18nClient { BaseUrl = baseUrl }, token);
            if (renduExpliciteDemande) yield break;   // un test a rendu pendant l'attente : on n'écrase pas

            yield return client.GetLegal(token,
                dto => DernierChargement = dto,
                (code, msg) => { DernierCodeErreur = code; DerniereErreur = msg; });
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
                    Libelle.De("loi", "bloc", "Vous n'avez encore engagé personne."), 9f,
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

            ConstruireCarteAvocat(recruteRoot, "Commis d'office",
                "gratuit — il fait ce qu'il peut", "EN PLACE", VertBon, null);
            ConstruireCarteAvocat(recruteRoot, "Un cabinet",
                "ça coûte — il connaît les juges", "DISPONIBLE", DesignTokens.Current.onSurfaceMuted,
                "boutique");
            ConstruireCarteAvocat(recruteRoot, "La filière",
                "ça coûte cher — et ça peut se retourner", "À VOS RISQUES",
                DesignTokens.Current.accentGold, "corruption_pipeline");

            TextMeshProUGUI info = NouveauTexteFiche(recruteRoot, "InfoFiliere",
                Libelle.De("loi", "bloc",
                    "La filière fait classer une affaire sans procès — mais elle se sert de gens " +
                    "qui, un jour, peuvent parler à leur tour."),
                8f, DesignTokens.Current.onSurfaceMuted, false);
            info.enableWordWrapping = true;
            TrackText(info.text);
        }

        /// <summary>Une carte de m-68 — verbatim (titre/sous-titre/badge). `tier == null` ⇒
        /// carte informative sans bouton (« Commis d'office » : aucune route ne le recrute, il
        /// est le repli par défaut). `tier != null` ⇒ bouton câblé sur `RecruterAvocat(tier)`.</summary>
        private void ConstruireCarteAvocat(Transform parent, string titreLitteral,
            string sousTitreLitteral, string badgeLitteral, Color couleurBadge, string tier)
        {
            GameObject carte = NouveauUI("Carte_" + Libelle.Slug(titreLitteral), parent);
            AjouterFond(carte, DesignTokens.Current.surfaceRow);
            VerticalLayoutGroup v = carte.AddComponent<VerticalLayoutGroup>();
            v.padding = new RectOffset(PxTrait(10f), PxTrait(10f), PxTrait(8f), PxTrait(8f));
            v.spacing = Px(3f);
            v.childControlWidth = true; v.childControlHeight = true;
            v.childForceExpandWidth = true; v.childForceExpandHeight = false;
            AddLayoutElement(carte, flexibleHeight: 0);

            GameObject ligne = NouveauUI("Ligne", carte.transform);
            HorizontalLayoutGroup h = ligne.AddComponent<HorizontalLayoutGroup>();
            h.childControlWidth = true; h.childControlHeight = true;
            h.childForceExpandWidth = true; h.childForceExpandHeight = false;
            AddLayoutElement(ligne, minHeight: Px(16f), flexibleHeight: 0);

            TextMeshProUGUI titre = NouveauTexteFiche(ligne.transform, "Titre",
                Libelle.De("loi", "bloc", titreLitteral), 10f, DesignTokens.Current.onSurfacePrimary, true);
            AddLayoutElement(titre.gameObject, flexibleWidth: 1);
            TrackText(titre.text);

            TextMeshProUGUI badge = NouveauTexteFiche(ligne.transform, "Badge",
                Libelle.De("loi", "badge", badgeLitteral), 7.5f, couleurBadge, true);
            badge.alignment = TextAlignmentOptions.Right;
            TrackText(badge.text);

            TextMeshProUGUI sous = NouveauTexteFiche(carte.transform, "SousTitre",
                Libelle.De("loi", "bloc", sousTitreLitteral), 8f, DesignTokens.Current.onSurfaceMuted, false);
            sous.enableWordWrapping = true;
            TrackText(sous.text);

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
                    Libelle.De("loi", "bloc", "Aucune affaire en cours."), 9f,
                    DesignTokens.Current.onSurfaceMuted, false);
                TrackText(vide.text);

                TextMeshProUGUI note = NouveauTexteFiche(affairesRoot, "AffairesNote",
                    Libelle.De("loi", "bloc",
                        "Une affaire naît d'une descente — rien sur cet écran n'en crée."), 7.5f,
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
            if (string.IsNullOrEmpty(DerniereErreur)) return;
            TextMeshProUGUI msg = NouveauTexteFiche(erreurRoot, "Erreur", DerniereErreur, 7.5f,
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
            titreTexte.text = Libelle.De("loi", "titre", "Le parloir est indisponible");
            sousTitreTexte.text = string.IsNullOrEmpty(DerniereErreur)
                ? Libelle.De("loi", "sous_titre", "Réessayez dans un instant.")
                : DerniereErreur;
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
                RendreMessageErreur();
                yield break;
            }
            DernierRecrutementOk = true;
            DerniereErreur = null;
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
                RendreMessageErreur();
                yield break;
            }
            DernierBasculementRetainerOk = true;
            DerniereErreur = null;
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
            // ⛔ SOUS L'HÔTE, PAS SOUS `mountParent` (patron ㉘/gabarit corrigé) : bâtir sous
            // `mountParent` fait naître la feuille en FRÈRE de l'hôte — toute garde en
            // `GetComponentsInChildren` mesurerait alors un sous-arbre VIDE.
            Transform root = mountParent != null ? transform : canvas.transform;

            GameObject racine = NouveauUI("LoiRoot", root);
            racinePleinEcran = (RectTransform)racine.transform;
            Etirer(racinePleinEcran);
            AjouterFond(racine, DesignTokens.Current.surfaceBase);
            racinePleinEcran.SetAsLastSibling();

            // ⛔ L'ÉCHELLE AVANT TOUTE CONVERSION — un RectTransform qui vient d'être étiré n'a
            // pas encore son `rect` résolu.
            Canvas.ForceUpdateCanvases();

            // ⚠️ PAS de `ScrollRect`/`Mask` — AUCUN écran de ce dépôt n'emploie ce patron (mesuré
            // sur ㉘/㊲/㉚) : un contenu qui déborde reste une limite PARTAGÉE par tous les écrans
            // opérationnels, pas un défaut propre à celui-ci. L'introduire ici sans pouvoir le
            // vérifier en Play Mode cette semaine (éditeur non lancé) serait le risque inverse de
            // « coller au code environnant ».
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

            GameObject rosterGo = NouveauUI("Roster", corpsGo.transform);
            VerticalLayoutGroup vr = rosterGo.AddComponent<VerticalLayoutGroup>();
            vr.spacing = Px(4f);
            vr.childControlWidth = true; vr.childControlHeight = true;
            vr.childForceExpandWidth = true; vr.childForceExpandHeight = false;
            AddLayoutElement(rosterGo, flexibleHeight: 0);
            rosterRoot = rosterGo.transform;

            GameObject recruteGo = NouveauUI("Recrutement", corpsGo.transform);
            VerticalLayoutGroup vc2 = recruteGo.AddComponent<VerticalLayoutGroup>();
            vc2.spacing = Px(6f);
            vc2.childControlWidth = true; vc2.childControlHeight = true;
            vc2.childForceExpandWidth = true; vc2.childForceExpandHeight = false;
            AddLayoutElement(recruteGo, flexibleHeight: 0);
            recruteRoot = recruteGo.transform;

            GameObject affairesGo = NouveauUI("Affaires", corpsGo.transform);
            VerticalLayoutGroup va = affairesGo.AddComponent<VerticalLayoutGroup>();
            va.spacing = Px(4f);
            va.childControlWidth = true; va.childControlHeight = true;
            va.childForceExpandWidth = true; va.childForceExpandHeight = false;
            AddLayoutElement(affairesGo, flexibleHeight: 0);
            affairesRoot = affairesGo.transform;

            GameObject erreurGo = NouveauUI("Erreur", corpsGo.transform);
            VerticalLayoutGroup ve = erreurGo.AddComponent<VerticalLayoutGroup>();
            ve.childControlWidth = true; ve.childControlHeight = true;
            ve.childForceExpandWidth = true; ve.childForceExpandHeight = false;
            AddLayoutElement(erreurGo, flexibleHeight: 0);
            erreurRoot = erreurGo.transform;
        }

        private Transform rosterRoot, recruteRoot, affairesRoot, erreurRoot;
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
                case "boutique": return "cabinet";
                case "corruption_pipeline": return "filière";
                default: return string.IsNullOrEmpty(tier) ? "tier inconnu" : tier;
            }
        }

        public static string TexteRetainer(bool retainer) => retainer ? "sous rétention" : "libre";

        public static string TexteBoutonRetainer(bool retainer) => retainer ? "LIBÉRER" : "METTRE SOUS RÉTENTION";
    }
}
