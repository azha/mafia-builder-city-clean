using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.UI;
using MafiaCleanCity.Shell;
using MafiaCleanCity.Theme;
using TMPro;

namespace MafiaCleanCity.CitySim.Inspection
{
    // ⑮ LE REGISTRE DE DISPATCH — les 18 files de la police, le régime de chaque répartiteur,
    // l'origine de ce qui les remplit, et le dépôt d'un signalement avec son retour de bâton.
    //
    // MATIÈRE — les 2 routes joueur d'`inspection.controller.ts` (sous `JwtAuthGuard`), la route
    // publique `world/districts` pour les noms, et `me/buildings` pour la cible du dépôt.
    //
    // ⛔ CE QUI DÉCIDE DE L'ÉCRAN : LE BACK NE SERT QUE DES BANDES, JAMAIS DES COMPTES, ET C'EST
    // ÉCRIT DANS SES PROPRES COMMENTAIRES — « the qualitative queue-load band (the only load
    // signal — never the exact length / cap ratio) », « the distribution SHAPE, never raw counts
    // (Inv 4) ». La colonne « N » de la maquette #32 (un compte brut 0..4 par district) n'a donc
    // aucune source, et le juge l'a classée D7 (conflit de canon) : elle n'est PAS dessinée. On
    // dessine des FORMES — un mot pour la charge, un mot pour le régime, des barres de présence
    // pour les origines — jamais un nombre.
    //
    // ★ D2 (fermé le 2026-09-22) — « 18 DISTRICTS · TOUT OU RIEN : LA POLICE OUVRE SES FILES
    // PARTOUT À LA FOIS » (maquette #32, ratifiée). Le back est scopé district et aucune route ne
    // rend les 18 en une réponse (lot L2 côté back) : cet écran fait donc 18 appels, un par
    // district, puis rend le registre entier. Avant : un `districtId = 1` en dur choisissait la
    // donnée montrée et 17 districts sur 18 étaient inatteignables. Les noms viennent de
    // `world/districts` (D1 : servis deux fois, jamais lus), pas du slug `district-1` (D5).
    //
    // ★ « TOUT OU RIEN » EST UN FAIT DU BACK, PAS UNE POLITIQUE D'ÉCRAN : les 18 lignes de
    // `inspection_queues` naissent d'un même tick de dispatch (`listQueues` : « All 18 districts'
    // queue state »). 0 file ouverte ⇒ l'état vide (S12-d, la police n'a pas encore ouvert) ;
    // ≥ 1 ⇒ le registre, où une ligne sans file (404 isolé) se montre éteinte plutôt qu'absente.
    //
    // ★ D3 (fermé le 2026-09-22) — le dépôt (#33 « LE COUP FOURRÉ — on leur donne un os à
    // ronger ») : un FAUX signalement (`FALSE_REPORT`) sur un bâtiment POSSÉDÉ (l'uuid que la route
    // accepte, `inspection.controller.ts:154-160`), pris dans `me/buildings`. Le prix n'est pas une
    // donnée d'avant : il est LU dans la réponse (`cost_resolved`, 50 mesuré) et affiché après.
    // ★★ S12-b — LE RETOUR DE BÂTON N'EST PAS UNE ROUTE, c'est `backlash_triggered` dans la
    // réponse au dépôt. Visible QU'À CET INSTANT : aucune route ne permet de le relire. Le rater,
    // c'est le perdre — l'écran le fige donc jusqu'au prochain geste.
    //
    // ⚠️ La gravité (`severity_distribution`, 4 bandes) est servie et n'est PAS dans le cadre #32 :
    // le juge l'a laissée en « arbitrage produit ». Elle n'est pas rendue ici — quand le produit
    // tranche, elle entre comme une colonne de plus, pas comme un écran de plus.
    //
    // Les mots sont ceux des cadres #32/#33/#34, repris tels quels ; les trois textes d'état hors
    // cadre (le registre pas encore ouvert, « aucun bâtiment à vous », le signalement non pris) sont
    // RATIFIÉS par l'atelier le 22/09 — ratification corrigée par le pied du cadre 32 lui-même :
    // « 18 DISTRICTS · TOUT OU RIEN : LA POLICE OUVRE SES FILES PARTOUT À LA FOIS » — « files » et
    // « 18 districts » sont les mots de la maquette.
    public class InspectionScreenController : MonoBehaviour, IShellTenant
    {
        [Header("Backend")]
        private string baseUrlPose;   // posée par un appelant (tests, shell) ; sinon la source unique
        private string baseUrl { get => baseUrlPose ?? MafiaCleanCity.AdresseDuBack.Url; set => baseUrlPose = value; }
        /// <summary>Le domaine de la route (`isValidDistrict` : 1..18) — et le cardinal du pied.</summary>
        public const int NombreDeDistricts = 18;

