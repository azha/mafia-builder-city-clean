using System;

namespace MafiaCleanCity.Operational.Autonomy
{
    // IMPLEMENTS: spec §4-T3 — wire DTOs for the Autonomy Inbox surface (P21 backend). snake_case to match
    // JsonUtility ↔ the NestJS contracts (services/game-back/src/autonomy). Mirror ExceptionDtos.cs idiom.
    //
    // JsonUtility quirks the render code MUST honor:
    //   - a missing/null JSON string deserializes as "" (never null) → decided non-empty: !string.IsNullOrEmpty(decided)
    //   - a missing nested [Serializable] object deserializes as a DEFAULT INSTANCE (never null)
    //
    // budget_bands is a JSON map (not a [Serializable] struct) — extracted via per-key regex in AutonomyClient.

    [Serializable] public class AutonomyOptionDto { public string label_key; public string effect_kind; public string projected_outcome; }
    [Serializable] public class AutonomyIssueDto {
        public string issue_id; public string category; public string refused_action;
        public string decided;                 // "A" | "B" | "" (JsonUtility: null → "")
        public AutonomyOptionDto option_a; public AutonomyOptionDto option_b;
    }
    [Serializable] public class AutonomyReportDto {
        public string report_id; public string lieutenant_id;
        public int backlog_age_cycles;         // legible count (canon) — rendered as CHROME only
        public AutonomyIssueDto[] issues;
    }
    [Serializable] public class AutonomyReportsData { public AutonomyReportDto[] reports; }
    [Serializable] public class AutonomyReportsPayload { public AutonomyReportsData data; }
    [Serializable] public class AutonomyReportsEnvelope { public AutonomyReportsPayload payload; }

    // POST /v1/autonomy-reports/{reportId}/issues/{issueId}/resolve { chosen } → { resolved: true, outcome }.
    [Serializable] public class ResolveIssueRequest { public string chosen; }
    [Serializable] public class ResolveIssueResponse { public bool resolved; public string outcome; }
    [Serializable] public class ResolveIssuePayload { public ResolveIssueResponse data; }
    [Serializable] public class ResolveIssueEnvelope { public ResolveIssuePayload payload; }

    // POST /v1/lieutenants/{id}/autonomy/decision { kind } → { applied: true }.
    [Serializable] public class DecisionRequest { public string kind; }
    [Serializable] public class DecisionResponse { public bool applied; }
    [Serializable] public class DecisionPayload { public DecisionResponse data; }
    [Serializable] public class DecisionEnvelope { public DecisionPayload payload; }
}
