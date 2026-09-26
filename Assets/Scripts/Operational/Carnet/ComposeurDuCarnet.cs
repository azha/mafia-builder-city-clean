using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.RegularExpressions;
using MafiaCleanCity.I18n;
using MafiaCleanCity.Shell;
using MafiaCleanCity.Operational.Exceptions;

namespace MafiaCleanCity.Operational
{
    /// <summary>Une cible posable par le composeur de ㉞ : le type d'ordre, la cible servie (`target_ref`), et de quoi la NOMMER
    /// avec les mots servis (« vers {batiment} ({quartier}) », « à {batiment} ({quartier}) », table 73 ; candidat : table 83).</summary>
    public class CibleDuCarnet
    {
        public string SlotType;    // DISTRIBUTION_RUN | MAINTENANCE_BATCH | EXCEPTION_BATCH_RESOLUTION | RECRUITMENT_STEP
        public string Kind;        // route | building | candidate (EXPECTED_TARGET_KIND du back)
        public string Id;
        public string Batiment;    // l'enseigne NUE servie (params.enseigne) — route : celle de la destination
        public string Quartier;    // district_name servi
        public string Titre;       // candidat : la ligne titre (pool ou rival, table 83)
        public string[] Bandes;    // candidat : les lignes de bandes (table 83)

        public string Cle => SlotType + "|" + Id;

        /// <summary>Le nom de la cible, en mots servis (repli à l'octet de l'atelier).</summary>
        public string Libelle()
        {
            if (Kind == "candidate") return Titre;
            var p = new Dictionary<string, string> { { "batiment", Batiment }, { "quartier", Quartier } };
            return Kind == "route"
                ? MafiaCleanCity.I18n.Libelle.Gabarit("carnet.bloc.vers_batiment_quartier", "vers {batiment} ({quartier})", p)
                : MafiaCleanCity.I18n.Libelle.Gabarit("carnet.bloc.a_batiment_quartier", "à {batiment} ({quartier})", p);
        }
    }

    /// <summary>㉞ LE COMPOSEUR DES ORDRES DU SOIR (commande f2 du 26/09, table 73 de l'atelier @a2c0b2e4, maquette f32f8b13).
    /// `compose` exige 4 à 8 ordres D'UN COUP (cue-stack.service.ts:204) : le carnet se garde AU CLIENT jusqu'à 4, puis
    /// `POST cue-stack/compose`, puis `POST cue-stack/commit`. Pur : aucun réseau, aucun rendu — l'écran s'en sert, les tests aussi.</summary>
    public static class ComposeurDuCarnet
    {
        public const int Minimum = 4;
        public const int Maximum = 8;   // cueStackDepthSlotsMax par défaut (core-loops-tunables.ts:809)

        public const string Distribution = "DISTRIBUTION_RUN";
        public const string Entretien = "MAINTENANCE_BATCH";
        public const string Ardoise = "EXCEPTION_BATCH_RESOLUTION";
        public const string Recrutement = "RECRUITMENT_STEP";

        /// <summary>Les 4 types LIVE, dans l'ordre du composeur (slot-type.catalogue.ts:17-22 ; les 3 réservés ne sont JAMAIS offerts).</summary>
        public static readonly string[] TypesLive = { Distribution, Entretien, Ardoise, Recrutement };

        /// <summary>Le nom servi d'un type d'ordre (`carnet.ordre.*`, servi) — repli à l'octet du bundle fr.</summary>
        public static string NomDuType(string slotType)
        {
            switch (slotType)
            {
                case Distribution: return MafiaCleanCity.I18n.Libelle.Gabarit("carnet.ordre.distribution_run", "Envoyer un coursier");
                case Entretien: return MafiaCleanCity.I18n.Libelle.Gabarit("carnet.ordre.maintenance_batch", "Faire l’entretien");
                case Ardoise: return MafiaCleanCity.I18n.Libelle.Gabarit("carnet.ordre.exception_batch_resolution", "Régler l’ardoise");
                case Recrutement: return MafiaCleanCity.I18n.Libelle.Gabarit("carnet.ordre.recruitment_step", "Recruter");
                default: throw new ArgumentOutOfRangeException(nameof(slotType), slotType, "type d'ordre non LIVE : jamais offert");
            }
        }

        // ── Recruter : CACHÉ tant que le libellé du candidat n'est pas servi (décision f2 26/09, B ; TD-766) ────────────────
        /// <summary>La clé dont le SERVICE rouvre « Recruter » (table 83 @903a6a6f, PROPOSÉE) : sans elle, un candidat n'a pas de nom
        /// (le back sert `profile.name` = « Civilian Prospect », placeholder anglais TD-046), et « rien à viser » serait faux.</summary>
        public const string CleQuiRouvreLeRecrutement = "recrutement.candidat.pool.civilian";
        public static bool RecruterOffert => MafiaCleanCity.I18n.Libelle.EstServie(CleQuiRouvreLeRecrutement);