        public DistrictNomDto[] Districts { get; private set; }     // `world/districts`, tels que servis
        public FileData[] Files { get; private set; }              // index = id − 1 ; null = pas de file (404)
        public int FilesOuvertes { get; private set; }             // combien de districts ont répondu 200
        public int LignesRendues { get; private set; }             // les lignes du registre effectivement dessinées
        public BatimentPossedeDto Cible { get; private set; }      // le bâtiment que le dépôt vise (#33 « SUR »)
        public RapportData DernierRapport { get; private set; }
        public bool EtatVide { get; private set; }
        public int RendusEffectues { get; private set; }
        public string DerniereErreur { get; private set; }
        public string DerniereErreurDepot { get; private set; }
        public bool PeutDeposer => Cible != null && !string.IsNullOrEmpty(token) && !depotEnCours;
        public string TexteDuPrix => prixTexte != null && prixTexte.gameObject.activeSelf ? prixTexte.text : "";
        public string TexteDuBaton => batonTexte != null && batonTexte.gameObject.activeSelf ? batonTexte.text : "";

        private const float K = 1280f / 300f;
        private static float Px(float cssPx) => cssPx * K;

        private static Color Creme => DesignTokens.Current.hudCreme;
        private static Color Creme2 => DesignTokens.Current.hudCremeSecondary;
        private static Color Or => DesignTokens.Current.hudMoneyUnderlineGold;
        private static Color Braise => DesignTokens.Current.hudGaugeArcHot;
        private static readonly Color Eteint = new Color(1f, 1f, 1f, 0.18f);

        // A1 (juge groupé du 07/10, f2) : le REGISTRE DE DISPATCH de la maquette (cadre 32) — un PAPIER de listing (233,230,216 en médiane), l'encre sombre, le zébrage vert pâle (207,224,205), deux filets épais,
        // deux rails de perforations. Aucune encre claire sur ce papier : les couleurs du registre sont ICI, une fois.
        private static Color Papier => new Color32(0xe9, 0xe6, 0xd8, 255);
        private static Color EncreDuRegistre => new Color32(0x2b, 0x2a, 0x26, 255);
        private static Color EncreFaibleDuRegistre => new Color32(0x6b, 0x69, 0x5e, 255);
        private static Color ZebrageDuRegistre => new Color32(0xcf, 0xe0, 0xcd, 255);
        private static Color RougeDuRegistre => new Color32(0x93, 0x40, 0x2c, 255);

        private static Color Hex(string h)
        {
            ColorUtility.TryParseHtmlString(h, out Color c);
            return c;
        }

        private InspectionClient client;
        private MesBatimentsClient batiments;
        private string token;
        private bool initialise;
        private bool depotEnCours;
        private Transform mountParent;
        private RectTransform corps;
        private TextMeshProUGUI sousTitre;
        private TextMeshProUGUI piedTexte;
        private TextMeshProUGUI cibleTexte;
        private TextMeshProUGUI prixTexte;
        private TextMeshProUGUI batonTexte;
        private TextMeshProUGUI videTexte;
        private Button deposerBouton;
        private UnityEngine.UI.Image videIllustration;

        private void Awake() => Init();

        private void Init()
        {
            if (initialise) return;
            initialise = true;
            client = new InspectionClient { BaseUrl = baseUrl };
            batiments = new MesBatimentsClient { BaseUrl = baseUrl };
            Construire();
        }

        public void SetMountParent(Transform parent)
        {
            mountParent = parent;
            Init();
            RectTransform rt = (RectTransform)transform;
            rt.anchorMin = Vector2.zero;
            rt.anchorMax = Vector2.one;
            rt.offsetMin = Vector2.zero;
            rt.offsetMax = Vector2.zero;
            transform.SetAsLastSibling();
        }

        private void Start()
        {
            if (transform.parent != null) transform.SetAsLastSibling();
        }

        public void SetToken(string bearer)
        {
            Init();
            token = bearer;
            if (!string.IsNullOrEmpty(bearer)) StartCoroutine(Charger(bearer));
        }

        // ═══ CHARGEMENT — 1 + 18 + 1 appels, puis UN rendu ═══════════════════════════════════════

