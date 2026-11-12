using System;
using System.Collections;
using System.Collections.Generic;
using System.Globalization;
using System.Linq;
using UnityEngine;
using UnityEngine.UI;
using MafiaCleanCity.CityMap;
using MafiaCleanCity.Theme;
using TMPro;

namespace MafiaCleanCity.Operational.Marche
{
    /// <summary>㉑ « Le marché — l'ardoise du courtier » (design `Tools/marche-ardoise/DESIGN.md` v1.1, approuvé ; maquette atelier 8f59cf9, cadres 106,
    /// 107, 108, 151). L'ardoise : 18 quartiers × 4 substances = 72 cases ; une case s'allume quand le back SERT une ligne (`GET /v1/me/market/lanes`),
    /// avec sa bande (ouï-dire · recoupé · sûr) ; une case sans ligne est un RENSEIGNEMENT (« voyant éteint »), pas un trou. Le seul geste : toucher
    /// une case, qui ouvre son pied. AUCUN prix, pourcentage ni graphe (aside de l'atelier). Les cadres 109/110 sont HORS LOT (TD-1040).
    /// Mots : 29 entrées ratifiées par f2 (`marche.*`), clé dérivée + repli COMPTÉ tant que BACK-3 ne les sert pas (TD-1017).</summary>
    public class MarcheScreenController : MonoBehaviour, MafiaCleanCity.Shell.IShellTenant
    {
        // ═══ Constantes du contrat et de la maquette ══════════════════════════════════════════════════════════════════════

        /// <summary>Le domaine fermé des substances, dans l'ORDRE des colonnes (en-tête du cadre 106 : brindle | crick | hush | ash) — recopié de
        /// `SubstanceTypeValue` (`lane-collapse-pricing.service.ts:59` @ef8be64e).</summary>
        public static readonly string[] Substances = { "brindle", "crick", "hush", "ash" };

        /// <summary>L'ORDRE DES RANGÉES du cadre 106 — ce n'est PAS l'ordre des ids (ne pas copier ⑮) : les 18 libellés du cadre appariés à
        /// `district-names.ts:21-28` (re-vérifié par la revue ⊥). Garde `MarchePlayModeTests.G2`.</summary>
        public static readonly int[] OrdreDesRangees = { 1, 2, 3, 4, 5, 6, 7, 11, 12, 8, 9, 13, 10, 14, 16, 15, 17, 18 };

        /// <summary>La bande servie → son mot (aside ratifiée de l'atelier, `ecrans-brennar-6.html:5667`) — `LaneConfidenceBucket` exactement (`:38`).</summary>
        /// Clés SERVIES par BACK-3 (`marche.confiance.*` suit le littéral FR, pas le nom de bande : l'appariement LOW ↔ oui_dire est tenu ICI).
        public static readonly IReadOnlyDictionary<string, (string cle, string repli)> BandeDeLane = new Dictionary<string, (string, string)>
        {
            { "LOW", ("marche.confiance.oui_dire", "ouï-dire") }, { "MODERATE", ("marche.confiance.recoupe", "recoupé") }, { "HIGH", ("marche.confiance.sur", "sûr") },
        };

        /// <summary>Le mot d'une bande servie ; hors domaine ⇒ le repli de famille « état inconnu », jamais la valeur brute.</summary>
        public static string MotDeBande(string bucket) =>
            bucket != null && BandeDeLane.TryGetValue(bucket, out var m) ? MafiaCleanCity.I18n.Libelle.Gabarit(m.cle, m.repli) : MafiaCleanCity.I18n.Repli.Etat(bucket);

        /// <summary>⏳ TD-1018 (ruling f2 11/11, (A)) : la colonne `ash` ne s'allume par AUCUN chemin joueur (TD-966, à inscrire par
        /// `lot/marche-ardoise-enumerateur`) — elle est présente, éteinte et NOMMÉE : son pied est « HORS DU TABLEAU ». Ne jamais « corriger » son
        /// absence de lignes par une donnée fabriquée.</summary>
        public const string SubstanceHorsDuTableau = "ash";

        // ═══ Crochets de test ═══════════════════════════════════════════════════════════════════════════════════════════

