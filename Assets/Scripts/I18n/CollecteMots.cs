using System.Collections.Generic;

namespace MafiaCleanCity.I18n
{
    /// <summary>COLLECTE (client, 07/10) — LES MOTS du ramassage de la caisse d'un dealer, UNE source pour ㉟ (`SellingScreenController`) et ①
    /// (`DistrictInteriorScreenController`, via `CityProjectionsClient`) : les deux écrans disaient chacun leur littéral, et le back ne sert
    /// plus de montant brut (R2.2, `selling.controller.ts:19`) mais des BANDES.
    ///
    /// Contrat lu dans le code du back (BACK-1, `lot/boucle-argent` @615ca764, pas déployé au 07/10) :
    ///   · `POST /v1/operational/dealer/:id/collect`, corps `{ "safehouse_id": uuid }` (tout champ inconnu est REJETÉ) ;
    ///   · réponse, EXACTEMENT 5 clés : `dealer_id`, `safehouse_id`, `collected_band`, `remaining_band` (`DealerCashBand`, liste FERMÉE
    ///     `NONE|LOW|MODERATE|HIGH|FULL`), `dealer_name_i18n` (`{key, params}`) ;
    ///   · la bande est une FRACTION DU PLAFOND DU DEALER (pas de la planque) ; une bande de COLLECTE et une bande de JAUGE n'ont pas le
    ///     même `g` : ne jamais les comparer ;
    ///   · refus : `SELLING_CASH_EMPTY` (rien à prendre) et `SELLING_SAFEHOUSE_FULL` (pas de place pour un granule), tous deux 409 ;
    ///     `RESOURCE_STATE_CONFLICT` (409 générique : changement concurrent) ⇒ le client réessaie UNE fois, en silence (décision back 26/09).
    /// Textes : tables 75 (atelier, 71747158) et 85 (91d40c01). Les clés sont des gabarits à clé EXPLICITE (`Libelle.Gabarit`) : tant que le
    /// back ne les sert pas, le repli ÉCRIT PAR L'ATELIER s'affiche, et il se compte.</summary>
    public static class CollecteMots
    {
        public const string CodeCaisseVide = "SELLING_CASH_EMPTY";
        public const string CodePlanquePleine = "SELLING_SAFEHOUSE_FULL";
        public const string CodeConflitGenerique = "RESOURCE_STATE_CONFLICT";

        /// <summary>Les cinq valeurs de `DealerCashBand`, dans l'ordre croissant (anti-tautologie : recopiées du back, `cash-band.ts:37`).</summary>
        public static readonly string[] Bandes = { "NONE", "LOW", "MODERATE", "HIGH", "FULL" };

        /// <summary>Repli de chaque bande — le mot de la table 75 (lignes B-*). `’` est l'apostrophe typographique de l'atelier (D10).</summary>
        private static string RepliDeLaBande(string valeur)
        {
            switch (valeur)
            {
                case "NONE": return "plus rien";
                case "LOW": return "une petite somme";
                case "MODERATE": return "une somme correcte";
                case "HIGH": return "une grosse somme";
                case "FULL": return "tout ce qu’elle peut tenir";
                default: return null;
            }
        }

        /// <summary>Le MOT d'une bande de caisse, adressé PAR LA VALEUR SERVIE : `vente.caisse.bande.<valeur>`. Une valeur hors de la liste
        /// fermée rend « — » (une valeur neuve doit se voir comme inconnue, jamais se déguiser en mot plausible).</summary>
        public static string Bande(string valeurServie)
        {
            string repli = RepliDeLaBande(valeurServie);
            if (repli == null) return "—";
            return Libelle.ParValeur("vente", "caisse.bande", valeurServie, repli);
        }

        /// <summary>La phrase de SUCCÈS (table 75 n° 1, 1b, 2). `prenom` null/vide ⇒ la forme SANS nom (« chez le dealer »). Une bande
        /// `collected_band` ou `remaining_band` ABSENTE (un back antérieur au lot) ⇒ null : l'appelant garde sa phrase d'avant.
        /// `remaining_band` = NONE ⇒ « Tout est ramassé : … » ; `collected_band` n'est jamais NONE (le back refuse alors `SELLING_CASH_EMPTY`).</summary>
        public static string PhraseDeSucces(string collectedBand, string remainingBand, string prenom)
        {
            if (string.IsNullOrEmpty(collectedBand) || string.IsNullOrEmpty(remainingBand)) return null;
            string collecte = Bande(collectedBand);
            if (remainingBand == "NONE")
                return Libelle.Gabarit("vente.geste.tout_est_ramasse_collecte", "Tout est ramassé : {collecte}.",
                    new Dictionary<string, string> { { "collecte", collecte } });
            string reste = Bande(remainingBand);
            if (string.IsNullOrWhiteSpace(prenom))
                return Libelle.Gabarit("vente.geste.ramasse_collecte_encore_chez_le_dealer_reste",
                    "Ramassé : {collecte}. Encore chez le dealer : {reste}.",
                    new Dictionary<string, string> { { "collecte", collecte }, { "reste", reste } });
            return Libelle.Gabarit("vente.geste.ramasse_collecte_encore_chez_prenom_reste",
                "Ramassé : {collecte}. Encore chez {prenom} : {reste}.",
                new Dictionary<string, string> { { "collecte", collecte }, { "prenom", prenom }, { "reste", reste } });
        }

