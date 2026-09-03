using System;
using System.Collections;
using UnityEngine;
using UnityEngine.Networking;

namespace MafiaCleanCity.Operational
{
    // ㉜ « Ce que vous avez confié » — les cinq appels de l'écran du tableau de service.
    // Idiome enveloppe/payload/data + Idempotency-Key sur les mutations, patron `ReputationClient`
    // (㊲, la référence à deux juges).
    //
    //   GET  /v1/meta/task-categories          les 4 charges LIVE et leur état
    //   GET  /v1/lieutenants                   les NOMS (la première route n'en sert aucun)
    //   GET  /v1/meta/recall-preview/{int}     l'aperçu de reprise, six lignes
    //   POST /v1/meta/graduation               confier
    //   POST /v1/meta/recall                   reprendre
    //
    // ⛔ POURQUOI CE CLIENT LIT LE CORPS DES RÉPONSES D'ERREUR, ALORS QUE LE GABARIT NE LE FAISAIT
    // PAS. Sur cet écran, le refus EST une information de jeu, pas une panne : « cette charge
    // n'est pas encore prête » (422) et « vous avez déjà tranché aujourd'hui » (409) sont deux des
    // six cadres de la maquette. Le gabarit remontait `req.error` — soit la ligne de statut HTTP —
    // et l'écran aurait affiché « Unprocessable Entity » là où le serveur avait écrit une phrase.
    // On extrait donc `payload.error.{code,message}` et on les fait remonter séparément : le
    // `code` sert à DÉCIDER (jamais le texte, qui n'est pas un contrat), le `message` sert à
    // MONTRER tant qu'aucun libellé de jeu n'est écrit pour ce code.
    public class DelegationClient
    {
        public string BaseUrl = "http://localhost";
        public int TimeoutSeconds = 10;

        /// <summary>Ce qu'un refus rend à l'appelant : le code métier du back (stable, décidable),
        /// son message (montrable), et le statut HTTP. `code` vaut `null` quand l'échec est
        /// TRANSPORT (pas de réseau, délai dépassé) — un cas qui ne se confond donc jamais avec un
        /// refus métier, alors qu'un simple entier les mélangeait.</summary>
        public struct Refus
        {
            public long statut;
            public string code;
            public string message;

            public bool EstMetier => !string.IsNullOrEmpty(code);
        }

        // ═══ Lecture ═════════════════════════════════════════════════════════════════════════

        public IEnumerator GetMetaTaskCategories(string bearer,
            Action<GetMetaTaskCategoriesResponseDto> onOk, Action<Refus> onErr)
        {
            using (UnityWebRequest req = UnityWebRequest.Get(Url("/v1/meta/task-categories")))
            {
                Preparer(req, bearer);
                yield return req.SendWebRequest();
                if (Reussi(req))
                {
                    GetMetaTaskCategoriesResponseDto dto =
                        JsonUtility.FromJson<GetMetaTaskCategoriesEnvelope>(req.downloadHandler.text)?.payload?.data;
                    if (dto == null) { onErr?.Invoke(CorpsVide(req, "task-categories")); yield break; }
                    onOk?.Invoke(dto);
                }
                else onErr?.Invoke(Lire(req));
            }
        }

        public IEnumerator GetLieutenants(string bearer,
            Action<GetLieutenantsResponseDto> onOk, Action<Refus> onErr)
        {
            using (UnityWebRequest req = UnityWebRequest.Get(Url("/v1/lieutenants")))
            {
                Preparer(req, bearer);
                yield return req.SendWebRequest();
                if (Reussi(req))
                {
                    GetLieutenantsResponseDto dto =
                        JsonUtility.FromJson<GetLieutenantsEnvelope>(req.downloadHandler.text)?.payload?.data;
                    if (dto == null) { onErr?.Invoke(CorpsVide(req, "lieutenants")); yield break; }
                    onOk?.Invoke(dto);
                }
                else onErr?.Invoke(Lire(req));
            }
        }