        public enum Etat { Chargement, Erreur, Nue, Partielle, Pleine }
        public Etat EtatRendu { get; private set; } = Etat.Chargement;
        public LaneConfidenceRowDto[] Lanes { get; private set; }
        public List<DistrictDto> Districts { get; private set; }
        public string DerniereErreur { get; private set; }
        public int RendusEffectues { get; private set; }
        public int CasesRendues { get; private set; }
        public int CasesAllumees { get; private set; }
        /// <summary>⛔ DÉTECTEUR TD-1018 : combien de lignes `ash` le back a servies (attendu : 0, TD-966). La case reste éteinte (ruling A) ; une ligne
        /// servie est COMPTÉE et journalisée, jamais montrée sous un pied qui dit « HORS DU TABLEAU ».</summary>
        public int LignesAshServies { get; private set; }
        /// <summary>Les compteurs du cadre 106, DÉRIVÉS par le client (rien n'est servi, TD-1019) — `-1` avant le premier rendu.</summary>
        public int LignesConnues { get; private set; } = -1;
        public int LignesSures { get; private set; } = -1;
        public int QuartiersNoirs { get; private set; } = -1;
        public int Denominateur => NombreDeQuartiers() * Substances.Length;
        public string TitreDuPied => piedTitre != null && piedTitre.gameObject.activeInHierarchy ? piedTitre.text : "";
        public string PhraseDuPied => piedPhrase != null && piedPhrase.gameObject.activeInHierarchy ? piedPhrase.text : "";
        public string TexteDeLEtat => etatTexte != null && etatTexte.gameObject.activeInHierarchy ? etatTexte.text : "";
        public string PhraseDuBas => basTexte != null && basTexte.gameObject.activeInHierarchy ? basTexte.text : "";
        /// <summary>⛔ Réservé aux tests hors réseau : le client des lignes, pour lui poser `MarcheClient.ReponsePourTest`.</summary>
        public MarcheClient ClientPourTest { get { Init(); return client; } }
        /// <summary>⛔ Réservé aux tests : les quartiers servis à la place de `world/districts` (null ⇒ la vraie route).</summary>
        public List<DistrictDto> DistrictsPourTest;

        // ═══ État interne ═══════════════════════════════════════════════════════════════════════════════════════════════

        private const float K = 1280f / 300f;
        private static float Px(float css) => css * K;
        private MarcheClient client;
        private WorldApiClient monde;
        private string token;
        private bool initialise;
        private Transform mountParent;
        private RectTransform racine, grille, pied;
        private TextMeshProUGUI compteConnues, compteSures, compteNoirs, basTexte, etatTexte, piedTitre, piedPhrase, piedLegende;

        private static Color Fond => DesignTokens.Current.surfaceBase;
        private static Color FondCase => DesignTokens.Current.surfaceRow;
        private static Color Encre => DesignTokens.Current.onSurfacePrimary;
        private static Color EncreFaible => DesignTokens.Current.onSurfaceMuted;
        private static Color Or => DesignTokens.Current.accentGold;
        private static Color Creme => DesignTokens.Current.hudCreme;

        // TD-1017 BASCULÉE (11/11) : chaque mot de ㉑ est lu par sa clé SERVIE `marche.*` (BACK-3, `lot/marche-mots` @163402f1, noms figés après sa
        // revue ⊥ ; recopiés de `string_table.ts` à ce SHA, V15) ; le repli est la valeur FR servie, à l'octet. Appel DIRECT à `Libelle.Gabarit`, sans aide
        // intermédiaire (décision f2, 11/11) : le cliquet des chaînes joueur voit ainsi chaque repli. Tant que ce lot n'est pas sur la pile, les clés sont
        // NON servies : elles sont dans la DetteDatee de `ZeroRepliDesLocatairesPlayModeTests`.

        private void Awake() => Init();

        private void Init()
        {
            if (initialise) return;
            initialise = true;
            client = new MarcheClient();
            monde = new WorldApiClient();
            Construire();
        }

        /// <summary>Le shell parente l'hôte sous son ContentSlot AVANT `AddComponent` (`AppShell.ConstruireLocataire`) : à l'`Awake`, la mise en page est
        /// bâtie sous l'hôte, déjà dans le slot. Un parent DIFFÉRENT reçu ensuite REPARENTE la racine (patron ⑯) — jamais une UI laissée ailleurs.</summary>
        public void SetMountParent(Transform parent)
        {
            mountParent = parent;
            Init();
            if (parent != null && racine != null && racine.parent != parent) { racine.SetParent(parent, false); Etirer(racine); }
        }

