using System;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.UI;
using MafiaCleanCity.Theme;

namespace MafiaCleanCity.Shell
{
    // ═══════════════════════════════════════════════════════════════════════════════════════════════════════════
    // LE DÉCOR DE SCÈNE — design APPROUVÉ v5.1 (`Tools/decor-de-scene-2026-10-07/DESIGN.md`, f2 08/10).
    //
    // Un écran ne CODE jamais son décor : il le DÉCLARE dans `DecorsDeScene` (le catalogue, SEULE table de valeurs) et
    // `DecorDeScene.Poser(racine, spec)` le monte. Couches, de la plus basse à la plus haute :
    //   L1 `Decor/Scene`    — une des 4 images, découpe « cover » (`DecorAuComptoir.UvCouverture`), luminosité = teinte
    //   L2 `Decor/Voile`    — le voile de scène (25 écrans sur 26 : ③ n'en a pas)
    //   L3 `Decor/Support`  — le fond du panneau, en couches CSS (Lineaire, Radial, RadialCercle, Plein, Points, Rayures)
    //   L4 `Decor/Cerne`    — le cerne laiton de la famille A (l'ENSEIGNE, elle, porte le texte de l'écran : elle s'habille
    //                         chez l'écran, étape 3 avec `Filets`)
    // `Decor/Capteur` (alpha 0, raycast) est le PREMIER enfant : il garde le bloqueur que portait le fond plat (§5.2).
    //
    // ⛔ CONTRAT AVEC CLIENT-3 (§7) : ces noms sont FIGÉS ; AUCUN `Canvas` ni `CanvasGroup` sur ces couches (sa régie
    //    ajoute le sien) ; aucune couche dans un LayoutGroup ; `Decor/Support` est un RectTransform stable aux bornes du
    //    panneau.
    // ⛔ GARDES STRUCTURELLES (D0, socle CLIENT) : chaque `Graphic` naît avec son `CanvasRenderer` (créé avec le
    //    GameObject : `AddComponent` à l'exécution ne garantit pas `[RequireComponent]`, et sans lui rien ne dessine, la
    //    console muette) ; sous un masque, uniquement des `MaskableGraphic` (`Image`, `RawImage`).
    // ⚠️ Unity compose en LINÉAIRE, la maquette en sRGB : une opacité CSS n'est jamais recopiée. Sur fond CONNU (une
    //    couche opaque du support dessous) on garde l'opacité et on déplace la couleur (`CouleurPourMelangeLineaire`) ;
    //    sur fond INCONNU (la scène) on ajuste l'opacité (`AlphaVoileSurFondQuelconque`).
    // ═══════════════════════════════════════════════════════════════════════════════════════════════════════════

    /// <summary>Les quatre images de scène (§3.1).</summary>
    public enum SceneDeFond { District, Bar, Verge, VergeJour }

    /// <summary>Lu par D1/D2 : `Pose` = le contrôleur appelle `DecorDeScene.Poser` ; `DejaLivre` = zinc de
    /// `DecorAuComptoir` (⑨ ⑩ ⑯), non migré ; `NonMonte` = aucun contrôleur (㉑).</summary>
    public enum StatutDecor { Pose, DejaLivre, NonMonte }

    public enum StyleFilet { Plein, Pointille, Tirete, Double }

    [Flags] public enum Cotes { Haut = 1, Droite = 2, Bas = 4, Gauche = 8, Tous = 15 }

    /// <summary>Une couleur du catalogue : un JETON nommé (lu sur `DesignTokens.Current` à la construction, jamais à
    /// l'initialisation du type — piège mesuré de ce dépôt), un littéral `#rrggbb` (d &gt; 4 de tout jeton : §4.1,
    /// `teintes.json`), ou une constante nommée d'Unity (`Color.black`). L'opacité est celle du CSS (alpha sRGB) ; seul
    /// le RVB de la source est pris.</summary>
    public readonly struct Teinte
    {
        public readonly string Nom;
        public readonly float Opacite;
        private readonly Func<DesignTokens, Color> jeton;
        private readonly string hex;
        private readonly Color nommee;

        private Teinte(string nom, float opacite, Func<DesignTokens, Color> jeton, string hex, Color nommee)
        {
            Nom = nom; Opacite = opacite; this.jeton = jeton; this.hex = hex; this.nommee = nommee;
        }

        /// <summary>La couleur PAR LE JETON (d ≤ 4 d'une couleur de la maquette : la garde TD-612 l'exige).</summary>
        public static Teinte Jeton(string nom, Func<DesignTokens, Color> lecture, float opacite = 1f) =>
            new Teinte(nom, opacite, lecture, null, Color.clear);

        /// <summary>Un littéral admis (d &gt; 4 de tout jeton).</summary>
        public static Teinte Hex(string hexCss, float opacite = 1f) => new Teinte(hexCss, opacite, null, hexCss, Color.clear);

        /// <summary>Une constante NOMMÉE d'Unity (`Color.black`, `Color.white`).</summary>
        public static Teinte Nommee(string nom, Color couleur, float opacite = 1f) => new Teinte(nom, opacite, null, null, couleur);

        /// <summary>`rgba(0,0,0,0)` du CSS. Interpolé en alpha prémultiplié, sa teinte ne compte pas.</summary>
        public static Teinte Transparent => Nommee("transparent", Color.clear, 0f);

        /// <summary>La même source à une autre opacité CSS.</summary>
        public Teinte A(float opacite) => new Teinte(Nom, opacite, jeton, hex, nommee);

        public bool EstJeton => jeton != null;

        /// <summary>La couleur sRGB, alpha = l'opacité CSS. À appeler à la construction (lit `DesignTokens.Current`).</summary>
        public Color Resoudre()
        {
            Color c;
            if (jeton != null) c = jeton(DesignTokens.Current);
            else if (hex != null) { if (!ColorUtility.TryParseHtmlString(hex, out c)) c = Color.magenta; }
            else c = nommee;
            c.a = Opacite;
            return c;
        }

        public string Cle => $"{Nom}@{Opacite:F4}";
        public override string ToString() => Cle;
    }

