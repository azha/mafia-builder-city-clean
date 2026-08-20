using UnityEngine;

namespace MafiaCleanCity.CityMap
{
    /// <summary>
    /// W3.U2/C6 (design §3 C6, D6) — la table sprite→bâtiment du diorama district. Imite le seul
    /// seam de chargement runtime éprouvé du projet, celui de
    /// <see cref="MafiaCleanCity.Theme.DesignTokens"/> (Resources.Load, cache statique, `Current`)
    /// — pas un mécanisme inventé (§1.8 du design : aucun `Resources.Load` hors `DesignTokens.cs`
    /// avant ce lot).
    ///
    /// Indexé par `operational_type` (`operational_chain.ts:27-31`, 12 membres) — la clé stable du
    /// back, jamais recopiée en C# sous forme de VALEURS (R2.3/R9.3) : ce fichier ne porte que des
    /// noms de CHAMPS sémantiques, la donnée (quel PNG) vit uniquement dans
    /// Assets/Resources/BuildingSpriteSlots.asset. **7 placeholders pour 12 types** : la table est
    /// donc explicitement PARTIELLE, avec un slot de repli nommé (jamais un `null` silencieux —
    /// C6-F4). Le monde J0 n'a besoin que de 4 types (`lab`, `stash`, `front_shop`,
    /// `cash_safehouse` — D6) ; les 3 slots restants (`grow_house`, `dealer_spot_front`,
    /// `money_holding`) couvrent la marge avec les 3 placeholders excédentaires, sans que le design
    /// n'en prescrive l'affectation précise — choix d'implémentation documenté dans
    /// Tools/w3u2-c6-notes.md, indifférent à toute falsifiable (C6-F4 ne porte que sur le COMPTE des
    /// 13 valeurs résolues, jamais sur QUEL type reçoit quel slot).
    ///
    /// ⇒ Remplacer un placeholder par l'asset final de É3 = réassigner un champ dans l'asset (D6).
    /// Zéro C# touché — c'est ce que C6-F3 vérifie (aucun nom de fichier de sprite dans le C#).
    /// </summary>
    [CreateAssetMenu(fileName = "BuildingSpriteSlots", menuName = "MafiaCleanCity/Building Sprite Slots")]
    public class BuildingSpriteSlots : ScriptableObject
    {
        private static BuildingSpriteSlots _current;

        /// <summary>Seam de livraison runtime unique — REUSE du patron `DesignTokens.Current`.</summary>
        public static BuildingSpriteSlots Current
        {
            get
            {
                if (_current == null)
                {
                    _current = Resources.Load<BuildingSpriteSlots>("BuildingSpriteSlots");
                    if (_current == null)
                    {
                        Debug.LogError("BuildingSpriteSlots.Current: Resources.Load(\"BuildingSpriteSlots\") a renvoyé null — " +
                                        "Assets/Resources/BuildingSpriteSlots.asset est-il présent et importé ?");
                    }
                }
                return _current;
            }
        }

        // ── Les 7 placeholders (D6) — un champ Sprite par operational_type couvert. La VALEUR
        //    (quel PNG) vit uniquement dans le .asset ; ce champ ne porte qu'un nom sémantique. ──
        [Header("Slots — J0 (D6, requis)")]
        public Sprite frontShop;      // operational_type == "front_shop"
        public Sprite cashSafehouse;  // operational_type == "cash_safehouse"
        public Sprite stash;          // operational_type == "stash"
        public Sprite lab;            // operational_type == "lab"

        [Header("Slots — marge (au-delà du J0)")]
        public Sprite growHouse;        // operational_type == "grow_house"
        public Sprite dealerSpotFront;  // operational_type == "dealer_spot_front"
        public Sprite moneyHolding;     // operational_type == "money_holding"

        [Header("Repli — champ déclaré, jamais un null silencieux (D6)")]
        public Sprite fallback;

        // ── Calques additifs de nuit (revue ⊥ 2026-08-20, BLOCKING 3) — un jeu par slot. Comme les
        //    slots de base : le C# ne porte que des NOMS, les PNG vivent dans le .asset (C6-F3). Un
        //    calque absent rend null — le contrôleur garde alors son rendu de repli. ──
        [System.Serializable]
        public class OverlaySet { public Sprite fen; public Sprite neon; public Sprite dev; public Sprite actif; }

        [Header("Calques additifs — nuit")]
        public OverlaySet frontShopOv;
        public OverlaySet cashSafehouseOv;
        public OverlaySet stashOv;
        public OverlaySet labOv;
        public OverlaySet growHouseOv;
        public OverlaySet dealerSpotFrontOv;
        public OverlaySet moneyHoldingOv;
        public OverlaySet fallbackOv;

        /// <summary>Résout le calque additif (fen|neon|dev|actif) d'un operational_type — null si le
        /// jeu de calques ou la couche n'existe pas (jamais une exception).</summary>
        public Sprite ResolveOverlay(string operationalType, string couche)
        {
            OverlaySet set;
            switch (operationalType)
            {
                case "front_shop": set = frontShopOv; break;
                case "cash_safehouse": set = cashSafehouseOv; break;
                case "stash": set = stashOv; break;
                case "lab": set = labOv; break;
                case "grow_house": set = growHouseOv; break;
                case "dealer_spot_front": set = dealerSpotFrontOv; break;
                case "money_holding": set = moneyHoldingOv; break;
                default: set = fallbackOv; break;
            }
            if (set == null) return null;
            switch (couche)
            {
                case "fen": return set.fen;
                case "neon": return set.neon;
                case "dev": return set.dev;
                case "actif": return set.actif;
            }
            return null;
        }

        /// <summary>
        /// Résout un `operational_type` vers son sprite. Table TOTALE sur les 13 valeurs possibles
        /// (12 membres de l'énum back + la chaîne vide — un bâtiment acheté et pas encore converti,
        /// D2) : les 5 types non couverts par un slot dédié et tout type inconnu tombent sur
        /// <see cref="fallback"/>, jamais sur `null` (C6-F4).
        /// </summary>
        public Sprite Resolve(string operationalType)
        {
            switch (operationalType)
            {
                case "front_shop": return frontShop;
                case "cash_safehouse": return cashSafehouse;
                case "stash": return stash;
                case "lab": return lab;
                case "grow_house": return growHouse;
                case "dealer_spot_front": return dealerSpotFront;
                case "money_holding": return moneyHolding;
                default: return fallback; // "" (non converti), refinery, press_house,
                                           // distribution_hub, office, specialized_lab, et
                                           // tout type inconnu.
            }
        }
    }
}