        public void SetToken(string bearer)
        {
            Init();
            token = bearer;
            if (!string.IsNullOrEmpty(bearer) && isActiveAndEnabled) StartCoroutine(Charger());
        }

        /// <summary>Le chargement : les quartiers (route publique) puis les lignes, puis UN rendu.</summary>
        public IEnumerator Charger()
        {
            Init();
            EtatRendu = Etat.Chargement;
            DerniereErreur = null;
            RendreLEtat(MafiaCleanCity.I18n.Libelle.Gabarit("marche.etat.chargement", "On interroge le tableau…"));
            if (DistrictsPourTest != null) Districts = DistrictsPourTest;
            else yield return monde.GetDistricts(d => Districts = d, e => DerniereErreur = e);
            LaneConfidenceRowDto[] lues = null;
            yield return client.GetLanes(token, l => lues = l, (c, m) => DerniereErreur = $"{c}: {m}");
            if (this == null) yield break;
            Lanes = lues;
            Rendre();
        }

        // ═══ Calculs purs ═══════════════════════════════════════════════════════════════════════════════════════════════

        /// <summary>Le nombre de quartiers SERVIS par `world/districts` (le dénominateur est calculé, jamais une constante en dur — D2) ; 18 sans réponse.</summary>
        private int NombreDeQuartiers() => Districts != null && Districts.Count > 0 ? Districts.Count : OrdreDesRangees.Length;

        /// <summary>Les trois compteurs du cadre 106, COMPTÉS sur les lignes servies (TD-1019 : comptes du client, pas valeurs servies).</summary>
        public static (int connues, int sures, int noirs) Compter(LaneConfidenceRowDto[] lanes, int quartiers)
        {
            if (lanes == null) return (0, 0, quartiers);
            int connues = lanes.Length;
            int sures = lanes.Count(l => l != null && l.lane_confidence_bucket == "HIGH");
            int touches = lanes.Where(l => l != null).Select(l => l.district_id).Distinct().Count();
            return (connues, sures, Math.Max(0, quartiers - touches));
        }

        private string NomDuQuartier(int id)
        {
            DistrictDto d = Districts?.FirstOrDefault(x => x != null && x.id == id);
            return d != null && !string.IsNullOrEmpty(d.name) ? d.name : "—";
        }

        private LaneConfidenceRowDto Ligne(int quartier, string substance) =>
            Lanes?.FirstOrDefault(l => l != null && l.district_id == quartier && l.substance_type == substance);

        private static string Origine(string substance)
        {
            switch (substance)
            {
                case "brindle": return MafiaCleanCity.I18n.Libelle.Gabarit("marche.origine.herbe_des_friches", "herbe des friches");
                case "crick": return MafiaCleanCity.I18n.Libelle.Gabarit("marche.origine.extrait_de_racine", "extrait de racine");
                case "hush": return MafiaCleanCity.I18n.Libelle.Gabarit("marche.origine.resine_de_lull", "résine de lull");
                case "ash": return MafiaCleanCity.I18n.Libelle.Gabarit("marche.origine.lys_de_verre", "lys de verre");
                default: return "—";
            }
        }

        private static string Forme(string substance)
        {
            switch (substance)
            {
                case "brindle": return MafiaCleanCity.I18n.Libelle.Gabarit("marche.forme.briques", "briques");
                case "crick": return MafiaCleanCity.I18n.Libelle.Gabarit("marche.forme.cristaux", "cristaux");
                case "hush": return MafiaCleanCity.I18n.Libelle.Gabarit("marche.forme.plaque", "plaque");
                case "ash": return MafiaCleanCity.I18n.Libelle.Gabarit("marche.forme.prismes", "prismes");
                default: return "—";
            }
        }

