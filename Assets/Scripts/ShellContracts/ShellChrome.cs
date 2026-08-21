namespace MafiaCleanCity.Shell
{
    /// <summary>
    /// Les mesures que le chrome IMPOSE à tout ce qui vit dessous — la part du contrat de shell qui
    /// n'est pas un comportement mais une géométrie. Vit ici, dans `ShellContracts`, parce que c'est
    /// la SEULE assembly que le shell et ses locataires voient tous les deux : `Shell` référence
    /// `CityMap`, donc un locataire ne peut pas lire une constante du shell sans créer un cycle
    /// d'assemblies (mesuré 2026-08-21 — CS0234 en tentant de lire `TopBarController.BarPaddingX`
    /// depuis `DistrictInteriorScreenController`).
    /// </summary>
    public static class ShellChrome
    {
        /// <summary>
        /// Gouttière horizontale : la marge à laquelle s'aligne TOUT ce qui longe le bord gauche ou
        /// droit de l'écran — le bouton de retour du bandeau comme le titre d'un locataire.
        ///
        /// DÉFINITION UNIQUE, et c'est le point : `TopBarController.BarPaddingX` la lit désormais au
        /// lieu de la porter. Avant, elle n'existait qu'à l'intérieur du bandeau ; le titre de district
        /// n'avait donc aucun moyen de s'y aligner autrement qu'en recopiant un 16 — et un 16 recopié
        /// vieillit seul, en silence, le jour où la gouttière bouge. Le défaut qui a produit cette
        /// constante était plus grossier encore : le titre n'avait AUCUNE marge et commençait au
        /// pixel 1 (« V » de « Verge-A » rogné, mesuré sur Assets/Screenshots/
        /// vue_principale_batiments_hud.png).
        /// </summary>
        public const float GutterX = 16f;
    }
}
