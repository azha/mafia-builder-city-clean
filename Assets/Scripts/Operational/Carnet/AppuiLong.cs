using UnityEngine;
using UnityEngine.EventSystems;

namespace MafiaCleanCity.Operational
{
    /// <summary>« appui long pour déplacer » : un appui tenu 0,5 s déclenche l'action ; relâché avant, rien.</summary>
    public class AppuiLong : MonoBehaviour, IPointerDownHandler, IPointerUpHandler, IPointerExitHandler
    {
        public System.Action Action;
        public const float Duree = 0.5f;
        private float depuis = -1f;
        public void OnPointerDown(PointerEventData e) => depuis = Time.unscaledTime;
        public void OnPointerUp(PointerEventData e) => depuis = -1f;
        public void OnPointerExit(PointerEventData e) => depuis = -1f;
        private void Update()
        {
            if (depuis < 0f || Time.unscaledTime - depuis < Duree) return;
            depuis = -1f;
            Action?.Invoke();
        }
    }
}
