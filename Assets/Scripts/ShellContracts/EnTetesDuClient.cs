using UnityEngine.Networking;

namespace MafiaCleanCity.Shell
{
    /// <summary>L'EN-TÊTE DES APPELS DE FOND (design L1 du back, nom figé le 26/09 : `X-Mafia-Background: 1`). Le back compte comme
    /// « activité du joueur » toute requête authentifiée, SAUF celles qui portent cet en-tête. ⛔ RÈGLE (f2, 07/10, revue du design L1 B-5) : l'en-tête se pose QUAND L'APPLICATION EST EN ARRIÈRE-PLAN
    /// (pause, ou perte de focus Unity), et JAMAIS parce que la requête est périodique. Un joueur qui LIT un écran n'envoie que l'horloge légère : si elle portait l'en-tête au premier plan, son monde
    /// s'arrêterait au bout de 240 min alors qu'il a les yeux dessus. Au premier plan, l'horloge légère comme toute autre requête part SANS l'en-tête (<see cref="MarquerSelonLePlan"/>).
    /// (Avant le 07/10 la règle était « la minuterie le porte, et elle seule » — fausse pour l'horloge de lecture.) UN seul helper pour tout le client (accord CLIENT-1 / CLIENT-2, 26/09).</summary>
    public static class EnTetesDuClient
    {
        public const string Fond = MafiaCleanCity.ClientHttp.EnTeteDeFond;   // TD-767 : le littéral vit dans le client commun
        public const string ValeurFond = MafiaCleanCity.ClientHttp.ValeurDeFond;

        /// <summary>LA règle : la requête est marquée « fond » SI ET SEULEMENT SI l'application est en arrière-plan. Premier plan ⇒ aucun en-tête. Rend la requête (chaînable).</summary>
        public static UnityWebRequest MarquerSelonLePlan(UnityWebRequest req, bool enArrierePlan)
        {
            return enArrierePlan ? MarquerFond(req) : req;
        }

        /// <summary>Marque la requête comme un appel de FOND, sans condition — réservé à `MarquerSelonLePlan` et aux tests de l'en-tête lui-même. Rend la requête (chaînable).</summary>
        public static UnityWebRequest MarquerFond(UnityWebRequest req)
        {
            return MafiaCleanCity.ClientHttp.Fond(req);
        }
    }
}
