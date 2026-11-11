using System;
using System.Collections;
using UnityEngine;
using UnityEngine.Networking;

namespace MafiaCleanCity.Shell
{
    /// <summary>LA RÉPONSE DE `commit`, les DIX clés servies, toutes toujours présentes (`hl-card-types.ts`, lot back `hl-card-apres-geste-servi` D4) —
    /// forme G fermée (TD-889 (a)) : `JsonUtility` jette en silence toute clé non déclarée, donc chaque clé servie est déclarée ICI, et la
    /// bijection corps ↔ DTO est une garde (`CommitResponseDtoPlayModeTests`). Les deux clés i18n sont ce que le back SERT pour l'après-geste :
    /// le client ne dérive AUCUN mot (le texte porte `{n}`/`{total}`, donc il est une clé à paramètres, `Libelle.cs:23-28`).
    /// `outcome` : `executed` | `navigate` | `noted`. `outcome_i18n_key` est null sur `navigate` ; `stopped_at_error` garde le code brut (jamais montré).</summary>
    [Serializable] public class CommitResponseDto
    {
        public bool committed;
        public bool structural;
        public string outcome;
        public string[] executed_ids;
        public string stopped_at_id;
        public string stopped_at_error;
        public string navigate_screen;
        public string[] navigate_ids;
        public string outcome_i18n_key;
        public string stopped_at_i18n_key;
    }
    [Serializable] public class CommitPayload { public CommitResponseDto data; }
    [Serializable] public class CommitEnvelope { public CommitPayload payload; }

    [Serializable] public class SkipResponseDto { public bool skipped; }
    [Serializable] public class SkipPayload { public SkipResponseDto data; }
    [Serializable] public class SkipEnvelope { public SkipPayload payload; }

    // W3.U1 C4 — `POST /v1/session/hl-card/:id/commit` + `.../skip` (`hl-card.controller.ts:40,50`).
    // POST body : `{}` pour `skip` ; `commit` porte `chosen_option` quand l'appelant choisit (`CorpsDuCommit`). Mirrors every other client's
    // envelope/payload/data idiom.
    public class HlCardClient
    {
        public string BaseUrl = MafiaCleanCity.AdresseDuBack.Url;
        public int TimeoutSeconds = MafiaCleanCity.ClientHttp.DelaiParDefautS;
        /// <summary>La phrase SERVIE du dernier refus (`RefusServi.Phrase` : null si le corps n'en porte pas, ou si la clé est générique) ; null après un succès.</summary>
        public string DernierePhraseDeRefus { get; private set; }
        /// <summary>La CLÉ servie du dernier refus (`user_facing_i18n_key`, `RefusServi.Cle`) — y compris générique (la phrase est alors null) ; null après un succès ou sans clé servie.
        /// C'est elle qui dit QUEL refus c'est (`error.hl_card.not_found|already_resolved|nothing_to_act_on`, ou une erreur de la route de la 1ʳᵉ cible).</summary>
        public string DerniereCleDeRefus { get; private set; }

        /// <summary>L'option posée : 0 = AGIR (la recommandation), 1 = ne pas agir (`hl-card.controller.ts`, D1 du lot « agit » : absent/null ⇒ 1).</summary>
        public const int OptionAgir = 0, OptionLaisser = 1;

        /// <summary>Le corps de `commit` : `{}` quand l'appelant ne choisit pas (⑤ tamponne encore sans option : le back lit « n'agit pas »), sinon
        /// `{"chosen_option":N}`. ⛔ ④ envoie TOUJOURS l'option qu'il montre : un `{}` ferait « n'agit pas » derrière un geste qui dit « agir ».</summary>
        public static string CorpsDuCommit(int? optionChoisie) => optionChoisie.HasValue ? "{\"chosen_option\":" + optionChoisie.Value + "}" : "{}";

        public IEnumerator Commit(string bearer, string cardId, Action<CommitResponseDto> onOk, Action<long, string> onErr, int? optionChoisie = null)
        {
            yield return Post($"/v1/session/hl-card/{cardId}/commit", bearer, CorpsDuCommit(optionChoisie),
                text =>
                {
                    CommitResponseDto dto = JsonUtility.FromJson<CommitEnvelope>(text)?.payload?.data;
                    if (dto == null) { onErr?.Invoke(0, "empty commit payload"); return; }
                    onOk?.Invoke(dto);
                },
                onErr);
        }

        public IEnumerator Skip(string bearer, string cardId, Action<SkipResponseDto> onOk, Action<long, string> onErr)
        {
            yield return Post($"/v1/session/hl-card/{cardId}/skip", bearer, "{}",
                text =>
                {
                    SkipResponseDto dto = JsonUtility.FromJson<SkipEnvelope>(text)?.payload?.data;
                    if (dto == null) { onErr?.Invoke(0, "empty skip payload"); return; }
                    onOk?.Invoke(dto);
                },
                onErr);
        }

        private IEnumerator Post(string path, string bearer, string corps, Action<string> onOk, Action<long, string> onErr)
        {
            string url = BaseUrl.TrimEnd('/') + path;
            using (var req = new UnityWebRequest(url, UnityWebRequest.kHttpVerbPOST))
            {
                req.uploadHandler = new UploadHandlerRaw(System.Text.Encoding.UTF8.GetBytes(corps));
                req.downloadHandler = new DownloadHandlerBuffer();
                MafiaCleanCity.ClientHttp.Json(req);
                MafiaCleanCity.ClientHttp.Authentifier(req, bearer);
                MafiaCleanCity.ClientHttp.Delai(req, TimeoutSeconds);
                yield return req.SendWebRequest();
                string corpsRefus = req.result == UnityWebRequest.Result.Success || req.downloadHandler == null ? null : req.downloadHandler.text;
                DernierePhraseDeRefus = MafiaCleanCity.I18n.RefusServi.Phrase(corpsRefus);
                DerniereCleDeRefus = MafiaCleanCity.I18n.RefusServi.Cle(corpsRefus);

                if (req.result == UnityWebRequest.Result.Success) onOk?.Invoke(req.downloadHandler.text);
                else onErr?.Invoke(req.responseCode, $"{path} failed ({req.responseCode}) {req.error}");
            }
        }
    }
}
