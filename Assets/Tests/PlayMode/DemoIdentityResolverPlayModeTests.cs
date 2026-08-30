using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using NUnit.Framework;
using UnityEngine;
using MafiaCleanCity.CityMap;

namespace MafiaCleanCity.CityMap.Tests
{
    // Surcharge d'identité de démo par éditeur (ruling user 2026-08-30 : « oui, livre-le »). Deux
    // éditeurs Unity en parallèle (un second worktree `~/project/mafia-unity-B`, branche
    // `pilote-B`) rejouent l'incident du 2026-08-21 (59/59 → 0/59, TD gouverneur "une décision
    // structurelle par session") s'ils partagent le MÊME compte de démo — voir le docstring de
    // `DemoIdentityResolver` (Assets/Scripts/CityMap/DemoIdentityResolver.cs) pour le mécanisme
    // complet.
    //
    // ⛔ NON EXÉCUTÉ (contrainte machine 2026-08-30) : un gate E2E à 5 shards tournait au moment de
    // ce lot ET l'éditeur de l'user était ouvert sur ce dossier (verrou de projet). Ces tests ne
    // touchent PAS le réseau ([Test] purs, pas [UnityTest]) donc rien n'en dépendait pour ÊTRE
    // écrits correctement — mais la consigne du contrôleur est absolue : aucun run, d'aucune sorte,
    // pendant cette session. Vérification par LECTURE seule (voir le commit de ce lot pour le détail
    // des comptes avant/après).
    //
    // ── Portée déclarée : Resolve() est de la LOGIQUE PURE (pas de réseau, pas de Unity API) — ces
    // tests l'exercent directement, indépendamment de tout compte réel. Les noms de variable
    // d'environnement utilisés ici sont FABRIQUÉS pour le test (jamais MAFIA_DEMO_IDENTIFIER /
    // MAFIA_CITYMAP_IDENTIFIER eux-mêmes) — Resolve() prend le NOM en paramètre, donc ce fichier n'a
    // besoin de toucher AUCUNE variable réellement consommée par un contrôleur de production, et ne
    // peut donc jamais corrompre l'environnement d'un autre test co-tenant du même process (leçon du
    // socle : "un contrôle positif qui écrit sur un état partagé contamine le dépôt" — ici il n'y a
    // pas d'état partagé À CONTAMINER, par construction).
    [Category("DemoIdentity")]
    public class DemoIdentityResolverResolveBehaviorTests
    {
        [Test]
        public void Resolve_NoEnvVar_ReturnsFallback_DefaultBehaviourUnchanged()
        {
            const string envVarId = "MAFIA_DEMO_IDENTITY_RESOLVER_TEST_ABSENT_ID";
            const string envVarPw = "MAFIA_DEMO_IDENTITY_RESOLVER_TEST_ABSENT_PW";
            Environment.SetEnvironmentVariable(envVarId, null);
            Environment.SetEnvironmentVariable(envVarPw, null);

            (string identifier, string password) = DemoIdentityResolver.Resolve(
                envVarId, envVarPw, "fallback@example.test", "fallback-pw");

            Assert.AreEqual("fallback@example.test", identifier,
                "§1 : aucun comportement existant ne bouge quand la variable est absente.");
            Assert.AreEqual("fallback-pw", password);
        }

        [Test]
        public void Resolve_EnvVarSet_OverridesFallback()
        {
            const string envVarId = "MAFIA_DEMO_IDENTITY_RESOLVER_TEST_SET_ID";
            const string envVarPw = "MAFIA_DEMO_IDENTITY_RESOLVER_TEST_SET_PW";
            try
            {
                Environment.SetEnvironmentVariable(envVarId, "pilote-b@example.test");
                Environment.SetEnvironmentVariable(envVarPw, "pilote-b-pw");

                (string identifier, string password) = DemoIdentityResolver.Resolve(
                    envVarId, envVarPw, "fallback@example.test", "fallback-pw");

                Assert.AreEqual("pilote-b@example.test", identifier,
                    "la variable d'environnement doit surcharger le [SerializeField] par défaut.");
                Assert.AreEqual("pilote-b-pw", password);
            }
            finally
            {
                Environment.SetEnvironmentVariable(envVarId, null);
                Environment.SetEnvironmentVariable(envVarPw, null);
            }
        }

