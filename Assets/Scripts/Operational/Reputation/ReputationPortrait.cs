using UnityEngine;
using UnityEngine.UI;
using TMPro;
using MafiaCleanCity.Shell;
using MafiaCleanCity.Theme;

namespace MafiaCleanCity.Operational
{
    /// <summary>Le portrait du lieutenant — l'objet où le back « rend des instructions de
    /// dessin » au sens littéral.
    ///
    /// Cinq clés du corps de réponse pilotent cinq traits, et AUCUN n'est décoratif :
    ///   `portrait_posture` → l'inclinaison du buste et la direction du regard
    ///   `uniform_tells.collar`  → le col, ouvert ou fermé
    ///   `uniform_tells.sleeves` → les revers de manches
    ///   `uniform_tells.watch`   → la montre au poignet
    ///   `uniform_tells.gloves`  → les gants, clairs ou salis
    ///
    /// ⚠️ C'est le portrait DU LIEUTENANT, et lui seul. La tenue qu'il porte décrit ce qu'il a
    /// absorbé de VOS règles — d'où « le miroir ». Un second portrait « joueur » attribuerait à
    /// l'un ce qui décrit l'autre (canon `reputation_mechanics.md:233` : les deux jeux d'indices
    /// sur le MÊME portrait).</summary>
    public class ReputationPortrait : MonoBehaviour
    {
        private RectTransform racinePleinEcran;
        private RectTransform buste;      // porte la rotation de posture
        private Image col, revresG, revresD, montre, gantG;
        private Image oeilG, oeilD;
        private TextMeshProUGUI verdict;
        private TextMeshProUGUI reference;
        private RectTransform zoneDessin;

        // Le viewBox de la maquette est 62×78 : toute coordonnée ci-dessous est exprimée DEDANS,
        // puis mise à l'échelle une seule fois. Recopier des px d'écran ici rendrait le portrait
        // juste à une résolution et faux partout ailleurs.
        private const float VbL = 62f, VbH = 78f;
        private const float LargeurCss = 96f;   // .prt svg width — maquette v2

