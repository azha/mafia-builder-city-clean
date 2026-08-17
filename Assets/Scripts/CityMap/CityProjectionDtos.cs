using System;
using System.Collections.Generic;
using UnityEngine;

namespace MafiaCleanCity.CityMap
{
    // ---------------------------------------------------------------------
    // Wire DTOs for the JWT-gated per-district system projections that feed the
    // district detail panel. Field names are snake_case to match JsonUtility.
    // Each shape was captured verbatim from the live API (no guessing).
    //
    // Endpoints (all require a Bearer token):
    //   flow         GET /v1/city/district/:id/flow         { district_id, backpressure }
    //   throughput   GET /v1/city/district/:id/throughput   { district, exposure_band, network_cleanliness, nodes[] }
    //   stash        GET /v1/city/district/:id/stash        { district, district_blocking_band, any_high_blocking_alert, safehouses[] }
    //   buffer       GET /v1/city/district/:id/buffer       { district, district_load_band, district_tail_band, any_overflow, ... }
    //   unconformity GET /v1/city/district/:id/unconformity { district, audit_pin_presence, buildings[] }
    //   leks         GET /v1/city/district/:id/leks         { district, leks[] }
    //   cohesion     GET /v1/city/district/:id/cohesion     { district, cohesion_state, permanent_marginal }  (404 until nightly tick)
    //   belief       GET /v1/city/precinct/:id/belief       { precinct, belief }   (precinct = ⌊(d-1)/3⌋+1, max 6)
    //   whisper      GET /v1/city/citizens/whisper          { whisper_index, whisper_state_distribution }
    // ---------------------------------------------------------------------

    [Serializable] public class FlowDto { public int district_id; public string backpressure; }
    [Serializable] public class FlowEnvelope { public FlowPayload payload; }
    [Serializable] public class FlowPayload { public FlowDto data; }

    [Serializable] public class ThroughputDto { public string district; public string exposure_band; public string network_cleanliness; }
    [Serializable] public class ThroughputEnvelope { public ThroughputPayload payload; }
    [Serializable] public class ThroughputPayload { public ThroughputDto data; }

    [Serializable] public class StashDto { public string district; public string district_blocking_band; public bool any_high_blocking_alert; }
    [Serializable] public class StashEnvelope { public StashPayload payload; }
    [Serializable] public class StashPayload { public StashDto data; }

    [Serializable] public class BufferDto { public string district; public string district_load_band; public string district_tail_band; public bool any_overflow; }
    [Serializable] public class BufferEnvelope { public BufferPayload payload; }
    [Serializable] public class BufferPayload { public BufferDto data; }

    [Serializable] public class UnconformityDto { public string district; public string audit_pin_presence; }
    [Serializable] public class UnconformityEnvelope { public UnconformityPayload payload; }
    [Serializable] public class UnconformityPayload { public UnconformityDto data; }

    [Serializable] public class LekEntryDto { public int tile; public string control_state; }
    [Serializable] public class LeksDto { public string district; public List<LekEntryDto> leks; }
    [Serializable] public class LeksEnvelope { public LeksPayload payload; }
    [Serializable] public class LeksPayload { public LeksDto data; }

    [Serializable] public class CohesionDto { public string district; public string cohesion_state; public bool permanent_marginal; }
    [Serializable] public class CohesionEnvelope { public CohesionPayload payload; }
    [Serializable] public class CohesionPayload { public CohesionDto data; }

    [Serializable] public class BeliefDto { public string precinct; public string belief; }
    [Serializable] public class BeliefEnvelope { public BeliefPayload payload; }
    [Serializable] public class BeliefPayload { public BeliefDto data; }

    [Serializable] public class WhisperDto { public string whisper_index; }
    [Serializable] public class WhisperEnvelope { public WhisperPayload payload; }
    [Serializable] public class WhisperPayload { public WhisperDto data; }

    // inspection  GET /v1/city/district/:id/inspection { district, queue_load, dispatcher_regime, ... }  (404 until 12h tick)
    [Serializable] public class InspectionDto { public string district; public string queue_load; public string dispatcher_regime; }
    [Serializable] public class InspectionEnvelope { public InspectionPayload payload; }
    [Serializable] public class InspectionPayload { public InspectionDto data; }

