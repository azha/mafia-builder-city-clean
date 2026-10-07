using System;
using System.Collections;
using System.Collections.Generic;
using NUnit.Framework;
using UnityEngine;
using UnityEngine.TestTools;
using MafiaCleanCity.Shell;
using Object = UnityEngine.Object;

namespace MafiaCleanCity.CityMap.Tests
{
    // TD-841 (CLIENT-1, 07/10) — LE CÂBLAGE d'AppShell vers `HorlogeLegereBoucle`, par son COMPORTEMENT dans un vrai shell (le StringAssert sur le source d'AppShell.cs
    // a été retiré à la demande de la revue ⊥ de CLIENT-2 : H6a-H6d testent la logique de la boucle, ceci teste qu'AppShell la branche). Hors réseau : port fermé, compte
    // d'appareil et horloge légère remplacés par des témoins, cadence ramenée à 0,1 s.
    //   W1  la boucle démarre APRÈS l'ouverture, lit avec le JETON DU SHELL, ne lit plus en arrière-plan (OnApplicationPause), relit au retour
    //   W2  un 404 est exposé (HorlogeLegereIndisponible) et la boucle espace alors ses lectures (10 min) au lieu de rappeler toutes les 0,1 s
    // ⚠️ Non couvert ici : `SurLectureDuJourServi` (close puis open) — il demande un `PublierOuverture` complet ; il l'est par les tests de CycleDeSession.
    [Category("HorlogeLegere")]
    public class HorlogeLegereAppShellPlayModeTests
    {
        private sealed class Stockage : IStockageDeCompte
        {
            private readonly Dictionary<string, string> d = new Dictionary<string, string>();
            public string Lire(string cle) => d.TryGetValue(cle, out string v) ? v : null;
            public void Ecrire(string cle, string valeur) => d[cle] = valeur;
        }

        /// <summary>L'heure de sortie, en mémoire : le test ne touche JAMAIS aux `PlayerPrefs` de l'éditeur.</summary>
        private sealed class SortieTemoin : IHorodatageDeSortie
        {
            private DateTime? v;
            public DateTime? Lire() => v;
            public void Ecrire(DateTime utc) => v = utc;
            public void Effacer() => v = null;
        }

        /// <summary>Un serveur d'auth qui inscrit tout le monde et rend le jeton « jwt-témoin ».</summary>
        private sealed class AuthTemoin : IAuthDuCompte
        {
            public const string Jeton = "jwt-temoin-horloge";
            public IEnumerator SeConnecter(string identifiant, string secret, Action<ReponseDAuth> fin) { fin(new ReponseDAuth { Http = 200, Jeton = Jeton }); yield break; }
            public IEnumerator SInscrire(string nom, string secret, string cleDIdempotence, Action<ReponseDAuth> fin) { fin(new ReponseDAuth { Http = 201, Jeton = Jeton }); yield break; }
        }

        /// <summary>L'horloge légère : compte les lectures, note le jeton, rend un DTO sans jours (aucune décision de session) ou un code d'erreur.</summary>
        private sealed class HorlogeTemoin : ITransportDeLHorloge
        {
            public int Appels;
            public readonly List<string> Jetons = new List<string>();
            public long Erreur;   // 0 : rend un DTO ; sinon ce code HTTP
            public IEnumerator Lire(string jeton, Action<HorlogeLegereDto> ok, Action<long, string> echec)
            {
                Appels++; Jetons.Add(jeton);
                if (Erreur != 0) echec(Erreur, "erreur");
                else ok(HorlogeLegere.Lire("{\"game_minute\":1,\"game_day\":1,\"day_phase\":\"DAY\",\"family_day\":null,\"opened_family_day\":null," +
                                           "\"real_seconds_per_game_minute\":2,\"in_game_day_length_minutes\":1440}"));
                yield break;
            }
        }

        private GameObject go;

