using System.Globalization;
using MafiaCleanCity.Shell;

namespace MafiaCleanCity.Operational
{
    // ㉚ « Les deux gestes » — entretenir une liaison, reconstruire une route (design `Tools/gestes-30/DESIGN.md`). Données PURES, sans uGUI :
    // testables sans rendu. Mots RATIFIÉS par f2 le 11/11 (`atelier3d-mafia-C1/poser-chaine-gestes.py`, `ENTRETIEN` / `RECONSTRUCTION`).

    /// <summary>Un mode d'un geste. `Id` = la valeur SERVIE par le back dans le corps du POST (`{mode}`) — jamais affichée. Libellé et sous-titre :
    /// clé DÉRIVÉE (`appro.mode.*` / `appro.mode_sous.*`, non servies — TD-1048) + repli = le mot RATIFIÉ du poseur. `Structurel` = la décision
    /// consomme la « grande décision du jour » (le jeton de ④).</summary>
    public sealed class ModeDeGeste
    {
        public readonly string Id;
        public readonly string CleLibelle, RepliLibelle, CleSousTitre, RepliSousTitre;
        public readonly bool Structurel;

        public ModeDeGeste(string id, string suffixe, string repliLibelle, string repliSousTitre, bool structurel = false)
        {
            Id = id;
            CleLibelle = "appro.mode." + suffixe; RepliLibelle = repliLibelle;
            CleSousTitre = "appro.mode_sous." + suffixe; RepliSousTitre = repliSousTitre;
            Structurel = structurel;
        }
    }

    /// <summary>Un geste : son titre, la phrase COMMUNE à tous ses modes (null si aucune), ses modes dans l'ordre du cadre (trois pour entretenir, DEUX pour reconstruire).</summary>
    public sealed class SpecDeGeste
    {
        public readonly string Id;   // « maintain » (une liaison) | « rebuild » (une route) — nom de la route du back
        public readonly string CleTitre, RepliTitre, CleCommun, RepliCommun;
        public readonly ModeDeGeste[] Modes;

        public SpecDeGeste(string id, string cleTitre, string repliTitre, string cleCommun, string repliCommun, params ModeDeGeste[] modes)
        {
            Id = id; CleTitre = cleTitre; RepliTitre = repliTitre; CleCommun = cleCommun; RepliCommun = repliCommun; Modes = modes;
        }
    }

    /// <summary>Ce sur quoi un geste porte : l'identifiant SERVI (`legs[].leg_id` / `routes[].route_id`, jamais dessiné) et les deux noms affichés.</summary>
    public sealed class CibleDeGeste
    {
        public string Id, Origine, Destination;
    }

    /// <summary>LE POINT D'INJECTION UNIQUE DES COÛTS (TD-1046). Aucun coût n'est servi avant le geste, donc son NOM sur le fil est inconnu : le client n'en
    /// invente AUCUN. `CentimesServis(modeId)` rend les centimes SERVIS (chaîne BigInt, comme `Argent.DepuisCentimes`), ou null = absent = non servi.
    /// ⚠️ Quand BACK-1 servira les coûts, UNE implémentation lit le corps servi ici — la feuille et les gardes ne bougent pas. Jamais les valeurs du poseur
    /// (50 / 300 / 50 €, 100 / 400 / 1 000 €) : ce sont des défauts de tunables du back, pas des données du client.</summary>
    public interface ICoutsParMode
    {
        string CentimesServis(string modeId);
    }

    /// <summary>Le régime d'AUJOURD'HUI : aucun coût servi ⇒ chaque mode est éteint (règle (3) de f2, 11/11 : coût absent ⇒ mode éteint).</summary>
    public sealed class CoutsNonServis : ICoutsParMode
    {
        public static readonly CoutsNonServis Instance = new CoutsNonServis();
        public string CentimesServis(string modeId) => null;
    }

    public static class ChaineDApproGestes
    {
        /// <summary>`#0b1016b3` du voile de la feuille (`.gr30-voile`) : l'opacité CSS, en sRGB — le client la convertit pour le mélange LINÉAIRE d'Unity
        /// (`DashboardController.AlphaLineaireDuVoile`), jamais recopiée telle quelle. Tunable nommé (R2.3), pas un littéral au site de pose.</summary>
        public const float AlphaCssDuVoile = 0xb3 / 255f;

        /// <summary>La clé SERVIE du refus « décision de structure déjà prise » (`error.core_loops.structural_cap_exhausted`) : sa phrase, servie, est ce que dit un mode structurel éteint
        /// quand le jeton est pris (`RefusServi.PhraseDeLaCle`) — jamais une phrase du client.</summary>
        public const string CleRefusDuCap = "error.core_loops.structural_cap_exhausted";

