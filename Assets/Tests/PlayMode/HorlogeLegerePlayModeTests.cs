using System;
using System.Collections;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text.RegularExpressions;
using NUnit.Framework;
using UnityEngine;
using MafiaCleanCity.Shell;

namespace MafiaCleanCity.CityMap.Tests
{
    // C4 (CLIENT-1, contrat de f2 du 07/10, back lot/l1 58e3db52) — L'HORLOGE LÉGÈRE : `GET /v1/me/clock`, appel de FOND. HORS RÉSEAU.
    //   H1  les sept clés se lisent dans le corps brut, à plat ou dans l'enveloppe ; 0 n'est pas null
    //   H2  forme G : `family_day` / `opened_family_day` à null ⇒ lus null (présents, pas absents) ; un back sans la route ⇒ rien d'inventé
    //   H3  la requête : GET `/v1/me/clock`, jeton, ET `X-Mafia-Background` valant EXACTEMENT « 1 » (l'octet : « true », « 0 », vide, « yes »
    //       comptent comme de l'activité côté back)
    //   H4  GARDE DE CLASSE : tout fichier du client qui nomme `/v1/me/clock` marque la requête par `EnTetesDuClient.MarquerFond` ; les
    //       constantes sont le nom et la valeur du contrat ; le contrôle positif voit un site qui l'oublie
    //   H5  les deux jours décident : différents ⇒ close PUIS open ; égaux, ou l'un des deux null ⇒ aucune requête
    //   H6  la boucle d'AppShell : cadence de 30 à 60 s, arrêtée en arrière-plan, démarrée après l'ouverture (lu dans la source)
    [Category("HorlogeLegere")]
    public class HorlogeLegerePlayModeTests
    {
        private const string CorpsPlat =
            "{\"game_minute\":1234.5,\"game_day\":2,\"day_phase\":\"DUSK\",\"family_day\":44,\"opened_family_day\":43," +
            "\"real_seconds_per_game_minute\":2,\"in_game_day_length_minutes\":1440}";

        [Test]
        public void H1_LesSeptCles_SeLisentDansLeCorpsBrut_APlatOuDansLEnveloppe()
        {
            foreach (string corps in new[] { CorpsPlat, "{\"payload\":{\"data\":" + CorpsPlat + "}}" })
            {
                HorlogeLegereDto h = HorlogeLegere.Lire(corps);
                Assert.IsNotNull(h);
                Assert.AreEqual(7, h.ClesServies, "les sept clés du contrat sont comptées");
                Assert.AreEqual(1234.5, h.GameMinute);
                Assert.AreEqual(2, h.GameDay);
                Assert.AreEqual("DUSK", h.PhaseDuJour);
                Assert.AreEqual(44, h.JourDeFamille);
                Assert.AreEqual(43, h.JourDOuvertureDeFamille, "`opened_family_day` n'est pas pris pour `family_day` (quote-bornés)");
                Assert.AreEqual(2.0, h.SecondesParMinuteDeJeu);
                Assert.AreEqual(1440, h.MinutesParJourDeJeu);
            }
            Assert.AreEqual("family_day", CycleDeSession.ChampsServis.JourDeFamille, "noms CONFIRMÉS par le back (07/10), recopiés : session/open et horloge");
            Assert.AreEqual("opened_family_day", CycleDeSession.ChampsServis.JourDeFamilleALOuverture);
            Assert.AreEqual(HorlogeLegere.Cles.JourDeFamille, CycleDeSession.ChampsServis.JourDeFamille, "une seule orthographe pour les deux routes");
            Assert.AreEqual(HorlogeLegere.Cles.JourDOuverture, CycleDeSession.ChampsServis.JourDeFamilleALOuverture);
            Assert.AreEqual(0, HorlogeLegere.Lire(CorpsPlat.Replace("\"family_day\":44", "\"family_day\":0")).JourDeFamille,
                "le jour 0 est un jour, pas un null");
            Assert.AreEqual(2, HorlogeLegere.Lire(CorpsPlat).GameDay, "`game_day` n'est pas pris dans `in_game_day_length_minutes`");
        }

