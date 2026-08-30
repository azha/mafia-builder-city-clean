using System.Collections;
using UnityEngine;
using UnityEngine.UI;
using TMPro;
using MafiaCleanCity.Shell;
using MafiaCleanCity.Theme;

namespace MafiaCleanCity.Operational
{
    /// <summary>㊲ LA RÉPUTATION (`screen_b3`) — « le miroir ».
    ///
    /// L'écran d'un lieutenant : sa posture envers vous, et ce qu'il a **absorbé** de vos règles
    /// de maison. Le sujet du back est ici littéralement un dessin — `portrait_posture` incline
    /// le buste, les quatre `uniform_tells` allument quatre voyants et changent la tenue. Rien
    /// n'est décoratif : chaque trait est une clé du corps de réponse.
    ///
    /// ⛔⛔ LA THÈSE QUI A ÉTÉ CORRIGÉE, ET QUI SE REPERDRAIT SANS CE PARAGRAPHE. La première
    /// maquette dessinait DEUX portraits — « le vôtre tel qu'on vous lit, et le sien ». C'était
    /// faux contre le canon : `uniform_tells` est PAR LIEUTENANT (PK `lieutenant_id` ;
    /// `projectUniformTells(lieutenantId, playerId)`), et `reputation_mechanics.md:233` dit
    /// « posture cues + uniform tells. **Both appear on same portrait** ».
    /// ⇒ **UN seul portrait, celui du lieutenant. Le miroir, c'est que vous vous lisez SUR LUI.**
    /// Un futur contributeur qui rajouterait un portrait « joueur » attribuerait à l'un ce qui
    /// décrit l'autre. (juge-données ⊥ 2026-08-30, écart É1 ; maquette v2.)
    ///
    /// GÉOMÉTRIE — deux règles héritées, non négociables :
    ///  · **aucune valeur dérivée de `Screen.*`** ni d'un `rect` lu une seule fois au montage.
    ///    Tout passe par <see cref="EchelleMaquette"/> avec la largeur DÉCLARÉE de la maquette
    ///    dont l'écran est issu. Un écran bâti sur `Screen.width/1280` naît avec le défaut qu'un
    ///    autre lot est en train de supprimer (mesuré : 84 % à 1080, 112 % à 1440).
    ///  · **`Canvas.scaleFactor` lu la frame de la création rend 1,0** — une valeur PLAUSIBLE et
    ///    fausse, la famille la plus dangereuse. Toute lecture de géométrie attend
    ///    `yield return null` (voir <see cref="AttendreLayoutPuis"/>).
    ///
    /// On bâtit sous `mountParent` et on ne touche JAMAIS à `ConstruireLocataire` — le shell est
    /// propriétaire du montage.</summary>
    public class ReputationScreenController : MonoBehaviour, IShellTenant
    {
        [Header("Backend")]
        [SerializeField] private string baseUrl = "http://localhost";

        // ---- points d'injection du shell (IShellTenant) ---------------------------------
        private Transform mountParent;
        public void SetMountParent(Transform parent) => mountParent = parent;

        private string token;
        public void SetToken(string t) => token = t;

        // ---- crochets de test ------------------------------------------------------------
        public ReputationSurfaceDto DernierChargement { get; private set; }
        public string DerniereErreur { get; private set; }
        public long DernierCodeErreur { get; private set; }
        public bool AAfficheEtatVide { get; private set; }
        public int VoyantsAllumes { get; private set; }
        public string LieutenantIdCourant { get; private set; }

        /// <summary>Le plafond de déclarations, tel que le SERVEUR l'a dit dans son refus 409 —
        /// `null` tant qu'on ne l'a pas rencontré. ⛔ Jamais « 4 » en dur : c'est un tunable de
        /// plage 2..8, et un client qui le fige ment le jour où il bouge.</summary>
        public int? PlafondDeclareParLeServeur { get; private set; }

        // ---- racines de la mise en page ---------------------------------------------------
        private RectTransform racinePleinEcran;   // la racine qui COUVRE l'écran — jamais un panneau
        private RectTransform corps;              // sous le chrome : l'écran proprement dit
        private TextMeshProUGUI sousTitre;
        private RectTransform compteursRoot;
        private RectTransform zoneElastique;
        private RectTransform panneauProse;
        private ReputationPortrait portrait;
        private readonly TellVoyant[] voyants = new TellVoyant[4];
        private ReputationClient client;
        private bool initialise;

