// ⛔ GÉNÉRÉ par Tools/decor-de-scene-2026-10-07/generer-filets.py depuis mesure-filets.json — NE PAS ÉDITER.
//    Régénérer (et `--verifier`) après toute nouvelle mesure ; la garde D6(a) compare ce fichier à la mesure.
using UnityEngine;

namespace MafiaCleanCity.Shell
{
    public static partial class DecorsDeScene
    {
        /// <summary>L5 (§3.4) : les recettes de filets et bords d'état de chaque écran, MESURÉES sur tous ses cadres
        /// (Chromium, `mesure-filets.json`). Un contrôleur appelle `Filets.Poser(bloc, DecorsDeScene.Filets.<Ecran>.<Nom>)`
        /// et ne porte ni couleur ni épaisseur de bord.</summary>
        public static class Filets
        {
            private static SpecFilet F(Cotes cotes, float epaisseurCss, StyleFilet style, Teinte couleur, string couleurCss, string rayon)
            {
                bool pct = rayon.EndsWith("%");
                float v = float.Parse(rayon.TrimEnd('%', 'p', 'x'), System.Globalization.CultureInfo.InvariantCulture);
                return new SpecFilet(cotes, epaisseurCss, style, couleur, rayon: pct ? 0f : v, rayonPct: pct ? v / 100f : 0f,
                                     couleurCss: couleurCss);
            }

            /// <summary>③ — cadres 22, 23, 24 : 5 recette(s).</summary>
            public static class CityMap
            {
                public static readonly int[] Cadres = { 22, 23, 24 };
                /// <summary>`.bande-carte` — cadres 23.</summary>
                public static readonly SpecFilet[] BandeCarte = { F(Cotes.Tous, 1.0f, StyleFilet.Plein, Teinte.Jeton("hudMoneyGold", t => t.hudMoneyGold, 0.4f), "f2c96b@0.4", "12px") };
                /// <summary>`.bande-carte.mien` — cadres 24.</summary>
                public static readonly SpecFilet[] BandeCarteMien = { F(Cotes.Tous, 1.0f, StyleFilet.Plein, Teinte.Jeton("hudMoneyGold", t => t.hudMoneyGold, 0.4f), "f2c96b@0.4", "12px") };
                /// <summary>`.fleuve` — cadres 22, 23, 24.</summary>
                public static readonly SpecFilet[] Fleuve = { F(Cotes.Haut | Cotes.Bas, 1.0f, StyleFilet.Plein, Teinte.Jeton("surfaceRaised", t => t.surfaceRaised, 0.4f), "2b2f3a@0.4", "0px") };
                /// <summary>`.mano` — cadres 22, 23, 24.</summary>
                public static readonly SpecFilet[] Mano = { F(Cotes.Tous, 2.0f, StyleFilet.Plein, Teinte.Jeton("hudHairlineGold", t => t.hudHairlineGold, 1.0f), "b08d3e", "50%") };
                /// <summary>`.tampon-plan` — cadres 23, 24.</summary>
                public static readonly SpecFilet[] TamponPlan = { F(Cotes.Tous, 2.0f, StyleFilet.Plein, Teinte.Jeton("hudMoneyGold", t => t.hudMoneyGold, 1.0f), "f2c96b", "5px") };
            }

            /// <summary>⑤ — cadres 4, 5, 6, 7, 8 : 14 recette(s).</summary>
            public static class DecisionDetail
            {
                public static readonly int[] Cadres = { 4, 5, 6, 7, 8 };
                /// <summary>`.bandes` — cadres 4, 6, 7, 8.</summary>
                public static readonly SpecFilet[] Bandes = { F(Cotes.Haut, 1.0f, StyleFilet.Plein, Teinte.Hex("#93402c", 0.267f), "93402c@0.267", "0px") };
                /// <summary>`.carte-or` — cadres 4, 6, 8.</summary>
                public static readonly SpecFilet[] CarteOr = { F(Cotes.Tous, 1.0f, StyleFilet.Plein, Teinte.Hex("#6b4a12", 1.0f), "6b4a12", "12px") };
                /// <summary>`.carte-or.tranchee` — cadres 7.</summary>
                public static readonly SpecFilet[] CarteOrTranchee = { F(Cotes.Tous, 1.0f, StyleFilet.Plein, Teinte.Hex("#6b4a12", 1.0f), "6b4a12", "12px") };
                /// <summary>`.deja` — cadres 8.</summary>
                public static readonly SpecFilet[] Deja = { F(Cotes.Tous, 1.0f, StyleFilet.Tirete, Teinte.Hex("#93402c", 0.533f), "93402c@0.533", "5px") };
                /// <summary>`.i` — cadres 4, 7, 8.</summary>
                public static readonly SpecFilet[] I = { F(Cotes.Tous, 1.0f, StyleFilet.Plein, Teinte.Hex("#93402c", 1.0f), "93402c", "50%") };
                /// <summary>`.i` — cadres 5.</summary>
                public static readonly SpecFilet[] I_2 = { F(Cotes.Tous, 2.0f, StyleFilet.Plein, Teinte.Hex("#d9cca9", 1.0f), "d9cca9", "8px") };
                /// <summary>`.ligne-or` — cadres 4, 6, 7, 8.</summary>
                public static readonly SpecFilet[] LigneOr = { F(Cotes.Haut | Cotes.Bas, 1.0f, StyleFilet.Plein, Teinte.Jeton("hudMoneyGold", t => t.hudMoneyGold, 0.333f), "f2c96b@0.333", "0px") };
                /// <summary>`.mano` — cadres 4, 5, 6, 7, 8.</summary>
                public static readonly SpecFilet[] Mano = { F(Cotes.Tous, 2.0f, StyleFilet.Plein, Teinte.Jeton("hudHairlineGold", t => t.hudHairlineGold, 1.0f), "b08d3e", "50%") };
                /// <summary>`.on` — cadres 4, 6, 7, 8.</summary>
                public static readonly SpecFilet[] On = { F(Cotes.Tous, 1.0f, StyleFilet.Plein, Teinte.Hex("#93402c", 1.0f), "93402c", "50%") };
                /// <summary>`.piece` — cadres 4, 5, 7, 8.</summary>
                public static readonly SpecFilet[] Piece = { F(Cotes.Tous, 2.0f, StyleFilet.Tirete, Teinte.Hex("#ffffff", 0.4f), "ffffff@0.4", "50%") };
                /// <summary>`.piece` — cadres 6.</summary>
                public static readonly SpecFilet[] Piece_2 = { F(Cotes.Tous, 2.0f, StyleFilet.Tirete, Teinte.Hex("#ffffff", 0.133f), "ffffff@0.133", "50%") };
                /// <summary>`.plaque-laiton` — cadres 4, 6, 8.</summary>
                public static readonly SpecFilet[] PlaqueLaiton = { F(Cotes.Tous, 1.0f, StyleFilet.Plein, Teinte.Hex("#6b4a12", 1.0f), "6b4a12", "6px") };
                /// <summary>`.tampon-diag` — cadres 7.</summary>
                public static readonly SpecFilet[] TamponDiag = { F(Cotes.Tous, 3.0f, StyleFilet.Plein, Teinte.Hex("#93402c", 1.0f), "93402c", "6px") };
                /// <summary>`.tapis-feutre` — cadres 4, 5, 6, 7, 8.</summary>
                public static readonly SpecFilet[] TapisFeutre = { F(Cotes.Haut, 3.0f, StyleFilet.Plein, Teinte.Jeton("hudHairlineGold", t => t.hudHairlineGold, 1.0f), "b08d3e", "26px") };
            }

            /// <summary>⑯ — cadres 0, 1, 2, 3 : 11 recette(s).</summary>
            public static class DailyReview
            {
                public static readonly int[] Cadres = { 0, 1, 2, 3 };
                /// <summary>`.i` — cadres 0, 2, 3.</summary>
                public static readonly SpecFilet[] I = { F(Cotes.Tous, 1.0f, StyleFilet.Plein, Teinte.Hex("#1f2a3a", 0.4f), "1f2a3a@0.4", "50%") };
                /// <summary>`.lr` — cadres 0, 3.</summary>
                public static readonly SpecFilet[] Lr = { F(Cotes.Bas, 1.0f, StyleFilet.Tirete, Teinte.Hex("#1f2a3a", 0.2f), "1f2a3a@0.2", "0px") };
                /// <summary>`.lr.fait` — cadres 2.</summary>
                public static readonly SpecFilet[] LrFait = { F(Cotes.Bas, 1.0f, StyleFilet.Tirete, Teinte.Hex("#1f2a3a", 0.2f), "1f2a3a@0.2", "0px") };
                /// <summary>`.mano` — cadres 0, 1, 2, 3.</summary>
                public static readonly SpecFilet[] Mano = { F(Cotes.Tous, 2.0f, StyleFilet.Plein, Teinte.Jeton("hudHairlineGold", t => t.hudHairlineGold, 1.0f), "b08d3e", "50%") };
                /// <summary>`.on` — cadres 0, 2, 3.</summary>
                public static readonly SpecFilet[] On = { F(Cotes.Tous, 1.0f, StyleFilet.Plein, Teinte.Hex("#1f2a3a", 0.4f), "1f2a3a@0.4", "50%") };
                /// <summary>`.portrait` — cadres 0, 2, 3.</summary>
                public static readonly SpecFilet[] Portrait = { F(Cotes.Tous, 1.0f, StyleFilet.Plein, Teinte.Hex("#1f2a3a", 1.0f), "1f2a3a", "50%") };
                /// <summary>`.span` — cadres 0, 2, 3.</summary>
                public static readonly SpecFilet[] Span = { F(Cotes.Tous, 2.0f, StyleFilet.Plein, Teinte.Hex("#b3362a", 1.0f), "b3362a", "50%") };
                /// <summary>`.span` — cadres 2.</summary>
                public static readonly SpecFilet[] Span_2 = { F(Cotes.Tous, 2.0f, StyleFilet.Plein, Teinte.Hex("#1f2a3a", 1.0f), "1f2a3a", "50%") };
                /// <summary>`.tampon-encre` — cadres 0, 1, 3.</summary>
                public static readonly SpecFilet[] TamponEncre = { F(Cotes.Tous, 3.0f, StyleFilet.Double, Teinte.Hex("#b3362a", 1.0f), "b3362a", "6px") };
                /// <summary>`.tampon-encre.signe` — cadres 2.</summary>
                public static readonly SpecFilet[] TamponEncreSigne = { F(Cotes.Tous, 3.0f, StyleFilet.Double, Teinte.Hex("#2f6b2a", 1.0f), "2f6b2a", "6px") };
                /// <summary>`.total-registre` — cadres 0, 1, 2, 3.</summary>
                public static readonly SpecFilet[] TotalRegistre = { F(Cotes.Bas, 1.0f, StyleFilet.Plein, Teinte.Hex("#1f2a3a", 1.0f), "1f2a3a", "0px"), F(Cotes.Haut, 2.0f, StyleFilet.Plein, Teinte.Hex("#1f2a3a", 1.0f), "1f2a3a", "0px") };
            }

            /// <summary>㊲ — cadres 119, 120, 121, 122, 123, 124 : 14 recette(s).</summary>
            public static class Reputation
            {
                public static readonly int[] Cadres = { 119, 120, 121, 122, 123, 124 };
                /// <summary>`.cerne` — cadres 119, 120, 121, 122, 123, 124.</summary>
                public static readonly SpecFilet[] Cerne = { F(Cotes.Tous, 1.0f, StyleFilet.Plein, Teinte.Jeton("hudHairlineGold", t => t.hudHairlineGold, 1.0f), "b08d3e", "3px") };
                /// <summary>`.cta6` — cadres 119, 120, 121, 122.</summary>
                public static readonly SpecFilet[] Cta6 = { F(Cotes.Tous, 1.0f, StyleFilet.Plein, Teinte.Jeton("hudHairlineGold", t => t.hudHairlineGold, 1.0f), "b08d3e", "0px") };
                /// <summary>`.cta6.eteint` — cadres 123.</summary>
                public static readonly SpecFilet[] Cta6Eteint = { F(Cotes.Tous, 1.0f, StyleFilet.Plein, Teinte.Hex("#2a3648", 1.0f), "2a3648", "0px") };
                /// <summary>`.elast` — cadres 119, 120, 121, 122, 123, 124.</summary>
                public static readonly SpecFilet[] Elast = { F(Cotes.Tous, 1.0f, StyleFilet.Plein, Teinte.Hex("#2a3648", 1.0f), "2a3648", "0px") };
                /// <summary>`.enseigne` — cadres 119, 120, 121, 122, 123, 124.</summary>
                public static readonly SpecFilet[] Enseigne = { F(Cotes.Bas, 2.0f, StyleFilet.Plein, Teinte.Jeton("hudHairlineGold", t => t.hudHairlineGold, 1.0f), "b08d3e", "0px"), F(Cotes.Haut | Cotes.Droite | Cotes.Gauche, 1.0f, StyleFilet.Plein, Teinte.Hex("#2a3648", 1.0f), "2a3648", "0px") };
                /// <summary>`.fen` — cadres 119, 120, 121, 122, 123, 124.</summary>
                public static readonly SpecFilet[] Fen = { F(Cotes.Tous, 1.0f, StyleFilet.Plein, Teinte.Hex("#2a3648", 1.0f), "2a3648", "0px") };
                /// <summary>`.mano` — cadres 119, 120, 121, 122, 123, 124.</summary>
                public static readonly SpecFilet[] Mano = { F(Cotes.Tous, 2.0f, StyleFilet.Plein, Teinte.Jeton("hudHairlineGold", t => t.hudHairlineGold, 1.0f), "b08d3e", "50%") };
                /// <summary>`.nm` — cadres 123.</summary>
                public static readonly SpecFilet[] Nm = { F(Cotes.Tous, 1.0f, StyleFilet.Plein, Teinte.Hex("#2a3648", 1.0f), "2a3648", "0px") };
                /// <summary>`.pann` — cadres 119, 120, 121, 122, 124.</summary>
                public static readonly SpecFilet[] Pann = { F(Cotes.Tous, 1.0f, StyleFilet.Plein, Teinte.Hex("#2a3648", 1.0f), "2a3648", "0px") };
                /// <summary>`.pann` — cadres 123.</summary>
                public static readonly SpecFilet[] Pann_2 = { F(Cotes.Tous, 1.0f, StyleFilet.Plein, Teinte.Jeton("accentWarning", t => t.accentWarning, 1.0f), "ff9e3d", "0px") };
                /// <summary>`.prt` — cadres 119, 120, 121, 123.</summary>
                public static readonly SpecFilet[] Prt = { F(Cotes.Tous, 1.0f, StyleFilet.Plein, Teinte.Jeton("hudHairlineGold", t => t.hudHairlineGold, 1.0f), "b08d3e", "0px") };
                /// <summary>`.rg6` — cadres 122, 124.</summary>
                public static readonly SpecFilet[] Rg6 = { F(Cotes.Tous, 1.0f, StyleFilet.Plein, Teinte.Hex("#2a3648", 1.0f), "2a3648", "0px") };
                /// <summary>`.tl` — cadres 119, 120, 123.</summary>
                public static readonly SpecFilet[] Tl = { F(Cotes.Tous, 1.0f, StyleFilet.Plein, Teinte.Hex("#2a3648", 1.0f), "2a3648", "0px") };
                /// <summary>`.tl.on` — cadres 119, 121.</summary>
                public static readonly SpecFilet[] TlOn = { F(Cotes.Tous, 1.0f, StyleFilet.Plein, Teinte.Jeton("hudHairlineGold", t => t.hudHairlineGold, 1.0f), "b08d3e", "0px") };
            }

