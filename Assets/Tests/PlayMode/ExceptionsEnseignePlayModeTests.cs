using System.Collections.Generic;
using NUnit.Framework;
using TMPro;
using UnityEngine;
using UnityEngine.UI;
using MafiaCleanCity.I18n;
using MafiaCleanCity.Operational.Exceptions;
using MafiaCleanCity.Shell;
using Object = UnityEngine.Object;
using MafiaCleanCity.Tests;

namespace MafiaCleanCity.Operational.Tests
{
    // S03 — la cible NOMMÉE (back 406ae440 `building`, mots de l'atelier §3.11 `b761a235`) : l'enseigne entre NUE — ni article ni
    // contraction devant, aucun mot accordé derrière. Gardes :
    //   R22       la bulle : un nom servi ⇒ « · chez Pressing Varne » ; `building` null, `name_i18n` null, enseigne vide ⇒
    //             « · au bâtiment touché » ; la ville reste « toute la ville » ; la clé servie l'emporte
    //   R22bis    le tampon : SEUL le libellé qui dit « le bâtiment » (`exception.raid.repair.label`) prend le nom ;
    //             « Réparer tout de suite » ne nomme rien ; sans enseigne, le libellé servi
    //   R22ter    l'après : repairing / repairing_slow / deferred nommés ; demolished reste sans nom ; sans enseigne, §3.10
    //   R22quater la plus longue des 72 enseignes (« RÉPARER TRAITEMENT DES EAUX DORN », 32 signes) tient sur UNE ligne, entière,
    //             corps réduit au besoin ; le libellé et le contexte nommés sortent du corpus suivi (R2.2 : « Remise du 3 »)
    [Category("EcranFile")]
    public class ExceptionsEnseignePlayModeTests
    {
        private GameObject hostGo;
        private ExceptionQueueController ecran;

        [TearDown]
        public void TearDown()
        {
            I18nCatalog.Oublier();
            if (ecran != null && ecran.Decor != null) Object.DestroyImmediate(ecran.Decor.transform.parent.gameObject);
            if (hostGo != null) Object.DestroyImmediate(hostGo);
            ecran = null; hostGo = null;
        }

        private static CandidateActionDto Reparer() => new CandidateActionDto
        {
            id = "repair", label = "Repair the building", method = "REPAIR",
            label_i18n = new I18nRefDto { key = ExceptionBandes.CleReparerLeBatiment },
            effect = new ExceptionEffectDto { type = "REPAIR", target_building_id = "b-1" },
        };

        private static ExceptionBatimentDto Batiment(string enseigne) => new ExceptionBatimentDto
        {
            id = "b-1",
            name_i18n = new NomDeBatimentI18nDto
            {
                key = "game.fiction.building.name",
                @params = new NomDeBatimentParamsDto { enseigne = enseigne, district = "Les Bassins", block = "1" },
            },
        };

        private static ExceptionCardDto Raid(ExceptionBatimentDto b) => new ExceptionCardDto
        {
            exception_id = "r", lieutenant_id = "lt-kane", lieutenant = new ExceptionLieutenantDto { id = "lt-kane", name = "Lt. Kane" },
            event_descriptor = "They turned the building over last night.",
            severity_band = "SEVERE", priority_band = "critical", confidence_band = "confident",
            candidate_actions = new[] { Reparer() }, suggested_action = Reparer(), building = b,
        };

        [Test]
        public void R22_LaBulle_ChezEnseigne_OuAuBatimentTouche()
        {
            Assert.AreEqual("· chez Pressing Varne", ExceptionQueueController.Contexte(null, Raid(Batiment("Pressing Varne"))));
            Assert.AreEqual("· Cuisinier · chez Laverie du Quai",
                ExceptionQueueController.Contexte("Cuisinier", Raid(Batiment("Laverie du Quai"))), "le « · » reste au code");
            Assert.AreEqual("· au bâtiment touché", ExceptionQueueController.Contexte(null, Raid(null)), "`building` null");
            Assert.AreEqual("· au bâtiment touché", ExceptionQueueController.Contexte(null, Raid(new ExceptionBatimentDto())),
                "`null` servi : JsonUtility rend une instance VIDE");
            Assert.AreEqual("· au bâtiment touché",
                ExceptionQueueController.Contexte(null, Raid(new ExceptionBatimentDto { id = "b-1", name_i18n = new NomDeBatimentI18nDto() })),
                "`name_i18n: null` : le bâtiment n'est plus au joueur");
            Assert.AreEqual("· au bâtiment touché", ExceptionQueueController.Contexte(null, Raid(Batiment("  "))), "enseigne vide");

            var ville = Raid(Batiment("Pressing Varne")); ville.lieutenant_id = ""; ville.lieutenant = new ExceptionLieutenantDto();
            Assert.AreEqual("· toute la ville", ExceptionQueueController.Contexte(null, ville));

            I18nCatalog.ChargerPourTest("en", new Dictionary<string, string> { { "exceptions.bloc.chez_enseigne", "at {enseigne}" } });
            Assert.AreEqual("· at Pressing Varne", ExceptionQueueController.Contexte(null, Raid(Batiment("Pressing Varne"))), "la clé servie");
        }