        /// <summary>⛔ TD-764 — L'ÉLIGIBILITÉ DES CIBLES, RECOPIÉE DU BACK, EN UN SEUL SITE (f2 26/09). Les règles de `compose`
        /// (cue-stack.repository.ts @1ffb08b4) :
        ///   route      : `GET operational/routes` sert EXACTEMENT les itinéraires sauvés du joueur (:372, is_saved) ;
        ///   entretien  : une ligne `building_operational_state` (:384) ⇒ `me/buildings` avec `operational_type` NON VIDE ;
        ///   ardoise    : un local opérationnel ET une carte `pending` dont une `candidate_actions[].effect.target_building_id` le
        ///                vise (exceptions.repository.ts:320-327 — jamais `exceptions[].building.id`, nul pour 0 ou plusieurs) ;
        ///   candidat   : `GET recruitment/candidates` sert EXACTEMENT les `available` (:410).
        /// Plus strict que le back (les démolis que compose accepterait ne sont pas proposés) : jamais un refus proposé.
        /// Fermeture : le back sert les cibles éligibles par type (même patron que `next_stage_candidates`) ⇒ cette fonction sort.
        /// Une cible sans nom servi n'est PAS proposée (un itinéraire vers un bâtiment qui n'est plus au joueur).</summary>
        public static Dictionary<string, List<CibleDuCarnet>> CiblesEligibles(BatimentPossedeDto[] batiments, RouteSauveeDto[] routes,
            ExceptionCardDto[] ardoises, CandidatDto[] candidats)
        {
            var res = TypesLive.ToDictionary(t => t, t => new List<CibleDuCarnet>());
            var parId = new Dictionary<string, BatimentPossedeDto>();
            foreach (BatimentPossedeDto b in batiments ?? new BatimentPossedeDto[0])
                if (b != null && !string.IsNullOrEmpty(b.building)) parId[b.building] = b;
            bool Operationnel(BatimentPossedeDto b) => b != null && !string.IsNullOrEmpty(b.operational_type);

            foreach (RouteSauveeDto r in routes ?? new RouteSauveeDto[0])
            {
                if (r == null || string.IsNullOrEmpty(r.route_id)) continue;
                if (!parId.TryGetValue(r.destination_building_id ?? "", out BatimentPossedeDto dest) || Enseigne(dest) == null) continue;
                Ajouter(res[Distribution], new CibleDuCarnet { SlotType = Distribution, Kind = "route", Id = r.route_id,
                    Batiment = Enseigne(dest), Quartier = dest.district_name });
            }
            foreach (BatimentPossedeDto b in parId.Values)
                if (Operationnel(b) && Enseigne(b) != null)
                    Ajouter(res[Entretien], new CibleDuCarnet { SlotType = Entretien, Kind = "building", Id = b.building,
                        Batiment = Enseigne(b), Quartier = b.district_name });
            foreach (ExceptionCardDto c in ardoises ?? new ExceptionCardDto[0])
            {
                if (c == null || (!string.IsNullOrEmpty(c.resolution_status) && c.resolution_status != "pending")) continue;
                foreach (CandidateActionDto a in c.candidate_actions ?? new CandidateActionDto[0])
                {
                    string id = a?.effect?.target_building_id;
                    if (string.IsNullOrEmpty(id) || !parId.TryGetValue(id, out BatimentPossedeDto b) || !Operationnel(b) || Enseigne(b) == null) continue;
                    Ajouter(res[Ardoise], new CibleDuCarnet { SlotType = Ardoise, Kind = "building", Id = id,
                        Batiment = Enseigne(b), Quartier = b.district_name });
                }
            }
            foreach (CandidatDto k in candidats ?? new CandidatDto[0])
            {
                if (k == null || string.IsNullOrEmpty(k.candidate_id) || (!string.IsNullOrEmpty(k.status) && k.status != "available")) continue;
                Ajouter(res[Recrutement], new CibleDuCarnet { SlotType = Recrutement, Kind = "candidate", Id = k.candidate_id,
                    Titre = TitreDuCandidat(k), Bandes = BandesDuCandidat(k) });
            }
            return res;
        }

        private static void Ajouter(List<CibleDuCarnet> l, CibleDuCarnet c) { if (l.All(x => x.Id != c.Id)) l.Add(c); }

        private static string Enseigne(BatimentPossedeDto b)
        {
            string e = b?.name_i18n?.@params?.enseigne;
            return string.IsNullOrWhiteSpace(e) ? null : e.Trim();
        }