            /// <summary>㉟ — cadres 107, 108, 109, 110, 111, 112 : 14 recette(s).</summary>
            public static class Selling
            {
                public static readonly int[] Cadres = { 107, 108, 109, 110, 111, 112 };
                /// <summary>`.cerne` — cadres 107, 108, 109, 110, 111, 112.</summary>
                public static readonly SpecFilet[] Cerne = { F(Cotes.Tous, 1.0f, StyleFilet.Plein, Teinte.Jeton("hudHairlineGold", t => t.hudHairlineGold, 1.0f), "b08d3e", "3px") };
                /// <summary>`.cta6` — cadres 107, 108, 111.</summary>
                public static readonly SpecFilet[] Cta6 = { F(Cotes.Tous, 1.0f, StyleFilet.Plein, Teinte.Jeton("hudHairlineGold", t => t.hudHairlineGold, 1.0f), "b08d3e", "0px") };
                /// <summary>`.cta6.eteint` — cadres 109.</summary>
                public static readonly SpecFilet[] Cta6Eteint = { F(Cotes.Tous, 1.0f, StyleFilet.Plein, Teinte.Hex("#2a3648", 1.0f), "2a3648", "0px") };
                /// <summary>`.dl` — cadres 107, 108, 109, 110.</summary>
                public static readonly SpecFilet[] Dl = { F(Cotes.Tous, 1.0f, StyleFilet.Plein, Teinte.Hex("#2a3648", 1.0f), "2a3648", "0px") };
                /// <summary>`.dl.mort` — cadres 107, 110.</summary>
                public static readonly SpecFilet[] DlMort = { F(Cotes.Tous, 1.0f, StyleFilet.Plein, Teinte.Hex("#2a3648", 1.0f), "2a3648", "0px") };
                /// <summary>`.dl.pris` — cadres 108, 109.</summary>
                public static readonly SpecFilet[] DlPris = { F(Cotes.Tous, 1.0f, StyleFilet.Plein, Teinte.Jeton("hudHairlineGold", t => t.hudHairlineGold, 1.0f), "b08d3e", "0px") };
                /// <summary>`.dl.pris.mort` — cadres 110.</summary>
                public static readonly SpecFilet[] DlPrisMort = { F(Cotes.Tous, 1.0f, StyleFilet.Plein, Teinte.Jeton("hudHairlineGold", t => t.hudHairlineGold, 1.0f), "b08d3e", "0px") };
                /// <summary>`.elast` — cadres 107, 108, 109, 110, 111.</summary>
                public static readonly SpecFilet[] Elast = { F(Cotes.Tous, 1.0f, StyleFilet.Plein, Teinte.Hex("#2a3648", 1.0f), "2a3648", "0px") };
                /// <summary>`.enseigne` — cadres 107, 108, 109, 110, 111, 112.</summary>
                public static readonly SpecFilet[] Enseigne = { F(Cotes.Bas, 2.0f, StyleFilet.Plein, Teinte.Jeton("hudHairlineGold", t => t.hudHairlineGold, 1.0f), "b08d3e", "0px"), F(Cotes.Haut | Cotes.Droite | Cotes.Gauche, 1.0f, StyleFilet.Plein, Teinte.Hex("#2a3648", 1.0f), "2a3648", "0px") };
                /// <summary>`.fen` — cadres 107, 108, 109, 110, 111, 112.</summary>
                public static readonly SpecFilet[] Fen = { F(Cotes.Tous, 1.0f, StyleFilet.Plein, Teinte.Hex("#2a3648", 1.0f), "2a3648", "0px") };
                /// <summary>`.gd` — cadres 108, 110.</summary>
                public static readonly SpecFilet[] Gd = { F(Cotes.Tous, 1.0f, StyleFilet.Plein, Teinte.Hex("#2a3648", 1.0f), "2a3648", "0px") };
                /// <summary>`.mano` — cadres 107, 108, 109, 110, 111, 112.</summary>
                public static readonly SpecFilet[] Mano = { F(Cotes.Tous, 2.0f, StyleFilet.Plein, Teinte.Jeton("hudHairlineGold", t => t.hudHairlineGold, 1.0f), "b08d3e", "50%") };
                /// <summary>`.pann` — cadres 108, 111, 112.</summary>
                public static readonly SpecFilet[] Pann = { F(Cotes.Tous, 1.0f, StyleFilet.Plein, Teinte.Hex("#2a3648", 1.0f), "2a3648", "0px") };
                /// <summary>`.pann` — cadres 109, 110.</summary>
                public static readonly SpecFilet[] Pann_2 = { F(Cotes.Tous, 1.0f, StyleFilet.Plein, Teinte.Jeton("accentDanger", t => t.accentDanger, 1.0f), "ff5a4d", "0px") };
            }

            /// <summary>㉓ — cadres 98, 99, 100 : 13 recette(s).</summary>
            public static class Shop
            {
                public static readonly int[] Cadres = { 98, 99, 100 };
                /// <summary>`.acquis` — cadres 100.</summary>
                public static readonly SpecFilet[] Acquis = { F(Cotes.Tous, 1.0f, StyleFilet.Plein, Teinte.Hex("#7fc99a", 1.0f), "7fc99a", "2px") };
                /// <summary>`.art` — cadres 98, 99, 100.</summary>
                public static readonly SpecFilet[] Art = { F(Cotes.Tous, 1.0f, StyleFilet.Plein, Teinte.Hex("#3a2530", 1.0f), "3a2530", "4px") };
                /// <summary>`.art.pris` — cadres 100.</summary>
                public static readonly SpecFilet[] ArtPris = { F(Cotes.Tous, 1.0f, StyleFilet.Plein, Teinte.Hex("#3a2530", 1.0f), "3a2530", "4px") };
                /// <summary>`.av` — cadres 98, 99, 100.</summary>
                public static readonly SpecFilet[] Av = { F(Cotes.Tous, 1.0f, StyleFilet.Plein, Teinte.Hex("#4a3a2a", 1.0f), "4a3a2a", "50%") };
                /// <summary>`.compt` — cadres 98, 99, 100.</summary>
                public static readonly SpecFilet[] Compt = { F(Cotes.Bas, 2.0f, StyleFilet.Plein, Teinte.Hex("#6b4f14", 1.0f), "6b4f14", "0px") };
                /// <summary>`.etiq` — cadres 98.</summary>
                public static readonly SpecFilet[] Etiq = { F(Cotes.Tous, 1.0f, StyleFilet.Plein, Teinte.Jeton("hudCremeSecondary", t => t.hudCremeSecondary, 1.0f), "b9ac92", "2px") };
                /// <summary>`.etiq.hors` — cadres 98, 100.</summary>
                public static readonly SpecFilet[] EtiqHors = { F(Cotes.Tous, 1.0f, StyleFilet.Tirete, Teinte.Jeton("hudCremeSecondary", t => t.hudCremeSecondary, 1.0f), "b9ac92", "2px") };
                /// <summary>`.etiq.magasin` — cadres 99.</summary>
                public static readonly SpecFilet[] EtiqMagasin = { F(Cotes.Tous, 1.0f, StyleFilet.Plein, Teinte.Hex("#3f4a57", 1.0f), "3f4a57", "2px") };
                /// <summary>`.mano` — cadres 98, 99, 100.</summary>
                public static readonly SpecFilet[] Mano = { F(Cotes.Tous, 2.0f, StyleFilet.Plein, Teinte.Jeton("hudHairlineGold", t => t.hudHairlineGold, 1.0f), "b08d3e", "50%") };
                /// <summary>`.planche` — cadres 98, 99, 100.</summary>
                public static readonly SpecFilet[] Planche = { F(Cotes.Bas, 3.0f, StyleFilet.Plein, Teinte.Hex("#3a2e24", 1.0f), "3a2e24", "0px") };
                /// <summary>`.planche.large` — cadres 99.</summary>
                public static readonly SpecFilet[] PlancheLarge = { F(Cotes.Bas, 3.0f, StyleFilet.Plein, Teinte.Hex("#3a2e24", 1.0f), "3a2e24", "0px") };
                /// <summary>`.solde` — cadres 98, 99, 100.</summary>
                public static readonly SpecFilet[] Solde = { F(Cotes.Tous, 1.0f, StyleFilet.Plein, Teinte.Hex("#6b4f14", 1.0f), "6b4f14", "4px") };
                /// <summary>`.voix` — cadres 98, 99, 100.</summary>
                public static readonly SpecFilet[] Voix = { F(Cotes.Haut, 1.0f, StyleFilet.Plein, Teinte.Hex("#3a2e24", 1.0f), "3a2e24", "0px") };
            }

            /// <summary>⑮ — cadres 31, 32, 33, 34, 35 : 17 recette(s).</summary>
            public static class Inspection
            {
                public static readonly int[] Cadres = { 31, 32, 33, 34, 35 };
                /// <summary>`.cachet-r` — cadres 34.</summary>
                public static readonly SpecFilet[] CachetR = { F(Cotes.Tous, 3.0f, StyleFilet.Double, Teinte.Hex("#8a2a18", 1.0f), "8a2a18", "0px") };
                /// <summary>`.cols` — cadres 32.</summary>
                public static readonly SpecFilet[] Cols = { F(Cotes.Bas, 1.0f, StyleFilet.Plein, Teinte.Hex("#1f2a24", 0.2f), "1f2a24@0.2", "0px") };
                /// <summary>`.compte-r` — cadres 34.</summary>
                public static readonly SpecFilet[] CompteR = { F(Cotes.Haut, 1.0f, StyleFilet.Tirete, Teinte.Hex("#2b2622", 0.267f), "2b2622@0.267", "0px") };
                /// <summary>`.corkboard` — cadres 31, 33, 34, 35.</summary>
                public static readonly SpecFilet[] Corkboard = { F(Cotes.Haut, 6.0f, StyleFilet.Plein, Teinte.Hex("#3a2a12", 1.0f), "3a2a12", "0px") };
                /// <summary>`.dep-t` — cadres 33.</summary>
                public static readonly SpecFilet[] DepT = { F(Cotes.Bas, 1.0f, StyleFilet.Plein, Teinte.Hex("#2b2622", 0.2f), "2b2622@0.2", "0px") };
                /// <summary>`.entete-cork` — cadres 31, 33, 34, 35.</summary>
                public static readonly SpecFilet[] EnteteCork = { F(Cotes.Bas, 1.0f, StyleFilet.Plein, Teinte.Hex("#3a2a12", 0.267f), "3a2a12@0.267", "0px") };
                /// <summary>`.etat-p` — cadres 31.</summary>
                public static readonly SpecFilet[] EtatP = { F(Cotes.Tous, 2.0f, StyleFilet.Plein, Teinte.Hex("#1f6f74", 1.0f), "1f6f74", "0px") };
                /// <summary>`.etat-p` — cadres 31, 34, 35.</summary>
                public static readonly SpecFilet[] EtatP_2 = { F(Cotes.Tous, 2.0f, StyleFilet.Plein, Teinte.Hex("#8a2a18", 1.0f), "8a2a18", "0px") };
                /// <summary>`.etat-p` — cadres 31.</summary>
                public static readonly SpecFilet[] EtatP_3 = { F(Cotes.Tous, 2.0f, StyleFilet.Plein, Teinte.Hex("#8a5a12", 1.0f), "8a5a12", "0px") };
                /// <summary>`.mano` — cadres 31, 32, 33, 34, 35.</summary>
                public static readonly SpecFilet[] Mano = { F(Cotes.Tous, 2.0f, StyleFilet.Plein, Teinte.Jeton("hudHairlineGold", t => t.hudHairlineGold, 1.0f), "b08d3e", "50%") };
                /// <summary>`.note-p` — cadres 31, 34, 35.</summary>
                public static readonly SpecFilet[] NoteP = { F(Cotes.Haut, 1.0f, StyleFilet.Tirete, Teinte.Hex("#2b2622", 0.267f), "2b2622@0.267", "0px") };
                /// <summary>`.perf.d` — cadres 32.</summary>
                public static readonly SpecFilet[] PerfD = { F(Cotes.Gauche, 1.0f, StyleFilet.Tirete, Teinte.Hex("#b9b6a8", 1.0f), "b9b6a8", "0px") };
                /// <summary>`.perf.g` — cadres 32.</summary>
                public static readonly SpecFilet[] PerfG = { F(Cotes.Droite, 1.0f, StyleFilet.Tirete, Teinte.Hex("#b9b6a8", 1.0f), "b9b6a8", "0px") };
                /// <summary>`.photo` — cadres 31, 34, 35.</summary>
                public static readonly SpecFilet[] Photo = { F(Cotes.Tous, 1.0f, StyleFilet.Plein, Teinte.Hex("#2b2622", 0.267f), "2b2622@0.267", "0px") };
                /// <summary>`.pied-l` — cadres 32.</summary>
                public static readonly SpecFilet[] PiedL = { F(Cotes.Haut, 2.0f, StyleFilet.Plein, Teinte.Hex("#1f2a24", 1.0f), "1f2a24", "0px") };
                /// <summary>`.tampon-dep` — cadres 33.</summary>
                public static readonly SpecFilet[] TamponDep = { F(Cotes.Tous, 3.0f, StyleFilet.Double, Teinte.Hex("#8a2a18", 1.0f), "8a2a18", "0px") };
                /// <summary>`.tete-l` — cadres 32.</summary>
                public static readonly SpecFilet[] TeteL = { F(Cotes.Bas, 2.0f, StyleFilet.Plein, Teinte.Hex("#1f2a24", 1.0f), "1f2a24", "0px") };
            }