        [Test]
        public void H2_FormeG_LesDeuxNullables_SontNullsPresents_UnBackSansLaRoute_RienDInvente()
        {
            string nuls = CorpsPlat.Replace("\"family_day\":44", "\"family_day\":null").Replace("\"opened_family_day\":43", "\"opened_family_day\":null");
            HorlogeLegereDto h = HorlogeLegere.Lire(nuls);
            Assert.IsNull(h.JourDeFamille);
            Assert.IsNull(h.JourDOuvertureDeFamille);
            Assert.IsTrue(h.JourDeFamilleServi && h.JourDOuvertureServi, "null SERVI ≠ clé absente");
            Assert.AreEqual(7, h.ClesServies);

            HorlogeLegereDto partiel = HorlogeLegere.Lire("{\"game_day\":3}");
            Assert.IsNotNull(partiel);
            Assert.IsFalse(partiel.JourDeFamilleServi || partiel.JourDOuvertureServi, "clé absente ≠ null servi");
            Assert.AreEqual(1, partiel.ClesServies);
            Assert.IsNull(HorlogeLegere.Lire("{}"), "aucune des sept clés : pas de DTO inventé");
            Assert.IsNull(HorlogeLegere.Lire(""));
            Assert.IsNull(HorlogeLegere.Lire(null));
        }

        [Test]
        public void H3_LaRequete_PorteLEnTeteDeFond_ValantExactementUn()
        {
            Assert.AreEqual("X-Mafia-Background", EnTetesDuClient.Fond);
            Assert.AreEqual("1", EnTetesDuClient.ValeurFond, "« 1 » à l'octet");
            Assert.AreEqual(1, EnTetesDuClient.ValeurFond.Length);
            Assert.IsNull(EnTetesDuClient.MarquerFond(null), "null en, null out : pas d'exception");

            var client = new HorlogeLegereClient { BaseUrl = "http://hote:3000/" };
            using (UnityEngine.Networking.UnityWebRequest req = client.Construire("jeton-x"))
            {
                Assert.AreEqual("http://hote:3000/v1/me/clock", req.url);
                Assert.AreEqual("GET", req.method);
                Assert.AreEqual("1", req.GetRequestHeader("X-Mafia-Background"), "l'appel de fond se déclare, valeur EXACTE");
                Assert.AreEqual("Bearer jeton-x", req.GetRequestHeader("Authorization"));
            }
        }

        // ── H4 — la garde de classe ───────────────────────────────────────────────────────────────────────────────────────────────

        /// <summary>Les fichiers qui nomment la route légère mais ne marquent pas la requête. Pure.</summary>
        internal static List<string> SitesSansMarquerFond(IEnumerable<(string nom, string source)> sources) =>
            sources.Where(s => s.source.Contains("/v1/me/clock") && !s.source.Contains("EnTetesDuClient.MarquerFond("))
                   .Select(s => s.nom).OrderBy(n => n).ToList();

        [Test]
        public void H4_GardeDeClasse_TouteRequeteDeLaRouteLegere_EstMarqueeFond()
        {
            CollectionAssert.AreEqual(new[] { "Oublie.cs" },
                SitesSansMarquerFond(new[]
                {
                    ("Oublie.cs", "var u = base + \"/v1/me/clock\"; UnityWebRequest.Get(u);"),
                    ("Marque.cs", "var u = base + \"/v1/me/clock\"; return EnTetesDuClient.MarquerFond(UnityWebRequest.Get(u));"),
                    ("Autre.cs", "var u = base + \"/v1/me/wallet\";"),
                }), "contrôle positif : l'oubli est vu ; le site marqué et l'autre route non");

            var sources = Directory.GetFiles(Path.Combine(Application.dataPath, "Scripts"), "*.cs", SearchOption.AllDirectories)
                .Select(f => (Path.GetFileName(f), File.ReadAllText(f))).ToList();
            var nommeurs = sources.Where(s => s.Item2.Contains("/v1/me/clock")).Select(s => s.Item1).ToList();
            CollectionAssert.AreEqual(new[] { "HorlogeLegere.cs" }, nommeurs, "anti-vacuité : la route légère n'est nommée qu'à UN endroit");
            Assert.IsEmpty(SitesSansMarquerFond(sources), "un appel de la route légère sans `MarquerFond` serait compté comme de l'ACTIVITÉ");
        }

