using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.UI;
using TMPro;
using MafiaCleanCity.Shell;
using MafiaCleanCity.Theme;

namespace MafiaCleanCity.Operational
{
    /// <summary>Les trois VUES du dossier (cadres 150, 151, 135 de `ecrans-brennar-6.html`, `.dos6`). Pistes par défaut ; Acteurs par la
    /// 3ᵉ fenêtre (la bascule, `.fen.porte`) ; Vide = l'état « rien à votre nom », sans bascule (décision f2 du 08/10).</summary>
    public enum VueDossier { Pistes, Acteurs, Vide }

    /// <summary>screen_b7 « Forensic » ㊴ — LE DOSSIER, d'après les cadres 150 (les pistes), 151 (les acteurs) et 135 (l'état vide) de la
    /// maquette, DESIGN `Tools/ecran-39-elements-absents/DESIGN.md` (v5.2, revue ⊥ APPROVED).
    ///
    /// Ce que l'écran montre est ce que le back SERT : trois bandes (`GET /v1/me/forensic`, dont UNE seule vivante) et le roster des
    /// acteurs (`GET /v1/me/internal-affairs/actors`). Il n'ACHÈTE rien : le prix d'un renseignement n'est servi par aucune route
    /// avant l'achat — le pied et le geste par ligne sont dessinés ÉTEINTS, et rien d'éteint n'émet de requête.
    ///
    /// GÉOMÉTRIE — aucune valeur dérivée de `Screen.*` ni d'un `rect` lu au montage : `EchelleMaquette.Px(...)` sur la largeur DÉCLARÉE
    /// de la maquette de la série 6. `Canvas.scaleFactor` lu la frame de la création rend 1,0 : toute lecture attend `yield return null`.</summary>
    public class ForensicScreenController : MonoBehaviour, IShellTenant
    {
        [Header("Backend")]
        private string baseUrlPose;   // posée par un appelant (tests, shell) ; sinon la source unique
        private string baseUrl { get => baseUrlPose ?? MafiaCleanCity.AdresseDuBack.Url; set => baseUrlPose = value; }
        // ---- points d'injection du shell (IShellTenant) -----------------------------------
        private Transform mountParent;
        public void SetMountParent(Transform parent) => mountParent = parent;

        private string token;
        public void SetToken(string t) => token = t;

        // ---- crochets de test ---------------------------------------------------------------
        public GetForensicResponseDto DernierChargement { get; private set; }
        public string DerniereErreur { get; private set; }
        public long DernierCodeErreur { get; private set; }
        /// <summary>Le roster servi (null : pas encore reçu OU route en erreur — voir <see cref="ActeursIndisponibles"/>).</summary>
        public ActeurDto[] DerniersActeurs { get; private set; }
        public bool ActeursIndisponibles { get; private set; }
        /// <summary>Q1 — `lawyerId → nom de la personne` (null : pas reçu, route en erreur, ou aucun avocat au roster).</summary>
        public Dictionary<string, string> DerniersNoms { get; private set; }
        public bool NomsIndisponibles { get; private set; }
        /// <summary>La vue MONTRÉE (l'état vide l'emporte sur le choix du joueur).</summary>
        public VueDossier Vue { get; private set; } = VueDossier.Pistes;
        /// <summary>Les requêtes envoyées par l'écran (compteur des gardes « un geste éteint n'émet rien »).</summary>
        public int RequetesEmises => client != null ? client.RequetesEmises : 0;

        private RectTransform racinePleinEcran;
        private ForensicClient client;
        private bool initialise;
        private bool veutLesActeurs;   // le choix du joueur (la porte) ; ne vaut que si l'état n'est pas vide

        private float Px(float css) =>
            EchelleMaquette.Px(css, racinePleinEcran, EchelleMaquette.LargeurEcransBrennar6);
        private int PxTrait(float css) =>
            EchelleMaquette.PxTrait(css, racinePleinEcran, EchelleMaquette.LargeurEcransBrennar6);

        // ⛔ `Start()`, PAS `Awake()` — MESURÉ le 2026-09-03 au premier montage réel de ㊴ sous chrome : sa racine était bâtie sous le
        // CANVAS et non sous `ContentSlot` (`Awake()` s'exécute DANS `AddComponent`, donc AVANT `SetMountParent`). C'est l'appartenance
        // à `ContentSlot` — index 0, sous les barres — qui garantit la non-occlusion par l'ordre de fratrie.
        private void Start()
        {
            EnsureInitialized();
            amorce = StartCoroutine(Amorcer());
        }

        /// <summary>Hors session on ne charge rien et on reste sur l'état NOMMÉ (patron ㊲) ; un test qui tient l'écran le dit.</summary>
        private IEnumerator Amorcer()
        {
            if (string.IsNullOrEmpty(token)) yield break;   // monté hors session : rien à charger
            if (corpsImposeParUnTest) yield break;          // un test tient l'écran
            yield return Charger();
        }

        private void EnsureInitialized()
        {
            if (initialise) return;
            initialise = true;
            client = new ForensicClient { BaseUrl = baseUrl };
            BuildLayout();
            Rendre();   // la coquille NOMMÉE : trois fenêtres à « — », trois pistes éteintes, jamais un écran noir
        }

        // ═══ Chargement ══════════════════════════════════════════════════════════════════════

        /// <summary>Charge les deux surfaces : les bandes, puis le roster. Les deux erreurs sont INDÉPENDANTES : le roster en erreur
        /// laisse les pistes ; les bandes en erreur laissent les acteurs.</summary>
        public IEnumerator Charger()
        {
            EnsureInitialized();
            DerniereErreur = null;
            DernierCodeErreur = 0;
            DernierChargement = null;
            DerniersActeurs = null;
            ActeursIndisponibles = false;
            DerniersNoms = null;
            NomsIndisponibles = false;

            yield return client.GetForensic(token,
                dto => DernierChargement = dto,
                (code, msg) => { DernierCodeErreur = code; DerniereErreur = msg; });
            yield return client.GetActeurs(token,
                acteurs => DerniersActeurs = acteurs,
                (code, msg) => { ActeursIndisponibles = true; if (DerniereErreur == null) { DernierCodeErreur = code; DerniereErreur = msg; } });

            // Q1 : les noms ne se demandent que s'il y a un AVOCAT au roster ; leur erreur laisse les références (jamais un bandeau).
            if (DossierCalculs.AUnAvocat(DerniersActeurs))
                yield return client.GetNomsAvocats(token,
                    noms => DerniersNoms = noms,
                    (code, msg) => NomsIndisponibles = true);

            // La frame de création rend des rects non résolus : on attend le layout AVANT de rendre quoi que ce soit qui lise une géométrie.
            yield return null;
            Rendre();
        }

        /// <summary>⛔ FERME LA COURSE ENTRE `Start()` ET LE RENDU DE TEST : un test qui pose un VRAI jeton puis impose un corps laisse
        /// `Amorcer()` partir en parallèle et écraser le corps fabriqué (mesuré sur ⑨, patron `2efdf2e`). `StopCoroutine`, pas un
        /// drapeau qu'on espère relu.</summary>
        private bool corpsImposeParUnTest;
        private Coroutine amorce;

        /// <summary>Rend des corps FABRIQUÉS, sans réseau — réservé aux tests. Ne prouve jamais que le back émet ces corps, seulement ce
        /// que l'écran EN FAIT. `acteurs` null = la route est en erreur (« — »), `new ActeurDto[0]` = roster vide servi.</summary>
        public void RendrePourTest(GetForensicResponseDto dto, ActeurDto[] acteurs = null, Dictionary<string, string> noms = null)
        {
            corpsImposeParUnTest = true;
            if (amorce != null) { StopCoroutine(amorce); amorce = null; }
            EnsureInitialized();
            DernierChargement = dto;
            DerniersActeurs = acteurs;
            ActeursIndisponibles = acteurs == null;
            DerniersNoms = noms;
            NomsIndisponibles = false;
            Rendre();
        }

        /// <summary>La porte : bascule pistes ↔ acteurs. Sans effet sur l'état vide (rien à basculer). Locale : AUCUNE requête.</summary>
        public void Basculer()
        {
            if (Vue == VueDossier.Vide) return;
            veutLesActeurs = !veutLesActeurs;
            Rendre();
        }

        // ═══ Rendu ═══════════════════════════════════════════════════════════════════════════

        private void Rendre()
        {
            if (racinePleinEcran == null) return;
            if (DossierCalculs.EtatVide(DernierChargement, DerniersActeurs)) Vue = VueDossier.Vide;
            else Vue = veutLesActeurs ? VueDossier.Acteurs : VueDossier.Pistes;

            RendreEnseigne();
            RendreCompteurs();
            RendreElast();
            RendrePanneau();
            RendrePied();
        }

        private void RendreEnseigne()
        {
            switch (Vue)
            {
                case VueDossier.Acteurs: sousTitre.text = Lib("qui parle, et qui a peur"); break;
                // ⛔ PAS `Lib` : `forensic.bloc.rien_a_votre_nom` est la clé du texte `.rien` (« Rien à votre nom. », servie avec son point) — le sous-titre
                // de l'enseigne (« rien à votre nom », sans point) a son propre rôle, sinon les deux textes ne pourraient jamais diverger.
                case VueDossier.Vide: sousTitre.text = MafiaCleanCity.I18n.Libelle.De("forensic", "enseigne", "rien à votre nom"); break;
                default: sousTitre.text = Lib("trois pistes, et elles ne se mélangent pas"); break;
            }
        }

