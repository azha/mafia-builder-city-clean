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