            /// <summary>⑰ — cadres 31, 32, 33, 34, 35 : 17 recette(s).</summary>
            public static class Precinct
            {
                public static readonly int[] Cadres = { 31, 32, 33, 34, 35 };
                /// <summary>`.cachet-r` — cadres 34.</summary>
                public static readonly SpecFilet[] CachetR = { F(Cotes.Tous, 3.0f, StyleFilet.Double, Teinte.Hex("#8a2a18", 1.0f), "8a2a18", "0px") };
                /// <summary>`.cols` — cadres 32.</summary>
                public static readonly SpecFilet[] Cols = { F(Cotes.Bas, 1.0f, StyleFilet.Plein, Teinte.Hex("#1f2a24", 0.2f), "1f2a24@0.2", "0px") };
                /// <summary>`.compte-r` — cadres 34.</summary>
                public static readonly SpecFilet[] CompteR = { F(Cotes.Haut, 1.0f, StyleFilet.Tirete, Teinte.Hex("#2b2622", 0.267f), "2b2622@0.267", "0px") };
                /// <summary>`.corkboard` — cadres 31, 33, 34, 35.</summary>
                public static readonly SpecFilet[] Corkboard = { F(Cotes.Haut, 6.0f, StyleFilet.Plein, Teinte.Hex("#3a2a12", 1.0f), "3a2a12", "0px") };
                /// <summary>`.dep-t` — cadres 33.</summary>
                public static readonly SpecFilet[] DepT = { F(Cotes.Bas, 1.0f, StyleFilet.Plein, Teinte.Hex("#2b2622", 0.2f), "2b2622@0.2", "0px") };
                /// <summary>`.entete-cork` — cadres 31, 33, 34, 35.</summary>
                public static readonly SpecFilet[] EnteteCork = { F(Cotes.Bas, 1.0f, StyleFilet.Plein, Teinte.Hex("#3a2a12", 0.267f), "3a2a12@0.267", "0px") };
                /// <summary>`.etat-p` — cadres 31.</summary>
                public static readonly SpecFilet[] EtatP = { F(Cotes.Tous, 2.0f, StyleFilet.Plein, Teinte.Hex("#1f6f74", 1.0f), "1f6f74", "0px") };
                /// <summary>`.etat-p` — cadres 31, 34, 35.</summary>
                public static readonly SpecFilet[] EtatP_2 = { F(Cotes.Tous, 2.0f, StyleFilet.Plein, Teinte.Hex("#8a2a18", 1.0f), "8a2a18", "0px") };
                /// <summary>`.etat-p` — cadres 31.</summary>
                public static readonly SpecFilet[] EtatP_3 = { F(Cotes.Tous, 2.0f, StyleFilet.Plein, Teinte.Hex("#8a5a12", 1.0f), "8a5a12", "0px") };
                /// <summary>`.mano` — cadres 31, 32, 33, 34, 35.</summary>
                public static readonly SpecFilet[] Mano = { F(Cotes.Tous, 2.0f, StyleFilet.Plein, Teinte.Jeton("hudHairlineGold", t => t.hudHairlineGold, 1.0f), "b08d3e", "50%") };
                /// <summary>`.note-p` — cadres 31, 34, 35.</summary>
                public static readonly SpecFilet[] NoteP = { F(Cotes.Haut, 1.0f, StyleFilet.Tirete, Teinte.Hex("#2b2622", 0.267f), "2b2622@0.267", "0px") };
                /// <summary>`.perf.d` — cadres 32.</summary>
                public static readonly SpecFilet[] PerfD = { F(Cotes.Gauche, 1.0f, StyleFilet.Tirete, Teinte.Hex("#b9b6a8", 1.0f), "b9b6a8", "0px") };
                /// <summary>`.perf.g` — cadres 32.</summary>
                public static readonly SpecFilet[] PerfG = { F(Cotes.Droite, 1.0f, StyleFilet.Tirete, Teinte.Hex("#b9b6a8", 1.0f), "b9b6a8", "0px") };
                /// <summary>`.photo` — cadres 31, 34, 35.</summary>
                public static readonly SpecFilet[] Photo = { F(Cotes.Tous, 1.0f, StyleFilet.Plein, Teinte.Hex("#2b2622", 0.267f), "2b2622@0.267", "0px") };
                /// <summary>`.pied-l` — cadres 32.</summary>
                public static readonly SpecFilet[] PiedL = { F(Cotes.Haut, 2.0f, StyleFilet.Plein, Teinte.Hex("#1f2a24", 1.0f), "1f2a24", "0px") };
                /// <summary>`.tampon-dep` — cadres 33.</summary>
                public static readonly SpecFilet[] TamponDep = { F(Cotes.Tous, 3.0f, StyleFilet.Double, Teinte.Hex("#8a2a18", 1.0f), "8a2a18", "0px") };
                /// <summary>`.tete-l` — cadres 32.</summary>
                public static readonly SpecFilet[] TeteL = { F(Cotes.Bas, 2.0f, StyleFilet.Plein, Teinte.Hex("#1f2a24", 1.0f), "1f2a24", "0px") };
            }

            /// <summary>⑭ — cadres 14, 15, 16, 17, 18, 19 : 16 recette(s).</summary>
            public static class Compression
            {
                public static readonly int[] Cadres = { 14, 15, 16, 17, 18, 19 };
                /// <summary>`.anneau` — cadres 15, 16, 19.</summary>
                public static readonly SpecFilet[] Anneau = { F(Cotes.Tous, 2.0f, StyleFilet.Plein, Teinte.Jeton("hudHairlineGold", t => t.hudHairlineGold, 1.0f), "b08d3e", "50%") };
                /// <summary>`.bouton-fer` — cadres 14.</summary>
                public static readonly SpecFilet[] BoutonFer = { F(Cotes.Tous, 1.0f, StyleFilet.Plein, Teinte.Hex("#4a1008", 1.0f), "4a1008", "6px") };
                /// <summary>`.bouton-fer.secondaire` — cadres 14, 17.</summary>
                public static readonly SpecFilet[] BoutonFerSecondaire = { F(Cotes.Tous, 1.0f, StyleFilet.Plein, Teinte.Jeton("surfaceCard", t => t.surfaceCard, 1.0f), "14171a", "6px") };
                /// <summary>`.cadran-fer` — cadres 14, 15, 16, 17, 18, 19.</summary>
                public static readonly SpecFilet[] CadranFer = { F(Cotes.Tous, 4.0f, StyleFilet.Plein, Teinte.Jeton("hudHairlineGold", t => t.hudHairlineGold, 1.0f), "b08d3e", "100px") };
                /// <summary>`.ecarter` — cadres 15, 16.</summary>
                public static readonly SpecFilet[] Ecarter = { F(Cotes.Tous, 1.0f, StyleFilet.Plein, Teinte.Jeton("surfaceCard", t => t.surfaceCard, 1.0f), "14171a", "3px") };
                /// <summary>`.jf` — cadres 15, 16, 19.</summary>
                public static readonly SpecFilet[] Jf = { F(Cotes.Tous, 2.0f, StyleFilet.Plein, Teinte.Hex("#4a3a12", 1.0f), "4a3a12", "50%") };
                /// <summary>`.jf.pris` — cadres 15, 16, 17, 19.</summary>
                public static readonly SpecFilet[] JfPris = { F(Cotes.Tous, 2.0f, StyleFilet.Plein, Teinte.Nommee("noir", Color.black, 1.0f), "000000", "50%") };
                /// <summary>`.mano` — cadres 14, 15, 16, 17, 18, 19.</summary>
                public static readonly SpecFilet[] Mano = { F(Cotes.Tous, 2.0f, StyleFilet.Plein, Teinte.Jeton("hudHairlineGold", t => t.hudHairlineGold, 1.0f), "b08d3e", "50%") };
                /// <summary>`.pf` — cadres 15, 16, 19.</summary>
                public static readonly SpecFilet[] Pf = { F(Cotes.Droite | Cotes.Bas | Cotes.Gauche, 1.0f, StyleFilet.Plein, Teinte.Jeton("surfaceCard", t => t.surfaceCard, 1.0f), "14171a", "0px"), F(Cotes.Haut, 1.0f, StyleFilet.Plein, Teinte.Hex("#5a616a", 1.0f), "5a616a", "0px") };
                /// <summary>`.pf.persiste` — cadres 19.</summary>
                public static readonly SpecFilet[] PfPersiste = { F(Cotes.Droite | Cotes.Bas | Cotes.Gauche, 1.0f, StyleFilet.Plein, Teinte.Jeton("surfaceCard", t => t.surfaceCard, 1.0f), "14171a", "0px"), F(Cotes.Haut, 1.0f, StyleFilet.Plein, Teinte.Hex("#5a616a", 1.0f), "5a616a", "0px") };
                /// <summary>`.pf.revele` — cadres 16.</summary>
                public static readonly SpecFilet[] PfRevele = { F(Cotes.Droite | Cotes.Bas | Cotes.Gauche, 1.0f, StyleFilet.Plein, Teinte.Jeton("surfaceCard", t => t.surfaceCard, 1.0f), "14171a", "0px"), F(Cotes.Haut, 1.0f, StyleFilet.Plein, Teinte.Hex("#5a616a", 1.0f), "5a616a", "0px") };
                /// <summary>`.pf.traitee` — cadres 15, 16, 19.</summary>
                public static readonly SpecFilet[] PfTraitee = { F(Cotes.Droite | Cotes.Bas | Cotes.Gauche, 1.0f, StyleFilet.Plein, Teinte.Jeton("surfaceCard", t => t.surfaceCard, 1.0f), "14171a", "0px"), F(Cotes.Haut, 1.0f, StyleFilet.Plein, Teinte.Hex("#5a616a", 1.0f), "5a616a", "0px") };
                /// <summary>`.plaque-fer-texte` — cadres 14, 17, 18.</summary>
                public static readonly SpecFilet[] PlaqueFerTexte = { F(Cotes.Droite | Cotes.Bas | Cotes.Gauche, 1.0f, StyleFilet.Plein, Teinte.Jeton("surfaceCard", t => t.surfaceCard, 1.0f), "14171a", "0px"), F(Cotes.Haut, 1.0f, StyleFilet.Plein, Teinte.Hex("#5a616a", 1.0f), "5a616a", "0px") };
                /// <summary>`.regler` — cadres 15, 16, 19.</summary>
                public static readonly SpecFilet[] Regler = { F(Cotes.Tous, 1.0f, StyleFilet.Plein, Teinte.Hex("#4a1008", 1.0f), "4a1008", "3px") };
                /// <summary>`.span` — cadres 15, 16, 19.</summary>
                public static readonly SpecFilet[] Span = { F(Cotes.Tous, 1.0f, StyleFilet.Plein, Teinte.Jeton("surfaceCard", t => t.surfaceCard, 1.0f), "14171a", "3px") };
                /// <summary>`.tole` — cadres 14, 15, 16, 17, 18, 19.</summary>
                public static readonly SpecFilet[] Tole = { F(Cotes.Haut, 4.0f, StyleFilet.Plein, Teinte.Jeton("hudHairlineGold", t => t.hudHairlineGold, 1.0f), "b08d3e", "0px") };
            }

            /// <summary>㊴ — cadres 131, 132, 133, 134, 135, 136 : 11 recette(s).</summary>
            public static class Forensic
            {
                public static readonly int[] Cadres = { 131, 132, 133, 134, 135, 136 };
                /// <summary>`.ac` — cadres 133, 134.</summary>
                public static readonly SpecFilet[] Ac = { F(Cotes.Tous, 1.0f, StyleFilet.Plein, Teinte.Hex("#2a3648", 1.0f), "2a3648", "0px") };
                /// <summary>`.ac.parti` — cadres 133, 134.</summary>
                public static readonly SpecFilet[] AcParti = { F(Cotes.Tous, 1.0f, StyleFilet.Tirete, Teinte.Hex("#2a3648", 1.0f), "2a3648", "0px") };
                /// <summary>`.cerne` — cadres 131, 132, 133, 134, 135, 136.</summary>
                public static readonly SpecFilet[] Cerne = { F(Cotes.Tous, 1.0f, StyleFilet.Plein, Teinte.Jeton("hudHairlineGold", t => t.hudHairlineGold, 1.0f), "b08d3e", "3px") };
                /// <summary>`.cta6` — cadres 131, 132.</summary>
                public static readonly SpecFilet[] Cta6 = { F(Cotes.Tous, 1.0f, StyleFilet.Plein, Teinte.Jeton("hudHairlineGold", t => t.hudHairlineGold, 1.0f), "b08d3e", "0px") };
                /// <summary>`.elast` — cadres 131, 132, 133, 134, 135.</summary>
                public static readonly SpecFilet[] Elast = { F(Cotes.Tous, 1.0f, StyleFilet.Plein, Teinte.Hex("#2a3648", 1.0f), "2a3648", "0px") };
                /// <summary>`.enseigne` — cadres 131, 132, 133, 134, 135, 136.</summary>
                public static readonly SpecFilet[] Enseigne = { F(Cotes.Bas, 2.0f, StyleFilet.Plein, Teinte.Jeton("hudHairlineGold", t => t.hudHairlineGold, 1.0f), "b08d3e", "0px"), F(Cotes.Haut | Cotes.Droite | Cotes.Gauche, 1.0f, StyleFilet.Plein, Teinte.Hex("#2a3648", 1.0f), "2a3648", "0px") };
                /// <summary>`.fen` — cadres 131, 132, 133, 134, 135, 136.</summary>
                public static readonly SpecFilet[] Fen = { F(Cotes.Tous, 1.0f, StyleFilet.Plein, Teinte.Hex("#2a3648", 1.0f), "2a3648", "0px") };
                /// <summary>`.mano` — cadres 131, 132, 133, 134, 135, 136.</summary>
                public static readonly SpecFilet[] Mano = { F(Cotes.Tous, 2.0f, StyleFilet.Plein, Teinte.Jeton("hudHairlineGold", t => t.hudHairlineGold, 1.0f), "b08d3e", "50%") };
                /// <summary>`.pann` — cadres 131, 132, 133, 134, 135, 136.</summary>
                public static readonly SpecFilet[] Pann = { F(Cotes.Tous, 1.0f, StyleFilet.Plein, Teinte.Hex("#2a3648", 1.0f), "2a3648", "0px") };
                /// <summary>`.pi` — cadres 131, 132.</summary>
                public static readonly SpecFilet[] Pi = { F(Cotes.Tous, 1.0f, StyleFilet.Plein, Teinte.Hex("#2a3648", 1.0f), "2a3648", "0px") };
                /// <summary>`.pi.bout` — cadres 132.</summary>
                public static readonly SpecFilet[] PiBout = { F(Cotes.Tous, 1.0f, StyleFilet.Plein, Teinte.Jeton("accentDanger", t => t.accentDanger, 1.0f), "ff5a4d", "0px") };
            }