        private void RendreCompteurs()
        {
            GetForensicResponseDto d = DernierChargement;
            ActeurDto[] a = DerniersActeurs;
            int chaudes = d == null ? -1 : DossierCalculs.PistesChaudes(d), vivantes = d == null ? -1 : DossierCalculs.PistesVivantes();
            int franchies = d == null ? -1 : DossierCalculs.PistesFranchies(d);
            int tiennent = a == null ? -1 : DossierCalculs.ActeursQuiTiennent(a), connus = a == null ? -1 : a.Length;
            int peur = a == null ? -1 : DossierCalculs.ActeursQuiOntPeur(a);

            switch (Vue)
            {
                case VueDossier.Acteurs:
                    MajCompteur(0, connus, -1, Lib("acteurs connus"), RecetteIci);
                    MajCompteur(1, peur, -1, Lib("qui ont peur"), DecorsDeScene.Filets.Forensic.Fen);
                    MajCompteur(2, chaudes, vivantes, Lib("pistes chaudes"), DecorsDeScene.Filets.Forensic.FenPorte, "‹");
                    break;
                case VueDossier.Vide:
                    // 135 : trois fenêtres NUES, sans ici ni porte. Le dénominateur est celui des pistes VIVANTES (R5, déviation étiquetée).
                    MajCompteur(0, 0, vivantes, Lib("pistes chaudes"), DecorsDeScene.Filets.Forensic.Fen);
                    MajCompteur(1, 0, -1, Lib("franchies"), DecorsDeScene.Filets.Forensic.Fen);
                    MajCompteur(2, 0, -1, Lib("acteurs connus"), DecorsDeScene.Filets.Forensic.Fen);
                    break;
                default:
                    MajCompteur(0, chaudes, vivantes, Lib("pistes chaudes"), RecetteIci);
                    MajCompteur(1, franchies, -1, Lib("franchies"), DecorsDeScene.Filets.Forensic.Fen);
                    MajCompteur(2, tiennent, connus, Lib("acteurs qui tiennent"), DecorsDeScene.Filets.Forensic.FenPorte, "›");
                    break;
            }
            bool porte = Vue != VueDossier.Vide;
            fenPorte.interactable = porte;
            fenetreFond[2].raycastTarget = porte;
            fenetreFond[2].color = porte ? DesignTokens.Current.surfaceCard : FondFenetre;
            compteurNb[2].color = porte ? DesignTokens.Current.hudMoneyGold : DesignTokens.Current.hudGaugeArcCold;
            fleche.gameObject.SetActive(porte);
        }

        /// <summary>`.fen.ici` : le bord de `.fen` PUIS l'or de `box-shadow:inset 0 -2px 0` (recette COMPOSÉE, DESIGN §5).</summary>
        private static SpecFilet[] RecetteIci => DecorsDeScene.FiletsComposes.FenIciOr;

        private void RendreElast()
        {
            pistesRoot.gameObject.SetActive(Vue == VueDossier.Pistes);
            notePi.gameObject.SetActive(Vue == VueDossier.Pistes);
            acteursRoot.gameObject.SetActive(Vue == VueDossier.Acteurs);
            rienTexte.gameObject.SetActive(Vue == VueDossier.Vide);
            if (Vue == VueDossier.Pistes) RendrePistes();
            if (Vue == VueDossier.Acteurs) RendreActeurs();
        }

        private void RendrePanneau()
        {
            switch (Vue)
            {
                case VueDossier.Acteurs:
                    MajPanneau(Lib("ceux qui ne sont pas sur la liste"), Lib("D’autres parlent, et vous ne les voyez pas"),
                        Riche("un inspecteur du port, un courtier, le greffier d’un juge : {ils se paient} comme les autres, mais {personne ne vous a encore donné leur nom}."),
                        DesignTokens.Current.accentWarning);
                    break;
                case VueDossier.Vide:
                    MajPanneau(Lib("ce n’est pas une bonne nouvelle"), Lib("C’est juste une nouvelle"),
                        Riche("les trois pistes montent avec ce que vous faites. À zéro, elles ne disent pas que vous êtes prudent : elles disent que {vous n’avez pas encore commencé}."),
                        DesignTokens.Current.hudCreme);
                    break;
                default:
                    if (DernierChargement == null && DerniereErreur != null)
                        // Repli NOMMÉ sur échec réseau : « on ne sait pas » n'est pas « tout va bien » (patron ㊲).
                        MajPanneau(Lib("CE QU'ON SAIT VRAIMENT"), Lib("Pas de réponse"),
                            Lib("on n'a pas eu de réponse. Ce n'est pas « tout va bien » : c'est « on ne sait pas »."), DesignTokens.Current.hudCreme);
                    else
                        MajPanneau(Lib("pourquoi trois colonnes"), Lib("On peut être propre sur deux et pris sur la troisième"),
                            Riche("la comptabilité, les rejets et le train de vie {ne se mélangent pas}. Pour voir {qui parle}, la fenêtre des acteurs, en haut à droite."),
                            DesignTokens.Current.hudCreme);
                    break;
            }
        }

        private void RendrePied()
        {
            pied.gameObject.SetActive(Vue != VueDossier.Vide);
            boutonAcheter.gameObject.SetActive(Vue == VueDossier.Pistes);
            note6.text = Vue == VueDossier.Acteurs
                ? Riche("le renseignement s’achète {acteur par acteur} — éteint tant que {le prix n’est pas servi} : on n’achète pas sans savoir combien")
                : Riche("sur un acteur, pas sur une piste — éteint : {le prix n’est pas servi}");
        }

        // ── les pistes (150) ──────────────────────────────────────────────────────────────────

        private void RendrePistes()
        {
            for (int i = 0; i < DossierCalculs.Pistes.Length; i++)
            {
                DossierCalculs.Piste piste = DossierCalculs.Pistes[i];
                string bande = DossierCalculs.BandeDe(DernierChargement, piste.Cle);
                bool eteinte = !piste.Vivante;
                int cran = eteinte ? -1 : DossierCalculs.CranDe(piste, bande);
                bool auBout = cran == DossierCalculs.Crans - 1;
                Color encre = ForensicResolvers.CouleurPour(ForensicResolvers.NiveauDe(bande));
                if (auBout) encre = DesignTokens.Current.accentDanger;   // 132 : le dernier cran est un ÉVÉNEMENT, tout en `#ff5a4d`

                piTitre[i].text = TitreAffiche(piste, DernierChargement);
                piTitre[i].color = eteinte ? EncreEteinte : (Color)DesignTokens.Current.onSurfaceSecondary;
                for (int c = 0; c < DossierCalculs.Crans; c++)
                    piCran[i, c].color = (!eteinte && c <= cran) ? encre : (Color)TeinteVide;
                if (eteinte)
                {
                    piMot[i].text = "—"; piMot[i].color = EncreEteinte;
                    piCle[i].text = Lib("pas encore sur la table");
                }
                else
                {
                    piMot[i].text = ForensicResolvers.Phrase(bande); piMot[i].color = encre;
                    piCle[i].text = string.IsNullOrEmpty(bande) ? "" : bande;
                }
                SpecFilet[] recette = eteinte ? DecorsDeScene.Filets.Forensic.PiEteinte
                                    : auBout ? DecorsDeScene.Filets.Forensic.PiBout
                                    : DecorsDeScene.Filets.Forensic.Pi;
                Filets.Poser(piRoot[i], recette);
            }
        }

        // ── les acteurs (151) ─────────────────────────────────────────────────────────────────

        private void RendreActeurs()
        {
            for (int i = acteursRoot.childCount - 1; i >= 0; i--)
            {
                Transform t = acteursRoot.GetChild(i);
                t.SetParent(null, false);
                Destroy(t.gameObject);
            }
            if (DerniersActeurs == null) return;   // route en erreur : les compteurs disent « — », la liste ne ment pas
            for (int i = 0; i < DerniersActeurs.Length; i++) ConstruireLigneActeur(DerniersActeurs[i], i);
        }

