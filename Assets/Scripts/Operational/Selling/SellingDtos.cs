namespace MafiaCleanCity.Operational.Selling
{
    // ㉟ LA VENTE — les corps servis par `selling.controller.ts`, recopiés depuis
    // `DealerProjection` (`selling.projection.service.ts:63`), pas depuis la fiche d'écran.
    //
    // ⛔ Les valeurs métier sont TOUTES DES BANDES (R2.2 — zéro scalaire). La caisse n'est PAS un montant : c'est
    // `NONE|LOW|MODERATE|HIGH|FULL`. Un écran qui dessinerait une barre CONTINUE mentirait sur la
    // précision de la donnée — la maquette impose une jauge à CRANS pour cette raison.

    [System.Serializable]
    public class DealerDto
    {
        public string dealer;                     // uuid, renvoyé tel quel
        public string dealer_spot_id;             // uuid du bâtiment possédé, jamais la tuile couverte
        public string activity_band;              // WORKING | IDLE | ABSENT | COMPROMISED
        public string cash_band;                  // NONE | LOW | MODERATE | HIGH | FULL
        public string substance;                  // libellé d'enum fermé
        public string margin_band;                // STANDARD → HIGH_PREMIUM
        public string addiction_loyalty_status;
        public bool withdrawn;
        /// <summary>⛔ FORME G — SERVI, JAMAIS DÉCLARÉ, DONC JAMAIS ARRIVÉ. `JsonUtility` ignore
        /// EN SILENCE toute clé qu'aucun champ ne déclare : la donnée traverse le réseau, entre
        /// dans le processus et disparaît sans journal, sans erreur, sans avertissement.
        /// Mesuré sur un corps de SUCCÈS réel et commité
        /// (`Tools/juge-visuel/vente/corps-reels/GET_operational_dealers.json`, statut 200,
        /// 2026-09-04, compte `operational_demo`, back `6ff684db`) : 8 clés servies, 7 déclarées,
        /// et la manquante est le NOM que la maquette met en TÊTE de chaque rangée.
        /// ⚠️ Un inventaire de ROUTES compte cette clé SERVIE ; un balayage de RÉSOLVEURS la compte
        /// NON RENDUE ; ni l'un ni l'autre ne dit qu'elle n'est jamais ARRIVÉE.</summary>
        public DealerNomI18nDto name_i18n;
        /// <summary>Le prénom SERVI du dealer (`name_i18n.params.prenom`), ou null.</summary>
        public string Prenom => name_i18n != null && name_i18n.@params != null && !string.IsNullOrWhiteSpace(name_i18n.@params.prenom)
            ? name_i18n.@params.prenom : null;
        /// <summary>⛔ FORME G, seconde mesure (2026-09-22) — TROIS clés servies, jamais déclarées,
        /// donc jamais arrivées. Corps de SUCCÈS vivant, statut 200, commité :
        /// `Tools/juge-donnees/vente/forme-G-2026-09-22/GET_operational_dealers.json`
        /// (compte `operational_demo`, back `03cf564c`, X-Request-Id
        /// 6d52636f-214e-4491-be1e-65773828af04) : 12 clés servies, 9 déclarées avant ce commit.
        /// Domaines lus dans le back (`selling.projection.service.ts` l.124-143 et
        /// `market/lane-clearing-zone.ts` l.31) — des libellés fermés, jamais un scalaire de sim.
        /// ⚠️ DÉCLARÉ ≠ RENDU : ces trois champs ARRIVENT désormais ; aucun résolveur ne les peint
        /// encore (la copie est à l'atelier).</summary>
        public string district_name;              // nomDeDistrict(district_id) — string | null (« La Lisière »)
        public string lek_band;                   // ABSENT | LOW | MEDIUM | HIGH
        public string lane_band;                  // FAST | STEADY | SCATTERED | null (lane_c absent)
    }

    [System.Serializable] public class DealerListData { public DealerDto[] dealers; }
    [System.Serializable] public class DealerListPayload { public DealerListData data; }
    [System.Serializable] public class DealerListEnvelope { public DealerListPayload payload; }

    [System.Serializable] public class DealerPayload { public DealerDto data; }
    [System.Serializable] public class DealerEnvelope { public DealerPayload payload; }

    /// <summary>Le CORPS de `POST …/dealer/:id/collect` — rien d'autre : le back REJETTE tout champ inconnu (`rejectUnknownFields`).
    /// Les clés de la RÉPONSE vivent dans `CollectData` ; ne jamais envoyer celui-ci.</summary>
    [System.Serializable] public class CollectRequestDto { public string safehouse_id; }

    /// <summary>LE NOM D'UN DEALER — `name_i18n` (`GET /v1/operational/dealers`) et `dealer_name_i18n` (réponse de la collecte) : `{key, params}`.
    /// Le corps réel commité (22/09, `Tools/juge-donnees/vente/forme-G-2026-09-22/GET_operational_dealers.json`) porte
    /// `{"key":"game.fiction.dealer.name","params":{"prenom":"Dov"}}`. Seul `prenom` est lu. ⛔ TD-757 : `DealerDto.name_i18n` était déclaré
    /// `string` — `JsonUtility` ne lie pas un objet à une chaîne, le prénom n'arrivait donc jamais (forme G, déclaré ≠ arrivé).</summary>
    [System.Serializable] public class DealerNomParamsDto { public string prenom; }
    [System.Serializable] public class DealerNomI18nDto { public string key; public DealerNomParamsDto @params; }

    /// <summary>La RÉPONSE de la collecte — EXACTEMENT 5 clés (BACK-1, `selling.controller.ts:125-131`, `lot/boucle-argent` @615ca764,
    /// PAS déployé au 07/10) : `dealer_id`, `safehouse_id`, `collected_band`, `remaining_band` (`DealerCashBand`, liste fermée
    /// NONE|LOW|MODERATE|HIGH|FULL, FRACTIONS DU PLAFOND DU DEALER, jamais un montant — R2.2), `dealer_name_i18n`. Forme G : déclarées
    /// AVANT d'être servies ; un back antérieur au lot ne sert que `safehouse_id` — les bandes arrivent alors à null et l'écran garde
    /// sa phrase d'avant.</summary>
    [System.Serializable] public class CollectData
    {
        public string dealer_id;
        public string safehouse_id;
        public string collected_band;
        public string remaining_band;
        public DealerNomI18nDto dealer_name_i18n;

        /// <summary>Le prénom servi du dealer, ou null.</summary>
        public string Prenom => dealer_name_i18n != null && dealer_name_i18n.@params != null && !string.IsNullOrWhiteSpace(dealer_name_i18n.@params.prenom)
            ? dealer_name_i18n.@params.prenom : null;
    }
    [System.Serializable] public class CollectPayload { public CollectData data; }
    [System.Serializable] public class CollectEnvelope { public CollectPayload payload; }
}
