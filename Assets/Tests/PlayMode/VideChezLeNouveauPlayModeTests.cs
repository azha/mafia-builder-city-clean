using System.Collections;
using System.Collections.Generic;
using MafiaCleanCity.Shell;
using MafiaCleanCity.CityMap;
using NUnit.Framework;
using UnityEngine;
using UnityEngine.TestTools;

namespace MafiaCleanCity.Tests
{
    /// <summary>Quelles collections sont VIDES chez un joueur qui vient de s'inscrire.
    ///
    /// ⛔⛔ POURQUOI CE TEST EXISTE, ET POURQUOI LE COMPTE DE DÉMO NE PEUT PAS Y RÉPONDRE.
    /// Neuf contrôleurs rendent une collection **sans aucun message d'état vide** (mesuré le
    /// 2026-09-07 sur les 37 contrôleurs du client). La question « est-ce grave ? » se réduit à
    /// « cette collection peut-elle être vide chez un vrai joueur ? » — et **le compte de démo est
    /// incapable d'y répondre : il est riche, donc aucune collection n'y est vide.** *La classe est
    /// structurellement INVISIBLE sur le compte qui sert à tout mesurer.*
    /// ⇒ Le seul état dont on sait avec certitude qu'il existe pour un joueur est **le premier** :
    /// ce que le welcome grant donne, et rien d'autre. Une zone blanche à l'inscription est le seul
    /// endroit du jeu où « vide » est GARANTI.
    ///
    /// ⚠️ ET C'EST UN PLANCHER, PAS UN PLAFOND, et le dire fait partie de la mesure : une collection
    /// NON vide chez le nouveau peut se vider plus tard (tout démolir, tout perdre, une saison qui
    /// se termine). Ce test prouve donc « vide au moins ici » ; il ne prouve jamais « jamais vide ».
    ///
    /// ⛔ IL N'ASSERTE RIEN SUR LE CONTENU — il MESURE et il PUBLIE. Asserter « non vide » ferait
    /// rougir le jour où le grant change, sur une propriété que personne n'a décidée ; asserter
    /// « vide » figerait un défaut. La seule garde est **anti-vacuité** : si RIEN n'a pu être lu,
    /// le test échoue, parce qu'un relevé silencieux se lit comme « tout va bien ».</summary>
    [Category("VideChezLeNouveau")]
    public class VideChezLeNouveauPlayModeTests
    {
        private const string BaseUrl = "http://localhost";
        private static int callsignSeq;

