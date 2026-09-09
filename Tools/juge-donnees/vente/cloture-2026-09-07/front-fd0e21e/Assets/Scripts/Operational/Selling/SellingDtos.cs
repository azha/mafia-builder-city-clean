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