    // interior  GET /v1/city/district/:id/interior — W3.U2 C7 (design D1/D2, U-7): the district-
    // interior diorama's own payload. { district, district_id, profile, name_canonical, bank_side,
    // grid, blocks[], day_phase, buildings[] }. R2.2: every building-level field is a closed band
    // string or a boolean EXCEPT block_id/building (geography/identity, D1 §1.4 — hors P5). Binding 5
    // here carries ONLY lapse_phase_bucket + maintenance_in_progress (district-interior.controller.ts's
    // DistrictInteriorBuildingResponse) — the THIRD maintenance key, days_until_maintenance_due, lives
    // on the SEPARATE building-card route/DTO only (D7, U-8 — BuildingCardDtos.cs, not this file).
    [Serializable]
    public class DistrictInteriorBlockDto
    {
        public int block_id;
        public int x;
        public int y;
    }

    [Serializable]
    public class DistrictInteriorGridDto
    {
        public int width;
        public int height;
    }

    [Serializable]
    public class DistrictInteriorBuildingDto
    {
        public string building;              // uuid identity
        public int block_id;                 // jointure vers blocks[] — géographie
        public string operational_type;      // 12 membres back, "" si non converti
        public string conversion_band;       // NOT_CONVERTED | IN_SETUP | OPERATIONAL
        public string shell_state;           // STANDING | GONE
        public string condition_band;        // SOUND | DAMAGED | REPAIRING | FAILED
        public string revenue_band;          // IDLE | EARNING
        public string revenue_chain;         // WIRED | UNWIRED
        public string activity_band;         // IDLE | ACTIVE
        public string lapse_phase_bucket;    // WITHIN_WINDOW | SOFT | HARD | CRITICAL — binding 5
        public bool maintenance_in_progress; // binding 5
        // D10/§C2-bis (B-7, W3.U2 C10 amendé) — poignées de ressources possédées (JAMAIS un scalaire
        // brut, R2.2), [] si aucun lieutenant affecté, jamais null côté back. REUSE du patron
        // `string[]` déjà établi par BuildingCardDtos.available_vehicles (même fichier de famille,
        // JsonUtility gère un tableau de primitives EN CHAMP d'une classe — seul un tableau EN RACINE
        // exigerait un wrapper).
        public string[] lieutenant_ids;      // trié par lieutenant_id côté back — ordre stable
    }

    [Serializable]
    public class DistrictInteriorDto
    {
        public string district;       // "district-N" — REUSE heat.projection.service.ts's convention
        public int district_id;
        public string profile;        // 6 membres — la clé de jointure des sous-teintes (DA)
        public string name_canonical;
        public string bank_side;
        public DistrictInteriorGridDto grid;
        public DistrictInteriorBlockDto[] blocks;
        public string day_phase;      // DAWN | DAY | DUSK | NIGHT — D8, engagement 1
        public DistrictInteriorBuildingDto[] buildings;
    }

    [Serializable] public class DistrictInteriorPayload { public DistrictInteriorDto data; }
    [Serializable] public class DistrictInteriorEnvelope { public DistrictInteriorPayload payload; }

    // patrol  GET /v1/city/precinct/:id/patrol { precinct, patrol_heat }  (404 until ticked)
    [Serializable] public class PatrolDto { public string precinct; public string patrol_heat; }
    [Serializable] public class PatrolEnvelope { public PatrolPayload payload; }
    [Serializable] public class PatrolPayload { public PatrolDto data; }

    // ---------------------------------------------------------------------
    // Detail-panel view model. Each projection contributes one or more rows;
    // a gated projection (HTTP 404 — "sim has not ticked …") contributes a row
    // with available=false so the panel honestly shows it's not yet computed.
    // ---------------------------------------------------------------------

    public class DetailRow
    {
        public string label;
        public string value;
        public bool available;
        public bool useAccent;
        public Color accent;

        public DetailRow(string label, string value, bool available = true, bool useAccent = false, Color accent = default)
        {
            this.label = label;
            this.value = value;
            this.available = available;
            this.useAccent = useAccent;
            this.accent = accent;
        }
    }

    public class DistrictDetail
    {
        public int districtId;
        public string title;
        public readonly List<DetailRow> rows = new List<DetailRow>();
    }
}