        [Test]
        public void Resolve_EnvVarEmptyString_FallsBack_NeverSendsEmptyToBack()
        {
            const string envVarId = "MAFIA_DEMO_IDENTITY_RESOLVER_TEST_EMPTY_ID";
            const string envVarPwUnset = "MAFIA_DEMO_IDENTITY_RESOLVER_TEST_EMPTY_PW_UNSET";
            try
            {
                Environment.SetEnvironmentVariable(envVarId, string.Empty);

                (string identifier, string password) = DemoIdentityResolver.Resolve(
                    envVarId, envVarPwUnset, "fallback@example.test", "fallback-pw");

                Assert.AreEqual("fallback@example.test", identifier,
                    "une variable VIDÉE explicitement ne doit jamais produire un identifiant vide " +
                    "envoyé au back (Environment.GetEnvironmentVariable rend aussi bien null pour " +
                    "\"absente\" que pour \"vide\" — les deux retombent sur le fallback).");
                Assert.AreEqual("fallback-pw", password);
            }
            finally
            {
                Environment.SetEnvironmentVariable(envVarId, null);
            }
        }

        [Test]
        public void OperationalAndCityMap_EnvVarNames_AreAllFourDistinct()
        {
            // Anti-collision : les DEUX identités (§ du design) ne doivent JAMAIS partager un nom de
            // variable — sinon surcharger l'une surchargerait l'autre par accident, et un éditeur qui
            // voulait ne décaler QUE l'identité operational déciderait aussi pour citymap.
            var names = new[]
            {
                DemoIdentityResolver.OperationalIdentifierEnvVar,
                DemoIdentityResolver.OperationalPasswordEnvVar,
                DemoIdentityResolver.CityMapIdentifierEnvVar,
                DemoIdentityResolver.CityMapPasswordEnvVar,
            };
            Assert.AreEqual(4, names.Distinct().Count(),
                "les 4 noms de variable d'environnement doivent être deux à deux distincts.");
        }
    }

    // ── LA GARDE D'ENSEMBLE ──────────────────────────────────────────────────────────────────────
    //
    // Mécanisme : le motif de balayage porte sur `.SignIn(` — un point IMMÉDIATEMENT suivi de
    // `SignIn(` — qui est le point de passage obligé du VRAI appel réseau (`AuthClient.SignIn`,
    // une méthode d'INSTANCE) quel que soit le nom du receveur (`auth`, `this.auth`, `_auth`,
    // `authClient`, …) : Scan_DetectsAliasedReceiverForms le prouve sur 4 formes. Ce motif exclut
    // structurellement les deux formes qui ne sont PAS le vrai appel réseau : la DÉCLARATION
    // (`public IEnumerator SignIn(...`, précédée d'un espace, jamais d'un point) et le nom de la
    // méthode-résolveur elle-même, délibérément appelée `ResolveAndSignIn` et non `SignIn` — un
    // homonyme se serait inclus lui-même dans son propre motif (voir le docstring de
    // `DemoIdentityResolver`).
    //
    // Mesuré 2026-08-30 (grep `\.SignIn\(`, Python, commentaires retirés, portée Assets/Scripts) :
    // AVANT ce lot, 9 fichiers/9 occurrences (AppShell.cs + CityMapController.cs + les 7 contrôleurs
    // Operational/*), chacun appelant `auth.SignIn(demoIdentifier, demoPassword, ...)` en dur, SANS
    // lire l'environnement. APRÈS : 1 fichier/1 occurrence (CityMap/DemoIdentityResolver.cs, la
    // seule ligne autorisée), et les 9 anciens sites appellent désormais
    // `DemoIdentityResolver.ResolveAndSignIn(...)`. Un `git diff --stat` du lot confirme le compte.
    [Category("DemoIdentity")]
    public class DemoIdentityResolverGuardPlayModeTests
    {
        private const string RealNetworkSignInAccess = ".SignIn(";

        public readonly struct ScanResult
        {
            public readonly int TotalOccurrences;
            public readonly HashSet<string> FilesWithHits; // chemins relatifs, '/'

            public ScanResult(int total, HashSet<string> files)
            {
                TotalOccurrences = total;
                FilesWithHits = files;
            }
        }

        /// <summary>Compte les occurrences LITTÉRALES de <see cref="RealNetworkSignInAccess"/> dans
        /// un texte — un décompte de sous-chaîne, jamais une regex à alternance (le socle : une
        /// alternance nue matche littéralement sur le proxy de mesure de ce dépôt et rend un zéro
        /// silencieux ; ici il n'y a qu'UN SEUL motif, donc `IndexOf` en boucle est à la fois
        /// suffisant et sans ce risque).</summary>
        private static int CountRealNetworkSignInAccess(string text)
        {
            if (string.IsNullOrEmpty(text)) return 0;
            int count = 0, idx = 0;
            while ((idx = text.IndexOf(RealNetworkSignInAccess, idx, StringComparison.Ordinal)) != -1)
            {
                count++;
                idx += RealNetworkSignInAccess.Length;
            }
            return count;
        }

