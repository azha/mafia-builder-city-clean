using System;
using System.Collections;
using UnityEngine;
using UnityEngine.Networking;

namespace MafiaCleanCity.Operational
{
    // ㉝ « Raser un site » — les cinq routes de la friction, plus les DEUX qui mènent à un
    // `building_id`, faute de route qui liste les bâtiments d'un joueur.
    //
    //   GET  /v1/friction/state                          l'état global
    //   GET  /v1/friction/nodes/{uuid}                   la fiche d'un site
    //   POST /v1/friction/nodes/{uuid}/decommission      raser — exige {confirm:true}
    //   GET  /v1/friction/replacement-options            les deux offres classées
    //   POST /v1/friction/replacement-options/{uuid}/pick
    //   GET  /v1/world/districts                         ─┐ le SEUL chemin joueur
    //   GET  /v1/city/district/{int}/interior            ─┘ vers un building_id
    //
    // ⛔ LES REFUS DE CET ÉCRAN SONT DU JEU, PAS DES PANNES — et c'est pourquoi ce client lit le
    // CORPS des réponses d'erreur au lieu de remonter une ligne de statut HTTP. Trois des six
    // cadres de la maquette SONT des refus :
    //   422 DEMOLITION_CONFIRM_REQUIRED   → le cadre de confirmation (m-81)
    //   409 STRUCTURAL_CAP_EXHAUSTED      → le geste éteint, « ce sera pour demain »
    //   409 REPLACEMENT_OPTION_ALREADY_CLOSED / 404 → « cette offre est fermée » (m-84)
    // Le `code` sert à DÉCIDER (c'est lui le contrat, jamais le texte) ; le `message` sert à
    // MONTRER tant qu'aucun libellé de jeu n'est écrit pour ce code.
    public class DemolitionClient
    {
        public string BaseUrl = "http://localhost";
        public int TimeoutSeconds = 10;

        /// <summary>Ce qu'un refus rend à l'appelant. `code` vaut `null` quand l'échec est
        /// TRANSPORT (réseau, délai) — un cas qui ne se confond alors jamais avec un refus métier,
        /// alors qu'un simple statut HTTP les mélangeait.</summary>
        public struct Refus
        {
            public long statut;
            public string code;
            public string message;
            public bool EstMetier => !string.IsNullOrEmpty(code);
        }

        // ═══ La friction ═════════════════════════════════════════════════════════════════════

        public IEnumerator GetFrictionState(string bearer,
            Action<GetFrictionStateResponseDto> onOk, Action<Refus> onErr)
        {
            using (UnityWebRequest req = UnityWebRequest.Get(Url("/v1/friction/state")))
            {
                Preparer(req, bearer);
                yield return req.SendWebRequest();
                if (Reussi(req))
                {
                    var dto = JsonUtility.FromJson<GetFrictionStateEnvelope>(req.downloadHandler.text)?.payload?.data;
                    if (dto == null) { onErr?.Invoke(CorpsVide(req, "friction/state")); yield break; }
                    onOk?.Invoke(dto);
                }
                else onErr?.Invoke(Lire(req));
            }
        }

        public IEnumerator GetFrictionNodes(string bearer, string buildingId,
            Action<GetFrictionNodesResponseDto> onOk, Action<Refus> onErr)
        {
            using (UnityWebRequest req = UnityWebRequest.Get(
                Url("/v1/friction/nodes/") + UnityWebRequest.EscapeURL(buildingId)))
            {
                Preparer(req, bearer);
                yield return req.SendWebRequest();
                if (Reussi(req))
                {
                    var dto = JsonUtility.FromJson<GetFrictionNodesEnvelope>(req.downloadHandler.text)?.payload?.data;
                    if (dto == null) { onErr?.Invoke(CorpsVide(req, "friction/nodes")); yield break; }
                    onOk?.Invoke(dto);
                }
                else onErr?.Invoke(Lire(req));
            }
        }

        /// <summary>⛔ `confirm` EST EXIGÉ PAR LE SERVEUR, mesuré : un corps vide rend 422
        /// DEMOLITION_CONFIRM_REQUIRED. Le paramètre est donc OBLIGATOIRE dans cette signature —
        /// pas optionnel avec un défaut. Un marqueur d'optionalité est exactement l'endroit où le
        /// compilateur cesse d'aider : sur un chemin qui DOIT porter le drapeau, il transformerait
        /// l'oubli en 422 silencieux découvert en jeu.</summary>
        public IEnumerator PostFrictionNodesDecommission(string bearer, string buildingId, bool confirm,
            Action<PostFrictionNodesDecommissionResponseDto> onOk, Action<Refus> onErr)
        {
            using (UnityWebRequest req = Poster(
                "/v1/friction/nodes/" + UnityWebRequest.EscapeURL(buildingId) + "/decommission",
                new PostFrictionNodesDecommissionBody { confirm = confirm }, bearer))
            {
                yield return req.SendWebRequest();
                if (Reussi(req))
                {
                    var dto = JsonUtility.FromJson<PostFrictionNodesDecommissionEnvelope>(req.downloadHandler.text)?.payload?.data;
                    if (dto == null) { onErr?.Invoke(CorpsVide(req, "decommission")); yield break; }
                    onOk?.Invoke(dto);
                }
                else onErr?.Invoke(Lire(req));
            }
        }