            /// <summary>㊳ — cadres 125, 126, 127, 128, 129, 130 : 16 recette(s).</summary>
            public static class Journal
            {
                public static readonly int[] Cadres = { 125, 126, 127, 128, 129, 130 };
                /// <summary>`.angle` — cadres 125.</summary>
                public static readonly SpecFilet[] Angle = { F(Cotes.Tous, 1.0f, StyleFilet.Plein, Teinte.Hex("#2a3648", 1.0f), "2a3648", "0px") };
                /// <summary>`.brv` — cadres 125.</summary>
                public static readonly SpecFilet[] Brv = { F(Cotes.Tous, 1.0f, StyleFilet.Plein, Teinte.Hex("#2a3648", 1.0f), "2a3648", "0px") };
                /// <summary>`.cerne` — cadres 125, 126, 127, 128, 129, 130.</summary>
                public static readonly SpecFilet[] Cerne = { F(Cotes.Tous, 1.0f, StyleFilet.Plein, Teinte.Jeton("hudHairlineGold", t => t.hudHairlineGold, 1.0f), "b08d3e", "3px") };
                /// <summary>`.cpl` — cadres 128.</summary>
                public static readonly SpecFilet[] Cpl = { F(Cotes.Tous, 1.0f, StyleFilet.Plein, Teinte.Hex("#2a3648", 1.0f), "2a3648", "0px") };
                /// <summary>`.cpl.vide6` — cadres 128.</summary>
                public static readonly SpecFilet[] CplVide6 = { F(Cotes.Tous, 1.0f, StyleFilet.Tirete, Teinte.Hex("#2a3648", 1.0f), "2a3648", "0px") };
                /// <summary>`.cta6` — cadres 125.</summary>
                public static readonly SpecFilet[] Cta6 = { F(Cotes.Tous, 1.0f, StyleFilet.Plein, Teinte.Jeton("hudHairlineGold", t => t.hudHairlineGold, 1.0f), "b08d3e", "0px") };
                /// <summary>`.cta6.eteint` — cadres 127.</summary>
                public static readonly SpecFilet[] Cta6Eteint = { F(Cotes.Tous, 1.0f, StyleFilet.Plein, Teinte.Hex("#2a3648", 1.0f), "2a3648", "0px") };
                /// <summary>`.elast` — cadres 125, 126, 127, 128, 129.</summary>
                public static readonly SpecFilet[] Elast = { F(Cotes.Tous, 1.0f, StyleFilet.Plein, Teinte.Hex("#2a3648", 1.0f), "2a3648", "0px") };
                /// <summary>`.enseigne` — cadres 125, 126, 127, 128, 129, 130.</summary>
                public static readonly SpecFilet[] Enseigne = { F(Cotes.Bas, 2.0f, StyleFilet.Plein, Teinte.Jeton("hudHairlineGold", t => t.hudHairlineGold, 1.0f), "b08d3e", "0px"), F(Cotes.Haut | Cotes.Droite | Cotes.Gauche, 1.0f, StyleFilet.Plein, Teinte.Hex("#2a3648", 1.0f), "2a3648", "0px") };
                /// <summary>`.evt` — cadres 126.</summary>
                public static readonly SpecFilet[] Evt = { F(Cotes.Tous, 1.0f, StyleFilet.Plein, Teinte.Hex("#2a3648", 1.0f), "2a3648", "0px") };
                /// <summary>`.evt.perm` — cadres 126, 127.</summary>
                public static readonly SpecFilet[] EvtPerm = { F(Cotes.Tous, 1.0f, StyleFilet.Plein, Teinte.Jeton("accentDanger", t => t.accentDanger, 1.0f), "ff5a4d", "0px") };
                /// <summary>`.fen` — cadres 125, 126, 127, 128, 129, 130.</summary>
                public static readonly SpecFilet[] Fen = { F(Cotes.Tous, 1.0f, StyleFilet.Plein, Teinte.Hex("#2a3648", 1.0f), "2a3648", "0px") };
                /// <summary>`.jrn` — cadres 125.</summary>
                public static readonly SpecFilet[] Jrn = { F(Cotes.Bas, 1.0f, StyleFilet.Plein, Teinte.Jeton("hudHairlineGold", t => t.hudHairlineGold, 1.0f), "b08d3e", "0px") };
                /// <summary>`.mano` — cadres 125, 126, 127, 128, 129, 130.</summary>
                public static readonly SpecFilet[] Mano = { F(Cotes.Tous, 2.0f, StyleFilet.Plein, Teinte.Jeton("hudHairlineGold", t => t.hudHairlineGold, 1.0f), "b08d3e", "50%") };
                /// <summary>`.pann` — cadres 126, 127, 128, 129, 130.</summary>
                public static readonly SpecFilet[] Pann = { F(Cotes.Tous, 1.0f, StyleFilet.Plein, Teinte.Hex("#2a3648", 1.0f), "2a3648", "0px") };
                /// <summary>`.une` — cadres 125.</summary>
                public static readonly SpecFilet[] Une = { F(Cotes.Tous, 1.0f, StyleFilet.Plein, Teinte.Hex("#2a3648", 1.0f), "2a3648", "0px") };
            }

            /// <summary>㊵ — cadres 137, 138, 139, 140, 141, 142 : 14 recette(s).</summary>
            public static class Filiere
            {
                public static readonly int[] Cadres = { 137, 138, 139, 140, 141, 142 };
                /// <summary>`.cerne` — cadres 137, 138, 139, 140, 141, 142.</summary>
                public static readonly SpecFilet[] Cerne = { F(Cotes.Tous, 1.0f, StyleFilet.Plein, Teinte.Jeton("hudHairlineGold", t => t.hudHairlineGold, 1.0f), "b08d3e", "3px") };
                /// <summary>`.cta6` — cadres 137, 138, 140.</summary>
                public static readonly SpecFilet[] Cta6 = { F(Cotes.Tous, 1.0f, StyleFilet.Plein, Teinte.Jeton("hudHairlineGold", t => t.hudHairlineGold, 1.0f), "b08d3e", "0px") };
                /// <summary>`.cuve` — cadres 137, 138.</summary>
                public static readonly SpecFilet[] Cuve = { F(Cotes.Tous, 1.0f, StyleFilet.Plein, Teinte.Hex("#2a3648", 1.0f), "2a3648", "2px") };
                /// <summary>`.elast` — cadres 137, 138, 139, 140, 141.</summary>
                public static readonly SpecFilet[] Elast = { F(Cotes.Tous, 1.0f, StyleFilet.Plein, Teinte.Hex("#2a3648", 1.0f), "2a3648", "0px") };
                /// <summary>`.enseigne` — cadres 137, 138, 139, 140, 141, 142.</summary>
                public static readonly SpecFilet[] Enseigne = { F(Cotes.Bas, 2.0f, StyleFilet.Plein, Teinte.Jeton("hudHairlineGold", t => t.hudHairlineGold, 1.0f), "b08d3e", "0px"), F(Cotes.Haut | Cotes.Droite | Cotes.Gauche, 1.0f, StyleFilet.Plein, Teinte.Hex("#2a3648", 1.0f), "2a3648", "0px") };
                /// <summary>`.et6` — cadres 137, 138.</summary>
                public static readonly SpecFilet[] Et6 = { F(Cotes.Tous, 1.0f, StyleFilet.Plein, Teinte.Hex("#2a3648", 1.0f), "2a3648", "0px") };
                /// <summary>`.et6.alerte` — cadres 138.</summary>
                public static readonly SpecFilet[] Et6Alerte = { F(Cotes.Tous, 1.0f, StyleFilet.Plein, Teinte.Jeton("accentWarning", t => t.accentWarning, 1.0f), "ff9e3d", "0px") };
                /// <summary>`.fen` — cadres 137, 138, 139, 140, 141, 142.</summary>
                public static readonly SpecFilet[] Fen = { F(Cotes.Tous, 1.0f, StyleFilet.Plein, Teinte.Hex("#2a3648", 1.0f), "2a3648", "0px") };
                /// <summary>`.mail.flou` — cadres 139.</summary>
                public static readonly SpecFilet[] MailFlou = { F(Cotes.Tous, 1.0f, StyleFilet.Tirete, Teinte.Jeton("accentWarning", t => t.accentWarning, 1.0f), "ff9e3d", "0px") };
                /// <summary>`.mail.tenu` — cadres 139.</summary>
                public static readonly SpecFilet[] MailTenu = { F(Cotes.Tous, 1.0f, StyleFilet.Plein, Teinte.Jeton("accentCalm", t => t.accentCalm, 1.0f), "7db36a", "0px") };
                /// <summary>`.mano` — cadres 137, 138, 139, 140, 141, 142.</summary>
                public static readonly SpecFilet[] Mano = { F(Cotes.Tous, 2.0f, StyleFilet.Plein, Teinte.Jeton("hudHairlineGold", t => t.hudHairlineGold, 1.0f), "b08d3e", "50%") };
                /// <summary>`.n` — cadres 139.</summary>
                public static readonly SpecFilet[] N = { F(Cotes.Tous, 1.0f, StyleFilet.Plein, Teinte.Jeton("accentCalm", t => t.accentCalm, 1.0f), "7db36a", "50%") };
                /// <summary>`.n` — cadres 139.</summary>
                public static readonly SpecFilet[] N_2 = { F(Cotes.Tous, 1.0f, StyleFilet.Plein, Teinte.Jeton("accentWarning", t => t.accentWarning, 1.0f), "ff9e3d", "50%") };
                /// <summary>`.pann` — cadres 137, 138, 139, 140, 141, 142.</summary>
                public static readonly SpecFilet[] Pann = { F(Cotes.Tous, 1.0f, StyleFilet.Plein, Teinte.Hex("#2a3648", 1.0f), "2a3648", "0px") };
            }

            /// <summary>㉒ — cadres 95, 96, 97 : 10 recette(s).</summary>
            public static class Profile
            {
                public static readonly int[] Cadres = { 95, 96, 97 };
                /// <summary>`.lev` — cadres 95, 96, 97.</summary>
                public static readonly SpecFilet[] Lev = { F(Cotes.Tous, 1.0f, StyleFilet.Plein, Teinte.Hex("#5a4a2a", 1.0f), "5a4a2a", "3px") };
                /// <summary>`.lev.rouge` — cadres 97.</summary>
                public static readonly SpecFilet[] LevRouge = { F(Cotes.Tous, 1.0f, StyleFilet.Plein, Teinte.Hex("#5c2a2a", 1.0f), "5c2a2a", "3px") };
                /// <summary>`.mano` — cadres 95, 96, 97.</summary>
                public static readonly SpecFilet[] Mano = { F(Cotes.Tous, 2.0f, StyleFilet.Plein, Teinte.Jeton("hudHairlineGold", t => t.hudHairlineGold, 1.0f), "b08d3e", "50%") };
                /// <summary>`.molette` — cadres 95, 96, 97.</summary>
                public static readonly SpecFilet[] Molette = { F(Cotes.Tous, 2.0f, StyleFilet.Plein, Teinte.Hex("#3a2f14", 1.0f), "3a2f14", "50%") };
                /// <summary>`.pl` — cadres 95, 96, 97.</summary>
                public static readonly SpecFilet[] Pl = { F(Cotes.Tous, 1.0f, StyleFilet.Plein, Teinte.Hex("#6b4f14", 1.0f), "6b4f14", "0px") };
                /// <summary>`.plaque-id` — cadres 95, 96, 97.</summary>
                public static readonly SpecFilet[] PlaqueId = { F(Cotes.Tous, 1.0f, StyleFilet.Plein, Teinte.Hex("#4b5763", 1.0f), "4b5763", "4px") };
                /// <summary>`.rivets` — cadres 95, 96, 97.</summary>
                public static readonly SpecFilet[] Rivets = { F(Cotes.Tous, 2.0f, StyleFilet.Plein, Teinte.Hex("#47535f", 1.0f), "47535f", "5px") };
                /// <summary>`.tir` — cadres 95, 96, 97.</summary>
                public static readonly SpecFilet[] Tir = { F(Cotes.Tous, 1.0f, StyleFilet.Plein, Teinte.Hex("#414d59", 1.0f), "414d59", "3px") };
                /// <summary>`.tog` — cadres 97.</summary>
                public static readonly SpecFilet[] Tog = { F(Cotes.Tous, 1.0f, StyleFilet.Plein, Teinte.Hex("#4b5763", 1.0f), "4b5763", "8px") };
                /// <summary>`.tog.on` — cadres 95, 96.</summary>
                public static readonly SpecFilet[] TogOn = { F(Cotes.Tous, 1.0f, StyleFilet.Plein, Teinte.Hex("#8a6a22", 1.0f), "8a6a22", "8px") };
            }

