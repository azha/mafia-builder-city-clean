using System;
using System.Collections.Generic;

namespace MafiaCleanCity.Operational.Exceptions
{
    /// <summary>Les deux bandes qualitatives d'une carte d'exception, RENDUES EN FRANÇAIS.
    ///
    /// ⛔⛔ POURQUOI CE FICHIER EXISTE : ⑨ affichait l'ÉNUM DU SERVEUR, capitalisée. Un juge ⊥ a
    /// mesuré cinq libellés anglais atteignant l'écran — `Severe · Critical`, `Moderate · Critical`,
    /// `Severe · Urgent` sur les trois rangées, plus la ligne méta de la bulle — dans un écran par
    /// ailleurs entièrement français (« attendent vos ordres », « il attend une consigne »,
    /// « Escalades archivées »). Ce n'est pas un écran non traduit : c'est un **repli partiel**, et
    /// la doctrine est explicite — aucun repli anglais ne doit atteindre l'écran.
    /// L'ancien code faisait `Cap(c.severity_band)`, c'est-à-dire une mise en capitale de la valeur
    /// brute. *Capitaliser un identifiant ne le traduit pas ; ça le déguise en libellé.*
    ///
    /// ⇒ UNE FONCTION NOMMÉE, PAS UN `switch` DISPERSÉ. Une correspondance domaine → apparence
    /// écrite en ternaires ou en index de tableau n'a aucune forme exécutable à asserter : un
    /// balayage ne la trouve pas et aucune garde ne peut la couvrir. Nommée et prenant la valeur du
    /// domaine, elle devient balayable et testable — c'est la séquence que ce dépôt a payée sur les
    /// trois mappings « bucket de chaleur → apparence ».
    ///
    /// ⚠️ PAS DE CLÉ i18n INVENTÉE — et aujourd'hui elles sont SERVIES. Mesuré le 06/09 sur le bundle `fr` réel (675
    /// clés) : aucune clé de gravité ni d'urgence. Le client n'a pas improvisé de slug ; l'atelier a proposé la forme
    /// (`11-exceptions-inventaire.md` §3.2) et le back la sert à `aea5ef7c`. ⑨-5 la lit par `Libelle.ParValeur` : la
    /// clé vient de la VALEUR servie, le repli est le mot de l'atelier.
    ///
    /// ⛔ LE DOMAINE EST LU À LA SOURCE, PAS SUR LA CAPTURE. Le juge voyait quatre valeurs ; le back
    /// en déclare **sept** (`exceptions.projection.service.ts:13-14` et `:79`) :
    ///   gravité  : `MILD | MODERATE | SEVERE`                 (majuscules)
    ///   priorité : `silent | watching | urgent | critical`    (minuscules)
    /// *Une garde de couverture qui recopie la population qu'elle a vue mesure la recopie.* Les deux
    /// casses diffèrent, donc la comparaison est insensible à la casse — s'aligner sur celle qu'on a
    /// vue serait un piège de plus.
    ///
    /// ⚠️⚠️ QUATRE VALEURS SUR SEPT SONT DESSINÉES PAR LA MAQUETTE (`GRAVE · CRITIQUE`, `MODÉRÉE · URGENTE`). Les trois
    /// autres (`MILD`, `watching`, `silent`) ont reçu leurs mots de l'atelier le 22/09 (§3.2) : « légère », « à surveiller »,
    /// « sans urgence » — « Silencieuse », le choix du client, décrivait la carte et non son rang.
    ///
    /// ⚠️ ET LA VALEUR INATTENDUE NE SE TAIT PAS. Une bande absente ou inconnue rend `—`, jamais un
    /// mot anglais et jamais le mot le plus proche : un trou se montre, il ne se déguise pas. C'est
    /// la même règle que la réplique de ⑨, qui affiche un identifiant technique SANS guillemets
    /// plutôt que de le mettre dans la bouche d'un lieutenant.</summary>
    public static class ExceptionBandes
    {
        /// <summary>Ce qu'une bande absente, vide ou hors domaine affiche. Un tiret cadratin, pas un
        /// mot : il ne peut être confondu avec aucune valeur du domaine, et il se voit.</summary>
        public const string Inconnue = "—";

        /// <summary>Le domaine de la GRAVITÉ, recopié de `exceptions.projection.service.ts:79`
        /// (`export type SeverityEnum = 'MILD' | 'MODERATE' | 'SEVERE'`). Exposé pour qu'un test
        /// puisse balayer la population ENTIÈRE au lieu de la recopier lui-même — deux recopies de
        /// la même liste en font diverger une.</summary>
        public static readonly string[] DomaineGravite = { "MILD", "MODERATE", "SEVERE" };