        /// <summary>Balaie récursivement tous les .cs sous `rootDirectory` et retourne le compte
        /// total + l'ensemble des fichiers touchés (chemin relatif à `rootDirectory`, séparateurs
        /// '/'). UNE SEULE implémentation, utilisée à la fois par la mesure réelle (Assets/Scripts)
        /// et par le contrôle positif (répertoire temporaire fabriqué) — jamais deux chemins de
        /// calcul qui pourraient diverger entre eux (précédent maison :
        /// ChromeTabAccentAllowlistPlayModeTests.ScanDirectory).</summary>
        private static ScanResult ScanDirectory(string rootDirectory)
        {
            int total = 0;
            var files = new HashSet<string>();
            if (!Directory.Exists(rootDirectory)) return new ScanResult(0, files);

            foreach (string path in Directory.GetFiles(rootDirectory, "*.cs", SearchOption.AllDirectories))
            {
                int hits = CountRealNetworkSignInAccess(File.ReadAllText(path));
                if (hits <= 0) continue;
                total += hits;
                string rel = path.Substring(rootDirectory.Length)
                    .TrimStart(Path.DirectorySeparatorChar, Path.AltDirectorySeparatorChar)
                    .Replace('\\', '/');
                files.Add(rel);
            }
            return new ScanResult(total, files);
        }

        // ── Robustesse à l'ALIAS du receveur — le motif vise la PROPRIÉTÉ (un appel réseau, quel
        // que soit le nom de la variable qui le porte), pas la tournure vue une seule fois dans le
        // code d'aujourd'hui. Les 9 sites mesurés utilisaient tous `auth`, mais un futur appelant
        // pourrait écrire `this.auth`, `_auth` (convention champ privé) ou renommer la variable —
        // les 4 formes ci-dessous doivent TOUTES compter exactement 1.

        [TestCase("yield return auth.SignIn(demoIdentifier, demoPassword, t => token = t, e => err = e);",
            TestName = "Forme (i) — variable locale nommée `auth`")]
        [TestCase("yield return this.auth.SignIn(demoIdentifier, demoPassword, t => token = t, e => err = e);",
            TestName = "Forme (ii) — accès explicite `this.auth`")]
        [TestCase("yield return _auth.SignIn(demoIdentifier, demoPassword, t => token = t, e => err = e);",
            TestName = "Forme (iii) — convention de champ privé `_auth`")]
        [TestCase("yield return authClient.SignIn(demoIdentifier, demoPassword, t => token = t, e => err = e);",
            TestName = "Forme (iv) — variable renommée `authClient`")]
        public void Scan_DetectsAliasedReceiverForms(string sourceLine)
        {
            Assert.AreEqual(1, CountRealNetworkSignInAccess(sourceLine),
                $"la forme '{sourceLine}' aurait dû être détectée exactement une fois — le motif " +
                "vise le POINT-D'ACCÈS (`.SignIn(`), indépendant du nom du receveur.");
        }

        [Test]
        public void Scan_ResolverEntryPointItself_IsNotMistakenForTheGuardedAccess()
        {
            // Contrôle NÉGATIF : le point d'entrée du résolveur s'appelle délibérément
            // `ResolveAndSignIn`, PAS `SignIn` — un homonyme se serait inclus dans son propre motif
            // et aurait rendu la garde inexploitable (elle n'aurait jamais pu distinguer "j'APPELLE
            // le résolveur" de "je CONTOURNE le résolveur").
            string callSite = "yield return DemoIdentityResolver.ResolveAndSignIn(auth, " +
                "DemoIdentityResolver.OperationalIdentifierEnvVar, DemoIdentityResolver.OperationalPasswordEnvVar, " +
                "demoIdentifier, demoPassword, t => token = t, e => err = e);";
            Assert.AreEqual(0, CountRealNetworkSignInAccess(callSite),
                "un appel AU résolveur ne doit JAMAIS compter comme un contournement du résolveur.");
        }

        [Test]
        public void Scan_DeclarationSite_IsNotMistakenForACall()
        {
            // Contrôle NÉGATIF : la déclaration de la méthode dans AuthClient.cs — un espace précède
            // `SignIn`, jamais un point — ne doit pas compter.
            string declaration = "public IEnumerator SignIn(string identifier, string password,";
            Assert.AreEqual(0, CountRealNetworkSignInAccess(declaration),
                "une DÉCLARATION de méthode n'est pas un APPEL — le motif ne doit pas la compter.");
        }

