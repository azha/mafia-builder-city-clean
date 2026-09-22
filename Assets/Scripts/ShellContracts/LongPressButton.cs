using System;
using UnityEngine;
using UnityEngine.EventSystems;

namespace MafiaCleanCity.Shell
{
    // W3.U1 (canon global_conventions_core.md:129-138 — confirmation destructive : long-press OU
    // typed-confirm, l'alternative typed-confirm est OBLIGATOIRE pour l'accessibilité, F2). Fires
    // `OnLongPressCompleted` EXACTLY once per hold that reaches
    // `UiTimingTunables.DestructiveLongpressMs` (T.ui.destructive_longpress_ms) — a release before the threshold (a short
    // tap) never fires it. Real touch/pointer path (IPointerDownHandler/UpHandler/ExitHandler) drives
    // the SAME state machine `SimulateShortTap`/`SimulateCompletedLongPress` drive for tests — a
    // falsifiable exercises the WIRING (does a tap emit zero, does a completed hold emit exactly
    // one), never the literal wall-clock duration (a separate, non-functional UX concern).
    public class LongPressButton : MonoBehaviour, IPointerDownHandler, IPointerUpHandler, IPointerExitHandler
    {
        public event Action OnLongPressCompleted;
        public int RequiredHoldMs = UiTimingTunables.DestructiveLongpressMs;

        public bool IsPressing { get; private set; }

        private float pressStartTime = -1f;
        private bool firedThisPress;

        public void OnPointerDown(PointerEventData eventData)
        {
            IsPressing = true;
            firedThisPress = false;
            pressStartTime = Time.unscaledTime;
        }

        public void OnPointerUp(PointerEventData eventData)
        {
            IsPressing = false;
            pressStartTime = -1f;
        }

        public void OnPointerExit(PointerEventData eventData)
        {
            IsPressing = false;
            pressStartTime = -1f;
        }

        private void Update()
        {
            if (!IsPressing || firedThisPress || pressStartTime < 0f) return;
            float heldMs = (Time.unscaledTime - pressStartTime) * 1000f;
            if (heldMs >= RequiredHoldMs)
            {
                firedThisPress = true;
                OnLongPressCompleted?.Invoke();
            }
        }

        /// <summary>Test hook: a tap that releases immediately — never reaches the threshold.</summary>
        public void SimulateShortTap()
        {
            OnPointerDown(null);
            OnPointerUp(null);
        }

        /// <summary>Test hook: a hold that DOES complete — fires exactly once, deterministically,
        /// without spending real wall-clock time on `RequiredHoldMs`.</summary>
        public void SimulateCompletedLongPress()
        {
            OnPointerDown(null);
            if (!firedThisPress)
            {
                firedThisPress = true;
                OnLongPressCompleted?.Invoke();
            }
            OnPointerUp(null);
        }
    }
}
