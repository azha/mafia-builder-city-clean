using System.Collections;
using UnityEngine;
using UnityEngine.UI;
using TMPro;
using MafiaCleanCity.Shell;
using MafiaCleanCity.Theme;

namespace MafiaCleanCity.Operational
{
    /// <summary>screen_c6 « Horizon » — squelette généré par Tools/nouvel-ecran.py.
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
    public class HorizonScreenController : MonoBehaviour, IShellTenant
    {
        [Header("Backend")]
        [SerializeField] private string baseUrl = "http://localhost";

        // ---- points d'injection du shell (IShellTenant) -----------------------------------
        private Transform mountParent;
        public void SetMountParent(Transform parent) => mountParent = parent;

        private string token;
        public void SetToken(string t) => token = t;

        // ---- crochets de test ---------------------------------------------------------------
        public GetMetaHorizonFeedResponseDto DernierChargement { get; private set; }
        public string DerniereErreur { get; private set; }
        public long DernierCodeErreur { get; private set; }

        private RectTransform racinePleinEcran;
        private HorizonClient client;
        private bool initialise;

        private float Px(float css) =>
            EchelleMaquette.Px(css, racinePleinEcran, EchelleMaquette.LargeurEcransBrennar);
        private int PxTrait(float css) =>
            EchelleMaquette.PxTrait(css, racinePleinEcran, EchelleMaquette.LargeurEcransBrennar);

        // ⛔ `Start`, PAS `Awake` — et c'est le shell qui l'impose. `ConstruireLocataire` fait
        // `host.AddComponent<T>()`, ce qui déclenche `Awake` IMMÉDIATEMENT, puis appelle
        // `SetMountParent` à la ligne suivante. Un écran qui construit dans `Awake` se bâtit donc
        // AVANT de savoir où : il retombe sur sa racine de repli, ses ancres plein écran ne sont
        // jamais posées, et ses textes s'empilent au centre — ce qui RESSEMBLE à un défaut de mise
        // en page. Mesuré sur ㊲, puis reproduit par une autre session sur son propre écran.
        // ⚠️ Le squelette généré met `Awake` : signalé à qui tient le scaffold.
        private void Start() => EnsureInitialized();

        private void EnsureInitialized()
        {
            if (initialise) return;
            initialise = true;
            client = new HorizonClient { BaseUrl = baseUrl };
            BuildLayout();
        }

        // ═══ Chargement ══════════════════════════════════════════════════════════════════════

        /// <summary>Charge la surface. // MÉTIER ICI si `GetMetaHorizonFeed` a des paramètres
        /// de chemin (id, etc.) — ajouter les arguments correspondants ici et les faire
        /// remonter depuis l'appelant (le shell, ou un `RendrePourTest`).</summary>
        public IEnumerator Charger()
        {
            EnsureInitialized();
            DerniereErreur = null;
            DernierCodeErreur = 0;

            yield return client.GetMetaHorizonFeed(token,
                dto => DernierChargement = dto,
                (code, msg) => { DernierCodeErreur = code; DerniereErreur = msg; });

            // ⛔ L'ÉCHELLE DES PALIERS vient d'une SECONDE route, et son échec est NON FATAL :
            // ㊱ existait avant elle et doit continuer d'afficher son flux si elle tombe. Une
            // échelle absente est un manque ; un écran blanc est une panne.
            // ⚠️ On RÉUTILISE `ProgressionClient`, qui appelait déjà `/v1/progression` pour
            // l'Accueil et ⑤. J'ai commencé par en écrire un second avant de voir celui-ci :
            // j'avais cherché la DONNÉE (`tier`) et non la ROUTE. Un producteur qui existe déjà
            // ne se signale pas par le nom de ce qu'on lui demande.
            clientProgression = clientProgression
                ?? new Exceptions.ProgressionClient { BaseUrl = baseUrl };
            yield return clientProgression.GetProgression(token,
                dto => DerniereProgression = dto,
                (code, msg) => { DerniereProgression = null; });

            // La frame de création rend des rects non résolus : on attend le layout AVANT de
            // rendre quoi que ce soit qui lise une géométrie.
            yield return null;

            if (DernierChargement == null) { RendreEtatIndisponible(); yield break; }
            AppliquerEtat(DernierChargement);
        }

        /// <summary>Rend un corps FABRIQUÉ, sans réseau — réservé aux tests (patron ㊲,
        /// `RendrePourTest`). Ne prouve jamais que le back émet ce corps, seulement ce que
        /// l'écran EN FAIT.</summary>
        public void RendrePourTest(GetMetaHorizonFeedResponseDto dto)
        {
            EnsureInitialized();
            AppliquerEtat(dto);
        }