        private IEnumerator Charger(string bearer)
        {
            DerniereErreur = null;
            yield return client.LireDistricts(bearer, d => Districts = d,
                                              (c, m) => DerniereErreur = $"{c}: {m}");
            yield return LireLesFiles(bearer);
            yield return batiments.Lire(bearer, bs => Cible = ChoisirCible(bs),
                                        (c, m) => DerniereErreurDepot = $"{c}: {m}");
            Rendre();
        }

        /// <summary>Les 18 files, dans l'ordre des districts. 404 = pas de file (un ÉTAT, S12-d) ;
        /// tout autre code = une panne, et l'écran le dira.</summary>
        private IEnumerator LireLesFiles(string bearer)
        {
            Files = new FileData[NombreDeDistricts];
            FilesOuvertes = 0;
            for (int id = 1; id <= NombreDeDistricts; id++)
            {
                int k = id - 1;
                yield return client.LireFile(id, bearer,
                    f => { Files[k] = f; FilesOuvertes++; },
                    (c, m) => { if (c != 404) DerniereErreur = $"{c}: {m}"; });
            }
        }

        /// <summary>Le premier bâtiment servi. La maquette #33 en prend un « de La Lisière » : sans
        /// choix du joueur dessiné, le premier de la liste est le seul choix qui ne suppose rien.</summary>
        private static BatimentPossedeDto ChoisirCible(BatimentPossedeDto[] bs) =>
            bs != null && bs.Length > 0 ? bs[0] : null;

        // ═══ LE DÉPÔT (#33) — le bouton fait un FAUX signalement ; le test choisit son type ═════════

        public void Deposer()
        {
            if (PeutDeposer) StartCoroutine(DeposerCoroutine("FALSE_REPORT"));
        }

        /// <summary>Même chemin que le bouton, le type d'entrée en plus. ⚠️ Un test qui rejouerait le
        /// FAUX signalement du bouton sur le compte de démo partagé finirait par faire basculer la
        /// police (8 faux pour 1 fondé sur 30 jours) et injecterait des audits dans la file du
        /// district 1 — le registre des signalements n'est PAS purgé par le seeder. Le test dépose
        /// donc un signalement FONDÉ : même route, même réponse à 4 clés, jamais de représailles.</summary>
        public IEnumerator DeposerPourTest(string typeEntree) => DeposerCoroutine(typeEntree);

        private IEnumerator DeposerCoroutine(string typeEntree)
        {
            if (Cible == null || string.IsNullOrEmpty(token))
            {
                DerniereErreurDepot = "aucun bâtiment à signaler";
                RendreDepot();
                yield break;
            }
            depotEnCours = true;
            DerniereErreurDepot = null;
            DernierRapport = null;          // le geste précédent s'efface : le retour de bâton était figé JUSQU'ICI
            RendreDepot();
            yield return client.Deposer(Cible.building, typeEntree, token,
                                        r => DernierRapport = r,
                                        (c, m) => DerniereErreurDepot = $"{c}: {m}");
            depotEnCours = false;
            // la file vient de recevoir une entrée : relire les 18, le registre doit le montrer
            yield return LireLesFiles(token);
            Rendre();
        }

        // ═══ RENDU ══════════════════════════════════════════════════════════════════════════════════

        private void Rendre()
        {
            for (int i = corps.childCount - 1; i >= 0; i--)
                UnityEngine.Object.Destroy(corps.GetChild(i).gameObject);
            LignesRendues = 0;
            EtatVide = FilesOuvertes == 0;
            int n = Districts != null && Districts.Length > 0 ? Districts.Length : NombreDeDistricts;
            sousTitre.text = $"{n} districts";
            videTexte.gameObject.SetActive(EtatVide);
            piedTexte.gameObject.SetActive(true);
            piedTexte.text = $"{n} DISTRICTS · TOUT OU RIEN : LA POLICE OUVRE SES FILES PARTOUT À LA FOIS";
            if (EtatVide)
            {
                // table 63 v2 : la phrase de la police, PUIS l'état. Addendum 63 (client 33b422c5, 26/09) : « Rien à faire ici tant
                // qu'aucune file n'est ouverte » était FAUX au-dessus d'un DÉPOSER actif (D3) — REMPLACÉE par une phrase vraie avec le
                // dépôt offert. (Le dépôt reste tel que D3 le prévoit — décision de registre du 22/09, rappelée par f2 le 26/09.)
                videTexte.text = DerniereErreur == null
                    ? "La police n'a pas encore ouvert ses files — elle les ouvre sur les 18 districts à la fois."
                      + "\n" + MafiaCleanCity.I18n.Libelle.Gabarit("inspection.vide.aucune_inspection_en_cours", "Aucune inspection en cours.")
                    : "La file n'a pas répondu.";
                RendreDepot();
                RendusEffectues++;
                return;
            }
            for (int id = 1; id <= NombreDeDistricts; id++)
            {
                Ligne(corps, id, NomDuDistrict(id), Files[id - 1]);
                LignesRendues++;
            }
            piedTexte.text = $"{n} DISTRICTS · TOUT OU RIEN : LA POLICE OUVRE SES FILES PARTOUT À LA FOIS";
            RendreDepot();
            RendusEffectues++;
        }

