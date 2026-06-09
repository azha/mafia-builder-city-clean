using System;
using System.Collections;
using System.Text;
using UnityEngine;
using UnityEngine.Networking;

namespace MafiaCleanCity.Operational.Lieutenant
{
    // Phase-9 vector #9 — the lieutenant rule-editor HTTP client (COOK loop, screen_4a).
    //
    // A UnityWebRequest wrapper over the PLAYER-FACING lieutenant contracts
    // (services/game-back/src/operational/lieutenant/lieutenant.controller.ts):
    //   - POST /v1/lieutenants                         → recruit a lieutenant (T1, this task)
    //   - GET  /v1/lieutenants/:id                     → the qualitative band projection (T2)
    //   - POST /v1/lieutenants/:id/behavior-script/validate → DSL dry-run (T3)
    //   - POST /v1/lieutenants/:id/behavior-script     → attach DSL source (T3)
    //
    // Mirrors MafiaCleanCity.Operational.BuildingCardClient exactly: a coroutine per call,
    // concrete-envelope JsonUtility parsing of `payload.data`, a UUID-v4 `Idempotency-Key`
    // on every POST (the backend rejects any other shape with 400), and a `ReadableError`
    // that surfaces the error envelope's human `message` to the UI — never a raw HTTP code
    // (F2). No mock — every call hits the live dockerized stack (Traefik).
    //
    // R2.2 (information asymmetry): the lieutenant projection (T2) returns qualitative band
    // STRINGS + the player-authored script_source; the recruit/attach/validate POSTs return
    // ids / booleans. Nothing numeric leaks. The 422 VALIDATION_FAILED error additionally
    // carries `details: DslDiagnostic[]` (line/col/message/kind) — the client RENDERS those
    // diagnostics (T3); it never re-implements parse/compile (the backend is authoritative).
    public class LieutenantClient
    {
        public string BaseUrl = "http://localhost";
        public int TimeoutSeconds = 10;

        // POST /v1/lieutenants ; GET/POST /v1/lieutenants/:id[/behavior-script[/validate]]
        private string Url(string leaf) => $"{BaseUrl.TrimEnd('/')}/v1/lieutenants{leaf}";

        // ------------------------------------------------------------- recruit (T1)

        /// <summary>
        /// POST /v1/lieutenants { archetype, assigned_building_id, target_building_id? } — recruit a lieutenant of a
        /// SUPPORTED archetype on a player-owned operational building. 201 { lieutenant_id }. An unsupported archetype →
        /// 422; the building not owned/operational → 404; the wrong building type for the archetype → 409; roster cap → 409
        /// (well-formed errors mapped to a readable msg). `targetBuildingId` is the LOGISTICS dispatch destination — it is
        /// included in the body ONLY when non-null/non-empty (COOK/SECURITY/BOOKKEEPER ignore it; omit it). onOk(id) on
        /// 2xx with the parsed lieutenant_id; onErr(code, message) on anything else.
        /// </summary>
        public IEnumerator Recruit(string archetype, string assignedBuildingId, string targetBuildingId,
            string bearer, Action<string> onOk, Action<long, string> onErr)
        {
            // Build the request body. target_building_id is OMITTED entirely when null/empty (the COOK loop never sends
            // it) — JsonUtility cannot conditionally drop a field, so we pick the with/without-target DTO accordingly.
            string body = (string.IsNullOrEmpty(targetBuildingId))
                ? JsonUtility.ToJson(new RecruitRequest
                {
                    archetype = archetype,
                    assigned_building_id = assignedBuildingId,
                })
                : JsonUtility.ToJson(new RecruitRequestWithTarget
                {
                    archetype = archetype,
                    assigned_building_id = assignedBuildingId,
                    target_building_id = targetBuildingId,
                });

            string url = Url(string.Empty); // POST /v1/lieutenants
            using (var req = new UnityWebRequest(url, UnityWebRequest.kHttpVerbPOST))
            {
                req.uploadHandler = new UploadHandlerRaw(Encoding.UTF8.GetBytes(body));
                req.downloadHandler = new DownloadHandlerBuffer();
                req.timeout = TimeoutSeconds;
                req.SetRequestHeader("Content-Type", "application/json");
                if (!string.IsNullOrEmpty(bearer)) req.SetRequestHeader("Authorization", "Bearer " + bearer);
                req.SetRequestHeader("Idempotency-Key", Guid.NewGuid().ToString()); // UUID v4 — backend mandate

                yield return req.SendWebRequest();

                if (req.result == UnityWebRequest.Result.Success)
                {
                    string id = null;
                    try { id = JsonUtility.FromJson<RecruitEnvelope>(req.downloadHandler.text)?.payload?.data?.lieutenant_id; }
                    catch (Exception ex) { onErr?.Invoke(req.responseCode, "parse error: " + ex.Message); yield break; }

                    if (string.IsNullOrEmpty(id)) { onErr?.Invoke(req.responseCode, "empty recruit payload"); yield break; }
                    onOk?.Invoke(id);
                }
                else
                {
                    onErr?.Invoke(req.responseCode, ReadableError(req));
                }
            }
        }

