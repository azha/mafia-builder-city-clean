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

        /// <summary>Le texte serveur d'une carte : la référence i18n (`event_descriptor_i18n`) si elle est SERVIE, la prose
        /// (`event_descriptor`) sinon. `Connait` avant `Traduire` — une clé absente ne doit pas remplacer une prose lisible par une
        /// clé nue. ⛔ UN SEUL SITE pour ⑨ et le panneau de la file (2026-09-23) : le panneau lisait `event_descriptor` BRUT
        /// (prose anglaise machine, ou `exc_demo_…`) pendant que ⑨ passait par ici — défaut prouvé par l'atelier, alors que le back
        /// sert le jumeau des 6 cartes de lieutenant (227c39ef) en plus du raid et de la pression. Déplacée depuis
        /// `ExceptionQueueController` pour que les deux lisent la MÊME règle.</summary>
        public static string TexteServeur(ExceptionCardDto c)
        {
            if (c == null) return string.Empty;
            // la carte PRÉPARÉE (table 64, atelier D37 @8d9b9e3a) : la valeur n'a PLUS de {nom} — l'opt-in exigeant est RETIRÉ (il la
            // tiendrait pour non servie). {nom} reste fourni : une valeur intermédiaire « {nom} — … » se remplit au lieu de montrer
            // l'accolade ; et tout rendu qui OUVRE sur un nom (« Lt. Hara — », « Lt. Skeld — ») est périmé ⇒ le repli D37.
            if (c.event_descriptor_i18n != null && c.event_descriptor_i18n.key == CleCartePreparee)
            {
                string t = MafiaCleanCity.I18n.Libelle.Gabarit(CleCartePreparee, RepliCartePreparee,
                    new Dictionary<string, string> { { "nom", Locuteur(c) } });
                return MafiaCleanCity.I18n.NomsFiges.EstPerime(CleCartePreparee, t) ? RepliCartePreparee : t;   // pont TD-763
            }
            if (c.event_descriptor_i18n != null
                && !string.IsNullOrEmpty(c.event_descriptor_i18n.key)
                && MafiaCleanCity.I18n.I18nCatalog.Connait(c.event_descriptor_i18n.key))
                return MafiaCleanCity.I18n.I18nCatalog.Traduire(c.event_descriptor_i18n.key);
            return c.event_descriptor ?? string.Empty;
        }

        /// <summary>La carte préparée du kit de départ (`ONBOARDING_PRESEED_CARD_I18N_KEY`, onboarding-grant.service.ts:177) et son
        /// repli, à l'octet de la table 64 @8d9b9e3a (D37 : sans nom — l'en-tête de la bulle nomme déjà qui parle).</summary>
        public const string CleCartePreparee = "onboarding.preseed_exception.card";
        public const string RepliCartePreparee = "Cuisson du soir bloquée\u00A0: plus de Pyralin au labo. Il en faut avant de rallumer.";

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

        /// <summary>⑨-6 / ⑩-1 — le domaine de l'ISSUE d'une résolution (`outcome` de `POST /v1/exceptions/:id/resolve`), lu
        /// dans les effets du back (atelier `11-exceptions-inventaire.md` §3.7 : un fichier:ligne par valeur).</summary>
        public static readonly string[] DomaineIssue =
        {
            "RESOLVED", "ESCALATED", "REPAIRING", "REPAIRING_SLOW", "BRIBE_SUCCEEDED",
            "BRIBE_FAILED", "LAID_LOW", "TAUGHT", "DEFERRED", "DEMOLISHED",
        };

        private static readonly Dictionary<string, string> Issues =
            new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
            {
                { "RESOLVED", "RÉGLÉ" },
                { "ESCALATED", "ARCHIVÉ" },
                { "REPAIRING", "EN RÉPARATION" },       // RATIFIÉ — cadre 17
                { "REPAIRING_SLOW", "RÉPARATION LENTE" },
                { "BRIBE_SUCCEEDED", "ARRANGÉ" },
                { "BRIBE_FAILED", "ÇA S'EST RETOURNÉ" },
                { "LAID_LOW", "PROFIL BAS" },
                { "TAUGHT", "RÈGLE APPRISE" },
                { "DEFERRED", "REMIS À PLUS TARD" },
                { "DEMOLISHED", "RASÉ" },
            };

        /// <summary>Le mot du CACHET d'une issue (`exception_detail.outcome.<valeur>`, servi à `aea5ef7c` ; repli : les mots de
        /// l'atelier §3.7, en capitales comme un cachet). Une issue inconnue rend `Inconnue`, jamais l'enum brut. Pas de
        /// majuscule initiale ici : le mot est déjà en capitales. ⑨ (après le tampon, cadre 17) et ⑩ le partagent.</summary>
        public static string Issue(string outcome)
        {
            if (string.IsNullOrWhiteSpace(outcome)) return Inconnue;
            string valeur = outcome.Trim();
            if (!Issues.TryGetValue(valeur, out string repli)) return Inconnue;
            string mot = MafiaCleanCity.I18n.Libelle.ParValeur("exception_detail", "outcome", valeur, repli);
            return string.IsNullOrWhiteSpace(mot) ? repli : mot.Trim();
        }

        private static readonly Dictionary<string, string> PhrasesApres =
            new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
            {
                { "REPAIRING", "Le bâtiment se remet en marche, avec le temps" },   // RATIFIÉ — cadre 17, à l'octet
                { "REPAIRING_SLOW", "Le bâtiment se remet en marche, lentement — c'est moins cher" },
                { "BRIBE_SUCCEEDED", "La descente n'a pas eu lieu : le bâtiment repart, la chaleur baisse" },
                { "BRIBE_FAILED", "L'argent est parti, et ça s'est retourné : la chaleur monte" },
                { "LAID_LOW", "On se fait oublier : la chaleur retombe, le bâtiment reste touché" },
                { "TAUGHT", "C'est une règle, désormais : la prochaine fois, ça se règle sans vous" },
                { "DEFERRED", "Réparation remise : le bâtiment reste à l'arrêt" },
                { "DEMOLISHED", "Le bâtiment est rasé ; l'îlot est libre" },
                { "ESCALATED", "Archivé : à relire à tête reposée" },
                { "RESOLVED", "C'est réglé, pour cette fois" },
            };

        /// <summary>S03 — l'ENSEIGNE du bâtiment que la carte vise (« Transit Marrek »), ou `null` : pas de bâtiment servi, plusieurs
        /// (le back rend `null`), ou un bâtiment qui n'est plus au joueur (`name_i18n: null`). Jamais un nom deviné. L'enseigne est
        /// NUE (sans article) : c'est aux mots de l'atelier de dire comment elle entre dans une phrase.</summary>
        public static string EnseigneVisee(ExceptionCardDto c)
        {
            if (c == null || c.building == null || string.IsNullOrEmpty(c.building.id)) return null;
            var nom = c.building.name_i18n;
            if (nom == null || string.IsNullOrEmpty(nom.key) || nom.@params == null) return null;
            return string.IsNullOrWhiteSpace(nom.@params.enseigne) ? null : nom.@params.enseigne.Trim();
        }

        /// <summary>S03 — une clé à `{enseigne}` (atelier §3.11, `b761a235`) : la valeur servie si le catalogue la connaît, sinon
        /// le repli fr de l'atelier. L'enseigne entre NUE : ni article ni contraction devant, aucun mot accordé derrière.</summary>
        public static string AvecEnseigne(string cle, string repli, string enseigne) => Gabarit(cle, repli, "enseigne", enseigne);

        /// <summary>UN GABARIT à un paramètre : la valeur servie de `cle` avec `{param}` remplacé, sinon le repli fr (même
        /// remplacement). ⛔ L'ORDRE DES MOTS VIENT DU GABARIT, jamais du code : une concaténation « nom + " " + mot » fige l'ordre
        /// du français et le traducteur ne peut plus le changer.</summary>
        public static string Gabarit(string cle, string repli, string param, string valeur) =>
            // par `Libelle` : le repli se COMPTE (garde « zéro repli ») ; même rendu qu'avant
            MafiaCleanCity.I18n.Libelle.Gabarit(cle, repli, new Dictionary<string, string> { { param, valeur } }).Trim();

        /// <summary>La clé du SEUL libellé servi qui dit « le bâtiment » (« Réparer le bâtiment ») : c'est lui que le nom remplace.
        /// « Réparer tout de suite », « Réparer lentement » ne nomment rien et restent tels quels (atelier §3.11 §2).</summary>
        public const string CleReparerLeBatiment = "exception.raid.repair.label";

        /// <summary>S03 — le libellé d'une action, NOMMÉ quand il dit « le bâtiment » et que la carte vise une enseigne servie :
        /// « Réparer {enseigne} » (`exceptions.bloc.reparer_enseigne`). Sinon le libellé servi, inchangé.</summary>
        public static string LibelleNomme(ExceptionCardDto c, CandidateActionDto a, string libelleServi)
        {
            string e = EnseigneVisee(c);
            if (e == null || a == null || a.label_i18n == null || a.label_i18n.key != CleReparerLeBatiment) return libelleServi;
            return AvecEnseigne("exceptions.bloc.reparer_enseigne", "Réparer {enseigne}", e);
        }

        private static readonly Dictionary<string, string> PhrasesApresNommees =
            new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
            {
                { "REPAIRING", "{enseigne} se remet en marche, avec le temps" },
                { "REPAIRING_SLOW", "{enseigne} se remet en marche, lentement — c’est moins cher" },
                { "DEFERRED", "Réparation remise : {enseigne} reste à l’arrêt" },
            };

        /// <summary>S03 — la phrase de l'après, NOMMÉE (`exceptions.apres.<issue>.enseigne`, atelier §3.11 §3) pour les trois issues
        /// qui disaient « le bâtiment » ; `DEMOLISHED` reste sans nom (le participe prendrait le genre de l'enseigne). Sans enseigne,
        /// la phrase de §3.10.</summary>
        public static string PhraseApres(string outcome, string enseigne)
        {
            if (!string.IsNullOrWhiteSpace(enseigne) && !string.IsNullOrWhiteSpace(outcome)
                && PhrasesApresNommees.TryGetValue(outcome.Trim(), out string repli))
                return AvecEnseigne("exceptions.apres." + MafiaCleanCity.I18n.Libelle.Slug(outcome.Trim()) + ".enseigne", repli, enseigne.Trim());
            return PhraseApres(outcome);
        }

        /// <summary>⑨-6 — la phrase SOUS le cachet de l'après (cadre 17) : `exceptions.apres.<issue>`, une par issue, repli =
        /// les phrases de l'atelier (`11-exceptions-inventaire.md` §3.10 A, `da146da5`) — ce qui s'est PASSÉ, sans genre.
        /// Issue hors domaine ⇒ `null` (pas de phrase), jamais l'enum.</summary>
        public static string PhraseApres(string outcome)
        {
            if (string.IsNullOrWhiteSpace(outcome)) return null;
            string valeur = outcome.Trim();
            if (!PhrasesApres.TryGetValue(valeur, out string repli)) return null;
            string phrase = MafiaCleanCity.I18n.Libelle.ParValeur("exceptions", "apres", valeur, repli);
            return string.IsNullOrWhiteSpace(phrase) ? repli : phrase.Trim();
        }

        /// <summary>⑨-6 — une phrase à COMPTE servie en pluriel ICU à branches exactes écrites en lettres (`=0` … `=6`,
        /// `other` « Plusieurs », jamais `#` — atelier §3.10 B). Le nombre part en paramètre, il n'est jamais affiché.
        /// ⛔ Une valeur servie qui porte un CHIFFRE (l'ancienne forme à `#`) est refusée : un texte suivi ne porte pas de
        /// chiffre isolé (R2.2). Clé absente ou refusée ⇒ le repli du client (le nombre en lettres, composé).</summary>
        public static string CompteEnLettres(string cle, int n, string repli)
        {
            // par `Libelle` (repli null ⇒ null si la clé n'est pas servie, et le repli est COMPTÉ). ⚠️ Une valeur SERVIE refusée pour
            // son chiffre n'est pas un repli au sens de `Libelle` (la clé est servie) : elle n'est pas comptée, et c'est voulu.
            string t = MafiaCleanCity.I18n.Libelle.Gabarit(cle, null,
                new Dictionary<string, string> { { "count", n.ToString(System.Globalization.CultureInfo.InvariantCulture) } });
            if (!string.IsNullOrWhiteSpace(t))
            {
                bool chiffre = false;
                foreach (char ch in t) if (char.IsDigit(ch)) { chiffre = true; break; }
                if (!chiffre) return t.Trim();
            }
            return repli;
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