    /// <summary>Un arrêt de dégradé : position en FRACTION de la ligne, ou en px CSS (⑱ : `18px`).</summary>
    public readonly struct Arret
    {
        public readonly float Pos;
        public readonly bool EnPx;
        public readonly Teinte Couleur;
        private Arret(float pos, bool enPx, Teinte couleur) { Pos = pos; EnPx = enPx; Couleur = couleur; }
        public static Arret En(float fraction, Teinte couleur) => new Arret(fraction, false, couleur);
        public static Arret EnPxCss(float px, Teinte couleur) => new Arret(px, true, couleur);
    }

    public enum GenreCouche { Lineaire, Radial, RadialCercle, Plein, Points, Rayures }

    /// <summary>Une couche du support, dans l'ordre CSS (la PREMIÈRE est la plus HAUTE). Fractions : boîte du SUPPORT,
    /// y depuis le HAUT (les `%` d'un dégradé CSS se résolvent sur l'élément qui le porte).</summary>
    public sealed class SpecCouche
    {
        public readonly GenreCouche Genre;
        public readonly float Angle;                 // Lineaire, Rayures
        public readonly float Cx, Cy, Rx, Ry;        // Radial ; RadialCercle (Cx, Cy)
        public readonly Arret[] Arrets;              // Lineaire, Radial, RadialCercle
        public readonly Teinte Couleur;              // Plein, Points, Rayures
        public readonly float Pas, RayonPlein, RayonFin, Epaisseur;   // Points (pas, r plein, r fin), Rayures (pas, épaisseur)
        public readonly Vector2 Decalage;            // Points : `background-position` en px CSS

        private SpecCouche(GenreCouche g, float angle, float cx, float cy, float rx, float ry, Arret[] arrets, Teinte couleur,
                           float pas, float rayonPlein, float rayonFin, float epaisseur, Vector2 decalage)
        {
            Genre = g; Angle = angle; Cx = cx; Cy = cy; Rx = rx; Ry = ry; Arrets = arrets; Couleur = couleur;
            Pas = pas; RayonPlein = rayonPlein; RayonFin = rayonFin; Epaisseur = epaisseur; Decalage = decalage;
        }

        public static SpecCouche Lineaire(float angleDeg, params Arret[] arrets) =>
            new SpecCouche(GenreCouche.Lineaire, angleDeg, 0, 0, 0, 0, arrets, default, 0, 0, 0, 0, Vector2.zero);
        public static SpecCouche Radial(float cx, float cy, float rx, float ry, params Arret[] arrets) =>
            new SpecCouche(GenreCouche.Radial, 0, cx, cy, rx, ry, arrets, default, 0, 0, 0, 0, Vector2.zero);
        /// <summary>`radial-gradient(circle farthest-corner at cx cy, …)` : le rayon dépend du rect RÉEL (⑮ ⑰).</summary>
        public static SpecCouche RadialCercle(float cx, float cy, params Arret[] arrets) =>
            new SpecCouche(GenreCouche.RadialCercle, 0, cx, cy, 0, 0, arrets, default, 0, 0, 0, 0, Vector2.zero);
        public static SpecCouche Plein(Teinte couleur) =>
            new SpecCouche(GenreCouche.Plein, 0, 0, 0, 0, 0, null, couleur, 0, 0, 0, 0, Vector2.zero);
        public static SpecCouche Points(float pasPx, float rayonPleinPx, float rayonFinPx, Teinte couleur, Vector2 decalagePx) =>
            new SpecCouche(GenreCouche.Points, 0, 0, 0, 0, 0, null, couleur, pasPx, rayonPleinPx, rayonFinPx, 0, decalagePx);
        public static SpecCouche Rayures(float angleDeg, float pasPx, float epaisseurPx, Teinte couleur) =>
            new SpecCouche(GenreCouche.Rayures, angleDeg, 0, 0, 0, 0, null, couleur, pasPx, 0, 0, epaisseurPx, Vector2.zero);

        /// <summary>Toutes les couleurs déclarées sont opaques : cette couche est un FOND CONNU pour celles du dessus.</summary>
        public bool EstOpaque
        {
            get
            {
                if (Genre == GenreCouche.Points || Genre == GenreCouche.Rayures) return false;
                if (Arrets == null) return Couleur.Opacite >= 0.999f;
                foreach (Arret a in Arrets) if (a.Couleur.Opacite < 0.999f) return false;
                return true;
            }
        }
    }