        // ------------------------------------------------------------- reassign (B2 / Phase-11)

        /// <summary>
        /// POST /v1/lieutenants/:id/reassign { assigned_building_id, target_building_id? } — MOVE a player-owned lieutenant
        /// to a NEW building. The canon (Phase-11 tenure inertia): the move FORFEITS the accumulated tenure (tenure_bucket
        /// resets to FRESH) AND opens an OLD-bucket-scaled settling window (op_state_band → SETTLING until it expires). The
        /// new building is gated by the SAME per-archetype assignment gate recruit uses: not owned / not operational → 404;
        /// the wrong building type for the archetype → 409; a required dispatch target missing → 422; not the player's
        /// lieutenant → 404; no token → 401. `targetBuildingId` is the dispatch destination — included in the body ONLY when
        /// non-null/non-empty (COOK/SECURITY/BOOKKEEPER omit it), EXACTLY like Recruit. 200 returns the freshly-projected
        /// LieutenantBands (tenure_bucket FRESH, op_state_band SETTLING) — we don't need to parse it here (the controller pulls
        /// fresh bands via RefreshBands on onOk), so onOk() is a bare ack; onErr(code, message) surfaces a readable error (F2).
        /// Bearer + UUID-v4 Idempotency-Key — mirrors the Recruit POST idiom exactly.
        /// </summary>
        public IEnumerator ReassignLieutenant(string lieutenantId, string assignedBuildingId, string targetBuildingId,
            string bearer, Action onOk, Action<long, string> onErr)
        {
            // Build the request body. target_building_id is OMITTED entirely when null/empty (single-building archetypes
            // never send it) — JsonUtility cannot conditionally drop a field, so we pick the with/without-target DTO.
            string body = (string.IsNullOrEmpty(targetBuildingId))
                ? JsonUtility.ToJson(new ReassignRequest
                {
                    assigned_building_id = assignedBuildingId,
                })
                : JsonUtility.ToJson(new ReassignRequestWithTarget
                {
                    assigned_building_id = assignedBuildingId,
                    target_building_id = targetBuildingId,
                });

            string url = Url($"/{lieutenantId}/reassign"); // POST /v1/lieutenants/:id/reassign
            using (var req = new UnityWebRequest(url, UnityWebRequest.kHttpVerbPOST))
            {
                req.uploadHandler = new UploadHandlerRaw(Encoding.UTF8.GetBytes(body));
                req.downloadHandler = new DownloadHandlerBuffer();
                req.timeout = TimeoutSeconds;
                req.SetRequestHeader("Content-Type", "application/json");
                if (!string.IsNullOrEmpty(bearer)) req.SetRequestHeader("Authorization", "Bearer " + bearer);
                req.SetRequestHeader("Idempotency-Key", Guid.NewGuid().ToString()); // UUID v4 — backend mandate

                yield return req.SendWebRequest();

                if (req.result == UnityWebRequest.Result.Success)
                {
                    onOk?.Invoke();
                }
                else
                {
                    onErr?.Invoke(req.responseCode, ReadableError(req));
                }
            }
        }

        // ------------------------------------------------------------- bands (T2)

