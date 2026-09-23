using MafiaCleanCity.Operational;

namespace MafiaCleanCity.Shell
{
    /// <summary>①-0 — le geste unique qui ouvre `BuildingCardController` AVEC son bâtiment : monter en surimpression par le
    /// navigateur (qui donne le jeton et le parent dans la fenêtre synchrone), puis poser `BuildingId` AVANT le `Start()` de
    /// l'écran (différé d'une frame), pour que son `Boot()` charge ce bâtiment. Statique et prenant le navigateur en argument :
    /// la garde le pilote avec un navigateur de test, sans shell ni réseau.</summary>
    public static class OuvertureFicheOperationnelle
    {
        public static BuildingCardController Ouvrir(IShellNavigator nav, string buildingId)
        {
            if (nav == null || string.IsNullOrEmpty(buildingId)) return null;   // jamais sans bâtiment
            BuildingCardController fiche = nav.MonterLocataireEnSurimpression<BuildingCardController>();
            if (fiche == null) return null;
            fiche.BuildingId = buildingId;
            return fiche;
        }
    }
}