        /// <summary>Le pied d'une case : (titre, phrase). `ash` : « HORS DU TABLEAU » (ruling A) ; sans ligne : « voyant éteint » (cadre 108) ;
        /// sinon le mot de la bande SERVIE et sa phrase.</summary>
        public (string titre, string phrase) PiedDe(int quartier, string substance)
        {
            string nom = NomDuQuartier(quartier).ToUpper(CultureInfo.GetCultureInfo("fr-FR"));
            if (substance == SubstanceHorsDuTableau)
                return (nom + " · " + MafiaCleanCity.I18n.Libelle.Gabarit("marche.titre.hors_du_tableau", "HORS DU TABLEAU"),
                        MafiaCleanCity.I18n.Libelle.Gabarit("marche.phrase.case_ash", "la poudre grise ne se vend pas à un dealer : elle se place, au rendez-vous, chez ceux du Verre."));
            LaneConfidenceRowDto l = Ligne(quartier, substance);
            if (l == null)
                return (nom + " · " + MafiaCleanCity.I18n.Libelle.Gabarit("marche.titre.voyant_eteint", "voyant éteint").ToUpper(CultureInfo.GetCultureInfo("fr-FR")),
                        MafiaCleanCity.I18n.Libelle.Gabarit("marche.phrase.case_sans_ligne", "aucun des nôtres n’a jamais rien écoulé là-bas. Ce n’est pas une ligne à zéro : c’est une ligne jamais ouverte. Elle s’allumera le jour où un de vos dealers y traitera."));
            string mot = MotDeBande(l.lane_confidence_bucket);
            string phrase;
            switch (l.lane_confidence_bucket)
            {
                case "LOW": phrase = MafiaCleanCity.I18n.Libelle.Gabarit("marche.phrase.bande_low", "une seule source, jamais recoupée — un bruit de comptoir. On ne vous dira pas le prix : seulement qu’on en parle."); break;
                case "MODERATE": phrase = MafiaCleanCity.I18n.Libelle.Gabarit("marche.phrase.bande_moderate", "deux sources concordantes — ni une rumeur, ni une certitude. On ne vous dira pas le prix, ni ce qui s’écoule : seulement à quel point on peut s’y fier."); break;
                case "HIGH": phrase = MafiaCleanCity.I18n.Libelle.Gabarit("marche.phrase.bande_high", "plusieurs des nôtres y ont traité, les sources se tiennent. On ne vous dira toujours pas le prix : seulement que la ligne tient."); break;
                default: phrase = "—"; break;
            }
            return (nom + " · " + mot.ToUpper(CultureInfo.GetCultureInfo("fr-FR")), phrase);
        }

        /// <summary>La phrase du bas, À TROU (ICU, ratifiée f2) : `n` et `total` en ENTIERS de chaîne (patron `ApresGesteHl.Parametres` : le résolveur
        /// rend l'accolade brute d'un `plural` dont le paramètre n'est pas un entier).</summary>
        public static string PhraseDuBasPour(int n, int total) =>
            MafiaCleanCity.I18n.Libelle.Gabarit("marche.phrase.bilan_lignes",
                "{n, plural, =0 {Aucune ligne sur {total} : personne des nôtres n’a encore traité nulle part.} one {Une ligne sur {total}. Le reste, personne des nôtres n’y a jamais traité.} other {# lignes sur {total}. Le reste, personne des nôtres n’y a jamais traité.}}",
                new Dictionary<string, string> { { "n", n.ToString(CultureInfo.InvariantCulture) }, { "total", total.ToString(CultureInfo.InvariantCulture) } });

        // ═══ Rendu ══════════════════════════════════════════════════════════════════════════════════════════════════════

        private void RendreLEtat(string texte)
        {
            etatTexte.gameObject.SetActive(true);
            etatTexte.text = texte;
        }

