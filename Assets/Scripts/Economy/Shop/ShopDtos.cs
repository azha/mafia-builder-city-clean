using System;

namespace MafiaCleanCity.Economy.Shop
{
    // ㉓ LA VITRINE — les formes RECOPIÉES de `iap-catalogue.service.ts:36-45` et des cinq
    // signatures de retour d'`iap.controller.ts`. Pas reformulées : recopiées. Une signature
    // citée dans ce dépôt se recopie du fichier, jamais ne se recompose de mémoire.
    [Serializable] public class SkuDto
    {
        public string sku_id;
        public string display_name;   // ⚠️ littéral ANGLAIS servi par le back, aucune clé i18n (assumé, front.md)
        public string kind;           // COSMETIC | SAVE_SLOT | MARKS_PACK | SUPPORT
        public string price_store_product_id;
        public int price_marks;       // absent du JSON pour les SKU en argent réel → 0
        public int marks_granted;     // absent pour les cosmétiques → 0
        public int bonus_pct;         // DISPLAY-ONLY, packs med/large/xl seulement
    }

    [Serializable] public class CatalogueData { public SkuDto[] skus; }
    [Serializable] public class CatalogueEnvelope { public CataloguePayload payload; }
    [Serializable] public class CataloguePayload { public CatalogueData data; }

    [Serializable] public class BalanceData { public int marks_balance; }
    [Serializable] public class BalanceEnvelope { public BalancePayload payload; }
    [Serializable] public class BalancePayload { public BalanceData data; }

    [Serializable] public class EntitlementsData { public string[] skus; }
    [Serializable] public class EntitlementsEnvelope { public EntitlementsPayload payload; }
    [Serializable] public class EntitlementsPayload { public EntitlementsData data; }

    [Serializable] public class PurchaseData { public string sku_id; }
    [Serializable] public class PurchaseEnvelope { public PurchasePayload payload; }
    [Serializable] public class PurchasePayload { public PurchaseData data; }
}
