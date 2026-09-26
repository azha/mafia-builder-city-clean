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
    ///   · au retour au premier plan OU au démarrage à froid : absence ≥ `SeuilDAbsenceMinutes` réelles ⇒ `close` PUIS `open` (une
    ///     NOUVELLE session, le « demain » de f2-D18), puis le bandeau et l'écran courant se rafraîchissent ; sinon rien au retour
    ///     (la même session continue), et au démarrage à froid l'ouverture habituelle ;
    ///   · pas de minuteur en arrière-plan ; horodatage absent (première ouverture) ⇒ ouverture simple.
    /// ⚠️ La grâce vit côté client EN ATTENDANT que le back dise où elle doit vivre (f2, 26/09).</summary>
    public static class CycleDeSession
    {
        /// <summary>LE seuil d'absence, en minutes RÉELLES. Une constante, un seul site.</summary>
        public const int SeuilDAbsenceMinutes = 5;

        public enum Decision { Rien, Ouvrir, FermerPuisOuvrir }

        /// <summary>Pure. `sortieUtc` = l'horodatage persisté (null : aucune sortie notée).</summary>
        public static Decision Decider(DateTime? sortieUtc, DateTime maintenantUtc, bool demarrageAFroid)
        {
            bool longue = sortieUtc.HasValue && maintenantUtc - sortieUtc.Value >= TimeSpan.FromMinutes(SeuilDAbsenceMinutes);
            if (longue) return Decision.FermerPuisOuvrir;
            return demarrageAFroid ? Decision.Ouvrir : Decision.Rien;
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