        private void ConstruireLigneActeur(ActeurDto a, int rang)
        {
            bool parti = DossierCalculs.EstParti(a.status);
            GameObject ligne = NouveauUI("Acteur" + rang, acteursRoot);
            AjouterFond(ligne, DesignTokens.Current.lieutenantMedallionOuter);
            Filets.Poser((RectTransform)ligne.transform, parti ? DecorsDeScene.Filets.Forensic.AcParti : DecorsDeScene.Filets.Forensic.Ac);
            if (parti) ligne.AddComponent<CanvasGroup>().alpha = DossierCalculs.AlphaUguiDuParti;   // `.ac.parti{opacity:.45}`, en alpha uGUI (voir la constante)
            var le = ligne.AddComponent<LayoutElement>();
            le.minHeight = Px(27f); le.flexibleHeight = 0f;
            var h = ligne.AddComponent<HorizontalLayoutGroup>();
            h.padding = new RectOffset(PxTrait(8f), PxTrait(8f), PxTrait(5f), PxTrait(5f));
            h.spacing = Px(8f);
            h.childAlignment = TextAnchor.MiddleLeft;
            h.childControlWidth = true; h.childControlHeight = true;
            h.childForceExpandWidth = false; h.childForceExpandHeight = false;

            Color encreStatut = DossierCalculs.EncreDuStatut(a.status);
            GameObject sil = NouveauUI("Silhouette", ligne.transform);
            Image silImg = AjouterImage(sil);
            silImg.sprite = Silhouette(encreStatut, DossierCalculs.SilhouetteAChevron(a.status));
            silImg.raycastTarget = false;
            var sle = sil.AddComponent<LayoutElement>();
            sle.minWidth = sle.preferredWidth = Px(15f); sle.minHeight = sle.preferredHeight = Px(15f); sle.flexibleWidth = 0f;

            GameObject col = NouveauUI("Identite", ligne.transform);
            var colLe = col.AddComponent<LayoutElement>(); colLe.flexibleWidth = 1f; colLe.minWidth = 0f;
            // Q1 : la colonne prend le RESTE, jamais sa largeur « préférée » — un nom long (non coupé en lignes, « … ») la ferait sinon dépasser et le groupe
            // horizontal rognerait le mot de statut (mesuré au créneau du 08/10 : 133 → 99 px avec un nom de 55 caractères).
            colLe.preferredWidth = 0f;
            var v = col.AddComponent<VerticalLayoutGroup>();
            v.spacing = Px(2f);
            v.childControlWidth = true; v.childControlHeight = true;
            v.childForceExpandWidth = true; v.childForceExpandHeight = false;
            TextMeshProUGUI nom = NouveauTexte(col.transform, "Type", DossierCalculs.NomDuType(a.actorType), Px(8f),
                                               DesignTokens.Current.hudCreme, DesignTokens.Current.primaryFont);
            nom.fontStyle = FontStyles.Bold;
            TextMeshProUGUI reference = NouveauTexte(col.transform, "Reference", DossierCalculs.NomOuRef(a, DerniersNoms), Px(5.6f),
                                                     EncreEteinte, DesignTokens.Current.primaryFont);
            reference.enableWordWrapping = false;   // un nom long se coupe par « … », jamais sur deux lignes
            reference.overflowMode = TextOverflowModes.Ellipsis;

            TextMeshProUGUI st = NouveauTexte(ligne.transform, "Statut", DossierCalculs.MotDuStatut(a.status), Px(5.8f),
                                              encreStatut, DesignTokens.Current.primaryFont);
            st.fontStyle = FontStyles.Bold | FontStyles.UpperCase;
            st.characterSpacing = 11f;
            st.enableWordWrapping = false;
            var stLe = st.gameObject.AddComponent<LayoutElement>(); stLe.flexibleWidth = 0f;

            if (parti) return;   // `.rg` : DERNIER enfant de chaque ligne sauf `gone`
            GameObject rg = NouveauUI("Renseignement", ligne.transform);
            AjouterFond(rg, DesignTokens.Current.hudGaugeFaceOuter);
            Filets.Poser((RectTransform)rg.transform, DecorsDeScene.Filets.Forensic.Rg);   // `.rg` : 1 px #2a3648 mesuré — ÉTEINT, non cliquable
            var rgLe = rg.AddComponent<LayoutElement>(); rgLe.flexibleWidth = 0f;
            var rgH = rg.AddComponent<HorizontalLayoutGroup>();
            rgH.padding = new RectOffset(PxTrait(5f), PxTrait(5f), PxTrait(4f), PxTrait(4f));
            rgH.childAlignment = TextAnchor.MiddleCenter;
            rgH.childControlWidth = true; rgH.childControlHeight = true;
            TextMeshProUGUI rgT = NouveauTexte(rg.transform, "Libelle", Lib("renseignement"), Px(5.4f), EncreEteinte, DesignTokens.Current.primaryFont);
            rgT.fontStyle = FontStyles.Bold | FontStyles.UpperCase;
            rgT.characterSpacing = 12f;
            rgT.enableWordWrapping = false;
        }

        // ═══ Construction de la mise en page ═════════════════════════════════════════════════

        private const float CssMargeX    = 13f;
        private const float CssMargeHaut = 13f;
        private const float CssMargeBas  = 14f;
        private const float CssEcart     = 9f;
        private const float CssHEnseigne = 51f;
        private const float CssHCompteurs = 42f;
        private const float CssHPanneau  = 70f;

        /// <summary>`#2a3648` — le cran éteint ET le bord des blocs : aucun jeton à moins de 4/255 (`hudGaugeFaceInner` à 7,5).</summary>
        private static readonly Color32 TeinteVide = new Color32(0x2A, 0x36, 0x48, 0xFF);
        /// <summary>`#7a838d` — l'encre éteinte du dossier (`.pi.eteinte`, `.cle`, `.rg`, `.ac span`) : aucun jeton à moins de 4/255.</summary>
        private static readonly Color32 EncreEteinte = new Color32(0x7A, 0x83, 0x8D, 0xFF);
        /// <summary>`#0a0e16` — le fond d'une fenêtre de compteur (`.fen`) : le jeton `hudGaugeFaceOuter`.</summary>
        private static Color FondFenetre => DesignTokens.Current.hudGaugeFaceOuter;

        private TextMeshProUGUI sousTitre;
        private readonly Image[] fenetreFond = new Image[3];
        private readonly TextMeshProUGUI[] compteurNb = new TextMeshProUGUI[3];
        private readonly TextMeshProUGUI[] compteurLib = new TextMeshProUGUI[3];
        private Button fenPorte;
        private TextMeshProUGUI fleche;
        private RectTransform pistesRoot, acteursRoot;
        private TextMeshProUGUI notePi, rienTexte;
        private ListeDefilante listeElast;
        /// <summary>La fenêtre défilante de la boîte élastique (garde : le contenu qui dépasse défile, il n'est jamais tranché).</summary>
        public ListeDefilante FenetreDefilante => listeElast;
        private readonly RectTransform[] piRoot = new RectTransform[3];
        private readonly TextMeshProUGUI[] piTitre = new TextMeshProUGUI[3];
        private readonly Image[,] piCran = new Image[3, DossierCalculs.Crans];
        private readonly TextMeshProUGUI[] piMot = new TextMeshProUGUI[3];
        private readonly TextMeshProUGUI[] piCle = new TextMeshProUGUI[3];
        private TextMeshProUGUI pannSur, pannTitre, pannTexte;
        private RectTransform pied;
        private RectTransform boutonAcheter;
        private TextMeshProUGUI note6;

        private void BuildLayout()
        {
            Canvas canvas = MafiaCleanCity.Shell.CanvasRacine.Resoudre(transform, mountParent);
            Transform root = mountParent != null ? mountParent : canvas.transform;

            // La racine PLEIN ÉCRAN — jamais un panneau intermédiaire : c'est elle qui sert de référence d'échelle à `Px()`/`PxTrait()`.
            GameObject racine = NouveauUI("ForensicRoot", root);
            racinePleinEcran = (RectTransform)racine.transform;
            Etirer(racinePleinEcran);
            // LE DÉCOR DE SCÈNE (CLIENT-2) : la scène du district à 0,24, le voile, le support A de `.dos6` et le cerne d'or — DÉCLARÉS au catalogue.
            DecorPose decor = DecorDeScene.Poser(racine.transform, DecorsDeScene.Forensic);

            // ⛔ L'ÉCHELLE AVANT TOUTE CONVERSION : un RectTransform qui vient d'être étiré n'a pas son `rect` résolu, et `Px()` le lit.
            Canvas.ForceUpdateCanvases();

            VerticalLayoutGroup pile = racine.AddComponent<VerticalLayoutGroup>();
            // ⛔ LE CHROME MANGE SA PART, EN BAS (le haut : sous la bande de scène, posé et recalculé par ReserverLaBande). Hors shell = 0.
            pile.padding = new RectOffset(
                PxTrait(CssMargeX), PxTrait(CssMargeX), 0,
                (int)(Px(CssMargeBas) + MafiaCleanCity.Shell.ShellChrome.BottomInsetPx));
            pile.spacing = Px(CssEcart);
            pile.childControlWidth = true;  pile.childControlHeight = true;
            pile.childForceExpandWidth = true; pile.childForceExpandHeight = false;

            // §5.6 du design décor : la pile commence SOUS max(barre, bande de scène 21 %), comme le panneau de la maquette.
            DecorDeScene.ReserverLaBande(pile, decor, Px(CssMargeHaut));

            ConstruireEnseigne(racine.transform);
            ConstruireCompteurs(racine.transform);
            ConstruireElast(racine.transform);
            ConstruirePanneau(racine.transform);
            ConstruirePied(racine.transform);
        }

        private void ConstruireEnseigne(Transform parent)
        {
            GameObject go = NouveauUI("Enseigne", parent);
            // `.enseigne` : plaque 178° translucide, bord 1 px #2a3648, filet bas 2 px laiton, liseré blanc — recette MESURÉE de ㊴,
            // posée par le décor ; le texte reste ici.
            DecorDeScene.HabillerEnseigne((RectTransform)go.transform, DecorsDeScene.Filets.Forensic.Enseigne, DecorsDeScene.Forensic);
            AjouterHauteur(go, Px(CssHEnseigne));
            var v = go.AddComponent<VerticalLayoutGroup>();
            v.childAlignment = TextAnchor.MiddleCenter;
            v.spacing = Px(5f);   // `.enseigne i{margin-top:5px}`
            v.childControlWidth = true; v.childControlHeight = true;
            v.childForceExpandWidth = true; v.childForceExpandHeight = false;

            // ⛔ `hudMoneyGold`, PAS `accentGold` : l'or de cette maquette est `--or-vif` #f2c96b ; `accentGold` vaut #ffd23f (43/255 plus bas sur le bleu).
            TextMeshProUGUI titre = NouveauTexte(go.transform, "Titre", Lib("Le dossier"), Px(17f),
                                                 DesignTokens.Current.hudMoneyGold, DesignTokens.Current.hudSerifFont);
            titre.alignment = TextAlignmentOptions.Center;
            titre.fontStyle = FontStyles.Bold;
            titre.characterSpacing = 20f;
            sousTitre = NouveauTexte(go.transform, "SousTitre", "", Px(6.4f),
                                     DesignTokens.Current.hudCremeSecondary, DesignTokens.Current.primaryFont);
            sousTitre.alignment = TextAlignmentOptions.Center;
            sousTitre.fontStyle = FontStyles.Bold | FontStyles.UpperCase;
            sousTitre.characterSpacing = 34f;
        }

