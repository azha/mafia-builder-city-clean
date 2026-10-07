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
    
        // ── J8 — « servi null » ≠ « absent » (revue ⊥ de CLIENT-2, M1, 07/10) ──────────────────────────────────────────────────────

        /// <summary>Un transport dont les `open` rendent des DTO COMPLETS (drapeaux de présence compris) : la forme de ce que le back servira.</summary>
        private sealed class TransportDeDto : ITransportDeSession
        {
            public readonly List<string> Requetes = new List<string>();
            private readonly SessionOpenDto ouverture;
            public TransportDeDto(SessionOpenDto ouverture) { this.ouverture = ouverture; }
            public IEnumerator Fermer(string jeton, Action<long, string> echec) { Requetes.Add("close"); yield break; }
            public IEnumerator Ouvrir(string jeton, Action<SessionOpenDto> ok, Action<long, string> echec) { Requetes.Add("open"); ok(ouverture); yield break; }
        }

        private static SessionOpenDto Servi(int? jour, int? ouverture) => new SessionOpenDto
        {
            session_id = "s", JourDeFamille = jour, JourDeFamilleALOuverture = ouverture, JourDeFamilleServi = true, JourDOuvertureServi = true,
        };

        [Test]
        public void J8_FamilyDayNullServi_PasDAncre_NeDeclencheRien_MemeApresUneLongueAbsence()
        {
            var sortieLointaine = Sortie + TimeSpan.FromHours(3);
            // démarrage à froid : l'ouverture habituelle SEULE, jamais close+open — l'absence (3 h ≥ 48 min) ne compte pas
            var froid = new TransportDeDto(Servi(null, null));
            SessionOpenDto gardee = null;
            Derouler(CycleDeSession.AuDemarrage("j", froid, Sortie, sortieLointaine, x => gardee = x, Assert.Fail));
            CollectionAssert.AreEqual(new[] { "open" }, froid.Requetes, "family_day servi null ⇒ RIEN : ni close ni open de plus");
            Assert.IsNotNull(gardee);
            // retour au premier plan : la lecture seule
            var retour = new TransportDeDto(Servi(null, null));
            Derouler(CycleDeSession.AuRetour("j", retour, jourServi: true, Sortie, sortieLointaine, _ => Assert.Fail("pas de nouvelle session"), Assert.Fail));
            CollectionAssert.AreEqual(new[] { "open" }, retour.Requetes, "au retour : la lecture, et rien d'autre");
            Assert.AreEqual(CycleDeSession.Decision.Rien, CycleDeSession.Decider(null, null, Sortie, sortieLointaine, false, jourEstServi: true));
            Assert.AreEqual(CycleDeSession.Decision.FermerPuisOuvrir, CycleDeSession.Decider(null, null, Sortie, sortieLointaine, false, jourEstServi: false),
                "contrôle : la clé ABSENTE (un back antérieur) garde le repli");
            Assert.IsTrue(CycleDeSession.JoursServis(Servi(null, null)), "un jour servi à null compte comme servi");
            Assert.IsFalse(CycleDeSession.JoursServis(new SessionOpenDto()), "clé absente, rien posé : non servi");
        }

        [Test]
        public void J9_OpenedFamilyDayNull_AvecUneAncre_LeRepliEstLegitime()
        {
            // session ouverte AVANT la migration 0171 : le jour est servi, celui de l'ouverture non — rien à comparer, le repli d'absence vaut
            var longue = new TransportDeDto(Servi(44, null));
            SessionOpenDto neuve = null;
            Derouler(CycleDeSession.AuRetour("j", longue, jourServi: true, Sortie, Sortie + TimeSpan.FromHours(3), x => neuve = x, Assert.Fail));
            CollectionAssert.AreEqual(new[] { "open", "close", "open" }, longue.Requetes, "absence ≥ 48 min : la lecture, puis close PUIS open");
            Assert.IsNotNull(neuve);
            var courte = new TransportDeDto(Servi(44, null));
            Derouler(CycleDeSession.AuRetour("j", courte, jourServi: true, Sortie, Sortie + TimeSpan.FromMinutes(10), _ => Assert.Fail(), Assert.Fail));
            CollectionAssert.AreEqual(new[] { "open" }, courte.Requetes, "absence courte : la lecture seule");
        }

        [Test]
        public void J10_LaDureeServie_RemplaceLeRepliDe48Minutes()
        {
            // 1 440 minutes de jeu × 2 s ÷ 60 = 48 : la durée servie par l'horloge légère
            const string corps = "{\"game_minute\":10,\"game_day\":1,\"day_phase\":\"DAY\",\"family_day\":1,\"opened_family_day\":1," +
                                 "\"real_seconds_per_game_minute\":2,\"in_game_day_length_minutes\":1440}";
            Assert.AreEqual(48.0, HorlogeLegere.Lire(corps).SeuilDeRepliMinutes);
            Assert.AreEqual(24.0, HorlogeLegere.Lire(corps.Replace("\"real_seconds_per_game_minute\":2", "\"real_seconds_per_game_minute\":1")).SeuilDeRepliMinutes,
                "si le back accélère la journée, le seuil la suit : plus aucune copie du tunable côté client");
            Assert.IsNull(HorlogeLegere.Lire("{\"game_day\":1}").SeuilDeRepliMinutes, "une clé manque : le repli codé en dur");
            var t = new TransportTemoin();
            SessionOpenDto neuve = null;
            Derouler(CycleDeSession.AuRetour("j", t, jourServi: false, Sortie, Sortie + TimeSpan.FromMinutes(30), x => neuve = x, Assert.Fail, seuilMinutes: 24.0));
            CollectionAssert.AreEqual(new[] { "close", "open" }, t.Requetes, "30 min d'absence ≥ 24 min servies : close PUIS open (le 48 codé n'aurait rien fait)");
            var sans = new TransportTemoin();
            Derouler(CycleDeSession.AuRetour("j", sans, jourServi: false, Sortie, Sortie + TimeSpan.FromMinutes(30), _ => Assert.Fail(), Assert.Fail));
            Assert.IsEmpty(sans.Requetes, "sans durée servie : le repli de 48 min, 30 min ne suffisent pas");
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
