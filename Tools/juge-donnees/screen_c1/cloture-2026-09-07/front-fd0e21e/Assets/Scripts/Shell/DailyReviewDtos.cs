using System;

namespace MafiaCleanCity.Shell
{
    // W3.U1 C8 — wire DTOs for `GET /v1/flag-review` + the 3 verdict/batch routes
    // (`flag-discipline.controller.ts` + `.service.ts:64-98`). `descriptor`/`flag_reason` are typed
    // `unknown` server-side (already-shaped `{key,params}` jsonb, forwarded verbatim) — only `key`
    // is modelled here (R2.2: i18n key + producer text, never a raw score); JsonUtility silently
    // drops any undeclared nested field (e.g. `params`), the SAME documented quirk `ExceptionDtos.cs`
    // already names for this project.

    [Serializable] public class LieutenantRefDto { public string id; public string name; }
    [Serializable] public class FlagDescriptorDto { public string key; }

    [Serializable]
    public class FlagCardDto
    {
        public string flag_id;
        public LieutenantRefDto lieutenant;
        public FlagDescriptorDto descriptor;
        public FlagDescriptorDto flag_reason;
        public int flagged_game_day;
        public string trust_budget_bucket;
    }

    [Serializable]
    public class FlagReviewResponseDto
    {
        public FlagCardDto[] cards;
        public int routine_pending_count;
        public bool batch_confirm_available;
    }
    [Serializable] public class FlagReviewPayload { public FlagReviewResponseDto data; }
    [Serializable] public class FlagReviewEnvelope { public FlagReviewPayload payload; }

    [Serializable] public class FlagVerdictResponseDto { public bool resolved; public string verdict; public bool token_returned; }
    [Serializable] public class FlagVerdictPayload { public FlagVerdictResponseDto data; }
    [Serializable] public class FlagVerdictEnvelope { public FlagVerdictPayload payload; }

    [Serializable] public class BatchConfirmResponseDto { public int batch_confirmed_count; }
    [Serializable] public class BatchConfirmPayload { public BatchConfirmResponseDto data; }
    [Serializable] public class BatchConfirmEnvelope { public BatchConfirmPayload payload; }
}
