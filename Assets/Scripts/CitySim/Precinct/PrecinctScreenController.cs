using System.Collections;
using UnityEngine;
using UnityEngine.UI;
using MafiaCleanCity.Shell;
using MafiaCleanCity.Theme;
using TMPro;

namespace MafiaCleanCity.CitySim.Precinct
{
    // ⑰ LE COMMISSARIAT — ce que la police croit, et à quel point elle patrouille.
    //
    // MATIÈRE — les 2 SEULES routes joueur d'un precinct, mesurées le 2026-09-02, sous
    // `JwtAuthGuard`. Elles rendent DEUX CHAMPS CHACUNE : `precinct` + un palier. C'est tout.
    //
    // ⛔ ET C'EST LE SUJET DE L'ÉCRAN, PAS SA LIMITE. La maquette promettait « la mémoire du
    // precinct, l'achat de renseignement, le recrutement de clerc » ; le back sert deux paliers.
    // Un écran qui remplirait le vide avec des cartes plausibles ferait passer un trou de surface
    // pour un écran fini — et personne ne reviendrait jamais le mesurer. Celui-ci montre les deux
    // paliers EN GRAND, et écrit ce qui manque, à l'écran, avec sa raison.
    //
    // ⛔ Les deux manques, mesurés, pas devinés :
    // · **S12-c** — aucun recrutement de clerc : il n'existe AUCUNE route. Non proposé.
    // · L'achat de renseignement existe mais vise un acteur d'AFFAIRES INTERNES
    //   (`internal-affairs.controller.ts:76`), **pas un precinct**. *Objet voisin, pas identique* —
    //   la ressemblance est précisément ce qui ferait câbler la mauvaise route. Non câblé.
    //
    // ⛔⛔ **S12-e — LA CORRESPONDANCE DISTRICT → PRECINCT EST CALCULÉE CÔTÉ CLIENT.** Deux clients
    // qui la calculent divergeront, et aucune source ne les départagera. Cet écran ne la calcule
    // PAS : il prend un identifiant de precinct. *L'inventer ici enterrerait le défaut sous une
    // implémentation plausible* — et un défaut de contrat enterré coûte plus cher qu'un écran
    // incomplet qui le dit.
    //
    // ⚠️ MAQUETTE série 6 en jugement, non ratifiée au 2026-09-02.
    // ⛔ NON REVU — jalon 2026-09-05.
    public class PrecinctScreenController : MonoBehaviour, IShellTenant
    {
        [Header("Backend")]
        private string baseUrlPose;   // posée par un appelant (tests, shell) ; sinon la source unique
        private string baseUrl { get => baseUrlPose ?? MafiaCleanCity.AdresseDuBack.Url; set => baseUrlPose = value; }
        [Header("Cible")]
        // ⛔ ÉTAT VIDE FAUX (passe UX 2026-09-26, table 63 de l'atelier) : ce champ valait « 1 » EN DUR, et le shell monte l'écran par
        // `AddComponent` sans le poser — tout joueur lisait le commissariat 1, quel que soit son quartier (le joueur neuf mesuré est
        // au 6). La correspondance EST servie désormais : `world/districts` porte `precinct_id` par district (déjà lu par ③,
        // `CityMapController`). Vide ⇒ l'écran la RÉSOUT : le district du premier bâtiment du joueur (`me/buildings`), puis son
        // `precinct_id` servi. Un appelant (test, carte) peut encore la poser.
        [SerializeField] private string precinctId = "";
        public string PrecinctId { get => precinctId; set => precinctId = value; }

        public CroyanceData Croyance { get; private set; }
        public PatrouilleData Patrouille { get; private set; }
        public bool EtatVide { get; private set; }
        /// <summary>⛔ LE SEUL PRÉDICAT HONNÊTE POUR UNE CAPTURE. Attendre qu'un CHAMP arrive
        /// n'est pas attendre que l'écran soit DESSINÉ : ㉓ enchaîne trois requêtes, et guetter la
        /// première faisait capturer DEUX requêtes trop tôt — image vide, test vert. ⑰ battait
        /// entre 23 et 3 éléments d'un run à l'autre pour la même raison, une requête d'avance.
        /// ⇒ Ce compteur monte à la FIN de `Rendre()`. C'est une propriété structurelle : elle ne
        /// dépend d'aucun champ, d'aucun ordre de requêtes, et elle survivra à l'ajout d'un appel.</summary>
        public int RendusEffectues { get; private set; }
        public string DerniereErreur { get; private set; }