            /// <summary>㊱ — cadres 113, 114, 115, 116, 117, 118 : 13 recette(s).</summary>
            public static class Horizon
            {
                public static readonly int[] Cadres = { 113, 114, 115, 116, 117, 118 };
                /// <summary>`.cerne` — cadres 113, 114, 115, 116, 117, 118.</summary>
                public static readonly SpecFilet[] Cerne = { F(Cotes.Tous, 1.0f, StyleFilet.Plein, Teinte.Jeton("hudHairlineGold", t => t.hudHairlineGold, 1.0f), "b08d3e", "3px") };
                /// <summary>`.ct` — cadres 113, 114, 115, 116.</summary>
                public static readonly SpecFilet[] Ct = { F(Cotes.Tous, 1.0f, StyleFilet.Plein, Teinte.Hex("#2a3648", 1.0f), "2a3648", "0px") };
                /// <summary>`.ct.hs` — cadres 114.</summary>
                public static readonly SpecFilet[] CtHs = { F(Cotes.Tous, 1.0f, StyleFilet.Plein, Teinte.Hex("#2a3648", 1.0f), "2a3648", "0px") };
                /// <summary>`.ct.pris` — cadres 115.</summary>
                public static readonly SpecFilet[] CtPris = { F(Cotes.Tous, 1.0f, StyleFilet.Plein, Teinte.Jeton("hudHairlineGold", t => t.hudHairlineGold, 1.0f), "b08d3e", "0px") };
                /// <summary>`.ct.pris.recule` — cadres 114.</summary>
                public static readonly SpecFilet[] CtPrisRecule = { F(Cotes.Tous, 1.0f, StyleFilet.Plein, Teinte.Jeton("accentDanger", t => t.accentDanger, 1.0f), "ff5a4d", "0px") };
                /// <summary>`.ct.recule` — cadres 113, 115, 116.</summary>
                public static readonly SpecFilet[] CtRecule = { F(Cotes.Tous, 1.0f, StyleFilet.Plein, Teinte.Jeton("accentDanger", t => t.accentDanger, 1.0f), "ff5a4d", "0px") };
                /// <summary>`.cta6` — cadres 113, 115.</summary>
                public static readonly SpecFilet[] Cta6 = { F(Cotes.Tous, 1.0f, StyleFilet.Plein, Teinte.Jeton("hudHairlineGold", t => t.hudHairlineGold, 1.0f), "b08d3e", "0px") };
                /// <summary>`.elast` — cadres 113, 114, 115, 116, 117.</summary>
                public static readonly SpecFilet[] Elast = { F(Cotes.Tous, 1.0f, StyleFilet.Plein, Teinte.Hex("#2a3648", 1.0f), "2a3648", "0px") };
                /// <summary>`.enseigne` — cadres 113, 114, 115, 116, 117, 118.</summary>
                public static readonly SpecFilet[] Enseigne = { F(Cotes.Bas, 2.0f, StyleFilet.Plein, Teinte.Jeton("hudHairlineGold", t => t.hudHairlineGold, 1.0f), "b08d3e", "0px"), F(Cotes.Haut | Cotes.Droite | Cotes.Gauche, 1.0f, StyleFilet.Plein, Teinte.Hex("#2a3648", 1.0f), "2a3648", "0px") };
                /// <summary>`.fen` — cadres 113, 114, 115, 116, 117, 118.</summary>
                public static readonly SpecFilet[] Fen = { F(Cotes.Tous, 1.0f, StyleFilet.Plein, Teinte.Hex("#2a3648", 1.0f), "2a3648", "0px") };
                /// <summary>`.mano` — cadres 113, 114, 115, 116, 117, 118.</summary>
                public static readonly SpecFilet[] Mano = { F(Cotes.Tous, 2.0f, StyleFilet.Plein, Teinte.Jeton("hudHairlineGold", t => t.hudHairlineGold, 1.0f), "b08d3e", "50%") };
                /// <summary>`.pann` — cadres 114, 115, 116, 117, 118.</summary>
                public static readonly SpecFilet[] Pann = { F(Cotes.Tous, 1.0f, StyleFilet.Plein, Teinte.Hex("#2a3648", 1.0f), "2a3648", "0px") };
                /// <summary>`.recul` — cadres 113, 114, 115, 116.</summary>
                public static readonly SpecFilet[] Recul = { F(Cotes.Haut, 1.0f, StyleFilet.Plein, Teinte.Jeton("accentDanger", t => t.accentDanger, 0.267f), "ff5a4d@0.267", "0px") };
            }

            /// <summary>㉜ — cadres 73, 74, 75, 76, 77, 78 : 16 recette(s).</summary>
            public static class Delegation
            {
                public static readonly int[] Cadres = { 73, 74, 75, 76, 77, 78 };
                /// <summary>`.l` — cadres 76.</summary>
                public static readonly SpecFilet[] L = { F(Cotes.Haut, 1.0f, StyleFilet.Pointille, Teinte.Hex("#3b4650", 1.0f), "3b4650", "0px") };
                /// <summary>`.mano` — cadres 73, 74, 75, 76, 77, 78.</summary>
                public static readonly SpecFilet[] Mano = { F(Cotes.Tous, 2.0f, StyleFilet.Plein, Teinte.Jeton("hudHairlineGold", t => t.hudHairlineGold, 1.0f), "b08d3e", "50%") };
                /// <summary>`.rond` — cadres 73, 74, 75.</summary>
                public static readonly SpecFilet[] Rond = { F(Cotes.Tous, 2.0f, StyleFilet.Plein, Teinte.Hex("#8a6a22", 1.0f), "8a6a22", "50%") };
                /// <summary>`.rond` — cadres 77.</summary>
                public static readonly SpecFilet[] Rond_2 = { F(Cotes.Tous, 2.0f, StyleFilet.Plein, Teinte.Hex("#4a3a3a", 1.0f), "4a3a3a", "50%") };
                /// <summary>`.sv-apercu` — cadres 76.</summary>
                public static readonly SpecFilet[] SvApercu = { F(Cotes.Tous, 1.0f, StyleFilet.Plein, Teinte.Hex("#3b4650", 1.0f), "3b4650", "3px") };
                /// <summary>`.sv-bas` — cadres 73, 74, 75, 76, 77, 78.</summary>
                public static readonly SpecFilet[] SvBas = { F(Cotes.Haut, 2.0f, StyleFilet.Plein, Teinte.Hex("#2c3640", 1.0f), "2c3640", "0px") };
                /// <summary>`.sv-geste` — cadres 73, 74, 75, 76.</summary>
                public static readonly SpecFilet[] SvGeste = { F(Cotes.Tous, 1.0f, StyleFilet.Plein, Teinte.Hex("#5a4a2a", 1.0f), "5a4a2a", "3px") };
                /// <summary>`.sv-geste.mort` — cadres 77.</summary>
                public static readonly SpecFilet[] SvGesteMort = { F(Cotes.Tous, 1.0f, StyleFilet.Plein, Teinte.Hex("#4a3a3a", 1.0f), "4a3a3a", "3px") };
                /// <summary>`.sv-jeton` — cadres 73, 74, 75.</summary>
                public static readonly SpecFilet[] SvJeton = { F(Cotes.Tous, 1.0f, StyleFilet.Plein, Teinte.Hex("#5a4a2a", 1.0f), "5a4a2a", "3px") };
                /// <summary>`.sv-jeton.use` — cadres 77.</summary>
                public static readonly SpecFilet[] SvJetonUse = { F(Cotes.Tous, 1.0f, StyleFilet.Plein, Teinte.Hex("#4a3a3a", 1.0f), "4a3a3a", "3px") };
                /// <summary>`.sv-plaque` — cadres 73, 74, 75, 77.</summary>
                public static readonly SpecFilet[] SvPlaque = { F(Cotes.Tous, 1.0f, StyleFilet.Plein, Teinte.Hex("#38434e", 1.0f), "38434e", "2px") };
                /// <summary>`.sv-plaque.confiee` — cadres 75, 76, 77.</summary>
                public static readonly SpecFilet[] SvPlaqueConfiee = { F(Cotes.Tous, 1.0f, StyleFilet.Plein, Teinte.Hex("#5a4a2a", 1.0f), "5a4a2a", "2px") };
                /// <summary>`.sv-plaque.gris` — cadres 78.</summary>
                public static readonly SpecFilet[] SvPlaqueGris = { F(Cotes.Tous, 1.0f, StyleFilet.Plein, Teinte.Hex("#38434e", 1.0f), "38434e", "2px") };
                /// <summary>`.sv-plaque.viser` — cadres 74.</summary>
                public static readonly SpecFilet[] SvPlaqueViser = { F(Cotes.Tous, 1.0f, StyleFilet.Plein, Teinte.Hex("#8a6a22", 1.0f), "8a6a22", "2px") };
                /// <summary>`.sv-rien` — cadres 77, 78.</summary>
                public static readonly SpecFilet[] SvRien = { F(Cotes.Gauche, 2.0f, StyleFilet.Plein, Teinte.Hex("#3b4650", 1.0f), "3b4650", "0px") };
                /// <summary>`.sv-tete` — cadres 73, 74, 75, 76, 77, 78.</summary>
                public static readonly SpecFilet[] SvTete = { F(Cotes.Bas, 1.0f, StyleFilet.Plein, Teinte.Hex("#333c46", 1.0f), "333c46", "0px") };
            }

            /// <summary>㉚ — cadres 48, 49, 50, 51, 52, 53 : 16 recette(s).</summary>
            public static class ChaineDAppro
            {
                public static readonly int[] Cadres = { 48, 49, 50, 51, 52, 53 };
                /// <summary>`.bas` — cadres 48, 49, 50, 51, 52, 53.</summary>
                public static readonly SpecFilet[] Bas = { F(Cotes.Haut, 2.0f, StyleFilet.Plein, Teinte.Hex("#2c3640", 1.0f), "2c3640", "0px") };
                /// <summary>`.entete` — cadres 48, 49, 50, 51, 52, 53.</summary>
                public static readonly SpecFilet[] Entete = { F(Cotes.Bas, 1.0f, StyleFilet.Plein, Teinte.Hex("#3a352c", 1.0f), "3a352c", "0px") };
                /// <summary>`.etat` — cadres 50, 51.</summary>
                public static readonly SpecFilet[] Etat = { F(Cotes.Tous, 1.0f, StyleFilet.Plein, Teinte.Hex("#5a544a", 1.0f), "5a544a", "2px") };
                /// <summary>`.etat` — cadres 50, 51, 52.</summary>
                public static readonly SpecFilet[] Etat_2 = { F(Cotes.Tous, 1.0f, StyleFilet.Plein, Teinte.Hex("#d97a6a", 1.0f), "d97a6a", "2px") };
                /// <summary>`.geste` — cadres 48, 50, 51, 52.</summary>
                public static readonly SpecFilet[] Geste = { F(Cotes.Tous, 1.0f, StyleFilet.Plein, Teinte.Hex("#5a4a2a", 1.0f), "5a4a2a", "3px") };
                /// <summary>`.geste.mort` — cadres 53.</summary>
                public static readonly SpecFilet[] GesteMort = { F(Cotes.Tous, 1.0f, StyleFilet.Plein, Teinte.Hex("#4a3a3a", 1.0f), "4a3a3a", "3px") };
                /// <summary>`.l` — cadres 48, 49, 53.</summary>
                public static readonly SpecFilet[] L = { F(Cotes.Haut, 1.0f, StyleFilet.Pointille, Teinte.Hex("#c3b79e", 1.0f), "c3b79e", "0px") };
                /// <summary>`.mano` — cadres 48, 49, 50, 51, 52, 53.</summary>
                public static readonly SpecFilet[] Mano = { F(Cotes.Tous, 2.0f, StyleFilet.Plein, Teinte.Jeton("hudHairlineGold", t => t.hudHairlineGold, 1.0f), "b08d3e", "50%") };
                /// <summary>`.noeud` — cadres 50, 51, 52.</summary>
                public static readonly SpecFilet[] Noeud = { F(Cotes.Tous, 1.0f, StyleFilet.Plein, Teinte.Hex("#3a352c", 1.0f), "3a352c", "3px") };
                /// <summary>`.noeud.flou` — cadres 50, 51.</summary>
                public static readonly SpecFilet[] NoeudFlou = { F(Cotes.Tous, 1.0f, StyleFilet.Plein, Teinte.Hex("#3a352c", 1.0f), "3a352c", "3px") };
                /// <summary>`.noeud.trouve` — cadres 52.</summary>
                public static readonly SpecFilet[] NoeudTrouve = { F(Cotes.Tous, 1.0f, StyleFilet.Plein, Teinte.Hex("#8c2f36", 1.0f), "8c2f36", "3px") };
                /// <summary>`.pic` — cadres 50, 51, 52.</summary>
                public static readonly SpecFilet[] Pic = { F(Cotes.Tous, 1.0f, StyleFilet.Plein, Teinte.Hex("#4b463c", 1.0f), "4b463c", "3px") };
                /// <summary>`.pic` — cadres 52.</summary>
                public static readonly SpecFilet[] Pic_2 = { F(Cotes.Tous, 1.0f, StyleFilet.Plein, Teinte.Hex("#8c2f36", 1.0f), "8c2f36", "3px") };
                /// <summary>`.rien` — cadres 49, 53.</summary>
                public static readonly SpecFilet[] Rien = { F(Cotes.Gauche, 2.0f, StyleFilet.Plein, Teinte.Hex("#3b4650", 1.0f), "3b4650", "0px") };
                /// <summary>`.tuyau` — cadres 50.</summary>
                public static readonly SpecFilet[] Tuyau = { F(Cotes.Gauche, 3.0f, StyleFilet.Plein, Teinte.Hex("#4b463c", 1.0f), "4b463c", "0px") };
                /// <summary>`.tuyau.refoule` — cadres 50, 51, 52.</summary>
                public static readonly SpecFilet[] TuyauRefoule = { F(Cotes.Gauche, 3.0f, StyleFilet.Plein, Teinte.Hex("#8c2f36", 1.0f), "8c2f36", "0px") };
            }

