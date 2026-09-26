using System;

namespace MafiaCleanCity.Operational
{
    /// <summary>Le carnet du soir. Corps MESURÉ le 2026-09-03 sur un compte frais :
    ///   `{"cue_stack_id":null,"state":null,"committed_at":null,"slots":[]}`
    /// ⚠️ Les quatre champs arrivent NULS ou VIDES : le carnet existe comme concept, pas encore
    /// comme objet. Déclarés quand même — un champ absent du DTO est jeté en silence par
    /// `JsonUtility`, et c'est ainsi qu'on ne voit jamais arriver une donnée.
    /// ⛔ `slots` était déclaré `string[]` (seul le tableau vide avait été vu) : ce sont des OBJETS — `CueStackView.toView`
    /// (cue-stack.service.ts:323-357 @1ffb08b4), lu à la source pour ㉞ le 26/09.</summary>
    [Serializable]
    public class CarnetCourantDto
    {
        public string cue_stack_id;
        public string state;
        public string committed_at;
        public CueSlotDto[] slots;
    }

    [Serializable] public class CueCibleDto { public string kind; public string id; }   // route | building | candidate

    /// <summary>Un créneau SERVI (toView) : les champs du composeur, puis l'état d'exécution en bandes.</summary>
    [Serializable]
    public class CueSlotDto
    {
        public string slot_id;
        public string slot_type;
        public CueCibleDto target_ref;
        public string[] dependencies;
        public int drag_order;
        public string status;
        public string estimated_time_bucket;
        public string prerequisite_satisfaction_bucket;
        public string dependency_conflict_bucket;
    }

    /// <summary>`POST cue-stack/compose` — UNIQUEMENT les 5 champs d'un créneau (le back rejette les champs inconnus).</summary>
    [Serializable]
    public class CueSlotComposeDto
    {
        public string slot_id;
        public string slot_type;
        public CueCibleDto target_ref;
        public string[] dependencies;
        public int drag_order;
    }
    [Serializable] public class CueStackComposeDto { public CueSlotComposeDto[] slots; }
    /// <summary>`POST cue-stack/commit` — seul le littéral `true` acquitte (cue-stack.controller.ts:118) ; `false` = sans acquittement.</summary>
    [Serializable] public class CueStackCommitDto { public bool acknowledge_compounding; }

    /// <summary>`GET /v1/operational/routes` — les itinéraires SAUVÉS du joueur (route.service.ts:227, lignes brutes).</summary>
    [Serializable] public class RouteSauveeDto { public string route_id; public string route_name; public string destination_building_id; public bool is_saved; }
    [Serializable] public class RoutesSauveesData { public RouteSauveeDto[] routes; }
    [Serializable] public class RoutesSauveesPayload { public RoutesSauveesData data; }
    [Serializable] public class RoutesSauveesEnvelope { public RoutesSauveesPayload payload; }

    /// <summary>`GET /v1/recruitment/candidates` — les candidats `available` (recruitment.repository.ts:165, lignes brutes). ⛔ `profile.name`
    /// (« Civilian Prospect ») est un placeholder ANGLAIS (TD-046) : jamais lu — le nom vient de la table 83 (pool / rival).</summary>
    [Serializable] public class ProfilDeCandidatDto { public string district_familiarity; public string experience; public string ask_band; }
    [Serializable] public class CandidatDto { public string candidate_id; public string pool; public string source_rival_key; public string status; public ProfilDeCandidatDto profile; }
    [Serializable] public class CandidatsData { public CandidatDto[] candidates; }
    [Serializable] public class CandidatsPayload { public CandidatsData data; }
    [Serializable] public class CandidatsEnvelope { public CandidatsPayload payload; }

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
    // C8 (passe UX 2026-09-24) — `GET /v1/political-events/calendar`, route JOUEUR publique (political.controller.ts:37, e40f4142),
    // mesurée 200 sur un compte neuf (corps/079 de la passe). Clés camelCase telles que servies. Les `name` sont des littéraux ANGLAIS
    // sans clé (K2, routé au back) : le client les keye par `eventId` (`Libelle.ParValeur`), le nom servi en repli.
    [Serializable] public class EvenementPolitiqueDto { public string eventId; public string name; public string category; public int scheduledGameDay; }
    [Serializable] public class CalendrierPolitiqueDto
    {
        public string politicalClimate;                 // silent | minor | major | dramatic
        public EvenementPolitiqueDto[] active;          // en cours
        public EvenementPolitiqueDto[] upcoming;        // annoncés (les 3 événements du calendrier)
        public EvenementPolitiqueDto[] recentlyEnded;   // non montré (m-91 : « seulement ce qui est en cours et ce qui est annoncé »)
    }
    [Serializable] public class CalendrierPolitiquePayload { public CalendrierPolitiqueDto data; }
    [Serializable] public class CalendrierPolitiqueEnvelope { public CalendrierPolitiquePayload payload; }
}
