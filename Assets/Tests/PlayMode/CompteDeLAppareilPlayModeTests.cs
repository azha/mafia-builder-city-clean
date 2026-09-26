using System;
using System.Collections;
using System.Collections.Generic;
using System.Linq;
using NUnit.Framework;
using UnityEngine;
using UnityEngine.TestTools;
using MafiaCleanCity.Shell;
using MafiaCleanCity.CityMap;   // DemoIdentityResolver (empreinte, variables d'environnement)
using Object = UnityEngine.Object;

namespace MafiaCleanCity.Shell.Tests
{
    // B5 « UN COMPTE PAR APPAREIL » — les gardes, HORS RÉSEAU : un transport témoin tient l'ÉTAT DU SERVEUR (les comptes, les clés
    // d'idempotence vues), un stockage témoin tient l'appareil. Critères de f1/f2 et du back -51 (26/09).
    //   N1  les noms de l'atelier (table 79) : TOUTES les combinaisons tiennent dans les contraintes du back (≤ 24 unités UTF-16 après trim,
    //       pas d'espace de bord ni double, pas de « @ », pas de contrôle, pas hors plan de base) ; composition déterministe
    //   G1  régime : appareil seulement dans un build joueur sans identité posée ; le nom n'est JAMAIS la démo ni la capture
    //   G2  premier lancement ⇒ exactement 1 signup ; la paire est STOCKÉE AVANT l'appel
    //   G3  second lancement ⇒ 0 signup, 1 signin, la même empreinte
    //   G4a réponse du signup PERDUE (compte créé côté serveur) ⇒ relance ⇒ signin ⇒ même compte, 0 orphelin
    //   G4b paire stockée, signin 401 (serveur remis à zéro) ⇒ signup, même paire, clé NEUVE
    //   G4c signin 401 puis signup 409 TAKEN ⇒ signin encore ; s'il échoue, paire neuve (≤ 2), jamais d'orphelin
    //   G4d réseau coupé ⇒ échec, 0 compte ; G4e 403 ⇒ sanctionné, 0 signup, la phrase servie ; G4f 404 ⇒ paire neuve ; G4g 503 ⇒ 0 signup
    //   G5  ni le nom ni le secret dans AUCUN journal (contrôle positif : un log qui les porte est vu)
    //   G6  dans le vrai shell : échec ⇒ « La partie n'a pas pu commencer » À LA PLACE de l'Accueil ; « Réessayer » ⇒ l'Accueil
    //   G7  aucune clé d'idempotence ne franchit un lancement
    [Category("DemoIdentity")]
    public class CompteDeLAppareilPlayModeTests
    {
        // ── témoins ──────────────────────────────────────────────────────────────────────────────────────────────────────────────
        private sealed class Stockage : IStockageDeCompte
        {
            public readonly Dictionary<string, string> D = new Dictionary<string, string>();
            public string Lire(string cle) => D.TryGetValue(cle, out string v) ? v : null;
            public void Ecrire(string cle, string valeur) => D[cle] = valeur;
        }

        private sealed class Serveur : IAuthDuCompte
        {
            public readonly Dictionary<string, string> Comptes = new Dictionary<string, string>();   // nom → secret
            public readonly HashSet<string> NomsPris = new HashSet<string>();                        // pris par d'AUTRES joueurs / tombstones
            public readonly List<string> Appels = new List<string>();
            public readonly List<string> Cles = new List<string>();
            public bool Coupe;                 // réseau coupé
            public bool PerdreLaReponse;       // le signup CRÉE le compte, puis la réponse se perd
            public long ForcerSignin;          // 0 = normal ; sinon ce code HTTP au signin
            public string CodeForce;
            public Stockage AppareilVuAuSignup; public string NomStockeAuSignup;

            private static ReponseDAuth Ko(long http, string code) =>
                new ReponseDAuth { Http = http, Code = code, Corps = "{\"payload\":{\"error\":{\"code\":\"" + code + "\"}}}" };

            public IEnumerator SeConnecter(string id, string secret, Action<ReponseDAuth> fin)
            {
                Appels.Add("signin");
                if (Coupe) fin(new ReponseDAuth { Http = 0 });
                else if (ForcerSignin != 0) fin(Ko(ForcerSignin, CodeForce));
                else if (Comptes.TryGetValue(id, out string s) && s == secret) fin(new ReponseDAuth { Http = 200, Jeton = "jwt-" + id.GetHashCode() });
                else fin(Ko(401, "AUTH_INVALID_CREDENTIALS"));
                yield break;
            }

