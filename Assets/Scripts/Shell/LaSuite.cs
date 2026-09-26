using System;
using System.Collections;
using System.Collections.Generic;
using System.Linq;
using MafiaCleanCity.I18n;
using MafiaCleanCity.Operational;
using MafiaCleanCity.Operational.Lieutenant;
using MafiaCleanCity.Operational.Selling;

namespace MafiaCleanCity.Shell
{
    // « LA SUITE » — le cadre 4 de la maquette ④ (`ecrans-brennar-accueil.html`, joueur neuf sans carte, PROPOSÉ 26/09 ; référence
    // `Tools/juge-visuel/accueil/maquette-2026-09-23/cadre-4-1080x2102.png`), mots de la table 72 de l'atelier
    // (`72-accueil-la-suite-2026-09-26.tsv`). Le vide du joueur neuf est rempli par ses OBJECTIFS, chacun éteint par SON état servi.
    //   · le bloc n'existe que sans carte à fort levier (`hl_card` null) ET au palier 1 (`vocabulary_tier`) — jamais au-dessus d'une carte ;
    //   · au plus trois lignes, dans l'ordre A (labo) · B ou C (vente / caisse) · D (règles) ; le PREMIER geste est doré ;
    //   · aucune donnée neuve au back : une requête par écran existant (progression, me/buildings, lab, precursors, dealers, lieutenants).
    // Tout ce qui décide est PUR (`Lignes`) : les tests le pilotent par état, hors réseau.

    /// <summary>Ce que « La suite » lit, déjà réduit à ce qui décide. Une donnée qui n'a pas pu être lue reste null : sa ligne ne se
    /// montre pas (on n'affirme jamais un objectif sur une lecture manquée).</summary>
    public sealed class EtatDeLaSuite
    {
        public bool CarteDeTete;               // session/open : hl_card présent
        public int? Palier;                    // GET /v1/progression → vocabulary_tier
        public string LaboId;                  // me/buildings : le premier bâtiment qui cuisine
        public string Cuisson;                 // GET /v1/operational/lab/:id → cook_stage_band (IDLE | EARLY | MID | LATE | DONE)
        public string PrecurseurType;          // GET /v1/operational/precursors → precursor_type (PYRALIN…)
        public string Stock;                   // … → stock_band (NONE | …)
        public bool CommandeEnRoute;           // … → has_pending_order
        public bool CommandeArrivee;           // … → has_arrived_order
        public DealerDto[] Dealers;            // GET /v1/operational/dealers
        public RosterRow[] Lieutenants;        // GET /v1/lieutenants
        public string ChargePlanque;           // GET /v1/city/district/:id/stash → load_bucket de la planque la PLUS chargée du joueur
                                               // (StashLoadBucket : EMPTY | LOW | NOMINAL | HIGH | FULL) ; null = non lue
    }

    public enum GesteDeLaSuite { Aucun, Commander, Cuire, VoirLaVente, Ramasser, EcrireUneRegle, Blanchir }

    /// <summary>Une ligne : son identité de table (A1, A2, A3, B, C, D), ses deux textes, son geste.</summary>
    public sealed class LigneDeLaSuite
    {
        public string Id;
        public string Titre;
        public string Phrase;
        public GesteDeLaSuite Geste;
        public string MotDuGeste;              // null quand la ligne n'a pas de geste (A2 : rien à faire qu'attendre)
    }

    public static class LaSuite
    {
        public const int PalierDuBloc = 1;
        public const int LignesAuPlus = 3;

        /// <summary>Le titre du bloc (table 72, `accueil.suite.la_suite`).</summary>
        public static string Titre() => Libelle.Gabarit("accueil.suite.la_suite", "La suite");

        /// <summary>LA décision, pure : les lignes vraies, dans l'ordre A · (B ou C) · D, au plus trois. Vide sans objet (carte de tête,
        /// palier ≠ 1, palier inconnu, rien de vrai) — le bloc disparaît alors.</summary>
        public static List<LigneDeLaSuite> Lignes(EtatDeLaSuite e)
        {
            var lignes = new List<LigneDeLaSuite>();
            if (e == null || e.CarteDeTete || e.Palier != PalierDuBloc) return lignes;

            LigneDeLaSuite labo = LigneDuLabo(e);
            if (labo != null) lignes.Add(labo);
            LigneDeLaSuite vente = LigneDeLaVente(e.Dealers);
            // Table 76 (26/09, reco f1 décidée) : planque PLEINE ⇒ « Ramassez-la » pousserait vers un refus (la caisse ne peut plus
            // s'y vider) — la ligne C se retire, la ligne E (blanchir) dit quoi faire.
            if (vente != null && !(vente.Id == "C" && e.ChargePlanque == "FULL")) lignes.Add(vente);
            LigneDeLaSuite planque = LigneDeLaPlanque(e.ChargePlanque);
            if (planque != null) lignes.Add(planque);
            // F (recruter BLANCHIMENT) et G (recruter DISTRIBUTION) de la table 76 ATTENDENT le lot back B7 (éligibilité au
            // recrutement par rôle, forme F le 26/09) : rien n'est simulé ici — les règles R11/R12 ne se recopient pas (TD-762).
            LigneDeLaSuite regles = LigneDesRegles(e.Lieutenants);
            if (regles != null) lignes.Add(regles);
            return lignes.Take(LignesAuPlus).ToList();
        }