        /// <summary>// MÉTIER ICI — TOUT le rendu métier de cet écran part d'ici. Vide à
        /// dessein : remplir depuis la maquette RATIFIÉE et le corps RÉEL mesuré, jamais depuis
        /// une supposition sur ce que l'interface TypeScript back "devrait" rendre.</summary>
        private void AppliquerEtat(GetMetaHorizonFeedResponseDto dto)
        {
            HorizonCardDto[] cartes = dto != null && dto.cards != null
                ? dto.cards : new HorizonCardDto[0];
            Cartes = cartes;

            int aPortee = 0, prises = 0, reculees = 0;
            foreach (HorizonCardDto c in cartes)
            {
                if (c == null) continue;
                if (c.view_status == "adopted") prises++;
                else if (c.predicate_regressed) reculees++;
                else if (c.affordable) aPortee++;
            }

            // ⛔⛔ LE SOUS-TITRE VENAIT DU CADRE DE DIAGNOSTIC — ㊱ B1 du r1, et la mesure est
            //    indépendante du juge : « CE QUE LE SERVEUR NE DIT PAS » rend **0 occurrence** dans
            //    `ecrans-brennar-6.html`, la maquette ratifiée. Le texte affiché au joueur
            //    n'existait NULLE PART dans le canon.
            //    ⇒ Le commentaire d'à côté disait « c'est la maquette qui l'exige » : **la chaîne
            //      qu'il prétendait exigée n'y est pas.** *Une justification écrite n'est pas une
            //      mesure, et celle-ci pointait vers un cadre d'ATELIER* — le #116, étiqueté
            //      « Sans les textes — l'écran tel qu'il s'affiche AUJOURD'HUI », c'est-à-dire de
            //      la copie de diagnostic écrite POUR NOUS. Le cadre qui porte le contenu est le
            //      #117, et ses deux textes rendent 1 occurrence chacun dans le générateur ET dans
            //      le HTML.
            //    ⇒ Et ça violait le ruling user sur le vide — « ça plafonne et ça BLOQUE, rien
            //      n'est perdu » : quatre fois « serveur », plus « panne » et « capacité ».
            //      *L'écran ne plafonnait pas, il s'excusait.*
            sousTitre.text = cartes.Length == 0 ? Lib("rien à l'horizon") : Lib("ce qui manque encore");
            MajCompteur(0, aPortee, cartes.Length, Lib("À PORTÉE"));
            MajCompteur(1, prises, -1, Lib("DÉJÀ PRISES"));
            MajCompteur(2, reculees, -1, Lib("ONT RECULÉ"));

            RendreCartes(cartes);
            // ⛔ J'AVAIS VERROUILLÉ L'ÉCHELLE SUR `cartes.Length > 0`, ET DEUX GARDES ONT EU RAISON
            //    DE ROUGIR : `ScreenC6S3_LEchelle_MarqueLeCourant_EtGriseLesFranchis` (« 4 barreaux
            //    attendus, vus : [] ») et `ScreenC6S3_CranInconnu_SeMontreTelQuel`. L'échelle doit
            //    se rendre quel que soit le nombre de cartes — elle porte `progress_to_next`, qui
            //    existe indépendamment de l'horizon.
            //    ⇒ **Et le verrou était INUTILE** : le message d'état vide est rendu dans
            //      `listeRoot`, c'est-à-dire exactement dans les 753 px qui étaient sans encre. Le
            //      vide se remplit sans qu'on ait à retirer quoi que ce soit.
            //    ⇒ *J'ai retiré un bloc pour faire de la place à un texte qui allait ailleurs.*
            // ⚠️ RESTE DÉCLARÉ, PAS FERMÉ : le titre « L'ÉCHELLE DES PALIERS » rend **0 occurrence
            //    dans TOUT l'atelier** (contrôle positif : « palier » seul y apparaît 4 244 fois,
            //    donc le motif voit ce corpus). C'est un libellé inventé, montré au joueur, et je
            //    n'ai **aucun texte ratifié pour le remplacer** — l'inventer serait refaire la
            //    faute que ce lot corrige. Dette de vocabulaire, à trancher avec la maquette.
            RendreEchelle(DerniereProgression);

            // ⛔ LE PANNEAU DIT LE TROU, il ne le masque pas — et c'est la maquette qui l'exige :
            // son cadre ratifié affiche l'écran « tel qu'il s'afficherait aujourd'hui », clés
            // techniques en titre. Le serveur ne rend que des CLÉS de traduction, et le
            // dictionnaire du jeu ne contient aujourd'hui que des messages d'erreur.
            // ★ C'est la même règle que sur ㊲ : afficher un nom inventé serait plus joli et
            //   faux. Ici le dessin lui-même a tranché en faveur du vrai.
            // ⛔ L'ÉTAT VIDE PARLE DÉSORMAIS AU JOUEUR, avec les mots du cadre #117 — repris
            //    VERBATIM de la maquette, pas reformulés. L'état NON VIDE garde son constat sur les
            //    clés de traduction : c'est un trou réel du back, il ne s'invente pas de noms.
            if (cartes.Length == 0)
                MajPanneau(Lib("pourquoi c'est vide"),
                    Lib("Les cartes viennent du monde, pas du menu"),
                    "une possibilité apparaît quand ce que vous faites remplit ses conditions. "
                    + "Rien ici ne s'achète directement.");
            else
                MajPanneau(Lib("CE QUE LE SERVEUR ENVOIE VRAIMENT"),
                    Lib("Aucune de ces cartes n'a de nom"),
                    "le serveur ne rend que des clés de traduction, et le dictionnaire du jeu ne "
                    + "contient que des messages d'erreur. Voilà l'écran tel qu'il s'afficherait "
                    + "aujourd'hui. Quelqu'un doit écrire les textes.");
        }