        public void Construire(RectTransform racine)
        {
            racinePleinEcran = racine;
            float ech = EchelleMaquette.Px(LargeurCss, racinePleinEcran,
                                           EchelleMaquette.LargeurEcransBrennar6) / VbL;

            VerticalLayoutGroup v = gameObject.AddComponent<VerticalLayoutGroup>();
            v.spacing = Px(6f);
            v.padding = new RectOffset(PxI(8f), PxI(8f), PxI(8f), PxI(9f));
            v.childControlWidth = true; v.childControlHeight = true;
            v.childForceExpandWidth = true; v.childForceExpandHeight = false;
            v.childAlignment = TextAnchor.UpperCenter;

            TextMeshProUGUI titre = Texte("Titre", "SALVATORE, VOTRE LIEUTENANT", 5.6f,
                                          ReputationResolvers.Muet, transform);
            titre.alignment = TextAlignmentOptions.Center;
            titre.characterSpacing = 14f;

            // La zone de dessin : un rectangle aux proportions du viewBox.
            GameObject zone = Nouveau("Dessin", transform);
            zoneDessin = (RectTransform)zone.transform;
            LayoutElement le = zone.AddComponent<LayoutElement>();
            le.preferredWidth = ech * VbL;
            le.preferredHeight = ech * VbH;
            le.flexibleWidth = 0f; le.flexibleHeight = 0f;

            // Le buste porte la ROTATION — c'est lui qui s'incline, pas les traits séparément.
            GameObject bu = Nouveau("Buste", zone.transform);
            buste = (RectTransform)bu.transform;
            Etirer(buste);

            // Les traits, du fond vers l'avant. L'ordre de fratrie EST la profondeur : c'est une
            // propriété STRUCTURELLE, testable sans lire un pixel — et c'est ce type de garde
            // qui a fermé ici une classe entière de défauts d'occlusion que quatre tours de
            // gardes pixel n'avaient pas vue.
            Forme(ref _epaules, "Epaules", buste, ReputationResolvers.Carte2,
                  new Rect(6f, 55f, 50f, 23f), ech);
            col = FormeTriangle("Col", buste, ReputationResolvers.Creme, ech);
            revresG = null; revresD = null;
            Forme(ref revresG, "RevresG", buste, ReputationResolvers.Creme,
                  new Rect(9f, 66f, 7f, 5f), ech);
            Forme(ref revresD, "RevresD", buste, ReputationResolvers.Creme,
                  new Rect(47f, 66f, 7f, 5f), ech);
            Forme(ref montre, "Montre", buste, ReputationResolvers.OrVif,
                  new Rect(46f, 72f, 8f, 3.4f), ech);
            Forme(ref gantG, "GantG", buste, ReputationResolvers.Creme2,
                  new Rect(7f, 71.6f, 10f, 6.8f), ech);
            Forme(ref _cou, "Cou", buste, ReputationResolvers.Creme2,
                  new Rect(26f, 48f, 10f, 10f), ech);
            Forme(ref _tete, "Tete", buste, ReputationResolvers.Creme2,
                  new Rect(18.5f, 17f, 25f, 30f), ech, arrondi: true);
            Forme(ref _cheveux, "Cheveux", buste, ReputationResolvers.Carte2,
                  new Rect(18f, 10f, 26f, 16f), ech, arrondi: true);
            Forme(ref oeilG, "OeilG", buste, ReputationResolvers.Encre,
                  new Rect(24.6f, 29.7f, 3.8f, 4.6f), ech, arrondi: true);
            Forme(ref oeilD, "OeilD", buste, ReputationResolvers.Encre,
                  new Rect(33.6f, 29.7f, 3.8f, 4.6f), ech, arrondi: true);
            baseOeilGX = ((RectTransform)oeilG.transform).anchoredPosition.x;
            baseOeilDX = ((RectTransform)oeilD.transform).anchoredPosition.x;

            verdict = Texte("Verdict", "", 8.6f, ReputationResolvers.Creme, transform);
            verdict.alignment = TextAlignmentOptions.Center;
            verdict.font = DesignTokens.Current.hudSerifFont;

            // ⛔ LE TROU, ÉCRIT À L'ÉCRAN PLUTÔT QUE MASQUÉ. « Salvatore » est une FICTION de
            // maquette : `lieutenant.name` existe en base (varchar 64, NOT NULL) et n'est rendu
            // par AUCUNE des deux projections joueur mesurées (5 clés et 17 clés). Tant que le
            // lot back ne le projette pas, l'écran le dit — il ne fabrique pas un nom et ne fait
            // pas semblant que la question ne se pose pas.
            reference = Texte("Reference", "lieutenant.name — non projeté (L0.4)", 5f,
                              ReputationResolvers.Eteint, transform);
            reference.alignment = TextAlignmentOptions.Center;
        }

        private Image _epaules, _cou, _tete, _cheveux;

        /// <summary>Applique les cinq clés. `tells` peut être null (échec de lecture) : tout
        /// s'éteint alors, ce qui est l'état neutre — jamais un état inventé.</summary>
        public void Appliquer(UniformTellsDto tells, string posture)
        {
            float deg = ReputationResolvers.PostureInclinaisonDeg(posture);
            // Le pivot d'inclinaison est en BAS du buste (rotate(deg 31 70) du viewBox) : un
            // buste qui pivoterait par son centre décollerait des épaules.
            buste.pivot = new Vector2(31f / VbL, 1f - 70f / VbH);
            buste.localRotation = Quaternion.Euler(0f, 0f, -deg);

            bool colFerme = tells != null && tells.ActifEstAbsorbe(UniformTellsDto.Pose.Collar);
            bool manches  = tells != null && tells.ActifEstAbsorbe(UniformTellsDto.Pose.Sleeves);
            bool montreOn = tells != null && tells.ActifEstAbsorbe(UniformTellsDto.Pose.Watch);
            bool gantsOk  = tells != null && tells.ActifEstAbsorbe(UniformTellsDto.Pose.Gloves);

            // Le col : fermé = échancrure étroite ; ouvert = large. La maquette déplace les deux
            // points hauts du triangle (24/38 ouvert contre 27/35 fermé).
            if (col != null)
            {
                RectTransform crt = (RectTransform)col.transform;
                float largeurVb = colFerme ? 8f : 14f;
                float ech = EchelleActuelle();
                crt.sizeDelta = new Vector2(largeurVb * ech, 14f * ech);
            }

            if (revresG != null) revresG.enabled = manches;
            if (revresD != null) revresD.enabled = manches;
            if (montre != null) montre.enabled = montreOn;
            if (gantG != null)
                gantG.color = gantsOk ? ReputationResolvers.Creme2 : ReputationResolvers.Rang;

            // Le regard suit la posture — la seule chose qui distingue `attentive` d'`hostile`
            // au premier coup d'œil, l'inclinaison étant lente à lire.
            //
            // ⚠️ Le décalage s'AJOUTE à la position de base, il ne la remplace pas. La première
            // version de ces trois lignes écrivait `anchoredPosition.x = dx`, ce qui collait les
            // DEUX yeux à la même abscisse : les deux ovales se superposaient au bord gauche du
            // crâne dès que la posture n'était pas `attentive` (dx=0) — et `attentive` étant la
            // valeur d'un compte frais, le défaut serait resté invisible à tout test qui ne
            // change pas de posture. D'où les positions de base mémorisées au montage.
            float dx = DecalageRegard(posture) * EchelleActuelle();
            if (oeilG != null) PoserX((RectTransform)oeilG.transform, baseOeilGX + dx);
            if (oeilD != null) PoserX((RectTransform)oeilD.transform, baseOeilDX + dx);
        }