        private const float K = 1280f / 300f;
        private static float Px(float cssPx) => cssPx * K;

        private static Color Creme => DesignTokens.Current.hudCreme;
        private static Color Creme2 => DesignTokens.Current.hudCremeSecondary;
        private static Color Or => DesignTokens.Current.hudMoneyUnderlineGold;
        private static Color Braise => DesignTokens.Current.hudGaugeArcHot;
        private static readonly Color Eteint = new Color(1f, 1f, 1f, 0.18f);

        private static Color Hex(string h)
        {
            ColorUtility.TryParseHtmlString(h, out Color c);
            return c;
        }

        private PrecinctClient client;
        private string token;
        private bool initialise;
        private Transform mountParent;
        private RectTransform corps;
        private TextMeshProUGUI videTexte;
        private UnityEngine.UI.Image videIllustration;

        private void Awake() => Init();

        private void Init()
        {
            if (initialise) return;
            initialise = true;
            client = new PrecinctClient { BaseUrl = baseUrl };
            Construire();
        }

        public void SetMountParent(Transform parent)
        {
            mountParent = parent;
            Init();
            // ⛔ Sans ces quatre lignes le rect reste à 100x100 et l'écran ne dessine RIEN.
            RectTransform rt = (RectTransform)transform;
            rt.anchorMin = Vector2.zero;
            rt.anchorMax = Vector2.one;
            rt.offsetMin = Vector2.zero;
            rt.offsetMax = Vector2.zero;
            // ⛔⛔ ET L'ORDRE DE FRATRIE DÉCIDE DE CE QU'ON VOIT. Mesuré le 2026-09-02 sur deux
            // captures : `rect=1280x960`, `frere=1/8` — l'écran était de la BONNE taille, au BON
            // endroit, sous le BON canvas, et SIX frères se dessinaient par-dessus. La capture
            // montrait la carte de la ville, l'autonomie et le dock ; l'écran, nulle part.
            // ⇒ Un locataire monté en surimpression doit être le DERNIER enfant, sinon il est
            // rendu dessous. C'est une propriété STRUCTURELLE — elle ne dépend d'aucun pixel,
            // d'aucune résolution, d'aucune couleur — et c'est la seule classe de garde qui ait
            // fermé ce genre de défaut ici.
            transform.SetAsLastSibling();
        }


        /// <summary>⛔⛔ CE HOOK-CI EST LE BON, ET LES DEUX PRÉCÉDENTS ÉTAIENT DÉCORATIFS.
        /// Lu dans le corps du shell (`AppShell.ConstruireLocataire`), pas déduit :
        ///   1. `host = new GameObject(...)`      — créé à la racine, SANS parent
        ///   2. `host.transform.SetParent(slot)`  — le parent change ICI
        ///   3. `host.AddComponent&lt;T&gt;()`         — le composant naît APRÈS
        ///   4. `tenant.SetMountParent(slot)`     — puis `SetToken`, même frame
        /// ⇒ `OnTransformParentChanged` ne pouvait JAMAIS tirer : au moment du re-parentage,
        /// ce composant n'existait pas. Un dispositif qui nomme un mécanisme réel et ne
        /// s'exécute jamais — et il a survécu deux runs en passant pour un correctif, parce que
        /// six écrans sur sept étaient déjà derniers SANS lui.
        /// ⇒ Et poser l'ordre en (4) ne suffit pas non plus : la mesure dit `frère 6 sur 11`,
        /// donc des frères s'ajoutent APRÈS la fenêtre synchrone du montage.
        /// ⇒ `Start()` s'exécute à la frame SUIVANTE — après tout ce que le shell fait en
        /// synchrone. C'est le premier instant où « être dernier » est stable.
        /// ★ La leçon vaut plus que la ligne : *avant d'écrire un hook, lire le CORPS de ce qui
        /// l'appelle, et se demander si l'événement qu'il observe peut seulement se produire.*</summary>
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

