using System;
using System.Collections;
using System.Collections.Generic;
using System.Linq;
using NUnit.Framework;
using MafiaCleanCity.Shell;

namespace MafiaCleanCity.CityMap.Tests
{
    // B4 (passe UX 2026-09-24, forme FINALE de f2 du 26/09) — une NOUVELLE session quand le jour de la famille SERVI a changé depuis
    // l'ouverture de la session courante ; repli de 48 min (une journée de jeu réelle) tant que le jour n'est pas servi. HORS
    // RÉSEAU : les requêtes sont CAPTURÉES par un transport témoin, dans leur ordre.
    //   J1  même jour ⇒ rien (lecture de l'horloge : aucune requête ; au retour : la lecture seule, aucun close)
    //   J2  jour +1 au premier plan (lecture de l'horloge) ⇒ close PUIS open
    //   J3  jour +1 au retour ⇒ la lecture, puis close PUIS open
    //   J4  jour absent ⇒ le repli : 47 min 59 ⇒ aucune requête ; 48 min 01 ⇒ close PUIS open ; borne incluse, 48 = 1 440 × 2 s
    //   J5  démarrage à froid : open seul ; jour changé, ou repli atteint ⇒ open, close, open
    //   J6  les deux jours se lisent dans le corps brut PAR LEUR NOM (`family_day`, `opened_family_day` : noms confirmés par le back le 07/10, une seule source)
    //   J7  minuit du joueur passé au premier plan (family_day = jour du joueur − jour d'inscription + 1, back 26/09) ⇒ UN SEUL close
    //       puis open : les lectures suivantes portent la nouvelle session (jours égaux) et ne relancent rien
    [Category("SessionAuRetour")]
    public class SessionAuRetourPlayModeTests
    {
        private static readonly DateTime Sortie = new DateTime(2026, 9, 26, 3, 0, 0, DateTimeKind.Utc);

