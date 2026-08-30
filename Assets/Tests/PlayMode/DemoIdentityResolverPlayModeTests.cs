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
    // RONDE 2 (revue ⊥, 2026-08-30, NOT_APPROVED 2 BLOCKING/3 IMPORTANT/7 MINOR) — MÊME CONTRAINTE
    // MACHINE, re-vérifiée : toujours aucun run possible. B1 fermé par PREUVE (oracle Python répliquant
    // exactement `ScanDirectory`/`CountLiteralOccurrences`, sur le brouillon final — voir le commit) :
    // l'instrument de la mesure et l'instrument de la garde sont désormais LE MÊME code, donc ne
    // peuvent plus diverger.
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
        public void Resolve_EnvVarWhitespaceOnly_FallsBack()
        {
            // Revue ⊥ m6 : durci de IsNullOrEmpty à IsNullOrWhiteSpace — une variable réduite à des
            // espaces (fin de ligne oubliée dans un script de lancement, par ex.) doit retomber sur
            // le fallback plutôt que de partir au back telle quelle.
            const string envVarId = "MAFIA_DEMO_IDENTITY_RESOLVER_TEST_WHITESPACE_ID";
            const string envVarPwUnset = "MAFIA_DEMO_IDENTITY_RESOLVER_TEST_WHITESPACE_PW_UNSET";
            try
            {
                Environment.SetEnvironmentVariable(envVarId, "   ");

                (string identifier, string password) = DemoIdentityResolver.Resolve(
                    envVarId, envVarPwUnset, "fallback@example.test", "fallback-pw");

                Assert.AreEqual("fallback@example.test", identifier,
                    "une variable réduite à des espaces doit retomber sur le fallback, comme une " +
                    "variable absente ou vide.");
            }
            finally
            {
                Environment.SetEnvironmentVariable(envVarId, null);
            }
        }

        [Test]
        public void Resolve_ExplicitOverrideDisallowed_IgnoresEnvVar_FallbackWins()
        {
            // Revue ⊥ B2 : allowEnvironmentOverride=false est le rang 1 de la précédence (appel
            // EXPLICITE) — la variable d'environnement, même POSÉE, doit être ignorée.
            const string envVarId = "MAFIA_DEMO_IDENTITY_RESOLVER_TEST_EXPLICIT_ID";
            const string envVarPw = "MAFIA_DEMO_IDENTITY_RESOLVER_TEST_EXPLICIT_PW";
            try
            {
                Environment.SetEnvironmentVariable(envVarId, "should-never-win@example.test");
                Environment.SetEnvironmentVariable(envVarPw, "should-never-win-pw");

                (string identifier, string password) = DemoIdentityResolver.Resolve(
                    envVarId, envVarPw, "explicit@example.test", "explicit-pw",
                    allowEnvironmentOverride: false);

                Assert.AreEqual("explicit@example.test", identifier,
                    "un appel explicite (allowEnvironmentOverride: false) doit BATTRE une variable " +
                    "d'environnement posée — c'est exactement le défaut que B2 corrige.");
                Assert.AreEqual("explicit-pw", password);
            }
            finally
            {
                Environment.SetEnvironmentVariable(envVarId, null);
                Environment.SetEnvironmentVariable(envVarPw, null);
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
    // Mécanisme : DEUX motifs de balayage, chacun un point IMMÉDIATEMENT suivi du nom d'une méthode
    // d'INSTANCE d'`AuthClient` qui rend un jeton exploitable — `.SignIn(` et `.SignUp(` — quel que
    // soit le nom du receveur (`auth`, `this.auth`, `_auth`, `authClient`, …) :
    // Scan_DetectsAliasedReceiverForms le prouve sur 4 formes pour `.SignIn(`. Chaque motif exclut
    // structurellement les deux formes qui ne sont PAS le vrai appel réseau : la DÉCLARATION
    // (`public IEnumerator SignIn(...`/`SignUp(...`, précédée d'un espace, jamais d'un point) et le
    // nom de la méthode-résolveur elle-même, délibérément appelée `ResolveAndSignIn` et non
    // `SignIn` — un homonyme se serait inclus lui-même dans son propre motif (voir le docstring de
    // `DemoIdentityResolver`).
    //
    // RONDE 2 (revue ⊥, 2026-08-30) — `.SignUp(` est un AJOUT : `AuthClient.SignUp` (W3.U1 C2/C3)
    // rend lui aussi un `access_token` exploitable depuis `/v1/auth/signup`, et le motif `.SignIn(`
    // seul ne l'aurait jamais vu — un contrôleur de production qui l'appellerait directement
    // contournerait intégralement ce résolveur sans jamais écrire `.SignIn(`. Mesuré 2026-08-30 :
    // 0 occurrence sous `Assets/Scripts` aujourd'hui (la porte est ouverte, personne ne l'a
    // franchie) — la garde ferme la porte AVANT qu'elle ne serve, jamais après.
    //
    // Mesuré 2026-08-30 (oracle Python répliquant CE scanner EXACTEMENT — texte brut, sous-chaîne
    // littérale, aucune regex, portée Assets/Scripts) :
    //   `.SignIn(` — AVANT ce lot : 9 fichiers/9 occurrences (AppShell.cs + CityMapController.cs +
    //   les 7 contrôleurs Operational/*), chacun appelant `auth.SignIn(demoIdentifier, demoPassword,
    //   ...)` en dur, SANS lire l'environnement. APRÈS : 1 fichier/1 occurrence
    //   (CityMap/DemoIdentityResolver.cs, la seule ligne autorisée), et les 9 anciens sites appellent
    //   désormais `DemoIdentityResolver.ResolveAndSignIn(...)`.
    //   `.SignUp(` — AVANT et APRÈS ce lot : 0 fichier/0 occurrence sous Assets/Scripts (allowlist
    //   vide, délibérément — voir Scan_SignUpCalls_NeverOccurOutsideTests_ScopedToAssetsScripts).
    // Un `git diff --stat` du lot confirme le compte `.SignIn(`.
    [Category("DemoIdentity")]
    public class DemoIdentityResolverGuardPlayModeTests
    {
        private const string RealNetworkSignInAccess = ".SignIn(";
        private const string RealNetworkSignUpAccess = ".SignUp(";

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

        /// <summary>Compte les occurrences LITTÉRALES de <paramref name="literal"/> dans un texte —
        /// un décompte de sous-chaîne, jamais une regex à alternance (le socle : une alternance nue
        /// matche littéralement sur le proxy de mesure de ce dépôt et rend un zéro silencieux ; ici
        /// chaque appel ne porte qu'UN SEUL motif, donc `IndexOf` en boucle est à la fois suffisant
        /// et sans ce risque). UNE SEULE implémentation pour les DEUX motifs (`.SignIn(`/`.SignUp(`)
        /// — jamais deux fonctions de comptage qui pourraient diverger entre elles.</summary>
        private static int CountLiteralOccurrences(string text, string literal)
        {
            if (string.IsNullOrEmpty(text)) return 0;
            int count = 0, idx = 0;
            while ((idx = text.IndexOf(literal, idx, StringComparison.Ordinal)) != -1)
            {
                count++;
                idx += literal.Length;
            }
            return count;
        }

        private static int CountRealNetworkSignInAccess(string text) =>
            CountLiteralOccurrences(text, RealNetworkSignInAccess);

        private static int CountRealNetworkSignUpAccess(string text) =>
            CountLiteralOccurrences(text, RealNetworkSignUpAccess);

        /// <summary>Balaie récursivement tous les .cs sous `rootDirectory` et retourne le compte
        /// total + l'ensemble des fichiers touchés (chemin relatif à `rootDirectory`, séparateurs
        /// '/') pour le motif donné. UNE SEULE implémentation, utilisée à la fois par la mesure
        /// réelle (Assets/Scripts) et par le contrôle positif (répertoire temporaire fabriqué), pour
        /// les DEUX motifs — jamais deux chemins de calcul qui pourraient diverger entre eux
        /// (précédent maison : ChromeTabAccentAllowlistPlayModeTests.ScanDirectory).</summary>
        private static ScanResult ScanDirectory(string rootDirectory, string literal)
        {
            int total = 0;
            var files = new HashSet<string>();
            if (!Directory.Exists(rootDirectory)) return new ScanResult(0, files);

            foreach (string path in Directory.GetFiles(rootDirectory, "*.cs", SearchOption.AllDirectories))
            {
                int hits = CountLiteralOccurrences(File.ReadAllText(path), literal);
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

        // ── Même trio (alias / résolveur / déclaration) pour `.SignUp(` — ronde 2, revue ⊥ : « deux
        // formulations du même faux ⇒ deux motifs, avec un contrôle positif prouvant que le second
        // attrape sa forme ».

        [TestCase("yield return auth.SignUp(callsign, password, t => token = t, e => err = e);",
            TestName = "SignUp forme (i) — variable locale nommée `auth`")]
        [TestCase("yield return this.auth.SignUp(callsign, password, t => token = t, e => err = e);",
            TestName = "SignUp forme (ii) — accès explicite `this.auth`")]
        [TestCase("yield return _auth.SignUp(callsign, password, t => token = t, e => err = e);",
            TestName = "SignUp forme (iii) — convention de champ privé `_auth`")]
        [TestCase("yield return authClient.SignUp(callsign, password, t => token = t, e => err = e);",
            TestName = "SignUp forme (iv) — variable renommée `authClient`")]
        public void Scan_DetectsSignUpAliasedReceiverForms(string sourceLine)
        {
            Assert.AreEqual(1, CountRealNetworkSignUpAccess(sourceLine),
                $"la forme '{sourceLine}' aurait dû être détectée exactement une fois — le motif " +
                "vise le POINT-D'ACCÈS (`.SignUp(`), indépendant du nom du receveur.");
        }

        [Test]
        public void Scan_SignUpDeclarationSite_IsNotMistakenForACall()
        {
            // Contrôle NÉGATIF : la déclaration de la méthode dans AuthClient.cs — un espace précède
            // `SignUp`, jamais un point — ne doit pas compter.
            string declaration = "public IEnumerator SignUp(string callsign, string password,";
            Assert.AreEqual(0, CountRealNetworkSignUpAccess(declaration),
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

                ScanResult baseline = ScanDirectory(tempDir, RealNetworkSignInAccess);
                Assert.AreEqual(1, baseline.TotalOccurrences);
                CollectionAssert.AreEquivalent(new[] { "DemoIdentityResolver.cs" }, baseline.FilesWithHits);

                // Appel réseau NEUF, HORS résolveur — c'est précisément ce que le détecteur doit
                // attraper (un 10ᵉ contrôleur qui contournerait ResolveAndSignIn demain).
                string rogueFile = Path.Combine(tempDir, "RogueController.cs");
                File.WriteAllText(rogueFile,
                    "yield return auth.SignIn(demoIdentifier, demoPassword, t => token = t, e => err = e); " +
                    "// contournement non allowlisté\n");

                ScanResult withRogue = ScanDirectory(tempDir, RealNetworkSignInAccess);
                Assert.AreEqual(2, withRogue.TotalOccurrences,
                    "l'appel neuf hors résolveur aurait dû être compté (rouge attendu sur l'égalité " +
                    "d'ensembles de la mesure réelle).");
                CollectionAssert.AreNotEquivalent(baseline.FilesWithHits.ToList(), withRogue.FilesWithHits.ToList(),
                    "l'ensemble des fichiers porteurs doit changer quand un appel neuf apparaît — " +
                    "sinon l'assertion d'égalité d'ensembles ne rougirait jamais.");

                // Retrait — reverdit EXACTEMENT à la baseline (même total, même ensemble).
                File.Delete(rogueFile);
                ScanResult afterRemoval = ScanDirectory(tempDir, RealNetworkSignInAccess);
                Assert.AreEqual(baseline.TotalOccurrences, afterRemoval.TotalOccurrences);
                CollectionAssert.AreEquivalent(baseline.FilesWithHits, afterRemoval.FilesWithHits);
            }
            finally
            {
                Directory.Delete(tempDir, recursive: true);
            }
        }

        [Test]
        public void Scan_NewSignUpCallOutsideResolver_IsDetected()
        {
            // Contrôle positif dédié à `.SignUp(` (ronde 2, revue ⊥) : sur un répertoire vide, un
            // SEUL appel `.SignUp(` HORS résolveur doit être détecté — la preuve que le second motif
            // n'est pas un no-op qui rendrait la garde verte à travers exactement le contournement
            // qu'elle prétend fermer (monde dégénéré n°1 de la revue).
            string tempDir = Path.Combine(Path.GetTempPath(), $"demo_identity_guard_signup_{Guid.NewGuid():N}");
            Directory.CreateDirectory(tempDir);
            try
            {
                ScanResult empty = ScanDirectory(tempDir, RealNetworkSignUpAccess);
                Assert.AreEqual(0, empty.TotalOccurrences, "un répertoire vide ne doit rien compter.");

                string rogueFile = Path.Combine(tempDir, "RogueSignupController.cs");
                File.WriteAllText(rogueFile,
                    "yield return auth.SignUp(callsign, password, t => token = t, e => err = e); " +
                    "// contournement total du résolveur, sans passer par le sign-in normal\n");

                ScanResult withRogue = ScanDirectory(tempDir, RealNetworkSignUpAccess);
                Assert.AreEqual(1, withRogue.TotalOccurrences,
                    "un appel `.SignUp(` neuf, hors résolveur, doit être détecté — c'est exactement " +
                    "le contournement que le motif `.SignIn(` seul ne peut pas voir.");
                CollectionAssert.AreEquivalent(new[] { "RogueSignupController.cs" }, withRogue.FilesWithHits);
            }
            finally
            {
                Directory.Delete(tempDir, recursive: true);
            }
        }

        // ── La mesure réelle — Assets/Scripts, allowlist figée à UN SEUL fichier autorisé pour
        // `.SignIn(`, et VIDE pour `.SignUp(` (aucun appelant de production ne doit jamais l'utiliser
        // directement — le seul chemin de production vers un jeton est `ResolveAndSignIn`).

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

            ScanResult scan = ScanDirectory(scriptsRoot, RealNetworkSignInAccess);

            Assert.AreEqual(ExpectedRealNetworkSignInSites.Count, scan.TotalOccurrences,
                $"attendu {ExpectedRealNetworkSignInSites.Count} appel(s) réseau réel(s) " +
                $"(`.SignIn(`), trouvé {scan.TotalOccurrences} — un appelant a contourné " +
                "DemoIdentityResolver.ResolveAndSignIn sans mettre à jour cette allowlist.");
            CollectionAssert.AreEquivalent(ExpectedRealNetworkSignInSites, scan.FilesWithHits,
                "l'ENSEMBLE des fichiers appelant `.SignIn(` directement a divergé de l'allowlist " +
                "déclarée — soit un nouveau contournement, soit le résolveur a été déplacé/renommé " +
                "sans mettre à jour cette liste.");
        }

        [Test]
        public void RealNetworkSignUpCalls_NeverOccurOutsideTests_ScopedToAssetsScripts()
        {
            // Ronde 2 (revue ⊥, monde dégénéré n°1) : `AuthClient.SignUp` rend AUSSI un jeton
            // exploitable — aucun appelant de production ne doit jamais l'utiliser DIRECTEMENT.
            // L'allowlist attendue est VIDE (contrairement à `.SignIn(`) : ce n'est pas encore un
            // patron autorisé quelque part dans Assets/Scripts, seulement dans Assets/Tests (hors
            // portée de cette garde, comme pour `.SignIn(`).
            string scriptsRoot = Path.Combine(Application.dataPath, "Scripts");
            Assert.IsTrue(Directory.Exists(scriptsRoot), $"Assets/Scripts introuvable à {scriptsRoot}");

            ScanResult scan = ScanDirectory(scriptsRoot, RealNetworkSignUpAccess);

            Assert.AreEqual(0, scan.TotalOccurrences,
                $"attendu 0 appel réseau réel (`.SignUp(`) sous Assets/Scripts, trouvé " +
                $"{scan.TotalOccurrences} — un appelant de production a contourné le résolveur via " +
                "SignUp directement (voir Scan_NewSignUpCallOutsideResolver_IsDetected pour la " +
                "preuve que ce motif SAIT détecter ce cas — ce zéro n'est donc pas un zéro aveugle).");
            CollectionAssert.IsEmpty(scan.FilesWithHits);
        }
    }
}
