using System;
using System.Collections.Generic;
using System.Globalization;

namespace MafiaCleanCity.Shell
{
    /// <summary>L'APRÈS-GESTE de la carte de tête (④), lu de la réponse de `commit` — AUCUN mot dérivé côté client (TD-889 (a), arbitrage f2 11/11).
    ///
    /// Le back SERT la clé du mot (`outcome_i18n_key`, lot `hl-card-apres-geste-servi` D4-D6) et celle de la phrase d'un arrêt (`stopped_at_i18n_key`,
    /// D7) ; le client ne fait que les RÉSOUDRE, avec ses deux paramètres :
    ///   · `n` = les cibles EXÉCUTÉES = `executed_ids.Length` (déjà sur la même réponse) ;
    ///   · `total` = `target_count` de la carte, lu à l'OUVERTURE (`session/open` ; `commit` ne le sert pas — N11, classe C, TD-928 côté back).
    /// Les deux sont posés en ENTIERS en chaîne : le résolveur ICU (`I18nCatalog`) rend l'accolade BRUTE d'un `plural` dont le paramètre manque ou n'est
    /// pas un entier (`long.TryParse`), jamais une branche par défaut. `n` vaut au moins 1 sur une réponse 200 (le back relance l'erreur de la 1ʳᵉ cible,
    /// §9.2 du design) : aucune branche `=0` n'est due.
    ///
    /// Trois issues, trois rendus :
    ///   · `executed` sans arrêt  → la phrase de `outcome_i18n_key` (101/102/105/107) ;
    ///   · `executed` AVEC arrêt (`stopped_at_id` non vide) → `outcome_i18n_key` est alors `hl.after_choice.partial_stop` (le PRÉFIXE « Fait pour {n} sur {total} : »,
    ///     T2 du design) suivi de la phrase JOUEUR de l'erreur (`stopped_at_i18n_key`), jamais le code brut `stopped_at_error` ;
    ///   · `noted` → la phrase de `outcome_i18n_key` (`hl.after_choice.noted`) ; `navigate` → clé NULLE (D6) : pas de mot d'après-geste, le geste a ouvert un écran.
    /// </summary>
    public static class ApresGesteHl
    {
        /// <summary>Le corps du refus de la PREMIÈRE cible, quand le back ne sert pas de phrase spécifique (clé générique) : la phrase de repli du cadre 7.</summary>
        public static string PhraseDeRepli() =>
            MafiaCleanCity.I18n.Libelle.Gabarit("accueil.carte.ca_n_a_pas_pu_se_faire_pour_l_instant", "ça n’a pas pu se faire pour l’instant.");

        /// <summary>Le nombre de cibles exécutées (`executed_ids`), 0 si la réponse n'en porte pas.</summary>
        public static int Executes(CommitResponseDto d) => d != null && d.executed_ids != null ? d.executed_ids.Length : 0;

        /// <summary>Vrai si l'exécution s'est ARRÊTÉE en route (≥ 1 cible faite, puis une en échec).</summary>
        public static bool ArretPartiel(CommitResponseDto d) => d != null && !string.IsNullOrEmpty(d.stopped_at_id);

        /// <summary>Vrai si la carte est TRANCHÉE (`committed`) : le tampon se pose, la carte ne revient pas.</summary>
        public static bool Tranchee(CommitResponseDto d) => d != null && d.committed;

        /// <summary>Les paramètres des phrases d'après-geste : `n` et `total`, en entiers de chaîne (culture invariante : « 2 », jamais « 2,0 »).
        /// `total` ne descend jamais sous `n` (une carte lue à l'ouverture sans `target_count` vaut 0 : le dénominateur reste un entier cohérent) et
        /// dépasse `n` quand l'exécution s'est arrêtée.</summary>
        public static Dictionary<string, string> Parametres(CommitResponseDto d, int cibles)
        {
            int n = Executes(d);
            int total = Math.Max(cibles, n);
            if (ArretPartiel(d) && total <= n) total = n + 1;
            return new Dictionary<string, string>
            {
                { "n", n.ToString(CultureInfo.InvariantCulture) },
                { "total", total.ToString(CultureInfo.InvariantCulture) },
            };
        }

        /// <summary>La phrase d'après-geste de la carte, ou NULL (pas de clé servie : `navigate`, ou le back n'a pas livré) — l'appelant ne dit alors RIEN
        /// plutôt qu'un mot inventé. `cibles` = `target_count` de la carte lue à l'ouverture.</summary>
        public static string Mot(CommitResponseDto d, int cibles)
        {
            if (d == null || string.IsNullOrEmpty(d.outcome_i18n_key)) return null;
            string phrase = MafiaCleanCity.I18n.Libelle.Gabarit(d.outcome_i18n_key, null, Parametres(d, cibles));
            if (string.IsNullOrWhiteSpace(phrase)) return null;
            if (!ArretPartiel(d)) return phrase;
            return phrase + (MafiaCleanCity.I18n.RefusServi.PhraseDeLaCle(d.stopped_at_i18n_key) ?? PhraseDeRepli());
        }

        /// <summary>L'ÉCHEC DE LA 1ʳᵉ CIBLE (cadre 7) : le back relance l'erreur de la route telle quelle, rien n'est parti, la carte reste NON tranchée.
        /// « Rien n'est parti : » + la phrase servie du refus (`RefusServi.Phrase`, passée en `phraseServie`) ou, à défaut, la phrase de repli. Jamais le code brut.</summary>
        public static string RienNEstParti(string phraseServie) =>
            MafiaCleanCity.I18n.Libelle.Gabarit("accueil.carte.rien_n_est_parti", "Rien n’est parti : ") + (string.IsNullOrWhiteSpace(phraseServie) ? PhraseDeRepli() : phraseServie);
    }
}