        /// <summary>Les cartes du flux. Chacune porte son titre (une CLÉ), son statut, son coût en
        /// jetons et ses conditions — et, si elle a reculé, son cadre rouge et sa phrase.
        ///
        /// ⚠️ Les conditions sont des PHRASES, jamais des jauges : le service back interdit
        /// explicitement de projeter un seuil ou une valeur atteinte. Dessiner « 7 sur 10 »
        /// inventerait la seule chose que le serveur refuse de dire.</summary>
        private void RendreCartes(HorizonCardDto[] cartes)
        {
            for (int i = listeRoot.childCount - 1; i >= 0; i--)
                UnityEngine.Object.Destroy(listeRoot.GetChild(i).gameObject);

            // ⛔⛔ LE MESSAGE DE L'ÉTAT VIDE — ㊱ B3/B4. Sans lui, la liste vide laissait
            //    **753 px (209 CSS) strictement sans encre**, soit 66 % de la boîte et 37 % du rect
            //    libre, pendant qu'un bloc « L'ÉCHELLE DES PALIERS » — chaîne qui rend **0
            //    occurrence dans toute la source de l'atelier** — occupait la place du message.
            //    ⇒ *Deux écrans voisins ont fourni le vocabulaire ; personne n'a vérifié qu'il
            //      appartenait à celui-ci.* Les deux phrases ci-dessous sont, elles, dans le cadre
            //      #117 : 1 occurrence chacune dans le générateur ET dans le HTML ratifié.
            if (cartes.Length == 0)
            {
                GameObject vide = NouveauUI("MessageVide", listeRoot);
                VerticalLayoutGroup pv = vide.AddComponent<VerticalLayoutGroup>();
                pv.childAlignment = TextAnchor.MiddleCenter;
                pv.spacing = Px(4f);
                pv.childControlWidth = true; pv.childControlHeight = true;
                pv.childForceExpandWidth = true; pv.childForceExpandHeight = false;
                var t1 = NouveauTexte(vide.transform, "Ligne1", Lib("Rien ne s'ouvre pour l'instant."), 11f, TexteFaible);
                t1.alignment = TMPro.TextAlignmentOptions.Center;
                var t2 = NouveauTexte(vide.transform, "Ligne2", Lib("L'horizon se remplit en jouant."), 11f, TexteFaible);
                t2.alignment = TMPro.TextAlignmentOptions.Center;
                return;
            }

            foreach (HorizonCardDto c in cartes)
            {
                if (c == null) continue;
                GameObject carte = NouveauUI("Carte_" + c.card_id, listeRoot);
                Image fond = carte.AddComponent<Image>();
                fond.color = c.predicate_regressed ? FondRecule : FondCarte;
                if (c.predicate_regressed) Contour(carte, AccentRecule);

                VerticalLayoutGroup v = carte.AddComponent<VerticalLayoutGroup>();
                v.padding = new RectOffset(PxI(12f), PxI(12f), PxI(10f), PxI(10f));
                v.spacing = Px(3f);
                v.childControlWidth = true; v.childControlHeight = true;
                v.childForceExpandWidth = true; v.childForceExpandHeight = false;

                // Le titre EST la clé : c'est ce que la maquette ratifiée montre.
                TextMeshProUGUI titre = NouveauTexte(carte.transform, "Titre",
                    c.name_i18n_key ?? c.capability_key ?? "(sans clé)", 13f, TexteFort);
                titre.fontStyle = TMPro.FontStyles.Bold;

                NouveauTexte(carte.transform, "Cle", c.capability_key ?? "", 8.5f, TexteFaible);

                foreach (HorizonPredicateDto pr in c.visible_predicates ?? new HorizonPredicateDto[0])
                {
                    if (pr == null) continue;
                    // Le préfixe porte l'information, pas seulement la couleur (a11y F2) : une
                    // condition qui a reculé se lit aussi sans distinguer les teintes.
                    string puce = c.predicate_regressed ? "×  " : "·  ";
                    NouveauTexte(carte.transform, "Pred",
                        puce + (pr.desc_i18n_key ?? pr.predicate_type ?? ""), 9.5f,
                        c.predicate_regressed ? AccentRecule : TexteFaible);
                }

                if (c.predicate_regressed)
                {
                    TextMeshProUGUI perte = NouveauTexte(carte.transform, "Perte",
                        Lib("C'était à portée. Ça s'est éloigné."), 10f, AccentRecule);
                    perte.fontStyle = TMPro.FontStyles.Bold;
                }
            }
        }

