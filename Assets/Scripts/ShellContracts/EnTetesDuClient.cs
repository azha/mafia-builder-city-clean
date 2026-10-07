using UnityEngine.Networking;

namespace MafiaCleanCity.Shell
{
    /// <summary>L'EN-TÊTE DES APPELS DE FOND (design L1 du back, nom figé le 26/09 : `X-Mafia-Background: 1`). Le back compte comme
    /// « activité du joueur » toute requête authentifiée, SAUF celles qui portent cet en-tête : un appel émis par une MINUTERIE
    /// (InvokeRepeating, coroutine en boucle) le porte, et lui seul. Les appels du lancement, du retour au premier plan et du montage
    /// d'un écran sont de l'activité (back -51, 26/09) : ils ne le portent PAS. UN seul helper pour tout le client (accord CLIENT-1 /
    /// CLIENT-2, 26/09) ; la garde de CLASSE qui exige son appel sur chaque site de minuterie est écrite par CLIENT-2.
    /// Population au 26/09 : 0 site (l'horloge légère C4, seul site périodique prévu, l'appellera dès son premier commit).</summary>
    public static class EnTetesDuClient
    {
        public const string Fond = "X-Mafia-Background";
        public const string ValeurFond = "1";

        /// <summary>Marque la requête comme un appel de FOND. Rend la requête (chaînable).</summary>
        public static UnityWebRequest MarquerFond(UnityWebRequest req)
        {
            req?.SetRequestHeader(Fond, ValeurFond);
            return req;
        }
    }
}
