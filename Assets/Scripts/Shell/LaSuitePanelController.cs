using System;
using System.Collections;
using System.Collections.Generic;
using TMPro;
using UnityEngine;
using UnityEngine.UI;
using MafiaCleanCity.Theme;

namespace MafiaCleanCity.Shell
{
    /// <summary>« LA SUITE » sur l'Accueil (cadre 4, table 72 — voir `LaSuite`). Un panneau de l'Accueil, pas un locataire : le shell le
    /// monte sur sa bande quand il n'y a pas de carte de tête, puis `Charger` lit l'état (source réseau, ou celle d'un test) et rend les
    /// lignes vraies. Le bloc épouse son contenu et s'ancre en BAS de sa bande, juste au-dessus de la ligne de file (la maquette laisse la
    /// ville visible au-dessus). Sans ligne vraie, rien ne se rend et `Rendue(false)` le dit au shell, qui garde la mise en page d'avant.</summary>
    public class LaSuitePanelController : MonoBehaviour
    {
        /// <summary>Levé une fois l'état lu : true si au moins une ligne est montrée.</summary>
        public event Action<bool> Rendue;

        public IReadOnlyList<LigneDeLaSuite> LignesRendues => lignesRendues;
        private readonly List<LigneDeLaSuite> lignesRendues = new List<LigneDeLaSuite>();
        public bool Visible => lignesRendues.Count > 0;
        public bool Lu { get; private set; }
        /// <summary>L'écran ouvert par le dernier geste (garde).</summary>
        public GameObject DernierGesteOuvert { get; private set; }

        private string laboId;
        private RectTransform bloc;

        public void Charger(string jeton, ISourceDeLaSuite source, bool carteDeTete)
        {
            if (source == null) { Rendre(new EtatDeLaSuite { CarteDeTete = carteDeTete }); return; }
            StartCoroutine(Lire(jeton, source, carteDeTete));
        }

        private IEnumerator Lire(string jeton, ISourceDeLaSuite source, bool carteDeTete)
        {
            EtatDeLaSuite lu = null;
            yield return source.Lire(jeton, carteDeTete, e => lu = e);
            Rendre(lu ?? new EtatDeLaSuite { CarteDeTete = carteDeTete });
        }

        /// <summary>Rend l'état : les lignes de `LaSuite.Lignes`, ou rien. Public pour les gardes hors réseau.</summary>
        public void Rendre(EtatDeLaSuite etat)
        {
            if (bloc != null) { Destroy(bloc.gameObject); bloc = null; }
            lignesRendues.Clear();
            laboId = etat?.LaboId;
            lignesRendues.AddRange(LaSuite.Lignes(etat));
            Lu = true;
            if (lignesRendues.Count > 0) Construire();
            Rendue?.Invoke(lignesRendues.Count > 0);
        }

        // ─────────────────────────────────────────────────────────────── construction

        private void Construire()
        {
            GameObject go = new GameObject("LaSuite", typeof(RectTransform));
            go.transform.SetParent(transform, false);
            bloc = (RectTransform)go.transform;
            bloc.anchorMin = new Vector2(0f, 0f);
            bloc.anchorMax = new Vector2(1f, 0f);
            bloc.pivot = new Vector2(0.5f, 0f);                        // ancré en BAS de la bande, il pousse vers le haut
            bloc.offsetMin = new Vector2(40f, 0f);
            bloc.offsetMax = new Vector2(-40f, 0f);
            Image fond = go.AddComponent<Image>();
            fond.color = DesignTokens.Current.surfaceCard;
            fond.raycastTarget = false;
            VerticalLayoutGroup vlg = go.AddComponent<VerticalLayoutGroup>();
            vlg.padding = new RectOffset(56, 56, 40, 48);
            vlg.spacing = 28;
            vlg.childControlWidth = true; vlg.childControlHeight = true;
            vlg.childForceExpandWidth = true; vlg.childForceExpandHeight = false;
            ContentSizeFitter fit = go.AddComponent<ContentSizeFitter>();
            fit.verticalFit = ContentSizeFitter.FitMode.PreferredSize;

            // Le filet d'or du haut (la maquette), puis l'intitulé en capitales espacées.
            GameObject filet = new GameObject("Filet", typeof(RectTransform));
            filet.transform.SetParent(go.transform, false);
            Image fi = filet.AddComponent<Image>();
            fi.color = DesignTokens.Current.ficheCtaOrBas;
            fi.raycastTarget = false;
            LayoutElement fle = filet.AddComponent<LayoutElement>();
            fle.minHeight = fle.preferredHeight = 2f;
            filet.transform.SetSiblingIndex(0);

            TextMeshProUGUI titre = Texte(go.transform, LaSuite.Titre().ToUpperInvariant(), 26, DesignTokens.Current.onSurfaceSecondary, DesignTokens.Current.primaryFont);
            titre.name = "Titre";
            titre.characterSpacing = 18;
            titre.fontStyle = FontStyles.Bold;
            titre.alignment = TextAlignmentOptions.Center;

            for (int i = 0; i < lignesRendues.Count; i++)
            {
                if (i > 0) Separateur(go.transform);
                Ligne(go.transform, lignesRendues[i], premierGeste: i == PremierGeste());
            }
            Ajuster();
        }

