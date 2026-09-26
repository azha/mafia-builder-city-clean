using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text.RegularExpressions;
using NUnit.Framework;
using UnityEngine;
using MafiaCleanCity.I18n;
using MafiaCleanCity.CityMap;

namespace MafiaCleanCity.Tests
{
    // BLANCHIR, LES RAISONS D'UN REFUS (table 84 @1ce62e18, f2 26/09) — ㊵ affiche `o.Message` SEUL, ① derrière « Blanchiment refusé. » :
    // une raison est une PHRASE (majuscule, point), servie ou repli à l'octet de la table — jamais le fragment en minuscules d'avant
    // (« les fonds ou la capacité sont insuffisants »), jamais le `message` de développeur.
    //   B1  par code HTTP, sans clé servie : le repli EXACT de la table 84, et une phrase
    //   B2  une clé SPÉCIFIQUE servie passe devant ; une clé générique non ; le message de développeur jamais
    //   B3  ㊵ : `resultatBlanchir` ne reçoit que `o.Message` (la phrase de CityProjectionsClient) — garde de source, contrôle positif
    [Category("PlanqueVide")]
    public class RaisonsDuBlanchimentPlayModeTests
    {
        [TearDown] public void Nettoyer() => I18nCatalog.Oublier();

        private static readonly Regex Phrase = new Regex(@"^\p{Lu}.*[.…!?]$");

        [Test]
        public void B1_ParCode_LeRepliDeLaTable_EtUnePhrase()
        {
            var attendu = new Dictionary<long, string>
            {
                { 401, "La connexion a expiré." },
                { 409, "Il manque de l’argent ou de la place." },
                { 422, "Ce lot n’est pas accepté." },
                { 500, "La filière ne répond pas pour l’instant." },
                { 0, "La filière ne répond pas pour l’instant." },
            };
            foreach (var kv in attendu)
            {
                string p = CityProjectionsClient.PhraseDuRefusDInject(kv.Key, null);
                Assert.AreEqual(kv.Value, p, $"code {kv.Key}");
                StringAssert.IsMatch(Phrase.ToString(), p, $"code {kv.Key} : une PHRASE, jamais un fragment");
            }
        }

        [Test]
        public void B2_LaPhraseServieDAbord_JamaisLeMessageDeDeveloppeur()
        {
            string generique = "{\"payload\":{\"error\":{\"code\":\"RESOURCE_STATE_CONFLICT\",\"user_facing_i18n_key\":\"error.resource.state_conflict\",\"message\":\"safehouse holds less than requested\"}}}";
            string specifique = "{\"payload\":{\"error\":{\"user_facing_i18n_key\":\"error.laundering.safehouse_short\",\"message\":\"dev\"}}}";
            I18nCatalog.ChargerPourTest("fr", new Dictionary<string, string>
            {
                { "error.resource.state_conflict", "La situation a changé." },
                { "error.laundering.safehouse_short", "La planque ne tient pas assez." },
                { "blanchiment.raison.fonds_ou_place", "Il manque de l’argent ou de la place (servi)." },
            });
            Assert.AreEqual("Il manque de l’argent ou de la place (servi).", CityProjectionsClient.PhraseDuRefusDInject(409, generique),
                "clé générique : la phrase d'écran (servie), pas « La situation a changé »");
            Assert.AreEqual("La planque ne tient pas assez.", CityProjectionsClient.PhraseDuRefusDInject(409, specifique));
            StringAssert.DoesNotContain("safehouse", CityProjectionsClient.PhraseDuRefusDInject(409, generique));
        }

        private static readonly Regex AffectationDuResultat = new Regex(@"resultatBlanchir\.text\s*=\s*([^;]+);");

        [Test]
        public void B3_Filiere_NAfficheQueLaPhraseDuClient()
        {
            Assert.AreEqual(1, AffectationDuResultat.Matches("if (resultatBlanchir != null) resultatBlanchir.text = \"les fonds\";").Count,
                "contrôle positif : une affectation est VUE");
            string source = File.ReadAllText(Path.Combine(Application.dataPath, "Scripts", "Operational", "Filiere", "FiliereScreenController.cs"));
            var valeurs = AffectationDuResultat.Matches(source).Cast<Match>().Select(m => m.Groups[1].Value.Trim()).ToList();
            Assert.IsNotEmpty(valeurs, "㊵ n'affiche plus le résultat de BLANCHIR ici : la garde ne voit rien");
            foreach (string v in valeurs)
                Assert.IsTrue(v == "o?.Message ?? \"\"" || v == "\"\"",
                    $"㊵ affiche « {v} » : seule la phrase de CityProjectionsClient (o.Message) — jamais un littéral ni un fragment");
        }
    }
}
