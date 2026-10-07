using System;
using System.Collections;
using System.Globalization;
using System.Text.RegularExpressions;
using UnityEngine;
using UnityEngine.Networking;

namespace MafiaCleanCity.Shell
{
    /// <summary>C4 — L'HORLOGE LÉGÈRE : `GET /v1/me/clock` (JWT), la route légère de L1 du back (lot/l1 58e3db52, contrat de f2 du 07/10).
    /// Sept clés, TOUJOURS présentes : `game_minute`, `game_day`, `day_phase` (DAWN|DAY|DUSK|NIGHT), `family_day` et
    /// `opened_family_day` (NULLABLES : null = pas d'ancre de naissance / pas de session active), `real_seconds_per_game_minute`,
    /// `in_game_day_length_minutes`. Le client la lit toutes les 30 à 60 s au PREMIER PLAN et compare les deux jours de la famille :
    /// différents ⇒ `close` puis `open` (`CycleDeSession.SurLecture`, via `AppShell.SurLectureDuJourServi`) ; l'un des deux null ⇒ rien.
    /// ⛔ L'appel est un appel de FOND : il porte `X-Mafia-Background: 1` (`EnTetesDuClient.MarquerFond`, valeur « 1 » à l'octet — « true »,
    /// « 0 », vide ou « yes » comptent comme de l'ACTIVITÉ côté back, et la minuterie ferait vivre la session à elle seule).
    /// Forme G : les deux nullables sont lus dans le corps BRUT — ni `JsonUtility` ni un 0 par défaut ne distinguent « null » d'un jour 0.</summary>
    public sealed class HorlogeLegereDto
    {
        public double? GameMinute;
        public int? GameDay;
        public string PhaseDuJour;
        /// <summary>Null : pas d'ancre de naissance (ou clé absente — voir <see cref="JourDeFamilleServi"/>).</summary>
        public int? JourDeFamille;
        /// <summary>Null : pas de session active (ou clé absente — voir <see cref="JourDOuvertureServi"/>).</summary>
        public int? JourDOuvertureDeFamille;
        public double? SecondesParMinuteDeJeu;
        public int? MinutesParJourDeJeu;
        /// <summary>La clé est dans le corps SERVI (même à null) — un back antérieur à L1 ne sert pas la route, ou pas ces clés.</summary>
        public bool JourDeFamilleServi;
        public bool JourDOuvertureServi;
        /// <summary>Combien des SEPT clés du contrat sont dans le corps (7 attendu).</summary>
        public int ClesServies;

        /// <summary>m4 — la durée RÉELLE d'une journée de jeu, en minutes, SERVIE par la route : `in_game_day_length_minutes` ×
        /// `real_seconds_per_game_minute` ÷ 60 (1 440 × 2 ÷ 60 = 48). Elle remplace le repli codé en dur (`CycleDeSession.SeuilDeRepliMinutes`)
        /// dès que la route a été lue. Null si l'une des deux manque ou n'est pas positive.</summary>
        public double? SeuilDeRepliMinutes =>
            MinutesParJourDeJeu.HasValue && SecondesParMinuteDeJeu.HasValue && MinutesParJourDeJeu.Value > 0 && SecondesParMinuteDeJeu.Value > 0
                ? MinutesParJourDeJeu.Value * SecondesParMinuteDeJeu.Value / 60.0 : (double?)null;
    }

    public static class HorlogeLegere
    {
        public static class Cles
        {
            public const string MinuteDeJeu = "game_minute";
            public const string JourDeJeu = "game_day";
            public const string Phase = "day_phase";
            public const string JourDeFamille = "family_day";
            public const string JourDOuverture = "opened_family_day";
            public const string SecondesParMinute = "real_seconds_per_game_minute";
            public const string DureeDuJour = "in_game_day_length_minutes";
            public static readonly string[] Sept =
                { MinuteDeJeu, JourDeJeu, Phase, JourDeFamille, JourDOuverture, SecondesParMinute, DureeDuJour };
        }

        // `([^,}\s]+)` : la valeur brute jusqu'à la virgule, l'accolade ou l'espace — `null`, un nombre, ou une chaîne entre guillemets.
        private static Regex Cle(string nom) =>
            new Regex("\"" + Regex.Escape(nom) + "\"\\s*:\\s*(\"[^\"]*\"|[^,}\\s]+)");

