using System.Collections.Generic;

namespace MafiaCleanCity.CityMap
{
    /// <summary>③ LE PANNEAU DISTRICT, PAR VALEUR (table 68 de l'atelier, 2026-09-26, client a21f3c62 ; addendum des étiquettes
    /// 9ebfcb4d). Les 16 champs servis que le panneau rendait BRUTS (`PLAYER_HELD`, `congested`, `hunting`…) passent par la clé de
    /// leur VALEUR (`Libelle.ParValeur`) : `carte.*` / `police.*` (41 clés neuves, replis À L'OCTET de la table, recopiés
    /// ci-dessous) et 4 familles DÉJÀ servies (`heat.bucket.*`, `filiere.proprete.*`, `inspection.charge.*`, `inspection.regime.*`,
    /// repli vide). Les étiquettes des rangées passent par `carte.panneau.*` (25 clés, replis de l'addendum).
    /// ⛔ Jamais la valeur brute : une valeur sans mot (ni servi ni repli) rend RIEN.</summary>
    public static class MotsDuPanneau
    {
        /// <summary>Les replis des VALEURS (table 68), par clé complète (`domaine.role.valeur`), à l'octet.</summary>
        public static readonly Dictionary<string, string> Replis = new Dictionary<string, string>
        {
            { "carte.controle.uncontested", "Libre" },
            { "carte.controle.contested", "Disputé" },
            { "carte.controle.player_held", "À vous" },
            { "carte.controle.rival_held", "Rival" },
            { "carte.refoulement.normal", "fluide" },
            { "carte.refoulement.congested", "engorgée" },
            { "carte.refoulement.saturated", "saturée" },
            { "carte.exposition.minimal", "minime" },
            { "carte.exposition.low", "faible" },
            { "carte.exposition.elevated", "élevée" },
            { "carte.exposition.critical", "critique" },
            { "carte.reserve.low", "à peine" },
            { "carte.reserve.moderate", "en partie" },
            { "carte.reserve.high", "beaucoup" },
            { "carte.reserve.saturated", "à saturation" },
            { "carte.tampon_charge.empty", "vide" },
            { "carte.tampon_charge.low", "faible" },
            { "carte.tampon_charge.nominal", "normale" },
            { "carte.tampon_charge.high", "forte" },
            { "carte.tampon_charge.critical", "critique" },
            { "carte.tampon_traine.low", "courte" },
            { "carte.tampon_traine.moderate", "moyenne" },
            { "carte.tampon_traine.high", "longue" },
            { "carte.tampon_traine.critical", "critique" },
            { "carte.epingles.none", "aucune" },
            { "carte.epingles.some", "quelques-unes" },
            { "carte.epingles.widespread", "partout" },
            { "carte.cohesion.stable", "solide" },
            { "carte.cohesion.fragile", "fragile" },
            { "carte.cohesion.thawed", "rompue" },
            { "police.croyance.dormant", "en sommeil" },
            { "police.croyance.watchful", "en veille" },
            { "police.croyance.suspicious", "soupçon" },
            { "police.croyance.hunting", "en chasse" },
            { "police.patrouille.quiet", "rien dans les rues" },
            { "police.patrouille.low", "clairsemée" },
            { "police.patrouille.medium", "présente" },
            { "police.patrouille.high", "partout" },
            { "carte.rumeur.calm", "rien de spécial" },
            { "carte.rumeur.stirring", "ça murmure" },
            { "carte.rumeur.alert", "ça s’agite" },
        };

        /// <summary>Les replis des ÉTIQUETTES (addendum 68), par clé, à l'octet.</summary>
        public static readonly Dictionary<string, string> Etiquettes = new Dictionary<string, string>
        {
            { "carte.panneau.blocs", "Blocs" },
            { "carte.panneau.rive", "Rive" },
            { "carte.panneau.controle", "Contrôle" },
            { "carte.panneau.releves", "Relevés" },
            { "carte.panneau.releves_ouvrez_une_session", "revenez après l’ouverture de votre journée" },
            { "carte.panneau.pas_encore_releve", "pas encore relevé" },
            { "carte.panneau.chaleur_quartier", "Chaleur — le quartier" },
            { "carte.panneau.chaleur_ville", "Chaleur — la ville" },
            { "carte.panneau.descente", "Descente" },
            { "carte.panneau.oui", "oui" },
            { "carte.panneau.non", "non" },
            { "carte.panneau.refoulement", "Circulation" },
            { "carte.panneau.exposition", "Exposition" },
            { "carte.panneau.proprete_du_reseau", "Propreté de l’argent" },
            { "carte.panneau.reserve_qui_bloque", "Planques encombrées" },
            { "carte.panneau.tampon_charge", "Marchandise en attente" },
            { "carte.panneau.tampon_traine", "L’attente" },
            { "carte.panneau.file_d_inspection", "File d’inspection" },
            { "carte.panneau.regime_du_dispatch", "Rythme des inspecteurs" },
            { "carte.panneau.epingles_d_audit", "Marques sur vos dossiers" },
            { "carte.panneau.coins_de_vente", "Coins de vente" },
            { "carte.panneau.cohesion", "Cohésion" },
            { "carte.panneau.ce_qu_ils_croient", "Ce qu’ils croient — précinct {precinct}" },
            { "carte.panneau.la_patrouille", "La patrouille — précinct {precinct}" },
            { "carte.panneau.ce_qui_se_dit", "Ce qui se dit en ville" },
        };

        /// <summary>Le mot d'une valeur servie : la clé servie, sinon le repli de la table, sinon RIEN (jamais la valeur).</summary>
        public static string Mot(string domaine, string role, string valeurServie)
        {
            if (string.IsNullOrEmpty(valeurServie)) return string.Empty;
            string cle = domaine + "." + role + "." + MafiaCleanCity.I18n.Libelle.Slug(valeurServie);
            Replis.TryGetValue(cle, out string repli);
            return MafiaCleanCity.I18n.Libelle.ParValeur(domaine, role, valeurServie, repli ?? string.Empty) ?? string.Empty;
        }

        /// <summary>Une étiquette (ou un mot fixe du panneau) par sa clé `carte.panneau.*`, repli de l'addendum.</summary>
        public static string Etiquette(string cle, IDictionary<string, string> parametres = null)
        {
            Etiquettes.TryGetValue(cle, out string repli);
            return MafiaCleanCity.I18n.Libelle.Gabarit(cle, repli ?? string.Empty, parametres) ?? string.Empty;
        }
    }
}
