using System;

namespace MafiaCleanCity.CitySim.Precinct
{
    // ⑰ LE COMMISSARIAT — formes recopiées de `police_memory.projection.service.ts` et
    // `patrol.projection.service.ts`. Deux projections MINUSCULES : deux champs chacune, et
    // c'est tout ce que le back sert sur un precinct.
    [Serializable] public class CroyanceData
    {
        public string precinct;
        public string belief;        // DORMANT | WATCHFUL | SUSPICIOUS | HUNTING
    }
    [Serializable] public class CroyanceEnvelope { public CroyancePayload payload; }
    [Serializable] public class CroyancePayload { public CroyanceData data; }

    [Serializable] public class PatrouilleData
    {
        public string precinct;
        public string patrol_heat;   // QUIET | LOW | MEDIUM | HIGH
    }
    [Serializable] public class PatrouilleEnvelope { public PatrouillePayload payload; }
    [Serializable] public class PatrouillePayload { public PatrouilleData data; }
}