        private void Rendre()
        {
            for (int i = grille.childCount - 1; i >= 0; i--) Destroy(grille.GetChild(i).gameObject);
            CasesRendues = 0; CasesAllumees = 0;
            pied.gameObject.SetActive(false);
            // une panne des QUARTIERS est une erreur aussi : sans leurs noms, aucune rangée n'est identifiable (revue ⊥ du code)
            if (Lanes == null || Districts == null || Districts.Count == 0)
            {
                EtatRendu = Etat.Erreur;
                RendreLEtat(client.DernierePhraseDeRefus ?? MafiaCleanCity.I18n.Libelle.Gabarit("marche.etat.echec", "Le tableau ne répond pas."));
                basTexte.gameObject.SetActive(false);
                LignesConnues = LignesSures = QuartiersNoirs = -1;
                compteConnues.text = compteSures.text = compteNoirs.text = "—";
                RendusEffectues++;
                return;
            }
            etatTexte.gameObject.SetActive(false);
            int quartiers = NombreDeQuartiers();
            (LignesConnues, LignesSures, QuartiersNoirs) = Compter(Lanes, quartiers);
            LignesAshServies = Lanes.Count(l => l != null && l.substance_type == SubstanceHorsDuTableau);
            if (LignesAshServies > 0) Debug.LogWarning($"[Marché] {LignesAshServies} ligne(s) `ash` servie(s) : la colonne reste éteinte (ruling A) — TD-1018/TD-966 à ré-instruire");
            EtatRendu = LignesConnues == 0 ? Etat.Nue : LignesConnues >= Denominateur ? Etat.Pleine : Etat.Partielle;
            compteConnues.text = LignesConnues.ToString("00", CultureInfo.InvariantCulture) + " /" + Denominateur.ToString(CultureInfo.InvariantCulture);
            compteSures.text = LignesSures.ToString("00", CultureInfo.InvariantCulture);
            compteNoirs.text = QuartiersNoirs.ToString("00", CultureInfo.InvariantCulture);

            foreach (int id in OrdreDesRangees)
            {
                GameObject r = Rangee(grille, "R_" + id);
                TextMeshProUGUI nom = Texte(r.transform, "Nom", NomDuQuartier(id), Px(7f), Encre, TextAlignmentOptions.Left);
                Largeur(nom.gameObject, 0f, 1.6f);
                foreach (string s in Substances) Case(r.transform, id, s);
            }
            basTexte.gameObject.SetActive(true);
            basTexte.text = PhraseDuBasPour(LignesConnues, Denominateur);
            RendusEffectues++;
        }

        private void Case(Transform rangee, int quartier, string substance)
        {
            LaneConfidenceRowDto l = substance == SubstanceHorsDuTableau ? null : Ligne(quartier, substance);   // ash : éteinte, toujours (TD-1018)
            bool allumee = l != null;
            GameObject c = new GameObject("C_" + substance, typeof(RectTransform), typeof(CanvasRenderer));
            c.transform.SetParent(rangee, false);
            Image fond = c.AddComponent<Image>();
            fond.color = allumee ? Creme : FondCase;
            Largeur(c, 0f, 1f);
            Button b = MafiaCleanCity.Shell.Retour.NouveauBouton(c, fond);
            b.targetGraphic = fond;
            int q = quartier; string s = substance;
            b.onClick.AddListener(() => Toucher(q, s));
            string mot = allumee ? MotDeBande(l.lane_confidence_bucket) : "·";
            TextMeshProUGUI t = Texte(c.transform, "Mot", mot, Px(6.5f), allumee ? Fond : EncreFaible, TextAlignmentOptions.Center);
            Etirer((RectTransform)t.transform);
            CasesRendues++;
            if (allumee) CasesAllumees++;
        }

        /// <summary>Le geste de l'écran : toucher une case ouvre son pied (cadres 107/108/151).</summary>
        public void Toucher(int quartier, string substance)
        {
            (string titre, string phrase) = PiedDe(quartier, substance);
            pied.gameObject.SetActive(true);
            piedTitre.text = titre;
            piedPhrase.text = phrase;
            piedLegende.text = MafiaCleanCity.I18n.Libelle.Gabarit("marche.substance." + substance, substance) + " · " + Origine(substance);
        }

        // ═══ Construction ═══════════════════════════════════════════════════════════════════════════════════════════════