        /// <summary>L'ÉCHELLE DES PALIERS, sous les cartes — le contexte qui manquait à ㊱.
        ///
        /// ⛔ CE QUE CET ÉCRAN MONTRAIT AVANT : une carte, ou rien, sans jamais dire de QUOI cette
        /// carte était un barreau. TD-408 demandait « rendre l'écran capable d'afficher deux
        /// cartes » et les deux gestes prescrits y arrivaient — en FABRIQUANT des cartes fausses
        /// (adoptables et sans effet). L'échelle donne le contexte sans inventer d'objet : on
        /// montre les barreaux, pas des capacités qui n'existent pas.
        ///
        /// ⚠️ `progress_to_next` n'est PAS un ornement : c'est lui qui sépare « le palier suivant
        /// est hors de portée » de « il est en cours ». Il passe à `IN_PROGRESS` dès la première
        /// carte d'exception tranchée — donc cette ligne BOUGE en jeu, et c'est le seul endroit
        /// de l'écran qui le dise.
        ///
        /// ⚠️ Progression absente ⇒ AUCUNE échelle, et le reste de l'écran est intact. C'est le
        /// contrat non fatal de `Charger()` : une échelle manquante est un manque, un écran blanc
        /// est une panne.</summary>
        private void RendreEchelle(Exceptions.ProgressionDto prog)
        {
            if (prog == null) return;

            GameObject bloc = NouveauUI("Echelle", listeRoot);
            bloc.AddComponent<Image>().color = FondCarte;
            VerticalLayoutGroup v = bloc.AddComponent<VerticalLayoutGroup>();
            v.padding = new RectOffset(PxI(12f), PxI(12f), PxI(10f), PxI(10f));
            v.spacing = Px(3f);
            v.childControlWidth = true; v.childControlHeight = true;
            v.childForceExpandWidth = true; v.childForceExpandHeight = false;

            TextMeshProUGUI enseigne = NouveauTexte(bloc.transform, "TitreEchelle",
                Lib("L'ÉCHELLE DES PALIERS"), 8.5f, TexteFaible);
            enseigne.fontStyle = TMPro.FontStyles.Bold;

            foreach (int barreau in BarreauxDeLEchelle)
            {
                bool franchi  = barreau <  prog.vocabulary_tier;
                bool courant  = barreau == prog.vocabulary_tier;
                bool leSuivant = barreau == prog.next_tier;

                // ⚠️ Le préfixe porte l'information, pas seulement la teinte (a11y F2) : un
                // palier franchi doit se lire aussi sans distinguer les couleurs. C'est la même
                // règle que les puces « × » et « · » des conditions ci-dessus.
                string marque = franchi ? "✓  " : courant ? "▸  " : "·  ";

                string libelle = Lib("Palier ") + barreau;
                if (leSuivant && prog.tier_label_i18n != null
                    && !string.IsNullOrEmpty(prog.tier_label_i18n.key))
                {
                    // ⚠️ Clé PARAMÉTRÉE : paramètres passés TELS QU'ON LES REÇOIT, sous le nom
                    // que le corps porte. La fiche ② a coûté une demi-journée le même jour pour
                    // avoir supposé ces noms au lieu de les lire.
                    var p = new System.Collections.Generic.Dictionary<string, string>();
                    if (prog.tier_label_i18n.@params != null
                        && !string.IsNullOrEmpty(prog.tier_label_i18n.@params.tier))
                        p["tier"] = prog.tier_label_i18n.@params.tier;
                    if (MafiaCleanCity.I18n.I18nCatalog.Connait(prog.tier_label_i18n.key))
                        libelle = MafiaCleanCity.I18n.I18nCatalog.Traduire(prog.tier_label_i18n.key, p);
                }

                TextMeshProUGUI ligne = NouveauTexte(bloc.transform, "Barreau" + barreau,
                    marque + libelle, 9.5f, franchi ? TexteFaible : TexteFort);
                if (courant) ligne.fontStyle = TMPro.FontStyles.Bold;

                // ⛔ LA BANDE SE POSE SOUS LE PALIER COURANT, PAS SOUS LE SUIVANT — corrigé le
                // 2026-09-02 après mesure du back. Son nom (`progress_to_next`) dit le contraire
                // de ce qu'elle porte : elle décrit le palier DÉJÀ ATTEINT.
                //     if (tier >= 2)  band = UNLOCKED;   // « the meaningful one landed »
                //     else if (…)     band = IN_PROGRESS;
                //     else            band = LOCKED;
                // Au-delà du palier 1 elle vaut donc `UNLOCKED` POUR TOUJOURS, quoi qu'il arrive.
                // ★ Je l'avais posée sous le barreau suivant avec le mot « à portée » : l'écran
                //   promettait une marche proche alors que la bande ne parle pas d'elle. C'est
                //   exactement le décor que cet écran est censé démonter — et il me l'a fait
                //   écrire en une ligne.
                if (courant)
                    NouveauTexte(bloc.transform, "EtatCourant",
                        "    " + EtatDuPalierAtteint(prog.progress_to_next), 8.5f, TexteFaible);

                // ⚠️ ET SOUS LE SUIVANT, ON NE PROMET RIEN. Ce qui manque pour l'atteindre est un
                // PRÉDICAT de capacité (pour 201 : 15 exceptions traitées, mesuré 4) — et cette
                // grandeur n'est PAS projetée sur la surface joueur aujourd'hui. Dire « à portée »
                // demanderait une donnée que le back n'émet pas ; dire qu'on ne sait pas demande
                // zéro lot, et c'est la thèse de l'écran.
                if (leSuivant)
                    NouveauTexte(bloc.transform, "EtatSuivant",
                        "    " + Lib("le serveur ne dit pas ce qui manque pour y arriver"),
                        8.5f, TexteFaible);
            }
        }