    /// <summary>L5 (§3.4) : un filet ou bord d'un bloc. Le CERNE de la famille A en est un cas (Inset, Lueur, Liseré).</summary>
    public sealed class SpecFilet
    {
        public readonly Cotes Cotes;
        public readonly float EpaisseurCss;
        public readonly StyleFilet Style;
        public readonly Teinte Couleur;
        public readonly float Rayon;
        public readonly float Inset;
        public readonly Teinte? Lueur;
        public readonly float FlouLueurCss;
        /// <summary>`box-shadow: inset 0 0 0 1px` : un trait de 1 px JUSTE À L'INTÉRIEUR du filet (le cerne : `#0b1016`).
        /// Ajout au §2 du design, qui le décrit au §3.3 sans lui donner de champ.</summary>
        public readonly Teinte? Lisere;
        /// <summary>`border-radius` en POURCENTAGE (`50%` : une pastille, un cadran) : fraction du plus petit côté du
        /// bloc, résolue sur son rect réel. 0 = `Rayon` (px CSS) fait foi.</summary>
        public readonly float RayonPct;
        /// <summary>La couleur telle que la MESURE l'a lue, SANS son « # » (`1f2a3a@0.4`) — null pour une recette écrite à
        /// la main. Lue par D6(a) pour comparer le catalogue généré à `mesure-filets.json` sans repasser par les jetons.
        /// ⚠️ Sans « # » parce que la garde TD-612 lit toute chaîne `"#rrggbb"` comme un LITTÉRAL de couleur : la teinte
        /// écrite par son jeton serait accusée par sa propre trace de mesure.</summary>
        public readonly string CouleurCss;

        public SpecFilet(Cotes cotes, float epaisseurCss, StyleFilet style, Teinte couleur, float rayon = 0f, float inset = 0f,
                         Teinte? lueur = null, float flouLueurCss = 0f, Teinte? lisere = null, float rayonPct = 0f,
                         string couleurCss = null)
        {
            Cotes = cotes; EpaisseurCss = epaisseurCss; Style = style; Couleur = couleur; Rayon = rayon; Inset = inset;
            Lueur = lueur; FlouLueurCss = flouLueurCss; Lisere = lisere; RayonPct = rayonPct; CouleurCss = couleurCss;
        }
    }

    public sealed class SpecSupport
    {
        public readonly SpecCouche[] Couches;    // ordre CSS : la première est la plus HAUTE
        public readonly SpecFilet Cerne;         // famille A, sinon null
        public readonly bool Enseigne;           // famille A : la plaque se pose CHEZ L'ÉCRAN (elle porte son texte)
        public readonly Vector4 Rayon;           // px CSS : haut-gauche, haut-droit, bas-droit, bas-gauche (⑤ 26/26/0/0)

        public SpecSupport(SpecCouche[] couches, SpecFilet cerne = null, bool enseigne = false, Vector4 rayon = default)
        {
            Couches = couches ?? Array.Empty<SpecCouche>(); Cerne = cerne; Enseigne = enseigne; Rayon = rayon;
        }

        public bool Arrondi => Rayon.x > 0f || Rayon.y > 0f || Rayon.z > 0f || Rayon.w > 0f;

        /// <summary>La couleur du BAS du support : le dernier arrêt de sa couche la plus HAUTE, quand celle-ci est un dégradé
        /// linéaire vertical (180°) OPAQUE — elle couvre alors tout le reste. ⑱ : le fondu de fin de course du menu s'y fond
        /// (mesuré au créneau n°4 : sur surfaceBase, le pied du bureau perdait son brun, écart 30/255). Tout autre support lève :
        /// « le bas » n'y a pas une couleur unique, et un repli plausible serait pire qu'une erreur.</summary>
        public Color CouleurDuBas
        {
            get
            {
                SpecCouche c = Couches.Length > 0 ? Couches[0] : null;
                if (c == null || c.Genre != GenreCouche.Lineaire || Mathf.Abs(c.Angle - 180f) > 0.01f || !c.EstOpaque || c.Arrets.Length == 0)
                    throw new InvalidOperationException("CouleurDuBas : la couche la plus haute n'est pas un dégradé linéaire 180° opaque");
                return c.Arrets[c.Arrets.Length - 1].Couleur.Resoudre();
            }
        }
    }

    /// <summary>Le décor d'UN écran (une ligne du §4). Immuable.</summary>
    public sealed class SpecDecor
    {
        public readonly string Symbole;          // ③ ⑤ … — la clé de D1 (`Tools/juge-visuel/INDEX.md`)
        public readonly string Ecran;            // le contrôleur, tel que l'INDEX l'écrit — la clé de D2
        public readonly StatutDecor Statut;
        public readonly SceneDeFond Scene;
        public readonly float Luminosite;        // CSS `brightness(b)`, 1 = rien
        public readonly float Bande;             // part de la hauteur où la scène reste visible AU-DESSUS du support ; 1 = ③
        public readonly bool Voile;              // faux pour ③ seulement
        public readonly SpecSupport Support;     // null pour ③ seulement

        public SpecDecor(string symbole, string ecran, StatutDecor statut, SceneDeFond scene, float luminosite, float bande,
                         SpecSupport support, bool voile = true)
        {
            Symbole = symbole; Ecran = ecran; Statut = statut; Scene = scene; Luminosite = luminosite; Bande = bande;
            Support = support; Voile = voile;
        }
    }