        [Test]
        public void R22bis_LeTampon_SeulLeLibelleQuiDitLeBatiment()
        {
            ExceptionCardDto nomme = Raid(Batiment("Pressing Varne"));
            Assert.AreEqual("Réparer Pressing Varne", ExceptionBandes.LibelleNomme(nomme, Reparer(), "Réparer le bâtiment"));
            var toutDeSuite = new CandidateActionDto { id = "ri", label_i18n = new I18nRefDto { key = "exception.equipment_failure.repair_immediate.label" } };
            Assert.AreEqual("Réparer tout de suite", ExceptionBandes.LibelleNomme(nomme, toutDeSuite, "Réparer tout de suite"),
                "un libellé qui ne dit pas « le bâtiment » ne nomme rien");
            Assert.AreEqual("Réparer le bâtiment", ExceptionBandes.LibelleNomme(Raid(null), Reparer(), "Réparer le bâtiment"), "sans enseigne");
        }

        [Test]
        public void R22ter_LApres_NommePourTrois_DemolishedSansNom()
        {
            Assert.AreEqual("Pressing Varne se remet en marche, avec le temps", ExceptionBandes.PhraseApres("REPAIRING", "Pressing Varne"));
            Assert.AreEqual("Laverie du Quai se remet en marche, lentement — c’est moins cher",
                ExceptionBandes.PhraseApres("REPAIRING_SLOW", "Laverie du Quai"));
            Assert.AreEqual(ValeurAttendue.Cle("exceptions.apres.deferred.enseigne", "Réparation remise : {enseigne} reste à l’arrêt",
                new System.Collections.Generic.Dictionary<string, string> { { "enseigne", "Pressing Varne" } }),
                ExceptionBandes.PhraseApres("DEFERRED", "Pressing Varne"));
            Assert.AreEqual(ExceptionBandes.PhraseApres("DEMOLISHED"), ExceptionBandes.PhraseApres("DEMOLISHED", "Laverie du Quai"),
                "« rasé / rasée » prendrait le genre de l'enseigne : sans nom");
            Assert.AreEqual(ExceptionBandes.PhraseApres("REPAIRING"), ExceptionBandes.PhraseApres("REPAIRING", null));
        }

        [Test]
        public void R22quater_LaPlusLongue_TientSurUneLigne_Entiere()
        {
            hostGo = new GameObject("ExceptionQueue", typeof(RectTransform));
            ecran = hostGo.AddComponent<ExceptionQueueController>();
            ecran.RendrePourTest(new[] { Raid(Batiment("Traitement des eaux Dorn")) });

            TextMeshProUGUI libelle = ecran.TamponLibellePourTest;
            Assert.AreEqual("RÉPARER TRAITEMENT DES EAUX DORN", libelle.text);
            Assert.AreEqual(32, libelle.text.Length, "la plus longue des 72 enseignes (atelier §3.11 §2)");

            Canvas.ForceUpdateCanvases();
            LayoutRebuilder.ForceRebuildLayoutImmediate((RectTransform)ecran.Decor.transform.parent);
            libelle.ForceMeshUpdate();
            Assert.Greater(((RectTransform)libelle.transform).rect.width, 0f, "le tampon a une largeur mise en page");
            Assert.AreEqual(1, libelle.textInfo.lineCount, "UNE ligne : on réduit le corps, on ne coupe pas");
            Assert.IsFalse(libelle.isTextTruncated, "jamais coupé");
            Assert.IsFalse(libelle.enableWordWrapping);

            CollectionAssert.DoesNotContain(ecran.RenderedTexts, libelle.text, "un libellé nommé sort du corpus suivi (R2.2)");
            foreach (string t in ecran.RenderedTexts)
                StringAssert.DoesNotContain("Traitement des eaux Dorn", t, "ni le contexte « chez … »");
        }
    }
}
