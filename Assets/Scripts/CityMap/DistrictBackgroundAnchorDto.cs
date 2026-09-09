using System;
using UnityEngine;

namespace MafiaCleanCity.CityMap
{
    // Pivot « fond pré-rendu » (Tools/pivot-fond-prerendu-design.md §4) — le JSON produit par
    // `parcelles.py` AU MOMENT DU RENDU, à côté du PNG, même nom de base. Unity ne fait qu'une
    // LECTURE de cette base (origine/ex/ey/ez) — il ne la dérive JAMAIS (§2 point 2 : « il n'existe
    // pas de px/m scalaire pour ancrer » ; §4 : « Unity ne fait qu'une lecture ; il ne dérive
    // rien »). Field names en snake_case pour matcher JsonUtility sur le JSON verbatim de l'atelier.
    [Serializable]
    public class DistrictBackgroundAnchorDto
    {
        public int schema;
        public string district_key;
        public string profil;
        public string mode;
        public string camera;
        public DistrictBackgroundImageDto image;
        public DistrictBackgroundBaseDto base_px_par_m;
        public float pas_parcelle_m;
        public float ppm_plan;
        public DistrictBackgroundParcelDto[] parcelles;
    }

    [Serializable] public class DistrictBackgroundImageDto { public int w; public int h; }

    [Serializable]
    public class DistrictBackgroundBaseDto
    {
        public float[] origine;
        public float[] ex;
        public float[] ey;
        public float[] ez;
    }

    [Serializable]
    public class DistrictBackgroundParcelDto
    {
        public int x;
        public int y;
        public float[] monde;
        /// <summary>Le pixel du point SOL de la parcelle (§4) — le pivot bas-centre du sprite s'y
        /// pose. Coordonnées image standard : origine haut-gauche, X à droite, Y vers le bas
        /// (confirmé §2 : `ey` a une composante Y NÉGATIVE pour un déplacement monde vers le haut).</summary>
        public float[] pivot_px;
        public float largeur_px;
    }

    /// <summary>Helper PUR (aucune dépendance MonoBehaviour, testable tel quel) — §P3 du design :
    /// « (x,y) bloc → pixel fond → UI ». Ne dérive AUCUNE géométrie : il ne fait que (a) chercher
    /// l'entrée `parcelles[]` d'un bloc donné et (b) convertir un pixel image (haut-gauche, Y-bas)
    /// en position locale compensée (centrée, Y-haut) — une conversion d'UNITÉS mécanique, jamais
    /// une ré-dérivation de la base `(origine, ex, ey, ez)` que seul Blender calcule (§4, §9/pp-F2 :
    /// « si Unity recalculait l'ancre par la même formule que l'export, l'assertion serait une
    /// tautologie » — la garde anti-tautologie porte sur l'ANCRE elle-même, jamais sur cette
    /// conversion d'unités générique).</summary>
    public static class DistrictBackgroundAnchor
    {
        public static DistrictBackgroundParcelDto FindParcel(DistrictBackgroundAnchorDto map, int blockX, int blockY)
        {
            if (map?.parcelles == null) return null;
            foreach (DistrictBackgroundParcelDto p in map.parcelles)
                if (p.x == blockX && p.y == blockY) return p;
            return null;
        }

        /// <summary>Pixel image (haut-gauche, Y-bas) → position locale compensée relative au CENTRE
        /// du fond (pivot 0,5/0,5), en unités canvas déjà divisées par `scaleFactor` — le même
        /// mécanisme de compensation que le fond lui-même (§2.1 : « rt.sizeDelta = tex.size /
        /// canvas.scaleFactor // fond ET chaque sprite joueur »).</summary>
        public static Vector2 PixelToFondLocal(Vector2 pixelPx, int imageWidthPx, int imageHeightPx, float scaleFactor)
        {
            float sf = scaleFactor > 0f ? scaleFactor : 1f;
            float halfW = (imageWidthPx / sf) * 0.5f;
            float halfH = (imageHeightPx / sf) * 0.5f;
            float localX = (pixelPx.x / sf) - halfW;
            float localY = halfH - (pixelPx.y / sf); // Y-bas (image) -> Y-haut (uGUI)
            return new Vector2(localX, localY);
        }