        private void ConstruireCompteurs(Transform parent)
        {
            GameObject go = NouveauUI("Compteurs", parent);
            AjouterHauteur(go, Px(CssHCompteurs));
            HorizontalLayoutGroup h = go.AddComponent<HorizontalLayoutGroup>();
            h.spacing = Px(6f);
            h.childControlWidth = true; h.childControlHeight = true;
            h.childForceExpandWidth = true; h.childForceExpandHeight = true;

            for (int i = 0; i < 3; i++)
            {
                GameObject fen = NouveauUI("Fenetre" + i, go.transform);
                fenetreFond[i] = AjouterFond(fen, FondFenetre);
                // Trois tiers ÉGAUX : sans `preferredWidth = 0`, la largeur vient du CONTENU (payé sur ㊲).
                LayoutElement le = fen.AddComponent<LayoutElement>();
                le.minWidth = 0f; le.preferredWidth = 0f; le.flexibleWidth = 1f;
                VerticalLayoutGroup v = fen.AddComponent<VerticalLayoutGroup>();
                v.padding = new RectOffset(0, 0, PxTrait(4f), PxTrait(3f));
                v.spacing = Px(3f);
                v.childControlWidth = true; v.childControlHeight = true;
                v.childForceExpandWidth = true; v.childForceExpandHeight = false;
                v.childAlignment = TextAnchor.MiddleCenter;

                compteurNb[i] = NouveauTexte(fen.transform, "Nombre", "—", Px(14f), DesignTokens.Current.hudGaugeArcCold, DesignTokens.Current.primaryFont);
                compteurNb[i].alignment = TextAlignmentOptions.Center;
                compteurNb[i].fontStyle = FontStyles.Bold;
                compteurLib[i] = NouveauTexte(fen.transform, "Libelle", "", Px(5.4f), DesignTokens.Current.onSurfaceSecondary, DesignTokens.Current.primaryFont);
                compteurLib[i].alignment = TextAlignmentOptions.Center;
                compteurLib[i].fontStyle = FontStyles.Bold | FontStyles.UpperCase;
                compteurLib[i].characterSpacing = 16f;
            }

            // LA PORTE : la 3ᵉ fenêtre est un BOUTON (bascule locale, aucune requête). Sa flèche est posée en haut à droite, hors mise en page.
            GameObject porte = go.transform.Find("Fenetre2").gameObject;
            fenPorte = porte.AddComponent<Button>();
            fenPorte.targetGraphic = fenetreFond[2];
            fenPorte.transition = Selectable.Transition.None;
            fenPorte.onClick.AddListener(Basculer);
            fleche = NouveauTexte(porte.transform, "Fleche", "›", Px(9f), DesignTokens.Current.hudMoneyGold, DesignTokens.Current.primaryFont);
            fleche.fontStyle = FontStyles.Bold;
            fleche.alignment = TextAlignmentOptions.TopRight;
            fleche.gameObject.AddComponent<LayoutElement>().ignoreLayout = true;
            RectTransform fr = fleche.rectTransform;
            fr.anchorMin = Vector2.zero; fr.anchorMax = Vector2.one;
            fr.offsetMin = new Vector2(0f, 0f); fr.offsetMax = new Vector2(-Px(4f), -Px(3f));
        }

        /// <summary>`bascule` : la flèche de la porte (« › » vers les acteurs, « ‹ » vers les pistes) ; null pour une fenêtre sans porte.</summary>
        private void MajCompteur(int i, int valeur, int total, string libelle, SpecFilet[] recette, string bascule = null)
        {
            // `valeur < 0` ⇒ « — » : le trou se montre, il ne se comble pas par un zéro (un « 0 » dirait « mesuré à zéro »).
            string nombre = "—";
            if (valeur >= 0)
            {
                nombre = valeur.ToString("00");
                if (total >= 0)
                    nombre += $"<size=64%><color=#{ColorUtility.ToHtmlStringRGB(DesignTokens.Current.onSurfaceSecondary)}>/{total}</color></size>";
            }
            compteurNb[i].text = nombre;
            compteurLib[i].text = libelle;
            Filets.Poser((RectTransform)fenetreFond[i].transform, recette);
            if (bascule != null) fleche.text = bascule;
        }

        /// <summary>La boîte ÉLASTIQUE (`.elast`, `flex:1`) : elle prend ce que la pile laisse. Un seul de ses trois contenus est montré.</summary>
        private void ConstruireElast(Transform parent)
        {
            GameObject go = NouveauUI("Elast", parent);
            AjouterFond(go, DesignTokens.Current.surfaceBase);
            Filets.Poser((RectTransform)go.transform, DecorsDeScene.Filets.Forensic.Elast);   // `.elast` : 1 px #2a3648 mesuré
            var le = go.AddComponent<LayoutElement>();
            le.minHeight = Px(60f); le.flexibleHeight = 1f;
            go.AddComponent<RectMask2D>();   // `.elast{overflow:hidden}` — la FENÊTRE ; ce qui la dépasse défile (ListeDefilante : fondu + ascenseur), il n'est ni tranché ni imprimé sur le reste

            // ⛔ LA CAUSE COMMUNE de F1/F2/F5 (juge visuel r1, 08/10) : les enfants étaient dans un VerticalLayoutGroup SANS défilement, et la rangée des pistes (HorizontalLayoutGroup,
            // `childForceExpandHeight`) rendait son `flexibleHeight` à la pile : elle prenait TOUT ce que le panneau laissait (80 % au lieu de 48 %) ; à 1920 le contenu, plus haut que la
            // fenêtre, était écrasé sous sa hauteur préférée (texte hors de sa carte, 4ᵉ acteur tranché). Le CONTENU épouse maintenant ses enfants (ContentSizeFitter) et la FENÊTRE défile.
            GameObject contenu = NouveauUI("Contenu", go.transform);
            RectTransform contenuRt = (RectTransform)contenu.transform;
            contenuRt.anchorMin = new Vector2(0f, 1f); contenuRt.anchorMax = new Vector2(1f, 1f);
            contenuRt.pivot = new Vector2(0.5f, 1f);
            contenuRt.offsetMin = Vector2.zero; contenuRt.offsetMax = Vector2.zero;
            var v = contenu.AddComponent<VerticalLayoutGroup>();
            v.padding = new RectOffset(PxTrait(8f), PxTrait(8f), PxTrait(7f), PxTrait(7f));
            v.childControlWidth = true; v.childControlHeight = true;
            v.childForceExpandWidth = true; v.childForceExpandHeight = false;
            contenu.AddComponent<ContentSizeFitter>().verticalFit = ContentSizeFitter.FitMode.PreferredSize;
            listeElast = ListeDefilante.Equiper((RectTransform)go.transform, contenuRt, DesignTokens.Current.surfaceBase);

            // (150) les trois pistes côte à côte, puis la note sous elles
            GameObject pistes = NouveauUI("Pistes", contenu.transform);
            pistesRoot = (RectTransform)pistes.transform;
            // la rangée vaut la hauteur de sa plus haute carte, jamais davantage : `flexibleHeight = 0` l'emporte (LayoutElement) sur le « force expand » du groupe, qui ne sert plus qu'à égaliser les cartes
            var pistesLe = pistes.AddComponent<LayoutElement>(); pistesLe.flexibleHeight = 0f;
            var ph = pistes.AddComponent<HorizontalLayoutGroup>();
            ph.spacing = Px(5f);
            ph.childControlWidth = true; ph.childControlHeight = true;
            ph.childForceExpandWidth = true; ph.childForceExpandHeight = true;
            for (int i = 0; i < DossierCalculs.Pistes.Length; i++) ConstruirePiste(i, pistes.transform);

            notePi = NouveauTexte(contenu.transform, "NotePistes",
                Lib("Les livres et le train de vie : personne ne regarde par là. Pour l’instant."), Px(7f),
                DesignTokens.Current.onSurfaceSecondary, DesignTokens.Current.hudSerifFont);
            notePi.fontStyle = FontStyles.Italic;
            notePi.alignment = TextAlignmentOptions.Center;
            notePi.margin = new Vector4(Px(4f), Px(6f), Px(4f), 0f);

            // (151) la liste des acteurs
            GameObject acteurs = NouveauUI("Acteurs", contenu.transform);
            acteursRoot = (RectTransform)acteurs.transform;
            var av = acteurs.AddComponent<VerticalLayoutGroup>();
            av.spacing = Px(3f);
            av.childControlWidth = true; av.childControlHeight = true;
            av.childForceExpandWidth = true; av.childForceExpandHeight = false;

            // (135) « rien à votre nom », centré dans la boîte
            rienTexte = NouveauTexte(go.transform, "Rien",
                Lib("Rien à votre nom.") + "\n" + Lib("Personne n’a encore eu de raison de vous ouvrir un dossier."), Px(8f),
                EncreEteinte, DesignTokens.Current.hudSerifFont);
            rienTexte.fontStyle = FontStyles.Italic;
            rienTexte.alignment = TextAlignmentOptions.Center;
            rienTexte.margin = new Vector4(Px(22f), 0f, Px(22f), 0f);
            // hors du contenu défilant : il occupe la fenêtre ENTIÈRE et se centre dedans (rien ne défile dans l'état vide)
            RectTransform rienRt = rienTexte.rectTransform;
            rienRt.anchorMin = Vector2.zero; rienRt.anchorMax = Vector2.one; rienRt.offsetMin = Vector2.zero; rienRt.offsetMax = Vector2.zero;
            rienTexte.gameObject.AddComponent<LayoutElement>().ignoreLayout = true;
        }

