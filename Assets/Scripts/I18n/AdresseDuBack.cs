using UnityEngine;

namespace MafiaCleanCity
{
    /// <summary>L'URL DE BASE DU BACK — UNE source, lue par tous les clients et tous les écrans (2026-09-24).
    ///
    /// ⛔ POURQUOI (mesuré dans l'APK du 24/09) : 69 fichiers portaient leur propre `"http://localhost"` en défaut. Le build posait
    /// l'URL du VPS sur le seul `AppShell` sérialisé de `Boot.unity` ; les écrans montés à l'exécution (`AddComponent`) gardaient
    /// leur défaut, et le téléphone s'appelait lui-même. La vérification du build lisait la SCÈNE — le paramètre, pas l'effet.
    ///
    /// **Régimes** :
    ///   - ÉDITEUR (PlayMode, tests) : `http://localhost` — le SEUL littéral de ce genre dans `Assets/Scripts` (garde
    ///     `AdresseDuBackPlayModeTests`), compilé sous `UNITY_EDITOR` seulement ⇒ absent de l'APK par construction ;
    ///   - JOUEUR : la ressource `Resources/<see cref="NomRessource"/>.txt`, écrite par `BuildScript` depuis `MAFIA_APK_BASE_URL`
    ///     le temps du build, puis retirée ; absente ⇒ URL vide et erreur NOMMÉE au démarrage, jamais un repli silencieux ;
    ///   - TEST : <see cref="PoserPourTest"/> / <see cref="Oublier"/> (par exemple un écouteur HTTP local qui capture les requêtes).
    /// Lu à l'accès, jamais recopié : un client construit APRÈS `PoserPourTest` part vers l'URL posée.</summary>
    public static class AdresseDuBack
    {
        /// <summary>Nom de la ressource (sans extension) que `BuildScript` écrit sous `Assets/Resources/` le temps du build.</summary>
        public const string NomRessource = "adresse_du_back";

        private static string posee;
        private static string embarquee;

        /// <summary>L'URL de base, sans `/` final exigé (les clients font `TrimEnd('/')`).</summary>
        public static string Url => posee ?? embarquee ?? Defaut;

#if UNITY_EDITOR
        private const string Defaut = "http://localhost";
#else
        private const string Defaut = "";
#endif

        /// <summary>Lit la ressource embarquée AVANT le chargement de la première scène — une lecture de champ ensuite, jamais un
        /// `Resources.Load` depuis un constructeur de MonoBehaviour (interdit par Unity).</summary>
        [RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.BeforeSceneLoad)]
        private static void Charger()
        {
            TextAsset t = Resources.Load<TextAsset>(NomRessource);
            embarquee = t != null && !string.IsNullOrWhiteSpace(t.text) ? t.text.Trim() : null;
#if !UNITY_EDITOR
            if (embarquee == null)
                Debug.LogError("[AdresseDuBack] ressource « " + NomRessource + " » ABSENTE : aucune URL de back embarquée — le build " +
                               "devait l'écrire depuis MAFIA_APK_BASE_URL. Aucune requête ne partira.");
#endif
        }

        /// <summary>⛔ Réservé aux tests : toutes les lectures suivantes rendent <paramref name="url"/>.</summary>
        public static void PoserPourTest(string url) => posee = url;

        /// <summary>⛔ Réservé aux tests : retour au régime normal.</summary>
        public static void Oublier() => posee = null;
    }
}
