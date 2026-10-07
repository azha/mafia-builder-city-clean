using System;
using System.Collections;
using System.Globalization;
using UnityEngine;

namespace MafiaCleanCity.Shell
{
    /// <summary>B4 (passe UX 2026-09-24, f2-D18 « Reprenez demain ») — LE CYCLE DE VIE DE LA SESSION CÔTÉ CLIENT.
    ///
    /// Mesuré sur le serveur (`corps/105` → `117` de la passe) : le monde ne tourne que sous une session ouverte et fraîche, et le
    /// client n'appelait jamais `session/close` ni ne rouvrait au retour. Mesuré dans le back (f2, `session.repository.ts:69-77`,
    /// `:114`) : `close` pose `ended_at`, et `open` ne réutilise JAMAIS une session fermée — fermer à chaque passage en
    /// arrière-plan rendrait donc une décision de structure à chaque aller-retour. D'où la forme, toute côté client (0 changement
    /// au back) :
    ///   · en arrière-plan : NE PAS fermer ; horodater la sortie et la PERSISTER (elle doit survivre à un kill) ;
    ///   · RÈGLE (forme finale f2, 26/09) : une NOUVELLE session s'ouvre quand le JOUR DE LA FAMILLE a changé depuis l'ouverture
    ///     de la session courante — les DEUX valeurs sont SERVIES (le jour courant, et celui de l'ouverture), comparées sans rien
    ///     mémoriser côté client ; différentes ⇒ `close` PUIS `open` (le « demain » de f2-D18), puis bandeau et écran courant.
    ///     Testée au retour au premier plan, au démarrage à froid, et à chaque lecture de l'horloge légère au premier plan
    ///     (`AppShell.SurLectureDuJourServi`). Le back applique le rattrapage AVANT : une transition ne donne qu'un close/open ;
    ///   · REPLI, tant que le jour n'est pas servi : une absence ≥ `SeuilDeRepliMinutes` (la durée réelle d'UNE journée de jeu)
    ///     ⇒ `close` puis `open` ; sinon rien au retour, l'ouverture habituelle au démarrage à froid ;
    ///   · pas de minuteur en arrière-plan ; horodatage absent (première ouverture) ⇒ ouverture simple.
    /// ⛔ Historique du 26/09 : un seuil de 5 min rendait la décision de structure jusqu'à 12 fois par heure (ce que ㉜ dit
    ///   empêcher), et 5 min ne font pas « demain » ; puis 48 min ne voyaient pas le joueur qui RESTE dans l'app au-delà d'une
    ///   journée. D'où le jour servi.</summary>
    public static class CycleDeSession
    {
        /// <summary>REPLI SEULEMENT (quand le jour de la famille n'est pas servi) : la durée RÉELLE d'une journée de jeu, dérivée du
        /// tunable du back `T.tick.real_seconds_per_game_minute = 2` (`citysim-tunables.ts:24`) : 1 440 min de jeu × 2 s = 48 min.
        /// ⚠️ Recopie d'un tunable : elle sort quand le back sert le jour (demandé par f2), ou sa cadence.</summary>
        public const int SeuilDeRepliMinutes = 48;

        /// <summary>Les noms des deux champs SERVIS, CONFIRMÉS par le back (BACK-2, lot/l1, 07/10) : `family_day` et `opened_family_day`, dans
        /// `session/open` (14 → 16 clés) comme dans l'horloge légère (`HorlogeLegere.Cles`), TOUJOURS présents et nullables (null = pas
        /// d'ancre de naissance / pas de session active). Pas encore déployés au 07/10 : tant que le back ne les sert pas, le repli joue.</summary>
        public static class ChampsServis
        {
            public const string JourDeFamille = "family_day";
            public const string JourDeFamilleALOuverture = "opened_family_day";
        }

        public enum Decision { Rien, Ouvrir, FermerPuisOuvrir }

