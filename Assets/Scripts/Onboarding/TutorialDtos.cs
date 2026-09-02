using System;

namespace MafiaCleanCity.Onboarding
{
    // ㉕ LA PREMIÈRE FOIS — formes recopiées de `tutorial-overlay.service.ts`,
    // `onboarding-overlay.resolver.ts` et `disclosure-schedule.service.ts`. La route rend une
    // INTERSECTION des trois : les quatre champs arrivent à plat dans le même objet.
    [Serializable] public class TutorielData
    {
        public bool tutorials_opt_out;
        public string[] shown_tutorial_ids;
        public string[] eligible_tutorial_ids;
        public string next_tutorial_id;      // peut être null côté serveur → chaîne vide ici
    }
    [Serializable] public class TutorielEnvelope { public TutorielPayload payload; }
    [Serializable] public class TutorielPayload { public TutorielData data; }

    [Serializable] public class OptOutData { public bool tutorials_opt_out; }
    [Serializable] public class OptOutEnvelope { public OptOutPayload payload; }
    [Serializable] public class OptOutPayload { public OptOutData data; }
}