        // ── Contrôle positif obligatoire — sur un répertoire FABRIQUÉ, jamais sur Assets/Scripts
        // réel : la preuve que le mécanisme peut rougir/reverdir ne doit pas dépendre de, ni
        // polluer, l'arbre source livré (mode léger — aucune écriture dans Assets/).

        [Test]
        public void Scan_NewCallOutsideResolver_BreaksTheSet_ThenRemovalRestoresIt()
        {
            string tempDir = Path.Combine(Path.GetTempPath(), $"demo_identity_guard_scan_{Guid.NewGuid():N}");
            Directory.CreateDirectory(tempDir);
            try
            {
                string resolverFile = Path.Combine(tempDir, "DemoIdentityResolver.cs");
                File.WriteAllText(resolverFile,
                    "yield return auth.SignIn(identifier, password, onSuccess, onError);\n");

                ScanResult baseline = ScanDirectory(tempDir);
                Assert.AreEqual(1, baseline.TotalOccurrences);
                CollectionAssert.AreEquivalent(new[] { "DemoIdentityResolver.cs" }, baseline.FilesWithHits);

                // Appel réseau NEUF, HORS résolveur — c'est précisément ce que le détecteur doit
                // attraper (un 10ᵉ contrôleur qui contournerait ResolveAndSignIn demain).
                string rogueFile = Path.Combine(tempDir, "RogueController.cs");
                File.WriteAllText(rogueFile,
                    "yield return auth.SignIn(demoIdentifier, demoPassword, t => token = t, e => err = e); " +
                    "// contournement non allowlisté\n");

                ScanResult withRogue = ScanDirectory(tempDir);
                Assert.AreEqual(2, withRogue.TotalOccurrences,
                    "l'appel neuf hors résolveur aurait dû être compté (rouge attendu sur l'égalité " +
                    "d'ensembles de la mesure réelle).");
                CollectionAssert.AreNotEquivalent(baseline.FilesWithHits.ToList(), withRogue.FilesWithHits.ToList(),
                    "l'ensemble des fichiers porteurs doit changer quand un appel neuf apparaît — " +
                    "sinon l'assertion d'égalité d'ensembles ne rougirait jamais.");

                // Retrait — reverdit EXACTEMENT à la baseline (même total, même ensemble).
                File.Delete(rogueFile);
                ScanResult afterRemoval = ScanDirectory(tempDir);
                Assert.AreEqual(baseline.TotalOccurrences, afterRemoval.TotalOccurrences);
                CollectionAssert.AreEquivalent(baseline.FilesWithHits, afterRemoval.FilesWithHits);
            }
            finally
            {
                Directory.Delete(tempDir, recursive: true);
            }
        }

        // ── La mesure réelle — Assets/Scripts, allowlist figée à UN SEUL fichier autorisé.

        // Portée déclarée : Assets/Scripts UNIQUEMENT (pas Assets/Tests — un test PEUT signer
        // directement via AuthClient/SessionClient pour ses propres besoins de fixture, ce n'est pas
        // le chemin de production que cette garde protège).
        private static readonly HashSet<string> ExpectedRealNetworkSignInSites = new HashSet<string>
        {
            "CityMap/DemoIdentityResolver.cs",
        };

        [Test]
        public void RealNetworkSignInCalls_LiveOnlyInsideTheResolver_ScopedToAssetsScripts()
        {
            // Anti-vacuité : l'allowlist elle-même n'est pas vide.
            Assert.IsNotEmpty(ExpectedRealNetworkSignInSites);

            string scriptsRoot = Path.Combine(Application.dataPath, "Scripts");
            Assert.IsTrue(Directory.Exists(scriptsRoot), $"Assets/Scripts introuvable à {scriptsRoot}");

            ScanResult scan = ScanDirectory(scriptsRoot);

            Assert.AreEqual(ExpectedRealNetworkSignInSites.Count, scan.TotalOccurrences,
                $"attendu {ExpectedRealNetworkSignInSites.Count} appel(s) réseau réel(s) " +
                $"(`.SignIn(`), trouvé {scan.TotalOccurrences} — un appelant a contourné " +
                "DemoIdentityResolver.ResolveAndSignIn sans mettre à jour cette allowlist.");
            CollectionAssert.AreEquivalent(ExpectedRealNetworkSignInSites, scan.FilesWithHits,
                "l'ENSEMBLE des fichiers appelant `.SignIn(` directement a divergé de l'allowlist " +
                "déclarée — soit un nouveau contournement, soit le résolveur a été déplacé/renommé " +
                "sans mettre à jour cette liste.");
        }
    }
}