        /// <summary>Le domaine de la PRIORITÉ, recopié de `exceptions.projection.service.ts:13`
        /// (`priority_band : silent | watching | urgent | critical`).</summary>
        public static readonly string[] DomainePriorite = { "silent", "watching", "urgent", "critical" };

        /// <summary>⑨-5 (2026-09-23) — LES MOTS SONT SERVIS, LE CLIENT GARDE LES REPLIS DE L'ATELIER. Le back sert
        /// `exceptions.gravite.<valeur>`, `exceptions.priorite.<valeur>` et `exception_detail.confiance.<valeur>` (la forme
        /// proposée par l'atelier, `11-exceptions-inventaire.md` §3.2, servie à `aea5ef7c`). La clé se dérive de la VALEUR
        /// servie (`Libelle.ParValeur`), jamais du mot affiché. Les replis sont les mots de l'atelier, en minuscules comme il
        /// les écrit : « légère » et « sans urgence » ne sont plus des choix du client (« Silencieuse » décrivait la carte,
        /// pas son rang). ⚠️ Le repli n'est PAS la valeur servie à `aea5ef7c` pour `mild` et `silent` : celle-ci portait la
        /// justification de l'atelier en plus du mot (défaut du back, signalé le 23/09).
        /// ⛔ Le DOMAINE reste fermé ici : une valeur hors domaine rend `Inconnue` SANS consulter le catalogue — une clé
        /// servie pour `HIGH` ne rouvrirait pas l'ancien domaine en silence.</summary>
        private static readonly Dictionary<string, string> Gravites =
            new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
            {
                { "SEVERE", "grave" },        // RATIFIÉ — maquette, rangées 1 et 3
                { "MODERATE", "modérée" },    // RATIFIÉ — maquette, rangée 2
                { "MILD", "légère" },         // atelier §3.2
            };

        private static readonly Dictionary<string, string> Priorites =
            new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
            {
                { "critical", "critique" },     // RATIFIÉ — maquette, rangées 1 et 2
                { "urgent", "urgente" },        // RATIFIÉ — maquette, rangée 3
                { "watching", "à surveiller" }, // atelier §3.2
                { "silent", "sans urgence" },   // atelier §3.2
            };

        /// <summary>Le domaine de la CONFIANCE (`ExceptionDtos.confidence_band`, casse canon `ConfidenceBucket`).</summary>
        public static readonly string[] DomaineConfiance = { "tentative", "likely", "confident" };

        private static readonly Dictionary<string, string> Confiances =
            new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
            {
                { "confident", "il est sûr" },  // RATIFIÉ — cadre 15, `.chip.conf.conf-h`
                { "likely", "il le croit" },    // atelier §3.2
                { "tentative", "il hésite" },   // atelier §3.2
            };

        /// <summary>Le libellé d'une bande de gravité. Insensible à la casse — le back
        /// envoie des majuscules pour celle-ci et des minuscules pour l'autre.</summary>
        public static string Gravite(string bande) => Resoudre("exceptions", "gravite", Gravites, bande);

        /// <summary>Le libellé d'une bande de priorité.</summary>
        public static string Priorite(string bande) => Resoudre("exceptions", "priorite", Priorites, bande);

        /// <summary>⑨-5 — ce que le lieutenant pense de sa propre suggestion (⑩). Remplace `Cap(confidence_band)`, qui
        /// affichait l'enum anglais capitalisé (« Likely »).</summary>
        public static string Confiance(string bande) => Resoudre("exception_detail", "confiance", Confiances, bande);

        /// <summary>La ligne « gravité · priorité » telle que la maquette la compose. Un seul site
        /// de composition : les deux appelants de ⑨ écrivaient le séparateur chacun de leur côté,
        /// et une correspondance en deux exemplaires en fait diverger une.</summary>
        public static string Ligne(string gravite, string priorite) =>
            $"{Gravite(gravite)} · {Priorite(priorite)}";