        // ── A · le labo ─────────────────────────────────────────────────────────────────────────────────────────────────────────
        // A1 : cuisson IDLE, stock NONE, aucune commande en route ⇒ commander. A3 : du stock, cuisson IDLE ⇒ cuire. A2 : une commande
        // en route, pas encore arrivée ⇒ attendre (aucun geste). Décidé (reco, 26/09) : quand A2 et A3 sont vraies ensemble (du stock
        // ET une autre commande en route), A3 l'emporte — le geste possible passe avant l'attente.
        private static LigneDeLaSuite LigneDuLabo(EtatDeLaSuite e)
        {
            if (string.IsNullOrEmpty(e.LaboId) || string.IsNullOrEmpty(e.Cuisson) || string.IsNullOrEmpty(e.Stock)) return null;
            string precurseur = NomDuPrecurseur(e.PrecurseurType);
            if (precurseur == null) return null;   // un précurseur hors domaine ne s'écrit jamais brut
            var p = new Dictionary<string, string> { { "precurseur", precurseur } };
            bool auRepos = e.Cuisson == "IDLE";
            bool sansStock = e.Stock == "NONE";

            if (auRepos && !sansStock)
                return new LigneDeLaSuite
                {
                    Id = "A3",
                    Titre = Libelle.Gabarit("accueil.suite.le_precurseur_est_la", "Le {precurseur} est là", p),
                    Phrase = Libelle.Gabarit("accueil.suite.lancez_la_cuisson", "Lancez la cuisson."),
                    Geste = GesteDeLaSuite.Cuire,
                    MotDuGeste = Libelle.Gabarit("accueil.suite.cuire", "Cuire"),
                };
            if (e.CommandeEnRoute && !e.CommandeArrivee)
                return new LigneDeLaSuite
                {
                    Id = "A2",
                    Titre = Libelle.Gabarit("accueil.suite.le_precurseur_est_en_route", "Le {precurseur} est en route", p),
                    Phrase = Libelle.Gabarit("accueil.suite.a_son_arrivee_lancez_la_cuisson", "À son arrivée, lancez la cuisson."),
                    Geste = GesteDeLaSuite.Aucun,
                };
            if (auRepos && sansStock && !e.CommandeEnRoute)
                return new LigneDeLaSuite
                {
                    Id = "A1",
                    Titre = Libelle.Gabarit("accueil.suite.le_labo_attend_du_precurseur", "Le labo attend du {precurseur}", p),
                    Phrase = Libelle.Gabarit("accueil.suite.sans_lui_rien_ne_cuit", "Sans lui, rien ne cuit."),
                    Geste = GesteDeLaSuite.Commander,
                    MotDuGeste = Libelle.Gabarit("accueil.suite.commander", "Commander"),
                };
            return null;
        }

        /// <summary>Le nom du précurseur : la clé servie `building.precursor.<type>`, repli au nom de l'atelier 39. Hors domaine : null.</summary>
        public static string NomDuPrecurseur(string type)
        {
            if (string.IsNullOrWhiteSpace(type)) return null;
            string repli;
            switch (type.Trim().ToLowerInvariant())
            {
                case "pyralin": repli = "Pyralin"; break;
                case "thalmite": repli = "Thalmite"; break;
                case "verdant_root_extract": repli = "Racine verdoyante"; break;
                case "lull_resin": repli = "Résine de lull"; break;
                case "glass_lily": repli = "Lys de verre"; break;
                default: return null;
            }
            return Libelle.ParValeur("building", "precursor", type, repli);
        }

        // ── B ou C · la vente ───────────────────────────────────────────────────────────────────────────────────────────────────
        private static readonly string[] CaissesARamasser = { "FULL", "HIGH", "MODERATE" };   // la plus pleine d'abord

