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

        /// <summary>Hauteur que le chrome MANGE en haut : zone sûre + bandeau + ce qui pend sous le
        /// bandeau (le médaillon du manomètre déborde par construction). Publiée par le shell,
        /// lue par les locataires qui posent du texte lisible — un locataire qui étire un FOND
        /// plein écran doit au contraire l'ignorer, c'est le sens de `ContentSlot` plein canvas.
        ///
        /// ⚠️ VAUT ZÉRO QUAND IL N'Y A PAS DE SHELL, et c'est correct : sans shell il n'y a pas de
        /// barres. Ce n'est donc PAS un drapeau qu'aucune configuration ne pose — le shell l'écrit
        /// à chaque montage de locataire, après la passe de layout qui rend les hauteurs valides.
        /// Un locataire monté hors shell (tests isolés) lit 0 et remplit tout : le comportement
        /// qu'il avait avant que ce champ existe.</summary>
        public static float TopInsetPx { get; private set; }

        /// <summary>Hauteur que le chrome mange en bas : zone sûre + barre d'onglets.</summary>
        public static float BottomInsetPx { get; private set; }

        /// <summary>Écrit par le shell UNIQUEMENT. Les locataires lisent.</summary>
        public static void PublierInsets(float haut, float bas)
        {
            TopInsetPx = haut;
            BottomInsetPx = bas;
        }
    }
}
