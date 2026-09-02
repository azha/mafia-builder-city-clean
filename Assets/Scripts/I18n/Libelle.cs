using System.Globalization;
using System.Text;

namespace MafiaCleanCity.I18n
{
    /// <summary>Item 0.6 — le passage d'un LITTÉRAL d'écran à une CLÉ, en un seul endroit.
    ///
    /// ⛔ POURQUOI CE FICHIER EXISTE. Le même geste doit être posé sur neuf écrans (379 littéraux
    /// visibles mesurés : ② 152, ㊸ 101, ⑨ 25, Accueil 24, ⑩ 20, ㊲ 20, ㊱ 19, 42 18). Recopier
    /// `Cle`/`Slug` dans chacun, c'est neuf copies qui divergeront — exactement ce qui est arrivé
    /// aux trois `CapturerA` de ce dépôt, dont l'un lisait un canvas que les autres n'avaient pas.
    /// ★ Une règle recopiée n'est pas une règle partagée : le durcissement posé sur l'une ne
    ///   protège aucune des autres.
    ///
    /// **Le contrat, et la seule chose qu'il promet** : rendre le texte du dictionnaire quand la
    /// clé y est, et RENDRE LE LITTÉRAL D'ORIGINE sinon. Tant que le dictionnaire est vide,
    /// l'écran ne change pas d'un pixel et les gardes existantes restent vraies.
    /// ⇒ C'est ce qui rend la conversion sûre à poser sans run : elle est byte-identique par
    ///   construction. « Sûre » n'est pas « mesurée », mais le pire cas est l'inchangé.</summary>
    public static class Libelle
    {
        /// <summary>`domaine.role.slug` — dérivée du littéral, donc déterministe et sans site
        /// d'appel à réécrire.
        /// ⛔ RÉSERVÉ AUX PHRASES FERMÉES. Une valeur CALCULÉE ne doit jamais passer ici :
        /// « Dans 30 j » fabriquerait `…dans_30_j`, puis `…_29_j`, une clé par nombre. Une clé
        /// nomme une phrase fermée ; une phrase calculée relève d'une clé À PARAMÈTRES, donc
        /// d'un lot back, pas d'une dérivation côté client.</summary>
        public static string De(string domaine, string role, string litteral)
        {
            if (string.IsNullOrEmpty(litteral)) return litteral;
            string slug = Slug(litteral);
            if (slug.Length == 0) return litteral;
            string cle = domaine + "." + role + "." + slug;
            // `Connait` AVANT `Traduire` : sans ce test, une clé absente remplacerait un mot
            // lisible par la clé nue à l'écran — une régression déguisée en progrès.
            return I18nCatalog.Connait(cle) ? I18nCatalog.Traduire(cle) : litteral;
        }

        /// <summary>La clé qu'un littéral PRODUIRAIT — pour générer la liste à demander au back
        /// sans avoir à deviner ce que le code fera.</summary>
        public static string CleDe(string domaine, string role, string litteral) =>
            domaine + "." + role + "." + Slug(litteral);

        /// <summary>Minuscules, accents pliés, le reste en `_`. Déterministe : le même littéral
        /// rend toujours la même clé, sur toutes les machines.</summary>
        public static string Slug(string s)
        {
            if (string.IsNullOrEmpty(s)) return string.Empty;
            var sb = new StringBuilder();
            foreach (char c in s.Normalize(NormalizationForm.FormD))
            {
                if (CharUnicodeInfo.GetUnicodeCategory(c) == UnicodeCategory.NonSpacingMark) continue;
                if (char.IsLetterOrDigit(c)) sb.Append(char.ToLowerInvariant(c));
                else if (sb.Length > 0 && sb[sb.Length - 1] != '_') sb.Append('_');
            }
            return sb.ToString().Trim('_');
        }
    }
}