        public IEnumerator GetFrictionReplacementOptions(string bearer,
            Action<GetFrictionReplacementOptionsResponseDto> onOk, Action<Refus> onErr)
        {
            using (UnityWebRequest req = UnityWebRequest.Get(Url("/v1/friction/replacement-options")))
            {
                Preparer(req, bearer);
                yield return req.SendWebRequest();
                if (Reussi(req))
                {
                    var dto = JsonUtility.FromJson<GetFrictionReplacementOptionsEnvelope>(req.downloadHandler.text)?.payload?.data;
                    if (dto == null) { onErr?.Invoke(CorpsVide(req, "replacement-options")); yield break; }
                    onOk?.Invoke(dto);
                }
                else onErr?.Invoke(Lire(req));
            }
        }

        public IEnumerator PostFrictionReplacementOptionsPick(string bearer, string optionId,
            Action<PostFrictionReplacementOptionsPickResponseDto> onOk, Action<Refus> onErr)
        {
            using (UnityWebRequest req = Poster(
                "/v1/friction/replacement-options/" + UnityWebRequest.EscapeURL(optionId) + "/pick",
                new PostFrictionReplacementOptionsPickBody(), bearer))
            {
                yield return req.SendWebRequest();
                if (Reussi(req))
                {
                    var dto = JsonUtility.FromJson<PostFrictionReplacementOptionsPickEnvelope>(req.downloadHandler.text)?.payload?.data;
                    // ⚠️ Ici un corps vide n'est PAS un échec : le succès de `pick` n'a jamais été
                    // observé (TD-533), donc on ne sait pas s'il porte des clés. On accepte un
                    // objet vide et on laisse l'appelant recharger les offres — l'état réel se lit
                    // sur `replacement-options`, jamais sur ce qu'on croit que `pick` a rendu.
                    onOk?.Invoke(dto ?? new PostFrictionReplacementOptionsPickResponseDto { picked = true });
                }
                else onErr?.Invoke(Lire(req));
            }
        }

        // ═══ Le chemin joueur vers un building_id ════════════════════════════════════════════

        public IEnumerator GetWorldDistricts(string bearer,
            Action<GetWorldDistrictsResponseDto> onOk, Action<Refus> onErr)
        {
            using (UnityWebRequest req = UnityWebRequest.Get(Url("/v1/world/districts")))
            {
                Preparer(req, bearer);
                yield return req.SendWebRequest();
                if (Reussi(req))
                {
                    var dto = JsonUtility.FromJson<GetWorldDistrictsEnvelope>(req.downloadHandler.text)?.payload?.data;
                    if (dto == null) { onErr?.Invoke(CorpsVide(req, "world/districts")); yield break; }
                    onOk?.Invoke(dto);
                }
                else onErr?.Invoke(Lire(req));
            }
        }

        public IEnumerator GetCityDistrictInterior(string bearer, int districtId,
            Action<GetCityDistrictInteriorResponseDto> onOk, Action<Refus> onErr)
        {
            using (UnityWebRequest req = UnityWebRequest.Get(
                Url("/v1/city/district/") + districtId.ToString(System.Globalization.CultureInfo.InvariantCulture)
                + "/interior"))
            {
                Preparer(req, bearer);
                yield return req.SendWebRequest();
                if (Reussi(req))
                {
                    var dto = JsonUtility.FromJson<GetCityDistrictInteriorEnvelope>(req.downloadHandler.text)?.payload?.data;
                    if (dto == null) { onErr?.Invoke(CorpsVide(req, "district/interior")); yield break; }
                    onOk?.Invoke(dto);
                }
                else onErr?.Invoke(Lire(req));
            }
        }

        // ═══ Plomberie ═══════════════════════════════════════════════════════════════════════

        private string Url(string chemin) => BaseUrl.TrimEnd('/') + chemin;
        private static bool Reussi(UnityWebRequest req) => req.result == UnityWebRequest.Result.Success;

        private void Preparer(UnityWebRequest req, string bearer)
        {
            req.timeout = TimeoutSeconds;
            if (!string.IsNullOrEmpty(bearer)) req.SetRequestHeader("Authorization", "Bearer " + bearer);
        }

        private UnityWebRequest Poster(string chemin, object corps, string bearer)
        {
            string json = corps != null ? JsonUtility.ToJson(corps) : "{}";
            var req = new UnityWebRequest(Url(chemin), "POST");
            req.uploadHandler = new UploadHandlerRaw(System.Text.Encoding.UTF8.GetBytes(json));
            req.downloadHandler = new DownloadHandlerBuffer();
            req.SetRequestHeader("Content-Type", "application/json");
            // Une clé NEUVE par appel : réutiliser celle d'un appel précédent ferait rejouer sa
            // réponse — donc afficher « rasé » pour une démolition jamais tentée.
            req.SetRequestHeader("Idempotency-Key", Guid.NewGuid().ToString());
            Preparer(req, bearer);
            return req;
        }

        private static Refus Lire(UnityWebRequest req)
        {
            string texte = req.downloadHandler != null ? req.downloadHandler.text : null;
            ApiErreurDto err = null;
            if (!string.IsNullOrEmpty(texte))
            {
                try { err = JsonUtility.FromJson<ApiErreurEnvelope>(texte)?.payload?.error; }
                catch (Exception) { err = null; }
            }
            return new Refus
            {
                statut = req.responseCode,
                code = err != null ? err.code : null,
                message = err != null && !string.IsNullOrEmpty(err.message) ? err.message : $"{req.url} — {req.error}",
            };
        }

        private static Refus CorpsVide(UnityWebRequest req, string quoi) => new Refus
        {
            statut = req.responseCode,
            code = null,
            message = $"corps vide ou illisible ({quoi})",
        };
    }
}