        private void RendreDepot()
        {
            cibleTexte.text = Cible != null ? $"SUR · {NomDeBatiment(Cible)}" : "SUR · aucun bâtiment à vous";
            deposerBouton.interactable = PeutDeposer;
            if (DernierRapport != null)
            {
                prixTexte.gameObject.SetActive(true);
                prixTexte.text = $"DÉPOSÉ · PRIX {DernierRapport.cost_resolved} — annoncé par le serveur, rien n'est débité aujourd'hui";
            }
            else if (DerniereErreurDepot != null)
            {
                prixTexte.gameObject.SetActive(true);
                prixTexte.text = "Le signalement n'a pas été pris.";
            }
            else prixTexte.gameObject.SetActive(false);
            // ★ le retour de bâton (#34) : figé jusqu'au prochain geste, parce qu'aucune route ne le relit
            bool baton = DernierRapport != null && DernierRapport.backlash_triggered;
            batonTexte.gameObject.SetActive(baton);
            if (baton) batonTexte.text = "LE RETOUR DE BÂTON — ils ont compris que les signalements venaient de vous";
        }

        private string NomDuDistrict(int id)
        {
            if (Districts != null)
                foreach (DistrictNomDto d in Districts)
                    if (d != null && d.id == id)
                        return !string.IsNullOrEmpty(d.name) ? d.name
                             : !string.IsNullOrEmpty(d.name_canonical) ? d.name_canonical
                             : $"quartier {id}";
            return $"quartier {id}";
        }

        private static string NomDeBatiment(BatimentPossedeDto b)
        {
            string enseigne = b.name_i18n != null && b.name_i18n.@params != null ? b.name_i18n.@params.enseigne : null;
            string district = !string.IsNullOrEmpty(b.district_name) ? b.district_name : $"quartier {b.district_id}";
            return string.IsNullOrEmpty(enseigne) ? $"un bâtiment de {district}" : $"{enseigne} — {district}";
        }

        private void EnTete(Transform parent)
        {
            GameObject l = Bloc("EnTete", parent, true, Px(4f));
            var g = l.GetComponent<HorizontalOrVerticalLayoutGroup>();
            g.childForceExpandWidth = false;
            g.childAlignment = TextAnchor.MiddleLeft;
            Espace(l.transform, Px(9f));
            foreach (TextMeshProUGUI col in new[] {
                Colonne(l.transform, "Nom", "DISTRICT", Px(6.5f), EncreFaibleDuRegistre, 1.2f, 0f),
                Colonne(l.transform, "Charge", "CHARGE", Px(6.5f), EncreFaibleDuRegistre, 0f, Px(46f)),
                Colonne(l.transform, "Regime", "RÉGIME", Px(6.5f), EncreFaibleDuRegistre, 0f, Px(52f)),
                Colonne(l.transform, "Origines", "ORIGINES", Px(6.5f), EncreFaibleDuRegistre, 1.6f, 0f) })
            { col.fontStyle = FontStyles.Bold; col.characterSpacing = 10f; }
        }