        public void DefinirVerdict(string phrase, Color couleur)
        {
            if (verdict == null) return;
            verdict.text = phrase;
            verdict.color = couleur;
        }

        /// <summary>Le portrait quand la lecture a échoué : neutre et éteint, jamais un état
        /// plausible qu'on n'a pas mesuré.</summary>
        public void Eteindre()
        {
            Appliquer(null, "attentive");
            DefinirVerdict("—", ReputationResolvers.Muet);
        }

        private static float DecalageRegard(string posture)
        {
            switch (posture)
            {
                case "attentive": return 0f;
                case "cautious":  return -1.6f;
                case "withdrawn": return -3f;
                case "hostile":   return 2.4f;
                default:          return 0f;
            }
        }

        private float EchelleActuelle() =>
            EchelleMaquette.Px(LargeurCss, racinePleinEcran,
                               EchelleMaquette.LargeurEcransBrennar6) / VbL;

        private float Px(float css) =>
            EchelleMaquette.Px(css, racinePleinEcran, EchelleMaquette.LargeurEcransBrennar6);

        private int PxI(float css) =>
            EchelleMaquette.PxTrait(css, racinePleinEcran, EchelleMaquette.LargeurEcransBrennar6);

        /// <summary>Les abscisses des yeux AU MONTAGE, mémorisées une fois. Sans elles, appliquer
        /// un décalage de regard revient à écraser la position — voir la note dans
        /// <see cref="Appliquer"/>.</summary>
        private float baseOeilGX, baseOeilDX;

        private static void PoserX(RectTransform rt, float x) =>
            rt.anchoredPosition = new Vector2(x, rt.anchoredPosition.y);

        private void Forme(ref Image cible, string nom, Transform parent, Color couleur,
                           Rect vb, float ech, bool arrondi = false)
        {
            GameObject go = Nouveau(nom, parent);
            RectTransform rt = (RectTransform)go.transform;
            rt.anchorMin = new Vector2(0f, 1f);
            rt.anchorMax = new Vector2(0f, 1f);
            rt.pivot = new Vector2(0f, 1f);
            rt.anchoredPosition = new Vector2(vb.x * ech, -vb.y * ech);
            rt.sizeDelta = new Vector2(vb.width * ech, vb.height * ech);

            if (go.GetComponent<CanvasRenderer>() == null) go.AddComponent<CanvasRenderer>();
            Image img = go.AddComponent<Image>();
            img.color = couleur;
            img.raycastTarget = false;
            if (arrondi)
            {
                img.sprite = ProceduralUI.RoundedRectMask(
                    Mathf.Max(1, Mathf.RoundToInt(Mathf.Min(vb.width, vb.height) * ech * 0.5f)));
                img.type = Image.Type.Sliced;
            }
            cible = img;
        }

        private Image FormeTriangle(string nom, Transform parent, Color couleur, float ech)
        {
            // Le col est un triangle dans la maquette ; faute de primitive triangulaire, on pose
            // un rectangle étroit qui en tient le rôle de signal (fermé/ouvert se lit à la
            // LARGEUR, pas à la forme). ⚠️ Écart de forme ASSUMÉ, à consigner au dossier du juge
            // visuel : c'est une simplification volontaire, pas un oubli — et le juge doit la
            // recevoir écrite plutôt que la découvrir.
            Image img = null;
            Forme(ref img, nom, parent, couleur, new Rect(27f, 56f, 8f, 14f), ech);
            return img;
        }