        /// <summary>Pure. `jourServi`/`jourDOuverture` = les deux jours de la famille SERVIS (null : non servis) ; `sortieUtc` =
        /// l'horodatage persisté (null : aucune sortie notée), lu SEULEMENT en repli.</summary>
        public static Decision Decider(int? jourServi, int? jourDOuverture, DateTime? sortieUtc, DateTime maintenantUtc, bool demarrageAFroid)
        {
            bool changement = jourServi.HasValue && jourDOuverture.HasValue
                ? jourServi.Value != jourDOuverture.Value
                : sortieUtc.HasValue && maintenantUtc - sortieUtc.Value >= TimeSpan.FromMinutes(SeuilDeRepliMinutes);
            if (changement) return Decision.FermerPuisOuvrir;
            return demarrageAFroid ? Decision.Ouvrir : Decision.Rien;
        }

        /// <summary>Un entier de premier niveau ou imbriqué, par son NOM, dans un corps JSON brut — `JsonUtility` ne lie un champ que
        /// par un nom écrit en dur dans le DTO, et ces deux noms-ci sont des clés SERVIES, nullables. Null si absent, `null` ou non entier.</summary>
        public static int? LireEntier(string json, string champ)
        {
            if (string.IsNullOrEmpty(json) || string.IsNullOrEmpty(champ)) return null;
            var m = System.Text.RegularExpressions.Regex.Match(json,
                "\"" + System.Text.RegularExpressions.Regex.Escape(champ) + "\"\\s*:\\s*(-?\\d+)");
            return m.Success && int.TryParse(m.Groups[1].Value, NumberStyles.Integer, CultureInfo.InvariantCulture, out int v) ? v : (int?)null;
        }

        /// <summary>Au DÉMARRAGE À FROID : l'ouverture habituelle (elle LIT aussi les deux jours servis) ; si le jour a changé — ou, en
        /// repli, si l'absence notée atteint le seuil — `close` puis `open`. `ouverte` reçoit la session à garder (null : échec).</summary>
        public static IEnumerator AuDemarrage(string jeton, ITransportDeSession transport, DateTime? sortieUtc, DateTime maintenantUtc,
                                              Action<SessionOpenDto> ouverte, Action<string> echec)
        {
            SessionOpenDto lue = null;
            yield return transport.Ouvrir(jeton, x => lue = x, (c, m) => echec?.Invoke($"{c}: {m}"));
            if (lue == null) { ouverte?.Invoke(null); yield break; }
            if (Decider(lue.JourDeFamille, lue.JourDeFamilleALOuverture, sortieUtc, maintenantUtc, false) != Decision.FermerPuisOuvrir)
            {
                ouverte?.Invoke(lue);
                yield break;
            }
            SessionOpenDto neuve = null;
            yield return Appliquer(Decision.FermerPuisOuvrir, jeton, transport, x => neuve = x, echec);
            ouverte?.Invoke(neuve);
        }

        /// <summary>Au RETOUR au premier plan. Jour servi (la dernière ouverture le portait) : on le RELIT par `open` (même session tant
        /// qu'elle n'est pas fermée) et on compare ; sinon le repli d'absence, SANS requête sous le seuil. `nouvelle` n'est appelé
        /// qu'avec une NOUVELLE session.</summary>
        public static IEnumerator AuRetour(string jeton, ITransportDeSession transport, bool jourServi, DateTime? sortieUtc,
                                           DateTime maintenantUtc, Action<SessionOpenDto> nouvelle, Action<string> echec)
        {
            if (!jourServi)
            {
                yield return Appliquer(Decider(null, null, sortieUtc, maintenantUtc, false), jeton, transport, nouvelle, echec);
                yield break;
            }
            SessionOpenDto lue = null;
            yield return transport.Ouvrir(jeton, x => lue = x, (c, m) => echec?.Invoke($"{c}: {m}"));
            if (lue == null) yield break;
            yield return SurLecture(jeton, transport, lue.JourDeFamille, lue.JourDeFamilleALOuverture, nouvelle, echec);
        }