            public IEnumerator SInscrire(string nom, string secret, string cle, Action<ReponseDAuth> fin)
            {
                Appels.Add("signup"); Cles.Add(cle);
                NomStockeAuSignup = AppareilVuAuSignup?.Lire(CompteDeLAppareil.CleNom);
                if (Coupe) { fin(new ReponseDAuth { Http = 0 }); yield break; }
                if (Comptes.ContainsKey(nom) || NomsPris.Contains(nom)) { fin(Ko(409, "SIGNUP_CALLSIGN_TAKEN")); yield break; }
                Comptes[nom] = secret;
                fin(PerdreLaReponse ? new ReponseDAuth { Http = 0 } : new ReponseDAuth { Http = 201, Jeton = "jwt-" + nom.GetHashCode() });
            }
        }

        private static void Derouler(IEnumerator racine)
        {
            var pile = new Stack<IEnumerator>(); pile.Push(racine);
            while (pile.Count > 0)
            {
                if (!pile.Peek().MoveNext()) { pile.Pop(); continue; }
                if (pile.Peek().Current is IEnumerator imbriquee) pile.Push(imbriquee);
            }
        }

        private static readonly string[] A = { "Holm", "Faber", "Anker" };
        private static readonly string[] B = { "le Clou", "la Braise", "l’Ancre" };
        private int n;

        private IssueDuCompte Lancer(Serveur s, Stockage a, long graine = 0)
        {
            IssueDuCompte i = null;
            Derouler(CompteDeLAppareil.Acquerir(s, a, () => graine, () => "secret-" + (++n), () => Guid.NewGuid().ToString(), x => i = x,
                                                g => NomsDeJoueur.Composer(g, A, B)));
            return i;
        }

        // ── N1 · les noms ────────────────────────────────────────────────────────────────────────────────────────────────────────
        [Test]
        public void N1_ToutesLesCombinaisons_TiennentDansLesContraintesDuBack()
        {
            var (la, lb) = NomsDeJoueur.Listes();
            Assert.AreEqual(117, la.Length, "liste A de l'atelier (table 79)");
            Assert.AreEqual(108, lb.Length, "liste B de l'atelier (table 79)");
            var ecarts = new List<string>();
            var vus = new HashSet<string>();
            for (long g = 0; g < la.Length * (long)lb.Length; g++)
            {
                string nom = NomsDeJoueur.Composer(g, la, lb);
                vus.Add(nom);
                if (nom.Length < 1 || nom.Length > 24) ecarts.Add($"longueur {nom.Length} : {nom}");
                if (nom != nom.Trim() || nom.Contains("  ")) ecarts.Add($"espace de bord ou double : «{nom}»");
                if (nom.Contains("@")) ecarts.Add($"@ : {nom}");
                if (nom.Any(c => char.IsControl(c) || char.IsSurrogate(c))) ecarts.Add($"contrôle ou hors plan de base : {nom}");
            }
            Assert.IsEmpty(ecarts.Take(20), $"{ecarts.Count} combinaison(s) hors contraintes");
            Assert.AreEqual(la.Length * lb.Length, vus.Count, "les combinaisons sont toutes DISTINCTES (12 636)");
            Assert.AreEqual(la[5 % 117] + " " + lb[(5 / 117) % 108], NomsDeJoueur.Composer(5, la, lb), "A = g mod 117, B = (g div 117) mod 108");
            Assert.AreEqual(NomsDeJoueur.Composer(4242, la, lb), NomsDeJoueur.Composer(4242, la, lb), "déterministe à graine donnée");
        }