    public static class DecorDeScene
    {
        /// <summary>Le cadre de référence de la série 6 : `.tel{width:300px; aspect-ratio:9/17.5}` ⇒ 300 × 583,33.</summary>
        public const float LargeurCadreCss = EchelleMaquette.LargeurEcransBrennar6;
        public const float HauteurCadreCss = EchelleMaquette.LargeurEcransBrennar6 * 17.5f / 9f;

        /// <summary>Sur-échantillonnage des sprites dont la géométrie est en px CSS (tuiles, cerne, coins) : texels par
        /// px CSS. L'Image les ramène à l'échelle de l'écran par `pixelsPerUnitMultiplier` (`DecorPose.Rafraichir`).</summary>
        public const int TexelsParPxCss = 4;

        /// <summary>D5 : les ressources de scène PROVISOIRES (dette TD-769 : verge nuit pleine résolution à commander à
        /// l'atelier ; repli = l'image extraite de la maquette, 900×765).</summary>
        public static readonly SceneDeFond[] ScenesProvisoires = { SceneDeFond.Verge };

        /// <summary>L2 (§3.2) : `linear-gradient(180deg, #0a0f18cc 0, #0a0f1822 18%, #0a0f1800 40%, #0a0f1866 100%)` —
        /// teinte PAR LE JETON `lieutenantGlassBottom` (d = 1,45). Identique sur les 25 écrans voilés.</summary>
        public static readonly SpecCouche VoileDeScene = SpecCouche.Lineaire(180f,
            Arret.En(0.00f, Nuit.A(0xcc / 255f)),
            Arret.En(0.18f, Nuit.A(0x22 / 255f)),
            Arret.En(0.40f, Nuit.A(0f)),
            Arret.En(1.00f, Nuit.A(0x66 / 255f)));

        private static Teinte Nuit => Teinte.Jeton("lieutenantGlassBottom", t => t.lieutenantGlassBottom);

        /// <summary>Chemin `Resources` de chaque scène (§3.1).</summary>
        public static string CheminScene(SceneDeFond s)
        {
            switch (s)
            {
                case SceneDeFond.District: return "Scenes/scene_district_nuit";
                case SceneDeFond.Bar: return "Scenes/sprite_environment_bar_nuit";
                case SceneDeFond.Verge: return "Scenes/verge_nuit_provisoire";
                default: return "Scenes/sprite_environment_verge_d_or_jour";
            }
        }

        /// <summary>La découpe « cover » de chaque scène (§3.1), au format de `DecorAuComptoir.UvCouverture` (RÉUTILISÉE,
        /// éprouvée). `PositionVerticale` est inerte sur un téléphone portrait ≤ 9:16 (§0 M2) ; elle est écrite quand même.
        /// VergeJour : la boîte (300,60)–(1500,1080) = `RevueDuJourDecor.BoiteSource` (Shell, invisible d'ici : un test
        /// d'égalité les tient ensemble).</summary>
        public static DecorAuComptoir.Parametres Cadrage(SceneDeFond s)
        {
            var p = new DecorAuComptoir.Parametres { CheminScene = CheminScene(s) };
            switch (s)
            {
                case SceneDeFond.District:
                    p.SourceLargeur = 1080f; p.SourceHauteur = 1920f; p.PositionVerticale = 0.50f; break;
                case SceneDeFond.Bar:
                    p.SourceLargeur = 1080f; p.SourceHauteur = 1350f; p.PositionVerticale = 0.20f; break;
                case SceneDeFond.Verge:
                    p.SourceLargeur = 900f; p.SourceHauteur = 765f; p.PositionVerticale = 0.30f; break;
                default:
                    p.SourceLargeur = 1728f; p.SourceHauteur = 1080f; p.PositionVerticale = 0.22f;
                    p.Boite = new Rect(300f, 60f, 1200f, 1020f);
                    return p;
            }
            p.Boite = new Rect(0f, 0f, p.SourceLargeur, p.SourceHauteur);
            return p;
        }

        /// <summary>La boîte CSS du support : la largeur du cadre × la part sous la bande. Sert à l'ASPECT des textures
        /// de dégradés angulaires et à la conversion des arrêts en px (⑱). (`Bande` ancrée au haut du support : ±18 px
        /// consignés au §9.)</summary>
        public static Vector2 BoiteSupportCss(SpecDecor spec) =>
            new Vector2(LargeurCadreCss, HauteurCadreCss * Mathf.Clamp01(1f - spec.Bande));