        /// <summary>⛔⛔⛔ LE RANG D'UNE GRAVITÉ — 0 douce, 1 moyenne, 2 forte, **−1 hors domaine**.
        /// C'est cette fonction qui ferme le vrai défaut, et il est bien plus grave que les cinq
        /// libellés anglais qui l'ont fait trouver.
        ///
        /// MESURÉ le 2026-09-06 : **cinq correspondances gravité → apparence, dans TROIS fichiers,
        /// étaient câblées sur `HIGH | MEDIUM | LOW`** — un domaine que le back **n'émet jamais**.
        /// Sa projection rend `MILD | MODERATE | SEVERE` et rien d'autre
        /// (`exceptions.projection.service.ts:333-338`, trois `return` littéraux ; balayage de
        /// `'HIGH'`/`'MEDIUM'`/`'LOW'` dans tout `services/game-back/src/exceptions/` : **zéro**).
        /// ⇒ Les cinq tombaient donc TOUJOURS dans leur branche par défaut : glyphe `[?]` pour
        /// chaque carte, teinte neutre pour chaque carte, et un libellé qui recrachait la valeur
        /// brute du serveur. **Le codage par couleur de ⑨ n'a jamais fonctionné**, et rien ne
        /// pouvait le dire : une correspondance qui rend toujours son défaut ne lève aucune erreur,
        /// n'a l'air ni vide ni cassée, et son code se relit comme s'il marchait.
        /// ★ La correspondance JUSTE existait déjà — `ExceptionDetailController.SeverityTeinte`,
        ///   sur `MILD|MODERATE|SEVERE`, dans le même dossier. **Un fichier sur quatre.** Le
        ///   correctif d'alors a fermé l'instance qu'on regardait et laissé la classe entière
        ///   ouverte, ce que ce dépôt paie assez souvent pour l'avoir écrit au socle.
        ///
        /// ⇒ POURQUOI UN RANG ET PAS UNE COULEUR : les trois fichiers ont chacun leurs propres
        /// jetons d'accent, et leur faire partager une couleur les coupleraient. Ce qu'ils doivent
        /// partager est la CONNAISSANCE DU DOMAINE — un seul endroit qui sait quelles chaînes
        /// existent. Chacun garde ses couleurs et n'écrit plus une seule chaîne du domaine.
        ///
        /// ⚠️ ET `−1` EST LA PROPRIÉTÉ QUI SE TESTE : un test qui demande `RangGravite("HIGH")`
        /// doit obtenir **−1**. C'est la seule assertion qui rougit si quelqu'un « élargit » cette
        /// table pour accepter l'ancien domaine — l'élargir la rendrait de nouveau silencieuse.</summary>
        public static int RangGravite(string bande)
        {
            if (string.IsNullOrWhiteSpace(bande)) return -1;
            string b = bande.Trim();
            for (int i = 0; i < DomaineGravite.Length; i++)
                if (string.Equals(DomaineGravite[i], b, StringComparison.OrdinalIgnoreCase)) return i;
            return -1;
        }

        /// <summary>Le rang d'une priorité — 0 silencieuse … 3 critique, −1 hors domaine.</summary>
        public static int RangPriorite(string bande)
        {
            if (string.IsNullOrWhiteSpace(bande)) return -1;
            string b = bande.Trim();
            for (int i = 0; i < DomainePriorite.Length; i++)
                if (string.Equals(DomainePriorite[i], b, StringComparison.OrdinalIgnoreCase)) return i;
            return -1;
        }

        /// <summary>Le glyphe d'une gravité. Trois crans PLUS un état inconnu qui se voit — la même
        /// règle que `Inconnue` : un trou se montre, il ne se déguise pas en cran le plus doux.</summary>
        public static string Glyphe(string bande)
        {
            switch (RangGravite(bande))
            {
                case 0: return "[!..]";
                case 1: return "[!!.]";
                case 2: return "[!!!]";
                default: return "[?]";
            }
        }

        /// <summary>⛔⛔ LA RÈGLE DU DESCRIPTEUR, SORTIE DE L'ÉCRAN QUI LA PORTAIT SEUL.
        ///
        /// `ExceptionQueueController.Replique` portait cette règle, écrite et justifiée : un
        /// descripteur SANS ESPACE est un identifiant technique, donc il s'affiche **tel quel, sans
        /// guillemets** — *mettre un identifiant dans la bouche d'un personnage, c'est inventer une
        /// donnée ; le trou se montre, il ne se déguise pas en dialogue.*
        /// **Et `ExceptionDetailController` faisait l'inverse, inconditionnellement** : il entourait
        /// la valeur de guillemets, identifiant compris. Les deux écrans montrent la MÊME carte, à un
        /// clic l'un de l'autre.
        /// ⇒ *Une règle qui vit dans un seul de deux fichiers voisins n'est pas une règle, c'est une
        ///   habitude.* Et recopier la condition dans le second fermerait l'instance en laissant la
        ///   classe : la TROISIÈME surface qui affichera un descripteur la réécrira à sa façon.
        ///   Une fonction que les deux consomment est ce qui la rend obligatoire.
        ///
        /// ⚠️ CE QU'ELLE NE FAIT PAS : traduire. Elle décide de la PRÉSENTATION — dialogue ou
        /// identifiant — pas du contenu. Un descripteur en identifiant reste un trou de données côté
        /// serveur ; cette fonction le rend visible au lieu de le maquiller.</summary>
        /// <summary>Le locuteur d'une carte : un lieutenant si la carte en porte un, sinon la ville.
        /// C'est LUI qui décide des guillemets — pas le texte (voir `Replique`).</summary>
        public static bool ParleUnLieutenant(ExceptionCardDto c) =>
            c != null && !string.IsNullOrEmpty(c.lieutenant_id);