        /// <summary>Le succès SANS bandes (TD-840, 07/10) : un back antérieur au lot COLLECTE ne sert ni `collected_band` ni `remaining_band`, l'écran dit alors la phrase
        /// d'avant. Elle passe maintenant par `Libelle` (clé `vente.geste.la_caisse_a_rejoint_votre_planque`, repli = le texte d'avant, octet pour octet) : elle se COMPTE
        /// comme un repli et le cliquet la voit. ⚠️ La table 85 n'en donne pas de clé (« libellé orphelin dès le câblage de la 75 ») : la clé est celle que le slug du
        /// littéral produirait, À DEMANDER À L'ATELIER ; elle sort avec le déploiement de COLLECTE (les bandes sont alors toujours servies).</summary>
        public static string PhraseDeSuccesSansBandes() =>
            Libelle.Gabarit("vente.geste.la_caisse_a_rejoint_votre_planque", "La caisse a rejoint votre planque.");

        /// <summary>La phrase d'un REFUS, quand le corps n'a servi AUCUNE phrase (`RefusServi.Phrase` null) : par CODE, jamais par statut
        /// (trois codes partagent le 409). Table 75 n° 3, 4, 4b ; table 85 n° 7 pour tout le reste, y compris un 409 SANS code spécifique
        /// et le 409 générique. Le 409 générique est réessayé UNE fois : si le second essai rend ENCORE `RESOURCE_STATE_CONFLICT`, c'est cette
        /// n° 7 qui se dit (« La collecte n'a pas abouti. ») — la phrase servie `error.resource.*` est de la famille générique, jamais montrée.</summary>
        public static string PhraseDeRefus(string code, string prenom)
        {
            if (code == CodePlanquePleine)
                return Libelle.Gabarit("vente.refus.la_planque_est_pleine_blanchissez_d_abord_pour_faire_de_la_place",
                    "La planque est pleine : blanchissez d’abord, pour faire de la place.");
            if (code == CodeCaisseVide)
            {
                if (string.IsNullOrWhiteSpace(prenom))
                    return Libelle.Gabarit("vente.refus.la_caisse_du_dealer_est_vide", "La caisse du dealer est vide.");
                return Libelle.Gabarit("vente.refus.la_caisse_de_prenom_est_vide", "La caisse de {prenom} est vide.",
                    new Dictionary<string, string> { { "prenom", prenom } });
            }
            return Libelle.Gabarit("vente.refus.la_collecte_n_a_pas_abouti", "La collecte n’a pas abouti.");
        }

        /// <summary>La phrase AVEC PRÉNOM, quand elle existe : la caisse est vide (`SELLING_CASH_EMPTY`) ET le prénom du dealer est connu. Elle GAGNE
        /// sur la phrase servie `error.selling.cash_empty`, qui est sans nom (revue ⊥ de CLIENT-2, m1 ; table 75 n° 4 contre 4b) : « La caisse de Dov est
        /// vide. » Sinon null, et l'appelant retombe sur la phrase servie, puis sur <see cref="PhraseDeRefus"/>. La clé servie
        /// `vente.refus.la_caisse_de_prenom_est_vide` + le paramètre `prenom` ; son repli est le texte de l'atelier.</summary>
        public static string PhraseAvecPrenom(string code, string prenom) =>
            code == CodeCaisseVide && !string.IsNullOrWhiteSpace(prenom) ? PhraseDeRefus(code, prenom) : null;

        /// <summary>LA phrase d'un refus, tout compris (revue ⊥ de CLIENT-2, n1) : sur un `RESOURCE_STATE_CONFLICT` — le 409 générique, déjà réessayé UNE
        /// fois — on FORCE la table 85 n° 7 et la phrase servie est SAUTÉE (même si le bundle sert `error.resource.state_conflict`, de la famille
        /// générique : aucune cause à dire). Sinon : la phrase AVEC prénom, puis la servie, puis la phrase par code.</summary>
        public static string PhraseFinaleDeRefus(string code, string phraseServie, string prenom)
        {
            if (code == CodeConflitGenerique) return PhraseDeRefus(code, null);
            return PhraseAvecPrenom(code, prenom) ?? phraseServie ?? PhraseDeRefus(code, prenom);
        }

        /// <summary>La conséquence du PLAFOND, dite sur la fiche du dealer quand la caisse est FULL (table 75, ligne B-plafond) : la caisse y est
        /// au plafond, le dealer cesse de vendre tant qu'on ne ramasse pas. Épicène (« il » = le dealer, le nom du rôle).</summary>
        public static string DitLePlafond() =>
            Libelle.Gabarit("vente.caisse.bande.full_il_ne_vend_plus_tant_qu_on_ne_ramasse_pas", "il ne vend plus tant qu\u2019on ne ramasse pas");

        /// <summary>Faut-il RÉESSAYER, une fois, sans rien dire ? Le 409 générique seul : un changement concurrent pendant la collecte.</summary>
        public static bool ReessayerEnSilence(long statut, string code) => statut == 409 && code == CodeConflitGenerique;
    }
}