        // ── G1 · le régime ───────────────────────────────────────────────────────────────────────────────────────────────────────
        [Test]
        public void G1_Regime_EtJamaisLaDemoNiLaCapture()
        {
            Assert.AreEqual(RegimeDIdentite.Regime.Appareil, RegimeDIdentite.Choisir(estEditeur: false, identiteExplicite: false));
            Assert.AreEqual(RegimeDIdentite.Regime.Existant, RegimeDIdentite.Choisir(true, false), "l'éditeur, les tests : inchangés");
            Assert.AreEqual(RegimeDIdentite.Regime.Existant, RegimeDIdentite.Choisir(false, true), "une identité posée explicitement gagne");
            var (la, lb) = NomsDeJoueur.Listes();
            var interdits = new[] { IdentiteDeDemo.Operationnelle, IdentiteDeDemo.Carte,
                Environment.GetEnvironmentVariable(DemoIdentityResolver.CaptureIdentifierEnvVar),
                Environment.GetEnvironmentVariable(DemoIdentityResolver.OperationalIdentifierEnvVar) }
                .Where(x => !string.IsNullOrEmpty(x)).Select(DemoIdentityResolver.Empreinte).ToList();
            Assert.IsNotEmpty(interdits, "précondition : au moins la paire de démo d'éditeur");
            for (long g = 0; g < la.Length * (long)lb.Length; g++)
                CollectionAssert.DoesNotContain(interdits, DemoIdentityResolver.Empreinte(NomsDeJoueur.Composer(g, la, lb)),
                    "un nom d'appareil n'est jamais la démo ni la capture (par empreinte)");
        }

        // ── G2 / G3 ──────────────────────────────────────────────────────────────────────────────────────────────────────────────
        [Test]
        public void G2G3_PremierLancement_UnSignup_PaireStockeeAvant_PuisSecond_ZeroSignup_MemeCompte()
        {
            var s = new Serveur(); var a = new Stockage(); s.AppareilVuAuSignup = a;
            IssueDuCompte i1 = Lancer(s, a, graine: 1);
            Assert.AreEqual(IssueDuCompte.Etat.Connecte, i1.Quoi);
            Assert.IsTrue(i1.CompteNeuf);
            Assert.AreEqual(1, s.Appels.Count(x => x == "signup"), "premier lancement : EXACTEMENT 1 signup");
            Assert.AreEqual(NomsDeJoueur.Composer(1, A, B), s.NomStockeAuSignup, "la paire est stockée AVANT l'appel");

            s.Appels.Clear();
            IssueDuCompte i2 = Lancer(s, a, graine: 99);
            Assert.AreEqual(IssueDuCompte.Etat.Connecte, i2.Quoi);
            Assert.IsFalse(i2.CompteNeuf);
            CollectionAssert.AreEqual(new[] { "signin" }, s.Appels, "second lancement : 0 signup, 1 signin");
            Assert.AreEqual(i1.Empreinte, i2.Empreinte, "la même empreinte");
            Assert.AreEqual(1, s.Comptes.Count);
        }

        // ── G4 ───────────────────────────────────────────────────────────────────────────────────────────────────────────────────
        [Test]
        public void G4a_ReponsePerdue_Relance_MemeCompte_ZeroOrphelin()
        {
            var s = new Serveur { PerdreLaReponse = true }; var a = new Stockage();
            Assert.AreEqual(IssueDuCompte.Etat.Echec, Lancer(s, a, 1).Quoi, "la réponse s'est perdue : échec (« Réessayer »)");
            Assert.AreEqual(1, s.Comptes.Count, "…mais le compte existe côté serveur");
            s.PerdreLaReponse = false; s.Appels.Clear();
            IssueDuCompte i = Lancer(s, a, 7);
            Assert.AreEqual(IssueDuCompte.Etat.Connecte, i.Quoi);
            CollectionAssert.AreEqual(new[] { "signin" }, s.Appels, "relance : SIGNIN avec la paire stockée, aucun signup");
            Assert.AreEqual(1, s.Comptes.Count, "0 compte orphelin");
        }

        [Test]
        public void G4b_PaireStockee_Signin401_SignupMemePaire_CleNeuve()
        {
            var s = new Serveur(); var a = new Stockage();
            Lancer(s, a, 1);
            string cle1 = s.Cles.Single();
            s.Comptes.Clear(); s.Appels.Clear();   // serveur remis à zéro
            IssueDuCompte i = Lancer(s, a, 50);
            Assert.AreEqual(IssueDuCompte.Etat.Connecte, i.Quoi);
            CollectionAssert.AreEqual(new[] { "signin", "signup" }, s.Appels);
            Assert.AreEqual(NomsDeJoueur.Composer(1, A, B), s.Comptes.Keys.Single(), "la MÊME paire");
            Assert.AreNotEqual(cle1, s.Cles.Last(), "une clé NEUVE : jamais le rejeu d'un vieux 201");
        }

