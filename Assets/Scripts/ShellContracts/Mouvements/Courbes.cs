using UnityEngine;

namespace MafiaCleanCity.Mouvements
{
    /// <summary>
    /// Design §2 — l'évaluation d'un canal à un temps : images clés + aisance PAR image clé + itérations + phase.
    /// Fonctions pures, statiques, sans allocation ni exception en régime.
    /// </summary>
    public static class Courbes
    {
        /// <summary>La valeur du canal à la phase `phase` ∈ [0, 1] d'un cycle. Avant la première image clé : sa valeur ;
        /// après la dernière : la sienne.</summary>
        public static float EvaluerCanal(Canal c, float phase)
        {
            ImageCle[] k = c.Cles;
            int n = k.Length;
            if (phase <= k[0].T) return k[0].V;
            if (phase >= k[n - 1].T) return k[n - 1].V;
            int i = 0;
            while (i < n - 2 && phase >= k[i + 1].T) i++;
            float t0 = k[i].T, t1 = k[i + 1].T;
            float u = t1 > t0 ? (phase - t0) / (t1 - t0) : 1f;
            return Mathf.LerpUnclamped(k[i].V, k[i + 1].V, k[i].E.Evaluer(u));
        }

        /// <summary>
        /// La phase d'un cycle à `localS` secondes du départ de la ligne de temps effective (déjà décalée de `PhaseS`).
        /// `localS ≤ 0` : première image clé tenue (`animation-fill-mode: backwards`). `Fois n` terminé : `fini` et la phase
        /// de FIN. `Alterne` : les cycles impairs se jouent à l'envers.
        /// </summary>
        public static float Phase(MouvementDefini m, float periodeEffS, float localS, out bool fini)
        {
            fini = false;
            if (localS <= 0f) return 0f;
            float cycles = localS / periodeEffS;
            if (!m.Iteration.Infini && cycles >= m.Iteration.N)
            {
                fini = true;
                return PhaseFin(m);
            }
            float entier = Mathf.Floor(cycles);
            float p = cycles - entier;
            bool inverse = m.Alterne && (((long)entier) & 1L) == 1L;
            return inverse ? 1f - p : p;
        }

        /// <summary>La phase où s'arrête un mouvement fini : 1, ou 0 si `Alterne` et un nombre PAIR d'itérations.</summary>
        public static float PhaseFin(MouvementDefini m)
        {
            if (m.Alterne && !m.Iteration.Infini && (m.Iteration.N & 1) == 0) return 0f;
            return 1f;
        }

        /// <summary>La phase de la POSE figée : `PoseDeReposS / PeriodeS` si déclarée, sinon la fin (§I.4 du catalogue :
        /// « une Transition ou un Retour sous Reduit saute à sa fin »).</summary>
        public static float PhaseDePose(MouvementDefini m)
        {
            return m.PoseDefinie ? Mathf.Clamp01(m.PoseDeReposS / m.PeriodeS) : PhaseFin(m);
        }

        /// <summary>La valeur de REPOS d'un canal : celle que `Detacher` restitue (§3) — 1 pour un facteur, 0 pour un delta ;
        /// pour un `Absolu`, 1 si la propriété est un alpha ou une échelle, sinon 0 (mélange, hue, éclat, remplissage, angle,
        /// translation, paramètre).</summary>
        public static float Repos(Propriete p, Mode m)
        {
            if (m == Mode.Additif) return 0f;
            if (m == Mode.Multiplicatif) return 1f;
            return (p == Propriete.Alpha || p == Propriete.Echelle || p == Propriete.EchelleX || p == Propriete.EchelleY) ? 1f : 0f;
        }
    }
}