        /// <summary>La bande `progress_to_next` en clair — pour le palier ATTEINT, malgré son nom.
        ///
        /// ⛔ MESURÉ dans `progression.projection.service.ts` : `UNLOCKED` dès le palier 2 et pour
        /// toujours, `IN_PROGRESS` au palier 1 dès qu'on a enseigné ou traité quelque chose,
        /// `LOCKED` au palier 1 vierge. Les libellés disent donc ce qui EST DERRIÈRE, jamais ce
        /// qui vient — c'est ce contresens qui m'a fait écrire « à portée » sous le mauvais
        /// barreau.
        /// ⚠️ Un cran INCONNU se montre TEL QUEL : un libellé inventé pour une valeur qu'on ne
        /// connaît pas ferait croire qu'on l'a comprise, et masquerait justement le cran neuf
        /// qu'il faudrait traiter.</summary>
        private static string EtatDuPalierAtteint(string bande)
        {
            switch (bande)
            {
                case "LOCKED":      return Lib("vous n'avez encore rien engagé");
                case "IN_PROGRESS": return Lib("vous avez commencé");
                case "UNLOCKED":    return Lib("ce palier est acquis");
                default:            return string.IsNullOrEmpty(bande) ? Lib("état inconnu") : bande;
            }
        }

        /// <summary>Les cartes du dernier chargement — crochet de test.</summary>
        public HorizonCardDto[] Cartes { get; private set; } = new HorizonCardDto[0];

        private Exceptions.ProgressionClient clientProgression;

        /// <summary>La progression du dernier chargement, ou `null` si la route a échoué —
        /// crochet de test. `null` est un ÉTAT normal ici, pas une anomalie : voir le contrat
        /// non fatal dans `Charger()`.</summary>
        public Exceptions.ProgressionDto DerniereProgression { get; private set; }

        /// <summary>Rend un couple FABRIQUÉ (flux + progression), sans réseau — pour éprouver
        /// l'échelle à des paliers que le compte de démo n'atteint pas.</summary>
        public void RendrePourTest(GetMetaHorizonFeedResponseDto dto, Exceptions.ProgressionDto prog)
        {
            EnsureInitialized();
            DerniereProgression = prog;
            AppliquerEtat(dto);
        }

        /// <summary>Les barreaux de l'échelle : les paliers que les 4 capacités VIVANTES exigent.
        ///
        /// ⛔ MESURÉ (TD-408) : le catalogue porte 7 entrées — 4 vivantes et 3 réservées. Les
        /// vivantes forment une échelle de vocabulaire : 201 exige le palier 2 et mène au 3, 202
        /// exige le 3 → 4, 203 le 4 → 5, 204 le 5 → 6. Les barreaux sont donc 2, 3, 4, 5.
        /// ★ Un joueur n'étant qu'à UN palier, une seule carte peut être vraie à la fois. Ce
        ///   n'est pas un défaut du prédicat, c'est LA FORME DE L'OBJET — et c'est pour ça que
        ///   TD-408 conclut qu'il ne faut RIEN changer aux 4 vivantes ni réveiller les 3
        ///   réservées (elles n'ont ni prédicat ni effet : elles seraient adoptables et sans
        ///   effet, ce qui est pire qu'un écran à une carte parce que ça a l'air de marcher).
        /// ⇒ L'écran ne fabrique donc pas une seconde carte : il montre l'ÉCHELLE dont cette
        ///   carte est un barreau. Un écran qui montre une carte parce que le système n'en a
        ///   qu'une est honnête ; c'est le CONTEXTE qui manquait, pas les cartes.</summary>
        private static readonly int[] BarreauxDeLEchelle = { 2, 3, 4, 5 };

        /// <summary>Repli NOMMÉ sur échec réseau — jamais une exception, jamais un écran noir
        /// (patron ㊲ : `Render(null)` a fait planter un autre écran de ce dépôt à la première
        /// ligne qui lisait le payload).</summary>
        private void RendreEtatIndisponible()
        {
            // ⛔ VIDER D'ABORD. Laisser les cartes du chargement précédent afficherait un
            // horizon périmé sous un message d'erreur — le joueur lirait des capacités qui ne
            // sont peut-être plus là. ㊲ a payé exactement ce défaut sur sa liste de règles.
            RendreCartes(new HorizonCardDto[0]);
            Cartes = new HorizonCardDto[0];
            // ⚠️ Le chemin d'ERREUR n'a pas de cadre ratifié — la maquette n'en dessine pas. On
            //    dit donc l'ÉTAT, pas le diagnostic : « CE QUE LE SERVEUR NE DIT PAS » était de la
            //    copie d'équipe ici aussi, et elle n'est nulle part dans le canon.
            sousTitre.text = Lib("indisponible");
            MajCompteur(0, -1, -1, "À PORTÉE");
            MajCompteur(1, -1, -1, "DÉJÀ PRISES");
            MajCompteur(2, -1, -1, "ONT RECULÉ");
            MajPanneau("L'HORIZON EST INDISPONIBLE",
                "Le serveur n'a pas répondu",
                "l'écran ne montre rien plutôt que de montrer un horizon périmé — ce qui était à "
                + "portée il y a une minute ne l'est peut-être plus.");
        }

        // ═══ Construction de la mise en page ═════════════════════════════════════════════════

