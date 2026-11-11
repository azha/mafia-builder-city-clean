using NUnit.Framework;
using UnityEngine;
using UnityEngine.EventSystems;
using UnityEngine.UI;
using MafiaCleanCity.Shell;
using Object = UnityEngine.Object;

namespace MafiaCleanCity.Tests
{
    // E-R1 (design retour d'appui v5, §3.4 / §6.1) — MESURE, pas garde : plusieurs `IPointerDownHandler` sur UN MÊME GameObject
    // reçoivent-ils TOUS le `PointerDown` ? C'est le chemin RÉEL du module d'entrée : `ExecuteEvents.ExecuteHierarchy` →
    // `ExecuteEvents.Execute(go, …, pointerDownHandler)`, qui parcourt TOUS les composants du GameObject qui implémentent l'interface.
    // Deux assertions par ordre d'ajout (Button d'abord / sonde d'abord) :
    //   (1) le Button a RÉAGI (sa teinte « pressée » est posée sur le CanvasRenderer, fondu 0) — contrôle positif : il ne s'agit pas
    //       d'une sonde qui reçoit tout seule dans un monde où le Button ne reçoit plus rien ;
    //   (2) la sonde (`LongPressButton`, le vrai voisin du dépôt, TamponAuComptoir.cs:92/:102) a reçu l'appui (`IsPressing`).
    // Volontairement SANS catégorie (« Uncategorized ») : une mesure d'uGUI, lancée à la demande par nom (`MAFIA_CI_TESTS`).
    public class RetourAppuiEr1PlayModeTests
    {
        private GameObject hote;

        [TearDown]
        public void Nettoyer() { if (hote != null) Object.DestroyImmediate(hote); hote = null; }

        [TestCase(true, TestName = "Er1_ButtonPuisSonde")]
        [TestCase(false, TestName = "Er1_SondePuisButton")]
        public void PlusieursHandlersSurUnMemeGameObjectRecoiventTousLAppui(bool buttonDabord)
        {
            hote = new GameObject("Er1Hote", typeof(RectTransform));
            Image image = hote.AddComponent<Image>();
            LongPressButton sonde = null;
            Button bouton = null;
            if (buttonDabord) { bouton = hote.AddComponent<Button>(); sonde = hote.AddComponent<LongPressButton>(); }
            else { sonde = hote.AddComponent<LongPressButton>(); bouton = hote.AddComponent<Button>(); }
            bouton.targetGraphic = image;
            bouton.transition = Selectable.Transition.ColorTint;
            var c = bouton.colors;
            c.normalColor = Color.white; c.pressedColor = Color.red; c.colorMultiplier = 1f; c.fadeDuration = 0f;
            bouton.colors = c;

            Assert.IsFalse(sonde.IsPressing, "départ : la sonde n'est pas pressée");
            Color avant = image.canvasRenderer.GetColor();

            var ev = new PointerEventData(EventSystem.current) { button = PointerEventData.InputButton.Left };
            bool servi = ExecuteEvents.Execute(hote, ev, ExecuteEvents.pointerDownHandler);

            Assert.IsTrue(servi, "ExecuteEvents.Execute doit rendre true : au moins un handler a reçu");
            Color apres = image.canvasRenderer.GetColor();
            Assert.AreNotEqual(avant, apres, "contrôle positif : le Button a réagi à l'appui (teinte posée) — avant " + avant + ", après " + apres);
            Assert.IsTrue(apres.g < 0.5f && apres.r > 0.5f, "le Button a posé la teinte PRESSÉE (rouge) : " + apres);
            Assert.IsTrue(sonde.IsPressing, "E-R1 : la sonde, co-localisée avec le Button, a reçu le PointerDown");
        }
    }
}