        private TextMeshProUGUI Texte(string nom, string contenu, float corpsCss, Color couleur,
                                      Transform parent)
        {
            GameObject go = Nouveau(nom, parent);
            if (go.GetComponent<CanvasRenderer>() == null) go.AddComponent<CanvasRenderer>();
            TextMeshProUGUI t = go.AddComponent<TextMeshProUGUI>();
            t.font = DesignTokens.Current.primaryFont;
            t.text = contenu;
            t.fontSize = PxI(corpsCss);
            t.color = couleur;
            t.raycastTarget = false;
            return t;
        }

        private static GameObject Nouveau(string nom, Transform parent)
        {
            GameObject go = new GameObject(nom, typeof(RectTransform));
            go.transform.SetParent(parent, false);
            return go;
        }

        private static void Etirer(RectTransform rt)
        {
            rt.anchorMin = Vector2.zero;
            rt.anchorMax = Vector2.one;
            rt.offsetMin = Vector2.zero;
            rt.offsetMax = Vector2.zero;
        }
    }

    /// <summary>Une ligne de voyant : la pastille, le libellé de la pose, et ce qu'elle veut
    /// dire. Allumée = la vertu a été ABSORBÉE par le lieutenant.
    ///
    /// ⚠️ Ce composant ne DÉCIDE jamais de son état : il le reçoit. La polarité vit dans
    /// `UniformTellsDto.ActifEstAbsorbe` et nulle part ailleurs — c'est ce qui permet à une
    /// garde de sortie (« un lieutenant vierge allume zéro voyant ») de mordre sur une propriété
    /// plutôt que sur des libellés.</summary>
    public class TellVoyant : MonoBehaviour
    {
        private Image fond, contour, lumiere;
        private TextMeshProUGUI titre, sens;

        public bool EstAllume { get; private set; }

        public static TellVoyant Construire(Transform parent, ReputationScreenController ecran)
        {
            GameObject go = new GameObject("Voyant", typeof(RectTransform));
            go.transform.SetParent(parent, false);
            TellVoyant v = go.AddComponent<TellVoyant>();
            v.Batir(ecran);
            return v;
        }