            /// <summary>㉘ — cadres 54, 55, 56, 57, 58 : 15 recette(s).</summary>
            public static class Distribution
            {
                public static readonly int[] Cadres = { 54, 55, 56, 57, 58 };
                /// <summary>`.av` — cadres 54, 55, 56, 57, 58.</summary>
                public static readonly SpecFilet[] Av = { F(Cotes.Tous, 1.0f, StyleFilet.Plein, Teinte.Hex("#3b4650", 1.0f), "3b4650", "50%") };
                /// <summary>`.bas` — cadres 54, 55, 56, 57, 58.</summary>
                public static readonly SpecFilet[] Bas = { F(Cotes.Haut, 2.0f, StyleFilet.Plein, Teinte.Hex("#2c3640", 1.0f), "2c3640", "0px") };
                /// <summary>`.cadre-b` — cadres 54, 55, 56, 57, 58.</summary>
                public static readonly SpecFilet[] CadreB = { F(Cotes.Tous, 5.0f, StyleFilet.Plein, Teinte.Hex("#4a3722", 1.0f), "4a3722", "3px") };
                /// <summary>`.cliche` — cadres 58.</summary>
                public static readonly SpecFilet[] Cliche = { F(Cotes.Tous, 1.0f, StyleFilet.Plein, Teinte.Hex("#cbbfa4", 1.0f), "cbbfa4", "0px") };
                /// <summary>`.entete` — cadres 54, 55, 56, 57, 58.</summary>
                public static readonly SpecFilet[] Entete = { F(Cotes.Bas, 1.0f, StyleFilet.Plein, Teinte.Hex("#3d3024", 1.0f), "3d3024", "0px") };
                /// <summary>`.fiche.droite` — cadres 54, 55, 56, 57.</summary>
                public static readonly SpecFilet[] FicheDroite = { F(Cotes.Tous, 1.0f, StyleFilet.Plein, Teinte.Hex("#cbbfa4", 1.0f), "cbbfa4", "1px") };
                /// <summary>`.fiche.gauche` — cadres 54, 55, 56, 57.</summary>
                public static readonly SpecFilet[] FicheGauche = { F(Cotes.Tous, 1.0f, StyleFilet.Plein, Teinte.Hex("#cbbfa4", 1.0f), "cbbfa4", "1px") };
                /// <summary>`.geste` — cadres 54, 56, 57.</summary>
                public static readonly SpecFilet[] Geste = { F(Cotes.Tous, 1.0f, StyleFilet.Plein, Teinte.Hex("#5a4a2a", 1.0f), "5a4a2a", "3px") };
                /// <summary>`.iss` — cadres 58.</summary>
                public static readonly SpecFilet[] Iss = { F(Cotes.Tous, 1.0f, StyleFilet.Plein, Teinte.Hex("#3b4650", 1.0f), "3b4650", "3px") };
                /// <summary>`.iss.or` — cadres 58.</summary>
                public static readonly SpecFilet[] IssOr = { F(Cotes.Tous, 1.0f, StyleFilet.Plein, Teinte.Hex("#5a4a2a", 1.0f), "5a4a2a", "3px") };
                /// <summary>`.iss.rouge` — cadres 58.</summary>
                public static readonly SpecFilet[] IssRouge = { F(Cotes.Tous, 1.0f, StyleFilet.Plein, Teinte.Hex("#5c2a2a", 1.0f), "5c2a2a", "3px") };
                /// <summary>`.l` — cadres 54, 55, 56, 57.</summary>
                public static readonly SpecFilet[] L = { F(Cotes.Haut, 1.0f, StyleFilet.Pointille, Teinte.Hex("#3d3024", 1.0f), "3d3024", "0px") };
                /// <summary>`.lecture` — cadres 54, 55, 56, 57.</summary>
                public static readonly SpecFilet[] Lecture = { F(Cotes.Haut, 1.0f, StyleFilet.Plein, Teinte.Hex("#3d3024", 1.0f), "3d3024", "0px") };
                /// <summary>`.mano` — cadres 54, 55, 56, 57, 58.</summary>
                public static readonly SpecFilet[] Mano = { F(Cotes.Tous, 2.0f, StyleFilet.Plein, Teinte.Jeton("hudHairlineGold", t => t.hudHairlineGold, 1.0f), "b08d3e", "50%") };
                /// <summary>`.rien` — cadres 55.</summary>
                public static readonly SpecFilet[] Rien = { F(Cotes.Gauche, 2.0f, StyleFilet.Plein, Teinte.Hex("#3b4650", 1.0f), "3b4650", "0px") };
            }

            /// <summary>㉛ — cadres 67, 68, 69, 70, 71, 72 : 17 recette(s).</summary>
            public static class Loi
            {
                public static readonly int[] Cadres = { 67, 68, 69, 70, 71, 72 };
                /// <summary>`.mano` — cadres 67, 68, 69, 70, 71, 72.</summary>
                public static readonly SpecFilet[] Mano = { F(Cotes.Tous, 2.0f, StyleFilet.Plein, Teinte.Jeton("hudHairlineGold", t => t.hudHairlineGold, 1.0f), "b08d3e", "50%") };
                /// <summary>`.pl-alerte` — cadres 72.</summary>
                public static readonly SpecFilet[] PlAlerte = { F(Cotes.Tous, 1.0f, StyleFilet.Plein, Teinte.Hex("#8a6a22", 1.0f), "8a6a22", "3px") };
                /// <summary>`.pl-av` — cadres 67, 69, 70, 71, 72.</summary>
                public static readonly SpecFilet[] PlAv = { F(Cotes.Tous, 1.0f, StyleFilet.Plein, Teinte.Hex("#46515c", 1.0f), "46515c", "3px") };
                /// <summary>`.pl-bas` — cadres 67, 68, 69, 70, 71, 72.</summary>
                public static readonly SpecFilet[] PlBas = { F(Cotes.Haut, 2.0f, StyleFilet.Plein, Teinte.Hex("#2c3640", 1.0f), "2c3640", "0px") };
                /// <summary>`.pl-choix` — cadres 68, 71.</summary>
                public static readonly SpecFilet[] PlChoix = { F(Cotes.Tous, 1.0f, StyleFilet.Plein, Teinte.Hex("#303a44", 1.0f), "303a44", "3px") };
                /// <summary>`.pl-choix.pris` — cadres 68.</summary>
                public static readonly SpecFilet[] PlChoixPris = { F(Cotes.Tous, 1.0f, StyleFilet.Plein, Teinte.Hex("#4f7f3f", 1.0f), "4f7f3f", "3px") };
                /// <summary>`.pl-choix.risque` — cadres 68, 71.</summary>
                public static readonly SpecFilet[] PlChoixRisque = { F(Cotes.Tous, 1.0f, StyleFilet.Plein, Teinte.Hex("#8a6a22", 1.0f), "8a6a22", "3px") };
                /// <summary>`.pl-geste` — cadres 67, 68, 69, 71.</summary>
                public static readonly SpecFilet[] PlGeste = { F(Cotes.Tous, 1.0f, StyleFilet.Plein, Teinte.Hex("#5a4a2a", 1.0f), "5a4a2a", "3px") };
                /// <summary>`.pl-geste.rouge` — cadres 72.</summary>
                public static readonly SpecFilet[] PlGesteRouge = { F(Cotes.Tous, 1.0f, StyleFilet.Plein, Teinte.Hex("#5c2a2a", 1.0f), "5c2a2a", "3px") };
                /// <summary>`.pl-item` — cadres 67, 69.</summary>
                public static readonly SpecFilet[] PlItem = { F(Cotes.Tous, 1.0f, StyleFilet.Plein, Teinte.Hex("#303a44", 1.0f), "303a44", "2px") };
                /// <summary>`.pl-item.lache` — cadres 69, 70.</summary>
                public static readonly SpecFilet[] PlItemLache = { F(Cotes.Tous, 1.0f, StyleFilet.Plein, Teinte.Hex("#6b3a38", 1.0f), "6b3a38", "2px") };
                /// <summary>`.pl-rien` — cadres 68, 70, 72.</summary>
                public static readonly SpecFilet[] PlRien = { F(Cotes.Gauche, 2.0f, StyleFilet.Plein, Teinte.Hex("#3b4650", 1.0f), "3b4650", "0px") };
                /// <summary>`.pl-tete` — cadres 67, 68, 69, 70, 71, 72.</summary>
                public static readonly SpecFilet[] PlTete = { F(Cotes.Bas, 1.0f, StyleFilet.Plein, Teinte.Hex("#333c46", 1.0f), "333c46", "0px") };
                /// <summary>`.pl-vitre` — cadres 67, 69, 70, 71, 72.</summary>
                public static readonly SpecFilet[] PlVitre = { F(Cotes.Tous, 1.0f, StyleFilet.Plein, Teinte.Hex("#3b4650", 1.0f), "3b4650", "3px") };
                /// <summary>`.tag` — cadres 68.</summary>
                public static readonly SpecFilet[] Tag = { F(Cotes.Tous, 1.0f, StyleFilet.Plein, Teinte.Hex("#7fc99a", 1.0f), "7fc99a", "2px") };
                /// <summary>`.tag` — cadres 68, 71.</summary>
                public static readonly SpecFilet[] Tag_2 = { F(Cotes.Tous, 1.0f, StyleFilet.Plein, Teinte.Hex("#8d99a6", 1.0f), "8d99a6", "2px") };
                /// <summary>`.tag` — cadres 68, 71.</summary>
                public static readonly SpecFilet[] Tag_3 = { F(Cotes.Tous, 1.0f, StyleFilet.Plein, Teinte.Jeton("hudMoneyUnderlineGold", t => t.hudMoneyUnderlineGold, 1.0f), "d9ab4e", "2px") };
            }

            /// <summary>㉝ — cadres 79, 80, 81, 82, 83, 84 : 17 recette(s).</summary>
            public static class Demolition
            {
                public static readonly int[] Cadres = { 79, 80, 81, 82, 83, 84 };
                /// <summary>`.dm-bas` — cadres 79, 80, 81, 82, 83, 84.</summary>
                public static readonly SpecFilet[] DmBas = { F(Cotes.Haut, 2.0f, StyleFilet.Plein, Teinte.Hex("#2c3640", 1.0f), "2c3640", "0px") };
                /// <summary>`.dm-geste` — cadres 79, 83, 84.</summary>
                public static readonly SpecFilet[] DmGeste = { F(Cotes.Tous, 1.0f, StyleFilet.Plein, Teinte.Hex("#5a4a2a", 1.0f), "5a4a2a", "3px") };
                /// <summary>`.dm-geste.mort` — cadres 82.</summary>
                public static readonly SpecFilet[] DmGesteMort = { F(Cotes.Tous, 1.0f, StyleFilet.Plein, Teinte.Hex("#4a3a3a", 1.0f), "4a3a3a", "3px") };
                /// <summary>`.dm-geste.rouge` — cadres 80, 81.</summary>
                public static readonly SpecFilet[] DmGesteRouge = { F(Cotes.Tous, 1.0f, StyleFilet.Plein, Teinte.Hex("#5c2a2a", 1.0f), "5c2a2a", "3px") };
                /// <summary>`.dm-glob` — cadres 79.</summary>
                public static readonly SpecFilet[] DmGlob = { F(Cotes.Tous, 1.0f, StyleFilet.Plein, Teinte.Hex("#3c3e35", 1.0f), "3c3e35", "3px") };
                /// <summary>`.dm-offre` — cadres 83, 84.</summary>
                public static readonly SpecFilet[] DmOffre = { F(Cotes.Tous, 1.0f, StyleFilet.Plein, Teinte.Hex("#3c3e35", 1.0f), "3c3e35", "3px") };
                /// <summary>`.dm-offre.un` — cadres 83.</summary>
                public static readonly SpecFilet[] DmOffreUn = { F(Cotes.Tous, 1.0f, StyleFilet.Plein, Teinte.Hex("#5a4a2a", 1.0f), "5a4a2a", "3px") };
                /// <summary>`.dm-offre.un.close` — cadres 84.</summary>
                public static readonly SpecFilet[] DmOffreUnClose = { F(Cotes.Tous, 1.0f, StyleFilet.Plein, Teinte.Hex("#5a4a2a", 1.0f), "5a4a2a", "3px") };
                /// <summary>`.dm-parcelle` — cadres 83, 84.</summary>
                public static readonly SpecFilet[] DmParcelle = { F(Cotes.Tous, 2.0f, StyleFilet.Tirete, Teinte.Hex("#5a5c4e", 1.0f), "5a5c4e", "3px") };
                /// <summary>`.dm-penal` — cadres 79.</summary>
                public static readonly SpecFilet[] DmPenal = { F(Cotes.Tous, 1.0f, StyleFilet.Plein, Teinte.Hex("#8a6a22", 1.0f), "8a6a22", "2px") };
                /// <summary>`.dm-rien` — cadres 82, 84.</summary>
                public static readonly SpecFilet[] DmRien = { F(Cotes.Gauche, 2.0f, StyleFilet.Plein, Teinte.Hex("#3b4650", 1.0f), "3b4650", "0px") };
                /// <summary>`.dm-tete` — cadres 79, 80, 81, 82, 83, 84.</summary>
                public static readonly SpecFilet[] DmTete = { F(Cotes.Bas, 1.0f, StyleFilet.Plein, Teinte.Hex("#3a3c34", 1.0f), "3a3c34", "0px") };
                /// <summary>`.l` — cadres 80, 81, 82.</summary>
                public static readonly SpecFilet[] L = { F(Cotes.Haut, 1.0f, StyleFilet.Pointille, Teinte.Hex("#c2bda4", 1.0f), "c2bda4", "0px") };
                /// <summary>`.mano` — cadres 79, 80, 81, 82, 83, 84.</summary>
                public static readonly SpecFilet[] Mano = { F(Cotes.Tous, 2.0f, StyleFilet.Plein, Teinte.Jeton("hudHairlineGold", t => t.hudHairlineGold, 1.0f), "b08d3e", "50%") };
                /// <summary>`.tag` — cadres 83, 84.</summary>
                public static readonly SpecFilet[] Tag = { F(Cotes.Tous, 1.0f, StyleFilet.Plein, Teinte.Hex("#8f9285", 1.0f), "8f9285", "2px") };
                /// <summary>`.tag` — cadres 83.</summary>
                public static readonly SpecFilet[] Tag_2 = { F(Cotes.Tous, 1.0f, StyleFilet.Plein, Teinte.Jeton("hudMoneyUnderlineGold", t => t.hudMoneyUnderlineGold, 1.0f), "d9ab4e", "2px") };
                /// <summary>`.tag` — cadres 84.</summary>
                public static readonly SpecFilet[] Tag_3 = { F(Cotes.Tous, 1.0f, StyleFilet.Plein, Teinte.Hex("#987979", 1.0f), "987979", "2px") };
            }