        /// <summary>La valeur brute d'une clé dans le corps (n'importe quel niveau d'imbrication : l'enveloppe ne compte pas), ou null si
        /// la clé est ABSENTE. Le littéral JSON `null` est rendu tel quel (« null ») : présent-mais-null ≠ absent.</summary>
        internal static string Brut(string json, string nom)
        {
            if (string.IsNullOrEmpty(json)) return null;
            var m = Cle(nom).Match(json);
            return m.Success ? m.Groups[1].Value : null;
        }

        private static double? Nombre(string brut) =>
            brut != null && double.TryParse(brut, NumberStyles.Float, CultureInfo.InvariantCulture, out double v) ? v : (double?)null;

        private static int? Entier(string brut) =>
            brut != null && int.TryParse(brut, NumberStyles.Integer, CultureInfo.InvariantCulture, out int v) ? v : (int?)null;

        /// <summary>Pure. Le corps brut → le DTO ; null si le corps est vide ou ne porte AUCUNE des sept clés.</summary>
        public static HorlogeLegereDto Lire(string json)
        {
            if (string.IsNullOrEmpty(json)) return null;
            string jour = Brut(json, Cles.JourDeFamille), ouverture = Brut(json, Cles.JourDOuverture);
            string phase = Brut(json, Cles.Phase);
            var dto = new HorlogeLegereDto
            {
                GameMinute = Nombre(Brut(json, Cles.MinuteDeJeu)),
                GameDay = Entier(Brut(json, Cles.JourDeJeu)),
                PhaseDuJour = phase != null && phase.Length >= 2 && phase[0] == '"' ? phase.Substring(1, phase.Length - 2) : null,
                JourDeFamille = Entier(jour),
                JourDOuvertureDeFamille = Entier(ouverture),
                SecondesParMinuteDeJeu = Nombre(Brut(json, Cles.SecondesParMinute)),
                MinutesParJourDeJeu = Entier(Brut(json, Cles.DureeDuJour)),
                JourDeFamilleServi = jour != null,
                JourDOuvertureServi = ouverture != null,
            };
            foreach (string c in Cles.Sept) if (Brut(json, c) != null) dto.ClesServies++;
            return dto.ClesServies == 0 ? null : dto;
        }
    }

    /// <summary>Le client de la route légère. UNE seule requête, un GET ; l'en-tête de fond y est posé par `MarquerFond`, à un seul endroit
    /// (<see cref="Construire"/>) — la garde de classe lit CE fichier.</summary>
    public sealed class HorlogeLegereClient
    {
        public string BaseUrl = MafiaCleanCity.AdresseDuBack.Url;
        public int TimeoutSeconds = 10;

        public string ClockUrl => BaseUrl.TrimEnd('/') + "/v1/me/clock";

        /// <summary>La requête, NON ENVOYÉE : un test lit son en-tête sans réseau.</summary>
        public UnityWebRequest Construire(string bearer)
        {
            var req = UnityWebRequest.Get(ClockUrl);
            if (!string.IsNullOrEmpty(bearer)) req.SetRequestHeader("Authorization", "Bearer " + bearer);
            req.timeout = TimeoutSeconds;
            return EnTetesDuClient.MarquerFond(req);
        }

        public IEnumerator Lire(string bearer, Action<HorlogeLegereDto> ok, Action<long, string> echec)
        {
            using (UnityWebRequest req = Construire(bearer))
            {
                yield return req.SendWebRequest();
                if (req.result != UnityWebRequest.Result.Success)
                {
                    echec?.Invoke(req.responseCode, req.error);
                    yield break;
                }
                HorlogeLegereDto dto = HorlogeLegere.Lire(req.downloadHandler.text);
                if (dto == null) { echec?.Invoke(req.responseCode, "corps de l'horloge légère vide ou sans aucune des sept clés"); yield break; }
                ok?.Invoke(dto);
            }
        }
    }