        /// <summary>Table 83 : la ligne titre — le rival quitté (par `source_rival_key`) pour un transfuge, sinon le pool.</summary>
        public static string TitreDuCandidat(CandidatDto k)
        {
            string repliPool = ReplisPool.TryGetValue(k?.pool ?? "", out string rp) ? rp : null;
            if (k?.pool == "defector" && !string.IsNullOrEmpty(k.source_rival_key) && ReplisRival.TryGetValue(k.source_rival_key, out string rr))
                return MafiaCleanCity.I18n.Libelle.ParValeur("recrutement.candidat", "defector", k.source_rival_key, rr);
            return repliPool == null ? null : MafiaCleanCity.I18n.Libelle.ParValeur("recrutement.candidat", "pool", k.pool, repliPool);
        }

        public static string[] BandesDuCandidat(CandidatDto k)
        {
            var l = new List<string>();
            void Bande(string role, string valeur, Dictionary<string, string> replis)
            {
                if (!string.IsNullOrEmpty(valeur) && replis.TryGetValue(valeur, out string r))
                    l.Add(MafiaCleanCity.I18n.Libelle.ParValeur("recrutement.candidat", role, valeur, r));
            }
            Bande("experience", k?.profile?.experience, ReplisExperience);
            Bande("district_familiarity", k?.profile?.district_familiarity, ReplisTerrain);
            Bande("ask_band", k?.profile?.ask_band, ReplisDemande);
            return l.ToArray();
        }

        private static readonly Dictionary<string, string> ReplisPool = new Dictionary<string, string>
        {
            { "saltline", "Quelqu’un que la Saltline vous envoie" },
            { "civilian", "Quelqu’un du quartier" },
            { "defector", "Quelqu’un qui quitte une autre famille" },
        };
        private static readonly Dictionary<string, string> ReplisRival = new Dictionary<string, string>
        {
            { "coil", "Quelqu’un qui quitte La Coil" },
            { "tarcum", "Quelqu’un qui quitte Tarcum" },
            { "iron_throat", "Quelqu’un qui quitte Gorge-de-Fer" },
            { "saltline", "Quelqu’un qui quitte la Saltline" },
        };
        private static readonly Dictionary<string, string> ReplisExperience = new Dictionary<string, string>
        {
            { "none", "N’a jamais travaillé pour une famille" },
            { "some", "A déjà rendu quelques services" },
            { "veteran", "A des années de métier" },
        };
        private static readonly Dictionary<string, string> ReplisTerrain = new Dictionary<string, string>
        {
            { "low", "Connaît mal le terrain" },
            { "medium", "Connaît un peu le terrain" },
            { "high", "Connaît le terrain par cœur" },
        };
        private static readonly Dictionary<string, string> ReplisDemande = new Dictionary<string, string>
        {
            { "low", "Demande peu" },
            { "fair", "Demande le prix courant" },
            { "high", "Demande cher" },
        };

        /// <summary>Les types OFFERTS par le composeur : les 4 LIVE, moins « Recruter » tant que son libellé n'est pas servi.</summary>
        public static IEnumerable<string> TypesOfferts() => TypesLive.Where(t => t != Recrutement || RecruterOffert);

        /// <summary>État vide : le total des cibles DISTINCTES posables (types offerts seulement). Sous 4 : « pas encore de quoi ».</summary>
        public static int TotalDesCibles(Dictionary<string, List<CibleDuCarnet>> cibles) =>
            cibles == null ? 0 : TypesOfferts().Sum(t => cibles.TryGetValue(t, out var l) ? l.Count : 0);

        // ── Le brouillon (gardé au client jusqu'à 4) ─────────────────────────────────────────────────────────────────────────
        public class Brouillon
        {
            private readonly List<CibleDuCarnet> lignes = new List<CibleDuCarnet>();
            public IReadOnlyList<CibleDuCarnet> Lignes => lignes;
            public int Compte => lignes.Count;
            public bool Plein => lignes.Count >= Maximum;
            public bool PeutLancer => lignes.Count >= Minimum && lignes.Count <= Maximum;
            public int EncoreAPoser => Math.Max(0, Minimum - lignes.Count);

            /// <summary>« le composeur ne pose jamais deux fois la même cible » (table 73) — même type, même cible.</summary>
            public bool Contient(CibleDuCarnet c) => c != null && lignes.Any(x => x.Cle == c.Cle);

            public bool Poser(CibleDuCarnet c)
            {
                if (c == null || Plein || Contient(c)) return false;
                lignes.Add(c);
                return true;
            }

            public void Retirer(int i) { if (i >= 0 && i < lignes.Count) lignes.RemoveAt(i); }