        [UnityTest]
        public IEnumerator Vide_ChezUnCompteNEUF_QuellesCollectionsSontVides()
        {
            string token = null, err = null;
            var auth = new AuthClient { BaseUrl = BaseUrl };
            yield return auth.SignUp(SeederSupport.SafeCallsign("vide-neuf", ref callsignSeq),
                                     "vide-neuf-pw", t => token = t, e => err = e);
            Assert.IsNull(err, $"signup errored: {err}");
            Assert.IsNotNull(token, "⛔ pas de jeton — rien de ce qui suit ne mesurerait quoi que ce soit");

            var session = new SessionClient { BaseUrl = BaseUrl };
            SessionOpenDto ouverture = null;
            yield return session.OpenSession(token, "e2e-vide-neuf", d => ouverture = d,
                (c, m) => Assert.Fail($"session/open a échoué : {c}: {m}"));
            Assert.IsNotNull(ouverture, "session/open doit réussir — c'est elle qui octroie le kit de départ");

            // nom de la collection → (compte, ou null si la route n'a pas répondu)
            var releve = new List<string>();
            int lues = 0;

            var conflit = new MafiaCleanCity.Operational.ConflitClient { BaseUrl = BaseUrl };
            MafiaCleanCity.Operational.GetEngagementsResponseDto eng = null;
            string engErr = null;
            yield return conflit.GetEngagements(token, d => eng = d, (c, m) => engErr = $"{c}: {m}");
            releve.Add(Ligne("ConflitScreenController", "engagements", eng?.engagements?.Length, engErr, ref lues));

            var loi = new MafiaCleanCity.Operational.LoiClient { BaseUrl = BaseUrl };
            MafiaCleanCity.Operational.GetLegalResponseDto legal = null;
            string legalErr = null;
            yield return loi.GetLegal(token, d => legal = d, (c, m) => legalErr = $"{c}: {m}");
            releve.Add(Ligne("LoiScreenController", "activeCases", legal?.activeCases?.Length, legalErr, ref lues));
            releve.Add(Ligne("LoiScreenController", "lawyerRoster", legal?.lawyerRoster?.Length, legalErr, ref lues));

            var distrib = new MafiaCleanCity.Operational.DistributionClient { BaseUrl = BaseUrl };
            MafiaCleanCity.Operational.GetOperationalCouriersResponseDto cour = null;
            string courErr = null;
            yield return distrib.GetOperationalCouriers(token, d => cour = d, (c, m) => courErr = $"{c}: {m}");
            releve.Add(Ligne("DistributionScreenController", "couriers", cour?.couriers?.Length, courErr, ref lues));

            var appro = new MafiaCleanCity.Operational.ChaineDApproClient { BaseUrl = BaseUrl };
            MafiaCleanCity.Operational.GetSupplyChainGraphResponseDto graphe = null;
            string grapheErr = null;
            yield return appro.GetSupplyChainGraph(token, d => graphe = d, (c, m) => grapheErr = $"{c}: {m}");
            releve.Add(Ligne("ChaineDApproScreenController", "nodes", graphe?.nodes?.Length, grapheErr, ref lues));
            releve.Add(Ligne("ChaineDApproScreenController", "legs", graphe?.legs?.Length, grapheErr, ref lues));

            var exc = new MafiaCleanCity.Operational.Exceptions.ExceptionsClient { BaseUrl = BaseUrl };
            MafiaCleanCity.Operational.Exceptions.ExceptionCardDto[] file = null;
            string excErr = null;
            yield return exc.GetQueue(token, d => file = d, (c, m) => excErr = $"{c}: {m}");
            releve.Add(Ligne("ExceptionDetailController", "queue", file?.Length, excErr, ref lues));

            // ── LES 8 CANDIDATS DU SECOND BALAYAGE (2026-09-07) ──────────────────────────────
            // ⚠️ CANDIDATS, pas findings : ils ne portent AUCUN littéral d'état vide, ce qui ne dit
            //    pas qu'ils rendent une zone blanche. Plusieurs sont du chrome ou des fiches d'objet
            //    UNIQUE, où « collection vide » n'a peut-être aucun sens. On sonde ce qui est
            //    sondable SANS identifiant, et on écrit « non établi » pour le reste — *une case
            //    « non établi » est pleine, pas un échec*, et la remplir au jugé dans le sens
            //    rassurant serait la même faute que de la remplir dans le sens alarmant.
            var monde = new WorldApiClient { BaseUrl = BaseUrl };
            List<DistrictDto> districts = null; string dErr = null;
            yield return monde.GetDistricts(d => districts = d, e => dErr = e);
            releve.Add(Ligne("CityMapController · OrgVitalsPanel", "districts", districts?.Count, dErr, ref lues));

            var blanch = new MafiaCleanCity.Operational.LaunderingClient { BaseUrl = BaseUrl };
            MafiaCleanCity.Operational.LaunderingNodesDto noeuds = null; string bErr = null;
            yield return blanch.GetLaunderingNodes(token, d => noeuds = d, (c, m) => bErr = $"{c}: {m}");
            // ⛔⛔ ET CETTE LIGNE NE PARLE PAS DE CES DEUX ÉCRANS — je l'écris parce que je l'ai
            //    d'abord crue. `LaunderingController` et `PipelineOverviewController` travaillent
            //    sur UN nœud DÉSIGNÉ (`GetLaunderingPipeline(id, …)`, `[Header("Target laundering
            //    node")]`), pas sur la collection. Un `nodes = 0` est donc un fait sur la ROUTE,
            //    jamais sur leur rendu.
            //    ⇒ *J'ai attribué une collection à un écran d'après le CLIENT qu'il construit, pas
            //      d'après ce qu'il LIT.* Construire un client ne dit pas quelle route on appelle,
            //      ni avec quels arguments — c'est la même faute que d'apparier par proximité.
            releve.Add(Ligne("route /laundering/nodes (AUCUN écran ne la rend en liste)", "nodes",
                             noeuds?.nodes?.Length, bErr, ref lues));

            // ⛔ NON SONDABLES SANS IDENTIFIANT — écrits, pas devinés.
            releve.Add("BuildingCardController           (fiche)        ⛔ NON ÉTABLI — exige un buildingId");
            releve.Add("LaunderingController             (fiche)        ⛔ NON ÉTABLI — rend UN nœud désigné");
            releve.Add("PipelineOverviewController       (fiche)        ⛔ NON ÉTABLI — rend UN nœud désigné");
            releve.Add("ExceptionDetailController        (fiche)        ⛔ NON ÉTABLI — exige un exceptionId");
            releve.Add("DashboardController              (chrome)       ⛔ NON ÉTABLI — pas de collection isolée");
            releve.Add("HomeChromeController             (chrome)       ⛔ NON ÉTABLI — aucun client, pur chrome");

            Debug.Log("[VIDE-NEUF] collections d'un compte qui vient de s'inscrire :\n  "
                      + string.Join("\n  ", releve));

            // ⛔ GARDE ANTI-VACUITÉ, et c'est la SEULE assertion : un relevé où rien n'a pu être lu
            //    se lirait « tout va bien » alors qu'il ne mesure rien. On n'asserte NI vide NI plein —
            //    ce sont des faits à publier, pas des propriétés à figer.
            Assert.Greater(lues, 0,
                "⛔ AUCUNE collection n'a pu être lue : le relevé serait vide de sens. Ce n'est pas "
                + "« rien à signaler », c'est « rien mesuré ».");
        }

        private static string Ligne(string ecran, string champ, int? compte, string err, ref int lues)
        {
            if (err != null) return $"{ecran,-32} {champ,-14} ⛔ NON ÉTABLI — la route a répondu {err}";
            if (compte == null) return $"{ecran,-32} {champ,-14} ⛔ NON ÉTABLI — champ absent de la réponse";
            lues++;
            return $"{ecran,-32} {champ,-14} {compte} élément(s){(compte == 0 ? "   ⚠️ VIDE chez le nouveau" : "")}";
        }
    }
}
