using System;
using System.Collections;
using System.Text;
using UnityEngine;
using UnityEngine.Networking;

namespace MafiaCleanCity.Operational
{
    // Reads the JWT-gated Phase-2 operational Laundering node projection and drives
    // the Stage-1 front-shop Inject action (plus the Collect action the screen uses to
    // stage dirty cash into the safehouse). Mirrors BuildingCardClient: a UnityWebRequest
    // coroutine + concrete-envelope JsonUtility parsing. No mock — every call hits the live
    // dockerized stack (Traefik at http://localhost).
    //
    // Auth: every operational endpoint needs a PLAYER Bearer (AuthClient.SignIn).
    // Mutations additionally need an Idempotency-Key header that MUST be a UUID v4
    // (the backend rejects any other shape with 400 IDEMPOTENCY_KEY_FORMAT_INVALID).
    //
    // The OpErrorEnvelope / OpError types + the readable-error mapping are declared once in
    // BuildingCardClient.cs (same assembly) and REUSED here — one canonical error shape.
    public class LaunderingClient
    {
        public string BaseUrl = "http://localhost";
        public int TimeoutSeconds = 10;

        private string Url(string leaf) => $"{BaseUrl.TrimEnd('/')}/v1/operational/{leaf}";

        // ------------------------------------------------------------- projection

        /// <summary>
        /// GET /v1/operational/laundering/:nodeId — the Stage-1 laundering node projection.
        /// onOk(dto) on 2xx; onErr(code, message) on anything else.
        /// </summary>
        /// <summary>GET /v1/operational/laundering — LA LISTE des nœuds de blanchiment du joueur.
        ///
        /// ⛔ AJOUTÉE le 2026-09-03, et elle corrige une prémisse. Une entrée de dette était citée
        /// pour affirmer qu'aucune route amont ne fournit l'identifiant de nœud — ce qui a valu à
        /// ⑪ et ⑫ d'afficher un titre, un sous-titre et aucune donnée. Deux choses étaient
        /// fausses : l'affirmation, et le NUMÉRO qui la portait (il désigne le bundle i18n servi
        /// par le VPS, un sujet sans rapport). MESURÉ : la route EXISTE et rend 200 —
        ///     tableau VIDE sur un compte frais.
        /// ⇒ Ce n'est donc pas la ROUTE qui manque, c'est le JOUEUR neuf qui n'a aucun nœud. La
        ///   distinction n'est pas cosmétique : « on ne peut pas savoir » et « il n'y a rien
        ///   encore » se dessinent différemment, et seule la seconde est vraie.
        /// ✅ CE QUE JE N'AVAIS PAS MESURÉ L'EST DEPUIS — et je l'écris ici plutôt qu'ailleurs,
        /// parce que c'est ici que la question a été posée. La forme non-vide : sur
        /// `operational_demo`, cette route rend **QUATRE** nœuds, `PARTIAL` → `MOSTLY_CLEAN` →
        /// `CLEAN` → `CLEAN` terminal, chacun portant `node`, `stage_index`, `cleanliness_band`,
        /// `terminal`, `has_cash`. Corps commité :
        /// `Tools/juge-visuel/screen_c2/corps-reels/GET_operational_laundering.json` (back
        /// `6ff684db`, 2026-09-04).
        /// ★ *Une question ouverte écrite à l'endroit exact où elle se pose est la seule qui se
        ///   referme* — celle-ci a attendu deux jours, et l'écran est resté inachevé pendant.</summary>
        public IEnumerator GetLaunderingNodes(string bearer,
            Action<LaunderingNodesDto> onOk, Action<long, string> onErr)
        {
            string url = Url("laundering");
            using (UnityWebRequest req = UnityWebRequest.Get(url))
            {
                req.timeout = TimeoutSeconds;
                if (!string.IsNullOrEmpty(bearer)) req.SetRequestHeader("Authorization", "Bearer " + bearer);
                yield return req.SendWebRequest();
                if (req.result == UnityWebRequest.Result.Success)
                {
                    LaunderingNodesDto dto =
                        JsonUtility.FromJson<LaunderingNodesEnvelope>(req.downloadHandler.text)?.payload?.data;
                    if (dto == null) { onErr?.Invoke(0, "corps vide (GetLaunderingNodes)"); yield break; }
                    onOk?.Invoke(dto);
                }
                else onErr?.Invoke(req.responseCode,
                                   $"GET /v1/operational/laundering a échoué ({req.responseCode}) {req.error}");
            }
        }

        public IEnumerator GetLaunderingNode(string nodeId, string bearer,
            Action<LaunderingNodeDto> onOk, Action<long, string> onErr)
        {
            string url = Url($"laundering/{nodeId}");
            using (UnityWebRequest req = UnityWebRequest.Get(url))
            {
                req.timeout = TimeoutSeconds;
                if (!string.IsNullOrEmpty(bearer)) req.SetRequestHeader("Authorization", "Bearer " + bearer);
                yield return req.SendWebRequest();

                if (req.result == UnityWebRequest.Result.Success)
                {
                    LaunderingNodeDto dto = null;
                    try { dto = JsonUtility.FromJson<LaunderingNodeEnvelope>(req.downloadHandler.text)?.payload?.data; }
                    catch (Exception ex) { onErr?.Invoke(req.responseCode, "parse error: " + ex.Message); yield break; }

                    if (dto == null) { onErr?.Invoke(req.responseCode, "empty laundering-node payload"); yield break; }
                    onOk?.Invoke(dto);
                }
                else
                {
                    onErr?.Invoke(req.responseCode, ReadableError(req));
                }
            }
        }

