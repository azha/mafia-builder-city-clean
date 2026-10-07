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
        public void H3_LEnTeteDeFond_SePoseEnArrierePlanSeulement_ValantExactementUn()
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
                Assert.AreEqual("", req.GetRequestHeader("X-Mafia-Background") ?? "", "PAR DÉFAUT (aucun plan posé) : premier plan, SANS l'en-tête — la lecture de l'horloge est de l'activité");
                Assert.AreEqual("Bearer jeton-x", req.GetRequestHeader("Authorization"));
            }
            // la RÈGLE (f2 07/10, revue du design L1 B-5) : l'en-tête suit le PLAN de l'application, pas le caractère périodique de la requête
            using (var premierPlan = client.Construire("jeton-x", enArrierePlan: false))
                Assert.IsTrue(string.IsNullOrEmpty(premierPlan.GetRequestHeader("X-Mafia-Background")), "premier plan ⇒ PAS d'en-tête (sinon le monde du joueur qui LIT s'arrêterait au bout de 240 min)");
            using (var arrierePlan = client.Construire("jeton-x", enArrierePlan: true))
                Assert.AreEqual("1", arrierePlan.GetRequestHeader("X-Mafia-Background"), "arrière-plan (pause ou perte de focus) ⇒ « 1 » à l'octet");
            // le plan se lit au moment de la construction (le client suit l'état du shell)
            bool fond = false;
            client.EnArrierePlan = () => fond;
            using (var a = client.Construire("j")) Assert.IsTrue(string.IsNullOrEmpty(a.GetRequestHeader("X-Mafia-Background")));
            fond = true;
            using (var b = client.Construire("j")) Assert.AreEqual("1", b.GetRequestHeader("X-Mafia-Background"));
            // l'helper lui-même
            Assert.IsNull(EnTetesDuClient.MarquerSelonLePlan(null, true));
            Assert.IsNull(EnTetesDuClient.MarquerSelonLePlan(null, false));
        }

        // ── H4 — la garde de classe ───────────────────────────────────────────────────────────────────────────────────────────────

        /// <summary>Les fichiers qui nomment la route légère mais ne marquent pas la requête. Pure.</summary>
        internal static List<string> SitesSansMarquerFond(IEnumerable<(string nom, string source)> sources) =>
            sources.Where(s => s.source.Contains("/v1/me/clock") && !s.source.Contains("EnTetesDuClient.MarquerSelonLePlan("))
                   .Select(s => s.nom).OrderBy(n => n).ToList();

        [Test]
        public void H4_GardeDeClasse_TouteRequeteDeLaRouteLegere_EstMarqueeFond()
        {
            CollectionAssert.AreEqual(new[] { "Oublie.cs" },
                SitesSansMarquerFond(new[]
                {
                    ("Oublie.cs", "var u = base + \"/v1/me/clock\"; UnityWebRequest.Get(u);"),
                    ("Marque.cs", "var u = base + \"/v1/me/clock\"; return EnTetesDuClient.MarquerSelonLePlan(UnityWebRequest.Get(u), fond);"),
                    ("Autre.cs", "var u = base + \"/v1/me/wallet\";"),
                }), "contrôle positif : l'oubli est vu ; le site marqué et l'autre route non");

            var sources = Directory.GetFiles(Path.Combine(Application.dataPath, "Scripts"), "*.cs", SearchOption.AllDirectories)
                .Select(f => (Path.GetFileName(f), File.ReadAllText(f))).ToList();
            var nommeurs = sources.Where(s => s.Item2.Contains("/v1/me/clock")).Select(s => s.Item1).ToList();
            CollectionAssert.AreEqual(new[] { "HorlogeLegere.cs" }, nommeurs, "anti-vacuité : la route légère n'est nommée qu'à UN endroit");
            Assert.IsEmpty(SitesSansMarquerFond(sources), "un appel de la route légère sans `MarquerSelonLePlan` serait traité sans règle de plan (activité comptée en arrière-plan)");
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

        // ── H6 — la boucle, par son COMPORTEMENT (revue ⊥ de CLIENT-2, m6 : plus de StringAssert sur le source d'AppShell) ─────────

        /// <summary>Un transport qui REND, lecture après lecture, ce que la file lui donne : un DTO, ou un code d'erreur HTTP.</summary>
        private sealed class TransportDeLHorlogeTemoin : ITransportDeLHorloge
        {
            public int Appels;
            public readonly List<string> Jetons = new List<string>();
            private readonly Queue<object> reponses;
            public TransportDeLHorlogeTemoin(params object[] reponses) { this.reponses = new Queue<object>(reponses); }
            public IEnumerator Lire(string jeton, Action<HorlogeLegereDto> ok, Action<long, string> echec)
            {
                Appels++; Jetons.Add(jeton);
                object r = reponses.Count > 0 ? reponses.Dequeue() : 404L;
                if (r is HorlogeLegereDto d) ok(d); else echec((long)r, "erreur");
                yield break;
            }
        }

        private static HorlogeLegereDto Jours(int? famille, int? ouverture) => HorlogeLegere.Lire(
            CorpsPlat.Replace("\"family_day\":44", "\"family_day\":" + (famille.HasValue ? famille.ToString() : "null"))
                     .Replace("\"opened_family_day\":43", "\"opened_family_day\":" + (ouverture.HasValue ? ouverture.ToString() : "null")));

        private static HorlogeLegereBoucle Boucle(ITransportDeLHorloge transport, Func<bool> arrierePlan, List<string> decisions, string jeton = "tok",
                                                  Func<float, object> attente = null) =>
            new HorlogeLegereBoucle(transport, () => jeton, arrierePlan,
                (j, o) => { decisions.Add(j + "/" + o); return Vide(); }, attente ?? (_ => null));

        private static IEnumerator Vide() { yield break; }

        [Test]
        public void H6_LaCadenceParDefaut_EstDe30a60s()
        {
            Assert.That(HorlogeLegereBoucle.CadenceParDefautS, Is.InRange(30f, 60f), "30 à 60 s au premier plan (contrat de f2)");
        }

        [Test]
        public void H6a_UneLecture_RendLesDeuxJours_AuCycleDeSession()
        {
            var transport = new TransportDeLHorlogeTemoin(Jours(44, 43));
            var decisions = new List<string>();
            var boucle = Boucle(transport, () => false, decisions);
            Derouler(boucle.UneLecture());
            CollectionAssert.AreEqual(new[] { "44/43" }, decisions, "les DEUX jours lus décident ; rien n'est mémorisé côté client");
            Assert.AreEqual(1, boucle.Lectures);
            Assert.AreEqual(44, boucle.Derniere.JourDeFamille);
            CollectionAssert.AreEqual(new[] { "tok" }, transport.Jetons, "la lecture porte le jeton du joueur");
            decisions.Clear();
            Derouler(Boucle(new TransportDeLHorlogeTemoin(Jours(null, null)), () => false, decisions).UneLecture());
            CollectionAssert.AreEqual(new[] { "/" }, decisions, "les deux null sont PASSÉS tels quels (null ≠ 0) : c'est le cycle de session qui ne fait rien");
        }

        [Test]
        public void H6b_EnArrierePlan_OuSansJeton_AucuneRequete()
        {
            var transport = new TransportDeLHorlogeTemoin(Jours(44, 43));
            var decisions = new List<string>();
            Derouler(Boucle(transport, () => true, decisions).UneLecture());
            Assert.AreEqual(0, transport.Appels, "en arrière-plan : pas de minuteur, pas de requête");
            Derouler(Boucle(transport, () => false, decisions, jeton: "").UneLecture());
            Derouler(Boucle(transport, () => false, decisions, jeton: null).UneLecture());
            Assert.AreEqual(0, transport.Appels, "sans jeton : aucune requête");
            Assert.IsEmpty(decisions);
        }

        [Test]
        public void H6c_Un404_NeVerrouillePas_LaBoucleEspaceSesReessaisDe10Minutes()
        {
            // 1 lue · 2 arrière-plan (sautée) · 3 : 500 · 4 lue · 5 : 404 ⇒ la boucle ATTEND 10 min · 6 lue (99/1 : elle n'est PAS verrouillée) · 7 : arrêt
            var transport = new TransportDeLHorlogeTemoin(Jours(44, 44), 500L, Jours(44, 44), 404L, Jours(99, 1));
            var decisions = new List<string>();
            var attentes = new List<float>();
            int tour = 0; bool arriere = false;
            HorlogeLegereBoucle boucle = null;
            boucle = Boucle(transport, () => arriere, decisions,
                attente: s => { attentes.Add(s); arriere = ++tour == 2; if (tour == 7) boucle.Arret = true; return null; });
            Derouler(boucle.Executer());
            CollectionAssert.AreEqual(new[] { 45f, 45f, 45f, 45f, 45f, HorlogeLegereBoucle.AttenteApres404S, 45f }, attentes,
                "cadence normale, puis 10 min APRÈS le 404, puis la cadence normale dès qu'une lecture a réussi");
            Assert.AreEqual(600f, HorlogeLegereBoucle.AttenteApres404S, "un réessai espacé de 10 minutes");
            Assert.AreEqual(5, transport.Appels, "tours 1, 3, 4, 5 et 6 : le tour 2 était en arrière-plan");
            Assert.AreEqual(3, boucle.Lectures, "le 500 et le 404 ne comptent pas comme des lectures");
            CollectionAssert.AreEqual(new[] { "44/44", "44/44", "99/1" }, decisions, "après le 404 la boucle a relu : un joueur resté au premier plan retrouve L1");
            Assert.IsFalse(boucle.Indisponible, "la lecture réussie a levé l'état « 404 »");
        }

        [Test]
        public void H6d_UneErreurDeReseau_NEspacePas_UneNouvelleSessionRearme()
        {
            var transport = new TransportDeLHorlogeTemoin(0L, 503L, Jours(44, 43), 404L, 404L);
            var decisions = new List<string>();
            var attentes = new List<float>();
            int tour = 0;
            HorlogeLegereBoucle boucle = null;
            boucle = Boucle(transport, () => false, decisions, attente: s => { attentes.Add(s); if (++tour == 6) boucle.Arret = true; return null; });
            Derouler(boucle.Executer());
            CollectionAssert.AreEqual(new[] { 45f, 45f, 45f, 45f, HorlogeLegereBoucle.AttenteApres404S, HorlogeLegereBoucle.AttenteApres404S }, attentes,
                "réseau (0) et 503 : la cadence normale ; deux 404 de suite : 10 min chaque fois");
            CollectionAssert.AreEqual(new[] { "44/43" }, decisions);
            Assert.IsTrue(boucle.Indisponible);
            boucle.Rearmer();
            Assert.IsFalse(boucle.Indisponible, "une nouvelle session (session/open réussi) rend la cadence normale sans attendre les 10 min");
        }

        [Test]
        public void H6e_LaCadence_EstRelueAChaqueTour()
        {
            float cadence = 45f;
            var attentes = new List<float>();
            int tour = 0;
            HorlogeLegereBoucle boucle = null;
            boucle = new HorlogeLegereBoucle(new TransportDeLHorlogeTemoin(Jours(1, 1), Jours(1, 1), Jours(1, 1)), () => "tok", () => false,
                (j, o) => Vide(), s => { attentes.Add(s); if (++tour == 1) cadence = 30f; if (tour == 3) boucle.Arret = true; return null; }, () => cadence);
            Derouler(boucle.Executer());
            CollectionAssert.AreEqual(new[] { 45f, 30f, 30f }, attentes, "changer la cadence en cours de route compte : elle n'est pas copiée à la construction");
        }
    }
}
