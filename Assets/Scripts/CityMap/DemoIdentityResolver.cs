using System;
using System.Collections;

namespace MafiaCleanCity.CityMap
{
    // Surcharge d'identité de démo par éditeur (ruling user 2026-08-30 : « oui, livre-le »).
    //
    // BESOIN : faire tourner DEUX éditeurs Unity en parallèle (un second worktree,
    // `~/project/mafia-unity-B`, branche `pilote-B`). Deux Play Mode sur LE MÊME compte de démo
    // rejouent l'incident du 2026-08-21 (59/59 → 0/59) : le gouverneur « une décision structurelle
    // par session » (StructuralDecisionGovernorService.commit, services/game-back/src/progression/
    // loop10/structural-decision-governor.service.ts:90 — `enforcementGate = activeSession !== null
    // || …`) ne mord que si une session active existe, et les deux éditeurs, partageant le compte,
    // partagent aussi cette session. La correction n'est PAS côté back (le gouverneur est correct et
    // déjà gaté par joueur) : c'est que les deux éditeurs doivent signer sur des comptes DIFFÉRENTS.
    //
    // Ce résolveur laisse chaque éditeur pointer vers un compte distinct via une variable
    // d'environnement — SANS toucher aux [SerializeField] existants, qui restent le défaut si la
    // variable est absente ou vide (comportement inchangé — §1 du design).
    //
    // DEUX identités mesurées dans ce dépôt (grep `\.SignIn\(` scopé à Assets/Scripts, commentaires
    // retirés, 2026-08-30 — voir la garde ci-dessous) :
    //   - "operational" : operational_demo@example.test / operational-demo-pw — AppShell.cs +
    //     les 7 contrôleurs Operational/* (AutonomyInbox, BuildingCard, Dashboard, ExceptionQueue,
    //     Laundering, PipelineOverview, LieutenantScreen). Compte seedé par
    //     Tools/seed_operational_demo.mjs.
    //   - "citymap" : citymap_demo@example.test / citymap-demo-pw — CityMapController SEUL. Compte
    //     SÉPARÉ (le partage d'UN joueur entre les deux concerns laverait le gradient de heat exact
    //     que seed_citymap_demo.mjs pose — voir le header de ce script). Seedé par
    //     Tools/seed_citymap_demo.mjs.
    // Chacune porte SA PROPRE paire de variables d'environnement — un éditeur peut vouloir décaler
    // l'une sans l'autre (ex. seulement l'identité operational, s'il ne touche jamais City Map).
    //
    // ⛔ GARDE D'ENSEMBLE (DemoIdentityResolverGuardPlayModeTests, portée Assets/Scripts) : ce
    // fichier est le SEUL endroit autorisé à écrire `.SignIn(` — c.-à-d. à appeler le VRAI réseau
    // (`AuthClient.SignIn`). Tout appelant de production route par `ResolveAndSignIn` ci-dessous ;
    // un appel direct `auth.SignIn(demoIdentifier, demoPassword, ...)` fige l'identité SANS lire
    // l'environnement et ferait manquer la surcharge — c'est exactement le geste que la garde
    // interdit. Le nom `ResolveAndSignIn` (et non `SignIn`) est délibéré : un homonyme aurait rendu
    // la garde texte inexploitable (elle aurait dû s'exclure elle-même de son propre motif).
    public static class DemoIdentityResolver
    {
        // -- identité "operational" (AppShell + les 7 contrôleurs Operational/*) ------------------
        public const string OperationalIdentifierEnvVar = "MAFIA_DEMO_IDENTIFIER";
        public const string OperationalPasswordEnvVar = "MAFIA_DEMO_PASSWORD";

        // -- identité "citymap" (CityMapController — compte SÉPARÉ) ------------------------------
        public const string CityMapIdentifierEnvVar = "MAFIA_CITYMAP_IDENTIFIER";
        public const string CityMapPasswordEnvVar = "MAFIA_CITYMAP_PASSWORD";

        /// <summary>La paire RÉELLEMENT utilisée pour un sign-in : celle de la variable
        /// d'environnement nommée quand elle est NON VIDE, sinon le défaut sérialisé de l'appelant
        /// (`fallbackIdentifier`/`fallbackPassword`, le `[SerializeField]` inchangé) — comportement
        /// IDENTIQUE à avant ce lot quand la variable est absente (§1 : « aucun comportement
        /// existant ne bouge »). `Environment.GetEnvironmentVariable` rend `null` aussi bien quand la
        /// variable n'existe pas que quand un appelant l'a explicitement videe — les deux retombent
        /// sur le fallback, jamais sur une chaîne vide envoyée au back.</summary>
        public static (string identifier, string password) Resolve(
            string identifierEnvVar, string passwordEnvVar,
            string fallbackIdentifier, string fallbackPassword)
        {
            string envIdentifier = Environment.GetEnvironmentVariable(identifierEnvVar);
            string envPassword = Environment.GetEnvironmentVariable(passwordEnvVar);
            string identifier = string.IsNullOrEmpty(envIdentifier) ? fallbackIdentifier : envIdentifier;
            string password = string.IsNullOrEmpty(envPassword) ? fallbackPassword : envPassword;
            return (identifier, password);
        }

        /// <summary>Résout PUIS signe — le seul site de production autorisé à appeler
        /// `AuthClient.SignIn` (voir la garde d'ensemble ci-dessus). Même forme de coroutine que
        /// `AuthClient.SignIn` : aucun site d'appel existant ne change de forme `yield return`,
        /// seulement QUI il appelle.</summary>
        public static IEnumerator ResolveAndSignIn(AuthClient auth,
            string identifierEnvVar, string passwordEnvVar,
            string fallbackIdentifier, string fallbackPassword,
            Action<string> onSuccess, Action<string> onError)
        {
            (string identifier, string password) = Resolve(
                identifierEnvVar, passwordEnvVar, fallbackIdentifier, fallbackPassword);
            yield return auth.SignIn(identifier, password, onSuccess, onError);
        }
    }
}