        /// <summary>Monte le décor de `spec` sous `racineEcran` : premier enfant `Decor`, hors mise en page, étiré
        /// (contrat de `DecorAuComptoir.Construire`). Un décor déjà posé par ce mécanisme est REMPLACÉ.</summary>
        public static DecorPose Poser(Transform racineEcran, SpecDecor spec)
        {
            if (racineEcran == null) throw new ArgumentNullException(nameof(racineEcran));
            if (spec == null) throw new ArgumentNullException(nameof(spec));

            for (int i = racineEcran.childCount - 1; i >= 0; i--)
            {
                Transform t = racineEcran.GetChild(i);
                if (t.name == "Decor" && t.GetComponent<DecorPose>() != null) Detruire(t.gameObject);
            }

            var go = new GameObject("Decor", typeof(RectTransform));
            go.transform.SetParent(racineEcran, false);
            go.AddComponent<LayoutElement>().ignoreLayout = true;
            var decorRt = (RectTransform)go.transform;
            Etirer(decorRt);
            decorRt.SetAsFirstSibling();
            DecorPose pose = go.AddComponent<DecorPose>();
            pose.Spec = spec;

            // ── Capteur : le bloqueur de raycast du fond plat qu'il remplace (§5.2) ──────────────────────────────
            Image capteur = Graphique<Image>("Capteur", decorRt);
            Etirer(capteur.rectTransform);
            capteur.color = Color.clear;
            capteur.raycastTarget = true;
            pose.Capteur = capteur;

            // ── L1 Scène ──────────────────────────────────────────────────────────────────────────────────────────
            RawImage scene = Graphique<RawImage>("Scene", decorRt);
            Etirer(scene.rectTransform);
            string chemin = CheminScene(spec.Scene);
            Sprite sp = Resources.Load<Sprite>(chemin);
            scene.texture = sp != null ? sp.texture : Resources.Load<Texture2D>(chemin);
            // Ressource absente ⇒ NOIR (« rien n'est monté » : la règle de `DecorAuComptoir` gagne sur la luminosité) ;
            // sinon `brightness(b)` = teinte (b, b, b) — prémisse sondée par D4 (pixel de scène × b à ±2/255).
            Color lum = Color.black;
            if (scene.texture != null) { lum = Color.white; lum.r = lum.g = lum.b = Mathf.Clamp01(spec.Luminosite); }
            scene.color = lum;
            pose.Scene = scene;
            pose.Cadrage = Cadrage(spec.Scene);

            // ── L2 Voile (fond INCONNU : la scène) ────────────────────────────────────────────────────────────────
            if (spec.Voile)
            {
                Image voile = Graphique<Image>("Voile", decorRt);
                Etirer(voile.rectTransform);
                voile.sprite = ProceduralUI.DegradeLineaire(180f,
                    ResoudreArrets(VoileDeScene.Arrets, 180f, LargeurCadreCss, HauteurCadreCss, null),
                    LargeurCadreCss, HauteurCadreCss);
                pose.Voile = voile;
            }

            // ── L3 Support ────────────────────────────────────────────────────────────────────────────────────────
            if (spec.Support != null)
            {
                Vector2 boite = BoiteSupportCss(spec);
                var supGo = new GameObject("Support", typeof(RectTransform));
                supGo.transform.SetParent(decorRt, false);
                var supRt = (RectTransform)supGo.transform;
                AncrerSousLaBande(supRt, spec.Bande);
                pose.Support = supRt;

                if (spec.Support.Arrondi)
                {
                    // `Mask` + rectangle arrondi à 4 rayons (⑤ : 26/26/0/0). Le stencil coupe aussi l'Image carrée d'un
                    // `RadialCercle`, plus grande que le support.
                    supGo.AddComponent<CanvasRenderer>();
                    Image forme = supGo.AddComponent<Image>();
                    Vector4 r = spec.Support.Rayon;
                    const int k = 2;
                    forme.sprite = ProceduralUI.RoundedRectMask(Mathf.RoundToInt(r.x * k), Mathf.RoundToInt(r.y * k),
                                                                Mathf.RoundToInt(r.z * k), Mathf.RoundToInt(r.w * k));
                    forme.type = Image.Type.Sliced;
                    forme.raycastTarget = false;
                    supGo.AddComponent<Mask>().showMaskGraphic = false;
                    pose.AjouterEchelle(forme, k);
                }
                else
                {
                    supGo.AddComponent<RectMask2D>();   // CLIP OBLIGATOIRE (§3.3, D0) : l'Image d'un cercle déborde
                }

                PoserCouches(pose, supRt, spec.Support.Couches, boite);

                if (spec.Support.Cerne != null) PoserCerne(pose, decorRt, spec, spec.Support.Cerne, boite);
            }

            pose.Rafraichir();
            return pose;
        }

        // ───────────────────────────────────────────────────────────────────────────────────────────── couches

