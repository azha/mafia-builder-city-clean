using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text;
using System.Text.RegularExpressions;
using NUnit.Framework;
using UnityEngine;
using UnityEngine.Networking;
using MafiaCleanCity;

namespace MafiaCleanCity.CityMap.Tests
{
    // TD-767 — LE CLIENT HTTP COMMUN (`MafiaCleanCity.ClientHttp`) : un seul point pose `Authorization`, `Idempotency-Key` et la marque de fond.
    //   G1  GARDE DE VALEUR (pas de forme) : 0 littéral « Authorization », « Idempotency-Key », « X-Mafia-Background » ou « Bearer » (casse ignorée)
    //       dans Assets/Scripts hors de I18n/ClientHttp.cs — quelle que soit la forme (constante intermédiaire, helper local, espaces, casse) ;
    //       le balayage lit VRAIMENT les chaînes (régulières, verbatim, interpolées), les caractères et les commentaires (// et /* */) : un `//`
    //       dans une chaîne n'est pas un commentaire. Contrôle positif par forme. En bonus : 0 SetRequestHeader dont le 1er argument n'est pas un littéral.
    //   G2  Authentifier : « Bearer <jeton> » ; jeton vide ou null ⇒ AUCUN en-tête (comme chacun des 103 anciens sites)
    //   G3  Idempotent : un UUID v4 NEUF à chaque appel, posé et rendu ; IdempotentAvec pose la clé telle quelle
    //   G4  Fond : « 1 » à l'octet, par le client commun ET par `EnTetesDuClient.MarquerFond` (qui lui délègue) ; null en, null out
    [Category("ClientHttp")]
    public class ClientHttpPlayModeTests
    {
        private static readonly Regex Valeurs = new Regex(@"authorization|idempotency-key|x-mafia-background|bearer\b", RegexOptions.IgnoreCase);
        private static readonly Regex PremierArgNonLitteral = new Regex(@"SetRequestHeader\s*\(\s*(?!"")");

        /// <summary>Balayage C# : les contenus de chaînes (régulières, verbatim `@"…"`, interpolées `$"…"`), et le code restant — commentaires retirés, chaque
        /// chaîne réduite à `""`, chaque caractère littéral à `''`. Pure.</summary>
        internal static (List<string> litteraux, string code) Balayer(string src)
        {
            var lit = new List<string>();
            var code = new StringBuilder();
            int i = 0, n = src.Length;
            while (i < n)
            {
                char c = src[i];
                if (c == '/' && i + 1 < n && src[i + 1] == '/') { while (i < n && src[i] != '\n') i++; }
                else if (c == '/' && i + 1 < n && src[i + 1] == '*') { int j = src.IndexOf("*/", i + 2, System.StringComparison.Ordinal); i = j < 0 ? n : j + 2; }
                else if (c == '\'')
                {
                    i++;
                    while (i < n && src[i] != '\'') i += src[i] == '\\' ? 2 : 1;
                    i++; code.Append("''");
                }
                else if ((c == '@' || c == '$') && i + 1 < n && (src[i + 1] == '"' || ((src[i + 1] == '@' || src[i + 1] == '$') && i + 2 < n && src[i + 2] == '"')))
                {
                    bool verbatim = c == '@' || src[i + 1] == '@';
                    i += src[i + 1] == '"' ? 2 : 3;
                    int debut = i;
                    while (i < n)
                    {
                        if (verbatim && src[i] == '"' && i + 1 < n && src[i + 1] == '"') { i += 2; continue; }
                        if (!verbatim && src[i] == '\\') { i += 2; continue; }
                        if (src[i] == '"') break;
                        i++;
                    }
                    lit.Add(src.Substring(debut, System.Math.Min(i, n) - debut)); i++; code.Append("\"\"");
                }
                else if (c == '"')
                {
                    i++; int debut = i;
                    while (i < n && src[i] != '"') i += src[i] == '\\' ? 2 : 1;
                    lit.Add(src.Substring(debut, System.Math.Min(i, n) - debut)); i++; code.Append("\"\"");
                }
                else { code.Append(c); i++; }
            }
            return (lit, code.ToString());
        }

        /// <summary>Les fichiers qui portent une VALEUR d'en-tête d'authentification/idempotence/fond, ou un SetRequestHeader au 1er argument non littéral. Pure.</summary>
        internal static List<string> Contrevenants(IEnumerable<(string nom, string source)> sources)
        {
            var v = new List<string>();
            foreach (var (nom, source) in sources)
            {
                var (lit, code) = Balayer(source);
                if (lit.Any(l => Valeurs.IsMatch(l))) v.Add(nom + " [littéral]");
                if (PremierArgNonLitteral.IsMatch(code)) v.Add(nom + " [1er argument non littéral]");
            }
            return v.OrderBy(x => x).ToList();
        }

        [Test]
        public void G1_GardeDeValeur_ZeroLitteralDEnTeteHorsDuClientCommun()
        {
            // contrôle POSITIF, une forme à la fois : chacune doit être vue ; les innocents non
            var temoin = Contrevenants(new[]
            {
                ("A_direct.cs", "req.SetRequestHeader(\"Authorization\", \"x\");"),
                ("B_constante.cs", "const string H = \"Idempotency-Key\"; req.SetRequestHeader(H, k);"),
                ("C_helper.cs", "Poser(req, \"X-Mafia-Background\", \"1\");"),
                ("D_espaces.cs", "req.SetRequestHeader( \"Authorization\" , t);"),
                ("E_casse.cs", "var h = \"authorization\";"),
                ("F_slashes_dans_une_chaine.cs", "var u = Get(\"http://x\"); req.SetRequestHeader(\"Authorization\", t);"),
                ("G_verbatim.cs", "var h = @\"a\"\"b Bearer \";"),
                ("H_interpole.cs", "var h = $\"Bearer {t}\";"),
                ("I_non_litteral.cs", "req.SetRequestHeader(nom, valeur);"),
                ("J_commentaire.cs", "// req.SetRequestHeader(\"Authorization\", t)\n/* \"Bearer \" */ ClientHttp.Authentifier(req, t);"),
                ("K_content_type.cs", "req.SetRequestHeader(\"Content-Type\", \"application/json\"); var s = \"a // b\";"),
            }).Select(x => x.Substring(0, 1)).Distinct().OrderBy(x => x).ToArray();
            CollectionAssert.AreEqual(new[] { "A", "B", "C", "D", "E", "F", "G", "H", "I" }, temoin,
                "chaque forme (directe, constante, helper, espaces, casse, // dans une chaîne, verbatim, interpolée, 1er argument non littéral) est VUE ; " +
                "le commentaire, Content-Type et un // dans une chaîne innocente ne le sont pas");

            var sources = Directory.GetFiles(Path.Combine(Application.dataPath, "Scripts"), "*.cs", SearchOption.AllDirectories)
                .Where(f => !f.Replace('\\', '/').EndsWith("/I18n/ClientHttp.cs"))
                .Select(f => (Path.GetFileName(f), File.ReadAllText(f))).ToList();
            Assert.Greater(sources.Count, 100, "anti-vacuité : les sources d'Assets/Scripts sont lues");
            var contrevenants = Contrevenants(sources);
            Assert.IsEmpty(contrevenants, "une valeur d'en-tête d'authentification/idempotence/fond hors du client commun : " + string.Join(", ", contrevenants));
            int appelants = sources.Count(s => s.Item2.Contains("ClientHttp.Authentifier("));
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