        private void Batir(ReputationScreenController ecran)
        {
            if (gameObject.GetComponent<CanvasRenderer>() == null)
                gameObject.AddComponent<CanvasRenderer>();
            fond = gameObject.AddComponent<Image>();
            fond.color = ReputationResolvers.Panneau;
            fond.raycastTarget = false;

            GameObject bord = new GameObject("Contour", typeof(RectTransform), typeof(CanvasRenderer));
            bord.transform.SetParent(transform, false);
            RectTransform brt = (RectTransform)bord.transform;
            brt.anchorMin = Vector2.zero; brt.anchorMax = Vector2.one;
            brt.offsetMin = Vector2.zero; brt.offsetMax = Vector2.zero;
            contour = bord.AddComponent<Image>();
            contour.sprite = ProceduralUI.RoundedRectOutline(ecran.PxTraitPublic(2f),
                                                             ecran.PxTraitPublic(1f), Color.white);
            contour.type = Image.Type.Sliced;
            contour.color = ReputationResolvers.Lisere;
            contour.raycastTarget = false;

            // Les mesures viennent des constantes du contrôleur, jamais de littéraux recopiés :
            // deux sources pour une même valeur, c'est la garantie qu'elles divergeront.
            // ⛔ SANS HAUTEUR PRÉFÉRÉE, LES QUATRE VOYANTS SE PARTAGENT TOUTE LA COLONNE.
            // Mesuré sur la capture du run 14 : chaque voyant occupait ~200 px de haut là où la
            // maquette lui en donne ~24 (`.tl{padding:5px 8px}` autour d'un titre de 7,4 px et
            // d'un sens de 5,4 px). Le texte flottait alors au milieu d'un bloc vide, et la
            // pastille ronde s'étirait en ovale vertical.
            LayoutElement leV = gameObject.AddComponent<LayoutElement>();
            leV.minHeight = ecran.PxPublic(ReputationScreenController.CssVoyantTitre
                                         + ReputationScreenController.CssVoyantSens
                                         + 2f * ReputationScreenController.CssVoyantPadY + 3f);
            leV.preferredHeight = leV.minHeight;
            leV.flexibleHeight = 0f;

            HorizontalLayoutGroup h = gameObject.AddComponent<HorizontalLayoutGroup>();
            h.spacing = ecran.PxPublic(ReputationScreenController.CssVoyantEcart);
            h.padding = new RectOffset(
                ecran.PxTraitPublic(ReputationScreenController.CssVoyantPadX),
                ecran.PxTraitPublic(ReputationScreenController.CssVoyantPadX),
                ecran.PxTraitPublic(ReputationScreenController.CssVoyantPadY),
                ecran.PxTraitPublic(ReputationScreenController.CssVoyantPadY));
            h.childControlWidth = true; h.childControlHeight = true;
            h.childForceExpandWidth = false;
            h.childAlignment = TextAnchor.MiddleLeft;

            GameObject lum = new GameObject("Lumiere", typeof(RectTransform), typeof(CanvasRenderer));
            lum.transform.SetParent(transform, false);
            lumiere = lum.AddComponent<Image>();
            int d = ecran.PxTraitPublic(ReputationScreenController.CssVoyantDiam);
            lumiere.sprite = ProceduralUI.RadialDisc(d, Color.white, Color.white);
            lumiere.color = ReputationResolvers.Lisere;
            lumiere.raycastTarget = false;
            LayoutElement lle = lum.AddComponent<LayoutElement>();
            lle.preferredWidth = d; lle.preferredHeight = d;
            lle.minWidth = d; lle.minHeight = d;
            // ⛔ `flexibleHeight = 0` AUSSI : sans lui la pastille suit la hauteur de la ligne et
            // le disque devient un OVALE vertical — mesuré sur la capture du run 14. Une pastille
            // est CARRÉE par définition ; c'est une contrainte de forme, pas de taille.
            lle.flexibleWidth = 0f; lle.flexibleHeight = 0f;

            GameObject colonne = new GameObject("Textes", typeof(RectTransform));
            colonne.transform.SetParent(transform, false);
            VerticalLayoutGroup v = colonne.AddComponent<VerticalLayoutGroup>();
            v.spacing = ecran.PxPublic(1f);
            v.childControlWidth = true; v.childControlHeight = true;
            v.childForceExpandWidth = true;
            LayoutElement cle = colonne.AddComponent<LayoutElement>();
            cle.flexibleWidth = 1f;

            titre = Texte(colonne.transform, "Titre", ecran.PxTraitPublic(ReputationScreenController.CssVoyantTitre),
                          ReputationResolvers.Creme2);
            sens = Texte(colonne.transform, "Sens", ecran.PxTraitPublic(ReputationScreenController.CssVoyantSens),
                         ReputationResolvers.Eteint);
        }

        public void Appliquer(string libelle, string signification, bool allume)
        {
            EstAllume = allume;
            titre.text = libelle;
            sens.text = signification;

            // Allumé : bordure dorée, fond légèrement relevé, pastille dorée, titre en crème
            // pleine. Éteint : tout retombe au repos. C'est un ÉTAT BINAIRE — il n'y a pas de
            // demi-absorption, et une opacité intermédiaire en inventerait une.
            contour.color = allume ? ReputationResolvers.OrFilet : ReputationResolvers.Lisere;
            fond.color = allume ? ReputationResolvers.Carte2 : ReputationResolvers.Panneau;
            lumiere.color = allume ? ReputationResolvers.OrVif : ReputationResolvers.Lisere;
            titre.color = allume ? ReputationResolvers.Creme : ReputationResolvers.Creme2;
        }

        private static TextMeshProUGUI Texte(Transform parent, string nom, float corps, Color c)
        {
            GameObject go = new GameObject(nom, typeof(RectTransform), typeof(CanvasRenderer));
            go.transform.SetParent(parent, false);
            TextMeshProUGUI t = go.AddComponent<TextMeshProUGUI>();
            t.font = DesignTokens.Current.primaryFont;
            t.fontSize = corps;
            t.color = c;
            t.raycastTarget = false;
            return t;
        }
    }
}