        private static void PoserCouches(DecorPose pose, RectTransform supRt, SpecCouche[] couches, Vector2 boite)
        {
            int nRadial = 0, nCercle = 0, nLin = 0, nPlein = 0, nPoints = 0, nRayures = 0;
            var noms = new string[couches.Length];
            for (int i = 0; i < couches.Length; i++)
            {
                switch (couches[i].Genre)
                {
                    case GenreCouche.Lineaire: noms[i] = "Lineaire" + nLin++; break;
                    case GenreCouche.Radial: noms[i] = "Radial" + nRadial++; break;
                    case GenreCouche.RadialCercle: noms[i] = "RadialCercle" + nCercle++; break;
                    case GenreCouche.Plein: noms[i] = "Plein" + nPlein++; break;
                    case GenreCouche.Points: noms[i] = "Points" + nPoints++; break;
                    default: noms[i] = "Rayures" + nRayures++; break;
                }
            }

            CercleDeSupport cercles = null;
            // L'ordre CSS met la plus HAUTE en premier ; uGUI dessine le premier enfant DESSOUS ⇒ on pose à rebours.
            for (int i = couches.Length - 1; i >= 0; i--)
            {
                SpecCouche c = couches[i];
                Color? fond = FondSous(couches, i, boite);
                Image img = Graphique<Image>(noms[i], supRt);
                switch (c.Genre)
                {
                    case GenreCouche.Lineaire:
                        Etirer(img.rectTransform);
                        img.sprite = ProceduralUI.DegradeLineaire(c.Angle, ResoudreArrets(c.Arrets, c.Angle, boite.x, boite.y, fond),
                                                                  boite.x, boite.y);
                        break;
                    case GenreCouche.Radial:
                        Etirer(img.rectTransform);
                        img.sprite = ProceduralUI.DegradeRadial(c.Cx, c.Cy, c.Rx, c.Ry, ResoudreArrets(c.Arrets, 0f, 0f, 0f, fond));
                        pose.AjouterRadial(img.rectTransform);
                        break;
                    case GenreCouche.RadialCercle:
                        img.sprite = ProceduralUI.DegradeRadialCercle(ResoudreArrets(c.Arrets, 0f, 0f, 0f, fond));
                        if (cercles == null) cercles = supRt.gameObject.AddComponent<CercleDeSupport>();
                        cercles.Ajouter(img.rectTransform, c.Cx, c.Cy);
                        pose.AjouterRadial(img.rectTransform);
                        break;
                    case GenreCouche.Plein:
                        Etirer(img.rectTransform);
                        img.color = Ajuster(c.Couleur.Resoudre(), fond);
                        break;
                    case GenreCouche.Points:
                        Etirer(img.rectTransform);
                        img.sprite = ProceduralUI.TuilePoints(c.Pas, c.RayonPlein, c.RayonFin, Ajuster(c.Couleur.Resoudre(), fond),
                                                              c.Decalage, TexelsParPxCss);
                        img.type = Image.Type.Tiled;
                        pose.AjouterEchelle(img, TexelsParPxCss);
                        break;
                    default:
                        Etirer(img.rectTransform);
                        img.sprite = ProceduralUI.TuileRayures(c.Angle, c.Pas, c.Epaisseur, Ajuster(c.Couleur.Resoudre(), fond),
                                                               TexelsParPxCss);
                        img.type = Image.Type.Tiled;
                        pose.AjouterEchelle(img, TexelsParPxCss);
                        break;
                }
            }
            if (cercles != null) cercles.Maj();
        }

        /// <summary>Le FOND CONNU sous la couche `i` : la première couche opaque en dessous, lue au foyer de la couche
        /// (centre de la boîte pour une couche sans foyer). Null = aucun fond connu (on retombe sur l'ajustement d'opacité
        /// pour fond quelconque). C'est la forme exacte des `FondsDeReferenceSupport` du design (§3.3) : pas trois fonds
        /// figés, le pixel du support que la couche recouvre.</summary>
        public static Color? FondSous(SpecCouche[] couches, int i, Vector2 boite)
        {
            SpecCouche c = couches[i];
            if (c.EstOpaque) return null;
            float u = 0.5f, v = 0.5f;
            if (c.Genre == GenreCouche.Radial || c.Genre == GenreCouche.RadialCercle) { u = c.Cx; v = c.Cy; }
            for (int j = i + 1; j < couches.Length; j++)
                if (couches[j].EstOpaque) return CouleurDeCouche(couches[j], u, v, boite);
            return null;
        }

        /// <summary>La couleur CSS d'une couche OPAQUE au point (u, v) de la boîte (fractions, y depuis le haut).</summary>
        public static Color CouleurDeCouche(SpecCouche c, float u, float v, Vector2 boite)
        {
            if (c.Genre == GenreCouche.Plein) return c.Couleur.Resoudre();
            float t;
            switch (c.Genre)
            {
                case GenreCouche.Lineaire:
                {
                    float rad = c.Angle * Mathf.Deg2Rad;
                    float L = Mathf.Max(1e-4f, ProceduralUI.LongueurLigneDeDegrade(c.Angle, boite.x, boite.y));
                    // Repère CSS (y vers le BAS) : la direction vaut (sin θ, −cos θ).
                    t = ((u - 0.5f) * boite.x * Mathf.Sin(rad) - (v - 0.5f) * boite.y * Mathf.Cos(rad)) / L + 0.5f;
                    break;
                }
                case GenreCouche.Radial:
                {
                    float nx = (u - c.Cx) / Mathf.Max(1e-4f, c.Rx), ny = (v - c.Cy) / Mathf.Max(1e-4f, c.Ry);
                    t = Mathf.Sqrt(nx * nx + ny * ny);
                    break;
                }
                default:
                {
                    float r = Mathf.Max(1e-4f, ProceduralUI.RayonCoinLePlusLoin(boite.x, boite.y, c.Cx, c.Cy));
                    float dx = (u - c.Cx) * boite.x, dy = (v - c.Cy) * boite.y;
                    t = Mathf.Sqrt(dx * dx + dy * dy) / r;
                    break;
                }
            }
            float angle = c.Genre == GenreCouche.Lineaire ? c.Angle : 0f;
            return ProceduralUI.EchantillonDeDegrade(ResoudreArrets(c.Arrets, angle, boite.x, boite.y, null), t);
        }