        /// <summary>À chaque lecture des deux jours servis au premier plan (l'horloge légère) : différents ⇒ `close` puis `open`.
        /// Absents ou égaux ⇒ rien, aucune requête.</summary>
        public static IEnumerator SurLecture(string jeton, ITransportDeSession transport, int? jourServi, int? jourDOuverture,
                                             Action<SessionOpenDto> nouvelle, Action<string> echec)
        {
            if (!jourServi.HasValue || !jourDOuverture.HasValue || jourServi.Value == jourDOuverture.Value) yield break;
            yield return Appliquer(Decision.FermerPuisOuvrir, jeton, transport, nouvelle, echec);
        }

        /// <summary>Joue la décision sur le transport, dans l'ordre : `close` (si demandé) PUIS `open`. Un `close` qui échoue
        /// n'empêche pas l'ouverture (le back le dit idempotent ; au pire la session d'avant continue, et le journal le dit).</summary>
        public static IEnumerator Appliquer(Decision decision, string jeton, ITransportDeSession transport,
                                            Action<SessionOpenDto> ouverte, Action<string> echec)
        {
            if (decision == Decision.Rien || transport == null) yield break;
            if (decision == Decision.FermerPuisOuvrir)
                yield return transport.Fermer(jeton, (c, m) => Debug.LogWarning($"[CycleDeSession] session/close : {c} {m}"));
            yield return transport.Ouvrir(jeton, ouverte, (c, m) => echec?.Invoke($"{c}: {m}"));
        }
    }

    /// <summary>Les deux requêtes du cycle — l'interface permet de les CAPTURER hors réseau.</summary>
    public interface ITransportDeSession
    {
        IEnumerator Fermer(string jeton, Action<long, string> echec);
        IEnumerator Ouvrir(string jeton, Action<SessionOpenDto> ok, Action<long, string> echec);
    }

    public sealed class TransportDeSessionHttp : ITransportDeSession
    {
        private readonly SessionClient client;
        public TransportDeSessionHttp(SessionClient client) { this.client = client; }
        public IEnumerator Fermer(string jeton, Action<long, string> echec) => client.CloseSession(jeton, _ => { }, echec);
        public IEnumerator Ouvrir(string jeton, Action<SessionOpenDto> ok, Action<long, string> echec) =>
            client.OpenSession(jeton, Application.version, ok, echec);
    }

    /// <summary>Où l'heure de sortie survit à un kill.</summary>
    public interface IHorodatageDeSortie
    {
        DateTime? Lire();
        void Ecrire(DateTime utc);
        void Effacer();
    }

    /// <summary>`PlayerPrefs` + `Save()` IMMÉDIAT : sans le `Save`, Unity n'écrit qu'à la sortie propre — un kill en arrière-plan
    /// (le cas nominal sur un téléphone) perdrait l'heure.</summary>
    public sealed class HorodatageDeSortiePlayerPrefs : IHorodatageDeSortie
    {
        public const string Cle = "mafia.session.sortie_utc_ticks";

        public DateTime? Lire()
        {
            string s = PlayerPrefs.GetString(Cle, "");
            return long.TryParse(s, NumberStyles.Integer, CultureInfo.InvariantCulture, out long ticks) && ticks > 0
                ? new DateTime(ticks, DateTimeKind.Utc) : (DateTime?)null;
        }

        public void Ecrire(DateTime utc)
        {
            PlayerPrefs.SetString(Cle, utc.ToUniversalTime().Ticks.ToString(CultureInfo.InvariantCulture));
            PlayerPrefs.Save();
        }

        public void Effacer()
        {
            if (!PlayerPrefs.HasKey(Cle)) return;
            PlayerPrefs.DeleteKey(Cle);
            PlayerPrefs.Save();
        }
    }
}