        // ── Géométrie de la maquette, en px CSS — convertie, jamais employée telle quelle ──
        // Source unique : ecrans-brennar-6.html + generateur-reputation.py (v2, 2026-08-30).
        private const float CssMargeH        = 13f;   // .enseigne/.compteurs/.elast/.pann margin-x
        private const float CssCernInset     = 5f;    // .cerne{inset:5px}
        private const float CssEnseigneHaut  = 13f;   // .enseigne{margin:13px 13px 0}
        private const float CssEnseignePadY  = 7f;
        private const float CssTitreCorps    = 17f;   // .enseigne b — 'DejaVu Serif' 700
        private const float CssSousTitre     = 6.4f;  // .enseigne i
        private const float CssEcartBloc     = 9f;    // margin-top des blocs successifs
        private const float CssCompteurNombre = 14f;  // .fen b
        private const float CssCompteurLib   = 5.4f;  // .fen > span
        private const float CssPortraitLarg  = 118f;  // .prt{width:118px}
        private const float CssVoyantPadY    = 5f;    // .tl{padding:5px 8px}
        private const float CssVoyantPadX    = 8f;
        private const float CssVoyantDiam    = 7f;    // .tl .lum
        private const float CssVoyantTitre   = 7.4f;  // .tl b
        private const float CssVoyantSens    = 5.4f;  // .tl small
        private const float CssPannPadX      = 10f;
        private const float CssPannPadY      = 8f;
        private const float CssPannSurTitre  = 5.6f;
        private const float CssPannTitre     = 13f;
        private const float CssPannTexte     = 6.6f;
        private const float CssCtaPad        = 8f;
        private const float CssCtaCorps      = 8.5f;
        private const float CssPiedHaut      = 9f;

        /// <summary>Convertit une valeur en px CSS de LA maquette de cet écran. Passe par la
        /// largeur DÉCLARÉE (`LargeurEcransBrennar6`) : jamais le repli implicite, jamais la
        /// constante d'une maquette voisine qui vaut le même nombre aujourd'hui.</summary>
        private float Px(float css) =>
            EchelleMaquette.Px(css, racinePleinEcran, EchelleMaquette.LargeurEcransBrennar6);

        /// <summary>Idem, planché à 1 — RÉSERVÉ aux grandeurs dont un zéro est un défaut de
        /// rendu (épaisseur de trait, corps de texte). ⛔ Jamais sur un retrait ou un débord,
        /// qui peuvent être légitimement négatifs : le plancher retournerait le signe.</summary>
        private int PxTrait(float css) =>
            EchelleMaquette.PxTrait(css, racinePleinEcran, EchelleMaquette.LargeurEcransBrennar6);

        private void Awake() => EnsureInitialized();

        private void EnsureInitialized()
        {
            if (initialise) return;
            initialise = true;
            client = new ReputationClient { BaseUrl = baseUrl };
            BuildLayout();
        }

        // ═══ Chargement ══════════════════════════════════════════════════════════════════════

        /// <summary>Charge la surface pour `lieutenantId`.
        ///
        /// ⚠️ `lieutenantId` n'est PAS optionnel et son absence n'est pas un « écran vide » : la
        /// route rend 404 sans lui, et 404 s'il n'appartient pas à l'appelant (propriété validée
        /// dans le contrôleur back, jamais déléguée — c'est ce qui empêche de distinguer le
        /// sondage d'un joueur tiers de « pas encore de données »).
        ///
        /// ⚠️ `counterpartyId` reste `null` par défaut, et ce n'est pas un oubli : sans lui la
        /// section `restraint` est OMISE du corps, ce qui est l'état NORMAL de cet écran. Aucune
        /// route ne liste les contreparties (mesuré) — le sélecteur des rappelés est un lot back
        /// (L5). Ne pas fabriquer d'identifiant : un `counterparty_id` mal formé rend **500**,
        /// pas 404.</summary>
        public IEnumerator Charger(string lieutenantId, string counterpartyId = null)
        {
            EnsureInitialized();
            LieutenantIdCourant = lieutenantId;
            DerniereErreur = null;
            DernierCodeErreur = 0;

            yield return client.GetReputation(token, lieutenantId, counterpartyId,
                dto => DernierChargement = dto,
                (code, msg) => { DernierCodeErreur = code; DerniereErreur = msg; });

            // La frame de création rend des rects non résolus : on attend le layout AVANT de
            // mesurer quoi que ce soit (voir AttendreLayoutPuis).
            yield return null;

            if (DernierChargement == null) { RendreEtatIndisponible(); yield break; }
            Rendre(DernierChargement);
        }