        private IEnumerator Charger(string bearer)
        {
            if (string.IsNullOrEmpty(precinctId)) yield return ResoudreLeCommissariat(bearer);
            if (string.IsNullOrEmpty(precinctId))
            {
                // pas de quartier à soi (aucun bâtiment), ou les routes muettes : on ne lit PAS un commissariat au hasard
                DerniereErreur = DerniereErreur ?? "commissariat non résolu";
                Rendre();
                yield break;
            }
            yield return client.LireCroyance(precinctId, bearer, c => Croyance = c,
                                             (c, m) => DerniereErreur = c == 404 ? null : $"croyance {c}: {m}");
            yield return client.LirePatrouille(precinctId, bearer, p => Patrouille = p,
                                               (c, m) => DerniereErreur = c == 404 ? null : $"patrouille {c}: {m}");
            Rendre();
        }

        /// <summary>Le commissariat du JOUEUR : le district de son premier bâtiment servi, puis le `precinct_id` que `world/districts`
        /// sert pour ce district. Rien de calculé côté client.</summary>
        private IEnumerator ResoudreLeCommissariat(string bearer)
        {
            BatimentPossedeDto[] possedes = null;
            yield return new MesBatimentsClient { BaseUrl = baseUrl }.Lire(bearer, b => possedes = b, (c, m) => DerniereErreur = $"me/buildings {c}: {m}");
            int quartier = PrecinctDuJoueur.QuartierDuJoueur(possedes);
            if (quartier <= 0) yield break;
            System.Collections.Generic.List<MafiaCleanCity.CityMap.DistrictDto> districts = null;
            yield return new MafiaCleanCity.CityMap.WorldApiClient { BaseUrl = baseUrl }.GetDistricts(d => districts = d, e => DerniereErreur = e);
            int precinct = PrecinctDuJoueur.PrecinctServi(districts, quartier);
            if (precinct > 0) precinctId = precinct.ToString(System.Globalization.CultureInfo.InvariantCulture);
        }

        private void Rendre()
        {
            for (int i = corps.childCount - 1; i >= 0; i--)
                UnityEngine.Object.Destroy(corps.GetChild(i).gameObject);

            EtatVide = Croyance == null && Patrouille == null;
            videTexte.gameObject.SetActive(EtatVide);
            if (videIllustration != null) videIllustration.gameObject.SetActive(EtatVide);
            if (EtatVide)
            {
                // table 63 : QUAND la mémoire du commissariat du quartier sur le joueur est vide (les deux lectures 404)
                videTexte.text = DerniereErreur == null
                    ? MafiaCleanCity.I18n.Libelle.Gabarit("police.vide.le_commissariat_n_a_encore_rien_sur_vous", "Le commissariat n’a encore rien sur vous.")
                      + "\n" + MafiaCleanCity.I18n.Libelle.Gabarit("police.vide.tant_que_vous_ne_faites_pas_de_bruit_ca_peut_durer",
                                                                  "Tant que vous ne faites pas de bruit, ça peut durer.")
                    : "Le commissariat n'a pas répondu.";
                RendusEffectues++;
                return;
            }

            // ★ DEUX paliers, montrés en GRAND : c'est tout ce que le back sait dire d'un
            // commissariat, et le montrer petit ferait croire qu'il y a autre chose autour.
            Palier("CE QU'ILS CROIENT", Croyance != null ? Croyance.belief : null,
                   CroyanceRang(Croyance != null ? Croyance.belief : null), 4,
                   CroyanceMot(Croyance != null ? Croyance.belief : null));
            Palier("LA PATROUILLE", Patrouille != null ? Patrouille.patrol_heat : null,
                   PatrouilleRang(Patrouille != null ? Patrouille.patrol_heat : null), 4,
                   PatrouilleMot(Patrouille != null ? Patrouille.patrol_heat : null));

            // ce qui manque, écrit — jamais un bouton qui ne peut pas aboutir
            Manque("Recruter un greffier", "pas encore : on n'a personne à acheter au greffe");
            Manque("Acheter un renseignement", "pas encore : ce qui s'achète parle des affaires internes, pas de ce commissariat");
            RendusEffectues++;
        }

