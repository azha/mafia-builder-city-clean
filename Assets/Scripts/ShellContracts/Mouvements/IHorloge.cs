using UnityEngine;

namespace MafiaCleanCity.Mouvements
{
    /// <summary>
    /// Design §3 — l'horloge de la régie. `Reelle` = `Time.unscaledTime` ; `Figee` = un instant posé à la main (la planche
    /// multi-images et les tests). Le délai « hors champ » de 30 s est mesuré SUR CETTE HORLOGE : gelée sous `Figee`,
    /// une planche qui rend 24 images en 60 s de temps réel ne libère rien (§3, §6.4).
    /// </summary>
    public interface IHorloge
    {
        float Maintenant { get; }
    }

    public sealed class HorlogeReelle : IHorloge
    {
        public static readonly HorlogeReelle Instance = new HorlogeReelle();
        public float Maintenant => Time.unscaledTime;
    }

    public sealed class HorlogeFigee : IHorloge
    {
        public float Temps;

        public HorlogeFigee(float temps = 0f)
        {
            Temps = temps;
        }

        public float Maintenant => Temps;
    }
}
