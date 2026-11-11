using System.Collections.Generic;
using System.Globalization;
using MafiaCleanCity.I18n;
using MafiaCleanCity.Shell;

namespace MafiaCleanCity.Operational
{
    // ㉚ « Les deux gestes » — entretenir une liaison, reconstruire une route (design `Tools/gestes-30/DESIGN.md`). Données PURES, sans uGUI :
    // testables sans rendu. Mots RATIFIÉS par f2 le 11/11 (`atelier3d-mafia-C1/poser-chaine-gestes.py`, `ENTRETIEN` / `RECONSTRUCTION`), SERVIS par BACK-1 (`lot/couts-30` @87820327) sous les clés `appro.titre|etiquette|consequence|sous_titre.*` ;
    // les coûts et les bandes de durée viennent de `GET /v1/supply-chain/upkeep-costs` (design `Tools/couts-30-v15/DESIGN.md`).

    /// <summary>Un mode d'un geste. `Id` = la valeur SERVIE par le back dans le corps du POST (`{mode}`) — jamais affichée. Libellé : `De("appro", "etiquette", RepliLibelle)` — la clé dérivée
    /// du mot EST la clé servie par BACK-1 (`appro.etiquette.<suffixe>`, contrat ㉚ §1.5 @87820327). Conséquence (la phrase sous le libellé) : `Gabarit("appro.consequence.<suffixe>", repli)` —
    /// sa valeur n'est pas son slug, donc une clé EXPLICITE. Les deux replis sont le FR servi à l'octet. `Structurel` = la décision consomme la « grande décision du jour » (le jeton de ④).</summary>
    public sealed class ModeDeGeste
    {
        public readonly string Id;
        public readonly string RepliLibelle, CleConsequence, RepliConsequence;
        public readonly bool Structurel;

        public ModeDeGeste(string id, string suffixe, string repliLibelle, string repliConsequence, bool structurel = false)
        {
            Id = id;
            RepliLibelle = repliLibelle;
            CleConsequence = "appro.consequence." + suffixe; RepliConsequence = repliConsequence;
            Structurel = structurel;
        }
    }

    /// <summary>Un geste : son titre (`De("appro", "titre", RepliTitre)`), la phrase COMMUNE à tous ses modes (`De("appro", "sous_titre", RepliCommun)` ; null si aucune), ses modes dans l'ordre du cadre
    /// (trois pour entretenir, DEUX pour reconstruire). `DitLaBande` : le sous-titre d'un mode commence par le mot de SA bande de durée servie (entretien) ; faux pour reconstruire, dont la durée est dite
    /// par la phrase commune (`rebuild[].duration_band` est identique sur les trois lignes : il ne discrimine rien).</summary>
    public sealed class SpecDeGeste
    {
        public readonly string Id;   // « maintain » (une liaison) | « rebuild » (une route) — nom de la route du back
        public readonly string RepliTitre, RepliCommun;
        public readonly bool DitLaBande;
        public readonly ModeDeGeste[] Modes;

        public SpecDeGeste(string id, string repliTitre, string repliCommun, bool ditLaBande, params ModeDeGeste[] modes)
        {
            Id = id; RepliTitre = repliTitre; RepliCommun = repliCommun; DitLaBande = ditLaBande; Modes = modes;
        }
    }

    /// <summary>Ce sur quoi un geste porte : l'identifiant SERVI (`legs[].leg_id` / `routes[].route_id`, jamais dessiné) et les deux noms affichés.</summary>
    public sealed class CibleDeGeste
    {
        public string Id, Origine, Destination;
    }

    /// <summary>LE POINT D'INJECTION UNIQUE DES COÛTS (TD-1046). `CentimesServis(modeId)` rend les centimes SERVIS (chaîne BigInt, comme `Argent.DepuisCentimes`), ou null = absent = non servi ;
    /// `BandeServie(modeId)` rend la bande de durée SERVIE (`immediate` | `brief` | `extended`), ou null = non servie. Le fil : `GET /v1/supply-chain/upkeep-costs` (BACK-1, `lot/couts-30` @87820327,
    /// `upkeep-costs-view.ts`) — `CoutsServis` le lit, la feuille et les gardes ne bougent pas. Jamais les valeurs du poseur (50 / 300 / 50 €, 100 / 400 / 1 000 €) ni celles du contrat (illustrations) :
    /// ce sont des défauts de tunables du back, pas des données du client.</summary>
    public interface ICoutsParMode
    {
        string CentimesServis(string modeId);
        string BandeServie(string modeId);
    }

    /// <summary>Le régime sans coûts lus : la route n'est pas servie (404 sur la pile d'avant BACK-1), le réseau a coupé, le corps est illisible ⇒ chaque mode est éteint (règle (3) de f2, 11/11 : coût absent ⇒ mode éteint).</summary>
    public sealed class CoutsNonServis : ICoutsParMode
    {
        public static readonly CoutsNonServis Instance = new CoutsNonServis();
        public string CentimesServis(string modeId) => null;
        public string BandeServie(string modeId) => null;
    }

    /// <summary>Les coûts LUS du fil (`ChaineDApproClient.LireCouts`) : par `mode` servi, ses centimes (chaîne BigInt) et sa bande. Un mode absent, dont la ligne n'a pas de `cost_cents` entier, ou servi en double ⇒ null
    /// (on ne choisit pas). Aucune valeur n'est codée ici : tout vient du corps.</summary>
    public sealed class CoutsServis : ICoutsParMode
    {
        private readonly Dictionary<string, string> centimes;
        private readonly Dictionary<string, string> bandes;