        /// <summary>Déclare une règle de maison, puis RELIT la surface — le serveur ne rend que
        /// `{declared:true}`, jamais l'état d'après-geste : le seul moyen honnête de savoir ce
        /// que le joueur a maintenant est de redemander.</summary>
        public IEnumerator DeclarerRegle(string ruleId)
        {
            EnsureInitialized();
            DerniereErreur = null;
            bool ok = false;

            yield return client.DeclareHouseRule(token, ruleId,
                dto => ok = dto != null && dto.declared,
                (code, msg) =>
                {
                    DernierCodeErreur = code;
                    DerniereErreur = msg;
                    // 409 = le plafond, pas une panne : c'est la règle du jeu qui parle. On lit
                    // le couple current/cap DANS le refus plutôt que de le figer côté client.
                    if (code == 409) PlafondDeclareParLeServeur = LirePlafond(msg);
                });

            if (ok && !string.IsNullOrEmpty(LieutenantIdCourant))
                yield return Charger(LieutenantIdCourant);
        }

        /// <summary>Extrait le `cap` du message de refus (« … cap reached (4/4) … »).
        /// ⚠️ Lecture BEST-EFFORT d'un message d'erreur : elle peut échouer sans que ce soit un
        /// défaut, et alors on rend `null` — l'écran dit « plafond atteint » sans le chiffrer,
        /// plutôt que d'afficher un nombre inventé.</summary>
        private static int? LirePlafond(string message)
        {
            if (string.IsNullOrEmpty(message)) return null;
            var m = System.Text.RegularExpressions.Regex.Match(message, @"\((\d+)\s*/\s*(\d+)\)");
            if (!m.Success) return null;
            return int.TryParse(m.Groups[2].Value, out int cap) ? cap : (int?)null;
        }

        // ═══ Rendu ═══════════════════════════════════════════════════════════════════════════

        private void Rendre(ReputationSurfaceDto dto)
        {
            AAfficheEtatVide = false;
            BossMirrorDto bm = dto.boss_mirror;
            UniformTellsDto tells = dto.hidden_curriculum != null
                ? dto.hidden_curriculum.uniform_tells : null;

            int absorbe = tells != null ? tells.CompteAbsorbe() : 0;
            int declarees = bm != null && bm.declared_rules != null ? bm.declared_rules.Length : 0;

            // Le sous-titre NOMME l'état, il ne le décore pas. `indeterminate` a le sien : ce
            // n'est pas « moyen », c'est « pas encore assez vu ».
            sousTitre.text = bm != null && ReputationResolvers.CoherenceEstIndeterminee(bm.consistency_cue)
                ? (absorbe == 0
                    ? "UN LIEUTENANT NEUF N'A ENCORE RIEN ABSORBÉ"
                    : "PERSONNE NE VOUS A ENCORE JUGÉ")
                : "CE QU'IL A PRIS DE VOUS SE VOIT SUR LUI";

            MajCompteur(0, declarees.ToString("00"), null, "RÈGLES DONNÉES");
            MajCompteur(1, absorbe.ToString("00"), "/4", "ABSORBÉES");
            MajCompteur(2, "—", null, "ENFREINTES"); // ⛔ voir la note ENFREINTES plus bas

            if (bm != null)
            {
                portrait.Appliquer(tells, bm.portrait_posture);
                portrait.DefinirVerdict(ReputationResolvers.PosturePhrase(bm.portrait_posture),
                                        ReputationResolvers.PostureCouleur(bm.portrait_posture));
            }

            // Les quatre voyants — la polarité vient du DTO, jamais d'une comparaison locale.
            VoyantsAllumes = 0;
            int i = 0;
            foreach (UniformTellsDto.Pose pose in ReputationResolvers.PosesDansLOrdre())
            {
                bool actif = tells != null && tells.ActifEstAbsorbe(pose);
                if (actif) VoyantsAllumes++;
                voyants[i].Appliquer(ReputationResolvers.PoseLibelle(pose, actif),
                                     ReputationResolvers.PoseSens(pose), actif);
                i++;
            }
        }