        /// <summary>Une piste (`.pi`) : son titre, ses quatre crans (le premier EN BAS : `column-reverse`), son mot, sa clé.</summary>
        private void ConstruirePiste(int i, Transform parent)
        {
            GameObject pi = NouveauUI("Piste" + i, parent);
            piRoot[i] = (RectTransform)pi.transform;
            AjouterFond(pi, DesignTokens.Current.lieutenantMedallionOuter);
            var le = pi.AddComponent<LayoutElement>();
            le.minWidth = 0f; le.preferredWidth = 0f; le.flexibleWidth = 1f;
            var v = pi.AddComponent<VerticalLayoutGroup>();
            v.padding = new RectOffset(PxTrait(6f), PxTrait(6f), PxTrait(7f), PxTrait(8f));
            v.childControlWidth = true; v.childControlHeight = true;
            v.childForceExpandWidth = true; v.childForceExpandHeight = false;

            piTitre[i] = NouveauTexte(pi.transform, "Titre", "", Px(5.4f), DesignTokens.Current.onSurfaceSecondary, DesignTokens.Current.primaryFont);
            piTitre[i].alignment = TextAlignmentOptions.Top;
            piTitre[i].fontStyle = FontStyles.Bold | FontStyles.UpperCase;
            piTitre[i].characterSpacing = 11f;
            piTitre[i].gameObject.AddComponent<LayoutElement>().minHeight = Px(14f);

            GameObject crans = NouveauUI("Crans", pi.transform);
            var cv = crans.AddComponent<VerticalLayoutGroup>();
            cv.padding = new RectOffset(0, 0, PxTrait(6f), PxTrait(5f));
            cv.spacing = Px(2f);
            cv.childControlWidth = true; cv.childControlHeight = true;
            cv.childForceExpandWidth = true; cv.childForceExpandHeight = false;
            for (int c = DossierCalculs.Crans - 1; c >= 0; c--)   // le cran 0 est le plus BAS
            {
                GameObject u = NouveauUI("Cran" + c, crans.transform);
                piCran[i, c] = AjouterFond(u, TeinteVide);
                var ule = u.AddComponent<LayoutElement>();
                ule.minHeight = ule.preferredHeight = Px(6f); ule.flexibleHeight = 0f;
            }

            piMot[i] = NouveauTexte(pi.transform, "Mot", "—", Px(7.6f), EncreEteinte, DesignTokens.Current.hudSerifFont);
            piMot[i].alignment = TextAlignmentOptions.Top;
            piMot[i].fontStyle = FontStyles.Bold;
            piCle[i] = NouveauTexte(pi.transform, "Cle", "", Px(5.2f), EncreEteinte, DesignTokens.Current.primaryFont);
            piCle[i].alignment = TextAlignmentOptions.Top;
            piCle[i].margin = new Vector4(0f, Px(3f), 0f, 0f);
        }

        private void ConstruirePanneau(Transform parent)
        {
            GameObject go = NouveauUI("Panneau", parent);
            AjouterFond(go, DesignTokens.Current.lieutenantMedallionOuter);
            Filets.Poser((RectTransform)go.transform, DecorsDeScene.Filets.Forensic.Pann);   // `.pann` : 1 px #2a3648 mesuré
            // ⛔ HAUTEUR PLANCHER, PAS HAUTEUR FIGÉE (mesuré sur ㊴, 2026-09-03) : un cadre de hauteur fixe reçoit un contenu de longueur
            // VARIABLE ; `minHeight` garde la silhouette quand le texte est court, le layout rend la hauteur au contenu quand il est long.
            var le = go.AddComponent<LayoutElement>();
            le.minHeight = Px(CssHPanneau); le.preferredHeight = -1f; le.flexibleHeight = 0f;
            var v = go.AddComponent<VerticalLayoutGroup>();
            v.padding = new RectOffset(PxTrait(10f), PxTrait(10f), PxTrait(8f), PxTrait(9f));
            v.childControlWidth = true; v.childControlHeight = true;
            v.childForceExpandWidth = true; v.childForceExpandHeight = false;

            pannSur = NouveauTexte(go.transform, "SurTitre", "", Px(5.6f), DesignTokens.Current.onSurfaceSecondary, DesignTokens.Current.primaryFont);
            pannSur.fontStyle = FontStyles.Bold | FontStyles.UpperCase;
            pannSur.characterSpacing = 19f;
            pannTitre = NouveauTexte(go.transform, "Titre", "", Px(13f), DesignTokens.Current.hudCreme, DesignTokens.Current.hudSerifFont);
            pannTitre.fontStyle = FontStyles.Bold;
            pannTitre.margin = new Vector4(0f, Px(5f), 0f, 0f);
            pannTexte = NouveauTexte(go.transform, "Texte", "", Px(6.6f), DesignTokens.Current.hudCremeSecondary, DesignTokens.Current.primaryFont);
            pannTexte.margin = new Vector4(0f, Px(4f), 0f, 0f);
        }

        /// <summary>`.pied` : le geste ÉTEINT (« ACHETER DU RENSEIGNEMENT », vue pistes) et sa note. Rien ici n'est cliquable : le prix
        /// d'un renseignement n'est servi par aucune route avant l'achat.</summary>
        private void ConstruirePied(Transform parent)
        {
            GameObject go = NouveauUI("Pied", parent);
            pied = (RectTransform)go.transform;
            go.AddComponent<LayoutElement>().flexibleHeight = 0f;
            var v = go.AddComponent<VerticalLayoutGroup>();
            v.spacing = Px(5f);
            v.childControlWidth = true; v.childControlHeight = true;
            v.childForceExpandWidth = true; v.childForceExpandHeight = false;

            GameObject cta = NouveauUI("BoutonAcheter", go.transform);
            boutonAcheter = (RectTransform)cta.transform;
            var (fond, _, libelle) = PiedDEcran.Couleurs(PiedDEcran.Forme.Cta6, PiedDEcran.Etat.Eteint);
            AjouterFond(cta, fond);
            Filets.Poser(boutonAcheter, DecorsDeScene.Filets.Forensic.Cta6Eteint);   // `.cta6.eteint` : 1 px #2a3648 mesuré
            var ch = cta.AddComponent<HorizontalLayoutGroup>();
            ch.padding = new RectOffset(PxTrait(8f), PxTrait(8f), PxTrait(8f), PxTrait(8f));
            ch.childAlignment = TextAnchor.MiddleCenter;
            ch.childControlWidth = true; ch.childControlHeight = true;
            TextMeshProUGUI t = NouveauTexte(cta.transform, "Libelle", Lib("Acheter du renseignement"), Px(8.5f), libelle, DesignTokens.Current.primaryFont);
            t.fontStyle = FontStyles.Bold | FontStyles.UpperCase;
            t.characterSpacing = 11f;
            t.alignment = TextAlignmentOptions.Center;

            note6 = NouveauTexte(go.transform, "Note", "", Px(6.4f), DesignTokens.Current.onSurfaceSecondary, DesignTokens.Current.primaryFont);
            note6.alignment = TextAlignmentOptions.Center;
        }

        private void MajPanneau(string sur, string titre, string texte, Color encreTitre)
        {
            pannSur.text = sur; pannTitre.text = titre; pannTexte.text = texte;
            pannTitre.color = encreTitre;
        }

        /// <summary>`<u>` de la maquette : `{…}` devient du texte or gras (`color:#f2c96b;font-weight:700`). Les accolades vivent DANS la
        /// phrase traduite, pour qu'une phrase servie garde ses emphases.</summary>
        private static string Riche(string litteral) =>
            ReposerLesEmphases(Lib(litteral), litteral)
                .Replace("{", $"<b><color=#{ColorUtility.ToHtmlStringRGB(DesignTokens.Current.hudMoneyGold)}>").Replace("}", "</color></b>");

        /// <summary>⛔ F4 (juge visuel r1, 08/10) : le bundle SERT « …elles disent que vous n’avez pas encore commencé. » SANS accolades — la valeur servie gagne, et l'emphase or+gras de la maquette
        /// disparaissait (0 % d'encre claire, contre 21 % ; les chaînes encore en repli, elles, la gardaient). Une valeur servie qui n'a pas ses accolades les reprend ici : chaque fragment que le
        /// littéral met entre accolades, retrouvé tel quel dans le texte servi, est ré-entouré. Un texte servi qui porte déjà des accolades est laissé tel quel ; un fragment introuvable
        /// (autre langue) n'est pas forcé. Pure.</summary>
        public static string ReposerLesEmphases(string servi, string litteral)
        {
            if (string.IsNullOrEmpty(servi) || string.IsNullOrEmpty(litteral) || servi.IndexOf('{') >= 0) return servi;
            foreach (System.Text.RegularExpressions.Match m in System.Text.RegularExpressions.Regex.Matches(litteral, @"\{([^{}]+)\}"))
            {
                string fragment = m.Groups[1].Value;
                int i = servi.IndexOf(fragment, System.StringComparison.Ordinal);
                if (i >= 0) servi = servi.Substring(0, i) + "{" + fragment + "}" + servi.Substring(i + fragment.Length);
            }
            return servi;
        }

        /// <summary>Item 0.6 — un littéral STATIQUE de ㊴ passe par `forensic.bloc.<slug>`, repli sur le littéral.
        /// ⛔ N'Y PASSE PAS : la BANDE SERVIE. `Phrase()` rend le mot du serveur tel quel quand il n'est pas reconnu — délibéré.</summary>
        private static string Lib(string litteral) =>
            MafiaCleanCity.I18n.Libelle.De("forensic", "bloc", litteral);

        /// <summary>Q5 — le titre d'une piste : celui de la maquette, SAUF la piste du train de vie quand le back sert le NOM du lieutenant visé ET que la
        /// piste est vivante ET que sa bande dépasse le premier cran : « le train de vie de {nom} » (phrase ENTIÈRE à trou — l'anglais met le nom
        /// devant, `{nom}’s lifestyle` ; jamais une concaténation). Une piste éteinte ne nomme personne.</summary>
        public static string TitreAffiche(DossierCalculs.Piste piste, GetForensicResponseDto d)
        {
            string nom = d?.lifestyle_lieutenant_name;
            if (piste.Cle != DossierCalculs.CleDeLaPisteNommee || !piste.Vivante || string.IsNullOrWhiteSpace(nom)
                || DossierCalculs.CranDe(piste, DossierCalculs.BandeDe(d, piste.Cle)) <= 0)
                return Lib(piste.Titre);
            return MafiaCleanCity.I18n.Libelle.Gabarit(DossierCalculs.CleDuTitreNomme, "le train de vie de {nom}",
                                                       new Dictionary<string, string> { ["nom"] = nom.Trim() });
        }

