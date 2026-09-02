using System;

namespace MafiaCleanCity.CoreLoops.Compression
{
    // ⑭ LA SEMAINE DE COMPRESSION — formes RECOPIÉES de `compression-board.service.ts`
    // (`BoardEntryView`, `BoardView`, `DecideOutcome`) et de `compression-projection.controller.ts`.
    [Serializable] public class ProblemeDto
    {
        public string id;
        public string source_kind;
        public string tier;
        public bool addressed;
        // ⚠️ `target_ref` est un `Record<string, unknown>` côté back — une forme LIBRE. JsonUtility
        // ne sait pas la lire, et prétendre le contraire produirait un champ nul silencieux. On ne
        // la déclare donc PAS : l'écran désigne le problème par son genre et son palier, jamais
        // par une cible qu'il ne peut pas décoder.
    }

    [Serializable] public class BoardData
    {
        public ProblemeDto[] entries;
        public int decisions_used;
        public int decisions_remaining;
    }
    [Serializable] public class BoardEnvelope { public BoardPayload payload; }
    [Serializable] public class BoardPayload { public BoardData data; }

    [Serializable] public class EtatData
    {
        public string stress_bucket;
        public string week_state;
        public bool deferral_available;
    }
    [Serializable] public class EtatEnvelope { public EtatPayload payload; }
    [Serializable] public class EtatPayload { public EtatData data; }

    [Serializable] public class DecisionData
    {
        public string choice;
        public int decisions_used;
        public int decisions_remaining;
        public bool revealed_secondary;
        public bool finalized;
    }
    [Serializable] public class DecisionEnvelope { public DecisionPayload payload; }
    [Serializable] public class DecisionPayload { public DecisionData data; }
}