        /// <summary>Repli NOMMÉ quand la récupération échoue — jamais une exception, jamais un
        /// écran noir. Mesuré sur un autre écran de ce dépôt : `Render(null)` levait une
        /// NullReferenceException à la première ligne qui lisait le payload, et l'écran plantait
        /// dès que le réseau toussait. Un échec doit donner un ÉTAT, pas un plantage.</summary>
        private void RendreEtatIndisponible()
        {
            AAfficheEtatVide = true;
            VoyantsAllumes = 0;
            sousTitre.text = "LE MIROIR EST INDISPONIBLE";
            MajCompteur(0, "—", null, "RÈGLES DONNÉES");
            MajCompteur(1, "—", "/4", "ABSORBÉES");
            MajCompteur(2, "—", null, "ENFREINTES");
            portrait.Eteindre();
            int i = 0;
            foreach (UniformTellsDto.Pose pose in ReputationResolvers.PosesDansLOrdre())
                voyants[i++].Appliquer(ReputationResolvers.PoseLibelle(pose, false),
                                       ReputationResolvers.PoseSens(pose), false);
        }

        // ⛔ NOTE « ENFREINTES » — POURQUOI CE COMPTEUR AFFICHE UN TIRET ET NON UN NOMBRE.
        // La maquette dessine un compteur d'enfreintes. Le corps de réponse n'en porte AUCUNE
        // clé : `ReputationSurfaceProjection` a trois clés (`boss_mirror`, `restraint?`,
        // `hidden_curriculum`) et aucune ne compte les violations. La donnée existe pourtant en
        // base — `boss_mirror_violation_ring.violation_slots[] = { rule_id, severity }` est
        // ÉCRITE et jamais projetée : c'est une forme F, consignée en lot back (S13-k).
        // ⇒ On affiche « — », pas « 00 ». Un zéro serait un MENSONGE : il dirait « aucune
        // enfreinte » là où la vérité est « le serveur ne le dit pas ». C'est la même règle que
        // pour `rule_id` affiché en clair — on ne masque pas le trou, on le montre.

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
            Transform root = mountParent != null ? mountParent : canvas.transform;

            // La racine PLEIN ÉCRAN — c'est elle, et jamais un panneau intermédiaire, qui sert
            // de référence d'échelle. Passer un conteneur plus étroit diviserait toute la mise à
            // l'échelle par un facteur muet (déjà payé ici sur un espacement corrigé au mauvais
            // niveau : un défaut SÉLECTIF désigne son conteneur).
            GameObject racine = NouveauUI("ReputationRoot", root);
            racinePleinEcran = (RectTransform)racine.transform;
            Etirer(racinePleinEcran);
            AjouterFond(racine, ReputationResolvers.Encre);

            // Le corps vit SOUS le chrome : le bandeau et le dock mangent leur part, publiée par
            // le shell. Hors shell (test isolé) les insets valent 0 et l'écran remplit tout —
            // le comportement d'avant que ces champs existent.
            GameObject corpsGo = NouveauUI("Corps", racine.transform);
            corps = (RectTransform)corpsGo.transform;
            corps.anchorMin = Vector2.zero;
            corps.anchorMax = Vector2.one;
            corps.offsetMin = new Vector2(0f, ShellChrome.BottomInsetPx);
            corps.offsetMax = new Vector2(0f, -ShellChrome.TopInsetPx);

            ConstruireCerne(corpsGo.transform);
            ConstruireEnseigne(corpsGo.transform);
            ConstruireCompteurs(corpsGo.transform);
            ConstruireMiroir(corpsGo.transform);
            ConstruirePanneau(corpsGo.transform);
            ConstruirePied(corpsGo.transform);
        }