        private static void AjouterHauteur(GameObject go, float hauteur)
        {
            var le = go.GetComponent<LayoutElement>() ?? go.AddComponent<LayoutElement>();
            le.minHeight = hauteur; le.preferredHeight = hauteur; le.flexibleHeight = 0f;
        }

        // ── la silhouette (`.sil`, SVG 16×16 de la maquette) — rastérisée une fois par (couleur, motif) ──

        private static readonly Dictionary<(int, bool), Sprite> silhouettes = new Dictionary<(int, bool), Sprite>();

        /// <summary>La tête (cercle r 3,2 en (8, 5)), les épaules (demi-ellipse de (8, 16), rayons 6,5 × 7,4) et la marque sombre :
        /// un chevron (« il tient », « parti ») ou une porte close (« il a peur », « injoignable »). Surfaces anticrénelées en 2×2.</summary>
        private static Sprite Silhouette(Color couleur, bool chevron)
        {
            Color32 c32 = couleur;
            var cle = ((c32.r << 16) | (c32.g << 8) | c32.b, chevron);
            if (silhouettes.TryGetValue(cle, out Sprite deja) && deja != null && deja.texture != null) return deja;   // la Texture2D peut mourir seule
            const int N = 64;
            Color marque = DesignTokens.Current.hudGaugeFaceOuter;
            var tex = new Texture2D(N, N, TextureFormat.RGBA32, false) { filterMode = FilterMode.Bilinear, wrapMode = TextureWrapMode.Clamp };
            var px = new Color32[N * N];
            float echelle = 16f / N;
            for (int y = 0; y < N; y++)
                for (int x = 0; x < N; x++)
                {
                    float forme = 0f, sombre = 0f;
                    for (int sy = 0; sy < 2; sy++)
                        for (int sx = 0; sx < 2; sx++)
                        {
                            float u = (x + 0.25f + 0.5f * sx) * echelle;
                            float v = 16f - (y + 0.25f + 0.5f * sy) * echelle;   // la texture a son origine EN BAS : v descend du haut du SVG
                            bool tete = (u - 8f) * (u - 8f) + (v - 5f) * (v - 5f) <= 3.2f * 3.2f;
                            float ex = (u - 8f) / 6.5f, ey = (v - 16f) / 7.4f;
                            bool epaules = v >= 8.6f && ex * ex + ey * ey <= 1f;
                            if (tete || epaules) forme += 0.25f;
                            if (epaules && MarqueSombre(u, v, chevron)) sombre += 0.25f;
                        }
                    Color f = couleur; f.a = forme;
                    Color m = Color.Lerp(f, marque, forme > 0f ? sombre / forme : 0f); m.a = forme;
                    px[y * N + x] = m;
                }
            tex.SetPixels32(px); tex.Apply();
            Sprite s = Sprite.Create(tex, new Rect(0, 0, N, N), new Vector2(0.5f, 0.5f), N);
            silhouettes[cle] = s;
            return s;
        }

        private static bool MarqueSombre(float u, float v, bool chevron)
        {
            if (!chevron) return u >= 5.6f && u <= 10.4f && v >= 10f;   // `<rect x=5.6 y=10 width=4.8 height=6>`
            // `<path d="M5 12 L8 8.8 L11 12" stroke-width=1.1>` : à moins de 0,55 de l'un des deux segments
            return DistanceAuSegment(u, v, 5f, 12f, 8f, 8.8f) <= 0.55f || DistanceAuSegment(u, v, 8f, 8.8f, 11f, 12f) <= 0.55f;
        }

