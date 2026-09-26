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
        /// <summary>TD-761 fermée (lot i18n du back cc46166d, tutorial-overlay.controller.ts:93-104, 147-148) : les paramètres du
        /// tutoriel préparé — `{ nom }` = le lieutenant de la carte préparée quand `tutorial.exception_card.onboarding_preseed` est
        /// ÉLIGIBLE, sinon `{}`. Toujours présent sur ce back ; ABSENT sur un back antérieur (voir `ParamsDuPreseedServis`).</summary>
        public TutorielParamsDto onboarding_preseed_params;
        /// <summary>Forme G : le champ est-il dans le corps SERVI ? Lu dans le corps brut (`JsonUtility` instancie l'objet imbriqué
        /// même absent : sa présence ne se lit pas sur le DTO). Pas un champ : `JsonUtility` ne le touche pas.</summary>
        public bool ParamsDuPreseedServis { get; set; }
    }
    [Serializable] public class TutorielParamsDto { public string nom; }
    [Serializable] public class TutorielEnvelope { public TutorielPayload payload; }
    [Serializable] public class TutorielPayload { public TutorielData data; }

    [Serializable] public class OptOutData { public bool tutorials_opt_out; }
    [Serializable] public class OptOutEnvelope { public OptOutPayload payload; }
    [Serializable] public class OptOutPayload { public OptOutData data; }
}