        /// <summary>Les arrêts RÉSOLUS : position en fraction (un arrêt en px est rapporté à la longueur de la ligne du
        /// dégradé sur la boîte CSS), couleur lue, opacité CSS traduite pour un mélange LINÉAIRE — sur `fond` connu par la
        /// couleur, sinon par l'opacité.</summary>
        public static (float pos, Color c)[] ResoudreArrets(Arret[] arrets, float angleDeg, float largeurCss, float hauteurCss,
                                                            Color? fond)
        {
            if (arrets == null) return Array.Empty<(float, Color)>();
            float L = ProceduralUI.LongueurLigneDeDegrade(angleDeg, largeurCss, hauteurCss);
            var r = new (float pos, Color c)[arrets.Length];
            for (int i = 0; i < arrets.Length; i++)
            {
                Arret a = arrets[i];
                float pos = a.EnPx ? (L > 1e-4f ? a.Pos / L : 0f) : a.Pos;
                r[i] = (pos, Ajuster(a.Couleur.Resoudre(), fond));
            }
            return r;
        }

        /// <summary>Une couleur CSS translucide traduite pour le mélange linéaire d'Unity. Opaque ou transparente : telle
        /// quelle.</summary>
        public static Color Ajuster(Color css, Color? fond)
        {
            float a = css.a;
            if (a <= 0f || a >= 0.999f) return css;
            Color encre = css; encre.a = 1f;
            if (fond.HasValue)
            {
                Color f = fond.Value; f.a = 1f;
                return ProceduralUI.CouleurPourMelangeLineaire(encre, f, a, out _);
            }
            encre.a = ProceduralUI.AlphaVoileSurFondQuelconque(encre, a, out _);
            return encre;
        }

        // ───────────────────────────────────────────────────────────────────────────────────────────── cerne (A)

        /// <summary>`.cerne{position:absolute;inset:5px;border:1px solid #b08d3e;border-radius:3px;
        /// box-shadow:inset 0 0 0 1px #0b1016, 0 0 12px #b08d3e26}` dans la racine (`overflow:hidden`) : `Decor/Cerne`
        /// a le rect du support et le CLIPPE (RectMask2D) ; dedans, `Lueur` (ombre extérieure, rien à l'intérieur),
        /// `Trait`, `Lisere`. Géométrie en px CSS, ramenée à l'écran par `DecorPose.Rafraichir`.</summary>
        private static void PoserCerne(DecorPose pose, RectTransform decorRt, SpecDecor spec, SpecFilet f, Vector2 boite)
        {
            var go = new GameObject("Cerne", typeof(RectTransform));
            go.transform.SetParent(decorRt, false);
            var rt = (RectTransform)go.transform;
            AncrerSousLaBande(rt, spec.Bande);
            go.AddComponent<RectMask2D>();
            pose.Cerne = rt;

            const int k = TexelsParPxCss;
            int rayon = Mathf.Max(1, Mathf.RoundToInt(f.Rayon));
            int ep = Mathf.Max(1, Mathf.RoundToInt(f.EpaisseurCss));
            Color fondCentre = CouleurDeCouche(DernierOpaque(spec.Support.Couches), 0.5f, 0.5f, boite);

            if (f.Lueur.HasValue && f.FlouLueurCss > 0f)
            {
                Image lueur = Graphique<Image>("Lueur", rt);
                Etirer(lueur.rectTransform);
                lueur.sprite = ProceduralUI.RoundedRectShadow(rayon * k, Mathf.RoundToInt(f.FlouLueurCss * k),
                                                              Ajuster(f.Lueur.Value.Resoudre(), fondCentre));
                lueur.type = Image.Type.Sliced;
                pose.AjouterEchelle(lueur, k);
                pose.AjouterInset(lueur.rectTransform, f.Inset - f.FlouLueurCss);
            }

            Image trait = Graphique<Image>("Trait", rt);
            Etirer(trait.rectTransform);
            trait.sprite = ProceduralUI.RoundedRectOutline(rayon * k, ep * k, Ajuster(f.Couleur.Resoudre(), fondCentre));
            trait.type = Image.Type.Sliced;
            pose.AjouterEchelle(trait, k);
            pose.AjouterInset(trait.rectTransform, f.Inset);

            if (f.Lisere.HasValue)
            {
                Image lisere = Graphique<Image>("Lisere", rt);
                Etirer(lisere.rectTransform);
                lisere.sprite = ProceduralUI.RoundedRectOutline(Mathf.Max(1, rayon - ep) * k, k,
                                                                Ajuster(f.Lisere.Value.Resoudre(), fondCentre));
                lisere.type = Image.Type.Sliced;
                pose.AjouterEchelle(lisere, k);
                pose.AjouterInset(lisere.rectTransform, f.Inset + ep);
            }
        }

        private static SpecCouche DernierOpaque(SpecCouche[] couches)
        {
            for (int j = couches.Length - 1; j >= 0; j--) if (couches[j].EstOpaque) return couches[j];
            return SpecCouche.Plein(Teinte.Nommee("noir", Color.black));
        }

