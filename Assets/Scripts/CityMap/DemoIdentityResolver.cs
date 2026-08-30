using System;
using System.Collections;
using UnityEngine;

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
    //      une opinion (un test, un futur écran de login). SEULE DÉCLARATION de ce type dans
    //      `Assets/Scripts` (`grep -rln "SetIdentity" Assets/Scripts` → `Shell/AppShell.cs`, un seul
    //      fichier) — portée de CETTE mesure, pas des APPELS : les 10 sites qui invoquent
    //      `SetIdentity` vivent tous dans `Assets/Tests` (m1, revue ⊥ ronde 2 : « la commande citée
    //      prouve elle-même que la portée est Assets/Scripts, qui contient 0 des sites d'appel »).
    //      Population des appelants et sa garde d'ensemble : voir `ExpectedExplicitIdentitySites`
    //      dans `DemoIdentityResolverPlayModeTests.cs`.
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
    //   au défaut) produit une identité MIXTE. Décision (revue ⊥ m7) : gardé tel quel, DÉLIBÉRÉMENT.
    //   ⚠️⚠️ JUSTIFICATION CORRIGÉE (revue ⊥ ronde 2, I1) — l'ancienne motivation (« le back refuse
    //   BRUYAMMENT, 401, sur la mauvaise combinaison ») est RÉFUTÉE par les seeders de CE lot :
    //   `Tools/seed_operational_demo.mjs:53,55` et `Tools/seed_citymap_demo.mjs:30,32` retombent sur
    //   les MÊMES constantes, INDÉPENDAMMENT, exactement comme ce résolveur — donc dans la
    //   configuration MINIMALE d'un second éditeur (poser SEULEMENT `MAFIA_DEMO_IDENTIFIER`, le
    //   callsign se dérive de l'e-mail côté seeder), les deux comptes partagent le mot de passe par
    //   défaut : une paire « mixte » n'est PAS refusée, elle est juste une coïncidence sans risque.
    //   Le VRAI mode d'échec n'est pas la mixité : c'est le REPLI TOTAL SILENCIEUX. Si
    //   `MAFIA_DEMO_IDENTIFIER` tombe (variable non posée — un `export` oublié dans un shell), le
    //   résolveur rend `('operational_demo@example.test', 'operational-demo-pw')` — un compte RÉEL,
    //   SEEDÉ, qui authentifie sans erreur : l'éditeur B repart silencieusement sur le compte
    //   PARTAGÉ de A, zéro 401, zéro log, l'incident du 2026-08-21 de retour. Forcer les deux
    //   variables d'une paire à être posées ENSEMBLE ne fermerait PAS ce mode d'échec (l'absence
    //   TOTALE des deux resterait valide sous une règle « ensemble ou aucune »).
    //   ⚠️⚠️⚠️ CONCLUSION CORRIGÉE (revue ⊥ ronde 3, I1) — la phrase ci-dessus est VRAIE pour le
    //   REPLI TOTAL, mais elle a servi à écarter l'appariement EN GÉNÉRAL alors que le demi-posé a
    //   une SECONDE direction qu'elle ne couvre pas : `MAFIA_DEMO_PASSWORD` posé SEUL, identifiant
    //   oublié. Mesuré : `Tools/seed_operational_demo.mjs:216-220` (même forme,
    //   `Tools/seed_citymap_demo.mjs:72,76`) — quand le compte existe déjà, le seeder exécute
    //   `UPDATE account_credential SET password_hash = hash(PASSWORD) WHERE account_id = …`, trouvé
    //   par EMAIL. `EMAIL` retombe alors sur le défaut (le compte PARTAGÉ de A), `PASSWORD` vaut
    //   celui de B ⇒ le seeder RÉÉCRIT le hash du compte de A avec le mot de passe de B. L'éditeur
    //   A, sans variable, résout les deux défauts et prend un 401 — jusqu'à ce que quelqu'un relance
    //   le seeder sans la variable. Et L'APPARIEMENT FERMERAIT PRÉCISÉMENT CETTE DIRECTION-LÀ — ce
    //   que la conclusion initiale ne pouvait pas dire puisqu'elle n'avait mesuré que l'AUTRE.
    //   ⇒ DÉCISION (revue ⊥ ronde 3) : ne pas apparier par VALIDATION (refuser/bloquer une paire à
    //   moitié posée) — la mutation dangereuse vit DANS LES SEEDERS (deux scripts Node séparés,
    //   lancés dans un process séparé, qui lisent ces mêmes noms de variable INDÉPENDAMMENT de ce
    //   résolveur C#) : apparier `Resolve` seul ne changerait rien à ce que les seeders écrivent en
    //   base, et la garde structurelle de cette direction vivrait dans les deux scripts `.mjs`, hors
    //   du périmètre de ce lot (ni l'un ni l'autre n'est touché ici). À la place : `Resolve` émet un
    //   `Debug.LogWarning` dès qu'EXACTEMENT une des deux variables d'une paire est posée (voir
    //   ci-dessous) — cohérent avec le choix déjà fait pour le repli total juste au-dessus : ce
    //   n'est pas la validation qui manque, c'est l'OBSERVABILITÉ, et elle ne change AUCUNE valeur
    //   de retour (comportement inchangé, revue ⊥ m7). Ce qui atténue ce résidu, et pourquoi il
    //   reste IMPORTANT et non BLOCKING : le mode d'échec est BRUYANT, pas silencieux — 401 côté
    //   client + `Debug.LogError` (`AppShell.cs:362`), diagnosticable même sans le warning.
    //   Voir le log de `ResolveAndSignIn` ci-dessous (revue ⊥ I2) — c'est le détecteur réel du repli
    //   TOTAL ; le `Debug.LogWarning` de `Resolve` est le détecteur réel de CETTE direction-ci.
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
        /// sur le fallback, jamais une valeur blanche envoyée au back. RONDE 4 (revue ⊥ ronde 3, I1) :
        /// quand EXACTEMENT une des deux variables de la paire est posée (l'autre absente/blanche),
        /// un `Debug.LogWarning` signale la paire à MOITIÉ posée — voir « CONCLUSION CORRIGÉE » en
        /// tête de fichier pour le mode d'échec exact que ça rend observable. Ce n'est PAS une
        /// validation : les valeurs de retour restent celles de la règle « chaque variable retombe
        /// indépendamment » (revue ⊥ m7) — comportement de retour INCHANGÉ, seule l'observabilité
        /// change.</summary>
        public static (string identifier, string password) Resolve(
            string identifierEnvVar, string passwordEnvVar,
            string fallbackIdentifier, string fallbackPassword,
            bool allowEnvironmentOverride = true)
        {
            if (!allowEnvironmentOverride) return (fallbackIdentifier, fallbackPassword);

            string envIdentifier = Environment.GetEnvironmentVariable(identifierEnvVar);
            string envPassword = Environment.GetEnvironmentVariable(passwordEnvVar);
            bool identifierIsSet = !string.IsNullOrWhiteSpace(envIdentifier);
            bool passwordIsSet = !string.IsNullOrWhiteSpace(envPassword);
            if (identifierIsSet != passwordIsSet)
            {
                // RONDE 4 (revue ⊥ ronde 3, I1) : paire à MOITIÉ posée — voir « CONCLUSION CORRIGÉE »
                // en tête de fichier pour la direction dangereuse (mot de passe seul posé, identifiant
                // oublié) que ceci rend observable AVANT le 401 qui la signale déjà côté client.
                Debug.LogWarning(
                    $"[DemoIdentityResolver] paire à moitié posée : '{identifierEnvVar}' " +
                    $"{(identifierIsSet ? "posée" : "absente")}, '{passwordEnvVar}' " +
                    $"{(passwordIsSet ? "posée" : "absente")} — les deux variables d'une paire " +
                    "retombent indépendamment (revue ⊥ m7) ; une identité MIXTE ou un repli partiel " +
                    "en résultera.");
            }
            string identifier = identifierIsSet ? envIdentifier : fallbackIdentifier;
            string password = passwordIsSet ? envPassword : fallbackPassword;
            return (identifier, password);
        }

        /// <summary>Résout PUIS signe — le seul site de production autorisé à effectuer l'appel
        /// réseau réel (voir la garde d'ensemble en tête de fichier). Même forme de coroutine que la
        /// méthode qu'il enveloppe : aucun site d'appel existant ne change de forme `yield return`,
        /// seulement QUI il appelle. <paramref name="allowEnvironmentOverride"/> — voir
        /// `Resolve` ci-dessus ; par défaut vrai, comportement inchangé pour les appelants qui ne le
        /// passent pas. RONDE 3 (revue ⊥ ronde 2, I2) : imprime le RÉGIME résolu (explicite/env/défaut) et
        /// l'IDENTIFIANT — jamais le mot de passe — avant de signer. Sans cette ligne, un repli
        /// silencieux sur le compte partagé (voir la réserve m7/I1 ci-dessus) est indiscernable d'un
        /// fonctionnement normal : ni erreur, ni log, ni différence de comportement observable.</summary>
        public static IEnumerator ResolveAndSignIn(AuthClient auth,
            string identifierEnvVar, string passwordEnvVar,
            string fallbackIdentifier, string fallbackPassword,
            Action<string> onSuccess, Action<string> onError,
            bool allowEnvironmentOverride = true)
        {
            (string identifier, string password) = Resolve(
                identifierEnvVar, passwordEnvVar, fallbackIdentifier, fallbackPassword,
                allowEnvironmentOverride);
            Debug.Log($"[DemoIdentityResolver] régime={DescribeRegime(identifierEnvVar, allowEnvironmentOverride)} identité={identifier}");
            yield return auth.SignIn(identifier, password, onSuccess, onError);
        }

        /// <summary>RONDE 3 (revue ⊥ ronde 2, I2) — nomme la source qui l'a emporté POUR
        /// L'IDENTIFIANT SEUL (une des 3 sources de la précédence, tête de fichier), pour LE MÊME
        /// appel que celui qui va signer (relit <paramref name="identifierEnvVar"/> une seconde
        /// fois plutôt que de faire porter un 3e élément au tuple de <see cref="Resolve"/>, qui
        /// resterait alors identique pour les 5 appelants qui le testent directement).
        /// ⚠️ RONDE 4 (revue ⊥ ronde 3, m3) — PORTÉE CORRIGÉE : ne décrit QUE l'identifiant, jamais
        /// le mot de passe ni « la paire » — sous un environnement à moitié posé (m7, voir aussi le
        /// `Debug.LogWarning` de <see cref="Resolve"/>), les deux peuvent venir de sources
        /// DIFFÉRENTES, et ce régime-ci ne renseigne alors QUE sur l'identifiant, la donnée
        /// actionnable pour diagnostiquer I1. `Resolve` et cette méthode utilisent tous deux
        /// `IsNullOrWhiteSpace` (même seuil, vérifié) — donc aucune divergence entre la valeur
        /// résolue et le régime annoncé SUR L'IDENTIFIANT. Jamais le mot de passe — seul
        /// l'identifiant est journalisé.</summary>
        private static string DescribeRegime(string identifierEnvVar, bool allowEnvironmentOverride)
        {
            if (!allowEnvironmentOverride) return "explicite";
            string env = Environment.GetEnvironmentVariable(identifierEnvVar);
            return string.IsNullOrWhiteSpace(env) ? "défaut" : "env";
        }
    }
}
