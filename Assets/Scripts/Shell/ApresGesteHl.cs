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
        /// plutôt qu'un mot inventé. `cibles` = `target_count` de la carte lue à l'ouverture.
        /// Un ARRÊT PARTIEL dit le préfixe SERVI (« Fait pour {n} sur {total} : ») puis la phrase servie de l'erreur (`stopped_at_i18n_key`) ; sans phrase servie
        /// (clé absente, générique ou non servie) il dit le préfixe SEUL, sans son « : » final — jamais une phrase de repli du client (f2 11/11, TD-937 classe C).</summary>
        public static string Mot(CommitResponseDto d, int cibles)
        {
            if (d == null || string.IsNullOrEmpty(d.outcome_i18n_key)) return null;
            string phrase = MafiaCleanCity.I18n.Libelle.Gabarit(d.outcome_i18n_key, null, Parametres(d, cibles));
            if (string.IsNullOrWhiteSpace(phrase)) return null;
            if (!ArretPartiel(d)) return phrase;
            string erreur = MafiaCleanCity.I18n.RefusServi.PhraseDeLaCle(d.stopped_at_i18n_key);
            if (!string.IsNullOrWhiteSpace(erreur)) return phrase + erreur;
            return phrase.TrimEnd().TrimEnd(':').TrimEnd();
        }

        // ═══ LA VUE des cadres 6-7 (atelier `ecrans-brennar-accueil.html`, générateur-q5-apres) — PURE : aucune UI, testable sans scène ═══

        /// <summary>Ce que le geste a donné, tel que ④ ou ⑤ l'a reçu : la carte, la réponse de `commit` (200) OU la clé et la phrase SERVIES du refus. Rien d'autre.</summary>
        public sealed class IssueDuGeste
        {
            public HlCardDto Carte;
            public CommitResponseDto Reponse;     // non null ⇒ 200
            public string CleDeRefus;             // `user_facing_i18n_key` du refus (null : le corps n'en servait pas, ou réseau)
            public string PhraseDeRefus;          // la phrase servie de ce refus (null : aucune ou générique)
        }

        /// <summary>Le jeton de la décision structurelle, à TROIS états et AUCUN chiffre (N6, arbitrage f2 11/11) : `libre` (cap non atteint) · `pris` (cap atteint, `used` &gt; 0)
        /// · `fermée aujourd’hui` (cap atteint ET `used` = 0 : le cap est à 0 pendant la fenêtre d'observation).</summary>
        public enum EtatDuJeton { Libre, Pris, FermeeAujourdhui }

        /// <summary>L'état du jeton. `structuraleTranchee` : la carte qu'on vient de TRANCHER était structurelle (`commit` sert `structural` et `committed`) ⇒ la décision de la
        /// session est prise, quoi que dise le budget lu à l'OUVERTURE (périmé : aucune route ne le relit).</summary>
        public static EtatDuJeton Jeton(StructuralBudgetDto budget, bool structuraleTranchee)
        {
            if (structuraleTranchee) return EtatDuJeton.Pris;
            if (budget == null || !budget.cap_reached) return EtatDuJeton.Libre;
            return budget.used > 0 ? EtatDuJeton.Pris : EtatDuJeton.FermeeAujourdhui;
        }

        public static string MotDuJeton(EtatDuJeton e) =>
            e == EtatDuJeton.Pris ? Lib("jeton", "pris") : e == EtatDuJeton.FermeeAujourdhui ? Lib("jeton", "fermée aujourd’hui") : Lib("jeton", "libre");

        /// <summary>Le petit texte du jeton, en mode après seulement : « votre grande décision du jour » (« session » et « structurelle » sont des mots du SYSTÈME, bannis du texte joueur).</summary>
        public static string PetitTexteDuJeton() => Lib("jeton", "votre grande décision du jour");

        /// <summary>Les issues que la maquette dessine : mêmes cadres 6 (tranchée) ou 7 (la carte reste), seuls les textes varient.</summary>
        public enum Issue { Executee, Notee, CarteReste, DejaTranchee, Disparue, RienAFaire }

        /// <summary>Ce que ⑤ rend en mode « après-geste » ; chaque champ texte à NULL = l'élément n'existe pas. Tout texte vient d'une clé servie, SAUF les mots de chrome
        /// (`Lib` : clés dérivées, repli compté, TD-938).</summary>
        public sealed class VueApres
        {
            public Issue Issue;
            /// <summary>`.grave` — « Vous avez tranché », « C’est noté », « La carte reste sur la table », ou le TITRE servi d'un 409 déjà tranché ; null = aucun grave.</summary>
            public string Grave;
            /// <summary>`.mot-or` — la phrase de l'issue (servie) ; null = aucun.</summary>
            public string Mot;
            /// <summary>`.mot-or.rouge` — l'échec de la 1ʳᵉ cible (cadre 7).</summary>
            public bool MotRouge;
            /// <summary>`.carte-or.tranchee` : la carte désaturée (0,8).</summary>
            public bool CarteTranchee;
            /// <summary>`.tampon-diag` « TRANCHÉE » : posé quand la décision vient d'être prise (jamais sur un 409 déjà tranché : pas de tampon NEUF).</summary>
            public bool Tampon;
            /// <summary>`.deja` — la pastille « Déjà tranchée » dans la carte.</summary>
            public bool Deja;
            public string Action;            // le libellé de la `.ligne-or` : « Retour à l’accueil »
            public string SousLigne;         // sa sous-ligne
            public EtatDuJeton Jeton;
        }

        /// <summary>La vue d'après-geste de ce que le geste a donné, ou NULL quand il n'y a RIEN à lire (réponse sans clé servie : `navigate`, ou clé que le back ne sert pas ;
        /// refus sans clé servie — réseau) : l'appelant garde alors son comportement d'avant (remonter tout de suite / dire le refus sur place).
        /// `cibles` = `target_count` de la carte ; `enAttente` = la file de l'Accueil (`LastSessionOpen.queue.Length`).</summary>
        public static VueApres Vue(IssueDuGeste g, int cibles, int enAttente, StructuralBudgetDto budget)
        {
            if (g == null || g.Carte == null) return null;
            if (g.Reponse != null)
            {
                CommitResponseDto d = g.Reponse;
                string mot = Mot(d, cibles);
                if (string.IsNullOrWhiteSpace(mot)) return null;
                bool note = string.Equals(d.outcome, "noted", StringComparison.Ordinal);
                return new VueApres
                {
                    Issue = note ? Issue.Notee : Issue.Executee,
                    Grave = note ? Lib("carte", "C’est noté") : Lib("carte", "Vous avez tranché"),
                    Mot = mot, MotRouge = false, CarteTranchee = d.committed, Tampon = d.committed, Deja = false,
                    Action = Lib("carte", "Retour à l’accueil"), SousLigne = SousLigneDeLaFile(enAttente),
                    Jeton = Jeton(budget, d.committed && d.structural),
                };
            }
            if (string.IsNullOrEmpty(g.CleDeRefus)) return null;   // aucun refus SERVI (réseau, corps muet) : ④/⑤ le disent sur place, comme avant
            string repli = Lib("carte", "La décision n’a pas été prise.");
            string phrase = string.IsNullOrWhiteSpace(g.PhraseDeRefus) ? null : g.PhraseDeRefus;
            switch (g.CleDeRefus)
            {
                case CleDejaTranchee:   // un TITRE servi (design §3, T3) : posé en grave, aucun mot-or, la pastille `.deja`, PAS de tampon neuf
                    return new VueApres
                    {
                        Issue = Issue.DejaTranchee, Grave = phrase, Mot = null, CarteTranchee = true, Tampon = false, Deja = true,
                        Action = Lib("carte", "Retour à l’accueil"), SousLigne = SousLigneDeLaFile(enAttente),
                        Jeton = Jeton(budget, false),
                    };
                case CleIntrouvable:    // y c. une carte `superseded` (B1 f2) : le client affiche la clé servie, rien de dérivé
                case CleRienAFaire:
                    return new VueApres
                    {
                        Issue = g.CleDeRefus == CleIntrouvable ? Issue.Disparue : Issue.RienAFaire, Grave = null, Mot = phrase ?? repli,
                        CarteTranchee = false, Tampon = false, Deja = false,
                        Action = Lib("carte", "Retour à l’accueil"), SousLigne = SousLigneDeLaFile(enAttente),
                        Jeton = Jeton(budget, false),
                    };
                default:                // l'échec de la 1ʳᵉ cible (cadre 7) : la phrase SERVIE de la route, sinon la phrase existante de la carte ; la carte reste à vous
                    return new VueApres
                    {
                        Issue = Issue.CarteReste, Grave = Lib("carte", "La carte reste sur la table"), Mot = phrase ?? repli, MotRouge = true,
                        CarteTranchee = false, Tampon = false, Deja = false,
                        Action = Lib("carte", "Retour à l’accueil"), SousLigne = Lib("carte", "La carte vous attend encore."),
                        Jeton = Jeton(budget, false),
                    };
            }
        }

        /// <summary>Les trois codes `HL_CARD_*` du back, par leur clé servie (`error.hl_card.*`).</summary>
        public const string CleIntrouvable = "error.hl_card.not_found", CleDejaTranchee = "error.hl_card.already_resolved", CleRienAFaire = "error.hl_card.nothing_to_act_on";

        /// <summary>La sous-ligne de la `.ligne-or` : « Plusieurs attendent encore » si la file de l'Accueil n'est pas vide (clé SERVIE `accueil.file.plusieurs_attendent_encore`), sinon « Rien d’autre à trancher pour l’instant. ».</summary>
        public static string SousLigneDeLaFile(int enAttente) =>
            enAttente > 0 ? MafiaCleanCity.I18n.Libelle.De("accueil", "file", "Plusieurs attendent encore") : Lib("carte", "Rien d’autre à trancher pour l’instant.");

        private static string Lib(string role, string litteral) => MafiaCleanCity.I18n.Libelle.De("accueil", role, litteral);
    }
}