        /// <summary>Une ligne du registre : le glyphe du régime, le nom, la charge, le régime, les
        /// origines. Une ligne SANS file (404 isolé) reste à sa place, éteinte : le registre a 18
        /// lignes ou il n'existe pas.</summary>
        private void Ligne(Transform parent, int id, string nom, FileData f)
        {
            GameObject l = Bloc($"L_{id}", parent, true, Px(4f));
            var g = l.GetComponent<HorizontalOrVerticalLayoutGroup>();
            g.childForceExpandWidth = false;
            g.childAlignment = TextAnchor.MiddleLeft;
            bool tendu = f != null && (f.dispatcher_regime == "SURGE" || f.dispatcher_regime == "BACKLOGGED");
            // zébrage : la ligne dont la file n'est pas VIDE est teintée (les lignes pleines du cadre 32 : 207,224,205)
            if (f != null && f.queue_load != "EMPTY")
            {
                Image zebre = l.AddComponent<Image>(); zebre.color = ZebrageDuRegistre; zebre.raycastTarget = false;
            }

            var glGo = new GameObject("Regime", typeof(RectTransform));
            glGo.transform.SetParent(l.transform, false);
            Image gl = glGo.AddComponent<Image>();
            gl.preserveAspect = true;
            gl.raycastTarget = false;
            Sprite sp = f != null ? DispatcherIcons.Pour(f.dispatcher_regime) : null;
            gl.sprite = sp;
            gl.enabled = sp != null;
            gl.color = tendu ? RougeDuRegistre : EncreFaibleDuRegistre;   // le glyphe suit l'encre du libellé qu'il accompagne
            LayoutElement le = glGo.AddComponent<LayoutElement>();
            le.preferredWidth = Px(9f); le.minWidth = Px(9f);
            le.preferredHeight = Px(9f); le.minHeight = Px(9f);
            le.flexibleWidth = 0f; le.flexibleHeight = 0f;

            Colonne(l.transform, "Nom", nom.ToUpperInvariant(), Px(8f), f == null ? EncreFaibleDuRegistre : EncreDuRegistre, 1.2f, 0f);
            Colonne(l.transform, "Charge", f == null ? "—" : MafiaCleanCity.I18n.MotsDesEnumeres.Dire(MafiaCleanCity.I18n.MotsDesEnumeres.ChargeDeLaFile, f.queue_load), Px(7f),
                    f == null ? EncreFaibleDuRegistre : EncreDuRegistre, 0f, Px(46f)).fontStyle |= FontStyles.UpperCase;
            Colonne(l.transform, "Regime", f == null ? "—" : MafiaCleanCity.I18n.MotsDesEnumeres.Dire(MafiaCleanCity.I18n.MotsDesEnumeres.Regime, f.dispatcher_regime), Px(7f),
                    f == null ? EncreFaibleDuRegistre : tendu ? RougeDuRegistre : EncreDuRegistre, 0f, Px(52f)).fontStyle |= FontStyles.UpperCase;
            Colonne(l.transform, "Origines", f == null ? "—" : Origines(f.type_distribution), Px(6.5f),
                    f == null ? EncreFaibleDuRegistre : EncreDuRegistre, 1.6f, 0f).fontStyle |= FontStyles.UpperCase;
        }

        /// <summary>Les six origines qui remplissent la file, celles qui sont PRÉSENTES seulement,
        /// chacune avec sa barre de présence (une, deux ou trois cases — jamais un compte).</summary>
        private static string Origines(BandesSource b)
        {
            if (b == null) return "—";
            var parts = new List<string>(6);
            // les mots du cadre 32 (« PROGRAMMEE », « INDIC », « CASCADE », « FORENSIQUE ») ; les deux autres origines (faux rapport, rapport fondé) n'y sont pas dessinées : leurs mots restent
            Ajouter(parts, "Programmée", b.SCHEDULED);
            Ajouter(parts, "Indic", b.INFORMANT);
            Ajouter(parts, "Faux rapport", b.FALSE_REPORT);
            Ajouter(parts, "Rapport fondé", b.GENUINE_REPORT);
            Ajouter(parts, "Cascade", b.CASCADE);
            Ajouter(parts, "Forensique", b.FORENSIC);
            return parts.Count == 0 ? "—" : string.Join(" · ", parts);
        }

        private static void Ajouter(List<string> parts, string libelle, string bande)
        {
            int r = BandeRang(bande);
            if (r > 0) parts.Add(libelle + " " + new string('▓', r));
        }

        private static int BandeRang(string b) =>
            b == "PREDOMINANT" ? 3 : b == "MANY" ? 2 : b == "SOME" ? 1 : 0;

        // ═══ CONSTRUCTION ═══════════════════════════════════════════════════════════════════════════

