namespace MafiaCleanCity.Operational.Selling
{
    // ㉟ LA VENTE — les corps servis par `selling.controller.ts`, recopiés depuis
    // `DealerProjection` (`selling.projection.service.ts:63`), pas depuis la fiche d'écran.
    //
    // ⛔ SEPT CLÉS, TOUTES DES BANDES (R2.2 — zéro scalaire). La caisse n'est PAS un montant : c'est
    // `NONE|LOW|MODERATE|HIGH|FULL`. Un écran qui dessinerait une barre CONTINUE mentirait sur la
    // précision de la donnée — la maquette impose une jauge à CRANS pour cette raison.

    [System.Serializable]
    public class DealerDto
    {
        public string dealer;                     // uuid, renvoyé tel quel
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
        public string name_i18n;
    }

    [System.Serializable] public class DealerListData { public DealerDto[] dealers; }
    [System.Serializable] public class DealerListPayload { public DealerListData data; }
    [System.Serializable] public class DealerListEnvelope { public DealerListPayload payload; }

    [System.Serializable] public class DealerPayload { public DealerDto data; }
    [System.Serializable] public class DealerEnvelope { public DealerPayload payload; }

    [System.Serializable] public class CollectData { public string safehouse_id; }
    [System.Serializable] public class CollectPayload { public CollectData data; }
    [System.Serializable] public class CollectEnvelope { public CollectPayload payload; }
}
