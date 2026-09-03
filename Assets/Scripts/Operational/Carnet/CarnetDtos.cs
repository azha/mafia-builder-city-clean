using System;

namespace MafiaCleanCity.Operational
{
    /// <summary>Le carnet du soir. Corps MESURÉ le 2026-09-03 sur un compte frais :
    ///   `{"cue_stack_id":null,"state":null,"committed_at":null,"slots":[]}`
    /// ⚠️ Les quatre champs arrivent NULS ou VIDES : le carnet existe comme concept, pas encore
    /// comme objet. Déclarés quand même — un champ absent du DTO est jeté en silence par
    /// `JsonUtility`, et c'est ainsi qu'on ne voit jamais arriver une donnée.
    /// ⚠️ `slots` est déclaré `string[]` : je n'ai vu QUE le tableau vide, donc la forme d'un
    /// créneau n'est pas mesurable aujourd'hui. La déduire de la maquette (titre + sous-titre)
    /// ferait passer un dessin pour un contrat.</summary>
    [Serializable]
    public class CarnetCourantDto
    {
        public string cue_stack_id;
        public string state;
        public string committed_at;
        public string[] slots;
    }

    [Serializable] public class CarnetCourantPayload { public CarnetCourantDto data; }
    [Serializable] public class CarnetCourantEnvelope { public CarnetCourantPayload payload; }

    /// <summary>Les soirées mises de côté (m-89). ⛔ JAMAIS REÇUE : la route rend 403 sur un
    /// compte frais. Le DTO existe pour le jour où le palier 2 est atteint ; sa forme n'est PAS
    /// mesurée, et le tableau reste en `string[]` pour cette raison.</summary>
    [Serializable]
    public class SuitesNommeesDto
    {
        public string[] sequences;
    }

    [Serializable] public class SuitesNommeesPayload { public SuitesNommeesDto data; }
    [Serializable] public class SuitesNommeesEnvelope { public SuitesNommeesPayload payload; }
}