        private void Palier(string titre, string valeur, int rang, int total, string mot)
        {
            GameObject r = Bloc("P_" + titre, corps, false, Px(6f));
            Image fond = r.AddComponent<Image>();
            fond.sprite = ProceduralUI.RoundedRectOutline((int)Px(12f), Px(1f), Hex("#ffffff24"));
            fond.type = Image.Type.Sliced;
            r.GetComponent<VerticalLayoutGroup>().padding =
                new RectOffset((int)Px(12f), (int)Px(12f), (int)Px(10f), (int)Px(12f));
            r.GetComponent<VerticalLayoutGroup>().childAlignment = TextAnchor.MiddleCenter;

            Texte(r.transform, "T", titre, Px(7.5f), Eteint,
                  DesignTokens.Current.primaryFont, TextAlignmentOptions.Center).characterSpacing = 14f;

            Color teinte = rang >= 3 ? Braise : rang == 2 ? Or : Creme;
            Texte(r.transform, "Mot", mot, Px(16f), teinte,
                  DesignTokens.Current.hudSerifFont, TextAlignmentOptions.Center);

            GameObject g = Bloc("Crans", r.transform, true, Px(3f));
            var h = g.GetComponent<HorizontalLayoutGroup>();
            h.childForceExpandWidth = false;
            h.childAlignment = TextAnchor.MiddleCenter;
            for (int i = 0; i < total; i++)
            {
                GameObject c = new GameObject("C" + i, typeof(RectTransform));
                c.transform.SetParent(g.transform, false);
                Image im = c.AddComponent<Image>();
                im.sprite = ProceduralUI.RoundedRectOutline((int)Px(2f), Px(1f), i < rang ? teinte : Eteint);
                im.type = Image.Type.Sliced;
                im.color = i < rang ? teinte : Eteint;
                LayoutElement le = c.AddComponent<LayoutElement>();
                le.preferredWidth = Px(28f); le.preferredHeight = Px(6f); le.flexibleWidth = 0f;
            }
        }

        /// <summary>Un geste que le back ne sert pas — montré ÉTEINT avec sa raison, jamais
        /// masqué. *Un geste impossible qu'on masque devient un geste qu'on croit ne pas
        /// exister ; montré éteint, il devient une promesse datée.*</summary>
        private void Manque(string libelle, string raison)
        {
            GameObject b = Bloc("M_" + libelle, corps, false, Px(1f));
            var v = b.GetComponent<VerticalLayoutGroup>();
            v.childAlignment = TextAnchor.MiddleCenter;
            v.padding = new RectOffset((int)Px(8f), (int)Px(8f), (int)Px(6f), (int)Px(6f));
            Image bf = b.AddComponent<Image>();
            bf.sprite = ProceduralUI.RoundedRectDashedOutline((int)Px(9f), Px(1f), (int)Px(4f), (int)Px(3f), Eteint);
            // ⛔ `Tiled`, PAS `Sliced` — et c'est le générateur lui-même qui le dit : « un contour
            //    de rectangle arrondi en POINTILLÉS, à utiliser en `Image.Type.Tiled` ». Les deux
            //    respectent le `border` du sprite et gardent les coins ; `Sliced` ÉTIRE la section
            //    centrale — qui porte exactement UNE période de pointillé — et la transforme en une
            //    longue barre, tandis que `Tiled` la RÉPÈTE. Mesuré par un juge ⊥ sur un cadre brisé :
            //    334 px de trou, 36 %, symétrique haut et bas parce que les deux rails partagent la
            //    même bande. ⇒ Classe fermée sur les 7 sites, pas seulement sur celui du rapport ;
            //    le remède était DÉJÀ en production sur deux sites de `LieutenantScreenController`.
            bf.type = Image.Type.Tiled;
            Texte(b.transform, "Lib", libelle, Px(9f), Eteint,
                  DesignTokens.Current.primaryFont, TextAlignmentOptions.Center).characterSpacing = 10f;
            Texte(b.transform, "R", raison, Px(6.8f), Creme2,
                  DesignTokens.Current.primaryFont, TextAlignmentOptions.Center).enableWordWrapping = true;
        }