        /// <summary>
        /// GET /v1/lieutenants/:id — the qualitative band projection (LieutenantProjectionService.lieutenantBands). 200
        /// returns the closed-domain bands { archetype, granted_role, mode, op_state_band, rule_count_band } + the
        /// player-authored script_source (the ONE allowed readable non-band field; "" when no script is attached). A
        /// lieutenant the player does not own / does not exist → 404 RESOURCE_NOT_FOUND (onErr). Mirrors
        /// BuildingCardClient.GetBuildingCard exactly: a Bearer GET, concrete-envelope JsonUtility parse of
        /// `payload.data`, ReadableError on a non-2xx. R2.2: the projection NEVER returns a raw scalar — only bands +
        /// the authored source. onOk(bands) on 2xx; onErr(code, message) on anything else.
        /// </summary>
        public IEnumerator GetBands(string lieutenantId, string bearer,
            Action<LieutenantBands> onOk, Action<long, string> onErr)
        {
            string url = Url($"/{lieutenantId}"); // GET /v1/lieutenants/:id
            using (UnityWebRequest req = UnityWebRequest.Get(url))
            {
                req.timeout = TimeoutSeconds;
                if (!string.IsNullOrEmpty(bearer)) req.SetRequestHeader("Authorization", "Bearer " + bearer);
                yield return req.SendWebRequest();

                if (req.result == UnityWebRequest.Result.Success)
                {
                    LieutenantBands bands = null;
                    try { bands = JsonUtility.FromJson<LieutenantBandsEnvelope>(req.downloadHandler.text)?.payload?.data; }
                    catch (Exception ex) { onErr?.Invoke(req.responseCode, "parse error: " + ex.Message); yield break; }

                    if (bands == null) { onErr?.Invoke(req.responseCode, "empty lieutenant-bands payload"); yield break; }
                    onOk?.Invoke(bands);
                }
                else
                {
                    onErr?.Invoke(req.responseCode, ReadableError(req));
                }
            }
        }

        // ------------------------------------------------------------- roster (B2)

        /// <summary>
        /// GET /v1/lieutenants — the band-only ROSTER of the player's delegated lieutenants (A1 backend contract). 200
        /// returns { lieutenants: RosterRow[] } where each row is the identity uuid + closed-domain bands { archetype,
        /// op_state_band, rule_count_band } (R2.2 — never a raw scalar). A player with no lieutenant → an empty array (NOT
        /// an error). Mirrors GetBands exactly: a Bearer GET (no Idempotency-Key — GETs don't send one), concrete-envelope
        /// JsonUtility parse of `payload.data.lieutenants`, ReadableError on a non-2xx. A null/absent array parses to an
        /// empty array (never null, like ParseDiagnostics) so the caller can render without a guard. onOk(rows) on 2xx;
        /// onErr(code, message) on anything else.
        /// </summary>
        public IEnumerator ListLieutenants(string bearer, Action<RosterRow[]> onOk, Action<long, string> onErr)
        {
            string url = Url(string.Empty); // GET /v1/lieutenants
            using (UnityWebRequest req = UnityWebRequest.Get(url))
            {
                req.timeout = TimeoutSeconds;
                if (!string.IsNullOrEmpty(bearer)) req.SetRequestHeader("Authorization", "Bearer " + bearer);
                yield return req.SendWebRequest();

                if (req.result == UnityWebRequest.Result.Success)
                {
                    RosterRow[] rows;
                    try
                    {
                        rows = JsonUtility.FromJson<RosterListEnvelope>(req.downloadHandler.text)?.payload?.data?.lieutenants
                               ?? Array.Empty<RosterRow>();
                    }
                    catch (Exception ex) { onErr?.Invoke(req.responseCode, "parse error: " + ex.Message); yield break; }

                    onOk?.Invoke(rows);
                }
                else
                {
                    onErr?.Invoke(req.responseCode, ReadableError(req));
                }
            }
        }

        // ------------------------------------------------------------- validate / attach (T3)

        /// <summary>
        /// POST /v1/lieutenants/:id/behavior-script/validate { source } — a DRY-RUN parse+compile of the player-authored
        /// DSL `source` (the rule-builder serializes it; the backend is authoritative for validity — the client never
        /// re-implements parse/compile). 200 { valid:true } → onValid(); a non-2xx → onInvalid(code, details, message)
        /// where `details` is the parsed DslDiagnostic[] off the 422 VALIDATION_FAILED error envelope (line/col/message/
        /// kind), empty for a non-422 (e.g. 404 not-owned). The readable `message` is surfaced too (F2 — never a raw
        /// code). Bearer + UUID-v4 Idempotency-Key (the backend mandate) — mirrors Recruit's POST idiom exactly.
        /// </summary>
        public IEnumerator ValidateScript(string lieutenantId, string source, string bearer,
            Action onValid, Action<long, DslDiagnostic[], string> onInvalid)
        {
            yield return PostScript(Url($"/{lieutenantId}/behavior-script/validate"), source, bearer, onValid, onInvalid);
        }