        /// <summary>Le bloc ne sort JAMAIS de sa bande : plus haut qu'elle (petit écran, trois lignes longues), il se réduit à l'échelle
        /// depuis son pied (pivot bas) au lieu de monter sur le bandeau. Mesuré au créneau du 26/09 : à la résolution du batch, le bloc
        /// montait à 541 pour un bandeau à 205 (AccueilCanon A7).</summary>
        public void Ajuster()
        {
            if (bloc == null) return;
            bloc.localScale = Vector3.one;
            LayoutRebuilder.ForceRebuildLayoutImmediate(bloc);
            float h = LayoutUtility.GetPreferredHeight(bloc);
            float dispo = ((RectTransform)transform).rect.height;
            float k = h > 0f && dispo > 0f && h > dispo ? dispo / h : 1f;
            bloc.localScale = new Vector3(k, k, 1f);
            Echelle = k;
        }

        /// <summary>L'échelle posée par `Ajuster` (1 = le bloc tient dans sa bande) — garde.</summary>
        public float Echelle { get; private set; } = 1f;

        private bool aAjuster;
        private void OnRectTransformDimensionsChange() => aAjuster = true;   // la bande a bougé (rebâtie) : ré-ajuster hors du layout
        private void LateUpdate()
        {
            if (!aAjuster) return;
            aAjuster = false;
            Ajuster();
        }

        /// <summary>L'index de la première ligne qui porte un geste — c'est elle qui est dorée.</summary>
        private int PremierGeste()
        {
            for (int i = 0; i < lignesRendues.Count; i++) if (lignesRendues[i].Geste != GesteDeLaSuite.Aucun) return i;
            return -1;
        }

        private void Separateur(Transform parent)
        {
            GameObject s = new GameObject("Separateur", typeof(RectTransform));
            s.transform.SetParent(parent, false);
            Image im = s.AddComponent<Image>();
            Color c = DesignTokens.Current.onSurfaceSecondary; c.a = 0.25f;
            im.color = c;
            im.raycastTarget = false;
            LayoutElement le = s.AddComponent<LayoutElement>();
            le.minHeight = le.preferredHeight = 2f;
        }