        // ── les mesures de `generateur-horizon.py`, qui importe `chassis6.py`.
        // ⚠️ La largeur vient donc de LargeurEcransBrennar6 : même CHÂSSIS, donc même source, et
        // c'est la source qui fonde une constante — pas l'écran. Emprunter la constante d'un
        // voisin qui n'a pas la même source serait le défaut ; ici c'est le même fichier.
        private const float CssMargeH        = 13f;
        private const float CssEcartBloc     =  9f;
        private const float CssHautEnseigne  = 51f;   // H_FIXE['enseigne']
        private const float CssHautCompteurs = 42f;   // H_FIXE['compteurs']
        private const float CssHautPann      = 70f;   // H_FIXE['pann']
        private const float CssTitreCorps    = 17f;
        private const float CssSousTitre     = 6.4f;
        private const float CssCompteurNb    = 14f;
        private const float CssCompteurLib   = 5.4f;

        private static Color FondCarte   => DesignTokens.Current.surfaceCard;
        private static Color FondRecule   => DesignTokens.Current.surfaceCard;
        private static Color AccentRecule => HeatBucketResolver.SeverityColor(HeatBucketResolver.Severity.Severe);
        private static Color TexteFort   => DesignTokens.Current.hudCreme;
        private static Color TexteFaible => DesignTokens.Current.hudCremeSecondary;

        private RectTransform listeRoot;
        private TextMeshProUGUI sousTitre;
        private readonly TextMeshProUGUI[] compteurNb = new TextMeshProUGUI[3];
        private readonly TextMeshProUGUI[] compteurLib = new TextMeshProUGUI[3];
        private TextMeshProUGUI pannSurTitre, pannTitre, pannTexte;

        private int PxI(float css) => PxTrait(css);

        private TextMeshProUGUI NouveauTexte(Transform parent, string nom, string texte,
                                             float corpsCss, Color couleur)
        {
            GameObject go = NouveauUI(nom, parent);
            TextMeshProUGUI t = go.AddComponent<TextMeshProUGUI>();
            t.text = texte; t.color = couleur;
            t.fontSize = Px(corpsCss);
            t.font = DesignTokens.Current.primaryFont;
            t.raycastTarget = false;
            t.enableWordWrapping = true;
            return t;
        }

        /// <summary>Un contour, posé en PREMIER enfant — la convention de fratrie du dépôt : un
        /// décor ne s'empile pas avec le contenu, et il ignore le layout.</summary>
        /// <summary>Un liseré : QUATRE arêtes d'un px de trait, jamais un rectangle plein.
        ///
        /// ⛔ La version précédente posait UN enfant plein cadre couleur liseré et l'envoyait en
        /// `SetAsFirstSibling`, en croyant le glisser derrière le fond. Mesuré sur la capture de
        /// l'état vide : **82,5 % de l'écran en or plein** — les quatre blocs entièrement remplis.
        /// La cause n'est pas l'ordre des frères : `AjouterFond` pose son `Image` SUR le bloc
        /// lui-même, et un enfant est TOUJOURS rendu après le graphique de son parent. Aucun rang
        /// de fratrie ne fait passer un enfant derrière son propre parent.
        /// ★ La garde structurelle voyait un `Contour` présent, avec la bonne couleur, au bon
        ///   endroit de l'arbre — et l'écran était illisible. Une garde qui vérifie qu'un élément
        ///   EXISTE ne dit rien de ce qu'il RECOUVRE : il a fallu une image pour le voir.</summary>
        private void Contour(GameObject cible, Color couleur)
        {
            void Arete(string nom, Vector2 aMin, Vector2 aMax, Vector2 oMin, Vector2 oMax)
            {
                GameObject b = NouveauUI(nom, cible.transform);
                Image i = b.AddComponent<Image>();
                i.color = couleur; i.raycastTarget = false;
                RectTransform rt = (RectTransform)b.transform;
                rt.anchorMin = aMin; rt.anchorMax = aMax;
                rt.offsetMin = oMin; rt.offsetMax = oMax;
                b.AddComponent<LayoutElement>().ignoreLayout = true;
            }
            float e = PxTrait(1f);
            Arete("LisereHaut",   new Vector2(0f, 1f), Vector2.one,        new Vector2(0f, -e), Vector2.zero);
            Arete("LisereBas",    Vector2.zero,        new Vector2(1f, 0f), Vector2.zero,       new Vector2(0f, e));
            Arete("LisereGauche", Vector2.zero,        new Vector2(0f, 1f), Vector2.zero,       new Vector2(e, 0f));
            Arete("LisereDroite", new Vector2(1f, 0f), Vector2.one,        new Vector2(-e, 0f), Vector2.zero);
        }

        /// <summary>Un compteur. `valeur < 0` ⇒ « — » : le trou se montre, il ne se comble pas
        /// par un zéro. Un « 0 » dirait « mesuré à zéro », un tiret dit « pas de source » —
        /// distinction payée sur ㊲, où la garde a refusé un zéro déduit.</summary>
        private void MajCompteur(int i, int valeur, int total, string libelle)
        {
            if (compteurNb[i] == null) return;
            compteurNb[i].text = valeur < 0 ? "—"
                : (total >= 0 ? $"{valeur:00}<size=64%>/{total}</size>" : $"{valeur:00}");
            compteurLib[i].text = libelle;
        }

        private void MajPanneau(string surTitre, string titre, string texte)
        {
            if (pannSurTitre == null) return;
            pannSurTitre.text = surTitre; pannTitre.text = titre; pannTexte.text = texte;
        }

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