        /// <summary>⛔ `categoryId` EST UN `int`, ET LE TYPE C# EST LE CORRECTIF. Le gabarit
        /// générait `string categoryId` (il dérive la signature du chemin, où tout est texte).
        /// Le back, lui, décode ce segment avec `@Param('categoryId', IntParam)`
        /// (`meta-progression.controller.ts:184`) : mesuré, `/v1/meta/recall-preview/ROUTE_ASSIGNMENT`
        /// rend 422 « categoryId must be an integer ». Laisser une `string` ici, c'est laisser un
        /// appelant passer la clé de catégorie — la faute EXACTE que la maquette invitait à faire,
        /// puisqu'elle ne connaît que des noms. Le compilateur la rend maintenant impossible.</summary>
        public IEnumerator GetMetaRecallPreview(string bearer, int categoryId,
            Action<GetMetaRecallPreviewResponseDto> onOk, Action<Refus> onErr)
        {
            using (UnityWebRequest req = UnityWebRequest.Get(
                Url("/v1/meta/recall-preview/") + categoryId.ToString(System.Globalization.CultureInfo.InvariantCulture)))
            {
                Preparer(req, bearer);
                yield return req.SendWebRequest();
                if (Reussi(req))
                {
                    GetMetaRecallPreviewResponseDto dto =
                        JsonUtility.FromJson<GetMetaRecallPreviewEnvelope>(req.downloadHandler.text)?.payload?.data;
                    if (dto == null) { onErr?.Invoke(CorpsVide(req, "recall-preview")); yield break; }
                    onOk?.Invoke(dto);
                }
                else onErr?.Invoke(Lire(req));
            }
        }

        // ═══ Mutations — les deux qui puisent au MÊME jeton de structure ═════════════════════

        public IEnumerator PostMetaGraduation(string bearer, PostMetaGraduationBody corps,
            Action<PostMetaGraduationResponseDto> onOk, Action<Refus> onErr)
        {
            using (UnityWebRequest req = Poster("/v1/meta/graduation", corps, bearer))
            {
                yield return req.SendWebRequest();
                if (Reussi(req))
                {
                    PostMetaGraduationResponseDto dto =
                        JsonUtility.FromJson<PostMetaGraduationEnvelope>(req.downloadHandler.text)?.payload?.data;
                    if (dto == null) { onErr?.Invoke(CorpsVide(req, "graduation")); yield break; }
                    onOk?.Invoke(dto);
                }
                else onErr?.Invoke(Lire(req));
            }
        }

        public IEnumerator PostMetaRecall(string bearer, PostMetaRecallBody corps,
            Action<PostMetaRecallResponseDto> onOk, Action<Refus> onErr)
        {
            using (UnityWebRequest req = Poster("/v1/meta/recall", corps, bearer))
            {
                yield return req.SendWebRequest();
                if (Reussi(req))
                {
                    PostMetaRecallResponseDto dto =
                        JsonUtility.FromJson<PostMetaRecallEnvelope>(req.downloadHandler.text)?.payload?.data;
                    if (dto == null) { onErr?.Invoke(CorpsVide(req, "recall")); yield break; }
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
            // L'`IdempotencyInterceptor` global du back l'honore sur toute mutation, qu'un
            // `@Idempotent` explicite soit posé ou non sur le contrôleur (patron `DailyReviewClient`).
            // Une clé NEUVE par appel : réutiliser celle d'un appel précédent ferait rejouer sa
            // réponse, donc afficher un succès pour un geste jamais tenté.
            req.SetRequestHeader("Idempotency-Key", Guid.NewGuid().ToString());
            Preparer(req, bearer);
            return req;
        }

        /// <summary>Extrait `payload.error` du CORPS de la réponse. Un corps illisible (proxy,
        /// coupure) laisse `code` vide, donc `EstMetier == false` : l'appelant distingue alors un
        /// refus du serveur d'une panne de transport sans avoir à interpréter un statut.</summary>
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
                message = err != null && !string.IsNullOrEmpty(err.message)
                    ? err.message
                    : $"{req.url} — {req.error}",
            };
        }

        /// <summary>200 avec un `payload.data` absent : ce n'est pas un refus du serveur, c'est un
        /// corps qui n'a pas la forme attendue. On le NOMME plutôt que de le faire passer pour un
        /// refus métier — sinon l'écran affiche « pas encore prête » sur une réponse vide.</summary>
        private static Refus CorpsVide(UnityWebRequest req, string quoi) => new Refus
        {
            statut = req.responseCode,
            code = null,
            message = $"corps vide ou illisible ({quoi})",
        };
    }
}
