using System.Collections;
using UnityEngine;

namespace MafiaCleanCity.CityMap
{
    // W3.U2 C7 (design §3 C7, D9 — U-14 : le seam de jeton). Ce chunk livre UNIQUEMENT le point
    // d'entrée data du diorama district-interior — SetSession + le fetch réel. La construction
    // visuelle (grille/socle/brume/sol, U-9) est le travail de C8, AJOUTÉ à CETTE MÊME classe au
    // chunk suivant (§3.0, graphe de dépendance : "C7 ──> C8").
    //
    // Décision D9 : « le diorama expose SetSession(bearer, districtId), appelé par son montant — le
    // MÊME contrat que les 4 panneaux W3.U1 » (HighestLeverageCard.SetPayload / ExceptionQueuePanel.
    // SetQueue / DailyReview.LoadReview / OrgVitalsPanel.FetchHeat). Cette classe n'appelle JAMAIS
    // AuthClient.SignIn/SignUp et ne porte AUCUN identifiant sérialisé — C7-F3 balaie CE fichier
    // exact pour ça (avec contrôle positif : le même motif retrouve les 8 sites d'auto-signin connus
    // ailleurs dans Assets/Scripts, D9's own measured table).
    //
    // Choix de signature (non prescrit par le design) : SetSession retourne IEnumerator, comme
    // LoadReview/FetchHeat — les DEUX précédents de D9 qui effectuent RÉELLEMENT un fetch (SetPayload/
    // SetQueue sont void parce qu'ils REÇOIVENT une donnée déjà obtenue par quelqu'un d'autre ; ici il
    // n'existe personne d'autre — la route doit être appelée par CETTE classe). Voir Tools/
    // w3u2-c7-notes.md § Deviations.
    public class DistrictInteriorScreenController : MonoBehaviour
    {
        [Header("Backend")]
        [SerializeField] private string baseUrl = "http://localhost";

        // ---- test hooks --------------------------------------------------------
        public DistrictInteriorDto LastFetch { get; private set; }
        public long LastErrorCode { get; private set; }
        public bool LastFetchSucceeded { get; private set; }

        private CityProjectionsClient projections;
        private bool initialized;

        private void Awake() => EnsureInitialized();

        private void EnsureInitialized()
        {
            if (initialized) return;
            initialized = true;
            projections = new CityProjectionsClient { BaseUrl = baseUrl };
        }

        /// <summary>U-14 (D9) — le seam d'injection : le montant fournit le porteur + le district
        /// cible ; cette méthode déclenche le VRAI fetch et ne se signe jamais elle-même.</summary>
        public IEnumerator SetSession(string bearer, int districtId)
        {
            EnsureInitialized();
            LastFetchSucceeded = false;
            LastErrorCode = 0;
            yield return projections.Interior(districtId, bearer,
                dto => { LastFetch = dto; LastFetchSucceeded = true; },
                code => LastErrorCode = code);
        }
    }
}