        // ── H5 — les deux jours décident ──────────────────────────────────────────────────────────────────────────────────────────

        private sealed class TransportTemoin : ITransportDeSession
        {
            public readonly List<string> Requetes = new List<string>();
            public IEnumerator Fermer(string jeton, Action<long, string> echec) { Requetes.Add("close"); yield break; }
            public IEnumerator Ouvrir(string jeton, Action<SessionOpenDto> ok, Action<long, string> echec)
            {
                Requetes.Add("open");
                ok(new SessionOpenDto { session_id = "s" });
                yield break;
            }
        }

        private static void Derouler(IEnumerator racine)
        {
            var pile = new Stack<IEnumerator>();
            pile.Push(racine);
            while (pile.Count > 0)
            {
                if (!pile.Peek().MoveNext()) { pile.Pop(); continue; }
                if (pile.Peek().Current is IEnumerator imbriquee) pile.Push(imbriquee);
            }
        }

        private static List<string> Requetes(string famille, string ouverture)
        {
            string corps = CorpsPlat.Replace("\"family_day\":44", "\"family_day\":" + famille)
                                    .Replace("\"opened_family_day\":43", "\"opened_family_day\":" + ouverture);
            HorlogeLegereDto h = HorlogeLegere.Lire(corps);
            var t = new TransportTemoin();
            Derouler(CycleDeSession.SurLecture("j", t, h.JourDeFamille, h.JourDOuvertureDeFamille, _ => { }, Assert.Fail));
            return t.Requetes;
        }

        [Test]
        public void H5_LesDeuxJoursDecident_DifferentsFermentPuisOuvrent_EgauxOuNullsRienFont()
        {
            CollectionAssert.AreEqual(new[] { "close", "open" }, Requetes("44", "43"), "jour de la famille ≠ jour d'ouverture");
            CollectionAssert.AreEqual(new[] { "close", "open" }, Requetes("0", "43"), "le jour 0 compte comme un jour");
            Assert.IsEmpty(Requetes("43", "43"), "égaux : aucune requête");
            Assert.IsEmpty(Requetes("null", "43"), "pas d'ancre de naissance : rien");
            Assert.IsEmpty(Requetes("44", "null"), "pas de session active : rien");
            Assert.IsEmpty(Requetes("null", "null"));
        }

        // ── H6 — la boucle d'AppShell, lue dans la source ─────────────────────────────────────────────────────────────────────────

        [Test]
        public void H6_LaBoucle_Cadence30a60s_ArreteeEnArrierePlan_DemarreeApresLOuverture()
        {
            string app = File.ReadAllText(Path.Combine(Application.dataPath, "Scripts", "Shell", "AppShell.cs"));
            var cadence = Regex.Match(app, @"CadenceDeLHorlogeS\s*=\s*(\d+)f");
            Assert.IsTrue(cadence.Success, "la cadence est lue dans la source");
            int s = int.Parse(cadence.Groups[1].Value);
            Assert.That(s, Is.InRange(30, 60), "30 à 60 s au premier plan (contrat de f2)");
            StringAssert.Contains("WaitForSecondsRealtime(CadenceDeLHorlogeS)", app, "la cadence est en secondes RÉELLES");
            StringAssert.Contains("enArrierePlan = enPause;", app, "la pause du jeu arrête la lecture");
            StringAssert.Contains("enArrierePlan = !focus;", app, "la perte de focus Android aussi");
            StringAssert.Contains("if (string.IsNullOrEmpty(Token) || enArrierePlan) yield break;", app, "pas de lecture sans jeton ni en arrière-plan");
            StringAssert.Contains("yield return SurLectureDuJourServi(lue.JourDeFamille, lue.JourDOuvertureDeFamille);", app,
                "les DEUX jours lus décident, rien n'est mémorisé côté client");
            Assert.AreEqual(1, Regex.Matches(app, @"\bDemarrerLaBoucleDeLHorloge\(\);").Count, "la boucle part UNE fois, après l'ouverture");
        }
    }
}