        private static int CroyanceRang(string b) =>
            b == "HUNTING" ? 4 : b == "SUSPICIOUS" ? 3 : b == "WATCHFUL" ? 2 : b == "DORMANT" ? 1 : 0;

        private static string CroyanceMot(string b) =>
            b == "HUNTING" ? MafiaCleanCity.I18n.Libelle.De("police", "bloc", "EN CHASSE") : b == "SUSPICIOUS" ? MafiaCleanCity.I18n.Libelle.De("police", "bloc", "SOUPÇON")
            : b == "WATCHFUL" ? MafiaCleanCity.I18n.Libelle.De("police", "bloc", "EN VEILLE") : b == "DORMANT" ? MafiaCleanCity.I18n.Libelle.De("police", "bloc", "EN SOMMEIL") : "—";

        private static int PatrouilleRang(string b) =>
            b == "HIGH" ? 4 : b == "MEDIUM" ? 3 : b == "LOW" ? 2 : b == "QUIET" ? 1 : 0;

        private static string PatrouilleMot(string b) =>
            b == "HIGH" ? MafiaCleanCity.I18n.Libelle.De("police", "bloc", "Partout") : b == "MEDIUM" ? MafiaCleanCity.I18n.Libelle.De("police", "bloc", "Présente")
            : b == "LOW" ? MafiaCleanCity.I18n.Libelle.De("police", "bloc", "Clairsemée") : b == "QUIET" ? MafiaCleanCity.I18n.Libelle.De("police", "bloc", "Rien dans les rues") : "—";

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
            v.spacing = Px(9f);
            v.childControlWidth = true;
            v.childControlHeight = true;
            v.childForceExpandWidth = true;
            v.childForceExpandHeight = false;
            v.childAlignment = TextAnchor.UpperCenter;

            TextMeshProUGUI titre = Texte(transform, "Titre", "LE COMMISSARIAT", Px(13f), Or,
                                          DesignTokens.Current.hudSerifFont, TextAlignmentOptions.Center);
            titre.characterSpacing = 18f;

            GameObject c = Bloc("Corps", transform, false, Px(9f));
            corps = (RectTransform)c.transform;

            videTexte = Texte(transform, "Vide", "", Px(11f), Creme2,
                              DesignTokens.Current.hudSerifFont, TextAlignmentOptions.Center);
            videTexte.enableWordWrapping = true;
            videTexte.gameObject.SetActive(false);

            // ── L'ILLUSTRATION D'ÉTAT VIDE (⑰ Le commissariat) ──────────────────────────────────
            // ⛔ Elle ACCOMPAGNE le message, elle ne le remplace pas : le message NOMME,
            //    l'image lève seulement le doute « vide ou CASSÉ ? ». `null` n'enlève rien.
            // ⚠️ Sujet « police » ← `Tools/fal/TABLE-SUJET-ECRAN.md` : il couvre ⑮ ET ⑰.
            //    Mon appariement « évident » n'en voyait qu'un — la moitié du travail avec
            //    l'apparence de la totalité.
            videIllustration = MafiaCleanCity.Shell.EtatsVidesIllustres.Monter(transform, "police", Px(120f));
            if (videIllustration != null) videIllustration.gameObject.SetActive(false);
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

    /// <summary>⑰ — le commissariat du joueur, depuis les données SERVIES. Pur, testé hors réseau.</summary>
    public static class PrecinctDuJoueur
    {
        /// <summary>Le district du premier bâtiment servi ; -1 sans bâtiment.</summary>
        public static int QuartierDuJoueur(BatimentPossedeDto[] possedes)
        {
            if (possedes == null) return -1;
            foreach (BatimentPossedeDto b in possedes) if (b != null && b.district_id > 0) return b.district_id;
            return -1;
        }

        /// <summary>Le `precinct_id` que `world/districts` sert pour ce district ; -1 s'il n'y est pas.</summary>
        public static int PrecinctServi(System.Collections.Generic.List<MafiaCleanCity.CityMap.DistrictDto> districts, int districtId)
        {
            if (districts == null) return -1;
            foreach (MafiaCleanCity.CityMap.DistrictDto d in districts) if (d != null && d.id == districtId && d.precinct_id > 0) return d.precinct_id;
            return -1;
        }
    }
}