        /// <summary>Décalage horizontal, DANS la parcelle, du `rang`-ième bâtiment sur `total`
        /// qui l'occupent — en pixels image, à convertir comme n'importe quel pixel.
        ///
        /// ⛔ POURQUOI CE HELPER EXISTE. `FindParcel` rend UNE parcelle par (x,y) : deux bâtiments
        /// du même bloc reçoivent donc le MÊME pivot, à la position près. Mesuré en jeu le
        /// 2026-09-07 : 13 bâtiments pour 11 BLOCS DISTINCTS. Le juge l'a vu par ses deux bouts —
        /// un libellé en pâté (deux chaînes superposées) et trois marqueurs de lieutenant empilés
        /// sur un seul bâtiment — sans qu'aucune garde ne le dise, parce que
        /// *l'écart minimal entre ANCRES est une propriété des ancres, et la superposition est une
        /// propriété de la CLÉ : aucun écart entre ancres ne sépare deux bâtiments qui PARTAGENT
        /// une ancre.*
        ///
        /// ⛔ ET CE N'EST PAS UNE DÉRIVATION DE GÉOMÉTRIE. Le contrat de ce fichier interdit à Unity
        /// de re-dériver la base `(origine, ex, ey, ez)`. Ici on ne dérive rien : on répartit à
        /// l'intérieur d'une largeur que L'ATELIER fournit pour cette parcelle précise
        /// (`largeur_px`). Le `total`-ième d'un total de N reçoit la fraction (k+1)/(N+1) de cette
        /// largeur, centrée — une répartition, pas un calcul de projection.
        ///
        /// `total <= 1` rend EXACTEMENT 0 : le cas mono-occupant ne bouge pas d'un pixel, et aucune
        /// garde existante sur les positions ne peut changer de valeur à cause de ce lot.</summary>
        public static float EtalementDansParcelle(DistrictBackgroundParcelDto parcelle, int rang, int total,
                                                 float largeurDeRepliPx)
        {
            if (total <= 1 || rang < 0 || rang >= total) return 0f;
            // `largeur_px` absente ou nulle (parcelle non mesurée) ⇒ repli DÉCLARÉ sur la largeur
            // que l'appelant connaît (celle du sprite), jamais un nombre écrit ici.
            float largeur = parcelle != null && parcelle.largeur_px > 0f ? parcelle.largeur_px : largeurDeRepliPx;
            if (largeur <= 0f) return 0f;
            return largeur * (((rang + 1f) / (total + 1f)) - 0.5f);
        }

        /// <summary>Ramène le CENTRE d'une boîte de largeur `largeur` à l'intérieur d'un cadre de
        /// demi-largeur `demiLargeurCadre`, et rend le centre corrigé.
        ///
        /// ⛔ CE QUI SE PLIE ET CE QUI NE SE PLIE PAS. `PixelToFondLocal` ne borne rien, et c'est
        /// VOULU : elle convertit un pixel d'ancre, et *l'ancre dit OÙ EST le bâtiment* — c'est une
        /// donnée du monde. Le semis a délibérément rapproché des ancres des bords (troc mesuré par
        /// l'atelier : 23 ancres sorties de la chaussée contre 4 libellés rognés). Borner le
        /// BÂTIMENT rendrait ces 23. ⇒ **On plie le LIBELLÉ, qui dit seulement COMMENT ON LE NOMME
        /// et relève de la mise en page.** Ce helper n'est donc JAMAIS appliqué à un pivot.
        ///
        /// ⚠️ TROIS RÉGIMES, tous déclarés plutôt que silencieux :
        ///   · cadre ou largeur inconnus (≤ 0) ⇒ on ne bouge RIEN. Inventer un cadre depuis rien
        ///     déplacerait des libellés sur tout profil sans fond, sans que rien ne le dise.
        ///   · boîte PLUS LARGE que le cadre ⇒ centrée. Aucune position ne la fait tenir ; centrée
        ///     est la moins fausse, et surtout elle est DÉTERMINISTE (un `Clamp` naïf y colle la
        ///     boîte sur un bord au hasard de l'arrondi).
        ///   · sinon ⇒ le centre est borné pour que les deux bords tiennent.</summary>
        public static float ReplierDansLeCadre(float centreX, float largeur, float demiLargeurCadre)
        {
            if (largeur <= 0f || demiLargeurCadre <= 0f) return centreX;
            if (largeur >= 2f * demiLargeurCadre) return 0f;
            float demi = largeur * 0.5f;
            return Mathf.Clamp(centreX, -demiLargeurCadre + demi, demiLargeurCadre - demi);
        }

        /// <summary>Combine les deux : le bloc (x,y) → position locale compensée relative au centre
        /// du fond, ou null si ce bloc n'a pas d'ancre dans CETTE carte (fond sans couverture pour
        /// ce district — repli déclaré côté appelant, jamais un crash).</summary>
        public static Vector2? PivotLocalForBlock(DistrictBackgroundAnchorDto map, int blockX, int blockY, float scaleFactor)
        {
            if (map?.image == null) return null;
            DistrictBackgroundParcelDto p = FindParcel(map, blockX, blockY);
            if (p?.pivot_px == null || p.pivot_px.Length < 2) return null;
            return PixelToFondLocal(new Vector2(p.pivot_px[0], p.pivot_px[1]), map.image.w, map.image.h, scaleFactor);
        }
    }
}
