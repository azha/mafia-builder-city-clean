using System;
using UnityEngine;

namespace MafiaCleanCity.Mouvements
{
    /// <summary>Où le joueur a posé « Mouvement réduit » (⑲). En production `PlayerPrefs` ; un test pose la sienne (en mémoire) :
    /// il ne touche JAMAIS aux `PlayerPrefs` de l'éditeur.</summary>
    public interface IStockageDuMouvementReduit
    {
        bool Lire();
        void Ecrire(bool reduit);
    }

    /// <summary>`PlayerPrefs` + `Save()` IMMÉDIAT : sans le `Save`, Unity n'écrit qu'à la sortie propre — un kill en arrière-plan
    /// perdrait le réglage (même raison que `HorodatageDeSortiePlayerPrefs`).</summary>
    public sealed class StockageMouvementReduitPlayerPrefs : IStockageDuMouvementReduit
    {
        /// <summary>La clé du réglage dans `PlayerPrefs` (en attendant `PATCH /v1/me/settings` : aucun `GET` n'existe, design §5).</summary>
        public const string Cle = "mafia.accessibilite.mouvement_reduit";

        public bool Lire() => PlayerPrefs.GetInt(Cle, 0) == 1;

        public void Ecrire(bool reduit)
        {
            PlayerPrefs.SetInt(Cle, reduit ? 1 : 0);
            PlayerPrefs.Save();
        }
    }

    /// <summary>
    /// CLIENT-3 / E2a (design-couche-mouvement.md §5) — les SOURCES du niveau de mouvement. Deux, et le niveau est `Reduit` si
    /// l'UNE des deux le demande :
    ///  · le réglage du joueur dans ⑲ (« Mouvement réduit », REUSE du canon `screen_14:71,146,208,251,298`) ;
    ///  · Android : `Settings.Global.ANIMATOR_DURATION_SCALE == 0` (l'option « supprimer les animations » du système), relue à
    ///    chaque retour au premier plan. iOS : réglage joueur seul.
    /// Le niveau ne passe que par `RegieMouvement.PoserPolitique`. Lu au démarrage du shell (`AppShell`) et à chaque
    /// `OnApplicationPause(false)` ; ⑲ le réapplique à chaque bascule.
    /// </summary>
    public static class MouvementReduit
    {
        public static IStockageDuMouvementReduit Stockage = new StockageMouvementReduitPlayerPrefs();

        /// <summary>La lecture du système : vrai si l'OS demande de supprimer les animations. Un test la remplace.</summary>
        public static Func<bool> LectureDuSysteme = LireLeSysteme;

        /// <summary>⛔ Réservé aux tests et à `MafiaCI` (`EtatPublieParLeShell.RendrePourTest`) : les deux seams reviennent à la production.</summary>
        public static void OublierPourTest()
        {
            Stockage = new StockageMouvementReduitPlayerPrefs();
            LectureDuSysteme = LireLeSysteme;
        }

        /// <summary>Ce que le joueur a posé dans ⑲.</summary>
        public static bool ReglageDuJoueur => Stockage.Lire();

        /// <summary>Vrai si le système demande de supprimer les animations (faux hors Android).</summary>
        public static bool SystemeLeDemande => LectureDuSysteme();

        /// <summary>§5 — `Reduit` si l'une des deux sources le demande.</summary>
        public static PolitiqueMouvement Niveau(bool joueur, bool systeme)
        {
            return joueur || systeme ? PolitiqueMouvement.Reduit : PolitiqueMouvement.Plein;
        }

        /// <summary>Relit les deux sources et pose le niveau sur la régie.</summary>
        public static void Appliquer()
        {
            RegieMouvement.PoserPolitique(Niveau(ReglageDuJoueur, SystemeLeDemande));
        }

        /// <summary>La bascule de ⑲ : mémorise le réglage du joueur, puis réapplique le niveau.</summary>
        public static void PoserReglageDuJoueur(bool reduit)
        {
            Stockage.Ecrire(reduit);
            Appliquer();
        }

        private static bool LireLeSysteme()
        {
#if UNITY_ANDROID && !UNITY_EDITOR
            try
            {
                using (var unity = new AndroidJavaClass("com.unity3d.player.UnityPlayer"))
                using (var activite = unity.GetStatic<AndroidJavaObject>("currentActivity"))
                using (var resolveur = activite.Call<AndroidJavaObject>("getContentResolver"))
                using (var reglages = new AndroidJavaClass("android.provider.Settings$Global"))
                {
                    string nom = reglages.GetStatic<string>("ANIMATOR_DURATION_SCALE");
                    return reglages.CallStatic<float>("getFloat", resolveur, nom, 1f) == 0f;
                }
            }
            catch (Exception e)
            {
                // Une lecture qui échoue ne force pas le mouvement réduit : le réglage du joueur reste seul. Mais elle se DIT (revue de
                // code E2a, M6) : sinon la source système serait morte à vie sans que personne le sache. Aucun test du créneau ne couvre ce
                // bloc (`#if UNITY_ANDROID && !UNITY_EDITOR`) : sa vérification se fait SUR APPAREIL (dette 26).
                Debug.LogWarning("MouvementReduit : lecture d'ANIMATOR_DURATION_SCALE impossible (" + e.GetType().Name + " : " + e.Message + ")");
                return false;
            }
#else
            return false;
#endif
        }
    }
}