        [Test]
        public void G4c_Signin401_Signup409_SigninEncore_PuisPaireNeuve_AuPlusDeux()
        {
            var s = new Serveur(); var a = new Stockage();
            a.Ecrire(CompteDeLAppareil.CleNom, NomsDeJoueur.Composer(0, A, B)); a.Ecrire(CompteDeLAppareil.CleSecret, "le-mien");
            s.NomsPris.Add(NomsDeJoueur.Composer(0, A, B));   // quelqu'un d'autre a ce nom
            IssueDuCompte i = Lancer(s, a, 0);
            Assert.AreEqual(IssueDuCompte.Etat.Connecte, i.Quoi);
            CollectionAssert.AreEqual(new[] { "signin", "signup", "signin", "signup" }, s.Appels, "409 ⇒ signin d'abord, puis paire neuve");
            Assert.AreEqual(NomsDeJoueur.Composer(1, A, B), a.Lire(CompteDeLAppareil.CleNom), "graine + 1, stockée");

            var s2 = new Serveur(); var a2 = new Stockage();
            foreach (long g in new long[] { 0, 1, 2, 3 }) s2.NomsPris.Add(NomsDeJoueur.Composer(g, A, B));
            Assert.AreEqual(IssueDuCompte.Etat.Echec, Lancer(s2, a2, 0).Quoi, "au plus 2 paires neuves, puis « Réessayer »");
            Assert.AreEqual(3, s2.Appels.Count(x => x == "signup"), "1 + 2 signup au plus par lancement");
            Assert.AreEqual(0, s2.Comptes.Count, "aucun orphelin");
        }

        [Test]
        public void G4d_G4e_G4f_G4g_ReseauCoupe_Sanction_Tombstone_Panne()
        {
            var s = new Serveur { Coupe = true }; var a = new Stockage();
            Assert.AreEqual(IssueDuCompte.Etat.Echec, Lancer(s, a, 1).Quoi, "G4d réseau coupé : échec");
            Assert.AreEqual(0, s.Comptes.Count);

            var s403 = new Serveur { ForcerSignin = 403, CodeForce = "ACCOUNT_SUSPENDED" }; var a403 = new Stockage();
            a403.Ecrire(CompteDeLAppareil.CleNom, "Holm le Clou"); a403.Ecrire(CompteDeLAppareil.CleSecret, "x");
            Assert.AreEqual(IssueDuCompte.Etat.Sanctionne, Lancer(s403, a403, 1).Quoi, "G4e 403 : sanctionné");
            Assert.AreEqual(0, s403.Appels.Count(x => x == "signup"), "G4e : AUCUN signup (on ne contourne pas une sanction)");

            var s404 = new Serveur { ForcerSignin = 404, CodeForce = "ACCOUNT_NOT_FOUND" }; var a404 = new Stockage();
            a404.Ecrire(CompteDeLAppareil.CleNom, "Holm le Clou"); a404.Ecrire(CompteDeLAppareil.CleSecret, "x");
            s404.NomsPris.Add("Holm le Clou");
            IssueDuCompte i404 = Lancer(s404, a404, 1);
            Assert.AreEqual(IssueDuCompte.Etat.Connecte, i404.Quoi, "G4f 404 : paire neuve directement");
            Assert.AreEqual(1, s404.Appels.Count(x => x == "signup"));
            Assert.AreNotEqual("Holm le Clou", a404.Lire(CompteDeLAppareil.CleNom));

            var s503 = new Serveur { ForcerSignin = 503, CodeForce = "SERVICE_UNAVAILABLE" }; var a503 = new Stockage();
            a503.Ecrire(CompteDeLAppareil.CleNom, "Holm le Clou"); a503.Ecrire(CompteDeLAppareil.CleSecret, "x");
            Assert.AreEqual(IssueDuCompte.Etat.Echec, Lancer(s503, a503, 1).Quoi, "G4g 503 : échec");
            Assert.AreEqual(0, s503.Appels.Count(x => x == "signup"), "G4g : une panne ne fabrique pas de compte");
        }

