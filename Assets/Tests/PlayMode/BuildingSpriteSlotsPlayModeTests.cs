using System;
using System.IO;
using System.Linq;
using NUnit.Framework;
using UnityEngine;
using MafiaCleanCity.CityMap;

namespace MafiaCleanCity.CityMap.Tests
{
    /// <summary>
    /// W3.U2/C6 — C6-F3 (D6, la résolution passe par l'asset, aucun nom de fichier de sprite dans
    /// le C#) et C6-F4 (D6, la table est totale sur les 13 valeurs d'<c>operational_type</c> :
    /// 12 membres de l'énum back + la chaîne vide, D2).
    /// </summary>
    [Category("W3U2")]
    public class BuildingSpriteSlotsPlayModeTests
    {
        // Les 12 membres de `building_operational_type` (services/game-back/src/db/schema/
        // operational_chain.ts:27-31, ordre canonique) + la chaîne vide (D2 : bâtiment acheté et
        // pas encore converti). C6-F4 : 12 + 1 = 13, scénario dimensionné sur les 13, pas un
        // sous-ensemble.
        private static readonly string[] AllOperationalTypeValues =
        {
            "front_shop", "cash_safehouse", "stash", "lab", "grow_house", "refinery",
            "press_house", "distribution_hub", "office", "dealer_spot_front", "money_holding",
            "specialized_lab", "",
        };

        private static Sprite MakeSprite()
        {
            var tex = new Texture2D(1, 1);
            return Sprite.Create(tex, new Rect(0, 0, 1, 1), new Vector2(0.5f, 0.5f));
        }

        private static BuildingSpriteSlots MakeFullyWiredInstance()
        {
            var slots = ScriptableObject.CreateInstance<BuildingSpriteSlots>();
            slots.frontShop = MakeSprite();
            slots.cashSafehouse = MakeSprite();
            slots.stash = MakeSprite();
            slots.lab = MakeSprite();
            slots.growHouse = MakeSprite();
            slots.dealerSpotFront = MakeSprite();
            slots.moneyHolding = MakeSprite();
            slots.fallback = MakeSprite();
            return slots;
        }

        [Test]
        public void C6F4_AllThirteenOperationalTypeValues_ResolveNonNullSprite()
        {
            Assert.AreEqual(13, AllOperationalTypeValues.Length,
                "scénario dimensionné sur les 13 valeurs (12 membres + chaîne vide) — pas un sous-ensemble.");

            var slots = MakeFullyWiredInstance();
            try
            {
                foreach (var type in AllOperationalTypeValues)
                {
                    Assert.IsNotNull(slots.Resolve(type),
                        $"operational_type='{type}' a résolu un sprite NULL — la table doit être totale (7 réels + repli).");
                }
            }
            finally
            {
                Object.DestroyImmediate(slots);
            }
        }

        [Test]
        public void C6F4_UnknownOperationalType_FallsBackToNamedSlot_NeverNull()
        {
            var slots = ScriptableObject.CreateInstance<BuildingSpriteSlots>();
            try
            {
                var fallback = MakeSprite();
                slots.fallback = fallback;
                // Les 7 slots dédiés restent délibérément NON câblés ici : ce test isole la
                // propriété du repli, indépendamment des 7 autres.
                Assert.AreEqual(fallback, slots.Resolve("not_a_real_operational_type"));
                Assert.AreEqual(fallback, slots.Resolve(null));
            }
            finally
            {
                Object.DestroyImmediate(slots);
            }
        }

        [Test]
        public void BuildingSpriteSlots_Current_LoadsFromResources()
        {
            Assert.IsNotNull(BuildingSpriteSlots.Current,
                "Resources.Load(\"BuildingSpriteSlots\") a renvoyé null — Assets/Resources/BuildingSpriteSlots.asset est-il présent ?");
        }

        // ── C6-F3 — aucun nom de fichier de sprite n'apparaît dans le code de PRODUCTION ────────

        // Les 7 noms de fichier RÉELS committés sous Assets/Art/Buildings/ (D6 point 1, motif
        // canonique `^sprite_environment_.+$` du postprocessor). Cible : le code (Assets/Scripts,
        // PAS Assets/Tests — ce fichier de test cite les noms lui-même pour le contrôle positif).
        private static readonly string[] SpriteFileNames =
        {
            "sprite_environment_placeholder_frontshop",
            "sprite_environment_placeholder_cashsafehouse",
            "sprite_environment_placeholder_stash",
            "sprite_environment_placeholder_lab",
            "sprite_environment_placeholder_growhouse",
            "sprite_environment_placeholder_dealerspotfront",
            "sprite_environment_placeholder_moneyholding",
        };

        [Test]
        public void C6F3_NoSpriteFileNameLiteral_InProductionCode()
        {
            var scriptsRoot = Path.Combine(Application.dataPath, "Scripts");
            var csFiles = Directory.GetFiles(scriptsRoot, "*.cs", SearchOption.AllDirectories);
            Assert.IsTrue(csFiles.Length > 0, "anti-vacuité : 0 fichier .cs balayé sous Assets/Scripts.");

            foreach (var name in SpriteFileNames)
            {
                var offenders = csFiles.Where(f => File.ReadAllText(f).Contains(name)).ToList();
                Assert.IsEmpty(offenders,
                    $"'{name}' apparaît dans du code de production ({string.Join(", ", offenders)}) — " +
                    "la résolution doit passer par BuildingSpriteSlots.Resolve()/l'asset, jamais par un littéral (D6, C6-F3).");
            }
        }

        [Test]
        public void C6F3_PositiveControl_PatternDoesFindAFileNameWhenOnePresent()
        {
            // Contrôle positif obligatoire (design C6-F3) : le motif de balayage doit trouver un
            // nom de fichier LÀ OÙ IL Y EN A UN, sinon un zéro ne prouve rien (socle : un zéro
            // mesuré sur le mauvais chemin est le plus crédible des faux). Fixture fabriquée à la
            // volée, jamais committée.
            var tempFile = Path.Combine(Path.GetTempPath(), $"C6F3_positive_control_{Guid.NewGuid():N}.cs");
            File.WriteAllText(tempFile,
                "// var forbidden = \"sprite_environment_placeholder_lab\"; // ne doit JAMAIS exister en vrai\n");
            try
            {
                bool found = File.ReadAllText(tempFile).Contains(SpriteFileNames[3]); // "…_lab"
                Assert.IsTrue(found, "le contrôle positif n'a pas trouvé le littéral qu'on vient d'écrire — le motif est impuissant.");
            }
            finally
            {
                File.Delete(tempFile);
            }
        }
    }
}
