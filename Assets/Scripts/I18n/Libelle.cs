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
        /// <summary>Combien de fois `De` a été appelé depuis le dernier `RemettreLesCompteurs`.
        /// Sert de garde ANTI-VACUITÉ : « 0 repli » est trivialement vrai sur un écran qui n'a
        /// demandé AUCUNE clé, et c'est exactement l'état d'un écran qui ne s'est pas construit.
        /// Une garde qui exige 0 repli sans exiger un plancher d'appels certifie le vide.</summary>
        public static int NbAppels { get; private set; }

        /// <summary>Combien de fois la clé manquait et le littéral a été rendu à sa place.</summary>
        public static int NbReplis { get; private set; }

        /// <summary>La DERNIÈRE clé retombée sur son littéral — pour qu'un rouge NOMME sa cause
        /// au lieu de dire seulement « il y en a ». Un compte nu ne dit pas ce qu'il compte.</summary>
        public static string DernierRepli { get; private set; }

        /// <summary>⛔ Réservé aux tests. Les compteurs sont STATIQUES et les suites PlayMode de ce
        /// dépôt tournent SÉRIELLES dans un seul processus : sans remise à zéro, un écran mesure
        /// les replis de son voisin et le verdict dépend de l'ordre des tests.</summary>
        public static void RemettreLesCompteurs()
        {
            NbAppels = 0;
            NbReplis = 0;
            DernierRepli = null;
        }

        public static string De(string domaine, string role, string litteral)
        {
            if (string.IsNullOrEmpty(litteral)) return litteral;
            string slug = Slug(litteral);
            if (slug.Length == 0) return litteral;
            string cle = domaine + "." + role + "." + slug;
            NbAppels++;
            // `Connait` AVANT `Traduire` : sans ce test, une clé absente remplacerait un mot
            // lisible par la clé nue à l'écran — une régression déguisée en progrès.
            if (I18nCatalog.Connait(cle)) return I18nCatalog.Traduire(cle);
            // ⛔ LE REPLI SE COMPTE, PARCE QU'IL EST INVISIBLE AUTREMENT. Le contrat de cette
            // classe est de rendre le littéral quand la clé manque : un écran entièrement non
            // traduit et un écran entièrement traduit rendent le MÊME nombre de pixels valides,
            // le même vert de test, la même absence d'erreur. *Un défaut sans symptôme ne se
            // trouve pas en regardant — il se compte.*
            // ⇒ Ce compteur est la seule grandeur qui distingue « la clé a été servie » de
            //   « la clé manquait et personne ne l'a su ». Il permet à une garde d'exiger ZÉRO
            //   repli sur un écran monté avec le bundle réel, ce qu'aucune capture ne prouve.
            NbReplis++;
            DernierRepli = cle;
            return litteral;
        }

        /// <summary>La clé qu'un littéral PRODUIRAIT — pour générer la liste à demander au back
        /// sans avoir à deviner ce que le code fera.</summary>
        /// <summary>⛔ LA CLÉ SE DÉRIVE DE LA VALEUR SERVIE, JAMAIS DU MOT AFFICHÉ (lot E, 2026-09-22). Pour
        /// une BANDE (valeur d'un domaine fermé que le back sert : `DISTRIBUTION_HUB`, `MAJOR`, `normal`),
        /// la clé est `domaine.role.slug(valeurServie)` — exactement la forme que le back a posée dans
        /// `string_table.ts` (`building.type.distribution_hub`). `De` ne convient pas : il dérive la clé
        /// du LITTÉRAL, donc d'un mot, et un mot traduit changerait la clé. Tant que la clé n'est pas
        /// servie, le REPLI (français, écrit par l'atelier) s'affiche — et il se COMPTE, comme dans `De`.</summary>
        public static string ParValeur(string domaine, string role, string valeurServie, string repli)
        {
            if (string.IsNullOrEmpty(valeurServie)) return repli;
            string slug = Slug(valeurServie);
            if (slug.Length == 0) return repli;
            string cle = domaine + "." + role + "." + slug;
            NbAppels++;
            if (I18nCatalog.Connait(cle)) return I18nCatalog.Traduire(cle);
            NbReplis++;
            DernierRepli = cle;
            return repli;
        }

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