    /// <summary>LA BOUCLE de l'horloge légère, hors de tout MonoBehaviour pour se TESTER par son comportement (revue ⊥ de CLIENT-2, m6). Toutes les
    /// `Cadence()` secondes (30 à 60, relue à CHAQUE tour) AU PREMIER PLAN : lit la route, puis `surLecture(family_day, opened_family_day)` décide
    /// close/open. Pas de jeton ou en arrière-plan : aucune requête.
    /// ⛔ UN 404 NE VERROUILLE PLUS RIEN (revue ⊥, n2) : la route n'est pas déployée (L1), ou le contrôleur répond « no player profile » — deux 404 qui ne
    /// se distinguent pas ici, et un joueur resté au premier plan pendant le déploiement ne devait jamais perdre sa boucle. Après un 404 la boucle ATTEND
    /// <see cref="AttenteApres404S"/> (10 min) avant de relire, au lieu d'appeler un 404 toutes les 45 s ; `Rearmer()` (une nouvelle session) la remet à
    /// la cadence normale. Toute autre erreur (réseau, 5xx) se réessaie à la cadence suivante.</summary>
    public sealed class HorlogeLegereBoucle
    {
        public const float CadenceParDefautS = 45f;
        /// <summary>L'attente après un 404 : un réessai ESPACÉ de 10 minutes.</summary>
        public const float AttenteApres404S = 600f;
        public int Lectures { get; private set; }
        public HorlogeLegereDto Derniere { get; private set; }
        /// <summary>La DERNIÈRE lecture a reçu un 404 : la boucle espace ses réessais (10 min). Se lève à la prochaine lecture réussie, ou par `Rearmer()`.</summary>
        public bool Indisponible { get; private set; }
        /// <summary>Test : arrête la boucle (en production elle s'arrête avec son MonoBehaviour).</summary>
        public bool Arret;

        private readonly ITransportDeLHorloge transport;
        private readonly Func<string> jeton;
        private readonly Func<bool> enArrierePlan;
        private readonly Func<int?, int?, IEnumerator> surLecture;
        private readonly Func<float, object> attente;
        private readonly Func<float> cadence;

        /// <param name="attente">ce que la boucle `yield return` entre deux lectures : en production `WaitForSecondsRealtime`, en test `null`.</param>
        /// <param name="cadence">la cadence, RELUE à chaque tour (changer `AppShell.CadenceDeLHorlogeS` en cours de route compte).</param>
        public HorlogeLegereBoucle(ITransportDeLHorloge transport, Func<string> jeton, Func<bool> enArrierePlan,
                                   Func<int?, int?, IEnumerator> surLecture, Func<float, object> attente, Func<float> cadence = null)
        {
            this.transport = transport; this.jeton = jeton; this.enArrierePlan = enArrierePlan;
            this.surLecture = surLecture; this.attente = attente; this.cadence = cadence ?? (() => CadenceParDefautS);
        }

        /// <summary>Une nouvelle session (`session/open` réussi) : la route est relue à la cadence normale, sans attendre les 10 minutes d'un 404.</summary>
        public void Rearmer() => Indisponible = false;

        /// <summary>UNE lecture, puis la décision de session sur ses deux jours.</summary>
        public IEnumerator UneLecture()
        {
            string t = jeton();
            if (string.IsNullOrEmpty(t) || enArrierePlan()) yield break;
            HorlogeLegereDto lue = null; long code = 0;
            yield return transport.Lire(t, d => lue = d, (c, m) => code = c);
            if (lue == null)
            {
                Indisponible = code == 404;
                yield break;
            }
            Indisponible = false;
            Lectures++;
            Derniere = lue;
            yield return surLecture(lue.JourDeFamille, lue.JourDOuvertureDeFamille);
        }

        public IEnumerator Executer()
        {
            while (!Arret)
            {
                yield return attente(Indisponible ? AttenteApres404S : cadence());
                if (Arret) yield break;
                if (enArrierePlan()) continue;
                yield return UneLecture();
            }
        }
    }

    /// <summary>La lecture de l'horloge — l'interface permet de la CAPTURER hors réseau.</summary>
    public interface ITransportDeLHorloge
    {
        IEnumerator Lire(string jeton, Action<HorlogeLegereDto> ok, Action<long, string> echec);
    }

    public sealed class TransportDeLHorlogeHttp : ITransportDeLHorloge
    {
        private readonly HorlogeLegereClient client;
        public TransportDeLHorlogeHttp(HorlogeLegereClient client) { this.client = client; }
        public IEnumerator Lire(string jeton, Action<HorlogeLegereDto> ok, Action<long, string> echec) => client.Lire(jeton, ok, echec);
    }
}