        private static LigneDeLaSuite LigneDeLaVente(DealerDto[] dealers)
        {
            if (dealers == null) return null;   // lecture manquée : on n'affirme pas « personne ne vend »
            foreach (string bande in CaissesARamasser)
            {
                DealerDto plein = dealers.FirstOrDefault(d => d != null && !d.withdrawn && d.cash_band == bande && !string.IsNullOrWhiteSpace(d.name_i18n));
                if (plein == null) continue;
                return new LigneDeLaSuite
                {
                    Id = "C",
                    Titre = Libelle.Gabarit("accueil.suite.la_caisse_de_prenom_se_remplit", "La caisse de {prenom} se remplit",
                        new Dictionary<string, string> { { "prenom", plein.name_i18n } }),
                    Phrase = Libelle.Gabarit("accueil.suite.ramassez_la_elle_rejoint_la_planque", "Ramassez-la : elle rejoint la planque."),
                    Geste = GesteDeLaSuite.Ramasser,
                    MotDuGeste = Libelle.Gabarit("accueil.suite.ramasser", "Ramasser"),
                };
            }
            if (dealers.Any(d => d != null && !d.withdrawn && d.activity_band == "WORKING")) return null;
            return new LigneDeLaSuite
            {
                Id = "B",
                Titre = Libelle.Gabarit("accueil.suite.personne_ne_vend_encore", "Personne ne vend encore"),
                Phrase = Libelle.Gabarit("accueil.suite.un_dealer_sur_un_coin_de_vente_et_la_marchandise_part",
                    "Un dealer sur un coin de vente, et la marchandise part."),
                Geste = GesteDeLaSuite.VoirLaVente,
                MotDuGeste = Libelle.Gabarit("accueil.suite.voir_la_vente", "Voir la vente"),
            };
        }

        // ── E · la planque (table 76) ───────────────────────────────────────────────────────────────────────────────────────────
        // `load_bucket` servi : EMPTY ⇒ rien à blanchir ; LOW | NOMINAL | HIGH ⇒ « De l'argent attend » ; FULL ⇒ « La planque est
        // pleine ». Une valeur hors domaine ne s'affirme pas.
        private static LigneDeLaSuite LigneDeLaPlanque(string charge)
        {
            string titre, phrase;
            switch (charge)
            {
                case "LOW": case "NOMINAL": case "HIGH":
                    titre = Libelle.Gabarit("accueil.suite.de_l_argent_attend_dans_la_planque", "De l’argent attend dans la planque");
                    phrase = Libelle.Gabarit("accueil.suite.blanchissez_le_il_ne_rapporte_rien_tant_qu_il_dort",
                        "Blanchissez-le : il ne rapporte rien tant qu’il dort.");
                    break;
                case "FULL":
                    titre = Libelle.Gabarit("accueil.suite.la_planque_est_pleine", "La planque est pleine");
                    phrase = Libelle.Gabarit("accueil.suite.blanchissez_sinon_la_caisse_des_dealers_ne_peut_plus_s_y_vider",
                        "Blanchissez : sinon, la caisse des dealers ne peut plus s’y vider.");
                    break;
                default:
                    return null;
            }
            return new LigneDeLaSuite
            {
                Id = charge == "FULL" ? "E-pleine" : "E",
                Titre = titre,
                Phrase = phrase,
                Geste = GesteDeLaSuite.Blanchir,
                MotDuGeste = Libelle.Gabarit("accueil.suite.blanchir", "Blanchir"),
            };
        }

        /// <summary>Le rang d'une charge servie — DÉLÈGUE à `ChargeDePlanque.Rang` (ShellContracts), la règle UNIQUE « planque la plus
        /// chargée » que ㊵ applique aussi (f2 26/09 : une seule définition, garde LaSuite S12).</summary>
        public static int RangDeCharge(string charge) => ChargeDePlanque.Rang(charge);

        // ── D · les règles ──────────────────────────────────────────────────────────────────────────────────────────────────────
        // Tous les lieutenants à `rule_count_band` NONE — et au moins un : sans lieutenant, personne n'attend de consigne.
        private static LigneDeLaSuite LigneDesRegles(RosterRow[] lieutenants)
        {
            if (lieutenants == null) return null;
            var presents = lieutenants.Where(l => l != null).ToList();
            if (presents.Count == 0 || presents.Any(l => l.rule_count_band != "NONE")) return null;
            return new LigneDeLaSuite
            {
                Id = "D",
                Titre = Libelle.Gabarit("accueil.suite.vos_lieutenants_attendent_une_consigne", "Vos lieutenants attendent une consigne"),
                Phrase = Libelle.Gabarit("accueil.suite.une_premiere_regle_et_ils_tiennent_sans_vous", "Une première règle, et ils tiennent sans vous."),
                Geste = GesteDeLaSuite.EcrireUneRegle,
                MotDuGeste = Libelle.Gabarit("accueil.suite.ecrire_une_regle", "Écrire une règle"),
            };
        }