        /// <summary>Le liseré doré qui encadre l'écran (`.cerne{inset:5px}`).</summary>
        private void ConstruireCerne(Transform parent)
        {
            GameObject go = NouveauUI("Cerne", parent);
            RectTransform rt = (RectTransform)go.transform;
            float inset = Px(CssCernInset);
            rt.anchorMin = Vector2.zero; rt.anchorMax = Vector2.one;
            rt.offsetMin = new Vector2(inset, inset);
            rt.offsetMax = new Vector2(-inset, -inset);
            Image img = AjouterImage(go);
            img.sprite = ProceduralUI.RoundedRectOutline(PxTrait(3f), PxTrait(1f), Color.white);
            img.type = Image.Type.Sliced;
            img.color = ReputationResolvers.OrFilet;
            img.raycastTarget = false;
        }

        private void ConstruireEnseigne(Transform parent)
        {
            GameObject go = NouveauUI("Enseigne", parent);
            RectTransform rt = (RectTransform)go.transform;
            AncrerHaut(rt, Px(CssEnseigneHaut), Px(CssMargeH));
            AjouterFond(go, ReputationResolvers.Panneau);

            // Le filet doré du bas (`border-bottom:2px solid --laiton`) — un enfant, pas une
            // bordure : Unity n'a pas de border-bottom, et le simuler par une image 9-slice
            // arrondirait aussi les autres côtés.
            GameObject filet = NouveauUI("FiletBas", go.transform);
            RectTransform frt = (RectTransform)filet.transform;
            frt.anchorMin = new Vector2(0f, 0f); frt.anchorMax = new Vector2(1f, 0f);
            frt.pivot = new Vector2(0.5f, 0f);
            frt.sizeDelta = new Vector2(0f, PxTrait(2f));
            AjouterFond(filet, ReputationResolvers.OrFilet);

            TextMeshProUGUI titre = NouveauTexte(go.transform, "Titre", "Le miroir",
                CssTitreCorps, ReputationResolvers.OrVif, DesignTokens.Current.hudSerifFont);
            titre.alignment = TextAlignmentOptions.Center;
            titre.characterSpacing = 20f; // letter-spacing:.2em

            sousTitre = NouveauTexte(go.transform, "SousTitre", "", CssSousTitre,
                ReputationResolvers.Creme2, DesignTokens.Current.primaryFont);
            sousTitre.alignment = TextAlignmentOptions.Center;
            sousTitre.characterSpacing = 34f;

            EmpilerVertical(go, Px(CssEnseignePadY), Px(5f));
        }

        private readonly TextMeshProUGUI[] compteurNombre = new TextMeshProUGUI[3];
        private readonly TextMeshProUGUI[] compteurLibelle = new TextMeshProUGUI[3];

        private void ConstruireCompteurs(Transform parent)
        {
            GameObject go = NouveauUI("Compteurs", parent);
            compteursRoot = (RectTransform)go.transform;
            HorizontalLayoutGroup h = go.AddComponent<HorizontalLayoutGroup>();
            h.spacing = Px(6f);
            h.childControlWidth = true; h.childControlHeight = true;
            h.childForceExpandWidth = true;

            for (int i = 0; i < 3; i++)
            {
                GameObject fen = NouveauUI("Fenetre" + i, go.transform);
                AjouterFond(fen, ReputationResolvers.Creux);
                Contour(fen, ReputationResolvers.Lisere);

                compteurNombre[i] = NouveauTexte(fen.transform, "Nombre", "—",
                    CssCompteurNombre, ReputationResolvers.Cyan, DesignTokens.Current.primaryFont);
                compteurNombre[i].alignment = TextAlignmentOptions.Center;

                compteurLibelle[i] = NouveauTexte(fen.transform, "Libelle", "",
                    CssCompteurLib, ReputationResolvers.Muet, DesignTokens.Current.primaryFont);
                compteurLibelle[i].alignment = TextAlignmentOptions.Center;
                compteurLibelle[i].characterSpacing = 16f;

                EmpilerVertical(fen, Px(4f), Px(3f));
            }
        }

        /// <summary>Un compteur : la valeur, un suffixe optionnel (« /4 »), le libellé.
        /// Le suffixe est un TEXTE À PART et non une concaténation : la maquette le rend plus
        /// petit et d'une autre couleur, et surtout « 02 » et « /4 » ne disent pas la même
        /// chose — l'un est une mesure, l'autre un dénominateur fixe.</summary>
        private void MajCompteur(int index, string valeur, string suffixe, string libelle)
        {
            if (index < 0 || index >= 3) return;
            compteurNombre[index].text = string.IsNullOrEmpty(suffixe)
                ? valeur
                : valeur + "<size=64%><color=#" +
                  ColorUtility.ToHtmlStringRGB(ReputationResolvers.Muet) + ">" + suffixe + "</color></size>";
            compteurLibelle[index].text = libelle;
        }

