using System.Collections;
using NUnit.Framework;
using UnityEngine;
using UnityEngine.UI;
using UnityEngine.TestTools;
using MafiaCleanCity.Operational.Selling;
using Object = UnityEngine.Object;

namespace MafiaCleanCity.Operational.Selling.Tests
{
    /// ⛔ CE QUE CETTE SUITE EXISTE POUR ATTRAPER, ET POURQUOI LA PRÉCÉDENTE NE POUVAIT PAS.
    /// B1 de ㉟ a été « fermé » sur le critère « un `ProceduralUI` a-t-il tourné sur le châssis ? ».
    /// La réponse était OUI, et le cerne ne dessinait RIEN sur les bords : mesuré sur planche,
    /// 0/667 pixels dorés à gauche, 0/667 à droite, 0/357 en haut, 0/357 en bas — l'or ne vivait
    /// qu'en une « pilule » de 1010 × 20 px au milieu de la pile.
    ///
    /// ★★★ LA CAUSE : `Cerne` est enfant d'un `gameObject` qui porte un `VerticalLayoutGroup` à
    ///     `childControlWidth/Height = true`. Le groupe RÉÉCRIT ancres et offsets de ses enfants ⇒
    ///     un recouvrement plein cadre devient une RANGÉE de la pile.
    /// ★★★ ET LA LEÇON, qui vaut plus que le correctif : *un sprite qui rend dans un rect écrasé
    ///     rend quand même.* Une garde sur « le mécanisme s'est exécuté » ne peut pas voir
    ///     « il s'est exécuté dans le mauvais rect ». C'est la garde sur les PARAMÈTRES contre la
    ///     garde sur l'EFFET, appliquée à la GÉOMÉTRIE au lieu de l'opacité — la même famille que
    ///     le halo dont les trois propriétés étaient vraies pour zéro pixel produit.
    ///
    /// ⛔ ET LE PIÈGE DE TIMING QUI REND CETTE SUITE NON TRIVIALE : les quatre lignes qui posent
    ///    ancres et offsets sont JUSTES. Elles sont annulées PLUS TARD, quand le groupe reconstruit.
    ///    Une assertion prise dans la frame de construction lirait les bonnes valeurs et passerait
    ///    au vert SUR LE DÉFAUT. D'où le `ForceRebuildLayoutImmediate` avant toute mesure.
    [Category("ChassisVente")]
    public class ChassisVenteRectPlayModeTests
    {
        private GameObject hote;

        [TearDown]
        public void TearDown()
        {
            if (hote == null) return;
            Canvas c = hote.GetComponentInParent<Canvas>();
            if (c != null && c.gameObject != hote) Object.Destroy(c.gameObject);
            Object.Destroy(hote);
        }

        private static RectTransform TrouverCerne(GameObject racine)
        {
            foreach (RectTransform rt in racine.GetComponentsInChildren<RectTransform>(true))
                if (rt.name == "Cerne") return rt;
            return null;
        }

        [UnityTest]
        public IEnumerator B1_LeCerneCouvreLeChassis_ApresReconstructionDuLayout()
        {
            var canvasGo = new GameObject("CanvasVente", typeof(Canvas), typeof(CanvasScaler), typeof(GraphicRaycaster));
            var canvas = canvasGo.GetComponent<Canvas>();
            canvas.renderMode = RenderMode.ScreenSpaceOverlay;

            hote = new GameObject("EcranVente", typeof(RectTransform));
            hote.transform.SetParent(canvasGo.transform, false);
            var rt = (RectTransform)hote.transform;
            rt.anchorMin = Vector2.zero; rt.anchorMax = Vector2.one;
            rt.offsetMin = Vector2.zero; rt.offsetMax = Vector2.zero;
            hote.AddComponent<SellingScreenController>();   // Awake() → Init() → Construire()

            yield return null;
            LayoutRebuilder.ForceRebuildLayoutImmediate(rt);
            yield return null;

            RectTransform cerne = TrouverCerne(hote);
            // ⛔ ANTI-VACUITÉ D'ABORD : sans cerne du tout, toute assertion sur son rect serait
            //    vraie à vide — et c'est exactement l'état d'avant le lot B1.
            Assert.IsNotNull(cerne, "le cerne doit exister — c'est lui qui porte B1");
            Image img = cerne.GetComponent<Image>();
            Assert.IsNotNull(img, "le cerne doit porter une Image");
            Assert.IsNotNull(img.sprite, "l'Image du cerne doit porter un sprite (le filet procédural)");

            float pw = rt.rect.width, ph = rt.rect.height;
            Assert.Greater(pw, 0f, "anti-vacuité — le châssis a une largeur");
            Assert.Greater(ph, 0f, "anti-vacuité — le châssis a une hauteur");

            // ⛔ LA GARDE D'EFFET : le cerne COUVRE le châssis. Un plein cadre moins 5 px d'inset en
            //    fait plus de 95 % ; la « pilule » mesurée sur planche en faisait ~5 % en hauteur.
            //    Le plancher à 0,80 laisse toute la place aux insets et n'en laisse aucune à une
            //    rangée de pile.
            Assert.Greater(cerne.rect.height / ph, 0.80f,
                $"le cerne ne couvre que {100f * cerne.rect.height / ph:0.#} % de la HAUTEUR du "
                + "châssis — c'est une rangée de la pile, pas un cadre. (Cause connue : un "
                + "recouvrement plein cadre enfant d'un groupe de layout qui pilote ses enfants ; "
                + "remède : `LayoutElement.ignoreLayout = true`.)");
            Assert.Greater(cerne.rect.width / pw, 0.80f,
                $"le cerne ne couvre que {100f * cerne.rect.width / pw:0.#} % de la LARGEUR du châssis");

            // ⛔⛔ CONTRÔLE POSITIF — on DÉSARME le remède et on exige que la garde tombe. Sans lui,
            //    une garde verte ne prouve pas qu'elle sait rougir : le châssis pourrait couvrir
            //    98 % pour une raison sans rapport avec `ignoreLayout`, et l'assertion ci-dessus
            //    resterait verte le jour où quelqu'un retire la ligne.
            LayoutElement le = cerne.GetComponent<LayoutElement>();
            Assert.IsNotNull(le, "le cerne doit porter un LayoutElement — c'est le remède lui-même");
            Assert.IsTrue(le.ignoreLayout, "et il doit ignorer le layout");
            le.ignoreLayout = false;
            LayoutRebuilder.ForceRebuildLayoutImmediate(rt);
            yield return null;
            Assert.Less(cerne.rect.height / ph, 0.80f,
                "⛔ CONTRÔLE POSITIF MUET : en retirant `ignoreLayout`, le cerne devrait s'écraser "
                + "en une rangée de la pile. Il ne s'écrase pas ⇒ la garde ci-dessus passe pour une "
                + "raison SANS RAPPORT avec le défaut qu'elle prétend surveiller, et elle resterait "
                + "verte le jour où la ligne est retirée.");
        }
    }
}
