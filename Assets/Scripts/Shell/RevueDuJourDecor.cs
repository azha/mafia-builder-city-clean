using UnityEngine;
using UnityEngine.UI;
using MafiaCleanCity.Theme;

namespace MafiaCleanCity.Shell
{
    // ⑯-7 — LE DÉCOR DU VERGE D'OR : la scène, le dégradé, le zinc (B01 + B02 de l'écart 06cc21d6).
    // ⑨-2 — le MÉCANISME vit désormais dans `DecorAuComptoir` (ShellContracts), partagé avec ⑨/⑩ ; ce fichier ne porte
    // plus que les PARAMÈTRES de ⑯ et son API d'avant (les gardes EcranRevue la lisent telle quelle).
    //
    // ⛔ Le juge ⊥ r1 (2026-09-06) : F1 BLOQUANT, « le décor du Verge d'Or n'est pas rendu », 92,3 % de
    //    la zone libre en noir pur. Sans ce décor, « jugé » est inatteignable pour ⑯.
    //
    // LA SCÈNE (B01) — l'atelier l'a retrouvée par les PIXELS, pas par le nom
    // (`Tools/atelier-2026-09-22/08-revue-du-jour-phrases-et-decor.md`, `b95dd8c7` sur `da/2026-09-22`) :
    // le fond de v4-0 est la boîte (300, 60)–(1500, 1080) de `VERGE3_JOUR_FINAL.png` (atelier `e826c53`,
    // 1728×1080, sha256 e918a575…), réduite à ×0,75 et ré-encodée en JPEG dans la maquette. Écart RVB
    // 2,12/255, voisins décalés de 4 px pires, contrôle négatif (la nuit) à 37,51.
    // ⇒ Le fichier est monté TEL QUEL (même sha256), sous le nom canonique `sprite_environment_*`, et la
    //   boîte est découpée par UV : le fichier monté reste l'original de l'atelier.
    // CSS : `.scene{inset:0; background-size:cover}` · `.scene.verge-jour{background-position:center 22%}`.
    //
    // LE DÉGRADÉ — `.degrade.jour` : 5 arrêts de #0a0f18 à opacités b8·30·40·e8·ff (0, 16, 44, 60, 74 %).
    //
    // LE ZINC (B02) — ce n'est PAS de l'art, c'est la forme CSS (`ecrans-brennar-4.html:203-212`) :
    //   `.zinc`            bas de l'écran, hauteur 64 % (`.revue`, billets) · 66 % (`.haut`, v4-1)
    //   `.zinc .dos`       l'étagère, 11 % (revue) · 15 % (haut) du zinc, #2a1c10→#1a1109, opacité .9,
    //                      filet haut 1px #6b4a1266, 7 bouteilles 9 px (26 px, les impaires 32 px)
    //   `.zinc .plateau`   22 px sous l'étagère, #a8823a→#6b4a12 55 %→#3a2a12, filet haut 2px #d9ab4e88,
    //                      débord de 6 px de chaque côté
    //   `.zinc::after`     sous le plateau (+20 px), #13100b→#0a0f18 60 %
    // Non repris : `perspective(200px) rotateX(8deg)` du plateau et les ombres portées.
    //
    // ⚠️ Toute opacité CSS est une opacité de NAVIGATEUR (sRGB) ; ce projet mélange en LINÉAIRE. Le
    //    dégradé et le zinc flottent sur la scène, donc sur un fond INCONNU : leurs opacités passent par
    //    l'ajustement déclaré de ① (`ProceduralUI.AlphaVoileSurFondQuelconque`), jamais recopiées.
    public class RevueDuJourDecor : DecorAuComptoir
    {
        /// <summary>Chemin `Resources` — le consommateur que le montage exige (M2 de la mémoire
        /// « art orphelin ») : `Assets/Art/Scenes/Resources/Scenes/sprite_environment_verge_d_or_jour.png`.</summary>
        public const string CheminScene = "Scenes/sprite_environment_verge_d_or_jour";

        public const float SourceLargeur = 1728f;
        public const float SourceHauteur = 1080f;
        /// <summary>La boîte de v4-0 dans la source, en pixels IMAGE (origine en haut à gauche).</summary>
        public static readonly Rect BoiteSource = new Rect(300f, 60f, 1200f, 1020f);
        /// <summary>`background-position: center 22%`.</summary>
        public const float PositionVerticale = 0.22f;

        /// <summary>Les paramètres de ⑯ : le Verge d'Or de jour, `.degrade.jour`, `.zinc.revue` à l'arrivée.</summary>
        public static Parametres ParametresRevue() => new Parametres
        {
            CheminScene = CheminScene,
            SourceLargeur = SourceLargeur, SourceHauteur = SourceHauteur,
            Boite = BoiteSource, PositionVerticale = PositionVerticale,
            CleDegrade = "degrade.jour",
            // `.degrade.jour` : 5 arrêts de #0a0f18 (b8·30·40·e8·ff à 0, 16, 44, 60, 74 %)
            Degrade = () => new[]
            {
                (0.00f, Voile(Nuit, 0xb8)),
                (0.16f, Voile(Nuit, 0x30)),
                (0.44f, Voile(Nuit, 0x40)),
                (0.60f, Voile(Nuit, 0xe8)),
                (0.74f, Voile(Nuit, 0xff)),
                (1.00f, Voile(Nuit, 0xff)),
            },
            HauteurZinc = 0.64f, HauteurDos = 0.11f,
        };

        /// <summary>Pose le décor SOUS tout le contenu de l'écran : premier enfant, hors mise en page.</summary>
        public static RevueDuJourDecor Construire(Transform ecran) => Construire<RevueDuJourDecor>(ecran, ParametresRevue());

        /// <summary>La découpe « cover » de la boîte de v4-0 (API d'avant ⑨-2, lue par R7ter).</summary>
        public static Rect UvCouverture(float largeur, float hauteur) => UvCouverture(largeur, hauteur, ParametresRevue());

        /// <summary>`.zinc.revue` (billets : 64 %, étagère 11 %) ou `.zinc.haut` (v4-1, personne au
        /// comptoir : 66 %, étagère 15 %).</summary>
        public void AppliquerEtat(bool vide)
        {
            Vide = vide;
            AppliquerZinc(vide ? 0.66f : 0.64f, vide ? 0.15f : 0.11f);
        }
    }
}
