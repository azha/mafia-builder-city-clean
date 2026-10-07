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
    // TD-767 / TD-768 — LE CLIENT HTTP COMMUN (`MafiaCleanCity.ClientHttp`) : un seul point pose `Authorization`, `Idempotency-Key` et la marque de fond.
    //   G1  GARDE DE VALEUR (pas de forme) : 0 littéral « Authorization », « Idempotency-Key », « X-Mafia-Background » ou « Bearer » (casse ignorée)
    //       dans Assets/Scripts hors de I18n/ClientHttp.cs — quelle que soit la forme (constante intermédiaire, helper local, espaces, casse) ;
    //       le balayage lit VRAIMENT les chaînes (régulières, verbatim, interpolées), les caractères et les commentaires (// et /* */) : un `//`
    //       dans une chaîne n'est pas un commentaire. Contrôle positif par forme. En bonus : 0 SetRequestHeader dont le 1er argument n'est pas un littéral.
    //   G5  TD-768 : MÊME MÉTHODE que G1 (balayage de chaînes/commentaires, garde de VALEUR) sur Assets/Tests — 0 littéral de nom d'en-tête (Authorization,
    //       Idempotency-Key, X-Mafia-Background) et 0 SetRequestHeader au 1er argument non littéral, sauf liste blanche EXACTE des lectures (GetRequestHeader) ;
    //       contrôles positifs par forme (littéral, constante, helper, casse, // dans une chaîne, non littéral, verbatim) et liste blanche rougissant en trop comme en moins
    //       « Bearer » n'est PAS cherché dans les tests (décision f2, 07/10) : la pose d'un jeton passe par le NOM d'en-tête, qui est cherché ; et le mot est dans la
    //       prose d'une vingtaine de messages d'assertion (« controller signed in (Bearer acquired) »), qui n'est pas une pose
    //   G1 (TD-843) couvre aussi : 0 littéral `Content-Type` / `application/json`, 0 affectation de `.timeout`, 0 `TimeoutSeconds = <nombre>` hors du client commun,
    //       et « toute requête a un délai » (RequetesSansDelai : chaque requête construite l'est dans une méthode qui appelle `ClientHttp.Delai(` ou une aide de la classe qui le fait)
    //   G2  Authentifier : « Bearer <jeton> » ; jeton vide ou null ⇒ AUCUN en-tête (comme chacun des 103 anciens sites)
    //   G3  Idempotent : un UUID v4 NEUF à chaque appel, posé et rendu ; IdempotentAvec pose la clé telle quelle
    //   G4  Fond : « 1 » à l'octet, par le client commun ET par `EnTetesDuClient.MarquerFond` (qui lui délègue) ; null en, null out
    [Category("ClientHttp")]
    public class ClientHttpPlayModeTests
    {
        private static readonly Regex Valeurs = new Regex(@"authorization|idempotency-key|x-mafia-background|bearer\b|content-type|application/json", RegexOptions.IgnoreCase);
        /// <summary>TD-843 : une AFFECTATION du délai (`x.timeout = …`, pas `==`) ou un délai par défaut recopié (`TimeoutSeconds = 10`), dans le code (hors chaînes et commentaires).</summary>
        private static readonly Regex DelaiAMain = new Regex(@"\.timeout\s*=(?!=)|TimeoutSeconds\s*=\s*\d");
        private static readonly Regex Construction = new Regex(@"UnityWebRequest\s*\.\s*(Get|Post|Put|Delete|Head)\w*\s*\(|new\s+UnityWebRequest\s*\(");
        private static readonly Regex TeteDeMethode = new Regex(@"(\w+)\s*(?:<[^>]*>)?\s*\([^;(){}]*(?:\([^()]*\)[^;(){}]*)*\)\s*(?:where [^{]*)?\{");
        private static readonly HashSet<string> MotsCles = new HashSet<string>
            { "if", "for", "foreach", "while", "switch", "using", "catch", "lock", "fixed", "get", "set", "else", "try", "finally", "do", "return", "new" };

        /// <summary>TD-843 — « toute requête a un délai » : le nombre de requêtes CONSTRUITES (`UnityWebRequest.Get/Post/…(`, `new UnityWebRequest(`) dont la méthode
        /// englobante ne contient pas `Delai(` et n'appelle pas une aide de la MÊME classe qui, elle, le contient (`Preparer(req, …)`). Sur le code balayé
        /// (chaînes et commentaires retirés, accolades fiables). Limite assumée : un homonyme d'aide ou une requête construite hors de toute méthode (initialiseur
        /// de champ) est jugé sur le nom ou compté sans délai ; mesuré le 07/10 sur Assets/Scripts : 116 constructions, 3 sans délai avant ce lot, 0 après. Pure.</summary>
        internal static int RequetesSansDelai(string code)
        {
            var methodes = new List<(string nom, int a, int b)>();
            foreach (Match m in TeteDeMethode.Matches(code))
            {
                if (MotsCles.Contains(m.Groups[1].Value)) continue;
                int i = m.Index + m.Length, profondeur = 1;
                while (i < code.Length && profondeur > 0) { if (code[i] == '{') profondeur++; else if (code[i] == '}') profondeur--; i++; }
                methodes.Add((m.Groups[1].Value, m.Index, i));
            }
            var aides = methodes.Where(x => code.Substring(x.a, x.b - x.a).Contains("Delai(")).Select(x => x.nom).ToList();
            int sans = 0;
            foreach (Match c in Construction.Matches(code))
            {
                var englobantes = methodes.Where(x => x.a <= c.Index && c.Index < x.b).OrderBy(x => x.b - x.a).ToList();
                if (englobantes.Count == 0) { sans++; continue; }
                string corps = code.Substring(englobantes[0].a, englobantes[0].b - englobantes[0].a);
                if (!corps.Contains("Delai(") && !aides.Any(h => Regex.IsMatch(corps, @"\b" + Regex.Escape(h) + @"\s*\("))) sans++;
            }
            return sans;
        }

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
                if (DelaiAMain.IsMatch(code)) v.Add(nom + " [délai posé à la main]");
                if (RequetesSansDelai(code) > 0) v.Add(nom + " [requête sans délai]");
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
                ("K_innocent.cs", "ClientHttp.Json(req); ClientHttp.Delai(req, TimeoutSeconds); var s = \"a // b\"; if (req.timeout == 3) { } // req.timeout = 5;"),
                ("L_content_type.cs", "req.SetRequestHeader(\"Content-Type\", \"text/plain\");"),
                ("M_json_post.cs", "UnityWebRequest.Post(u, corps, \"application/json\");"),
                ("N_delai.cs", "req.timeout = 5;"),
                ("O_delai_defaut.cs", "public int TimeoutSeconds = 10;"),
                ("P_sans_delai.cs", "class C { IEnumerator Lire() { using (UnityWebRequest req = UnityWebRequest.Get(u)) { ClientHttp.Authentifier(req, t); yield return req.SendWebRequest(); } } }"),
                ("Q_avec_delai.cs", "class C { IEnumerator Lire() { using (UnityWebRequest req = UnityWebRequest.Get(u)) { ClientHttp.Delai(req, 5); yield return req.SendWebRequest(); } } }"),
                ("R_par_une_aide.cs", "class C { void Preparer(UnityWebRequest r) { ClientHttp.Delai(r, 5); } IEnumerator Lire() { using (var req = new UnityWebRequest(u)) { Preparer(req); yield return req.SendWebRequest(); } } }"),
            }).Select(x => x.Substring(0, 1)).Distinct().OrderBy(x => x).ToArray();
            CollectionAssert.AreEqual(new[] { "A", "B", "C", "D", "E", "F", "G", "H", "I", "L", "M", "N", "O", "P" }, temoin,
                "chaque forme (directe, constante, helper, espaces, casse, // dans une chaîne, verbatim, interpolée, 1er argument non littéral, Content-Type, application/json, délai à la main, TimeoutSeconds recopié, requête sans délai) est VUE ; " +
                "le commentaire, un `==` sur le délai, les appels du client commun et un // dans une chaîne innocente ne le sont pas");

            var sources = Directory.GetFiles(Path.Combine(Application.dataPath, "Scripts"), "*.cs", SearchOption.AllDirectories)
                .Where(f => !f.Replace('\\', '/').EndsWith("/I18n/ClientHttp.cs"))
                .Select(f => (Path.GetFileName(f), File.ReadAllText(f))).ToList();
            Assert.Greater(sources.Count, 100, "anti-vacuité : les sources d'Assets/Scripts sont lues");
            var contrevenants = Contrevenants(sources);
            Assert.IsEmpty(contrevenants, "une valeur d'en-tête d'authentification/idempotence/fond hors du client commun : " + string.Join(", ", contrevenants));
            int appelants = sources.Count(s => s.Item2.Contains("ClientHttp.Authentifier("));
            Assert.GreaterOrEqual(appelants, 30, "anti-vacuité : les clients passent par Authentifier (34 fichiers au 07/10)");
        }

        private static readonly Regex NomsDEnTete = new Regex(@"authorization|idempotency-key|x-mafia-background", RegexOptions.IgnoreCase);

        /// <summary>TD-768 — la garde de VALEUR de G1 appliquée à Assets/Tests, MÊME MÉTHODE (balayage de chaînes/commentaires, valeur et non forme) : un fichier qui
        /// porte un littéral de nom d'en-tête (`Authorization`, `Idempotency-Key`, `X-Mafia-Background`) — pose directe, constante, alias, helper, casse, `//` dans
        /// une chaîne — ou un `SetRequestHeader` au 1er argument non littéral, est un contrevenant, SAUF liste blanche EXACTE : nom de fichier → nombre de
        /// littéraux permis (un de plus ET un de moins rougissent : une liste blanche périmée ne couvre rien). `-1` = le fichier est le TÉMOIN de la garde
        /// (ses littéraux sont des chaînes d'exemple) ; son code n'a quand même pas le droit de poser un en-tête dont le 1er argument n'est pas un littéral. Pure.
        /// Le mot « Bearer » n'est PAS cherché ici : il est dans la prose de dizaines de messages d'assertion (« controller signed in (Bearer acquired) ») ; tout
        /// moyen de le poser passe par le NOM de l'en-tête, qui est cherché.</summary>
        internal static List<string> ContrevenantsDesTests(IEnumerable<(string nom, string source)> sources, IDictionary<string, int> listeBlanche)
        {
            var v = new List<string>();
            foreach (var (nom, source) in sources)
            {
                var (lit, code) = Balayer(source);
                int n = lit.Count(l => NomsDEnTete.IsMatch(l));
                int permis = listeBlanche.TryGetValue(nom, out int p) ? p : 0;
                if (permis >= 0 && n != permis) v.Add(nom + " [" + n + " littéral(aux) d'en-tête, " + permis + " permis]");
                if (PremierArgNonLitteral.IsMatch(code)) v.Add(nom + " [1er argument non littéral]");
            }
            return v.OrderBy(x => x).ToList();
        }

        /// <summary>Les LECTURES légitimes d'en-têtes (GetRequestHeader), par fichier : HorlogeLegere H3 lit « X-Mafia-Background » ×2 et « Authorization » ×1 ; ce fichier-ci est le témoin.</summary>
        private static readonly Dictionary<string, int> LecturesLegitimes = new Dictionary<string, int>
        {
            { "HorlogeLegerePlayModeTests.cs", 3 },
            { "ClientHttpPlayModeTests.cs", -1 },
        };

        [Test]
        public void G5_TD768_GardeDeValeur_ZeroEnTeteAuthPoseALaMainDansLesTests()
        {
            // contrôles POSITIFS par forme (mêmes formes que G1) + la liste blanche exacte, dans les deux sens
            var blanche = new Dictionary<string, int> { { "Lecteur.cs", 1 }, { "Perime.cs", 1 }, { "Temoin.cs", -1 }, { "H_trop.cs", 1 } };
            var temoin = ContrevenantsDesTests(new[]
            {
                ("A_litteral.cs", "req.SetRequestHeader(\"Authorization\", \"Bearer \" + t);"),
                ("B_constante.cs", "const string H = \"Idempotency-Key\"; req.SetRequestHeader(H, k);"),
                ("C_helper.cs", "Poser(req, \"Authorization\", t);"),
                ("D_casse.cs", "var h = \"authorization\";"),
                ("E_slashes_dans_une_chaine.cs", "var u = Get(\"http://x\"); req.SetRequestHeader(\"X-Mafia-Background\", \"1\");"),
                ("F_non_litteral.cs", "req.SetRequestHeader(nom, valeur);"),
                ("G_verbatim.cs", "var h = @\"a\"\"Authorization\";"),
                ("H_trop.cs", "Assert.AreEqual(1, r.GetRequestHeader(\"Authorization\")); var x = r.GetRequestHeader(\"Idempotency-Key\");"),
                ("Lecteur.cs", "Assert.AreEqual(\"x\", req.GetRequestHeader(\"Authorization\"));"),
                ("Perime.cs", "var rien = 1;"),
                ("Temoin.cs", "var s = \"req.SetRequestHeader(\\\"Authorization\\\", t)\"; // Authorization\n req.SetRequestHeader(\"Content-Type\", \"x\");"),
                ("Innocent.cs", "// req.SetRequestHeader(\"Authorization\", t)\nClientHttp.Authentifier(req, t); var m = \"controller signed in (Bearer acquired)\";"),
            }, blanche).Select(x => x.Substring(0, 1)).Distinct().OrderBy(x => x).ToArray();
            CollectionAssert.AreEqual(new[] { "A", "B", "C", "D", "E", "F", "G", "H", "P" }, temoin,
                "chaque forme (littéral, constante, helper, casse, // dans une chaîne, non littéral, verbatim) est VUE ; la liste blanche rougit en trop (H) et en moins (Perime, « P ») ; " +
                "la lecture permise (Lecteur), le témoin, la citation en commentaire et la prose « Bearer » ne sont pas vus");

            var sources = Directory.GetFiles(Path.Combine(Application.dataPath, "Tests"), "*.cs", SearchOption.AllDirectories)
                .Select(f => (Path.GetFileName(f), File.ReadAllText(f))).ToList();
            Assert.Greater(sources.Count, 100, "anti-vacuité : les sources d'Assets/Tests sont lues");
            var poseurs = ContrevenantsDesTests(sources, LecturesLegitimes);
            Assert.IsEmpty(poseurs, "un test porte un nom d'en-tête hors client commun ni lecture permise : " + string.Join(", ", poseurs));
            Assert.GreaterOrEqual(sources.Count(s => s.Item2.Contains("ClientHttp.Authentifier(")), 10, "anti-vacuité : les tests passent par Authentifier (17 fichiers au 07/10)");
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
        public void G6_Json_PoseLeTypeDeContenu_Delai_PoseLeDelaiExplicite()
        {
            using (var req = UnityWebRequest.Get("http://hote/x"))
            {
                Assert.AreSame(req, ClientHttp.Json(req), "chaînable");
                Assert.AreEqual("application/json", req.GetRequestHeader("Content-Type"));
                Assert.AreSame(req, ClientHttp.Delai(req, 7));
                Assert.AreEqual(7, req.timeout, "le délai EXPLICITE du site est celui posé");
                ClientHttp.Delai(req, ClientHttp.DelaiParDefautS);
                Assert.AreEqual(10, req.timeout, "le défaut des clients était 10 s");
            }
            Assert.IsNull(ClientHttp.Json(null));
            Assert.IsNull(ClientHttp.Delai(null, 5));
            Assert.AreEqual(ClientHttp.DelaiParDefautS, new MafiaCleanCity.Operational.ReputationClient().TimeoutSeconds, "un client prend son défaut du client commun");
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