            /// <summary>㉞ — cadres 85, 86, 87, 88, 89, 90, 91 : 16 recette(s).</summary>
            public static class Carnet
            {
                public static readonly int[] Cadres = { 85, 86, 87, 88, 89, 90, 91 };
                /// <summary>`.cn-bas` — cadres 85, 86, 87, 88, 89, 90, 91.</summary>
                public static readonly SpecFilet[] CnBas = { F(Cotes.Haut, 2.0f, StyleFilet.Plein, Teinte.Hex("#2c3640", 1.0f), "2c3640", "0px") };
                /// <summary>`.cn-geste` — cadres 85, 87, 89, 90.</summary>
                public static readonly SpecFilet[] CnGeste = { F(Cotes.Tous, 1.0f, StyleFilet.Plein, Teinte.Hex("#5a4a2a", 1.0f), "5a4a2a", "3px") };
                /// <summary>`.cn-geste.mort` — cadres 88.</summary>
                public static readonly SpecFilet[] CnGesteMort = { F(Cotes.Tous, 1.0f, StyleFilet.Plein, Teinte.Hex("#4a3a3a", 1.0f), "4a3a3a", "3px") };
                /// <summary>`.cn-geste.rouge` — cadres 86.</summary>
                public static readonly SpecFilet[] CnGesteRouge = { F(Cotes.Tous, 1.0f, StyleFilet.Plein, Teinte.Hex("#5c2a2a", 1.0f), "5c2a2a", "3px") };
                /// <summary>`.cn-nouvelle` — cadres 90.</summary>
                public static readonly SpecFilet[] CnNouvelle = { F(Cotes.Tous, 1.0f, StyleFilet.Plein, Teinte.Hex("#3b352c", 1.0f), "3b352c", "3px") };
                /// <summary>`.cn-nouvelle.vue` — cadres 90.</summary>
                public static readonly SpecFilet[] CnNouvelleVue = { F(Cotes.Tous, 1.0f, StyleFilet.Plein, Teinte.Hex("#5a4a2a", 1.0f), "5a4a2a", "3px") };
                /// <summary>`.cn-pol` — cadres 91.</summary>
                public static readonly SpecFilet[] CnPol = { F(Cotes.Tous, 1.0f, StyleFilet.Plein, Teinte.Hex("#3b352c", 1.0f), "3b352c", "3px") };
                /// <summary>`.cn-pol.actif` — cadres 91.</summary>
                public static readonly SpecFilet[] CnPolActif = { F(Cotes.Tous, 1.0f, StyleFilet.Plein, Teinte.Hex("#8a6a22", 1.0f), "8a6a22", "3px") };
                /// <summary>`.cn-rien` — cadres 88, 91.</summary>
                public static readonly SpecFilet[] CnRien = { F(Cotes.Gauche, 2.0f, StyleFilet.Plein, Teinte.Hex("#3b4650", 1.0f), "3b4650", "0px") };
                /// <summary>`.cn-seq` — cadres 89.</summary>
                public static readonly SpecFilet[] CnSeq = { F(Cotes.Tous, 1.0f, StyleFilet.Plein, Teinte.Hex("#3e382d", 1.0f), "3e382d", "3px") };
                /// <summary>`.cn-seq.verrou` — cadres 88.</summary>
                public static readonly SpecFilet[] CnSeqVerrou = { F(Cotes.Tous, 1.0f, StyleFilet.Plein, Teinte.Hex("#3e382d", 1.0f), "3e382d", "3px") };
                /// <summary>`.cn-slot.vide` — cadres 85, 86, 87.</summary>
                public static readonly SpecFilet[] CnSlotVide = { F(Cotes.Tous, 1.0f, StyleFilet.Tirete, Teinte.Hex("#ffffff", 0.133f), "ffffff@0.133", "12px") };
                /// <summary>`.cn-tete` — cadres 85, 86, 87, 88, 89, 90, 91.</summary>
                public static readonly SpecFilet[] CnTete = { F(Cotes.Bas, 1.0f, StyleFilet.Plein, Teinte.Hex("#3b352c", 1.0f), "3b352c", "0px") };
                /// <summary>`.contre` — cadres 91.</summary>
                public static readonly SpecFilet[] Contre = { F(Cotes.Haut, 1.0f, StyleFilet.Pointille, Teinte.Hex("#4a443a", 1.0f), "4a443a", "0px") };
                /// <summary>`.mano` — cadres 85, 86, 87, 88, 89, 90, 91.</summary>
                public static readonly SpecFilet[] Mano = { F(Cotes.Tous, 2.0f, StyleFilet.Plein, Teinte.Jeton("hudHairlineGold", t => t.hudHairlineGold, 1.0f), "b08d3e", "50%") };
                /// <summary>`.tag` — cadres 88, 89, 90.</summary>
                public static readonly SpecFilet[] Tag = { F(Cotes.Tous, 1.0f, StyleFilet.Plein, Teinte.Jeton("hudMoneyUnderlineGold", t => t.hudMoneyUnderlineGold, 1.0f), "d9ab4e", "2px") };
            }

            /// <summary>㉙ — cadres 59, 60, 61, 62, 63, 64, 65, 66 : 21 recette(s).</summary>
            public static class Conflit
            {
                public static readonly int[] Cadres = { 59, 60, 61, 62, 63, 64, 65, 66 };
                /// <summary>`.av` — cadres 59, 60, 61.</summary>
                public static readonly SpecFilet[] Av = { F(Cotes.Tous, 1.0f, StyleFilet.Plein, Teinte.Hex("#bfb39a", 1.0f), "bfb39a", "50%") };
                /// <summary>`.av` — cadres 62, 63, 65, 66.</summary>
                public static readonly SpecFilet[] Av_2 = { F(Cotes.Tous, 1.0f, StyleFilet.Plein, Teinte.Hex("#3b4650", 1.0f), "3b4650", "50%") };
                /// <summary>`.bas` — cadres 59, 60, 61, 62, 63, 64, 65, 66.</summary>
                public static readonly SpecFilet[] Bas = { F(Cotes.Haut, 2.0f, StyleFilet.Plein, Teinte.Hex("#2c3640", 1.0f), "2c3640", "0px") };
                /// <summary>`.doss` — cadres 64.</summary>
                public static readonly SpecFilet[] Doss = { F(Cotes.Tous, 1.0f, StyleFilet.Plein, Teinte.Hex("#3a2a18", 1.0f), "3a2a18", "2px") };
                /// <summary>`.ecu` — cadres 59, 60, 61.</summary>
                public static readonly SpecFilet[] Ecu = { F(Cotes.Tous, 1.0f, StyleFilet.Plein, Teinte.Hex("#574433", 1.0f), "574433", "3px") };
                /// <summary>`.ecu` — cadres 59, 60, 61.</summary>
                public static readonly SpecFilet[] Ecu_2 = { F(Cotes.Tous, 1.0f, StyleFilet.Plein, Teinte.Hex("#8a6a22", 1.0f), "8a6a22", "3px") };
                /// <summary>`.entete` — cadres 59, 60, 61, 62, 63, 64.</summary>
                public static readonly SpecFilet[] Entete = { F(Cotes.Bas, 1.0f, StyleFilet.Plein, Teinte.Hex("#3d3024", 1.0f), "3d3024", "0px") };
                /// <summary>`.env` — cadres 62, 63.</summary>
                public static readonly SpecFilet[] Env = { F(Cotes.Tous, 1.0f, StyleFilet.Plein, Teinte.Hex("#33404b", 1.0f), "33404b", "3px") };
                /// <summary>`.fam` — cadres 59, 60, 61.</summary>
                public static readonly SpecFilet[] Fam = { F(Cotes.Tous, 1.0f, StyleFilet.Plein, Teinte.Hex("#3d3024", 1.0f), "3d3024", "3px") };
                /// <summary>`.fam.visee` — cadres 59, 60, 61.</summary>
                public static readonly SpecFilet[] FamVisee = { F(Cotes.Tous, 1.0f, StyleFilet.Plein, Teinte.Hex("#8a6a22", 1.0f), "8a6a22", "3px") };
                /// <summary>`.geste` — cadres 59, 60, 62, 63, 65, 66.</summary>
                public static readonly SpecFilet[] Geste = { F(Cotes.Tous, 1.0f, StyleFilet.Plein, Teinte.Hex("#5a4a2a", 1.0f), "5a4a2a", "3px") };
                /// <summary>`.geste.rouge` — cadres 61.</summary>
                public static readonly SpecFilet[] GesteRouge = { F(Cotes.Tous, 1.0f, StyleFilet.Plein, Teinte.Hex("#5c2a2a", 1.0f), "5c2a2a", "3px") };
                /// <summary>`.l` — cadres 65.</summary>
                public static readonly SpecFilet[] L = { F(Cotes.Bas, 1.0f, StyleFilet.Pointille, Teinte.Jeton("hudCremeSecondary", t => t.hudCremeSecondary, 1.0f), "b9ac92", "0px") };
                /// <summary>`.mano` — cadres 59, 60, 61, 62, 63, 64, 65, 66.</summary>
                public static readonly SpecFilet[] Mano = { F(Cotes.Tous, 2.0f, StyleFilet.Plein, Teinte.Jeton("hudHairlineGold", t => t.hudHairlineGold, 1.0f), "b08d3e", "50%") };
                /// <summary>`.rappel` — cadres 65.</summary>
                public static readonly SpecFilet[] Rappel = { F(Cotes.Haut, 1.0f, StyleFilet.Plein, Teinte.Hex("#cbbfa4", 1.0f), "cbbfa4", "0px") };
                /// <summary>`.res` — cadres 62.</summary>
                public static readonly SpecFilet[] Res = { F(Cotes.Tous, 1.0f, StyleFilet.Plein, Teinte.Hex("#987979", 1.0f), "987979", "2px") };
                /// <summary>`.res` — cadres 63.</summary>
                public static readonly SpecFilet[] Res_2 = { F(Cotes.Tous, 1.0f, StyleFilet.Plein, Teinte.Hex("#7fc99a", 1.0f), "7fc99a", "2px") };
                /// <summary>`.res` — cadres 63.</summary>
                public static readonly SpecFilet[] Res_3 = { F(Cotes.Tous, 1.0f, StyleFilet.Plein, Teinte.Jeton("hudMoneyUnderlineGold", t => t.hudMoneyUnderlineGold, 1.0f), "d9ab4e", "2px") };
                /// <summary>`.res` — cadres 63.</summary>
                public static readonly SpecFilet[] Res_4 = { F(Cotes.Tous, 1.0f, StyleFilet.Plein, Teinte.Jeton("hudGaugeArcHot", t => t.hudGaugeArcHot, 1.0f), "e0664a", "2px") };
                /// <summary>`.rien` — cadres 64.</summary>
                public static readonly SpecFilet[] Rien = { F(Cotes.Gauche, 2.0f, StyleFilet.Plein, Teinte.Hex("#3b4650", 1.0f), "3b4650", "0px") };
                /// <summary>`.visee-tag` — cadres 59, 60, 61.</summary>
                public static readonly SpecFilet[] ViseeTag = { F(Cotes.Tous, 1.0f, StyleFilet.Plein, Teinte.Hex("#8a6a22", 1.0f), "8a6a22", "2px") };
            }

            /// <summary>⑨ — cadres 9, 11, 12, 13 : 5 recette(s).</summary>
            public static class ExceptionQueue
            {
                public static readonly int[] Cadres = { 9, 11, 12, 13 };
                /// <summary>`.ardoise-p` — cadres 9, 11, 12, 13.</summary>
                public static readonly SpecFilet[] ArdoiseP = { F(Cotes.Tous, 9.0f, StyleFilet.Plein, Teinte.Hex("#5a3a1a", 1.0f), "5a3a1a", "0px") };
                /// <summary>`.mano` — cadres 9, 11, 12, 13.</summary>
                public static readonly SpecFilet[] Mano = { F(Cotes.Tous, 2.0f, StyleFilet.Plein, Teinte.Jeton("hudHairlineGold", t => t.hudHairlineGold, 1.0f), "b08d3e", "50%") };
                /// <summary>`.mot-craie` — cadres 9, 12, 13.</summary>
                public static readonly SpecFilet[] MotCraie = { F(Cotes.Tous, 2.0f, StyleFilet.Plein, Teinte.Hex("#f1ecdc", 1.0f), "f1ecdc", "0px") };
                /// <summary>`.silhouette` — cadres 9, 12, 13.</summary>
                public static readonly SpecFilet[] Silhouette = { F(Cotes.Tous, 2.0f, StyleFilet.Plein, Teinte.Hex("#f1ecdc", 0.8f), "f1ecdc@0.8", "50%") };
                /// <summary>`.titre-craie` — cadres 9, 11, 12, 13.</summary>
                public static readonly SpecFilet[] TitreCraie = { F(Cotes.Bas, 2.0f, StyleFilet.Plein, Teinte.Hex("#f1ecdc", 0.6f), "f1ecdc@0.6", "0px") };
            }

            /// <summary>⑩ — cadres 10 : 6 recette(s).</summary>
            public static class ExceptionDetail
            {
                public static readonly int[] Cadres = { 10 };
                /// <summary>`.ardoise-p` — cadres 10.</summary>
                public static readonly SpecFilet[] ArdoiseP = { F(Cotes.Tous, 9.0f, StyleFilet.Plein, Teinte.Hex("#5a3a1a", 1.0f), "5a3a1a", "0px") };
                /// <summary>`.lc` — cadres 10.</summary>
                public static readonly SpecFilet[] Lc = { F(Cotes.Gauche, 2.0f, StyleFilet.Plein, Teinte.Hex("#f1ecdc", 0.267f), "f1ecdc@0.267", "0px") };
                /// <summary>`.lc.levee` — cadres 10.</summary>
                public static readonly SpecFilet[] LcLevee = { F(Cotes.Gauche, 2.0f, StyleFilet.Plein, Teinte.Jeton("hudMoneyGold", t => t.hudMoneyGold, 1.0f), "f2c96b", "0px") };
                /// <summary>`.mano` — cadres 10.</summary>
                public static readonly SpecFilet[] Mano = { F(Cotes.Tous, 2.0f, StyleFilet.Plein, Teinte.Jeton("hudHairlineGold", t => t.hudHairlineGold, 1.0f), "b08d3e", "50%") };
                /// <summary>`.mot-craie` — cadres 10.</summary>
                public static readonly SpecFilet[] MotCraie = { F(Cotes.Tous, 2.0f, StyleFilet.Plein, Teinte.Hex("#f1ecdc", 1.0f), "f1ecdc", "0px") };
                /// <summary>`.titre-craie` — cadres 10.</summary>
                public static readonly SpecFilet[] TitreCraie = { F(Cotes.Bas, 2.0f, StyleFilet.Plein, Teinte.Hex("#f1ecdc", 0.6f), "f1ecdc@0.6", "0px") };
            }