        private void ConstruireMiroir(Transform parent)
        {
            GameObject go = NouveauUI("Miroir", parent);
            zoneElastique = (RectTransform)go.transform;
            AjouterFond(go, ReputationResolvers.Fond2);
            Contour(go, ReputationResolvers.Lisere);

            HorizontalLayoutGroup h = go.AddComponent<HorizontalLayoutGroup>();
            h.spacing = Px(10f);
            h.padding = new RectOffset(PxTrait(7f), PxTrait(7f), PxTrait(7f), PxTrait(7f));
            h.childControlWidth = true; h.childControlHeight = true;
            h.childForceExpandHeight = true;

            // Le portrait — largeur FIXE (118 px CSS convertis), le reste s'étire.
            GameObject prtGo = NouveauUI("Portrait", go.transform);
            AjouterFond(prtGo, ReputationResolvers.Panneau);
            Contour(prtGo, ReputationResolvers.OrFilet);
            LayoutElement le = prtGo.AddComponent<LayoutElement>();
            le.preferredWidth = Px(CssPortraitLarg);
            le.flexibleWidth = 0f;
            portrait = prtGo.AddComponent<ReputationPortrait>();
            portrait.Construire(racinePleinEcran);

            // La colonne de lecture : le verdict de cohérence, puis les quatre voyants.
            GameObject lect = NouveauUI("Lecture", go.transform);
            VerticalLayoutGroup v = lect.AddComponent<VerticalLayoutGroup>();
            v.spacing = Px(4f);
            v.childControlWidth = true; v.childControlHeight = true;
            v.childForceExpandHeight = false;

            for (int i = 0; i < 4; i++)
                voyants[i] = TellVoyant.Construire(lect.transform, this);
        }

        private void ConstruirePanneau(Transform parent)
        {
            GameObject go = NouveauUI("Panneau", parent);
            panneauProse = (RectTransform)go.transform;
            AjouterFond(go, ReputationResolvers.Panneau);
            Contour(go, ReputationResolvers.Lisere);

            NouveauTexte(go.transform, "SurTitre", "LA RÈGLE DU JEU", CssPannSurTitre,
                ReputationResolvers.Muet, DesignTokens.Current.primaryFont).characterSpacing = 19f;
            NouveauTexte(go.transform, "Titre", "Vous vous lisez sur lui", CssPannTitre,
                ReputationResolvers.Creme, DesignTokens.Current.hudSerifFont);
            NouveauTexte(go.transform, "Texte",
                "chaque vertu qu'il vous voit tenir finit sur sa tenue — col, manches, montre, " +
                "gants. Une règle déclarée tient jusqu'à ce que vous la retiriez publiquement : " +
                "la donner, c'est se donner une corde.",
                CssPannTexte, ReputationResolvers.Creme2, DesignTokens.Current.primaryFont);

            EmpilerVertical(go, Px(CssPannPadY), Px(4f), Px(CssPannPadX));
        }

        public Button CtaDonnerRegle { get; private set; }

        private void ConstruirePied(Transform parent)
        {
            GameObject go = NouveauUI("Pied", parent);
            GameObject cta = NouveauUI("CtaDonnerRegle", go.transform);
            Image fond = AjouterImage(cta);
            fond.color = ReputationResolvers.Carte2;
            Contour(cta, ReputationResolvers.OrFilet);

            CtaDonnerRegle = cta.AddComponent<Button>();
            CtaDonnerRegle.targetGraphic = fond;

            TextMeshProUGUI lbl = NouveauTexte(cta.transform, "Libelle", "DONNER UNE RÈGLE",
                CssCtaCorps, ReputationResolvers.OrVif, DesignTokens.Current.primaryFont);
            lbl.alignment = TextAlignmentOptions.Center;
            lbl.characterSpacing = 11f;
            RectTransform lrt = (RectTransform)lbl.transform;
            Etirer(lrt, Px(CssCtaPad));

            LayoutElement le = cta.AddComponent<LayoutElement>();
            le.minHeight = Px(CssCtaCorps + 2f * CssCtaPad);
        }

