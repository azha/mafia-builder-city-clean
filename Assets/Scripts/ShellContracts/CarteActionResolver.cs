using System.Collections.Generic;

namespace MafiaCleanCity.Shell
{
    // Icônes d'action sur la carte — ruling user 2026-09-07 : « des icônes qui apparaissent sur la
    // carte pour "récolter", comme les jeux de simulation de villes ». Lieu UNIQUE de la
    // correspondance domaine → action, dans `ShellContracts` comme `HeatBucketResolver` et
    // `WalletBandResolver`.
    //
    // ⛔ POURQUOI UN RÉSOLVEUR ET PAS UN `switch` DE CONTRÔLEUR. Une correspondance portée par un
    // `switch` ou par l'ordre d'un tableau n'a AUCUNE forme exécutable à asserter : une garde
    // d'ensemble ne peut pas mordre dessus. Ce dépôt l'a déjà payé (trois mappings « bucket de
    // chaleur → apparence » coexistants, dont un dans des commentaires sur un tableau positionnel).
    //
    // ⛔⛔ LE PIÈGE QUE CE FICHIER EXISTE POUR NE PAS REPRODUIRE — mesuré le 2026-09-07.
    // `activity_band` du district vaut `IDLE | ACTIVE`, et `IDLE` confond DEUX mondes :
    //   • un labo sans cuisson, une serre sans pousse, un spot sans dealer  → À L'ARRÊT, relançable
    //   • un bureau, une planque, une cache, un hub, un coffre              → AUCUNE activité par nature
    // Dessiner « relance-moi » sur tout `IDLE` collerait un badge sur des bâtiments qu'on ne peut
    // pas relancer. *Une icône qui invite à une action impossible est pire qu'une icône absente* :
    // elle envoie le joueur cliquer dans le vide et casse la confiance dans toute la carte.
    // ⇒ RELANCER est donc une CONJONCTION : la bande ET le type.
    // ⚠️ Et il y a TROIS bandes qui portent la valeur `IDLE` dans ce back — `activity_band` du
    //    district, `activity_band` du dealer (qui vaut `WORKING | IDLE | ABSENT`, un AUTRE domaine)
    //    et `revenue_band` (`IDLE | EARNING`). Ne jamais résoudre sur la valeur seule.
    //
    // ⛔ TON : ce ne sont pas des reproches. Le ruling user est que « ça plafonne et ça BLOQUE,
    // rien n'est perdu » — donc une icône est un DÉBLOQUEUR qui attend, jamais un compte à rebours
    // anxiogène. `Aucune` est l'état normal d'un bâtiment qui travaille.
    //
    // ⚠️ DETTE ASSUMÉE, avec son détecteur (voir `CarteActionsPlayModeTests`) : la liste des types
    // relançables vit CÔTÉ BACK (`district-interior.projection.service.ts`, `activityBand`) et elle
    // est DUPLIQUÉE ici. Le jour où le back ajoute un type, rien ne compile en rouge — c'est un
    // changement de DONNÉE, pas de type, et une `switch` expression C# ne rend qu'un avertissement
    // CS8509 (0 dans tout `Assets/Scripts`). Le détecteur est donc une assertion de PARCOURS sur
    // l'ENSEMBLE des `operational_type` réellement projetés, avec garde anti-vacuité.
    // La réparation propre est un `relance_band` projeté par le back (demandé le 2026-09-07).
    public static class CarteActionResolver
    {
        public enum Action
        {
            // ⛔ Repli NOMMÉ, jamais une action réelle : un type inconnu ne doit pas se déguiser en
            //    « rien à faire ». C'est le patron de `HeatBucketResolver.Rank.Unknown`.
            Inconnu = -1,
            Aucune = 0,
            Reparer = 1,
            Relancer = 2,
        }

        /// <summary>Les 12 membres de l'enum `building_operational_type`, lus EN BASE le 2026-09-07
        /// (`pg_enum`), pas recopiés d'un document. Le détecteur asserte que l'ensemble projeté y
        /// est inclus.</summary>
        // ⚠️ Le champ est un `HashSet` (recherche O(1) ET `Contains` disponible) ; l'exposition
        //    publique passe par une propriété en lecture seule. Déclarer le CHAMP en
        //    `IReadOnlyCollection` privait le résolveur lui-même de `Contains` — erreur de
        //    compilation attrapée au premier run, pas en revue.
        private static readonly HashSet<string> Connus = new HashSet<string>
        {
            "front_shop", "cash_safehouse", "stash", "lab", "grow_house", "refinery",
            "press_house", "distribution_hub", "office", "dealer_spot_front",
            "money_holding", "specialized_lab",
        };

        public static IReadOnlyCollection<string> TypesConnus => Connus;

        /// <summary>Les types qui ont une activité qu'on peut RELANCER. Miroir exact des branches
        /// du `activityBand` du back qui consultent un état (cook / grow / dealer) — les six autres
        /// y retournent `IDLE` inconditionnellement, donc leur `IDLE` ne veut pas dire « arrêté ».</summary>
        private static readonly HashSet<string> Relancables = new HashSet<string>
        {
            "lab", "refinery", "specialized_lab", "press_house", "grow_house", "dealer_spot_front",
        };

        public static IReadOnlyCollection<string> TypesRelancables => Relancables;

        /// <summary>Résout l'action que la carte doit proposer sur un bâtiment.
        /// RÉPARER passe devant RELANCER : un bâtiment abîmé qu'on relance reste abîmé.</summary>
        public static Action Resoudre(
            string operationalType,
            string activityBand,
            string conditionBand,
            string lapsePhaseBucket,
            bool maintenanceInProgress)
        {
            if (string.IsNullOrEmpty(operationalType) || !Connus.Contains(operationalType))
                return Action.Inconnu;

            // ⚠️ `REPAIRING` n'est PAS une invite : c'est déjà en cours. Et `maintenance_in_progress`
            //    dit la même chose par un autre champ — les deux doivent taire l'icône, sinon on
            //    demande au joueur de lancer ce qui tourne déjà.
            if (maintenanceInProgress || conditionBand == "REPAIRING")
                return Action.Aucune;

            // `SOUND` est sain, `WITHIN_WINDOW` est dans les clous : ni l'un ni l'autre n'appelle.
            bool abime = conditionBand == "DAMAGED" || conditionBand == "FAILED";
            bool derive = lapsePhaseBucket == "SOFT" || lapsePhaseBucket == "HARD"
                       || lapsePhaseBucket == "CRITICAL";
            if (abime || derive) return Action.Reparer;

            // ⛔ LA CONJONCTION. `IDLE` seul ne suffit pas — voir l'en-tête.
            if (activityBand == "IDLE" && Relancables.Contains(operationalType))
                return Action.Relancer;

            return Action.Aucune;
        }
    }
}