        private void Construire()
        {
            Canvas canvas = MafiaCleanCity.Shell.CanvasRacine.Resoudre(transform, mountParent);
            Transform hote = mountParent != null ? mountParent : transform.GetComponentInParent<Canvas>() != null ? transform : canvas.transform;
            GameObject r = new GameObject("MarcheRoot", typeof(RectTransform), typeof(CanvasRenderer));
            r.transform.SetParent(hote, false);
            racine = (RectTransform)r.transform;
            Etirer(racine);
            Image fi = r.AddComponent<Image>(); fi.color = Fond; fi.raycastTarget = true;
            var v = r.AddComponent<VerticalLayoutGroup>();
            v.padding = new RectOffset((int)Px(10f), (int)Px(10f), (int)(MafiaCleanCity.Shell.ShellChrome.TopInsetPx + Px(8f)), (int)(MafiaCleanCity.Shell.ShellChrome.BottomInsetPx + Px(8f)));
            v.spacing = Px(4f);
            v.childControlWidth = true; v.childControlHeight = true; v.childForceExpandWidth = true; v.childForceExpandHeight = false;

            // l'enseigne (cadre 106)
            TextMeshProUGUI enseigne = Texte(racine, "Enseigne", MafiaCleanCity.I18n.Libelle.Gabarit("marche.titre.le_marche", "LE MARCHÉ"), Px(13f), Or, TextAlignmentOptions.Center, DesignTokens.Current.hudSerifFont);
            enseigne.characterSpacing = 18f;
            Texte(racine, "SousEnseigne", MafiaCleanCity.I18n.Libelle.Gabarit("marche.sous_titre.tableau_du_verge_d_or", "tableau du Verge d’Or"), Px(8f), Creme, TextAlignmentOptions.Center);

            // les trois compteurs (cadre 106) — DÉRIVÉS (TD-1019)
            GameObject compteurs = Rangee(racine, "Compteurs");
            compteConnues = Compteur(compteurs.transform, "LignesConnues", MafiaCleanCity.I18n.Libelle.Gabarit("marche.compteur.lignes_connues", "lignes connues"));
            compteSures = Compteur(compteurs.transform, "Sures", MafiaCleanCity.I18n.Libelle.Gabarit("marche.compteur.sures", "sûres"));
            compteNoirs = Compteur(compteurs.transform, "QuartiersNoirs", MafiaCleanCity.I18n.Libelle.Gabarit("marche.compteur.quartiers_noirs", "quartiers noirs"));

            // l'en-tête de la grille : quartier | brindle | crick | hush | ash, chaque substance avec sa forme
            GameObject entete = Rangee(racine, "EnTete");
            TextMeshProUGUI q = Texte(entete.transform, "Quartier", MafiaCleanCity.I18n.Libelle.Gabarit("marche.colonne.quartier", "quartier"), Px(6.5f), EncreFaible, TextAlignmentOptions.Left);
            Largeur(q.gameObject, 0f, 1.6f);
            foreach (string s in Substances)
            {
                TextMeshProUGUI h = Texte(entete.transform, "H_" + s, MafiaCleanCity.I18n.Libelle.Gabarit("marche.substance." + s, s) + "\n" + Forme(s), Px(6.5f), EncreFaible, TextAlignmentOptions.Center);
                h.textWrappingMode = TextWrappingModes.Normal;
                Largeur(h.gameObject, 0f, 1f);
            }

            // la grille : 18 rangées défilantes (un masque ⇒ tout Graphic dessous est un MaskableGraphic)
            GameObject vue = new GameObject("Ardoise", typeof(RectTransform), typeof(CanvasRenderer));
            vue.transform.SetParent(racine, false);
            vue.AddComponent<RectMask2D>();
            var leVue = vue.AddComponent<LayoutElement>(); leVue.flexibleHeight = 1f; leVue.minHeight = Px(60f);
            ScrollRect sr = vue.AddComponent<ScrollRect>();
            sr.horizontal = false; sr.vertical = true; sr.movementType = ScrollRect.MovementType.Clamped;
            GameObject contenu = new GameObject("Grille", typeof(RectTransform));
            contenu.transform.SetParent(vue.transform, false);
            grille = (RectTransform)contenu.transform;
            grille.anchorMin = new Vector2(0f, 1f); grille.anchorMax = new Vector2(1f, 1f); grille.pivot = new Vector2(0.5f, 1f);
            grille.offsetMin = Vector2.zero; grille.offsetMax = Vector2.zero;
            var vg = contenu.AddComponent<VerticalLayoutGroup>();
            vg.spacing = Px(1.5f); vg.childControlWidth = true; vg.childControlHeight = true; vg.childForceExpandWidth = true; vg.childForceExpandHeight = false;
            contenu.AddComponent<ContentSizeFitter>().verticalFit = ContentSizeFitter.FitMode.PreferredSize;
            sr.content = grille; sr.viewport = (RectTransform)vue.transform;

            // la phrase du bas (ICU), l'état (chargement / erreur), le pied d'une case touchée
            basTexte = Texte(racine, "PhraseDuBas", "", Px(7f), Creme, TextAlignmentOptions.Center);
            basTexte.textWrappingMode = TextWrappingModes.Normal;
            basTexte.gameObject.SetActive(false);
            etatTexte = Texte(racine, "Etat", "", Px(8f), Creme, TextAlignmentOptions.Center);
            etatTexte.textWrappingMode = TextWrappingModes.Normal;
            GameObject p = new GameObject("Pied", typeof(RectTransform), typeof(CanvasRenderer));
            p.transform.SetParent(racine, false);
            pied = (RectTransform)p.transform;
            p.AddComponent<Image>().color = DesignTokens.Current.surfaceCard;
            var vp = p.AddComponent<VerticalLayoutGroup>();
            vp.padding = new RectOffset((int)Px(8f), (int)Px(8f), (int)Px(6f), (int)Px(6f)); vp.spacing = Px(2f);
            vp.childControlWidth = true; vp.childControlHeight = true; vp.childForceExpandWidth = true; vp.childForceExpandHeight = false;
            piedTitre = Texte(pied, "Titre", "", Px(8f), Or, TextAlignmentOptions.Left, DesignTokens.Current.hudSerifFont);
            piedPhrase = Texte(pied, "Phrase", "", Px(7f), Creme, TextAlignmentOptions.Left);
            piedPhrase.textWrappingMode = TextWrappingModes.Normal;
            piedLegende = Texte(pied, "Legende", "", Px(6.5f), EncreFaible, TextAlignmentOptions.Left);
            p.SetActive(false);
        }