        /// <summary>
        /// GET /v1/operational/laundering/:nodeId/pipeline — the MULTI-NODE pipeline overview (the
        /// ordered stages Stage1→2→3→4, each with a cleanliness band + terminal flag + has_cash flag).
        /// onOk(dto) on 2xx; onErr(code, message) on anything else.
        /// </summary>
        public IEnumerator GetLaunderingPipeline(string nodeId, string bearer,
            Action<LaunderingPipelineDto> onOk, Action<long, string> onErr)
        {
            string url = Url($"laundering/{nodeId}/pipeline");
            using (UnityWebRequest req = UnityWebRequest.Get(url))
            {
                req.timeout = TimeoutSeconds;
                if (!string.IsNullOrEmpty(bearer)) req.SetRequestHeader("Authorization", "Bearer " + bearer);
                yield return req.SendWebRequest();

                if (req.result == UnityWebRequest.Result.Success)
                {
                    LaunderingPipelineDto dto = null;
                    try { dto = JsonUtility.FromJson<LaunderingPipelineEnvelope>(req.downloadHandler.text)?.payload?.data; }
                    catch (Exception ex) { onErr?.Invoke(req.responseCode, "parse error: " + ex.Message); yield break; }

                    if (dto == null || dto.stages == null) { onErr?.Invoke(req.responseCode, "empty pipeline payload"); yield break; }
                    onOk?.Invoke(dto);
                }
                else
                {
                    onErr?.Invoke(req.responseCode, ReadableError(req));
                }
            }
        }

        // --------------------------------------------------------------- actions

        // POST helper. Body is JSON; an idempotency UUID-v4 is attached for mutations.
        // Uniform outcome: Ok on 2xx (with the parsed id when present), else a well-formed
        // error (status + a readable message — never a raw code to the UI). Mirrors the
        // BuildingCardClient.Post recipe.
        private IEnumerator Post(string url, string body, string bearer,
            Func<string, string> parseId, Action<ActionOutcome> done)
        {
            var outcome = new ActionOutcome { Endpoint = url };
            using (var req = new UnityWebRequest(url, UnityWebRequest.kHttpVerbPOST))
            {
                req.uploadHandler = new UploadHandlerRaw(Encoding.UTF8.GetBytes(body ?? "{}"));
                req.downloadHandler = new DownloadHandlerBuffer();
                req.timeout = TimeoutSeconds;
                req.SetRequestHeader("Content-Type", "application/json");
                if (!string.IsNullOrEmpty(bearer)) req.SetRequestHeader("Authorization", "Bearer " + bearer);
                req.SetRequestHeader("Idempotency-Key", Guid.NewGuid().ToString()); // UUID v4 — backend mandate

                yield return req.SendWebRequest();
                outcome.HttpStatus = req.responseCode;

                if (req.result == UnityWebRequest.Result.Success)
                {
                    outcome.Ok = true;
                    try { outcome.ResultId = parseId != null ? parseId(req.downloadHandler.text) : null; }
                    catch { /* a 2xx with an unexpected body still counts as wired-ok */ }
                    outcome.Message = "ok";
                }
                else
                {
                    outcome.Ok = false;
                    outcome.Message = ReadableError(req);
                }
            }
            done?.Invoke(outcome);
        }

        /// <summary>
        /// POST /v1/operational/laundering/inject — inject dirty cash through a front-shop
        /// into the Stage-1 node. Parses the returned node_id (proves the wiring + identity).
        /// </summary>
        public IEnumerator Inject(string frontShopId, string safehouseId, int amountCents,
            string bearer, Action<ActionOutcome> done)
        {
            string body = JsonUtility.ToJson(new InjectRequestDto
            {
                front_shop_id = frontShopId,
                safehouse_id = safehouseId,
                amount_cents = amountCents,
            });
            return Post(Url("laundering/inject"), body, bearer,
                json => JsonUtility.FromJson<InjectEnvelope>(json)?.payload?.data?.node_id,
                done);
        }

        /// <summary>
        /// POST /v1/operational/dealer/:id/collect — ferry a dealer float into the
        /// cash-safehouse (stages dirty cash so a subsequent Inject has a balance to launder).
        /// </summary>
        public IEnumerator Collect(string dealerId, string safehouseId,
            string bearer, Action<ActionOutcome> done)
        {
            string body = JsonUtility.ToJson(new CollectRequestDto { safehouse_id = safehouseId });
            return Post(Url($"dealer/{dealerId}/collect"), body, bearer,
                json => JsonUtility.FromJson<CollectEnvelope>(json)?.payload?.data?.safehouse_id,
                done);
        }

        // --------------------------------------------------------------- helpers

        // Map a non-2xx into a readable string — surfaces the operational error envelope's
        // human `message` rather than a raw HTTP code to the player (F2). REUSE OpErrorEnvelope
        // declared in BuildingCardClient.cs (same assembly).
        private static string ReadableError(UnityWebRequest req)
        {
            string text = req.downloadHandler != null ? req.downloadHandler.text : null;
            if (!string.IsNullOrEmpty(text))
            {
                try
                {
                    OpErrorEnvelope env = JsonUtility.FromJson<OpErrorEnvelope>(text);
                    string msg = env?.payload?.error?.message;
                    if (!string.IsNullOrEmpty(msg)) return msg;
                }
                catch { /* fall through to a generic message */ }
            }
            return $"request failed ({req.responseCode}) {req.error}";
        }
    }
}
