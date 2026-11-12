using System.Collections;
using System.Collections.Generic;
using System.Linq;
using NUnit.Framework;
using TMPro;
using UnityEngine;
using UnityEngine.TestTools;
using MafiaCleanCity.I18n;
using MafiaCleanCity.Operational.Autonomy;

namespace MafiaCleanCity.Operational.Tests
{
    // TD-847 (design Tools/autonomie-td847/design-td847.md, ratifié f2 12/11) — ㉔ la boîte d'autonomie : le NOM servi à la place de l'UUID, des mots par le catalogue, jamais le jeton brut du back.
    // Sans réseau : les rapports sont FABRIQUÉS (`RendrePourTest`). Catégorie propre : son nom ne CONTIENT et n'est contenu dans aucune autre (K0).
    [Category("MotsAutonomie")]
    public class AutonomyMotsPlayModeTests
    {
        private const string Uuid = "5f3c8a1e-0b2d-4c7a-9e11-aa22bb33cc44";
        private static readonly string[] Jetons =
        {
            "NOOP", "COOK_STARTED", "COOK_REFINED", "COLLECTED", "DISPATCHED", "INJECTED", "INJECTED_CONSERVATIVE",
            "DEPOSITED", "DEPOSITED_RESERVE", "REPAIRED", "HELD", "DEFERRED", "LEFT_TO_RIDE",
        };

        private GameObject go;

        [TearDown]
        public void TearDown()
        {
            if (go != null) Object.DestroyImmediate(go);
            go = null;
            foreach (Canvas c in Object.FindObjectsByType<Canvas>(FindObjectsInactive.Include, FindObjectsSortMode.None))
                if (c != null && c.name.StartsWith("AutonomyInbox")) Object.DestroyImmediate(c.gameObject);
            I18nCatalog.Oublier();
            Libelle.RemettreLesCompteurs();
        }

        private static AutonomyReportDto Rapport(string nom, int age, bool lieutenantNul = false) => new AutonomyReportDto
        {
            report_id = "r-1", lieutenant_id = Uuid, backlog_age_cycles = age,
            lieutenant = lieutenantNul ? null : new AutonomyLieutenantDto { id = Uuid, name = nom },
            issues = new[]
            {
                new AutonomyIssueDto
                {
                    issue_id = "i-1", category = "cook", refused_action = "COOK", decided = "",
                    option_a = new AutonomyOptionDto { label_key = "autonomy.cook.now", effect_kind = "a", projected_outcome = "TRADEOFF" },
                    option_b = new AutonomyOptionDto { label_key = "autonomy.cook.refine", effect_kind = "b", projected_outcome = "MINIMAL" },
                },
            },
        };

        private static string TexteDe(string nomDuGo) =>
            Object.FindObjectsByType<TextMeshProUGUI>(FindObjectsInactive.Exclude, FindObjectsSortMode.None)
                .Where(t => t.gameObject.name == nomDuGo).Select(t => t.text).FirstOrDefault();

        // ---- l'en-tête dit le NOM servi, jamais l'identifiant
        [Test]
        public void M1_LEnTete_DitLeNomServi_JamaisLUuid()
        {
            string h = AutonomyInboxController.EnTeteDuRapport(Rapport("Tony Ferro", 3));
            Assert.AreEqual("De Tony Ferro · 3 cycles", h);
            StringAssert.DoesNotContain(Uuid, h);
            StringAssert.DoesNotContain("Lt ", h);
            StringAssert.DoesNotContain("Oldest", h);
        }

        [Test]
        public void M2_NomAbsent_OuVide_OuInstanceVide_DitVotreLieutenant_JamaisLUuid()
        {
            foreach (AutonomyReportDto r in new[] { Rapport("", 1), Rapport("   ", 1), Rapport(null, 1), Rapport("x", 1, lieutenantNul: true) })
            {
                string h = AutonomyInboxController.EnTeteDuRapport(r);
                Assert.AreEqual("De votre lieutenant · 1 cycle", h);
                StringAssert.DoesNotContain(Uuid, h);
            }
            Assert.AreEqual("De votre lieutenant · Ce cycle", AutonomyInboxController.EnTeteDuRapport(new AutonomyReportDto { lieutenant_id = Uuid }), "le DTO tel que JsonUtility le rend sans le champ (instance vide)");
        }

        [Test]
        public void M3_LAge_CeCycle_UnCycle_NCycles()
        {
            Assert.AreEqual("Ce cycle", AutonomyInboxController.AgeDuRapport(0));
            Assert.AreEqual("1 cycle", AutonomyInboxController.AgeDuRapport(1));
            Assert.AreEqual("2 cycles", AutonomyInboxController.AgeDuRapport(2));
            Assert.AreEqual("12 cycles", AutonomyInboxController.AgeDuRapport(12));
        }

