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
    // loop10/structural-decision-governor.service.ts:86 — `enforcementGate = activeSession !== null
    // || …`) ne mord que si une session active existe, et les deux éditeurs, partageant le compte,
    // partagent aussi cette session. La correction n'est PAS côté back (le gouverneur est correct et
    // déjà gaté par joueur) : c'est que les deux éditeurs doivent signer sur des comptes DIFFÉRENTS.
    //
    // Ce résolveur laisse chaque éditeur pointer vers un compte distinct via une variable
    // d'environnement — SANS toucher aux [SerializeField] existants, qui restent le défaut si la
    // variable est absente ou vide (comportement inchangé — §1 du design).
    //
    // PRÉCÉDENCE (revue ⊥ B2, corrigée le 2026-08-30 — voir `allowEnvironmentOverride` plus bas).
    // Trois sources concurrentes, mesurées sur TOUT `Assets/Scripts` :
    //   1. Appel EXPLICITE — `AppShell.SetIdentity(...)`, posé AVANT `Start()` par un appelant qui a
    //      une opinion (un test, un futur écran de login). SEUL site de ce type dans tout le dépôt
    //      (`grep -rln "SetIdentity" Assets/Scripts` → `Shell/AppShell.cs`, un seul fichier).
    //   2. Variable d'ENVIRONNEMENT — configuration de POSTE (quel éditeur, quel compte).
    //   3. Défaut `[SerializeField]` SÉRIALISÉ — le cas nominal, aucun appelant n'a d'opinion. Seule
    //      scène qui le sérialise : `Assets/Scenes/Boot.unity:416-417`, valeur = le défaut C#
    //      (`operational_demo@example.test`/`operational-demo-pw`), aucune divergence mesurée.
    //   Un appel EXPLICITE exprime une INTENTION délibérée ; il doit battre une variable
    //   d'environnement, qui n'exprime qu'une configuration de poste. La variable d'environnement,
    //   elle, bat le défaut sérialisé (rang 3, le plus faible). D'où l'ordre : 1 > 2 > 3.
    //   C'est l'APPELANT (`AppShell`) qui sait si son fallback vient d'un appel explicite ou du
    //   défaut sérialisé intouché — ce résolveur reçoit donc la décision en paramètre
    //   (`allowEnvironmentOverride`) plutôt que de la déduire lui-même, qui ne voit qu'un fallback
    //   et ne peut pas distinguer les rangs 1 et 3 sans cette information.
    //
    // Séparément — PAS une question de précédence mais de CONTOURNEMENT total du résolveur :
    // `AuthClient.SignUp` rend lui aussi un jeton exploitable (W3.U1 C2/C3, usage TEST uniquement à
    // ce jour — 0 occurrence sous `Assets/Scripts`, voir la garde ci-dessous). Un futur contrôleur de
    // production qui l'appellerait directement contournerait ce résolveur sans jamais écrire
    // le motif que la garde surveille pour le sign-in réel — d'où le second motif que porte la garde.
    //
    // DEUX identités mesurées dans ce dépôt (oracle Python sur Assets/Scripts, commentaires C#
    // retirés, 2026-08-30 — voir la garde d'ensemble, `DemoIdentityResolverPlayModeTests.cs`) :
    //   - "operational" : operational_demo@example.test / operational-demo-pw — AppShell.cs +
    //     les 7 contrôleurs Operational/* (AutonomyInbox, BuildingCard, Dashboard, ExceptionQueue,
    //     Laundering, PipelineOverview, LieutenantScreen). Compte seedé par
    //     Tools/seed_operational_demo.mjs.
    //   - "citymap" : citymap_demo@example.test / citymap-demo-pw — CityMapController SEUL. Compte
    //     SÉPARÉ (le partage d'UN joueur entre les deux concerns laverait le gradient de heat exact
    //     que seed_citymap_demo.mjs pose — voir le header de ce script). Seedé par
    //     Tools/seed_citymap_demo.mjs.
    //     ⚠️ RÉSERVE (revue ⊥ I3) — INERTE sur le chemin NOMINAL : quand le sign-in du SHELL réussit,
    //     il injecte son jeton dans le locataire CityMap avant que celui-ci ne lise sa propre paire
    //     d'environnement (`CityMapController.AuthThenHeat` sort tôt sur `IsAuthenticated`, jamais
    //     n'atteint `ResolveAndSignIn`). Cette paire ne mord que sur le chemin DÉGRADÉ (sign-in du
    //     shell raté) ou quand `CityMapController` est monté SEUL (un test). Un éditeur qui ne
    //     poserait QUE `MAFIA_CITYMAP_*` n'obtiendrait donc rien sur le chemin nominal.
    // Chacune porte SA PROPRE paire de variables d'environnement — un éditeur peut vouloir décaler
    // l'une sans l'autre (ex. seulement l'identité operational, s'il ne touche jamais City Map) —
    // sous la réserve ci-dessus pour la paire citymap.
    //   ⚠️ Les DEUX variables d'une paire retombent INDÉPENDAMMENT (identifiant et mot de passe
    //   séparément) — un environnement à moitié posé (ex. identifiant surchargé, mot de passe resté
    //   au défaut) produit une identité MIXTE. Décision (revue ⊥ m7) : gardé tel quel, DÉLIBÉRÉMENT
    //   — le back refuse BRUYAMMENT (401, jamais un succès sur la mauvaise combinaison), donc aucun
    //   faux positif silencieux ; forcer les deux variables d'une paire à être posées ENSEMBLE
    //   ajouterait une validation pour un cas déjà sans risque de ce genre.
    //
    // ⛔ GARDE D'ENSEMBLE (DemoIdentityResolverGuardPlayModeTests, portée Assets/Scripts) : ce
    // fichier est le SEUL endroit autorisé à invoquer directement la méthode d'instance de sign-in
    // réseau réel exposée par `AuthClient`. Tout appelant de production route par `ResolveAndSignIn`
    // ci-dessous ; un appel direct qui fige l'identifiant et le mot de passe SANS passer par ce
    // résolveur fige l'identité SANS lire l'environnement et ferait manquer la surcharge — c'est
    // exactement le geste que la garde interdit. Le nom `ResolveAndSignIn` (et non le nom de la
    // méthode qu'il enveloppe) est délibéré : un homonyme aurait rendu la garde texte inexploitable
    // (elle aurait dû s'exclure elle-même de son propre motif). Le(s) motif(s) exact(s) que la garde
    // surveille sont documentés DANS LE TEST (`DemoIdentityResolverPlayModeTests.cs`), jamais ici —
    // les citer ici les réintroduirait dans ce fichier et ferait rougir la garde sur son PROPRE
    // docstring (revue ⊥ B1 : l'instrument de la mesure doit être l'instrument de la garde, et un
    // docstring qui cite le motif qu'il décrit se compte lui-même comme une occurrence).
    public static class DemoIdentityResolver
    {
        // -- identité "operational" (AppShell + les 7 contrôleurs Operational/*) ------------------
        public const string OperationalIdentifierEnvVar = "MAFIA_DEMO_IDENTIFIER";
        public const string OperationalPasswordEnvVar = "MAFIA_DEMO_PASSWORD";

        // -- identité "citymap" (CityMapController — compte SÉPARÉ, réserve I3 ci-dessus) ---------
        public const string CityMapIdentifierEnvVar = "MAFIA_CITYMAP_IDENTIFIER";
        public const string CityMapPasswordEnvVar = "MAFIA_CITYMAP_PASSWORD";

        /// <summary>La paire RÉELLEMENT utilisée pour un sign-in. Quand
        /// <paramref name="allowEnvironmentOverride"/> est vrai (le défaut — comportement inchangé
        /// pour tout appelant sans opinion, rangs 2/3 de la précédence documentée en tête de
        /// fichier) : la variable d'environnement nommée quand elle est NON VIDE/NON BLANCHE, sinon
        /// le fallback. Quand il est FAUX — l'appelant vient de poser le fallback par un appel
        /// EXPLICITE (rang 1, revue ⊥ B2 : `AppShell.SetIdentity`) — la variable d'environnement est
        /// IGNORÉE et le fallback gagne toujours : une intention délibérée bat une configuration de
        /// poste. `string.IsNullOrWhiteSpace` (durci depuis `IsNullOrEmpty`, revue ⊥ m6) traite comme
        /// "absente" une variable non posée, vidée, ou réduite à des espaces — les trois retombent
        /// sur le fallback, jamais une valeur blanche envoyée au back.</summary>
        public static (string identifier, string password) Resolve(
            string identifierEnvVar, string passwordEnvVar,
            string fallbackIdentifier, string fallbackPassword,
            bool allowEnvironmentOverride = true)
        {
            if (!allowEnvironmentOverride) return (fallbackIdentifier, fallbackPassword);

            string envIdentifier = Environment.GetEnvironmentVariable(identifierEnvVar);
            string envPassword = Environment.GetEnvironmentVariable(passwordEnvVar);
            string identifier = string.IsNullOrWhiteSpace(envIdentifier) ? fallbackIdentifier : envIdentifier;
            string password = string.IsNullOrWhiteSpace(envPassword) ? fallbackPassword : envPassword;
            return (identifier, password);
        }

        /// <summary>Résout PUIS signe — le seul site de production autorisé à effectuer l'appel
        /// réseau réel (voir la garde d'ensemble en tête de fichier). Même forme de coroutine que la
        /// méthode qu'il enveloppe : aucun site d'appel existant ne change de forme `yield return`,
        /// seulement QUI il appelle. <paramref name="allowEnvironmentOverride"/> — voir
        /// `Resolve` ci-dessus ; par défaut vrai, comportement inchangé pour les appelants qui ne le
        /// passent pas.</summary>
        public static IEnumerator ResolveAndSignIn(AuthClient auth,
            string identifierEnvVar, string passwordEnvVar,
            string fallbackIdentifier, string fallbackPassword,
            Action<string> onSuccess, Action<string> onError,
            bool allowEnvironmentOverride = true)
        {
            (string identifier, string password) = Resolve(
                identifierEnvVar, passwordEnvVar, fallbackIdentifier, fallbackPassword,
                allowEnvironmentOverride);
            yield return auth.SignIn(identifier, password, onSuccess, onError);
        }
    }
}
