using System;

namespace MafiaCleanCity.CitySim.Inspection
{
    // ⑮ LA FILE D'INSPECTION — formes recopiées d'`inspection.projection.service.ts` et
    // d'`inspection.controller.ts`.
    //
    // ⛔ LES DEUX DISTRIBUTIONS SONT DES `Record<K, V>` — que `JsonUtility` ne sait PAS lire. Mais
    // ici, contrairement au `target_ref` de ⑭, **les clés sont des énumérations FERMÉES** : on peut
    // donc les déclarer une par une et la lecture devient exacte. C'est la différence entre une
    // forme libre (indécodable, à ne pas déclarer) et une forme close (décodable, à déclarer en
    // entier). Les valeurs sont recopiées des types du back, pas devinées :
    //   PriorityBucket   = silent | watching | urgent | critical
    //   QueueEntrySource = SCHEDULED | INFORMANT | FALSE_REPORT | GENUINE_REPORT | CASCADE | FORENSIC
    //   PresenceBand     = NONE | SOME | MANY | PREDOMINANT
    // ⚠️ Si le back ajoute un membre à l'une de ces unions, ces classes le PERDRONT en silence.
    // Le détecteur n'est pas le compilateur C# (il ne voit pas le TypeScript) : c'est le contrôle
    // du test de capture, qui asserte que la somme des bandes lues égale le nombre de clés servies.
    // ⛔⛔ CES QUATRE NOMS ONT ÉTÉ FAUX PENDANT UNE CAPTURE ENTIÈRE, ET LE DÉFAUT ÉTAIT MUET.
    // J'avais recopié `silent | watching | urgent | critical` — les valeurs d'un `PriorityBucket`
    // qui existe bel et bien dans ce back, mais **dans un AUTRE module** :
    //   exceptions/exceptions.projection.service.ts  →  'silent' | 'watching' | 'urgent' | 'critical'
    //   citysim/inspection/inspection.repository.ts  →  'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'   ← celui-ci
    // Deux types HOMONYMES aux valeurs DISJOINTES. `JsonUtility` ne lève pas sur des champs qui
    // ne correspondent à rien : il rend des chaînes VIDES, en silence. La capture du 2026-09-02
    // montrait donc quatre bandes de gravité à « — » pendant que celles de provenance rendaient
    // « None / Predominant » — un demi-écran muet, sans une erreur, sans un log.
    // ⇒ *Recopier une valeur d'énumération depuis « le type qui porte ce nom » ne suffit pas : il
    // faut le type que la ROUTE utilise.* Vérifié ici en lisant le corps de `severityDistribution`,
    // qui initialise littéralement `{ LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0 }`.
    // ★ Et c'est un asymétrique révélateur : les deux Record du MÊME corps de réponse, l'un décodé
    // l'autre pas. Un écran entièrement muet se remarque ; un écran à moitié muet passe.
    [Serializable] public class BandesSeverite
    {
        public string LOW;
        public string MEDIUM;
        public string HIGH;
        public string CRITICAL;
    }

    [Serializable] public class BandesSource
    {
        public string SCHEDULED;
        public string INFORMANT;
        public string FALSE_REPORT;
        public string GENUINE_REPORT;
        public string CASCADE;
        public string FORENSIC;
    }

    [Serializable] public class FileData
    {
        public string district;
        public string queue_load;          // EMPTY | LIGHT | MODERATE | HEAVY | SATURATED
        public string dispatcher_regime;   // NOMINAL | BACKLOGGED | BUDGET_CUT | SURGE
        public BandesSeverite severity_distribution;
        public BandesSource type_distribution;
    }
    [Serializable] public class FileEnvelope { public FilePayload payload; }
    [Serializable] public class FilePayload { public FileData data; }

    [Serializable] public class RapportData
    {
        public string report_id;
        public string entry_type;          // FALSE_REPORT | GENUINE_REPORT
        public int cost_resolved;
        public bool backlash_triggered;    // ★ le retour de bâton — un FRONT, pas une route
    }
    [Serializable] public class RapportEnvelope { public RapportPayload payload; }
    [Serializable] public class RapportPayload { public RapportData data; }
}