        /// <summary>Les deux types qui cuisinent, dans le domaine `building_operational_type` (le même tri que ㉚).</summary>
        public static bool EstUnLabo(string operationalType) => operationalType == "lab" || operationalType == "specialized_lab";
    }

    /// <summary>D'où « La suite » tient son état. Le shell prend la source réseau ; un test pose la sienne (hors réseau).</summary>
    public interface ISourceDeLaSuite
    {
        IEnumerator Lire(string jeton, bool carteDeTete, Action<EtatDeLaSuite> ok);
    }

    /// <summary>La source réseau : les routes des écrans existants, lues au mieux. Le palier d'abord — hors palier 1, rien d'autre ne part.
    /// Une panne laisse la donnée null (sa ligne ne se montre pas) ; l'erreur technique va au journal, jamais à l'écran.</summary>
    public sealed class SourceDeLaSuiteReseau : ISourceDeLaSuite
    {
        public string BaseUrl = MafiaCleanCity.AdresseDuBack.Url;

        public IEnumerator Lire(string jeton, bool carteDeTete, Action<EtatDeLaSuite> ok)
        {
            var e = new EtatDeLaSuite { CarteDeTete = carteDeTete };
            if (carteDeTete || string.IsNullOrEmpty(jeton)) { ok?.Invoke(e); yield break; }

            yield return new MafiaCleanCity.Operational.Exceptions.ProgressionClient { BaseUrl = BaseUrl }
                .GetProgression(jeton, p => e.Palier = p?.vocabulary_tier, Journal("progression"));
            if (e.Palier != LaSuite.PalierDuBloc) { ok?.Invoke(e); yield break; }

            BatimentPossedeDto[] possedes = null;
            yield return new MesBatimentsClient { BaseUrl = BaseUrl }.Lire(jeton, bs => possedes = bs, Journal("me/buildings"));
            BatimentPossedeDto labo = possedes?.FirstOrDefault(b => b != null && !string.IsNullOrEmpty(b.building) && LaSuite.EstUnLabo(b.operational_type));
            if (labo != null)
            {
                e.LaboId = labo.building;
                var fiche = new BuildingCardClient { BaseUrl = BaseUrl };
                yield return fiche.GetLab(labo.building, jeton, l => e.Cuisson = l?.cook_stage_band, Journal("lab"));
                yield return new ChaineDApproClient { BaseUrl = BaseUrl }.GetOperationalPrecursors(jeton, labo.building, pr =>
                {
                    if (pr == null) return;
                    e.PrecurseurType = pr.precursor_type;
                    e.Stock = pr.stock_band;
                    e.CommandeEnRoute = pr.has_pending_order;
                    e.CommandeArrivee = pr.has_arrived_order;
                }, Journal("precursors"));
            }
            // E · la planque : `district/:id/stash` sur les quartiers du joueur (le chemin de ㊵), la plus chargée.
            if (possedes != null)
            {
                var projections = new MafiaCleanCity.CityMap.CityProjectionsClient { BaseUrl = BaseUrl };
                foreach (int quartier in possedes.Where(b => b != null && b.district_id > 0).Select(b => b.district_id).Distinct())
                {
                    MafiaCleanCity.CityMap.StashDto stash = null;
                    yield return projections.Stash(quartier, jeton, x => stash = x, code => UnityEngine.Debug.LogWarning($"[LaSuite] stash {quartier} : {code}"));
                    if (stash?.safehouses == null) continue;
                    foreach (MafiaCleanCity.CityMap.SafehouseDto p in stash.safehouses)
                        if (p != null && LaSuite.RangDeCharge(p.load_bucket) > LaSuite.RangDeCharge(e.ChargePlanque)) e.ChargePlanque = p.load_bucket;
                }
            }
            yield return new SellingClient { BaseUrl = BaseUrl }.ListDealers(jeton, d => e.Dealers = d ?? new DealerDto[0], Journal("dealers"));
            yield return new LieutenantClient { BaseUrl = BaseUrl }.ListLieutenants(jeton, r => e.Lieutenants = r ?? new RosterRow[0], Journal("lieutenants"));
            ok?.Invoke(e);
        }

        private static Action<long, string> Journal(string route) =>
            (code, message) => UnityEngine.Debug.LogWarning($"[LaSuite] {route} indisponible : {code} {message}");
    }
}
