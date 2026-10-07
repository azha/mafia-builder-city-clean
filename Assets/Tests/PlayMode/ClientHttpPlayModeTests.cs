using System.Collections.Generic;
using System.IO;
using System.Linq;
using NUnit.Framework;
using UnityEngine;
using UnityEngine.Networking;
using MafiaCleanCity;

namespace MafiaCleanCity.CityMap.Tests
{
    // TD-767 — LE CLIENT HTTP COMMUN (`MafiaCleanCity.ClientHttp`) : un seul point pose `Authorization`, `Idempotency-Key` et la marque de fond.
    //   G1  GARDE DE CLASSE : 0 `SetRequestHeader("Authorization"` / `("Idempotency-Key"` / `("X-Mafia-Background"` dans Assets/Scripts hors de
    //       I18n/ClientHttp.cs (commentaires exclus) ; le contrôle positif voit un site qui les pose à la main et ignore un commentaire
    //   G2  Authentifier : « Bearer <jeton> » ; jeton vide ou null ⇒ AUCUN en-tête (comme chacun des 103 anciens sites)
    //   G3  Idempotent : un UUID v4 NEUF à chaque appel, posé et rendu ; IdempotentAvec pose la clé telle quelle
    //   G4  Fond : « 1 » à l'octet, par le client commun ET par `EnTetesDuClient.MarquerFond` (qui lui délègue) ; null en, null out
    [Category("ClientHttp")]
    public class ClientHttpPlayModeTests
    {
        private static readonly string[] Motifs =
        {
            "SetRequestHeader(\"Authorization\"", "SetRequestHeader(\"Idempotency-Key\"", "SetRequestHeader(\"X-Mafia-Background\"",
        };

        private static string SansCommentaires(string source) =>
            string.Join("\n", source.Split('\n').Select(l => { int i = l.IndexOf("//"); return i >= 0 ? l.Substring(0, i) : l; }));

        /// <summary>Les fichiers qui posent à la main l'un des trois en-têtes, avec leur nombre de sites. Pure.</summary>
        internal static List<(string nom, int sites)> PoseursALaMain(IEnumerable<(string nom, string source)> sources) =>
            sources.Select(s => (s.nom, sites: Motifs.Sum(m => SansCommentaires(s.source).Split(new[] { m }, System.StringSplitOptions.None).Length - 1)))
                   .Where(s => s.sites > 0).OrderBy(s => s.nom).ToList();

        [Test]
        public void G1_GardeDeClasse_ZeroEnTeteAuthPoseALaMain_HorsDuClientCommun()
        {
            var temoin = PoseursALaMain(new[]
            {
                ("Main.cs", "req.SetRequestHeader(\"Authorization\", \"Bearer \" + t);"),
                ("Cle.cs", "req.SetRequestHeader(\"Idempotency-Key\", k);"),
                ("Note.cs", "// jamais req.SetRequestHeader(\"Authorization\", x) ici\nClientHttp.Authentifier(req, t);"),
                ("Propre.cs", "MafiaCleanCity.ClientHttp.Authentifier(req, t);"),
            });
            CollectionAssert.AreEqual(new[] { "Cle.cs", "Main.cs" }, temoin.Select(t => t.nom).ToArray(),
                "contrôle positif : les deux poses à la main sont vues ; le commentaire et le site propre non");

            var sources = Directory.GetFiles(Path.Combine(Application.dataPath, "Scripts"), "*.cs", SearchOption.AllDirectories)
                .Where(f => !f.Replace('\\', '/').EndsWith("/I18n/ClientHttp.cs"))
                .Select(f => (Path.GetFileName(f), File.ReadAllText(f))).ToList();
            Assert.Greater(sources.Count, 100, "anti-vacuité : les sources d'Assets/Scripts sont lues");
            var poseurs = PoseursALaMain(sources);
            Assert.IsEmpty(poseurs, "un en-tête posé à la main hors du client commun : " + string.Join(", ", poseurs.Select(p => p.nom + "×" + p.sites)));
            int appelants = Directory.GetFiles(Path.Combine(Application.dataPath, "Scripts"), "*.cs", SearchOption.AllDirectories)
                .Count(f => File.ReadAllText(f).Contains("ClientHttp.Authentifier("));
            Assert.GreaterOrEqual(appelants, 30, "anti-vacuité : les clients passent par Authentifier (34 fichiers au 07/10)");
        }

        [Test]
        public void G2_Authentifier_PoseLeBearer_SeulementSiLeJetonEstNonVide()
        {
            using (var req = UnityWebRequest.Get("http://hote/x"))
            {
                Assert.AreSame(req, ClientHttp.Authentifier(req, "jeton-x"), "chaînable");
                Assert.AreEqual("Bearer jeton-x", req.GetRequestHeader("Authorization"));
            }
            foreach (string vide in new string[] { null, "" })
                using (var req = UnityWebRequest.Get("http://hote/x"))
                {
                    ClientHttp.Authentifier(req, vide);
                    Assert.IsNull(req.GetRequestHeader("Authorization"), "jeton vide ou null : aucun en-tête");
                }
            Assert.IsNull(ClientHttp.Authentifier(null, "j"), "null en, null out : pas d'exception");
        }

        [Test]
        public void G3_Idempotent_UnUuidV4Neuf_PoseEtRendu()
        {
            using (var a = UnityWebRequest.Get("http://hote/x"))
            using (var b = UnityWebRequest.Get("http://hote/x"))
            {
                string ka = ClientHttp.Idempotent(a), kb = ClientHttp.Idempotent(b);
                Assert.AreEqual(ka, a.GetRequestHeader("Idempotency-Key"), "la clé rendue est celle posée");
                Assert.AreNotEqual(ka, kb, "une clé NEUVE à chaque appel");
                Assert.IsTrue(System.Guid.TryParseExact(ka, "D", out var g) && ka[14] == '4', "UUID v4 : " + ka);
                ClientHttp.IdempotentAvec(b, "vitrine-sku-1");
                Assert.AreEqual("vitrine-sku-1", b.GetRequestHeader("Idempotency-Key"), "posée telle quelle");
            }
            Assert.DoesNotThrow(() => ClientHttp.Idempotent(null));
        }

        [Test]
        public void G4_Fond_ValeurUnAL_Octet_ParLeClientCommunEtParEnTetesDuClient()
        {
            Assert.AreEqual("X-Mafia-Background", ClientHttp.EnTeteDeFond);
            Assert.AreEqual("1", ClientHttp.ValeurDeFond);
            Assert.AreEqual(ClientHttp.EnTeteDeFond, MafiaCleanCity.Shell.EnTetesDuClient.Fond, "EnTetesDuClient délègue : une seule source");
            Assert.AreEqual(ClientHttp.ValeurDeFond, MafiaCleanCity.Shell.EnTetesDuClient.ValeurFond);
            using (var a = UnityWebRequest.Get("http://hote/x"))
            using (var b = UnityWebRequest.Get("http://hote/x"))
            {
                ClientHttp.Fond(a);
                MafiaCleanCity.Shell.EnTetesDuClient.MarquerFond(b);
                Assert.AreEqual("1", a.GetRequestHeader("X-Mafia-Background"));
                Assert.AreEqual("1", b.GetRequestHeader("X-Mafia-Background"));
            }
            Assert.IsNull(ClientHttp.Fond(null));
            Assert.IsNull(MafiaCleanCity.Shell.EnTetesDuClient.MarquerFond(null));
        }
    }
}