            // La racine PLEIN ÉCRAN — jamais un panneau intermédiaire : c'est elle qui sert de
            // référence d'échelle à `Px()`/`PxTrait()` (un conteneur plus étroit fausserait
            // TOUTE la mise à l'échelle par un facteur muet).
            GameObject racine = NouveauUI("HorizonRoot", root);
            racinePleinEcran = (RectTransform)racine.transform;
            Etirer(racinePleinEcran);
            AjouterFond(racine, DesignTokens.Current.surfaceBase);

            // ⛔ L'ÉCHELLE AVANT TOUTE CONVERSION. Un RectTransform qui vient d'être étiré n'a
            // pas encore son `rect` résolu, et `Px()` le lit dès la première constante. Payé sur
            // ㊲ : tout l'écran converti à la MOITIÉ de son échelle, invisible parce qu'un écran
            // deux fois trop petit ressemble à un écran sobre.
            Canvas.ForceUpdateCanvases();

            GameObject corps = NouveauUI("Corps", racine.transform);
            RectTransform crt = (RectTransform)corps.transform;
            crt.anchorMin = new Vector2(0f, 0f); crt.anchorMax = new Vector2(1f, 1f);
            // ⛔ LE CHROME MANGE SA PART, EN HAUT ET EN BAS. ㊱ est un écran PLEIN : contrairement
            // à ⑨ et ② qui sont des panneaux bas, il collisionne aux DEUX bouts. Mesuré sous
            // chrome le 2026-09-02 : son enseigne passait derrière la jauge de chaleur et sous le
            // bandeau, et son panneau bas derrière les quatre boutons du dock.
            // ⚠️ ET MES GARDES ÉTAIENT VERTES PENDANT CE TEMPS. Elles vérifiaient que les insets
            // sont PUBLIÉS (`> 0`), pas que cet écran les RESPECTE — elles mesuraient le chrome,
            // pas l'écran. Même famille que la garde qui comptait le slot au lieu de l'écran.
            // Hors shell les deux insets valent 0 et ㊱ remplit tout, comme avant.
            crt.offsetMin = new Vector2(Px(CssMargeH), Px(CssMargeH) + ShellChrome.BottomInsetPx);
            crt.offsetMax = new Vector2(-Px(CssMargeH), -(Px(CssMargeH) + ShellChrome.TopInsetPx));

            VerticalLayoutGroup pile = corps.AddComponent<VerticalLayoutGroup>();
            pile.spacing = Px(CssEcartBloc);
            pile.childControlWidth = true; pile.childControlHeight = true;
            pile.childForceExpandWidth = true; pile.childForceExpandHeight = false;

            ConstruireEnseigne(corps.transform);
            ConstruireCompteurs(corps.transform);
            ConstruireListe(corps.transform);
            ConstruirePanneau(corps.transform);
        }

        private void ConstruireEnseigne(Transform parent)
        {
            GameObject go = NouveauUI("Enseigne", parent);
            AjouterFond(go, DesignTokens.Current.surfaceCard);
            Contour(go, DesignTokens.Current.hudHairlineGold);
            AjouterLayout(go, Px(CssHautEnseigne));

            VerticalLayoutGroup v = go.AddComponent<VerticalLayoutGroup>();
            v.padding = new RectOffset(PxI(11f), PxI(11f), PxI(7f), PxI(8f));
            v.childControlWidth = true; v.childControlHeight = true;
            v.childForceExpandWidth = true; v.childForceExpandHeight = false;
            v.childAlignment = TextAnchor.MiddleCenter;

            TextMeshProUGUI titre = NouveauTexte(go.transform, "Titre", Lib("L'horizon"),
                                                 CssTitreCorps, DesignTokens.Current.accentGold);
            titre.alignment = TextAlignmentOptions.Center;
            titre.characterSpacing = 20f;
            titre.fontStyle = TMPro.FontStyles.Bold;
            titre.font = DesignTokens.Current.hudSerifFont;

            sousTitre = NouveauTexte(go.transform, "SousTitre", "", CssSousTitre, TexteFaible);
            sousTitre.alignment = TextAlignmentOptions.Center;
            sousTitre.characterSpacing = 34f;
            sousTitre.fontStyle = TMPro.FontStyles.Bold;
        }