        private AppShell Monter(HorlogeTemoin horloge)
        {
            LogAssert.ignoreFailingMessages = true;   // le port est fermé : le réseau du shell est du bruit attendu, la mesure est l'horloge
            MafiaCleanCity.AdresseDuBack.PoserPourTest("http://127.0.0.1:9");
            go = new GameObject("AppShell_HorlogeLegere");
            var shell = go.AddComponent<AppShell>();
            shell.RegimeAppareilPourTest = true;
            shell.AuthDuComptePourTest = new AuthTemoin();
            shell.StockageDuComptePourTest = new Stockage();
            shell.HorodatageDeSortie = new SortieTemoin();
            shell.TransportDeLHorlogePourTest = horloge;   // sans lui, la boucle ne part pas en batchmode
            shell.CadenceDeLHorlogeS = 0.1f;
            return shell;
        }

        [TearDown]
        public void TearDown()
        {
            if (go != null)
            {
                var s = go.GetComponent<AppShell>();
                if (s != null && s.ShellCanvas != null) Object.DestroyImmediate(s.ShellCanvas.gameObject);
                Object.DestroyImmediate(go);
            }
            go = null;
            MafiaCleanCity.AdresseDuBack.Oublier();
            LogAssert.ignoreFailingMessages = false;
        }

        private static IEnumerator Attendre(Func<bool> condition, float secondes)
        {
            float t0 = Time.realtimeSinceStartup;
            while (!condition() && Time.realtimeSinceStartup - t0 < secondes) yield return null;
        }

        private static IEnumerator Laisser(float secondes)
        {
            float t0 = Time.realtimeSinceStartup;
            while (Time.realtimeSinceStartup - t0 < secondes) yield return null;
        }

        [UnityTest]
        public IEnumerator W1_LaBoucle_DemarreApresLOuverture_LitAvecLeJetonDuShell_SArreteEnArrierePlan_RelitAuRetour()
        {
            var horloge = new HorlogeTemoin();
            AppShell shell = Monter(horloge);
            yield return Attendre(() => horloge.Appels >= 1 && shell.LecturesDeLHorloge >= 1, 20f);   // la lecture est COMPTÉE au tour suivant l'appel (énumérateur imbriqué)
            Assert.GreaterOrEqual(horloge.Appels, 1, "la boucle part d'elle-même après l'ouverture de la session (transport de test posé)");
            Assert.AreEqual(AuthTemoin.Jeton, horloge.Jetons[0], "la lecture porte le jeton QUE LE SHELL a acquis, pas un autre");
            Assert.AreEqual(shell.Token, horloge.Jetons[0]);
            Assert.GreaterOrEqual(shell.LecturesDeLHorloge, 1, "les lectures réussies sont comptées par le shell");
            Assert.LessOrEqual(shell.LecturesDeLHorloge, horloge.Appels);
            Assert.IsNotNull(shell.DerniereHorloge, "la dernière horloge lue est gardée (le seuil de repli en vient)");

            // arrière-plan : plus aucune lecture (le message Unity que le moteur envoie à la mise en pause)
            go.SendMessage("OnApplicationPause", true);
            yield return Laisser(0.25f);   // laisse finir une lecture éventuellement en vol
            int enPause = horloge.Appels;
            yield return Laisser(0.8f);    // huit cadences
            Assert.AreEqual(enPause, horloge.Appels, "en arrière-plan : pas de minuteur, pas de requête");

            // retour au premier plan : la boucle relit
            go.SendMessage("OnApplicationPause", false);
            yield return Attendre(() => horloge.Appels > enPause, 5f);
            Assert.Greater(horloge.Appels, enPause, "au retour au premier plan, la boucle relit");
        }

        [UnityTest]
        public IEnumerator W2_Un404_EstExpose_EtEspaceLesLectures()
        {
            var horloge = new HorlogeTemoin { Erreur = 404 };
            AppShell shell = Monter(horloge);
            yield return Attendre(() => shell.HorlogeLegereIndisponible, 20f);
            Assert.IsTrue(shell.HorlogeLegereIndisponible, "un 404 de la route légère est exposé par le shell");
            Assert.AreEqual(0, shell.LecturesDeLHorloge, "un 404 n'est pas une lecture");
            yield return Laisser(0.3f);   // le temps d'une lecture éventuellement en vol
            int apres404 = horloge.Appels;
            yield return Laisser(1.0f);   // dix cadences de 0,1 s : la boucle attend, elle, 10 minutes
            Assert.AreEqual(apres404, horloge.Appels, "après un 404 la boucle ESPACE ses lectures (10 min) au lieu de rappeler à chaque cadence");
        }
    }
}