        // ═══ Primitives ══════════════════════════════════════════════════════════════════════

        internal float PxPublic(float css) => Px(css);
        internal int PxTraitPublic(float css) => PxTrait(css);

        private static GameObject NouveauUI(string nom, Transform parent)
        {
            GameObject go = new GameObject(nom, typeof(RectTransform));
            go.transform.SetParent(parent, false);
            return go;
        }

        /// <summary>⛔ TOUTE Image passe par ici, et ce n'est pas du confort.
        /// `AddComponent&lt;T&gt;()` à l'exécution **n'honore pas** le `[RequireComponent(
        /// CanvasRenderer)]` d'une classe de base — et sans `CanvasRenderer`, un `Graphic` ne
        /// dessine RIEN, sans la moindre erreur console. Mesuré sur ce dépôt : des panneaux et
        /// leur fond rendaient la même couleur des deux côtés, la plaque n'avait jamais existé,
        /// seul le trait de bordure la simulait. L'avertissement était écrit en tête du fichier
        /// du composant, et le site d'appel neuf l'a violé quand même — *écrire l'avertissement
        /// ne protège pas le prochain appelant, seul un test le protège*. D'où cette fabrique
        /// unique, sur laquelle une garde structurelle peut mordre.</summary>
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

        /// <summary>Un contour d'un pixel, en ENFANT — pas une bordure sur l'image de fond
        /// (Unity n'en a pas) et pas un second Image sur le même objet (un seul Graphic par
        /// GameObject).</summary>
        private void Contour(GameObject go, Color couleur)
        {
            GameObject b = NouveauUI("Contour", go.transform);
            Etirer((RectTransform)b.transform);
            Image img = AjouterImage(b);
            img.sprite = ProceduralUI.RoundedRectOutline(PxTrait(2f), PxTrait(1f), Color.white);
            img.type = Image.Type.Sliced;
            img.color = couleur;
            img.raycastTarget = false;
        }

        private TextMeshProUGUI NouveauTexte(Transform parent, string nom, string texte,
                                             float corpsCss, Color couleur, TMP_FontAsset police)
        {
            GameObject go = NouveauUI(nom, parent);
            if (go.GetComponent<CanvasRenderer>() == null) go.AddComponent<CanvasRenderer>();
            TextMeshProUGUI t = go.AddComponent<TextMeshProUGUI>();
            t.font = police;
            t.text = texte;
            t.fontSize = PxTrait(corpsCss);   // un corps de texte à 0 est un défaut de rendu
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

        private static void AncrerHaut(RectTransform rt, float haut, float margeH)
        {
            rt.anchorMin = new Vector2(0f, 1f);
            rt.anchorMax = new Vector2(1f, 1f);
            rt.pivot = new Vector2(0.5f, 1f);
            rt.offsetMin = new Vector2(margeH, rt.offsetMin.y);
            rt.offsetMax = new Vector2(-margeH, -haut);
        }

        private static void EmpilerVertical(GameObject go, float padY, float espacement,
                                            float padX = 0f)
        {
            VerticalLayoutGroup v = go.AddComponent<VerticalLayoutGroup>();
            v.spacing = espacement;
            v.padding = new RectOffset(Mathf.RoundToInt(padX), Mathf.RoundToInt(padX),
                                       Mathf.RoundToInt(padY), Mathf.RoundToInt(padY));
            v.childControlWidth = true; v.childControlHeight = true;
            v.childForceExpandWidth = true; v.childForceExpandHeight = false;
        }

        /// <summary>⛔ Le sas obligatoire avant toute LECTURE de géométrie.
        /// `Canvas.scaleFactor` et les `rect` lus dans la frame de création rendent des valeurs
        /// PLAUSIBLES et fausses (1,0 pour le scaleFactor) — la famille de défauts la plus
        /// dangereuse, parce que rien ne signale l'erreur. Un `yield return null` coûte une
        /// frame ; une valeur neutre non initialisée coûte un round de juge.</summary>
        public IEnumerator AttendreLayoutPuis(System.Action apres)
        {
            yield return null;
            Canvas.ForceUpdateCanvases();
            if (racinePleinEcran != null)
                LayoutRebuilder.ForceRebuildLayoutImmediate(racinePleinEcran);
            yield return null;
            apres?.Invoke();
        }
    }
}
