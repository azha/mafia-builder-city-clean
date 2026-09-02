using System;
using System.Collections;
using UnityEngine;
using UnityEngine.Networking;
using MafiaCleanCity.Operational;

namespace MafiaCleanCity.Operational.Exceptions
{
    // IMPLEMENTS: spec §4-T1 — GET /v1/progression (P17 backend): the player's vocab tier + a qualitative
    // progress band. Shared by the Dashboard (vocab line) and the rule editor (Tier-2 gating). House idiom.

    /// <summary>La réponse de `GET /v1/progression`, ÉTENDUE le 2026-09-02 des deux champs que le
    /// corps réel portait déjà et que ce DTO ne déclarait pas.
    ///
    /// ⛔ Corps mesuré (compte de démo, backend local) :
    ///   `{ vocabulary_tier: 1, progress_to_next: "LOCKED", next_tier: 2,
    ///      tier_label_i18n: { key: "game.progression.tier_label", params: { tier: "2" } } }`
    /// Les deux derniers étaient servis et jetés en silence — un champ non déclaré ne rougit
    /// nulle part, `JsonUtility` l'ignore sans un mot.
    ///
    /// ★ CE QUE CETTE EXTENSION A ÉVITÉ. En cherchant de quoi ㊱ avait besoin pour l'échelle des
    ///   paliers (TD-408), j'ai commencé par ÉCRIRE un second `ProgressionDto` et un second
    ///   `GetProgression` dans le client Horizon — sans voir que celui-ci existait et servait
    ///   déjà l'Accueil et ⑤. C'est la faute exacte contre laquelle j'avais écrit une doctrine
    ///   une heure plus tôt dans `LargeurDeGlyphe`. La cause : j'ai cherché la DONNÉE (`tier`)
    ///   et non la ROUTE (`/v1/progression`) — le nom du champ manquait partout, l'appel était
    ///   là depuis toujours.
    /// ⇒ AVANT D'ÉCRIRE UN CLIENT, CHERCHER SA ROUTE. Un producteur qui existe déjà ne se
    ///   signale pas par le nom de ce qu'on lui demande.
    ///
    /// ⚠️ `progress_to_next` BOUGE — `LOCKED | IN_PROGRESS | UNLOCKED` — et passe à
    /// `IN_PROGRESS` dès que le joueur tranche sa première carte d'exception. Ce n'est pas une
    /// constante d'affichage : c'est ce qui sépare « palier suivant hors de portée » de « palier
    /// suivant en cours », la distinction même que l'échelle de ㊱ doit montrer.
    /// ⚠️ `tier_label_i18n` est une clé PARAMÉTRÉE : la passer à `I18nCatalog.Traduire(key, params)`
    /// avec les paramètres TELS QUE REÇUS. La fiche ② a coûté une demi-journée le même jour pour
    /// avoir supposé le nom de ces paramètres au lieu de le lire dans le corps.</summary>
    [Serializable]
    public class ProgressionDto
    {
        public int vocabulary_tier;              // le palier COURANT (1..6)
        public string progress_to_next;          // LOCKED | IN_PROGRESS | UNLOCKED
        public int next_tier;                    // le palier visé
        public ProgressionTierLabelDto tier_label_i18n;
    }

    [Serializable]
    public class ProgressionTierLabelDto
    {
        public string key;
        public ProgressionTierLabelParamsDto @params;
    }

    /// <summary>⚠️ Le paramètre sous le nom que LE CORPS porte (`params: { tier: "2" }`), relevé,
    /// pas supposé. Un nom inventé ici rendrait une accolade nue à l'écran.</summary>
    [Serializable]
    public class ProgressionTierLabelParamsDto
    {
        public string tier;
    }
    [Serializable] public class ProgressionPayload { public ProgressionDto data; }
    [Serializable] public class ProgressionEnvelope { public ProgressionPayload payload; }

    public class ProgressionClient
    {
        public string BaseUrl = "http://localhost";
        public int TimeoutSeconds = 10;

        /// <summary>GET /v1/progression — { vocabulary_tier: 1..6, progress_to_next: LOCKED|IN_PROGRESS|UNLOCKED }.</summary>
        public IEnumerator GetProgression(string bearer, Action<ProgressionDto> onOk, Action<long, string> onErr)
        {
            string url = $"{BaseUrl.TrimEnd('/')}/v1/progression";
            using (UnityWebRequest req = UnityWebRequest.Get(url))
            {
                req.timeout = TimeoutSeconds;
                if (!string.IsNullOrEmpty(bearer)) req.SetRequestHeader("Authorization", "Bearer " + bearer);
                yield return req.SendWebRequest();

                if (req.result == UnityWebRequest.Result.Success)
                {
                    ProgressionDto dto = null;
                    try { dto = JsonUtility.FromJson<ProgressionEnvelope>(req.downloadHandler.text)?.payload?.data; }
                    catch (Exception ex) { onErr?.Invoke(req.responseCode, "parse error: " + ex.Message); yield break; }
                    if (dto == null || dto.vocabulary_tier <= 0) { onErr?.Invoke(req.responseCode, "empty progression payload"); yield break; }
                    onOk?.Invoke(dto);
                }
                else
                {
                    onErr?.Invoke(req.responseCode, ReadableError(req));
                }
            }
        }

        // Map a non-2xx to the human error-envelope message (F2) — verbatim the BuildingCardClient helper.
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