        /// <summary>`POST /v1/supply-chain/legs/:legId/maintain {mode}` — quick_patch / structural_reinforce (STRUCTURELLE) / reroute_bypass
        /// (`leg-maintenance.service.ts:13-20`, V15 @74c5a0b0, lu par le poseur).</summary>
        public static readonly SpecDeGeste Entretien = new SpecDeGeste("maintain",
            "appro.geste.entretenir_la_liaison", "Entretenir la liaison", null, null,
            new ModeDeGeste("quick_patch", "rafistoler", "Rafistoler", "quelques minutes · l’usure retombe, sans disparaître"),
            new ModeDeGeste("structural_reinforce", "renforcer", "Renforcer", "plus longtemps · l’usure est effacée", structurel: true),
            new ModeDeGeste("reroute_bypass", "contourner", "Contourner", "tout de suite · la liaison se repose : plus rien n’y passe tant qu’elle n’a pas récupéré"));

        /// <summary>`POST /v1/operational/routes/:id/rebuild {mode}` — MINIMAL_REROUTE / FULL_GEOMETRIC_RESET (STRUCTURELLE)
        /// (`route.controller.ts:193`, `route-rebuild.service.ts:18-20`). La durée est dite en MOTS : jamais un tick (R2.2).
        /// ⚠️ DEUX modes seulement (revue ⊥ B1, ruling f2 11/11, `poser-chaine-gestes.py:56-58,166-167`) : `MODERATE_RESTRUCTURE` (« Remaniement ») est RETIRÉ de la feuille — au back il fait EXACTEMENT le même
        /// recalcul que `MINIMAL_REROUTE`, seul le coût diffère : un choix plus cher sans effet de plus est un piège. Le back continue de la servir dans `rebuild[]` : une ligne de coût qui ne répond à aucun mode de la feuille est IGNORÉE.</summary>
        public static readonly SpecDeGeste Reconstruction = new SpecDeGeste("rebuild",
            "appro.geste.reconstruire_la_route", "Reconstruire la route",
            "appro.bloc.pendant_les_travaux_plus_rien_ne_passe_sur_cette_route", "Pendant les travaux, plus rien ne passe sur cette route.",
            new ModeDeGeste("MINIMAL_REROUTE", "petit_detour", "Petit détour", "on contourne ce qui gêne, au plus près"),
            new ModeDeGeste("FULL_GEOMETRIC_RESET", "remise_a_plat", "Remise à plat", "on repart d’un trajet droit, sans tenir compte de l’usure", structurel: true));

        /// <summary>Le jeton de structure est-il LIBRE ? Lu comme `DemolitionScreenController:1057` : non publié (`!Connu`) ⇒ DISPONIBLE (hors shell, rien n'a été mesuré).</summary>
        public static bool JetonDisponible => !JetonDeStructure.Connu || !JetonDeStructure.PlafondAtteint;

        /// <summary>La marque « votre grande décision du jour » est une PROMESSE : elle n'est dessinée que si le jeton est libre ET qu'aucune décision structurelle n'a été dépensée (`Utilises == 0`). Après un geste structurel
        /// réussi (`JetonDeStructure.DepenseLocalement`) le client sait qu'il en a pris une, pas s'il en reste (le cap n'est jamais servi, TD-1080) : le mode reste actionnable — le back arbitre par son refus servi — mais sans la promesse.</summary>
        public static bool MarqueDuJeton => JetonDisponible && JetonDeStructure.Utilises == 0;

        /// <summary>Le coût SERVI d'un mode, lisible : les centimes (chaîne BigInt) que l'injection rend, ou null — absent, vide, ou illisible (même règle de lecture que `Argent.DepuisCentimes`).
        /// UNE lecture pour la feuille (ce qu'elle montre) ET le contrôleur (ce qu'il laisse partir) : jamais deux avis sur un même coût.</summary>
        public static string CentimesLisibles(ICoutsParMode couts, string modeId)
        {
            string c = couts != null ? couts.CentimesServis(modeId) : null;
            if (string.IsNullOrEmpty(c)) return null;
            if (!decimal.TryParse(c, NumberStyles.Integer | NumberStyles.AllowLeadingSign, CultureInfo.InvariantCulture, out _)) return null;
            return c;
        }

        /// <summary>LA SEULE RÈGLE D'EXTINCTION d'un mode : il agit si et seulement si son coût est SERVI (règle (3) de f2) ET, quand il est structurel, si le jeton est libre.</summary>
        public static bool Actionnable(ModeDeGeste mode, string coutServi, bool jetonDisponible)
        {
            if (mode == null || string.IsNullOrEmpty(coutServi)) return false;
            return !mode.Structurel || jetonDisponible;
        }
    }
}