        private void Construire()
        {
            RectTransform selfRt = GetComponent<RectTransform>();
            if (selfRt == null) selfRt = gameObject.AddComponent<RectTransform>();
            Image voile = gameObject.AddComponent<Image>();
            voile.color = DesignTokens.Current.surfaceBase;
            voile.raycastTarget = true;
            VerticalLayoutGroup v = gameObject.AddComponent<VerticalLayoutGroup>();
            v.padding = new RectOffset((int)Px(10f), (int)Px(10f),
                                       (int)ShellChrome.TopInsetPx + (int)Px(8f),
                                       (int)ShellChrome.BottomInsetPx + (int)Px(8f));
            v.spacing = Px(7f);
            v.childControlWidth = true;
            v.childControlHeight = true;
            v.childForceExpandWidth = true;
            v.childForceExpandHeight = false;
            v.childAlignment = TextAnchor.UpperCenter;

            // A1 : le registre est le PREMIER objet de l'écran (la maquette n'a ni « LES INSPECTIONS » ni sous-titre : le papier porte « BPD · REGISTRE DE DISPATCH »). Titre et sous-titre restent construits (le texte
            // est écrit par `Rendre`) mais ne se montrent pas.
            TextMeshProUGUI titre = Texte(transform, "Titre", "LES INSPECTIONS", Px(13f), Or,
                                          DesignTokens.Current.hudSerifFont, TextAlignmentOptions.Center);
            titre.characterSpacing = 18f;
            titre.gameObject.SetActive(false);
            sousTitre = Texte(transform, "Sous", $"{NombreDeDistricts} districts", Px(8.5f), Creme2,
                              DesignTokens.Current.primaryFont, TextAlignmentOptions.Center);
            sousTitre.gameObject.SetActive(false);

            // le PAPIER : la feuille pleine largeur (déborde des marges de l'écran), ses rails de perforations, puis en-tête, filet, colonnes, lignes, filet, pied
            GameObject papier = Bloc("Papier", transform, false, Px(2f));
            papier.GetComponent<VerticalLayoutGroup>().padding = new RectOffset((int)Px(10f), (int)Px(10f), (int)Px(9f), (int)Px(9f));
            GameObject feuille = new GameObject("Feuille", typeof(RectTransform));
            feuille.transform.SetParent(papier.transform, false);
            feuille.AddComponent<LayoutElement>().ignoreLayout = true;
            RectTransform fr = (RectTransform)feuille.transform;
            fr.anchorMin = Vector2.zero; fr.anchorMax = Vector2.one; fr.offsetMin = new Vector2(-Px(10f), 0f); fr.offsetMax = new Vector2(Px(10f), 0f);
            Image fi = feuille.AddComponent<Image>(); fi.color = Papier; fi.raycastTarget = false;
            Perforations(feuille.transform, true); Perforations(feuille.transform, false);
            TextMeshProUGUI enteteRegistre = Texte(papier.transform, "EnteteRegistre", "BPD · REGISTRE DE DISPATCH", Px(10f), EncreDuRegistre,
                                                   DesignTokens.Current.primaryFont, TextAlignmentOptions.Left);
            enteteRegistre.fontStyle = FontStyles.Bold; entereRegistreEspacement(enteteRegistre);
            Regle(papier.transform, Px(1.2f));
            EnTete(papier.transform);
            GameObject c = Bloc("Corps", papier.transform, false, Px(1f));
            corps = (RectTransform)c.transform;
            Regle(papier.transform, Px(1.2f));

            piedTexte = Texte(papier.transform, "Pied", "", Px(6.5f), EncreFaibleDuRegistre,
                              DesignTokens.Current.primaryFont, TextAlignmentOptions.Center);
            piedTexte.enableWordWrapping = true;
            piedTexte.characterSpacing = 8f;

            // ── le dépôt (#33) ──
            TextMeshProUGUI depotTitre = Texte(transform, "DepotTitre", "DÉPOSER UN SIGNALEMENT", Px(9f), Or,
                                               DesignTokens.Current.hudSerifFont, TextAlignmentOptions.Center);
            depotTitre.characterSpacing = 12f;
            cibleTexte = Texte(transform, "Cible", "", Px(7.5f), Creme2,
                               DesignTokens.Current.primaryFont, TextAlignmentOptions.Center);
            cibleTexte.enableWordWrapping = true;
            Texte(transform, "Effet", "EFFET · une entrée de plus dans leur file", Px(7f), Creme2,
                  DesignTokens.Current.primaryFont, TextAlignmentOptions.Center);
            prixTexte = Texte(transform, "Prix", "", Px(7.5f), Creme,
                              DesignTokens.Current.primaryFont, TextAlignmentOptions.Center);
            prixTexte.enableWordWrapping = true;
            prixTexte.gameObject.SetActive(false);

            var bGo = new GameObject("Deposer", typeof(RectTransform));
            bGo.transform.SetParent(transform, false);
            // A3 (juge groupé du 07/10, f2) : DÉPOSER est une PLAQUE crème à double filet rouge (cadre 33 : la fiche de papier), pas l'aplat olive pleine largeur sans arrondi ni filet — la même grammaire crème que le CTA de ⑤
            Image fondBouton = bGo.AddComponent<Image>();
            fondBouton.sprite = ProceduralUI.RoundedRectMask((int)Px(5f));
            fondBouton.type = Image.Type.Sliced;
            fondBouton.color = PiedDEcran.PlaqueCreme;
            Color rougeDuDepot = PiedDEcran.EncreDeLaPlaque;
            foreach ((string nom, float retrait, float epaisseur) in new[] { ("Filet1", 0f, 1.6f), ("Filet2", 3f, 0.8f) })
            {
                var fgo = new GameObject(nom, typeof(RectTransform));
                fgo.transform.SetParent(bGo.transform, false);
                fgo.AddComponent<LayoutElement>().ignoreLayout = true;
                RectTransform frt = (RectTransform)fgo.transform;
                frt.anchorMin = Vector2.zero; frt.anchorMax = Vector2.one; frt.offsetMin = new Vector2(Px(retrait), Px(retrait)); frt.offsetMax = new Vector2(-Px(retrait), -Px(retrait));
                Image fim = fgo.AddComponent<Image>();
                fim.sprite = ProceduralUI.RoundedRectOutline((int)Px(5f), Px(epaisseur), rougeDuDepot);
                fim.type = Image.Type.Sliced; fim.raycastTarget = false;
            }
            deposerBouton = bGo.AddComponent<Button>();
            deposerBouton.targetGraphic = fondBouton;
            deposerBouton.interactable = false;
            deposerBouton.onClick.AddListener(Deposer);
            LayoutElement leBouton = bGo.AddComponent<LayoutElement>();
            leBouton.preferredHeight = Px(22f); leBouton.minHeight = Px(22f);
            TextMeshProUGUI libBouton = Texte(bGo.transform, "Lib", "DÉPOSER", Px(9f), rougeDuDepot,
                                              DesignTokens.Current.hudSerifFont, TextAlignmentOptions.Center);
            libBouton.characterSpacing = 12f;
            RectTransform libRt = (RectTransform)libBouton.transform;
            libRt.anchorMin = Vector2.zero; libRt.anchorMax = Vector2.one;
            libRt.offsetMin = Vector2.zero; libRt.offsetMax = Vector2.zero;

            Texte(transform, "Avert", "⚠ au bout de plusieurs, la police se retourne", Px(6.5f), Creme2,
                  DesignTokens.Current.primaryFont, TextAlignmentOptions.Center);

            // ★ le retour de bâton (#34) : figé jusqu'au prochain geste
            batonTexte = Texte(transform, "Baton", "", Px(9f), Braise,
                               DesignTokens.Current.primaryFont, TextAlignmentOptions.Center);
            batonTexte.enableWordWrapping = true;
            batonTexte.gameObject.SetActive(false);

            // l'état vide se dit SUR LE PAPIER (le registre est là, ses lignes n'y sont pas : « tout ou rien »), à l'encre ; A2 : plus d'illustration photographique (aucune dans les cadres 31-35)
            videTexte = Texte(papier.transform, "Vide", "", Px(10f), EncreDuRegistre,
                              DesignTokens.Current.hudSerifFont, TextAlignmentOptions.Center);
            videTexte.enableWordWrapping = true;
            videTexte.gameObject.SetActive(false);
            videTexte.transform.SetSiblingIndex(corps.transform.GetSiblingIndex() + 1);
            videIllustration = null;
        }