        [Test]
        public void M4_LaValeurServie_L_Emporte_EtLeReplisEstCompte()
        {
            I18nCatalog.ChargerPourTest("fr", new Dictionary<string, string>
            {
                { "autonomie.entete.de_nom_age", "Message de {nom} — {age}" },
                { "autonomie.age.cycles", "{n, plural, =0 {à l’instant} one {# cycle} other {# cycles}}" },
                { "autonomie.entete.votre_lieutenant", "votre homme de confiance" },
            });
            Assert.AreEqual("Message de Tony — à l’instant", AutonomyInboxController.EnTeteDuRapport(Rapport("Tony", 0)));
            Assert.AreEqual("Message de votre homme de confiance — 2 cycles", AutonomyInboxController.EnTeteDuRapport(Rapport("", 2)));
            I18nCatalog.Oublier();
            Libelle.RemettreLesCompteurs();
            Assert.AreEqual("De Tony · 2 cycles", AutonomyInboxController.EnTeteDuRapport(Rapport("Tony", 2)), "valeur non servie ⇒ le repli ratifié");
            CollectionAssert.IsSubsetOf(new[] { "autonomie.entete.de_nom_age", "autonomie.age.cycles" }, Libelle.ClesEnRepli, "le repli est COMPTÉ sous la clé de la table (la garde zéro-repli le voit)");
        }

        // ---- les boutons : des LETTRES, sans chiffre
        [Test]
        public void M5_LesBoutons_ChoisirA_ChoisirB_SansChiffre()
        {
            Assert.AreEqual("Choisir A", AutonomyInboxController.LegendeDuBouton("A"));
            Assert.AreEqual("Choisir B", AutonomyInboxController.LegendeDuBouton("B"));
            Assert.IsFalse(AutonomyInboxController.LegendeDuBouton("A").Any(char.IsDigit) || AutonomyInboxController.LegendeDuBouton("B").Any(char.IsDigit), "la légende reste digit-free (garde « pas de scalaire brut »)");
        }

        // ---- le résultat : jamais le jeton brut
        [Test]
        public void M6_ChaqueJetonFerme_SeDitEnMots_JamaisBrut_EtUnInconnuDitCEstFait()
        {
            var vus = new HashSet<string>();
            foreach (string j in Jetons)
            {
                string phrase = AutonomyInboxController.PhraseDuResultat(j);
                string ligne = AutonomyInboxController.LigneDuResultat(j);
                Assert.IsNotEmpty(phrase, j);
                StringAssert.DoesNotContain(j, ligne, "le jeton brut n'atteint jamais le joueur : " + j);
                Assert.AreEqual("Résultat : " + phrase, ligne, j);
                StringAssert.DoesNotContain("'", phrase, "typographie : l'apostrophe est ’ (U+2019) : " + j);
                Assert.IsFalse(phrase.Any(char.IsDigit), "sans chiffre : " + j);
                Assert.IsTrue(vus.Add(phrase), "deux jetons ne se disent pas pareil : " + phrase);
                Assert.AreNotEqual("C’est fait.", phrase, "un jeton connu a SA phrase : " + j);
            }
            foreach (string inconnu in new[] { "ZZZ_NOUVEAU", "", null, "noop" })
            {
                Assert.AreEqual("C’est fait.", AutonomyInboxController.PhraseDuResultat(inconnu), "jeton inconnu : " + (inconnu ?? "null"));
                Assert.AreEqual("Résultat : C’est fait.", AutonomyInboxController.LigneDuResultat(inconnu));
            }
            Assert.AreEqual("Rien n’a changé.", AutonomyInboxController.PhraseDuResultat("NOOP"));
        }

        [Test]
        public void M7_LesLitterauxDEcran_ParLeCatalogue_TypographieRatifiee()
        {
            Assert.AreEqual("Rapports d’autonomie", AutonomyInboxController.TitreDeLEcran());
            Assert.AreEqual("La boîte n’a pas répondu.", Libelle.De("autonomie", "refus", "La boîte n’a pas répondu."));
        }

        // ---- l'écran réel : le MÊME Render()
        [UnityTest]
        public IEnumerator M8_LEcran_MontreLeNom_LesLettres_LeResultat_JamaisLUuidNiLeJeton()
        {
            go = new GameObject("AutonomyInbox_Mots");
            var ecran = go.AddComponent<AutonomyInboxController>();
            ecran.RendrePourTest(new[] { Rapport("Tony Ferro", 2) }, "DEFERRED");
            yield return null;
            Assert.AreEqual("De Tony Ferro · 2 cycles", TexteDe("ReportHeader"));
            Assert.AreEqual("Choisir A", TexteDe("BtnLabel_A"));
            Assert.AreEqual("Choisir B", TexteDe("BtnLabel_B"));
            Assert.AreEqual("Résultat : Reporté.", TexteDe("Outcome"));
            foreach (TextMeshProUGUI t in Object.FindObjectsByType<TextMeshProUGUI>(FindObjectsInactive.Exclude, FindObjectsSortMode.None))
            {
                StringAssert.DoesNotContain(Uuid, t.text, "aucun identifiant technique à l'écran : " + t.gameObject.name);
                StringAssert.DoesNotContain("DEFERRED", t.text, t.gameObject.name);
                StringAssert.DoesNotContain("Choose", t.text, t.gameObject.name);
                StringAssert.DoesNotContain("Oldest", t.text, t.gameObject.name);
            }
            CollectionAssert.DoesNotContain(ecran.RenderedTexts, Uuid);
        }

        [UnityTest]
        public IEnumerator M9_LEcran_SansNomServi_DitVotreLieutenant_PasLUuid()
        {
            go = new GameObject("AutonomyInbox_SansNom");
            var ecran = go.AddComponent<AutonomyInboxController>();
            ecran.RendrePourTest(new[] { Rapport("", 0) });
            yield return null;
            Assert.AreEqual("De votre lieutenant · Ce cycle", TexteDe("ReportHeader"));
            Assert.IsNull(TexteDe("Outcome"), "pas de résultat tant qu'aucun choix n'a été fait");
        }
    }
}