        internal CoutsServis(Dictionary<string, string> centimes, Dictionary<string, string> bandes)
        {
            this.centimes = centimes ?? new Dictionary<string, string>();
            this.bandes = bandes ?? new Dictionary<string, string>();
        }

        public string CentimesServis(string modeId) => modeId != null && centimes.TryGetValue(modeId, out string c) ? c : null;
        public string BandeServie(string modeId) => modeId != null && bandes.TryGetValue(modeId, out string b) ? b : null;
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
        /// (`leg-maintenance.service.ts:13-20`, V15 @74c5a0b0, lu par le poseur). Mots : FR servi par BACK-1 à l'octet (`lot/couts-30` @87820327, `string_table.ts` bloc « Lot ㉚ ») ;
        /// `appro.consequence.contourner` porte U+00A0 devant « : » (écrit en clair), les apostrophes sont U+2019.</summary>
        public static readonly SpecDeGeste Entretien = new SpecDeGeste("maintain",
            "Entretenir la liaison", null, ditLaBande: true,
            new ModeDeGeste("quick_patch", "rafistoler", "Rafistoler", "l’usure retombe, sans disparaître"),
            new ModeDeGeste("structural_reinforce", "renforcer", "Renforcer", "l’usure est effacée", structurel: true),
            new ModeDeGeste("reroute_bypass", "contourner", "Contourner", "la liaison se repose : plus rien n’y passe tant qu’elle n’a pas récupéré"));

        /// <summary>`POST /v1/operational/routes/:id/rebuild {mode}` — MINIMAL_REROUTE / FULL_GEOMETRIC_RESET (STRUCTURELLE)
        /// (`route.controller.ts:193`, `route-rebuild.service.ts:18-20`). La durée est dite en MOTS : jamais un tick (R2.2).
        /// ⚠️ DEUX modes seulement (revue ⊥ B1, ruling f2 11/11, `poser-chaine-gestes.py:56-58,166-167`) : `MODERATE_RESTRUCTURE` (« Remaniement ») est RETIRÉ de la feuille — au back il fait EXACTEMENT le même
        /// recalcul que `MINIMAL_REROUTE`, seul le coût diffère : un choix plus cher sans effet de plus est un piège. Le back continue de la servir dans `rebuild[]` (toujours 3 lignes, contrat ㉚ §1.1 : le retrait
        /// est PUREMENT CLIENT) : une ligne de coût qui ne répond à aucun mode de la feuille est lue et IGNORÉE.</summary>
        public static readonly SpecDeGeste Reconstruction = new SpecDeGeste("rebuild",
            "Reconstruire la route",
            "Pendant les travaux, plus rien ne passe sur cette route.", ditLaBande: false,
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

        /// <summary>Le séparateur du mot de bande et de la conséquence (`poser-chaine-gestes.py:50-52`) : espace, U+00B7, espace.</summary>
        public const string SeparateurDeBande = " · ";

        /// <summary>Le mot d'une bande de durée SERVIE (contrat ㉚ §1.2) : `immediate` → « tout de suite », `brief` → « quelques minutes », `extended` → « plus longtemps ». La bande n'entre JAMAIS dans l'espace i18n :
        /// le client fait le switch et passe le LITTÉRAL à `Libelle.De` (clé `appro.etiquette.<slug du mot>`). Une bande hors de l'union (ou null) ⇒ null : on ne devine pas une durée.</summary>
        public static string MotDeLaBande(string bande)
        {
            switch (bande)
            {
                case "immediate": return Libelle.De("appro", "etiquette", "tout de suite");
                case "brief": return Libelle.De("appro", "etiquette", "quelques minutes");
                case "extended": return Libelle.De("appro", "etiquette", "plus longtemps");
                default: return null;
            }
        }

        /// <summary>Le sous-titre d'un mode : `<mot de la bande servie> · <conséquence>` pour un mode d'ENTRETIEN (`DitLaBande`) dont le COÛT et la BANDE sont servis ; la conséquence SEULE sinon — bande non servie, ou coût non servi
        /// (un mode éteint n'annonce pas de durée : règle (3), on ne devine rien ; décision CLIENT-1, revue ⊥ 1 M1).
        /// La conséquence est LA valeur servie (`appro.consequence.<suffixe>`), ou son repli.</summary>
        public static string SousTitreDuMode(SpecDeGeste spec, ModeDeGeste mode, ICoutsParMode couts)
        {
            string consequence = Libelle.Gabarit(mode.CleConsequence, mode.RepliConsequence);
            string mot = spec != null && spec.DitLaBande && couts != null && CentimesLisibles(couts, mode.Id) != null ? MotDeLaBande(couts.BandeServie(mode.Id)) : null;
            return string.IsNullOrEmpty(mot) ? consequence : mot + SeparateurDeBande + consequence;
        }

        /// <summary>LA SEULE RÈGLE D'EXTINCTION d'un mode : il agit si et seulement si son coût est SERVI (règle (3) de f2) ET, quand il est structurel, si le jeton est libre.</summary>
        public static bool Actionnable(ModeDeGeste mode, string coutServi, bool jetonDisponible)
        {
            if (mode == null || string.IsNullOrEmpty(coutServi)) return false;
            return !mode.Structurel || jetonDisponible;
        }
    }
}
