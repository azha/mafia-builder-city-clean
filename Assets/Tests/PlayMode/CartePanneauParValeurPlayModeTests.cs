using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text.RegularExpressions;
using NUnit.Framework;
using UnityEngine;
using MafiaCleanCity.CityMap;
using MafiaCleanCity.I18n;

namespace MafiaCleanCity.Shell.Tests
{
    // ③ LE PANNEAU DISTRICT PAR VALEUR (table 68 de l'atelier, 2026-09-26, client a21f3c62) — plus aucun champ servi rendu BRUT.
    //   P1  chaque clé de la table (41, RECOPIÉES ici, anti-tautologie) : sans catalogue, le mot est le repli de la table ; la valeur
    //       servie (en CAPITALES comme le back la sert) retombe sur la même clé
    //   P2  valeur inconnue ⇒ RIEN, jamais la valeur ; famille déjà servie (heat.bucket) ⇒ le mot servi, repli vide
    //   P3  garde de source : aucun `new DetailRow(` de CityMapController ne porte l'un des 16 champs servis
    [Category("CartePanneau")]
    public class CartePanneauParValeurPlayModeTests
    {
        [TearDown] public void TearDown() => I18nCatalog.Oublier();

        private static readonly string[] ClesTable68 =
        {
            "carte.controle.uncontested",
            "carte.controle.contested",
            "carte.controle.player_held",
            "carte.controle.rival_held",
            "carte.refoulement.normal",
            "carte.refoulement.congested",
            "carte.refoulement.saturated",
            "carte.exposition.minimal",
            "carte.exposition.low",
            "carte.exposition.elevated",
            "carte.exposition.critical",
            "carte.reserve.low",
            "carte.reserve.moderate",
            "carte.reserve.high",
            "carte.reserve.saturated",
            "carte.tampon_charge.empty",
            "carte.tampon_charge.low",
            "carte.tampon_charge.nominal",
            "carte.tampon_charge.high",
            "carte.tampon_charge.critical",
            "carte.tampon_traine.low",
            "carte.tampon_traine.moderate",
            "carte.tampon_traine.high",
            "carte.tampon_traine.critical",
            "carte.epingles.none",
            "carte.epingles.some",
            "carte.epingles.widespread",
            "carte.cohesion.stable",
            "carte.cohesion.fragile",
            "carte.cohesion.thawed",
            "police.croyance.dormant",
            "police.croyance.watchful",
            "police.croyance.suspicious",
            "police.croyance.hunting",
            "police.patrouille.quiet",
            "police.patrouille.low",
            "police.patrouille.medium",
            "police.patrouille.high",
            "carte.rumeur.calm",
            "carte.rumeur.stirring",
            "carte.rumeur.alert"
        };

        [Test]
        public void P1_ChaqueCleDeLaTable_ReplisALOctet_EtValeurServieEnCapitales()
        {
            I18nCatalog.Oublier();
            Assert.AreEqual(41, ClesTable68.Length);
            CollectionAssert.AreEquivalent(ClesTable68, MotsDuPanneau.Replis.Keys, "les replis du code = les clés de la table");
            foreach (string cle in ClesTable68)
            {
                int dernier = cle.LastIndexOf('.'), avant = cle.LastIndexOf('.', dernier - 1);
                string domaine = cle.Substring(0, avant), role = cle.Substring(avant + 1, dernier - avant - 1), valeur = cle.Substring(dernier + 1);
                Assert.AreEqual(MotsDuPanneau.Replis[cle], MotsDuPanneau.Mot(domaine, role, valeur.ToUpperInvariant()), cle);
            }
        }

        /// <summary>Addendum 68 (9ebfcb4d) : les 25 étiquettes `carte.panneau.*`, RECOPIÉES.</summary>
        private static readonly string[] EtiquettesAddendum =
        {
            "carte.panneau.blocs",
            "carte.panneau.rive",
            "carte.panneau.controle",
            "carte.panneau.releves",
            "carte.panneau.releves_ouvrez_une_session",
            "carte.panneau.pas_encore_releve",
            "carte.panneau.chaleur_quartier",
            "carte.panneau.chaleur_ville",
            "carte.panneau.descente",
            "carte.panneau.oui",
            "carte.panneau.non",
            "carte.panneau.refoulement",
            "carte.panneau.exposition",
            "carte.panneau.proprete_du_reseau",
            "carte.panneau.reserve_qui_bloque",
            "carte.panneau.tampon_charge",
            "carte.panneau.tampon_traine",
            "carte.panneau.file_d_inspection",
            "carte.panneau.regime_du_dispatch",
            "carte.panneau.epingles_d_audit",
            "carte.panneau.coins_de_vente",
            "carte.panneau.cohesion",
            "carte.panneau.ce_qu_ils_croient",
            "carte.panneau.la_patrouille",
            "carte.panneau.ce_qui_se_dit"
        };

        [Test]
        public void P4_LesEtiquettes_ClesDeLAddendum_ReplisNonVides()
        {
            I18nCatalog.Oublier();
            CollectionAssert.AreEquivalent(EtiquettesAddendum, MotsDuPanneau.Etiquettes.Keys, "les étiquettes du code = celles de l'addendum");
            foreach (string cle in EtiquettesAddendum)
                Assert.IsFalse(string.IsNullOrEmpty(MotsDuPanneau.Etiquette(cle, new Dictionary<string, string> { { "precinct", "3" } })), cle);
            Assert.AreEqual("Ce qu’ils croient (précinct 3)",
                MotsDuPanneau.Etiquette("carte.panneau.ce_qu_ils_croient", new Dictionary<string, string> { { "precinct", "3" } }), "paramètre rempli");
        }

        [Test]
        public void P2_ValeurInconnue_Rien_FamilleServie_LeMotServi()
        {
            I18nCatalog.Oublier();
            Assert.AreEqual("", MotsDuPanneau.Mot("carte", "controle", "SOMETHING_NEW"), "jamais la valeur brute");
            Assert.AreEqual("", MotsDuPanneau.Mot("heat", "bucket", "HOT"), "famille servie, non chargée : rien (pas « HOT »)");
            I18nCatalog.ChargerPourTest("fr", new Dictionary<string, string> { { "heat.bucket.hot", "§chaud" }, { "carte.controle.player_held", "§à vous" } });
            Assert.AreEqual("§chaud", MotsDuPanneau.Mot("heat", "bucket", "HOT"));
            Assert.AreEqual("§à vous", MotsDuPanneau.Mot("carte", "controle", "PLAYER_HELD"), "la valeur servie l'emporte sur le repli");
        }

        private static readonly Regex ChampBrut = new Regex(
            @"new DetailRow\([^;]*\.(control_state|district_bucket|citywide_bucket|backpressure|exposure_band|network_cleanliness|district_blocking_band|" +
            @"district_load_band|district_tail_band|queue_load|dispatcher_regime|audit_pin_presence|cohesion_state|belief|patrol_heat|whisper_index)\b");

        [Test]
        public void P3_AucuneRangeeNePorteUnChampServiBrut()
        {
            Assert.IsTrue(ChampBrut.IsMatch("detail.rows.Add(new DetailRow(\"Refoulement\", flow.backpressure));"), "contrôle positif");
            string source = File.ReadAllText(Path.Combine(Application.dataPath, "Scripts", "CityMap", "CityMapController.cs"));
            var sites = ChampBrut.Matches(source).Cast<Match>().Select(m => m.Value).ToList();
            Assert.IsEmpty(sites, "champ servi rendu BRUT dans le panneau (table 68 : par valeur, jamais brut) :\n" + string.Join("\n", sites));
        }
    }
}
