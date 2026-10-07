using System;
using System.Collections;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Text.RegularExpressions;
using UnityEngine;
using UnityEngine.Networking;
using MafiaCleanCity.CityMap;

namespace MafiaCleanCity.Shell
{
    // B5 « UN COMPTE PAR APPAREIL » (f2 26/09, mini-spec approuvée ; corrections du back -51 ; noms de l'atelier, table 79 @f81ad7cb).
    // Avant : TOUS les APK jouaient le compte de démo (paire sérialisée dans Boot.unity, mot de passe compris). Désormais, dans un BUILD
    // JOUEUR, le premier lancement s'inscrit par la vraie route (`POST /v1/auth/signup`) sous un NOM DE FICTION, stocke sa paire sur
    // l'appareil, et se connecte avec aux lancements suivants. En éditeur, en test et en capture : rien ne change (`RegimeDIdentite`).
    //
    // L'ALGORITHME (révisé avec le back, `idempotency.interceptor.ts` : clé à portée anonyme, TTL 24 h, un 201 mémorisé se REJOUE) :
    //   · pas de paire stockée ⇒ générer (nom + secret) et STOCKER AVANT l'appel ⇒ signup(paire, clé K). K ne sert qu'à CET appel
    //     et n'est JAMAIS stockée : aucune clé ne franchit un lancement (un back remis à zéro ne rejoue pas un vieux 201). « Réessayer »
    //     repasse par la paire stockée, donc par un SIGNIN d'abord : une inscription aboutie dont la réponse s'est perdue est retrouvée.
    //   · paire stockée ⇒ SIGNIN d'abord :
    //       succès ⇒ c'est le compte ;
    //       401 AUTH_INVALID_CREDENTIALS (callsign inconnu OU mot de passe faux, anti-énumération) ⇒ signup(même paire, clé NEUVE) ;
    //       403 ACCOUNT_SUSPENDED | ACCOUNT_BANNED ⇒ ARRÊT : la phrase servie, AUCUN signup (sinon l'appli contourne la sanction) ;
    //       404 ACCOUNT_NOT_FOUND (tombstone, le callsign reste pris) ⇒ paire NEUVE directement ;
    //       5xx / réseau ⇒ on n'inscrit JAMAIS (une panne ne fabrique pas d'orphelin) : échec « Réessayer ».
    //   · signup 409 SIGNUP_CALLSIGN_TAKEN ⇒ d'abord un SIGNIN avec la paire (souvent NOTRE inscription aboutie dont la réponse s'est
    //     perdue) ; s'il réussit, c'est le compte ; sinon paire neuve (graine + 1), 2 fois au plus.
    //   · 409 IDEMPOTENCY_KEY_CONFLICT ⇒ clé neuve, une fois (ne devrait pas arriver : une clé = un corps).
    // Journaux : l'EMPREINTE seule (`DemoIdentityResolver.Empreinte`) — jamais le nom, jamais le secret.

    /// <summary>Où la paire vit sur l'appareil. PlayerPrefs en production (Android : stockage privé de l'appli, en clair — Keystore :
    /// TD-752) ; un dictionnaire en test.</summary>
    public interface IStockageDeCompte
    {
        string Lire(string cle);
        void Ecrire(string cle, string valeur);
    }

    public sealed class StockagePlayerPrefs : IStockageDeCompte
    {
        public string Lire(string cle) => PlayerPrefs.HasKey(cle) ? PlayerPrefs.GetString(cle) : null;
        public void Ecrire(string cle, string valeur) { PlayerPrefs.SetString(cle, valeur); PlayerPrefs.Save(); }
    }

    /// <summary>Une réponse d'auth réduite à ce qui décide : le jeton (2xx), sinon le code HTTP (0 = réseau), le `code` d'erreur servi et
    /// le corps brut (pour la phrase servie d'un refus).</summary>
    public sealed class ReponseDAuth
    {
        public string Jeton;
        public long Http;
        public string Code;
        public string Corps;
        public bool Ok => !string.IsNullOrEmpty(Jeton);
    }

    public interface IAuthDuCompte
    {
        IEnumerator SeConnecter(string identifiant, string secret, Action<ReponseDAuth> fin);
        IEnumerator SInscrire(string nom, string secret, string cleDIdempotence, Action<ReponseDAuth> fin);
    }

    /// <summary>Le transport réel : les deux routes d'auth, avec le code HTTP et le `code` servi (AuthClient ne rend qu'une chaîne).</summary>
    public sealed class AuthDuCompteHttp : IAuthDuCompte
    {
        public string BaseUrl = MafiaCleanCity.AdresseDuBack.Url;
        public int TimeoutSeconds = 10;
        private static readonly Regex CodeServi = new Regex("\"code\"\\s*:\\s*\"([A-Z0-9_]+)\"");

        public IEnumerator SeConnecter(string identifiant, string secret, Action<ReponseDAuth> fin) =>
            Poster("/v1/auth/signin", JsonUtility.ToJson(new SigninRequestDto { identifier = identifiant, password = secret }), null, fin);

