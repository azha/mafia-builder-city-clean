using System;
using TMPro;
using UnityEngine;
using UnityEngine.UI;
using MafiaCleanCity.I18n;
using MafiaCleanCity.Theme;

namespace MafiaCleanCity.Shell
{
    /// <summary>B5 — « La partie n'a pas pu commencer » (table 79 de l'atelier @f81ad7cb), monté À LA PLACE de l'Accueil quand le compte
    /// de l'appareil n'a pas pu être créé ni retrouvé (réseau coupé, back injoignable). Jamais un Accueil vide, jamais le compte de démo.
    /// « Réessayer » relance l'acquisition. Un compte SANCTIONNÉ (403) montre la phrase SERVIE du refus, et pas de « Réessayer ».</summary>
    public class EcranEchecDeDemarrage : MonoBehaviour
    {
        public string Titre { get; private set; }
        public string Phrase { get; private set; }
        public Button BoutonReessayer { get; private set; }

        public static EcranEchecDeDemarrage Construire(Transform parent, string phraseServie, Action reessayer)
        {
            var go = new GameObject("EchecDeDemarrage", typeof(RectTransform));
            go.transform.SetParent(parent, false);
            var rt = (RectTransform)go.transform;
            rt.anchorMin = Vector2.zero; rt.anchorMax = Vector2.one; rt.offsetMin = rt.offsetMax = Vector2.zero;
            go.transform.SetAsLastSibling();
            go.AddComponent<Image>().color = DesignTokens.Current.surfaceBase;
            var e = go.AddComponent<EcranEchecDeDemarrage>();

            var col = new GameObject("Colonne", typeof(RectTransform));
            col.transform.SetParent(go.transform, false);
            var crt = (RectTransform)col.transform;
            crt.anchorMin = new Vector2(0f, 0.5f); crt.anchorMax = new Vector2(1f, 0.5f); crt.pivot = new Vector2(0.5f, 0.5f);
            crt.offsetMin = new Vector2(80f, 0f); crt.offsetMax = new Vector2(-80f, 0f);
            var vlg = col.AddComponent<VerticalLayoutGroup>();
            vlg.spacing = 36; vlg.childAlignment = TextAnchor.MiddleCenter;
            vlg.childControlWidth = true; vlg.childControlHeight = true; vlg.childForceExpandWidth = true; vlg.childForceExpandHeight = false;
            col.AddComponent<ContentSizeFitter>().verticalFit = ContentSizeFitter.FitMode.PreferredSize;

            e.Titre = Libelle.Gabarit("demarrage.echec.la_partie_n_a_pas_pu_commencer", "La partie n’a pas pu commencer");
            e.Phrase = !string.IsNullOrWhiteSpace(phraseServie) ? phraseServie
                : Libelle.Gabarit("demarrage.echec.la_ville_ne_repond_pas_verifiez_votre_connexion_puis_reessayez",
                                  "La ville ne répond pas. Vérifiez votre connexion, puis réessayez.");
            Texte(col.transform, "Titre", e.Titre, 46, DesignTokens.Current.ficheCtaOrHaut,
                  DesignTokens.Current.hudSerifFont != null ? DesignTokens.Current.hudSerifFont : DesignTokens.Current.primaryFont);
            Texte(col.transform, "Phrase", e.Phrase, 30, DesignTokens.Current.onSurfaceMuted, DesignTokens.Current.primaryFont);

            if (reessayer != null)
            {
                var b = new GameObject("Reessayer", typeof(RectTransform));
                b.transform.SetParent(col.transform, false);
                var im = b.AddComponent<Image>();
                LaSuitePanelController.Arrondir(im, LaSuitePanelController.RayonGeste, DesignTokens.Current.ficheCtaOrBas);
                LaSuitePanelController.Lisere(b.transform, LaSuitePanelController.RayonGeste, DesignTokens.Current.ficheCtaOrBord);
                var le = b.AddComponent<LayoutElement>();
                le.minHeight = le.preferredHeight = 100f;
                e.BoutonReessayer = b.AddComponent<Button>();
                e.BoutonReessayer.targetGraphic = im;
                e.BoutonReessayer.onClick.AddListener(() => reessayer());
                var mot = Texte(b.transform, "Mot", Libelle.Gabarit("demarrage.echec.reessayer", "Réessayer").ToUpperInvariant(), 28,
                                DesignTokens.Current.ficheCtaOrEncre, DesignTokens.Current.primaryFont);
                mot.fontStyle = FontStyles.Bold; mot.characterSpacing = 10;
                mot.GetComponent<LayoutElement>().ignoreLayout = true;
                var mrt = (RectTransform)mot.transform;
                mrt.anchorMin = Vector2.zero; mrt.anchorMax = Vector2.one; mrt.offsetMin = mrt.offsetMax = Vector2.zero;
            }
            return e;
        }

        private static TextMeshProUGUI Texte(Transform parent, string nom, string valeur, float taille, Color couleur, TMP_FontAsset police)
        {
            var go = new GameObject(nom, typeof(RectTransform));
            go.transform.SetParent(parent, false);
            var t = go.AddComponent<TextMeshProUGUI>();
            t.font = police; t.text = valeur; t.fontSize = taille; t.color = couleur;
            t.alignment = TextAlignmentOptions.Center; t.enableWordWrapping = true; t.raycastTarget = false;
            go.AddComponent<LayoutElement>();
            return t;
        }
    }
}