        /// <summary>
        /// POST /v1/lieutenants/:id/behavior-script { source } — ATTACH the player-authored DSL `source` (parse+compile+
        /// store). 200 { attached:true } → onAttached(); a non-2xx → onInvalid(code, details, message) (the SAME 422
        /// diagnostics parse as validate). Bearer + UUID-v4 Idempotency-Key. Identical wire shape to ValidateScript —
        /// only the leaf differs (no `/validate`).
        /// </summary>
        public IEnumerator AttachScript(string lieutenantId, string source, string bearer,
            Action onAttached, Action<long, DslDiagnostic[], string> onInvalid)
        {
            yield return PostScript(Url($"/{lieutenantId}/behavior-script"), source, bearer, onAttached, onInvalid);
        }

        // Shared POST { source } coroutine for validate/attach — they differ ONLY in the URL leaf and which boolean ack
        // the player reads (valid / attached), so the round-trip + the 422-details parse live here once (DRY). On 2xx →
        // onOk(); on a non-2xx → onInvalid(code, details, message): the human `message` (F2) + the structured
        // DslDiagnostic[] off `payload.error.details` (empty when the error carries none — e.g. a 404). The client never
        // judges validity — it sends the source and renders whatever the backend returns.
        private IEnumerator PostScript(string url, string source, string bearer,
            Action onOk, Action<long, DslDiagnostic[], string> onInvalid)
        {
            string body = JsonUtility.ToJson(new BehaviorScriptRequest { source = source ?? string.Empty });
            using (var req = new UnityWebRequest(url, UnityWebRequest.kHttpVerbPOST))
            {
                req.uploadHandler = new UploadHandlerRaw(Encoding.UTF8.GetBytes(body));
                req.downloadHandler = new DownloadHandlerBuffer();
                req.timeout = TimeoutSeconds;
                req.SetRequestHeader("Content-Type", "application/json");
                if (!string.IsNullOrEmpty(bearer)) req.SetRequestHeader("Authorization", "Bearer " + bearer);
                req.SetRequestHeader("Idempotency-Key", Guid.NewGuid().ToString()); // UUID v4 — backend mandate

                yield return req.SendWebRequest();

                if (req.result == UnityWebRequest.Result.Success)
                {
                    onOk?.Invoke();
                }
                else
                {
                    onInvalid?.Invoke(req.responseCode, ParseDiagnostics(req), ReadableError(req));
                }
            }
        }

        // Parse the structured DSL diagnostics off a non-2xx error envelope's `payload.error.details` (a DslDiagnostic[]
        // on a 422 VALIDATION_FAILED; null/absent on other errors — we return an empty array, never null, so callers can
        // foreach without a guard). JsonUtility maps only the fields it knows; a malformed/absent body yields empty.
        private static DslDiagnostic[] ParseDiagnostics(UnityWebRequest req)
        {
            string text = req.downloadHandler != null ? req.downloadHandler.text : null;
            if (!string.IsNullOrEmpty(text))
            {
                try
                {
                    DslDiagnostic[] details = JsonUtility.FromJson<LieutenantErrorEnvelope>(text)?.payload?.error?.details;
                    if (details != null) return details;
                }
                catch { /* fall through to the empty array */ }
            }
            return Array.Empty<DslDiagnostic>();
        }

        // --------------------------------------------------------------- helpers

        // Map a non-2xx into a readable string. We surface the lieutenant error envelope's human `message` (a dev/EN
        // sentence) rather than a raw HTTP code to the player (F2: never a bare 503). The status is passed separately to
        // onErr for the wiring assertion / logs. (T3 will additionally render the 422 `details` DslDiagnostic[] inline.)
        private static string ReadableError(UnityWebRequest req)
        {
            string text = req.downloadHandler != null ? req.downloadHandler.text : null;
            if (!string.IsNullOrEmpty(text))
            {
                try
                {
                    LieutenantErrorEnvelope env = JsonUtility.FromJson<LieutenantErrorEnvelope>(text);
                    string msg = env?.payload?.error?.message;
                    if (!string.IsNullOrEmpty(msg)) return msg;
                }
                catch { /* fall through to a generic message */ }
            }
            return $"request failed ({req.responseCode}) {req.error}";
        }
    }
}
