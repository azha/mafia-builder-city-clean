using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text.RegularExpressions;
using NUnit.Framework;
using UnityEngine;

namespace MafiaCleanCity.Tests
{
    /// <summary>⛔ SÉCURITÉ (2026-09-23) — AUCUN journal, AUCUN message d'assertion n'imprime un email, un handle, un identifiant ou un
    /// mot de passe : seulement leur EMPREINTE (`DemoIdentityResolver.Empreinte`). Déclencheur : `CaptureSousShell.cs:194` écrivait
    /// « /v1/me email=… handle=… » EN CLAIR — l'identifiant du compte de capture, moitié de sa paire. Balayage du 23/09 : 20 sites
    /// (1 en production, `DemoIdentityResolver:272` ; 19 en tests), tous passés par l'empreinte.
    /// Règle lue dans les sources (commentaires retirés) :
    /// · `Debug.Log*` / `Console.Write*` : toute expression de l'appel ;
    /// · `Assert.*` : seulement les trous `{…}` des messages interpolés (un argument comparé n'imprime qu'un booléen ou la valeur
    ///   de fixture que le test a lui-même écrite) ;
    /// un identifiant est SENSIBLE s'il finit par email/handle/identifier/identifiant/password ou commence par mdp/password/pwd —
    /// sauf les NOMS de variables d'environnement (`…EnvVar`), les drapeaux (`…IsSet`) et les `…Handler` ; il est NEUTRALISÉ
    /// s'il est passé dans `Empreinte(…)`.</summary>
    [Category("DemoIdentity")]
    public class JournalSansIdentiteTests
    {
        private static readonly Regex Appel = new Regex(
            @"\b(Debug\.Log\w*|Console\.Write\w*|Assert\.\w+|StringAssert\.\w+|CollectionAssert\.\w+)\s*\(");
        private static readonly Regex Jeton = new Regex(@"[A-Za-z_]\w*");
        private static readonly Regex Interpole = new Regex(@"\$@?""((?:[^""\\]|\\.)*)""");
        private static readonly Regex Litteral = new Regex(@"""(?:[^""\\]|\\.)*""");
        private static readonly Regex Trou = new Regex(@"\{([^{}]*)\}");

        internal static bool Sensible(string t)
        {
            string l = t.ToLowerInvariant();
            if (l.EndsWith("envvar") || l.EndsWith("isset") || l.EndsWith("var") || l.EndsWith("handler") || l.EndsWith("handlers"))
                return false;
            return l.EndsWith("email") || l.EndsWith("handle") || l.EndsWith("identifier") || l.EndsWith("identifiant")
                || l.EndsWith("password") || l.StartsWith("mdp") || l.StartsWith("password") || l.StartsWith("pwd");
        }

        private static string AppelComplet(string s, int ouvrante)
        {
            int prof = 0; char dansChaine = '\0';
            for (int i = ouvrante; i < s.Length; i++)
            {
                char c = s[i];
                if (dansChaine != '\0') { if (c == '\\') { i++; continue; } if (c == dansChaine) dansChaine = '\0'; continue; }
                if (c == '"' || c == '\'') { dansChaine = c; continue; }
                if (c == '(') prof++;
                else if (c == ')' && --prof == 0) return s.Substring(ouvrante, i - ouvrante + 1);
            }
            return s.Substring(ouvrante);
        }

        /// <summary>Les fuites d'une source : (ligne, appel, identifiants sensibles non neutralisés).</summary>
        internal static List<string> Fuites(string source)
        {
            string s = IdentiteNonDeriveeDuTexteTests.SansCommentaires(source);
            var res = new List<string>();
            foreach (Match m in Appel.Matches(s))
            {
                string appel = AppelComplet(s, m.Index + m.Length - 1);
                string code;
                if (m.Groups[1].Value.StartsWith("Debug") || m.Groups[1].Value.StartsWith("Console"))
                    code = Litteral.Replace(Interpole.Replace(appel,
                        x => string.Join(" ", Trou.Matches(x.Groups[1].Value).Cast<Match>().Select(t => t.Groups[1].Value))), " ");
                else
                    code = string.Join(" ", Interpole.Matches(appel).Cast<Match>()
                        .SelectMany(x => Trou.Matches(x.Groups[1].Value).Cast<Match>().Select(t => t.Groups[1].Value)));
                var sensibles = Jeton.Matches(code).Cast<Match>().Select(j => j.Value).Where(Sensible)
                    .Where(j => !Regex.IsMatch(code, @"Empreinte\s*\([^()]*\b" + Regex.Escape(j) + @"\b")).Distinct().ToList();
                if (sensibles.Count > 0)
                    res.Add($"{s.Substring(0, m.Index).Count(ch => ch == '\n') + 1}: {m.Groups[1].Value} [{string.Join(", ", sensibles)}]");
            }
            return res;
        }

