using System;
using System.Collections;
using System.Text;
using UnityEngine;
using UnityEngine.Networking;

namespace MafiaCleanCity.CityMap
{
    // Minimal auth client: real sign-in against the game-back auth surface
    // (POST /v1/auth/signin → HS256 Bearer token, audience GAME_BACK). No mock.
    //
    // /auth is a literal path prefix routed by Traefik (NOT under /v1). The token
    // is required to read the JWT-gated city-sim projections (e.g. heat).
    public class AuthClient
    {
        public string BaseUrl = "http://localhost";
        public int TimeoutSeconds = 10;

        public string SigninUrl => BaseUrl.TrimEnd('/') + "/v1/auth/signin";

        /// <summary>
        /// Coroutine: sign in with an identifier (email or callsign) + password.
        /// On success invokes onSuccess with the Bearer access_token; else onError.
        /// </summary>
        public IEnumerator SignIn(string identifier, string password,
            Action<string> onSuccess, Action<string> onError)
        {
            string body = JsonUtility.ToJson(new SigninRequestDto { identifier = identifier, password = password });

            using (var req = new UnityWebRequest(SigninUrl, UnityWebRequest.kHttpVerbPOST))
            {
                req.uploadHandler = new UploadHandlerRaw(Encoding.UTF8.GetBytes(body));
                req.downloadHandler = new DownloadHandlerBuffer();
                req.SetRequestHeader("Content-Type", "application/json");
                req.timeout = TimeoutSeconds;

                yield return req.SendWebRequest();

                if (req.result != UnityWebRequest.Result.Success)
                {
                    onError?.Invoke($"POST {SigninUrl} failed: {req.result} ({req.responseCode}) {req.error}");
                    yield break;
                }

                string token;
                try
                {
                    SigninEnvelope env = JsonUtility.FromJson<SigninEnvelope>(req.downloadHandler.text);
                    token = env?.payload?.data?.access_token;
                }
                catch (Exception ex)
                {
                    onError?.Invoke($"Failed to parse signin response: {ex.Message}");
                    yield break;
                }

                if (string.IsNullOrEmpty(token))
                {
                    onError?.Invoke("Signin succeeded but no access_token in response");
                    yield break;
                }

                onSuccess?.Invoke(token);
            }
        }
    }
}