        public IEnumerator SInscrire(string nom, string secret, string cleDIdempotence, Action<ReponseDAuth> fin) =>
            Poster("/v1/auth/signup", JsonUtility.ToJson(new InscriptionDto { callsign = nom, password = secret, locale = "fr" }), cleDIdempotence, fin);

        [Serializable] private class InscriptionDto { public string callsign; public string password; public string locale; }

        private IEnumerator Poster(string chemin, string corps, string cle, Action<ReponseDAuth> fin)
        {
            using (var req = new UnityWebRequest(BaseUrl.TrimEnd('/') + chemin, UnityWebRequest.kHttpVerbPOST))
            {
                req.uploadHandler = new UploadHandlerRaw(Encoding.UTF8.GetBytes(corps));
                req.downloadHandler = new DownloadHandlerBuffer();
                req.SetRequestHeader("Content-Type", "application/json");
                if (cle != null) MafiaCleanCity.ClientHttp.IdempotentAvec(req, cle);
                req.timeout = TimeoutSeconds;
                yield return req.SendWebRequest();
                var r = new ReponseDAuth { Http = req.responseCode, Corps = req.downloadHandler?.text };
                if (req.result == UnityWebRequest.Result.Success)
                {
                    try { r.Jeton = JsonUtility.FromJson<SigninEnvelope>(r.Corps)?.payload?.data?.access_token; }
                    catch (Exception) { r.Jeton = null; }
                }
                else if (!string.IsNullOrEmpty(r.Corps))
                {
                    Match m = CodeServi.Match(r.Corps);
                    if (m.Success) r.Code = m.Groups[1].Value;
                }
                fin?.Invoke(r);
            }
        }
    }

    /// <summary>Le nom public du joueur (« diégétique public » au back), composé « {A} {B} » des listes de l'atelier (table 79) :
    /// A = g mod |A|, B = (g div |A|) mod |B|. Pur et déterministe à graine donnée.</summary>
    public static class NomsDeJoueur
    {
        public const string CheminA = "NomsJoueur/A-noms-de-famille", CheminB = "NomsJoueur/B-sobriquets";
        // Les listes de l'atelier, IMMUABLES, chargées une fois : `static readonly Lazy`, pas un statique mutable — rien ne fuit d'une classe de
        // test à la suivante (garde EtatDuShell S1, créneau du 26/09 : `NomsDeJoueur.a/b` mutables y rougissaient, à raison).
        private static readonly Lazy<string[]> a = new Lazy<string[]>(() => Lire(Resources.Load<TextAsset>(CheminA)?.text));
        private static readonly Lazy<string[]> b = new Lazy<string[]>(() => Lire(Resources.Load<TextAsset>(CheminB)?.text));

        public static string[] Lire(string texte) =>
            (texte ?? "").Replace("\r", "").Split('\n').Where(l => l.Length > 0).ToArray();

        public static (string[] a, string[] b) Listes() => (a.Value, b.Value);

        public static string Composer(long graine, string[] listeA, string[] listeB)
        {
            if (listeA == null || listeB == null || listeA.Length == 0 || listeB.Length == 0) return null;
            long g = Math.Abs(graine);
            return listeA[g % listeA.Length] + " " + listeB[(g / listeA.Length) % listeB.Length];
        }

        public static string Composer(long graine) { var (la, lb) = Listes(); return Composer(graine, la, lb); }
    }

    /// <summary>L'issue d'une acquisition de compte.</summary>
    public sealed class IssueDuCompte
    {
        public enum Etat { Connecte, Echec, Sanctionne }
        public Etat Quoi;
        public string Jeton;
        public bool CompteNeuf;
        public string Empreinte;       // sha256 du nom, pour le journal P0
        public string PhraseServie;    // la phrase du refus (403), sinon null
        public int Inscriptions;       // signup émis dans ce lancement (gardes)
    }

    public static class CompteDeLAppareil
    {
        public const string CleNom = "mafia.appareil.callsign", CleSecret = "mafia.appareil.secret";
        public const int PairesNeuvesAuPlus = 2;

        /// <summary>Un secret de 32 caractères, tiré d'un générateur CRYPTOGRAPHIQUE.</summary>
        public static string SecretNeuf()
        {
            const string alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
            var octets = new byte[32];
            using (var rng = System.Security.Cryptography.RandomNumberGenerator.Create()) rng.GetBytes(octets);
            var sb = new StringBuilder(32);
            foreach (byte o in octets) sb.Append(alphabet[o % alphabet.Length]);
            return sb.ToString();
        }

        /// <summary>Une graine de nom, tirée du générateur cryptographique (jamais l'horloge : deux appareils au même instant).</summary>
        public static long GraineNeuve()
        {
            var octets = new byte[8];
            using (var rng = System.Security.Cryptography.RandomNumberGenerator.Create()) rng.GetBytes(octets);
            return BitConverter.ToInt64(octets, 0) & long.MaxValue;
        }

