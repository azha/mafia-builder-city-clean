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
    /// ⚠️ PAS DE CLÉ i18n INVENTÉE, ET C'EST DÉLIBÉRÉ. Mesuré sur le bundle `fr` RÉEL servi par
    /// `GET /v1/i18n/bundle` (**675 clés**) : aucune clé de gravité ni d'urgence n'y est servie —
    /// `Severe` 0, `Urgent` 0, `TEACH` 0 ; `Moderate` ne rend que `messages.accueil.etat.moderate`,
    /// qui appartient à un autre écran. Poser un `Lib()` sur une clé non servie ajouterait un REPLI,
    /// et une garde de ce dépôt existe exactement pour ça. Le mot français est ici la valeur
    /// RATIFIÉE du client ; la clé se crée côté back, au lot i18n, jamais par un slug improvisé.
    ///
    /// ⛔ LE DOMAINE EST LU À LA SOURCE, PAS SUR LA CAPTURE. Le juge voyait quatre valeurs ; le back
    /// en déclare **sept** (`exceptions.projection.service.ts:13-14` et `:79`) :
    ///   gravité  : `MILD | MODERATE | SEVERE`                 (majuscules)
    ///   priorité : `silent | watching | urgent | critical`    (minuscules)
    /// *Une garde de couverture qui recopie la population qu'elle a vue mesure la recopie.* Les deux
    /// casses diffèrent, donc la comparaison est insensible à la casse — s'aligner sur celle qu'on a
    /// vue serait un piège de plus.
    ///
    /// ⚠️⚠️ QUATRE VALEURS SUR SEPT SONT RATIFIÉES, TROIS NE LE SONT PAS, ET C'EST ÉCRIT ICI PLUTÔT
    /// QUE MASQUÉ. La maquette montre `GRAVE · CRITIQUE` et `MODÉRÉE · URGENTE` — donc `SEVERE`,
    /// `MODERATE`, `critical` et `urgent`. Elle ne montre **jamais** `MILD`, `silent` ni `watching` :
    /// ce sont des cartes trop basses pour atteindre le haut de la file. Leurs libellés ci-dessous
    /// sont mon choix, pas une valeur ratifiée, et ils attendent un arbitrage. Les laisser en anglais
    /// aurait été pire — la doctrine ne dit pas « aucun repli anglais sauf ceux qu'on n'a pas vus ».
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

        private static readonly Dictionary<string, string> Gravites =
            new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
            {
                { "SEVERE", "Grave" },        // RATIFIÉ — maquette, rangées 1 et 3
                { "MODERATE", "Modérée" },    // RATIFIÉ — maquette, rangée 2
                { "MILD", "Légère" },         // NON ratifié — la maquette ne montre pas cette bande
            };

        private static readonly Dictionary<string, string> Priorites =
            new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
            {
                { "critical", "Critique" },   // RATIFIÉ — maquette, rangées 1 et 2
                { "urgent", "Urgente" },      // RATIFIÉ — maquette, rangée 3
                { "watching", "À surveiller" }, // NON ratifié
                { "silent", "Silencieuse" },    // NON ratifié
            };

        /// <summary>Le libellé français d'une bande de gravité. Insensible à la casse — le back
        /// envoie des majuscules pour celle-ci et des minuscules pour l'autre.</summary>
        public static string Gravite(string bande) => Resoudre(Gravites, bande);

        /// <summary>Le libellé français d'une bande de priorité.</summary>
        public static string Priorite(string bande) => Resoudre(Priorites, bande);

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
        public static string Replique(string texteServeur)
        {
            if (string.IsNullOrWhiteSpace(texteServeur)) return Inconnue;
            string t = texteServeur.Trim();
            // Pas d'espace ⇒ personne ne parle ainsi : c'est un identifiant, il se montre nu.
            return t.Contains(" ") ? $"« {t} »" : t;
        }

        private static string Resoudre(Dictionary<string, string> table, string bande)
        {
            if (string.IsNullOrWhiteSpace(bande)) return Inconnue;
            return table.TryGetValue(bande.Trim(), out string libelle) ? libelle : Inconnue;
        }
    }
}