        private static void entereRegistreEspacement(TextMeshProUGUI t) { t.characterSpacing = 14f; }

        /// <summary>Un filet épais du registre : une barre d'encre pleine largeur de la colonne.</summary>
        private static void Regle(Transform parent, float epaisseur)
        {
            GameObject go = new GameObject("Regle", typeof(RectTransform));
            go.transform.SetParent(parent, false);
            Image im = go.AddComponent<Image>(); im.color = EncreDuRegistre; im.raycastTarget = false;
            LayoutElement le = go.AddComponent<LayoutElement>();
            le.minHeight = le.preferredHeight = epaisseur; le.flexibleHeight = 0f;
        }

        private static Sprite spritePerforation;
        /// <summary>Un rail de perforations (les trous de la bande de listing) : un sprite 16×44 portant UN trou, répété en hauteur (`Image.Type.Tiled`) — 23 u de large, 63 u de pas.</summary>
        private static Sprite Perforation()
        {
            if (spritePerforation != null) return spritePerforation;
            var tex = new Texture2D(16, 44, TextureFormat.RGBA32, false) { wrapMode = TextureWrapMode.Repeat, filterMode = FilterMode.Bilinear };
            var px = new Color[16 * 44];
            for (int y = 0; y < 44; y++)
                for (int x = 0; x < 16; x++)
                {
                    float d = Vector2.Distance(new Vector2(x + 0.5f, y + 0.5f), new Vector2(8f, 22f));
                    px[y * 16 + x] = new Color(0.42f, 0.41f, 0.37f, 0.35f * Mathf.Clamp01(7f - d));
                }
            tex.SetPixels(px); tex.Apply(false, true);
            spritePerforation = Sprite.Create(tex, new Rect(0, 0, 16, 44), new Vector2(0.5f, 0.5f), 69.6f, 0, SpriteMeshType.FullRect);
            spritePerforation.hideFlags = HideFlags.HideAndDontSave;
            return spritePerforation;
        }