        /// <summary>Place le contenu de l'écran SOUS la bande de scène (voir `ReserveDeBande`) : à appeler sur la pile racine
        /// du contrôleur, avec la marge haute qu'il posait (en unités de canvas). ③ (`Bande` = 1, aucun support) n'en a pas
        /// besoin. Le décor seul ne déplace AUCUN bloc : sans cet appel, la scène est visible, le contenu ne bouge pas.</summary>
        /// <param name="plancherBarre">vrai (défaut) : la racine couvre l'écran, le contenu descend sous max(barre, bande). Faux : la racine
        /// est DÉJÀ sous la barre (⑱ `MenuPlus`, insettée par `ShellChrome`, §5.1) — la bande seule, sinon la barre compterait deux fois.</param>
        public static ReserveDeBande ReserverLaBande(LayoutGroup pile, DecorPose pose, float margeHautUnites, bool plancherBarre = true)
        {
            if (pile == null) throw new ArgumentNullException(nameof(pile));
            if (pose == null) throw new ArgumentNullException(nameof(pose));
            ReserveDeBande r = pile.GetComponent<ReserveDeBande>();
            if (r == null) r = pile.gameObject.AddComponent<ReserveDeBande>();
            r.Lier(pose, pile, margeHautUnites, plancherBarre);
            r.Maj();
            return r;
        }

        // ───────────────────────────────────────────────────────────────────────────────────────────── enseigne (A)

        /// <summary>L'ENSEIGNE de la famille A (§3.3) — `.enseigne{background:linear-gradient(178deg,rgba(11,17,27,.91),
        /// rgba(13,19,30,.85)); border:1px solid #2a3648; border-bottom:2px solid #b08d3e; box-shadow:inset 0 1px 0 #ffffff0f}`.
        /// Le bloc et son TEXTE appartiennent à l'écran (`margin:13px 13px 0`, sa hauteur suit le texte) : le décor
        /// l'HABILLE — plaque `Plaque` (premier enfant, hors mise en page) et filets — sans le placer. `bord` = la recette
        /// MESURÉE de l'écran (`DecorsDeScene.Filets.&lt;Ecran&gt;.Enseigne`) ; le liseré blanc du haut est ajouté ici.
        /// La plaque est translucide sur un fond CONNU : le haut du support A de `decor`.</summary>
        public static Image HabillerEnseigne(RectTransform enseigne, SpecFilet[] bord, SpecDecor decor)
        {
            if (enseigne == null) throw new ArgumentNullException(nameof(enseigne));
            if (decor?.Support == null || !decor.Support.Enseigne)
                throw new ArgumentException("l'enseigne n'existe que sur un support de la famille A", nameof(decor));
            Vector2 boite = BoiteSupportCss(decor);
            Color fond = CouleurDeCouche(DernierOpaque(decor.Support.Couches), 0.5f, 0.06f, boite);
            Color haut = Ajuster(PlaqueHaut.Resoudre(), fond), bas = Ajuster(PlaqueBas.Resoudre(), fond);

            var filets = new SpecFilet[(bord?.Length ?? 0) + 1];
            if (bord != null) Array.Copy(bord, filets, bord.Length);
            filets[filets.Length - 1] = new SpecFilet(Cotes.Haut, 1f, StyleFilet.Plein, Teinte.Nommee("blanc", Color.white, 0x0f / 255f),
                                                      inset: 1f);
            Color fondDuLisere = haut; fondDuLisere.a = 1f;
            Filets.Poser(enseigne, filets, fondDuLisere);

            Transform deja = enseigne.Find("Plaque");
            if (deja != null) Detruire(deja.gameObject);
            Image plaque = Graphique<Image>("Plaque", enseigne);
            plaque.gameObject.AddComponent<LayoutElement>().ignoreLayout = true;
            Etirer(plaque.rectTransform);
            plaque.sprite = ProceduralUI.DegradeLineaire(178f, new[] { (0f, haut), (1f, bas) },
                                                         LargeurCadreCss - 26f, 40f);
            plaque.rectTransform.SetAsFirstSibling();   // sous les filets, sous le texte
            return plaque;
        }

        private static Teinte PlaqueHaut => Teinte.Jeton("hudBarGlassTop", t => t.hudBarGlassTop, 0.91f);       // #0b111b (d 0,10)
        private static Teinte PlaqueBas => Teinte.Jeton("hudBarGlassBottom", t => t.hudBarGlassBottom, 0.85f);  // #0d131e (d 0,15)

        // ───────────────────────────────────────────────────────────────────────────────────────────── outils

        /// <summary>Un Graphic qui NAÎT avec son `CanvasRenderer` (D0), sans raycast.</summary>
        private static T Graphique<T>(string nom, Transform parent) where T : Graphic
        {
            var go = new GameObject(nom, typeof(RectTransform), typeof(CanvasRenderer));
            go.transform.SetParent(parent, false);
            T g = go.AddComponent<T>();
            g.raycastTarget = false;
            return g;
        }

        private static void AncrerSousLaBande(RectTransform rt, float bande)
        {
            rt.anchorMin = Vector2.zero;
            rt.anchorMax = new Vector2(1f, Mathf.Clamp01(1f - bande));
            rt.offsetMin = Vector2.zero;
            rt.offsetMax = Vector2.zero;
        }

        internal static void Etirer(RectTransform rt)
        {
            rt.anchorMin = Vector2.zero;
            rt.anchorMax = Vector2.one;
            rt.offsetMin = Vector2.zero;
            rt.offsetMax = Vector2.zero;
        }

        private static void Detruire(GameObject go)
        {
            go.transform.SetParent(null, false);
            if (Application.isPlaying) UnityEngine.Object.Destroy(go);
            else UnityEngine.Object.DestroyImmediate(go);
        }
    }
}