        private void Ligne(Transform parent, LigneDeLaSuite l, bool premierGeste)
        {
            GameObject row = new GameObject("Ligne_" + l.Id, typeof(RectTransform));
            row.transform.SetParent(parent, false);
            HorizontalLayoutGroup hlg = row.AddComponent<HorizontalLayoutGroup>();
            hlg.spacing = 32;
            hlg.childAlignment = TextAnchor.MiddleLeft;
            hlg.childControlWidth = true; hlg.childControlHeight = true;
            hlg.childForceExpandWidth = false; hlg.childForceExpandHeight = false;

            GameObject textes = new GameObject("Textes", typeof(RectTransform));
            textes.transform.SetParent(row.transform, false);
            VerticalLayoutGroup col = textes.AddComponent<VerticalLayoutGroup>();
            col.spacing = 8;
            col.childControlWidth = true; col.childControlHeight = true;
            col.childForceExpandWidth = true; col.childForceExpandHeight = false;
            textes.AddComponent<LayoutElement>().flexibleWidth = 1f;
            TextMeshProUGUI t = Texte(textes.transform, l.Titre, 44, DesignTokens.Current.ficheCtaOrHaut, DesignTokens.Current.hudSerifFont != null ? DesignTokens.Current.hudSerifFont : DesignTokens.Current.primaryFont);
            t.name = "TitreDeLigne";
            TextMeshProUGUI p = Texte(textes.transform, l.Phrase, 30, DesignTokens.Current.onSurfaceMuted, DesignTokens.Current.primaryFont);
            p.name = "Phrase";

            if (l.Geste == GesteDeLaSuite.Aucun || string.IsNullOrEmpty(l.MotDuGeste)) return;
            GameObject geste = new GameObject("Geste_" + l.Geste, typeof(RectTransform));
            geste.transform.SetParent(row.transform, false);
            Image im = geste.AddComponent<Image>();
            if (premierGeste) im.color = DesignTokens.Current.ficheCtaOrBas;               // le premier geste : l'or plein
            else { Color c = DesignTokens.Current.surfaceRow; im.color = c; }              // les suivants : sombres
            Button b = geste.AddComponent<Button>();
            b.targetGraphic = im;
            GesteDeLaSuite g = l.Geste;
            b.onClick.AddListener(() => Ouvrir(g));
            LayoutElement le = geste.AddComponent<LayoutElement>();
            le.minHeight = le.preferredHeight = 100f;
            le.minWidth = le.preferredWidth = 340f;
            le.flexibleWidth = 0f;
            TextMeshProUGUI mot = Texte(geste.transform, l.MotDuGeste.ToUpperInvariant(), 28,
                premierGeste ? DesignTokens.Current.ficheCtaOrEncre : DesignTokens.Current.onSurfacePrimary, DesignTokens.Current.primaryFont);
            mot.fontStyle = FontStyles.Bold;
            mot.characterSpacing = 10;
            mot.alignment = TextAlignmentOptions.Center;
            mot.enableWordWrapping = false;
            mot.GetComponent<LayoutElement>().ignoreLayout = true;
            RectTransform mrt = (RectTransform)mot.transform;
            mrt.anchorMin = Vector2.zero; mrt.anchorMax = Vector2.one; mrt.offsetMin = mrt.offsetMax = Vector2.zero;
        }

        private static TextMeshProUGUI Texte(Transform parent, string valeur, float taille, Color couleur, TMP_FontAsset police)
        {
            GameObject go = new GameObject("Texte", typeof(RectTransform));
            go.transform.SetParent(parent, false);
            TextMeshProUGUI t = go.AddComponent<TextMeshProUGUI>();
            t.font = police;
            t.text = valeur;
            t.fontSize = taille;
            t.color = couleur;
            t.enableWordWrapping = true;
            t.raycastTarget = false;
            go.AddComponent<LayoutElement>();
            return t;
        }

        // ─────────────────────────────────────────────────────────────── gestes

        /// <summary>Le geste d'une ligne, PAR LE SHELL (en surimpression) : ㉚ la chaîne d'appro, ② la fiche du labo, ㉟ la vente, ⑧ les règles,
        /// ㊵ la filière (blanchir).</summary>
        public void Ouvrir(GesteDeLaSuite geste)
        {
            IShellNavigator nav = ShellNavigatorLocator.Find();
            MonoBehaviour ouvert = OuvrirPar(nav, geste, laboId);
            if (ouvert != null) DernierGesteOuvert = ouvert.gameObject;
        }

        /// <summary>Pur sur le navigateur : la garde le pilote avec un navigateur de test.</summary>
        public static MonoBehaviour OuvrirPar(IShellNavigator nav, GesteDeLaSuite geste, string laboId)
        {
            if (nav == null) return null;
            switch (geste)
            {
                case GesteDeLaSuite.Commander:
                    return nav.MonterLocataireEnSurimpression<MafiaCleanCity.Operational.ChaineDApproScreenController>();
                case GesteDeLaSuite.Cuire:
                    return OuvertureFicheOperationnelle.Ouvrir(nav, laboId);
                case GesteDeLaSuite.VoirLaVente:
                case GesteDeLaSuite.Ramasser:
                    return nav.MonterLocataireEnSurimpression<MafiaCleanCity.Operational.Selling.SellingScreenController>();
                case GesteDeLaSuite.EcrireUneRegle:
                    return nav.MonterLocataireEnSurimpression<MafiaCleanCity.Operational.Lieutenant.LieutenantScreenController>();
                case GesteDeLaSuite.Blanchir:
                    return nav.MonterLocataireEnSurimpression<MafiaCleanCity.Operational.FiliereScreenController>();   // ㊵ la filière
                default:
                    return null;
            }
        }
    }
}
