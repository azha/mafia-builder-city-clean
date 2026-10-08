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

            // ⇒ Depuis le DÉCOR DE SCÈNE (CLIENT-2, 08/10), le cerne de ㉟ est `Decor/Cerne` : il couvre le SUPPORT (le panneau,
            //   sous la bande de scène), pas l'écran entier — `.vnt6 .cerne{inset:5px}` dans la racine du panneau. La propriété
            //   gardée ne change pas : un cadre, pas une rangée de la pile ; et le remède est le même (`ignoreLayout`, porté par
            //   le nœud `Decor`, premier enfant de l'écran).
            MafiaCleanCity.Shell.DecorPose decor = hote.GetComponentInChildren<MafiaCleanCity.Shell.DecorPose>(true);
            Assert.IsNotNull(decor, "le décor de scène doit être posé — c'est lui qui porte le cerne (B1)");
            RectTransform cerne = TrouverCerne(hote);
            Assert.IsNotNull(cerne, "le cerne doit exister — c'est lui qui porte B1");
            Assert.AreSame(decor.Cerne, cerne, "le seul cerne de l'écran est celui du décor (une implémentation)");
            Image img = cerne.Find("Trait")?.GetComponent<Image>();
            Assert.IsNotNull(img, "le cerne doit porter son trait (Decor/Cerne/Trait)");
            Assert.IsNotNull(img.sprite, "le trait du cerne doit porter un sprite (le filet procédural)");

            float pw = decor.Support.rect.width, ph = decor.Support.rect.height;
            Assert.Greater(pw, 0f, "anti-vacuité — le support a une largeur");
            Assert.Greater(ph, 0f, "anti-vacuité — le support a une hauteur");
            Assert.Greater(ph / rt.rect.height, 0.70f, "le support est le panneau sous la bande, pas une rangée");

            Assert.Greater(cerne.rect.height / ph, 0.95f,
                $"le cerne ne couvre que {100f * cerne.rect.height / ph:0.#} % de la HAUTEUR du support — c'est une rangée de la "
                + "pile, pas un cadre. (Cause connue : un recouvrement enfant d'un groupe de layout qui pilote ses enfants ; "
                + "remède : `LayoutElement.ignoreLayout = true` sur `Decor`.)");
            Assert.Greater(cerne.rect.width / pw, 0.95f,
                $"le cerne ne couvre que {100f * cerne.rect.width / pw:0.#} % de la LARGEUR du support");

            LayoutElement le = decor.GetComponent<LayoutElement>();
            Assert.IsNotNull(le, "le décor doit porter un LayoutElement — c'est le remède lui-même");
            Assert.IsTrue(le.ignoreLayout, "et il doit ignorer le layout");
            float hAvant = cerne.rect.height;
            le.ignoreLayout = false;
            LayoutRebuilder.ForceRebuildLayoutImmediate(rt);
            yield return null;
            Assert.Less(cerne.rect.height, 0.5f * hAvant,
                "⛔ CONTRÔLE POSITIF MUET : en retirant `ignoreLayout`, le décor (et son cerne) devrait s'écraser "
                + "en une rangée de la pile. Il ne s'écrase pas ⇒ la garde ci-dessus passe pour une "
                + "raison SANS RAPPORT avec le défaut qu'elle prétend surveiller, et elle resterait "
                + "verte le jour où la ligne est retirée.");
        }
    }
}