        /// <summary>⑨-0 — QUI parle, UN seul site pour ⑨ et ⑩ (ils l'écrivaient chacun de leur côté).
        /// · la carte porte un lieutenant ⇒ son NOM servi (`lieutenant.name`, C3) ;
        /// · pas de lieutenant ⇒ « La ville » ;
        /// · un lieutenant SANS nom ⇒ « Votre lieutenant ». ⚠️ N'arrive que sur une pile antérieure à C3 : le back refuse
        ///   aujourd'hui de servir un id sans nom (D7). Le repli reste lisible et DIT qu'il ne nomme personne.
        /// ⚠️ Le nom est affiché TEL QU'IL EST SERVI, même « Lieutenant » (le placeholder de TD-046 écrit par le chemin
        ///    de recrutement) : c'est la donnée, pas un défaut d'ici.</summary>
        public static string Locuteur(ExceptionCardDto c)
        {
            if (!ParleUnLieutenant(c))
                return MafiaCleanCity.I18n.Libelle.De("exceptions", "locuteur", "La ville");
            string nom = c.lieutenant != null ? c.lieutenant.name : null;
            return string.IsNullOrWhiteSpace(nom)
                ? MafiaCleanCity.I18n.Libelle.De("exceptions", "locuteur", "Votre lieutenant")
                : nom.Trim();
        }

        /// <summary>LA RÈGLE, EN ENTIER (ratifiée par l'atelier le 22/09) :
        /// « » ⇔ (le locuteur est un lieutenant) ET (le texte est de la prose : il a une espace).
        /// La ville ne parle pas entre guillemets ; une clé ne parle jamais, quel que soit le locuteur.</summary>
        public static string Replique(string texteServeur, bool parleUnLieutenant)
        {
            if (string.IsNullOrWhiteSpace(texteServeur)) return Inconnue;
            string t = texteServeur.Trim();
            // ⛔ LA CONDITION EST LE LOCUTEUR, PAS LA PRÉSENCE D'UNE ESPACE (atelier, cadre ⑨·12,
            //    2026-09-22) : la maquette réserve les guillemets à la PAROLE D'UN LIEUTENANT ; la
            //    carte de la ville (`lieutenant_id` vide) s'affiche sans. Mesuré sur le corps vivant de
            //    session/open du 22/09 : 3 cartes, 1 de la ville — « Citywide heat is high — … »
            //    portait des « » à tort, parce qu'elle avait des espaces.
            if (!parleUnLieutenant) return t;
            // Pas d'espace ⇒ personne ne parle ainsi : c'est un identifiant, il se montre nu — MÊME
            // dans la bouche d'un lieutenant. Les 2 cartes de lieutenant du même corps SONT des
            // identifiants (`exc_demo_teach_heat`, `exc_demo_raid_style`) : les citer mettrait une
            // clé dans sa bouche, le défaut que le juge a lu sur la planche. Le trou se montre.
            return t.Contains(" ") ? $"« {t} »" : t;
        }

        /// <summary>Le domaine d'abord (hors domaine ⇒ `Inconnue`, le catalogue n'est pas consulté), puis la clé dérivée
        /// de la valeur servie, repli = le mot de l'atelier. La MAJUSCULE INITIALE se pose ICI, une fois, sur le servi comme
        /// sur le repli : le back et l'atelier écrivent en minuscules, les écrans affichent « Grave · Critique » (ou en
        /// capitales par style, ce qui revient au même).</summary>
        private static string Resoudre(string domaine, string role, Dictionary<string, string> table, string bande)
        {
            if (string.IsNullOrWhiteSpace(bande)) return Inconnue;
            string valeur = bande.Trim();
            if (!table.TryGetValue(valeur, out string repli)) return Inconnue;
            string mot = MafiaCleanCity.I18n.Libelle.ParValeur(domaine, role, valeur, repli);
            return Initiale(string.IsNullOrWhiteSpace(mot) ? repli : mot.Trim());
        }

        /// <summary>« à surveiller » → « À surveiller » ; le reste du mot est intact.</summary>
        public static string Initiale(string mot) =>
            string.IsNullOrEmpty(mot) ? mot : char.ToUpperInvariant(mot[0]) + mot.Substring(1);
    }
}
