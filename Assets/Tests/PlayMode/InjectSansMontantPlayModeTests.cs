using System.IO;
using System.Linq;
using NUnit.Framework;
using UnityEngine;

namespace MafiaCleanCity.Tests
{
    // INJECT SANS MONTANT (TD-765, décision f2 du 26/09) — BLANCHIR envoyait 25 000 FIXES depuis ①, ② et ㊵ ; une planque de compte
    // neuf en tient 10 000 (l'amorce) ⇒ 409 au premier geste. Le back rend le montant OPTIONNEL et décide ce qui part de la planque.
    // ⛔ À NE FUSIONNER QU'APRÈS le déploiement du back « inject sans montant servi » : avant, le back refuse un corps sans montant.
    //   I1  les deux corps d'`inject` (CityMap et Operational) ne portent AUCUN montant
    //   I2  garde de CLASSE : plus de montant d'inject en dur dans Assets/Scripts (la constante d'avant, ou un amount_cents d'inject)
    [Category("PlanqueVide")]
    public class InjectSansMontantPlayModeTests
    {
        [Test]
        public void I1_LesCorpsDInject_NePortentAucunMontant()
        {
            string cityMap = JsonUtility.ToJson(new MafiaCleanCity.CityMap.DistrictLaunderRequestDto { front_shop_id = "f", safehouse_id = "s" });
            string operational = JsonUtility.ToJson(new MafiaCleanCity.Operational.InjectRequestDto { front_shop_id = "f", safehouse_id = "s" });
            Assert.AreEqual("{\"front_shop_id\":\"f\",\"safehouse_id\":\"s\"}", cityMap);
            Assert.AreEqual("{\"front_shop_id\":\"f\",\"safehouse_id\":\"s\"}", operational);
        }

        [Test]
        public void I2_AucunMontantDInjectEnDur()
        {
            Assert.IsTrue(MontantEnDur("        public const int FicheBlanchimentMontantCents = 25_000;"), "contrôle positif : la forme d'avant est VUE");
            string racine = Path.Combine(Application.dataPath, "Scripts");
            string[] fichiers = Directory.GetFiles(racine, "*.cs", SearchOption.AllDirectories);
            Assert.Greater(fichiers.Length, 100, "le balayage lit réellement l'arbre des scripts");
            var ecarts = fichiers.Where(f => File.ReadAllLines(f).Any(MontantEnDur)).Select(Path.GetFileName).ToList();
            Assert.IsEmpty(ecarts, "un montant d'inject revient en dur — le back décide ce qui part de la planque (TD-765) : " + string.Join(", ", ecarts));
        }

        private static bool MontantEnDur(string ligne) =>
            !ligne.TrimStart().StartsWith("//") && ligne.Contains("BlanchimentMontantCents");
    }
}