        private static float DistanceAuSegment(float px, float py, float ax, float ay, float bx, float by)
        {
            float dx = bx - ax, dy = by - ay;
            float t = Mathf.Clamp01(((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy));
            float qx = ax + t * dx - px, qy = ay + t * dy - py;
            return Mathf.Sqrt(qx * qx + qy * qy);
        }

        // ═══ Primitives — dupliquées par convention (aucun fichier du dépôt ne les partage) ═════

        private static GameObject NouveauUI(string nom, Transform parent)
        {
            GameObject go = new GameObject(nom, typeof(RectTransform));
            go.transform.SetParent(parent, false);
            return go;
        }

        /// <summary>⛔ TOUTE Image passe par ici. `AddComponent&lt;T&gt;()` à l'exécution n'honore PAS le `[RequireComponent(CanvasRenderer)]`
        /// d'une classe de base — sans `CanvasRenderer`, un `Graphic` ne dessine RIEN, sans la moindre erreur console. `Image` EST déjà
        /// un `MaskableGraphic` : elle passe sous un `Mask` parent sans rien de plus.</summary>
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

    /// <summary>Le CALCUL du dossier — pur, sans Unity : les pistes et leurs échelles, les compteurs, l'état vide, les mots des acteurs.
    /// Tout ce que l'écran compte l'est ICI, sur des corps qu'un test peut fabriquer.</summary>
    public static class DossierCalculs
    {
        public const int Crans = 4;
        /// <summary>`.ac.parti{opacity:.45}` (cadre 151, mesuré) — l'opacité de la MAQUETTE, composée en sRGB.</summary>
        public const float OpaciteDuParti = 0.45f;
        /// <summary>⛔ L'alpha uGUI qui REND ce que `OpaciteDuParti` rend dans la maquette. Unity compose en LINÉAIRE, la maquette en sRGB :
        /// recopier 0,45 rend la tête rouge de la silhouette à (179, 63, 55) au lieu de (122, 49, 43) — MESURÉ au créneau du 08/10 (garde
        /// `ScreenB7P1`), et le calcul linéaire donne (179, 62, 54) : le modèle est juste. 0,2 donne (124, 43, 38), à 6/255 de la cible
        /// (le canal le plus bas ne se rattrape pas avec un seul alpha) ; ses fonds sombres, eux, restent à ≤ 3/255.</summary>
        public const float AlphaUguiDuParti = 0.2f;

        /// <summary>La piste qui peut porter un NOM (Q5) et la clé de sa phrase à trou (`Slug("le train de vie de {nom}")` sous le rôle `bloc`).</summary>
        public const string CleDeLaPisteNommee = "lifestyle_alarm_bucket";
        public const string CleDuTitreNomme = "forensic.bloc.le_train_de_vie_de_nom";

        public sealed class Piste
        {
            public readonly string Cle, Titre;
            public readonly string[] Echelle;
            public readonly bool Vivante;
            public Piste(string cle, string titre, bool vivante, params string[] echelle) { Cle = cle; Titre = titre; Vivante = vivante; Echelle = echelle; }
        }

        /// <summary>⛔ UN SEUL SITE (TD-881) : les pistes dont le back ne sert qu'une valeur CONSTANTE. `audit_risk_bucket` (source
        /// `ledger_entry_ring`, TD-358) et `lifestyle_alarm_bucket` (source `lifestyle_audit_state`) rendent la même bande pour tout
        /// joueur (`forensic.controller.ts:11-19`) et AUCUN champ ne le dit : le client le sait, ici, à la main. Sortie de la dette : le
        /// back sert la vivacité de chaque piste (transmis à BACK-1).
        /// MESURE (juge-données de ㊴, 08/10 ; lue, pas rejouée) : les deux bandes SONT servies — un compte frais rend `clean` et `quiet` (`mesures/forensic_frais.json`) — puis jetées ici. Elles restent
        /// ÉTEINTES parce que le back lui-même les dit constantes : `forensic.controller.ts:11-19` (« stay CONSTANT for every player », la chaîne de blanchiment est « dead at 4 maillons », TD-358 ;
        /// l'anti-péremption du back épingle `audit_risk_bucket` à « aucune donnée » pour un joueur qui a exercé la vraie chaîne de production) et `district-interior.projection.service.ts:20`
        /// (`ledger_entry_ring` « n'a AUCUN écrivain de production »). Les écrivains de TICK existent (`leading-digit-audit.service.ts` WEEKLY, `standing-gap-heat.service.ts` mensuel) mais n'ont pas été
        /// exercés sur un compte qui blanchit : CE QUI N'EST PAS MESURÉ est donc que la bande ne variera jamais par un chemin joueur. Le jour où le back sert la vivacité (ou qu'un compte mesuré montre une
        /// bande ≠ premier cran), rallumer les deux pistes (de l'information au joueur) et supprimer cette liste.</summary>
        public static readonly string[] PistesConstantes = { "audit_risk_bucket", "lifestyle_alarm_bucket" };

        /// <summary>Les trois pistes DANS L'ORDRE de la maquette (150) : la comptabilité, les cuves, le train de vie. Échelles lues dans le
        /// back (`forensic.projection.service.ts:79/98/118`, domaines CLOS à quatre crans).</summary>
        public static readonly Piste[] Pistes =
        {
            new Piste("audit_risk_bucket", "la comptabilité", EstVivante("audit_risk_bucket"), "clean", "watched", "flagged", "audited"),
            new Piste("effluent_visibility_bucket", "ce qui sort des cuves", EstVivante("effluent_visibility_bucket"), "clear", "faint", "visible", "glaring"),
            new Piste("lifestyle_alarm_bucket", "le train de vie d’un lieutenant", EstVivante("lifestyle_alarm_bucket"), "quiet", "noticed", "watched", "subpoenaed"),
        };

        private static bool EstVivante(string cle) => System.Array.IndexOf(PistesConstantes, cle) < 0;

        public static string BandeDe(GetForensicResponseDto d, string cle)
        {
            if (d == null) return null;
            switch (cle)
            {
                case "audit_risk_bucket": return d.audit_risk_bucket;
                case "effluent_visibility_bucket": return d.effluent_visibility_bucket;
                case "lifestyle_alarm_bucket": return d.lifestyle_alarm_bucket;
                default: throw new System.ArgumentOutOfRangeException(nameof(cle), cle, "DossierCalculs.BandeDe : piste inconnue.");
            }
        }

        /// <summary>Le rang de la bande dans l'échelle de SA piste (0 = le premier cran, 3 = le dernier), -1 si le mot n'y est pas —
        /// jamais un rang par défaut : une bande jamais vue ne prend pas l'apparence d'une bande mesurée.</summary>
        public static int CranDe(Piste p, string bande)
        {
            if (string.IsNullOrEmpty(bande)) return -1;
            return System.Array.IndexOf(p.Echelle, bande.Trim().ToLowerInvariant());
        }

        public static int PistesVivantes()
        {
            int n = 0;
            foreach (Piste p in Pistes) if (p.Vivante) n++;
            return n;
        }

        /// <summary>« pistes chaudes » : les pistes VIVANTES hors de leur premier cran (R4). Une bande inconnue n'est pas « chaude ».</summary>
        public static int PistesChaudes(GetForensicResponseDto d)
        {
            int n = 0;
            foreach (Piste p in Pistes) if (p.Vivante && CranDe(p, BandeDe(d, p.Cle)) > 0) n++;
            return n;
        }

        /// <summary>« franchies » : les pistes VIVANTES au dernier cran (un événement a eu lieu).</summary>
        public static int PistesFranchies(GetForensicResponseDto d)
        {
            int n = 0;
            foreach (Piste p in Pistes) if (p.Vivante && CranDe(p, BandeDe(d, p.Cle)) == Crans - 1) n++;
            return n;
        }

        public static int ActeursQuiTiennent(ActeurDto[] a) => Compter(a, "steady");
        public static int ActeursQuiOntPeur(ActeurDto[] a) => Compter(a, "nervous");

        private static int Compter(ActeurDto[] a, string statut)
        {
            int n = 0;
            if (a != null) foreach (ActeurDto x in a) if (x != null && x.status == statut) n++;
            return n;
        }

        /// <summary>R5 — l'état vide (135) ⇔ les bandes SERVIES, toutes les pistes vivantes au PREMIER cran, ET un roster SERVI vide. Une route
        /// en erreur (null) n'est jamais « vide » : on ne sait pas.</summary>
        public static bool EtatVide(GetForensicResponseDto d, ActeurDto[] acteurs)
        {
            if (d == null || acteurs == null || acteurs.Length != 0) return false;
            foreach (Piste p in Pistes) if (p.Vivante && CranDe(p, BandeDe(d, p.Cle)) != 0) return false;
            return true;
        }

        // ── les acteurs ────────────────────────────────────────────────────────────────────────

        public static bool EstParti(string statut) => statut == "gone";

        /// <summary>`steady` « il tient » · `nervous` « il a peur » · `unavailable` « injoignable » · `gone` « parti » (cadre 151). Un statut
        /// que le back inventerait s'affiche TEL QUEL (jamais rabattu sur un mot rassurant).</summary>
        public static string MotDuStatut(string statut) =>
            MafiaCleanCity.I18n.Libelle.ParValeur("forensic", "statut", statut, RepliDuStatut(statut));

        /// <summary>Le REPLI de `ParValeur` : le mot de la maquette, tant que la clé `forensic.statut.<valeur>` n'est pas servie (allowlist N2
        /// nommée, patron `CollecteMots.RepliDeLaBande`). Un statut que le back inventerait s'affiche TEL QUEL.</summary>
        private static string RepliDuStatut(string statut)
        {
            switch (statut)
            {
                case "steady": return "il tient";
                case "nervous": return "il a peur";
                case "unavailable": return "injoignable";
                case "gone": return "parti";
                default: return string.IsNullOrEmpty(statut) ? "—" : statut;
            }
        }

        /// <summary>L'encre du statut (cadre 151) : vert, orange, gris, rouge. Un statut inconnu : l'encre éteinte, jamais le vert.</summary>
        public static Color EncreDuStatut(string statut)
        {
            switch (statut)
            {
                case "steady": return DesignTokens.Current.accentCalm;
                case "nervous": return DesignTokens.Current.accentWarning;
                case "unavailable": return DesignTokens.Current.onSurfaceSecondary;
                case "gone": return DesignTokens.Current.accentDanger;
                default: return DesignTokens.Current.onSurfaceMuted;
            }
        }

        /// <summary>La marque sombre de la silhouette : un chevron pour « il tient » et « parti », une porte close pour « il a peur » et « injoignable ».</summary>
        public static bool SilhouetteAChevron(string statut) => statut == "steady" || statut == "gone";

        /// <summary>`lawyer` « Avocat » · `clerk` « Greffier » : par la VALEUR SERVIE (`forensic.acteur.<type>`, servie FR et EN) ; un type
        /// inconnu s'affiche tel quel.</summary>
        public static string NomDuType(string type) =>
            MafiaCleanCity.I18n.Libelle.ParValeur("forensic", "acteur", type, RepliDuType(type));

        private static string RepliDuType(string type)
        {
            switch (type)
            {
                case "lawyer": return "Avocat";
                case "clerk": return "Greffier";
                default: return string.IsNullOrEmpty(type) ? "—" : type;
            }
        }

        /// <summary>L'identifiant montré (« ia.actor.4f21 » dans la maquette) : les quatre premiers caractères du `actorRef` servi — PROPOSÉ,
        /// la maquette n'en dit pas la règle ; jamais un nom inventé.</summary>
        public static string RefAffichee(string actorRef)
        {
            if (string.IsNullOrEmpty(actorRef)) return "—";
            string court = actorRef.Length > 4 ? actorRef.Substring(0, 4) : actorRef;
            return "ia.actor." + court;
        }

        /// <summary>Q1 — ce que la ligne d'un acteur montre sous son type : le NOM de la personne quand il est servi (avocat dont l'id est au
        /// roster de `GET /v1/me/legal`, nom ni vide ni sentinelle), sinon la référence (<see cref="RefAffichee"/>). Un `clerk` n'a aucune
        /// route qui le nomme : toujours la référence.</summary>
        public static string NomOuRef(ActeurDto a, IDictionary<string, string> noms)
        {
            if (a != null && a.actorType == "lawyer" && noms != null && a.actorRef != null
                && noms.TryGetValue(a.actorRef, out string nom) && !string.IsNullOrWhiteSpace(nom))
                return nom;
            return RefAffichee(a?.actorRef);
        }

        /// <summary>`lawyerId → nom` du roster servi. Le nom vide ou la SENTINELLE du back (`unknown_lawyer`, colonne nulle) n'est pas un nom.</summary>
        public static Dictionary<string, string> NomsDesAvocats(LawyerDto[] roster)
        {
            var d = new Dictionary<string, string>();
            if (roster == null) return d;
            foreach (LawyerDto l in roster)
            {
                string nom = l?.lawyerNameI18n?.@params?.nom;
                if (l == null || string.IsNullOrEmpty(l.lawyerId) || string.IsNullOrWhiteSpace(nom) || nom == NomSentinelleDuBack) continue;
                d[l.lawyerId] = nom;
            }
            return d;
        }

        /// <summary>La valeur que le back sert dans `params.nom` quand `lawyers.name` est nul (`fiction-names.ts`, `lawyerNameRef`).</summary>
        public const string NomSentinelleDuBack = "unknown_lawyer";

        public static bool AUnAvocat(ActeurDto[] acteurs)
        {
            if (acteurs != null) foreach (ActeurDto x in acteurs) if (x != null && x.actorType == "lawyer") return true;
            return false;
        }
    }

    /// <summary>screen_b7 — les correspondances « valeur du domaine → apparence », chacune en
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
    public static class ForensicResolvers
    {
        /// <summary>Les trois signaux du corps. Chacun porte une bande, et les vocabulaires ne
        /// sont PAS les mêmes d'un signal à l'autre — c'est pourquoi il n'y a pas un enum unique.
        /// Valeurs observées le 2026-09-02 : `watched`, `glaring`, `quiet`.
        /// ⚠️ Le vocabulaire complet de chaque bande n'est PAS connu : une seule valeur par
        /// signal a été vue. `NiveauDe` range donc par gravité les valeurs observées ET les
        /// valeurs nommées par le canon, et rend `Inconnu` pour tout le reste — jamais une
        /// gravité par défaut, qui donnerait à une bande jamais vue l'apparence d'une bande
        /// mesurée.</summary>
        public enum Gravite { Inconnu = 0, Calme, Surveille, Criant, Franchi }
        // ⛔ `Franchi` N'EST PAS UNE GRAVITÉ DE PLUS (22/09, atelier ca69012c §4, cadre 143 : « Le dernier de chaque piste est un
        //    événement, pas un cran de plus — ils sont venus · ça saute aux yeux · convoqué »). Le DERNIER cran de chaque piste —
        //    `audited`, `glaring`, `subpoenaed` — dit que quelque chose A EU LIEU ; le cadre 132 les compte « franchies ». Les ranger
        //    en « Criant » (glaring) ou les laisser « Inconnu » (audited, subpoenaed) était une FORME fausse, pas un mot manquant.

        public static Gravite NiveauDe(string bande)
        {
            if (string.IsNullOrEmpty(bande)) return Gravite.Inconnu;
            switch (bande.Trim().ToLowerInvariant())
            {
                // ⛔ LES TROIS PISTES ONT CHACUNE SON ÉCHELLE — mesuré dans le back le 2026-09-03
                // (`forensic.projection.service.ts:98`, domaine clos ; `:141` ; `:200`) :
                //     audit     : clean → … → audited
                //     effluent  : clear → faint → visible → glaring
                //     lifestyle : quiet → … → subpoenaed
                // ⚠️ `clear` N'EST PAS un synonyme de `clean` : c'est le premier cran de SA piste,
                // et `:200` en donne la cause — « aucune production d'atelier ⇒ déviation nulle ⇒
                // clear ». C'est l'état normal d'un compte neuf.
                // ★ Cette table mélange donc DÉLIBÉRÉMENT trois vocabulaires. Je l'ai découvert en
                //   voyant « clear » s'afficher BRUT à l'écran : le repli qui montre le mot du
                //   serveur au lieu de le rabattre sur « calme » a fait apparaître le manque au
                //   lieu de le masquer. Une paraphrase rassurante l'aurait enterré.
                case "quiet":    case "clean":    case "dormant":
                case "clear":                                     return Gravite.Calme;
                case "watched":  case "elevated": case "noticed":
                case "faint":
                // `flagged` : le 3e cran de la piste comptable, SOUS `audited` — un cran de surveillance (atelier ca69012c §4).
                case "flagged":                                   return Gravite.Surveille;
                // ⚠️ QUATRE CRANS POUR TROIS GRAVITÉS : l'échelle des rejets en a un de plus que
                // l'échelle d'affichage, donc DEUX crans doivent partager une gravité. Le choix
                // n'est pas neutre et il est écrit ici : `visible` monte en « Criant » plutôt que
                // de rejoindre `faint` en « Surveillé ». Sur un écran d'affaires internes,
                // sous-déclarer une exposition coûte plus cher que sur-alerter — c'est la même
                // raison qui interdit de rabattre une bande INCONNUE sur « calme ».
                case "critical": case "exposed":
                case "visible":                                   return Gravite.Criant;
                // le DERNIER cran de chaque piste (back : AuditRiskBucket, EffluentVisibilityBucket, LifestyleAlarmBucket,
                // `forensic.projection.service.ts:79/98/118`) — un événement, voir `Gravite.Franchi`
                case "audited":  case "glaring":  case "subpoenaed": return Gravite.Franchi;
                default: return Gravite.Inconnu;
            }
        }

        /// <summary>La couleur d'un rang de gravité — PRODUCTEUR UNIQUE, et il rend désormais la
        /// palette que la maquette porte.
        ///
        /// ⛔⛔ DEUX DES TROIS RANGS ÉTAIENT FAUX, ET LE TROISIÈME — celui qu'on aurait « corrigé »
        /// en premier — ÉTAIT LE SEUL JUSTE. Mesuré le 2026-09-06 sur la référence ratifiée
        /// `Tools/juge-visuel/screen_b7/reference-1080x2102.png`, dominantes sur les aplats des
        /// trois pastilles (≈3 220 pixels identiques chacun, donc la couleur de remplissage et non
        /// la frange d'anticrénelage) :
        ///
        ///     « discret »    (clear)   rgb(125,179,106)  ← un VERT      · le code rendait le cyan
        ///     « on regarde » (faint)   rgb(242,201,107)  ← un OR        · le code rendait de l'or ✓
        ///     « ça se voit » (visible) rgb(255,158,61)   ← accentWarning· le code rendait du ROUGE
        ///
        /// ★ Le rang « visible » est le plus grave des trois : la maquette y rend `accentWarning`
        ///   **à distance 0**, et l'écran peignait `SeverityColor(Severe)`. Un cran de gravité de
        ///   trop, sur l'écran qui existe pour dire au joueur à quel point il est visible.
        /// ★ Et `SeverityColor` n'avait rien à faire ici : c'est l'échelle de la CHALEUR d'un
        ///   bâtiment, pas la gravité d'une piste. **Deux échelles, deux producteurs** — les faire
        ///   se croiser rendait chaque changement de l'une visible dans l'autre, sans qu'aucune
        ///   garde ne relie les deux.
        /// ★★ Ce qui rend le cas instructif : j'ai d'abord classé `Surveille → accentGold` comme un
        ///   défaut, en lisant le COMMENTAIRE du token (« CTA / stage terminale ») au lieu d'ouvrir
        ///   la référence. La référence emploie l'or au titre, au CTA **et** à ce rang de gravité :
        ///   c'est donc le commentaire du token qui est plus étroit que l'usage ratifié.
        ///   *Un token lu pour sa définition reste déduit sur son emploi.*</summary>
        public static Color CouleurPour(Gravite g)
        {
            switch (g)
            {
                // Le repli précédent était `hudGaugeArcCold`, c'est-à-dire le cyan de la palette :
                // il ne posait pas une valeur d'attente, il SUBSTITUAIT un token de la palette à un
                // autre — effaçant une distinction que le dessin faisait exprès. *Un repli pris dans
                // la même palette ressemble à un choix ; c'est ce qui le rend invisible.*
                case Gravite.Calme:     return DesignTokens.Current.accentCalm;
                // ⛔⛔ L'OR DE CETTE MAQUETTE EST `hudMoneyGold`, ET J'AVAIS CONCLU L'INVERSE IL Y A
                //    QUELQUES HEURES. J'avais écrit ici : « la référence emploie l'or au titre, au
                //    CTA ET à ce rang de gravité, c'est donc le commentaire du token qui est plus
                //    étroit que l'usage ratifié ». La première moitié est vraie ; la seconde était
                //    une DÉDUCTION. Un juge ⊥ a mesuré le cran de la référence **byte-exact contre
                //    le markup** : (242,201,107) = #f2c96b = `hudMoneyGold`, quand le jeu rendait
                //    (255,210,64) = `accentGold` #ffd23f — **43/255 d'écart sur le bleu, sept fois
                //    la tolérance de 6**.
                //    ★★ J'avais vérifié « est-ce de l'or ? » et jamais « LEQUEL des deux ors ». La
                //      note que j'ai écrite ce jour-là — *un token lu pour sa définition reste
                //      déduit sur son emploi* — s'appliquait à moi une ligne plus bas : j'ai lu la
                //      référence pour son RÔLE (de l'or à ce rang) sans en mesurer la VALEUR.
                case Gravite.Surveille: return DesignTokens.Current.hudMoneyGold;
                case Gravite.Criant:    return DesignTokens.Current.accentWarning;
                // cadre 132 (la piste au bout) : le mot, les quatre crans et le bord du bloc sont `#ff5a4d` — la couleur d'un ÉVÉNEMENT
                case Gravite.Franchi:   return DesignTokens.Current.accentDanger;
                case Gravite.Inconnu:   return DesignTokens.Current.onSurfaceMuted;
                default: throw new System.ArgumentOutOfRangeException(nameof(g), g,
                    "ForensicResolvers.CouleurPour : membre de Gravite non résolu.");
            }
        }

        /// <summary>La bande, en mots. ⛔ Une bande inconnue s'affiche TELLE QUELLE, jamais
        /// traduite en « calme » par défaut : si le serveur invente un mot, le joueur doit voir
        /// le mot du serveur plutôt qu'une paraphrase rassurante.</summary>
        public static string Phrase(string bande)
        {
            // les valeurs qui ont LEUR mot dans la maquette ratifiée (série 6, cadres 132 et 143 — atelier ca69012c §4) passent
            // AVANT la phrase de leur gravité : « un dossier est ouvert » n'est pas « on vous regarde », et un événement n'a pas
            // de phrase de gravité. ⚠️ Casse de phrase, comme les trois phrases de gravité de cet écran (la maquette les écrit
            // en minuscules dans une énumération « ils sont venus · ça saute aux yeux · convoqué »). `subpoenaed` rend « Convocation
            // reçue », la variante neutre de l'atelier (32e29ab8, 10 §8), retenue par l'orchestrateur le 22/09 : c'est le joueur qui
            // est convoqué, et la bande ne dit pas son genre — « Convoqué » le présumait. Clé : forensic.evenement.convocation_recue.
            switch (string.IsNullOrEmpty(bande) ? "" : bande.Trim().ToLowerInvariant())
            {
                case "flagged":    return MafiaCleanCity.I18n.Libelle.De("forensic", "cran", "Un dossier est ouvert");
                case "audited":    return MafiaCleanCity.I18n.Libelle.De("forensic", "evenement", "Ils sont venus");
                case "glaring":    return MafiaCleanCity.I18n.Libelle.De("forensic", "evenement", "Ça saute aux yeux");
                // ⛔ F3 (juge visuel r1, 08/10) : « visible » n'avait PAS son mot et tombait sur la phrase de sa GRAVITÉ (« Ça se voit de loin », 2 lignes, qui n'est aucun des quatre crans ratifiés de
                // l'effluent, cadre 143 : invisible · des traces · ça se voit · ça saute aux yeux). Les trois premiers prennent leur mot de cran, servi (`forensic.cran.*`).
                case "clear":      return MafiaCleanCity.I18n.Libelle.De("forensic", "cran", "invisible");
                case "faint":      return MafiaCleanCity.I18n.Libelle.De("forensic", "cran", "des traces");
                case "visible":    return MafiaCleanCity.I18n.Libelle.De("forensic", "cran", "ça se voit");
                case "subpoenaed": return MafiaCleanCity.I18n.Libelle.De("forensic", "evenement", "Convocation reçue");
            }
            switch (NiveauDe(bande))
            {
                case Gravite.Calme:     return MafiaCleanCity.I18n.Libelle.De("forensic", "gravite", "Rien ne dépasse");
                case Gravite.Surveille: return MafiaCleanCity.I18n.Libelle.De("forensic", "gravite", "On vous regarde");
                case Gravite.Criant:    return MafiaCleanCity.I18n.Libelle.De("forensic", "gravite", "Ça se voit de loin");
                default: return MafiaCleanCity.I18n.Repli.Etat(bande);   // hors domaine : le mot de la famille (atelier 28) ; absent : « — » ; jamais la valeur brute
            }
        }
    }
}