        /// <summary>L'algorithme d'en-tête de fichier. Tout est injecté : le transport, le stockage, la graine, le secret, la clé.</summary>
        public static IEnumerator Acquerir(IAuthDuCompte auth, IStockageDeCompte stockage, Func<long> graine, Func<string> secret,
                                           Func<string> cleNeuve, Action<IssueDuCompte> fin, Func<long, string> composer = null)
        {
            composer = composer ?? (g => NomsDeJoueur.Composer(g));
            var issue = new IssueDuCompte { Quoi = IssueDuCompte.Etat.Echec };
            string nom = stockage.Lire(CleNom), mdp = stockage.Lire(CleSecret);
            bool stockee = !string.IsNullOrEmpty(nom) && !string.IsNullOrEmpty(mdp);
            long g = graine();

            if (stockee)
            {
                ReponseDAuth s = null;
                yield return auth.SeConnecter(nom, mdp, r => s = r);
                if (s != null && s.Ok) { Finir(issue, IssueDuCompte.Etat.Connecte, s.Jeton, nom, false); fin(issue); yield break; }
                if (s != null && (s.Code == "ACCOUNT_SUSPENDED" || s.Code == "ACCOUNT_BANNED"))
                {
                    issue.Quoi = IssueDuCompte.Etat.Sanctionne;
                    issue.PhraseServie = MafiaCleanCity.I18n.RefusServi.Phrase(s.Corps);
                    issue.Empreinte = DemoIdentityResolver.Empreinte(nom);
                    fin(issue); yield break;
                }
                if (s == null || s.Http == 0 || s.Http >= 500 || (s.Http != 401 && s.Http != 404))
                {
                    Debug.LogWarning($"[CompteDeLAppareil] signin indisponible ({s?.Http}) : aucune inscription — « Réessayer »");
                    issue.Empreinte = DemoIdentityResolver.Empreinte(nom);
                    fin(issue); yield break;
                }
                if (s.Http == 404) { nom = null; }   // tombstone : le nom reste pris ⇒ paire neuve
            }

            if (string.IsNullOrEmpty(nom))
            {
                nom = composer(g); mdp = secret();
                if (string.IsNullOrEmpty(nom)) { Debug.LogError("[CompteDeLAppareil] listes de noms absentes"); fin(issue); yield break; }
                stockage.Ecrire(CleNom, nom); stockage.Ecrire(CleSecret, mdp);   // AVANT l'appel : une réponse perdue ne fait pas d'orphelin
            }

            string cle = cleNeuve();
            bool cleRenouvelee = false;
            for (int neuves = 0; ; )
            {
                ReponseDAuth u = null;
                issue.Inscriptions++;
                yield return auth.SInscrire(nom, mdp, cle, r => u = r);
                if (u != null && u.Ok) { Finir(issue, IssueDuCompte.Etat.Connecte, u.Jeton, nom, true); fin(issue); yield break; }
                if (u != null && u.Code == "IDEMPOTENCY_KEY_CONFLICT" && !cleRenouvelee) { cle = cleNeuve(); cleRenouvelee = true; continue; }
                if (u != null && u.Code == "SIGNUP_CALLSIGN_TAKEN")
                {
                    ReponseDAuth s = null;
                    yield return auth.SeConnecter(nom, mdp, r => s = r);
                    if (s != null && s.Ok) { Finir(issue, IssueDuCompte.Etat.Connecte, s.Jeton, nom, false); fin(issue); yield break; }
                    if (neuves >= PairesNeuvesAuPlus) break;
                    neuves++; g++;
                    nom = composer(g); mdp = secret(); cle = cleNeuve();
                    stockage.Ecrire(CleNom, nom); stockage.Ecrire(CleSecret, mdp);
                    continue;
                }
                break;   // réseau, 5xx, autre refus : « Réessayer » (la paire stockée resservira, par signin d'abord)
            }
            issue.Empreinte = DemoIdentityResolver.Empreinte(nom);
            Debug.LogWarning($"[CompteDeLAppareil] inscription impossible — identité={issue.Empreinte}");
            fin(issue);
        }

        private static void Finir(IssueDuCompte i, IssueDuCompte.Etat quoi, string jeton, string nom, bool neuf)
        {
            i.Quoi = quoi; i.Jeton = jeton; i.CompteNeuf = neuf; i.Empreinte = DemoIdentityResolver.Empreinte(nom);
            Debug.Log($"[CompteDeLAppareil] régime=appareil · {(neuf ? "compte neuf créé" : "compte de l'appareil")} sur {MafiaCleanCity.AdresseDuBack.Url} · identité={i.Empreinte}");
        }
    }

    /// <summary>Qui choisit le régime d'identité. Pur.</summary>
    public static class RegimeDIdentite
    {
        public enum Regime { Appareil, Existant }

        /// <summary>Appareil seulement dans un BUILD JOUEUR, sans identité posée explicitement. L'éditeur, les tests et la capture gardent le
        /// régime existant (paire de démo, MAFIA_DEMO_*, paire de capture) — inchangé.</summary>
        public static Regime Choisir(bool estEditeur, bool identiteExplicite) =>
            !estEditeur && !identiteExplicite ? Regime.Appareil : Regime.Existant;
    }
}
