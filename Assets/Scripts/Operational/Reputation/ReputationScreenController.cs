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

        // ⛔ CES CINQ-LÀ SONT `internal`, ET C'EST UN CORRECTIF, PAS UN DÉTAIL DE PORTÉE.
        // Elles décrivent le voyant, que `TellVoyant` construit — une AUTRE classe. Tant qu'elles
        // étaient `private`, TellVoyant ne pouvait pas les lire et portait les mêmes nombres EN
        // DUR (7.4f, 5.4f, 7f, 8f, 5f). Deux sources pour une seule valeur : le jour où la
        // maquette bouge, on corrige ici et le voyant garde l'ancienne, en silence.
        // ⚠️ Et le pire est ce que ça faisait à la GARDE : `comparer-code-maquette-reputation.py`
        // validait « CssVoyantSens = 5.4px, concordant avec .tl small » sur une constante que
        // RIEN N'EMPLOYAIT. La garde certifiait une valeur inerte pendant que le rendu réel
        // utilisait un littéral qu'elle ne regardait pas. C'est le « tunable sans consommateur »
        // du socle, retourné contre l'instrument qui devait le détecter.
        // ⇒ Le comparateur exige désormais l'USAGE (≥ 2 occurrences), pas la seule déclaration.
        internal const float CssVoyantPadY    = 5f;    // .tl{padding:5px 8px}
        internal const float CssVoyantPadX    = 8f;
        internal const float CssVoyantDiam    = 7f;    // .tl .lum{width:7px;height:7px}
        internal const float CssVoyantTitre   = 7.4f;  // .tl b
        internal const float CssVoyantSens    = 5.4f;  // .tl small
        internal const float CssVoyantEcart   = 7f;    // .tl{gap:7px}
        private const float CssPannPadX      = 10f;
        private const float CssPannPadY      = 8f;
        private const float CssPannSurTitre  = 5.6f;
        private const float CssPannTitre     = 13f;
        private const float CssPannTexte     = 6.6f;
        private const float CssCtaPad        = 8f;
        private const float CssCtaCorps      = 8.5f;
        private const float CssPiedHaut      = 9f;

        // ── HAUTEURS DE BLOC, lues à la source : `H_FIXE` et `H_MIROIR` de
        //    generateur-reputation.py:279-280. Ce ne sont PAS des valeurs choisies à l'œil.
        // ⛔ Sans elles, le VerticalLayoutGroup de `corps` calcule la hauteur de chaque bloc
        //    depuis ses enfants et les étire : mesuré sur la capture du run 17, les compteurs
        //    faisaient plus du double de leur hauteur et le bloc portrait laissait un grand vide.
        //    Une garde structurelle ne voit pas ça — c'est l'angle mort A3, « l'effet des
        //    espacements n'est pas vérifié », et il ressort une deuxième fois.
        private const float CssHEnseigne  = 51f;
        private const float CssHCompteurs = 42f;
        private const float CssHPann      = 74f;
        private const float CssHPied      = 52f;
        // ⚠️ 188 et non 172 : `verifier()` compte la zone du miroir comme `H_MIROIR + H_ENTOUR`
        //    (172 + 16, generateur-reputation.py:280 et 292). J'avais pris `H_MIROIR` seul parce que
        //    c'est la constante qui PORTE le nom du bloc — mais le nom désigne le dessin, pas la
        //    zone qui le contient. Vérifié sur la somme que la maquette contraint :
        //    51 + 42 + 188 + 74 + 52 = 407, + 34 = 441 ≤ 462. Avec 172, le contenu du portrait
        //    (8 + 12,3 + 119 + 16,75 + 8,25 + 9 = 173,3 px CSS) ne rentrait pas dans sa propre
        //    boîte et le buste passait par-dessus le verdict.
        private const float CssHMiroir    = 188f;
        private const float CssHRegleVide =  60f;   // l'état « rien » ; une liste pleine vaut n × 30
        private const float CssHRegle       = 30f;  // H_REGLE — la hauteur d'UNE règle listée
        private const float CssVerdictTitre   = 10f;   // `.verdict b`  — serif 700
        private const float CssVerdictLegende = 6.4f;  // `.verdict span`
        private const float CssVerdictEcart   = 8f;    // `.verdict` gap
        private const float CssHRegleEntour = 16f;  // H_ENTOUR — le sur-titre et les marges du bloc

        // ⚠️ AUCUN de ces blocs n'est élastique, et c'est la maquette qui le dit, pas moi.
        //    `verifier()` (generateur-reputation.py:291-294) contraint la SOMME —
        //        fixe + corps + 34 <= 462
        //    — où `corps` vaut H_MIROIR (172) pour la vue miroir, ou `nb_règles × H_REGLE` (30)
        //    pour la vue liste, ou 60 pour l'état « rien ». Une somme plafonnée décrit un empilement
        //    qui se pose EN HAUT et laisse du vide en bas ; elle ne décrit pas un remplissage.
        // ⛔ J'avais d'abord mis flexibleHeight=1 sur le miroir en le qualifiant de « zone
        //    élastique ». C'était une invention : aucune ligne de la maquette ne parle d'élasticité.
        //    Résultat mesuré sur la capture du run 19 — le miroir absorbait tout l'espace libre et
        //    ouvrait un vide de plus de 500 px sous le portrait. Le défaut n'était pas la valeur
        //    172, qui était juste ; il était dans le mot que j'avais mis autour.

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

            // Le sous-titre et le panneau NOMMENT l'état, ils ne le décorent pas. Trois états
            // distincts, un par valeur de `consistency_cue` — et `indeterminate` n'est pas le
            // cran du milieu, c'est « pas encore assez vu ».
            AppliquerEtat(bm != null ? bm.consistency_cue : null, absorbe);

            MajCompteur(0, declarees.ToString("00"), null, "RÈGLES DONNÉES");
            MajCompteur(1, absorbe.ToString("00"), "/4", "ABSORBÉES");
            // ⛔ ENFREINTES : TOUJOURS un tiret. Voir la note ENFREINTES plus bas.
            //
            // ⚠️ RÉTRACTÉ le 2026-08-31, et la garde B3T1 a mordu avant moi. J'avais mis « 00 »
            // quand `declarees == 0`, en le justifiant ainsi : « sans règle déclarée, rien ne peut
            // être enfreint, donc le zéro est DÉDUIT et non inventé ». C'est faux, et la maquette
            // porte elle-même la réfutation : une règle déclarée tient « jusqu'à ce que vous la
            // retiriez publiquement ». Une règle déclarée, enfreinte, puis retirée laisse
            // `declared_rules` VIDE et une enfreinte bien réelle. `declarees == 0` ne prouve donc
            // rien sur le nombre d'enfreintes — ma déduction n'était pas une déduction.
            // ★ Ce que je retiens : j'ai reconnu la maquette comme autorité pour lui emprunter son
            //   « 00 », et ignoré la phrase, deux blocs plus loin dans le MÊME fichier, qui le
            //   contredisait. On ne cite pas une source en choisissant la ligne qui arrange.
            MajCompteur(2, "—", null, "ENFREINTES");

            // Le pied nomme le PREMIER geste tant qu'aucune règle n'existe — `reputation()` donne
            // « DONNER UNE PREMIÈRE RÈGLE » à la seule vue vierge (ligne 211) et « DONNER UNE
            // RÈGLE » partout ailleurs (200, 222, 237).
            if (ctaLibelle != null)
                ctaLibelle.text = declarees == 0 ? "DONNER UNE PREMIÈRE RÈGLE" : "DONNER UNE RÈGLE";

            RendreListeDesRegles(bm != null ? bm.declared_rules : null);

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

        /// <summary>L'état de l'écran, dérivé de `consistency_cue` — sous-titre ET panneau de
        /// prose ensemble, parce qu'ils disent la MÊME chose et que les séparer les laisserait
        /// diverger.
        ///
        /// ⛔ POURQUOI `drifting` A SON PROPRE ÉTAT, ET CE N'EST PAS UN DÉTAIL DE TEXTE. C'est le
        /// moment dramatique de l'écran : le joueur a laissé passer ce qu'il avait lui-même
        /// interdit. La maquette lui consacre un cadre entier, avec un panneau en AMBRE. Le
        /// traiter comme le cas ordinaire — ce que faisait la première version de ce contrôleur,
        /// où `drifting` n'apparaissait nulle part — revient à taire l'information que le joueur
        /// est précisément venu chercher.
        ///
        /// ⚠️ Et ce que l'écran ne peut PAS dire, il le dit : le serveur signale QUE vous dérivez,
        /// jamais SUR QUELLE RÈGLE (le `rule_id` fautif est en base, jamais projeté — forme F,
        /// lot back S13-k). Le texte de dérive le mentionne au lieu de laisser croire à un choix
        /// de mise en page.</summary>
        private void AppliquerEtat(string cue, int absorbe)
        {
            if (ReputationResolvers.CoherenceEstIndeterminee(cue))
            {
                sousTitre.text = absorbe == 0
                    ? "UN LIEUTENANT NEUF N'A ENCORE RIEN ABSORBÉ"
                    : "PERSONNE NE VOUS A ENCORE JUGÉ";
                MajVerdict("Pas encore jugeable", ReputationResolvers.Muet);
                MajPanneau("« PAS JUGEABLE » N'EST PAS « MOYEN »",
                    "Rien n'a encore déteint",
                    "ses quatre voyants sont éteints parce qu'il n'a rien pris de vous — pas " +
                    "parce qu'il est médiocre. Et le serveur refuse de juger votre constance " +
                    "tant qu'il n'a pas assez vu : indéterminé, jamais au milieu d'une jauge.",
                    ReputationResolvers.Creme);
                return;
            }

            if (cue == "drifting")
            {
                sousTitre.text = "VOUS VOUS ÉCARTEZ DE VOS PROPRES RÈGLES";
                MajVerdict("Vous vous en écartez", ReputationResolvers.Ambre);
                MajPanneau("CE QUI A CHANGÉ",
                    "Une règle donnée, une règle enfreinte",
                    "vous avez laissé passer ce que vous aviez interdit. Les deux cercles " +
                    "l'enregistrent — le vôtre et le sien. Le serveur dit que vous dérivez, " +
                    "jamais sur quelle règle : c'est un maillon manquant, pas un choix d'écran.",
                    ReputationResolvers.Ambre);
                return;
            }

            sousTitre.text = "CE QU'IL A PRIS DE VOUS SE VOIT SUR LUI";
            MajVerdict("Vous vous y tenez", ReputationResolvers.Vert);
            MajPanneau("LA RÈGLE DU JEU",
                "Vous vous lisez sur lui",
                "chaque vertu qu'il vous voit tenir finit sur sa tenue — col, manches, montre, " +
                "gants. Une règle déclarée tient jusqu'à ce que vous la retiriez publiquement : " +
                "la donner, c'est se donner une corde.",
                ReputationResolvers.Creme);
        }

        /// <summary>Écrit le verdict de cohérence et sa couleur. Les trois libellés viennent de la
        /// table `COHERENCE` de la maquette (generateur-reputation.py:57-61) et sont écrits ici tels
        /// quels — « vous vous y tenez » / « vous vous en écartez » / « pas encore jugeable ».
        ///
        /// ⚠️ Les trois appelants sont les trois branches d'`AppliquerEtat`, et il n'existe pas de
        /// quatrième chemin : un état qui oublierait d'appeler cette méthode laisserait la colonne
        /// SANS titre, ce qui est exactement le défaut qu'on vient de corriger. Une couleur nulle
        /// est refusée bruyamment plutôt que rendue en blanc par défaut.</summary>
        private void MajVerdict(string libelle, Color couleur)
        {
            if (verdictTitre == null) return;   // écran pas encore construit — pas une erreur
            verdictTitre.text = libelle;
            verdictTitre.color = couleur;
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
            // Le panneau AUSSI — sinon il garderait la prose du chargement précédent (« vous vous
            // écartez de vos propres règles ») sur un écran qui annonce ne rien savoir. Même
            // défaut que des voyants restés allumés ou qu'une liste de règles non vidée : chaque
            // chemin d'échec doit remettre TOUT ce qu'il a pu laisser derrière lui.
            MajPanneau("CE QUE L'ON NE SAIT PAS",
                "Le miroir ne répond pas",
                "impossible de lire ce que votre lieutenant a retenu de vous. Ce n'est pas un " +
                "verdict neutre : c'est une absence de verdict.",
                ReputationResolvers.Muet);
            MajCompteur(0, "—", null, "RÈGLES DONNÉES");
            MajCompteur(1, "—", "/4", "ABSORBÉES");
            MajCompteur(2, "—", null, "ENFREINTES");
            // La liste est VIDÉE, pas laissée telle quelle : garder les règles du chargement
            // précédent afficherait celles d'un AUTRE lieutenant sur un écran qui annonce ne
            // rien savoir — même défaut que des voyants restés allumés.
            RendreListeDesRegles(null);
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

            // ⛔ L'ÉCHELLE AVANT TOUT — un RectTransform qui vient d'être étiré n'a PAS encore son
            // `rect` résolu, et `Px()` le lit dès la première constante convertie. Mesuré sur cet
            // écran (run 21, log `[GEOM b3]`) : les six blocs rendaient EXACTEMENT la hauteur qu'ils
            // demandaient — `Miroir=86css(voulu 86)` — mais chaque « voulu » valait la MOITIÉ de sa
            // constante (51→26, 42→21, 172→86, 60→30, 74→37, 52→26). Le layout était juste ; c'est
            // la conversion qui s'était faite contre une largeur de canvas de 640 au lieu de 1280.
            //
            // ⚠️ Le garde-fou du socle ne l'attrape pas : `LargeurCanvas` accepte toute largeur
            // `> 100f`, ce qui écarte un zéro mais pas une valeur PLAUSIBLE ET FAUSSE. Un repli qui
            // ne teste que la vacuité laisse passer la moitié exacte de la bonne réponse — et une
            // échelle divisée par deux ne ressemble pas à un bug, elle ressemble à un écran sobre.
            Canvas.ForceUpdateCanvases();
            float largeurLue = racinePleinEcran.rect.width;
            if (largeurLue < EchelleMaquette.LargeurCanvasParDefaut * 0.9f)
            {
                // On le DIT plutôt que de le corriger en silence : si la racine n'est toujours pas
                // résolue après un ForceUpdateCanvases, l'échelle qui suit est une supposition, et
                // le prochain lecteur doit l'apprendre du log et non d'une capture qui a l'air bien.
                Debug.LogWarning($"[ECHELLE b3] racine non résolue : rect.width={largeurLue:F0} < "
                                 + $"{EchelleMaquette.LargeurCanvasParDefaut:F0} attendu. Toutes les "
                                 + "conversions px CSS de cet écran seront proportionnellement fausses.");
            }

            // Le corps vit SOUS le chrome : le bandeau et le dock mangent leur part, publiée par
            // le shell. Hors shell (test isolé) les insets valent 0 et l'écran remplit tout —
            // le comportement d'avant que ces champs existent.
            GameObject corpsGo = NouveauUI("Corps", racine.transform);
            corps = (RectTransform)corpsGo.transform;
            corps.anchorMin = Vector2.zero;
            corps.anchorMax = Vector2.one;
            corps.offsetMin = new Vector2(0f, ShellChrome.BottomInsetPx);
            corps.offsetMax = new Vector2(0f, -ShellChrome.TopInsetPx);

            // ⛔⛔ SANS CE LAYOUT, LES SIX BLOCS RESTENT TOUS À LA POSITION PAR DÉFAUT.
            // Mesuré sur la première capture réussie : l'enseigne était en place (elle porte son
            // propre ancrage), et les cinq autres blocs s'empilaient au CENTRE, superposés, les
            // textes rendus en colonne d'une lettre faute de largeur. `corps` recevait bien ses
            // enfants, mais rien ne leur disait où aller.
            // ⇒ C'est mon angle mort A3, déclaré une heure plus tôt : « les constantes sont
            //   vérifiées contre la maquette (42 concordances), leur EFFET ne l'est pas ». Le
            //   comparateur code↔maquette était vert, et l'écran était illisible. Une valeur juste
            //   dans un conteneur sans layout ne produit rien.
            // Marges de la maquette : `.enseigne{margin:13px 13px 0}` puis `margin-top:9px` entre
            // blocs successifs (chassis6.py), converties par EchelleMaquette.
            VerticalLayoutGroup pile = corpsGo.AddComponent<VerticalLayoutGroup>();
            pile.spacing = Px(CssEcartBloc);
            pile.padding = new RectOffset(PxTrait(CssMargeH), PxTrait(CssMargeH),
                                          PxTrait(CssEnseigneHaut), PxTrait(CssPiedHaut));
            pile.childControlWidth = true;  pile.childControlHeight = true;
            pile.childForceExpandWidth = true; pile.childForceExpandHeight = false;

            ConstruireCerne(corpsGo.transform);
            ConstruireEnseigne(corpsGo.transform);
            ConstruireCompteurs(corpsGo.transform);
            ConstruireMiroir(corpsGo.transform);
            ConstruireListeDesRegles(corpsGo.transform);
            ConstruirePanneau(corpsGo.transform);
            ConstruirePied(corpsGo.transform);
        }

        /// <summary>Le liseré doré qui encadre l'écran (`.cerne{inset:5px}`).</summary>
        private void ConstruireCerne(Transform parent)
        {
            GameObject go = NouveauUI("Cerne", parent);
            RectTransform rt = (RectTransform)go.transform;
            // Le cerne ENCADRE l'écran, il ne s'empile pas avec les blocs : on l'exclut du layout.
            go.AddComponent<LayoutElement>().ignoreLayout = true;
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
            LayoutElement hle = go.AddComponent<LayoutElement>();
            hle.minHeight = Px(CssHEnseigne);
            hle.preferredHeight = Px(CssHEnseigne);
            hle.flexibleHeight = 0f;   // hauteur FIXE : ne s'étire pas
            // ⚠️ PLUS D'ANCRAGE MANUEL ICI : le VerticalLayoutGroup de `corps` place ce bloc.
            // Les deux mécanismes se contredisent — un ancrage haut + un layout parent donnent
            // une position que ni l'un ni l'autre ne décrit.
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
            // Même classe : un filet est un DÉCOR, il ne s'empile pas avec le titre et le
            // sous-titre. Sans ça, le VerticalLayoutGroup de l'enseigne lui réserve une ligne.
            filet.AddComponent<LayoutElement>().ignoreLayout = true;

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
            LayoutElement hle = go.AddComponent<LayoutElement>();
            hle.minHeight = Px(CssHCompteurs);
            hle.preferredHeight = Px(CssHCompteurs);
            hle.flexibleHeight = 0f;   // hauteur FIXE : ne s'étire pas
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
            LayoutElement hle = go.AddComponent<LayoutElement>();
            hle.minHeight = Px(CssHMiroir);
            hle.preferredHeight = Px(CssHMiroir);
            hle.flexibleHeight = 0f;   // ⚠️ PAS élastique — voir la note ci-dessous
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
            // ⛔ `minWidth` AUTANT que `preferredWidth` — la maquette dit `flex:none` (.prt, ligne
            // 71), ce qui interdit à ce cadre de rétrécir, pas seulement de grandir.
            // ⚠️ Mesuré avant correction (log `[PRT b3]`, run 26) : le cadre rendait 369 unités
            // au lieu des 503 demandées, soit 86 px CSS pour 118 déclarés — la colonne de lecture,
            // elle sans largeur plancher, réclamait la place et Unity comprimait le portrait
            // jusqu'à son `minWidth` implicite de ZÉRO. `preferredWidth` seul n'est qu'un souhait.
            // Le débordement du buste en découlait : le dessin calcule son échelle sur les 96 px
            // CSS VOULUS, si bien que les épaules faisaient 330 unités dans une zone devenue large
            // de 301. La forme ne débordait pas parce qu'elle était mal dessinée, mais parce que
            // son cadre avait rétréci sous elle.
            le.minWidth = Px(CssPortraitLarg);
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

            // ⛔ LE VERDICT — le titre de la colonne, et il MANQUAIT. Mon commentaire ci-dessus
            // annonçait « le verdict de cohérence, puis les quatre voyants » depuis le début, et
            // seuls les voyants existaient : un commentaire décrivait une intention que le code ne
            // réalisait pas, ce qui est pire qu'un commentaire absent — il m'a fait relire cette
            // fonction plusieurs fois sans voir le trou, puisqu'elle DISAIT contenir le verdict.
            // Trouvé en comparant la capture à `m-120.png`, pas en relisant le code.
            //
            // Mesuré à la source (`.verdict`, generateur-reputation.py:88-90) : serif 700 à 10 px
            // pour le verdict, sans-serif 6,4 px `muet` pour la légende, alignés sur la LIGNE DE
            // BASE avec 8 px d'écart — d'où l'alignement horizontal plutôt qu'une pile.
            GameObject verdictGo = NouveauUI("Verdict", lect.transform);
            HorizontalLayoutGroup hv = verdictGo.AddComponent<HorizontalLayoutGroup>();
            hv.spacing = Px(CssVerdictEcart);
            hv.childControlWidth = true; hv.childControlHeight = true;
            hv.childForceExpandWidth = false; hv.childForceExpandHeight = false;
            hv.childAlignment = TextAnchor.LowerLeft;   // `align-items:baseline`, au plus près

            verdictTitre = NouveauTexte(verdictGo.transform, "Titre", "",
                CssVerdictTitre, ReputationResolvers.Muet, DesignTokens.Current.hudSerifFont);
            verdictTitre.fontStyle = TMPro.FontStyles.Bold;

            // La légende ne dépend d'AUCUN état : c'est la même phrase dans les six vues de la
            // maquette. La poser une fois ici, plutôt que dans `AppliquerEtat`, évite qu'un état
            // futur oublie de la réécrire et laisse une colonne sans son explication.
            NouveauTexte(verdictGo.transform, "Legende", "ce qu'il a absorbé de vos règles",
                CssVerdictLegende, ReputationResolvers.Muet, DesignTokens.Current.primaryFont);

            for (int i = 0; i < 4; i++)
                voyants[i] = TellVoyant.Construire(lect.transform, this);
        }

        private GameObject    listeReglesBloc;   // le bloc ENTIER — masqué quand il n'y a rien à lister
        private LayoutElement listeReglesHauteur; // sa hauteur suit le NOMBRE de règles (n × 30 CSS)
        private RectTransform listeReglesRoot;
        private TextMeshProUGUI listeReglesVide;
        private TextMeshProUGUI pannSurTitre, pannTitre, pannTexte;
        private TextMeshProUGUI verdictTitre;
        private TextMeshProUGUI ctaLibelle;

        /// <summary>Le verdict de cohérence tel qu'il est AFFICHÉ — crochet de test.</summary>
        public string VerdictAffiche => verdictTitre != null ? verdictTitre.text : null;

        /// <summary>Le sur-titre du panneau, tel qu'il est AFFICHÉ — crochet de test. C'est lui
        /// qui distingue les trois états ; l'asserter sur la sortie plutôt que sur la valeur
        /// d'entrée évite une garde tautologique (« l'état vaut ce que je viens de lui donner »).</summary>
        public string PanneauSurTitreAffiche => pannSurTitre != null ? pannSurTitre.text : null;

        private void MajPanneau(string surTitre, string titre, string texte, Color couleurTitre)
        {
            if (pannSurTitre == null) return;
            pannSurTitre.text = surTitre;
            pannTitre.text = titre;
            pannTitre.color = couleurTitre;
            pannTexte.text = texte;
        }

        /// <summary>La liste des règles que le joueur a déclarées — le cadre `regles` de la
        /// maquette.
        ///
        /// ⛔⛔ ET C'EST ICI QUE SE JOUE LA CONSIGNE LA PLUS EXPLICITE DU LOT : `rule_id` EST
        /// AFFICHÉ EN CLAIR. Le serveur ne rend que cet identifiant — il est écrit par le joueur
        /// lui-même (`reputation.controller.ts:84-86`, « free-form, player-authored ») et AUCUN
        /// libellé n'existe nulle part : le bundle i18n mesuré rend 67 clés, 63 `error.*` et
        /// 4 `game.*`, zéro pour ce domaine. Écrire une table de correspondance côté client
        /// fabriquerait du contenu que le back ne connaît pas, et le premier `rule_id` inattendu
        /// tomberait dans un « (règle inconnue) ».
        /// ⇒ On montre l'identifiant tel quel. **Le trou se montre, il ne se masque pas** — c'est
        /// la même règle que le compteur d'enfreintes à « — » et que la mention
        /// « lieutenant.name — non projeté » sous le portrait.
        ///
        /// ⚠️ Et il n'y a AUCUN bouton de retrait, volontairement : `retractRule` existe côté
        /// serveur mais n'a qu'un appelant, de test — zéro en production. Le canon dit qu'une
        /// règle tient jusqu'à retrait public ; tant que ce maillon manque, une règle donnée est
        /// définitive, et l'écran le DIT au lieu d'offrir un geste qui échouerait.</summary>
        private void ConstruireListeDesRegles(Transform parent)
        {
            GameObject go = NouveauUI("ListeDesRegles", parent);
            listeReglesBloc = go;
            LayoutElement hle = go.AddComponent<LayoutElement>();
            listeReglesHauteur = hle;
            hle.minHeight = Px(CssHRegleVide);
            hle.preferredHeight = Px(CssHRegleVide);
            hle.flexibleHeight = 0f;
            AjouterFond(go, ReputationResolvers.Fond2);
            Contour(go, ReputationResolvers.Lisere);

            NouveauTexte(go.transform, "SurTitre", "LES RÈGLES QUE VOUS AVEZ DONNÉES",
                CssPannSurTitre, ReputationResolvers.Muet,
                DesignTokens.Current.primaryFont).characterSpacing = 19f;

            GameObject lignes = NouveauUI("Lignes", go.transform);
            listeReglesRoot = (RectTransform)lignes.transform;
            VerticalLayoutGroup v = lignes.AddComponent<VerticalLayoutGroup>();
            v.spacing = Px(3f);
            v.childControlWidth = true; v.childControlHeight = true;
            v.childForceExpandWidth = true; v.childForceExpandHeight = false;

            listeReglesVide = NouveauTexte(go.transform, "Vide",
                "vous n'avez encore donné aucune règle — rien ne peut donc être enfreint",
                CssPannTexte, ReputationResolvers.Eteint, DesignTokens.Current.primaryFont);

            EmpilerVertical(go, Px(CssPannPadY), Px(4f), Px(CssPannPadX));
        }

        /// <summary>Combien de règles la liste affiche RÉELLEMENT — crochet de test. Distinct du
        /// compteur « RÈGLES DONNÉES » de l'en-tête : celui-ci compte ce que le corps porte,
        /// celui-là compte ce qui est DESSINÉ. Les confondre masquerait exactement le défaut
        /// qu'on veut voir (« disponible, et pourtant non affiché »).</summary>
        public int ReglesAffichees { get; private set; }

        private void RendreListeDesRegles(DeclaredRuleDto[] regles)
        {
            for (int i = listeReglesRoot.childCount - 1; i >= 0; i--)
                Object.Destroy(listeReglesRoot.GetChild(i).gameObject);

            ReglesAffichees = 0;
            bool vide = regles == null || regles.Length == 0;

            // ⛔ VIDE ⇒ LE BLOC ENTIER DISPARAÎT, il ne se contente pas d'afficher « aucune règle ».
            // La maquette ne laisse pas le choix : `reputation()` (generateur-reputation.py:200-211)
            // construit la vue `vierge` avec l'enseigne, les compteurs, LE MIROIR, le panneau et le
            // pied — et rien d'autre. La liste appartient à une vue SÉPARÉE (`rg6`), et `verifier()`
            // les traite en `if/elif` : jamais les deux dans le même cadre.
            // ⚠️ Mesuré en comparant ma capture à la référence `m-120.png` : j'affichais un sixième
            // bloc que la maquette ne montre nulle part dans cet état. Il ne venait d'aucune source
            // — je l'avais construit parce que l'écran « devait bien » lister les règles.
            listeReglesBloc.SetActive(!vide);
            listeReglesVide.gameObject.SetActive(false);
            if (vide) return;

            // La hauteur est un COMPTE, pas une constante : `H_REGLE = 30` par règle (ligne 280),
            // plus l'entourage. Une hauteur figée tronquerait la 3ᵉ règle ou laisserait un vide.
            float haut = regles.Length * CssHRegle + CssHRegleEntour;
            listeReglesHauteur.minHeight = Px(haut);
            listeReglesHauteur.preferredHeight = Px(haut);

            foreach (DeclaredRuleDto regle in regles)
            {
                if (regle == null || string.IsNullOrEmpty(regle.rule_id)) continue;

                GameObject ligne = NouveauUI("Regle_" + regle.rule_id, listeReglesRoot);
                AjouterFond(ligne, ReputationResolvers.Panneau);
                HorizontalLayoutGroup h = ligne.AddComponent<HorizontalLayoutGroup>();
                h.spacing = Px(7f);
                h.padding = new RectOffset(PxTrait(8f), PxTrait(8f), PxTrait(5f), PxTrait(5f));
                h.childControlWidth = true; h.childControlHeight = true;
                h.childForceExpandWidth = false;
                h.childAlignment = TextAnchor.MiddleLeft;

                // Le liseré vertical. ⚠️ Il est NEUTRE, et c'est une décision : la maquette le
                // colore en vert (tenue) ou ambre (enfreinte), mais AUCUNE clé du corps ne dit
                // quelle règle est enfreinte — le `rule_id` fautif est écrit en base
                // (`boss_mirror_violation_ring.violation_slots[]`) et jamais projeté. Colorer au
                // hasard inventerait l'information la plus lourde de l'écran.
                GameObject sc = NouveauUI("Liseré", ligne.transform);
                AjouterFond(sc, ReputationResolvers.Lisere);
                LayoutElement scle = sc.AddComponent<LayoutElement>();
                scle.preferredWidth = PxTrait(3f);
                scle.flexibleWidth = 0f;

                // L'identifiant, EN CLAIR. Pas de table de libellés : il n'en existe aucune.
                TextMeshProUGUI id = NouveauTexte(ligne.transform, "RuleId", regle.rule_id,
                    CssVoyantTitre, ReputationResolvers.Creme, DesignTokens.Current.primaryFont);
                LayoutElement idle = id.gameObject.AddComponent<LayoutElement>();
                idle.flexibleWidth = 1f;

                ReglesAffichees++;
            }
        }

        private void ConstruirePanneau(Transform parent)
        {
            GameObject go = NouveauUI("Panneau", parent);
            LayoutElement hle = go.AddComponent<LayoutElement>();
            hle.minHeight = Px(CssHPann);
            hle.preferredHeight = Px(CssHPann);
            hle.flexibleHeight = 0f;   // hauteur FIXE : ne s'étire pas
            panneauProse = (RectTransform)go.transform;
            AjouterFond(go, ReputationResolvers.Panneau);
            Contour(go, ReputationResolvers.Lisere);

            // Les trois textes sont MÉMORISÉS : le panneau change avec l'état (`AppliquerEtat`),
            // il n'est pas figé à la construction. Un panneau figé afficherait « la règle du
            // jeu » à un joueur en train de dériver — au moment précis où l'écran doit lui dire
            // autre chose.
            pannSurTitre = NouveauTexte(go.transform, "SurTitre", "", CssPannSurTitre,
                ReputationResolvers.Muet, DesignTokens.Current.primaryFont);
            pannSurTitre.characterSpacing = 19f;
            pannTitre = NouveauTexte(go.transform, "Titre", "", CssPannTitre,
                ReputationResolvers.Creme, DesignTokens.Current.hudSerifFont);
            pannTexte = NouveauTexte(go.transform, "Texte", "",
                CssPannTexte, ReputationResolvers.Creme2, DesignTokens.Current.primaryFont);

            EmpilerVertical(go, Px(CssPannPadY), Px(4f), Px(CssPannPadX));
        }

        public Button CtaDonnerRegle { get; private set; }

        private void ConstruirePied(Transform parent)
        {
            GameObject go = NouveauUI("Pied", parent);
            LayoutElement hle = go.AddComponent<LayoutElement>();
            hle.minHeight = Px(CssHPied);
            hle.preferredHeight = Px(CssHPied);
            hle.flexibleHeight = 0f;   // hauteur FIXE : ne s'étire pas
            GameObject cta = NouveauUI("CtaDonnerRegle", go.transform);
            Image fond = AjouterImage(cta);
            fond.color = ReputationResolvers.Carte2;
            Contour(cta, ReputationResolvers.OrFilet);

            CtaDonnerRegle = cta.AddComponent<Button>();
            CtaDonnerRegle.targetGraphic = fond;

            ctaLibelle = NouveauTexte(cta.transform, "Libelle", "DONNER UNE RÈGLE",
                CssCtaCorps, ReputationResolvers.OrVif, DesignTokens.Current.primaryFont);
            ctaLibelle.alignment = TextAlignmentOptions.Center;
            ctaLibelle.characterSpacing = 11f;
            RectTransform lrt = (RectTransform)ctaLibelle.transform;
            Etirer(lrt, Px(CssCtaPad));

            LayoutElement le = cta.AddComponent<LayoutElement>();
            le.minHeight = Px(CssCtaCorps + 2f * CssCtaPad);
            le.preferredHeight = Px(CssCtaCorps + 2f * CssCtaPad);
            // Le PIED lui-même doit réserver sa hauteur au layout de `corps`, sinon il se réduit
            // à zéro et le CTA déborde hors du cadre — mesuré sur la capture du run 14.
            LayoutElement pied = go.AddComponent<LayoutElement>();
            pied.minHeight = Px(CssCtaCorps + 2f * CssCtaPad + CssPiedHaut);
            pied.preferredHeight = pied.minHeight;
            VerticalLayoutGroup vp = go.AddComponent<VerticalLayoutGroup>();
            vp.childControlWidth = true; vp.childControlHeight = true;
            vp.childForceExpandWidth = true; vp.childForceExpandHeight = false;
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
            // ⛔ MÊME DÉFAUT QUE LE CERNE, ET IL ÉTAIT VISIBLE À L'ÉCRAN : un `Contour` est un
            // ENFANT du bloc qu'il borde, donc un LayoutGroup parent le compte comme un ÉLÉMENT.
            // Mesuré sur la capture du run 14 : une COLONNE VIDE à gauche du portrait, large
            // comme un tiers du miroir — c'était le contour, aligné par le HorizontalLayoutGroup
            // au même titre que le portrait et la colonne de lecture.
            // ⇒ Un cadre ne s'empile pas : il se superpose. `ignoreLayout` le dit au layout.
            b.AddComponent<LayoutElement>().ignoreLayout = true;
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