            /// <summary>L'ordre des lignes = l'ordre de départ (servi : « dans l'ordre où ils partiront »).</summary>
            public void Deplacer(int de, int vers)
            {
                if (de < 0 || de >= lignes.Count || vers < 0 || vers >= lignes.Count || de == vers) return;
                CibleDuCarnet c = lignes[de];
                lignes.RemoveAt(de);
                lignes.Insert(vers, c);
            }

            public void Vider() => lignes.Clear();

            /// <summary>Le corps de `POST cue-stack/compose` : un `slot_id` neuf par ligne, aucune dépendance, `drag_order` = rang.</summary>
            public CueStackComposeDto Corps()
            {
                var slots = new CueSlotComposeDto[lignes.Count];
                for (int i = 0; i < lignes.Count; i++)
                    slots[i] = new CueSlotComposeDto
                    {
                        slot_id = Guid.NewGuid().ToString(),
                        slot_type = lignes[i].SlotType,
                        target_ref = new CueCibleDto { kind = lignes[i].Kind, id = lignes[i].Id },
                        dependencies = new string[0],
                        drag_order = i,
                    };
                return new CueStackComposeDto { slots = slots };
            }
        }

        // ── Les refus (table 73) ─────────────────────────────────────────────────────────────────────────────────────────────
        private static readonly Regex CodeServi = new Regex("\"code\"\\s*:\\s*\"([A-Z_]+)\"");

        /// <summary>Le code d'erreur de l'enveloppe (`payload.error.code`), ou null.</summary>
        public static string Code(string corps)
        {
            if (string.IsNullOrEmpty(corps)) return null;
            Match m = CodeServi.Match(corps);
            return m.Success ? m.Groups[1].Value : null;
        }

        public const string CodeConfirmation = "SETTLING_COMPOUND_REQUIRED";

        /// <summary>La phrase d'un refus de compose/commit, par CODE (table 73) ; hors table, la phrase servie de l'enveloppe
        /// (`RefusServi`), sinon la clé servie même générique (« La situation a changé… ») ; sans corps : le carnet n'a pas répondu.
        /// `SETTLING_COMPOUND_REQUIRED` n'est pas un refus : c'est la CONFIRMATION (voir `PhrasesDeConfirmation`).</summary>
        public static string PhraseDuRefus(string corps)
        {
            switch (Code(corps))
            {
                case "SLOT_TYPE_RESERVED":
                    return MafiaCleanCity.I18n.Libelle.Gabarit("carnet.refus.cet_ordre_n_existe_pas_encore", "Cet ordre n’existe pas encore.");
                case "CUE_STACK_SLOT_TARGET_INVALID":
                    return MafiaCleanCity.I18n.Libelle.Gabarit("carnet.refus.cette_cible_ne_tient_plus_choisissez_en_une_autre",
                        "Cette cible ne tient plus : choisissez-en une autre.");
                case "CUE_STACK_ALREADY_ACTIVE":
                    return MafiaCleanCity.I18n.Libelle.Gabarit("carnet.refus.une_soiree_est_deja_en_route",
                        "Une soirée est déjà en route : elle finit avant qu’on en compose une autre.");
                case "CUE_STACK_DEPENDENCY_CYCLE":
                    return MafiaCleanCity.I18n.Libelle.Gabarit("carnet.bloc.deux_ordres_s_attendent_l_un_l_autre", "Deux ordres s’attendent l’un l’autre");
            }
            string servie = RefusServi.Phrase(corps);
            if (servie != null) return servie;
            string cle = RefusServi.Cle(corps);
            if (cle != null) { string generique = MafiaCleanCity.I18n.Libelle.Gabarit(cle, null); if (generique != null) return generique; }
            return MafiaCleanCity.I18n.Libelle.De("carnet", "bloc", "le carnet n'a pas répondu");
        }

        /// <summary>SETTLING_COMPOUND_REQUIRED — les mots SERVIS (string_table fr :4222-4227) : titre, phrase, bouton, sous-ligne.</summary>
        public static (string titre, string phrase, string bouton, string sous) PhrasesDeConfirmation() => (
            MafiaCleanCity.I18n.Libelle.Gabarit("carnet.bloc.un_endroit_n_a_pas_fini_de_se_poser", "Un endroit n’a pas fini de se poser"),
            MafiaCleanCity.I18n.Libelle.Gabarit("carnet.bloc.ce_qu_on_y_a_change_n_a_pas_encore_pris", "Ce qu’on y a changé n’a pas encore pris."),
            MafiaCleanCity.I18n.Libelle.Gabarit("carnet.bloc.y_aller_quand_meme", "Y aller quand même"),
            MafiaCleanCity.I18n.Libelle.Gabarit("carnet.bloc.j_assume_le_site_qui_bouge_encore", "j’assume le site qui bouge encore"));
    }
}