        // ── G5 · journaux ────────────────────────────────────────────────────────────────────────────────────────────────────────
        [Test]
        public void G5_NiLeNomNiLeSecret_DansAucunJournal()
        {
            var lus = new List<string>();
            Application.LogCallback capter = (m, st, t) => lus.Add(m + "\n" + st);
            Application.logMessageReceived += capter;
            try
            {
                var s = new Serveur(); var a = new Stockage();
                LogAssert.ignoreFailingMessages = true;
                Lancer(s, a, 3);                                    // succès (journal P0)
                s.Comptes.Clear(); s.Coupe = true; Lancer(s, a, 3); // échec (journal d'avertissement)
                string nom = a.Lire(CompteDeLAppareil.CleNom), secret = a.Lire(CompteDeLAppareil.CleSecret);
                Assert.IsTrue(lus.Any(l => l.Contains("[CompteDeLAppareil]")), "anti-vacuité : le cycle a journalisé");
                Assert.IsFalse(lus.Any(l => l.Contains(nom)), "le NOM n'apparaît dans aucun journal (empreinte seulement)");
                Assert.IsFalse(lus.Any(l => l.Contains(secret)), "le SECRET n'apparaît dans aucun journal");
                Debug.Log("contrôle " + nom);
                Assert.IsTrue(lus.Any(l => l.Contains(nom)), "contrôle positif : un journal qui porte le nom EST vu");
            }
            finally { Application.logMessageReceived -= capter; LogAssert.ignoreFailingMessages = false; }
        }

        // ── G7 · aucune clé ne franchit un lancement ────────────────────────────────────────────────────────────────────────────
        [Test]
        public void G7_AucuneCleNeFranchitUnLancement()
        {
            var s = new Serveur { PerdreLaReponse = true }; var a = new Stockage();
            Lancer(s, a, 1);
            s.Comptes.Clear(); s.PerdreLaReponse = false;       // back remis à zéro
            Lancer(s, a, 1);
            Assert.AreEqual(2, s.Cles.Count);
            Assert.AreEqual(s.Cles.Count, s.Cles.Distinct().Count(), "chaque signup a sa clé : aucune ne sert deux lancements");
            Assert.IsFalse(a.D.Values.Any(v => s.Cles.Contains(v)), "aucune clé n'est STOCKÉE sur l'appareil");
        }

        // ── G6 · dans le vrai shell ──────────────────────────────────────────────────────────────────────────────────────────────
        [UnityTest]
        public IEnumerator G6_Echec_EcranALaPlaceDeLAccueil_PuisReessayer_Accueil()
        {
            LogAssert.ignoreFailingMessages = true;
            MafiaCleanCity.AdresseDuBack.PoserPourTest("http://127.0.0.1:9");
            var go = new GameObject("AppShell_CompteAppareil");
            try
            {
                var s = new Serveur { Coupe = true };
                var shell = go.AddComponent<AppShell>();
                shell.RegimeAppareilPourTest = true;
                shell.AuthDuComptePourTest = s;
                shell.StockageDuComptePourTest = new Stockage();
                float t0 = Time.realtimeSinceStartup;
                while (shell.EchecDeDemarrage == null && Time.realtimeSinceStartup - t0 < 10f) yield return null;
                Assert.IsNotNull(shell.EchecDeDemarrage, "réseau coupé : « La partie n'a pas pu commencer »");
                Assert.AreEqual("La partie n’a pas pu commencer", shell.EchecDeDemarrage.Titre);
                Assert.IsNotNull(shell.EchecDeDemarrage.BoutonReessayer, "« Réessayer » est proposé");
                Assert.AreEqual(0, shell.ContentSlot.GetComponentsInChildren<ExceptionQueuePanelController>(false).Length, "jamais un Accueil vide");
                Assert.AreEqual(0, s.Comptes.Count);

                s.Coupe = false;
                shell.EchecDeDemarrage.BoutonReessayer.onClick.Invoke();
                t0 = Time.realtimeSinceStartup;
                while (shell.DerniereIssueDuCompte?.Quoi != IssueDuCompte.Etat.Connecte && Time.realtimeSinceStartup - t0 < 10f) yield return null;
                Assert.AreEqual(IssueDuCompte.Etat.Connecte, shell.DerniereIssueDuCompte?.Quoi, "« Réessayer » : le compte est créé");
                Assert.AreEqual(1, s.Comptes.Count, "un seul compte");
                yield return null;
                Assert.IsNull(shell.EchecDeDemarrage, "l'écran d'échec s'est effacé");
            }
            finally
            {
                var shellC = go.GetComponent<AppShell>();
                if (shellC != null && shellC.ShellCanvas != null) Object.DestroyImmediate(shellC.ShellCanvas.gameObject);
                Object.DestroyImmediate(go);
                MafiaCleanCity.AdresseDuBack.Oublier();
                LogAssert.ignoreFailingMessages = false;
            }
        }
    }
}
