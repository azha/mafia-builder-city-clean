using System;
using UnityEngine;

namespace MafiaCleanCity.Operational
{
    // ---------------------------------------------------------------------
    // Wire DTOs for the Phase-2 operational Laundering Pipeline surface
    // (screen_6 / screen_6a — the Stage-1 front-shop node). Field names are
    // snake_case to match JsonUtility. Every shape was captured verbatim from
    // the live dev stack (Tools/OPERATIONAL_CONTRACTS.md §7 laundering node +
    // §8 inject action) — no guessing (the T14 lesson).
    //
    // R2.2 (information asymmetry): the laundering projection returns ONLY a
    // qualitative cleanliness band STRING, a BOOLEAN deviation flag, and a uuid
    // identity STRING — NEVER a raw scalar (no buffered cents / dwell ticks /
    // cleanliness float). These DTOs model exactly those; nothing numeric leaks.
    // ---------------------------------------------------------------------

    // GET /v1/operational/laundering/:nodeId
    //   { node, cleanliness_band, deviation_active }
    [Serializable]
    public class LaunderingNodeDto
    {
        public string node;              // uuid identity (the Stage-1 laundering node)
        public string cleanliness_band;  // DIRTY | PARTIAL | MOSTLY_CLEAN | CLEAN (System 8's CleanlinessBucket)
        public bool deviation_active;    // the host front-shop's AUDIT_PIN_ACTIVE (deviation/audit badge)
    }

    [Serializable] public class LaunderingNodeEnvelope { public LaunderingNodePayload payload; }
    [Serializable] public class LaunderingNodePayload { public LaunderingNodeDto data; }

    // GET /v1/operational/laundering/:nodeId/pipeline  (Phase-2b MULTI-NODE overview, screen_6)
    //   { stages: [ { node, cleanliness_band, terminal, has_cash }, … ] }
    // The ordered chain head→tail (Stage1→2→3→4). Each stage carries a stage_index-derived cleanliness
    // BAND that RISES per stage (PARTIAL→MOSTLY_CLEAN→…→CLEAN), a terminal flag, and a has_cash presence
    // flag — qualitative bands + booleans + uuid identity ONLY (R2.2; no raw cents/float/length-int leaks).
    [Serializable]
    public class LaunderingStageDto
    {
        public string node;             // uuid identity (this stage's laundering node)
        public string cleanliness_band; // DIRTY | PARTIAL | MOSTLY_CLEAN | CLEAN (stage_index-derived; rises per stage)
        public bool terminal;           // true for the chain's terminal/release stage (no outgoing edge → credits the wallet)
        public bool has_cash;           // presence flag — whether cash is buffered at this stage (never the raw cents)
    }

    [Serializable]
    public class LaunderingPipelineDto
    {
        public LaunderingStageDto[] stages; // ordered head→tail (by stage_index)
    }

    /// <summary>La liste des nœuds du joueur. Corps mesuré le 2026-09-03 : `{"nodes":[]}` sur un
    /// compte frais — le tableau est VIDE, pas absent.
    /// ⚠️ Les éléments sont déclarés en `string` : je n'ai vu que le tableau vide, donc je ne
    /// connais pas la forme d'un nœud dans CETTE réponse. La déclarer d'après `LaunderingNodeDto`
    /// serait une supposition — deux routes voisines n'ont pas forcément la même projection.</summary>
    [Serializable]
    public class LaunderingNodesDto
    {
        public string[] nodes;
    }

    [Serializable] public class LaunderingNodesPayload { public LaunderingNodesDto data; }
    [Serializable] public class LaunderingNodesEnvelope { public LaunderingNodesPayload payload; }

    [Serializable] public class LaunderingPipelineEnvelope { public LaunderingPipelinePayload payload; }
    [Serializable] public class LaunderingPipelinePayload { public LaunderingPipelineDto data; }

    // ----- Collect action: ferries a dealer float into the cash-safehouse so the
    //       front-shop has dirty cash to launder. Used by the screen's E2E to put a
    //       genuine balance into the safehouse before an Inject (the terminal seed
    //       state leaves the safehouse empty). -----

    // POST /v1/operational/dealer/:id/collect  { safehouse_id }
    [Serializable]
    public class CollectRequestDto
    {
        public string safehouse_id;
    }

    // collect → { dealer_id, safehouse_id } (ids only — never the raw cents moved; R2.2)
    [Serializable]
    public class CollectResultDto
    {
        public string dealer_id;
        public string safehouse_id;
    }
    [Serializable] public class CollectEnvelope { public CollectResultPayload payload; }
    [Serializable] public class CollectResultPayload { public CollectResultDto data; }

    // NOTE: the InjectRequestDto + InjectResultDto / InjectEnvelope are already declared
    // alongside the Building Card DTOs (BuildingCardDtos.cs) — the front-shop Inject action
    // is shared across the Building Card and the Laundering Pipeline screens. This file does
    // NOT re-declare them (one canonical shape per the contract).
}