            /// <summary>㉔ — cadres 25, 26, 27, 28, 29, 30 : 22 recette(s).</summary>
            public static class AutonomyInbox
            {
                public static readonly int[] Cadres = { 25, 26, 27, 28, 29, 30 };
                /// <summary>`.bat-lcd` — cadres 25, 26, 27, 28, 29, 30.</summary>
                public static readonly SpecFilet[] BatLcd = { F(Cotes.Tous, 1.0f, StyleFilet.Plein, Teinte.Hex("#6fae44", 1.0f), "6fae44", "0px") };
                /// <summary>`.bulle-lcd` — cadres 26, 29.</summary>
                public static readonly SpecFilet[] BulleLcd = { F(Cotes.Tous, 1.0f, StyleFilet.Plein, Teinte.Hex("#2c4a1e", 1.0f), "2c4a1e", "0px") };
                /// <summary>`.bulle-lcd.moi` — cadres 29.</summary>
                public static readonly SpecFilet[] BulleLcdMoi = { F(Cotes.Tous, 1.0f, StyleFilet.Plein, Teinte.Hex("#6fae44", 1.0f), "6fae44", "0px") };
                /// <summary>`.bulle-lcd.rep` — cadres 29.</summary>
                public static readonly SpecFilet[] BulleLcdRep = { F(Cotes.Gauche, 4.0f, StyleFilet.Plein, Teinte.Hex("#d4f08a", 1.0f), "d4f08a", "0px"), F(Cotes.Haut | Cotes.Droite | Cotes.Bas, 1.0f, StyleFilet.Plein, Teinte.Hex("#2c4a1e", 1.0f), "2c4a1e", "0px") };
                /// <summary>`.burner` — cadres 25, 26, 27, 28, 29, 30.</summary>
                public static readonly SpecFilet[] Burner = { F(Cotes.Haut, 4.0f, StyleFilet.Plein, Teinte.Jeton("scrimBackdrop", t => t.scrimBackdrop, 1.0f), "0a0d10", "0px") };
                /// <summary>`.ch` — cadres 26.</summary>
                public static readonly SpecFilet[] Ch = { F(Cotes.Tous, 1.0f, StyleFilet.Plein, Teinte.Hex("#2c4a1e", 1.0f), "2c4a1e", "0px") };
                /// <summary>`.d` — cadres 26.</summary>
                public static readonly SpecFilet[] D = { F(Cotes.Tous, 1.0f, StyleFilet.Plein, Teinte.Hex("#d4f08a", 1.0f), "d4f08a", "0px") };
                /// <summary>`.f` — cadres 26.</summary>
                public static readonly SpecFilet[] F_Bloc = { F(Cotes.Tous, 1.0f, StyleFilet.Plein, Teinte.Hex("#3f6b28", 1.0f), "3f6b28", "0px") };
                /// <summary>`.hint` — cadres 25, 27, 29.</summary>
                public static readonly SpecFilet[] Hint = { F(Cotes.Haut, 1.0f, StyleFilet.Tirete, Teinte.Hex("#2c4a1e", 1.0f), "2c4a1e", "0px") };
                /// <summary>`.i` — cadres 25, 26, 27, 28, 29, 30.</summary>
                public static readonly SpecFilet[] I = { F(Cotes.Tous, 1.0f, StyleFilet.Plein, Teinte.Jeton("surfaceCard", t => t.surfaceCard, 1.0f), "14171a", "4px") };
                /// <summary>`.lcd` — cadres 25, 26, 27, 28, 29, 30.</summary>
                public static readonly SpecFilet[] Lcd = { F(Cotes.Tous, 2.0f, StyleFilet.Plein, Teinte.Jeton("scrimBackdrop", t => t.scrimBackdrop, 1.0f), "0a0d10", "4px") };
                /// <summary>`.lcd-tete` — cadres 25, 26, 27, 28, 29, 30.</summary>
                public static readonly SpecFilet[] LcdTete = { F(Cotes.Bas, 1.0f, StyleFilet.Plein, Teinte.Hex("#2c4a1e", 1.0f), "2c4a1e", "0px") };
                /// <summary>`.mano` — cadres 25, 26, 27, 28, 29, 30.</summary>
                public static readonly SpecFilet[] Mano = { F(Cotes.Tous, 2.0f, StyleFilet.Plein, Teinte.Jeton("hudHairlineGold", t => t.hudHairlineGold, 1.0f), "b08d3e", "50%") };
                /// <summary>`.mi` — cadres 28.</summary>
                public static readonly SpecFilet[] Mi = { F(Cotes.Tous, 1.0f, StyleFilet.Plein, Teinte.Hex("#2c4a1e", 1.0f), "2c4a1e", "0px") };
                /// <summary>`.mi.ret` — cadres 28.</summary>
                public static readonly SpecFilet[] MiRet = { F(Cotes.Tous, 1.0f, StyleFilet.Plein, Teinte.Hex("#2c4a1e", 1.0f), "2c4a1e", "0px") };
                /// <summary>`.mi.struct` — cadres 28.</summary>
                public static readonly SpecFilet[] MiStruct = { F(Cotes.Tous, 1.0f, StyleFilet.Plein, Teinte.Hex("#d4f08a", 1.0f), "d4f08a", "0px") };
                /// <summary>`.msg` — cadres 25, 27.</summary>
                public static readonly SpecFilet[] Msg = { F(Cotes.Tous, 1.0f, StyleFilet.Plein, Teinte.Hex("#2c4a1e", 1.0f), "2c4a1e", "0px") };
                /// <summary>`.msg.vieux` — cadres 27.</summary>
                public static readonly SpecFilet[] MsgVieux = { F(Cotes.Tous, 1.0f, StyleFilet.Plein, Teinte.Hex("#d4f08a", 1.0f), "d4f08a", "0px") };
                /// <summary>`.n` — cadres 26.</summary>
                public static readonly SpecFilet[] N = { F(Cotes.Tous, 1.0f, StyleFilet.Plein, Teinte.Hex("#3f6b28", 1.0f), "3f6b28", "0px") };
                /// <summary>`.ok` — cadres 25, 26, 27, 28, 29, 30.</summary>
                public static readonly SpecFilet[] Ok = { F(Cotes.Tous, 1.0f, StyleFilet.Plein, Teinte.Jeton("scrimBackdrop", t => t.scrimBackdrop, 1.0f), "0a0d10", "50%") };
                /// <summary>`.saisie` — cadres 26.</summary>
                public static readonly SpecFilet[] Saisie = { F(Cotes.Haut, 1.0f, StyleFilet.Plein, Teinte.Hex("#2c4a1e", 1.0f), "2c4a1e", "0px") };
                /// <summary>`.span` — cadres 25, 26, 27, 28, 29, 30.</summary>
                public static readonly SpecFilet[] Span = { F(Cotes.Tous, 1.0f, StyleFilet.Plein, Teinte.Jeton("surfaceCard", t => t.surfaceCard, 1.0f), "14171a", "3px") };
            }

            /// <summary>㉑ — cadres 101, 102, 103, 104, 105, 106 : 20 recette(s).</summary>
            public static class Market
            {
                public static readonly int[] Cadres = { 101, 102, 103, 104, 105, 106 };
                /// <summary>`.bulle` — cadres 101.</summary>
                public static readonly SpecFilet[] Bulle = { F(Cotes.Tous, 1.0f, StyleFilet.Plein, Teinte.Jeton("hudHairlineGold", t => t.hudHairlineGold, 1.0f), "b08d3e", "0px") };
                /// <summary>`.cerne` — cadres 101, 102, 103, 104, 105, 106.</summary>
                public static readonly SpecFilet[] Cerne = { F(Cotes.Tous, 1.0f, StyleFilet.Plein, Teinte.Jeton("hudHairlineGold", t => t.hudHairlineGold, 1.0f), "b08d3e", "3px") };
                /// <summary>`.ecrin` — cadres 101.</summary>
                public static readonly SpecFilet[] Ecrin = { F(Cotes.Tous, 1.0f, StyleFilet.Plein, Teinte.Hex("#2a3648", 1.0f), "2a3648", "0px") };
                /// <summary>`.ecrin.petit` — cadres 102, 103.</summary>
                public static readonly SpecFilet[] EcrinPetit = { F(Cotes.Tous, 1.0f, StyleFilet.Plein, Teinte.Hex("#2a3648", 1.0f), "2a3648", "0px") };
                /// <summary>`.enseigne` — cadres 101, 102, 103, 104, 105, 106.</summary>
                public static readonly SpecFilet[] Enseigne = { F(Cotes.Bas, 2.0f, StyleFilet.Plein, Teinte.Jeton("hudHairlineGold", t => t.hudHairlineGold, 1.0f), "b08d3e", "0px"), F(Cotes.Haut | Cotes.Droite | Cotes.Gauche, 1.0f, StyleFilet.Plein, Teinte.Hex("#2a3648", 1.0f), "2a3648", "0px") };
                /// <summary>`.fen` — cadres 101, 104, 105, 106.</summary>
                public static readonly SpecFilet[] Fen = { F(Cotes.Tous, 1.0f, StyleFilet.Plein, Teinte.Hex("#2a3648", 1.0f), "2a3648", "0px") };
                /// <summary>`.mano` — cadres 101, 102, 103, 104, 105, 106.</summary>
                public static readonly SpecFilet[] Mano = { F(Cotes.Tous, 2.0f, StyleFilet.Plein, Teinte.Jeton("hudHairlineGold", t => t.hudHairlineGold, 1.0f), "b08d3e", "50%") };
                /// <summary>`.og` — cadres 101, 102, 103, 104, 106.</summary>
                public static readonly SpecFilet[] Og = { F(Cotes.Tous, 1.0f, StyleFilet.Plein, Teinte.Hex("#2a3648", 1.0f), "2a3648", "0px") };
                /// <summary>`.og.pris` — cadres 101, 102, 103, 104, 106.</summary>
                public static readonly SpecFilet[] OgPris = { F(Cotes.Tous, 1.0f, StyleFilet.Plein, Teinte.Jeton("hudHairlineGold", t => t.hudHairlineGold, 1.0f), "b08d3e", "0px") };
                /// <summary>`.pann` — cadres 104, 106.</summary>
                public static readonly SpecFilet[] Pann = { F(Cotes.Tous, 1.0f, StyleFilet.Plein, Teinte.Hex("#2a3648", 1.0f), "2a3648", "0px") };
                /// <summary>`.pann` — cadres 105.</summary>
                public static readonly SpecFilet[] Pann_2 = { F(Cotes.Tous, 1.0f, StyleFilet.Plein, Teinte.Jeton("hudGaugeArcHot", t => t.hudGaugeArcHot, 1.0f), "e0664a", "0px") };
                /// <summary>`.pann.pp` — cadres 102, 103.</summary>
                public static readonly SpecFilet[] PannPp = { F(Cotes.Tous, 1.0f, StyleFilet.Plein, Teinte.Hex("#2a3648", 1.0f), "2a3648", "0px") };
                /// <summary>`.span` — cadres 101, 102, 103, 104, 105.</summary>
                public static readonly SpecFilet[] Span = { F(Cotes.Bas, 1.0f, StyleFilet.Plein, Teinte.Hex("#2a3648", 1.0f), "2a3648", "0px") };
                /// <summary>`.span` — cadres 101, 102, 103, 104.</summary>
                public static readonly SpecFilet[] Span_2 = { F(Cotes.Bas, 1.0f, StyleFilet.Plein, Teinte.Jeton("hudGaugeArcCold", t => t.hudGaugeArcCold, 1.0f), "7fd4d9", "0px") };
                /// <summary>`.span` — cadres 101, 102, 103, 104.</summary>
                public static readonly SpecFilet[] Span_3 = { F(Cotes.Bas, 1.0f, StyleFilet.Plein, Teinte.Hex("#c9a8e0", 1.0f), "c9a8e0", "0px") };
                /// <summary>`.span` — cadres 101, 102, 103, 104.</summary>
                public static readonly SpecFilet[] Span_4 = { F(Cotes.Bas, 1.0f, StyleFilet.Plein, Teinte.Hex("#efe9da", 1.0f), "efe9da", "0px") };
                /// <summary>`.span` — cadres 101, 102, 103, 104.</summary>
                public static readonly SpecFilet[] Span_5 = { F(Cotes.Bas, 1.0f, StyleFilet.Plein, Teinte.Jeton("hudMoneyGold", t => t.hudMoneyGold, 1.0f), "f2c96b", "0px") };
                /// <summary>`.span` — cadres 105.</summary>
                public static readonly SpecFilet[] Span_6 = { F(Cotes.Bas, 1.0f, StyleFilet.Plein, Teinte.Jeton("surfaceRow", t => t.surfaceRow, 1.0f), "232a2d", "0px") };
                /// <summary>`.tablo` — cadres 101, 102, 103.</summary>
                public static readonly SpecFilet[] Tablo = { F(Cotes.Tous, 1.0f, StyleFilet.Plein, Teinte.Hex("#2a3648", 1.0f), "2a3648", "0px") };
                /// <summary>`.tablo.court` — cadres 104, 105.</summary>
                public static readonly SpecFilet[] TabloCourt = { F(Cotes.Tous, 1.0f, StyleFilet.Plein, Teinte.Hex("#2a3648", 1.0f), "2a3648", "0px") };
            }

            /// <summary>⑱ — cadres 20, 21 : 7 recette(s).</summary>
            public static class MenuPlus
            {
                public static readonly int[] Cadres = { 20, 21 };
                /// <summary>`.bureau` — cadres 20, 21.</summary>
                public static readonly SpecFilet[] Bureau = { F(Cotes.Haut, 6.0f, StyleFilet.Plein, Teinte.Hex("#7a4a22", 1.0f), "7a4a22", "0px") };
                /// <summary>`.mano` — cadres 20, 21.</summary>
                public static readonly SpecFilet[] Mano = { F(Cotes.Tous, 2.0f, StyleFilet.Plein, Teinte.Jeton("hudHairlineGold", t => t.hudHairlineGold, 1.0f), "b08d3e", "50%") };
                /// <summary>`.picto` — cadres 20, 21.</summary>
                public static readonly SpecFilet[] Picto = { F(Cotes.Tous, 1.0f, StyleFilet.Plein, Teinte.Hex("#1f2a3a", 1.0f), "1f2a3a", "50%") };
                /// <summary>`.plaque-bureau` — cadres 20, 21.</summary>
                public static readonly SpecFilet[] PlaqueBureau = { F(Cotes.Tous, 1.0f, StyleFilet.Plein, Teinte.Hex("#6b4a12", 1.0f), "6b4a12", "3px") };
                /// <summary>`.sous-main` — cadres 20, 21.</summary>
                public static readonly SpecFilet[] SousMain = { F(Cotes.Tous, 2.0f, StyleFilet.Plein, Teinte.Hex("#6b2a20", 1.0f), "6b2a20", "8px") };
                /// <summary>`.tag-laiton` — cadres 20, 21.</summary>
                public static readonly SpecFilet[] TagLaiton = { F(Cotes.Tous, 1.0f, StyleFilet.Plein, Teinte.Hex("#6b4a12", 1.0f), "6b4a12", "3px") };
                /// <summary>`.tag-laiton` — cadres 21.</summary>
                public static readonly SpecFilet[] TagLaiton_2 = { F(Cotes.Tous, 1.0f, StyleFilet.Plein, Teinte.Hex("#4a1008", 1.0f), "4a1008", "3px") };
            }
        }
    }
}