        private const string NomPerfGauche = "PerfGauche", NomPerfDroite = "PerfDroite";

        private static void Perforations(Transform feuille, bool gauche)
        {
            GameObject go = new GameObject(gauche ? NomPerfGauche : NomPerfDroite, typeof(RectTransform));
            go.transform.SetParent(feuille, false);
            RectTransform rt = (RectTransform)go.transform;
            rt.anchorMin = new Vector2(gauche ? 0f : 1f, 0f); rt.anchorMax = new Vector2(gauche ? 0f : 1f, 1f);
            rt.pivot = new Vector2(gauche ? 0f : 1f, 0.5f);
            rt.sizeDelta = new Vector2(Px(7f), 0f); rt.anchoredPosition = new Vector2(gauche ? Px(2f) : -Px(2f), 0f);
            Image im = go.AddComponent<Image>(); im.sprite = Perforation(); im.type = Image.Type.Tiled; im.raycastTarget = false;
        }

        private static void Espace(Transform parent, float largeur)
        {
            var go = new GameObject("Espace", typeof(RectTransform));
            go.transform.SetParent(parent, false);
            LayoutElement le = go.AddComponent<LayoutElement>();
            le.preferredWidth = largeur; le.minWidth = largeur; le.flexibleWidth = 0f;
        }

        private static TextMeshProUGUI Colonne(Transform parent, string nom, string valeur, float taille,
            Color couleur, float flexible, float fixe)
        {
            TextMeshProUGUI t = Texte(parent, nom, valeur, taille, couleur, DesignTokens.Current.primaryFont);
            LayoutElement le = t.GetComponent<LayoutElement>();
            le.flexibleWidth = flexible;
            le.preferredWidth = fixe;
            le.minWidth = fixe;
            t.overflowMode = TextOverflowModes.Ellipsis;
            return t;
        }

        private static GameObject Bloc(string nom, Transform parent, bool horizontal, float espace)
        {
            GameObject go = new GameObject(nom, typeof(RectTransform));
            go.transform.SetParent(parent, false);
            HorizontalOrVerticalLayoutGroup g = horizontal
                ? (HorizontalOrVerticalLayoutGroup)go.AddComponent<HorizontalLayoutGroup>()
                : go.AddComponent<VerticalLayoutGroup>();
            g.spacing = espace;
            g.childControlWidth = true;
            g.childControlHeight = true;
            g.childForceExpandWidth = true;
            g.childForceExpandHeight = false;
            return go;
        }

        private static TextMeshProUGUI Texte(Transform parent, string nom, string valeur, float taille,
            Color couleur, TMP_FontAsset police, TextAlignmentOptions alignement = TextAlignmentOptions.Left)
        {
            GameObject go = new GameObject(nom, typeof(RectTransform));
            go.transform.SetParent(parent, false);
            TextMeshProUGUI t = go.AddComponent<TextMeshProUGUI>();
            t.font = police;
            t.fontSize = taille;
            t.color = couleur;
            t.text = valeur;
            t.alignment = alignement;
            t.enableWordWrapping = false;
            LayoutElement le = go.AddComponent<LayoutElement>();
            le.preferredWidth = 0f;
            le.flexibleWidth = 1f;
            return t;
        }
    }
}
