using System;
using UnityEngine.Networking;

namespace MafiaCleanCity
{
    /// <summary>LE POINT COMMUN des en-têtes d'une requête vers le back (TD-767) : jusque-là, `Authorization` était posé À LA MAIN sur 103 sites de
    /// 34 fichiers, `Idempotency-Key` sur 35, et l'en-tête de fond par son propre helper — chaque client recopiait le littéral, et un changement de
    /// schéma d'authentification ou de clé d'idempotence se faisait site par site. Maintenant : un seul endroit pose le jeton (`Authentifier`), la clé
    /// d'idempotence (`Idempotent`), la marque de fond (`Fond`), le type de contenu (`Json`) et le délai (`Delai`, TD-843) ; l'adresse reste celle d'`AdresseDuBack`.
    /// La garde de classe `ClientHttpPlayModeTests` G1 exige 0 littéral d'en-tête (`Authorization`, `Idempotency-Key`, `X-Mafia-Background`, `Content-Type`,
    /// `application/json`, `Bearer`), 0 affectation de `.timeout` et 0 `TimeoutSeconds = <nombre>` dans `Assets/Scripts` hors de ce fichier.
    ///
    /// Vit dans l'assembly `I18n` (sans référence, lue par toutes les autres — la place d'`AdresseDuBack`) : `I18nClient` en a besoin, et `ShellContracts`
    /// en dépend. MÉCANIQUE : aucune requête ne change d'octet — même nom d'en-tête, même valeur, posé sous la même condition qu'avant (jeton non vide).
    /// Chaque méthode rend la requête (chaînable), sauf `Idempotent` qui rend la clé émise.</summary>
    public static class ClientHttp
    {
        public const string EnTeteAutorisation = "Authorization";
        public const string EnTeteIdempotence = "Idempotency-Key";
        /// <summary>L'en-tête des appels de FOND (design L1 du back, nom et valeur figés le 26/09) : voir `EnTetesDuClient`.</summary>
        public const string EnTeteDeFond = "X-Mafia-Background";
        public const string ValeurDeFond = "1";
        public const string EnTeteTypeDeContenu = "Content-Type";
        public const string TypeJson = "application/json";
        /// <summary>Le délai d'une requête, en secondes RÉELLES — la valeur que portaient, chacun pour soi, les 35 clients (`TimeoutSeconds = 10`). Un client qui veut un
        /// autre délai (sondage, envoi de fichier) le donne EXPLICITEMENT à <see cref="Delai"/> ; aucun ne le fait aujourd'hui.</summary>
        public const int DelaiParDefautS = 10;

        /// <summary>`Authorization: Bearer <jeton>` — seulement quand le jeton est non vide (comme chacun des 103 sites le faisait).</summary>
        public static UnityWebRequest Authentifier(UnityWebRequest req, string bearer)
        {
            if (req != null && !string.IsNullOrEmpty(bearer)) req.SetRequestHeader(EnTeteAutorisation, "Bearer " + bearer);
            return req;
        }

        /// <summary>`Idempotency-Key` : un UUID v4 NEUF (mandat du back). Rend la clé émise (crochet de test, ou réémission identique).</summary>
        public static string Idempotent(UnityWebRequest req)
        {
            string cle = Guid.NewGuid().ToString();
            req?.SetRequestHeader(EnTeteIdempotence, cle);
            return cle;
        }

        /// <summary>`Idempotency-Key` posée telle quelle (clé déterministe d'un geste, clé rejouée d'un envoi précédent).</summary>
        public static UnityWebRequest IdempotentAvec(UnityWebRequest req, string cle)
        {
            req?.SetRequestHeader(EnTeteIdempotence, cle);
            return req;
        }

        /// <summary>`Content-Type: application/json` — le corps des mutations (42 sites le posaient à la main).</summary>
        public static UnityWebRequest Json(UnityWebRequest req)
        {
            req?.SetRequestHeader(EnTeteTypeDeContenu, TypeJson);
            return req;
        }

        /// <summary>Le délai de la requête (`UnityWebRequest.timeout`, secondes). Explicite : le site donne SON délai, le défaut du client étant <see cref="DelaiParDefautS"/>.</summary>
        public static UnityWebRequest Delai(UnityWebRequest req, int secondes)
        {
            if (req != null) req.timeout = secondes;
            return req;
        }

        /// <summary>Marque la requête comme un appel de FOND (minuterie) : le back ne la compte pas comme de l'activité du joueur.</summary>
        public static UnityWebRequest Fond(UnityWebRequest req)
        {
            req?.SetRequestHeader(EnTeteDeFond, ValeurDeFond);
            return req;
        }
    }
}
