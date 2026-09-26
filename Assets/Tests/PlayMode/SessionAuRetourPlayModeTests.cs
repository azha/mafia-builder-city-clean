using System;
using System.Collections;
using System.Collections.Generic;
using NUnit.Framework;
using MafiaCleanCity.Shell;

namespace MafiaCleanCity.CityMap.Tests
{
    // B4 (passe UX 2026-09-24, f2-D18 « Reprenez demain ») — le cycle de vie de la session, HORS RÉSEAU : la décision
    // (`CycleDeSession.Decider`) et les requêtes qu'elle émet, CAPTURÉES par un transport témoin, dans leur ordre.
    //   R1  retour au premier plan après 4 min 59 ⇒ AUCUNE requête (la même session continue)
    //   R2  retour après 5 min 01 ⇒ `close` PUIS `open`, dans cet ordre
    //   R3  démarrage à froid après 6 min ⇒ `close` PUIS `open`
    //   R4  horodatage absent (première ouverture) ⇒ `open` seul ; et au retour sans horodatage, rien
    //   R5  le seuil est UNE constante (5 min) et la borne est incluse (5 min 00 ⇒ nouvelle session)
    [Category("SessionAuRetour")]
    public class SessionAuRetourPlayModeTests
    {
        private static readonly DateTime Sortie = new DateTime(2026, 9, 26, 3, 0, 0, DateTimeKind.Utc);

        private sealed class TransportTemoin : ITransportDeSession
        {
            public readonly List<string> Requetes = new List<string>();
            public IEnumerator Fermer(string jeton, Action<long, string> echec) { Requetes.Add("POST /v1/session/close"); yield break; }
            public IEnumerator Ouvrir(string jeton, Action<SessionOpenDto> ok, Action<long, string> echec)
            {
                Requetes.Add("POST /v1/session/open");
                ok(new SessionOpenDto { session_id = "neuve" });
                yield break;
            }
        }

        /// <summary>Déroule une coroutine et ses coroutines imbriquées, sans moteur (aucune n'attend un frame ici).</summary>
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

        private static (List<string> requetes, SessionOpenDto ouverte) Jouer(DateTime? sortie, TimeSpan absence, bool froid)
        {
            var transport = new TransportTemoin();
            SessionOpenDto ouverte = null;
            CycleDeSession.Decision d = CycleDeSession.Decider(sortie, Sortie + absence, froid);
            Derouler(CycleDeSession.Appliquer(d, "jeton", transport, x => ouverte = x, e => Assert.Fail(e)));
            return (transport.Requetes, ouverte);
        }

        [Test]
        public void R1_Retour_Apres4min59_AucuneRequete()
        {
            var (requetes, ouverte) = Jouer(Sortie, new TimeSpan(0, 4, 59), froid: false);
            Assert.IsEmpty(requetes, "sous le seuil, la même session continue : rien ne part");
            Assert.IsNull(ouverte);
        }

        [Test]
        public void R2_Retour_Apres5min01_FermePuisOuvre()
        {
            var (requetes, ouverte) = Jouer(Sortie, new TimeSpan(0, 5, 1), froid: false);
            CollectionAssert.AreEqual(new[] { "POST /v1/session/close", "POST /v1/session/open" }, requetes, "close PUIS open, dans cet ordre");
            Assert.AreEqual("neuve", ouverte?.session_id, "la NOUVELLE session est rendue à l'appelant (bandeau, écran courant)");
        }

        [Test]
        public void R3_DemarrageAFroid_Apres6min_FermePuisOuvre()
        {
            var (requetes, _) = Jouer(Sortie, TimeSpan.FromMinutes(6), froid: true);
            CollectionAssert.AreEqual(new[] { "POST /v1/session/close", "POST /v1/session/open" }, requetes);
        }

        [Test]
        public void R4_SansHorodatage_OuvertureSimple_EtRetourSansEffet()
        {
            var (froid, _) = Jouer(null, TimeSpan.Zero, froid: true);
            CollectionAssert.AreEqual(new[] { "POST /v1/session/open" }, froid, "première ouverture : open seul, aucun close");
            var (chaud, _) = Jouer(null, TimeSpan.FromHours(3), froid: false);
            Assert.IsEmpty(chaud, "retour sans sortie notée (déjà consommée, ou jamais écrite) : rien");
            var (froidCourt, _) = Jouer(Sortie, TimeSpan.FromMinutes(2), froid: true);
            CollectionAssert.AreEqual(new[] { "POST /v1/session/open" }, froidCourt, "démarrage à froid sous le seuil : l'ouverture habituelle");
        }

        [Test]
        public void R5_LeSeuil_EstUneConstante_EtSaBorneEstIncluse()
        {
            Assert.AreEqual(5, CycleDeSession.SeuilDAbsenceMinutes);
            Assert.AreEqual(CycleDeSession.Decision.FermerPuisOuvrir,
                CycleDeSession.Decider(Sortie, Sortie + TimeSpan.FromMinutes(CycleDeSession.SeuilDAbsenceMinutes), false));
        }
    }
}