        private TextMeshProUGUI Compteur(Transform parent, string nom, string libelle)
        {
            GameObject b = new GameObject(nom, typeof(RectTransform));
            b.transform.SetParent(parent, false);
            var v = b.AddComponent<VerticalLayoutGroup>();
            v.childControlWidth = true; v.childControlHeight = true; v.childForceExpandWidth = true; v.childForceExpandHeight = false;
            Largeur(b, 0f, 1f);
            TextMeshProUGUI chiffre = Texte(b.transform, "Chiffre", "—", Px(11f), Or, TextAlignmentOptions.Center, DesignTokens.Current.hudSerifFont);
            Texte(b.transform, "Libelle", libelle, Px(6f), EncreFaible, TextAlignmentOptions.Center);
            return chiffre;
        }

        private static GameObject Rangee(Transform parent, string nom)
        {
            GameObject g = new GameObject(nom, typeof(RectTransform));
            g.transform.SetParent(parent, false);
            var h = g.AddComponent<HorizontalLayoutGroup>();
            h.spacing = Px(1.5f); h.childControlWidth = true; h.childControlHeight = true; h.childForceExpandWidth = false; h.childForceExpandHeight = true;
            g.AddComponent<LayoutElement>().minHeight = Px(11f);
            return g;
        }

        private static void Largeur(GameObject g, float preferee, float flexible)
        {
            LayoutElement le = g.GetComponent<LayoutElement>() ?? g.AddComponent<LayoutElement>();
            le.preferredWidth = preferee; le.flexibleWidth = flexible;
        }

        private static void Etirer(RectTransform rt)
        {
            rt.anchorMin = Vector2.zero; rt.anchorMax = Vector2.one; rt.offsetMin = Vector2.zero; rt.offsetMax = Vector2.zero;
        }

        private static TextMeshProUGUI Texte(Transform parent, string nom, string valeur, float taille, Color couleur, TextAlignmentOptions alignement, TMP_FontAsset police = null)
        {
            GameObject g = new GameObject(nom, typeof(RectTransform), typeof(CanvasRenderer));
            g.transform.SetParent(parent, false);
            TextMeshProUGUI t = g.AddComponent<TextMeshProUGUI>();
            t.font = police != null ? police : DesignTokens.Current.primaryFont;
            t.text = valeur; t.fontSize = taille; t.color = couleur; t.alignment = alignement;
            t.textWrappingMode = TextWrappingModes.NoWrap; t.overflowMode = TextOverflowModes.Ellipsis; t.raycastTarget = false;
            return t;
        }
    }
}