        /// <summary>Rend, à chaque `open`, la session suivante de la file (jour courant, jour d'ouverture).</summary>
        private sealed class TransportTemoin : ITransportDeSession
        {
            public readonly List<string> Requetes = new List<string>();
            private readonly Queue<(int? jour, int? ouverture)> ouvertures;
            private int n;
            public TransportTemoin(params (int? jour, int? ouverture)[] ouvertures) { this.ouvertures = new Queue<(int?, int?)>(ouvertures); }
            public IEnumerator Fermer(string jeton, Action<long, string> echec) { Requetes.Add("close"); yield break; }
            public IEnumerator Ouvrir(string jeton, Action<SessionOpenDto> ok, Action<long, string> echec)
            {
                Requetes.Add("open");
                var (jour, ouverture) = ouvertures.Count > 0 ? ouvertures.Dequeue() : ((int?)null, (int?)null);
                ok(new SessionOpenDto { session_id = "s" + (++n), JourDeFamille = jour, JourDeFamilleALOuverture = ouverture });
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

        [Test]
        public void J1_MemeJour_Rien()
        {
            var t = new TransportTemoin();
            SessionOpenDto neuve = null;
            Derouler(CycleDeSession.SurLecture("j", t, 43, 43, x => neuve = x, Assert.Fail));
            Assert.IsEmpty(t.Requetes, "lecture de l'horloge, même jour : aucune requête");
            Assert.IsNull(neuve);

            var t2 = new TransportTemoin((43, 43));
            Derouler(CycleDeSession.AuRetour("j", t2, jourServi: true, Sortie, Sortie + TimeSpan.FromHours(3), x => neuve = x, Assert.Fail));
            CollectionAssert.AreEqual(new[] { "open" }, t2.Requetes, "au retour : la seule LECTURE (même session), aucun close");
            Assert.IsNull(neuve, "même jour : pas de nouvelle session, quelle que soit l'absence");
        }

        [Test]
        public void J2_JourPlusUn_AuPremierPlan_FermePuisOuvre()
        {
            var t = new TransportTemoin((44, 44));
            SessionOpenDto neuve = null;
            Derouler(CycleDeSession.SurLecture("j", t, 44, 43, x => neuve = x, Assert.Fail));
            CollectionAssert.AreEqual(new[] { "close", "open" }, t.Requetes);
            Assert.AreEqual("s1", neuve?.session_id, "la NOUVELLE session est rendue (bandeau, écran courant)");
        }

        [Test]
        public void J3_JourPlusUn_AuRetour_FermePuisOuvre()
        {
            var t = new TransportTemoin((44, 43), (44, 44));
            SessionOpenDto neuve = null;
            Derouler(CycleDeSession.AuRetour("j", t, jourServi: true, Sortie, Sortie + TimeSpan.FromMinutes(1), x => neuve = x, Assert.Fail));
            CollectionAssert.AreEqual(new[] { "open", "close", "open" }, t.Requetes, "la lecture, puis close PUIS open");
            Assert.AreEqual("s2", neuve?.session_id);
        }

        [Test]
        public void J4_JourAbsent_LeRepliDe48Minutes()
        {
            Assert.AreEqual(48, CycleDeSession.SeuilDeRepliMinutes, "1 440 minutes de jeu × 2 s (citysim-tunables.ts:24) = 48 min");
            var sous = new TransportTemoin();
            Derouler(CycleDeSession.AuRetour("j", sous, jourServi: false, Sortie, Sortie + new TimeSpan(0, 47, 59), _ => Assert.Fail("47:59"), Assert.Fail));
            Assert.IsEmpty(sous.Requetes, "47 min 59 : aucune requête");
            var sur = new TransportTemoin();
            SessionOpenDto neuve = null;
            Derouler(CycleDeSession.AuRetour("j", sur, jourServi: false, Sortie, Sortie + new TimeSpan(0, 48, 1), x => neuve = x, Assert.Fail));
            CollectionAssert.AreEqual(new[] { "close", "open" }, sur.Requetes, "48 min 01 : close PUIS open");
            Assert.IsNotNull(neuve);
            Assert.AreEqual(CycleDeSession.Decision.FermerPuisOuvrir,
                CycleDeSession.Decider(null, null, Sortie, Sortie + TimeSpan.FromMinutes(48), false), "borne incluse");
            var sansSortie = new TransportTemoin();
            Derouler(CycleDeSession.AuRetour("j", sansSortie, jourServi: false, null, Sortie, _ => Assert.Fail(), Assert.Fail));
            Assert.IsEmpty(sansSortie.Requetes, "aucune sortie notée : rien");
        }

        [Test]
        public void J5_DemarrageAFroid()
        {
            SessionOpenDto gardee = null;
            var premiere = new TransportTemoin();
            Derouler(CycleDeSession.AuDemarrage("j", premiere, null, Sortie, x => gardee = x, Assert.Fail));
            CollectionAssert.AreEqual(new[] { "open" }, premiere.Requetes, "première ouverture : open seul");
            Assert.AreEqual("s1", gardee?.session_id);

            var jourChange = new TransportTemoin((44, 43), (44, 44));
            Derouler(CycleDeSession.AuDemarrage("j", jourChange, null, Sortie, x => gardee = x, Assert.Fail));
            CollectionAssert.AreEqual(new[] { "open", "close", "open" }, jourChange.Requetes);
            Assert.AreEqual("s2", gardee?.session_id, "on garde la NOUVELLE");

            var memeJourLongue = new TransportTemoin((43, 43));
            Derouler(CycleDeSession.AuDemarrage("j", memeJourLongue, Sortie, Sortie + TimeSpan.FromHours(5), x => gardee = x, Assert.Fail));
            CollectionAssert.AreEqual(new[] { "open" }, memeJourLongue.Requetes, "jour servi égal : l'absence ne compte plus");

            var repli = new TransportTemoin();
            Derouler(CycleDeSession.AuDemarrage("j", repli, Sortie, Sortie + TimeSpan.FromMinutes(49), x => gardee = x, Assert.Fail));
            CollectionAssert.AreEqual(new[] { "open", "close", "open" }, repli.Requetes, "jour absent, absence ≥ 48 min : le repli");
        }

        [Test]
        public void J6_LesJours_SeLisentParLeurNom()
        {
            string corps = "{\"payload\":{\"data\":{\"session_id\":\"x\",\"" + CycleDeSession.ChampsServis.JourDeFamille + "\":44,\""
                         + CycleDeSession.ChampsServis.JourDeFamilleALOuverture + "\":43}}}";
            Assert.AreEqual(44, CycleDeSession.LireEntier(corps, CycleDeSession.ChampsServis.JourDeFamille));
            Assert.AreEqual(43, CycleDeSession.LireEntier(corps, CycleDeSession.ChampsServis.JourDeFamilleALOuverture));
            Assert.IsNull(CycleDeSession.LireEntier("{\"session_id\":\"x\"}", CycleDeSession.ChampsServis.JourDeFamille), "absent ⇒ null ⇒ repli");
            Assert.IsNull(CycleDeSession.LireEntier("{\"" + CycleDeSession.ChampsServis.JourDeFamilleALOuverture + "\":43}",
                CycleDeSession.ChampsServis.JourDeFamille), "un nom qui en CONTIENT un autre ne le lit pas à sa place");
        }
    
        [Test]
        public void J7_MinuitPasseAuPremierPlan_UnSeulCloseOpen()
        {
            var t = new TransportTemoin((44, 44));
            SessionOpenDto courante = new SessionOpenDto { session_id = "s0", JourDeFamille = 43, JourDeFamilleALOuverture = 43 };
            // l'horloge légère lit, toutes les 30 à 60 s : 43/43 … puis minuit passé : 44 contre l'ouverture 43 … puis la nouvelle session
            foreach ((int jour, int ouverture) in new[] { (43, 43), (44, 43), (44, 44), (44, 44) })
            {
                SessionOpenDto neuve = null;
                Derouler(CycleDeSession.SurLecture("j", t, jour, ouverture, x => neuve = x, Assert.Fail));
                if (neuve != null) courante = neuve;
            }
            CollectionAssert.AreEqual(new[] { "close", "open" }, t.Requetes, "un seul close puis open pour une transition de minuit");
            Assert.AreEqual("s1", courante.session_id, "la session gardée est la NOUVELLE");
        }
}
}
