using UnityEngine;

namespace MafiaCleanCity.Mouvements
{
    /// <summary>
    /// Design §2 — l'assouplissement d'UNE image clé : une `cubic-bezier(x1, y1, x2, y2)` CSS, struct de 4 flottants.
    /// Lue dans `easing_cles[i].easing` de l'oracle, JAMAIS dans `easing` de l'effet (qui vaut « linear » pour toute
    /// animation CSS). L'aisance de l'image clé i régit le segment qui PART de i, comme `animation-timing-function`
    /// dans un `@keyframes`. Résolue par 6 itérations de Newton, sans allocation.
    /// Le défaut (`default(Aisance)`, quatre zéros) est la ligne droite : `x1 == y1 && x2 == y2` ⇒ y = x.
    /// </summary>
    public readonly struct Aisance
    {
        public readonly float X1, Y1, X2, Y2;

        public Aisance(float x1, float y1, float x2, float y2)
        {
            X1 = x1; Y1 = y1; X2 = x2; Y2 = y2;
        }

        public static readonly Aisance Lineaire = new Aisance(0f, 0f, 1f, 1f);
        public static readonly Aisance Ease = new Aisance(0.25f, 0.1f, 0.25f, 1f);
        public static readonly Aisance EaseIn = new Aisance(0.42f, 0f, 1f, 1f);
        public static readonly Aisance EaseOut = new Aisance(0f, 0f, 0.58f, 1f);
        public static readonly Aisance EaseInOut = new Aisance(0.42f, 0f, 0.58f, 1f);

        /// <summary>`cubic-bezier(x1, y1, x2, y2)`. Comme en CSS, x1 et x2 doivent tenir dans [0, 1] (sinon x(t) n'est
        /// plus monotone et la résolution par Newton n'a plus de sens) ; y1 et y2 sont libres (dépassement).</summary>
        public static Aisance Bezier(float x1, float y1, float x2, float y2)
        {
            if (x1 < 0f || x1 > 1f || x2 < 0f || x2 > 1f)
                throw new System.ArgumentOutOfRangeException(nameof(x1), "cubic-bezier : x1 et x2 dans [0, 1]");
            return new Aisance(x1, y1, x2, y2);
        }

        public bool EstLineaire => X1 == Y1 && X2 == Y2;

        public const int IterationsNewton = 6;

        /// <summary>Le progrès en valeur (y) pour un progrès en temps `x` ∈ [0, 1]. 0 → 0 et 1 → 1 exactement.</summary>
        public float Evaluer(float x)
        {
            if (x <= 0f) return 0f;
            if (x >= 1f) return 1f;
            if (EstLineaire) return x;

            // x(t) = ((ax·t + bx)·t + cx)·t ; y(t) pareil (les points de contrôle extrêmes sont (0,0) et (1,1)).
            float cx = 3f * X1, bx = 3f * (X2 - X1) - cx, ax = 1f - cx - bx;
            float cy = 3f * Y1, by = 3f * (Y2 - Y1) - cy, ay = 1f - cy - by;

            float t = x;
            for (int i = 0; i < IterationsNewton; i++)
            {
                float f = ((ax * t + bx) * t + cx) * t - x;
                float d = (3f * ax * t + 2f * bx) * t + cx;
                if (Mathf.Abs(d) < 1e-6f) break;   // tangente plate (x1 = 0 en t ≈ 0) : on garde le dernier t
                t -= f / d;
                if (t < 0f) t = 0f; else if (t > 1f) t = 1f;
            }
            return ((ay * t + by) * t + cy) * t;
        }
    }
}