        /// <summary>Contrôle POSITIF d'abord : une fuite fabriquée DOIT être vue, ses formes neutralisées NE doivent PAS l'être.
        /// Sans lui, un détecteur mort rendrait la garde de dépôt verte à vide.</summary>
        [Test]
        public void ControlePositif_UneFuiteFabriqueeEstVue_LesFormesNeutraliseesNeLeSontPas()
        {
            Assert.AreEqual(1, Fuites("void f(){ Debug.Log($\"email={me.email}\"); }").Count, "Log interpolé d'un email : fuite");
            Assert.AreEqual(1, Fuites("void f(){ Debug.LogWarning(\"id \" + demoIdentifier); }").Count, "concaténation : fuite");
            Assert.AreEqual(1, Fuites("void f(){ Assert.Fail($\"refusé pour « {identifiant} »\"); }").Count, "message d'assertion : fuite");
            Assert.AreEqual(1, Fuites("void f(){ Debug.Log($\"mdp={mdpCapture}\"); }").Count, "mot de passe : fuite");
            Assert.AreEqual(0, Fuites("void f(){ Debug.Log($\"email={DemoIdentityResolver.Empreinte(me.email)}\"); }").Count,
                "passé par Empreinte : neutralisé");
            Assert.AreEqual(0, Fuites("void f(){ Debug.LogWarning($\"'{identifierEnvVar}' {(passwordIsSet ? 1 : 0)} {req.downloadHandler}\"); }").Count,
                "noms de variables, drapeaux, handler : pas des valeurs");
            Assert.AreEqual(0, Fuites("void f(){ Assert.IsFalse(string.IsNullOrEmpty(demoEmail), \"email lu\"); }").Count,
                "argument d'assertion hors message : n'imprime qu'un booléen");
            Assert.AreEqual(0, Fuites("void f(){ // Debug.Log($\"email={me.email}\");\n }").Count, "un commentaire n'est pas un appel");
            Assert.AreEqual("sha256:", MafiaCleanCity.CityMap.DemoIdentityResolver.Empreinte("x").Substring(0, 7));
            Assert.AreEqual(15, MafiaCleanCity.CityMap.DemoIdentityResolver.Empreinte("demo@example.test").Length, "sha256: + 8");
            Assert.AreEqual("∅", MafiaCleanCity.CityMap.DemoIdentityResolver.Empreinte("  "));
            StringAssert.DoesNotContain("demo", MafiaCleanCity.CityMap.DemoIdentityResolver.Empreinte("demo@example.test"));
        }

        /// <summary>LA GARDE DE DÉPÔT : aucune fuite dans `Assets/` (production ET tests), chacune NOMMÉE par fichier et ligne.
        /// Anti-vacuité : le balayage lit plus de 300 fichiers et voit plus de 4000 appels (mesuré le 23/09 : 336 fichiers, 4694 appels).</summary>
        [Test]
        public void AucunJournalNiMessage_NImprimeUnEmailUnHandleUnIdentifiantOuUnMotDePasse()
        {
            var fautes = new List<string>();
            int fichiers = 0, appels = 0;
            foreach (string f in Directory.GetFiles(Application.dataPath, "*.cs", SearchOption.AllDirectories))
            {
                string src = File.ReadAllText(f);
                fichiers++;
                appels += Appel.Matches(IdentiteNonDeriveeDuTexteTests.SansCommentaires(src)).Count;
                foreach (string x in Fuites(src)) fautes.Add($"{f.Substring(Application.dataPath.Length - "Assets".Length)}:{x}");
            }
            Assert.Greater(fichiers, 300, "anti-vacuité : fichiers lus");
            Assert.Greater(appels, 4000, "anti-vacuité : appels de journal et d'assertion vus");
            CollectionAssert.IsEmpty(fautes, "identité imprimée EN CLAIR (passer par DemoIdentityResolver.Empreinte) :\n" +
                                             string.Join("\n", fautes));
        }
    }
}