        private void ConstruireCompteurs(Transform parent)
        {
            GameObject go = NouveauUI("Compteurs", parent);
            AjouterLayout(go, Px(CssHautCompteurs));
            HorizontalLayoutGroup h = go.AddComponent<HorizontalLayoutGroup>();
            h.spacing = Px(6f);
            h.childControlWidth = true; h.childControlHeight = true;
            h.childForceExpandWidth = true;

            for (int i = 0; i < 3; i++)
            {
                GameObject fen = NouveauUI("Fenetre" + i, go.transform);
                AjouterFond(fen, DesignTokens.Current.surfaceCard);
                Contour(fen, DesignTokens.Current.hudHairlineGold);
                // Trois tiers ÉGAUX : sans `preferredWidth = 0`, la largeur vient du CONTENU et
                // « DÉJÀ PRISES » écraserait « À PORTÉE ». Payé sur ㊲.
                LayoutElement le = fen.AddComponent<LayoutElement>();
                le.minWidth = 0f; le.preferredWidth = 0f; le.flexibleWidth = 1f;

                VerticalLayoutGroup v = fen.AddComponent<VerticalLayoutGroup>();
                v.padding = new RectOffset(0, 0, PxI(4f), PxI(3f));
                v.childControlWidth = true; v.childControlHeight = true;
                v.childForceExpandWidth = true; v.childForceExpandHeight = false;
                v.childAlignment = TextAnchor.MiddleCenter;

                compteurNb[i] = NouveauTexte(fen.transform, "Nombre", "—",
                                             CssCompteurNb, DesignTokens.Current.hudGaugeArcCold);
                compteurNb[i].alignment = TextAlignmentOptions.Center;
                compteurNb[i].fontStyle = TMPro.FontStyles.Bold;

                compteurLib[i] = NouveauTexte(fen.transform, "Libelle", "",
                                              CssCompteurLib, TexteFaible);
                compteurLib[i].alignment = TextAlignmentOptions.Center;
                compteurLib[i].characterSpacing = 16f;
                compteurLib[i].fontStyle = TMPro.FontStyles.Bold;
            }
        }

        /// <summary>La liste des cartes — le SEUL bloc élastique : c'est lui qui absorbe la
        /// hauteur restante, les autres ont la leur. (`.elast{flex:1}` du châssis.)</summary>
        private void ConstruireListe(Transform parent)
        {
            GameObject go = NouveauUI("Liste", parent);
            AjouterFond(go, DesignTokens.Current.surfaceBase);
            Contour(go, DesignTokens.Current.hudHairlineGold);
            LayoutElement le = go.AddComponent<LayoutElement>();
            le.minHeight = Px(120f); le.flexibleHeight = 1f;

            GameObject inner = NouveauUI("Cartes", go.transform);
            listeRoot = (RectTransform)inner.transform;
            Etirer(listeRoot);
            VerticalLayoutGroup v = inner.AddComponent<VerticalLayoutGroup>();
            v.padding = new RectOffset(PxI(8f), PxI(8f), PxI(8f), PxI(8f));
            v.spacing = Px(6f);
            v.childControlWidth = true; v.childControlHeight = true;
            v.childForceExpandWidth = true; v.childForceExpandHeight = false;
            v.childAlignment = TextAnchor.UpperCenter;
        }

        private void ConstruirePanneau(Transform parent)
        {
            GameObject go = NouveauUI("Panneau", parent);
            AjouterFond(go, DesignTokens.Current.surfaceCard);
            Contour(go, DesignTokens.Current.hudHairlineGold);
            AjouterLayout(go, Px(CssHautPann));

            VerticalLayoutGroup v = go.AddComponent<VerticalLayoutGroup>();
            v.padding = new RectOffset(PxI(10f), PxI(10f), PxI(8f), PxI(9f));
            v.spacing = Px(3f);
            v.childControlWidth = true; v.childControlHeight = true;
            v.childForceExpandWidth = true; v.childForceExpandHeight = false;

            pannSurTitre = NouveauTexte(go.transform, "SurTitre", "", 5.6f, TexteFaible);
            pannSurTitre.characterSpacing = 19f;
            pannSurTitre.fontStyle = TMPro.FontStyles.Bold;
            pannTitre = NouveauTexte(go.transform, "Titre", "", 13f, DesignTokens.Current.accentGold);
            pannTitre.fontStyle = TMPro.FontStyles.Bold;
            pannTitre.font = DesignTokens.Current.hudSerifFont;
            pannTexte = NouveauTexte(go.transform, "Texte", "", 8f, TexteFaible);
        }

        /// <summary>Hauteur FIXE : `min` autant que `preferred`. Un `preferredHeight` seul n'est
        /// pas une taille, c'est une préférence — le layout comprime jusqu'à un `minHeight`
        /// implicite de zéro dès qu'un voisin réclame la place. Payé deux fois sur ㊲.</summary>
        private void AjouterLayout(GameObject go, float hauteur)
        {
            LayoutElement le = go.AddComponent<LayoutElement>();
            le.minHeight = hauteur; le.preferredHeight = hauteur; le.flexibleHeight = 0f;
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

        /// <summary>Item 0.6 — un littéral STATIQUE de ㊱ passe par `horizon.bloc.<slug>`,
        /// repli sur le littéral.
        /// ⛔ N'Y PASSENT PAS : `c.capability_key` (une CLÉ SERVEUR, déjà affichée telle quelle et
        /// à dessein — c'est le propos de cet écran), ni les phrases du panneau qui varient avec
        /// le nombre de cartes, ni `view_status` / `predicate_type` (valeurs de domaine).
        /// ★ Sur cet écran, afficher une clé nue N'EST PAS un défaut : c'est ce qu'il montre
        ///   exprès — « le serveur ne rend que des clés de traduction ». La conversion ne doit
        ///   surtout pas « réparer » ça.</summary>
        private static string Lib(string litteral) =>
            MafiaCleanCity.I18n.Libelle.De("horizon", "bloc", litteral);

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

    /// <summary>screen_c6 — les correspondances « valeur du domaine → apparence », chacune en
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
    public static class HorizonResolvers
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
                    "HorizonResolvers.CouleurPour : membre de EtatDomaine non résolu.");
            }
        }
    }
}
